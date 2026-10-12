import { CreditCard, Copy, Check, Eye, EyeOff } from './Icons'
import { motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useState } from 'react'

function formatNumber(value, mode) {
  const digits = (value || '').replace(/\D/g, '')
  if (mode === 'hidden') return `•••• •••• ••${digits.slice(-2).padStart(2, '•')}`
  if (mode === 'partial') return `${digits.slice(0, 4).padEnd(4, '•')} •••• ••${digits.slice(-2).padStart(2, '•')}`
  const parts = []
  for (let i = 0; i < digits.length; i += 4) parts.push(digits.slice(i, i + 4))
  return parts.join(' ')
}

export default function BankCard({ bank, styleMode, index, total, cardIndex, onSwipe, onCardClick }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-10, 10])
  const scale = 1 - index * 0.035
  const y = -index * 8
  const [numberMode, setNumberMode] = useState('partial')
  const [copied, setCopied] = useState(false)
  const [showNumber, setShowNumber] = useState(false)
  const numberDisplay = showNumber ? 'full' : numberMode

  useEffect(() => {
    x.set(0)
  }, [index, bank.id])

  useEffect(() => {
    setNumberMode('partial')
    setShowNumber(false)
  }, [bank.id])

  async function copy(event) {
    event.stopPropagation()
    await navigator.clipboard.writeText(bank.card_number || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1300)
  }

  return (
    <motion.article
      className={`bank-card ${styleMode === 'abstract' ? 'abstract-bank-card' : 'realistic-bank-card'} ${index === 0 ? 'active-card' : ''}`}
      style={{ x, y, rotate, scale, zIndex: total - index, background: bank.color }}
      drag={index === 0 && total > 1 ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.35}
      onClick={() => {
        if (index === 0 && onCardClick) onCardClick()
      }}
      onDragEnd={(_, info) => {
        if (total > 1 && (Math.abs(info.offset.x) > 50 || Math.abs(info.velocity.x) > 250)) {
          onSwipe(info.offset.x > 0 ? 'right' : 'left')
        }
      }}
      whileTap={total > 1 ? { cursor: 'grabbing' } : undefined}
    >
      <div className="bank-card-top">
        <div className="bank-name">{bank.bank_name}</div>
        <div className="card-mark">{bank.card_brand || 'DEBIT'}</div>
      </div>
      <div className="bank-chip-row">
        <div className="bank-chip"></div>
        <div className="contactless">))</div>
      </div>
      <div className="bank-card-number">{formatNumber(bank.card_number, numberDisplay)}</div>
      <div className="bank-card-meta">
        <div>
          <span className="micro-label">CARD HOLDER</span>
          <strong>{bank.account_owner || 'YOUR NAME'}</strong>
        </div>
        <div>
          <span className="micro-label">VALID THRU</span>
          <strong>{bank.expiry || '••/••'}</strong>
        </div>
      </div>
      <div className="bank-card-actions">
        <button className="mini-icon light" title="Show full number" onClick={(event) => { event.stopPropagation(); setShowNumber((v) => !v) }}>
          {showNumber ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
        <button className="mini-icon light" title="Copy number" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
        <div className="card-count">{cardIndex || index + 1} / {total}</div>
      </div>
    </motion.article>
  )
}
