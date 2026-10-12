import { CreditCard, FolderLock, Globe, Instagram, KeyRound, Plus, StickyNote, X, FileText } from './Icons'

const choices = [
  { id: 'document', label: 'Dokumen Resmi', icon: FileText, helper: 'KTP, SIM, Paspor, Ijazah, BPJS, KK' },
  { id: 'bank-card', label: 'Account', icon: CreditCard, helper: 'Bank accounts and cards' },
  { id: 'password-social', label: 'Social Media', icon: Instagram, helper: 'Instagram, TikTok, LinkedIn' },
  { id: 'password-web', label: 'Web Password', icon: Globe, helper: 'Websites and apps' },
  { id: 'password-project', label: 'Project Password', icon: FolderLock, helper: 'Dev, cloud, project access' },
  { id: 'secure-note', label: 'Secure Note', icon: StickyNote, helper: 'Private text and references' }
]

export default function AddSheet({ onClose, onChoose }) {
  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <section className="bottom-sheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sheet-handle"></div>
        <div className="sheet-header">
          <div><div className="eyebrow">Create</div><h3>Add to your vault</h3></div>
          <button className="icon-button" onClick={onClose}><X size={19} /></button>
        </div>
        <div className="choice-grid">
          {choices.map(({ id, label, icon: Icon, helper }) => (
            <button key={id} className="choice-card" onClick={() => onChoose(id)}>
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
