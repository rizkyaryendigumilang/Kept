import { Download, Upload } from '../Icons'
import { getTranslation } from '../../lib/i18n'

export default function StorageSubpage({
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
        {t('storage_lead')}
      </p>

      {/* Storage Capacity */}
      <div className="subpage-card">
        <div className="subpage-card-heading">
          <strong>{t('storage_capacity_title')}</strong>
          <span>{t('storage_capacity_desc')}</span>
        </div>

        <div className="storage-meter-box">
          <div className="storage-meter-bar">
            <div className="storage-meter-fill" style={{ width: '28%' }} />
          </div>
          <div className="storage-meta-row">
            <span>{t('storage_db_active')}</span>
            <span>{t('storage_total_entries')} {items.length + documents.length}</span>
          </div>
        </div>
      </div>

      {/* Export & Import */}
      <div className="subpage-card">
        <div className="subpage-card-heading">
          <strong>{t('storage_export_import_title')}</strong>
          <span>{t('storage_export_import_desc')}</span>
        </div>

        <div className="button-col-stack">
          <button
            type="button"
            className="secondary-button pill-button"
            onClick={onExport}
          >
            <Download size={14} /> {t('storage_export_btn')}
          </button>

          <button
            type="button"
            className="secondary-button pill-button"
            onClick={() => {
              onClose?.()
              onImport?.()
            }}
          >
            <Upload size={14} /> {t('storage_import_btn')}
          </button>
        </div>
      </div>
    </div>
  )
}
