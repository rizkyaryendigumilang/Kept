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
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

export default function AlertsPanel({ alerts = [], onClose, onOpenItem, lang = 'id' }) {
  // Navigation tabs: 'alerts' | 'activity' | 'devices'
  const [activeTab, setActiveTab] = useState('alerts')
  const [filter, setFilter] = useState('all')

  const t = (k) => getTranslation(k, lang)

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
        score -= 6
      }
    })

    score = Math.max(0, Math.min(100, score))

    return {
      score,
      reusedCount,
      weakCount,
      cardCount
    }
  }, [alerts])

  const healthStatus = useMemo(() => {
    if (healthStats.score >= 85) {
      return {
        label: lang === 'id' ? 'Sangat Aman' : 'Very Secure',
        color: '#10b981',
        tone: 'good'
      }
    }
    if (healthStats.score >= 60) {
      return {
        label: lang === 'id' ? 'Cukup Aman' : 'Fair',
        color: '#f59e0b',
        tone: 'warning'
      }
    }
    return {
      label: lang === 'id' ? 'Berisiko' : 'At Risk',
      color: '#ef4444',
      tone: 'danger'
    }
  }, [healthStats.score, lang])

  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return alerts
    return alerts.filter((a) => a.level === filter)
  }, [alerts, filter])

  function handleRevokeDevice(deviceId) {
    haptic('medium')
    revokeTrustedDevice(deviceId)
    setDevices(getTrustedDevices())
    setRevokedToast(lang === 'id' ? 'Sesi perangkat berhasil dicabut.' : 'Device session revoked.')
    setTimeout(() => setRevokedToast(''), 2500)
  }

  function handleConfirmRemoveDevice() {
    if (!deviceToDelete) return
    haptic('medium')
    removeTrustedDevice(deviceToDelete.id)
    setDevices(getTrustedDevices())
    setDeviceToDelete(null)
    setRevokedToast(lang === 'id' ? 'Perangkat dihapus dari daftar tepercaya.' : 'Device removed from trusted list.')
    setTimeout(() => setRevokedToast(''), 2500)
  }

  function formatLogTime(isoString) {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
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
            <div className="eyebrow">{t('alerts_title')}</div>
            <h3>{t('alerts_sub')}</h3>
          </div>
          <button
            className="icon-button"
            onClick={() => {
              haptic('light')
              onClose()
            }}
            aria-label={t('action_close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* 3 Main Mode Tabs */}
        <div className="alerts-main-tabs">
          <button
            type="button"
            className={`main-tab-item ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => {
              haptic('light')
              setActiveTab('alerts')
            }}
          >
            <ShieldCheck size={15} />
            <span>{t('tab_health')} ({alerts.length})</span>
          </button>
          <button
            type="button"
            className={`main-tab-item ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => {
              haptic('light')
              setActiveTab('activity')
            }}
          >
            <History size={15} />
            <span>{t('tab_activity')}</span>
          </button>
          <button
            type="button"
            className={`main-tab-item ${activeTab === 'devices' ? 'active' : ''}`}
            onClick={() => {
              haptic('light')
              setActiveTab('devices')
            }}
          >
            <Smartphone size={15} />
            <span>{t('tab_devices')} ({devices.length})</span>
          </button>
        </div>

        {revokedToast && (
          <div className="revoked-toast-banner">
            <Check size={14} />
            <span>{revokedToast}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: KESEHATAN VAULT (ALERTS & AUDIT KEAMANAN) */}
        {/* ======================================================== */}
        {activeTab === 'alerts' && (
          <div className="tab-content-area">
            {/* Health Score Summary Card */}
            <div className="health-score-card">
              <div className="health-score-header">
                <div className="health-number-wrap">
                  <span className="health-score-num" style={{ color: healthStatus.color }}>
                    {healthStats.score}
                  </span>
                  <span className="health-score-total">/100</span>
                </div>
                <div className="health-text-wrap">
                  <div className={`health-status-badge tone-${healthStatus.tone}`}>
                    {healthStatus.label}
                  </div>
                  <p className="health-desc">
                    {healthStats.score >= 85
                      ? lang === 'id'
                        ? 'Sebagian besar kredensial Anda aman dan terlindungi dengan baik.'
                        : 'Most of your credentials are secure and well protected.'
                      : healthStats.score >= 60
                      ? lang === 'id'
                        ? 'Ditemukan beberapa kredensial yang lemah atau berulang.'
                        : 'Some credentials were found to be weak or reused.'
                      : lang === 'id'
                      ? 'Segera perbarui password duplikat dan lemah untuk mencegah kebocoran.'
                      : 'Please update duplicate and weak passwords promptly.'}
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
                  <span>{healthStats.weakCount} {lang === 'id' ? 'Lemah' : 'Weak'}</span>
                </div>
                <div className="metric-pill">
                  <Lock size={13} />
                  <span>{healthStats.reusedCount} {lang === 'id' ? 'Duplikat' : 'Reused'}</span>
                </div>
                <div className="metric-pill">
                  <CreditCard size={13} />
                  <span>{healthStats.cardCount} {lang === 'id' ? 'Kartu Exp' : 'Expired'}</span>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            {alerts.length > 0 && (
              <div className="alerts-filter-row">
                <button
                  className={`filter pill-button ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    haptic('light')
                    setFilter('all')
                  }}
                >
                  {t('filter_all')} ({alerts.length})
                </button>
                <button
                  className={`filter pill-button ${filter === 'danger' ? 'active' : ''}`}
                  onClick={() => {
                    haptic('light')
                    setFilter('danger')
                  }}
                >
                  {lang === 'id' ? 'Kritis' : 'Critical'} ({alerts.filter((a) => a.level === 'danger').length})
                </button>
                <button
                  className={`filter pill-button ${filter === 'warning' ? 'active' : ''}`}
                  onClick={() => {
                    haptic('light')
                    setFilter('warning')
                  }}
                >
                  {lang === 'id' ? 'Peringatan' : 'Warning'} ({alerts.filter((a) => a.level === 'warning').length})
                </button>
              </div>
            )}

            {/* Alerts List */}
            <div className="alerts-scroll-area">
              {filteredAlerts.length === 0 ? (
                <div className="empty-state large" style={{ minHeight: '160px' }}>
                  <ShieldCheck size={28} />
                  <strong>{lang === 'id' ? 'Semua Aman!' : 'All Secure!'}</strong>
                  <span>{lang === 'id' ? 'Tidak ada peringatan keamanan yang membutuhkan tindakan saat ini.' : 'No security warnings require action right now.'}</span>
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
                            {alert.level === 'danger' ? (lang === 'id' ? 'KRITIS' : 'CRITICAL') : (lang === 'id' ? 'PERINGATAN' : 'WARNING')}
                          </span>
                        </div>
                        <p className="alert-body-text">{alert.body}</p>
                        {alert.item && onOpenItem && (
                          <button
                            className="alert-action-btn pill-button"
                            onClick={() => {
                              haptic('medium')
                              onClose()
                              onOpenItem(alert.item)
                            }}
                          >
                            <span>{lang === 'id' ? 'Perbaiki Sekarang' : 'Fix Now'}</span>
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
              {lang === 'id'
                ? 'Log aktivitas sensitif dievaluasi secara lokal: riwayat buka vault, perubahan PIN, penambahan akun, dan ekspor.'
                : 'Sensitive activity log evaluated locally: unlock events, PIN updates, account additions, and exports.'}
            </p>

            <div className="alerts-scroll-area activity-scroll-area">
              {activityLogs.length === 0 ? (
                <div className="empty-state large" style={{ minHeight: '160px' }}>
                  <History size={28} />
                  <strong>{lang === 'id' ? 'Belum Ada Aktivitas' : 'No Activity Yet'}</strong>
                  <span>{lang === 'id' ? 'Catatan aktivitas keamanan akan muncul di sini.' : 'Security activity records will appear here.'}</span>
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
                          <span className="activity-log-device">{lang === 'id' ? 'Perangkat' : 'Device'}: {log.device}</span>
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
              {lang === 'id'
                ? 'Kelola perangkat yang memiliki izin membuka vault. Cabut sesi yang tidak lagi Anda kenali.'
                : 'Manage devices authorized to open your vault. Revoke any sessions you no longer recognize.'}
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
                            <span className="current-badge-pill">● {lang === 'id' ? 'Sesi Aktif Saat Ini' : 'Current Active Session'}</span>
                          )}
                          {isRevoked && (
                            <span className="revoked-badge-pill">{lang === 'id' ? 'Dicabut' : 'Revoked'}</span>
                          )}
                        </div>
                        <span className="device-meta-sub">
                          {device.os} · {device.browser} · {lang === 'id' ? 'Aktif' : 'Active'}: {formatLogTime(device.lastActive)}
                        </span>

                        <div className="device-actions-row mt-xs">
                          {!device.isCurrent && !isRevoked && (
                            <button
                              type="button"
                              className="secondary-button pill-button btn-xs"
                              onClick={() => handleRevokeDevice(device.id)}
                            >
                              {lang === 'id' ? 'Cabut Sesi' : 'Revoke Session'}
                            </button>
                          )}
                          {!device.isCurrent && (
                            <button
                              type="button"
                              className="danger-button pill-button btn-xs"
                              onClick={() => {
                                haptic('light')
                                setDeviceToDelete(device)
                              }}
                            >
                              <Trash2 size={12} /> {t('action_delete')}
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
          <span>
            {lang === 'id'
              ? 'Audit & log keamanan dienkripsi dan diproses secara zero-knowledge di perangkat Anda.'
              : 'Security audit & activity logs are processed zero-knowledge on your device.'}
          </span>
        </div>

        {deviceToDelete && (
          <ConfirmToast
            message={
              lang === 'id'
                ? `Hapus "${deviceToDelete.name}" dari daftar perangkat tepercaya?`
                : `Remove "${deviceToDelete.name}" from trusted devices?`
            }
            confirmLabel={t('action_delete')}
            cancelLabel={t('action_cancel')}
            onConfirm={handleConfirmRemoveDevice}
            onCancel={() => setDeviceToDelete(null)}
          />
        )}
      </aside>
    </div>
  )
}
