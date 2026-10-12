import { useMemo, useState } from 'react'
import BankCard from '../components/BankCard'
import { Plus, Settings, ShieldCheck, ChevronLeft, ChevronRight } from '../components/Icons'

export default function BankingPage({ banks, styleMode, onAdd, onOpen }) {
  const [index, setIndex] = useState(0)
  const active = banks[index]
  const go = (direction) => setIndex((current) => (current + direction + banks.length) % banks.length)
  const stacked = useMemo(() => [...banks].sort((a, b) => a._renderIndex - b._renderIndex), [banks])
  return (
    <div className="page-shell banking-page">
      <section className="hero-row banking-heading">
        <div><div className="eyebrow">Banking</div><h1>Your cards, one swipe away.</h1><p>Drag the top card left or right to switch.</p></div>
        <button className="quick-add" onClick={onAdd}><Plus size={17} /> Add</button>
      </section>
      {banks.length === 0 ? (
        <div className="empty-state large"><ShieldCheck size={20} /><strong>No cards yet.</strong><span>Add a bank / ATM card to start the wallet stack.</span><button className="primary-button" onClick={onAdd}>Add first card</button></div>
      ) : (
        <>
          <div className="bank-stack" onDoubleClick={() => onOpen(active)}>
            {[...banks].map((bank, i) => {
              const position = (i - index + banks.length) % banks.length
              return <BankCard key={bank.id} bank={bank} styleMode={styleMode} index={position} total={banks.length} onSwipe={(dir) => go(dir === 'left' ? 1 : -1)} />
            })}
          </div>
          <div className="swipe-controls"><button className="circle-control" onClick={() => go(-1)}><ChevronLeft size={17} /></button><span>Swipe or use arrows</span><button className="circle-control" onClick={() => go(1)}><ChevronRight size={17} /></button></div>
          <button className="bank-detail-link" onClick={() => onOpen(active)}>Open card details <ChevronRight size={15} /></button>
          <div className="bank-security-strip"><ShieldCheck size={16} /><span>PIN, CVV and OTP are intentionally not displayed or stored as normal fields.</span></div>
        </>
      )}
    </div>
  )
}
