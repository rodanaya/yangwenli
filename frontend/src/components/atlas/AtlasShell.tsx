/**
 * AtlasShell — two-pane shell for the investigator console (M-OBS Phase 2).
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § 1.1, § 2.5
 * Build: atlas-C-P1 (layout), atlas-C-P2 (ESC handler),
 *        M-OBS-P2 (right rail removed, keyboard handler extended)
 *
 * Grid: [240px left rail] [1fr center]. At <1024px collapses to single column.
 *
 * The 320px right rail is gone — its job is now done by ClusterFloatingCard
 * (mounted INSIDE the canvas via AtlasZoomLayer) and a future bottom drawer.
 * That frees ~320px of horizontal canvas room — the canvas becomes the page.
 *
 * Global keyboard handler:
 *   ESC          → pop zoom (zoomed-* / selecting → idle)
 *   + / =        → emit `atlas:zoom-in`
 *   -            → emit `atlas:zoom-out`
 *   0            → emit `atlas:zoom-reset`
 *   Arrow keys   → emit `atlas:pan-{up|down|left|right}` (±40 SVG units)
 *   [ / ]        → emit `atlas:cluster-{prev|next}` (M-CLUSTER P1)
 *   1-7          → emit `atlas:cluster-jump` with detail.index (M-CLUSTER P1)
 *   H / h        → escape-zoom (return to galaxy)
 *   Enter        → click the focused element (default browser behavior, no-op)
 *
 * Handlers are skipped when focus is inside an INPUT/TEXTAREA so vendor search
 * and personal notes are not interrupted.
 */

import React, { useEffect } from 'react'
import { useAtlasState, useAtlasDispatch } from './AtlasContext'

interface AtlasShellProps {
  leftRail: React.ReactNode
  center: React.ReactNode
}

export function AtlasShell({ leftRail, center }: AtlasShellProps) {
  const state = useAtlasState()
  const dispatch = useAtlasDispatch()

  // ── Global keyboard handler ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const kind = state.view.kind
      const isZoomedKind =
        kind === 'zoomed-cluster' ||
        kind === 'zoomed-sector' ||
        kind === 'zoomed-institution' ||
        kind === 'selecting'

      // ESC — pop one zoom level
      if (e.key === 'Escape') {
        if (isZoomedKind) dispatch({ type: 'escape-zoom' })
        return
      }

      // H / h — go home (galaxy)
      if (e.key === 'h' || e.key === 'H') {
        if (isZoomedKind) {
          e.preventDefault()
          dispatch({ type: 'escape-zoom' })
        }
        return
      }

      // The remaining shortcuts only operate inside a zoomed state — they
      // drive AtlasZoomLayer's pan + wheel-zoom which only exist while zoomed.
      if (!isZoomedKind) return

      // + / = → zoom in
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('atlas:zoom-in'))
        return
      }
      // - → zoom out
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('atlas:zoom-out'))
        return
      }
      // 0 → reset wheel zoom + pan
      if (e.key === '0') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('atlas:zoom-reset'))
        return
      }
      // Arrow keys — pan ±40 SVG units
      if (e.key === 'ArrowUp')    { e.preventDefault(); window.dispatchEvent(new CustomEvent('atlas:pan-up'));    return }
      if (e.key === 'ArrowDown')  { e.preventDefault(); window.dispatchEvent(new CustomEvent('atlas:pan-down'));  return }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); window.dispatchEvent(new CustomEvent('atlas:pan-left'));  return }
      if (e.key === 'ArrowRight') { e.preventDefault(); window.dispatchEvent(new CustomEvent('atlas:pan-right')); return }
      // M-CLUSTER P1 — [ / ] step prev/next cluster, 1-7 jump to pattern by code
      if (e.key === '[') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('atlas:cluster-prev'))
        return
      }
      if (e.key === ']') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('atlas:cluster-next'))
        return
      }
      if (/^[1-7]$/.test(e.key)) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('atlas:cluster-jump', { detail: { index: parseInt(e.key, 10) - 1 } }))
        return
      }
      // Enter — no-op (lets default browser behavior click the focused element)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.view, dispatch])

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-0 relative"
      style={{ minHeight: 'calc(100vh - var(--topbar-h, 64px))' }}
    >
      {/* ── Left rail ──────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col border-r border-border overflow-y-auto"
        style={{
          position: 'sticky',
          top: 'var(--topbar-h, 64px)',
          height: 'calc(100vh - var(--topbar-h, 64px))',
        }}
      >
        {leftRail}
      </aside>

      {/* ── Center pane — the constellation lives here ─────────────── */}
      <main className="overflow-hidden min-w-0">
        {center}
      </main>
    </div>
  )
}
