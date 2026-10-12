// Device biometric unlock using WebAuthn + the PRF extension.
//
// How it works:
//  1. The user enables biometrics while the vault is unlocked, so the raw
//     vault key is in memory.
//  2. We create a platform credential (Touch ID / Windows Hello / Android
//     biometrics) that supports the PRF extension.
//  3. The authenticator derives a stable 32-byte secret (the PRF output) from
//     a random per-enrollment salt. That secret never leaves the device.
//  4. We encrypt the raw vault key with that PRF secret and store only the
//     ciphertext locally. The stored record is useless without the
//     authenticator, so the vault key is never written to disk in the clear.
//
// Consequence: biometric unlock is per device. A new device needs the master
// password once, then it can enroll its own biometrics.

const STORE_PREFIX = 'vault.biometric.'

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlToBytes(value) {
  const normalized = String(value)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const padding =
    normalized.length % 4 === 0
      ? ''
      : '='.repeat(4 - (normalized.length % 4))

  const binary = atob(normalized + padding)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

function importAesKey(raw) {
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

export function isBiometricSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator?.credentials?.create === 'function' &&
    typeof navigator?.credentials?.get === 'function'
  )
}

export async function isPlatformAuthenticatorAvailable() {
  if (!isBiometricSupported()) return false

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function getBiometricRecord(userId) {
  if (!userId) return null

  try {
    const raw = localStorage.getItem(
      STORE_PREFIX + userId
    )

    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function hasBiometricEnrollment(userId) {
  return Boolean(getBiometricRecord(userId))
}

export function removeBiometricRecord(userId) {
  if (!userId) return

  try {
    localStorage.removeItem(STORE_PREFIX + userId)
  } catch {
    /* storage unavailable */
  }
}

async function evaluatePrf(credentialId, prfSalt) {
  let assertion

  try {
    assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(
          new Uint8Array(32)
        ),
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: base64UrlToBytes(credentialId)
          }
        ],
        userVerification: 'required',
        timeout: 60000,
        extensions: {
          prf: { eval: { first: prfSalt } }
        }
      }
    })
  } catch (error) {
    if (error?.name === 'NotAllowedError') {
      throw new Error('Biometric verification was cancelled.')
    }

    throw error
  }

  if (!assertion) {
    throw new Error('Biometric verification was cancelled.')
  }

  const results = assertion.getClientExtensionResults?.()
  const first = results?.prf?.results?.first

  if (!first) {
    throw new Error(
      'This device cannot derive a biometric key. Use your master password instead.'
    )
  }

  return new Uint8Array(first)
}

export async function enrollBiometric(
  userId,
  { email, displayName } = {},
  vaultKey
) {
  if (!isBiometricSupported()) {
    throw new Error(
      'This browser does not support biometric unlock.'
    )
  }

  if (!vaultKey) {
    throw new Error('Unlock your vault before enabling biometrics.')
  }

  let credential

  try {
    credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(
          new Uint8Array(32)
        ),
        rp: {
          name: 'Personal Vault',
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: email || userId,
          displayName: displayName || email || 'Vault user'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none',
        extensions: { prf: {} }
      }
    })
  } catch (error) {
    if (error?.name === 'NotAllowedError') {
      throw new Error('Biometric setup was cancelled.')
    }

    throw error
  }

  if (!credential) {
    throw new Error('Biometric setup was cancelled.')
  }

  const credentialId = bufferToBase64Url(
    credential.rawId
  )

  // The PRF output is only produced during an assertion, so we immediately
  // evaluate it once to wrap the vault key.
  const prfSalt = crypto.getRandomValues(
    new Uint8Array(32)
  )

  const prfOutput = await evaluatePrf(
    credentialId,
    prfSalt
  )

  const wrappingKey = await importAesKey(prfOutput)
  const iv = crypto.getRandomValues(
    new Uint8Array(12)
  )

  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    vaultKey
  )

  const record = {
    version: 1,
    credentialId,
    prfSalt: bufferToBase64Url(prfSalt),
    iv: bufferToBase64Url(iv),
    wrapped: bufferToBase64Url(cipher),
    createdAt: new Date().toISOString()
  }

  try {
    localStorage.setItem(
      STORE_PREFIX + userId,
      JSON.stringify(record)
    )
  } catch {
    throw new Error('Unable to store biometric data on this device.')
  }

  return record
}

export async function unlockWithBiometric(userId) {
  const record = getBiometricRecord(userId)

  if (!record) {
    throw new Error(
      'No biometric unlock is set up on this device.'
    )
  }

  const prfOutput = await evaluatePrf(
    record.credentialId,
    base64UrlToBytes(record.prfSalt)
  )

  const wrappingKey = await importAesKey(prfOutput)

  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64UrlToBytes(record.iv) },
      wrappingKey,
      base64UrlToBytes(record.wrapped)
    )

    return new Uint8Array(plain)
  } catch {
    throw new Error(
      'Biometric unlock failed on this device. Sign in with your master password and enable it again.'
    )
  }
}
