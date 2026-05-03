/**
 * RiskCalendarHeatmap — GitHub-style grid of procurement risk by month
 *
 * Each row = 1 year, each cell = 1 month.
 * Color intensity = average risk score.
 * Shows December budget-dump spikes and suspicious periods.
 *
 * Design: dark editorial (zinc-900 bg), risk-colored cells, monospace labels.
 */

import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { analysisApi } from '@/api/client'
import { RISK_COLORS } from '@/lib/constants'
import { getLocale } from '@/lib/utils'

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DISPLAY_YEARS = Array.from({ length: 10 }, (_, i) => 2025 - i).reverse() // 2016-2025

// Risk color ramp — cream-mode, bible §2 (NO green for low; zinc for low).
// Breakpoints aligned to v0.8.5: low<0.25, medium<0.40, high<0.60, critical>=0.60
function riskToColor(risk: number): string {
  if (risk === 0) return '#f3f1ec'    // elevated cream — no data
  if (risk < 0.15) return '#e2ddd6'   // warm border gray — very low
  if (risk < 0.25) return '#d4cfc7'   // light zinc — low
  if (risk < 0.40) return '#a16207'   // medium (bible)
  if (risk < 0.60) return '#f59e0b'   // high (bible)
  return '#ef4444'                    // critical (bible)
}

function riskLabel(risk: number): string {
  if (risk < 0.25) return 'Low'
  if (risk < 0.40) return 'Medium'
  if (risk < 0.60) return 'High'
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

  if (isLoading) return <Skeleton className="h-48 w-full bg-background-elevated" />

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
              className="text-[9px] font-mono text-text-muted text-center"
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
                className="text-[10px] font-mono text-text-muted text-right shrink-0 tabular-nums"
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
                      className="rounded-[2px] cursor-default relative transition-all duration-150 hover:ring-1 hover:ring-zinc-400/30"
                      style={{
                        width: CELL_W,
                        height: CELL_H,
                        backgroundColor: contracts > 0 ? riskToColor(risk) : '#f3f1ec',
                        outline: isDecember ? '1px solid #71717a' : 'none',
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

        {/* Tooltip — dark editorial */}
        {tooltip && (
          <div
            className="fixed z-50 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-2xl"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y - 8,
              backgroundColor: '#1a1714',
              border: '1px solid #3f3f46',
            }}
          >
            <p className="font-semibold text-text-primary font-mono">
              {MONTH_ABBR[tooltip.month - 1]} {tooltip.year}
            </p>
            <p className="text-text-secondary mt-0.5">
              Risk:{' '}
              <span style={{ color: riskToColor(tooltip.risk) }} className="font-bold font-mono">
                {tooltip.risk.toFixed(3)}
              </span>{' '}
              <span className="text-text-muted">({riskLabel(tooltip.risk)})</span>
            </p>
            <p className="text-text-secondary">
              Contracts:{' '}
              <span className="text-text-primary font-mono">{tooltip.contracts.toLocaleString(getLocale())}</span>
            </p>
          </div>
        )}
      </div>

      {/* Legend — dark-mode risk palette */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wide">Risk:</span>
        {[
          { label: 'None', color: '#f3f1ec' },
          { label: 'Low', color: RISK_COLORS.low },
          { label: 'Medium', color: RISK_COLORS.medium },
          { label: 'High', color: RISK_COLORS.high },
          { label: 'Critical', color: RISK_COLORS.critical },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-[2px]"
              style={{ backgroundColor: color, border: label === 'None' ? '1px solid #3f3f46' : 'none' }}
            />
            <span className="text-[10px] font-mono text-text-muted">{label}</span>
          </div>
        ))}
        <span className="text-[10px] font-mono text-text-muted ml-2">
          outlined = December (budget year-end)
        </span>
      </div>
    </div>
  )
}
