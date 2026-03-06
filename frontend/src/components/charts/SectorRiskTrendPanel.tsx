/**
 * SectorRiskTrendPanel
 *
 * Shows procurement risk trends per sector from 2010–2025.
 * Data strategy:
 * - Primary: fetches per-sector trends from /sectors/{id}/trends (YearOverYearChange[])
 * - Fallback: /analysis/year-over-year as a single "All Sectors" line
 * - Static fallback if both fail
 *
 * Features:
 * - Sector toggle checkboxes (2 rows of 6) with color dots
 * - Scandal reference lines (Estafa Maestra 2013, COVID 2020, Segalmex 2021)
 * - Download CSV of visible data
 * - "Live data" / "Estimated" badge
 */

import { memo, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from '@/components/charts'
import { analysisApi, sectorApi } from '@/api/client'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { YearOverYearChange } from '@/api/types'

// ============================================================================
// TYPES
// ============================================================================

interface SectorLine {
  sectorId: number
  sectorCode: string
  sectorName: string
  color: string
  // Map of year -> { high_risk_pct, avg_risk }
  byYear: Map<number, { highRiskPct: number; avgRisk: number }>
}

interface ChartPoint {
  year: number
  [key: string]: number // sectorCode -> highRiskPct value
}

// ============================================================================
// SCANDAL ANNOTATIONS
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
]

// ============================================================================
// STATIC FALLBACK DATA — approximate per-sector estimates based on v5.1 model
// ============================================================================

const FALLBACK_SECTOR_DATA: Record<string, Record<number, number>> = {
  salud: {
    2010: 11.2, 2011: 11.8, 2012: 12.1, 2013: 13.0, 2014: 12.5,
    2015: 12.8, 2016: 12.3, 2017: 13.5, 2018: 13.1, 2019: 12.9,
    2020: 18.4, 2021: 15.2, 2022: 13.8, 2023: 13.2, 2024: 12.9,
  },
  educacion: {
    2010: 7.8, 2011: 8.1, 2012: 8.4, 2013: 9.0, 2014: 8.7,
    2015: 8.9, 2016: 8.5, 2017: 9.8, 2018: 9.2, 2019: 8.9,
    2020: 10.5, 2021: 9.8, 2022: 9.3, 2023: 9.0, 2024: 8.8,
  },
  infraestructura: {
    2010: 9.5, 2011: 9.8, 2012: 10.2, 2013: 11.1, 2014: 10.7,
    2015: 10.9, 2016: 10.6, 2017: 12.0, 2018: 11.5, 2019: 11.2,
    2020: 13.5, 2021: 12.1, 2022: 11.6, 2023: 11.1, 2024: 10.9,
  },
  energia: {
    2010: 10.3, 2011: 10.8, 2012: 11.4, 2013: 12.2, 2014: 11.8,
    2015: 12.1, 2016: 11.7, 2017: 13.2, 2018: 12.6, 2019: 12.2,
    2020: 14.8, 2021: 13.4, 2022: 12.8, 2023: 12.3, 2024: 12.0,
  },
  defensa: {
    2010: 6.5, 2011: 6.7, 2012: 6.9, 2013: 7.4, 2014: 7.1,
    2015: 7.3, 2016: 7.0, 2017: 7.9, 2018: 7.5, 2019: 7.3,
    2020: 8.6, 2021: 7.8, 2022: 7.5, 2023: 7.2, 2024: 7.0,
  },
  tecnologia: {
    2010: 8.9, 2011: 9.2, 2012: 9.6, 2013: 10.4, 2014: 10.0,
    2015: 10.2, 2016: 9.9, 2017: 11.3, 2018: 10.8, 2019: 10.5,
    2020: 12.4, 2021: 11.2, 2022: 10.7, 2023: 10.3, 2024: 10.1,
  },
  hacienda: {
    2010: 7.2, 2011: 7.5, 2012: 7.8, 2013: 8.4, 2014: 8.1,
    2015: 8.3, 2016: 8.0, 2017: 9.1, 2018: 8.7, 2019: 8.5,
    2020: 10.0, 2021: 9.1, 2022: 8.7, 2023: 8.4, 2024: 8.2,
  },
  gobernacion: {
    2010: 8.1, 2011: 8.4, 2012: 8.8, 2013: 9.5, 2014: 9.2,
    2015: 9.4, 2016: 9.0, 2017: 10.2, 2018: 9.8, 2019: 9.5,
    2020: 11.2, 2021: 10.2, 2022: 9.7, 2023: 9.3, 2024: 9.1,
  },
  agricultura: {
    2010: 9.0, 2011: 9.3, 2012: 9.7, 2013: 10.5, 2014: 10.1,
    2015: 10.4, 2016: 10.0, 2017: 11.4, 2018: 10.9, 2019: 10.6,
    2020: 14.2, 2021: 16.8, 2022: 13.5, 2023: 12.1, 2024: 11.5,
  },
  ambiente: {
    2010: 7.5, 2011: 7.8, 2012: 8.1, 2013: 8.7, 2014: 8.4,
    2015: 8.6, 2016: 8.3, 2017: 9.4, 2018: 9.0, 2019: 8.7,
    2020: 10.2, 2021: 9.3, 2022: 8.9, 2023: 8.6, 2024: 8.4,
  },
  trabajo: {
    2010: 7.0, 2011: 7.3, 2012: 7.6, 2013: 8.2, 2014: 7.9,
    2015: 8.1, 2016: 7.8, 2017: 8.9, 2018: 8.5, 2019: 8.2,
    2020: 9.6, 2021: 8.8, 2022: 8.4, 2023: 8.1, 2024: 7.9,
  },
  otros: {
    2010: 6.8, 2011: 7.0, 2012: 7.3, 2013: 7.9, 2014: 7.6,
    2015: 7.8, 2016: 7.5, 2017: 8.5, 2018: 8.1, 2019: 7.9,
    2020: 9.3, 2021: 8.5, 2022: 8.1, 2023: 7.8, 2024: 7.6,
  },
}

