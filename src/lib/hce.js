/**
 * Host Card Emulation (HCE) JavaScript Bridge for Kept
 * Connects the web UI to Android's native HostApduService via Capacitor.
 */

import { registerPlugin, Capacitor } from '@capacitor/core'

const KeptHce = registerPlugin('KeptHce')

// In-memory simulation fallback for Web / iOS
let mockEmulatingState = {
  isEmulating: false,
  activeCardName: '',
  activeCardUid: ''
}

/**
 * Checks whether HCE is supported and enabled on current hardware
 */
export async function checkHceSupport() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const res = await KeptHce.isHceSupported()
      return {
        isNative: true,
        supported: !!res.supported,
        enabled: !!res.enabled,
        hasNfcHardware: !!res.hasNfcHardware,
        hasHceFeature: !!res.hasHceFeature
      }
    } catch {
      return { isNative: true, supported: false, enabled: false }
    }
  }

  // Web or iOS platform (HCE direct arbitrary UID is locked by iOS)
  return {
    isNative: false,
    supported: false,
    enabled: false,
    reason: Capacitor.getPlatform() === 'ios'
      ? 'iOS membatasi emulasi kartu mentah (gunakan Apple Wallet Pass)'
      : 'Web browser tidak memiliki akses langsung ke chip NFC emulasi'
  }
}

/**
 * Activates HCE card emulation for a specific card in Kept
 */
export async function activateHceCard({ id, name, uid, payload = '' }) {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const res = await KeptHce.setActiveCard({
        id: String(id || ''),
        name: String(name || 'Kept Card'),
        uid: String(uid || '04A9723CEF51'),
        payload: String(payload || '')
      })
      return res
    } catch (err) {
      throw new Error(err.message || 'Gagal mengaktifkan emulasi HCE Android')
    }
  }

  // Fallback simulator for preview & testing
  mockEmulatingState = {
    isEmulating: true,
    activeCardName: name || 'Kept Card',
    activeCardUid: uid || '04A9723CEF51'
  }
  return { success: true, active: true, simulated: true, ...mockEmulatingState }
}

/**
 * Deactivates active card emulation
 */
export async function deactivateHceCard() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      const res = await KeptHce.clearActiveCard()
      return res
    } catch (err) {
      throw new Error(err.message || 'Gagal menonaktifkan HCE')
    }
  }

  mockEmulatingState = {
    isEmulating: false,
    activeCardName: '',
    activeCardUid: ''
  }
  return { success: true, active: false, simulated: true }
}

/**
 * Retrieves current emulation status
 */
export async function getHceStatus() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      return await KeptHce.getHceStatus()
    } catch {
      return { isEmulating: false }
    }
  }

  return mockEmulatingState
}
