import { useEffect, useState } from 'react'
import {
  faviconCandidates,
  siteInitial,
  siteTint
} from '../lib/favicon'

/**
 * Shows the logo for a saved URL.
 *
 * Tries the site's own icon files in order. If none load, falls back to a
 * coloured initial derived from the domain. No third-party favicon service
 * is contacted, so the list of saved sites never leaves the device.
 */
export default function SiteLogo({
  url,
  name,
  size = 18,
  radius = 6,
  className = 'site-logo'
}) {
  const candidates = faviconCandidates(url)
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setIndex(0)
    setFailed(false)
  }, [url])

  const hasCandidate =
    !failed && index < candidates.length

  const box = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: `${radius}px`
  }

  if (!hasCandidate) {
    return (
      <span
        className={`${className} site-logo-fallback`}
        style={{
          ...box,
          background: siteTint(url || name),
          fontSize: `${Math.max(8, Math.round(size * 0.46))}px`
        }}
        aria-hidden="true"
      >
        {siteInitial(name, url)}
      </span>
    )
  }

  return (
    <img
      className={className}
      style={box}
      src={candidates[index]}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (index + 1 < candidates.length) {
          setIndex(index + 1)
        } else {
          setFailed(true)
        }
      }}
    />
  )
}
