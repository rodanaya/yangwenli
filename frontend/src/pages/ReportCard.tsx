/**
 * El Corte Nacional / The National Cut
 *
 * One-screen national verdict that feeds the Register (/institutions).
 * Folio voice, zero SaaS chrome: a Playfair Display Italic sledgehammer
 * numeral for the national PHI score, an FT-bullet verdict block against
 * OECD ceilings, a sector register of deviation bars anchored on the
 * OECD 25% direct-award line, and a compact annotated trend line.
 *
 * Rebuilt 2026-07-02 per docs spec §3.4 "EL CORTE NACIONAL" — killed the
 * 66/100 gauge ring, the SemaforoIndicator traffic light, all framer-motion
 * spring entrances, both inline <circle> dot-strip charts, and the private
 * gradeToMexican() zinc grade ladder. One tier ladder only: lib/tiers.ts
 * TIER_STYLES via gradeToTierKey.
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { phiApi, analysisApi } from '@/api/client'
import { SECTORS, SECTOR_COLORS, getSectorName } from '@/lib/constants'
import { formatDualCurrency } from '@/lib/utils'
import { gradeToTierKey, TIER_STYLES, type TierKey } from '@/lib/tiers'
import { BenchmarkRow } from '@/components/editorial/BenchmarkRow'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RiskLevelEntry {
  count: number
  value_mxn: number
  count_pct: number
  value_pct: number
}

interface RiskDistribution {
  critical: RiskLevelEntry
  high: RiskLevelEntry
  medium: RiskLevelEntry
  low: RiskLevelEntry
}

interface PHIIndicator {
  value: number
  light: 'green' | 'yellow' | 'red'
  label: string
  description: string
  benchmark: string
  weight?: number | null
}

interface PHISector {
  sector_id: number
  sector_name: string
  grade: string
  phi_composite_score?: number
  greens: number
  yellows: number
  reds: number
  total_indicators: number
  total_contracts: number
  total_value_mxn: number
  competition_by_value?: number
  direct_award_rate_by_value?: number
  risk_distribution?: RiskDistribution
  indicators: Record<string, PHIIndicator>
}

interface PHINational {
  sector_name: string
  grade: string
  phi_composite_score?: number
  greens: number
  yellows: number
  reds: number
  total_indicators: number
  total_contracts: number
  total_value_mxn: number
  competition_by_value?: number
  risk_distribution?: RiskDistribution
  indicators: Record<string, PHIIndicator>
}

interface PHISectorsResponse {
  methodology: {
    name: string
    based_on: string[]
  }
  national: PHINational
  sectors: PHISector[]
}

interface TrendYear {
  year: number
  grade: string
  phi_composite_score?: number
  competition_rate: number
  competition_by_value?: number
  single_bid_rate: number
  avg_bidders: number
  total_contracts: number
}

// ---------------------------------------------------------------------------
// National hero — Playfair Display Italic 800 numeral + EB Garamond
// italic headline with a single ochre tier fragment. One ladder only:
// TIER_STYLES via gradeToTierKey (Steel & Ember — no green anywhere).
// ---------------------------------------------------------------------------

const OCHRE = '#a06820'

function NationalHero({
  national,
  totalValueMxn,
  totalContracts,
  gtCasesCount,
  lang,
}: {
  national: PHINational
  totalValueMxn: number | null
  totalContracts: number | null
  gtCasesCount: number
  lang: 'en' | 'es'
}) {
  const { t } = useTranslation('reportcard')
  const tier: TierKey = gradeToTierKey(national.grade)
  const tierStyle = TIER_STYLES[tier]
  const score = Math.round(national.phi_composite_score ?? 0)
  const tierLabel = t(`tierLabel.${tier}`)

  const valueLabel = totalValueMxn != null ? formatDualCurrency(totalValueMxn) : null
  const contractsLabel = totalContracts != null ? totalContracts.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US') : null

  const ariaLabel =
    lang === 'en'
      ? `National procurement health score: ${score} out of 100, ${tierLabel} tier.`
      : `Indicador nacional de salud de compras: ${score} de 100, nivel ${tierLabel}.`

  return (
    <section
      className="mb-10 rounded-sm overflow-hidden relative"
      style={{ border: `1px solid ${tierStyle.border}`, borderLeftWidth: 4, borderLeftColor: tierStyle.color, backgroundColor: tierStyle.bg }}
      role="region"
      aria-label={ariaLabel}
    >
      <div className="px-6 py-8 md:px-10 md:py-10">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('heroKicker')}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-6 mb-4">
          <span
            className="leading-none tabular-nums font-extrabold italic"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(72px, 12vw, 128px)',
              color: tierStyle.color,
              letterSpacing: '-0.02em',
            }}
            aria-hidden="true"
          >
            {score}
            <span className="text-[0.32em] font-mono not-italic font-bold ml-1 align-super" style={{ opacity: 0.55 }}>
              /100
            </span>
          </span>

          <h1
            className="text-xl md:text-2xl leading-snug max-w-[36ch]"
            style={{ fontFamily: "'EB Garamond', Georgia, serif", fontStyle: 'italic', color: 'var(--color-text-secondary)' }}
          >
            {t('corteHeadlinePrefix')}
            {' '}
            <span style={{ color: OCHRE, fontWeight: 600 }}>{tierLabel}</span>
            {t('corteHeadlineSuffix')}
          </h1>
        </div>

        {(valueLabel || contractsLabel) && (
          <p className="font-mono text-[11px] tracking-[0.02em] text-text-muted">
            {t('corteCaption', {
              value: valueLabel ?? '—',
              contracts: contractsLabel ?? '—',
              cases: gtCasesCount,
            })}
          </p>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Verdict block — three FT-bullet BenchmarkRows against OECD ceilings.
// --color-oecd stays the sanctioned reference token (do not amber it).
// ---------------------------------------------------------------------------

function VerdictBlock({
  national,
  highRiskPct,
  lang,
}: {
  national: PHINational
  highRiskPct: number | null
  lang: 'en' | 'es'
}) {
  const { t } = useTranslation('reportcard')

  const daIndicator = national.indicators?.['direct_award_rate']
  const sbIndicator = national.indicators?.['single_bid_rate']
  const daRate = daIndicator?.value ?? (national.competition_by_value != null ? 100 - national.competition_by_value : null)
  const sbRate = sbIndicator?.value ?? null

  const MAX_DELTA = 0.5

  const rows: { key: string; label: string; value: number; benchmark: number; benchmarkLabel: string }[] = []
  if (daRate != null) {
    rows.push({
      key: 'da',
      label: t('oecdDALabel'),
      value: daRate / 100,
      benchmark: 0.25,
      benchmarkLabel: lang === 'es' ? 'techo OCDE 25%' : 'OECD 25% ceiling',
    })
  }
  if (sbRate != null) {
    rows.push({
      key: 'sb',
      label: t('oecdSBLabel'),
      value: sbRate / 100,
      benchmark: 0.15,
      benchmarkLabel: lang === 'es' ? 'techo OCDE 15%' : 'OECD 15% ceiling',
    })
  }
  if (highRiskPct != null) {
    rows.push({
      key: 'risk',
      label: t('statHighRiskRate'),
      value: highRiskPct / 100,
      benchmark: 0.15,
      benchmarkLabel: lang === 'es' ? 'banda OCDE 2–15%' : 'OECD 2–15% band',
    })
  }

  if (rows.length === 0) return null

  return (
    <section className="mb-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--color-oecd)' }}>
        {t('oecdContextTitle')}
      </p>
      <h2 className="text-lg font-serif font-bold mb-3 text-text-primary">
        {t('verdictTitle')}
      </h2>
      <div className="rounded-sm border border-border bg-background/40 p-4 space-y-0.5">
        {rows.map((r) => (
          <BenchmarkRow key={r.key} label={r.label} value={r.value} benchmark={r.benchmark} benchmarkLabel={r.benchmarkLabel} maxDelta={MAX_DELTA} />
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Sector register — 12 FT deviation bars anchored on the OECD 25%
// direct-award line (bars extend left/right of the reference rule),
// sector-colored via SECTOR_COLORS. Each row links to /sectors/:id
// through EntityIdentityChip — the sanctioned entity-link pattern.
// ---------------------------------------------------------------------------

const OECD_DA_ANCHOR_PCT = 25
const SECTOR_MAX_DELTA_FRAC = 0.5

function SectorDeviationRow({ sector, lang }: { sector: PHISector; lang: 'en' | 'es' }) {
  const sectorMeta = SECTORS.find((s) => s.id === sector.sector_id)
  const color = SECTOR_COLORS[sector.sector_name] ?? sectorMeta?.color ?? SECTOR_COLORS.otros
  const displayName = getSectorName(sector.sector_name, lang)

  const daPct = sector.direct_award_rate_by_value ?? (sector.competition_by_value != null ? 100 - sector.competition_by_value : 0)
  const delta = daPct / 100 - OECD_DA_ANCHOR_PCT / 100
  const isAbove = delta > 0
  const barFrac = Math.min(Math.abs(delta) / SECTOR_MAX_DELTA_FRAC, 1)
  const barWidthPct = barFrac * 50
  const absPp = Math.abs(Math.round(delta * 100))
  const arrow = isAbove ? '↑' : '↓'

  const tier = gradeToTierKey(sector.grade)
  const tierStyle = TIER_STYLES[tier]

  const rowAriaLabel =
    lang === 'en'
      ? `${displayName}: ${daPct.toFixed(1)}% direct award by value, ${absPp} points ${isAbove ? 'above' : 'below'} the OECD 25% ceiling.`
      : `${displayName}: ${daPct.toFixed(1)}% de adjudicación directa por valor, ${absPp} puntos ${isAbove ? 'por encima' : 'por debajo'} del techo OCDE de 25%.`

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0" role="row" aria-label={rowAriaLabel}>
      <div className="w-36 sm:w-44 flex-shrink-0">
        <EntityIdentityChip type="sector" id={sector.sector_id} name={displayName} size="sm" />
      </div>

      <div className="flex-1 relative min-w-0" style={{ height: 20 }} aria-hidden="true">
        {/* Track */}
        <div className="absolute left-0 right-0" style={{ top: '50%', height: 3, transform: 'translateY(-50%)', background: '#27272a', borderRadius: 2 }} />
        {/* OECD 25% anchor tick — center of the diverging scale */}
        <div className="absolute" style={{ left: '50%', top: 2, bottom: 2, width: 1.5, background: 'var(--color-oecd)', opacity: 0.7 }} />
        {barWidthPct > 0 && (
          <div
            className="absolute"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              height: 7,
              borderRadius: 1,
              background: color,
              opacity: 0.85,
              ...(isAbove ? { left: '50%', width: `${barWidthPct}%` } : { left: `${50 - barWidthPct}%`, width: `${barWidthPct}%` }),
            }}
          />
        )}
      </div>

      <span className="text-[10px] font-mono shrink-0 text-right tabular-nums leading-tight w-16" style={{ color: isAbove ? '#c41e3a' : '#52525b' }}>
        {arrow} {absPp}pp
      </span>

      <span className="text-[10px] font-mono tabular-nums shrink-0 text-right w-12" style={{ color: 'var(--color-text-muted)' }}>
        {daPct.toFixed(1)}%
      </span>

      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0"
        style={{ color: tierStyle.color, backgroundColor: tierStyle.bg, border: `1px solid ${tierStyle.border}` }}
      >
        {Math.round(sector.phi_composite_score ?? 0)}
      </span>
    </div>
  )
}

