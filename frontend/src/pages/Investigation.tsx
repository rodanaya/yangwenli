/**
 * Investigation Page — "EL ARCHIVO"
 * ML-generated investigation cases with external validation tracking.
 * Shows the full pipeline: Detection -> Research -> Corroboration -> Ground Truth
 *
 * Editorial redesign: active investigation bureau aesthetic.
 * ProPublica / The Intercept inspired case file presentation.
 */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { investigationApi } from '@/api/client'
import { SECTOR_COLORS, getSectorNameEN } from '@/lib/constants'
import { TableExportButton } from '@/components/TableExportButton'
import { EmptyState } from '@/components/EmptyState'
import type {
  InvestigationCaseListItem,
  InvestigationValidationStatus,
  InvestigationFilterParams,
} from '@/api/types'
import {
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
  Factory,
  Landmark,
  Network,
  Target,
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
  if (score >= 0.5) return { borderLeftWidth: '3px', borderLeftColor: 'var(--color-risk-critical)' }
  if (score >= 0.3) return { borderLeftWidth: '3px', borderLeftColor: 'var(--color-risk-high)' }
  if (score >= 0.1) return { borderLeftWidth: '3px', borderLeftColor: 'var(--color-risk-medium)' }
  return { borderLeftWidth: '3px', borderLeftColor: 'var(--color-risk-low)' }
}

function getCardBorderColor(score: number): string {
  if (score >= 0.75) return 'var(--color-risk-critical)'
  if (score >= 0.50) return 'var(--color-risk-high)'
  if (score >= 0.25) return 'var(--color-risk-medium)'
  return 'var(--color-risk-low)'
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

          {/* Suspicion score — large badge */}
          <div className={cn(
            'text-2xl font-black font-mono tabular-nums leading-none',
            SCORE_COLOR[priority.level]
          )}>
            {(caseItem.suspicion_score * 100).toFixed(0)}
            <span className="text-sm">%</span>
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

        <ChevronRight className="absolute bottom-3 right-3 h-3.5 w-3.5 text-text-muted/30 group-hover:text-accent transition-colors" />
      </div>
    </div>
  )
}

// ============================================================================
// INTEL SIDEBAR — signal radar + sector presence
// ============================================================================

