import { useState } from 'react'
import {
  Trash2,
  RotateCcw,
  KeyRound,
  CreditCard,
  FileText,
  StickyNote,
  AlertTriangle
} from './Icons'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

export default function TrashManager({
  trashedItems = [],
  onRestoreItem,
  onPermanentDelete,
  onEmptyTrash,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  function getItemIcon(item) {
    if (item.item_type === 'bank_card') return <CreditCard size={16} />
    if (item.item_type === 'document') return <FileText size={16} />
    if (item.item_type === 'secure_note') return <StickyNote size={16} />
    return <KeyRound size={16} />
  }

  function formatDeletedDate(isoString) {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  return (
    <div className="trash-manager-container">
      <div className="trash-header-card subpage-card">
        <div className="subpage-card-heading">
          <div className="flex items-center justify-between gap-sm">
            <strong>{t('trash_title')}</strong>
            <span className="trash-count-badge">
              {trashedItems.length} {lang === 'id' ? 'Item' : 'Items'}
            </span>
          </div>
          <span>{t('trash_lead')}</span>
        </div>

        {trashedItems.length > 0 && (
          <div className="trash-top-actions">
            <button
              type="button"
              className="danger-button pill-button btn-xs"
              onClick={() => {
                haptic('medium')
                setConfirmEmpty(true)
              }}
            >
              <Trash2 size={13} />
              <span>{t('trash_empty_all')}</span>
            </button>
          </div>
        )}
      </div>

      {confirmEmpty && (
        <div className="trash-confirm-banner">
          <div className="trash-confirm-text">
            <AlertTriangle size={15} className="text-danger flex-shrink-0" />
            <span>{t('trash_empty_confirm')}</span>
          </div>
          <div className="trash-confirm-buttons">
            <button
              type="button"
              className="secondary-button pill-button btn-xs"
              onClick={() => setConfirmEmpty(false)}
            >
              {t('action_cancel')}
            </button>
            <button
              type="button"
              className="danger-button pill-button btn-xs"
              onClick={() => {
                haptic('error')
                setConfirmEmpty(false)
                onEmptyTrash()
              }}
            >
              {t('trash_empty_all')}
            </button>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="trash-confirm-banner">
          <div className="trash-confirm-text">
            <AlertTriangle size={15} className="text-danger flex-shrink-0" />
            <span>
              {lang === 'id'
                ? `Hapus permanen "${itemToDelete.name || 'Item'}"? Tindakan ini tidak dapat dibatalkan.`
                : `Permanently delete "${itemToDelete.name || 'Item'}"? This cannot be undone.`}
            </span>
          </div>
          <div className="trash-confirm-buttons">
            <button
              type="button"
              className="secondary-button pill-button btn-xs"
              onClick={() => setItemToDelete(null)}
            >
              {t('action_cancel')}
            </button>
            <button
              type="button"
              className="danger-button pill-button btn-xs"
              onClick={() => {
                haptic('medium')
                onPermanentDelete(itemToDelete.id)
                setItemToDelete(null)
              }}
            >
              {t('trash_delete_perm')}
            </button>
          </div>
        </div>
      )}

      {trashedItems.length === 0 ? (
        <div className="trash-empty-state">
          <div className="trash-empty-icon">
            <Trash2 size={28} />
          </div>
          <strong>{t('trash_empty')}</strong>
          <span>{t('trash_empty_desc')}</span>
        </div>
      ) : (
        <div className="trash-items-list">
          {trashedItems.map((item) => (
            <div key={item.id} className="trash-item-row">
              <div className="trash-item-left">
                <div className="trash-item-icon-box">
                  {getItemIcon(item)}
                </div>
                <div className="trash-item-details">
                  <strong className="trash-item-name">
                    {item.name || item.bank_name || (lang === 'id' ? 'Item Tanpa Nama' : 'Untitled Item')}
                  </strong>
                  <span className="trash-item-meta">
                    {item.categoryLabel || item.item_type} · {lang === 'id' ? 'Dihapus' : 'Deleted'}: {formatDeletedDate(item.deleted_at)}
                  </span>
                </div>
              </div>

              <div className="trash-item-actions">
                <button
                  type="button"
                  className="trash-restore-btn pill-button btn-xs"
                  onClick={() => {
                    haptic('success')
                    onRestoreItem(item.id)
                  }}
                  title={t('trash_restore')}
                >
                  <RotateCcw size={12} />
                  <span>{t('trash_restore')}</span>
                </button>
                <button
                  type="button"
                  className="trash-delete-btn icon-button-sm"
                  onClick={() => {
                    haptic('light')
                    setItemToDelete(item)
                  }}
                  title={t('trash_delete_perm')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
