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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { atlasApi, sectorApi, type SpatialInstitution } from '@/api/client'
import {
  RISK_COLORS,
  getRiskLevelFromScore,
  getSectorName,
  SECTORS,
  SECTOR_COLORS,
} from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import {
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
const PAD = 24

// ────────────────────────────────────────────────────────────────────────────
// Z0 sector layout — 12 sectors arranged in a 4×3 grid then jittered
// ────────────────────────────────────────────────────────────────────────────

interface SectorBody {
  id: number
  code: string
  name: string
  fx: number
  fy: number
  color: string
}

function z0SectorBodies(lang: 'en' | 'es'): SectorBody[] {
  // Manual placement — same fractions as the legacy ConcentrationConstellation
  // sectors lens, scaled to the wider 1200×720 canvas.
  const layout: Record<string, { fx: number; fy: number }> = {
    salud:           { fx: 0.18, fy: 0.22 },
    educacion:       { fx: 0.40, fy: 0.22 },
    infraestructura: { fx: 0.62, fy: 0.22 },
    energia:         { fx: 0.84, fy: 0.22 },
    defensa:         { fx: 0.18, fy: 0.50 },
    tecnologia:      { fx: 0.40, fy: 0.50 },
    hacienda:        { fx: 0.62, fy: 0.50 },
    gobernacion:     { fx: 0.84, fy: 0.50 },
    agricultura:     { fx: 0.18, fy: 0.78 },
    ambiente:        { fx: 0.40, fy: 0.78 },
    trabajo:         { fx: 0.62, fy: 0.78 },
    otros:           { fx: 0.84, fy: 0.78 },
  }
  return SECTORS.map((s) => ({
    id: s.id,
    code: s.code,
    name: getSectorName(s.code, lang),
    fx: layout[s.code]?.fx ?? 0.5,
    fy: layout[s.code]?.fy ?? 0.5,
    color: SECTOR_COLORS[s.code] ?? '#64748b',
  }))
}

// ────────────────────────────────────────────────────────────────────────────
// BackgroundStars — decorative star field for Z0 atmosphere.
// Deterministic Halton-derived scatter so the layout is stable across renders.
// Pure decoration: pointer-events: none, no interaction, no labels.
// ────────────────────────────────────────────────────────────────────────────

const STAR_COUNT = 140

function haltonSeq(index: number, base: number): number {
  let f = 1
  let r = 0
  let i = index
  while (i > 0) {
    f /= base
    r += f * (i % base)
    i = Math.floor(i / base)
  }
  return r
}

const BACKGROUND_STARS = Array.from({ length: STAR_COUNT }, (_, i) => {
  const fx = haltonSeq(i + 1, 2)
  const fy = haltonSeq(i + 1, 3)
  // Vary radius and opacity by index — deterministic but visually organic
  const seed = ((i * 9301 + 49297) % 233280) / 233280
  const r = 0.4 + seed * 1.2 // 0.4 → 1.6 px
  const opacity = 0.10 + seed * 0.35 // 0.10 → 0.45
  return {
    cx: fx * SVG_W,
    cy: fy * SVG_H,
    r,
    opacity,
  }
})

function BackgroundStars() {
  return (
    <g style={{ pointerEvents: 'none' }} aria-hidden="true">
      {BACKGROUND_STARS.map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill="var(--color-text-muted)"
          opacity={s.opacity}
        />
      ))}
    </g>
  )
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

  const onPointerDown = useCallback((e: React.PointerEvent) => {
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

  const onPointerMove = useCallback((e: React.PointerEvent) => {
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

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    const wrapper = wrapperRef.current
    if (wrapper) wrapper.releasePointerCapture?.(e.pointerId)

    if (pointersRef.current.size < 2) {
      pinchRef.current = null
    }
    if (pointersRef.current.size === 0) {
      dragRef.current = null
      setDragging(false)
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
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <g
          transform={effectiveTransform}
          style={{
            transition: flyingIn ? 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            transformOrigin: '0 0',
          }}
        >
          <AnimatePresence mode="wait">
            {focus.kind === 'system' && <Z0Layer key="z0" lang={lang} dispatch={dispatch} triggerDrill={triggerCameraDrill} />}
            {focus.kind === 'sector' && (
              <Z1Layer
                key={`z1-${focus.sectorId}`}
                sectorId={focus.sectorId}
                sectorCode={focus.sectorCode}
                lang={lang}
                dispatch={dispatch}
                triggerDrill={triggerCameraDrill}
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
              />
            )}
            {focus.kind === 'vendor' && (
              <Z3Layer
                key={`z3-${focus.vendorId}`}
                vendorId={focus.vendorId}
                vendorName={focus.vendorName}
                lang={lang}
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
                />
              )
            })()}
          </AnimatePresence>
        </g>
      </svg>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z0 — system view (12 sectors)
// ────────────────────────────────────────────────────────────────────────────

function Z0Layer({
  lang,
  dispatch,
  triggerDrill,
}: {
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
  triggerDrill: (bodyX: number, bodyY: number, drill: () => void) => void
}) {
  // Phase 2.5 (May 9): size sector bodies by total spend so the system
  // view encodes scale, not just position. Falls back to a uniform layout
  // if the API call fails (cached for 30 minutes — sectors are slow-moving).
  const { data: sectorStats } = useQuery({
    queryKey: ['explore', 'z0-sector-stats'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 30 * 60 * 1000,
  })
  const sizeByCode = useMemo(() => {
    if (!sectorStats?.data) return null
    const max = Math.max(...sectorStats.data.map((s) => s.total_value_mxn || 0), 1)
    const map = new Map<string, number>()
    for (const s of sectorStats.data) {
      // sqrt scale so the visual difference is perceptible without
      // making one sector dwarf the rest.
      map.set(s.sector_code, Math.sqrt((s.total_value_mxn || 0) / max))
    }
    return map
  }, [sectorStats])
  const bodies = useMemo(() => z0SectorBodies(lang), [lang])
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Background particles — decorative star field for atmosphere.
          Pure decoration, deterministic, no interaction. */}
      <BackgroundStars />

      {/* Eyebrow */}
      <text
        x={PAD}
        y={PAD}
        fontSize={11}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight={700}
        letterSpacing={1.4}
        fill="var(--color-text-muted)"
      >
        {(lang === 'en' ? 'Z0 · SYSTEM · 12 SECTORS' : 'Z0 · SISTEMA · 12 SECTORES')}
      </text>
      <text
        x={PAD}
        y={SVG_H - PAD * 0.5}
        fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
        fill="var(--color-text-muted)"
      >
        {lang === 'en'
          ? 'click a sector to drill in · drag to pan · wheel to zoom'
          : 'clic en un sector para profundizar · arrastra · rueda para acercar'}
      </text>

      {bodies.map((b) => {
        const cx = PAD + b.fx * (SVG_W - PAD * 2)
        const cy = PAD + b.fy * (SVG_H - PAD * 2)
        // Body radius blends a uniform baseline (so even small sectors
        // are clickable) with a sqrt(spend) scaling factor when stats are
        // loaded. Otherwise every body would be 32px and the system view
        // would be uniform — dull and uninformative.
        const sizeFactor = sizeByCode?.get(b.code) ?? null
        const r = sizeFactor != null ? 22 + sizeFactor * 28 : 32
        return (
          <SectorBodyVisual
            key={b.code}
            cx={cx}
            cy={cy}
            r={r}
            color={b.color}
            label={b.name}
            onClick={() =>
              triggerDrill(cx, cy, () =>
                dispatch({ type: 'drill-into-sector', sectorId: b.id, sectorCode: b.code }),
              )
            }
            onHover={(hovering) =>
              dispatch({ type: 'set-hover', hover: hovering ? { kind: 'sector', id: b.id } : null })
            }
          />
        )
      })}
    </motion.g>
  )
}

function SectorBodyVisual({
  cx,
  cy,
  r,
  color,
  label,
  onClick,
  onHover,
}: {
  cx: number
  cy: number
  r: number
  color: string
  label: string
  onClick: () => void
  onHover: (hovering: boolean) => void
}) {
  const [hovered, setHovered] = useState(false)
  const rEffective = hovered ? r + 6 : r
  // Adaptive font: smaller bodies get smaller labels so the text doesn't
  // overflow the circle on Energy / Otros etc.
  const fontSize = Math.max(10, Math.min(15, Math.round(r / 2.6)))
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick} onMouseEnter={() => { setHovered(true); onHover(true) }} onMouseLeave={() => { setHovered(false); onHover(false) }}>
      {/* Halo */}
      {hovered && <circle cx={cx} cy={cy} r={rEffective + 8} fill={color} fillOpacity={0.15} />}
      <circle cx={cx} cy={cy} r={rEffective} fill={color} fillOpacity={hovered ? 0.95 : 0.85} stroke="var(--color-background)" strokeWidth={2} />
      <text
        x={cx}
        y={cy + Math.round(fontSize * 0.36)}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight={700}
        fill="white"
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </g>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z1 — sector view (institutions inside one sector)
// ────────────────────────────────────────────────────────────────────────────

function Z1Layer({
  sectorId,
  sectorCode,
  lang,
  dispatch,
  triggerDrill,
}: {
  sectorId: number
  sectorCode: string
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
  triggerDrill: (bodyX: number, bodyY: number, drill: () => void) => void
}) {
  // ⚠️ Hooks must come before any early return — moved useExploreState here
  // (was below the loading/error returns, which violated rules-of-hooks and
  // would throw "Rendered more hooks than during the previous render" when
  // the query transitioned from loading → ready).
  const exploreState = useExploreState()
  const riskFloor = exploreState.riskFloor

  const { data, isLoading, isError } = useQuery({
    queryKey: ['explore', 'z1', sectorId],
    queryFn: () => atlasApi.getSectorInstitutionsSpatial({ sectorId, limit: 60 }),
    enabled: sectorId > 0 && sectorId <= 12,
    staleTime: 10 * 60 * 1000,
  })

  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'

  if (isLoading) {
    return (
      <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fontSize={14} fill="var(--color-text-muted)" fontFamily="var(--font-family-mono, monospace)">
        {lang === 'en' ? 'Loading sector…' : 'Cargando sector…'}
      </text>
    )
  }
  if (isError || !data || data.institutions.length === 0) {
    return (
      <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fontSize={14} fill="var(--color-text-muted)" fontFamily="var(--font-family-mono, monospace)">
        {lang === 'en' ? 'No institution data.' : 'Sin datos.'}
      </text>
    )
  }

  // Phase 4: filter institutions by risk floor — drops anything below the
  // chosen threshold so the user can focus on high-risk planets only.
  const passesFloor = (risk: number) => {
    if (riskFloor === 'all') return true
    if (riskFloor === 'medium') return risk >= 0.25
    if (riskFloor === 'high') return risk >= 0.40
    if (riskFloor === 'critical') return risk >= 0.60
    return true
  }
  const filteredInstitutions = data.institutions.filter((i) => passesFloor(i.risk))

  const xOf = (fx: number) => PAD + fx * (SVG_W - PAD * 2)
  const yOf = (fy: number) => PAD + fy * (SVG_H - PAD * 2)
  const rOf = (size: number) => 8 + size * 32 // 8..40 px in viewBox units

  // Sector-tinted radial gradient — reinforces sector identity by tinting
  // the canvas backdrop with the sector's accent. Each Z1 instance gets its
  // own gradient ID so multiple cached layers don't share a defs node.
  const gradId = `z1-bg-${sectorCode}`

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.08 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={sectorAccent} stopOpacity={0.10} />
          <stop offset="60%" stopColor={sectorAccent} stopOpacity={0.04} />
          <stop offset="100%" stopColor={sectorAccent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={`url(#${gradId})`} pointerEvents="none" />

      {/* Eyebrow */}
      <text
        x={PAD}
        y={PAD}
        fontSize={11}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight={700}
        letterSpacing={1.4}
        fill={sectorAccent}
      >
        {`Z1 · ${(lang === 'en' ? data.sector_name_en : data.sector_name_es).toUpperCase()} · ${filteredInstitutions.length}/${data.total} ${lang === 'en' ? 'INSTITUTIONS' : 'INSTITUCIONES'}`}
      </text>
      <text
        x={PAD}
        y={SVG_H - PAD * 0.5}
        fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
        fill="var(--color-text-muted)"
      >
        {lang === 'en' ? 'click an institution · esc to zoom out' : 'clic en una institución · esc para alejar'}
      </text>

      {filteredInstitutions.map((inst) => {
        const cx = xOf(inst.fx)
        const cy = yOf(inst.fy)
        return (
          <InstitutionBodyVisual
            key={inst.institution_id}
            inst={inst}
            cx={cx}
            cy={cy}
            r={rOf(inst.size)}
            showLabel={inst.size > 0.35}
            onClick={() =>
              triggerDrill(cx, cy, () =>
                dispatch({
                  type: 'drill-into-institution',
                  institutionId: inst.institution_id,
                  institutionName: inst.name,
                }),
              )
            }
            onHover={(hovering) =>
              dispatch({
                type: 'set-hover',
                hover: hovering ? { kind: 'institution', id: inst.institution_id } : null,
              })
            }
          />
        )
      })}
    </motion.g>
  )
}

function InstitutionBodyVisual({
  inst,
  cx,
  cy,
  r,
  showLabel,
  onClick,
  onHover,
}: {
  inst: SpatialInstitution
  cx: number
  cy: number
  r: number
  showLabel: boolean
  onClick: () => void
  onHover: (hovering: boolean) => void
}) {
  const [hovered, setHovered] = useState(false)
  const level = getRiskLevelFromScore(inst.risk)
  const fill = RISK_COLORS[level]
  const rEffective = hovered ? r * 1.15 : r
  // Native browser tooltip — gives the full institution name + key stats
  // even when the on-canvas label is hidden (showLabel=false for small bodies).
  const tooltip = `${inst.name}\n${formatNumber(inst.total_contracts)} contracts · ${formatCompactMXN(inst.total_amount_mxn)}\n${level.toUpperCase()} · ${(inst.risk * 100).toFixed(1)}%`
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick} onMouseEnter={() => { setHovered(true); onHover(true) }} onMouseLeave={() => { setHovered(false); onHover(false) }}>
      <title>{tooltip}</title>
      {hovered && <circle cx={cx} cy={cy} r={rEffective + 6} fill={fill} fillOpacity={0.18} />}
      <circle cx={cx} cy={cy} r={rEffective} fill={fill} fillOpacity={0.92} stroke="var(--color-background)" strokeWidth={1.5} />
      {showLabel && (
        <text
          x={cx}
          y={cy - rEffective - 6}
          textAnchor="middle"
          fontSize={inst.size > 0.7 ? 13 : 11}
          fontFamily="var(--font-family-mono, monospace)"
          fontWeight={700}
          fill="var(--color-text-primary)"
          style={{ pointerEvents: 'none' }}
        >
          {shortLabel(inst.name)}
        </text>
      )}
      {showLabel && inst.size > 0.6 && (
        <text
          x={cx}
          y={cy + rEffective + 14}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-family-mono, monospace)"
          fill="var(--color-text-muted)"
          style={{ pointerEvents: 'none' }}
        >
          {formatNumber(inst.total_contracts)} · {formatCompactMXN(inst.total_amount_mxn)}
        </text>
      )}
    </g>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z2 — institution view (vendors of an institution)
// ────────────────────────────────────────────────────────────────────────────

function Z2Layer({
  institutionId,
  institutionName,
  lang,
  dispatch,
  triggerDrill,
}: {
  institutionId: number
  institutionName: string
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
  triggerDrill: (bodyX: number, bodyY: number, drill: () => void) => void
}) {
  // Pull the parent sector from the focus stack so the canvas keeps its
  // sector-tinted backdrop one level deeper (Salud→IMSS still glows red).
  // Hooks must run unconditionally — same rules-of-hooks fix as Z1.
  const exploreState = useExploreState()
  const parentSector = exploreState.stack.find((f) => f.kind === 'sector') as
    | { kind: 'sector'; sectorCode: string }
    | undefined
  const sectorAccent = parentSector ? SECTOR_COLORS[parentSector.sectorCode] : null

  // Reuse existing endpoint — institutionApi.getVendors
  // Falls back gracefully on 404.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['explore', 'z2', institutionId],
    queryFn: async () => {
      const { institutionApi } = await import('@/api/client')
      return institutionApi.getVendors(institutionId, 30)
    },
    enabled: institutionId > 0,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fontSize={14} fill="var(--color-text-muted)" fontFamily="var(--font-family-mono, monospace)">
        {lang === 'en' ? 'Loading institution…' : 'Cargando institución…'}
      </text>
    )
  }
  if (isError || !data || !data.data || data.data.length === 0) {
    return (
      <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fontSize={14} fill="var(--color-text-muted)" fontFamily="var(--font-family-mono, monospace)">
        {lang === 'en' ? 'No vendor data.' : 'Sin datos de proveedores.'}
      </text>
    )
  }

  // Layout: place vendors radially around the centre, sized by total_value_mxn.
  const vendors = data.data.slice(0, 30)
  const max = Math.max(...vendors.map((v) => v.total_value_mxn || 0), 1)
  const cxC = SVG_W / 2
  const cyC = SVG_H / 2

  // Sector-tinted backdrop (lighter than Z1, since this is a child surface).
  const z2GradId = parentSector ? `z2-bg-${parentSector.sectorCode}` : null

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.10 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
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
      <text
        x={PAD}
        y={PAD}
        fontSize={11}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight={700}
        letterSpacing={1.4}
        fill={sectorAccent ?? 'var(--color-accent)'}
      >
        {`Z2 · ${shortLabel(institutionName).toUpperCase()} · ${vendors.length} ${lang === 'en' ? 'VENDORS' : 'PROVEEDORES'}`}
      </text>
      <text
        x={PAD}
        y={SVG_H - PAD * 0.5}
        fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
        fill="var(--color-text-muted)"
      >
        {lang === 'en' ? 'click a vendor → opens Red Thread · esc to zoom out' : 'clic en proveedor → abre Hilo · esc para alejar'}
      </text>

      {/* Centre marker — represents the institution itself, with a soft
          pulse so the user reads the radial composition as "vendors orbit
          this institution" rather than "random circles in space". */}
      <g style={{ pointerEvents: 'none' }}>
        <motion.circle
          cx={cxC}
          cy={cyC}
          r={14}
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.5}
          animate={{ r: [14, 22, 14], opacity: [0.5, 0.15, 0.5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <circle cx={cxC} cy={cyC} r={4} fill="var(--color-text-muted)" opacity={0.7} />
      </g>

      {vendors.map((v, i) => {
        // Spiral-out radial layout — bumped first ring to 70 so the
        // smallest vendor doesn't overlap the centre institution marker.
        // 8 vendors per ring; rings step by 100px.
        const ringIdx = Math.floor(i / 8)
        const inRingPos = i % 8
        const angle = (inRingPos / 8) * Math.PI * 2 + (ringIdx % 2) * (Math.PI / 8) // alternate offset for rings
        const ring = 80 + ringIdx * 95
        const cx = cxC + Math.cos(angle) * ring
        const cy = cyC + Math.sin(angle) * ring
        const sizeRatio = (v.total_value_mxn ?? 0) / max
        const r = 8 + Math.sqrt(sizeRatio) * 30
        const risk = v.avg_risk_score ?? 0
        const level = getRiskLevelFromScore(risk)
        const fill = RISK_COLORS[level]
        const tooltip = `${v.vendor_name}\n${formatNumber(v.contract_count)} contracts · ${formatCompactMXN(v.total_value_mxn ?? 0)}\n${level.toUpperCase()} · ${(risk * 100).toFixed(1)}%`
        return (
          <VendorBodyVisual
            key={v.vendor_id}
            cx={cx}
            cy={cy}
            r={r}
            fill={fill}
            tooltip={tooltip}
            label={sizeRatio > 0.18 ? shortLabel(v.vendor_name) : null}
            onClick={() =>
              triggerDrill(cx, cy, () =>
                dispatch({
                  type: 'drill-into-vendor',
                  vendorId: v.vendor_id,
                  vendorName: v.vendor_name,
                }),
              )
            }
            onHover={(hovering) =>
              dispatch({
                type: 'set-hover',
                hover: hovering ? { kind: 'vendor', id: v.vendor_id } : null,
              })
            }
          />
        )
      })}
    </motion.g>
  )
}

function VendorBodyVisual({
  cx,
  cy,
  r,
  fill,
  label,
  tooltip,
  onClick,
  onHover,
}: {
  cx: number
  cy: number
  r: number
  fill: string
  label: string | null
  tooltip?: string
  onClick: () => void
  onHover: (hovering: boolean) => void
}) {
  const [hovered, setHovered] = useState(false)
  const rEffective = hovered ? r * 1.18 : r
  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); onHover(true) }}
      onMouseLeave={() => { setHovered(false); onHover(false) }}
    >
      {tooltip && <title>{tooltip}</title>}
      {hovered && <circle cx={cx} cy={cy} r={rEffective + 5} fill={fill} fillOpacity={0.18} />}
      <circle cx={cx} cy={cy} r={rEffective} fill={fill} fillOpacity={0.92} stroke="var(--color-background)" strokeWidth={1.2} />
      {label && (
        <text
          x={cx}
          y={cy - rEffective - 4}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-family-mono, monospace)"
          fontWeight={700}
          fill="var(--color-text-primary)"
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z3 — vendor view (contracts plotted by year × amount)
// ────────────────────────────────────────────────────────────────────────────

function Z3Layer({
  vendorId,
  vendorName,
  lang,
  highlightContractId,
}: {
  vendorId: number
  vendorName: string
  lang: 'en' | 'es'
  /** If set, render a pulsing ring on the matching contract dot — used when
   *  focus.kind === 'contract' (Z4 focus inside the same Z3 visual). */
  highlightContractId?: number | null
}) {
  // Hooks first (rules of hooks).
  const dispatch = useExploreDispatch()
  const exploreState = useExploreState()
  const yearFilter = exploreState.year
  const { data, isLoading, isError } = useQuery({
    queryKey: ['explore', 'z3', vendorId],
    queryFn: async () => {
      const { vendorApi } = await import('@/api/client')
      return vendorApi.getContracts(vendorId, { per_page: 100 })
    },
    enabled: vendorId > 0,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fontSize={14} fill="var(--color-text-muted)" fontFamily="var(--font-family-mono, monospace)">
        {lang === 'en' ? 'Loading vendor contracts…' : 'Cargando contratos…'}
      </text>
    )
  }
  if (isError || !data || !data.data || data.data.length === 0) {
    return (
      <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fontSize={14} fill="var(--color-text-muted)" fontFamily="var(--font-family-mono, monospace)">
        {lang === 'en' ? 'No contracts available.' : 'Sin contratos disponibles.'}
      </text>
    )
  }

  // Layout: x = year (linear), y = log(amount).
  const contracts = data.data.slice(0, 100)
  const years = contracts.map((c) => Number(c.contract_year ?? 0)).filter((y) => y > 1990)
  const minYear = Math.min(...years, 2002)
  const maxYear = Math.max(...years, 2025)
  const ySpan = Math.max(maxYear - minYear, 1)
  const amounts = contracts.map((c) => Math.max(1, Number(c.amount_mxn ?? 0)))
  const maxLogAmt = Math.log10(Math.max(...amounts))
  const minLogAmt = Math.log10(Math.min(...amounts))
  const ampSpan = Math.max(maxLogAmt - minLogAmt, 0.5)

  const xOf = (year: number) => PAD + ((year - minYear) / ySpan) * (SVG_W - PAD * 2)
  const yOf = (amt: number) => SVG_H - PAD - ((Math.log10(amt) - minLogAmt) / ampSpan) * (SVG_H - PAD * 3)
  const rOf = (amt: number) => 4 + ((Math.log10(amt) - minLogAmt) / ampSpan) * 18

  // Year-filtered count for the eyebrow subtitle.
  const visibleCount = yearFilter != null
    ? contracts.filter((c) => Number(c.contract_year ?? 0) === yearFilter).length
    : contracts.length

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.10 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <text
        x={PAD}
        y={PAD}
        fontSize={11}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight={700}
        letterSpacing={1.4}
        fill="var(--color-accent)"
      >
        {yearFilter != null
          ? `Z3 · ${shortLabel(vendorName).toUpperCase()} · ${visibleCount}/${contracts.length} ${lang === 'en' ? 'CONTRACTS' : 'CONTRATOS'} · ${yearFilter}`
          : `Z3 · ${shortLabel(vendorName).toUpperCase()} · ${contracts.length} ${lang === 'en' ? 'CONTRACTS' : 'CONTRATOS'}`}
      </text>
      <text
        x={PAD}
        y={SVG_H - PAD * 0.5}
        fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
        fill="var(--color-text-muted)"
      >
        {lang === 'en' ? 'x = year · y = log(amount) · click → contract detail · esc to zoom out' : 'x = año · y = log(monto) · clic → detalle · esc para alejar'}
      </text>

      {/* Year axis ticks */}
      {[minYear, Math.round((minYear + maxYear) / 2), maxYear].map((y) => (
        <g key={y}>
          <line x1={xOf(y)} x2={xOf(y)} y1={SVG_H - PAD - 4} y2={SVG_H - PAD} stroke="var(--color-border)" strokeWidth={1} />
          <text x={xOf(y)} y={SVG_H - PAD + 12} textAnchor="middle" fontSize={9} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)">
            {y}
          </text>
        </g>
      ))}

      {/* Year-filter veil — when a single year is selected, contracts
          outside that year render with a fade so the user keeps spatial
          context but can read the active year as the highlighted set.
          Pure visual; clicking still navigates to the contract. */}
      {yearFilter != null && (
        <line
          x1={xOf(yearFilter)}
          x2={xOf(yearFilter)}
          y1={PAD * 1.5}
          y2={SVG_H - PAD - 4}
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.55}
          pointerEvents="none"
        />
      )}

      {contracts.map((c) => {
        const yr = Number(c.contract_year ?? minYear) || minYear
        const amt = Math.max(1, Number(c.amount_mxn ?? 0))
        const cx = xOf(yr)
        const cy = yOf(amt)
        const r = rOf(amt)
        const risk = Number(c.risk_score ?? 0)
        const level = getRiskLevelFromScore(risk)
        const fill = RISK_COLORS[level]
        const dim = yearFilter != null && yr !== yearFilter
        const isHighlighted = highlightContractId != null && c.id === highlightContractId
        // Tooltip body — read by the browser via SVG <title>. Keeps a
        // hover preview without React state churn on a 100-circle scatter.
        const tooltipLines = [
          `${yr} · ${formatCompactMXN(amt)}`,
          `${level.toUpperCase()} · ${(risk * 100).toFixed(1)}%`,
        ]
        return (
          <g
            key={c.id}
            style={{ cursor: 'pointer' }}
            // Spatial rule: clicks stay in the canvas. Drill into the
            // contract focus, the briefing panel renders ContractBriefing,
            // the visual layer stays at Z3 with this contract highlighted.
            // Esc pops back to vendor focus.
            onClick={() => dispatch({ type: 'drill-into-contract', contractId: c.id })}
          >
            <title>{tooltipLines.join('\n')}</title>
            {/* Pulsing focus ring — only renders when this contract is the
                active Z4 focus. Two concentric circles animated via SMIL so
                the effect doesn't add React state churn. */}
            {isHighlighted && (
              <>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 6}
                  fill="none"
                  stroke={fill}
                  strokeWidth={1.5}
                  opacity={0.9}
                  pointerEvents="none"
                >
                  <animate attributeName="r" values={`${r + 6};${r + 14};${r + 6}`} dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 2}
                  fill="none"
                  stroke={fill}
                  strokeWidth={2}
                  opacity={1}
                  pointerEvents="none"
                />
              </>
            )}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={fill}
              fillOpacity={dim ? 0.18 : isHighlighted ? 1 : 0.85}
              stroke="var(--color-background)"
              strokeWidth={isHighlighted ? 2 : 1}
            />
          </g>
        )
      })}
    </motion.g>
  )
}

