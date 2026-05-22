import { describe, expect, it } from 'vitest'
import { findCheaperNearbyWineOptions } from './nearbyPriceSearch'

describe('findCheaperNearbyWineOptions', () => {
  it('returns prototype nearby options cheaper than the current entered price', () => {
    const options = findCheaperNearbyWineOptions({
      wineName: 'Layer Cake Malbec',
      currentPrice: '$18.99',
      locationLabel: 'near current location',
    })

    expect(options.length).toBeGreaterThan(0)
    expect(options.every((option) => option.price < 18.99)).toBe(true)
    expect(options[0].wineName).toBe('Layer Cake Malbec')
    expect(options[0].distanceMiles).toBeGreaterThan(0)
    expect(options[0].source).toBe('prototype-price-scout')
  })

  it('returns no options when price is missing or not parseable', () => {
    expect(
      findCheaperNearbyWineOptions({
        wineName: 'Layer Cake Malbec',
        currentPrice: '',
        locationLabel: 'near current location',
      }),
    ).toEqual([])
  })
})
