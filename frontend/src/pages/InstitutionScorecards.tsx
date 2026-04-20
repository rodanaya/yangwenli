/**
 * Transparencia Institucional — /scorecards
 *
 * A gallery-style page showing transparency tiers for 2,563 Mexican
 * government institutions based on their procurement transparency, scored
 * across 5 pillars: openness, pricing, vendor diversity, process integrity,
 * and external flags.
 *
 * 5-tier Spanish system: Excelente / Satisfactorio / Regular / Deficiente / Critico
 * Editorial dark aesthetic, 3-column card grid, tier filter chips, pagination.
 */

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
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
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'

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
// 5-tier Spanish system
// ---------------------------------------------------------------------------

interface TierInfo {
  label: string
  color: string
  bg: string
  border: string
}

const TIER_MAP: Record<string, TierInfo> = {
  Excelente:     { label: 'Excelente',     color: '#16a34a', bg: 'rgba(22,163,74,0.12)',  border: 'rgba(22,163,74,0.30)' },
  Satisfactorio: { label: 'Satisfactorio', color: '#0d9488', bg: 'rgba(13,148,136,0.12)', border: 'rgba(13,148,136,0.30)' },
  Regular:       { label: 'Regular',       color: '#d97706', bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.30)' },
  Deficiente:    { label: 'Deficiente',    color: '#ea580c', bg: 'rgba(234,88,12,0.12)',  border: 'rgba(234,88,12,0.30)' },
  Critico:       { label: 'Critico',       color: '#dc2626', bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.30)' },
}

/** Map backend grade to 5-tier Spanish system */
function gradeToTier(grade: string): TierInfo {
  switch (grade) {
    case 'S':
    case 'A':
      return TIER_MAP.Excelente
    case 'B+':
    case 'B':
      return TIER_MAP.Satisfactorio
    case 'C+':
    case 'C':
      return TIER_MAP.Regular
    case 'D':
    case 'D-':
      return TIER_MAP.Deficiente
    case 'F':
    case 'F-':
    default:
      return TIER_MAP.Critico
  }
}

/** Aggregate 10-grade distribution into 5 tiers */
function aggregateTiers(dist: Record<string, number>): Array<{ tier: TierInfo; count: number; grades: string[] }> {
  return [
    { tier: TIER_MAP.Excelente,     count: (dist['S'] ?? 0) + (dist['A'] ?? 0),   grades: ['S', 'A'] },
    { tier: TIER_MAP.Satisfactorio, count: (dist['B+'] ?? 0) + (dist['B'] ?? 0),  grades: ['B+', 'B'] },
    { tier: TIER_MAP.Regular,       count: (dist['C+'] ?? 0) + (dist['C'] ?? 0),  grades: ['C+', 'C'] },
    { tier: TIER_MAP.Deficiente,    count: (dist['D'] ?? 0) + (dist['D-'] ?? 0),  grades: ['D', 'D-'] },
    { tier: TIER_MAP.Critico,       count: (dist['F'] ?? 0) + (dist['F-'] ?? 0),  grades: ['F', 'F-'] },
  ]
}

// Grades that map to each tier for API filtering
const TIER_GRADE_MAP: Record<string, string[]> = {
  Excelente:     ['S', 'A'],
  Satisfactorio: ['B+', 'B'],
  Regular:       ['C+', 'C'],
  Deficiente:    ['D', 'D-'],
  Critico:       ['F', 'F-'],
}
const TIER_NAMES = ['Excelente', 'Satisfactorio', 'Regular', 'Deficiente', 'Critico'] as const

const PILLAR_MAXES: Record<string, number> = {
  openness: 25,
  price: 25,
  vendors: 20,
  process: 20,
  external: 10,
}

// ---------------------------------------------------------------------------
// Tier distribution bar (5-tier)
// ---------------------------------------------------------------------------

interface TierDistributionBarProps {
  distribution: Record<string, number>
  t: (key: string, opts?: Record<string, unknown>) => string
}

