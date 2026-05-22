import { describe, expect, it } from 'vitest'
import { createWineMemory } from './wineMemory'

describe('createWineMemory', () => {
  it('creates a wine memory from casual user input', () => {
    const memory = createWineMemory({
      name: 'Layer Cake Malbec',
      note: 'Had this with pasta, smooth and not too dry.',
      liked: true,
      location: 'Corner shop',
      price: '14.99',
    })

    expect(memory.id).toMatch(/^wine-/)
    expect(memory.name).toBe('Layer Cake Malbec')
    expect(memory.note).toBe('Had this with pasta, smooth and not too dry.')
    expect(memory.liked).toBe(true)
    expect(memory.location).toBe('Corner shop')
    expect(memory.price).toBe('14.99')
    expect(memory.createdAt).toBeTruthy()
  })

  it('requires a non-empty note because Vinophobia starts from messy memory', () => {
    expect(() => createWineMemory({ note: '   ', liked: true })).toThrow('note is required')
  })
})
