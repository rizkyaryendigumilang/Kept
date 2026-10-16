import { useState } from 'react'
import Modal from './Modal'
import { FolderLock, KeyRound, Eye, EyeOff, Upload } from './Icons'
import { decryptCustomBackup } from '../lib/crypto'
import { TRANSLATIONS } from '../lib/i18n'

export default function ImportKeptModal({
  isOpen,
  onClose,
  fileEnvelope,
  onDecrypted,
  lang = 'id'
}) {
  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['id']?.[key] || key

  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !fileEnvelope) return null

  async function handleDecrypt(e) {
    if (e) e.preventDefault()
    if (!password) {
      setError(lang === 'id' ? 'Masukkan kata sandi cadangan.' : 'Please enter the backup password.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const items = await decryptCustomBackup(fileEnvelope, password)
      if (!Array.isArray(items)) {
        throw new Error(lang === 'id' ? 'Format data dalam file cadangan tidak valid.' : 'Invalid data format in backup file.')
      }
      onDecrypted(items)
      onClose()
    } catch (err) {
      setError(err.message || (lang === 'id' ? 'Kata sandi cadangan salah atau file rusak.' : 'Incorrect backup password or corrupted file.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={t('export_import_kept_modal_title')}
      eyebrow={t('backup_restore_title')}
      onClose={onClose}
    >
      <form onSubmit={handleDecrypt} className="import-kept-body">
        <div className="import-kept-icon-box">
          <FolderLock size={32} className="text-brand-accent" />
          <p>{t('export_import_kept_modal_desc')}</p>
        </div>

        <label className="field mt-md">
          <span>{t('export_import_kept_pass_label')}</span>
          <div className="password-input-wrap">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder={t('export_import_kept_pass_ph')}
              autoFocus
              required
            />
            <button
              type="button"
              className="icon-button-subtle pass-toggle-btn"
              onClick={() => setShowPass(!showPass)}
              tabIndex={-1}
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        {error && <div className="feedback error mt-sm">{error}</div>}

        <div className="button-row mt-md">
          <button
            type="button"
            className="secondary-button pill-button"
            onClick={onClose}
            disabled={busy}
          >
            {lang === 'id' ? 'Batal' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="primary-button pill-button"
            disabled={!password || busy}
          >
            <Upload size={14} />
            {busy ? t('export_import_kept_decrypting') : t('export_import_kept_decrypt_btn')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
