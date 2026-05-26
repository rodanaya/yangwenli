/**
 * InstitutionChapterRisk — Chapter V of institution dossier.
 *
 * Argument: WHERE THE RISK SITS. The institution's overall risk profile
 * decomposed into procurement signals: HR%, DA%, SB%, sector comparison.
 * Doubles as the closing "verdict" — no separate Verdict chapter for
 * institutions (institutions are systems, not actors; the editorial
 * conclusion is the risk pattern itself).
 */
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { InstitutionDetailResponse, InstitutionRiskProfile } from '@/api/types'
import { RISK_COLORS, SECTOR_COLORS, SECTORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'
import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  SignatureBar,
  FadeIn,
} from '@/components/dossier/primitives'

interface Props {
  institution: InstitutionDetailResponse
  riskProfile?: InstitutionRiskProfile | null
}

export function InstitutionChapterRisk({ institution, riskProfile }: Props) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'
  const navigate = useNavigate()

  const sectorCode = SECTORS.find((s) => s.id === institution.sector_id)?.code ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? '#64748b'

  const avgRisk = institution.avg_risk_score ?? 0
  const riskLevel = avgRisk > 0 ? getRiskLevelFromScore(avgRisk) : 'low'
  const riskColor = RISK_COLORS[riskLevel]
  const riskPct = Math.round(avgRisk * 100)

  const hrPct = institution.high_risk_pct ?? institution.high_risk_percentage ?? 0
  const daPct = institution.direct_award_pct ?? institution.direct_award_rate ?? 0
  const sbPct = institution.single_bid_pct ?? 0
  const totalContracts = institution.total_contracts ?? 0
  const hrCount = institution.high_risk_contract_count ?? Math.round((hrPct / 100) * totalContracts)

  const sectorBaseline = institution.risk_baseline ?? 0
  const sectorDelta = sectorBaseline > 0 ? avgRisk - sectorBaseline : 0
  const sectorDeltaPct = sectorBaseline > 0 ? ((avgRisk - sectorBaseline) / sectorBaseline) * 100 : 0

  void riskProfile // riskProfile fetched for future expansion (top_risk_factors not on type yet)

  const lede = buildLede({ institution, hrPct, daPct, sectorDeltaPct, lang })

  return (
    <ChapterShell id="risk">
      <ChapterHeading
        numeral="V"
        title={lang === 'es' ? 'El Riesgo' : 'Risk'}
        subtitle={lang === 'es' ? 'Dónde se asienta el riesgo' : 'Where the risk sits'}
        sectorAccent={sectorAccent}
      />

      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={sectorAccent}>{lede}</LedeParagraph>
      </FadeIn>

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'Veredicto del modelo' : "Model verdict"} />
        <div className="mt-7 max-w-3xl mx-auto flex items-center justify-center gap-12 flex-wrap">
          <div className="text-center">
            <div
              className="tabular-nums"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 72,
                lineHeight: 1,
                color: riskColor,
                letterSpacing: '-0.025em',
              }}
            >
              {riskPct || '—'}
            </div>
            <div
              className="font-mono mt-2"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: riskColor,
                fontWeight: 700,
              }}
            >
              {lang === 'es' ? localizeLevel(riskLevel, 'es') : riskLevel.toUpperCase()}
            </div>
            <div
              className="font-mono mt-1"
              style={{ fontSize: 10, color: 'var(--color-text-muted)' }}
            >
              {lang === 'es' ? 'riesgo promedio (0–100)' : 'avg risk (0–100)'}
            </div>
          </div>

          {sectorBaseline > 0 && (
            <div className="text-center">
              <div
                className="tabular-nums"
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 800,
                  fontSize: 36,
                  lineHeight: 1,
                  color: sectorDelta > 0 ? RISK_COLORS.high : 'var(--color-text-muted)',
                }}
              >
                {sectorDeltaPct > 0 ? '+' : ''}
                {Math.abs(sectorDeltaPct).toFixed(0)}%
              </div>
              <div
                className="font-mono mt-2"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}
              >
                {lang === 'es' ? 'vs línea sectorial' : 'vs sector baseline'}
              </div>
              <div className="font-mono mt-1" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                {lang === 'es' ? 'línea base ' : 'baseline '} {Math.round(sectorBaseline * 100)}
              </div>
            </div>
          )}

          <div className="text-center">
            <div
              className="tabular-nums"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 36,
                lineHeight: 1,
                color: 'var(--color-text-primary)',
              }}
            >
              {formatNumber(hrCount)}
            </div>
            <div
              className="font-mono mt-2"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
              }}
            >
              {lang === 'es' ? 'contratos marcados' : 'flagged contracts'}
            </div>
            <div className="font-mono mt-1" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              {lang === 'es' ? `de ${formatNumber(totalContracts)} totales` : `of ${formatNumber(totalContracts)} total`}
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'Comparación' : 'Comparison'} />
        <div className="mt-7 max-w-3xl mx-auto space-y-7">
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
      </FadeIn>

      <FadeIn className="mt-10">
        <div className="max-w-3xl mx-auto text-center">
          <button
            type="button"
            onClick={() => navigate(`/explore?i=${institution.id}`)}
            className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
            style={{
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {lang === 'es' ? 'Explorar proveedores en /explore' : 'Explore suppliers in /explore'}
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </FadeIn>
    </ChapterShell>
  )
}

function localizeLevel(level: 'critical' | 'high' | 'medium' | 'low', lang: 'en' | 'es'): string {
  if (lang !== 'es') return level.toUpperCase()
  return level === 'critical' ? 'CRÍTICO'
    : level === 'high' ? 'ALTO'
    : level === 'medium' ? 'MEDIO'
    : 'BAJO'
}

function buildLede({
  institution,
  hrPct,
  daPct,
  sectorDeltaPct,
  lang,
}: {
  institution: InstitutionDetailResponse
  hrPct: number
  daPct: number
  sectorDeltaPct: number
  lang: 'en' | 'es'
}): string {
  const name = toTitleCase(institution.name)
  if (sectorDeltaPct > 25 && hrPct >= 15) {
    return lang === 'es'
      ? `El perfil de riesgo de ${name} corre ${Math.round(sectorDeltaPct)}% por encima de la línea base de su sector. ${hrPct.toFixed(0)}% de sus contratos están marcados, ${daPct.toFixed(0)}% adjudicados sin licitación pública — un patrón institucional, no incidental.`
      : `${name}'s risk profile runs ${Math.round(sectorDeltaPct)}% above its sector baseline. ${hrPct.toFixed(0)}% of contracts are flagged, ${daPct.toFixed(0)}% direct-award — an institutional pattern, not an incidental one.`
  }
  if (hrPct >= 20) {
    return lang === 'es'
      ? `${hrPct.toFixed(0)}% de los contratos de ${name} están marcados por el modelo, ${daPct.toFixed(0)}% adjudicados sin licitación. La señal procuradora es alta.`
      : `${hrPct.toFixed(0)}% of ${name}'s contracts are flagged by the model, ${daPct.toFixed(0)}% direct-award. The procurement signal is high.`
  }
  return lang === 'es'
    ? `${name} opera dentro de su línea sectorial, con ${hrPct.toFixed(0)}% de contratos marcados y ${daPct.toFixed(0)}% de adjudicación directa.`
    : `${name} operates within its sector baseline, with ${hrPct.toFixed(0)}% of contracts flagged and ${daPct.toFixed(0)}% direct-award.`
}

function toTitleCase(raw: string): string {
  if (!raw) return raw
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}
