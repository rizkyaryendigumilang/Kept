import { useEffect } from 'react'
import { X } from './Icons'

export default function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        className={wide ? 'modal wide' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div>
            {eyebrow && (
              <div className="eyebrow">{eyebrow}</div>
            )}

            <h3 id="modal-title">{title}</h3>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={19} />
          </button>
        </div>

        {children}
      </section>
    </div>
  )
}
