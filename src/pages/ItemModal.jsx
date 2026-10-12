import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import SiteLogo from '../components/SiteLogo'
import {
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Star,
  Plus,
  X
} from '../components/Icons'

export default function ItemModal({
  item,
  onClose,
  onDelete,
  onSave,
  onToggleFavorite
}) {
  const [editing, setEditing] = useState(false)
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

    onSave({
      ...form,
      name: String(form.name).trim(),
      custom_fields: cleanedCustomFields
    })

    setForm((current) => ({
      ...current,
      custom_fields: cleanedCustomFields
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
          ? 'Card details'
          : item.item_type === 'secure_note'
            ? 'Secure note'
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

          <div>
            <span className="detail-name">
              {form.name || 'Untitled'}
            </span>

            <span className="detail-category">
              {form.categoryLabel || formatType(item.item_type)}
            </span>
          </div>
        </div>

        <div className="button-row">
          <button
            type="button"
            className={
              isFavorite
                ? 'favorite-button selected'
                : 'favorite-button'
            }
            onClick={() => onToggleFavorite(item.id)}
          >
            <Star
              size={15}
              fill={isFavorite ? 'currentColor' : 'none'}
            />
            Favorite
          </button>

          {!editing ? (
            <button
              type="button"
              className="secondary-button compact"
              onClick={() => setEditing(true)}
            >
              <Pencil size={15} />
              Edit
            </button>
          ) : (
            <button
              type="button"
              className="secondary-button compact"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            className="danger-ghost compact"
            onClick={() => onDelete(item.id)}
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {!editing ? (
        <ReadOnly
          item={form}
          visibleSecrets={visibleSecrets}
          toggleSecret={toggleSecret}
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
        />
      )}

      {editing && (
        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={cancelEdit}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={save}
            disabled={!String(form.name || '').trim()}
          >
            Save changes
          </button>
        </div>
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
    return 'Bank / ATM Card'
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
  toggleSecret
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

        <Field
          label="Bank color"
          value={item.color}
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
  removeCustomField
}) {
  if (item.item_type === 'bank_card') {
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
          label="Bank"
          value={item.bank_name}
          onChange={(value) =>
            update('bank_name', value)
          }
        />

        <Field
          label="Account owner"
          value={item.account_owner}
          onChange={(value) =>
            update('account_owner', value)
          }
        />

        <Field
          label="Card number"
          value={item.card_number}
          secret
          visible={
            visibleSecrets.edit_card_number
          }
          onToggle={() =>
            toggleSecret('edit_card_number')
          }
          onChange={(value) =>
            update('card_number', value)
          }
        />

        <Field
          label="Account number"
          value={item.account_number}
          secret
          visible={
            visibleSecrets.edit_account_number
          }
          onToggle={() =>
            toggleSecret('edit_account_number')
          }
          onChange={(value) =>
            update('account_number', value)
          }
        />

        <Field
          label="Registered phone"
          value={item.registered_phone}
          onChange={(value) =>
            update('registered_phone', value)
          }
        />

        <Field
          label="Card brand"
          value={item.card_brand}
          onChange={(value) =>
            update('card_brand', value)
          }
        />

        <Field
          label="Expiry"
          value={item.expiry}
          onChange={(value) =>
            update('expiry', value)
          }
        />

        <Field
          label="Bank color"
          value={item.color}
          onChange={(value) =>
            update('color', value)
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