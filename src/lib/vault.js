import { supabase } from './supabase'
import { decryptJson, encryptJson, generateId } from './crypto'
import { idbBulkPut, idbPut, idbGetUserItems } from './idb'

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
  const rows = data || []
  await idbBulkPut(rows)
  return rows
}

export async function loadCachedItems(userId) {
  return idbGetUserItems(userId)
}

export async function upsertEncryptedItem(userId, itemType, category, payload, existingId = null) {
  const id = existingId || generateId()
  const row = {
    id,
    user_id: userId,
    item_type: itemType,
    category,
    payload,
    updated_at: new Date().toISOString()
  }
  const { data, error } = await supabase
    .from('vault_items')
    .upsert(row)
    .select('id, user_id, item_type, category, payload, created_at, updated_at')
    .single()
  if (error) throw error
  await idbPut(data)
  return data
}

export async function deleteEncryptedItem(userId, id) {
  const { error } = await supabase.from('vault_items').delete().eq('user_id', userId).eq('id', id)
  if (error) throw error
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
  return encryptJson({ check: 'PERSONAL_VAULT_OK' }, masterKey)
}

export async function verifyMasterKey(profile, masterKey) {
  if (!profile.vault_verifier) return false
  try {
    const value = await decryptJson(profile.vault_verifier, masterKey)
    return value?.check === 'PERSONAL_VAULT_OK'
  } catch {
    return false
  }
}
export async function uploadAvatar(userId, file) {
  if (!userId) {
    throw new Error('User ID is required')
  }

  if (!file) {
    throw new Error('Avatar file is required')
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ]

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Avatar must be JPG, PNG, or WebP')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Avatar must be smaller than 5 MB')
  }

  const filePath = `${userId}/avatar.webp`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/webp'
    })

  if (uploadError) {
    throw uploadError
  }

  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  const avatarUrl =
    publicUrlData?.publicUrl || filePath

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (profileError) {
    throw profileError
  }

  return avatarUrl
}