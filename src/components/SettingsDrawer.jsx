import { useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { safeLazy } from '../lib/safeLazy'
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
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Camera,
  Trash2,
  Image,
  Flame
} from './Icons'

const AvatarCropModal = safeLazy(() => import('./AvatarCropModal'))
import AnimatedHamburger, { HAMBURGER_STYLES } from './AnimatedHamburger'
import PwaInstallCard from './PwaInstallCard'
import TrashManager from './TrashManager'
import { haptic } from '../lib/haptics'
import { getTranslation } from '../lib/i18n'

import {
  enrollBiometric,
  hasBiometricEnrollment,
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  removeBiometricRecord
} from '../lib/biometric'
import { checkDocumentExpiry } from '../lib/documents'
import { isWeakPin } from '../lib/securityAudit'

export default function SettingsDrawer({
  isOpen,
  onClose,
  activeSubpage: externalActiveSubpage,
  onSubpageChange: externalOnSubpageChange,
  profile,
  user,
  vaultKey,
  items = [],
  documents = [],
  trashedItems = [],
  onRestoreItem,
  onPermanentDelete,
  onEmptyTrash,
  privacyMaskEnabled = true,
  onTogglePrivacyMask,
  installPrompt,
  onPromptInstall,
  onOpenShareSecret,
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
  onHamburgerStyle,
  lang = 'id',
  onLanguage
}) {
  const t = (k) => getTranslation(k, lang)
  const [internalActiveSubpage, setInternalActiveSubpage] = useState(null)
  const activeSubpage = externalActiveSubpage !== undefined ? externalActiveSubpage : internalActiveSubpage
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  function handleSetSubpage(sub) {
    setInternalActiveSubpage(sub)
    if (externalOnSubpageChange) externalOnSubpageChange(sub)
  }

  // Profile form state
  const [name, setName] = useState(profile?.display_name || '')
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [selectedImageSrc, setSelectedImageSrc] = useState(null)
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

  // Reset subpage when drawer reopens
  useEffect(() => {
    if (!isOpen) {
      setInternalActiveSubpage(null)
      setProfileModalOpen(false)
    }
  }, [isOpen])

  // Tap Escape key to go back or close
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (activeSubpage) {
          handleSetSubpage(null)
        } else {
          onClose?.()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeSubpage, onClose])

  // Save notification prefs
  function toggleNotifyPref(key) {
    const updated = { ...notifyPrefs, [key]: !notifyPrefs[key] }
    setNotifyPrefs(updated)
    localStorage.setItem('kept_doc_notify_prefs', JSON.stringify(updated))
  }

  // Request browser notification
  async function requestNotificationPermission() {
    if (typeof Notification === 'undefined') return
    try {
      const permission = await Notification.requestPermission()
      setBrowserPermission(permission)
    } catch {
      // ignore
    }
  }

  // Handle autolock change
  function handleAutoLockChange(mins) {
    setAutoLockMinutes(mins)
    localStorage.setItem('kept_autolock_minutes', mins)
  }

  // Handle Accent change
  function handleAccentChange(hex) {
    setAccentColor(hex)
    localStorage.setItem('kept_accent_color', hex)
    document.documentElement.style.setProperty('--t-brand-accent', hex)
  }

  // Biometric actions
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

  async function handleResetDefaultAvatar() {
    if (!profile?.avatar_url && !avatarPreview) return
    if (!confirm('Kembalikan foto profil ke avatar default?')) return
    setUploadingAvatar(true)
    try {
      if (onRemoveAvatar) await onRemoveAvatar()
      setAvatarPreview('')
    } catch (err) {
      alert('Gagal menghapus avatar: ' + err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Account password change
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

  // Filter documents with expiry date
  const expiringDocs = useMemo(() => {
    return documents
      .filter((d) => d.expiry_date)
      .map((d) => ({
        ...d,
        audit: checkDocumentExpiry(d)
      }))
      .filter((d) => d.audit !== null)
  }, [documents])

  if (!isOpen) return null

  const initials = (profile?.display_name || user?.email || 'K').slice(0, 1).toUpperCase()

  const CATEGORIES = [
    {
      id: 'preferences',
      label: t('menu_preferences'),
      desc: t('menu_preferences_desc'),
      icon: SlidersHorizontal
    },
    {
      id: 'security',
      label: t('menu_security'),
      desc: t('menu_security_desc'),
      icon: ShieldCheck
    },
    {
      id: 'backup',
      label: t('menu_backup'),
      desc: t('menu_backup_desc'),
      icon: Cloud
    },
    {
      id: 'storage',
      label: t('menu_storage'),
      desc: t('menu_storage_desc'),
      icon: Database
    },
    {
      id: 'notifications',
      label: t('menu_notifications'),
      desc: t('menu_notifications_desc'),
      icon: Bell
    },
    {
      id: 'trash',
      label: t('menu_trash'),
      desc: `${trashedItems.length} ` + (lang === 'id' ? 'item di tempat sampah' : 'items in recycle bin'),
      icon: Trash2,
      badge: trashedItems.length > 0 ? trashedItems.length : null
    },
    {
      id: 'help',
      label: t('menu_help'),
      desc: t('menu_help_desc'),
      icon: HelpCircle
    }
  ]

  return (
    <div
      className="settings-drawer-backdrop"
      onClick={onClose}
      onMouseDown={onClose}
    >
      <aside
        className="settings-drawer"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="Pengaturan dan Navigasi Sekunder"
      >
        {/* Top Tap Bar (Clean tap-to-dismiss handle) */}
        <div
          className="drawer-tap-bar"
          onClick={onClose}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClose()
            }
          }}
          title="Ketuk bar untuk menutup"
          aria-label="Ketuk bar untuk menutup menu"
        >
          <div className="drawer-tap-pill" />
        </div>

        {/* Drawer Header */}
        <div className="drawer-header">
          {activeSubpage ? (
            <div className="drawer-header-left">
              <button
                type="button"
                className="drawer-back-btn pill-button"
                onClick={() => handleSetSubpage(null)}
                aria-label={t('nav_back')}
              >
                <ArrowLeft size={15} />
                <span>{t('nav_back')}</span>
              </button>
              <h3 className="drawer-subpage-title">
                {CATEGORIES.find((c) => c.id === activeSubpage)?.label}
              </h3>
            </div>
          ) : (
            <div className="drawer-header-left">
              <h3 className="drawer-title">{t('menu_title')}</h3>
            </div>
          )}

          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label={t('action_close')}
            title={t('action_close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-body">
          {/* CATEGORY MENU (HUB) */}
          {!activeSubpage && (
            <div className="drawer-hub-view">
              {/* User Profile Card */}
              <div
                className="drawer-profile-card ringkas-profile-card"
                onClick={() => setProfileModalOpen(true)}
                role="button"
                tabIndex={0}
                title={t('profile_edit_hint')}
              >
                <div className="drawer-profile-avatar-wrapper">
                  <div className="drawer-profile-avatar">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={t('profile_manage')} />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="camera-badge-btn"
                    title={t('profile_edit_hint')}
                    aria-label={t('profile_edit_hint')}
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
                    <strong>{profile?.display_name || (lang === 'id' ? 'Pengguna Kept' : 'Kept User')}</strong>
                    <span className="security-tag-pill">
                      <ShieldCheck size={11} /> {t('encrypted')}
                    </span>
                  </div>
                  <span className="drawer-profile-email">{user?.email}</span>
                </div>
                <ChevronRight size={16} className="drawer-arrow" />
              </div>

              {/* Category Rows matching User Mockup */}
              <div className="category-menu-card">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className="category-menu-row"
                      onClick={() => handleSetSubpage(cat.id)}
                    >
                      <div className="category-row-icon">
                        <Icon size={18} strokeWidth={1.8} />
                      </div>
                      <div className="category-row-text">
                        <div className="flex items-center gap-xs">
                          <strong className="category-row-title">{cat.label}</strong>
                          {cat.badge && (
                            <span className="category-row-badge">{cat.badge}</span>
                          )}
                        </div>
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
                  onClick={() => {
                    onClose()
                    onSignOut()
                  }}
                >
                  <LogOut size={16} />
                  <span>{t('sign_out')}</span>
                </button>
              </div>
            </div>
          )}

          {/* SUBPAGE 1: PREFERENCES */}
          {activeSubpage === 'preferences' && (
            <div className="drawer-subpage-view">
              <p className="subpage-lead-desc">
                {t('pref_lead')}
              </p>

              {/* Language Selector */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('pref_language')}</strong>
                  <span>{t('pref_language_desc')}</span>
                </div>

                <div className="language-selector-grid">
                  <button
                    type="button"
                    className={`language-pill-btn ${lang === 'id' ? 'selected' : ''}`}
                    onClick={() => {
                      haptic('light')
                      if (onLanguage) onLanguage('id')
                    }}
                  >
                    <span>🇮🇩</span>
                    <span>{t('lang_id')}</span>
                  </button>
                  <button
                    type="button"
                    className={`language-pill-btn ${lang === 'en' ? 'selected' : ''}`}
                    onClick={() => {
                      haptic('light')
                      if (onLanguage) onLanguage('en')
                    }}
                  >
                    <span>🇬🇧</span>
                    <span>{t('lang_en')}</span>
                  </button>
                </div>
              </div>

              {/* Theme Selector (Dark / Light) */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('pref_theme')}</strong>
                  <span>{t('pref_theme_desc')}</span>
                </div>
                <div className="segmented">
                  <button
                    type="button"
                    className={profile?.theme !== 'light' ? 'selected' : ''}
                    onClick={() => {
                      haptic('light')
                      if (onTheme) onTheme('dark')
                    }}
                  >
                    <Moon size={15} />
                    <span>{t('theme_dark')}</span>
                  </button>
                  <button
                    type="button"
                    className={profile?.theme === 'light' ? 'selected' : ''}
                    onClick={() => {
                      haptic('light')
                      if (onTheme) onTheme('light')
                    }}
                  >
                    <Sun size={15} />
                    <span>{t('theme_light')}</span>
                  </button>
                </div>
              </div>

              {/* Card Style */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('pref_card_style_title')}</strong>
                  <span>{t('pref_card_style_desc')}</span>
                </div>

                <div className="segmented">
                  <button
                    type="button"
                    className={profile?.card_style === 'realistic' ? 'selected' : ''}
                    onClick={() => onCardStyle('realistic')}
                  >
                    {t('pref_card_realistic')}
                  </button>
                  <button
                    type="button"
                    className={profile?.card_style === 'abstract' ? 'selected' : ''}
                    onClick={() => onCardStyle('abstract')}
                  >
                    {t('pref_card_minimal')}
                  </button>
                </div>
              </div>

              {/* Animated Hamburger Style */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('pref_hamburger_title')}</strong>
                  <span>{t('pref_hamburger_desc')}</span>
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

              {/* PWA Home Screen Education Card */}
              <PwaInstallCard
                t={t}
                lang={lang}
                installPrompt={installPrompt}
                onPromptInstall={onPromptInstall}
              />
            </div>
          )}

          {/* SUBPAGE 2: SECURITY & PRIVACY */}
          {activeSubpage === 'security' && (
            <div className="drawer-subpage-view">
              <p className="subpage-lead-desc">
                {t('sec_lead')}
              </p>

              {/* Change Security PIN */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('sec_pin_title')}</strong>
                </div>

                <form onSubmit={handleSubmitMasterPassword} className="subform-stack">
                  <label className="field">
                    <span>{t('sec_pin_current')}</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={masterCurrentPass}
                      onChange={(e) => setMasterCurrentPass(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('sec_pin_current_ph')}
                      className="font-mono text-center letter-spacing-lg"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{t('sec_pin_new')}</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={masterNewPass}
                      onChange={(e) => setMasterNewPass(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('sec_pin_new_ph')}
                      className="font-mono text-center letter-spacing-lg"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{t('sec_pin_confirm')}</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={masterConfirmPass}
                      onChange={(e) => setMasterConfirmPass(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('sec_pin_confirm_ph')}
                      className="font-mono text-center letter-spacing-lg"
                      required
                    />
                  </label>

                  {masterPassErr && <div className="feedback error">{masterPassErr}</div>}
                  {masterPassMsg && <div className="feedback success">{masterPassMsg}</div>}

                  <button className="primary-button pill-button mt-xs" disabled={masterPassBusy}>
                    <Lock size={14} />
                    {masterPassBusy ? t('sec_pin_encrypting') : t('sec_pin_btn')}
                  </button>
                </form>
              </div>

              {/* Auto-Lock Setting */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('sec_autolock_title')}</strong>
                  <span>{t('sec_autolock_desc')}</span>
                </div>

                <label className="field">
                  <span>{t('sec_autolock_label')}</span>
                  <select
                    value={autoLockMinutes}
                    onChange={(e) => handleAutoLockChange(e.target.value)}
                  >
                    <option value="1">{t('sec_autolock_1m')}</option>
                    <option value="5">{t('sec_autolock_5m')}</option>
                    <option value="15">{t('sec_autolock_15m')}</option>
                    <option value="30">{t('sec_autolock_30m')}</option>
                    <option value="0">{t('sec_autolock_never')}</option>
                  </select>
                </label>
              </div>

              {/* Biometric */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('sec_biometric_title')}</strong>
                  <span>{t('sec_biometric_desc')}</span>
                </div>

                {!biometricSupported ? (
                  <div className="field-hint">
                    {t('sec_biometric_unsupported')}
                  </div>
                ) : (
                  <div className="biometric-panel-box">
                    <div className="biometric-status-indicator">
                      <span className={biometricEnrolled ? 'status-dot on' : 'status-dot'} />
                      <span>
                        {biometricEnrolled
                          ? t('sec_biometric_active')
                          : t('sec_biometric_inactive')}
                      </span>
                    </div>

                    {biometricEnrolled ? (
                      <button
                        type="button"
                        className="secondary-button pill-button"
                        onClick={disableBiometric}
                        disabled={biometricBusy}
                      >
                        {t('sec_biometric_disable')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="secondary-button pill-button"
                        onClick={enableBiometric}
                        disabled={biometricBusy || !vaultKey}
                      >
                        <Fingerprint size={15} />
                        {biometricBusy ? t('sec_biometric_waiting') : t('sec_biometric_enable')}
                      </button>
                    )}

                    {biometricError && <div className="feedback error">{biometricError}</div>}
                  </div>
                )}
              </div>

              {/* App Switcher Privacy Mask */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('sec_privacy_mask_title')}</strong>
                  <span>{t('sec_privacy_mask_desc')}</span>
                </div>
                <label className="toggle-row">
                  <div>
                    <strong>{lang === 'id' ? 'Proteksi App Switcher' : 'App Switcher Privacy Mask'}</strong>
                    <span>
                      {lang === 'id'
                        ? 'Samarkan layar brankas saat berpindah aplikasi atau multitasking'
                        : 'Blur vault screen when switching apps'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacyMaskEnabled}
                    onChange={(e) => onTogglePrivacyMask && onTogglePrivacyMask(e.target.checked)}
                  />
                </label>
              </div>

              {/* Tautan Berbagi Rahasia */}
              {onOpenShareSecret && (
                <button
                  type="button"
                  className="drawer-action-card secure-share-card"
                  onClick={() => {
                    onClose()
                    onOpenShareSecret()
                  }}
                >
                  <div className="drawer-action-icon flame-icon">
                    <Flame size={17} />
                  </div>
                  <div className="drawer-action-text">
                    <strong>{t('share_secret_menu_title')}</strong>
                    <span>{t('share_secret_btn')}</span>
                  </div>
                  <ChevronRight size={16} className="drawer-arrow" />
                </button>
              )}

              {/* Perangkat & Sesi */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('sec_device_title')}</strong>
                  <span>{t('sec_device_desc')}</span>
                </div>

                <div className="session-info-strip">
                  <div>
                    <strong>{t('sec_zk_session')}</strong>
                    <span>{t('sec_device_prefix')} {navigator?.platform || 'Desktop Browser'}</span>
                  </div>
                  {onLockVault && (
                    <button
                      type="button"
                      className="secondary-button pill-button"
                      onClick={() => {
                        onClose()
                        onLockVault()
                      }}
                    >
                      <Lock size={14} /> {t('sec_lock_vault')}
                    </button>
                  )}
                </div>
              </div>

              {/* Emergency Recovery Key */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('sec_recovery_title')}</strong>
                  <span>{t('sec_recovery_desc')}</span>
                </div>

                {!showRecoveryDetails ? (
                  <button
                    type="button"
                    className="secondary-button pill-button"
                    onClick={() => setShowRecoveryDetails(true)}
                  >
                    <ShieldCheck size={14} /> {t('sec_recovery_view')}
                  </button>
                ) : (
                  <div className="recovery-details-wrap">
                    <p className="field-hint">
                      {t('sec_recovery_hint')}
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
                            {copiedKey ? t('sec_recovery_copied') : t('sec_recovery_copy')}
                          </button>
                          <button
                            type="button"
                            className="secondary-button pill-button"
                            onClick={onDownloadEmergencySheet}
                          >
                            <Download size={14} /> {t('sec_recovery_download')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="field-hint">
                        {t('sec_recovery_unavail')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Account Password Change */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('sec_acc_pass_title')}</strong>
                  <span>{t('sec_acc_pass_desc')}</span>
                </div>

                <form onSubmit={handleSubmitAccountPassword} className="subform-stack">
                  <label className="field">
                    <span>{t('sec_acc_pass_new')}</span>
                    <input
                      type="password"
                      value={accountNewPass}
                      onChange={(e) => setAccountNewPass(e.target.value)}
                      placeholder={t('sec_acc_pass_new_ph')}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{t('sec_acc_pass_confirm')}</span>
                    <input
                      type="password"
                      value={accountConfirmPass}
                      onChange={(e) => setAccountConfirmPass(e.target.value)}
                      placeholder={t('sec_acc_pass_confirm_ph')}
                      required
                    />
                  </label>

                  {accountPassErr && <div className="feedback error">{accountPassErr}</div>}
                  {accountPassMsg && <div className="feedback success">{accountPassMsg}</div>}

                  <button className="secondary-button pill-button mt-xs" disabled={accountPassBusy}>
                    <KeyRound size={14} />
                    {accountPassBusy ? t('sec_acc_pass_saving') : t('sec_acc_pass_btn')}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SUBPAGE 3: BACKUP & SYNC */}
          {activeSubpage === 'backup' && (
            <div className="drawer-subpage-view">
              <p className="subpage-lead-desc">
                {t('backup_lead')}
              </p>

              {/* Backup Status */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('backup_status_title')}</strong>
                  <span>{t('backup_status_desc')}</span>
                </div>

                <div className="stat-cards-grid">
                  <div className="stat-mini-card">
                    <span className="stat-mini-num">{items.length}</span>
                    <span className="stat-mini-label">{t('backup_vault_creds')}</span>
                  </div>
                  <div className="stat-mini-card">
                    <span className="stat-mini-num">{documents.length}</span>
                    <span className="stat-mini-label">{t('backup_stored_docs')}</span>
                  </div>
                </div>
              </div>

              {/* Export Backup Card */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('backup_export_card_title')}</strong>
                  <span>{t('backup_export_card_desc')}</span>
                </div>

                <button
                  type="button"
                  className="primary-button pill-button"
                  onClick={() => {
                    onClose()
                    onExport()
                  }}
                >
                  <Download size={14} /> {t('backup_export_btn')}
                </button>
              </div>

              {/* Restore */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('backup_restore_title')}</strong>
                  <span>{t('backup_restore_desc')}</span>
                </div>

                <button
                  type="button"
                  className="secondary-button pill-button"
                  onClick={() => {
                    onClose()
                    onImport()
                  }}
                >
                  <Upload size={14} /> {t('backup_restore_btn')}
                </button>
              </div>
            </div>
          )}

          {/* SUBPAGE 4: STORAGE & DATA */}
          {activeSubpage === 'storage' && (
            <div className="drawer-subpage-view">
              <p className="subpage-lead-desc">
                {t('storage_lead')}
              </p>

              {/* Storage Capacity */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('storage_capacity_title')}</strong>
                  <span>{t('storage_capacity_desc')}</span>
                </div>

                <div className="storage-meter-box">
                  <div className="storage-meter-bar">
                    <div className="storage-meter-fill" style={{ width: '28%' }} />
                  </div>
                  <div className="storage-meta-row">
                    <span>{t('storage_db_active')}</span>
                    <span>{t('storage_total_entries')} {items.length + documents.length}</span>
                  </div>
                </div>
              </div>

              {/* Export & Import */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('storage_export_import_title')}</strong>
                  <span>{t('storage_export_import_desc')}</span>
                </div>

                <div className="button-col-stack">
                  <button
                    type="button"
                    className="secondary-button pill-button"
                    onClick={onExport}
                  >
                    <Download size={14} /> {t('storage_export_btn')}
                  </button>

                  <button
                    type="button"
                    className="secondary-button pill-button"
                    onClick={() => {
                      onClose()
                      onImport()
                    }}
                  >
                    <Upload size={14} /> {t('storage_import_btn')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUBPAGE 5: NOTIFICATIONS */}
          {activeSubpage === 'notifications' && (
            <div className="drawer-subpage-view">
              <p className="subpage-lead-desc">
                {t('notif_lead')}
              </p>

              {/* Expiry Reminders Config */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('notif_expiry_title')}</strong>
                  <span>{t('notif_expiry_desc')}</span>
                </div>

                <div className="toggle-list">
                  <label className="toggle-row">
                    <div>
                      <strong>{t('notif_d90_label')}</strong>
                      <span>{t('notif_d90_desc')}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyPrefs.d90}
                      onChange={() => toggleNotifyPref('d90')}
                    />
                  </label>

                  <label className="toggle-row">
                    <div>
                      <strong>{t('notif_d30_label')}</strong>
                      <span>{t('notif_d30_desc')}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyPrefs.d30}
                      onChange={() => toggleNotifyPref('d30')}
                    />
                  </label>

                  <label className="toggle-row">
                    <div>
                      <strong>{t('notif_d7_label')}</strong>
                      <span>{t('notif_d7_desc')}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyPrefs.d7}
                      onChange={() => toggleNotifyPref('d7')}
                    />
                  </label>

                  <label className="toggle-row">
                    <div>
                      <strong>{t('notif_expired_label')}</strong>
                      <span>{t('notif_expired_desc')}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyPrefs.expired}
                      onChange={() => toggleNotifyPref('expired')}
                    />
                  </label>
                </div>
              </div>

              {/* Browser Push Permission */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('notif_browser_title')}</strong>
                  <span>{t('notif_browser_desc')}</span>
                </div>

                <div className="notification-permission-box">
                  <div className="permission-status">
                    <span>
                      {t('notif_status_label')}{' '}
                      <strong>
                        {browserPermission === 'granted'
                          ? t('notif_status_granted')
                          : browserPermission === 'denied'
                          ? t('notif_status_denied')
                          : t('notif_status_default')}
                      </strong>
                    </span>
                  </div>

                  {browserPermission !== 'granted' && (
                    <button
                      type="button"
                      className="secondary-button pill-button"
                      onClick={requestNotificationPermission}
                    >
                      <Bell size={14} /> {t('notif_req_btn')}
                    </button>
                  )}
                </div>
              </div>

              {/* Monitored Documents List */}
              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('notif_monitored_title')} ({expiringDocs.length})</strong>
                  <span>{t('notif_monitored_desc')}</span>
                </div>

                {expiringDocs.length === 0 ? (
                  <div className="field-hint">
                    {t('notif_monitored_empty')}
                  </div>
                ) : (
                  <div className="monitored-docs-list">
                    {expiringDocs.map((doc) => (
                      <div key={doc.id} className="monitored-doc-row">
                        <div>
                          <strong>{doc.name}</strong>
                          <span className="doc-owner-caption">
                            {doc.owner_name || (lang === 'id' ? 'Dokumen Resmi' : 'Official Document')} · {doc.expiry_date}
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

          {/* SUBPAGE: TRASH & RECYCLE BIN */}
          {activeSubpage === 'trash' && (
            <div className="drawer-subpage-view">
              <TrashManager
                trashedItems={trashedItems}
                onRestoreItem={onRestoreItem}
                onPermanentDelete={onPermanentDelete}
                onEmptyTrash={onEmptyTrash}
                lang={lang}
              />
            </div>
          )}

          {/* SUBPAGE 7: HELP & ABOUT */}
          {activeSubpage === 'help' && (
            <div className="drawer-subpage-view">
              <p className="subpage-lead-desc">
                {t('help_lead')}
              </p>

              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('help_about_title')}</strong>
                  <span>{t('help_about_desc')}</span>
                </div>
                <div className="about-info-stack">
                  <div className="about-info-item">
                    <span>{t('help_version_label')}</span>
                    <strong>v0.1.0 (Production Ready)</strong>
                  </div>
                  <div className="about-info-item">
                    <span>Design System:</span>
                    <strong>Omarchy (Light-first minimalis)</strong>
                  </div>
                  <div className="about-info-item">
                    <span>{lang === 'id' ? 'Tipografi:' : 'Typography:'}</span>
                    <strong>Geist Variable & JetBrains Mono</strong>
                  </div>
                  <div className="about-info-item">
                    <span>{lang === 'id' ? 'Standar Kriptografi:' : 'Cryptography Standard:'}</span>
                    <strong>AES-256-GCM + PBKDF2 (100k rounds)</strong>
                  </div>
                </div>
              </div>

              <div className="subpage-card">
                <div className="subpage-card-heading">
                  <strong>{t('help_zk_title')}</strong>
                  <span>{t('help_zk_how')}</span>
                </div>
                <p className="about-text-body">
                  {t('help_zk_step1')}
                </p>
                <p className="about-text-body">
                  {t('help_zk_step2')}
                </p>
                <p className="about-text-body">
                  {t('help_zk_step3')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Profile & Avatar Management Modal */}
        {profileModalOpen && (
            <div className="profile-modal-backdrop" onMouseDown={() => setProfileModalOpen(false)}>
              <div
                className="profile-modal-sheet"
                onMouseDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={t('profile_modal_title')}
              >
                <div className="profile-modal-header">
                  <div>
                    <h3>{t('profile_modal_title')}</h3>
                    <p>{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    className="icon-button close-btn"
                    onClick={() => setProfileModalOpen(false)}
                    aria-label={t('action_close')}
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
                          <img src={avatarPreview} alt={t('profile_modal_title')} />
                        ) : (
                          <User size={36} strokeWidth={1.5} className="avatar-hero-placeholder-icon" />
                        )}
                      </div>
                      <div className="avatar-hero-status-title">
                        {avatarPreview ? t('profile_active_photo') : t('profile_no_photo')}
                      </div>
                      <div className="avatar-hero-status-desc">
                        {avatarPreview
                          ? t('profile_photo_desc_on')
                          : t('profile_photo_desc_off')}
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
                          <strong className="avatar-option-title">{t('profile_take_photo')}</strong>
                          <span className="avatar-option-desc">
                            {t('profile_take_photo_desc')}
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
                          <strong className="avatar-option-title">{t('profile_pick_gallery')}</strong>
                          <span className="avatar-option-desc">
                            {t('profile_pick_gallery_desc')}
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
                          <strong className="avatar-option-title">{t('profile_default_avatar')}</strong>
                          <span className="avatar-option-desc">
                            {t('profile_default_avatar_desc')}
                          </span>
                        </div>
                      </button>
                    </div>

                    <div className="avatar-synced-pill-wrap">
                      <div className="avatar-synced-pill">
                        <Check size={12} strokeWidth={2.5} /> {t('profile_synced_pill')}
                      </div>
                    </div>
                  </div>

                  <div className="form-grid mt-md">
                    <label className="field">
                      <span>{t('profile_name_label')}</span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('profile_name_placeholder')}
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
                      {t('profile_save_btn')}
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
        </aside>
      </div>
  )
}
