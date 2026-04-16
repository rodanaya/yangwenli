import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RiskLevelPillProps {
  level: 'critical' | 'high' | 'medium' | 'low'
  size?: 'sm' | 'md'
  showDot?: boolean
  className?: string
  score?: number
}

// Phase 1 canonical risk pill palette — see design tokens in src/index.css.
// Critical=red-500, high=amber-500, medium=amber-800/zinc, low=zinc-500 (no green).
const RISK_STYLES = {
  critical: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: '#ef4444',
  },
  high: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: '#f59e0b',
  },
  medium: {
    bg: 'bg-amber-900/20',
    text: 'text-amber-600',
    border: 'border-amber-800/30',
    dot: '#a16207',
  },
  low: {
    bg: 'bg-zinc-800/50',
    text: 'text-zinc-500',
    border: 'border-zinc-700/30',
    dot: '#71717a',
  },
} as const

const RISK_TOOLTIPS: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical:
    'Critical risk — Strong match to documented fraud patterns. This is a statistical indicator, not proof of wrongdoing.',
  high: 'High risk — Elevated similarity to known corruption patterns.',
  medium: 'Medium risk — Some procurement anomalies detected relative to sector baseline.',
  low: 'Low risk — Few anomalies relative to sector baseline.',
}

export function RiskLevelPill({
  level,
  size = 'sm',
  showDot = true,
  className,
  score,
}: RiskLevelPillProps) {
  const s = RISK_STYLES[level]
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'

  const baseTooltip = RISK_TOOLTIPS[level]
  const tooltipText =
    score !== undefined
      ? `${baseTooltip} Score: ${score.toFixed(3)}.`
      : baseTooltip

  const pill = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${s.bg} ${s.text} ${s.border} ${padding} ${className ?? ''}`}
    >
      {showDot && (
        <span
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: s.dot }}
          aria-hidden="true"
        />
      )}
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{pill}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-center">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
