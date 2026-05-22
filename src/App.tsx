import { useMemo, useState, type FormEvent } from 'react'
import './App.css'
import { recognizeBottleFromImage, type BottleRecognitionResult } from './domain/bottleRecognition'
import { extractPreferenceSignals, flattenSignals } from './domain/preferenceExtraction'
import { recommendWineMemories, type WineRecommendation } from './domain/recommendWineMemories'
import { searchWineMemories } from './domain/searchWineMemories'
import { createWineMemory, type WineMemory } from './domain/wineMemory'

type FormState = {
  name: string
  note: string
  liked: 'liked' | 'disliked'
  location: string
  price: string
}

const initialForm: FormState = {
  name: '',
  note: '',
  liked: 'liked',
  location: '',
  price: '',
}

function signalSummary(memory: WineMemory): string {
  const signals = flattenSignals(extractPreferenceSignals(memory.note))
  return signals.length > 0 ? signals.join(', ') : 'No pattern yet — add more detail next time.'
}

function App() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [memories, setMemories] = useState<WineMemory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [recommendationPrompt, setRecommendationPrompt] = useState('')
  const [recommendations, setRecommendations] = useState<WineRecommendation[]>([])
  const [recognition, setRecognition] = useState<BottleRecognitionResult | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [error, setError] = useState('')

  const visibleMemories = useMemo(
    () => searchWineMemories(memories, searchQuery),
    [memories, searchQuery],
  )

  function updateForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleBottlePhoto(file: File | undefined) {
    if (!file) {
      return
    }

    setIsRecognizing(true)
    setError('')

    try {
      const result = await recognizeBottleFromImage(file)
      setRecognition(result)
      if (result.status === 'recognized') {
        setForm((current) => ({
          ...current,
          name: current.name || result.bottle.name,
          note: current.note || `Captured ${result.bottle.name}. Add what you liked about it.`,
        }))
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not recognize bottle photo')
    } finally {
      setIsRecognizing(false)
    }
  }

  function saveMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    try {
      const memory = createWineMemory({
        name: form.name,
        note: form.note,
        liked: form.liked === 'liked',
        location: form.location,
        price: form.price,
      })

      setMemories((current) => [memory, ...current])
      setForm(initialForm)
      setRecommendations([])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save wine memory')
    }
  }

  function recommendFromMemories() {
    setRecommendations(recommendWineMemories(memories, recommendationPrompt))
  }

  return (
    <main className="app-shell">
      <section className="hero-card" aria-labelledby="product-title">
        <p className="eyebrow">AI wine memory, minus the snobbery</p>
        <h1 id="product-title">Vinophobia</h1>
        <p className="tagline">Remember what you liked. Find it again.</p>
        <p className="promise">Snap the bottle at purchase. Vinophobia recognizes it, then remembers why it mattered.</p>
      </section>

      <section className="panel" aria-labelledby="save-memory-title">
        <h2 id="save-memory-title">Capture a bottle</h2>
        <form onSubmit={saveMemory} className="memory-form">
          <label className="photo-upload">
            Take or upload bottle photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => void handleBottlePhoto(event.target.files?.[0])}
            />
          </label>

          {isRecognizing ? <p className="recognition-card">Recognizing bottle…</p> : null}

          {recognition ? (
            <div className="recognition-card">
              <p className="eyebrow">AI bottle recognition</p>
              <h3>{recognition.bottle.name}</h3>
              <p>
                {[recognition.bottle.varietal, recognition.bottle.region].filter(Boolean).join(' · ') ||
                  'Needs manual confirmation'}
              </p>
              <p className="meta">
                Confidence {Math.round(recognition.bottle.confidence * 100)}% · {recognition.note}
              </p>
            </div>
          ) : null}

          <label>
            Wine name optional
            <input
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              placeholder="e.g. Pasta Night Red"
            />
          </label>

          <label>
            What do you remember?
            <textarea
              required
              value={form.note}
              onChange={(event) => updateForm('note', event.target.value)}
              placeholder="smooth, not too dry, had it with pasta..."
            />
          </label>

          <div className="segmented" aria-label="Did you like it?">
            <label>
              <input
                type="radio"
                name="liked"
                value="liked"
                checked={form.liked === 'liked'}
                onChange={(event) => updateForm('liked', event.target.value)}
              />
              Liked it
            </label>
            <label>
              <input
                type="radio"
                name="liked"
                value="disliked"
                checked={form.liked === 'disliked'}
                onChange={(event) => updateForm('liked', event.target.value)}
              />
              Not for me
            </label>
          </div>

          <label>
            Where did you find it? optional
            <input
              value={form.location}
              onChange={(event) => updateForm('location', event.target.value)}
              placeholder="Trader Joe's, dinner spot, corner shop..."
            />
          </label>

          <label>
            Price optional
            <input
              value={form.price}
              onChange={(event) => updateForm('price', event.target.value)}
              placeholder="$14.99"
            />
          </label>

          {error ? <p className="error">{error}</p> : null}
          <button type="submit">Save wine memory</button>
        </form>
      </section>

      <section className="panel" aria-labelledby="search-title">
        <h2 id="search-title">Your remembered wines</h2>
        <label>
          Search your wine memories
          <input
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
        <h2 id="recommend-title">Shopping helper</h2>
        <label>
          What are you shopping for?
          <input
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
