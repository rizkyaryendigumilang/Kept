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
 * @returns {string} Fully encoded URL string
 */
export function getHelpdeskHandoffUrl({ user, profile, role, fromUrl } = {}) {
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

  const params = new URLSearchParams({
    app: APP_SLUG,
    uid,
    name,
    role: effectiveRole,
    from_url: currentUrl,
    new: '1'
  })

  return `${HELPDESK_BASE}?${params.toString()}`
}

/**
 * Opens the new ticket form on the central VPS Helpdesk in a new tab.
 *
 * @param {Object} [options]
 * @returns {Window | null}
 */
export function openHelpdeskTicket(options = {}) {
  const url = getHelpdeskHandoffUrl(options)
  if (typeof window !== 'undefined') {
    return window.open(url, '_blank', 'noopener,noreferrer')
  }
  return null
}
