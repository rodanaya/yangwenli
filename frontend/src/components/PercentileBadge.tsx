import { cn } from '@/lib/utils'

interface PercentileBadgeProps {
  percentile: number
  metric?: string
  sector?: string
  size?: 'sm' | 'md'
}

function getPercentileColor(p: number): string {
  if (p <= 25) return 'bg-background-elevated text-text-muted border-border'
  if (p <= 50) return 'bg-risk-high/10 text-risk-high border-risk-high/30'
  if (p <= 75) return 'bg-risk-high/15 text-risk-high border-risk-high/30'
  return 'bg-risk-critical/10 text-risk-critical border-risk-critical/30'
}

export function PercentileBadge({
  percentile,
  metric,
  sector,
  size = 'sm',
}: PercentileBadgeProps) {
  const p = Math.round(Math.max(0, Math.min(100, percentile)))
  const colorClass = getPercentileColor(p)

  const tooltip = [
    metric && `${metric}: `,
    `${p}th percentile`,
    sector && ` in ${sector} sector`,
  ]
    .filter(Boolean)
    .join('')

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        colorClass,
        size === 'sm' ? 'px-1.5 py-0.5 text-[12px]' : 'px-2 py-0.5 text-xs'
      )}
      title={tooltip}
    >
      P{p}
    </span>
  )
}

export default PercentileBadge
