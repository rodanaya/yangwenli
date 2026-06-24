/**
 * MoneySledgehammer — §B · EL SALDO / THE RECKONING
 *
 * The DashboardSledgehammer visual grammar (Pudding "one giant annotated number
 * is the thesis"), but the headline is a PESO VALUE, not a percentage —
 * DashboardSledgehammer hardwires `${pct}%` and clamps to [0,100], so a 277B
 * value would render "100.0%". This sibling reuses the exact tokens (Playfair
 * Italic 800, clamp font, accent rail, mono eyebrow + micro-stats) and accepts a
 * pre-formatted string.
 *
 * Honest framing (DESIGNUS audit BROKEN-3): the number is a CUMULATIVE-of-record
 * total (institution_stats.total_value_mxn), never a live "flow" — copy says
 * "cumulative / acumulado".
 */

interface MicroStat {
  value: string
  label: string
}

interface Props {
  /** Pre-formatted headline, short MXN — e.g. "277B MXN" / "276,971 MDP". */
  value: string
  /** Optional smaller USD sub-line under the headline (EN only; ES omits). */
  valueSub?: string
  eyebrow: string
  deck: string
  microStats?: MicroStat[]
  accentColor?: string
  ariaLabel: string
}

export function MoneySledgehammer({
  value,
  valueSub,
  eyebrow,
  deck,
  microStats,
  accentColor = '#dc2626',
  ariaLabel,
}: Props) {
  return (
    <div
      className="surface-card rounded-sm p-8 md:p-12 relative overflow-hidden"
      aria-label={ariaLabel}
    >
      {/* Left accent rail */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: accentColor }}
        aria-hidden
      />

      {/* Eyebrow */}
      <div
        className="font-mono text-[11px] uppercase tracking-[0.18em] mb-4 max-w-[40ch]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {eyebrow}
      </div>

      {/* The sledgehammer number (string) */}
      <div
        className="leading-[0.9] font-extrabold italic tabular-nums mb-2"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(48px, 8vw, 104px)',
          color: accentColor,
          letterSpacing: '-0.03em',
        }}
        aria-hidden
      >
        {value}
      </div>
      {valueSub && (
        <div
          className="font-mono text-[13px] tracking-[0.06em] mb-6"
          style={{ color: 'var(--color-text-muted)' }}
          aria-hidden
        >
          {valueSub}
        </div>
      )}

      {/* Deck */}
      <div
        className={`text-[18px] md:text-[22px] font-serif leading-[1.3] mb-4 max-w-[42ch] ${valueSub ? '' : 'mt-4'}`}
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: 'var(--color-text-secondary)',
        }}
      >
        {deck}
      </div>

      {/* Micro-stats */}
      {microStats && microStats.length > 0 && (
        <>
          <div
            className="w-16 mb-4"
            style={{ height: 2, background: 'var(--color-border-hover)', opacity: 0.6 }}
            aria-hidden
          />
          <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
            {microStats.map((s) => (
              <div key={s.label} className="flex items-baseline gap-2">
                <span
                  className="tabular-nums font-semibold"
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontStyle: 'italic',
                    fontSize: 17,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {s.value}
                </span>
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '0.12em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
