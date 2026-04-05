/**
 * Institution Scorecards Gallery — /scorecards
 *
 * A gallery-style page showing letter grades (A–F) for 2,563 Mexican
 * government institutions based on their procurement transparency, scored
 * across 5 pillars: openness, pricing, vendor diversity, process integrity,
 * and external flags.
 *
 * Design: editorial dark aesthetic, 3-column card grid, grade filter chips,
 * grade distribution bar, pagination.
 */

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Award,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { scorecardApi } from '@/api/client'
import { formatNumber } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InstitutionScorecardItem {
  institution_id: number
  institution_name: string
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

type SortKey = 'total_score' | 'national_percentile' | 'institution_name'
type SortOrder = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Grade colour palette
// ---------------------------------------------------------------------------

const GRADE_CONFIG: Record<string, { solid: string; bg: string; border: string; text: string }> = {
  S:    { solid: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.30)',  text: '#6ee7b7' },
  A:    { solid: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.30)',  text: '#86efac' },
  'B+': { solid: '#a3e635', bg: 'rgba(163,230,53,0.10)',  border: 'rgba(163,230,53,0.28)',  text: '#bef264' },
  B:    { solid: '#facc15', bg: 'rgba(250,204,21,0.10)',  border: 'rgba(250,204,21,0.28)',  text: '#fde047' },
  'C+': { solid: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.28)',  text: '#fcd34d' },
  C:    { solid: '#fb923c', bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.28)',  text: '#fdba74' },
  D:    { solid: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.28)', text: '#fca5a5' },
  'D-': { solid: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.30)',   text: '#f87171' },
  F:    { solid: '#dc2626', bg: 'rgba(220,38,38,0.12)',   border: 'rgba(220,38,38,0.30)',   text: '#f87171' },
  'F-': { solid: '#991b1b', bg: 'rgba(153,27,27,0.15)',   border: 'rgba(153,27,27,0.35)',   text: '#ef4444' },
}

const GRADE_FALLBACK = { solid: '#71717a', bg: 'rgba(113,113,122,0.10)', border: 'rgba(113,113,122,0.25)', text: '#a1a1aa' }

function gradeConfig(grade: string) {
  return GRADE_CONFIG[grade] ?? GRADE_CONFIG[grade?.charAt(0)] ?? GRADE_FALLBACK
}

const PILLAR_MAXES: Record<string, number> = {
  openness: 25,
  price: 25,
  vendors: 20,
  process: 20,
  external: 10,
}

const ALL_GRADES = ['S', 'A', 'B+', 'B', 'C+', 'C', 'D', 'D-', 'F', 'F-']

// ---------------------------------------------------------------------------
// Grade distribution bar
// ---------------------------------------------------------------------------

function GradeDistributionBar({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((s, n) => s + n, 0)
  if (total === 0) return null

  const segments = ALL_GRADES.map((g) => ({ grade: g, count: distribution[g] ?? 0, ...gradeConfig(g) }))

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        Grade Distribution — {formatNumber(total)} institutions
      </p>
      <div className="flex rounded-lg overflow-hidden h-7 gap-[1px]" role="img" aria-label="Grade distribution across all institutions">
        {segments.map(({ grade, count, solid }) => {
          const pct = (count / total) * 100
          if (pct < 0.3) return null
          return (
            <div
              key={grade}
              className="relative flex items-center justify-center overflow-hidden"
              style={{ width: `${pct}%`, backgroundColor: solid, minWidth: '4px', opacity: 0.88 }}
              title={`${grade}: ${count} (${pct.toFixed(1)}%)`}
            >
              {pct > 5 && (
                <span className="text-[10px] font-mono font-black text-black/70 leading-none select-none">
                  {grade}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.filter((s) => s.count > 0).map(({ grade, count, solid }) => {
          const pct = ((count / total) * 100).toFixed(1)
          return (
            <span key={grade} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: solid }} />
              <span className="font-mono font-bold" style={{ color: solid }}>{grade}</span>
              <span className="tabular-nums text-zinc-500">{formatNumber(count)}</span>
              <span className="tabular-nums text-zinc-600">({pct}%)</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pillar mini-bar row
// ---------------------------------------------------------------------------

interface PillarBarsProps {
  openness: number
  price: number
  vendors: number
  process: number
  external: number
}

function PillarBars({ openness, price, vendors, process, external }: PillarBarsProps) {
  const pillars = [
    { key: 'openness', label: 'Open', value: openness, max: PILLAR_MAXES.openness },
    { key: 'price',    label: 'Price', value: price,    max: PILLAR_MAXES.price    },
    { key: 'vendors',  label: 'Vend',  value: vendors,  max: PILLAR_MAXES.vendors  },
    { key: 'process',  label: 'Proc',  value: process,  max: PILLAR_MAXES.process  },
    { key: 'external', label: 'Ext',   value: external, max: PILLAR_MAXES.external },
  ]

  return (
    <div className="space-y-1" aria-label="Pillar scores">
      {pillars.map(({ key, label, value, max }) => {
        const pct = Math.min((value / max) * 100, 100)
        const color = pct > 70 ? '#4ade80' : pct > 40 ? '#fbbf24' : '#f87171'
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-zinc-600 w-8 flex-shrink-0">{label}</span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[9px] font-mono tabular-nums text-zinc-500 w-8 text-right flex-shrink-0">
              {value.toFixed(1)}/{max}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trend icon
// ---------------------------------------------------------------------------

function TrendIcon({ direction }: { direction: string | null }) {
  if (direction === 'improving') return <TrendingUp className="h-3 w-3 text-green-400" aria-label="Improving" />
  if (direction === 'declining') return <TrendingDown className="h-3 w-3 text-red-400" aria-label="Declining" />
  return <Minus className="h-3 w-3 text-zinc-600" aria-label="Stable" />
}

// ---------------------------------------------------------------------------
// Institution card
// ---------------------------------------------------------------------------

interface InstitutionCardProps {
  item: InstitutionScorecardItem
  onNavigate: (id: number) => void
}

function InstitutionCard({ item, onNavigate }: InstitutionCardProps) {
  const gc = gradeConfig(item.grade)
  const hasRedSignals = (item.signal_count_red ?? 0) > 0

  return (
    <article
      className="group flex flex-col rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-white/20"
      style={{
        borderColor: gc.border,
        backgroundColor: 'rgba(24,24,27,0.70)',
      }}
      onClick={() => onNavigate(item.institution_id)}
    >
      {/* Top accent strip */}
      <div className="h-1 w-full flex-shrink-0" style={{ backgroundColor: gc.solid }} aria-hidden="true" />

      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Header: grade badge + red signal badge */}
        <div className="flex items-start justify-between gap-2">
          {/* Grade badge */}
          <div
            className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border"
            style={{ backgroundColor: gc.bg, borderColor: gc.border }}
            aria-label={`Grade ${item.grade} — ${item.grade_label}`}
          >
            <span className="text-xl font-black leading-none" style={{ color: gc.solid }}>
              {item.grade}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1">
            {/* Score */}
            <span className="text-2xl font-black tabular-nums text-white leading-none">
              {item.total_score.toFixed(1)}
            </span>
            <span className="text-[9px] text-zinc-500 font-mono">/ 100</span>

            {/* Red signal badge */}
            {hasRedSignals && (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20"
                aria-label={`${item.signal_count_red} red signals`}
              >
                <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                {item.signal_count_red}
              </span>
            )}
          </div>
        </div>

        {/* Name + sector */}
        <div>
          <h2 className="text-xs font-bold text-white leading-snug line-clamp-2 group-hover:text-zinc-200 transition-colors">
            {item.institution_name}
          </h2>
          {item.sector_name && (
            <div className="flex items-center gap-1 mt-1">
              <Building2 className="h-2.5 w-2.5 text-zinc-600 flex-shrink-0" aria-hidden="true" />
              <span className="text-[10px] text-zinc-500">{item.sector_name}</span>
            </div>
          )}
        </div>

        {/* Grade label + trend + percentile */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-semibold"
            style={{ color: gc.text }}
          >
            {item.grade_label}
          </span>
          <div className="flex items-center gap-1.5">
            <TrendIcon direction={item.trend_direction} />
            <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
              P{Math.round((item.national_percentile ?? 0) * 100)}
            </span>
          </div>
        </div>

        {/* Pillar mini-bars */}
        <PillarBars
          openness={item.pillar_openness}
          price={item.pillar_price}
          vendors={item.pillar_vendors}
          process={item.pillar_process}
          external={item.pillar_external}
        />

        {/* Top risk driver */}
        {item.top_risk_driver && (
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-amber-500/8 border border-amber-500/15 text-[9px] text-amber-400 font-mono uppercase tracking-wide">
              <span className="h-1 w-1 rounded-full bg-amber-400 flex-shrink-0" aria-hidden="true" />
              {item.top_risk_driver}
            </span>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <button
        className="flex items-center justify-center gap-1.5 py-2 border-t text-[10px] font-semibold transition-colors focus:outline-none"
        style={{ borderColor: gc.border, color: gc.text }}
        onClick={(e) => { e.stopPropagation(); onNavigate(item.institution_id) }}
        aria-label={`View profile for ${item.institution_name}`}
        tabIndex={-1}
      >
        View Profile
      </button>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Card skeleton
// ---------------------------------------------------------------------------

function InstitutionCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/8 bg-zinc-900/60 overflow-hidden">
      <div className="h-1 w-full bg-zinc-800" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-1 items-end flex flex-col">
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-8" />
        </div>
        <div className="space-y-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-1 w-full rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat card (editorial HallazgoStat style)
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accentColor?: string
}

function StatCard({ label, value, sub, accentColor = '#6366f1' }: StatCardProps) {
  return (
    <div
      className="rounded-xl border border-white/8 bg-zinc-900/60 p-4 space-y-1"
      style={{ borderLeftColor: accentColor, borderLeftWidth: '3px' }}
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">{label}</p>
      <p className="text-xl font-black tabular-nums text-white leading-none">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 leading-snug">{sub}</p>}
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/8 bg-zinc-900/60 p-4 space-y-2">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-2 w-40" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grade filter chip
// ---------------------------------------------------------------------------

interface GradeChipProps {
  grade: string
  active: boolean
  count: number
  onClick: () => void
}

function GradeChip({ grade, active, count, onClick }: GradeChipProps) {
  const gc = gradeConfig(grade)
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 border"
      style={{
        backgroundColor: active ? gc.solid : 'transparent',
        borderColor: active ? gc.solid : gc.border,
        color: active ? '#000' : gc.text,
      }}
      aria-pressed={active}
      aria-label={`Filter grade ${grade}, ${count} institutions`}
    >
      {grade}
      <span
        className="text-[9px] font-normal"
        style={{ opacity: 0.7 }}
      >
        {formatNumber(count)}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const PER_PAGE = 50

export default function InstitutionScorecards() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('total_score')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const handleNavigate = useCallback((id: number) => {
    navigate(`/institutions/${id}`)
  }, [navigate])

  // Stats query
  const { data: stats, isLoading: statsLoading } = useQuery<InstitutionStats>({
    queryKey: ['scorecard-institution-stats'],
    queryFn: () => scorecardApi.getInstitutionStats(),
    staleTime: 10 * 60 * 1000,
  })

  // List query
  const { data: listData, isLoading: listLoading, isPlaceholderData } = useQuery<ScorecardListResponse>({
    queryKey: ['scorecard-institutions', page, selectedGrade, sortBy, sortOrder, search],
    queryFn: () =>
      scorecardApi.getInstitutions({
        page,
        per_page: PER_PAGE,
        grade: selectedGrade ?? undefined,
        sort_by: sortBy,
        order: sortOrder,
        search: search || undefined,
      }),
    staleTime: 5 * 60 * 1000,
  })

  const institutions = listData?.data ?? []
  const totalPages = listData?.total_pages ?? 1
  const totalCount = listData?.total ?? 0

  const gradeDistribution = stats?.grade_distribution ?? {}

  function handleGradeClick(grade: string) {
    if (selectedGrade === grade) {
      setSelectedGrade(null)
    } else {
      setSelectedGrade(grade)
    }
    setPage(1)
  }

  function handleSortChange(key: SortKey) {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
    setPage(1)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const topName = stats?.top_institution_name ?? '—'
  const topScore = stats?.top_institution_score
  const worstName = stats?.worst_institution_name ?? '—'
  const worstScore = stats?.worst_institution_score

  return (
    <div className="min-h-screen">
      {/* ── DARK HEADER ──────────────────────────────────────────────── */}
      <header className="relative bg-zinc-950 border-b border-white/8 overflow-hidden">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.5) 40px, rgba(255,255,255,0.5) 41px),
              repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.5) 40px, rgba(255,255,255,0.5) 41px)
            `,
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-500">
              INSTITUTION ACCOUNTABILITY · COMPRANET 2002–2025 · v6.5
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
            Mexico's 2,563 Procurement Institutions — Graded
          </h1>
          <p className="mt-3 text-base text-zinc-400 max-w-2xl leading-relaxed">
            Scored on openness, pricing, vendor diversity, process integrity, and external flags.
            Each institution receives a letter grade based on 5 procurement transparency pillars.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── STATS ROW ─────────────────────────────────────────────── */}
        <section aria-label="Summary statistics">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Total Institutions Graded"
                  value={formatNumber(stats?.total_scored ?? 2563)}
                  sub="Mexican federal procurement bodies"
                  accentColor="#6366f1"
                />
                <StatCard
                  label="Best Performer"
                  value={topScore != null ? topScore.toFixed(1) : '—'}
                  sub={topName.length > 40 ? topName.slice(0, 40) + '…' : topName}
                  accentColor="#34d399"
                />
                <StatCard
                  label="Worst Performer"
                  value={worstScore != null ? worstScore.toFixed(1) : '—'}
                  sub={worstName.length > 40 ? worstName.slice(0, 40) + '…' : worstName}
                  accentColor="#dc2626"
                />
                <StatCard
                  label="Median Score"
                  value={stats?.median_score != null ? stats.median_score.toFixed(1) : '—'}
                  sub="out of 100 points"
                  accentColor="#fbbf24"
                />
              </>
            )}
          </div>
        </section>

        {/* ── GRADE DISTRIBUTION BAR ────────────────────────────────── */}
        <section
          className="rounded-xl border border-white/8 bg-zinc-900/60 p-5"
          aria-label="Grade distribution"
        >
          {statsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-2.5 w-48" />
              <Skeleton className="h-7 w-full rounded-lg" />
              <div className="flex gap-4 flex-wrap">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-20" />
                ))}
              </div>
            </div>
          ) : (
            <GradeDistributionBar distribution={gradeDistribution} />
          )}
        </section>

        {/* ── FILTER BAR ────────────────────────────────────────────── */}
        <section className="space-y-4" aria-label="Filters">
          {/* Grade chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-zinc-500">
              Grade:
            </span>
            <button
              onClick={() => { setSelectedGrade(null); setPage(1) }}
              className={`rounded-full px-3 py-1 text-[11px] font-mono font-bold transition-all duration-150 border focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                selectedGrade === null
                  ? 'bg-white text-zinc-900 border-white'
                  : 'bg-transparent text-zinc-400 border-white/15 hover:border-white/30'
              }`}
              aria-pressed={selectedGrade === null}
            >
              All
            </button>
            {ALL_GRADES.map((g) => (
              <GradeChip
                key={g}
                grade={g}
                active={selectedGrade === g}
                count={gradeDistribution[g] ?? 0}
                onClick={() => handleGradeClick(g)}
              />
            ))}
          </div>

          {/* Sort + Search row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Sort controls */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-zinc-500">
                Sort:
              </span>
              {(
                [
                  { key: 'total_score' as SortKey, label: 'Score' },
                  { key: 'national_percentile' as SortKey, label: 'Percentile' },
                  { key: 'institution_name' as SortKey, label: 'Name' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleSortChange(key)}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-mono font-semibold border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                    sortBy === key
                      ? 'bg-zinc-700 border-white/20 text-white'
                      : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300'
                  }`}
                  aria-pressed={sortBy === key}
                  aria-label={`Sort by ${label} ${sortBy === key ? (sortOrder === 'desc' ? 'descending' : 'ascending') : ''}`}
                >
                  {label}
                  {sortBy === key && (
                    <span className="text-[9px]">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 sm:max-w-xs ml-auto">
              <div className="relative flex-1">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search institutions…"
                  className="w-full rounded-lg border border-white/10 bg-zinc-800/80 pl-8 pr-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-colors"
                  aria-label="Search institutions by name"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg border border-white/10 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-white/20 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                Go
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Result count */}
          <p className="text-[11px] text-zinc-500">
            {listLoading ? (
              <Skeleton className="h-3 w-40 inline-block" />
            ) : (
              <>
                Showing{' '}
                <span className="text-zinc-300 font-semibold">{formatNumber(Math.min(PER_PAGE, institutions.length))}</span>
                {' '}of{' '}
                <span className="text-zinc-300 font-semibold">{formatNumber(totalCount)}</span>
                {' '}institutions
                {selectedGrade && (
                  <> with grade <span className="font-bold" style={{ color: gradeConfig(selectedGrade).solid }}>{selectedGrade}</span></>
                )}
                {search && <> matching "<span className="text-zinc-300">{search}</span>"</>}
              </>
            )}
          </p>
        </section>

        {/* ── CARD GRID ─────────────────────────────────────────────── */}
        <section aria-label="Institution scorecards" aria-busy={listLoading}>
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity duration-200 ${isPlaceholderData ? 'opacity-60' : 'opacity-100'}`}
            role="list"
          >
            {listLoading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div role="listitem" key={i}>
                    <InstitutionCardSkeleton />
                  </div>
                ))
              : institutions.map((item) => (
                  <div role="listitem" key={item.institution_id}>
                    <InstitutionCard item={item} onNavigate={handleNavigate} />
                  </div>
                ))}
          </div>

          {/* Empty state */}
          {!listLoading && institutions.length === 0 && (
            <div
              role="alert"
              className="rounded-xl border border-white/8 bg-zinc-900/60 p-12 text-center"
            >
              <Building2 className="h-8 w-8 text-zinc-700 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-zinc-500">No institutions found matching those filters.</p>
              <button
                onClick={() => { setSelectedGrade(null); setSearch(''); setSearchInput(''); setPage(1) }}
                className="mt-3 text-xs text-zinc-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>

        {/* ── PAGINATION ────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <nav
            className="flex items-center justify-between"
            aria-label="Pagination"
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800/80 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {/* Page number pills */}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 7) {
                  pageNum = i + 1
                } else if (page <= 4) {
                  pageNum = i + 1
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i
                } else {
                  pageNum = page - 3 + i
                }

                if (pageNum < 1 || pageNum > totalPages) return null

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                      pageNum === page
                        ? 'bg-white text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                    aria-label={`Page ${pageNum}`}
                    aria-current={pageNum === page ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800/80 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label="Next page"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        )}

        {/* Footer note */}
        <p className="text-[11px] text-zinc-600 leading-relaxed max-w-4xl pb-4">
          <strong className="text-zinc-500">Note:</strong> Scores are derived from procurement records
          in COMPRANET (2002–2025) using the v6.5 risk model. Grades reflect transparency and process
          quality indicators — not proof of wrongdoing. Institutions with fewer than 30 contracts may
          show wider confidence bands.
        </p>

      </main>
    </div>
  )
}