const FALLBACK_YEARS = [
  2010, 2011, 2012, 2013, 2014, 2015, 2016,
  2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024,
]

// ============================================================================
// CSV EXPORT
// ============================================================================

interface ExportRow {
  year: number
  sectorName: string
  highRiskPct: number
  avgRiskScore: number
}

function exportCSV(rows: ExportRow[], filename: string): void {
  const headers = ['year', 'sector_name', 'high_risk_pct', 'avg_risk_score']
  const lines = rows.map((r) =>
    [r.year, r.sectorName, r.highRiskPct.toFixed(2), r.avgRiskScore.toFixed(4)].join(',')
  )
  const csv = [headers.join(','), ...lines].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ============================================================================
// DOWNLOAD ICON
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
// CUSTOM TOOLTIP
// ============================================================================

interface TooltipEntry {
  name: string
  value: number
  color: string
  dataKey: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: number
  visibleSectors: string[]
}

function CustomTooltip({ active, payload, label, visibleSectors }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0 || label == null) return null

  const scandal = SCANDAL_ANNOTATIONS.find((s) => s.year === label)
  const filtered = payload.filter((e) => visibleSectors.includes(e.dataKey))

  return (
    <div className="bg-background-card border border-border/60 rounded-lg px-3 py-2.5 shadow-lg text-xs font-mono min-w-[180px] max-w-[240px]">
      <p className="text-text-primary font-bold text-sm mb-1.5">{label}</p>
      {filtered.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-muted truncate">{entry.name}</span>
          </div>
          <span className="text-text-primary font-semibold tabular-nums flex-shrink-0">
            {entry.value != null ? `${entry.value.toFixed(1)}%` : '—'}
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
// HOOKS — fetch per-sector trend data
// ============================================================================

/**
 * Fetches trend data for all 12 sectors in parallel.
 * Falls back to /analysis/year-over-year on failure.
 */
function useSectorTrendData() {
  const { t: ts } = useTranslation('sectors')
  // Fetch all sectors in parallel
  const sectorQueries = useQueries({
    queries: SECTORS.map((sector) => ({
      queryKey: ['sectors', sector.id, 'trends'],
      queryFn: () => sectorApi.getTrends(sector.id),
      staleTime: 10 * 60 * 1000,
      retry: 1,
    })),
  })

  // Fallback: global year-over-year
  const globalQuery = useQuery({
    queryKey: ['analysis', 'year-over-year', 'sector-trend-panel'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    // Only try if per-sector queries all errored
    enabled: sectorQueries.every((q) => q.isError),
  })

  const isLoading = sectorQueries.some((q) => q.isLoading)
  const allErrored = sectorQueries.every((q) => q.isError)

  // Build SectorLine[] from per-sector data
  const sectorLines: SectorLine[] = useMemo(() => {
    // If all errored, try global fallback
    if (allErrored) {
      if (globalQuery.data?.data && globalQuery.data.data.length > 0) {
        // Single "All Sectors" line from global endpoint
        const byYear = new Map<number, { highRiskPct: number; avgRisk: number }>()
        globalQuery.data.data
          .filter((d: YearOverYearChange) => d.year >= 2010)
          .forEach((d: YearOverYearChange) => {
            byYear.set(d.year, {
              highRiskPct: (d.high_risk_pct ?? 0) * 100,
              avgRisk: d.avg_risk ?? 0,
            })
          })
        return [
          {
            sectorId: 0,
            sectorCode: 'all',
            sectorName: 'All Sectors',
            color: '#94a3b8',
            byYear,
          },
        ]
      }
      // Both per-sector and global failed — use static fallback
      return SECTORS.map((sector) => {
        const byYear = new Map<number, { highRiskPct: number; avgRisk: number }>()
        const fallbackForSector = FALLBACK_SECTOR_DATA[sector.code] ?? {}
        FALLBACK_YEARS.forEach((yr) => {
          byYear.set(yr, { highRiskPct: fallbackForSector[yr] ?? 0, avgRisk: 0 })
        })
        return {
          sectorId: sector.id,
          sectorCode: sector.code,
          sectorName: ts(sector.code),
          color: SECTOR_COLORS[sector.code] ?? '#64748b',
          byYear,
        }
      })
    }

    // Build from per-sector queries (skip errored sectors)
    return SECTORS.flatMap((sector, idx) => {
      const q = sectorQueries[idx]
      if (q.isError || !q.data?.data || q.data.data.length === 0) return []
      const byYear = new Map<number, { highRiskPct: number; avgRisk: number }>()
      q.data.data
        .filter((d: YearOverYearChange) => d.year >= 2010)
        .forEach((d: YearOverYearChange) => {
          byYear.set(d.year, {
            highRiskPct: (d.high_risk_pct ?? 0) * 100,
            avgRisk: d.avg_risk ?? 0,
          })
        })
      if (byYear.size === 0) return []
      return [
        {
          sectorId: sector.id,
          sectorCode: sector.code,
          sectorName: ts(sector.code),
          color: SECTOR_COLORS[sector.code] ?? '#64748b',
          byYear,
        },
      ]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Depend on each sector query's data stability
    ...sectorQueries.map((q) => q.data),
    allErrored,
    globalQuery.data,
    ts,
  ])

  const isLive =
    !allErrored && sectorLines.length > 0 && sectorLines[0].sectorCode !== 'all'
  const usingFallback = allErrored && (!globalQuery.data || !globalQuery.data.data?.length)

  return { sectorLines, isLoading, isLive, usingFallback }
}

// ============================================================================
// PROPS
// ============================================================================

export interface SectorRiskTrendPanelProps {
  className?: string
  defaultSectors?: number[] // sector IDs to show by default; undefined = all
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SectorRiskTrendPanel = memo(function SectorRiskTrendPanel({
  className,
  defaultSectors,
}: SectorRiskTrendPanelProps) {
  const { t } = useTranslation('sectors')
  const { sectorLines: rawSectorLines, isLoading, isLive, usingFallback } = useSectorTrendData()

  // Localize sector names using the sectors namespace
  const sectorLines = useMemo(
    () => rawSectorLines.map((sl) => ({
      ...sl,
      sectorName: sl.sectorCode === 'all' ? t('charts.allSectors') : (t(sl.sectorCode) || sl.sectorName),
    })),
    [rawSectorLines, t]
  )

  // Initialize enabled sectors from defaultSectors prop
  const [enabledSectorCodes, setEnabledSectorCodes] = useState<Set<string>>(() => {
    if (!defaultSectors || defaultSectors.length === 0) {
      // All sectors enabled by default
      return new Set(SECTORS.map((s) => s.code))
    }
    const defaultCodes = new Set(
      SECTORS.filter((s) => defaultSectors.includes(s.id)).map((s) => s.code)
    )
    return defaultCodes
  })

  const toggleSector = useCallback((code: string) => {
    setEnabledSectorCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }, [])

  // Build chart data: array of { year, [sectorCode]: highRiskPct }
  const chartData: ChartPoint[] = useMemo(() => {
    if (sectorLines.length === 0) return []

    // Collect all years across all visible sectors
    const allYears = new Set<number>()
    sectorLines.forEach((sl) => {
      if (enabledSectorCodes.has(sl.sectorCode) || sl.sectorCode === 'all') {
        sl.byYear.forEach((_, yr) => allYears.add(yr))
      }
    })

    return Array.from(allYears)
      .sort((a, b) => a - b)
      .map((year) => {
        const point: ChartPoint = { year }
        sectorLines.forEach((sl) => {
          const val = sl.byYear.get(year)
          point[sl.sectorCode] = val?.highRiskPct ?? 0
        })
        return point
      })
  }, [sectorLines, enabledSectorCodes])

  // Visible sector lines for the chart
  const visibleLines = useMemo(
    () => sectorLines.filter((sl) => enabledSectorCodes.has(sl.sectorCode) || sl.sectorCode === 'all'),
    [sectorLines, enabledSectorCodes]
  )

  const visibleKeys = useMemo(() => visibleLines.map((sl) => sl.sectorCode), [visibleLines])

  // Year range for reference lines
  const minYear = chartData[0]?.year ?? 2010
  const maxYear = chartData[chartData.length - 1]?.year ?? 2024

  // CSV export
  const handleDownload = useCallback(() => {
    const rows: ExportRow[] = []
    visibleLines.forEach((sl) => {
      sl.byYear.forEach((val, year) => {
        rows.push({
          year,
          sectorName: sl.sectorName,
          highRiskPct: val.highRiskPct,
          avgRiskScore: val.avgRisk,
        })
      })
    })
    rows.sort((a, b) => a.year - b.year || a.sectorName.localeCompare(b.sectorName))
    exportCSV(rows, `rubli-sector-risk-trends-${minYear}-${maxYear}.csv`)
  }, [visibleLines, minYear, maxYear])

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className={cn('bg-surface-secondary rounded-lg p-4', className)}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-text-primary">{t('charts.trendTitle')}</p>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="bg-surface-muted rounded h-6 w-48" />
          <div className="bg-surface-muted rounded" style={{ height: 380 }} />
        </div>
      </div>
    )
  }

  // ---- Empty state (no sector data at all) ----
  if (chartData.length === 0) {
    return (
      <div className={cn('bg-surface-secondary rounded-lg p-4', className)}>
        <p className="text-base font-bold text-text-primary mb-2">
          {t('charts.trendTitle')}
        </p>
        <div className="flex items-center justify-center text-sm text-text-muted border border-border/30 rounded-lg bg-background-elevated/20" style={{ height: 380 }}>
          {t('charts.noTrendData')}
        </div>
      </div>
    )
  }

  const isSingleLine = sectorLines.length === 1 && sectorLines[0].sectorCode === 'all'

  return (
    <div className={cn('bg-surface-secondary rounded-lg p-4', className)}>
      {/* ---- Header ---- */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <p className="text-base font-bold text-text-primary">
            {t('charts.trendTitle')}
          </p>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            High-risk rate (%) · 2010–2025
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Data source badge */}
          {isLive ? (
            <span className="flex items-center gap-1 text-[10px] font-mono text-risk-low border border-risk-low/30 bg-risk-low/5 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-low inline-block animate-pulse" />
              Live data
            </span>
          ) : usingFallback ? (
            <span className="text-[10px] font-mono text-text-muted border border-border/30 bg-background-elevated/20 px-2 py-0.5 rounded">
              Estimated
            </span>
          ) : (
            <span className="text-[10px] font-mono text-text-muted border border-border/30 bg-background-elevated/20 px-2 py-0.5 rounded">
              Partial
            </span>
          )}

          {/* Download CSV */}
          <button
            onClick={handleDownload}
            title={`Download CSV (${minYear}–${maxYear})`}
            aria-label="Download sector risk trend data as CSV"
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-muted/60 transition-colors"
            disabled={visibleLines.length === 0}
          >
            <DownloadIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ---- Sector toggles (2 rows of 6, only when per-sector data available) ---- */}
      {!isSingleLine && sectorLines.length > 0 && (
        <div className="grid grid-cols-6 gap-x-2 gap-y-1 mb-3" role="group" aria-label="Toggle sectors">
          {sectorLines.map((sl) => {
            const isEnabled = enabledSectorCodes.has(sl.sectorCode)
            return (
              <button
                key={sl.sectorCode}
                onClick={() => toggleSector(sl.sectorCode)}
                aria-pressed={isEnabled}
                title={isEnabled ? `Hide ${sl.sectorName}` : `Show ${sl.sectorName}`}
                className={cn(
                  'flex items-center gap-1 text-[10px] font-mono px-1.5 py-1 rounded transition-opacity',
                  isEnabled ? 'opacity-100' : 'opacity-30',
                  'hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/50'
                )}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sl.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-text-muted leading-none">{sl.sectorName}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ---- Line Chart ---- */}
      <ResponsiveContainer width="100%" height={380}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        >
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
            tick={{
              fill: '#64748b',
              fontSize: 10,
              fontFamily: 'var(--font-mono, monospace)',
            }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
            tickCount={Math.min(chartData.length, 8)}
          />

          <YAxis
            tick={{
              fill: '#64748b',
              fontSize: 10,
              fontFamily: 'var(--font-mono, monospace)',
            }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            domain={[0, 'auto']}
            width={36}
          />

          <Tooltip
            content={
              <CustomTooltip visibleSectors={visibleKeys} />
            }
          />

          {/* Scandal reference lines */}
          {SCANDAL_ANNOTATIONS.filter(
            (s) => s.year >= minYear && s.year <= maxYear
          ).map((scandal, idx) => (
            <ReferenceLine
              key={scandal.year}
              x={scandal.year}
              stroke={scandal.color}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.7}
              label={{
                value: scandal.shortLabel,
                position: idx % 2 === 0 ? 'insideTopRight' : 'insideTopLeft',
                fontSize: 9,
                fill: scandal.color,
                fontFamily: 'var(--font-mono, monospace)',
                opacity: 0.9,
              }}
            />
          ))}

          {/* Sector lines */}
          {sectorLines.map((sl) => (
            <Line
              key={sl.sectorCode}
              type="monotone"
              dataKey={sl.sectorCode}
              name={sl.sectorName}
              stroke={sl.color}
              strokeWidth={enabledSectorCodes.has(sl.sectorCode) || isSingleLine ? 1.8 : 0}
              dot={false}
              activeDot={
                enabledSectorCodes.has(sl.sectorCode) || isSingleLine
                  ? { r: 3, fill: sl.color, strokeWidth: 0 }
                  : false
              }
              hide={!enabledSectorCodes.has(sl.sectorCode) && !isSingleLine}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* ---- Scandal legend ---- */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {SCANDAL_ANNOTATIONS.filter(
          (s) => s.year >= minYear && s.year <= maxYear
        ).map((scandal) => (
          <div key={scandal.year} className="flex items-center gap-1.5">
            <div
              className="w-3 h-0 border-t border-dashed"
              style={{ borderColor: scandal.color, opacity: 0.8 }}
            />
            <span
              className="text-[10px] font-mono"
              style={{ color: scandal.color }}
            >
              {scandal.year}: {scandal.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
