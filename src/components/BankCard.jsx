import {
  CreditCard,
  Building2,
  Tag,
  HeartPulse,
  Gift,
  WalletCards,
  Copy,
  Check,
  Eye,
  EyeOff,
  QrCode,
  Star,
  Radio,
  ExternalLink,
  CheckCheck,
  ShieldCheck,
  AlertTriangle,
  Clock
} from './Icons'
import { motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useState } from 'react'
import { haptic } from '../lib/haptics'
import { CARD_CATEGORIES, evaluateCardCapability } from '../lib/cards'
import { getTranslation } from '../lib/i18n'

const CATEGORY_ICON_MAP = {
  bank: CreditCard,
  access: Building2,
  membership: Tag,
  health: HeartPulse,
  voucher: Gift,
  other: WalletCards
}

const CAPABILITY_ICON_MAP = {
  saved: ShieldCheck,
  barcode_ready: QrCode,
  nfc_scanned: Radio,
  digital_credential_required: ExternalLink,
  tap_ready: CheckCheck,
  unsupported: AlertTriangle,
  expired: Clock
}

function formatCardIdentifier(value, isFull) {
  if (!value) return '•••• •••• •••• ••••'
  const clean = String(value).trim()
  if (isFull) {
    const parts = []
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.slice(i, i + 4))
    }
    return parts.join(' ')
  }
  // Masked format
  const digits = clean.replace(/\D/g, '')
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)} •••• ••${digits.slice(-2)}`
  }
  if (clean.length > 4) {
    return `•••• •••• ${clean.slice(-4)}`
  }
  return clean
}

export default function BankCard({
  bank,
  styleMode,
  index,
  total,
  cardIndex,
  onSwipe,
  onCardClick,
  onShowBarcode,
  onToggleFavorite,
  lang = 'id'
}) {
  const card = bank || {}
  const t = (k) => getTranslation(k, lang)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-8, 8])
  const scale = 1 - index * 0.04
  const y = -index * 10

  const [copied, setCopied] = useState(false)
  const [showFullNumber, setShowFullNumber] = useState(false)

  const capability = evaluateCardCapability(card)
  const categoryId = card.category || 'bank'
  const categoryConfig = CARD_CATEGORIES.find((c) => c.id === categoryId) || CARD_CATEGORIES[0]
  const CategoryIcon = CATEGORY_ICON_MAP[categoryId] || CreditCard
  const CapIcon = CAPABILITY_ICON_MAP[capability.id] || ShieldCheck

  useEffect(() => {
    x.set(0)
  }, [index, card.id])

  useEffect(() => {
    setShowFullNumber(false)
  }, [card.id])

  const copyNumber = async (e) => {
    e.stopPropagation()
    const textToCopy = card.card_number || card.account_number || card.barcode_value || ''
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      haptic('success')
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // ignore
    }
  }

  const cardBackground = card.color || categoryConfig?.color || '#0056b3'

  const identifier = card.card_number || card.account_number || card.barcode_value || card.nfc_uid || ''

  return (
    <motion.article
      className={`bank-card compact-swipe-card ${index === 0 ? 'active-card' : ''}`}
      style={{
        x,
        y,
        rotate,
        scale,
        zIndex: total - index,
        background: cardBackground
      }}
      drag={index === 0 && total > 1 ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.35}
      onClick={() => {
        if (index === 0 && onCardClick) onCardClick(card)
      }}
      onDragEnd={(_, info) => {
        if (total > 1 && (Math.abs(info.offset.x) > 45 || Math.abs(info.velocity.x) > 220)) {
          haptic('medium')
          onSwipe(info.offset.x > 0 ? 'right' : 'left')
        }
      }}
      whileTap={total > 1 ? { cursor: 'grabbing' } : undefined}
    >
      {/* Top Header Row */}
      <div className="bank-card-top compact-card-top">
        <div className="compact-card-title-group">
          <span className="compact-card-issuer">
            {card.bank_name || card.issuer || 'Personal Vault'}
          </span>
          <span className="compact-card-name">{card.name || 'Kartu'}</span>
        </div>

        <div className="compact-card-badges-row">
          {onToggleFavorite && (
            <button
              type="button"
              className={`compact-fav-btn ${card.favorite ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                haptic('light')
                onToggleFavorite(card.id)
              }}
              title="Favorit"
              aria-label="Favorit"
            >
              <Star size={14} fill={card.favorite ? 'currentColor' : 'none'} />
            </button>
          )}

          <div className="compact-category-chip">
            <CategoryIcon size={11} />
            <span>{t(categoryConfig.labelKey)}</span>
          </div>

          <div className="card-mark">{card.card_brand || 'CARD'}</div>
        </div>
      </div>

      {/* Chip & Contactless Waves */}
      <div className="bank-chip-row compact-chip-row">
        <div className="compact-chip-left">
          <div className="bank-chip compact-chip" />
          <span className="contactless">))</span>
        </div>
      </div>

      {/* Identifier / Card Number */}
      <div className="bank-card-number compact-card-number">
        {formatCardIdentifier(identifier, showFullNumber)}
      </div>

      {/* Meta: Holder, Expiry, Actions */}
      <div className="bank-card-meta compact-card-meta">
        <div className="compact-meta-holder">
          <span className="micro-label">CARD HOLDER</span>
          <strong className="compact-holder-text">
            {card.name || card.account_owner || 'YOUR NAME'}
          </strong>
        </div>

        {card.expiry && (
          <div className="compact-meta-expiry">
            <span className="micro-label">VALID THRU</span>
            <strong>{card.expiry}</strong>
          </div>
        )}
      </div>

      {/* Card Action Controls */}
      <div className="bank-card-actions compact-card-actions" onClick={(e) => e.stopPropagation()}>
        <div className="compact-action-buttons-group">
          <button
            type="button"
            className="mini-icon light"
            title={showFullNumber ? 'Sembunyikan nomor' : 'Tampilkan nomor'}
            onClick={() => {
              haptic('light')
              setShowFullNumber((v) => !v)
            }}
          >
            {showFullNumber ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          {identifier && (
            <button
              type="button"
              className="mini-icon light"
              title="Salin nomor"
              onClick={copyNumber}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}

          {card.barcode_value && onShowBarcode && (
            <button
              type="button"
              className="mini-icon light highlight-barcode-icon"
              title={t('card_show_barcode')}
              onClick={() => {
                haptic('medium')
                onShowBarcode(card)
              }}
            >
              <QrCode size={14} />
            </button>
          )}
        </div>

        <div className="card-count compact-card-count">
          {cardIndex || index + 1} / {total}
        </div>
      </div>
    </motion.article>
  )
}
