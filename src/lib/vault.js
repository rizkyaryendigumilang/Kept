import { supabase } from './supabase'
import {
  decryptJson,
  encryptJson,
  generateId,
  generateSalt,
  deriveVaultKey,
  deriveVaultKeyAsync,
  wrapMasterKeyWithRecovery,
  unwrapMasterKeyWithRecovery
} from './crypto'
import {
  idbBulkPut,
  idbPut,
  idbDelete,
  idbGetUserItems,
  idbQueueAction,
  idbGetPendingQueue,
  idbRemoveQueueItem,
  idbMarkSynced,
  idbClearUser
} from './idb'

export async function ensureProfile(user, displayName) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, vault_salt, vault_verifier, theme, card_style')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw error
  if (data) return data

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id, display_name: displayName || user.email?.split('@')[0] || 'You' })
    .select('id, display_name, avatar_url, vault_salt, vault_verifier, theme, card_style')
    .single()
  if (insertError) throw insertError
  return inserted
}

export async function fetchEncryptedItems(userId) {
  const { data, error } = await supabase
    .from('vault_items')
    .select('id, user_id, item_type, category, payload, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  const rows = (data || []).map((r) => ({ ...r, sync_status: 'synced' }))
  await idbBulkPut(rows)
  return rows
}

export async function loadCachedItems(userId) {
  return idbGetUserItems(userId)
}

export async function upsertEncryptedItem(userId, itemType, category, payload, existingId = null) {
  const id = existingId || generateId()
  const now = new Date().toISOString()
  const row = {
    id,
    user_id: userId,
    item_type: itemType,
    category,
    payload,
    updated_at: now,
    local_updated_at: now,
    sync_status: 'synced'
  }

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('vault_items')
        .upsert({
          id: row.id,
          user_id: row.user_id,
          item_type: row.item_type,
          category: row.category,
          payload: row.payload,
          updated_at: row.updated_at
        })
        .select('id, user_id, item_type, category, payload, created_at, updated_at')
        .single()

      if (!error && data) {
        const syncedRow = { ...data, local_updated_at: now, sync_status: 'synced' }
        await idbPut(syncedRow)
        return syncedRow
      }
    } catch {
      // Network failed, fall back to offline handling
    }
  }

  // Offline or network error
  row.sync_status = 'pending_upsert'
  await idbPut(row)
  await idbQueueAction(userId, 'upsert', row)
  return row
}

export async function deleteEncryptedItem(userId, id) {
  if (navigator.onLine) {
    try {
      const { error } = await supabase
        .from('vault_items')
        .delete()
        .eq('user_id', userId)
        .eq('id', id)
      if (!error) {
        await idbDelete(id)
        return true
      }
    } catch {
      // Offline fallback
    }
  }

  await idbDelete(id)
  await idbQueueAction(userId, 'delete', { id })
  return true
}

export async function setProfilePreference(userId, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('id, display_name, avatar_url, vault_salt, vault_verifier, theme, card_style')
    .single()
  if (error) throw error
  return data
}

export async function createVerifier(masterKey) {
  return encryptJson({ check: 'KEPT_VAULT_OK' }, masterKey)
}

export async function verifyMasterKey(profile, masterKey) {
  if (!profile?.vault_verifier) return false
  try {
    const envelope = profile.vault_verifier.checkEnvelope || profile.vault_verifier
    const value = await decryptJson(envelope, masterKey)
    return value?.check === 'PERSONAL_VAULT_OK' || value?.check === 'KEPT_VAULT_OK'
  } catch {
    return false
  }
}

// Emergency recovery unwrapping
export async function recoverMasterKey(profile, recoveryKey) {
  const envelope = profile?.vault_verifier?.recovery || profile?.vault_recovery
  if (!envelope) {
    throw new Error('Tidak ada Recovery Key yang terdaftar untuk vault ini.')
  }
  const masterKey = await unwrapMasterKeyWithRecovery(envelope, recoveryKey)
  const valid = await verifyMasterKey(profile, masterKey)
  if (!valid) {
    throw new Error('Recovery Key salah atau tidak cocok.')
  }
  return masterKey
}

// Master password rotation & full re-encryption
export async function changeMasterPassword({
  userId,
  newMasterPassword,
  decryptedItems,
  recoveryKey,
  theme,
  cardStyle
}) {
  const newSalt = generateSalt()
  const newMasterKey = await deriveVaultKeyAsync(newMasterPassword, newSalt)
  const checkEnvelope = await createVerifier(newMasterKey)

  let recoveryEnvelope = null
  if (recoveryKey) {
    recoveryEnvelope = await wrapMasterKeyWithRecovery(newMasterKey, recoveryKey)
  }

  const newVerifier = {
    checkEnvelope,
    recovery: recoveryEnvelope
  }

  // Re-encrypt all vault items with new key
  const reEncrypted = []
  for (const item of decryptedItems) {
    const payload = await encryptJson(item, newMasterKey)
    reEncrypted.push({
      id: item.id,
      user_id: userId,
      item_type: item.item_type,
      category: item.category,
      payload,
      updated_at: new Date().toISOString()
    })
  }

  // Push to Supabase if connected
  if (navigator.onLine && reEncrypted.length) {
    const { error: itemError } = await supabase.from('vault_items').upsert(reEncrypted)
    if (itemError) throw itemError
  }

  // Update local IndexedDB cache
  await idbBulkPut(reEncrypted)

  // Update profile with new salt and verifier
  const patch = {
    vault_salt: newSalt,
    vault_verifier: newVerifier,
    updated_at: new Date().toISOString()
  }
  if (theme) patch.theme = theme
  if (cardStyle) patch.card_style = cardStyle

  const updatedProfile = await setProfilePreference(userId, patch)

  return {
    newMasterKey,
    updatedProfile,
    reEncryptedItems: reEncrypted
  }
}

