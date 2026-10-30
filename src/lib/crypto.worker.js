import { argon2id } from '@noble/hashes/argon2.js'
import { utf8ToBytes } from '@noble/hashes/utils.js'

const ARGON_OPTIONS = {
  t: 3,
  m: 64 * 1024,
  p: 1,
  dkLen: 32,
  maxmem: 128 * 1024 * 1024
}

function base64ToBytes(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

self.onmessage = (e) => {
  const { id, type, masterPassword, saltBase64 } = e.data
  if (type === 'deriveVaultKey') {
    try {
      const salt = base64ToBytes(saltBase64)
      const key = argon2id(utf8ToBytes(masterPassword), salt, ARGON_OPTIONS)
      // Transfer the underlying ArrayBuffer with 0-copy overhead
      self.postMessage({ id, success: true, key }, [key.buffer])
    } catch (err) {
      self.postMessage({ id, success: false, error: err.message || String(err) })
    }
  }
}
