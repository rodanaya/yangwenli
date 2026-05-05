/**
 * AdminsSledgehammer — sexenio-scoped hero card
 *
 * Pudding "30 Years of American Anxieties" pattern: one giant annotated
 * number per the worst-DA-rate administration so the reader immediately
 * grasps the cross-sexenio finding.
 *
 * Props:
 *   adminName  — "Pena Nieto" | "AMLO" | etc.
 *   daRate     — direct-award percentage (0–100), weighted by contracts
 *   lang       — 'en' | 'es'
 *
 * Build: 2026-05-04-admins-P1.5
 */

interface Props {
  /** Human-readable administration name, e.g. "Pena Nieto" */
  adminName: string
  /** Direct-award percentage (0–100). Weighted by contracts across the era. */
  daRate: number
  lang: 'en' | 'es'
}

const DISPLAY_NAMES: Record<string, { es: string; en: string }> = {
  'Pena Nieto': { es: 'Peña Nieto', en: 'Peña Nieto' },
  AMLO:         { es: 'AMLO', en: 'AMLO' },
  Fox:          { es: 'Fox', en: 'Fox' },
  Calderon:     { es: 'Calderón', en: 'Calderón' },
  Sheinbaum:    { es: 'Sheinbaum', en: 'Sheinbaum' },
}

export function AdminsSledgehammer({ adminName, daRate, lang }: Props) {
  const pct = Math.max(0, Math.min(100, daRate))
  const display = `${pct.toFixed(1)}%`
  const multiplier = (pct / 25).toFixed(1)
  const name = DISPLAY_NAMES[adminName]?.[lang] ?? adminName

  const eyebrow =
    lang === 'es'
      ? `DURANTE EL SEXENIO DE ${name.toUpperCase()}, MÉXICO ADJUDICÓ`
      : `DURING THE ${name.toUpperCase()} ADMINISTRATION, MEXICO AWARDED`

  const subtitle =
    lang === 'es'
      ? 'de contratos federales sin licitación competitiva.'
      : 'of federal contracts without competitive bidding.'

  const oecd =
    lang === 'es'
      ? `OCDE recomienda ≤ 25%. Este sexenio estuvo a ${multiplier}× ese techo.`
      : `OECD recommends ≤ 25%. This administration ran at ${multiplier}× that ceiling.`

  const ariaLabel =
    lang === 'es'
      ? `Durante el sexenio de ${name}, México adjudicó el ${display} de contratos federales sin competencia — ${multiplier}× el umbral OCDE del 25%.`
      : `During the ${name} administration, Mexico awarded ${display} of federal contracts without competition — ${multiplier}× the OECD recommended ceiling of 25%.`

  return (
    <div
      className="surface-card rounded-sm p-8 md:p-12 relative overflow-hidden"
      aria-label={ariaLabel}
    >
      {/* Left accent bar */}
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
        {eyebrow}
      </div>

      {/* Sledgehammer number */}
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

      {/* Subtitle */}
      <div
        className="text-[18px] md:text-[22px] font-serif leading-[1.3] mb-4 max-w-[36ch]"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: 'var(--color-text-secondary)',
        }}
      >
        {subtitle}
      </div>

      {/* Divider */}
      <div
        className="w-16 mb-4"
        style={{ height: 2, background: 'var(--color-border-hover)', opacity: 0.6 }}
        aria-hidden
      />

      {/* OECD reference */}
      <div
        className="font-mono text-[11px] leading-[1.8] uppercase tracking-[0.1em]"
        style={{ color: '#22d3ee' }}
      >
        {oecd}
      </div>
    </div>
  )
}
