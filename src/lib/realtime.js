import { supabase } from './supabase'
import { decryptJson } from './crypto'
import { idbPut, idbDelete } from './idb'

/**
 * Subscribes to Supabase Realtime changes for the current user's vault items.
 *
 * @param {Object} options
 * @param {string} options.userId - User ID to filter
 * @param {function} options.getVaultKey - Getter function returning the current master key in memory
 * @param {function} options.onEvent - Callback on remote changes ({ action: 'upsert'|'delete'|'sync_needed', item, id, rawRow })
 * @returns {function} Cleanup function to unsubscribe
 */
export function subscribeVaultRealtime({ userId, getVaultKey, onEvent }) {
  if (!userId || !supabase) return () => {}

  const channelName = `vault_realtime_${userId}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'vault_items',
        filter: `user_id=eq.${userId}`
      },
      async (payload) => {
        try {
          const { eventType, new: newRow, old: oldRow } = payload

          if (eventType === 'DELETE' && oldRow?.id) {
            await idbDelete(oldRow.id)
            if (onEvent) {
              onEvent({ action: 'delete', id: oldRow.id })
            }
            return
          }

          if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow?.id) {
            // Save raw encrypted row to IndexedDB cache
            const syncedRow = {
              ...newRow,
              sync_status: 'synced',
              local_updated_at: newRow.updated_at
            }
            await idbPut(syncedRow)

            // If vault is currently unlocked, decrypt the payload immediately
            const currentKey = getVaultKey ? getVaultKey() : null
            if (currentKey && newRow.payload) {
              try {
                const decryptedPayload = await decryptJson(newRow.payload, currentKey)
                const decryptedItem = {
                  ...syncedRow,
                  ...decryptedPayload
                }
                if (onEvent) {
                  onEvent({ action: 'upsert', item: decryptedItem, rawRow: syncedRow })
                }
              } catch (decErr) {
                console.warn('Realtime decrypt warning:', decErr)
                if (onEvent) {
                  onEvent({ action: 'sync_needed' })
                }
              }
            } else if (onEvent) {
              onEvent({ action: 'cached_encrypted', rawRow: syncedRow })
            }
          }
        } catch (err) {
          console.warn('Realtime handler error:', err)
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Realtime channel error for user:', userId)
      }
    })

  return () => {
    supabase.removeChannel(channel)
  }
}
