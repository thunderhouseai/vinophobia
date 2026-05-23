/**
 * Consent store domain.
 *
 * GDPR requirements this module satisfies:
 *
 * 1. Lawful basis — explicit, informed, granular consent before any data is
 *    collected or sent to third parties (Anthropic Claude Vision API).
 *
 * 2. Consent record — stores what the user consented to, when, and at what
 *    version of the privacy notice, so consent is auditable client-side.
 *
 * 3. Withdrawal — revokeConsent() removes the consent record. The app must
 *    stop all data processing when consent is revoked.
 *
 * 4. Granular — separate consent flags for local storage and Claude Vision
 *    so the user can use the app without AI features if preferred.
 *
 * Privacy notice version: bump PRIVACY_NOTICE_VERSION when material changes
 * are made to data processing. The app will re-ask consent on mismatch.
 */

export const PRIVACY_NOTICE_VERSION = '1.0.0'

export type ConsentRecord = {
  /** Consent to store wine memories in localStorage on this device */
  localStorageConsent: boolean
  /** Consent to send bottle photos to Anthropic's Claude Vision API for recognition */
  claudeVisionConsent: boolean
  /** Version of the privacy notice that was shown when consent was given */
  privacyNoticeVersion: string
  /** ISO timestamp when consent was recorded */
  consentedAt: string
}

const CONSENT_KEY = 'vinophobia:consent:v1'

/** Returns true if the user has given valid consent for the current privacy notice version. */
export function hasValidConsent(): boolean {
  const record = loadConsent()
  if (!record) return false
  return (
    record.localStorageConsent &&
    record.privacyNoticeVersion === PRIVACY_NOTICE_VERSION
  )
}

/** Returns the full consent record, or null if none exists. */
export function loadConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isValidConsent(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Saves the user's consent choices. */
export function saveConsent(choices: {
  localStorageConsent: boolean
  claudeVisionConsent: boolean
}): ConsentRecord {
  const record: ConsentRecord = {
    localStorageConsent: choices.localStorageConsent,
    claudeVisionConsent: choices.claudeVisionConsent,
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
    consentedAt: new Date().toISOString(),
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record))
  return record
}

/**
 * Revokes consent and removes the consent record.
 * Caller is responsible for also erasing any data that was collected under consent.
 */
export function revokeConsent(): void {
  localStorage.removeItem(CONSENT_KEY)
}

/**
 * Returns whether the user has consented to Claude Vision (photo-to-API processing).
 * Always check this before calling the bottle recognition API.
 */
export function hasClaudeVisionConsent(): boolean {
  const record = loadConsent()
  return record?.claudeVisionConsent === true
}

// ─── Internals ───────────────────────────────────────────────────────────────

function isValidConsent(value: unknown): value is ConsentRecord {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return (
    typeof c.localStorageConsent === 'boolean' &&
    typeof c.claudeVisionConsent === 'boolean' &&
    typeof c.privacyNoticeVersion === 'string' &&
    typeof c.consentedAt === 'string'
  )
}
