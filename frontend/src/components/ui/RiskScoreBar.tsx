import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RISK_THRESHOLDS, RISK_COLORS } from '@/lib/constants'

interface RiskScoreBarProps {
  score: number           // 0-1
  height?: number         // px, default 10 (dot radius 3 + padding)
  width?: string          // CSS width, default '100%'
  showLabel?: boolean
  animated?: boolean
  className?: string
  dots?: number           // number of dots in the strip, default 24
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
  width = '100%',
  showLabel = false,
  className,
  dots = 24,
}: RiskScoreBarProps) {
  const color = getRiskColor(score)
  const pct = Math.min(Math.max(score, 0), 1)
  const tooltipText = getRiskTooltip(score)
  const N = dots
  const DR = 3
  const DG = 8
  const filled = Math.round(pct * N)

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
            <svg
              viewBox={`0 0 ${N * DG} 10`}
              className="w-full cursor-default"
              style={{ height: 10 }}
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              {Array.from({ length: N }).map((_, i) => (
                <circle
                  key={i}
                  cx={i * DG + DR}
                  cy={5}
                  r={DR}
                  fill={i < filled ? color : '#f3f1ec'}
                  stroke={i < filled ? undefined : '#e2ddd6'}
                  strokeWidth={i < filled ? 0 : 0.5}
                  fillOpacity={i < filled ? 0.85 : 1}
                />
              ))}
            </svg>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-center">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
