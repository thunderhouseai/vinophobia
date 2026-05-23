import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import './App.css'
import { recognizeBottleFromImage, type BottleRecognitionResult } from './domain/bottleRecognition'
import { extractPreferenceSignals, flattenSignals } from './domain/preferenceExtraction'
import { findCheaperNearbyWineOptions, type NearbyWinePriceOption } from './domain/nearbyPriceSearch'
import { recommendWineMemories, type WineRecommendation } from './domain/recommendWineMemories'
import { searchWineMemories } from './domain/searchWineMemories'
import { createWineMemory, type WineMemory } from './domain/wineMemory'

type Sentiment = 'loved' | 'liked' | 'okay' | 'disliked'

type FormState = {
  name: string
  note: string
  liked: Sentiment
  location: string
  price: string
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

const initialForm: FormState = {
  name: '',
  note: '',
  liked: 'liked',
  location: '',
  price: '',
}

const scanningSteps = [
  'Analyzing label…',
  'Identifying winery…',
  'Checking vintage…',
  'Reading price clues…',
  'Building wine profile…',
]

const storeSuggestions = ['Total Wine', 'ABC Fine Wine', 'Costco', 'Publix', 'Trader Joe’s', 'Walmart', 'Local wine shop']

const sentimentOptions: Array<{ value: Sentiment; emoji: string; label: string; hint: string }> = [
  { value: 'loved', emoji: '❤️', label: 'Loved It', hint: 'Find me more like this' },
  { value: 'liked', emoji: '👍', label: 'Liked It', hint: 'Solid bottle' },
  { value: 'okay', emoji: '😐', label: 'It Was Okay', hint: 'Useful, not magic' },
  { value: 'disliked', emoji: '👎', label: 'Not For Me', hint: 'Avoid this lane' },
]

function signalSummary(memory: WineMemory): string {
  const signals = flattenSignals(extractPreferenceSignals(memory.note))
  return signals.length > 0 ? signals.join(', ') : 'No pattern yet — add more detail next time.'
}

function sentimentToLiked(sentiment: Sentiment): boolean {
  return sentiment === 'loved' || sentiment === 'liked'
}

function extractPriceFromVisibleText(textLines: string[] | undefined): string {
  if (!textLines) {
    return ''
  }

  const text = textLines.join(' ')
  const priceMatch = text.match(/(?:\$\s*)?([1-9]\d{0,2}[.,]\d{2})/)
  return priceMatch ? `$${priceMatch[1].replace(',', '.')}` : ''
}

function extractStoreFromVisibleText(textLines: string[] | undefined): string {
  if (!textLines) {
    return ''
  }

  const lowerText = textLines.join(' ').toLowerCase()
  return storeSuggestions.find((store) => lowerText.includes(store.toLowerCase().replace('’', "'"))) ?? ''
}

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  const windowWithSpeech = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }

  return windowWithSpeech.SpeechRecognition ?? windowWithSpeech.webkitSpeechRecognition
}

