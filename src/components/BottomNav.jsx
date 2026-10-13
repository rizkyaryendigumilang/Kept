import { Home, KeyRound, WalletCards, FileText, Menu, X, ArrowLeft } from './Icons'
import AnimatedHamburger from './AnimatedHamburger'
import { haptic } from '../lib/haptics'
import { getTranslation } from '../lib/i18n'

export default function BottomNav({
  active,
  onChange,
  menuOpen = false,
  isSubpage = false,
  hamburgerStyle = 'squash',
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)

  const items = [
    { id: 'home', label: t('nav_home'), icon: Home },
    { id: 'vault', label: t('nav_password'), icon: KeyRound },
    { id: 'documents', label: t('nav_document'), icon: FileText },
    { id: 'banking', label: t('nav_account'), icon: WalletCards },
    { id: 'settings', label: t('nav_menu'), icon: Menu }
  ]

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map(({ id, label, icon: Icon }) => {
        const isSettings = id === 'settings'
        const isActive = isSettings ? menuOpen : active === id && !menuOpen
        const DynamicIcon = isSettings && isSubpage ? ArrowLeft : Icon
        const dynamicLabel = isSettings && isSubpage ? t('nav_back') : label
        return (
          <button
            key={id}
            className={`nav-item ${isActive ? 'active' : ''} ${isSettings ? 'nav-item-settings' : ''}`}
            onClick={() => {
              haptic('light')
              onChange(id)
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className={`nav-icon-wrap ${isSettings && menuOpen ? 'settings-open' : ''}`}>
              {isSettings && !isSubpage ? (
                <AnimatedHamburger
                  toggled={menuOpen}
                  style={hamburgerStyle}
                  size={16}
                  duration={0.3}
                  rounded
                />
              ) : (
                <DynamicIcon size={20} strokeWidth={isActive ? 2.2 : 1.7} />
              )}
            </div>
            <span className="nav-label">{dynamicLabel}</span>
          </button>
        )
      })}
    </nav>
  )
}
