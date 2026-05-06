/**
 * AtlasShell — three-pane Bloomberg Terminal grid container.
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § 1.1, § 2.5
 * Build: atlas-C-P1 (layout), atlas-C-P2 (ESC handler)
 *
 * Grid: [240px left rail] [1fr center] [320px right panel]
 * At <1024px collapses to single column (mobile fallback per § 8).
 *
 * P2 adds: global ESC handler that dispatches escape-zoom when
 * the view is zoomed or selecting, per the VS Code / Figma convention.
 * ESC does NOT fire when focus is inside an input or textarea.
 *
 * P1: purely structural shell. The existing ClusterDetailPanel modal
 * still slides over this layout — it stays until P3 replaces it with
 * the contextual right panel states.
 */

import React, { useEffect } from 'react'
import { useAtlasState, useAtlasDispatch } from './AtlasContext'

interface AtlasShellProps {
  leftRail: React.ReactNode
  center: React.ReactNode
  rightPanel: React.ReactNode
}

export function AtlasShell({ leftRail, center, rightPanel }: AtlasShellProps) {
  const state = useAtlasState()
  const dispatch = useAtlasDispatch()

  // ── ESC key handler (§ 2.5) ──────────────────────────────────────────────
  // Global keydown that dispatches escape-zoom when zoomed or selecting.
  // Skips when focus is inside an input or textarea so vendor search and
  // personal notes are not interrupted.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Don't fire when focus is inside a text input
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (state.view.kind === 'zoomed-cluster' || state.view.kind === 'selecting') {
        dispatch({ type: 'escape-zoom' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.view, dispatch])

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] gap-0"
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
      <main
        className="overflow-hidden min-w-0"
        style={{ borderRight: '1px solid var(--color-border)' }}
      >
        {center}
      </main>

      {/* ── Right panel ─────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col border-l border-border overflow-y-auto"
        style={{
          position: 'sticky',
          top: 'var(--topbar-h, 64px)',
          height: 'calc(100vh - var(--topbar-h, 64px))',
        }}
      >
        {rightPanel}
      </aside>
    </div>
  )
}
