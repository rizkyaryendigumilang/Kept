import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import AuthScreen from './components/AuthScreen'
import UnlockScreen from './components/UnlockScreen'
import TopBar from './components/TopBar'
import BottomNav from './components/BottomNav'
import AddSheet from './components/AddSheet'
import HomePage from './pages/HomePage'
import Loader from './components/Loader'
import PrivacyMask from './components/PrivacyMask'

// Code splitting: Lazy-loaded pages & modals for fast initial load
const ResetPasswordScreen = lazy(() => import('./components/ResetPasswordScreen'))
const VaultPage = lazy(() => import('./pages/VaultPage'))
const BankingPage = lazy(() => import('./pages/BankingPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const SettingsDrawer = lazy(() => import('./components/SettingsDrawer'))
const AlertsPanel = lazy(() => import('./pages/AlertsPanel'))
const ItemModal = lazy(() => import('./pages/ItemModal'))
const AddItemModal = lazy(() => import('./pages/AddItemModal'))
const AddDocumentModal = lazy(() => import('./pages/AddDocumentModal'))
const AddCardModal = lazy(() => import('./components/AddCardModal'))
const CardDetailModal = lazy(() => import('./components/CardDetailModal'))
const CardBarcodeModal = lazy(() => import('./components/CardBarcodeModal'))
const DocumentDetailModal = lazy(() => import('./pages/DocumentDetailModal'))
const CommandPalette = lazy(() => import('./components/CommandPalette'))
const ExportModal = lazy(() => import('./components/ExportModal'))
const ImportKeptModal = lazy(() => import('./components/ImportKeptModal'))
const ShareSecretModal = lazy(() => import('./components/ShareSecretModal'))
const ViewSharedSecretScreen = lazy(() => import('./components/ViewSharedSecretScreen'))
import { parseShareHash } from './lib/secureShare'
import { checkDocumentExpiry } from './lib/documents'
import { supabase } from './lib/supabase'
import {
  deriveVaultKey,
  encryptJson,
  decryptJson,
  generateSalt,
  generateRecoveryKey,
  wrapMasterKeyWithRecovery,
  keyFingerprint
} from './lib/crypto'
import {
  createVerifier,
  deleteEncryptedItem,
  ensureProfile,
  fetchEncryptedItems,
  setProfilePreference,
  upsertEncryptedItem,
  loadCachedItems,
  uploadAvatar,
  getAvatarSignedUrl,
  removeAvatar,
  changeMasterPassword,
  resetVault,
  syncVaultWithConflictResolution,
  verifyMasterKey
} from './lib/vault'
import { idbClearUser, idbGetPendingQueue } from './lib/idb'
import { Copy, Check, Download, ShieldCheck, Lock } from './components/Icons'
import { isWeakPin, recordSecurityActivity, registerCurrentDevice } from './lib/securityAudit'

const CATEGORY_LABELS = {
  social: 'Social Media',
  web: 'Web Password',
  project: 'Project Password',
  secure_note: 'Secure Note',
  bank_card: 'Kartu',
  card: 'Kartu (My Cards)',
  bank: 'Account',
  access: 'Kartu Akses',
  membership: 'Membership',
  health: 'Kesehatan & Asuransi',
  voucher: 'Voucher & Kupon',
  other: 'Kartu Lainnya',
  document: 'Dokumen',
  '01_identity': 'Identitas & Kependudukan',
  '02_education': 'Pendidikan & Karir',
  '03_mobility': 'Perjalanan & Legal',
  '04_health_assets': 'Kesehatan & Aset',
  '05_other': 'Dokumen Lainnya'
}

function applyTheme(theme) {
  if (['light', 'dark', 'tokyo-night', 'catppuccin'].includes(theme)) {
    document.documentElement.dataset.theme = theme
  } else {
    // system theme
    document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [vaultKey, setVaultKey] = useState(null)
  const [items, setItems] = useState([])
  const [route, setRoute] = useState('home')
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState(null)
  const [docAddModalOpen, setDocAddModalOpen] = useState(false)
  const [cardAddModalOpen, setCardAddModalOpen] = useState(false)
  const [cardBarcodeModalItem, setCardBarcodeModalItem] = useState(null)
  const [cardEditModalItem, setCardEditModalItem] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuSubpage, setMenuSubpage] = useState(null)
  const [recovery, setRecovery] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [activeRecoveryKey, setActiveRecoveryKey] = useState('')
  const [lang, setLang] = useState(() => localStorage.getItem('kept_language') || 'id')
  const [searchOpen, setSearchOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [importKeptEnvelope, setImportKeptEnvelope] = useState(null)

  const bootstrappedUserRef = useRef(null)

  const [privacyMaskEnabled, setPrivacyMaskEnabled] = useState(
    () => localStorage.getItem('kept_privacy_mask') !== 'false'
  )
  const [installPrompt, setInstallPrompt] = useState(null)
  const [dismissedFavSuggestions, setDismissedFavSuggestions] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('kept_dismissed_fav_suggestions') || '[]'))
    } catch {
      return new Set()
    }
  })

  // Self-Destructing Secure Share States
  const [shareParams, setShareParams] = useState(() => parseShareHash(window.location.hash))
  const [shareModalData, setShareModalData] = useState(null)

  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseShareHash(window.location.hash)
      if (parsed) {
        setShareParams(parsed)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function handleOpenShareSecret(item = null) {
    if (item) {
      let secretText = item.password || item.card_number || item.notes || item.pin || ''
      let title = item.name || item.bank_name || 'Rahasia'
      if (item.username && item.password) {
        secretText = `Username: ${item.username}\nPassword: ${item.password}${item.url ? `\nURL: ${item.url}` : ''}${item.notes ? `\nCatatan: ${item.notes}` : ''}`
      } else if (item.item_type === 'bank_card') {
        secretText = `Bank: ${item.bank_name || ''}\nNo. Rekening: ${item.account_number || ''}\nNo. Kartu: ${item.card_number || ''}\nPemilik: ${item.account_owner || ''}`
      }
      setShareModalData({ isOpen: true, initialTitle: title, initialContent: secretText })
    } else {
      setShareModalData({ isOpen: true, initialTitle: '', initialContent: '' })
    }
  }

  function handleTogglePrivacyMask() {
    setPrivacyMaskEnabled((prev) => {
      const next = !prev
      localStorage.setItem('kept_privacy_mask', String(next))
      return next
    })
  }

  function handleDismissFavSuggestion(itemId) {
    setDismissedFavSuggestions((prev) => {
      const next = new Set(prev)
      next.add(itemId)
      localStorage.setItem('kept_dismissed_fav_suggestions', JSON.stringify([...next]))
      return next
    })
  }

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    const handleAppInstalled = () => {
      setInstallPrompt(null)
      showToast(lang === 'id' ? 'Kept berhasil dipasang ke Layar Utama!' : 'Kept successfully installed to Home Screen!')
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [lang])

  async function handlePromptInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      showToast(lang === 'id' ? 'Memasang Kept...' : 'Installing Kept...')
    }
    setInstallPrompt(null)
  }

  function handleLanguageChange(newLang) {
    setLang(newLang)
    localStorage.setItem('kept_language', newLang)
  }

  // Global shortcut for Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleToggleMenu() {
    if (!menuOpen) {
      setMenuOpen(true)
      setMenuSubpage(null)
    } else if (menuSubpage) {
      setMenuSubpage(null)
    } else {
      setMenuOpen(false)
    }
  }

  // Auto-lock idle timer
  useEffect(() => {
    if (!vaultKey) return

    const getTimeoutMs = () => {
      const minutes = parseInt(localStorage.getItem('kept_autolock_minutes') || '15', 10)
      if (minutes <= 0) return null
      return minutes * 60 * 1000
    }

    let timer = null
    const resetTimer = () => {
      if (timer) clearTimeout(timer)
      const timeoutMs = getTimeoutMs()
      if (!timeoutMs) return
      timer = setTimeout(() => {
        setVaultKey(null)
        showToast('Vault otomatis terkunci karena tidak ada aktivitas.')
      }, timeoutMs)
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timer) clearTimeout(timer)
      events.forEach((ev) => window.removeEventListener(ev, resetTimer))
    }
  }, [vaultKey])

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      showToast('Koneksi pulih. Memulai sinkronisasi…')
      if (session?.user && vaultKey) {
        runSync(session.user.id, vaultKey)
      }
    }
    const handleOffline = () => {
      setIsOnline(false)
      showToast('Anda sedang offline. Perubahan disimpan lokal.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [session?.user, vaultKey])

  useEffect(() => {
    let mounted = true
    registerCurrentDevice()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) await bootstrapUser(data.session.user)
      setAuthLoading(false)
    }).catch(() => setAuthLoading(false))

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (_event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(currentSession)
      if (currentSession?.user) await bootstrapUser(currentSession.user)
      else {
        setProfile(null)
        setVaultKey(null)
        setItems([])
      }
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function bootstrapUser(user) {
    try {
      const p = await ensureProfile(user, user.user_metadata?.display_name)
      if (p?.avatar_url && !p.avatar_url.startsWith('http') && !p.avatar_url.startsWith('blob:') && !p.avatar_url.startsWith('data:')) {
        const signed = await getAvatarSignedUrl(p.avatar_url)
        if (signed) {
          p.avatar_path = p.avatar_url
          p.avatar_url = signed
        }
      }
      const previousUserId = bootstrappedUserRef.current
      const accountChanged = Boolean(previousUserId) && previousUserId !== p.id
      bootstrappedUserRef.current = p.id

      if (accountChanged) {
        setVaultKey(null)
        setItems([])
        setSelectedItem(null)
        setAddMode(null)
        setShowAdd(false)
        setAlertsOpen(false)
        setRoute('home')
        setProfile(p)
      } else {
        setProfile((current) => (current?.id === p.id && current?.vault_salt) ? current : p)
      }

      applyTheme(p.theme || 'light')
      checkPendingQueue(user.id)
    } catch (err) {
      setError(err.message || 'Gagal memuat profil pengguna.')
    }
  }

  async function checkPendingQueue(userId) {
    try {
      const pending = await idbGetPendingQueue(userId)
      setPendingSyncCount(pending.length)
    } catch {
      // ignore
    }
  }

  function showToast(msg, duration = 2000) {
    setToast(msg)
    setTimeout(() => setToast(''), duration)
  }

  useEffect(() => {
    const onStorage = () => profile && applyTheme(profile.theme || 'light')
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [profile])

  const hydratedItems = useMemo(
    () =>
      items
        .filter((item) => !item.deleted_at)
        .map((item) => ({
          ...item,
          categoryLabel: CATEGORY_LABELS[item.category] || CATEGORY_LABELS[item.item_type] || item.category
        })),
    [items]
  )

  const trashedItems = useMemo(
    () =>
      items
        .filter((item) => Boolean(item.deleted_at))
        .map((item) => ({
          ...item,
          categoryLabel: CATEGORY_LABELS[item.category] || CATEGORY_LABELS[item.item_type] || item.category
        })),
    [items]
  )

  const stats = useMemo(
    () => ({
      passwords: hydratedItems.filter((i) => i.item_type === 'password').length,
      banks: hydratedItems.filter((i) => i.item_type === 'bank_card' || i.item_type === 'card').length,
      documents: hydratedItems.filter((i) => i.item_type === 'document').length
    }),
    [hydratedItems]
  )

  const favorites = useMemo(() => hydratedItems.filter((i) => i.favorite).slice(0, 4), [hydratedItems])
  const suggestedFavorite = useMemo(() => {
    return (
      hydratedItems.find(
        (item) => (item.access_count || 0) >= 3 && !item.favorite && !dismissedFavSuggestions.has(item.id)
      ) || null
    )
  }, [hydratedItems, dismissedFavSuggestions])
  const recent = useMemo(
    () =>
      [...hydratedItems]
        .sort((a, b) => new Date(b.last_used_at || b.updated_at || 0) - new Date(a.last_used_at || a.updated_at || 0))
        .slice(0, 4),
    [hydratedItems]
  )
  const alerts = useMemo(() => buildAlerts(hydratedItems), [hydratedItems])
  const expiryAlerts = useMemo(
    () => alerts.filter((a) => a.type.startsWith('card_') || a.type.startsWith('doc_')),
    [alerts]
  )
  const banks = useMemo(
    () =>
      hydratedItems
        .filter((i) => i.item_type === 'bank_card' || i.item_type === 'card')
        .map((b, i) => ({ ...b, _renderIndex: i })),
    [hydratedItems]
  )
  const documents = useMemo(
    () => hydratedItems.filter((i) => i.item_type === 'document'),
    [hydratedItems]
  )

  async function unlock(rawKey) {
    setVaultKey(rawKey)
    try {
      let rows
      try {
        rows = await fetchEncryptedItems(session.user.id)
      } catch (networkError) {
        rows = await loadCachedItems(session.user.id)
        if (!rows.length) throw networkError
      }

      const decryptedResults = await Promise.all(
        rows.map(async (row) => {
          try {
            const payload = await decryptItemRow(row, rawKey)
            return { ...row, ...payload }
          } catch {
            return null
          }
        })
      )
      const decrypted = decryptedResults.filter(Boolean)
      setItems(decrypted)
      showToast(`Kept terbuka · ${keyFingerprint(rawKey)}`, 1600)

      // Run offline sync check if online
      if (navigator.onLine) {
        runSync(session.user.id, rawKey)
      }
    } catch (err) {
      setError(err.message || 'Gagal membuka vault.')
    }
  }

  async function runSync(userId, currentKey) {
    try {
      const result = await syncVaultWithConflictResolution(userId, currentKey)
      checkPendingQueue(userId)
      if (result.resolvedConflicts > 0) {
        showToast(`Sinkronisasi selesai: ${result.resolvedConflicts} konflik berhasil dipulihkan secara aman.`, 3500)
      }
      // Re-hydrate decrypted items in parallel
      const decryptedResults = await Promise.all(
        result.rows.map(async (row) => {
          try {
            const payload = await decryptItemRow(row, currentKey)
            return { ...row, ...payload }
          } catch {
            return null
          }
        })
      )
      const decrypted = decryptedResults.filter(Boolean)
      setItems(decrypted)
    } catch (err) {
      console.warn('Sync warning:', err)
    }
  }

  async function decryptItemRow(row, key) {
    return decryptJson(row.payload, key)
  }

  async function saveItem(form) {
    if (!vaultKey) {
      setError('Vault terkunci. Buka vault sebelum menyimpan data.')
      return
    }
    try {
      const payload = await encryptJson(form, vaultKey)
      const row = await upsertEncryptedItem(
        session.user.id,
        form.item_type,
        form.item_type === 'bank_card' ? 'bank_card' : form.category,
        payload,
        form.id || null
      )
      const updated = {
        ...row,
        ...form,
        category: form.item_type === 'secure_note' ? 'secure_note' : form.item_type === 'bank_card' ? 'bank_card' : form.item_type === 'document' ? (form.category || '01_identity') : form.category,
        payload
      }
      setItems((current) => (form.id ? current.map((i) => (i.id === form.id ? updated : i)) : [updated, ...current]))
      if (!form.id) {
        if (form.item_type === 'bank_card') {
          recordSecurityActivity({
            type: 'account_added',
            title: 'Penambahan Account Bank',
            desc: `Akun baru ditambahkan: ${form.name || form.bank_name || 'Account'} (${form.bank_name || 'Bank'}).`,
            level: 'info'
          })
        } else if (form.item_type === 'document') {
          recordSecurityActivity({
            type: 'vault_item_added',
            title: 'Penambahan Dokumen',
            desc: `Dokumen baru ditambahkan: ${form.name || 'Dokumen'}.`,
            level: 'info'
          })
        } else {
          recordSecurityActivity({
            type: 'vault_item_added',
            title: 'Penambahan Item Vault',
            desc: `Item baru ditambahkan: ${form.name || 'Item'} (${CATEGORY_LABELS[form.category] || form.item_type}).`,
            level: 'info'
          })
        }
      }
      setShowAdd(false)
      setAddMode(null)
      setDocAddModalOpen(false)
      setCardAddModalOpen(false)
      setCardEditModalItem(null)
      setSelectedItem(null)
      checkPendingQueue(session.user.id)
      showToast('Disimpan secara aman', 1400)
    } catch (err) {
      setError(err.message || 'Gagal menyimpan item.')
    }
  }

  function openAdd(mode) {
    setShowAdd(false)
    if (mode === 'document') {
      setDocAddModalOpen(true)
    } else if (mode === 'bank-card' || mode === 'card') {
      setCardAddModalOpen(true)
    } else {
      setAddMode(mode)
    }
  }

  function openItem(item) {
    const currentCount = item.access_count || 0
    const touched = {
      ...item,
      last_used_at: new Date().toISOString(),
      access_count: currentCount + 1
    }
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, ...touched } : i)))
    setSelectedItem(touched)
    if (vaultKey && session?.user?.id) {
      encryptJson(touched, vaultKey)
        .then((payload) =>
          upsertEncryptedItem(
            session.user.id,
            touched.item_type,
            touched.item_type === 'bank_card' ? 'bank_card' : touched.category,
            payload,
            touched.id
          )
        )
        .catch(() => {})
    }
  }

  async function updateItem(updated) {
    await saveItem({ ...updated, id: selectedItem.id })
  }

  async function toggleFavorite(id) {
    const item = items.find((i) => i.id === id)
    if (!item || !vaultKey) return
    try {
      const updated = { ...item, favorite: !item.favorite, last_used_at: new Date().toISOString() }
      const payload = await encryptJson(updated, vaultKey)
      const row = await upsertEncryptedItem(
        session.user.id,
        updated.item_type,
        updated.item_type === 'bank_card' ? 'bank_card' : updated.category,
        payload,
        id
      )
      setItems((current) => current.map((i) => (i.id === id ? { ...row, ...updated, payload } : i)))
      setSelectedItem((current) => (current?.id === id ? { ...current, ...updated, payload } : current))
    } catch (err) {
      setError(err.message || 'Gagal memperbarui favorit.')
    }
  }

  async function removeItem(id) {
    if (!vaultKey) return
    const item = items.find((i) => i.id === id)
    if (!item) return
    try {
      const trashed = {
        ...item,
        deleted_at: new Date().toISOString()
      }
      const payload = await encryptJson(trashed, vaultKey)
      const row = await upsertEncryptedItem(
        session.user.id,
        trashed.item_type,
        trashed.item_type === 'bank_card' ? 'bank_card' : trashed.category,
        payload,
        id
      )
      setItems((current) => current.map((i) => (i.id === id ? { ...row, ...trashed, payload } : i)))
      setSelectedItem(null)
      checkPendingQueue(session.user.id)
      recordSecurityActivity({
        type: 'vault_item_trashed',
        title: lang === 'id' ? 'Item Dipindahkan ke Sampah' : 'Item Moved to Trash',
        desc: `${trashed.name || 'Item'} ${lang === 'id' ? 'dipindahkan ke Tempat Sampah.' : 'moved to Recycle Bin.'}`,
        level: 'info'
      })
      showToast(lang === 'id' ? 'Dipindahkan ke Tempat Sampah' : 'Moved to Recycle Bin', 1800)
    } catch (err) {
      setError(err.message || 'Gagal memindahkan item ke tempat sampah.')
    }
  }

  async function restoreItem(id) {
    if (!vaultKey) return
    const item = items.find((i) => i.id === id)
    if (!item) return
    try {
      const restored = { ...item }
      delete restored.deleted_at
      const payload = await encryptJson(restored, vaultKey)
      const row = await upsertEncryptedItem(
        session.user.id,
        restored.item_type,
        restored.item_type === 'bank_card' ? 'bank_card' : restored.category,
        payload,
        id
      )
      setItems((current) => current.map((i) => (i.id === id ? { ...row, ...restored, payload } : i)))
      checkPendingQueue(session.user.id)
      recordSecurityActivity({
        type: 'vault_item_restored',
        title: lang === 'id' ? 'Item Dipulihkan' : 'Item Restored',
        desc: `${restored.name || 'Item'} ${lang === 'id' ? 'dipulihkan dari Tempat Sampah.' : 'restored from Recycle Bin.'}`,
        level: 'info'
      })
      showToast(lang === 'id' ? 'Item berhasil dipulihkan' : 'Item restored successfully', 1800)
    } catch (err) {
      setError(err.message || 'Gagal memulihkan item.')
    }
  }

  async function permanentDeleteItem(id) {
    try {
      await deleteEncryptedItem(session.user.id, id)
      setItems((current) => current.filter((i) => i.id !== id))
      checkPendingQueue(session.user.id)
      recordSecurityActivity({
        type: 'vault_item_deleted',
        title: lang === 'id' ? 'Item Dihapus Permanen' : 'Item Permanently Deleted',
        desc: lang === 'id' ? 'Item telah dihapus secara permanen dari vault.' : 'Item permanently removed from vault.',
        level: 'warning'
      })
      showToast(lang === 'id' ? 'Item dihapus permanen' : 'Item permanently deleted', 1500)
    } catch (err) {
      setError(err.message || 'Gagal menghapus item permanen.')
    }
  }

  async function emptyTrash() {
    const toDelete = trashedItems
    if (!toDelete.length) return
    try {
      for (const item of toDelete) {
        await deleteEncryptedItem(session.user.id, item.id)
      }
      setItems((current) => current.filter((i) => !i.deleted_at))
      checkPendingQueue(session.user.id)
      recordSecurityActivity({
        type: 'trash_emptied',
        title: lang === 'id' ? 'Tempat Sampah Dikosongkan' : 'Trash Emptied',
        desc: lang === 'id' ? `${toDelete.length} item dihapus secara permanen.` : `${toDelete.length} items permanently deleted.`,
        level: 'warning'
      })
      showToast(lang === 'id' ? 'Tempat Sampah berhasil dikosongkan' : 'Recycle bin emptied', 1800)
    } catch (err) {
      setError(err.message || 'Gagal mengosongkan tempat sampah.')
    }
  }

  async function initializeVault(masterPassword, generatedRecoveryKey) {
    const salt = generateSalt()
    const key = deriveVaultKey(masterPassword, salt)
    const checkEnvelope = await createVerifier(key)
    const recoveryEnvelope = await wrapMasterKeyWithRecovery(key, generatedRecoveryKey)

    const verifier = {
      checkEnvelope,
      recovery: recoveryEnvelope
    }

    const p = await setProfilePreference(session.user.id, {
      vault_salt: salt,
      vault_verifier: verifier,
      theme: 'light',
      card_style: 'realistic'
    })

    setProfile(p)
    setVaultKey(key)
    setActiveRecoveryKey(generatedRecoveryKey)
    await fetchEncryptedItems(session.user.id)
  }

  // Handle recovery from UnlockScreen
  async function handleRecoverMasterPassword(recoveredKey, newMasterPassword, usedRecoveryKey) {
    // 1. Decrypt all items using recoveredKey
    let rows = []
    try {
      rows = await fetchEncryptedItems(session.user.id)
    } catch {
      rows = await loadCachedItems(session.user.id)
    }

    let decrypted = []
    if (recoveredKey) {
      const decryptedResults = await Promise.all(
        rows.map(async (row) => {
          try {
            const payload = await decryptItemRow(row, recoveredKey)
            return { ...row, ...payload }
          } catch {
            return null
          }
        })
      )
      decrypted = decryptedResults.filter(Boolean)
    }

    // 2. Re-encrypt all items with newMasterPassword
    const result = await changeMasterPassword({
      userId: session.user.id,
      newMasterPassword,
      decryptedItems: decrypted,
      recoveryKey: usedRecoveryKey || activeRecoveryKey || generateRecoveryKey(),
      theme: profile.theme,
      cardStyle: profile.card_style
    })

    setProfile(result.updatedProfile)
    setVaultKey(result.newMasterKey)
    setItems(decrypted)
    showToast('Vault berhasil dipulihkan & master password baru telah aktif!', 3000)
  }

  // Emergency reset vault
  async function handleResetVault() {
    const updatedProfile = await resetVault(session.user.id)
    setProfile(updatedProfile)
    setVaultKey(null)
    setItems([])
    showToast('Vault telah di-reset. Silakan inisialisasi vault baru.', 3000)
  }

  // Change Login Account Password (Supabase)
  async function handleChangeAccountPassword(newPassword) {
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) throw updateError
    showToast('Password akun berhasil diperbarui!')
  }

  // Change Vault Master Password (Re-encrypts all items)
  async function handleChangeMasterPassword(currentMasterPassword, newMasterPassword) {
    const testKey = deriveVaultKey(currentMasterPassword, profile.vault_salt)
    const valid = await verifyMasterKey(profile, testKey)
    if (!valid) {
      throw new Error('Master password saat ini tidak sesuai.')
    }

    const recoveryKeyToUse = activeRecoveryKey || generateRecoveryKey()

    const result = await changeMasterPassword({
      userId: session.user.id,
      newMasterPassword,
      decryptedItems: items,
      recoveryKey: recoveryKeyToUse,
      theme: profile.theme,
      cardStyle: profile.card_style
    })

    setProfile(result.updatedProfile)
    setVaultKey(result.newMasterKey)
    setActiveRecoveryKey(recoveryKeyToUse)
    showToast('Security PIN berhasil diperbarui!', 3000)
  }

  function handleDownloadEmergencySheet() {
    const keyToExport = activeRecoveryKey || 'KEPT-RECOVERY-KEY'
    const content = `=====================================================
KEPT EMERGENCY KIT — ZERO-KNOWLEDGE RECOVERY
=====================================================
Akun Email   : ${session?.user?.email || 'User'}
Tanggal Buat : ${new Date().toLocaleString()}

EMERGENCY RECOVERY KEY:
${keyToExport}

PERINGATAN KEAMANAN:
Kode ini adalah satu-satunya kunci darurat untuk memulihkan
akses ke Kept jika Anda lupa Master Password.
Simpan dokumen ini di tempat fisik atau media offline yang aman.
Jangan pernah membagikan kode ini kepada siapapun!
=====================================================`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kept-emergency-kit-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function saveProfile(patch) {
    try {
      const p = await setProfilePreference(session.user.id, patch)
      setProfile(p)
      showToast('Profil diperbarui', 1200)
    } catch (err) {
      setError(err.message)
    }
  }

  async function uploadProfileAvatar(file) {
    try {
      const res = await uploadAvatar(session.user.id, file)
      const displayUrl = res.signedUrl || res.filePath
      setProfile((current) => (current ? { ...current, avatar_url: displayUrl, avatar_path: res.filePath } : current))
      showToast('Foto profil berhasil disimpan dan tersinkron!', 2000)
      return displayUrl
    } catch (err) {
      setError(err.message || 'Gagal mengunggah foto profil.')
      throw err
    }
  }

  async function handleRemoveAvatar() {
    try {
      await removeAvatar(session.user.id)
      setProfile((current) => (current ? { ...current, avatar_url: null, avatar_path: null } : current))
      showToast('Avatar dikembalikan ke default', 1500)
    } catch (err) {
      setError(err.message || 'Gagal menghapus avatar.')
    }
  }

  async function updateTheme(theme) {
    try {
      const p = await setProfilePreference(session.user.id, { theme })
      setProfile(p)
      applyTheme(theme)
    } catch (err) {
      setError(err.message)
    }
  }

  async function updateCardStyle(card_style) {
    try {
      const p = await setProfilePreference(session.user.id, { card_style })
      setProfile(p)
    } catch (err) {
      setError(err.message)
    }
  }

  const [hamburgerStyle, setHamburgerStyle] = useState(() => {
    return localStorage.getItem('kept_hamburger_style') || 'squash'
  })

  function updateHamburgerStyle(style) {
    setHamburgerStyle(style)
    localStorage.setItem('kept_hamburger_style', style)
  }

  async function signOut() {
    const userId = session?.user?.id
    try {
      await supabase.auth.signOut()
    } catch (err) {
      setError(err.message)
    }
    if (userId) {
      try {
        await idbClearUser(userId)
      } catch {
        // best effort
      }
    }
    setProfile(null)
    setVaultKey(null)
    setItems([])
    setSelectedItem(null)
    setAddMode(null)
    setShowAdd(false)
    setRoute('home')
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()

      // Check if .kept or encrypted JSON backup
      if (file.name.endsWith('.kept') || text.includes('KEPT_ENCRYPTED_BACKUP')) {
        try {
          const envelope = JSON.parse(text)
          if (envelope.format === 'KEPT_ENCRYPTED_BACKUP' && envelope.salt && envelope.iv && envelope.ciphertext) {
            setImportKeptEnvelope(envelope)
            return
          }
        } catch {
          // not JSON, continue
        }
      }

      // Check if unencrypted Kept JSON backup
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed.items)) {
            for (const row of parsed.items) {
              await saveItem(row)
            }
            showToast(lang === 'id' ? `Berhasil mengimpor ${parsed.items.length} item` : `Successfully imported ${parsed.items.length} items`, 1600)
            return
          }
        } catch {
          // continue to CSV
        }
      }

      // Regular CSV fallback
      const rows = parseCsv(text)
      const imported = rows.map((r) => ({
        item_type: 'password',
        category: guessCategory(r),
        name: r.name || r.title || r.url || 'Imported password',
        username: r.username || r.email || '',
        password: r.password || '',
        url: r.url || '',
        notes: r.notes || '',
        favorite: false,
        last_used_at: new Date().toISOString()
      }))
      for (const row of imported) await saveItem(row)
      showToast(lang === 'id' ? `Berhasil mengimpor ${imported.length} item` : `Successfully imported ${imported.length} items`, 1600)
    } catch (err) {
      setError(lang === 'id' ? `Impor gagal: ${err.message}` : `Import failed: ${err.message}`)
    } finally {
      event.target.value = ''
    }
  }

  async function handleRestoreKeptItems(restoredItems) {
    try {
      for (const item of restoredItems) {
        await saveItem(item)
      }
      showToast(
        lang === 'id'
          ? `Berhasil memulihkan ${restoredItems.length} item dari cadangan .kept!`
          : `Successfully restored ${restoredItems.length} items from .kept backup!`,
        2500
      )
      recordSecurityActivity({
        type: 'import_sensitive',
        title: 'Pemulihan Cadangan .kept Selesai',
        desc: `Dipulihkan ${restoredItems.length} item dari file cadangan terenkripsi.`,
        level: 'info'
      })
    } catch (err) {
      setError(err.message || 'Gagal memulihkan item cadangan.')
    }
  }

  function openExportModal() {
    setExportModalOpen(true)
  }

  if (authLoading) return <Splash />
  if (shareParams) {
    return (
      <Suspense fallback={<Splash />}>
        <ViewSharedSecretScreen
          shareParams={shareParams}
          onExit={() => {
            window.location.hash = ''
            setShareParams(null)
          }}
          lang={lang}
        />
      </Suspense>
    )
  }

  if (recovery) {
    return (
      <Suspense fallback={<Splash />}>
        <ResetPasswordScreen onDone={() => setRecovery(false)} lang={lang} />
      </Suspense>
    )
  }
  if (!session) return <AuthScreen lang={lang} />
  if (!profile) return <Splash />
  if (!profile.vault_salt || !profile.vault_verifier) {
    return <FirstVaultSetup onCreate={initializeVault} lang={lang} />
  }
  if (!vaultKey) {
    return (
      <UnlockScreen
        profile={profile}
        user={session.user}
        onUnlocked={unlock}
        onRecoverMasterPassword={handleRecoverMasterPassword}
        onResetVault={handleResetVault}
        lang={lang}
      />
    )
  }

  return (
    <div className="app-shell">
      <PrivacyMask enabled={privacyMaskEnabled} lang={lang} />
      <TopBar
        user={session.user}
        profile={profile}
        unread={alerts.length}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        menuOpen={menuOpen}
        isSubpage={Boolean(menuSubpage)}
        hamburgerStyle={hamburgerStyle}
        onAlerts={() => setAlertsOpen(true)}
        onOpenMenu={handleToggleMenu}
        onSettings={handleToggleMenu}
        currentRoute={route}
        onNavigate={setRoute}
        onOpenSearch={() => setSearchOpen(true)}
        lang={lang}
      />

      <main className="main-content">
        {route === 'home' && (
          <HomePage
            displayName={profile.display_name}
            stats={stats}
            favorites={favorites}
            recent={recent}
            expiryAlerts={expiryAlerts}
            suggestedFavorite={suggestedFavorite}
            onToggleFavorite={toggleFavorite}
            onDismissSuggestion={handleDismissFavSuggestion}
            onNavigate={setRoute}
            onOpenItem={openItem}
            onOpenAlerts={() => setAlertsOpen(true)}
            onAdd={() => setShowAdd(true)}
            lang={lang}
          />
        )}
        <Suspense fallback={<div className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '35vh' }}><Loader /></div>}>
          {route === 'vault' && (
            <VaultPage items={hydratedItems} onAdd={() => setShowAdd(true)} onOpen={openItem} lang={lang} />
          )}
          {route === 'documents' && (
            <DocumentsPage
              documents={documents}
              onAdd={() => openAdd('document')}
              onOpen={openItem}
              onDownload={(doc) => {
                if (doc.attachments?.pdf?.data) {
                  const a = document.createElement('a')
                  a.href = doc.attachments.pdf.data
                  a.download = doc.attachments.pdf.name || `${doc.name}.pdf`
                  a.click()
                } else if (doc.attachments?.front?.data) {
                  const a = document.createElement('a')
                  a.href = doc.attachments.front.data
                  a.download = doc.attachments.front.name || `${doc.name}-depan.jpg`
                  a.click()
                } else if (doc.attachments?.back?.data) {
                  const a = document.createElement('a')
                  a.href = doc.attachments.back.data
                  a.download = doc.attachments.back.name || `${doc.name}-belakang.jpg`
                  a.click()
                }
                recordSecurityActivity({
                  type: 'export_sensitive',
                  title: 'Ekspor Dokumen Didekripsi',
                  desc: `Pengguna mengunduh dokumen: ${doc.name}.`,
                  level: 'warning'
                })
              }}
              lang={lang}
            />
          )}
          {route === 'banking' && (
            <BankingPage
              banks={banks}
              styleMode={profile.card_style || 'realistic'}
              onAdd={() => openAdd('bank-card')}
              onOpen={openItem}
              onSave={(cardData, id) => saveItem(id ? { ...cardData, id } : cardData)}
              onDelete={removeItem}
              onToggleFavorite={toggleFavorite}
              lang={lang}
            />
          )}
          {route === 'settings' && (
            <SettingsPage
              profile={profile}
              user={session.user}
              vaultKey={vaultKey}
              items={hydratedItems}
              documents={documents}
              trashedItems={trashedItems}
              onRestoreItem={restoreItem}
              onPermanentDelete={permanentDeleteItem}
              onEmptyTrash={emptyTrash}
              privacyMaskEnabled={privacyMaskEnabled}
              onTogglePrivacyMask={handleTogglePrivacyMask}
              installPrompt={installPrompt}
              onPromptInstall={handlePromptInstall}
              onOpenShareSecret={handleOpenShareSecret}
              isOnline={isOnline}
              pendingSyncCount={pendingSyncCount}
              onTheme={updateTheme}
              onCardStyle={updateCardStyle}
              onSaveProfile={saveProfile}
              onUploadAvatar={uploadProfileAvatar}
              onRemoveAvatar={handleRemoveAvatar}
              onSignOut={signOut}
              onImport={() => document.getElementById('csv-import').click()}
              onExport={openExportModal}
              onChangeAccountPassword={handleChangeAccountPassword}
              onChangeMasterPassword={handleChangeMasterPassword}
              recoveryKey={activeRecoveryKey}
              onDownloadEmergencySheet={handleDownloadEmergencySheet}
              onLockVault={() => {
                setVaultKey(null)
                showToast('Vault telah dikunci.')
              }}
              showToast={showToast}
              hamburgerStyle={hamburgerStyle}
              onHamburgerStyle={updateHamburgerStyle}
              lang={lang}
              onLanguage={handleLanguageChange}
            />
          )}
        </Suspense>
      </main>

      <input id="csv-import" type="file" accept=".kept,.csv,text/csv,.json,application/json" hidden onChange={handleImportFile} />
      <BottomNav
        active={route}
        menuOpen={menuOpen}
        isSubpage={Boolean(menuSubpage)}
        hamburgerStyle={hamburgerStyle}
        lang={lang}
        onChange={(r) => {
          if (r === 'settings' || r === 'menu') {
            handleToggleMenu()
          } else {
            if (menuOpen) setMenuOpen(false)
            setRoute(r)
          }
        }}
      />

      {showAdd && <AddSheet onClose={() => setShowAdd(false)} onChoose={openAdd} lang={lang} />}
      <Suspense fallback={null}>
        {addMode && vaultKey && <AddItemModal mode={addMode} onClose={() => setAddMode(null)} onSubmit={saveItem} lang={lang} />}
        {docAddModalOpen && vaultKey && (
          <AddDocumentModal
            onClose={() => setDocAddModalOpen(false)}
            onSubmit={(docPayload) => saveItem({ ...docPayload, item_type: 'document' })}
            lang={lang}
          />
        )}
        {cardAddModalOpen && vaultKey && (
          <AddCardModal
            onClose={() => setCardAddModalOpen(false)}
            onSubmit={(cardData) => {
              setCardAddModalOpen(false)
              saveItem(cardData)
            }}
            lang={lang}
          />
        )}
        {cardEditModalItem && vaultKey && (
          <AddCardModal
            initialCard={cardEditModalItem}
            onClose={() => setCardEditModalItem(null)}
            onSubmit={(cardData) => {
              const id = cardEditModalItem.id
              setCardEditModalItem(null)
              saveItem({ ...cardData, id })
            }}
            lang={lang}
          />
        )}
        {cardBarcodeModalItem && (
          <CardBarcodeModal
            card={cardBarcodeModalItem}
            onClose={() => setCardBarcodeModalItem(null)}
            lang={lang}
          />
        )}
        {selectedItem && selectedItem.item_type === 'document' ? (
          <DocumentDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={removeItem}
            onSave={async (id, updatedDoc) => {
              await saveItem({ ...updatedDoc, id, item_type: 'document' })
            }}
            onToggleFavorite={toggleFavorite}
            lang={lang}
          />
        ) : selectedItem && (selectedItem.item_type === 'bank_card' || selectedItem.item_type === 'card') ? (
          <CardDetailModal
            card={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={removeItem}
            onEdit={(card) => {
              setSelectedItem(null)
              setCardEditModalItem(card)
            }}
            onShowBarcode={(card) => {
              setSelectedItem(null)
              setCardBarcodeModalItem(card)
            }}
            onToggleFavorite={toggleFavorite}
            lang={lang}
          />
        ) : selectedItem ? (
          <ItemModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={removeItem}
            onSave={updateItem}
            onToggleFavorite={toggleFavorite}
            onShareSecret={handleOpenShareSecret}
            lang={lang}
          />
        ) : null}
        {alertsOpen && (
          <AlertsPanel
            alerts={alerts}
            items={hydratedItems}
            onClose={() => setAlertsOpen(false)}
            onOpenItem={openItem}
            lang={lang}
          />
        )}
        <SettingsDrawer
          isOpen={menuOpen}
          activeSubpage={menuSubpage}
          onSubpageChange={setMenuSubpage}
          onClose={() => {
            setMenuOpen(false)
            setMenuSubpage(null)
          }}
          profile={profile}
          user={session.user}
          vaultKey={vaultKey}
          items={hydratedItems}
          documents={documents}
          trashedItems={trashedItems}
          onRestoreItem={restoreItem}
          onPermanentDelete={permanentDeleteItem}
          onEmptyTrash={emptyTrash}
          privacyMaskEnabled={privacyMaskEnabled}
          onTogglePrivacyMask={handleTogglePrivacyMask}
          installPrompt={installPrompt}
          onPromptInstall={handlePromptInstall}
          onOpenShareSecret={handleOpenShareSecret}
          isOnline={isOnline}
          pendingSyncCount={pendingSyncCount}
          onTheme={updateTheme}
          onCardStyle={updateCardStyle}
          onSaveProfile={saveProfile}
          onUploadAvatar={uploadProfileAvatar}
          onRemoveAvatar={handleRemoveAvatar}
          onSignOut={signOut}
          onImport={() => document.getElementById('csv-import').click()}
          onExport={openExportModal}
          onChangeAccountPassword={handleChangeAccountPassword}
          onChangeMasterPassword={handleChangeMasterPassword}
          recoveryKey={activeRecoveryKey}
          onDownloadEmergencySheet={handleDownloadEmergencySheet}
          onLockVault={() => {
            setVaultKey(null)
            showToast('Vault telah dikunci.')
          }}
          showToast={showToast}
          hamburgerStyle={hamburgerStyle}
          onHamburgerStyle={updateHamburgerStyle}
          lang={lang}
          onLanguage={handleLanguageChange}
        />
        <CommandPalette
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          items={hydratedItems}
          documents={documents}
          banks={banks}
          onOpenItem={openItem}
          onShareSecret={handleOpenShareSecret}
          showToast={showToast}
          lang={lang}
        />
        {exportModalOpen && (
          <ExportModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            user={session?.user}
            profile={profile}
            items={hydratedItems}
            lang={lang}
            showToast={showToast}
            recordSecurityActivity={recordSecurityActivity}
          />
        )}
        {importKeptEnvelope && (
          <ImportKeptModal
            isOpen={Boolean(importKeptEnvelope)}
            onClose={() => setImportKeptEnvelope(null)}
            fileEnvelope={importKeptEnvelope}
            onDecrypted={handleRestoreKeptItems}
            lang={lang}
          />
        )}
        {shareModalData?.isOpen && (
          <ShareSecretModal
            isOpen={shareModalData.isOpen}
            onClose={() => setShareModalData(null)}
            initialTitle={shareModalData.initialTitle}
            initialContent={shareModalData.initialContent}
            user={session?.user}
            lang={lang}
            showToast={showToast}
          />
        )}
      </Suspense>
      {toast && <div className="toast">{toast}</div>}
      {error && (
        <div className="error-banner" onClick={() => setError('')}>
          {error}
        </div>
      )}
    </div>
  )
}

