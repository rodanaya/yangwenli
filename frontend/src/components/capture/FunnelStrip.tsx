/**
 * FunnelStrip — §A · EL EMBUDO / THE FUNNEL (the W7 spine)
 *
 * Makes 13 ⊂ 119 ⊂ {field} a single shrinking-bar picture so the three
 * universes are read as one nested structure, not three prose restatements.
 *
 * HONESTY (DESIGNUS audit F1): bar length is LOG-scaled for VISIBILITY only
 * (a true linear "13 of 1,424" bar is ~6px) — the honest part-of-whole is the
 * always-visible **count + %-of-field** label, never the length. No claim that
 * "length = proportion". NYT-Upshot nesting precedent (a new primitive, not a
 * BenchmarkRow reuse).
 */

export interface FunnelTier {
  count: number
  labelEn: string
  labelEs: string
  /** Bar fill (zinc field / amber majority / critical climbs). No green. */
  color: string
  /** Climbs tier scroll-anchors to the film. */
  anchor?: string
}

interface Props {
  /** Descending: [field, majority, climbs]. */
  tiers: FunnelTier[]
  lang: 'en' | 'es'
}

const BAR_H = 26

export function FunnelStrip({ tiers, lang }: Props) {
  const field = Math.max(tiers[0]?.count ?? 1, 1)
  // Length fraction = log10(count)/log10(field): visibility scaling so 13 stays
  // legible against the field. The % label below carries the real quantity.
  const frac = (n: number) =>
    Math.log10(Math.max(n, 1)) / Math.log10(Math.max(field, 10))
  const pctOfField = (n: number) => (100 * n) / field

  return (
    <section
      aria-label={
        lang === 'en'
          ? 'The funnel: the field, the captured majority, and the monotonic climbs'
          : 'El embudo: el campo, la mayoría capturada y los ascensos monótonos'
      }
      className="flex flex-col gap-4"
    >
      {tiers.map((t, i) => {
        const label = lang === 'en' ? t.labelEn : t.labelEs
        const pct = pctOfField(t.count)
        const pctStr = pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)
        const w = frac(t.count) * 100
        return (
          <div key={i}>
            <div className="flex items-center gap-3" style={{ height: BAR_H }}>
              <div
                className="h-full rounded-[2px]"
                style={{
                  width: `${w}%`,
                  minWidth: 44,
                  background: t.color,
                  opacity: 0.9,
                }}
                aria-hidden="true"
              />
              <span
                className="font-mono text-[12px] tabular-nums whitespace-nowrap"
                style={{ color: 'var(--color-text-primary)' }}
              >
                <strong className="font-bold">{t.count.toLocaleString()}</strong>
                <span style={{ color: 'var(--color-text-muted)' }}> · {pctStr}%</span>
              </span>
            </div>
            <p
              className="mt-1 text-[13.5px] leading-snug"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                color: 'var(--color-text-secondary)',
              }}
            >
              {label}
              {t.anchor && (
                <a
                  href={t.anchor}
                  className="ml-1.5 font-mono text-[12px] uppercase tracking-wide hover:opacity-80"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {lang === 'en' ? 'see the film ↓' : 'ver la película ↓'}
                </a>
              )}
            </p>
          </div>
        )
      })}
    </section>
  )
}
