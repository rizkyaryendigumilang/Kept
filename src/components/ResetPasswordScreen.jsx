import { useState } from 'react'
import { KeyRound, Lock, ShieldCheck } from './Icons'
import { supabase } from '../lib/supabase'

/**
 * Shown after the user follows the password-recovery email link.
 *
 * This resets the Supabase account password only. The vault master password
 * is separate and cannot be recovered here.
 */
export default function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(event) {
    event.preventDefault()

    setError('')

    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match.')
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
        err.message || 'Unable to update the password.'
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
          <div className="eyebrow">Password updated</div>
          <h1>Your account password is set.</h1>
          <p>
            Next, unlock your vault with your master password.
            Changing the account password does not change the
            vault master password.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={onDone}
        >
          Continue to my vault
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
        <div className="eyebrow">Reset password</div>
        <h1>Choose a new account password.</h1>
        <p>
          This changes the password you use to sign in. Your vault
          master password stays the same.
        </p>
      </div>

      <form onSubmit={submit} className="unlock-form">
        <label className="field">
          <span>New password</span>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <label className="field">
          <span>Confirm new password</span>
          <input
            type="password"
            value={confirm}
            onChange={(event) =>
              setConfirm(event.target.value)
            }
            placeholder="Repeat password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <button
          className="primary-button"
          disabled={busy}
        >
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>

      {error && (
        <div className="feedback error">{error}</div>
      )}

      <div className="unlock-note">
        <Lock size={14} /> Your vault master password is never
        reset by email.
      </div>
    </main>
  )
}
