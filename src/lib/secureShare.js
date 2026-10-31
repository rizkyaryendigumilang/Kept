import { supabase } from './supabase'
import {
  bytesToBase64,
  base64ToBytes,
  generateSalt,
  generateId
} from './crypto'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/**
 * Import a 32-byte raw key into Web Crypto AES-GCM Key
 */
async function importAesKey(rawBytes) {
  return crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Derive a 256-bit AES key from PIN/password via PBKDF2
 */
async function derivePinKey(pin, saltBase64) {
  const salt = base64ToBytes(saltBase64)
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a string or JSON payload with AES-GCM
 */
async function encryptWithKey(payloadObject, aesCryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = textEncoder.encode(JSON.stringify(payloadObject))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesCryptoKey,
    plaintext
  )
  return {
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(cipher))
  }
}

/**
 * Decrypt a ciphertext envelope with AES-GCM
 */
async function decryptWithKey(envelope, aesCryptoKey) {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
    aesCryptoKey,
    base64ToBytes(envelope.ct)
  )
  return JSON.parse(textDecoder.decode(plaintext))
}

/**
 * Creates a zero-knowledge self-destructing secret share.
 * Returns: { shareUrl, shareId, shareKeyHex, expiresAt, maxViews, isCloudBurn }
 */
export async function createSecureShare({
  title = '',
  content = '',
  pin = '',
  expiryHours = 24,
  maxViews = 1,
  senderId = null
}) {
  if (!content) {
    throw new Error('Konten rahasia tidak boleh kosong.')
  }

  // 1. Generate ephemeral 256-bit encryption key (kept exclusively on client / in URL fragment)
  const rawShareKey = crypto.getRandomValues(new Uint8Array(32))
  const shareKeyHex = bytesToHex(rawShareKey)
  const urlAesKey = await importAesKey(rawShareKey)

  // 2. Prepare inner payload
  const innerPayload = {
    title: title || 'Pesan Rahasia',
    content,
    created_at: new Date().toISOString()
  }

  let finalEnvelope = null
  let pinSalt = null
  const hasPin = Boolean(pin && pin.trim().length > 0)

  if (hasPin) {
    pinSalt = generateSalt()
    const pinCryptoKey = await derivePinKey(pin.trim(), pinSalt)
    // Layer 1: Encrypt with PIN Key
    const layer1 = await encryptWithKey(innerPayload, pinCryptoKey)
    // Layer 2: Encrypt result with ephemeral URL Key
    finalEnvelope = await encryptWithKey(layer1, urlAesKey)
  } else {
    // Encrypt directly with URL Key
    finalEnvelope = await encryptWithKey(innerPayload, urlAesKey)
  }

  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
  const secretId = generateId()

  let isCloudBurn = false

  // 3. Try to save to Supabase public.shared_secrets
  try {
    const { error } = await supabase.from('shared_secrets').insert({
      id: secretId,
      sender_id: senderId || null,
      // Title is intentionally NOT stored in plaintext (M-10): the subject of
      // a secret ("BCA - rekening utama") is itself sensitive and belongs only
      // inside the encrypted payload.
      title: null,
      ciphertext: finalEnvelope.ct,
      iv: finalEnvelope.iv,
      salt: pinSalt,
      has_pin: hasPin,
      max_views: maxViews,
      expires_at: expiresAt
    })

    if (!error) {
      isCloudBurn = true
    } else {
      console.warn('Supabase shared_secrets error:', error.message)
    }
  } catch (err) {
    console.warn('Database share save error:', err)
  }

  // 4. Construct share URL
  const origin = window.location.origin + window.location.pathname
  let shareUrl = ''

  if (isCloudBurn) {
    // Format: https://domain/#/share/{secretId}:{shareKeyHex}
    shareUrl = `${origin}#/share/${secretId}:${shareKeyHex}`
  } else {
    // Standalone client-side encrypted fallback (no server burn)
    // Payload encoded in hash so server never touches it
    const selfContained = {
      id: secretId,
      // No plaintext title here either (M-10) — it lives in the ciphertext.
      ct: finalEnvelope.ct,
      iv: finalEnvelope.iv,
      s: pinSalt,
      p: hasPin,
      exp: expiresAt
    }
    const b64 = bytesToBase64(textEncoder.encode(JSON.stringify(selfContained)))
    shareUrl = `${origin}#/share-direct/${encodeURIComponent(b64)}:${shareKeyHex}`
  }

  return {
    shareUrl,
    shareId: secretId,
    shareKeyHex,
    expiresAt,
    maxViews,
    isCloudBurn,
    hasPin
  }
}

/**
 * Fetches and decrypts a shared secret (burns on read if cloud-backed).
 */
