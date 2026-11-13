import { Bell } from '../Icons'
import { getTranslation } from '../../lib/i18n'

export default function NotificationsSubpage({
  notifyPrefs = {},
  toggleNotifyPref,
  browserPermission,
  requestNotificationPermission,
  expiringDocs = [],
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)

  return (
    <div className="drawer-subpage-view">
      <p className="subpage-lead-desc">
        {t('notif_lead')}
      </p>

      {/* Expiry Reminders Config */}
      <div className="subpage-card">
        <div className="subpage-card-heading">
          <strong>{t('notif_expiry_title')}</strong>
          <span>{t('notif_expiry_desc')}</span>
        </div>

        <div className="toggle-list">
          <label className="toggle-row">
            <div>
              <strong>{t('notif_d90_label')}</strong>
              <span>{t('notif_d90_desc')}</span>
            </div>
            <input
              type="checkbox"
              checked={!!notifyPrefs.d90}
              onChange={() => toggleNotifyPref('d90')}
            />
          </label>

          <label className="toggle-row">
            <div>
              <strong>{t('notif_d30_label')}</strong>
              <span>{t('notif_d30_desc')}</span>
            </div>
            <input
              type="checkbox"
              checked={!!notifyPrefs.d30}
              onChange={() => toggleNotifyPref('d30')}
            />
          </label>

          <label className="toggle-row">
            <div>
              <strong>{t('notif_d7_label')}</strong>
              <span>{t('notif_d7_desc')}</span>
            </div>
            <input
              type="checkbox"
              checked={!!notifyPrefs.d7}
              onChange={() => toggleNotifyPref('d7')}
            />
          </label>

          <label className="toggle-row">
            <div>
              <strong>{t('notif_expired_label')}</strong>
              <span>{t('notif_expired_desc')}</span>
            </div>
            <input
              type="checkbox"
              checked={!!notifyPrefs.expired}
              onChange={() => toggleNotifyPref('expired')}
            />
          </label>
        </div>
      </div>

      {/* Browser Push Permission */}
      <div className="subpage-card">
        <div className="subpage-card-heading">
          <strong>{t('notif_browser_title')}</strong>
          <span>{t('notif_browser_desc')}</span>
        </div>

        <div className="notification-permission-box">
          <div className="permission-status">
            <span>
              {t('notif_status_label')}{' '}
              <strong>
                {browserPermission === 'granted'
                  ? t('notif_status_granted')
                  : browserPermission === 'denied'
                  ? t('notif_status_denied')
                  : t('notif_status_default')}
              </strong>
            </span>
          </div>

          {browserPermission !== 'granted' && (
            <button
              type="button"
              className="secondary-button pill-button"
              onClick={requestNotificationPermission}
            >
              <Bell size={14} /> {t('notif_req_btn')}
            </button>
          )}
        </div>
      </div>

      {/* Monitored Documents List */}
      <div className="subpage-card">
        <div className="subpage-card-heading">
          <strong>{t('notif_monitored_title')} ({expiringDocs.length})</strong>
          <span>{t('notif_monitored_desc')}</span>
        </div>

        {expiringDocs.length === 0 ? (
          <div className="field-hint">
            {t('notif_monitored_empty')}
          </div>
        ) : (
          <div className="monitored-docs-list">
            {expiringDocs.map((doc) => (
              <div key={doc.id} className="monitored-doc-row">
                <div>
                  <strong>{doc.name}</strong>
                  <span className="doc-owner-caption">
                    {doc.owner_name || (lang === 'id' ? 'Dokumen Resmi' : 'Official Document')} · {doc.expiry_date}
                  </span>
                </div>
                <span className={`doc-expiry-chip ${doc.audit?.status}`}>
                  {doc.audit?.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
