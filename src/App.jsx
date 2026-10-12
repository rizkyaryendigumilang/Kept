import { useEffect, useMemo, useRef, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import UnlockScreen from './components/UnlockScreen'
import TopBar from './components/TopBar'
import BottomNav from './components/BottomNav'
import AddSheet from './components/AddSheet'
import AlertsPanel from './pages/AlertsPanel'
import HomePage from './pages/HomePage'
import VaultPage from './pages/VaultPage'
import BankingPage from './pages/BankingPage'
import SettingsPage from './pages/SettingsPage'
import SettingsDrawer from './components/SettingsDrawer'
import DocumentsPage from './pages/DocumentsPage'
import ItemModal from './pages/ItemModal'
import AddItemModal from './pages/AddItemModal'
import AddDocumentModal from './pages/AddDocumentModal'
import DocumentDetailModal from './pages/DocumentDetailModal'
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
  bank_card: 'Account',
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

  const bootstrappedUserRef = useRef(null)

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
      items.map((item) => ({
        ...item,
        categoryLabel: CATEGORY_LABELS[item.category] || CATEGORY_LABELS[item.item_type] || item.category
      })),
    [items]
  )

  const stats = useMemo(
    () => ({
      passwords: hydratedItems.filter((i) => i.item_type === 'password').length,
      banks: hydratedItems.filter((i) => i.item_type === 'bank_card').length,
      documents: hydratedItems.filter((i) => i.item_type === 'document').length
    }),
    [hydratedItems]
  )

  const favorites = useMemo(() => hydratedItems.filter((i) => i.favorite).slice(0, 4), [hydratedItems])
  const recent = useMemo(
    () =>
      [...hydratedItems]
        .sort((a, b) => new Date(b.last_used_at || b.updated_at || 0) - new Date(a.last_used_at || a.updated_at || 0))
        .slice(0, 4),
    [hydratedItems]
  )
  const alerts = useMemo(() => buildAlerts(hydratedItems), [hydratedItems])
  const banks = useMemo(
    () => hydratedItems.filter((i) => i.item_type === 'bank_card').map((b, i) => ({ ...b, _renderIndex: i })),
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

      const decrypted = []
      for (const row of rows) {
        try {
          decrypted.push({ ...row, ...(await decryptItemRow(row, rawKey)) })
        } catch {
          // ignore corrupted items
        }
      }
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
      // Re-hydrate decrypted items
      const decrypted = []
      for (const row of result.rows) {
        try {
          decrypted.push({ ...row, ...(await decryptItemRow(row, currentKey)) })
        } catch {
          // ignore
        }
      }
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
    } else {
      setAddMode(mode)
    }
  }

  function openItem(item) {
    const touched = { ...item, last_used_at: new Date().toISOString() }
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, last_used_at: touched.last_used_at } : i)))
    setSelectedItem(touched)
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
    try {
      await deleteEncryptedItem(session.user.id, id)
      setItems((current) => current.filter((i) => i.id !== id))
      setSelectedItem(null)
      checkPendingQueue(session.user.id)
      showToast('Item dihapus', 1200)
    } catch (err) {
      setError(err.message || 'Gagal menghapus item.')
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

    const decrypted = []
    for (const row of rows) {
      try {
        decrypted.push({ ...row, ...(await decryptItemRow(row, recoveredKey)) })
      } catch {
        // ignore
      }
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

  async function importCsv(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
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
      showToast(`Berhasil mengimpor ${imported.length} item`, 1600)
    } catch (err) {
      setError(`Impor gagal: ${err.message}`)
    } finally {
      event.target.value = ''
    }
  }

  async function exportEncrypted() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: 'kept',
            version: 1,
            exported_at: new Date().toISOString(),
            items: items.map((i) => ({
              id: i.id,
              user_id: i.user_id,
              item_type: i.item_type,
              category: i.category,
              payload: i.payload,
              created_at: i.created_at,
              updated_at: i.updated_at
            }))
          },
          null,
          2
        )
      ],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kept-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    recordSecurityActivity({
      type: 'export_sensitive',
      title: 'Ekspor Cadangan Terenkripsi',
      desc: `Pencadangan data vault diekspor (${items.length} item).`,
      level: 'warning'
    })
  }

  if (authLoading) return <Splash />
  if (recovery) return <ResetPasswordScreen onDone={() => setRecovery(false)} />
  if (!session) return <AuthScreen />
  if (!profile) return <Splash />
  if (!profile.vault_salt || !profile.vault_verifier) {
    return <FirstVaultSetup onCreate={initializeVault} />
  }
  if (!vaultKey) {
    return (
      <UnlockScreen
        profile={profile}
        user={session.user}
        onUnlocked={unlock}
        onRecoverMasterPassword={handleRecoverMasterPassword}
        onResetVault={handleResetVault}
      />
    )
  }

  return (
    <div className="app-shell">
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
      />

      <main className="main-content">
        {route === 'home' && (
          <HomePage
            displayName={profile.display_name}
            stats={stats}
            favorites={favorites}
            recent={recent}
            onNavigate={setRoute}
            onOpenItem={openItem}
            onAdd={() => setShowAdd(true)}
          />
        )}
        {route === 'vault' && (
          <VaultPage items={hydratedItems} onAdd={() => setShowAdd(true)} onOpen={openItem} />
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
          />
        )}
        {route === 'banking' && (
          <BankingPage
            banks={banks}
            styleMode={profile.card_style || 'realistic'}
            onAdd={() => openAdd('bank-card')}
            onOpen={openItem}
          />
        )}
        {route === 'settings' && (
          <SettingsPage
            profile={profile}
            user={session.user}
            vaultKey={vaultKey}
            items={hydratedItems}
            documents={documents}
            isOnline={isOnline}
            pendingSyncCount={pendingSyncCount}
            onTheme={updateTheme}
            onCardStyle={updateCardStyle}
            onSaveProfile={saveProfile}
            onUploadAvatar={uploadProfileAvatar}
            onRemoveAvatar={handleRemoveAvatar}
            onSignOut={signOut}
            onImport={() => document.getElementById('csv-import').click()}
            onExport={exportEncrypted}
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
          />
        )}
      </main>

      <input id="csv-import" type="file" accept=".csv,text/csv" hidden onChange={importCsv} />
      <BottomNav
        active={route}
        menuOpen={menuOpen}
        isSubpage={Boolean(menuSubpage)}
        hamburgerStyle={hamburgerStyle}
        onChange={(r) => {
          if (r === 'settings' || r === 'menu') {
            handleToggleMenu()
          } else {
            if (menuOpen) setMenuOpen(false)
            setRoute(r)
          }
        }}
      />
      <button className="fab" aria-label="Add item" onClick={() => setShowAdd(true)}>
        +
      </button>

      {showAdd && <AddSheet onClose={() => setShowAdd(false)} onChoose={openAdd} />}
      {addMode && vaultKey && <AddItemModal mode={addMode} onClose={() => setAddMode(null)} onSubmit={saveItem} />}
      {docAddModalOpen && vaultKey && (
        <AddDocumentModal
          onClose={() => setDocAddModalOpen(false)}
          onSubmit={(docPayload) => saveItem({ ...docPayload, item_type: 'document' })}
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
        />
      ) : selectedItem ? (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={removeItem}
          onSave={updateItem}
          onToggleFavorite={toggleFavorite}
        />
      ) : null}
      {alertsOpen && (
        <AlertsPanel
          alerts={alerts}
          onClose={() => setAlertsOpen(false)}
          onOpenItem={openItem}
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
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onTheme={updateTheme}
        onCardStyle={updateCardStyle}
        onSaveProfile={saveProfile}
        onUploadAvatar={uploadProfileAvatar}
        onRemoveAvatar={handleRemoveAvatar}
        onSignOut={signOut}
        onImport={() => document.getElementById('csv-import').click()}
        onExport={exportEncrypted}
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
      />
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
    </div>
  )
}

function FirstVaultSetup({ onCreate }) {
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
    if (pin !== confirmPin) return setErr('Konfirmasi Security PIN tidak cocok.')
    if (!confirmedBackup) {
      return setErr('Harap konfirmasi bahwa Anda telah menyimpan Recovery Key.')
    }
    onCreate(pin, generatedKey)
  }

  return (
    <main className="unlock-screen setup-screen">
      <div className="brand-logo-hero">
        <img src="/brand/kept-logo.png" alt="Kept" className="kept-hero-logo" />
      </div>

      <div className="unlock-copy">
        <div className="eyebrow">Setup Awal</div>
        <h1>Inisialisasi Security PIN Vault</h1>
        <p>
          Tentukan 6-digit Security PIN utama Anda. Kunci ini digunakan untuk menurunkan AES-256 key dan tidak pernah dikirim ke server.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="unlock-form">
        <label className="field">
          <span>Security PIN (6 Digit Angka)</span>
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
            Gunakan 6 digit acak. Hindari urutan seperti 123456 atau 111111.
          </span>
        </label>

        <label className="field">
          <span>Konfirmasi Security PIN</span>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Ulangi 6 digit PIN"
            className="font-mono text-center letter-spacing-lg"
            required
          />
        </label>

        {/* Emergency Recovery Key Box */}
        <div className="emergency-kit-box">
          <div className="kit-header">
            <ShieldCheck size={16} />
            <strong>Emergency Recovery Key Anda</strong>
          </div>
          <p className="kit-description">
            Simpan kode pemulihan ini sekarang. Jika Anda lupa Security PIN, kode ini adalah satu-satunya cara membuka vault Anda kembali.
          </p>

          <code className="font-mono recovery-code">{generatedKey}</code>

          <div className="button-row mt-sm">
            <button type="button" className="secondary-button pill-button" onClick={handleCopy}>
              {copiedKey ? <Check size={14} /> : <Copy size={14} />}
              {copiedKey ? 'Tersalin' : 'Salin Kode'}
            </button>
            <button type="button" className="secondary-button pill-button" onClick={handleDownloadKit}>
              <Download size={14} />
              Unduh Emergency Kit
            </button>
          </div>

          <label className="checkbox-field mt-md">
            <input
              type="checkbox"
              checked={confirmedBackup}
              onChange={(e) => setConfirmedBackup(e.target.checked)}
            />
            <span>Saya telah menyimpan Emergency Recovery Key ini di tempat aman.</span>
          </label>
        </div>

        {err && <div className="feedback error">{err}</div>}

        <button
          className="primary-button pill-button mt-md"
          disabled={pin.length !== 6 || confirmPin.length !== 6 || !confirmedBackup}
        >
          Buat Vault & Aktifkan PIN
        </button>
      </form>

      <div className="unlock-note">
        <Lock size={13} /> Zero-knowledge encryption: data hanya dapat didekripsi di perangkat Anda.
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
