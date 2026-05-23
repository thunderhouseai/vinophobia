export type RecognizedBottle = {
  name: string
  producer?: string
  varietal?: string
  region?: string
  vintage?: string
  country?: string
  rawVisibleText?: string[]
  confidence: number
  source: 'claude-vision' | 'prototype-ai-placeholder'
}

export type BottleRecognitionResult = {
  status: 'recognized' | 'needs-confirmation'
  bottle: RecognizedBottle
  note: string
}

type BottleRecognitionApiResponse = {
  status?: 'recognized' | 'needs-confirmation'
  bottle?: Partial<RecognizedBottle>
  note?: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.2
  }

  if (value > 1) {
    return Math.max(0, Math.min(1, value / 100))
  }

  return Math.max(0, Math.min(1, value))
}

function normalizeRawVisibleText(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const text = value.filter(isNonEmptyString).map((item) => item.trim())
  return text.length > 0 ? text : undefined
}

function normalizeBottleRecognition(payload: BottleRecognitionApiResponse): BottleRecognitionResult {
  const bottle = payload.bottle ?? {}
  const name = isNonEmptyString(bottle.name) ? bottle.name.trim() : 'Unrecognized bottle'
  const confidence = normalizeConfidence(bottle.confidence)
  const status = payload.status ?? (confidence >= 0.55 && name !== 'Unrecognized bottle' ? 'recognized' : 'needs-confirmation')

  return {
    status,
    bottle: {
      name,
      producer: isNonEmptyString(bottle.producer) ? bottle.producer.trim() : undefined,
      varietal: isNonEmptyString(bottle.varietal) ? bottle.varietal.trim() : undefined,
      region: isNonEmptyString(bottle.region) ? bottle.region.trim() : undefined,
      vintage: isNonEmptyString(bottle.vintage) ? bottle.vintage.trim() : undefined,
      country: isNonEmptyString(bottle.country) ? bottle.country.trim() : undefined,
      rawVisibleText: normalizeRawVisibleText(bottle.rawVisibleText),
      confidence,
      source: 'claude-vision',
    },
    note:
      payload.note ??
      (status === 'recognized'
        ? 'Claude Vision recognized the bottle. Please confirm before saving.'
        : 'Claude Vision could not confidently identify the bottle. Manual confirmation needed.'),
  }
}

export async function recognizeBottleFromImage(file: File): Promise<BottleRecognitionResult> {
  const formData = new FormData()
  formData.append('photo', file)

  const response = await fetch(`${import.meta.env.BASE_URL}api/recognize-bottle`, {
    method: 'POST',
    body: formData,
  })

  const payload = (await response.json().catch(() => null)) as BottleRecognitionApiResponse | { error?: string } | null

  if (!response.ok) {
    const errorMessage = payload && 'error' in payload && payload.error ? payload.error : 'Bottle recognition service failed'
    throw new Error(errorMessage)
  }

  if (!payload || !('bottle' in payload)) {
    throw new Error('Bottle recognition service returned an invalid response')
  }

  return normalizeBottleRecognition(payload)
}
