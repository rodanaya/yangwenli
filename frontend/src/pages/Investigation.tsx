/**
 * Investigation Page — "EL ARCHIVO"
 * ML-generated investigation cases with external validation tracking.
 * Shows the full pipeline: Detection -> Research -> Corroboration -> Ground Truth
 *
 * Editorial redesign: active investigation bureau aesthetic.
 * ProPublica / The Intercept inspired case file presentation.
 */

import { useState, useMemo } from 'react'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { investigationApi } from '@/api/client'
import { SECTOR_COLORS, getSectorNameEN, getRiskLevelFromScore } from '@/lib/constants'
import { TableExportButton } from '@/components/TableExportButton'
import { EmptyState } from '@/components/EmptyState'
import type {
  InvestigationCaseListItem,
  InvestigationValidationStatus,
  InvestigationFilterParams,
} from '@/api/types'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  ChevronRight,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
  ShieldAlert,
  Search,
  Info,
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

type SortKey = 'suspicion_score' | 'total_contracts' | 'total_value_mxn' | 'priority'
type SortDir = 'asc' | 'desc'

// ============================================================================
// STATUS HELPERS — pipeline phase indicators
// ============================================================================

const STATUS_CONFIG: Record<InvestigationValidationStatus, {
  icon: React.ElementType
  className: string
}> = {
  pending: {
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-500 border border-amber-500/30',
  },
  corroborated: {
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30',
  },
  refuted: {
    icon: XCircle,
    className: 'bg-red-500/10 text-red-500 border border-red-500/30',
  },
  inconclusive: {
    icon: HelpCircle,
    className: 'bg-slate-500/10 text-slate-400 border border-slate-500/30',
  },
}

function StatusPill({ status }: { status: InvestigationValidationStatus }) {
  const { t } = useTranslation('investigation')
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = config.icon
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono',
      config.className
    )}>
      <Icon className="h-3 w-3" />
      {t(`status.${status}`)}
    </span>
  )
}

// ============================================================================
// RISK SCORE DISCLAIMER — reusable inline chip
// ============================================================================

function RiskScoreDisclaimer() {
  const { t } = useTranslation('investigation')
  return (
    <span
      className="inline-flex items-center gap-0.5 cursor-default"
      title={t('riskScoreTooltip')}
      aria-label={t('riskScoreTooltip')}
    >
      <Info className="h-3 w-3 text-text-muted/50 hover:text-text-muted transition-colors" />
    </span>
  )
}

// ============================================================================
// VERIFY PANEL — collapsible "how to verify" guidance for journalists
// ============================================================================

function VerifyPanel() {
  const { t } = useTranslation('investigation')
  return (
    <details className="mt-3 border border-amber-500/15 rounded bg-amber-500/[0.03] group/verify">
      <summary className="flex items-center gap-1.5 px-3 py-2 cursor-pointer select-none text-[10px] font-mono font-semibold text-text-muted/70 hover:text-text-muted transition-colors list-none">
        <Info className="h-3 w-3 text-amber-500/60 flex-shrink-0" aria-hidden="true" />
        {t('verify.toggle')}
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-2">
        <p className="text-[10px] font-bold text-text-muted/80 uppercase tracking-wider font-mono">
          {t('verify.heading')}
        </p>
        <ol className="space-y-1.5 text-[10px] text-text-muted/70 leading-relaxed">
          {(['step1', 'step2', 'step3', 'step4'] as const).map((step, i) => (
            <li key={step} className="flex gap-2">
              <span className="font-mono text-text-muted/40 flex-shrink-0">{i + 1}.</span>
              <span>{t(`verify.${step}`)}</span>
            </li>
          ))}
        </ol>
        <div className="mt-2 p-2 bg-background-elevated/50 rounded border border-border/20">
          <p className="text-[10px] text-text-muted/60 italic leading-relaxed">
            {t('verify.editorial')}
          </p>
        </div>
        <p className="text-[10px] text-amber-500/60 italic leading-relaxed">
          {t('verify.disclaimer')}
        </p>
      </div>
    </details>
  )
}

// ============================================================================
// PRIORITY HELPERS
// ============================================================================

type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

function getPriority(score: number): { level: PriorityLevel; n: number } {
  const level = getRiskLevelFromScore(score)
  const n = level === 'critical' ? 1 : level === 'high' ? 2 : level === 'medium' ? 3 : 4
  return { level, n }
}

