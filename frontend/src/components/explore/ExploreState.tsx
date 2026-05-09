/**
 * ExploreState — clean state machine for the spatial-nav rebuild.
 *
 * Lives entirely apart from AtlasContext + the Atlas page so the new
 * canvas can iterate without the legacy modal / multi-writer URL state /
 * lens-indicator desync that bit the /atlas?z1=true prototype.
 *
 * Zoom hierarchy (docs/SPATIAL_NAV_PLAN.md):
 *   Z0  System view      — 12 sectors as bodies in space
 *   Z1  Sector view      — institutions inside one sector
 *   Z2  Institution view — vendors of one institution
 *   Z3  Vendor view      — contracts of one vendor
 *   Z4  Contract view    — single contract detail
 *
 * Each transition is the same primitive: click → push focus stack +
 * advance zoom level. Esc pops one level. The focus stack lets us
 * implement breadcrumbs and a "back" affordance later without rework.
 */
import React, { createContext, useContext, useReducer, type ReactNode } from 'react'

// ────────────────────────────────────────────────────────────────────────────
// Focus types — each level of the zoom hierarchy
// ────────────────────────────────────────────────────────────────────────────

export type Focus =
  | { level: 0; kind: 'system' }
  | { level: 1; kind: 'sector'; sectorId: number; sectorCode: string }
  | { level: 2; kind: 'institution'; institutionId: number; institutionName: string }
  | { level: 3; kind: 'vendor'; vendorId: number; vendorName: string }
  | { level: 4; kind: 'contract'; contractId: number }

export interface ExploreState {
  /** Stack of focus states. Index 0 is the system root; the last item is the active focus. */
  stack: Focus[]
  /** Hovered entity — drives the briefing panel preview. */
  hover: { kind: Focus['kind']; id: number | null } | null
  /** Year filter (procurement year). null = all years. */
  year: number | null
  /** Risk floor — drops bodies below this level. */
  riskFloor: 'all' | 'medium' | 'high' | 'critical'
}

export type ExploreAction =
  | { type: 'drill-into-sector'; sectorId: number; sectorCode: string }
  | { type: 'drill-into-institution'; institutionId: number; institutionName: string }
  | { type: 'drill-into-vendor'; vendorId: number; vendorName: string }
  | { type: 'drill-into-contract'; contractId: number }
  | { type: 'pop-focus' }
  | { type: 'pop-to-level'; level: number } // for breadcrumbs / browser back
  | { type: 'reset-to-system' }
  | { type: 'set-hover'; hover: ExploreState['hover'] }
  | { type: 'set-year'; year: number | null }
  | { type: 'set-risk-floor'; floor: ExploreState['riskFloor'] }
  | { type: 'hydrate-from-url'; stack: Focus[] }

export const EXPLORE_DEFAULT_STATE: ExploreState = {
  stack: [{ level: 0, kind: 'system' }],
  hover: null,
  year: null,
  riskFloor: 'all',
}

// ────────────────────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────────────────────

function reducer(state: ExploreState, action: ExploreAction): ExploreState {
  switch (action.type) {
    case 'drill-into-sector':
      return {
        ...state,
        stack: [...state.stack, { level: 1, kind: 'sector', sectorId: action.sectorId, sectorCode: action.sectorCode }],
        hover: null,
      }
    case 'drill-into-institution':
      return {
        ...state,
        stack: [...state.stack, { level: 2, kind: 'institution', institutionId: action.institutionId, institutionName: action.institutionName }],
        hover: null,
      }
    case 'drill-into-vendor':
      return {
        ...state,
        stack: [...state.stack, { level: 3, kind: 'vendor', vendorId: action.vendorId, vendorName: action.vendorName }],
        hover: null,
      }
    case 'drill-into-contract':
      return {
        ...state,
        stack: [...state.stack, { level: 4, kind: 'contract', contractId: action.contractId }],
        hover: null,
      }
    case 'pop-focus':
      if (state.stack.length <= 1) return state
      return { ...state, stack: state.stack.slice(0, -1), hover: null }
    case 'pop-to-level': {
      // Used by Breadcrumbs — keep entries up to and including `level`.
      const target = Math.max(0, Math.min(action.level, state.stack.length - 1))
      return { ...state, stack: state.stack.slice(0, target + 1), hover: null }
    }
    case 'reset-to-system':
      return { ...state, stack: [{ level: 0, kind: 'system' }], hover: null }
    case 'hydrate-from-url':
      // Replace the entire stack with the URL-derived one. Always starts
      // with a system root so even an empty incoming stack lands on Z0.
      return {
        ...state,
        stack: action.stack.length > 0 && action.stack[0].kind === 'system'
          ? action.stack
          : [{ level: 0, kind: 'system' }, ...action.stack],
        hover: null,
      }
    case 'set-hover':
      return { ...state, hover: action.hover }
    case 'set-year':
      return { ...state, year: action.year }
    case 'set-risk-floor':
      return { ...state, riskFloor: action.floor }
    default:
      return state
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Context
// ────────────────────────────────────────────────────────────────────────────

const StateCtx = createContext<ExploreState | null>(null)
const DispatchCtx = createContext<React.Dispatch<ExploreAction> | null>(null)

export function ExploreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EXPLORE_DEFAULT_STATE)
  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useExploreState(): ExploreState {
  const ctx = useContext(StateCtx)
  if (!ctx) throw new Error('useExploreState must be used inside <ExploreProvider>')
  return ctx
}

export function useExploreDispatch(): React.Dispatch<ExploreAction> {
  const ctx = useContext(DispatchCtx)
  if (!ctx) throw new Error('useExploreDispatch must be used inside <ExploreProvider>')
  return ctx
}

/** Convenience: the currently focused entity (top of stack). */
export function useCurrentFocus(state: ExploreState): Focus {
  return state.stack[state.stack.length - 1]
}
