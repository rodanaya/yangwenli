/**
 * WaterfallRiskChart — pure SVG SHAP contribution bars.
 *
 * Horizontal diverging bars, positive = risk-increasing (red),
 * negative = risk-protective (green). No Recharts dependency.
 */
import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface WaterfallFeature {
  feature: string
  z_score: number
  coefficient: number
  contribution: number
  label_en: string
}

interface WaterfallRiskChartProps {
  features: WaterfallFeature[]
  baseScore?: number
  finalScore?: number
  className?: string
}

export function WaterfallRiskChart({
  features,
  className,
}: WaterfallRiskChartProps) {
  const data = useMemo(() => {
    return [...features]
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 10)
      .map((f) => ({
        label: f.label_en,
        contribution: f.contribution,
        feature: f.feature,
        z_score: f.z_score,
        coefficient: f.coefficient,
      }))
  }, [features])

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-48 text-xs text-text-muted', className)}>
        No feature data available
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => Math.abs(d.contribution)), 0.1)

  const ROW_H = 30
  const LABEL_W = 126
  const BAR_AREA = 164
  const VAL_W = 58
  const svgW = LABEL_W + BAR_AREA + VAL_W
  const svgH = data.length * ROW_H + 6
  const centerX = LABEL_W + BAR_AREA / 2

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        height={Math.max(200, svgH)}
        role="img"
        aria-label="SHAP feature contribution chart"
      >
        {/* Zero axis */}
        <line
          x1={centerX}
          y1={0}
          x2={centerX}
          y2={svgH}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />

        {data.map((entry, i) => {
          const y = i * ROW_H
          const barPx = (Math.abs(entry.contribution) / maxVal) * (BAR_AREA / 2 - 5)
          const isPos = entry.contribution >= 0
          const color = isPos ? '#dc2626' : '#16a34a'
          const x1 = isPos ? centerX : centerX - barPx

          return (
            <g key={entry.feature}>
              {/* Feature label */}
              <text
                x={LABEL_W - 6}
                y={y + ROW_H * 0.52}
                fill="var(--color-text-secondary, #a1a1aa)"
                fontSize={10}
                textAnchor="end"
                dominantBaseline="middle"
                fontFamily="var(--font-family-mono, monospace)"
              >
                {entry.label.slice(0, 18)}
              </text>

              {/* z-score sublabel */}
              <text
                x={LABEL_W - 6}
                y={y + ROW_H * 0.80}
                fill="rgba(113,113,122,0.55)"
                fontSize={7.5}
                textAnchor="end"
                dominantBaseline="auto"
                fontFamily="var(--font-family-mono, monospace)"
              >
                z={entry.z_score.toFixed(2)}
              </text>

              {/* Contribution bar */}
              <rect
                x={x1}
                y={y + ROW_H * 0.20}
                width={Math.max(barPx, 2)}
                height={ROW_H * 0.55}
                fill={color}
                fillOpacity={0.84}
                rx={2}
              />

              {/* Value label */}
              <text
                x={isPos ? centerX + barPx + 5 : centerX - barPx - 5}
                y={y + ROW_H * 0.52}
                fill={color}
                fontSize={9}
                textAnchor={isPos ? 'start' : 'end'}
                dominantBaseline="middle"
                fontFamily="var(--font-family-mono, monospace)"
              >
                {isPos ? '+' : ''}{entry.contribution.toFixed(3)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default WaterfallRiskChart
