/**
 * WaterfallRiskChart — SHAP contribution bars, left-anchored + full-width.
 *
 * Horizontal bars sorted by |contribution|. Positive = risk-increasing (red),
 * negative = risk-protective (neutral slate — never green, Bible §3.10).
 * Left-aligned to the section margin with bars that fill the available width
 * (the old fixed-348px SVG rendered tiny + centered). No chart dependency.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface WaterfallFeature {
  feature: string
  z_score: number
  coefficient: number
  contribution: number
  label_en: string
  label_es?: string
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
  const { i18n } = useTranslation()
  const isEs = i18n.language?.startsWith('es') ?? false
  const data = useMemo(() => {
    return [...features]
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 10)
      .map((f) => ({
        label: (isEs ? f.label_es : f.label_en) || f.label_en,
        contribution: f.contribution,
        feature: f.feature,
        z_score: f.z_score,
        coefficient: f.coefficient,
      }))
  }, [features, isEs])

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-48 text-xs text-text-muted', className)}>
        {isEs ? 'Sin datos de factores disponibles' : 'No feature data available'}
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => Math.abs(d.contribution)), 0.1)

  return (
    <div className={cn('w-full space-y-2', className)}>
      {data.map((entry) => {
        const isPos = entry.contribution >= 0
        // Bible §3.10: risk-decreasing contributions are neutral slate, not green.
        const color = isPos ? '#dc2626' : '#64748b'
        const barPct = Math.max(1.5, (Math.abs(entry.contribution) / maxVal) * 100)
        return (
          <div key={entry.feature} className="flex items-center gap-3">
            {/* Factor label + z-score — left-aligned column, anchors the section */}
            <div className="flex-shrink-0" style={{ width: 188 }}>
              <div
                className="truncate"
                title={entry.label}
                style={{
                  fontFamily: 'var(--font-family-mono, monospace)',
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.2,
                }}
              >
                {entry.label}
              </div>
              <div
                className="tabular-nums"
                style={{
                  fontFamily: 'var(--font-family-mono, monospace)',
                  fontSize: 8.5,
                  color: 'var(--color-text-muted)',
                  opacity: 0.7,
                  lineHeight: 1.2,
                }}
              >
                z={entry.z_score.toFixed(2)}
              </div>
            </div>

            {/* Contribution bar — fills the remaining width (big, not a 77px stub) */}
            <div className="flex-1 relative" style={{ height: 18 }} aria-hidden="true">
              <div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ width: `${barPct}%`, background: color, opacity: isPos ? 0.86 : 0.6 }}
              />
            </div>

            {/* Value — right-aligned */}
            <span
              className="flex-shrink-0 text-right tabular-nums"
              style={{
                width: 58,
                fontFamily: 'var(--font-family-mono, monospace)',
                fontSize: 13,
                fontWeight: 700,
                color,
              }}
            >
              {isPos ? '+' : ''}{entry.contribution.toFixed(3)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default WaterfallRiskChart
