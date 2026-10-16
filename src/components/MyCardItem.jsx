import { useState, memo } from 'react'
import {
  CreditCard,
  Building2,
  Tag,
  HeartPulse,
  Gift,
  WalletCards,
  Star,
  QrCode,
  Radio,
  ExternalLink,
  CheckCheck,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronRight
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

function maskCardIdentifier(number, isSecret = true) {
  if (!number) return '•••• ••••'
  const clean = String(number).trim()
  if (!isSecret) return clean
  if (clean.length <= 4) return `••${clean}`
  const last4 = clean.slice(-4)
  if (clean.length > 10) {
    return `•••• •••• ••${last4.slice(-2)}`
  }
  return `•••• ${last4}`
}

function MyCardItem({
  card,
  onClick,
  onShowBarcode,
  onToggleFavorite,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)
  const capability = evaluateCardCapability(card)

  const categoryId = card.category || 'bank'
  const categoryConfig = CARD_CATEGORIES.find((c) => c.id === categoryId) || CARD_CATEGORIES[0]
  const CategoryIcon = CATEGORY_ICON_MAP[categoryId] || CreditCard
  const CapIcon = CAPABILITY_ICON_MAP[capability.id] || ShieldCheck

  const cardBackground =
    card.color && card.color.startsWith('#')
      ? `linear-gradient(135deg, ${card.color} 0%, rgba(15, 23, 42, 0.9) 100%)`
      : card.color || categoryConfig.gradient

  const identifier =
    card.card_number ||
    card.account_number ||
    card.barcode_value ||
    card.nfc_uid ||
    card.notes ||
    '•••• ••••'

  return (
    <div
      className={`my-card-grid-item ${card.favorite ? 'is-favorited' : ''}`}
      onClick={() => {
        haptic('light')
        onClick(card)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(card)
        }
      }}
    >
      <div className="my-card-visual" style={{ background: cardBackground }}>
        <div className="my-card-visual-top">
          <span className="my-card-issuer">{card.bank_name || card.issuer || 'Personal Vault'}</span>
          <div className="my-card-visual-badges">
            {onToggleFavorite && (
              <button
                type="button"
                className={`my-card-fav-btn ${card.favorite ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  haptic('light')
                  onToggleFavorite(card.id)
                }}
                title="Favorit"
                aria-label="Favorit"
              >
                <Star size={13} fill={card.favorite ? 'currentColor' : 'none'} />
              </button>
            )}
            <span className="my-card-brand">{card.card_brand || 'CARD'}</span>
          </div>
        </div>

        <div className="my-card-chip-symbol">
          <div className="micro-chip" />
          <span className="contactless-waves">))</span>
        </div>

        <div className="my-card-visual-number">
          {maskCardIdentifier(identifier, true)}
        </div>

        <div className="my-card-visual-bottom">
          <span className="my-card-holder-name">{card.name || card.account_owner || 'Cardholder'}</span>
          {card.expiry && <span className="my-card-expiry-badge">{card.expiry}</span>}
        </div>
      </div>

      <div className="my-card-details-row">
        <div className="my-card-meta-left">
          <div className="my-card-category-tag">
            <CategoryIcon size={12} />
            <span>{t(categoryConfig.labelKey)}</span>
          </div>

          {capability.id !== 'secure_only' && (
            <div className={`my-card-capability-tag ${capability.badgeClass}`}>
              <CapIcon size={11} />
              <span>{t(capability.labelKey)}</span>
            </div>
          )}
        </div>

        {card.barcode_value && onShowBarcode && (
          <button
            type="button"
            className="my-card-quick-barcode-btn"
            onClick={(e) => {
              e.stopPropagation()
              haptic('medium')
              onShowBarcode(card)
            }}
            title={t('card_show_barcode')}
            aria-label={t('card_show_barcode')}
          >
            <QrCode size={15} />
          </button>
        )}
      </div>
    </div>
  )
}

export default memo(MyCardItem)
