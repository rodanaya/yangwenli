/**
 * Sectors — 12 Sectors of Mexican Federal Procurement
 *
 * Full-width dark-header overview page with responsive sector card grid.
 * Each card: sector color header strip, spend, contract count, risk badge,
 * vendor count, mini sparkline risk profile, and a link to the full sector profile.
 *
 * Sort: total spend (default) | avg risk score | contract count | name
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { categoriesApi } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { formatCompactMXN, formatNumber, cn } from '@/lib/utils'
import { sectorApi } from '@/api/client'
import {
  SECTOR_COLORS,
  RISK_COLORS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import type { SectorStatistics } from '@/api/types'
import { Building2 } from 'lucide-react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { MiniRiskField } from '@/components/charts/MiniRiskField'
import { FeaturedFinding } from '@/components/editorial/FeaturedFinding'
import { CompetitionSlopeChart } from '@/components/sectors/CompetitionSlopeChart'
import { CategorySectorSwimlane } from '@/components/sectors/CategorySectorSwimlane'

// ── helpers ───────────────────────────────────────────────────────────────────

type SortKey = 'total_value_mxn' | 'avg_risk_score' | 'total_contracts' | 'name'

function formatSpend(value: number): string {
  if (value >= 1_000_000_000_000) return `MX$${(value / 1_000_000_000_000).toFixed(1)}T`
  if (value >= 1_000_000_000) return `MX$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `MX$${(value / 1_000_000).toFixed(0)}M`
  return formatCompactMXN(value)
}

// RiskBar removed — MiniSparkline (below) renders the same 4-bucket distribution
// using the canonical MiniRiskField primitive. One source of truth.

// ── MiniSparkline ─────────────────────────────────────────────────────────────
// Renders the 4-bucket risk distribution as a tiny proportional column chart.
// The list endpoint does not carry per-year trend data, so we show the current
// risk profile (critical / high / medium / low) as a normalized mini-bar set.

interface MiniSparklineProps {
  sector: SectorStatistics
}

function MiniSparkline({ sector }: MiniSparklineProps) {
  const total = sector.total_contracts || 1
  return (
    <MiniRiskField
      criticalPct={((sector.critical_risk_count ?? 0) / total) * 100}
      highPct={((sector.high_risk_count ?? 0) / total) * 100}
      mediumPct={((sector.medium_risk_count ?? 0) / total) * 100}
      lowPct={((sector.low_risk_count ?? 0) / total) * 100}
      seed={sector.sector_id ?? 7}
      width={88}
      height={32}
    />
  )
}

// ── SectorCard ────────────────────────────────────────────────────────────────

interface SectorCardProps {
  sector: SectorStatistics
  rank: number
}

function SectorCard({ sector, rank }: SectorCardProps) {
  const { t } = useTranslation('sectors')
  const color = SECTOR_COLORS[sector.sector_code] ?? '#64748b'
  const riskLevel = getRiskLevelFromScore(sector.avg_risk_score)
  const highPlusCritical = (sector.high_risk_count ?? 0) + (sector.critical_risk_count ?? 0)
  const daPct = sector.direct_award_pct ?? 0
  const exceedsOECD = daPct > 25
  const sbPct = sector.single_bid_pct ?? 0
  // Bible §3.10: no green for low risk. Use zinc neutral for "clean".
  const sbDotColor = sbPct > 25 ? 'bg-red-500' : sbPct >= 15 ? 'bg-amber-500' : 'bg-zinc-400'

  return (
    <Link
      to={`/sectors/${sector.sector_id}`}
      className="surface-card group flex flex-col hover:bg-background-elevated hover:border-border transition-all duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${t(sector.sector_code)} — ${formatSpend(sector.total_value_mxn)}, ${riskLevel} risk`}
    >
      {/* Full-width color header strip */}
      <div
        className="h-1.5 w-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      <div className="px-4 pt-3 pb-3 flex flex-col gap-3 flex-1">
        {/* Header row: rank + sector name + risk badge + OECD badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-widest"
              style={{ color: `${color}99` }}
            >
              #{rank}
            </span>
            <h2 className="text-base font-bold text-text-primary leading-tight mt-0.5">
              {t(sector.sector_code)}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {/* OECD compliance badge — zinc neutral when compliant, red when exceeding */}
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${exceedsOECD ? 'bg-risk-critical/10 text-risk-critical border border-red-500/20' : 'bg-background-elevated text-text-secondary border border-border'}`}>
              OCDE {exceedsOECD ? '\u2717' : '\u2713'}
            </span>
            <RiskLevelPill level={riskLevel} score={sector.avg_risk_score} />
          </div>
        </div>

        {/* Spend + sparkline row */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-black font-mono tabular-nums text-text-primary leading-none">
              {formatSpend(sector.total_value_mxn)}
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {formatNumber(sector.total_contracts)} {t('card.contracts')}
            </p>
          </div>
          <MiniSparkline sector={sector} />
        </div>

        {/* Vendor count + DA pct row */}
        <div className="flex items-center justify-between gap-1 text-[11px] text-text-muted">
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span>
              {formatNumber(sector.total_vendors ?? 0)} {t('card.vendors')}
            </span>
          </div>
          <span className={`font-mono text-[10px] tabular-nums ${exceedsOECD ? 'text-risk-critical' : 'text-text-muted'}`}>
            {daPct.toFixed(0)}% {t('card.directAward')}
          </span>
        </div>

        {/* Avg risk + high+critical count */}
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mt-auto">
          <span>
            {highPlusCritical > 0
              ? `${formatNumber(highPlusCritical)} ${t('profile.highPlusCritical')}`
              : t('card.low')}
          </span>
          <span className="tabular-nums">{(sector.avg_risk_score * 100).toFixed(1)}% {t('profile.avgRisk')}</span>
        </div>

        {/* Single-bid signal */}
        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${sbDotColor}`} aria-hidden="true" />
          <span className="font-mono tabular-nums">{sbPct.toFixed(1)}%</span>
          <span className="text-text-muted">{t('card.singleBid')}</span>
        </div>
      </div>
    </Link>
  )
}

