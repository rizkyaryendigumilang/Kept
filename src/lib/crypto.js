import { argon2id } from '@noble/hashes/argon2.js'
import { utf8ToBytes, randomBytes, bytesToHex } from '@noble/hashes/utils.js'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

// Browser-friendly starting point. Tune after profiling target mobile devices.
const ARGON_OPTIONS = {
  t: 3,
  m: 64 * 1024,
  p: 1,
  dkLen: 32,
  maxmem: 128 * 1024 * 1024
}

export function bytesToBase64(bytes) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToBytes(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function generateSalt() {
  return bytesToBase64(randomBytes(16))
}

export function generateId() {
  return crypto.randomUUID()
}

export function deriveVaultKey(masterPassword, saltBase64) {
  const salt = base64ToBytes(saltBase64)
  return argon2id(utf8ToBytes(masterPassword), salt, ARGON_OPTIONS)
}

/**
 * Zeroes out a raw cryptographic key in memory to prevent memory dump remnants.
 *
 * @param {Uint8Array|null} rawKey
 */
export function zeroKey(rawKey) {
  if (rawKey && rawKey instanceof Uint8Array) {
    try {
      rawKey.fill(0)
    } catch {
      // ignore
    }
  }
}

const aesKeyCache = new WeakMap()

async function importAesKey(rawKey) {
  if (rawKey && typeof rawKey === 'object') {
    const cached = aesKeyCache.get(rawKey)
    if (cached) return cached
    const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
    aesKeyCache.set(rawKey, key)
    return key
  }
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptJson(value, rawKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await importAesKey(rawKey)
  const plaintext = textEncoder.encode(JSON.stringify(value))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return {
    v: 1,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(cipher))
  }
}

export async function decryptJson(envelope, rawKey) {
  const key = await importAesKey(rawKey)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
    key,
    base64ToBytes(envelope.ct)
  )
  return JSON.parse(textDecoder.decode(plaintext))
}

export function stableJson(value) {
  return JSON.stringify(value, Object.keys(value).sort())
}

export function keyFingerprint(rawKey) {
  return bytesToHex(rawKey.slice(0, 6))
}

const RECOVERY_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export function generateRecoveryKey() {
  const random = crypto.getRandomValues(new Uint8Array(20))
  let str = ''
  for (let i = 0; i < 20; i++) {
    str += RECOVERY_CHARS[random[i] % RECOVERY_CHARS.length]
  }
  return `KEPT-${str.slice(0, 4)}-${str.slice(4, 8)}-${str.slice(8, 12)}-${str.slice(12, 16)}-${str.slice(16, 20)}`
}

export function normalizeRecoveryKey(key) {
  return String(key || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

async function deriveRecoveryWrappingKey(recoveryKey, saltBytes) {
  const normalized = normalizeRecoveryKey(recoveryKey)
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(normalized),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function wrapMasterKeyWithRecovery(rawMasterKey, recoveryKey) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrappingKey = await deriveRecoveryWrappingKey(recoveryKey, salt)
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    rawMasterKey
  )
  return {
    v: 1,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(cipher))
  }
}

export async function unwrapMasterKeyWithRecovery(envelope, recoveryKey) {
  if (!envelope?.salt || !envelope?.iv || !envelope?.ct) {
    throw new Error('Invalid recovery envelope format.')
  }
  const salt = base64ToBytes(envelope.salt)
  const iv = base64ToBytes(envelope.iv)
  const wrappingKey = await deriveRecoveryWrappingKey(recoveryKey, salt)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    base64ToBytes(envelope.ct)
  )
  return new Uint8Array(plaintext)
}

export async function deriveCustomBackupKey(password, saltBytes) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptCustomBackup(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveCustomBackupKey(password, salt)
  const encoded = textEncoder.encode(JSON.stringify(data))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  return {
    app: 'kept',
    format: 'KEPT_ENCRYPTED_BACKUP',
    version: 1,
    exported_at: new Date().toISOString(),
    item_count: Array.isArray(data) ? data.length : (data?.items?.length || 1),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipher))
  }
}

export async function decryptCustomBackup(envelope, password) {
  if (!envelope?.salt || !envelope?.iv || !envelope?.ciphertext) {
    throw new Error('Format file cadangan .kept tidak valid.')
  }
  const salt = base64ToBytes(envelope.salt)
  const iv = base64ToBytes(envelope.iv)
  const key = await deriveCustomBackupKey(password, salt)
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      base64ToBytes(envelope.ciphertext)
    )
    return JSON.parse(textDecoder.decode(plaintext))
  } catch {
    throw new Error('Kata sandi cadangan salah atau file cadangan rusak.')
  }
}
