import { useEffect, useState } from 'react'
import { Fingerprint, Lock, ShieldCheck } from './Icons'
import { deriveVaultKey } from '../lib/crypto'
import { verifyMasterKey } from '../lib/vault'
import {
  hasBiometricEnrollment,
  isBiometricSupported,
  unlockWithBiometric
} from '../lib/biometric'

export default function UnlockScreen({
  profile,
  user,
  onUnlocked
}) {
  const [masterPassword, setMasterPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [biometricBusy, setBiometricBusy] = useState(false)

  const userId = user?.id
  const biometricReady =
    isBiometricSupported() &&
    hasBiometricEnrollment(userId)

  useEffect(() => {
    setMasterPassword('')
    setError('')
  }, [profile?.id])

  async function unlock(event) {
    event.preventDefault()

    setBusy(true)
    setError('')

    try {
      const key = deriveVaultKey(
        masterPassword,
        profile.vault_salt
      )

      const valid = await verifyMasterKey(profile, key)

      if (!valid) {
        throw new Error('Master password is incorrect.')
      }

      onUnlocked(key)
    } catch (err) {
      setError(err.message || 'Unable to unlock vault.')
    } finally {
      setBusy(false)
    }
  }

  async function unlockWithDevice() {
    setBiometricBusy(true)
    setError('')

    try {
      const key = await unlockWithBiometric(userId)
      onUnlocked(key)
    } catch (err) {
      setError(err.message || 'Biometric unlock failed.')
    } finally {
      setBiometricBusy(false)
    }
  }

  return (
    <main className="unlock-screen">
      <div className="unlock-orb">
        <ShieldCheck size={28} />
      </div>

      <div className="unlock-copy">
        <div className="eyebrow">Secure vault</div>
        <h1>Welcome back, {profile.display_name || 'there'}.</h1>
        <p>
          Unlock your private space. Your master password never
          leaves this device.
        </p>
      </div>

      <form onSubmit={unlock} className="unlock-form">
        <label className="field focused-field">
          <span>Master Password</span>
          <input
            autoFocus
            value={masterPassword}
            onChange={(e) =>
              setMasterPassword(e.target.value)
            }
            type="password"
            placeholder="Enter master password"
            autoComplete="current-password"
            required
          />
        </label>

        <button className="primary-button" disabled={busy}>
          {busy ? 'Unlocking…' : 'Unlock Vault'}
        </button>
      </form>

      {biometricReady && (
        <button
          className="biometric-button"
          type="button"
          onClick={unlockWithDevice}
          disabled={biometricBusy}
        >
          <Fingerprint size={17} />
          {biometricBusy
            ? 'Waiting for biometrics…'
            : 'Unlock with device biometrics'}
        </button>
      )}

      {error && (
        <div className="feedback error">{error}</div>
      )}

      <div className="unlock-note">
        <Lock size={14} /> Zero plaintext vault secrets in the
        database.
      </div>
    </main>
  )
}
