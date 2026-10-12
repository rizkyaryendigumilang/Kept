import { useState } from 'react'
import { supabase } from '../lib/supabase'

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

export default function AuthScreen() {
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
            'Account created. Check your email to confirm your address, then sign in.'
          )
        }
      } else {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
          })

        if (resetError) throw resetError

        setMessage(
          'If that email has an account, a reset link is on its way. Check your inbox and spam folder.'
        )
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  async function signInWithGoogle() {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      const { error: oauthError } =
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin }
        })

      if (oauthError) throw oauthError
    } catch (err) {
      setError(err.message || 'Google sign-in failed.')
      setBusy(false)
    }
  }

  const heading =
    mode === 'sign-in'
      ? 'Welcome back.'
      : mode === 'sign-up'
        ? 'Build your private vault.'
        : 'Reset your password.'

  const blurb =
    mode === 'reset'
      ? 'Enter your account email and we will send you a secure reset link.'
      : ''

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/brand/kept-logo.png" alt="Kept" className="kept-auth-logo" />
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
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>
          </>
        )}

        <form onSubmit={submit} className="form-stack">
          {mode === 'sign-up' && (
            <label className="field">
              <span>Name</span>
              <input
                value={displayName}
                onChange={(e) =>
                  setDisplayName(e.target.value)
                }
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
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
              <span>Password</span>
              <input
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="At least 8 characters"
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
              ? 'Working…'
              : mode === 'sign-in'
                ? 'Continue'
                : mode === 'sign-up'
                  ? 'Create account'
                  : 'Send reset link'}
          </button>
        </form>

        {mode === 'sign-in' && (
          <div className="auth-switch">
            <button onClick={() => switchMode('reset')}>
              Forgot password?
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
              New here?{' '}
              <button onClick={() => switchMode('sign-up')}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => switchMode('sign-in')}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
