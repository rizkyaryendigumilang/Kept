import { checkDocumentExpiry } from './documents.js'

/**
 * Checks card expiry date string (MM/YY or MM/YYYY).
 * Returns 'expired', { status: 'expiring_soon', days: number }, or null.
 */
export function checkCardExpiry(expiryStr) {
  if (!expiryStr) return null
  const clean = expiryStr.trim()
  const match = clean.match(/^(\d{1,2})[\/\-](\d{2,4})$/)
  if (!match) return null
  let month = parseInt(match[1], 10)
  let year = parseInt(match[2], 10)
  if (year < 100) year += 2000
  if (month < 1 || month > 12) return null

  const expiryDate = new Date(year, month, 0, 23, 59, 59)
  const now = new Date()

  if (expiryDate < now) {
    return 'expired'
  }
  const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
  if (diffDays <= 60) {
    return { status: 'expiring_soon', days: diffDays }
  }
  return null
}

/**
 * Evaluates entire decrypted vault items and optional breach scan data
 * to produce an authoritative Watchtower Security Health Report.
 * 
 * Invariant: Never leaks or transmits plaintexts outside local memory.
 *
 * @param {Array} items - Decrypted vault items
 * @param {object|null} pwnedScanData - Last breach scan results
 * @param {object} [options]
 * @param {string} [options.lang='id'] - 'id' | 'en'
 * @returns {object} Watchtower Report { alerts, stats, status, issuesByCategory }
 */
