import { memo, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import ReactECharts from 'echarts-for-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTOR_COLORS, SECTORS, getSectorNameEN } from '@/lib/constants'
import { priceApi } from '@/api/client'
import type { PriceHypothesisItem, SectorPriceBaseline, PriceHypothesesFilterParams, MlAnomaliesResponse } from '@/api/client'
import {
  TrendingUp,
  AlertTriangle,
  Table2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Brain,
} from 'lucide-react'

// ─── MacroStatCard ───────────────────────────────────────────────────────────

function MacroStatCard({
  loading,
  label,
  value,
  detail,
  color,
  borderColor,
  sectorName,
}: {
  loading: boolean
  label: string
  value: string
  detail: string
  color: string
  borderColor: string
  sectorName?: string
}) {
  const sectorColor = sectorName ? SECTOR_COLORS[sectorName] : undefined

  return (
    <div className={`rounded-lg border bg-background-card p-4 ${borderColor}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">{label}</p>
      {loading ? (
        <Skeleton className="h-7 w-24 mb-1" />
      ) : (
        <p className={`text-xl font-bold tabular-nums ${color}`} style={sectorColor ? { color: sectorColor } : undefined}>
          {value}
        </p>
      )}
      <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{detail}</p>
    </div>
  )
}

const STALE_TIME = 10 * 60 * 1000
const PER_PAGE = 20

// ─── Confidence color palette (blue shades, avoids risk-color collision) ────

const CONFIDENCE_COLORS: Record<string, string> = {
  very_high: '#1d4ed8', // blue-700
  high: '#3b82f6',      // blue-500
  medium: '#93c5fd',    // blue-300
  low: '#94a3b8',       // slate-400 / gray
}

function confidenceColor(level: string): string {
  return CONFIDENCE_COLORS[level] ?? CONFIDENCE_COLORS.low
}

// ─── SectorAnomalyBar ────────────────────────────────────────────────────────

const SectorAnomalyBar = memo(function SectorAnomalyBar({
  data,
}: {
  data: Array<{ sector_name: string; count: number; total_flagged_value?: number }>
}) {
  const sorted = useMemo(() => [...data].sort((a, b) => a.count - b.count), [data])

  const option = useMemo(() => {
    const names = sorted.map((d) => getSectorNameEN(d.sector_name))
    const values = sorted.map((d) => ({
      value: d.count,
      itemStyle: { color: SECTOR_COLORS[d.sector_name] ?? '#64748b', opacity: 0.85 },
      extra: d,
    }))
    const maxCount = Math.max(...sorted.map((d) => d.count), 1)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0
          const row = sorted[idx]
          return `<strong>${params[0]?.name}</strong><br/>${formatNumber(params[0]?.value)} anomalies${row?.total_flagged_value ? `<br/>${formatCompactMXN(row.total_flagged_value)} flagged` : ''}`
        },
      },
      grid: { left: 110, right: 70, top: 4, bottom: 4, containLabel: false },
      xAxis: { type: 'value', show: false, max: maxCount * 1.25 },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: { fontSize: 11, color: '#9ca3af' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: values,
        barMaxWidth: 16,
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          color: '#9ca3af',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (p: any) => formatNumber(p.value),
        },
      }],
    }
  }, [sorted])

  return (
    <ReactECharts
      option={option}
      style={{ height: `${Math.max(sorted.length * 30, 100)}px` }}
      opts={{ renderer: 'svg' }}
    />
  )
})

// ─── TopAnomalyCard ──────────────────────────────────────────────────────────

function TopAnomalyCard({ item }: { item: PriceHypothesisItem }) {
  const sectorCode = item.sector_id
    ? SECTORS.find((s) => s.id === item.sector_id)?.code
    : undefined
  const sectorColor = sectorCode ? SECTOR_COLORS[sectorCode] : '#64748b'
  const confColor = confidenceColor(item.confidence_level ?? 'low')
  const isExtreme = item.hypothesis_type === 'extreme_overpricing'

  return (
    <div className={`rounded-lg border p-3 bg-surface-card/30 ${isExtreme ? 'border-risk-critical/25 bg-risk-critical/5' : 'border-risk-high/20'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-text-muted">#{item.contract_id}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          isExtreme ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
        }`}>
          {isExtreme ? 'Extreme' : 'Outlier'}
        </span>
      </div>
      <p className="text-sm font-bold text-text-primary tabular-nums">
        {item.amount_mxn != null ? formatCompactMXN(item.amount_mxn) : '—'}
      </p>
      <div className="flex items-center gap-1.5 mt-1.5 mb-2">
        <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: sectorColor }} />
        <span className="text-[10px] text-text-muted">{sectorCode ? getSectorNameEN(sectorCode) : '—'}</span>
      </div>
      <div>
        <div className="flex justify-between mb-0.5">
          <span className="text-[10px] text-text-muted">Confidence</span>
          <span className="text-[10px] tabular-nums font-semibold" style={{ color: confColor }}>
            {(item.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${item.confidence * 100}%`, backgroundColor: confColor }} />
        </div>
      </div>
    </div>
  )
}

