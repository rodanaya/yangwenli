/**
 * GalaxyDimmer — focus+context overlay (M-CLUSTER P5 Spotlight).
 *
 * Renders a translucent black overlay over the entire canvas wrapper when
 * a cluster spotlight is active. Click → dismisses the spotlight (escape
 * cluster zoom). The galaxy stays visible at ~35% opacity behind it —
 * preserves spatial memory while clearly recessing context.
 *
 * Z-stack inside the canvas wrapper:
 *   canvas (z 0)  →  GalaxyDimmer (z 25)  →  SpotlightCard (z 30)
 *
 * The dimmer is INSIDE the canvas wrapper, not the page, so the left
 * rail and topbar stay fully lit (the user can still see the nav).
 *
 * Design rationale (Shneiderman's mantra · 1996):
 *   Overview first — keep galaxy visible
 *   Zoom and filter — dim non-focal regions, illuminate one cluster
 *   Details on demand — spotlight card hosts the "Browse" + "Dossier" CTAs
 */

import * as React from 'react'

export interface GalaxyDimmerProps {
  /** Called when user clicks the dim overlay (outside the spotlight card). */
  onDismiss: () => void
  /** Optional alpha override. Default 0.55 — heavy enough to recess, light
   *  enough to keep galaxy visible as spatial context. */
  alpha?: number
}

export function GalaxyDimmer({ onDismiss, alpha = 0.55 }: GalaxyDimmerProps): React.ReactElement {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Dismiss spotlight"
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onDismiss()
        }
      }}
      className="absolute inset-0 z-[25] cursor-pointer"
      style={{
        // Warm-white background dimmer (matches app bg #faf9f6 darkened)
        background: `rgba(28, 23, 20, ${alpha})`,
        // Subtle fade-in
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
