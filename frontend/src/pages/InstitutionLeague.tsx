/**
 * Institution Transparency League
 *
 * League-table style ranking of 2,563 scored institutions by their
 * overall transparency score (0-100) derived from 5 pillars:
 *   Openness, Price, Vendors, Process, External Alerts
 *
 * Editorial dark-mode design: zinc-900/950 palette, prominent letter grades,
 * grade distribution strip, OECD context.
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

const GRADE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  S:    { text: 'text-emerald-300', bg: 'bg-emerald-900/40', border: 'border-emerald-700/50' },
  A:    { text: 'text-green-300',   bg: 'bg-green-900/40',   border: 'border-green-700/50'   },
  'B+': { text: 'text-lime-300',    bg: 'bg-lime-900/40',    border: 'border-lime-700/50'    },
  B:    { text: 'text-yellow-300',  bg: 'bg-yellow-900/40',  border: 'border-yellow-700/50'  },
  'C+': { text: 'text-amber-300',   bg: 'bg-amber-900/40',   border: 'border-amber-700/50'   },
  C:    { text: 'text-orange-300',  bg: 'bg-orange-900/40',  border: 'border-orange-700/50'  },
  D:    { text: 'text-red-300',     bg: 'bg-red-900/40',     border: 'border-red-700/50'     },
  'D-': { text: 'text-red-400',     bg: 'bg-red-900/50',     border: 'border-red-700/50'     },
  F:    { text: 'text-red-400',     bg: 'bg-red-950/60',     border: 'border-red-800/50'     },
  'F-': { text: 'text-red-500',     bg: 'bg-red-950/70',     border: 'border-red-800/60'     },
}

const GRADE_FALLBACK = { text: 'text-zinc-400', bg: 'bg-zinc-800/40', border: 'border-zinc-700/50' }

function gradeClasses(grade: string) {
  const g = GRADE_COLORS[grade] ?? GRADE_COLORS[grade.charAt(0)] ?? GRADE_FALLBACK
  return `${g.bg} border ${g.border} ${g.text}`
}

function gradeTextClass(grade: string): string {
  return (GRADE_COLORS[grade] ?? GRADE_COLORS[grade.charAt(0)] ?? GRADE_FALLBACK).text
}

function TrendIcon({ direction }: { direction: string | null }) {
  if (direction === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-green-400" aria-label="Improving" />
  if (direction === 'declining') return <TrendingDown className="h-3.5 w-3.5 text-red-400" aria-label="Declining" />
  return <Minus className="h-3.5 w-3.5 text-zinc-600" aria-label="Stable" />
}

// ---------------------------------------------------------------------------
// Score progress bar
// ---------------------------------------------------------------------------

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden" role="presentation">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, score)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-zinc-200 tabular-nums text-xs font-mono w-8 text-right">{score.toFixed(1)}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pillar mini-bar (compact, single-value)
// ---------------------------------------------------------------------------

function PillarBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const hue = pct > 70 ? '#4ade80' : pct > 40 ? '#eab308' : '#f87171'
  return (
    <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden" role="presentation">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: hue }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grade distribution strip
// ---------------------------------------------------------------------------

function GradeDistributionStrip({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((s, n) => s + n, 0)
  if (total === 0) return null

  const segments: Array<{ grade: string; count: number; color: string }> = [
    { grade: 'S',  count: distribution['S']  ?? 0, color: '#34d399' },
    { grade: 'A',  count: distribution['A']  ?? 0, color: '#4ade80' },
    { grade: 'B+', count: distribution['B+'] ?? 0, color: '#a3e635' },
    { grade: 'B',  count: distribution['B']  ?? 0, color: '#facc15' },
    { grade: 'C+', count: distribution['C+'] ?? 0, color: '#fbbf24' },
    { grade: 'C',  count: distribution['C']  ?? 0, color: '#fb923c' },
    { grade: 'D',  count: distribution['D']  ?? 0, color: '#f87171' },
    { grade: 'D-', count: distribution['D-'] ?? 0, color: '#ef4444' },
    { grade: 'F',  count: distribution['F']  ?? 0, color: '#dc2626' },
    { grade: 'F-', count: distribution['F-'] ?? 0, color: '#991b1b' },
  ]

  return (
    <div className="space-y-2">
      <div className="flex rounded-full overflow-hidden h-2.5 gap-[1px]" role="img" aria-label="Grade distribution">
        {segments.map(({ grade, count, color }) => {
          const pct = (count / total) * 100
          if (pct < 0.5) return null
          return (
            <div
              key={grade}
              style={{ width: `${pct}%`, backgroundColor: color, minWidth: '3px', opacity: 0.85 }}
              title={`${grade}: ${count} (${pct.toFixed(1)}%)`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {segments.filter(s => s.count > 0).map(({ grade, count, color }) => (
          <span key={grade} className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="font-mono font-bold" style={{ color }}>{grade}</span>
            <span className="tabular-nums">{count}</span>
          </span>
        ))}
      </div>
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
    1: 'from-yellow-900/30 to-zinc-950/10 border-yellow-700/40',
    2: 'from-zinc-700/30 to-zinc-900/10 border-zinc-600/40',
    3: 'from-amber-900/20 to-zinc-950/10 border-amber-800/40',
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
        hover:border-zinc-500/60 transition-all text-left w-full group
      `}
      aria-label={`#${rank}: ${item.institution_name}, score ${item.total_score}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Medal className={`h-5 w-5 flex-shrink-0 mt-0.5 ${medalColors[rank]}`} aria-hidden="true" />
        {/* Large grade letter */}
        <span className={`text-3xl font-bold font-serif leading-none ${gradeTextClass(item.grade)}`}>
          {item.grade}
        </span>
      </div>
      <p className="text-zinc-100 text-sm font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors">
        {item.institution_name}
      </p>
      {item.sector_name && (
        <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-wide truncate">{item.sector_name}</p>
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
      className={`flex items-center gap-1 hover:text-white transition-colors ${active ? 'text-white' : 'text-zinc-500'} ${className}`}
      aria-label={`Sort by ${label}`}
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

  // Editorial headline from stats
  const editorialHeadline = useMemo(() => {
    if (!statsData?.grade_distribution) return null
    const dist = statsData.grade_distribution
    const totalScored = statsData.total_scored
    const aboveB = (dist['S'] ?? 0) + (dist['A'] ?? 0) + (dist['B+'] ?? 0) + (dist['B'] ?? 0)
    const aboveBPct = totalScored > 0 ? ((aboveB / totalScored) * 100).toFixed(0) : '0'
    const failingCount = (dist['F'] ?? 0) + (dist['F-'] ?? 0)
    if (failingCount > 0) {
      return `Only ${aboveBPct}% of institutions score B or above. ${failingCount} are flagged critical.`
    }
    return `Only ${aboveBPct}% of institutions score B or above across ${formatNumber(totalScored)} agencies.`
  }, [statsData])

  const sectorOptions = useMemo(
    () => SECTORS.map((s) => ({ value: s.code, label: s.name })),
    [],
  )

  const gradeOptions = ['S', 'A', 'B+', 'B', 'C+', 'C', 'D', 'D-', 'F', 'F-']

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Page header */}
      <div className="border-b border-zinc-800/60 bg-zinc-900/50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
          <p className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-500 mb-2">
            RUBLI · {t('eyebrow')}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white leading-tight">
                {t('title')}
              </h1>
              <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
                {t('subtitle', { total: formatNumber(statsData?.total_scored ?? 0) })}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-zinc-700 flex-shrink-0 self-start sm:self-auto" aria-hidden="true" />
          </div>

          {/* Editorial finding headline */}
          {editorialHeadline && (
            <div className="mt-4 border-l-2 border-amber-500 pl-4 py-1">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-amber-500/70 mb-0.5">
                HALLAZGO
              </p>
              <p className="text-sm text-zinc-200 leading-relaxed">{editorialHeadline}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Stats strip + grade distribution */}
        {statsData && (
          <div className="space-y-4">
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              role="region"
              aria-label={t('stats.totalScored')}
            >
              <StatCard label={t('stats.totalScored')} value={formatNumber(statsData.total_scored)} />
              <StatCard label={t('stats.medianScore')} value={statsData.median_score.toFixed(1)} sub="of 100" />
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
            {/* Grade distribution strip */}
            {statsData.grade_distribution && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2.5">
                  Grade Distribution
                </p>
                <GradeDistributionStrip distribution={statsData.grade_distribution} />
              </div>
            )}
          </div>
        )}

        {/* Podium -- only when no filters active */}
        {!hasFilters && podiumItems.length >= 3 && (
          <section aria-labelledby="podium-heading">
            <h2
              id="podium-heading"
              className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-zinc-500 mb-3"
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

          {/* Grade filter */}
          <div>
            <label htmlFor="grade-filter" className="sr-only">{t('columns.grade')}</label>
            <select
              id="grade-filter"
              value={gradeFilter}
              onChange={(e) => updateParams({ grade: e.target.value || undefined, page: '1' })}
              className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
            >
              <option value="">All grades</option>
              {gradeOptions.map((g) => (
                <option key={g} value={g}>{g} -- {t(`grades.${g}`)}</option>
              ))}
            </select>
          </div>

          {/* Result count */}
          <span className="text-zinc-500 text-[10px] font-mono ml-auto tabular-nums tracking-wide">
            {formatNumber(total)} institutions
          </span>
        </div>

        {/* Table */}
        <section aria-labelledby="league-table-heading">
          <h2 id="league-table-heading" className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-zinc-500 mb-3">
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
                  className="h-10 bg-zinc-800/40 rounded animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <p className="text-zinc-400 text-sm">{t('empty')}</p>
              <p className="text-zinc-600 text-xs mt-1">
                Try adjusting your filters or search query.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm min-w-[900px]" role="grid" aria-label={t('tableTitle')}>
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="px-3 py-2.5 text-left w-10">
                      <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wide">
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
                      <span className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wide">
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
                    return (
                      <tr
                        key={item.institution_id}
                        className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/institutions/${item.institution_id}`)}
                        role="row"
                        aria-label={`${item.institution_name}, grade ${item.grade}, score ${item.total_score}`}
                      >
                        {/* Rank */}
                        <td className="px-3 py-2.5 text-zinc-600 tabular-nums text-xs font-mono text-right w-10">
                          {rank}
                        </td>

                        {/* Institution name */}
                        <td className="px-3 py-2.5">
                          <span className="text-zinc-200 group-hover:text-white transition-colors font-medium line-clamp-1 block">
                            {item.institution_name}
                          </span>
                          {item.sector_name && (
                            <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-wide">{item.sector_name}</span>
                          )}
                        </td>

                        {/* Grade badge -- large and prominent */}
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold font-serif ${gradeClasses(item.grade)}`}
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
                            <span className="text-zinc-400 text-xs font-mono tabular-nums">{item.pillar_openness.toFixed(1)}</span>
                          </div>
                        </td>

                        {/* Pillar: Price */}
                        <td className="px-3 py-2.5 hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <PillarBar value={item.pillar_price} max={25} />
                            <span className="text-zinc-400 text-xs font-mono tabular-nums">{item.pillar_price.toFixed(1)}</span>
                          </div>
                        </td>

                        {/* Pillar: Vendors */}
                        <td className="px-3 py-2.5 hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            <PillarBar value={item.pillar_vendors} max={20} />
                            <span className="text-zinc-400 text-xs font-mono tabular-nums">{item.pillar_vendors.toFixed(1)}</span>
                          </div>
                        </td>

                        {/* Pillar: Process */}
                        <td className="px-3 py-2.5 hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            <PillarBar value={item.pillar_process} max={15} />
                            <span className="text-zinc-400 text-xs font-mono tabular-nums">{item.pillar_process.toFixed(1)}</span>
                          </div>
                        </td>

                        {/* Trend icon */}
                        <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                          <TrendIcon direction={item.trend_direction} />
                        </td>

                        {/* National percentile */}
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <span className="text-zinc-400 text-xs font-mono tabular-nums">
                            {item.national_percentile !== null
                              ? `P${Math.round(item.national_percentile * 100)}`
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
              aria-label="Pagination"
            >
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
              <span className="text-zinc-500 text-sm font-mono tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>

        {/* Source footnote */}
        <p className="text-[10px] text-zinc-700 font-mono text-center pb-4">
          RUBLI Procurement Health Index v6.5 · COMPRANET 2002-2025 · OECD / IMF methodology
        </p>
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
