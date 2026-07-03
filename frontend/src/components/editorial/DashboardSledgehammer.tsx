/**
 * DashboardSledgehammer — Hero #1 editorial card
 *
 * Pudding "30 Years of American Anxieties" pattern: one giant annotated
 * number that tells the reader exactly which fact to remember.
 *
 * Generalized 2026-06-04 (Administrations P2): the eyebrow / deck / OECD
 * ceiling / accent / micro-stats are all overridable so the primitive can
 * front any "one number is the thesis" page. Defaults reproduce the original
 * Dashboard direct-award hero (74% · OECD ≤25% · salud red), so existing
 * call sites — there are currently none; it was retired from Executive on
 * 2026-05-05 — would behave unchanged.
 */

interface MicroStat {
  value: string
  label: string
}

interface Props {
  /** The headline percentage (0–100). e.g. dashboard.overview.direct_award_pct */
  daRate: number
  lang: 'en' | 'es'
  /** Eyebrow above the number. Default: the Dashboard's "EN 2023, MÉXICO ADJUDICÓ". */
  eyebrow?: string
  /** Line under the number. Default: "of federal contracts without competition." */
  deck?: string
  /**
   * OECD direct-award ceiling used for the "N× the ceiling" line.
   * Default 25 (OECD's recommended threshold). Pass OECD_DIRECT_AWARD_LIMIT*100
   * (30) to align with the platform constant.
   */
  oecdLimitPct?: number
  /** Number + accent-bar color. Default salud red #dc2626. */
  accentColor?: string
  /** Optional mono micro-stats row beneath the OECD line. */
  microStats?: MicroStat[]
  /** Fully override the OECD reference line text (else computed from oecdLimitPct). */
  oecdLine?: string
}

export function DashboardSledgehammer({
  daRate,
  lang,
  eyebrow,
  deck,
  oecdLimitPct = 25,
  accentColor = '#dc2626',
  microStats,
  oecdLine,
}: Props) {
  // Round to 1 decimal, clamp to [0, 100]
  const pct = Math.max(0, Math.min(100, daRate))
  const display = `${pct.toFixed(1)}%`
  // Compute the ceiling multiplier dynamically
  const multiplier = (pct / oecdLimitPct).toFixed(1)

  const eyebrowText = eyebrow ?? 'EN 2023, MÉXICO ADJUDICÓ'
  const deckText =
    deck ??
    (lang === 'en'
      ? 'of federal contracts without competition.'
      : 'de contratos federales sin competencia.')
  const oecdText =
    oecdLine ??
    (lang === 'en'
      ? `OECD recommends ≤ ${oecdLimitPct}%. Mexico is at ${multiplier}× that ceiling.`
      : `OCDE recomienda ≤ ${oecdLimitPct}%. México está a ${multiplier}× ese techo.`)

  return (
    <div
      className="surface-card rounded-sm p-8 md:p-12 relative overflow-hidden"
      aria-label={
        lang === 'en'
          ? `Mexico awarded ${display} of federal contracts without competition — ${multiplier}× the OECD recommended ceiling of ${oecdLimitPct}%.`
          : `México adjudicó el ${display} de contratos federales sin competencia — ${multiplier}× el umbral OCDE del ${oecdLimitPct}%.`
      }
    >
      {/* Subtle left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: accentColor }}
        aria-hidden
      />

      {/* Eyebrow */}
      <div
        className="font-mono text-[13px] uppercase tracking-[0.18em] mb-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {eyebrowText}
      </div>

      {/* The sledgehammer number */}
      <div
        className="leading-[0.9] font-extrabold tabular-nums mb-6"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(96px, 14vw, 180px)',
          color: accentColor,
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
        {deckText}
      </div>

      {/* Divider */}
      <div
        className="w-16 mb-4"
        style={{ height: 2, background: 'var(--color-border-hover)', opacity: 0.6 }}
        aria-hidden
      />

      {/* OECD reference line */}
      <div
        className="font-mono text-[13px] leading-[1.8] uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-oecd)' }}
      >
        {oecdText}
      </div>

      {/* Optional micro-stats row */}
      {microStats && microStats.length > 0 && (
        <div className="mt-6 flex flex-wrap items-baseline gap-x-7 gap-y-2">
          {microStats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <span
                className="tabular-nums font-semibold"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontStyle: 'normal',
                  fontSize: 17,
                  color: 'var(--color-text-primary)',
                }}
              >
                {s.value}
              </span>
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 13,
                  letterSpacing: '0.12em',
                  color: 'var(--color-text-muted)',
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
