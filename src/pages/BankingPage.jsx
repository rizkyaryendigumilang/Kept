import { useMemo, useState } from 'react'
import BankCard from '../components/BankCard'
import { Plus, CreditCard, ShieldCheck, ChevronRight } from '../components/Icons'

export default function BankingPage({ banks, styleMode, onAdd, onOpen }) {
  const [index, setIndex] = useState(0)
  const active = banks[index]
  const go = (direction) => setIndex((current) => (current + direction + banks.length) % banks.length)

  return (
    <div className="page-shell banking-page">
      <section className="hero-row banking-heading">
        <div>
          <div className="eyebrow">Account</div>
          <h1>Kartu Anda, sekali usap.</h1>
        </div>
        <button className="quick-add pill-button" onClick={onAdd}>
          <Plus size={16} /> Tambah Kartu
        </button>
      </section>

      {banks.length === 0 ? (
        <div className="empty-state large">
          <ShieldCheck size={28} />
          <strong>Belum ada kartu tersimpan.</strong>
          <span>Tambahkan kartu ATM / debit / kredit pertama Anda untuk memulai dompet digital.</span>
          <button className="primary-button pill-button" onClick={onAdd} style={{ marginTop: '12px' }}>
            <Plus size={16} /> Tambah Kartu Pertama
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
            <button className="open-card-button pill-button" onClick={() => onOpen(active)}>
              <CreditCard size={15} />
              <span>Detail Kartu</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
