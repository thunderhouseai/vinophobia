import { extractPreferenceSignals, flattenSignals } from './preferenceExtraction'
import type { WineMemory } from './wineMemory'

export type WineRecommendation = {
  memory: WineMemory
  score: number
  reasons: string[]
}

export function recommendWineMemories(memories: WineMemory[], prompt: string): WineRecommendation[] {
  const promptSignals = new Set(flattenSignals(extractPreferenceSignals(prompt)))
  const promptWords = new Set(prompt.toLowerCase().split(/\s+/).filter(Boolean))
  const targets = new Set([...promptSignals, ...promptWords])

  return memories
    .filter((memory) => memory.liked)
    .map((memory) => {
      const memorySignals = flattenSignals(extractPreferenceSignals(memory.note))
      const reasons = memorySignals.filter((signal) => targets.has(signal))
      const noteWords = memory.note.toLowerCase().split(/\s+/).filter(Boolean)
      const wordReasons = noteWords.filter((word) => targets.has(word))
      const uniqueReasons = Array.from(new Set([...reasons, ...wordReasons]))

      return {
        memory,
        score: uniqueReasons.length,
        reasons: uniqueReasons,
      }
    })
    .filter((recommendation) => recommendation.score > 0)
    .sort((a, b) => b.score - a.score || a.memory.createdAt.localeCompare(b.memory.createdAt))
}
