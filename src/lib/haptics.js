/**
 * Haptic feedback utility for mobile touch devices.
 * Uses navigator.vibrate with safe fallbacks and graceful degradation.
 */
export function haptic(type = 'light') {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return
  if (!('vibrate' in navigator)) return

  try {
    switch (type) {
      case 'light':
        // Soft click for keypad numbers, tabs, toggles
        navigator.vibrate(10)
        break
      case 'medium':
        // Card swipe, open modal, copy item
        navigator.vibrate(22)
        break
      case 'heavy':
        // Delete, lock vault
        navigator.vibrate(40)
        break
      case 'success':
        // Action succeeded, vault unlocked, item saved
        navigator.vibrate([15, 45, 18])
        break
      case 'warning':
      case 'error':
        // Invalid pin, delete confirmation, expired item alert
        navigator.vibrate([35, 60, 35])
        break
      default:
        navigator.vibrate(12)
    }
  } catch {
    // Graceful ignore if blocked by browser policy
  }
}
