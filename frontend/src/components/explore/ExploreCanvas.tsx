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
import { useNavigate } from 'react-router-dom'
import { atlasApi, sectorApi, type SpatialInstitution } from '@/api/client'
import type { ContractListItem } from '@/api/types'
import {
  RISK_COLORS,
  getRiskLevelFromScore,
  SECTOR_COLORS,
  SECTORS,
  PATTERN_COLORS,
} from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD, formatNumber, shortenContractName } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import { getAdministrationByYear } from '@/lib/administrations'
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
  Z_BAND_S,
  Z_CASCADE_STEP_S,
  Z_TREEMAP_DELAY_S,
  Z_DRAWER_S,
  ZBreadcrumb,
  ZKickerBand,
  ZPullLine,
  ZFooterLink,
  ZSortToggle,
  useBandVariants,
  type CrumbSegment,
} from './ZPrimitives'

// ────────────────────────────────────────────────────────────────────────────
// Layout — independent of the legacy constellation
// ────────────────────────────────────────────────────────────────────────────

const SVG_W = 1200
const SVG_H = 720

// formatCompactUSD imported from @/lib/utils (uses the canonical
// exchange-rate helper). Local duplicate removed 2026-05-21.


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
      {/* Floating Back button removed (2026-05-21): each Z-level now
          renders its own breadcrumb (SPOILS · HEALTH · IMSS · ...) via
          ZBreadcrumb, which covers wayfinding. Esc-key pop still works
          via the keyboard listener; the breadcrumb shows "ESC ↩" at
          the right edge as a passive affordance. */}
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
        // Walk the focus stack for breadcrumb ancestry. Z3 can be reached
        // via Z0→Z1→Z2→Z3 (full ancestry), Z0→Z1→Z3 (search shortcut, no
        // institution), or deep-link (no ancestry). All three render
        // cleanly — missing crumbs just disappear.
        const ancestrySector = [...state.stack].reverse().find(
          (f): f is Extract<Focus, { kind: 'sector' }> => f.kind === 'sector',
        ) ?? null
        const ancestryInstitution = [...state.stack].reverse().find(
          (f): f is Extract<Focus, { kind: 'institution' }> => f.kind === 'institution',
        ) ?? null
        return (
          <Z3Panel
            key={`z3panel-${parentVendor.vendorId}`}
            vendorId={parentVendor.vendorId}
            vendorName={parentVendor.vendorName}
            ancestrySectorId={ancestrySector?.sectorId ?? null}
            ancestrySectorCode={ancestrySector?.sectorCode ?? null}
            ancestryInstitutionId={ancestryInstitution?.institutionId ?? null}
            ancestryInstitutionName={ancestryInstitution?.institutionName ?? null}
            lang={lang}
            dispatch={dispatch}
            highlightContractId={focus.kind === 'contract' ? focus.contractId : null}
          />
        )
      })()}

      {/* Z4 HTML overlay — contract drawer slides in from the right when
          focus is on a specific contract. Z3 stays visible behind it so
          the constellation of sibling contracts is never lost. */}
      <AnimatePresence>
        {focus.kind === 'contract' && (
          <Z4Drawer
            key={`z4drawer-${focus.contractId}`}
            contractId={focus.contractId}
            lang={lang}
            dispatch={dispatch}
            sectorAccent={(() => {
              const s = [...state.stack].reverse().find((f): f is Extract<Focus, { kind: 'sector' }> => f.kind === 'sector')
              return s ? SECTOR_COLORS[s.sectorCode] ?? '#64748b' : '#64748b'
            })()}
          />
        )}
      </AnimatePresence>
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
// Z-level sort-key types (all levels now use inline mode literals)
// ────────────────────────────────────────────────────────────────────────────

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
  //
  // Z0-local overrides (2026-05-21 user feedback: entrance felt "brutal"):
  //   • 60ms per-cell stagger so the eye CAN follow each cell landing,
  //     not 12 cells popping at once. Z_CELL_STAGGER_S (6ms) is reserved
  //     for higher-density staggers at Z1+ where 60+ institutions can't
  //     each get a 60ms slot — keep that constant intact for those uses.
  //   • 700ms per-cell entrance with a visible drop + scale so each block
  //     feels like it SETTLES, not pops. Expo-out easing means most of
  //     the motion is in the last 30%, giving the soft-landing feel.
  const Z0_CELL_STAGGER_S = 0.06
  const Z0_CELL_ENTRANCE_S = 0.7
  const treemapVariants: Variants = {
    hidden: {},
    visible: {
      transition: prefersReducedMotion
        ? { staggerChildren: 0 }
        : {
            delayChildren: Z_TREEMAP_DELAY_S,
            staggerChildren: Z0_CELL_STAGGER_S,
          },
    },
  }

  // Per-cell entrance variant. Replaces the previous opacity+1.5%-scale pop
  // (which read as "click and everything appears at once"). New shape:
  // small drop from y:10 + scale 0.94 + opacity 0 — eye sees a block ease
  // into its slot rather than materializing on top of it. Reduced-motion
  // path stays opacity-only.
  const cellVariants: Variants = {
    hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: trans(Z0_CELL_ENTRANCE_S),
    },
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
  // ── Health sector (largest at Z1 today; previously fell back to junk truncation) ──
  ['INSTITUTO MEXICANO DEL SEGURO SOCIAL PARA EL BIENESTAR', 'IMSS-B'],
  ['SERVICIOS DE SALUD DEL INSTITUTO MEXICANO DEL SEGURO SOCIAL PARA EL BIENESTAR', 'IMSS-B'],
  ['INSTITUTO MEXICANO DEL SEGURO SOCIAL', 'IMSS'],
  ['INSTITUTO DE SEGURIDAD Y SERVICIOS SOCIALES DE LOS TRABAJADORES DEL ESTADO', 'ISSSTE'],
  ['INSTITUTO DE SALUD PARA EL BIENESTAR', 'INSABI'],
  ['LABORATORIOS DE BIOLÓGICOS Y REACTIVOS DE MÉXICO', 'BIRMEX'],
  ['LABORATORIOS DE BIOLOGICOS Y REACTIVOS DE MEXICO', 'BIRMEX'],
  ['SISTEMA NACIONAL PARA EL DESARROLLO INTEGRAL DE LA FAMILIA', 'DIF'],
  ['INSTITUTO NACIONAL DE ENFERMEDADES RESPIRATORIAS', 'INER'],
  ['INSTITUTO NACIONAL DE CANCEROLOGÍA', 'INCAN'],
  ['INSTITUTO NACIONAL DE CANCEROLOGIA', 'INCAN'],
  ['INSTITUTO NACIONAL DE CARDIOLOGÍA', 'INC'],
  ['INSTITUTO NACIONAL DE CARDIOLOGIA', 'INC'],
  ['INSTITUTO NACIONAL DE NUTRICIÓN', 'INCMNSZ'],
  ['INSTITUTO NACIONAL DE PEDIATRÍA', 'INP'],
  ['INSTITUTO NACIONAL DE PEDIATRIA', 'INP'],
  ['INSTITUTO NACIONAL DE PERINATOLOGÍA', 'INPER'],
  ['INSTITUTO NACIONAL DE PERINATOLOGIA', 'INPER'],
  ['INSTITUTO NACIONAL DE PSIQUIATRÍA', 'INPRF'],
  ['INSTITUTO NACIONAL DE PSIQUIATRIA', 'INPRF'],
  ['INSTITUTO NACIONAL DE NEUROLOGÍA', 'INNN'],
  ['INSTITUTO NACIONAL DE NEUROLOGIA', 'INNN'],
  ['INSTITUTO NACIONAL DE REHABILITACIÓN', 'INR'],
  ['INSTITUTO NACIONAL DE REHABILITACION', 'INR'],

  // ── Government / interior ──
  ['INSTITUTO NACIONAL DE LOS PUEBLOS INDÍGENAS', 'INPI'],
  ['INSTITUTO NACIONAL DE LOS PUEBLOS INDIGENAS', 'INPI'],
  ['INSTITUTO NACIONAL DE MIGRACIÓN', 'INM'],
  ['INSTITUTO NACIONAL DE MIGRACION', 'INM'],
  ['SECRETARÍA DE RELACIONES EXTERIORES', 'SRE'],
  ['SECRETARIA DE RELACIONES EXTERIORES', 'SRE'],
  ['SECRETARÍA DE BIENESTAR', 'BIENESTAR'],
  ['SECRETARIA DE BIENESTAR', 'BIENESTAR'],
  ['SECRETARIA DE BIENESTAR', 'BIENESTAR'],

  // ── Treasury / hacienda ──
  ['CAMINOS Y PUENTES FEDERALES', 'CAPUFE'],
  ['SERVICIO DE ADMINISTRACIÓN TRIBUTARIA', 'SAT'],
  ['SERVICIO DE ADMINISTRACION TRIBUTARIA', 'SAT'],
  ['SECRETARÍA DE HACIENDA Y CRÉDITO PÚBLICO', 'SHCP'],
  ['SECRETARIA DE HACIENDA Y CREDITO PUBLICO', 'SHCP'],
  ['FONDO NACIONAL DE FOMENTO AL TURISMO', 'FONATUR'],

  // ── Defense + interior ──
  ['SECRETARÍA DE LA DEFENSA NACIONAL', 'SEDENA'],
  ['SECRETARIA DE LA DEFENSA NACIONAL', 'SEDENA'],
  ['SECRETARÍA DE MARINA', 'SEMAR'],
  ['SECRETARIA DE MARINA', 'SEMAR'],
  ['BANCO NACIONAL DEL EJÉRCITO', 'BANJERCITO'],
  ['BANCO NACIONAL DEL EJERCITO', 'BANJERCITO'],
  ['SECRETARÍA DE GOBERNACIÓN', 'SEGOB'],
  ['SECRETARIA DE GOBERNACION', 'SEGOB'],

  // ── Education ──
  ['SECRETARÍA DE SALUD', 'SSA'],
  ['SECRETARIA DE SALUD', 'SSA'],
  ['SECRETARÍA DE EDUCACIÓN PÚBLICA', 'SEP'],
  ['SECRETARIA DE EDUCACION PUBLICA', 'SEP'],
  ['INSTITUTO POLITÉCNICO NACIONAL', 'IPN'],
  ['INSTITUTO POLITECNICO NACIONAL', 'IPN'],
  ['COMISIÓN NACIONAL DE LIBROS DE TEXTO', 'CONALITEG'],
  ['COMISION NACIONAL DE LIBROS DE TEXTO', 'CONALITEG'],

  // ── Agriculture / labor ──
  ['SECRETARÍA DE AGRICULTURA', 'SADER'],
  ['SECRETARIA DE AGRICULTURA', 'SADER'],
  ['DICONSA', 'DICONSA'],
  ['LICONSA', 'LICONSA'],
  ['ALIMENTACIÓN PARA EL BIENESTAR', 'BIENESTAR'],
  ['ALIMENTACION PARA EL BIENESTAR', 'BIENESTAR'],
  ['SECRETARÍA DEL TRABAJO', 'STPS'],
  ['SECRETARIA DEL TRABAJO', 'STPS'],
  ['INSTITUTO DEL FONDO NACIONAL PARA EL CONSUMO DE LOS TRABAJADORES', 'INFONACOT'],

  // ── Environment ──
  ['SECRETARÍA DE MEDIO AMBIENTE', 'SEMARNAT'],
  ['SECRETARIA DE MEDIO AMBIENTE', 'SEMARNAT'],
  ['COMISIÓN NACIONAL DEL AGUA', 'CONAGUA'],
  ['COMISION NACIONAL DEL AGUA', 'CONAGUA'],
  ['COMISIÓN NACIONAL FORESTAL', 'CONAFOR'],
  ['COMISION NACIONAL FORESTAL', 'CONAFOR'],

  // ── Infrastructure / energy ──
  ['SECRETARÍA DE COMUNICACIONES Y TRANSPORTES', 'SCT'],
  ['SECRETARIA DE COMUNICACIONES Y TRANSPORTES', 'SCT'],
  ['SECRETARÍA DE INFRAESTRUCTURA', 'SICT'],
  ['SECRETARIA DE INFRAESTRUCTURA', 'SICT'],
  ['GRUPO AEROPORTUARIO DE LA CIUDAD DE MÉXICO', 'GACM'],
  ['GRUPO AEROPORTUARIO DE LA CIUDAD DE MEXICO', 'GACM'],
  ['COMISIÓN FEDERAL DE ELECTRICIDAD', 'CFE'],
  ['COMISION FEDERAL DE ELECTRICIDAD', 'CFE'],
  ['PEMEX EXPLORACIÓN Y PRODUCCIÓN', 'PEMEX-EP'],
  ['PEMEX EXPLORACION Y PRODUCCION', 'PEMEX-EP'],
  ['PEMEX REFINACIÓN', 'PEMEX-R'],
  ['PEMEX REFINACION', 'PEMEX-R'],

  // ── Technology ──
  ['INSTITUTO FEDERAL DE TELECOMUNICACIONES', 'IFT'],
  ['TELECOMUNICACIONES DE MÉXICO', 'TELECOMM'],
  ['TELECOMUNICACIONES DE MEXICO', 'TELECOMM'],

  // ── Misc ──
  ['CENTRO MEDICO NACIONAL', 'CMN'],
  ['CENTRO MÉDICO NACIONAL', 'CMN'],
  ['HOSPITAL GENERAL DE MÉXICO', 'HGM'],
  ['HOSPITAL GENERAL DE MEXICO', 'HGM'],
  ['HOSPITAL JUÁREZ DE MÉXICO', 'HJM'],
  ['HOSPITAL JUAREZ DE MEXICO', 'HJM'],
  ['HOSPITAL INFANTIL DE MÉXICO', 'HIM'],
  ['HOSPITAL INFANTIL DE MEXICO', 'HIM'],
]

/**
 * Editorial title-case for institution / vendor names.
 *
 * COMPRANET stores most institutions as ALL-CAPS — perfectly fine for a
 * spreadsheet, terrible for editorial typography. We normalize at render
 * time so the data layer stays untouched but the eye reads natural
 * Spanish: "Instituto Mexicano del Seguro Social" instead of
 * "INSTITUTO MEXICANO DEL SEGURO SOCIAL".
 *
 * Rules:
 *  - Strings that already have mixed case are returned untouched.
 *  - Spanish connectives (de / del / la / y / etc.) lowercase unless
 *    they're the first word.
 *  - Known siglas / corporate-form tokens stay uppercase: S.A., C.V.,
 *    A.C., S.C., II, III, IV, etc. plus any pre-existing all-caps
 *    siglas the fallback map already knows (IMSS, ISSSTE, SCT...).
 *  - Hyphenated tokens get each segment cased independently
 *    (IMSS-Bienestar reads correctly).
 *  - "México" / accents preserved from the source.
 *
 * NOT a truncator. Names of any length are returned in full — the
 * caller's layout is responsible for wrapping.
 */
const LOWERCASE_CONNECTIVES = new Set([
  'de', 'del', 'la', 'las', 'los', 'el', 'en', 'y', 'e', 'o', 'u', 'a',
  'para', 'por', 'al', 'con', 'sin', 'sobre', 'entre', 'desde',
])
const UPPERCASE_TOKENS = new Set([
  'S.A.', 'S.A', 'C.V.', 'C.V', 'S.A.B.', 'A.C.', 'A.C', 'S.C.', 'I.E.', 'S.N.C.',
  'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII',
])

function capitalizeWord(w: string): string {
  if (!w) return w
  // Preserve all-caps siglas already known to be acronyms (IMSS, etc.)
  if (UPPERCASE_TOKENS.has(w.toUpperCase())) return w.toUpperCase()
  // Hyphenated segments — capitalize each part
  if (w.includes('-')) {
    return w.split('-').map((seg) => capitalizeWord(seg)).join('-')
  }
  // Lowercase everything then uppercase first letter (handles accents correctly)
  const lower = w.toLowerCase()
  return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1)
}

function toEditorialCase(s: string | null | undefined): string {
  if (!s) return ''
  const trimmed = s.trim()
  if (!trimmed) return trimmed
  // If string already contains lowercase letters, assume it's already
  // properly cased — don't double-process it.
  if (/[a-záéíóúñü]/.test(trimmed)) return trimmed

  // Split keeping whitespace tokens so we can rejoin verbatim
  const tokens = trimmed.split(/(\s+)/)
  return tokens.map((tok, i) => {
    if (/^\s+$/.test(tok)) return tok
    // Preserve fully-uppercase corporate forms (S.A., A.C., etc.)
    if (UPPERCASE_TOKENS.has(tok.toUpperCase())) return tok.toUpperCase()
    const lower = tok.toLowerCase()
    // First non-space token always capitalized
    const isFirst = i === 0 || (i > 0 && tokens.slice(0, i).every((t) => /^\s+$/.test(t)))
    if (isFirst) return capitalizeWord(tok)
    if (LOWERCASE_CONNECTIVES.has(lower)) return lower
    return capitalizeWord(tok)
  }).join('')
}

function inferSiglasFromName(name: string): string | null {
  const upper = (name || '').toUpperCase().trim()
  for (const [prefix, siglas] of NAME_TO_SIGLAS_FALLBACK) {
    if (upper.startsWith(prefix)) return siglas
  }
  return null
}

// Spanish connective words we strip when generating initials from a name.
// Same list as toEditorialCase but ALL lowercase (caller has already lowercased).
const ACRONYM_STOPWORDS = new Set([
  'de', 'del', 'la', 'las', 'los', 'el', 'en', 'y', 'e', 'o', 'u', 'a',
  'para', 'por', 'al', 'con', 'sin', 'sobre', 'entre', 'desde', 'sa', 'cv',
  'sc', 'ac', 'snc', 'sab',
])

