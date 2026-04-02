/**
 * COLLUSION EXPLORER — Bid-Rigging Pattern Analysis
 *
 * Editorial redesign: methodology explainer, hero stats, pair cards with
 * connection visualization, pattern legend, contextual empty/error states.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Users,
  GitMerge,
  ArrowUpDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Shield,
  MapPin,
  HelpCircle,
} from 'lucide-react'
import { collusionApi } from '@/api/client'
import type { CollusionPair, CollusionStats } from '@/api/types'
import { formatNumber } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SortField = 'shared_procedures' | 'co_bid_rate'

const DEFAULT_MIN_SHARED = 10
const DEFAULT_SORT: SortField = 'shared_procedures'
const DEFAULT_PER_PAGE = 50

// Co-bid rate severity
function rateClass(rate: number): { text: string; bg: string; border: string; dot: string } {
  if (rate >= 80) return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500' }
  if (rate >= 50) return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-500' }
  return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500' }
}

// ---------------------------------------------------------------------------
// Methodology Callout
// ---------------------------------------------------------------------------

function MethodologyCallout() {
  const { t } = useTranslation('collusion')
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 mb-8">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-amber-400 mb-2">
        {t('methodology.title')}
      </p>
      <p className="text-sm text-zinc-300 leading-relaxed">
        {t('methodology.body')}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hero Stats Strip
// ---------------------------------------------------------------------------

function HeroStats({ stats, loading }: { stats: CollusionStats | undefined; loading: boolean }) {
  const { t } = useTranslation('collusion')

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  const items: Array<{
    value: string
    label: string
    sub: string
    icon: React.ElementType
    accent?: boolean
  }> = [
    {
      value: formatNumber(stats.total_pairs),
      label: t('stats.totalPairs'),
      sub: t('stats.totalPairsSub'),
      icon: Users,
    },
    {
      value: formatNumber(stats.potential_collusion_count),
      label: t('stats.flaggedPairs'),
      sub: t('stats.flaggedPairsSub'),
      icon: AlertTriangle,
      accent: true,
    },
    {
      value: formatNumber(stats.total_shared_procedures),
      label: t('stats.sharedProcedures'),
      sub: t('stats.sharedProceduresSub'),
      icon: GitMerge,
    },
    {
      value: `${stats.max_co_bid_rate.toFixed(1)}%`,
      label: t('stats.maxRate'),
      sub: t('stats.maxRateSub'),
      icon: ArrowUpDown,
      accent: true,
    },
  ]

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      role="region"
      aria-label="Collusion statistics"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-xl border p-4 ${
            item.accent
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-zinc-800 bg-zinc-900/60'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <item.icon
              className={`h-3.5 w-3.5 ${item.accent ? 'text-red-400' : 'text-zinc-500'}`}
              aria-hidden="true"
            />
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500">
              {item.label}
            </span>
          </div>
          <div
            className={`text-3xl font-mono font-bold ${
              item.accent ? 'text-red-400' : 'text-zinc-100'
            }`}
          >
            {item.value}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">{item.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pattern Legend
// ---------------------------------------------------------------------------

function PatternLegend() {
  const { t } = useTranslation('collusion')

  const patterns: Array<{
    icon: React.ElementType
    name: string
    desc: string
    color: string
  }> = [
    { icon: Repeat, name: t('patterns.bidRotation'), desc: t('patterns.bidRotationDesc'), color: 'text-red-400' },
    { icon: Shield, name: t('patterns.coverBidding'), desc: t('patterns.coverBiddingDesc'), color: 'text-orange-400' },
    { icon: MapPin, name: t('patterns.marketAllocation'), desc: t('patterns.marketAllocationDesc'), color: 'text-amber-400' },
    { icon: HelpCircle, name: t('patterns.unknown'), desc: t('patterns.unknownDesc'), color: 'text-zinc-400' },
  ]

  return (
    <div className="mb-8">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
        {t('patterns.title')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {patterns.map((p) => (
          <div key={p.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="flex items-center gap-2 mb-1">
              <p.icon className={`h-3.5 w-3.5 ${p.color}`} aria-hidden="true" />
              <span className={`text-xs font-semibold ${p.color}`}>{p.name}</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

function Filters({
  flaggedOnly,
  setFlaggedOnly,
  minShared,
  setMinShared,
  sortBy,
  setSortBy,
  onReset,
}: {
  flaggedOnly: boolean
  setFlaggedOnly: (v: boolean) => void
  minShared: number
  setMinShared: (v: number) => void
  sortBy: SortField
  setSortBy: (v: SortField) => void
  onReset: () => void
}) {
  const { t } = useTranslation('collusion')

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40">
      {/* Flagged-only toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="sr-only peer"
            aria-label={t('filters.showFlaggedOnly')}
          />
          <div className="w-9 h-5 bg-zinc-800 border border-zinc-700 rounded-full peer peer-checked:bg-red-700 peer-focus-visible:ring-2 peer-focus-visible:ring-red-500 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm text-zinc-400">{t('filters.showFlaggedOnly')}</span>
      </label>

      {/* Divider */}
      <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

      {/* Min shared procedures */}
      <div className="flex items-center gap-2">
        <label htmlFor="min-shared-input" className="text-xs text-zinc-500 whitespace-nowrap font-mono uppercase tracking-wide">
          {t('filters.minShared')}
        </label>
        <input
          id="min-shared-input"
          type="number"
          min={1}
          max={500}
          value={minShared}
          onChange={(e) => setMinShared(Math.max(1, Number(e.target.value)))}
          className="w-20 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm font-mono px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        />
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

      {/* Sort by */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-xs text-zinc-500 whitespace-nowrap font-mono uppercase tracking-wide">
          {t('filters.sortBy')}
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        >
          <option value="shared_procedures">{t('filters.sortShared')}</option>
          <option value="co_bid_rate">{t('filters.sortRate')}</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="ml-auto text-[10px] font-mono uppercase tracking-wide text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        {t('filters.reset')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pair Card
// ---------------------------------------------------------------------------

function PairCard({ pair }: { pair: CollusionPair }) {
  const navigate = useNavigate()
  const { t } = useTranslation('collusion')
  const rc = rateClass(pair.co_bid_rate)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900/80 transition-colors p-4">
      {/* Top row: vendor A <---> vendor B with rate in center */}
      <div className="flex items-start gap-3">
        {/* Vendor A */}
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/vendors/${pair.vendor_id_a}`)}
            className="text-sm font-semibold text-zinc-100 hover:text-blue-400 transition-colors truncate block max-w-full text-left"
            title={pair.vendor_name_a}
          >
            {pair.vendor_name_a}
          </button>
          <span className="text-[10px] font-mono text-zinc-600">
            {formatNumber(pair.vendor_a_procedures)} {t('table.proceduresLabel')}
          </span>
        </div>

        {/* Connection indicator */}
        <div className="flex flex-col items-center pt-0.5 shrink-0">
          <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${rc.bg} border ${rc.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${rc.dot} ${pair.co_bid_rate >= 80 ? 'animate-pulse' : ''}`} />
            <span className={`text-lg font-mono font-bold ${rc.text}`}>
              {pair.co_bid_rate.toFixed(1)}%
            </span>
          </div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mt-1">
            {t('pairCard.coBidRate')}
          </span>
        </div>

        {/* Vendor B */}
        <div className="flex-1 min-w-0 text-right">
          <button
            type="button"
            onClick={() => navigate(`/vendors/${pair.vendor_id_b}`)}
            className="text-sm font-semibold text-zinc-100 hover:text-blue-400 transition-colors truncate block max-w-full text-right ml-auto"
            title={pair.vendor_name_b}
          >
            {pair.vendor_name_b}
          </button>
          <span className="text-[10px] font-mono text-zinc-600">
            {formatNumber(pair.vendor_b_procedures)} {t('table.proceduresLabel')}
          </span>
        </div>
      </div>

      {/* Bottom row: shared procedures + status + links */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/60">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xl font-mono font-bold text-zinc-200">
              {formatNumber(pair.shared_procedures)}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-600 ml-1.5">
              {t('pairCard.sharedProc')}
            </span>
          </div>

          {pair.is_potential_collusion && (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
              {t('table.flagged')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {pair.is_potential_collusion && (
            <button
              type="button"
              onClick={() => navigate(`/thread/${pair.vendor_id_a}`)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wide bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Thread
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/vendors/${pair.vendor_id_a}`)}
            className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-zinc-500 hover:text-amber-400 transition-colors"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            A
          </button>
          <button
            type="button"
            onClick={() => navigate(`/vendors/${pair.vendor_id_b}`)}
            className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-zinc-500 hover:text-amber-400 transition-colors"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            B
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card Skeleton
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  const { t } = useTranslation('collusion')
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <Users className="h-8 w-8 text-zinc-700 mx-auto mb-3" aria-hidden="true" />
      <p className="text-sm font-semibold text-zinc-300 mb-1">{t('empty.title')}</p>
      <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">{t('empty.body')}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

function ErrorState() {
  const { t } = useTranslation('collusion')
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" aria-hidden="true" />
      <p className="text-sm font-semibold text-red-300 mb-1">{t('error.title')}</p>
      <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">{t('error.body')}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CollusionExplorer() {
  const { t } = useTranslation('collusion')

  const [flaggedOnly, setFlaggedOnly] = useState(true)
  const [minShared, setMinShared] = useState(DEFAULT_MIN_SHARED)
  const [sortBy, setSortBy] = useState<SortField>(DEFAULT_SORT)
  const [page, setPage] = useState(1)

  // Reset page when filters change
  const handleFlaggedOnly = (v: boolean) => { setFlaggedOnly(v); setPage(1) }
  const handleMinShared = (v: number) => { setMinShared(v); setPage(1) }
  const handleSortBy = (v: SortField) => { setSortBy(v); setPage(1) }
  const handleReset = () => {
    setFlaggedOnly(true)
    setMinShared(DEFAULT_MIN_SHARED)
    setSortBy(DEFAULT_SORT)
    setPage(1)
  }

  const queryParams = useMemo(
    () => ({
      is_potential_collusion: flaggedOnly ? true : undefined,
      min_shared_procedures: minShared,
      sort_by: sortBy,
      page,
      per_page: DEFAULT_PER_PAGE,
    }),
    [flaggedOnly, minShared, sortBy, page],
  )

  const {
    data: pairsData,
    isLoading: pairsLoading,
    isError: pairsError,
  } = useQuery({
    queryKey: ['collusion-pairs', queryParams],
    queryFn: () => collusionApi.getPairs(queryParams),
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['collusion-stats'],
    queryFn: () => collusionApi.getStats(),
    staleTime: 30 * 60 * 1000,
  })

  const pairs: CollusionPair[] = pairsData?.data ?? []
  const pagination = pairsData?.pagination
  const totalPages = pagination?.total_pages ?? 1
  const total = pagination?.total ?? 0

  const showingFrom = total === 0 ? 0 : (page - 1) * DEFAULT_PER_PAGE + 1
  const showingTo = Math.min(page * DEFAULT_PER_PAGE, total)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ── Editorial Header ── */}
      <div className="border-b border-zinc-800 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
            {t('editorial.section')}
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-zinc-100 leading-tight mb-3"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('title')}
          </h1>
          <p className="text-base text-zinc-400 leading-relaxed max-w-3xl">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Methodology ── */}
        <MethodologyCallout />

        {/* ── Hero Stats ── */}
        <HeroStats stats={stats} loading={statsLoading} />

        {/* ── Pattern Legend ── */}
        <PatternLegend />

        {/* ── Filters ── */}
        <Filters
          flaggedOnly={flaggedOnly}
          setFlaggedOnly={handleFlaggedOnly}
          minShared={minShared}
          setMinShared={handleMinShared}
          sortBy={sortBy}
          setSortBy={handleSortBy}
          onReset={handleReset}
        />

        {/* ── Showing count ── */}
        {!pairsLoading && !pairsError && total > 0 && (
          <p className="text-[10px] font-mono uppercase tracking-wide text-zinc-600 mb-4" aria-live="polite">
            {t('pagination.showing', {
              from: showingFrom,
              to: showingTo,
              total: formatNumber(total),
            })}
          </p>
        )}

        {/* ── Pair Cards ── */}
        {pairsLoading ? (
          <CardSkeleton />
        ) : pairsError ? (
          <ErrorState />
        ) : pairs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {pairs.map((pair) => (
              <PairCard
                key={`${pair.vendor_id_a}-${pair.vendor_id_b}`}
                pair={pair}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between mt-8 pt-4 border-t border-zinc-800"
            role="navigation"
            aria-label="Pagination"
          >
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wide border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={t('pagination.previous')}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t('pagination.previous')}
            </button>

            <span className="text-[10px] font-mono text-zinc-600" aria-live="polite">
              {t('pagination.pageOf', { page, total: totalPages })}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wide border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={t('pagination.next')}
            >
              {t('pagination.next')}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── Source footnote ── */}
        <p className="text-[10px] text-zinc-700 mt-8 text-center">
          COMPRANET 2010-2025 &middot; co_bidding_stats &middot; RUBLI v6.5
        </p>
      </div>
    </div>
  )
}
