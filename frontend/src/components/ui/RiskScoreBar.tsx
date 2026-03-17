import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RISK_THRESHOLDS, RISK_COLORS } from '@/lib/constants'

interface RiskScoreBarProps {
  score: number           // 0-1
  height?: number         // px, default 4
  width?: string          // CSS width, default '100%'
  showLabel?: boolean
  animated?: boolean
  className?: string
}

const getRiskColor = (score: number): string => {
  if (score >= RISK_THRESHOLDS.critical) return RISK_COLORS.critical
  if (score >= RISK_THRESHOLDS.high) return RISK_COLORS.high
  if (score >= RISK_THRESHOLDS.medium) return RISK_COLORS.medium
  return RISK_COLORS.low
}

const getRiskTooltip = (score: number): string => {
  if (score >= RISK_THRESHOLDS.critical)
    return `Critical risk (score: ${score.toFixed(3)}) — Strong match to documented fraud patterns. This is a statistical indicator, not proof of wrongdoing.`
  if (score >= RISK_THRESHOLDS.high)
    return `High risk (score: ${score.toFixed(3)}) — Elevated similarity to known corruption patterns.`
  if (score >= RISK_THRESHOLDS.medium)
    return `Medium risk (score: ${score.toFixed(3)}) — Some procurement anomalies detected relative to sector baseline.`
  return `Low risk (score: ${score.toFixed(3)}) — Few anomalies relative to sector baseline.`
}

export function RiskScoreBar({
  score,
  height = 4,
  width = '100%',
  showLabel = false,
  animated = true,
  className,
}: RiskScoreBarProps) {
  const color = getRiskColor(score)
  const pct = Math.min(score * 100, 100)
  const tooltipText = getRiskTooltip(score)

  return (
    <div className={className} style={{ width }}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-text-muted">Risk Score</span>
          <span className="font-mono" style={{ color }}>
            {score.toFixed(3)}
          </span>
        </div>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="rounded-full overflow-hidden bg-background-elevated/40 cursor-default"
              style={{ height }}
            >
              <div
                className={animated ? 'transition-all duration-1000 ease-out' : ''}
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  backgroundColor: color,
                  borderRadius: 'inherit',
                }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-center">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
