import { useState, useEffect } from 'react'
import {
  Flame,
  Lock,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Clock
} from './Icons'
import { fetchAndDecryptShare } from '../lib/secureShare'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'
import { KEPT_ICON } from '../lib/brand'

export default function ViewSharedSecretScreen({ shareParams, onExit, lang = 'id' }) {
  const t = (k) => getTranslation(k, lang)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requiresPin, setRequiresPin] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [secretData, setSecretData] = useState(null)
  const [revealed, setRevealed] = useState(true)
  const [copied, setCopied] = useState(false)
  const [clipboardTimer, setClipboardTimer] = useState(null)

  useEffect(() => {
    loadSecret('')
  }, [shareParams])

  async function loadSecret(userPin = '') {
    if (!shareParams) return
    setLoading(true)
    setError('')
    setPinError('')

    try {
      const result = await fetchAndDecryptShare({
        shareId: shareParams.shareId,
        shareKeyHex: shareParams.shareKeyHex,
        directPayload: shareParams.directPayload,
        pin: userPin
      })

      if (result.requiresPin) {
        setRequiresPin(true)
        setSecretData(result)
      } else {
        setRequiresPin(false)
        setSecretData(result)
        haptic('success')
      }
    } catch (err) {
      if (requiresPin && userPin) {
        setPinError(err.message || 'PIN salah. Silakan coba lagi.')
        haptic('error')
      } else {
        setError(err.message || t('share_view_expired_desc'))
      }
    } finally {
      setLoading(false)
    }
  }

  function handlePinSubmit(e) {
    e.preventDefault()
    if (!pinInput.trim()) return
    loadSecret(pinInput.trim())
  }

  function handleCopySecret() {
    if (!secretData?.content) return
    navigator.clipboard.writeText(secretData.content)
    setCopied(true)
    haptic('success')

    // Optional clipboard auto-clear after 60s
    if (clipboardTimer) clearTimeout(clipboardTimer)
    const tid = setTimeout(() => {
      // Clear clipboard quietly if permitted
      try {
        navigator.clipboard.writeText('')
      } catch {
        // ignore
      }
    }, 60000)
    setClipboardTimer(tid)

    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div className="shared-secret-page-shell">
      <div className="shared-secret-container">
        {/* Brand header */}
        <div className="shared-secret-header">
          <div className="brand-logo-small">
            <img src={KEPT_ICON} alt="Kept" className="kept-header-icon" />
            <span className="kept-header-title">Kept</span>
          </div>
          <span className="shared-secret-badge">
            <Lock size={12} /> {t('share_view_title')}
          </span>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="shared-secret-card loading-card">
            <div className="spinner-brand" />
            <p className="mt-md text-muted">{t('share_view_decrypting')}</p>
          </div>
        )}

        {/* Error / Burned state */}
        {!loading && error && (
          <div className="shared-secret-card error-card">
            <div className="error-flame-icon">
              <ShieldAlert size={36} />
            </div>
            <h2>{t('share_view_expired_title')}</h2>
            <p className="text-muted mt-xs">{error}</p>

            <button
              type="button"
              className="primary-button pill-button mt-lg"
              onClick={onExit}
            >
              <span>{t('share_view_open_vault')}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* PIN Entry Prompt */}
        {!loading && !error && requiresPin && (
          <div className="shared-secret-card pin-prompt-card">
            <div className="pin-shield-icon">
              <Lock size={32} />
            </div>
            <h2>{t('share_view_pin_title')}</h2>
            <p className="text-muted mt-xs">{t('share_view_pin_desc')}</p>

            <form onSubmit={handlePinSubmit} className="mt-md w-full">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder={t('share_view_pin_ph')}
                className="font-mono text-center letter-spacing-lg w-full"
                autoFocus
                required
              />

              {pinError && <div className="feedback error mt-xs">{pinError}</div>}

              <button
                type="submit"
                className="primary-button pill-button w-full mt-md"
                disabled={!pinInput.trim()}
              >
                <Flame size={14} />
                <span>{t('share_view_pin_btn')}</span>
              </button>
            </form>
          </div>
        )}

        {/* Revealed Secret */}
        {!loading && !error && !requiresPin && secretData && (
          <div className="shared-secret-card revealed-card">
            {secretData.isBurned ? (
              <div className="burned-status-pill">
                <Flame size={14} />
                <span>{t('share_view_burned_badge')}</span>
              </div>
            ) : (
              <div className="views-left-pill">
                <Clock size={13} />
                <span>
                  {lang === 'id'
                    ? `Sisa ${secretData.viewsRemaining} kali buka`
                    : `${secretData.viewsRemaining} views remaining`}
                </span>
              </div>
            )}

            {secretData.title && (
              <h2 className="secret-revealed-title">{secretData.title}</h2>
            )}

            <p className="secret-burned-warning">
              {secretData.isBurned
                ? t('share_view_burned_desc')
                : lang === 'id'
                  ? 'Pesan ini memiliki batas tampilan dan akan otomatis dimusnahkan.'
                  : 'This message has a view limit and will permanently self-destruct.'}
            </p>

            <div className="secret-content-viewer">
              <div className="secret-content-top">
                <span className="secret-label">Konten Rahasia:</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setRevealed((prev) => !prev)}
                  title={revealed ? 'Sembunyikan' : 'Perlihatkan'}
                  aria-label={revealed ? 'Sembunyikan' : 'Perlihatkan'}
                >
                  {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <div className="secret-text-box font-mono">
                {revealed
                  ? secretData.content
                  : '•'.repeat(Math.min(secretData.content?.length || 12, 32))}
              </div>

              <button
                type="button"
                className={`secret-copy-trigger ${copied ? 'copied' : ''}`}
                onClick={handleCopySecret}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <strong>{copied ? t('share_view_secret_copied') : t('share_view_copy_secret')}</strong>
              </button>
            </div>

            <div className="shared-secret-footer-notice">
              <ShieldCheck size={14} className="text-brand-accent flex-shrink-0" />
              <span>{t('share_view_auto_clear_notice')}</span>
            </div>

            <div className="shared-secret-action-row mt-md">
              <button
                type="button"
                className="secondary-button pill-button w-full"
                onClick={onExit}
              >
                {t('share_view_open_vault')}
              </button>
            </div>
          </div>
        )}

        <div className="shared-secret-bottom-brand">
          <span>{t('share_view_powered_by')}</span>
        </div>
      </div>
    </div>
  )
}
