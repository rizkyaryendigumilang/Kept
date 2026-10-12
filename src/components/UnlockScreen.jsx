import { useEffect, useState } from 'react'
import { Fingerprint, Lock, ShieldCheck, AlertTriangle, X, Check, KeyRound } from './Icons'
import PinKeypad from './PinKeypad'
import { deriveVaultKey } from '../lib/crypto'
import { verifyMasterKey, recoverMasterKey } from '../lib/vault'
import {
  hasBiometricEnrollment,
  isBiometricSupported,
  unlockWithBiometric
} from '../lib/biometric'
import { isWeakPin, recordSecurityActivity } from '../lib/securityAudit'

export default function UnlockScreen({
  profile,
  user,
  onUnlocked,
  onRecoverMasterPassword,
  onResetVault
}) {
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [biometricBusy, setBiometricBusy] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)

  // Progressive delay & retry limits state
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return parseInt(localStorage.getItem('kept_pin_failed_attempts') || '0', 10)
  })
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  // Recovery modal state
  // 'choose_method' | 'biometric_recovery' | 'input_key' | 'set_new_pin' | 'emergency_reset'
  const [recoveryStep, setRecoveryStep] = useState('choose_method')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [recoveredMasterKey, setRecoveredMasterKey] = useState(null)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  const [resetConfirmText, setResetConfirmText] = useState('')

  const userId = user?.id
  const biometricReady =
    isBiometricSupported() &&
    hasBiometricEnrollment(userId)

  // Check lockout on mount and handle countdown
  useEffect(() => {
    const checkLockout = () => {
      const until = parseInt(localStorage.getItem('kept_pin_lockout_until') || '0', 10)
      const now = Date.now()
      if (until > now) {
        setLockoutSeconds(Math.ceil((until - now) / 1000))
      } else {
        setLockoutSeconds(0)
      }
    }

    checkLockout()
    const timer = setInterval(checkLockout, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setPin('')
    setError('')
  }, [profile?.id])

  async function handleUnlockWithPin(enteredPin) {
    if (busy || lockoutSeconds > 0) return
    if (enteredPin.length !== 6) return

    setBusy(true)
    setError('')

    try {
      const key = deriveVaultKey(enteredPin, profile.vault_salt)
      const valid = await verifyMasterKey(profile, key)

      if (!valid) {
        throw new Error('PIN tidak sesuai.')
      }

      // Success: Reset retry counters
      localStorage.removeItem('kept_pin_failed_attempts')
      localStorage.removeItem('kept_pin_lockout_until')
      setFailedAttempts(0)
      setLockoutSeconds(0)

      recordSecurityActivity({
        type: 'login_success',
        title: 'Buka Vault Berhasil',
        desc: 'Vault dibuka menggunakan 6-Digit Security PIN.',
        level: 'success'
      })

      onUnlocked(key)
    } catch (err) {
      const nextAttempts = failedAttempts + 1
      setFailedAttempts(nextAttempts)
      localStorage.setItem('kept_pin_failed_attempts', String(nextAttempts))

      // Trigger shake animation
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setPin('')

      // Progressive Delay Logic
      if (nextAttempts >= 5) {
        // 60-second penalty
        const lockoutUntil = Date.now() + 60000
        localStorage.setItem('kept_pin_lockout_until', String(lockoutUntil))
        setLockoutSeconds(60)
        setError('PIN salah 5 kali. Keypad dikunci selama 60 detik.')

        recordSecurityActivity({
          type: 'security_warning',
          title: 'Jeda Keamanan Aktif (60 Detik)',
          desc: '5 kali percobaan PIN salah berturut-turut. Keypad dikunci sementara.',
          level: 'danger'
        })
      } else if (nextAttempts === 4) {
        // 30-second penalty
        const lockoutUntil = Date.now() + 30000
        localStorage.setItem('kept_pin_lockout_until', String(lockoutUntil))
        setLockoutSeconds(30)
        setError('PIN salah 4 kali. Keypad dikunci selama 30 detik.')

        recordSecurityActivity({
          type: 'security_warning',
          title: 'Jeda Keamanan Aktif (30 Detik)',
          desc: '4 kali percobaan PIN salah berturut-turut. Keypad dikunci sementara.',
          level: 'danger'
        })
      } else {
        setError(`PIN salah (Percobaan ${nextAttempts} dari 5). Periksa kembali 6 digit PIN Anda.`)

        recordSecurityActivity({
          type: 'login_failed',
          title: 'Percobaan PIN Gagal',
          desc: `Percobaan PIN salah ke-${nextAttempts}.`,
          level: 'warning'
        })
      }
    } finally {
      setBusy(false)
    }
  }

  async function unlockWithDevice() {
    setBiometricBusy(true)
    setError('')

    try {
      const key = await unlockWithBiometric(userId)

      // Reset retry counters
      localStorage.removeItem('kept_pin_failed_attempts')
      localStorage.removeItem('kept_pin_lockout_until')
      setFailedAttempts(0)
      setLockoutSeconds(0)

      recordSecurityActivity({
        type: 'login_success',
        title: 'Buka Vault Berhasil (Biometrik)',
        desc: 'Vault dibuka menggunakan autentikasi biometrik perangkat.',
        level: 'success'
      })

      onUnlocked(key)
    } catch (err) {
      setError(err.message || 'Verifikasi biometrik gagal.')
    } finally {
      setBiometricBusy(false)
    }
  }

  // Recovery Scenario 1: Re-authenticate with Biometric to set new PIN
  async function handleBiometricRecovery() {
    setRecoveryBusy(true)
    setRecoveryError('')
    try {
      const rawKey = await unlockWithBiometric(userId)
      setRecoveredMasterKey(rawKey)
      setRecoveryStep('set_new_pin')
    } catch (err) {
      setRecoveryError(err.message || 'Autentikasi biometrik gagal. Gunakan Emergency Recovery Key.')
    } finally {
      setRecoveryBusy(false)
    }
  }

  // Recovery Scenario 2: Emergency Recovery Key
  async function handleVerifyRecoveryKey(e) {
    e.preventDefault()
    setRecoveryBusy(true)
    setRecoveryError('')

    try {
      const rawKey = await recoverMasterKey(profile, recoveryKey)
      setRecoveredMasterKey(rawKey)
      setRecoveryStep('set_new_pin')
    } catch (err) {
      setRecoveryError(err.message || 'Recovery key tidak valid untuk akun ini.')
    } finally {
      setRecoveryBusy(false)
    }
  }

  // Set new 6-digit PIN after recovery
  async function handleSetNewPin(e) {
    e.preventDefault()
    setRecoveryError('')

    const check = isWeakPin(newPin)
    if (check.isWeak) {
      setRecoveryError(check.reason)
      return
    }

    if (newPin !== confirmPin) {
      setRecoveryError('Konfirmasi 6-digit PIN tidak cocok.')
      return
    }

    setRecoveryBusy(true)
    try {
      await onRecoverMasterPassword(recoveredMasterKey, newPin, recoveryKey)

      localStorage.removeItem('kept_pin_failed_attempts')
      localStorage.removeItem('kept_pin_lockout_until')
      setFailedAttempts(0)
      setLockoutSeconds(0)

      recordSecurityActivity({
        type: 'pin_changed',
        title: 'Security PIN Berhasil Diatur Ulang',
        desc: 'Security PIN baru telah aktif setelah pemulihan akun.',
        level: 'success'
      })

      setShowRecovery(false)
    } catch (err) {
      setRecoveryError(err.message || 'Gagal menyetel Security PIN baru.')
    } finally {
      setRecoveryBusy(false)
    }
  }

  async function handleExecuteReset(e) {
    e.preventDefault()
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') {
      setRecoveryError('Ketik "RESET" untuk mengonfirmasi penghapusan vault.')
      return
    }

    setRecoveryBusy(true)
    setRecoveryError('')
    try {
      await onResetVault()
      localStorage.removeItem('kept_pin_failed_attempts')
      localStorage.removeItem('kept_pin_lockout_until')
      setShowRecovery(false)
    } catch (err) {
      setRecoveryError(err.message || 'Gagal me-reset vault.')
    } finally {
      setRecoveryBusy(false)
    }
  }

  function openRecovery() {
    setShowRecovery(true)
    setRecoveryStep('choose_method')
    setRecoveryKey('')
    setRecoveredMasterKey(null)
    setNewPin('')
    setConfirmPin('')
    setRecoveryError('')
    setResetConfirmText('')
  }

  return (
    <main className="unlock-screen pin-unlock-screen">
      <div className="brand-logo-hero">
        <img src="/brand/kept-logo.png" alt="Kept" className="kept-hero-logo" />
      </div>

      {/* 6-Digit PIN Keypad matching User Mockup */}
      <PinKeypad
        value={pin}
        onChange={setPin}
        onSubmit={handleUnlockWithPin}
        length={6}
        title="Enter your PIN"
        subtitle="Enter your 6-digit security PIN"
        error={error}
        hint={
          failedAttempts > 0 && failedAttempts < 4
            ? `Percobaan ${failedAttempts} dari 5`
            : ''
        }
        disabled={busy}
        lockoutSeconds={lockoutSeconds}
        shake={shake}
        busy={busy}
        autoSubmit={true}
      />

      {/* Biometric Unlock Option */}
      {biometricReady && (
        <button
          className="biometric-pill-button mt-sm"
          type="button"
          onClick={unlockWithDevice}
          disabled={biometricBusy || lockoutSeconds > 0}
        >
          <Fingerprint size={17} strokeWidth={2.2} />
          <span>
            {biometricBusy
              ? 'Menunggu biometrik…'
              : 'Buka dengan Face ID / Biometrik'}
          </span>
        </button>
      )}


      {/* Secondary Recovery Links */}
      <div className="unlock-footer-links mt-md">
        <button type="button" className="text-button-link" onClick={openRecovery}>
          Lupa Security PIN?
        </button>
      </div>

      <div className="unlock-note mt-sm">
        <Lock size={13} /> Enkripsi Zero-Knowledge · AES-256-GCM & Argon2id
      </div>

      {/* Recovery Modal with 3 Clear Scenarios */}
      {showRecovery && (
        <div className="popover-backdrop" onMouseDown={() => setShowRecovery(false)}>
          <div className="recovery-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">Pemulihan Akun Kept</div>
                <h2>Lupa Security PIN</h2>
              </div>
              <button className="icon-button" onClick={() => setShowRecovery(false)}>
                <X size={18} />
              </button>
            </div>

            {/* STEP: CHOOSE RECOVERY METHOD */}
            {recoveryStep === 'choose_method' && (
              <div className="modal-body-stack">
                <p className="modal-description">
                  Pilih salah satu metode pemulihan yang tersedia untuk membuka kembali vault dan mengatur PIN baru:
                </p>

                <div className="recovery-options-grid">
                  {/* Scenario 1: Biometric Access */}
                  {biometricReady ? (
                    <button
                      type="button"
                      className="recovery-option-card"
                      onClick={handleBiometricRecovery}
                      disabled={recoveryBusy}
                    >
                      <div className="recovery-card-icon tone-green">
                        <Fingerprint size={22} />
                      </div>
                      <div className="recovery-card-content">
                        <strong>Autentikasi Biometrik Perangkat</strong>
                        <span>
                          Perangkat ini terdaftar secara sah. Autentikasi dengan Touch ID / Face ID untuk langsung menyetel PIN baru.
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="recovery-option-card disabled-card">
                      <div className="recovery-card-icon tone-muted">
                        <Fingerprint size={22} />
                      </div>
                      <div className="recovery-card-content">
                        <strong>Biometrik Belum Terdaftar</strong>
                        <span>Aktifkan biometrik di Pengaturan untuk pemulihan instan di masa mendatang.</span>
                      </div>
                    </div>
                  )}

                  {/* Scenario 2: Emergency Recovery Key */}
                  <button
                    type="button"
                    className="recovery-option-card"
                    onClick={() => {
                      setRecoveryStep('input_key')
                      setRecoveryError('')
                    }}
                  >
                    <div className="recovery-card-icon tone-blue">
                      <KeyRound size={22} />
                    </div>
                    <div className="recovery-card-content">
                      <strong>Gunakan Emergency Recovery Key</strong>
                      <span>
                        Masukkan kunci pemulihan 24-karakter yang Anda simpan saat inisialisasi vault.
                      </span>
                    </div>
                  </button>

                  {/* Scenario 3: Emergency Vault Reset */}
                  <button
                    type="button"
                    className="recovery-option-card tone-danger-subtle"
                    onClick={() => {
                      setRecoveryStep('emergency_reset')
                      setRecoveryError('')
                    }}
                  >
                    <div className="recovery-card-icon tone-danger">
                      <AlertTriangle size={22} />
                    </div>
                    <div className="recovery-card-content">
                      <strong>Reset Vault (Darurat)</strong>
                      <span>
                        Jika Anda tidak memiliki akses biometrik maupun recovery key, hapus vault lama dan mulai dari awal.
                      </span>
                    </div>
                  </button>
                </div>

                {recoveryError && <div className="feedback error mt-sm">{recoveryError}</div>}
              </div>
            )}

            {/* STEP: INPUT EMERGENCY RECOVERY KEY */}
            {recoveryStep === 'input_key' && (
              <form onSubmit={handleVerifyRecoveryKey} className="modal-body-stack">
                <p className="modal-description">
                  Masukkan <strong>Emergency Recovery Key</strong> (kode 24-karakter yang Anda simpan di tempat aman) untuk mendekripsi master key.
                </p>

                <label className="field">
                  <span>Emergency Recovery Key</span>
                  <input
                    value={recoveryKey}
                    onChange={(e) => setRecoveryKey(e.target.value)}
                    placeholder="KEPT-XXXX-XXXX-XXXX-XXXX-XXXX"
                    className="font-mono"
                    autoFocus
                    required
                  />
                </label>

                {recoveryError && <div className="feedback error">{recoveryError}</div>}

                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setRecoveryStep('choose_method')}
                  >
                    Kembali
                  </button>
                  <button className="primary-button" disabled={recoveryBusy || !recoveryKey.trim()}>
                    {recoveryBusy ? 'Memverifikasi…' : 'Verifikasi Kunci'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP: SET NEW 6-DIGIT PIN */}
            {recoveryStep === 'set_new_pin' && (
              <form onSubmit={handleSetNewPin} className="modal-body-stack">
                <div className="feedback success">
                  <Check size={14} /> Identitas terverifikasi! Silakan buat 6-Digit Security PIN baru.
                </div>

                <p className="modal-description">
                  Semua data vault Anda akan dienkripsi ulang secara aman dengan 6-digit PIN baru.
                </p>

                <label className="field">
                  <span>Security PIN Baru (6 Digit)</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Contoh: 849201"
                    className="font-mono text-center letter-spacing-lg"
                    autoFocus
                    required
                  />
                </label>

                <label className="field">
                  <span>Konfirmasi PIN Baru</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Ketik ulang 6 digit PIN"
                    className="font-mono text-center letter-spacing-lg"
                    required
                  />
                </label>

                {recoveryError && <div className="feedback error">{recoveryError}</div>}

                <div className="button-row justify-end">
                  <button
                    className="primary-button"
                    disabled={recoveryBusy || newPin.length !== 6 || confirmPin.length !== 6}
                  >
                    {recoveryBusy ? 'Mengenkripsi ulang vault…' : 'Simpan & Buka Vault'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP: EMERGENCY RESET */}
            {recoveryStep === 'emergency_reset' && (
              <form onSubmit={handleExecuteReset} className="modal-body-stack">
                <div className="danger-notice">
                  <AlertTriangle size={20} className="danger-icon" />
                  <div>
                    <strong>Peringatan Reset Vault</strong>
                    <p>
                      Karena Kept menerapkan enkripsi <em>zero-knowledge</em> murni, tanpa PIN atau Recovery Key, data lama tidak dapat didekripsi oleh siapapun.
                    </p>
                    <p>
                      Mereset vault akan menghapus seluruh rekaman terenkripsi dan mengembalikan ke setup awal yang bersih.
                    </p>
                  </div>
                </div>

                <label className="field">
                  <span>Ketik "RESET" untuk mengonfirmasi:</span>
                  <input
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="RESET"
                    className="font-mono text-center"
                    required
                  />
                </label>

                {recoveryError && <div className="feedback error">{recoveryError}</div>}

                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setRecoveryStep('choose_method')}
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="danger-button"
                    disabled={recoveryBusy || resetConfirmText.trim().toUpperCase() !== 'RESET'}
                  >
                    {recoveryBusy ? 'Mereset vault…' : 'Hapus & Reset Vault'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
