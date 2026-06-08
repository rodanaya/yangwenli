/**
 * Sectors — 12 Sectors of Mexican Federal Procurement
 *
 * WHO view: "El Libro Mayor de la Exposición / The Exposure Ledger"
 * Single-page ranked exposure ledger. Lede strip + CumulativeRibbon +
 * ExposureLedger table + ∑ sum rule. No card grid, no beeswarm, no slope chart.
 *
 * WHAT view: category tree/list — untouched from previous version.
 */

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { categoriesApi } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN, formatNumber, cn } from '@/lib/utils'
import { sectorApi } from '@/api/client'
import {
  SECTOR_COLORS,
  SECTOR_TEXT_COLORS,
  RISK_COLORS,
  getRiskLevelFromScore,
  getSectorName,
} from '@/lib/constants'
import type { SectorStatistics } from '@/api/types'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { CategorySectorSwimlane } from '@/components/sectors/CategorySectorSwimlane'
import { CategoryCaptureDumbbell } from '@/components/sectors/CategoryCaptureDumbbell'
import { ExposureLedger, CumulativeRibbon } from '@/components/sectors/ExposureLedger'
import type { LedgerRow } from '@/components/sectors/ExposureLedger'

// ── helpers ───────────────────────────────────────────────────────────────────

// Locale-aware compact MXN. Delegates to canonical helper which renders
// ES as "3.1 billones MXN" / "X,XXX MDP" (Mexican media convention).
function formatSpend(value: number): string {
  return formatCompactMXN(value)
}

// ── CategoryTreeView ─────────────────────────────────────────────────────────
// Collapsible sector → category tree for the WHAT tab "Tree" mode.

interface CatSummary {
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
}

interface SectorRow {
  sector_code: string
  total_value_mxn: number
  total_contracts: number
  avg_risk_score: number
  sector_id: number
}

interface CategoryTreeViewProps {
  orderedSectors: string[]
  sectorGroups: Map<string, CatSummary[]>
  sectors: SectorRow[]
  lang: string
}

