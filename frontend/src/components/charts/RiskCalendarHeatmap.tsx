/**
 * RiskCalendarHeatmap — GitHub-style grid of procurement risk by month
 *
 * Each row = 1 year, each cell = 1 month.
 * Color intensity = average risk score.
 * Shows December budget-dump spikes and suspicious periods.
 */

import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { analysisApi } from '@/api/client'

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DISPLAY_YEARS = Array.from({ length: 10 }, (_, i) => 2025 - i).reverse() // 2016-2025

// Risk → color: low risk = pale green, high risk = deep red
function riskToColor(risk: number): string {
  if (risk === 0) return '#f1f5f9'  // no data
  if (risk < 0.10) return '#bbf7d0' // low — green
  if (risk < 0.20) return '#86efac'
  if (risk < 0.30) return '#fde68a' // medium — amber
  if (risk < 0.40) return '#fbbf24'
  if (risk < 0.50) return '#fb923c' // high — orange
  return '#f87171'                   // critical — red
}

function riskLabel(risk: number): string {
  if (risk < 0.10) return 'Low'
  if (risk < 0.30) return 'Medium'
  if (risk < 0.50) return 'High'
  return 'Critical'
}

interface TooltipData {
  year: number
  month: number
  risk: number
  contracts: number
  value: number
}

export function RiskCalendarHeatmap() {
  const [tooltip, setTooltip] = useState<(TooltipData & { x: number; y: number }) | null>(null)

  // Fetch all years in parallel
  const results = useQueries({
    queries: DISPLAY_YEARS.map(year => ({
      queryKey: ['monthly-breakdown', year],
      queryFn: () => analysisApi.getMonthlyBreakdown(year),
      staleTime: 30 * 60 * 1000,
    })),
  })

  const isLoading = results.some(r => r.isLoading)

  const yearData = useMemo(() => {
    return DISPLAY_YEARS.map((year, i) => ({
      year,
      months: results[i]?.data?.months ?? [],
    }))
  }, [results])

  if (isLoading) return <Skeleton className="h-48 w-full" />

  const CELL_W = 28, CELL_H = 18, GAP = 3
  const LABEL_W = 36

  return (
    <div className="overflow-x-auto">
      <div className="relative">
        {/* Month headers */}
        <div className="flex ml-[36px] mb-1">
          {MONTH_ABBR.map(m => (
            <div
              key={m}
              className="text-[9px] text-muted-foreground text-center"
              style={{ width: CELL_W + GAP, flexShrink: 0 }}
            >
              {m}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-[3px]">
          {yearData.map(({ year, months }) => (
            <div key={year} className="flex items-center gap-0">
              <span
                className="text-[10px] text-muted-foreground text-right shrink-0"
                style={{ width: LABEL_W }}
              >
                {year}
              </span>
              <div className="flex ml-1" style={{ gap: GAP }}>
                {Array.from({ length: 12 }, (_, mi) => {
                  const monthData = months[mi]
                  const risk = monthData?.avg_risk ?? 0
                  const contracts = monthData?.contracts ?? 0
                  const value = monthData?.value ?? 0
                  const isDecember = mi === 11

                  return (
                    <div
                      key={mi}
                      className="rounded-[2px] cursor-default relative"
                      style={{
                        width: CELL_W,
                        height: CELL_H,
                        backgroundColor: contracts > 0 ? riskToColor(risk) : '#f1f5f9',
                        outline: isDecember ? '1px solid #94a3b8' : 'none',
                        outlineOffset: -1,
                      }}
                      onMouseEnter={(e) => {
                        if (contracts === 0) return
                        setTooltip({ year, month: mi + 1, risk, contracts, value, x: e.clientX, y: e.clientY })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 bg-slate-900/95 border border-slate-700 rounded px-2.5 py-1.5 text-xs pointer-events-none shadow-xl"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            <p className="font-semibold text-slate-100">{MONTH_ABBR[tooltip.month - 1]} {tooltip.year}</p>
            <p className="text-slate-400">
              Risk: <span style={{ color: riskToColor(tooltip.risk) }} className="font-bold">{tooltip.risk.toFixed(3)} ({riskLabel(tooltip.risk)})</span>
            </p>
            <p className="text-slate-400">Contracts: <span className="text-white">{tooltip.contracts.toLocaleString()}</span></p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">Risk:</span>
        {[
          { label: 'None', color: '#f1f5f9' },
          { label: 'Low', color: '#bbf7d0' },
          { label: 'Medium', color: '#fbbf24' },
          { label: 'High', color: '#fb923c' },
          { label: 'Critical', color: '#f87171' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
        <span className="text-[10px] text-muted-foreground ml-2">⬜ = December (budget year-end)</span>
      </div>
    </div>
  )
}