function Splash() {
  return (
    <div className="splash">
      <img src="/brand/kept-icon.png" alt="Kept" className="kept-splash-icon" />
      <span className="kept-splash-text">Kept</span>
      <div style={{ marginTop: 20 }}>
        <Loader />
      </div>
    </div>
  )
}

function FirstVaultSetup({ onCreate, lang = 'id' }) {
  const t = (k) => getTranslation(k, lang)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [err, setErr] = useState('')
  const [generatedKey, setGeneratedKey] = useState('')
  const [copiedKey, setCopiedKey] = useState(false)
  const [confirmedBackup, setConfirmedBackup] = useState(false)

  useEffect(() => {
    setGeneratedKey(generateRecoveryKey())
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(generatedKey)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 1800)
  }

  function handleDownloadKit() {
    const content = `=====================================================
KEPT EMERGENCY KIT — ZERO-KNOWLEDGE RECOVERY
=====================================================
Tanggal Dibuat : ${new Date().toLocaleString()}

EMERGENCY RECOVERY KEY:
${generatedKey}

PERINGATAN PENTING:
Jika Anda lupa Security PIN, Recovery Key di atas adalah
satu-satunya cara untuk memulihkan akses ke vault Kept Anda.
Simpan dokumen ini dengan aman dan jangan berikan ke siapapun!
=====================================================`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kept-emergency-kit-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const check = isWeakPin(pin)
    if (check.isWeak) return setErr(check.reason)
    if (pin !== confirmPin) return setErr(t('setup_err_match'))
    if (!confirmedBackup) {
      return setErr(t('setup_err_backup'))
    }
    onCreate(pin, generatedKey)
  }

  return (
    <main className="unlock-screen setup-screen">
      <div className="brand-logo-hero">
        <img src="/brand/kept-logo.png" alt="Kept" className="kept-hero-logo" />
      </div>

      <div className="unlock-copy">
        <div className="eyebrow">{t('setup_eyebrow')}</div>
        <h1>{t('setup_title')}</h1>
        <p>
          {t('setup_desc')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="unlock-form">
        <label className="field">
          <span>{t('setup_pin_label')}</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Contoh: 739104"
            className="font-mono text-center letter-spacing-lg"
            required
            autoFocus
          />
          <span className="field-hint">
            {t('setup_pin_hint')}
          </span>
        </label>

        <label className="field">
          <span>{t('setup_confirm_pin_label')}</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('setup_confirm_pin_ph')}
            className="font-mono text-center letter-spacing-lg"
            required
          />
        </label>

        {/* Emergency Recovery Key Box */}
        <div className="emergency-kit-box">
          <div className="kit-header">
            <ShieldCheck size={16} />
            <strong>{t('setup_kit_title')}</strong>
          </div>
          <p className="kit-description">
            {t('setup_kit_desc')}
          </p>

          <code className="font-mono recovery-code">{generatedKey}</code>

          <div className="button-row mt-sm">
            <button type="button" className="secondary-button pill-button" onClick={handleCopy}>
              {copiedKey ? <Check size={14} /> : <Copy size={14} />}
              {copiedKey ? t('setup_copied_btn') : t('setup_copy_btn')}
            </button>
            <button type="button" className="secondary-button pill-button" onClick={handleDownloadKit}>
              <Download size={14} />
              {t('setup_download_kit_btn')}
            </button>
          </div>

          <label className="checkbox-field mt-md">
            <input
              type="checkbox"
              checked={confirmedBackup}
              onChange={(e) => setConfirmedBackup(e.target.checked)}
            />
            <span>{t('setup_confirm_checkbox')}</span>
          </label>
        </div>

        {err && <div className="feedback error">{err}</div>}

        <button
          className="primary-button pill-button mt-md"
          disabled={pin.length !== 6 || confirmPin.length !== 6 || !confirmedBackup}
        >
          {t('setup_submit_btn')}
        </button>
      </form>

      <div className="unlock-note">
        <Lock size={13} /> {t('setup_zk_note')}
      </div>
    </main>
  )
}

