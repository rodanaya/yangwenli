/**
 * CategoryDossier — canonical category dossier at /categories/:id.
 *
 * Built 2026-05-26 (DESIGNUS round 9, Phase 5). Mirrors SectorDossier
 * but scoped to spending categories (sub-classification of contracts).
 *
 *   Hero        — cover slug
 *   Chapter I   — Subject · scale of category spending
 *   Chapter II  — Timeline · year-by-year (from getTrends)
 *   Chapter III — Top vendors · market concentration (HHI + top-10)
 *   Chapter IV  — Risk · sector comparison
 *   Methodology
 *
 * Legacy CategoryProfile (2,041 LOC) moved to /print/categories/:id.
 */
import { useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/api/client'
import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react'

import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  ScaleBlock,
  SignatureBar,
  FadeIn,
} from '@/components/dossier/primitives'
import { TimelineHourglass } from '@/components/thread/TimelineHourglass'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RISK_COLORS, SECTOR_COLORS, SECTORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatCompactUSD, formatNumber } from '@/lib/utils'

// ─── Helpers ────────────────────────────────────────────────────────────────

function localizeLevel(level: 'critical' | 'high' | 'medium' | 'low', lang: 'en' | 'es'): string {
  if (lang !== 'es') return level.toUpperCase()
  return level === 'critical' ? 'CRÍTICO' : level === 'high' ? 'ALTO' : level === 'medium' ? 'MEDIO' : 'BAJO'
}
function toTitleCase(raw: string | undefined): string {
  if (!raw) return ''
  return raw.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}

function ChapterDivider({ accent }: { accent?: string }) {
  return (
    <div className="flex items-center justify-center gap-4 py-12">
      <div className="h-px w-24" style={{ background: 'var(--color-border)' }} />
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent ?? 'var(--color-border)', opacity: 0.5 }} />
      <div className="h-px w-24" style={{ background: 'var(--color-border)' }} />
    </div>
  )
}

