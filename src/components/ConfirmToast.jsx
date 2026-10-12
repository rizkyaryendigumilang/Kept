import { AlertTriangle, Trash2 } from './Icons'

export default function ConfirmToast({
  message = 'Apakah Anda yakin ingin menghapus item ini?',
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  icon: CustomIcon,
  tone = 'danger'
}) {
  const IconComponent = CustomIcon || (tone === 'danger' ? Trash2 : AlertTriangle)

  return (
    <div className={`confirm-toast-container tone-${tone}`} role="alertdialog" aria-modal="true">
      <div className="confirm-toast-pill">
        <div className="confirm-toast-icon">
          <IconComponent size={15} />
        </div>
        <div className="confirm-toast-message">
          {message}
        </div>
        <div className="confirm-toast-actions">
          <button
            type="button"
            className="confirm-toast-btn cancel-btn"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm-toast-btn delete-btn"
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
