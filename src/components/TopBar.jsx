import { Bell, Home, KeyRound, WalletCards, FileText, Menu, X, ArrowLeft } from './Icons'
import AnimatedHamburger from './AnimatedHamburger'

export default function TopBar({
  user,
  profile,
  unread,
  isOnline,
  pendingSyncCount,
  menuOpen = false,
  isSubpage = false,
  hamburgerStyle = 'squash',
  onAlerts,
  onOpenMenu,
  onSettings,
  currentRoute,
  onNavigate
}) {
  const handleMenuClick = onOpenMenu || onSettings

  const navLinks = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'vault', label: 'Password', icon: KeyRound },
    { id: 'documents', label: 'Document', icon: FileText },
    { id: 'banking', label: 'Account', icon: WalletCards }
  ]

  return (
    <header className="topbar">
      <button
        type="button"
        className="brand-lockup brand-button"
        onClick={() => onNavigate && onNavigate('home')}
        title="Kembali ke Overview"
        aria-label="Kembali ke Overview"
      >
        <img src="/brand/kept-icon.png" alt="Kept" className="kept-topbar-icon" />
        <div className="brand-text">
          <div className="brand-name">Kept</div>
          <div className="brand-caption">
            <span>Private Vault</span>
          </div>
        </div>
      </button>

      {/* Desktop Navigation Links */}
      <nav className="desktop-nav" aria-label="Desktop navigation">
        {navLinks.map(({ id, label, icon: Icon }) => {
          const isActive = currentRoute === id
          return (
            <button
              key={id}
              className={`desktop-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(id)}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="top-actions">
        <button className="icon-button notification-button" onClick={onAlerts} aria-label="Notifications">
          <Bell size={18} strokeWidth={1.8} />
          {unread > 0 && <span className="notification-badge">{unread}</span>}
        </button>

        <button
          className={`icon-button hamburger-button ${menuOpen ? 'open' : ''} ${isSubpage ? 'in-subpage' : ''}`}
          onClick={handleMenuClick}
          aria-label={isSubpage ? 'Kembali ke Menu' : menuOpen ? 'Tutup Menu' : 'Menu & Pengaturan'}
          title={isSubpage ? 'Kembali ke Menu' : menuOpen ? 'Tutup Menu' : 'Menu & Pengaturan'}
        >
          {isSubpage ? (
            <div className="hamburger-icon-wrapper" key="back">
              <ArrowLeft size={19} strokeWidth={2.2} className="hamburger-icon-symbol" />
            </div>
          ) : (
            <AnimatedHamburger
              toggled={menuOpen}
              style={hamburgerStyle}
              size={18}
              duration={0.35}
              rounded
            />
          )}
        </button>
      </div>
    </header>
  )
}