/**
 * Generate a 3-5 char acronym from the FIRST LETTERS of significant words.
 * No truncation, no "..." — every institution gets a real chip.
 *
 * Examples:
 *   "Instituto Nacional de Cardiología Ignacio Chávez"  → INCIC
 *   "Hospital Regional de Alta Especialidad del Bajío"  → HRAEB
 *   "Universidad Autónoma Metropolitana"                → UAM
 *   "Comisión Federal de Electricidad"                  → CFE
 *   "BC-Comisión Estatal de Servicios Públicos"          → BCCESP
 *   "Diconsa, S.A. de C.V."                              → DICONSA  (whole single word kept)
 *
 * Rules:
 *  - State-code prefix kept as a single token: "BC-Comisión ..." → starts BC + ...
 *  - Punctuation stripped
 *  - Connective Spanish words filtered out
 *  - If the result is < 2 chars, fall back to the first 4 letters of the cleaned name
 *  - Capped at 6 chars so the 22x22 chip stays readable
 */
function acronymFromName(name: string): string {
  if (!name) return '—'
  // Normalize: strip accents for letter extraction, but keep state prefix
  const stripped = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[,.;:()&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!stripped) return '—'

  // Honor state-code prefix as a unit (BC-, OAX-, PUE-, ...)
  const stateMatch = stripped.match(/^([A-Z]{2,4})-/)
  const statePrefix = stateMatch ? stateMatch[1] : ''
  const body = stateMatch ? stripped.slice(stateMatch[0].length) : stripped

  // If the whole body is one word (e.g. "Diconsa", "Pemex"), return it
  // uppercased as the chip — that IS the brand name.
  const tokens = body.split(' ').filter(Boolean)
  if (tokens.length === 1) {
    const single = tokens[0].toUpperCase()
    return statePrefix ? `${statePrefix}${single.slice(0, 6 - statePrefix.length)}` : single.slice(0, 6)
  }

  // Multi-word: take first letter of each non-stopword token
  const initials = tokens
    .filter((t) => !ACRONYM_STOPWORDS.has(t.toLowerCase()))
    .map((t) => t[0]?.toUpperCase() ?? '')
    .filter(Boolean)
    .join('')

  const acronym = statePrefix + initials
  if (acronym.length >= 2) return acronym.slice(0, 6)

  // Last resort: first 4 letters of body, uppercased. Still no ellipsis.
  return (statePrefix + body.replace(/\s/g, '').slice(0, 4 - statePrefix.length)).toUpperCase()
}

/**
 * Short institution label resolved in priority order:
 *   1. siglas from the API (truth)
 *   2. NAME_TO_SIGLAS_FALLBACK map (manually curated common cases)
 *   3. acronymFromName() (auto-generated initials — never returns "...")
 */
