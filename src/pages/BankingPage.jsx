import { useMemo, useState } from 'react'
import BankCard from '../components/BankCard'
import { Plus, CreditCard, ShieldCheck, ChevronRight } from '../components/Icons'
import { getTranslation } from '../lib/i18n'
import { haptic } from '../lib/haptics'

export default function BankingPage({ banks = [], styleMode, onAdd, onOpen, lang = 'id' }) {
  const [index, setIndex] = useState(0)
  const active = banks[index]
  const go = (direction) => setIndex((current) => (current + direction + banks.length) % banks.length)
  const t = (k) => getTranslation(k, lang)

  return (
    <div className="page-shell banking-page">
      <section className="hero-row banking-heading">
        <div>
          <div className="eyebrow">{t('banking_eyebrow')}</div>
          <h1>{t('banking_heading')}</h1>
        </div>
        <button
          className="quick-add pill-button"
          onClick={() => {
            haptic('light')
            onAdd()
          }}
        >
          <Plus size={16} /> {t('add_card')}
        </button>
      </section>

      {banks.length === 0 ? (
        <div className="empty-state large">
          <ShieldCheck size={28} />
          <strong>{t('no_cards_yet')}</strong>
          <span>{t('no_cards_desc')}</span>
          <button
            className="primary-button pill-button"
            onClick={() => {
              haptic('light')
              onAdd()
            }}
            style={{ marginTop: '12px' }}
          >
            <Plus size={16} /> {t('add_first_card')}
          </button>
        </div>
      ) : (
        <>
          <div className="bank-stack-wrapper">
            <div className="bank-stack">
              {[...banks].map((bank, i) => {
                const position = (i - index + banks.length) % banks.length
                return (
                  <BankCard
                    key={bank.id}
                    bank={bank}
                    styleMode={styleMode}
                    index={position}
                    total={banks.length}
                    cardIndex={i + 1}
                    onSwipe={(dir) => go(dir === 'left' ? 1 : -1)}
                    onCardClick={() => onOpen(bank)}
                  />
                )
              })}
            </div>
          </div>

          <div className="bank-actions-row">
            <button
              className="open-card-button pill-button"
              onClick={() => {
                haptic('light')
                onOpen(active)
              }}
            >
              <CreditCard size={15} />
              <span>{t('card_details')}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
