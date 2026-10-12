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
import ItemModal from './pages/ItemModal'
import AddItemModal from './pages/AddItemModal'
import { supabase } from './lib/supabase'
import { deriveVaultKey, encryptJson, generateSalt, keyFingerprint } from './lib/crypto'
import { createVerifier, deleteEncryptedItem, ensureProfile, fetchEncryptedItems, setProfilePreference, upsertEncryptedItem, loadCachedItems, uploadAvatar } from './lib/vault'
import { idbClearUser } from './lib/idb'

const CATEGORY_LABELS = { social: 'Social Media', web: 'Web Password', project: 'Project Password', secure_note: 'Secure Note', bank_card: 'Bank / ATM' }

function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark'
  else if (theme === 'light') document.documentElement.dataset.theme = 'light'
  else document.documentElement.dataset.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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
  const [selectedItem, setSelectedItem] = useState(null)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const bootstrappedUserRef = useRef(null)

  useEffect(() => {
    let mounted = true
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
      else { setProfile(null); setVaultKey(null); setItems([]) }
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [])

  async function bootstrapUser(user) {
    try {
      const p = await ensureProfile(user, user.user_metadata?.display_name)

      // Keep the vault scoped to one account. If a different user signs in on
      // this device, drop the previous account's in-memory vault entirely so
      // nothing can leak across accounts.
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

      applyTheme(p.theme || 'system')
      const cached = await loadCachedItems(user.id)
      if (cached.length) {
        // Encrypted cache can render as soon as the vault is unlocked.
      }
    } catch (err) { setError(err.message || 'Unable to load your profile.') }
  }

  useEffect(() => {
    const onStorage = () => profile && applyTheme(profile.theme || 'system')
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [profile])

  const hydratedItems = useMemo(() => items.map((item) => ({ ...item, categoryLabel: CATEGORY_LABELS[item.category] || CATEGORY_LABELS[item.item_type] || item.category })), [items])
  const stats = useMemo(() => ({ passwords: hydratedItems.filter((i) => i.item_type === 'password').length, banks: hydratedItems.filter((i) => i.item_type === 'bank_card').length }), [hydratedItems])
  const favorites = useMemo(() => hydratedItems.filter((i) => i.favorite).slice(0, 4), [hydratedItems])
  const recent = useMemo(() => [...hydratedItems].sort((a,b) => new Date(b.last_used_at || b.updated_at || 0) - new Date(a.last_used_at || a.updated_at || 0)).slice(0,4), [hydratedItems])
  const alerts = useMemo(() => buildAlerts(hydratedItems), [hydratedItems])
  const banks = useMemo(() => hydratedItems.filter((i)=>i.item_type==='bank_card').map((b,i)=>({...b,_renderIndex:i})), [hydratedItems])

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
        try { decrypted.push({ ...row, ...(await decryptItemRow(row, rawKey)) }) } catch { /* corrupted items are ignored */ }
      }
      setItems(decrypted)
      setToast(`Vault unlocked · ${keyFingerprint(rawKey)}`)
      setTimeout(() => setToast(''), 1600)
    } catch (err) { setError(err.message || 'Unable to load vault.') }
  }

  async function decryptItemRow(row, key) {
    const { decryptJson } = await import('./lib/crypto')
    return decryptJson(row.payload, key)
  }

  async function saveItem(form) {
    if (!vaultKey) {
      setError('Vault is locked. Unlock your vault with your master password before adding data.')
      return
    }
    try {
      const payload = await encryptJson(form, vaultKey)
      const row = await upsertEncryptedItem(session.user.id, form.item_type, form.item_type === 'bank_card' ? 'bank_card' : form.category, payload, form.id || null)
      const updated = { ...row, ...form, category: form.item_type === 'secure_note' ? 'secure_note' : (form.item_type === 'bank_card' ? 'bank_card' : form.category), payload }
      setItems((current) => form.id ? current.map((i) => i.id === form.id ? updated : i) : [updated, ...current])
      setShowAdd(false); setAddMode(null); setSelectedItem(null)
      setToast('Saved securely')
      setTimeout(() => setToast(''), 1400)
    } catch (err) { setError(err.message || 'Unable to save item.') }
  }

  function openAdd(mode) { setShowAdd(false); setAddMode(mode) }
  function openItem(item) {
    const touched = { ...item, last_used_at: new Date().toISOString() }
    setItems((current) => current.map((i) => i.id === item.id ? { ...i, last_used_at: touched.last_used_at } : i))
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
      const row = await upsertEncryptedItem(session.user.id, updated.item_type, updated.item_type === 'bank_card' ? 'bank_card' : updated.category, payload, id)
      setItems((current) => current.map((i) => i.id === id ? { ...row, ...updated, payload } : i))
      setSelectedItem((current) => current?.id === id ? { ...current, ...updated, payload } : current)
    } catch (err) { setError(err.message || 'Unable to update favorite.') }
  }

  async function removeItem(id) {
    try {
      await deleteEncryptedItem(session.user.id, id)
      setItems((current) => current.filter((i) => i.id !== id))
      setSelectedItem(null)
      setToast('Removed')
      setTimeout(() => setToast(''), 1200)
    } catch (err) { setError(err.message || 'Unable to delete item.') }
  }

  async function initializeVault(masterPassword) {
    const salt = generateSalt()
    const key = deriveVaultKey(masterPassword, salt)
    const verifier = await createVerifier(key)
    const p = await setProfilePreference(session.user.id, { vault_salt: salt, vault_verifier: verifier, theme: 'system', card_style: 'realistic' })
    setProfile(p)
    setVaultKey(key)
    await fetchEncryptedItems(session.user.id)
  }

  async function saveProfile(patch) { try { const p=await setProfilePreference(session.user.id, patch); setProfile(p); setToast('Profile updated'); setTimeout(()=>setToast(''),1200) } catch (err) { setError(err.message) } }

  async function uploadProfileAvatar(file) {
    try {
      const avatarUrl = await uploadAvatar(session.user.id, file)
      setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current)
      setToast('Avatar updated')
      setTimeout(() => setToast(''), 1200)
      return avatarUrl
    } catch (err) {
      setError(err.message || 'Unable to upload avatar.')
      throw err
    }
  }
  async function updateTheme(theme) { try { const p=await setProfilePreference(session.user.id,{theme}); setProfile(p); applyTheme(theme) } catch(err){setError(err.message)} }
  async function updateCardStyle(card_style) { try { const p=await setProfilePreference(session.user.id,{card_style}); setProfile(p) } catch(err){setError(err.message)} }
  async function signOut() {
    const userId = session?.user?.id
    try { await supabase.auth.signOut() } catch (err) { setError(err.message) }
    if (userId) { try { await idbClearUser(userId) } catch { /* cache cleanup is best effort */ } }
    setProfile(null); setVaultKey(null); setItems([]); setSelectedItem(null); setAddMode(null); setShowAdd(false); setRoute('home')
  }

  async function importCsv(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      const imported = rows.map((r) => ({ item_type:'password', category:guessCategory(r), name:r.name||r.title||r.url||'Imported password', username:r.username||r.email||'', password:r.password||'', url:r.url||'', notes:r.notes||'', favorite:false, last_used_at:new Date().toISOString() }))
      for (const row of imported) await saveItem(row)
      setToast(`Imported ${imported.length} items`); setTimeout(()=>setToast(''),1600)
    } catch(err){setError(`Import failed: ${err.message}`)} finally { event.target.value='' }
  }
  async function exportEncrypted() {
    const blob = new Blob([JSON.stringify({ version:1, exported_at:new Date().toISOString(), items: items.map((i)=>({ id:i.id,user_id:i.user_id,item_type:i.item_type,category:i.category,payload:i.payload,created_at:i.created_at,updated_at:i.updated_at })) }, null, 2)], {type:'application/json'})
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`vault-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url)
  }

  if (authLoading) return <Splash />
  if (recovery) return <ResetPasswordScreen onDone={() => setRecovery(false)} />
  if (!session) return <AuthScreen />
  if (!profile) return <Splash />
  if (!profile.vault_salt || !profile.vault_verifier) return <FirstVaultSetup onCreate={initializeVault} />
  if (!vaultKey) return <UnlockScreen profile={profile} user={session.user} onUnlocked={unlock} />

  return <div className="app-shell">
    <TopBar user={session.user} profile={profile} unread={alerts.length} onAlerts={()=>setAlertsOpen(true)} onSettings={()=>setRoute('settings')} />
    <main className="main-content">
      {route === 'home' && <HomePage displayName={profile.display_name} stats={stats} favorites={favorites} recent={recent} onNavigate={setRoute} onOpenItem={openItem} onAdd={()=>setShowAdd(true)} />}
      {route === 'vault' && <VaultPage items={hydratedItems} onAdd={()=>setShowAdd(true)} onOpen={openItem} />}
      {route === 'banking' && <BankingPage banks={banks} styleMode={profile.card_style || 'realistic'} onAdd={()=>setShowAdd(true)} onOpen={openItem} />}
      {route === 'settings' && <SettingsPage profile={profile} user={session.user} vaultKey={vaultKey} onTheme={updateTheme} onCardStyle={updateCardStyle} onSaveProfile={saveProfile} onUploadAvatar={uploadProfileAvatar} onSignOut={signOut} onImport={()=>document.getElementById('csv-import').click()} onExport={exportEncrypted} />}
    </main>
    <input id="csv-import" type="file" accept=".csv,text/csv" hidden onChange={importCsv} />
    <BottomNav active={route === 'settings' ? '' : route} onChange={setRoute} />
    <button className="fab" aria-label="Add item" onClick={()=>setShowAdd(true)}>+</button>
    {showAdd && <AddSheet onClose={()=>setShowAdd(false)} onChoose={openAdd} />}
    {addMode && vaultKey && <AddItemModal mode={addMode} onClose={()=>setAddMode(null)} onSubmit={saveItem} />}
    {selectedItem && <ItemModal item={selectedItem} onClose={()=>setSelectedItem(null)} onDelete={removeItem} onSave={updateItem} onToggleFavorite={toggleFavorite} />}
    {alertsOpen && <AlertsPanel alerts={alerts} onClose={()=>setAlertsOpen(false)} />}
    {toast && <div className="toast">{toast}</div>}
    {error && <div className="error-banner" onClick={()=>setError('')}>{error}</div>}
  </div>
}

function Splash(){return <div className="splash"><div className="brand-mark large">V</div><span>Vault</span></div>}
function FirstVaultSetup({ onCreate }){const [p,setP]=useState(''); const [c,setC]=useState(''); const [err,setErr]=useState(''); return <main className="unlock-screen"><div className="unlock-orb"><ShieldCheckIcon /></div><div className="unlock-copy"><div className="eyebrow">First setup</div><h1>Create your master password.</h1><p>Choose something unique and memorable. There is no server-side recovery for plaintext vault content.</p></div><form onSubmit={(e)=>{e.preventDefault();if(p.length<10)return setErr('Use at least 10 characters.');if(p!==c)return setErr('Passwords do not match.');onCreate(p)}} className="unlock-form"><label className="field"><span>Master Password</span><input type="password" value={p} onChange={(e)=>setP(e.target.value)} required /></label><label className="field"><span>Confirm Master Password</span><input type="password" value={c} onChange={(e)=>setC(e.target.value)} required /></label><button className="primary-button">Create secure vault</button></form>{err&&<div className="feedback error">{err}</div>}<div className="unlock-note">Your master password becomes the root of your vault encryption key.</div></main>}
function ShieldCheckIcon(){return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 13c0 5-3.5 8-8 9-4.5-1-8-4-8-9V5l8-3 8 3v8Z"/><path d="m9 12 2 2 4-4"/></svg>}
function buildAlerts(items){return items.filter((i)=>i.item_type==='password' && i.password && i.password.length<10).slice(0,4).map((i)=>({id:i.id,level:'warning',title:`Weak password: ${i.name}`,body:'Consider replacing it with a longer unique password.'}))}
function guessCategory(row){const u=(row.url||'').toLowerCase(); if(/instagram|tiktok|facebook|linkedin|twitter|x\.com|discord|youtube/.test(u)) return 'social'; return 'web'}
function parseCsv(text){
  const rows=[]; let row=[], cell='', quoted=false
  for(let i=0;i<text.length;i+=1){
    const ch=text[i], next=text[i+1]
    if(ch==='"' && quoted && next==='"'){ cell+='"'; i+=1; continue }
    if(ch==='"'){ quoted=!quoted; continue }
    if(ch===',' && !quoted){ row.push(cell.trim()); cell=''; continue }
    if((ch==='\n' || ch==='\r') && !quoted){ if(ch==='\r' && next==='\n') i+=1; row.push(cell.trim()); cell=''; if(row.some(Boolean)) rows.push(row); row=[]; continue }
    cell+=ch
  }
  if(cell.length || row.length){ row.push(cell.trim()); if(row.some(Boolean)) rows.push(row) }
  if(!rows.length)return []
  const headers=rows.shift().map((h)=>h.toLowerCase().replace(/^\ufeff/,''));
  return rows.map((values)=>Object.fromEntries(headers.map((h,i)=>[h,values[i]||''])))
}
