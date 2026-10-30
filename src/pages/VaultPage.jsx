import React from 'react'
import {
  Search,
  Plus,
  FolderLock,
  Globe,
  Instagram,
  KeyRound,
  StickyNote,
  Star,
  X
} from '../components/Icons'
import PasswordCard from '../components/PasswordCard'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

export default function VaultPage({ items = [], onAdd, onOpen, lang = 'id' }) {
  const [filter, setFilter] = React.useState('all')
  const [query, setQuery] = React.useState('')
  const t = (k) => getTranslation(k, lang)

  const handleOpenItem = React.useCallback((targetItem) => {
    haptic('medium')
    onOpen?.(targetItem)
  }, [onOpen])

  const filters = React.useMemo(() => [
    { id: 'all', label: t('filter_all'), icon: KeyRound },
    { id: 'favorite', label: lang === 'id' ? 'Favorit' : 'Favorites', icon: Star },
    { id: 'social', label: t('filter_social'), icon: Instagram },
    { id: 'web', label: t('filter_web'), icon: Globe },
    { id: 'project', label: t('filter_project'), icon: FolderLock },
    { id: 'secure_note', label: t('filter_notes'), icon: StickyNote }
  ], [lang])

  const counts = React.useMemo(() => ({
    all: items.filter((item) => item.item_type !== 'bank_card' && item.item_type !== 'document').length,
    favorite: items.filter((item) => item.favorite).length,
    social: items.filter((item) => item.category === 'social').length,
    web: items.filter((item) => item.category === 'web').length,
    project: items.filter((item) => item.category === 'project').length,
    secure_note: items.filter((item) => item.item_type === 'secure_note').length
  }), [items])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((item) => {
        let matchesFilter = true
        if (filter === 'all') {
          matchesFilter = item.item_type !== 'bank_card' && item.item_type !== 'document'
        } else if (filter === 'favorite') {
          matchesFilter = Boolean(item.favorite)
        } else {
          matchesFilter = item.category === filter
        }

        if (!matchesFilter) return false
        if (!q) return true

        const haystack = `
          ${item.name || ''}
          ${item.username || ''}
          ${item.url || ''}
          ${item.website || ''}
          ${item.environment || ''}
          ${item.service || ''}
        `.toLowerCase()

        return haystack.includes(q)
      })
      .sort((a, b) => {
        // Pin favorites to top
        if (a.favorite && !b.favorite) return -1
        if (!a.favorite && b.favorite) return 1
        return 0
      })
  }, [items, filter, query])

  return (
    <div className="page-shell">
      <section className="hero-row">
        <div>
          <div className="eyebrow">{t('vault_eyebrow')}</div>
          <h1>{t('vault_heading')}</h1>
        </div>

        <button
          className="quick-add pill-button"
          onClick={() => {
            haptic('light')
            onAdd()
          }}
        >
          <Plus size={16} />
          {t('add_item')}
        </button>
      </section>

      {/* Search */}
      <div className="search-box">
        <Search size={18} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('vault_search_placeholder')}
        />
        {query ? (
          <button
            type="button"
            className="icon-button-subtle"
            onClick={() => {
              haptic('light')
              setQuery('')
            }}
            aria-label="Hapus pencarian"
          >
            <X size={13} />
          </button>
        ) : (
          <span>{filtered.length}</span>
        )}
      </div>

      {/* Filters */}
      <div className="filter-row">
        {filters.map(({ id, label, icon: Icon }) => (
          <button
            className={filter === id ? 'filter active' : 'filter'}
            key={id}
            onClick={() => {
              haptic('light')
              setFilter(id)
            }}
          >
            <Icon size={15} />
            <span>{label}</span>
            <small>{counts[id] || 0}</small>
          </button>
        ))}
      </div>

      {/* Vault list */}
      <section className="list-section">
        {filtered.length ? (
          filtered.map((item) => {
            if (item.item_type === 'secure_note') {
              return (
                <button
                  key={item.id}
                  className="vault-list-card"
                  onClick={() => {
                    haptic('medium')
                    onOpen(item)
                  }}
                >
                  <div className="item-icon tone-neutral">
                    <StickyNote size={18} />
                  </div>

                  <div className="item-copy">
                    <div className="item-title-row">
                      <strong>{item.name}</strong>
                      <span className="category-chip">
                        {t('type_note')}
                      </span>
                    </div>

                    <span className="item-secondary">
                      {item.notes ? item.notes.slice(0, 50) : t('type_note')}
                    </span>
                  </div>
                </button>
              )
            }

            return (
              <PasswordCard
                key={item.id}
                item={item}
                password={item.password || ''}
                onOpen={handleOpenItem}
                lang={lang}
              />
            )
          })
        ) : (
          <div className="empty-state large">
            <KeyRound size={20} />
            <strong>
              {query ? t('search_empty_title') : t('vault_empty_title')}
            </strong>
            <span>
              {query ? t('search_empty_desc') : t('vault_empty_desc')}
            </span>
          </div>
        )}
      </section>
    </div>
  )
}