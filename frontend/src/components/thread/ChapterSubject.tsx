/**
 * ChapterSubject — Chapter I of the vendor dossier narrative.
 *
 * Redesigned 2026-05-22 (DESIGNUS round 6, component 2/10). Argument:
 * SCALE. After the hero says WHO, this chapter says HOW BIG — and what
 * that scale actually means in human terms.
 *
 * Four editorial moves: chapter heading · lede · scale block + tangibly ·
 * procurement signature. All primitives imported from the shared
 * `@/components/dossier/primitives` module (extracted 2026-05-22 to
 * support reuse by Timeline, Network, Money, Pattern, Verdict).
 */

import { useTranslation } from 'react-i18next'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { formatVendorName } from '@/lib/vendor/formatName'
import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  ScaleBlock,
  EquivalenceList,
  SignatureBar,
  FadeIn,
} from '@/components/dossier/primitives'

// ─── Props ──────────────────────────────────────────────────────────────────

interface ChapterSubjectProps {
  vendor: {
    name: string
    total_value_mxn: number
    total_contracts: number
    primary_sector_name?: string
    avg_risk_score?: number
    first_contract_year?: number
    last_contract_year?: number
    high_risk_pct: number
    direct_award_pct: number
  }
  /** Accepted for call-site compatibility — chapter no longer uses ARIA tier
   *  badge (the hero verdict card owns that signal). */
  aria?: { ips_final: number; ips_tier: number; primary_sector_name?: string | null } | null
  /** Accepted for call-site compatibility — component uses useTranslation. */
  t?: unknown
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChapterSubject({ vendor }: ChapterSubjectProps) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const sectorName = vendor.primary_sector_name ?? null
  const sectorCode = sectorName?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#dc2626'

  const yearsActive = vendor.first_contract_year && vendor.last_contract_year
    ? (vendor.last_contract_year - vendor.first_contract_year + 1)
    : 0

  // Pick the most arresting equivalent (single line) for the lede, plus
  // three picks for the TANGIBLY block (across categories).
  const equivalences = pickEquivalences(vendor.total_value_mxn, lang)
  const ledeEquivalent = equivalences[0] ?? null

  const lede = buildSubjectLede({
    vendor,
    yearsActive,
    ledeEquivalent,
    lang,
  })

  return (
    <ChapterShell id="chapter-subject">
      <ChapterHeading
        numeral="I"
        title={lang === 'es' ? 'El Sujeto' : 'Subject'}
        subtitle={lang === 'es' ? 'La escala de la relación' : 'The scale of the relationship'}
        sectorAccent={sectorAccent}
      />

      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={sectorAccent}>
          {lede}
        </LedeParagraph>
      </FadeIn>

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'A escala' : 'Drawing the scale'} />
        <div className="flex justify-center mt-8">
          <ScaleBlock
            mxn={vendor.total_value_mxn}
            sectorAccent={sectorAccent}
            lang={lang}
          />
        </div>
      </FadeIn>

      {equivalences.length > 0 && (
        <FadeIn className="mt-16">
          <SubheadRule label={lang === 'es' ? 'En términos tangibles' : 'Tangibly'} />
          <EquivalenceList items={equivalences} sectorAccent={sectorAccent} />
        </FadeIn>
      )}

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'La firma de contratación' : 'The procurement signature'} />
        <div className="mt-7 space-y-7 max-w-3xl">
          <SignatureBar
            label={lang === 'es' ? 'Adjudicación directa' : 'Direct award'}
            value={vendor.direct_award_pct ?? 0}
            sectorAccent={sectorAccent}
            referenceValue={48}
            referenceLabel={lang === 'es' ? 'norma nacional ≈ 48%' : 'national norm ≈ 48%'}
          />
          <SignatureBar
            label={lang === 'es' ? 'Contratos de alto riesgo' : 'High-risk contracts'}
            value={vendor.high_risk_pct ?? 0}
            sectorAccent={sectorAccent}
            highRiskTint={vendor.high_risk_pct > 15}
            referenceBandMin={2}
            referenceBandMax={15}
            referenceLabel={lang === 'es' ? 'banda OECD 2–15%' : 'OECD reference band 2–15%'}
          />
        </div>
      </FadeIn>
    </ChapterShell>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build the lede paragraph — single sentence framing scale + signature.
 * Data-driven; picks the strongest framing from the vendor's data.
 */
