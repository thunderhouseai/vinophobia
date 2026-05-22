import { extractPreferenceSignals, flattenSignals } from './preferenceExtraction'
import type { WineMemory } from './wineMemory'

function searchableText(memory: WineMemory): string {
  const signals = flattenSignals(extractPreferenceSignals(memory.note))
  return [memory.name, memory.note, memory.location, memory.price, ...signals]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
}

export function searchWineMemories(memories: WineMemory[], query: string): WineMemory[] {
  const terms = queryTerms(query)

  if (terms.length === 0) {
    return memories
  }

  return memories.filter((memory) => {
    const haystack = searchableText(memory)
    return terms.every((term) => haystack.includes(term))
  })
}
