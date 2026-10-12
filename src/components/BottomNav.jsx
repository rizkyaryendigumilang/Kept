import { Home, KeyRound, WalletCards, FileText, Menu, X, ArrowLeft } from './Icons'
import AnimatedHamburger from './AnimatedHamburger'

const items = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'vault', label: 'Password', icon: KeyRound },
  { id: 'documents', label: 'Document', icon: FileText },
  { id: 'banking', label: 'Account', icon: WalletCards },
  { id: 'settings', label: 'Menu', icon: Menu }
]

export default function BottomNav({ active, onChange, menuOpen = false, isSubpage = false, hamburgerStyle = 'squash' }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map(({ id, label, icon: Icon }) => {
        const isSettings = id === 'settings'
        const isActive = isSettings ? menuOpen : active === id && !menuOpen
        const DynamicIcon = isSettings && isSubpage ? ArrowLeft : Icon
        const dynamicLabel = isSettings && isSubpage ? 'Kembali' : label
        return (
          <button
            key={id}
            className={`nav-item ${isActive ? 'active' : ''} ${isSettings ? 'nav-item-settings' : ''}`}
            onClick={() => onChange(id)}
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
