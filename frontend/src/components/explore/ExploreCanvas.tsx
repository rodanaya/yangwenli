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
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { atlasApi, sectorApi, type SpatialInstitution } from '@/api/client'
import type { ContractListItem } from '@/api/types'
import {
  RISK_COLORS,
  getRiskLevelFromScore,
  getSectorName,
  SECTOR_COLORS,
} from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import { formatEntityName } from '@/lib/entity/format'
import { SortHeaderTh } from '@/components/ui/SortHeaderTh'
import {
  getPinAnnotation,
  useExploreState,
  useExploreDispatch,
  useCurrentFocus,
  type Focus,
} from './ExploreState'

// ────────────────────────────────────────────────────────────────────────────
// Layout — independent of the legacy constellation
// ────────────────────────────────────────────────────────────────────────────

const SVG_W = 1200
const SVG_H = 720


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

type Z0SortKey = 'spend' | 'risk' | 'contracts' | 'critical'
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
      <td className="px-1 py-1.5 font-mono text-[10px] font-medium" style={{ color: 'var(--color-text-primary)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
        {displayName}
      </td>
      <td className="px-1 py-1.5 font-mono text-[9px] tabular-nums text-right whitespace-nowrap" style={{ color: tier.color }}>
        {formatCompactMXN(inst.total_amount_mxn)}
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
// Z0Panel — El Panorama: proportional sector intelligence card grid
// Replaces the SVG floating-icon canvas with data-encoded editorial cards.
// Card flex-basis is proportional to sector spend share (floored at 8% so tiny
// sectors stay readable). Sort bar: SPEND (default) / RISK / CONTR / CRITICAL.
// ────────────────────────────────────────────────────────────────────────────

function Z0Panel({
  lang,
  dispatch,
}: {
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
}) {
  const { data: sectorStats, isLoading } = useQuery({
    queryKey: ['explore', 'z0-sector-stats'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 30 * 60 * 1000,
  })

  const [sortKey, setSortKey] = useState<Z0SortKey>('spend')
  const stats = sectorStats?.data ?? []
  const totalSpend = sectorStats?.total_value_mxn ?? stats.reduce((s, r) => s + r.total_value_mxn, 0)

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      switch (sortKey) {
        case 'spend':     return b.total_value_mxn - a.total_value_mxn
        case 'risk':      return (b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0)
        case 'contracts': return b.total_contracts - a.total_contracts
        case 'critical':  return b.critical_risk_count - a.critical_risk_count
        default:          return 0
      }
    })
  }, [stats, sortKey])

  return (
    <div
      className="absolute inset-0 z-[5] overflow-y-auto"
      data-scroll-panel="true"
      style={{ background: 'var(--color-background)' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-[6] px-4 py-3 border-b flex items-start justify-between gap-3 flex-wrap"
        style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="font-mono text-[9px] tracking-[0.18em] uppercase font-bold" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'en' ? 'EL PANORAMA · SECTOR INTELLIGENCE' : 'EL PANORAMA · INTELIGENCIA SECTORIAL'}
          </div>
          <div className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {isLoading
              ? '…'
              : `12 ${lang === 'en' ? 'sectors · ' : 'sectores · '}${formatCompactMXN(totalSpend)} ${lang === 'en' ? 'validated spend' : 'gasto validado'}`}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap flex-shrink-0">
          {(['spend', 'risk', 'contracts', 'critical'] as Z0SortKey[]).map((k) => {
            const label =
              k === 'spend'     ? (lang === 'en' ? 'SPEND'    : 'GASTO')
              : k === 'risk'    ? (lang === 'en' ? 'RISK'     : 'RIESGO')
              : k === 'contracts' ? (lang === 'en' ? 'CONTR.'  : 'CONTR.')
              :                   (lang === 'en' ? 'CRITICAL' : 'CRÍTICO')
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSortKey(k)}
                className="px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider"
                style={{
                  background: sortKey === k ? 'var(--color-accent)' : 'var(--color-border)',
                  color: sortKey === k ? '#fff' : 'var(--color-text-muted)',
                  borderRadius: 2,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading && (
        <div className="py-16 text-center font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'en' ? 'Loading sector intelligence…' : 'Cargando…'}
        </div>
      )}

      {/* Proportional card grid */}
      {!isLoading && stats.length > 0 && (
        <div
          className="flex flex-wrap"
          style={{ gap: 2, padding: '4px', alignContent: 'flex-start' }}
        >
          {sorted.map((s) => {
            const spendPct = totalSpend > 0 ? (s.total_value_mxn / totalSpend) * 100 : 8
            const basis = Math.max(8, spendPct)
            const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'
            const totalRisk = s.critical_risk_count + s.high_risk_count + s.medium_risk_count + s.low_risk_count
            const avgRiskPct = Math.round((s.avg_risk_score ?? 0) * 100)
            const sectorLabel = getSectorName(s.sector_code, lang)

            return (
              <div
                key={s.sector_id}
                role="button"
                tabIndex={0}
                aria-label={`${sectorLabel} — ${formatCompactMXN(s.total_value_mxn)}`}
                style={{
                  flexBasis: `calc(${basis}% - 4px)`,
                  flexGrow: 1,
                  flexShrink: 0,
                  minWidth: 128,
                  minHeight: 130,
                  borderLeft: `3px solid ${color}`,
                  background: 'var(--color-background-card)',
                  padding: '10px 12px 8px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                  boxSizing: 'border-box',
                }}
                onClick={() => dispatch({ type: 'drill-into-sector', sectorId: s.sector_id, sectorCode: s.sector_code })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') dispatch({ type: 'drill-into-sector', sectorId: s.sector_id, sectorCode: s.sector_code })
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 14px rgba(0,0,0,0.10)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '' }}
              >
                {/* Kicker */}
                <div className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color }}>
                  {s.sector_code}
                </div>
                {/* Sector name */}
                <div className="font-mono text-[10px] font-medium leading-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {sectorLabel}
                </div>
                {/* Spend — Playfair Italic 800 */}
                <div
                  className="tabular-nums mb-0.5"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: 800,
                    fontStyle: 'italic',
                    fontSize: 'clamp(13px, 1.8vw, 20px)',
                    lineHeight: 1.1,
                    color,
                  }}
                >
                  {formatCompactMXN(s.total_value_mxn)}
                </div>
                {/* % of total spend */}
                <div className="font-mono text-[8px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {spendPct.toFixed(1)}% {lang === 'en' ? 'of spend' : 'del gasto'}
                </div>
                {/* Risk distribution bar */}
                {totalRisk > 0 && (
                  <div className="h-1.5 flex overflow-hidden rounded-sm mb-1.5" style={{ gap: 1 }}>
                    {s.critical_risk_count > 0 && (
                      <div style={{ flex: s.critical_risk_count, background: RISK_COLORS.critical, minWidth: 2 }} />
                    )}
                    {s.high_risk_count > 0 && (
                      <div style={{ flex: s.high_risk_count, background: RISK_COLORS.high, minWidth: 2 }} />
                    )}
                    {s.medium_risk_count > 0 && (
                      <div style={{ flex: s.medium_risk_count, background: RISK_COLORS.medium, minWidth: 2 }} />
                    )}
                    {s.low_risk_count > 0 && (
                      <div style={{ flex: s.low_risk_count, background: 'var(--color-border)', minWidth: 2 }} />
                    )}
                  </div>
                )}
                {/* Risk summary */}
                <div className="flex items-center gap-2 flex-wrap font-mono text-[8px]">
                  {s.critical_risk_count > 0 && (
                    <span className="font-bold" style={{ color: RISK_COLORS.critical }}>
                      {s.critical_risk_count} {lang === 'en' ? 'crit' : 'crít'}
                    </span>
                  )}
                  <span style={{ color: 'var(--color-text-muted)' }}>{avgRiskPct} RS</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{(s.direct_award_pct ?? 0).toFixed(0)}% DA</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
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
              ? `${institutions.length} institutions · top 4 control ${top4Pct}% of spend`
              : `${institutions.length} instituciones · las 4 principales concentran ${top4Pct}% del gasto`}
        </div>
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
                <SortHeaderTh<Z1SortKey> field="spend" label={lang === 'en' ? 'SPEND' : 'GASTO'} activeField={sortKey} order={sortOrder} onSort={handleSort} className="px-1 pb-1.5 pt-2 text-right font-mono text-[8px] whitespace-nowrap" />
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
  const [routineOpen, setRoutineOpen] = useState(true)

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
  const shelfFlagged  = useShelf ? sorted.filter((v) => { const s = v.avg_risk_score ?? 0; return s >= 0.25 && s < 0.60 }) : []
  const shelfRoutine  = useShelf ? sorted.filter((v) => (v.avg_risk_score ?? 0) < 0.25) : sorted

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
        <td className="px-1 py-1.5 font-mono text-[9px] tabular-nums text-right whitespace-nowrap" style={{ color: accentColor }}>
          {formatCompactMXN(v.total_value_mxn ?? 0)}
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
        <div className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--color-text-primary)' }}>
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
                <SortHeaderTh<Z2SortKey> field="spend" label={lang === 'en' ? 'SPEND' : 'GASTO'} activeField={sortKey} order={sortOrder} onSort={handleSort} className="px-1 pb-1.5 pt-2 text-right font-mono text-[8px] whitespace-nowrap" />
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
                          {lang === 'en' ? 'CRITICAL RISK · INVESTIGATE' : 'RIESGO CRÍTICO · INVESTIGAR'}
                          <span className="float-right tabular-nums">{shelfCritical.length}</span>
                        </td>
                      </tr>
                      {shelfCritical.map((v, i) => <VendorRow key={v.vendor_id} v={v} rank={i + 1} />)}
                    </>
                  )}
                  {shelfFlagged.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={6} className="px-3 py-1 font-mono text-[8px] tracking-widest uppercase" style={{ background: `${RISK_COLORS.high}12`, color: RISK_COLORS.high, borderBottom: `1px solid ${RISK_COLORS.high}25` }}>
                          {lang === 'en' ? 'FLAGGED · HIGH RISK' : 'SEÑALADO · RIESGO ALTO'}
                          <span className="float-right tabular-nums">{shelfFlagged.length}</span>
                        </td>
                      </tr>
                      {shelfFlagged.map((v, i) => <VendorRow key={v.vendor_id} v={v} rank={shelfCritical.length + i + 1} />)}
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
                      {routineOpen && shelfRoutine.map((v, i) => <VendorRow key={v.vendor_id} v={v} rank={shelfCritical.length + shelfFlagged.length + i + 1} />)}
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
            ? 'tap → Red Thread · full investigation profile'
            : 'toca → Hilo Rojo · perfil completo de investigación'}
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
        <div className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--color-text-primary)' }}>
          {vendorName}
        </div>
        <div className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {isLoading ? '…' : `${contracts.length} ${lang === 'en' ? 'contracts' : 'contratos'}`}
        </div>
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

      {/* Activity by year */}
      {yearEntries.length > 0 && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div
            className="font-mono text-[9px] tracking-widest uppercase mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {lang === 'en' ? 'ACTIVITY BY YEAR' : 'ACTIVIDAD POR AÑO'}
          </div>
          <div className="space-y-1">
            {yearEntries.map(([yr, { count, amount }]) => (
              <div key={yr} className="flex items-center gap-2">
                <span className="font-mono text-[9px] w-8 flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {yr}
                </span>
                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(amount / maxYearAmt) * 100}%`, background: 'var(--color-accent)', opacity: 0.55 }}
                  />
                </div>
                <span className="font-mono text-[9px] w-16 text-right flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {formatCompactMXN(amount)}
                </span>
                <span className="font-mono text-[9px] w-5 text-right flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {count}
                </span>
              </div>
            ))}
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
                    <SortHeaderTh<Z3SortKey> field="amount" label={lang === 'en' ? 'AMOUNT' : 'MONTO'} activeField={z3SortKey} order={z3SortOrder} onSort={handleZ3Sort} className="px-2 pb-1 pt-1 font-mono text-[8px] text-right" />
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
                        <td className="px-2 py-1.5 font-mono text-[10px] font-bold tabular-nums text-right whitespace-nowrap" style={{ color: fill }}>
                          {formatCompactMXN(Number(c.amount_mxn ?? 0))}
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