export function buildWatchtowerReport(items = [], pwnedScanData = null, options = {}) {
  const { lang = 'id' } = options
  const alerts = []

  let totalPasswords = 0
  let reusedCount = 0
  let weakCount = 0
  let cardExpiryCount = 0
  let docExpiryCount = 0

  // 1. Reused passwords detection (critical risk)
  const passwordMap = new Map()
  for (const item of items) {
    if (item.item_type === 'password' && item.password) {
      totalPasswords += 1
      const list = passwordMap.get(item.password) || []
      list.push(item)
      passwordMap.set(item.password, list)
    }
  }

  for (const [pass, duplicates] of passwordMap.entries()) {
    if (duplicates.length > 1) {
      reusedCount += duplicates.length
      const names = duplicates.map((d) => d.name).join(', ')
      alerts.push({
        id: `reuse-${duplicates[0].id}`,
        type: 'reused_password',
        category: 'reused',
        level: 'danger',
        title: lang === 'id'
          ? `Password dipakai di ${duplicates.length} akun berbeda`
          : `Password reused across ${duplicates.length} accounts`,
        body: lang === 'id'
          ? `Akun: ${names}. Kebocoran satu akun membahayakan seluruh akun lainnya.`
          : `Accounts: ${names}. A compromise on one account endangers all linked accounts.`,
        item: duplicates[0],
        count: duplicates.length,
        duplicates
      })
    }
  }

  // 2. Weak & short passwords detection
  for (const item of items) {
    if (item.item_type === 'password' && item.password) {
      const p = item.password
      const isShort = p.length < 10
      const hasNumber = /\d/.test(p)
      const hasSpecial = /[^A-Za-z0-9]/.test(p)
      const hasUpper = /[A-Z]/.test(p)

      if (isShort) {
        weakCount += 1
        alerts.push({
          id: `weak-len-${item.id}`,
          type: 'weak_password',
          category: 'weak',
          level: 'danger',
          title: lang === 'id'
            ? `Password terlalu pendek: ${item.name}`
            : `Password too short: ${item.name}`,
          body: lang === 'id'
            ? `Hanya ${p.length} karakter. Password di bawah 10 karakter rentan diserang brute-force.`
            : `Only ${p.length} characters. Passwords under 10 characters are vulnerable to brute-force.`,
          item
        })
      } else if (!hasNumber || !hasSpecial || !hasUpper) {
        weakCount += 1
        alerts.push({
          id: `weak-comp-${item.id}`,
          type: 'weak_password',
          category: 'weak',
          level: 'warning',
          title: lang === 'id'
            ? `Password kurang variatif: ${item.name}`
            : `Password lacks complexity: ${item.name}`,
          body: lang === 'id'
            ? 'Belum memadukan huruf kapital, angka, dan karakter simbol.'
            : 'Does not combine uppercase letters, numbers, and symbols.',
          item
        })
      }
    }
  }

  // 3. Card Expiry audit
  for (const item of items) {
    if (item.item_type === 'bank_card' && item.expiry) {
      const check = checkCardExpiry(item.expiry)
      if (check === 'expired') {
        cardExpiryCount += 1
        alerts.push({
          id: `card-exp-${item.id}`,
          type: 'card_expired',
          category: 'expiry',
          level: 'danger',
          title: lang === 'id'
            ? `Kartu kedaluwarsa: ${item.bank_name || item.name}`
            : `Card expired: ${item.bank_name || item.name}`,
          body: lang === 'id'
            ? `Masa berlaku kartu (${item.expiry}) telah berakhir. Perbarui data atau hubungi pihak bank.`
            : `Card validity (${item.expiry}) has elapsed. Update data or contact your bank.`,
          item
        })
      } else if (check?.status === 'expiring_soon') {
        cardExpiryCount += 1
        alerts.push({
          id: `card-soon-${item.id}`,
          type: 'card_expiring_soon',
          category: 'expiry',
          level: 'warning',
          title: lang === 'id'
            ? `Kartu segera kedaluwarsa: ${item.bank_name || item.name}`
            : `Card expiring soon: ${item.bank_name || item.name}`,
          body: lang === 'id'
            ? `Masa berlaku habis dalam ${check.days} hari (${item.expiry}). Siapkan aktivasi kartu baru.`
            : `Expires in ${check.days} days (${item.expiry}). Prepare your card renewal.`,
          item
        })
      }
    }
  }

  // 4. Document Expiry audit (Paspor, SIM, dll)
  for (const item of items) {
    if (item.item_type === 'document' && item.expiry_date) {
      const check = checkDocumentExpiry(item.expiry_date)
      if (check?.status === 'expired') {
        docExpiryCount += 1
        alerts.push({
          id: `doc-exp-${item.id}`,
          type: 'doc_expired',
          category: 'expiry',
          level: 'danger',
          title: lang === 'id'
            ? `Dokumen kedaluwarsa: ${item.name}`
            : `Document expired: ${item.name}`,
          body: lang === 'id'
            ? `Masa berlaku (${item.expiry_date}) telah berakhir. Segera lakukan perpanjangan dokumen.`
            : `Validity (${item.expiry_date}) has elapsed. Renew this document.`,
          item
        })
      } else if (check?.status === 'urgent' || check?.status === 'warning_30' || check?.status === 'warning_90') {
        docExpiryCount += 1
        alerts.push({
          id: `doc-soon-${item.id}`,
          type: 'doc_expiring_soon',
          category: 'expiry',
          level: check.status === 'urgent' ? 'danger' : 'warning',
          title: lang === 'id'
            ? `Dokumen segera kedaluwarsa: ${item.name}`
            : `Document expiring soon: ${item.name}`,
          body: lang === 'id'
            ? `Masa berlaku tersisa ${check.daysRemaining} hari (${item.expiry_date}). Persiapkan berkas perpanjangan.`
            : `Expires in ${check.daysRemaining} days (${item.expiry_date}). Prepare renewal papers.`,
          item
        })
      }
    }
  }

  // 5. Breached passwords from scanData
  const breachedCount = pwnedScanData?.breachedCount || 0
  if (pwnedScanData?.breachedResults?.length > 0) {
    for (const b of pwnedScanData.breachedResults) {
      alerts.push({
        id: `pwned-${b.id}`,
        type: 'breached_password',
        category: 'breached',
        level: 'danger',
        title: lang === 'id'
          ? `Password bocor di database publik: ${b.name}`
          : `Compromised password found in public leak: ${b.name}`,
        body: lang === 'id'
          ? `Password ini muncul ${b.breachedCount.toLocaleString()} kali di basis data kebocoran publik HIBP. Segera ubah.`
          : `This password appeared in ${b.breachedCount.toLocaleString()} public breach occurrences. Change immediately.`,
        item: b
      })
    }
  }

  // Compute Overall Health Score
  let score = 100
  score -= (reusedCount > 0 ? Math.min(30, reusedCount * 8) : 0)
  score -= (weakCount > 0 ? Math.min(25, weakCount * 6) : 0)
  score -= (cardExpiryCount > 0 ? Math.min(20, cardExpiryCount * 8) : 0)
  score -= (docExpiryCount > 0 ? Math.min(15, docExpiryCount * 5) : 0)
  score -= (breachedCount > 0 ? Math.min(35, breachedCount * 18) : 0)
  score = Math.max(0, Math.min(100, score))

  const status = score >= 85
    ? { label: lang === 'id' ? 'Sangat Aman' : 'Very Secure', tone: 'good', color: '#10b981' }
    : score >= 60
      ? { label: lang === 'id' ? 'Cukup Aman' : 'Fair', tone: 'warning', color: '#f59e0b' }
      : { label: lang === 'id' ? 'Berisiko' : 'At Risk', tone: 'danger', color: '#ef4444' }

  return {
    alerts,
    stats: {
      score,
      totalPasswords,
      reusedCount,
      weakCount,
      cardExpiryCount,
      docExpiryCount,
      breachedCount
    },
    status
  }
}
