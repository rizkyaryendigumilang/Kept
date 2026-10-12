import React from 'react'

import {
  Search,
  Plus,
  FolderLock,
  Globe,
  Instagram,
  KeyRound,
  StickyNote
} from '../components/Icons'

import PasswordCard from '../components/PasswordCard'

const filters = [
  { id: 'all', label: 'All', icon: KeyRound },
  { id: 'social', label: 'Social Media', icon: Instagram },
  { id: 'web', label: 'Web Password', icon: Globe },
  { id: 'project', label: 'Project Password', icon: FolderLock },
  { id: 'secure_note', label: 'Secure Note', icon: StickyNote }
]

export default function VaultPage({ items, onAdd, onOpen }) {
  const [filter, setFilter] = React.useState('all')
  const [query, setQuery] = React.useState('')

  const filtered = items.filter((item) => {
    const matchesFilter =
      filter === 'all'
        ? item.item_type !== 'bank_card'
        : item.category === filter

    const haystack = `
      ${item.name || ''}
      ${item.username || ''}
      ${item.url || ''}
      ${item.website || ''}
      ${item.environment || ''}
      ${item.service || ''}
    `.toLowerCase()

    return matchesFilter && haystack.includes(query.toLowerCase())
  })

  const counts = {
    all: items.filter((item) => item.item_type !== 'bank_card').length,
    social: items.filter((item) => item.category === 'social').length,
    web: items.filter((item) => item.category === 'web').length,
    project: items.filter((item) => item.category === 'project').length,
    secure_note: items.filter((item) => item.item_type === 'secure_note').length
  }

  return (
    <div className="page-shell">
      <section className="hero-row">
        <div>
          <div className="eyebrow">Vault</div>

          <h1>Passwords, organized.</h1>

          <p>
            Choose a category or search the whole vault.
          </p>
        </div>

        <button className="quick-add" onClick={onAdd}>
          <Plus size={17} />
          Add
        </button>
      </section>

      {/* Search */}
      <div className="search-box">
        <Search size={18} />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your vault"
        />

        <span>{filtered.length}</span>
      </div>

      {/* Filters */}
      <div className="filter-row">
        {filters.map(({ id, label, icon: Icon }) => (
          <button
            className={filter === id ? 'filter active' : 'filter'}
            key={id}
            onClick={() => setFilter(id)}
          >
            <Icon size={15} />

            <span>{label}</span>

            <small>{counts[id]}</small>
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
                  onClick={() => onOpen(item)}
                >
                  <div className="item-icon tone-neutral">
                    <StickyNote size={18} />
                  </div>

                  <div className="item-copy">
                    <div className="item-title-row">
                      <strong>{item.name}</strong>

                      <span className="category-chip">
                        Secure Note
                      </span>
                    </div>

                    <span className="item-secondary">
                      Private note
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
                onOpen={() => onOpen(item)}
              />
            )
          })
        ) : (
          <div className="empty-state large">
            <KeyRound size={20} />

            <strong>
              {query
                ? 'No matching vault items.'
                : 'No vault items yet.'}
            </strong>

            <span>
              {query
                ? 'Try another search or category.'
                : 'Use Add to create your first password or note.'}
            </span>
          </div>
        )}
      </section>
    </div>
  )
}