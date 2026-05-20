/**
 * ExploreCanvas — the spatial map. Pure SVG rendering, no chrome, no
 * legacy state. Reads from ExploreState and renders bodies for the
 * active focus level.
 *
 * Z0 — 12 sectors as bodies, sized by total spend, colored by sector palette
 * Z1 — institutions inside the focused sector (loaded via existing
 *      /api/v1/atlas/sector-institutions endpoint)
 * Z2 — placeholder: institution-focus state. Click navigates to /thread/:id
 *      until we have a real vendor sub-constellation endpoint.
 *
 * Drag-to-pan + wheel-zoom are universal — work at every level.
 *
 * The canvas owns its own pan + zoom state (scale, translateX, translateY)
 * so transitions between zoom levels can animate the camera. ESC pops one
 * level via the explore reducer.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { atlasApi, sectorApi, type SpatialInstitution } from '@/api/client'
import type { ContractListItem } from '@/api/types'
import {
  RISK_COLORS,
  getRiskLevelFromScore,
  SECTOR_COLORS,
} from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import { getAdministrationByYear } from '@/lib/administrations'
import { formatEntityName } from '@/lib/entity/format'
import { SortHeaderTh } from '@/components/ui/SortHeaderTh'
import {
  getPinAnnotation,
  useExploreState,
  useExploreDispatch,
  useCurrentFocus,
  type Focus,
} from './ExploreState'
import {
  Z_EASE,
  Z_LAYOUT_DURATION_S,
  Z_CELL_ENTRANCE_S,
  Z_BAND_S,
  Z_CASCADE_STEP_S,
  Z_CELL_STAGGER_S,
  Z_TREEMAP_DELAY_S,
} from './ZPrimitives'

// ────────────────────────────────────────────────────────────────────────────
// Layout — independent of the legacy constellation
// ────────────────────────────────────────────────────────────────────────────

const SVG_W = 1200
const SVG_H = 720

const MXN_TO_USD = 17.15

function formatCompactUSD(mxn: number): string {
  const usd = mxn / MXN_TO_USD
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`
  return `$${Math.round(usd)}`
}


// ────────────────────────────────────────────────────────────────────────────
// ExploreCanvas
// ────────────────────────────────────────────────────────────────────────────

export interface ExploreCanvasProps {
  lang: 'en' | 'es'
  /** Notify parent when the user hovers / focuses something — drives the briefing panel. */
  onFocusChange?: (focus: Focus) => void
}

