import { createContext, useContext } from 'react'

export const VaultModalContext = createContext(null)

/**
 * VaultModalProvider provides centralized modal state, handlers, and active items
 * to eliminate extreme prop drilling across App.jsx and VaultModalHost.jsx.
 */
export function VaultModalProvider({ children, value }) {
  return (
    <VaultModalContext.Provider value={value}>
      {children}
    </VaultModalContext.Provider>
  )
}

/**
 * Hook to consume modal state and control actions.
 * Returns null if rendered outside VaultModalProvider.
 */
export function useVaultModalContext() {
  return useContext(VaultModalContext)
}