// Surface compatibility — sectorApi import is only kept so the module doesn't
// die from tree-shaking in a future refactor that prunes it; remove later
// when an explore-specific sector endpoint exists.
void sectorApi

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

// Spanish + English connector / stop words that must not contribute to
// an institution acronym. Without this list, "INSTITUTO MEXICANO DEL
// SEGURO SOCIAL" produced "IMDSS" because DEL was treated as a content
// word. The audit (F032) flagged this on prod — IMSS rendered as IMDSS
// on the Salud Z1 map. Fix: filter connectors before acronym build.
const ACRONYM_STOP_WORDS = new Set([
  // Spanish
  'DE', 'DEL', 'LA', 'EL', 'LAS', 'LOS', 'Y', 'EN', 'A', 'AL',
  'POR', 'PARA', 'CON', 'SIN', 'SOBRE',
  // English (rarely needed but defensive)
  'OF', 'THE', 'AND', 'FOR', 'TO', 'IN', 'ON',
])

function shortLabel(name: string): string {
  const trimmed = name.trim()
  const upperWords = trimmed
    .replace(/[,]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && w === w.toUpperCase() && !ACRONYM_STOP_WORDS.has(w))
  if (upperWords.length >= 2 && upperWords.length <= 6) {
    return upperWords.map((w) => w[0]).join('').slice(0, 6)
  }
  return trimmed.length > 18 ? trimmed.slice(0, 17) + '…' : trimmed
}
