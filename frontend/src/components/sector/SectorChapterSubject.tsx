/**
 * SectorChapterSubject — Chapter I of sector dossier (scale + signature).
 */
import { useTranslation } from 'react-i18next'
import type { SectorDetailResponse } from '@/api/types'
import { SECTOR_COLORS } from '@/lib/constants'
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

interface Props { sector: SectorDetailResponse }

export function SectorChapterSubject({ sector }: Props) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'
  const sectorAccent = SECTOR_COLORS[sector.code] ?? '#64748b'
  const stats = sector.statistics
  const totalSpend = stats.total_value_mxn
  const hrPct = stats.high_risk_pct
  const daPct = stats.direct_award_pct
  const sbPct = stats.single_bid_pct
  const equivalences = pickEquivalences(totalSpend, lang)
  const sectorName = displayName(sector.name, lang)
  const lede = buildLede({ sectorName, stats, equivalences, lang })

  return (
    <ChapterShell id="subject">
      <ChapterHeading
        numeral="I"
        title={lang === 'es' ? 'El Sujeto' : 'Subject'}
        subtitle={lang === 'es' ? 'La escala sectorial' : 'The sector at scale'}
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
        <SubheadRule label={lang === 'es' ? 'La firma sectorial' : 'The sector signature'} />
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
          style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)', opacity: 0.7 }}
        >
          {lang === 'es'
            ? `${formatNumber(stats.total_contracts)} contratos · ${formatNumber(stats.total_institutions)} instituciones · ${formatNumber(stats.total_vendors)} proveedores`
            : `${formatNumber(stats.total_contracts)} contracts · ${formatNumber(stats.total_institutions)} institutions · ${formatNumber(stats.total_vendors)} suppliers`}
        </p>
      </FadeIn>
    </ChapterShell>
  )
}

function buildLede({
  sectorName,
  stats,
  equivalences,
  lang,
}: {
  sectorName: string
  stats: SectorDetailResponse['statistics']
  equivalences: string[]
  lang: 'en' | 'es'
}): string {
  const spend = formatCompactMXN(stats.total_value_mxn)
  const top = equivalences[0]?.replace(/^≈\s*/, '')
  if (top) {
    return lang === 'es'
      ? `El sector ${sectorName} concentra ${spend} en su historial COMPRANET — el equivalente a ${top} — distribuidos entre ${formatNumber(stats.total_institutions)} instituciones y ${formatNumber(stats.total_vendors)} proveedores.`
      : `The ${sectorName} sector concentrates ${spend} across its COMPRANET history — the equivalent of ${top} — distributed across ${formatNumber(stats.total_institutions)} institutions and ${formatNumber(stats.total_vendors)} suppliers.`
  }
  return lang === 'es'
    ? `El sector ${sectorName} concentra ${spend} en ${formatNumber(stats.total_institutions)} instituciones y ${formatNumber(stats.total_vendors)} proveedores.`
    : `The ${sectorName} sector concentrates ${spend} across ${formatNumber(stats.total_institutions)} institutions and ${formatNumber(stats.total_vendors)} suppliers.`
}

function pickEquivalences(mxn: number, lang: 'en' | 'es'): string[] {
  const out: string[] = []
  if (mxn >= 138_000_000_000) {
    const x = (mxn / 138_000_000_000).toFixed(1)
    out.push(lang === 'es'
      ? `${x}× el presupuesto federal anual de Defensa`
      : `${x}× Mexico's annual federal Defense budget`)
  }
  if (mxn >= 4_200_000_000) {
    const years = Math.round(mxn / 4_200_000_000)
    out.push(lang === 'es'
      ? `${formatNumber(years)} años de financiamiento oncológico pediátrico del IMSS`
      : `${formatNumber(years)} years of IMSS pediatric oncology funding`)
  }
  if (mxn >= 1_600_000_000) {
    const hospitals = Math.round(mxn / 800_000_000)
    out.push(lang === 'es'
      ? `${formatNumber(hospitals)} hospitales federales construidos`
      : `${formatNumber(hospitals)} federal-tier hospitals built`)
  } else if (mxn >= 30_000_000) {
    const km = Math.round(mxn / 30_000_000)
    if (km >= 2) {
      out.push(lang === 'es'
        ? `${formatNumber(km)} kilómetros de carretera federal`
        : `${formatNumber(km)} kilometers of federal highway`)
    }
  }
  return out.slice(0, 3)
}

function displayName(name: string, _lang: 'en' | 'es'): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}
