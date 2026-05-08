/**
 * AtlasContext — state machine + provider for the three-pane investigator console.
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § 1.4 + § 1.5
 * Build: atlas-C-P1
 *
 * Splits into AtlasStateContext + AtlasDispatchContext (Bloomberg Terminal
 * pattern) so components that only dispatch (left rail buttons) don't
 * re-render on every state change.
 *
 * P1 ships only the fields that the left rail and idle right panel need.
 * Zoom / selection / hover actions are stubbed — their reducers are
 * authored here so P2-P5 can add wiring without touching this file.
 */

import React, { createContext, useContext, useReducer } from 'react'
import type { ConstellationMode } from '@/components/charts/ConcentrationConstellation'

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

// 2026-05-09: extended for spatial-nav rebuild (docs/SPATIAL_NAV_PLAN.md).
// The Atlas now supports multiple zoom levels (Z0 system → Z1 sector →
// Z2 institution → Z3 vendor). The legacy `zoomed-cluster` state is the
// Z0→Z1 transition for the patterns/sectors/categories/sexenios lenses
// already shipped. New `zoomed-sector` and `zoomed-institution` states
// extend the same primitive into the deeper levels of the map.
export type AtlasViewKind =
  | 'idle'
  | 'hover-cluster'
  | 'zoomed-cluster'      // Z0→Z1 (legacy, retained)
  | 'zoomed-sector'       // Z1→Z2 (NEW)
  | 'zoomed-institution'  // Z2→Z3 (NEW, future)
  | 'selecting'

export type AtlasView =
  | { kind: 'idle' }
  | { kind: 'hover-cluster'; code: string }
  | { kind: 'zoomed-cluster'; code: string }
  | { kind: 'zoomed-sector'; sectorCode: string; sectorId: number }
  | { kind: 'zoomed-institution'; institutionId: number; institutionName: string }
  | { kind: 'selecting'; ids: string[] }

export interface AtlasState {
  lens: ConstellationMode
  yearIndex: number
  riskFloor: 'all' | 'medium' | 'high' | 'critical'
  pinnedCode: string | null
  view: AtlasView
  selection: Set<string>       // vendor IDs — managed by P4
  hoveredCluster: string | null  // ephemeral; cleared on mouseleave
}

export type AtlasAction =
  | { type: 'set-lens'; lens: ConstellationMode }
  | { type: 'set-year'; index: number }
  | { type: 'set-risk-floor'; floor: AtlasState['riskFloor'] }
  | { type: 'pin-cluster'; code: string | null }
  | { type: 'hover-cluster'; code: string | null }
  | { type: 'zoom-into-cluster'; code: string }   // P2 — Z0→Z1
  | { type: 'drill-into-sector'; sectorCode: string; sectorId: number }       // SPATIAL — Z1→Z2
  | { type: 'drill-into-institution'; institutionId: number; institutionName: string } // SPATIAL — Z2→Z3
  | { type: 'escape-zoom' }                        // P2 — pops one level
  | { type: 'toggle-vendor-selection'; id: string } // P4
  | { type: 'lasso-select'; ids: string[]; mode: 'replace' | 'union' } // P4
  | { type: 'clear-selection' }                    // P4
  | { type: 'hydrate-from-url'; partial: Partial<Pick<AtlasState, 'lens' | 'yearIndex' | 'riskFloor' | 'pinnedCode' | 'view' | 'selection'>> } // P5

// ─────────────────────────────────────────────────────────────────────────────
// Default state
// ─────────────────────────────────────────────────────────────────────────────

