export type RecognizedBottle = {
  name: string
  producer?: string
  varietal?: string
  region?: string
  vintage?: string
  confidence: number
  source: 'prototype-ai-placeholder'
}

export type BottleRecognitionResult = {
  status: 'recognized' | 'needs-confirmation'
  bottle: RecognizedBottle
  note: string
}

const prototypeMatches: Array<{ pattern: RegExp; bottle: Omit<RecognizedBottle, 'source'> }> = [
  {
    pattern: /layer[-_\s]?cake|malbec/i,
    bottle: {
      name: 'Layer Cake Malbec',
      producer: 'Layer Cake',
      varietal: 'Malbec',
      region: 'Mendoza, Argentina',
      confidence: 0.82,
    },
  },
  {
    pattern: /meiomi|pinot/i,
    bottle: {
      name: 'Meiomi Pinot Noir',
      producer: 'Meiomi',
      varietal: 'Pinot Noir',
      region: 'California',
      confidence: 0.78,
    },
  },
]

export async function recognizeBottleFromImage(file: File): Promise<BottleRecognitionResult> {
  const filename = file.name.toLowerCase()
  const match = prototypeMatches.find((candidate) => candidate.pattern.test(filename))

  if (!match) {
    return {
      status: 'needs-confirmation',
      bottle: {
        name: 'Unrecognized bottle',
        confidence: 0.2,
        source: 'prototype-ai-placeholder',
      },
      note: 'Prototype recognition could not infer the bottle yet. Real AI/OCR service should replace this placeholder.',
    }
  }

  return {
    status: 'recognized',
    bottle: {
      ...match.bottle,
      source: 'prototype-ai-placeholder',
    },
    note: 'Prototype recognition based on filename. Replace with AI vision/OCR bottle recognition service.',
  }
}
