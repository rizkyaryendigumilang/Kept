// Privacy-respecting site logos.
//
// We never send the list of saved sites to a third-party favicon service.
// Instead we try the site's own icon files first and fall back to a
// deterministic coloured initial when nothing loads.

export function siteDomain(input) {
  if (!input) return ''

  let value = String(input).trim()

  if (!value) return ''

  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    value = `https://${value}`
  }

  try {
    const host = new URL(value).hostname.toLowerCase()
    return host.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function isIpOrLocal(host) {
  if (!host) return true
  // Matches IPv4 (e.g. 43.156.236.102)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return true
  // Matches localhost or local development domain
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true
  // Matches port or IPv6
  if (host.includes(':')) return true
  return false
}

// In-memory cache for resolved (string URL) or failed (null) domain favicons
const faviconCache = new Map()

export function getCachedFavicon(domain) {
  if (!domain) return undefined
  return faviconCache.get(domain)
}

export function setCachedFavicon(domain, urlOrNull) {
  if (!domain) return
  if (faviconCache.size > 500) {
    const firstKey = faviconCache.keys().next().value
    faviconCache.delete(firstKey)
  }
  faviconCache.set(domain, urlOrNull)
}

export function faviconCandidates(input) {
  const domain = siteDomain(input)

  if (!domain || isIpOrLocal(domain) || !domain.includes('.')) return []

  // If already known to fail, return empty immediately
  if (faviconCache.get(domain) === null) {
    return []
  }

  // If already known to succeed with a working URL, return only that URL
  const cachedUrl = faviconCache.get(domain)
  if (cachedUrl) {
    return [cachedUrl]
  }

  return [
    `https://${domain}/favicon.ico`,
    `https://${domain}/favicon.png`,
    `https://${domain}/apple-touch-icon.png`
  ]
}

export function siteInitial(name, input) {
  const source =
    String(name || '').trim() || siteDomain(input)

  const match = source.match(/[a-z0-9]/i)

  return match ? match[0].toUpperCase() : '★'
}

export function siteTint(input) {
  const domain = siteDomain(input) || String(input || 'kept')

  let hash = 0

  for (let i = 0; i < domain.length; i += 1) {
    hash = (hash * 31 + domain.charCodeAt(i)) % 360
  }

  return `hsl(${hash} 58% 45%)`
}
