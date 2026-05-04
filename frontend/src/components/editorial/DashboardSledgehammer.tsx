/**
 * DashboardSledgehammer — Hero #1 editorial card
 *
 * Pudding "30 Years of American Anxieties" pattern: one giant annotated
 * number that tells the reader exactly which fact to remember.
 *
 * The number is the direct-award rate (live from getFastDashboard, falling
 * back to the 2023 hardcoded value of 74%). Color: #dc2626 (sector_salud red).
 * OECD reference in cyan #22d3ee per the FT annotation spec.
 */

interface Props {
  /** Direct-award percentage (0–100). Live value from dashboard.overview.direct_award_pct */
  daRate: number
  lang: 'en' | 'es'
}

export function DashboardSledgehammer({ daRate, lang }: Props) {
  // Round to 1 decimal, clamp to [0, 100]
  const pct = Math.max(0, Math.min(100, daRate))
  const display = `${pct.toFixed(1)}%`
  // OECD recommends ≤ 25%; compute the ceiling multiplier dynamically
  const multiplier = (pct / 25).toFixed(1)

  return (
    <div
      className="surface-card rounded-sm p-8 md:p-12 relative overflow-hidden"
      aria-label={
        lang === 'en'
          ? `In 2023 Mexico awarded ${display} of federal contracts without competition — ${multiplier}× the OECD recommended ceiling of 25%.`
          : `En 2023 México adjudicó el ${display} de contratos federales sin competencia — ${multiplier}× el umbral OCDE del 25%.`
      }
    >
      {/* Subtle left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: '#dc2626' }}
        aria-hidden
      />

      {/* Eyebrow */}
      <div
        className="font-mono text-[11px] uppercase tracking-[0.18em] mb-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {lang === 'en' ? 'EN 2023, MÉXICO ADJUDICÓ' : 'EN 2023, MÉXICO ADJUDICÓ'}
      </div>

      {/* The sledgehammer number */}
      <div
        className="leading-[0.9] font-extrabold italic tabular-nums mb-6"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(96px, 14vw, 180px)',
          color: '#dc2626',
          letterSpacing: '-0.03em',
        }}
        aria-hidden
      >
        {display}
      </div>

      {/* Context line 1 */}
      <div
        className="text-[18px] md:text-[22px] font-serif leading-[1.3] mb-4 max-w-[36ch]"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: 'var(--color-text-secondary)',
        }}
      >
        {lang === 'en'
          ? 'of federal contracts without competition.'
          : 'de contratos federales sin competencia.'}
      </div>

      {/* Divider */}
      <div
        className="w-16 mb-4"
        style={{ height: 2, background: 'var(--color-border-hover)', opacity: 0.6 }}
        aria-hidden
      />

      {/* OECD reference lines */}
      <div
        className="font-mono text-[11px] leading-[1.8] uppercase tracking-[0.1em]"
        style={{ color: '#22d3ee' }}
      >
        {lang === 'en'
          ? `OECD recommends ≤ 25%. Mexico is at ${multiplier}× that ceiling.`
          : `OCDE recomienda ≤ 25%. México está a ${multiplier}× ese techo.`}
      </div>
    </div>
  )
}
