/**
 * SectorChapterRisk — Chapter IV of sector dossier.
 *
 * Risk profile decomposition by tier — critical / high / medium / low
 * counts — plus comparison bars and the sector verdict number.
 * Doubles as the editorial closing.
 */
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import type { SectorDetailResponse } from '@/api/types'
import { RISK_COLORS, SECTOR_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'
import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  SignatureBar,
  FadeIn,
} from '@/components/dossier/primitives'

interface Props { sector: SectorDetailResponse }

export function SectorChapterRisk({ sector }: Props) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'
  const navigate = useNavigate()
  const sectorAccent = SECTOR_COLORS[sector.code] ?? '#64748b'
  const stats = sector.statistics

  const avgRisk = stats.avg_risk_score
  const riskLevel = avgRisk > 0 ? getRiskLevelFromScore(avgRisk) : 'low'
  const riskColor = RISK_COLORS[riskLevel]
  const riskPct = Math.round(avgRisk * 100)
  const hrPct = stats.high_risk_pct
  const daPct = stats.direct_award_pct
  const sbPct = stats.single_bid_pct

  const total = stats.total_contracts
  const tiers = [
    { key: 'critical' as const, label: lang === 'es' ? 'Crítico' : 'Critical', count: stats.critical_risk_count, color: RISK_COLORS.critical },
    { key: 'high' as const,     label: lang === 'es' ? 'Alto' : 'High',         count: stats.high_risk_count,     color: RISK_COLORS.high },
    { key: 'medium' as const,   label: lang === 'es' ? 'Medio' : 'Medium',      count: stats.medium_risk_count,   color: RISK_COLORS.medium },
    { key: 'low' as const,      label: lang === 'es' ? 'Bajo' : 'Low',          count: stats.low_risk_count,      color: 'var(--color-text-muted)' },
  ]

  const sectorName = sector.name.charAt(0).toUpperCase() + sector.name.slice(1).toLowerCase()
  const lede = buildLede({ sectorName, hrPct, daPct, riskLevel, lang })

  return (
    <ChapterShell id="risk">
      <ChapterHeading
        numeral="IV"
        title={lang === 'es' ? 'El Riesgo' : 'Risk'}
        subtitle={lang === 'es' ? 'El perfil del sector' : 'The sector profile'}
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
            <div className="font-mono mt-1" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              {lang === 'es' ? 'riesgo promedio sectorial' : 'sector avg risk'}
            </div>
          </div>

          <div className="text-center">
            <div
              className="tabular-nums"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 36,
                lineHeight: 1,
                color: hrPct > 15 ? RISK_COLORS.critical : RISK_COLORS.high,
              }}
            >
              {hrPct.toFixed(0)}%
            </div>
            <div
              className="font-mono mt-2"
              style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
            >
              {lang === 'es' ? 'contratos marcados' : 'flagged contracts'}
            </div>
            <div className="font-mono mt-1" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              {lang === 'es' ? `de ${formatNumber(total)} totales` : `of ${formatNumber(total)} total`}
            </div>
          </div>

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
              {daPct.toFixed(0)}%
            </div>
            <div
              className="font-mono mt-2"
              style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
            >
              {lang === 'es' ? 'adjudicación directa' : 'direct-award'}
            </div>
            <div className="font-mono mt-1" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              {lang === 'es' ? 'sobre el total' : 'of all contracts'}
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'Distribución de riesgo' : 'Risk distribution'} />
        <ul className="mt-7 max-w-3xl mx-auto space-y-3 list-none p-0">
          {tiers.map((t) => {
            const share = total > 0 ? (t.count / total) * 100 : 0
            return (
              <li key={t.key} className="flex items-baseline gap-4 px-3 py-1.5" style={{ borderLeft: `2px solid ${t.color}aa` }}>
                <span
                  className="font-mono tabular-nums flex-shrink-0"
                  style={{ fontSize: 11, color: t.color, fontWeight: 700, minWidth: 60, letterSpacing: '0.12em', textTransform: 'uppercase' }}
                >
                  {t.label}
                </span>
                <div className="flex-1 min-w-0 relative" style={{ height: 6, background: 'var(--color-background-elevated)', border: '1px solid var(--color-border)' }}>
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${Math.max(0, Math.min(100, share))}%`, background: t.color, opacity: 0.85 }}
                  />
                </div>
                <span
                  className="font-mono tabular-nums flex-shrink-0 text-right"
                  style={{ fontSize: 11, color: t.color, fontWeight: 700, minWidth: 48 }}
                >
                  {share.toFixed(1)}%
                </span>
                <span
                  className="font-mono tabular-nums flex-shrink-0 text-right"
                  style={{ fontSize: 10, color: 'var(--color-text-muted)', minWidth: 80 }}
                >
                  {formatNumber(t.count)}
                </span>
              </li>
            )
          })}
        </ul>
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
            onClick={() => navigate(`/explore?s=${sector.code}`)}
            className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.14em] hover:opacity-70 transition-opacity"
            style={{
              fontSize: 11,
              color: 'var(--color-text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {lang === 'es' ? 'Explorar instituciones del sector en /explore' : 'Explore sector institutions in /explore'}
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
  sectorName,
  hrPct,
  daPct,
  riskLevel,
  lang,
}: {
  sectorName: string
  hrPct: number
  daPct: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  lang: 'en' | 'es'
}): string {
  if (hrPct >= 15) {
    return lang === 'es'
      ? `El sector ${sectorName} muestra un perfil procurador bajo tensión: ${hrPct.toFixed(0)}% de sus contratos están marcados de alto riesgo por el modelo y ${daPct.toFixed(0)}% adjudicados sin licitación pública.`
      : `The ${sectorName} sector shows a procurement profile under tension: ${hrPct.toFixed(0)}% of its contracts are flagged high-risk by the model and ${daPct.toFixed(0)}% direct-award.`
  }
  if (riskLevel !== 'low') {
    return lang === 'es'
      ? `El sector ${sectorName} corre dentro del rango sectorial esperado, con ${hrPct.toFixed(0)}% de contratos marcados y ${daPct.toFixed(0)}% de adjudicación directa.`
      : `The ${sectorName} sector runs within the expected sector range, with ${hrPct.toFixed(0)}% of contracts flagged and ${daPct.toFixed(0)}% direct-award.`
  }
  return lang === 'es'
    ? `El sector ${sectorName} opera con un perfil procurador limpio: ${hrPct.toFixed(0)}% de contratos marcados, ${daPct.toFixed(0)}% adjudicación directa.`
    : `The ${sectorName} sector operates with a clean procurement profile: ${hrPct.toFixed(0)}% flagged contracts, ${daPct.toFixed(0)}% direct-award.`
}