const PRIORITY_BADGE: Record<PriorityLevel, string> = {
  critical: 'bg-risk-critical/15 text-risk-critical border border-risk-critical/30',
  high: 'bg-risk-high/15 text-risk-high border border-risk-high/30',
  medium: 'bg-risk-medium/15 text-risk-medium border border-risk-medium/30',
  low: 'bg-risk-low/15 text-risk-low border border-risk-low/30',
}

const SCORE_COLOR: Record<PriorityLevel, string> = {
  critical: 'text-risk-critical',
  high: 'text-risk-high',
  medium: 'text-risk-medium',
  low: 'text-risk-low',
}

// Signal tag appearance map
const SIGNAL_TAG_CLASS: Record<string, string> = {
  multiple_price_anomalies: 'text-risk-high bg-risk-high/10 border-risk-high/25',
  high_single_bid_rate: 'text-risk-medium bg-risk-medium/10 border-risk-medium/25',
  year_end_concentration: 'text-text-secondary bg-border/15 border-border/30',
  high_avg_risk_score: 'text-risk-critical bg-risk-critical/10 border-risk-critical/25',
  high_direct_award_rate: 'text-text-secondary bg-border/15 border-border/30',
  corporate_group_pattern: 'text-purple-400 bg-purple-400/10 border-purple-400/25',
  multi_entity_anomaly: 'text-purple-400 bg-purple-400/10 border-purple-400/25',
}

// ============================================================================
// RISK BORDER + BG TINT HELPERS (used by CaseTableRow)
// ============================================================================

function getRiskBorderStyle(score: number): React.CSSProperties {
  const level = getRiskLevelFromScore(score)
  const colorMap = {
    critical: 'var(--color-risk-critical)',
    high: 'var(--color-risk-high)',
    medium: 'var(--color-risk-medium)',
    low: 'var(--color-risk-low)',
  }
  return { borderLeftWidth: '3px', borderLeftColor: colorMap[level] }
}

function getCardBorderColor(score: number): string {
  const level = getRiskLevelFromScore(score)
  const colorMap = {
    critical: 'var(--color-risk-critical)',
    high: 'var(--color-risk-high)',
    medium: 'var(--color-risk-medium)',
    low: 'var(--color-risk-low)',
  }
  return colorMap[level]
}

// ============================================================================
// CASE CARD — active investigation file aesthetic
// ============================================================================

