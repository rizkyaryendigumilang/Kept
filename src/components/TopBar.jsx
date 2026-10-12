import { Bell, ChevronRight } from './Icons'

export default function TopBar({ user, profile, unread, onAlerts, onSettings }) {
  const initials = (profile?.display_name || user?.email || 'V').slice(0, 1).toUpperCase()
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark">V</div>
        <div>
          <div className="brand-name">Vault</div>
          <div className="brand-caption">Personal space</div>
        </div>
      </div>
      <div className="top-actions">
        <button className="icon-button notification-button" onClick={onAlerts} aria-label="Notifications">
          <Bell size={19} strokeWidth={1.8} />
          {unread > 0 && <span className="notification-badge">{unread}</span>}
        </button>
        <button className="avatar-button" onClick={onSettings} aria-label="Open settings">
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" /> : <span>{initials}</span>}
          <ChevronRight size={14} />
        </button>
      </div>
    </header>
  )
}
