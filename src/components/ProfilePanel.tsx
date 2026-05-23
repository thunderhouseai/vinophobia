/**
 * ProfilePanel — user profile management + GDPR controls.
 *
 * Provides:
 * - Display name editing
 * - Taste preference self-declaration
 * - Export all data (JSON download — GDPR right of access)
 * - Delete account (GDPR right to erasure)
 * - Consent status + revoke/update consent
 * - Profile created date
 */

import { useState } from 'react'
import type { UserProfile, TastePreferences } from '../domain/userProfile'
import { updateUserProfile, exportUserProfileJson } from '../domain/userProfile'
import { exportMemoriesJson, deleteAllMemories } from '../domain/wineMemoryStore'
import { loadConsent, revokeConsent, hasClaudeVisionConsent, saveConsent, PRIVACY_NOTICE_VERSION } from '../domain/consentStore'
import type { WineMemory } from '../domain/wineMemory'

type Props = {
  profile: UserProfile
  memories: WineMemory[]
  onProfileUpdate: (updated: UserProfile) => void
  onDeleteAccount: () => void
  onClose: () => void
}

const descriptorOptions = ['smooth', 'dry', 'bold', 'crisp', 'sweet', 'fruity', 'light', 'rich']
const styleOptions = ['red', 'white', 'rosé', 'sparkling', 'malbec', 'pinot', 'cabernet', 'chardonnay']
const contextOptions = ['pasta', 'steak', 'pizza', 'seafood', 'chicken', 'date night', 'patio', 'dinner']

