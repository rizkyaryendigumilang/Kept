// Validation for decrypted attachment data before it is handed to the DOM.
//
// Attachment payloads are decrypted user content. They reach the app through
// `<a download href>` and an `<iframe src>`, so a crafted entry such as
// `javascript:...` or `data:text/html;...` would run in the Kept origin with
// access to the unlocked vault. Everything here fails closed.

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const PDF_MIME_TYPE = 'application/pdf'
export const ATTACHMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, PDF_MIME_TYPE]

const BASE64_PATTERN = /^[A-Za-z0-9+/=\s]+$/

/**
 * Splits a data: URL into its parts. Returns null for anything that is not a
 * well-formed base64 data URL.
 */
export function parseDataUrl(value) {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed.toLowerCase().startsWith('data:')) return null

  const comma = trimmed.indexOf(',')
  if (comma === -1) return null

  const header = trimmed.slice(5, comma)
  const body = trimmed.slice(comma + 1)

  const parts = header.split(';')
  const mime = (parts[0] || '').toLowerCase().trim()
  const isBase64 = parts.some((p) => p.trim().toLowerCase() === 'base64')

  if (!mime || !isBase64) return null
  if (!BASE64_PATTERN.test(body)) return null

  return { mime, base64: body, dataUrl: trimmed }
}

/**
 * True when the value is a base64 data URL whose MIME type is in the allowlist.
 */
export function isSafeDataUrl(value, allowed = ATTACHMENT_MIME_TYPES) {
  const parsed = parseDataUrl(value)
  if (!parsed) return false
  return allowed.includes(parsed.mime)
}

export function isSafePdfDataUrl(value) {
  return isSafeDataUrl(value, [PDF_MIME_TYPE])
}

export function isSafeImageDataUrl(value) {
  return isSafeDataUrl(value, IMAGE_MIME_TYPES)
}

const MAGIC_SIGNATURES = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  [PDF_MIME_TYPE]: [[0x25, 0x50, 0x44, 0x46]] // %PDF
}

/**
 * Reads the first bytes of a File and checks them against the MIME type the
 * browser reported. A `.pdf` with an HTML body is rejected here rather than
 * being encrypted and later rendered.
 */
export async function fileMatchesMagicBytes(file, mime) {
  if (!file || typeof file.slice !== 'function') return false

  const expected = (mime || file.type || '').toLowerCase()
  const signatures = MAGIC_SIGNATURES[expected]
  if (!signatures) return false

  if (expected === 'image/webp') {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    const riff = [0x52, 0x49, 0x46, 0x46]
    const webp = [0x57, 0x45, 0x42, 0x50]
    return riff.every((b, i) => head[i] === b) && webp.every((b, i) => head[8 + i] === b)
  }

  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  return signatures.some((sig) => sig.every((byte, i) => head[i] === byte))
}

/**
 * Combined gate for an uploaded file: MIME type must be allowed and the bytes
 * must match. Returns { ok, error, mime }.
 */
export async function validateAttachmentFile(file, { allowPdf = true } = {}) {
  const allowed = allowPdf ? ATTACHMENT_MIME_TYPES : IMAGE_MIME_TYPES
  const mime = (file?.type || '').toLowerCase()

  if (!allowed.includes(mime)) {
    return { ok: false, error: 'unsupported_type', mime }
  }

  const matches = await fileMatchesMagicBytes(file, mime)
  if (!matches) {
    return { ok: false, error: 'content_mismatch', mime }
  }

  return { ok: true, error: null, mime }
}

/**
 * Download helper that refuses unsafe payloads. Returns true when the download
 * was triggered.
 */
export function downloadAttachmentSafely(fileObj, fallbackName) {
  if (!fileObj?.data) return false

  if (!isSafeDataUrl(fileObj.data)) {
    console.warn('Blocked attachment download: unsafe data URL')
    return false
  }

  const a = document.createElement('a')
  a.href = fileObj.data
  a.download = fileObj.name || fallbackName || 'berkas'
  a.rel = 'noopener'
  a.click()
  return true
}
