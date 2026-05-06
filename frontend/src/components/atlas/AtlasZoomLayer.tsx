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

import React, { useMemo, useRef } from 'react'
import { ConcentrationConstellation } from '@/components/charts/ConcentrationConstellation'
import type {
  ConstellationMode,
  ConstellationRiskRow,
  ClusterMeta,
} from '@/components/charts/ConcentrationConstellation'
import { useAtlasState, useAtlasDispatch } from './AtlasContext'
import { useVendorLevelDots } from '@/lib/atlas/use-vendor-level-dots'
import { getRiskLevelFromScore } from '@/lib/constants'

// ── Constellation layout constants (must mirror ConcentrationConstellation.tsx) ──
const SVG_W = 840
const SVG_H = 220
const PAD_L = 16
const PAD_R = 200
const PAD_T = 16
const PAD_B = 28
const FIELD_W = SVG_W - PAD_L - PAD_R
const FIELD_H = SVG_H - PAD_T - PAD_B

// Zoom parameters — per plan § 2.3
const ZOOM_SCALE = 2.4
const ZOOM_TRANSITION = 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)'

// Dot radius by risk level when zoomed in
const VENDOR_DOT_STYLE: Record<string, { r: number; opacity: number }> = {
  critical: { r: 2.4, opacity: 0.95 },
  high:     { r: 1.7, opacity: 0.82 },
  medium:   { r: 1.2, opacity: 0.68 },
  low:      { r: 0.7, opacity: 0.50 },
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

  // Cluster click handler — dispatches zoom-into-cluster
  const handleClusterClick = (clusterCode: string) => {
    // Bridge to Atlas.tsx's selectedClusterCode for the old ClusterDetailPanel
    // (removed in P3; tolerated during P1→P3 transitional period)
    onClusterClickBridge?.(clusterCode)
    isAnimatingRef.current = true
    dispatch({ type: 'zoom-into-cluster', code: clusterCode })
    // Animation duration matches the CSS transition (600ms)
    setTimeout(() => { isAnimatingRef.current = false }, 640)
  }

  // Click-outside handler — dispatches escape-zoom when zoomed
  const handleFieldClick = () => {
    if (isZoomed) {
      dispatch({ type: 'escape-zoom' })
    }
  }

  const transformStr =
    transform.s === 1
      ? 'translate(0px, 0px) scale(1)'
      : `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.s})`

  return (
    <div
      className="relative"
      style={{ position: 'relative' }}
    >
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
      <div
        style={{
          overflow: 'hidden',
          position: 'relative',
          // Click-outside: if zoomed and user clicks the container (background)
          // but NOT a vendor dot or the constellation clusters, escape zoom.
        }}
        onClick={handleFieldClick}
      >
        {/* Transform layer — the constellation animates here */}
        <div
          style={{
            transform: transformStr,
            transformOrigin: '0 0',
            transition: ZOOM_TRANSITION,
            // Keep pointer events on during animation (Mapbox flyTo model)
            pointerEvents: 'auto',
          }}
          // Stop click-outside propagation from cluster click events
          onClick={(e) => e.stopPropagation()}
        >
          <ConcentrationConstellation
            mode={mode}
            rows={rows}
            totalContracts={totalContracts}
            metaOverride={metaOverride}
            seedOverride={seedOverride}
            pinnedCode={pinnedCode}
            onClusterClick={handleClusterClick}
          />
        </div>

        {/* ── Vendor-level dot overlay — visible only when zoomed ─────── */}
        {isZoomed && zoomedMeta && (
          <VendorDotOverlay
            dots={vendorDots}
            zoomedMeta={zoomedMeta}
            transform={transform}
            lang={lang}
            onDotClick={(vendorId, isMock) => {
              if (!isMock) {
                window.open(`/vendors/${vendorId}`, '_blank', 'noopener')
              }
            }}
          />
        )}
      </div>

      {/* ── Zoom-active visual cue: subtle amber outline around container ── */}
      {isZoomed && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            border: '1.5px solid rgba(160, 104, 32, 0.40)',
            borderRadius: 2,
          }}
        />
      )}
    </div>
  )
}

// ── VendorDotOverlay ─────────────────────────────────────────────────────────

interface VendorDotOverlayProps {
  dots: ReturnType<typeof useVendorLevelDots>
  zoomedMeta: ClusterMeta
  transform: { tx: number; ty: number; s: number }
  lang: 'en' | 'es'
  onDotClick: (vendorId: string, isMock: boolean) => void
}

function VendorDotOverlay({
  dots,
  transform,
  lang,
  onDotClick,
}: VendorDotOverlayProps) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)

  // The vendor dots are already in original viewport coordinates.
  // Apply the same transform as the constellation to place them correctly.
  const toScreen = (x: number, y: number) => ({
    sx: x * transform.s + transform.tx,
    sy: y * transform.s + transform.ty,
  })

  const hoveredDot = dots.find((d) => d.id === hoveredId)

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
        {dots.map((dot) => {
          const level = getRiskLevelFromScore(dot.riskScore)
          const style = VENDOR_DOT_STYLE[level] ?? VENDOR_DOT_STYLE.low
          const { sx, sy } = toScreen(dot.x, dot.y)
          const isHovered = dot.id === hoveredId
          return (
            <circle
              key={dot.id}
              cx={sx}
              cy={sy}
              r={isHovered ? style.r * 1.6 : style.r}
              fill={dot.sectorColor}
              opacity={style.opacity}
              stroke={isHovered ? '#a06820' : 'none'}
              strokeWidth={isHovered ? 1.5 : 0}
              style={{ cursor: 'pointer', pointerEvents: 'auto', transition: 'r 120ms ease' }}
              data-vendor-id={dot.id}
              aria-label={`${dot.name} · ${(dot.riskScore * 100).toFixed(0)}%`}
              onClick={(e) => {
                e.stopPropagation()
                onDotClick(dot.id, dot.isMock)
              }}
              onMouseEnter={() => setHoveredId(dot.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          )
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredDot && (() => {
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
              <span style={{ color: '#a06820', marginLeft: 6 }}>
                {lang === 'en' ? '→ open' : '→ abrir'}
              </span>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// Re-export ClusterMeta for callers that need it
export type { ClusterMeta }
