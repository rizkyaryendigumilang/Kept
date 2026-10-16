import { useState } from 'react'
import { Smartphone, Check, Download } from './Icons'
import { haptic } from '../lib/haptics'

export default function PwaInstallCard({ t, lang = 'id', installPrompt, onPromptInstall }) {
  const [platformTab, setPlatformTab] = useState(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || ''
      if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
      if (/Android/.test(ua)) return 'android'
    }
    return 'ios'
  })

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true)

  return (
    <div className="subpage-card pwa-install-card">
      <div className="subpage-card-heading">
        <div className="flex items-center gap-xs">
          <Smartphone size={16} className="tone-blue-icon" />
          <strong>{t('pref_pwa_title')}</strong>
        </div>
        <span>{t('pref_pwa_desc')}</span>
      </div>

      {isStandalone ? (
        <div className="pwa-installed-badge">
          <Check size={15} />
          <span>{t('pref_pwa_installed')}</span>
        </div>
      ) : (
        <div className="pwa-guide-content">
          {installPrompt && (
            <div className="pwa-direct-action-card">
              <div className="pwa-direct-text">
                <strong>{t('pwa_direct_install')}</strong>
                <p>{t('pwa_direct_install_hint')}</p>
              </div>
              <button
                type="button"
                className="primary-button pill-button pwa-install-trigger-btn"
                onClick={() => {
                  haptic('success')
                  if (onPromptInstall) onPromptInstall()
                }}
              >
                <Download size={15} />
                <span>{lang === 'id' ? 'Pasang Sekarang' : 'Install Now'}</span>
              </button>
            </div>
          )}
          <div className="pwa-platform-tabs">
            <button
              type="button"
              className={platformTab === 'ios' ? 'active' : ''}
              onClick={() => {
                haptic('light')
                setPlatformTab('ios')
              }}
            >
              <span>🍎 iPhone / iPad</span>
            </button>
            <button
              type="button"
              className={platformTab === 'android' ? 'active' : ''}
              onClick={() => {
                haptic('light')
                setPlatformTab('android')
              }}
            >
              <span>🤖 Android</span>
            </button>
          </div>

          <div className="pwa-steps-list">
            {platformTab === 'ios' ? (
              <>
                <div className="pwa-step-item">
                  <span className="pwa-step-num">1</span>
                  <span>{t('pref_pwa_ios_step1')}</span>
                </div>
                <div className="pwa-step-item">
                  <span className="pwa-step-num">2</span>
                  <span>{t('pref_pwa_ios_step2')}</span>
                </div>
                <div className="pwa-step-item">
                  <span className="pwa-step-num">3</span>
                  <span>{t('pref_pwa_ios_step3')}</span>
                </div>
              </>
            ) : (
              <>
                <div className="pwa-step-item">
                  <span className="pwa-step-num">1</span>
                  <span>{t('pref_pwa_android_step1')}</span>
                </div>
                <div className="pwa-step-item">
                  <span className="pwa-step-num">2</span>
                  <span>{t('pref_pwa_android_step2')}</span>
                </div>
                <div className="pwa-step-item">
                  <span className="pwa-step-num">3</span>
                  <span>{t('pref_pwa_android_step3')}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