function shortInstitutionLabel(name: string, siglas?: string | null): string {
  if (siglas && siglas.trim()) return siglas.trim().toUpperCase()
  const inferred = inferSiglasFromName(name)
  if (inferred) return inferred
  return acronymFromName(name)
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
          wordBreak: 'break-word',
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
  const { data, isLoading } = useQuery({
    queryKey: ['explore', 'z1', sectorId],
    queryFn: () => atlasApi.getSectorInstitutionsSpatial({ sectorId, limit: 60 }),
    enabled: sectorId > 0 && sectorId <= 12,
    staleTime: 10 * 60 * 1000,
  })

  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'
  const institutions = data?.institutions ?? []
  const totalSectorSpend = institutions.reduce((s, i) => s + i.total_amount_mxn, 0)
  const sectorName = lang === 'es' ? (data?.sector_name_es ?? sectorCode) : (data?.sector_name_en ?? sectorCode)

  // Editorial dek: top-3 concentration finding
  const top3Share = institutions.slice(0, 3).reduce((s, i) => s + i.total_amount_mxn, 0)
  const top3Pct = totalSectorSpend > 0 ? Math.round((top3Share / totalSectorSpend) * 100) : 0
  const top1 = institutions[0]
  const top1Pct = top1 && totalSectorSpend > 0 ? Math.round((top1.total_amount_mxn / totalSectorSpend) * 100) : 0

  const [mode, setMode] = useState<'spend' | 'risk'>('spend')

  const prefersReducedMotion = useReducedMotion() ?? false
  const bandVariants = useBandVariants(prefersReducedMotion)
  const layoutTransition = prefersReducedMotion ? { duration: 0 } : { duration: Z_LAYOUT_DURATION_S, ease: Z_EASE }

  // Sorted institutions — full list, no truncation. The treemap was killed
  // here (Z1 has 60 entities — too many for a glance treemap; smaller cells
  // collapse to indistinguishable squares). Register form puts every name
  // on screen with its spend bar + risk pill — the journalist can scan the
  // entire sector in one scroll.
  const sortedInstitutions = useMemo(() => {
    return [...institutions].sort((a, b) =>
      mode === 'risk'
        ? (b.risk ?? 0) - (a.risk ?? 0) || b.total_amount_mxn - a.total_amount_mxn
        : b.total_amount_mxn - a.total_amount_mxn
    )
  }, [institutions, mode])


  // Risk-tier shelves. When sorted by RISK, group by tier. When sorted by
  // SPEND, shelves dissolve to a flat ranked list (matching Z2's canon).
  const useShelf = mode === 'risk'
  const shelfCritical = useShelf ? sortedInstitutions.filter((i) => (i.risk ?? 0) >= 0.60) : []
  const shelfHigh     = useShelf ? sortedInstitutions.filter((i) => { const r = i.risk ?? 0; return r >= 0.40 && r < 0.60 }) : []
  const shelfMedium   = useShelf ? sortedInstitutions.filter((i) => { const r = i.risk ?? 0; return r >= 0.25 && r < 0.40 }) : []
  const shelfRoutine  = useShelf ? sortedInstitutions.filter((i) => (i.risk ?? 0) < 0.25) : sortedInstitutions

  const crumbs: CrumbSegment[] = [
    { label: lang === 'en' ? 'Spoils' : 'Reparto', onClick: () => dispatch({ type: 'reset-to-system' }) },
    { label: sectorName, sectorCode },
  ]

  return (
    <div
      className="absolute inset-0 z-[5] overflow-hidden flex flex-col"
      data-scroll-panel="true"
      style={{ background: 'var(--color-background)', top: '48px' }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        className="absolute inset-0 flex flex-col"
      >
        {/* Breadcrumb — replaces the "Z1 · INSTITUTIONS" debug kicker */}
        <ZBreadcrumb segments={crumbs} lang={lang} />

        {/* Sector-color top rail — 4px slab that carries layoutId="explore-cell-${sectorId}"
            so framer-motion expands the Z0 sector cell into this rail on drill-in.
            The rectangle metaphor doesn't survive 60-entity scale, but the sector
            COLOR identity stays present at the top of every Z1 view. */}
        <motion.div
          layoutId={`explore-cell-${sectorId}`}
          transition={{ layout: layoutTransition }}
          style={{ height: 4, background: sectorAccent, flexShrink: 0 }}
          aria-hidden="true"
        />

        {/* Editorial header — kicker + headline + stat band */}
        <ZKickerBand
          custom={0}
          variants={bandVariants}
          kicker={lang === 'en' ? `§ INSIDE ${sectorName.toUpperCase()}` : `§ DENTRO DE ${sectorName.toUpperCase()}`}
          headline={
            lang === 'en'
              ? <>Who spends the <em style={{ fontStyle: 'italic', fontWeight: 800 }}>{formatCompactMXN(totalSectorSpend)}</em> in {sectorName}</>
              : <>Quién gasta los <em style={{ fontStyle: 'italic', fontWeight: 800 }}>{formatCompactMXN(totalSectorSpend)}</em> de {sectorName}</>
          }
          stat={
            isLoading
              ? '...'
              : lang === 'en'
                ? `${institutions.length} institutions · top 3 share ${top3Pct}%`
                : `${institutions.length} instituciones · top 3 al ${top3Pct}%`
          }
        />

        {/* Sort toggle band — band 1 in cascade */}
        <motion.div
          variants={bandVariants}
          custom={1}
          className="px-4 sm:px-6 pb-2 flex justify-end"
        >
          <ZSortToggle
            modes={['spend', 'risk'] as const}
            active={mode}
            onChange={setMode}
            riskMode="risk"
            label={lang === 'en' ? 'SORT' : 'ORDENAR'}
            labelFor={(m) => lang === 'en' ? m.toUpperCase() : (m === 'spend' ? 'GASTO' : 'RIESGO')}
          />
        </motion.div>

        {/* Scrollable register — band 2.
            Vertical list of every institution in the sector, never truncated.
            Risk-tier shelf headers appear when sorted by RISK; dissolve to a
            flat ranked list when sorted by SPEND. */}
        <motion.div
          variants={bandVariants}
          custom={2}
          className="flex-1 min-h-0 overflow-y-auto mx-3 sm:mx-4 mb-2"
        >
          {isLoading && (
            <div className="py-12 text-center font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'en' ? 'loading...' : 'cargando...'}
            </div>
          )}
          {!isLoading && sortedInstitutions.length > 0 && <Z1ColumnHeader lang={lang} />}
          {!isLoading && !useShelf && (
            <ul role="list" className="space-y-px">
              {sortedInstitutions.map((inst, i) => (
                <Z1Row
                  key={inst.institution_id}
                  inst={inst}
                  rank={i + 1}
                  totalSectorSpend={totalSectorSpend}
                  sectorAccent={sectorAccent}
                  dispatch={dispatch}
                  lang={lang}
                  layoutTransition={layoutTransition}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </ul>
          )}
          {!isLoading && useShelf && (
            <div className="space-y-2">
              <Z1Shelf
                title={lang === 'en' ? 'CRITICAL · INVESTIGATE' : 'CRÍTICO · INVESTIGAR'}
                color={RISK_COLORS.critical}
                items={shelfCritical}
                totalSectorSpend={totalSectorSpend}
                sectorAccent={sectorAccent}
                dispatch={dispatch}
                lang={lang}
                layoutTransition={layoutTransition}
                prefersReducedMotion={prefersReducedMotion}
                defaultOpen
              />
              <Z1Shelf
                title={lang === 'en' ? 'HIGH PRIORITY · REVIEW' : 'ALTA PRIORIDAD · REVISAR'}
                color={RISK_COLORS.high}
                items={shelfHigh}
                totalSectorSpend={totalSectorSpend}
                sectorAccent={sectorAccent}
                dispatch={dispatch}
                lang={lang}
                layoutTransition={layoutTransition}
                prefersReducedMotion={prefersReducedMotion}
                defaultOpen
              />
              <Z1Shelf
                title={lang === 'en' ? 'MEDIUM RISK' : 'RIESGO MEDIO'}
                color={RISK_COLORS.medium}
                items={shelfMedium}
                totalSectorSpend={totalSectorSpend}
                sectorAccent={sectorAccent}
                dispatch={dispatch}
                lang={lang}
                layoutTransition={layoutTransition}
                prefersReducedMotion={prefersReducedMotion}
                defaultOpen
              />
              <Z1Shelf
                title={lang === 'en' ? 'ROUTINE · LOW RISK' : 'ACTIVIDAD REGULAR · RIESGO BAJO'}
                color="var(--color-text-muted)"
                items={shelfRoutine}
                totalSectorSpend={totalSectorSpend}
                sectorAccent={sectorAccent}
                dispatch={dispatch}
                lang={lang}
                layoutTransition={layoutTransition}
                prefersReducedMotion={prefersReducedMotion}
                defaultOpen   /* expanded by default per user feedback — no clicking to reveal */
              />
            </div>
          )}
        </motion.div>

        {/* Pull-line — band 3 in cascade. Editorial finding from data. */}
        {!isLoading && top1 && top1Pct >= 25 && (
          <ZPullLine custom={3} variants={bandVariants}>
            {lang === 'en'
              ? <><strong className="font-semibold text-text-primary">{shortInstitutionLabel(top1.name, effectiveSiglas(top1.name, null))}</strong> alone manages <strong className="font-semibold">{top1Pct}%</strong> of the sector's spend — more than the rest of the top 10 combined.</>
              : <><strong className="font-semibold text-text-primary">{shortInstitutionLabel(top1.name, effectiveSiglas(top1.name, null))}</strong> sola maneja el <strong className="font-semibold">{top1Pct}%</strong> del gasto del sector — más que las siguientes nueve combinadas.</>}
          </ZPullLine>
        )}

        {/* Footer — outbound link to /sectors/:code (full dossier) */}
        {!isLoading && institutions.length > 0 && (
          <div className="px-4 sm:px-6 py-2 flex-shrink-0 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'en'
                ? `${institutions.length} institutions`
                : `${institutions.length} instituciones`}
            </span>
            <ZFooterLink href={`/sectors/${sectorCode}`} lang={lang} />
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Z1 subcomponents — single row + collapsible shelf ──────────────────────

/**
 * Column-header strip rendered above the Z1 institution list. Names what
 * each column means in plain language — readers shouldn't have to infer
 * what "DA" or "HR" stand for. Title attribute (hover tooltip) carries
 * the full definition. Sticky-top inside the scroll container.
 *
 * Widths MUST match Z1Row's columns exactly:
 *   rank 20 · logo+chip 88 · name flex · HR-bar 130 · spend 110 ·
 *   contracts 70 · DA 56 · risk 56
 */
function Z1ColumnHeader({ lang }: { lang: 'en' | 'es' }) {
  const isEs = lang === 'es'
  const headerCell: React.CSSProperties = {
    fontSize: 9,
    fontFamily: 'var(--font-family-mono, monospace)',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    lineHeight: 1.3,
  }
  return (
    <div
      className="flex items-end gap-3 px-2 pt-2 pb-1.5 mb-1 sticky top-0 z-[2]"
      style={{
        background: 'var(--color-background)',
        borderBottom: '1px solid var(--color-border)',
      }}
      role="row"
    >
      {/* rank — empty header */}
      <span style={{ width: 20 }} role="columnheader" aria-label={isEs ? 'rango' : 'rank'} />

      {/* logo + acronym */}
      <span
        className="flex-shrink-0"
        style={{ ...headerCell, width: 88 }}
        role="columnheader"
        title={isEs ? 'Acrónimo o siglas de la institución' : 'Institution acronym or siglas'}
      >
        {isEs ? 'Institución' : 'Institution'}
      </span>

      {/* full name — empty header (the acronym column header covers it visually) */}
      <span className="flex-1 min-w-0" style={headerCell} role="columnheader">
        {isEs ? 'Nombre completo' : 'Full name'}
      </span>

      {/* HR% bar */}
      <span
        className="flex-shrink-0"
        style={{ ...headerCell, width: 130, textAlign: 'left' }}
        role="columnheader"
        title={
          isEs
            ? 'Tasa de contratos de alto riesgo: % de contratos marcados como alto o crítico por el modelo de riesgo. Barra llena al 100% = todos los contratos en riesgo.'
            : 'High-risk contract rate: % of this institution\'s contracts flagged high or critical by the risk model. A bar filled to 100% means every contract is at risk.'
        }
      >
        {isEs ? 'Contratos de alto riesgo' : 'High-risk contracts'}
      </span>

      {/* spend column (MXN / USD / share) */}
      <span
        className="flex-shrink-0 text-right"
        style={{ ...headerCell, width: 110 }}
        role="columnheader"
        title={
          isEs
            ? 'Gasto acumulado en pesos mexicanos, con equivalente en dólares y porcentaje del gasto total del sector.'
            : 'Total spend in Mexican pesos, with USD equivalent and percentage of the sector\'s total spend.'
        }
      >
        {isEs ? (
          <>
            Gasto<br />
            <span style={{ fontWeight: 400, opacity: 0.7 }}>MXN · USD · %</span>
          </>
        ) : (
          <>
            Spend<br />
            <span style={{ fontWeight: 400, opacity: 0.7 }}>MXN · USD · share</span>
          </>
        )}
      </span>

      {/* contracts count */}
      <span
        className="flex-shrink-0 text-right"
        style={{ ...headerCell, width: 70 }}
        role="columnheader"
        title={
          isEs
            ? 'Número total de contratos otorgados por la institución (2002 a la fecha).'
            : 'Total number of contracts the institution has awarded (2002 to present).'
        }
      >
        {isEs ? (
          <>
            # de<br />
            <span>contratos</span>
          </>
        ) : (
          <>
            # of<br />
            <span>contracts</span>
          </>
        )}
      </span>

      {/* DA% */}
      <span
        className="flex-shrink-0 text-right"
        style={{ ...headerCell, width: 56 }}
        role="columnheader"
        title={
          isEs
            ? 'Adjudicación directa: % de contratos otorgados sin licitación pública. Una tasa alta indica riesgo de procura no competitiva.'
            : 'Direct-award rate: % of contracts awarded without an open bid. A high rate flags non-competitive procurement.'
        }
      >
        {isEs ? (
          <>
            Adj.<br />
            <span>directa</span>
          </>
        ) : (
          <>
            Direct<br />
            <span>award</span>
          </>
        )}
      </span>

      {/* avg risk% */}
      <span
        className="flex-shrink-0 text-right"
        style={{ ...headerCell, width: 56 }}
        role="columnheader"
        title={
          isEs
            ? 'Puntuación promedio de riesgo del modelo (0–100). Combina dirección, precios, redes y otros factores. Crítico ≥ 60.'
            : 'Average risk score from the model (0–100). Blends direct-award, pricing, network and other factors. Critical ≥ 60.'
        }
      >
        {isEs ? (
          <>
            Riesgo<br />
            <span>prom.</span>
          </>
        ) : (
          <>
            Avg<br />
            <span>risk</span>
          </>
        )}
      </span>
    </div>
  )
}

function Z1Row({
  inst,
  rank,
  totalSectorSpend,
  sectorAccent,
  dispatch,
  lang,
  layoutTransition,
  prefersReducedMotion,
}: {
  inst: SpatialInstitution
  rank: number
  totalSectorSpend: number
  sectorAccent: string
  dispatch: ReturnType<typeof useExploreDispatch>
  lang: 'en' | 'es'
  layoutTransition: { duration: number; ease?: typeof Z_EASE }
  prefersReducedMotion: boolean
}) {
  const risk = inst.risk ?? 0
  const riskTier: 'critical' | 'high' | 'medium' | 'low' =
    risk >= 0.60 ? 'critical' : risk >= 0.40 ? 'high' : risk >= 0.25 ? 'medium' : 'low'
  const riskColor =
    riskTier === 'critical' ? RISK_COLORS.critical
    : riskTier === 'high' ? RISK_COLORS.high
    : riskTier === 'medium' ? RISK_COLORS.medium
    : 'var(--color-text-muted)'
  const share = totalSectorSpend > 0 ? (inst.total_amount_mxn / totalSectorSpend) * 100 : 0
  const eff = effectiveSiglas(inst.name, null)
  const acronym = shortInstitutionLabel(inst.name, eff)
  const logoSrc = logoSrcForSiglas(eff)
  const riskPct = Math.round(risk * 100)

  // Editorial encodings — replace the generic "proportion-of-max" grey bar
  // that said nothing between institutions. New row carries five
  // procurement red-flag dimensions per institution:
  //
  //   1. Spend (MXN absolute) + share % of sector       — the money story
  //   2. # Contracts                                     — magnitude of activity
  //   3. HR% bar (high-risk-contract rate, red, fills)  — the procurement signal
  //   4. DA% (direct-award rate)                        — non-competitive flag
  //   5. Avg risk score (existing risk pill)             — model verdict
  //
  // HR% varies hugely between institutions (some 80%+, some near 0%), so the
  // bar's LENGTH visibly differentiates rows in a way the grey bar never did.
  const hrPct = inst.high_risk_pct ?? 0
  const daPct = inst.direct_award_pct ?? 0
  const hrBarPct = Math.min(100, Math.max(0, hrPct))
  const hrBarColor = hrPct >= 50 ? RISK_COLORS.critical : hrPct >= 25 ? RISK_COLORS.high : hrPct >= 10 ? RISK_COLORS.medium : 'var(--color-text-muted)'
  const daColor = daPct >= 80 ? RISK_COLORS.critical : daPct >= 50 ? RISK_COLORS.high : daPct >= 25 ? RISK_COLORS.medium : 'var(--color-text-muted)'

  return (
    <motion.li
      layout
      layoutId={`explore-inst-${inst.institution_id}`}
      transition={{ layout: layoutTransition }}
      whileHover={prefersReducedMotion ? undefined : { backgroundColor: 'var(--color-background-card)', transition: { duration: 0.12 } }}
    >
      <button
        type="button"
        onClick={() => dispatch({ type: 'drill-into-institution', institutionId: inst.institution_id, institutionName: inst.name })}
        className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-sm cursor-pointer"
        style={{ background: 'transparent' }}
        title={`${inst.name} — ${formatCompactMXN(inst.total_amount_mxn)} — ${inst.total_contracts} contracts — HR ${hrPct.toFixed(0)}% — DA ${daPct.toFixed(0)}% — avg risk ${riskPct}%`}
        aria-label={`${inst.name}, ${formatCompactMXN(inst.total_amount_mxn)}, ${inst.total_contracts} contracts, high-risk rate ${hrPct.toFixed(0)} percent, direct-award rate ${daPct.toFixed(0)} percent, average risk ${riskPct} percent`}
      >
        {/* Rank pill */}
        <span className="font-mono tabular-nums flex-shrink-0 text-right" style={{ fontSize: 9, color: 'var(--color-text-muted)', width: 20 }}>
          {rank}
        </span>
        {/* Logo + acronym chip */}
        <span className="flex items-center gap-1.5 flex-shrink-0" style={{ width: 88 }}>
          <InstitutionLogo
            logoSrc={logoSrc}
            acronym={acronym}
            fallbackBg={`${sectorAccent}22`}
            fallbackColor={sectorAccent}
          />
          <span className="font-mono uppercase tracking-[0.06em] truncate" style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {acronym}
          </span>
        </span>
        {/* Full institution name — title-cased, never truncated. Wraps. */}
        <span className="flex-1 min-w-0 text-sm leading-tight" style={{ color: 'var(--color-text-primary)', wordBreak: 'break-word', whiteSpace: 'normal' }}>
          {toEditorialCase(inst.name)}
        </span>
        {/* HR% bar — replaces the grey "proportion-of-max" bar. Length =
            high-risk-contract rate (0-100%); color escalates with severity.
            This is the visual signal that ACTUALLY varies between institutions. */}
        <span className="flex-shrink-0 flex items-center gap-2" style={{ width: 130 }}>
          <span
            className="relative flex-1 h-[6px] rounded-sm overflow-hidden"
            style={{ background: 'var(--color-background-elevated)' }}
            aria-hidden="true"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-sm transition-all"
              style={{ width: `${hrBarPct}%`, background: hrBarColor, opacity: 0.92 }}
            />
            {/* 25%, 50%, 75% reference ticks so the eye scales the bar fast */}
            {[25, 50, 75].map((t) => (
              <span
                key={t}
                className="absolute inset-y-0 w-px"
                style={{ left: `${t}%`, background: 'rgba(0,0,0,0.10)' }}
              />
            ))}
          </span>
          <span className="font-mono tabular-nums text-right" style={{ fontSize: 11, fontWeight: 700, color: hrBarColor, width: 36 }}>
            {hrPct.toFixed(0)}<span className="text-[8px] font-normal" style={{ color: 'var(--color-text-muted)', marginLeft: 1 }}>HR%</span>
          </span>
        </span>
        {/* Spend column — MXN + USD companion for international audiences,
            + share-of-sector % below. Three lines, all right-aligned, mono. */}
        <span className="flex-shrink-0 text-right" style={{ width: 110 }}>
          <span className="block font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {formatCompactMXN(inst.total_amount_mxn)}
          </span>
          <span className="block font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            ≈ {formatCompactUSD(inst.total_amount_mxn)}
          </span>
          <span className="block font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            {share.toFixed(1)}% {lang === 'en' ? 'share' : 'aporte'}
          </span>
        </span>
        {/* NEW: # Contracts — magnitude indicator separate from MXN */}
        <span className="flex-shrink-0 text-right" style={{ width: 70 }}>
          <span className="block font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {formatNumber(inst.total_contracts)}
          </span>
          <span className="block font-mono" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            {lang === 'en' ? 'contracts' : 'contratos'}
          </span>
        </span>
        {/* NEW: DA% (direct-award rate) — non-competitive procurement flag */}
        <span className="flex-shrink-0 text-right" style={{ width: 56 }}>
          <span className="block font-mono tabular-nums font-bold" style={{ fontSize: 11, color: daColor }}>
            {daPct.toFixed(0)}<span className="text-[8px] font-normal" style={{ color: 'var(--color-text-muted)', marginLeft: 1 }}>%</span>
          </span>
          <span className="block font-mono" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            {lang === 'en' ? 'DA' : 'AD'}
          </span>
        </span>
        {/* Avg risk pill (kept) */}
        <span className="flex-shrink-0 text-right" style={{ width: 56 }}>
          <span className="block font-mono tabular-nums font-bold" style={{ fontSize: 11, color: riskColor }}>
            {riskPct}
          </span>
          <span className="block font-mono" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            {lang === 'en' ? 'risk' : 'riesgo'}
          </span>
        </span>
      </button>
    </motion.li>
  )
}

function Z1Shelf({
  title,
  color,
  items,
  totalSectorSpend,
  sectorAccent,
  dispatch,
  lang,
  layoutTransition,
  prefersReducedMotion,
  defaultOpen,
}: {
  title: string
  color: string
  items: SpatialInstitution[]
  totalSectorSpend: number
  sectorAccent: string
  dispatch: ReturnType<typeof useExploreDispatch>
  lang: 'en' | 'es'
  layoutTransition: { duration: number; ease?: typeof Z_EASE }
  prefersReducedMotion: boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm font-mono uppercase tracking-[0.14em] cursor-pointer"
        style={{ fontSize: 9, color, background: `${color}10`, fontWeight: 700 }}
        aria-expanded={open}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="flex-1 text-left">{title}</span>
        <span className="font-mono tabular-nums" style={{ fontSize: 10 }}>{items.length}</span>
      </button>
      {open && (
        <ul role="list" className="space-y-px mt-0.5">
          {items.map((inst, i) => (
            <Z1Row
              key={inst.institution_id}
              inst={inst}
              rank={i + 1}
              totalSectorSpend={totalSectorSpend}
              sectorAccent={sectorAccent}
              dispatch={dispatch}
              lang={lang}
              layoutTransition={layoutTransition}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z2Panel — "La Captura" institution → vendor register
// 2026-05-21 redesign (DESIGNUS Step 3). Mirrors Z1's editorial chrome —
// breadcrumb, sector-color top rail (layoutId hand-off from Z1Row), kicker
// band, sort toggle, column header, risk-tier shelves with full vendor
// names, role badges (DOMINANT / GT / T1 / pattern), pull-line, footer.
// Data: /institutions/{id}/vendor-pool (richer than /vendors).
// ────────────────────────────────────────────────────────────────────────────

type Z2Mode = 'spend' | 'risk'

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
    queryKey: ['explore', 'z2-pool', institutionId],
    queryFn: async () => {
      const { institutionApi } = await import('@/api/client')
      return institutionApi.getVendorPool(institutionId, 50)
    },
    enabled: institutionId > 0,
    staleTime: 10 * 60 * 1000,
  })

  const vendors = data?.data ?? []
  const sectorId = data?.sector_id ?? null
  const sectorRow = SECTORS.find((s) => s.id === sectorId)
  const sectorCode = sectorRow?.code ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'
  const sectorName = lang === 'es' ? (sectorRow?.name ?? '') : (sectorRow?.nameEN ?? '')
  const instSpend = data?.institution_total_value_mxn ?? 0
  const instContracts = data?.institution_total_contracts ?? 0
  const instVendorCount = data?.institution_vendor_count ?? 0
  const instDaPct = data?.institution_direct_award_pct ?? 0
  const top10Share = data?.top10_share_pct ?? 0

  // Editorial title-cased institution name. Prefer the data-loaded name
  // (full canonical "Instituto Mexicano del Seguro Social") over the URL
  // placeholder (e.g. "Institution 251" when deep-linked without state).
  const instTitle = toEditorialCase(data?.institution_name ?? institutionName)
  const siglas = data?.siglas ?? null

  const [mode, setMode] = useState<Z2Mode>('risk')

  const prefersReducedMotion = useReducedMotion() ?? false
  const bandVariants = useBandVariants(prefersReducedMotion)
  const layoutTransition = prefersReducedMotion ? { duration: 0 } : { duration: Z_LAYOUT_DURATION_S, ease: Z_EASE }

  const sortedVendors = useMemo(() => {
    return [...vendors].sort((a, b) =>
      mode === 'risk'
        ? (b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0) || b.total_value_mxn - a.total_value_mxn
        : b.total_value_mxn - a.total_value_mxn
    )
  }, [vendors, mode])

  // Risk-tier shelves when sorted by RISK. Flat ranked list when by SPEND.
  const useShelf = mode === 'risk'
  const shelfCritical = useShelf ? sortedVendors.filter((v) => (v.avg_risk_score ?? 0) >= 0.60) : []
  const shelfHigh     = useShelf ? sortedVendors.filter((v) => { const r = v.avg_risk_score ?? 0; return r >= 0.40 && r < 0.60 }) : []
  const shelfMedium   = useShelf ? sortedVendors.filter((v) => { const r = v.avg_risk_score ?? 0; return r >= 0.25 && r < 0.40 }) : []
  const shelfRoutine  = useShelf ? sortedVendors.filter((v) => (v.avg_risk_score ?? 0) < 0.25) : sortedVendors

  // Editorial pull-line — picks the strongest narrative frame from the data.
  // Priority: confirmed-corruption count → tier-1 count → concentration →
  // top10 absorption → dispersion fallback. The whole point of /explore is
  // to expose the actual finding, not show a generic stat.
  const top10 = sortedVendors.slice(0, 10)
  const gtInTop10 = top10.filter((v) => v.in_ground_truth === 1).length
  const t1InTop10 = top10.filter((v) => v.ips_tier === 1).length
  const gtSpendShare = top10.filter((v) => v.in_ground_truth === 1).reduce((s, v) => s + v.share_of_institution_pct, 0)
  const top1 = sortedVendors[0]
  const top1Pct = data?.top1_share_pct ?? 0
  const pullLine: React.ReactNode = (() => {
    if (gtInTop10 >= 3) {
      const shareStr = `${gtSpendShare.toFixed(1)}%`
      return lang === 'en'
        ? <><strong className="font-semibold text-text-primary">{gtInTop10} of {instTitle}'s 10 largest suppliers</strong> are confirmed corruption cases — together they take <strong className="font-semibold">{shareStr}</strong> of its spend.</>
        : <><strong className="font-semibold text-text-primary">{gtInTop10} de los 10 mayores proveedores</strong> de {instTitle} son casos confirmados de corrupción — juntos reciben el <strong className="font-semibold">{shareStr}</strong> de su gasto.</>
    }
    if (t1InTop10 >= 5) {
      return lang === 'en'
        ? <><strong className="font-semibold text-text-primary">{t1InTop10} of the top 10 vendors</strong> sit in ARIA's Tier-1 investigative queue — the highest-priority cohort in the entire database.</>
        : <><strong className="font-semibold text-text-primary">{t1InTop10} de los 10 mayores proveedores</strong> están en la Cola Tier-1 de ARIA — la cohorte de máxima prioridad de toda la base.</>
    }
    if (top1Pct >= 10 && top1) {
      const t1Name = toEditorialCase(formatVendorName(top1.vendor_name, 120))
      return lang === 'en'
        ? <><strong className="font-semibold text-text-primary">{t1Name}</strong> alone takes <strong className="font-semibold">{top1Pct.toFixed(1)}%</strong> of {instTitle}'s spend — the top 10 capture <strong className="font-semibold">{top10Share.toFixed(0)}%</strong> combined.</>
        : <><strong className="font-semibold text-text-primary">{t1Name}</strong> se lleva el <strong className="font-semibold">{top1Pct.toFixed(1)}%</strong> del gasto de {instTitle} — los 10 mayores concentran el <strong className="font-semibold">{top10Share.toFixed(0)}%</strong> combinado.</>
    }
    if (top10Share >= 50) {
      return lang === 'en'
        ? <>The <strong className="font-semibold text-text-primary">top 10 vendors absorb {top10Share.toFixed(0)}%</strong> of {instTitle}'s spend.</>
        : <>Los <strong className="font-semibold text-text-primary">10 mayores proveedores concentran el {top10Share.toFixed(0)}%</strong> del gasto de {instTitle}.</>
    }
    // Dispersion fallback
    return lang === 'en'
      ? <>{instTitle}'s spend is dispersed — no single vendor exceeds <strong className="font-semibold">{top1Pct.toFixed(1)}%</strong>, but the top 10 together capture <strong className="font-semibold">{top10Share.toFixed(0)}%</strong>.</>
      : <>El gasto de {instTitle} está disperso — ningún proveedor supera el <strong className="font-semibold">{top1Pct.toFixed(1)}%</strong>, pero los 10 mayores concentran el <strong className="font-semibold">{top10Share.toFixed(0)}%</strong>.</>
  })()

  // Breadcrumb: SPOILS ▸ SECTOR ▸ INSTITUTION
  const crumbs: CrumbSegment[] = [
    { label: lang === 'en' ? 'Spoils' : 'Reparto', onClick: () => dispatch({ type: 'reset-to-system' }) },
    { label: sectorName || sectorCode, sectorCode, onClick: () => dispatch({ type: 'pop-to-level', level: 1 }) },
    { label: siglas || instTitle.slice(0, 32) },
  ]

  return (
    <div
      className="absolute inset-0 z-[5] overflow-hidden flex flex-col"
      data-scroll-panel="true"
      style={{ background: 'var(--color-background)', top: '48px' }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        className="absolute inset-0 flex flex-col"
      >
        {/* Breadcrumb */}
        <ZBreadcrumb segments={crumbs} lang={lang} />

        {/* Sector-color top rail — carries layoutId="explore-inst-${id}" so
            the Z1 row's sector strip morphs into this band on drill-in. */}
        <motion.div
          layoutId={`explore-inst-${institutionId}`}
          transition={{ layout: layoutTransition }}
          style={{ height: 6, background: sectorAccent, flexShrink: 0 }}
          aria-hidden="true"
        />

        {/* Editorial header — § LA CAPTURA + Playfair headline + stat band */}
        <ZKickerBand
          custom={0}
          variants={bandVariants}
          kicker={lang === 'en' ? '§ LA CAPTURA · INSTITUTION DEEP' : '§ LA CAPTURA · INSTITUCIÓN'}
          headline={
            lang === 'en'
              ? <>{instTitle} — <em style={{ fontStyle: 'italic', fontWeight: 800 }}>who gets the money?</em></>
              : <>{instTitle} — <em style={{ fontStyle: 'italic', fontWeight: 800 }}>¿quién recibe el dinero?</em></>
          }
          stat={
            isLoading
              ? '...'
              : lang === 'en'
                ? `${formatNumber(instVendorCount)} vendors · ${formatCompactMXN(instSpend)} · ${formatNumber(instContracts)} contracts · ${instDaPct.toFixed(0)}% direct award`
                : `${formatNumber(instVendorCount)} proveedores · ${formatCompactMXN(instSpend)} · ${formatNumber(instContracts)} contratos · ${instDaPct.toFixed(0)}% adj. directa`
          }
        />

        {/* Sort toggle band */}
        <motion.div
          variants={bandVariants}
          custom={1}
          className="px-4 sm:px-6 pb-2 flex justify-end"
        >
          <ZSortToggle
            modes={['spend', 'risk'] as const}
            active={mode}
            onChange={setMode}
            riskMode="risk"
            label={lang === 'en' ? 'SORT' : 'ORDENAR'}
            labelFor={(m) => lang === 'en' ? m.toUpperCase() : (m === 'spend' ? 'GASTO' : 'RIESGO')}
          />
        </motion.div>

        {/* Scrollable register */}
        <motion.div
          variants={bandVariants}
          custom={2}
          className="flex-1 min-h-0 overflow-y-auto mx-3 sm:mx-4 mb-2"
        >
          {isLoading && (
            <div className="py-12 text-center font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'en' ? 'loading...' : 'cargando...'}
            </div>
          )}
          {isError && !isLoading && (
            <div className="py-12 text-center font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'en' ? 'no vendor data available.' : 'sin datos de proveedores.'}
            </div>
          )}
          {!isLoading && !isError && sortedVendors.length > 0 && <Z2ColumnHeader lang={lang} />}
          {!isLoading && !isError && !useShelf && (
            <ul role="list" className="space-y-px">
              {sortedVendors.map((v, i) => (
                <Z2Row
                  key={v.vendor_id}
                  v={v}
                  rank={i + 1}
                  sectorAccent={sectorAccent}
                  dispatch={dispatch}
                  lang={lang}
                  layoutTransition={layoutTransition}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </ul>
          )}
          {!isLoading && !isError && useShelf && (
            <div className="space-y-2">
              <Z2Shelf
                title={lang === 'en' ? 'CRITICAL · INVESTIGATE' : 'CRÍTICO · INVESTIGAR'}
                color={RISK_COLORS.critical}
                items={shelfCritical}
                sectorAccent={sectorAccent}
                dispatch={dispatch}
                lang={lang}
                layoutTransition={layoutTransition}
                prefersReducedMotion={prefersReducedMotion}
                defaultOpen
              />
              <Z2Shelf
                title={lang === 'en' ? 'HIGH PRIORITY · REVIEW' : 'ALTA PRIORIDAD · REVISAR'}
                color={RISK_COLORS.high}
                items={shelfHigh}
                sectorAccent={sectorAccent}
                dispatch={dispatch}
                lang={lang}
                layoutTransition={layoutTransition}
                prefersReducedMotion={prefersReducedMotion}
                defaultOpen
              />
              <Z2Shelf
                title={lang === 'en' ? 'MEDIUM RISK' : 'RIESGO MEDIO'}
                color={RISK_COLORS.medium}
                items={shelfMedium}
                sectorAccent={sectorAccent}
                dispatch={dispatch}
                lang={lang}
                layoutTransition={layoutTransition}
                prefersReducedMotion={prefersReducedMotion}
                defaultOpen
              />
              <Z2Shelf
                title={lang === 'en' ? 'THE LONG TAIL' : 'LA COLA LARGA'}
                color="var(--color-text-muted)"
                items={shelfRoutine}
                sectorAccent={sectorAccent}
                dispatch={dispatch}
                lang={lang}
                layoutTransition={layoutTransition}
                prefersReducedMotion={prefersReducedMotion}
                defaultOpen={true}
                variant="long-tail"
                instTitle={instTitle}
                totalRegisterCount={sortedVendors.length}
              />
            </div>
          )}
        </motion.div>

        {/* Pull-line — editorial finding */}
        {!isLoading && sortedVendors.length > 0 && (
          <ZPullLine custom={3} variants={bandVariants}>
            {pullLine}
          </ZPullLine>
        )}

        {/* Footer — link to /institutions/:id (canonical dossier) */}
        {!isLoading && sortedVendors.length > 0 && (
          <div className="px-4 sm:px-6 py-2 flex-shrink-0 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'en'
                ? `top ${sortedVendors.length} of ${formatNumber(instVendorCount)} vendors`
                : `top ${sortedVendors.length} de ${formatNumber(instVendorCount)} proveedores`}
            </span>
            <ZFooterLink href={`/institutions/${institutionId}`} lang={lang} />
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Z2 subcomponents — column header, row, shelf ───────────────────────────

/**
 * Plain-language column header for the Z2 vendor register. Widths MUST
 * match Z2Row exactly:
 *   rank 20 · chip 32 · vendor flex · badges 96 · HR-bar 130 ·
 *   spend 110 · contracts 70 · DA 56 · SB 56 · risk 56
 */
function Z2ColumnHeader({ lang }: { lang: 'en' | 'es' }) {
  const isEs = lang === 'es'
  const headerCell: React.CSSProperties = {
    fontSize: 9,
    fontFamily: 'var(--font-family-mono, monospace)',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    lineHeight: 1.3,
  }
  return (
    <div
      className="flex items-end gap-3 px-2 pt-2 pb-1.5 mb-1 sticky top-0 z-[2]"
      style={{
        background: 'var(--color-background)',
        borderBottom: '1px solid var(--color-border)',
      }}
      role="row"
    >
      <span style={{ width: 20 }} role="columnheader" aria-label={isEs ? 'rango' : 'rank'} />
      <span style={{ width: 32 }} role="columnheader" aria-hidden="true" />
      <span className="flex-1 min-w-0" style={headerCell} role="columnheader">
        {isEs ? 'Proveedor' : 'Vendor'}
      </span>
      <span
        className="flex-shrink-0"
        style={{ ...headerCell, width: 96 }}
        role="columnheader"
        title={
          isEs
            ? 'Etiquetas investigativas: DOMINANTE (≥10% del gasto institucional), GT (caso confirmado en Ground Truth), T1 (cohorte de máxima prioridad de ARIA), patrones P1-P7 detectados.'
            : 'Investigative tags: DOMINANT (≥10% of institution spend), GT (confirmed ground-truth case), T1 (ARIA top-priority cohort), detected P1–P7 patterns.'
        }
      >
        {isEs ? 'Etiquetas' : 'Flags'}
      </span>
      <span
        className="flex-shrink-0"
        style={{ ...headerCell, width: 130, textAlign: 'left' }}
        role="columnheader"
        title={
          isEs
            ? 'Tasa de contratos de alto riesgo del proveedor con esta institución: % marcados como alto o crítico por el modelo. Barra al 100% = todos sus contratos aquí están en riesgo.'
            : "High-risk contract rate for this vendor at this institution: % flagged high or critical by the risk model. A full bar means every contract this vendor holds here is at risk."
        }
      >
        {isEs ? 'Contratos de alto riesgo' : 'High-risk contracts'}
      </span>
      <span
        className="flex-shrink-0 text-right"
        style={{ ...headerCell, width: 110 }}
        role="columnheader"
        title={
          isEs
            ? 'Gasto acumulado del proveedor con esta institución, con equivalente en USD y % del gasto total de la institución.'
            : "Total spend this vendor has received from this institution, with USD equivalent and percentage of the institution's spend."
        }
      >
        {isEs ? (
          <>Gasto<br /><span style={{ fontWeight: 400, opacity: 0.7 }}>MXN · USD · %</span></>
        ) : (
          <>Spend<br /><span style={{ fontWeight: 400, opacity: 0.7 }}>MXN · USD · share</span></>
        )}
      </span>
      <span
        className="flex-shrink-0 text-right"
        style={{ ...headerCell, width: 70 }}
        role="columnheader"
        title={
          isEs
            ? 'Número de contratos del proveedor con esta institución.'
            : 'Number of contracts this vendor holds with this institution.'
        }
      >
        {isEs ? (<># de<br /><span>contratos</span></>) : (<># of<br /><span>contracts</span></>)}
      </span>
      <span
        className="flex-shrink-0 text-right"
        style={{ ...headerCell, width: 56 }}
        role="columnheader"
        title={
          isEs
            ? 'Adjudicación directa: % de contratos del proveedor con esta institución otorgados sin licitación pública.'
            : "Direct-award rate: % of this vendor's contracts here awarded without an open bid."
        }
      >
        {isEs ? (<>Adj.<br /><span>directa</span></>) : (<>Direct<br /><span>award</span></>)}
      </span>
      <span
        className="flex-shrink-0 text-right"
        style={{ ...headerCell, width: 56 }}
        role="columnheader"
        title={
          isEs
            ? 'Licitación con un solo postor: % de procedimientos competitivos donde el proveedor fue el único ofertante. Señal clave de manipulación de licitaciones.'
            : 'Single-bid rate: % of competitive procedures where this vendor was the only bidder. Key bid-rigging signal.'
        }
      >
        {isEs ? (<>Único<br /><span>postor</span></>) : (<>Single<br /><span>bid</span></>)}
      </span>
      <span
        className="flex-shrink-0 text-right"
        style={{ ...headerCell, width: 56 }}
        role="columnheader"
        title={
          isEs
            ? "Puntuación promedio de riesgo del modelo para los contratos de este proveedor con esta institución (0–100). Crítico ≥ 60."
            : "Average risk score from the model for this vendor's contracts here (0–100). Critical ≥ 60."
        }
      >
        {isEs ? (<>Riesgo<br /><span>prom.</span></>) : (<>Avg<br /><span>risk</span></>)}
      </span>
    </div>
  )
}

/**
 * Single vendor row in the Z2 register. Carries badges + HR%-bar + spend
 * trio + contract count + DA% + SB% + avg risk. Layout matches
 * Z2ColumnHeader widths exactly. Click drills into Z3.
 */
function Z2Row({
  v,
  rank,
  sectorAccent,
  dispatch,
  lang,
  layoutTransition,
  prefersReducedMotion,
}: {
  v: import('@/api/types').VendorPoolItem
  rank: number
  sectorAccent: string
  dispatch: ReturnType<typeof useExploreDispatch>
  lang: 'en' | 'es'
  layoutTransition: { duration: number; ease?: typeof Z_EASE }
  prefersReducedMotion: boolean
}) {
  const score = v.avg_risk_score ?? 0
  const riskPct = Math.round(score * 100)
  const riskColor =
    score >= 0.60 ? RISK_COLORS.critical
    : score >= 0.40 ? RISK_COLORS.high
    : score >= 0.25 ? RISK_COLORS.medium
    : 'var(--color-text-muted)'

  // flagsKnown=false under the cold-start degraded fallback (backend sends
  // null for these, NOT 0). Render "—" + shimmer so a degraded response is
  // never mistaken for a real zero. Warm response fills real counts.
  const flagsKnown = v.high_risk_pct != null
  const hrPct = v.high_risk_pct ?? 0
  const daPct = v.direct_award_pct ?? 0
  const sbPct = v.single_bid_pct ?? 0
  const hrBarPct = Math.min(100, Math.max(0, hrPct))
  const hrBarColor = hrPct >= 50 ? RISK_COLORS.critical : hrPct >= 25 ? RISK_COLORS.high : hrPct >= 10 ? RISK_COLORS.medium : 'var(--color-text-muted)'
  const daColor = daPct >= 80 ? RISK_COLORS.critical : daPct >= 50 ? RISK_COLORS.high : daPct >= 25 ? RISK_COLORS.medium : 'var(--color-text-muted)'
  const sbColor = sbPct >= 50 ? RISK_COLORS.critical : sbPct >= 25 ? RISK_COLORS.high : sbPct >= 10 ? RISK_COLORS.medium : 'var(--color-text-muted)'
  // Pending-value glyph for unknown flag fields.
  const pendingGlyph = <span style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>—</span>

  // Vendor initials chip — no logo registry for vendors (1000s of names),
  // so we synthesize a 2-char initial tile in the sector accent.
  const cleanName = formatVendorName(v.vendor_name, 300)
  const initials = (() => {
    const parts = cleanName.replace(/^(GRUPO|LABORATORIOS?|DISTRIBUIDORA|FARMAC[ÉE]UTIC[OA]S?)\s+/i, '').split(/\s+/).filter(Boolean)
    const first = (parts[0]?.[0] ?? '?').toUpperCase()
    const second = (parts[1]?.[0] ?? parts[0]?.[1] ?? '').toUpperCase()
    return (first + second).slice(0, 2) || '?'
  })()

  // Role badges — priority-ordered, max 2 visible.
  const badges = computeZ2Badges(v, lang)
  const editorialName = toEditorialCase(cleanName)

  return (
    <motion.li
      layout
      layoutId={`explore-vendor-${v.vendor_id}`}
      transition={{ layout: layoutTransition }}
      whileHover={prefersReducedMotion ? undefined : { backgroundColor: 'var(--color-background-card)', transition: { duration: 0.12 } }}
    >
      <button
        type="button"
        onClick={() => dispatch({ type: 'drill-into-vendor', vendorId: v.vendor_id, vendorName: cleanName })}
        className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-sm cursor-pointer"
        style={{ background: 'transparent' }}
        title={`${cleanName} — ${formatCompactMXN(v.total_value_mxn)} (${v.share_of_institution_pct.toFixed(1)}%) — ${formatNumber(v.contract_count)} contracts — HR ${hrPct.toFixed(0)}% — DA ${daPct.toFixed(0)}% — SB ${sbPct.toFixed(0)}% — avg risk ${riskPct}%`}
        aria-label={`${cleanName}, rank ${rank}, ${formatCompactMXN(v.total_value_mxn)}, ${v.contract_count} contracts, high-risk rate ${hrPct.toFixed(0)} percent`}
      >
        {/* Rank */}
        <span className="font-mono tabular-nums flex-shrink-0 text-right" style={{ fontSize: 9, color: 'var(--color-text-muted)', width: 20 }}>
          {rank}
        </span>
        {/* Initials chip — 2-letter vendor signature in sector accent */}
        <span
          className="flex items-center justify-center flex-shrink-0 rounded-sm font-mono"
          style={{
            width: 32,
            height: 32,
            background: `${sectorAccent}1f`,
            color: sectorAccent,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
          aria-hidden="true"
        >
          {initials}
        </span>
        {/* Full vendor name — title-cased, wraps, never truncated */}
        <span className="flex-1 min-w-0 text-sm leading-tight" style={{ color: 'var(--color-text-primary)', wordBreak: 'break-word', whiteSpace: 'normal' }}>
          {editorialName}
        </span>
        {/* Badge stack — DOMINANT / GT / T1 / pattern */}
        <span className="flex-shrink-0 flex flex-wrap items-center gap-1 justify-end" style={{ width: 96 }}>
          {badges.map((b, i) => (
            <span
              key={i}
              className="font-mono uppercase tracking-[0.08em] px-1 py-0.5 rounded-sm whitespace-nowrap"
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: b.color,
                background: `${b.color}1f`,
                border: `1px solid ${b.color}33`,
              }}
              title={b.tooltip}
            >
              {b.label}
            </span>
          ))}
        </span>
        {/* HR% bar — high-risk contract rate, scoped to (vendor × institution) */}
        <span className="flex-shrink-0 flex items-center gap-2" style={{ width: 130 }}>
          <span
            className="relative flex-1 h-[6px] rounded-sm overflow-hidden"
            style={{ background: 'var(--color-background-elevated)' }}
            aria-hidden="true"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-sm transition-all"
              style={{ width: `${hrBarPct}%`, background: hrBarColor, opacity: 0.92 }}
            />
            {[25, 50, 75].map((t) => (
              <span
                key={t}
                className="absolute inset-y-0 w-px"
                style={{ left: `${t}%`, background: 'rgba(0,0,0,0.10)' }}
              />
            ))}
          </span>
          <span className="font-mono tabular-nums text-right" style={{ fontSize: 11, fontWeight: 700, color: hrBarColor, width: 36 }}>
            {flagsKnown ? <>{hrPct.toFixed(0)}<span className="text-[8px] font-normal" style={{ color: 'var(--color-text-muted)', marginLeft: 1 }}>%</span></> : pendingGlyph}
          </span>
        </span>
        {/* Spend trio: MXN / USD / share-of-institution */}
        <span className="flex-shrink-0 text-right" style={{ width: 110 }}>
          <span className="block font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {formatCompactMXN(v.total_value_mxn)}
          </span>
          <span className="block font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            ≈ {formatCompactUSD(v.total_value_mxn)}
          </span>
          <span className="block font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            {v.share_of_institution_pct.toFixed(1)}% {lang === 'en' ? 'share' : 'aporte'}
          </span>
        </span>
        {/* Contracts */}
        <span className="flex-shrink-0 text-right" style={{ width: 70 }}>
          <span className="block font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {formatNumber(v.contract_count)}
          </span>
          <span className="block font-mono" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            {lang === 'en' ? 'contracts' : 'contratos'}
          </span>
        </span>
        {/* DA% */}
        <span className="flex-shrink-0 text-right" style={{ width: 56 }}>
          <span className="block font-mono tabular-nums font-bold" style={{ fontSize: 11, color: flagsKnown ? daColor : 'var(--color-text-muted)' }}>
            {flagsKnown ? <>{daPct.toFixed(0)}<span className="text-[8px] font-normal" style={{ color: 'var(--color-text-muted)', marginLeft: 1 }}>%</span></> : pendingGlyph}
          </span>
          <span className="block font-mono" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            {lang === 'en' ? 'DA' : 'AD'}
          </span>
        </span>
        {/* SB% (single-bid) — new column, the bid-rigging signal */}
        <span className="flex-shrink-0 text-right" style={{ width: 56 }}>
          <span className="block font-mono tabular-nums font-bold" style={{ fontSize: 11, color: flagsKnown ? sbColor : 'var(--color-text-muted)' }}>
            {flagsKnown ? <>{sbPct.toFixed(0)}<span className="text-[8px] font-normal" style={{ color: 'var(--color-text-muted)', marginLeft: 1 }}>%</span></> : pendingGlyph}
          </span>
          <span className="block font-mono" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            {lang === 'en' ? 'SB' : 'UP'}
          </span>
        </span>
        {/* Avg risk */}
        <span className="flex-shrink-0 text-right" style={{ width: 56 }}>
          <span className="block font-mono tabular-nums font-bold" style={{ fontSize: 11, color: riskColor }}>
            {score > 0 ? riskPct : '—'}
          </span>
          <span className="block font-mono" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            {lang === 'en' ? 'risk' : 'riesgo'}
          </span>
        </span>
      </button>
    </motion.li>
  )
}

/**
 * Collapsible risk-tier shelf grouping Z2 rows. Mirrors Z1Shelf API.
 *
 * variant='long-tail' renders an editorial dek under the header + uses
 * Z2RowDense (single-line condensed format) instead of Z2Row. Reserved
 * for the below-high-risk-threshold tier so the visual hierarchy still
 * reads top-down without hiding any vendor behind a click.
 */
function Z2Shelf({
  title,
  color,
  items,
  sectorAccent,
  dispatch,
  lang,
  layoutTransition,
  prefersReducedMotion,
  defaultOpen,
  variant = 'standard',
  instTitle,
  totalRegisterCount,
}: {
  title: string
  color: string
  items: import('@/api/types').VendorPoolItem[]
  sectorAccent: string
  dispatch: ReturnType<typeof useExploreDispatch>
  lang: 'en' | 'es'
  layoutTransition: { duration: number; ease?: typeof Z_EASE }
  prefersReducedMotion: boolean
  defaultOpen: boolean
  variant?: 'standard' | 'long-tail'
  instTitle?: string
  totalRegisterCount?: number
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null
  const shelfSpend = items.reduce((s, v) => s + (v.total_value_mxn ?? 0), 0)

  // Long-tail aggregate stats — computed from the items in this shelf.
  // The dek names the long tail as a *structure* rather than a list.
  const isLongTail = variant === 'long-tail'
  const maxShare = isLongTail ? items.reduce((m, v) => Math.max(m, v.share_of_institution_pct), 0) : 0
  const avgRisk = isLongTail
    ? Math.round(
        (items.reduce((s, v) => s + (v.avg_risk_score ?? 0), 0) / items.length) * 100,
      )
    : 0
  const longTailDek = isLongTail
    ? (lang === 'en'
        ? `${items.length} of ${instTitle ?? 'this institution'}'s top ${totalRegisterCount ?? items.length} vendors sit below the high-risk threshold — they share ${formatCompactMXN(shelfSpend)}. None individually exceeds ${maxShare.toFixed(1)}% of total spend. Average risk ${avgRisk}.`
        : `${items.length} de los ${totalRegisterCount ?? items.length} mayores proveedores de ${instTitle ?? 'esta institución'} están bajo el umbral de alto riesgo — comparten ${formatCompactMXN(shelfSpend)}. Ninguno supera el ${maxShare.toFixed(1)}% del gasto total individualmente. Riesgo promedio ${avgRisk}.`)
    : null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm font-mono uppercase tracking-[0.14em] cursor-pointer"
        style={{ fontSize: 9, color, background: `${color}10`, fontWeight: 700 }}
        aria-expanded={open}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        <span className="flex-1 text-left">{title}</span>
        <span className="font-mono tabular-nums normal-case" style={{ fontSize: 9, opacity: 0.7 }}>{formatCompactMXN(shelfSpend)}</span>
        <span className="font-mono tabular-nums" style={{ fontSize: 10 }}>{items.length}</span>
      </button>
      {open && longTailDek && (
        <div
          className="px-3 py-2 mt-0.5 flex items-start gap-2"
          style={{
            background: 'var(--color-background-elevated)',
            borderLeft: `2px solid ${color}`,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 11, color, lineHeight: 1.3, fontWeight: 700 }}>▎</span>
          <p
            className="text-text-secondary leading-snug"
            style={{
              fontSize: 11,
              fontFamily: "'Source Serif Pro', Georgia, serif",
              fontStyle: 'italic',
            }}
          >
            {longTailDek}
          </p>
        </div>
      )}
      {open && (
        <ul role="list" className="space-y-px mt-0.5">
          {items.map((v, i) =>
            isLongTail ? (
              <Z2RowDense
                key={v.vendor_id}
                v={v}
                rank={i + 1}
                sectorAccent={sectorAccent}
                dispatch={dispatch}
                lang={lang}
                layoutTransition={layoutTransition}
                prefersReducedMotion={prefersReducedMotion}
              />
            ) : (
              <Z2Row
                key={v.vendor_id}
                v={v}
                rank={i + 1}
                sectorAccent={sectorAccent}
                dispatch={dispatch}
                lang={lang}
                layoutTransition={layoutTransition}
                prefersReducedMotion={prefersReducedMotion}
              />
            ),
          )}
        </ul>
      )}
    </div>
  )
}

/**
 * Z2RowDense — condensed single-line variant for the long-tail shelf.
 * Drops badges, HR-bar, DA%, SB%, USD line. Shows: rank · 22px chip ·
 * name (truncates with title attribute) · spend (MXN + share) · #contracts ·
 * avg risk. ~24px row height vs. Z2Row's ~60px so the long tail flows
 * beneath the headline rows without competing for visual weight.
 */
function Z2RowDense({
  v,
  rank,
  sectorAccent,
  dispatch,
  layoutTransition,
  prefersReducedMotion,
}: {
  v: import('@/api/types').VendorPoolItem
  rank: number
  sectorAccent: string
  dispatch: ReturnType<typeof useExploreDispatch>
  lang: 'en' | 'es'  // accepted for parity with Z2Row's signature; not currently used (no localized labels in dense row)
  layoutTransition: { duration: number; ease?: typeof Z_EASE }
  prefersReducedMotion: boolean
}) {
  const score = v.avg_risk_score ?? 0
  const riskPct = Math.round(score * 100)
  const cleanName = formatVendorName(v.vendor_name, 300)
  const editorialName = toEditorialCase(cleanName)
  const initials = (() => {
    const parts = cleanName.replace(/^(GRUPO|LABORATORIOS?|DISTRIBUIDORA|FARMAC[ÉE]UTIC[OA]S?)\s+/i, '').split(/\s+/).filter(Boolean)
    const first = (parts[0]?.[0] ?? '?').toUpperCase()
    const second = (parts[1]?.[0] ?? parts[0]?.[1] ?? '').toUpperCase()
    return (first + second).slice(0, 2) || '?'
  })()

  return (
    <motion.li
      layout
      layoutId={`explore-vendor-${v.vendor_id}`}
      transition={{ layout: layoutTransition }}
      whileHover={prefersReducedMotion ? undefined : { backgroundColor: 'var(--color-background-card)', transition: { duration: 0.12 } }}
    >
      <button
        type="button"
        onClick={() => dispatch({ type: 'drill-into-vendor', vendorId: v.vendor_id, vendorName: cleanName })}
        className="w-full text-left flex items-center gap-2 px-2 py-1 rounded-sm cursor-pointer"
        style={{ background: 'transparent' }}
        title={`${cleanName} — ${formatCompactMXN(v.total_value_mxn)} (${v.share_of_institution_pct.toFixed(2)}%) — ${formatNumber(v.contract_count)} contracts — avg risk ${riskPct}%`}
        aria-label={`${cleanName}, rank ${rank}, ${formatCompactMXN(v.total_value_mxn)}, ${v.contract_count} contracts, avg risk ${riskPct} percent`}
      >
        {/* Rank — match Z2Row width 20 for column alignment */}
        <span className="font-mono tabular-nums flex-shrink-0 text-right" style={{ fontSize: 9, color: 'var(--color-text-muted)', width: 20 }}>
          {rank}
        </span>
        {/* Smaller chip — 22px vs Z2Row's 32 — signals secondary tier */}
        <span
          className="flex items-center justify-center flex-shrink-0 rounded-sm font-mono"
          style={{
            width: 22,
            height: 22,
            background: `${sectorAccent}14`,
            color: sectorAccent,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.04em',
            opacity: 0.85,
          }}
          aria-hidden="true"
        >
          {initials}
        </span>
        {/* Full vendor name, single-line, truncates with native ellipsis +
            full name in title attribute. Long-tail vendors don't need the
            same word-wrapping reverence as headline rows — the dek above
            already names the tail's structure. */}
        <span
          className="flex-1 min-w-0 leading-snug truncate"
          style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
        >
          {editorialName}
        </span>
        {/* Spend trio collapsed to one line: MXN · share% */}
        <span className="flex-shrink-0 text-right font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--color-text-secondary)', width: 140 }}>
          {formatCompactMXN(v.total_value_mxn)}
          <span style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>{v.share_of_institution_pct.toFixed(2)}%</span>
        </span>
        {/* Contracts — single number, no label */}
        <span className="flex-shrink-0 text-right font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 60 }}>
          {formatNumber(v.contract_count)}
        </span>
        {/* Avg risk — single number, no label */}
        <span className="flex-shrink-0 text-right font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 28 }}>
          {score > 0 ? riskPct : '—'}
        </span>
      </button>
    </motion.li>
  )
}

/**
 * Compute the visible badges for a Z2 vendor row. Returns at most 2 in
 * priority order: GT → DOMINANT → T1 → pattern (P1-P7) → T2. Each badge
 * carries its own color + localized tooltip.
 */
function computeZ2Badges(
  v: import('@/api/types').VendorPoolItem,
  lang: 'en' | 'es',
): Array<{ label: string; color: string; tooltip: string }> {
  const out: Array<{ label: string; color: string; tooltip: string }> = []
  const isEs = lang === 'es'

  if (v.in_ground_truth === 1) {
    out.push({
      label: 'GT',
      color: RISK_COLORS.critical,
      tooltip: isEs ? 'Caso confirmado en la base Ground Truth' : 'Confirmed corruption case in Ground Truth',
    })
  }

  if (v.share_of_institution_pct >= 10) {
    out.push({
      label: isEs ? 'DOMINANTE' : 'DOMINANT',
      color: RISK_COLORS.high,
      tooltip: isEs
        ? `Concentra ${v.share_of_institution_pct.toFixed(1)}% del gasto de esta institución (≥10%)`
        : `Captures ${v.share_of_institution_pct.toFixed(1)}% of this institution's spend (≥10%)`,
    })
  }

  if (out.length < 2 && v.ips_tier === 1) {
    out.push({
      label: 'T1',
      color: RISK_COLORS.critical,
      tooltip: isEs ? 'Cohorte Tier-1 de ARIA: máxima prioridad investigativa' : 'ARIA Tier-1 cohort: highest investigative priority',
    })
  }

  if (out.length < 2 && v.primary_pattern) {
    const labels: Record<string, [string, string]> = {
      P1: ['BID-RIG', 'SOBORNO'],
      P2: ['GHOST', 'FANTASMA'],
      P3: ['INTERMED.', 'INTERMED.'],
      P4: ['KICKBACK', 'COMISIÓN'],
      P5: ['ROTATION', 'ROTACIÓN'],
      P6: ['CAPTURE', 'CAPTURA'],
      P7: ['DUMP', 'VOLQUEO'],
    }
    const pair = labels[v.primary_pattern]
    if (pair) {
      out.push({
        label: pair[isEs ? 1 : 0],
        color: PATTERN_COLORS[v.primary_pattern] ?? RISK_COLORS.high,
        tooltip: isEs
          ? `Patrón ${v.primary_pattern} detectado por ARIA`
          : `ARIA-detected pattern ${v.primary_pattern}`,
      })
    }
  }

  if (out.length < 2 && v.ips_tier === 2) {
    out.push({
      label: 'T2',
      color: RISK_COLORS.high,
      tooltip: isEs ? 'Cohorte Tier-2 de ARIA' : 'ARIA Tier-2 cohort',
    })
  }

  return out.slice(0, 2)
}

// ────────────────────────────────────────────────────────────────────────────
// Z3Panel — editorial contract view: "LOS 3 QUE IMPORTAN" + year bars + full list
// ────────────────────────────────────────────────────────────────────────────

type Z3Mode = 'time' | 'risk'

function Z3Panel({
  vendorId,
  vendorName,
  ancestrySectorId,
  ancestrySectorCode,
  ancestryInstitutionId,
  ancestryInstitutionName,
  lang,
  dispatch,
  highlightContractId,
}: {
  vendorId: number
  vendorName: string
  ancestrySectorId: number | null
  ancestrySectorCode: string | null
  ancestryInstitutionId: number | null
  ancestryInstitutionName: string | null
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

  // Vendor's primary sector — prefer ancestry (we came from there) over
  // mode of the contract sectors. Falls back to mode if deep-linked.
  const sectorFromContracts = (() => {
    const counts = new Map<number, number>()
    contracts.forEach((c) => {
      const sid = Number(c.sector_id ?? 0)
      if (sid > 0) counts.set(sid, (counts.get(sid) ?? 0) + 1)
    })
    let best: number | null = null
    let bestN = 0
    counts.forEach((n, sid) => {
      if (n > bestN) { best = sid; bestN = n }
    })
    return best
  })()
  const effectiveSectorId = ancestrySectorId ?? sectorFromContracts
  const sectorRow = SECTORS.find((s) => s.id === effectiveSectorId)
  const sectorCode = ancestrySectorCode ?? sectorRow?.code ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'
  const sectorName = lang === 'es' ? (sectorRow?.name ?? '') : (sectorRow?.nameEN ?? '')

  // Procedure-flag aggregates for the kicker stat row
  const directAwardN = contracts.filter((c) => c.is_direct_award).length
  const singleBidN = contracts.filter((c) => c.is_single_bid).length
  const daPct = contracts.length > 0 ? (directAwardN / contracts.length) * 100 : 0
  const hrCount = contracts.filter((c) => {
    const s = Number(c.risk_score ?? 0)
    return s >= 0.40
  }).length
  const hrPct = contracts.length > 0 ? (hrCount / contracts.length) * 100 : 0

  // Year buckets for the timeline strip — covers the FULL year range
  // 2002 → latest year so admin bands stay continuous even in idle years.
  const byYear = new Map<number, { count: number; amount: number; riskSum: number; riskN: number }>()
  contracts.forEach((c) => {
    const yr = Number(c.contract_year ?? 0)
    if (yr < 2002 || yr > 2030) return
    const amt = Number(c.amount_mxn ?? 0)
    const risk = Number(c.risk_score ?? 0)
    const ex = byYear.get(yr) ?? { count: 0, amount: 0, riskSum: 0, riskN: 0 }
    ex.count += 1
    ex.amount += amt
    if (risk > 0) { ex.riskSum += risk; ex.riskN += 1 }
    byYear.set(yr, ex)
  })
  const allYearsSorted = Array.from(byYear.keys()).sort((a, b) => a - b)
  const yearMin = allYearsSorted[0] ?? 2002
  const yearMax = allYearsSorted[allYearsSorted.length - 1] ?? 2025
  // Build a complete year sequence so the strip has stable spacing
  const yearSequence: number[] = []
  for (let y = yearMin; y <= yearMax; y++) yearSequence.push(y)
  const maxYearAmt = Math.max(...Array.from(byYear.values()).map((v) => v.amount), 1)

  // Largest single contract — drives the in-row amount bars (turns the dead
  // whitespace in the register into a magnitude channel).
  const maxContractAmt = Math.max(1, ...contracts.map((c) => Number(c.amount_mxn ?? 0)))

  // Amounts array for the fingerprint histogram.
  const contractAmounts = contracts.map((c) => Number(c.amount_mxn ?? 0))

  // Monthly buckets — only used when the vendor spans ≤3 years (a yearly
  // strip would be 2–3 giant blocks; monthly resolution shows the burst).
  // Built from contract_date (YYYY-MM-DD); falls back to caption if no dates.
  const yearSpan = yearMax - yearMin
  const monthly = (() => {
    if (yearSpan > 3) return null
    const byMonth = new Map<string, { amount: number; count: number; riskSum: number; riskN: number }>()
    let anyDate = false
    contracts.forEach((c) => {
      const d = (c.contract_date ?? '').slice(0, 7) // YYYY-MM
      if (!/^\d{4}-\d{2}$/.test(d)) return
      anyDate = true
      const amt = Number(c.amount_mxn ?? 0)
      const risk = Number(c.risk_score ?? 0)
      const ex = byMonth.get(d) ?? { amount: 0, count: 0, riskSum: 0, riskN: 0 }
      ex.amount += amt; ex.count += 1
      if (risk > 0) { ex.riskSum += risk; ex.riskN += 1 }
      byMonth.set(d, ex)
    })
    if (!anyDate) return null
    // Continuous month sequence from yearMin-01 to yearMax-12.
    const seq: Array<{ ym: string; label: string; amount: number; count: number; avgRisk: number; isYearStart: boolean; yearLabel: string }> = []
    const MONTHS_ES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
    for (let y = yearMin; y <= yearMax; y++) {
      for (let m = 1; m <= 12; m++) {
        const ym = `${y}-${String(m).padStart(2, '0')}`
        const cell = byMonth.get(ym) ?? { amount: 0, count: 0, riskSum: 0, riskN: 0 }
        seq.push({
          ym,
          label: `${MONTHS_ES[m - 1]} ${y}`,
          amount: cell.amount,
          count: cell.count,
          avgRisk: cell.riskN > 0 ? cell.riskSum / cell.riskN : 0,
          isYearStart: m === 1,
          yearLabel: `'${String(y).slice(2)}`,
        })
      }
    }
    return seq
  })()

  // Top-3 cards: BIGGEST / HIGHEST RISK / MOST RECENT. Disambiguate by
  // falling through to the next candidate when picks collide.
  const top3 = pickZ3Top3(contracts)

  // Sort + year filter for the contracts register
  const [mode, setMode] = useState<Z3Mode>('time')
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const filtered = yearFilter ? contracts.filter((c) => Number(c.contract_year) === yearFilter) : contracts
  const sortedContracts = useMemo(() => {
    return [...filtered].sort((a, b) =>
      mode === 'risk'
        ? (Number(b.risk_score) || 0) - (Number(a.risk_score) || 0) || (Number(b.amount_mxn) || 0) - (Number(a.amount_mxn) || 0)
        : (Number(b.contract_year) || 0) - (Number(a.contract_year) || 0) || (Number(b.amount_mxn) || 0) - (Number(a.amount_mxn) || 0),
    )
  }, [filtered, mode])

  const prefersReducedMotion = useReducedMotion() ?? false
  const bandVariants = useBandVariants(prefersReducedMotion)
  const layoutTransition = prefersReducedMotion ? { duration: 0 } : { duration: Z_LAYOUT_DURATION_S, ease: Z_EASE }

  // Editorial vendor name + display. On a direct deep-link (no drill-through
  // state) the `vendorName` prop is the URL placeholder "Vendor 13885" — fall
  // back to the vendor_name carried on the fetched contract rows so the
  // headline + breadcrumb show the real name, not the id.
  const isPlaceholderName = /^Vendor\s+\d+$/i.test(vendorName?.trim() ?? '')
  const resolvedVendorName = (isPlaceholderName
    ? (contracts.find((c) => (c as ContractListItem).vendor_name)?.vendor_name ?? vendorName)
    : vendorName)
  const cleanName = formatVendorName(resolvedVendorName, 300)
  const editorialName = toEditorialCase(cleanName)

  // Breadcrumb ancestry — crumbs that don't apply quietly disappear
  const crumbs: CrumbSegment[] = [
    { label: lang === 'en' ? 'Spoils' : 'Reparto', onClick: () => dispatch({ type: 'reset-to-system' }) },
  ]
  if (ancestrySectorId != null) {
    crumbs.push({ label: sectorName || sectorCode, sectorCode, onClick: () => dispatch({ type: 'pop-to-level', level: 1 }) })
  }
  if (ancestryInstitutionId != null) {
    crumbs.push({ label: ancestryInstitutionName ? toEditorialCase(ancestryInstitutionName).slice(0, 32) : `Inst ${ancestryInstitutionId}`, onClick: () => dispatch({ type: 'pop-to-level', level: 2 }) })
  }
  crumbs.push({ label: editorialName.slice(0, 32) })

  // Pull-line — picks the strongest narrative frame from the data
  const pullLine = computeZ3PullLine({
    editorialName,
    institutionName: ancestryInstitutionName,
    totalContractSpend,
    contractCount: contracts.length,
    hrPct,
    daPct,
    byYear,
    lang,
  })

  const RENDER_LIMIT = 30
  const visibleContracts = sortedContracts.slice(0, RENDER_LIMIT)

  return (
    <div
      className="absolute inset-0 z-[5] overflow-hidden flex flex-col"
      data-scroll-panel="true"
      style={{ background: 'var(--color-background)', top: '48px' }}
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        className="absolute inset-0 flex flex-col"
      >
        {/* Breadcrumb */}
        <ZBreadcrumb segments={crumbs} lang={lang} />

        {/* Sector-color rail — Z2's vendor chip morphs into this on drill-in */}
        <motion.div
          layoutId={`explore-vendor-${vendorId}`}
          transition={{ layout: layoutTransition }}
          style={{ height: 6, background: sectorAccent, flexShrink: 0 }}
          aria-hidden="true"
        />

        {/* Editorial header */}
        <ZKickerBand
          custom={0}
          variants={bandVariants}
          kicker={lang === 'en' ? '§ EL HISTORIAL · VENDOR DEEP' : '§ EL HISTORIAL · PROVEEDOR'}
          headline={
            lang === 'en'
              ? <>{editorialName} — <em style={{ fontStyle: 'italic', fontWeight: 800 }}>what they actually did</em></>
              : <>{editorialName} — <em style={{ fontStyle: 'italic', fontWeight: 800 }}>qué hicieron en realidad</em></>
          }
          stat={
            isLoading
              ? '...'
              : lang === 'en'
                ? `${formatNumber(contracts.length)} contracts · ${formatCompactMXN(totalContractSpend)} · ${hrPct.toFixed(0)}% high-risk · ${daPct.toFixed(0)}% direct award · ${formatNumber(singleBidN)} single-bid`
                : `${formatNumber(contracts.length)} contratos · ${formatCompactMXN(totalContractSpend)} · ${hrPct.toFixed(0)}% alto riesgo · ${daPct.toFixed(0)}% adj. directa · ${formatNumber(singleBidN)} único postor`
          }
        />

        {/* Scrollable middle — timeline + top-3 + toggle + register */}
        <motion.div
          variants={bandVariants}
          custom={1}
          className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4"
        >
          {isLoading && (
            <div className="py-12 text-center font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'en' ? 'loading...' : 'cargando...'}
            </div>
          )}
          {isError && !isLoading && (
            <div className="py-12 text-center font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'en' ? 'no contracts found.' : 'sin contratos disponibles.'}
            </div>
          )}

          {/* ACTIVITY — adaptive temporal view. Spans >3 years → yearly strip
              with admin bands. Spans ≤3 years with dates → MONTHLY strip
              (24–48 cols) so the burst is visible. No usable dates → compact
              caption. This replaces the old "collapse to a text line" which
              hid the very burst pattern that defines a ghost vendor. */}
          {!isLoading && !isError && yearSpan > 3 && byYear.size > 0 && (
            <Z3TimelineStrip
              yearSequence={yearSequence}
              byYear={byYear}
              maxYearAmt={maxYearAmt}
              selectedYear={yearFilter}
              onYearClick={(y) => setYearFilter((current) => (current === y ? null : y))}
              lang={lang}
            />
          )}
          {!isLoading && !isError && yearSpan <= 3 && monthly && (
            <Z3MonthlyStrip monthly={monthly} lang={lang} />
          )}
          {!isLoading && !isError && yearSpan <= 3 && !monthly && byYear.size > 0 && (
            <div className="pt-4 pb-1">
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {lang === 'en' ? 'Activity by year' : 'Actividad por año'}
              </div>
              <div className="font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {(() => {
                  const range = yearMin === yearMax ? `${yearMin}` : `${yearMin}–${yearMax}`
                  const adminMin = getAdministrationByYear(yearMin)?.short
                  const adminTag = adminMin ? ` · ${adminMin}` : ''
                  return lang === 'en'
                    ? `Active ${range} · ${formatNumber(contracts.length)} contracts${adminTag}`
                    : `Activo ${range} · ${formatNumber(contracts.length)} contratos${adminTag}`
                })()}
              </div>
            </div>
          )}

          {/* FINGERPRINT — procedure mix · risk · amount distribution. Turns
              the stat-line numbers into pictures so the pattern reads at a
              glance (a flat contract list hides it). */}
          {!isLoading && !isError && contracts.length > 0 && (
            <Z3Fingerprint
              directAwardN={directAwardN}
              hrCount={hrCount}
              total={contracts.length}
              amounts={contractAmounts}
              lang={lang}
            />
          )}

          {/* Top-3 hero cards — BIGGEST / HIGHEST RISK / MOST RECENT */}
          {!isLoading && !isError && top3.length > 0 && (
            <Z3HeroCards
              top3={top3}
              highlightContractId={highlightContractId ?? null}
              dispatch={dispatch}
              lang={lang}
            />
          )}

          {/* Sort toggle + filter chip */}
          {!isLoading && !isError && contracts.length > 0 && (
            <div className="flex items-center justify-between pt-4 pb-2 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'en' ? 'Contracts' : 'Contratos'}
                </span>
                {yearFilter && (
                  <button
                    type="button"
                    onClick={() => setYearFilter(null)}
                    className="font-mono text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm cursor-pointer"
                    style={{
                      background: `${sectorAccent}1f`,
                      color: sectorAccent,
                      border: `1px solid ${sectorAccent}55`,
                    }}
                    title={lang === 'en' ? 'Clear year filter' : 'Quitar filtro de año'}
                  >
                    {yearFilter} ×
                  </button>
                )}
              </div>
              <ZSortToggle
                modes={['time', 'risk'] as const}
                active={mode}
                onChange={setMode}
                riskMode="risk"
                label={lang === 'en' ? 'SORT' : 'ORDENAR'}
                labelFor={(m) => lang === 'en' ? m.toUpperCase() : (m === 'time' ? 'TIEMPO' : 'RIESGO')}
              />
            </div>
          )}

          {/* Dense register — top 30 contracts, disclosure to /vendors/{id} for full list */}
          {!isLoading && !isError && visibleContracts.length > 0 && (
            <ul role="list" className="space-y-px">
              {visibleContracts.map((c) => (
                <Z3ContractRow
                  key={c.id}
                  c={c}
                  maxAmt={maxContractAmt}
                  isHighlighted={c.id === highlightContractId}
                  dispatch={dispatch}
                  lang={lang}
                  layoutTransition={layoutTransition}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
            </ul>
          )}

          {/* "view all" disclosure when we have more than RENDER_LIMIT */}
          {!isLoading && !isError && filtered.length > RENDER_LIMIT && (
            <div className="pt-3 pb-4">
              <ZFooterLink
                href={`/vendors/${vendorId}`}
                lang={lang}
                label={lang === 'en'
                  ? `View all ${formatNumber(filtered.length)} contracts in full dossier`
                  : `Ver los ${formatNumber(filtered.length)} contratos en la ficha completa`}
              />
            </div>
          )}
        </motion.div>

        {/* Pull-line — editorial finding */}
        {!isLoading && !isError && contracts.length > 0 && (
          <ZPullLine custom={3} variants={bandVariants}>
            {pullLine}
          </ZPullLine>
        )}

        {/* Footer */}
        {!isLoading && !isError && contracts.length > 0 && (
          <div className="px-4 sm:px-6 py-2 flex-shrink-0 flex items-center justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'en'
                ? `${visibleContracts.length} of ${formatNumber(filtered.length)} shown`
                : `${visibleContracts.length} de ${formatNumber(filtered.length)} mostrados`}
            </span>
            <ZFooterLink href={`/vendors/${vendorId}`} lang={lang} />
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Z3 subcomponents ───────────────────────────────────────────────────────

const ADMIN_COLORS: Record<string, string> = {
  fox: '#64748b', calderon: '#1d4ed8', epn: '#7c3aed', amlo: '#b45309', sheinbaum: '#0d9488',
}

/**
 * Z3TimelineStrip — horizontal strip of year cells. Spend bar height
 * proportional to spend that year; cap color from avg risk. Admin band
 * runs across the top labeling political eras. Click a year to filter
 * the register below; click again to clear.
 */
function Z3TimelineStrip({
  yearSequence,
  byYear,
  maxYearAmt,
  selectedYear,
  onYearClick,
  lang,
}: {
  yearSequence: number[]
  byYear: Map<number, { count: number; amount: number; riskSum: number; riskN: number }>
  maxYearAmt: number
  selectedYear: number | null
  onYearClick: (y: number) => void
  lang: 'en' | 'es'
}) {
  // Build admin segments — each is a run of consecutive years under one admin
  type Seg = { key: string; short: string; from: number; to: number; color: string }
  const segments: Seg[] = []
  for (const yr of yearSequence) {
    const admin = getAdministrationByYear(yr)
    if (!admin) continue
    const last = segments[segments.length - 1]
    if (last && last.key === admin.key) {
      last.to = yr
    } else {
      segments.push({
        key: admin.key,
        short: admin.short,
        from: yr,
        to: yr,
        color: ADMIN_COLORS[admin.key] ?? 'var(--color-accent)',
      })
    }
  }

  const totalYears = yearSequence.length
  const widthPct = (n: number) => (n / Math.max(totalYears, 1)) * 100

  return (
    <div className="pt-4 pb-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {lang === 'en' ? 'Activity by year' : 'Actividad por año'}
      </div>
      <div className="relative" style={{ height: 72 }}>
        {/* Admin band — full-width strip labeled with sexenio short names */}
        <div className="absolute top-0 left-0 right-0 flex" style={{ height: 12 }}>
          {segments.map((seg) => {
            const span = seg.to - seg.from + 1
            const offset = seg.from - yearSequence[0]
            return (
              <div
                key={seg.key + '-' + seg.from}
                className="font-mono text-[8px] uppercase tracking-[0.12em] flex items-center px-1.5"
                style={{
                  position: 'absolute',
                  left: `${widthPct(offset)}%`,
                  width: `${widthPct(span)}%`,
                  height: '100%',
                  background: `${seg.color}26`,
                  color: seg.color,
                  borderLeft: `1px solid ${seg.color}55`,
                  fontWeight: 700,
                }}
                title={`${seg.short} ${seg.from}–${seg.to}`}
              >
                <span className="truncate">{seg.short}</span>
              </div>
            )
          })}
        </div>
        {/* Spend bars — one column per year, click to filter */}
        <div className="absolute left-0 right-0 flex items-end" style={{ top: 16, bottom: 14 }}>
          {yearSequence.map((yr) => {
            const cell = byYear.get(yr) ?? { count: 0, amount: 0, riskSum: 0, riskN: 0 }
            const heightPct = cell.amount > 0 ? Math.max(4, (cell.amount / maxYearAmt) * 100) : 0
            const avgRisk = cell.riskN > 0 ? cell.riskSum / cell.riskN : 0
            const capColor =
              avgRisk >= 0.60 ? RISK_COLORS.critical
              : avgRisk >= 0.40 ? RISK_COLORS.high
              : avgRisk >= 0.25 ? RISK_COLORS.medium
              : 'var(--color-text-muted)'
            const isSelected = selectedYear === yr
            return (
              <button
                key={yr}
                type="button"
                onClick={() => onYearClick(yr)}
                className="flex flex-col justify-end items-center flex-1 px-px h-full transition-opacity cursor-pointer"
                style={{
                  opacity: selectedYear == null || isSelected ? 1 : 0.4,
                  background: isSelected ? `${capColor}14` : 'transparent',
                }}
                title={
                  cell.count > 0
                    ? `${yr} · ${cell.count} ${lang === 'en' ? 'contracts' : 'contratos'} · ${formatCompactMXN(cell.amount)} · ${(avgRisk * 100).toFixed(0)} risk`
                    : `${yr} · ${lang === 'en' ? 'no contracts' : 'sin contratos'}`
                }
                aria-label={`Year ${yr}, ${cell.count} contracts, ${formatCompactMXN(cell.amount)}`}
              >
                {/* Spend bar with risk cap */}
                {cell.amount > 0 ? (
                  <div
                    className="w-full"
                    style={{
                      height: `${heightPct}%`,
                      background: 'var(--color-text-muted)',
                      opacity: 0.4,
                      borderTop: `3px solid ${capColor}`,
                      minHeight: 4,
                    }}
                  />
                ) : (
                  <div className="w-full" style={{ height: 1, background: 'var(--color-border)' }} />
                )}
              </button>
            )
          })}
        </div>
        {/* Year labels — show every 2nd or 4th to avoid crowding */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end" style={{ height: 12 }}>
          {yearSequence.map((yr, i) => {
            // Show first, last, and every 2-4 years depending on density
            const step = totalYears > 16 ? 4 : totalYears > 10 ? 2 : 1
            const showLabel = i === 0 || i === totalYears - 1 || yr % step === 0
            return (
              <div
                key={yr}
                className="flex-1 text-center font-mono"
                style={{ fontSize: 8, color: 'var(--color-text-muted)', visibility: showLabel ? 'visible' : 'hidden' }}
              >
                '{String(yr).slice(-2)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Z3HeroCards — three editorial cards picking BIGGEST / HIGHEST RISK /
 * MOST RECENT contracts. Each card carries year, amount, procedure
 * chip, risk-tier color rail. Click jumps to the Z4 drawer.
 */
function Z3HeroCards({
  top3,
  highlightContractId,
  dispatch,
  lang,
}: {
  top3: Array<{ contract: ContractListItem; pick: 'biggest' | 'risk' | 'recent' }>
  highlightContractId: number | null
  dispatch: ReturnType<typeof useExploreDispatch>
  lang: 'en' | 'es'
}) {
  const labels: Record<'biggest' | 'risk' | 'recent', [string, string]> = {
    biggest: ['BIGGEST', 'EL MÁS GRANDE'],
    risk:    ['HIGHEST RISK', 'MAYOR RIESGO'],
    recent:  ['MOST RECENT', 'MÁS RECIENTE'],
  }
  return (
    <div className="pt-3 pb-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
      {top3.map(({ contract: c, pick }) => {
        const score = Number(c.risk_score ?? 0)
        const level = getRiskLevelFromScore(score)
        const fill = RISK_COLORS[level]
        const isHighlighted = c.id === highlightContractId
        const procType = shortProcType(
          (c as ContractListItem & { procedure_type?: string | null }).procedure_type,
          !!c.is_direct_award,
          lang,
        )
        const title = (c as ContractListItem & { title?: string }).title
        return (
          <button
            key={pick}
            type="button"
            onClick={() => dispatch({ type: 'drill-into-contract', contractId: c.id })}
            className="text-left rounded-sm p-2.5 cursor-pointer transition-colors"
            style={{
              borderLeft: `3px solid ${fill}`,
              background: isHighlighted ? `${fill}10` : 'var(--color-background-elevated)',
              minHeight: 92,
            }}
            onMouseEnter={(e) => { if (!isHighlighted) (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
            onMouseLeave={(e) => { if (!isHighlighted) (e.currentTarget as HTMLElement).style.background = 'var(--color-background-elevated)' }}
          >
            <div
              className="font-mono text-[8px] uppercase tracking-[0.14em] mb-1"
              style={{ color: fill, fontWeight: 700 }}
            >
              {lang === 'en' ? labels[pick][0] : labels[pick][1]}
            </div>
            <div className="font-mono text-[10px] tabular-nums mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {c.contract_year}
            </div>
            <div
              className="font-serif tabular-nums leading-tight"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 18,
                fontWeight: 800,
                color: fill,
              }}
            >
              {formatCompactMXN(Number(c.amount_mxn ?? 0))}
            </div>
            <div className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              ≈ {formatCompactUSD(Number(c.amount_mxn ?? 0))}
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <span
                className="font-mono text-[8px] uppercase tracking-[0.08em] px-1 py-0.5 rounded-sm"
                style={{ background: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                {procType}
              </span>
              <span
                className="font-mono text-[8px] uppercase tracking-[0.08em] px-1 py-0.5 rounded-sm"
                style={{ background: `${fill}1f`, color: fill, border: `1px solid ${fill}44` }}
              >
                {lang === 'en' ? `risk ${Math.round(score * 100)}` : `riesgo ${Math.round(score * 100)}`}
              </span>
            </div>
            {title && (
              <div className="text-[10px] mt-1.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)', fontFamily: "'Source Serif Pro', Georgia, serif" }}>
                {shortenContractName(title, 90)}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Z3ContractRow — dense single-line contract row. Click → Z4 drawer.
 */
function Z3ContractRow({
  c,
  maxAmt,
  isHighlighted,
  dispatch,
  lang,
  layoutTransition,
  prefersReducedMotion,
}: {
  c: ContractListItem
  maxAmt: number
  isHighlighted: boolean
  dispatch: ReturnType<typeof useExploreDispatch>
  lang: 'en' | 'es'
  layoutTransition: { duration: number; ease?: typeof Z_EASE }
  prefersReducedMotion: boolean
}) {
  const score = Number(c.risk_score ?? 0)
  const level = getRiskLevelFromScore(score)
  const fill = RISK_COLORS[level]
  const riskPct = score > 0 ? Math.round(score * 100) : null
  // Amount bar — fraction of the vendor's largest contract. Fills the dead
  // whitespace in the row's middle so the eye sees magnitude + threshold
  // clustering instead of a flat list.
  const amtFrac = Math.max(0.02, Math.min(1, Number(c.amount_mxn ?? 0) / Math.max(1, maxAmt)))
  const title = (c as ContractListItem & { title?: string }).title
  const procType = shortProcType(
    (c as ContractListItem & { procedure_type?: string | null }).procedure_type,
    !!c.is_direct_award,
    lang,
  )

  return (
    <motion.li
      layout
      transition={{ layout: layoutTransition }}
      whileHover={prefersReducedMotion ? undefined : { backgroundColor: 'var(--color-background-card)', transition: { duration: 0.12 } }}
      style={isHighlighted ? { background: `${fill}14` } : undefined}
    >
      <button
        type="button"
        onClick={() => dispatch({ type: 'drill-into-contract', contractId: c.id })}
        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer"
        style={{ background: 'transparent', borderLeft: `2px solid ${fill}` }}
        title={`${c.contract_year} · ${formatCompactMXN(Number(c.amount_mxn ?? 0))} · ${procType} · ${title ?? ''}`}
      >
        {/* Year */}
        <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 32 }}>
          {c.contract_year}
        </span>
        {/* Amount */}
        <span className="flex-shrink-0 text-right font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: fill, width: 88 }}>
          {formatCompactMXN(Number(c.amount_mxn ?? 0))}
        </span>
        {/* Procedure chip */}
        <span
          className="flex-shrink-0 font-mono text-[8px] uppercase tracking-[0.08em] px-1 py-0.5 rounded-sm whitespace-nowrap"
          style={{
            background: c.is_direct_award ? `${RISK_COLORS.high}1f` : 'var(--color-border)',
            color: c.is_direct_award ? RISK_COLORS.high : 'var(--color-text-secondary)',
            border: c.is_direct_award ? `1px solid ${RISK_COLORS.high}44` : 'none',
          }}
        >
          {procType}
        </span>
        {/* Single-bid flag if applicable */}
        {c.is_single_bid && (
          <span
            className="flex-shrink-0 font-mono text-[8px] uppercase tracking-[0.08em] px-1 py-0.5 rounded-sm whitespace-nowrap"
            style={{
              background: `${RISK_COLORS.critical}1f`,
              color: RISK_COLORS.critical,
              border: `1px solid ${RISK_COLORS.critical}44`,
            }}
          >
            {lang === 'en' ? 'SB' : 'UP'}
          </span>
        )}
        {/* Title + amount bar — the bar fills the row's dead middle with a
            magnitude channel (width ∝ amount / vendor's largest). Title sits
            on top, sentence-cased from raw COMPRANET caps. */}
        <span className="flex-1 min-w-0 relative flex items-center">
          <span
            aria-hidden="true"
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-sm"
            style={{ width: `${amtFrac * 100}%`, height: 14, background: fill, opacity: 0.12 }}
          />
          <span className="relative truncate" style={{ fontSize: 11, color: 'var(--color-text-secondary)', paddingLeft: 6, paddingRight: 6 }}>
            {title ? shortenContractName(title, 120) : '—'}
          </span>
        </span>
        {/* Risk pill */}
        <span className="flex-shrink-0 text-right font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: fill, width: 36 }}>
          {riskPct ?? '—'}
        </span>
      </button>
    </motion.li>
  )
}

/**
 * Pick the three editorial top contracts: BIGGEST / HIGHEST RISK /
 * MOST RECENT. Disambiguate by falling through to the next candidate
 * when the same contract would be picked twice.
 */
// ────────────────────────────────────────────────────────────────────────────
// Z3Fingerprint — the vendor's pattern at a glance. Three compact bars
// (procedure mix · risk · amount distribution) that turn the stat-line
// numbers into pictures. A ghost/burst vendor (100% direct award, 100%
// high-risk, amounts clustered near a threshold) reads instantly here,
// where a flat contract list hides it.
// ────────────────────────────────────────────────────────────────────────────
function Z3Fingerprint({
  directAwardN,
  hrCount,
  total,
  amounts,
  lang,
}: {
  directAwardN: number
  hrCount: number
  total: number
  amounts: number[]
  lang: 'en' | 'es'
}) {
  if (total === 0) return null
  const daPct = (directAwardN / total) * 100
  const hrPct = (hrCount / total) * 100

  // Amount histogram — LOG-scale buckets between min and max. Contract values
  // are heavily right-skewed (one big award + many small ones); linear bins
  // collapse ~everything into bin 0. Log bins spread the distribution so
  // clustering near a procedure threshold reads as a visible spike.
  const vals = amounts.filter((a) => a > 0)
  const hist = (() => {
    if (vals.length === 0) return { bins: [] as number[], lo: 0, hi: 0, modeBin: -1 }
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const N = 16
    const bins = new Array(N).fill(0)
    const logLo = Math.log10(lo)
    const logHi = Math.log10(hi)
    const span = logHi - logLo || 1
    for (const v of vals) {
      const idx = Math.min(N - 1, Math.max(0, Math.floor(((Math.log10(v) - logLo) / span) * N)))
      bins[idx]++
    }
    // Most-populated bin — used to flag clustering ("X% of contracts near Y").
    let modeBin = 0
    for (let i = 1; i < N; i++) if (bins[i] > bins[modeBin]) modeBin = i
    return { bins, lo, hi, modeBin }
  })()
  const maxBin = Math.max(1, ...hist.bins)
  const modeShare = vals.length > 0 && hist.modeBin >= 0 ? (hist.bins[hist.modeBin] / vals.length) * 100 : 0

  const daColor = daPct >= 75 ? RISK_COLORS.critical : daPct >= 50 ? RISK_COLORS.high : daPct >= 25 ? RISK_COLORS.medium : 'var(--color-text-muted)'
  const hrColor = hrPct >= 75 ? RISK_COLORS.critical : hrPct >= 40 ? RISK_COLORS.high : hrPct >= 25 ? RISK_COLORS.medium : 'var(--color-text-muted)'

  const Bar = ({ label, pct, color, readout }: { label: string; pct: number; color: string; readout: string }) => (
    <div className="flex items-center gap-3">
      <span className="font-mono uppercase flex-shrink-0" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--color-text-muted)', width: 92 }}>
        {label}
      </span>
      <span className="flex-1 relative" style={{ height: 8, background: 'var(--color-border)', borderRadius: 1, overflow: 'hidden' }}>
        <span style={{ position: 'absolute', inset: 0, width: `${Math.min(100, pct)}%`, background: color }} />
      </span>
      <span className="font-mono tabular-nums flex-shrink-0 text-right" style={{ fontSize: 11, fontWeight: 700, color, width: 40 }}>
        {readout}
      </span>
    </div>
  )

  return (
    <div className="pt-1 pb-3">
      <div className="font-mono uppercase mb-2" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--color-text-muted)' }}>
        {lang === 'en' ? 'Fingerprint' : 'Huella'}
      </div>
      <div className="space-y-1.5">
        <Bar
          label={lang === 'en' ? 'Direct award' : 'Adj. directa'}
          pct={daPct}
          color={daColor}
          readout={`${daPct.toFixed(0)}%`}
        />
        <Bar
          label={lang === 'en' ? 'High risk' : 'Alto riesgo'}
          pct={hrPct}
          color={hrColor}
          readout={`${hrPct.toFixed(0)}%`}
        />
        {/* Amount distribution histogram — log-scale, full width below the bars */}
        {hist.bins.length > 0 && (
          <div className="pt-1.5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}>
                {lang === 'en' ? 'Amount distribution · log scale' : 'Distribución de montos · escala log'}
              </span>
              {modeShare >= 30 && (
                <span className="font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
                  {lang === 'en'
                    ? `${modeShare.toFixed(0)}% clustered`
                    : `${modeShare.toFixed(0)}% agrupados`}
                </span>
              )}
            </div>
            <div className="flex items-end gap-px" style={{ height: 30 }}>
              {hist.bins.map((b, i) => {
                const isMode = i === hist.modeBin && b > 0 && modeShare >= 30
                return (
                  <span
                    key={i}
                    className="flex-1"
                    style={{
                      height: `${b > 0 ? Math.max(8, (b / maxBin) * 100) : 0}%`,
                      background: isMode ? RISK_COLORS.high : 'var(--color-text-muted)',
                      opacity: b > 0 ? (isMode ? 0.85 : 0.5) : 0.1,
                      borderRadius: 0.5,
                      minHeight: b > 0 ? 3 : 0,
                    }}
                    title={`${b} ${lang === 'en' ? 'contracts' : 'contratos'}`}
                  />
                )
              })}
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
                {formatCompactMXN(hist.lo)}
              </span>
              <span className="font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
                {formatCompactMXN(hist.hi)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z3MonthlyStrip — month-by-month activity for short-span vendors. When a
// vendor's contracts cram into ≤3 years, the yearly strip degenerates to 2–3
// giant blocks; monthly resolution (24–36 columns) reveals the BURST that
// defines a ghost vendor. Falls back to the caller's caption when dates are
// missing.
// ────────────────────────────────────────────────────────────────────────────
function Z3MonthlyStrip({
  monthly,
  lang,
}: {
  monthly: Array<{ ym: string; label: string; amount: number; count: number; avgRisk: number; isYearStart: boolean; yearLabel: string }>
  lang: 'en' | 'es'
}) {
  // Height tracks CONTRACT COUNT, not peso amount — a burst vendor's signature
  // is volume clustered in time. Amount-scaling lets a single large contract
  // flatten every other month into an invisible sliver (the bug this fixes).
  const maxMonthCount = Math.max(1, ...monthly.map((m) => m.count))
  const activeMonths = monthly.filter((m) => m.count > 0).length
  const peakMonth = monthly.reduce((best, m) => (m.count > best.count ? m : best), monthly[0])
  return (
    <div className="pt-3 pb-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--color-text-muted)' }}>
          {lang === 'en' ? 'Activity by month · contracts' : 'Actividad por mes · contratos'}
        </div>
        {peakMonth && peakMonth.count > 0 && (
          <div className="font-mono tabular-nums" style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
            {lang === 'en'
              ? `peak ${peakMonth.count} · ${activeMonths} active mo.`
              : `pico ${peakMonth.count} · ${activeMonths} meses activos`}
          </div>
        )}
      </div>
      <div className="relative" style={{ height: 72 }}>
        <div className="absolute left-0 right-0 flex items-end gap-px" style={{ top: 0, bottom: 14 }}>
          {monthly.map((m) => {
            const h = m.count > 0 ? Math.max(10, (m.count / maxMonthCount) * 100) : 0
            const cap =
              m.avgRisk >= 0.60 ? RISK_COLORS.critical
              : m.avgRisk >= 0.40 ? RISK_COLORS.high
              : m.avgRisk >= 0.25 ? RISK_COLORS.medium
              : 'var(--color-text-muted)'
            // Fill tracks risk too — high-risk burst months read red, not grey.
            const fill = m.avgRisk >= 0.40 ? cap : 'var(--color-text-muted)'
            const fillOpacity = m.avgRisk >= 0.40 ? 0.32 : 0.28
            return (
              <span
                key={m.ym}
                className="flex-1 flex flex-col justify-end items-center h-full"
                title={m.count > 0
                  ? `${m.label} · ${m.count} ${lang === 'en' ? 'contracts' : 'contratos'} · ${formatCompactMXN(m.amount)}`
                  : `${m.label} · ${lang === 'en' ? 'no contracts' : 'sin contratos'}`}
              >
                {m.count > 0 ? (
                  <span className="w-full" style={{ height: `${h}%`, background: fill, opacity: fillOpacity, borderTop: `2px solid ${cap}`, minHeight: 5 }} />
                ) : (
                  <span className="w-full" style={{ height: 1, background: 'var(--color-border)' }} />
                )}
              </span>
            )
          })}
        </div>
        {/* Year ticks */}
        <div className="absolute bottom-0 left-0 right-0 flex" style={{ height: 12 }}>
          {monthly.map((m) => (
            <span key={m.ym} className="flex-1 font-mono" style={{ fontSize: 8, color: 'var(--color-text-muted)', textAlign: 'left' }}>
              {m.isYearStart ? m.yearLabel : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Clamp a COMPRANET procedure_type to a short chip label. The raw field is
 * often a full uppercase sentence ("ADJUDICACIÓN DIRECTA POR ADJUDICACIÓN A
 * PROVEEDOR CON CONTRATO VIGENTE, BAJO LAS MISMAS CONDICIONES") — too long
 * for a chip. Map by keyword to a canonical 1–2 word label.
 */
function shortProcType(raw: string | null | undefined, isDirectAward: boolean, lang: 'en' | 'es'): string {
  const s = (raw ?? '').toLowerCase()
  const direct = lang === 'en' ? 'DIRECT' : 'ADJ. DIRECTA'
  const open = lang === 'en' ? 'OPEN BID' : 'LICITACIÓN'
  const invite = lang === 'en' ? 'INVITATION' : 'INVITACIÓN'
  const framework = lang === 'en' ? 'FRAMEWORK' : 'CONVENIO MARCO'
  if (!s) return isDirectAward ? direct : open
  if (s.includes('marco')) return framework
  if (s.includes('invitaci')) return invite
  if (s.includes('adjudicaci') || s.includes('direct')) return direct
  if (s.includes('licitaci') || s.includes('open') || s.includes('bid')) return open
  // Unknown verbose value — fall back to the direct/open flag, not the blob.
  return isDirectAward ? direct : open
}

function pickZ3Top3(contracts: ContractListItem[]): Array<{ contract: ContractListItem; pick: 'biggest' | 'risk' | 'recent' }> {
  if (contracts.length === 0) return []
  const used = new Set<number>()
  const result: Array<{ contract: ContractListItem; pick: 'biggest' | 'risk' | 'recent' }> = []

  const byAmount = [...contracts].sort((a, b) => (Number(b.amount_mxn) || 0) - (Number(a.amount_mxn) || 0))
  const byRisk = [...contracts].sort((a, b) => (Number(b.risk_score) || 0) - (Number(a.risk_score) || 0))
  const byRecent = [...contracts].sort((a, b) => (Number(b.contract_year) || 0) - (Number(a.contract_year) || 0))

  const take = (list: ContractListItem[], pick: 'biggest' | 'risk' | 'recent') => {
    for (const c of list) {
      if (!used.has(c.id)) { used.add(c.id); result.push({ contract: c, pick }); return }
    }
  }
  take(byAmount, 'biggest')
  take(byRisk, 'risk')
  take(byRecent, 'recent')
  return result
}

/**
 * Pull-line picks the strongest narrative frame from vendor data.
 *   GT-pattern frames first (would need GT flag; deferred to v2)
 *   Sexenio concentration > 50% → administration frame
 *   Burst year > 40% → year frame
 *   HR% > 80% → procurement-pathology frame
 *   Otherwise standard summary
 */
function computeZ3PullLine({
  editorialName,
  institutionName,
  totalContractSpend,
  contractCount,
  hrPct,
  daPct,
  byYear,
  lang,
}: {
  editorialName: string
  institutionName: string | null
  totalContractSpend: number
  contractCount: number
  hrPct: number
  daPct: number
  byYear: Map<number, { count: number; amount: number; riskSum: number; riskN: number }>
  lang: 'en' | 'es'
}): React.ReactNode {
  // Sexenio breakdown
  const sexenioSpend: Record<string, number> = {}
  byYear.forEach((v, yr) => {
    const admin = getAdministrationByYear(yr)
    if (!admin) return
    sexenioSpend[admin.short] = (sexenioSpend[admin.short] ?? 0) + v.amount
  })
  let topSexenio: [string, number] | null = null
  for (const [key, val] of Object.entries(sexenioSpend)) {
    if (!topSexenio || val > topSexenio[1]) topSexenio = [key, val]
  }
  const topSexenioPct = topSexenio && totalContractSpend > 0 ? (topSexenio[1] / totalContractSpend) * 100 : 0

  // Burst year
  let burstYear: [number, number] | null = null
  byYear.forEach((v, yr) => {
    if (!burstYear || v.amount > burstYear[1]) burstYear = [yr, v.amount]
  })
  const burstYearPct = burstYear && totalContractSpend > 0 ? ((burstYear as [number, number])[1] / totalContractSpend) * 100 : 0

  const inst = institutionName ? toEditorialCase(institutionName) : null

  if (topSexenioPct >= 50 && topSexenio) {
    return lang === 'en'
      ? <><strong className="font-semibold text-text-primary">{editorialName}</strong> collected <strong className="font-semibold">{formatCompactMXN(totalContractSpend)}</strong>{inst ? <> from {inst}</> : ''} — <strong className="font-semibold">{topSexenioPct.toFixed(0)}%</strong> arrived under {topSexenio[0]}.</>
      : <><strong className="font-semibold text-text-primary">{editorialName}</strong> recibió <strong className="font-semibold">{formatCompactMXN(totalContractSpend)}</strong>{inst ? <> de {inst}</> : ''} — el <strong className="font-semibold">{topSexenioPct.toFixed(0)}%</strong> llegó bajo {topSexenio[0]}.</>
  }
  if (burstYearPct >= 40 && burstYear) {
    return lang === 'en'
      ? <><strong className="font-semibold">{burstYearPct.toFixed(0)}%</strong> of {editorialName}'s lifetime revenue arrived in <strong className="font-semibold text-text-primary">{(burstYear as [number, number])[0]}</strong> alone.</>
      : <>El <strong className="font-semibold">{burstYearPct.toFixed(0)}%</strong> de los ingresos de {editorialName} llegó en <strong className="font-semibold text-text-primary">{(burstYear as [number, number])[0]}</strong> solamente.</>
  }
  if (hrPct >= 80) {
    return lang === 'en'
      ? <><strong className="font-semibold text-text-primary">{editorialName}</strong> holds {formatNumber(contractCount)} contracts worth <strong className="font-semibold">{formatCompactMXN(totalContractSpend)}</strong> — <strong className="font-semibold">{hrPct.toFixed(0)}% flagged</strong> high or critical, <strong className="font-semibold">{daPct.toFixed(0)}% direct-award</strong>.</>
      : <><strong className="font-semibold text-text-primary">{editorialName}</strong> tiene {formatNumber(contractCount)} contratos por <strong className="font-semibold">{formatCompactMXN(totalContractSpend)}</strong> — <strong className="font-semibold">{hrPct.toFixed(0)}% marcados</strong> alto o crítico, <strong className="font-semibold">{daPct.toFixed(0)}% adj. directa</strong>.</>
  }
  // Standard summary
  return lang === 'en'
    ? <><strong className="font-semibold text-text-primary">{editorialName}</strong> holds {formatNumber(contractCount)} contracts worth <strong className="font-semibold">{formatCompactMXN(totalContractSpend)}</strong>{inst ? <> with {inst}</> : ''}.</>
    : <><strong className="font-semibold text-text-primary">{editorialName}</strong> tiene {formatNumber(contractCount)} contratos por <strong className="font-semibold">{formatCompactMXN(totalContractSpend)}</strong>{inst ? <> con {inst}</> : ''}.</>
}

// ────────────────────────────────────────────────────────────────────────────
// Z4 — Contract drawer
// Slides in from the right at 440px when focus.kind === 'contract'. The
// Z3 register stays visible behind it (compressed on the left) so the
// reader never loses the constellation of sibling contracts.
// Inline preview, not a full page — "Open full contract page ↗" links
// to the canonical /contracts/:id dossier for the deep dive.
// ────────────────────────────────────────────────────────────────────────────

function Z4Drawer({
  contractId,
  lang,
  dispatch,
  sectorAccent,
}: {
  contractId: number
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
  sectorAccent: string
}) {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion() ?? false

  // Esc closes the drawer — pops back to Z3 vendor focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch({ type: 'pop-to-level', level: 3 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  const { data: contract, isLoading } = useQuery({
    queryKey: ['explore', 'z4-contract', contractId],
    queryFn: async () => {
      const { contractApi } = await import('@/api/client')
      return contractApi.getById(contractId)
    },
    enabled: contractId > 0,
    staleTime: 10 * 60 * 1000,
  })

  const { data: explanation } = useQuery({
    queryKey: ['explore', 'z4-explain', contractId],
    queryFn: async () => {
      const { contractApi } = await import('@/api/client')
      return contractApi.getRiskExplanation(contractId)
    },
    enabled: contractId > 0,
    staleTime: 10 * 60 * 1000,
  })

  const score = Number(contract?.risk_score ?? 0)
  const level = score > 0 ? getRiskLevelFromScore(score) : 'low'
  const fill = RISK_COLORS[level]
  const riskPct = score > 0 ? Math.round(score * 100) : null

  // Top-3 SHAP contributors — sorted by absolute contribution descending,
  // then filtered to positive (risk-increasing) and negative (protective).
  const topContributors = (() => {
    const features = explanation?.features ?? []
    return [...features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 4)
  })()

  // Signals row — high-signal procurement flags
  const signals: Array<{ label: string; color: string; tooltip: string }> = []
  if (contract?.is_direct_award) {
    signals.push({
      label: lang === 'en' ? 'DIRECT AWARD' : 'ADJ. DIRECTA',
      color: RISK_COLORS.high,
      tooltip: lang === 'en' ? 'Awarded without an open bid' : 'Otorgado sin licitación pública',
    })
  }
  if (contract?.is_single_bid) {
    signals.push({
      label: lang === 'en' ? 'SINGLE BID' : 'ÚNICO POSTOR',
      color: RISK_COLORS.critical,
      tooltip: lang === 'en' ? 'Competitive procedure with only one bidder' : 'Procedimiento competitivo con un solo postor',
    })
  }
  if (contract && Number(contract.amount_mxn) > 500_000_000) {
    signals.push({
      label: lang === 'en' ? 'LARGE' : 'ALTO MONTO',
      color: RISK_COLORS.medium,
      tooltip: lang === 'en' ? 'Contract value exceeds 500M MXN' : 'Valor del contrato supera 500M MXN',
    })
  }
  if (contract?.is_year_end) {
    signals.push({
      label: lang === 'en' ? 'YEAR-END' : 'FIN DE AÑO',
      color: RISK_COLORS.medium,
      tooltip: lang === 'en' ? 'Awarded in November or December' : 'Otorgado en noviembre o diciembre',
    })
  }
  if (contract?.is_threshold_gaming) {
    signals.push({
      label: lang === 'en' ? 'THRESHOLD GAMING' : 'JUEGO DE UMBRAL',
      color: RISK_COLORS.critical,
      tooltip: lang === 'en' ? 'Amount suspiciously close to procedure threshold' : 'Monto cerca del umbral del procedimiento',
    })
  }
  if (contract?.is_framework) {
    signals.push({
      label: lang === 'en' ? 'FRAMEWORK' : 'CONVENIO MARCO',
      color: 'var(--color-text-secondary)',
      tooltip: lang === 'en' ? 'Framework / open-order contract' : 'Convenio marco / abierto',
    })
  }

  return (
    <>
      {/* Dismiss-on-outside-click overlay — invisible scrim, clicking it
          pops to Z3. Not a darkened backdrop because we want Z3 fully
          visible behind the drawer. */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-[6] cursor-default"
        style={{ background: 'transparent' }}
        onClick={() => dispatch({ type: 'pop-to-level', level: 3 })}
        aria-label={lang === 'en' ? 'Close contract drawer' : 'Cerrar panel del contrato'}
      />
      {/* The drawer itself */}
      <motion.aside
        initial={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
        animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: Z_DRAWER_S, ease: Z_EASE }}
        className="absolute right-0 z-[7] flex flex-col overflow-hidden"
        style={{
          top: '48px',
          bottom: 0,
          width: 'min(440px, 100vw)',
          background: 'var(--color-background)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.18)',
        }}
        role="dialog"
        aria-modal="false"
        aria-label={lang === 'en' ? 'Contract dossier preview' : 'Vista previa del contrato'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top sector-color rail — visual continuity with Z1/Z2/Z3 */}
        <div style={{ height: 6, background: sectorAccent, flexShrink: 0 }} aria-hidden="true" />

        {/* Close button */}
        <div className="px-4 sm:px-5 pt-3 flex items-center justify-between flex-shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-accent)' }}>
            {lang === 'en' ? '§ EL CONTRATO · CONTRACT DEEP' : '§ EL CONTRATO · CONTRATO'}
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'pop-to-level', level: 3 })}
            className="font-mono text-[14px] leading-none px-1.5 py-0.5 rounded-sm cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none' }}
            aria-label={lang === 'en' ? 'Close' : 'Cerrar'}
            title={lang === 'en' ? 'Esc to close' : 'Esc para cerrar'}
          >
            ×
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'en' ? 'loading contract...' : 'cargando contrato...'}
          </div>
        )}

        {/* Body */}
        {!isLoading && contract && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-4">
            {/* Contract number + amount headline */}
            <div className="pt-2 pb-3">
              {contract.contract_number && (
                <div
                  className="font-mono text-[10px] tabular-nums mb-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  #{contract.contract_number}
                </div>
              )}
              <div
                className="font-serif tabular-nums leading-tight"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 28,
                  fontWeight: 800,
                  fontStyle: 'italic',
                  color: fill,
                  letterSpacing: '-0.015em',
                }}
              >
                {formatCompactMXN(Number(contract.amount_mxn ?? 0))}
              </div>
              <div className="font-mono text-[10px] tabular-nums mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                ≈ {formatCompactUSD(Number(contract.amount_mxn ?? 0))} · {contract.contract_year ?? '—'}
              </div>
            </div>

            {/* Description / title — COMPRANET ships these ALL-CAPS. Run
                through shortenContractName (the canonical sentence-case +
                institution-abbrev treatment used across the app) so the
                drawer reads as editorial prose, not a shouting wall of caps.
                Upright (not italic): 280 chars of italic serif is too much —
                italic is for short pulls; the left-rule carries the quote feel. */}
            {(contract.description ?? contract.title) && (
              <p
                className="leading-snug"
                style={{
                  fontFamily: "'Source Serif Pro', Georgia, serif",
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  borderLeft: `2px solid ${sectorAccent}`,
                  paddingLeft: 10,
                  marginBottom: 16,
                }}
              >
                {shortenContractName((contract.description ?? contract.title) ?? '', 280)}
              </p>
            )}

            {/* Parties */}
            <div className="pb-4">
              <div
                className="font-mono text-[9px] uppercase tracking-[0.14em] mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {lang === 'en' ? 'Parties' : 'Partes'}
              </div>
              <div className="space-y-2">
                {contract.vendor_id && contract.vendor_name && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'drill-into-vendor', vendorId: contract.vendor_id!, vendorName: contract.vendor_name! })}
                    className="w-full text-left flex items-start gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)', width: 72 }}>
                      {lang === 'en' ? 'Vendor' : 'Proveedor'}
                    </span>
                    <span className="flex-1 text-[12px] leading-snug" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                      {toEditorialCase(formatVendorName(contract.vendor_name, 200))}
                    </span>
                  </button>
                )}
                {contract.institution_id && contract.institution_name && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'drill-into-institution', institutionId: contract.institution_id!, institutionName: contract.institution_name! })}
                    className="w-full text-left flex items-start gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)', width: 72 }}>
                      {lang === 'en' ? 'Institution' : 'Institución'}
                    </span>
                    <span className="flex-1 text-[12px] leading-snug" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                      {toEditorialCase(contract.institution_name)}
                    </span>
                  </button>
                )}
                {contract.sector_name && (
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)', width: 72 }}>
                      {lang === 'en' ? 'Sector' : 'Sector'}
                    </span>
                    <span className="flex-1 text-[12px] leading-snug" style={{ color: 'var(--color-text-secondary)' }}>
                      {contract.sector_name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Signals row */}
            {signals.length > 0 && (
              <div className="pb-4">
                <div
                  className="font-mono text-[9px] uppercase tracking-[0.14em] mb-2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {lang === 'en' ? 'Procurement signals' : 'Señales de contratación'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {signals.map((s, i) => (
                    <span
                      key={i}
                      className="font-mono text-[9px] uppercase tracking-[0.10em] px-1.5 py-0.5 rounded-sm"
                      style={{
                        background: `${s.color}1f`,
                        color: s.color,
                        border: `1px solid ${s.color}44`,
                        fontWeight: 700,
                      }}
                      title={s.tooltip}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Risk verdict */}
            <div className="pb-4">
              <div
                className="font-mono text-[9px] uppercase tracking-[0.14em] mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {lang === 'en' ? 'Risk verdict' : 'Veredicto de riesgo'}
              </div>
              {riskPct == null ? (
                <div className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'en' ? 'Not scored' : 'Sin puntuación'}
                </div>
              ) : (
                <div className="flex items-baseline gap-3">
                  <span
                    className="font-serif tabular-nums"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 36,
                      fontWeight: 800,
                      color: fill,
                      lineHeight: 1,
                    }}
                  >
                    {riskPct}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    / 100
                  </span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm"
                    style={{ background: `${fill}1f`, color: fill, fontWeight: 700, border: `1px solid ${fill}44` }}
                  >
                    {level}
                  </span>
                </div>
              )}
              {/* Risk bar */}
              {riskPct != null && (
                <div
                  className="relative mt-2 rounded-sm overflow-hidden"
                  style={{ height: 6, background: 'var(--color-background-elevated)' }}
                  aria-hidden="true"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm"
                    style={{ width: `${Math.min(100, riskPct)}%`, background: fill, opacity: 0.92 }}
                  />
                  {[25, 40, 60].map((t) => (
                    <span
                      key={t}
                      className="absolute inset-y-0 w-px"
                      style={{ left: `${t}%`, background: 'rgba(0,0,0,0.10)' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Why the model flagged it — SHAP contributors */}
            {explanation?.explanation_available && topContributors.length > 0 && (
              <div className="pb-4">
                <div
                  className="font-mono text-[9px] uppercase tracking-[0.14em] mb-2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {lang === 'en' ? 'Why the model flagged it' : 'Por qué el modelo lo marcó'}
                </div>
                <ul className="space-y-1.5">
                  {topContributors.map((f, i) => {
                    const isPositive = f.contribution > 0
                    const factorColor = isPositive ? fill : 'var(--color-text-muted)'
                    const sign = isPositive ? '+' : ''
                    return (
                      <li key={i} className="flex items-baseline gap-2">
                        <span
                          aria-hidden="true"
                          className="font-mono"
                          style={{ fontSize: 10, color: factorColor, fontWeight: 700 }}
                        >
                          {isPositive ? '▲' : '▽'}
                        </span>
                        <span className="flex-1 text-[12px] leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                          {f.label}
                        </span>
                        <span
                          className="font-mono tabular-nums text-right"
                          style={{ fontSize: 10, color: factorColor, fontWeight: 700, minWidth: 48 }}
                        >
                          {sign}{f.contribution.toFixed(2)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {explanation.model_version && (
                  <div className="font-mono text-[8px] mt-2" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    {lang === 'en' ? 'model' : 'modelo'} {explanation.model_version}
                  </div>
                )}
              </div>
            )}

            {/* Procedure */}
            <div className="pb-4">
              <div
                className="font-mono text-[9px] uppercase tracking-[0.14em] mb-2"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {lang === 'en' ? 'Procedure' : 'Procedimiento'}
              </div>
              <dl className="space-y-1.5">
                {contract.procedure_number && (
                  <Z4ProcedureRow lang={lang} label={lang === 'en' ? 'Number' : 'Número'} value={contract.procedure_number} />
                )}
                {(contract.procedure_type_normalized ?? contract.procedure_type) && (
                  <Z4ProcedureRow lang={lang} label={lang === 'en' ? 'Type' : 'Tipo'} value={contract.procedure_type_normalized ?? contract.procedure_type ?? '—'} />
                )}
                {contract.award_date && (
                  <Z4ProcedureRow lang={lang} label={lang === 'en' ? 'Awarded' : 'Otorgado'} value={contract.award_date} mono />
                )}
                {contract.contract_date && !contract.award_date && (
                  <Z4ProcedureRow lang={lang} label={lang === 'en' ? 'Contract date' : 'Fecha'} value={contract.contract_date} mono />
                )}
                {contract.publication_date && (
                  <Z4ProcedureRow lang={lang} label={lang === 'en' ? 'Published' : 'Publicado'} value={contract.publication_date} mono />
                )}
                {contract.data_quality_grade && (
                  <Z4ProcedureRow lang={lang} label={lang === 'en' ? 'Data quality' : 'Calidad de datos'} value={contract.data_quality_grade} />
                )}
              </dl>
              {contract.url && (
                <a
                  href={contract.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 font-mono text-[10px] uppercase tracking-[0.12em] hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {lang === 'en' ? 'Source document' : 'Documento fuente'} ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer — outbound to canonical contract page */}
        {!isLoading && contract && (
          <div
            className="px-4 sm:px-5 py-3 flex-shrink-0 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-background)' }}
          >
            <span className="font-mono text-[9px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
              #{contract.id}
            </span>
            <button
              type="button"
              onClick={() => navigate(`/contracts/${contract.id}`)}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {lang === 'en' ? 'Open full contract page' : 'Ver ficha completa'} ↗
            </button>
          </div>
        )}
      </motion.aside>
    </>
  )
}

/** Procedure-row helper used inside Z4Drawer. Label + value pair. */
function Z4ProcedureRow({ label, value, mono = false }: { lang: 'en' | 'es'; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <dt
        className="font-mono text-[8px] uppercase tracking-[0.12em] flex-shrink-0 mt-0.5"
        style={{ color: 'var(--color-text-muted)', width: 90 }}
      >
        {label}
      </dt>
      <dd
        className="flex-1 text-[11px] leading-snug"
        style={{
          color: 'var(--color-text-primary)',
          fontFamily: mono ? 'var(--font-family-mono, monospace)' : undefined,
          fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        }}
      >
        {value}
      </dd>
    </div>
  )
}
