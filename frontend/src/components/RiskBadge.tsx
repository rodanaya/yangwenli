import { cn } from '@/lib/utils'

type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

interface RiskBadgeProps {
  level: RiskLevel
  className?: string
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        `risk-${level}`,
        className
      )}
    >
      {level}
    </span>
  )
}

export default RiskBadge
