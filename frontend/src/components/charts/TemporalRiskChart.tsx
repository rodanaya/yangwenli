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

import { memo, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  EditorialComposedChart,
  type ComposedLayer,
  type ChartAnnotation,
} from '@/components/charts/editorial'
import { analysisApi } from '@/api/client'
import { cn } from '@/lib/utils'

// ============================================================================
// FALLBACK DATA — approximate values if no API endpoint available
// Based on RUBLI v6.0 model distribution and known procurement patterns
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
    year: 2018,
    label: 'Toka IT Monopoly',
    shortLabel: 'Toka',
    color: '#8b5cf6',
  },
  {
    year: 2020,
    label: 'COVID Emergency Procurement',
    shortLabel: 'COVID',
    color: '#dc2626',
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
// CSV EXPORT UTILITY
// ============================================================================

function exportCSV(data: TemporalDataPoint[], filename: string): void {
  const headers = ['Year', 'High Risk Rate (%)', 'Avg Risk Score', 'Critical Count']
  const rows = data.map((d) => [
    d.year,
    d.highRiskRate?.toFixed(2),
    d.avgScore?.toFixed(4),
    d.criticalCount ?? 0,
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================================
// DOWNLOAD ICON (inline SVG — no extra dependency)
// ============================================================================

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 12l-4-4h2.5V3h3v5H12L8 12z" />
      <rect x="2" y="13" width="12" height="1.5" rx="0.75" />
    </svg>
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
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  // Try to fetch live data from /analysis/year-over-year
  const { data: apiData, isLoading, isError } = useQuery({
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
        highRiskRate: d.high_risk_pct ?? 0,
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

  const handleDownload = useCallback(() => {
    const filename = `rubli-risk-trends-${minYear}-${maxYear}.csv`
    exportCSV(chartData, filename)
  }, [chartData, minYear, maxYear])

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['analysis', 'year-over-year', 'temporal-chart'] })
  }, [queryClient])

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-base font-bold text-text-primary">{title}</p>
            <p className="text-xs text-text-muted font-mono mt-0.5">
              High-risk rate (left axis) · Avg risk score (right axis) · 2010–2025
            </p>
          </div>
        </div>
        <div className="animate-pulse bg-surface-muted rounded h-64 w-full" />
      </div>
    )
  }

  // ---- Error state with no fallback possible (should rarely occur — fallback is always present) ----
  if (isError && !liveData && FALLBACK_DATA.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-text-primary">{title}</p>
        </div>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center text-sm text-text-muted border border-border/30 rounded-lg bg-background-elevated/20">
          <span>{t('temporal.failedToLoad', 'Failed to load risk trend data.')}</span>
          <button
            onClick={handleRetry}
            className="text-xs px-3 py-1.5 rounded border border-border/60 hover:border-accent/60 hover:text-accent transition-colors"
          >
            {t('temporal.retry', 'Retry')}
          </button>
        </div>
      </div>
    )
  }

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
        <div className="flex items-center gap-2">
          {/* Data source badge */}
          {!isError && liveData ? (
            <span className="text-[10px] font-mono text-risk-low border border-risk-low/30 bg-risk-low/5 px-2 py-0.5 rounded">
              {t('temporal.liveData', 'Live data')}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-text-muted border border-border/30 bg-background-elevated/20 px-2 py-0.5 rounded">
              {t('temporal.estimated', 'Estimated')}
            </span>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            title={`Download CSV (${minYear}–${maxYear})`}
            aria-label="Download chart data as CSV"
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-muted/60 transition-colors"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
          </button>

          {/* Retry button when API failed but fallback is shown */}
          {isError && (
            <button
              onClick={handleRetry}
              title={t('temporal.retryLive', 'Retry live data')}
              aria-label={t('temporal.retryLive', 'Retry live data')}
              className="text-[10px] font-mono text-text-muted border border-border/30 px-2 py-0.5 rounded hover:text-accent hover:border-accent/40 transition-colors"
            >
              {t('temporal.retry', 'Retry')}
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <EditorialComposedChart<TemporalDataPoint>
        data={chartData}
        xKey="year"
        layers={
          [
            { kind: 'area', key: 'highRiskRate', label: 'High-Risk Rate', colorToken: 'risk-critical', axis: 'left' },
            { kind: 'line', key: 'avgScore', label: 'Avg Risk Score', colorToken: 'risk-high', axis: 'right', style: 'dashed', emphasis: 'secondary' },
          ] as ComposedLayer<TemporalDataPoint>[]
        }
        yFormat="pct"
        rightYFormat="decimal"
        rightYDomain={[0, 0.5]}
        annotations={
          showScandals
            ? (SCANDAL_ANNOTATIONS.filter((s) => s.year >= minYear && s.year <= maxYear).map(
                (s) => ({ kind: 'vrule', x: s.year, label: s.shortLabel, tone: 'critical' }) as ChartAnnotation,
              ))
            : []
        }
        height={height}
      />

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
