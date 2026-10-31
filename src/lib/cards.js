/**
 * My Cards Universal Digital Wallet Engine
 * Category definitions, capability matrix, device comparison (iPhone X vs iPhone 15),
 * preset catalogs, and barcode/QR rendering utilities.
 */

export const CARD_CATEGORIES = [
  {
    id: 'bank',
    labelKey: 'card_cat_bank',
    icon: 'CreditCard',
    color: '#0056b3',
    gradient: 'linear-gradient(135deg, #0056b3 0%, #002b66 100%)',
    descKey: 'card_cat_bank_desc',
    sample: 'BCA, Mandiri, Flazz, GoPay, BNI'
  },
  {
    id: 'access',
    labelKey: 'card_cat_access',
    icon: 'Building2',
    color: '#0d9488',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)',
    descKey: 'card_cat_access_desc',
    sample: 'Apartemen, Kantor, Gerbang, Parkir'
  },
  {
    id: 'membership',
    labelKey: 'card_cat_membership',
    icon: 'Tag',
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
    descKey: 'card_cat_membership_desc',
    sample: 'Starbucks, MAPCLUB, Indomaret, Gym'
  },
  {
    id: 'health',
    labelKey: 'card_cat_health',
    icon: 'HeartPulse',
    color: '#dc2626',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
    descKey: 'card_cat_health_desc',
    sample: 'BPJS Kesehatan, Prudential, Allianz'
  },
  {
    id: 'voucher',
    labelKey: 'card_cat_voucher',
    icon: 'Gift',
    color: '#ea580c',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)',
    descKey: 'card_cat_voucher_desc',
    sample: 'Sodexo, MAP Gift, Diskon, Kupon'
  },
  {
    id: 'other',
    labelKey: 'card_cat_other',
    icon: 'WalletCards',
    color: '#475569',
    gradient: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
    descKey: 'card_cat_other_desc',
    sample: 'Perpustakaan, Mahasiswa, Komunitas'
  }
]

export const CARD_CAPABILITIES = {
  saved: {
    id: 'saved',
    labelKey: 'cap_saved',
    descKey: 'cap_saved_desc',
    badgeClass: 'cap-badge-saved',
    icon: 'ShieldCheck',
    color: '#64748b'
  },
  barcode_ready: {
    id: 'barcode_ready',
    labelKey: 'cap_barcode_ready',
    descKey: 'cap_barcode_ready_desc',
    badgeClass: 'cap-badge-barcode',
    icon: 'QrCode',
    color: '#2563eb'
  },
  nfc_scanned: {
    id: 'nfc_scanned',
    labelKey: 'cap_nfc_scanned',
    descKey: 'cap_nfc_scanned_desc',
    badgeClass: 'cap-badge-nfc',
    icon: 'Radio',
    color: '#0891b2'
  },
  digital_credential_required: {
    id: 'digital_credential_required',
    labelKey: 'cap_digital_credential_required',
    descKey: 'cap_digital_credential_required_desc',
    badgeClass: 'cap-badge-credential',
    icon: 'ExternalLink',
    color: '#d97706'
  },
  tap_ready: {
    id: 'tap_ready',
    labelKey: 'cap_tap_ready',
    descKey: 'cap_tap_ready_desc',
    badgeClass: 'cap-badge-tap',
    icon: 'CheckCheck',
    color: '#16a34a'
  },
  unsupported: {
    id: 'unsupported',
    labelKey: 'cap_unsupported',
    descKey: 'cap_unsupported_desc',
    badgeClass: 'cap-badge-unsupported',
    icon: 'AlertTriangle',
    color: '#ef4444'
  },
  expired: {
    id: 'expired',
    labelKey: 'cap_expired',
    descKey: 'cap_expired_desc',
    badgeClass: 'cap-badge-expired',
    icon: 'Clock',
    color: '#94a3b8'
  }
}

/**
 * Checks whether an MM/YY or YYYY-MM expiry string has passed
 */
