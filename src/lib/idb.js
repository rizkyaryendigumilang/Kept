const DB_NAME = 'kept-vault'
const DB_VERSION = 2
const STORE_ITEMS = 'vault_items'
const STORE_QUEUE = 'sync_queue'

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const store = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' })
        store.createIndex('user_id', 'user_id', { unique: false })
        store.createIndex('updated_at', 'updated_at', { unique: false })
        store.createIndex('sync_status', 'sync_status', { unique: false })
      } else {
        const store = event.target.transaction.objectStore(STORE_ITEMS)
        if (!store.indexNames.contains('sync_status')) {
          store.createIndex('sync_status', 'sync_status', { unique: false })
        }
      }

      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_QUEUE, {
          keyPath: 'queue_id',
          autoIncrement: true
        })
        queueStore.createIndex('user_id', 'user_id', { unique: false })
        queueStore.createIndex('created_at', 'created_at', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function idbPut(item) {
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite')
    tx.objectStore(STORE_ITEMS).put(item)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function idbBulkPut(items) {
  if (!items?.length) return
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite')
    const store = tx.objectStore(STORE_ITEMS)
    items.forEach((item) => store.put(item))
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function idbDelete(id) {
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite')
    tx.objectStore(STORE_ITEMS).delete(id)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function idbMarkSynced(id, serverUpdatedAt) {
  const db = await openDb()
  await new Promise((resolve) => {
    const tx = db.transaction(STORE_ITEMS, 'readwrite')
    const store = tx.objectStore(STORE_ITEMS)
    const req = store.get(id)
    req.onsuccess = () => {
      if (req.result) {
        const updated = {
          ...req.result,
          sync_status: 'synced',
          updated_at: serverUpdatedAt || req.result.updated_at
        }
        store.put(updated)
      }
      resolve()
    }
    req.onerror = () => resolve()
  })
  db.close()
}


export async function idbGetUserItems(userId) {
  const db = await openDb()
  const result = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readonly')
    const index = tx.objectStore(STORE_ITEMS).index('user_id')
    const req = index.getAll(IDBKeyRange.only(userId))
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return result
}

export async function idbClearUser(userId) {
  const items = await idbGetUserItems(userId)
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ITEMS, STORE_QUEUE], 'readwrite')
    const store = tx.objectStore(STORE_ITEMS)
    items.forEach((item) => store.delete(item.id))
    
    // Also clear pending queue for user
    const qStore = tx.objectStore(STORE_QUEUE)
    const qIndex = qStore.index('user_id')
    const qReq = qIndex.getAll(IDBKeyRange.only(userId))
    qReq.onsuccess = () => {
      ;(qReq.result || []).forEach((q) => qStore.delete(q.queue_id))
    }
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

// --- Sync Queue Helpers ---

export async function idbQueueAction(userId, action, data) {
  const db = await openDb()
  const entry = {
    user_id: userId,
    action, // 'upsert' | 'delete'
    data,
    created_at: new Date().toISOString()
  }
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite')
    tx.objectStore(STORE_QUEUE).add(entry)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function idbGetPendingQueue(userId) {
  const db = await openDb()
  const result = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readonly')
    const index = tx.objectStore(STORE_QUEUE).index('user_id')
    const req = index.getAll(IDBKeyRange.only(userId))
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return result
}

export async function idbRemoveQueueItem(queueId) {
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite')
    tx.objectStore(STORE_QUEUE).delete(queueId)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function idbClearQueue(userId) {
  const items = await idbGetPendingQueue(userId)
  if (!items.length) return
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite')
    const store = tx.objectStore(STORE_QUEUE)
    items.forEach((item) => store.delete(item.queue_id))
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}
