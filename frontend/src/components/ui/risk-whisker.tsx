/**
 * RiskWhisker — Confidence Interval display for risk scores
 *
 * Renders an inline whisker plot: [0.58 ─── ● ─── 0.84]
 * The dot is the point estimate; the line extends to CI bounds.
 *
 * Usage:
 *   <RiskWhisker score={0.72} lower={0.58} upper={0.84} />
 *   <RiskWhisker score={0.72} lower={0.58} upper={0.84} size="lg" />
 */

import { RISK_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface RiskWhiskerProps {
  score: number
  lower?: number | null
  upper?: number | null
  /** sm = inline (60px), md = default (100px), lg = prominent (160px) */
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  className?: string
}

function scoreToColor(score: number): string {
  if (score >= 0.5) return RISK_COLORS.critical
  if (score >= 0.3) return RISK_COLORS.high
  if (score >= 0.1) return RISK_COLORS.medium
  return RISK_COLORS.low
}

export function RiskWhisker({
  score,
  lower,
  upper,
  size = 'md',
  showLabels = false,
  className,
}: RiskWhiskerProps) {
  const width = size === 'sm' ? 60 : size === 'lg' ? 160 : 100
  const height = size === 'lg' ? 28 : 18
  const cy = height / 2
  const dotR = size === 'sm' ? 3 : size === 'lg' ? 5 : 4
  const color = scoreToColor(score)

  // Map 0–1 score to pixel position within the SVG
  const toX = (v: number) => (v * (width - 16)) + 8

  const scorePx = toX(Math.min(1, Math.max(0, score)))
  const lowerPx = lower != null ? toX(Math.min(1, Math.max(0, lower))) : null
  const upperPx = upper != null ? toX(Math.min(1, Math.max(0, upper))) : null

  const hasCi = lowerPx != null && upperPx != null

  return (
    <div className={cn('inline-flex flex-col items-center gap-0.5', className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label={`Risk score ${(score * 100).toFixed(0)}%${hasCi ? `, CI ${((lower ?? 0) * 100).toFixed(0)}–${((upper ?? 0) * 100).toFixed(0)}%` : ''}`}
      >
        {/* Track */}
        <line
          x1={8}
          y1={cy}
          x2={width - 8}
          y2={cy}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />

        {/* CI range fill */}
        {hasCi && lowerPx != null && upperPx != null && (
          <rect
            x={lowerPx}
            y={cy - 3}
            width={upperPx - lowerPx}
            height={6}
            fill={color}
            fillOpacity={0.18}
            rx={2}
          />
        )}

        {/* CI whisker line */}
        {hasCi && lowerPx != null && upperPx != null && (
          <>
            <line
              x1={lowerPx}
              y1={cy - 4}
              x2={lowerPx}
              y2={cy + 4}
              stroke={color}
              strokeOpacity={0.5}
              strokeWidth={1.5}
            />
            <line
              x1={upperPx}
              y1={cy - 4}
              x2={upperPx}
              y2={cy + 4}
              stroke={color}
              strokeOpacity={0.5}
              strokeWidth={1.5}
            />
            <line
              x1={lowerPx}
              y1={cy}
              x2={upperPx}
              y2={cy}
              stroke={color}
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          </>
        )}

        {/* Score dot — glowing */}
        <circle
          cx={scorePx}
          cy={cy}
          r={dotR + 3}
          fill={color}
          fillOpacity={0.15}
        />
        <circle
          cx={scorePx}
          cy={cy}
          r={dotR}
          fill={color}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={0.5}
        />
      </svg>

      {showLabels && hasCi && (
        <div className="flex items-center gap-1 text-[9px] font-mono text-text-muted tabular-nums">
          <span>{((lower ?? 0) * 100).toFixed(0)}%</span>
          <span className="text-text-muted/40">–</span>
          <span>{((upper ?? 0) * 100).toFixed(0)}%</span>
          <span className="text-text-muted/40">95% CI</span>
        </div>
      )}
    </div>
  )
}

/**
 * RiskScoreDisplay — full score + whisker combo
 * Shows the score number prominently + whisker below
 */
export function RiskScoreDisplay({
  score,
  lower,
  upper,
  size = 'md',
  className,
}: RiskWhiskerProps) {
  const color = scoreToColor(score)
  const pct = (score * 100).toFixed(score >= 0.1 ? 0 : 1)
  const textSize = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl'

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <span
        className={cn('font-black tabular-nums font-mono leading-none', textSize)}
        style={{ color }}
      >
        {pct}%
      </span>
      <RiskWhisker
        score={score}
        lower={lower}
        upper={upper}
        size={size}
        showLabels={lower != null}
      />
    </div>
  )
}
