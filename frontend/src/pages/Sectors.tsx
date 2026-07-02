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
import { formatCompactMXN, formatDualCurrency, formatNumber, cn } from '@/lib/utils'
import { sectorApi } from '@/api/client'
import {
  SECTOR_COLORS,
  RISK_COLORS,
  getRiskLevelFromScore,
  getSectorName,
} from '@/lib/constants'
import type { SectorStatistics } from '@/api/types'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { ArqueoMesa } from '@/components/sectors/ArqueoMesa'
import { ArqueoMesaCategorias } from '@/components/sectors/ArqueoMesaCategorias'
import { FeDeArqueo } from '@/components/sectors/FeDeArqueo'
import { CategoryCaptureDumbbell } from '@/components/sectors/CategoryCaptureDumbbell'
import { ExposureLedger } from '@/components/sectors/ExposureLedger'
import type { LedgerRow } from '@/components/sectors/ExposureLedger'
import { ConfoundPlate } from '@/components/sectors/ConfoundPlate'
import { SelfCaptureBand } from '@/components/sectors/SelfCaptureBand'
import { ownSpendShare } from '@/components/sectors/confoundScales'
import type { PlateLens } from '@/components/sectors/confoundScales'
import { usePublishSiblingList, useOriginRowFlash } from '@/lib/nav/wayfinding'

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

  // Confounded Ledger sort lens — URL-synced (?lens=intensity); shared by the
  // §B plate's FLIP reorder and the §D register's sortable headers.
  const lens: PlateLens = searchParams.get('lens') === 'intensity' ? 'intensity' : 'var'
  const setLens = (l: PlateLens) => {
    const next = new URLSearchParams(searchParams)
    if (l === 'var') next.delete('lens')
    else next.set('lens', l)
    setSearchParams(next, { replace: true })
  }

  // Registry display mode — the Plate and the Register render the SAME
  // 12-sector data; show one at a time behind a toggle instead of stacking
  // both. Default 'plate' (the innovative visual — the page centrepiece);
  // 'register' = the legible table. URL-synced (?reg=register). Lens
  // (VaR/Intensity) stays shared across views.
  const regView: 'register' | 'plate' =
    searchParams.get('reg') === 'register' ? 'register' : 'plate'
  const setRegView = (v: 'register' | 'plate') => {
    const next = new URLSearchParams(searchParams)
    if (v === 'plate') next.delete('reg')
    else next.set('reg', v)
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
          highCount: s.high_risk_count ?? 0,
          topInstitution: capBySector.get(s.sector_id) ?? null,
          trajectory: trajBySector[String(s.sector_id)] ?? [],
        }
      })
      .sort((a, b) => b.varMxn - a.varMxn)
  }, [sectors, t, treemapData, trendsBundle])

  // ── Wayfinding (El Hilo P1+) — publish the exposure ledger as the sector
  // sibling list (Prev/Next stepper honours this VaR order); flash the origin
  // row on browser-back.
  const sectorSearch = searchParams.toString()
  usePublishSiblingList(
    ledgerRows.length
      ? {
          kind: 'sector',
          items: ledgerRows.map((r) => ({ id: String(r.sectorId), label: r.name })),
          backTo: sectorSearch ? `/sectors?${sectorSearch}` : '/sectors',
          backLabel: lang === 'es' ? 'sectores' : 'sectors',
        }
      : null,
  )
  useOriginRowFlash('sector', ledgerRows.length > 0)

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

    // Intensity leader — the §A headline subject (computed argmax of
    // own-spend share; today Hacienda, but never hardcoded).
    const intLeader = ledgerRows.reduce(
      (best, r) => (ownSpendShare(r) > ownSpendShare(best) ? r : best),
      ledgerRows[0],
    )
    const intLeaderPct = (ownSpendShare(intLeader) * 100).toFixed(0)

    // Saturation minimum — the §A counter-case (computed argmin of own-spend
    // share; today Infraestructura). Big money, lowest saturation, worst
    // single-bid → names the inverse confound. moneyRank = position in the
    // VaR-ordered ledger.
    const minSat = ledgerRows.reduce(
      (lo, r) => (ownSpendShare(r) < ownSpendShare(lo) ? r : lo),
      ledgerRows[0],
    )
    const minSatMoneyRank = ledgerRows.findIndex((r) => r.sectorId === minSat.sectorId) + 1
    const minSatSatPct = (ownSpendShare(minSat) * 100).toFixed(0)
    const minSatSbPct = minSat.sbPct.toFixed(0)

    return {
      top3, sumVar, sumTotal, sumContracts, spendPct, varPct, valuePct, countPct,
      intLeader, intLeaderPct, minSat, minSatMoneyRank, minSatSatPct, minSatSbPct,
    }
  }, [ledgerRows, sectors])

  // Grand total model-flagged exposure for masthead anchor
  const totalVarMxn = useMemo(
    () => ledgerRows.reduce((acc, r) => acc + r.varMxn, 0),
    [ledgerRows],
  )

  // ── Per-view deck (masthead subtitle) — «El Arqueo» reinvention ────────────────
  // The headline is now constant («El Arqueo»); each lens carries its own deck.
  const deckText =
    view === 'categories'
      ? (lang === 'es'
          ? 'Setenta y dos categorías de gasto — qué compró el Estado, y dónde arde el catálogo.'
          : 'Seventy-two spending categories — what the State bought, and where the catalog runs hot.')
      : (lang === 'es'
          ? 'Doce sectores, un solo corte. Cuánto dinero observa el modelo en cada uno — y qué parte del gasto propio de cada quien está en la mesa.'
          : 'Twelve sectors, one count. How much money the model flags in each — and how much of each one’s own spend is on the table.')

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
              {lang === 'es' ? 'Arqueo de caja federal' : 'Federal cash count'}
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              COMPRANET 2002–2025
              <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
              v0.8.5
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              {/* Headline — EB Garamond italic; constant «El Arqueo» with one ochre fragment */}
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
                {lang === 'es' ? (
                  <>El Arqueo: <span style={{ color: 'var(--color-accent)' }}>nueve billones</span> sobre la mesa.</>
                ) : (
                  <>The Cash Count: <span style={{ color: 'var(--color-accent)' }}>nine trillion pesos</span> on the table.</>
                )}
              </h1>
            </div>

            {/* Right: unified monto-observado anchor (both views); dual currency
                per the hero-surface convention. Guarded on the VaR field. */}
            {!isLoading && totalVarMxn > 0 && (
              <div className="text-right">
                <div
                  aria-label={
                    lang === 'es'
                      ? `${formatDualCurrency(totalVarMxn)} monto observado`
                      : `${formatDualCurrency(totalVarMxn)} flagged amount`
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
                  {formatDualCurrency(totalVarMxn)}
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
                    ? 'monto observado · indicador de riesgo'
                    : 'flagged amount · risk indicator'}
                </div>
              </div>
            )}
          </div>

          {/* Deck paragraph — per-view, under the constant «El Arqueo» headline */}
          {deckText && (
            <p
              className="mt-3"
              style={{
                fontFamily: '"EB Garamond", Georgia, serif',
                fontSize: '16px',
                lineHeight: 1.55,
                color: 'var(--color-text-secondary, var(--color-text-muted))',
                letterSpacing: '0.005em',
                maxWidth: '58ch',
              }}
            >
              {deckText}
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
                      {lang === 'es' ? 'Hallazgo · El Catálogo' : 'Finding · The Catalog'}
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
                          <span style={{ color: 'var(--color-accent)' }}>
                            {topByRisk.name_es}
                          </span>
                          {' '}es la categoría más caliente del catálogo —{' '}
                          <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{(topByRisk.avg_risk * 100).toFixed(1)}%</span>
                          {' '}de riesgo promedio — y de las más chicas por valor: {formatSpend(topByRisk.total_value)}.
                        </>
                      ) : (
                        <>
                          <span style={{ color: 'var(--color-accent)' }}>
                            {topByRisk.name_en}
                          </span>
                          {' '}runs hottest in the catalog —{' '}
                          <span style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{(topByRisk.avg_risk * 100).toFixed(1)}%</span>
                          {' '}mean risk — and among the smaller by value: {formatSpend(topByRisk.total_value)}.
                        </>
                      )}
                    </h2>
                    <p className="text-sm text-text-secondary leading-[1.6]">
                      {lang === 'es' ? (
                        <>
                          Las categorías agrupan <strong className="text-text-primary">qué</strong> compró el Estado — medicamentos, obra, seguros — sin importar quién. Por volumen manda <strong className="text-text-primary">{topByValue.name_es}</strong> ({formatSpend(topByValue.total_value)}, {(topByValue.avg_risk * 100).toFixed(1)}% de riesgo — debajo de la regla). El catálogo repite el confundido de los sectores: lo grande casi nunca es lo más caliente.
                        </>
                      ) : (
                        <>
                          Categories group <strong className="text-text-primary">what</strong> the State bought — medicines, works, insurance — regardless of who. By volume, <strong className="text-text-primary">{topByValue.name_en}</strong> leads ({formatSpend(topByValue.total_value)} at {(topByValue.avg_risk * 100).toFixed(1)}% risk — under the rule). The catalog repeats the sector confound: the big is almost never the hottest.
                        </>
                      )}
                    </p>
                  </div>

                  {/* ── § 1 — LA MESA · POR CATEGORÍA (Marimekko hero; self-labels) ── */}
                  <div className="mb-3 pb-3 border-b border-border">
                    <ArqueoMesaCategorias categories={categoryData.data} lang={lang} />
                  </div>

                  {/* ── § 2 — CAPTURE DUMBBELL HERO ─────────────────────── */}
                  <div className="mb-3 pb-3 border-b border-border">
                    <div className="flex items-baseline gap-3 mb-2">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
                        {lang === 'es'
                          ? '§ La captura · cuánto controla el líder de cada categoría'
                          : '§ The capture · how much the leader of each category holds'}
                      </p>
                      <span className="text-[9px] text-text-muted/50 font-mono hidden sm:block">
                        {lang === 'es'
                          ? 'las 12 categorías de mayor gasto'
                          : 'the 12 largest categories by spend'}
                      </span>
                    </div>
                    <CategoryCaptureDumbbell categories={categoryData.data} />
                  </div>

                  {/* ── § 3 — CATALOG (List or Tree) ────────────────────── */}
                  <div className="mb-2 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted">
                      {lang === 'es'
                        ? `§ El Catálogo · ${categoryData.total} categorías, asiento por asiento`
                        : `§ The Catalog · ${categoryData.total} categories, entry by entry`}
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
                                ? 'bg-risk-high'
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
                  <div className="mt-6">
                    <FeDeArqueo view="categorias" lang={lang} totals={null} />
                  </div>
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
                {/* La Mesa del Arqueo hero slot */}
                <Skeleton className="h-[360px] w-full mb-6" />
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

            {/* ── MAIN LEDGER CONTENT — the Confounded Ledger ──────────── */}
            {!isLoading && !error && ledgerRows.length > 0 && ledeStats && (
              <>
                {/* Act I — LA MESA DEL ARQUEO (Marimekko hero; self-labels kicker + headline) */}
                <div className="mb-6 pb-6 border-b border-border">
                  <ArqueoMesa rows={ledgerRows} lang={lang} />
                </div>

                {/* §A — THE CONFOUND LEDE (full-width; the ribbon died) ──── */}
                <section
                  aria-label={lang === 'es' ? 'Hallazgo: el confundido' : 'Finding: the confound'}
                  className="mb-6 pb-6 border-b border-border"
                >
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
                    {lang === 'es' ? 'HALLAZGO · EL CONFUNDIDO' : 'FINDING · THE CONFOUND'}
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
                        {'En un arqueo caben dos preguntas por gaveta. El monto corona a '}
                        <span style={{ color: 'var(--color-text-primary)' }}>
                          {ledeStats.top3[0].name}
                        </span>
                        {'; la saturación corona a '}
                        <span style={{ color: 'var(--color-accent)' }}>
                          {ledeStats.intLeader.name}
                        </span>
                        {' — '}
                        <span style={{ color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
                          {ledeStats.intLeaderPct}%
                        </span>
                        {' de su propio gasto observado, con '}
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {ledeStats.intLeader.daPct.toFixed(0)}%
                        </span>
                        {' adjudicado sin competencia.'}
                      </>
                    ) : (
                      <>
                        {'A cash count asks two questions of every drawer. The amount crowns '}
                        <span style={{ color: 'var(--color-text-primary)' }}>
                          {ledeStats.top3[0].name}
                        </span>
                        {'; saturation crowns '}
                        <span style={{ color: 'var(--color-accent)' }}>
                          {ledeStats.intLeader.name}
                        </span>
                        {' — '}
                        <span style={{ color: 'var(--color-accent)', fontVariantNumeric: 'tabular-nums' }}>
                          {ledeStats.intLeaderPct}%
                        </span>
                        {' of its own spend flagged, '}
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {ledeStats.intLeader.daPct.toFixed(0)}%
                        </span>
                        {' of it awarded without competition.'}
                      </>
                    )}
                  </h2>

                  {/* "Two questions" deck — the reading instruction for the plate */}
                  <p
                    style={{
                      fontFamily: '"EB Garamond", Georgia, serif',
                      fontSize: '15px',
                      lineHeight: 1.55,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {lang === 'es' ? (
                      <>
                        <strong className="text-text-primary">¿Cuántos pesos?</strong>
                        {' ordena por monto observado — la escala del dinero. '}
                        <strong className="text-text-primary">¿Qué tan saturado?</strong>
                        {' ordena por la parte del gasto propio — la escala de la casa. La Lámina dibuja ambas en una sola línea; el Registro las audita columna por columna.'}
                      </>
                    ) : (
                      <>
                        <strong className="text-text-primary">How many pesos?</strong>
                        {' ranks by flagged amount — the money scale. '}
                        <strong className="text-text-primary">How saturated?</strong>
                        {' ranks by share of own spend — the house scale. The Plate draws both on one line; the Register audits them column by column.'}
                      </>
                    )}
                  </p>

                  {/* The concentration finding survives as one mono line */}
                  <p
                    className="mt-2.5 font-mono tabular-nums"
                    style={{ fontSize: '10px', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}
                  >
                    {lang === 'es'
                      ? `top 3 = ${ledeStats.varPct}% del monto observado · ${ledeStats.minSat.name}: ${ledeStats.minSatMoneyRank}.º en dinero, la saturación más baja (${ledeStats.minSatSatPct}%) y ${ledeStats.minSatSbPct}% a licitación de un solo postor · indicador de riesgo, no estimación de fraude`
                      : `top 3 = ${ledeStats.varPct}% of flagged amount · ${ledeStats.minSat.name}: ${ledeStats.minSatMoneyRank}${ledeStats.minSatMoneyRank === 1 ? 'st' : ledeStats.minSatMoneyRank === 2 ? 'nd' : ledeStats.minSatMoneyRank === 3 ? 'rd' : 'th'} in money, lowest saturation (${ledeStats.minSatSatPct}%) and ${ledeStats.minSatSbPct}% single-bid · risk indicator, not a fraud estimate`}
                  </p>
                </section>

                {/* §B+§D — THE REGISTRY (one section, two views) ───────────
                    The Confound Plate (the innovative visual) and the Audited
                    Register (table) are two renderings of the SAME 12-sector
                    data sharing the same VaR/Intensity lens. The Plate is the
                    page centrepiece — kept first, right under the lede, as the
                    DEFAULT view; the table is a toggle-away view. Don't stack. */}
                <div className="mb-6" aria-label={lang === 'es' ? 'El Registro del Arqueo' : 'The Count Register'}>
                  <div className="mb-2 flex items-center justify-between gap-3 flex-wrap">
                    <p
                      style={{
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-muted)',
                        fontWeight: 700,
                      }}
                    >
                      {lang === 'es' ? '§ El Registro del Arqueo · dos vistas, un orden' : '§ The Count Register · two views, one order'}
                    </p>
                    {/* Plate / Register view toggle (Plate default; lens shared) */}
                    <div
                      className="flex items-center gap-0 border border-border rounded overflow-hidden flex-shrink-0"
                      role="group"
                      aria-label={lang === 'es' ? 'Cambiar vista del registro' : 'Switch registry view'}
                    >
                      {([
                        { key: 'plate', es: 'Lámina', en: 'Plate' },
                        { key: 'register', es: 'Registro', en: 'Register' },
                      ] as const).map(({ key, es, en }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setRegView(key)}
                          className={cn(
                            'px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.12em] transition-colors',
                            regView === key
                              ? 'bg-text-primary text-background'
                              : 'text-text-muted hover:text-text-secondary',
                          )}
                          aria-pressed={regView === key}
                        >
                          {lang === 'es' ? es : en}
                        </button>
                      ))}
                    </div>
                  </div>

                  {regView === 'plate' ? (
                    <ConfoundPlate rows={ledgerRows} lang={lang} lens={lens} onLensChange={setLens} />
                  ) : (
                    <ExposureLedger rows={ledgerRows} lang={lang} lens={lens} onLensChange={setLens} />
                  )}
                </div>

                {/* §C — SELF-CAPTURE HONOR ROLL (intensity highlight) ─────
                    The 3 sectors whose intensity rank most exceeds their VaR
                    rank — the plate's thesis, named. */}
                <SelfCaptureBand rows={ledgerRows} lang={lang} />

                {/* Act V — FE DE ARQUEO (closing auditor's note) */}
                <FeDeArqueo
                  view="sectores"
                  lang={lang}
                  totals={{
                    totalMxn: ledeStats.sumTotal,
                    varMxn: totalVarMxn,
                    contracts: ledeStats.sumContracts,
                    flaggedSharePct: Number(ledeStats.valuePct),
                    countPct: Number(ledeStats.countPct),
                  }}
                />
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}

export default Sectors
