import React from 'react'
import { ShieldAlert, RefreshCw, Lock } from './Icons'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Kept Vault Uncaught Error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleLockAndReload = () => {
    try {
      sessionStorage.clear()
    } catch {
      // ignore
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'var(--bg, #0f1115)',
            color: 'var(--text-primary, #ffffff)',
            fontFamily: 'var(--font-sans, sans-serif)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              width: '100%',
              padding: '28px 24px',
              borderRadius: '16px',
              background: 'var(--surface, #1a1d24)',
              border: '1px solid var(--border-subtle, #2e333d)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)'
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <ShieldAlert size={28} />
            </div>

            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0' }}>
                Kendala Sistem Brankas
              </h2>
              <p
                style={{
                  fontSize: '12.5px',
                  color: 'var(--text-muted, #7e8590)',
                  lineHeight: '1.5',
                  margin: 0
                }}
              >
                Data terenkripsi Anda tetap aman. Terjadi kendala rendering pada antarmuka brankas.
              </p>
            </div>

            {this.state.error?.message && (
              <div
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border, #2e333d)',
                  fontSize: '11px',
                  color: '#ef4444',
                  textAlign: 'left',
                  wordBreak: 'break-word',
                  fontFamily: 'var(--font-mono, monospace)'
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
                marginTop: '8px'
              }}
            >
              <button
                type="button"
                className="primary-button pill-button"
                style={{
                  width: '100%',
                  padding: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
                onClick={this.handleLockAndReload}
              >
                <Lock size={15} />
                <span>Kunci & Buka Ulang Brankas</span>
              </button>

              <button
                type="button"
                className="secondary-button pill-button"
                style={{
                  width: '100%',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                <RefreshCw size={14} />
                <span>Coba Muat Ulang Tampilan</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
