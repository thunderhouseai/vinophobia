export type PreferenceSignals = {
  descriptors: string[]
  styles: string[]
  contexts: string[]
}

const descriptorTerms = [
  'smooth',
  'not too dry',
  'bold',
  'crisp',
  'sweet',
  'dry',
  'fruity',
  'light',
  'rich',
  'sharp',
]

const styleTerms = ['red', 'white', 'rose', 'rosé', 'sparkling', 'malbec', 'pinot', 'cabernet', 'chardonnay']
const contextTerms = ['pasta', 'steak', 'pizza', 'dinner', 'patio', 'date night', 'seafood', 'chicken']

function includesTerm(text: string, term: string): boolean {
  return text.includes(term.toLowerCase())
}

function uniqueMatches(text: string, terms: string[]): string[] {
  return Array.from(new Set(terms.filter((term) => includesTerm(text, term))))
}

export function extractPreferenceSignals(note: string): PreferenceSignals {
  const normalized = note.toLowerCase()

  return {
    descriptors: uniqueMatches(normalized, descriptorTerms),
    styles: uniqueMatches(normalized, styleTerms).map((style) => (style === 'rose' ? 'rosé' : style)),
    contexts: uniqueMatches(normalized, contextTerms),
  }
}

export function flattenSignals(signals: PreferenceSignals): string[] {
  return [...signals.descriptors, ...signals.styles, ...signals.contexts]
}
