import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('Vinophobia app', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('presents the mobile-first wine memory promise', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Vinophobia' })).toBeInTheDocument()
    expect(screen.getByText('Remember what you liked. Find it again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save wine memory' })).toBeInTheDocument()
  })

  it('saves, searches, and recommends a casual wine memory', async () => {
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

    const user = userEvent.setup()
    render(<App />)

    const bottlePhoto = new File(['fake image bytes'], 'layer-cake-malbec-label.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('Take or upload bottle photo'), bottlePhoto)

    expect(await screen.findByText('Layer Cake Malbec')).toBeInTheDocument()
    expect(screen.getByText(/Mendoza, Argentina/)).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Wine name optional'))
    await user.type(screen.getByLabelText('Wine name optional'), 'Pasta Night Red')
    await user.clear(screen.getByLabelText('What do you remember?'))
    await user.type(screen.getByLabelText('What do you remember?'), 'smooth red with pasta and not too dry')
    await user.type(screen.getByLabelText('Where did you find it? optional'), "Trader Joe's")
    await user.click(screen.getByRole('button', { name: 'Save wine memory' }))

    expect(screen.getByText('Pasta Night Red')).toBeInTheDocument()
    expect(screen.getByText(/smooth, not too dry/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Search your wine memories'), 'Trader Joe smooth')
    expect(screen.getByText('Pasta Night Red')).toBeInTheDocument()

    await user.type(screen.getByLabelText('What are you shopping for?'), 'need a smooth wine for pasta')
    await user.click(screen.getByRole('button', { name: 'Recommend from my memories' }))

    expect(screen.getByText('Recommended memory')).toBeInTheDocument()
    expect(screen.getByText(/Why: smooth, pasta/)).toBeInTheDocument()
  })
})
