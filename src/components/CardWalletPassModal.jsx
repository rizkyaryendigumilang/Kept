import { useState } from 'react'
import { X, WalletCards, Download, Copy, Check, ExternalLink, ShieldCheck, QrCode, RotateCcw, AlertTriangle } from './Icons'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'
import { copyToClipboardSecure } from '../lib/clipboard'
import { generateApplePassJson, buildPkpassBundle, triggerFileDownload } from '../lib/walletPass'

export default function CardWalletPassModal({
  card,
  onClose,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)

  const [isFlipped, setIsFlipped] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)
  const [activeTab, setActiveTab] = useState('apple') // 'apple' | 'google'

  if (!card) return null

  const passJson = generateApplePassJson(card)
  const cardColor = card.color || '#0056b3'
  const barcodeValue = card.barcode_value || card.card_number || card.nfc_uid || '12345678'
  const isQr = card.barcode_type === 'qr' || barcodeValue.length > 20

  const handleDownloadPkpass = async () => {
    try {
      setIsDownloading(true)
      haptic('light')

      const bundle = await buildPkpassBundle(passJson)
      const cleanName = (card.name || card.bank_name || 'pass')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
      
      triggerFileDownload(`${cleanName}.pkpass`, bundle, 'application/vnd.apple.pkpass')

      haptic('success')
      setIsDownloading(false)
    } catch (err) {
      setIsDownloading(false)
      haptic('error')
    }
  }

  const handleCopyJson = async () => {
    try {
      await copyToClipboardSecure(JSON.stringify(passJson, null, 2), {
        label: 'Apple PassKit JSON',
        timeoutSec: 60,
        lang
      })
      setCopiedJson(true)
      haptic('success')
      setTimeout(() => setCopiedJson(false), 1400)
    } catch {
      // ignore
    }
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section
        className="card-wallet-pass-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Digital Wallet Pass"
      >
        {/* Header */}
        <div className="card-wallet-pass-header">
          <div className="card-wallet-pass-title-wrap">
            <div className="wallet-pass-icon-chip">
              <WalletCards size={18} />
            </div>
            <div>
              <h3>{lang === 'id' ? 'Digital Wallet Pass' : 'Digital Wallet Pass'}</h3>
              <span className="wallet-pass-subtitle">
                {card.name || card.bank_name || 'Digital Card'}
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

        {/* Platform Tabs: Apple Wallet vs Google Wallet */}
        <div className="wallet-platform-tabs">
          <button
            type="button"
            className={`wallet-tab-btn ${activeTab === 'apple' ? 'active' : ''}`}
            onClick={() => {
              haptic('light')
              setActiveTab('apple')
            }}
          >
            <strong>Apple Wallet (.pkpass)</strong>
          </button>
          <button
            type="button"
            className={`wallet-tab-btn ${activeTab === 'google' ? 'active' : ''}`}
            onClick={() => {
              haptic('light')
              setActiveTab('google')
            }}
          >
            <strong>Google Wallet / Android</strong>
          </button>
        </div>

        {/* Apple Wallet Mode */}
        {activeTab === 'apple' && (
          <div className="wallet-pass-body">
            {/* Interactive Apple Wallet Pass 3D Card Preview */}
            <div className="apple-pass-perspective-container">
              <div
                className={`apple-pass-visual-card ${isFlipped ? 'is-flipped' : ''}`}
                style={{ '--card-bg': cardColor }}
              >
                {/* Front Side of Pass */}
                <div className="apple-pass-side apple-pass-front" style={{ background: cardColor }}>
                  <div className="apple-pass-top-row">
                    <span className="apple-pass-type-badge">
                      {(card.category || 'CARD').toUpperCase()}
                    </span>
                    <span className="apple-pass-logo-text">
                      {card.bank_name || card.card_brand || 'KEPT'}
                    </span>
                  </div>

                  <div className="apple-pass-primary-row">
                    <div>
                      <span className="apple-pass-micro-label">CARD NAME</span>
                      <h4 className="apple-pass-primary-text">{card.name || card.bank_name}</h4>
                    </div>
                  </div>

                  <div className="apple-pass-secondary-row">
                    <div>
                      <span className="apple-pass-micro-label">CARD HOLDER</span>
                      <strong>{card.account_owner || 'VAULT MEMBER'}</strong>
                    </div>
                    <div>
                      <span className="apple-pass-micro-label">IDENTIFIER</span>
                      <strong className="font-mono">
                        {card.nfc_uid ? `UID: ${card.nfc_uid}` : (card.card_number || '••••')}
                      </strong>
                    </div>
                  </div>

                  {/* Pass Barcode Strip */}
                  <div className="apple-pass-barcode-section">
                    <div className="apple-pass-barcode-box">
                      <QrCode size={isQr ? 44 : 28} className="text-dark" />
                      <span className="apple-pass-barcode-alt font-mono">{barcodeValue}</span>
                    </div>
                  </div>
                </div>

                {/* Back Side of Pass */}
                <div className="apple-pass-side apple-pass-back">
                  <div className="apple-pass-back-inner">
                    <h4 className="apple-pass-back-title">Informasi & Keamanan Pass</h4>
                    <div className="apple-pass-back-field">
                      <span>ID Pass</span>
                      <code>pass.com.kept.vault.{card.id || '01'}</code>
                    </div>
                    <div className="apple-pass-back-field">
                      <span>Masa Berlaku</span>
                      <strong>{card.expiry || 'Tanpa Batas'}</strong>
                    </div>
                    <div className="apple-pass-back-field">
                      <span>NFC Token</span>
                      <strong>{card.nfc_uid ? `Sinyal VAS: ${card.nfc_uid}` : 'Belum Dipindai'}</strong>
                    </div>
                    <p className="apple-pass-back-notes">
                      {card.notes || 'Disimpan secara aman dalam brankas digital Kept.'}
                    </p>
                  </div>
                </div>

                {/* Flip Button */}
                <button
                  type="button"
                  className="apple-pass-flip-btn"
                  onClick={() => {
                    haptic('medium')
                    setIsFlipped((v) => !v)
                  }}
                  title={isFlipped ? 'Lihat Sisi Depan' : 'Lihat Info Belakang (Flip)'}
                  aria-label="Balik Kartu"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="wallet-pass-actions">
              <button
                type="button"
                className="primary-button pill-button flex-1"
                onClick={handleDownloadPkpass}
                disabled={isDownloading}
              >
                <Download size={16} />
                <span>
                  {isDownloading 
                    ? (lang === 'id' ? 'Menyiapkan .pkpass...' : 'Packaging .pkpass...') 
                    : (lang === 'id' ? 'Unduh File .pkpass' : 'Download .pkpass')}
                </span>
              </button>

              <button
                type="button"
                className="secondary-button pill-button"
                onClick={handleCopyJson}
                title="Salin Struktur pass.json"
              >
                {copiedJson ? <Check size={14} /> : <Copy size={14} />}
                <span>JSON</span>
              </button>
            </div>

            {/* Compliance & Verification Notice */}
            <div className="wallet-pass-notice">
              <ShieldCheck size={15} />
              <p>
                {lang === 'id'
                  ? 'File .pkpass ini dikemas sesuai spesifikasi Apple PassKit. Pada Android dapat dibuka dengan aplikasi "PassAndroid" atau "WalletPasses". Pada iPhone, pendaftaran ke Apple Wallet memerlukan sertifikat pengembang Apple.'
                  : 'This .pkpass file conforms to Apple PassKit specifications. On Android, it opens with "PassAndroid" or "WalletPasses". On iOS, native Apple Wallet signing requires an Apple Developer certificate.'}
              </p>
            </div>
          </div>
        )}

        {/* Google Wallet Mode */}
        {activeTab === 'google' && (
          <div className="wallet-pass-body">
            <div className="google-wallet-info-card">
              <div className="google-wallet-header-row">
                <div className="google-wallet-icon-badge">G</div>
                <div>
                  <h4>Google Wallet Pass Integration</h4>
                  <span className="text-xs text-muted">Format Generic Pass Google Pay API</span>
                </div>
              </div>

              <p className="text-sm mt-sm">
                {lang === 'id'
                  ? 'Kept mendukung struktur format pass Google Wallet untuk kartu keanggotaan, kartu akses kantor, dan voucher dengan barcode dinamis.'
                  : 'Kept supports standard Google Wallet generic pass objects for membership, access passes, and vouchers.'}
              </p>

              <div className="google-pass-fields-list">
                <div className="google-field-item">
                  <span className="field-label">Header:</span>
                  <strong>{card.name || card.bank_name}</strong>
                </div>
                <div className="google-field-item">
                  <span className="field-label">Barcode Value:</span>
                  <code className="font-mono text-xs">{barcodeValue}</code>
                </div>
                <div className="google-field-item">
                  <span className="field-label">Smart Tap / NFC:</span>
                  <span>{card.nfc_uid ? `UID ${card.nfc_uid}` : 'Standard Display'}</span>
                </div>
              </div>

              <div className="google-wallet-action-row">
                <button
                  type="button"
                  className="primary-button pill-button flex-1"
                  onClick={handleCopyJson}
                >
                  {copiedJson ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedJson ? 'Payload Tersalin' : 'Salin Payload Wallet Object'}</span>
                </button>
              </div>
            </div>

            <div className="wallet-pass-notice">
              <AlertTriangle size={15} />
              <p>
                {lang === 'id'
                  ? 'Untuk menautkan tombol "Add to Google Wallet" di web publik, Anda dapat mendaftarkan Google Cloud Issuer ID pada Google Pay & Wallet Console.'
                  : 'To link "Add to Google Wallet" publicly, register an Issuer ID on Google Pay & Wallet Console.'}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
