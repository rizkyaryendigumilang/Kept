import { AlertTriangle, Bell, ShieldCheck, X } from '../components/Icons'

export default function AlertsPanel({ alerts, onClose }) {
  return <div className="popover-backdrop" onMouseDown={onClose}><aside className="alerts-panel" onMouseDown={(e) => e.stopPropagation()}><div className="panel-header"><div><div className="eyebrow">Notifications</div><h3>Stay ahead of security.</h3></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div>{alerts.length === 0 ? <div className="empty-state"><ShieldCheck size={18} /><span>All quiet. No urgent alerts.</span></div> : <div className="alerts-list">{alerts.map((alert) => <div className="alert-row" key={alert.id}><div className={`alert-icon ${alert.level}`}><AlertTriangle size={16} /></div><div><strong>{alert.title}</strong><span>{alert.body}</span></div></div>)}</div>}<div className="panel-footer"><Bell size={14} /> Alert preferences are managed in Settings.</div></aside></div>
}