// ─── Small helpers ──────────────────────────────────────────────────────────

function formatTypeName(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function PriceIntelligence() {
  const { t } = useTranslation('price')

  // ── Filter state ────────────────────────────────────────────────────────
  const [hypothesisType, setHypothesisType] = useState<string>('all')
  const [confidenceLevel, setConfidenceLevel] = useState<string>('all')
  const [sectorId, setSectorId] = useState<number | undefined>(undefined)
  const [reviewStatus, setReviewStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('confidence')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  // ── Expanded row + inline review state ─────────────────────────────────
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [pendingValid, setPendingValid] = useState<boolean | null>(null)

  const queryClient = useQueryClient()

  // ── Build filter params ─────────────────────────────────────────────────
  const filterParams: PriceHypothesesFilterParams = useMemo(() => {
    const p: PriceHypothesesFilterParams = {
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      per_page: PER_PAGE,
    }
    if (hypothesisType !== 'all') p.hypothesis_type = hypothesisType
    if (confidenceLevel !== 'all') p.confidence_level = confidenceLevel
    if (sectorId !== undefined) p.sector_id = sectorId
    if (reviewStatus === 'pending') p.is_reviewed = false
    if (reviewStatus === 'reviewed') p.is_reviewed = true
    return p
  }, [hypothesisType, confidenceLevel, sectorId, reviewStatus, sortBy, sortOrder, page])

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: priceSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['price-hypotheses-summary'],
    queryFn: () => priceApi.getSummary(),
    staleTime: STALE_TIME,
  })

  const { data: hypothesesData, isLoading: hypothesesLoading } = useQuery({
    queryKey: ['price-hypotheses', filterParams],
    queryFn: () => priceApi.getHypotheses(filterParams),
    staleTime: STALE_TIME,
  })

  const { data: baselines, isLoading: baselinesLoading } = useQuery({
    queryKey: ['price-baselines'],
    queryFn: () => priceApi.getBaselines(),
    staleTime: STALE_TIME,
  })

  // ── Detail query (lazy, only when a row is expanded) ─────────────────────
  const { data: expandedDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['price-hypothesis-detail', expandedId],
    queryFn: () => {
      const item = hypothesesData?.data.find((h) => h.id === expandedId)
      if (!item) return null
      return priceApi.getHypothesisDetail(item.hypothesis_id)
    },
    staleTime: STALE_TIME,
    enabled: expandedId !== null && !!hypothesesData?.data,
  })

  // ── ML anomaly detections (Isolation Forest, only_new = IQR-missed) ─────
  const { data: mlAnomaliesData } = useQuery<MlAnomaliesResponse>({
    queryKey: ['price-ml-anomalies', sectorId],
    queryFn: () => priceApi.getMlAnomalies({ sector_id: sectorId, only_new: true, limit: 10 }),
    staleTime: 30 * 60 * 1000,
  })

  // ── Review mutation ───────────────────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: ({ hypothesisId, isValid, notes }: { hypothesisId: string; isValid: boolean; notes?: string }) =>
      priceApi.reviewHypothesis(hypothesisId, isValid, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-hypotheses'] })
      queryClient.invalidateQueries({ queryKey: ['price-hypotheses-summary'] })
      setReviewingId(null)
      setReviewNotes('')
      setPendingValid(null)
    },
  })

  // ── Derived summary stats ─────────────────────────────────────────────────
  const totalHypotheses = priceSummary?.overall?.total_hypotheses ?? 0
  const pendingCount = priceSummary?.overall?.pending_review ?? 0
  const totalFlaggedValue = priceSummary?.overall?.total_flagged_value ?? 0
  const avgConfidence = priceSummary?.overall?.avg_confidence ?? 0

  // ── Sorted baselines ──────────────────────────────────────────────────────
  const sortedBaselines = useMemo(() => {
    if (!baselines) return []
    return [...baselines].sort((a, b) => b.percentile_50 - a.percentile_50)
  }, [baselines])

  // ── Pagination ────────────────────────────────────────────────────────────
  const pagination = hypothesesData?.pagination
  const totalPages = pagination?.total_pages ?? 1

  function handleSortChange(field: string) {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  function resetPage() {
    setPage(1)
  }

  function handleRowClick(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
    setReviewingId(null)
    setReviewNotes('')
    setPendingValid(null)
  }

  function startReview(id: number, isValid: boolean, e: React.MouseEvent) {
    e.stopPropagation()
    setReviewingId(id)
    setPendingValid(isValid)
    setReviewNotes('')
    setExpandedId(null)
  }

  function cancelReview(e: React.MouseEvent) {
    e.stopPropagation()
    setReviewingId(null)
    setReviewNotes('')
    setPendingValid(null)
  }

  function confirmReview(item: PriceHypothesisItem, e: React.MouseEvent) {
    e.stopPropagation()
    if (pendingValid === null) return
    reviewMutation.mutate({
      hypothesisId: item.hypothesis_id,
      isValid: pendingValid,
      notes: reviewNotes || undefined,
    })
  }

  // ── Derived macro stats ───────────────────────────────────────────────────
  const topAnomalySector = useMemo(() => {
    if (!priceSummary?.by_sector || priceSummary.by_sector.length === 0) return null
    return priceSummary.by_sector.reduce((best, curr) =>
      curr.count > best.count ? curr : best
    )
  }, [priceSummary])

  const extremeOverpricingType = useMemo(() => {
    if (!priceSummary?.by_type) return null
    return priceSummary.by_type.find((t) => t.type === 'extreme_overpricing') ?? null
  }, [priceSummary])

  const avgOverpricingPct = extremeOverpricingType
    ? `${(extremeOverpricingType.avg_confidence * 100).toFixed(0)}%`
    : avgConfidence > 0
    ? `${(avgConfidence * 100).toFixed(0)}%`
    : '—'

  return (
    <div className="space-y-5">

      {/* ── 1. Intelligence Header ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-risk-critical shrink-0" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-risk-critical font-mono">
            {t('intelligenceLabel')}
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
          <h1 className="text-xl md:text-2xl font-black text-text-primary leading-tight">
            {summaryLoading
              ? <Skeleton className="h-7 w-52 inline-block" />
              : `${formatNumber(totalHypotheses)} ${t('anomaliesDetected')}`}
          </h1>
          {!summaryLoading && totalFlaggedValue > 0 && (
            <p className="text-sm text-risk-critical font-medium tabular-nums font-mono">
              {formatCompactMXN(totalFlaggedValue)} {t('flaggedValue')}
            </p>
          )}
        </div>
        <p className="text-xs text-text-muted max-w-2xl leading-relaxed">{t('pageDesc')}</p>
      </div>

      {/* ── 2. Macro stat cards ───────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MacroStatCard
          loading={summaryLoading}
          label={t('totalAnomalies')}
          value={summaryLoading ? '—' : formatNumber(totalHypotheses)}
          detail={t('totalAnomaliesDetail')}
          color="text-risk-high"
          borderColor="border-risk-high/30"
        />
        <MacroStatCard
          loading={summaryLoading}
          label={t('totalFlaggedValue')}
          value={summaryLoading ? '—' : formatCompactMXN(totalFlaggedValue)}
          detail={t('totalFlaggedDetail')}
          color="text-risk-critical"
          borderColor="border-risk-critical/30"
        />
        <MacroStatCard
          loading={summaryLoading}
          label={t('topAnomalySector')}
          value={
            summaryLoading ? '—' :
            topAnomalySector ? getSectorNameEN(topAnomalySector.sector_name) : '—'
          }
          detail={
            topAnomalySector
              ? `${formatNumber(topAnomalySector.count)} ${t('anomaliesDetected').toLowerCase()}`
              : t('mostPriceOutliers')
          }
          color="text-risk-medium"
          borderColor="border-risk-medium/30"
          sectorName={topAnomalySector?.sector_name}
        />
        <MacroStatCard
          loading={summaryLoading}
          label={t('extremeConfidence')}
          value={summaryLoading ? '—' : avgOverpricingPct}
          detail={t('extremeConfidenceDetail')}
          color="text-accent"
          borderColor="border-accent/30"
        />
      </div>

      {/* ── 3. Sector Anomaly Map ─────────────────────────────────────────── */}
      {!summaryLoading && priceSummary?.by_sector && priceSummary.by_sector.length > 0 && (
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-accent" />
              {t('sectorMapTitle')}
            </CardTitle>
            <CardDescription className="text-xs">{t('sectorMapDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <SectorAnomalyBar data={priceSummary.by_sector} />
          </CardContent>
        </Card>
      )}
      {summaryLoading && <Skeleton className="h-40 w-full rounded-lg" />}

      {/* ── 4. Top 5 Highest-Confidence Anomalies ────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-text-primary">{t('topAnomaliesTitle')}</h2>
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">{t('sortedByConfidence')}</span>
        </div>
        {hypothesesLoading ? (
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : hypothesesData?.data && hypothesesData.data.length > 0 ? (
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {hypothesesData.data.slice(0, 5).map((item) => (
              <TopAnomalyCard key={item.id} item={item} />
            ))}
          </div>
        ) : null}
      </div>

      {/* ── 5. Anomaly Workbench ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
            {t('workbenchTitle')}
          </CardTitle>
          <CardDescription>{t('workbenchDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FilterBar
            hypothesisType={hypothesisType}
            confidenceLevel={confidenceLevel}
            sectorId={sectorId}
            reviewStatus={reviewStatus}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onTypeChange={(v) => { setHypothesisType(v); resetPage() }}
            onConfidenceChange={(v) => { setConfidenceLevel(v); resetPage() }}
            onSectorChange={(v) => { setSectorId(v); resetPage() }}
            onReviewStatusChange={(v) => { setReviewStatus(v); resetPage() }}
            onSortByChange={(v) => { setSortBy(v); resetPage() }}
            onSortOrderToggle={() => { setSortOrder((o) => o === 'desc' ? 'asc' : 'desc'); resetPage() }}
          />
          {hypothesesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : hypothesesData?.data && hypothesesData.data.length > 0 ? (
            <AnomalyTable
              data={hypothesesData.data}
              expandedId={expandedId}
              reviewingId={reviewingId}
              pendingValid={pendingValid}
              reviewNotes={reviewNotes}
              expandedDetail={expandedDetail ?? null}
              detailLoading={detailLoading}
              reviewLoading={reviewMutation.isPending}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onRowClick={handleRowClick}
              onSortChange={handleSortChange}
              onStartReview={startReview}
              onCancelReview={cancelReview}
              onConfirmReview={confirmReview}
              onNotesChange={setReviewNotes}
            />
          ) : (
            <p className="text-sm text-text-muted py-6 text-center">{t('noResults')}</p>
          )}
          {pagination && pagination.total_pages > 1 && (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={pagination.total}
              perPage={PER_PAGE}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          )}

          {/* ── ML-Only Detections panel ────────────────────────────────── */}
          {mlAnomaliesData && mlAnomaliesData.new_detections > 0 && (
            <div className="mt-4 rounded-md border border-border/40 bg-background-elevated/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-accent" aria-hidden="true" />
                  <span className="text-sm font-bold text-text-primary">ML-Only Detections</span>
                  <span className="text-xs text-text-muted">
                    {formatNumber(mlAnomaliesData.new_detections)} contract
                    {mlAnomaliesData.new_detections !== 1 ? 's' : ''} flagged by multi-feature
                    Isolation Forest but not IQR
                  </span>
                </div>
              </div>
              <div className="space-y-2" role="list" aria-label="ML-only anomaly detections">
                {mlAnomaliesData.data.map((item) => (
                  <div
                    key={item.contract_id}
                    role="listitem"
                    className="flex items-center justify-between text-xs p-2 rounded bg-background-card border border-border/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-accent shrink-0">#{item.contract_id}</span>
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: SECTOR_COLORS[item.sector_name] ?? '#64748b' }}
                        aria-hidden="true"
                      />
                      <span className="text-text-muted truncate">
                        {getSectorNameEN(item.sector_name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="tabular-nums text-text-primary">
                        {formatCompactMXN(item.amount_mxn)}
                      </span>
                      <span className="font-mono text-risk-high tabular-nums">
                        {(item.anomaly_score * 100).toFixed(0)}% anomaly
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 6. Sector Baselines (collapsible) ────────────────────────────── */}
      <Card>
        <details>
          <summary className="cursor-pointer list-none px-6 py-4">
            <div className="flex items-center gap-2">
              <Table2 className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="text-sm font-semibold text-text-primary">{t('baselinesTitle')}</span>
              <span className="text-xs text-text-muted">— {t('baselinesSubtitle')}</span>
            </div>
          </summary>
          <CardContent className="pt-0">
            <p className="text-xs text-text-muted mb-3">{t('baselinesDesc')}</p>
            {baselinesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : sortedBaselines.length > 0 ? (
              <BaselineTable data={sortedBaselines} />
            ) : (
              <p className="text-sm text-text-muted py-4 text-center">{t('noBaselines')}</p>
            )}
          </CardContent>
        </details>
      </Card>
    </div>
  )
}

// ============================================================================
// FilterBar
// ============================================================================

interface FilterBarProps {
  hypothesisType: string
  confidenceLevel: string
  sectorId: number | undefined
  reviewStatus: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onTypeChange: (v: string) => void
  onConfidenceChange: (v: string) => void
  onSectorChange: (v: number | undefined) => void
  onReviewStatusChange: (v: string) => void
  onSortByChange: (v: string) => void
  onSortOrderToggle: () => void
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'extreme_overpricing', label: 'Extreme Overpricing' },
  { value: 'statistical_outlier', label: 'Statistical Outlier' },
]

const CONFIDENCE_OPTIONS = [
  { value: 'all', label: 'All Confidence' },
  { value: 'very_high', label: 'Very High' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const REVIEW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
]

const SORT_OPTIONS = [
  { value: 'confidence', label: 'Confidence' },
  { value: 'amount', label: 'Amount' },
  { value: 'date', label: 'Date' },
]

const FilterBar = memo(function FilterBar({
  hypothesisType,
  confidenceLevel,
  sectorId,
  reviewStatus,
  sortBy,
  sortOrder,
  onTypeChange,
  onConfidenceChange,
  onSectorChange,
  onReviewStatusChange,
  onSortByChange,
  onSortOrderToggle,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center pb-1">
      {/* Type pills */}
      <div className="flex gap-1 flex-wrap" role="group" aria-label="Filter by type">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onTypeChange(opt.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
              hypothesisType === opt.value
                ? 'bg-accent text-white border-accent'
                : 'bg-transparent text-text-muted border-border hover:border-accent/60 hover:text-text-primary'
            }`}
            aria-pressed={hypothesisType === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" aria-hidden="true" />

      {/* Confidence pills */}
      <div className="flex gap-1 flex-wrap" role="group" aria-label="Filter by confidence">
        {CONFIDENCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onConfidenceChange(opt.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
              confidenceLevel === opt.value
                ? 'bg-accent text-white border-accent'
                : 'bg-transparent text-text-muted border-border hover:border-accent/60 hover:text-text-primary'
            }`}
            aria-pressed={confidenceLevel === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-border hidden sm:block" aria-hidden="true" />

      {/* Sector dropdown */}
      <select
        value={sectorId ?? ''}
        onChange={(e) => onSectorChange(e.target.value ? Number(e.target.value) : undefined)}
        className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
        aria-label="Filter by sector"
      >
        <option value="">All Sectors</option>
        {SECTORS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nameEN}
          </option>
        ))}
      </select>

      {/* Review status pills */}
      <div className="flex gap-1" role="group" aria-label="Filter by review status">
        {REVIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onReviewStatusChange(opt.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
              reviewStatus === opt.value
                ? 'bg-surface-hover text-text-primary border-border'
                : 'bg-transparent text-text-muted border-border/50 hover:border-border'
            }`}
            aria-pressed={reviewStatus === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Spacer pushes sort to the right */}
      <div className="flex-1" />

      {/* Sort controls */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-text-muted">Sort:</span>
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-md border border-border bg-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
          aria-label="Sort by field"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={onSortOrderToggle}
          className="p-1 rounded border border-border hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          aria-label={sortOrder === 'desc' ? 'Currently descending, click for ascending' : 'Currently ascending, click for descending'}
          title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
        >
          {sortOrder === 'desc'
            ? <ArrowDown className="h-3.5 w-3.5" />
            : <ArrowUp className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
})

// ============================================================================
// AnomalyTable
// ============================================================================

interface AnomalyTableProps {
  data: PriceHypothesisItem[]
  expandedId: number | null
  reviewingId: number | null
  pendingValid: boolean | null
  reviewNotes: string
  expandedDetail: Awaited<ReturnType<typeof priceApi.getHypothesisDetail>> | null
  detailLoading: boolean
  reviewLoading: boolean
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onRowClick: (id: number) => void
  onSortChange: (field: string) => void
  onStartReview: (id: number, isValid: boolean, e: React.MouseEvent) => void
  onCancelReview: (e: React.MouseEvent) => void
  onConfirmReview: (item: PriceHypothesisItem, e: React.MouseEvent) => void
  onNotesChange: (v: string) => void
}

function SortIcon({ field, sortBy, sortOrder }: { field: string; sortBy: string; sortOrder: string }) {
  if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-30 ml-1 inline-block" />
  return sortOrder === 'desc'
    ? <ArrowDown className="h-3 w-3 ml-1 inline-block text-accent" />
    : <ArrowUp className="h-3 w-3 ml-1 inline-block text-accent" />
}

const AnomalyTable = memo(function AnomalyTable({
  data,
  expandedId,
  reviewingId,
  pendingValid,
  reviewNotes,
  expandedDetail,
  detailLoading,
  reviewLoading,
  sortBy,
  sortOrder,
  onRowClick,
  onSortChange,
  onStartReview,
  onCancelReview,
  onConfirmReview,
  onNotesChange,
}: AnomalyTableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-surface-hover/30">
            <th className="text-left px-3 py-2.5 text-xs font-medium text-text-muted">Contract</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">
              <button
                onClick={() => onSortChange('amount')}
                className="hover:text-text-primary transition-colors flex items-center gap-0.5 ml-auto"
                aria-label="Sort by amount"
              >
                Amount
                <SortIcon field="amount" sortBy={sortBy} sortOrder={sortOrder} />
              </button>
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-medium text-text-muted">Type</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">
              <button
                onClick={() => onSortChange('confidence')}
                className="hover:text-text-primary transition-colors flex items-center gap-0.5 ml-auto"
                aria-label="Sort by confidence"
              >
                Confidence
                <SortIcon field="confidence" sortBy={sortBy} sortOrder={sortOrder} />
              </button>
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-medium text-text-muted">Sector</th>
            <th className="text-center px-3 py-2.5 text-xs font-medium text-text-muted">Status</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <HypothesisRow
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              isReviewing={reviewingId === item.id}
              pendingValid={pendingValid}
              reviewNotes={reviewNotes}
              expandedDetail={expandedId === item.id ? expandedDetail : null}
              detailLoading={expandedId === item.id && detailLoading}
              reviewLoading={reviewLoading}
              onRowClick={onRowClick}
              onStartReview={onStartReview}
              onCancelReview={onCancelReview}
              onConfirmReview={onConfirmReview}
              onNotesChange={onNotesChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
})

// ============================================================================
// HypothesisRow + inline expansion
// ============================================================================

interface HypothesisRowProps {
  item: PriceHypothesisItem
  isExpanded: boolean
  isReviewing: boolean
  pendingValid: boolean | null
  reviewNotes: string
  expandedDetail: Awaited<ReturnType<typeof priceApi.getHypothesisDetail>> | null
  detailLoading: boolean
  reviewLoading: boolean
  onRowClick: (id: number) => void
  onStartReview: (id: number, isValid: boolean, e: React.MouseEvent) => void
  onCancelReview: (e: React.MouseEvent) => void
  onConfirmReview: (item: PriceHypothesisItem, e: React.MouseEvent) => void
  onNotesChange: (v: string) => void
}

function HypothesisRow({
  item,
  isExpanded,
  isReviewing,
  pendingValid,
  reviewNotes,
  expandedDetail,
  detailLoading,
  reviewLoading,
  onRowClick,
  onStartReview,
  onCancelReview,
  onConfirmReview,
  onNotesChange,
}: HypothesisRowProps) {
  const sectorCode = item.sector_id
    ? SECTORS.find((s) => s.id === item.sector_id)?.code
    : undefined
  const sectorColor = sectorCode ? SECTOR_COLORS[sectorCode] : '#64748b'
  const sectorName = sectorCode ? getSectorNameEN(sectorCode) : '—'

  const confLevel = item.confidence_level ?? 'low'
  const confColor = confidenceColor(confLevel)

  const typeIsExtreme = item.hypothesis_type === 'extreme_overpricing'

  return (
    <>
      {/* Main data row */}
      <tr
        className={`border-b border-border/50 cursor-pointer transition-colors ${
          isExpanded ? 'bg-surface-hover/60' : 'hover:bg-surface-hover/40'
        }`}
        onClick={() => onRowClick(item.id)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onRowClick(item.id)
          }
        }}
      >
        {/* Contract ID */}
        <td className="px-3 py-2.5">
          <span className="font-mono text-accent tabular-nums">#{item.contract_id}</span>
        </td>

        {/* Amount */}
        <td className="text-right px-3 py-2.5 tabular-nums font-medium text-text-primary">
          {item.amount_mxn != null ? formatCompactMXN(item.amount_mxn) : '—'}
        </td>

        {/* Type badge */}
        <td className="px-3 py-2.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              typeIsExtreme
                ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
            }`}
          >
            {typeIsExtreme ? 'Extreme' : 'Outlier'}
          </span>
        </td>

        {/* Confidence */}
        <td className="text-right px-3 py-2.5">
          <span
            className="tabular-nums font-semibold text-xs"
            style={{ color: confColor }}
          >
            {(item.confidence * 100).toFixed(0)}%
          </span>
          <div
            className="mt-1 h-1 rounded-full bg-border overflow-hidden w-16 ml-auto"
            role="progressbar"
            aria-valuenow={Math.round(item.confidence * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Confidence: ${(item.confidence * 100).toFixed(0)}%`}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${item.confidence * 100}%`, backgroundColor: confColor }}
            />
          </div>
        </td>

        {/* Sector */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: sectorColor }}
              aria-hidden="true"
            />
            <span className="text-text-muted">{sectorName}</span>
          </div>
        </td>

        {/* Review status */}
        <td className="text-center px-3 py-2.5">
          {item.is_reviewed ? (
            <RiskBadge level={item.is_valid ? 'low' : 'high'}>
              {item.is_valid ? 'Valid' : 'Invalid'}
            </RiskBadge>
          ) : (
            <span className="text-xs text-text-muted italic">Pending</span>
          )}
        </td>

        {/* Actions */}
        <td className="text-right px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            {!isReviewing ? (
              <>
                <button
                  onClick={(e) => onStartReview(item.id, true, e)}
                  className="flex items-center gap-0.5 px-2 py-1 text-xs rounded border border-border text-green-400 hover:bg-green-500/10 hover:border-green-500/40 transition-colors"
                  aria-label={`Mark contract ${item.contract_id} as valid`}
                  title="Mark valid"
                >
                  <Check className="h-3 w-3" />
                  <span>Valid</span>
                </button>
                <button
                  onClick={(e) => onStartReview(item.id, false, e)}
                  className="flex items-center gap-0.5 px-2 py-1 text-xs rounded border border-border text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
                  aria-label={`Mark contract ${item.contract_id} as invalid`}
                  title="Mark invalid"
                >
                  <X className="h-3 w-3" />
                  <span>Invalid</span>
                </button>
              </>
            ) : null}
            <button
              onClick={(e) => { e.stopPropagation(); onRowClick(item.id) }}
              className="p-1 text-text-muted hover:text-text-primary transition-colors ml-1"
              aria-label={isExpanded ? 'Collapse row details' : 'Expand row details'}
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Inline review confirmation */}
      {isReviewing && (
        <tr className="border-b border-border/50 bg-surface-hover/30">
          <td colSpan={7} className="px-4 py-3">
            <div
              className="flex flex-col sm:flex-row sm:items-start gap-3"
              onClick={(e) => e.stopPropagation()}
              role="region"
              aria-label="Review confirmation"
            >
              <div className="flex-1">
                <p className="text-xs font-medium text-text-primary mb-1.5">
                  Mark contract #{item.contract_id} as{' '}
                  <span className={pendingValid ? 'text-green-400' : 'text-red-400'}>
                    {pendingValid ? 'VALID (confirmed anomaly)' : 'INVALID (false positive)'}
                  </span>
                  ?
                </p>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-border bg-surface text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent/50"
                  aria-label="Review notes"
                />
              </div>
              <div className="flex gap-2 sm:flex-col sm:pt-5">
                <button
                  onClick={(e) => onConfirmReview(item, e)}
                  disabled={reviewLoading}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Confirm review decision"
                >
                  {reviewLoading ? 'Saving...' : 'Confirm'}
                </button>
                <button
                  onClick={onCancelReview}
                  disabled={reviewLoading}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-border text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-50 transition-colors"
                  aria-label="Cancel review"
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Inline expansion — sector baseline + vendor context */}
      {isExpanded && (
        <tr className="border-b border-border/50">
          <td colSpan={7} className="px-4 py-3 bg-surface-hover/20">
            {detailLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : expandedDetail ? (
              <HypothesisDetailPanel detail={expandedDetail} />
            ) : (
              <p className="text-xs text-text-muted italic">Loading detail...</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ============================================================================
// HypothesisDetailPanel — inline expansion content
// ============================================================================

function HypothesisDetailPanel({
  detail,
}: {
  detail: Awaited<ReturnType<typeof priceApi.getHypothesisDetail>>
}) {
  const baseline = detail.sector_baseline
  const vendor = detail.vendor_profile
  const contract = detail.hypothesis?.amount_mxn

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
      {/* Explanation */}
      <div className="sm:col-span-3">
        <p className="text-text-muted font-medium mb-0.5">Explanation</p>
        <p className="text-text-primary">{detail.hypothesis?.explanation ?? '—'}</p>
      </div>

      {/* Sector baseline */}
      {baseline && (
        <div>
          <p className="text-text-muted font-medium mb-1.5">Sector Baseline</p>
          <dl className="space-y-1">
            <BaselineRow label="Median" value={formatCompactMXN(baseline.median)} />
            <BaselineRow label="P75" value={formatCompactMXN(baseline.p75)} />
            <BaselineRow label="Upper fence (Q3+1.5x IQR)" value={formatCompactMXN(baseline.upper_fence)} highlight />
            <BaselineRow label="Extreme fence (Q3+3x IQR)" value={formatCompactMXN(baseline.extreme_fence)} highlight />
            {contract != null && baseline.median > 0 && (
              <BaselineRow
                label="This contract / median"
                value={`${(contract / baseline.median).toFixed(1)}x`}
                highlight
              />
            )}
          </dl>
        </div>
      )}

      {/* Vendor profile */}
      {vendor && (
        <div>
          <p className="text-text-muted font-medium mb-1.5">Vendor Profile</p>
          <dl className="space-y-1">
            <BaselineRow label="Contracts" value={formatNumber(vendor.contract_count)} />
            <BaselineRow label="Avg contract" value={formatCompactMXN(vendor.avg_contract_value)} />
            <BaselineRow label="Median contract" value={formatCompactMXN(vendor.median_contract_value)} />
            <BaselineRow label="Price trend" value={vendor.price_trend} />
            {contract != null && vendor.median_contract_value > 0 && (
              <BaselineRow
                label="This / vendor median"
                value={`${(contract / vendor.median_contract_value).toFixed(1)}x`}
                highlight
              />
            )}
          </dl>
        </div>
      )}

      {/* Supporting evidence */}
      {detail.hypothesis?.supporting_evidence && detail.hypothesis.supporting_evidence.length > 0 && (
        <div>
          <p className="text-text-muted font-medium mb-1.5">Supporting Evidence</p>
          <ul className="space-y-1.5">
            {detail.hypothesis.supporting_evidence.map((ev, i) => (
              <li key={i} className="text-text-muted">
                <span className="text-text-primary font-medium">{ev.evidence_type}:</span>{' '}
                {ev.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function BaselineRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`tabular-nums font-medium ${highlight ? 'text-risk-high' : 'text-text-primary'}`}>
        {value}
      </dd>
    </div>
  )
}

// ============================================================================
// PaginationBar
// ============================================================================

function PaginationBar({
  page,
  totalPages,
  total,
  perPage,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPrev: () => void
  onNext: () => void
}) {
  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className="flex items-center justify-between pt-2" role="navigation" aria-label="Pagination">
      <span className="text-xs text-text-muted tabular-nums">
        {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-border text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>
        <span className="flex items-center px-2 text-xs text-text-muted tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-border text-text-muted hover:text-text-primary hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// BaselineTable (sector reference, inside <details>)
// ============================================================================

const BaselineTable = memo(function BaselineTable({
  data,
}: {
  data: SectorPriceBaseline[]
}) {
  const maxFence = useMemo(() => Math.max(...data.map((d) => d.upper_fence || 0), 1), [data])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2.5 text-xs font-medium text-text-muted">Sector</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">P10</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">P25</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted font-bold">Median</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">P75</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">P90</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">P95</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">Upper Fence</th>
            <th className="text-right px-3 py-2.5 text-xs font-medium text-text-muted">Contracts</th>
            <th className="px-3 py-2.5 text-xs font-medium text-text-muted w-28">Range</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const sectorCode = row.sector_name
            const color = SECTOR_COLORS[sectorCode] || '#64748b'
            const barWidth = maxFence > 0 ? (row.upper_fence / maxFence) * 100 : 0
            const medianPos = maxFence > 0 ? (row.percentile_50 / maxFence) * 100 : 0

            return (
              <tr key={row.sector_id} className="border-b border-border/50 hover:bg-surface-hover/50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-text-primary">
                      {getSectorNameEN(sectorCode)}
                    </span>
                  </div>
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatCompactMXN(row.percentile_10)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatCompactMXN(row.percentile_25)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums font-bold text-text-primary">
                  {formatCompactMXN(row.percentile_50)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatCompactMXN(row.percentile_75)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatCompactMXN(row.percentile_90)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatCompactMXN(row.percentile_95)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-risk-high font-medium">
                  {formatCompactMXN(row.upper_fence)}
                </td>
                <td className="text-right px-3 py-2 tabular-nums text-text-muted">
                  {formatNumber(row.sample_count)}
                </td>
                <td className="px-3 py-2" aria-hidden="true">
                  <div className="relative h-3 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full opacity-30"
                      style={{ width: `${barWidth}%`, backgroundColor: color }}
                    />
                    <div
                      className="absolute top-0 h-full w-0.5 rounded-full"
                      style={{ left: `${medianPos}%`, backgroundColor: color }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
})
