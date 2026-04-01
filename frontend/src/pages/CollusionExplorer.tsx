/**
 * COLLUSION EXPLORER — Bid-Rigging Pattern Analysis
 *
 * Displays co-bidding pairs from the co_bidding_stats table with filtering,
 * sorting, and pagination. Pairs flagged as potential collusion are highlighted.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Users,
  GitMerge,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react'
import { collusionApi } from '@/api/client'
import type { CollusionPair, CollusionStats } from '@/api/types'
import { formatNumber } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortField = 'shared_procedures' | 'co_bid_rate'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  sub,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string
  sub: string
  value: string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-4 flex flex-col gap-1 ${
        accent
          ? 'border-red-800 bg-red-950/30'
          : 'border-border bg-background-elevated/60'
      }`}
    >
      <div className="flex items-center gap-2 text-text-muted text-xs font-mono uppercase tracking-wider">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <div
        className={`text-2xl font-bold tabular-nums ${
          accent ? 'text-red-400' : 'text-text-primary'
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-text-muted">{sub}</div>
    </div>
  )
}

function CollusionBadge({ flagged }: { flagged: boolean }) {
  const { t } = useTranslation('collusion')
  if (flagged) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold bg-red-950/60 text-red-400 border border-red-800"
        aria-label={t('table.flagged')}
      >
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        {t('table.flagged')}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-background-elevated text-text-muted border border-border"
      aria-label={t('table.monitored')}
    >
      {t('table.monitored')}
    </span>
  )
}

function VendorLink({
  id,
  name,
}: {
  id: number
  name: string
}) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(`/vendors/${id}`)}
      className="text-left text-sm font-medium text-text-primary hover:text-blue-400 hover:underline transition-colors max-w-[220px] truncate"
      title={name}
    >
      {name}
    </button>
  )
}

function StatsRow({
  stats,
  loading,
}: {
  stats: CollusionStats | undefined
  loading: boolean
}) {
  const { t } = useTranslation('collusion')

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      role="region"
      aria-label="Collusion statistics"
    >
      <StatCard
        label={t('stats.totalPairs')}
        sub={t('stats.totalPairsSub')}
        value={formatNumber(stats.total_pairs)}
        icon={Users}
      />
      <StatCard
        label={t('stats.flaggedPairs')}
        sub={t('stats.flaggedPairsSub')}
        value={formatNumber(stats.potential_collusion_count)}
        icon={AlertTriangle}
        accent
      />
      <StatCard
        label={t('stats.sharedProcedures')}
        sub={t('stats.sharedProceduresSub')}
        value={formatNumber(stats.total_shared_procedures)}
        icon={GitMerge}
      />
      <StatCard
        label={t('stats.maxRate')}
        sub={t('stats.maxRateSub')}
        value={`${stats.max_co_bid_rate.toFixed(1)}%`}
        icon={ArrowUpDown}
        accent
      />
    </div>
  )
}

function FiltersRow({
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
    <div className="flex flex-wrap items-center gap-4 mb-4 p-3 rounded-lg border border-border bg-background-elevated/40">
      {/* Flagged-only toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div className="relative inline-flex items-center">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => {
              setFlaggedOnly(e.target.checked)
            }}
            className="sr-only peer"
            aria-label={t('filters.showFlaggedOnly')}
          />
          <div className="w-9 h-5 bg-background-elevated border border-border rounded-full peer peer-checked:bg-red-700 peer-focus-visible:ring-2 peer-focus-visible:ring-red-500 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm text-text-secondary">{t('filters.showFlaggedOnly')}</span>
      </label>

      {/* Min shared procedures */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="min-shared-input"
          className="text-sm text-text-secondary whitespace-nowrap"
        >
          {t('filters.minShared')}:
        </label>
        <input
          id="min-shared-input"
          type="number"
          min={1}
          max={500}
          value={minShared}
          onChange={(e) => setMinShared(Math.max(1, Number(e.target.value)))}
          className="w-20 rounded border border-border bg-background-elevated text-text-primary text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Sort by */}
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-sm text-text-secondary whitespace-nowrap">
          {t('filters.sortBy')}:
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortField)}
          className="rounded border border-border bg-background-elevated text-text-primary text-sm px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="shared_procedures">{t('filters.sortShared')}</option>
          <option value="co_bid_rate">{t('filters.sortRate')}</option>
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="ml-auto text-xs text-text-muted hover:text-text-secondary underline"
      >
        Reset
      </button>
    </div>
  )
}

interface TableRowProps {
  pair: CollusionPair
}

