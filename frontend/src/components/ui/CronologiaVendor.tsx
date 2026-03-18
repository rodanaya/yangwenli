/**
 * CronologiaVendor — Annotated horizontal contract timeline for a vendor.
 * Pure div-based visualization (no chart library).
 * Shows contract activity by year as a bar chart with annotation dots.
 */
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface TimelineYear {
  year: number
  contractCount: number
  totalValue: number
  avgRiskScore: number
  hasAnomaly?: boolean
  anomalyNote?: string
}

interface CronologiaVendorProps {
  data: TimelineYear[]
  vendorName: string
  className?: string
}

function riskBarColor(score: number): string {
  if (score >= 0.60) return '#f87171'   // critical — red
  if (score >= 0.40) return '#fb923c'   // high — orange
  if (score >= 0.15) return '#fbbf24'   // medium — amber
  return '#52525b'                       // low — zinc-600
}

function formatCompact(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`
  return String(val)
}

export default function CronologiaVendor({ data, vendorName, className }: CronologiaVendorProps) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null)

  const maxCount = useMemo(() => {
    if (!data.length) return 1
    return Math.max(...data.map((d) => d.contractCount), 1)
  }, [data])

  if (!data.length) {
    return (
      <div className={cn('rounded-lg border border-zinc-800 bg-zinc-900/40 p-4', className)}>
        <p className="text-sm text-zinc-400 mb-2">Cronologia de Contratos</p>
        <p className="text-xs text-zinc-500 italic">Sin datos de cronologia disponibles para {vendorName}.</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-zinc-800 bg-zinc-900/40 p-4', className)}>
      <p className="text-sm text-zinc-400 mb-3">Cronologia de Contratos</p>

      {/* Chart area — 120px tall */}
      <div className="relative" style={{ height: '120px' }}>
        <div className="flex items-end gap-[2px] h-full">
          {data.map((d) => {
            const barHeight = Math.max((d.contractCount / maxCount) * 100, 4)
            const isHovered = hoveredYear === d.year
            const barColor = riskBarColor(d.avgRiskScore)

            return (
              <div
                key={d.year}
                className="relative flex-1 flex flex-col items-center justify-end h-full group cursor-default"
                onMouseEnter={() => setHoveredYear(d.year)}
                onMouseLeave={() => setHoveredYear(null)}
              >
                {/* Anomaly dot */}
                {d.hasAnomaly && (
                  <div
                    className="absolute -top-1 w-2 h-2 rounded-full bg-orange-400 z-10"
                    style={{ top: `${100 - barHeight - 8}%` }}
                    title={d.anomalyNote}
                  />
                )}

                {/* Bar */}
                <div
                  className="w-full rounded-t-sm transition-all duration-200"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: barColor,
                    opacity: isHovered ? 1 : 0.75,
                    minHeight: '3px',
                  }}
                />

                {/* Tooltip */}
                {isHovered && (
                  <div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 shadow-lg pointer-events-none"
                    style={{ minWidth: '110px' }}
                  >
                    <p className="text-[11px] font-bold text-white">{d.year}</p>
                    <p className="text-[10px] text-zinc-300">
                      {d.contractCount} contratos
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      ${formatCompact(d.totalValue)} MXN
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Riesgo: {(d.avgRiskScore * 100).toFixed(0)}%
                    </p>
                    {d.hasAnomaly && d.anomalyNote && (
                      <p className="text-[10px] text-orange-400 mt-0.5">
                        {d.anomalyNote}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Year labels */}
      <div className="flex gap-[2px] mt-1">
        {data.map((d) => (
          <div key={d.year} className="flex-1 text-center">
            <span
              className={cn(
                'text-[9px] font-mono',
                hoveredYear === d.year ? 'text-zinc-200' : 'text-zinc-600'
              )}
            >
              {data.length > 15 ? (d.year % 5 === 0 ? String(d.year).slice(-2) : '') : String(d.year).slice(-2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
