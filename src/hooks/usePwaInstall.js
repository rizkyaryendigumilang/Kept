import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook to handle PWA installation prompt
 *
 * @param {Object} options
 * @param {string} options.lang - Current language ('id' | 'en')
 * @param {function} options.showToast - Toast callback
 */
export function usePwaInstall({ lang = 'id', showToast }) {
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
      if (showToast) {
        showToast(
          lang === 'id'
            ? 'Kept berhasil dipasang ke Layar Utama!'
            : 'Kept successfully installed to Home Screen!'
        )
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [lang, showToast])

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted' && showToast) {
      showToast(lang === 'id' ? 'Memasang Kept...' : 'Installing Kept...')
    }
    setInstallPrompt(null)
  }, [installPrompt, lang, showToast])

  return {
    installPrompt,
    promptInstall
  }
}
