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
  Fingerprint,
  RefreshCw
} from '../components/Icons'
import {
  getSecurityActivityLogs,
  getTrustedDevices,
  revokeTrustedDevice,
  removeTrustedDevice,
  recordSecurityActivity
} from '../lib/securityAudit'
import { scanVaultPasswordBreaches, getLastBreachScan } from '../lib/pwned'
import ConfirmToast from '../components/ConfirmToast'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

export default function AlertsPanel({
  alerts = [],
  items = [],
  onClose,
  onOpenItem,
  onDismissAlert,
  onDismissAllAlerts,
  dismissedCount = 0,
  onResetDismissedAlerts,
  lang = 'id'
}) {
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

  // Breach Scan States
  const [scanBusy, setScanBusy] = useState(false)
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 })
  const [scanData, setScanData] = useState(() => getLastBreachScan())

  async function handleRunBreachScan() {
    if (scanBusy) return
    haptic('medium')
    setScanBusy(true)
    setScanProgress({ current: 0, total: items.length })
    try {
      const breachedList = await scanVaultPasswordBreaches(items, (current, total) => {
        setScanProgress({ current, total })
      })
      const newScan = {
        scannedAt: new Date().toISOString(),
        totalScanned: items.filter((i) => (i.item_type === 'password' || !i.item_type) && i.password).length,
        breachedCount: breachedList.length,
        breachedResults: breachedList
      }
      setScanData(newScan)

      if (breachedList.length > 0) {
        haptic('error')
        recordSecurityActivity({
          type: 'security_warning',
          title: 'Pemindaian Kebocoran Password',
          desc: `Ditemukan ${breachedList.length} password yang telah bocor dalam database publik.`,
          level: 'danger'
        })
      } else {
        haptic('success')
        recordSecurityActivity({
          type: 'security_audit',
          title: 'Pemindaian Kebocoran Selesai',
          desc: 'Seluruh password vault dinyatakan aman dari database kebocoran publik.',
          level: 'info'
        })
      }
    } catch {
      // ignore
    } finally {
      setScanBusy(false)
    }
  }

  // Calculate Health Score
  const healthStats = useMemo(() => {
    let score = 100
    let reusedCount = 0
    let weakCount = 0
    let cardCount = 0
    let expiryCount = 0

    alerts.forEach((alert) => {
      if (alert.type === 'reused_password') {
        reusedCount += 1
        score -= 15
      } else if (alert.type === 'weak_password') {
        weakCount += 1
        score -= 8
      } else if (alert.type === 'card_expired' || alert.type === 'doc_expired') {
        cardCount += 1
        expiryCount += 1
        score -= 12
      } else if (alert.type === 'card_expiring_soon' || alert.type === 'doc_expiring_soon') {
        cardCount += 1
        expiryCount += 1
        score -= 6
      }
    })

    if (scanData?.breachedCount > 0) {
      score -= scanData.breachedCount * 18
    }

    score = Math.max(0, Math.min(100, score))

    return {
      score,
      reusedCount,
      weakCount,
      cardCount,
      expiryCount,
      breachedCount: scanData?.breachedCount || 0
    }
  }, [alerts, scanData])

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
    if (filter === 'expiry') {
      return alerts.filter((a) => a.type.startsWith('card_') || a.type.startsWith('doc_'))
    }
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
            {/* Unified Compact Health & Security Hub */}
            <div className="health-score-card compact-health-card">
              <div className="health-compact-top-row">
                <div className="health-score-badge-inline">
                  <span className="health-score-val" style={{ color: healthStatus.color }}>
                    {healthStats.score}
                  </span>
                  <span className="health-score-denom">/100</span>
                  <span className={`health-status-chip tone-${healthStatus.tone}`}>
                    {healthStatus.label}
                  </span>
                </div>

                <div className="health-scanner-action-inline">
                  {scanBusy ? (
                    <span className="scanner-status-tag scanning">
                      <RefreshCw size={11} className="spin-slow" />
                      <span>{t('breach_scanning')} ({scanProgress.current}/{scanProgress.total})</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="scanner-micro-btn"
                      onClick={handleRunBreachScan}
                      title={t('breach_checker_desc')}
                    >
                      <ShieldCheck size={13} className={scanData?.breachedCount > 0 ? 'text-danger' : 'text-emerald'} />
                      <span>
                        {scanData
                          ? scanData.breachedCount === 0
                            ? (lang === 'id' ? '0 Kebocoran' : '0 Breaches')
                            : `${scanData.breachedCount} ` + (lang === 'id' ? 'Bocor' : 'Breached')
                          : t('breach_scan_btn')}
                      </span>
                      <RefreshCw size={10} className="opacity-70" />
                    </button>
                  )}
                </div>
              </div>

              {/* Slim Health Score Line */}
              <div className="health-progress-bar slim">
                <div
                  className="health-progress-fill"
                  style={{
                    width: `${healthStats.score}%`,
                    backgroundColor: healthStatus.color
                  }}
                />
              </div>

              {/* Compact Quick Metrics Row */}
              <div className="health-metrics-row compact">
                <div className="metric-pill micro">
                  <KeyRound size={11} />
                  <span>{healthStats.weakCount} {lang === 'id' ? 'Lemah' : 'Weak'}</span>
                </div>
                <div className="metric-pill micro">
                  <Lock size={11} />
                  <span>{healthStats.reusedCount} {lang === 'id' ? 'Duplikat' : 'Reused'}</span>
                </div>
                <div className="metric-pill micro">
                  <CreditCard size={11} />
                  <span>{healthStats.cardCount} {lang === 'id' ? 'Kartu' : 'Card'}</span>
                </div>
                {healthStats.expiryCount > 0 && (
                  <div className="metric-pill micro tone-warning">
                    <AlertTriangle size={11} />
                    <span>{healthStats.expiryCount} {t('filter_expiry')}</span>
                  </div>
                )}
                {healthStats.breachedCount > 0 && (
                  <div className="metric-pill micro tone-danger">
                    <ShieldAlert size={11} />
                    <span>{healthStats.breachedCount} {t('breach_metric_label')}</span>
                  </div>
                )}
              </div>

              {/* Breached items alert bar if any */}
              {scanData?.breachedCount > 0 && (
                <div className="scanner-breached-compact-box">
                  <div className="scanner-breached-compact-header">
                    <AlertTriangle size={12} className="text-danger" />
                    <strong>{scanData.breachedCount} {t('breach_found_title')}</strong>
                  </div>
                  <div className="scanner-breached-chips-row">
                    {scanData.breachedResults.map((b) => {
                      const matchedItem = items.find((i) => i.id === b.itemId)
                      return (
                        <button
                          key={b.itemId}
                          type="button"
                          className="scanner-breached-chip"
                          onClick={() => matchedItem && onOpenItem(matchedItem)}
                          title={lang === 'id' ? 'Buka item untuk mengganti password' : 'Open item to update password'}
                        >
                          <span className="scanner-chip-name">{b.itemName}</span>
                          <span className="scanner-chip-count">{b.count.toLocaleString()}x</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Tabs & Dismiss All */}
            {alerts.length > 0 && (
              <div className="alerts-filter-and-actions">
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
                  {healthStats.expiryCount > 0 && (
                    <button
                      className={`filter pill-button ${filter === 'expiry' ? 'active' : ''}`}
                      onClick={() => {
                        haptic('light')
                        setFilter('expiry')
                      }}
                    >
                      <AlertTriangle size={12} />
                      <span>{t('filter_expiry')} ({healthStats.expiryCount})</span>
                    </button>
                  )}
                </div>

                {onDismissAllAlerts && (
                  <button
                    type="button"
                    className="alerts-clear-all-btn"
                    onClick={() => {
                      haptic('medium')
                      onDismissAllAlerts()
                    }}
                    title={t('alerts_dismiss_all_confirm')}
                  >
                    <Trash2 size={12} />
                    <span>{t('alerts_dismiss_all')}</span>
                  </button>
                )}
              </div>
            )}

            {/* Alerts List */}
            <div className="alerts-scroll-area">
              {filteredAlerts.length === 0 ? (
                <div className="empty-state large" style={{ minHeight: '160px' }}>
                  <ShieldCheck size={28} />
                  <strong>
                    {dismissedCount > 0 && alerts.length === 0
                      ? t('alerts_all_cleared')
                      : (lang === 'id' ? 'Semua Aman!' : 'All Secure!')}
                  </strong>
                  <span>
                    {dismissedCount > 0 && alerts.length === 0
                      ? t('alerts_all_cleared_sub')
                      : (lang === 'id' ? 'Tidak ada peringatan keamanan yang membutuhkan tindakan saat ini.' : 'No security warnings require action right now.')}
                  </span>
                  {dismissedCount > 0 && onResetDismissedAlerts && (
                    <button
                      type="button"
                      className="secondary-button pill-button mt-xs"
                      onClick={() => {
                        haptic('light')
                        onResetDismissedAlerts()
                      }}
                      style={{ marginTop: '8px' }}
                    >
                      <RefreshCw size={13} />
                      <span>{t('alerts_restore_btn')} ({dismissedCount})</span>
                    </button>
                  )}
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
                          <div className="alert-title-left">
                            <strong>{alert.title}</strong>
                            <span className={`alert-level-badge ${alert.level}`}>
                              {alert.level === 'danger' ? (lang === 'id' ? 'KRITIS' : 'CRITICAL') : (lang === 'id' ? 'PERINGATAN' : 'WARNING')}
                            </span>
                          </div>
                          {onDismissAlert && (
                            <button
                              type="button"
                              className="alert-dismiss-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                haptic('light')
                                onDismissAlert(alert.id)
                              }}
                              title={t('alerts_dismiss_single')}
                              aria-label={t('alerts_dismiss_single')}
                            >
                              <X size={14} />
                            </button>
                          )}
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
