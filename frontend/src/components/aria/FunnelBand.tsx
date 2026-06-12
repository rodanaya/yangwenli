import { cn, formatNumber } from '@/lib/utils'

/**
 * § EL EMBUDO — log-width compression band, doubling as the tier navigation.
 * Replaces the equal-width tier pills (geometric equality asserting a lie of
 * proportion over a ÷833 compression). Precedent: ICIJ Panama Papers
 * filtering-funnel — count-labeled successive stages; log₁₀ widths are the
 * honest scale for 3 orders of magnitude (linear renders T1 at 0.12%).
 *
 * The T2 segment splits two-tone when `novelLeadsT2` is known: the model's
 * own discoveries render as an ochre hatch — EN CALIBRACIÓN, the honest-pitch
 * constraint as texture (graft from «El Despacho»). Proportions are computed
 * same-source (audit F3: never subtract latest_run counts from summary counts).
 */

const OCHRE = '#a06820'

interface FunnelBandProps {
  tierCounts: Record<number, number>
  queueTotal: number
  novelLeadsT2: number | null
  activeTier: number | null
  novelOnly: boolean
  loading?: boolean
  isEs: boolean
  onSelect: (tier: number | null, novelOnly: boolean) => void
}

const TIER_ORDER = [4, 3, 2, 1] as const

const TIER_FILL: Record<number, string> = {
  4: 'transparent',
  3: 'var(--color-background-elevated)',
  2: 'color-mix(in srgb, var(--color-risk-high) 14%, transparent)',
  1: 'color-mix(in srgb, var(--color-risk-critical) 14%, transparent)',
}

