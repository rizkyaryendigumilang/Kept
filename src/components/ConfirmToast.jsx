import { useEffect } from 'react'
import { AlertTriangle, Trash2 } from './Icons'
import { haptic } from '../lib/haptics'

export default function ConfirmToast({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  icon: CustomIcon,
  tone = 'danger',
  lang = 'id'
}) {
  const displayMessage =
    message ||
    (lang === 'id'
      ? 'Apakah Anda yakin ingin menghapus item ini?'
      : 'Are you sure you want to delete this item?')
  const displayConfirm = confirmLabel || (lang === 'id' ? 'Hapus' : 'Delete')
  const displayCancel = cancelLabel || (lang === 'id' ? 'Batal' : 'Cancel')

  const IconComponent = CustomIcon || (tone === 'danger' ? Trash2 : AlertTriangle)

  useEffect(() => {
    haptic(tone === 'danger' ? 'warning' : 'medium')
  }, [tone])

  return (
    <div className={`confirm-toast-container tone-${tone}`} role="alertdialog" aria-modal="true">
      <div className="confirm-toast-pill">
        <div className="confirm-toast-icon">
          <IconComponent size={15} />
        </div>
        <div className="confirm-toast-message">
          {displayMessage}
        </div>
        <div className="confirm-toast-actions">
          <button
            type="button"
            className="confirm-toast-btn cancel-btn"
            onClick={() => {
              haptic('light')
              onCancel()
            }}
          >
            {displayCancel}
          </button>
          <button
            type="button"
            className="confirm-toast-btn delete-btn"
            onClick={() => {
              haptic('heavy')
              onConfirm()
            }}
            autoFocus
          >
            {displayConfirm}
          </button>
        </div>
      </div>
    </div>
  )
}
