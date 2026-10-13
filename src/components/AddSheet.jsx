import { CreditCard, FolderLock, Globe, Instagram, KeyRound, Plus, StickyNote, X, FileText } from './Icons'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

export default function AddSheet({ onClose, onChoose, lang = 'id' }) {
  const t = (k) => getTranslation(k, lang)

  const choices = [
    { id: 'document', label: t('choice_document'), icon: FileText, helper: t('choice_document_helper') },
    { id: 'bank-card', label: t('choice_card'), icon: CreditCard, helper: t('choice_card_helper') },
    { id: 'password-social', label: t('choice_social'), icon: Instagram, helper: t('choice_social_helper') },
    { id: 'password-web', label: t('choice_web'), icon: Globe, helper: t('choice_web_helper') },
    { id: 'password-project', label: t('choice_project'), icon: FolderLock, helper: t('choice_project_helper') },
    { id: 'secure-note', label: t('choice_note'), icon: StickyNote, helper: t('choice_note_helper') }
  ]

  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section className="bottom-sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-handle"></div>
        <div className="sheet-header">
          <div>
            <div className="eyebrow">{t('create_eyebrow')}</div>
            <h3>{t('create_heading')}</h3>
          </div>
          <button
            className="icon-button"
            onClick={() => {
              haptic('light')
              onClose()
            }}
          >
            <X size={19} />
          </button>
        </div>
        <div className="choice-grid">
          {choices.map(({ id, label, icon: Icon, helper }) => (
            <button
              key={id}
              className="choice-card"
              onClick={() => {
                haptic('medium')
                onChoose(id)
              }}
            >
              <div className="choice-icon"><Icon size={19} /></div>
              <div><strong>{label}</strong><span>{helper}</span></div>
              <Plus size={16} />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
