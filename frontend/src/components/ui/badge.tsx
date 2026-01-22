import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/api/types'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-background-elevated text-text-primary',
        secondary: 'bg-background-elevated/50 text-text-secondary',
        outline: 'border border-border text-text-secondary',
        // Risk level variants
        critical: 'bg-risk-critical/20 text-risk-critical border border-risk-critical/30',
        high: 'bg-risk-high/20 text-risk-high border border-risk-high/30',
        medium: 'bg-risk-medium/20 text-risk-medium border border-risk-medium/30',
        low: 'bg-risk-low/20 text-risk-low border border-risk-low/30',
        // Sector variants (subset)
        salud: 'bg-sector-salud/20 text-sector-salud border border-sector-salud/30',
        educacion: 'bg-sector-educacion/20 text-sector-educacion border border-sector-educacion/30',
        infraestructura: 'bg-sector-infraestructura/20 text-sector-infraestructura border border-sector-infraestructura/30',
        energia: 'bg-sector-energia/20 text-sector-energia border border-sector-energia/30',
        tecnologia: 'bg-sector-tecnologia/20 text-sector-tecnologia border border-sector-tecnologia/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

// Specialized risk badge component
interface RiskBadgeProps extends Omit<BadgeProps, 'variant'> {
  score?: number
  level?: RiskLevel
}

function RiskBadge({ score, level, className, children, ...props }: RiskBadgeProps) {
  const riskLevel = level ?? getRiskLevelFromScore(score ?? 0)
  const label = children ?? riskLevel.toUpperCase()
  const scoreDisplay = score !== undefined ? `${(score * 100).toFixed(0)}%` : undefined

  // Create accessible label
  const ariaLabel = score !== undefined
    ? `Risk level: ${riskLevel}, score: ${scoreDisplay}`
    : `Risk level: ${riskLevel}`

  return (
    <Badge
      variant={riskLevel}
      className={cn('tabular-nums', className)}
      role="status"
      aria-label={ariaLabel}
      {...props}
    >
      {label}
      {scoreDisplay && <span className="ml-1 opacity-75" aria-hidden="true">({scoreDisplay})</span>}
    </Badge>
  )
}

function getRiskLevelFromScore(score: number): RiskLevel {
  if (score >= 0.6) return 'critical'
  if (score >= 0.4) return 'high'
  if (score >= 0.2) return 'medium'
  return 'low'
}

export { Badge, RiskBadge, badgeVariants }
