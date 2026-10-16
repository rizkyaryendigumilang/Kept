/**
 * Zero-Knowledge Password Breach Checker using HaveIBeenPwned (HIBP) k-Anonymity API.
 * 
 * Privacy Guarantee:
 * - Plaintext passwords NEVER leave the browser.
 * - Local SHA-1 hashing via Web Crypto API.
 * - Only the first 5 hexadecimal characters (prefix) are sent to the HIBP range API.
 * - Matching is performed strictly in local client memory.
 * - Results are cached in-memory and sessionStorage to prevent redundant network calls.
 */

const textEncoder = new TextEncoder()
const inMemoryCache = new Map()

/**
 * Computes SHA-1 hash of a string in uppercase hex.
 */
export async function sha1Hex(str) {
  const data = textEncoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

/**
 * Fetches HIBP range hash suffixes for a 5-char prefix.
 * Result is cached in memory and sessionStorage.
 */
async function fetchRangePrefix(prefix) {
  const cleanPrefix = prefix.toUpperCase().slice(0, 5)
  if (inMemoryCache.has(cleanPrefix)) {
    return inMemoryCache.get(cleanPrefix)
  }

  // Check sessionStorage cache
  try {
    const cached = sessionStorage.getItem(`kept_pwned_${cleanPrefix}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      inMemoryCache.set(cleanPrefix, parsed)
      return parsed
    }
  } catch {
    // ignore storage access issues
  }

  const res = await fetch(`https://api.pwnedpasswords.com/range/${cleanPrefix}`, {
    headers: {
      'User-Agent': 'Kept-Private-Vault-ZK'
    }
  })

  if (!res.ok) {
    throw new Error(`Pwned API error: HTTP ${res.status}`)
  }

  const text = await res.text()
  const suffixMap = new Map()

  const lines = text.split('\n')
  for (const line of lines) {
    const [suffix, countStr] = line.trim().split(':')
    if (suffix && countStr) {
      suffixMap.set(suffix.toUpperCase(), parseInt(countStr, 10) || 0)
    }
  }

  // Cache in-memory
  inMemoryCache.set(cleanPrefix, suffixMap)

  // Cache in sessionStorage (converted to entries array for serializability)
  try {
    sessionStorage.setItem(
      `kept_pwned_${cleanPrefix}`,
      JSON.stringify(Array.from(suffixMap.entries()))
    )
  } catch {
    // sessionStorage might be full or disabled
  }

  return suffixMap
}

/**
 * Checks a single password against known data breaches.
 * Returns { breached: boolean, count: number, error: null | string }
 */
export async function checkPasswordBreach(password) {
  if (!password || typeof password !== 'string') {
    return { breached: false, count: 0, error: null }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { breached: false, count: 0, error: 'offline' }
  }

  try {
    const hash = await sha1Hex(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)

    const suffixMap = await fetchRangePrefix(prefix)
    const count = suffixMap.get(suffix) || 0

    return {
      breached: count > 0,
      count,
      hashPrefix: prefix,
      error: null
    }
  } catch (err) {
    return {
      breached: false,
      count: 0,
      error: err.message || 'check_failed'
    }
  }
}

/**
 * Scans an array of vault items for password breaches in parallel batches.
 * Calls onProgress(processedCount, totalCount) after each batch.
 * Returns array of { item, breachCount, checkedAt }
 */
export async function scanVaultPasswordBreaches(items = [], onProgress) {
  const passwordItems = items.filter(
    (i) => (i.item_type === 'password' || !i.item_type) && i.password && typeof i.password === 'string'
  )

  const total = passwordItems.length
  if (total === 0) return []

  const breachedResults = []
  const batchSize = 5

  for (let i = 0; i < total; i += batchSize) {
    const chunk = passwordItems.slice(i, i + batchSize)
    const promises = chunk.map(async (item) => {
      const res = await checkPasswordBreach(item.password)
      return {
        item,
        breached: res.breached,
        count: res.count
      }
    })

    const results = await Promise.all(promises)
    for (const r of results) {
      if (r.breached) {
        breachedResults.push({
          itemId: r.item.id,
          itemName: r.item.name || r.item.username || 'Password item',
          username: r.item.username || '',
          url: r.item.url || '',
          count: r.count,
          checkedAt: new Date().toISOString()
        })
      }
    }

    onProgress?.(Math.min(i + batchSize, total), total)
  }

  // Store scan timestamp and results in localStorage
  try {
    localStorage.setItem('kept_last_breach_scan', JSON.stringify({
      scannedAt: new Date().toISOString(),
      totalScanned: total,
      breachedCount: breachedResults.length,
      breachedResults
    }))
  } catch {
    // ignore
  }

  return breachedResults
}

/**
 * Retrieves the cached last breach scan results.
 */
export function getLastBreachScan() {
  try {
    const raw = localStorage.getItem('kept_last_breach_scan')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
