/**
 * Wayfinding — the "El Hilo" sibling-context spine (P1+).
 *
 * Additive navigation chrome over the unchanged flat route tree. An index
 * page (Sectors / Categories / Institutions) publishes the ordered,
 * sort/filter-aware list it is currently showing; a dossier page reads that
 * list to render a context-aware back link, a Prev/Next sibling stepper, and
 * an "N / M" positional readout — so A→B→C comparison no longer bounces
 * through the index, and "back" lands on the row you came from.
 *
 * Designed to degrade gracefully (the whole El Hilo thesis): if the list was
 * never published (deep link / cold arrival), the dossier still gets a working
 * fallback back link and the stepper renders disabled — i.e. "today's
 * behaviour plus a working back link", never a broken control.
 *
 * The provider lives above <Routes> so the published list survives the
 * index→dossier unmount. Companion to useWayfindingScroll (P0), which does the
 * coarse scroll restore; useOriginRow here does the fine row-level highlight.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigationType } from 'react-router-dom'

export type WayfindingKind = 'category' | 'sector' | 'institution' | 'case'

const BASE_PATH: Record<WayfindingKind, string> = {
  category: '/categories/',
  sector: '/sectors/',
  institution: '/institutions/',
  case: '/cases/',
}

export interface SiblingItem {
  /** Route-param id, in string form (matches useParams().id). */
  id: string
  /** Already-formatted display label (used only for a11y, not rendered as an entity). */
  label: string
}

export interface SiblingList {
  kind: WayfindingKind
  items: SiblingItem[]
  /** Full path incl. query so back restores the exact filtered/sorted view. */
  backTo: string
  /** Localized, filter-aware list noun, e.g. "categorías · Salud". */
  backLabel: string
}

interface WayfindingState {
  list: SiblingList | null
  setList: (l: SiblingList) => void
  lastViewed: Partial<Record<WayfindingKind, string>>
  setLastViewed: (kind: WayfindingKind, id: string) => void
}

const Ctx = createContext<WayfindingState | null>(null)

export function WayfindingProvider({ children }: { children: ReactNode }) {
  const [list, setListState] = useState<SiblingList | null>(null)
  const [lastViewed, setLV] = useState<Partial<Record<WayfindingKind, string>>>({})

  const setList = useCallback((l: SiblingList) => setListState(l), [])
  const setLastViewed = useCallback(
    (kind: WayfindingKind, id: string) =>
      setLV((prev) => (prev[kind] === id ? prev : { ...prev, [kind]: id })),
    [],
  )

  return (
    <Ctx.Provider value={{ list, setList, lastViewed, setLastViewed }}>
      {children}
    </Ctx.Provider>
  )
}

function useWayfinding(): WayfindingState {
  const c = useContext(Ctx)
  if (!c) throw new Error('useWayfinding must be used within <WayfindingProvider>')
  return c
}

/**
 * Index side — publish the currently-displayed ordered list. Re-publishes
 * whenever the order, filter, or return URL changes; never clears on unmount
 * (the dossier reads it after the index has gone).
 */
