/**
 * Institution Transparency League
 *
 * League-table style ranking of 2,563 scored institutions by their
 * overall transparency score (0-100) derived from 5 pillars:
 *   Openness, Price, Vendors, Process, External Alerts
 *
 * 5-tier system (i18n-aware):
 *   Excelente/Excellent, Satisfactorio/Satisfactory, Regular/Adequate,
 *   Deficiente/Deficient, Critico/Critical
 *
 * Editorial dark-mode design: warm-stone palette, prominent numeric scores,
 * crimson accent for accountability.
 */

import { useMemo, useCallback, lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Medal,
  Crown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { scorecardApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'

const InstitutionScorecards = lazy(() => import('./InstitutionScorecards'))
const ReportCard = lazy(() => import('./ReportCard'))

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InstitutionScorecardItem {
  institution_id: number
  institution_name: string
  ramo_code: number | null
  sector_name: string | null
  total_score: number
  grade: string
  grade_label: string
  grade_color: string
  national_percentile: number
  pillar_openness: number
  pillar_price: number
  pillar_vendors: number
  pillar_process: number
  pillar_external: number
  top_risk_driver: string | null
  confidence_band: string | null
  p90_risk_score: number | null
  trend_direction: string | null
  peer_percentile_sector: number | null
  signal_count_red: number | null
}

interface ScorecardListResponse {
  data: InstitutionScorecardItem[]
  total: number
  page: number
  per_page: number
  total_pages: number
  grade_distribution: Record<string, number>
}

interface InstitutionStats {
  total_scored: number
  median_score: number
  top_institution_id: number | null
  top_institution_name: string | null
  top_institution_score: number | null
  worst_institution_id: number | null
  worst_institution_name: string | null
  worst_institution_score: number | null
  grade_distribution: Record<string, number>
}

type SortKey =
  | 'total_score'
  | 'national_percentile'
  | 'institution_name'
  | 'pillar_openness'
  | 'pillar_price'
  | 'pillar_vendors'
  | 'pillar_process'
  | 'pillar_external'

type TierKey = 'Excelente' | 'Satisfactorio' | 'Regular' | 'Deficiente' | 'Critico'

// ---------------------------------------------------------------------------
// 5-tier color system (color palette only — labels come from i18n)
// ---------------------------------------------------------------------------

interface TierStyle {
  key: TierKey
  color: string
  bg: string
  border: string
  textClass: string
}

interface TierInfo extends TierStyle {
  label: string
}

const TIER_STYLES: Record<TierKey, TierStyle> = {
  Excelente:     { key: 'Excelente',     color: '#16a34a', bg: 'rgba(22,163,74,0.12)',  border: 'rgba(22,163,74,0.30)',  textClass: 'text-green-400' },
  Satisfactorio: { key: 'Satisfactorio', color: '#0d9488', bg: 'rgba(13,148,136,0.12)', border: 'rgba(13,148,136,0.30)', textClass: 'text-teal-400' },
  Regular:       { key: 'Regular',       color: '#d97706', bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.30)',  textClass: 'text-amber-400' },
  Deficiente:    { key: 'Deficiente',    color: '#ea580c', bg: 'rgba(234,88,12,0.12)',  border: 'rgba(234,88,12,0.30)',  textClass: 'text-orange-400' },
  Critico:       { key: 'Critico',       color: '#dc2626', bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.30)',  textClass: 'text-red-400' },
}

const TIER_NAMES: readonly TierKey[] = ['Excelente', 'Satisfactorio', 'Regular', 'Deficiente', 'Critico'] as const

/** Map any backend grade (S/A/B+/B/C+/C/D/D-/F/F-) to a 5-tier key */
function gradeToTierKey(grade: string): TierKey {
  switch (grade) {
    case 'S':
    case 'A':
      return 'Excelente'
    case 'B+':
    case 'B':
      return 'Satisfactorio'
    case 'C+':
    case 'C':
      return 'Regular'
    case 'D':
    case 'D-':
      return 'Deficiente'
    case 'F':
    case 'F-':
    default:
      return 'Critico'
  }
}

// Grades that map to each tier for filter purposes
const TIER_GRADE_MAP: Record<TierKey, string[]> = {
  Excelente:     ['S', 'A'],
  Satisfactorio: ['B+', 'B'],
  Regular:       ['C+', 'C'],
  Deficiente:    ['D', 'D-'],
  Critico:       ['F', 'F-'],
}

/** Hook that returns an i18n-aware tier-info resolver. */
function useTierInfo() {
  const { t } = useTranslation('institutionleague')
  return useCallback((grade: string): TierInfo => {
    const key = gradeToTierKey(grade)
    return { ...TIER_STYLES[key], label: t(`tiers.${key}`) }
  }, [t])
}

/** Hook that returns the full TierInfo for a given tier key. */
function useTierByKey() {
  const { t } = useTranslation('institutionleague')
  return useCallback((key: TierKey): TierInfo => {
    return { ...TIER_STYLES[key], label: t(`tiers.${key}`) }
  }, [t])
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TrendIcon({ direction }: { direction: string | null }) {
  const { t } = useTranslation('institutionleague')
  if (direction === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-green-400" aria-label={t('trend.improving')} />
  if (direction === 'declining') return <TrendingDown className="h-3.5 w-3.5 text-red-400" aria-label={t('trend.declining')} />
  return <Minus className="h-3.5 w-3.5 text-zinc-600" aria-label={t('trend.stable')} />
}

/** 5 mini vertical bars showing all pillars at a glance */
function PillarSparkBars({ item }: { item: InstitutionScorecardItem }) {
  const pillars = [
    { key: 'O', value: item.pillar_openness, max: 20 },
    { key: 'P', value: item.pillar_price, max: 25 },
    { key: 'V', value: item.pillar_vendors, max: 20 },
    { key: 'R', value: item.pillar_process, max: 15 },
    { key: 'E', value: item.pillar_external, max: 20 },
  ]
  const tooltip = pillars.map(p => `${p.key}:${p.value.toFixed(0)}/${p.max}`).join(' ')
  return (
    <div
      className="flex items-end gap-[3px]"
      title={tooltip}
      aria-hidden="true"
    >
      {pillars.map(({ key, value, max }) => {
        const pct = Math.min(100, Math.max(2, (value / max) * 100))
        const bg = pct > 65 ? '#4ade80' : pct > 35 ? '#fbbf24' : '#f87171'
        return (
          <div key={key} className="flex flex-col items-center gap-[2px]">
            <div className="w-[18px] h-7 bg-zinc-800/80 rounded-[2px] flex flex-col justify-end overflow-hidden">
              <div style={{ height: `${pct}%`, background: bg }} className="w-full rounded-[1px] transition-all" />
            </div>
            <span className="text-[7px] text-zinc-600 font-mono leading-none select-none">{key}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Risk driver pill
// ---------------------------------------------------------------------------

function RiskDriverPill({ driver }: { driver: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-[9px] text-red-400 font-mono uppercase tracking-wide mt-0.5">
      <span className="h-1 w-1 rounded-full bg-red-500 flex-shrink-0" />
      {driver}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Tier distribution bar (5-tier stacked bar)
// ---------------------------------------------------------------------------

function TierDistributionBar({ distribution }: { distribution: Record<string, number> }) {
  const { t } = useTranslation('institutionleague')
  const getTier = useTierByKey()

  const tiers = useMemo(() => {
    return TIER_NAMES.map((key) => {
      const grades = TIER_GRADE_MAP[key]
      const count = grades.reduce((sum, g) => sum + (distribution[g] ?? 0), 0)
      return { tier: getTier(key), count }
    })
  }, [distribution, getTier])

  const total = tiers.reduce((s, t) => s + t.count, 0)
  if (total === 0) return null

  const ariaLabel = t('distribution.ariaLabel')

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        {t('distribution.title')}
      </p>
      {/* Stacked bar */}
      <div className="flex rounded-lg overflow-hidden h-7 gap-[1px]" role="img" aria-label={ariaLabel}>
        {tiers.map(({ tier, count }) => {
          const pct = (count / total) * 100
          if (pct < 0.3) return null
          return (
            <div
              key={tier.key}
              className="relative flex items-center justify-center overflow-hidden transition-all hover:opacity-100"
              style={{ width: `${pct}%`, backgroundColor: tier.color, minWidth: '4px', opacity: 0.9 }}
              title={`${tier.label}: ${count} (${pct.toFixed(1)}%)`}
            >
              {pct > 8 && (
                <span className="text-[9px] font-mono font-black text-black/70 leading-none select-none truncate px-1">
                  {tier.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {tiers.filter(t => t.count > 0).map(({ tier, count }) => {
          const pct = ((count / total) * 100).toFixed(1)
          return (
            <span key={tier.key} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: tier.color }} />
              <span className="font-mono font-bold" style={{ color: tier.color }}>{tier.label}</span>
              <span className="tabular-nums text-zinc-500">{count}</span>
              <span className="tabular-nums text-zinc-600">({pct}%)</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tier badge (inline colored badge)
// ---------------------------------------------------------------------------

function TierBadge({ grade, size = 'sm' }: { grade: string; size?: 'sm' | 'md' }) {
  const getTier = useTierInfo()
  const tier = getTier(grade)
  const sizeClass = size === 'md'
    ? 'px-2.5 py-1 text-[11px]'
    : 'px-2 py-0.5 text-[9px]'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-bold uppercase tracking-wide ${sizeClass}`}
      style={{ backgroundColor: tier.bg, borderColor: tier.border, color: tier.color, border: '1px solid' }}
    >
      {tier.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Podium card (redesigned: prominent score, tier badge, no letter grade)
// ---------------------------------------------------------------------------

function PodiumCard({
  rank,
  item,
  onNavigate,
}: {
  rank: 1 | 2 | 3
  item: InstitutionScorecardItem
  onNavigate: (id: number) => void
}) {
  const { t } = useTranslation('institutionleague')
  const getTier = useTierInfo()
  const tier = getTier(item.grade)
  const podiumColors: Record<number, string> = {
    1: 'from-yellow-900/30 to-zinc-950/10 border-yellow-700/40',
    2: 'from-zinc-700/30 to-zinc-900/10 border-zinc-600/40',
    3: 'from-amber-900/20 to-zinc-950/10 border-amber-800/40',
  }
  const topBorder: Record<number, string> = {
    1: 'border-t-4 border-t-yellow-400',
    2: 'border-t-4 border-t-zinc-400',
    3: 'border-t-4 border-t-amber-600',
  }
  const medalColors: Record<number, string> = {
    1: 'text-yellow-400',
    2: 'text-zinc-400',
    3: 'text-amber-600',
  }

  return (
    <button
      onClick={() => onNavigate(item.institution_id)}
      className={`
        relative flex flex-col gap-3 p-5 rounded-xl bg-gradient-to-b border
        ${podiumColors[rank]}
        ${topBorder[rank]}
        hover:border-zinc-500/60 transition-all text-left w-full group
      `}
      aria-label={t('podiumAriaLabel', { rank, name: item.institution_name, score: item.total_score })}
    >
      {rank === 1 && (
        <Crown
          className="absolute -top-3 left-1/2 -translate-x-1/2 h-7 w-7 text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]"
          aria-hidden="true"
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Medal className={`h-6 w-6 flex-shrink-0 ${medalColors[rank]}`} aria-hidden="true" />
          <span className={`text-2xl font-mono font-black ${medalColors[rank]}`}>#{rank}</span>
        </div>
        {/* Large score number */}
        <span className="text-6xl font-black font-mono tabular-nums leading-none" style={{ color: tier.color }}>
          {item.total_score.toFixed(0)}
        </span>
      </div>
      <p className="text-zinc-100 text-sm font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors">
        {item.institution_name}
      </p>
      {item.sector_name && (
        <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-wide truncate">{item.sector_name}</p>
      )}
      {/* Tier badge + percentile */}
      <div className="flex items-center gap-2 mt-auto">
        <TierBadge grade={item.grade} size="md" />
        <span className="text-zinc-500 text-[10px] font-mono tabular-nums">
          {t('percentileLabel', { n: Math.round(item.national_percentile * 100) })}
        </span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Sort header button
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className = '',
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  className?: string
}) {
  const { t } = useTranslation('institutionleague')
  const active = sortKey === currentKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 hover:text-white transition-colors ${active ? 'text-white' : 'text-zinc-500'} ${className}`}
      aria-label={t('sortAriaLabel', { label })}
    >
      <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase">{label}</span>
      {active ? (
        currentDir === 'desc' ? (
          <ArrowDown className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        ) : (
          <ArrowUp className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 flex-shrink-0 opacity-40" aria-hidden="true" />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InstitutionLeague() {
  const { t } = useTranslation('institutionleague')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const getTier = useTierInfo()
  const getTierByKey = useTierByKey()

  // Filter / sort state from URL
  const page = Number(searchParams.get('page') || 1)
  const sectorFilter = searchParams.get('sector') || ''
  const gradeFilter = searchParams.get('grade') || ''
  const search = searchParams.get('q') || ''
  const sortBy = (searchParams.get('sort') || 'total_score') as SortKey
  const sortOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
  const PER_PAGE = 50

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams)
      Object.entries(updates).forEach(([k, v]) => {
        if (v === undefined || v === '') next.delete(k)
        else next.set(k, v)
      })
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const handleSort = (key: SortKey) => {
    if (key === sortBy) {
      updateParams({ order: sortOrder === 'desc' ? 'asc' : 'desc', page: '1' })
    } else {
      updateParams({ sort: key, order: 'desc', page: '1' })
    }
  }

  // Data fetching
  const { data: statsData } = useQuery<InstitutionStats>({
    queryKey: ['institution-scorecard-stats'],
    queryFn: () => scorecardApi.getInstitutionStats(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: listData, isLoading, isError } = useQuery<ScorecardListResponse>({
    queryKey: ['institution-scorecards-federal', page, sectorFilter, gradeFilter, search, sortBy, sortOrder],
    queryFn: () =>
      scorecardApi.getInstitutions({
        page,
        per_page: PER_PAGE,
        sort_by: sortBy,
        order: sortOrder,
        grade: gradeFilter || undefined,
        sector: sectorFilter || undefined,
        search: search || undefined,
        federal_only: true,
      }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  // Top 3 for podium (first page, sorted by score desc, no filters)
  const { data: podiumData } = useQuery<ScorecardListResponse>({
    queryKey: ['institution-scorecards-federal-top3'],
    queryFn: () =>
      scorecardApi.getInstitutions({ page: 1, per_page: 3, sort_by: 'total_score', order: 'desc', federal_only: true }),
    staleTime: 30 * 60 * 1000,
  })

  const podiumItems = podiumData?.data ?? []
  const items = listData?.data ?? []
  const total = listData?.total ?? 0
  const totalPages = listData?.total_pages ?? 1

  // Row rank calculation: rank of first item on current page
  const firstItemRank = (page - 1) * PER_PAGE + 1

  // Whether filters are active (don't show podium when filtered)
  const hasFilters = !!(sectorFilter || gradeFilter || search)

  // Editorial headline from stats
  const editorialHeadline = useMemo(() => {
    if (!statsData?.grade_distribution) return null
    const dist = statsData.grade_distribution
    const totalScored = statsData.total_scored
    const aboveB = (dist['S'] ?? 0) + (dist['A'] ?? 0) + (dist['B+'] ?? 0) + (dist['B'] ?? 0)
    const aboveBPct = totalScored > 0 ? ((aboveB / totalScored) * 100).toFixed(0) : '0'
    const failingCount = (dist['F'] ?? 0) + (dist['F-'] ?? 0)
    if (failingCount > 0) {
      return t('finding.critical', { pct: aboveBPct, failing: failingCount })
    }
    return t('finding.normal', { pct: aboveBPct, total: formatNumber(totalScored) })
  }, [statsData, t])

  const failingCount = useMemo(() => {
    if (!statsData?.grade_distribution) return 0
    return (statsData.grade_distribution['F'] ?? 0) + (statsData.grade_distribution['F-'] ?? 0)
  }, [statsData])

  const sectorOptions = useMemo(
    () => SECTORS.map((s) => ({ value: s.code, label: s.name })),
    [],
  )

  // Map current gradeFilter (backend grade value like "S") back to its tier name for display
  const activeTierName = useMemo(() => {
    if (!gradeFilter) return ''
    for (const [tierName, grades] of Object.entries(TIER_GRADE_MAP)) {
      if (grades.includes(gradeFilter)) return tierName
    }
    return ''
  }, [gradeFilter])

  const activeTab = searchParams.get('tab') || 'ranking'
  const setTab = (tab: string) => updateParams({ tab, page: undefined })

  if (activeTab === 'fichas') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <TabBar activeTab={activeTab} setTab={setTab} />
        <ErrorBoundary fallback={null}>
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-zinc-500 text-sm">{t('loadingShort')}</div>}>
            <InstitutionScorecards />
          </Suspense>
        </ErrorBoundary>
      </div>
    )
  }

  if (activeTab === 'reporte') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <TabBar activeTab={activeTab} setTab={setTab} />
        <ErrorBoundary fallback={null}>
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-zinc-500 text-sm">{t('loadingShort')}</div>}>
            <ReportCard />
          </Suspense>
        </ErrorBoundary>
      </div>
    )
  }

  const totalInstitutions = statsData?.total_scored ?? 0
  const highRiskInstitutions = failingCount

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <TabBar activeTab={activeTab} setTab={setTab} />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-6">
        <EditorialPageShell
          kicker={t('kicker')}
          headline={
            <>{t('headline.before')}{' '}
              <span className="text-accent">{t('headline.accent')}</span>
            </>
          }
          paragraph={
            totalInstitutions > 0
              ? t('lede', { total: formatNumber(totalInstitutions) })
              : t('lede_none')
          }
          stats={isLoading ? undefined : [
            { value: formatNumber(totalInstitutions), label: t('stats.evaluated') },
            { value: formatNumber(highRiskInstitutions), label: t('stats.critical'), color: 'var(--color-risk-critical)' },
            { value: statsData?.median_score?.toFixed(1) ?? '—', label: t('stats.median'), sub: t('stats.outOfHundred') },
            { value: '5', label: t('stats.tiers'), sub: t('stats.tiersRange') },
          ]}
          meta={t('meta')}
          severity={failingCount > 0 ? 'critical' : 'high'}
          loading={isLoading}
        >
      {/* Editorial finding headline — urgent red when failing institutions exist */}
      {editorialHeadline && (
        <div className={`mb-6 pl-5 py-3 rounded-r-lg flex items-start gap-4 ${
          failingCount > 0
            ? 'border-l-4 border-red-500 bg-red-950/30'
            : 'border-l-4 border-amber-500 bg-amber-950/20'
        }`}>
          <Crown className={`h-5 w-5 flex-shrink-0 mt-0.5 ${failingCount > 0 ? 'text-red-400' : 'text-amber-500'}`} aria-hidden="true" />
          <div>
            <p className={`text-[10px] font-mono font-bold uppercase tracking-[0.15em] mb-1 ${
              failingCount > 0 ? 'text-red-400' : 'text-amber-500/70'
            }`}>
              {t('hallazgo')}
            </p>
            <p className="text-base text-zinc-100 leading-relaxed font-medium">{editorialHeadline}</p>
          </div>
        </div>
      )}

      <div className="space-y-10"><Act number="I" label={t('acts.one')}>

      <div className="space-y-6">

        {/* Stats strip + tier distribution */}
        {statsData && (
          <div className="space-y-4">
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              role="region"
              aria-label={t('statsAriaLabel')}
            >
              <StatCard label={t('stats.totalScored')} value={formatNumber(statsData.total_scored)} />
              <StatCard label={t('stats.medianScore')} value={statsData.median_score.toFixed(1)} sub={t('stats.outOfHundred')} />
              <StatCard
                label={t('stats.topPerformer')}
                value={statsData.top_institution_score?.toFixed(1) ?? '--'}
                sub={statsData.top_institution_name ?? undefined}
                onClick={statsData.top_institution_id ? () => navigate(`/institutions/${statsData.top_institution_id}`) : undefined}
              />
              <StatCard
                label={t('stats.worstPerformer')}
                value={statsData.worst_institution_score?.toFixed(1) ?? '--'}
                sub={statsData.worst_institution_name ?? undefined}
                accent="red"
                onClick={statsData.worst_institution_id ? () => navigate(`/institutions/${statsData.worst_institution_id}`) : undefined}
              />
            </div>
            {/* Tier distribution bar */}
            {statsData.grade_distribution && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
                <TierDistributionBar distribution={statsData.grade_distribution} />
              </div>
            )}
          </div>
        )}

        {/* Podium -- only when no filters active */}
        {!hasFilters && podiumItems.length >= 3 && (
          <section aria-labelledby="podium-heading" className="space-y-3">
            <div>
              <p className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-zinc-500 mb-1">
                {t('podiumKicker')}
              </p>
              <h2
                id="podium-heading"
                className="text-lg font-serif font-bold text-zinc-100 leading-tight"
              >
                {t('podiumHeadline')}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {podiumItems.slice(0, 3).map((item, idx) => (
                <PodiumCard
                  key={item.institution_id}
                  rank={(idx + 1) as 1 | 2 | 3}
                  item={item}
                  onNavigate={(id) => navigate(`/institutions/${id}`)}
                />
              ))}
            </div>
          </section>
        )}

        </div>
      </Act>

      <Act number="II" label={t('acts.two')}>
      <div className="space-y-6">

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <label htmlFor="league-search" className="sr-only">{t('filters.search')}</label>
            <input
              id="league-search"
              type="search"
              value={search}
              onChange={(e) => updateParams({ q: e.target.value || undefined, page: '1' })}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
            />
          </div>

          {/* Sector filter */}
          <div>
            <label htmlFor="sector-filter" className="sr-only">{t('filters.sectorLabel')}</label>
            <select
              id="sector-filter"
              value={sectorFilter}
              onChange={(e) => updateParams({ sector: e.target.value || undefined, page: '1' })}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
            >
              <option value="">{t('filters.allSectors')}</option>
              {sectorOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Tier filter (5-tier — sends first backend grade of the tier to API) */}
          <div>
            <label htmlFor="tier-filter" className="sr-only">{t('filters.tier')}</label>
            <select
              id="tier-filter"
              value={activeTierName}
              onChange={(e) => {
                const tierName = e.target.value as TierKey | ''
                // Send the first backend grade of the selected tier to the API
                const grades = tierName ? TIER_GRADE_MAP[tierName] : undefined
                const gradeVal = grades ? grades[0] : undefined
                updateParams({ grade: gradeVal || undefined, page: '1' })
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
            >
              <option value="">{t('filters.allTiers')}</option>
              {TIER_NAMES.map((tierName) => {
                const tier = getTierByKey(tierName)
                return (
                  <option key={tierName} value={tierName}>{tier.label}</option>
                )
              })}
            </select>
          </div>

          {/* Result count */}
          <span className="text-zinc-500 text-[10px] font-mono ml-auto tabular-nums tracking-wide">
            {t('filters.results', { num: formatNumber(total) })}
          </span>
        </div>

        {/* Table */}
        <section aria-labelledby="league-table-heading" className="space-y-3">
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-zinc-500 mb-1">
              {t('tableKicker')}
            </p>
            <h2 id="league-table-heading" className="text-lg font-serif font-bold text-zinc-100 leading-tight">
              {t('tableHeadline', { total: formatNumber(total) })}
            </h2>
          </div>

          {isError && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {t('error')}
            </div>
          )}

          {isLoading && !items.length && (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-zinc-800/40 rounded animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <p className="text-zinc-400 text-sm">{t('empty')}</p>
              <p className="text-zinc-600 text-xs mt-1">
                {t('filters.adjustFilters')}
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm min-w-[900px]" role="grid" aria-label={t('tableAriaLabel')}>
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="px-3 py-2.5 text-left w-10">
                      <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wide">
                        #
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left">
                      <SortHeader
                        label={t('columns.institution')}
                        sortKey="institution_name"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left w-32">
                      <SortHeader
                        label={t('columns.score')}
                        sortKey="total_score"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-3 py-2.5 text-center w-28">
                      <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wide">
                        {t('columns.grade')}
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left hidden sm:table-cell w-32">
                      <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wide">
                        {t('columns.pillars')}
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-center w-16 hidden sm:table-cell">
                      <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wide">
                        {t('columns.trend')}
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left hidden md:table-cell w-28">
                      <SortHeader
                        label={t('columns.percentile')}
                        sortKey="national_percentile"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rank = firstItemRank + idx
                    const tier = getTier(item.grade)
                    // Worst performers: bottom 5 when sorted by score ascending
                    const isWorstPerformer = sortBy === 'total_score' && sortOrder === 'asc' && idx < 5
                    // Top 3 medals (only visible when sorted by score descending on first page)
                    const isTopMedalist = sortBy === 'total_score' && sortOrder === 'desc' && rank <= 3
                    const rankColor = isTopMedalist
                      ? (rank === 1 ? '#facc15' : rank === 2 ? '#d4d4d8' : '#d97706')
                      : isWorstPerformer
                        ? '#dc2626'
                        : tier.color
                    return (
                      <tr
                        key={item.institution_id}
                        className={`border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors cursor-pointer group ${
                          isWorstPerformer ? 'bg-red-950/15' : ''
                        }`}
                        onClick={() => navigate(`/institutions/${item.institution_id}`)}
                        role="row"
                        aria-label={t('rowAriaLabel', { rank, name: item.institution_name, score: item.total_score, tier: tier.label })}
                        style={{ borderLeft: `4px solid ${tier.color}` }}
                      >
                        {/* Rank — large bold mono */}
                        <td className="px-3 py-3 tabular-nums text-right w-16">
                          <div className="flex items-center justify-end gap-1.5">
                            {isTopMedalist && (
                              <Crown
                                className="h-4 w-4 flex-shrink-0"
                                style={{ color: rankColor }}
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className="text-3xl font-mono font-bold leading-none"
                              style={{ color: rankColor, opacity: isWorstPerformer || isTopMedalist ? 1 : 0.55 }}
                            >
                              #{rank}
                            </span>
                          </div>
                          {isWorstPerformer && (
                            <div className="mt-1 text-[8px] font-mono font-bold uppercase tracking-wider text-red-500 whitespace-nowrap">
                              {t('worstPerformerBadge')}
                            </div>
                          )}
                        </td>

                        {/* Institution name + risk driver pill */}
                        <td className="px-3 py-3">
                          <span className="text-zinc-200 group-hover:text-white transition-colors font-medium line-clamp-2 leading-snug" title={item.institution_name}>
                            {item.institution_name}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.sector_name && (
                              <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-wide">{item.sector_name}</span>
                            )}
                            {item.top_risk_driver && (
                              <RiskDriverPill driver={item.top_risk_driver} />
                            )}
                          </div>
                        </td>

                        {/* Score as PRIMARY display */}
                        <td className="px-3 py-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold font-mono tabular-nums" style={{ color: tier.color }}>
                              {item.total_score.toFixed(1)}
                            </span>
                            <span className="text-zinc-600 text-[10px] font-mono">/100</span>
                          </div>
                        </td>

                        {/* Tier badge */}
                        <td className="px-3 py-3 text-center">
                          <TierBadge grade={item.grade} />
                        </td>

                        {/* Pillar sparkbars */}
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <PillarSparkBars item={item} />
                        </td>

                        {/* Trend icon */}
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          <TrendIcon direction={item.trend_direction} />
                        </td>

                        {/* National percentile */}
                        <td className="px-3 py-3 hidden md:table-cell">
                          <span className="text-zinc-400 text-xs font-mono tabular-nums">
                            {item.national_percentile !== null
                              ? t('percentileLabel', { n: Math.round(item.national_percentile * 100) })
                              : '--'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="flex items-center justify-between mt-4"
              aria-label={t('pagination.ariaLabel')}
            >
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('pagination.previousAriaLabel')}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {t('pagination.previous')}
              </button>
              <span className="text-zinc-500 text-sm font-mono tabular-nums">
                {t('pagination.pageOf', { page, total: totalPages })}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('pagination.nextAriaLabel')}
              >
                {t('pagination.next')}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>

      </div>
      </Act>

        {/* Source footnote */}
        <p className="text-[10px] text-zinc-700 font-mono text-center py-6 border-t border-zinc-800/40 mt-8">
          {t('methodologyFootnote')}
        </p>
      </div>
        </EditorialPageShell>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab bar — shared between ranking/fichas/reporte views
// ---------------------------------------------------------------------------

function TabBar({ activeTab, setTab }: { activeTab: string; setTab: (tab: string) => void }) {
  const { t } = useTranslation('institutionleague')
  const tabs = [
    { id: 'ranking', label: t('tabs.ranking') },
    { id: 'fichas',  label: t('tabs.fichas') },
    { id: 'reporte', label: t('tabs.reporte') },
  ]
  return (
    <div className="border-b border-zinc-800/60 bg-zinc-900/50 px-4 sm:px-6">
      <div className="max-w-screen-xl mx-auto flex items-center gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  label: string
  value: string
  sub?: string
  accent?: 'red'
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`
        bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-left
        ${onClick ? 'hover:border-zinc-600 cursor-pointer transition-colors' : ''}
      `}
    >
      <p className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-zinc-500">{label}</p>
      <p className={`text-2xl font-bold font-mono tabular-nums mt-1 ${accent === 'red' ? 'text-red-400' : 'text-white'}`}>
        {value}
      </p>
      {sub && (
        <p className="text-zinc-500 text-xs mt-0.5 truncate leading-snug">{sub}</p>
      )}
    </Wrapper>
  )
}
