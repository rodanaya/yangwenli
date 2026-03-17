/**
 * ARIA Investigation Queue
 *
 * Displays the output of the Automated Risk Investigation Algorithm pipeline.
 * Vendors are ranked by IPS (Investigation Priority Score) and organized into
 * 4 tiers. Investigators can review, confirm, or dismiss each lead.
 */

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { PageHeader } from '@/components/layout/PageHeader'
import { ariaApi } from '@/api/client'
import type { AriaQueueItem, AriaQueueResponse } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import {
  Shield,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Play,
  Loader2,
  Filter,
  Cpu,
  Download,
  X,
  Info,
} from 'lucide-react'

// ============================================================================
// Constants
// ============================================================================

const PATTERN_LABELS: Record<string, { label: string; color: string; description: string }> = {
  P1: {
    label: 'Monopoly',
    color: 'bg-red-900 text-red-200',
    description:
      'Vendor holds a disproportionate share of contracts within a sector, indicating potential market dominance through non-competitive means.',
  },
  P2: {
    label: 'Ghost Co.',
    color: 'bg-purple-900 text-purple-200',
    description:
      'Entity exhibits characteristics of a shell company: short operating history, few contracts, high direct-award rate, and no verifiable RFC or physical presence.',
  },
  P3: {
    label: 'Intermediary',
    color: 'bg-orange-900 text-orange-200',
    description:
      'Vendor appears to act as a pass-through, winning contracts in sectors outside its primary industry and potentially reselling to actual providers.',
  },
  P4: {
    label: 'Bid Rigging',
    color: 'bg-yellow-900 text-yellow-200',
    description:
      'Multiple vendors exhibit coordinated bidding patterns, including bid rotation, cover bidding, or market allocation by geography or institution.',
  },
  P5: {
    label: 'Overpricing',
    color: 'bg-blue-900 text-blue-200',
    description:
      'Contract amounts are statistically anomalous compared to sector benchmarks, suggesting inflated pricing or quantity manipulation.',
  },
  P6: {
    label: 'Inst. Capture',
    color: 'bg-pink-900 text-pink-200',
    description:
      'Vendor receives a disproportionate share of contracts from a single institution, often through direct awards, suggesting institutional capture.',
  },
  P7: {
    label: 'Conflict',
    color: 'bg-gray-700 text-gray-300',
    description:
      'Potential conflict of interest detected through shared addresses, representatives, or RFC patterns between vendor and awarding officials.',
  },
}

const TIER_CONFIG: Record<
  number,
  { label: string; badgeClass: string; borderClass: string; bgClass: string }
> = {
  1: {
    label: 'CRITICAL',
    badgeClass: 'bg-red-900/80 text-red-200 border-red-700',
    borderClass: 'border-l-red-500',
    bgClass: 'bg-red-950/20',
  },
  2: {
    label: 'PRIORITY',
    badgeClass: 'bg-orange-900/80 text-orange-200 border-orange-700',
    borderClass: 'border-l-orange-500',
    bgClass: 'bg-orange-950/20',
  },
  3: {
    label: 'ROUTINE',
    badgeClass: 'bg-yellow-900/80 text-yellow-200 border-yellow-700',
    borderClass: 'border-l-yellow-600',
    bgClass: 'bg-yellow-950/10',
  },
  4: {
    label: 'MONITOR',
    badgeClass: 'bg-gray-700/80 text-gray-300 border-gray-600',
    borderClass: 'border-l-gray-500',
    bgClass: '',
  },
}

const REVIEW_STATUS_CONFIG: Record<
  AriaQueueItem['review_status'],
  { label: string; icon: React.ElementType; cls: string }
> = {
  pending: { label: 'Pending', icon: Clock, cls: 'text-text-muted' },
  reviewing: { label: 'Reviewing', icon: Eye, cls: 'text-blue-400' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, cls: 'text-green-400' },
  dismissed: { label: 'Dismissed', icon: AlertTriangle, cls: 'text-gray-500' },
}

// ============================================================================
// Generic overlay modal
// ============================================================================

function OverlayModal({
  open,
  onClose,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'bg-background border border-border/60 rounded-xl p-6 w-full shadow-2xl',
          maxWidth
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function TierStatCard({
  tier,
  count,
  isActive,
  onClick,
}: {
  tier: 1 | 2 | 3 | 4
  count: number
  isActive: boolean
  onClick: () => void
}) {
  const cfg = TIER_CONFIG[tier]
  return (
    <button
      onClick={onClick}
      className={cn(
        'fern-card flex flex-col items-center gap-1.5 px-4 py-4 text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        isActive
          ? cn('border-current ring-1 ring-accent/30', cfg.badgeClass)
          : ''
      )}
      aria-pressed={isActive}
    >
      <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
        T{tier} {cfg.label}
      </span>
      <span className="pull-stat tabular-nums">{formatNumber(count)}</span>
    </button>
  )
}

function PatternBadge({
  pattern,
  onClick,
}: {
  pattern: string | null
  onClick?: (pattern: string) => void
}) {
  if (!pattern) return <span className="text-text-muted text-xs">--</span>
  const cfg = PATTERN_LABELS[pattern]
  if (!cfg) return <span className="text-xs font-mono text-text-muted">{pattern}</span>
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(pattern)
      }}
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer',
        'hover:ring-1 hover:ring-white/20 transition-shadow',
        cfg.color
      )}
      aria-label={`View details for pattern ${pattern}: ${cfg.label}`}
    >
      {pattern}: {cfg.label}
    </button>
  )
}

