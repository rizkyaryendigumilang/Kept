import { Home, KeyRound, WalletCards } from './Icons'

const items = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'vault', label: 'Vault', icon: KeyRound },
  { id: 'banking', label: 'Banking', icon: WalletCards }
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map(({ id, label, icon: Icon }) => (
        <button key={id} className={active === id ? 'nav-item active' : 'nav-item'} onClick={() => onChange(id)}>
          <Icon size={18} strokeWidth={active === id ? 2.2 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
