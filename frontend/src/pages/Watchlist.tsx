/**
 * Watchlist Page
 * Change-tracking investigation workflow tool.
 * Table view with risk-delta column, inline status transitions, and investigate nav.
 */

import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { watchlistApi, type WatchlistItem, type WatchlistItemUpdate } from '@/api/client'
import {
  Eye,
  EyeOff,
  Trash2,
  Users,
  Building2,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Loader2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

// ============================================================================
// Helper utilities
// ============================================================================

function formatRiskPct(score: number | null | undefined): string {
  if (score === null || score === undefined) return '—'
  return `${(score * 100).toFixed(1)}%`
}

function getRiskColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-text-muted'
  if (score >= 0.5) return 'text-risk-critical'
  if (score >= 0.3) return 'text-risk-high'
  if (score >= 0.1) return 'text-risk-medium'
  return 'text-risk-low'
}

// ============================================================================
// Sub-components
// ============================================================================

interface RiskDeltaProps {
  scoreAtCreation: number | null | undefined
  currentScore: number | null | undefined
}

function RiskDelta({ scoreAtCreation, currentScore }: RiskDeltaProps) {
  if (scoreAtCreation === null || scoreAtCreation === undefined ||
      currentScore === null || currentScore === undefined) {
    return <span className="text-text-muted text-sm">—</span>
  }
  const delta = currentScore - scoreAtCreation
  if (Math.abs(delta) < 0.005) {
    return (
      <span className="flex items-center gap-1 text-text-muted text-sm">
        <Minus className="h-3 w-3" />
        0.0%
      </span>
    )
  }
  if (delta > 0) {
    return (
      <span className="flex items-center gap-1 text-risk-critical text-sm font-medium">
        <TrendingUp className="h-3 w-3" />
        +{(delta * 100).toFixed(1)}%
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-risk-low text-sm font-medium">
      <TrendingDown className="h-3 w-3" />
      {(delta * 100).toFixed(1)}%
    </span>
  )
}

function TypeBadge({ type }: { type: WatchlistItem['item_type'] }) {
  const config = {
    vendor: { label: 'Vendor', Icon: Users, cls: 'bg-accent/10 text-accent border-accent/20' },
    institution: { label: 'Institution', Icon: Building2, cls: 'bg-sector-gobernacion/10 text-sector-gobernacion border-sector-gobernacion/20' },
    contract: { label: 'Contract', Icon: FileText, cls: 'bg-text-muted/10 text-text-muted border-text-muted/20' },
  }
  const { label, Icon, cls } = config[type]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: WatchlistItem['priority'] }) {
  const styles = {
    high: 'bg-risk-critical/15 text-risk-critical border-risk-critical/30',
    medium: 'bg-risk-medium/15 text-risk-medium border-risk-medium/30',
    low: 'bg-risk-low/15 text-risk-low border-risk-low/30',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs capitalize ${styles[priority]}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }: { status: WatchlistItem['status'] }) {
  const styles = {
    watching: 'bg-accent/10 text-accent border-accent/20',
    investigating: 'bg-risk-high/10 text-risk-high border-risk-high/20',
    resolved: 'bg-risk-low/10 text-risk-low border-risk-low/20',
  }
  const icons = {
    watching: Eye,
    investigating: AlertTriangle,
    resolved: CheckCircle,
  }
  const Icon = icons[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs capitalize ${styles[status]}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

// ============================================================================
// Filter chip component
// ============================================================================

interface FilterChipProps<T extends string> {
  value: T
  active: boolean
  onClick: () => void
  label: string
}

function FilterChip<T extends string>({ active, onClick, label }: FilterChipProps<T>) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-accent text-white border-accent'
          : 'bg-background border-border text-text-muted hover:border-accent hover:text-accent'
      }`}
    >
      {label}
    </button>
  )
}

// ============================================================================
// Stat card
// ============================================================================

interface StatCardProps {
  label: string
  value: number
  color?: string
  icon: React.ElementType
  onClick?: () => void
  loading: boolean
}

function StatCard({ label, value, color, icon: Icon, onClick, loading }: StatCardProps) {
  return (
    <Card
      className={`${onClick ? 'cursor-pointer hover:border-accent transition-colors' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-12 mt-1" />
            ) : (
              <p className={`text-2xl font-bold ${color ?? ''}`}>{value}</p>
            )}
          </div>
          <Icon className={`h-8 w-8 opacity-40 ${color ?? 'text-text-muted'}`} />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Confirm remove button (inline two-step pattern)
// ============================================================================

