/**
 * CanvasConstellation — Pass 1 / 2.
 *
 * Self-contained, headless-friendly Canvas + d3-zoom constellation engine.
 * Replaces the SVG ConcentrationConstellation + CSS-transform-based
 * AtlasZoomLayer with:
 *
 *   • HTML5 Canvas dot rendering (60fps even at 1,000+ dots)
 *   • d3-zoom for pan/wheel/pinch/momentum/cursor-anchoring (no hand-rolled
 *     transform math)
 *   • d3-quadtree O(log n) hover hit-testing
 *   • React-positioned <div> labels over the canvas (crisp at any zoom,
 *     accessible, selectable — no SVG counter-scale workarounds)
 *   • LOD bands matching `useAtlasLOD`: constellation (<4×) / region (4–12×) /
 *     star (≥12×)
 *
 * Coordinate spaces:
 *   • World: data coordinates, 0..1 fractions in both axes (same convention
 *     as ClusterMeta.fx / fy in ConcentrationConstellation). The engine
 *     does not know about SVG pixel units.
 *   • Screen: CSS pixels inside the wrapper.
 *
 * Pass 1 acceptance: no edits to Atlas.tsx, AtlasZoomLayer.tsx,
 * AtlasContext.tsx, or ConcentrationConstellation.tsx. This component is
 * imported nowhere — Pass 2 wires it in and deletes the legacy zoom layer.
 *
 * ── How to test in isolation ────────────────────────────────────────────
 * Mount the component anywhere with a couple of dots and a cluster:
 *
 *   <div style={{ width: 800, height: 540 }}>
 *     <CanvasConstellation
 *       lang="en"
 *       clusters={[{ code: 'P1', label: 'Monopoly', fx: 0.5, fy: 0.5, color: '#dc2626' }]}
 *       dots={[
 *         { id: '1', x: 0.5, y: 0.5, riskLevel: 'critical', name: 'ACME', riskScore: 0.82 },
 *         { id: '2', x: 0.4, y: 0.55, riskLevel: 'high', clusterCode: 'P1' },
 *       ]}
 *     />
 *   </div>
 *
 * Wheel to zoom, drag to pan, hover to highlight. Pass refs to drive
 * `flyToCluster` / `resetView` imperatively.
 */

import * as React from 'react'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { select, type Selection } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
// d3-transition is a transitive runtime dep of d3-zoom; we import its side
// effects so that selection.transition() exists at runtime. Types are not
// shipped with our @types/d3-* set, so we narrow via a local helper below.
import 'd3-transition'
import { quadtree as d3quadtree, type Quadtree } from 'd3-quadtree'
import { easeCubicInOut } from 'd3-ease'

/**
 * Type-safe wrapper around `selection.transition().duration(ms)`. d3-zoom
 * supports being applied to a transitioning selection; the call signature is
 * the same as the non-transitioning one. We avoid pulling in @types/d3-transition
 * by casting through `unknown` here.
 */
interface TransitionLikeSelection<T extends Element> {
  call: (
    behavior: ZoomBehavior<T, unknown>['transform'],
    ...args: unknown[]
  ) => TransitionLikeSelection<T>
}
function withTransition<T extends Element>(
  sel: Selection<T, unknown, null, undefined>,
  duration: number,
  ease?: (t: number) => number,
): TransitionLikeSelection<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tr: any = (sel as any).transition().duration(duration)
  if (ease) tr = tr.ease(ease)
  return tr as TransitionLikeSelection<T>
}
import { RISK_COLORS, PATTERN_COLORS } from '@/lib/constants'
import { formatVendorName } from '@/lib/vendor/formatName'
import { halton } from '@/lib/particle'

// ── Ambient field ─────────────────────────────────────────────────────────
// 3,000 Halton(2,3) positions in 0..1 WORLD space (same space as data dots).
// Rendered THROUGH the zoom transform so the field participates in pan/zoom
// — it feels like diving into a starfield instead of staring at a static
// overlay. Higher count compensates for the fact that high zoom reveals
// fewer dots within the viewport (at k=12 only ~1/144 of the field is on
// screen, so 3,000 → ~20 visible — still enough for texture).
//
// Color/alpha calibrated for the app's light background (#faf9f6):
//   slate-500 (#64748b) at alpha 0.18 → effective rgb(~226,228,231) on white
//   — subtle grey freckle, clearly visible but not overwhelming.
const AMBIENT_COUNT = 3000
const AMBIENT_DOTS: Array<{ x: number; y: number }> = Array.from(
  { length: AMBIENT_COUNT },
  (_, i) => ({ x: halton(i + 1, 2), y: halton(i + 1, 3) }),
)

/** Hex pattern color for a dot's cluster code (only for P1..P7). */
function patternStrokeFor(clusterCode: string | undefined): string | null {
  if (!clusterCode) return null
  return PATTERN_COLORS[clusterCode] ?? null
}

// ── Pattern glyphs (M-CLUSTER Phase 2) ───────────────────────────────────
// Each P1..P7 cluster gets a decorative SVG-style glyph drawn behind its
// vendor dots that encodes the pattern's behavioural signature. The glyph
// is rendered in the pattern color at low alpha (0.18) so it never competes
// with the data dots but gives each cluster a visual identity that the
// user learns to read like a star chart constellation.
//
// All glyphs draw within a ~120px box centered at (0,0) — the caller
// translates + scales before invoking. Stroke + fill use ctx's current
// strokeStyle / fillStyle (set by caller to pattern hex).
// Note: TAU = Math.PI * 2 is declared at module scope further down (~line 367).
// Functions capture it via closure at call time, so forward-reference is safe.