// Reset vault when master password and recovery key are lost
export async function resetVault(userId) {
  const { error: delError } = await supabase.from('vault_items').delete().eq('user_id', userId)
  if (delError) throw delError

  const { data: updatedProfile, error: profError } = await supabase
    .from('profiles')
    .update({
      vault_salt: null,
      vault_verifier: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select('id, display_name, avatar_url, vault_salt, vault_verifier, theme, card_style')
    .single()
  if (profError) throw profError

  await idbClearUser(userId)
  return updatedProfile
}

// Bidirectional offline sync with conflict resolution
export async function syncVaultWithConflictResolution(userId, masterKey) {
  if (!navigator.onLine) {
    const cached = await idbGetUserItems(userId)
    return { rows: cached, status: 'offline', resolvedConflicts: 0 }
  }

  let resolvedConflicts = 0
  const queue = await idbGetPendingQueue(userId)

  // Process offline mutations
  for (const item of queue) {
    try {
      if (item.action === 'delete') {
        await supabase.from('vault_items').delete().eq('user_id', userId).eq('id', item.data.id)
        await idbRemoveQueueItem(item.queue_id)
      } else if (item.action === 'upsert') {
        const localRow = item.data
        const { data: remoteRow } = await supabase
          .from('vault_items')
          .select('id, updated_at, payload')
          .eq('user_id', userId)
          .eq('id', localRow.id)
          .maybeSingle()

        if (!remoteRow) {
          // No remote conflict, push local
          await supabase.from('vault_items').upsert({
            id: localRow.id,
            user_id: localRow.user_id,
            item_type: localRow.item_type,
            category: localRow.category,
            payload: localRow.payload,
            updated_at: localRow.updated_at
          })
          await idbMarkSynced(localRow.id, localRow.updated_at)
        } else {
          const remoteTime = new Date(remoteRow.updated_at).getTime()
          const localTime = new Date(localRow.local_updated_at || localRow.updated_at).getTime()

          if (localTime >= remoteTime) {
            // Local is newer: Last Write Wins
            await supabase.from('vault_items').upsert({
              id: localRow.id,
              user_id: localRow.user_id,
              item_type: localRow.item_type,
              category: localRow.category,
              payload: localRow.payload,
              updated_at: new Date().toISOString()
            })
            await idbMarkSynced(localRow.id, new Date().toISOString())
          } else {
            // Remote is newer: branch non-destructively so no work is lost
            resolvedConflicts += 1
            const branchedId = generateId()
            let conflictPayload = localRow.payload
            try {
              if (masterKey) {
                const dec = await decryptJson(localRow.payload, masterKey)
                dec.name = `${dec.name || 'Item'} (Conflict Copy)`
                conflictPayload = await encryptJson(dec, masterKey)
              }
            } catch {
              // fallback to existing payload
            }
            await supabase.from('vault_items').insert({
              id: branchedId,
              user_id: localRow.user_id,
              item_type: localRow.item_type,
              category: localRow.category,
              payload: conflictPayload,
              updated_at: new Date().toISOString()
            })
          }
        }
        await idbRemoveQueueItem(item.queue_id)
      }
    } catch (e) {
      console.warn('Queue sync error:', e)
    }
  }

  // Pull fresh server rows
  const { data: serverRows, error: fetchErr } = await supabase
    .from('vault_items')
    .select('id, user_id, item_type, category, payload, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (fetchErr) throw fetchErr

  const finalRows = (serverRows || []).map((r) => ({ ...r, sync_status: 'synced' }))
  await idbBulkPut(finalRows)

  return { rows: finalRows, status: 'synced', resolvedConflicts }
}

export async function getAvatarSignedUrl(filePath) {
  if (!filePath) return ''
  if (filePath.startsWith('blob:') || filePath.startsWith('data:')) return filePath
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath

  try {
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(filePath, 86400)
    if (error || !data?.signedUrl) {
      const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      return pubData?.publicUrl || ''
    }
    return data.signedUrl
  } catch {
    return ''
  }
}

export async function uploadAvatar(userId, file) {
  if (!userId) throw new Error('User ID is required')
  if (!file) throw new Error('Avatar file is required')

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) throw new Error('Avatar must be JPG, PNG, or WebP')
  if (file.size > 5 * 1024 * 1024) throw new Error('Avatar must be smaller than 5 MB')

  const filePath = `${userId}/avatar.webp`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/webp'
    })

  if (uploadError) throw uploadError

  // Store relative file path in profiles, NOT permanent public URL
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (profileError) throw profileError

  // Generate signed URL for immediate client-side display
  const signedUrl = await getAvatarSignedUrl(filePath)
  return { filePath, signedUrl }
}

export async function removeAvatar(userId) {
  if (!userId) throw new Error('User ID is required')
  const filePath = `${userId}/avatar.webp`
  try {
    await supabase.storage.from('avatars').remove([filePath])
  } catch {
    // best effort
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (profileError) throw profileError
  return null
}