function RemoveButton({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={() => { setConfirming(false); onConfirm() }}
          className="text-xs text-risk-critical hover:underline"
          disabled={disabled}
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-text-muted hover:underline"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled}
      title="Remove from watchlist"
      className="p-1 rounded hover:bg-risk-critical/10 text-text-muted hover:text-risk-critical transition-colors disabled:opacity-40"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

// ============================================================================
// Main component
// ============================================================================

type StatusFilter = 'all' | 'watching' | 'investigating' | 'resolved'
type TypeFilter = 'all' | 'vendor' | 'institution' | 'contract'
type PriorityFilter = 'all' | 'high' | 'medium' | 'low'

export function Watchlist() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')

  // Stats query (separate so header cards always show totals)
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['watchlist-stats'],
    queryFn: () => watchlistApi.getStats(),
  })

  // Items query (filtered)
  const { data: watchlistData, isLoading: itemsLoading, error, refetch } = useQuery({
    queryKey: [
      'watchlist',
      statusFilter === 'all' ? undefined : statusFilter,
      typeFilter === 'all' ? undefined : typeFilter,
      priorityFilter === 'all' ? undefined : priorityFilter,
    ],
    queryFn: () => watchlistApi.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter,
      item_type: typeFilter === 'all' ? undefined : typeFilter,
      priority: priorityFilter === 'all' ? undefined : priorityFilter,
    }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, update }: { id: number; update: WatchlistItemUpdate }) =>
      watchlistApi.update(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist-stats'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => watchlistApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist-stats'] })
    },
  })

  const isLoading = itemsLoading
  const isMutating = updateMutation.isPending || deleteMutation.isPending

  const items = watchlistData?.data ?? []

  const stats = useMemo(() => ({
    watching: statsData?.watching ?? 0,
    investigating: statsData?.investigating ?? 0,
    resolved: statsData?.resolved ?? 0,
    highPriority: statsData?.high_priority ?? 0,
  }), [statsData])

  const handleEntityNav = useCallback((item: WatchlistItem) => {
    switch (item.item_type) {
      case 'vendor': navigate(`/vendors/${item.item_id}`); break
      case 'institution': navigate(`/institutions/${item.item_id}`); break
      case 'contract': navigate(`/contracts?id=${item.item_id}`); break
    }
  }, [navigate])

  const handleInvestigate = useCallback((item: WatchlistItem) => {
    const params = item.item_type === 'vendor'
      ? `?vendor=${encodeURIComponent(item.item_name)}`
      : item.item_type === 'institution'
        ? `?institution=${encodeURIComponent(item.item_name)}`
        : ''
    navigate(`/investigation${params}`)
  }, [navigate])

  const handleStatusTransition = useCallback((id: number, newStatus: WatchlistItem['status']) => {
    updateMutation.mutate({ id, update: { status: newStatus } })
  }, [updateMutation])

  const handleRemove = useCallback((id: number) => {
    deleteMutation.mutate(id)
  }, [deleteMutation])

  // ---- error state ----
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Eye className="h-4.5 w-4.5 text-accent" />
            Watchlist
          </h2>
          <p className="text-xs text-text-muted mt-0.5">Track and investigate suspicious patterns</p>
        </div>
        <Card className="border-risk-critical/30 bg-risk-critical/5">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-risk-critical opacity-50" />
            <p className="text-text-muted mb-4">Failed to load watchlist data</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Eye className="h-4.5 w-4.5 text-accent" />
            Watchlist
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Track entities and monitor risk score changes over time
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stat cards — 4 cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          label="Watching"
          value={stats.watching}
          color="text-accent"
          icon={Eye}
          onClick={() => setStatusFilter('watching')}
          loading={statsLoading}
        />
        <StatCard
          label="Investigating"
          value={stats.investigating}
          color="text-risk-high"
          icon={AlertTriangle}
          onClick={() => setStatusFilter('investigating')}
          loading={statsLoading}
        />
        <StatCard
          label="High Priority"
          value={stats.highPriority}
          color="text-risk-critical"
          icon={AlertTriangle}
          loading={statsLoading}
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          color="text-risk-low"
          icon={CheckCircle}
          onClick={() => setStatusFilter('resolved')}
          loading={statsLoading}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        {/* Status chips */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-text-muted" />
          {(['all', 'watching', 'investigating', 'resolved'] as StatusFilter[]).map((s) => (
            <FilterChip
              key={s}
              value={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            />
          ))}
        </div>
        {/* Type chips */}
        <div className="flex items-center gap-1.5">
          {(['all', 'vendor', 'institution', 'contract'] as TypeFilter[]).map((t) => (
            <FilterChip
              key={t}
              value={t}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t)}
              label={t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
            />
          ))}
        </div>
        {/* Priority chips */}
        <div className="flex items-center gap-1.5">
          {(['all', 'high', 'medium', 'low'] as PriorityFilter[]).map((p) => (
            <FilterChip
              key={p}
              value={p}
              active={priorityFilter === p}
              onClick={() => setPriorityFilter(p)}
              label={p === 'all' ? 'All Priority' : p.charAt(0).toUpperCase() + p.slice(1)}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Tracked Entities
            </span>
            <Badge variant="secondary">{items.length} item{items.length !== 1 ? 's' : ''}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Loading skeleton */}
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5/12" />
                  <Skeleton className="h-5 w-1/12" />
                  <Skeleton className="h-5 w-1/12" />
                  <Skeleton className="h-5 w-1/12" />
                  <Skeleton className="h-5 w-1/12" />
                  <Skeleton className="h-5 w-1/12" />
                  <Skeleton className="h-5 w-2/12" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            /* Empty state */
            <div className="p-12 text-center text-text-muted">
              <EyeOff className="h-12 w-12 mx-auto mb-4 opacity-25" />
              <p className="text-sm font-medium mb-1">Your watchlist is empty</p>
              <p className="text-xs max-w-sm mx-auto">
                Use the + button on any vendor or institution profile to track entities of interest and monitor risk score changes over time.
              </p>
            </div>
          ) : (
            /* Table */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-text-muted">
                    <th className="text-left px-4 py-3 font-medium">Entity</th>
                    <th className="text-left px-3 py-3 font-medium">Type</th>
                    <th className="text-left px-3 py-3 font-medium">Priority</th>
                    <th className="text-left px-3 py-3 font-medium">Status</th>
                    <th className="text-right px-3 py-3 font-medium">Risk at Add</th>
                    <th className="text-right px-3 py-3 font-medium">Current Risk</th>
                    <th className="text-right px-3 py-3 font-medium">Change</th>
                    <th className="text-left px-3 py-3 font-medium">Added</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <WatchlistRow
                      key={item.id}
                      item={item}
                      isMutating={isMutating}
                      onEntityNav={handleEntityNav}
                      onInvestigate={handleInvestigate}
                      onStatusTransition={handleStatusTransition}
                      onRemove={handleRemove}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Table row
// ============================================================================

interface WatchlistRowProps {
  item: WatchlistItem
  isMutating: boolean
  onEntityNav: (item: WatchlistItem) => void
  onInvestigate: (item: WatchlistItem) => void
  onStatusTransition: (id: number, status: WatchlistItem['status']) => void
  onRemove: (id: number) => void
}

function WatchlistRow({
  item,
  isMutating,
  onEntityNav,
  onInvestigate,
  onStatusTransition,
  onRemove,
}: WatchlistRowProps) {
  return (
    <tr className="hover:bg-background-elevated/40 transition-colors">
      {/* Entity */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onEntityNav(item)}
            className="text-left font-medium hover:text-accent transition-colors truncate max-w-[200px]"
            title={item.item_name}
          >
            {item.item_name}
          </button>
          {item.reason && (
            <span className="text-xs text-text-muted truncate max-w-[200px]" title={item.reason}>
              {item.reason}
            </span>
          )}
        </div>
      </td>

      {/* Type */}
      <td className="px-3 py-3 whitespace-nowrap">
        <TypeBadge type={item.item_type} />
      </td>

      {/* Priority */}
      <td className="px-3 py-3 whitespace-nowrap">
        <PriorityBadge priority={item.priority} />
      </td>

      {/* Status + inline transition */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <StatusBadge status={item.status} />
          {item.status === 'watching' && (
            <button
              onClick={() => onStatusTransition(item.id, 'investigating')}
              disabled={isMutating}
              className="text-xs text-text-muted hover:text-risk-high flex items-center gap-0.5 transition-colors disabled:opacity-40"
            >
              {isMutating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              Start investigating
            </button>
          )}
          {item.status === 'investigating' && (
            <button
              onClick={() => onStatusTransition(item.id, 'resolved')}
              disabled={isMutating}
              className="text-xs text-text-muted hover:text-risk-low flex items-center gap-0.5 transition-colors disabled:opacity-40"
            >
              {isMutating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              Mark resolved
            </button>
          )}
        </div>
      </td>

      {/* Risk at add */}
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <span className={`text-sm tabular-nums ${getRiskColor(item.risk_score_at_creation)}`}>
          {formatRiskPct(item.risk_score_at_creation)}
        </span>
      </td>

      {/* Current risk */}
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <span className={`text-sm tabular-nums font-medium ${getRiskColor(item.risk_score)}`}>
          {formatRiskPct(item.risk_score)}
        </span>
      </td>

      {/* Change delta */}
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <RiskDelta scoreAtCreation={item.risk_score_at_creation} currentScore={item.risk_score} />
      </td>

      {/* Added date */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <Clock className="h-3 w-3" />
          {formatDate(item.created_at)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {/* Investigate button — only for vendor/institution */}
          {item.item_type !== 'contract' && (
            <button
              onClick={() => onInvestigate(item)}
              title="Open in Investigation Queue"
              className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-border hover:border-accent hover:text-accent transition-colors text-text-muted"
            >
              <Search className="h-3 w-3" />
              Investigate
            </button>
          )}
          {/* Remove */}
          <RemoveButton onConfirm={() => onRemove(item.id)} disabled={isMutating} />
        </div>
      </td>
    </tr>
  )
}

export default Watchlist