function TierDistributionBar({ distribution, t }: TierDistributionBarProps) {
  const tiers = aggregateTiers(distribution)
  const total = tiers.reduce((s, tier) => s + tier.count, 0)
  if (total === 0) return null

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        {t('distribution.subtitle', { total: formatNumber(total) })}
      </p>
      {/* Stacked dot-matrix */}
      {(() => {
        const N = 60, DR = 3, DG = 8
        const segs = tiers
          .filter((s) => (s.count / total) * 100 >= 0.3)
          .map((s) => ({
            count: s.count,
            color: s.tier.color,
            label: t(`tiers.${s.tier.label as string}`),
          }))
        const cells: { color: string; label: string }[] = []
        segs.forEach((seg) => {
          const segDots = Math.max(1, Math.round((seg.count / total) * N))
          for (let k = 0; k < segDots && cells.length < N; k++) {
            cells.push({ color: seg.color, label: seg.label })
          }
        })
        while (cells.length < N && cells.length > 0) {
          cells.push(cells[cells.length - 1])
        }
        return (
          <svg viewBox={`0 0 ${N * DG} 10`} className="w-full" style={{ height: 10 }} preserveAspectRatio="none"
            role="img" aria-label={t('distribution.ariaLabel')}>
            {cells.map((c, k) => (
              <circle key={k} cx={k * DG + DR} cy={5} r={DR} fill={c.color} fillOpacity={0.88}>
                <title>{c.label}</title>
              </circle>
            ))}
          </svg>
        )
      })()}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {tiers.filter((tier) => tier.count > 0).map(({ tier, count }) => {
          const pct = ((count / total) * 100).toFixed(1)
          const tierKey = tier.label as string
          const displayLabel = t(`tiers.${tierKey}`)
          return (
            <span key={tier.label} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: tier.color }} />
              <span className="font-mono font-bold" style={{ color: tier.color }}>{displayLabel}</span>
              <span className="font-mono tabular-nums text-zinc-500">{formatNumber(count)}</span>
              <span className="font-mono tabular-nums text-zinc-600">({pct}%)</span>
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
  t: (key: string) => string
}

function PillarBars({ openness, price, vendors, process, external, t }: PillarBarsProps) {
  const pillars = [
    { key: 'openness', labelKey: 'pillars.apert', value: openness, max: PILLAR_MAXES.openness },
    { key: 'price',    labelKey: 'pillars.prec',  value: price,    max: PILLAR_MAXES.price    },
    { key: 'vendors',  labelKey: 'pillars.prov',  value: vendors,  max: PILLAR_MAXES.vendors  },
    { key: 'process',  labelKey: 'pillars.proc',  value: process,  max: PILLAR_MAXES.process  },
    { key: 'external', labelKey: 'pillars.ext',   value: external, max: PILLAR_MAXES.external },
  ]

  return (
    <div className="space-y-1" aria-label={t('pillarsChart.ariaLabel')}>
      {pillars.map(({ key, labelKey, value, max }) => {
        const pct = Math.min((value / max) * 100, 100)
        const color = pct > 70 ? '#4ade80' : pct > 40 ? '#fbbf24' : '#f87171'
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-zinc-600 w-8 flex-shrink-0">{t(labelKey)}</span>
            {(() => {
              const N = 14, DR = 1.5, DG = 4
              const filled = Math.max(1, Math.round((pct / 100) * N))
              return (
                <svg viewBox={`0 0 ${N * DG} 4`} className="flex-1" style={{ height: 4 }} preserveAspectRatio="none" aria-hidden="true">
                  {Array.from({ length: N }).map((_, k) => (
                    <circle key={k} cx={k * DG + DR} cy={2} r={DR}
                      fill={k < filled ? color : '#f3f1ec'}
                      stroke={k < filled ? undefined : '#e2ddd6'}
                      strokeWidth={k < filled ? 0 : 0.5}
                      fillOpacity={k < filled ? 0.85 : 1}
                    />
                  ))}
                </svg>
              )
            })()}
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

function TrendIcon({ direction, t }: { direction: string | null; t: (key: string) => string }) {
  if (direction === 'improving') return <TrendingUp className="h-3 w-3 text-green-400" aria-label={t('trend.improving')} />
  if (direction === 'declining') return <TrendingDown className="h-3 w-3 text-red-400" aria-label={t('trend.declining')} />
  return <Minus className="h-3 w-3 text-zinc-600" aria-label={t('trend.stable')} />
}

// ---------------------------------------------------------------------------
// Institution card — redesigned: score as hero, tier badge, no letter grade
// ---------------------------------------------------------------------------

interface InstitutionCardProps {
  item: InstitutionScorecardItem
  onNavigate: (id: number) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

function InstitutionCard({ item, onNavigate, t }: InstitutionCardProps) {
  const tier = gradeToTier(item.grade)
  const hasRedSignals = (item.signal_count_red ?? 0) > 0
  const tierKey = tier.label as string

  return (
    <article
      className="group flex flex-col rounded-sm border overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-white/20"
      style={{
        borderColor: tier.border,
        backgroundColor: 'rgba(24,24,27,0.70)',
      }}
      onClick={() => onNavigate(item.institution_id)}
    >
      {/* Top accent strip */}
      <div className="h-1 w-full flex-shrink-0" style={{ backgroundColor: tier.color }} aria-hidden="true" />

      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Header: large score number + tier badge */}
        <div className="flex items-start justify-between gap-2">
          {/* Large score number (hero display) */}
          <div className="flex flex-col">
            <span
              className="text-4xl font-black font-mono tabular-nums leading-none"
              style={{ color: tier.color }}
            >
              {item.total_score.toFixed(0)}
            </span>
            <span className="text-[9px] text-zinc-600 font-mono mt-0.5">{t('table.outOf')}</span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Tier badge */}
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wide"
              style={{
                backgroundColor: tier.bg,
                border: `1px solid ${tier.border}`,
                color: tier.color,
              }}
            >
              {t(`tiers.${tierKey}`)}
            </span>

            {/* Red signal badge */}
            {hasRedSignals && (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20"
                aria-label={t('aria.redAlerts', { count: item.signal_count_red })}
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

        {/* Percentile + trend */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
            {t('table.percentile', { n: Math.round((item.national_percentile ?? 0) * 100) })}
          </span>
          <div className="flex items-center gap-1.5">
            <TrendIcon direction={item.trend_direction} t={t} />
          </div>
        </div>

        {/* Pillar mini-bars */}
        <PillarBars
          openness={item.pillar_openness}
          price={item.pillar_price}
          vendors={item.pillar_vendors}
          process={item.pillar_process}
          external={item.pillar_external}
          t={t}
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
        style={{ borderColor: tier.border, color: tier.color }}
        onClick={(e) => { e.stopPropagation(); onNavigate(item.institution_id) }}
        aria-label={t('aria.profileLink', { name: item.institution_name })}
        tabIndex={-1}
      >
        {t('table.viewProfile')}
      </button>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Card skeleton
// ---------------------------------------------------------------------------

function InstitutionCardSkeleton() {
  return (
    <div className="rounded-sm border border-white/8 bg-zinc-900/60 overflow-hidden">
      <div className="h-1 w-full bg-zinc-800" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-2 w-8" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
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
// Tier filter chip
// ---------------------------------------------------------------------------

interface TierChipProps {
  tierName: string
  active: boolean
  count: number
  onClick: () => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

function TierChip({ tierName, active, count, onClick, t }: TierChipProps) {
  const tier = TIER_MAP[tierName] ?? TIER_MAP.Critico
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-mono font-bold uppercase tracking-wide transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 border-2"
      style={{
        backgroundColor: active ? tier.color : tier.bg,
        borderColor: tier.color,
        color: active ? '#000' : tier.color,
        boxShadow: active ? `0 0 20px ${tier.color}60` : 'none',
      }}
      aria-pressed={active}
      aria-label={t('aria.filterTier', { tier: tierName, count })}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? '#000' : tier.color }} aria-hidden="true" />
      {t(`tiers.${tierName}`)}
      <span
        className="text-[10px] font-bold font-mono tabular-nums px-1.5 py-0.5 rounded"
        style={{
          backgroundColor: active ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.05)',
          color: active ? '#000' : tier.color,
          opacity: active ? 0.8 : 0.9,
        }}
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
  const { t } = useTranslation('institutionScorecards')
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('total_score')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const handleNavigate = useCallback((id: number) => {
    navigate(`/institutions/${id}`)
  }, [navigate])

  // Map selected tier to backend grade for API call
  const gradeForApi = selectedTier ? TIER_GRADE_MAP[selectedTier]?.[0] : undefined

  // Stats query
  const { data: stats, isLoading: statsLoading } = useQuery<InstitutionStats>({
    queryKey: ['scorecard-institution-stats'],
    queryFn: () => scorecardApi.getInstitutionStats(),
    staleTime: 10 * 60 * 1000,
  })

  // List query
  const { data: listData, isLoading: listLoading, isPlaceholderData } = useQuery<ScorecardListResponse>({
    queryKey: ['scorecard-institutions', page, gradeForApi, sortBy, sortOrder, search],
    queryFn: () =>
      scorecardApi.getInstitutions({
        page,
        per_page: PER_PAGE,
        grade: gradeForApi ?? undefined,
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
  const tierDistribution = aggregateTiers(gradeDistribution)

  function handleTierClick(tierName: string) {
    if (selectedTier === tierName) {
      setSelectedTier(null)
    } else {
      setSelectedTier(tierName)
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

  const topName = stats?.top_institution_name ?? '--'
  const topScore = stats?.top_institution_score
  const worstName = stats?.worst_institution_name ?? '--'
  const worstScore = stats?.worst_institution_score

  const totalScored = stats?.total_scored ?? 2563

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <EditorialPageShell
        kicker="INSTITUTION SCORECARDS · ACCOUNTABILITY INDEX"
        headline={<>Who governs Mexico&rsquo;s money?</>}
        paragraph={
          <>
            {t('description')}{' '}
            <span className="text-text-muted">
              {formatNumber(totalScored)} institutions evaluated across five transparency pillars:
              apertura, precio, proveedores, proceso y se&ntilde;ales externas.
            </span>
          </>
        }
        stats={statsLoading ? undefined : [
          {
            value: formatNumber(totalScored),
            label: t('stats.evaluated'),
            color: '#6366f1',
            sub: t('stats.federal'),
          },
          {
            value: topScore != null ? topScore.toFixed(1) : '--',
            label: t('stats.best'),
            color: '#34d399',
            sub: topName.length > 32 ? topName.slice(0, 32) + '...' : topName,
          },
          {
            value: worstScore != null ? worstScore.toFixed(1) : '--',
            label: t('stats.weakest'),
            color: '#dc2626',
            sub: worstName.length > 32 ? worstName.slice(0, 32) + '...' : worstName,
          },
          {
            value: stats?.median_score != null ? stats.median_score.toFixed(1) : '--',
            label: t('stats.median'),
            color: '#fbbf24',
            sub: t('stats.outOf100'),
          },
        ]}
        severity="high"
        loading={statsLoading}
      >

        {/* ── ACT I: THE GRADES ── */}
        <Act number="I" label="THE GRADES" className="space-y-6">

          {/* Explainer context */}
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-violet-400 mb-1">
              HALLAZGO
            </p>
            <p className="text-sm text-text-secondary leading-relaxed">
              {t('note')}
            </p>
          </div>

          {/* Tier distribution bar */}
          <section
            className="rounded-sm border border-white/8 bg-zinc-900/60 p-5"
            aria-label={t('aria.distributionSection')}
          >
            {statsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-2.5 w-48" />
                <Skeleton className="h-7 w-full rounded-lg" />
                <div className="flex gap-4 flex-wrap">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-3 w-24" />
                  ))}
                </div>
              </div>
            ) : (
              <TierDistributionBar distribution={gradeDistribution} t={t} />
            )}
          </section>
        </Act>

        {/* ── ACT II: THE COMPARISON ── */}
        <Act number="II" label="THE COMPARISON" className="space-y-4 mt-10">

        {/* -- FILTER BAR ------------------------------------------------- */}
        <section className="space-y-4" aria-label={t('aria.filters')}>
          {/* Tier chips — prominent filter row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-zinc-400 mr-1">
              {t('filters.byLevel')}
            </span>
            <button
              onClick={() => { setSelectedTier(null); setPage(1) }}
              className={`rounded-lg px-4 py-2 text-xs font-mono font-bold uppercase tracking-wide transition-all duration-150 border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                selectedTier === null
                  ? 'bg-white text-zinc-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                  : 'bg-transparent text-zinc-300 border-white/20 hover:border-white/40'
              }`}
              aria-pressed={selectedTier === null}
            >
              {t('tiers.all')}
            </button>
            {TIER_NAMES.map((tierName) => {
              const tierData = tierDistribution.find(td => td.tier.label === tierName)
              return (
                <TierChip
                  key={tierName}
                  tierName={tierName}
                  active={selectedTier === tierName}
                  count={tierData?.count ?? 0}
                  onClick={() => handleTierClick(tierName)}
                  t={t}
                />
              )
            })}
          </div>

          {/* Sort + Search row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Sort controls */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-zinc-500">
                {t('filters.sort')}
              </span>
              {(
                [
                  { key: 'total_score' as SortKey, labelKey: 'filters.sortScore' },
                  { key: 'national_percentile' as SortKey, labelKey: 'filters.sortPercentile' },
                  { key: 'institution_name' as SortKey, labelKey: 'filters.sortName' },
                ] as const
              ).map(({ key, labelKey }) => {
                const label = t(labelKey)
                const dirLabel = sortBy === key
                  ? (sortOrder === 'desc' ? t('aria.sortDesc') : t('aria.sortAsc'))
                  : ''
                return (
                  <button
                    key={key}
                    onClick={() => handleSortChange(key)}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-mono font-semibold border transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                      sortBy === key
                        ? 'bg-zinc-700 border-white/20 text-white'
                        : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300'
                    }`}
                    aria-pressed={sortBy === key}
                    aria-label={t('aria.sortBy', { label, direction: dirLabel })}
                  >
                    {label}
                    {sortBy === key && (
                      <span className="text-[9px]">{sortOrder === 'desc' ? '\u2193' : '\u2191'}</span>
                    )}
                  </button>
                )
              })}
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
                  placeholder={t('filters.search')}
                  className="w-full rounded-lg border border-white/10 bg-zinc-800/80 pl-8 pr-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-colors"
                  aria-label={t('aria.searchByName')}
                />
              </div>
              <button
                type="submit"
                className="rounded-lg border border-white/10 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-white/20 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                {t('filters.go')}
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                  aria-label={t('aria.clearSearch')}
                >
                  {t('filters.clear')}
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
                {t('pagination.showing', {
                  from: formatNumber(Math.min(PER_PAGE, institutions.length)),
                  total: formatNumber(totalCount),
                })}
                {selectedTier && (
                  <>{t('pagination.withTier')}<span className="font-bold" style={{ color: TIER_MAP[selectedTier]?.color ?? '#dc2626' }}>{t(`tiers.${selectedTier}`)}</span></>
                )}
                {search && <>{t('pagination.matching')}<span className="text-zinc-300">{search}</span>&quot;</>}
              </>
            )}
          </p>
        </section>

        {/* -- CARD GRID -------------------------------------------------- */}
        <section aria-label={t('aria.cards')} aria-busy={listLoading}>
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
                    <InstitutionCard item={item} onNavigate={handleNavigate} t={t} />
                  </div>
                ))}
          </div>

          {/* Empty state */}
          {!listLoading && institutions.length === 0 && (
            <div
              role="alert"
              className="rounded-sm border border-white/8 bg-zinc-900/60 p-12 text-center"
            >
              <Building2 className="h-8 w-8 text-zinc-700 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-zinc-500">{t('noResults')}</p>
              <button
                onClick={() => { setSelectedTier(null); setSearch(''); setSearchInput(''); setPage(1) }}
                className="mt-3 text-xs text-zinc-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 underline"
                aria-label={t('aria.clearFilters')}
              >
                {t('aria.clearFilters')}
              </button>
            </div>
          )}
        </section>

        </Act>

        {/* ── ACT III: THE DEEPER RECORD ── */}
        <Act number="III" label="THE DEEPER RECORD" className="space-y-4 mt-10">

        {/* -- PAGINATION ------------------------------------------------- */}
        {totalPages > 1 && (
          <nav
            className="flex items-center justify-between"
            aria-label={t('pagination.ariaLabel')}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800/80 px-4 py-2 text-sm font-semibold text-zinc-300 hover:border-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label={t('pagination.previous')}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t('pagination.previous')}
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
                    aria-label={t('pagination.pageLabel', { n: pageNum })}
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
              aria-label={t('pagination.next')}
            >
              {t('pagination.next')}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        )}

        {/* Footer note — context footnote */}
        <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-amber-400/70 mb-1">
            {t('footnotes.title')}
          </p>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            {t('footnotes.scoring')} {t('footnotes.minContracts')}
          </p>
        </div>

        </Act>

      </EditorialPageShell>
    </div>
  )
}
