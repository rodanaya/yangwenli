/**
 * EntityDrawerContext — global state for the Universal Entity Profile Drawer.
 * Any page can call open(id, type) to slide open the drawer.
 */

import { createContext, useContext, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EntityDrawerState {
  entityId: number | null
  entityType: 'vendor' | 'institution' | null
}

interface EntityDrawerContextValue {
  open: (id: number, type: 'vendor' | 'institution') => void
  close: () => void
  state: EntityDrawerState
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const INITIAL_STATE: EntityDrawerState = { entityId: null, entityType: null }

export const EntityDrawerContext = createContext<EntityDrawerContextValue>({
  open: () => {},
  close: () => {},
  state: INITIAL_STATE,
})

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function EntityDrawerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EntityDrawerState>(INITIAL_STATE)

  function open(entityId: number, entityType: 'vendor' | 'institution') {
    setState({ entityId, entityType })
  }

  function close() {
    setState(INITIAL_STATE)
  }

  return (
    <EntityDrawerContext.Provider value={{ open, close, state }}>
      {children}
    </EntityDrawerContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEntityDrawer() {
  return useContext(EntityDrawerContext)
}
