import { useState, useRef, useEffect } from 'react'
import { X, LifeBuoy, Send, ExternalLink, Paperclip, Image, Trash2, Check, AlertCircle } from './Icons'
import { haptic } from '../lib/haptics'
import { getTranslation } from '../lib/i18n'
import { submitHelpdeskTicket } from '../lib/helpdesk'

export default function HelpdeskTicketModal({
  isOpen,
  onClose,
  user,
  profile,
  lang = 'id',
  showToast
}) {
  const t = (k) => getTranslation(k, lang)

  const [complaint, setComplaint] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef(null)

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setComplaint('')
      setPhotoFile(null)
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
        setPhotoPreview(null)
      }
      setErrorMsg('')
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  // Support Escape key to close modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMsg(lang === 'id' ? 'File harus berupa gambar (PNG, JPG, WebP).' : 'File must be an image (PNG, JPG, WebP).')
      haptic('error')
      return
    }

    // Max 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(lang === 'id' ? 'Ukuran foto maksimal 10MB.' : 'Maximum photo size is 10MB.')
      haptic('error')
      return
    }

    setErrorMsg('')
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    haptic('light')
  }

  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    haptic('light')
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    setErrorMsg('')

    if (!complaint.trim()) {
      setErrorMsg(t('helpdesk_complaint_required'))
      haptic('error')
      return
    }

    setIsSubmitting(true)
    haptic('medium')

    try {
      submitHelpdeskTicket({
        user,
        profile,
        complaint: complaint.trim(),
        photoFile
      })

      showToast?.(t('helpdesk_success_toast'))

      setTimeout(() => {
        setIsSubmitting(false)
        onClose()
      }, 300)
    } catch (err) {
      setIsSubmitting(false)
      setErrorMsg(err.message || 'Gagal meneruskan tiket ke Helpdesk.')
      haptic('error')
    }
  }

  return (
    <div className="sheet-backdrop helpdesk-modal-backdrop" onMouseDown={onClose}>
      <section
        className="helpdesk-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('helpdesk_card_title')}
      >
        <div className="sheet-drag-handle" aria-hidden="true" />

        {/* Header */}
        <div className="helpdesk-dialog-header">
          <div className="helpdesk-dialog-title-wrap">
            <div className="helpdesk-badge-chip">
              <LifeBuoy size={20} />
            </div>
            <div>
              <div className="flex items-center gap-xs">
                <h3>{t('helpdesk_card_title')}</h3>
                <span className="helpdesk-sso-badge">
                  <Check size={11} strokeWidth={2.5} /> {t('helpdesk_badge_sso')}
                </span>
              </div>
              <span className="helpdesk-dialog-subtitle">
                {t('helpdesk_btn_subtitle')}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={() => {
              haptic('light')
              onClose()
            }}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* System & Context Metadata Strip */}
        <div className="helpdesk-meta-strip">
          <span className="meta-pill">App: <strong>Kept</strong></span>
          <span className="meta-pill">Role: <strong>{profile?.role || (user ? 'Member' : 'Guest')}</strong></span>
          <span className="meta-pill">User: <strong>{user?.email || (user ? user.id.slice(0, 8) + '...' : 'Tamu')}</strong></span>
        </div>

        {/* Complaint Form */}
        <form onSubmit={handleSubmit} className="helpdesk-form-body">
          {errorMsg && (
            <div className="helpdesk-error-alert" role="alert">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Keluhan / Problem Description */}
          <div className="helpdesk-field-group">
            <label htmlFor="helpdesk-complaint-input" className="helpdesk-field-label">
              <span>{t('helpdesk_complaint_label')}</span>
              <span className="required-star">*</span>
            </label>
            <textarea
              id="helpdesk-complaint-input"
              className="helpdesk-textarea"
              placeholder={t('helpdesk_complaint_placeholder')}
              value={complaint}
              onChange={(e) => {
                setComplaint(e.target.value)
                if (errorMsg) setErrorMsg('')
              }}
              rows={4}
              maxLength={2000}
              aria-describedby="helpdesk-char-count"
              required
            />
            <div id="helpdesk-char-count" className="helpdesk-char-count">
              <span>{complaint.length} / 2000</span>
            </div>
          </div>

          {/* Photo Bukti Kendala (Tidak Mandatory) */}
          <div className="helpdesk-field-group">
            <div className="flex items-center justify-between">
              <label className="helpdesk-field-label">
                <span>{t('helpdesk_photo_label')}</span>
              </label>
              <span className="helpdesk-optional-tag">{lang === 'id' ? 'Opsional' : 'Optional'}</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
              id="helpdesk-photo-file-input"
            />

            {!photoPreview ? (
              <button
                type="button"
                className="helpdesk-photo-dropzone"
                onClick={() => {
                  haptic('light')
                  fileInputRef.current?.click()
                }}
              >
                <div className="dropzone-icon-circle">
                  <Paperclip size={18} />
                </div>
                <div className="dropzone-text">
                  <strong>{t('helpdesk_photo_upload_btn')}</strong>
                  <span>{t('helpdesk_photo_hint')}</span>
                </div>
              </button>
            ) : (
              <div className="helpdesk-photo-preview-card">
                <div className="preview-thumbnail-wrap">
                  <img src={photoPreview} alt="Bukti kendala" className="preview-thumbnail" />
                </div>
                <div className="preview-meta">
                  <div className="flex items-center gap-xs">
                    <Check size={13} className="text-emerald" />
                    <strong>{photoFile?.name || t('helpdesk_photo_attached')}</strong>
                  </div>
                  <span className="text-xs text-muted">
                    {photoFile ? `${(photoFile.size / 1024).toFixed(1)} KB` : ''}
                  </span>
                </div>
                <div className="preview-actions">
                  <button
                    type="button"
                    className="icon-button-subtle"
                    onClick={() => fileInputRef.current?.click()}
                    title={t('helpdesk_photo_change_btn')}
                  >
                    <Paperclip size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button-subtle text-danger"
                    onClick={handleRemovePhoto}
                    title={t('helpdesk_photo_remove_btn')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="helpdesk-modal-footer-hint">
            {t('helpdesk_quick_tip')}
          </p>

          {/* Action Row */}
          <div className="helpdesk-dialog-actions">
            <button
              type="submit"
              className="primary-button pill-button helpdesk-submit-button flex-1"
              disabled={isSubmitting}
            >
              <Send size={15} />
              <span>{isSubmitting ? t('helpdesk_submitting') : t('helpdesk_submit_btn')}</span>
              <ExternalLink size={14} className="ml-auto opacity-70" />
            </button>

            <button
              type="button"
              className="secondary-button pill-button"
              onClick={() => {
                haptic('light')
                onClose()
              }}
            >
              <span>{lang === 'id' ? 'Batal' : 'Cancel'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
