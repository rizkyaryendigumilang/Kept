import { Download, Upload } from '../Icons'
import { getTranslation } from '../../lib/i18n'

export default function BackupSubpage({
  items = [],
  documents = [],
  onExport,
  onImport,
  onClose,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)

  return (
    <div className="drawer-subpage-view">
      <p className="subpage-lead-desc">
        {t('backup_lead')}
      </p>

      {/* Backup Status */}
      <div className="subpage-card">
        <div className="subpage-card-heading">
          <strong>{t('backup_status_title')}</strong>
          <span>{t('backup_status_desc')}</span>
        </div>

        <div className="stat-cards-grid">
          <div className="stat-mini-card">
            <span className="stat-mini-num">{items.length}</span>
            <span className="stat-mini-label">{t('backup_vault_creds')}</span>
          </div>
          <div className="stat-mini-card">
            <span className="stat-mini-num">{documents.length}</span>
            <span className="stat-mini-label">{t('backup_stored_docs')}</span>
          </div>
        </div>
      </div>

      {/* Export Backup Card */}
      <div className="subpage-card">
        <div className="subpage-card-heading">
          <strong>{t('backup_export_card_title')}</strong>
          <span>{t('backup_export_card_desc')}</span>
        </div>

        <button
          type="button"
          className="primary-button pill-button"
          onClick={() => {
            onClose?.()
            onExport?.()
          }}
        >
          <Download size={14} /> {t('backup_export_btn')}
        </button>
      </div>

      {/* Restore */}
      <div className="subpage-card">
        <div className="subpage-card-heading">
          <strong>{t('backup_restore_title')}</strong>
          <span>{t('backup_restore_desc')}</span>
        </div>

        <button
          type="button"
          className="secondary-button pill-button"
          onClick={() => {
            onClose?.()
            onImport?.()
          }}
        >
          <Upload size={14} /> {t('backup_restore_btn')}
        </button>
      </div>
    </div>
  )
}
