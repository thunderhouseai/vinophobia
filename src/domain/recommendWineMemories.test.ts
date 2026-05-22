import { describe, expect, it } from 'vitest'
import { createWineMemory } from './wineMemory'
import { recommendWineMemories } from './recommendWineMemories'

const memories = [
  createWineMemory({ name: 'Loved Pasta Red', note: 'smooth red with pasta', liked: true }),
  createWineMemory({ name: 'Harsh Pasta Red', note: 'sharp red with pasta', liked: false }),
  createWineMemory({ name: 'Crisp Patio White', note: 'crisp white on the patio', liked: true }),
]

describe('recommendWineMemories', () => {
  it('recommends liked wines with overlapping casual signals', () => {
    const results = recommendWineMemories(memories, 'need something smooth for pasta')

    expect(results[0].memory.name).toBe('Loved Pasta Red')
    expect(results[0].reasons).toContain('smooth')
    expect(results[0].reasons).toContain('pasta')
  })

  it('does not prioritize disliked wines even when signals overlap', () => {
    const results = recommendWineMemories(memories, 'red pasta')

    expect(results.map((result) => result.memory.name)).not.toContain('Harsh Pasta Red')
  })
})
