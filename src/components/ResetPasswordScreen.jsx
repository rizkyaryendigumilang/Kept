import { useState } from 'react'
import { KeyRound, Lock, ShieldCheck } from './Icons'
import { supabase } from '../lib/supabase'
import { getTranslation } from '../lib/i18n'

/**
 * Shown after the user follows the password-recovery email link.
 *
 * This resets the Supabase account password only. The vault master password
 * is separate and cannot be recovered here.
 */
export default function ResetPasswordScreen({ onDone, lang = 'id' }) {
  const t = (k) => getTranslation(k, lang)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(event) {
    event.preventDefault()

    setError('')

    if (password.length < 8) {
      setError(lang === 'id' ? 'Gunakan minimal 8 karakter.' : 'Use at least 8 characters.')
      return
    }

    if (password !== confirm) {
      setError(lang === 'id' ? 'Konfirmasi password tidak cocok.' : 'Passwords do not match.')
      return
    }

    setBusy(true)

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({ password })

      if (updateError) throw updateError

      setDone(true)
    } catch (err) {
      setError(
        err.message || (lang === 'id' ? 'Gagal memperbarui password.' : 'Unable to update the password.')
      )
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <main className="unlock-screen">
        <div className="unlock-orb">
          <ShieldCheck size={28} />
        </div>

        <div className="unlock-copy">
          <div className="eyebrow">{t('reset_updated_eyebrow')}</div>
          <h1>{t('reset_updated_title')}</h1>
          <p>
            {t('reset_updated_desc')}
          </p>
        </div>

        <button
          className="primary-button"
          onClick={onDone}
        >
          {t('reset_continue_btn')}
        </button>
      </main>
    )
  }

  return (
    <main className="unlock-screen">
      <div className="unlock-orb">
        <KeyRound size={28} />
      </div>

      <div className="unlock-copy">
        <div className="eyebrow">{t('reset_eyebrow')}</div>
        <h1>{t('reset_title')}</h1>
        <p>
          {t('reset_desc')}
        </p>
      </div>

      <form onSubmit={submit} className="unlock-form">
        <label className="field">
          <span>{t('reset_new_password')}</span>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder={t('auth_password_ph')}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="field">
          <span>{t('reset_confirm_password')}</span>
          <input
            type="password"
            value={confirm}
            onChange={(event) =>
              setConfirm(event.target.value)
            }
            placeholder={lang === 'id' ? 'Ulangi password baru' : 'Repeat password'}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <button
          className="primary-button"
          disabled={busy}
        >
          {busy ? t('reset_saving_btn') : t('reset_save_btn')}
        </button>
      </form>

      {error && (
        <div className="feedback error">{error}</div>
      )}

      <div className="unlock-note">
        <Lock size={14} /> {lang === 'id' ? 'Security PIN vault Anda tidak pernah di-reset melalui email.' : 'Your vault master password is never reset by email.'}
      </div>
    </main>
  )
}