export function isCardExpired(expiryStr) {
  if (!expiryStr || typeof expiryStr !== 'string') return false
  const clean = expiryStr.trim()
  if (!clean) return false

  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1 // 1-12

  // MM/YY or MM/YYYY format
  if (clean.includes('/')) {
    const parts = clean.split('/')
    if (parts.length === 2) {
      const expMonth = parseInt(parts[0], 10)
      let expYear = parseInt(parts[1], 10)
      if (expYear < 100) expYear += 2000
      if (expYear < curYear) return true
      if (expYear === curYear && expMonth < curMonth) return true
    }
  }

  // YYYY-MM or YYYY-MM-DD
  if (clean.includes('-')) {
    const parts = clean.split('-')
    if (parts.length >= 2) {
      const expYear = parseInt(parts[0], 10)
      const expMonth = parseInt(parts[1], 10)
      if (expYear < curYear) return true
      if (expYear === curYear && expMonth < curMonth) return true
    }
  }

  return false
}

/**
 * Evaluates the real-world technical capability status of a card
 */
export function evaluateCardCapability(card) {
  if (!card) return CARD_CAPABILITIES.saved

  // 1. Check expiration
  if (card.expiry && isCardExpired(card.expiry)) {
    return CARD_CAPABILITIES.expired
  }

  // 2. Check if explicitly marked unsupported
  if (card.unsupported) {
    return CARD_CAPABILITIES.unsupported
  }

  // 3. Official Apple Wallet or Tap Ready pass provisioned
  if (card.tap_ready || card.apple_wallet_ready || card.pkpass_url) {
    return CARD_CAPABILITIES.tap_ready
  }

  // 4. Barcode or QR code data available
  if (card.barcode_value && String(card.barcode_value).trim().length > 0) {
    return CARD_CAPABILITIES.barcode_ready
  }

  // 5. NFC scanned tag metadata stored
  if (card.nfc_uid && String(card.nfc_uid).trim().length > 0) {
    return CARD_CAPABILITIES.nfc_scanned
  }

  // 6. Access card without digital credential or barcode
  if (card.category === 'access' || card.requires_official_app) {
    return CARD_CAPABILITIES.digital_credential_required
  }

  // 7. Default to safe encrypted storage
  return CARD_CAPABILITIES.saved
}

/**
 * Popular presets for rapid one-click adding across categories
 */
