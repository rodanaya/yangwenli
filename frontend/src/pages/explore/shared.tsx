/**
 * Shared components, constants, and types for the Explore page tabs.
 */

import type { LucideIcon } from 'lucide-react'
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
      <span className="text-[10px] text-text-muted">{label}</span>
      <span
        className="text-xs font-semibold tabular-nums"
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
      <div className="w-12 h-1.5 rounded-full bg-border/40 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${clampedPct * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color }}>
        {(clampedPct * 100).toFixed(0)}%
      </span>
    </div>
  )
}
