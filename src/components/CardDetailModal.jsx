import { useState } from 'react'
import {
  X,
  CreditCard,
  Building2,
  Tag,
  HeartPulse,
  Gift,
  WalletCards,
  Star,
  Copy,
  Check,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  QrCode,
  Radio,
  ExternalLink,
  CheckCheck,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Smartphone,
  Camera
} from './Icons'
import {
  CARD_CATEGORIES,
  evaluateCardCapability
} from '../lib/cards'
import { copyToClipboardSecure } from '../lib/clipboard'
import { useVault } from '../context/VaultContext'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'
import ConfirmToast from './ConfirmToast'
import CardNfcReaderModal from './CardNfcReaderModal'
import CardCameraScannerModal from './CardCameraScannerModal'
import CardTapModal from './CardTapModal'

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

export default function CardDetailModal({
  card,
  onClose,
  onEdit,
  onDelete,
  onShowBarcode,
  onToggleFavorite,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)
  const [showFullNumber, setShowFullNumber] = useState(false)
  const [copiedKey, setCopiedKey] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isNfcModalOpen, setIsNfcModalOpen] = useState(false)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [isTapModalOpen, setIsTapModalOpen] = useState(false)

  const handleSaveNfcUid = (tag) => {
    if (onEdit && tag?.uid) {
      onEdit({
        ...card,
        nfc_uid: tag.uid
      })
    }
  }

  const handleScanBarcodeResult = (res) => {
    if (onEdit && res?.value) {
      onEdit({
        ...card,
        barcode_value: res.value,
        barcode_type: res.type || 'code128'
      })
    }
  }

  if (!card) return null

  const capability = evaluateCardCapability(card)
  const categoryId = card.category || 'bank'
  const categoryConfig = CARD_CATEGORIES.find((c) => c.id === categoryId) || CARD_CATEGORIES[0]
  const CategoryIcon = CATEGORY_ICON_MAP[categoryId] || CreditCard
  const CapIcon = CAPABILITY_ICON_MAP[capability.id] || ShieldCheck

  const cardBackground = card.color || categoryConfig?.color || '#0056b3'

  const vault = useVault()
  const showToast = vault?.showToast

  const copyToClipboard = async (text, key) => {
    if (!text) return
    const label = key === 'cvv' ? 'CVV' : key === 'pin' ? 'PIN' : 'Nomor Kartu'
    const success = await copyToClipboardSecure(text, {
      label,
      lang,
      onNotify: showToast
    })
    if (success) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1400)
    }
  }

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section
        className="card-detail-dialog compact-detail-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={card.name || 'Card Details'}
      >
        <div className="card-detail-header">
          <div className="card-detail-tag-row">
            <span className="my-card-category-tag">
              <CategoryIcon size={13} />
              {t(categoryConfig.labelKey)}
            </span>
          </div>

          <div className="card-detail-head-actions">
            {onToggleFavorite && (
              <button
                type="button"
                className={`icon-button ${card.favorite ? 'active' : ''}`}
                onClick={() => {
                  haptic('light')
                  onToggleFavorite(card.id)
                }}
                title="Favorit"
                aria-label="Favorit"
              >
                <Star size={16} fill={card.favorite ? 'currentColor' : 'none'} />
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              onClick={() => {
                haptic('light')
                onClose()
              }}
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Visual Card Preview */}
        <div className="card-detail-visual" style={{ background: cardBackground }}>
          <div className="card-detail-visual-top">
            <span className="card-detail-issuer">{card.bank_name || card.issuer || 'Personal Vault'}</span>
            <span className="card-detail-brand">{card.card_brand || 'CARD'}</span>
          </div>

          <div className="card-detail-chip">
            <div className="bank-chip" />
            <span className="contactless">))</span>
          </div>

          <div className="card-detail-number">
            {showFullNumber
              ? card.card_number || card.account_number || card.barcode_value || '•••• •••• •••• ••••'
              : (card.card_number || card.account_number || card.barcode_value || '').length > 4
                ? `•••• •••• ••${(card.card_number || card.account_number || card.barcode_value || '').slice(-4)}`
                : '•••• ••••'}
          </div>

          <div className="card-detail-visual-bottom">
            <div>
              <span className="micro-label">CARD HOLDER</span>
              <strong>{card.name || card.account_owner || 'YOUR NAME'}</strong>
            </div>
            <div>
              <span className="micro-label">EXPIRES</span>
              <strong>{card.expiry || '••/••'}</strong>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="card-detail-primary-actions">
          {card.barcode_value && onShowBarcode ? (
            <button
              type="button"
              className="primary-button pill-button flex-1"
              onClick={() => {
                haptic('medium')
                onShowBarcode(card)
              }}
            >
              <QrCode size={16} />
              <span>{t('card_show_barcode')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="secondary-button pill-button flex-1"
              onClick={() => {
                haptic('light')
                setIsCameraModalOpen(true)
              }}
            >
              <Camera size={15} />
              <span>Pindai Barcode / QR</span>
            </button>
          )}

          <button
            type="button"
            className="secondary-button pill-button"
            onClick={() => {
              haptic('light')
              setShowFullNumber((v) => !v)
            }}
          >
            {showFullNumber ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{showFullNumber ? t('card_preview_hide') : t('card_preview_show')}</span>
          </button>
        </div>

        {/* Quick NFC & Tap Testing Tools */}
        <div className="card-detail-nfc-actions-row">
          <button
            type="button"
            className="nfc-action-pill-btn"
            onClick={() => {
              haptic('light')
              setIsNfcModalOpen(true)
            }}
          >
            <Radio size={14} />
            <span>{card.nfc_uid ? 'Uji / Baca Ulang NFC' : 'Pindai Tag NFC'}</span>
          </button>

          <button
            type="button"
            className="nfc-action-pill-btn tap-ready-btn"
            onClick={() => {
              haptic('light')
              setIsTapModalOpen(true)
            }}
          >
            <Smartphone size={14} />
            <span>Uji Tap Ready</span>
          </button>
        </div>

        {/* Card Fields List */}
        <div className="card-detail-fields">
          {card.card_number && (
            <div className="card-field-row">
              <div>
                <span className="field-label">Nomor Kartu / ID</span>
                <span className="field-value font-mono">
                  {showFullNumber ? card.card_number : `•••• •••• ••${card.card_number.slice(-4)}`}
                </span>
              </div>
              <button
                className="icon-button-subtle"
                onClick={() => copyToClipboard(card.card_number, 'card_number')}
                title={t('card_copy_number')}
              >
                {copiedKey === 'card_number' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}

          {card.account_number && (
            <div className="card-field-row">
              <div>
                <span className="field-label">Nomor Rekening / Akun</span>
                <span className="field-value font-mono">{card.account_number}</span>
              </div>
              <button
                className="icon-button-subtle"
                onClick={() => copyToClipboard(card.account_number, 'account_number')}
              >
                {copiedKey === 'account_number' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}

          {card.barcode_value && (
            <div className="card-field-row">
              <div>
                <span className="field-label">Nilai Barcode / QR</span>
                <span className="field-value font-mono">{card.barcode_value}</span>
              </div>
              <button
                className="icon-button-subtle"
                onClick={() => copyToClipboard(card.barcode_value, 'barcode_value')}
              >
                {copiedKey === 'barcode_value' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}

          {card.nfc_uid && (
            <div className="card-field-row">
              <div>
                <span className="field-label">NFC UID</span>
                <span className="field-value font-mono">{card.nfc_uid}</span>
              </div>
              <button
                className="icon-button-subtle"
                onClick={() => copyToClipboard(card.nfc_uid, 'nfc_uid')}
              >
                {copiedKey === 'nfc_uid' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}

          {card.location && (
            <div className="card-field-row">
              <div>
                <span className="field-label">Lokasi / Gedung</span>
                <span className="field-value">{card.location}</span>
              </div>
            </div>
          )}

          {card.membership_tier && (
            <div className="card-field-row">
              <div>
                <span className="field-label">Tingkat / Tier Member</span>
                <span className="field-value">{card.membership_tier}</span>
              </div>
            </div>
          )}

          {card.faskes && (
            <div className="card-field-row">
              <div>
                <span className="field-label">Faskes / RS Rekanan</span>
                <span className="field-value">{card.faskes}</span>
              </div>
            </div>
          )}

          {card.voucher_value && (
            <div className="card-field-row">
              <div>
                <span className="field-label">Nilai / Nominal Voucher</span>
                <span className="field-value">{card.voucher_value}</span>
              </div>
            </div>
          )}

          {card.notes && (
            <div className="card-field-row card-notes-row">
              <span className="field-label">Catatan Tambahan</span>
              <p className="card-notes-text">{card.notes}</p>
            </div>
          )}
        </div>

        {/* Clean Capability */}
        {capability.id !== 'secure_only' && (
          <div className="card-tech-box compact">
            <div className="card-tech-header">
              <span className="field-label">Kemampuan Kartu</span>
              <span className={`my-card-capability-tag ${capability.badgeClass}`}>
                <CapIcon size={12} />
                {t(capability.labelKey)}
              </span>
            </div>
            <p className="card-tech-summary">{t(capability.descKey)}</p>
          </div>
        )}

        {/* Footer Actions: Edit & Delete */}
        <div className="card-detail-footer">
          <button
            type="button"
            className="secondary-button pill-button"
            onClick={() => {
              haptic('light')
              onEdit(card)
            }}
          >
            <Pencil size={15} />
            <span>Edit Kartu</span>
          </button>

          <button
            type="button"
            className="danger-button pill-button"
            onClick={() => {
              haptic('medium')
              setShowDeleteConfirm(true)
            }}
          >
            <Trash2 size={15} />
            <span>Hapus</span>
          </button>
        </div>

        {showDeleteConfirm && (
          <ConfirmToast
            message={`Hapus kartu "${card.name}" secara permanen dari brankas?`}
            onConfirm={() => {
              setShowDeleteConfirm(false)
              onDelete(card.id)
              onClose()
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </section>

      {/* NFC Reader Modal */}
      {isNfcModalOpen && (
        <CardNfcReaderModal
          targetCard={card}
          onClose={() => setIsNfcModalOpen(false)}
          onSaveUid={handleSaveNfcUid}
          lang={lang}
        />
      )}

      {/* Camera Barcode / QR Scanner Modal */}
      {isCameraModalOpen && (
        <CardCameraScannerModal
          onClose={() => setIsCameraModalOpen(false)}
          onScan={handleScanBarcodeResult}
          lang={lang}
        />
      )}

      {/* Tap Ready Capability Test Modal */}
      {isTapModalOpen && (
        <CardTapModal
          card={card}
          onClose={() => setIsTapModalOpen(false)}
          lang={lang}
        />
      )}
    </div>
  )
}
