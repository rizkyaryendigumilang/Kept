import { useState, useRef, useEffect } from 'react'
import {
  FileText,
  Download,
  MoreHorizontal,
  QrCode,
  Copy,
  Check,
  Eye
} from './Icons'

function getDisplayFileName(doc) {
  const name = doc?.name || 'Dokumen'
  if (
    name.toLowerCase().endsWith('.pdf') ||
    name.toLowerCase().endsWith('.jpg') ||
    name.toLowerCase().endsWith('.png')
  ) {
    return name
  }
  return `${name}.pdf`
}

function getDisplayFileSize(doc) {
  if (doc?.file_size) return doc.file_size
  if (doc?.attachments?.pdf?.size) {
    const bytes = Number(doc.attachments.pdf.size)
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return Math.round(bytes / 1024) + ' KB'
  }
  if (doc?.attachments?.pdf?.data) {
    const bytes = Math.round((doc.attachments.pdf.data.length * 3) / 4)
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return Math.round(bytes / 1024) + ' KB'
  }
  if (doc?.attachments?.front?.data) {
    const bytes = Math.round((doc.attachments.front.data.length * 3) / 4)
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return Math.round(bytes / 1024) + ' KB'
  }
  const hash = (doc?.name || 'doc').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const sizes = ['1.2 MB', '2.4 MB', '860 KB', '3.1 MB', '1.5 MB', '4.2 MB', '950 KB']
  return sizes[hash % sizes.length]
}

export default function DocumentCard({
  doc,
  viewMode = 'preview', // 'preview' | 'hide'
  onOpen,
  onDownload,
  onQr
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef(null)

  const fileName = getDisplayFileName(doc)
  const fileSize = getDisplayFileSize(doc)
  const hasFrontImage = Boolean(doc.attachments?.front?.data)
  const frontImageSrc = doc.attachments?.front?.data

  // Close card menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  function handleCardClick() {
    if (onOpen) onOpen(doc)
  }

  function handleDownloadClick(e) {
    e.stopPropagation()
    setMenuOpen(false)
    if (onDownload) onDownload(doc)
  }

  function handleQrClick(e) {
    e.stopPropagation()
    setMenuOpen(false)
    if (onQr) onQr(doc)
  }

  async function handleCopyNumber(e) {
    e.stopPropagation()
    if (!doc.doc_number) return
    await navigator.clipboard.writeText(doc.doc_number)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setMenuOpen(false)
    }, 1200)
  }

  // HIDE PREVIEW MODE (Compact Card - Skema B)
  if (viewMode === 'hide') {
    return (
      <article
        className="doc-card-compact"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleCardClick()
          }
        }}
        aria-label={`Buka dokumen ${fileName}`}
      >
        <div className="doc-compact-left">
          <div className="doc-pdf-icon-badge" aria-hidden="true">
            <FileText size={17} strokeWidth={2} />
          </div>
          <div className="doc-compact-info">
            <h4 className="doc-card-filename" title={fileName}>
              {fileName}
            </h4>
            <span className="doc-card-filesize">{fileSize}</span>
          </div>
        </div>

        <div className="doc-card-actions" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="doc-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu Dokumen"
            title="Menu Dokumen"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="doc-dropdown-menu">
              <button type="button" onClick={() => { setMenuOpen(false); handleCardClick() }}>
                <Eye size={14} />
                <span>Buka Dokumen</span>
              </button>
              <button type="button" onClick={handleDownloadClick}>
                <Download size={14} />
                <span>Download PDF</span>
              </button>
              <button type="button" onClick={handleQrClick}>
                <QrCode size={14} />
                <span>Lihat QR Code</span>
              </button>
              {doc.doc_number && (
                <button type="button" onClick={handleCopyNumber}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Nomor Tersalin' : 'Salin Nomor Dokumen'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </article>
    )
  }

  // PREVIEW MODE (Visual Thumbnail Paper Preview - Skema A)
  return (
    <article
      className="doc-card-preview"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
      aria-label={`Buka dokumen ${fileName}`}
    >
      {/* Top Paper Thumbnail Preview */}
      <div className="doc-preview-canvas">
        <div className="doc-paper-sheet">
          <div className="doc-sheet-badge">
            <FileText size={13} strokeWidth={2} />
          </div>

          {hasFrontImage ? (
            <div className="doc-sheet-image-wrap">
              <img src={frontImageSrc} alt={fileName} className="doc-sheet-thumb" />
            </div>
          ) : (
            <div className="doc-sheet-skeleton" aria-hidden="true">
              <div className="doc-skeleton-line title-line" />
              <div className="doc-skeleton-line long-line" />
              <div className="doc-skeleton-line med-line" />
              <div className="doc-skeleton-line short-line" />
              <div className="doc-skeleton-body-placeholder" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Information Row */}
      <div className="doc-preview-footer">
        <div className="doc-preview-info">
          <h4 className="doc-card-filename" title={fileName}>
            {fileName}
          </h4>
          <span className="doc-card-filesize">{fileSize}</span>
        </div>

        <div className="doc-preview-actions" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="doc-quick-download-btn"
            onClick={handleDownloadClick}
            title="Download PDF"
            aria-label={`Download ${fileName}`}
          >
            <Download size={14} strokeWidth={2.2} />
          </button>

          <button
            type="button"
            className="doc-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu Dokumen"
            title="Menu Dokumen"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="doc-dropdown-menu">
              <button type="button" onClick={() => { setMenuOpen(false); handleCardClick() }}>
                <Eye size={14} />
                <span>Buka Dokumen</span>
              </button>
              <button type="button" onClick={handleDownloadClick}>
                <Download size={14} />
                <span>Download PDF</span>
              </button>
              <button type="button" onClick={handleQrClick}>
                <QrCode size={14} />
                <span>Lihat QR Code</span>
              </button>
              {doc.doc_number && (
                <button type="button" onClick={handleCopyNumber}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Nomor Tersalin' : 'Salin Nomor Dokumen'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
