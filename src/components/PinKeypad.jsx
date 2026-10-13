import { useEffect } from 'react'
import { Lock, Delete, Check, Clock } from './Icons'
import { haptic } from '../lib/haptics'

export default function PinKeypad({
  value = '',
  onChange,
  onSubmit,
  length = 6,
  title = 'Enter your PIN',
  subtitle = 'Enter your 6-digit security PIN',
  error = '',
  hint = '',
  disabled = false,
  lockoutSeconds = 0,
  shake = false,
  busy = false,
  autoSubmit = false,
  customBadgeIcon: CustomIcon,
  lang = 'id'
}) {
  function handlePressDigit(digit) {
    if (disabled || lockoutSeconds > 0 || busy) return
    if (value.length >= length) return

    haptic('light')
    const next = value + digit
    onChange(next)

    if (autoSubmit && next.length === length && onSubmit) {
      onSubmit(next)
    }
  }

  function handleBackspace() {
    if (disabled || lockoutSeconds > 0 || busy) return
    if (value.length > 0) {
      haptic('light')
      onChange(value.slice(0, -1))
    }
  }

  function handleCheckSubmit() {
    if (disabled || lockoutSeconds > 0 || busy) return
    if (value.length === length && onSubmit) {
      haptic('medium')
      onSubmit(value)
    }
  }

  // Support physical keyboard
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore if user is typing in an input element elsewhere
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (disabled || lockoutSeconds > 0 || busy) return

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        if (value.length < length) {
          const next = value + e.key
          onChange(next)
          if (autoSubmit && next.length === length && onSubmit) {
            onSubmit(next)
          }
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        if (value.length > 0) {
          onChange(value.slice(0, -1))
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (value.length === length && onSubmit) {
          onSubmit(value)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [value, disabled, lockoutSeconds, busy, length, onChange, onSubmit, autoSubmit])

  useEffect(() => {
    if (shake || error) {
      haptic('error')
    }
  }, [shake, error])

  return (
    <div className="pin-keypad-card">
      <div className="pin-lock-badge">
        {CustomIcon ? <CustomIcon size={20} strokeWidth={2.2} /> : <Lock size={20} strokeWidth={2.2} />}
      </div>

      <h2 className="pin-keypad-title">{title}</h2>
      <p className="pin-keypad-subtitle">{subtitle}</p>

      {/* 6 Indicator Dots */}
      <div className={`pin-dots-row ${shake ? 'pin-dots-shake' : ''}`}>
        {[...Array(length)].map((_, i) => (
          <span
            key={i}
            className={`pin-dot ${i < value.length ? 'filled' : 'empty'}`}
          />
        ))}
      </div>

      {/* Helper / Error / Countdown text */}
      <div className="pin-feedback-container">
        {lockoutSeconds > 0 ? (
          <div className="pin-feedback-msg lockout">
            <Clock size={13} />
            <span>
              {lang === 'id'
                ? `Tunggu 00:${lockoutSeconds.toString().padStart(2, '0')} sebelum mencoba lagi`
                : `Wait 00:${lockoutSeconds.toString().padStart(2, '0')} before trying again`}
            </span>
          </div>
        ) : error ? (
          <div className="pin-feedback-msg error">{error}</div>
        ) : hint ? (
          <div className="pin-feedback-msg hint">{hint}</div>
        ) : (
          <div className="pin-feedback-msg placeholder"></div>
        )}
      </div>

      {/* 4x3 Grid Keypad */}
      <div className="pin-keypad-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            type="button"
            className="pin-key-btn"
            disabled={disabled || lockoutSeconds > 0 || busy}
            onClick={() => handlePressDigit(String(digit))}
          >
            {digit}
          </button>
        ))}

        {/* Row 4 Col 1: Backspace */}
        <button
          type="button"
          className="pin-key-btn pin-action-key"
          disabled={disabled || lockoutSeconds > 0 || busy || value.length === 0}
          onClick={handleBackspace}
          aria-label={lang === 'id' ? 'Hapus angka terakhir' : 'Delete last digit'}
        >
          <Delete size={20} strokeWidth={1.8} />
        </button>

        {/* Row 4 Col 2: Digit 0 */}
        <button
          type="button"
          className="pin-key-btn"
          disabled={disabled || lockoutSeconds > 0 || busy}
          onClick={() => handlePressDigit('0')}
        >
          0
        </button>

        {/* Row 4 Col 3: Submit Checkmark */}
        <button
          type="button"
          className="pin-key-btn pin-submit-key"
          disabled={disabled || lockoutSeconds > 0 || busy || value.length !== length}
          onClick={handleCheckSubmit}
          aria-label={lang === 'id' ? 'Buka vault' : 'Unlock vault'}
        >
          <Check size={20} strokeWidth={2.8} />
        </button>
      </div>
    </div>
  )
}
