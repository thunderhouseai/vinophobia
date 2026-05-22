import { describe, expect, it } from 'vitest'
import { createWineMemory } from './wineMemory'
import { searchWineMemories } from './searchWineMemories'

const memories = [
  createWineMemory({
    name: 'Steak Night Red',
    note: 'bold red with steak night',
    liked: true,
    location: 'Market Basket',
  }),
  createWineMemory({
    name: 'Pasta Bottle',
    note: 'smooth and not too dry with pasta',
    liked: true,
    location: 'Trader Joe\'s',
  }),
]

describe('searchWineMemories', () => {
  it('finds memories by natural language across note, signal, name, and location', () => {
    const results = searchWineMemories(memories, 'Trader Joe smooth')

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Pasta Bottle')
  })

  it('finds dinner-context matches from casual search', () => {
    const results = searchWineMemories(memories, 'steak red')

    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Steak Night Red')
  })
})