function ProvenanceFooter({ lang }: { lang: 'en' | 'es' }) {
  const navigate = useNavigate()
  return (
    <section id="methodology" className="py-16 px-4 sm:px-8 max-w-4xl mx-auto">
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 32, textAlign: 'center' }}>
        <p className="font-mono mb-3" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          § {lang === 'es' ? 'Metodología y procedencia' : 'Methodology and provenance'}
        </p>
        <p style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: '64ch', margin: '0 auto', lineHeight: 1.6 }}>
          {lang === 'es'
            ? 'Datos COMPRANET 2002–2025. Categorías clasificadas con el modelo automático de 91 categorías. Las señales agregadas son indicadores estadísticos, no determinaciones legales.'
            : 'COMPRANET data 2002–2025. Categories classified by the 91-category auto-model. Aggregated signals are statistical indicators, not legal determinations.'}
        </p>
        <button type="button" onClick={() => navigate('/methodology')} className="mt-4 font-mono cursor-pointer hover:opacity-70 transition-opacity" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', background: 'none', border: 'none' }}>
          {lang === 'es' ? 'Ver metodología completa' : 'See full methodology'} ↗
        </button>
      </div>
    </section>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function CategoryDossier() {
  const { id } = useParams<{ id: string }>()
  const categoryId = Number(id)
  const validId = Number.isFinite(categoryId) && categoryId > 0
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['cat-dossier', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  })
  const { data: trendsData } = useQuery({
    queryKey: ['cat-dossier', 'trends', 2002, 2025],
    queryFn: () => categoriesApi.getTrends(2002, 2025),
    staleTime: 5 * 60 * 1000,
  })
  const { data: topVendorsData } = useQuery({
    queryKey: ['cat-dossier', 'top-vendors', categoryId],
    queryFn: () => categoriesApi.getTopVendors(categoryId),
    enabled: validId,
    staleTime: 5 * 60 * 1000,
  })

  const category = useMemo(() => {
    if (!summaryData?.data) return null
    return summaryData.data.find((c: { category_id: number }) => c.category_id === categoryId) ?? null
  }, [summaryData, categoryId])

  if (!validId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'ID inválido' : 'Invalid ID'}</h2>
        <Button onClick={() => navigate('/categories')}>
          <ArrowLeft className="h-4 w-4 mr-2" />{lang === 'es' ? 'Volver a categorías' : 'Back to categories'}
        </Button>
      </div>
    )
  }
  if (summaryLoading) return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-16 w-96" />
    </div>
  )
  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{lang === 'es' ? 'Categoría no encontrada' : 'Category not found'}</h2>
        <Button onClick={() => navigate('/categories')}>
          <ArrowLeft className="h-4 w-4 mr-2" />{lang === 'es' ? 'Volver' : 'Back'}
        </Button>
      </div>
    )
  }

  const sectorCode = (category as { sector_code: string | null }).sector_code ?? null
  const accent = SECTOR_COLORS[sectorCode ?? 'otros'] ?? '#a06820'
  const sectorName = sectorCode ? (lang === 'es'
    ? SECTORS.find((s) => s.code === sectorCode)?.name
    : SECTORS.find((s) => s.code === sectorCode)?.nameEN) : null

  const c = category as {
    category_id: number
    name_es: string
    name_en: string
    sector_id: number | null
    sector_code: string | null
    total_contracts: number
    total_value: number
    avg_risk: number
    direct_award_pct?: number
    single_bid_pct?: number
    high_risk_pct?: number
    vendor_count?: number
    institution_count?: number
  }
  const displayName = lang === 'es' ? c.name_es : c.name_en
  const totalSpend = c.total_value ?? 0
  const totalContracts = c.total_contracts ?? 0
  const avgRisk = c.avg_risk ?? 0
  const riskLevel = avgRisk > 0 ? getRiskLevelFromScore(avgRisk) : 'low'
  const riskPct = Math.round(avgRisk * 100)
  const hrPct = c.high_risk_pct ?? 0
  const daPct = c.direct_award_pct ?? 0
  const sbPct = c.single_bid_pct ?? 0

  // Verdict — same convention as institution/sector: HR% as the signal
  const hrLevel: 'critical' | 'high' | 'medium' | 'low' =
    hrPct >= 25 ? 'critical' : hrPct >= 15 ? 'high' : hrPct >= 5 ? 'medium' : 'low'
  const verdictColor = RISK_COLORS[hrLevel]

  // Timeline shape for TimelineHourglass — filter to this category from trends
  const categoryTrends = useMemo(() => {
    if (!trendsData?.categories) return []
    const arr = (trendsData.categories as Array<{ category_id: number; trend: Array<{ year: number; total_value: number; total_contracts: number; avg_risk: number | null }> }>).find((t) => t.category_id === categoryId)
    return arr?.trend ?? []
  }, [trendsData, categoryId])
  const timelineForChapters = categoryTrends.map((t) => ({
    year: t.year,
    avg_risk_score: t.avg_risk ?? null,
    contract_count: t.total_contracts,
    total_value: t.total_value,
  }))

  // Top vendors
  const topVendors = topVendorsData?.data ?? []
  const hhi = topVendorsData?.hhi ?? 0
  const top3Share = topVendorsData?.top3_share_pct ?? 0
  const concentration = topVendorsData?.concentration_label

  const lede = buildLede({ displayName, totalSpend, sectorName, hrPct, daPct, lang })

  const fromAria = location.state && (location.state as { from?: string }).from === '/aria'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {fromAria && (
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary mb-4 font-mono uppercase tracking-widest">
          <ArrowLeft className="h-3 w-3" />{lang === 'es' ? 'Volver a ARIA' : 'Back to ARIA'}
        </button>
      )}

      {/* HERO */}
      <header className="relative">
        <div aria-hidden="true" className="absolute left-0 right-0" style={{ top: 0, height: 6, background: accent }} />
        <div className="pt-16 pb-12">
          <div className="flex items-baseline justify-between gap-4 mb-7">
            <div className="font-mono tabular-nums" style={{ fontSize: 11, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              CAT · C-{String(c.category_id).padStart(3, '0')}{sectorCode && (<> · {sectorCode.toUpperCase()}</>)}
            </div>
          </div>
          <div className="font-mono mb-4" style={{ fontSize: 10, fontStyle: 'italic', letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, fontWeight: 500 }}>
            § {lang === 'es' ? 'EL EXPEDIENTE · CATEGORÍA' : 'EL EXPEDIENTE · CATEGORY DOSSIER'}
          </div>

          <div className="grid gap-6 lg:gap-10" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
            <div className="min-w-0">
              <h1
                className="text-balance mb-1.5"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 'clamp(32px, 4.4vw, 48px)',
                  lineHeight: 1.04,
                  letterSpacing: '-0.012em',
                  color: 'var(--color-text-primary)',
                }}
              >
                {displayName}
              </h1>
              {sectorName && (
                <div style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 16, fontWeight: 400, color: 'var(--color-text-secondary)', opacity: 0.6, letterSpacing: '0.02em' }}>
                  {lang === 'es' ? `Categoría de gasto · sector ${sectorName}` : `Spending category · ${sectorName} sector`}
                </div>
              )}
              <div className="mt-4" style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 14 }}>
                <div className="font-mono" style={{ fontSize: 12, letterSpacing: '0.04em', color: 'var(--color-text-secondary)' }}>
                  <span>{formatNumber(totalContracts)} {lang === 'es' ? 'contratos' : 'contracts'}</span>
                  <span className="mx-2" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>·</span>
                  <span>{Math.round(daPct)}% {lang === 'es' ? 'adj. directa' : 'direct award'}</span>
                  {c.vendor_count && (
                    <>
                      <span className="mx-2" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>·</span>
                      <span>{formatNumber(c.vendor_count)} {lang === 'es' ? 'proveedores' : 'vendors'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Verdict card */}
            <aside className="flex-shrink-0 relative" style={{ width: 168, paddingTop: 10, paddingBottom: 12, paddingLeft: 18, paddingRight: 18 }}>
              <div aria-hidden="true" className="absolute top-0 left-0 right-0" style={{ height: 2, background: verdictColor }} />
              <div className="text-center">
                <div className="tabular-nums" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 52, lineHeight: 1, color: verdictColor, letterSpacing: '-0.02em' }}>
                  {hrPct.toFixed(0)}<span className="font-mono" style={{ fontSize: 18, fontStyle: 'normal', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 2 }}>%</span>
                </div>
                <div className="font-mono mt-1" style={{ fontSize: 9, color: 'var(--color-text-muted)', opacity: 0.6, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  {lang === 'es' ? 'contratos de alto riesgo' : 'high-risk contracts'}
                </div>
              </div>
              <div aria-hidden="true" className="my-3 mx-auto" style={{ height: 1, width: '60%', background: 'var(--color-border)' }} />
              <div className="font-mono text-center" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: verdictColor, fontWeight: 700 }}>
                {lang === 'es' ? localizeLevel(hrLevel, 'es') : hrLevel.toUpperCase()}
              </div>
              <div className="font-mono text-center mt-1" style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>
                {lang === 'es' ? 'riesgo prom.' : 'avg risk'} {riskPct} ({riskLevel})
              </div>
            </aside>
          </div>

          <div aria-hidden="true" className="mt-8" style={{ height: 1, background: 'var(--color-border)' }} />

          {/* Lede */}
          <div className="mt-10" style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 20, maxWidth: '68ch' }}>
            <p
              style={{
                fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
                fontStyle: 'italic',
                fontSize: 17,
                lineHeight: 1.55,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.005em',
              }}
            >
              <span aria-hidden="true" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: '3.5em', float: 'left', lineHeight: 0.85, color: accent, marginRight: '0.08em', marginTop: '0.05em', marginBottom: '-0.05em' }}>
                {displayName.charAt(0)}
              </span>
              {lede.slice(displayName.charAt(0).length)}
            </p>
          </div>
        </div>
      </header>

      {/* Chapter I — Subject */}
      <ChapterShell id="subject">
        <ChapterHeading
          numeral="I"
          title={lang === 'es' ? 'El Sujeto' : 'Subject'}
          subtitle={lang === 'es' ? 'La escala de la categoría' : 'The category at scale'}
          sectorAccent={accent}
        />
        <FadeIn className="mt-12">
          <LedeParagraph sectorAccent={accent}>
            {lang === 'es'
              ? `${displayName} concentra ${formatCompactMXN(totalSpend)} (≈${formatCompactUSD(totalSpend)}) repartidos en ${formatNumber(totalContracts)} contratos.`
              : `${displayName} concentrates ${formatCompactMXN(totalSpend)} (≈${formatCompactUSD(totalSpend)}) across ${formatNumber(totalContracts)} contracts.`}
          </LedeParagraph>
        </FadeIn>
        <FadeIn className="mt-16">
          <SubheadRule label={lang === 'es' ? 'A escala' : 'Drawing the scale'} />
          <div className="flex justify-center mt-8">
            <ScaleBlock mxn={totalSpend} sectorAccent={accent} lang={lang} />
          </div>
        </FadeIn>
        <FadeIn className="mt-16">
          <SubheadRule label={lang === 'es' ? 'La firma de la categoría' : 'The category signature'} />
          <div className="mt-7 space-y-7 max-w-3xl">
            <SignatureBar label={lang === 'es' ? 'Adjudicación directa' : 'Direct award'} value={daPct} sectorAccent={accent} referenceValue={48} referenceLabel={lang === 'es' ? 'norma nacional ≈ 48%' : 'national norm ≈ 48%'} />
            <SignatureBar label={lang === 'es' ? 'Contratos de alto riesgo' : 'High-risk contracts'} value={hrPct} sectorAccent={accent} highRiskTint={hrPct > 15} referenceBandMin={2} referenceBandMax={15} referenceLabel={lang === 'es' ? 'banda OECD 2–15%' : 'OECD reference band 2–15%'} />
            {sbPct > 0 && (
              <SignatureBar label={lang === 'es' ? 'Licitación con un solo postor' : 'Single bid'} value={sbPct} sectorAccent={accent} highRiskTint={sbPct > 10} referenceValue={5} referenceLabel={lang === 'es' ? 'norma sectorial ≈ 5%' : 'sector norm ≈ 5%'} />
            )}
          </div>
        </FadeIn>
      </ChapterShell>

      <ChapterDivider accent={accent} />

      {/* Chapter II — Timeline */}
      {timelineForChapters.length > 0 && (
        <>
          <TimelineHourglass
            timeline={timelineForChapters}
            totalContracts={totalContracts}
            vendorName={displayName}
            primarySectorName={sectorCode ?? undefined}
          />
          <ChapterDivider accent={accent} />
        </>
      )}

      {/* Chapter III — Top vendors */}
      <ChapterShell id="vendors">
        <ChapterHeading
          numeral={timelineForChapters.length > 0 ? 'III' : 'II'}
          title={lang === 'es' ? 'Los Proveedores' : 'Vendors'}
          subtitle={lang === 'es' ? 'Quién captura el mercado' : 'Who captures the market'}
          sectorAccent={accent}
        />
        <FadeIn className="mt-12">
          <LedeParagraph sectorAccent={accent}>
            {topVendors.length > 0
              ? (lang === 'es'
                  ? `Los tres mayores proveedores de esta categoría capturan el ${top3Share.toFixed(0)}% del mercado, con un HHI de ${(hhi).toFixed(0)} — ${concentration === 'highly_concentrated' ? 'altamente concentrado' : concentration === 'moderately_concentrated' ? 'moderadamente concentrado' : 'competitivo'}.`
                  : `The top three vendors capture ${top3Share.toFixed(0)}% of this market, with an HHI of ${hhi.toFixed(0)} — ${concentration === 'highly_concentrated' ? 'highly concentrated' : concentration === 'moderately_concentrated' ? 'moderately concentrated' : 'competitive'}.`)
              : (lang === 'es' ? 'Sin datos de proveedores para esta categoría.' : 'No vendor data for this category.')}
          </LedeParagraph>
        </FadeIn>
        {topVendors.length > 0 && (
          <FadeIn className="mt-16">
            <SubheadRule label={lang === 'es' ? 'Los diez mayores' : 'The top ten'} />
            <ul className="mt-7 max-w-3xl mx-auto space-y-2 list-none p-0">
              {topVendors.slice(0, 10).map((v, idx) => {
                const score = v.avg_risk ?? 0
                const lvl = score > 0 ? getRiskLevelFromScore(score) : 'low'
                const rColor = RISK_COLORS[lvl]
                const dominant = v.market_share_pct >= 10
                return (
                  <li key={v.vendor_id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                      className="w-full text-left flex items-baseline gap-3 px-3 py-2 rounded-sm hover:bg-background-card/60 transition-colors"
                      style={{ borderLeft: `2px solid ${rColor}`, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <span className="font-mono tabular-nums flex-shrink-0" style={{ fontSize: 10, color: 'var(--color-text-muted)', width: 24 }}>{idx + 1}</span>
                      <span className="flex-1 min-w-0 truncate" style={{ fontFamily: '"Source Serif Pro", Georgia, serif', fontSize: 14, color: 'var(--color-text-primary)' }}>
                        {toTitleCase(v.vendor_name)}
                      </span>
                      {dominant && (
                        <span className="font-mono flex-shrink-0" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, fontWeight: 700, padding: '2px 6px', background: `${accent}1f`, border: `1px solid ${accent}44`, borderRadius: 2 }}>
                          {lang === 'es' ? 'DOMINANTE' : 'DOMINANT'}
                        </span>
                      )}
                      <span className="font-mono tabular-nums flex-shrink-0 text-right" style={{ fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 72 }}>
                        {formatCompactMXN(v.vendor_value)}
                      </span>
                      <span className="font-mono tabular-nums flex-shrink-0 text-right" style={{ fontSize: 11, color: accent, fontWeight: 700, minWidth: 48 }}>
                        {v.market_share_pct.toFixed(1)}%
                      </span>
                      <span className="font-mono tabular-nums flex-shrink-0 text-right" style={{ fontSize: 10, color: rColor, fontWeight: 700, minWidth: 36 }}>
                        {score > 0 ? Math.round(score * 100) : '—'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </FadeIn>
        )}
      </ChapterShell>

      <ChapterDivider accent={accent} />

      {/* Chapter IV — Risk */}
      <ChapterShell id="risk">
        <ChapterHeading
          numeral={timelineForChapters.length > 0 ? 'IV' : 'III'}
          title={lang === 'es' ? 'El Riesgo' : 'Risk'}
          subtitle={lang === 'es' ? 'Perfil procurador' : 'Procurement profile'}
          sectorAccent={accent}
        />
        <FadeIn className="mt-12">
          <LedeParagraph sectorAccent={accent}>
            {hrPct >= 15
              ? (lang === 'es'
                  ? `${displayName} muestra un perfil procurador bajo tensión: ${hrPct.toFixed(0)}% de los contratos están marcados y ${daPct.toFixed(0)}% adjudicados sin licitación pública.`
                  : `${displayName} shows a procurement profile under tension: ${hrPct.toFixed(0)}% of contracts are flagged and ${daPct.toFixed(0)}% direct-award.`)
              : (lang === 'es'
                  ? `${displayName} opera dentro del rango esperado, con ${hrPct.toFixed(0)}% de contratos marcados y ${daPct.toFixed(0)}% adjudicación directa.`
                  : `${displayName} operates within the expected range, with ${hrPct.toFixed(0)}% of contracts flagged and ${daPct.toFixed(0)}% direct-award.`)}
          </LedeParagraph>
        </FadeIn>

        <FadeIn className="mt-16">
          <SubheadRule label={lang === 'es' ? 'Veredicto' : 'Verdict'} />
          <div className="mt-7 max-w-3xl mx-auto flex items-center justify-center gap-12 flex-wrap">
            <div className="text-center">
              <div className="tabular-nums" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 72, lineHeight: 1, color: RISK_COLORS[riskLevel], letterSpacing: '-0.025em' }}>
                {riskPct || '—'}
              </div>
              <div className="font-mono mt-2" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: RISK_COLORS[riskLevel], fontWeight: 700 }}>
                {lang === 'es' ? localizeLevel(riskLevel, 'es') : riskLevel.toUpperCase()}
              </div>
              <div className="font-mono mt-1" style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                {lang === 'es' ? 'riesgo promedio' : 'avg risk'}
              </div>
            </div>
            <div className="text-center">
              <div className="tabular-nums" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 36, lineHeight: 1, color: hrPct > 15 ? RISK_COLORS.critical : RISK_COLORS.high }}>
                {hrPct.toFixed(0)}%
              </div>
              <div className="font-mono mt-2" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                {lang === 'es' ? 'contratos marcados' : 'flagged contracts'}
              </div>
            </div>
            <div className="text-center">
              <div className="tabular-nums" style={{ fontFamily: '"Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 800, fontSize: 36, lineHeight: 1, color: 'var(--color-text-primary)' }}>
                {daPct.toFixed(0)}%
              </div>
              <div className="font-mono mt-2" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                {lang === 'es' ? 'adjudicación directa' : 'direct-award'}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn className="mt-10">
          <div className="max-w-3xl mx-auto text-center">
            <button
              type="button"
              onClick={() => sectorCode && navigate(`/sectors/${c.sector_id ?? ''}`)}
              disabled={!sectorCode}
              className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.14em] hover:opacity-70 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontSize: 11, color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {lang === 'es' ? 'Ver el sector completo' : 'See the full sector'}
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </FadeIn>
      </ChapterShell>

      <ProvenanceFooter lang={lang} />
    </div>
  )
}

