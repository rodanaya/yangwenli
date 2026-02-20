/**
 * Investigation Page
 * ML-generated investigation cases with external validation tracking.
 * Shows the full pipeline: Detection -> Research -> Corroboration -> Ground Truth
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiskBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { investigationApi } from '@/api/client'
import { SECTOR_COLORS, getSectorNameEN } from '@/lib/constants'
import { PageHero } from '@/components/DashboardWidgets'
import type {
  InvestigationCaseListItem,
  InvestigationDashboardSummary,
  InvestigationValidationStatus,
  InvestigationFilterParams,
  ExternalEvidence,
} from '@/api/types'
import {
  Crosshair,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Newspaper,
  Shield,
  ArrowUpRight,
  Filter,
  Loader2,
  Plus,
  Send,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from '@/components/charts'

// ============================================================================
// STATUS HELPERS
// ============================================================================

const STATUS_CONFIG: Record<InvestigationValidationStatus, {
  icon: React.ElementType
  className: string
  dotClass: string
}> = {
  pending: {
    icon: Clock,
    className: 'bg-risk-medium/15 text-risk-medium border border-risk-medium/30',
    dotClass: 'bg-risk-medium',
  },
  corroborated: {
    icon: CheckCircle2,
    className: 'bg-risk-low/15 text-risk-low border border-risk-low/30',
    dotClass: 'bg-risk-low',
  },
  refuted: {
    icon: XCircle,
    className: 'bg-risk-critical/15 text-risk-critical border border-risk-critical/30',
    dotClass: 'bg-risk-critical',
  },
  inconclusive: {
    icon: HelpCircle,
    className: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
    dotClass: 'bg-slate-400',
  },
}

function StatusPill({ status }: { status: InvestigationValidationStatus }) {
  const { t } = useTranslation('investigation')
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.className)}>
      <Icon className="h-3 w-3" />
      {t(`status.${status}`)}
    </span>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function Investigation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation('investigation')

  // Filters
  const [statusFilter, setStatusFilter] = useState<InvestigationValidationStatus | 'all'>('all')
  const [sectorFilter] = useState<number | undefined>(undefined)
  const [minScore, setMinScore] = useState<number | undefined>(undefined)
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)

  // Data queries
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['investigation', 'dashboard-summary'],
    queryFn: () => investigationApi.getDashboardSummary(),
    staleTime: 5 * 60 * 1000,
  })

  const filterParams: InvestigationFilterParams = useMemo(() => ({
    validation_status: statusFilter === 'all' ? undefined : statusFilter,
    sector_id: sectorFilter,
    min_score: minScore,
    per_page: 50,
  }), [statusFilter, sectorFilter, minScore])

  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: ['investigation', 'cases', filterParams],
    queryFn: () => investigationApi.getCases(filterParams),
    staleTime: 5 * 60 * 1000,
  })

  const { data: stats } = useQuery({
    queryKey: ['investigation', 'stats'],
    queryFn: () => investigationApi.getStats(),
    staleTime: 5 * 60 * 1000,
  })

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: ({ caseId, status, notes }: { caseId: string; status: string; notes?: string }) =>
      investigationApi.reviewCase(caseId, status, notes, 'analyst'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation'] })
    },
  })

  const allCases = casesData?.data || []

  // Priority derivation
  const getPriority = (score: number): { level: 'critical' | 'high' | 'medium' | 'low'; n: number } => {
    if (score >= 0.75) return { level: 'critical', n: 1 }
    if (score >= 0.50) return { level: 'high', n: 2 }
    if (score >= 0.25) return { level: 'medium', n: 3 }
    return { level: 'low', n: 4 }
  }

  // Priority counts
  const priorityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const c of allCases) {
      counts[getPriority(c.suspicion_score).level]++
    }
    return counts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCases])

  // Filtered + sorted cases
  const cases = useMemo(() => {
    let filtered = allCases
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((c) => getPriority(c.suspicion_score).level === priorityFilter)
    }
    return filtered.sort((a, b) => b.suspicion_score - a.suspicion_score)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCases, priorityFilter])

  // Sector breakdown for chart
  const sectorBreakdown = useMemo(() => {
    if (!stats?.by_sector) return []
    return Object.entries(stats.by_sector)
      .map(([code, count]) => ({
        name: getSectorNameEN(code),
        code,
        count: count as number,
        color: SECTOR_COLORS[code] || '#64748b',
      }))
      .sort((a, b) => b.count - a.count)
  }, [stats])

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* HERO HEADER */}
      {/* ================================================================ */}
      <PageHero
        trackingLabel={t('hero.trackingLabel')}
        icon={<Crosshair className="h-4 w-4 text-accent" />}
        headline={summaryLoading ? '—' : t('hero.casesCount', { count: summary?.total_cases || 0 })}
        subtitle={t('hero.subtitle')}
        detail={summaryLoading ? undefined : `${summary?.corroborated_cases || 0} ${t('hero.confirmedDetail')} · ${formatCompactMXN(summary?.total_value_at_risk || 0)} ${t('hero.valueAtRisk')}`}
        loading={summaryLoading}
      />
      <p className="text-xs text-text-secondary max-w-3xl leading-relaxed -mt-4">
        {t('description')}
      </p>

      {/* ================================================================ */}
      {/* S1: VALIDATION FUNNEL */}
      {/* ================================================================ */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h2 className="text-sm font-bold text-text-primary mb-3">{t('sections.pipeline')}</h2>
          {summaryLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <ValidationFunnel funnel={summary?.validation_funnel} hitRate={summary?.hit_rate} />
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* S2: CONFIRMED BIG FISH */}
      {/* ================================================================ */}
      {(summary?.top_corroborated?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-3.5 w-3.5 text-risk-low" />
            <h2 className="text-sm font-bold text-text-primary">{t('sections.confirmed')}</h2>
            <span className="text-xs text-text-muted ml-1">
              {t('sections.confirmedSubtitle')}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary!.top_corroborated.map((item) => (
              <BigFishCard key={item.case_id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* WORKFLOW GUIDE */}
      {/* ================================================================ */}
      <details className="mb-6 border rounded-lg p-4 bg-muted/30">
        <summary className="cursor-pointer font-semibold text-sm">
          {t('workflowGuide.title')}
        </summary>
        <ol className="mt-3 space-y-2 text-sm list-decimal list-inside text-muted-foreground">
          <li><strong>{t('workflowGuide.step1.label')}</strong> — {t('workflowGuide.step1.desc')}</li>
          <li><strong>{t('workflowGuide.step2.label')}</strong> — {t('workflowGuide.step2.desc')}</li>
          <li><strong>{t('workflowGuide.step3.label')}</strong> — {t('workflowGuide.step3.desc')}</li>
          <li><strong>{t('workflowGuide.step4.label')}</strong> — {t('workflowGuide.step4.desc')}</li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground italic">{t('workflowGuide.groundTruthNote')}</p>
      </details>

      {/* ================================================================ */}
      {/* S3: INVESTIGATION QUEUE */}
      {/* ================================================================ */}

      {/* Queue Header — priority filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'all', label: t('queue.allPriorities'), count: allCases.length, color: 'text-text-secondary border-border/50 hover:border-accent/40' },
            { key: 'critical', label: t('queue.critical'), count: priorityCounts.critical, color: 'text-risk-critical border-risk-critical/30 hover:border-risk-critical/60 bg-risk-critical/5' },
            { key: 'high', label: t('queue.high'), count: priorityCounts.high, color: 'text-risk-high border-risk-high/30 hover:border-risk-high/60 bg-risk-high/5' },
            { key: 'medium', label: t('queue.medium'), count: priorityCounts.medium, color: 'text-risk-medium border-risk-medium/30 hover:border-risk-medium/60 bg-risk-medium/5' },
            { key: 'low', label: t('queue.low'), count: priorityCounts.low, color: 'text-risk-low border-risk-low/30 hover:border-risk-low/60 bg-risk-low/5' },
          ] as const
        ).map((chip) => (
          <button
            key={chip.key}
            onClick={() => setPriorityFilter(chip.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
              chip.color,
              priorityFilter === chip.key ? 'ring-1 ring-current' : ''
            )}
          >
            <span className="font-bold tabular-nums">{chip.count}</span>
            <span>{chip.label}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-text-muted" />
          <select
            className="text-xs bg-background-elevated border border-border/50 rounded px-2 py-1 text-text-secondary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvestigationValidationStatus | 'all')}
          >
            <option value="all">{t('filters.allStatuses')}</option>
            <option value="pending">{t('status.pending')}</option>
            <option value="corroborated">{t('status.corroborated')}</option>
            <option value="refuted">{t('status.refuted')}</option>
            <option value="inconclusive">{t('status.inconclusive')}</option>
          </select>
          <select
            className="text-xs bg-background-elevated border border-border/50 rounded px-2 py-1 text-text-secondary"
            value={minScore ?? ''}
            onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">{t('filters.anyScore')}</option>
            <option value="0.5">{t('filters.scoreMin', { threshold: '0.50' })}</option>
            <option value="0.3">{t('filters.scoreMin', { threshold: '0.30' })}</option>
            <option value="0.2">{t('filters.scoreMin', { threshold: '0.20' })}</option>
          </select>
        </div>
      </div>

      {/* Priority Card Grid */}
      {casesLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : cases.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">{t('queue.empty')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cases.map((c, i) => (
            <InvestigationCard
              key={c.case_id}
              caseItem={c}
              rank={i + 1}
              priority={getPriority(c.suspicion_score)}
              isSelected={selectedCaseId === c.case_id}
              onSelect={() => setSelectedCaseId(selectedCaseId === c.case_id ? null : c.case_id)}
              onReview={(status) => reviewMutation.mutate({ caseId: c.case_id, status })}
              isReviewing={reviewMutation.isPending}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {/* Case Detail Drawer */}
      {selectedCaseId && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-background-card border-l border-border/50 shadow-2xl overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-border/30 sticky top-0 bg-background-card z-10">
            <h2 className="text-sm font-bold text-text-primary">{t('sections.allCases')}</h2>
            <button
              onClick={() => setSelectedCaseId(null)}
              className="text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-background-elevated/50 transition-colors"
            >
              {t('card.close')} ✕
            </button>
          </div>
          <div className="p-4">
            <CaseDetailPanel
              caseId={selectedCaseId}
              onReview={(status) => reviewMutation.mutate({ caseId: selectedCaseId, status })}
              isReviewing={reviewMutation.isPending}
              navigate={navigate}
            />
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* S5: SECTOR BREAKDOWN */}
      {/* ================================================================ */}
      {sectorBreakdown.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <h2 className="text-sm font-bold text-text-primary mb-3">{t('sections.bySector')}</h2>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorBreakdown} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                    width={75}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload?.[0]) {
                        const d = payload[0].payload
                        return (
                          <div className="chart-tooltip">
                            <p className="text-xs font-semibold text-text-primary">{d.name}</p>
                            <p className="text-xs text-text-muted">{d.count} {t('tooltip.cases')}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {sectorBreakdown.map((entry) => (
                      <Cell key={entry.code} fill={entry.color} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// VALIDATION FUNNEL
// ============================================================================

function ValidationFunnel({
  funnel,
  hitRate,
}: {
  funnel?: InvestigationDashboardSummary['validation_funnel']
  hitRate?: InvestigationDashboardSummary['hit_rate']
}) {
  const { t } = useTranslation('investigation')
  if (!funnel) return null

  const steps = [
    { label: t('funnel.detected'), value: funnel.detected, color: 'bg-blue-500' },
    { label: t('funnel.researched'), value: funnel.researched, color: 'bg-amber-500' },
    { label: t('funnel.corroborated'), value: funnel.corroborated, color: 'bg-emerald-500' },
    { label: t('funnel.groundTruth'), value: funnel.promoted_to_gt, color: 'bg-accent' },
  ]

  return (
    <div>
      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1 flex-1">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('h-2 w-2 rounded-full', step.color)} />
                <span className="text-xs font-medium text-text-secondary">{step.label}</span>
              </div>
              <div className="text-lg font-bold text-text-primary tabular-nums">{step.value}</div>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0 mx-1" />
            )}
          </div>
        ))}
      </div>
      {hitRate && hitRate.checked > 0 && (
        <p className="text-xs text-text-muted mt-3 pt-3 border-t border-border/30">
          <strong className="text-risk-low">{Math.round(hitRate.rate * 100)}% {t('funnel.hitRate')}</strong>
          {' '}&mdash; {t('funnel.hitRateText', { confirmed: hitRate.confirmed, checked: hitRate.checked })}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// BIG FISH CARD
// ============================================================================

function BigFishCard({
  item,
}: {
  item: InvestigationDashboardSummary['top_corroborated'][number]
}) {
  const { t } = useTranslation('investigation')
  const sectorColor = SECTOR_COLORS[item.sector_code] || '#64748b'

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/[0.02] hover:border-emerald-500/30 transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: sectorColor + '20', color: sectorColor }}
          >
            {getSectorNameEN(item.sector_code)}
          </span>
          <StatusPill status="corroborated" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary truncate mb-1 group-hover:text-accent transition-colors">
          {toTitleCase(item.title.replace(/ - Anomalous Procurement Pattern$/, '').replace(/ - Externally Corroborated Investigation$/, ''))}
        </h3>
        <p className="text-xs text-text-muted line-clamp-2 mb-2 leading-relaxed">
          {item.news_summary}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-text-muted tabular-nums font-mono">
            <span>{formatCompactMXN(item.value)}</span>
            <span className="text-text-muted">|</span>
            <span>{formatNumber(item.contracts)} {t('contracts')}</span>
          </div>
          <RiskBadge score={item.score} className="text-xs" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// INVESTIGATION CARD (priority triage workbench)
// ============================================================================

const PRIORITY_CONFIG = {
  critical: { border: 'border-risk-critical/40', bg: 'bg-risk-critical/5', badge: 'bg-risk-critical/15 text-risk-critical' },
  high:     { border: 'border-risk-high/40',     bg: 'bg-risk-high/5',     badge: 'bg-risk-high/15 text-risk-high' },
  medium:   { border: 'border-risk-medium/40',   bg: 'bg-risk-medium/5',   badge: 'bg-risk-medium/15 text-risk-medium' },
  low:      { border: 'border-risk-low/40',      bg: 'bg-risk-low/5',      badge: 'bg-risk-low/15 text-risk-low' },
}

function InvestigationCard({
  caseItem,
  rank,
  priority,
  isSelected,
  onSelect,
  onReview,
  isReviewing,
  navigate,
}: {
  caseItem: InvestigationCaseListItem
  rank: number
  priority: { level: 'critical' | 'high' | 'medium' | 'low'; n: number }
  isSelected: boolean
  onSelect: () => void
  onReview: (status: string) => void
  isReviewing: boolean
  navigate: ReturnType<typeof useNavigate>
}) {
  const { t } = useTranslation('investigation')
  const sectorColor = SECTOR_COLORS[caseItem.sector_name] || '#64748b'
  const pCfg = PRIORITY_CONFIG[priority.level]
  const cleanTitle = toTitleCase(
    caseItem.title
      .replace(/ - Anomalous Procurement Pattern$/, '')
      .replace(/ - Externally Corroborated Investigation$/, '')
  )
  const newsSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${cleanTitle}" ASF auditoría corrupción México`)}`
  const asfSearchUrl = `https://www.asf.gob.mx/Trans/Investigaciones/dbInvestigaciones.asp`

  return (
    <div className={cn('rounded-lg border-2 transition-all', pCfg.border, pCfg.bg, isSelected && 'ring-2 ring-accent')}>
      <div className="p-4">
        {/* Priority badge + status */}
        <div className="flex items-center justify-between mb-2">
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded font-mono tracking-wider uppercase', pCfg.badge)}>
            {t('card.priority', { n: rank })}
          </span>
          <StatusPill status={caseItem.validation_status} />
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-text-primary leading-snug mb-1.5 line-clamp-2">
          {cleanTitle}
        </h3>

        {/* Sector + metrics row */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: sectorColor + '18', color: sectorColor }}
          >
            {getSectorNameEN(caseItem.sector_name)}
          </span>
          <span className="text-xs text-text-muted tabular-nums font-mono">
            {t('card.estLoss')}: <strong className="text-text-secondary">{formatCompactMXN(caseItem.total_value_mxn)}</strong>
          </span>
          <span className="text-xs text-text-muted tabular-nums font-mono">
            {t('card.avgRisk')}: <strong className="text-text-secondary">{(caseItem.suspicion_score * 100).toFixed(0)}%</strong>
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Review actions */}
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-2 border-risk-low/30 text-risk-low hover:bg-risk-low/10"
            disabled={isReviewing || caseItem.validation_status === 'corroborated'}
            onClick={(e) => { e.stopPropagation(); onReview('corroborated') }}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> {t('actions.corroborate')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-2 border-risk-critical/30 text-risk-critical hover:bg-risk-critical/10"
            disabled={isReviewing || caseItem.validation_status === 'refuted'}
            onClick={(e) => { e.stopPropagation(); onReview('refuted') }}
          >
            <XCircle className="h-3 w-3 mr-1" /> {t('actions.refute')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-2"
            disabled={isReviewing || caseItem.validation_status === 'inconclusive'}
            onClick={(e) => { e.stopPropagation(); onReview('inconclusive') }}
          >
            <HelpCircle className="h-3 w-3 mr-1" /> {t('actions.inconclusive')}
          </Button>

          {/* Separator */}
          <div className="w-px h-4 bg-border/50 mx-0.5" />

          {/* View Contracts */}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2 text-accent hover:bg-accent/10"
            onClick={(e) => { e.stopPropagation(); navigate(`/contracts?sort_by=risk_score&sort_order=desc`) }}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> {t('card.viewContracts')}
          </Button>

          {/* ASF Lookup */}
          <a
            href={asfSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 h-6 text-xs px-2 rounded text-text-muted hover:text-text-primary hover:bg-background-elevated/50 transition-colors border border-border/40"
          >
            <Shield className="h-3 w-3" /> {t('asfLookup.button')}
          </a>

          {/* News Search */}
          <a
            href={newsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 h-6 text-xs px-2 rounded text-text-muted hover:text-text-primary hover:bg-background-elevated/50 transition-colors border border-border/40"
          >
            <Newspaper className="h-3 w-3" /> {t('asfLookup.newsSearch')}
          </a>

          {/* View Detail */}
          <button
            onClick={onSelect}
            className={cn(
              'ml-auto inline-flex items-center gap-1 h-6 text-xs px-2 rounded transition-colors border',
              isSelected
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'text-text-muted hover:text-text-primary border-border/40 hover:bg-background-elevated/50'
            )}
          >
            {isSelected ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CASE DETAIL PANEL (loaded on expand)
// ============================================================================

function CaseDetailPanel({
  caseId,
  onReview,
  isReviewing,
  navigate,
}: {
  caseId: string
  onReview: (status: string) => void
  isReviewing: boolean
  navigate: ReturnType<typeof useNavigate>
}) {
  const { t } = useTranslation('investigation')
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence'>('overview')
  const queryClient = useQueryClient()

  const { data: detail, isLoading } = useQuery({
    queryKey: ['investigation', 'case', caseId],
    queryFn: () => investigationApi.getCaseById(caseId),
    staleTime: 5 * 60 * 1000,
  })

  // Evidence form state
  const [showEvidenceForm, setShowEvidenceForm] = useState(false)
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [evidenceSummary, setEvidenceSummary] = useState('')
  const [evidenceType, setEvidenceType] = useState('news')

  const addEvidenceMutation = useMutation({
    mutationFn: () => investigationApi.addEvidence(caseId, [{
      source_url: evidenceUrl,
      source_title: evidenceTitle,
      source_type: evidenceType,
      summary: evidenceSummary,
      date_published: null,
      credibility: 'medium',
    }]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation'] })
      setShowEvidenceForm(false)
      setEvidenceUrl('')
      setEvidenceTitle('')
      setEvidenceSummary('')
    },
  })

  const promoteMutation = useMutation({
    mutationFn: () => investigationApi.promoteToGroundTruth(caseId, detail?.title || caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation'] })
    },
  })

  if (isLoading) {
    return (
      <div className="my-2 p-4 rounded-md bg-background-elevated/20 border-l-2 border-accent pl-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    )
  }

  if (!detail) return null

  // Parse news_hits from the case (stored as raw JSON in external_sources or via dedicated field)
  let newsHits: ExternalEvidence[] = []
  try {
    // The backend returns news_hits as part of the response - check narrative for hints
    // Actually the backend CaseDetail doesn't include news_hits directly,
    // but external_sources may contain them. Let's handle both.
    if (detail.external_sources?.length) {
      newsHits = detail.external_sources.map((s) => ({
        source_url: s.source_url || s.url || '',
        source_title: s.source_title || s.title || '',
        source_type: s.source_type || 'news',
        summary: s.summary || s.description || '',
        date_published: s.date_published || null,
        credibility: s.credibility || 'medium',
      }))
    }
  } catch {
    // ignore parse errors
  }

  const tabs = [
    { key: 'overview', label: t('tabs.overview') },
    { key: 'evidence', label: t('tabs.evidence', { count: detail.vendors.length + newsHits.length }) },
  ] as const

  return (
    <div className="my-2 p-4 rounded-md bg-background-elevated/20 border-l-2 border-accent pl-4 space-y-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/30 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-t transition-colors',
              activeTab === tab.key
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-muted hover:text-text-secondary'
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Summary */}
          {detail.summary && (
            <p className="text-xs text-text-secondary leading-relaxed">{detail.summary}</p>
          )}
          {detail.signals_triggered.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {detail.signals_triggered.map((signal) => (
                <span
                  key={signal}
                  className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-mono"
                >
                  {signal}
                </span>
              ))}
            </div>
          )}
          {/* Research Questions */}
          {detail.questions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/20">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{t('research')}</p>
              {detail.questions.slice(0, 8).map((q) => (
                <div key={q.id} className="flex gap-2 p-2 rounded bg-background-elevated/20">
                  <HelpCircle className="h-3.5 w-3.5 text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-text-secondary">{q.question_text}</p>
                    <span className="text-xs text-text-secondary font-mono">{q.question_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-4">
          {/* Vendors */}
          {detail.vendors.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">{t('vendors')}</p>
              {detail.vendors.map((v) => (
                <div key={v.vendor_id} className="flex items-center gap-3 p-2 rounded hover:bg-background-elevated/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <button
                      className="text-xs font-medium text-text-primary hover:text-accent transition-colors truncate block"
                      onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                    >
                      {toTitleCase(v.name)}
                    </button>
                    <p className="text-xs text-text-muted">
                      {v.role} &middot; {formatNumber(v.contract_count || 0)} {t('contracts')} &middot; {formatCompactMXN(v.contract_value_mxn || 0)}
                    </p>
                  </div>
                  {v.avg_risk_score != null && <RiskBadge score={v.avg_risk_score} className="text-xs" />}
                </div>
              ))}
            </div>
          )}
          {/* External Evidence */}
          {(newsHits.length > 0 || !showEvidenceForm) && (
            <div className="space-y-2 pt-2 border-t border-border/20">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{t('externalEvidence')}</p>
              {newsHits.map((ev, i) => (
                <div key={i} className="flex gap-2 p-2 rounded bg-background-elevated/20">
                  <Newspaper className="h-3.5 w-3.5 text-emerald-400/60 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary">{ev.source_title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{ev.summary}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-secondary font-mono">{ev.source_type}</span>
                      {ev.source_url && (
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-accent hover:text-accent flex items-center gap-0.5"
                        >
                          {t('source')} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {newsHits.length === 0 && !showEvidenceForm && (
                <p className="text-xs text-text-muted">{t('noEvidence')}</p>
              )}
            </div>
          )}

          {/* Add evidence form */}
          {showEvidenceForm ? (
            <div className="p-3 rounded border border-accent/20 bg-accent/[0.02] space-y-2">
              <p className="text-xs font-bold text-accent uppercase tracking-wider">{t('evidenceForm.title')}</p>
              <input
                className="w-full text-xs bg-background-elevated border border-border/50 rounded px-2 py-1.5 text-text-primary placeholder-text-muted/50"
                placeholder={t('evidenceForm.urlPlaceholder')}
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
              />
              <input
                className="w-full text-xs bg-background-elevated border border-border/50 rounded px-2 py-1.5 text-text-primary placeholder-text-muted/50"
                placeholder={t('evidenceForm.titlePlaceholder')}
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
              />
              <textarea
                className="w-full text-xs bg-background-elevated border border-border/50 rounded px-2 py-1.5 text-text-primary placeholder-text-muted/50 resize-none"
                rows={2}
                placeholder={t('evidenceForm.summaryPlaceholder')}
                value={evidenceSummary}
                onChange={(e) => setEvidenceSummary(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <select
                  className="text-xs bg-background-elevated border border-border/50 rounded px-2 py-1 text-text-secondary"
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                >
                  <option value="news">{t('evidenceForm.types.news')}</option>
                  <option value="asf_audit">{t('evidenceForm.types.asf_audit')}</option>
                  <option value="legal">{t('evidenceForm.types.legal')}</option>
                  <option value="investigative">{t('evidenceForm.types.investigative')}</option>
                </select>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!evidenceUrl || !evidenceTitle || addEvidenceMutation.isPending}
                  onClick={() => addEvidenceMutation.mutate()}
                >
                  {addEvidenceMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  <span className="ml-1">{t('evidenceForm.submit')}</span>
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowEvidenceForm(false)}>
                  {t('evidenceForm.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowEvidenceForm(true)}>
              <Plus className="h-3 w-3 mr-1" /> {t('addEvidence')}
            </Button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/30">
        <span className="text-xs text-text-secondary mr-2">{t('review')}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-risk-low/30 text-risk-low hover:bg-risk-low/10"
          disabled={isReviewing || detail.validation_status === 'corroborated'}
          onClick={() => onReview('corroborated')}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" /> {t('actions.corroborate')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-risk-critical/30 text-risk-critical hover:bg-risk-critical/10"
          disabled={isReviewing || detail.validation_status === 'refuted'}
          onClick={() => onReview('refuted')}
        >
          <XCircle className="h-3 w-3 mr-1" /> {t('actions.refute')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={isReviewing || detail.validation_status === 'inconclusive'}
          onClick={() => onReview('inconclusive')}
        >
          <HelpCircle className="h-3 w-3 mr-1" /> {t('actions.inconclusive')}
        </Button>

        {detail.validation_status === 'corroborated' && (
          <Button
            size="sm"
            className="h-7 text-xs ml-auto bg-accent/20 text-accent hover:bg-accent/30"
            disabled={promoteMutation.isPending}
            onClick={() => promoteMutation.mutate()}
          >
            {promoteMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            )}
            {t('actions.promoteToGroundTruth')}
          </Button>
        )}
        {promoteMutation.isSuccess && (
          <span className="text-xs text-risk-low ml-2">{t('actions.promotedSuccess')}</span>
        )}
      </div>
    </div>
  )
}

export default Investigation
