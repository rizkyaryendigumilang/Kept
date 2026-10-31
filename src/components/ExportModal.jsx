import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Mail,
  KeyRound,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  Clock,
  RefreshCw
} from './Icons'
import { supabase } from '../lib/supabase'
import { encryptCustomBackup, deriveVaultKey, deriveVaultKeyAsync } from '../lib/crypto'
import { verifyMasterKey } from '../lib/vault'
import { TRANSLATIONS } from '../lib/i18n'

// PIN brute-force guard (M-6). Persisted so closing and reopening the export
// dialog — or reloading the tab — does not reset the attempt counter.
const EXPORT_PIN_MAX_ATTEMPTS = 5
const EXPORT_PIN_LOCKOUT_MS = 60 * 1000
const EXPORT_PIN_FAILED_KEY = 'kept_export_pin_failed_attempts'
const EXPORT_PIN_LOCKOUT_KEY = 'kept_export_pin_lockout_until'

function readPinGuard() {
  try {
    const failed = Number(localStorage.getItem(EXPORT_PIN_FAILED_KEY) || 0)
    const until = Number(localStorage.getItem(EXPORT_PIN_LOCKOUT_KEY) || 0)
    return {
      failed: Number.isFinite(failed) ? failed : 0,
      until: Number.isFinite(until) ? until : 0
    }
  } catch {
    return { failed: 0, until: 0 }
  }
}

function writePinGuard({ failed, until }) {
  try {
    localStorage.setItem(EXPORT_PIN_FAILED_KEY, String(failed))
    localStorage.setItem(EXPORT_PIN_LOCKOUT_KEY, String(until))
  } catch {
    // storage unavailable — the in-memory state still applies
  }
}

function clearPinGuard() {
  try {
    localStorage.removeItem(EXPORT_PIN_FAILED_KEY)
    localStorage.removeItem(EXPORT_PIN_LOCKOUT_KEY)
  } catch {
    // ignore
  }
}

function secondsUntil(timestamp) {
  const remaining = Math.ceil((timestamp - Date.now()) / 1000)
  return remaining > 0 ? remaining : 0
}