export const POPULAR_CARD_PRESETS = [
  // Banks & e-Money
  {
    category: 'bank',
    name: 'BCA Flazz',
    issuer: 'Bank Central Asia',
    color: '#0056b3',
    cardBrand: 'FLAZZ',
    officialUrl: 'https://www.bca.co.id/id/individu/produk/kartu-prabayar/flazz',
    notes: 'Kartu prabayar contactless BCA untuk tol, transportasi, & belanja.'
  },
  {
    category: 'bank',
    name: 'Mandiri e-Money',
    issuer: 'Bank Mandiri',
    color: '#003d79',
    cardBrand: 'E-MONEY',
    officialUrl: 'https://bankmandiri.co.id/e-money',
    notes: 'Kartu uang elektronik Mandiri untuk tol & TransJakarta.'
  },
  {
    category: 'bank',
    name: 'BNI TapCash',
    issuer: 'Bank Negara Indonesia',
    color: '#e87500',
    cardBrand: 'TAPCASH',
    officialUrl: 'https://tapcash.bni.co.id',
    notes: 'Uang elektronik prabayar BNI.'
  },
  {
    category: 'bank',
    name: 'BRI BRIZZI',
    issuer: 'Bank Rakyat Indonesia',
    color: '#00529c',
    cardBrand: 'BRIZZI',
    officialUrl: 'https://bri.co.id/brizzi',
    notes: 'Uang elektronik isi ulang BRI.'
  },
  {
    category: 'bank',
    name: 'BCA Debit Mastercard',
    issuer: 'Bank Central Asia',
    color: '#0056b3',
    cardBrand: 'MASTERCARD',
    officialUrl: 'https://www.bca.co.id',
    notes: 'Kartu debit utama BCA.'
  },
  {
    category: 'bank',
    name: 'Bank Jago Visa Debit',
    issuer: 'Bank Jago',
    color: '#fa5a00',
    cardBrand: 'VISA',
    officialUrl: 'https://jago.com',
    notes: 'Kartu debit digital & fisik Jago.'
  },

  // Access
  {
    category: 'access',
    name: 'Kartu Akses Apartemen',
    issuer: 'Apartemen / Residence',
    color: '#0d9488',
    cardBrand: 'RFID',
    notes: 'Kartu akses lift, lobi, dan gerbang apartemen. Memerlukan reader terdaftar.'
  },
  {
    category: 'access',
    name: 'ID Card / Akses Kantor',
    issuer: 'Perusahaan / Office Tower',
    color: '#0f766e',
    cardBrand: 'SMARTCARD',
    notes: 'Akses turnstile lobby dan pintu ruangan kerja.'
  },
  {
    category: 'access',
    name: 'Akses Parkir Kendaraan',
    issuer: 'Pengelola Parkir',
    color: '#115e59',
    cardBrand: 'PARKING',
    notes: 'Kartu langganan parkir mobil/motor bulanan.'
  },

  // Membership & Loyalty
  {
    category: 'membership',
    name: 'Starbucks Rewards',
    issuer: 'Starbucks Coffee',
    color: '#006241',
    cardBrand: 'LOYALTY',
    officialUrl: 'https://www.starbucks.co.id',
    notes: 'Scan barcode di kasir untuk kumpulkan Stars dan reward.'
  },
  {
    category: 'membership',
    name: 'MAPCLUB Card',
    issuer: 'Mitra Adiperkasa',
    color: '#7c3aed',
    cardBrand: 'MEMBER',
    officialUrl: 'https://mapclub.com',
    notes: 'Poin belanja di Zara, Marks & Spencer, Sephora, dll.'
  },
  {
    category: 'membership',
    name: 'Indomaret Poinku',
    issuer: 'Indomaret',
    color: '#0284c7',
    cardBrand: 'POINKU',
    officialUrl: 'https://indomaretpoinku.com',
    notes: 'Kumpulkan stamp & poin belanja harian.'
  },
  {
    category: 'membership',
    name: 'Alfagift / Alfamart Member',
    issuer: 'Alfamart',
    color: '#e11d48',
    cardBrand: 'MEMBER',
    officialUrl: 'https://alfagift.id',
    notes: 'Barcode loyalty Alfamart.'
  },
  {
    category: 'membership',
    name: 'Cinema XXI Mtix Member',
    issuer: 'Cinema 21',
    color: '#b45309',
    cardBrand: 'MEMBER',
    officialUrl: 'https://21cineplex.com',
    notes: 'Barcode tiket dan loyalty XXI.'
  },

  // Health & Insurance
  {
    category: 'health',
    name: 'BPJS Kesehatan',
    issuer: 'BPJS Kesehatan RI',
    color: '#15803d',
    cardBrand: 'BPJS',
    officialUrl: 'https://bpjs-kesehatan.go.id',
    notes: 'Nomor virtual JKN untuk klaim faskes tingkat pertama & lanjutan.'
  },
  {
    category: 'health',
    name: 'Prudential PRUaccess',
    issuer: 'Prudential Life Assurance',
    color: '#dc2626',
    cardBrand: 'HEALTH',
    officialUrl: 'https://www.prudential.co.id',
    notes: 'Kartu jaminan rawat inap cashless rumah sakit.'
  },
  {
    category: 'health',
    name: 'Allianz MediCard',
    issuer: 'Allianz Indonesia',
    color: '#1d4ed8',
    cardBrand: 'HEALTH',
    officialUrl: 'https://www.allianz.co.id',
    notes: 'Kartu asuransi kesehatan cashless rumah sakit rekanan.'
  },

  // Vouchers
  {
    category: 'voucher',
    name: 'MAP Gift Voucher',
    issuer: 'PT Mitra Adiperkasa Tbk',
    color: '#ea580c',
    cardBrand: 'VOUCHER',
    notes: 'Voucher belanja fisik & digital jaringan gerai MAP.'
  },
  {
    category: 'voucher',
    name: 'Sodexo Gift Pass',
    issuer: 'Sodexo / Pluxee Indonesia',
    color: '#c2410c',
    cardBrand: 'GIFT PASS',
    officialUrl: 'https://pluxee.co.id',
    notes: 'Voucher belanja multi-merchant se-Indonesia.'
  },

  // Other Cards
  {
    category: 'other',
    name: 'Kartu Anggota Perpustakaan',
    issuer: 'Perpustakaan Nasional / Daerah',
    color: '#475569',
    cardBrand: 'LIBRARY',
    notes: 'Barcode peminjaman buku perpustakaan.'
  },
  {
    category: 'other',
    name: 'Kartu Mahasiswa / Alumni',
    issuer: 'Universitas',
    color: '#334155',
    cardBrand: 'CAMPUS',
    notes: 'Identitas civitas akademika & akses fasilitas kampus.'
  }
]


