/**
 * UserProfile domain.
 *
 * GDPR design decisions:
 * - All data lives in localStorage — no server, no account, no third-party storage.
 * - Profile is identified by a client-generated UUID (not email, not name).
 * - Display name is optional and user-provided.
 * - Taste preferences are user-declared signals only (never inferred without consent).
 * - createdAt / updatedAt allow the user to know exactly when their data was created.
 * - The profile can be deleted in full via deleteUserProfile() — right to erasure.
 * - Export is possible via exportUserProfile() — right to access / data portability.
 */

export type TastePreferences = {
  /** Flavour descriptors the user self-declares (e.g. smooth, dry, fruity) */
  likedDescriptors: string[]
  /** Wine styles the user prefers (e.g. red, white, rosé) */
  likedStyles: string[]
  /** Food pairing contexts (e.g. pasta, steak, seafood) */
  preferredContexts: string[]
  /** Budget ceiling as a plain string (e.g. "$20") */
  budgetCeiling: string
}

export type UserProfile = {
  /** Client-generated UUID — never changes, used as localStorage key namespace */
  id: string
  /** Optional display name chosen by the user */
  displayName: string
  /** Self-declared taste preferences */
  preferences: TastePreferences
  /** ISO timestamp when the profile was first created */
  createdAt: string
  /** ISO timestamp of last update */
  updatedAt: string
}

export type UserProfileInput = {
  displayName?: string
  preferences?: Partial<TastePreferences>
}

const PROFILE_KEY = 'vinophobia:profile:v1'

const defaultPreferences: TastePreferences = {
  likedDescriptors: [],
  likedStyles: [],
  preferredContexts: [],
  budgetCeiling: '',
}

/** Creates a new blank profile and saves it to localStorage. */
export function createUserProfile(input: UserProfileInput = {}): UserProfile {
  const now = new Date().toISOString()
  const profile: UserProfile = {
    id: generateProfileId(),
    displayName: input.displayName?.trim() || '',
    preferences: { ...defaultPreferences, ...input.preferences },
    createdAt: now,
    updatedAt: now,
  }
  saveUserProfile(profile)
  return profile
}

/** Updates fields on an existing profile and persists it. */
export function updateUserProfile(profile: UserProfile, changes: UserProfileInput): UserProfile {
  const updated: UserProfile = {
    ...profile,
    displayName: changes.displayName !== undefined ? changes.displayName.trim() : profile.displayName,
    preferences:
      changes.preferences !== undefined
        ? { ...profile.preferences, ...changes.preferences }
        : profile.preferences,
    updatedAt: new Date().toISOString(),
  }
  saveUserProfile(updated)
  return updated
}

/** Loads the profile from localStorage, or returns null if none exists. */
export function loadUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isValidProfile(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Persists the profile to localStorage. */
export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

/**
 * Deletes all profile data from localStorage (right to erasure).
 * Does NOT delete wine memories — caller must delete those separately.
 */
export function deleteUserProfile(): void {
  localStorage.removeItem(PROFILE_KEY)
}

/**
 * Returns a plain JSON string of the full profile for download
 * (GDPR right of access / data portability).
 */
export function exportUserProfileJson(profile: UserProfile): string {
  return JSON.stringify(profile, null, 2)
}

// ─── Internals ───────────────────────────────────────────────────────────────

function generateProfileId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older environments
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function isValidProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.displayName === 'string' &&
    typeof p.createdAt === 'string' &&
    typeof p.updatedAt === 'string' &&
    typeof p.preferences === 'object' &&
    p.preferences !== null
  )
}
