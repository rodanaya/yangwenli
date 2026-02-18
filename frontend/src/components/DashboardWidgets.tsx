/**
 * Shared Dashboard-style components for consistent visual design across pages.
 *
 * Extracted from Dashboard.tsx — the bold, data-dense intelligence style:
 * - StatCard: border-l-4, uppercase label, large mono value
 * - SectionHeader: icon + title + description + optional action
 * - PageHero: tracking header + giant headline + subtitle
 */

import { memo } from 'react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ============================================================================
// STAT CARD — Bold metric display with colored left border
// ============================================================================

export interface StatCardProps {
  loading?: boolean
  label: ReactNode
  value: string
  detail?: string
  color?: string
  borderColor?: string
  sublabel?: string
  onClick?: () => void
  className?: string
}

export const StatCard = memo(function StatCard({
  loading,
  label,
  value,
  detail,
  color = 'text-text-primary',
  borderColor = 'border-accent/30',
  sublabel,
  onClick,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'border-l-4',
        borderColor,
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200 group/sc',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <CardContent className="p-4">
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-1.5">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-8 w-20 mb-1" />
        ) : (
          <p
            className={cn(
              'text-2xl md:text-3xl font-black tabular-nums tracking-tight leading-none',
              color,
            )}
          >
            {value}
          </p>
        )}
        {detail && <p className="text-xs text-text-muted mt-1.5">{detail}</p>}
        {sublabel && (
          <p className="text-xs text-text-muted mt-0.5 font-mono">
            {sublabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
})

// ============================================================================
// SECTION HEADER — Icon + title + description + optional action link
// ============================================================================

export interface SectionHeaderProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export const SectionHeader = memo(function SectionHeader({
  icon,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          {icon}
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
        </div>
        {description && <p className="text-xs text-text-muted">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
})

// ============================================================================
// PAGE HERO — Tracking header + giant number + subtitle
// ============================================================================

export interface PageHeroProps {
  /** All-caps tracking label, e.g. "INSTITUTIONAL HEALTH" */
  trackingLabel: string
  /** Icon rendered next to tracking label */
  icon?: ReactNode
  /** Large headline value, e.g. "$6.8T MXN" */
  headline: string
  /** Subtitle text below the headline */
  subtitle: string
  /** Optional secondary info line */
  detail?: string
  /** Right-side content (e.g., timestamp, controls) */
  trailing?: ReactNode
  loading?: boolean
  className?: string
}

export const PageHero = memo(function PageHero({
  trackingLabel,
  icon,
  headline,
  subtitle,
  detail,
  trailing,
  loading,
  className,
}: PageHeroProps) {
  return (
    <div className={cn('pb-2', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
            {trackingLabel}
          </span>
        </div>
        {trailing}
      </div>
      {loading ? (
        <Skeleton className="h-14 w-96" />
      ) : (
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight leading-none">
            {headline}
          </h1>
          <p className="text-lg text-text-muted mt-1 font-medium">{subtitle}</p>
        </div>
      )}
      {detail && (
        <div className="text-sm text-text-muted mt-2">
          {loading ? <Skeleton className="h-4 w-96" /> : detail}
        </div>
      )}
    </div>
  )
})