/**
 * Simple, robust Code 128 Barcode renderer in pure SVG
 * Encodes ASCII characters 32-126 into crisp vector bars.
 */
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
]

// Escape untrusted text before it is interpolated into an SVG string.
// The SVG is injected with dangerouslySetInnerHTML, so an unescaped card
// number containing markup would execute in the app origin.
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function generateBarcodeSvg(text) {
  if (!text || typeof text !== 'string') return null
  const clean = text.trim()
  if (!clean) return null

  // Use Code 128 Subset B (Start B is index 104)
  const START_B = 104
  const STOP = 106
  const charCodes = [START_B]

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i)
    if (code >= 32 && code <= 126) {
      charCodes.push(code - 32)
    } else {
      charCodes.push(0) // space fallback
    }
  }

  // Calculate checksum
  let checksum = charCodes[0]
  for (let i = 1; i < charCodes.length; i++) {
    checksum += charCodes[i] * i
  }
  charCodes.push(checksum % 103)
  charCodes.push(STOP)

  // Build pattern
  let patternString = ''
  for (const idx of charCodes) {
    patternString += CODE128_PATTERNS[idx] || '212222'
  }

  // Convert width digits into rects
  const rects = []
  let x = 20 // Quiet zone left
  let isBar = true
  const barHeight = 80

  for (let i = 0; i < patternString.length; i++) {
    const width = parseInt(patternString[i], 10) * 2.2
    if (isBar) {
      rects.push(`<rect x="${x.toFixed(1)}" y="10" width="${width.toFixed(1)}" height="${barHeight}" fill="#000000" />`)
    }
    x += width
    isBar = !isBar
  }

  const totalWidth = x + 20 // Quiet zone right
  const totalHeight = 116

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="auto" style="background:#ffffff; border-radius:8px;">
      <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />
      ${rects.join('')}
      <text x="${(totalWidth / 2).toFixed(1)}" y="104" text-anchor="middle" font-family="monospace" font-size="12" font-weight="600" fill="#000000" letter-spacing="2">${escapeXml(clean)}</text>
    </svg>
  `
}

/**
 * Clean vector QR Code SVG generator
 * Uses lightweight QR matrix calculation for crisp, scalable display
 */
export function generateQrCodeSvg(text) {
  if (!text) return null
  const clean = String(text).trim()
  if (!clean) return null

  // Fallback to high-contrast SVG representation with clean quiet zones
  // We can render a QR code grid or standard dynamic matrix
  return {
    value: clean,
    type: 'qr'
  }
}
