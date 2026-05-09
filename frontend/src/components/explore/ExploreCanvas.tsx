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
import { useNavigate } from 'react-router-dom'
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

  // ESC pops one level
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        dispatch({ type: 'pop-focus' })
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
        return (
          <SectorBodyVisual
            key={b.code}
            cx={cx}
            cy={cy}
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
  color,
  label,
  onClick,
  onHover,
}: {
  cx: number
  cy: number
  color: string
  label: string
  onClick: () => void
  onHover: (hovering: boolean) => void
}) {
  const [hovered, setHovered] = useState(false)
  const r = hovered ? 38 : 32
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick} onMouseEnter={() => { setHovered(true); onHover(true) }} onMouseLeave={() => { setHovered(false); onHover(false) }}>
      {/* Halo */}
      {hovered && <circle cx={cx} cy={cy} r={r + 8} fill={color} fillOpacity={0.15} />}
      <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={hovered ? 0.95 : 0.85} stroke="var(--color-background)" strokeWidth={2} />
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        fontSize={14}
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

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.08 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
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
  const fill = RISK_COLORS[getRiskLevelFromScore(inst.risk)]
  const rEffective = hovered ? r * 1.15 : r
  return (
    <g style={{ cursor: 'pointer' }} onClick={onClick} onMouseEnter={() => { setHovered(true); onHover(true) }} onMouseLeave={() => { setHovered(false); onHover(false) }}>
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

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.88 }}
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

      {vendors.map((v, i) => {
        // Spiral-out radial layout — biggest in centre.
        const angle = (i / vendors.length) * Math.PI * 2
        const ring = i === 0 ? 0 : 100 + Math.floor(i / 8) * 100
        const cx = cxC + Math.cos(angle) * ring
        const cy = cyC + Math.sin(angle) * ring
        const sizeRatio = (v.total_value_mxn ?? 0) / max
        const r = 8 + Math.sqrt(sizeRatio) * 30
        const risk = v.avg_risk_score ?? 0
        const fill = RISK_COLORS[getRiskLevelFromScore(risk)]
        return (
          <g
            key={v.vendor_id}
            style={{ cursor: 'pointer' }}
            onClick={() =>
              triggerDrill(cx, cy, () =>
                dispatch({
                  type: 'drill-into-vendor',
                  vendorId: v.vendor_id,
                  vendorName: v.vendor_name,
                }),
              )
            }
            onMouseEnter={() =>
              dispatch({ type: 'set-hover', hover: { kind: 'vendor', id: v.vendor_id } })
            }
            onMouseLeave={() => dispatch({ type: 'set-hover', hover: null })}
          >
            <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.92} stroke="var(--color-background)" strokeWidth={1.2} />
            {sizeRatio > 0.18 && (
              <text
                x={cx}
                y={cy - r - 4}
                textAnchor="middle"
                fontSize={9}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight={700}
                fill="var(--color-text-primary)"
                style={{ pointerEvents: 'none' }}
              >
                {shortLabel(v.vendor_name)}
              </text>
            )}
          </g>
        )
      })}
    </motion.g>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Z3 — vendor view (contracts plotted by year × amount)
// ────────────────────────────────────────────────────────────────────────────

function Z3Layer({
  vendorId,
  vendorName,
  lang,
}: {
  vendorId: number
  vendorName: string
  lang: 'en' | 'es'
}) {
  const navigate = useNavigate()
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
        {`Z3 · ${shortLabel(vendorName).toUpperCase()} · ${contracts.length} ${lang === 'en' ? 'CONTRACTS' : 'CONTRATOS'}`}
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

      {contracts.map((c) => {
        const yr = Number(c.contract_year ?? minYear) || minYear
        const amt = Math.max(1, Number(c.amount_mxn ?? 0))
        const cx = xOf(yr)
        const cy = yOf(amt)
        const r = rOf(amt)
        const risk = Number(c.risk_score ?? 0)
        const fill = RISK_COLORS[getRiskLevelFromScore(risk)]
        return (
          <g
            key={c.id}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/contracts/${c.id}`)}
          >
            <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.85} stroke="var(--color-background)" strokeWidth={1} />
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

function shortLabel(name: string): string {
  const trimmed = name.trim()
  const upperWords = trimmed
    .replace(/[,]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && w === w.toUpperCase())
  if (upperWords.length >= 2 && upperWords.length <= 6) {
    return upperWords.map((w) => w[0]).join('').slice(0, 6)
  }
  return trimmed.length > 18 ? trimmed.slice(0, 17) + '…' : trimmed
}
