export type WineMemoryInput = {
  name?: string
  note: string
  liked: boolean
  location?: string
  price?: string
}

export type WineMemory = WineMemoryInput & {
  id: string
  createdAt: string
}

export function createWineMemory(input: WineMemoryInput): WineMemory {
  const note = input.note.trim()

  if (!note) {
    throw new Error('note is required')
  }

  return {
    ...input,
    note,
    name: input.name?.trim() || undefined,
    location: input.location?.trim() || undefined,
    price: input.price?.trim() || undefined,
    id: `wine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
}
