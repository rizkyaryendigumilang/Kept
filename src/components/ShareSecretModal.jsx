import { useState, useEffect } from 'react'
import {
  X,
  Copy,
  Check,
  Flame,
  Lock,
  Clock,
  Eye,
  Share2,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from './Icons'
import { createSecureShare } from '../lib/secureShare'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

export default function ShareSecretModal({
  isOpen,
  onClose,
  initialContent = '',
  initialTitle = '',
  user = null,
  lang = 'id',
  showToast
}) {
  const t = (k) => getTranslation(k, lang)

  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [expiryHours, setExpiryHours] = useState(24)
  const [maxViews, setMaxViews] = useState(1)
  const [enablePin, setEnablePin] = useState(false)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [generatedResult, setGeneratedResult] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || '')
      setContent(initialContent || '')
      setGeneratedResult(null)
      setError('')
      setCopied(false)
      setPin('')
      setEnablePin(false)
    }
  }, [isOpen, initialContent, initialTitle])

  if (!isOpen) return null

  async function handleCreate(e) {
    e.preventDefault()
    if (!content.trim()) {
      setError(t('share_secret_content_label') + ' wajib diisi.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const result = await createSecureShare({
        title: title.trim(),
        content: content.trim(),
        pin: enablePin ? pin.trim() : '',
        expiryHours: Number(expiryHours),
        maxViews: Number(maxViews),
        senderId: user?.id || null
      })

      setGeneratedResult(result)
      haptic('success')
    } catch (err) {
      setError(err.message || 'Gagal membuat tautan rahasia.')
      haptic('error')
    } finally {
      setBusy(false)
    }
  }

  function handleCopy() {
    if (!generatedResult?.shareUrl) return
    navigator.clipboard.writeText(generatedResult.shareUrl)
    setCopied(true)
    haptic('success')
    if (showToast) {
      showToast(t('share_secret_copied'))
    }
    setTimeout(() => setCopied(false), 2400)
  }

  function handleShareWhatsApp() {
    if (!generatedResult?.shareUrl) return
    const text =
      lang === 'id'
        ? `🔐 Berikut tautan rahasia sekali buka untuk Anda (hancur otomatis setelah dibuka):\n${generatedResult.shareUrl}`
        : `🔐 Here is a self-destructing secure secret link for you:\n${generatedResult.shareUrl}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  async function handleNativeShare() {
    if (!generatedResult?.shareUrl || !navigator.share) return
    try {
      await navigator.share({
        title: generatedResult.title || 'Kept Secure Secret',
        text:
          lang === 'id'
            ? 'Berikut tautan rahasia terenkripsi sekali buka:'
            : 'Here is a self-destructing secret link:',
        url: generatedResult.shareUrl
      })
    } catch {
      // user canceled or unsupported
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-card share-secret-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('share_secret_modal_title')}
      >
        <div className="modal-header">
          <div className="share-modal-title-wrap">
            <div className="share-flame-icon">
              <Flame size={18} />
            </div>
            <div>
              <h3>{t('share_secret_modal_title')}</h3>
              <p className="modal-lead">{t('share_secret_modal_desc')}</p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button close-btn"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {!generatedResult ? (
          <form onSubmit={handleCreate} className="share-form">
            <label className="field">
              <span>{t('share_secret_title_label')}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('share_secret_title_ph')}
                maxLength={60}
              />
            </label>

            <label className="field">
              <div className="field-label-row">
                <span>{t('share_secret_content_label')}</span>
                <span className="field-count">{content.length} karakter</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('share_secret_content_ph')}
                rows={4}
                required
                className="font-mono text-sm"
              />
            </label>

            <div className="share-options-grid">
              <div className="share-option-col">
                <span className="field-small-label">{t('share_secret_expiry_label')}</span>
                <div className="pills-segmented">
                  <button
                    type="button"
                    className={expiryHours === 1 ? 'pill-choice active' : 'pill-choice'}
                    onClick={() => setExpiryHours(1)}
                  >
                    {t('share_secret_exp_1h')}
                  </button>
                  <button
                    type="button"
                    className={expiryHours === 24 ? 'pill-choice active' : 'pill-choice'}
                    onClick={() => setExpiryHours(24)}
                  >
                    {t('share_secret_exp_24h')}
                  </button>
                  <button
                    type="button"
                    className={expiryHours === 168 ? 'pill-choice active' : 'pill-choice'}
                    onClick={() => setExpiryHours(168)}
                  >
                    {t('share_secret_exp_7d')}
                  </button>
                </div>
              </div>

              <div className="share-option-col">
                <span className="field-small-label">{t('share_secret_views_label')}</span>
                <div className="pills-segmented">
                  <button
                    type="button"
                    className={maxViews === 1 ? 'pill-choice active' : 'pill-choice'}
                    onClick={() => setMaxViews(1)}
                  >
                    {t('share_secret_view_1')}
                  </button>
                  <button
                    type="button"
                    className={maxViews === 3 ? 'pill-choice active' : 'pill-choice'}
                    onClick={() => setMaxViews(3)}
                  >
                    {t('share_secret_view_3')}
                  </button>
                  <button
                    type="button"
                    className={maxViews === 5 ? 'pill-choice active' : 'pill-choice'}
                    onClick={() => setMaxViews(5)}
                  >
                    {t('share_secret_view_5')}
                  </button>
                </div>
              </div>
            </div>

            <div className="share-pin-accordion">
              <label className="toggle-row cursor-pointer">
                <div>
                  <strong>{t('share_secret_pin_label')}</strong>
                  <span>{t('share_secret_pin_hint')}</span>
                </div>
                <input
                  type="checkbox"
                  checked={enablePin}
                  onChange={(e) => setEnablePin(e.target.checked)}
                />
              </label>

              {enablePin && (
                <div className="share-pin-input-wrap">
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder={t('share_secret_pin_ph')}
                    className="font-mono"
                    required={enablePin}
                  />
                </div>
              )}
            </div>

            {error && <div className="feedback error">{error}</div>}

            <div className="modal-actions mt-md">
              <button
                type="button"
                className="secondary-button pill-button"
                onClick={onClose}
                disabled={busy}
              >
                Batal
              </button>
              <button
                type="submit"
                className="primary-button pill-button share-submit-btn"
                disabled={busy || !content.trim()}
              >
                <Flame size={15} />
                {busy ? t('share_secret_creating') : t('share_secret_create_btn')}
              </button>
            </div>
          </form>
        ) : (
          <div className="share-result-view">
            <div className="share-result-hero">
              <div className="share-result-flame">
                <Flame size={28} />
              </div>
              <h4>{t('share_secret_ready_title')}</h4>
              <p>{t('share_secret_ready_desc')}</p>
            </div>

            <div className="share-url-box">
              <input
                type="text"
                readOnly
                value={generatedResult.shareUrl}
                className="share-url-input font-mono"
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className={`share-copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Tersalin' : t('share_secret_copy_btn')}</span>
              </button>
            </div>

            <div className="share-notice-box">
              <ShieldCheck size={16} className="text-brand-accent flex-shrink-0" />
              <span>
                {generatedResult.isCloudBurn
                  ? t('share_secret_burn_notice')
                  : 'Tautan mandiri terenkripsi klien (zero-knowledge).'}
              </span>
            </div>

            <div className="share-action-buttons">
              <button
                type="button"
                className="whatsapp-share-btn"
                onClick={handleShareWhatsApp}
              >
                <Share2 size={14} />
                <span>{t('share_secret_share_wa')}</span>
              </button>

              {typeof navigator !== 'undefined' && navigator.share && (
                <button
                  type="button"
                  className="secondary-button pill-button"
                  onClick={handleNativeShare}
                >
                  <ExternalLink size={14} />
                  <span>Share</span>
                </button>
              )}
            </div>

            <div className="modal-actions mt-md">
              <button
                type="button"
                className="primary-button pill-button w-full"
                onClick={onClose}
              >
                {t('share_secret_close_btn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