// ── SectorCardSkeleton ────────────────────────────────────────────────────────

function SectorCardSkeleton() {
  return (
    <div className="surface-card overflow-hidden">
      <div className="h-1.5 w-full bg-background-elevated" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="space-y-1">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-end gap-0.5 h-8">
            {[0,1,2,3].map((i) => (
              <Skeleton key={i} className="w-3" style={{ height: `${40 + i * 15}%` }} />
            ))}
          </div>
        </div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SORT_KEYS: ReadonlyArray<SortKey> = ['total_value_mxn', 'avg_risk_score', 'total_contracts', 'name']

export function Sectors() {
  const { t, i18n } = useTranslation('sectors')

  // WHO / WHAT tab + sort key — both URL-synced.
  // Default sort = total_value_mxn (the canonical "money first" view); power
  // users can override via ?sort=avg_risk_score|total_contracts|name.
  // Previously a 4-button radiogroup; the dropdown was decision paralysis for
  // 12 rows that read fine in any order — kept the URL knob, dropped the UI.
  const [searchParams, setSearchParams] = useSearchParams()
  const view: 'sectors' | 'categories' =
    searchParams.get('view') === 'categories' ? 'categories' : 'sectors'
  const sortParam = searchParams.get('sort') as SortKey | null
  const sortKey: SortKey = sortParam && SORT_KEYS.includes(sortParam) ? sortParam : 'total_value_mxn'
  const setView = (v: 'sectors' | 'categories') => {
    const next = new URLSearchParams(searchParams)
    if (v === 'sectors') next.delete('view')
    else next.set('view', v)
    setSearchParams(next, { replace: true })
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sectors', 'list'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })

  // Category summary — only fetched when the user is on the WHAT tab.
  const { data: categoryData, isLoading: categoryLoading } = useQuery<{
    data: Array<{
      category_id: number
      name_es: string
      name_en: string
      sector_id: number | null
      sector_code: string | null
      total_contracts: number
      total_value: number
      avg_risk: number
      direct_award_pct: number
      single_bid_pct: number
      top_vendor: { id: number; name: string } | null
      top_institution: { id: number; name: string } | null
    }>
    total: number
  }>({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
    enabled: view === 'categories',
  })

  const sectors = data?.data ?? []

  const sorted = useMemo(() => {
    if (sortKey === 'name') {
      return [...sectors].sort((a, b) =>
        (t(a.sector_code) as string).localeCompare(t(b.sector_code) as string)
      )
    }
    return [...sectors].sort((a, b) => {
      const aVal = a[sortKey] as number
      const bVal = b[sortKey] as number
      return bVal - aVal
    })
  }, [sectors, sortKey, t])

  const totalValue = data?.total_value_mxn ?? 0
  const totalContracts = data?.total_contracts ?? 0

  const subtitleText = totalValue > 0
    ? t('page.subtitle', {
        totalValue: formatSpend(totalValue),
        years: '23',
      })
    : t('page.subtitleFallback')

  return (
    <div className="min-h-screen">

      {/* Utility header — same pattern as /aria, /workspace, /cases.
          Sectores is an exploration surface (12-sector breakdown,
          comparison, drill-down) used by both readers and analysts.
          The magazine spread (grid background + 60px serif headline
          + italic subtitle) was eating the entire fold; condensed to
          one title row + dateline + 3 anchor stats. */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {t('page.title')}
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1.5">
                {t('page.kicker', { defaultValue: 'Panorama sectorial' })}
                <span className="mx-1.5" aria-hidden>·</span>
                COMPRANET 2002–2025
                <span className="mx-1.5" aria-hidden>·</span>
                v0.8.5
              </p>
            </div>
            {!isLoading && (
              <div className="flex items-baseline gap-5">
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">12</div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                    {t('statCards.sectorsTracked')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">
                    {formatSpend(totalValue)}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                    {t('statCards.totalSpend', { defaultValue: 'Total spend' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">
                    {formatNumber(totalContracts)}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                    {t('statCards.totalContracts')}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Subtitle — kept as a single muted line below for context. */}
          <p className="text-xs text-text-muted mt-2 max-w-2xl">
            {subtitleText}
          </p>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── WHO / WHAT axis toggle ─────────────────────────────────
            Sectors = WHO bought (12 agency taxonomy).
            Categories = WHAT was bought (72 Partida/CUCoP classifications).
            One page, two investigative lenses. */}
        <div className="mb-8 flex items-center gap-0 border-b border-border">
          <button
            type="button"
            onClick={() => setView('sectors')}
            className={cn(
              'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              view === 'sectors'
                ? 'border-[color:var(--color-text-primary)] text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary',
            )}
            aria-pressed={view === 'sectors'}
          >
            <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mr-2">WHO</span>
            <span>{i18n.language === 'es' ? 'Sectores' : 'Sectors'}</span>
            <span className="ml-2 font-mono text-[11px] text-text-muted">12</span>
          </button>
          <button
            type="button"
            onClick={() => setView('categories')}
            className={cn(
              'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              view === 'categories'
                ? 'border-[color:var(--color-text-primary)] text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary',
            )}
            aria-pressed={view === 'categories'}
          >
            <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mr-2">WHAT</span>
            <span>{i18n.language === 'es' ? 'Categorías' : 'Categories'}</span>
            <span className="ml-2 font-mono text-[11px] text-text-muted">
              {categoryData?.total ?? '—'}
            </span>
          </button>
        </div>

        {/* ── CATEGORIES VIEW — the WHAT axis ─────────────────────── */}
        {view === 'categories' && (
          <>
            {categoryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-96" />
                <Skeleton className="h-4 w-full max-w-2xl" />
                <div className="mt-6 space-y-1">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              </div>
            ) : categoryData && categoryData.data.length > 0 ? (() => {
              const topByRisk = [...categoryData.data].sort((a, b) => b.avg_risk - a.avg_risk)[0]
              const topByValue = [...categoryData.data].sort((a, b) => b.total_value - a.total_value)[0]
              const sortedByRisk = [...categoryData.data].sort((a, b) => b.avg_risk - a.avg_risk)
              return (
                <>
                  {/* Editorial lede */}
                  <div className="mb-8 pb-6 border-b border-border">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                      {i18n.language === 'es' ? 'Hallazgo · Categorías' : 'Finding · Categories'}
                    </p>
                    <h2
                      className="text-text-primary leading-[1.1] mb-3"
                      style={{
                        fontFamily: 'var(--font-family-serif)',
                        fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {i18n.language === 'es' ? (
                        <>
                          <span style={{ color: SECTOR_COLORS[topByRisk.sector_code ?? 'otros'] ?? '#dc2626' }}>
                            {topByRisk.name_es}
                          </span>
                          {' '}es la categoría de mayor riesgo:{' '}
                          <span className="font-mono tabular-nums">{(topByRisk.avg_risk * 100).toFixed(1)}%</span>
                          {' '}promedio.
                        </>
                      ) : (
                        <>
                          <span style={{ color: SECTOR_COLORS[topByRisk.sector_code ?? 'otros'] ?? '#dc2626' }}>
                            {topByRisk.name_en}
                          </span>
                          {' '}is the highest-risk category:{' '}
                          <span className="font-mono tabular-nums">{(topByRisk.avg_risk * 100).toFixed(1)}%</span>
                          {' '}average.
                        </>
                      )}
                    </h2>
                    <p className="text-base text-text-secondary leading-[1.6] max-w-prose">
                      {i18n.language === 'es' ? (
                        <>
                          Las categorías agrupan <strong className="text-text-primary">qué</strong> compró el gobierno — medicamentos, obra pública, software — independientemente de quién. Por volumen, <strong className="text-text-primary">{topByValue.name_es}</strong> lidera con <strong className="text-text-primary">{formatSpend(topByValue.total_value)}</strong> en contratos. Por riesgo, {topByRisk.name_es} encabeza la lista.
                        </>
                      ) : (
                        <>
                          Categories group <strong className="text-text-primary">what</strong> the government bought — medicines, civil works, software — regardless of who bought it. By volume, <strong className="text-text-primary">{topByValue.name_en}</strong> leads with <strong className="text-text-primary">{formatSpend(topByValue.total_value)}</strong> in contracts. By risk, {topByRisk.name_en} tops the list.
                        </>
                      )}
                    </p>
                  </div>

                  {/* ── § 1 — SWIMLANE HERO ───────────────────────────────── */}
                  <div className="mb-10 pb-8 border-b border-border">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                      {i18n.language === 'es'
                        ? 'Lo que el Estado compra · 12 carriles'
                        : 'What the State Buys · 12 Lanes'}
                    </p>
                    <h3
                      className="text-text-primary leading-[1.1] mb-2"
                      style={{
                        fontFamily: 'var(--font-family-serif)',
                        fontSize: 'clamp(1.15rem, 2.5vw, 1.65rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {i18n.language === 'es' ? 'Doce mercados, una hoja' : 'Twelve markets, one sheet'}
                    </h3>
                    <p className="text-sm text-text-muted leading-relaxed mb-5 max-w-prose">
                      {i18n.language === 'es'
                        ? 'Cada carril es un sector; cada punto, una categoría. La posición horizontal es el indicador de riesgo v0.8.5; el tamaño, el gasto. La línea cyan marca el umbral de riesgo alto.'
                        : 'Each lane is a sector; each dot, a category. Horizontal position is the v0.8.5 risk indicator; size encodes spend. The cyan line marks the high-risk threshold.'}
                    </p>
                    <CategorySectorSwimlane categories={categoryData.data} />
                  </div>

                  {/* ── § 3 — RANKED TABLE ───────────────────────────────── */}
                  <div className="rounded-sm border border-border overflow-hidden">
                    {sortedByRisk.map((cat, idx) => {
                      const riskLevel = getRiskLevelFromScore(cat.avg_risk)
                      const sectorColor = cat.sector_code ? SECTOR_COLORS[cat.sector_code] ?? '#64748b' : '#64748b'
                      return (
                        <div
                          key={cat.category_id}
                          className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-b-0 hover:bg-[color:var(--color-background-elevated)] transition-colors"
                          style={{ borderLeft: `3px solid ${sectorColor}` }}
                        >
                          <span className="flex-shrink-0 w-8 font-mono text-[11px] font-bold text-text-muted tabular-nums">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <EntityIdentityChip
                                type="category"
                                id={cat.category_id}
                                name={i18n.language === 'es' ? cat.name_es : cat.name_en}
                                size="sm"
                              />
                            </div>
                            {cat.top_vendor && (
                              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
                                <span>{i18n.language === 'es' ? 'Top:' : 'Top:'}</span>
                                <EntityIdentityChip type="vendor" id={cat.top_vendor.id} name={cat.top_vendor.name} size="xs" hideIcon />
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right min-w-[90px]">
                            <div className="font-mono text-sm tabular-nums text-text-primary">
                              {formatSpend(cat.total_value)}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted mt-0.5">
                              {formatNumber(cat.total_contracts)} {i18n.language === 'es' ? 'cont.' : 'contracts'}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right min-w-[80px]">
                            <div
                              className="font-mono text-sm font-bold tabular-nums"
                              style={{ color: RISK_COLORS[riskLevel] }}
                            >
                              {(cat.avg_risk * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right min-w-[70px]">
                            <div className="font-mono text-sm tabular-nums text-text-secondary">
                              {cat.direct_award_pct.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-4 text-[11px] text-text-muted leading-relaxed max-w-prose">
                    {i18n.language === 'es'
                      ? <>Las categorías usan códigos Partida/CUCoP. La cobertura confiable es 2023–2025 (100% Partida en Estructura D); años anteriores pueden tener clasificación parcial. Haz clic en una categoría para ver contratos, proveedores e instituciones.</>
                      : <>Categories use Partida/CUCoP codes. Reliable coverage is 2023–2025 (100% Partida in Structure D); earlier years may have partial classification. Click any category to drill into contracts, vendors, and institutions.</>
                    }
                  </p>
                </>
              )
            })() : (
              <div className="py-16 text-center text-sm text-text-muted">
                {i18n.language === 'es' ? 'No hay categorías disponibles.' : 'No categories available.'}
              </div>
            )}
          </>
        )}

        {/* ── SECTORS VIEW — the WHO axis (original content) ─────── */}
        {view === 'sectors' && (<>

        {/* ── HERO FINDING — editorial lede ─────────────────────────── */}
        {!isLoading && sectors.length > 0 && (() => {
          const topRiskSector = [...sectors].sort((a, b) => b.avg_risk_score - a.avg_risk_score)[0]
          const exceedingOECD = sectors.filter((s) => (s.direct_award_pct ?? 0) > 25).length
          const topSectorColor = SECTOR_COLORS[topRiskSector.sector_code] ?? '#dc2626'
          const topSectorName = t(topRiskSector.sector_code) as string
          const topRiskPct = (topRiskSector.avg_risk_score * 100).toFixed(1)
          const topDaPct = (topRiskSector.direct_award_pct ?? 0).toFixed(0)
          // Agriculture's high average-risk score is driven heavily by the
          // Segalmex ground-truth case (LICONSA, DICONSA, 6,326 contracts
          // labeled positive). Reporters landing here would otherwise read
          // "Agriculture is the most corrupt sector" as a standalone finding
          // — which the investigative-editor review flagged as a claim the
          // platform cannot defend. See memory/agriculture-health-risk-analysis.md.
          const isAgricultureArtifact = topRiskSector.sector_code === 'agricultura'
          return (
            <>
              <FeaturedFinding
                kicker={t('featured.kicker', { sector: topSectorName.toUpperCase() })}
                accent={topSectorColor}
                headline={
                  <>
                    <span style={{ color: topSectorColor }}>{topSectorName}</span>
                    {' '}{t('featured.leadsRisk')}{' '}
                    <span className="font-mono tabular-nums">{topRiskPct}%</span>
                    {' '}{t('featured.avgRiskSuffix')}
                  </>
                }
                deck={t('featured.deck', { exceedingOECD, topRiskPct, topDaPct })}
                meta={[
                  { label: t('featured.meta.leaderRisk'), value: `${topRiskPct}%`, accent: true },
                  { label: t('featured.meta.totalValue'), value: formatSpend(totalValue) },
                  { label: t('featured.meta.contracts'), value: formatNumber(totalContracts) },
                  { label: t('featured.meta.sectorsBeyond'), value: `${exceedingOECD} / 12` },
                ]}
              />
              {isAgricultureArtifact && (
                <div className="mb-8 -mt-4 pl-5 pr-4 py-3 rounded-r-sm border-l-4 border-[color:var(--color-border-hover)] bg-[color:var(--color-background-card)]">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
                    {i18n.language === 'es' ? 'Advertencia de artefacto' : 'Artifact caveat'}
                  </p>
                  <p className="text-[13px] leading-relaxed text-text-secondary max-w-prose">
                    {i18n.language === 'es'
                      ? <>El puntaje promedio de Agricultura está inflado por un solo caso de verdad fundamental: <strong className="text-text-primary">Segalmex (2019–2022)</strong>, donde LICONSA y DICONSA etiquetaron 6,326 contratos como positivos. Esto distorsiona el puntaje sectorial. <strong className="text-text-primary">Agricultura no es necesariamente "el sector más corrupto"</strong> — es el sector cuyos casos documentados dominan el conjunto de entrenamiento.</>
                      : <>Agriculture's average score is inflated by a single ground-truth case: <strong className="text-text-primary">Segalmex (2019–2022)</strong>, where LICONSA and DICONSA labeled 6,326 contracts as positives. This distorts the sector-level score. <strong className="text-text-primary">Agriculture is not necessarily "the most corrupt sector"</strong> — it is the sector whose documented cases dominate the training set.</>
                    }
                  </p>
                </div>
              )}
            </>
          )
        })()}

        {/* P1 SUBTRACTION (2026-05-04): SectorSmallMultiples,
            OECDCompetitionDotMatrix, SectorRiskTrendPanel, RiskRankingStrip
            removed. P2-P4 will reintroduce one slope chart, one treemap,
            one beeswarm. See docs/SECTORS_REDESIGN_PLAN.md. */}

        {/* ── § 3 HERO 2: Competition Slope Chart ──────────────────────────
            docs/SECTORS_REDESIGN_PLAN.md §5 HERO 2.
            Replaces SectorSmallMultiples + OECDCompetitionDotMatrix +
            SectorRiskTrendPanel — three charts → one.
            Data: sectorApi.getTrends(id) returns direct_award_pct per year. */}
        <section
          aria-labelledby="slope-heading"
          className="mb-10 pb-8 border-b border-border"
        >
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
            {i18n.language === 'es'
              ? 'La Competencia · Una década cruzando el techo OCDE'
              : 'Competition · A decade past the OECD ceiling'}
          </p>
          <h2
            id="slope-heading"
            className="text-text-primary leading-[1.1] mb-2"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            {i18n.language === 'es'
              ? 'Diez años cruzando el techo OCDE'
              : 'Ten years past the OECD ceiling'}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed max-w-2xl mb-6">
            {i18n.language === 'es'
              ? 'Adjudicación directa por sector, 2015–2025. La línea de puntos cyan es el umbral OCDE del 25%. Los sectores que terminan por encima del umbral están etiquetados en su color; los que se mantienen por debajo se agrupan en gris.'
              : 'Direct-award % by sector, 2015–2025. The cyan dashed line is the OECD 25% ceiling. Sectors ending above the threshold are labeled in their sector color; those that stay below are grouped gray.'}
          </p>
          <CompetitionSlopeChart />
        </section>

        {/* Quiet count row — sort dropdown removed; ?sort= URL param controls order */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-text-secondary">
            {isLoading ? (
              <Skeleton className="h-4 w-32 inline-block" />
            ) : (
              <span>
                {sorted.length} {t('statCards.sectorsTracked').toLowerCase()}
              </span>
            )}
          </p>
          <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {t('page.sortBy')}: {t(`page.sort${sortKey === 'total_value_mxn' ? 'Value' : sortKey === 'avg_risk_score' ? 'Risk' : sortKey === 'total_contracts' ? 'Contracts' : 'Name'}`)}
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="rounded-sm border border-red-500/30 bg-risk-critical/10 p-6 text-center text-sm text-risk-critical"
          >
            {t('page.failedToLoad')}
            <button
              onClick={() => refetch()}
              className="ml-3 underline opacity-70 hover:opacity-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Grid */}
        {!error && (
          <>
            {!isLoading && sorted.length === 0 && (
              <div className="rounded-sm border border-border/30 bg-background-elevated/20 p-10 text-center text-sm text-text-muted">
                {t('emptyState.noFoundDesc', { name: t('page.title', 'sectors') })}
              </div>
            )}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              role="list"
              aria-label={t('page.title')}
            >
              {isLoading
                ? Array.from({ length: 12 }).map((_, i) => (
                    <div role="listitem" key={i}>
                      <SectorCardSkeleton />
                    </div>
                  ))
                : sorted.map((sector, i) => (
                    <div role="listitem" key={sector.sector_id}>
                      <SectorCard sector={sector} rank={i + 1} />
                    </div>
                  ))}
            </div>
          </>
        )}

        {/* P1 SUBTRACTION (2026-05-04): SectorModelCoefficients and
            SectorConcentrationChart moved to /sectors/:id (per-sector
            analytical views shouldn't crowd the index). Backend endpoint
            /sectors/model/coefficients was also returning 500s on this page;
            removing the call fixes that error too. */}

        {/* Model note footnote */}
        {!isLoading && !error && (
          <p className="mt-8 text-[11px] text-text-muted leading-relaxed max-w-4xl">
            <strong className="text-text-muted">Note:</strong> {t('page.modelNote')}
          </p>
        )}
        </>)}
      </main>
    </div>
  )
}

export default Sectors
