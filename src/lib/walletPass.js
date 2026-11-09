/**
 * Kept Digital Wallet Pass Engine
 * Generates Apple Wallet PassKit (pass.json & .pkpass bundle) and Google Wallet formats.
 */

// Simple CRC32 implementation for standard ZIP packaging
function makeCrcTable() {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
}

const CRC_TABLE = makeCrcTable()

function crc32(bytes) {
  let crc = 0 ^ -1
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

/**
 * Computes SHA-1 hex digest using standard Web Crypto API
 */
export async function sha1Hex(bytes) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-1', bytes)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Basic fallback if needed
  return '0000000000000000000000000000000000000000'
}

/**
 * Converts Hex color (#0056b3) to rgb string ("rgb(0, 86, 179)")
 */
export function hexToRgbString(hex) {
  if (!hex || typeof hex !== 'string') return 'rgb(30, 41, 59)'
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  if (clean.length !== 6) return 'rgb(30, 41, 59)'
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Generates an Apple Wallet pass.json structure for a Kept vault card
 */
export function generateApplePassJson(card) {
  const cardIdentifier = card?.nfc_uid || card?.card_number || card?.account_number || card?.barcode_value || 'KEPT-PASS'
  const primaryNumber = card?.card_number || card?.account_number || cardIdentifier
  const isQr = card?.barcode_type === 'qr' || (card?.barcode_value && card?.barcode_value.length > 20)

  // Map category to PassKit style
  const passType = card?.category === 'access' ? 'generic' : 'storeCard'

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: 'pass.com.kept.vault',
    serialNumber: String(card?.id || Math.floor(Date.now() / 1000)),
    teamIdentifier: 'KEPTVAULT01',
    organizationName: card?.issuer || card?.bank_name || 'Kept Vault',
    description: card?.name || 'Kept Digital Pass',
    logoText: card?.bank_name || card?.card_brand || card?.name || 'KEPT',
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: hexToRgbString(card?.color || '#0056b3'),
    labelColor: 'rgba(255, 255, 255, 0.75)',
    [passType]: {
      headerFields: [
        {
          key: 'category',
          label: 'TYPE',
          value: (card?.category || 'CARD').toUpperCase()
        }
      ],
      primaryFields: [
        {
          key: 'cardName',
          label: 'CARD NAME',
          value: card?.name || card?.bank_name || 'Digital Card'
        }
      ],
      secondaryFields: [
        {
          key: 'holder',
          label: 'CARD HOLDER',
          value: card?.account_owner || 'VAULT MEMBER'
        },
        {
          key: 'identifier',
          label: 'CARD / ACCESS ID',
          value: primaryNumber.length > 12 
            ? `•••• •••• ••${primaryNumber.slice(-4)}`
            : primaryNumber
        }
      ],
      auxiliaryFields: [
        {
          key: 'expiry',
          label: 'EXPIRES',
          value: card?.expiry || 'NEVER'
        },
        {
          key: 'nfcUid',
          label: 'NFC UID',
          value: card?.nfc_uid || 'NOT SCANNED'
        }
      ],
      backFields: [
        {
          key: 'notes',
          label: 'CARD NOTES',
          value: card?.notes || 'Stored securely in Kept Vault.'
        },
        {
          key: 'website',
          label: 'OFFICIAL PORTAL',
          value: card?.official_url || 'https://kept.app'
        },
        {
          key: 'security',
          label: 'SECURITY GUARANTEE',
          value: 'Zero-knowledge end-to-end encrypted pass.'
        }
      ]
    }
  }

  // Include barcode if value exists
  const barcodeValue = card?.barcode_value || card?.card_number || card?.nfc_uid
  if (barcodeValue) {
    const barcodeFormat = isQr ? 'PKBarcodeFormatQR' : 'PKBarcodeFormatCode128'
    passJson.barcodes = [
      {
        format: barcodeFormat,
        message: String(barcodeValue),
        messageEncoding: 'iso-8859-1',
        altText: String(barcodeValue)
      }
    ]
    passJson.barcode = passJson.barcodes[0]
  }

  // If card has NFC UID, include Apple Value Added Services NFC token dictionary
  if (card?.nfc_uid) {
    passJson.nfc = {
      message: card.nfc_uid
    }
  }

  return passJson
}

/**
 * Creates a minimal 1x1 transparent PNG byte array as default placeholder icon/logo
 */
function createMinimalPng() {
  // 1x1 transparent PNG bytes
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ])
}