function CaseCard({
  caseItem,
  index,
  onClick,
}: {
  caseItem: InvestigationCaseListItem
  index: number
  onClick: () => void
}) {
  const { t } = useTranslation('investigation')
  const priority = getPriority(caseItem.suspicion_score)
  const sectorColor = SECTOR_COLORS[caseItem.sector_name] || '#64748b'
  const rankNum = String(index + 1).padStart(2, '0')

  // Extract vendor name — strip the boilerplate suffix
  const vendorName = toTitleCase(
    caseItem.title
      .replace(/ - Anomalous Procurement Pattern$/i, '')
      .replace(/ - Externally Corroborated Investigation$/i, '')
      .replace(/ - .*$/, '')
  )

  const riskBarColor =
    priority.level === 'critical' ? 'bg-risk-critical' :
    priority.level === 'high'     ? 'bg-risk-high' :
    priority.level === 'medium'   ? 'bg-risk-medium' : 'bg-risk-low'

  return (
    <div
      onClick={onClick}
      className="card hover-lift interactive-card relative group p-0 overflow-hidden"
      style={{ borderColor: getCardBorderColor(caseItem.suspicion_score) + '40' }}
    >
      {/* Top accent bar — risk-coded */}
      <div
        className="h-0.5 w-full"
        style={{ backgroundColor: getCardBorderColor(caseItem.suspicion_score) }}
      />

      <div className="p-4">
        {/* Row 0: CASO label + rank */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-text-muted/40">
              {t('table.case')}
            </span>
            <span className="text-lg font-black font-mono text-text-muted/15 tabular-nums leading-none">
              {rankNum}
            </span>
            <span className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border font-mono',
              PRIORITY_BADGE[priority.level]
            )}>
              P{priority.n}
            </span>
            <StatusPill status={caseItem.validation_status} />
          </div>

          {/* Suspicion score — framed as risk indicator, not probability */}
          <div className="flex flex-col items-end gap-0.5">
            <div className={cn(
              'text-2xl font-black font-mono tabular-nums leading-none',
              SCORE_COLOR[priority.level]
            )}>
              {(caseItem.suspicion_score * 100).toFixed(0)}
              <span className="text-sm font-normal text-text-muted/50">/100</span>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[9px] text-text-muted/50 font-mono uppercase tracking-wide">
                {t('riskScoreLabel')}
              </span>
              <RiskScoreDisclaimer />
            </div>
          </div>
        </div>

        {/* Vendor name — the headline */}
        <h3
          style={{ fontFamily: 'var(--font-family-serif)' }}
          className="text-base font-bold text-text-primary group-hover:text-accent transition-colors mb-2 leading-snug"
        >
          {vendorName}
        </h3>

        {/* Sector + signal tags */}
        <div className="flex flex-wrap items-center gap-1 mb-3">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: sectorColor + '25', color: sectorColor }}
          >
            {getSectorNameEN(caseItem.sector_name)}
          </span>
          {caseItem.signals_triggered.slice(0, 3).map((signal) => {
            const cls = SIGNAL_TAG_CLASS[signal]
            if (!cls) return null
            return (
              <span key={signal} className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', cls)}>
                {t(`signalTags.${signal}`, signal.replace(/_/g, ' '))}
              </span>
            )
          })}
        </div>

        {/* Money stats — highlighted */}
        <div className="grid grid-cols-2 gap-4 mb-3 py-2 px-3 rounded bg-background-elevated/40 border border-border/20">
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted/60 mb-0.5">
              {t('card.atRisk', 'At Risk')}
            </div>
            <div className="text-sm font-black font-mono text-text-primary tabular-nums">
              {formatCompactMXN(caseItem.total_value_mxn)}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted/60 mb-0.5">
              {t('card.estLoss', 'Est. Loss')}
            </div>
            <div className="text-sm font-black font-mono text-risk-high tabular-nums">
              {formatCompactMXN(caseItem.estimated_loss_mxn)}
            </div>
          </div>
        </div>

        {/* Meta stats */}
        <div className="flex items-center gap-2 text-[11px] text-text-muted font-mono">
          <span>{formatNumber(caseItem.total_contracts)} {t('card.contracts')}</span>
          {caseItem.date_range_start && (
            <>
              <span className="text-border/60">·</span>
              <span>{caseItem.date_range_start.slice(0, 4)}-{caseItem.date_range_end?.slice(0, 4) ?? '?'}</span>
            </>
          )}
          {caseItem.vendor_count > 0 && (
            <>
              <span className="text-border/60">·</span>
              <span>{caseItem.vendor_count} {t('vendors')}</span>
            </>
          )}
        </div>

        {/* Risk bar */}
        <div className="h-px w-full bg-border/20 mt-3 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', riskBarColor)}
            style={{ width: `${Math.min(caseItem.suspicion_score * 100, 100)}%` }}
          />
        </div>

        {/* Verify panel — stops click propagation so opening it doesn't navigate */}
        <div onClick={(e) => e.stopPropagation()}>
          <VerifyPanel />
        </div>

        <ChevronRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-text-muted/30 group-hover:text-accent transition-colors" />
      </div>
    </div>
  )
}

// ============================================================================
// SORT HEADER
// ============================================================================

