import { ChevronRight, CreditCard, KeyRound } from '../components/Icons'
import SiteLogo from '../components/SiteLogo'
import StatCard from '../components/StatCard'

export default function HomePage({ displayName, stats, favorites, recent, onNavigate, onOpenItem, onAdd }) {
  return (
    <div className="page-shell">
      <section className="hero-row">
        <div>
          <div className="eyebrow">Overview</div>
          <h1>Good evening, {displayName || 'there'}.</h1>
          <p>Your private space is ready.</p>
        </div>
        <button className="quick-add" onClick={onAdd}><span>+</span> Add</button>
      </section>

      <section className="stats-grid three">
        <StatCard label="Passwords" value={stats.passwords} hint="Social, web & project" onClick={() => onNavigate('vault')} />
        <StatCard label="Dokumen" value={stats.documents || 0} hint="KTP, SIM, Paspor & KK" onClick={() => onNavigate('documents')} />
        <StatCard label="Account" value={stats.banks} hint="Cards & account details" onClick={() => onNavigate('banking')} />
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Favorites</h2></div></div>
        {favorites.length === 0 ? <EmptyState text="Star your most used items to see them here." /> : <ItemRail items={favorites} onOpenItem={onOpenItem} />}
      </section>

      <section className="section-block compact-section">
        <div className="section-heading"><div><h2>Recently used</h2></div></div>
        {recent.length === 0 ? <EmptyState text="Recently opened items will appear here." /> : <ItemRail items={recent} onOpenItem={onOpenItem} />}
      </section>
    </div>
  )
}

function ItemRail({ items, onOpenItem }) {
  return <div className="item-rail">{items.slice(0, 4).map((item) => <button className="rail-card" key={item.id} onClick={() => onOpenItem(item)}><div className="item-icon tone-neutral">{item.item_type === 'bank_card' ? <CreditCard size={17} /> : item.url ? <SiteLogo url={item.url} name={item.name} size={20} radius={6} /> : <KeyRound size={17} />}</div><div><strong>{item.name}</strong><span>{item.categoryLabel}</span></div><ChevronRight size={15} /></button>)}</div>
}

function EmptyState({ text }) { return <div className="empty-state"><span>{text}</span></div> }
