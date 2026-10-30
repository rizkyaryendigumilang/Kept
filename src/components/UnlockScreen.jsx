import { useEffect, useState } from 'react'
import { Fingerprint, Lock, ShieldCheck, AlertTriangle, X, Check, KeyRound, Mail } from './Icons'
import PinKeypad from './PinKeypad'
import { deriveVaultKey, deriveVaultKeyAsync } from '../lib/crypto'
import { verifyMasterKey, recoverMasterKey } from '../lib/vault'
import { supabase } from '../lib/supabase'
import {
  hasBiometricEnrollment,
  isBiometricSupported,
  unlockWithBiometric
} from '../lib/biometric'
import { isWeakPin, recordSecurityActivity } from '../lib/securityAudit'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'
import { KEPT_LOGO } from '../lib/brand'

export default function UnlockScreen({
  profile,
  user,
  onUnlocked,
  onRecoverMasterPassword,
  onResetVault,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)
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
  // 'choose_method' | 'email_otp' | 'biometric_recovery' | 'input_key' | 'set_new_pin' | 'emergency_reset'
  const [recoveryStep, setRecoveryStep] = useState('choose_method')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [recoveredMasterKey, setRecoveredMasterKey] = useState(null)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  const [resetConfirmText, setResetConfirmText] = useState('')

  // Email OTP Recovery state
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [showKeyAccordion, setShowKeyAccordion] = useState(false)

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

  // Email OTP resend timer
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  const maskedEmail = (() => {
    const email = user?.email || ''
    if (!email || !email.includes('@')) return email
    const [name, domain] = email.split('@')
    if (name.length <= 2) return `${name[0]}***@${domain}`
    return `${name[0]}***${name[name.length - 1]}@${domain}`
  })()

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
      const key = await deriveVaultKeyAsync(enteredPin, profile.vault_salt)
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

  // Graceful Supabase Auth error parser
  function parseAuthError(err, context = 'send') {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return t('recovery_otp_network_error')
    }
    const msg = String(err?.message || '').toLowerCase()
    const status = err?.status || err?.code

    if (
      status === 429 ||
      msg.includes('rate limit') ||
      msg.includes('rate_limit') ||
      msg.includes('security purposes') ||
      msg.includes('too many requests') ||
      msg.includes('over_email_send_rate_limit')
    ) {
      return t('recovery_otp_rate_limited')
    }

    if (context === 'verify') {
      if (
        msg.includes('invalid') ||
        msg.includes('expired') ||
        msg.includes('token') ||
        msg.includes('otp')
      ) {
        return t('recovery_otp_invalid_code')
      }
    }

    return err?.message || (context === 'verify' ? t('recovery_otp_invalid_code') : t('recovery_otp_rate_limited'))
  }

  // Recovery Method: Email OTP
  async function handleSendOtp() {
    if (!user?.email) {
      setRecoveryError('Email akun tidak ditemukan.')
      return
    }
    setRecoveryBusy(true)
    setRecoveryError('')
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: user.email
      })
      if (otpErr) throw otpErr
      setOtpSent(true)
      setOtpCooldown(60)
      setRecoveryStep('email_otp')
      haptic('medium')
    } catch (err) {
      haptic('error')
      setRecoveryError(parseAuthError(err, 'send'))
    } finally {
      setRecoveryBusy(false)
    }
  }

  async function handleVerifyOtp(e, codeToVerify) {
    if (e) e.preventDefault()
    const targetCode = String(codeToVerify !== undefined ? codeToVerify : otpCode).trim()
    if (targetCode.length !== 6) {
      setRecoveryError(t('recovery_otp_invalid_code'))
      haptic('error')
      return
    }
    setRecoveryBusy(true)
    setRecoveryError('')
    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: user.email,
        token: targetCode,
        type: 'email'
      })
      if (verifyErr) throw verifyErr

      haptic('success')

      // Attempt to silently retrieve biometric key if enrolled on this device
      if (biometricReady) {
        try {
          const rawKey = await unlockWithBiometric(userId)
          setRecoveredMasterKey(rawKey)
        } catch {
          // Device biometric cancelled or unavailable
        }
      }

      setRecoveryStep('set_new_pin')
    } catch (err) {
      haptic('error')
      setRecoveryError(parseAuthError(err, 'verify'))
    } finally {
      setRecoveryBusy(false)
    }
  }

  function handleOtpChange(e) {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtpCode(rawVal)
    if (rawVal.length > 0) {
      haptic('light')
    }
    if (rawVal.length === 6 && !recoveryBusy) {
      // Auto-submit instantly on 6th digit with 60ms debounce for UI paint
      setTimeout(() => {
        handleVerifyOtp(null, rawVal)
      }, 60)
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
    if (pasted) {
      setOtpCode(pasted)
      haptic('medium')
      if (pasted.length === 6 && !recoveryBusy) {
        setTimeout(() => {
          handleVerifyOtp(null, pasted)
        }, 60)
      }
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
      let keyToPass = recoveredMasterKey
      // If user entered a recovery key manually and we don't have recoveredMasterKey yet
      if (!keyToPass && recoveryKey.trim()) {
        try {
          keyToPass = await recoverMasterKey(profile, recoveryKey.trim())
          setRecoveredMasterKey(keyToPass)
        } catch (keyErr) {
          setRecoveryError(keyErr.message || 'Recovery key tidak valid.')
          setRecoveryBusy(false)
          return
        }
      }

      await onRecoverMasterPassword(keyToPass, newPin, recoveryKey.trim())

      localStorage.removeItem('kept_pin_failed_attempts')
      localStorage.removeItem('kept_pin_lockout_until')
      setFailedAttempts(0)
      setLockoutSeconds(0)

      recordSecurityActivity({
        type: 'pin_changed',
        title: 'Security PIN Berhasil Diatur Ulang',
        desc: 'Security PIN baru telah aktif setelah verifikasi akun.',
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
    setOtpCode('')
    setOtpSent(false)
    setOtpCooldown(0)
    setRecoveryError('')
    setResetConfirmText('')
    setShowKeyAccordion(false)
  }

  return (
    <main className="unlock-screen pin-unlock-screen">
      <div className="brand-logo-hero">
        <img src={KEPT_LOGO} alt="Kept" className="kept-hero-logo" />
      </div>

      {/* 6-Digit PIN Keypad matching User Mockup */}
      <PinKeypad
        value={pin}
        onChange={setPin}
        onSubmit={handleUnlockWithPin}
        length={6}
        title={t('unlock_pin_title')}
        subtitle={t('unlock_pin_sub')}
        error={error}
        hint={
          failedAttempts > 0 && failedAttempts < 4
            ? t('unlock_attempt_hint').replace('{n}', failedAttempts)
            : ''
        }
        disabled={busy}
        lockoutSeconds={lockoutSeconds}
        shake={shake}
        busy={busy}
        autoSubmit={true}
        lang={lang}
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
              ? t('unlock_biometric_waiting')
              : t('unlock_biometric_btn')}
          </span>
        </button>
      )}


      {/* Secondary Recovery Links */}
      <div className="unlock-footer-links mt-md">
        <button type="button" className="text-button-link" onClick={openRecovery}>
          {t('unlock_forgot_pin')}
        </button>
      </div>

      <div className="unlock-note mt-sm">
        <Lock size={13} /> {t('unlock_zk_footer')}
      </div>

      {/* Recovery Modal with 3 Clear Scenarios */}
      {showRecovery && (
        <div className="popover-backdrop" onMouseDown={() => setShowRecovery(false)}>
          <div className="recovery-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">{t('recovery_modal_eyebrow')}</div>
                <h2>{t('recovery_modal_title')}</h2>
              </div>
              <button className="icon-button" onClick={() => setShowRecovery(false)}>
                <X size={18} />
              </button>
            </div>

            {/* STEP: CHOOSE RECOVERY METHOD */}
            {recoveryStep === 'choose_method' && (
              <div className="modal-body-stack">
                <p className="modal-description">
                  {t('recovery_choose_desc')}
                </p>

                <div className="recovery-options-grid">
                  {/* Primary Method: Email OTP */}
                  <button
                    type="button"
                    className="recovery-option-card"
                    onClick={() => {
                      setRecoveryStep('email_otp')
                      setRecoveryError('')
                      if (!otpSent) {
                        handleSendOtp()
                      }
                    }}
                    disabled={recoveryBusy}
                  >
                    <div className="recovery-card-icon tone-purple">
                      <Mail size={22} />
                    </div>
                    <div className="recovery-card-content">
                      <strong>{t('recovery_email_otp_title')}</strong>
                      <span>{t('recovery_email_otp_desc')}</span>
                    </div>
                  </button>

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
                        <strong>{t('recovery_bio_title')}</strong>
                        <span>
                          {t('recovery_bio_desc')}
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="recovery-option-card disabled-card">
                      <div className="recovery-card-icon tone-muted">
                        <Fingerprint size={22} />
                      </div>
                      <div className="recovery-card-content">
                        <strong>{t('recovery_bio_unavail')}</strong>
                        <span>{t('recovery_bio_unavail_desc')}</span>
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
                      <strong>{t('recovery_key_title')}</strong>
                      <span>
                        {t('recovery_key_desc')}
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
                      <strong>{t('recovery_reset_title')}</strong>
                      <span>
                        {t('recovery_reset_desc')}
                      </span>
                    </div>
                  </button>
                </div>

                {recoveryError && <div className="feedback error mt-sm">{recoveryError}</div>}
              </div>
            )}

            {/* STEP: EMAIL OTP VERIFICATION */}
            {recoveryStep === 'email_otp' && (
              <form onSubmit={handleVerifyOtp} className="modal-body-stack">
                <p className="modal-description">
                  {t('recovery_email_otp_desc_flow')}
                </p>

                <div className="otp-registered-email-card">
                  <div className="flex items-center gap-sm">
                    <Mail size={16} className="tone-muted" />
                    <span>{t('recovery_email_registered_label')}</span>
                  </div>
                  <span className="email-badge">{maskedEmail}</span>
                </div>

                {otpSent && (
                  <div className="feedback info">
                    {t('recovery_otp_sent_notice').replace('{email}', maskedEmail)}
                  </div>
                )}

                <label className="field">
                  <span>{t('recovery_enter_otp_label')}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={handleOtpChange}
                    onPaste={handleOtpPaste}
                    placeholder={t('recovery_enter_otp_ph')}
                    className="otp-code-input"
                    autoFocus
                    required
                  />
                </label>

                {recoveryBusy && otpCode.length === 6 && (
                  <div className="feedback info text-xs flex items-center justify-center gap-xs">
                    <span>{t('recovery_otp_verifying_auto')}</span>
                  </div>
                )}

                <div className="otp-resend-row">
                  <span>
                    {otpCooldown > 0
                      ? t('recovery_resend_in').replace('{n}', otpCooldown)
                      : ''}
                  </span>
                  <button
                    type="button"
                    className="text-button-link font-medium"
                    onClick={handleSendOtp}
                    disabled={recoveryBusy || otpCooldown > 0}
                  >
                    {t('recovery_resend_btn')}
                  </button>
                </div>

                {recoveryError && <div className="feedback error">{recoveryError}</div>}

                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setRecoveryStep('choose_method')}
                  >
                    {t('recovery_back_btn')}
                  </button>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={recoveryBusy || otpCode.trim().length !== 6}
                  >
                    {recoveryBusy ? t('recovery_verifying_otp') : t('recovery_verify_otp_btn')}
                  </button>
                </div>
              </form>
            )}

            {/* STEP: INPUT EMERGENCY RECOVERY KEY */}
            {recoveryStep === 'input_key' && (
              <form onSubmit={handleVerifyRecoveryKey} className="modal-body-stack">
                <p className="modal-description">
                  {t('recovery_input_desc')}
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
                    {t('recovery_back_btn')}
                  </button>
                  <button className="primary-button" disabled={recoveryBusy || !recoveryKey.trim()}>
                    {recoveryBusy ? t('recovery_verifying') : t('recovery_verify_btn')}
                  </button>
                </div>
              </form>
            )}

            {/* STEP: SET NEW 6-DIGIT PIN */}
            {recoveryStep === 'set_new_pin' && (
              <form onSubmit={handleSetNewPin} className="modal-body-stack">
                <div className="feedback success">
                  <Check size={14} /> {t('recovery_verified_notice')}
                </div>

                <p className="modal-description">
                  {t('recovery_new_pin_desc')}
                </p>

                <label className="field">
                  <span>{t('recovery_new_pin_label')}</span>
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
                  <span>{t('recovery_confirm_pin_label')}</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder={t('recovery_confirm_pin_ph')}
                    className="font-mono text-center letter-spacing-lg"
                    required
                  />
                </label>

                {!recoveredMasterKey && (
                  <div className="recovery-optional-key-box mt-xs">
                    <button
                      type="button"
                      className="text-button-link text-xs flex items-center gap-xs"
                      onClick={() => setShowKeyAccordion(!showKeyAccordion)}
                    >
                      <KeyRound size={13} />
                      <span>{t('recovery_with_key_toggle')}</span>
                    </button>
                    {showKeyAccordion && (
                      <div className="mt-xs">
                        <input
                          value={recoveryKey}
                          onChange={(e) => setRecoveryKey(e.target.value)}
                          placeholder={t('recovery_key_placeholder')}
                          className="font-mono text-sm"
                        />
                        <div className="field-hint text-xs mt-xs">
                          {t('recovery_key_optional_hint')}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {recoveryError && <div className="feedback error">{recoveryError}</div>}

                <div className="button-row justify-end">
                  <button
                    className="primary-button"
                    disabled={recoveryBusy || newPin.length !== 6 || confirmPin.length !== 6}
                  >
                    {recoveryBusy ? t('recovery_reencrypting') : t('recovery_set_pin_btn')}
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
                    <strong>{t('recovery_reset_warning_title')}</strong>
                    <p>
                      {t('recovery_reset_warning_1')}
                    </p>
                    <p>
                      {t('recovery_reset_warning_2')}
                    </p>
                  </div>
                </div>

                <label className="field">
                  <span>{t('recovery_reset_type_confirm')}</span>
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
                    {t('recovery_back_btn')}
                  </button>
                  <button
                    type="submit"
                    className="danger-button"
                    disabled={recoveryBusy || resetConfirmText.trim().toUpperCase() !== 'RESET'}
                  >
                    {recoveryBusy ? t('recovery_resetting_btn') : t('recovery_reset_btn')}
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