function drawPatternGlyph(
  ctx: CanvasRenderingContext2D,
  code: string,
  cx: number,
  cy: number,
  size: number,   // half-width in px — full glyph fits inside ±size box
  color: string,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = Math.max(1, size / 60)
  ctx.globalAlpha = 0.16
  const s = size / 60  // scale factor — design glyphs at "size=60" reference

  switch (code) {
    case 'P1': {
      // CONCENTRATED MONOPOLY — large central node + 2 small satellites.
      ctx.beginPath()
      ctx.arc(0, 0, 14 * s, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = 0.08
      ctx.beginPath()
      ctx.arc(28 * s, -10 * s, 4 * s, 0, TAU)
      ctx.arc(-25 * s, 14 * s, 5 * s, 0, TAU)
      ctx.fill()
      break
    }
    case 'P2': {
      // GHOST COMPANY — fading dot trail dissolving outward.
      for (let i = 0; i < 6; i++) {
        const t = i / 5
        ctx.globalAlpha = 0.18 * (1 - t * 0.85)
        ctx.beginPath()
        ctx.arc((-25 + i * 12) * s, 0, (6 - i * 0.7) * s, 0, TAU)
        ctx.fill()
      }
      break
    }
    case 'P3': {
      // SINGLE-USE INTERMEDIARY — sharp arrow / burst shape.
      ctx.beginPath()
      ctx.moveTo(-28 * s, -16 * s)
      ctx.lineTo(20 * s, 0)
      ctx.lineTo(-28 * s, 16 * s)
      ctx.lineTo(-18 * s, 0)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 0.10
      ctx.beginPath()
      ctx.arc(-34 * s, -8 * s, 3 * s, 0, TAU)
      ctx.arc(-36 * s, 6 * s, 2.5 * s, 0, TAU)
      ctx.fill()
      break
    }
    case 'P4': {
      // BID COLLUSION — paired dyads linked by horizontal bar.
      ctx.beginPath()
      ctx.arc(-18 * s, 0, 9 * s, 0, TAU)
      ctx.arc(18 * s, 0, 9 * s, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = 0.22
      ctx.lineWidth = 3 * s
      ctx.beginPath()
      ctx.moveTo(-12 * s, 0)
      ctx.lineTo(12 * s, 0)
      ctx.stroke()
      break
    }
    case 'P5': {
      // SYSTEMATIC OVERPRICING — ascending stair of rectangles.
      ctx.globalAlpha = 0.16
      const stepW = 9 * s
      const heights = [6, 12, 18, 24, 30]
      for (let i = 0; i < heights.length; i++) {
        const x = (-22 + i * stepW) * s
        const h = heights[i] * s
        ctx.fillRect(x, -h / 2, stepW - 1 * s, h)
      }
      break
    }
    case 'P6': {
      // INSTITUTIONAL CAPTURE — hub-and-spoke radial.
      ctx.beginPath()
      ctx.arc(0, 0, 6 * s, 0, TAU)
      ctx.fill()
      ctx.globalAlpha = 0.12
      ctx.lineWidth = 1.5 * s
      const spokes = 8
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * TAU
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * 9 * s, Math.sin(a) * 9 * s)
        ctx.lineTo(Math.cos(a) * 28 * s, Math.sin(a) * 28 * s)
        ctx.stroke()
        // satellite dot at the end of each spoke
        ctx.fillStyle = color
        ctx.globalAlpha = 0.20
        ctx.beginPath()
        ctx.arc(Math.cos(a) * 30 * s, Math.sin(a) * 30 * s, 3 * s, 0, TAU)
        ctx.fill()
        ctx.globalAlpha = 0.12
      }
      break
    }
    case 'P7': {
      // CONTRACTOR NETWORK — 3 clustered subgroups connected.
      const groups = [
        { x: -22, y: -14 },
        { x: 22, y: -12 },
        { x: 0, y: 18 },
      ]
      // Edges between groups
      ctx.globalAlpha = 0.10
      ctx.lineWidth = 1.5 * s
      ctx.beginPath()
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          ctx.moveTo(groups[i].x * s, groups[i].y * s)
          ctx.lineTo(groups[j].x * s, groups[j].y * s)
        }
      }
      ctx.stroke()
      // 3-node bunches at each group point
      ctx.globalAlpha = 0.20
      for (const g of groups) {
        ctx.beginPath()
        ctx.arc(g.x * s, g.y * s, 4.5 * s, 0, TAU)
        ctx.arc((g.x + 6) * s, (g.y + 4) * s, 3 * s, 0, TAU)
        ctx.arc((g.x - 5) * s, (g.y + 5) * s, 2.5 * s, 0, TAU)
        ctx.fill()
      }
      break
    }
  }
  ctx.restore()
}

// ── Public API types ──────────────────────────────────────────────────────

/** A single particle in the constellation. World coords in 0..1 fractions. */
export interface ConstellationDot {
  /** Stable unique identifier (used for label keying + quadtree lookup). */
  id: string
  /** World X in 0..1. */
  x: number
  /** World Y in 0..1. */
  y: number
  /** Risk bucket (drives default color when sectorColor is absent). */
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  /** Optional cluster membership — drives pinned-cluster halo & dim logic. */
  clusterCode?: string
  /** Vendor name. Only dots with a name participate in LOD label rendering. */
  name?: string
  /** Risk score 0..1 — drives the `· NN%` chip at star band. */
  riskScore?: number
  /** Hex from SECTOR_COLORS — when present, overrides riskLevel coloring. */
  sectorColor?: string
  /** Outliers render with a larger radius (named T1 vendors). */
  isOutlier?: boolean
  /**
   * Optional taxonomy tag. Default behavior treats dots as vendors. Atlas P6
   * Frontier C introduces 'contract' dots that orbit a focused vendor; the
   * engine itself does not differentiate (rendering is identical), but
   * consumers can branch on `dot.kind` inside click handlers.
   */
  kind?: 'vendor' | 'contract'
}

/** A cluster attractor (P1..P7, sector code, etc). Drives the fly-to API. */
export interface ConstellationCluster {
  /** Stable code (e.g. 'P1'). */
  code: string
  /** Localized human-readable label (consumer is responsible for i18n). */
  label: string
  /** Attractor X in 0..1. */
  fx: number
  /** Attractor Y in 0..1. */
  fy: number
  /** Hex color (ring + dim-other halo). */
  color: string
}

