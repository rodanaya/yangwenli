interface RiskLevelPillProps {
  level: 'critical' | 'high' | 'medium' | 'low'
  size?: 'sm' | 'md'
  showDot?: boolean
  className?: string
}

const RISK_STYLES = {
  critical: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/25',
    dot: '#f87171',
  },
  high: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/25',
    dot: '#fb923c',
  },
  medium: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/25',
    dot: '#fbbf24',
  },
  low: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/25',
    dot: '#4ade80',
  },
} as const

export function RiskLevelPill({
  level,
  size = 'sm',
  showDot = true,
  className,
}: RiskLevelPillProps) {
  const s = RISK_STYLES[level]
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${s.bg} ${s.text} ${s.border} ${padding} ${className ?? ''}`}
    >
      {showDot && (
        <span
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: s.dot }}
        />
      )}
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}
