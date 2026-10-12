import { useMemo, useState } from 'react'
import Modal from '../components/Modal'
import SiteLogo from '../components/SiteLogo'
import { Eye, EyeOff } from '../components/Icons'

const bankDefaults = [
  { name: 'BCA', color: '#0056b3' },
  { name: 'Mandiri', color: '#1f51a5' },
  { name: 'BRI', color: '#0b3f88' },
  { name: 'BNI', color: '#e87500' },
  { name: 'Bank Jago', color: '#e95c35' }
]

const environmentOptions = [
  'Production',
  'Staging',
  'Development',
  'Local',
  'Other'
]

export default function AddItemModal({
  mode,
  onClose,
  onSubmit
}) {
  const type = mode.startsWith('password')
    ? 'password'
    : mode === 'bank-card'
      ? 'bank_card'
      : 'secure_note'

  const category = useMemo(
    () =>
      ({
        'password-social': 'social',
        'password-web': 'web',
        'password-project': 'project'
      }[mode] || null),
    [mode]
  )

  const [form, setForm] = useState(
    type === 'bank_card'
      ? {
          name: 'Bank card',
          bank_name: 'BCA',
          color: '#0056b3',
          account_owner: '',
          card_number: '',
          account_number: '',
          registered_phone: '',
          card_brand: 'DEBIT',
          expiry: '',
          notes: '',
          custom_fields: []
        }
      : type === 'secure_note'
        ? {
            name: '',
            note: '',
            custom_fields: []
          }
        : {
            name: '',
            username: '',
            password: '',
            url: '',
            notes: '',
            environment: '',
            service: '',
            custom_fields: []
          }
  )

  const [formError, setFormError] = useState('')

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }))
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
      custom_fields: (current.custom_fields || []).map(
        (field) =>
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

  function submit(event) {
    event.preventDefault()

    // Name / Title bersifat opsional. Bila kosong, gunakan fallback yang
    // deskriptif supaya item tetap mudah dikenali di daftar vault.
    const fallbackName =
      type === 'bank_card'
        ? form.bank_name
          ? `${form.bank_name} card`
          : 'Bank card'
        : type === 'secure_note'
          ? 'Secure note'
          : form.username?.trim() ||
            form.url?.trim() ||
            'Untitled password'

    const finalName = form.name?.trim() || fallbackName

    setFormError('')

    const cleanedCustomFields = (
      form.custom_fields || []
    )
      .filter(
        (field) =>
          field.label?.trim() ||
          field.value?.trim()
      )
      .map(({ id, ...field }) => ({
        label:
          field.label?.trim() ||
          'Custom field',
        value: field.value || '',
        secret: Boolean(field.secret)
      }))

    onSubmit({
      item_type: type,
      category,
      ...form,
      name: finalName,
      custom_fields: cleanedCustomFields,
      favorite: false,
      last_used_at: new Date().toISOString()
    })
  }

  const title =
    type === 'bank_card'
      ? 'Add bank / ATM card'
      : type === 'secure_note'
        ? 'Add secure note'
        : 'Add password'

  const eyebrow =
    type === 'password'
      ? 'Secure record'
      : type === 'bank_card'
        ? 'Banking'
        : 'Secure note'

  return (
    <Modal
      title={title}
      eyebrow={eyebrow}
      wide
      onClose={onClose}
    >
      <form
        onSubmit={submit}
        className="detail-grid"
      >
        {/* Password / Secure Record */}
        {type !== 'bank_card' && (
          <Field
            label={
              category === 'project'
                ? 'Project name'
                : category === 'social'
                  ? 'Platform'
                  : 'Website'
            }
            value={form.name}
            onChange={(value) =>
              set('name', value)
            }
          />
        )}

        {/* Secure Note */}
        {type === 'secure_note' && (
          <label className="field span-2">
            <span>Private note</span>

            <textarea
              value={form.note}
              onChange={(e) =>
                set('note', e.target.value)
              }
              rows={9}
              placeholder="Write anything you want to keep secure..."
            />
          </label>
        )}

        {/* Password */}
        {type === 'password' && (
          <>
            <Field
              label="Username / Email"
              value={form.username}
              onChange={(value) =>
                set('username', value)
              }
            />

            <Field
              label="Password"
              value={form.password}
              onChange={(value) =>
                set('password', value)
              }
              secret
            />

            <label className="field">
              <span>URL</span>

              <div
                className={
                  form.url?.trim()
                    ? 'input-wrap prefixed'
                    : undefined
                }
              >
                {form.url?.trim() && (
                  <span className="input-prefix">
                    <SiteLogo
                      url={form.url}
                      name={form.name}
                      size={18}
                      radius={5}
                    />
                  </span>
                )}

                <input
                  value={form.url || ''}
                  onChange={(e) =>
                    set('url', e.target.value)
                  }
                  placeholder="example.com"
                  autoComplete="url"
                  inputMode="url"
                />
              </div>
            </label>

            {category === 'project' && (
              <>
                <label className="field">
                  <span>Environment</span>

                  <select
                    value={form.environment}
                    onChange={(e) =>
                      set(
                        'environment',
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Not specified
                    </option>

                    {environmentOptions.map(
                      (environment) => (
                        <option
                          key={environment}
                          value={environment}
                        >
                          {environment}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <Field
                  label="Service"
                  value={form.service}
                  onChange={(value) =>
                    set('service', value)
                  }
                />
              </>
            )}

            <label className="field span-2">
              <span>Notes</span>

              <textarea
                value={form.notes}
                onChange={(e) =>
                  set(
                    'notes',
                    e.target.value
                  )
                }
                rows={5}
                placeholder="Additional information..."
              />
            </label>
          </>
        )}

        {/* Bank / ATM Card */}
        {type === 'bank_card' && (
          <>
            <Field
              label="Record name"
              value={form.name}
              onChange={(value) =>
                set('name', value)
              }
            />

            <label className="field">
              <span>Bank</span>

              <select
                value={form.bank_name}
                onChange={(e) => {
                  const value = e.target.value

                  const hit =
                    bankDefaults.find(
                      (bank) =>
                        bank.name === value
                    )

                  set(
                    'bank_name',
                    value
                  )

                  if (hit) {
                    set(
                      'color',
                      hit.color
                    )
                  }
                }}
              >
                {bankDefaults.map((bank) => (
                  <option
                    key={bank.name}
                    value={bank.name}
                  >
                    {bank.name}
                  </option>
                ))}

                <option value="Other">
                  Other
                </option>
              </select>
            </label>

            <Field
              label="Account owner"
              value={form.account_owner}
              onChange={(value) =>
                set(
                  'account_owner',
                  value
                )
              }
            />

            <Field
              label="Card number"
              value={form.card_number}
              onChange={(value) =>
                set(
                  'card_number',
                  value
                )
              }
            />

            <Field
              label="Account number"
              value={form.account_number}
              onChange={(value) =>
                set(
                  'account_number',
                  value
                )
              }
            />

            <Field
              label="Registered phone"
              value={
                form.registered_phone
              }
              onChange={(value) =>
                set(
                  'registered_phone',
                  value
                )
              }
            />

            <Field
              label="Card brand"
              value={form.card_brand}
              onChange={(value) =>
                set(
                  'card_brand',
                  value
                )
              }
            />

            <Field
              label="Expiry"
              value={form.expiry}
              onChange={(value) =>
                set(
                  'expiry',
                  value
                )
              }
            />

            <Field
              label="Card color"
              value={form.color}
              onChange={(value) =>
                set('color', value)
              }
            />

            <label className="field span-2">
              <span>Notes</span>

              <textarea
                value={form.notes}
                onChange={(e) =>
                  set(
                    'notes',
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Additional information..."
              />
            </label>

            <div className="note-box span-2">
              <strong>
                Security rule
              </strong>

              <span>
                PIN, CVV, OTP and recovery
                codes should not be entered
                as normal stored fields.
              </span>
            </div>
          </>
        )}

        {/* Custom Fields */}
        <div className="custom-fields-section span-2">
          <div className="custom-fields-header">
            <div>
              <strong>
                Custom fields
              </strong>

              <span>
                Add any additional information
                you want to keep secure.
              </span>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={addCustomField}
            >
              + Add field
            </button>
          </div>

          {(form.custom_fields || []).map(
            (field) => (
              <div
                className="custom-field-row"
                key={field.id}
              >
                <label className="field">
                  <span>
                    Field name
                  </span>

                  <input
                    value={field.label}
                    onChange={(e) =>
                      updateCustomField(
                        field.id,
                        'label',
                        e.target.value
                      )
                    }
                    placeholder="e.g. API Key"
                  />
                </label>

                <label className="field">
                  <span>Value</span>

                  <input
                    value={field.value}
                    onChange={(e) =>
                      updateCustomField(
                        field.id,
                        'value',
                        e.target.value
                      )
                    }
                    type={
                      field.secret
                        ? 'password'
                        : 'text'
                    }
                    placeholder="Enter value"
                  />
                </label>

                <div className="custom-field-actions">
                  <label className="custom-field-secret">
                    <input
                      type="checkbox"
                      checked={field.secret}
                      onChange={(e) =>
                        updateCustomField(
                          field.id,
                          'secret',
                          e.target.checked
                        )
                      }
                    />

                    Secret
                  </label>

                  <button
                    type="button"
                    className="text-button danger-text"
                    onClick={() =>
                      removeCustomField(
                        field.id
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          )}

          {!form.custom_fields
            ?.length && (
            <div className="custom-fields-empty">
              No custom fields. Add one if
              you need to store something
              specific.
            </div>
          )}
        </div>

        {/* Actions */}
        {formError && (
          <div className="feedback error span-2">
            {formError}
          </div>
        )}

        <div className="modal-actions span-2">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="primary-button"
            type="submit"
          >
            Save securely
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({
  label,
  value,
  onChange,
  secret = false,
  required = false
}) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="field">
      <span>
        {label}
        {required && <small> *</small>}
      </span>

      <div className={secret ? 'input-wrap' : undefined}>
        <input
          value={value || ''}
          onChange={(e) =>
            onChange?.(e.target.value)
          }
          type={
            secret && !visible
              ? 'password'
              : 'text'
          }
          required={required}
        />

        {secret && (
          <div className="input-actions">
            <button
              type="button"
              className="mini-icon"
              onClick={() => setVisible((v) => !v)}
              title={visible ? 'Hide' : 'Show'}
              aria-label={visible ? 'Hide' : 'Show'}
            >
              {visible ? (
                <EyeOff size={15} />
              ) : (
                <Eye size={15} />
              )}
            </button>
          </div>
        )}
      </div>
    </label>
  )
}