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
    <article className="vault-list-card" onClick={() => onOpen?.(item)}>
      <div className="item-icon-tile">
        {item.url ? (
          <SiteLogo url={item.url} name={item.name} size={34} radius={8} />
        ) : (
          <div className="item-icon-fallback">
            <KeyRound size={17} />
          </div>
        )}
      </div>
      <div className="item-copy">
        <div className="item-title-row">
          <div className="item-title-left">
            <strong>{item.name}</strong>
            {item.favorite && (
              <Star
                size={12}
                className="item-favorite-star"
                title={lang === 'id' ? 'Item Favorit' : 'Favorite Item'}
              />
            )}
          </div>
          <span className="category-chip">{item.categoryLabel}</span>
        </div>
        <span className="item-secondary">{item.username || (lang === 'id' ? 'Tanpa username' : 'No username')}</span>
        <div className="secret-row">
          <span className={revealed ? 'secret-value revealed font-mono' : 'secret-value font-mono'}>{revealed ? password : '••••••••••••'}</span>
          <div className="secret-actions">
            <button
              type="button"
              className="mini-icon"
              title={lang === 'id' ? 'Salin password' : 'Copy password'}
              onClick={copyPassword}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              className="mini-icon"
              title={revealed ? (lang === 'id' ? 'Sembunyikan password' : 'Hide password') : (lang === 'id' ? 'Tampilkan password' : 'Reveal password')}
              onClick={(event) => {
                event.stopPropagation()
                haptic('light')
                setRevealed((v) => !v)
              }}
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default memo(PasswordCard, (prev, next) => {
  return (
    prev.item?.id === next.item?.id &&
    prev.item?.updated_at === next.item?.updated_at &&
    prev.item?.name === next.item?.name &&
    prev.item?.username === next.item?.username &&
    prev.item?.favorite === next.item?.favorite &&
    prev.item?.url === next.item?.url &&
    prev.item?.category === next.item?.category &&
    prev.password === next.password &&
    prev.lang === next.lang &&
    prev.onOpen === next.onOpen
  )
})
