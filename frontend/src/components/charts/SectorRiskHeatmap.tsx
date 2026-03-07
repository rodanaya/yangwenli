/**
 * SectorRiskHeatmap — 12 sectors × 24 years risk grid
 *
 * Rows = sectors, columns = years 2002–2025.
 * Cell color = avg risk score for that sector/year.
 * Reveals which sectors spiked risk under which administrations.
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { SECTORS, SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { analysisApi } from '@/api/client'

const YEARS = Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2002 + i)

const ADMINS = [
  { name: 'Fox',       start: 2002, end: 2005, color: '#2563eb' },
  { name: 'Calderón',  start: 2006, end: 2011, color: '#16a34a' },
  { name: 'EPN',       start: 2012, end: 2017, color: '#ea580c' },
  { name: 'AMLO',      start: 2018, end: 2023, color: '#7c3aed' },
  { name: 'Shein',     start: 2024, end: 2025, color: '#db2777' },
]

type CellMetric = 'risk' | 'high_risk_pct' | 'direct_award_pct'

const METRIC_LABELS: Record<CellMetric, string> = {
  risk: 'Avg Risk Score',
  high_risk_pct: 'High-Risk %',
  direct_award_pct: 'Direct Award %',
}

function metricColor(value: number, metric: CellMetric): string {
  // Normalize to 0-1 based on metric-specific ranges
  let t: number
  if (metric === 'risk') {
    // risk 0-0.5+ → clamp at 0.5 = full red
    t = Math.min(value / 0.5, 1)
  } else {
    // pct values 0-100
    t = Math.min(value / 100, 1)
  }
  if (t === 0) return '#1e293b' // no data — dark slate
  // Low → dark green, high → deep red via amber
  if (t < 0.2) return '#166534'
  if (t < 0.4) return '#4d7c0f'
  if (t < 0.55) return '#854d0e'
  if (t < 0.7) return '#c2410c'
  return '#991b1b'
}

function metricTextColor(value: number, metric: CellMetric): string {
  let t: number
  if (metric === 'risk') t = Math.min(value / 0.5, 1)
  else t = Math.min(value / 100, 1)
  return t > 0.2 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)'
}

interface Tooltip {
  sector: string
  year: number
  value: number
  contracts: number
  totalValue: number
  x: number
  y: number
}

export function SectorRiskHeatmap() {
  const [metric, setMetric] = useState<CellMetric>('risk')
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 30 * 60 * 1000,
  })

  // Build sector_id → year → item lookup
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

  if (isLoading) return <Skeleton className="h-64 w-full" />

  const CELL_H = 18
  const LABEL_W = 96

  return (
    <div className="space-y-2">
      {/* Metric toggle */}
      <div className="flex items-center gap-1 flex-wrap">
        {(Object.keys(METRIC_LABELS) as CellMetric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
              metric === m
                ? 'bg-accent/20 border-accent/40 text-accent'
                : 'border-border/30 text-text-muted hover:text-text-secondary'
            }`}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: LABEL_W + YEARS.length * 20 }}>

          {/* Admin bands header */}
          <div className="flex mb-0.5" style={{ marginLeft: LABEL_W }}>
            {ADMINS.map(a => {
              const yearsInRange = YEARS.filter(y => y >= a.start && y <= a.end).length
              return (
                <div
                  key={a.name}
                  className="text-[8px] font-bold text-center truncate px-0.5"
                  style={{
                    width: yearsInRange * 20,
                    color: a.color,
                    borderBottom: `2px solid ${a.color}`,
                  }}
                >
                  {a.name}
                </div>
              )
            })}
          </div>

          {/* Year headers */}
          <div className="flex mb-1" style={{ marginLeft: LABEL_W }}>
            {YEARS.map(y => (
              <div
                key={y}
                className="text-[8px] text-center text-muted-foreground shrink-0"
                style={{ width: 20, writingMode: 'vertical-rl', height: 28, lineHeight: '20px' }}
              >
                {y}
              </div>
            ))}
          </div>

          {/* Sector rows */}
          <div className="space-y-[2px]">
            {SECTORS.map(sector => {
              const code = sector.code
              const color = SECTOR_COLORS[code] || '#64748b'
              return (
                <div key={sector.id} className="flex items-center">
                  {/* Sector label */}
                  <div
                    className="flex items-center gap-1 shrink-0 pr-2"
                    style={{ width: LABEL_W }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-muted-foreground truncate capitalize">{sector.nameEN}</span>
                  </div>

                  {/* Year cells */}
                  <div className="flex gap-[1px]">
                    {YEARS.map(year => {
                      const cell = lookup.get(sector.id)?.get(year)
                      const value = cell?.value ?? 0
                      const bg = cell ? metricColor(value, metric) : '#0f172a'
                      const textC = cell ? metricTextColor(value, metric) : 'transparent'
                      return (
                        <div
                          key={year}
                          className="shrink-0 rounded-[1px] cursor-default"
                          style={{ width: 19, height: CELL_H, backgroundColor: bg }}
                          onMouseEnter={(e) => {
                            if (!cell) return
                            setTooltip({
                              sector: sector.nameEN,
                              year,
                              value,
                              contracts: cell.contracts,
                              totalValue: cell.totalValue,
                              x: e.clientX,
                              y: e.clientY,
                            })
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {/* tiny value text — only if cell is wide enough and value is non-zero */}
                          {cell && (
                            <span
                              className="flex items-center justify-center h-full text-[7px] font-mono tabular-nums"
                              style={{ color: textC }}
                            >
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
          className="fixed z-50 bg-slate-900/95 border border-slate-700 rounded px-2.5 py-1.5 text-xs pointer-events-none shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <p className="font-semibold text-slate-100 capitalize">{tooltip.sector} · {tooltip.year}</p>
          <p className="text-slate-400">
            {METRIC_LABELS[metric]}:{' '}
            <span className="text-white font-bold">
              {metric === 'risk' ? tooltip.value.toFixed(3) : `${tooltip.value.toFixed(1)}%`}
            </span>
          </p>
          <p className="text-slate-400">Contracts: <span className="text-white">{tooltip.contracts.toLocaleString()}</span></p>
          <p className="text-slate-400">Value: <span className="text-white">{formatCompactMXN(tooltip.totalValue)}</span></p>
        </div>
      )}

      {/* Color scale */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-muted-foreground">Low</span>
        <div className="flex gap-px">
          {['#166534','#4d7c0f','#854d0e','#c2410c','#991b1b'].map(c => (
            <div key={c} className="w-5 h-2.5 rounded-[1px]" style={{ backgroundColor: c }} />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">High</span>
        <span className="text-[10px] text-muted-foreground ml-3">· Dark = no data</span>
      </div>
    </div>
  )
}
