import { useEffect, useState } from 'react'
import { ShieldCheck, Lock } from './Icons'

export default function PrivacyMask({ enabled = true, lang = 'id' }) {
  const [masked, setMasked] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setMasked(false)
      return undefined
    }

    let timeoutId = null

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setMasked(true)
      } else {
        // Smoothly unmask when coming back to the foreground
        timeoutId = setTimeout(() => {
          setMasked(false)
        }, 120)
      }
    }

    const handleBlur = () => {
      // Optional blur trigger for window/app switcher
      setMasked(true)
    }

    const handleFocus = () => {
      timeoutId = setTimeout(() => {
        setMasked(false)
      }, 120)
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }
  }, [enabled])

  if (!enabled || !masked) return null

  return (
    <div className="privacy-mask-backdrop" aria-hidden="true">
      <div className="privacy-mask-card">
        <div className="privacy-mask-icon-wrap">
          <ShieldCheck size={36} className="text-brand-accent" />
          <Lock size={16} className="privacy-mask-micro-lock" />
        </div>
        <div className="privacy-mask-text">
          <strong>{lang === 'id' ? 'Kept Vault Terproteksi' : 'Kept Vault Protected'}</strong>
          <span>
            {lang === 'id'
              ? 'Layar disamarkan demi privasi Anda'
              : 'Screen masked for your privacy'}
          </span>
        </div>
      </div>
    </div>
  )
}
