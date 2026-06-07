/**
 * VendorEquivalences — "what this sum could have funded" civic-scale framing.
 *
 * The one genuinely additive element ported from the retired Red Thread
 * (`/thread/:id` ChapterSubject's `pickEquivalences`, 2026-06-07). The six
 * narrative chapters otherwise duplicated the dossier's reference sections;
 * this device — translating an abstract MXN total into tangible public-good
 * equivalents — existed nowhere else in the dossier.
 *
 * Editorial framing only: divisors are national averages, kept behind an "≈"
 * hedge. Data dependency is `vendor.total_value_mxn` alone (already loaded by
 * useVendorData — no new query/endpoint).
 */

/** Pick up to 3 tangible equivalences for an MXN amount (health / infra / education). */
function pickEquivalences(mxn: number, lang: 'en' | 'es'): string[] {
  const n = (v: number) => v.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US')
  const out: string[] = []

  if (mxn >= 4_200_000_000) {
    const years = Math.round(mxn / 4_200_000_000)
    out.push(
      lang === 'es'
        ? `${n(years)} años de financiamiento oncológico pediátrico del IMSS`
        : `${n(years)} years of IMSS pediatric oncology funding`,
    )
  } else if (mxn >= 100_000_000) {
    const months = Math.round(mxn / (4_200_000_000 / 12))
    if (months >= 1) {
      out.push(
        lang === 'es'
          ? `${months} meses de financiamiento oncológico pediátrico del IMSS`
          : `${months} months of IMSS pediatric oncology funding`,
      )
    }
  }

  if (mxn >= 1_600_000_000) {
    const hospitals = Math.round(mxn / 800_000_000)
    out.push(
      lang === 'es'
        ? `${n(hospitals)} hospitales federales construidos`
        : `${n(hospitals)} federal-tier hospitals built`,
    )
  } else if (mxn >= 30_000_000) {
    const km = Math.round(mxn / 30_000_000)
    if (km >= 2) {
      out.push(
        lang === 'es'
          ? `${n(km)} kilómetros de carretera federal`
          : `${n(km)} kilometers of federal highway`,
      )
    }
  }

  if (mxn >= 800_000) {
    const classrooms = Math.round(mxn / 800_000)
    if (classrooms >= 10) {
      out.push(
        lang === 'es'
          ? `${n(classrooms)} aulas escolares equipadas`
          : `${n(classrooms)} school classrooms equipped`,
      )
    }
  }

  return out.slice(0, 3)
}

export function VendorEquivalences({
  totalMxn,
  lang,
  accent,
  flush = false,
}: {
  totalMxn: number | null | undefined
  lang: 'en' | 'es'
  accent: string
  /** Hero-coda mode: share the lede's sector left-rule, drop the loud
   *  mono "HUMAN SCALE" eyebrow, lead in with an italic prose bridge so
   *  the synthesized lede flows straight into its human translation. */
  flush?: boolean
}) {
  if (!totalMxn || totalMxn <= 0) return null
  const items = pickEquivalences(totalMxn, lang)
  if (items.length === 0) return null

  if (flush) {
    return (
      <div
        className="mt-3"
        style={{
          borderLeft: `2px solid ${accent}`,
          paddingLeft: 20,
          maxWidth: '68ch',
        }}
      >
        {/* Italic bridge lead-in — authors the transition from lede prose
            to figures. EB Garamond italic, matches the lede family. */}
        <p
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--color-text-muted)',
          }}
        >
          {lang === 'es' ? 'En términos humanos —' : 'In human terms —'}
        </p>
        <ul className="mt-1.5 space-y-1 list-none p-0 m-0">
          {items.map((text, i) => (
            <li
              key={i}
              className="flex items-baseline gap-2.5"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 15,
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              <span
                aria-hidden="true"
                style={{ color: accent, fontWeight: 600, fontSize: 16, flexShrink: 0, fontStyle: 'normal' }}
              >
                ≈
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p
          className="mt-2 font-mono"
          style={{ fontSize: 9, letterSpacing: '0.04em', color: 'var(--color-text-muted)', opacity: 0.8 }}
        >
          {lang === 'es'
            ? 'Lo que esta suma habría financiado · cifras aproximadas, promedios nacionales'
            : 'What this sum could have funded · approximate, national averages'}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-5">
      <p
        className="font-mono mb-2"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 500,
        }}
      >
        § {lang === 'es' ? 'A escala humana' : 'Human scale'}
      </p>
      <ul className="space-y-1.5 list-none p-0 m-0">
        {items.map((text, i) => (
          <li
            key={i}
            className="flex items-baseline gap-2.5"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: 15,
              lineHeight: 1.5,
              color: 'var(--color-text-secondary)',
            }}
          >
            <span
              aria-hidden="true"
              style={{ color: accent, fontWeight: 600, fontSize: 16, flexShrink: 0, fontStyle: 'normal' }}
            >
              ≈
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <p
        className="mt-2 font-mono"
        style={{ fontSize: 9, letterSpacing: '0.04em', color: 'var(--color-text-muted)', opacity: 0.8 }}
      >
        {lang === 'es'
          ? 'Lo que esta suma habría financiado · cifras aproximadas, promedios nacionales'
          : 'What this sum could have funded · approximate, national averages'}
      </p>
    </div>
  )
}
