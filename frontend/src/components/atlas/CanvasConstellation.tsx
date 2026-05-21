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
): TransitionLikeSelection<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((sel as any).transition().duration(duration)) as TransitionLikeSelection<T>
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
  /** Fired on hover enter/leave. Null on leave. */
  onDotHover?: (dot: ConstellationDot | null) => void
  /** Fired when a cluster attractor itself is clicked (NOT a dot). */
  onClusterClick?: (cluster: ConstellationCluster) => void
  /** Fired with the new zoom level + computed band on every zoom event. */
  onZoomChange?: (info: { zoom: number; band: ConstellationBand }) => void
  /** Caller-provided ref — set to a fn that flies to the named cluster. */
  flyToClusterRef?: React.MutableRefObject<FlyToClusterFn | null>
  /** Caller-provided ref — set to a fn that resets to identity transform. */
  resetViewRef?: React.MutableRefObject<ResetViewFn | null>
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

  // Band lives as React state so labels rerender at threshold crossings.
  const [band, setBand] = useState<ConstellationBand>(() => bandFor(initialZoom))
  const [, forceLabelTick] = useState(0)

  /** Re-pick which labels to render based on current band + transform. */
  const labelsToRender = useMemo<ConstellationDot[]>(() => {
    if (band === 'constellation') return []
    const named = dots.filter((d) => d.name)
    // Sort by risk score desc so top-T1 wins collisions.
    const sorted = [...named].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    const cap = band === 'region' ? Math.ceil(sorted.length * 0.5) : sorted.length
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
    return () => ro.disconnect()
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

  useEffect(() => {
    rebuildQuadtree()
    draw()
    forceLabelTick((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dots, rebuildQuadtree])

  // — d3-zoom hookup —
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sel: Selection<HTMLCanvasElement, unknown, null, undefined> = select(canvas)

    const zoomBehavior = d3zoom<HTMLCanvasElement, unknown>()
      .scaleExtent(SCALE_EXTENT)
      .on('zoom', (event) => {
        transformRef.current = event.transform
        const newBand = bandFor(event.transform.k)
        setBand((prev) => (prev === newBand ? prev : newBand))
        draw()
        forceLabelTick((n) => n + 1)
        onZoomChange?.({ zoom: event.transform.k, band: newBand })
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
      withTransition(select(canvas), 600).call(zb.transform, target)
    }
    return () => {
      if (flyToClusterRef) flyToClusterRef.current = null
    }
  }, [clusters, flyToClusterRef])

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
      onDotHover?.(found ?? null)
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
    const found = qt.find(ix, iy, hitR)
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
  }, [onDotClick, onClusterClick, clusters])

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

    ctx.clearRect(0, 0, w, h)

    // Optional: subtle background paint? Keep transparent so the host can
    // place its own backdrop (Bible §4 — engine stays presentation-neutral).

    // Dots
    for (const d of dots) {
      const sx = d.x * w * k + t.x
      const sy = d.y * h * k + t.y
      // Cull off-screen (with a small margin).
      if (sx < -20 || sy < -20 || sx > w + 20 || sy > h + 20) continue

      let radius = RISK_BASE_RADIUS[d.riskLevel]
      if (d.isOutlier) radius *= 1.8
      // LOD: nudge radius up at deeper bands.
      if (k >= 12) radius *= 1.35
      else if (k >= 4) radius *= 1.15

      // Opacity composition.
      let alpha = 1
      if (riskFloor !== 'all' && RISK_ORDER[d.riskLevel] < floorOrder) alpha *= 0.18
      if (pinnedClusterCode && d.clusterCode && d.clusterCode !== pinnedClusterCode) alpha *= 0.18

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
    if (band === 'constellation' || cssW === 0 || cssH === 0) return []
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
