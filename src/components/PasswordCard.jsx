import { Eye, EyeOff, KeyRound, Copy, Check } from './Icons'
import SiteLogo from './SiteLogo'
import { useEffect, useState } from 'react'

export default function PasswordCard({ item, password, onOpen }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!revealed) return undefined
    const timer = setTimeout(() => setRevealed(false), 7000)
    return () => clearTimeout(timer)
  }, [revealed])

  async function copyPassword(event) {
    event.stopPropagation()
    await navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <article className="vault-list-card" onClick={onOpen}>
      <div className="item-icon tone-neutral">{item.url ? <SiteLogo url={item.url} name={item.name} size={20} radius={6} /> : <KeyRound size={18} />}</div>
      <div className="item-copy">
        <div className="item-title-row">
          <strong>{item.name}</strong>
          <span className="category-chip">{item.categoryLabel}</span>
        </div>
        <span className="item-secondary">{item.username || 'No username'}</span>
        <div className="secret-row">
          <span className={revealed ? 'secret-value revealed' : 'secret-value'}>{revealed ? password : '••••••••••••'}</span>
          <div className="secret-actions">
            <button className="mini-icon" title="Copy password" onClick={copyPassword}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
            <button className="mini-icon" title={revealed ? 'Hide password' : 'Reveal password'} onClick={(event) => { event.stopPropagation(); setRevealed((v) => !v) }}>
              {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