export async function fetchAndDecryptShare({ shareId, shareKeyHex, pin = '', directPayload = null, challenge = null }) {
  if (!shareKeyHex) {
    throw new Error('Kunci enkripsi tidak ditemukan pada tautan ini.')
  }

  // PIN unlock path: the outer layer was already fetched and decrypted on the
  // first (burning) read. Decrypt it locally from the cached challenge so a
  // wrong PIN does not consume the single allowed view.
  if (challenge && challenge.outer && pin) {
    if (challenge.expiresAt && new Date() > new Date(challenge.expiresAt)) {
      throw new Error('Tautan rahasia ini telah kedaluwarsa.')
    }

    try {
      const pinCryptoKey = await derivePinKey(pin.trim(), challenge.salt)
      const decryptedInner = await decryptWithKey(challenge.outer, pinCryptoKey)
      return {
        requiresPin: false,
        title: decryptedInner.title || challenge.title,
        content: decryptedInner.content,
        createdAt: decryptedInner.created_at,
        expiresAt: challenge.expiresAt,
        isBurned: challenge.isBurned,
        viewsRemaining: challenge.viewsRemaining
      }
    } catch {
      throw new Error('PIN atau kata sandi pengaman salah. Silakan coba lagi.')
    }
  }

  const rawShareKey = hexToBytes(shareKeyHex)
  const urlAesKey = await importAesKey(rawShareKey)

  let secretRow = null
  let isBurned = false
  let viewsRemaining = 0

  if (directPayload) {
    // Standalone direct fragment mode
    secretRow = {
      title: directPayload.t,
      ciphertext: directPayload.ct,
      iv: directPayload.iv,
      salt: directPayload.s,
      has_pin: directPayload.p,
      expires_at: directPayload.exp
    }
    if (new Date() > new Date(secretRow.expires_at)) {
      throw new Error('Tautan rahasia ini telah kedaluwarsa.')
    }
  } else {
    // Call Supabase RPC read_and_burn_secret
    const { data, error } = await supabase.rpc('read_and_burn_secret', {
      p_secret_id: shareId
    })

    if (error) {
      throw new Error(`Gagal membaca rahasia: ${error.message}`)
    }

    if (!data || data.status === 'not_found' || data.status === 'burned') {
      throw new Error('Rahasia ini telah dibuka dan dimusnahkan secara permanen, atau tautan tidak valid.')
    }

    if (data.status === 'expired') {
      throw new Error('Rahasia ini telah melewati batas waktu kedaluwarsa dan telah dihapus.')
    }

    secretRow = data
    isBurned = data.views_remaining === 0
    viewsRemaining = data.views_remaining || 0
  }

  // 1. Decrypt outer layer using URL key
  let decryptedOuter = null
  try {
    decryptedOuter = await decryptWithKey(
      { iv: secretRow.iv, ct: secretRow.ciphertext },
      urlAesKey
    )
  } catch (err) {
    throw new Error('Gagal mendekripsi: Kunci pada tautan salah atau data rusak.')
  }

  // 2. If PIN protected, decrypt inner layer using PIN key
  if (secretRow.has_pin) {
    if (!pin) {
      return {
        requiresPin: true,
        title: secretRow.title,
        expiresAt: secretRow.expires_at,
        isBurned,
        viewsRemaining,
        // Hand the already-decrypted outer layer back to the caller. The row
        // may now be gone (burn-on-read), so this is the only chance to keep
        // the PIN challenge alive without a second RPC.
        challenge: {
          outer: decryptedOuter,
          salt: secretRow.salt,
          title: secretRow.title,
          expiresAt: secretRow.expires_at,
          isBurned,
          viewsRemaining
        }
      }
    }

    try {
      const pinCryptoKey = await derivePinKey(pin.trim(), secretRow.salt)
      const decryptedInner = await decryptWithKey(decryptedOuter, pinCryptoKey)
      return {
        requiresPin: false,
        title: decryptedInner.title || secretRow.title,
        content: decryptedInner.content,
        createdAt: decryptedInner.created_at,
        expiresAt: secretRow.expires_at,
        isBurned,
        viewsRemaining
      }
    } catch {
      throw new Error('PIN atau kata sandi pengaman salah. Silakan coba lagi.')
    }
  }

  // No PIN required, decryptedOuter is the secret!
  return {
    requiresPin: false,
    title: decryptedOuter.title || secretRow.title,
    content: decryptedOuter.content,
    createdAt: decryptedOuter.created_at,
    expiresAt: secretRow.expires_at,
    isBurned,
    viewsRemaining
  }
}

/**
 * Parse window.location.hash for share parameters
 */
export function parseShareHash(hashString = window.location.hash) {
  if (!hashString) return null

  // Format 1: #/share/{shareId}:{shareKeyHex}
  const cloudMatch = hashString.match(/#\/?share\/([a-zA-Z0-9_-]+):([a-fA-F0-9]{64})/)
  if (cloudMatch) {
    return {
      type: 'cloud',
      shareId: cloudMatch[1],
      shareKeyHex: cloudMatch[2]
    }
  }

  // Format 2: #/share-direct/{b64Encoded}:{shareKeyHex}
  const directMatch = hashString.match(/#\/?share-direct\/([^:]+):([a-fA-F0-9]{64})/)
  if (directMatch) {
    try {
      const rawJson = textDecoder.decode(base64ToBytes(decodeURIComponent(directMatch[1])))
      const parsed = JSON.parse(rawJson)
      return {
        type: 'direct',
        directPayload: parsed,
        shareKeyHex: directMatch[2]
      }
    } catch {
      return null
    }
  }

  return null
}
