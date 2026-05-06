/**
 * AtlasShell — three-pane Bloomberg Terminal grid container.
 *
 * Plan: docs/ATLAS_C_CONSOLE_PLAN.md § 1.1
 * Build: atlas-C-P1
 *
 * Grid: [240px left rail] [1fr center] [320px right panel]
 * At <1024px collapses to single column (mobile fallback per § 8).
 *
 * P1: purely structural shell. The existing ClusterDetailPanel modal
 * still slides over this layout — it stays until P3 replaces it with
 * the contextual right panel states.
 */

import React from 'react'

interface AtlasShellProps {
  leftRail: React.ReactNode
  center: React.ReactNode
  rightPanel: React.ReactNode
}

export function AtlasShell({ leftRail, center, rightPanel }: AtlasShellProps) {
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