function SectorRegister({ sectors, lang }: { sectors: PHISector[]; lang: 'en' | 'es' }) {
  const { t } = useTranslation('reportcard')

  const sorted = useMemo(() => {
    return [...sectors].sort((a, b) => {
      const aDa = a.direct_award_rate_by_value ?? (a.competition_by_value != null ? 100 - a.competition_by_value : 0)
      const bDa = b.direct_award_rate_by_value ?? (b.competition_by_value != null ? 100 - b.competition_by_value : 0)
      return bDa - aDa
    })
  }, [sectors])

  return (
    <section className="mb-10">
      <h2 className="text-lg font-serif font-bold mb-1 text-text-primary">
        {t('sectorTitle')}
      </h2>
      <p className="text-sm mb-4 text-text-muted">
        {lang === 'en'
          ? 'Adjudication share versus the OECD 25% direct-award ceiling — bars right of the line exceed it.'
          : 'Participación de adjudicación directa contra el techo OCDE de 25% — barras a la derecha de la línea lo exceden.'}
      </p>
      <div className="surface-card p-4" role="table" aria-label={t('sectorTitle')}>
        {sorted.map((sector) => (
          <SectorDeviationRow key={sector.sector_id} sector={sector} lang={lang} />
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Trend — compact annotated line of phi_composite_score by year
// (Reuters annotated-time-series grammar: direct-labeled endpoints).
// ---------------------------------------------------------------------------

function TrendLine({ years, lang }: { years: TrendYear[]; lang: 'en' | 'es' }) {
  const { t } = useTranslation('reportcard')

  const points = useMemo(() => years.filter((y) => y.phi_composite_score != null), [years])

  const trendDirection = useMemo((): 'improving' | 'stable' | 'worsening' => {
    if (points.length < 4) return 'stable'
    const recent = points.slice(-3)
    const prior = points.slice(-6, -3)
    if (prior.length === 0) return 'stable'
    const avgRecent = recent.reduce((s, y) => s + (y.phi_composite_score ?? 0), 0) / recent.length
    const avgPrior = prior.reduce((s, y) => s + (y.phi_composite_score ?? 0), 0) / prior.length
    const delta = avgRecent - avgPrior
    if (delta > 2) return 'improving'
    if (delta < -2) return 'worsening'
    return 'stable'
  }, [points])

  const trendConfig = {
    improving: { color: '#5e7fa8', labelKey: 'trendImproving' as const },
    stable: { color: 'var(--color-text-muted)', labelKey: 'trendStable' as const },
    worsening: { color: 'var(--color-risk-critical)', labelKey: 'trendWorsening' as const },
  }[trendDirection]

  if (points.length < 2) return null

  const W = 640
  const H = 120
  const PAD_L = 32
  const PAD_R = 56
  const PAD_T = 16
  const PAD_B = 20

  const scores = points.map((p) => p.phi_composite_score ?? 0)
  const minY = Math.max(0, Math.min(...scores) - 5)
  const maxY = Math.min(100, Math.max(...scores) + 5)
  const yRange = Math.max(1, maxY - minY)

  const xFor = (i: number) => PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R)
  const yFor = (score: number) => H - PAD_B - ((score - minY) / yRange) * (H - PAD_T - PAD_B)

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.phi_composite_score ?? 0).toFixed(1)}`).join(' ')

  const first = points[0]
  const last = points[points.length - 1]

  const ariaLabel =
    lang === 'en'
      ? `National PHI score trend, ${first.year} to ${last.year}: from ${Math.round(first.phi_composite_score ?? 0)} to ${Math.round(last.phi_composite_score ?? 0)}.`
      : `Tendencia del indicador PHI nacional, ${first.year} a ${last.year}: de ${Math.round(first.phi_composite_score ?? 0)} a ${Math.round(last.phi_composite_score ?? 0)}.`

  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-serif font-bold text-text-primary">
          {t('trendTitle')}
        </h2>
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em]" style={{ color: trendConfig.color }}>
          {t(trendConfig.labelKey)}
        </span>
      </div>
      <div className="surface-card p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={ariaLabel} preserveAspectRatio="xMinYMid meet">
          {/* Baseline */}
          <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--color-border)" strokeWidth={1} />
          {/* Line */}
          <path d={pathD} fill="none" stroke={trendConfig.color} strokeWidth={2} />
          {/* First point + label */}
          <circle cx={xFor(0)} cy={yFor(first.phi_composite_score ?? 0)} r={2.5} fill={trendConfig.color} />
          <text x={xFor(0)} y={yFor(first.phi_composite_score ?? 0) - 8} fontSize={9} fontFamily="var(--font-family-mono)" textAnchor="start" fill="var(--color-text-muted)">
            {first.year}
          </text>
          {/* Last point + direct-labeled endpoint */}
          <circle cx={xFor(points.length - 1)} cy={yFor(last.phi_composite_score ?? 0)} r={3} fill={trendConfig.color} />
          <text
            x={xFor(points.length - 1) + 6}
            y={yFor(last.phi_composite_score ?? 0) + 3}
            fontSize={11}
            fontFamily="var(--font-family-mono)"
            fontWeight={700}
            textAnchor="start"
            fill={trendConfig.color}
          >
            {Math.round(last.phi_composite_score ?? 0)}
          </text>
          <text
            x={xFor(points.length - 1) + 6}
            y={yFor(last.phi_composite_score ?? 0) + 14}
            fontSize={8}
            fontFamily="var(--font-family-mono)"
            textAnchor="start"
            fill="var(--color-text-muted)"
          >
            {last.year}
          </text>
        </svg>
      </div>
    </section>
  )
}

function TrendSection() {
  const { i18n } = useTranslation('reportcard')
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const { data } = useQuery<{ years: TrendYear[] }>({
    queryKey: ['phi-trend'],
    queryFn: () => phiApi.getTrend(),
  })

  const years: TrendYear[] = data?.years ?? []
  if (years.length < 2) return null

  return <TrendLine years={years} lang={lang} />
}

// ---------------------------------------------------------------------------
// Methodology Footer
// ---------------------------------------------------------------------------

function MethodologyFooter() {
  const { t } = useTranslation('reportcard')
  const navigate = useNavigate()

  return (
    <section className="mt-12 mb-8">
      <div className="surface-card p-5">
        <p className="text-xs leading-relaxed mb-3 text-text-secondary">
          {t('methodologyNote')}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10px] font-mono text-text-muted">
            {t('sourcesLabel')}
          </p>
          <button
            onClick={() => navigate('/methodology')}
            className="text-[10px] font-mono font-bold uppercase tracking-wide transition-colors text-risk-high hover:text-accent"
          >
            {t('viewFullMethodology')}
          </button>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Loading / Error states
// ---------------------------------------------------------------------------

function LoadingState() {
  const { t } = useTranslation('reportcard')
  return (
    <div className="flex items-center justify-center min-h-[40vh] bg-background">
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-10 w-10 border-2 border-border border-t-accent mx-auto mb-4"
          role="status"
          aria-label={t('loading')}
        />
        <p className="text-text-muted text-sm font-mono">{t('loading')}</p>
      </div>
    </div>
  )
}

function ComputingState() {
  const { t } = useTranslation('reportcard')
  return (
    <div className="flex items-center justify-center min-h-[40vh] bg-background">
      <div className="text-center max-w-md">
        <div
          className="animate-spin rounded-full h-10 w-10 border-2 border-border border-t-accent mx-auto mb-4"
          role="status"
        />
        <p className="font-bold mb-2 text-text-primary">
          {t('computing')}
        </p>
        <p className="text-sm text-text-muted">
          {t('computingDetail')}
        </p>
      </div>
    </div>
  )
}

function ErrorState() {
  const { t } = useTranslation('reportcard')
  return (
    <div className="flex items-center justify-center min-h-[40vh] bg-background">
      <div className="text-center">
        <p role="alert" className="text-risk-critical mb-2">{t('error')}</p>
        <p className="text-text-muted text-xs font-mono">COMPRANET data may be temporarily unavailable.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

function ReportCard() {
  const { t, i18n } = useTranslation('reportcard')
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  // PHI data: national grade + sector breakdown
  const {
    data: phiData,
    isLoading: phiLoading,
    error: phiError,
  } = useQuery<PHISectorsResponse>({
    queryKey: ['phi-sectors'],
    queryFn: () => phiApi.getSectors(),
    retry: 3,
    retryDelay: (failureCount) => Math.min(1000 * 2 ** failureCount, 30_000),
  })

  // Fast dashboard: total value, total contracts, high risk pct
  const { data: dashData } = useQuery({
    queryKey: ['fast-dashboard'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 10 * 60 * 1000,
  })

  // Live GT case count — replaces the stale hardcoded 1363 (audit 2026-05-12)
  const { data: executiveSummary } = useQuery({
    queryKey: ['reportcard', 'executive-summary-gt'],
    queryFn: () => analysisApi.getExecutiveSummary(),
    staleTime: 60 * 60 * 1000,
    retry: 0,
  })

  const is503 = (err: unknown): boolean =>
    (err as AxiosError)?.response?.status === 503

  if (phiLoading) return <LoadingState />
  if (phiError && is503(phiError)) return <ComputingState />
  if (phiError || !phiData) return <ErrorState />

  const { national, sectors } = phiData

  // High risk pct from PHI national risk_distribution or fast dashboard
  const highRiskPct: number | null = (() => {
    if (national.risk_distribution) {
      const critPct = national.risk_distribution.critical?.count_pct ?? 0
      const highP = national.risk_distribution.high?.count_pct ?? 0
      return critPct + highP
    }
    if (dashData?.overview?.high_risk_pct != null) {
      return dashData.overview.high_risk_pct
    }
    return null
  })()

  const totalValueMxn: number | null = dashData?.overview?.total_value_mxn ?? national.total_value_mxn ?? null
  const totalContracts: number | null = dashData?.overview?.total_contracts ?? national.total_contracts ?? null

  // Ground truth cases count — live from executive summary (audit 2026-05-12)
  const GT_CASES_COUNT = executiveSummary?.ground_truth?.cases ?? 1427

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page header */}
        <header className="mb-8 pb-5 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-risk-high animate-pulse" aria-hidden="true" />
            <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-risk-high">
              {t('heroKicker')}
            </p>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-text-primary">
            {t('corteTitle')}
          </h1>
          <p className="text-sm mt-2 text-text-secondary leading-relaxed">
            {t('heroIntro')}
          </p>
        </header>

        {/* Hero: national PHI score sledgehammer + tier headline */}
        <NationalHero
          national={national}
          totalValueMxn={totalValueMxn}
          totalContracts={totalContracts}
          gtCasesCount={GT_CASES_COUNT}
          lang={lang}
        />

        {/* Verdict block: three FT-bullet OECD benchmarks */}
        <VerdictBlock national={national} highRiskPct={highRiskPct} lang={lang} />

        {/* Sector register: deviation bars anchored on OECD 25% */}
        <SectorRegister sectors={sectors} lang={lang} />

        {/* Trend: compact annotated line */}
        <TrendSection />

        {/* Methodology link */}
        <MethodologyFooter />

        {/* Source footnote */}
        <p className="text-[10px] text-text-primary font-mono text-center pb-4">
          RUBLI v0.8.5 · COMPRANET 2002-2025 · 3.06M contracts · MX$9.88T validated
        </p>
      </div>
    </main>
  )
}

export default ReportCard
