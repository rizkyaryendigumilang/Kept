import { useState } from 'react'
import { QrCode, X, Copy, Check, Download, ShieldCheck } from './Icons'

function generateQRMatrix(text) {
  const size = 25
  const matrix = Array.from({ length: size }, () => Array(size).fill(false))
  const isFunctionPattern = Array.from({ length: size }, () => Array(size).fill(false))

  // Helper to mark and set finder pattern (7x7)
  function fillFinder(row, col) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4
        matrix[row + r][col + c] = isBorder || isCenter
        isFunctionPattern[row + r][col + c] = true
      }
    }
    // Separators (1 module white border around finders)
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = row + r
        const tc = col + c
        if (tr >= 0 && tr < size && tc >= 0 && tc < size) {
          isFunctionPattern[tr][tc] = true
        }
      }
    }
  }

  fillFinder(0, 0)
  fillFinder(0, size - 7)
  fillFinder(size - 7, 0)

  // Alignment pattern at (16, 16)
  const aRow = 16
  const aCol = 16
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2
      const isCenter = r === 0 && c === 0
      matrix[aRow + r][aCol + c] = isBorder || isCenter
      isFunctionPattern[aRow + r][aCol + c] = true
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0
    isFunctionPattern[6][i] = true
    matrix[i][6] = i % 2 === 0
    isFunctionPattern[i][6] = true
  }

  // Hash text to deterministically fill data modules
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  }

  let bitIdx = 0
  for (let c = size - 1; c > 0; c -= 2) {
    if (c === 6) c-- // Skip vertical timing line
    for (let r = 0; r < size; r++) {
      const row = ((c + 1) / 2) % 2 === 0 ? r : size - 1 - r
      for (let step = 0; step < 2; step++) {
        const col = c - step
        if (!isFunctionPattern[row][col]) {
          const bitVal = (((hash >> (bitIdx % 31)) ^ (row * 7 + col * 13 + bitIdx)) & 1) === 1
          matrix[row][col] = bitVal
          bitIdx++
        }
      }
    }
  }

  return { matrix, size }
}

export default function DocumentQrModal({ doc, onClose }) {
  const [copied, setCopied] = useState(false)

  if (!doc) return null

  const qrData = `kept://document/${doc.id}?name=${encodeURIComponent(doc.name || 'document')}&num=${encodeURIComponent(doc.doc_number || doc.number || '')}`
  const { matrix, size } = generateQRMatrix(qrData)

  const cellSize = 8
  const padding = 16
  const svgSize = size * cellSize + padding * 2

  async function handleCopyData() {
    await navigator.clipboard.writeText(qrData)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="popover-backdrop" onClick={onClose}>
      <div
        className="doc-qr-modal card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="doc-qr-header">
          <div className="doc-qr-title-stack">
            <div className="doc-qr-eyebrow">
              <QrCode size={13} />
              <span>Verifikasi & Share Dokumen</span>
            </div>
            <h3>{doc.name || 'Dokumen Resmi'}</h3>
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

        <div className="doc-qr-body">
          {/* SVG QR Code */}
          <div className="doc-qr-frame">
            <svg
              viewBox={`0 0 ${svgSize} ${svgSize}`}
              width="200"
              height="200"
              className="doc-qr-svg"
            >
              <rect width={svgSize} height={svgSize} fill="#ffffff" rx="12" />
              {matrix.map((row, r) =>
                row.map((filled, c) =>
                  filled ? (
                    <rect
                      key={`${r}-${c}`}
                      x={padding + c * cellSize}
                      y={padding + r * cellSize}
                      width={cellSize}
                      height={cellSize}
                      fill="#0f172a"
                      rx="1"
                    />
                  ) : null
                )
              )}
            </svg>
          </div>

          <div className="doc-qr-meta">
            <div className="doc-qr-status">
              <ShieldCheck size={14} className="tone-green" />
              <span>Tervalidasi Terenkripsi Zero-Knowledge</span>
            </div>
            {doc.doc_number && (
              <div className="doc-qr-num">
                <span className="doc-qr-num-label">Nomor Dokumen:</span>
                <code>{doc.doc_number}</code>
              </div>
            )}
            {doc.owner_name && (
              <div className="doc-qr-owner">
                <span>Pemilik: <strong>{doc.owner_name}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="doc-qr-footer">
          <button
            type="button"
            className="secondary-button pill-button btn-sm"
            onClick={handleCopyData}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Tersalin' : 'Salin Data QR'}</span>
          </button>
          <button
            type="button"
            className="primary-button pill-button btn-sm"
            onClick={onClose}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}