function SortHeader({
  label,
  field,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string
  field: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onSort: (field: SortKey) => void
}) {
  const active = sortKey === field
  return (
    <th
      onClick={() => onSort(field)}
      className="cursor-pointer px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-accent transition-colors select-none whitespace-nowrap font-mono"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'desc' ? (
            <ArrowDown className="h-3 w-3 text-accent" />
          ) : (
            <ArrowUp className="h-3 w-3 text-accent" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  )
}

// ============================================================================
// MAIN PAGE — "EL ARCHIVO"
// ============================================================================

export function Investigation() {
  const navigate = useNavigate()
  const { t } = useTranslation('investigation')

  // Filter state
  const [statusFilter, setStatusFilter] = useState<InvestigationValidationStatus | 'all'>('all')
  const [minScore, setMinScore] = useState<number | undefined>(undefined)
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('suspicion_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // View mode: 'cards' or 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')

  // Data queries
  const filterParams: InvestigationFilterParams = useMemo(() => ({
    validation_status: statusFilter === 'all' ? undefined : statusFilter,
    min_score: minScore,
    per_page: 100,
  }), [statusFilter, minScore])

  const { data: casesData, isLoading: casesLoading, isError: casesError } = useQuery({
    queryKey: ['investigation', 'cases', filterParams],
    queryFn: () => investigationApi.getCases(filterParams),
    staleTime: 5 * 60 * 1000,
  })

  const allCases = casesData?.data || []

  // Priority counts
  const priorityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const c of allCases) {
      counts[getPriority(c.suspicion_score).level]++
    }
    return counts
  }, [allCases])

  // Handle sort click
  function handleSort(field: SortKey) {
    if (sortKey === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(field)
      setSortDir('desc')
    }
  }

  // Filtered + sorted cases
  const cases = useMemo(() => {
    let filtered = allCases
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((c) => getPriority(c.suspicion_score).level === priorityFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.case_id.toLowerCase().includes(q) ||
        c.sector_name.toLowerCase().includes(q)
      )
    }

    return [...filtered].sort((a, b) => {
      let aVal: number
      let bVal: number

      switch (sortKey) {
        case 'suspicion_score':
          aVal = a.suspicion_score
          bVal = b.suspicion_score
          break
        case 'total_contracts':
          aVal = a.total_contracts
          bVal = b.total_contracts
          break
        case 'total_value_mxn':
          aVal = a.total_value_mxn
          bVal = b.total_value_mxn
          break
        case 'priority':
          aVal = getPriority(a.suspicion_score).n
          bVal = getPriority(b.suspicion_score).n
          break
        default:
          return 0
      }

      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
  }, [allCases, priorityFilter, searchQuery, sortKey, sortDir])

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, corroborated: 0, refuted: 0, inconclusive: 0 }
    for (const c of allCases) {
      if (c.validation_status in counts) {
        counts[c.validation_status as keyof typeof counts]++
      }
    }
    return counts
  }, [allCases])

  if (casesError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <span>{t('loadingError')}</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingCount = useMemo(() => statusCounts.pending, [statusCounts])
  const corroboratedCount = useMemo(() => statusCounts.corroborated, [statusCounts])
  const refutedCount = useMemo(() => statusCounts.refuted, [statusCounts])
  const totalCases = allCases.length

  return (
    <EditorialPageShell
      kicker="THE ARCHIVE · ML-GENERATED CASES"
      headline={
        <>
          {casesLoading ? 'Loading cases...' : formatNumber(totalCases)}{' '}
          cases await <span style={{ color: 'var(--color-risk-high)' }}>journalist verification.</span>
        </>
      }
      paragraph="These are investigation cases generated by the RUBLI risk model. Each case identifies vendor patterns consistent with documented corruption. The pipeline moves from automated Detection through Research and Corroboration before cases become ground truth."
      stats={casesLoading ? undefined : [
        { value: formatNumber(totalCases), label: 'Total cases' },
        { value: formatNumber(pendingCount), label: 'Pending', color: 'var(--color-risk-high)' },
        { value: formatNumber(corroboratedCount), label: 'Corroborated', color: '#3fb950' },
        { value: formatNumber(refutedCount), label: 'Refuted' },
      ]}
      loading={casesLoading}
      severity="high"
    >
      <Act number="I" label="OPEN CASES">

      {/* ================================================================
          FILTROS DE INVESTIGACION
          ================================================================ */}
      <div className="mb-6 space-y-3">
        <div className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-text-muted/50">
          {t('filterHeader')}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority pills */}
          {(
            [
              { key: 'all', label: t('queue.allPriorities'), count: allCases.length, color: 'text-text-secondary border-border/50 hover:border-accent/40' },
              { key: 'critical', label: t('queue.critical'), count: priorityCounts.critical, color: 'text-risk-critical border-risk-critical/30 hover:border-risk-critical/50 bg-risk-critical/5' },
              { key: 'high', label: t('queue.high'), count: priorityCounts.high, color: 'text-risk-high border-risk-high/30 hover:border-risk-high/50 bg-risk-high/5' },
              { key: 'medium', label: t('queue.medium'), count: priorityCounts.medium, color: 'text-risk-medium border-risk-medium/30 hover:border-risk-medium/50 bg-risk-medium/5' },
              { key: 'low', label: t('queue.low'), count: priorityCounts.low, color: 'text-risk-low border-risk-low/30 hover:border-risk-low/50 bg-risk-low/5' },
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

          {/* Separator */}
          <div className="w-px h-5 bg-border/40 mx-1 hidden sm:block" />

          {/* Validation status pills */}
          {(
            [
              { key: 'all', label: t('filters.allStatuses'), icon: null },
              { key: 'pending', label: t('status.pending'), icon: Clock },
              { key: 'corroborated', label: t('status.corroborated'), icon: CheckCircle2 },
              { key: 'refuted', label: t('status.refuted'), icon: XCircle },
              { key: 'inconclusive', label: t('status.inconclusive'), icon: HelpCircle },
            ] as const
          ).map((pill) => {
            const Icon = pill.icon
            const count = pill.key === 'all' ? allCases.length : statusCounts[pill.key as keyof typeof statusCounts]
            return (
              <button
                key={pill.key}
                onClick={() => setStatusFilter(pill.key as InvestigationValidationStatus | 'all')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium font-mono uppercase tracking-wider border transition-all',
                  statusFilter === pill.key
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'text-text-muted border-border/30 hover:border-border/60'
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {pill.label}
                <span className="text-text-muted/50 tabular-nums ml-0.5">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Search + view controls row */}
        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted/50" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background-elevated border border-border/40 rounded text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Score filter dropdown */}
            <select
              className="text-xs bg-background-elevated border border-border/40 rounded px-2 py-1.5 text-text-secondary font-mono"
              value={minScore ?? ''}
              onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">{t('filters.anyScore')}</option>
              <option value="0.5">{t('filters.scoreMin', { threshold: '0.50' })}</option>
              <option value="0.3">{t('filters.scoreMin', { threshold: '0.30' })}</option>
              <option value="0.2">{t('filters.scoreMin', { threshold: '0.20' })}</option>
            </select>

            {/* View toggle */}
            <div className="flex items-center border border-border/40 rounded overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={cn('px-2 py-1.5 transition-colors', viewMode === 'cards' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary')}
                title={t('viewCards')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn('px-2 py-1.5 transition-colors', viewMode === 'table' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary')}
                title={t('viewTable')}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            <TableExportButton
              data={cases.map((c) => ({
                case_id: c.case_id,
                title: c.title,
                sector: c.sector_name,
                suspicion_score: c.suspicion_score,
                total_value_mxn: c.total_value_mxn,
                estimated_loss_mxn: c.estimated_loss_mxn,
                total_contracts: c.total_contracts,
                signals: c.signals_triggered.join(', '),
                validation_status: c.validation_status,
              }))}
              filename="rubli-investigation-cases"
            />
          </div>
        </div>
      </div>

      {/* ================================================================
          CASE LIST
          ================================================================ */}
      <div>
        {casesLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : cases.length === 0 ? (
            <EmptyState
              icon={statusFilter !== 'all' || minScore !== undefined || priorityFilter !== 'all' ? Filter : ShieldAlert}
              title={t('noInvestigationCasesFound')}
              description={statusFilter !== 'all' || minScore !== undefined || priorityFilter !== 'all' ? t('tryAdjustingFilters') : t('noCasesYet')}
              variant="no-results"
              useIllustration={false}
            />
          ) : viewMode === 'cards' ? (
            <>
              <motion.div
                className="grid gap-3 md:grid-cols-2"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {cases.map((c, i) => (
                  <motion.div key={c.case_id} variants={staggerItem}>
                    <CaseCard caseItem={c} index={i} onClick={() => navigate(`/investigation/${c.case_id}`)} />
                  </motion.div>
                ))}
              </motion.div>
              <p className="text-xs text-text-muted text-right mt-3 font-mono">
                {t('caseCount_other', { count: cases.length })}
              </p>
            </>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              {/* Table section header */}
              <div className="px-4 py-2.5 bg-background-elevated/40 border-b border-border/30">
                <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-text-muted/50">
                  {t('tableHeader', 'Investigation records')}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Investigation cases">
                  <thead className="border-b border-border/40 bg-background-elevated/60">
                    <tr>
                      <SortHeader label={t('queue.priority') || 'Priority'} field="priority" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">{t('table.case')}</th>
                      <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">{t('table.sector')}</th>
                      <SortHeader label={t('tableCol.score')} field="suspicion_score" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label={t('card.contracts')} field="total_contracts" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label={t('tableCol.value')} field="total_value_mxn" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">{t('table.status')}</th>
                      <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">{t('signalTags.title', 'Signal')}</th>
                      <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">{t('tableCol.evidence')}</th>
                    </tr>
                  </thead>
              <tbody className="divide-y divide-border/30">
                {cases.map((c, i) => (
                  <CaseTableRow
                    key={c.case_id}
                    caseItem={c}
                    index={i}
                    onClick={() => navigate(`/investigation/${c.case_id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border/30 bg-background-elevated/30 text-xs text-text-muted font-mono">
            {t('caseCount_other', { count: cases.length })}
          </div>
        </div>
      )}
      </div>

      </Act>
    </EditorialPageShell>
  )
}

// ============================================================================
// CASE TABLE ROW — editorial styled
// ============================================================================

function CaseTableRow({
  caseItem,
  index,
  onClick,
}: {
  caseItem: InvestigationCaseListItem
  index: number
  onClick: () => void
}) {
  const priority = getPriority(caseItem.suspicion_score)
  const sectorColor = SECTOR_COLORS[caseItem.sector_name] || '#64748b'
  const cleanTitle = toTitleCase(
    caseItem.title
      .replace(/ - Anomalous Procurement Pattern$/, '')
      .replace(/ - Externally Corroborated Investigation$/, '')
  )

  // evidence count: from vendor_count and signals_triggered as proxy
  // The list item doesn't have external_sources — we use vendor_count
  const evidenceCount = caseItem.vendor_count || 0

  // Risk-coded left border via inline style
  const borderStyle = getRiskBorderStyle(caseItem.suspicion_score)

  return (
    <tr
      onClick={onClick}
      className="hover:bg-background-elevated/40 cursor-pointer transition-colors group"
      style={borderStyle}
    >
      {/* Rank number */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="relative flex items-center gap-2">
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 text-4xl font-black text-text-muted/10 font-mono leading-none select-none pointer-events-none">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className={cn(
            'relative inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono tracking-wider uppercase border',
            PRIORITY_BADGE[priority.level]
          )}>
            P{priority.n}
          </span>
        </div>
      </td>

      {/* Case title */}
      <td className="px-3 py-3 max-w-[300px]">
        <span className="text-xs font-medium text-text-primary group-hover:text-accent transition-colors line-clamp-2 leading-snug">
          {cleanTitle}
        </span>
      </td>

      {/* Sector */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span
          className="text-xs font-medium px-1.5 py-0.5 rounded"
          style={{ backgroundColor: sectorColor + '18', color: sectorColor }}
        >
          {getSectorNameEN(caseItem.sector_name)}
        </span>
      </td>

      {/* Score — framed as risk indicator */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex flex-col items-start gap-0.5">
          <div className="flex items-center gap-1">
            <span className={cn('text-sm font-black tabular-nums font-mono', SCORE_COLOR[priority.level])}>
              {(caseItem.suspicion_score * 100).toFixed(0)}
              <span className="text-xs font-normal text-text-muted/50">/100</span>
            </span>
            <RiskScoreDisclaimer />
          </div>
          {/* Mini progress bar in table cell */}
          <div className="h-0.5 w-12 bg-border rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                priority.level === 'critical' ? 'bg-risk-critical' :
                priority.level === 'high' ? 'bg-risk-high' :
                priority.level === 'medium' ? 'bg-risk-medium' : 'bg-risk-low'
              )}
              style={{ width: `${Math.min(caseItem.suspicion_score * 100, 100)}%` }}
            />
          </div>
        </div>
      </td>

      {/* Contracts */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="text-xs text-text-secondary tabular-nums font-mono">
          {formatNumber(caseItem.total_contracts)}
        </span>
      </td>

      {/* Value */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="text-xs text-text-secondary tabular-nums font-mono">
          {formatCompactMXN(caseItem.total_value_mxn)}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-3 whitespace-nowrap">
        <StatusPill status={caseItem.validation_status} />
      </td>

      {/* Signal detected */}
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1 max-w-[180px]">
          {caseItem.suspicion_score >= 0.6 && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              Riesgo critico
            </span>
          )}
          {caseItem.signals_triggered.includes('high_direct_award_rate') && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Adj. directa
            </span>
          )}
          {caseItem.total_contracts > 50 && caseItem.suspicion_score >= 0.4 && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Alta concentracion
            </span>
          )}
          {caseItem.vendor_count <= 1 && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Inst. unica
            </span>
          )}
          {caseItem.signals_triggered.includes('multiple_price_anomalies') && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
              Precios anomalos
            </span>
          )}
        </div>
      </td>

      {/* Evidence count (vendor count as proxy) */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted tabular-nums">
            {evidenceCount > 0 ? (
              <span className="text-text-secondary font-medium">{evidenceCount}</span>
            ) : (
              <span className="text-text-muted">&mdash;</span>
            )}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-text-muted group-hover:text-accent transition-colors" />
        </div>
      </td>
    </tr>
  )
}

export default Investigation
