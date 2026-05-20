/**
 * AtlasZoomLayer — semantic zoom wrapper for the investigator console.
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § 2.3, § 5.2, § 5.3
 * Build: atlas-C-P2
 *
 * Wraps <ConcentrationConstellation> in an outer <g> that owns the SVG
 * translate+scale transform for semantic zoom. The constellation engine
 * itself is NOT modified — only the transform layer around it changes.
 *
 * When zoomedCluster is null → identity transform (scale 1, no translate).
 * When zoomedCluster is set  → 600ms cubic-bezier(0.22, 1, 0.36, 1) zoom
 *   to 2.4× centered on the cluster's attractor coords (fx, fy fractions
 *   of FIELD_W × FIELD_H, mirrored from ConcentrationConstellation.tsx).
 *
 * Vendor-level dots (§ 2.4) materialize over the zoomed constellation as
 * a separate SVG overlay. P3 will connect them to real data; P2 uses
 * deterministic mock dots from useVendorLevelDots.
 *
 * Click-outside (on the field border rect) dispatches escape-zoom.
 * Cluster click dispatches zoom-into-cluster.
 * ESC is handled in AtlasShell (§ 2.5).
 *
 * Pointer events stay ON during zoom (Mapbox flyTo model — user can
 * interact with the constellation while it animates).
 */

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConcentrationConstellation } from '@/components/charts/ConcentrationConstellation'
import type {
  ConstellationMode,
  ConstellationRiskRow,
  ClusterMeta,
  NamedVendorDot,
} from '@/components/charts/ConcentrationConstellation'
import { useAtlasState, useAtlasDispatch } from './AtlasContext'
import type { AtlasAction } from './AtlasContext'
import { useVendorLevelDots } from '@/lib/atlas/use-vendor-level-dots'
import { useAtlasLOD, atlasLODBandLabel, type AtlasLOD } from '@/lib/atlas/useAtlasLOD'
import { getRiskLevelFromScore, RISK_COLORS } from '@/lib/constants'
import { AtlasBreadcrumb } from './AtlasBreadcrumb'
import { ClusterFloatingCard } from './ClusterFloatingCard'
import { AtlasVendorDrawer } from './AtlasVendorDrawer'
import { VendorHaloCard } from './VendorHaloCard'

// ── Constellation layout constants (must mirror ConcentrationConstellation.tsx) ──
// 2026-05-09: SVG_H bumped 220 → 540 to give the constellation real
// canvas. Must stay in sync with ConcentrationConstellation.tsx and
// the spatial-nav components — the pre-zoom transform math depends on
// the exact SVG_W/SVG_H pair below.
const SVG_W = 840
const SVG_H = 540
const PAD_L = 16
const PAD_R = 200
const PAD_T = 16
const PAD_B = 28
const FIELD_W = SVG_W - PAD_L - PAD_R
const FIELD_H = SVG_H - PAD_T - PAD_B

// Zoom parameters — per plan § 2.3
// 2026-05-08: bumped from 2.4× to 3.6× — at 2.4× the cluster only fills ~40%
// of the viewport, so dots scattered by Halton draw still look "spread out"
// rather than centralised. 3.6× pulls the active attractor much closer to
// the centre and leaves room for user wheel-zoom on top.
const ZOOM_SCALE = 3.6
const ZOOM_TRANSITION = 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)'

// User-driven zoom multiplier bounds (composed with ZOOM_SCALE)
const USER_ZOOM_MIN = 0.6   // can zoom out to ~2.16× total
// 2026-05-19 (telescope): unlocked from 2.5 → 15. Composed max becomes
// 3.6 × 15 = 54×, enabling the "fly into a star" experience. Counter-scaled
// labels + LOD bands keep typography readable across the whole range.
const USER_ZOOM_MAX = 15    // can zoom in to 54× total
// Wheel step is now interpreted exponentially (Math.exp(delta)) so the
// perceptual zoom rate stays constant across the range. Halved from 0.0015
// to 0.00075 — exp() curves feel hotter than linear at the same coefficient.
const WHEEL_ZOOM_STEP = 0.00075 // wheel deltaY → exp() zoom multiplier delta

// Dot radius by risk level when zoomed in.
// 2026-05-08: bumped 3-4× from previous values (was 2.4/1.7/1.2/0.7).
// User report on /atlas: "instead of giving me a closer look and seeing
// more dots it just zooms in and doesn't do anything." The vendor-level
// dots WERE rendering correctly but at sub-pixel sizes (r=0.7 at viewBox
// 840-wide ≈ 1px on screen) — invisible. The overlay also dims the
// constellation lattice via CSS so the vendor dots dominate the zoomed
// view, matching the "more dots, more detail" mental model.
const VENDOR_DOT_STYLE: Record<string, { r: number; opacity: number }> = {
  critical: { r: 8.0, opacity: 1.00 },
  high:     { r: 6.0, opacity: 0.92 },
  medium:   { r: 4.5, opacity: 0.82 },
  low:      { r: 3.0, opacity: 0.65 },
}

// Small numeric clamp helper for counter-scaled font sizes (telescope LOD).
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// Attractor coordinate map — derives attractor centre (cx, cy) in viewport space
// from the canonical (fx, fy) fractions in ClusterMeta.
function attractorToViewport(fx: number, fy: number): { cx: number; cy: number } {
  return {
    cx: PAD_L + fx * FIELD_W,
    cy: PAD_T + fy * FIELD_H,
  }
}

