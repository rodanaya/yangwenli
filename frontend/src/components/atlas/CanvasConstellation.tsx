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
import { RISK_COLORS } from '@/lib/constants'
import { formatVendorName } from '@/lib/vendor/formatName'

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
      rebuildQuadtree()
      draw()
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
        let next = event.transform
        // 2026-05-21 — at galaxy zoom (k near 1) the user expects the 7-cluster
        // layout to stay centered; an accidental drag at the macro view used
        // to shift the constellation off-center with no snap-back. Instead
        // of filtering out mousedown (which also killed cluster clicks),
        // we re-anchor the translate component to identity whenever k is
        // close to 1. Wheel zoom + drag-pan at deeper zoom levels work
        // normally. Cluster click hit-testing is unaffected because the
        // native click pipeline never runs through this branch.
        if (next.k <= 1.05 && (next.x !== 0 || next.y !== 0)) {
          next = zoomIdentity
          // Sync d3-zoom's internal state so the next event starts from
          // identity, otherwise it would re-emit the drifted transform.
          select(canvas).property('__zoom', next)
        }
        transformRef.current = next
        const newBand = bandFor(next.k)
        setBand((prev) => (prev === newBand ? prev : newBand))
        draw()
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

    // Optional: subtle background paint? Keep transparent so the host can
    // place its own backdrop (Bible §4 — engine stays presentation-neutral).

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

    // Year-change tween: fade out dots that were present in the previous
    // frame but are GONE from the current dots array. Drawn at neutral
    // riskLevel="medium" radius since we don't keep the full prev object.
    if (tweenProg < 1 && prevMap) {
      const currentIds = new Set(dots.map((d) => d.id))
      const fadeOutAlpha = 1 - tweenEased
      if (fadeOutAlpha > 0.01) {
        for (const [id, prev] of prevMap) {
          if (currentIds.has(id)) continue
          const sx = prev.x * w * k + t.x
          const sy = prev.y * h * k + t.y
          if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue
          ctx.beginPath()
          ctx.arc(sx, sy, 1.6, 0, TAU)
          ctx.fillStyle = RISK_COLORS.medium
          ctx.globalAlpha = fadeOutAlpha * 0.5
          ctx.fill()
        }
      }
    }
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
