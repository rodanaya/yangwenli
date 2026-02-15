/**
 * Investigation Page
 * ML-generated investigation cases with external validation tracking.
 * Shows the full pipeline: Detection -> Research -> Corroboration -> Ground Truth
 */

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiskBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { investigationApi } from '@/api/client'
import { SECTOR_COLORS, getSectorNameEN } from '@/lib/constants'
import type {
  InvestigationCaseListItem,
  InvestigationCaseDetail,
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
  FileText,
  Scale,
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
  label: string
  icon: React.ElementType
  className: string
  dotClass: string
}> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    dotClass: 'bg-amber-400',
  },
  corroborated: {
    label: 'Corroborated',
    icon: CheckCircle2,
    className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
  refuted: {
    label: 'Refuted',
    icon: XCircle,
    className: 'bg-red-500/15 text-red-400 border border-red-500/30',
    dotClass: 'bg-red-400',
  },
  inconclusive: {
    label: 'Inconclusive',
    icon: HelpCircle,
    className: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
    dotClass: 'bg-slate-400',
  },
}

function StatusPill({ status }: { status: InvestigationValidationStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function Investigation() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Filters
  const [statusFilter, setStatusFilter] = useState<InvestigationValidationStatus | 'all'>('all')
  const [sectorFilter, setSectorFilter] = useState<number | undefined>(undefined)
  const [minScore, setMinScore] = useState<number | undefined>(undefined)
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null)

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

  const cases = casesData?.data || []
  const corroboratedCases = useMemo(
    () => cases.filter((c) => c.validation_status === 'corroborated'),
    [cases]
  )

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
      {/* HEADER */}
      {/* ================================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Crosshair className="h-4 w-4 text-accent" />
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-accent font-[var(--font-family-mono)]">
            INVESTIGATION CASES
          </span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          ML-Generated Investigation Leads
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {summaryLoading ? (
            <Skeleton className="h-4 w-96" />
          ) : (
            <>
              {summary?.total_cases || 0} cases detected by anomaly pipeline
              {' '}&middot;{' '}
              <strong className="text-emerald-400">{summary?.corroborated_cases || 0} externally confirmed</strong>
              {' '}&middot;{' '}
              {formatCompactMXN(summary?.total_value_at_risk || 0)} confirmed value at risk
            </>
          )}
        </p>
      </div>

      {/* ================================================================ */}
      {/* S1: VALIDATION FUNNEL */}
      {/* ================================================================ */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <h2 className="text-sm font-bold text-text-primary mb-3">Validation Pipeline</h2>
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
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <h2 className="text-sm font-bold text-text-primary">Confirmed Investigation Targets</h2>
            <span className="text-[10px] text-text-muted ml-1">
              Externally validated through news reports, ASF audits, and legal proceedings
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summary!.top_corroborated.map((item) => (
              <BigFishCard key={item.case_id} item={item} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* S3: ALL CASES TABLE */}
      {/* ================================================================ */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-text-primary">All Investigation Cases</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-text-muted" />
              {/* Status filter */}
              <select
                className="text-[11px] bg-background-elevated border border-border/50 rounded px-2 py-1 text-text-secondary"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvestigationValidationStatus | 'all')}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="corroborated">Corroborated</option>
                <option value="refuted">Refuted</option>
                <option value="inconclusive">Inconclusive</option>
              </select>
              {/* Score filter */}
              <select
                className="text-[11px] bg-background-elevated border border-border/50 rounded px-2 py-1 text-text-secondary"
                value={minScore ?? ''}
                onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Any score</option>
                <option value="0.5">Score &ge; 0.50</option>
                <option value="0.3">Score &ge; 0.30</option>
                <option value="0.2">Score &ge; 0.20</option>
              </select>
            </div>
          </div>

          {casesLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : cases.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">No cases match the current filters.</p>
          ) : (
            <div className="space-y-0.5">
              {/* Header */}
              <div className="grid grid-cols-[40px_1fr_80px_80px_100px_80px_100px] gap-2 px-2 py-1.5 text-[9px] font-bold tracking-[0.15em] uppercase text-text-muted/60 font-[var(--font-family-mono)]">
                <span>#</span>
                <span>Case</span>
                <span>Sector</span>
                <span className="text-right">Score</span>
                <span className="text-right">Value</span>
                <span className="text-right">Contracts</span>
                <span className="text-center">Status</span>
              </div>
              {cases.map((c, i) => (
                <CaseRow
                  key={c.case_id}
                  caseItem={c}
                  rank={i + 1}
                  isExpanded={expandedCaseId === c.case_id}
                  onToggle={() => setExpandedCaseId(expandedCaseId === c.case_id ? null : c.case_id)}
                  onReview={(status) => reviewMutation.mutate({ caseId: c.case_id, status })}
                  isReviewing={reviewMutation.isPending}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* S5: SECTOR BREAKDOWN */}
      {/* ================================================================ */}
      {sectorBreakdown.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <h2 className="text-sm font-bold text-text-primary mb-3">Cases by Sector</h2>
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
                            <p className="text-[11px] text-text-muted">{d.count} cases</p>
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
  if (!funnel) return null

  const steps = [
    { label: 'Detected', value: funnel.detected, color: 'bg-blue-500' },
    { label: 'Researched', value: funnel.researched, color: 'bg-amber-500' },
    { label: 'Corroborated', value: funnel.corroborated, color: 'bg-emerald-500' },
    { label: 'Ground Truth', value: funnel.promoted_to_gt, color: 'bg-accent' },
  ]

  return (
    <div>
      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1 flex-1">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('h-2 w-2 rounded-full', step.color)} />
                <span className="text-[10px] font-medium text-text-secondary">{step.label}</span>
              </div>
              <div className="text-lg font-bold text-text-primary tabular-nums">{step.value}</div>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-text-muted/30 flex-shrink-0 mx-1" />
            )}
          </div>
        ))}
      </div>
      {hitRate && hitRate.checked > 0 && (
        <p className="text-[11px] text-text-muted mt-3 pt-3 border-t border-border/30">
          <strong className="text-emerald-400">{Math.round(hitRate.rate * 100)}% hit rate</strong>
          {' '}&mdash; {hitRate.confirmed} of {hitRate.checked} investigated vendors have documented corruption investigations
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
  navigate,
}: {
  item: InvestigationDashboardSummary['top_corroborated'][number]
  navigate: ReturnType<typeof useNavigate>
}) {
  const sectorColor = SECTOR_COLORS[item.sector_code] || '#64748b'

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/[0.02] hover:border-emerald-500/30 transition-colors group">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: sectorColor + '20', color: sectorColor }}
          >
            {getSectorNameEN(item.sector_code)}
          </span>
          <StatusPill status="corroborated" />
        </div>
        <h3 className="text-[12px] font-semibold text-text-primary truncate mb-1 group-hover:text-accent transition-colors">
          {toTitleCase(item.title.replace(/ - Anomalous Procurement Pattern$/, '').replace(/ - Externally Corroborated Investigation$/, ''))}
        </h3>
        <p className="text-[10px] text-text-muted line-clamp-2 mb-2 leading-relaxed">
          {item.news_summary}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-text-muted tabular-nums font-[var(--font-family-mono)]">
            <span>{formatCompactMXN(item.value)}</span>
            <span className="text-text-muted/30">|</span>
            <span>{formatNumber(item.contracts)} contracts</span>
          </div>
          <RiskBadge score={item.score} className="text-[9px]" />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// CASE ROW (expandable)
// ============================================================================

function CaseRow({
  caseItem,
  rank,
  isExpanded,
  onToggle,
  onReview,
  isReviewing,
  navigate,
}: {
  caseItem: InvestigationCaseListItem
  rank: number
  isExpanded: boolean
  onToggle: () => void
  onReview: (status: string) => void
  isReviewing: boolean
  navigate: ReturnType<typeof useNavigate>
}) {
  const sectorColor = SECTOR_COLORS[caseItem.sector_name] || '#64748b'

  return (
    <div>
      <button
        className={cn(
          'grid grid-cols-[40px_1fr_80px_80px_100px_80px_100px] gap-2 w-full text-left px-2 py-2 rounded-md transition-colors',
          isExpanded
            ? 'bg-accent/5 border border-accent/20'
            : 'hover:bg-background-elevated/40'
        )}
        onClick={onToggle}
      >
        <span className="text-[11px] text-text-muted tabular-nums font-[var(--font-family-mono)]">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-text-primary truncate">
            {toTitleCase(caseItem.title.replace(/ - Anomalous Procurement Pattern$/, '').replace(/ - Externally Corroborated Investigation$/, ''))}
          </p>
          <p className="text-[9px] text-text-muted truncate">{caseItem.case_id}</p>
        </div>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded self-center w-fit"
          style={{ backgroundColor: sectorColor + '15', color: sectorColor }}
        >
          {getSectorNameEN(caseItem.sector_name)}
        </span>
        <span className="text-[11px] text-text-secondary tabular-nums text-right self-center font-[var(--font-family-mono)]">
          {(caseItem.suspicion_score * 100).toFixed(0)}%
        </span>
        <span className="text-[11px] text-text-secondary tabular-nums text-right self-center font-[var(--font-family-mono)]">
          {formatCompactMXN(caseItem.total_value_mxn)}
        </span>
        <span className="text-[11px] text-text-muted tabular-nums text-right self-center font-[var(--font-family-mono)]">
          {formatNumber(caseItem.total_contracts)}
        </span>
        <span className="self-center flex justify-center">
          <StatusPill status={caseItem.validation_status} />
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <CaseDetailPanel
          caseId={caseItem.case_id}
          onReview={onReview}
          isReviewing={isReviewing}
          navigate={navigate}
        />
      )}
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
  const [activeTab, setActiveTab] = useState<'summary' | 'vendors' | 'questions' | 'evidence'>('summary')
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
      <div className="ml-10 mr-2 my-2 p-4 rounded-md bg-background-elevated/30 border border-border/30">
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
    { key: 'summary', label: 'Summary' },
    { key: 'vendors', label: `Vendors (${detail.vendors.length})` },
    { key: 'questions', label: `Questions (${detail.questions.length})` },
    { key: 'evidence', label: `Evidence (${newsHits.length})` },
  ] as const

  return (
    <div className="ml-10 mr-2 my-2 p-4 rounded-md bg-background-elevated/20 border border-border/30 space-y-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/30 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={cn(
              'px-3 py-1 text-[11px] font-medium rounded-t transition-colors',
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
      {activeTab === 'summary' && (
        <div className="space-y-2">
          {detail.summary && (
            <p className="text-[12px] text-text-secondary leading-relaxed">{detail.summary}</p>
          )}
          {detail.signals_triggered.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {detail.signals_triggered.map((signal) => (
                <span
                  key={signal}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent/80 font-[var(--font-family-mono)]"
                >
                  {signal}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="space-y-1">
          {detail.vendors.map((v) => (
            <div key={v.vendor_id} className="flex items-center gap-3 p-2 rounded hover:bg-background-elevated/40 transition-colors">
              <div className="flex-1 min-w-0">
                <button
                  className="text-[11px] font-medium text-text-primary hover:text-accent transition-colors truncate block"
                  onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                >
                  {toTitleCase(v.name)}
                </button>
                <p className="text-[9px] text-text-muted">
                  {v.role} &middot; {formatNumber(v.contract_count || 0)} contracts &middot; {formatCompactMXN(v.contract_value_mxn || 0)}
                </p>
              </div>
              {v.avg_risk_score != null && <RiskBadge score={v.avg_risk_score} className="text-[9px]" />}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="space-y-2">
          {detail.questions.length === 0 ? (
            <p className="text-[11px] text-text-muted">No investigation questions generated.</p>
          ) : (
            detail.questions.slice(0, 10).map((q) => (
              <div key={q.id} className="flex gap-2 p-2 rounded bg-background-elevated/20">
                <HelpCircle className="h-3.5 w-3.5 text-accent/60 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-text-secondary">{q.question_text}</p>
                  <span className="text-[9px] text-text-muted/60 font-[var(--font-family-mono)]">{q.question_type}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="space-y-2">
          {newsHits.map((ev, i) => (
            <div key={i} className="flex gap-2 p-2 rounded bg-background-elevated/20">
              <Newspaper className="h-3.5 w-3.5 text-emerald-400/60 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-text-primary">{ev.source_title}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{ev.summary}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-text-muted/60 font-[var(--font-family-mono)]">{ev.source_type}</span>
                  {ev.source_url && (
                    <a
                      href={ev.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-accent/70 hover:text-accent flex items-center gap-0.5"
                    >
                      Source <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {newsHits.length === 0 && !showEvidenceForm && (
            <p className="text-[11px] text-text-muted">No external evidence attached yet.</p>
          )}

          {/* Add evidence form */}
          {showEvidenceForm ? (
            <div className="p-3 rounded border border-accent/20 bg-accent/[0.02] space-y-2">
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider">Add Evidence</p>
              <input
                className="w-full text-[11px] bg-background-elevated border border-border/50 rounded px-2 py-1.5 text-text-primary placeholder-text-muted/50"
                placeholder="Source URL"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
              />
              <input
                className="w-full text-[11px] bg-background-elevated border border-border/50 rounded px-2 py-1.5 text-text-primary placeholder-text-muted/50"
                placeholder="Source title"
                value={evidenceTitle}
                onChange={(e) => setEvidenceTitle(e.target.value)}
              />
              <textarea
                className="w-full text-[11px] bg-background-elevated border border-border/50 rounded px-2 py-1.5 text-text-primary placeholder-text-muted/50 resize-none"
                rows={2}
                placeholder="Brief summary of the evidence"
                value={evidenceSummary}
                onChange={(e) => setEvidenceSummary(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <select
                  className="text-[11px] bg-background-elevated border border-border/50 rounded px-2 py-1 text-text-secondary"
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                >
                  <option value="news">News</option>
                  <option value="asf_audit">ASF Audit</option>
                  <option value="legal">Legal</option>
                  <option value="investigative">Investigative</option>
                </select>
                <Button
                  size="sm"
                  className="h-7 text-[10px]"
                  disabled={!evidenceUrl || !evidenceTitle || addEvidenceMutation.isPending}
                  onClick={() => addEvidenceMutation.mutate()}
                >
                  {addEvidenceMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  <span className="ml-1">Submit</span>
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setShowEvidenceForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setShowEvidenceForm(true)}>
              <Plus className="h-3 w-3 mr-1" /> Add Evidence
            </Button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/30">
        <span className="text-[9px] text-text-muted/60 mr-2">Review:</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          disabled={isReviewing || detail.validation_status === 'corroborated'}
          onClick={() => onReview('corroborated')}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" /> Corroborate
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10"
          disabled={isReviewing || detail.validation_status === 'refuted'}
          onClick={() => onReview('refuted')}
        >
          <XCircle className="h-3 w-3 mr-1" /> Refute
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px]"
          disabled={isReviewing || detail.validation_status === 'inconclusive'}
          onClick={() => onReview('inconclusive')}
        >
          <HelpCircle className="h-3 w-3 mr-1" /> Inconclusive
        </Button>

        {detail.validation_status === 'corroborated' && (
          <Button
            size="sm"
            className="h-7 text-[10px] ml-auto bg-accent/20 text-accent hover:bg-accent/30"
            disabled={promoteMutation.isPending}
            onClick={() => promoteMutation.mutate()}
          >
            {promoteMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            )}
            Promote to Ground Truth
          </Button>
        )}
        {promoteMutation.isSuccess && (
          <span className="text-[10px] text-emerald-400 ml-2">Promoted successfully</span>
        )}
      </div>
    </div>
  )
}

export default Investigation
