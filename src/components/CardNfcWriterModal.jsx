import { useState, useEffect, useRef } from 'react'
import { X, Radio, Check, Copy, AlertTriangle, RefreshCw, Cpu, Layers, ExternalLink, ShieldCheck } from './Icons'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'
import { copyToClipboardSecure } from '../lib/clipboard'

export default function CardNfcWriterModal({
  card,
  onClose,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)

  const [payloadType, setPayloadType] = useState('text_uid')
  const [isWriting, setIsWriting] = useState(false)
  const [writeSuccess, setWriteSuccess] = useState(false)
  const [hardwareSupported, setHardwareSupported] = useState(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copiedPayload, setCopiedPayload] = useState(false)

  const abortControllerRef = useRef(null)

  // Compute actual payload based on selection
  const rawIdentifier = card?.nfc_uid || card?.card_number || card?.account_number || card?.barcode_value || 'KEPT-ACC-01'
  
  const getPayloadData = () => {
    switch (payloadType) {
      case 'text_uid':
        return {
          type: 'text',
          records: [{ recordType: 'text', data: rawIdentifier }],
          display: rawIdentifier,
          summary: lang === 'id' ? 'Nomor Identitas / UID teks untuk pembaca smart lock atau scanner' : 'Text UID / ID for smart locks or scanner readers'
        }
      case 'web_url': {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kept.app'
        const url = `${origin}/#pass?c=${encodeURIComponent(card?.id || 'card')}&u=${encodeURIComponent(rawIdentifier)}`
        return {
          type: 'url',
          records: [{ recordType: 'url', data: url }],
          display: url,
          summary: lang === 'id' ? 'Link otomatis yang langsung terbuka saat stiker di-tap ke ponsel manapun' : 'Direct URL link that opens when tapped by any smartphone'
        }
      }
      case 'smart_token': {
        const tokenObj = {
          app: 'Kept',
          version: '1.0',
          id: card?.id || 'pass',
          name: card?.name || card?.bank_name || 'Card Pass',
          uid: rawIdentifier,
          t: Math.floor(Date.now() / 1000)
        }
        const jsonStr = JSON.stringify(tokenObj)
        return {
          type: 'json',
          records: [{ recordType: 'mime', mediaType: 'application/json', data: new TextEncoder().encode(jsonStr) }],
          display: jsonStr,
          summary: lang === 'id' ? 'Format JSON terstruktur untuk sistem IoT kantor / mikrokontroler ESP32' : 'Structured JSON format for office IoT / microcontroller smart readers'
        }
      }
      default:
        return {
          type: 'text',
          records: [{ recordType: 'text', data: rawIdentifier }],
          display: rawIdentifier,
          summary: 'NDEF Text Record'
        }
    }
  }

  const payload = getPayloadData()

  // Detect Web NFC support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('NDEFReader' in window)) {
      setHardwareSupported(false)
    }
  }, [])

  // Start real NFC write
  const handleStartWrite = async () => {
    if (typeof window === 'undefined') return
    setErrorMsg('')
    setWriteSuccess(false)

    if (!('NDEFReader' in window)) {
      setHardwareSupported(false)
      setErrorMsg(lang === 'id' 
        ? 'Browser ini belum mendukung Web NFC write langsung (gunakan Chrome Android atau lakukan Uji Simulasi).' 
        : 'Web NFC write is not supported in this browser (use Chrome Android or run Test Simulation).'
      )
      return
    }

    try {
      setIsWriting(true)
      setStatusMessage(lang === 'id' ? 'Tempelkan stiker/kartu NFC kosong ke bagian belakang ponsel...' : 'Hold blank NFC tag / sticker to the back of device...')
      haptic('light')

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const controller = new AbortController()
      abortControllerRef.current = controller

      const ndef = new window.NDEFReader()
      await ndef.write(
        { records: payload.records },
        { signal: controller.signal, overwrite: true }
      )

      // Write succeeded
      haptic('success')
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40])
      }
      setIsWriting(false)
      setWriteSuccess(true)
      setStatusMessage(lang === 'id' ? 'Data berhasil ditulis ke stiker NFC!' : 'Data successfully written to NFC tag!')
    } catch (err) {
      setIsWriting(false)
      if (err.name === 'AbortError') {
        setStatusMessage(lang === 'id' ? 'Penulisan dibatalkan.' : 'Write operation cancelled.')
      } else {
        haptic('error')
        setErrorMsg(err.message || (lang === 'id' ? 'Gagal menulis ke tag NFC. Pastikan tag tidak terkunci (read-only).' : 'Failed to write NFC tag. Ensure tag is not locked.'))
      }
    }
  }

  // Simulate NFC write for testing on any device
  const handleSimulateWrite = () => {
    setErrorMsg('')
    setIsWriting(true)
    setStatusMessage(lang === 'id' ? 'Simulasi: Mendeteksi tag NTAG215 kosong...' : 'Simulating: Detecting blank NTAG215 tag...')
    haptic('light')

    setTimeout(() => {
      setStatusMessage(lang === 'id' ? 'Simulasi: Menulis payload NDEF ke sektor memori...' : 'Simulating: Writing NDEF payload to tag memory...')
      haptic('medium')

      setTimeout(() => {
        setIsWriting(false)
        setWriteSuccess(true)
        setStatusMessage(lang === 'id' ? 'Simulasi Berhasil: Tag NTAG215 siap digunakan!' : 'Simulation Succeeded: NTAG215 tag is ready to use!')
        haptic('success')
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([30, 40])
        }
      }, 700)
    }, 800)
  }

  const handleCancelWrite = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsWriting(false)
    setStatusMessage('')
  }

  const handleCopyPayload = async () => {
    try {
      await copyToClipboardSecure(payload.display, {
        label: 'Payload NDEF',
        timeoutSec: 60,
        lang
      })
      setCopiedPayload(true)
      haptic('success')
      setTimeout(() => setCopiedPayload(false), 1400)
    } catch {
      // ignore
    }
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section
        className="card-nfc-dialog nfc-writer-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Penulis Tag NFC"
      >
        {/* Header */}
        <div className="card-nfc-header">
          <div className="card-nfc-title-wrap">
            <div className="nfc-icon-chip writer">
              <Cpu size={18} />
            </div>
            <div>
              <h3>{lang === 'id' ? 'Penulis Tag NFC (Stiker/Koin)' : 'NFC Tag Writer (Sticker/Fob)'}</h3>
              <span className="nfc-subtitle">
                {card?.name || card?.bank_name || 'Kartu Vault'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={() => {
              haptic('light')
              handleCancelWrite()
              onClose()
            }}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Payload Format Selector */}
        <div className="nfc-writer-content">
          <div className="nfc-format-selector-row">
            <span className="micro-label">
              {lang === 'id' ? 'PILIH FORMAT DATA UNTUK STIKER' : 'SELECT STICKER DATA FORMAT'}
            </span>
            <div className="nfc-format-pills">
              <button
                type="button"
                className={`format-pill-btn ${payloadType === 'text_uid' ? 'active' : ''}`}
                onClick={() => {
                  haptic('light')
                  setPayloadType('text_uid')
                  setWriteSuccess(false)
                }}
              >
                <strong>UID / Text</strong>
                <span className="text-xs">Smart Lock / Scanner</span>
              </button>

              <button
                type="button"
                className={`format-pill-btn ${payloadType === 'web_url' ? 'active' : ''}`}
                onClick={() => {
                  haptic('light')
                  setPayloadType('web_url')
                  setWriteSuccess(false)
                }}
              >
                <strong>Web Pass URL</strong>
                <span className="text-xs">Tap to Open Link</span>
              </button>

              <button
                type="button"
                className={`format-pill-btn ${payloadType === 'smart_token' ? 'active' : ''}`}
                onClick={() => {
                  haptic('light')
                  setPayloadType('smart_token')
                  setWriteSuccess(false)
                }}
              >
                <strong>JSON Token</strong>
                <span className="text-xs">IoT / Microcontroller</span>
              </button>

              <button
                type="button"
                className={`format-pill-btn ${payloadType === 'cuid_guide' ? 'active' : ''}`}
                onClick={() => {
                  haptic('light')
                  setPayloadType('cuid_guide')
                  setWriteSuccess(false)
                }}
              >
                <strong>Magic CUID</strong>
                <span className="text-xs">Apartemen / Gate</span>
              </button>
            </div>
          </div>

          {/* CUID Guide View */}
          {payloadType === 'cuid_guide' ? (
            <div className="cuid-guide-box">
              <div className="cuid-guide-header">
                <ShieldCheck size={18} className="text-accent" />
                <h4>{lang === 'id' ? 'Panduan Khusus: Kartu Akses Apartemen / Lift' : 'Guide: Apartment / Lift Access Cards'}</h4>
              </div>
              <p>
                {lang === 'id'
                  ? 'Sebagian besar mesin pembaca lift apartemen lama (Mifare Classic 1K) hanya membaca UID fisik di Sektor 0. Stiker NTAG213/215 biasa memiliki Sektor 0 terkunci permanen oleh pabrik.'
                  : 'Most older building / elevator readers (Mifare Classic 1K) only inspect physical UID in Sector 0. Standard NTAG213/215 stickers have Sector 0 permanently locked at factory.'}
              </p>
              <div className="cuid-instruction-steps">
                <div className="cuid-step-item">
                  <span className="cuid-step-badge">1</span>
                  <span>
                    {lang === 'id' 
                      ? 'Gunakan stiker / koin tipe "CUID / Gen2 Magic UID" (banyak dijual di marketplace mulai Rp3.000).' 
                      : 'Use "CUID / Gen2 Magic UID" tags (available online starting ~$0.50).'}
                  </span>
                </div>
                <div className="cuid-step-item">
                  <span className="cuid-step-badge">2</span>
                  <span>
                    {lang === 'id' 
                      ? 'Salin UID kartu Anda di Kept:' 
                      : 'Copy your card UID from Kept:'}
                    <code className="cuid-inline-code">{rawIdentifier}</code>
                  </span>
                </div>
                <div className="cuid-step-item">
                  <span className="cuid-step-badge">3</span>
                  <span>
                    {lang === 'id'
                      ? 'Gunakan fitur "Set UID" pada aplikasi CUID Writer (atau alat seperti Flipper Zero / Proxmark) untuk menanamkan UID ini ke Sektor 0 stiker CUID.'
                      : 'Use "Set UID" on a CUID writer app (or Flipper Zero / Proxmark) to write this UID to Sector 0.'}
                  </span>
                </div>
              </div>
              <div className="cuid-action-row">
                <button
                  type="button"
                  className="primary-button pill-button flex-1"
                  onClick={handleCopyPayload}
                >
                  {copiedPayload ? <Check size={15} /> : <Copy size={15} />}
                  <span>{copiedPayload ? (lang === 'id' ? 'UID Tersalin!' : 'UID Copied!') : (lang === 'id' ? 'Salin UID untuk CUID' : 'Copy UID for CUID')}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Payload Preview Card */}
              <div className="nfc-payload-card">
                <div className="payload-meta-row">
                  <span className="field-label">{lang === 'id' ? 'Data yang Akan Ditulis' : 'Payload to Write'}</span>
                  <button
                    type="button"
                    className="icon-button-subtle"
                    onClick={handleCopyPayload}
                    title="Salin Payload"
                  >
                    {copiedPayload ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="payload-display-wrap">
                  <code className="font-mono payload-code-text">{payload.display}</code>
                </div>
                <p className="payload-summary-text">{payload.summary}</p>
              </div>

              {/* Status Graphic & Radar Pulse */}
              <div className="nfc-writer-radar-area">
                <div className={`nfc-radar-wrap ${isWriting ? 'active-writing' : writeSuccess ? 'write-success' : ''}`}>
                  <div className="nfc-radar-pulse pulse-1" />
                  <div className="nfc-radar-pulse pulse-2" />
                  <div className="nfc-device-beacon">
                    {writeSuccess ? (
                      <Check size={32} className="text-emerald" />
                    ) : (
                      <Cpu size={32} className={isWriting ? 'animate-pulse text-accent' : ''} />
                    )}
                  </div>
                </div>

                <div className="nfc-writer-status-info">
                  {writeSuccess ? (
                    <div className="text-center">
                      <h4 className="text-emerald font-bold">{lang === 'id' ? 'Stiker Berhasil Ditulis' : 'Tag Successfully Written'}</h4>
                      <p className="text-sm text-muted mt-xs">
                        {statusMessage || (lang === 'id' ? 'Stiker NFC sekarang siap ditempel atau di-tap ke pembaca.' : 'NFC tag is ready to be tapped on readers.')}
                      </p>
                    </div>
                  ) : isWriting ? (
                    <div className="text-center">
                      <h4 className="text-accent font-bold animate-pulse">{lang === 'id' ? 'Sedang Menulis...' : 'Writing Data...'}</h4>
                      <p className="text-sm mt-xs">{statusMessage}</p>
                      <button
                        type="button"
                        className="secondary-button pill-button text-xs mt-sm"
                        onClick={handleCancelWrite}
                      >
                        {lang === 'id' ? 'Batalkan' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <h4>{lang === 'id' ? 'Siapkan Stiker NFC Kosong' : 'Ready for Blank NFC Tag'}</h4>
                      <p className="text-sm text-muted mt-xs">
                        {lang === 'id'
                          ? 'Dukung stiker NTAG213, NTAG215, NTAG216, koin amiibo, atau gantungan kunci NFC.'
                          : 'Compatible with NTAG213, NTAG215, NTAG216, amiibo tokens, or NFC keyfobs.'}
                      </p>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="nfc-error-alert mt-sm">
                      <AlertTriangle size={15} />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="nfc-writer-actions">
                <button
                  type="button"
                  className="primary-button pill-button flex-1"
                  onClick={handleStartWrite}
                  disabled={isWriting}
                >
                  <Cpu size={16} />
                  <span>
                    {isWriting 
                      ? (lang === 'id' ? 'Menunggu Tag...' : 'Holding Tag...') 
                      : (lang === 'id' ? 'Tulis ke Stiker NFC' : 'Write to NFC Tag')}
                  </span>
                </button>

                <button
                  type="button"
                  className="secondary-button pill-button"
                  onClick={handleSimulateWrite}
                  disabled={isWriting}
                  title="Uji simulasi alur penulisan tag"
                >
                  <RefreshCw size={14} />
                  <span>{lang === 'id' ? 'Uji Simulasi' : 'Test Sim'}</span>
                </button>
              </div>

              {!hardwareSupported && (
                <div className="nfc-hardware-notice mt-sm">
                  <AlertTriangle size={14} />
                  <span>
                    {lang === 'id'
                      ? 'Web NFC Write native aktif pada browser Chrome Android. Anda tetap dapat menjalankan "Uji Simulasi" atau menyalin payload ke aplikasi NFC external.'
                      : 'Native Web NFC Write is supported in Chrome Android. You can still run "Test Sim" or copy the payload into external tools.'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