export function ProfilePanel({ profile, memories, onProfileUpdate, onDeleteAccount, onClose }: Props) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [preferences, setPreferences] = useState<TastePreferences>({ ...profile.preferences })
  const [claudeConsent, setClaudeConsent] = useState(hasClaudeVisionConsent())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saved, setSaved] = useState(false)

  const consent = loadConsent()

  function togglePreference(field: keyof TastePreferences, value: string) {
    setPreferences((prev) => {
      const current = prev[field] as string[]
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [field]: next }
    })
  }

  function handleSave() {
    const updated = updateUserProfile(profile, {
      displayName,
      preferences,
    })
    // Update Claude Vision consent if changed
    if (claudeConsent !== hasClaudeVisionConsent()) {
      saveConsent({ localStorageConsent: true, claudeVisionConsent: claudeConsent })
    }
    onProfileUpdate(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleExport() {
    const profileData = exportUserProfileJson(profile)
    const memoriesData = exportMemoriesJson(profile.id)

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      gdprNote: 'This is your complete Vinophobia data export. All data is stored locally on your device.',
      profile: JSON.parse(profileData) as unknown,
      memories: JSON.parse(memoriesData) as unknown,
      consent: consent,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vinophobia-data-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleDeleteAccount() {
    deleteAllMemories(profile.id)
    revokeConsent()
    onDeleteAccount()
  }

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))

  return (
    <div className="profile-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <div className="profile-panel">
        <div className="profile-header">
          <h2 id="profile-title">Your Vinophobia Profile</h2>
          <button className="profile-close" onClick={onClose} aria-label="Close profile">✕</button>
        </div>

        {/* Identity */}
        <section className="profile-section" aria-labelledby="profile-identity-title">
          <h3 id="profile-identity-title">
            <span aria-hidden="true">👤</span> Identity
          </h3>
          <label className="profile-field">
            <span>Display name <small>(optional)</small></span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Wine Goblin, Alex, The Taster"
              maxLength={60}
            />
          </label>
          <p className="profile-meta">
            Profile ID: <code className="profile-id">{profile.id.slice(0, 8)}…</code>
            {' '}· Created {formatDate(profile.createdAt)}
          </p>
        </section>

        {/* Taste preferences */}
        <section className="profile-section" aria-labelledby="profile-prefs-title">
          <h3 id="profile-prefs-title">
            <span aria-hidden="true">🍇</span> Taste preferences
          </h3>
          <p className="profile-hint">
            These help Vinophobia surface better recommendations. All optional, all yours.
          </p>

          <div className="pref-group">
            <p className="pref-group__label">Flavour profile</p>
            <div className="pref-chips">
              {descriptorOptions.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`pref-chip ${preferences.likedDescriptors.includes(d) ? 'pref-chip--active' : ''}`}
                  onClick={() => togglePreference('likedDescriptors', d)}
                  aria-pressed={preferences.likedDescriptors.includes(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="pref-group">
            <p className="pref-group__label">Preferred styles</p>
            <div className="pref-chips">
              {styleOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`pref-chip ${preferences.likedStyles.includes(s) ? 'pref-chip--active' : ''}`}
                  onClick={() => togglePreference('likedStyles', s)}
                  aria-pressed={preferences.likedStyles.includes(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pref-group">
            <p className="pref-group__label">Usually drinking with</p>
            <div className="pref-chips">
              {contextOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pref-chip ${preferences.preferredContexts.includes(c) ? 'pref-chip--active' : ''}`}
                  onClick={() => togglePreference('preferredContexts', c)}
                  aria-pressed={preferences.preferredContexts.includes(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <label className="profile-field">
            <span>Budget ceiling <small>(optional, e.g. $20)</small></span>
            <input
              type="text"
              value={preferences.budgetCeiling}
              onChange={(e) => setPreferences((p) => ({ ...p, budgetCeiling: e.target.value }))}
              placeholder="$20"
              maxLength={20}
            />
          </label>
        </section>

        {/* Privacy & consent */}
        <section className="profile-section profile-section--privacy" aria-labelledby="profile-privacy-title">
          <h3 id="profile-privacy-title">
            <span aria-hidden="true">🔒</span> Privacy &amp; data
          </h3>

          <div className="consent-status">
            <div className="consent-status__row">
              <span>Wine memories stored on this device</span>
              <span className="consent-status__badge consent-status__badge--on">On</span>
            </div>
            <div className="consent-status__row">
              <label className="consent-inline-label">
                AI bottle recognition (Anthropic Claude Vision)
                <input
                  type="checkbox"
                  checked={claudeConsent}
                  onChange={(e) => setClaudeConsent(e.target.checked)}
                />
              </label>
              <span className={`consent-status__badge ${claudeConsent ? 'consent-status__badge--on' : 'consent-status__badge--off'}`}>
                {claudeConsent ? 'On' : 'Off'}
              </span>
            </div>
            {consent && (
              <p className="profile-meta">
                Consent given {formatDate(consent.consentedAt)} · Privacy notice v{consent.privacyNoticeVersion}
              </p>
            )}
          </div>
        </section>

        {/* Stats */}
        <section className="profile-section" aria-labelledby="profile-stats-title">
          <h3 id="profile-stats-title">
            <span aria-hidden="true">📊</span> Your cellar
          </h3>
          <div className="profile-stats">
            <div className="profile-stat">
              <strong>{memories.length}</strong>
              <span>memories</span>
            </div>
            <div className="profile-stat">
              <strong>{memories.filter((m) => m.liked).length}</strong>
              <span>liked</span>
            </div>
            <div className="profile-stat">
              <strong>{new Set(memories.map((m) => m.location).filter(Boolean)).size}</strong>
              <span>locations</span>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="profile-actions">
          <button
            type="button"
            className={`profile-btn profile-btn--primary ${saved ? 'profile-btn--saved' : ''}`}
            onClick={handleSave}
          >
            {saved ? '✓ Saved' : 'Save changes'}
          </button>

          <button type="button" className="profile-btn profile-btn--secondary" onClick={handleExport}>
            📥 Export my data (JSON)
          </button>
        </div>

        {/* GDPR danger zone */}
        <section className="profile-danger-zone" aria-labelledby="profile-delete-title">
          <h3 id="profile-delete-title">
            <span aria-hidden="true">⚠️</span> Delete account &amp; data
          </h3>
          <p>
            This permanently deletes your profile, all wine memories, and your consent record
            from this device. This cannot be undone.
          </p>

          {!confirmDelete ? (
            <button
              type="button"
              className="profile-btn profile-btn--danger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete my account and all data
            </button>
          ) : (
            <div className="profile-delete-confirm">
              <p>
                <strong>Are you sure?</strong> All {memories.length} wine{' '}
                {memories.length === 1 ? 'memory' : 'memories'} will be deleted.
              </p>
              <div className="profile-delete-actions">
                <button
                  type="button"
                  className="profile-btn profile-btn--danger"
                  onClick={handleDeleteAccount}
                >
                  Yes, delete everything
                </button>
                <button
                  type="button"
                  className="profile-btn profile-btn--secondary"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