export function FunnelBand({
  tierCounts,
  queueTotal,
  novelLeadsT2,
  activeTier,
  novelOnly,
  loading,
  isEs,
  onSelect,
}: FunnelBandProps) {
  if (loading) {
    return <div className="h-[72px] rounded-sm bg-background-elevated animate-pulse mb-3" aria-hidden="true" />
  }

  const counts = TIER_ORDER.map((t) => tierCounts[t] ?? 0)
  const logs = counts.map((n) => Math.log10(n + 1))
  const logSum = logs.reduce((a, b) => a + b, 0)
  if (logSum <= 0 || queueTotal <= 0) return null

  const t1 = tierCounts[1] ?? 0
  const ratio = t1 > 0 ? Math.round(queueTotal / t1) : 0
  // Same-source split fraction for T2 (F3): novel / (novel + GT-from-queue-page
  // is unavailable here, so the fraction uses the run's own tier2_count as the
  // denominator — a proportion, never a subtracted absolute).
  const t2Count = tierCounts[2] ?? 0
  const discFrac =
    novelLeadsT2 != null && t2Count > 0 ? Math.min(1, Math.max(0, novelLeadsT2 / t2Count)) : null

  const tierLabel = (t: number) =>
    isEs
      ? ({ 4: 'nivel 4 · fondo', 3: 'nivel 3', 2: 'nivel 2', 1: 'nivel 1' } as Record<number, string>)[t]
      : ({ 4: 'tier 4 · floor', 3: 'tier 3', 2: 'tier 2', 1: 'tier 1' } as Record<number, string>)[t]

  const segAria = (t: number, n: number) => {
    const base = isEs
      ? `Filtrar nivel ${t} — ${formatNumber(n)} proveedores`
      : `Filter tier ${t} — ${formatNumber(n)} vendors`
    if (t === 2 && novelLeadsT2 != null) {
      return base + (isEs ? `, ${formatNumber(novelLeadsT2)} descubrimientos del modelo` : `, ${formatNumber(novelLeadsT2)} model discoveries`)
    }
    return base
  }

  const hatch = `repeating-linear-gradient(45deg, ${OCHRE}55 0 4px, transparent 4px 8px)`

  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
          {isEs ? '§ EL EMBUDO · COMPRESIÓN DEL TRIAJE' : '§ THE FUNNEL · TRIAGE COMPRESSION'}
        </p>
        <button
          onClick={() => onSelect(null, false)}
          className={cn(
            'text-[10px] font-mono uppercase tracking-[0.12em] transition-colors',
            activeTier == null ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
          )}
          aria-pressed={activeTier == null}
        >
          {isEs ? 'Todos' : 'All'} · {formatNumber(queueTotal)}
        </button>
      </div>

      {/* Desktop band */}
      <div className="hidden sm:flex items-stretch gap-1.5" role="group" aria-label={isEs ? 'Embudo de priorización' : 'Prioritization funnel'}>
        {TIER_ORDER.map((t, i) => {
          const n = counts[i]
          const isActive = activeTier === t
          const widthPct = (logs[i] / logSum) * 100
          return (
            <button
              key={t}
              onClick={() => onSelect(isActive && !(t === 2 && novelOnly) ? null : t, false)}
              aria-pressed={isActive}
              aria-label={segAria(t, n)}
              title={`${formatNumber(n)} · ${((n / queueTotal) * 100).toFixed(n / queueTotal < 0.01 ? 2 : 1)}%`}
              className={cn(
                'relative h-14 rounded-sm border text-left px-2 py-1.5 transition-colors overflow-hidden',
                isActive ? 'border-accent' : 'border-border hover:border-border-hover'
              )}
              style={{
                width: `${widthPct}%`,
                background: TIER_FILL[t],
                boxShadow: isActive ? 'inset 0 -2px 0 0 ' + OCHRE : undefined,
              }}
            >
              {/* T2 two-tone DISC hatch — EN CALIBRACIÓN */}
              {t === 2 && discFrac != null && (
                <span
                  className="absolute inset-y-0 right-0 border-l border-border/60"
                  style={{ width: `${discFrac * 100}%`, background: hatch }}
                  aria-hidden="true"
                />
              )}
              <span className="relative block font-mono font-bold text-[13px] tabular-nums text-text-primary leading-none">
                {formatNumber(n)}
              </span>
              <span className="relative block mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted leading-none">
                {tierLabel(t)}
              </span>
              {t === 2 && novelLeadsT2 != null && (
                <span className="relative block mt-0.5 font-mono text-[8.5px] text-text-muted leading-none truncate">
                  {isEs
                    ? `${formatNumber(novelLeadsT2)} del modelo · en calibración`
                    : `${formatNumber(novelLeadsT2)} model-found · in calibration`}
                </span>
              )}
            </button>
          )
        })}
        {/* Compression readout */}
        <div className="shrink-0 w-[92px] flex flex-col items-end justify-center pl-1">
          <span
            className="tabular-nums text-[22px] leading-none text-text-primary"
            style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontWeight: 500 }}
          >
            ÷{ratio > 0 ? formatNumber(ratio) : '—'}
          </span>
          <span className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-text-muted text-right leading-tight">
            {isEs ? 'compresión del triaje' : 'triage compression'}
          </span>
        </div>
      </div>

      {/* Mobile: stacked rows */}
      <div className="sm:hidden space-y-1" role="group" aria-label={isEs ? 'Embudo de priorización' : 'Prioritization funnel'}>
        {TIER_ORDER.map((t, i) => {
          const n = counts[i]
          const isActive = activeTier === t
          const widthPct = (logs[i] / logSum) * 100
          return (
            <button
              key={t}
              onClick={() => onSelect(isActive ? null : t, false)}
              aria-pressed={isActive}
              aria-label={segAria(t, n)}
              className="w-full flex items-center gap-2 min-h-[32px]"
            >
              <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-text-primary">
                {formatNumber(n)}
              </span>
              <span className="flex-1 h-3 rounded-sm overflow-hidden bg-background-card border border-border relative">
                <span
                  className={cn('absolute inset-y-0 left-0 rounded-sm', isActive ? 'opacity-90' : 'opacity-60')}
                  style={{ width: `${widthPct}%`, background: t === 1 ? 'var(--color-risk-critical)' : t === 2 ? 'var(--color-risk-high)' : 'var(--color-text-muted)' }}
                  aria-hidden="true"
                />
              </span>
              <span className="w-20 shrink-0 font-mono text-[8.5px] uppercase tracking-[0.1em] text-text-muted text-left">
                {tierLabel(t)}
              </span>
            </button>
          )
        })}
        <p className="font-mono text-[9px] text-text-muted text-right">
          ÷{ratio > 0 ? formatNumber(ratio) : '—'} · {isEs ? 'compresión' : 'compression'}
        </p>
      </div>
    </div>
  )
}
