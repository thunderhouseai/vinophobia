export type NearbyPriceSearchInput = {
  wineName?: string
  currentPrice: string
  locationLabel?: string
}

export type NearbyWinePriceOption = {
  storeName: string
  wineName: string
  price: number
  savings: number
  distanceMiles: number
  locationLabel: string
  confidence: number
  source: 'prototype-price-scout'
  note: string
}

const prototypeStores = [
  { storeName: 'Neighborhood Wine & Spirits', distanceMiles: 0.7, discount: 0.14 },
  { storeName: 'Corner Cellar Market', distanceMiles: 1.3, discount: 0.19 },
  { storeName: 'Bottle Barn Express', distanceMiles: 2.1, discount: 0.08 },
]

function parsePrice(price: string): number | null {
  const normalized = price.replace(/[^0-9.]/g, '')
  const value = Number.parseFloat(normalized)

  return Number.isFinite(value) && value > 0 ? value : null
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function findCheaperNearbyWineOptions(input: NearbyPriceSearchInput): NearbyWinePriceOption[] {
  const currentPrice = parsePrice(input.currentPrice)
  const wineName = input.wineName?.trim() || 'this bottle'

  if (!currentPrice) {
    return []
  }

  return prototypeStores
    .map((store) => {
      const price = roundMoney(currentPrice * (1 - store.discount))

      return {
        storeName: store.storeName,
        wineName,
        price,
        savings: roundMoney(currentPrice - price),
        distanceMiles: store.distanceMiles,
        locationLabel: input.locationLabel || 'near your current location',
        confidence: 0.35,
        source: 'prototype-price-scout' as const,
        note: 'Prototype price scout estimate. Replace with live store inventory/pricing API before production.',
      }
    })
    .filter((option) => option.price < currentPrice)
}
