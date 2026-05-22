import { describe, expect, it } from 'vitest'
import { createWineMemory } from './wineMemory'

describe('createWineMemory with bottle recognition context', () => {
  it('stores recognized bottle information with the user memory', () => {
    const memory = createWineMemory({
      name: 'Layer Cake Malbec',
      note: 'smooth red with pasta',
      liked: true,
      bottle: {
        name: 'Layer Cake Malbec',
        producer: 'Layer Cake',
        varietal: 'Malbec',
        region: 'Mendoza, Argentina',
        confidence: 0.82,
        source: 'claude-vision',
      },
    })

    expect(memory.bottle?.name).toBe('Layer Cake Malbec')
    expect(memory.bottle?.region).toBe('Mendoza, Argentina')
  })
})
