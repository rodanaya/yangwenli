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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { atlasApi, sectorApi, type SpatialInstitution } from '@/api/client'
import type { ContractListItem } from '@/api/types'
import {
  RISK_COLORS,
  getRiskLevelFromScore,
  getSectorName,
  SECTORS,
  SECTOR_COLORS,
} from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
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

// Convert a polar angle (degrees, 0° = top) to (fx, fy) fractions.
// cx/cy are the orbital center as fractions of the canvas (0–1).
// rx/ry are the ellipse semi-axes, also in canvas fractions.
function polarToFx(
  cx: number, cy: number,
  rx: number, ry: number,
  angleDeg: number,
): { fx: number; fy: number } {
  const rad = (angleDeg - 90) * Math.PI / 180
  return { fx: cx + rx * Math.cos(rad), fy: cy + ry * Math.sin(rad) }
}

function z0SectorBodies(lang: 'en' | 'es'): SectorBody[] {
  // Elliptical orbital arrangement — two concentric rings centred at
  // (0.50, 0.47) so the constellation sits in the upper-centre of the
  // canvas, clear of the bottom scrubber and left risk-floor toggle.
  //
  // Inner ring (6 high-volume sectors, every 60°, starting at 0° = top):
  //   salud / energia / infraestructura / gobernacion / hacienda / educacion
  //
  // Outer ring (6 supporting sectors, every 60°, offset +30° from inner):
  //   tecnologia / defensa / agricultura / ambiente / trabajo / otros
  //
  // Using an orbital layout instead of the old 3×4 grid keeps max fx ≈ 0.78
  // (vs 0.80 for the grid), eliminates the "far right" column problem, and
  // gives the map an astronomical feel that matches the Z1/Z2 radial layers.
  const CX = 0.50
  const CY = 0.47
  const INNER_RX = 0.28
  const INNER_RY = 0.31
  // OUTER_RX intentionally smaller than OUTER_RY — creates a horizontally
  // compact outer ring so the rightmost sector (defensa at 90°) stays at
  // fx ≈ 0.80, well clear of the right-edge briefing panel. Previously
  // OUTER_RX=0.42 gave fx=0.92 which pushed defensa to the SVG edge.
  const OUTER_RX = 0.30
  const OUTER_RY = 0.42

  const inner: Array<[string, number]> = [
    ['salud',           0],
    ['energia',         60],
    ['infraestructura', 120],
    ['gobernacion',     180],
    ['hacienda',        240],
    ['educacion',       300],
  ]
  const outer: Array<[string, number]> = [
    ['tecnologia',  30],
    ['defensa',     90],
    ['agricultura', 150],
    ['ambiente',    210],
    ['trabajo',     270],
    ['otros',       330],
  ]

  const layout: Record<string, { fx: number; fy: number }> = {}
  for (const [code, deg] of inner) {
    layout[code] = polarToFx(CX, CY, INNER_RX, INNER_RY, deg)
  }
  for (const [code, deg] of outer) {
    layout[code] = polarToFx(CX, CY, OUTER_RX, OUTER_RY, deg)
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

// Unicode glyphs removed — SVG shapes are self-sufficient and cross-platform.
// The text-overlay approach caused double-cross visual noise on salud and
// font-rendering failures on Windows for ⬟/⬡/⬠ (Supplemental Arrows-B block).

// ────────────────────────────────────────────────────────────────────────────
// Sector shape helpers — each returns an SVG <polygon> or <path> centered at
// (cx, cy) with an inscribed radius of r. Used in SectorBubble to replace the
// plain circle with a shape that visually encodes the sector identity.
// All shapes are convex polygons except salud (cross) and energia (bolt).
// ────────────────────────────────────────────────────────────────────────────

// 6-tooth gear polygon — tecnologia
function gearPoints(cx: number, cy: number, outerR: number, innerR: number, teeth: number): string {
  const step = (2 * Math.PI) / teeth
  const halfTooth = step * 0.38
  const halfValley = step * 0.28
  const pts: string[] = []
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2
    const ia = (i + 0.5) * step - Math.PI / 2
    pts.push(`${(cx + outerR * Math.cos(a - halfTooth)).toFixed(2)},${(cy + outerR * Math.sin(a - halfTooth)).toFixed(2)}`)
    pts.push(`${(cx + outerR * Math.cos(a + halfTooth)).toFixed(2)},${(cy + outerR * Math.sin(a + halfTooth)).toFixed(2)}`)
    pts.push(`${(cx + innerR * Math.cos(ia - halfValley)).toFixed(2)},${(cy + innerR * Math.sin(ia - halfValley)).toFixed(2)}`)
    pts.push(`${(cx + innerR * Math.cos(ia + halfValley)).toFixed(2)},${(cy + innerR * Math.sin(ia + halfValley)).toFixed(2)}`)
  }
  return pts.join(' ')
}

// 12-petal sunflower polygon — agricultura
function sunflowerPoints(cx: number, cy: number, outerR: number, innerR: number, petals: number): string {
  const step = (2 * Math.PI) / petals
  const pts: string[] = []
  for (let i = 0; i < petals; i++) {
    const aOuter = i * step - Math.PI / 2
    const aInner = (i + 0.5) * step - Math.PI / 2
    pts.push(`${(cx + outerR * Math.cos(aOuter)).toFixed(2)},${(cy + outerR * Math.sin(aOuter)).toFixed(2)}`)
    pts.push(`${(cx + innerR * Math.cos(aInner)).toFixed(2)},${(cy + innerR * Math.sin(aInner)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function getSectorShapeElement(
  code: string,
  cx: number, cy: number, r: number,
  fill: string, fillOpacity: number,
  stroke: string, strokeWidth: number,
): ReactElement {
  const props = { fill, fillOpacity, stroke, strokeWidth }
  switch (code) {

    case 'salud': {
      // Medical cross — long thin arms matching international Red Cross proportions.
      const arm = r * 0.72, w = r * 0.24
      const d = [
        `M ${cx - w} ${cy - arm}`, `L ${cx + w} ${cy - arm}`,
        `L ${cx + w} ${cy - w}`,   `L ${cx + arm} ${cy - w}`,
        `L ${cx + arm} ${cy + w}`, `L ${cx + w} ${cy + w}`,
        `L ${cx + w} ${cy + arm}`, `L ${cx - w} ${cy + arm}`,
        `L ${cx - w} ${cy + w}`,   `L ${cx - arm} ${cy + w}`,
        `L ${cx - arm} ${cy - w}`, `L ${cx - w} ${cy - w}`, 'Z',
      ].join(' ')
      return <path d={d} {...props} />
    }

    case 'defensa': {
      // Heraldic shield — flat top, curved sides tapering to a point.
      const d = [
        `M ${cx - r*0.68} ${cy - r*0.72}`,
        `L ${cx + r*0.68} ${cy - r*0.72}`,
        `L ${cx + r*0.68} ${cy + r*0.12}`,
        `Q ${cx + r*0.68} ${cy + r*0.60} ${cx} ${cy + r*0.88}`,
        `Q ${cx - r*0.68} ${cy + r*0.60} ${cx - r*0.68} ${cy + r*0.12}`,
        'Z',
      ].join(' ')
      return <path d={d} {...props} />
    }

    case 'tecnologia':
      // 6-tooth gear / cogwheel
      return <polygon points={gearPoints(cx, cy, r, r * 0.65, 6)} {...props} />

    case 'hacienda': {
      // Balance scale — treasury, finance, equilibrium of accounts.
      const pW  = r * 0.08    // pillar half-width
      const bY  = cy - r * 0.25  // beam Y
      const bW  = r * 0.75    // beam half-span (arm length)
      const panCY = bY + r * 0.40  // pan rim Y
      const panR  = r * 0.30   // pan rim half-width
      const panD  = r * 0.14   // pan bowl depth
      const sW  = r * 0.03    // string half-width
      // pillar + base
      const pillar = `M ${cx-pW} ${bY} L ${cx+pW} ${bY} L ${cx+pW} ${cy+r*0.68} L ${cx-pW} ${cy+r*0.68} Z`
      const base   = `M ${cx-r*0.50} ${cy+r*0.68} L ${cx+r*0.50} ${cy+r*0.68} L ${cx+r*0.50} ${cy+r*0.84} L ${cx-r*0.50} ${cy+r*0.84} Z`
      // horizontal beam bar
      const beam   = `M ${cx-bW-pW} ${bY-r*0.08} L ${cx+bW+pW} ${bY-r*0.08} L ${cx+bW+pW} ${bY} L ${cx-bW-pW} ${bY} Z`
      // top pivot triangle
      const pivot  = `M ${cx} ${cy-r*0.80} L ${cx+r*0.11} ${bY-r*0.08} L ${cx-r*0.11} ${bY-r*0.08} Z`
      // left string
      const lX = cx - bW
      const rX = cx + bW
      const lStr = `M ${lX-sW} ${bY} L ${lX+sW} ${bY} L ${lX+sW} ${panCY} L ${lX-sW} ${panCY} Z`
      const rStr = `M ${rX-sW} ${bY} L ${rX+sW} ${bY} L ${rX+sW} ${panCY} L ${rX-sW} ${panCY} Z`
      // pans — filled arc (bowl shape, flat rim on top)
      const lPan = `M ${lX-panR} ${panCY} Q ${lX} ${panCY+panD+panD} ${lX+panR} ${panCY} Z`
      const rPan = `M ${rX-panR} ${panCY} Q ${rX} ${panCY+panD+panD} ${rX+panR} ${panCY} Z`
      return <path d={[pillar, base, beam, pivot, lStr, rStr, lPan, rPan].join(' ')} {...props} />
    }

    case 'infraestructura': {
      // Arch bridge — rectangular block with arch opening punched out (evenodd).
      const outer = [
        `M ${cx - r*0.90} ${cy - r*0.30}`,
        `L ${cx + r*0.90} ${cy - r*0.30}`,
        `L ${cx + r*0.90} ${cy + r*0.80}`,
        `L ${cx - r*0.90} ${cy + r*0.80}`,
        'Z',
      ].join(' ')
      // Arch opening: semicircle at top, open at the bottom edge
      const arch = [
        `M ${cx - r*0.44} ${cy + r*0.80}`,
        `Q ${cx - r*0.44} ${cy - r*0.10} ${cx} ${cy - r*0.10}`,
        `Q ${cx + r*0.44} ${cy - r*0.10} ${cx + r*0.44} ${cy + r*0.80}`,
        'Z',
      ].join(' ')
      return <path d={`${outer} ${arch}`} fillRule="evenodd" {...props} />
    }

    case 'gobernacion': {
      // Map pin / location marker — territorial authority.
      const w = r * 0.56
      const topY = cy - r * 0.78
      const midY = cy - r * 0.20
      const tipY = cy + r * 0.88
      const d = [
        `M ${cx} ${topY}`,
        `Q ${cx + w} ${topY} ${cx + w} ${midY}`,
        `Q ${cx + w} ${midY + r*0.30} ${cx} ${tipY}`,
        `Q ${cx - w} ${midY + r*0.30} ${cx - w} ${midY}`,
        `Q ${cx - w} ${topY} ${cx} ${topY}`,
        'Z',
      ].join(' ')
      return <path d={d} {...props} />
    }

    case 'agricultura':
      // Sunflower — 12 petals radiating outward
      return <polygon points={sunflowerPoints(cx, cy, r, r * 0.56, 12)} {...props} />

    case 'ambiente': {
      // Pine tree — triangular canopy on a trunk.
      const trunkW = r * 0.15
      const trunkTop = cy + r * 0.20
      const d = [
        `M ${cx - trunkW} ${cy + r*0.85}`,
        `L ${cx + trunkW} ${cy + r*0.85}`,
        `L ${cx + trunkW} ${trunkTop}`,
        `L ${cx + r*0.80} ${cy + r*0.24}`,
        `L ${cx}          ${cy - r*0.85}`,
        `L ${cx - r*0.80} ${cy + r*0.24}`,
        `L ${cx - trunkW} ${trunkTop}`,
        'Z',
      ].join(' ')
      return <path d={d} {...props} />
    }

    case 'energia': {
      // Lightning bolt — fat enough to read at all sizes.
      const p = r
      const d = [
        `M ${cx + p * 0.20} ${cy - p}`,
        `L ${cx + p * 0.45} ${cy - p * 0.05}`,
        `L ${cx + p * 0.10} ${cy - p * 0.05}`,
        `L ${cx - p * 0.15} ${cy + p}`,
        `L ${cx - p * 0.40} ${cy + p * 0.10}`,
        `L ${cx - p * 0.05} ${cy + p * 0.10}`,
        'Z',
      ].join(' ')
      return <path d={d} {...props} />
    }

    case 'trabajo': {
      // Hard hat / construction helmet — worker, labor.
      // Dome curves up from the brim shoulders; wide brim extends both sides.
      const brimY  = cy + r * 0.22   // bottom of brim
      const brimHW = r * 0.82        // brim half-width
      const brimH  = r * 0.16        // brim thickness
      const innerTop = brimY - brimH // top edge of brim / dome base
      const d = [
        `M ${cx - brimHW} ${brimY}`,
        `L ${cx + brimHW} ${brimY}`,
        `L ${cx + brimHW} ${innerTop}`,
        `L ${cx + r*0.56} ${innerTop}`,
        `Q ${cx + r*0.52} ${cy - r*0.82} ${cx} ${cy - r*0.82}`,
        `Q ${cx - r*0.52} ${cy - r*0.82} ${cx - r*0.56} ${innerTop}`,
        `L ${cx - brimHW} ${innerTop}`,
        'Z',
      ].join(' ')
      return <path d={d} {...props} />
    }

    case 'educacion': {
      // Pencil pointing upward — knowledge, learning.
      const bW = r * 0.22   // body half-width
      const tipH = r * 0.30 // pointed tip height
      const top = cy - r * 0.80
      const tipBase = top + tipH
      const bodyBot = cy + r * 0.60
      const eraseBot = bodyBot + r * 0.16
      const d = [
        `M ${cx} ${top}`,                          // tip apex
        `L ${cx + bW} ${tipBase}`,
        `L ${cx + bW} ${bodyBot}`,
        `L ${cx + bW + r*0.07} ${bodyBot}`,        // eraser slightly wider
        `L ${cx + bW + r*0.07} ${eraseBot}`,
        `L ${cx - bW - r*0.07} ${eraseBot}`,
        `L ${cx - bW - r*0.07} ${bodyBot}`,
        `L ${cx - bW} ${bodyBot}`,
        `L ${cx - bW} ${tipBase}`,
        'Z',
      ].join(' ')
      return <path d={d} {...props} />
    }

    default:
      // Circle fallback for 'otros' and unknown codes
      return <circle cx={cx} cy={cy} r={r} {...props} />
  }
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
            {focus.kind === 'system' && <Z0Layer key="z0" lang={lang} dispatch={dispatch} triggerDrill={triggerCameraDrill} pinAnnotation={pinAnnotation} />}
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
// Z0 — system view (12 sectors)
// ────────────────────────────────────────────────────────────────────────────

function Z0Layer({
  lang,
  dispatch,
  triggerDrill,
  pinAnnotation,
}: {
  lang: 'en' | 'es'
  dispatch: ReturnType<typeof useExploreDispatch>
  triggerDrill: (bodyX: number, bodyY: number, drill: () => void) => void
  pinAnnotation: Focus | null
}) {
  // Phase 2.5 (May 9): size sector bodies by total spend so the system
  // view encodes scale, not just position. Falls back to a uniform layout
  // if the API call fails (cached for 30 minutes — sectors are slow-moving).
  const { data: sectorStats } = useQuery({
    queryKey: ['explore', 'z0-sector-stats'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 30 * 60 * 1000,
  })
  // Gap 6: lens drives both sizing and coloring of Z0 bodies.
  // 'sectors' lens: size by total spend, color by sector palette.
  // 'risk' lens: size by avg_risk_score, color by risk palette.
  // Same 12 bodies, two narratives ("where's the money?" vs "where's the
  // corruption?"). The lens lives in ExploreState and persists via URL
  // ?lens=… (see useExploreUrlSync). Future v1.1 lenses add to this map.
  const exploreState = useExploreState()
  const lens = exploreState.lens
  const sizeByCode = useMemo(() => {
    if (!sectorStats?.data) return null
    const valueField: 'total_value_mxn' | 'avg_risk_score' =
      lens === 'risk' ? 'avg_risk_score' : 'total_value_mxn'
    const max = Math.max(...sectorStats.data.map((s) => Number(s[valueField]) || 0), 0.01)
    const map = new Map<string, number>()
    for (const s of sectorStats.data) {
      const v = Number(s[valueField]) || 0
      // sqrt scale so the visual difference is perceptible without
      // making one sector dwarf the rest.
      map.set(s.sector_code, Math.sqrt(Math.max(0, v) / max))
    }
    return map
  }, [sectorStats, lens])
  // Build a risk-level → color map for the risk lens, by sector code.
  const riskColorByCode = useMemo(() => {
    if (!sectorStats?.data) return null
    const map = new Map<string, string>()
    for (const s of sectorStats.data) {
      const level = getRiskLevelFromScore(Number(s.avg_risk_score) || 0)
      map.set(s.sector_code, RISK_COLORS[level])
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

      {/* Eyebrow — centered so it stays visible when xMidYMid slice clips the left/right margins. */}
      <text
        x={SVG_W / 2}
        y={PAD}
        textAnchor="middle"
        fontSize={11}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight={700}
        letterSpacing={1.4}
        fill="var(--color-text-muted)"
      >
        {lens === 'risk'
          ? (lang === 'en' ? 'Z0 · SYSTEM · 12 SECTORS · RISK LENS' : 'Z0 · SISTEMA · 12 SECTORES · LENTE DE RIESGO')
          : (lang === 'en' ? 'Z0 · SYSTEM · 12 SECTORS · SPEND LENS' : 'Z0 · SISTEMA · 12 SECTORES · LENTE DE GASTO')}
      </text>
      <text
        x={SVG_W / 2}
        y={SVG_H - PAD * 0.5}
        textAnchor="middle"
        fontSize={10}
        fontFamily="var(--font-family-mono, monospace)"
        fill="var(--color-text-muted)"
      >
        {lang === 'en'
          ? 'click a sector to drill in · drag to pan · wheel to zoom'
          : 'clic en un sector para profundizar · arrastra · rueda para acercar'}
      </text>

      {bodies.map((b, i) => {
        const cx = PAD + b.fx * (SVG_W - PAD * 2)
        const cy = PAD + b.fy * (SVG_H - PAD * 2)
        const sizeFactor = sizeByCode?.get(b.code) ?? null
        const r = sizeFactor != null ? 22 + sizeFactor * 28 : 32
        const isPinned = pinAnnotation?.kind === 'sector' && pinAnnotation.sectorId === b.id
        const bodyColor = lens === 'risk'
          ? (riskColorByCode?.get(b.code) ?? b.color)
          : b.color
        return (
          <SectorBodyVisual
            key={b.code}
            cx={cx}
            cy={cy}
            r={r}
            color={bodyColor}
            label={b.name}
            sectorCode={b.code}
            isPinned={isPinned}
            index={i}
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
  sectorCode,
  onClick,
  onHover,
  isPinned = false,
  index = 0,
}: {
  cx: number
  cy: number
  r: number
  color: string
  label: string
  sectorCode?: string
  onClick: () => void
  onHover: (hovering: boolean) => void
  isPinned?: boolean
  index?: number
}) {
  const [hovered, setHovered] = useState(false)
  const rEffective = hovered ? r + 6 : r

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.15 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: index * 0.065, ease: [0.22, 1, 0.36, 1] }}
      style={{ cursor: 'pointer', transformOrigin: `${cx}px ${cy}px` }}
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); onHover(true) }}
      onMouseLeave={() => { setHovered(false); onHover(false) }}
    >
      <title>{label}</title>
      {hovered && <circle cx={cx} cy={cy} r={rEffective + 8} fill={color} fillOpacity={0.15} />}
      {isPinned && <PinRing cx={cx} cy={cy} r={rEffective + 4} color={color} />}
      {getSectorShapeElement(
        sectorCode ?? '',
        cx, cy, rEffective,
        color, hovered ? 0.95 : 0.85,
        'var(--color-background)', 2,
      )}

      <text
        x={cx}
        y={cy + r + 17}
        textAnchor="middle"
        fontSize={11}
        fontFamily="var(--font-family-mono, monospace)"
        fontWeight={700}
        fill={color}
        stroke="var(--color-background)"
        strokeWidth={3}
        paintOrder="stroke fill"
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </motion.g>
  )
}

/**
 * PinRing — shared SMIL-animated pulsing ring. Reusable across Z0
 * sector bodies, Z1 institution bodies, Z2 vendor bodies. (Z3 contract
 * dots already use a similar inline-SMIL ring for the contract-focus
 * highlight; we don't reuse this primitive there because the contract
 * dots are tiny and want a tighter radius envelope.)
 */
function PinRing({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return (
    <g style={{ pointerEvents: 'none' }} aria-hidden="true">
      <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke={color} strokeWidth={2.5} opacity={1}>
        <animate attributeName="r" values={`${r + 2};${r + 10};${r + 2}`} dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.15;0.9" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={2} opacity={0.85} />
    </g>
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

const OECD_DA_THRESHOLD = 25 // OECD direct-award benchmark %

function tierMark(risk: number): { glyph: string; color: string; label: string } {
  if (risk >= 0.60) return { glyph: '◆', color: RISK_COLORS.critical, label: 'T1' }
  if (risk >= 0.40) return { glyph: '◆', color: RISK_COLORS.high,     label: 'T2' }
  if (risk >= 0.25) return { glyph: '●', color: RISK_COLORS.medium,   label: 'T3' }
  return               { glyph: '●', color: '#71717a',                label: 'T4' }
}

function daFlag(pct: number | null): boolean {
  return pct != null && pct > OECD_DA_THRESHOLD
}

function InstCard({
  inst,
  sectorAccent,
  totalSectorSpend,
  lang,
  isBanner,
  dispatch,
}: {
  inst: SpatialInstitution
  sectorAccent: string
  totalSectorSpend: number
  lang: 'en' | 'es'
  isBanner: boolean
  dispatch: ReturnType<typeof useExploreDispatch>
}) {
  const tier = tierMark(inst.risk)
  const da = inst.direct_award_pct ?? null
  const showDaFlag = daFlag(da)
  const shareOfSector = totalSectorSpend > 0 ? (inst.total_amount_mxn / totalSectorSpend) * 100 : 0
  const bigNum = da != null ? `${da.toFixed(1)}%` : `${(inst.risk * 100).toFixed(1)}%`
  const bigNumLabel = da != null
    ? (lang === 'en' ? 'direct awards' : 'adjudicaciones directas')
    : (lang === 'en' ? 'avg risk score' : 'indicador de riesgo')
  const showOecd = da != null && da > OECD_DA_THRESHOLD

  return (
    <div
      className={`cursor-pointer transition-colors ${isBanner ? 'p-4' : 'p-3'}`}
      style={{
        borderLeft: `3px solid ${tier.color}`,
        background: 'var(--color-background-card)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
      onClick={() => dispatch({ type: 'drill-into-institution', institutionId: inst.institution_id, institutionName: inst.name })}
    >
      {/* Tier + flags row */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="font-mono text-[10px] font-bold" style={{ color: tier.color }}>
          {tier.glyph} {tier.label}
        </span>
        {showDaFlag && (
          <span className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ background: `${tier.color}20`, color: tier.color }}>
            DA
          </span>
        )}
        {(inst.high_risk_pct ?? 0) > 15 && (
          <span className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ background: `${RISK_COLORS.critical}20`, color: RISK_COLORS.critical }}>
            HR
          </span>
        )}
      </div>

      {/* Institution name */}
      <div
        className={`font-semibold ${isBanner ? 'text-sm' : 'text-xs'} leading-tight mb-1`}
        style={{ color: 'var(--color-text-primary)' }}
      >
        {inst.name}
      </div>

      {/* Big number */}
      <div className="mb-1">
        <span
          className={`font-mono font-bold tabular-nums ${isBanner ? 'text-2xl' : 'text-lg'}`}
          style={{ color: tier.color, fontFamily: 'var(--font-family-serif, serif)', fontStyle: 'italic' }}
        >
          {bigNum}
        </span>
        <span className="font-mono text-[9px] ml-1" style={{ color: 'var(--color-text-muted)' }}>
          {bigNumLabel}
        </span>
        {showOecd && (
          <span className="font-mono text-[8px] ml-2" style={{ color: '#06b6d4' }}>
            {lang === 'en' ? 'OECD' : 'OCDE'}: {OECD_DA_THRESHOLD}%
          </span>
        )}
      </div>

      {/* Metrics row */}
      <div className="font-mono text-[9px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {formatNumber(inst.total_contracts)} {lang === 'en' ? 'contracts' : 'contratos'} · {formatCompactMXN(inst.total_amount_mxn)}
      </div>

      {/* Sector share bar */}
      {isBanner && (
        <div className="mb-2">
          <div className="h-1.5 rounded-full mb-0.5" style={{ background: 'var(--color-border)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(shareOfSector, 100)}%`, background: tier.color, opacity: 0.6 }}
            />
          </div>
          <div className="font-mono text-[8px]" style={{ color: 'var(--color-text-muted)' }}>
            {shareOfSector.toFixed(1)}% {lang === 'en' ? 'of sector spend' : 'del gasto del sector'}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="font-mono text-[9px] font-bold" style={{ color: sectorAccent }}>
        {lang === 'en' ? 'SEE INSTITUTION →' : 'VER INSTITUCIÓN →'}
      </div>
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
  const [tailExpanded, setTailExpanded] = useState(false)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['explore', 'z1', sectorId],
    queryFn: () => atlasApi.getSectorInstitutionsSpatial({ sectorId, limit: 60 }),
    enabled: sectorId > 0 && sectorId <= 12,
    staleTime: 10 * 60 * 1000,
  })

  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'
  const institutions = data?.institutions ?? []
  const totalSectorSpend = institutions.reduce((s, i) => s + i.total_amount_mxn, 0)

  const banner   = institutions[0]
  const features = institutions.slice(1, 4)
  const tail     = institutions.slice(4)

  // Editorial dek: top N institutions' spend share
  const top4Share = institutions.slice(0, 4).reduce((s, i) => s + i.total_amount_mxn, 0)
  const top4Pct = totalSectorSpend > 0 ? (top4Share / totalSectorSpend * 100).toFixed(0) : '—'

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
        <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: sectorAccent }}>
          {lang === 'en'
            ? `Z1 · ${data?.sector_name_en?.toUpperCase() ?? sectorCode.toUpperCase()}`
            : `Z1 · ${data?.sector_name_es?.toUpperCase() ?? sectorCode.toUpperCase()}`}
        </div>
        {!isLoading && institutions.length > 0 && (
          <div className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'en'
              ? `Top 4 institutions control ${top4Pct}% of sector spend`
              : `Las 4 principales concentran ${top4Pct}% del gasto del sector`}
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

      {/* Banner — #1 institution */}
      {banner && (
        <div className="p-3">
          <InstCard
            inst={banner}
            sectorAccent={sectorAccent}
            totalSectorSpend={totalSectorSpend}
            lang={lang}
            isBanner={true}
            dispatch={dispatch}
          />
        </div>
      )}

      {/* Feature row — #2 / #3 / #4 */}
      {features.length > 0 && (
        <>
          <div
            className="px-4 py-1 font-mono text-[9px] tracking-widest uppercase border-t border-b"
            style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}
          >
            {lang === 'en' ? 'NEXT IN LINE' : 'LAS QUE SIGUEN'}
          </div>
          <div className="grid grid-cols-1 divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {features.map((inst) => (
              <div key={inst.institution_id} className="px-3">
                <InstCard
                  inst={inst}
                  sectorAccent={sectorAccent}
                  totalSectorSpend={totalSectorSpend}
                  lang={lang}
                  isBanner={false}
                  dispatch={dispatch}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Long tail — collapsed by default */}
      {tail.length > 0 && (
        <>
          <button
            type="button"
            className="w-full px-4 py-2.5 flex items-center justify-between border-t font-mono text-[9px] tracking-widest uppercase"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-background)' }}
            onClick={() => setTailExpanded((x) => !x)}
          >
            <span>
              {(() => {
                const rest = top4Pct !== '—' ? `${(100 - parseFloat(top4Pct)).toFixed(0)}%` : '—'
                return lang === 'en'
                  ? `${tail.length} MORE INSTITUTIONS · ${rest} OF SPEND`
                  : `${tail.length} INSTITUCIONES MÁS · ${rest} DEL GASTO`
              })()}
            </span>
            <span>{tailExpanded ? '↑' : '↓'}</span>
          </button>
          {tailExpanded && (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {tail.map((inst) => {
                const tier = tierMark(inst.risk)
                const shareOfSector = totalSectorSpend > 0 ? (inst.total_amount_mxn / totalSectorSpend * 100) : 0
                return (
                  <div
                    key={inst.institution_id}
                    className="flex items-center gap-2 px-4 py-2 cursor-pointer"
                    style={{ borderLeft: `2px solid ${tier.color}` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                    onClick={() => dispatch({ type: 'drill-into-institution', institutionId: inst.institution_id, institutionName: inst.name })}
                  >
                    <span className="font-mono text-[9px]" style={{ color: tier.color }}>{tier.glyph}{tier.label}</span>
                    <span className="flex-1 font-mono text-[10px] truncate" style={{ color: 'var(--color-text-primary)' }}>{inst.name}</span>
                    <span className="font-mono text-[9px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{shareOfSector.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </>
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

  // Sort by risk descending — investigative priority order, not spend
  const sorted = [...vendors].sort((a, b) => (b.avg_risk_score ?? 0) - (a.avg_risk_score ?? 0))
  const shelfCritical = sorted.filter((v) => (v.avg_risk_score ?? 0) >= 0.60)
  const shelfFlagged  = sorted.filter((v) => { const s = v.avg_risk_score ?? 0; return s >= 0.25 && s < 0.60 })
  const shelfRoutine  = sorted.filter((v) => (v.avg_risk_score ?? 0) < 0.25)

  const [routineOpen, setRoutineOpen] = useState(false)

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

      {/* Three editorial shelves */}
      {!isLoading && !isError && vendors.length > 0 && (
        <div className="py-3 space-y-2">

          {/* Shelf 1 — Critical Risk */}
          {shelfCritical.length > 0 && (
            <div
              className="mx-3 rounded-r-sm overflow-hidden"
              style={{ borderLeft: `2px solid ${RISK_COLORS.critical}` }}
            >
              <div
                className="flex items-center gap-2 px-3 py-1.5"
                style={{ background: `${RISK_COLORS.critical}12`, borderBottom: `1px solid ${RISK_COLORS.critical}25` }}
              >
                <span className="font-mono text-[8px] tracking-widest uppercase flex-1" style={{ color: RISK_COLORS.critical }}>
                  {lang === 'en' ? 'CRITICAL RISK · INVESTIGATE' : 'RIESGO CRÍTICO · INVESTIGAR'}
                </span>
                <span className="font-mono text-[9px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {shelfCritical.length}
                </span>
              </div>
              {shelfCritical.map((v, i) => (
                <div
                  key={v.vendor_id}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                  onClick={() => dispatch({ type: 'drill-into-vendor', vendorId: v.vendor_id, vendorName: formatVendorName(v.vendor_name) })}
                >
                  <div className="w-0.5 h-4 flex-shrink-0 rounded-full" style={{ background: RISK_COLORS.critical }} />
                  <span className="font-mono text-[9px] w-4 text-right flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</span>
                  <span className="flex-1 font-mono text-[10px] truncate min-w-0" style={{ color: 'var(--color-text-primary)' }} title={formatVendorName(v.vendor_name)}>
                    {formatVendorName(v.vendor_name)}
                  </span>
                  <span className="font-mono text-[10px] font-bold tabular-nums flex-shrink-0" style={{ color: RISK_COLORS.critical }}>
                    {formatCompactMXN(v.total_value_mxn ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Shelf 2 — Flagged / High-Medium */}
          {shelfFlagged.length > 0 && (
            <div
              className="mx-3 rounded-r-sm overflow-hidden"
              style={{ borderLeft: `2px solid ${RISK_COLORS.high}` }}
            >
              <div
                className="flex items-center gap-2 px-3 py-1.5"
                style={{ background: `${RISK_COLORS.high}12`, borderBottom: `1px solid ${RISK_COLORS.high}25` }}
              >
                <span className="font-mono text-[8px] tracking-widest uppercase flex-1" style={{ color: RISK_COLORS.high }}>
                  {lang === 'en' ? 'FLAGGED · HIGH RISK' : 'SEÑALADO · RIESGO ALTO'}
                </span>
                <span className="font-mono text-[9px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {shelfFlagged.length}
                </span>
              </div>
              {shelfFlagged.map((v, i) => (
                <div
                  key={v.vendor_id}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                  onClick={() => dispatch({ type: 'drill-into-vendor', vendorId: v.vendor_id, vendorName: formatVendorName(v.vendor_name) })}
                >
                  <div className="w-0.5 h-4 flex-shrink-0 rounded-full" style={{ background: RISK_COLORS.high }} />
                  <span className="font-mono text-[9px] w-4 text-right flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{shelfCritical.length + i + 1}</span>
                  <span className="flex-1 font-mono text-[10px] truncate min-w-0" style={{ color: 'var(--color-text-primary)' }} title={formatVendorName(v.vendor_name)}>
                    {formatVendorName(v.vendor_name)}
                  </span>
                  <span className="font-mono text-[10px] font-bold tabular-nums flex-shrink-0" style={{ color: RISK_COLORS.high }}>
                    {formatCompactMXN(v.total_value_mxn ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Shelf 3 — Routine / Low Risk (collapsed by default) */}
          {shelfRoutine.length > 0 && (
            <div
              className="mx-3 rounded-r-sm overflow-hidden"
              style={{ borderLeft: '2px solid var(--color-border)' }}
            >
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-1.5 cursor-pointer text-left"
                style={{
                  background: 'var(--color-background-card)',
                  borderBottom: routineOpen ? '1px solid var(--color-border)' : 'none',
                }}
                onClick={() => setRoutineOpen((o) => !o)}
              >
                <span className="font-mono text-[8px] tracking-widest uppercase flex-1" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'en' ? 'ROUTINE · LOW RISK' : 'RUTINARIO · RIESGO BAJO'}
                </span>
                <span className="font-mono text-[9px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {shelfRoutine.length}
                </span>
                <span className="font-mono text-[10px] ml-1" style={{ color: 'var(--color-text-muted)' }}>
                  {routineOpen ? '▾' : '▸'}
                </span>
              </button>
              {routineOpen && shelfRoutine.map((v, i) => (
                <div
                  key={v.vendor_id}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                  onClick={() => dispatch({ type: 'drill-into-vendor', vendorId: v.vendor_id, vendorName: formatVendorName(v.vendor_name) })}
                >
                  <div className="w-0.5 h-4 flex-shrink-0 rounded-full" style={{ background: 'var(--color-text-muted)' }} />
                  <span className="font-mono text-[9px] w-4 text-right flex-shrink-0 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>{shelfCritical.length + shelfFlagged.length + i + 1}</span>
                  <span className="flex-1 font-mono text-[10px] truncate min-w-0" style={{ color: 'var(--color-text-secondary)' }} title={formatVendorName(v.vendor_name)}>
                    {formatVendorName(v.vendor_name)}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                    {formatCompactMXN(v.total_value_mxn ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
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

  // Full list sorted by amount for the collapsed section
  const byAmount = [...contracts].sort((a, b) => (Number(b.amount_mxn) || 0) - (Number(a.amount_mxn) || 0))

  const [listOpen, setListOpen] = useState(false)

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

      {/* Full list — collapsible */}
      {byAmount.length > 0 && (
        <div className="px-4 py-3">
          <button
            type="button"
            className="w-full flex items-center justify-between py-1 cursor-pointer"
            onClick={() => setListOpen((o) => !o)}
          >
            <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'en' ? `ALL ${byAmount.length} CONTRACTS` : `TODOS (${byAmount.length})`}
            </span>
            <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {listOpen ? '▾' : '▸'}
            </span>
          </button>
          {listOpen && (
            <div className="mt-2 divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {byAmount.map((c) => {
                const level = getRiskLevelFromScore(Number(c.risk_score ?? 0))
                const fill = RISK_COLORS[level]
                const isHighlighted = c.id === highlightContractId
                const label = (c as ContractListItem & { title?: string }).title
                  ?? (c as ContractListItem & { procedure_type?: string | null }).procedure_type
                  ?? (lang === 'en' ? 'Direct award' : 'Adjudicación directa')
                return (
                  <div
                    key={c.id}
                    className="flex items-start gap-2 py-1.5 cursor-pointer"
                    style={isHighlighted ? { background: `${fill}18` } : {}}
                    onMouseEnter={(e) => { if (!isHighlighted) (e.currentTarget as HTMLElement).style.background = 'var(--color-background-card)' }}
                    onMouseLeave={(e) => { if (!isHighlighted) (e.currentTarget as HTMLElement).style.background = '' }}
                    onClick={() => dispatch({ type: 'drill-into-contract', contractId: c.id })}
                  >
                    <div className="w-0.5 h-4 rounded-full flex-shrink-0 mt-0.5" style={{ background: fill }} />
                    <span className="font-mono text-[9px] w-8 flex-shrink-0 tabular-nums pt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {c.contract_year}
                    </span>
                    <span className="font-mono text-[10px] font-bold w-20 flex-shrink-0 tabular-nums" style={{ color: fill }}>
                      {formatCompactMXN(Number(c.amount_mxn ?? 0))}
                    </span>
                    <span className="flex-1 font-mono text-[9px] line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
