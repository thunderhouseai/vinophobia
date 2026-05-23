/**
 * Wine memory persistence store.
 *
 * GDPR design decisions:
 * - All memories are stored in localStorage — device-local, no server sync.
 * - The store key is namespaced per profile ID so multi-profile scenarios
 *   are possible without data leakage between profiles.
 * - deleteAllMemories() fully erases the store (right to erasure).
 * - exportMemoriesJson() returns all data as portable JSON (right of access).
 * - No memory is written unless the caller has confirmed consent exists.
 *   The store itself does not enforce this — the caller (App) must check.
 */

import type { WineMemory } from './wineMemory'

const MEMORIES_KEY_PREFIX = 'vinophobia:memories:v1'

function storageKey(profileId: string): string {
  return `${MEMORIES_KEY_PREFIX}:${profileId}`
}

/** Loads all wine memories for a profile, newest first. Returns [] on any error. */
export function loadMemories(profileId: string): WineMemory[] {
  try {
    const raw = localStorage.getItem(storageKey(profileId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    // Basic type guard — each item must have id, note, liked, createdAt
    return parsed.filter(isValidMemory)
  } catch {
    return []
  }
}

/** Persists the full memories array for a profile (replaces existing). */
export function saveMemories(profileId: string, memories: WineMemory[]): void {
  localStorage.setItem(storageKey(profileId), JSON.stringify(memories))
}

/** Prepends a new memory and persists the updated list. Returns new list. */
export function addMemory(profileId: string, memory: WineMemory): WineMemory[] {
  const existing = loadMemories(profileId)
  const updated = [memory, ...existing]
  saveMemories(profileId, updated)
  return updated
}

/** Removes a single memory by id. Returns the updated list. */
export function deleteMemory(profileId: string, memoryId: string): WineMemory[] {
  const existing = loadMemories(profileId)
  const updated = existing.filter((m) => m.id !== memoryId)
  saveMemories(profileId, updated)
  return updated
}

/**
 * Deletes all memories for a profile (GDPR right to erasure).
 * Used when user deletes their account.
 */
export function deleteAllMemories(profileId: string): void {
  localStorage.removeItem(storageKey(profileId))
}

/**
 * Returns a portable JSON string of all memories (GDPR right of access).
 */
export function exportMemoriesJson(profileId: string): string {
  return JSON.stringify(loadMemories(profileId), null, 2)
}

// ─── Internals ───────────────────────────────────────────────────────────────

function isValidMemory(value: unknown): value is WineMemory {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Record<string, unknown>
  return (
    typeof m.id === 'string' &&
    typeof m.note === 'string' &&
    typeof m.liked === 'boolean' &&
    typeof m.createdAt === 'string'
  )
}