function App() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [memories, setMemories] = useState<WineMemory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [recommendationPrompt, setRecommendationPrompt] = useState('')
  const [recommendations, setRecommendations] = useState<WineRecommendation[]>([])
  const [nearbyPriceOptions, setNearbyPriceOptions] = useState<NearbyWinePriceOption[]>([])
  const [recognition, setRecognition] = useState<BottleRecognitionResult | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [scanningStep, setScanningStep] = useState('Ready for the bottle close-up')
  const [error, setError] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState('Tap the mic and talk like you would to a friend.')
  const [locationMessage, setLocationMessage] = useState('Optional, but useful for finding it again.')
  const photoPreviewUrlRef = useRef('')
  const recognitionRequestIdRef = useRef(0)
  const scanIntervalRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      if (photoPreviewUrlRef.current) {
        URL.revokeObjectURL(photoPreviewUrlRef.current)
      }
      if (scanIntervalRef.current) {
        window.clearInterval(scanIntervalRef.current)
      }
    }
  }, [])

  const visibleMemories = useMemo(
    () => searchWineMemories(memories, searchQuery),
    [memories, searchQuery],
  )

  function updateForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function replacePhotoPreview(nextPreviewUrl: string) {
    if (photoPreviewUrlRef.current) {
      URL.revokeObjectURL(photoPreviewUrlRef.current)
    }

    photoPreviewUrlRef.current = nextPreviewUrl
    setPhotoPreview(nextPreviewUrl)
  }

  function stopScanningAnimation() {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = undefined
    }
  }

  async function handleBottlePhoto(file: File | undefined) {
    if (!file) {
      return
    }

    const requestId = recognitionRequestIdRef.current + 1
    recognitionRequestIdRef.current = requestId
    stopScanningAnimation()
    replacePhotoPreview(URL.createObjectURL(file))
    setRecognition(null)
    setNearbyPriceOptions([])
    setIsRecognizing(true)
    setError('')
    setScanningStep(scanningSteps[0])

    let stepIndex = 0
    scanIntervalRef.current = window.setInterval(() => {
      if (recognitionRequestIdRef.current !== requestId) {
        stopScanningAnimation()
        return
      }

      stepIndex = (stepIndex + 1) % scanningSteps.length
      setScanningStep(scanningSteps[stepIndex])
    }, 520)

    try {
      const result = await recognizeBottleFromImage(file)
      if (recognitionRequestIdRef.current !== requestId) {
        return
      }

      stopScanningAnimation()
      setScanningStep('Profile ready — bottle reveal unlocked.')
      setRecognition(result)

      const detectedPrice = extractPriceFromVisibleText(result.bottle.rawVisibleText)
      const detectedStore = extractStoreFromVisibleText(result.bottle.rawVisibleText)

      if (result.status === 'recognized') {
        setForm((current) => ({
          ...current,
          name: current.name || result.bottle.name,
          note: current.note || `Captured ${result.bottle.name}. What did it taste like, and who were you with?`,
          price: current.price || detectedPrice,
          location: current.location || detectedStore,
        }))
      }
    } catch (caught) {
      if (recognitionRequestIdRef.current === requestId) {
        setError(caught instanceof Error ? caught.message : 'Could not recognize bottle photo')
        setScanningStep('Recognition stalled. The cellar goblin needs a retry.')
      }
    } finally {
      if (recognitionRequestIdRef.current === requestId) {
        stopScanningAnimation()
        setIsRecognizing(false)
      }
    }
  }

  function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    try {
      const memory = createWineMemory({
        name: form.name,
        note: form.note,
        liked: sentimentToLiked(form.liked),
        location: form.location,
        price: form.price,
        bottle: recognition?.status === 'recognized' ? recognition.bottle : undefined,
      })

      setMemories((current) => [memory, ...current])
      recognitionRequestIdRef.current += 1
      stopScanningAnimation()
      setIsRecognizing(false)
      setForm(initialForm)
      setRecognition(null)
      replacePhotoPreview('')
      setNearbyPriceOptions([])
      setRecommendations([])
      setScanningStep('Saved. The wine memory vault has been updated.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save wine memory')
    }
  }

  function findCheaperNearby() {
    setError('')
    const options = findCheaperNearbyWineOptions({
      wineName: form.name || recognition?.bottle.name,
      currentPrice: form.price,
      locationLabel: form.location || 'near your current location',
    })

    setNearbyPriceOptions(options)

    if (options.length === 0) {
      setError('Add a price first so Vinophobia can scout cheaper nearby options.')
    }
  }

  function recommendFromMemories() {
    setRecommendations(recommendWineMemories(memories, recommendationPrompt))
  }

  function useNearbyLocation() {
    if (!navigator.geolocation) {
      setLocationMessage('Location is not available in this browser. Use a store chip or type it in.')
      return
    }

    setLocationMessage('Asking the phone where the bottle hunt is happening…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(3)
        const lon = position.coords.longitude.toFixed(3)
        updateForm('location', `Near ${lat}, ${lon}`)
        setLocationMessage('Location attached. Pick a nearby store chip if one matches.')
      },
      () => setLocationMessage('Location permission was skipped. No drama — choose a store chip instead.'),
    )
  }

  function startVoiceNote() {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      setVoiceMessage('Speech-to-text is not supported here. The textarea still has your back.')
      return
    }

    const recognitionSession = new SpeechRecognition()
    recognitionSession.continuous = false
    recognitionSession.interimResults = false
    recognitionSession.lang = 'en-US'
    recognitionSession.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()

      if (transcript) {
        setForm((current) => ({ ...current, note: [current.note, transcript].filter(Boolean).join(' ') }))
        setVoiceMessage('Got it. Voice note captured without turning this into homework.')
      }
    }
    recognitionSession.onerror = () => {
      setVoiceMessage('Mic hiccup. Try again or type the memory manually.')
      setIsListening(false)
    }
    recognitionSession.onend = () => setIsListening(false)
    setIsListening(true)
    setVoiceMessage('Listening… tell Vinophobia what happened with this bottle.')
    recognitionSession.start()
  }

  return (
    <main className="app-shell">
      <section className="hero-card" aria-labelledby="product-title">
        <div>
          <p className="eyebrow">AI wine memory, minus the snobbery</p>
          <h1 id="product-title">Vinophobia</h1>
          <p className="tagline">Remember what you liked. Find it again.</p>
          <p className="promise">Snap the bottle. Feel the AI work. Save the memory before the evening evaporates.</p>
        </div>
        <div className="journey-strip" aria-label="Wine capture journey">
          {['Capture', 'AI Scan', 'Reveal', 'React', 'Remember'].map((step, index) => (
            <span key={step} className={recognition || index === 0 ? 'journey-step active' : 'journey-step'}>
              {step}
            </span>
          ))}
        </div>
      </section>

      <section className="panel capture-panel" aria-labelledby="save-memory-title">
        <div className="section-heading">
          <p className="eyebrow">Capture journey</p>
          <h2 id="save-memory-title">Make the bottle reveal feel earned</h2>
        </div>

        <form onSubmit={saveMemory} className="memory-form">
          <label className="photo-upload">
            <span className="upload-icon">📸</span>
            <span className="upload-copy">
              <strong>Take or upload bottle photo</strong>
              <small>Camera-first, label-focused, no spreadsheet energy.</small>
              <span className="upload-faux">Open camera or photo library</span>
            </span>
            <input
              aria-label="Take or upload bottle photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => void handleBottlePhoto(event.target.files?.[0])}
            />
          </label>

          {(isRecognizing || recognition || photoPreview) ? (
            <div className={recognition ? 'recognition-stage revealed' : 'recognition-stage scanning'}>
              {photoPreview ? <img className="bottle-preview" src={photoPreview} alt="Uploaded bottle preview" /> : null}
              <div className="scan-content">
                <div className="scanner-orb" aria-hidden="true" />
                <p className="eyebrow">AI bottle recognition</p>
                <h3>{recognition ? recognition.bottle.name : scanningStep}</h3>
                <div className="scan-progress" aria-hidden="true">
                  {scanningSteps.map((step) => (
                    <span key={step} className={step === scanningStep || recognition ? 'done' : ''} />
                  ))}
                </div>
                {recognition ? (
                  <>
                    <p>
                      {[recognition.bottle.varietal, recognition.bottle.region, recognition.bottle.vintage]
                        .filter(Boolean)
                        .join(' · ') || 'Needs manual confirmation'}
                    </p>
                    <p className="meta">
                      Confidence {Math.round(recognition.bottle.confidence * 100)}% · {recognition.note}
                    </p>
                    {form.price ? <p className="smart-fill">We think this bottle was around {form.price} — correct?</p> : null}
                  </>
                ) : (
                  <p className="meta">{scanningStep}</p>
                )}
              </div>
            </div>
          ) : null}

          <div className="field-grid">
            <label>
              <span>Wine name optional</span>
              <input
                aria-label="Wine name optional"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="e.g. Pasta Night Red"
              />
            </label>

            <label>
              <span>Price optional</span>
              <input
                aria-label="Price optional"
                value={form.price}
                onChange={(event) => updateForm('price', event.target.value)}
                placeholder="$14.99"
              />
            </label>
          </div>

          <div className="sentiment-section">
            <p className="field-title">Liked it?</p>
            <div className="reaction-grid" aria-label="Did you like it?">
              {sentimentOptions.map((option) => (
                <label className="reaction-card" key={option.value}>
                  <input
                    type="radio"
                    name="liked"
                    value={option.value}
                    checked={form.liked === option.value}
                    onChange={(event) => updateForm('liked', event.target.value)}
                  />
                  <span className="reaction-emoji">{option.emoji}</span>
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </label>
              ))}
            </div>
          </div>

          <label className="voice-note-field">
            <span>What do you remember?</span>
            <textarea
              aria-label="What do you remember?"
              required
              value={form.note}
              onChange={(event) => updateForm('note', event.target.value)}
              placeholder="Smooth and not too sweet, really good with steak..."
            />
            <button type="button" className={isListening ? 'mic-button listening' : 'mic-button'} onClick={startVoiceNote}>
              <span aria-hidden="true">🎙️</span> {isListening ? 'Listening…' : 'Add voice note'}
            </button>
            <p className="meta">{voiceMessage}</p>
          </label>

          <div className="location-card">
            <label>
              <span>Where did you find it? optional</span>
              <input
                aria-label="Where did you find it? optional"
                value={form.location}
                onChange={(event) => updateForm('location', event.target.value)}
                placeholder="Trader Joe's, dinner spot, corner shop..."
              />
            </label>
            <div className="chip-row" aria-label="Store suggestions">
              {storeSuggestions.map((store) => (
                <button type="button" className="store-chip" key={store} onClick={() => updateForm('location', store)}>
                  {store}
                </button>
              ))}
            </div>
            <button type="button" className="secondary-action" onClick={useNearbyLocation}>
              Use nearby location
            </button>
            <p className="meta">{locationMessage}</p>
          </div>

          <button type="button" className="secondary-action" onClick={findCheaperNearby}>
            Find cheaper nearby
          </button>

          {nearbyPriceOptions.length > 0 ? (
            <div className="price-scout-card">
              <p className="eyebrow">Nearby cheaper options</p>
              <h3>Prototype price scout</h3>
              <div className="price-option-list">
                {nearbyPriceOptions.map((option) => (
                  <article className="price-option" key={`${option.storeName}-${option.price}`}>
                    <strong>{option.storeName}</strong>
                    <span>
                      ${option.price.toFixed(2)} · save ${option.savings.toFixed(2)} · {option.distanceMiles} mi
                    </span>
                    <p className="meta">{option.note}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="error">{error}</p> : null}
          <button type="submit" className="primary-action">Save wine memory</button>
        </form>
      </section>

      <section className="panel" aria-labelledby="search-title">
        <div className="section-heading">
          <p className="eyebrow">Personal cellar memory</p>
          <h2 id="search-title">Your remembered wines</h2>
        </div>
        <label>
          <span>Search your wine memories</span>
          <input
            aria-label="Search your wine memories"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="steak red, Trader Joe smooth, patio white..."
          />
        </label>

        <div className="memory-list">
          {visibleMemories.length === 0 ? (
            <p className="empty-state">No matching memories yet. Feed the cellar goblin.</p>
          ) : (
            visibleMemories.map((memory) => (
              <article className="memory-card" key={memory.id}>
                <div>
                  <h3>{memory.name || 'Unnamed wine memory'}</h3>
                  <p>{memory.note}</p>
                </div>
                <p className="signals">{signalSummary(memory)}</p>
                {memory.bottle ? (
                  <p className="bottle-details">
                    Bottle: {[memory.bottle.varietal, memory.bottle.region].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                <p className="meta">
                  {memory.liked ? 'Liked' : 'Not for me'}
                  {memory.location ? ` · ${memory.location}` : ''}
                  {memory.price ? ` · ${memory.price}` : ''}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="recommend-title">
        <div className="section-heading">
          <p className="eyebrow">Recommendation engine</p>
          <h2 id="recommend-title">Shopping helper</h2>
        </div>
        <label>
          <span>What are you shopping for?</span>
          <input
            aria-label="What are you shopping for?"
            value={recommendationPrompt}
            onChange={(event) => setRecommendationPrompt(event.target.value)}
            placeholder="need a smooth wine for pasta"
          />
        </label>
        <button type="button" onClick={recommendFromMemories}>
          Recommend from my memories
        </button>

        {recommendations.length > 0 ? (
          <div className="recommendation-card">
            <p className="eyebrow">Recommended memory</p>
            <h3>{recommendations[0].memory.name || 'Unnamed wine memory'}</h3>
            <p>Why: {recommendations[0].reasons.join(', ')}</p>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default App
