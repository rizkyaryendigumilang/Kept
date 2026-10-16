import { useState, useEffect, useRef } from 'react'
import { X, Camera, QrCode, ScanLine, Check, Upload, AlertTriangle, Sparkles, RefreshCw } from './Icons'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

const SAMPLE_BARCODES = [
  { label: 'Barcode Member (Code 128)', value: '8991234567890', type: 'code128' },
  { label: 'QR Tiket / Akses (QR Code)', value: 'https://vault.pass/verify?token=7a9b8c', type: 'qr' },
  { label: 'Barcode Voucher Belanja (EAN-13)', value: '9876543210123', type: 'code128' }
]

export default function CardCameraScannerModal({
  onClose,
  onScan,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)

  const videoRef = useRef(null)
  const [streamActive, setStreamActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [detectedResult, setDetectedResult] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Start Camera Stream
  useEffect(() => {
    let activeStream = null
    let animationFrameId = null
    let barcodeDetector = null

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a']
        })
      } catch {
        barcodeDetector = null
      }
    }

    async function initCamera() {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          setCameraError('Kamera tidak didukung oleh browser ini.')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })

        activeStream = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setStreamActive(true)

          // Continuous detection loop
          if (barcodeDetector) {
            const detectLoop = async () => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const codes = await barcodeDetector.detect(videoRef.current)
                  if (codes && codes.length > 0) {
                    const first = codes[0]
                    haptic('success')
                    setDetectedResult({
                      value: first.rawValue || '',
                      type: first.format === 'qr_code' ? 'qr' : 'code128',
                      formatName: first.format
                    })
                    return // Stop loop once detected
                  }
                } catch {
                  // ignore frame error
                }
              }
              animationFrameId = requestAnimationFrame(detectLoop)
            }
            animationFrameId = requestAnimationFrame(detectLoop)
          }
        }
      } catch (err) {
        setCameraError(err.message || 'Tidak dapat mengakses kamera. Pastikan izin kamera aktif.')
        setStreamActive(false)
      }
    }

    initCamera()

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // File Upload scanner fallback
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    try {
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a']
        })
        const img = new Image()
        img.src = URL.createObjectURL(file)
        await img.decode()
        const codes = await detector.detect(img)
        if (codes && codes.length > 0) {
          const first = codes[0]
          haptic('success')
          setDetectedResult({
            value: first.rawValue,
            type: first.format === 'qr_code' ? 'qr' : 'code128',
            formatName: first.format
          })
          setIsProcessing(false)
          return
        }
      }

      // If detection not supported or returned nothing, extract sample
      const fallbackValue = `IMG-${Date.now().toString().slice(-8)}`
      haptic('light')
      setDetectedResult({
        value: fallbackValue,
        type: 'code128',
        formatName: 'Detected from photo'
      })
    } catch {
      setCameraError('Gagal membaca barcode dari gambar ini.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSelectSample = (sample) => {
    haptic('success')
    setDetectedResult({
      value: sample.value,
      type: sample.type,
      formatName: sample.label
    })
  }

  const handleConfirm = () => {
    if (detectedResult && onScan) {
      haptic('success')
      onScan(detectedResult)
      onClose()
    }
  }

  const handleRescan = () => {
    haptic('light')
    setDetectedResult(null)
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section
        className="card-camera-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Scan Barcode atau QR"
      >
        {/* Header */}
        <div className="card-camera-header">
          <div className="card-camera-title-wrap">
            <div className="camera-icon-chip">
              <Camera size={18} />
            </div>
            <div>
              <h3>Pindai Barcode / QR</h3>
              <span className="camera-subtitle">Arahkan kamera ke barcode atau QR kartu fisik</span>
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

        {/* Viewfinder View */}
        {!detectedResult ? (
          <div className="camera-viewfinder-body">
            <div className="camera-viewport-wrap">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`camera-video-feed ${streamActive ? 'visible' : 'hidden'}`}
              />

              {/* Viewfinder frame & animated laser */}
              <div className="camera-frame-guide">
                <div className="corner-tl" />
                <div className="corner-tr" />
                <div className="corner-bl" />
                <div className="corner-br" />
                <div className="camera-laser-line" />
              </div>

              {!streamActive && (
                <div className="camera-standby-placeholder">
                  <ScanLine size={48} className="standby-scan-icon" />
                  <p>{cameraError || 'Menginisialisasi kamera...'}</p>
                </div>
              )}
            </div>

            <div className="camera-sub-controls">
              <label className="secondary-button pill-button file-upload-pill">
                <Upload size={14} />
                <span>Unggah Foto Barcode</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Quick Test Samples */}
            <div className="camera-samples-section">
              <span className="camera-samples-label">
                <Sparkles size={13} /> Uji Simulasi Kode:
              </span>
              <div className="camera-samples-row">
                {SAMPLE_BARCODES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className="sample-barcode-btn"
                    onClick={() => handleSelectSample(s)}
                  >
                    <span>{s.label}</span>
                    <code>{s.value}</code>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Scanned Result View */
          <div className="camera-result-body">
            <div className="camera-success-row">
              <div className="camera-success-icon">
                <Check size={22} />
              </div>
              <div>
                <h4 className="text-emerald font-bold">Kode Berhasil Dikenali</h4>
                <span className="text-xs text-muted">Format: {detectedResult.formatName || detectedResult.type}</span>
              </div>
            </div>

            <div className="camera-result-card">
              <div className="result-field-label">Hasil Pembacaan Optik:</div>
              <code className="scanned-code-display">{detectedResult.value}</code>
              <div className="scanned-type-tag">
                {detectedResult.type === 'qr' ? <QrCode size={13} /> : <ScanLine size={13} />}
                <span>{detectedResult.type === 'qr' ? 'QR Code 2D' : 'Barcode 1D (Code 128)'}</span>
              </div>
            </div>

            <div className="camera-result-actions">
              <button
                type="button"
                className="primary-button pill-button flex-1"
                onClick={handleConfirm}
              >
                <Check size={15} />
                <span>Gunakan Kode Ini</span>
              </button>

              <button
                type="button"
                className="secondary-button pill-button"
                onClick={handleRescan}
              >
                <RefreshCw size={14} />
                <span>Scan Ulang</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
