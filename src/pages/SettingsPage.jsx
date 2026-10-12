import { useEffect, useState, useMemo, useRef, lazy, Suspense } from 'react'
import {
  Menu,
  X,
  ChevronRight,
  ArrowLeft,
  SlidersHorizontal,
  ShieldCheck,
  Cloud,
  Database,
  Bell,
  User,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Upload,
  Download,
  Copy,
  Check,
  KeyRound,
  Lock,
  Fingerprint,
  Camera,
  Image
} from '../components/Icons'

const AvatarCropModal = lazy(() => import('../components/AvatarCropModal'))
import AnimatedHamburger, { HAMBURGER_STYLES } from '../components/AnimatedHamburger'
import ConfirmToast from '../components/ConfirmToast'

import {
  enrollBiometric,
  hasBiometricEnrollment,
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  removeBiometricRecord
} from '../lib/biometric'
import { checkDocumentExpiry } from '../lib/documents'
import { isWeakPin } from '../lib/securityAudit'

export default function SettingsPage({
  profile,
  user,
  vaultKey,
  items = [],
  documents = [],
  isOnline = true,
  pendingSyncCount = 0,
  onTheme,
  onCardStyle,
  onSaveProfile,
  onUploadAvatar,
  onRemoveAvatar,
  onSignOut,
  onImport,
  onExport,
  onChangeAccountPassword,
  onChangeMasterPassword,
  recoveryKey,
  onDownloadEmergencySheet,
  onLockVault,
  showToast,
  hamburgerStyle = 'squash',
  onHamburgerStyle
}) {
  const [activeSubpage, setActiveSubpage] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  // Profile form state
  const [name, setName] = useState(profile?.display_name || '')
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [selectedImageSrc, setSelectedImageSrc] = useState(null)
  const [showResetAvatarConfirm, setShowResetAvatarConfirm] = useState(false)
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  // Biometric state
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricEnrolled, setBiometricEnrolled] = useState(false)
  const [biometricBusy, setBiometricBusy] = useState(false)
  const [biometricError, setBiometricError] = useState('')

  // Account Password
  const [accountNewPass, setAccountNewPass] = useState('')
  const [accountConfirmPass, setAccountConfirmPass] = useState('')
  const [accountPassBusy, setAccountPassBusy] = useState(false)
  const [accountPassMsg, setAccountPassMsg] = useState('')
  const [accountPassErr, setAccountPassErr] = useState('')

  // Master Password / PIN
  const [masterCurrentPass, setMasterCurrentPass] = useState('')
  const [masterNewPass, setMasterNewPass] = useState('')
  const [masterConfirmPass, setMasterConfirmPass] = useState('')
  const [masterPassBusy, setMasterPassBusy] = useState(false)
  const [masterPassMsg, setMasterPassMsg] = useState('')
  const [masterPassErr, setMasterPassErr] = useState('')

  // Recovery Key
  const [copiedKey, setCopiedKey] = useState(false)
  const [showRecoveryDetails, setShowRecoveryDetails] = useState(false)

  // Auto-lock setting
  const [autoLockMinutes, setAutoLockMinutes] = useState(() => {
    return localStorage.getItem('kept_autolock_minutes') || '15'
  })

  // Notification Preferences
  const [notifyPrefs, setNotifyPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem('kept_doc_notify_prefs')
      return stored ? JSON.parse(stored) : { d90: true, d30: true, d7: true, expired: true }
    } catch {
      return { d90: true, d30: true, d7: true, expired: true }
    }
  })
  const [browserPermission, setBrowserPermission] = useState(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default'
  })

  // Accent Color state
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('kept_accent_color') || '#9ece6a'
  })

  useEffect(() => {
    setName(profile?.display_name || '')
  }, [profile?.display_name])

  useEffect(() => {
    setAvatarPreview(profile?.avatar_url || '')
  }, [profile?.avatar_url])

  useEffect(() => {
    let mounted = true
    if (!isBiometricSupported()) {
      setBiometricSupported(false)
      return undefined
    }
    isPlatformAuthenticatorAvailable().then((available) => {
      if (mounted) setBiometricSupported(available)
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setBiometricEnrolled(hasBiometricEnrollment(user?.id))
  }, [user?.id])

  function toggleNotifyPref(key) {
    const updated = { ...notifyPrefs, [key]: !notifyPrefs[key] }
    setNotifyPrefs(updated)
    localStorage.setItem('kept_doc_notify_prefs', JSON.stringify(updated))
  }

  async function requestNotificationPermission() {
    if (typeof Notification === 'undefined') return
    try {
      const permission = await Notification.requestPermission()
      setBrowserPermission(permission)
    } catch {
      // ignore
    }
  }

  function handleAutoLockChange(mins) {
    setAutoLockMinutes(mins)
    localStorage.setItem('kept_autolock_minutes', mins)
  }

  function handleAccentChange(hex) {
    setAccentColor(hex)
    localStorage.setItem('kept_accent_color', hex)
    document.documentElement.style.setProperty('--t-brand-accent', hex)
  }

  async function enableBiometric() {
    setBiometricBusy(true)
    setBiometricError('')
    try {
      await enrollBiometric(user.id, user.email || profile.display_name || 'kept-user', vaultKey)
      setBiometricEnrolled(true)
    } catch (err) {
      setBiometricError(err.message || 'Gagal mendaftarkan biometrik.')
    } finally {
      setBiometricBusy(false)
    }
  }

  async function disableBiometric() {
    setBiometricBusy(true)
    try {
      removeBiometricRecord(user.id)
      setBiometricEnrolled(false)
      setBiometricError('')
    } finally {
      setBiometricBusy(false)
    }
  }

  // Avatar handling (crop, WebP conversion, remove)
  function handleFileSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar valid (JPG, PNG, atau WebP).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran foto awal maksimal 10 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImageSrc(reader.result)
      setCropModalOpen(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleCropComplete(webpFile) {
    setCropModalOpen(false)
    setSelectedImageSrc(null)
    setUploadingAvatar(true)
    try {
      const displayUrl = await onUploadAvatar(webpFile)
      if (displayUrl) {
        setAvatarPreview(displayUrl)
      }
    } catch (err) {
      alert('Gagal mengunggah foto profil: ' + err.message)
      setAvatarPreview(profile?.avatar_url || '')
    } finally {
      setUploadingAvatar(false)
    }
  }

  function handleResetDefaultAvatar() {
    if (!profile?.avatar_url && !avatarPreview) return
    setShowResetAvatarConfirm(true)
  }

  async function executeResetDefaultAvatar() {
    setShowResetAvatarConfirm(false)
    setUploadingAvatar(true)
    try {
      if (onRemoveAvatar) await onRemoveAvatar()
      setAvatarPreview('')
      if (showToast) showToast('Foto profil dikembalikan ke avatar default.')
    } catch (err) {
      if (showToast) showToast('Gagal menghapus avatar: ' + err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSubmitAccountPassword(e) {
    e.preventDefault()
    setAccountPassErr('')
    setAccountPassMsg('')
    if (accountNewPass.length < 8) {
      setAccountPassErr('Password baru minimal 8 karakter.')
      return
    }
    if (accountNewPass !== accountConfirmPass) {
      setAccountPassErr('Konfirmasi password tidak cocok.')
      return
    }
    setAccountPassBusy(true)
    try {
      await onChangeAccountPassword(accountNewPass)
      setAccountPassMsg('Password akun berhasil diperbarui!')
      setAccountNewPass('')
      setAccountConfirmPass('')
    } catch (err) {
      setAccountPassErr(err.message || 'Gagal mengubah password akun.')
    } finally {
      setAccountPassBusy(false)
    }
  }

  // Security PIN change
  async function handleSubmitMasterPassword(e) {
    e.preventDefault()
    setMasterPassErr('')
    setMasterPassMsg('')
    if (!masterCurrentPass || masterCurrentPass.length !== 6) {
      const err = 'Masukkan 6 digit Security PIN saat ini.'
      setMasterPassErr(err)
      if (showToast) showToast(err)
      return
    }
    const check = isWeakPin(masterNewPass)
    if (check.isWeak) {
      setMasterPassErr(check.reason)
      if (showToast) showToast(check.reason)
      return
    }
    if (masterNewPass !== masterConfirmPass) {
      const err = 'Konfirmasi Security PIN baru tidak cocok.'
      setMasterPassErr(err)
      if (showToast) showToast(err)
      return
    }
    if (masterNewPass === masterCurrentPass) {
      const err = 'Security PIN baru harus berbeda dari yang lama.'
      setMasterPassErr(err)
      if (showToast) showToast(err)
      return
    }
    setMasterPassBusy(true)
    try {
      await onChangeMasterPassword(masterCurrentPass, masterNewPass)
      const successMsg = 'Security PIN berhasil diperbarui!'
      setMasterPassMsg(successMsg)
      if (showToast) showToast(successMsg)
      setMasterCurrentPass('')
      setMasterNewPass('')
      setMasterConfirmPass('')
    } catch (err) {
      const errMsg = err.message || 'Gagal mengubah Security PIN.'
      setMasterPassErr(errMsg)
      if (showToast) showToast(errMsg)
    } finally {
      setMasterPassBusy(false)
    }
  }

  function handleCopyRecoveryKey() {
    if (!recoveryKey) return
    navigator.clipboard.writeText(recoveryKey)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 1800)
  }

  const expiringDocs = useMemo(() => {
    return (documents || [])
      .filter((d) => d.expiry_date)
      .map((d) => ({
        ...d,
        audit: checkDocumentExpiry(d)
      }))
      .filter((d) => d.audit !== null)
  }, [documents])

  const initials = (profile?.display_name || user?.email || 'K').slice(0, 1).toUpperCase()

  const CATEGORIES = [
    {
      id: 'preferences',
      label: 'Preferences',
      desc: 'Tema tampilan, gaya visual kartu',
      icon: SlidersHorizontal
    },
    {
      id: 'security',
      label: 'Security & Privacy',
      desc: 'Master Password, biometrik, auto-lock, sesi',
      icon: ShieldCheck
    },
    {
      id: 'backup',
      label: 'Backup & Sync',
      desc: 'Status sinkronisasi, backup terenkripsi, restore',
      icon: Cloud
    },
    {
      id: 'storage',
      label: 'Storage & Data',
      desc: 'Penggunaan penyimpanan, ekspor, impor, hapus data',
      icon: Database
    },
    {
      id: 'notifications',
      label: 'Notifications',
      desc: 'Pengingat masa berlaku dokumen dan aktivitas',
      icon: Bell
    },
    {
      id: 'help',
      label: 'Help & About',
      desc: 'Panduan, FAQ, arsitektur enkripsi, kebijakan',
      icon: HelpCircle
    }
  ]

  return (
    <div className="page-shell narrow-page">
      {/* Category Header or Subpage Header */}
      {activeSubpage ? (
        <section className="hero-row">
          <div>
            <button
              type="button"
              className="drawer-back-btn pill-button mb-xs"
              onClick={() => setActiveSubpage(null)}
            >
              <ArrowLeft size={15} />
              <span>Kembali ke Pengaturan</span>
            </button>
            <h1>{CATEGORIES.find((c) => c.id === activeSubpage)?.label}</h1>
            <p>{CATEGORIES.find((c) => c.id === activeSubpage)?.desc}</p>
          </div>
        </section>
      ) : (
        <section className="hero-row">
          <div>
            <div className="eyebrow">Navigasi Sekunder & Pengaturan</div>
            <h1>Pengaturan Kept</h1>
            <p>Pilih kategori di bawah untuk mengatur preferensi, keamanan, dan akun Anda.</p>
          </div>
        </section>
      )}

      {/* CATEGORY MENU (HUB) */}
      {!activeSubpage && (
        <div className="settings-page-hub">
          {/* User Profile Card */}
          <div
            className="drawer-profile-card ringkas-profile-card"
            onClick={() => setProfileModalOpen(true)}
            role="button"
            tabIndex={0}
            title="Kelola profil akun"
          >
            <div className="drawer-profile-avatar-wrapper">
              <div className="drawer-profile-avatar">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profil" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <button
                type="button"
                className="camera-badge-btn"
                title="Ubah foto profil"
                aria-label="Ubah foto profil"
                onClick={(e) => {
                  e.stopPropagation()
                  setProfileModalOpen(true)
                }}
              >
                <Camera size={12} strokeWidth={2.2} />
              </button>
            </div>
            <div className="drawer-profile-info">
              <div className="drawer-profile-title-row">
                <strong>{profile?.display_name || 'Pengguna Kept'}</strong>
                <span className="security-tag-pill">
                  <ShieldCheck size={11} /> Terenkripsi
                </span>
              </div>
              <span className="drawer-profile-email">{user?.email}</span>
            </div>
            <ChevronRight size={16} className="drawer-arrow" />
          </div>

          {/* Category List Card */}
          <div className="category-menu-card">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  type="button"
                  className="category-menu-row"
                  onClick={() => setActiveSubpage(cat.id)}
                >
                  <div className="category-row-icon">
                    <Icon size={18} strokeWidth={1.8} />
                  </div>
                  <div className="category-row-text">
                    <strong className="category-row-title">{cat.label}</strong>
                    <span className="category-row-desc">{cat.desc}</span>
                  </div>
                  <ChevronRight size={16} className="category-row-chevron" />
                </button>
              )
            })}
          </div>

          {/* Sign Out Button */}
          <div className="drawer-signout-wrap">
            <button
              type="button"
              className="drawer-signout-btn"
              onClick={onSignOut}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* SUBPAGE 1: PREFERENCES */}
      {activeSubpage === 'preferences' && (
        <div className="subpage-page-view">
          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Tampilan</strong>
              <span>Pilih tema yang nyaman untuk mata Anda.</span>
            </div>
            <div className="segmented-grid">
              <button
                type="button"
                className={profile?.theme === 'light' ? 'selected' : ''}
                onClick={() => onTheme('light')}
              >
                <Sun size={15} /> Light
              </button>
              <button
                type="button"
                className={profile?.theme === 'dark' ? 'selected' : ''}
                onClick={() => onTheme('dark')}
              >
                <Moon size={15} /> Dark
              </button>
              <button
                type="button"
                className={profile?.theme === 'system' ? 'selected' : ''}
                onClick={() => onTheme('system')}
              >
                <Laptop size={15} /> System
              </button>
            </div>
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Gaya Kartu Bank</strong>
              <span>Tampilan kartu di dompet digital: Realistis atau digital minimalis.</span>
            </div>
            <div className="segmented">
              <button
                type="button"
                className={profile?.card_style === 'realistic' ? 'selected' : ''}
                onClick={() => onCardStyle('realistic')}
              >
                Realistis
              </button>
              <button
                type="button"
                className={profile?.card_style === 'abstract' ? 'selected' : ''}
                onClick={() => onCardStyle('abstract')}
              >
                Digital Minimalis
              </button>
            </div>
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Animasi Hamburger Menu 🍔</strong>
              <span>Pilih gaya transisi ikon dari hamburger-react.</span>
            </div>
            <div className="segmented-grid three">
              {HAMBURGER_STYLES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={(hamburgerStyle || 'squash') === id ? 'selected' : ''}
                  onClick={() => onHamburgerStyle && onHamburgerStyle(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBPAGE 2: SECURITY & PRIVACY */}
      {activeSubpage === 'security' && (
        <div className="subpage-page-view">
          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Ubah Security PIN</strong>
            </div>
            <form onSubmit={handleSubmitMasterPassword} className="subform-stack">
              <label className="field">
                <span>Security PIN Saat Ini (6 Digit)</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={masterCurrentPass}
                  onChange={(e) => setMasterCurrentPass(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 digit PIN lama"
                  className="font-mono text-center letter-spacing-lg"
                  required
                />
              </label>
              <label className="field">
                <span>Security PIN Baru (6 Digit)</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={masterNewPass}
                  onChange={(e) => setMasterNewPass(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 digit PIN baru"
                  className="font-mono text-center letter-spacing-lg"
                  required
                />
              </label>
              <label className="field">
                <span>Konfirmasi Security PIN Baru</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={masterConfirmPass}
                  onChange={(e) => setMasterConfirmPass(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Ulangi 6 digit PIN baru"
                  className="font-mono text-center letter-spacing-lg"
                  required
                />
              </label>

              {masterPassErr && <div className="feedback error">{masterPassErr}</div>}
              {masterPassMsg && <div className="feedback success">{masterPassMsg}</div>}

              <button className="primary-button pill-button mt-xs" disabled={masterPassBusy}>
                <Lock size={14} />
                {masterPassBusy ? 'Mengenkripsi ulang vault…' : 'Perbarui Security PIN'}
              </button>
            </form>
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Auto-Lock (Kunci Otomatis)</strong>
              <span>Kunci vault secara otomatis saat tidak ada aktivitas pengguna.</span>
            </div>
            <label className="field">
              <span>Waktu Tidak Aktif</span>
              <select
                value={autoLockMinutes}
                onChange={(e) => handleAutoLockChange(e.target.value)}
              >
                <option value="1">1 Menit (Maksimal)</option>
                <option value="5">5 Menit (Rekomendasi)</option>
                <option value="15">15 Menit (Standar)</option>
                <option value="30">30 Menit</option>
                <option value="0">Jangan Pernah</option>
              </select>
            </label>
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Autentikasi Biometrik</strong>
              <span>Touch ID, Windows Hello, atau sensor sidik jari untuk buka vault tanpa password.</span>
            </div>
            {!biometricSupported ? (
              <div className="field-hint">
                Browser atau perangkat ini tidak mendukung WebAuthn biometric authenticator.
              </div>
            ) : (
              <div className="biometric-panel-box">
                <div className="biometric-status-indicator">
                  <span className={biometricEnrolled ? 'status-dot on' : 'status-dot'} />
                  <span>
                    {biometricEnrolled
                      ? 'Biometrik aktif di perangkat ini'
                      : 'Belum diaktifkan di perangkat ini'}
                  </span>
                </div>
                {biometricEnrolled ? (
                  <button
                    type="button"
                    className="secondary-button pill-button"
                    onClick={disableBiometric}
                    disabled={biometricBusy}
                  >
                    Nonaktifkan Biometrik
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary-button pill-button"
                    onClick={enableBiometric}
                    disabled={biometricBusy || !vaultKey}
                  >
                    <Fingerprint size={15} />
                    {biometricBusy ? 'Menunggu sensor…' : 'Aktifkan Biometrik'}
                  </button>
                )}
                {biometricError && <div className="feedback error">{biometricError}</div>}
              </div>
            )}
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Perangkat & Sesi</strong>
              <span>Status enkripsi lokal saat ini.</span>
            </div>
            <div className="session-info-strip">
              <div>
                <strong>Sesi Zero-Knowledge</strong>
                <span>Perangkat: {navigator?.platform || 'Desktop Browser'}</span>
              </div>
              {onLockVault && (
                <button
                  type="button"
                  className="secondary-button pill-button"
                  onClick={onLockVault}
                >
                  <Lock size={14} /> Kunci Vault
                </button>
              )}
            </div>
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Lupa Password & Emergency Recovery</strong>
              <span>Kunci darurat untuk membuka vault jika Anda lupa master password.</span>
            </div>
            {!showRecoveryDetails ? (
              <button
                type="button"
                className="secondary-button pill-button"
                onClick={() => setShowRecoveryDetails(true)}
              >
                <ShieldCheck size={14} /> Lihat Recovery Key
              </button>
            ) : (
              <div className="recovery-details-wrap">
                <p className="field-hint">
                  Simpan kunci ini secara offline di tempat yang aman. Kept tidak menyimpan kunci Anda di server.
                </p>
                {recoveryKey ? (
                  <div className="recovery-display-box">
                    <code className="font-mono recovery-code">{recoveryKey}</code>
                    <div className="button-row mt-sm">
                      <button
                        type="button"
                        className="secondary-button pill-button"
                        onClick={handleCopyRecoveryKey}
                      >
                        {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                        {copiedKey ? 'Tersalin' : 'Salin Kunci'}
                      </button>
                      <button
                        type="button"
                        className="secondary-button pill-button"
                        onClick={onDownloadEmergencySheet}
                      >
                        <Download size={14} /> Unduh Emergency Sheet
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="field-hint">
                    Recovery key belum di-generate untuk sesi ini. Buat ulang saat mengubah master password.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account Password Change */}
          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Password Akun (Login)</strong>
              <span>Password yang digunakan saat login ke akun Kept Anda.</span>
            </div>

            <form onSubmit={handleSubmitAccountPassword} className="subform-stack">
              <label className="field">
                <span>Password Baru (Min 8 Karakter)</span>
                <input
                  type="password"
                  value={accountNewPass}
                  onChange={(e) => setAccountNewPass(e.target.value)}
                  placeholder="Password baru akun"
                  required
                />
              </label>
              <label className="field">
                <span>Konfirmasi Password Baru</span>
                <input
                  type="password"
                  value={accountConfirmPass}
                  onChange={(e) => setAccountConfirmPass(e.target.value)}
                  placeholder="Ulangi password baru"
                  required
                />
              </label>

              {accountPassErr && <div className="feedback error">{accountPassErr}</div>}
              {accountPassMsg && <div className="feedback success">{accountPassMsg}</div>}

              <button className="primary-button pill-button mt-xs" disabled={accountPassBusy}>
                <KeyRound size={14} />
                {accountPassBusy ? 'Memperbarui…' : 'Perbarui Password Akun'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUBPAGE 3: BACKUP & SYNC */}
      {activeSubpage === 'backup' && (
        <div className="subpage-page-view">
          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Status Cadangan Vault</strong>
              <span>Semua entri dilindungi dengan enkripsi AES-256-GCM.</span>
            </div>
            <div className="stat-cards-grid">
              <div className="stat-mini-card">
                <span className="stat-mini-num">{items.length}</span>
                <span className="stat-mini-label">Kredensial Vault</span>
              </div>
              <div className="stat-mini-card">
                <span className="stat-mini-num">{documents.length}</span>
                <span className="stat-mini-label">Dokumen Tersimpan</span>
              </div>
            </div>
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Pemulihan Vault (Restore)</strong>
              <span>Pulihkan vault Anda dari file cadangan terenkripsi (.json).</span>
            </div>
            <button
              type="button"
              className="secondary-button pill-button"
              onClick={onImport}
            >
              <Upload size={14} /> Impor & Pulihkan dari Cadangan
            </button>
          </div>
        </div>
      )}

      {/* SUBPAGE 4: STORAGE & DATA */}
      {activeSubpage === 'storage' && (
        <div className="subpage-page-view">
          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Kapasitas & Penyimpanan Lokal</strong>
              <span>Data terenkripsi disimpan lokal di IndexedDB perangkat ini.</span>
            </div>
            <div className="storage-meter-box">
              <div className="storage-meter-bar">
                <div className="storage-meter-fill" style={{ width: '28%' }} />
              </div>
              <div className="storage-meta-row">
                <span>Database: IndexedDB (Aktif)</span>
                <span>Total {items.length + documents.length} Entri</span>
              </div>
            </div>
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Ekspor & Impor Data</strong>
              <span>Unduh salinan aman atau pindahkan data dari aplikasi lain.</span>
            </div>
            <div className="button-col-stack">
              <button
                type="button"
                className="secondary-button pill-button"
                onClick={onExport}
              >
                <Download size={14} /> Ekspor Cadangan Terenkripsi (.json)
              </button>
              <button
                type="button"
                className="secondary-button pill-button"
                onClick={onImport}
              >
                <Upload size={14} /> Impor File CSV / Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBPAGE 5: NOTIFICATIONS */}
      {activeSubpage === 'notifications' && (
        <div className="subpage-page-view">
          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Pengingat Masa Berlaku Dokumen</strong>
              <span>
                Kept otomatis mendeteksi tanggal "Berlaku Sampai" pada KTP, SIM, Paspor, BPJS, STNK, dan dokumen lainnya.
              </span>
            </div>
            <div className="toggle-list">
              <label className="toggle-row">
                <div>
                  <strong>Pengingat 90 Hari Sebelumnya</strong>
                  <span>Direkomendasikan untuk Paspor dan Visa luar negeri.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyPrefs.d90}
                  onChange={() => toggleNotifyPref('d90')}
                />
              </label>

              <label className="toggle-row">
                <div>
                  <strong>Pengingat 30 Hari Sebelumnya</strong>
                  <span>Ideal untuk perpanjangan SIM, STNK, dan asuransi.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyPrefs.d30}
                  onChange={() => toggleNotifyPref('d30')}
                />
              </label>

              <label className="toggle-row">
                <div>
                  <strong>Pengingat 7 Hari Sebelumnya</strong>
                  <span>Peringatan mendesak sebelum masa berlaku habis.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyPrefs.d7}
                  onChange={() => toggleNotifyPref('d7')}
                />
              </label>

              <label className="toggle-row">
                <div>
                  <strong>Peringatan Dokumen Kedaluwarsa</strong>
                  <span>Peringatan saat masa berlaku dokumen telah terlewati.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyPrefs.expired}
                  onChange={() => toggleNotifyPref('expired')}
                />
              </label>
            </div>
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Notifikasi Browser</strong>
              <span>Terima pemberitahuan langsung di perangkat Anda.</span>
            </div>
            <div className="notification-permission-box">
              <div className="permission-status">
                <span>
                  Status Izin:{' '}
                  <strong>
                    {browserPermission === 'granted'
                      ? 'Diizinkan (Aktif)'
                      : browserPermission === 'denied'
                      ? 'Ditolak'
                      : 'Belum Diatur'}
                  </strong>
                </span>
              </div>
              {browserPermission !== 'granted' && (
                <button
                  type="button"
                  className="secondary-button pill-button"
                  onClick={requestNotificationPermission}
                >
                  <Bell size={14} /> Minta Izin Notifikasi Browser
                </button>
              )}
            </div>
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Dokumen yang Sedang Dipantau ({expiringDocs.length})</strong>
              <span>Dokumen dengan tanggal Berlaku Sampai aktif.</span>
            </div>
            {expiringDocs.length === 0 ? (
              <div className="field-hint">
                Belum ada dokumen dengan tanggal kedaluwarsa. Isi tanggal "Berlaku Sampai" saat menambah dokumen untuk memantau otomatis.
              </div>
            ) : (
              <div className="monitored-docs-list">
                {expiringDocs.map((doc) => (
                  <div key={doc.id} className="monitored-doc-row">
                    <div>
                      <strong>{doc.name}</strong>
                      <span className="doc-owner-caption">
                        {doc.owner_name || 'Dokumen Resmi'} · Sampai: {doc.expiry_date}
                      </span>
                    </div>
                    <span className={`doc-expiry-chip ${doc.audit?.status}`}>
                      {doc.audit?.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}



      {/* SUBPAGE 7: HELP & ABOUT */}
      {activeSubpage === 'help' && (
        <div className="subpage-page-view">
          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Tentang Kept</strong>
              <span>Private Vault & Identity Wallet Indonesia</span>
            </div>
            <div className="about-info-stack">
              <div className="about-info-item">
                <span>Versi Aplikasi:</span>
                <strong>v0.1.0 (Production Ready)</strong>
              </div>
              <div className="about-info-item">
                <span>Design System:</span>
                <strong>Omarchy (Light-first minimalis)</strong>
              </div>
              <div className="about-info-item">
                <span>Tipografi:</span>
                <strong>Geist Variable & JetBrains Mono</strong>
              </div>
              <div className="about-info-item">
                <span>Standar Kriptografi:</span>
                <strong>AES-256-GCM + PBKDF2 (100k rounds)</strong>
              </div>
            </div>
          </div>

          <div className="subpage-card">
            <div className="subpage-card-heading">
              <strong>Arsitektur Keamanan Zero-Knowledge</strong>
              <span>Bagaimana data Anda dilindungi:</span>
            </div>
            <p className="about-text-body">
              1. <strong>Enkripsi Lokal:</strong> Seluruh password, detail kartu perbankan, dan scan dokumen resmi dienkripsi secara lokal di perangkat Anda sebelum dikirim ke internet.
            </p>
            <p className="about-text-body">
              2. <strong>Tidak Menyimpan Master Password:</strong> Server Supabase kami tidak pernah menerima, mengetahui, atau menyimpan master password Anda.
            </p>
            <p className="about-text-body">
              3. <strong>Hanya Ciphertext:</strong> Jika database kami mengalami kebocoran data, penyerang hanya melihat ciphertext acak tanpa kunci enkripsi.
            </p>
          </div>
        </div>
      )}

      {/* Profile & Avatar Management Modal */}
      {profileModalOpen && (
        <div className="profile-modal-backdrop" onMouseDown={() => setProfileModalOpen(false)}>
          <div
            className="profile-modal-sheet"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Kelola Profil dan Foto"
          >
            <div className="profile-modal-header">
              <div>
                <h3>Foto & Nama Pengguna</h3>
                <p>{user?.email}</p>
              </div>
              <button
                type="button"
                className="icon-button close-btn"
                onClick={() => setProfileModalOpen(false)}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="profile-modal-body">
              {/* Hidden Inputs for Camera and Gallery */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />

              <div className="avatar-mockup-container">
                <div className="avatar-hero-display">
                  <div className="avatar-hero-circle">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Foto Profil" />
                    ) : (
                      <User size={36} strokeWidth={1.5} className="avatar-hero-placeholder-icon" />
                    )}
                  </div>
                  <div className="avatar-hero-status-title">
                    {avatarPreview ? 'Foto profil aktif' : 'Belum ada foto'}
                  </div>
                  <div className="avatar-hero-status-desc">
                    {avatarPreview
                      ? 'Foto tersimpan di storage privat dan dimuat dengan signed URL aman.'
                      : 'Tampilkan avatar default sampai pengguna mengunggah foto.'}
                  </div>
                </div>

                <div className="avatar-options-card">
                  <button
                    type="button"
                    className="avatar-option-item"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    <div className="avatar-option-icon">
                      <Camera size={18} strokeWidth={1.8} />
                    </div>
                    <div className="avatar-option-text">
                      <strong className="avatar-option-title">Ambil Foto</strong>
                      <span className="avatar-option-desc">
                        Menggunakan kamera jika perangkat mendukungnya.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="avatar-option-item"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    <div className="avatar-option-icon">
                      <Image size={18} strokeWidth={1.8} />
                    </div>
                    <div className="avatar-option-text">
                      <strong className="avatar-option-title">Pilih dari Galeri</strong>
                      <span className="avatar-option-desc">
                            Mengunggah foto yang sudah tersedia.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="avatar-option-item"
                    onClick={handleResetDefaultAvatar}
                    disabled={uploadingAvatar || !avatarPreview}
                  >
                    <div className="avatar-option-icon">
                      <User size={18} strokeWidth={1.8} />
                    </div>
                    <div className="avatar-option-text">
                      <strong className="avatar-option-title">Avatar Default</strong>
                      <span className="avatar-option-desc">
                        Kembali menggunakan avatar bawaan.
                      </span>
                    </div>
                  </button>
                </div>

                <div className="avatar-synced-pill-wrap">
                  <div className="avatar-synced-pill">
                    <Check size={12} strokeWidth={2.5} /> Foto tersimpan dan tersinkron
                  </div>
                </div>
              </div>

              <div className="form-grid mt-md">
                <label className="field">
                  <span>Nama Tampilan</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama Anda"
                  />
                </label>
              </div>

              <div className="profile-modal-actions mt-sm">
                <button
                  type="button"
                  className="primary-button pill-button w-full"
                  onClick={async () => {
                    if (onSaveProfile) {
                      await onSaveProfile({ display_name: name })
                    }
                    setProfileModalOpen(false)
                  }}
                >
                  Simpan Profil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <AvatarCropModal
          isOpen={cropModalOpen}
          imageSrc={selectedImageSrc}
          onClose={() => {
            setCropModalOpen(false)
            setSelectedImageSrc(null)
          }}
          onCropComplete={handleCropComplete}
        />
      </Suspense>

      {showResetAvatarConfirm && (
        <ConfirmToast
          message="Kembalikan foto profil ke avatar default?"
          confirmLabel="Hapus Foto"
          cancelLabel="Batal"
          onConfirm={executeResetDefaultAvatar}
          onCancel={() => setShowResetAvatarConfirm(false)}
        />
      )}
    </div>
  )
}