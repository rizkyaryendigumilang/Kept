import { useState, useEffect } from 'react'
import { X, Smartphone, CheckCheck, AlertTriangle, ShieldCheck, Radio, Cpu, RefreshCw } from './Icons'
import { evaluateCardCapability } from '../lib/cards'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'
import { checkHceSupport, activateHceCard, deactivateHceCard, getHceStatus } from '../lib/hce'

export default function CardTapModal({ card, onClose, lang = 'id' }) {
  const t = (k) => getTranslation(k, lang)

  const [hceInfo, setHceInfo] = useState({ isNative: false, supported: false, enabled: false })
  const [isEmulating, setIsEmulating] = useState(false)
  const [emulationStatusText, setEmulationStatusText] = useState('')

  if (!card) return null

  const capability = evaluateCardCapability(card)
  const isTapReady = capability.id === 'tap_ready'

  useEffect(() => {
    let mounted = true
    async function initHce() {
      const info = await checkHceSupport()
      if (!mounted) return
      setHceInfo(info)

      const status = await getHceStatus()
      if (mounted && status.isEmulating) {
        setIsEmulating(true)
        setEmulationStatusText(lang === 'id' ? 'Emulasi aktif untuk kartu ini' : 'Emulation active for this card')
      }
    }
    initHce()
    return () => {
      mounted = false
    }
  }, [lang])

  const handleToggleEmulation = async () => {
    haptic('medium')
    try {
      if (isEmulating) {
        await deactivateHceCard()
        setIsEmulating(false)
        setEmulationStatusText(lang === 'id' ? 'Emulasi dihentikan' : 'Emulation stopped')
      } else {
        const rawUid = card.nfc_uid || card.card_number || '04A9723CEF51'
        await activateHceCard({
          id: card.id,
          name: card.name || card.bank_name,
          uid: rawUid,
          payload: `KEPT-PASS:${card.id || '01'}`
        })
        setIsEmulating(true)
        setEmulationStatusText(lang === 'id' ? 'Emulasi HCE aktif: Siap di-tap ke pembaca smart reader' : 'HCE active: Ready to tap on smart reader')
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([30, 50])
        }
      }
    } catch (err) {
      haptic('error')
      setEmulationStatusText(err.message || 'Gagal mengubah status emulasi')
    }
  }

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
            <div className={`tap-icon-chip ${isEmulating || isTapReady ? 'ready' : 'warning'}`}>
              {isEmulating || isTapReady ? <CheckCheck size={20} /> : <Smartphone size={20} />}
            </div>
            <div>
              <h3>{t('card_tap_modal_title')}</h3>
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

        {/* Status Graphic with Pulse */}
        <div className="tap-graphic-body">
          <div className={`tap-beacon-circle ${isEmulating || isTapReady ? 'is-ready' : 'is-limited'}`}>
            <Radio size={36} className="tap-pulse-icon" />
            <div className="tap-pulse-ring" />
          </div>

          <div className="tap-status-headline">
            {isEmulating ? (
              <span className="tap-status-badge success animate-pulse">
                <Cpu size={14} /> {t('hce_status_badge')}
              </span>
            ) : isTapReady ? (
              <span className="tap-status-badge success">
                <CheckCheck size={14} /> Tap Ready (Apple Wallet Terintegrasi)
              </span>
            ) : (
              <span className="tap-status-badge warning">
                <AlertTriangle size={14} /> {t('card_tap_status_unsupported')}
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
            {isEmulating ? (
              <div className="hce-active-box">
                <h4 className="text-emerald font-bold">
                  {t('hce_active_title')}
                </h4>
                <p className="text-sm mt-xs">
                  {t('hce_active_desc')}
                </p>
              </div>
            ) : isTapReady ? (
              <p>
                Kartu ini telah memiliki kredensial resmi atau pas Apple Wallet yang telah diprovisikan.
                Anda dapat melakukan tap langsung ke terminal atau gerbang yang kompatibel.
              </p>
            ) : (
              <div>
                <strong>Mengapa kartu apartemen/kantor lama belum bisa di-tap langsung?</strong>
                <p>
                  Mesin pembaca apartemen lama (Mifare Classic 1K) hanya membaca <em>Hardware UID fisik</em>.
                  Sistem operasi modern (iOS & Android) secara sengaja <strong>mengacak (randomize) UID</strong> untuk alasan privasi sehingga gerbang menolak sinyalnya.
                </p>
                <div className="tap-solution-box">
                  <ShieldCheck size={15} />
                  <span>
                    <strong>Solusi yang didukung Kept:</strong>
                    <br />
                    1. Gunakan <em>Tulis Stiker NFC</em> (Fase 1) untuk membuat duplikat fisik ke stiker CUID murah.
                    <br />
                    2. Gunakan <em>Wallet Pass</em> (Fase 2) untuk menambahkan kartu ke Apple Wallet atau Google Wallet.
                    <br />
                    3. Aktifkan <em>Host Card Emulation (HCE)</em> di bawah untuk smart reader kantor / IoT.
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
            className={`pill-button flex-1 ${isEmulating ? 'danger-button' : 'primary-button'}`}
            onClick={handleToggleEmulation}
          >
            <Cpu size={15} />
            <span>
              {isEmulating ? t('hce_btn_stop') : t('hce_btn_start')}
            </span>
          </button>

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