// Compute the SVG transform for a zoomed cluster
function computeZoomTransform(
  fx: number,
  fy: number,
): { tx: number; ty: number; s: number } {
  const { cx, cy } = attractorToViewport(fx, fy)
  const s = ZOOM_SCALE
  // Centre the attractor under the chart centre after scaling
  const tx = SVG_W / 2 - cx * s
  const ty = SVG_H / 2 - cy * s
  return { tx, ty, s }
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AtlasZoomLayerProps {
  /** Forwarded to ConcentrationConstellation */
  mode: ConstellationMode
  rows: ConstellationRiskRow[]
  totalContracts: number
  metaOverride?: ClusterMeta[]
  seedOverride?: number
  pinnedCode?: string | null
  lang: 'en' | 'es'
  /** The active cluster meta array — used to look up attractor coords for zoom */
  activeMeta: ClusterMeta[]
  /**
   * Optional bridge callback fired on every cluster click BEFORE zoom dispatches.
   * Used by Atlas.tsx during the P1→P3 transitional period to keep
   * selectedClusterCode in sync with the old ClusterDetailPanel modal.
   * P3 removes this once the modal is replaced by the right panel.
   */
  onClusterClickBridge?: (clusterCode: string) => void
  /**
   * omega-N N1: named vendor outlier dots — passed through to ConcentrationConstellation.
   * Top critical vendors per cluster rendered as large labeled dots.
   */
  namedVendors?: NamedVendorDot[]
  /**
   * omega-N N2: clusters to highlight — others dim to 0.15.
   * Driven by AtlasStoryBinding based on the active chapter's pinnedCode.
   */
  highlightedClusterCodes?: string[]
  /**
   * 2026-05-09 spatial-nav Phase 1.3: when true AND `mode === 'sectors'`,
   * cluster click escalates from the legacy zoom-into-cluster (CSS scale)
   * to drill-into-sector (real Z1 sub-constellation render). Off by default
   * so existing /atlas behavior is unchanged. Toggled by /atlas?z1=true.
   */
  z1Enabled?: boolean
  /**
   * Required when `z1Enabled` is true and `mode === 'sectors'` so
   * AtlasZoomLayer can resolve a sector code to its numeric id (the
   * payload the drill-into-sector reducer needs).
   */
  resolveSectorId?: (code: string) => number | null
}

// ── AtlasZoomLayer ────────────────────────────────────────────────────────────

export function AtlasZoomLayer({
  mode,
  rows,
  totalContracts,
  metaOverride,
  seedOverride,
  pinnedCode,
  lang,
  activeMeta,
  onClusterClickBridge,
  namedVendors,
  highlightedClusterCodes,
  z1Enabled = false,
  resolveSectorId,
}: AtlasZoomLayerProps) {
  const state = useAtlasState()
  const dispatch = useAtlasDispatch()

  const zoomedCode = state.view.kind === 'zoomed-cluster' ? state.view.code : null
  const isZoomed = zoomedCode !== null

  // Find the attractor for the zoomed cluster
  const zoomedMeta = useMemo(() => {
    if (!zoomedCode) return null
    return activeMeta.find((m) => m.code === zoomedCode) ?? null
  }, [zoomedCode, activeMeta])

  // Compute the SVG transform
  const transform = useMemo(() => {
    if (!zoomedMeta) return { tx: 0, ty: 0, s: 1 }
    return computeZoomTransform(zoomedMeta.fx, zoomedMeta.fy)
  }, [zoomedMeta])

  // Vendor-level mock dots for the zoomed cluster
  const vendorDotCount = zoomedMeta?.t1 ?? 0
  const vendorDots = useVendorLevelDots(mode, zoomedCode, vendorDotCount)

  // Track whether the animation is in-flight so we can suppress
  // the vendor dot overlay during the transition (avoids flash of
  // unscaled dots on top of the pre-zoom field)
  const isAnimatingRef = useRef(false)

  // ── User pan + wheel-zoom (2026-05-08) ─────────────────────────────────────
  // Pan offset (in SVG viewport pixels) and user-driven zoom multiplier are
  // applied ON TOP of the cluster-centric base transform. Both reset to 0/1
  // whenever the active zoomedCode changes (or zoom escapes).
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [userZoom, setUserZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  // M-OBS P2 hotfix #2: cluster card is dismissible without exiting zoom.
  // Resets to open whenever the active cluster changes (or zoom exits).
  const [cardOpen, setCardOpen] = useState(true)
  const isDraggingCommittedRef = useRef(false)
  const dragStateRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // Refs mirror the latest committed state so wheel handlers can read the
  // current value synchronously — avoids the StrictMode double-invoke of
  // functional setState updaters that would queue pan corrections twice.
  const userZoomRef = useRef(userZoom)
  const panOffsetRef = useRef(panOffset)
  useEffect(() => { userZoomRef.current = userZoom }, [userZoom])
  useEffect(() => { panOffsetRef.current = panOffset }, [panOffset])

  // Distance threshold — below this a mousedown+mouseup sequence is a click, not a drag
  const DRAG_THRESHOLD = 6 // px in screen space

  // Reset pan/zoom whenever the active cluster changes (or zoom exits).
  // Also re-open the floating card so each new zoom starts with the card visible.
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 })
    setUserZoom(1)
    setCardOpen(true)
  }, [zoomedCode])

  // Convert a screen-space pixel delta to SVG-viewport pixel delta
  const screenToSvgScale = useCallback(() => {
    const el = wrapperRef.current
    if (!el) return 1
    const rect = el.getBoundingClientRect()
    if (rect.width === 0) return 1
    return SVG_W / rect.width
  }, [])

  const handlePanMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isZoomed) return
    // Don't start drag on right-click or modifier keys
    if (e.button !== 0 || e.shiftKey) return
    // Record start position but do NOT preventDefault/stopPropagation yet.
    // The drag is committed in onMove only after DRAG_THRESHOLD is exceeded,
    // so plain clicks on vendor dots pass through normally.
    isDraggingCommittedRef.current = false
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: panOffset.x,
      baseY: panOffset.y,
    }
  }, [isZoomed, panOffset])

  // Window-level mousemove/mouseup so dragging continues if cursor leaves the
  // wrapper (Mapbox-style — drag doesn't break when you cross the chart edge).
  // Only attaches when dragStateRef has a pending start (set by handlePanMouseDown).
  // Drag is committed only after the pointer moves > DRAG_THRESHOLD px.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragStateRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (!isDraggingCommittedRef.current) {
        if (dist < DRAG_THRESHOLD) return // still below threshold — treat as click
        // Cross the threshold — commit to drag
        isDraggingCommittedRef.current = true
        setIsDragging(true)
      }
      const scale = screenToSvgScale()
      // Pan moves in original SVG coords; we want screen-pixel feel, so
      // multiply the screen delta by SVG/screen ratio
      setPanOffset({ x: drag.baseX + dx * scale, y: drag.baseY + dy * scale })
    }
    const onUp = () => {
      dragStateRef.current = null
      isDraggingCommittedRef.current = false
      setIsDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [screenToSvgScale])

  // Wheel zoom — only active when zoomed. Scrolling up zooms in.
  // BUG-FIX (2026-05-19): zoom is now anchored to the cursor position.
  // Previously we only updated `userZoom` and left `panOffset` alone — but
  // the transform uses `transform-origin: 0 0`, so multiplying scale about
  // the origin pushed content toward the bottom-right of the viewport. The
  // cluster drifted off-screen instead of zooming under the cursor, which
  // is what made the wheel feel non-functional. We now adjust `panOffset`
  // by the same amount the scale change would move the cursor-anchored
  // point, keeping that point pinned across the zoom step (Mapbox /
  // Google Maps wheel-zoom model).
  // Attached to window (not wrapperRef) so ClusterDetailPanel's fixed z-50
  // overlay doesn't swallow wheel events when it visually overlaps the canvas.
  useEffect(() => {
    if (!isZoomed) return
    const el = wrapperRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect()
      if (e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top  || e.clientY > rect.bottom) return
      e.preventDefault()
      const delta = -e.deltaY * WHEEL_ZOOM_STEP

      // 2026-05-19 (telescope-anchor + StrictMode fix): zoom is anchored on
      // the CLUSTER CENTER (canvas midpoint post-base-zoom). Cursor anchoring
      // over-shoots in a small pane; cluster anchoring matches the telescope
      // mental model. Read current state via refs so we don't nest
      // setPanOffset inside setUserZoom's functional updater — React's
      // StrictMode runs functional updaters twice in dev, which would queue
      // pan twice per tick (the 2× over-shoot we observed before).
      const prevUserZoom = userZoomRef.current
      const proposed = prevUserZoom * Math.exp(delta)
      const nextUserZoom = Math.max(USER_ZOOM_MIN, Math.min(USER_ZOOM_MAX, proposed))
      if (nextUserZoom === prevUserZoom) return
      const scalePrev = transform.s * prevUserZoom
      const scaleNext = transform.s * nextUserZoom
      const anchorSvgX = SVG_W / 2
      const anchorSvgY = SVG_H / 2
      const prevPan = panOffsetRef.current
      const origX = (anchorSvgX - transform.tx - prevPan.x) / scalePrev
      const origY = (anchorSvgY - transform.ty - prevPan.y) / scalePrev
      const nextPan = {
        x: anchorSvgX - transform.tx - origX * scaleNext,
        y: anchorSvgY - transform.ty - origY * scaleNext,
      }
      // Update refs synchronously so a rapid second wheel tick (before React
      // commits) reads the just-computed values, not the stale state.
      userZoomRef.current = nextUserZoom
      panOffsetRef.current = nextPan
      setUserZoom(nextUserZoom)
      setPanOffset(nextPan)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [isZoomed, transform])

  // ── Keyboard-driven zoom/pan (M-OBS Phase 2) ──────────────────────────────
  // AtlasShell broadcasts `atlas:zoom-in`, `atlas:zoom-out`, `atlas:zoom-reset`
  // and `atlas:pan-{up|down|left|right}` window events when the user presses
  // +/-/0 or the arrow keys. Mirror the wheel-zoom math so + and wheel feel
  // identical; pan in SVG-units steps of ±40.
  useEffect(() => {
    if (!isZoomed) return
    const PAN_STEP = 40
    const onZoomIn = () => {
      const next = Math.min(USER_ZOOM_MAX, userZoomRef.current * 1.2)
      if (next === userZoomRef.current) return
      userZoomRef.current = next
      setUserZoom(next)
    }
    const onZoomOut = () => {
      const next = Math.max(USER_ZOOM_MIN, userZoomRef.current * 0.83)
      if (next === userZoomRef.current) return
      userZoomRef.current = next
      setUserZoom(next)
    }
    const onZoomReset = () => {
      userZoomRef.current = 1
      panOffsetRef.current = { x: 0, y: 0 }
      setUserZoom(1)
      setPanOffset({ x: 0, y: 0 })
    }
    const pan = (dx: number, dy: number) => {
      const next = {
        x: panOffsetRef.current.x + dx,
        y: panOffsetRef.current.y + dy,
      }
      panOffsetRef.current = next
      setPanOffset(next)
    }
    const onPanUp    = () => pan(0,  PAN_STEP)
    const onPanDown  = () => pan(0, -PAN_STEP)
    const onPanLeft  = () => pan(PAN_STEP, 0)
    const onPanRight = () => pan(-PAN_STEP, 0)

    window.addEventListener('atlas:zoom-in', onZoomIn)
    window.addEventListener('atlas:zoom-out', onZoomOut)
    window.addEventListener('atlas:zoom-reset', onZoomReset)
    window.addEventListener('atlas:pan-up', onPanUp)
    window.addEventListener('atlas:pan-down', onPanDown)
    window.addEventListener('atlas:pan-left', onPanLeft)
    window.addEventListener('atlas:pan-right', onPanRight)
    return () => {
      window.removeEventListener('atlas:zoom-in', onZoomIn)
      window.removeEventListener('atlas:zoom-out', onZoomOut)
      window.removeEventListener('atlas:zoom-reset', onZoomReset)
      window.removeEventListener('atlas:pan-up', onPanUp)
      window.removeEventListener('atlas:pan-down', onPanDown)
      window.removeEventListener('atlas:pan-left', onPanLeft)
      window.removeEventListener('atlas:pan-right', onPanRight)
    }
  }, [isZoomed])

  // Cluster click handler — dispatches zoom-into-cluster (legacy) OR
  // drill-into-sector (spatial nav Z1) depending on `z1Enabled` + lens.
  const handleClusterClick = (clusterCode: string) => {
    // Bridge to Atlas.tsx's selectedClusterCode for the old ClusterDetailPanel
    // (removed in P3; tolerated during P1→P3 transitional period)
    onClusterClickBridge?.(clusterCode)
    isAnimatingRef.current = true

    // 2026-05-09 spatial-nav Phase 1.3 escalation. When the feature flag
    // is on and the user is viewing the sectors lens, the click drills
    // into Z1 (real institution sub-constellation) instead of the
    // legacy CSS-scale zoom-into-cluster.
    if (z1Enabled && mode === 'sectors' && resolveSectorId) {
      const sectorId = resolveSectorId(clusterCode)
      if (sectorId !== null) {
        dispatch({ type: 'drill-into-sector', sectorCode: clusterCode, sectorId })
        setTimeout(() => { isAnimatingRef.current = false }, 640)
        return
      }
    }

    dispatch({ type: 'zoom-into-cluster', code: clusterCode })
    // Animation duration matches the CSS transition (600ms)
    setTimeout(() => { isAnimatingRef.current = false }, 640)
  }

  // Click-outside handler — dispatches escape-zoom when zoomed.
  // Suppress when the user just finished a drag (so panning doesn't escape).
  const handleFieldClick = () => {
    if (isDraggingCommittedRef.current) return
    if (isDragging) return
    if (isZoomed) {
      dispatch({ type: 'escape-zoom' })
    }
  }

  // Compose base zoom transform with user pan + user wheel-zoom
  const effectiveScale = transform.s * (isZoomed ? userZoom : 1)
  const effectiveTx = transform.tx + (isZoomed ? panOffset.x : 0)
  const effectiveTy = transform.ty + (isZoomed ? panOffset.y : 0)

  // ── Telescope: LOD band + counter-scaled label sizes (2026-05-19) ─────────
  // BUG-FIX (2026-05-19): the previous formula `clamp(11/sqrt(s), 8, 16)` was
  // expressed in SVG-unit px, but the parent div is `transform: scale(s)`, so
  // the on-screen size = svg_px × s. At s=3.6× a "regular" 8svg-px label
  // rendered at 28.8 screen-px (the constraint that should keep small labels
  // legible instead amplified them). The inverse formulation below picks a
  // desired *screen* size that grows slowly with zoom (log2 curve), then
  // divides by the current scale so that scale × svg_px = desired_screen_px.
  const lod = useAtlasLOD(effectiveScale)
  const desiredScreenPx = (s: number) =>
    clamp(10 + Math.log2(Math.max(s, 1)) * 1.0, 10, 15)
  const labelSvgPx = (s: number) => desiredScreenPx(s) / Math.max(s, 0.01)
  const labelFontPx = labelSvgPx(effectiveScale)
  // At extreme zoom the lattice should fade further so the star-band reads
  // cleanly against the labeled dots.
  const latticeOpacity = effectiveScale > 12 ? 0.18 : 0.45

  const transformStr =
    effectiveScale === 1 && effectiveTx === 0 && effectiveTy === 0
      ? 'translate(0px, 0px) scale(1)'
      : `translate(${effectiveTx}px, ${effectiveTy}px) scale(${effectiveScale})`

  // Disable the smooth CSS transition during user pan/zoom so dragging feels direct.
  // The 600ms ease only runs on the initial zoom-in animation.
  const transitionStr = isDragging || (isZoomed && userZoom !== 1) ? 'none' : ZOOM_TRANSITION

  // ── M-OBS Phase 2 chrome — breadcrumb + floating cluster card ──────────────
  // Mounted inside the canvas wrapper so they share the constellation's
  // stacking context. They appear ONLY while zoomed; on escape-zoom the
  // canvas returns to the unchromed galaxy state.
  const lensLabelMap: Record<ConstellationMode, { en: string; es: string }> = {
    patterns:   { en: 'Patterns',   es: 'Patrones' },
    sectors:    { en: 'Sectors',    es: 'Sectores' },
    categories: { en: 'Categories', es: 'Categorías' },
    sexenios:   { en: 'Terms',      es: 'Sexenios' },
  }
  const lensLabel = lensLabelMap[mode]?.[lang] ?? mode
  const clusterLabel = zoomedMeta ? `${zoomedMeta.code} ${zoomedMeta.label}` : ''
  const clusterVendors = (zoomedCode && namedVendors)
    ? namedVendors.filter((n) => n.clusterCode === zoomedCode)
    : []
  const topVendors = clusterVendors.slice(0, 3)

  return (
    <div
      className="relative"
      style={{ position: 'relative' }}
    >
      {/* ── M-OBS P2 breadcrumb — context strip at top of canvas ─────────────── */}
      {isZoomed && zoomedMeta && (
        <AtlasBreadcrumb
          lang={lang}
          lensLabel={lensLabel}
          clusterLabel={clusterLabel}
          onGoHome={() => dispatch({ type: 'escape-zoom' })}
        />
      )}

      {/* ── SVG overlay container — wraps the constellation in a transform layer ── */}
      {/*
        We can't wrap the constellation's internal <svg> in another <g> because
        the constellation owns its own <svg> element. Instead we apply a CSS
        transform to the wrapping div, which the browser composites efficiently
        on the GPU — equivalent to the SVG <g transform> described in the plan.

        The wrapper div is overflow:hidden so the zoomed-out field crop works.
        The constellation is allowed to overflow its container during zoom
        (the clip is on the outer div).
      */}
      {/* 2026-05-08: when zoomed, counter-scale the constellation's <text>
          elements. The CSS transform on the inner div scales EVERYTHING
          including text (9–13px labels become 32–47px at 3.6× zoom and
          dominate the view). User report: "the names of the constellations,
          the names of the companies are too big and they occupy most of
          the space." Inline <style> targets the constellation root we
          opt-in via `data-atlas-constellation`, applying counter-scaled
          font sizes only when the wrapper is in zoomed state. */}
      {isZoomed && (
        <style>{`
          /* Telescope (2026-05-19): font sizes are now computed from
             effectiveScale via sqrt() counter-scale and clamped, so labels
             stay readable across the 3.6×–54× range without !important. */
          [data-atlas-zoom-layer="true"] [data-atlas-constellation] text {
            font-size: ${labelFontPx.toFixed(2)}px;
          }
          /* Lattice dimming follows the LOD band — secondary at region
             (0.45), nearly absent at star (0.18) so vendor labels read. */
          [data-atlas-zoom-layer="true"] [data-atlas-constellation] circle {
            opacity: ${latticeOpacity};
          }
          /* BUG-FIX (2026-05-19): hide the engine's own named-vendor labels
             when zoomed — they belong to OTHER clusters and the 3.6× transform
             pushes them to wrong screen positions. VendorDotOverlay is the
             sole label authority during zoom. Keep the named-vendor circles
             visible but muted so they read as background context only. */
          [data-atlas-zoom-layer="true"] [data-atlas-constellation] text.atlas-named-vendor-label {
            display: none;
          }
          [data-atlas-zoom-layer="true"] [data-atlas-constellation] circle[data-named-vendor="true"] {
            opacity: 0.35;
          }
          /* Replacement 5 (M-OBS Phase 1, PEPPY 2026-05-19): cross-cluster bleed
             — when zoomed into a single cluster, hide all OTHER cluster <g>
             groups so their attractor rings, labels, and dots don't bleed into
             the active cluster's view. The active cluster (matching zoomedCode)
             stays fully opaque. */
          [data-atlas-zoom-layer="true"] [data-atlas-constellation] g[data-cluster-code]:not([data-cluster-code="${zoomedCode ?? ''}"]) {
            opacity: 0;
            pointer-events: none;
          }
          /* M-OBS Phase 2 hotfix (2026-05-19): hide the engine's hover preview
             tooltip when zoomed — the new ClusterFloatingCard is the sole
             cluster-context UI during zoom. Without this rule the hover preview
             (e.g. "3,985 vendors · 180 T1 · → View detail") competes with the
             floating card and creates duplicate stats. */
          [data-atlas-zoom-layer="true"] [data-cluster-hover-preview="true"] {
            display: none;
          }
        `}</style>
      )}
      <div
        ref={wrapperRef}
        data-atlas-zoom-layer={isZoomed ? 'true' : 'false'}
        style={{
          overflow: 'hidden',
          position: 'relative',
          cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'crosshair',
          // Click-outside: if zoomed and user clicks the container (background)
          // but NOT a vendor dot or the constellation clusters, escape zoom.
          touchAction: isZoomed ? 'none' : undefined,
        }}
        onClick={handleFieldClick}
        onMouseDown={handlePanMouseDown}
      >
        {/* Single transform layer — full constellation pans together with drag.
            This gives natural map-pan feel: the whole star field moves as a unit. */}
        <div
          style={{
            transform: transformStr,
            transformOrigin: '0 0',
            transition: transitionStr,
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ConcentrationConstellation
            mode={mode}
            rows={rows}
            totalContracts={totalContracts}
            metaOverride={metaOverride}
            seedOverride={seedOverride}
            pinnedCode={pinnedCode}
            namedVendors={namedVendors}
            highlightedClusterCodes={highlightedClusterCodes}
            onClusterClick={handleClusterClick}
          />
        </div>

        {/* ── Cluster hover-circle overlay — transparent hit areas on each attractor ── */}
        {/* Only active when NOT zoomed, so cluster clicks still reach the constellation. */}
        {!isZoomed && (
          <ClusterHoverOverlay
            activeMeta={activeMeta}
            dispatch={dispatch}
            onClusterClick={handleClusterClick}
          />
        )}

        {/* ── Vendor-level dot overlay — visible only when zoomed ───────
            BUG-FIX (2026-05-19): pass the COMPOSED transform (base cluster
            zoom + user pan + user wheel-zoom) rather than the base transform
            alone. Previously the overlay used `transform={transform}` (base
            only), so vendor dots stayed pinned while everything inside the
            constellation SVG (rings, labels, named-vendor labels) panned
            and wheel-zoomed with the user. That produced the "labels float
            independently from dots" desync and made wheel-zoom appear to
            do nothing to the dots the user cares about. */}
        {isZoomed && zoomedMeta && (
          <VendorDotOverlay
            dots={vendorDots}
            transform={{ tx: effectiveTx, ty: effectiveTy, s: effectiveScale }}
            lang={lang}
            selection={state.selection}
            dispatch={dispatch}
            lod={lod}
          />
        )}
      </div>

      {!isZoomed && (
        <div
          className="font-mono text-[9px] uppercase tracking-widest text-center py-1"
          style={{ color: 'var(--color-text-muted)', letterSpacing: '0.14em' }}
        >
          click a cluster · then drag to pan · scroll to zoom
        </div>
      )}

      {/* ── M-OBS P2 floating cluster card — top-right of canvas ─────────────
          Dismissible without losing zoom: ✕ collapses the card to a compact
          chip; clicking the chip re-expands it. Zoom state is unaffected.
          (escape-zoom is reserved for ESC key / breadcrumb back). */}
      {isZoomed && zoomedMeta && cardOpen && (
        <div
          className="absolute z-20 top-[38px] right-1 sm:top-11 sm:right-3"
          style={{ pointerEvents: 'auto' }}
        >
          <ClusterFloatingCard
            meta={zoomedMeta}
            topVendors={topVendors}
            onClose={() => setCardOpen(false)}
            lang={lang}
          />
        </div>
      )}
      {isZoomed && zoomedMeta && !cardOpen && (
        <button
          type="button"
          onClick={() => setCardOpen(true)}
          aria-label={lang === 'en' ? 'Show cluster card' : 'Mostrar tarjeta de clúster'}
          className="absolute z-20 top-[38px] right-1 sm:top-11 sm:right-3"
          style={{
            pointerEvents: 'auto',
            background: 'var(--color-background-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 2,
            padding: '4px 8px',
            fontSize: 10,
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          {zoomedMeta.code} · {lang === 'en' ? 'show' : 'mostrar'}
        </button>
      )}

      {/* ── M-OBS P3 vendor drawer — collapsible bottom strip ──────────────── */}
      {isZoomed && zoomedMeta && clusterVendors.length > 0 && (
        <AtlasVendorDrawer
          clusterCode={zoomedMeta.code}
          clusterLabel={zoomedMeta.label}
          vendors={clusterVendors}
          lang={lang}
        />
      )}

      {/* ── Zoom-active visual cue: subtle amber outline around container ── */}
      {isZoomed && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              border: '1.5px solid rgba(160, 104, 32, 0.40)',
              borderRadius: 2,
            }}
          />
          {/* Pan + wheel-zoom hint (bottom-left), and reset chip (bottom-right) */}
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              left: 8,
              pointerEvents: 'none',
              fontSize: 9,
              fontFamily: 'monospace',
              color: 'var(--color-text-muted)',
              opacity: 0.85,
              letterSpacing: 0.4,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span>
              {effectiveScale.toFixed(1)}× · {atlasLODBandLabel(lod.band, lang)}
            </span>
            <span>
              {lang === 'en'
                ? 'drag to pan · wheel to zoom · esc to exit'
                : 'arrastra para desplazar · rueda para acercar · esc para salir'}
            </span>
          </div>
          {(panOffset.x !== 0 || panOffset.y !== 0 || userZoom !== 1) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPanOffset({ x: 0, y: 0 })
                setUserZoom(1)
              }}
              style={{
                position: 'absolute',
                bottom: 6,
                right: 8,
                fontSize: 9,
                fontFamily: 'monospace',
                color: 'var(--color-text-muted)',
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid var(--color-border)',
                borderRadius: 2,
                padding: '2px 6px',
                cursor: 'pointer',
                letterSpacing: 0.4,
              }}
              aria-label={lang === 'en' ? 'Reset pan and zoom' : 'Reiniciar desplazamiento y zoom'}
            >
              {lang === 'en' ? 'reset view' : 'reiniciar vista'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── ClusterHoverOverlay ──────────────────────────────────────────────────────
// Transparent SVG circles positioned on each cluster's attractor centre.
// Fires hover-cluster actions so the right panel's HOVER_CLUSTER branch
// activates without touching the sacred ConcentrationConstellation engine.
// Hit area: 40px radius; constellation dots remain underneath and clickable.

interface ClusterHoverOverlayProps {
  activeMeta: ClusterMeta[]
  dispatch: React.Dispatch<AtlasAction>
  /**
   * 2026-05-07 fix — the overlay circles sit ON TOP of the constellation's
   * own click targets and (with `pointerEvents: 'auto'` for hover) absorb
   * clicks before they reach the underlying constellation. This callback
   * forwards the click to the same handler the constellation would have
   * received, so cluster-click works whether the user lands on the
   * underlying attractor hit-target or on this hover halo.
   */
  onClusterClick?: (clusterCode: string) => void
}

function ClusterHoverOverlay({ activeMeta, dispatch, onClusterClick }: ClusterHoverOverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ position: 'absolute', top: 0, left: 0 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {activeMeta.map((meta) => {
          const { cx, cy } = attractorToViewport(meta.fx, meta.fy)
          return (
            <circle
              key={meta.code}
              cx={cx}
              cy={cy}
              r={40}
              fill="transparent"
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              aria-label={`Cluster ${meta.code}`}
              role="button"
              tabIndex={0}
              onMouseEnter={() => dispatch({ type: 'hover-cluster', code: meta.code })}
              onMouseLeave={() => dispatch({ type: 'hover-cluster', code: null })}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClusterClick?.(meta.code)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onClusterClick?.(meta.code)
                }
              }}
            />
          )
        })}
      </svg>
    </div>
  )
}

// ── LassoRect — in original SVG viewport coordinates (pre-transform) ─────────
interface LassoRect {
  x0: number; y0: number; x1: number; y1: number
}

// Convert a screen-space point back to original SVG viewport coordinates
// by reversing the transform: orig = (screen - tx) / s
function screenToSVG(sx: number, sy: number, transform: { tx: number; ty: number; s: number }) {
  return {
    ox: (sx - transform.tx) / transform.s,
    oy: (sy - transform.ty) / transform.s,
  }
}

// ── VendorDotOverlay ─────────────────────────────────────────────────────────
//
// Handles:
//   • Dot click → dispatch toggle-vendor-selection (always; no navigation on dots)
//   • Selection halos — stroke ring using RISK_COLORS for the dot's risk level
//   • Shift+drag → rectangular lasso, dispatches lasso-select on mouseup
//   • ESC during lasso → cancel
//
// Lasso math:
//   Mouse events on the overlay SVG give screen-space coords relative to the
//   overlay element. The dots' x/y are in original SVG viewport space (pre-zoom).
//   We convert lasso rect from screen-space back to original space by reversing
//   the CSS transform: orig = (screen - tx) / s.
//   Then dot inclusion: dot.x in [min(rx0,rx1), max(rx0,rx1)] etc.

interface VendorDotOverlayProps {
  dots: ReturnType<typeof useVendorLevelDots>
  transform: { tx: number; ty: number; s: number }
  lang: 'en' | 'es'
  selection: Set<string>
  dispatch: React.Dispatch<AtlasAction>
  lod: AtlasLOD
}

function VendorDotOverlay({
  dots,
  transform,
  lang,
  selection,
  dispatch,
  lod,
}: VendorDotOverlayProps) {
  const navigate = useNavigate()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [lasso, setLasso] = useState<LassoRect | null>(null)
  const isDraggingRef = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)

  // ── Sub-pixel font fix (2026-05-19) ─────────────────────────────────────
  // VendorDotOverlay's <text> elements live OUTSIDE the CSS-transformed div
  // (this overlay is a sibling positioned absolute:inset-0 rendering its own
  // SVG). The parent CSS `transform: scale(effectiveScale)` does NOT apply
  // here — on-screen font size = svg_font × (wrapperPixelWidth / SVG_W).
  // Previously we received `labelFontPx` computed as `desiredScreen /
  // effectiveScale`, which is correct only for transformed labels. At the
  // typical wrapper width (268px → ratio 0.319 screen-px per svg-unit),
  // that value rendered overlay labels at ~0.8px — sub-pixel, invisible.
  //
  // Fix: track this SVG's real pixel width, derive svg-units per screen-px,
  // and convert a desired *screen* font size (LOD-aware curve based on
  // effectiveScale = transform.s) into the corresponding svg-unit value.
  const [svgPixelWidth, setSvgPixelWidth] = useState(SVG_W)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const update = () => setSvgPixelWidth(el.getBoundingClientRect().width || SVG_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const svgUnitsPerScreenPx = SVG_W / Math.max(svgPixelWidth, 1)
  const effectiveScale = transform.s
  // Desired ON-SCREEN size grows gently with zoom (telescope detail):
  // ~10px at constellation/region threshold, ~14px at star, capped 16.
  const desiredLabelScreenPx = Math.max(
    10,
    Math.min(16, 9 + Math.log2(Math.max(effectiveScale, 1)) * 1.2),
  )
  const overlayLabelFontSvgPx = desiredLabelScreenPx * svgUnitsPerScreenPx
  const overlayChipFontSvgPx = Math.max(1, (desiredLabelScreenPx - 1) * svgUnitsPerScreenPx)

  // The vendor dots are already in original viewport coordinates.
  // Apply the same transform as the constellation to place them correctly.
  const toScreen = useCallback((x: number, y: number) => ({
    sx: x * transform.s + transform.tx,
    sy: y * transform.s + transform.ty,
  }), [transform])

  // Get SVG-relative coordinates from a mouse event
  const getSVGCoords = useCallback((e: React.MouseEvent<SVGSVGElement> | MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return { sx: 0, sy: 0 }
    const rect = svg.getBoundingClientRect()
    // Scale from DOM pixels to SVG viewBox pixels
    const scaleX = SVG_W / rect.width
    const scaleY = SVG_H / rect.height
    return {
      sx: (e.clientX - rect.left) * scaleX,
      sy: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  // ESC cancels lasso
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDraggingRef.current) {
        isDraggingRef.current = false
        setLasso(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!e.shiftKey) return
    e.preventDefault()
    e.stopPropagation()
    const { sx, sy } = getSVGCoords(e)
    isDraggingRef.current = true
    setLasso({ x0: sx, y0: sy, x1: sx, y1: sy })
  }, [getSVGCoords])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return
    e.preventDefault()
    const { sx, sy } = getSVGCoords(e)
    setLasso((prev) => prev ? { ...prev, x1: sx, y1: sy } : null)
  }, [getSVGCoords])

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current || !lasso) return
    isDraggingRef.current = false

    // Convert lasso screen rect → original SVG viewport space
    const { ox: ox0, oy: oy0 } = screenToSVG(Math.min(lasso.x0, lasso.x1), Math.min(lasso.y0, lasso.y1), transform)
    const { ox: ox1, oy: oy1 } = screenToSVG(Math.max(lasso.x0, lasso.x1), Math.max(lasso.y0, lasso.y1), transform)

    const captured = dots
      .filter((d) => d.x >= ox0 && d.x <= ox1 && d.y >= oy0 && d.y <= oy1 && !d.isMock)
      .map((d) => d.id)

    if (captured.length > 0) {
      dispatch({ type: 'lasso-select', ids: captured, mode: 'union' })
    }
    setLasso(null)
    e.stopPropagation()
  }, [lasso, dots, transform, dispatch])

  const hoveredDot = dots.find((d) => d.id === hoveredId)

  // Lasso display rect in screen space
  const lassoScreenRect = lasso ? {
    x: Math.min(lasso.x0, lasso.x1),
    y: Math.min(lasso.y0, lasso.y1),
    w: Math.abs(lasso.x1 - lasso.x0),
    h: Math.abs(lasso.y1 - lasso.y0),
  } : null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          // Enable pointer events on the SVG itself so we can capture shift+drag
          pointerEvents: lasso !== null || isDraggingRef.current ? 'auto' : 'none',
          cursor: isDraggingRef.current ? 'crosshair' : undefined,
        }}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDraggingRef.current) {
            isDraggingRef.current = false
            setLasso(null)
          }
        }}
      >
        {dots.map((dot) => {
          const level = getRiskLevelFromScore(dot.riskScore)
          const style = VENDOR_DOT_STYLE[level] ?? VENDOR_DOT_STYLE.low
          const baseR = style.r * lod.dotScaleMultiplier
          const { sx, sy } = toScreen(dot.x, dot.y)
          const isHovered = dot.id === hoveredId
          const isSelected = !dot.isMock && selection.has(dot.id)
          const riskColor = RISK_COLORS[level]
          return (
            <g key={dot.id}>
              {/* Selection halo */}
              {isSelected && (
                <circle
                  cx={sx}
                  cy={sy}
                  r={baseR * 2.2}
                  fill="none"
                  stroke={riskColor}
                  strokeWidth={1.5}
                  opacity={1}
                  style={{ pointerEvents: 'none' }}
                />
              )}
              <circle
                cx={sx}
                cy={sy}
                r={isHovered || isSelected ? baseR * 1.6 : baseR}
                fill={dot.sectorColor}
                opacity={style.opacity}
                stroke={isHovered && !isSelected ? '#a06820' : 'none'}
                strokeWidth={isHovered && !isSelected ? 1.5 : 0}
                style={{ cursor: 'pointer', pointerEvents: 'auto', transition: 'r 120ms ease' }}
                data-vendor-id={dot.id}
                aria-label={`${dot.name} · ${(dot.riskScore * 100).toFixed(0)}%${isSelected ? (lang === 'en' ? ' · selected' : ' · seleccionado') : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!dot.isMock) {
                    dispatch({ type: 'toggle-vendor-selection', id: dot.id })
                    navigate(`/thread/${dot.id}`)
                  }
                }}
                onMouseEnter={() => setHoveredId(dot.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            </g>
          )
        })}

        {/* ── LOD labels (region + star bands) ────────────────────────────
            Render top (labelDensity × N) labels by riskScore desc, with
            per-frame greedy collision pruning. Cheap for ≤50 labels.
            TODO: VendorDot has no contractCount field today — when the P3+
            real-data swap arrives, surface `contractCount`/`n` on the dot
            shape and render the star-band count tspan below. */}
        {lod.labelDensity > 0 && (() => {
          const ranked = [...dots].sort((a, b) => b.riskScore - a.riskScore)
          const want = Math.ceil(ranked.length * lod.labelDensity)
          const candidates = ranked.slice(0, want)
          const placed: Array<{ x: number; y: number; w: number; h: number }> = []
          const out: React.ReactElement[] = []
          for (const dot of candidates) {
            const level = getRiskLevelFromScore(dot.riskScore)
            const style = VENDOR_DOT_STYLE[level] ?? VENDOR_DOT_STYLE.low
            const dotR = style.r * lod.dotScaleMultiplier
            const { sx, sy } = toScreen(dot.x, dot.y)
            const label = lod.showRiskChip
              ? `${dot.name} · ${(dot.riskScore * 100).toFixed(0)}%`
              : dot.name
            const w = label.length * overlayLabelFontSvgPx * 0.55
            const h = overlayLabelFontSvgPx * 1.1
            const lx = sx + dotR + 4
            const ly = sy + 4
            // Greedy AABB overlap check against previously placed labels
            const overlaps = placed.some(
              (p) => lx < p.x + p.w && lx + w > p.x && ly - h < p.y && ly > p.y - h,
            )
            if (overlaps) continue
            placed.push({ x: lx, y: ly, w, h })
            const riskColor = RISK_COLORS[level]
            out.push(
              <text
                key={`lbl-${dot.id}`}
                x={lx}
                y={ly}
                fontSize={overlayLabelFontSvgPx}
                fill="var(--color-text-primary)"
                style={{ pointerEvents: 'none', fontFamily: 'inherit' }}
              >
                {dot.name}
                {lod.showRiskChip && (
                  <tspan fill={riskColor} fontFamily="monospace" fontSize={overlayChipFontSvgPx} dx={4}>
                    · {(dot.riskScore * 100).toFixed(0)}%
                  </tspan>
                )}
              </text>,
            )
          }
          return out
        })()}

        {/* Lasso rectangle */}
        {lassoScreenRect && (
          <>
            <rect
              x={lassoScreenRect.x}
              y={lassoScreenRect.y}
              width={lassoScreenRect.w}
              height={lassoScreenRect.h}
              fill="rgba(56, 189, 248, 0.08)"
              stroke="#38bdf8"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              style={{ pointerEvents: 'none' }}
            />
          </>
        )}
      </svg>

      {/* Shift+drag hint when zoomed — shown when no lasso active */}
      {!lasso && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            pointerEvents: 'none',
            fontSize: 8,
            fontFamily: 'monospace',
            color: 'var(--color-text-muted)',
            opacity: 0.7,
          }}
        >
          {lang === 'en' ? 'Shift+drag to lasso' : 'Shift+arrastrar para lazo'}
        </div>
      )}

      {/* Hover tooltip — simple chip at constellation/region bands */}
      {hoveredDot && !lasso && effectiveScale < 18 && (() => {
        const { sx, sy } = toScreen(hoveredDot.x, hoveredDot.y)
        // Convert SVG viewport coords to percentage for positioning
        const leftPct = (sx / SVG_W) * 100
        const topPct = (sy / SVG_H) * 100
        const level = getRiskLevelFromScore(hoveredDot.riskScore)
        const levelLabel: Record<string, { en: string; es: string }> = {
          critical: { en: 'Critical', es: 'Crítico' },
          high:     { en: 'High',     es: 'Alto' },
          medium:   { en: 'Medium',   es: 'Medio' },
          low:      { en: 'Low',      es: 'Bajo' },
        }
        const isSelected = !hoveredDot.isMock && selection.has(hoveredDot.id)
        return (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(leftPct, 75)}%`,
              top: `${Math.max(topPct - 14, 2)}%`,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
              background: 'var(--color-background, #fff)',
              border: '1px solid var(--color-border)',
              borderRadius: 3,
              padding: '3px 7px',
              fontSize: 9,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              zIndex: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            {hoveredDot.name}
            <span style={{ color: 'var(--color-text-muted)', marginLeft: 6, fontWeight: 400 }}>
              {levelLabel[level]?.[lang] ?? level}
              {' · '}
              {(hoveredDot.riskScore * 100).toFixed(0)}%
            </span>
            {!hoveredDot.isMock && (
              <span style={{ color: 'var(--color-accent)', marginLeft: 6 }}>
                {isSelected
                  ? (lang === 'en' ? '✓ selected' : '✓ seleccionado')
                  : (lang === 'en' ? 'click to select' : 'clic para seleccionar')
                }
              </span>
            )}
          </div>
        )
      })()}

      {/* Telescope-star halo card — richer info chip at deep zoom (≥ 18×) */}
      {hoveredDot && !lasso && effectiveScale >= 18 && (
        <VendorHaloCard
          dot={{
            id: hoveredDot.id,
            vendorId: typeof hoveredDot.id === 'string' && /^\d+$/.test(hoveredDot.id)
              ? Number(hoveredDot.id)
              : undefined,
            name: hoveredDot.name,
            riskScore: hoveredDot.riskScore,
            sectorColor: hoveredDot.sectorColor,
            x: hoveredDot.x,
            y: hoveredDot.y,
            isMock: hoveredDot.isMock,
          }}
          transform={transform}
          wrapperWidth={svgPixelWidth}
          wrapperHeight={svgPixelWidth * (SVG_H / SVG_W)}
          svgWidth={SVG_W}
          svgHeight={SVG_H}
          lang={lang}
        />
      )}
    </div>
  )
}

// Re-export ClusterMeta for callers that need it
export type { ClusterMeta }