function IntelSidebar({ cases, onNavigate }: { cases: InvestigationCaseListItem[]; onNavigate: (path: string) => void }) {
  const { t } = useTranslation('investigation')
  const signalCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of cases) {
      for (const s of c.signals_triggered) {
        counts[s] = (counts[s] || 0) + 1
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [cases])

  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of cases) {
      counts[c.sector_name] = (counts[c.sector_name] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [cases])

  const totalEstLoss = useMemo(
    () => cases.reduce((s, c) => s + (c.estimated_loss_mxn || 0), 0),
    [cases]
  )

  const maxSignal = signalCounts[0]?.[1] || 1

  return (
    <div className="space-y-5">
      {/* Total estimated loss KPI */}
      <div className="card p-3 border-risk-high/25 bg-risk-high/[0.04]">
        <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted/60 mb-1">
          {t('sidebar.estTotalLoss')}
        </div>
        <div className="text-xl font-black font-mono text-risk-high tabular-nums">
          {formatCompactMXN(totalEstLoss)}
        </div>
        <div className="text-[10px] text-text-muted mt-0.5">{t('sidebar.acrossCases', { n: cases.length })}</div>
      </div>

      {/* Signal Radar */}
      <div>
        <div className="text-[9px] font-bold tracking-widest uppercase text-text-muted/50 font-mono mb-3">
          {t('sidebar.signalRadar')}
        </div>
        <div className="space-y-2.5">
          {signalCounts.map(([signal, count]) => {
            const label = t(`signalTags.${signal}`, signal.replace(/_/g, ' '))
            return (
              <div key={signal}>
                <div className="flex justify-between items-center text-[11px] font-mono mb-1">
                  <span className="text-text-secondary truncate pr-2">{label}</span>
                  <span className="text-text-muted tabular-nums flex-shrink-0">{count}</span>
                </div>
                <div className="h-1 bg-border/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent/50 transition-all duration-500"
                    style={{ width: `${(count / maxSignal) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sector Presence — clickable */}
      <div>
        <div className="text-[9px] font-bold tracking-widest uppercase text-text-muted/50 font-mono mb-3">
          {t('sidebar.sectors')}
        </div>
        <div className="space-y-1.5">
          {sectorCounts.map(([sector, count]) => {
            const sId = cases.find(c => c.sector_name === sector)?.sector_id
            return (
              <button
                key={sector}
                onClick={() => sId && onNavigate(`/categories?sector_id=${sId}`)}
                className="w-full flex items-center justify-between hover:bg-background-elevated/40 rounded px-1 py-0.5 transition-colors group"
                title={sId ? `View spending categories for ${getSectorNameEN(sector)}` : undefined}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: SECTOR_COLORS[sector] || '#64748b' }}
                  />
                  <span className="text-[11px] text-text-secondary truncate capitalize group-hover:text-accent transition-colors">
                    {getSectorNameEN(sector)}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-text-muted tabular-nums ml-2 flex-shrink-0">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <div className="text-[9px] font-bold tracking-widest uppercase text-text-muted/50 font-mono mb-2">
          {t('sidebar.quickLinks')}
        </div>
        <div className="space-y-1">
          <button
            onClick={() => onNavigate('/categories')}
            className="w-full text-left text-[11px] text-text-muted hover:text-accent border border-border/30 hover:border-accent/40 rounded px-2.5 py-1.5 transition-colors flex items-center gap-2"
          >
            <span className="text-[10px]">&#9635;</span>
            {t('sidebar.spendingCategories')}
          </button>
          <button
            onClick={() => onNavigate('/contracts?risk_level=critical')}
            className="w-full text-left text-[11px] text-text-muted hover:text-accent border border-border/30 hover:border-accent/40 rounded px-2.5 py-1.5 transition-colors flex items-center gap-2"
          >
            <span className="text-[10px]">&#9889;</span>
            {t('sidebar.criticalContracts')}
          </button>
          <button
            onClick={() => onNavigate('/cases')}
            className="w-full text-left text-[11px] text-text-muted hover:text-accent border border-border/30 hover:border-accent/40 rounded px-2.5 py-1.5 transition-colors flex items-center gap-2"
          >
            <span className="text-[10px]">&#128203;</span>
            {t('sidebar.caseLibrary')}
          </button>
        </div>
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
  const [activeAngle, setActiveAngle] = useState<string | null>(null)

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('suspicion_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // View mode: 'cards' or 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Data queries
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

  const entryTiles = [
    {
      icon: Factory,
      title: t('entryTiles.bySector'),
      subtitle: t('entryTiles.bySectorSub'),
      href: '/sectors',
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.06)',
      border: 'rgba(220,38,38,0.25)',
    },
    {
      icon: Landmark,
      title: t('entryTiles.byAdmin'),
      subtitle: t('entryTiles.byAdminSub'),
      href: '/administrations',
      color: '#eab308',
      bg: 'rgba(234,179,8,0.06)',
      border: 'rgba(234,179,8,0.25)',
    },
    {
      icon: Network,
      title: t('entryTiles.networks'),
      subtitle: t('entryTiles.networksSub'),
      href: '/network',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.06)',
      border: 'rgba(139,92,246,0.25)',
    },
    {
      icon: Target,
      title: t('entryTiles.capture'),
      subtitle: t('entryTiles.captureSub'),
      href: '/money-flow',
      color: '#be123c',
      bg: 'rgba(190,18,60,0.06)',
      border: 'rgba(190,18,60,0.25)',
    },
  ]

  return (
    <div className="space-y-0">
      {/* ================================================================
          PAGE HEADER — Editorial investigation hub
          ================================================================ */}
      <div className="border-b border-border pb-4 mb-0">
        <div className="text-[10px] tracking-[0.3em] uppercase text-text-muted mb-2 font-mono">
          {t('headerTracking')}
        </div>
        <h1
          style={{ fontFamily: 'var(--font-family-serif)' }}
          className="text-3xl font-bold text-text-primary mb-1"
        >
          {t('headerTitle')}
        </h1>
        <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
          {t('headerDesc')}
        </p>
      </div>

      {/* ================================================================
          SEARCH-FIRST EXPERIENCE
          ================================================================ */}
      <div className="px-0 py-8 border-b border-border mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 px-4 py-3 bg-background-card border border-border rounded-lg focus-within:border-accent transition-colors">
            <Search className="h-4 w-4 text-text-muted flex-shrink-0" />
            <input
              type="text"
              placeholder={t('search.placeholder', 'Search by vendor, institution, sector...')}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted text-text-primary"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Quick investigation angles */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: t('angles.bySector', 'By Sector'), filter: 'sector', href: '/sectors' },
              { label: t('angles.byAdmin', 'By Administration'), filter: 'admin', href: '/administrations' },
              { label: t('angles.byNetwork', 'By Network'), filter: 'network', href: '/network' },
              { label: t('angles.byPattern', 'By Pattern'), filter: 'pattern', href: '/money-flow' },
            ].map(angle => (
              <button
                key={angle.filter}
                onClick={() => {
                  setActiveAngle(activeAngle === angle.filter ? null : angle.filter)
                  navigate(angle.href)
                }}
                className={cn(
                  'px-3 py-2 text-xs font-medium border rounded-md transition-colors text-left',
                  activeAngle === angle.filter
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-background-card border-border text-text-muted hover:text-text-primary hover:border-text-muted/30'
                )}
              >
                {angle.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================
          ENTRY TILES — 2x2 investigation pathways
          ================================================================ */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {entryTiles.map((tile) => {
          const TileIcon = tile.icon
          return (
            <motion.div key={tile.href} variants={staggerItem}>
              <button
                onClick={() => navigate(tile.href)}
                className="w-full text-left min-h-[160px] rounded-xl border p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group relative overflow-hidden"
                style={{
                  background: tile.bg,
                  borderColor: tile.border,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = tile.color)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = tile.border)}
              >
                {/* Corner gradient */}
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 pointer-events-none"
                  style={{ background: tile.color }}
                />
                <TileIcon className="h-8 w-8 mb-3" style={{ color: tile.color }} />
                <h3
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                  className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors mb-1"
                >
                  {tile.title}
                </h3>
                <p className="text-sm text-text-muted">{tile.subtitle}</p>
                <ChevronRight
                  className="absolute bottom-4 right-4 h-4 w-4 text-text-muted/30 group-hover:text-accent transition-colors"
                />
              </button>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ================================================================
          KPI STRIP
          ================================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-3">
          <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted/60 mb-1">{t('kpi.openCases')}</div>
          <div className="text-2xl font-black font-mono text-text-primary tabular-nums">{allCases.length}</div>
        </div>
        <div className="card p-3">
          <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted/60 mb-1">{t('kpi.totalAtRisk')}</div>
          <div className="text-2xl font-black font-mono text-text-primary tabular-nums">
            {formatCompactMXN(allCases.reduce((s, c) => s + c.total_value_mxn, 0))}
          </div>
        </div>
        <div className="card p-3 border-risk-high/20 bg-risk-high/[0.04]">
          <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted/60 mb-1">{t('kpi.estLosses')}</div>
          <div className="text-2xl font-black font-mono text-risk-high tabular-nums">
            {formatCompactMXN(allCases.reduce((s, c) => s + (c.estimated_loss_mxn || 0), 0))}
          </div>
        </div>
        <div className="card p-3">
          <div className="text-[9px] font-mono uppercase tracking-widest text-text-muted/60 mb-1">{t('kpi.sectorsAffected')}</div>
          <div className="text-2xl font-black font-mono text-text-primary tabular-nums">
            {new Set(allCases.map((c) => c.sector_name)).size}
          </div>
        </div>
      </div>

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
          TWO-COLUMN LAYOUT: Intel sidebar + case list
          ================================================================ */}
      <div className="flex gap-6 items-start">
        {/* LEFT: Intel sidebar — hidden on small screens */}
        {allCases.length > 0 && (
          <div className="hidden lg:block w-48 xl:w-52 flex-shrink-0 sticky top-4">
            <IntelSidebar cases={allCases} onNavigate={navigate} />
          </div>
        )}

        {/* RIGHT: Case list */}
        <div className="flex-1 min-w-0">
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
                <table className="w-full text-sm">
                  <thead className="border-b border-border/40 bg-background-elevated/60">
                    <tr>
                      <SortHeader label={t('queue.priority') || 'Priority'} field="priority" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">{t('table.case')}</th>
                      <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">{t('table.sector')}</th>
                      <SortHeader label={t('tableCol.score')} field="suspicion_score" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label={t('card.contracts')} field="total_contracts" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label={t('tableCol.value')} field="total_value_mxn" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted font-mono">{t('table.status')}</th>
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
      </div>
    </div>
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

      {/* Score — risk-colored */}
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
