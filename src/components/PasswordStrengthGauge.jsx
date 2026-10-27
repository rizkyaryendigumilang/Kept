import { useMemo } from 'react'
import { ShieldCheck, ShieldAlert, Sparkles, Check, X } from './Icons'

/**
 * Evaluates password strength and criteria compliance.
 */
export function evaluatePassword(password = '') {
  if (!password) {
    return {
      score: 0,
      label: '',
      color: 'var(--border)',
      rules: [
        { key: 'length', text: 'Min. 12 karakter', met: false },
        { key: 'case', text: 'Huruf besar & kecil', met: false },
        { key: 'num', text: 'Mengandung angka', met: false },
        { key: 'sym', text: 'Simbol khusus (@#$%)', met: false }
      ]
    }
  }

  const rules = [
    { key: 'length', text: 'Min. 12 karakter', met: password.length >= 12 },
    { key: 'case', text: 'Huruf besar & kecil', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { key: 'num', text: 'Mengandung angka', met: /\d/.test(password) },
    { key: 'sym', text: 'Simbol khusus (@#$%)', met: /[^A-Za-z0-9]/.test(password) }
  ]

  const metCount = rules.filter((r) => r.met).length
  // Score 1 to 4
  let score = 1
  if (metCount === 4) score = 4
  else if (metCount === 3) score = 3
  else if (metCount >= 1 && password.length >= 8) score = 2
  else score = 1

  const configs = {
    1: { label: 'Sangat Lemah', color: '#ef4444', badgeBg: 'rgba(239, 68, 68, 0.15)' },
    2: { label: 'Cukup', color: '#f59e0b', badgeBg: 'rgba(245, 158, 11, 0.15)' },
    3: { label: 'Kuat', color: '#22c55e', badgeBg: 'rgba(34, 197, 94, 0.15)' },
    4: { label: 'Sangat Tangguh', color: '#06b6d4', badgeBg: 'rgba(6, 182, 212, 0.18)' }
  }

  return {
    score,
    label: configs[score].label,
    color: configs[score].color,
    badgeBg: configs[score].badgeBg,
    rules
  }
}

export default function PasswordStrengthGauge({ password = '', lang = 'id' }) {
  const info = useMemo(() => evaluatePassword(password), [password])

  if (!password) return null

  return (
    <div className="password-strength-gauge-box">
      {/* 4-Segmented Bar & Status Label */}
      <div className="strength-header-row">
        <div className="strength-bars-track">
          {[1, 2, 3, 4].map((step) => {
            const isActive = step <= info.score
            return (
              <div
                key={step}
                className="strength-bar-segment"
                style={{
                  background: isActive ? info.color : 'rgba(255, 255, 255, 0.08)',
                  boxShadow: isActive ? `0 0 8px ${info.color}40` : 'none'
                }}
              />
            )
          })}
        </div>

        <span
          className="strength-label-badge"
          style={{
            color: info.color,
            background: info.badgeBg
          }}
        >
          {info.score >= 3 ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
          <span>{info.label}</span>
        </span>
      </div>

      {/* Dynamic Instant Criteria Checklist */}
      <div className="strength-rules-list">
        {info.rules.map((rule) => (
          <span
            key={rule.key}
            className={`strength-rule-pill ${rule.met ? 'met' : ''}`}
          >
            {rule.met ? <Check size={10} /> : <X size={10} />}
            <span>
              {lang === 'id'
                ? rule.text
                : rule.key === 'length'
                ? 'Min. 12 characters'
                : rule.key === 'case'
                ? 'Upper & lower case'
                : rule.key === 'num'
                ? 'Includes numbers'
                : 'Special symbols (@#$%)'}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
