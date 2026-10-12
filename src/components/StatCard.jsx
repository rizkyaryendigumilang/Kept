export default function StatCard({ label, value, hint, onClick }) {
  return (
    <button className="stat-card" onClick={onClick}>
      <div className="eyebrow">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-hint">{hint}</div>
    </button>
  )
}
