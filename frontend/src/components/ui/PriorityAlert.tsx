/**
 * PriorityAlert — one alert block that collapses multiple severity flags by
 * priority order.
 *
 * Replaces the old pattern where VendorProfile stacked 5 separate alert
 * components (Critical Alert Banner → EFOS/SFP Banner → ARIA Red Flags →
 * GT known-bad banner → SanctionsAlertBanner) that each rendered variants of
 * "this vendor is suspicious" using the same underlying facts.
 *
 * Caller passes a list of <Flag> objects already sorted by priority (highest
 * first). The component renders the first flag as a prominent headline card
 * and the rest as secondary pills below.
 */
import { AlertTriangle, ShieldAlert, Flag as FlagIcon, Info } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'info'

export interface PriorityFlag {
  /** Stable key for react reconciliation. */
  key: string
  severity: AlertSeverity
  /** Bold one-line headline shown in the primary block or pill. */
  headline: string
  /** Optional explanatory sentence shown below the headline in primary block. */
  detail?: ReactNode
  /** Optional internal route — makes the flag clickable. */
  linkTo?: string
}

const SEVERITY_STYLE: Record<
  AlertSeverity,
  { bg: string; border: string; text: string; iconColor: string; Icon: typeof AlertTriangle }
> = {
  critical: {
    bg: 'bg-[color:var(--color-risk-critical)]/10',
    border: 'border-[color:var(--color-risk-critical)]/40',
    text: 'text-[color:var(--color-risk-critical)]',
    iconColor: 'var(--color-risk-critical)',
    Icon: ShieldAlert,
  },
  high: {
    bg: 'bg-[color:var(--color-risk-high)]/10',
    border: 'border-[color:var(--color-risk-high)]/40',
    text: 'text-[color:var(--color-risk-high)]',
    iconColor: 'var(--color-risk-high)',
    Icon: AlertTriangle,
  },
  medium: {
    bg: 'bg-[color:var(--color-risk-medium)]/10',
    border: 'border-[color:var(--color-risk-medium)]/40',
    text: 'text-[color:var(--color-risk-medium)]',
    iconColor: 'var(--color-risk-medium)',
    Icon: FlagIcon,
  },
  info: {
    bg: 'bg-background-elevated',
    border: 'border-border',
    text: 'text-text-secondary',
    iconColor: 'var(--color-text-secondary)',
    Icon: Info,
  },
}

interface PriorityAlertProps {
  /** Flags in priority order — highest first. If empty, nothing renders. */
  flags: PriorityFlag[]
  className?: string
}

export function PriorityAlert({ flags, className }: PriorityAlertProps) {
  if (!flags.length) return null
  const [primary, ...rest] = flags
  const s = SEVERITY_STYLE[primary.severity]
  const PrimaryIcon = s.Icon

  const primaryContent = (
    <div
      className={`flex items-start gap-3 rounded-sm border px-4 py-3 ${s.bg} ${s.border}`}
    >
      <PrimaryIcon
        className="h-5 w-5 flex-shrink-0 mt-0.5"
        style={{ color: s.iconColor }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold leading-snug ${s.text}`}>
          {primary.headline}
        </div>
        {primary.detail && (
          <div className="text-xs text-text-secondary mt-1 leading-[1.5]">
            {primary.detail}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {primary.linkTo ? (
        <Link
          to={primary.linkTo}
          className="block hover:opacity-90 transition-opacity"
        >
          {primaryContent}
        </Link>
      ) : (
        primaryContent
      )}

      {rest.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          aria-label="Additional flags"
        >
          {rest.map((f) => (
            <SecondaryPill key={f.key} flag={f} />
          ))}
        </div>
      )}
    </div>
  )
}

function SecondaryPill({ flag }: { flag: PriorityFlag }) {
  const s = SEVERITY_STYLE[flag.severity]
  const pill = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.border} ${s.text}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: s.iconColor }}
        aria-hidden="true"
      />
      {flag.headline}
    </span>
  )
  return flag.linkTo ? (
    <Link to={flag.linkTo} className="hover:opacity-80 transition-opacity">
      {pill}
    </Link>
  ) : (
    pill
  )
}

/**
 * SEVERITY_RANK — use this to sort raw flags before passing to PriorityAlert.
 * Higher number = higher priority.
 */
export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  info: 1,
}

export function sortFlagsByPriority(flags: PriorityFlag[]): PriorityFlag[] {
  return [...flags].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
  )
}
