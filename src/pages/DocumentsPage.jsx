import { useState, useMemo, useEffect } from 'react'
import DocumentCard from '../components/DocumentCard'
import DocumentQrModal from '../components/DocumentQrModal'
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  QrCode,
  FileText,
  ChevronLeft,
  ChevronRight
} from '../components/Icons'
import { DOCUMENT_CATEGORIES } from '../lib/documents'

const CARDS_PER_PAGE = 6 // 3 x 2 grid

export default function DocumentsPage({
  documents = [],
  onAdd,
  onOpen,
  onDownload
}) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedQrDoc, setSelectedQrDoc] = useState(null)

  // Persist viewMode preference: 'preview' | 'hide'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('kept_doc_view_mode') || 'preview'
  })

  function handleToggleViewMode() {
    const nextMode = viewMode === 'preview' ? 'hide' : 'preview'
    setViewMode(nextMode)
    localStorage.setItem('kept_doc_view_mode', nextMode)
  }

  // Filter documents by search and category
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
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
      setSelectedQrDoc(filtered[0])
    }
  }

  return (
    <div className="page-shell documents-page">
      {/* Clean Header matching User Mockup */}
      <div className="doc-page-header">
        <div className="doc-page-title-row">
          <h1 className="doc-page-title">Documents</h1>
          <button
            type="button"
            className="doc-add-circle-btn"
            onClick={onAdd}
            aria-label="Tambah Dokumen"
            title="Tambah Dokumen"
          >
            <Plus size={18} strokeWidth={2.2} />
          </button>
        </div>

        {/* Sub-row: Total count & Compact Icon Controls */}
        <div className="doc-page-subrow">
          <div className="doc-subrow-left">
            <span className="doc-count-badge">
              {filtered.length} {filtered.length === 1 ? 'document' : 'documents'}
            </span>

            {/* Icon buttons without text, saving space as requested */}
            <div className="doc-subrow-controls">
              <button
                type="button"
                className={`doc-icon-control-btn ${viewMode === 'preview' ? 'active' : ''}`}
                onClick={handleToggleViewMode}
                title={
                  viewMode === 'preview'
                    ? 'Mode Tampilan: Preview Aktif (Ketuk untuk Hide Preview)'
                    : 'Mode Tampilan: Hide Preview Aktif (Ketuk untuk Tampilkan Preview)'
                }
                aria-label={
                  viewMode === 'preview'
                    ? 'Sembunyikan Preview'
                    : 'Tampilkan Preview'
                }
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
                title="Tampilkan QR Code Dokumen"
                aria-label="Tampilkan QR Code Dokumen"
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
              placeholder="Cari..."
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      {documents.length > 0 && (
        <div className="doc-category-bar">
          <button
            type="button"
            className={`doc-cat-pill ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            Semua ({documents.length})
          </button>
          {DOCUMENT_CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.category === cat.id).length
            if (count === 0 && activeCategory !== cat.id) return null
            return (
              <button
                key={cat.id}
                type="button"
                className={`doc-cat-pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name} ({count})
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
              ? 'Tidak ada dokumen yang sesuai filter.'
              : 'Belum ada dokumen tersimpan.'}
          </strong>
          <span>
            {query || activeCategory !== 'all'
              ? 'Coba ganti kata kunci pencarian atau pilih kategori lain.'
              : 'Unggah KTP, SIM, Paspor, KK, atau Kontrak Anda dalam brankas terenkripsi.'}
          </span>
          <button
            type="button"
            className="primary-button pill-button mt-sm"
            onClick={onAdd}
          >
            <Plus size={16} /> Tambah Dokumen
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
                onOpen={onOpen}
                onDownload={onDownload}
                onQr={setSelectedQrDoc}
              />
            ))}
          </div>

          {/* Pagination Controls (6 cards per page) */}
          {totalPages > 1 && (
            <div className="doc-pagination-bar">
              <button
                type="button"
                className="doc-page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
                <span>Sebelumnya</span>
              </button>

              <div className="doc-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`doc-page-num-pill ${
                      currentPage === pageNum ? 'active' : ''
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="doc-page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Halaman Selanjutnya"
              >
                <span>Selanjutnya</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* QR Code Modal */}
      {selectedQrDoc && (
        <DocumentQrModal
          doc={selectedQrDoc}
          onClose={() => setSelectedQrDoc(null)}
        />
      )}
    </div>
  )
}
