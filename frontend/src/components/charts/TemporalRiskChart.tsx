/**
 * TemporalRiskChart
 *
 * A ComposedChart showing how procurement risk patterns changed from 2010–2025,
 * with vertical reference lines marking major corruption scandal revelations.
 *
 * Data strategy:
 * - Fetches from /analysis/year-over-year if available (YearOverYearChange[])
 * - Falls back to FALLBACK_DATA if the API is unavailable
 */

import { memo, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from '@/components/charts'
import { analysisApi } from '@/api/client'
import { cn } from '@/lib/utils'

// ============================================================================
// FALLBACK DATA — approximate values if no API endpoint available
// Based on RUBLI v5.1 model distribution and known procurement patterns
// ============================================================================

const FALLBACK_DATA = [
  { year: 2010, highRiskRate: 8.2, avgScore: 0.18, criticalCount: 4200 },
  { year: 2011, highRiskRate: 8.5, avgScore: 0.19, criticalCount: 5100 },
  { year: 2012, highRiskRate: 9.1, avgScore: 0.20, criticalCount: 6800 },
  { year: 2013, highRiskRate: 10.2, avgScore: 0.22, criticalCount: 9200 },
  { year: 2014, highRiskRate: 9.8, avgScore: 0.21, criticalCount: 8900 },
  { year: 2015, highRiskRate: 10.1, avgScore: 0.22, criticalCount: 9500 },
  { year: 2016, highRiskRate: 9.9, avgScore: 0.21, criticalCount: 9800 },
  { year: 2017, highRiskRate: 11.3, avgScore: 0.24, criticalCount: 12400 },
  { year: 2018, highRiskRate: 10.8, avgScore: 0.23, criticalCount: 11200 },
  { year: 2019, highRiskRate: 10.5, avgScore: 0.22, criticalCount: 10800 },
  { year: 2020, highRiskRate: 13.8, avgScore: 0.29, criticalCount: 18900 },
  { year: 2021, highRiskRate: 11.9, avgScore: 0.25, criticalCount: 14200 },
  { year: 2022, highRiskRate: 11.2, avgScore: 0.24, criticalCount: 13800 },
  { year: 2023, highRiskRate: 10.8, avgScore: 0.23, criticalCount: 12900 },
  { year: 2024, highRiskRate: 10.6, avgScore: 0.22, criticalCount: 12400 },
]

// ============================================================================
// SCANDAL ANNOTATIONS — vertical reference lines for major revelations
// ============================================================================

interface ScandalAnnotation {
  year: number
  label: string
  shortLabel: string
  color: string
}

const SCANDAL_ANNOTATIONS: ScandalAnnotation[] = [
  {
    year: 2013,
    label: 'La Estafa Maestra exposed',
    shortLabel: 'Estafa',
    color: '#f87171',
  },
  {
    year: 2017,
    label: 'Odebrecht scandal breaks',
    shortLabel: 'Odebrecht',
    color: '#fb923c',
  },
  {
    year: 2020,
    label: 'COVID emergency procurement',
    shortLabel: 'COVID',
    color: '#fbbf24',
  },
  {
    year: 2021,
    label: 'Segalmex audit findings',
    shortLabel: 'Segalmex',
    color: '#fb923c',
  },
  {
    year: 2023,
    label: 'EFOS ghost companies identified',
    shortLabel: 'EFOS',
    color: '#f87171',
  },
]

// ============================================================================
// CHART DATA TYPE
// ============================================================================

interface TemporalDataPoint {
  year: number
  highRiskRate: number
  avgScore: number
  criticalCount: number
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || label == null) return null

  const scandal = SCANDAL_ANNOTATIONS.find((s) => s.year === label)

  return (
    <div className="bg-background-card border border-border/60 rounded-lg px-3 py-2.5 shadow-lg text-xs font-mono min-w-[160px]">
      <p className="text-text-primary font-bold text-sm mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-3 mb-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-text-muted">{entry.name}</span>
          </div>
          <span className="text-text-primary font-semibold tabular-nums">
            {entry.name === 'Avg Risk Score'
              ? entry.value.toFixed(3)
              : `${entry.value.toFixed(1)}%`}
          </span>
        </div>
      ))}
      {scandal && (
        <div className="mt-2 pt-2 border-t border-border/40">
          <p className="text-risk-high text-[10px] leading-snug">{scandal.label}</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PROPS
// ============================================================================

export interface TemporalRiskChartProps {
  title?: string
  height?: number
  showScandals?: boolean
  className?: string
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TemporalRiskChart = memo(function TemporalRiskChart({
  title = 'Corruption Risk Over Time',
  height = 340,
  showScandals = true,
  className,
}: TemporalRiskChartProps) {
  const gradId = 'temporalRiskGrad'

  // Try to fetch live data from /analysis/year-over-year
  const { data: apiData, isError } = useQuery({
    queryKey: ['analysis', 'year-over-year', 'temporal-chart'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  // Map API response → TemporalDataPoint[], filtered to 2010+
  const liveData: TemporalDataPoint[] | null = useMemo(() => {
    if (!apiData?.data) return null
    const mapped = apiData.data
      .filter((d) => d.year >= 2010)
      .map((d) => ({
        year: d.year,
        // high_risk_pct is already a fraction (0–1) in YearOverYearChange; multiply for display
        highRiskRate: (d.high_risk_pct ?? 0) * 100,
        avgScore: d.avg_risk ?? 0,
        criticalCount: 0, // not provided by year-over-year endpoint
      }))
      .sort((a, b) => a.year - b.year)
    return mapped.length > 0 ? mapped : null
  }, [apiData])

  // Use live data if available and not errored; otherwise fall back
  const chartData: TemporalDataPoint[] = (!isError && liveData) ? liveData : FALLBACK_DATA

  const minYear = chartData[0]?.year ?? 2010
  const maxYear = chartData[chartData.length - 1]?.year ?? 2024

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-base font-bold text-text-primary">{title}</p>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            High-risk rate (left axis) · Avg risk score (right axis) · 2010–2025
          </p>
        </div>
        {!isError && liveData && (
          <span className="text-[10px] font-mono text-risk-low border border-risk-low/30 bg-risk-low/5 px-2 py-0.5 rounded">
            Live data
          </span>
        )}
        {(isError || !liveData) && (
          <span className="text-[10px] font-mono text-text-muted border border-border/30 bg-background-elevated/20 px-2 py-0.5 rounded">
            Estimated
          </span>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: 48, bottom: 8, left: 0 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(248,113,113,1)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="rgba(248,113,113,1)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e293b"
            vertical={false}
            opacity={0.6}
          />

          <XAxis
            dataKey="year"
            type="number"
            domain={[minYear, maxYear]}
            allowDecimals={false}
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
            tickCount={Math.min(chartData.length, 8)}
          />

          {/* Left Y-axis: high-risk rate % */}
          <YAxis
            yAxisId="left"
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            domain={[0, 'auto']}
            width={36}
          />

          {/* Right Y-axis: avg risk score */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(2)}
            domain={[0, 0.5]}
            width={40}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: 10, fontFamily: 'var(--font-mono, monospace)', color: '#64748b', paddingTop: 8 }}
          />

          {/* Scandal reference lines */}
          {showScandals &&
            SCANDAL_ANNOTATIONS.filter((s) => s.year >= minYear && s.year <= maxYear).map((scandal) => (
              <ReferenceLine
                key={scandal.year}
                yAxisId="left"
                x={scandal.year}
                stroke={scandal.color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.7}
                label={{
                  value: scandal.shortLabel,
                  position: 'insideTopRight',
                  fontSize: 9,
                  fill: scandal.color,
                  fontFamily: 'var(--font-mono, monospace)',
                  opacity: 0.9,
                }}
              />
            ))}

          {/* Area: high-risk rate */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="highRiskRate"
            name="High-Risk Rate"
            stroke="#f87171"
            strokeWidth={2}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 3, fill: '#f87171', strokeWidth: 0 }}
            isAnimationActive={false}
          />

          {/* Line: avg risk score */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgScore"
            name="Avg Risk Score"
            stroke="#fb923c"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: '#fb923c', strokeWidth: 0 }}
            strokeDasharray="6 2"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Scandal legend */}
      {showScandals && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {SCANDAL_ANNOTATIONS.filter((s) => s.year >= minYear && s.year <= maxYear).map((scandal) => (
            <div key={scandal.year} className="flex items-center gap-1.5">
              <div
                className="w-3 h-0 border-t border-dashed"
                style={{ borderColor: scandal.color, opacity: 0.8 }}
              />
              <span className="text-[10px] font-mono" style={{ color: scandal.color }}>
                {scandal.year}: {scandal.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
