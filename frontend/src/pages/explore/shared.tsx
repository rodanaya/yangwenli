/**
 * Shared components, constants, and types for the Explore page tabs.
 */

import {
  Users,
  Building2,
  Calendar,
} from 'lucide-react'

// =============================================================================
// Tab Configuration
// =============================================================================

export const TABS = [
  { id: 'vendors', label: 'Vendors', icon: Users },
  { id: 'institutions', label: 'Institutions', icon: Building2 },
  { id: 'trends', label: 'Trends', icon: Calendar },
] as const

export type TabId = (typeof TABS)[number]['id']

// =============================================================================
// Shared Utility Components
// =============================================================================

export function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span
        className="text-xs font-semibold font-mono tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

export function MiniBar({ pct, color }: { pct: number; color: string }) {
  const clampedPct = Math.max(0, Math.min(1, pct))
  return (
    <div className="flex items-center gap-1.5">
      {(() => {
        const N = 12, DR = 1.5, DG = 4
        const filled = Math.max(1, Math.round(clampedPct * N))
        return (
          <svg viewBox={`0 0 ${N * DG} 4`} width={N * DG} height={4} aria-hidden="true">
            {Array.from({ length: N }).map((_, k) => (
              <circle key={k} cx={k * DG + DR} cy={2} r={DR}
                fill={k < filled ? color : 'var(--color-background-elevated)'}
                stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                strokeWidth={k < filled ? 0 : 0.5}
                fillOpacity={k < filled ? 0.85 : 1}
              />
            ))}
          </svg>
        )
      })()}
      <span className="text-xs font-mono tabular-nums" style={{ color }}>
        {(clampedPct * 100).toFixed(0)}%
      </span>
    </div>
  )
}