function ExternalFlags({ item }: { item: AriaQueueItem }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {item.is_efos_definitivo && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-900/70 text-red-200 border border-red-700/50">
          EFOS
        </span>
      )}
      {item.is_sfp_sanctioned && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-900/70 text-orange-200 border border-orange-700/50">
          SFP
        </span>
      )}
      {item.in_ground_truth && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-900/70 text-blue-200 border border-blue-700/50">
          GT
        </span>
      )}
      {item.new_vendor_risk && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-900/70 text-purple-200 border border-purple-700/50"
          title="New/suspicious vendor -- ML model blind spot"
        >
          NEW
        </span>
      )}
      {!item.is_efos_definitivo &&
        !item.is_sfp_sanctioned &&
        !item.in_ground_truth &&
        !item.new_vendor_risk && <span className="text-text-muted text-xs">--</span>}
    </div>
  )
}

function IpsBar({ score, tier }: { score: number; tier: 1 | 2 | 3 | 4 }) {
  const tierColors: Record<number, string> = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-gray-500',
  }
  const pct = Math.min(100, Math.max(0, score * 100))
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="relative flex-1 h-1.5 bg-background-elevated rounded-full overflow-hidden">
        <div
          className={cn('absolute left-0 top-0 h-full rounded-full transition-all', tierColors[tier])}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-text-secondary w-8 text-right">
        {score.toFixed(2)}
      </span>
    </div>
  )
}

function ReviewStatusSelect({
  item,
  onUpdate,
  isUpdating,
}: {
  item: AriaQueueItem
  onUpdate: (status: AriaQueueItem['review_status']) => void
  isUpdating: boolean
}) {
  const cfg = REVIEW_STATUS_CONFIG[item.review_status ?? 'pending'] ?? REVIEW_STATUS_CONFIG.pending
  const StatusIcon = cfg.icon
  return (
    <div className="flex items-center gap-1">
      {isUpdating ? (
        <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
      ) : (
        <StatusIcon className={cn('h-3 w-3', cfg.cls)} />
      )}
      <select
        value={item.review_status}
        onChange={(e) => onUpdate(e.target.value as AriaQueueItem['review_status'])}
        disabled={isUpdating}
        className={cn(
          'text-xs bg-transparent border border-border/30 rounded px-1.5 py-0.5',
          'focus:outline-none focus:border-accent/60',
          'cursor-pointer',
          cfg.cls
        )}
        aria-label={`Review status for ${item.vendor_name}`}
      >
        <option value="pending">Pending</option>
        <option value="reviewing">Reviewing</option>
        <option value="confirmed">Confirmed</option>
        <option value="dismissed">Dismissed</option>
      </select>
    </div>
  )
}

// ============================================================================
// IPS Trajectory display (horizontal bar in expanded view)
// ============================================================================

function IpsTrajectoryBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score * 100))
  return (
    <div className="mt-3 mb-1">
      <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1.5">
        Investigation Priority
      </h4>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 h-3 bg-background-elevated rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </div>
        <span className="text-sm font-mono font-bold tabular-nums text-accent w-14 text-right">
          {pct.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// Inline memo display
// ============================================================================

function MemoPanel({ memoText }: { memoText: string | null | undefined }) {
  return (
    <div className="mt-4 rounded-lg bg-background-elevated border-l-4 border-l-accent/70 overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border/20">
        <Cpu className="h-3.5 w-3.5 text-accent" />
        <h4 className="text-xs font-mono uppercase tracking-wider text-accent font-semibold">
          LLM Analysis
        </h4>
      </div>
      <div className="px-4 py-3">
        {memoText ? (
          <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
            {memoText}
          </pre>
        ) : (
          <p className="text-xs text-text-muted italic">No AI memo generated yet</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Ghost heuristic panel (new vendor risk triggers)
// ============================================================================

const TRIGGER_LABELS: Record<string, { label: string; description: string }> = {
  DA_NEAR_EXCLUSIVE: { label: 'DA ≥95%', description: 'Near-exclusive direct award rate — no competitive bidding' },
  SINGLE_INSTITUTION: { label: 'Single Client', description: 'Exclusively contracted by one institution' },
  NO_RFC: { label: 'No RFC', description: 'No tax ID on record — identity unverifiable' },
  VERY_NEW: { label: 'Debut ≥2018', description: 'Company appeared after 2018' },
  NOT_RUPC: { label: 'Not in RUPC', description: 'Absent from government vendor registry' },
  FEW_CONTRACTS: { label: '<8 Contracts', description: 'Very low contract volume for value received' },
  DECEMBER_RUSH: { label: 'Dec. Rush', description: 'Year-end contract concentration' },
}

function GhostHeuristicPanel({ item }: { item: AriaQueueItem }) {
  if (!item.new_vendor_risk) return null
  const score = item.new_vendor_risk_score ?? 0
  const triggers = item.new_vendor_risk_triggers
    ? item.new_vendor_risk_triggers.split(',').map((t) => t.trim()).filter(Boolean)
    : []
  const pct = Math.min(100, score * 100)
  return (
    <div className="mt-4 rounded-lg border border-purple-700/40 bg-purple-950/20 overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-purple-700/20">
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-900/70 text-purple-200 border border-purple-700/50">
          NEW
        </span>
        <h4 className="text-xs font-mono uppercase tracking-wider text-purple-300 font-semibold">
          Ghost Company Heuristic
        </h4>
        <span className="ml-auto text-xs text-text-muted">ML blind-spot compensator</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {/* Confidence bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted">Heuristic confidence</span>
            <span className="text-xs font-mono font-bold text-purple-300 tabular-nums">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all"
              style={{ width: `${pct}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
        {/* Trigger chips */}
        {triggers.length > 0 && (
          <div>
            <p className="text-xs text-text-muted mb-2">Signals fired ({triggers.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {triggers.map((t) => {
                const info = TRIGGER_LABELS[t]
                return (
                  <span
                    key={t}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-purple-900/50 text-purple-200 border border-purple-700/40 cursor-default"
                    title={info?.description ?? t}
                  >
                    {info?.label ?? t}
                  </span>
                )
              })}
            </div>
            <div className="mt-2 space-y-1">
              {triggers.map((t) => {
                const info = TRIGGER_LABELS[t]
                if (!info) return null
                return (
                  <p key={t} className="text-[10px] text-text-muted leading-relaxed">
                    <span className="text-purple-400 font-mono">{info.label}</span>
                    {' — '}
                    {info.description}
                  </p>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Vendor context panel (expanded row — key behavioral stats)
// ============================================================================

function StatCell({
  label,
  value,
  sub,
  warn,
}: {
  label: string
  value: string
  sub?: string
  warn?: boolean
}) {
  return (
    <div className="flex flex-col">
      <span className={cn('text-sm font-mono font-semibold tabular-nums', warn ? 'text-orange-400' : 'text-text-primary')}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-text-muted mt-0.5">{sub}</span>}
      <span className="text-[10px] uppercase tracking-wider text-text-muted mt-1">{label}</span>
    </div>
  )
}

function VendorContextPanel({ item }: { item: AriaQueueItem }) {
  const da = item.direct_award_rate
  const sb = item.single_bid_rate
  const daWarn = da !== undefined && da > 0.7
  const sbWarn = sb !== undefined && sb > 0.4

  return (
    <div className="mt-3 rounded-lg bg-background-elevated border border-border/20 overflow-hidden">
      <div className="px-4 py-2 border-b border-border/20">
        <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted">Vendor Profile</h4>
      </div>
      <div className="px-4 py-3 grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-3">
        <StatCell
          label="Years Active"
          value={item.years_active !== undefined && item.years_active !== null ? String(item.years_active) : '--'}
        />
        <StatCell
          label="Contracts"
          value={formatNumber(item.total_contracts)}
        />
        <StatCell
          label="Total Value"
          value={formatCompactMXN(item.total_value_mxn)}
        />
        <StatCell
          label="Avg Risk"
          value={item.avg_risk_score !== undefined ? item.avg_risk_score.toFixed(3) : '--'}
          warn={item.avg_risk_score > 0.40}
        />
        <StatCell
          label="Direct Award"
          value={da !== undefined ? `${(da * 100).toFixed(0)}%` : '--'}
          warn={daWarn}
          sub={daWarn ? 'high DA rate' : undefined}
        />
        <StatCell
          label="Single Bid"
          value={sb !== undefined ? `${(sb * 100).toFixed(0)}%` : '--'}
          warn={sbWarn}
          sub={sbWarn ? 'collusion signal' : undefined}
        />
      </div>
      {item.top_institution && (
        <div className="px-4 pb-3 border-t border-border/10 pt-2">
          <span className="text-[10px] uppercase tracking-wider text-text-muted mr-2">Top Institution</span>
          <span className="text-xs text-text-secondary font-mono">{item.top_institution}</span>
          {item.top_institution_ratio !== undefined && item.top_institution_ratio !== null && (
            <span className={cn('ml-2 text-xs font-mono', item.top_institution_ratio > 0.6 ? 'text-orange-400' : 'text-text-muted')}>
              {(item.top_institution_ratio * 100).toFixed(0)}% of awards
            </span>
          )}
        </div>
      )}
      {(item.reviewer_name || item.reviewer_notes) && (
        <div className="px-4 pb-3 border-t border-border/10 pt-2 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-text-muted">Reviewer</span>
          {item.reviewer_name && (
            <span className="text-xs text-text-secondary">{item.reviewer_name}</span>
          )}
          {item.reviewer_notes && (
            <p className="text-xs text-text-muted italic mt-0.5">{item.reviewer_notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Score breakdown panel (expanded row)
// ============================================================================

function ScoreBreakdownPanel({ item }: { item: AriaQueueItem }) {
  const components = [
    { label: 'Risk Score', value: item.risk_score_norm },
    { label: 'Mahalanobis', value: item.mahalanobis_norm },
    { label: 'Ensemble', value: item.ensemble_norm },
    { label: 'Financial Scale', value: item.financial_scale_norm },
    { label: 'External Flags', value: item.external_flags_score },
  ]

  const patterns = Object.entries(PATTERN_LABELS).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    confidence: (item.pattern_confidences ?? {})[key] ?? 0,
    color: cfg.color,
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
      {/* Score breakdown table */}
      <div>
        <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
          IPS Components
        </h4>
        <div className="space-y-1.5">
          {components.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-32 flex-shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-background-elevated rounded-full overflow-hidden">
                {value !== undefined && value !== null && (
                  <div
                    className="h-full bg-accent/60 rounded-full"
                    style={{ width: `${Math.min(100, value * 100)}%` }}
                    aria-hidden="true"
                  />
                )}
              </div>
              <span className="text-xs font-mono tabular-nums text-text-muted w-10 text-right">
                {value !== undefined && value !== null ? value.toFixed(3) : '--'}
              </span>
            </div>
          ))}
          <div className="border-t border-border/20 pt-1.5 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary w-32 flex-shrink-0">
                IPS Raw
              </span>
              <div className="flex-1 h-1.5 bg-background-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${Math.min(100, item.ips_raw * 100)}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs font-mono font-semibold text-text-primary w-10 text-right">
                {item.ips_raw.toFixed(3)}
              </span>
            </div>
            {item.fp_penalty > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-text-muted w-32 flex-shrink-0">FP Penalty</span>
                <span className="text-xs font-mono text-orange-400">
                  -{item.fp_penalty.toFixed(3)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-text-primary w-32 flex-shrink-0">
                IPS Final
              </span>
              <div className="flex-1 h-2 bg-background-elevated rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', {
                    'bg-red-500': item.ips_tier === 1,
                    'bg-orange-500': item.ips_tier === 2,
                    'bg-yellow-500': item.ips_tier === 3,
                    'bg-gray-500': item.ips_tier === 4,
                  })}
                  style={{ width: `${Math.min(100, item.ips_final * 100)}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs font-mono font-bold tabular-nums w-10 text-right">
                {item.ips_final.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pattern confidences */}
      <div>
        <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
          Pattern Confidences
        </h4>
        <div className="space-y-1.5">
          {patterns.map(({ key, label, confidence }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs font-mono text-text-secondary w-24 flex-shrink-0">
                {key}: {label}
              </span>
              <div className="flex-1 h-1.5 bg-background-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent/50 rounded-full"
                  style={{ width: `${Math.min(100, confidence * 100)}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-text-muted w-10 text-right">
                {confidence > 0 ? confidence.toFixed(2) : '--'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Row component
// ============================================================================

function QueueRow({
  item,
  onStatusUpdate,
  updatingId,
  isSelected,
  onSelectToggle,
  onPatternClick,
}: {
  item: AriaQueueItem
  onStatusUpdate: (vendorId: number, status: AriaQueueItem['review_status']) => void
  updatingId: number | null
  isSelected: boolean
  onSelectToggle: (vendorId: number) => void
  onPatternClick: (pattern: string) => void
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<AriaQueueItem | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const cfg = TIER_CONFIG[item.ips_tier]

  const handleExpand = async () => {
    if (!expanded && !detail) {
      setLoadingDetail(true)
      try {
        const d = await ariaApi.getVendorDetail(item.vendor_id)
        setDetail(d)
      } catch {
        // fall back to summary data
        setDetail(item)
      } finally {
        setLoadingDetail(false)
      }
    }
    setExpanded((prev) => !prev)
  }

  const displayItem = detail ?? item

  return (
    <div
      className={cn(
        'border-l-4 rounded-r-lg mb-1.5 overflow-hidden transition-colors',
        cfg.borderClass,
        isSelected ? 'ring-1 ring-accent/40 bg-accent/5' : '',
        expanded ? cfg.bgClass : 'hover:bg-background-elevated/30'
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
        onClick={handleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            void handleExpand()
          }
        }}
        aria-expanded={expanded}
        aria-label={`${item.vendor_name} -- T${item.ips_tier} ${cfg.label}. Click to expand.`}
      >
        {/* Checkbox for bulk selection */}
        <div
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelectToggle(item.vendor_id)}
            className="rounded border-border/50 bg-transparent cursor-pointer"
            aria-label={`Select ${item.vendor_name}`}
          />
        </div>

        {/* Tier badge */}
        <span
          className={cn(
            'flex-shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
            cfg.badgeClass
          )}
        >
          T{item.ips_tier}
        </span>

        {/* Vendor name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{item.vendor_name}</p>
          {item.primary_sector_name && (
            <p className="text-xs text-text-muted truncate">{item.primary_sector_name}</p>
          )}
        </div>

        {/* IPS bar */}
        <div className="hidden sm:block w-28 flex-shrink-0">
          <IpsBar score={item.ips_final} tier={item.ips_tier} />
        </div>

        {/* Pattern */}
        <div className="hidden md:block flex-shrink-0 w-32">
          <PatternBadge pattern={item.primary_pattern} onClick={onPatternClick} />
        </div>

        {/* Contracts + Value */}
        <div className="hidden lg:flex flex-col items-end flex-shrink-0 w-24">
          <span className="text-xs font-mono text-text-secondary">
            {formatNumber(item.total_contracts)} ct
          </span>
          <span className="text-xs font-mono text-text-muted">
            {formatCompactMXN(item.total_value_mxn)}
          </span>
        </div>

        {/* External flags */}
        <div className="hidden lg:block flex-shrink-0 w-24">
          <ExternalFlags item={item} />
        </div>

        {/* Status selector -- stop propagation so clicks don't toggle row */}
        <div
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <ReviewStatusSelect
            item={item}
            onUpdate={(status) => onStatusUpdate(item.vendor_id, status)}
            isUpdating={updatingId === item.vendor_id}
          />
        </div>

        {/* Expand chevron */}
        <div className="flex-shrink-0 text-text-muted" aria-hidden="true">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/20">
          {loadingDetail ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <>
              {/* IPS trajectory bar */}
              <IpsTrajectoryBar score={displayItem.ips_final} />

              {/* Vendor behavioral context */}
              <VendorContextPanel item={displayItem} />

              {/* Score breakdown */}
              <ScoreBreakdownPanel item={displayItem} />

              {/* Memo panel */}
              <MemoPanel memoText={displayItem.memo_text} />

              {/* Ghost company heuristic — only when new_vendor_risk=true */}
              <GhostHeuristicPanel item={displayItem} />

              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/vendors/${item.vendor_id}`)}
                  className="gap-1.5 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Vendor Profile
                </Button>
                {(item.ips_tier === 1 || item.ips_tier === 2) && (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/thread/${item.vendor_id}`)}
                    className="gap-1.5 text-xs bg-[#dc2626] hover:bg-red-700 text-white border-0"
                  >
                    <Play className="h-3 w-3" />
                    Investigate →
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Confirmation modal for pipeline run
// ============================================================================

function RunConfirmModal({
  open,
  onConfirm,
  onCancel,
  isRunning,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  isRunning: boolean
}) {
  if (!open) return null
  return (
    <OverlayModal open={open} onClose={onCancel} maxWidth="max-w-sm">
      <h2 className="text-base font-semibold text-text-primary mb-2 flex items-center gap-2">
        <Play className="h-4 w-4 text-accent" />
        Run ARIA Pipeline?
      </h2>
      <p className="text-sm text-text-secondary mb-5">
        This will re-score all vendors and rebuild the investigation queue. The run may take several
        minutes. Existing review statuses will be preserved.
      </p>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isRunning}>
          Cancel
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={isRunning} className="gap-1.5">
          {isRunning ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              Run Now
            </>
          )}
        </Button>
      </div>
    </OverlayModal>
  )
}

// ============================================================================
// Pattern Deep-Dive Modal
// ============================================================================

function PatternDeepDiveModal({
  open,
  onClose,
  pattern,
  queueData,
}: {
  open: boolean
  onClose: () => void
  pattern: string | null
  queueData: AriaQueueItem[]
}) {
  if (!pattern) return null

  const cfg = PATTERN_LABELS[pattern]
  if (!cfg) return null

  // Find vendors with this pattern from currently loaded data
  const matchingVendors = queueData
    .filter((item) => item.primary_pattern === pattern)
    .sort((a, b) => b.ips_final - a.ips_final)

  const top3 = matchingVendors.slice(0, 3)

  return (
    <OverlayModal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center px-2 py-1 rounded text-sm font-mono font-bold',
              cfg.color
            )}
          >
            {pattern}
          </span>
          <h2 className="text-base font-semibold text-text-primary">{cfg.label}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Description */}
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary leading-relaxed">{cfg.description}</p>
        </div>

        {/* Count */}
        <div className="bg-background-elevated rounded-lg px-4 py-3">
          <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
            Vendors with this pattern (loaded page)
          </p>
          <p className="text-xl font-bold font-mono tabular-nums text-text-primary">
            {matchingVendors.length}
          </p>
        </div>

        {/* Top 3 */}
        {top3.length > 0 && (
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
              Highest IPS
            </h3>
            <div className="space-y-2">
              {top3.map((v) => (
                <div
                  key={v.vendor_id}
                  className="flex items-center gap-3 bg-background-elevated rounded-lg px-3 py-2"
                >
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
                      TIER_CONFIG[v.ips_tier].badgeClass
                    )}
                  >
                    T{v.ips_tier}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{v.vendor_name}</p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-accent font-bold">
                    {v.ips_final.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </OverlayModal>
  )
}

// ============================================================================
// Bulk action floating bar
// ============================================================================

function BulkActionBar({
  selectedCount,
  onConfirm,
  onDismiss,
  onExport,
  isProcessing,
  progress,
}: {
  selectedCount: number
  onConfirm: () => void
  onDismiss: () => void
  onExport: () => void
  isProcessing: boolean
  progress: { done: number; total: number } | null
}) {
  if (selectedCount < 2) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
      >
        <div className="bg-background-card border border-border rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4">
          {isProcessing && progress ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span className="text-sm text-text-secondary font-mono">
                {progress.done}/{progress.total}
              </span>
            </div>
          ) : (
            <>
              <span className="text-sm text-text-secondary font-mono">
                {selectedCount} selected
              </span>
              <Button
                size="sm"
                onClick={onConfirm}
                disabled={isProcessing}
                className="gap-1.5 text-xs bg-green-800 hover:bg-green-700 text-green-100 border-green-600"
              >
                <Shield className="h-3.5 w-3.5" />
                Confirm {selectedCount}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                disabled={isProcessing}
                className="gap-1.5 text-xs border-red-700/50 text-red-300 hover:bg-red-900/30"
              >
                <X className="h-3.5 w-3.5" />
                Dismiss {selectedCount}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onExport}
                disabled={isProcessing}
                className="gap-1.5 text-xs border-blue-700/50 text-blue-300 hover:bg-blue-900/30"
              >
                <Download className="h-3.5 w-3.5" />
                Export {selectedCount}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================================================
// Empty state
// ============================================================================

function EmptyState({ onRun, isRunning }: { onRun: () => void; isRunning: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Shield className="h-12 w-12 text-text-muted/30 mb-4" />
      <h3 className="text-base font-semibold text-text-primary mb-1">No investigation queue yet</h3>
      <p className="text-sm text-text-muted mb-6 max-w-sm">
        Run the ARIA pipeline to generate investigation leads from the 3.1M contract database.
      </p>
      <Button onClick={onRun} disabled={isRunning} className="gap-2">
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Run ARIA Pipeline
      </Button>
    </div>
  )
}

// ============================================================================
// CSV export helpers
// ============================================================================

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function generateCsv(items: AriaQueueItem[]): string {
  const headers = [
    'vendor_name',
    'ips_final',
    'avg_risk_score',
    'pattern_types',
    'total_contracts',
    'direct_award_rate',
    'review_status',
  ]

  const rows = items.map((item) =>
    [
      escapeCsvField(item.vendor_name),
      item.ips_final.toFixed(4),
      item.avg_risk_score.toFixed(4),
      item.primary_pattern ?? '',
      String(item.total_contracts),
      item.direct_award_rate !== undefined ? item.direct_award_rate.toFixed(4) : '',
      item.review_status,
    ].join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================================
// Main page
// ============================================================================

export default function AriaQueue() {
  const queryClient = useQueryClient()

  // Filters
  const [selectedTier, setSelectedTier] = useState<number | null>(null)
  const [selectedPattern, setSelectedPattern] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [efosOnly, setEfosOnly] = useState(false)
  const [newVendorOnly, setNewVendorOnly] = useState(false)
  const [page, setPage] = useState(1)

  // Confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Pattern deep-dive modal
  const [patternModalPattern, setPatternModalPattern] = useState<string | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  // Track which vendor's status is being updated
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Build query params
  const queryParams = useMemo(
    () => ({
      ...(selectedTier ? { tier: selectedTier } : {}),
      ...(selectedPattern ? { pattern: selectedPattern } : {}),
      ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      ...(efosOnly ? { efos_only: true } : {}),
      ...(newVendorOnly ? { new_vendor_only: true } : {}),
      page,
      per_page: 50,
    }),
    [selectedTier, selectedPattern, searchTerm, efosOnly, newVendorOnly, page]
  )

  // Fetch queue
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['aria-queue', queryParams],
    queryFn: () => ariaApi.getQueue(queryParams),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['aria-stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 2 * 60 * 1000,
    retry: 0,
  })

  // Run pipeline mutation
  const runMutation = useMutation({
    mutationFn: () => ariaApi.runPipeline(),
    onSuccess: () => {
      setConfirmOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['aria-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['aria-stats'] })
    },
    onError: () => {
      setConfirmOpen(false)
    },
  })

  // Review status mutation
  const reviewMutation = useMutation({
    mutationFn: ({
      vendorId,
      status,
    }: {
      vendorId: number
      status: AriaQueueItem['review_status']
    }) => ariaApi.updateReview(vendorId, { review_status: status }),
    onMutate: ({ vendorId }) => {
      setUpdatingId(vendorId)
    },
    onSettled: () => {
      setUpdatingId(null)
      void queryClient.invalidateQueries({ queryKey: ['aria-queue'] })
    },
  })

  const handleStatusUpdate = (vendorId: number, status: AriaQueueItem['review_status']) => {
    reviewMutation.mutate({ vendorId, status })
  }

  // Bulk selection handlers
  const handleSelectToggle = useCallback((vendorId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(vendorId)) {
        next.delete(vendorId)
      } else {
        next.add(vendorId)
      }
      return next
    })
  }, [])

  const runBulkAction = useCallback(
    async (status: AriaQueueItem['review_status']) => {
      const ids = Array.from(selectedIds)
      if (ids.length === 0) return
      setBulkProcessing(true)
      setBulkProgress({ done: 0, total: ids.length })
      for (let i = 0; i < ids.length; i++) {
        try {
          await ariaApi.updateReview(ids[i], { review_status: status })
        } catch {
          // continue on error
        }
        setBulkProgress({ done: i + 1, total: ids.length })
      }
      setBulkProcessing(false)
      setBulkProgress(null)
      setSelectedIds(new Set())
      void queryClient.invalidateQueries({ queryKey: ['aria-queue'] })
    },
    [selectedIds, queryClient]
  )

  const handleBulkExportSelected = useCallback(() => {
    if (!data?.data) return
    const selected = data.data.filter((item) => selectedIds.has(item.vendor_id))
    if (selected.length === 0) return
    const csv = generateCsv(selected)
    downloadCsv(csv, `aria_selected_${selected.length}_vendors.csv`)
  }, [data, selectedIds])

  // Export T1/T2 handler -- fetches all high-IPS vendors
  const [exportingCsv, setExportingCsv] = useState(false)
  const handleExportT1T2 = useCallback(async () => {
    setExportingCsv(true)
    try {
      // Fetch T1 and T2 pages (up to 500 each)
      const results: AriaQueueItem[] = []
      for (const tier of [1, 2] as const) {
        let pg = 1
        let hasMore = true
        while (hasMore) {
          const resp: AriaQueueResponse = await ariaApi.getQueue({
            tier,
            page: pg,
            per_page: 200,
          })
          results.push(...resp.data)
          hasMore = pg < (resp.pagination?.total_pages ?? 1)
          pg++
          // Safety cap at 2000 per tier
          if (results.length > 4000) break
        }
      }
      if (results.length > 0) {
        const csv = generateCsv(results)
        downloadCsv(csv, `aria_t1_t2_${results.length}_vendors.csv`)
      }
    } catch {
      // silently fail
    } finally {
      setExportingCsv(false)
    }
  }, [])

  const handlePatternClick = useCallback((pattern: string) => {
    setPatternModalPattern(pattern)
  }, [])

  const hasData = (data?.data?.length ?? 0) > 0
  const latestRun = stats?.latest_run
  const tierCounts = {
    1: latestRun?.tier1_count ?? 0,
    2: latestRun?.tier2_count ?? 0,
    3: latestRun?.tier3_count ?? 0,
    4: latestRun?.tier4_count ?? 0,
  }
  const newVendorCount = stats?.new_vendor_count ?? 0

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-5 max-w-7xl mx-auto"
    >
      {/* Page header */}
      <PageHeader
        title="Investigation Queue"
        subtitle={`ARIA -- Automated Risk Investigation Algorithm${latestRun?.completed_at ? ` -- Last run: ${new Date(latestRun.completed_at).toLocaleString()}` : ''}`}
        icon={Shield}
        label="COLA DE INVESTIGACION"
        actions={
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleExportT1T2()}
              disabled={exportingCsv}
              className="gap-1.5 text-xs"
              aria-label="Export T1 and T2 vendors to CSV"
            >
              {exportingCsv ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export T1/T2
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 text-xs"
              aria-label="Refresh queue"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={runMutation.isPending}
              className="gap-1.5 text-xs"
            >
              {runMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run Pipeline
            </Button>
          </div>
        }
      />

      {/* Tier stat cards */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
        initial="hidden"
        animate="show"
      >
        {([1, 2, 3, 4] as const).map((tier) => (
          <motion.div
            key={tier}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } } }}
          >
            <TierStatCard
              tier={tier}
              count={tierCounts[tier]}
              isActive={selectedTier === tier}
              onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Filter row */}
      <motion.div variants={staggerItem}>
        <Card className="border-border/40">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-4 w-4 text-text-muted flex-shrink-0" aria-hidden="true" />

              {/* Pattern filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="pattern-filter" className="text-xs text-text-muted sr-only">
                  Pattern
                </label>
                <select
                  id="pattern-filter"
                  value={selectedPattern}
                  onChange={(e) => {
                    setSelectedPattern(e.target.value)
                    setPage(1)
                  }}
                  className="text-xs bg-background-elevated border border-border/40 rounded px-2 py-1.5 focus:outline-none focus:border-accent/60"
                >
                  <option value="">All Patterns</option>
                  {Object.entries(PATTERN_LABELS).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {key}: {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex items-center gap-1.5 flex-1 min-w-[160px] max-w-xs">
                <Search
                  className="h-3.5 w-3.5 text-text-muted flex-shrink-0"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  placeholder="Search vendor name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1)
                  }}
                  className="flex-1 text-xs bg-transparent border-b border-border/40 pb-0.5 focus:outline-none focus:border-accent/60 placeholder:text-text-muted/50"
                  aria-label="Search vendor name"
                />
              </div>

              {/* EFOS toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={efosOnly}
                  onChange={(e) => {
                    setEfosOnly(e.target.checked)
                    setPage(1)
                  }}
                  className="rounded"
                />
                <span className="text-xs text-text-secondary">EFOS only</span>
              </label>

              {/* New vendor toggle pill */}
              <button
                type="button"
                onClick={() => {
                  setNewVendorOnly(!newVendorOnly)
                  setPage(1)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all cursor-pointer border',
                  newVendorOnly
                    ? 'bg-purple-900/60 text-purple-200 border-purple-600'
                    : 'bg-transparent text-text-muted border-border/40 hover:border-purple-700/50 hover:text-purple-300'
                )}
                title="Vendors created after 2022 -- highest ML blind spot risk"
                aria-pressed={newVendorOnly}
              >
                <span
                  className={cn(
                    'inline-block w-1.5 h-1.5 rounded-full',
                    newVendorOnly ? 'bg-purple-400' : 'bg-text-muted/40'
                  )}
                />
                New Vendors
                {newVendorCount > 0 && (
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      newVendorOnly ? 'text-purple-300' : 'text-purple-400/70'
                    )}
                  >
                    {formatNumber(newVendorCount)}
                  </span>
                )}
              </button>

              {/* Clear filters */}
              {(selectedTier || selectedPattern || searchTerm || efosOnly || newVendorOnly) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => {
                    setSelectedTier(null)
                    setSelectedPattern('')
                    setSearchTerm('')
                    setEfosOnly(false)
                    setNewVendorOnly(false)
                    setPage(1)
                  }}
                >
                  Clear
                </Button>
              )}

              {/* Total count */}
              {data && (
                <span className="ml-auto text-xs text-text-muted font-mono">
                  {formatNumber(data?.pagination?.total ?? 0)} leads
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Queue table */}
      <motion.div variants={staggerItem}>
        <div className="editorial-rule mb-4">
          <span className="editorial-label">Investigation Leads</span>
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin ml-2 inline-block text-text-muted" />}
        </div>
        <Card className="fern-card border-border/40">
          <CardHeader className="pb-2 pt-4 px-4 sr-only">
            <CardTitle>Investigation Leads</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {/* Column header */}
            {hasData && (
              <div className="flex items-center gap-3 px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-text-muted/60 border-b border-border/20 mb-1.5">
                <span className="w-5" />
                <span className="w-6">T</span>
                <span className="flex-1">Vendor / Sector</span>
                <span className="hidden sm:block w-28">IPS Score</span>
                <span className="hidden md:block w-32">Pattern</span>
                <span className="hidden lg:block w-24 text-right">Contracts</span>
                <span className="hidden lg:block w-24">Flags</span>
                <span className="w-28">Status</span>
                <span className="w-4" />
              </div>
            )}

            {/* Skeleton loading */}
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            )}

            {/* Error */}
            {isError && !isLoading && (
              <div className="flex flex-col items-center py-12 text-center">
                <AlertTriangle className="h-8 w-8 text-risk-high mb-3" />
                <p className="text-sm text-text-secondary mb-3">
                  Failed to load investigation queue
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && !hasData && (
              <EmptyState
                onRun={() => setConfirmOpen(true)}
                isRunning={runMutation.isPending}
              />
            )}

            {/* Queue rows */}
            {!isLoading && hasData && (
              <motion.div
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } } }}
                initial="hidden"
                animate="show"
              >
                {data!.data.map((item) => (
                  <motion.div
                    key={item.vendor_id}
                    variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } } }}
                  >
                    <QueueRow
                      item={item}
                      onStatusUpdate={handleStatusUpdate}
                      updatingId={updatingId}
                      isSelected={selectedIds.has(item.vendor_id)}
                      onSelectToggle={handleSelectToggle}
                      onPatternClick={handlePatternClick}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Pagination */}
            {!isLoading && hasData && data && (data?.pagination?.total_pages ?? 0) > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/20">
                <span className="text-xs text-text-muted font-mono">
                  Page {data.pagination?.page ?? 1} of {data.pagination?.total_pages ?? 1}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="text-xs h-7"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (data.pagination?.total_pages ?? 1)}
                    onClick={() => setPage((p) => p + 1)}
                    className="text-xs h-7"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onConfirm={() => void runBulkAction('confirmed')}
        onDismiss={() => void runBulkAction('dismissed')}
        onExport={handleBulkExportSelected}
        isProcessing={bulkProcessing}
        progress={bulkProgress}
      />

      {/* Run confirmation modal */}
      <RunConfirmModal
        open={confirmOpen}
        onConfirm={() => runMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
        isRunning={runMutation.isPending}
      />

      {/* Pattern deep-dive modal */}
      <PatternDeepDiveModal
        open={patternModalPattern !== null}
        onClose={() => setPatternModalPattern(null)}
        pattern={patternModalPattern}
        queueData={data?.data ?? []}
      />
    </motion.div>
  )
}
