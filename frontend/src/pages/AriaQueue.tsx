/**
 * ARIA Investigation Queue
 *
 * Displays the output of the Automated Risk Investigation Algorithm pipeline.
 * Vendors are ranked by IPS (Investigation Priority Score) and organized into
 * 4 tiers. Investigators can review, confirm, or dismiss each lead.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { ariaApi } from '@/api/client'
import type { AriaQueueItem } from '@/api/types'
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
} from 'lucide-react'

// ============================================================================
// Constants
// ============================================================================

const PATTERN_LABELS: Record<string, { label: string; color: string }> = {
  P1: { label: 'Monopoly', color: 'bg-red-900 text-red-200' },
  P2: { label: 'Ghost Co.', color: 'bg-purple-900 text-purple-200' },
  P3: { label: 'Intermediary', color: 'bg-orange-900 text-orange-200' },
  P4: { label: 'Bid Rigging', color: 'bg-yellow-900 text-yellow-200' },
  P5: { label: 'Overpricing', color: 'bg-blue-900 text-blue-200' },
  P6: { label: 'Inst. Capture', color: 'bg-pink-900 text-pink-200' },
  P7: { label: 'Conflict', color: 'bg-gray-700 text-gray-300' },
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
        'flex flex-col items-center gap-1 rounded-lg border px-4 py-3 text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        isActive
          ? cn('border-current', cfg.badgeClass)
          : 'border-border/40 hover:border-border/80 bg-surface-alt/30'
      )}
      aria-pressed={isActive}
    >
      <span className="text-xs font-mono uppercase tracking-widest text-text-muted">
        T{tier} {cfg.label}
      </span>
      <span className="text-2xl font-bold font-mono tabular-nums">{formatNumber(count)}</span>
    </button>
  )
}

function PatternBadge({ pattern }: { pattern: string | null }) {
  if (!pattern) return <span className="text-text-muted text-xs">—</span>
  const cfg = PATTERN_LABELS[pattern]
  if (!cfg) return <span className="text-xs font-mono text-text-muted">{pattern}</span>
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono', cfg.color)}>
      {pattern}: {cfg.label}
    </span>
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
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-900/70 text-purple-200 border border-purple-700/50" title="New/suspicious vendor — ML model blind spot">
          NEW
        </span>
      )}
      {!item.is_efos_definitivo && !item.is_sfp_sanctioned && !item.in_ground_truth && !item.new_vendor_risk && (
        <span className="text-text-muted text-xs">—</span>
      )}
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
      <div className="relative flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
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
  const cfg = REVIEW_STATUS_CONFIG[item.review_status]
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
              <div className="flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
                {value !== undefined && value !== null && (
                  <div
                    className="h-full bg-accent/60 rounded-full"
                    style={{ width: `${Math.min(100, value * 100)}%` }}
                    aria-hidden="true"
                  />
                )}
              </div>
              <span className="text-xs font-mono tabular-nums text-text-muted w-10 text-right">
                {value !== undefined && value !== null ? value.toFixed(3) : '—'}
              </span>
            </div>
          ))}
          <div className="border-t border-border/20 pt-1.5 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary w-32 flex-shrink-0">
                IPS Raw
              </span>
              <div className="flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
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
              <div className="flex-1 h-2 bg-surface-alt rounded-full overflow-hidden">
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
              <div className="flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent/50 rounded-full"
                  style={{ width: `${Math.min(100, confidence * 100)}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-text-muted w-10 text-right">
                {confidence > 0 ? confidence.toFixed(2) : '—'}
              </span>
            </div>
          ))}
        </div>

        {/* Memo */}
        {item.memo_text && (
          <div className="mt-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1">
              Investigation Memo
            </h4>
            <pre className="text-xs text-text-secondary bg-surface-alt/30 rounded p-2 whitespace-pre-wrap font-sans leading-relaxed max-h-32 overflow-y-auto">
              {item.memo_text}
            </pre>
          </div>
        )}
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
}: {
  item: AriaQueueItem
  onStatusUpdate: (vendorId: number, status: AriaQueueItem['review_status']) => void
  updatingId: number | null
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
        expanded ? cfg.bgClass : 'hover:bg-surface-alt/20'
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
        aria-label={`${item.vendor_name} — T${item.ips_tier} ${cfg.label}. Click to expand.`}
      >
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
          <PatternBadge pattern={item.primary_pattern} />
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

        {/* Status selector — stop propagation so clicks don't toggle row */}
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
              <ScoreBreakdownPanel item={displayItem} />
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/vendors/${item.vendor_id}`)}
                  className="gap-1.5 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Vendor Profile
                </Button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-background border border-border/60 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-base font-semibold text-text-primary mb-2 flex items-center gap-2">
          <Play className="h-4 w-4 text-accent" />
          Run ARIA Pipeline?
        </h2>
        <p className="text-sm text-text-secondary mb-5">
          This will re-score all vendors and rebuild the investigation queue. The run may take
          several minutes. Existing review statuses will be preserved.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isRunning}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={isRunning} className="gap-1.5">
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Run Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
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
      initial="hidden"
      animate="show"
      className="space-y-5 max-w-7xl mx-auto"
    >
      {/* Page header */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Shield className="h-5 w-5 text-accent" aria-hidden="true" />
            <h1 className="text-xl font-semibold tracking-tight text-text-primary font-mono">
              Investigation Queue
            </h1>
          </div>
          <p className="text-sm text-text-muted font-mono">
            ARIA — Automated Risk Investigation Algorithm
            {latestRun?.completed_at && (
              <span className="ml-2 text-text-muted/60">
                · Last run: {new Date(latestRun.completed_at).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
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
      </motion.div>

      {/* Tier stat cards */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([1, 2, 3, 4] as const).map((tier) => (
          <TierStatCard
            key={tier}
            tier={tier}
            count={tierCounts[tier]}
            isActive={selectedTier === tier}
            onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
          />
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
                  className="text-xs bg-surface-alt border border-border/40 rounded px-2 py-1.5 focus:outline-none focus:border-accent/60"
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
                <Search className="h-3.5 w-3.5 text-text-muted flex-shrink-0" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search vendor name…"
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

              {/* New vendor toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newVendorOnly}
                  onChange={(e) => {
                    setNewVendorOnly(e.target.checked)
                    setPage(1)
                  }}
                  className="rounded"
                />
                <span className="text-xs text-text-secondary">
                  New vendors only
                  {newVendorCount > 0 && (
                    <span className="ml-1 text-purple-400">({newVendorCount})</span>
                  )}
                </span>
              </label>

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
        <Card className="border-border/40">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Investigation Leads
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {/* Column header */}
            {hasData && (
              <div className="flex items-center gap-3 px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-text-muted/60 border-b border-border/20 mb-1.5">
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
                <p className="text-sm text-text-secondary mb-3">Failed to load investigation queue</p>
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
              <div>
                {data!.data.map((item) => (
                  <QueueRow
                    key={item.vendor_id}
                    item={item}
                    onStatusUpdate={handleStatusUpdate}
                    updatingId={updatingId}
                  />
                ))}
              </div>
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

      {/* Run confirmation modal */}
      <RunConfirmModal
        open={confirmOpen}
        onConfirm={() => runMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
        isRunning={runMutation.isPending}
      />
    </motion.div>
  )
}