export function ExploreCanvas({ lang, onFocusChange }: ExploreCanvasProps) {
  const state = useExploreState()
  const dispatch = useExploreDispatch()
  const focus = useCurrentFocus(state)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // Gap 4.2: the pinned entity to annotate at the next zoom level
  // deeper than the current focus, or null when no pin is in scope.
  const pinAnnotation = getPinAnnotation(state)

  // Pan + wheel zoom state — local to the canvas (not in reducer).
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  // 2026-05-09 spatial Phase 2: cinematic camera fly-in.
  // When user clicks a body, capture its (cx, cy) in SVG viewport coords +
  // schedule the drill action 350ms later. The transform between now and
  // then animates "into" that body, then the layer swap kicks in and the
  // new layer enters from a "settling" scale. Reads more like Star Fox
  // planet approach than a hard cross-fade.
  const [cameraTarget, setCameraTarget] = useState<{ x: number; y: number } | null>(null)
  const triggerCameraDrill = useCallback((bodyX: number, bodyY: number, drill: () => void) => {
    setCameraTarget({ x: bodyX, y: bodyY })
    setTimeout(() => {
      drill()
      setCameraTarget(null)
    }, 350)
  }, [])

  // Reset pan + zoom when the focus level changes — each level gets a fresh view.
  useEffect(() => {
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }, [focus.level, focus.kind, (focus as { sectorId?: number }).sectorId, (focus as { institutionId?: number }).institutionId])

  // Notify parent when focus changes
  useEffect(() => {
    onFocusChange?.(focus)
  }, [focus, onFocusChange])

  // Notify parent on hover too
  useEffect(() => {
    if (state.hover) {
      // Synthesize a focus-shaped event for the panel.
      onFocusChange?.({ ...focus })
    }
    // We re-fire focus on hover so the panel can flicker between hover preview and focus persistent
    // Actually — the panel reads state.hover directly via context. So no-op here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hover])

  // ── Pointer interactions (mouse + touch + pen unified) ───────────────────
  // Active pointers — by pointerId. 1 pointer = drag, 2 pointers = pinch.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  // Pinch baseline — distance + center + zoom at pinch start
  const pinchRef = useRef<{ baseDist: number; baseZoom: number; baseCenterX: number; baseCenterY: number; basePanX: number; basePanY: number } | null>(null)

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    // Only left button for mouse — touch/pen reports button 0 too
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const wrapper = wrapperRef.current
    if (wrapper) wrapper.setPointerCapture?.(e.pointerId)

    if (pointersRef.current.size === 1) {
      // Single pointer — start drag
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: pan.x,
        baseY: pan.y,
      }
      setDragging(true)
    } else if (pointersRef.current.size === 2) {
      // Two pointers — start pinch. Cancel any drag in progress.
      dragRef.current = null
      setDragging(false)
      const pts = Array.from(pointersRef.current.values())
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      const dist = Math.hypot(dx, dy)
      pinchRef.current = {
        baseDist: dist,
        baseZoom: zoom,
        baseCenterX: (pts[0].x + pts[1].x) / 2,
        baseCenterY: (pts[0].y + pts[1].y) / 2,
        basePanX: pan.x,
        basePanY: pan.y,
      }
    }
  }, [pan, zoom])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const wrapper = wrapperRef.current
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const scale = SVG_W / Math.max(rect.width, 1)

    if (pointersRef.current.size === 2 && pinchRef.current) {
      // Pinch — adjust zoom by ratio of current to base distance, and pan
      // by movement of pinch midpoint so pinch feels anchored to fingers.
      const pts = Array.from(pointersRef.current.values())
      const dx = pts[1].x - pts[0].x
      const dy = pts[1].y - pts[0].y
      const dist = Math.hypot(dx, dy)
      const cx = (pts[0].x + pts[1].x) / 2
      const cy = (pts[0].y + pts[1].y) / 2
      const ratio = dist / Math.max(pinchRef.current.baseDist, 1)
      const newZoom = Math.max(0.5, Math.min(3.5, pinchRef.current.baseZoom * ratio))
      setZoom(newZoom)
      setPan({
        x: pinchRef.current.basePanX + (cx - pinchRef.current.baseCenterX) * scale,
        y: pinchRef.current.basePanY + (cy - pinchRef.current.baseCenterY) * scale,
      })
      return
    }

    if (pointersRef.current.size === 1 && dragRef.current) {
      const d = dragRef.current
      setPan({
        x: d.baseX + (e.clientX - d.startX) * scale,
        y: d.baseY + (e.clientY - d.startY) * scale,
      })
    }
  }, [])

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    pointersRef.current.delete(e.pointerId)
    const wrapper = wrapperRef.current
    if (wrapper) wrapper.releasePointerCapture?.(e.pointerId)

    if (pointersRef.current.size < 2) {
      pinchRef.current = null
    }
    if (pointersRef.current.size === 0) {
      dragRef.current = null
      setDragging(false)
      // setPointerCapture on the wrapper div redirects the browser's native
      // click event to the div — React onClick on SVG <g> children never fires.
      // Fix: detect tap (< 6px movement) and re-dispatch a synthetic click on
      // the real SVG element under the pointer after capture is released.
      if (drag) {
        const dx = e.clientX - drag.startX
        const dy = e.clientY - drag.startY
        if (Math.hypot(dx, dy) < 6) {
          const target = document.elementFromPoint(e.clientX, e.clientY)
          if (target && target !== wrapper) {
            target.dispatchEvent(
              new MouseEvent('click', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY })
            )
          }
        }
      }
    } else if (pointersRef.current.size === 1) {
      // Pinch ended but one finger still down — promote to drag
      const remaining = Array.from(pointersRef.current.values())[0]
      dragRef.current = {
        startX: remaining.x,
        startY: remaining.y,
        baseX: pan.x,
        baseY: pan.y,
      }
      setDragging(true)
    }
  }, [pan])

  // Wheel zoom — clamp 0.5..3.5
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      // Don't intercept wheel events that originate inside a panel scroll container.
      const path = e.composedPath()
      for (const target of path) {
        if (target === el) break
        if (target instanceof HTMLElement && target.dataset.scrollPanel === 'true') return
      }
      e.preventDefault()
      const delta = -e.deltaY * 0.0015
      setZoom((z) => Math.max(0.5, Math.min(3.5, z * (1 + delta))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Keyboard shortcuts:
  //   Esc / Backspace / b → pop one level
  //   0 / Home → reset to system view
  //   + / -    → zoom in/out (10% per press, clamped 0.5..3.5)
  // All ignored when typing into an input or textarea.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      // Cmd/Ctrl+K is the search shortcut — owned by SearchOverlay; skip here.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') return

      if (e.key === 'Escape' || e.key === 'Backspace' || e.key.toLowerCase() === 'b') {
        e.preventDefault()
        dispatch({ type: 'pop-focus' })
      } else if (e.key === '0' || e.key === 'Home') {
        e.preventDefault()
        dispatch({ type: 'reset-to-system' })
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        setZoom((z) => Math.max(0.5, Math.min(3.5, z * 1.1)))
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        setZoom((z) => Math.max(0.5, Math.min(3.5, z * 0.9)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  // ── Camera transform ─────────────────────────────────────────────────────
  // When cameraTarget is set, override pan + zoom to fly into that body.
  // Translate so the target body sits at SVG center, scale up 3x.
  const flyingIn = cameraTarget !== null
  const effectiveTransform = flyingIn
    ? `translate(${SVG_W / 2 - cameraTarget!.x * 3}, ${SVG_H / 2 - cameraTarget!.y * 3}) scale(3)`
    : `translate(${pan.x}, ${pan.y}) scale(${zoom})`

  return (
    <div
      ref={wrapperRef}
      className="w-full select-none"
      style={{
        cursor: dragging ? 'grabbing' : 'grab',
        background: 'var(--color-background, #faf9f6)',
        touchAction: 'none',
        height: '100%',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Back button — visible at every non-system level. Mirrors the
          breadcrumb pop in BriefingPanel but lives on the canvas itself
          so mobile users (briefing panel hidden on lg-) can still walk
          back without using ESC. */}
      {focus.kind !== 'system' && (
        <button
          type="button"
          onClick={() => dispatch({ type: 'pop-focus' })}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 transition-colors"
          style={{
            background: 'var(--color-background-card, #fff)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'var(--font-family-mono, monospace)',
            letterSpacing: '0.06em',
          }}
          aria-label={lang === 'en' ? 'Back one level' : 'Volver un nivel'}
        >
          ← {lang === 'en' ? 'Back' : 'Atrás'}
          <span className="ml-1 px-1 py-0.5 text-[8px] font-mono opacity-70 border border-current rounded-sm">
            ESC
          </span>
        </button>
      )}
      {/* SVG canvas — only rendered when drilled in (Z1+).
          At Z0 (system focus) the El Panorama HTML panel replaces it entirely,
          avoiding z-index conflicts between SVG bodies and HTML overlay. */}
      {focus.kind !== 'system' && (
      <svg aria-hidden="true"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        overflow="visible"
      >
        <g
          transform={effectiveTransform}
          style={{
            transition: flyingIn ? 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            transformOrigin: '0 0',
          }}
        >
          <AnimatePresence mode="wait">
            {focus.kind === 'sector' && (
              <Z1Layer
                key={`z1-${focus.sectorId}`}
                sectorId={focus.sectorId}
                sectorCode={focus.sectorCode}
                lang={lang}
                dispatch={dispatch}
                triggerDrill={triggerCameraDrill}
                pinAnnotation={pinAnnotation}
              />
            )}
            {focus.kind === 'institution' && (
              <Z2Layer
                key={`z2-${focus.institutionId}`}
                institutionId={focus.institutionId}
                institutionName={focus.institutionName}
                lang={lang}
                dispatch={dispatch}
                triggerDrill={triggerCameraDrill}
                pinAnnotation={pinAnnotation}
              />
            )}
            {focus.kind === 'vendor' && (
              <Z3Layer
                key={`z3-${focus.vendorId}`}
                vendorId={focus.vendorId}
                vendorName={focus.vendorName}
                lang={lang}
                pinAnnotation={pinAnnotation}
              />
            )}
            {/* Z4 contract focus stays on the Z3 visual canvas — only the
                briefing panel changes. We look up the parent vendor in the
                stack and reuse Z3Layer with a highlight prop so the user
                never loses the constellation of sibling contracts. */}
            {focus.kind === 'contract' && (() => {
              // The most recent vendor focus must be on the stack — that's
              // the constellation we're showing. Walk back from the top.
              const parentVendor = [...state.stack].reverse().find((f): f is Extract<Focus, { kind: 'vendor' }> => f.kind === 'vendor')
              if (!parentVendor) return null
              return (
                <Z3Layer
                  key={`z3-${parentVendor.vendorId}`}
                  vendorId={parentVendor.vendorId}
                  vendorName={parentVendor.vendorName}
                  lang={lang}
                  highlightContractId={focus.contractId}
                  pinAnnotation={pinAnnotation}
                />
              )
            })()}
          </AnimatePresence>
        </g>
      </svg>
      )} {/* end focus.kind !== 'system' SVG */}

      {/* Z0 HTML overlay — El Panorama sector intelligence card grid */}
      {focus.kind === 'system' && (
        <Z0Panel lang={lang} dispatch={dispatch} />
      )}

      {/* Z1 HTML overlay — editorial institution list replaces SVG bubble scatter */}
      {focus.kind === 'sector' && (
        <Z1Panel
          key={`z1panel-${focus.sectorId}`}
          sectorId={focus.sectorId}
          sectorCode={focus.sectorCode}
          lang={lang}
          dispatch={dispatch}
        />
      )}

      {/* Z2 HTML overlay — vendor ranked list replaces SVG bubble scatter */}
      {focus.kind === 'institution' && (
        <Z2Panel
          key={`z2panel-${focus.institutionId}`}
          institutionId={focus.institutionId}
          institutionName={focus.institutionName}
          lang={lang}
          dispatch={dispatch}
        />
      )}

      {/* Z3 HTML overlay — contract list replaces SVG scatter */}
      {(focus.kind === 'vendor' || focus.kind === 'contract') && (() => {
        const parentVendor = focus.kind === 'vendor'
          ? focus
          : [...state.stack].reverse().find((f): f is Extract<Focus, { kind: 'vendor' }> => f.kind === 'vendor')
        if (!parentVendor) return null
        return (
          <Z3Panel
            key={`z3panel-${parentVendor.vendorId}`}
            vendorId={parentVendor.vendorId}
            vendorName={parentVendor.vendorName}
            lang={lang}
            dispatch={dispatch}
            highlightContractId={focus.kind === 'contract' ? focus.contractId : null}
          />
        )
      })()}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z1 — sector view: backdrop only (list in Z1Panel HTML overlay)
// ────────────────────────────────────────────────────────────────────────────

function Z1Layer({
  sectorId: _sectorId,
  sectorCode,
  lang: _lang,
  dispatch: _dispatch,
  triggerDrill: _triggerDrill,
  pinAnnotation: _pinAnnotation,
}: {
  sectorId: number
  sectorCode: string
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
  triggerDrill: (bodyX: number, bodyY: number, drill: () => void) => void
  pinAnnotation: Focus | null
}) {
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'
  const gradId = `z1-bg-${sectorCode}`
  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={sectorAccent} stopOpacity={0.10} />
          <stop offset="60%" stopColor={sectorAccent} stopOpacity={0.04} />
          <stop offset="100%" stopColor={sectorAccent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={`url(#${gradId})`} pointerEvents="none" />
    </motion.g>
  )
}


// ────────────────────────────────────────────────────────────────────────────
// Z2 — institution view: just backdrop gradient (list in Z2Panel HTML overlay)
// ────────────────────────────────────────────────────────────────────────────

function Z2Layer({
  institutionName: _institutionName,
  lang: _lang,
  dispatch: _dispatch,
  triggerDrill: _triggerDrill,
  pinAnnotation: _pinAnnotation,
}: {
  institutionId: number
  institutionName: string
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
  triggerDrill: (bodyX: number, bodyY: number, drill: () => void) => void
  pinAnnotation: Focus | null
}) {
  const exploreState = useExploreState()
  const parentSector = exploreState.stack.find((f) => f.kind === 'sector') as
    | { kind: 'sector'; sectorCode: string }
    | undefined
  const sectorAccent = parentSector ? SECTOR_COLORS[parentSector.sectorCode] : null
  const z2GradId = parentSector ? `z2-bg-${parentSector.sectorCode}` : null

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {sectorAccent && z2GradId && (
        <>
          <defs>
            <radialGradient id={z2GradId} cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor={sectorAccent} stopOpacity={0.07} />
              <stop offset="60%" stopColor={sectorAccent} stopOpacity={0.025} />
              <stop offset="100%" stopColor={sectorAccent} stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={`url(#${z2GradId})`} pointerEvents="none" />
        </>
      )}
    </motion.g>
  )
}


// ────────────────────────────────────────────────────────────────────────────
// Z3 — vendor view: just backdrop (list in Z3Panel HTML overlay)
// ────────────────────────────────────────────────────────────────────────────

function Z3Layer({
  vendorId: _vendorId,
  vendorName: _vendorName,
  lang: _lang,
  highlightContractId: _highlightContractId,
  pinAnnotation: _pinAnnotation,
}: {
  vendorId: number
  vendorName: string
  lang: 'en' | 'es'
  highlightContractId?: number | null
  pinAnnotation?: Focus | null
}) {
  const exploreState = useExploreState()
  const parentSector = exploreState.stack.find((f) => f.kind === 'sector') as
    | { kind: 'sector'; sectorCode: string }
    | undefined
  const sectorAccent = parentSector ? SECTOR_COLORS[parentSector.sectorCode] : null
  const z3GradId = parentSector ? `z3-bg-${parentSector.sectorCode}` : null

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {sectorAccent && z3GradId && (
        <>
          <defs>
            <radialGradient id={z3GradId} cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor={sectorAccent} stopOpacity={0.05} />
              <stop offset="100%" stopColor={sectorAccent} stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={`url(#${z3GradId})`} pointerEvents="none" />
        </>
      )}
    </motion.g>
  )
}

// Surface compatibility — sectorApi import is only kept so the module doesn't
// die from tree-shaking in a future refactor that prunes it; remove later
// when an explore-specific sector endpoint exists.
void sectorApi

// ────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────
// Z1Panel — HTML overlay: editorial institution briefing for a sector
// ────────────────────────────────────────────────────────────────────────────

type Z1SortKey = 'risk' | 'spend' | 'contracts' | 'da_pct' | 'hr_pct' | 'sector_share'
type Z2SortKey = 'risk' | 'spend' | 'contracts' | 'year'
type Z3SortKey = 'amount' | 'year' | 'risk'
type SortOrder = 'asc' | 'desc'

function tierMark(risk: number): { glyph: string; color: string; label: string } {
  if (risk >= 0.60) return { glyph: '◆', color: RISK_COLORS.critical, label: 'T1' }
  if (risk >= 0.40) return { glyph: '◆', color: RISK_COLORS.high,     label: 'T2' }
  if (risk >= 0.25) return { glyph: '●', color: RISK_COLORS.medium,   label: 'T3' }
  return               { glyph: '●', color: '#71717a',                label: 'T4' }
}

function InstRow({
  inst,
  sectorShare,
  lang: _lang,
  dispatch,
}: {
  inst: SpatialInstitution
  sectorShare: number
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
}) {
  const tier = tierMark(inst.risk)
  const riskScore = Math.round(inst.risk * 100)
  const displayName = formatEntityName('institution', inst.name, 'full')
  const da = inst.direct_award_pct
  const hr = inst.high_risk_pct
  return (
    <tr
      className="cursor-pointer transition-colors"
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
      onClick={() => dispatch({ type: 'drill-into-institution', institutionId: inst.institution_id, institutionName: inst.name })}
    >
      <td className="pl-3 pr-1 py-1.5 font-mono text-[9px] font-bold whitespace-nowrap" style={{ color: tier.color }}>
        {tier.glyph}{tier.label}
      </td>
      <td className="px-1 py-1.5" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        <div className="font-mono text-[10px] font-medium" title={displayName} style={{ color: 'var(--color-text-primary)' }}>{displayName}</div>
        <div style={{ marginTop: 3, height: 2, borderRadius: 1, background: 'var(--color-border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(sectorShare, 100)}%`, background: tier.color, borderRadius: 1, opacity: 0.7 }} />
        </div>
      </td>
      <td className="px-1 py-1.5 text-right whitespace-nowrap">
        <div className="font-mono text-[9px] tabular-nums" style={{ color: tier.color }}>{formatCompactMXN(inst.total_amount_mxn)}</div>
        <div className="font-mono text-[8px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{formatCompactUSD(inst.total_amount_mxn)}</div>
      </td>
      <td className="px-1 py-1.5 font-mono text-[9px] tabular-nums text-right" style={{ color: tier.color }}>
        {riskScore}
      </td>
      <td className="px-1 py-1.5 font-mono text-[9px] tabular-nums text-right" style={{ color: 'var(--color-text-muted)' }}>
        {da != null ? `${da.toFixed(0)}%` : '—'}
      </td>
      <td className="px-1 py-1.5 font-mono text-[9px] tabular-nums text-right" style={{ color: (hr ?? 0) > 10 ? RISK_COLORS.high : 'var(--color-text-muted)' }}>
        {hr != null ? `${hr.toFixed(0)}%` : '—'}
      </td>
      <td className="px-1 py-1.5 font-mono text-[9px] tabular-nums text-right" style={{ color: 'var(--color-text-muted)' }}>
        {formatNumber(inst.total_contracts)}
      </td>
      <td className="pr-3 pl-1 py-1.5 font-mono text-[9px] tabular-nums text-right" style={{ color: 'var(--color-text-muted)' }}>
        {sectorShare.toFixed(1)}%
      </td>
    </tr>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z0Panel — El Reparto / The Spoils
//
// 12 sectors rendered as a d3-hierarchy treemap. Cell area = total spend (or
// critical-risk count in RISK mode). Critical-risk sectors get a saturated
// SECTOR_COLORS fill; the rest get zinc with only a left-rule accent — color
// is reserved for sectors that have a story to tell.
//
// Editorial thesis: a pastel 4×3 grid hides the real finding — federal spend
// is wildly concentrated AND risk concentration does NOT follow money
// concentration. The treemap encodes that mismatch in one glance. The pull-
// line below names it in plain Spanish.
//
// Dual-context: serves both /explore Z0 (full-bleed canvas → drill to Z1)
// AND /sectors hero (within page margins → /sectors/:code route).
// ────────────────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Squarified treemap layout for 12 sectors. Pure implementation — no d3
// dependency at runtime, just the standard algorithm: sort by value
// descending, layout in rows whose total area matches each item's share.
type ReparteoCell = {
  sectorId: number
  sectorCode: string
  label: string
  value: number
  share: number
  critical: number
  x: number
  y: number
  w: number
  h: number
}

function layoutTreemap(
  items: Array<{ sectorId: number; sectorCode: string; label: string; value: number; critical: number }>,
  W: number,
  H: number,
): ReparteoCell[] {
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0) || 1
  // Normalize values to area (W*H). Use squarified algorithm.
  const sorted = [...items].sort((a, b) => b.value - a.value)
  const scale = (W * H) / total
  const areas = sorted.map((i) => Math.max(0.0001, i.value * scale))

  const result: ReparteoCell[] = []
  let x = 0, y = 0, w = W, h = H
  let i = 0

  // Squarified treemap (Bruls/Huijbregts/van Wijk 2000)
  while (i < areas.length) {
    const shortSide = Math.min(w, h)
    let row: number[] = [areas[i]]
    let bestRatio = worstAspectRatio(row, shortSide)
    let j = i + 1
    while (j < areas.length) {
      const next = [...row, areas[j]]
      const nextRatio = worstAspectRatio(next, shortSide)
      if (nextRatio > bestRatio) break
      row = next
      bestRatio = nextRatio
      j += 1
    }

    // Place the row along the short side
    const rowSum = row.reduce((s, v) => s + v, 0)
    const rowThickness = rowSum / shortSide
    let cursor = 0
    for (let k = 0; k < row.length; k++) {
      const itemIdx = i + k
      const item = sorted[itemIdx]
      const segLen = row[k] / rowThickness
      if (w >= h) {
        // place vertically — row of cells stacked along H axis at x
        result.push({
          sectorId: item.sectorId,
          sectorCode: item.sectorCode,
          label: item.label,
          value: item.value,
          share: total > 0 ? item.value / total : 0,
          critical: item.critical,
          x, y: y + cursor, w: rowThickness, h: segLen,
        })
      } else {
        result.push({
          sectorId: item.sectorId,
          sectorCode: item.sectorCode,
          label: item.label,
          value: item.value,
          share: total > 0 ? item.value / total : 0,
          critical: item.critical,
          x: x + cursor, y, w: segLen, h: rowThickness,
        })
      }
      cursor += segLen
    }
    if (w >= h) { x += rowThickness; w -= rowThickness } else { y += rowThickness; h -= rowThickness }
    i = j
  }
  return result
}

function worstAspectRatio(row: number[], shortSide: number): number {
  if (row.length === 0) return Infinity
  const rowSum = row.reduce((s, v) => s + v, 0)
  const sPow2 = shortSide * shortSide
  let max = 0
  for (const r of row) {
    const ratio1 = (sPow2 * r) / (rowSum * rowSum)
    const ratio2 = (rowSum * rowSum) / (sPow2 * r)
    max = Math.max(max, ratio1, ratio2)
  }
  return max
}

// ── Editorial findings — short, story-anchored lines for sectors with a
//    confirmed narrative. Anything not listed here gets a 4-word tag below
//    (DESCRIPTIVE_TAGS) — no invented stories.
const EDITORIAL_FINDINGS: Record<string, { es: string; en: string }> = {
  salud: {
    es: 'Donde se concentra el riesgo crítico del país.',
    en: 'Where the country\'s critical-risk vendors concentrate.',
  },
  educacion: {
    es: 'La Estafa Maestra desvió 7.6 mil millones aquí.',
    en: 'Estafa Maestra diverted 7.6B MXN through this sector.',
  },
  energia: {
    es: 'Mayor gasto. Menor riesgo. La paradoja energética.',
    en: 'Biggest budget. Lowest risk. The energy paradox.',
  },
  defensa: {
    es: 'Opaca por diseño: SEDENA y SEMAR adjudican directo.',
    en: 'Opaque by design: SEDENA and SEMAR award directly.',
  },
  tecnologia: {
    es: 'Pocos contratos, captura institucional profunda.',
    en: 'Few contracts, deep institutional capture.',
  },
}

const DESCRIPTIVE_TAGS: Record<string, { es: string; en: string }> = {
  infraestructura: { es: 'Obra pública · SCT · CAPUFE', en: 'Public works · SCT · CAPUFE' },
  hacienda:        { es: 'SHCP · SAT · admin. fiscal',  en: 'Treasury · SAT · fiscal admin' },
  gobernacion:     { es: 'SEGOB · seguridad · servicios', en: 'SEGOB · security · services' },
  agricultura:     { es: 'SADER · subsidios al campo',  en: 'SADER · rural subsidies' },
  ambiente:        { es: 'SEMARNAT · CONAGUA · parques', en: 'SEMARNAT · water · parks' },
  trabajo:         { es: 'STPS · justicia laboral',     en: 'STPS · labor justice' },
  otros:           { es: 'Sin clasificar · misceláneos', en: 'Unclassified · miscellaneous' },
}

// Color encoding for the new design — fill = sector color always, opacity
// is driven by critical_share_pct. Maps 0% → 0.50 floor (visible color
// still), 7%+ → bright (0.95). Floor raised from 0.22 to 0.50 so text
// contrast holds even on the dimmest cells.
function fillOpacityFromCriticalShare(critSharePct: number, hovered: boolean): number {
  const normalized = Math.min(1, Math.max(0, critSharePct / 7))
  const base = 0.50 + normalized * 0.45   // 0.50 .. 0.95
  return hovered ? Math.min(1, base + 0.05) : base
}

// Perceived luminance of a hex color (sRGB). Yellow / bright-green sector
// colors are inherently light and need DARK text regardless of opacity;
// dark reds, blues, purples need WHITE text. Cells inherit a high opacity
// floor (≥0.50), so the resulting fill is close to the pure sector hex —
// luminance of the hex is a good predictor of perceived background lightness.
function luminanceOfHex(hex: string): number {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function isLightSectorColor(hex: string): boolean {
  return luminanceOfHex(hex) > 0.55
}

// Animation canon now lives in ZPrimitives — imported below alongside the
// shared breadcrumb / kicker / pull-line / sort-toggle primitives used by
// Z1-Z4. Z0 imports the same constants to keep a single source of truth.

function Z0Panel({
  lang,
  dispatch,
}: {
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const treemapRef = useRef<HTMLDivElement>(null)
  const [hoverId, setHoverId] = useState<number | null>(null)
  const [mode, setMode] = useState<'spend' | 'risk'>('spend')
  const [size, setSize] = useState({ w: 1040, h: 520 })
  const [isMobile, setIsMobile] = useState(false)

  // Reduced-motion gate. Reader has opted out → all transforms disabled,
  // opacity-only arrival, snap layout, instant drill. Single hook drives
  // every transition below via the `trans()` factory.
  const prefersReducedMotion = useReducedMotion() ?? false
  const trans = (duration: number, delay = 0) =>
    prefersReducedMotion
      ? { duration: 0 }
      : { duration, delay, ease: Z_EASE }

  // Header cascade variants. Each band gets opacity+y entrance with
  // increasing delay so the eye lands in order: kicker → stats → treemap
  // (treemap has its own variants below).
  const bandVariants: Variants = {
    hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: trans(Z_BAND_S, custom * Z_CASCADE_STEP_S),
    }),
  }

  // Treemap container variant — orchestrates the children stagger. Children
  // (cells) inherit `visible` and fire on staggerChildren cadence.
  const treemapVariants: Variants = {
    hidden: {},
    visible: {
      transition: prefersReducedMotion
        ? { staggerChildren: 0 }
        : {
            delayChildren: Z_TREEMAP_DELAY_S,
            staggerChildren: Z_CELL_STAGGER_S,
          },
    },
  }

  // Per-cell entrance variant — opacity + tiny scale, no slide. The cells
  // are already in their truthful positions; we're just bringing up the
  // lights.
  const cellVariants: Variants = {
    hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 },
    visible: { opacity: 1, scale: 1, transition: trans(Z_CELL_ENTRANCE_S) },
  }

  // Layout transition (sort-toggle): cells rearrange via framer-motion's
  // `layout` prop. 720ms expoOut — long enough to follow a cell with the
  // eye, short enough to stay responsive.
  const layoutTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: Z_LAYOUT_DURATION_S, ease: Z_EASE }

  // Track container dimensions for accurate layout
  useEffect(() => {
    const el = treemapRef.current
    const outer = containerRef.current
    if (!el || !outer) return
    const obs = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 0 && h > 0) setSize({ w, h })
      setIsMobile(outer.clientWidth < 640)
    })
    obs.observe(el)
    obs.observe(outer)
    return () => obs.disconnect()
  }, [])

  const { data: treemapData, isLoading } = useQuery({
    queryKey: ['explore', 'z0-treemap'],
    queryFn: () => sectorApi.getTreemap(),
    staleTime: 30 * 60 * 1000,
  })

  const sectors = treemapData?.sectors ?? []
  const totalSpend = treemapData?.total_value_mxn ?? 0
  const totalCritical = treemapData?.total_critical_count ?? 0

  // Build the items list for the treemap.
  // Min-area floor: 2.5% of total area per cell — keeps the smallest sectors
  // readable while preserving the visual hierarchy.
  const MIN_AREA_FRACTION = 0.025
  const treeItems = useMemo(() => {
    if (sectors.length === 0) return []
    const rawValues = sectors.map((s) =>
      mode === 'risk'
        ? Math.max(0, s.critical_risk_count)
        : Math.max(0, s.total_value_mxn)
    )
    const rawTotal = rawValues.reduce((a, b) => a + b, 0) || 1
    const floor = rawTotal * MIN_AREA_FRACTION
    return sectors.map((s, i) => {
      const raw = rawValues[i]
      const flooredValue = Math.max(raw, floor)
      const label = lang === 'es' ? s.sector_name_es : s.sector_name_en
      return {
        sectorId: s.sector_id,
        sectorCode: s.sector_code,
        label,
        value: flooredValue,
        critical: s.critical_risk_count,
        criticalSharePct: s.critical_share_pct,
        spendValue: s.total_value_mxn,
        spendPct: totalSpend > 0 ? (s.total_value_mxn / totalSpend) * 100 : 0,
        topInstitutions: s.top_institutions,
      }
    })
  }, [sectors, mode, lang, totalSpend])

  const cells = useMemo(
    () => (treeItems.length > 0 ? layoutTreemap(treeItems, size.w, Math.max(200, size.h)) : []),
    [treeItems, size.w, size.h]
  )

  // Map from sectorId back to the full sector item so cell renders can
  // access institutions, critical share, spend, etc.
  const itemBySectorId = useMemo(() => {
    const m = new Map<number, typeof treeItems[number]>()
    for (const it of treeItems) m.set(it.sectorId, it)
    return m
  }, [treeItems])

  const handleDrill = (sectorId: number, sectorCode: string) => {
    dispatch({ type: 'drill-into-sector', sectorId, sectorCode })
  }

  // ── Headline / kicker strings ────────────────────────────────────────────
  const isEs = lang === 'es'
  const sectionEyebrow = isEs ? '§ EL REPARTO' : '§ THE SPOILS'
  const headline = isEs ? 'Cómo México reparte' : 'How Mexico divides'
  const headlineSub = isEs ? '9.9 billones de pesos' : '9.9 trillion pesos'
  const sortLabel = isEs ? 'ORDENAR' : 'SORT'
  const spendLabel = isEs ? 'GASTO' : 'SPEND'
  const riskLabel = isEs ? 'RIESGO' : 'RISK'

  return (
    <motion.div
      ref={containerRef}
      initial="hidden"
      animate="visible"
      className="absolute inset-0 z-[5] flex flex-col"
      style={{ background: 'var(--color-background)', overflow: 'hidden' }}
    >
      {/* Editorial header — kicker + headline cascade in as one band */}
      <motion.div
        variants={bandVariants}
        custom={0}
        className="flex items-end justify-between gap-4 px-4 sm:px-6 pt-4 pb-3 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="min-w-0">
          <div
            className="font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5"
            style={{ color: 'var(--color-accent)' }}
          >
            {sectionEyebrow}
          </div>
          <h1
            className="font-serif text-text-primary leading-[1.05]"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(1.4rem, 2.4vw, 2.1rem)',
              letterSpacing: '-0.015em',
            }}
          >
            {headline}{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 800 }}>{headlineSub}</em>
          </h1>
        </div>

        {/* Stat row + sort — second band in the cascade (custom={1}) */}
        <motion.div
          variants={bandVariants}
          custom={1}
          className="flex items-baseline gap-4 sm:gap-6 flex-wrap"
        >
          {/* Total spend */}
          <div className="text-right">
            <div
              className="font-mono tabular-nums text-text-primary leading-tight"
              style={{ fontSize: 'clamp(1rem, 1.6vw, 1.5rem)', fontWeight: 700 }}
            >
              {formatCompactMXN(totalSpend)}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              {isEs ? 'gasto federal' : 'federal spend'}
            </div>
          </div>

          {/* Critical contracts */}
          <div className="text-right">
            <div
              className="font-mono tabular-nums leading-tight"
              style={{
                fontSize: 'clamp(1rem, 1.6vw, 1.5rem)',
                fontWeight: 700,
                color: 'var(--color-risk-critical)',
              }}
            >
              {formatNumber(totalCritical)}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              {isEs ? 'contratos críticos' : 'critical contracts'}
            </div>
          </div>

          {/* Sort toggle */}
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted">
              {sortLabel}
            </span>
            <div className="flex rounded-sm overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              {(['spend', 'risk'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="font-mono text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 transition-colors"
                  style={{
                    background: mode === m ? (m === 'risk' ? RISK_COLORS.critical : 'var(--color-accent)') : 'transparent',
                    color: mode === m ? '#fff' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                >
                  {m === 'spend' ? spendLabel : riskLabel}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Treemap area — its own band in the entrance cascade.
          Children (cells) stagger inside via treemapVariants. */}
      <motion.div
        variants={bandVariants}
        custom={2}
        ref={treemapRef}
        className="relative flex-1 min-h-0"
        style={{ overflow: 'hidden' }}
      >
        {isLoading && (
          <div
            className="absolute inset-0 flex items-center justify-center font-mono text-[10px]"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {isEs ? 'cargando...' : 'loading...'}
          </div>
        )}

        {!isLoading && cells.length > 0 && !isMobile && (
          <motion.div
            variants={treemapVariants}
            className="absolute inset-0 p-3"
          >
            <div className="relative w-full h-full">
              {cells.map((cell) => {
                const item = itemBySectorId.get(cell.sectorId)
                if (!item) return null
                const color = SECTOR_COLORS[cell.sectorCode] ?? '#64748b'
                const hovered = hoverId === cell.sectorId
                const opacity = fillOpacityFromCriticalShare(item.criticalSharePct, hovered)

                // Determine cell tier from rendered area
                const cellArea = cell.w * cell.h
                const tier: 'xl' | 'l' | 'm' | 's' =
                  cellArea >= 80_000 ? 'xl'
                  : cellArea >= 28_000 ? 'l'
                  : cellArea >= 12_000 ? 'm'
                  : 's'

                // Editorial finding only for cells L+ with a known narrative
                const findingForCell = (tier === 'xl' || tier === 'l')
                  ? EDITORIAL_FINDINGS[cell.sectorCode]
                  : null
                const tagForCell = DESCRIPTIVE_TAGS[cell.sectorCode]
                const editorial = findingForCell
                  ? (isEs ? findingForCell.es : findingForCell.en)
                  : tagForCell
                    ? (isEs ? tagForCell.es : tagForCell.en)
                    : null

                // Text color is driven by SECTOR HUE, not opacity. Yellow
                // (Energía) and bright green (Agricultura) are inherently light
                // → need dark text. Reds, blues, purples → white text. Opacity
                // floor of 0.50 means the sector hue dominates the fill regardless.
                const useDarkText = isLightSectorColor(color)
                const textColor = useDarkText ? 'rgba(20,20,20,0.96)' : '#ffffff'
                const subTextColor = useDarkText ? 'rgba(20,20,20,0.72)' : 'rgba(255,255,255,0.82)'
                const codeColor = useDarkText ? 'rgba(20,20,20,0.78)' : 'rgba(255,255,255,0.86)'

                return (
                  <motion.div
                    key={cell.sectorId}
                    layout
                    layoutId={`explore-cell-${cell.sectorId}`}
                    variants={cellVariants}
                    transition={{ layout: layoutTransition }}
                    whileHover={prefersReducedMotion ? undefined : { y: -1, scale: 1.004, filter: 'brightness(1.05)', transition: { duration: 0.16, ease: Z_EASE } }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.992 }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${cell.label} - ${formatCompactMXN(item.spendValue)}`}
                    onClick={() => handleDrill(cell.sectorId, cell.sectorCode)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleDrill(cell.sectorId, cell.sectorCode)
                      }
                    }}
                    onMouseEnter={() => setHoverId(cell.sectorId)}
                    onMouseLeave={() => setHoverId(null)}
                    style={{
                      position: 'absolute',
                      left: cell.x,
                      top: cell.y,
                      width: Math.max(0, cell.w - 3),
                      height: Math.max(0, cell.h - 3),
                      background: hexToRgba(color, opacity),
                      borderRadius: 2,
                      padding: tier === 'xl' ? '16px 18px' : tier === 'l' ? '12px 14px' : tier === 'm' ? '10px 12px' : '8px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.22)' : 'none',
                      transitionProperty: 'box-shadow, background',
                      transitionDuration: '0.18s',
                    }}
                  >
                    {tier === 'xl' && <XLCellContent item={item} color={codeColor} textColor={textColor} subTextColor={subTextColor} editorial={editorial} isEs={isEs} />}
                    {tier === 'l' && <LCellContent item={item} color={codeColor} textColor={textColor} subTextColor={subTextColor} editorial={editorial} isEs={isEs} />}
                    {tier === 'm' && <MCellContent item={item} color={codeColor} textColor={textColor} subTextColor={subTextColor} editorial={editorial} isEs={isEs} />}
                    {tier === 's' && <SCellContent item={item} color={codeColor} textColor={textColor} subTextColor={subTextColor} editorial={null} isEs={isEs} />}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Mobile fallback: ranked list with sector-color left rail (width = value) */}
        {!isLoading && cells.length > 0 && isMobile && (
          <div className="absolute inset-0 overflow-y-auto p-3 pb-12">
            <ul role="list" className="space-y-1.5">
              {[...sectors]
                .sort((a, b) => (mode === 'risk'
                  ? b.critical_share_pct - a.critical_share_pct
                  : b.total_value_mxn - a.total_value_mxn))
                .map((s) => {
                  const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'
                  const label = isEs ? s.sector_name_es : s.sector_name_en
                  const spendPct = totalSpend > 0 ? (s.total_value_mxn / totalSpend) * 100 : 0
                  const railWidthPct = Math.max(3, spendPct * 2)  // amplify so smallest are visible
                  const opacity = fillOpacityFromCriticalShare(s.critical_share_pct, false)
                  const finding = EDITORIAL_FINDINGS[s.sector_code]
                  const tag = DESCRIPTIVE_TAGS[s.sector_code]
                  const editorial = finding ? (isEs ? finding.es : finding.en)
                    : tag ? (isEs ? tag.es : tag.en) : null
                  return (
                    <li key={s.sector_id}>
                      <button
                        type="button"
                        onClick={() => handleDrill(s.sector_id, s.sector_code)}
                        className="w-full text-left rounded-sm overflow-hidden relative block hover:opacity-95 transition-opacity"
                        style={{
                          background: hexToRgba(color, opacity * 0.85),
                          padding: '10px 12px',
                          minHeight: 64,
                        }}
                      >
                        {/* Sector-color rail at top encodes spend share */}
                        <div
                          className="absolute top-0 left-0 h-[3px]"
                          style={{ width: `${Math.min(100, railWidthPct)}%`, background: color }}
                          aria-hidden="true"
                        />
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.78)' }}>
                              {s.sector_code} · {spendPct.toFixed(1)}%
                            </div>
                            <div
                              className="font-serif"
                              style={{
                                fontFamily: "'Playfair Display', Georgia, serif",
                                fontWeight: 700,
                                fontStyle: 'italic',
                                fontSize: 17,
                                color: '#ffffff',
                                lineHeight: 1.1,
                              }}
                            >
                              {label}
                            </div>
                            {editorial && (
                              <div
                                className="font-mono text-[10px] mt-0.5"
                                style={{ color: 'rgba(255,255,255,0.78)' }}
                              >
                                {editorial}
                              </div>
                            )}
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <div className="font-mono tabular-nums text-sm font-bold" style={{ color: '#ffffff' }}>
                              {formatCompactMXN(s.total_value_mxn)}
                            </div>
                            <div className="font-mono text-[10px] tabular-nums" style={{ color: 'rgba(255,255,255,0.78)' }}>
                              {s.critical_share_pct.toFixed(1)}% {isEs ? 'crít' : 'crit'}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
            </ul>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Cell content components ─────────────────────────────────────────────────

type CellItem = {
  sectorId: number
  sectorCode: string
  label: string
  spendValue: number
  spendPct: number
  critical: number
  criticalSharePct: number
  topInstitutions: Array<{ institution_id: number; name: string; siglas?: string | null; value_mxn: number; share_pct: number }>
}

// Frontend fallback map for institutions whose DB row lacks a siglas
// value. Keys are uppercase name prefixes (matched via startsWith). The
// official thing to do is to fix the institutions.siglas column, but
// this map lets us ship recognizable acronyms now without a data migration.
const NAME_TO_SIGLAS_FALLBACK: Array<[string, string]> = [
  ['CAMINOS Y PUENTES FEDERALES', 'CAPUFE'],
  ['SERVICIO DE ADMINISTRACIÓN TRIBUTARIA', 'SAT'],
  ['SERVICIO DE ADMINISTRACION TRIBUTARIA', 'SAT'],
  ['SECRETARÍA DE HACIENDA Y CRÉDITO PÚBLICO', 'SHCP'],
  ['SECRETARIA DE HACIENDA Y CREDITO PUBLICO', 'SHCP'],
  ['SECRETARÍA DE LA DEFENSA NACIONAL', 'SEDENA'],
  ['SECRETARIA DE LA DEFENSA NACIONAL', 'SEDENA'],
  ['SECRETARÍA DE MARINA', 'SEMAR'],
  ['SECRETARIA DE MARINA', 'SEMAR'],
  ['SECRETARÍA DE GOBERNACIÓN', 'SEGOB'],
  ['SECRETARIA DE GOBERNACION', 'SEGOB'],
  ['SECRETARÍA DE SALUD', 'SSA'],
  ['SECRETARIA DE SALUD', 'SSA'],
  ['SECRETARÍA DE EDUCACIÓN PÚBLICA', 'SEP'],
  ['SECRETARIA DE EDUCACION PUBLICA', 'SEP'],
  ['SECRETARÍA DE AGRICULTURA', 'SADER'],
  ['SECRETARIA DE AGRICULTURA', 'SADER'],
  ['SECRETARÍA DE MEDIO AMBIENTE', 'SEMARNAT'],
  ['SECRETARIA DE MEDIO AMBIENTE', 'SEMARNAT'],
  ['SECRETARÍA DEL TRABAJO', 'STPS'],
  ['SECRETARIA DEL TRABAJO', 'STPS'],
  ['SECRETARÍA DE COMUNICACIONES Y TRANSPORTES', 'SCT'],
  ['SECRETARIA DE COMUNICACIONES Y TRANSPORTES', 'SCT'],
  ['SECRETARÍA DE INFRAESTRUCTURA', 'SICT'],
  ['SECRETARIA DE INFRAESTRUCTURA', 'SICT'],
  ['GRUPO AEROPORTUARIO DE LA CIUDAD DE MÉXICO', 'GACM'],
  ['GRUPO AEROPORTUARIO DE LA CIUDAD DE MEXICO', 'GACM'],
  ['INSTITUTO POLITÉCNICO NACIONAL', 'IPN'],
  ['INSTITUTO POLITECNICO NACIONAL', 'IPN'],
  ['COMISIÓN FEDERAL DE ELECTRICIDAD', 'CFE'],
  ['COMISION FEDERAL DE ELECTRICIDAD', 'CFE'],
  ['COMISIÓN NACIONAL DEL AGUA', 'CONAGUA'],
  ['COMISION NACIONAL DEL AGUA', 'CONAGUA'],
  ['CENTRO MEDICO NACIONAL', 'CMN'],
  ['CENTRO MÉDICO NACIONAL', 'CMN'],
  ['HOSPITAL GENERAL DE MÉXICO', 'HGM'],
  ['HOSPITAL GENERAL DE MEXICO', 'HGM'],
  ['FONDO NACIONAL DE FOMENTO AL TURISMO', 'FONATUR'],
]

function inferSiglasFromName(name: string): string | null {
  const upper = (name || '').toUpperCase().trim()
  for (const [prefix, siglas] of NAME_TO_SIGLAS_FALLBACK) {
    if (upper.startsWith(prefix)) return siglas
  }
  return null
}

// Short institution label: siglas if present, else inferred from a small
// known-prefix map, else extract a 14-char editorial shorthand from the
// full name. Stops "INSTITUTO MEXICANO DEL SEGURO SOCIAL" string-of-doom
// from bunching up the cell list.
function shortInstitutionLabel(name: string, siglas?: string | null): string {
  if (siglas && siglas.trim()) return siglas.trim().toUpperCase()
  const inferred = inferSiglasFromName(name)
  if (inferred) return inferred
  const cleaned = name
    .replace(/^(SECRETAR[IÍ]A DE|INSTITUTO (NACIONAL )?DE|COMISI[OÓ]N (NACIONAL )?DE|HOSPITAL|FONDO (NACIONAL )?DE|CENTRO (NACIONAL )?(DE|PARA)|SERVICIOS? DE|UNIVERSIDAD|DIRECCI[OÓ]N (GENERAL )?DE)\s*/i, '')
    .trim()
  if (cleaned.length <= 14) return cleaned
  const cut = cleaned.slice(0, 14)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 6 ? cut.slice(0, lastSpace) : cut) + '…'
}

// Logos that exist in frontend/public/logos/. Add a siglas here (and
// drop the SVG file in /public/logos/) to have it auto-render. The
// frontend assumes /logos/<key>.svg where <key> is the lowercased
// siglas. Aliases let us map old siglas to renamed agencies (e.g.
// SCT → sict after the 2021 rename).
const LOGO_FILE_MAP: Record<string, string> = {
  IMSS: 'imss',
  ISSSTE: 'issste',
  PEMEX: 'pemex',
  CFE: 'cfe',
  CONAGUA: 'conagua',
  SEDENA: 'sedena',
  SEMAR: 'semar',
  SEP: 'sep',
  SHCP: 'shcp',
  IPN: 'ipn',
  SSA: 'ssa',
  SCT: 'sict',        // renamed to SICT in 2021
  SICT: 'sict',
  SALUD: 'ssa',
}

function logoSrcForSiglas(siglas: string | null | undefined): string | null {
  if (!siglas) return null
  const key = siglas.trim().toUpperCase()
  const file = LOGO_FILE_MAP[key]
  return file ? `/logos/${file}.svg` : null
}

// Resolve effective siglas: API value first, else infer from name. Used
// for both label display and logo lookup so an institution missing a
// DB siglas can still pick up its known logo file.
function effectiveSiglas(name: string, siglas: string | null | undefined): string | null {
  if (siglas && siglas.trim()) return siglas.trim().toUpperCase()
  return inferSiglasFromName(name)
}

type CellProps = {
  item: CellItem
  color: string         // for the sector code kicker
  textColor: string
  subTextColor: string
  editorial: string | null
  isEs: boolean
}

// 22×22 institution logo. Shows the actual SVG from /logos/<file>.svg
// if mapped via LOGO_FILE_MAP, otherwise renders a 22×22 acronym chip
// (sector-color faded background, white bold text — up to 5 chars,
// auto-shrinks for longer acronyms like ISSSTE / IMSSBIENESTAR).
function InstitutionLogo({
  logoSrc,
  acronym,
  fallbackBg,
  fallbackColor,
}: {
  logoSrc: string | null
  acronym: string
  fallbackBg: string
  fallbackColor: string
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = logoSrc && !imgFailed
  // Trim acronym to chip-friendly length
  const chipText = acronym.length > 5 ? acronym.slice(0, 4) : acronym
  const fontSize = chipText.length >= 5 ? 7 : chipText.length === 4 ? 8 : 9
  return (
    <span
      className="flex-shrink-0 inline-flex items-center justify-center rounded-sm overflow-hidden"
      style={{
        width: 22,
        height: 22,
        background: showImg ? '#ffffff' : fallbackBg,
        padding: showImg ? 2 : 0,
      }}
      aria-hidden="true"
    >
      {showImg ? (
        <img
          src={logoSrc}
          alt=""
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          loading="lazy"
        />
      ) : (
        <span
          className="font-mono"
          style={{
            fontSize,
            fontWeight: 800,
            color: fallbackColor,
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}
        >
          {chipText}
        </span>
      )}
    </span>
  )
}

function CellKicker({ code, color }: { code: string; color: string }) {
  return (
    <span
      className="font-mono"
      style={{
        fontSize: 9,
        fontWeight: 700,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        lineHeight: 1,
      }}
    >
      {code}
    </span>
  )
}

function XLCellContent({ item, color, textColor, subTextColor, editorial, isEs }: CellProps) {
  return (
    <>
      <CellKicker code={item.sectorCode} color={color} />
      {/* Big total + share — anchor the eye */}
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className="font-mono tabular-nums"
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: textColor,
            lineHeight: 1,
            letterSpacing: '-0.01em',
          }}
        >
          {formatCompactMXN(item.spendValue)}
        </span>
        <span className="font-mono text-xs tabular-nums" style={{ color: subTextColor }}>
          {item.spendPct.toFixed(1)}%
        </span>
      </div>
      {/* Sector name — Playfair italic */}
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 800,
          fontStyle: 'italic',
          fontSize: 'clamp(22px, 3vw, 36px)',
          color: textColor,
          lineHeight: 1.04,
          letterSpacing: '-0.015em',
          marginTop: 6,
          marginBottom: 4,
        }}
      >
        {item.label}
      </div>
      {/* Editorial finding */}
      {editorial && (
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 13,
            color: subTextColor,
            lineHeight: 1.35,
            marginBottom: 10,
            maxWidth: '90%',
          }}
        >
          “{editorial}”
        </div>
      )}
      {/* Top institutions */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          className="font-mono text-[9px] uppercase tracking-[0.14em] mb-1"
          style={{ color: subTextColor, opacity: 0.85 }}
        >
          {isEs ? 'PRINCIPALES INSTITUCIONES' : 'TOP INSTITUTIONS'}
        </div>
        <ul className="space-y-1.5">
          {item.topInstitutions.slice(0, 3).map((inst) => {
            const eff = effectiveSiglas(inst.name, inst.siglas)
            const short = shortInstitutionLabel(inst.name, eff)
            const logoSrc = logoSrcForSiglas(eff)
            // Fallback chip uses high-contrast vs the cell's text color
            const fallbackChipBg = textColor === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(20,20,20,0.12)'
            const fallbackChipColor = textColor
            return (
              <li key={inst.institution_id} className="flex items-center gap-2 min-w-0" title={inst.name}>
                <InstitutionLogo
                  logoSrc={logoSrc}
                  acronym={short}
                  fallbackBg={fallbackChipBg}
                  fallbackColor={fallbackChipColor}
                />
                <span
                  className="font-mono tracking-[0.04em] flex-1"
                  style={{ color: textColor, fontWeight: 700, fontSize: 13 }}
                >
                  {short}
                </span>
                <span className="font-mono tabular-nums text-[12px] whitespace-nowrap" style={{ color: textColor, fontWeight: 700 }}>
                  {inst.share_pct.toFixed(1)}%
                </span>
              </li>
            )
          })}
        </ul>
      </div>
      {/* Footer rail: critical share + contracts */}
      <div
        className="mt-2 pt-2 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(255,255,255,0.20)' }}
      >
        <span className="font-mono text-[10px]" style={{ color: subTextColor }}>
          {isEs ? 'Críticos' : 'Critical'}{' '}
          <span className="tabular-nums font-bold" style={{ color: textColor }}>
            {item.criticalSharePct.toFixed(1)}%
          </span>
        </span>
        <span className="font-mono text-[10px] tabular-nums" style={{ color: subTextColor }}>
          {formatNumber(item.critical)} {isEs ? 'ctr' : 'contracts'}
        </span>
      </div>
    </>
  )
}

function LCellContent({ item, color, textColor, subTextColor, editorial, isEs }: CellProps) {
  const topInst = item.topInstitutions[0]
  return (
    <>
      <CellKicker code={item.sectorCode} color={color} />
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className="font-mono tabular-nums"
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: textColor,
            lineHeight: 1,
          }}
        >
          {formatCompactMXN(item.spendValue)}
        </span>
        <span className="font-mono text-[10px] tabular-nums" style={{ color: subTextColor }}>
          {item.spendPct.toFixed(1)}%
        </span>
      </div>
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 800,
          fontStyle: 'italic',
          fontSize: 22,
          color: textColor,
          lineHeight: 1.05,
          marginTop: 4,
          marginBottom: 2,
        }}
      >
        {item.label}
      </div>
      {editorial && (
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 11,
            color: subTextColor,
            lineHeight: 1.3,
            marginBottom: 6,
          }}
        >
          {editorial}
        </div>
      )}
      {topInst && (
        <div className="flex-1 min-h-0">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] mb-1" style={{ color: subTextColor, opacity: 0.85 }}>
            {isEs ? 'TOP' : 'TOP'}
          </div>
          <div className="flex items-center gap-2 min-w-0" title={topInst.name}>
            {(() => {
              const eff = effectiveSiglas(topInst.name, topInst.siglas)
              const short = shortInstitutionLabel(topInst.name, eff)
              return (
                <>
                  <InstitutionLogo
                    logoSrc={logoSrcForSiglas(eff)}
                    acronym={short}
                    fallbackBg={textColor === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(20,20,20,0.12)'}
                    fallbackColor={textColor}
                  />
                  <span
                    className="font-mono tracking-[0.04em] flex-1"
                    style={{ color: textColor, fontWeight: 700, fontSize: 12 }}
                  >
                    {short}
                  </span>
                </>
              )
            })()}
            <span className="font-mono tabular-nums text-[11px] font-bold" style={{ color: textColor }}>
              {topInst.share_pct.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
      <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.16)' }}>
        <span className="font-mono text-[9px]" style={{ color: subTextColor }}>
          {isEs ? 'Críticos' : 'Critical'}{' '}
          <span className="tabular-nums font-bold" style={{ color: textColor }}>
            {item.criticalSharePct.toFixed(1)}%
          </span>
        </span>
      </div>
    </>
  )
}

function MCellContent({ item, color, textColor, subTextColor, editorial, isEs: _isEs }: CellProps) {
  return (
    <>
      <CellKicker code={item.sectorCode} color={color} />
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 800,
          fontStyle: 'italic',
          fontSize: 15,
          color: textColor,
          lineHeight: 1.1,
          marginTop: 4,
          marginBottom: 2,
        }}
      >
        {item.label}
      </div>
      <div className="font-mono tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: textColor, lineHeight: 1 }}>
        {formatCompactMXN(item.spendValue)}
        <span className="ml-1 font-normal" style={{ fontSize: 9, color: subTextColor }}>
          {item.spendPct.toFixed(1)}%
        </span>
      </div>
      {editorial && (
        <div
          className="font-mono mt-1"
          style={{ fontSize: 9, color: subTextColor, lineHeight: 1.25 }}
        >
          {editorial}
        </div>
      )}
      <div className="mt-auto font-mono text-[9px] tabular-nums" style={{ color: subTextColor }}>
        {item.criticalSharePct.toFixed(1)}% crit
      </div>
    </>
  )
}

function SCellContent({ item, color, textColor, subTextColor, editorial: _editorial, isEs: _isEs }: CellProps) {
  return (
    <>
      <CellKicker code={item.sectorCode} color={color} />
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontStyle: 'italic',
          fontSize: 13,
          color: textColor,
          lineHeight: 1.1,
          marginTop: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={item.label}
      >
        {item.label}
      </div>
      <div className="mt-auto font-mono tabular-nums" style={{ fontSize: 10, fontWeight: 700, color: textColor, lineHeight: 1 }}>
        {formatCompactMXN(item.spendValue)}
        <span className="ml-1 font-normal" style={{ fontSize: 9, color: subTextColor }}>
          {item.spendPct.toFixed(1)}%
        </span>
      </div>
    </>
  )
}

function Z1Panel({
  sectorId,
  sectorCode,
  lang,
  dispatch,
}: {
  sectorId: number
  sectorCode: string
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['explore', 'z1', sectorId],
    queryFn: () => atlasApi.getSectorInstitutionsSpatial({ sectorId, limit: 60 }),
    enabled: sectorId > 0 && sectorId <= 12,
    staleTime: 10 * 60 * 1000,
  })

  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'
  const institutions = data?.institutions ?? []
  const totalSectorSpend = institutions.reduce((s, i) => s + i.total_amount_mxn, 0)

  // Editorial dek: top N institutions' spend share
  const top4Share = institutions.slice(0, 4).reduce((s, i) => s + i.total_amount_mxn, 0)
  const top4Pct = totalSectorSpend > 0 ? (top4Share / totalSectorSpend * 100).toFixed(0) : '—'

  const [sortKey, setSortKey] = useState<Z1SortKey>('risk')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [routineOpen, setRoutineOpen] = useState(true)

  const handleSort = (key: Z1SortKey) => {
    if (sortKey === key) setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortOrder('desc') }
  }

  const sectorShareOf = (inst: SpatialInstitution) =>
    totalSectorSpend > 0 ? (inst.total_amount_mxn / totalSectorSpend) * 100 : 0

  const sorted = [...institutions].sort((a, b) => {
    const dir = sortOrder === 'desc' ? -1 : 1
    switch (sortKey) {
      case 'risk':         return dir * ((b.risk ?? 0) - (a.risk ?? 0))
      case 'spend':        return dir * (b.total_amount_mxn - a.total_amount_mxn)
      case 'contracts':    return dir * (b.total_contracts - a.total_contracts)
      case 'da_pct':       return dir * ((b.direct_award_pct ?? 0) - (a.direct_award_pct ?? 0))
      case 'hr_pct':       return dir * ((b.high_risk_pct ?? 0) - (a.high_risk_pct ?? 0))
      case 'sector_share': return dir * (sectorShareOf(b) - sectorShareOf(a))
      default:             return 0
    }
  })
  const useShelf = sortKey === 'risk'
  const shelfCritical = useShelf ? sorted.filter((i) => (i.risk ?? 0) >= 0.60) : []
  const shelfHigh     = useShelf ? sorted.filter((i) => { const r = i.risk ?? 0; return r >= 0.40 && r < 0.60 }) : []
  const shelfRoutine  = useShelf ? sorted.filter((i) => (i.risk ?? 0) < 0.40) : sorted

  return (
    <div
      className="absolute inset-0 z-[5] overflow-y-auto"
      data-scroll-panel="true"
      style={{ background: 'var(--color-background)', top: '48px' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header — three-line pattern matching Z2/Z3 */}
      <div
        className="px-4 py-3 sticky top-0 border-b"
        style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', zIndex: 1 }}
      >
        <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: sectorAccent }}>
          {lang === 'en' ? 'Z1 · INSTITUTIONS' : 'Z1 · INSTITUCIONES'}
        </div>
        <div className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--color-text-primary)' }}>
          {lang === 'en'
            ? (data?.sector_name_en ?? sectorCode)
            : (data?.sector_name_es ?? sectorCode)}
        </div>
        <div className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {isLoading
            ? '…'
            : lang === 'en'
              ? `${institutions.length} institutions · ${formatCompactMXN(totalSectorSpend)} · top 4 at ${top4Pct}%`
              : `${institutions.length} instituciones · ${formatCompactMXN(totalSectorSpend)} · top 4 al ${top4Pct}%`}
        </div>
        {!isLoading && sortKey !== 'risk' && (
          <div className="font-mono text-[8px] mt-0.5" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
            {lang === 'en' ? `sorted by ${sortKey} · risk triage disabled` : `orden: ${sortKey} · análisis de riesgo desactivado`}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="py-12 text-center font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en' ? 'Loading…' : 'Cargando…'}
        </div>
      )}
      {isError && (
        <div className="py-12 text-center font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en' ? 'No institution data.' : 'Sin datos.'}
        </div>
      )}
      {!isLoading && !isError && institutions.length === 0 && (
        <div className="py-12 text-center font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en' ? 'No institutions found.' : 'Sin instituciones.'}
        </div>
      )}

      {/* Sortable table */}
      {!isLoading && !isError && institutions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0" style={{ background: 'var(--color-background)', zIndex: 2, borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                <th className="pl-3 pr-1 pb-1.5 pt-2 font-mono text-[8px] uppercase tracking-wider text-left" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {lang === 'en' ? 'TIER' : 'NIVEL'}
                </th>
                <th className="px-1 pb-1.5 pt-2 font-mono text-[8px] uppercase tracking-wider text-left" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'en' ? 'INSTITUTION' : 'INSTITUCIÓN'}
                </th>
                <SortHeaderTh<Z1SortKey> field="spend" label={lang === 'en' ? 'SPEND / USD' : 'GASTO / USD'} activeField={sortKey} order={sortOrder} onSort={handleSort} className="px-1 pb-1.5 pt-2 text-right font-mono text-[8px] whitespace-nowrap" />
                <SortHeaderTh<Z1SortKey> field="risk" label="RS" activeField={sortKey} order={sortOrder} onSort={handleSort} className="px-1 pb-1.5 pt-2 text-right font-mono text-[8px]" />
                <SortHeaderTh<Z1SortKey> field="da_pct" label="DA%" activeField={sortKey} order={sortOrder} onSort={handleSort} className="px-1 pb-1.5 pt-2 text-right font-mono text-[8px]" />
                <SortHeaderTh<Z1SortKey> field="hr_pct" label="HR%" activeField={sortKey} order={sortOrder} onSort={handleSort} className="px-1 pb-1.5 pt-2 text-right font-mono text-[8px]" />
                <SortHeaderTh<Z1SortKey> field="contracts" label="CTR" activeField={sortKey} order={sortOrder} onSort={handleSort} className="px-1 pb-1.5 pt-2 text-right font-mono text-[8px]" />
                <SortHeaderTh<Z1SortKey> field="sector_share" label="%" activeField={sortKey} order={sortOrder} onSort={handleSort} className="pr-3 pl-1 pb-1.5 pt-2 text-right font-mono text-[8px]" />
              </tr>
            </thead>
            <tbody>
              {useShelf ? (
                <>
                  {shelfCritical.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={8} className="px-3 py-1 font-mono text-[8px] tracking-widest uppercase" style={{ background: `${RISK_COLORS.critical}12`, color: RISK_COLORS.critical, borderBottom: `1px solid ${RISK_COLORS.critical}25` }}>
                          {lang === 'en' ? 'CRITICAL RISK · INVESTIGATE' : 'RIESGO CRÍTICO · INVESTIGAR'}
                          <span className="float-right tabular-nums">{shelfCritical.length}</span>
                        </td>
                      </tr>
                      {shelfCritical.map((inst) => (
                        <InstRow key={inst.institution_id} inst={inst} sectorShare={sectorShareOf(inst)} lang={lang} dispatch={dispatch} />
                      ))}
                    </>
                  )}
                  {shelfHigh.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={8} className="px-3 py-1 font-mono text-[8px] tracking-widest uppercase" style={{ background: `${RISK_COLORS.high}12`, color: RISK_COLORS.high, borderBottom: `1px solid ${RISK_COLORS.high}25` }}>
                          {lang === 'en' ? 'HIGH PRIORITY · REVIEW' : 'ALTA PRIORIDAD · REVISAR'}
                          <span className="float-right tabular-nums">{shelfHigh.length}</span>
                        </td>
                      </tr>
                      {shelfHigh.map((inst) => (
                        <InstRow key={inst.institution_id} inst={inst} sectorShare={sectorShareOf(inst)} lang={lang} dispatch={dispatch} />
                      ))}
                    </>
                  )}
                  {shelfRoutine.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-1 text-left"
                            style={{ background: 'var(--color-background-card)', borderBottom: routineOpen ? '1px solid var(--color-border)' : 'none', cursor: 'pointer' }}
                            onClick={() => setRoutineOpen((o) => !o)}
                          >
                            <span className="font-mono text-[8px] tracking-widest uppercase flex-1" style={{ color: 'var(--color-text-muted)' }}>
                              {lang === 'en' ? 'ROUTINE ACTIVITY · LOW RISK' : 'ACTIVIDAD REGULAR · RIESGO BAJO'}
                            </span>
                            <span className="font-mono text-[9px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{shelfRoutine.length}</span>
                            <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{routineOpen ? '▾' : '▸'}</span>
                          </button>
                        </td>
                      </tr>
                      {routineOpen && shelfRoutine.map((inst) => (
                        <InstRow key={inst.institution_id} inst={inst} sectorShare={sectorShareOf(inst)} lang={lang} dispatch={dispatch} />
                      ))}
                    </>
                  )}
                </>
              ) : (
                sorted.map((inst) => (
                  <InstRow key={inst.institution_id} inst={inst} sectorShare={sectorShareOf(inst)} lang={lang} dispatch={dispatch} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {!isLoading && !isError && institutions.length > 0 && (
        <div className="px-4 py-3 font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en'
            ? 'tap → drill into institution vendors'
            : 'toca → explorar proveedores de la institución'}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z2Panel — editorial three-shelf vendor list sorted by investigative priority
// Critical risk / Flagged / Routine (collapsed by default)
// ────────────────────────────────────────────────────────────────────────────

function Z2Panel({
  institutionId,
  institutionName,
  lang,
  dispatch,
}: {
  institutionId: number
  institutionName: string
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['explore', 'z2', institutionId],
    queryFn: async () => {
      const { institutionApi } = await import('@/api/client')
      return institutionApi.getVendors(institutionId, 30)
    },
    enabled: institutionId > 0,
    staleTime: 5 * 60 * 1000,
  })

  const vendors = data?.data ?? []
  const totalVendors = data?.total ?? vendors.length

  const [sortKey, setSortKey] = useState<Z2SortKey>('risk')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [routineOpen, setRoutineOpen] = useState(false)

  const handleSort = (key: Z2SortKey) => {
    if (sortKey === key) setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
    else { setSortKey(key); setSortOrder('desc') }
  }

  const sorted = [...vendors].sort((a, b) => {
    const dir = sortOrder === 'desc' ? -1 : 1
    switch (sortKey) {
      case 'risk':      return dir * ((b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0))
      case 'spend':     return dir * ((b.total_value_mxn ?? 0) - (a.total_value_mxn ?? 0))
      case 'contracts': return dir * (b.contract_count - a.contract_count)
      case 'year':      return dir * ((b.last_year ?? 0) - (a.last_year ?? 0))
      default:          return 0
    }
  })
  const useShelf = sortKey === 'risk'
  const shelfCritical = useShelf ? sorted.filter((v) => (v.avg_risk_score ?? 0) >= 0.60) : []
  const shelfHigh     = useShelf ? sorted.filter((v) => { const s = v.avg_risk_score ?? 0; return s >= 0.40 && s < 0.60 }) : []
  const shelfMedium   = useShelf ? sorted.filter((v) => { const s = v.avg_risk_score ?? 0; return s >= 0.25 && s < 0.40 }) : []
  const shelfRoutine  = useShelf ? sorted.filter((v) => (v.avg_risk_score ?? 0) < 0.25) : sorted
  const shelfCriticalSpend = shelfCritical.reduce((s, v) => s + (v.total_value_mxn ?? 0), 0)
  const shelfHighSpend     = shelfHigh.reduce((s, v) => s + (v.total_value_mxn ?? 0), 0)
  const shelfMediumSpend   = shelfMedium.reduce((s, v) => s + (v.total_value_mxn ?? 0), 0)

  const VendorRow = ({ v, rank }: { v: (typeof sorted)[0]; rank: number }) => {
    const score = v.avg_risk_score ?? 0
    const riskPct = Math.round(score * 100)
    const accentColor = score >= 0.60 ? RISK_COLORS.critical :
                        score >= 0.40 ? RISK_COLORS.high :
                        score >= 0.25 ? RISK_COLORS.medium :
                        'var(--color-text-muted)'
    const yearRange = (v.first_year && v.last_year && v.first_year !== v.last_year)
      ? `${v.first_year}–${v.last_year}`
      : v.last_year ? `${v.last_year}` : '—'
    return (
      <tr
        className="cursor-pointer transition-colors"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
        onClick={() => dispatch({ type: 'drill-into-vendor', vendorId: v.vendor_id, vendorName: formatVendorName(v.vendor_name, 300) })}
      >
        <td className="pl-3 pr-1 py-1.5 font-mono text-[9px] tabular-nums text-right" style={{ color: accentColor }}>{rank}</td>
        <td className="px-1 py-1.5 font-mono text-[10px] font-medium" style={{ color: 'var(--color-text-primary)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
          {formatVendorName(v.vendor_name, 300)}
        </td>
        <td className="px-1 py-1.5 text-right whitespace-nowrap">
          <div className="font-mono text-[9px] tabular-nums" style={{ color: accentColor }}>{formatCompactMXN(v.total_value_mxn ?? 0)}</div>
          <div className="font-mono text-[8px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{formatCompactUSD(v.total_value_mxn ?? 0)}</div>
        </td>
        <td className="px-1 py-1.5 font-mono text-[9px] tabular-nums text-right" style={{ color: score > 0 ? accentColor : 'var(--color-text-muted)' }}>
          {score > 0 ? riskPct : '—'}
        </td>
        <td className="px-1 py-1.5 font-mono text-[9px] tabular-nums text-right" style={{ color: 'var(--color-text-muted)' }}>
          {formatNumber(v.contract_count)}
        </td>
        <td className="pr-3 pl-1 py-1.5 font-mono text-[9px] tabular-nums text-right" style={{ color: 'var(--color-text-muted)' }}>
          {yearRange}
        </td>
      </tr>
    )
  }

  return (
    <div
      className="absolute inset-0 z-[5] overflow-y-auto"
      data-scroll-panel="true"
      style={{ background: 'var(--color-background)', top: '48px' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="px-4 py-3 sticky top-0 border-b"
        style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', zIndex: 1 }}
      >
        <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--color-accent)' }}>
          {lang === 'en' ? 'Z2 · VENDORS' : 'Z2 · PROVEEDORES'}
        </div>
        <div className="text-sm font-semibold mt-0.5 truncate" title={institutionName} style={{ color: 'var(--color-text-primary)' }}>
          {institutionName}
        </div>
        <div className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {isLoading
            ? '…'
            : `${formatNumber(totalVendors)} ${lang === 'en' ? 'vendors · sorted by risk' : 'proveedores · por riesgo'}`}
        </div>
      </div>

      {isLoading && (
        <div className="py-12 text-center font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en' ? 'Loading…' : 'Cargando…'}
        </div>
      )}
      {isError && (
        <div className="py-12 text-center font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en' ? 'No vendor data available.' : 'Sin datos de proveedores.'}
        </div>
      )}
      {!isLoading && !isError && vendors.length === 0 && (
        <div className="py-12 text-center font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en' ? 'No vendors found.' : 'Sin proveedores.'}
        </div>
      )}

      {/* Sortable vendor table */}
      {!isLoading && !isError && vendors.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0" style={{ background: 'var(--color-background)', zIndex: 2, borderBottom: '1px solid var(--color-border)' }}>
              <tr>
                <th className="pl-3 pr-1 pb-1.5 pt-2 font-mono text-[8px] uppercase tracking-wider text-right" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>#</th>
                <th className="px-1 pb-1.5 pt-2 font-mono text-[8px] uppercase tracking-wider text-left" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'en' ? 'VENDOR' : 'PROVEEDOR'}
                </th>
                <SortHeaderTh<Z2SortKey> field="spend" label={lang === 'en' ? 'SPEND / USD' : 'GASTO / USD'} activeField={sortKey} order={sortOrder} onSort={handleSort} className="px-1 pb-1.5 pt-2 text-right font-mono text-[8px] whitespace-nowrap" />
                <SortHeaderTh<Z2SortKey> field="risk" label="RS" activeField={sortKey} order={sortOrder} onSort={handleSort} className="px-1 pb-1.5 pt-2 text-right font-mono text-[8px]" />
                <SortHeaderTh<Z2SortKey> field="contracts" label="CTR" activeField={sortKey} order={sortOrder} onSort={handleSort} className="px-1 pb-1.5 pt-2 text-right font-mono text-[8px]" />
                <SortHeaderTh<Z2SortKey> field="year" label={lang === 'en' ? 'YEAR' : 'AÑO'} activeField={sortKey} order={sortOrder} onSort={handleSort} className="pr-3 pl-1 pb-1.5 pt-2 text-right font-mono text-[8px]" />
              </tr>
            </thead>
            <tbody>
              {useShelf ? (
                <>
                  {shelfCritical.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={6} className="px-3 py-1 font-mono text-[8px] tracking-widest uppercase" style={{ background: `${RISK_COLORS.critical}12`, color: RISK_COLORS.critical, borderBottom: `1px solid ${RISK_COLORS.critical}25` }}>
                          <div className="flex items-center justify-between">
                            <span>{lang === 'en' ? 'CRITICAL RISK · INVESTIGATE' : 'RIESGO CRÍTICO · INVESTIGAR'}</span>
                            <span className="tabular-nums normal-case">{shelfCritical.length} · {formatCompactMXN(shelfCriticalSpend)}</span>
                          </div>
                        </td>
                      </tr>
                      {shelfCritical.map((v, i) => <VendorRow key={v.vendor_id} v={v} rank={i + 1} />)}
                    </>
                  )}
                  {shelfHigh.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={6} className="px-3 py-1 font-mono text-[8px] tracking-widest uppercase" style={{ background: `${RISK_COLORS.high}12`, color: RISK_COLORS.high, borderBottom: `1px solid ${RISK_COLORS.high}25` }}>
                          <div className="flex items-center justify-between">
                            <span>{lang === 'en' ? 'HIGH RISK · REVIEW URGENTLY' : 'RIESGO ALTO · REVISAR URGENTE'}</span>
                            <span className="tabular-nums normal-case">{shelfHigh.length} · {formatCompactMXN(shelfHighSpend)}</span>
                          </div>
                        </td>
                      </tr>
                      {shelfHigh.map((v, i) => <VendorRow key={v.vendor_id} v={v} rank={shelfCritical.length + i + 1} />)}
                    </>
                  )}
                  {shelfMedium.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={6} className="px-3 py-1 font-mono text-[8px] tracking-widest uppercase" style={{ background: `${RISK_COLORS.medium}12`, color: RISK_COLORS.medium, borderBottom: `1px solid ${RISK_COLORS.medium}25` }}>
                          <div className="flex items-center justify-between">
                            <span>{lang === 'en' ? 'MEDIUM RISK · MONITOR' : 'RIESGO MEDIO · MONITOREAR'}</span>
                            <span className="tabular-nums normal-case">{shelfMedium.length} · {formatCompactMXN(shelfMediumSpend)}</span>
                          </div>
                        </td>
                      </tr>
                      {shelfMedium.map((v, i) => <VendorRow key={v.vendor_id} v={v} rank={shelfCritical.length + shelfHigh.length + i + 1} />)}
                    </>
                  )}
                  {shelfRoutine.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <button type="button" className="w-full flex items-center gap-2 px-3 py-1 text-left" style={{ background: 'var(--color-background-card)', borderBottom: routineOpen ? '1px solid var(--color-border)' : 'none', cursor: 'pointer' }} onClick={() => setRoutineOpen((o) => !o)}>
                            <span className="font-mono text-[8px] tracking-widest uppercase flex-1" style={{ color: 'var(--color-text-muted)' }}>
                              {lang === 'en' ? 'ROUTINE · LOW RISK' : 'RUTINARIO · RIESGO BAJO'}
                            </span>
                            <span className="font-mono text-[9px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{shelfRoutine.length}</span>
                            <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{routineOpen ? '▾' : '▸'}</span>
                          </button>
                        </td>
                      </tr>
                      {routineOpen && shelfRoutine.map((v, i) => <VendorRow key={v.vendor_id} v={v} rank={shelfCritical.length + shelfHigh.length + shelfMedium.length + i + 1} />)}
                    </>
                  )}
                </>
              ) : (
                sorted.map((v, i) => <VendorRow key={v.vendor_id} v={v} rank={i + 1} />)
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {!isLoading && !isError && vendors.length > 0 && (
        <div className="px-4 py-3 font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en'
            ? 'tap → contract list · drill into full vendor history'
            : 'toca → lista de contratos · historial completo del proveedor'}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z3Panel — editorial contract view: "LOS 3 QUE IMPORTAN" + year bars + full list
// ────────────────────────────────────────────────────────────────────────────

function Z3Panel({
  vendorId,
  vendorName,
  lang,
  dispatch,
  highlightContractId,
}: {
  vendorId: number
  vendorName: string
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
  highlightContractId?: number | null
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['explore', 'z3', vendorId],
    queryFn: async () => {
      const { vendorApi } = await import('@/api/client')
      return vendorApi.getContracts(vendorId, { per_page: 100 })
    },
    enabled: vendorId > 0,
    staleTime: 5 * 60 * 1000,
  })

  const contracts = data?.data ?? []
  const totalContractSpend = contracts.reduce((s, c) => s + (Number(c.amount_mxn) || 0), 0)
  const riskDist = {
    critical: contracts.filter((c) => getRiskLevelFromScore(Number(c.risk_score ?? 0)) === 'critical').length,
    high:     contracts.filter((c) => getRiskLevelFromScore(Number(c.risk_score ?? 0)) === 'high').length,
    medium:   contracts.filter((c) => getRiskLevelFromScore(Number(c.risk_score ?? 0)) === 'medium').length,
    low:      contracts.filter((c) => getRiskLevelFromScore(Number(c.risk_score ?? 0)) === 'low').length,
  }

  // Top 3 by risk score — "the ones that matter"
  const top3 = [...contracts]
    .sort((a, b) => (Number(b.risk_score) || 0) - (Number(a.risk_score) || 0))
    .slice(0, 3)

  // Group by year for the distribution bars
  const byYear = new Map<number, { count: number; amount: number }>()
  contracts.forEach((c) => {
    const yr = Number(c.contract_year ?? 0)
    const amt = Number(c.amount_mxn ?? 0)
    if (yr > 1990) {
      const ex = byYear.get(yr) ?? { count: 0, amount: 0 }
      byYear.set(yr, { count: ex.count + 1, amount: ex.amount + amt })
    }
  })
  const yearEntries = Array.from(byYear.entries()).sort(([a], [b]) => a - b)
  const maxYearAmt = Math.max(...yearEntries.map(([, v]) => v.amount), 1)

  const [z3SortKey, setZ3SortKey] = useState<Z3SortKey>('amount')
  const [z3SortOrder, setZ3SortOrder] = useState<SortOrder>('desc')
  const [listOpen, setListOpen] = useState(true)

  const handleZ3Sort = (key: Z3SortKey) => {
    if (z3SortKey === key) setZ3SortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
    else { setZ3SortKey(key); setZ3SortOrder('desc') }
  }

  const sortedContracts = [...contracts].sort((a, b) => {
    const dir = z3SortOrder === 'desc' ? -1 : 1
    switch (z3SortKey) {
      case 'amount': return dir * ((Number(b.amount_mxn) || 0) - (Number(a.amount_mxn) || 0))
      case 'year':   return dir * ((Number(b.contract_year) || 0) - (Number(a.contract_year) || 0))
      case 'risk':   return dir * ((Number(b.risk_score) || 0) - (Number(a.risk_score) || 0))
      default:       return 0
    }
  })

  return (
    <div
      className="absolute inset-0 z-[5] overflow-y-auto"
      data-scroll-panel="true"
      style={{ background: 'var(--color-background)', top: '48px' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="px-4 py-3 sticky top-0 border-b"
        style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', zIndex: 1 }}
      >
        <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--color-accent)' }}>
          {lang === 'en' ? 'Z3 · CONTRACTS' : 'Z3 · CONTRATOS'}
        </div>
        <div className="text-sm font-semibold mt-0.5 truncate" title={vendorName} style={{ color: 'var(--color-text-primary)' }}>
          {vendorName}
        </div>
        <div className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {isLoading
            ? '…'
            : lang === 'en'
              ? `${contracts.length} contracts · ${formatCompactMXN(totalContractSpend)} lifetime`
              : `${contracts.length} contratos · ${formatCompactMXN(totalContractSpend)} total`}
        </div>
        {!isLoading && contracts.length > 0 && (
          <div className="font-mono text-[8px] mt-1 flex gap-2 flex-wrap">
            {riskDist.critical > 0 && <span style={{ color: RISK_COLORS.critical }}>{riskDist.critical} critical</span>}
            {riskDist.high > 0 && <span style={{ color: RISK_COLORS.high }}>{riskDist.high} high</span>}
            {riskDist.medium > 0 && <span style={{ color: RISK_COLORS.medium }}>{riskDist.medium} medium</span>}
            {riskDist.low > 0 && <span style={{ color: 'var(--color-text-muted)' }}>{riskDist.low} low</span>}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="py-12 text-center font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en' ? 'Loading…' : 'Cargando…'}
        </div>
      )}
      {isError && (
        <div className="py-12 text-center font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en' ? 'No contracts found.' : 'Sin contratos disponibles.'}
        </div>
      )}

      {/* LOS 3 QUE IMPORTAN — highest-risk contracts with editorial signals */}
      {!isLoading && !isError && top3.length > 0 && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div
            className="font-mono text-[9px] tracking-widest uppercase mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {lang === 'en' ? 'HIGHEST RISK CONTRACTS' : 'LOS 3 QUE IMPORTAN'}
          </div>
          <div className="space-y-3">
            {top3.map((c) => {
              const score = Number(c.risk_score ?? 0)
              const level = getRiskLevelFromScore(score)
              const fill = RISK_COLORS[level]
              const isHighlighted = c.id === highlightContractId
              const procType = (c as ContractListItem & { procedure_type?: string | null }).procedure_type
                ?? (c.is_direct_award
                  ? (lang === 'en' ? 'direct award' : 'adjudicación directa')
                  : (lang === 'en' ? 'open bid' : 'licitación'))
              const title = (c as ContractListItem & { title?: string }).title

              const signals: string[] = []
              if (c.is_direct_award) signals.push(lang === 'en' ? 'DIRECT AWARD' : 'ADJ. DIRECTA')
              if (c.is_single_bid)   signals.push(lang === 'en' ? 'SINGLE BID' : 'OFERTA ÚNICA')
              if (Number(c.amount_mxn) > 500_000_000) signals.push(lang === 'en' ? 'LARGE CONTRACT' : 'ALTO MONTO')

              return (
                <div
                  key={c.id}
                  className="border-l-2 pl-3 cursor-pointer rounded-r-sm"
                  style={{
                    borderColor: fill,
                    background: isHighlighted ? `${fill}10` : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isHighlighted) (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isHighlighted ? `${fill}10` : 'transparent' }}
                  onClick={() => dispatch({ type: 'drill-into-contract', contractId: c.id })}
                >
                  <div className="flex items-center gap-2 flex-wrap py-0.5">
                    <span className="font-mono text-[9px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      {c.contract_year}
                    </span>
                    <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: fill }}>
                      {formatCompactMXN(Number(c.amount_mxn ?? 0))}
                    </span>
                    <span className="font-mono text-[9px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      {formatCompactUSD(Number(c.amount_mxn ?? 0))}
                    </span>
                    <span
                      className="px-1 py-0.5 font-mono text-[8px] uppercase rounded-sm"
                      style={{ background: `${fill}20`, color: fill, border: `1px solid ${fill}40` }}
                    >
                      {level}
                    </span>
                  </div>
                  {signals.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {signals.map((s) => (
                        <span
                          key={s}
                          className="font-mono text-[8px] px-1 rounded-sm"
                          style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                        >
                          ↳ {s}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="font-mono text-[9px] mt-0.5 pb-0.5 line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {title ?? procType}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity by year — bars colored by administration */}
      {yearEntries.length > 0 && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div
            className="font-mono text-[9px] tracking-widest uppercase mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {lang === 'en' ? 'ACTIVITY BY YEAR' : 'ACTIVIDAD POR AÑO'}
          </div>
          <div className="space-y-0.5">
            {yearEntries.map(([yr, { count, amount }], idx) => {
              const admin = getAdministrationByYear(yr)
              const adminColors: Record<string, string> = {
                fox: '#64748b', calderon: '#1d4ed8', epn: '#7c3aed', amlo: '#b45309', sheinbaum: '#0d9488',
              }
              const barColor = admin ? (adminColors[admin.key] ?? 'var(--color-accent)') : 'var(--color-accent)'
              const prevAdmin = idx > 0 ? getAdministrationByYear(yearEntries[idx - 1][0]) : null
              const adminChanged = !prevAdmin || prevAdmin.key !== admin?.key
              return (
                <div key={yr}>
                  {adminChanged && admin && (
                    <div className="font-mono text-[7px] uppercase tracking-widest pt-1.5 pb-0.5" style={{ color: barColor, opacity: 0.8 }}>
                      {admin.short}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] w-8 flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      {yr}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(amount / maxYearAmt) * 100}%`, background: barColor, opacity: 0.7 }}
                      />
                    </div>
                    <span className="font-mono text-[9px] w-16 text-right flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      {formatCompactMXN(amount)}
                    </span>
                    <span className="font-mono text-[9px] w-5 text-right flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                      {count}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full list — sortable table */}
      {sortedContracts.length > 0 && (
        <div className="px-4 py-3">
          <button
            type="button"
            className="w-full flex items-center justify-between py-1 cursor-pointer"
            onClick={() => setListOpen((o) => !o)}
          >
            <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'en' ? `ALL ${sortedContracts.length} CONTRACTS` : `TODOS (${sortedContracts.length})`}
            </span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {listOpen ? '▾' : '▸'}
            </span>
          </button>
          {listOpen && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <SortHeaderTh<Z3SortKey> field="year" label={lang === 'en' ? 'YEAR' : 'AÑO'} activeField={z3SortKey} order={z3SortOrder} onSort={handleZ3Sort} className="pr-2 pb-1 pt-1 font-mono text-[8px] text-left" />
                    <SortHeaderTh<Z3SortKey> field="amount" label={lang === 'en' ? 'AMOUNT / USD' : 'MONTO / USD'} activeField={z3SortKey} order={z3SortOrder} onSort={handleZ3Sort} className="px-2 pb-1 pt-1 font-mono text-[8px] text-right" />
                    <SortHeaderTh<Z3SortKey> field="risk" label="RS" activeField={z3SortKey} order={z3SortOrder} onSort={handleZ3Sort} className="px-2 pb-1 pt-1 font-mono text-[8px] text-right" />
                    <th className="px-2 pb-1 pt-1 font-mono text-[8px] uppercase tracking-wider text-left" style={{ color: 'var(--color-text-muted)' }}>
                      {lang === 'en' ? 'DESCRIPTION' : 'DESCRIPCIÓN'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContracts.map((c) => {
                    const level = getRiskLevelFromScore(Number(c.risk_score ?? 0))
                    const fill = RISK_COLORS[level]
                    const isHighlighted = c.id === highlightContractId
                    const label = (c as ContractListItem & { title?: string }).title
                      ?? (c as ContractListItem & { procedure_type?: string | null }).procedure_type
                      ?? (lang === 'en' ? 'Direct award' : 'Adjudicación directa')
                    return (
                      <tr
                        key={c.id}
                        className="cursor-pointer transition-colors"
                        style={isHighlighted ? { background: `${fill}18` } : {}}
                        onMouseEnter={(e) => { if (!isHighlighted) (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
                        onMouseLeave={(e) => { if (!isHighlighted) (e.currentTarget as HTMLElement).style.background = '' }}
                        onClick={() => dispatch({ type: 'drill-into-contract', contractId: c.id })}
                      >
                        <td className="pr-2 py-1.5 font-mono text-[9px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{c.contract_year}</td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">
                          <div className="font-mono text-[10px] font-bold tabular-nums" style={{ color: fill }}>{formatCompactMXN(Number(c.amount_mxn ?? 0))}</div>
                          <div className="font-mono text-[8px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{formatCompactUSD(Number(c.amount_mxn ?? 0))}</div>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[9px] tabular-nums text-right" style={{ color: fill }}>
                          {Number(c.risk_score ?? 0) > 0 ? Math.round(Number(c.risk_score) * 100) : '—'}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[9px] line-clamp-1 max-w-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {label}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