function buildSubjectLede({
  vendor,
  yearsActive,
  ledeEquivalent,
  lang,
}: {
  vendor: ChapterSubjectProps['vendor']
  yearsActive: number
  ledeEquivalent: string | null
  lang: 'en' | 'es'
}): string {
  const name = formatVendorName(vendor.name, 300)
  const direct = Math.round(vendor.direct_award_pct ?? 0)
  const hr = Math.round(vendor.high_risk_pct ?? 0)
  const yearsPhrase = yearsActive >= 2
    ? (lang === 'es' ? `${yearsActive} años de contratos públicos` : `${yearsActive} years of public contracts`)
    : (lang === 'es' ? 'su historial de contratación' : 'its procurement history')

  if (ledeEquivalent && hr >= 80) {
    return lang === 'es'
      ? `A lo largo de ${yearsPhrase}, ${name} recibió de la contratación federal mexicana el equivalente a ${ledeEquivalent.replace(/^≈\s*/, '')} — ${direct}% otorgado sin licitación pública, ${hr}% marcado por el modelo de riesgo.`
      : `Across ${yearsPhrase}, ${name} received from Mexican federal procurement the equivalent of ${ledeEquivalent.replace(/^≈\s*/, '')} — ${direct}% awarded without an open bid, ${hr}% flagged by the risk model.`
  }
  if (ledeEquivalent) {
    return lang === 'es'
      ? `A lo largo de ${yearsPhrase}, ${name} recibió el equivalente a ${ledeEquivalent.replace(/^≈\s*/, '')}. ${direct}% del total se adjudicó directamente.`
      : `Across ${yearsPhrase}, ${name} received the equivalent of ${ledeEquivalent.replace(/^≈\s*/, '')}. ${direct}% of the total was awarded by direct procurement.`
  }
  return lang === 'es'
    ? `A lo largo de ${yearsPhrase}, ${name} participó en ${formatNumber(vendor.total_contracts)} contratos por ${formatCompactMXN(vendor.total_value_mxn)}. ${direct}% adjudicación directa, ${hr}% marcados de alto riesgo.`
    : `Across ${yearsPhrase}, ${name} took ${formatNumber(vendor.total_contracts)} contracts worth ${formatCompactMXN(vendor.total_value_mxn)}. ${direct}% direct-award, ${hr}% flagged high-risk.`
}

/**
 * Pick up to 3 tangible equivalences for a given MXN amount, across
 * categories (healthcare / infrastructure / education).
 */
function pickEquivalences(mxn: number, lang: 'en' | 'es'): string[] {
  const out: string[] = []

  if (mxn >= 4_200_000_000) {
    const years = Math.round(mxn / 4_200_000_000)
    out.push(
      lang === 'es'
        ? `${formatNumber(years)} años de financiamiento oncológico pediátrico del IMSS`
        : `${formatNumber(years)} years of IMSS pediatric oncology funding`,
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
        ? `${formatNumber(hospitals)} hospitales federales construidos`
        : `${formatNumber(hospitals)} federal-tier hospitals built`,
    )
  } else if (mxn >= 30_000_000) {
    const km = Math.round(mxn / 30_000_000)
    if (km >= 2) {
      out.push(
        lang === 'es'
          ? `${formatNumber(km)} kilómetros de carretera federal`
          : `${formatNumber(km)} kilometers of federal highway`,
      )
    }
  }

  if (mxn >= 800_000) {
    const classrooms = Math.round(mxn / 800_000)
    if (classrooms >= 10) {
      out.push(
        lang === 'es'
          ? `${formatNumber(classrooms)} aulas escolares equipadas`
          : `${formatNumber(classrooms)} school classrooms equipped`,
      )
    }
  }

  return out.slice(0, 3)
}