function buildLede({
  displayName,
  totalSpend,
  sectorName,
  hrPct,
  daPct,
  lang,
}: {
  displayName: string
  totalSpend: number
  sectorName?: string | null
  hrPct: number
  daPct: number
  lang: 'en' | 'es'
}): string {
  if (hrPct >= 15) {
    return lang === 'es'
      ? `${displayName} agrupa ${formatCompactMXN(totalSpend)}${sectorName ? ` dentro del sector ${sectorName}` : ''}. ${hrPct.toFixed(0)}% de los contratos están marcados por el modelo y ${daPct.toFixed(0)}% adjudicados sin licitación — un perfil de categoría bajo tensión.`
      : `${displayName} aggregates ${formatCompactMXN(totalSpend)}${sectorName ? ` within the ${sectorName} sector` : ''}. ${hrPct.toFixed(0)}% of contracts are flagged by the model and ${daPct.toFixed(0)}% direct-award — a category profile under tension.`
  }
  return lang === 'es'
    ? `${displayName} agrupa ${formatCompactMXN(totalSpend)}${sectorName ? ` dentro del sector ${sectorName}` : ''}, con ${daPct.toFixed(0)}% de adjudicación directa.`
    : `${displayName} aggregates ${formatCompactMXN(totalSpend)}${sectorName ? ` within the ${sectorName} sector` : ''}, with ${daPct.toFixed(0)}% direct-award.`
}
