import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { getTranslation } from '../lib/i18n'
import { KEPT_LOGO } from '../lib/brand'

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  )
}

export default function AuthScreen({ lang = 'id' }) {
  const t = (k) => getTranslation(k, lang)
  const [mode, setMode] = useState('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function switchMode(next) {
    setMode(next)
    setError('')
    setMessage('')
  }

  async function submit(event) {
    event.preventDefault()

    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'sign-in') {
        const { error: authError } =
          await supabase.auth.signInWithPassword({
            email,
            password
          })

        if (authError) throw authError
      } else if (mode === 'sign-up') {
        const { data, error: authError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: displayName }
            }
          })

        if (authError) throw authError

        if (!data.session) {
          setMessage(
            lang === 'id'
              ? 'Akun berhasil dibuat. Cek email Anda untuk konfirmasi, lalu masuk.'
              : 'Account created. Check your email to confirm your address, then sign in.'
          )
        }
      } else {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
          })

        if (resetError) throw resetError

        setMessage(
          lang === 'id'
            ? 'Jika email tersebut terdaftar, tautan reset telah dikirim. Periksa kotak masuk dan folder spam Anda.'
            : 'If that email has an account, a reset link is on its way. Check your inbox and spam folder.'
        )
      }
    } catch (err) {
      setError(err.message || (lang === 'id' ? 'Autentikasi gagal.' : 'Authentication failed.'))
    } finally {
      setBusy(false)
    }
  }

  async function signInWithGoogle() {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      const { data, error: oauthError } =
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            skipBrowserRedirect: true
          }
        })

      if (oauthError) throw oauthError

      if (data?.url) {
        // Pre-check if provider is enabled before doing full-page navigation
        try {
          const res = await fetch(data.url)
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            if (errData.msg?.includes('not enabled') || errData.error_code === 'validation_failed') {
              throw new Error(
                lang === 'id'
                  ? 'Login Google belum diaktifkan di Supabase Dashboard (Authentication > Providers > Google). Anda dapat masuk menggunakan Email & Password di atas.'
                  : 'Google Sign-In is not enabled in your Supabase Dashboard (Authentication > Providers > Google). Please use Email & Password above.'
              )
            }
          }
        } catch (fetchErr) {
          if (fetchErr.message?.includes('Google belum diaktifkan') || fetchErr.message?.includes('not enabled in your Supabase')) {
            throw fetchErr
          }
          // Normal CORS redirect exception when provider is active
        }

        window.location.href = data.url
      }
    } catch (err) {
      setError(err.message || (lang === 'id' ? 'Gagal masuk dengan Google.' : 'Google sign-in failed.'))
      setBusy(false)
    }
  }

  const heading =
    mode === 'sign-in'
      ? t('auth_signin_title')
      : mode === 'sign-up'
        ? t('auth_signup_title')
        : t('auth_reset_title')

  const blurb =
    mode === 'reset'
      ? t('auth_reset_blurb')
      : ''

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={KEPT_LOGO} alt="Kept" className="kept-auth-logo" />
        </div>

        <div className="auth-copy">
          <h1>{heading}</h1>
          {blurb && <p>{blurb}</p>}
        </div>

        {mode !== 'reset' && (
          <>
            <button
              type="button"
              className="oauth-button"
              onClick={signInWithGoogle}
              disabled={busy}
            >
              <GoogleMark />
              {t('auth_google_btn')}
            </button>

            <div className="auth-divider">
              <span>{t('auth_or')}</span>
            </div>
          </>
        )}

        <form onSubmit={submit} className="form-stack">
          {mode === 'sign-up' && (
            <label className="field">
              <span>{t('auth_name')}</span>
              <input
                value={displayName}
                onChange={(e) =>
                  setDisplayName(e.target.value)
                }
                placeholder={t('auth_name_ph')}
                autoComplete="name"
              />
            </label>
          )}

          <label className="field">
            <span>{t('auth_email')}</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          {mode !== 'reset' && (
            <label className="field">
              <span>{t('auth_password')}</span>
              <input
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder={t('auth_password_ph')}
                type="password"
                autoComplete={
                  mode === 'sign-in'
                    ? 'current-password'
                    : 'new-password'
                }
                minLength={8}
                required
              />
            </label>
          )}

          <button
            className="primary-button"
            disabled={busy}
          >
            {busy
              ? t('auth_working')
              : mode === 'sign-in'
                ? t('auth_btn_signin')
                : mode === 'sign-up'
                  ? t('auth_btn_signup')
                  : t('auth_btn_reset')}
          </button>
        </form>

        {mode === 'sign-in' && (
          <div className="auth-switch">
            <button onClick={() => switchMode('reset')}>
              {t('auth_forgot_password')}
            </button>
          </div>
        )}

        {message && (
          <div className="feedback success">{message}</div>
        )}

        {error && (
          <div className="feedback error">{error}</div>
        )}

        <div className="auth-switch">
          {mode === 'sign-in' ? (
            <>
              {t('auth_new_here')}{' '}
              <button onClick={() => switchMode('sign-up')}>
                {t('auth_create_account')}
              </button>
            </>
          ) : (
            <>
              {t('auth_have_account')}{' '}
              <button onClick={() => switchMode('sign-in')}>
                {t('auth_signin_link')}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
