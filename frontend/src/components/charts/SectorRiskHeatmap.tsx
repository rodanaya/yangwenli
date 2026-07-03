/**
 * SectorRiskHeatmap — NYT-style editorial heatmap
 *
 * 12 sectors x 24 years risk grid. Dark zinc-900 background with
 * risk-colored cells using RISK_COLORS constants. Administration
 * bands across the top. Metric toggle (risk / high-risk% / DA%).
 *
 * Design: NYT election map aesthetic — strong color contrast on dark,
 * clean monospace labels, hover tooltips with full context.
 */

import { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { SECTORS, SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import { ADMIN_COLORS } from '@/lib/administrations'
import { formatCompactMXN, getLocale } from '@/lib/utils'
import { analysisApi } from '@/api/client'
import EditorialChartFrame from '@/components/stories/EditorialChartFrame'

const YEARS = Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2002 + i)

const ADMINS = [
  { name: 'Fox',        start: 2002, end: 2005, color: ADMIN_COLORS.fox },
  { name: 'Calderon',   start: 2006, end: 2011, color: ADMIN_COLORS.calderon },
  { name: 'EPN',        start: 2012, end: 2017, color: ADMIN_COLORS.epn },
  { name: 'AMLO',       start: 2018, end: 2023, color: ADMIN_COLORS.amlo },
  { name: 'Sheinbaum',  start: 2024, end: 2025, color: ADMIN_COLORS.sheinbaum },
]

type CellMetric = 'risk' | 'high_risk_pct' | 'direct_award_pct'

// METRIC_LABELS now computed inside component to support i18n
type MetricLabels = Record<CellMetric, string>

/**
 * Map a value to a risk-appropriate background color.
 * Uses darker, muted versions of RISK_COLORS for the cell background.
 * The full-brightness RISK_COLORS are reserved for the legend.
 */
// Low maps to a neutral warm-cream tile (never green). Medium/high/critical
// come straight from RISK_COLORS so legend, cells, and tooltip all agree.
const CELL_LOW_BG = '#e2ddd6' // warm neutral baseline; not a risk tier color

function metricColor(value: number, metric: CellMetric): string {
  let t: number
  if (metric === 'risk') {
    t = Math.min(value / 0.60, 1) // normalize to v0.8.5 critical threshold
  } else {
    t = Math.min(value / 100, 1)
  }
  if (t === 0) return 'transparent'
  // Thresholds aligned to v0.8.5: low<0.25, medium<0.40, high<0.60, critical>=0.60
  if (t < 0.25) return CELL_LOW_BG
  if (t < 0.40) return RISK_COLORS.medium
  if (t < 0.60) return RISK_COLORS.high
  return RISK_COLORS.critical
}

interface TooltipData {
  sector: string
  sectorColor: string
  year: number
  value: number
  contracts: number
  totalValue: number
  x: number
  y: number
}

export function SectorRiskHeatmap() {
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [metric, setMetric] = useState<CellMetric>('risk')
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const METRIC_LABELS: MetricLabels = {
    risk: t('heatmap.avgRiskScore', 'Avg Risk Score'),
    high_risk_pct: t('heatmap.highRiskPct', 'High-Risk %'),
    direct_award_pct: t('heatmap.directAwardPct', 'Direct Award %'),
  }

  const { data, isLoading } = useQuery({
    queryKey: ['sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 30 * 60 * 1000,
  })

  // Build sector_id -> year -> item lookup
  const lookup = useMemo(() => {
    const m = new Map<number, Map<number, { value: number; contracts: number; totalValue: number }>>()
    data?.data?.forEach(item => {
      if (!m.has(item.sector_id)) m.set(item.sector_id, new Map())
      const cellValue =
        metric === 'risk' ? item.avg_risk :
        metric === 'high_risk_pct' ? item.high_risk_pct :
        item.direct_award_pct
      m.get(item.sector_id)!.set(item.year, {
        value: cellValue,
        contracts: item.contracts,
        totalValue: item.total_value,
      })
    })
    return m
  }, [data, metric])

  const handleMouseEnter = useCallback((
    e: React.MouseEvent,
    sector: typeof SECTORS[number],
    year: number,
    cell: { value: number; contracts: number; totalValue: number } | undefined
  ) => {
    if (!cell) return
    setTooltip({
      sector: sector.nameEN,
      sectorColor: SECTOR_COLORS[sector.code] || '#64748b',
      year,
      value: cell.value,
      contracts: cell.contracts,
      totalValue: cell.totalValue,
      x: e.clientX,
      y: e.clientY,
    })
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-48 bg-background-elevated" />
        <Skeleton className="h-64 w-full bg-background-elevated" />
      </div>
    )
  }

  const CELL_H = 20
  const LABEL_W = 100

  const kicker = lang === 'en' ? 'RUBLI · SECTOR × YEAR' : 'RUBLI · SECTOR × AÑO'
  const headline = lang === 'en'
    ? 'Sector risk over two decades'
    : 'Riesgo sectorial a lo largo de dos décadas'
  const subline = lang === 'en'
    ? '12 sectors × 24 years · administration bands across the top'
    : '12 sectores × 24 años · bandas de administración en la parte superior'
  const source = lang === 'en'
    ? 'Source: RUBLI analysis · COMPRANET 2002–2025 · risk model v0.8.5'
    : 'Fuente: análisis RUBLI · COMPRANET 2002–2025 · modelo de riesgo v0.8.5'

  return (
    <EditorialChartFrame
      kicker={kicker}
      headline={headline}
      subline={subline}
      footer={source}
      tone="bare"
      animate={false}
    >
    <div className="space-y-3">
      {/* Metric toggle */}
      <div className="flex items-center gap-1.5">
        {(Object.keys(METRIC_LABELS) as CellMetric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-2.5 py-1 rounded text-[12px] font-mono transition-all ${
              metric === m
                ? 'bg-background-elevated text-text-primary border border-border'
                : 'border border-border text-text-muted hover:text-text-secondary hover:border-border'
            }`}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: LABEL_W + YEARS.length * 21 }}>

          {/* Administration bands header */}
          <div className="flex mb-1" style={{ marginLeft: LABEL_W }}>
            {ADMINS.map(a => {
              const yearsInRange = YEARS.filter(y => y >= a.start && y <= a.end).length
              return (
                <div
                  key={a.name}
                  className="text-[13px] font-mono font-bold text-center truncate"
                  style={{
                    width: yearsInRange * 21,
                    color: a.color,
                    borderBottom: `2px solid ${a.color}`,
                    paddingBottom: 2,
                  }}
                >
                  {a.name}
                </div>
              )
            })}
          </div>

          {/* Year headers */}
          <div className="flex mb-1.5" style={{ marginLeft: LABEL_W }}>
            {YEARS.map(y => (
              <div
                key={y}
                className="text-[8px] text-center font-mono text-text-muted shrink-0"
                style={{ width: 21, writingMode: 'vertical-rl', height: 28, lineHeight: '21px' }}
              >
                {y}
              </div>
            ))}
          </div>

          {/* Sector rows */}
          <div className="space-y-[2px]">
            {SECTORS.map(sector => {
              const color = SECTOR_COLORS[sector.code] || '#64748b'
              return (
                <div key={sector.id} className="flex items-center">
                  {/* Sector label */}
                  <div
                    className="flex items-center gap-1.5 shrink-0 pr-2"
                    style={{ width: LABEL_W }}
                  >
                    <div
                      className="w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[12px] text-text-secondary font-mono truncate capitalize">
                      {sector.nameEN}
                    </span>
                  </div>

                  {/* Year cells */}
                  <div className="flex gap-[1px]">
                    {YEARS.map(year => {
                      const cell = lookup.get(sector.id)?.get(year)
                      const value = cell?.value ?? 0
                      const bg = cell ? metricColor(value, metric) : 'var(--color-background-elevated)'
                      return (
                        <div
                          key={year}
                          className="shrink-0 rounded-[1px] cursor-default transition-all duration-100 hover:ring-1 hover:ring-zinc-400/30"
                          style={{ width: 20, height: CELL_H, backgroundColor: bg }}
                          onMouseEnter={(e) => handleMouseEnter(e, sector, year, cell)}
                          onMouseLeave={handleMouseLeave}
                        >
                          {cell && (
                            <span className="flex items-center justify-center h-full text-[7px] font-mono tabular-nums text-text-secondary/70">
                              {metric === 'risk'
                                ? value.toFixed(2)
                                : `${Math.round(value)}%`}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-2xl"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 10,
            backgroundColor: '#1a1714',
            border: '1px solid #3f3f46',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: tooltip.sectorColor }} />
            <span className="font-semibold text-text-primary font-mono capitalize">{tooltip.sector}</span>
            <span className="text-text-muted font-mono">{tooltip.year}</span>
          </div>
          <div className="space-y-0.5">
            <p className="text-text-secondary font-mono">
              {METRIC_LABELS[metric]}:{' '}
              <span className="text-text-primary font-bold">
                {metric === 'risk' ? tooltip.value.toFixed(3) : `${tooltip.value.toFixed(1)}%`}
              </span>
            </p>
            <p className="text-text-muted font-mono">
              {t('heatmap.tooltipContracts', 'Contracts')}: <span className="text-text-secondary">{tooltip.contracts.toLocaleString(getLocale())}</span>
            </p>
            <p className="text-text-muted font-mono">
              {t('heatmap.tooltipValue', 'Value')}: <span className="text-text-secondary">{formatCompactMXN(tooltip.totalValue)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Color legend using RISK_COLORS */}
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <span className="text-[12px] font-mono text-text-muted uppercase tracking-wide">{t('heatmap.legendLow', 'Low')}</span>
        <div className="flex gap-[2px]">
          {[
            { color: CELL_LOW_BG, labelKey: 'heatmap.legendLow', fallback: 'Low' },
            { color: RISK_COLORS.medium, labelKey: 'heatmap.legendMedium', fallback: 'Medium' },
            { color: RISK_COLORS.high, labelKey: 'heatmap.legendHigh', fallback: 'High' },
            { color: RISK_COLORS.critical, labelKey: 'heatmap.legendCritical', fallback: 'Critical' },
          ].map((stop) => (
            <div
              key={stop.labelKey}
              className="w-6 h-3 rounded-[1px]"
              style={{ backgroundColor: stop.color }}
              title={t(stop.labelKey, stop.fallback)}
            />
          ))}
        </div>
        <span className="text-[12px] font-mono text-text-muted uppercase tracking-wide">{t('heatmap.legendHigh', 'High')}</span>
        <div className="flex items-center gap-1 ml-3">
          <div className="w-4 h-3 rounded-[1px] bg-background-elevated" />
          <span className="text-[12px] font-mono text-text-muted">{t('heatmap.noData', 'No data')}</span>
        </div>
      </div>
    </div>
    </EditorialChartFrame>
  )
}
