import { Suspense } from 'react'
import { safeLazy } from '../lib/safeLazy'

const AlertsPanel = safeLazy(() => import('../pages/AlertsPanel'))
const ItemModal = safeLazy(() => import('../pages/ItemModal'))
const AddItemModal = safeLazy(() => import('../pages/AddItemModal'))
const AddDocumentModal = safeLazy(() => import('../pages/AddDocumentModal'))
const AddCardModal = safeLazy(() => import('./AddCardModal'))
const CardDetailModal = safeLazy(() => import('./CardDetailModal'))
const CardBarcodeModal = safeLazy(() => import('./CardBarcodeModal'))
const DocumentDetailModal = safeLazy(() => import('../pages/DocumentDetailModal'))
const CommandPalette = safeLazy(() => import('./CommandPalette'))
const ExportModal = safeLazy(() => import('./ExportModal'))
const ImportKeptModal = safeLazy(() => import('./ImportKeptModal'))
const ShareSecretModal = safeLazy(() => import('./ShareSecretModal'))
const SettingsDrawer = safeLazy(() => import('./SettingsDrawer'))

export default function VaultModalHost({
  // Modal states & handlers
  addMode,
  setAddMode,
  docAddModalOpen,
  setDocAddModalOpen,
  cardAddModalOpen,
  setCardAddModalOpen,
  cardEditModalItem,
  setCardEditModalItem,
  cardBarcodeModalItem,
  setCardBarcodeModalItem,
  selectedItem,
  setSelectedItem,

  // CRUD & Item handlers
  saveItem,
  updateItem,
  removeItem,
  toggleFavorite,
  openItem,
  handleOpenShareSecret,

  // Alerts
  alertsOpen,
  setAlertsOpen,
  alerts,
  dismissedAlerts,
  handleDismissAlert,
  handleDismissAllAlerts,
  handleResetDismissedAlerts,

  // Settings Drawer
  menuOpen,
  setMenuOpen,
  menuSubpage,
  setMenuSubpage,
  profile,
  session,
  vaultKey,
  hydratedItems,
  documents,
  trashedItems,
  restoreItem,
  permanentDeleteItem,
  emptyTrash,
  privacyMaskEnabled,
  handleTogglePrivacyMask,
  installPrompt,
  handlePromptInstall,
  isOnline,
  pendingSyncCount,
  updateTheme,
  updateCardStyle,
  saveProfile,
  uploadProfileAvatar,
  handleRemoveAvatar,
  signOut,
  openExportModal,
  handleChangeAccountPassword,
  handleChangeMasterPassword,
  activeRecoveryKey,
  handleDownloadEmergencySheet,
  lockVault,
  showToast,
  hamburgerStyle,
  updateHamburgerStyle,
  lang,
  handleLanguageChange,

  // Command palette & Search
  searchOpen,
  setSearchOpen,
  banks,

  // Export / Import / Share
  exportModalOpen,
  setExportModalOpen,
  recordSecurityActivity,
  importKeptEnvelope,
  setImportKeptEnvelope,
  handleRestoreKeptItems,
  shareModalData,
  setShareModalData
}) {
  return (
    <Suspense fallback={null}>
      {addMode && vaultKey && (
        <AddItemModal
          mode={addMode}
          onClose={() => setAddMode(null)}
          onSubmit={saveItem}
          lang={lang}
        />
      )}
      {docAddModalOpen && vaultKey && (
        <AddDocumentModal
          onClose={() => setDocAddModalOpen(false)}
          onSubmit={(docPayload) => saveItem({ ...docPayload, item_type: 'document' })}
          lang={lang}
        />
      )}
      {cardAddModalOpen && vaultKey && (
        <AddCardModal
          onClose={() => setCardAddModalOpen(false)}
          onSubmit={(cardData) => {
            setCardAddModalOpen(false)
            saveItem(cardData)
          }}
          lang={lang}
        />
      )}
      {cardEditModalItem && vaultKey && (
        <AddCardModal
          initialCard={cardEditModalItem}
          onClose={() => setCardEditModalItem(null)}
          onSubmit={(cardData) => {
            const id = cardEditModalItem.id
            setCardEditModalItem(null)
            saveItem({ ...cardData, id })
          }}
          lang={lang}
        />
      )}
      {cardBarcodeModalItem && (
        <CardBarcodeModal
          card={cardBarcodeModalItem}
          onClose={() => setCardBarcodeModalItem(null)}
          lang={lang}
        />
      )}
      {selectedItem && selectedItem.item_type === 'document' ? (
        <DocumentDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={removeItem}
          onSave={async (id, updatedDoc) => {
            await saveItem({ ...updatedDoc, id, item_type: 'document' })
          }}
          onToggleFavorite={toggleFavorite}
          lang={lang}
        />
      ) : selectedItem && (selectedItem.item_type === 'bank_card' || selectedItem.item_type === 'card') ? (
        <CardDetailModal
          card={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={removeItem}
          onEdit={(card) => {
            setSelectedItem(null)
            setCardEditModalItem(card)
          }}
          onShowBarcode={(card) => {
            setSelectedItem(null)
            setCardBarcodeModalItem(card)
          }}
          onToggleFavorite={toggleFavorite}
          lang={lang}
        />
      ) : selectedItem ? (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDelete={removeItem}
          onSave={updateItem}
          onToggleFavorite={toggleFavorite}
          onShareSecret={handleOpenShareSecret}
          lang={lang}
        />
      ) : null}
      {alertsOpen && (
        <AlertsPanel
          alerts={alerts}
          items={hydratedItems}
          onClose={() => setAlertsOpen(false)}
          onOpenItem={openItem}
          onDismissAlert={handleDismissAlert}
          onDismissAllAlerts={handleDismissAllAlerts}
          dismissedCount={dismissedAlerts.size}
          onResetDismissedAlerts={handleResetDismissedAlerts}
          lang={lang}
        />
      )}
      <SettingsDrawer
        isOpen={menuOpen}
        activeSubpage={menuSubpage}
        onSubpageChange={setMenuSubpage}
        onClose={() => {
          setMenuOpen(false)
          setMenuSubpage(null)
        }}
        profile={profile}
        user={session.user}
        vaultKey={vaultKey}
        items={hydratedItems}
        documents={documents}
        trashedItems={trashedItems}
        onRestoreItem={restoreItem}
        onPermanentDelete={permanentDeleteItem}
        onEmptyTrash={emptyTrash}
        privacyMaskEnabled={privacyMaskEnabled}
        onTogglePrivacyMask={handleTogglePrivacyMask}
        installPrompt={installPrompt}
        onPromptInstall={handlePromptInstall}
        onOpenShareSecret={handleOpenShareSecret}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onTheme={updateTheme}
        onCardStyle={updateCardStyle}
        saveProfile={saveProfile}
        uploadProfileAvatar={uploadProfileAvatar}
        handleRemoveAvatar={handleRemoveAvatar}
        onSignOut={signOut}
        onImport={() => document.getElementById('csv-import').click()}
        onExport={openExportModal}
        onChangeAccountPassword={handleChangeAccountPassword}
        onChangeMasterPassword={handleChangeMasterPassword}
        recoveryKey={activeRecoveryKey}
        onDownloadEmergencySheet={handleDownloadEmergencySheet}
        onLockVault={() => {
          lockVault()
          showToast('Vault telah dikunci.')
        }}
        showToast={showToast}
        hamburgerStyle={hamburgerStyle}
        onHamburgerStyle={updateHamburgerStyle}
        lang={lang}
        onLanguage={handleLanguageChange}
      />
      <CommandPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={hydratedItems}
        documents={documents}
        banks={banks}
        onOpenItem={openItem}
        onShareSecret={handleOpenShareSecret}
        showToast={showToast}
        lang={lang}
      />
      {exportModalOpen && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          user={session?.user}
          profile={profile}
          items={hydratedItems}
          lang={lang}
          showToast={showToast}
          recordSecurityActivity={recordSecurityActivity}
        />
      )}
      {importKeptEnvelope && (
        <ImportKeptModal
          isOpen={Boolean(importKeptEnvelope)}
          onClose={() => setImportKeptEnvelope(null)}
          fileEnvelope={importKeptEnvelope}
          onDecrypted={handleRestoreKeptItems}
          lang={lang}
        />
      )}
      {shareModalData?.isOpen && (
        <ShareSecretModal
          isOpen={shareModalData.isOpen}
          onClose={() => setShareModalData(null)}
          initialTitle={shareModalData.initialTitle}
          initialContent={shareModalData.initialContent}
          user={session?.user}
          lang={lang}
          showToast={showToast}
        />
      )}
    </Suspense>
  )
}
