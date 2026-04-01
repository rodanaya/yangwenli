/**
 * Institution Transparency League
 *
 * League-table style ranking of 2,563 scored institutions by their
 * overall transparency score (0-100) derived from 5 pillars:
 *   Openness, Price, Vendors, Process, External Alerts
 */

import { useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Medal,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { scorecardApi } from '@/api/client'
import { SECTORS } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'

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

// ---------------------------------------------------------------------------
// Grade helpers
// ---------------------------------------------------------------------------

const _GRADE_ORDER: Record<string, number> = {
  S: 7, A: 6, B: 5, C: 4, D: 3, F: 2, 'F-': 1,
}
void _GRADE_ORDER

function _gradeTextColor(grade: string): string {
  switch (grade) {
    case 'S': return 'text-emerald-400'
    case 'A': return 'text-green-400'
    case 'B': return 'text-yellow-400'
    case 'C': return 'text-orange-400'
    case 'D': return 'text-red-400'
    case 'F':
    case 'F-': return 'text-red-600'
    default: return 'text-stone-400'
  }
}
void _gradeTextColor

function gradeBgClass(grade: string): string {
  // Normalize: B+, B → yellow; C+, C → orange; D, D- → red; F, F- → deep red
  const g = grade.charAt(0)
  switch (g) {
    case 'S': return 'bg-emerald-900/40 border border-emerald-700/50 text-emerald-300'
    case 'A': return 'bg-green-900/40 border border-green-700/50 text-green-300'
    case 'B': return 'bg-yellow-900/40 border border-yellow-700/50 text-yellow-300'
    case 'C': return 'bg-orange-900/40 border border-orange-700/50 text-orange-300'
    case 'D': return 'bg-red-900/40 border border-red-700/50 text-red-300'
    case 'F': return 'bg-red-950/60 border border-red-800/50 text-red-400'
    default: return 'bg-stone-800/40 border border-stone-700/50 text-stone-400'
  }
}

function TrendIcon({ direction }: { direction: string | null }) {
  if (direction === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-green-400" aria-label="Improving" />
  if (direction === 'declining') return <TrendingDown className="h-3.5 w-3.5 text-red-400" aria-label="Declining" />
  return <Minus className="h-3.5 w-3.5 text-stone-500" aria-label="Stable" />
}

// ---------------------------------------------------------------------------
// Score progress bar
// ---------------------------------------------------------------------------

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-stone-800 rounded-full overflow-hidden" role="presentation">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, score)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-stone-200 tabular-nums text-xs w-8 text-right">{score.toFixed(1)}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pillar mini-bar (compact, single-value)
// ---------------------------------------------------------------------------

function PillarBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="w-12 h-1 bg-stone-800 rounded-full overflow-hidden" role="presentation">
      <div className="h-full bg-stone-400 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Podium card
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
  const podiumColors: Record<number, string> = {
    1: 'from-yellow-900/30 to-yellow-950/10 border-yellow-700/40',
    2: 'from-stone-700/30 to-stone-800/10 border-stone-600/40',
    3: 'from-amber-900/20 to-amber-950/10 border-amber-800/40',
  }
  const medalColors: Record<number, string> = {
    1: 'text-yellow-400',
    2: 'text-stone-400',
    3: 'text-amber-600',
  }

  return (
    <button
      onClick={() => onNavigate(item.institution_id)}
      className={`
        relative flex flex-col gap-2 p-4 rounded-lg bg-gradient-to-b border
        ${podiumColors[rank]}
        hover:border-stone-500/60 transition-all text-left w-full group
      `}
      aria-label={`#${rank}: ${item.institution_name}, score ${item.total_score}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Medal className={`h-5 w-5 flex-shrink-0 mt-0.5 ${medalColors[rank]}`} aria-hidden="true" />
        <span className={`text-lg font-bold tabular-nums ${gradeBgClass(item.grade)} px-2 py-0.5 rounded`}>
          {item.grade}
        </span>
      </div>
      <p className="text-stone-100 text-sm font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors">
        {item.institution_name}
      </p>
      {item.sector_name && (
        <p className="text-stone-500 text-xs truncate">{item.sector_name}</p>
      )}
      <ScoreBar score={item.total_score} color={item.grade_color} />
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
  const active = sortKey === currentKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 hover:text-white transition-colors ${active ? 'text-white' : 'text-stone-400'} ${className}`}
      aria-label={`Sort by ${label}`}
    >
      <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
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
    queryKey: ['institution-scorecards', page, sectorFilter, gradeFilter, search, sortBy, sortOrder],
    queryFn: () =>
      scorecardApi.getInstitutions({
        page,
        per_page: PER_PAGE,
        sort_by: sortBy,
        order: sortOrder,
        grade: gradeFilter || undefined,
        sector: sectorFilter || undefined,
        search: search || undefined,
      }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  // Top 3 for podium (first page, sorted by score desc, no filters)
  const { data: podiumData } = useQuery<ScorecardListResponse>({
    queryKey: ['institution-scorecards-top3'],
    queryFn: () =>
      scorecardApi.getInstitutions({ page: 1, per_page: 3, sort_by: 'total_score', order: 'desc' }),
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

  const sectorOptions = useMemo(
    () => SECTORS.map((s) => ({ value: s.code, label: s.name })),
    [],
  )

  const gradeOptions = ['S', 'A', 'B+', 'B', 'C+', 'C', 'D', 'D-', 'F', 'F-']

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Page header */}
      <div className="border-b border-stone-800 bg-stone-900/50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-500 font-mono mb-2">
            {t('eyebrow')}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                {t('title')}
              </h1>
              <p className="text-stone-400 text-sm mt-1 max-w-2xl">
                {t('subtitle', { total: formatNumber(statsData?.total_scored ?? 0) })}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-stone-600 flex-shrink-0 self-start sm:self-auto" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Stats strip */}
        {statsData && (
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            role="region"
            aria-label={t('stats.totalScored')}
          >
            <StatCard label={t('stats.totalScored')} value={formatNumber(statsData.total_scored)} />
            <StatCard label={t('stats.medianScore')} value={statsData.median_score.toFixed(1)} />
            <StatCard
              label={t('stats.topPerformer')}
              value={statsData.top_institution_score?.toFixed(1) ?? '—'}
              sub={statsData.top_institution_name ?? undefined}
              onClick={statsData.top_institution_id ? () => navigate(`/institutions/${statsData.top_institution_id}`) : undefined}
            />
            <StatCard
              label={t('stats.worstPerformer')}
              value={statsData.worst_institution_score?.toFixed(1) ?? '—'}
              sub={statsData.worst_institution_name ?? undefined}
              onClick={statsData.worst_institution_id ? () => navigate(`/institutions/${statsData.worst_institution_id}`) : undefined}
            />
          </div>
        )}

        {/* Podium — only when no filters active */}
        {!hasFilters && podiumItems.length >= 3 && (
          <section aria-labelledby="podium-heading">
            <h2
              id="podium-heading"
              className="text-xs font-bold tracking-[0.15em] uppercase text-stone-500 mb-3"
            >
              {t('podiumTitle')}
            </h2>
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

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <label htmlFor="league-search" className="sr-only">{t('filters.searchPlaceholder')}</label>
            <input
              id="league-search"
              type="search"
              value={search}
              onChange={(e) => updateParams({ q: e.target.value || undefined, page: '1' })}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full bg-stone-800 border border-stone-700 rounded-md px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-stone-500"
            />
          </div>

          {/* Sector filter */}
          <div>
            <label htmlFor="sector-filter" className="sr-only">{t('filters.sectorLabel')}</label>
            <select
              id="sector-filter"
              value={sectorFilter}
              onChange={(e) => updateParams({ sector: e.target.value || undefined, page: '1' })}
              className="bg-stone-800 border border-stone-700 rounded-md px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-stone-500"
            >
              <option value="">{t('filters.allSectors')}</option>
              {sectorOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Grade filter */}
          <div>
            <label htmlFor="grade-filter" className="sr-only">{t('columns.grade')}</label>
            <select
              id="grade-filter"
              value={gradeFilter}
              onChange={(e) => updateParams({ grade: e.target.value || undefined, page: '1' })}
              className="bg-stone-800 border border-stone-700 rounded-md px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-stone-500"
            >
              <option value="">All grades</option>
              {gradeOptions.map((g) => (
                <option key={g} value={g}>{g} — {t(`grades.${g}`)}</option>
              ))}
            </select>
          </div>

          {/* Result count */}
          <span className="text-stone-500 text-xs ml-auto tabular-nums">
            {formatNumber(total)} institutions
          </span>
        </div>

        {/* Table */}
        <section aria-labelledby="league-table-heading">
          <h2 id="league-table-heading" className="text-xs font-bold tracking-[0.15em] uppercase text-stone-500 mb-3">
            {t('tableTitle')}
          </h2>

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
                  className="h-10 bg-stone-800/40 rounded animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <p className="text-stone-500 text-sm py-8 text-center">{t('empty')}</p>
          )}

          {items.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-stone-800">
              <table className="w-full text-sm min-w-[900px]" role="grid" aria-label={t('tableTitle')}>
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-900/60">
                    <th className="px-3 py-2.5 text-left w-10">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                        {t('columns.rank')}
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
                    <th className="px-3 py-2.5 text-center w-20">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                        {t('columns.grade')}
                      </span>
                    </th>
                    <th className="px-3 py-2.5 text-left w-36">
                      <SortHeader
                        label={t('columns.score')}
                        sortKey="total_score"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left hidden lg:table-cell w-28">
                      <SortHeader
                        label={t('columns.pillarOpenness')}
                        sortKey="pillar_openness"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left hidden lg:table-cell w-28">
                      <SortHeader
                        label={t('columns.pillarPrice')}
                        sortKey="pillar_price"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left hidden xl:table-cell w-28">
                      <SortHeader
                        label={t('columns.pillarVendors')}
                        sortKey="pillar_vendors"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-3 py-2.5 text-left hidden xl:table-cell w-28">
                      <SortHeader
                        label={t('columns.pillarProcess')}
                        sortKey="pillar_process"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-3 py-2.5 text-center w-16 hidden sm:table-cell">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
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
                    return (
                      <tr
                        key={item.institution_id}
                        className="border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/institutions/${item.institution_id}`)}
                        role="row"
                        aria-label={`${item.institution_name}, grade ${item.grade}, score ${item.total_score}`}
                      >
                        {/* Rank */}
                        <td className="px-3 py-2.5 text-stone-500 tabular-nums text-xs text-right w-10">
                          {rank}
                        </td>

                        {/* Institution name */}
                        <td className="px-3 py-2.5">
                          <span className="text-stone-200 group-hover:text-white transition-colors font-medium line-clamp-1 block">
                            {item.institution_name}
                          </span>
                          {item.sector_name && (
                            <span className="text-stone-600 text-xs">{item.sector_name}</span>
                          )}
                        </td>

                        {/* Grade badge */}
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums ${gradeBgClass(item.grade)}`}
                            title={item.grade_label}
                          >
                            {item.grade}
                          </span>
                        </td>

                        {/* Score bar */}
                        <td className="px-3 py-2.5">
                          <ScoreBar score={item.total_score} color={item.grade_color} />
                        </td>

                        {/* Pillar: Openness */}
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <PillarBar value={item.pillar_openness} max={20} />
                            <span className="text-stone-400 text-xs tabular-nums">{item.pillar_openness.toFixed(1)}</span>
                          </div>
                        </td>

                        {/* Pillar: Price */}
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <PillarBar value={item.pillar_price} max={25} />
                            <span className="text-stone-400 text-xs tabular-nums">{item.pillar_price.toFixed(1)}</span>
                          </div>
                        </td>

                        {/* Pillar: Vendors */}
                        <td className="px-3 py-2.5 hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            <PillarBar value={item.pillar_vendors} max={20} />
                            <span className="text-stone-400 text-xs tabular-nums">{item.pillar_vendors.toFixed(1)}</span>
                          </div>
                        </td>

                        {/* Pillar: Process */}
                        <td className="px-3 py-2.5 hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            <PillarBar value={item.pillar_process} max={15} />
                            <span className="text-stone-400 text-xs tabular-nums">{item.pillar_process.toFixed(1)}</span>
                          </div>
                        </td>

                        {/* Trend icon */}
                        <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                          <TrendIcon direction={item.trend_direction} />
                        </td>

                        {/* National percentile */}
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <span className="text-stone-400 text-xs tabular-nums">
                            {item.national_percentile !== null
                              ? `P${Math.round(item.national_percentile * 100)}`
                              : '—'}
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
              aria-label="Pagination"
            >
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-800 border border-stone-700 text-stone-300 text-sm hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
              <span className="text-stone-500 text-sm tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-800 border border-stone-700 text-stone-300 text-sm hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>
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
  onClick,
}: {
  label: string
  value: string
  sub?: string
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`
        bg-stone-900 border border-stone-800 rounded-lg px-4 py-3 text-left
        ${onClick ? 'hover:border-stone-600 cursor-pointer transition-colors' : ''}
      `}
    >
      <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-stone-500 font-mono">{label}</p>
      <p className="text-xl font-bold text-white tabular-nums mt-0.5">{value}</p>
      {sub && (
        <p className="text-stone-500 text-xs mt-0.5 truncate leading-snug">{sub}</p>
      )}
    </Wrapper>
  )
}
