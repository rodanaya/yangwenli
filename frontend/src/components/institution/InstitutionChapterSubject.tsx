/**
 * InstitutionChapterSubject — Chapter I of institution dossier.
 *
 * Argument: SCALE. How much money does this institution move, and what
 * does that scale mean in human terms?
 *
 * Composition mirrors the vendor ChapterSubject pattern: chapter heading
 * · lede · framed scale block · equivalence list · procurement signature
 * bars (DA% and HR% with national + OECD references).
 */
import { useTranslation } from 'react-i18next'
import type { InstitutionDetailResponse } from '@/api/types'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
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

interface Props {
  institution: InstitutionDetailResponse
}

export function InstitutionChapterSubject({ institution }: Props) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const sectorCode = SECTORS.find((s) => s.id === institution.sector_id)?.code ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'

  const totalSpend = institution.total_amount_mxn ?? 0
  const totalContracts = institution.total_contracts ?? 0
  const vendorCount = institution.vendor_count ?? 0
  const hrPct = institution.high_risk_pct ?? institution.high_risk_percentage ?? 0
  const daPct = institution.direct_award_pct ?? institution.direct_award_rate ?? 0
  const sbPct = institution.single_bid_pct ?? 0

  const equivalences = pickEquivalences(totalSpend, lang)
  const lede = buildLede({ institution, lang })

  return (
    <ChapterShell id="subject">
      <ChapterHeading
        numeral="I"
        title={lang === 'es' ? 'El Sujeto' : 'Subject'}
        subtitle={lang === 'es' ? 'La escala del gasto' : 'The scale of spending'}
        sectorAccent={sectorAccent}
      />

      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={sectorAccent}>{lede}</LedeParagraph>
      </FadeIn>

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'A escala' : 'Drawing the scale'} />
        <div className="flex justify-center mt-8">
          <ScaleBlock mxn={totalSpend} sectorAccent={sectorAccent} lang={lang} />
        </div>
      </FadeIn>

      {equivalences.length > 0 && (
        <FadeIn className="mt-16">
          <SubheadRule label={lang === 'es' ? 'En términos tangibles' : 'Tangibly'} />
          <EquivalenceList items={equivalences} sectorAccent={sectorAccent} />
        </FadeIn>
      )}

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'La firma institucional' : 'The institutional signature'} />
        <div className="mt-7 space-y-7 max-w-3xl">
          <SignatureBar
            label={lang === 'es' ? 'Adjudicación directa' : 'Direct award'}
            value={daPct}
            sectorAccent={sectorAccent}
            referenceValue={48}
            referenceLabel={lang === 'es' ? 'norma nacional ≈ 48%' : 'national norm ≈ 48%'}
          />
          <SignatureBar
            label={lang === 'es' ? 'Contratos de alto riesgo' : 'High-risk contracts'}
            value={hrPct}
            sectorAccent={sectorAccent}
            highRiskTint={hrPct > 15}
            referenceBandMin={2}
            referenceBandMax={15}
            referenceLabel={lang === 'es' ? 'banda OECD 2–15%' : 'OECD reference band 2–15%'}
          />
          {sbPct > 0 && (
            <SignatureBar
              label={lang === 'es' ? 'Licitación con un solo postor' : 'Single bid'}
              value={sbPct}
              sectorAccent={sectorAccent}
              highRiskTint={sbPct > 10}
              referenceValue={5}
              referenceLabel={lang === 'es' ? 'norma sectorial ≈ 5%' : 'sector norm ≈ 5%'}
            />
          )}
        </div>
        <p
          className="mt-5 max-w-3xl font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            opacity: 0.7,
          }}
        >
          {lang === 'es'
            ? `${formatNumber(totalContracts)} contratos · ${formatNumber(vendorCount)} proveedores`
            : `${formatNumber(totalContracts)} contracts · ${formatNumber(vendorCount)} suppliers`}
        </p>
      </FadeIn>
    </ChapterShell>
  )
}

function buildLede({
  institution,
  lang,
}: {
  institution: InstitutionDetailResponse
  lang: 'en' | 'es'
}): string {
  const name = toTitleCase(institution.name)
  const spend = formatCompactMXN(institution.total_amount_mxn ?? 0)
  const vendors = institution.vendor_count ?? 0
  const equivalences = pickEquivalences(institution.total_amount_mxn ?? 0, lang)
  const top = equivalences[0]?.replace(/^≈\s*/, '')

  if (top) {
    return lang === 'es'
      ? `${name} ha ejercido ${spend} en su historial COMPRANET — el equivalente a ${top} — distribuidos entre ${formatNumber(vendors)} proveedores.`
      : `${name} has spent ${spend} across its COMPRANET history — the equivalent of ${top} — distributed among ${formatNumber(vendors)} suppliers.`
  }
  return lang === 'es'
    ? `${name} ha ejercido ${spend} en su historial COMPRANET, distribuidos entre ${formatNumber(vendors)} proveedores.`
    : `${name} has spent ${spend} across its COMPRANET history, distributed among ${formatNumber(vendors)} suppliers.`
}

function pickEquivalences(mxn: number, lang: 'en' | 'es'): string[] {
  const out: string[] = []
  if (mxn >= 4_200_000_000) {
    const years = Math.round(mxn / 4_200_000_000)
    out.push(
      lang === 'es'
        ? `${formatNumber(years)} años de financiamiento oncológico pediátrico del IMSS`
        : `${formatNumber(years)} years of IMSS pediatric oncology funding`,
    )
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

function toTitleCase(raw: string): string {
  if (!raw) return raw
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}
