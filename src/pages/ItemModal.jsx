import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import SiteLogo from '../components/SiteLogo'
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Star,
  Plus,
  History,
  RotateCcw,
  Flame,
  X
} from '../components/Icons'
import { BANK_PRESETS } from '../lib/banks'
import ConfirmToast from '../components/ConfirmToast'
import BreachCheckerBadge from '../components/BreachCheckerBadge'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

export default function ItemModal({
  item,
  onClose,
  onDelete,
  onSave,
  onToggleFavorite,
  onShareSecret,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)
  const [editing, setEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [form, setForm] = useState(normalizeItem(item))
  const [visibleSecrets, setVisibleSecrets] = useState({})

  useEffect(() => {
    setForm(normalizeItem(item))
    setEditing(false)
    setVisibleSecrets({})
  }, [item])

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }))
  }

  const toggleSecret = (key) => {
    setVisibleSecrets((current) => ({
      ...current,
      [key]: !current[key]
    }))
  }

  const save = () => {
    if (!String(form.name || '').trim()) {
      return
    }

    const cleanedCustomFields = (form.custom_fields || [])
      .filter(
        (field) =>
          String(field.label || '').trim() ||
          String(field.value || '').trim()
      )
      .map(({ label, value, secret }) => ({
        label: String(label || '').trim(),
        value: value || '',
        secret: Boolean(secret)
      }))

    let passwordHistory = Array.isArray(form.password_history)
      ? [...form.password_history]
      : Array.isArray(item.password_history)
        ? [...item.password_history]
        : []

    if (item.password && form.password && form.password !== item.password) {
      if (!passwordHistory.length || passwordHistory[0].password !== item.password) {
        passwordHistory.unshift({
          password: item.password,
          changed_at: new Date().toISOString()
        })
        if (passwordHistory.length > 5) passwordHistory = passwordHistory.slice(0, 5)
      }
    }

    onSave({
      ...form,
      name: String(form.name).trim(),
      custom_fields: cleanedCustomFields,
      password_history: passwordHistory
    })

    setForm((current) => ({
      ...current,
      custom_fields: cleanedCustomFields,
      password_history: passwordHistory
    }))

    setEditing(false)
    setVisibleSecrets({})
  }

  const cancelEdit = () => {
    setForm(normalizeItem(item))
    setEditing(false)
    setVisibleSecrets({})
  }

  const addCustomField = () => {
    setForm((current) => ({
      ...current,
      custom_fields: [
        ...(current.custom_fields || []),
        {
          id: crypto.randomUUID(),
          label: '',
          value: '',
          secret: false
        }
      ]
    }))
  }

  const updateCustomField = (id, key, value) => {
    setForm((current) => ({
      ...current,
      custom_fields: (current.custom_fields || []).map((field) =>
        field.id === id
          ? {
              ...field,
              [key]: value
            }
          : field
      )
    }))
  }

  const removeCustomField = (id) => {
    setForm((current) => ({
      ...current,
      custom_fields: (current.custom_fields || []).filter(
        (field) => field.id !== id
      )
    }))
  }

  const isFavorite = Boolean(item.favorite)

  return (
    <Modal
      title={
        item.item_type === 'bank_card'
          ? (lang === 'id' ? 'Detail kartu' : 'Card details')
          : item.item_type === 'secure_note'
            ? (lang === 'id' ? 'Catatan aman' : 'Secure note')
            : item.name
      }
      eyebrow={formatType(item.item_type)}
      wide
      onClose={onClose}
    >
      <div className="detail-header">
        <div className="detail-identity">
          {form.url && (
            <SiteLogo
              url={form.url}
              name={form.name}
              size={34}
              radius={10}
            />
          )}

          <div className="detail-meta">
            <span className="detail-name">
              {form.name || 'Untitled'}
            </span>

            <span className="detail-category">
              {form.categoryLabel || formatType(item.item_type)}
            </span>
          </div>
        </div>

        <div className="detail-actions">
          <button
            type="button"
            className={
              isFavorite
                ? 'action-pill-btn favorite selected'
                : 'action-pill-btn favorite'
            }
            onClick={() => onToggleFavorite(item.id)}
          >
            <Star
              size={14}
              fill={isFavorite ? 'currentColor' : 'none'}
            />
            <span>{isFavorite ? (lang === 'id' ? 'Favorit' : 'Favorite') : (lang === 'id' ? 'Jadikan Favorit' : 'Add to Favorites')}</span>
          </button>

          {!editing ? (
            <button
              type="button"
              className="action-pill-btn edit"
              onClick={() => setEditing(true)}
              title={t('action_edit')}
              aria-label={t('action_edit')}
            >
              <Pencil size={14} />
              <span>{t('action_edit')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="action-pill-btn cancel"
              onClick={cancelEdit}
              title={t('action_cancel')}
              aria-label={t('action_cancel')}
            >
              <span>{t('action_cancel')}</span>
            </button>
          )}

          {onShareSecret && !editing && (
            <button
              type="button"
              className="action-pill-btn share"
              onClick={() => onShareSecret(item)}
              title={t('share_secret_btn')}
              aria-label={t('share_secret_btn')}
            >
              <Flame size={14} />
              <span>{t('share_secret_btn')}</span>
            </button>
          )}

          <button
            type="button"
            className="action-pill-btn delete"
            onClick={() => setShowDeleteConfirm(true)}
            title={t('action_delete')}
            aria-label={t('action_delete')}
          >
            <Trash2 size={14} />
            <span>{t('action_delete')}</span>
          </button>
        </div>
      </div>

      {!editing ? (
        <ReadOnly
          item={form}
          visibleSecrets={visibleSecrets}
          toggleSecret={toggleSecret}
          lang={lang}
        />
      ) : (
        <EditForm
          item={form}
          update={update}
          visibleSecrets={visibleSecrets}
          toggleSecret={toggleSecret}
          addCustomField={addCustomField}
          updateCustomField={updateCustomField}
          removeCustomField={removeCustomField}
          lang={lang}
        />
      )}

      {editing && (
        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button pill-button"
            onClick={cancelEdit}
          >
            {t('action_cancel')}
          </button>

          <button
            type="button"
            className="primary-button pill-button"
            onClick={save}
            disabled={!String(form.name || '').trim()}
          >
            {t('action_save')}
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmToast
          message={
            lang === 'id'
              ? `Hapus "${form.name || 'item ini'}" secara permanen?`
              : `Permanently delete "${form.name || 'this item'}"?`
          }
          confirmLabel={t('action_delete')}
          cancelLabel={t('action_cancel')}
          onConfirm={() => {
            setShowDeleteConfirm(false)
            onDelete(item.id)
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          lang={lang}
        />
      )}
    </Modal>
  )
}

function normalizeItem(item) {
  return {
    ...item,

    name: item.name || '',
    username: item.username || '',
    password: item.password || '',
    url: item.url || '',
    notes: item.notes || '',
    environment: item.environment || '',
    service: item.service || '',

    bank_name: item.bank_name || '',
    account_owner: item.account_owner || '',
    card_number: item.card_number || '',
    account_number: item.account_number || '',
    registered_phone: item.registered_phone || '',
    card_brand: item.card_brand || '',
    expiry: item.expiry || '',
    color: item.color || '',

    note: item.note || '',
    password_history: Array.isArray(item.password_history) ? item.password_history : [],

    custom_fields: (item.custom_fields || []).map((field) => ({
      id: field.id || crypto.randomUUID(),
      label: field.label || '',
      value: field.value || '',
      secret: Boolean(field.secret)
    }))
  }
}

function formatType(type) {
  if (type === 'bank_card') {
    return 'Account'
  }

  if (type === 'secure_note') {
    return 'Secure Note'
  }

  if (type === 'password') {
    return 'Password'
  }

  return String(type || '').replaceAll('_', ' ')
}

function Field({
  label,
  value,
  secret = false,
  visible = false,
  onToggle,
  onChange,
  disabled = false
}) {
  const displayValue = value || ''

  return (
    <label className="field">
      <span>{label}</span>

      <div className="input-wrap">
        <input
          value={displayValue}
          onChange={(event) =>
            onChange?.(event.target.value)
          }
          disabled={disabled}
          type={
            secret && !visible
              ? 'password'
              : 'text'
          }
        />

        <div className="input-actions">
          {secret && (
            <button
              type="button"
              className="mini-icon"
              onClick={onToggle}
              title={visible ? 'Hide' : 'Show'}
              aria-label={visible ? 'Hide' : 'Show'}
            >
              {visible ? (
                <EyeOff size={15} />
              ) : (
                <Eye size={15} />
              )}
            </button>
          )}

          {secret && displayValue && (
            <button
              type="button"
              className="mini-icon"
              onClick={() =>
                navigator.clipboard?.writeText(displayValue)
              }
              title="Copy"
              aria-label="Copy"
            >
              <Copy size={15} />
            </button>
          )}
        </div>
      </div>
    </label>
  )
}

function ReadOnly({
  item,
  visibleSecrets,
  toggleSecret,
  lang = 'id'
}) {
  if (item.item_type === 'bank_card') {
    return (
      <div className="detail-grid">
        <Field
          label="Bank"
          value={item.bank_name}
          disabled
        />

        <Field
          label="Account owner"
          value={item.account_owner}
          disabled
        />

        <Field
          label="Card number"
          value={item.card_number}
          secret
          visible={visibleSecrets.card_number}
          onToggle={() =>
            toggleSecret('card_number')
          }
          disabled
        />

        <Field
          label="Account number"
          value={item.account_number}
          secret
          visible={visibleSecrets.account_number}
          onToggle={() =>
            toggleSecret('account_number')
          }
          disabled
        />

        <Field
          label="Registered phone"
          value={item.registered_phone}
          disabled
        />

        <Field
          label="Card type"
          value={item.card_brand}
          disabled
        />

        <Field
          label="Expiry"
          value={item.expiry}
          disabled
        />

        {item.notes && (
          <div className="note-box span-2">
            <strong>Notes</strong>
            <span>{item.notes}</span>
          </div>
        )}

        <CustomFieldsReadOnly
          fields={item.custom_fields}
          visibleSecrets={visibleSecrets}
          toggleSecret={toggleSecret}
        />

        <div className="note-box span-2">
          <strong>Security note</strong>

          <span>
            Do not put PIN, OTP, CVV or recovery
            codes into regular fields.
          </span>
        </div>
      </div>
    )
  }

  if (item.item_type === 'secure_note') {
    return (
      <div className="detail-grid one">
        <Field
          label="Title"
          value={item.name}
          disabled
        />

        <label className="field">
          <span>Note</span>

          <textarea
            value={item.note || ''}
            disabled
            rows={8}
          />
        </label>

        <CustomFieldsReadOnly
          fields={item.custom_fields}
          visibleSecrets={visibleSecrets}
          toggleSecret={toggleSecret}
        />
      </div>
    )
  }

  return (
    <div className="detail-grid">
      <Field
        label="Name"
        value={item.name}
        disabled
      />

      <Field
        label="Username / Email"
        value={item.username}
        disabled
      />

      <div className="field-with-breach">
        <Field
          label="Password"
          value={item.password}
          secret
          visible={visibleSecrets.password}
          onToggle={() =>
            toggleSecret('password')
          }
          disabled
        />
        <BreachCheckerBadge password={item.password} lang={lang} />
        <PasswordHistoryViewer history={item.password_history} lang={lang} />
      </div>

      <Field
        label="URL"
        value={item.url}
        disabled
      />

      <Field
        label="Environment"
        value={item.environment}
        disabled
      />

      <Field
        label="Service"
        value={item.service}
        disabled
      />

      <label className="field span-2">
        <span>Notes</span>

        <textarea
          value={item.notes || ''}
          disabled
          rows={5}
        />
      </label>

      <CustomFieldsReadOnly
        fields={item.custom_fields}
        visibleSecrets={visibleSecrets}
        toggleSecret={toggleSecret}
      />
    </div>
  )
}

function EditForm({
  item,
  update,
  visibleSecrets,
  toggleSecret,
  addCustomField,
  updateCustomField,
  removeCustomField,
  lang = 'id'
}) {
  if (item.item_type === 'bank_card') {
    return (
      <div className="detail-grid">
        {/* Quick Bank Selector */}
        <label className="field span-2">
          <span>Pilih Bank</span>
          <select
            value={BANK_PRESETS.find(p => p.name.toLowerCase() === (item.bank_name || '').toLowerCase())?.id || ''}
            onChange={(e) => {
              const selectedId = e.target.value
              const preset = BANK_PRESETS.find(p => p.id === selectedId)
              if (preset) {
                update('bank_name', preset.name)
                update('color', preset.color)
                update('card_brand', preset.cardBrand)
              }
            }}
          >
            <option value="">-- Pilih Bank --</option>
            {BANK_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>

        <Field
          label="Name"
          value={item.name}
          onChange={(value) => update('name', value)}
        />

        <Field
          label="Account owner"
          value={item.account_owner}
          onChange={(value) => update('account_owner', value)}
        />

        <Field
          label="Card number"
          value={item.card_number}
          secret
          visible={visibleSecrets.edit_card_number}
          onToggle={() => toggleSecret('edit_card_number')}
          onChange={(value) => update('card_number', value)}
        />

        <Field
          label="Account number"
          value={item.account_number}
          secret
          visible={visibleSecrets.edit_account_number}
          onToggle={() => toggleSecret('edit_account_number')}
          onChange={(value) => update('account_number', value)}
        />

        <Field
          label="Registered phone"
          value={item.registered_phone}
          onChange={(value) => update('registered_phone', value)}
        />

        <label className="field">
          <span>Card brand</span>
          <select
            value={item.card_brand || 'DEBIT'}
            onChange={(e) => update('card_brand', e.target.value)}
          >
            <option value="DEBIT">DEBIT / GPN</option>
            <option value="VISA">VISA</option>
            <option value="MASTERCARD">MASTERCARD</option>
            <option value="JCB">JCB</option>
            <option value="KREDIT">KREDIT</option>
          </select>
        </label>

        <Field
          label="Expiry"
          value={item.expiry}
          onChange={(value) => update('expiry', value)}
        />

        <label className="field span-2">
          <span>Notes</span>

          <textarea
            value={item.notes || ''}
            onChange={(event) =>
              update(
                'notes',
                event.target.value
              )
            }
            rows={5}
          />
        </label>

        <CustomFieldsEditor
          fields={item.custom_fields}
          visibleSecrets={visibleSecrets}
          toggleSecret={toggleSecret}
          addCustomField={addCustomField}
          updateCustomField={
            updateCustomField
          }
          removeCustomField={
            removeCustomField
          }
        />
      </div>
    )
  }

  if (item.item_type === 'secure_note') {
    return (
      <div className="detail-grid one">
        <Field
          label="Title"
          value={item.name}
          onChange={(value) =>
            update('name', value)
          }
        />

        <label className="field">
          <span>Note</span>

          <textarea
            value={item.note || ''}
            onChange={(event) =>
              update(
                'note',
                event.target.value
              )
            }
            rows={8}
          />
        </label>

        <CustomFieldsEditor
          fields={item.custom_fields}
          visibleSecrets={visibleSecrets}
          toggleSecret={toggleSecret}
          addCustomField={addCustomField}
          updateCustomField={
            updateCustomField
          }
          removeCustomField={
            removeCustomField
          }
        />
      </div>
    )
  }

  return (
    <div className="detail-grid">
      <Field
        label="Name"
        value={item.name}
        onChange={(value) =>
          update('name', value)
        }
      />

      <Field
        label="Username / Email"
        value={item.username}
        onChange={(value) =>
          update('username', value)
        }
      />

      <div className="field-with-breach">
        <Field
          label="Password"
          value={item.password}
          secret
          visible={
            visibleSecrets.edit_password
          }
          onToggle={() =>
            toggleSecret('edit_password')
          }
          onChange={(value) =>
            update('password', value)
          }
        />
        <BreachCheckerBadge password={item.password} lang={lang} />
        <PasswordHistoryViewer
          history={item.password_history}
          onRestorePassword={(val) => update('password', val)}
          isEditing
          lang={lang}
        />
      </div>

      <Field
        label="URL"
        value={item.url}
        onChange={(value) =>
          update('url', value)
        }
      />

      <Field
        label="Environment"
        value={item.environment}
        onChange={(value) =>
          update('environment', value)
        }
      />

      <Field
        label="Service"
        value={item.service}
        onChange={(value) =>
          update('service', value)
        }
      />

      <label className="field span-2">
        <span>Notes</span>

        <textarea
          value={item.notes || ''}
          onChange={(event) =>
            update(
              'notes',
              event.target.value
            )
          }
          rows={5}
        />
      </label>

      <CustomFieldsEditor
        fields={item.custom_fields}
        visibleSecrets={visibleSecrets}
        toggleSecret={toggleSecret}
        addCustomField={addCustomField}
        updateCustomField={
          updateCustomField
        }
        removeCustomField={
          removeCustomField
        }
      />
    </div>
  )
}

function CustomFieldsReadOnly({
  fields = [],
  visibleSecrets,
  toggleSecret
}) {
  if (!fields.length) {
    return null
  }

  return (
    <div className="custom-fields-readonly span-2">
      <div className="custom-fields-title">
        <strong>Custom fields</strong>
      </div>

      <div className="detail-grid">
        {fields.map((field, index) => {
          const key = `custom_${index}`

          return (
            <Field
              key={key}
              label={
                field.label ||
                `Field ${index + 1}`
              }
              value={field.value}
              secret={field.secret}
              visible={visibleSecrets[key]}
              onToggle={() =>
                toggleSecret(key)
              }
              disabled
            />
          )
        })}
      </div>
    </div>
  )
}

function CustomFieldsEditor({
  fields = [],
  visibleSecrets,
  toggleSecret,
  addCustomField,
  updateCustomField,
  removeCustomField
}) {
  return (
    <div className="custom-fields-section span-2">
      <div className="custom-fields-header">
        <div>
          <strong>Custom fields</strong>

          <span>
            Add API keys, IDs, servers,
            accounts or other information.
          </span>
        </div>

        <button
          type="button"
          className="secondary-button compact"
          onClick={addCustomField}
        >
          <Plus size={15} />
          Add field
        </button>
      </div>

      {!fields.length ? (
        <div className="custom-fields-empty">
          No custom fields added.
        </div>
      ) : (
        <div className="custom-fields-list">
          {fields.map((field) => {
            const secretKey = `edit_${field.id}`

            return (
              <div
                className="custom-field-row"
                key={field.id}
              >
                <label className="field">
                  <span>Label</span>

                  <input
                    value={field.label || ''}
                    onChange={(event) =>
                      updateCustomField(
                        field.id,
                        'label',
                        event.target.value
                      )
                    }
                    placeholder="e.g. API Key"
                  />
                </label>

                <label className="field">
                  <span>Value</span>

                  <div className="input-wrap">
                    <input
                      value={field.value || ''}
                      onChange={(event) =>
                        updateCustomField(
                          field.id,
                          'value',
                          event.target.value
                        )
                      }
                      type={
                        field.secret &&
                        !visibleSecrets[secretKey]
                          ? 'password'
                          : 'text'
                      }
                      placeholder="Value"
                    />

                    {field.secret && (
                      <div className="input-actions">
                        <button
                          type="button"
                          className="mini-icon"
                          onClick={() =>
                            toggleSecret(secretKey)
                          }
                          title={
                            visibleSecrets[secretKey]
                              ? 'Hide'
                              : 'Show'
                          }
                        >
                          {visibleSecrets[
                            secretKey
                          ] ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>

                        {field.value && (
                          <button
                            type="button"
                            className="mini-icon"
                            onClick={() =>
                              navigator.clipboard?.writeText(
                                field.value
                              )
                            }
                            title="Copy"
                          >
                            <Copy size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </label>

                <label className="custom-field-secret">
                  <input
                    type="checkbox"
                    checked={Boolean(field.secret)}
                    onChange={(event) =>
                      updateCustomField(
                        field.id,
                        'secret',
                        event.target.checked
                      )
                    }
                  />

                  <span>Secret</span>
                </label>

                <button
                  type="button"
                  className="mini-icon custom-field-remove"
                  onClick={() =>
                    removeCustomField(field.id)
                  }
                  title="Remove field"
                  aria-label="Remove field"
                >
                  <X size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PasswordHistoryViewer({
  history = [],
  onRestorePassword,
  isEditing = false,
  lang = 'id'
}) {
  const [open, setOpen] = useState(false)
  const [revealedIndex, setRevealedIndex] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const t = (k) => getTranslation(k, lang)

  if (!history || history.length === 0) return null

  function formatHistoryTime(iso) {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return iso
    }
  }

  function handleCopy(pass, idx) {
    navigator.clipboard?.writeText(pass)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 1800)
  }

  return (
    <div className="password-history-container">
      <button
        type="button"
        className="password-history-toggle-btn"
        onClick={() => setOpen(!open)}
      >
        <History size={12} />
        <span>{t('pass_history_title')} ({history.length})</span>
      </button>

      {open && (
        <div className="password-history-dropdown">
          <div className="password-history-header">
            <span>{t('pass_history_desc')}</span>
          </div>
          <div className="password-history-list">
            {history.map((entry, idx) => {
              const isRevealed = revealedIndex === idx
              const isCopied = copiedIndex === idx
              return (
                <div key={idx} className="password-history-item">
                  <div className="history-item-left">
                    <span className="history-item-date">{formatHistoryTime(entry.changed_at)}</span>
                    <span className="history-item-val font-mono">
                      {isRevealed ? entry.password : '••••••••••••'}
                    </span>
                  </div>
                  <div className="history-item-actions">
                    <button
                      type="button"
                      className="history-micro-btn"
                      onClick={() => setRevealedIndex(isRevealed ? null : idx)}
                      title={isRevealed ? 'Sembunyikan' : 'Lihat'}
                    >
                      {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                    <button
                      type="button"
                      className="history-micro-btn"
                      onClick={() => handleCopy(entry.password, idx)}
                      title="Salin"
                    >
                      {isCopied ? <Check size={11} className="text-emerald" /> : <Copy size={11} />}
                    </button>
                    {isEditing && onRestorePassword && (
                      <button
                        type="button"
                        className="history-restore-pill"
                        onClick={() => {
                          haptic('light')
                          onRestorePassword(entry.password)
                        }}
                        title={t('pass_history_restore')}
                      >
                        <RotateCcw size={10} />
                        <span>{t('pass_history_restore')}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}