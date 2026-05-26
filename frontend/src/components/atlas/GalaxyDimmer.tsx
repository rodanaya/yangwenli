/**
 * GalaxyDimmer — focus+context overlay (M-CLUSTER P5 Spotlight + P7d hit-test).
 *
 * Renders a translucent overlay over the canvas wrapper when a cluster
 * spotlight is active. Click handler is smart:
 *
 *   - If click lands within hit-test radius of ANOTHER cluster's screen
 *     position → switch spotlight to that cluster (lateral nav without
 *     leaving spotlight). Implements the "compare clusters" research
 *     finding (Smashing 2026: modals block comparison — we let users
 *     hop between clusters with one click).
 *   - Otherwise (empty space click) → dismiss spotlight entirely.
 *
 * The galaxy stays visible at ~55% opacity behind it — preserves spatial
 * memory while clearly recessing context.
 *
 * Z-stack inside the canvas wrapper:
 *   canvas (z 0)  →  GalaxyDimmer (z 25)  →  SpotlightCard (z 30)
 */

import * as React from 'react'

export interface DimmerCluster {
  code: string
  /** 0..1 fraction of wrapper width. */
  fx: number
  /** 0..1 fraction of wrapper height. */
  fy: number
}

export interface GalaxyDimmerProps {
  /** Called when user clicks the dim overlay outside any cluster. */
  onDismiss: () => void
  /** Called when user clicks ON another cluster — lateral spotlight switch. */
  onJumpToCluster?: (code: string) => void
  /** Cluster positions for hit-testing. Required if onJumpToCluster set. */
  clusters?: DimmerCluster[]
  /** Currently-pinned cluster — excluded from hit-test (clicking own
   *  cluster = dismiss, matches macOS semantics). */
  pinnedCode?: string | null
  /** Wrapper width in CSS px (for converting fx → screen x). */
  wrapperWidth?: number
  /** Wrapper height in CSS px (for converting fy → screen y). */
  wrapperHeight?: number
  /** Hit-test radius in CSS px. Default 38 — generous enough that the
   *  user can sloppy-click in the swarm and still land. */
  hitRadius?: number
  /** Optional alpha override. Default 0.55. */
  alpha?: number
}

export function GalaxyDimmer({
  onDismiss,
  onJumpToCluster,
  clusters,
  pinnedCode,
  wrapperWidth,
  wrapperHeight,
  hitRadius = 38,
  alpha = 0.55,
}: GalaxyDimmerProps): React.ReactElement {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // P7d — Hit-test against other clusters before dismissing.
    if (
      onJumpToCluster &&
      clusters &&
      clusters.length > 0 &&
      wrapperWidth &&
      wrapperHeight
    ) {
      const rect = e.currentTarget.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      let nearest: { code: string; d2: number } | null = null
      for (const c of clusters) {
        if (c.code === pinnedCode) continue  // own cluster → dismiss
        const sx = c.fx * wrapperWidth
        const sy = c.fy * wrapperHeight
        const d2 = (sx - cx) * (sx - cx) + (sy - cy) * (sy - cy)
        if (nearest === null || d2 < nearest.d2) nearest = { code: c.code, d2 }
      }
      if (nearest && nearest.d2 <= hitRadius * hitRadius) {
        onJumpToCluster(nearest.code)
        return
      }
    }
    onDismiss()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Spotlight backdrop — click another cluster to switch, or empty space to close"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onDismiss()
        }
      }}
      className="absolute inset-0 z-[25] cursor-pointer"
      style={{
        background: `rgba(28, 23, 20, ${alpha})`,
        animation: 'galaxy-dim-fade-in 220ms ease-out',
      }}
    >
      <style>{`
        @keyframes galaxy-dim-fade-in {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
      `}</style>
    </div>
  )
}