function PairRow({ pair }: TableRowProps) {
  const rateColor =
    pair.co_bid_rate >= 80
      ? 'text-red-400'
      : pair.co_bid_rate >= 60
      ? 'text-orange-400'
      : 'text-text-secondary'

  return (
    <tr className="border-b border-border/50 hover:bg-background-elevated/30 transition-colors">
      <td className="px-4 py-3">
        <VendorLink id={pair.vendor_id_a} name={pair.vendor_name_a} />
        <div className="text-xs text-text-muted mt-0.5">
          {formatNumber(pair.vendor_a_procedures)} procedures
        </div>
      </td>
      <td className="px-4 py-3">
        <VendorLink id={pair.vendor_id_b} name={pair.vendor_name_b} />
        <div className="text-xs text-text-muted mt-0.5">
          {formatNumber(pair.vendor_b_procedures)} procedures
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums font-medium text-text-primary">
        {formatNumber(pair.shared_procedures)}
      </td>
      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${rateColor}`}>
        {pair.co_bid_rate.toFixed(1)}%
      </td>
      <td className="px-4 py-3 text-center">
        <CollusionBadge flagged={pair.is_potential_collusion} />
      </td>
    </tr>
  )
}

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          {Array.from({ length: 5 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const DEFAULT_MIN_SHARED = 10
const DEFAULT_SORT: SortField = 'shared_procedures'
const DEFAULT_PER_PAGE = 50

export default function CollusionExplorer() {
  const { t } = useTranslation('collusion')

  const [flaggedOnly, setFlaggedOnly] = useState(true)
  const [minShared, setMinShared] = useState(DEFAULT_MIN_SHARED)
  const [sortBy, setSortBy] = useState<SortField>(DEFAULT_SORT)
  const [page, setPage] = useState(1)

  // Reset page when filters change
  const handleFlaggedOnly = (v: boolean) => {
    setFlaggedOnly(v)
    setPage(1)
  }
  const handleMinShared = (v: number) => {
    setMinShared(v)
    setPage(1)
  }
  const handleSortBy = (v: SortField) => {
    setSortBy(v)
    setPage(1)
  }
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

  // Pagination helpers
  const showingFrom = total === 0 ? 0 : (page - 1) * DEFAULT_PER_PAGE + 1
  const showingTo = Math.min(page * DEFAULT_PER_PAGE, total)

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* ── Dark editorial header ── */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-3 mb-3">
            <div className="mt-0.5 p-1.5 rounded bg-red-950/60 border border-red-800">
              <GitMerge className="h-4 w-4 text-red-400" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-red-500 mb-1">
                {t('editorial.section')}
              </div>
              <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
              <p className="text-sm text-zinc-400 mt-1 max-w-2xl">{t('subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Stats cards ── */}
        <StatsRow stats={stats} loading={statsLoading} />

        {/* ── Methodology tooltip ── */}
        <div className="flex items-center gap-2 mb-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
                aria-label={t('tooltip.coBidRateTitle')}
              >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                {t('tooltip.coBidRateTitle')}
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-sm">
              {t('tooltip.coBidRateBody')}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ── Filters ── */}
        <FiltersRow
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
          <p className="text-xs text-text-muted mb-3" aria-live="polite">
            {t('pagination.showing', {
              from: showingFrom,
              to: showingTo,
              total: formatNumber(total),
            })}
          </p>
        )}

        {/* ── Table ── */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              aria-label="Co-bidding pairs"
              aria-busy={pairsLoading}
            >
              <thead className="bg-background-elevated border-b border-border">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider"
                  >
                    {t('table.vendorA')}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider"
                  >
                    {t('table.vendorB')}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold text-text-secondary text-xs uppercase tracking-wider"
                  >
                    {t('table.sharedProcedures')}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right font-semibold text-text-secondary text-xs uppercase tracking-wider"
                  >
                    {t('table.coBidRate')}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center font-semibold text-text-secondary text-xs uppercase tracking-wider"
                  >
                    {t('table.status')}
                  </th>
                </tr>
              </thead>

              {pairsLoading ? (
                <TableSkeleton />
              ) : pairsError ? (
                <tbody>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-text-muted"
                    >
                      <AlertTriangle
                        className="inline h-5 w-5 mr-2 text-red-400"
                        aria-hidden="true"
                      />
                      {t('error')}
                    </td>
                  </tr>
                </tbody>
              ) : pairs.length === 0 ? (
                <tbody>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-text-muted"
                    >
                      {t('empty')}
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody>
                  {pairs.map((pair) => (
                    <PairRow
                      key={`${pair.vendor_id_a}-${pair.vendor_id_b}`}
                      pair={pair}
                    />
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between mt-4"
            role="navigation"
            aria-label="Pagination"
          >
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded px-3 py-1.5 text-sm border border-border bg-background-elevated text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('pagination.previous')}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t('pagination.previous')}
            </button>

            <span className="text-xs text-text-muted" aria-live="polite">
              {t('pagination.pageOf', { page, total: totalPages })}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 rounded px-3 py-1.5 text-sm border border-border bg-background-elevated text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('pagination.next')}
            >
              {t('pagination.next')}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
