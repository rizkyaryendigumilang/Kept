import { useEffect, useState } from 'react'

import {
  Laptop,
  Moon,
  Sun,
  Settings,
  LogOut,
  ShieldCheck,
  Upload,
  Download,
  Fingerprint
} from '../components/Icons'

import {
  enrollBiometric,
  hasBiometricEnrollment,
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  removeBiometricRecord
} from '../lib/biometric'

export default function SettingsPage({
  profile,
  user,
  vaultKey,
  onTheme,
  onCardStyle,
  onSaveProfile,
  onUploadAvatar,
  onSignOut,
  onImport,
  onExport
}) {
  const [name, setName] = useState(profile.display_name || '')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricEnrolled, setBiometricEnrolled] = useState(false)
  const [biometricBusy, setBiometricBusy] = useState(false)
  const [biometricError, setBiometricError] = useState('')

  useEffect(() => {
    setName(profile.display_name || '')
  }, [profile.display_name])

  useEffect(() => {
    setAvatarPreview(profile.avatar_url || '')
  }, [profile.avatar_url])

  useEffect(() => {
    let mounted = true

    if (!isBiometricSupported()) {
      setBiometricSupported(false)
      return undefined
    }

    isPlatformAuthenticatorAvailable().then((available) => {
      if (mounted) setBiometricSupported(available)
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setBiometricEnrolled(hasBiometricEnrollment(user?.id))
  }, [user?.id])

  async function enableBiometric() {
    setBiometricBusy(true)
    setBiometricError('')

    try {
      await enrollBiometric(
        user.id,
        { email: user.email, displayName: profile.display_name },
        vaultKey
      )

      setBiometricEnrolled(true)
    } catch (error) {
      setBiometricError(
        error.message || 'Unable to enable biometric unlock.'
      )
    } finally {
      setBiometricBusy(false)
    }
  }

  function disableBiometric() {
    removeBiometricRecord(user.id)
    setBiometricEnrolled(false)
    setBiometricError('')
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Please select a JPG, PNG, or WebP image.')
      event.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Avatar image must be smaller than 5 MB.')
      event.target.value = ''
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)

    let uploadedUrl = ''

    try {
      setUploadingAvatar(true)

      if (onUploadAvatar) {
        uploadedUrl = await onUploadAvatar(file)
      }
    } catch (error) {
      console.error('Avatar upload failed:', error)
      alert(error.message || 'Failed to upload avatar.')
      setAvatarPreview(profile.avatar_url || '')
    } finally {
      setUploadingAvatar(false)
      URL.revokeObjectURL(previewUrl)

      if (uploadedUrl) {
        setAvatarPreview(uploadedUrl)
      }

      event.target.value = ''
    }
  }

  const initials = (
    profile.display_name ||
    user.email ||
    'V'
  )
    .slice(0, 1)
    .toUpperCase()

  return (
    <div className="page-shell narrow-page">
      <section className="hero-row">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>Make Vault feel like yours.</h1>
          <p>Preferences stay minimal. Security stays strict.</p>
        </div>
      </section>

      <section className="settings-card">
        {/* Profile */}
        <div className="settings-section">
          <div className="settings-heading">
            <div>
              <strong>Profile</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <div className="profile-avatar-upload">
            <div className="profile-avatar-preview">
              {avatarPreview && avatarPreview.startsWith('blob:') ? (
                <img src={avatarPreview} alt="Profile preview" />
              ) : avatarPreview ? (
                <img src={avatarPreview} alt="Profile" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="profile-avatar-actions">
              <label className="secondary-button upload-avatar-button">
                <Upload size={16} />
                {uploadingAvatar ? 'Uploading...' : 'Upload photo'}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                  hidden
                />
              </label>

              <span className="field-hint">
                JPG, PNG, or WebP · Max 5 MB
              </span>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Display name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>
          </div>

          <button
            className="secondary-button"
            onClick={() =>
              onSaveProfile({
                display_name: name
              })
            }
          >
            Save profile
          </button>
        </div>

        {/* Appearance */}
        <div className="settings-section">
          <div className="settings-heading">
            <div>
              <strong>Appearance</strong>
              <span>Light, dark, or follow your device.</span>
            </div>
          </div>

          <div className="segmented">
            <button
              className={profile.theme === 'light' ? 'selected' : ''}
              onClick={() => onTheme('light')}
            >
              <Sun size={16} />
              Light
            </button>

            <button
              className={profile.theme === 'dark' ? 'selected' : ''}
              onClick={() => onTheme('dark')}
            >
              <Moon size={16} />
              Dark
            </button>

            <button
              className={profile.theme === 'system' ? 'selected' : ''}
              onClick={() => onTheme('system')}
            >
              <Laptop size={16} />
              System
            </button>
          </div>
        </div>

        {/* Bank card style */}
        <div className="settings-section">
          <div className="settings-heading">
            <div>
              <strong>Bank card style</strong>
              <span>
                Switch between a realistic card and an abstract digital card.
              </span>
            </div>
          </div>

          <div className="segmented">
            <button
              className={profile.card_style === 'realistic' ? 'selected' : ''}
              onClick={() => onCardStyle('realistic')}
            >
              Realistic
            </button>

            <button
              className={profile.card_style === 'abstract' ? 'selected' : ''}
              onClick={() => onCardStyle('abstract')}
            >
              Abstract
            </button>
          </div>
        </div>

        {/* Backup */}
        <div className="settings-section">
          <div className="settings-heading">
            <div>
              <strong>Backup</strong>
              <span>
                Export an encrypted JSON backup. CSV import for browser
                migrations is provided client-side.
              </span>
            </div>
          </div>

          <div className="button-row">
            <button className="secondary-button" onClick={onImport}>
              <Upload size={16} />
              Import
            </button>

            <button className="secondary-button" onClick={onExport}>
              <Download size={16} />
              Export encrypted backup
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="settings-section">
          <div className="settings-heading">
            <div>
              <strong>Security</strong>
              <span>
                <ShieldCheck size={15} />
                The database stores encrypted payloads only.
              </span>
            </div>
          </div>

          <div className="security-list">
            <div>
              <Fingerprint size={16} />
              <span>
                Master password is never stored in the app or database.
              </span>
            </div>

            <div>
              <Settings size={16} />
              <span>
                Every account gets its own vault key and its own rows.
                Nothing is shared between users.
              </span>
            </div>
          </div>
        </div>

        {/* Biometric unlock */}
        <div className="settings-section">
          <div className="settings-heading">
            <div>
              <strong>Biometric unlock</strong>
              <span>
                Unlock this vault on this device with Touch ID, Windows
                Hello, or Android biometrics instead of typing your
                master password.
              </span>
            </div>
          </div>

          {!biometricSupported ? (
            <div className="field-hint">
              This browser or device does not offer a built-in
              biometric authenticator. Use your master password
              instead.
            </div>
          ) : (
            <div className="biometric-panel">
              <div className="biometric-status">
                <span
                  className={
                    biometricEnrolled
                      ? 'status-dot on'
                      : 'status-dot'
                  }
                />
                <span>
                  {biometricEnrolled
                    ? 'Enabled on this device'
                    : 'Not set up on this device'}
                </span>
              </div>

              {biometricEnrolled ? (
                <button
                  className="secondary-button"
                  onClick={disableBiometric}
                  disabled={biometricBusy}
                >
                  Remove biometric unlock
                </button>
              ) : (
                <button
                  className="secondary-button"
                  onClick={enableBiometric}
                  disabled={biometricBusy || !vaultKey}
                >
                  <Fingerprint size={16} />
                  {biometricBusy
                    ? 'Waiting for biometrics…'
                    : 'Enable biometric unlock'}
                </button>
              )}

              <p className="field-hint">
                The vault key is encrypted with a secret that only
                this device's authenticator can produce. Enroll again
                on each new device.
              </p>

              {biometricError && (
                <div className="feedback error">
                  {biometricError}
                </div>
              )}
            </div>
          )}
        </div>

        <button className="danger-button" onClick={onSignOut}>
          <LogOut size={16} />
          Sign out
        </button>
      </section>
    </div>
  )
}