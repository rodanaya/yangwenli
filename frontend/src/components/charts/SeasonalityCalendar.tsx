/**
 * SeasonalityCalendar
 *
 * Radial bar chart revealing the "December Effect" — the predictable year-end
 * procurement spike that repeats across all 23 years of COMPRANET data.
 *
 * Metric toggle: avg risk score (default) | avg contract amount
 * December bar is highlighted red with an annotation callout.
 */

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

// =============================================================================
// Static data — 23-year aggregate from RUBLI_NORMALIZED.db
// =============================================================================

const MONTHLY_DATA_BASE = [
  { month: 1,  nameKey: 'Jan', contracts: 238252, avgAmount: 5011251, avgRisk: 0.1273 },
  { month: 2,  nameKey: 'Feb', contracts: 228300, avgAmount: 3340387, avgRisk: 0.1010 },
  { month: 3,  nameKey: 'Mar', contracts: 287688, avgAmount: 3483800, avgRisk: 0.1052 },
  { month: 4,  nameKey: 'Apr', contracts: 281966, avgAmount: 2934832, avgRisk: 0.1003 },
  { month: 5,  nameKey: 'May', contracts: 275603, avgAmount: 2599297, avgRisk: 0.0963 },
  { month: 6,  nameKey: 'Jun', contracts: 265717, avgAmount: 3227334, avgRisk: 0.1027 },
  { month: 7,  nameKey: 'Jul', contracts: 287703, avgAmount: 2700221, avgRisk: 0.0909 },
  { month: 8,  nameKey: 'Aug', contracts: 258908, avgAmount: 2524459, avgRisk: 0.0919 },
  { month: 9,  nameKey: 'Sep', contracts: 241899, avgAmount: 3141557, avgRisk: 0.0950 },
  { month: 10, nameKey: 'Oct', contracts: 280608, avgAmount: 2482730, avgRisk: 0.0900 },
  { month: 11, nameKey: 'Nov', contracts: 264285, avgAmount: 2686841, avgRisk: 0.1143 },
  { month: 12, nameKey: 'Dec', contracts: 199078, avgAmount: 4873188, avgRisk: 0.1476 },
]

// October has the lowest avg risk (0.09) — use as baseline for "64% higher"
const OCT_RISK = 0.0900
const DEC_RISK = 0.1476
const DEC_AMOUNT = 4873188

// =============================================================================
// Bar color logic
// =============================================================================

function barColor(month: number): string {
  if (month === 12) return '#f87171'   // December — danger red
  if (month === 11 || month === 1) return '#fb923c' // adjacent months — orange
  return '#3b82f6'                      // all others — blue
}

// =============================================================================
// Custom tooltip
// =============================================================================

interface MonthDatum {
  month: number
  name: string
  contracts: number
  avgAmount: number
  avgRisk: number
  value: number
}

// =============================================================================
// Main component
// =============================================================================

type Metric = 'risk' | 'amount'

