export default function StatCard({ label, value, hint, icon: Icon, onClick }) {
  return (
    <button className="stat-card bento-stat-card" onClick={onClick} type="button">
      <div className="bento-stat-header">
        <span className="eyebrow">{label}</span>
        {Icon && (
          <div className="bento-stat-icon-wrap" aria-hidden="true">
            <Icon size={14} />
          </div>
        )}
      </div>
      <div className="stat-value bento-stat-value">{value}</div>
      <div className="stat-hint bento-stat-hint">{hint}</div>
    </button>
  )
}

