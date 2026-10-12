import { useEffect, useRef, useState } from 'react'
import { X, Check, ZoomIn, ZoomOut, RefreshCw } from './Icons'

export default function AvatarCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete
}) {
  const [scale, setScale] = useState(1.2)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [processing, setProcessing] = useState(false)
  const [baseDimensions, setBaseDimensions] = useState({ width: 240, height: 240 })

  const imgRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setScale(1.2)
      setPosition({ x: 0, y: 0 })
      setProcessing(false)
    }
  }, [isOpen, imageSrc])

  if (!isOpen || !imageSrc) return null

  const handleImageLoad = (e) => {
    const { naturalWidth: nw, naturalHeight: nh } = e.currentTarget
    const viewportSize = 240
    if (nw && nh) {
      if (nw >= nh) {
        const h = viewportSize
        const w = (nw / nh) * viewportSize
        setBaseDimensions({ width: w, height: h })
      } else {
        const w = viewportSize
        const h = (nh / nw) * viewportSize
        setBaseDimensions({ width: w, height: h })
      }
    }
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
    }
  }

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return
    const touch = e.touches[0]
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const handleZoom = (delta) => {
    setScale((prev) => Math.max(1, Math.min(3.5, prev + delta)))
  }

  const handleReset = () => {
    setScale(1.2)
    setPosition({ x: 0, y: 0 })
  }

  const handleApplyCrop = () => {
    if (!imgRef.current) return
    setProcessing(true)

    const img = imgRef.current
    const canvas = document.createElement('canvas')
    const size = 400
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // High quality smoothing
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Circular clipping
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    // Dimensions of crop viewport (240px)
    const viewportSize = 240
    const ratio = size / viewportSize

    const drawWidth = baseDimensions.width * scale * ratio
    const drawHeight = baseDimensions.height * scale * ratio
    const drawX = size / 2 + position.x * ratio - drawWidth / 2
    const drawY = size / 2 + position.y * ratio - drawHeight / 2

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

    // Export to WebP with 85% compression
    canvas.toBlob(
      (blob) => {
        setProcessing(false)
        if (blob) {
          const webpFile = new File([blob], 'avatar.webp', { type: 'image/webp' })
          onCropComplete(webpFile)
        }
      },
      'image/webp',
      0.85
    )
  }

  return (
    <div className="crop-modal-backdrop" onMouseDown={onClose}>
      <div
        className="crop-modal-content"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Crop Foto Profil"
      >
        <div className="crop-modal-header">
          <div>
            <strong>Atur Foto Profil</strong>
            <span>Geser dan perbesar foto agar pas di dalam lingkaran.</span>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Circular Viewport Container */}
        <div
          ref={containerRef}
          className="crop-viewport-container"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Dark Overlay with Circular Cutout */}
          <div className="crop-circle-mask" />

          {/* Movable & Zoomable Image */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop target"
            className="crop-target-image"
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              width: `${baseDimensions.width}px`,
              height: `${baseDimensions.height}px`,
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
            }}
          />
        </div>

        {/* Zoom Controls */}
        <div className="crop-zoom-bar">
          <button
            type="button"
            className="circle-control"
            onClick={() => handleZoom(-0.2)}
            title="Perkecil"
            aria-label="Perkecil"
          >
            <ZoomOut size={16} />
          </button>

          <input
            type="range"
            min="1"
            max="3.5"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="crop-zoom-slider"
          />

          <button
            type="button"
            className="circle-control"
            onClick={() => handleZoom(0.2)}
            title="Perbesar"
            aria-label="Perbesar"
          >
            <ZoomIn size={16} />
          </button>

          <button
            type="button"
            className="circle-control ml-xs"
            onClick={handleReset}
            title="Reset Posisi"
            aria-label="Reset Posisi"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="crop-modal-footer">
          <button type="button" className="secondary-button pill-button" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="primary-button pill-button"
            onClick={handleApplyCrop}
            disabled={processing}
          >
            <Check size={15} />
            {processing ? 'Mengompres…' : 'Gunakan Foto (WebP)'}
          </button>
        </div>
      </div>
    </div>
  )
}
