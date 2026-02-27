import { cn } from '@/lib/utils'

interface PercentileBadgeProps {
  percentile: number
  metric?: string
  sector?: string
  size?: 'sm' | 'md'
}

function getPercentileColor(p: number): string {
  if (p <= 25) return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (p <= 50) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  if (p <= 75) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  return 'bg-red-500/20 text-red-400 border-red-500/30'
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
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      )}
      title={tooltip}
    >
      P{p}
    </span>
  )
}

export default PercentileBadge
