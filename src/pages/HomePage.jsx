import { ChevronRight, CreditCard, KeyRound, FileText, AlertTriangle } from '../components/Icons'
import SiteLogo from '../components/SiteLogo'
import StatCard from '../components/StatCard'
import { haptic } from '../lib/haptics'
import { getTranslation } from '../lib/i18n'

export default function HomePage({
  displayName,
  stats,
  favorites = [],
  recent = [],
  expiryAlerts = [],
  onNavigate,
  onOpenItem,
  onAdd,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)

  // Dynamic time-based greeting
  const hour = new Date().getHours()
  const greeting =
    hour < 11
      ? t('greeting_morning')
      : hour < 17
        ? t('greeting_afternoon')
        : t('greeting_evening')

  return (
    <div className="page-shell">
      {/* Expiry Reminders Banner (Prominent on Home) */}
      {expiryAlerts.length > 0 && (
        <section className="expiry-reminder-container" aria-label={t('expiry_alert_title')}>
          <div className="expiry-reminder-header">
            <div className="expiry-reminder-title-wrap">
              <AlertTriangle size={17} />
              <strong>{t('expiry_alert_title')}</strong>
            </div>
            <span className="expiry-reminder-count">{expiryAlerts.length}</span>
          </div>

          <div className="expiry-reminder-list">
            {expiryAlerts.map((alert) => {
              const isExpired = alert.level === 'danger'
              const isCard = alert.type.startsWith('card')

              return (
                <button
                  key={alert.id}
                  type="button"
                  className="expiry-reminder-item"
                  onClick={() => {
                    haptic('medium')
                    if (onOpenItem && alert.item) onOpenItem(alert.item)
                  }}
                  title="Klik untuk melihat detail item"
                >
                  <div className="expiry-item-left">
                    <div className={`expiry-item-icon ${isExpired ? 'danger' : ''}`}>
                      {isCard ? <CreditCard size={15} /> : <FileText size={15} />}
                    </div>
                    <div className="expiry-item-text">
                      <strong>{alert.title}</strong>
                      <span>{alert.body}</span>
                    </div>
                  </div>

                  <span className={`expiry-badge ${isExpired ? 'danger' : 'warning'}`}>
                    {isExpired ? t('badge_expired') : t('badge_expiring_soon')}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Hero Overview */}
      <section className="hero-row">
        <div>
          <div className="eyebrow">{t('overview')}</div>
          <h1>{greeting}, {displayName || 'there'}.</h1>
          <p>{t('private_space_ready')}</p>
        </div>
        <button
          className="quick-add pill-button"
          onClick={() => {
            haptic('light')
            onAdd()
          }}
        >
          <span>+</span> {t('add_item')}
        </button>
      </section>

      {/* Stats Grid */}
      <section className="stats-grid three">
        <StatCard
          label={t('stat_passwords')}
          value={stats.passwords}
          hint={t('stat_passwords_hint')}
          onClick={() => {
            haptic('light')
            onNavigate('vault')
          }}
        />
        <StatCard
          label={t('stat_documents')}
          value={stats.documents || 0}
          hint={t('stat_documents_hint')}
          onClick={() => {
            haptic('light')
            onNavigate('documents')
          }}
        />
        <StatCard
          label={t('stat_accounts')}
          value={stats.banks}
          hint={t('stat_accounts_hint')}
          onClick={() => {
            haptic('light')
            onNavigate('banking')
          }}
        />
      </section>

      {/* Favorites Rail */}
      <section className="section-block">
        <div className="section-heading">
          <div><h2>{t('favorites')}</h2></div>
        </div>
        {favorites.length === 0 ? (
          <EmptyState text={t('favorites_empty')} />
        ) : (
          <ItemRail items={favorites} onOpenItem={onOpenItem} />
        )}
      </section>

      {/* Recently Used Rail */}
      <section className="section-block compact-section">
        <div className="section-heading">
          <div><h2>{t('recently_used')}</h2></div>
        </div>
        {recent.length === 0 ? (
          <EmptyState text={t('recent_empty')} />
        ) : (
          <ItemRail items={recent} onOpenItem={onOpenItem} />
        )}
      </section>
    </div>
  )
}

function ItemRail({ items, onOpenItem }) {
  return (
    <div className="item-rail">
      {items.slice(0, 4).map((item) => (
        <button
          className="rail-card"
          key={item.id}
          onClick={() => {
            haptic('medium')
            onOpenItem(item)
          }}
        >
          <div className="item-icon tone-neutral">
            {item.item_type === 'bank_card' ? (
              <CreditCard size={17} />
            ) : item.url ? (
              <SiteLogo url={item.url} name={item.name} size={20} radius={6} />
            ) : (
              <KeyRound size={17} />
            )}
          </div>
          <div>
            <strong>{item.name}</strong>
            <span>{item.categoryLabel}</span>
          </div>
          <ChevronRight size={15} />
        </button>
      ))}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <span>{text}</span>
    </div>
  )
}