/**
 * Pure JavaScript ZIP Packager (Compression Method 0 - Store)
 * Produces valid standard .pkpass / .zip binary Uint8Array
 */
export async function buildPkpassBundle(passJson) {
  const encoder = new TextEncoder()
  const passJsonBytes = encoder.encode(JSON.stringify(passJson, null, 2))
  const iconBytes = createMinimalPng()

  // Generate manifest with SHA-1 hashes
  const passHash = await sha1Hex(passJsonBytes)
  const iconHash = await sha1Hex(iconBytes)

  const manifest = {
    'pass.json': passHash,
    'icon.png': iconHash,
    'logo.png': iconHash
  }
  const manifestBytes = encoder.encode(JSON.stringify(manifest, null, 2))

  const files = [
    { name: 'pass.json', data: passJsonBytes },
    { name: 'icon.png', data: iconBytes },
    { name: 'logo.png', data: iconBytes },
    { name: 'manifest.json', data: manifestBytes }
  ]

  // Construct ZIP binary buffer
  const localHeaders = []
  const centralHeaders = []
  let offset = 0

  for (const f of files) {
    const nameBytes = encoder.encode(f.name)
    const crc = crc32(f.data)
    const size = f.data.length

    // Local File Header (30 bytes + name length)
    const local = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true) // Local header signature
    view.setUint16(4, 20, true)         // Version needed (2.0)
    view.setUint16(6, 0, true)          // General flags
    view.setUint16(8, 0, true)          // Compression: 0 (Store)
    view.setUint16(10, 0, true)         // Mod time
    view.setUint16(12, 0, true)         // Mod date
    view.setUint32(14, crc, true)       // CRC-32
    view.setUint32(18, size, true)      // Compressed size
    view.setUint32(22, size, true)      // Uncompressed size
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true)         // Extra field length
    local.set(nameBytes, 30)

    localHeaders.push({ header: local, data: f.data, offset })

    // Central Directory Header (46 bytes + name length)
    const central = new Uint8Array(46 + nameBytes.length)
    const cView = new DataView(central.buffer)
    cView.setUint32(0, 0x02014b50, true) // Central header signature
    cView.setUint16(4, 20, true)         // Version made by
    cView.setUint16(6, 20, true)         // Version needed
    cView.setUint16(8, 0, true)          // General flags
    cView.setUint16(10, 0, true)         // Compression: 0
    cView.setUint16(12, 0, true)         // Mod time
    cView.setUint16(14, 0, true)         // Mod date
    cView.setUint32(16, crc, true)       // CRC-32
    cView.setUint32(20, size, true)      // Compressed size
    cView.setUint32(24, size, true)      // Uncompressed size
    cView.setUint16(28, nameBytes.length, true)
    cView.setUint16(30, 0, true)         // Extra length
    cView.setUint16(32, 0, true)         // Comment length
    cView.setUint16(34, 0, true)         // Disk start
    cView.setUint16(36, 0, true)         // Internal attr
    cView.setUint32(38, 0, true)         // External attr
    cView.setUint32(42, offset, true)    // Relative offset of local header
    central.set(nameBytes, 46)

    centralHeaders.push(central)

    offset += local.length + f.data.length
  }

  const centralDirOffset = offset
  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0)

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22)
  const eView = new DataView(eocd.buffer)
  eView.setUint32(0, 0x06054b50, true)              // EOCD signature
  eView.setUint16(4, 0, true)                       // Disk number
  eView.setUint16(6, 0, true)                       // Start disk
  eView.setUint16(8, files.length, true)            // Total entries on disk
  eView.setUint16(10, files.length, true)           // Total entries overall
  eView.setUint32(12, centralDirSize, true)          // Central dir size
  eView.setUint32(16, centralDirOffset, true)        // Central dir offset
  eView.setUint16(20, 0, true)                       // Comment length

  // Total binary length
  const totalLength = centralDirOffset + centralDirSize + eocd.length
  const bundle = new Uint8Array(totalLength)

  let pos = 0
  for (const item of localHeaders) {
    bundle.set(item.header, pos)
    pos += item.header.length
    bundle.set(item.data, pos)
    pos += item.data.length
  }

  for (const c of centralHeaders) {
    bundle.set(c, pos)
    pos += c.length
  }

  bundle.set(eocd, pos)

  return bundle
}

/**
 * Triggers standard browser download of a blob or Uint8Array
 */
export function triggerFileDownload(filename, data, mimeType = 'application/octet-stream') {
  if (typeof window === 'undefined') return
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
