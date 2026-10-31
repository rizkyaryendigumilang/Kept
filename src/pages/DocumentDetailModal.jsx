import { useState } from 'react'
import Modal from '../components/Modal'
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Star,
  FileDown,
  Download,
  Calendar,
  ShieldCheck,
  FileText
} from '../components/Icons'
import { getTemplateById, checkDocumentExpiry } from '../lib/documents'
import { downloadAttachmentSafely, isSafePdfDataUrl, isSafeImageDataUrl } from '../lib/safeUrl'
import DocumentCard from '../components/DocumentCard'
import ConfirmToast from '../components/ConfirmToast'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

export default function DocumentDetailModal({
  item,
  onClose,
  onDelete,
  onSave,
  onToggleFavorite,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [form, setForm] = useState({ ...item })
  const [copiedKey, setCopiedKey] = useState('')
  const [activeTab, setActiveTab] = useState('info') // 'info' | 'front' | 'back' | 'pdf'

  const template = getTemplateById(form.doc_type || form.template_id)
  const expiryStatus = checkDocumentExpiry(form.expiry_date)

  async function copyText(key, text) {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 1500)
  }

  function downloadAttachment(fileObj, defaultName) {
    downloadAttachmentSafely(fileObj, defaultName)
  }

  function handleSaveEdit(e) {
    e.preventDefault()
    onSave(item.id, form)
    setIsEditing(false)
  }

  const hasFront = Boolean(form.attachments?.front?.data)
  const hasBack = Boolean(form.attachments?.back?.data)
  const hasPdf = Boolean(form.attachments?.pdf?.data)

  return (
    <Modal
      title={form.name}
      eyebrow={template.fullName}
      badge={template.badge}
      wide
      onClose={onClose}
    >
      {/* Action Bar */}
      <div className="doc-detail-top-actions">
        <button
          className={`action-pill-btn favorite ${item.favorite ? 'selected' : ''}`}
          onClick={() => {
            haptic('light')
            onToggleFavorite(item.id)
          }}
          title={item.favorite ? (lang === 'id' ? 'Hapus dari Favorit' : 'Remove from Favorites') : (lang === 'id' ? 'Tambah ke Favorit' : 'Add to Favorites')}
        >
          <Star size={14} fill={item.favorite ? 'currentColor' : 'none'} />
          <span>{lang === 'id' ? 'Favorit' : 'Favorite'}</span>
        </button>

        <button
          className="action-pill-btn"
          onClick={() => {
            haptic('light')
            setIsEditing((prev) => !prev)
          }}
          title={isEditing ? t('action_cancel') : t('action_edit')}
          aria-label={isEditing ? t('action_cancel') : t('action_edit')}
        >
          <Pencil size={14} />
          <span>{isEditing ? t('action_cancel') : t('action_edit')}</span>
        </button>

        <button
          className="action-pill-btn delete"
          onClick={() => {
            haptic('light')
            setShowDeleteConfirm(true)
          }}
          title={t('action_delete')}
          aria-label={t('action_delete')}
        >
          <Trash2 size={14} />
          <span>{t('action_delete')}</span>
        </button>
      </div>

      {!isEditing ? (
        <>
          {/* Card Preview */}
          <div className="doc-preview-wrapper">
            <DocumentCard
              doc={form}
              onDownload={() => {
                if (hasPdf) downloadAttachment(form.attachments.pdf, `${form.name}.pdf`)
                else if (hasFront) downloadAttachment(form.attachments.front, `${form.name}-front.jpg`)
                else if (hasBack) downloadAttachment(form.attachments.back, `${form.name}-back.jpg`)
              }}
            />
          </div>

          {/* Sub-tabs: Info, Scan Depan, Scan Belakang, PDF */}
          <div className="doc-view-tabs">
            <button
              className={`doc-view-tab ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              Rincian & Metadata
            </button>
            {hasFront && (
              <button
                className={`doc-view-tab ${activeTab === 'front' ? 'active' : ''}`}
                onClick={() => setActiveTab('front')}
              >
                Scan Depan
              </button>
            )}
            {hasBack && (
              <button
                className={`doc-view-tab ${activeTab === 'back' ? 'active' : ''}`}
                onClick={() => setActiveTab('back')}
              >
                Scan Belakang
              </button>
            )}
            {hasPdf && (
              <button
                className={`doc-view-tab ${activeTab === 'pdf' ? 'active' : ''}`}
                onClick={() => setActiveTab('pdf')}
              >
                Dokumen PDF
              </button>
            )}
          </div>

          {/* Tab: Info & Metadata */}
          {activeTab === 'info' && (
            <div className="doc-fields-table">
              {form.doc_number && (
                <div className="doc-info-row">
                  <span className="doc-info-label">{template.docNumberLabel || 'Nomor Identitas'}</span>
                  <div className="doc-info-val-wrap">
                    <strong className="font-mono">{form.doc_number}</strong>
                    <button
                      className="mini-icon"
                      onClick={() => copyText('num', form.doc_number)}
                      title="Salin"
                    >
                      {copiedKey === 'num' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {form.owner_name && (
                <div className="doc-info-row">
                  <span className="doc-info-label">Nama Pemilik</span>
                  <div className="doc-info-val-wrap">
                    <strong>{form.owner_name}</strong>
                    <button
                      className="mini-icon"
                      onClick={() => copyText('owner', form.owner_name)}
                      title="Salin"
                    >
                      {copiedKey === 'owner' ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {form.issue_date && (
                <div className="doc-info-row">
                  <span className="doc-info-label">Tanggal Terbit</span>
                  <span>{form.issue_date}</span>
                </div>
              )}

              <div className="doc-info-row">
                <span className="doc-info-label">Masa Berlaku</span>
                <div>
                  <span>{form.expiry_date || 'Seumur Hidup'}</span>
                  {expiryStatus && expiryStatus.status !== 'active' && expiryStatus.status !== 'lifetime' && (
                    <span className={`expiry-badge ${expiryStatus.status}`}>
                      {expiryStatus.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Fields */}
              {form.fields &&
                Object.entries(form.fields).map(([key, val]) => {
                  if (!val) return null
                  const fieldDef = template.fields?.find((f) => f.key === key)
                  const label = fieldDef?.label || key
                  return (
                    <div className="doc-info-row" key={key}>
                      <span className="doc-info-label">{label}</span>
                      <div className="doc-info-val-wrap">
                        <span>{val}</span>
                        <button
                          className="mini-icon"
                          onClick={() => copyText(key, val)}
                          title="Salin"
                        >
                          {copiedKey === key ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )
                })}

              {form.notes && (
                <div className="doc-info-row note-row">
                  <span className="doc-info-label">Catatan</span>
                  <p>{form.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Front Scan Viewer & Download */}
          {activeTab === 'front' && hasFront && (
            <div className="doc-attachment-viewer">
              <div className="viewer-toolbar">
                <span>{form.attachments.front.name} ({form.attachments.front.size})</span>
                <button
                  className="primary-button pill-button"
                  onClick={() => downloadAttachment(form.attachments.front, `${form.name}-depan.jpg`)}
                >
                  <Download size={14} /> Download File
                </button>
              </div>
              {isSafeImageDataUrl(form.attachments.front.data) ? (
                <img src={form.attachments.front.data} alt="Scan Depan" className="scan-full-image" />
              ) : (
                <p className="text-muted mt-sm">Pratinjau dinonaktifkan: berkas bukan gambar yang valid.</p>
              )}
            </div>
          )}

          {/* Tab: Back Scan Viewer & Download */}
          {activeTab === 'back' && hasBack && (
            <div className="doc-attachment-viewer">
              <div className="viewer-toolbar">
                <span>{form.attachments.back.name} ({form.attachments.back.size})</span>
                <button
                  className="primary-button pill-button"
                  onClick={() => downloadAttachment(form.attachments.back, `${form.name}-belakang.jpg`)}
                >
                  <Download size={14} /> Download File
                </button>
              </div>
              {isSafeImageDataUrl(form.attachments.back.data) ? (
                <img src={form.attachments.back.data} alt="Scan Belakang" className="scan-full-image" />
              ) : (
                <p className="text-muted mt-sm">Pratinjau dinonaktifkan: berkas bukan gambar yang valid.</p>
              )}
            </div>
          )}

          {/* Tab: PDF Viewer & Download */}
          {activeTab === 'pdf' && hasPdf && (
            <div className="doc-attachment-viewer">
              <div className="viewer-toolbar">
                <span>{form.attachments.pdf.name} ({form.attachments.pdf.size})</span>
                <button
                  className="primary-button pill-button"
                  onClick={() => downloadAttachment(form.attachments.pdf, `${form.name}.pdf`)}
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
              {isSafePdfDataUrl(form.attachments.pdf.data) ? (
                <iframe
                  src={form.attachments.pdf.data}
                  title="PDF Dokumen"
                  className="pdf-preview-frame"
                  sandbox=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <p className="text-muted mt-sm">
                  Pratinjau dinonaktifkan: berkas ini bukan PDF yang valid. Gunakan tombol unduh untuk memeriksanya secara lokal.
                </p>
              )}
            </div>
          )}

          {/* Download All Attachments Strip */}
          {(hasFront || hasBack || hasPdf) && (
            <div className="doc-download-all-strip">
              <span>Unduh Berkas Aman (Telah didekripsi):</span>
              <div className="download-buttons-group">
                {hasFront && (
                  <button
                    className="secondary-button pill-button"
                    onClick={() => downloadAttachment(form.attachments.front, `${form.name}-depan.jpg`)}
                  >
                    <FileDown size={13} /> Depan
                  </button>
                )}
                {hasBack && (
                  <button
                    className="secondary-button pill-button"
                    onClick={() => downloadAttachment(form.attachments.back, `${form.name}-belakang.jpg`)}
                  >
                    <FileDown size={13} /> Belakang
                  </button>
                )}
                {hasPdf && (
                  <button
                    className="secondary-button pill-button"
                    onClick={() => downloadAttachment(form.attachments.pdf, `${form.name}.pdf`)}
                  >
                    <FileDown size={13} /> PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Edit Form */
        <form onSubmit={handleSaveEdit} className="form-stack">
          <label className="field">
            <span>Nama Dokumen</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label className="field">
            <span>Nama Pemilik</span>
            <input
              type="text"
              value={form.owner_name || ''}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            />
          </label>

          <label className="field">
            <span>Nomor Identitas</span>
            <input
              type="text"
              value={form.doc_number || ''}
              onChange={(e) => setForm({ ...form, doc_number: e.target.value })}
            />
          </label>

          <div className="detail-grid">
            <label className="field">
              <span>Tanggal Terbit</span>
              <input
                type="date"
                value={form.issue_date || ''}
                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
              />
            </label>

            <label className="field">
              <span>Berlaku Sampai</span>
              <input
                type="text"
                value={form.expiry_date || ''}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />
            </label>
          </div>

          <label className="field span-2">
            <span>Catatan</span>
            <textarea
              rows={3}
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button pill-button"
              onClick={() => setIsEditing(false)}
            >
              {t('action_cancel')}
            </button>
            <button type="submit" className="primary-button pill-button">
              {t('action_save')}
            </button>
          </div>
        </form>
      )}

      {showDeleteConfirm && (
        <ConfirmToast
          message={
            lang === 'id'
              ? `Hapus dokumen "${form.name}" secara permanen?`
              : `Permanently delete document "${form.name}"?`
          }
          confirmLabel={t('action_delete')}
          cancelLabel={t('action_cancel')}
          onConfirm={() => {
            setShowDeleteConfirm(false)
            onDelete(item.id)
            onClose()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          lang={lang}
        />
      )}
    </Modal>
  )
}
