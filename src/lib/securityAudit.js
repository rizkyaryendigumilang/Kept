// Zero-Knowledge Security Audit & Activity Logging
// Tracks login history, PIN modifications, sensitive activities, and trusted devices locally.

const WEAK_PIN_PATTERNS = [
  '000000', '111111', '222222', '333333', '444444',
  '555555', '666666', '777777', '888888', '999999',
  '123456', '654321', '012345', '543210', '234567',
  '765432', '345678', '876543', '456789', '987654',
  '121212', '123123', '112233', '010101', '696969'
]

export function isWeakPin(pin) {
  if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    return { isWeak: true, reason: 'PIN harus terdiri dari tepat 6 digit angka.' }
  }

  if (WEAK_PIN_PATTERNS.includes(pin)) {
    return {
      isWeak: true,
      reason: 'PIN terlalu mudah ditebak. Hindari kombinasi berurutan atau berulang (cth: 123456, 111111).'
    }
  }

  // Check repeating digits
  if (/^(\d)\1{5}$/.test(pin)) {
    return { isWeak: true, reason: 'PIN tidak boleh terdiri dari 6 angka yang sama.' }
  }

  // Check incremental sequence
  let isAscending = true
  let isDescending = true
  for (let i = 0; i < 5; i += 1) {
    const curr = parseInt(pin[i], 10)
    const next = parseInt(pin[i + 1], 10)
    if (next !== curr + 1) isAscending = false
    if (next !== curr - 1) isDescending = false
  }
  if (isAscending || isDescending) {
    return { isWeak: true, reason: 'PIN tidak boleh berupa urutan angka berurutan.' }
  }

  return { isWeak: false, reason: '' }
}

export function detectDeviceInfo() {
  const userAgent = navigator.userAgent || ''
  let os = 'Unknown OS'
  let browser = 'Unknown Browser'

  if (/Windows/i.test(userAgent)) os = 'Windows PC'
  else if (/Macintosh|Mac OS/i.test(userAgent)) os = 'macOS Desktop'
  else if (/iPhone|iPad/i.test(userAgent)) os = 'Apple iOS'
  else if (/Android/i.test(userAgent)) os = 'Android Device'
  else if (/Linux/i.test(userAgent)) os = 'Linux'

  if (/Edg/i.test(userAgent)) browser = 'Microsoft Edge'
  else if (/Chrome/i.test(userAgent)) browser = 'Google Chrome'
  else if (/Safari/i.test(userAgent)) browser = 'Safari'
  else if (/Firefox/i.test(userAgent)) browser = 'Mozilla Firefox'

  return {
    os,
    browser,
    summary: `${os} · ${browser}`
  }
}

export function getOrCreateDeviceId() {
  let id = localStorage.getItem('kept_current_device_id')
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    localStorage.setItem('kept_current_device_id', id)
  }
  return id
}

export function getTrustedDevices() {
  try {
    const raw = localStorage.getItem('kept_trusted_devices')
    if (raw) return JSON.parse(raw)
  } catch {
    // fallback
  }

  // Default initial device
  const currentId = getOrCreateDeviceId()
  const info = detectDeviceInfo()
  const initial = [
    {
      id: currentId,
      name: `${info.summary} (Perangkat Ini)`,
      os: info.os,
      browser: info.browser,
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      isCurrent: true,
      status: 'active'
    }
  ]
  localStorage.setItem('kept_trusted_devices', JSON.stringify(initial))
  return initial
}

export function registerCurrentDevice() {
  const currentId = getOrCreateDeviceId()
  const info = detectDeviceInfo()
  const list = getTrustedDevices()

  const existingIdx = list.findIndex((d) => d.id === currentId)
  if (existingIdx >= 0) {
    list[existingIdx].lastActive = new Date().toISOString()
    list[existingIdx].isCurrent = true
    list[existingIdx].status = 'active'
  } else {
    list.unshift({
      id: currentId,
      name: `${info.summary} (Perangkat Ini)`,
      os: info.os,
      browser: info.browser,
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      isCurrent: true,
      status: 'active'
    })
  }

  // Ensure only current device has isCurrent: true
  list.forEach((d) => {
    if (d.id !== currentId) d.isCurrent = false
  })

  localStorage.setItem('kept_trusted_devices', JSON.stringify(list))
  return list
}

export function revokeTrustedDevice(deviceId) {
  const list = getTrustedDevices()
  const updated = list.map((d) => {
    if (d.id === deviceId) {
      return { ...d, status: 'revoked', revokedAt: new Date().toISOString() }
    }
    return d
  })
  localStorage.setItem('kept_trusted_devices', JSON.stringify(updated))
  return updated
}

export function removeTrustedDevice(deviceId) {
  const list = getTrustedDevices()
  const updated = list.filter((d) => d.id !== deviceId)
  localStorage.setItem('kept_trusted_devices', JSON.stringify(updated))
  return updated
}

export function getSecurityActivityLogs() {
  try {
    const raw = localStorage.getItem('kept_security_audit_logs')
    if (raw) return JSON.parse(raw)
  } catch {
    // fallback
  }

  const initial = [
    {
      id: 'log_' + Date.now(),
      type: 'security_setup',
      title: 'Kept Vault Diinisialisasi',
      desc: 'Inisialisasi enkripsi zero-knowledge dengan AES-256 dan Argon2id.',
      timestamp: new Date().toISOString(),
      level: 'success',
      device: detectDeviceInfo().summary
    }
  ]
  localStorage.setItem('kept_security_audit_logs', JSON.stringify(initial))
  return initial
}

export function recordSecurityActivity({
  type,
  title,
  desc,
  level = 'info' // 'info' | 'success' | 'warning' | 'danger'
}) {
  const logs = getSecurityActivityLogs()
  const newEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    type,
    title,
    desc,
    timestamp: new Date().toISOString(),
    level,
    device: detectDeviceInfo().summary
  }

  // Keep most recent 60 events
  const updated = [newEntry, ...logs].slice(0, 60)
  localStorage.setItem('kept_security_audit_logs', JSON.stringify(updated))

  // Dispatch custom storage event for live UI reactivity
  try {
    window.dispatchEvent(new Event('kept_security_audit_updated'))
  } catch {
    // ignore
  }

  return newEntry
}
