// Bank database with official branding colors, domains, and card brands

export const BANK_PRESETS = [
  { id: 'bca', name: 'BCA', color: '#0056b3', domains: ['bca.co.id', 'klikbca.com', 'mybca'], cardBrand: 'DEBIT' },
  { id: 'mandiri', name: 'Mandiri', color: '#003d79', domains: ['bankmandiri.co.id', 'livin.mandiri.co.id', 'mandiri'], cardBrand: 'DEBIT' },
  { id: 'bri', name: 'BRI', color: '#00529c', domains: ['bri.co.id', 'brimo.bri.co.id', 'bri'], cardBrand: 'DEBIT' },
  { id: 'bni', name: 'BNI', color: '#e87500', domains: ['bni.co.id', 'wondr.bni.co.id', 'bni'], cardBrand: 'DEBIT' },
  { id: 'jago', name: 'Bank Jago', color: '#fa5a00', domains: ['jago.com', 'bankjago'], cardBrand: 'VISA' },
  { id: 'jenius', name: 'Jenius / BTPN', color: '#00a2b9', domains: ['jenius.com', 'btpn.com'], cardBrand: 'VISA' },
  { id: 'cimb', name: 'CIMB Niaga', color: '#7d0000', domains: ['cimbniaga.co.id', 'octoclicks.co.id', 'cimb'], cardBrand: 'MASTERCARD' },
  { id: 'permata', name: 'Permata Bank', color: '#789b14', domains: ['permatabank.com', 'permata'], cardBrand: 'VISA' },
  { id: 'danamon', name: 'Bank Danamon', color: '#ff6200', domains: ['danamon.co.id', 'danamon'], cardBrand: 'MASTERCARD' },
  { id: 'bsi', name: 'BSI (Bank Syariah)', color: '#00a39d', domains: ['bankbsi.co.id', 'bsi'], cardBrand: 'DEBIT' },
  { id: 'seabank', name: 'SeaBank', color: '#ff5722', domains: ['seabank.co.id', 'seabank'], cardBrand: 'DEBIT' },
  { id: 'blu', name: 'blu by BCA Digital', color: '#00b8e6', domains: ['blubybcadigital.id', 'blu'], cardBrand: 'MASTERCARD' },
  { id: 'ocbc', name: 'OCBC', color: '#ea1d24', domains: ['ocbc.id', 'ocbcnisp.com', 'ocbc'], cardBrand: 'MASTERCARD' },
  { id: 'mega', name: 'Bank Mega', color: '#f7931e', domains: ['bankmega.com', 'mega'], cardBrand: 'VISA' },
  { id: 'dbs', name: 'DBS / Digibank', color: '#e60000', domains: ['dbs.com', 'digibank'], cardBrand: 'VISA' },
  { id: 'line', name: 'LINE Bank', color: '#00c300', domains: ['linebank.co.id', 'linebank'], cardBrand: 'VISA' },
  { id: 'hsbc', name: 'HSBC', color: '#db0011', domains: ['hsbc.co.id', 'hsbc.com'], cardBrand: 'VISA' },
  { id: 'wise', name: 'Wise', color: '#163300', domains: ['wise.com'], cardBrand: 'VISA' },
  { id: 'paypal', name: 'PayPal', color: '#003087', domains: ['paypal.com'], cardBrand: 'DEBIT' },
  { id: 'chase', name: 'Chase', color: '#117aca', domains: ['chase.com'], cardBrand: 'VISA' }
]

export const EMONEY_PRESETS = [
  { id: 'flazz', name: 'Flazz BCA', color: '#0066b3', domains: ['bca.co.id/flazz', 'flazz'], cardBrand: 'FLAZZ' },
  { id: 'mandiri_emoney', name: 'Mandiri e-Money', color: '#003d79', domains: ['bankmandiri.co.id/e-money', 'emoney'], cardBrand: 'E-MONEY' },
  { id: 'bni_tapcash', name: 'BNI TapCash', color: '#e87500', domains: ['bni.co.id/tapcash', 'tapcash'], cardBrand: 'TAPCASH' },
  { id: 'bri_brizzi', name: 'BRI Brizzi', color: '#00529c', domains: ['bri.co.id/brizzi', 'brizzi'], cardBrand: 'BRIZZI' },
  { id: 'gopay', name: 'GoPay', color: '#00aed6', domains: ['gopay.co.id', 'gojek.com', 'gopay'], cardBrand: 'E-WALLET' },
  { id: 'ovo', name: 'OVO', color: '#4c3494', domains: ['ovo.id', 'ovo'], cardBrand: 'E-WALLET' },
  { id: 'dana', name: 'DANA', color: '#118eea', domains: ['dana.id', 'dana'], cardBrand: 'E-WALLET' },
  { id: 'shopeepay', name: 'ShopeePay', color: '#ee4d2d', domains: ['shopee.co.id', 'shopeepay'], cardBrand: 'E-WALLET' },
  { id: 'linkaja', name: 'LinkAja', color: '#e31b23', domains: ['linkaja.id', 'linkaja'], cardBrand: 'E-WALLET' },
  { id: 'jakcard', name: 'JakCard Bank DKI', color: '#ea1d24', domains: ['bankdki.co.id/jakcard', 'jakcard'], cardBrand: 'JAKCARD' },
  { id: 'kmt', name: 'KMT KRL Commuter', color: '#c41230', domains: ['krl.co.id', 'kmt'], cardBrand: 'KMT' }
]

export const POPULAR_CARD_COLORS = [
  '#0056b3', // BCA Blue
  '#003d79', // Mandiri Navy
  '#00529c', // BRI Royal Blue
  '#e87500', // BNI Orange
  '#fa5a00', // Jago Orange
  '#00a2b9', // Jenius Cyan
  '#7d0000', // CIMB Maroon
  '#789b14', // Permata Lime
  '#00a39d', // BSI Teal
  '#ff5722', // SeaBank Coral
  '#1e293b', // Sleek Slate
  '#0f172a', // Midnight Black
  '#475569', // Titanium Grey
  '#7c3aed'  // Purple Amethyst
]

/**
 * Automatically detects bank branding color and info based on name or URL
 */
export function detectBankFromQuery(query) {
  if (!query) return null
  const clean = String(query).toLowerCase().trim()

  for (const preset of BANK_PRESETS) {
    if (clean === preset.id || clean === preset.name.toLowerCase()) {
      return preset
    }
    if (clean.includes(preset.id) || clean.includes(preset.name.toLowerCase())) {
      return preset
    }
    for (const d of preset.domains) {
      if (clean.includes(d)) {
        return preset
      }
    }
  }

  return null
}
