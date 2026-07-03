/**
 * SectorRiskTrendPanel — 12 small multiples (one per sector), shared y-scale.
 *
 * REBUILT 2026-05-29 (FALCO Phase 2): replaced 12-line spaghetti with
 * disciplined small-multiples grid. Same data contract, same props,
 * same export — visually it is a different chart.
 *
 * Layout: 3×4 → 4×3 responsive grid of ~150×80 mini-line panels.
 * Each panel:
 *   - Shared y-axis scale across all 12 (spike sizes comparable)
 *   - SECTOR_COLORS-tinted line + 12% area fill
 *   - Scandal vrules (Estafa 2013, COVID 2020, Segalmex 2021)
 *   - Sector name + Δmax label
 *   - Ordered by max-delta descending (biggest spikes top-left)
 *   - salud + agricultura highlighted with ring border (the actual story)
 *
 * Data strategy:
 *   - Primary: /sectors/{id}/trends per sector (in parallel)
 *   - Fallback: /analysis/year-over-year (renders as single sector panel)
 *   - No static fabrication — if both fail, empty state with explanation.
 */

import { memo, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries, useQuery } from '@tanstack/react-query'
import { analysisApi, sectorApi } from '@/api/client'
import { SECTOR_COLORS, SECTORS, RISK_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { YearOverYearChange } from '@/api/types'

// ============================================================================
// TYPES
// ============================================================================

interface YearPoint {
  year: number
  highRiskPct: number
  avgRisk: number
}

interface SectorLine {
  sectorId: number
  sectorCode: string
  sectorName: string
  color: string
  points: YearPoint[]      // sorted by year
  maxValue: number
  minValue: number
  delta: number             // max - min (used for ordering)
}

// ============================================================================
// SCANDAL ANNOTATIONS — vrules in every panel
// ============================================================================

interface ScandalAnnotation {
  year: number
  label: string             // long-form, used in legend
  shortLabel: string        // short, used in tooltip
}

const SCANDAL_ANNOTATIONS: ScandalAnnotation[] = [
  { year: 2013, label: 'La Estafa Maestra exposed', shortLabel: 'Estafa' },
  { year: 2020, label: 'COVID Emergency Procurement', shortLabel: 'COVID' },
  { year: 2021, label: 'Segalmex audit findings', shortLabel: 'Segalmex' },
]

// Sectors the audit calls out as the actual story — highlighted with ring.
const HIGHLIGHTED_SECTORS = new Set(['salud', 'agricultura'])

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
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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
// HOOK — fetch per-sector trend data
// ============================================================================

function useSectorTrendData() {
  const { t: ts } = useTranslation('sectors')

  // Fetch all 12 sectors in parallel
  const sectorQueries = useQueries({
    queries: SECTORS.map((sector) => ({
      queryKey: ['sectors', sector.id, 'trends'],
      queryFn: () => sectorApi.getTrends(sector.id),
      staleTime: 10 * 60 * 1000,
      retry: 1,
    })),
  })

  const allErrored = sectorQueries.every((q) => q.isError)

  // Fallback: global year-over-year (only if all per-sector errored)
  const globalQuery = useQuery({
    queryKey: ['analysis', 'year-over-year', 'sector-trend-panel'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: allErrored,
  })

  const isLoading =
    sectorQueries.some((q) => q.isLoading) ||
    (allErrored && globalQuery.isLoading)

  // Build SectorLine[]
  const sectorLines: SectorLine[] = useMemo(() => {
    // Per-sector path
    const fromPerSector = SECTORS.flatMap((sector, idx) => {
      const q = sectorQueries[idx]
      if (q.isError || !q.data?.data || q.data.data.length === 0) return []
      const points: YearPoint[] = q.data.data
        .filter((d: YearOverYearChange) => d.year >= 2010)
        .map((d: YearOverYearChange) => ({
          year: d.year,
          highRiskPct: d.high_risk_pct ?? 0,
          avgRisk: d.avg_risk ?? 0,
        }))
        .sort((a, b) => a.year - b.year)
      if (points.length === 0) return []
      const values = points.map((p) => p.highRiskPct)
      const maxValue = Math.max(...values)
      const minValue = Math.min(...values)
      return [{
        sectorId: sector.id,
        sectorCode: sector.code,
        sectorName: ts(sector.code),
        color: SECTOR_COLORS[sector.code] ?? '#64748b',
        points,
        maxValue,
        minValue,
        delta: maxValue - minValue,
      }]
    })

    if (fromPerSector.length > 0) return fromPerSector

    // Global fallback (single panel)
    if (allErrored && globalQuery.data?.data?.length) {
      const points: YearPoint[] = globalQuery.data.data
        .filter((d: YearOverYearChange) => d.year >= 2010)
        .map((d: YearOverYearChange) => ({
          year: d.year,
          highRiskPct: d.high_risk_pct ?? 0,
          avgRisk: d.avg_risk ?? 0,
        }))
        .sort((a, b) => a.year - b.year)
      if (points.length === 0) return []
      const values = points.map((p) => p.highRiskPct)
      const maxValue = Math.max(...values)
      const minValue = Math.min(...values)
      return [{
        sectorId: 0,
        sectorCode: 'all',
        sectorName: ts('charts.allSectors'),
        color: '#94a3b8',
        points,
        maxValue,
        minValue,
        delta: maxValue - minValue,
      }]
    }

    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ...sectorQueries.map((q) => q.data),
    ...sectorQueries.map((q) => q.isError),
    allErrored,
    globalQuery.data,
    ts,
  ])

  const isLive = sectorLines.length > 0 && sectorLines[0].sectorCode !== 'all'
  const usingFallback = sectorLines.length === 1 && sectorLines[0].sectorCode === 'all'
  const completelyEmpty = sectorLines.length === 0 && !isLoading

  return { sectorLines, isLoading, isLive, usingFallback, completelyEmpty }
}

// ============================================================================
// PANEL GEOMETRY
// ============================================================================

const PANEL_W = 150
const PANEL_H = 88
const MARGIN = { top: 8, right: 6, bottom: 16, left: 24 }

// ============================================================================
// PROPS — preserved from the v1 contract
// ============================================================================

export interface SectorRiskTrendPanelProps {
  className?: string
  /**
   * Sector IDs to render. If provided, only these sectors are drawn.
   * If undefined (default), all 12 sectors render.
   * `defaultSectors` (legacy name from the toggle era) is preserved as an
   * alias — kept for backwards compatibility with existing call sites.
   */
  defaultSectors?: number[]
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SectorRiskTrendPanel = memo(function SectorRiskTrendPanel({
  className,
  defaultSectors,
}: SectorRiskTrendPanelProps) {
  const { t } = useTranslation('sectors')
  const { sectorLines: rawSectorLines, isLoading, isLive, usingFallback, completelyEmpty } =
    useSectorTrendData()

  // Filter to defaultSectors if provided
  const filteredLines = useMemo(() => {
    if (!defaultSectors || defaultSectors.length === 0) return rawSectorLines
    return rawSectorLines.filter((sl) => defaultSectors.includes(sl.sectorId))
  }, [rawSectorLines, defaultSectors])

  // Localize sector names from the current i18n state
  const localizedLines = useMemo(
    () => filteredLines.map((sl) => ({
      ...sl,
      sectorName:
        sl.sectorCode === 'all'
          ? t('charts.allSectors')
          : (t(sl.sectorCode) || sl.sectorName),
    })),
    [filteredLines, t]
  )

  // Order panels by delta descending — biggest spikes top-left
  const orderedLines = useMemo(
    () => [...localizedLines].sort((a, b) => b.delta - a.delta),
    [localizedLines]
  )

  // Shared y-scale across all panels
  const { yMin, yMax, xMin, xMax } = useMemo(() => {
    if (orderedLines.length === 0) {
      return { yMin: 0, yMax: 20, xMin: 2010, xMax: 2025 }
    }
    let yLo = Infinity, yHi = -Infinity, xLo = Infinity, xHi = -Infinity
    orderedLines.forEach((sl) => {
      sl.points.forEach((p) => {
        if (p.highRiskPct < yLo) yLo = p.highRiskPct
        if (p.highRiskPct > yHi) yHi = p.highRiskPct
        if (p.year < xLo) xLo = p.year
        if (p.year > xHi) xHi = p.year
      })
    })
    // Round to nice numbers with a small headroom
    const pad = (yHi - yLo) * 0.08
    return {
      yMin: Math.max(0, Math.floor(yLo - pad)),
      yMax: Math.ceil(yHi + pad),
      xMin: xLo,
      xMax: xHi,
    }
  }, [orderedLines])

  // CSV download (all sectors, all years)
  const handleDownload = useCallback(() => {
    const rows: ExportRow[] = []
    orderedLines.forEach((sl) => {
      sl.points.forEach((p) => {
        rows.push({
          year: p.year,
          sectorName: sl.sectorName,
          highRiskPct: p.highRiskPct,
          avgRiskScore: p.avgRisk,
        })
      })
    })
    rows.sort((a, b) => a.year - b.year || a.sectorName.localeCompare(b.sectorName))
    exportCSV(rows, `rubli-sector-risk-trends-${xMin}-${xMax}.csv`)
  }, [orderedLines, xMin, xMax])

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className={cn('bg-background-elevated rounded-lg p-4', className)}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-text-primary">{t('charts.trendTitle')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-pulse">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-sm border border-border/30 bg-background-elevated/20"
                 style={{ height: PANEL_H + 24 }} />
          ))}
        </div>
      </div>
    )
  }

  // ---- Empty state ----
  if (completelyEmpty || orderedLines.length === 0) {
    return (
      <div className={cn('bg-background-elevated rounded-lg p-4', className)}>
        <p className="text-base font-bold text-text-primary mb-2">
          {t('charts.trendTitle')}
        </p>
        <div className="flex items-center justify-center text-sm text-text-muted border border-border/30 rounded-lg bg-background-elevated/20"
             style={{ height: 240 }}>
          {t('charts.noTrendData')}
        </div>
      </div>
    )
  }

  // Scales (closures over yMin/yMax/xMin/xMax)
  const innerW = PANEL_W - MARGIN.left - MARGIN.right
  const innerH = PANEL_H - MARGIN.top - MARGIN.bottom

  const xScale = (year: number) => {
    if (xMax === xMin) return MARGIN.left + innerW / 2
    return MARGIN.left + ((year - xMin) / (xMax - xMin)) * innerW
  }
  const yScale = (val: number) => {
    if (yMax === yMin) return MARGIN.top + innerH / 2
    return MARGIN.top + innerH - ((val - yMin) / (yMax - yMin)) * innerH
  }
  const bottomY = MARGIN.top + innerH

  // Y-axis ticks: yMin / midpoint / yMax
  const yTicks = [yMin, (yMin + yMax) / 2, yMax].map((v) => Math.round(v))

  // Top sector for the headline delta callout (sectorLines is delta-ordered)
  const leadSector = orderedLines[0]
  const leadDelta = leadSector.delta

  return (
    <div className={cn('bg-background-elevated rounded-lg p-4', className)}>
      {/* ---- Header ---- */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div>
          <p className="text-base font-bold text-text-primary">
            {t('charts.trendTitle')}
          </p>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            High-risk rate (%) · {xMin}–{xMax} · shared y-axis · ordered by Δmax
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isLive ? (
            <span className="flex items-center gap-1 text-[12px] font-mono text-risk-low border border-risk-low/30 bg-risk-low/5 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-low inline-block animate-pulse"
                    aria-hidden="true" />
              Live data
            </span>
          ) : usingFallback ? (
            <span className="text-[12px] font-mono text-text-muted border border-border/30 bg-background-elevated/20 px-2 py-0.5 rounded">
              Aggregated only
            </span>
          ) : (
            <span className="text-[12px] font-mono text-text-muted border border-border/30 bg-background-elevated/20 px-2 py-0.5 rounded">
              Partial
            </span>
          )}
          <button
            onClick={handleDownload}
            title={`Download CSV (${xMin}–${xMax})`}
            aria-label="Download sector risk trend data as CSV"
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-background-elevated/60 transition-colors"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ---- Editorial lede — biggest delta is the story ---- */}
      <div className="flex items-baseline gap-2 mb-3 border-l-2 pl-3 py-0.5"
           style={{ borderColor: leadSector.color }}>
        <span
          className="text-3xl font-serif font-bold tabular-nums leading-none"
          style={{ color: leadSector.color }}
        >
          +{leadDelta.toFixed(1)} pp
        </span>
        <span className="text-[13px] text-text-muted font-mono uppercase tracking-wide">
          {leadSector.sectorName} · max swing {xMin}–{xMax}
        </span>
      </div>

      {/* ---- Small-multiples grid ---- */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        role="group"
        aria-label="Per-sector risk trend small multiples"
      >
        {orderedLines.map((sl) => {
          const hasData = sl.points.length >= 2
          const isHighlighted = HIGHLIGHTED_SECTORS.has(sl.sectorCode)

          // Build line path
          const linePath = hasData
            ? sl.points
                .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.year).toFixed(1)},${yScale(p.highRiskPct).toFixed(1)}`)
                .join(' ')
            : ''
          const areaPath = hasData
            ? `${linePath} L${xScale(sl.points[sl.points.length - 1].year).toFixed(1)},${bottomY.toFixed(1)} L${xScale(sl.points[0].year).toFixed(1)},${bottomY.toFixed(1)} Z`
            : ''

          // Peak point (the spike)
          const peakIdx = sl.points.reduce(
            (best, p, i) => (p.highRiskPct > sl.points[best].highRiskPct ? i : best),
            0
          )
          const peak = sl.points[peakIdx]

          // Visible scandal vrules (inside year range)
          const vrules = SCANDAL_ANNOTATIONS.filter(
            (s) => s.year >= xMin && s.year <= xMax
          )

          return (
            <div
              key={sl.sectorCode}
              className={cn(
                'rounded-sm border bg-background-elevated/20 overflow-hidden p-1.5 space-y-1',
                isHighlighted
                  ? 'border-2 ring-1 ring-offset-0'
                  : 'border-border/40'
              )}
              style={
                isHighlighted
                  ? {
                      borderColor: sl.color,
                      // Use a ring color tied to the sector (no green, no raw hex literal)
                      ['--tw-ring-color' as string]: sl.color + '40',
                    }
                  : undefined
              }
              aria-label={`${sl.sectorName} risk trend ${xMin} to ${xMax}, peak ${peak.highRiskPct.toFixed(1)} percent in ${peak.year}, delta ${sl.delta.toFixed(1)} percentage points`}
              role="figure"
            >
              {/* Panel header: sector name + delta */}
              <div className="flex items-center justify-between gap-1 px-0.5">
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sl.color }}
                    aria-hidden="true"
                  />
                  <span className={cn(
                    'font-mono text-[12px] uppercase tracking-wide truncate',
                    isHighlighted ? 'text-text-primary font-semibold' : 'text-text-muted'
                  )}>
                    {sl.sectorName}
                  </span>
                </div>
                <span
                  className="text-[12px] font-mono tabular-nums flex-shrink-0"
                  style={{ color: sl.color }}
                >
                  +{sl.delta.toFixed(1)}
                </span>
              </div>

              {/* SVG mini-line */}
              <svg
                viewBox={`0 0 ${PANEL_W} ${PANEL_H}`}
                width="100%"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={`${sl.sectorName} risk trend chart`}
              >
                {/* Y-axis grid + tick labels */}
                {yTicks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={MARGIN.left}
                      y1={yScale(tick)}
                      x2={PANEL_W - MARGIN.right}
                      y2={yScale(tick)}
                      stroke="var(--color-border)"
                      strokeWidth={0.4}
                      strokeDasharray="2 3"
                      opacity={0.5}
                    />
                    <text
                      x={MARGIN.left - 3}
                      y={yScale(tick)}
                      fill="var(--color-text-muted)"
                      fontSize={7}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontFamily="monospace"
                    >
                      {tick}
                    </text>
                  </g>
                ))}

                {/* Scandal vrules — RISK_COLORS.critical for the line */}
                {vrules.map((s) => (
                  <g key={s.year}>
                    <line
                      x1={xScale(s.year)}
                      y1={MARGIN.top}
                      x2={xScale(s.year)}
                      y2={bottomY}
                      stroke={RISK_COLORS.critical}
                      strokeWidth={0.6}
                      strokeDasharray="1.5 2"
                      opacity={0.5}
                    />
                  </g>
                ))}

                {/* X-axis label: first/last year */}
                <text
                  x={xScale(xMin)}
                  y={PANEL_H - 3}
                  fill="var(--color-text-muted)"
                  fontSize={7}
                  textAnchor="start"
                  fontFamily="monospace"
                >
                  {xMin}
                </text>
                <text
                  x={xScale(xMax)}
                  y={PANEL_H - 3}
                  fill="var(--color-text-muted)"
                  fontSize={7}
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {xMax}
                </text>

                {hasData ? (
                  <>
                    {/* Area fill */}
                    <path
                      d={areaPath}
                      fill={sl.color}
                      fillOpacity={0.12}
                    />
                    {/* Line */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke={sl.color}
                      strokeWidth={isHighlighted ? 1.8 : 1.4}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {/* Peak dot */}
                    <circle
                      cx={xScale(peak.year)}
                      cy={yScale(peak.highRiskPct)}
                      r={2}
                      fill={sl.color}
                    />
                    {isHighlighted && (
                      <text
                        x={xScale(peak.year)}
                        y={yScale(peak.highRiskPct) - 4}
                        fill={sl.color}
                        fontSize={7.5}
                        textAnchor="middle"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {peak.highRiskPct.toFixed(1)}%
                      </text>
                    )}
                  </>
                ) : (
                  <text
                    x={PANEL_W / 2}
                    y={PANEL_H / 2}
                    fill="var(--color-text-muted)"
                    fontSize={8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="monospace"
                  >
                    {t('charts.noTrendData')}
                  </text>
                )}
              </svg>
            </div>
          )
        })}
      </div>

      {/* ---- Scandal legend ---- */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {SCANDAL_ANNOTATIONS.filter((s) => s.year >= xMin && s.year <= xMax).map(
          (scandal) => (
            <div key={scandal.year} className="flex items-center gap-1.5">
              <div
                className="w-3 h-0 border-t border-dashed"
                style={{ borderColor: RISK_COLORS.critical, opacity: 0.6 }}
              />
              <span
                className="text-[12px] font-mono"
                style={{ color: RISK_COLORS.critical, opacity: 0.85 }}
              >
                {scandal.year}: {scandal.label}
              </span>
            </div>
          )
        )}
      </div>

      {/* Footer methodology note */}
      <p className="mt-2 text-[12px] text-text-muted font-mono leading-relaxed">
        Shared y-axis ({yMin}%–{yMax}%). Panel borders highlight salud + agricultura — the two sectors with the largest scandal-era spikes.
      </p>
    </div>
  )
})

export default SectorRiskTrendPanel
