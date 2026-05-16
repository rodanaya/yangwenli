/**
 * Shared components, constants, and types for the Explore page tabs.
 */

import {
  Users,
  Building2,
  Calendar,
} from 'lucide-react'
import { DotBar } from '@/components/ui/DotBar'

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
  return (
    <div className="flex items-center gap-1.5">
      <DotBar
        value={Math.max(0, Math.min(1, pct))}
        max={1}
        color={color}
        emptyColor="var(--color-background-elevated)"
        emptyStroke="var(--color-border-hover)"
        dots={12}
        dotR={1.5}
        dotGap={4}
      />
      <span className="text-xs font-mono tabular-nums" style={{ color }}>
        {(Math.max(0, Math.min(1, pct)) * 100).toFixed(0)}%
      </span>
    </div>
  )
}
