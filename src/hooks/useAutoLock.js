import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook to handle idle timer and auto-locking vault
 *
 * @param {Object} options
 * @param {Uint8Array|null} options.vaultKey - Current active master key in memory
 * @param {function} options.onLock - Callback to lock vault and clear key
 * @param {function} options.showToast - Optional toast display function
 */
export function useAutoLock({ vaultKey, onLock, showToast }) {
  const timerRef = useRef(null)
  const lastActiveRef = useRef(Date.now())

  const getTimeoutMs = useCallback(() => {
    try {
      const minutes = parseInt(localStorage.getItem('kept_autolock_minutes') || '15', 10)
      if (minutes <= 0) return null
      return minutes * 60 * 1000
    } catch {
      return 15 * 60 * 1000
    }
  }, [])

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now()
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!vaultKey) return

    const timeoutMs = getTimeoutMs()
    if (!timeoutMs) return

    timerRef.current = setTimeout(() => {
      if (onLock) onLock()
      if (showToast) {
        showToast('Vault otomatis terkunci karena tidak ada aktivitas.', 2500)
      }
    }, timeoutMs)
  }, [vaultKey, getTimeoutMs, onLock, showToast])

  useEffect(() => {
    if (!vaultKey) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    const handleActivity = () => resetTimer()

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }))
    resetTimer()

    // Handle tab visibility change & BFCache pageshow with wall-clock elapsed check
    // Prevents suspended mobile browsers from keeping vault unlocked past timeout
    const checkElapsedAndResume = () => {
      const timeoutMs = getTimeoutMs()
      if (timeoutMs) {
        const elapsed = Date.now() - lastActiveRef.current
        if (elapsed >= timeoutMs) {
          if (onLock) onLock()
          if (showToast) {
            showToast('Vault otomatis terkunci karena tidak ada aktivitas.', 2500)
          }
          return
        }
      }
      resetTimer()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkElapsedAndResume()
      }
    }

    const handlePageShow = () => {
      checkElapsedAndResume()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((ev) => window.removeEventListener(ev, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [vaultKey, getTimeoutMs, resetTimer, onLock, showToast])

  return { resetTimer }
}