export function SeasonalityCalendar() {
  const { t } = useTranslation('temporal')
  const [metric, setMetric] = useState<Metric>('risk')

  // Normalize to 0–100 scale for RadialBarChart
  const chartData: MonthDatum[] = useMemo(() => {
    const values = MONTHLY_DATA_BASE.map((d) => (metric === 'risk' ? d.avgRisk : d.avgAmount))
    const max = Math.max(...values)
    const min = Math.min(...values)
    const range = max - min || 1

    return MONTHLY_DATA_BASE.map((d) => {
      const raw = metric === 'risk' ? d.avgRisk : d.avgAmount
      // Scale to 20–100 so even min month has a visible bar
      const value = 20 + ((raw - min) / range) * 80
      return { ...d, name: t(`months.${d.nameKey}`), value }
    })
  }, [metric, t])

  const decRiskPctHigher = Math.round(((DEC_RISK - OCT_RISK) / OCT_RISK) * 100)
  const decAmountM = (DEC_AMOUNT / 1_000_000).toFixed(2)

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setMetric('risk')}
          className={cn(
            'px-3 py-1 rounded-md text-xs font-mono border transition-colors',
            metric === 'risk'
              ? 'bg-accent/20 text-accent border-accent/40'
              : 'text-text-muted border-border/40 hover:text-text-primary hover:bg-card-hover'
          )}
          aria-pressed={metric === 'risk'}
        >
          {t('seasonality.toggle_risk')}
        </button>
        <button
          onClick={() => setMetric('amount')}
          className={cn(
            'px-3 py-1 rounded-md text-xs font-mono border transition-colors',
            metric === 'amount'
              ? 'bg-accent/20 text-accent border-accent/40'
              : 'text-text-muted border-border/40 hover:text-text-primary hover:bg-card-hover'
          )}
          aria-pressed={metric === 'amount'}
        >
          {t('seasonality.toggle_amount')}
        </button>
      </div>

      {/* Vertical dot-matrix columns — one per month */}
      <div className="rounded-lg border border-border/30 bg-background-elevated/30 p-4">
        {(() => {
          const DOTS = 12           // vertical dots per column
          const DR = 3
          const DG = 8              // gap between dots vertically
          const COL_W = 24
          const HEIGHT = DOTS * DG + DR * 2
          const svgW = chartData.length * COL_W
          return (
            <svg
              viewBox={`0 0 ${svgW} ${HEIGHT + 18}`}
              className="w-full"
              role="img"
              aria-label="Monthly seasonality dot matrix"
            >
              {chartData.map((d, colIdx) => {
                const filled = Math.max(1, Math.round((d.value / 100) * DOTS))
                const cx = colIdx * COL_W + COL_W / 2
                const color = barColor(d.month)
                return (
                  <g key={d.month}>
                    {Array.from({ length: DOTS }).map((_, r) => {
                      // draw bottom-up: rows from index 0 = lowest, DOTS-1 = highest
                      const rowFromBottom = DOTS - 1 - r
                      const cy = DR + r * DG
                      const isFilled = rowFromBottom < filled
                      return (
                        <circle
                          key={r}
                          cx={cx}
                          cy={cy}
                          r={DR}
                          fill={isFilled ? color : '#f3f1ec'}
                          stroke={isFilled ? undefined : '#e2ddd6'}
                          strokeWidth={isFilled ? 0 : 0.5}
                          fillOpacity={isFilled ? (d.month === 12 ? 1 : 0.75) : 1}
                        />
                      )
                    })}
                    <text
                      x={cx}
                      y={HEIGHT + 12}
                      fontSize={9}
                      fontFamily="monospace"
                      fill={d.month === 12 ? '#f87171' : '#71717a'}
                      fontWeight={d.month === 12 ? 700 : 400}
                      textAnchor="middle"
                    >
                      {d.name.slice(0, 3)}
                    </text>
                  </g>
                )
              })}
            </svg>
          )
        })()}
        <p className="mt-3 text-center text-xs font-mono text-text-muted">
          <span className="text-[#f87171] font-bold">{t('months.Dec')}</span>
          {' '}+{decRiskPctHigher}% {t('seasonality.toggle_risk')} {t('seasonality.center_vsAvg')}
        </p>
      </div>

      {/* December annotation */}
      <div className="flex items-start gap-2 rounded-lg border border-[#f87171]/20 bg-[#f87171]/05 px-3 py-2">
        <span className="text-[#f87171] text-xs font-bold font-mono flex-shrink-0 mt-0.5">
          DEC
        </span>
        <p className="text-[11px] text-text-secondary leading-relaxed">
          {t('seasonality.annotation_label')} <span className="text-[#f87171] font-bold">+{decRiskPctHigher}%</span> {t('seasonality.toggle_risk')} ·{' '}
          Avg MX${decAmountM}M per contract
        </p>
      </div>

      {/* Insight callout */}
      <p className="text-[11px] text-text-muted leading-relaxed px-1 italic">
        {t('seasonality.callout')}
      </p>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] font-mono text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f87171]" />
          {t('seasonality.legend_dec')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f97316]" />
          {t('seasonality.legend_adjMonths')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
          {t('seasonality.legend_other')}
        </span>
      </div>
    </div>
  )
}
