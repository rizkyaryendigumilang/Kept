import { useEffect, useState } from 'react'
import { motion, useDragControls } from 'motion/react'
import { X } from './Icons'
import { haptic } from '../lib/haptics'

export default function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false
}) {
  const dragControls = useDragControls()
  const [isMobile, setIsMobile] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  })

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleDragEnd(_event, info) {
    if (info.offset.y > 90 || info.velocity.y > 450) {
      haptic('light')
      onClose?.()
    }
  }

  return (
    <motion.div
      className="sheet-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      role="presentation"
    >
      <motion.section
        className={wide ? 'modal wide' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
        drag={isMobile ? 'y' : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.55 }}
        onDragEnd={handleDragEnd}
        initial={isMobile ? { y: '100%' } : { scale: 0.96, opacity: 0 }}
        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
        exit={isMobile ? { y: '100%' } : { scale: 0.96, opacity: 0 }}
        transition={{
          type: 'spring',
          damping: isMobile ? 32 : 25,
          stiffness: 350
        }}
      >
        {/* Mobile Drag Handle */}
        {isMobile && (
          <div
            className="sheet-handle"
            onPointerDown={(e) => dragControls.start(e)}
            title="Tarik ke bawah untuk menutup"
          />
        )}

        <div
          className="sheet-header"
          onPointerDown={isMobile ? (e) => dragControls.start(e) : undefined}
          style={isMobile ? { cursor: 'grab', touchAction: 'none' } : undefined}
        >
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
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
      </motion.section>
    </motion.div>
  )
}