/** Imperative API exposed via refs — callers mutate `.current`. */
export type FlyToClusterFn = (code: string) => void
export type ResetViewFn = () => void
/**
 * Fly to an arbitrary world coordinate at a given scale. Used by Atlas P6
 * Frontier C planetary mode to center the view on a specific vendor without
 * needing a cluster code.
 */
export type FlyToPosFn = (x: number, y: number, scale?: number) => void

/** LOD band, matches `useAtlasLOD`. */
export type ConstellationBand = 'constellation' | 'region' | 'star'

export interface CanvasConstellationProps {
  /** All dots to render. Re-running quadtree on identity change is automatic. */
  dots: ConstellationDot[]
  /** Cluster attractors — drives fly-to + dim-other-clusters when pinned. */
  clusters: ConstellationCluster[]
  /** CSS width — defaults to 100% via the wrapper div. */
  width?: number
  /** CSS height — defaults to 100%. */
  height?: number
  /** Locale tag — reserved for future per-band label strings. */
  lang: 'en' | 'es'
  /** Initial zoom level (default 1). */
  initialZoom?: number
  /** Initial center in world coords (default { x: 0.5, y: 0.5 }). */
  initialCenter?: { x: number; y: number }
  /** Fired on dot click (after quadtree hit). */
  onDotClick?: (dot: ConstellationDot) => void
  /**
   * Fired on hover enter/leave. Null on leave.
   *
   * Atlas P6 Frontier A (2026-05-21): also emits the dot's CURRENT screen
   * position in CSS pixels relative to the wrapper, so consumers can render
   * adjacent UI (e.g. VendorHaloCard at zoom ≥ 18×) without re-computing the
   * world→screen transform themselves.
   */
  onDotHover?: (
    dot: ConstellationDot | null,
    screenPos?: { x: number; y: number },
  ) => void
  /** Fired when a cluster attractor itself is clicked (NOT a dot). */
  onClusterClick?: (cluster: ConstellationCluster) => void
  /** Fired with the new zoom level + computed band on every zoom event. */
  onZoomChange?: (info: { zoom: number; band: ConstellationBand }) => void
  /** Caller-provided ref — set to a fn that flies to the named cluster. */
  flyToClusterRef?: React.MutableRefObject<FlyToClusterFn | null>
  /** Caller-provided ref — set to a fn that resets to identity transform. */
  resetViewRef?: React.MutableRefObject<ResetViewFn | null>
  /**
   * Caller-provided ref — set to a fn that flies to a world coordinate at
   * an optional scale. Atlas P6 Frontier C uses this to center on a vendor
   * for planetary-orbit mode.
   */
  flyToPosRef?: React.MutableRefObject<FlyToPosFn | null>
  /** IDs of dots that should render an accent stroke (selection halo). */
  highlightedDotIds?: Set<string>
  /** Code of a sticky-highlighted cluster (others dim to 0.15). */
  pinnedClusterCode?: string | null
  /** Risk floor — dots below the floor render at low opacity. */
  riskFloor?: 'all' | 'medium' | 'high' | 'critical'
}

// ── Constants ─────────────────────────────────────────────────────────────

const TAU = Math.PI * 2

/** Risk-level → screen pixel radius at zoom=1, before LOD multiplier. */
const RISK_BASE_RADIUS: Record<ConstellationDot['riskLevel'], number> = {
  critical: 2.8,
  high: 2.2,
  medium: 1.6,
  low: 1.0,
}

/** Risk-floor ordering (numeric for cheap comparison). */
const RISK_ORDER: Record<ConstellationDot['riskLevel'], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
}

/** d3-zoom scale extent. Matches AtlasZoomLayer composed range (~0.6 .. 54). */
const SCALE_EXTENT: [number, number] = [0.5, 60]

/** Max labels to keep on screen at any one time (collision-pruned). */
const MAX_LABELS = 50

/** Dot-count cap above which year-change tween is skipped (snap to new state). */
const YEAR_TWEEN_MAX_DOTS = 2000

/** Year-change morph duration in milliseconds. */
const YEAR_TWEEN_MS = 600

/** Risk-floor fade duration in milliseconds. */
const RISK_FLOOR_FADE_MS = 400

/** flyToCluster duration in milliseconds. */
const FLY_TO_MS = 900

/** Bucket a zoom scalar into a band. Mirrors `useAtlasLOD`. */
function bandFor(k: number): ConstellationBand {
  if (k < 4) return 'constellation'
  if (k < 12) return 'region'
  return 'star'
}

/** Hex color for a dot — sector override wins over risk bucket. */
function colorForDot(dot: ConstellationDot): string {
  if (dot.sectorColor) return dot.sectorColor
  return RISK_COLORS[dot.riskLevel]
}

/** Quadtree node accessor — screen-space x. */
function qtX(d: ConstellationDot, w: number): number { return d.x * w }
function qtY(d: ConstellationDot, h: number): number { return d.y * h }

// ── Component ────────────────────────────────────────────────────────────

/**
 * Canvas-based constellation renderer. See file header for the full design
 * brief and isolation-testing snippet.
 */