export const ATLAS_DEFAULT_STATE: AtlasState = {
  lens: 'patterns',
  yearIndex: 17, // defaults to most recent (2025) — Atlas.tsx overrides on init
  riskFloor: 'all',
  pinnedCode: null,
  view: { kind: 'idle' },
  selection: new Set(),
  hoveredCluster: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducer — encodes the state machine transitions
// ─────────────────────────────────────────────────────────────────────────────

function atlasReducer(state: AtlasState, action: AtlasAction): AtlasState {
  switch (action.type) {
    case 'set-lens':
      return { ...state, lens: action.lens, view: { kind: 'idle' }, hoveredCluster: null }

    case 'set-year':
      return { ...state, yearIndex: action.index }

    case 'set-risk-floor':
      return { ...state, riskFloor: action.floor }

    case 'pin-cluster':
      return { ...state, pinnedCode: action.code }

    case 'hover-cluster':
      if (action.code === null) {
        // only clear hover; don't disturb a zoomed state
        return { ...state, hoveredCluster: null }
      }
      return {
        ...state,
        hoveredCluster: action.code,
        view: state.view.kind === 'idle' ? { kind: 'hover-cluster', code: action.code } : state.view,
      }

    // ── Z0→Z1 ─────────────────────────────────────────────────────────────
    case 'zoom-into-cluster':
      return {
        ...state,
        view: { kind: 'zoomed-cluster', code: action.code },
        hoveredCluster: null,
      }

    // ── Z1→Z2 (NEW spatial nav) ───────────────────────────────────────────
    case 'drill-into-sector':
      return {
        ...state,
        view: { kind: 'zoomed-sector', sectorCode: action.sectorCode, sectorId: action.sectorId },
        hoveredCluster: null,
      }

    // ── Z2→Z3 (NEW spatial nav) ───────────────────────────────────────────
    case 'drill-into-institution':
      return {
        ...state,
        view: {
          kind: 'zoomed-institution',
          institutionId: action.institutionId,
          institutionName: action.institutionName,
        },
        hoveredCluster: null,
      }

    // ── escape-zoom now pops ONE level (Z3→Z2→Z1→idle) ────────────────────
    case 'escape-zoom': {
      if (state.selection.size > 0) {
        // First ESC clears selection (VS Code / Figma pattern)
        return { ...state, selection: new Set(), view: { kind: 'idle' } }
      }
      // Pop one zoom level. We don't keep a navigation stack yet, so each
      // pop returns to idle for now. Future improvement: keep a breadcrumb
      // stack so Z3→escape goes back to Z2 (sector view) not idle.
      return { ...state, view: { kind: 'idle' }, hoveredCluster: null }
    }

    // ── P4 stubs ──────────────────────────────────────────────────────────
    case 'toggle-vendor-selection': {
      const next = new Set(state.selection)
      if (next.has(action.id)) next.delete(action.id)
      else next.add(action.id)
      return {
        ...state,
        selection: next,
        view: next.size > 0 ? { kind: 'selecting', ids: [...next] } : { kind: 'idle' },
      }
    }

    case 'lasso-select': {
      const base = action.mode === 'replace' ? new Set<string>() : new Set(state.selection)
      for (const id of action.ids) base.add(id)
      return {
        ...state,
        selection: base,
        view: base.size > 0 ? { kind: 'selecting', ids: [...base] } : { kind: 'idle' },
      }
    }

    case 'clear-selection':
      return { ...state, selection: new Set(), view: { kind: 'idle' } }

    // ── P5: hydrate full state from URL ───────────────────────────────────
    case 'hydrate-from-url': {
      const next = { ...state, ...action.partial }
      // Ensure selection is always a proper Set even when spread from partial
      if (action.partial.selection !== undefined) {
        next.selection = action.partial.selection instanceof Set
          ? action.partial.selection
          : new Set<string>(action.partial.selection as unknown as Iterable<string>)
      }
      return next
    }

    default:
      return state
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contexts — split for re-render efficiency
// ─────────────────────────────────────────────────────────────────────────────

const AtlasStateContext = createContext<AtlasState | null>(null)
const AtlasDispatchContext = createContext<React.Dispatch<AtlasAction> | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

interface AtlasContextProviderProps {
  children: React.ReactNode
  initialState?: Partial<AtlasState>
}

export function AtlasContextProvider({ children, initialState }: AtlasContextProviderProps) {
  const [state, dispatch] = useReducer(atlasReducer, {
    ...ATLAS_DEFAULT_STATE,
    ...initialState,
    // Ensure Set is always a proper Set even when initialState is spread
    selection: initialState?.selection ?? new Set<string>(),
  })

  return (
    <AtlasStateContext.Provider value={state}>
      <AtlasDispatchContext.Provider value={dispatch}>
        {children}
      </AtlasDispatchContext.Provider>
    </AtlasStateContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useAtlasState(): AtlasState {
  const ctx = useContext(AtlasStateContext)
  if (!ctx) throw new Error('useAtlasState must be used within AtlasContextProvider')
  return ctx
}

export function useAtlasDispatch(): React.Dispatch<AtlasAction> {
  const ctx = useContext(AtlasDispatchContext)
  if (!ctx) throw new Error('useAtlasDispatch must be used within AtlasContextProvider')
  return ctx
}
