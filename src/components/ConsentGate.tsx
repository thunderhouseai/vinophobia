/**
 * ConsentGate — GDPR first-launch consent modal.
 *
 * Shown on first visit and whenever the privacy notice version changes.
 * Blocks app use until the user makes an explicit choice.
 *
 * Design principles:
 * - Plain language — no legal jargon
 * - Granular — separate toggles for local storage vs Claude Vision
 * - No dark patterns — decline is equally prominent as accept
 * - Honest about what Claude Vision does (sends photo to Anthropic)
 * - Links to further detail (expandable, not hidden)
 */

import { useState } from 'react'
import { saveConsent } from '../domain/consentStore'
import type { ConsentRecord } from '../domain/consentStore'

type Props = {
  onConsent: (record: ConsentRecord) => void
  onDecline: () => void
}

export function ConsentGate({ onConsent, onDecline }: Props) {
  const [claudeConsent, setClaudeConsent] = useState(true)
  const [showDetail, setShowDetail] = useState(false)

  function handleAccept() {
    const record = saveConsent({
      localStorageConsent: true,
      claudeVisionConsent: claudeConsent,
    })
    onConsent(record)
  }

  return (
    <div className="consent-overlay" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="consent-modal">
        <div className="consent-header">
          <span className="consent-icon" aria-hidden="true">🍷</span>
          <h1 id="consent-title">Before we open the cellar</h1>
          <p className="consent-lead">
            Vinophobia is your personal wine memory. Here is exactly what it stores and where.
          </p>
        </div>

        <div className="consent-items">
          {/* Local storage — required for the app to work */}
          <div className="consent-item consent-item--required">
            <div className="consent-item__icon" aria-hidden="true">📱</div>
            <div className="consent-item__body">
              <strong>Wine memories on this device</strong>
              <p>
                Your wine notes, sentiment, location, and bottle data are saved in your
                browser's local storage — on this device only. Nothing is sent to any server.
              </p>
              <span className="consent-item__required-badge">Required to use the app</span>
            </div>
            <div className="consent-item__toggle-wrap">
              <span className="consent-toggle consent-toggle--on" aria-label="Required, always on">On</span>
            </div>
          </div>

          {/* Claude Vision — optional, clearer benefit/risk */}
          <div className="consent-item">
            <div className="consent-item__icon" aria-hidden="true">📸</div>
            <div className="consent-item__body">
              <strong>AI bottle recognition (optional)</strong>
              <p>
                When you scan a bottle photo, Vinophobia sends that image to{' '}
                <strong>Anthropic's Claude Vision API</strong> to identify the wine.
                No image is stored by us. Anthropic's{' '}
                <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">
                  privacy policy
                </a>{' '}
                applies to that request.
              </p>
              <p className="consent-item__optional-note">
                Without this, you can still enter wine details manually.
              </p>
            </div>
            <div className="consent-item__toggle-wrap">
              <label className="consent-toggle-label" aria-label="Enable AI bottle recognition">
                <input
                  type="checkbox"
                  className="consent-toggle-input"
                  checked={claudeConsent}
                  onChange={(e) => setClaudeConsent(e.target.checked)}
                />
                <span className={`consent-toggle ${claudeConsent ? 'consent-toggle--on' : 'consent-toggle--off'}`}>
                  {claudeConsent ? 'On' : 'Off'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Expandable detail */}
        <button
          type="button"
          className="consent-detail-toggle"
          onClick={() => setShowDetail((v) => !v)}
          aria-expanded={showDetail}
        >
          {showDetail ? '▲ Less detail' : '▾ Full privacy detail'}
        </button>

        {showDetail && (
          <div className="consent-detail" role="region" aria-label="Full privacy detail">
            <h2>What Vinophobia stores</h2>
            <ul>
              <li>Wine name, notes, sentiment, location, price — in your browser's localStorage</li>
              <li>Bottle data returned by Claude Vision (name, varietal, region, vintage)</li>
              <li>A local profile ID (random UUID) so your data stays grouped</li>
              <li>Your optional display name if you enter one</li>
              <li>This consent record itself (what you agreed to, when)</li>
            </ul>
            <h2>What Vinophobia does NOT store</h2>
            <ul>
              <li>Your email, phone number, or real name (unless you voluntarily enter a display name)</li>
              <li>Your photos — images are sent to Anthropic for recognition and immediately discarded</li>
              <li>Any data on a server — everything stays on this device</li>
              <li>Tracking pixels, analytics cookies, or behavioural data</li>
            </ul>
            <h2>Your rights</h2>
            <ul>
              <li><strong>Access:</strong> export all your data as JSON any time from your profile</li>
              <li><strong>Erasure:</strong> delete your profile and all memories in one click</li>
              <li><strong>Withdraw consent:</strong> withdraw from settings; no new data will be processed</li>
              <li><strong>Portability:</strong> your export is standard JSON — import it wherever you like</li>
            </ul>
            <p className="consent-detail__note">
              Vinophobia is a local-first app. There is no account, no login, no cloud sync.
              Your data lives entirely on this device until you move or delete it.
            </p>
          </div>
        )}

        <div className="consent-actions">
          <button type="button" className="consent-btn consent-btn--primary" onClick={handleAccept}>
            I understand — open the cellar
          </button>
          <button type="button" className="consent-btn consent-btn--secondary" onClick={onDecline}>
            Not right now
          </button>
        </div>

        <p className="consent-footer-note">
          You can review and change these choices any time in your profile settings.
        </p>
      </div>
    </div>
  )
}
