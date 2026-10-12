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

function bytesToBase64(bytes) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToBytes(value) {
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

async function importAesKey(rawKey) {
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
