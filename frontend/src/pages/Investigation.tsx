/**
 * Investigation Page
 * ML-generated investigation cases with external validation tracking.
 * Shows the full pipeline: Detection -> Research -> Corroboration -> Ground Truth
 *
 * Phase 1C: Sortable table replacing card grid. Row click navigates to full detail page.
 * v3.4: Enhanced card view with risk-coded borders, score badges, progress bars, rank numbers.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
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
} from '@/api/types'
import {
  Crosshair,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  ChevronRight,
  Shield,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  User,
  FileText,
  Calendar,
  Search,
  LayoutGrid,
  List,
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
// TYPES
// ============================================================================

type SortKey = 'suspicion_score' | 'total_contracts' | 'total_value_mxn' | 'priority'
type SortDir = 'asc' | 'desc'

// ============================================================================
// STATUS HELPERS
// ============================================================================

const STATUS_CONFIG: Record<InvestigationValidationStatus, {
  icon: React.ElementType
  className: string
}> = {
  pending: {
    icon: Clock,
    className: 'bg-risk-medium/15 text-risk-medium border border-risk-medium/30',
  },
  corroborated: {
    icon: CheckCircle2,
    className: 'bg-risk-low/15 text-risk-low border border-risk-low/30',
  },
  refuted: {
    icon: XCircle,
    className: 'bg-risk-critical/15 text-risk-critical border border-risk-critical/30',
  },
  inconclusive: {
    icon: HelpCircle,
    className: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
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
// PRIORITY HELPERS
// ============================================================================

type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

function getPriority(score: number): { level: PriorityLevel; n: number } {
  if (score >= 0.75) return { level: 'critical', n: 1 }
  if (score >= 0.50) return { level: 'high', n: 2 }
  if (score >= 0.25) return { level: 'medium', n: 3 }
  return { level: 'low', n: 4 }
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

// ============================================================================
// RISK SCORE BADGE
// ============================================================================

function RiskScoreBadge({
  score,
  sectorAvg,
}: {
  score: number
  sectorAvg?: number
}) {
  const pct = (score * 100).toFixed(0)
  const priority = getPriority(score)
  const delta = sectorAvg != null ? ((score - sectorAvg) * 100).toFixed(0) : null
  const colorClass = SCORE_COLOR[priority.level]

  return (
    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
      <span className={cn('text-2xl font-black tabular-nums font-mono leading-none', colorClass)}>
        {pct}%
      </span>
      {delta != null && (
        <span className="text-[10px] font-mono text-text-muted">
          {Number(delta) >= 0 ? '+' : ''}{delta}pp vs avg
        </span>
      )}
    </div>
  )
}

// ============================================================================
// RISK PROGRESS BAR
// ============================================================================

function RiskProgressBar({ score }: { score: number }) {
  const priority = getPriority(score)
  const colorClass =
    priority.level === 'critical' ? 'bg-risk-critical' :
    priority.level === 'high' ? 'bg-risk-high' :
    priority.level === 'medium' ? 'bg-risk-medium' :
    'bg-risk-low'

  return (
    <div className="h-0.5 w-full bg-border mt-3 rounded-full overflow-hidden">
      <div
        className={cn('h-full transition-all duration-700 rounded-full', colorClass)}
        style={{ width: `${Math.min(score * 100, 100)}%` }}
      />
    </div>
  )
}

// ============================================================================
// RISK BORDER + BG TINT HELPERS
// ============================================================================

function getRiskBorderStyle(score: number): React.CSSProperties {
  if (score >= 0.5) return { borderLeftWidth: '4px', borderLeftColor: 'var(--color-risk-critical)' }
  if (score >= 0.3) return { borderLeftWidth: '4px', borderLeftColor: 'var(--color-risk-high)' }
  if (score >= 0.1) return { borderLeftWidth: '4px', borderLeftColor: 'var(--color-risk-medium)' }
  return { borderLeftWidth: '4px', borderLeftColor: 'var(--color-risk-low)' }
}

function getRiskBgClass(score: number): string {
  if (score >= 0.5) return 'bg-risk-critical/[0.03]'
  if (score >= 0.3) return 'bg-risk-high/[0.03]'
  return ''
}

// ============================================================================
// CASE CARD (card-grid view)
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
  const priority = getPriority(caseItem.suspicion_score)
  const sectorColor = SECTOR_COLORS[caseItem.sector_name] || '#64748b'
  const cleanTitle = toTitleCase(
    caseItem.title
      .replace(/ - Anomalous Procurement Pattern$/, '')
      .replace(/ - Externally Corroborated Investigation$/, '')
  )
  const { t } = useTranslation('investigation')
  const rankNum = String(index + 1).padStart(2, '0')

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative group cursor-pointer rounded-lg border border-border/50 p-4 transition-all',
        'hover:border-border hover:bg-background-elevated/60',
        getRiskBgClass(caseItem.suspicion_score)
      )}
      style={getRiskBorderStyle(caseItem.suspicion_score)}
    >
      {/* Rank number — large faint background decoration */}
      <span className="absolute top-0 left-0 text-6xl font-black text-text-muted/10 font-mono leading-none select-none pointer-events-none">
        {rankNum}
      </span>

      {/* Card body */}
      <div className="relative">
        {/* Top row: sector badge + status + score */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: sectorColor + '20', color: sectorColor }}
            >
              {getSectorNameEN(caseItem.sector_name)}
            </span>
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider uppercase border',
              PRIORITY_BADGE[priority.level]
            )}>
              P{priority.n}
            </span>
            <StatusPill status={caseItem.validation_status} />
          </div>
          {/* Risk score badge — top right */}
          <RiskScoreBadge score={caseItem.suspicion_score} />
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2 leading-snug mb-2">
          {cleanTitle}
        </h3>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-text-muted tabular-nums font-mono">
          <span>{formatNumber(caseItem.total_contracts)} {t('card.contracts')}</span>
          <span className="text-border">|</span>
          <span>{formatCompactMXN(caseItem.total_value_mxn)}</span>
          {caseItem.vendor_count > 0 && (
            <>
              <span className="text-border">|</span>
              <span>{caseItem.vendor_count} vendor{caseItem.vendor_count !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>

        {/* Risk progress bar — full width at bottom */}
        <RiskProgressBar score={caseItem.suspicion_score} />

        {/* Chevron hint */}
        <ChevronRight className="absolute bottom-0 right-0 h-3.5 w-3.5 text-text-muted/40 group-hover:text-accent transition-colors" />
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
      className="cursor-pointer px-3 py-2.5 text-left text-xs font-medium text-text-muted hover:text-accent transition-colors select-none whitespace-nowrap"
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
// INVESTIGATION INTAKE
// ============================================================================

type IntakeTab = 'institution' | 'vendor' | 'pattern' | 'time' | null

function InvestigationIntake() {
  const { t } = useTranslation('investigation')
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<IntakeTab>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')

  const tabs = [
    { key: 'institution' as const, icon: Building2, label: t('intake.byInstitution') },
    { key: 'vendor' as const, icon: User, label: t('intake.byVendor') },
    { key: 'pattern' as const, icon: FileText, label: t('intake.byPattern') },
    { key: 'time' as const, icon: Calendar, label: t('intake.byTimePeriod') },
  ]

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchTerm.trim()) return
    if (activeTab === 'institution') {
      navigate(`/contracts?institution=${encodeURIComponent(searchTerm.trim())}`)
    } else if (activeTab === 'vendor') {
      navigate(`/contracts?vendor=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  function handlePatternClick(pattern: string) {
    const params = new URLSearchParams()
    if (pattern === 'directAward') params.set('is_direct_award', 'true')
    else if (pattern === 'singleBid') params.set('is_single_bid', 'true')
    else if (pattern === 'decemberRush') params.set('month', '12')
    navigate(`/contracts?${params.toString()}`)
  }

  function handleTimeSearch() {
    const params = new URLSearchParams()
    if (yearFrom) params.set('year_from', yearFrom)
    if (yearTo) params.set('year_to', yearTo)
    navigate(`/contracts?${params.toString()}`)
  }

  return (
    <Card className="border-accent/20 bg-accent/[0.02]">
      <CardContent className="pt-5 pb-4">
        <div className="text-center mb-4">
          <h2 className="text-base font-bold text-text-primary mb-1">{t('intake.title')}</h2>
          <p className="text-xs text-text-muted">{t('intake.subtitle')}</p>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(isActive ? null : tab.key)
                  setSearchTerm('')
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium transition-all',
                  isActive
                    ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent/30'
                    : 'border-border/50 text-text-secondary hover:border-accent/40 hover:text-accent'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search panels */}
        {(activeTab === 'institution' || activeTab === 'vendor') && (
          <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'institution' ? t('intake.institutionPlaceholder') : t('intake.vendorPlaceholder')}
                className="w-full pl-8 pr-3 py-2 text-xs bg-background-elevated border border-border/50 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              {t('intake.go')}
            </button>
          </form>
        )}

        {activeTab === 'pattern' && (
          <div className="flex flex-wrap justify-center gap-2">
            {(['directAward', 'singleBid', 'decemberRush'] as const).map((pattern) => (
              <button
                key={pattern}
                onClick={() => handlePatternClick(pattern)}
                className="px-4 py-2 text-xs font-medium border border-border/50 rounded-lg text-text-secondary hover:border-accent/40 hover:text-accent transition-all"
              >
                {t(`intake.patterns.${pattern}`)}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'time' && (
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              min="2002"
              max="2025"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value)}
              placeholder={t('intake.yearFrom')}
              className="w-28 px-3 py-2 text-xs bg-background-elevated border border-border/50 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
            <span className="text-text-muted text-xs">-</span>
            <input
              type="number"
              min="2002"
              max="2025"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value)}
              placeholder={t('intake.yearTo')}
              className="w-28 px-3 py-2 text-xs bg-background-elevated border border-border/50 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
            <button
              onClick={handleTimeSearch}
              className="px-4 py-2 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              {t('intake.go')}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-text-muted mt-4">{t('intake.browseExisting')}</p>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function Investigation() {
  const navigate = useNavigate()
  const { t } = useTranslation('investigation')

  // Filter state
  const [statusFilter, setStatusFilter] = useState<InvestigationValidationStatus | 'all'>('all')
  const [minScore, setMinScore] = useState<number | undefined>(undefined)
  const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all')

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('suspicion_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // View mode: 'cards' or 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Data queries
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['investigation', 'dashboard-summary'],
    queryFn: () => investigationApi.getDashboardSummary(),
    staleTime: 5 * 60 * 1000,
  })

  const filterParams: InvestigationFilterParams = useMemo(() => ({
    validation_status: statusFilter === 'all' ? undefined : statusFilter,
    min_score: minScore,
    per_page: 100,
  }), [statusFilter, minScore])

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
  }, [allCases, priorityFilter, sortKey, sortDir])

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
      {/* HERO HEADER */}
      <PageHero
        trackingLabel={t('hero.trackingLabel')}
        icon={<Crosshair className="h-4 w-4 text-accent" />}
        headline={summaryLoading ? '—' : t('hero.casesCount', { count: summary?.total_cases || 0 })}
        subtitle={t('hero.subtitle')}
        detail={
          summaryLoading
            ? undefined
            : `${summary?.corroborated_cases || 0} ${t('hero.confirmedDetail')} · ${formatCompactMXN(summary?.total_value_at_risk || 0)} ${t('hero.valueAtRisk')}`
        }
        loading={summaryLoading}
      />
      <p className="text-xs text-text-secondary max-w-3xl leading-relaxed -mt-4">
        {t('description')}
      </p>

      {/* INVESTIGATION INTAKE */}
      <InvestigationIntake />

      {/* VALIDATION FUNNEL */}
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

      {/* CONFIRMED BIG FISH */}
      {(summary?.top_corroborated?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-3.5 w-3.5 text-risk-low" />
            <h2 className="text-sm font-bold text-text-primary">{t('sections.confirmed')}</h2>
            <span className="text-xs text-text-muted ml-1">{t('sections.confirmedSubtitle')}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summary!.top_corroborated.map((item) => (
              <BigFishCard key={item.case_id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* WORKFLOW GUIDE */}
      <details className="mb-2 border rounded-lg p-4 bg-muted/30">
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

      {/* QUEUE HEADER — priority filter chips + status/score filters */}
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
          {/* View mode toggle */}
          <div className="flex items-center border border-border/50 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                'px-2 py-1.5 transition-colors',
                viewMode === 'cards' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary'
              )}
              title="Card view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'px-2 py-1.5 transition-colors',
                viewMode === 'table' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary'
              )}
              title="Table view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

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

      {/* CASE LIST — card grid or sortable table */}
      {casesLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">{t('queue.empty')}</p>
      ) : viewMode === 'cards' ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {cases.map((c, i) => (
              <CaseCard
                key={c.case_id}
                caseItem={c}
                index={i}
                onClick={() => navigate(`/investigation/${c.case_id}`)}
              />
            ))}
          </div>
          <p className="text-xs text-text-muted text-right">
            {cases.length} {cases.length === 1 ? 'case' : 'cases'}
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/40 bg-background-elevated/60">
                <tr>
                  <SortHeader
                    label={t('queue.priority') || 'Priority'}
                    field="priority"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted">
                    {t('table.case')}
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted">
                    {t('table.sector')}
                  </th>
                  <SortHeader
                    label="Score"
                    field="suspicion_score"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label={t('card.contracts')}
                    field="total_contracts"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Value"
                    field="total_value_mxn"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted">
                    {t('table.status')}
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-text-muted">
                    Evidence
                  </th>
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
          <div className="px-4 py-2 border-t border-border/30 bg-background-elevated/30 text-xs text-text-muted">
            {cases.length} {cases.length === 1 ? 'case' : 'cases'}
          </div>
        </div>
      )}

      {/* SECTOR BREAKDOWN */}
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
// CASE TABLE ROW
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
      className={cn(
        'hover:bg-background-elevated/40 cursor-pointer transition-colors group',
        getRiskBgClass(caseItem.suspicion_score)
      )}
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

      {/* Score — prominent */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex flex-col items-start gap-0.5">
          <span className={cn('text-sm font-black tabular-nums font-mono', SCORE_COLOR[priority.level])}>
            {(caseItem.suspicion_score * 100).toFixed(0)}%
          </span>
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
        <span className="text-xs text-text-secondary tabular-nums">
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

      {/* Evidence count (vendor count as proxy) */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted tabular-nums">
            {evidenceCount > 0 ? (
              <span className="text-text-secondary font-medium">{evidenceCount}</span>
            ) : (
              <span className="text-text-muted">—</span>
            )}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-text-muted group-hover:text-accent transition-colors" />
        </div>
      </td>
    </tr>
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
  const navigate = useNavigate()

  const cleanTitle = toTitleCase(
    item.title
      .replace(/ - Anomalous Procurement Pattern$/, '')
      .replace(/ - Externally Corroborated Investigation$/, '')
  )

  return (
    <Card
      className="border-emerald-500/20 bg-emerald-500/[0.02] hover:border-emerald-500/30 transition-colors group cursor-pointer"
      onClick={() => navigate(`/investigation/${item.case_id}`)}
    >
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
          {cleanTitle}
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
          <span className={cn('text-xs font-bold', SCORE_COLOR[getPriority(item.score).level])}>
            {(item.score * 100).toFixed(0)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default Investigation
