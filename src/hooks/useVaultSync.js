import { useState, useEffect, useCallback, useRef } from 'react'
import { syncVaultWithConflictResolution } from '../lib/vault'
import { idbGetPendingQueue } from '../lib/idb'
import { decryptJson } from '../lib/crypto'
import { subscribeVaultRealtime } from '../lib/realtime'

/**
 * Custom hook for offline sync, conflict resolution, and live multi-device synchronization
 *
 * @param {Object} options
 * @param {Object|null} options.session - Supabase auth session
 * @param {Uint8Array|null} options.vaultKey - Current master vault key in memory
 * @param {Array} options.items - Current decrypted vault items in state
 * @param {function} options.setItems - State setter for items
 * @param {function} options.showToast - Optional toast notification function
 * @param {string} options.lang - Current language ('id' | 'en')
 */
export function useVaultSync({
  session,
  vaultKey,
  items,
  setItems,
  showToast,
  lang = 'id'
}) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const vaultKeyRef = useRef(vaultKey)
  vaultKeyRef.current = vaultKey

  const userId = session?.user?.id || null

  const checkPendingQueue = useCallback(async (uid) => {
    if (!uid) return
    try {
      const pending = await idbGetPendingQueue(uid)
      setPendingSyncCount(pending.length)
    } catch {
      // ignore
    }
  }, [])

  const runSync = useCallback(
    async (targetUserId = userId, currentKey = vaultKeyRef.current) => {
      if (!targetUserId || !currentKey) return
      setIsSyncing(true)
      try {
        const result = await syncVaultWithConflictResolution(targetUserId, currentKey)
        await checkPendingQueue(targetUserId)

        if (result.resolvedConflicts > 0 && showToast) {
          showToast(
            lang === 'id'
              ? `Sinkronisasi selesai: ${result.resolvedConflicts} konflik berhasil dipulihkan secara aman.`
              : `Sync complete: ${result.resolvedConflicts} conflicts resolved safely.`,
            3500
          )
        }

        // Re-hydrate decrypted items in parallel
        const decryptedResults = await Promise.all(
          result.rows.map(async (row) => {
            try {
              const payload = await decryptJson(row.payload, currentKey)
              return { ...row, ...payload }
            } catch {
              return null
            }
          })
        )
        const decrypted = decryptedResults.filter(Boolean)
        setItems(decrypted)
      } catch (err) {
        console.warn('Sync warning:', err)
      } finally {
        setIsSyncing(false)
      }
    },
    [userId, lang, checkPendingQueue, setItems, showToast]
  )

  // Listen for online / offline network events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (showToast) {
        showToast(
          lang === 'id'
            ? 'Koneksi pulih. Memulai sinkronisasi…'
            : 'Back online. Syncing changes…',
          2000
        )
      }
      if (userId && vaultKeyRef.current) {
        runSync(userId, vaultKeyRef.current)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      if (showToast) {
        showToast(
          lang === 'id'
            ? 'Anda sedang offline. Perubahan disimpan lokal.'
            : 'You are offline. Changes saved locally.',
          2000
        )
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [userId, lang, runSync, showToast])

  // Multi-Device Realtime listener via Supabase Channels
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeVaultRealtime({
      userId,
      getVaultKey: () => vaultKeyRef.current,
      onEvent: ({ action, item, id }) => {
        if (action === 'delete') {
          setItems((prev) => prev.filter((i) => i.id !== id))
          if (showToast) {
            showToast(
              lang === 'id'
                ? 'Item dihapus dari perangkat lain'
                : 'Item removed from another device',
              1800
            )
          }
        } else if (action === 'upsert' && item) {
          setItems((prev) => {
            const exists = prev.some((i) => i.id === item.id)
            if (exists) {
              return prev.map((i) => (i.id === item.id ? item : i))
            }
            return [item, ...prev]
          })
          if (showToast) {
            showToast(
              lang === 'id'
                ? 'Data diperbarui dari perangkat lain'
                : 'Data updated from another device',
              1800
            )
          }
        } else if (action === 'sync_needed') {
          runSync(userId, vaultKeyRef.current)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [userId, lang, runSync, setItems, showToast])

  // Check pending mutations on mount or user change
  useEffect(() => {
    if (userId) {
      checkPendingQueue(userId)
    }
  }, [userId, checkPendingQueue])

  return {
    isOnline,
    pendingSyncCount,
    isSyncing,
    runSync,
    checkPendingQueue
  }
}