function checkCardExpiry(expiryStr) {
  if (!expiryStr) return null
  const clean = expiryStr.trim()
  const match = clean.match(/^(\d{1,2})[\/\-](\d{2,4})$/)
  if (!match) return null
  let month = parseInt(match[1], 10)
  let year = parseInt(match[2], 10)
  if (year < 100) year += 2000
  if (month < 1 || month > 12) return null

  const expiryDate = new Date(year, month, 0, 23, 59, 59)
  const now = new Date()

  if (expiryDate < now) {
    return 'expired'
  }
  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
  if (diffDays <= 60) {
    return { status: 'expiring_soon', days: diffDays }
  }
  return null
}

function buildAlerts(items) {
  const alerts = []

  // 1. Reused passwords detection (critical risk)
  const passwordMap = new Map()
  for (const item of items) {
    if (item.item_type === 'password' && item.password) {
      const list = passwordMap.get(item.password) || []
      list.push(item)
      passwordMap.set(item.password, list)
    }
  }

  for (const [pass, duplicates] of passwordMap.entries()) {
    if (duplicates.length > 1) {
      const names = duplicates.map((d) => d.name).join(', ')
      alerts.push({
        id: `reuse-${duplicates[0].id}`,
        type: 'reused_password',
        level: 'danger',
        title: `Password dipakai di ${duplicates.length} akun berbeda`,
        body: `Akun: ${names}. Kebocoran satu akun membahayakan seluruh akun lainnya.`,
        item: duplicates[0],
        count: duplicates.length
      })
    }
  }

  // 2. Weak & short passwords detection
  for (const item of items) {
    if (item.item_type === 'password' && item.password) {
      const p = item.password
      const isShort = p.length < 10
      const hasNumber = /\d/.test(p)
      const hasSpecial = /[^A-Za-z0-9]/.test(p)
      const hasUpper = /[A-Z]/.test(p)

      if (isShort) {
        alerts.push({
          id: `weak-len-${item.id}`,
          type: 'weak_password',
          level: 'danger',
          title: `Password terlalu pendek: ${item.name}`,
          body: `Hanya ${p.length} karakter. Password di bawah 10 karakter rentan diserang brute-force.`,
          item
        })
      } else if (!hasNumber || !hasSpecial || !hasUpper) {
        alerts.push({
          id: `weak-comp-${item.id}`,
          type: 'weak_password',
          level: 'warning',
          title: `Password kurang variatif: ${item.name}`,
          body: 'Belum memadukan huruf kapital, angka, dan karakter simbol.',
          item
        })
      }
    }
  }

  // 3. Card Expiry audit
  for (const item of items) {
    if (item.item_type === 'bank_card' && item.expiry) {
      const check = checkCardExpiry(item.expiry)
      if (check === 'expired') {
        alerts.push({
          id: `card-exp-${item.id}`,
          type: 'card_expired',
          level: 'danger',
          title: `Kartu kedaluwarsa: ${item.bank_name || item.name}`,
          body: `Masa berlaku kartu (${item.expiry}) telah berakhir. Perbarui data atau hubungi pihak bank.`,
          item
        })
      } else if (check?.status === 'expiring_soon') {
        alerts.push({
          id: `card-soon-${item.id}`,
          type: 'card_expiring_soon',
          level: 'warning',
          title: `Kartu segera kedaluwarsa: ${item.bank_name || item.name}`,
          body: `Masa berlaku habis dalam ${check.days} hari (${item.expiry}). Siapkan aktivasi kartu baru.`,
          item
        })
      }
    }
  }

  // 4. Document Expiry audit (Paspor, SIM, dll - 90, 30, 7 days reminder)
  for (const item of items) {
    if (item.item_type === 'document' && item.expiry_date) {
      const check = checkDocumentExpiry(item.expiry_date)
      if (check?.status === 'expired') {
        alerts.push({
          id: `doc-exp-${item.id}`,
          type: 'doc_expired',
          level: 'danger',
          title: `Dokumen kedaluwarsa: ${item.name}`,
          body: `Masa berlaku (${item.expiry_date}) telah berakhir. Segera lakukan perpanjangan dokumen.`,
          item
        })
      } else if (check?.status === 'urgent' || check?.status === 'warning_30' || check?.status === 'warning_90') {
        alerts.push({
          id: `doc-soon-${item.id}`,
          type: 'doc_expiring_soon',
          level: check.status === 'urgent' ? 'danger' : 'warning',
          title: `Dokumen segera kedaluwarsa: ${item.name}`,
          body: `Masa berlaku tersisa ${check.daysRemaining} hari (${item.expiry_date}). Persiapkan berkas perpanjangan.`,
          item
        })
      }
    }
  }

  return alerts
}

function guessCategory(row) {
  const u = (row.url || '').toLowerCase()
  if (/instagram|tiktok|facebook|linkedin|twitter|x\.com|discord|youtube/.test(u)) return 'social'
  return 'web'
}

function parseCsv(text) {
  const rows = []
  let row = [],
    cell = '',
    quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i],
      next = text[i + 1]
    if (ch === '"' && quoted && next === '"') {
      cell += '"'
      i += 1
      continue
    }
    if (ch === '"') {
      quoted = !quoted
      continue
    }
    if (ch === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
      continue
    }
    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i += 1
      row.push(cell.trim())
      cell = ''
      if (row.some(Boolean)) rows.push(row)
      row = []
      continue
    }
    cell += ch
  }
  if (cell.length || row.length) {
    row.push(cell.trim())
    if (row.some(Boolean)) rows.push(row)
  }
  if (!rows.length) return []
  const headers = rows.shift().map((h) => h.toLowerCase().replace(/^\ufeff/, ''))
  return rows.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])))
}
