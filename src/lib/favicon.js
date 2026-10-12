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

export function faviconCandidates(input) {
  const domain = siteDomain(input)

  if (!domain || !domain.includes('.')) return []

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

  return match ? match[0].toUpperCase() : '?'
}

export function siteTint(input) {
  const domain = siteDomain(input) || String(input || '')

  let hash = 0

  for (let i = 0; i < domain.length; i += 1) {
    hash = (hash * 31 + domain.charCodeAt(i)) % 360
  }

  return `hsl(${hash} 58% 45%)`
}
