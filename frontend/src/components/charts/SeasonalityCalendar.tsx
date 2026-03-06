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
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
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
  if (month === 12) return '#ef4444'   // December — danger red
  if (month === 11 || month === 1) return '#f97316' // adjacent months — orange
  return '#3b82f6'                      // all others — blue
}

// =============================================================================
// Custom tooltip
// =============================================================================

interface TooltipPayloadItem {
  payload?: MonthDatum
}

interface MonthDatum {
  month: number
  name: string
  contracts: number
  avgAmount: number
  avgRisk: number
  value: number
}

function CustomTooltip({
  active,
  payload,
  t,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  t: (key: string) => string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null

  const amountM = (d.avgAmount / 1_000_000).toFixed(2)
  const contractsK = d.contracts >= 1000
    ? `${(d.contracts / 1000).toFixed(1)}K`
    : String(d.contracts)

  return (
    <div className="rounded-lg border border-border/50 bg-background-elevated px-3 py-2 shadow-lg text-xs font-mono">
      <p className="font-bold text-text-primary mb-1">{d.name}</p>
      <p className="text-text-secondary">{t('seasonality.tooltip_avgRisk')}: <span className="text-text-primary">{(d.avgRisk * 100).toFixed(2)}%</span></p>
      <p className="text-text-secondary">{t('seasonality.tooltip_avgAmount')}: <span className="text-text-primary">MX${amountM}M</span></p>
      <p className="text-text-secondary">{t('seasonality.tooltip_contracts')}: <span className="text-text-primary">{contractsK}</span></p>
    </div>
  )
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

      {/* Chart */}
      <div className="relative" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="55%"
            innerRadius="25%"
            outerRadius="90%"
            startAngle={200}
            endAngle={-30}
            data={chartData}
            barSize={14}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              tick={false}
            />
            <RadialBar
              dataKey="value"
              background={{ fill: 'rgba(255,255,255,0.04)' }}
              label={false}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.month}`}
                  fill={barColor(entry.month)}
                  fillOpacity={entry.month === 12 ? 1 : 0.75}
                  style={
                    entry.month === 12
                      ? { filter: 'drop-shadow(0 0 6px #ef4444)' }
                      : undefined
                  }
                />
              ))}
            </RadialBar>
            <Tooltip content={<CustomTooltip t={t} />} />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center stat */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ paddingTop: '10%' }}
          aria-label="December is 64% higher risk than October average"
        >
          <span className="text-2xl font-bold font-mono text-[#ef4444]">{t('months.Dec')}</span>
          <span className="text-sm font-bold font-mono text-text-primary">
            +{decRiskPctHigher}% {t('seasonality.toggle_risk')}
          </span>
          <span className="text-[10px] text-text-muted font-mono">{t('seasonality.center_vsAvg')}</span>
        </div>
      </div>

      {/* December annotation */}
      <div className="flex items-start gap-2 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/05 px-3 py-2">
        <span className="text-[#ef4444] text-xs font-bold font-mono flex-shrink-0 mt-0.5">
          DEC
        </span>
        <p className="text-[11px] text-text-secondary leading-relaxed">
          {t('seasonality.annotation_label')} <span className="text-[#ef4444] font-bold">+{decRiskPctHigher}%</span> {t('seasonality.toggle_risk')} ·{' '}
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
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
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
