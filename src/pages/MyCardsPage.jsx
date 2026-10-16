import { useMemo, useState } from 'react'
import CardSwipeDeck from '../components/CardSwipeDeck'
import CardBarcodeModal from '../components/CardBarcodeModal'
import CardDetailModal from '../components/CardDetailModal'
import AddCardModal from '../components/AddCardModal'
import {
  Plus,
  CreditCard,
  Building2,
  Tag,
  HeartPulse,
  Gift,
  WalletCards,
  ShieldCheck,
  Search,
  X,
  ChevronRight,
  Sparkles,
  QrCode,
  Camera,
  Radio
} from '../components/Icons'
import CardCameraScannerModal from '../components/CardCameraScannerModal'
import CardNfcReaderModal from '../components/CardNfcReaderModal'
import { CARD_CATEGORIES } from '../lib/cards'
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

export default function MyCardsPage({
  cards = [],
  styleMode = 'realistic',
  onAddCard,
  onSaveCard,
  onDeleteCard,
  onToggleFavorite,
  lang = 'id'
}) {
  const t = (k) => getTranslation(k, lang)

  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [deckIndex, setDeckIndex] = useState(0)

  // Modals state
  const [barcodeModalCard, setBarcodeModalCard] = useState(null)
  const [detailModalCard, setDetailModalCard] = useState(null)
  const [editingCard, setEditingCard] = useState(null)
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [addCategoryPreset, setAddCategoryPreset] = useState('bank')
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false)
  const [isNfcReaderOpen, setIsNfcReaderOpen] = useState(false)
  const [addCardInitialData, setAddCardInitialData] = useState(null)

  const handlePageCameraScan = (res) => {
    setIsCameraScannerOpen(false)
    setAddCardInitialData({
      category: selectedCategory !== 'all' ? selectedCategory : 'membership',
      barcode_value: res.value,
      barcode_type: res.type || 'code128',
      name: `Kartu ${res.type === 'qr' ? 'QR' : 'Barcode'}`
    })
    setIsAddingCard(true)
  }

  const handlePageNfcScan = (tag) => {
    setIsNfcReaderOpen(false)
    setAddCardInitialData({
      category: 'access',
      nfc_uid: tag.uid,
      name: 'Kartu Akses NFC'
    })
    setIsAddingCard(true)
  }

  // Filter cards by category & search query
  const filteredCards = useMemo(() => {
    let result = cards

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((c) => (c.category || 'bank') === selectedCategory)
    }

    // Search query filter
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter((c) => {
        const name = (c.name || '').toLowerCase()
        const bank = (c.bank_name || c.issuer || '').toLowerCase()
        const owner = (c.account_owner || '').toLowerCase()
        const num = (c.card_number || c.account_number || '').toLowerCase()
        const barcode = (c.barcode_value || '').toLowerCase()
        const nfc = (c.nfc_uid || '').toLowerCase()
        const notes = (c.notes || '').toLowerCase()
        return (
          name.includes(q) ||
          bank.includes(q) ||
          owner.includes(q) ||
          num.includes(q) ||
          barcode.includes(q) ||
          nfc.includes(q) ||
          notes.includes(q)
        )
      })
    }

    // Sort: favorites first, then by updated date or name
    return [...result].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))
  }, [cards, selectedCategory, query])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: cards.length }
    CARD_CATEGORIES.forEach((cat) => {
      counts[cat.id] = cards.filter((c) => (c.category || 'bank') === cat.id).length
    })
    return counts
  }, [cards])

  const safeDeckIndex = filteredCards.length > 0 ? deckIndex % filteredCards.length : 0
  const activeDeckCard = filteredCards[safeDeckIndex]

  const handleCardClick = (card) => {
    setDetailModalCard(card)
  }

  const handleShowBarcode = (card) => {
    setBarcodeModalCard(card)
  }

  const handleOpenAdd = (preferredCategory) => {
    haptic('light')
    setAddCategoryPreset(preferredCategory || (selectedCategory !== 'all' ? selectedCategory : 'bank'))
    if (onAddCard) {
      onAddCard()
    } else {
      setIsAddingCard(true)
    }
  }

  const selectedCategoryConfig =
    selectedCategory !== 'all' ? CARD_CATEGORIES.find((c) => c.id === selectedCategory) : null

  return (
    <div className="page-shell my-cards-page compact-deck-page">
      {/* Hero Header */}
      <section className="hero-row my-cards-header">
        <div>
          <div className="eyebrow">{t('my_cards_eyebrow')}</div>
          <h1>{t('my_cards_heading')}</h1>
        </div>

        <div className="my-cards-header-actions">
          <button
            type="button"
            className="secondary-button pill-button"
            onClick={() => setIsCameraScannerOpen(true)}
            title="Scan Barcode / QR dengan Kamera"
          >
            <Camera size={15} />
            <span>Scan Barcode/QR</span>
          </button>

          <button
            type="button"
            className="secondary-button pill-button"
            onClick={() => setIsNfcReaderOpen(true)}
            title="Pindai Tag NFC"
          >
            <Radio size={15} />
            <span>NFC Reader</span>
          </button>

          <button
            type="button"
            className="quick-add pill-button"
            onClick={() => handleOpenAdd(selectedCategory !== 'all' ? selectedCategory : 'bank')}
          >
            <Plus size={16} />
            <span>{t('add_card')}</span>
          </button>
        </div>
      </section>

      {/* Quick Search Bar */}
      {cards.length > 0 && (
        <div className="search-box mb-sm">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setDeckIndex(0)
            }}
            placeholder={t('my_cards_search_placeholder')}
          />
          {query ? (
            <button
              type="button"
              className="icon-button-subtle"
              onClick={() => {
                haptic('light')
                setQuery('')
                setDeckIndex(0)
              }}
              aria-label="Hapus pencarian"
            >
              <X size={13} />
            </button>
          ) : (
            <span className="search-count-pill">{filteredCards.length}</span>
          )}
        </div>
      )}

      {/* 6 Category Filter Pills */}
      {cards.length > 0 && (
        <div className="filter-row card-category-scroll-bar">
          <button
            type="button"
            className={`filter category-pill-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => {
              haptic('light')
              setSelectedCategory('all')
              setDeckIndex(0)
            }}
          >
            <Sparkles size={13} />
            <span>{t('card_cat_all')}</span>
            <span className="pill-count">{categoryCounts.all}</span>
          </button>

          {CARD_CATEGORIES.map((cat) => {
            const CatIcon = CATEGORY_ICON_MAP[cat.id] || CreditCard
            const isSelected = selectedCategory === cat.id
            const count = categoryCounts[cat.id] || 0
            return (
              <button
                key={cat.id}
                type="button"
                className={`filter category-pill-btn ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  haptic('light')
                  setSelectedCategory(cat.id)
                  setDeckIndex(0)
                }}
              >
                <CatIcon size={13} />
                <span>{t(cat.labelKey)}</span>
                {count > 0 && <span className="pill-count">{count}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Content: Empty States or Compact Swipe Deck */}
      {cards.length === 0 ? (
        <div className="empty-state large compact-empty-box">
          <ShieldCheck size={32} />
          <strong>{t('my_cards_empty_title')}</strong>
          <span>{t('my_cards_empty_desc')}</span>
          <button
            type="button"
            className="primary-button pill-button mt-md"
            onClick={() => handleOpenAdd('bank')}
          >
            <Plus size={16} />
            <span>{t('add_first_card')}</span>
          </button>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="empty-state large compact-empty-box">
          {selectedCategoryConfig ? (
            (() => {
              const CatIcon = CATEGORY_ICON_MAP[selectedCategoryConfig.id] || CreditCard
              return <CatIcon size={30} />
            })()
          ) : (
            <Search size={28} />
          )}
          <strong>
            {query
              ? t('my_cards_no_search_results')
              : `Belum ada ${selectedCategoryConfig ? t(selectedCategoryConfig.labelKey) : 'kartu'} tersimpan.`}
          </strong>
          <span>
            {query
              ? 'Coba gunakan kata kunci pencarian yang lain atau reset filter.'
              : 'Tambahkan kartu baru untuk kategori ini ke dompet digital Anda.'}
          </span>
          <div className="empty-actions-row">
            {query && (
              <button
                type="button"
                className="secondary-button pill-button-sm"
                onClick={() => {
                  haptic('light')
                  setQuery('')
                }}
              >
                Reset Pencarian
              </button>
            )}
            <button
              type="button"
              className="primary-button pill-button-sm"
              onClick={() => handleOpenAdd(selectedCategory !== 'all' ? selectedCategory : 'bank')}
            >
              <Plus size={14} />
              <span>Tambah {selectedCategoryConfig ? t(selectedCategoryConfig.labelKey) : 'Kartu'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Compact 3D Swipe Deck */
        <div className="compact-deck-container">
          <CardSwipeDeck
            items={filteredCards}
            currentIndex={safeDeckIndex}
            onIndexChange={(nextIndex) => setDeckIndex(nextIndex)}
            onCardClick={handleCardClick}
            onShowBarcode={handleShowBarcode}
            onToggleFavorite={onToggleFavorite}
            lang={lang}
          />

          {/* Primary Action Buttons beneath deck */}
          {activeDeckCard && (
            <div className="deck-bottom-actions">
              {activeDeckCard.barcode_value && (
                <button
                  type="button"
                  className="secondary-button pill-button"
                  onClick={() => handleShowBarcode(activeDeckCard)}
                >
                  <QrCode size={15} />
                  <span>{t('card_show_barcode')}</span>
                </button>
              )}

              <button
                type="button"
                className="card-details-animated-btn"
                onClick={() => handleCardClick(activeDeckCard)}
              >
                <p data-text={t('card_details')}>{t('card_details')}</p>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Barcode & QR High Contrast Modal */}
      {barcodeModalCard && (
        <CardBarcodeModal
          card={barcodeModalCard}
          onClose={() => setBarcodeModalCard(null)}
          lang={lang}
        />
      )}

      {/* Card Detail Modal */}
      {detailModalCard && (
        <CardDetailModal
          card={detailModalCard}
          onClose={() => setDetailModalCard(null)}
          onEdit={(card) => {
            setDetailModalCard(null)
            setEditingCard(card)
          }}
          onDelete={(id) => {
            if (onDeleteCard) onDeleteCard(id)
          }}
          onShowBarcode={(card) => {
            setDetailModalCard(null)
            setBarcodeModalCard(card)
          }}
          onToggleFavorite={onToggleFavorite}
          lang={lang}
        />
      )}

      {/* Add / Edit Card Wizard Modal */}
      {(isAddingCard || editingCard) && (
        <AddCardModal
          initialCard={editingCard || addCardInitialData || { category: addCategoryPreset }}
          onClose={() => {
            setIsAddingCard(false)
            setEditingCard(null)
            setAddCardInitialData(null)
          }}
          onSubmit={(cardData) => {
            setIsAddingCard(false)
            setEditingCard(null)
            setAddCardInitialData(null)
            if (onSaveCard) {
              onSaveCard(cardData, editingCard ? editingCard.id : null)
            }
          }}
          lang={lang}
        />
      )}

      {/* Camera Barcode / QR Scanner Modal */}
      {isCameraScannerOpen && (
        <CardCameraScannerModal
          onClose={() => setIsCameraScannerOpen(false)}
          onScan={handlePageCameraScan}
          lang={lang}
        />
      )}

      {/* NFC Reader Modal */}
      {isNfcReaderOpen && (
        <CardNfcReaderModal
          onClose={() => setIsNfcReaderOpen(false)}
          onSaveUid={handlePageNfcScan}
          lang={lang}
        />
      )}
    </div>
  )
}
