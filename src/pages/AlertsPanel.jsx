import { useState, useMemo, useEffect } from 'react'
import {
  AlertTriangle,
  Bell,
  ShieldCheck,
  X,
  ChevronRight,
  Lock,
  KeyRound,
  CreditCard,
  History,
  Smartphone,
  ShieldAlert,
  Download,
  Trash2,
  Check,
  Fingerprint
} from '../components/Icons'
import {
  getSecurityActivityLogs,
  getTrustedDevices,
  revokeTrustedDevice,
  removeTrustedDevice
} from '../lib/securityAudit'
import ConfirmToast from '../components/ConfirmToast'

export default function AlertsPanel({ alerts = [], onClose, onOpenItem }) {
  // Navigation tabs: 'alerts' | 'activity' | 'devices'
  const [activeTab, setActiveTab] = useState('alerts')
  const [filter, setFilter] = useState('all')

  // Live security audit logs & trusted devices
  const [activityLogs, setActivityLogs] = useState(() => getSecurityActivityLogs())
  const [devices, setDevices] = useState(() => getTrustedDevices())
  const [revokedToast, setRevokedToast] = useState('')
  const [deviceToDelete, setDeviceToDelete] = useState(null)

  useEffect(() => {
    const refreshData = () => {
      setActivityLogs(getSecurityActivityLogs())
      setDevices(getTrustedDevices())
    }

    window.addEventListener('kept_security_audit_updated', refreshData)
    window.addEventListener('storage', refreshData)
    return () => {
      window.removeEventListener('kept_security_audit_updated', refreshData)
      window.removeEventListener('storage', refreshData)
    }
  }, [])

  // Calculate Health Score
  const healthStats = useMemo(() => {
    let score = 100
    let reusedCount = 0
    let weakCount = 0
    let cardCount = 0

    alerts.forEach((alert) => {
      if (alert.type === 'reused_password') {
        reusedCount += 1
        score -= 15
      } else if (alert.type === 'weak_password') {
        weakCount += 1
        score -= 8
      } else if (alert.type === 'card_expired') {
        cardCount += 1
        score -= 12
      } else if (alert.type === 'card_expiring_soon') {
        cardCount += 1
        score -= 5
      }
    })

    score = Math.max(15, Math.min(100, score))
    return { score, reusedCount, weakCount, cardCount }
  }, [alerts])

  const filteredAlerts = useMemo(() => {
    if (filter === 'danger') return alerts.filter((a) => a.level === 'danger')
    if (filter === 'warning') return alerts.filter((a) => a.level === 'warning')
    return alerts
  }, [alerts, filter])

  const healthStatus = useMemo(() => {
    if (healthStats.score >= 85) return { label: 'Keamanan Kuat', color: 'var(--success)' }
    if (healthStats.score >= 60) return { label: 'Perlu Perhatian', color: '#d97706' }
    return { label: 'Rentan Risiko', color: 'var(--danger)' }
  }, [healthStats.score])

  function handleRevokeDevice(deviceId) {
    const updated = revokeTrustedDevice(deviceId)
    setDevices(updated)
    setRevokedToast('Sesi perangkat berhasil dicabut.')
    setTimeout(() => setRevokedToast(''), 2200)
  }

  function handleConfirmRemoveDevice() {
    if (!deviceToDelete) return
    const updated = removeTrustedDevice(deviceToDelete.id)
    setDevices(updated)
    setDeviceToDelete(null)
    setRevokedToast('Perangkat dihapus dari daftar tepercaya.')
    setTimeout(() => setRevokedToast(''), 2200)
  }

  function formatLogTime(isoString) {
    try {
      const d = new Date(isoString)
      const now = new Date()
      const diffMs = now - d
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Baru saja'
      if (diffMins < 60) return `${diffMins} mnt lalu`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours} jam lalu`
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  function getActivityIcon(type, level) {
    if (type === 'login_success') return <ShieldCheck size={16} />
    if (type === 'login_failed' || level === 'danger') return <ShieldAlert size={16} />
    if (type === 'pin_changed') return <KeyRound size={16} />
    if (type === 'account_added') return <CreditCard size={16} />
    if (type === 'export_sensitive') return <Download size={16} />
    if (type === 'device_added') return <Smartphone size={16} />
    return <Lock size={16} />
  }

  return (
    <div className="popover-backdrop" onMouseDown={onClose}>
      <aside className="alerts-panel enhanced-alerts" onMouseDown={(e) => e.stopPropagation()}>
        {/* Panel Header */}
        <div className="panel-header">
          <div>
            <div className="eyebrow">Pusat Keamanan & Peringatan</div>
            <h3>Pusat Keamanan Kept</h3>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* 3 Main Mode Tabs */}
        <div className="alerts-main-tabs">
          <button
            type="button"
            className={`main-tab-item ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <ShieldCheck size={15} />
            <span>Kesehatan ({alerts.length})</span>
          </button>
          <button
            type="button"
            className={`main-tab-item ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <History size={15} />
            <span>Riwayat Aktivitas</span>
          </button>
          <button
            type="button"
            className={`main-tab-item ${activeTab === 'devices' ? 'active' : ''}`}
            onClick={() => setActiveTab('devices')}
          >
            <Smartphone size={15} />
            <span>Perangkat ({devices.length})</span>
          </button>
        </div>

        {revokedToast && (
          <div className="alerts-micro-toast">
            <Check size={13} /> {revokedToast}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: KESEHATAN & PERINGATAN VAULT */}
        {/* ======================================================== */}
        {activeTab === 'alerts' && (
          <div className="tab-content-area">
            {/* Vault Health Score Card */}
            <div className="health-score-card">
              <div className="health-score-top">
                <div className="health-score-circle" style={{ borderColor: healthStatus.color }}>
                  <span className="health-number">{healthStats.score}</span>
                  <span className="health-pct">%</span>
                </div>
                <div className="health-score-info">
                  <div className="health-status-badge" style={{ color: healthStatus.color }}>
                    {healthStatus.label}
                  </div>
                  <p className="health-desc">
                    {healthStats.score >= 85
                      ? 'Sebagian besar kredensial Anda aman dan terlindungi dengan baik.'
                      : healthStats.score >= 60
                      ? 'Ditemukan beberapa kredensial yang lemah atau berulang.'
                      : 'Segera perbarui password duplikat dan lemah untuk mencegah kebocoran.'}
                  </p>
                </div>
              </div>

              <div className="health-progress-bar">
                <div
                  className="health-progress-fill"
                  style={{
                    width: `${healthStats.score}%`,
                    backgroundColor: healthStatus.color
                  }}
                />
              </div>

              {/* Quick Metrics */}
              <div className="health-metrics-row">
                <div className="metric-pill">
                  <KeyRound size={13} />
                  <span>{healthStats.weakCount} Lemah</span>
                </div>
                <div className="metric-pill">
                  <Lock size={13} />
                  <span>{healthStats.reusedCount} Duplikat</span>
                </div>
                <div className="metric-pill">
                  <CreditCard size={13} />
                  <span>{healthStats.cardCount} Kartu Exp</span>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            {alerts.length > 0 && (
              <div className="alerts-filter-row">
                <button
                  className={`filter pill-button ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  Semua ({alerts.length})
                </button>
                <button
                  className={`filter pill-button ${filter === 'danger' ? 'active' : ''}`}
                  onClick={() => setFilter('danger')}
                >
                  Kritis ({alerts.filter((a) => a.level === 'danger').length})
                </button>
                <button
                  className={`filter pill-button ${filter === 'warning' ? 'active' : ''}`}
                  onClick={() => setFilter('warning')}
                >
                  Peringatan ({alerts.filter((a) => a.level === 'warning').length})
                </button>
              </div>
            )}

            {/* Alerts List */}
            <div className="alerts-scroll-area">
              {filteredAlerts.length === 0 ? (
                <div className="empty-state large" style={{ minHeight: '160px' }}>
                  <ShieldCheck size={28} />
                  <strong>Semua Aman!</strong>
                  <span>Tidak ada peringatan keamanan yang membutuhkan tindakan saat ini.</span>
                </div>
              ) : (
                <div className="alerts-list">
                  {filteredAlerts.map((alert) => (
                    <div className={`alert-row enhanced-alert-row ${alert.level}`} key={alert.id}>
                      <div className={`alert-icon ${alert.level}`}>
                        <AlertTriangle size={18} />
                      </div>
                      <div className="alert-content">
                        <div className="alert-title-row">
                          <strong>{alert.title}</strong>
                          <span className={`alert-level-badge ${alert.level}`}>
                            {alert.level === 'danger' ? 'KRITIS' : 'PERINGATAN'}
                          </span>
                        </div>
                        <p className="alert-body-text">{alert.body}</p>
                        {alert.item && onOpenItem && (
                          <button
                            className="alert-action-btn pill-button"
                            onClick={() => {
                              onClose()
                              onOpenItem(alert.item)
                            }}
                          >
                            <span>Perbaiki Sekarang</span>
                            <ChevronRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: RIWAYAT AKTIVITAS & AUDIT SENSITIF */}
        {/* ======================================================== */}
        {activeTab === 'activity' && (
          <div className="tab-content-area">
            <p className="activity-tab-lead">
              Log aktivitas sensitif dievaluasi secara lokal: riwayat buka vault, perubahan PIN, penambahan akun, dan ekspor.
            </p>

            <div className="alerts-scroll-area activity-scroll-area">
              {activityLogs.length === 0 ? (
                <div className="empty-state large" style={{ minHeight: '160px' }}>
                  <History size={28} />
                  <strong>Belum Ada Aktivitas</strong>
                  <span>Catatan aktivitas keamanan akan muncul di sini.</span>
                </div>
              ) : (
                <div className="activity-timeline-list">
                  {activityLogs.map((log) => (
                    <div className={`activity-log-item tone-${log.level}`} key={log.id}>
                      <div className={`activity-log-icon tone-${log.level}`}>
                        {getActivityIcon(log.type, log.level)}
                      </div>
                      <div className="activity-log-details">
                        <div className="activity-log-header">
                          <strong className="activity-log-title">{log.title}</strong>
                          <span className="activity-log-time">{formatLogTime(log.timestamp)}</span>
                        </div>
                        <p className="activity-log-desc">{log.desc}</p>
                        {log.device && (
                          <span className="activity-log-device">Perangkat: {log.device}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PERANGKAT TEPERCAYA & SESI AKTIF */}
        {/* ======================================================== */}
        {activeTab === 'devices' && (
          <div className="tab-content-area">
            <p className="activity-tab-lead">
              Kelola perangkat yang memiliki izin membuka vault. Cabut sesi yang tidak lagi Anda kenali.
            </p>

            <div className="alerts-scroll-area devices-scroll-area">
              <div className="devices-list-stack">
                {devices.map((device) => {
                  const isRevoked = device.status === 'revoked'
                  return (
                    <div
                      key={device.id}
                      className={`device-entry-card ${device.isCurrent ? 'current-device' : ''} ${
                        isRevoked ? 'revoked-device' : ''
                      }`}
                    >
                      <div className="device-icon-wrap">
                        <Smartphone size={20} strokeWidth={1.8} />
                      </div>
                      <div className="device-info-wrap">
                        <div className="device-title-row">
                          <strong>{device.name}</strong>
                          {device.isCurrent && (
                            <span className="current-badge-pill">● Sesi Aktif Saat Ini</span>
                          )}
                          {isRevoked && (
                            <span className="revoked-badge-pill">Dicabut</span>
                          )}
                        </div>
                        <span className="device-meta-sub">
                          {device.os} · {device.browser} · Aktif: {formatLogTime(device.lastActive)}
                        </span>

                        <div className="device-actions-row mt-xs">
                          {!device.isCurrent && !isRevoked && (
                            <button
                              type="button"
                              className="secondary-button pill-button btn-xs"
                              onClick={() => handleRevokeDevice(device.id)}
                            >
                              Cabut Sesi
                            </button>
                          )}
                          {!device.isCurrent && (
                            <button
                              type="button"
                              className="danger-button pill-button btn-xs"
                              onClick={() => setDeviceToDelete(device)}
                            >
                              <Trash2 size={12} /> Hapus
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Panel Footer */}
        <div className="panel-footer">
          <Bell size={14} />
          <span>Audit & log keamanan dienkripsi dan diproses secara zero-knowledge di perangkat Anda.</span>
        </div>

        {deviceToDelete && (
          <ConfirmToast
            message={`Hapus "${deviceToDelete.name}" dari daftar perangkat tepercaya?`}
            confirmLabel="Hapus"
            cancelLabel="Batal"
            onConfirm={handleConfirmRemoveDevice}
            onCancel={() => setDeviceToDelete(null)}
          />
        )}
      </aside>
    </div>
  )
}
