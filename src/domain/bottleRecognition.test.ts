import { afterEach, describe, expect, it, vi } from 'vitest'
import { recognizeBottleFromImage } from './bottleRecognition'

describe('recognizeBottleFromImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a Claude Vision bottle recognition result from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'recognized',
          bottle: {
            name: 'Layer Cake Malbec',
            producer: 'Layer Cake',
            varietal: 'Malbec',
            region: 'Mendoza, Argentina',
            confidence: 0.82,
            source: 'claude-vision',
          },
          note: 'Claude Vision recognized the bottle. Confirm the fields before saving.',
        }),
      }),
    )

    const file = new File(['fake image bytes'], 'layer-cake-malbec-label.jpg', { type: 'image/jpeg' })

    const result = await recognizeBottleFromImage(file)

    expect(fetch).toHaveBeenCalledWith(
      '/api/recognize-bottle',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    )
    expect(result.status).toBe('recognized')
    expect(result.bottle.name).toBe('Layer Cake Malbec')
    expect(result.bottle.varietal).toBe('Malbec')
    expect(result.bottle.confidence).toBeGreaterThan(0)
    expect(result.bottle.source).toBe('claude-vision')
  })

  it('asks for confirmation when Claude Vision has low confidence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'needs-confirmation',
          bottle: {
            name: 'Unrecognized bottle',
            confidence: 0.2,
            source: 'claude-vision',
          },
          note: 'Manual confirmation needed.',
        }),
      }),
    )

    const file = new File(['fake image bytes'], 'unknown-bottle.png', { type: 'image/png' })

    const result = await recognizeBottleFromImage(file)

    expect(result.status).toBe('needs-confirmation')
    expect(result.bottle.name).toBe('Unrecognized bottle')
    expect(result.bottle.source).toBe('claude-vision')
  })

  it('throws a useful error when the recognition API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Claude Vision request failed' }),
      }),
    )

    const file = new File(['fake image bytes'], 'bad-photo.png', { type: 'image/png' })

    await expect(recognizeBottleFromImage(file)).rejects.toThrow('Claude Vision request failed')
  })
})
