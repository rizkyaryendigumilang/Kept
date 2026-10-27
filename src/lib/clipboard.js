import { haptic } from './haptics'

let activeClearTimer = null

/**
 * Copies sensitive text (passwords, card numbers, recovery keys) to clipboard,
 * triggers tactile haptic feedback, displays an informative toast, and automatically
 * schedules a clipboard wipe after `timeoutSec` (default 45s).
 *
 * @param {string} text - The sensitive string to copy
 * @param {object} [options]
 * @param {number} [options.timeoutSec=45] - Seconds before wiping clipboard
 * @param {function} [options.onNotify] - Toast callback (msg) => void
 * @param {string} [options.label='Password'] - Label for toast display
 * @param {string} [options.lang='id'] - Language code ('id' | 'en')
 * @returns {Promise<boolean>}
 */
export async function copyToClipboardSecure(text, options = {}) {
  const {
    timeoutSec = 45,
    onNotify,
    label = 'Password',
    lang = 'id'
  } = options

  if (!text) return false

  try {
    await navigator.clipboard.writeText(text)
    haptic('success')

    const msg = lang === 'id'
      ? `${label} disalin • Otomatis dihapus dalam ${timeoutSec} dtk`
      : `${label} copied • Auto-clears in ${timeoutSec}s`

    if (onNotify) {
      onNotify(msg, 3000)
    }

    if (activeClearTimer) {
      clearTimeout(activeClearTimer)
    }

    activeClearTimer = setTimeout(async () => {
      try {
        let shouldClear = true
        if (navigator.clipboard?.readText) {
          const currentText = await navigator.clipboard.readText().catch(() => null)
          if (currentText !== null && currentText !== text) {
            shouldClear = false
          }
        }

        if (shouldClear) {
          await navigator.clipboard.writeText('')
          if (onNotify) {
            onNotify(
              lang === 'id'
                ? 'Papan klip telah dibersihkan demi keamanan'
                : 'Clipboard cleared for security',
              2500
            )
          }
        }
      } catch {
        // Fallback blind clear
        try {
          await navigator.clipboard.writeText('')
        } catch {
          // Ignore if permission blocked in background
        }
      }
    }, timeoutSec * 1000)

    return true
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    return false
  }
}