function CategoryTreeView({ orderedSectors, sectorGroups, sectors, lang }: CategoryTreeViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const isEs = lang === 'es'

  const toggle = (code: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const sectorMap = useMemo(() => {
    const m = new Map<string, SectorRow>()
    for (const s of sectors) m.set(s.sector_code, s)
    return m
  }, [sectors])

  const maxSpend = useMemo(() => {
    let max = 0
    for (const cats of sectorGroups.values()) {
      for (const c of cats) { if (c.total_value > max) max = c.total_value }
    }
    return max
  }, [sectorGroups])

  return (
    <div className="rounded-sm border border-border overflow-hidden">
      {orderedSectors.map((sectorCode) => {
        const cats = sectorGroups.get(sectorCode) ?? []
        const color = SECTOR_COLORS[sectorCode] ?? '#64748b'
        const sectorData = sectorMap.get(sectorCode)
        const isOpen = !collapsed.has(sectorCode)

        return (
          <div key={sectorCode}>
            {/* Sector header row */}
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-border hover:bg-background-elevated transition-colors text-left"
              style={{ borderLeft: `3px solid ${color}` }}
              onClick={() => toggle(sectorCode)}
              aria-expanded={isOpen}
              aria-label={`${getSectorName(sectorCode, isEs ? 'es' : 'en')} — ${isEs ? (isOpen ? 'contraer' : 'expandir') : (isOpen ? 'collapse' : 'expand')}`}
            >
              <span className="text-[11px] font-mono text-text-muted w-4 flex-shrink-0">
                {isOpen ? '▼' : '▶'}
              </span>
              <span
                className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] flex-1"
                style={{ color }}
              >
                {getSectorName(sectorCode, isEs ? 'es' : 'en')}
              </span>
              <span className="text-[10px] font-mono text-text-muted">
                {cats.length} {isEs ? 'cat.' : 'cat.'}
              </span>
              {sectorData && (
                <span className="text-[11px] font-mono tabular-nums text-text-secondary">
                  {formatSpend(sectorData.total_value_mxn)}
                </span>
              )}
            </button>

            {/* Category leaves */}
            {isOpen && cats.map((cat, idx) => {
              const riskLevel = getRiskLevelFromScore(cat.avg_risk)
              const sbDotClass =
                (cat.single_bid_pct ?? 0) > 25 ? 'bg-risk-critical'
                : (cat.single_bid_pct ?? 0) >= 15 ? 'bg-risk-high'
                : 'bg-zinc-400'
              const barWidth = maxSpend > 0 ? Math.min(100, (cat.total_value / maxSpend) * 100) : 0

              return (
                <div
                  key={cat.category_id}
                  className="flex items-center gap-3 pl-10 pr-4 py-2 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
                  style={{ borderLeft: `3px solid ${color}33` }}
                >
                  <span className="flex-shrink-0 w-5 font-mono text-[10px] text-text-muted tabular-nums">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <EntityIdentityChip
                      type="category"
                      id={cat.category_id}
                      name={isEs ? cat.name_es : cat.name_en}
                      size="sm"
                      sectorCode={cat.sector_code ?? null}
                      riskScore={cat.avg_risk ?? null}
                    />
                    {/* Spend bar */}
                    <div className="mt-1 h-px rounded-full bg-background-elevated overflow-hidden w-full max-w-[160px]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${barWidth}%`, backgroundColor: color, opacity: 0.5 }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-mono text-xs tabular-nums text-text-primary">
                      {formatSpend(cat.total_value)}
                    </div>
                  </div>
                  <div
                    className="flex-shrink-0 font-mono text-xs font-bold tabular-nums w-14 text-right"
                    style={{ color: RISK_COLORS[riskLevel] }}
                  >
                    {(cat.avg_risk * 100).toFixed(1)}%
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1 w-10 justify-end">
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${sbDotClass}`} aria-hidden="true" />
                    <span className="font-mono text-[10px] tabular-nums text-text-secondary">
                      {cat.direct_award_pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Sectors() {
  const { t, i18n } = useTranslation('sectors')

  // WHO / WHAT tab — URL-synced.
  const [searchParams, setSearchParams] = useSearchParams()
  const view: 'sectors' | 'categories' =
    searchParams.get('view') === 'categories' ? 'categories' : 'sectors'

  // cat-P3: quiet ?sort= for the categories list (no visible chooser — power users only).
  // Values: risk (default) | spend | name | capture
  type CatSortKey = 'risk' | 'spend' | 'name' | 'capture'
  const CAT_SORT_KEYS: ReadonlyArray<CatSortKey> = ['risk', 'spend', 'name', 'capture']
  const catSortParam = searchParams.get('sort') as CatSortKey | null
  const catSortKey: CatSortKey =
    view === 'categories' && catSortParam && CAT_SORT_KEYS.includes(catSortParam)
      ? catSortParam
      : 'risk'

  const setView = (v: 'sectors' | 'categories') => {
    const next = new URLSearchParams(searchParams)
    if (v === 'sectors') next.delete('view')
    else next.set('view', v)
    setSearchParams(next, { replace: true })
  }

  // Category list display: 'list' (ranked flat) or 'tree' (grouped by sector)
  const cviewParam = searchParams.get('cview') as 'list' | 'tree' | null
  const cview: 'list' | 'tree' = cviewParam === 'tree' ? 'tree' : 'list'
  const setCview = (v: 'list' | 'tree') => {
    const next = new URLSearchParams(searchParams)
    if (v === 'list') next.delete('cview')
    else next.set('cview', v)
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

  // WHO-view enrichment — capture (treemap top institutions) + trajectory (bundled
  // trends). Both bundled & cached server-side; only fetched on the WHO tab.
  const { data: treemapData } = useQuery({
    queryKey: ['sectors', 'treemap'],
    queryFn: () => sectorApi.getTreemap(),
    staleTime: 5 * 60 * 1000,
    enabled: view === 'sectors',
  })
  const { data: trendsBundle } = useQuery({
    queryKey: ['sectors', 'trends-bundle'],
    queryFn: () => sectorApi.getTrendsBundle(),
    staleTime: 5 * 60 * 1000,
    enabled: view === 'sectors',
  })

  const sectors: SectorStatistics[] = data?.data ?? []

  // For tree view: sectors ordered by spend (replaces the old `sorted` memo that
  // used SORT_KEYS — removed per spec §'What dies'). Only used by CategoryTreeView.
  const bySpend = useMemo(
    () => [...sectors].sort((a, b) => b.total_value_mxn - a.total_value_mxn),
    [sectors],
  )

  const totalValue = data?.total_value_mxn ?? 0
  const totalContracts = data?.total_contracts ?? 0

  // ── Language helper ──────────────────────────────────────────────────────────
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  // ── WHO view: build LedgerRows ────────────────────────────────────────────────
  // Typed to handle optional SLIPPY fields gracefully — if not present yet,
  // high_critical_value_mxn will be undefined (→ filtered out by != null check).
  const ledgerRows: LedgerRow[] = useMemo(() => {
    // Capture: sector_id → top institution (first of the treemap's top_institutions).
    const capBySector = new Map<number, { id: number; name: string; siglas?: string | null; sharePct: number }>()
    for (const ts of treemapData?.sectors ?? []) {
      const top = ts.top_institutions?.[0]
      if (top) {
        capBySector.set(ts.sector_id, {
          id: top.institution_id,
          name: top.name,
          siglas: top.siglas ?? null,
          sharePct: top.share_pct ?? 0,
        })
      }
    }
    const trajBySector = trendsBundle?.sectors ?? {}

    return sectors
      .filter((s) => (s as SectorStatistics & { high_critical_value_mxn?: number | null }).high_critical_value_mxn != null)
      .map((s) => {
        const ext = s as SectorStatistics & {
          high_critical_value_mxn?: number | null
          critical_value_mxn?: number | null
        }
        return {
          sectorId: s.sector_id,
          sectorCode: s.sector_code,
          name: t(s.sector_code) as string,
          varMxn: ext.high_critical_value_mxn!,
          criticalMxn: ext.critical_value_mxn ?? 0,
          totalMxn: s.total_value_mxn,
          daPct: s.direct_award_pct ?? 0,
          sbPct: s.single_bid_pct ?? 0,
          contracts: s.total_contracts,
          vendors: s.total_vendors ?? 0,
          avgRiskScore: s.avg_risk_score ?? 0,
          criticalCount: s.critical_risk_count ?? 0,
          topInstitution: capBySector.get(s.sector_id) ?? null,
          trajectory: trajBySector[String(s.sector_id)] ?? [],
        }
      })
      .sort((a, b) => b.varMxn - a.varMxn)
  }, [sectors, t, treemapData, trendsBundle])

  // ── WHO lede strip computations ───────────────────────────────────────────────
  const ledeStats = useMemo(() => {
    if (ledgerRows.length === 0) return null
    const top3 = ledgerRows.slice(0, 3)
    const sumVar = ledgerRows.reduce((acc, r) => acc + r.varMxn, 0)
    const sumTotal = ledgerRows.reduce((acc, r) => acc + r.totalMxn, 0)
    const top3Var = top3.reduce((acc, r) => acc + r.varMxn, 0)
    const top3Total = top3.reduce((acc, r) => acc + r.totalMxn, 0)
    const spendPct = sumTotal > 0 ? ((top3Total / sumTotal) * 100).toFixed(1) : '0'
    const varPct = sumVar > 0 ? ((top3Var / sumVar) * 100).toFixed(1) : '0'
    const valuePct = sumTotal > 0 ? ((sumVar / sumTotal) * 100).toFixed(1) : '0'

    // countPct: (high+critical counts) / total contracts across all sectors
    const sumHighCritCount = sectors.reduce(
      (acc, s) => acc + (s.high_risk_count ?? 0) + (s.critical_risk_count ?? 0),
      0,
    )
    const sumContracts = sectors.reduce((acc, s) => acc + s.total_contracts, 0)
    const countPct = sumContracts > 0 ? ((sumHighCritCount / sumContracts) * 100).toFixed(1) : '0'

    return { top3, sumVar, spendPct, varPct, valuePct, countPct }
  }, [ledgerRows, sectors])

  // Grand total model-flagged exposure for masthead anchor
  const totalVarMxn = useMemo(
    () => ledgerRows.reduce((acc, r) => acc + r.varMxn, 0),
    [ledgerRows],
  )

  // ── Title / subtitle text ─────────────────────────────────────────────────────
  const titleText =
    view === 'categories'
      ? t('page.titleCategories', { defaultValue: 'What Mexico Is Buying — by Category' })
      : lang === 'es'
        ? 'El Libro Mayor de la Exposición'
        : 'The Exposure Ledger'

  const subtitleText =
    view === 'categories'
      ? (totalValue > 0
          ? t('page.subtitleCategories', {
              totalValue: formatSpend(totalValue),
              defaultValue: '{{totalValue}} routed through 72 procurement categories',
            })
          : t('page.subtitleCategoriesFallback', {
              defaultValue: '72 procurement categories covering 99.7% of federal spend',
            }))
      : null // WHO subtitle paragraph is suppressed per spec §0

  return (
    <div className="min-h-screen">

      {/* ── MASTHEAD ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {/* folio-v1-P2: archival eyebrow */}
          <div
            className="mb-3 flex items-center gap-3"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
            }}
          >
            <span style={{ color: 'var(--color-accent)', fontStyle: 'italic', fontWeight: 500 }}>Folio·II</span>
            <span style={{ width: 22, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              {t('page.kicker', { defaultValue: 'Panorama sectorial' })}
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              COMPRANET 2002–2025
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              v0.8.5
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              {/* Headline — EB Garamond italic */}
              <h1
                className="text-text-primary"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  lineHeight: 0.98,
                  letterSpacing: '-0.012em',
                }}
              >
                {titleText}
              </h1>
            </div>

            {/* Right: WHO → single VaR anchor; WHAT → 3-stat cluster */}
            {!isLoading && (
              view === 'sectors' ? (
                <div className="text-right">
                  {totalVarMxn > 0 ? (
                    <>
                      <div
                        aria-label={
                          lang === 'es'
                            ? `${formatCompactMXN(totalVarMxn)} exposición señalada`
                            : `${formatCompactMXN(totalVarMxn)} model-flagged exposure`
                        }
                        style={{
                          fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                          fontStyle: 'italic',
                          fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 'clamp(1.25rem, 2vw, 1.5rem)',
                          lineHeight: 1,
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {formatCompactMXN(totalVarMxn)}
                      </div>
                      <div
                        style={{
                          fontFamily: '"IBM Plex Mono", monospace',
                          fontSize: '9px',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'var(--color-text-muted)',
                          marginTop: '4px',
                        }}
                      >
                        {lang === 'es'
                          ? 'exposición señalada · indicador de riesgo'
                          : 'model-flagged exposure · risk indicator'}
                      </div>
                    </>
                  ) : (
                    /* Backend field not live yet — show nothing in masthead anchor */
                    null
                  )}
                </div>
              ) : (
                /* WHAT view keeps original 3-stat cluster */
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
              )
            )}
          </div>

          {/* Subtitle paragraph: only for WHAT view; suppressed for WHO per spec */}
          {subtitleText && (
            <p
              className="mt-3 max-w-[68ch]"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontSize: '16px',
                lineHeight: 1.55,
                color: 'var(--color-text-secondary, var(--color-text-muted))',
                letterSpacing: '0.005em',
              }}
            >
              {subtitleText}
            </p>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">

        {/* ── WHO / WHAT axis toggle ─────────────────────────────────
            Sectors = WHO bought (12 agency taxonomy).
            Categories = WHAT was bought (72 Partida/CUCoP classifications).
            One page, two investigative lenses. */}
        <div className="mb-5 flex items-center gap-0 border-b border-border">
          <button
            type="button"
            onClick={() => setView('sectors')}
            className={cn(
              'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              view === 'sectors'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary',
            )}
            aria-pressed={view === 'sectors'}
          >
            <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mr-2">WHO</span>
            <span>{lang === 'es' ? 'Sectores' : 'Sectors'}</span>
            <span className="ml-2 font-mono text-[11px] text-text-muted">12</span>
          </button>
          <button
            type="button"
            onClick={() => setView('categories')}
            className={cn(
              'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              view === 'categories'
                ? 'border-text-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary',
            )}
            aria-pressed={view === 'categories'}
          >
            <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mr-2">WHAT</span>
            <span>{lang === 'es' ? 'Categorías' : 'Categories'}</span>
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
                  <div className="mb-3 pb-3 border-b border-border">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                      {lang === 'es' ? 'Hallazgo · Categorías' : 'Finding · Categories'}
                    </p>
                    <h2
                      className="text-text-primary leading-[1.1] mb-3"
                      style={{
                        fontFamily: 'var(--font-family-serif)',
                        fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                        fontWeight: 700,
                        letterSpacing: '-0.015em',
                      }}
                    >
                      {lang === 'es' ? (
                        <>
                          <span style={{ color: SECTOR_TEXT_COLORS[topByRisk.sector_code ?? 'otros'] ?? '#991b1b' }}>
                            {topByRisk.name_es}
                          </span>
                          {' '}es la categoría de mayor riesgo:{' '}
                          <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{(topByRisk.avg_risk * 100).toFixed(1)}%</span>
                          {' '}promedio.
                        </>
                      ) : (
                        <>
                          <span style={{ color: SECTOR_TEXT_COLORS[topByRisk.sector_code ?? 'otros'] ?? '#991b1b' }}>
                            {topByRisk.name_en}
                          </span>
                          {' '}is the highest-risk category:{' '}
                          <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{(topByRisk.avg_risk * 100).toFixed(1)}%</span>
                          {' '}average.
                        </>
                      )}
                    </h2>
                    <p className="text-sm text-text-secondary leading-[1.6] max-w-prose">
                      {lang === 'es' ? (
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
                  <div className="mb-3 pb-3 border-b border-border">
                    <div className="flex items-baseline gap-3 mb-2">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
                        {lang === 'es'
                          ? '§ Lo que el Estado compra · 12 carriles'
                          : '§ What the State Buys · 12 Lanes'}
                      </p>
                      <span className="text-[9px] text-text-muted/50 font-mono hidden sm:block">
                        {lang === 'es'
                          ? 'posición = riesgo · tamaño = gasto'
                          : 'position = risk · size = spend'}
                      </span>
                    </div>
                    <CategorySectorSwimlane categories={categoryData.data} />
                  </div>

                  {/* ── § 2 — CAPTURE DUMBBELL HERO ─────────────────────── */}
                  <div className="mb-3 pb-3 border-b border-border">
                    <div className="flex items-baseline gap-3 mb-2">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
                        {lang === 'es'
                          ? '§ La Brecha · #1 vs #2'
                          : '§ The Gap · #1 vs #2'}
                      </p>
                      <span className="text-[9px] text-text-muted/50 font-mono hidden sm:block">
                        {lang === 'es'
                          ? '12 categorías más concentradas'
                          : '12 most concentrated categories'}
                      </span>
                    </div>
                    <CategoryCaptureDumbbell categories={categoryData.data} />
                  </div>

                  {/* ── § 3 — CATALOG (List or Tree) ────────────────────── */}
                  <div className="mb-2 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
                      {lang === 'es'
                        ? `§ El Catálogo · ${categoryData.total} categorías`
                        : `§ The Catalog · ${categoryData.total} categories`}
                    </p>
                    <div className="flex items-center gap-2">
                      {/* Sort chips — visible UI for catSortKey */}
                      {cview === 'list' && (
                        <div className="flex items-center gap-1">
                          {([
                            { key: 'risk',    labelEs: 'Riesgo',   labelEn: 'Risk' },
                            { key: 'spend',   labelEs: 'Gasto',    labelEn: 'Spend' },
                            { key: 'capture', labelEs: 'Captura',  labelEn: 'Capture' },
                            { key: 'name',    labelEs: 'Nombre',   labelEn: 'Name' },
                          ] as const).map(({ key, labelEs, labelEn }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                const next = new URLSearchParams(searchParams)
                                if (key === 'risk') next.delete('sort')
                                else next.set('sort', key)
                                setSearchParams(next, { replace: true })
                              }}
                              className={cn(
                                'px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-[0.1em] rounded-sm border transition-colors',
                                catSortKey === key
                                  ? 'bg-text-primary text-background border-transparent'
                                  : 'text-text-muted border-border hover:text-text-secondary',
                              )}
                              aria-pressed={catSortKey === key}
                            >
                              {lang === 'es' ? labelEs : labelEn}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* List/Tree toggle */}
                      <div className="flex items-center gap-0 border border-border rounded overflow-hidden flex-shrink-0">
                        {(['list', 'tree'] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setCview(v)}
                            className={cn(
                              'px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.12em] transition-colors',
                              cview === v
                                ? 'bg-text-primary text-background'
                                : 'text-text-muted hover:text-text-secondary',
                            )}
                            aria-pressed={cview === v}
                          >
                            {v === 'list'
                              ? (lang === 'es' ? 'Lista' : 'List')
                              : (lang === 'es' ? 'Árbol' : 'Tree')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {(() => {
                    // cat-P3 D: sort rows per ?sort= param
                    const catRows = (() => {
                      if (catSortKey === 'spend') {
                        return [...categoryData.data].sort((a, b) => b.total_value - a.total_value)
                      }
                      if (catSortKey === 'name') {
                        return [...categoryData.data].sort((a, b) => {
                          const aName = lang === 'es' ? a.name_es : a.name_en
                          const bName = lang === 'es' ? b.name_es : b.name_en
                          return aName.localeCompare(bName)
                        })
                      }
                      if (catSortKey === 'capture') {
                        return [...categoryData.data].sort(
                          (a, b) => b.direct_award_pct - a.direct_award_pct,
                        )
                      }
                      return sortedByRisk
                    })()

                    // Tree view: categories grouped under collapsible sector headers
                    if (cview === 'tree') {
                      // Group categories by sector (null → 'otros')
                      const sectorGroups = new Map<string, typeof categoryData.data>()
                      for (const cat of sortedByRisk) {
                        const key = cat.sector_code ?? 'otros'
                        if (!sectorGroups.has(key)) sectorGroups.set(key, [])
                        sectorGroups.get(key)!.push(cat)
                      }
                      // Order sectors by their total spend (using bySpend memo)
                      const sectorOrder = bySpend.map((s) => s.sector_code)
                      const orderedSectors = sectorOrder.filter((sc) => sectorGroups.has(sc))
                      const othersGroup = sectorGroups.get('otros')
                      if (othersGroup && !orderedSectors.includes('otros')) orderedSectors.push('otros')

                      return (
                        <CategoryTreeView
                          orderedSectors={orderedSectors}
                          sectorGroups={sectorGroups}
                          sectors={bySpend}
                          lang={i18n.language}
                        />
                      )
                    }

                    return (
                      <div className="rounded-sm border border-border overflow-hidden">
                        {/* Column headers */}
                        <div className="flex items-center gap-4 px-5 py-1.5 bg-background-elevated border-b border-border text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted/50">
                          <span className="w-8 flex-shrink-0">#</span>
                          <span className="flex-1">{lang === 'es' ? 'Categoría' : 'Category'}</span>
                          <span className="flex-shrink-0 min-w-[90px] text-right">{lang === 'es' ? 'Gasto' : 'Spend'}</span>
                          <span className="flex-shrink-0 min-w-[80px] text-right">{lang === 'es' ? 'Riesgo' : 'Risk'}</span>
                          <span className="flex-shrink-0 min-w-[80px] text-right">DA%</span>
                        </div>
                        {catRows.map((cat, idx) => {
                          const riskLevel = getRiskLevelFromScore(cat.avg_risk)
                          const sectorColor =
                            cat.sector_code ? SECTOR_COLORS[cat.sector_code] ?? '#64748b' : '#64748b'

                          const prevSectorCode = idx > 0 ? catRows[idx - 1].sector_code : null
                          const sectorChanged = idx > 0 && prevSectorCode !== cat.sector_code

                          // cat-P3 A: single-bid traffic-light dot
                          const sbPct = cat.single_bid_pct ?? 0
                          const sbDotClass =
                            sbPct > 25
                              ? 'bg-risk-critical'
                              : sbPct >= 15
                                ? 'bg-amber-500'
                                : 'bg-zinc-400'

                          return (
                            <div key={cat.category_id}>
                              {/* Sector-change divider — sector colour at low opacity */}
                              {sectorChanged && (
                                <div
                                  className="border-t-2"
                                  style={{ borderColor: `${sectorColor}33` }}
                                  aria-hidden="true"
                                />
                              )}
                              <div
                                className="flex items-center gap-4 px-5 py-1.5 border-b border-border last:border-b-0 hover:bg-background-elevated transition-colors"
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
                                      name={lang === 'es' ? cat.name_es : cat.name_en}
                                      size="sm"
                                      sectorCode={cat.sector_code ?? null}
                                      riskScore={cat.avg_risk ?? null}
                                    />
                                    {/* Top vendor + institution — inline single row */}
                                    {(cat.top_vendor || cat.top_institution) && (
                                      <span className="flex items-center gap-1.5 text-[10px] text-text-muted/70 font-mono">
                                        {cat.top_vendor && (
                                          <EntityIdentityChip
                                            type="vendor"
                                            id={cat.top_vendor.id}
                                            name={cat.top_vendor.name}
                                            size="xs"
                                            hideIcon
                                            sectorCode={cat.sector_code ?? null}
                                          />
                                        )}
                                        {cat.top_vendor && cat.top_institution && (
                                          <span className="opacity-40">·</span>
                                        )}
                                        {cat.top_institution && (
                                          <EntityIdentityChip
                                            type="institution"
                                            id={cat.top_institution.id}
                                            name={
                                              cat.top_institution.name.length > 28
                                                ? cat.top_institution.name.slice(0, 28) + '…'
                                                : cat.top_institution.name
                                            }
                                            size="xs"
                                            hideIcon
                                          />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right min-w-[90px]">
                                  <div className="font-mono text-sm tabular-nums text-text-primary">
                                    {formatSpend(cat.total_value)}
                                  </div>
                                  <div className="text-[10px] font-mono text-text-muted mt-0.5">
                                    {formatNumber(cat.total_contracts)}{' '}
                                    {lang === 'es' ? 'cont.' : 'contracts'}
                                  </div>
                                </div>
                                <div className="flex-shrink-0 min-w-[90px]">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <div className="w-14 h-1 rounded-full bg-background-elevated overflow-hidden hidden sm:block">
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${Math.min(cat.avg_risk * 100 / 40 * 100, 100)}%`,
                                          background: RISK_COLORS[riskLevel],
                                          opacity: 0.8,
                                        }}
                                      />
                                    </div>
                                    <div
                                      className="font-mono text-[11px] font-bold tabular-nums text-right"
                                      style={{ color: RISK_COLORS[riskLevel] }}
                                    >
                                      {(cat.avg_risk * 100).toFixed(1)}%
                                    </div>
                                  </div>
                                </div>
                                {/* cat-P3 A: DA% with single-bid dot to its left */}
                                <div className="flex-shrink-0 flex items-center justify-end gap-1 min-w-[80px]">
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${sbDotClass}`}
                                    title={`${sbPct.toFixed(1)}% single-bid`}
                                    aria-label={`${sbPct.toFixed(1)}% ${lang === 'es' ? 'licitación con un solo postor' : 'single-bid'}`}
                                  />
                                  <div className="font-mono text-sm tabular-nums text-text-secondary">
                                    {cat.direct_award_pct.toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                  <p className="mt-4 text-[11px] text-text-muted leading-relaxed max-w-prose">
                    {lang === 'es'
                      ? <>Las categorías usan códigos Partida/CUCoP. La cobertura confiable es 2023–2025 (100% Partida en Estructura D); años anteriores pueden tener clasificación parcial. Haz clic en una categoría para ver contratos, proveedores e instituciones.</>
                      : <>Categories use Partida/CUCoP codes. Reliable coverage is 2023–2025 (100% Partida in Structure D); earlier years may have partial classification. Click any category to drill into contracts, vendors, and institutions.</>
                    }
                  </p>
                </>
              )
            })() : (
              <div className="py-16 text-center text-sm text-text-muted">
                {lang === 'es' ? 'No hay categorías disponibles.' : 'No categories available.'}
              </div>
            )}
          </>
        )}

        {/* ── SECTORS (WHO) VIEW — The Exposure Ledger ─────────────── */}
        {view === 'sectors' && (
          <>
            {/* ── Error state ─────────────────────────────────────────── */}
            {error && (
              <div
                role="alert"
                className="rounded-sm border border-risk-critical/30 bg-risk-critical/10 p-6 text-center text-sm text-risk-critical"
              >
                {t('page.failedToLoad')}
                <button
                  onClick={() => refetch()}
                  className="ml-3 underline opacity-70 hover:opacity-100"
                >
                  {lang === 'es' ? 'Reintentar' : 'Retry'}
                </button>
              </div>
            )}

            {/* ── Loading skeletons ────────────────────────────────────── */}
            {isLoading && (
              <div className="space-y-2 mt-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}

            {/* ── GUARD: backend field not live yet ────────────────────── */}
            {!isLoading && !error && sectors.length > 0 && ledgerRows.length === 0 && (
              <>
                {/* Lede strip skeleton */}
                <div className="mb-6 pb-6 border-b border-border">
                  <div className="grid lg:grid-cols-[3fr_2fr] gap-6">
                    <div className="space-y-3">
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-7 w-full max-w-lg" />
                      <Skeleton className="h-4 w-full max-w-prose" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <p
                  aria-live="polite"
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {lang === 'es'
                    ? 'Exposición señalada no disponible — actualizando datos del modelo.'
                    : 'Model-flagged exposure unavailable — model data updating.'}
                </p>
              </>
            )}

            {/* ── MAIN LEDGER CONTENT ──────────────────────────────────── */}
            {!isLoading && !error && ledgerRows.length > 0 && ledeStats && (
              <>
                {/* §1 — LEDE STRIP ──────────────────────────────────────── */}
                <section
                  aria-label={lang === 'es' ? 'Hallazgo de concentración' : 'Concentration finding'}
                  className="mb-6 pb-6 border-b border-border"
                >
                  <div className="grid lg:grid-cols-[3fr_2fr] gap-6 items-start">
                    {/* Left: kicker + H2 lede + deck */}
                    <div>
                      <p
                        className="mb-2"
                        style={{
                          fontFamily: '"IBM Plex Mono", monospace',
                          fontSize: '10px',
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          color: 'var(--color-text-muted)',
                          fontWeight: 700,
                        }}
                      >
                        {lang === 'es' ? 'HALLAZGO · CONCENTRACIÓN' : 'FINDING · CONCENTRATION'}
                      </p>

                      <h2
                        className="mb-3 text-text-primary"
                        style={{
                          fontFamily: 'var(--font-family-serif, "EB Garamond", Georgia, serif)',
                          fontWeight: 700,
                          fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                          lineHeight: 1.15,
                          letterSpacing: '-0.015em',
                        }}
                      >
                        {lang === 'es' ? (
                          <>
                            <span style={{ color: SECTOR_TEXT_COLORS[ledeStats.top3[0]?.sectorCode] ?? 'var(--color-text-primary)' }}>
                              {t(ledeStats.top3[0]?.sectorCode ?? 'salud') as string}
                            </span>
                            {', '}
                            <span style={{ color: SECTOR_TEXT_COLORS[ledeStats.top3[1]?.sectorCode] ?? 'var(--color-text-primary)' }}>
                              {t(ledeStats.top3[1]?.sectorCode ?? 'energia') as string}
                            </span>
                            {' e '}
                            <span style={{ color: SECTOR_TEXT_COLORS[ledeStats.top3[2]?.sectorCode] ?? 'var(--color-text-primary)' }}>
                              {t(ledeStats.top3[2]?.sectorCode ?? 'infraestructura') as string}
                            </span>
                            {' concentran el '}
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{ledeStats.spendPct}%</span>
                            {' del gasto y el '}
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{ledeStats.varPct}%</span>
                            {' de la exposición señalada por el modelo.'}
                          </>
                        ) : (
                          <>
                            <span style={{ color: SECTOR_TEXT_COLORS[ledeStats.top3[0]?.sectorCode] ?? 'var(--color-text-primary)' }}>
                              {t(ledeStats.top3[0]?.sectorCode ?? 'salud') as string}
                            </span>
                            {', '}
                            <span style={{ color: SECTOR_TEXT_COLORS[ledeStats.top3[1]?.sectorCode] ?? 'var(--color-text-primary)' }}>
                              {t(ledeStats.top3[1]?.sectorCode ?? 'energia') as string}
                            </span>
                            {' and '}
                            <span style={{ color: SECTOR_TEXT_COLORS[ledeStats.top3[2]?.sectorCode] ?? 'var(--color-text-primary)' }}>
                              {t(ledeStats.top3[2]?.sectorCode ?? 'infraestructura') as string}
                            </span>
                            {' hold '}
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{ledeStats.spendPct}%</span>
                            {' of spend and '}
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{ledeStats.varPct}%</span>
                            {' of model-flagged exposure.'}
                          </>
                        )}
                      </h2>

                      {/* Integrity stat / deck */}
                      <p
                        className="max-w-prose"
                        style={{
                          fontSize: '0.875rem',
                          lineHeight: 1.6,
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {lang === 'es'
                          ? `${ledeStats.valuePct}% del valor · ${ledeStats.countPct}% de los contratos — el modelo pondera anomalías de monto alto. Indicador de riesgo · no estimación de fraude.`
                          : `${ledeStats.valuePct}% of value · ${ledeStats.countPct}% of contracts — the model weights high-value anomalies. Risk indicator · not a fraud estimate.`}
                      </p>
                    </div>

                    {/* Right: CumulativeRibbon — proof-of-lede (centered vs the taller lede) */}
                    <div aria-hidden="true" className="lg:self-center">
                      <CumulativeRibbon rows={ledgerRows} lang={lang} />
                    </div>
                  </div>
                </section>

                {/* §2 + §3 + §4 — ExposureLedger (table + marginalia + sum rule) */}
                <ExposureLedger rows={ledgerRows} lang={lang} />
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}

export default Sectors