export default function ExportModal({
  isOpen,
  onClose,
  user,
  profile,
  items = [],
  lang = 'id',
  showToast,
  recordSecurityActivity
}) {
  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['id']?.[key] || key

  // Step state: 'verify' | 'choose'
  const [isVerified, setIsVerified] = useState(false)
  const [verifyMethod, setVerifyMethod] = useState('otp') // 'otp' | 'pin'

  // OTP states
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [otpBusy, setOtpBusy] = useState(false)
  const [otpError, setOtpError] = useState('')

  // PIN states
  const [pinCode, setPinCode] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinFailedAttempts, setPinFailedAttempts] = useState(() => readPinGuard().failed)
  const [pinLockoutUntil, setPinLockoutUntil] = useState(() => readPinGuard().until)
  const [pinLockoutSeconds, setPinLockoutSeconds] = useState(() => secondsUntil(readPinGuard().until))

  // Export options
  const [format, setFormat] = useState('kept') // 'kept' | 'excel'
  const [backupPassword, setBackupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [formError, setFormError] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Reset modal state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setIsVerified(false)
      setVerifyMethod('otp')
      setOtpSent(false)
      setOtpCode('')
      setOtpCooldown(0)
      setOtpBusy(false)
      setOtpError('')
      setPinCode('')
      setPinBusy(false)
      setPinError('')
      const guard = readPinGuard()
      setPinFailedAttempts(guard.failed)
      setPinLockoutUntil(guard.until)
      setPinLockoutSeconds(secondsUntil(guard.until))
      setFormat('kept')
      setBackupPassword('')
      setConfirmPassword('')
      setShowPass(false)
      setShowConfirmPass(false)
      setFormError('')
      setDownloading(false)
    }
  }, [isOpen])

  // OTP Cooldown Timer countdown
  useEffect(() => {
    if (otpCooldown <= 0) return undefined
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  // PIN lockout countdown
  useEffect(() => {
    if (pinLockoutUntil <= Date.now()) {
      setPinLockoutSeconds(0)
      return undefined
    }

    setPinLockoutSeconds(secondsUntil(pinLockoutUntil))
    const timer = setInterval(() => {
      const remaining = secondsUntil(pinLockoutUntil)
      setPinLockoutSeconds(remaining)
      if (remaining === 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [pinLockoutUntil])

  if (!isOpen) return null

  // Mask user email (e.g., r***y@gmail.com)
  const maskedEmail = (() => {
    const email = user?.email || ''
    if (!email.includes('@')) return email
    const [name, domain] = email.split('@')
    if (name.length <= 2) return `${name[0]}***@${domain}`
    return `${name[0]}***${name[name.length - 1]}@${domain}`
  })()

  // Parse Supabase Auth error friendly
  function parseAuthError(err, context = 'send') {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return lang === 'id' ? 'Koneksi terputus. Periksa jaringan internet Anda.' : 'Network connection error. Check your internet.'
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
      return lang === 'id'
        ? 'Batas pengiriman OTP tercapai. Tunggu beberapa saat atau gunakan verifikasi PIN Master di bawah.'
        : 'OTP rate limit reached. Please wait or use Master PIN verification below.'
    }

    if (context === 'verify') {
      if (msg.includes('invalid') || msg.includes('expired') || msg.includes('token') || msg.includes('otp')) {
        return lang === 'id' ? 'Kode OTP salah atau telah kedaluwarsa.' : 'Invalid or expired OTP code.'
      }
    }

    return err?.message || (lang === 'id' ? 'Terjadi kesalahan pada verifikasi.' : 'Verification error occurred.')
  }

  // Handle Send OTP
  async function handleSendOtp() {
    if (!user?.email || otpBusy || otpCooldown > 0) return
    setOtpBusy(true)
    setOtpError('')
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: user.email
      })
      if (otpErr) throw otpErr
      setOtpSent(true)
      setOtpCooldown(60)
    } catch (err) {
      setOtpError(parseAuthError(err, 'send'))
    } finally {
      setOtpBusy(false)
    }
  }

  // Handle Verify OTP
  async function handleVerifyOtp(codeToVerify) {
    const targetCode = String(codeToVerify !== undefined ? codeToVerify : otpCode).trim()
    if (targetCode.length !== 6 || otpBusy) return

    setOtpBusy(true)
    setOtpError('')
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: user.email,
        token: targetCode,
        type: 'email'
      })
      if (verifyErr) throw verifyErr

      setIsVerified(true)
      setOtpError('')
    } catch (err) {
      setOtpError(parseAuthError(err, 'verify'))
    } finally {
      setOtpBusy(false)
    }
  }

  // Handle OTP input change with auto-submit on digit 6
  function handleOtpChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setOtpCode(val)
    setOtpError('')
    if (val.length === 6) {
      handleVerifyOtp(val)
    }
  }

  // Handle PIN verification (fallback)
  async function handleVerifyPin(e) {
    if (e) e.preventDefault()
    if (pinBusy || pinLockoutSeconds > 0) return
    if (pinCode.length < 6) return

    setPinBusy(true)
    setPinError('')
    try {
      const derivedKey = await deriveVaultKeyAsync(pinCode, profile.vault_salt)
      const valid = await verifyMasterKey(profile, derivedKey)
      if (!valid) {
        throw new Error(t('export_pin_invalid'))
      }

      clearPinGuard()
      setPinFailedAttempts(0)
      setPinLockoutUntil(0)
      setPinLockoutSeconds(0)
      setPinCode('')
      setIsVerified(true)
      setPinError('')
    } catch (err) {
      const nextFailed = pinFailedAttempts + 1
      let message = err.message || t('export_pin_invalid')

      if (nextFailed >= EXPORT_PIN_MAX_ATTEMPTS) {
        const until = Date.now() + EXPORT_PIN_LOCKOUT_MS
        setPinLockoutUntil(until)
        setPinLockoutSeconds(secondsUntil(until))
        writePinGuard({ failed: nextFailed, until })
        message = `Terlalu banyak percobaan PIN. Ekspor dikunci selama ${EXPORT_PIN_LOCKOUT_MS / 1000} detik.`
        recordSecurityActivity?.({
          type: 'security_alert',
          title: 'Percobaan PIN Ekspor Diblokir',
          desc: `${nextFailed} percobaan PIN salah saat membuka ekspor vault.`,
          level: 'warning'
        })
      } else {
        setPinFailedAttempts(nextFailed)
        writePinGuard({ failed: nextFailed, until: 0 })
        message = `${message} (${nextFailed}/${EXPORT_PIN_MAX_ATTEMPTS})`
      }

      setPinError(message)
      setPinCode('')
    } finally {
      setPinBusy(false)
    }
  }

  // Format Items to CSV for Excel
  function formatVaultCsv(vaultItems) {
    const isId = lang === 'id'
    const headers = isId
      ? ['Tipe', 'Kategori', 'Nama Layanan', 'Username / Akun', 'Password / Rahasia', 'Nomor Kartu / Dokumen', 'PIN / CVV', 'Masa Berlaku', 'URL / Website', 'Catatan', 'Tanggal Dibuat']
      : ['Type', 'Category', 'Name / Service', 'Username / Account', 'Password / Secret', 'Card / Doc Number', 'PIN / CVV', 'Expiry Date', 'URL / Website', 'Notes', 'Created At']

    function escapeCell(val) {
      if (val === null || val === undefined) return '""'
      let str = String(val)
      // Spreadsheet formula injection (M-5): Excel / Google Sheets execute any
      // cell that starts with = + - @ (and the tab/CR leakers). Prefix with a
      // single quote so the value is treated as literal text.
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`
      }
      return `"${str.replace(/"/g, '""')}"`
    }

    const rows = vaultItems.map((item) => {
      const type = item.item_type || 'password'
      const category = item.category || ''
      const name = item.name || item.bank_name || ''
      const username = item.username || item.card_holder || item.holder_name || ''
      const password = item.password || ''
      const cardNumber = item.card_number || item.account_number || item.doc_number || ''
      const pinCvv = [item.pin ? `PIN: ${item.pin}` : '', item.cvv ? `CVV: ${item.cvv}` : ''].filter(Boolean).join(' | ')
      const expiry = item.expiry || item.expiry_date || ''
      const url = item.url || ''
      const notes = item.notes || ''
      const createdAt = item.created_at ? new Date(item.created_at).toLocaleString(isId ? 'id-ID' : 'en-US') : ''

      return [
        escapeCell(type),
        escapeCell(category),
        escapeCell(name),
        escapeCell(username),
        escapeCell(password),
        escapeCell(cardNumber),
        escapeCell(pinCvv),
        escapeCell(expiry),
        escapeCell(url),
        escapeCell(notes),
        escapeCell(createdAt)
      ].join(',')
    })

    // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows/Mac opens without mangling characters
    return '\uFEFF' + [headers.map(escapeCell).join(','), ...rows].join('\r\n')
  }

  // Execute Export Download
  async function handleDownloadExport() {
    setFormError('')

    if (format === 'kept') {
      if (!backupPassword || backupPassword.length < 6) {
        setFormError(t('export_pass_min_error'))
        return
      }
      if (backupPassword !== confirmPassword) {
        setFormError(t('export_pass_mismatch_error'))
        return
      }
    }

    setDownloading(true)
    try {
      const dateStr = new Date().toISOString().slice(0, 10)

      if (format === 'kept') {
        // Sanitize items payload for portable encrypted backup.
        // No field whitelist (M-7): a whitelist silently dropped attachments,
        // template ids, custom fields and document metadata, so a restored
        // backup came back incomplete. Only the server-side ciphertext is
        // dropped, since the plaintext fields are what gets re-encrypted.
        const exportPayload = items.map((i) => {
          const { payload, ...rest } = i
          return rest
        })

        const encryptedBackup = await encryptCustomBackup(exportPayload, backupPassword)
        const blob = new Blob([JSON.stringify(encryptedBackup, null, 2)], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kept-backup-${dateStr}.kept`
        a.click()
        URL.revokeObjectURL(url)

        recordSecurityActivity?.({
          type: 'export_sensitive',
          title: 'Ekspor Cadangan .kept Terenkripsi',
          desc: `Cadangan terproteksi sandi kustom diekspor (${items.length} item) setelah otorisasi keamanan.`,
          level: 'warning'
        })
      } else {
        // Excel / CSV Export with UTF-8 BOM
        const csvContent = formatVaultCsv(items)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kept-vault-export-${dateStr}.csv`
        a.click()
        URL.revokeObjectURL(url)

        recordSecurityActivity?.({
          type: 'export_sensitive',
          title: 'Ekspor Spreadsheet Excel / CSV',
          desc: `Spreadsheet tabular diekspor (${items.length} item) setelah otorisasi keamanan.`,
          level: 'warning'
        })
      }

      showToast?.(t('export_success_toast'), 2500)
      onClose()
    } catch (err) {
      setFormError(err.message || 'Gagal mengekspor file cadangan.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal
      title={t('export_modal_title')}
      eyebrow={t('export_modal_eyebrow')}
      onClose={onClose}
      wide={false}
    >
      <div className="export-modal-body">
        {/* PHASE 1: SECURITY GATE (OTP / PIN) */}
        {!isVerified ? (
          <div className="export-security-gate">
            <div className="export-security-badge-box">
              <div className="export-security-icon-circle">
                <ShieldAlert size={28} className="text-warning-accent" />
              </div>
              <h4>{t('export_sec_badge')}</h4>
              <p>{t('export_sec_desc')}</p>
            </div>

            {/* Email verification method */}
            {verifyMethod === 'otp' ? (
              <div className="export-otp-flow">
                <div className="export-email-pill">
                  <Mail size={15} />
                  <span>{maskedEmail}</span>
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    className="primary-button pill-button w-full mt-sm"
                    onClick={handleSendOtp}
                    disabled={otpBusy}
                  >
                    <Mail size={15} />
                    {otpBusy ? t('export_otp_verifying') : t('export_otp_btn_send')}
                  </button>
                ) : (
                  <div className="export-otp-input-section mt-sm">
                    <span className="export-field-hint">
                      {t('export_otp_sent_note')} <strong>{maskedEmail}</strong>:
                    </span>

                    <div className="export-otp-digit-wrapper">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otpCode}
                        onChange={handleOtpChange}
                        placeholder="••••••"
                        className="export-otp-input font-mono"
                        autoFocus
                      />
                    </div>

                    <div className="export-resend-row mt-xs">
                      {otpCooldown > 0 ? (
                        <span className="export-cooldown-text">
                          <RefreshCw size={12} className="spin-slow" /> {t('export_otp_btn_resend')} ({otpCooldown}s)
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-button"
                          onClick={handleSendOtp}
                          disabled={otpBusy}
                        >
                          <RefreshCw size={13} /> {t('export_otp_btn_resend')}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {otpError && <div className="feedback error mt-sm">{otpError}</div>}

                {/* Switch to PIN Fallback */}
                <div className="export-alt-method-wrap mt-md">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setVerifyMethod('pin')
                      setOtpError('')
                    }}
                  >
                    <KeyRound size={13} />
                    {t('export_otp_switch_to_pin')}
                  </button>
                </div>
              </div>
            ) : (
              /* Master PIN Fallback */
              <form onSubmit={handleVerifyPin} className="export-pin-flow mt-sm">
                <div className="export-field-hint">
                  {t('export_pin_desc')}
                </div>

                <div className="export-otp-digit-wrapper mt-xs">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    value={pinCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 12)
                      setPinCode(val)
                      setPinError('')
                    }}
                    placeholder="••••••••"
                    className="export-otp-input font-mono"
                    autoFocus
                  />
                </div>

                {pinError && <div className="feedback error mt-sm">{pinError}</div>}
                {pinLockoutSeconds > 0 && (
                  <div className="feedback error mt-sm">
                    <Clock size={13} /> Ekspor terkunci. Coba lagi dalam {pinLockoutSeconds} detik.
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-button pill-button w-full mt-sm"
                  disabled={pinCode.length < 6 || pinBusy || pinLockoutSeconds > 0}
                >
                  <KeyRound size={15} />
                  {pinBusy ? t('export_otp_verifying') : t('export_pin_verify_btn')}
                </button>

                <div className="export-alt-method-wrap mt-md">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setVerifyMethod('otp')
                      setPinError('')
                    }}
                  >
                    <Mail size={13} />
                    {t('export_pin_switch_to_otp')}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* PHASE 2: FORMAT SELECTION & SETTINGS */
          <div className="export-configure-flow">
            {/* Verified Header Pill */}
            <div className="export-verified-pill">
              <Check size={14} className="text-emerald" />
              <span>{t('export_verified_title')} ({user?.email})</span>
            </div>

            <div className="export-section-title mt-sm">
              <strong>{t('export_format_heading')}</strong>
            </div>

            {/* Format Cards */}
            <div className="export-format-grid mt-xs">
              {/* Option A: .kept Encrypted Backup */}
              <div
                className={`export-format-card ${format === 'kept' ? 'active' : ''}`}
                onClick={() => setFormat('kept')}
                role="button"
                tabIndex={0}
              >
                <div className="export-format-card-header">
                  <div className="export-format-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="export-format-title-group">
                    <strong>{t('export_format_kept_title')}</strong>
                    <span className="export-badge-recommended">{t('export_format_kept_tag')}</span>
                  </div>
                </div>
                <p className="export-format-desc">{t('export_format_kept_desc')}</p>
              </div>

              {/* Option B: Excel / CSV Spreadsheet */}
              <div
                className={`export-format-card ${format === 'excel' ? 'active' : ''}`}
                onClick={() => setFormat('excel')}
                role="button"
                tabIndex={0}
              >
                <div className="export-format-card-header">
                  <div className="export-format-icon excel-icon">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div className="export-format-title-group">
                    <strong>{t('export_format_excel_title')}</strong>
                    <span className="export-badge-neutral">{t('export_format_excel_tag')}</span>
                  </div>
                </div>
                <p className="export-format-desc">{t('export_format_excel_desc')}</p>
              </div>
            </div>

            {/* Format specific inputs */}
            {format === 'kept' ? (
              <div className="export-pass-card mt-md">
                <label className="field">
                  <span>{t('export_pass_label')}</span>
                  <div className="password-input-wrap">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      placeholder={t('export_pass_ph')}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="icon-button-subtle pass-toggle-btn"
                      onClick={() => setShowPass(!showPass)}
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>

                <label className="field mt-xs">
                  <span>{t('export_pass_confirm_label')}</span>
                  <div className="password-input-wrap">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('export_pass_confirm_ph')}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="icon-button-subtle pass-toggle-btn"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      tabIndex={-1}
                    >
                      {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>

                <div className="export-pass-note mt-xs">
                  <small>{t('export_pass_hint')}</small>
                </div>
              </div>
            ) : (
              <div className="export-excel-warning mt-md">
                <div className="export-warning-header">
                  <AlertTriangle size={16} className="text-warning-accent" />
                  <strong>{t('export_excel_warning_title')}</strong>
                </div>
                <p>{t('export_excel_warning_desc')}</p>
              </div>
            )}

            {formError && <div className="feedback error mt-sm">{formError}</div>}

            {/* Action Buttons */}
            <div className="export-actions-row mt-md">
              <button
                type="button"
                className="secondary-button pill-button"
                onClick={onClose}
                disabled={downloading}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>

              <button
                type="button"
                className="primary-button pill-button"
                onClick={handleDownloadExport}
                disabled={downloading}
              >
                <Download size={15} />
                {downloading
                  ? t('export_preparing')
                  : format === 'kept'
                  ? t('export_download_kept_btn')
                  : t('export_download_excel_btn')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
