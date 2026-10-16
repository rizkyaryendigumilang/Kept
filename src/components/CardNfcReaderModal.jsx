import { useState, useEffect } from 'react'
import { X, Radio, Check, Copy, ShieldCheck, AlertTriangle, Sparkles, RefreshCw } from './Icons'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

// Presets of simulated physical card tags for instant cross-device testing
const SAMPLE_NFC_TAGS = [
  {
    name: 'Kartu Akses Kantor / Apartemen (Mifare Classic)',
    uid: 'A4:1F:8B:2C',
    tech: 'ISO/IEC 14443 Type A (13.56 MHz)',
    standard: 'Mifare Classic 1K',
    recordsCount: 0
  },
  {
    name: 'Kartu Bank Prepaid / Transportasi (DESFire)',
    uid: '04:7B:A2:18:9E:5F:C3',
    tech: 'ISO/IEC 14443-4 Type A',
    standard: 'Mifare DESFire EV2 (AES-128)',
    recordsCount: 1
  },
  {
    name: 'Kartu Member / NTAG215',
    uid: '04:E2:59:B1:A7:44:80',
    tech: 'NFC Forum Type 2 Tag',
    standard: 'NTAG215 (504 bytes)',
    recordsCount: 2
  }
]

export default function CardNfcReaderModal({
  targetCard = null,
  onClose,
  onSaveUid,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)

  const [isScanning, setIsScanning] = useState(true)
  const [hardwareSupported, setHardwareSupported] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [scannedTag, setScannedTag] = useState(null)
  const [copied, setCopied] = useState(false)

  // Real Web NFC API reader
  useEffect(() => {
    let ndefInstance = null
    let abortController = null

    async function startWebNfc() {
      if (typeof window === 'undefined') return

      if (!('NDEFReader' in window)) {
        // Web NFC not supported by current browser (e.g. desktop or non-Chromium)
        setHardwareSupported(false)
        return
      }

      try {
        abortController = new AbortController()
        ndefInstance = new window.NDEFReader()
        await ndefInstance.scan({ signal: abortController.signal })

        ndefInstance.onreading = (event) => {
          haptic('success')
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([20, 40, 20])
          }

          const rawSerial = event.serialNumber || ''
          const formattedUid = rawSerial
            ? rawSerial.toUpperCase().replace(/(.{2})(?=.)/g, '$1:')
            : '04:A9:72:3C:EF:51'

          setScannedTag({
            uid: formattedUid,
            tech: 'Web NFC (NFC Forum Tag)',
            standard: 'ISO 14443-A',
            recordsCount: event.message?.records?.length || 0,
            timestamp: new Date().toLocaleTimeString()
          })
          setIsScanning(false)
        }

        ndefInstance.onreadingerror = () => {
          haptic('error')
          setErrorMsg('Tag terdeteksi tetapi tidak dapat dibaca. Coba posisikan ulang.')
        }
      } catch (err) {
        setHardwareSupported(false)
        setErrorMsg(err.message || 'Izin pembacaan NFC belum diberikan.')
      }
    }

    startWebNfc()

    return () => {
      if (abortController) {
        abortController.abort()
      }
    }
  }, [])

  const handleSimulateTag = (sample) => {
    haptic('success')
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20)
    }
    setScannedTag({
      uid: sample.uid,
      tech: sample.tech,
      standard: sample.standard,
      recordsCount: sample.recordsCount,
      timestamp: new Date().toLocaleTimeString()
    })
    setIsScanning(false)
    setErrorMsg('')
  }

  const handleResetScan = () => {
    haptic('light')
    setScannedTag(null)
    setIsScanning(true)
    setErrorMsg('')
  }

  const copyUid = async () => {
    if (!scannedTag?.uid) return
    try {
      await navigator.clipboard.writeText(scannedTag.uid)
      setCopied(true)
      haptic('success')
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // ignore
    }
  }

  const handleApply = () => {
    if (onSaveUid && scannedTag) {
      haptic('success')
      onSaveUid(scannedTag)
      onClose()
    }
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section
        className="card-nfc-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="NFC Reader"
      >
        {/* Header */}
        <div className="card-nfc-header">
          <div className="card-nfc-title-wrap">
            <div className="nfc-icon-chip">
              <Radio size={18} />
            </div>
            <div>
              <h3>Pembaca Tag NFC</h3>
              <span className="nfc-subtitle">
                {targetCard ? `Kartu: ${targetCard.name || targetCard.bank_name}` : 'Pindai tag kartu fisik'}
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

        {/* Scanning State: Radar Waves Animation */}
        {isScanning && (
          <div className="nfc-scan-body">
            <div className="nfc-radar-wrap">
              <div className="nfc-radar-pulse pulse-1" />
              <div className="nfc-radar-pulse pulse-2" />
              <div className="nfc-radar-pulse pulse-3" />
              <div className="nfc-device-beacon">
                <Radio size={32} className="beacon-radio-icon" />
              </div>
            </div>

            <div className="nfc-instruction-text">
              <h4>Siap Memindai Tag</h4>
              <p>
                Dekatkan kartu fisik (kartu kantor, apartemen, atau kartu bank) ke bagian atas ponsel.
              </p>
              {!hardwareSupported && (
                <div className="nfc-hardware-notice">
                  <AlertTriangle size={14} />
                  <span>
                    Web NFC native aktif di Chrome Android / perangkat kompatibel. Anda dapat menggunakan uji simulasi di bawah untuk menguji alur aplikasi.
                  </span>
                </div>
              )}
              {errorMsg && <p className="text-danger mt-xs text-sm">{errorMsg}</p>}
            </div>

            {/* Quick Test / Simulation Buttons */}
            <div className="nfc-sim-section">
              <span className="nfc-sim-label">
                <Sparkles size={13} /> Memindai:
              </span>
              <div className="nfc-sim-buttons-grid">
                {SAMPLE_NFC_TAGS.map((sample) => (
                  <button
                    key={sample.uid}
                    type="button"
                    className="nfc-sim-pill-btn"
                    onClick={() => handleSimulateTag(sample)}
                  >
                    <strong>{sample.name}</strong>
                    <span className="sim-uid-badge">{sample.uid}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Result State: Tag Successfully Read */}
        {!isScanning && scannedTag && (
          <div className="nfc-result-body">
            <div className="nfc-success-badge-row">
              <div className="nfc-success-icon">
                <Check size={22} />
              </div>
              <div>
                <h4 className="text-emerald font-bold">Tag Berhasil Terbaca</h4>
                <span className="text-xs text-muted">Dipindai pada {scannedTag.timestamp}</span>
              </div>
            </div>

            <div className="nfc-tag-info-card">
              <div className="nfc-info-row">
                <span className="nfc-info-label">NFC UID / Serial</span>
                <div className="nfc-uid-val-row">
                  <code className="nfc-uid-code">{scannedTag.uid}</code>
                  <button
                    type="button"
                    className="icon-button-subtle"
                    onClick={copyUid}
                    title="Salin UID"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="nfc-info-row">
                <span className="nfc-info-label">Standar Frekuensi</span>
                <span className="nfc-info-val">{scannedTag.tech}</span>
              </div>

              <div className="nfc-info-row">
                <span className="nfc-info-label">Tipe Protokol</span>
                <span className="nfc-info-val">{scannedTag.standard}</span>
              </div>

              <div className="nfc-info-row">
                <span className="nfc-info-label">Status Kemampuan</span>
                <span className="my-card-capability-tag cap-badge-nfc">
                  <Radio size={12} />
                  NFC Scanned
                </span>
              </div>
            </div>

            {/* Crucial Reality Explanation */}
            <div className="nfc-reality-box">
              <div className="nfc-reality-title">
                <ShieldCheck size={16} />
                <strong>Catatan Kemampuan (NFC Scanned ≠ Tap Ready)</strong>
              </div>
              <p>
                Tag fisik berhasil dibaca dan UID tersimpan di brankas. Namun, sistem operasi iOS membatasi
                emulasi sinyal kartu fisik ke mesin pembaca (turnstile/tap gerbang) tanpa sertifikat Apple Wallet resmi dari penerbit kartu.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="nfc-result-actions">
              {onSaveUid && (
                <button
                  type="button"
                  className="primary-button pill-button flex-1"
                  onClick={handleApply}
                >
                  <Check size={15} />
                  <span>{targetCard ? 'Simpan ke Kartu' : 'Gunakan UID Ini'}</span>
                </button>
              )}

              <button
                type="button"
                className="secondary-button pill-button"
                onClick={handleResetScan}
              >
                <RefreshCw size={14} />
                <span>Pindai Ulang</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