export function CanvasConstellation(props: CanvasConstellationProps): React.ReactElement {
  const {
    dots,
    clusters,
    width,
    height,
    initialZoom = 1,
    initialCenter = { x: 0.5, y: 0.5 },
    onDotClick,
    onDotHover,
    onClusterClick,
    onZoomChange,
    flyToClusterRef,
    resetViewRef,
    flyToPosRef,
    highlightedDotIds,
    pinnedClusterCode,
    riskFloor = 'all',
  } = props

  // — DOM refs —
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const labelsLayerRef = useRef<HTMLDivElement | null>(null)

  // — Mutable engine state (not React state — avoid render churn on zoom) —
  const transformRef = useRef<ZoomTransform>(zoomIdentity)
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const quadRef = useRef<Quadtree<ConstellationDot> | null>(null)
  const hoveredIdRef = useRef<string | null>(null)
  const zoomBehaviorRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null)

  // — Year-change morph state —
  // Map of previous dot positions keyed by id, captured at the moment the
  // `dots` prop changes. While `tweenStartRef.current !== null`, the draw
  // loop interpolates between previous and current positions over
  // YEAR_TWEEN_MS using easeCubicInOut.
  const prevDotsMapRef = useRef<Map<string, { x: number; y: number }> | null>(null)
  const tweenStartRef = useRef<number | null>(null)
  const tweenRafRef = useRef<number | null>(null)

  // 2026-05-22 — drawRef holds the latest `draw` callback. The d3-zoom
  // 'zoom' event handler is registered ONCE on mount inside a useEffect
  // with empty deps; calling `draw()` directly from there closes over the
  // initial draw (which references the lattice-fallback dots). Using a ref
  // ensures wheel/pan events call the current draw, with the current dots.
  const drawRef = useRef<() => void>(() => {})
  // 2026-05-22 — same issue for the ResizeObserver: the resize callback is
  // also registered once on mount (empty deps) and calls rebuildQuadtree().
  // After real-vendor dots load, the stale rebuildQuadtree closure would
  // rebuild with zero dots. Keep a ref in sync so resize always uses current.
  const rebuildQuadtreeRef = useRef<() => void>(() => {})

  // — Risk-floor fade state —
  // Tracks the floor at the start of the current fade + its start timestamp.
  // The draw loop animates each dot's alpha contribution from its OLD
  // visibility (matching prevFloor) to its NEW visibility (matching riskFloor).
  const prevRiskFloorRef = useRef<'all' | 'medium' | 'high' | 'critical'>(riskFloor)
  const floorFadeStartRef = useRef<number | null>(null)
  const floorFadeRafRef = useRef<number | null>(null)

  // Band lives as React state so labels rerender at threshold crossings.
  const [band, setBand] = useState<ConstellationBand>(() => bandFor(initialZoom))
  const [, forceLabelTick] = useState(0)

  /** Re-pick which labels to render based on current band + transform. */
  const labelsToRender = useMemo<ConstellationDot[]>(() => {
    // Galaxy band shows NO vendor labels — only the cluster identity tags
    // render (handled by renderedClusterLabels below). User report 2026-05-21:
    // floating vendor labels like "Repsol Comercializadora" and "Alstom
    // Transport Mexico" collided with the cluster captions and made the
    // galaxy view unreadable. Vendor labels reveal at region zoom (≥4×)
    // and become the dominant text at star zoom (≥12×).
    if (band === 'constellation') return []
    const named = dots.filter((d) => d.name)
    // Sort by risk score desc so top-T1 wins collisions.
    const sorted = [...named].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    const fraction = band === 'region' ? 0.5 : 1
    const cap = Math.max(1, Math.ceil(sorted.length * fraction))
    return sorted.slice(0, Math.min(cap, MAX_LABELS))
  }, [band, dots])

  // — Setup: canvas sizing with DPR + ResizeObserver —
  useEffect(() => {
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    if (!wrapper || !canvas) return

    const resize = (): void => {
      const rect = wrapper.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      const dpr = window.devicePixelRatio || 1
      sizeRef.current = { w, h }
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(dpr, dpr)
      }
      // Quadtree is in CSS-px screen space; rebuild on resize.
      // 2026-05-22 — use refs (not the mount-time closures) so that when
      // ResizeObserver fires after real-vendor dots have loaded, it uses
      // the current rebuildQuadtree + draw (with the live 70-dot array),
      // not the stale initial versions that had dots = [].
      rebuildQuadtreeRef.current()
      drawRef.current()
      forceLabelTick((n) => n + 1)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(wrapper)
    resize()
    return () => {
      ro.disconnect()
      if (tweenRafRef.current !== null) cancelAnimationFrame(tweenRafRef.current)
      if (floorFadeRafRef.current !== null) cancelAnimationFrame(floorFadeRafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // — Rebuild quadtree when dots change —
  const rebuildQuadtree = useCallback(() => {
    const { w, h } = sizeRef.current
    if (w === 0 || h === 0) return
    quadRef.current = d3quadtree<ConstellationDot>()
      .x((d) => qtX(d, w))
      .y((d) => qtY(d, h))
      .addAll(dots)
  }, [dots])

  // — Track previous dots for year-change tween —
  // We hold a ref to the LAST seen dots array; when `dots` changes (a new
  // reference), we capture each previous (id → {x,y}) into prevDotsMapRef
  // and kick off a RAF tween. Lattice dots have stable ids (`dot-N`) and so
  // most positions interpolate; new ids fade in, removed ids fade out.
  const lastDotsRef = useRef<ConstellationDot[] | null>(null)
  useEffect(() => {
    const previous = lastDotsRef.current
    lastDotsRef.current = dots

    // Cancel any in-flight tween before potentially starting a new one.
    if (tweenRafRef.current !== null) {
      cancelAnimationFrame(tweenRafRef.current)
      tweenRafRef.current = null
    }

    // Skip tween on first mount, when either array is too large, OR when the
    // two arrays are fundamentally different cohorts (e.g. synthetic lattice
    // fallback ↔ real-data dots loading in). The lattice has stable ids
    // `dot-N`; real vendor dots have numeric ids. Detect this by comparing
    // the *first* id of each — if one set is synthetic and the other isn't,
    // we'd otherwise render hundreds of lattice ghost dots fading in/out
    // (user report 2026-05-21: "hovering is messed up — lots of dots light
    // up and disappear").
    const prevHasLattice = previous?.some((d) => d.id.startsWith('dot-')) ?? false
    const nextHasLattice = dots.some((d) => d.id.startsWith('dot-'))
    const cohortMismatch = prevHasLattice !== nextHasLattice

    const shouldTween =
      previous !== null &&
      previous.length > 0 &&
      dots.length > 0 &&
      previous.length <= YEAR_TWEEN_MAX_DOTS &&
      dots.length <= YEAR_TWEEN_MAX_DOTS &&
      !cohortMismatch

    if (shouldTween && previous) {
      const map = new Map<string, { x: number; y: number }>()
      for (const d of previous) map.set(d.id, { x: d.x, y: d.y })
      prevDotsMapRef.current = map
      tweenStartRef.current = performance.now()

      const tick = (now: number): void => {
        const start = tweenStartRef.current
        if (start === null) return
        const t = Math.min(1, (now - start) / YEAR_TWEEN_MS)
        draw()
        if (t < 1) {
          tweenRafRef.current = requestAnimationFrame(tick)
        } else {
          tweenStartRef.current = null
          prevDotsMapRef.current = null
          tweenRafRef.current = null
          draw()
        }
      }
      tweenRafRef.current = requestAnimationFrame(tick)
    } else {
      // No tween — clear any stale state and snap.
      tweenStartRef.current = null
      prevDotsMapRef.current = null
    }

    rebuildQuadtree()
    draw()
    forceLabelTick((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dots, rebuildQuadtree])

  // — Risk-floor fade trigger —
  // When `riskFloor` prop changes, kick off a 400ms RAF that simply pumps
  // `draw()` so the alpha interpolation in the draw loop has frames to render.
  // The actual per-dot alpha math lives in `draw()` based on
  // floorFadeStartRef + prevRiskFloorRef + current riskFloor.
  useEffect(() => {
    // On first mount, just snapshot — no fade.
    if (prevRiskFloorRef.current === riskFloor) return
    if (floorFadeRafRef.current !== null) {
      cancelAnimationFrame(floorFadeRafRef.current)
      floorFadeRafRef.current = null
    }
    floorFadeStartRef.current = performance.now()
    const startFloor = prevRiskFloorRef.current
    const tick = (now: number): void => {
      const start = floorFadeStartRef.current
      if (start === null) return
      const t = Math.min(1, (now - start) / RISK_FLOOR_FADE_MS)
      draw()
      if (t < 1) {
        floorFadeRafRef.current = requestAnimationFrame(tick)
      } else {
        floorFadeStartRef.current = null
        prevRiskFloorRef.current = riskFloor
        floorFadeRafRef.current = null
        draw()
      }
    }
    floorFadeRafRef.current = requestAnimationFrame(tick)
    // Mark that we've started — the resolved prev-floor sticks until tween ends.
    void startFloor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskFloor])

  // — d3-zoom hookup —
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sel: Selection<HTMLCanvasElement, unknown, null, undefined> = select(canvas)

    const zoomBehavior = d3zoom<HTMLCanvasElement, unknown>()
      .scaleExtent(SCALE_EXTENT)
      .on('zoom', (event) => {
        const next = event.transform
        // 2026-05-22 — removed the snap-to-identity guard at k≤1.05 that
        // was added 2026-05-21 to prevent accidental drift. It killed
        // intentional drag-pan at galaxy zoom (the user couldn't pan the
        // constellation around at all). Drag-pan now works at every zoom
        // level. d3-zoom's translateExtent could be set if drift becomes
        // a problem again; for now the canvas-pixel ambient field gives
        // the user visual anchors regardless of where they pan to.
        transformRef.current = next
        const newBand = bandFor(next.k)
        setBand((prev) => (prev === newBand ? prev : newBand))
        // 2026-05-22 — call the LATEST draw via the ref, not the closure-
        // captured one from initial mount. The mount-time `draw` closed over
        // the lattice fallback (1,200 dots); every wheel/pan kept calling
        // that stale closure and repainted the lattice on top of the real
        // galaxy. Live trace confirmed 1207 arc calls per zoom event when
        // dots prop was only 70. The ref always points to the current draw.
        drawRef.current()
        forceLabelTick((n) => n + 1)
        onZoomChange?.({ zoom: next.k, band: newBand })
      })
    zoomBehaviorRef.current = zoomBehavior
    sel.call(zoomBehavior)

    // Apply initial transform centered on initialCenter at initialZoom.
    const { w, h } = sizeRef.current
    if (w > 0 && h > 0 && (initialZoom !== 1 || initialCenter.x !== 0.5 || initialCenter.y !== 0.5)) {
      const target = zoomIdentity
        .translate(w / 2, h / 2)
        .scale(initialZoom)
        .translate(-initialCenter.x * w, -initialCenter.y * h)
      sel.call(zoomBehavior.transform, target)
    }

    return () => {
      sel.on('.zoom', null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // — Imperative refs —
  useEffect(() => {
    if (!flyToClusterRef) return
    flyToClusterRef.current = (code: string) => {
      const canvas = canvasRef.current
      const zb = zoomBehaviorRef.current
      if (!canvas || !zb) return
      const cluster = clusters.find((c) => c.code === code)
      if (!cluster) return
      const { w, h } = sizeRef.current
      const targetK = 3.6
      const target = zoomIdentity
        .translate(w / 2, h / 2)
        .scale(targetK)
        .translate(-cluster.fx * w, -cluster.fy * h)
      // Atlas P6 Frontier A — cinematic 900ms cubic curve (was 600ms linear).
      withTransition(select(canvas), FLY_TO_MS, easeCubicInOut).call(zb.transform, target)
    }
    return () => {
      if (flyToClusterRef) flyToClusterRef.current = null
    }
  }, [clusters, flyToClusterRef])

  useEffect(() => {
    if (!flyToPosRef) return
    flyToPosRef.current = (x: number, y: number, scale = 20) => {
      const canvas = canvasRef.current
      const zb = zoomBehaviorRef.current
      if (!canvas || !zb) return
      const { w, h } = sizeRef.current
      const target = zoomIdentity
        .translate(w / 2, h / 2)
        .scale(scale)
        .translate(-x * w, -y * h)
      withTransition(select(canvas), FLY_TO_MS, easeCubicInOut).call(zb.transform, target)
    }
    return () => {
      if (flyToPosRef) flyToPosRef.current = null
    }
  }, [flyToPosRef])

  useEffect(() => {
    if (!resetViewRef) return
    resetViewRef.current = () => {
      const canvas = canvasRef.current
      const zb = zoomBehaviorRef.current
      if (!canvas || !zb) return
      withTransition(select(canvas), 400).call(zb.transform, zoomIdentity)
    }
    return () => {
      if (resetViewRef) resetViewRef.current = null
    }
  }, [resetViewRef])

  // — Pointer handlers (hover + click via quadtree) —
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const qt = quadRef.current
    if (!canvas || !qt) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    // Invert transform → screen-space "data" coords (since quadtree was built
    // in CSS-px world coords, we invert through current transform to get
    // the equivalent screen-of-untransformed point).
    const t = transformRef.current
    const ix = (sx - t.x) / t.k
    const iy = (sy - t.y) / t.k
    // Hit radius shrinks with zoom so it stays ~10px in screen space.
    const hitR = 10 / t.k
    const found = qt.find(ix, iy, hitR) || null
    const newId = found ? found.id : null
    if (newId !== hoveredIdRef.current) {
      hoveredIdRef.current = newId
      if (found) {
        const { w, h } = sizeRef.current
        const screenPos = {
          x: found.x * w * t.k + t.x,
          y: found.y * h * t.k + t.y,
        }
        onDotHover?.(found, screenPos)
      } else {
        onDotHover?.(null)
      }
      draw()
    }
  }, [onDotHover])

  const handlePointerLeave = useCallback(() => {
    if (hoveredIdRef.current !== null) {
      hoveredIdRef.current = null
      onDotHover?.(null)
      draw()
    }
  }, [onDotHover])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const qt = quadRef.current
    if (!canvas || !qt) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const t = transformRef.current
    const ix = (sx - t.x) / t.k
    const iy = (sy - t.y) / t.k
    const hitR = 12 / t.k
    let found = qt.find(ix, iy, hitR)
    // Atlas P6 Frontier A — faded-out dots (below current riskFloor) are not
    // clickable. We test against the CURRENT floor (post-fade); during the
    // 400ms fade the dot is at intermediate alpha, but allowing clicks then
    // would feel inconsistent — pick the destination state as the source of
    // truth.
    if (found && riskFloor !== 'all') {
      const floorOrder = RISK_ORDER[riskFloor]
      if (RISK_ORDER[found.riskLevel] < floorOrder) {
        found = undefined
      }
    }
    // Atlas P6 Pass 3 bug-fix (2026-05-21): only consume the click as a
    // dot-click when a handler is actually wired. Otherwise fall through to
    // cluster hit-testing — without this, every click on the densely-packed
    // dots inside a cluster called `undefined?.(found)` and returned, so
    // cluster click never fired and zoom-in felt broken.
    if (found && onDotClick) {
      onDotClick(found)
      return
    }
    // Test cluster attractors (within ~28px of attractor center). If the
    // click hit a dot AND that dot has a clusterCode, prefer that cluster —
    // gives clicks inside dense clusters a useful intent.
    const { w, h } = sizeRef.current
    if (found && found.clusterCode && onClusterClick) {
      const c = clusters.find((cc) => cc.code === found.clusterCode)
      if (c) {
        onClusterClick(c)
        return
      }
    }
    for (const c of clusters) {
      const cx = c.fx * w
      const cy = c.fy * h
      const dx = ix - cx
      const dy = iy - cy
      if (dx * dx + dy * dy <= (28 / t.k) ** 2) {
        onClusterClick?.(c)
        return
      }
    }
  }, [onDotClick, onClusterClick, clusters, riskFloor])

  // — Draw loop —
  const draw = useCallback((): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { w, h } = sizeRef.current
    const t = transformRef.current
    const k = t.k
    const floorOrder = riskFloor === 'all' ? -1 : RISK_ORDER[riskFloor]
    const hoveredId = hoveredIdRef.current

    // Year-change tween progress (0..1, eased).
    const tweenStart = tweenStartRef.current
    const tweenProg = tweenStart === null
      ? 1
      : Math.min(1, (performance.now() - tweenStart) / YEAR_TWEEN_MS)
    const tweenEased = easeCubicInOut(tweenProg)
    const prevMap = prevDotsMapRef.current

    // Risk-floor fade progress (0..1, eased).
    const floorStart = floorFadeStartRef.current
    const floorProg = floorStart === null
      ? 1
      : Math.min(1, (performance.now() - floorStart) / RISK_FLOOR_FADE_MS)
    const floorEased = easeCubicInOut(floorProg)
    const prevFloor = prevRiskFloorRef.current
    const prevFloorOrder = prevFloor === 'all' ? -1 : RISK_ORDER[prevFloor]

    ctx.clearRect(0, 0, w, h)

    // Ambient field — drawn in WORLD space, transformed by zoom so the
    // field pans/zooms together with the data dots (dive-into-starfield
    // feel). slate-500 at 0.18 alpha is calibrated for the light
    // (#faf9f6) background.
    ctx.fillStyle = '#64748b'   // slate-500
    ctx.globalAlpha = 0.18
    ctx.beginPath()
    // Dot radius nudges up at deeper zoom so individual stars stay legible
    // when only a handful are on screen. Keep modest — too big and it
    // competes with the data dots.
    const ambientR = k >= 12 ? 2.2 : k >= 4 ? 1.8 : 1.5
    for (const p of AMBIENT_DOTS) {
      const sx = p.x * w * k + t.x
      const sy = p.y * h * k + t.y
      // Cull off-screen (with a small margin) — at high zoom most of the
      // field falls outside the viewport, skip those arc calls.
      if (sx < -10 || sy < -10 || sx > w + 10 || sy > h + 10) continue
      // moveTo lifts the fill pen so adjacent arcs aren't connected by lines.
      ctx.moveTo(sx + ambientR, sy)
      ctx.arc(sx, sy, ambientR, 0, TAU)
    }
    ctx.fill()
    ctx.globalAlpha = 1

    // Cluster ground glow — radial gradient at each attractor in its pattern
    // color, very subtle. Gives the user a visual anchor for each cluster's
    // identity even before dots render.
    for (const c of clusters) {
      const cx = c.fx * w * k + t.x
      const cy = c.fy * h * k + t.y
      const glowR = 80 * Math.max(1, Math.min(k, 6))  // scale gently with zoom, cap at 6x
      // Cull off-screen glows
      if (cx + glowR < 0 || cy + glowR < 0 || cx - glowR > w || cy - glowR > h) continue
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
      grad.addColorStop(0, c.color + '20')  // ~12% alpha at center (hex 20)
      grad.addColorStop(1, c.color + '00')  // fully transparent at edge
      ctx.fillStyle = grad
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2)
    }

    // M-CLUSTER Phase 2 — Pattern constellation glyphs. Drawn AFTER ground
    // glow but BEFORE data dots so they sit behind the swarm. Each P1..P7
    // cluster gets a decorative SVG-style shape encoding its behavioural
    // signature (monopoly = central node, ghost = fading trail, etc.). Skip
    // glyphs when zoomed in tight on a different cluster (other clusters
    // fade to 0.18 already, glyph would compete with dots).
    for (const c of clusters) {
      if (!c.code.startsWith('P') || !PATTERN_COLORS[c.code]) continue
      const cx = c.fx * w * k + t.x
      const cy = c.fy * h * k + t.y
      const glyphSize = 60 * Math.max(1, Math.min(k, 4))
      if (cx + glyphSize < 0 || cy + glyphSize < 0 || cx - glyphSize > w || cy - glyphSize > h) continue
      // Dim glyphs in non-pinned clusters when zoomed in
      const dimFactor = pinnedClusterCode && c.code !== pinnedClusterCode ? 0.35 : 1
      ctx.save()
      ctx.globalAlpha = dimFactor
      drawPatternGlyph(ctx, c.code, cx, cy, glyphSize, c.color)
      ctx.restore()
    }

    // Dots
    for (const d of dots) {
      // Position interpolation for year-change tween.
      let wx = d.x
      let wy = d.y
      let entryAlpha = 1
      if (tweenProg < 1 && prevMap) {
        const prev = prevMap.get(d.id)
        if (prev) {
          // Existing dot — lerp position.
          wx = prev.x + (d.x - prev.x) * tweenEased
          wy = prev.y + (d.y - prev.y) * tweenEased
        } else {
          // New dot this year — fade in.
          entryAlpha = tweenEased
        }
      }
      const sx = wx * w * k + t.x
      const sy = wy * h * k + t.y
      // Cull off-screen (with a small margin).
      if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue

      let radius = RISK_BASE_RADIUS[d.riskLevel]
      if (d.isOutlier) radius *= 1.8
      // LOD: nudge radius up at deeper bands.
      if (k >= 12) radius *= 1.35
      else if (k >= 4) radius *= 1.15

      // Opacity composition.
      let alpha = entryAlpha
      // Risk-floor visibility (with fade interpolation).
      const rLevel = RISK_ORDER[d.riskLevel]
      const prevVisible = prevFloorOrder === -1 ? 1 : (rLevel >= prevFloorOrder ? 1 : 0)
      const nextVisible = floorOrder === -1 ? 1 : (rLevel >= floorOrder ? 1 : 0)
      const floorAlpha = prevVisible + (nextVisible - prevVisible) * floorEased
      alpha *= floorAlpha
      if (pinnedClusterCode && d.clusterCode && d.clusterCode !== pinnedClusterCode) alpha *= 0.18
      // Skip near-zero alpha early — also avoids canvas calls when dot is fully faded.
      if (alpha <= 0.01) continue

      // Pinned cluster halo on member dots.
      if (pinnedClusterCode && d.clusterCode === pinnedClusterCode) {
        ctx.beginPath()
        ctx.arc(sx, sy, radius + 3, 0, TAU)
        ctx.fillStyle = colorForDot(d)
        ctx.globalAlpha = 0.18 * alpha
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(sx, sy, radius, 0, TAU)
      ctx.fillStyle = colorForDot(d)
      ctx.globalAlpha = alpha
      ctx.fill()

      // Pattern identity stroke — 1px outline in the dot's pattern color.
      // Preserves risk color as dot fill (CLAUDE.md §3.10) while giving each
      // cluster visual signature when many clusters are visible at once.
      const strokeColor = patternStrokeFor(d.clusterCode)
      if (strokeColor) {
        ctx.beginPath()
        ctx.arc(sx, sy, radius, 0, TAU)
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = 1
        ctx.globalAlpha = alpha * 0.4
        ctx.stroke()
      }

      // Selection halo for highlighted dots.
      if (highlightedDotIds && highlightedDotIds.has(d.id)) {
        ctx.beginPath()
        ctx.arc(sx, sy, radius + 2.5, 0, TAU)
        ctx.strokeStyle = '#fafafa'
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.9
        ctx.stroke()
      }

      // Hover accent.
      if (hoveredId === d.id) {
        ctx.beginPath()
        ctx.arc(sx, sy, radius + 4, 0, TAU)
        ctx.strokeStyle = colorForDot(d)
        ctx.lineWidth = 1.25
        ctx.globalAlpha = 0.8
        ctx.stroke()
      }
    }

    // 2026-05-22 — removed the "fade out removed dots" ghost render.
    // Empirically (live trace 2026-05-21): on lattice → real-data
    // transition, the prevMap captured the 1,200 synthetic lattice positions
    // and this loop repainted them at low alpha indefinitely, producing the
    // tan-dot noise scattered across the galaxy view. The cohort-mismatch
    // guard upstream was supposed to prevent prevMap from being set in that
    // case, but something still leaks. The fade-out was nice-to-have for
    // year scrubbing; the dot POSITIONS still tween smoothly for matched
    // IDs (the main effect). Strip the unmatched-id fade-out entirely.
    ctx.globalAlpha = 1

    // Cluster attractor rings (thin, on top of dots).
    for (const c of clusters) {
      const sx = c.fx * w * k + t.x
      const sy = c.fy * h * k + t.y
      if (sx < -40 || sy < -40 || sx > w + 40 || sy > h + 40) continue
      const r = (10 + (pinnedClusterCode === c.code ? 4 : 0)) // screen-px ring
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, TAU)
      ctx.strokeStyle = c.color
      ctx.globalAlpha = pinnedClusterCode === c.code ? 0.9 : 0.55
      ctx.lineWidth = pinnedClusterCode === c.code ? 1.5 : 1
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }, [dots, clusters, pinnedClusterCode, highlightedDotIds, riskFloor])

  // 2026-05-22 — keep drawRef in sync with the latest draw so the d3-zoom
  // 'zoom' handler (bound once on mount) calls the up-to-date implementation.
  // Without this, wheel/pan re-paints the lattice fallback that was active at
  // the moment d3-zoom was first bound.
  useEffect(() => { drawRef.current = draw }, [draw])
  // Keep rebuildQuadtreeRef in sync for the same reason — ResizeObserver uses it.
  useEffect(() => { rebuildQuadtreeRef.current = rebuildQuadtree }, [rebuildQuadtree])

  // — Label positions (React render) —
  const t = transformRef.current
  const { w: cssW, h: cssH } = sizeRef.current
  const renderedLabels = useMemo(() => {
    if (cssW === 0 || cssH === 0) return []
    const items: Array<{ id: string; sx: number; sy: number; label: string; riskScore?: number; color: string }> = []
    const occupied: Array<{ x: number; y: number; w: number; h: number }> = []
    const LABEL_H = 18
    const LABEL_W_EST = 110
    for (const d of labelsToRender) {
      const sx = d.x * cssW * t.k + t.x
      const sy = d.y * cssH * t.k + t.y
      if (sx < -20 || sy < -20 || sx > cssW + 20 || sy > cssH + 20) continue
      // AABB collision check against already-placed labels.
      const box = { x: sx - LABEL_W_EST / 2, y: sy - LABEL_H - 6, w: LABEL_W_EST, h: LABEL_H }
      let clash = false
      for (const o of occupied) {
        if (box.x < o.x + o.w && box.x + box.w > o.x && box.y < o.y + o.h && box.y + box.h > o.y) {
          clash = true
          break
        }
      }
      if (clash) continue
      occupied.push(box)
      items.push({
        id: d.id,
        sx,
        sy,
        label: formatVendorName(d.name, 24),
        riskScore: d.riskScore,
        color: colorForDot(d),
      })
      if (items.length >= MAX_LABELS) break
    }
    return items
    // re-evaluate on every transform tick (forceLabelTick increments) and band change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelsToRender, band, cssW, cssH, t.k, t.x, t.y])

  // — Cluster labels (Frontier B Phase 2: 2026-05-21) —
  // Render the cluster CODE + LABEL underneath each attractor ring so users
  // can identify "what to click" at galaxy zoom. Hidden when zoomed into a
  // specific cluster (the breadcrumb says where you are; second label
  // would compete). Positioned as React divs so they stay crisp regardless
  // of canvas zoom.
  const renderedClusterLabels = useMemo(() => {
    if (cssW === 0 || cssH === 0) return []
    // Hide when zoomed in tight on one cluster — breadcrumb covers it.
    if (pinnedClusterCode && band !== 'constellation') return []
    return clusters
      .map((c) => {
        const sx = c.fx * cssW * t.k + t.x
        const sy = c.fy * cssH * t.k + t.y
        if (sx < -40 || sy < -60 || sx > cssW + 40 || sy > cssH + 40) return null
        return { code: c.code, label: c.label, color: c.color, sx, sy }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, pinnedClusterCode, band, cssW, cssH, t.k, t.x, t.y])

  // ── Render ──
  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: width ?? '100%',
    height: height ?? '100%',
    overflow: 'hidden',
    touchAction: 'none', // delegate gestures to d3-zoom
  }

  return (
    <div ref={wrapperRef} style={wrapperStyle} data-testid="canvas-constellation">
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, display: 'block', cursor: 'grab' }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        role="img"
        aria-label="Constellation of vendor risk dots"
      />
      <div
        ref={labelsLayerRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        aria-hidden={band === 'constellation'}
      >
        {/* Cluster identity labels — code + name beneath each attractor.
            Lets the user see "this is P5 · Systematic Overpricing" at a glance,
            not just a colored ring. Hidden when zoomed into a specific cluster. */}
        {renderedClusterLabels.map((c) => (
          <div
            key={`cluster-${c.code}`}
            style={{
              position: 'absolute',
              left: c.sx,
              top: c.sy,
              transform: 'translate(-50%, 18px)',
              whiteSpace: 'nowrap',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              background: 'color-mix(in srgb, var(--color-background, #faf9f6) 92%, transparent)',
              padding: '2px 6px',
              borderRadius: 2,
              borderLeft: `2px solid ${c.color}`,
              color: 'var(--color-text-muted, #6b6b6b)',
            }}
          >
            <span style={{ color: c.color, fontWeight: 700, marginRight: 5 }}>{c.code}</span>
            {c.label}
          </div>
        ))}
        {renderedLabels.map((l) => (
          <div
            key={l.id}
            style={{
              position: 'absolute',
              left: l.sx,
              top: l.sy,
              transform: 'translate(-50%, calc(-100% - 6px))',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 11,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              color: 'var(--color-text, #1a1a1a)',
              background: 'color-mix(in srgb, var(--color-background, #faf9f6) 88%, transparent)',
              padding: '1px 5px',
              borderRadius: 2,
              borderLeft: `2px solid ${l.color}`,
            }}
          >
            {l.label}
            {band === 'star' && l.riskScore !== undefined && (
              <span style={{ marginLeft: 6, color: l.color, fontVariantNumeric: 'tabular-nums' }}>
                · {Math.round(l.riskScore * 100)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CanvasConstellation
