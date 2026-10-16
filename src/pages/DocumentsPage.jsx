import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import DocumentCard from '../components/DocumentCard'

const DocumentQrModal = lazy(() => import('../components/DocumentQrModal'))
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  QrCode,
  FileText,
  ChevronLeft,
  ChevronRight,
  X
} from '../components/Icons'
import { DOCUMENT_CATEGORIES } from '../lib/documents'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

const CARDS_PER_PAGE = 6 // 3 x 2 grid

export default function DocumentsPage({
  documents = [],
  onAdd,
  onOpen,
  onDownload,
  lang = 'id'
}) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedQrDoc, setSelectedQrDoc] = useState(null)
  const t = (k) => getTranslation(k, lang)

  // Persist viewMode preference: 'preview' | 'hide'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('kept_doc_view_mode') || 'preview'
  })

  function handleToggleViewMode() {
    haptic('light')
    const nextMode = viewMode === 'preview' ? 'hide' : 'preview'
    setViewMode(nextMode)
    localStorage.setItem('kept_doc_view_mode', nextMode)
  }

  // Filter documents by search and category, pinning favorites to top
  const filtered = useMemo(() => {
    const list = documents.filter((doc) => {
      if (activeCategory !== 'all' && doc.category !== activeCategory) {
        return false
      }
      if (!query.trim()) return true
      const q = query.toLowerCase()
      const nameMatch = doc.name?.toLowerCase().includes(q)
      const ownerMatch = doc.owner_name?.toLowerCase().includes(q)
      const numMatch = doc.doc_number?.toLowerCase().includes(q)
      const noteMatch = doc.notes?.toLowerCase().includes(q)
      const typeMatch = doc.doc_type?.toLowerCase().includes(q)

      return nameMatch || ownerMatch || numMatch || noteMatch || typeMatch
    })
    return [...list].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))
  }, [documents, activeCategory, query])

  // Reset to page 1 when query or category changes
  useEffect(() => {
    setCurrentPage(1)
  }, [query, activeCategory])

  // Pagination calculation: 6 cards per page
  const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE))
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE
    return filtered.slice(start, start + CARDS_PER_PAGE)
  }, [filtered, currentPage])

  function handleHeaderQrClick() {
    if (filtered.length > 0) {
      haptic('light')
      setSelectedQrDoc(filtered[0])
    }
  }

  const categoryNameMap = {
    '01_identity': t('doc_cat_identity'),
    '02_education': t('doc_cat_education'),
    '03_mobility': t('doc_cat_mobility'),
    '04_health_assets': t('doc_cat_health'),
    '05_other': t('doc_cat_other')
  }

  return (
    <div className="page-shell documents-page">
      {/* Clean Header matching User Mockup */}
      <div className="doc-page-header">
        <div className="doc-page-title-row">
          <h1 className="doc-page-title">{t('documents_title')}</h1>
          <button
            type="button"
            className="doc-add-circle-btn"
            onClick={() => {
              haptic('light')
              onAdd()
            }}
            aria-label={t('doc_add_title')}
            title={t('doc_add_title')}
          >
            <Plus size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Sub-row: Total count & Compact Icon Controls */}
        <div className="doc-page-subrow">
          <div className="doc-subrow-left">
            <span className="doc-count-badge">
              {filtered.length} {filtered.length === 1 ? t('doc_count_singular') : t('doc_count_plural')}
            </span>

            {/* Icon buttons without text, saving space as requested */}
            <div className="doc-subrow-controls">
              <button
                type="button"
                className={`doc-icon-control-btn ${viewMode === 'preview' ? 'active' : ''}`}
                onClick={handleToggleViewMode}
                title={viewMode === 'preview' ? t('doc_view_hide') : t('doc_view_preview')}
                aria-label={viewMode === 'preview' ? t('doc_view_hide') : t('doc_view_preview')}
              >
                {viewMode === 'preview' ? (
                  <Eye size={15} strokeWidth={2.2} />
                ) : (
                  <EyeOff size={15} strokeWidth={2.2} />
                )}
              </button>

              <button
                type="button"
                className="doc-icon-control-btn"
                onClick={handleHeaderQrClick}
                disabled={filtered.length === 0}
                title="QR Code"
                aria-label="QR Code"
              >
                <QrCode size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {/* Quick search input */}
          <div className="doc-mini-search">
            <Search size={14} />
            <input
              type="search"
              value={query}
              placeholder={t('doc_search_placeholder')}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                className="icon-button-subtle"
                onClick={() => {
                  haptic('light')
                  setQuery('')
                }}
                aria-label="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      {documents.length > 0 && (
        <div className="doc-category-bar">
          <button
            type="button"
            className={`doc-cat-pill ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => {
              haptic('light')
              setActiveCategory('all')
            }}
          >
            {t('filter_all')} ({documents.length})
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.category === cat.id).length
            if (count === 0 && activeCategory !== cat.id) return null
            return (
              <button
                key={cat.id}
                type="button"
                className={`doc-cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => {
                  haptic('light')
                  setActiveCategory(cat.id)
                }}
              >
                {categoryNameMap[cat.id] || cat.name} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="empty-state large doc-empty-state">
          <FileText size={36} strokeWidth={1.7} />
          <strong>
            {query || activeCategory !== 'all'
              ? t('search_empty_title')
              : t('doc_empty_title')}
          </strong>
          <span>
            {query || activeCategory !== 'all'
              ? t('doc_empty_filter')
              : t('doc_empty_desc')}
          </span>
          <button
            type="button"
            className="primary-button pill-button mt-sm"
            onClick={() => {
              haptic('light')
              onAdd()
            }}
          >
            <Plus size={16} /> {t('doc_add_title')}
          </button>
        </div>
      ) : (
        <>
          {/* 3x2 Grid (6 Cards per Page) */}
          <div
            className={`documents-grid-3x2 ${
              viewMode === 'hide' ? 'mode-compact' : 'mode-preview'
            }`}
          >
            {paginatedDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                viewMode={viewMode}
                onOpen={(d) => {
                  haptic('medium')
                  onOpen(d)
                }}
                onDownload={onDownload}
                onQr={(d) => {
                  haptic('light')
                  setSelectedQrDoc(d)
                }}
                lang={lang}
              />
            ))}
          </div>

          {/* Pagination Controls (6 cards per page) */}
          {totalPages > 1 && (
            <div className="doc-pagination-bar">
              <button
                type="button"
                className="doc-page-btn"
                onClick={() => {
                  haptic('light')
                  setCurrentPage((p) => Math.max(1, p - 1))
                }}
                disabled={currentPage === 1}
                aria-label={lang === 'id' ? 'Halaman Sebelumnya' : 'Previous page'}
              >
                <ChevronLeft size={16} />
                <span>{lang === 'id' ? 'Sebelumnya' : 'Previous'}</span>
              </button>

              <div className="doc-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`doc-page-num-pill ${
                      currentPage === pageNum ? 'active' : ''
                    }`}
                    onClick={() => {
                      haptic('light')
                      setCurrentPage(pageNum)
                    }}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="doc-page-btn"
                onClick={() => {
                  haptic('light')
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }}
                disabled={currentPage === totalPages}
                aria-label={lang === 'id' ? 'Halaman Selanjutnya' : 'Next page'}
              >
                <span>{lang === 'id' ? 'Selanjutnya' : 'Next'}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* QR Code Modal */}
      {selectedQrDoc && (
        <Suspense fallback={null}>
          <DocumentQrModal
            doc={selectedQrDoc}
            onClose={() => setSelectedQrDoc(null)}
            lang={lang}
          />
        </Suspense>
      )}
    </div>
  )
}
