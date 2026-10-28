import { lazy } from 'react'

/**
 * Robust lazy wrapper with automatic reload resilience against deployment chunk skew.
 * When a new version is deployed to the server, older chunk files may be replaced.
 * safeLazy catches dynamic import 404s and automatically triggers a single page reload
 * so the client transparently picks up the latest asset manifest.
 */
export function safeLazy(importFn) {
  return lazy(async () => {
    try {
      return await importFn()
    } catch (err) {
      const isChunkLoadError =
        err?.message?.includes('Failed to fetch dynamically imported module') ||
        err?.message?.includes('Importing a module script failed') ||
        err?.message?.includes('error loading dynamically imported module') ||
        err?.name === 'ChunkLoadError'

      if (isChunkLoadError && typeof window !== 'undefined') {
        const reloadKey = 'kept_chunk_retry_' + window.location.pathname
        const last = sessionStorage.getItem(reloadKey)
        const now = Date.now()
        if (!last || now - Number(last) > 15000) {
          sessionStorage.setItem(reloadKey, String(now))
          console.warn('Chunk loading failed due to new deployment, reloading for latest bundle...', err)
          window.location.reload()
          return new Promise(() => {}) // halt execution while reloading
        }
      }
      throw err
    }
  })
}

export default safeLazy
