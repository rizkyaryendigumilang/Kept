import { useState, useRef, useEffect } from 'react'
import {
  LifeBuoy,
  Check,
  Send,
  Paperclip,
  Trash2,
  AlertCircle,
  ExternalLink
} from '../Icons'
import { submitHelpdeskTicket } from '../../lib/helpdesk'
import { haptic } from '../../lib/haptics'
import { getTranslation } from '../../lib/i18n'

export default function HelpdeskSubpage({
  user,
  profile,
  lang = 'id',
  showToast
}) {
  const t = (k) => getTranslation(k, lang)
  const [complaint, setComplaint] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [helpError, setHelpError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  return (
    <div className="drawer-subpage-view">
      <p className="subpage-lead-desc">
        {t('help_lead')}
      </p>

      {/* VPS Helpdesk Direct Ticket Card */}
      <div className="subpage-card helpdesk-hero-card">
        <div className="helpdesk-hero-header">
          <div className="helpdesk-badge-chip">
            <LifeBuoy size={22} />
          </div>
          <div className="helpdesk-hero-titles">
            <div className="flex items-center gap-xs">
              <strong>{t('helpdesk_card_title')}</strong>
              <span className="helpdesk-sso-badge">
                <Check size={11} strokeWidth={2.5} /> {t('helpdesk_badge_sso')}
              </span>
            </div>
            <span>{t('helpdesk_card_desc')}</span>
          </div>
        </div>

        <div className="helpdesk-session-preview">
          <div className="helpdesk-meta-row">
            <span className="meta-label">Aplikasi Target:</span>
            <span className="meta-val font-mono">Kept</span>
          </div>
          <div className="helpdesk-meta-row">
            <span className="meta-label">Sesi Pengguna:</span>
            <span className="meta-val font-mono">
              {user?.id ? user.id.slice(0, 16) + '...' : user?.email || 'Tamu / Guest'}
            </span>
          </div>
          <div className="helpdesk-meta-row">
            <span className="meta-label">Peran (Role):</span>
            <span className="meta-val">{profile?.role || (user ? 'Member' : 'Guest')}</span>
          </div>
        </div>

        {helpError && (
          <div className="helpdesk-error-alert" role="alert">
            <AlertCircle size={15} />
            <span>{helpError}</span>
          </div>
        )}

        {/* Input Keluhan */}
        <div className="helpdesk-field-group">
          <label htmlFor="drawer-helpdesk-complaint" className="helpdesk-field-label">
            <span>{t('helpdesk_complaint_label')}</span>
            <span className="required-star">*</span>
          </label>
          <textarea
            id="drawer-helpdesk-complaint"
            className="helpdesk-textarea"
            placeholder={t('helpdesk_complaint_placeholder')}
            value={complaint}
            onChange={(e) => {
              setComplaint(e.target.value)
              if (helpError) setHelpError('')
            }}
            rows={3}
            maxLength={2000}
            aria-describedby="drawer-helpdesk-char-count"
            required
          />
          <div id="drawer-helpdesk-char-count" className="helpdesk-char-count">
            <span>{complaint.length} / 2000</span>
          </div>
        </div>

        {/* Input Foto Kendala (Tidak Mandatory) */}
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
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (!file.type.startsWith('image/')) {
                setHelpError(lang === 'id' ? 'File harus berupa gambar (PNG, JPG, WebP).' : 'File must be an image (PNG, JPG, WebP).')
                haptic('error')
                return
              }
              if (file.size > 10 * 1024 * 1024) {
                setHelpError(lang === 'id' ? 'Ukuran foto maksimal 10MB.' : 'Maximum photo size is 10MB.')
                haptic('error')
                return
              }
              setHelpError('')
              if (photoPreview) URL.revokeObjectURL(photoPreview)
              setPhotoFile(file)
              setPhotoPreview(URL.createObjectURL(file))
              haptic('light')
            }}
            style={{ display: 'none' }}
            id="drawer-photo-file-input"
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
                <Paperclip size={16} />
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
                  onClick={() => {
                    if (photoPreview) URL.revokeObjectURL(photoPreview)
                    setPhotoFile(null)
                    setPhotoPreview(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                    haptic('light')
                  }}
                  title={t('helpdesk_photo_remove_btn')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="helpdesk-hint-text">
          {t('helpdesk_quick_tip')}
        </p>

        <div className="helpdesk-action-wrap">
          <button
            type="button"
            className="primary-button helpdesk-open-btn"
            disabled={submitting}
            onClick={() => {
              if (!complaint.trim()) {
                setHelpError(t('helpdesk_complaint_required'))
                haptic('error')
                return
              }
              setSubmitting(true)
              haptic('medium')
              try {
                submitHelpdeskTicket({
                  user,
                  profile,
                  complaint: complaint.trim(),
                  photoFile: photoFile
                })
                showToast?.(t('helpdesk_success_toast'))
                setTimeout(() => {
                  setSubmitting(false)
                }, 500)
              } catch (err) {
                setSubmitting(false)
                setHelpError(err.message || 'Gagal meneruskan tiket ke Helpdesk.')
                haptic('error')
              }
            }}
          >
            <Send size={15} />
            <span>{submitting ? t('helpdesk_submitting') : t('helpdesk_submit_btn')}</span>
            <ExternalLink size={14} className="ml-auto opacity-70" />
          </button>
        </div>
      </div>

      <div className="subpage-card">
        <div className="subpage-card-heading">
          <strong>{t('help_about_title')}</strong>
          <span>{t('help_about_desc')}</span>
        </div>
        <div className="about-info-stack">
          <div className="about-info-item">
            <span>{t('help_version_label')}</span>
            <strong>v0.1.0 (Production Ready)</strong>
          </div>
          <div className="about-info-item">
            <span>Design System:</span>
            <strong>Omarchy (Light-first minimalis)</strong>
          </div>
          <div className="about-info-item">
            <span>{lang === 'id' ? 'Tipografi:' : 'Typography:'}</span>
            <strong>Geist Variable & JetBrains Mono</strong>
          </div>
          <div className="about-info-item">
            <span>{lang === 'id' ? 'Standar Kriptografi:' : 'Cryptography Standard:'}</span>
            <strong>AES-256-GCM + PBKDF2 (100k rounds)</strong>
          </div>
        </div>
      </div>

      <div className="subpage-card">
        <div className="subpage-card-heading">
          <strong>{t('help_zk_title')}</strong>
          <span>{t('help_zk_how')}</span>
        </div>
        <p className="about-text-body">
          {t('help_zk_step1')}
        </p>
        <p className="about-text-body">
          {t('help_zk_step2')}
        </p>
        <p className="about-text-body">
          {t('help_zk_step3')}
        </p>
      </div>
    </div>
  )
}
