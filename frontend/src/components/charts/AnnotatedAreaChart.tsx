/**
 * AnnotatedAreaChart — Temporal area chart with editorial reference lines.
 *
 * Shows contract volume or risk trends over time with annotated vertical
 * reference lines for key events (AMLO era, COVID, etc.).
 * Gradient fills from sector color to transparent. Recharts-based.
 */

import { memo, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { SECTORS, SECTOR_COLORS } from '@/lib/constants'
import { getLocale } from '@/lib/utils'
import type { SectorYearItem } from '@/api/types'

const DATA_SOURCE = 'Source: RUBLI analysis · COMPRANET data 2002–2025 · Risk model v6.5'

interface AnnotatedAreaChartProps {
  /** Raw sector-year breakdown items */
  sectorYearData: SectorYearItem[]
  /** Sector ID to display (1-12). If omitted, shows aggregate across all sectors. */
  sectorId?: number
  /** Metric to plot on Y axis */
  metric?: 'contracts' | 'total_value' | 'high_risk_pct' | 'avg_risk'
  /** Chart height (default 300) */
  height?: number
}

interface EventAnnotation {
  year: number
  label: string
  color: string
}

const EVENTS: EventAnnotation[] = [
  { year: 2018, label: 'AMLO era begins', color: '#4ade80' },
  { year: 2020, label: 'COVID emergency', color: '#f87171' },
]

const METRIC_LABELS: Record<string, string> = {
  contracts: 'Contracts',
  total_value: 'Total Value (MXN)',
  high_risk_pct: 'High-Risk %',
  avg_risk: 'Avg Risk Score',
}

function formatMetricValue(value: number, metric: string): string {
  if (metric === 'total_value') {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `${(value / 1e9).toFixed(0)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`
    return value.toLocaleString(getLocale())
  }
  if (metric === 'high_risk_pct' || metric === 'avg_risk') {
    const pct = metric === 'avg_risk' ? value * 100 : value
    return `${pct.toFixed(1)}%`
  }
  return value.toLocaleString()
}

export const AnnotatedAreaChart = memo(function AnnotatedAreaChart({
  sectorYearData,
  sectorId,
  metric = 'high_risk_pct',
  height = 300,
}: AnnotatedAreaChartProps) {
  const sectorInfo = sectorId
    ? SECTORS.find((s) => s.id === sectorId)
    : undefined

  const areaColor = sectorInfo
    ? SECTOR_COLORS[sectorInfo.code] || '#8b5cf6'
    : '#8b5cf6'

  const chartData = useMemo(() => {
    const filtered = sectorId
      ? sectorYearData.filter((d) => d.sector_id === sectorId)
      : sectorYearData

    // Group by year
    const byYear = new Map<number, SectorYearItem[]>()
    for (const item of filtered) {
      const arr = byYear.get(item.year) ?? []
      arr.push(item)
      byYear.set(item.year, arr)
    }

    const years = Array.from(byYear.keys()).sort((a, b) => a - b)

    return years.map((year) => {
      const items = byYear.get(year) ?? []
      const totalContracts = items.reduce((s, r) => s + r.contracts, 0)

      let value: number
      if (metric === 'contracts') {
        value = totalContracts
      } else if (metric === 'total_value') {
        value = items.reduce((s, r) => s + r.total_value, 0)
      } else if (metric === 'high_risk_pct') {
        value =
          totalContracts > 0
            ? items.reduce((s, r) => s + r.high_risk_pct * r.contracts, 0) / totalContracts
            : 0
      } else {
        // avg_risk
        value =
          totalContracts > 0
            ? items.reduce((s, r) => s + r.avg_risk * r.contracts, 0) / totalContracts
            : 0
      }

      return { year, value }
    })
  }, [sectorYearData, sectorId, metric])

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-zinc-600 text-sm font-mono">
        No temporal data available
      </div>
    )
  }

  const gradientId = `area-grad-${sectorId ?? 'all'}-${metric}`
  const title = sectorInfo
    ? `${sectorInfo.nameEN}: ${METRIC_LABELS[metric] ?? metric} over time`
    : `All Sectors: ${METRIC_LABELS[metric] ?? metric} over time`

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={areaColor} stopOpacity={0.4} />
              <stop offset="95%" stopColor={areaColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#71717a', fontSize: 11, fontFamily: "ui-monospace, 'SF Mono', monospace" }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
          />
          <YAxis
            tick={{ fill: '#71717a', fontSize: 10, fontFamily: "ui-monospace, 'SF Mono', monospace" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatMetricValue(v, metric)}
            width={55}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              fontSize: 12,
              fontFamily: "ui-monospace, 'SF Mono', monospace",
              color: '#f4f4f5',
            }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(v: number | undefined) => [formatMetricValue(v ?? 0, metric), METRIC_LABELS[metric]]}
          />

          {/* Annotated reference lines for key events */}
          {EVENTS.map((evt) => (
            <ReferenceLine
              key={evt.year}
              x={evt.year}
              stroke={evt.color}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={0.6}
              label={{
                value: evt.label,
                position: 'insideTopRight',
                fill: evt.color,
                fontSize: 10,
                fontWeight: 600,
                dy: -4,
              }}
            />
          ))}

          <Area
            type="monotone"
            dataKey="value"
            stroke={areaColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 5,
              stroke: areaColor,
              strokeWidth: 2,
              fill: '#18181b',
            }}
            name={title}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-zinc-600 font-mono mt-2 pt-2 border-t border-zinc-800">
        {DATA_SOURCE}
      </p>
    </div>
  )
})

export default AnnotatedAreaChart
