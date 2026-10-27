import { Eye, EyeOff, KeyRound, Copy, Check, Star } from './Icons'
import SiteLogo from './SiteLogo'
import { useEffect, useState, memo } from 'react'
import { copyToClipboardSecure } from '../lib/clipboard'
import { haptic } from '../lib/haptics'
import { useVault } from '../context/VaultContext'

function PasswordCard({ item, password, onOpen, lang = 'id' }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const vault = useVault()
  const showToast = vault?.showToast

  useEffect(() => {
    if (!revealed) return undefined
    const timer = setTimeout(() => setRevealed(false), 7000)
    return () => clearTimeout(timer)
  }, [revealed])

  async function copyPassword(event) {
    event.stopPropagation()
    const success = await copyToClipboardSecure(password, {
      label: item.name || 'Password',
      lang,
      onNotify: showToast
    })
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    }
  }

  return (
    <article className="vault-list-card" onClick={onOpen}>
      <div className="item-icon tone-neutral">{item.url ? <SiteLogo url={item.url} name={item.name} size={20} radius={6} /> : <KeyRound size={18} />}</div>
      <div className="item-copy">
        <div className="item-title-row">
          <div className="flex items-center gap-xs">
            <strong>{item.name}</strong>
            {item.favorite && (
              <Star size={12} className="text-amber-400 fill-amber-400" title={lang === 'id' ? 'Item Favorit' : 'Favorite Item'} />
            )}
          </div>
          <span className="category-chip">{item.categoryLabel}</span>
        </div>
        <span className="item-secondary">{item.username || (lang === 'id' ? 'Tanpa username' : 'No username')}</span>
        <div className="secret-row">
          <span className={revealed ? 'secret-value revealed font-mono' : 'secret-value font-mono'}>{revealed ? password : '••••••••••••'}</span>
          <div className="secret-actions">
            <button className="mini-icon" title={lang === 'id' ? 'Salin password' : 'Copy password'} onClick={copyPassword}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
            <button className="mini-icon" title={revealed ? (lang === 'id' ? 'Sembunyikan password' : 'Hide password') : (lang === 'id' ? 'Tampilkan password' : 'Reveal password')} onClick={(event) => { event.stopPropagation(); haptic('light'); setRevealed((v) => !v) }}>
              {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default memo(PasswordCard)
