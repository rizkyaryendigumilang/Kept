import MyCardsPage from './MyCardsPage'

export default function BankingPage({
  banks = [],
  styleMode = 'realistic',
  onAdd,
  onOpen,
  onSave,
  onDelete,
  onToggleFavorite,
  lang = 'id'
}) {
  return (
    <MyCardsPage
      cards={banks}
      styleMode={styleMode}
      onAddCard={onAdd}
      onSaveCard={onSave}
      onDeleteCard={onDelete}
      onToggleFavorite={onToggleFavorite}
      lang={lang}
    />
  )
}
