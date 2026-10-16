import { useState } from 'react'
import Modal from './Modal'
import {
  Plus,
  CreditCard,
  Building2,
  Tag,
  HeartPulse,
  Gift,
  WalletCards,
  QrCode,
  Radio,
  ShieldCheck,
  Camera
} from './Icons'
import CardCameraScannerModal from './CardCameraScannerModal'
import CardNfcReaderModal from './CardNfcReaderModal'
import { CARD_CATEGORIES } from '../lib/cards'
import { BANK_PRESETS, EMONEY_PRESETS } from '../lib/banks'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

const CATEGORY_ICON_MAP = {
  bank: CreditCard,
  access: Building2,
  membership: Tag,
  health: HeartPulse,
  voucher: Gift,
  other: WalletCards
}

export default function AddCardModal({
  initialCard = null,
  onClose,
  onSubmit,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)
  const isEditing = Boolean(initialCard && initialCard.id)

  const [form, setForm] = useState(
    initialCard
      ? {
          category: initialCard.category || 'bank',
          name: initialCard.name || '',
          bank_name: initialCard.bank_name || initialCard.issuer || '',
          issuer: initialCard.issuer || initialCard.bank_name || '',
          account_owner: initialCard.account_owner || '',
          card_number: initialCard.card_number || '',
          account_number: initialCard.account_number || '',
          card_brand: initialCard.card_brand || '',
          expiry: initialCard.expiry || '',
          color: initialCard.color || '#0056b3',
          barcode_value: initialCard.barcode_value || '',
          barcode_type: initialCard.barcode_type || 'code128',
          nfc_uid: initialCard.nfc_uid || '',
          location: initialCard.location || '',
          faskes: initialCard.faskes || '',
          membership_tier: initialCard.membership_tier || '',
          voucher_value: initialCard.voucher_value || '',
          notes: initialCard.notes || '',
          privacy_mask: initialCard.privacy_mask ?? true
        }
      : {
          category: 'bank',
          name: '',
          bank_name: '',
          issuer: '',
          account_owner: '',
          card_number: '',
          account_number: '',
          card_brand: '',
          expiry: '',
          color: '#0056b3',
          barcode_value: '',
          barcode_type: 'code128',
          nfc_uid: '',
          location: '',
          faskes: '',
          membership_tier: '',
          voucher_value: '',
          notes: '',
          privacy_mask: true
        }
  )

  const [formError, setFormError] = useState('')
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false)
  const [isNfcReaderOpen, setIsNfcReaderOpen] = useState(false)
  const [accountSubtype, setAccountSubtype] = useState(() => {
    if (initialCard) {
      const brand = (initialCard.card_brand || '').toUpperCase()
      const isEmoneyBrand = ['FLAZZ', 'E-MONEY', 'TAPCASH', 'BRIZZI', 'E-WALLET', 'JAKCARD', 'KMT'].includes(brand)
      const name = (initialCard.name || initialCard.bank_name || initialCard.issuer || '').toLowerCase()
      const isEmoneyName = ['flazz', 'emoney', 'e-money', 'tapcash', 'brizzi', 'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'].some(k => name.includes(k))
      if (isEmoneyBrand || isEmoneyName) return 'emoney'
    }
    return 'bank'
  })

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }))
  }

  const handleCameraScanResult = (res) => {
    if (res?.value) {
      update('barcode_value', res.value)
      update('barcode_type', res.type || 'code128')
      if (!form.card_number) {
        update('card_number', res.value)
      }
      if (!form.name.trim()) {
        const catConfig = CARD_CATEGORIES.find((c) => c.id === form.category)
        update('name', `${t(catConfig?.labelKey || 'card_cat_other')} Scanned`)
      }
    }
  }

  const handleNfcResult = (tag) => {
    if (tag?.uid) {
      update('nfc_uid', tag.uid)
      if (!form.card_number && form.category === 'access') {
        update('card_number', tag.uid)
      }
      if (!form.name.trim()) {
        update('name', lang === 'id' ? 'Kartu Akses NFC' : 'NFC Access Card')
      }
    }
  }

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!form.name.trim()) {
      setFormError(lang === 'id' ? 'Nama kartu / rekord wajib diisi.' : 'Card / record name is required.')
      return
    }

    haptic('success')
    onSubmit({
      ...form,
      item_type: 'bank_card',
      category: form.category,
      name: form.name.trim(),
      bank_name: form.bank_name || form.issuer || form.name,
      issuer: form.issuer || form.bank_name || form.name
    })
  }

  return (
    <>
      <Modal
        title={isEditing ? (lang === 'id' ? 'Edit Kartu' : 'Edit Card') : (lang === 'id' ? 'Tambah Kartu Baru' : 'Add New Card')}
        eyebrow={lang === 'id' ? 'Brankas Kartu' : 'Cards Vault'}
        wide
        onClose={onClose}
      >
        <form onSubmit={handleSubmit} className="detail-grid">
          {formError && <div className="feedback error span-2">{formError}</div>}

          {/* 1. Category Selector Pills */}
          <div className="card-category-picker-block span-2">
            <span className="field-label-text">
              {lang === 'id' ? 'Pilih Kategori Kartu' : 'Select Card Category'}
            </span>
            <div className="card-category-scroll-bar">
              {CARD_CATEGORIES.map((cat) => {
                const CatIcon = CATEGORY_ICON_MAP[cat.id] || CreditCard
                const isSelected = form.category === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-pill-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      haptic('light')
                      update('category', cat.id)
                      if (cat.color) {
                        update('color', cat.color)
                      }
                    }}
                  >
                    <CatIcon size={14} />
                    <span>{t(cat.labelKey)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Live Dynamic Preview Card (Clean, neutral, category-specific) */}
          <div className="mini-card-preview-container span-2">
            {/* BANK & E-MONEY PREVIEW */}
            {form.category === 'bank' && (
              <div
                className="mini-card-preview"
                style={{ backgroundColor: form.color || '#0056b3' }}
              >
                <div className="mini-card-top">
                  <span className="mini-card-bank">
                    {form.bank_name || form.issuer || (lang === 'id' ? 'Nama Bank / e-Money' : 'Bank / e-Money')}
                  </span>
                  <span className="mini-card-brand">{form.card_brand || 'DEBIT'}</span>
                </div>
                <div className="mini-card-number">
                  {form.card_number
                    ? form.card_number.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() || '•••• •••• •••• ••••'
                    : '•••• •••• •••• ••••'}
                </div>
                <div className="mini-card-bottom">
                  <div>
                    <span className="mini-card-label">{lang === 'id' ? 'PEMEGANG KARTU' : 'CARDHOLDER'}</span>
                    <strong className="mini-card-value">{form.account_owner || form.name || (lang === 'id' ? 'NAMA LENGKAP' : 'YOUR NAME')}</strong>
                  </div>
                  <div>
                    <span className="mini-card-label">{lang === 'id' ? 'BERLAKU' : 'EXPIRES'}</span>
                    <strong className="mini-card-value">{form.expiry || 'MM/YY'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* CARD ACCESS PREVIEW */}
            {form.category === 'access' && (
              <div
                className="mini-card-preview"
                style={{ backgroundColor: form.color || '#0d9488' }}
              >
                <div className="mini-card-top">
                  <span className="mini-card-bank">
                    {form.location || form.bank_name || (lang === 'id' ? 'KARTU AKSES' : 'ACCESS CARD')}
                  </span>
                  <span className="mini-card-brand">
                    {form.card_brand || (form.nfc_uid ? 'NFC / RFID' : 'ACCESS')}
                  </span>
                </div>
                <div className="mini-card-access-body">
                  <div className="mini-card-access-name">
                    {form.name || (lang === 'id' ? 'Akses Apartemen / Kantor' : 'Access Card')}
                  </div>
                  <div className="mini-card-access-uid">
                    {form.nfc_uid
                      ? `UID: ${form.nfc_uid}`
                      : (form.card_number ? `ID: ${form.card_number}` : 'RFID ••••••••')}
                  </div>
                </div>
                <div className="mini-card-bottom">
                  <div>
                    <span className="mini-card-label">{lang === 'id' ? 'LOKASI / UNIT' : 'LOCATION / UNIT'}</span>
                    <strong className="mini-card-value">
                      {form.account_owner || form.location || (lang === 'id' ? 'Area Terdaftar' : 'Registered Area')}
                    </strong>
                  </div>
                  <div>
                    <span className="mini-card-label">STATUS</span>
                    <strong className="mini-card-value">{lang === 'id' ? 'AKTIF' : 'ACTIVE'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* MEMBERSHIP PREVIEW */}
            {form.category === 'membership' && (
              <div
                className="mini-card-preview"
                style={{ backgroundColor: form.color || '#7c3aed' }}
              >
                <div className="mini-card-top">
                  <span className="mini-card-bank">
                    {form.bank_name || form.name || (lang === 'id' ? 'KARTU MEMBER' : 'MEMBERSHIP CARD')}
                  </span>
                  <span className="mini-card-brand">
                    {form.membership_tier || form.card_brand || 'MEMBER'}
                  </span>
                </div>
                <div className="mini-card-number">
                  {form.card_number ? form.card_number : '•••• •••• ••••'}
                </div>
                <div className="mini-card-bottom">
                  <div>
                    <span className="mini-card-label">{lang === 'id' ? 'NAMA MEMBER' : 'MEMBER NAME'}</span>
                    <strong className="mini-card-value">
                      {form.account_owner || (lang === 'id' ? 'NAMA PELANGGAN' : 'MEMBER')}
                    </strong>
                  </div>
                  <div>
                    <span className="mini-card-label">{lang === 'id' ? 'BERLAKU' : 'EXPIRES'}</span>
                    <strong className="mini-card-value">
                      {form.expiry || (lang === 'id' ? 'SEUMUR HIDUP' : 'LIFETIME')}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* HEALTH & INSURANCE PREVIEW */}
            {form.category === 'health' && (
              <div
                className="mini-card-preview"
                style={{ backgroundColor: form.color || '#dc2626' }}
              >
                <div className="mini-card-top">
                  <span className="mini-card-bank">
                    {form.bank_name || form.name || (lang === 'id' ? 'ASURANSI / BPJS' : 'HEALTH INSURANCE')}
                  </span>
                  <span className="mini-card-brand">
                    {form.card_brand || (lang === 'id' ? 'KESEHATAN' : 'HEALTH')}
                  </span>
                </div>
                <div className="mini-card-number">
                  {form.card_number ? form.card_number : '000 ••••• •••••'}
                </div>
                <div className="mini-card-bottom">
                  <div>
                    <span className="mini-card-label">{lang === 'id' ? 'NAMA PESERTA' : 'INSURED NAME'}</span>
                    <strong className="mini-card-value">
                      {form.account_owner || (lang === 'id' ? 'NAMA PESERTA' : 'PARTICIPANT')}
                    </strong>
                  </div>
                  <div>
                    <span className="mini-card-label">{lang === 'id' ? 'FASKES / KELAS' : 'CLINIC / CLASS'}</span>
                    <strong className="mini-card-value">
                      {form.faskes || form.expiry || (lang === 'id' ? 'KELAS 1' : 'CLASS 1')}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* VOUCHER & GIFTS PREVIEW */}
            {form.category === 'voucher' && (
              <div
                className="mini-card-preview"
                style={{ backgroundColor: form.color || '#ea580c' }}
              >
                <div className="mini-card-top">
                  <span className="mini-card-bank">
                    {form.bank_name || form.name || (lang === 'id' ? 'VOUCHER BELANJA' : 'GIFT VOUCHER')}
                  </span>
                  <span className="mini-card-brand">
                    {form.voucher_value || 'VOUCHER'}
                  </span>
                </div>
                <div className="mini-card-voucher-code">
                  {form.card_number ? form.card_number : 'KODE: ••••••••••'}
                </div>
                <div className="mini-card-bottom">
                  <div>
                    <span className="mini-card-label">{lang === 'id' ? 'MERCHANT / TOKO' : 'MERCHANT'}</span>
                    <strong className="mini-card-value">
                      {form.bank_name || form.name || (lang === 'id' ? 'OUTLET REKANAN' : 'PARTNER')}
                    </strong>
                  </div>
                  <div>
                    <span className="mini-card-label">{lang === 'id' ? 'KEDALUWARSA' : 'EXPIRY'}</span>
                    <strong className="mini-card-value">
                      {form.expiry || (lang === 'id' ? 'SESUAI PROMO' : 'VALID')}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* OTHER CARDS PREVIEW */}
            {form.category === 'other' && (
              <div
                className="mini-card-preview"
                style={{ backgroundColor: form.color || '#475569' }}
              >
                <div className="mini-card-top">
                  <span className="mini-card-bank">
                    {form.bank_name || (lang === 'id' ? 'KARTU IDENTITAS' : 'IDENTITY CARD')}
                  </span>
                  <span className="mini-card-brand">{form.card_brand || 'ID CARD'}</span>
                </div>
                <div className="mini-card-number">
                  {form.card_number ? form.card_number : 'ID: ••••••••'}
                </div>
                <div className="mini-card-bottom">
                  <div>
                    <span className="mini-card-label">{lang === 'id' ? 'NAMA PEMILIK' : 'CARDHOLDER'}</span>
                    <strong className="mini-card-value">
                      {form.account_owner || form.name || (lang === 'id' ? 'NAMA LENGKAP' : 'YOUR NAME')}
                    </strong>
                  </div>
                  <div>
                    <span className="mini-card-label">STATUS</span>
                    <strong className="mini-card-value">{form.expiry || (lang === 'id' ? 'AKTIF' : 'ACTIVE')}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. CATEGORY SPECIFIC FORM FIELDS */}

          {/* CATEGORY A: BANK & E-MONEY (ACCOUNT) */}
          {form.category === 'bank' && (
            <>
              <div className="account-subtype-container span-2">
                <span className="field-label-text">{lang === 'id' ? 'Pilihan Jenis Akun' : 'Account Type'}</span>
                <div className="account-type-tabs">
                  <button
                    type="button"
                    className={`account-type-btn ${accountSubtype === 'bank' ? 'active' : ''}`}
                    onClick={() => {
                      haptic('light')
                      setAccountSubtype('bank')
                    }}
                  >
                    <CreditCard size={14} />
                    <span>{lang === 'id' ? 'Rekening & Kartu Bank' : 'Bank Account'}</span>
                  </button>
                  <button
                    type="button"
                    className={`account-type-btn ${accountSubtype === 'emoney' ? 'active' : ''}`}
                    onClick={() => {
                      haptic('light')
                      setAccountSubtype('emoney')
                    }}
                  >
                    <WalletCards size={14} />
                    <span>e-Money & E-Wallet</span>
                  </button>
                </div>

                {accountSubtype === 'bank' ? (
                  <label className="field mt-xs">
                    <span>{lang === 'id' ? 'Pilih Preset Bank' : 'Select Bank Preset'}</span>
                    <select
                      value={BANK_PRESETS.find((p) => p.name.toLowerCase() === (form.bank_name || '').toLowerCase())?.id || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value
                        const preset = BANK_PRESETS.find((p) => p.id === selectedId)
                        if (preset) {
                          update('bank_name', preset.name)
                          update('issuer', preset.name)
                          update('color', preset.color)
                          update('card_brand', preset.cardBrand)
                          if (!form.name || form.name.startsWith('Kartu') || form.name.startsWith('Flazz') || form.name.startsWith('GoPay') || form.name.startsWith('OVO') || form.name.startsWith('DANA')) {
                            update('name', `Kartu Debit ${preset.name}`)
                          }
                        }
                      }}
                    >
                      <option value="">{lang === 'id' ? '-- Pilih Bank (BCA, Mandiri, BRI, BNI, Jago, dll.) --' : '-- Select Bank --'}</option>
                      {BANK_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name} ({preset.cardBrand})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="field mt-xs">
                    <span>{lang === 'id' ? 'Pilih Preset e-Money / E-Wallet' : 'Select e-Money Preset'}</span>
                    <select
                      value={EMONEY_PRESETS.find((p) => p.name.toLowerCase() === (form.bank_name || '').toLowerCase())?.id || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value
                        const preset = EMONEY_PRESETS.find((p) => p.id === selectedId)
                        if (preset) {
                          update('bank_name', preset.name)
                          update('issuer', preset.name)
                          update('color', preset.color)
                          update('card_brand', preset.cardBrand)
                          if (!form.name || form.name.startsWith('Kartu')) {
                            update('name', preset.name)
                          }
                        }
                      }}
                    >
                      <option value="">{lang === 'id' ? '-- Pilih e-Money (Flazz, Mandiri e-Money, TapCash, GoPay, dll.) --' : '-- Select e-Money --'}</option>
                      {EMONEY_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name} ({preset.cardBrand})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <label className="field span-2">
                <span>{lang === 'id' ? 'Nama Rekord / Kartu *' : 'Card / Record Name *'}</span>
                <input
                  type="text"
                  required
                  placeholder={lang === 'id' ? 'Contoh: Kartu Debit BCA Pribadi, Flazz Harian' : 'e.g. Primary Debit Card'}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Penerbit / Nama Bank' : 'Bank / Issuer'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: BCA, Mandiri, Bank Jago' : 'e.g. BCA, Mandiri'}
                  value={form.bank_name}
                  onChange={(e) => {
                    update('bank_name', e.target.value)
                    update('issuer', e.target.value)
                  }}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Tipe Kartu' : 'Card Brand'}</span>
                <input
                  type="text"
                  placeholder="DEBIT, KREDIT, GPN, VISA"
                  value={form.card_brand}
                  onChange={(e) => update('card_brand', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Nomor Kartu (16 Digit)' : 'Card Number'}</span>
                <input
                  type="text"
                  placeholder="4000 1234 5678 9010"
                  value={form.card_number}
                  onChange={(e) => update('card_number', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Masa Berlaku (MM/YY)' : 'Expiry (MM/YY)'}</span>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={form.expiry}
                  onChange={(e) => update('expiry', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Nama Pemegang Kartu' : 'Cardholder Name'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Nama sesuai kartu' : 'Name on card'}
                  value={form.account_owner}
                  onChange={(e) => update('account_owner', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Nomor Rekening (Opsional)' : 'Account Number (Optional)'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Nomor rekening bank' : 'Bank account number'}
                  value={form.account_number}
                  onChange={(e) => update('account_number', e.target.value)}
                />
              </label>

              {/* Barcode & NFC for e-Money/Bank if needed */}
              <label className="field span-2">
                <span>{lang === 'id' ? 'NFC UID / Nomor Fisik (Opsional)' : 'NFC UID / Chip (Optional)'}</span>
                <div className="input-with-button-row">
                  <input
                    type="text"
                    placeholder="Contoh: 04:A2:3B:1F"
                    value={form.nfc_uid}
                    onChange={(e) => update('nfc_uid', e.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary-button pill-button-sm"
                    onClick={() => setIsNfcReaderOpen(true)}
                  >
                    <Radio size={13} />
                    <span>NFC</span>
                  </button>
                </div>
              </label>
            </>
          )}

          {/* CATEGORY B: CARD ACCESS */}
          {form.category === 'access' && (
            <>
              <label className="field span-2">
                <span>{lang === 'id' ? 'Nama Kartu Akses *' : 'Access Card Name *'}</span>
                <input
                  type="text"
                  required
                  placeholder={lang === 'id' ? 'Contoh: Akses Apartemen Unit 12B, Kartu Parkir Kantor' : 'e.g. Office Access Card'}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  autoFocus
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Gedung / Properti / Lokasi' : 'Building / Location'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: Apartemen Senopati, Menara BCA' : 'e.g. Cyber Tower'}
                  value={form.location || form.bank_name}
                  onChange={(e) => {
                    update('location', e.target.value)
                    update('bank_name', e.target.value)
                    update('issuer', e.target.value)
                  }}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Tipe Akses' : 'Access Type'}</span>
                <select
                  value={form.card_brand || 'Pintu Masuk'}
                  onChange={(e) => update('card_brand', e.target.value)}
                >
                  <option value="Pintu Masuk">{lang === 'id' ? 'Pintu Masuk / Kamar' : 'Entrance / Room'}</option>
                  <option value="Lift & Lantai">{lang === 'id' ? 'Lift & Akses Lantai' : 'Elevator / Floor'}</option>
                  <option value="Gerbang Parkir">{lang === 'id' ? 'Gerbang Parkir / Kendaraan' : 'Parking Gate'}</option>
                  <option value="Akses Master">{lang === 'id' ? 'Akses Gedung Master' : 'Master Key'}</option>
                  <option value="RFID / NFC">{lang === 'id' ? 'Tag RFID / NFC' : 'RFID / NFC Tag'}</option>
                </select>
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'ID Fisik Kartu / No. Seri' : 'Physical Card ID'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: ID-90281 atau nomor tercetak' : 'Printed Card ID'}
                  value={form.card_number}
                  onChange={(e) => update('card_number', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Lantai / Unit / Kamar' : 'Floor / Unit / Room'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: Lantai 12 / Unit 12B' : 'e.g. Level 12 / Room 12B'}
                  value={form.account_owner}
                  onChange={(e) => update('account_owner', e.target.value)}
                />
              </label>

              {/* NFC reader for access cards */}
              <div className="field span-2">
                <span>{lang === 'id' ? 'NFC UID (Dianjurkan untuk Kartu Akses)' : 'NFC UID (Recommended for Access Cards)'}</span>
                <div className="input-with-button-row">
                  <input
                    type="text"
                    placeholder="Contoh: 04:A2:3B:1F:89"
                    value={form.nfc_uid}
                    onChange={(e) => update('nfc_uid', e.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary-button pill-button-sm"
                    onClick={() => setIsNfcReaderOpen(true)}
                  >
                    <Radio size={13} />
                    <span>{lang === 'id' ? 'Baca Tag NFC' : 'Read NFC'}</span>
                  </button>
                </div>
                <span className="field-hint">
                  {lang === 'id'
                    ? 'Tempelkan kartu akses fisik ke belakang ponsel untuk membaca UID chip secara otomatis.'
                    : 'Tap your physical access card to phone to scan chip UID.'}
                </span>
              </div>
            </>
          )}

          {/* CATEGORY C: MEMBERSHIP */}
          {form.category === 'membership' && (
            <>
              <label className="field span-2">
                <span>{lang === 'id' ? 'Nama Toko / Brand / Merchant *' : 'Merchant / Store Name *'}</span>
                <input
                  type="text"
                  required
                  placeholder={lang === 'id' ? 'Contoh: Starbucks Rewards, MAPCLUB, Indomaret Poinku' : 'e.g. Starbucks Rewards'}
                  value={form.name}
                  onChange={(e) => {
                    update('name', e.target.value)
                    if (!form.bank_name) update('bank_name', e.target.value)
                  }}
                  autoFocus
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Nomor Member / ID Pelanggan *' : 'Member ID / Customer Number *'}</span>
                <input
                  type="text"
                  required
                  placeholder="9823 4819 2011"
                  value={form.card_number}
                  onChange={(e) => {
                    update('card_number', e.target.value)
                    if (!form.barcode_value) update('barcode_value', e.target.value)
                  }}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Nama Member / Terdaftar' : 'Member Name'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Nama yang terdaftar' : 'Registered member name'}
                  value={form.account_owner}
                  onChange={(e) => update('account_owner', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Tingkat / Tier Keanggotaan' : 'Membership Tier'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: Gold, Platinum, VIP, Regular' : 'e.g. Gold, Platinum, VIP'}
                  value={form.membership_tier || form.card_brand}
                  onChange={(e) => {
                    update('membership_tier', e.target.value)
                    update('card_brand', e.target.value)
                  }}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Masa Berlaku Member' : 'Expiry Date'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: 31/12/2026 atau Seumur Hidup' : 'e.g. Lifetime or 2026-12-31'}
                  value={form.expiry}
                  onChange={(e) => update('expiry', e.target.value)}
                />
              </label>

              {/* Barcode / QR Kasir */}
              <div className="form-group span-2">
                <span className="field-label-text">{lang === 'id' ? 'Format Barcode / QR Kasir' : 'Barcode Format'}</span>
                <div className="toggle-segmented-row">
                  <button
                    type="button"
                    className={`segment-btn ${form.barcode_type === 'code128' ? 'active' : ''}`}
                    onClick={() => update('barcode_type', 'code128')}
                  >
                    <QrCode size={14} />
                    <span>{t('card_barcode_type_code128')} (Garis Kasir)</span>
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${form.barcode_type === 'qr' ? 'active' : ''}`}
                    onClick={() => update('barcode_type', 'qr')}
                  >
                    <QrCode size={14} />
                    <span>{t('card_barcode_type_qr')} (Kotak QR)</span>
                  </button>
                </div>
              </div>

              <label className="field span-2">
                <span>{lang === 'id' ? 'Nilai / Kode Barcode Kasir' : 'Barcode Value'}</span>
                <div className="input-with-button-row">
                  <input
                    type="text"
                    placeholder={lang === 'id' ? 'Masukkan angka barcode atau scan kartu fisik...' : 'Enter barcode or scan...'}
                    value={form.barcode_value || form.card_number}
                    onChange={(e) => update('barcode_value', e.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary-button pill-button-sm"
                    onClick={() => setIsCameraScannerOpen(true)}
                    title="Scan dengan kamera"
                  >
                    <Camera size={13} />
                    <span>{lang === 'id' ? 'Scan Kamera' : 'Scan'}</span>
                  </button>
                </div>
                <span className="field-hint">
                  {lang === 'id'
                    ? 'Scan barcode kartu fisik Anda agar kasir dapat langsung memindai layar ponsel Anda.'
                    : 'Scan barcode so cashier scanners can read your screen.'}
                </span>
              </label>
            </>
          )}

          {/* CATEGORY D: HEALTH & INSURANCE */}
          {form.category === 'health' && (
            <>
              <label className="field span-2">
                <span>{lang === 'id' ? 'Nama Asuransi / Program *' : 'Insurance / Program Name *'}</span>
                <input
                  type="text"
                  required
                  placeholder={lang === 'id' ? 'Contoh: BPJS Kesehatan, Prudential PruPrime, Allianz' : 'e.g. BPJS Health'}
                  value={form.name}
                  onChange={(e) => {
                    update('name', e.target.value)
                    if (!form.bank_name) update('bank_name', e.target.value)
                  }}
                  autoFocus
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Nomor Peserta / No. Polis *' : 'Policy / Participant Number *'}</span>
                <input
                  type="text"
                  required
                  placeholder="0001234567890"
                  value={form.card_number}
                  onChange={(e) => {
                    update('card_number', e.target.value)
                    if (!form.barcode_value) update('barcode_value', e.target.value)
                  }}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Nama Peserta / Tertanggung *' : 'Participant Name *'}</span>
                <input
                  type="text"
                  required
                  placeholder={lang === 'id' ? 'Nama lengkap sesuai kartu' : 'Full name'}
                  value={form.account_owner}
                  onChange={(e) => update('account_owner', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Faskes Tingkat 1 / RS Rekanan' : 'Primary Clinic / Hospital'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Puskesmas Gambir / RS Siloam' : 'Primary clinic name'}
                  value={form.faskes || ''}
                  onChange={(e) => update('faskes', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Kelas Perawatan / Tipe Plan' : 'Plan / Room Class'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: Kelas 1, VIP, Cashless' : 'e.g. Class 1, VIP'}
                  value={form.card_brand || ''}
                  onChange={(e) => update('card_brand', e.target.value)}
                />
              </label>

              <label className="field span-2">
                <span>{lang === 'id' ? 'Masa Berlaku Polis' : 'Policy Validity'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: Seumur Hidup atau YYYY-MM-DD' : 'e.g. Lifetime or 2026-12-31'}
                  value={form.expiry}
                  onChange={(e) => update('expiry', e.target.value)}
                />
              </label>

              <label className="field span-2">
                <span>{lang === 'id' ? 'Barcode / QR Kartu (Opsional)' : 'Barcode / QR Card (Optional)'}</span>
                <div className="input-with-button-row">
                  <input
                    type="text"
                    placeholder={lang === 'id' ? 'Nilai barcode kartu BPJS / Asuransi...' : 'Barcode value...'}
                    value={form.barcode_value || form.card_number}
                    onChange={(e) => update('barcode_value', e.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary-button pill-button-sm"
                    onClick={() => setIsCameraScannerOpen(true)}
                    title="Scan dengan kamera"
                  >
                    <Camera size={13} />
                    <span>{lang === 'id' ? 'Scan Kamera' : 'Scan'}</span>
                  </button>
                </div>
              </label>
            </>
          )}

          {/* CATEGORY E: VOUCHERS & GIFTS */}
          {form.category === 'voucher' && (
            <>
              <label className="field span-2">
                <span>{lang === 'id' ? 'Nama Merchant / Toko / Penerbit *' : 'Merchant / Store Name *'}</span>
                <input
                  type="text"
                  required
                  placeholder={lang === 'id' ? 'Contoh: MAP Gift Voucher, Sodexo Pass, Kupon Starbucks' : 'e.g. MAP Gift Voucher'}
                  value={form.name}
                  onChange={(e) => {
                    update('name', e.target.value)
                    if (!form.bank_name) update('bank_name', e.target.value)
                  }}
                  autoFocus
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Kode Voucher / Serial Number *' : 'Voucher Code / Serial No. *'}</span>
                <input
                  type="text"
                  required
                  placeholder="MAP-9921-8812"
                  value={form.card_number}
                  onChange={(e) => {
                    update('card_number', e.target.value)
                    if (!form.barcode_value) update('barcode_value', e.target.value)
                  }}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Nilai / Nominal Voucher' : 'Voucher Value / Discount'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: Rp 100.000 atau Diskon 50%' : 'e.g. Rp 100.000'}
                  value={form.voucher_value || form.card_brand}
                  onChange={(e) => {
                    update('voucher_value', e.target.value)
                    update('card_brand', e.target.value)
                  }}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Masa Berlaku / Kedaluwarsa' : 'Expiry Date'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: 31 Des 2026' : 'e.g. 31 Dec 2026'}
                  value={form.expiry}
                  onChange={(e) => update('expiry', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'PIN / Kode Keamanan (Opsional)' : 'PIN / Security Code (Optional)'}</span>
                <input
                  type="text"
                  placeholder="PIN pelindung jika ada"
                  value={form.account_owner}
                  onChange={(e) => update('account_owner', e.target.value)}
                />
              </label>

              <label className="field span-2">
                <span>{lang === 'id' ? 'Barcode / QR Voucher untuk Kasir' : 'Barcode / QR for Cashier'}</span>
                <div className="input-with-button-row">
                  <input
                    type="text"
                    placeholder={lang === 'id' ? 'Masukkan kode barcode voucher kasir...' : 'Enter voucher barcode...'}
                    value={form.barcode_value || form.card_number}
                    onChange={(e) => update('barcode_value', e.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary-button pill-button-sm"
                    onClick={() => setIsCameraScannerOpen(true)}
                    title="Scan dengan kamera"
                  >
                    <Camera size={13} />
                    <span>{lang === 'id' ? 'Scan Kamera' : 'Scan'}</span>
                  </button>
                </div>
              </label>
            </>
          )}

          {/* CATEGORY F: OTHER CARDS */}
          {form.category === 'other' && (
            <>
              <label className="field span-2">
                <span>{lang === 'id' ? 'Nama Kartu *' : 'Card Name *'}</span>
                <input
                  type="text"
                  required
                  placeholder={lang === 'id' ? 'Contoh: Kartu Mahasiswa UI, Perpustakaan Nasional' : 'e.g. Student ID'}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  autoFocus
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Penerbit / Institusi' : 'Issuer / Institution'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Nama universitas / organisasi' : 'Institution name'}
                  value={form.bank_name}
                  onChange={(e) => {
                    update('bank_name', e.target.value)
                    update('issuer', e.target.value)
                  }}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Nomor Kartu / ID' : 'Card ID Number'}</span>
                <input
                  type="text"
                  placeholder="Nomor ID atau Nomor Anggota"
                  value={form.card_number}
                  onChange={(e) => update('card_number', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Nama Pemegang Kartu' : 'Cardholder Name'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Nama pemilik' : 'Owner name'}
                  value={form.account_owner}
                  onChange={(e) => update('account_owner', e.target.value)}
                />
              </label>

              <label className="field">
                <span>{lang === 'id' ? 'Masa Berlaku' : 'Expiry'}</span>
                <input
                  type="text"
                  placeholder={lang === 'id' ? 'Contoh: 2026-12-31 atau Seumur Hidup' : 'Expiry'}
                  value={form.expiry}
                  onChange={(e) => update('expiry', e.target.value)}
                />
              </label>

              <label className="field span-2">
                <span>{lang === 'id' ? 'Nilai / Data Barcode / QR (Opsional)' : 'Barcode / QR Data (Optional)'}</span>
                <div className="input-with-button-row">
                  <input
                    type="text"
                    placeholder={lang === 'id' ? 'Masukkan angka atau teks barcode...' : 'Enter barcode text...'}
                    value={form.barcode_value}
                    onChange={(e) => update('barcode_value', e.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary-button pill-button-sm"
                    onClick={() => setIsCameraScannerOpen(true)}
                    title="Pindai kamera"
                  >
                    <Camera size={13} />
                    <span>{lang === 'id' ? 'Scan' : 'Scan'}</span>
                  </button>
                </div>
              </label>

              <label className="field span-2">
                <span>{lang === 'id' ? 'NFC UID (Opsional)' : 'NFC UID (Optional)'}</span>
                <div className="input-with-button-row">
                  <input
                    type="text"
                    placeholder="Contoh: 04:A2:3B:1F"
                    value={form.nfc_uid}
                    onChange={(e) => update('nfc_uid', e.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary-button pill-button-sm"
                    onClick={() => setIsNfcReaderOpen(true)}
                  >
                    <Radio size={13} />
                    <span>NFC</span>
                  </button>
                </div>
              </label>
            </>
          )}

          {/* 4. COMMON NOTES & PRIVACY */}
          <label className="field span-2">
            <span>{lang === 'id' ? 'Catatan Tambahan' : 'Additional Notes'}</span>
            <textarea
              rows={2}
              placeholder={
                form.category === 'access'
                  ? (lang === 'id' ? 'PIN pos satpam, jam buka gerbang, kontak darurat pengelola...' : 'Gate codes, security hours...')
                  : form.category === 'health'
                    ? (lang === 'id' ? 'Nomor hotline darurat RS 24 jam, nama agen, cara klaim...' : 'Hospital emergency hotline, claim info...')
                    : form.category === 'membership'
                      ? (lang === 'id' ? 'Nomor HP terdaftar kasir, info diskon khusus...' : 'Registered phone for cashier...')
                      : form.category === 'voucher'
                        ? (lang === 'id' ? 'Syarat & ketentuan, minimal pembelian, lokasi cabang...' : 'Terms and conditions...')
                        : (lang === 'id' ? 'Catatan darurat atau informasi penting...' : 'Additional notes...')
              }
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </label>

          <div className="privacy-toggle-box span-2">
            <div className="privacy-toggle-text">
              <strong>{lang === 'id' ? 'Sensor Nomor Sensitif' : 'Mask Sensitive Numbers'}</strong>
              <span>{lang === 'id' ? 'Secara otomatis menyamarkan angka kartu pada dasbor (•••• •••• ••88).' : 'Automatically mask digits on dashboard.'}</span>
            </div>
            <input
              type="checkbox"
              checked={form.privacy_mask}
              onChange={(e) => update('privacy_mask', e.target.checked)}
            />
          </div>

          <div className="zero-knowledge-notice span-2">
            <ShieldCheck size={16} />
            <span>
              {lang === 'id'
                ? 'Seluruh data kartu dienkripsi secara Zero-Knowledge menggunakan kunci enkripsi brankas Anda (AES-256-GCM).'
                : 'All card data is end-to-end encrypted with zero-knowledge (AES-256-GCM).'}
            </span>
          </div>

          {/* 5. STANDARD MODAL ACTIONS */}
          <div className="modal-actions span-2">
            <button
              type="button"
              className="secondary-button pill-button"
              onClick={onClose}
            >
              {t('action_cancel')}
            </button>
            <button
              type="submit"
              className="primary-button pill-button"
            >
              <Plus size={16} />
              <span>{isEditing ? (lang === 'id' ? 'Simpan Perubahan' : 'Save Changes') : (lang === 'id' ? '+ Tambah Kartu' : '+ Add Card')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Camera Barcode / QR Scanner Modal */}
      {isCameraScannerOpen && (
        <CardCameraScannerModal
          onClose={() => setIsCameraScannerOpen(false)}
          onScan={handleCameraScanResult}
          lang={lang}
        />
      )}

      {/* NFC Reader Modal */}
      {isNfcReaderOpen && (
        <CardNfcReaderModal
          onClose={() => setIsNfcReaderOpen(false)}
          onSaveUid={handleNfcResult}
          lang={lang}
        />
      )}
    </>
  )
}
