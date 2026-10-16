import { X, Smartphone, CheckCheck, AlertTriangle, ShieldCheck, Radio } from './Icons'
import { evaluateCardCapability } from '../lib/cards'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

export default function CardTapModal({ card, onClose, lang = 'id' }) {
  const t = (k) => getTranslation(k, lang)

  if (!card) return null

  const capability = evaluateCardCapability(card)
  const isTapReady = capability.id === 'tap_ready'

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section
        className="card-tap-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Uji Kemampuan Tap"
      >
        {/* Header */}
        <div className="card-tap-header">
          <div className="card-tap-title-wrap">
            <div className={`tap-icon-chip ${isTapReady ? 'ready' : 'warning'}`}>
              {isTapReady ? <CheckCheck size={20} /> : <Smartphone size={20} />}
            </div>
            <div>
              <h3>Uji Kemampuan Tap (NFC Emulation)</h3>
              <span className="tap-subtitle">{card.name || card.bank_name}</span>
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

        {/* Status Graphic */}
        <div className="tap-graphic-body">
          <div className={`tap-beacon-circle ${isTapReady ? 'is-ready' : 'is-limited'}`}>
            <Radio size={36} className="tap-pulse-icon" />
            <div className="tap-pulse-ring" />
          </div>

          <div className="tap-status-headline">
            {isTapReady ? (
              <span className="tap-status-badge success">
                <CheckCheck size={14} /> Tap Ready (Apple Wallet Terintegrasi)
              </span>
            ) : (
              <span className="tap-status-badge warning">
                <AlertTriangle size={14} /> Belum Mendukung Tap Langsung
              </span>
            )}
          </div>
        </div>

        {/* Detailed Assessment & Explanation */}
        <div className="tap-assessment-card">
          <div className="assessment-row">
            <span className="assessment-label">Status Kemampuan:</span>
            <span className={`my-card-capability-tag ${capability.badgeClass}`}>
              {t(capability.labelKey)}
            </span>
          </div>

          <div className="assessment-row">
            <span className="assessment-label">Data NFC di Vault:</span>
            <span className="font-mono text-sm">
              {card.nfc_uid ? `UID: ${card.nfc_uid}` : 'Belum dipindai'}
            </span>
          </div>

          <div className="assessment-explanation">
            {isTapReady ? (
              <p>
                Kartu ini telah memiliki kredensial resmi atau pas Apple Wallet yang telah diprovisikan.
                Anda dapat melakukan tap langsung ke terminal atau gerbang yang kompatibel.
              </p>
            ) : (
              <div>
                <strong>Mengapa belum bisa di-tap langsung?</strong>
                <p>
                  Berhasil membaca tag (status <em>NFC Scanned</em>) hanya membuktikan bahwa ponsel dapat membaca nomor tag fisik.
                  Ponsel <strong>tidak dapat menirukan (emulasi)</strong> frekuensi kartu fisik tersebut ke mesin reader/gate karena batasan keamanan sistem operasi Apple iOS.
                </p>
                <div className="tap-solution-box">
                  <ShieldCheck size={15} />
                  <span>
                    Untuk bertransaksi atau masuk gedung via NFC iPhone, gunakan kredensial resmi dari aplikasi penerbit kartu atau tambahkan ke Apple Wallet resmi.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="card-tap-actions">

          <button
            type="button"
            className="secondary-button pill-button"
            onClick={() => {
              haptic('light')
              onClose()
            }}
          >
            <span>Tutup</span>
          </button>
        </div>
      </section>
    </div>
  )
}
