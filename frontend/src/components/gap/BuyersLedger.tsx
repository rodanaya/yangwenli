/**
 * BuyersLedger — «Los Compradores» (gap redesign, 2026-07-03).
 *
 * The buyers are the only counterparty this dataset reliably names — extracted OUT
 * of the methodology block into their own named ledger (NYT-Upshot mechanic: names
 * ON the chart). A single amber tone across all rows — the 0–100 score is a
 * STRUCTURAL indicator, not the v0.8.5 model; ladder colors would falsely claim it.
 * Row click filters the register by siglas (the /gap/contracts `q` param LIKE-matches
 * institution_siglas today — no backend change).
 */
import type { GapSummaryResponse } from '@/api/types'
import { RISK_COLORS } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'
import { DotBar } from '@/components/ui/DotBar'

export function BuyersLedger({ items, lang, onPick }: {
  items: GapSummaryResponse['worst_institutions']; lang: 'en' | 'es'; onPick: (siglas: string) => void
}) {
  if (!items.length) return null
  const es = lang === 'es'
  return (
    <div>
      <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-text-muted font-mono mb-3">
        {es ? 'LOS COMPRADORES · MAYOR CONCENTRACIÓN DE ALERTAS' : 'THE BUYERS · HIGHEST ALERT CONCENTRATION'}
      </div>
      <div className="divide-y divide-border">
        {items.map((inst, i) => (
          <button key={inst.siglas} onClick={() => onPick(inst.siglas)}
            className="w-full grid grid-cols-[1.4rem_1fr_auto] items-center gap-x-3 py-2 text-left cursor-pointer hover:bg-surface-2 transition-colors"
            aria-label={es ? `Filtrar el registro por ${inst.siglas}` : `Filter the register by ${inst.siglas}`}>
            <span className="font-mono text-[11px] text-text-muted tabular-nums text-right">{i + 1}</span>
            <span className="font-mono text-[14px] font-semibold text-text-primary truncate">{inst.siglas}</span>
            <span className="flex items-center gap-2 justify-self-end">
              <DotBar value={inst.avg_score} max={100} dots={22} color={RISK_COLORS.high} ariaLabel={`${inst.siglas}: ${inst.avg_score}`} />
              <span className="font-mono text-xs tabular-nums" style={{ color: RISK_COLORS.high }}>{inst.avg_score.toFixed(1)}</span>
              <span className="font-mono text-[10px] text-text-muted w-14 text-right">({formatNumber(inst.count)})</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-text-muted font-mono leading-snug">
        {es
          ? 'Indicador estructural 0–100 (promedio por institución, mínimo 50 adjudicaciones) — no es el modelo v0.8.5. Clic en una fila para filtrar el registro.'
          : 'Structural indicator 0–100 (per-institution average, min. 50 awards) — not the v0.8.5 model. Click a row to filter the register.'}
      </div>
    </div>
  )
}
