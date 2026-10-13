import { Bell, Home, KeyRound, WalletCards, FileText, Menu, X, ArrowLeft, Search } from './Icons'
import AnimatedHamburger from './AnimatedHamburger'
import { haptic } from '../lib/haptics'
import { getTranslation } from '../lib/i18n'

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
  onNavigate,
  onOpenSearch,
  lang = 'id'
}) {
  const handleMenuClick = onOpenMenu || onSettings
  const t = (k) => getTranslation(k, lang)

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent)

  const navLinks = [
    { id: 'home', label: t('nav_home'), icon: Home },
    { id: 'vault', label: t('nav_password'), icon: KeyRound },
    { id: 'documents', label: t('nav_document'), icon: FileText },
    { id: 'banking', label: t('nav_account'), icon: WalletCards }
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
              onClick={() => {
                haptic('light')
                onNavigate(id)
              }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="top-actions">
        {onOpenSearch && (
          <button
            type="button"
            className="topbar-search-trigger"
            onClick={() => {
              haptic('light')
              onOpenSearch()
            }}
            title={`${t('search_prompt')} (${isMac ? '⌘K' : 'Ctrl+K'})`}
            aria-label={t('search_prompt')}
          >
            <Search size={14} />
            <span className="topbar-search-text">{t('search_prompt')}</span>
            <span className="topbar-search-shortcut">{isMac ? '⌘K' : 'Ctrl+K'}</span>
          </button>
        )}

        <button
          className="icon-button notification-button"
          onClick={() => {
            haptic('light')
            onAlerts()
          }}
          aria-label={t('notifications')}
        >
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
