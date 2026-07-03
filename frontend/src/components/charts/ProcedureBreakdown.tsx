import { memo, useMemo } from 'react'
import { RISK_COLORS } from '@/lib/constants'

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

// Audit Issue #012 — Bible §3.10: never green for "low risk" / "all clear" /
// "fairly priced." Even competitive tender, on a corruption platform, cannot
// be visually certified as "safe" — the model has execution-phase blind
// spots and PU SCAR violation. Tender now uses neutral zinc (the noise-floor
// color) which reads as "no immediate red flag" without claiming integrity.
// PROCEDURE_COLORS — semantic palette for procurement procedure types.
// Derived from RISK_COLORS so the palette stays in lockstep with the
// canonical risk ladder. Never green (Bible §3.10).
const PROCEDURE_COLORS = {
  direct:  RISK_COLORS.critical,  // most restrictive — red
  single:  RISK_COLORS.high,      // concerning — amber
  tender:  RISK_COLORS.low,       // competitive, neutral zinc (no green)
} as const

// Back-compat alias for the rest of the module.
const COLORS = PROCEDURE_COLORS

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
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS.direct }} aria-hidden="true" />
          Direct Award
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS.single }} aria-hidden="true" />
          Single Bid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS.tender }} aria-hidden="true" />
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
                'text-right w-[88px] shrink-0 text-[12px] font-mono truncate',
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
              tabIndex={onSectorClick ? 0 : undefined}
              onKeyDown={onSectorClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSectorClick(sector.sector_code) } } : undefined}
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
            <span className="text-[12px] text-text-muted font-mono w-8 text-right shrink-0">
              {sector.direct_award_pct.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
})

export default ProcedureBreakdown
