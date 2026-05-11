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
  /**
   * Pinned entity path — a snapshot of the focus stack at pin time.
   * Survives zoom transitions: pin a vendor at Z3, then zoom out to
   * Z0, the canvas still highlights the vendor's home sector and
   * institution as you walk past them. Null when nothing is pinned.
   * Persisted to localStorage (rubli_explore_pin_v1).
   */
  pinnedPath: Focus[] | null
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
  | { type: 'pin-current' }
  | { type: 'unpin' }
  | { type: 'set-pinned-path'; path: Focus[] | null }

export const EXPLORE_DEFAULT_STATE: ExploreState = {
  stack: [{ level: 0, kind: 'system' }],
  hover: null,
  year: null,
  riskFloor: 'all',
  pinnedPath: null,
}

const PIN_STORAGE_KEY = 'rubli_explore_pin_v1'

/** Read the persisted pin from localStorage. Defensive — never throws. */
function readPersistedPin(): Focus[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PIN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    // Soft validation — drop the pin entirely if any entry looks malformed.
    for (const f of parsed) {
      if (!f || typeof f !== 'object' || typeof f.level !== 'number' || typeof f.kind !== 'string') return null
    }
    return parsed as Focus[]
  } catch {
    return null
  }
}

/** Persist (or clear) the pin. Never throws. */
function persistPin(path: Focus[] | null): void {
  if (typeof window === 'undefined') return
  try {
    if (path && path.length > 0) {
      window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(path))
    } else {
      window.localStorage.removeItem(PIN_STORAGE_KEY)
    }
  } catch {
    // Quota / disabled storage — silent.
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────────────────────

function reducer(state: ExploreState, action: ExploreAction): ExploreState {
  switch (action.type) {
    case 'drill-into-sector': {
      // 2026-05-11 (Audit F035): drill actions used to blindly append.
      // If the user was already at Z1+ and dispatched another drill at
      // the same level (e.g. searching for another sector while inside
      // a sector), the breadcrumb showed two same-level entries. We
      // now truncate the stack back to "one level above the target"
      // before appending — drilling is always relative to system root
      // for sector, sector for institution, etc.
      return {
        ...state,
        stack: [
          ...state.stack.slice(0, 1), // keep only system root
          { level: 1, kind: 'sector', sectorId: action.sectorId, sectorCode: action.sectorCode },
        ],
        hover: null,
      }
    }
    case 'drill-into-institution': {
      // Truncate to system+sector before appending the institution. If
      // there is no sector in the stack (shouldn't happen via UI but
      // defensive against SearchOverlay), append after whatever's there.
      const hasSector = state.stack.some((f) => f.kind === 'sector')
      const base = hasSector ? state.stack.slice(0, 2) : state.stack
      return {
        ...state,
        stack: [
          ...base,
          { level: 2, kind: 'institution', institutionId: action.institutionId, institutionName: action.institutionName },
        ],
        hover: null,
      }
    }
    case 'drill-into-vendor': {
      const hasInstitution = state.stack.some((f) => f.kind === 'institution')
      const base = hasInstitution ? state.stack.slice(0, 3) : state.stack
      return {
        ...state,
        stack: [
          ...base,
          { level: 3, kind: 'vendor', vendorId: action.vendorId, vendorName: action.vendorName },
        ],
        hover: null,
      }
    }
    case 'drill-into-contract': {
      const hasVendor = state.stack.some((f) => f.kind === 'vendor')
      const base = hasVendor ? state.stack.slice(0, 4) : state.stack
      return {
        ...state,
        stack: [
          ...base,
          { level: 4, kind: 'contract', contractId: action.contractId },
        ],
        hover: null,
      }
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
    case 'pin-current': {
      // Snapshot the current stack EXCLUDING the system root — pinning
      // "system" is meaningless. If we're already at Z0, no-op.
      if (state.stack.length <= 1) return state
      const path = state.stack.slice(1)
      persistPin(path)
      return { ...state, pinnedPath: path }
    }
    case 'unpin':
      persistPin(null)
      return { ...state, pinnedPath: null }
    case 'set-pinned-path':
      persistPin(action.path)
      return { ...state, pinnedPath: action.path }
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
  // Lazy init seeds the pinnedPath from localStorage so a refresh
  // keeps the pin without an extra hydration effect.
  const [state, dispatch] = useReducer(
    reducer,
    EXPLORE_DEFAULT_STATE,
    (init): ExploreState => ({ ...init, pinnedPath: readPersistedPin() }),
  )
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

// ────────────────────────────────────────────────────────────────────────────
// Pin helpers — used by ExploreCanvas (to draw ring annotations) and
// BriefingPanel (to render the pin/unpin button).
// ────────────────────────────────────────────────────────────────────────────

/** Are two Focus entries the same entity? Structural equality by kind+id. */
export function focusEquals(a: Focus | null | undefined, b: Focus | null | undefined): boolean {
  if (!a || !b) return false
  if (a.kind !== b.kind) return false
  switch (a.kind) {
    case 'system': return b.kind === 'system'
    case 'sector': return b.kind === 'sector' && a.sectorId === b.sectorId
    case 'institution': return b.kind === 'institution' && a.institutionId === b.institutionId
    case 'vendor': return b.kind === 'vendor' && a.vendorId === b.vendorId
    case 'contract': return b.kind === 'contract' && a.contractId === b.contractId
  }
}

/**
 * Returns the pinned entity that should be annotated at the *next* level
 * deeper than the current focus, or null if the pin is not in scope at
 * this zoom (we navigated away from the pin's lineage).
 *
 * Example: pin a vendor inside Salud → IMSS → Vendor X. While the user
 * is at Z1 Salud, this returns IMSS (institution body to highlight).
 * While they're at Z2 IMSS, it returns Vendor X (vendor body). While at
 * a different sector, it returns null.
 */
export function getPinAnnotation(state: ExploreState): Focus | null {
  const { pinnedPath, stack } = state
  if (!pinnedPath || pinnedPath.length === 0) return null
  const currentFocus = stack[stack.length - 1]
  // Lineage check — for levels 1..currentFocus.level, the stack and
  // pin must agree on the ancestor entity.
  for (let lvl = 1; lvl <= currentFocus.level; lvl++) {
    const stackEntry = stack[lvl]
    const pinEntry = pinnedPath[lvl - 1]
    if (!stackEntry || !pinEntry || !focusEquals(stackEntry, pinEntry)) return null
  }
  // Annotation is one level deeper than current.
  return pinnedPath[currentFocus.level] ?? null
}

/**
 * Is the current focus *exactly* the pinned view? (Same entity, same
 * depth.) Drives the Pin/Unpin toggle in the briefing panel.
 */
export function isCurrentViewPinned(state: ExploreState): boolean {
  const { pinnedPath, stack } = state
  if (!pinnedPath || pinnedPath.length === 0) return false
  // Stack always starts with the system root; pinnedPath excludes it.
  if (stack.length - 1 !== pinnedPath.length) return false
  for (let i = 0; i < pinnedPath.length; i++) {
    if (!focusEquals(pinnedPath[i], stack[i + 1])) return false
  }
  return true
}
