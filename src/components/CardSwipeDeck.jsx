import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform } from 'motion/react'
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
import { CARD_CATEGORIES, evaluateCardCapability } from '../lib/cards'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

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
  const digits = clean.replace(/\D/g, '')
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)} •••• ••${digits.slice(-2)}`
  }
  if (clean.length > 4) {
    return `•••• •••• ${clean.slice(-4)}`
  }
  return clean
}

/**
 * Single Card Item dengan gestur drag, dynamic rotation, & stack offset
 */
function SwipeableCard({
  item,
  index,
  total,
  onSwipe,
  onClick,
  onShowBarcode,
  onToggleFavorite,
  lang = 'id'
}) {
  const x = useMotionValue(0)

  // Efek fisika: kartu miring sedikit saat digeser ke kiri/kanan (-8deg s/d +8deg)
  const rotate = useTransform(x, [-200, 200], [-8, 8])

  // Efek kedalaman tumpukan (kartu di belakang lebih kecil dan sedikit ke atas)
  const scale = 1 - index * 0.04
  const y = -index * 10
  const zIndex = total - index
  const isActive = index === 0

  const [copied, setCopied] = useState(false)
  const [showFullNumber, setShowFullNumber] = useState(false)

  const t = (k) => getTranslation(k, lang)
  const capability = evaluateCardCapability(item)
  const categoryId = item.category || 'bank'
  const categoryConfig = CARD_CATEGORIES.find((c) => c.id === categoryId) || CARD_CATEGORIES[0]
  const CategoryIcon = CATEGORY_ICON_MAP[categoryId] || CreditCard
  const CapIcon = CAPABILITY_ICON_MAP[capability.id] || ShieldCheck

  const cardBackground = item.color || categoryConfig?.color || '#0056b3'

  const identifier = item.card_number || item.account_number || item.barcode_value || item.nfc_uid || ''

  // Reset posisi x saat giliran kartu berubah
  useEffect(() => {
    x.set(0)
    setShowFullNumber(false)
  }, [index, item.id])

  const copyNumber = async (e) => {
    e.stopPropagation()
    if (!identifier) return
    try {
      await navigator.clipboard.writeText(identifier)
      setCopied(true)
      haptic('success')
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // ignore
    }
  }

  return (
    <motion.div
      className={`swipe-card compact-swipe-card bank-card ${isActive ? 'is-active' : 'is-background'}`}
      style={{
        x,
        y,
        scale,
        rotate,
        zIndex,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: cardBackground,
        color: '#ffffff'
      }}
      // Hanya kartu teratas yang dapat digeser (drag)
      drag={isActive && total > 1 ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.35} // Resistensi elastis kenyal
      onClick={() => {
        if (isActive && onClick) onClick(item)
      }}
      onDragEnd={(_, info) => {
        if (total <= 1) return

        // Trigger swipe jika jarak geser > 60px ATAU kecepatan flick > 300px/dtk
        const isFlick = Math.abs(info.velocity.x) > 300
        const isPassedThreshold = Math.abs(info.offset.x) > 60

        if (isFlick || isPassedThreshold) {
          // Getaran getar halus di mobile (haptic)
          haptic('medium')
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10)
          }
          onSwipe(info.offset.x > 0 ? 'right' : 'left')
        }
      }}
      whileTap={isActive && total > 1 ? { cursor: 'grabbing' } : undefined}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30
      }}
    >
      {/* Top Header Row */}
      <div className="compact-card-top">
        <div className="compact-card-title-group">
          <span className="compact-card-issuer">
            {item.bank_name || item.issuer || 'Personal Vault'}
          </span>
          <span className="compact-card-name">{item.name || 'Kartu'}</span>
        </div>

        <div className="compact-card-badges-row">
          {onToggleFavorite && (
            <button
              type="button"
              className={`compact-fav-btn ${item.favorite ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                haptic('light')
                onToggleFavorite(item.id)
              }}
              title="Favorit"
              aria-label="Favorit"
            >
              <Star size={13} fill={item.favorite ? 'currentColor' : 'none'} />
            </button>
          )}

          <div className="compact-category-chip">
            <CategoryIcon size={11} />
            <span>{t(categoryConfig.labelKey)}</span>
          </div>

          <div className="card-mark">{item.card_brand || 'CARD'}</div>
        </div>
      </div>

      {/* Chip & Contactless Waves */}
      <div className="compact-chip-row">
        <div className="compact-chip-left">
          <div className="compact-chip" />
          <span className="contactless">))</span>
        </div>
      </div>

      {/* Identifier / Card Number */}
      <div className="compact-card-number">
        {formatCardIdentifier(identifier, showFullNumber)}
      </div>

      {/* Meta: Holder, Expiry */}
      <div className="compact-card-meta">
        <div className="compact-meta-holder">
          <span className="micro-label">CARD HOLDER</span>
          <strong className="compact-holder-text">
            {item.name || item.account_owner || 'YOUR NAME'}
          </strong>
        </div>

        {item.expiry && (
          <div className="compact-meta-expiry">
            <span className="micro-label">VALID THRU</span>
            <strong>{item.expiry}</strong>
          </div>
        )}
      </div>

      {/* Card Quick Actions */}
      <div className="compact-card-actions" onClick={(e) => e.stopPropagation()}>
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

          {item.barcode_value && onShowBarcode && (
            <button
              type="button"
              className="mini-icon light highlight-barcode-icon"
              title={t('card_show_barcode')}
              onClick={() => {
                haptic('medium')
                onShowBarcode(item)
              }}
            >
              <QrCode size={14} />
            </button>
          )}
        </div>

        <div className="compact-card-count">
          {total - index} / {total}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Container Deck Pembungkus
 */
export default function CardSwipeDeck({
  items = [],
  currentIndex = 0,
  onIndexChange,
  onCardClick,
  onShowBarcode,
  onToggleFavorite,
  lang = 'id'
}) {
  const [internalIndex, setInternalIndex] = useState(currentIndex)

  useEffect(() => {
    setInternalIndex(currentIndex)
  }, [currentIndex])

  if (!items || items.length === 0) {
    return null
  }

  const safeIndex = internalIndex % items.length

  const handleSwipe = (direction) => {
    const next = (safeIndex + (direction === 'left' ? 1 : -1) + items.length) % items.length
    setInternalIndex(next)
    if (onIndexChange) onIndexChange(next, items[next])
  }

  return (
    <div className="card-swipe-deck-container">
      <div className="card-swipe-deck-stack">
        {items.map((item, i) => {
          // Hitung urutan posisi relatif terhadap kartu aktif
          const position = (i - safeIndex + items.length) % items.length

          // Render hanya 3-4 kartu teratas untuk performa maksimal
          if (position > 3) return null

          return (
            <SwipeableCard
              key={item.id || i}
              item={item}
              index={position}
              total={items.length}
              onSwipe={handleSwipe}
              onClick={onCardClick}
              onShowBarcode={onShowBarcode}
              onToggleFavorite={onToggleFavorite}
              lang={lang}
            />
          )
        })}
      </div>
    </div>
  )
}
