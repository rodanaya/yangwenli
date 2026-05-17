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

import React, { useEffect, useState } from 'react'
import { useAtlasState, useAtlasDispatch } from './AtlasContext'

interface AtlasShellProps {
  leftRail: React.ReactNode
  center: React.ReactNode
  rightPanel: React.ReactNode
  /** When true, the right panel is always visible (e.g. a cluster is selected).
   *  Overrides the user's localStorage toggle so the panel shows without the
   *  user having to manually open it. The floating toggle is hidden while
   *  forceRightPanel is true to avoid fighting the forced state. */
  forceRightPanel?: boolean
}

const RIGHT_PANEL_OPEN_KEY = 'rubli_atlas_right_panel_open_v1'

export function AtlasShell({ leftRail, center, rightPanel, forceRightPanel = false }: AtlasShellProps) {
  const state = useAtlasState()
  const dispatch = useAtlasDispatch()

  // 2026-05-09: right panel now collapsible. Default OFF so the map
  // gets ~1300px of viewport width on a 1700px screen instead of being
  // squeezed to ~870px. User can re-open via the floating toggle when
  // they want the meta stats. Persisted in localStorage so the choice
  // sticks across sessions.
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(() => {
    try {
      const stored = window.localStorage.getItem(RIGHT_PANEL_OPEN_KEY)
      return stored === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      window.localStorage.setItem(RIGHT_PANEL_OPEN_KEY, rightPanelOpen ? '1' : '0')
    } catch {
      /* localStorage unavailable */
    }
  }, [rightPanelOpen])

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

      // 2026-05-09 spatial-nav: also pop zoomed-sector and zoomed-institution
      const kind = state.view.kind
      if (
        kind === 'zoomed-cluster' ||
        kind === 'zoomed-sector' ||
        kind === 'zoomed-institution' ||
        kind === 'selecting'
      ) {
        dispatch({ type: 'escape-zoom' })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.view, dispatch])

  // rightPanelOpen = forceRightPanel (cluster selected) OR user toggled it on.
  const isRightPanelVisible = forceRightPanel || rightPanelOpen

  // Grid columns flip between 2 and 3 based on isRightPanelVisible.
  const gridCols = isRightPanelVisible ? 'lg:grid-cols-[240px_1fr_320px]' : 'lg:grid-cols-[240px_1fr]'

  return (
    <div
      className={`grid grid-cols-1 ${gridCols} gap-0 relative`}
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
        style={{ borderRight: isRightPanelVisible ? '1px solid var(--color-border)' : 'none' }}
      >
        {center}
      </main>

      {/* ── Right panel — collapsible or forced open when a cluster is selected ── */}
      {isRightPanelVisible && (
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
      )}

      {/* Floating toggle — hidden on mobile and when panel is forced open by a cluster selection */}
      {!forceRightPanel && (
        <button
          type="button"
          onClick={() => setRightPanelOpen((v) => !v)}
          className="hidden lg:flex items-center justify-center fixed top-[80px] right-3 z-30 h-8 w-8 rounded-sm hover:bg-background-elevated transition-colors"
          style={{
            background: 'var(--color-background-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
          aria-label={rightPanelOpen ? 'Hide stats panel' : 'Show stats panel'}
          title={rightPanelOpen ? 'Hide stats panel' : 'Show stats panel'}
        >
          <span className="text-[14px] leading-none font-mono">{rightPanelOpen ? '›' : '‹'}</span>
        </button>
      )}
    </div>
  )
}
