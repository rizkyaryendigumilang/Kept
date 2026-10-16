import { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, RefreshCw, Check, AlertTriangle } from './Icons'
import { checkPasswordBreach } from '../lib/pwned'
import { TRANSLATIONS } from '../lib/i18n'

export default function BreachCheckerBadge({ password, lang = 'id', autoCheck = false }) {
  const t = (k) => TRANSLATIONS[lang]?.[k] || TRANSLATIONS['id']?.[k] || k

  const [status, setStatus] = useState('idle') // 'idle' | 'checking' | 'clean' | 'breached' | 'offline' | 'error'
  const [count, setCount] = useState(0)

  useEffect(() => {
    // Reset status when password changes
    if (!password) {
      setStatus('idle')
      setCount(0)
      return
    }

    if (autoCheck) {
      performCheck()
    } else {
      setStatus('idle')
      setCount(0)
    }
  }, [password])

  async function performCheck() {
    if (!password || status === 'checking') return

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline')
      return
    }

    setStatus('checking')
    try {
      const res = await checkPasswordBreach(password)
      if (res.error === 'offline') {
        setStatus('offline')
      } else if (res.breached) {
        setStatus('breached')
        setCount(res.count)
      } else {
        setStatus('clean')
        setCount(0)
      }
    } catch {
      setStatus('error')
    }
  }

  if (!password) return null

  return (
    <div className="breach-checker-wrap">
      {status === 'idle' && (
        <button
          type="button"
          className="breach-btn-check"
          onClick={performCheck}
          title={lang === 'id' ? 'Periksa apakah kata sandi ini pernah bocor di internet (Zero-Knowledge k-Anonymity)' : 'Check if this password was breached online (Zero-Knowledge k-Anonymity)'}
        >
          <ShieldCheck size={13} />
          <span>{lang === 'id' ? 'Cek Kebocoran Data' : 'Check Data Breach'}</span>
        </button>
      )}

      {status === 'checking' && (
        <span className="breach-status-pill checking">
          <RefreshCw size={12} className="spin-slow" />
          <span>{lang === 'id' ? 'Memeriksa database pwned…' : 'Checking pwned database…'}</span>
        </span>
      )}

      {status === 'clean' && (
        <div className="breach-status-pill safe">
          <Check size={13} />
          <span>{lang === 'id' ? 'Aman (0 Kebocoran Data)' : 'Safe (0 Known Breaches)'}</span>
          <button
            type="button"
            className="breach-btn-recheck"
            onClick={performCheck}
            title={lang === 'id' ? 'Periksa ulang' : 'Recheck'}
          >
            <RefreshCw size={11} />
          </button>
        </div>
      )}

      {status === 'breached' && (
        <div className="breach-alert-card">
          <div className="breach-alert-header">
            <AlertTriangle size={15} className="text-danger" />
            <strong>{lang === 'id' ? 'Peringatan: Password Pernah Bocor!' : 'Warning: Password Compromised!'}</strong>
          </div>
          <p>
            {lang === 'id'
              ? `Kata sandi ini ditemukan sebanyak ${count.toLocaleString('id-ID')} kali dalam kebocoran data publik. Kami sangat menyarankan untuk menggantinya sekarang.`
              : `This password appeared ${count.toLocaleString('en-US')} times in public data breaches. We strongly recommend changing it now.`}
          </p>
          <div className="breach-alert-footer">
            <button
              type="button"
              className="breach-btn-recheck"
              onClick={performCheck}
            >
              <RefreshCw size={11} />
              <span>{lang === 'id' ? 'Pindai Ulang' : 'Rescan'}</span>
            </button>
          </div>
        </div>
      )}

      {status === 'offline' && (
        <span className="breach-status-pill neutral">
          <ShieldAlert size={12} />
          <span>{lang === 'id' ? 'Offline — pemeriksaan butuh internet' : 'Offline — requires connection'}</span>
        </span>
      )}

      {status === 'error' && (
        <span className="breach-status-pill neutral">
          <ShieldAlert size={12} />
          <span>{lang === 'id' ? 'Gagal memeriksa' : 'Check failed'}</span>
          <button
            type="button"
            className="breach-btn-recheck"
            onClick={performCheck}
          >
            <RefreshCw size={11} />
          </button>
        </span>
      )}
    </div>
  )
}
