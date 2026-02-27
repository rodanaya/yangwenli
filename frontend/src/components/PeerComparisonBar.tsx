import { cn } from '@/lib/utils'

interface PeerComparisonBarProps {
  value: number
  peerMedian: number
  peerMin?: number
  peerMax?: number
  percentile: number
  metric: string
  unit?: string
  className?: string
}

function getPercentileColor(p: number): string {
  if (p <= 25) return '#4ade80'
  if (p <= 50) return '#fbbf24'
  if (p <= 75) return '#fb923c'
  return '#f87171'
}

function formatVal(v: number, unit?: string): string {
  if (unit) return `${v.toFixed(2)} ${unit}`
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toFixed(2)
}

export function PeerComparisonBar({
  value,
  peerMedian,
  peerMin = 0,
  peerMax,
  percentile,
  metric,
  unit,
  className,
}: PeerComparisonBarProps) {
  const max = peerMax ?? Math.max(value, peerMedian) * 1.3
  const min = peerMin
  const range = max - min || 1

  const clamp = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100))

  const valuePct = clamp(value)
  const medianPct = clamp(peerMedian)
  const dotColor = getPercentileColor(percentile)

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-text-secondary">{metric}</span>
        <span className="text-text-muted">
          P{Math.round(percentile)}
        </span>
      </div>

      <div className="relative h-3 w-full rounded-full bg-background-elevated overflow-hidden">
        {/* Median marker */}
        <div
          className="absolute top-0 h-full w-px bg-text-muted/60"
          style={{ left: `${medianPct}%` }}
          title={`Sector median: ${formatVal(peerMedian, unit)}`}
        />

        {/* Entity dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-background shadow-sm"
          style={{ left: `calc(${valuePct}% - 5px)`, backgroundColor: dotColor }}
          title={`${formatVal(value, unit)}`}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>
          {formatVal(value, unit)} vs median {formatVal(peerMedian, unit)}
        </span>
      </div>
    </div>
  )
}

export default PeerComparisonBar