export function usePublishSiblingList(list: SiblingList | null): void {
  const { setList } = useWayfinding()
  const signature = list
    ? `${list.kind}|${list.backTo}|${list.backLabel}|${list.items.map((i) => i.id).join(',')}`
    : null
  useEffect(() => {
    if (list) setList(list)
    // signature captures every field that affects the published list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])
}

export interface WayfindingNav {
  /** True when the active dossier was reached from a published list. */
  hasContext: boolean
  /** 1-based position in the list, or 0 when out of context. */
  index: number
  total: number
  prevTo: string | null
  nextTo: string | null
  backTo: string
  backLabel: string
}

/**
 * Dossier side — resolve position + prev/next + back target for the current
 * entity. Falls back to the supplied defaults when out of context. Also marks
 * this entity as the last-viewed of its kind, for origin-row highlighting.
 */
export function useSiblingNav(
  kind: WayfindingKind,
  currentId: string | undefined,
  fallbackBackTo: string,
  fallbackBackLabel: string,
): WayfindingNav {
  const { list, setLastViewed } = useWayfinding()

  useEffect(() => {
    if (currentId) setLastViewed(kind, currentId)
  }, [kind, currentId, setLastViewed])

  if (!list || list.kind !== kind || !currentId) {
    return {
      hasContext: false,
      index: 0,
      total: 0,
      prevTo: null,
      nextTo: null,
      backTo: fallbackBackTo,
      backLabel: fallbackBackLabel,
    }
  }

  const idx = list.items.findIndex((i) => i.id === currentId)
  if (idx < 0) {
    // In list-kind but this id isn't in the published slice (e.g. filtered
    // out): keep the smart back link, but no stepper.
    return {
      hasContext: false,
      index: 0,
      total: list.items.length,
      prevTo: null,
      nextTo: null,
      backTo: list.backTo,
      backLabel: list.backLabel,
    }
  }

  const base = BASE_PATH[kind]
  return {
    hasContext: true,
    index: idx + 1,
    total: list.items.length,
    prevTo: idx > 0 ? base + list.items[idx - 1].id : null,
    nextTo: idx < list.items.length - 1 ? base + list.items[idx + 1].id : null,
    backTo: list.backTo,
    backLabel: list.backLabel,
  }
}

/**
 * Index side — the id of the last dossier of this kind the user visited, so
 * the index can highlight + scroll that row into view on return. Null on a
 * fresh load with no prior drill-in.
 */
export function useOriginRow(kind: WayfindingKind): string | null {
  const { lastViewed } = useWayfinding()
  return lastViewed[kind] ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-entity origin — the "← Volver a Salud" thread (El Hilo, open-Q1:
// entity-primary 3-hop back). A dossier declares its own identity via
// <DossierOriginProvider>; EntityIdentityChip reads it and stamps it onto the
// Link's router state, so the *destination* dossier (e.g. a vendor reached from
// the Salud sector) can offer a back link to where the hop came from.
// ─────────────────────────────────────────────────────────────────────────────

export interface DossierOrigin {
  /** Full route of the originating dossier, e.g. /sectors/1. */
  route: string
  /** Plain, already-localized entity name, e.g. "Salud". */
  label: string
}

const DossierOriginCtx = createContext<DossierOrigin | null>(null)

export function DossierOriginProvider({
  value,
  children,
}: {
  value: DossierOrigin | null
  children: ReactNode
}) {
  return <DossierOriginCtx.Provider value={value}>{children}</DossierOriginCtx.Provider>
}

/** The host dossier's identity, or null outside a dossier (e.g. on an index). */
export function useDossierOrigin(): DossierOrigin | null {
  return useContext(DossierOriginCtx)
}

/** Router-state shape an EntityIdentityChip stamps onto cross-entity links. */
export interface WayfindingLinkState {
  wfOrigin?: DossierOrigin
}

/**
 * Index side — on browser-back only, scroll the previously-drilled row into
 * view and briefly flash it. Component-agnostic: the only contract is that the
 * row element carries `data-wf-row={id}`. `ready` should flip true once the
 * list has rendered (e.g. `rows.length > 0`) so the element exists to target.
 *
 * Realizes the P0 open-question #5 decision (precise row restore via
 * scrollIntoView, over the coarse scrollY restore in useWayfindingScroll).
 */
export function useOriginRowFlash(kind: WayfindingKind, ready: boolean): void {
  const originId = useOriginRow(kind)
  const navType = useNavigationType()
  const handledRef = useRef<string | null>(null)

  useEffect(() => {
    if (navType !== 'POP' || !originId || !ready || handledRef.current === originId) return
    const el = document.querySelector(
      `[data-wf-row="${CSS.escape(originId)}"]`,
    ) as HTMLElement | null
    if (!el) return
    handledRef.current = originId
    requestAnimationFrame(() => el.scrollIntoView({ block: 'center', behavior: 'auto' }))

    const prevTransition = el.style.transition
    el.style.transition = 'box-shadow 0.6s ease, background-color 0.4s ease'
    el.style.boxShadow = 'inset 0 0 0 1px var(--color-accent)'
    el.style.backgroundColor = 'var(--color-background-elevated)'
    const t = setTimeout(() => {
      el.style.boxShadow = ''
      el.style.backgroundColor = ''
      el.style.transition = prevTransition
    }, 2200)
    return () => clearTimeout(t)
  }, [kind, originId, navType, ready])
}
