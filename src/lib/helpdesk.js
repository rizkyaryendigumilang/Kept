/**
 * Kept SSO Handoff Helper to VPS Helpdesk
 * Base URL: https://43.156.236.102/helpdesk/handoff
 */

export const HELPDESK_BASE = 'https://43.156.236.102/helpdesk/handoff'
export const APP_SLUG = 'Kept'

/**
 * Returns a stable guest UID for unauthenticated / visitor sessions.
 */
export function getOrCreateGuestId() {
  if (typeof window === 'undefined') {
    return 'guest_server'
  }
  try {
    const key = 'kept_helpdesk_guest_uid'
    let id = window.sessionStorage?.getItem(key)
    if (!id) {
      id = 'guest_' + Math.random().toString(36).slice(2, 10)
      window.sessionStorage?.setItem(key, id)
    }
    return id
  } catch {
    return 'guest_' + Math.random().toString(36).slice(2, 10)
  }
}

/**
 * Constructs the SSO Handoff URL with query parameters.
 *
 * @param {Object} [options]
 * @param {Object} [options.user] - Supabase user object or session
 * @param {Object} [options.profile] - Kept user profile
 * @param {string} [options.role] - User role ('Member', 'Admin', 'Guest', etc.)
 * @param {string} [options.fromUrl] - Custom current URL override
 * @param {string} [options.complaint] - User issue / complaint text
 * @param {string} [options.photoUrl] - Optional URL for hosted photo
 * @returns {string} Fully encoded URL string
 */
export function getHelpdeskHandoffUrl({ user, profile, role, fromUrl, complaint, photoUrl } = {}) {
  const uidRaw = user?.id || user?.email || getOrCreateGuestId()
  const uid = String(uidRaw).slice(0, 200)

  const name =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Pengguna Kept')

  const effectiveRole =
    role ||
    profile?.role ||
    (user?.id ? 'Member' : 'Guest')

  const currentUrl =
    fromUrl ||
    (typeof window !== 'undefined' ? window.location.href : 'https://kept.app')

  const cleanComplaint = (complaint || '').trim()
  const firstLine = cleanComplaint ? cleanComplaint.split('\n')[0].slice(0, 70) : ''
  const subject = firstLine ? `[Kept] ${firstLine}` : 'Kendala Aplikasi Kept'

  const params = new URLSearchParams({
    app: APP_SLUG,
    uid,
    name,
    role: effectiveRole,
    from_url: currentUrl,
    new: '1'
  })

  if (cleanComplaint) {
    params.set('subject', subject)
    params.set('message', cleanComplaint)
    params.set('description', cleanComplaint)
    params.set('keluhan', cleanComplaint)
  }

  if (photoUrl) {
    params.set('photo_url', photoUrl)
  }

  return `${HELPDESK_BASE}?${params.toString()}`
}

/**
 * Submits the Helpdesk ticket with keluhan and optional photo attachment
 * directly to the central VPS Helpdesk in a new tab.
 * Uses a dual-dispatch pattern:
 * 1. Query parameters populated in action URL.
 * 2. Multipart form POST when running in browser with DOM (supports binary file upload without truncation).
 *
 * @param {Object} [options]
 * @param {Object} [options.user]
 * @param {Object} [options.profile]
 * @param {string} [options.role]
 * @param {string} [options.fromUrl]
 * @param {string} [options.complaint]
 * @param {File | Blob | null} [options.photoFile]
 * @returns {{ ok: boolean, url: string, hasPhoto: boolean }}
 */
export function submitHelpdeskTicket({ user, profile, role, fromUrl, complaint, photoFile } = {}) {
  const targetUrl = getHelpdeskHandoffUrl({ user, profile, role, fromUrl, complaint })
  const cleanComplaint = (complaint || '').trim()
  const firstLine = cleanComplaint ? cleanComplaint.split('\n')[0].slice(0, 70) : ''
  const subject = firstLine ? `[Kept] ${firstLine}` : 'Kendala Aplikasi Kept'

  const uidRaw = user?.id || user?.email || getOrCreateGuestId()
  const uid = String(uidRaw).slice(0, 200)

  const name =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Pengguna Kept')

  const effectiveRole =
    role ||
    profile?.role ||
    (user?.id ? 'Member' : 'Guest')

  const currentUrl =
    fromUrl ||
    (typeof window !== 'undefined' ? window.location.href : 'https://kept.app')

  // When DOM is available, construct a hidden form to transmit multipart data + POST body seamlessly
  if (typeof document !== 'undefined') {
    try {
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = targetUrl
      form.target = '_blank'
      form.enctype = 'multipart/form-data'
      form.style.display = 'none'

      const fields = {
        app: APP_SLUG,
        uid,
        name,
        role: effectiveRole,
        from_url: currentUrl,
        new: '1',
        subject,
        message: cleanComplaint,
        description: cleanComplaint,
        keluhan: cleanComplaint
      }

      for (const [key, val] of Object.entries(fields)) {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = val
        form.appendChild(input)
      }

      if (photoFile && typeof DataTransfer !== 'undefined') {
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.name = 'photo'
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(photoFile)
        fileInput.files = dataTransfer.files
        form.appendChild(fileInput)
      }

      document.body.appendChild(form)
      form.submit()
      setTimeout(() => {
        if (document.body.contains(form)) {
          document.body.removeChild(form)
        }
      }, 1000)

      return {
        ok: true,
        url: targetUrl,
        hasPhoto: Boolean(photoFile)
      }
    } catch (err) {
      console.warn('Form post fallback to window.open:', err)
    }
  }

  // Fallback to direct GET window.open
  if (typeof window !== 'undefined') {
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  return {
    ok: true,
    url: targetUrl,
    hasPhoto: Boolean(photoFile)
  }
}

/**
 * Opens the new ticket form on the central VPS Helpdesk in a new tab.
 *
 * @param {Object} [options]
 * @returns {Window | null | Object}
 */
export function openHelpdeskTicket(options = {}) {
  return submitHelpdeskTicket(options)
}
