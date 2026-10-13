import { useState, useEffect, useRef, useMemo } from 'react'
import {
  KeyRound,
  CreditCard,
  FileText,
  Copy,
  Check,
  X,
  ChevronRight,
  ShieldCheck,
  Lock
} from './Icons'
import { haptic } from '../lib/haptics'
import { getTranslation } from '../lib/i18n'

export default function CommandPalette({
  isOpen,
  onClose,
  items = [],
  documents = [],
  banks = [],
  onOpenItem,
  showToast,
  lang = 'id'
}) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copiedId, setCopiedId] = useState(null)
  const inputRef = useRef(null)

  const t = (k) => getTranslation(k, lang)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      haptic('light')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Combine and filter all vault resources
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = []

    // 1. Passwords & Notes
    for (const item of items) {
      if (item.item_type === 'document') continue
      all.push({
        id: item.id,
        name: item.name || 'Untitled',
        type: item.item_type === 'bank_card' ? 'card' : item.item_type === 'secure_note' ? 'note' : 'password',
        subtitle: item.username || item.url || (item.item_type === 'secure_note' ? 'Catatan Rahasia' : 'Akun Web'),
        raw: item,
        secretValue: item.password || item.card_number || ''
      })
    }

    // 2. Bank Accounts
    for (const bank of banks) {
      if (!all.some((a) => a.id === bank.id)) {
        all.push({
          id: bank.id,
          name: bank.bank_name || bank.name || 'Bank Account',
          type: 'card',
          subtitle: bank.account_number ? `No: ${bank.account_number}` : bank.card_number ? `Kartu: •••• ${String(bank.card_number).slice(-4)}` : 'Rekening Bank',
          raw: bank,
          secretValue: bank.card_number || bank.account_number || ''
        })
      }
    }

    // 3. Documents
    for (const doc of documents) {
      all.push({
        id: doc.id,
        name: doc.name || 'Dokumen',
        type: 'document',
        subtitle: doc.categoryLabel || doc.category || 'Berkas Terenkripsi',
        raw: { ...doc, item_type: 'document' },
        secretValue: doc.identifier || ''
      })
    }

    if (!q) {
      return all.slice(0, 8)
    }

    return all.filter((entry) => {
      return (
        entry.name.toLowerCase().includes(q) ||
        (entry.subtitle && entry.subtitle.toLowerCase().includes(q))
      )
    }).slice(0, 15)
  }, [items, documents, banks, query])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0))
        haptic('light')
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0))
        haptic('light')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  function handleSelect(item) {
    haptic('medium')
    onClose()
    if (onOpenItem) {
      onOpenItem(item.raw)
    }
  }

  function handleQuickCopy(e, item) {
    e.stopPropagation()
    if (!item.secretValue) return

    navigator.clipboard.writeText(item.secretValue)
    setCopiedId(item.id)
    haptic('success')
    if (showToast) {
      showToast(t('copied_toast'), 1800)
    }
    setTimeout(() => setCopiedId(null), 1800)
  }

  function renderTypeIcon(type) {
    if (type === 'card') return <CreditCard size={16} />
    if (type === 'document') return <FileText size={16} />
    return <KeyRound size={16} />
  }

  function renderTypeBadge(type) {
    if (type === 'card') return <span className="cmd-type-badge badge-card">{t('type_card')}</span>
    if (type === 'document') return <span className="cmd-type-badge badge-doc">{t('type_document')}</span>
    return <span className="cmd-type-badge badge-pass">{t('type_password')}</span>
  }

  if (!isOpen) return null

  return (
    <div className="command-palette-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="command-palette-modal" onClick={(e) => e.stopPropagation()}>
        {/* User Reference Search Bar: Pill Input with embedded icon */}
        <div className="cmd-search-wrapper">
          <div className="search">
            <input
              ref={inputRef}
              type="text"
              className="search__input"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder={t('search_placeholder')}
              autoComplete="off"
              spellCheck="false"
            />
            {query ? (
              <button
                type="button"
                className="search__clear"
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                aria-label="Clear"
              >
                <X size={15} />
              </button>
            ) : null}
            <button type="button" className="search__button" tabIndex={-1} aria-hidden="true">
              <svg className="search__icon" aria-hidden="true" viewBox="0 0 24 24">
                <g>
                  <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
                </g>
              </svg>
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="cmd-results-list" role="listbox">
          {results.length === 0 ? (
            <div className="cmd-empty-state">
              <ShieldCheck size={28} />
              <strong>{t('search_empty_title')}</strong>
              <span>{t('search_empty_desc')}</span>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex
              const isCopied = copiedId === item.id

              return (
                <div
                  key={item.id}
                  className={`cmd-result-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className={`cmd-row-icon tone-${item.type}`}>
                    {renderTypeIcon(item.type)}
                  </div>

                  <div className="cmd-row-info">
                    <div className="cmd-row-title-row">
                      <strong className="cmd-row-name">{item.name}</strong>
                      {renderTypeBadge(item.type)}
                    </div>
                    <span className="cmd-row-subtitle">{item.subtitle}</span>
                  </div>

                  <div className="cmd-row-actions">
                    {item.secretValue && (
                      <button
                        type="button"
                        className={`cmd-quick-copy ${isCopied ? 'copied' : ''}`}
                        onClick={(e) => handleQuickCopy(e, item)}
                        title={item.type === 'card' ? t('copy_number') : t('copy_password')}
                        aria-label="Salin nilai rahasia"
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        <span className="cmd-copy-label">
                          {isCopied ? t('copied_toast') : item.type === 'card' ? 'Salin No' : 'Salin Sandi'}
                        </span>
                      </button>
                    )}
                    <ChevronRight size={15} className="cmd-chevron" />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="cmd-footer">
          <div className="cmd-shortcuts">
            <span className="cmd-key-combo"><kbd>↑</kbd><kbd>↓</kbd> Navigasi</span>
            <span className="cmd-key-combo"><kbd>↵</kbd> Buka</span>
            <span className="cmd-key-combo"><kbd>Esc</kbd> Tutup</span>
          </div>
          <div className="cmd-brand-tag">
            <Lock size={12} />
            <span>Zero-Knowledge Search</span>
          </div>
        </div>
      </div>
    </div>
  )
}
