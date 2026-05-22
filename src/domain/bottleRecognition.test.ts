import { describe, expect, it } from 'vitest'
import { recognizeBottleFromImage } from './bottleRecognition'

describe('recognizeBottleFromImage', () => {
  it('returns a provisional AI bottle recognition result from a photo file', async () => {
    const file = new File(['fake image bytes'], 'layer-cake-malbec-label.jpg', { type: 'image/jpeg' })

    const result = await recognizeBottleFromImage(file)

    expect(result.status).toBe('recognized')
    expect(result.bottle.name).toBe('Layer Cake Malbec')
    expect(result.bottle.varietal).toBe('Malbec')
    expect(result.bottle.confidence).toBeGreaterThan(0)
    expect(result.bottle.source).toBe('prototype-ai-placeholder')
  })

  it('asks for confirmation when the bottle cannot be inferred from the filename placeholder', async () => {
    const file = new File(['fake image bytes'], 'unknown-bottle.png', { type: 'image/png' })

    const result = await recognizeBottleFromImage(file)

    expect(result.status).toBe('needs-confirmation')
    expect(result.bottle.name).toBe('Unrecognized bottle')
    expect(result.bottle.source).toBe('prototype-ai-placeholder')
  })
})
