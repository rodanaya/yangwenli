import { memo, useMemo } from 'react'

interface ProcedureBreakdownData {
  sector_name: string
  sector_code: string
  direct_award_pct: number
  single_bid_pct: number
  open_tender_pct: number
}

interface ProcedureBreakdownProps {
  data: ProcedureBreakdownData[]
  height?: number   // kept for API compatibility — drives container max-height
  onSectorClick?: (sectorCode: string) => void
}

// Dots per 100%: 50 dots = 100%, each dot ≈ 2%
const N_DOTS = 50

const COLORS = {
  direct:  '#f87171',  // red-400 — most restrictive
  single:  '#fb923c',  // orange-400 — concerning
  tender:  '#4ade80',  // green-400 — most competitive
}

export const ProcedureBreakdown = memo(function ProcedureBreakdown({
  data,
  height = 300,
  onSectorClick,
}: ProcedureBreakdownProps) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.direct_award_pct - a.direct_award_pct),
    [data]
  )

  return (
    <div style={{ maxHeight: `${height}px`, overflowY: 'auto' }} className="space-y-0.5 pr-1">
      {/* legend */}
      <div className="flex items-center gap-5 pb-2 text-xs text-text-muted font-mono">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS.direct }} />
          Direct Award
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS.single }} />
          Single Bid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS.tender }} />
          Open Tender
        </span>
      </div>

      {sorted.map((sector) => {
        const daDots = Math.round((sector.direct_award_pct / 100) * N_DOTS)
        const sbDots = Math.round((sector.single_bid_pct   / 100) * N_DOTS)
        const otDots = N_DOTS - daDots - sbDots

        return (
          <div
            key={sector.sector_code}
            className="flex items-center gap-2 py-[3px] group"
          >
            {/* sector label */}
            <button
              className={[
                'text-right w-[88px] shrink-0 text-[10px] font-mono truncate',
                'text-text-muted group-hover:text-text-secondary transition-colors',
                onSectorClick ? 'cursor-pointer' : 'cursor-default',
              ].join(' ')}
              onClick={() => onSectorClick?.(sector.sector_code)}
              tabIndex={onSectorClick ? 0 : -1}
            >
              {sector.sector_name}
            </button>

            {/* dot strip */}
            <div
              className="flex items-center gap-[2px] flex-1 cursor-pointer"
              onClick={() => onSectorClick?.(sector.sector_code)}
              role={onSectorClick ? 'button' : undefined}
              aria-label={
                onSectorClick
                  ? `${sector.sector_name}: ${sector.direct_award_pct.toFixed(0)}% direct, ${sector.single_bid_pct.toFixed(0)}% single bid, ${sector.open_tender_pct.toFixed(0)}% open`
                  : undefined
              }
            >
              {Array.from({ length: daDots }, (_, i) => (
                <span
                  key={`da-${i}`}
                  className="inline-block w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ background: COLORS.direct, opacity: 0.85 }}
                />
              ))}
              {Array.from({ length: Math.max(0, sbDots) }, (_, i) => (
                <span
                  key={`sb-${i}`}
                  className="inline-block w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ background: COLORS.single, opacity: 0.85 }}
                />
              ))}
              {Array.from({ length: Math.max(0, otDots) }, (_, i) => (
                <span
                  key={`ot-${i}`}
                  className="inline-block w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ background: COLORS.tender, opacity: 0.85 }}
                />
              ))}
            </div>

            {/* direct award % label */}
            <span className="text-[10px] text-text-muted font-mono w-8 text-right shrink-0">
              {sector.direct_award_pct.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
})

export default ProcedureBreakdown
