import { useState } from 'react'
import { X, Copy, Check, QrCode, ScanLine, Sun, ShieldCheck } from './Icons'
import { generateBarcodeSvg } from '../lib/cards'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

function generateQRMatrix(text) {
  const size = 25
  const matrix = Array.from({ length: size }, () => Array(size).fill(false))
  const isFunctionPattern = Array.from({ length: size }, () => Array(size).fill(false))

  function fillFinder(row, col) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4
        matrix[row + r][col + c] = isBorder || isCenter
        isFunctionPattern[row + r][col + c] = true
      }
    }
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

  // Alignment pattern
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

  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunctionPattern[r][c]) {
        const bit = ((hash ^ (r * 31 + c * 17)) >>> (r % 16)) & 1
        matrix[r][c] = bit === 1
      }
    }
  }

  return matrix
}

export default function CardBarcodeModal({ card, onClose, lang = 'id' }) {
  const [copied, setCopied] = useState(false)
  const t = (k) => getTranslation(k, lang)

  if (!card) return null

  // Value can be card's barcode_value, or fallback to card_number / id
  const codeValue = card.barcode_value || card.card_number || card.account_number || card.id
  const isQr = card.barcode_type === 'qr' || (card.barcode_value && card.barcode_value.length > 28)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeValue)
      setCopied(true)
      haptic('success')
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // ignore clipboard error
    }
  }

  return (
    <div className="sheet-backdrop high-contrast-modal" onMouseDown={onClose}>
      <section
        className="card-barcode-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('card_show_barcode')}
      >
        <div className="card-barcode-header">
          <div className="card-barcode-info">
            <span className="card-barcode-issuer">{card.bank_name || card.issuer || 'My Cards'}</span>
            <h3>{card.name || 'Kartu'}</h3>
          </div>
          <button
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

        <div className="brightness-tip-banner">
          <Sun size={15} className="brightness-icon" />
          <span>{t('card_screen_brightness_tip')}</span>
        </div>

        <div className="card-barcode-canvas-container">
          {isQr ? (
            <div className="qr-code-svg-wrap">
              <svg
                viewBox="0 0 29 29"
                width="100%"
                height="100%"
                className="qr-render-svg"
                shapeRendering="crispEdges"
              >
                <rect width="29" height="29" fill="#ffffff" />
                {generateQRMatrix(codeValue).map((row, r) =>
                  row.map((cell, c) =>
                    cell ? (
                      <rect
                        key={`${r}-${c}`}
                        x={c + 2}
                        y={r + 2}
                        width="1"
                        height="1"
                        fill="#000000"
                      />
                    ) : null
                  )
                )}
              </svg>
            </div>
          ) : (
            <div
              className="barcode-svg-wrap"
              dangerouslySetInnerHTML={{
                __html: generateBarcodeSvg(codeValue)
              }}
            />
          )}
        </div>

        <div className="card-barcode-footer">
          <div className="card-code-display">
            <span className="code-label">{isQr ? 'QR CODE' : 'BARCODE'}</span>
            <span className="code-value">{codeValue}</span>
          </div>

          <div className="card-barcode-actions">
            <button className="secondary-button pill-button" onClick={copyCode}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? t('card_number_copied') : t('card_copy_number')}</span>
            </button>
          </div>

          <p className="card-barcode-helper-text">
            <ScanLine size={14} />
            <span>{t('card_barcode_helper')}</span>
          </p>
        </div>
      </section>
    </div>
  )
}
