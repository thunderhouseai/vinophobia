import { describe, expect, it } from 'vitest'
import { extractPreferenceSignals } from './preferenceExtraction'

describe('extractPreferenceSignals', () => {
  it('extracts approachable taste and context signals from casual language', () => {
    const signals = extractPreferenceSignals('Had this with pasta, smooth and not too dry.')

    expect(signals.descriptors).toContain('smooth')
    expect(signals.descriptors).toContain('not too dry')
    expect(signals.contexts).toContain('pasta')
  })

  it('recognizes bold red dinner language without wine jargon', () => {
    const signals = extractPreferenceSignals('bold red with steak night')

    expect(signals.descriptors).toContain('bold')
    expect(signals.styles).toContain('red')
    expect(signals.contexts).toContain('steak')
  })
})
