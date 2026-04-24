/**
 * Watchlist Page
 * Change-tracking investigation workflow tool.
 * Table view with risk-delta column, inline status transitions, and investigate nav.
 */

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, slideUp } from '@/lib/animations'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEntityDrawer } from '@/contexts/EntityDrawerContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FolderSidebar } from '@/components/FolderSidebar'
import { DossierCard } from '@/components/DossierCard'
import { DossierCreateDialog } from '@/components/DossierCreateDialog'
import WorkspaceJournalistGuide from '@/components/WorkspaceJournalistGuide'
import { watchlistApi, vendorApi, dossierApi, type WatchlistItem, type WatchlistItemUpdate, type DossierItem } from '@/api/client'
import { DossierAddItemDialog } from '@/components/DossierAddItemDialog'
import {
  Eye,
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
  ChevronDown,
  ChevronUp,
  Download,
  FolderOpen,
  Folder,
  Plus,
  Crosshair,
  ClipboardList,
} from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'

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
  const { t } = useTranslation('watchlist')
  const config = {
    vendor: { label: t('types.vendor'), Icon: Users, cls: 'bg-accent/10 text-accent border-accent/20' },
    institution: { label: t('types.institution'), Icon: Building2, cls: 'bg-sector-gobernacion/10 text-sector-gobernacion border-sector-gobernacion/20' },
    contract: { label: t('types.contract'), Icon: FileText, cls: 'bg-text-muted/10 text-text-muted border-text-muted/20' },
  }
  const { label, Icon, cls } = config[type]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-xs ${cls}`}>
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm border text-xs capitalize ${styles[priority]}`}>
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-xs capitalize ${styles[status]}`}>
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
      className={`px-3 py-1 rounded-sm text-xs font-medium border transition-colors ${
        active
          ? 'bg-accent text-text-primary border-accent'
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
  const { t } = useTranslation('watchlist')

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={() => { setConfirming(false); onConfirm() }}
          className="text-xs text-risk-critical hover:underline"
          disabled={disabled}
        >
          {t('confirm')}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-text-muted hover:underline"
        >
          {t('cancel')}
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled}
      title="Remove from watchlist"
      className="p-1 rounded-sm hover:bg-risk-critical/10 text-text-muted hover:text-risk-critical transition-colors disabled:opacity-40"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

// ============================================================================
// Dossier empty state
// ============================================================================

export function DossierEmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  const { t } = useTranslation('watchlist')
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="rounded-sm bg-accent/10 p-4 mb-5">
        <Folder className="h-10 w-10 text-accent opacity-70" />
      </div>
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-text-muted mb-3">
        {t('dossierEmpty.kicker')}
      </p>
      <h3
        className="font-bold text-text-primary leading-[1.1] mb-3"
        style={{
          fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
          fontSize: 'clamp(1.5rem, 2.4vw, 2rem)',
          letterSpacing: '-0.02em',
        }}
      >
        {t('dossierEmpty.title')}
      </h3>
      <p className="text-sm text-text-secondary max-w-md leading-relaxed mb-4">
        {t('dossierEmpty.lede')}
      </p>
      <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-text-muted/70 mb-6">
        {t('dossierEmpty.steps')}
      </p>
      <Button size="sm" onClick={onCreateClick} className="rounded-sm">
        <Plus className="h-4 w-4 mr-1.5" />
        {t('dossierEmpty.cta')}
      </Button>
    </div>
  )
}

// ============================================================================
// Dossier loading skeletons
// ============================================================================

function DossierSkeletons() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-sm border border-border p-4 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Active dossier stats bar
// ============================================================================

interface DossierStatsBarProps {
  dossierId: number
  dossierName: string
}

function DossierStatsBar({ dossierId, dossierName }: DossierStatsBarProps) {
  const { data: items, isLoading } = useQuery<DossierItem[]>({
    queryKey: ['dossier-items', dossierId],
    queryFn: () => dossierApi.listItems(dossierId),
    staleTime: 60 * 1000,
  })

  const totalItems = items?.length ?? 0

  // Find highest-risk item by annotation that contains a risk score, or just show total
  // DossierItem doesn't carry a risk_score field — we surface name only
  const vendorItems = items?.filter((i) => i.item_type === 'vendor') ?? []
  const firstVendor = vendorItems[0]

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 rounded-sm border border-border/60 bg-background-elevated/40 text-xs">
      {isLoading ? (
        <>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </>
      ) : (
        <>
          <span className="text-text-muted">
            <span className="font-semibold text-text-primary">{totalItems}</span> item{totalItems !== 1 ? 's' : ''} in dossier
          </span>
          {firstVendor && (
            <>
              <span className="text-border/60">·</span>
              <span className="text-text-muted">
                Focus vendor: <span className="font-medium text-text-secondary truncate max-w-[180px] inline-block align-bottom">{firstVendor.item_name}</span>
              </span>
            </>
          )}
          <span className="text-border/60">·</span>
          <a
            href={`/api/v1/workspace/dossiers/${dossierId}/export`}
            download={`${dossierName.replace(/\s+/g, '-')}-report.json`}
            className="flex items-center gap-1 text-accent hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-3 w-3" />
            Download Dossier Report
          </a>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Main component
// ============================================================================

type StatusFilter = 'all' | 'watching' | 'investigating' | 'resolved'
type TypeFilter = 'all' | 'vendor' | 'institution' | 'contract'
type PriorityFilter = 'all' | 'high' | 'medium' | 'low'
type SortField = 'added' | 'risk' | 'risk_delta' | 'name'
type SortDir = 'asc' | 'desc'

export function Watchlist() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { open: openEntityDrawer } = useEntityDrawer()
  const { t } = useTranslation('watchlist')

  const [activeTab, setActiveTab] = useState<'entities' | 'dossiers'>('entities')
  const [dossierDialogOpen, setDossierDialogOpen] = useState(false)
  const [activeDossierId, setActiveDossierId] = useState<number | null>(null)
  // #92 — dossier status filter
  type DossierStatusFilter = 'all' | 'active' | 'archived' | 'closed'
  const [dossierStatusFilter, setDossierStatusFilter] = useState<DossierStatusFilter>('all')
  // #91 — add item to dossier dialog
  const [addItemDossierId, setAddItemDossierId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null)
  const [sortField, setSortField] = useState<SortField>('risk')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Folder queries
  const { data: foldersData } = useQuery({
    queryKey: ['watchlist-folders'],
    queryFn: () => watchlistApi.getFolders(),
    staleTime: 5 * 60 * 1000,
  })
  const folders = foldersData ?? []

  const createFolderMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      watchlistApi.createFolder(name, color),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist-folders'] }),
    onError: () => { /* handled by toast */ },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: number) => watchlistApi.deleteFolder(folderId),
    onSuccess: () => {
      setActiveFolderId(null)
      queryClient.invalidateQueries({ queryKey: ['watchlist-folders'] })
    },
    onError: () => { /* handled by toast */ },
  })

  // Stats query (separate so header cards always show totals)
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['watchlist-stats'],
    queryFn: () => watchlistApi.getStats(),
  })

  // Items query (filtered). `activeFolderId` MUST be in queryKey so
  // TanStack Query refetches when the folder sidebar selection changes.
  const { data: watchlistData, isLoading: itemsLoading, error, refetch } = useQuery({
    queryKey: [
      'watchlist',
      statusFilter === 'all' ? undefined : statusFilter,
      typeFilter === 'all' ? undefined : typeFilter,
      priorityFilter === 'all' ? undefined : priorityFilter,
      activeFolderId,
    ],
    queryFn: () => watchlistApi.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter,
      item_type: typeFilter === 'all' ? undefined : typeFilter,
      priority: priorityFilter === 'all' ? undefined : priorityFilter,
      folder_id: activeFolderId ?? undefined,
    }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, update }: { id: number; update: WatchlistItemUpdate }) =>
      watchlistApi.update(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist-stats'] })
    },
    onError: () => { /* handled by toast */ },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => watchlistApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist-stats'] })
    },
    onError: () => { /* handled by toast */ },
  })

  // Dossier queries and mutations — #92 status filter wired here
  const { data: dossiers, isLoading: dossiersLoading } = useQuery({
    queryKey: ['dossiers', dossierStatusFilter],
    queryFn: () => dossierApi.list(dossierStatusFilter === 'all' ? undefined : dossierStatusFilter),
    enabled: activeTab === 'dossiers',
    staleTime: 60 * 1000,
  })

  const createDossier = useMutation({
    mutationFn: (data: { name: string; description: string; color: string }) =>
      dossierApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dossiers'] }),
    onError: () => { /* handled by toast */ },
  })

  const deleteDossier = useMutation({
    mutationFn: (id: number) => dossierApi.remove(id),
    onSuccess: (_, id) => {
      if (activeDossierId === id) setActiveDossierId(null)
      queryClient.invalidateQueries({ queryKey: ['dossiers'] })
    },
    onError: () => { /* handled by toast */ },
  })

  const isLoading = itemsLoading
  const isMutating = updateMutation.isPending || deleteMutation.isPending

  const rawItems = watchlistData?.data ?? []

  const items = useMemo(() => {
    return [...rawItems].sort((a, b) => {
      let aVal: number
      let bVal: number
      switch (sortField) {
        case 'risk':
          aVal = a.risk_score ?? -1
          bVal = b.risk_score ?? -1
          break
        case 'risk_delta': {
          const da = (a.risk_score ?? 0) - (a.risk_score_at_creation ?? 0)
          const db = (b.risk_score ?? 0) - (b.risk_score_at_creation ?? 0)
          aVal = da
          bVal = db
          break
        }
        case 'name':
          return sortDir === 'asc'
            ? a.item_name.localeCompare(b.item_name)
            : b.item_name.localeCompare(a.item_name)
        case 'added':
        default:
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
  }, [rawItems, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

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

  // Dossier for the active stats bar
  const activeDossier = useMemo(
    () => (dossiers ?? []).find((d) => d.id === activeDossierId),
    [dossiers, activeDossierId]
  )

  // ---- error state ----
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-sm bg-risk-critical/10 border border-risk-critical/20">
            <AlertTriangle className="h-4 w-4 text-risk-critical" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">{t('errorTitle')}</h2>
            <p className="text-xs text-text-muted mt-0.5">{t('errorDescription')}</p>
          </div>
        </div>
        <Card className="border-risk-critical/30 bg-risk-critical/5">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-risk-critical opacity-50" />
            <p className="text-text-muted mb-4">{t('errorMessage')}</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <EditorialPageShell
      kicker="WORKSPACE · INVESTIGATION DOSSIERS"
      headline="Your active investigation files."
      paragraph="Saved vendors, contracts, and case leads. Build dossiers by adding items from any page in the platform. Share dossiers with colleagues or export for reporting."
      stats={[
        { value: formatNumber(items.length), label: 'Items saved' },
        { value: formatNumber(dossiers?.length ?? 0), label: 'Dossiers' },
      ]}
      loading={statsLoading}
    >
    <Act number="I" label="YOUR DOSSIERS">
    <div className="flex flex-col md:flex-row gap-4">
      {/* Folder sidebar */}
      <div className="w-full md:w-[200px] md:shrink-0 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">{t('folders')}</p>
        <FolderSidebar
          folders={folders}
          activeFolderId={activeFolderId ?? undefined}
          onSelect={(id) => setActiveFolderId(id)}
          onCreateFolder={(name, color) => createFolderMutation.mutate({ name, color })}
          onDeleteFolder={(id) => deleteFolderMutation.mutate(id)}
        />
        {activeFolderId && (
          <a
            href={`/api/v1/watchlist/folders/export/${activeFolderId}`}
            download={`folder-${activeFolderId}-dossier.json`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs text-accent hover:bg-accent/10 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            {t('exportDossier')}
          </a>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* Editorial masthead */}
        <header
          className="border-b pb-8"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-semibold mb-5"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span>RUBLI</span>
            <span aria-hidden>·</span>
            <span>{t('subtitleFull')}</span>
            <span aria-hidden>·</span>
            <span className="font-mono tabular-nums">v0.6.5</span>
          </div>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="text-kicker text-kicker--investigation mb-3">
                {t('title')}
              </div>
              <h1
                className="font-bold text-text-primary leading-[1.05] mb-4"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                  letterSpacing: '-0.025em',
                }}
              >
                {t('title')}
              </h1>
              <p
                className="italic text-text-secondary leading-[1.55] max-w-2xl"
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)',
                }}
              >
                {t('subtitleFull')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="flex-shrink-0">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
          </div>
        </header>

        {/* Stat cards — 4 cards with stagger animation */}
        <motion.div
          className="grid gap-4 grid-cols-2 md:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={slideUp}>
            <StatCard
              label={t('statCards.watching')}
              value={stats.watching}
              color="text-accent"
              icon={Eye}
              onClick={() => setStatusFilter('watching')}
              loading={statsLoading}
            />
          </motion.div>
          <motion.div variants={slideUp}>
            <StatCard
              label={t('statCards.investigating')}
              value={stats.investigating}
              color="text-risk-high"
              icon={AlertTriangle}
              onClick={() => setStatusFilter('investigating')}
              loading={statsLoading}
            />
          </motion.div>
          <motion.div variants={slideUp}>
            <StatCard
              label={t('statCards.highPriority')}
              value={stats.highPriority}
              color="text-risk-critical"
              icon={AlertTriangle}
              loading={statsLoading}
            />
          </motion.div>
          <motion.div variants={slideUp}>
            <StatCard
              label={t('statCards.resolved')}
              value={stats.resolved}
              color="text-risk-low"
              icon={CheckCircle}
              onClick={() => setStatusFilter('resolved')}
              loading={statsLoading}
            />
          </motion.div>
        </motion.div>

        {/* Tabs: Tracked Entities | Dossiers */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'entities' | 'dossiers')}>
          <TabsList className="mb-4">
            <TabsTrigger value="entities" className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              {t('tabs.entities')}
            </TabsTrigger>
            <TabsTrigger value="dossiers" className="flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              {t('tabs.dossiers')}
              {(dossiers?.length ?? 0) > 0 && (
                <span className="ml-1 text-[10px] bg-accent/15 text-accent rounded-sm px-1.5 py-px font-medium font-mono tabular-nums">
                  {dossiers?.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ---- ENTITIES TAB ---- */}
          <TabsContent value="entities" className="space-y-4">
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
                    label={s === 'all' ? t('status.all') : t(`status.${s}`)}
                  />
                ))}
              </div>
              {/* Type chips */}
              <div className="flex items-center gap-1.5">
                {(['all', 'vendor', 'institution', 'contract'] as TypeFilter[]).map((tp) => (
                  <FilterChip
                    key={tp}
                    value={tp}
                    active={typeFilter === tp}
                    onClick={() => setTypeFilter(tp)}
                    label={tp === 'all' ? t('filters.allTypes') : t(`types.${tp}s`)}
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
                    label={p === 'all' ? t('priority.all') : t(`priority.${p}`)}
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
                    {t('table.trackedEntities')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted font-mono uppercase tracking-[0.12em]">{t('sort.label')}</span>
                    {([
                      { field: 'risk' as SortField, labelKey: 'sort.risk' },
                      { field: 'risk_delta' as SortField, labelKey: 'sort.change' },
                      { field: 'added' as SortField, labelKey: 'sort.added' },
                      { field: 'name' as SortField, labelKey: 'sort.name' },
                    ]).map(({ field, labelKey }) => (
                      <button
                        key={field}
                        onClick={() => toggleSort(field)}
                        className={`text-[10px] px-2 py-0.5 rounded-sm border transition-colors ${
                          sortField === field
                            ? 'bg-accent/10 text-accent border-accent/30 font-medium'
                            : 'text-text-muted border-border/40 hover:text-accent hover:border-accent/30'
                        }`}
                      >
                        {t(labelKey)}
                        {sortField === field && (sortDir === 'desc' ? ' ↓' : ' ↑')}
                      </button>
                    ))}
                    <Badge variant="secondary" className="rounded-sm font-mono tabular-nums">
                      {items.length} {items.length !== 1 ? t('table.items') : t('table.item')}
                    </Badge>
                  </div>
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
                  (() => {
                    const hasFilters =
                      statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all'
                    if (hasFilters) {
                      return (
                        <div className="p-12 text-center text-text-muted">
                          <Filter className="h-12 w-12 mx-auto mb-4 opacity-25" />
                          <p className="text-sm font-medium mb-1">{t('noItemsMatch')}</p>
                          <p className="text-xs max-w-sm mx-auto mb-4">
                            {t('noItemsMatchDescription')}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStatusFilter('all')
                              setTypeFilter('all')
                              setPriorityFilter('all')
                            }}
                          >
                            {t('clearFilters')}
                          </Button>
                        </div>
                      )
                    }
                    return (
                      <div className="p-10">
                        {/* Editorial lede */}
                        <div className="text-center mb-10 max-w-2xl mx-auto">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-accent mb-4">
                            {t('dossierEmpty.kicker')}
                          </p>
                          <h2
                            className="font-bold text-text-primary leading-[1.1] mb-4"
                            style={{
                              fontFamily: 'var(--font-family-serif, "Playfair Display", serif)',
                              fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
                              letterSpacing: '-0.025em',
                            }}
                          >
                            {t('workspaceEmpty.title')}
                          </h2>
                          <p className="text-sm text-text-secondary leading-relaxed max-w-xl mx-auto">
                            {t('workspaceEmpty.description')}
                          </p>
                        </div>

                        {/* 3-column get-started guide */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
                          <div className="rounded-sm border border-border/50 p-5 text-left hover:border-accent/40 transition-colors">
                            <Crosshair className="h-5 w-5 text-accent/80 mb-3" />
                            <p className="text-sm font-semibold text-text-primary mb-1.5">
                              {t('workspaceEmpty.watchVendorTitle')}
                            </p>
                            <p className="text-xs text-text-muted leading-snug mb-4 min-h-[2.5rem]">
                              {t('workspaceEmpty.watchVendorDesc')}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs rounded-sm font-mono uppercase tracking-wider"
                              onClick={() => navigate('/aria?tier=1')}
                            >
                              <Crosshair className="h-3 w-3 mr-1.5" />
                              {t('workspaceEmpty.watchVendorCta')}
                            </Button>
                          </div>
                          <div className="rounded-sm border border-border/50 p-5 text-left hover:border-accent/40 transition-colors">
                            <ClipboardList className="h-5 w-5 text-accent/80 mb-3" />
                            <p className="text-sm font-semibold text-text-primary mb-1.5">
                              {t('workspaceEmpty.exploreTitle')}
                            </p>
                            <p className="text-xs text-text-muted leading-snug mb-4 min-h-[2.5rem]">
                              {t('workspaceEmpty.exploreDesc')}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs rounded-sm font-mono uppercase tracking-wider"
                              onClick={() => navigate('/explore?tab=vendors')}
                            >
                              <Search className="h-3 w-3 mr-1.5" />
                              {t('workspaceEmpty.exploreCta')}
                            </Button>
                          </div>
                          <div className="rounded-sm border border-border/50 p-5 text-left hover:border-accent/40 transition-colors">
                            <FolderOpen className="h-5 w-5 text-accent/80 mb-3" />
                            <p className="text-sm font-semibold text-text-primary mb-1.5">
                              {t('workspaceEmpty.caseTitle')}
                            </p>
                            <p className="text-xs text-text-muted leading-snug mb-4 min-h-[2.5rem]">
                              {t('workspaceEmpty.caseDesc')}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs rounded-sm font-mono uppercase tracking-wider"
                              onClick={() => navigate('/cases')}
                            >
                              <FileText className="h-3 w-3 mr-1.5" />
                              {t('workspaceEmpty.caseCta')}
                            </Button>
                          </div>
                        </div>

                        {/* Tip note */}
                        <div className="max-w-3xl mx-auto border-t border-border/40 pt-4">
                          <p className="text-[11px] text-text-muted/80 text-center leading-relaxed">
                            <Eye className="h-3 w-3 inline mr-1 mb-0.5" />
                            <span className="font-mono uppercase tracking-[0.12em] text-text-muted mr-1">Tip ·</span>
                            {t('tip')}
                          </p>
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  /* Table + tip footer */
                  <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Watchlist vendors">
                      <thead>
                        <tr className="border-b border-border text-xs text-text-muted">
                          <th className="text-left px-4 py-3 font-medium">{t('columns.entity')}</th>
                          <th className="text-left px-3 py-3 font-medium">{t('columns.type')}</th>
                          <th className="text-left px-3 py-3 font-medium">{t('columns.priority')}</th>
                          <th className="text-left px-3 py-3 font-medium">{t('columns.status')}</th>
                          <th className="text-right px-3 py-3 font-medium">{t('columns.riskAtAdd')}</th>
                          <th className="text-right px-3 py-3 font-medium">{t('columns.currentRisk')}</th>
                          <th className="text-right px-3 py-3 font-medium">{t('columns.change')}</th>
                          <th className="text-left px-3 py-3 font-medium">{t('columns.added')}</th>
                          <th className="text-right px-4 py-3 font-medium">{t('columns.actions')}</th>
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
                            onOpenDrawer={(id, type) => openEntityDrawer(id, type)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-border/40 px-4 py-2.5">
                    <p className="text-[10px] text-text-muted/80 leading-relaxed">
                      <span className="font-mono uppercase tracking-[0.12em] text-text-muted mr-1">Tip ·</span>
                      {t('tip')}
                    </p>
                  </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- DOSSIERS TAB ---- */}
          <TabsContent value="dossiers" className="space-y-4">
            {/* Dossier tab header row */}
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
                {t('dossierTabHeader.lede')}
              </p>
              <Button size="sm" className="rounded-sm shrink-0" onClick={() => setDossierDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                {t('dossierTabHeader.new')}
              </Button>
            </div>

            {/* #92 — Dossier status filter tabs */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-text-muted shrink-0" />
              {([
                { value: 'all', labelKey: 'dossierStatus.all' },
                { value: 'active', labelKey: 'dossierStatus.active' },
                { value: 'archived', labelKey: 'dossierStatus.archived' },
                { value: 'closed', labelKey: 'dossierStatus.closed' },
              ] as const).map(({ value, labelKey }) => (
                <button
                  key={value}
                  onClick={() => setDossierStatusFilter(value)}
                  className={`px-3 py-1 rounded-sm text-xs font-medium border transition-colors ${
                    dossierStatusFilter === value
                      ? 'bg-accent text-text-primary border-accent'
                      : 'bg-background border-border text-text-muted hover:border-accent hover:text-accent'
                  }`}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>

            {/* Active dossier stats bar + #91 quick-add vendor */}
            {activeDossierId !== null && activeDossier && (
              <div className="space-y-2">
                <DossierStatsBar dossierId={activeDossierId} dossierName={activeDossier.name} />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 rounded-sm"
                    onClick={() => setAddItemDossierId(activeDossierId)}
                  >
                    <Users className="h-3.5 w-3.5 mr-1.5" />
                    {t('dossierTab.searchVendors')}
                  </Button>
                </div>
              </div>
            )}

            {/* Dossier list */}
            {dossiersLoading ? (
              <DossierSkeletons />
            ) : (dossiers ?? []).length === 0 ? (
              <WorkspaceJournalistGuide onCreateDossier={() => setDossierDialogOpen(true)} />
            ) : (
              <motion.div
                className="grid gap-3 sm:grid-cols-2"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {(dossiers ?? []).map((dossier) => (
                  <motion.div key={dossier.id} variants={staggerItem}>
                    <DossierCard
                      dossier={dossier}
                      onOpen={(id) => setActiveDossierId((prev) => (prev === id ? null : id))}
                      onDelete={(id) => deleteDossier.mutate(id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create dossier dialog */}
      <DossierCreateDialog
        open={dossierDialogOpen}
        onOpenChange={setDossierDialogOpen}
        loading={createDossier.isPending}
        onSubmit={(data) => {
          createDossier.mutate(data, {
            onSuccess: () => setDossierDialogOpen(false),
          })
        }}
      />

      {/* #91 — Add item (vendor search) dialog */}
      {addItemDossierId !== null && (dossiers ?? []).find((d) => d.id === addItemDossierId) && (
        <DossierAddItemDialog
          open={addItemDossierId !== null}
          onOpenChange={(isOpen) => { if (!isOpen) setAddItemDossierId(null) }}
          dossierId={addItemDossierId}
          dossierName={(dossiers ?? []).find((d) => d.id === addItemDossierId)?.name ?? ''}
        />
      )}
    </div>
    </Act>
    </EditorialPageShell>
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
  onOpenDrawer: (id: number, type: 'vendor' | 'institution') => void
}

function WatchlistRow({
  item,
  isMutating,
  onEntityNav,
  onInvestigate,
  onStatusTransition,
  onRemove,
  onOpenDrawer,
}: WatchlistRowProps) {
  const [expanded, setExpanded] = useState(false)
  const { t } = useTranslation('watchlist')

  const { data: topFactors, isLoading: factorsLoading } = useQuery({
    queryKey: ['vendor', item.item_id, 'top-factors'],
    queryFn: () => vendorApi.getTopFactors(item.item_id, 5),
    enabled: expanded && item.item_type === 'vendor',
    staleTime: 10 * 60 * 1000,
  })

  function handleEntityClick() {
    if (item.item_type === 'vendor' || item.item_type === 'institution') {
      onOpenDrawer(item.item_id, item.item_type)
    } else {
      onEntityNav(item)
    }
  }

  return (
    <>
    <tr className="hover:bg-background-elevated/40 transition-colors">
      {/* Entity */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={handleEntityClick}
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
              {t('status.startInvestigating')}
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
              {t('status.markResolved')}
            </button>
          )}
        </div>
      </td>

      {/* Risk at add */}
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <span className={`text-sm font-mono tabular-nums ${getRiskColor(item.risk_score_at_creation)}`}>
          {formatRiskPct(item.risk_score_at_creation)}
        </span>
      </td>

      {/* Current risk */}
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <span className={`text-sm font-mono tabular-nums font-medium ${getRiskColor(item.risk_score)}`}>
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
          {/* Factor attribution expand — vendor only */}
          {item.item_type === 'vendor' && (
            <button
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Hide risk factors' : 'Show risk factors'}
              className="p-1 rounded-sm hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          {/* Investigate button — only for vendor/institution */}
          {item.item_type !== 'contract' && (
            <button
              onClick={() => onInvestigate(item)}
              title="Open in Investigation Queue"
              className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs border border-border hover:border-accent hover:text-accent transition-colors text-text-muted"
            >
              <Search className="h-3 w-3" />
              {t('investigate')}
            </button>
          )}
          {/* Remove */}
          <RemoveButton onConfirm={() => onRemove(item.id)} disabled={isMutating} />
        </div>
      </td>
    </tr>
    {/* Factor attribution expansion row */}
    {expanded && item.item_type === 'vendor' && (
      <tr className="bg-background-elevated/30 border-b border-border/30">
        <td colSpan={9} className="px-6 py-3">
          {factorsLoading ? (
            <p className="text-xs text-text-muted italic">{t('loadingRiskFactors')}</p>
          ) : !topFactors?.factors.length ? (
            <p className="text-xs text-text-muted">{t('noRiskFactorData')}</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono mb-2">
                {t('riskFactors')} · {topFactors.total_contracts} {t('contractsAnalysed')}
              </p>
              {topFactors.factors.map((f) => (
                <div key={f.factor} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-36 truncate capitalize font-mono">
                    {f.factor.replace(/_/g, ' ')}
                  </span>
                  {(() => {
                    const N = 24, DR = 2, DG = 5
                    const filled = Math.max(1, Math.round((Math.min(100, f.pct) / 100) * N))
                    return (
                      <svg viewBox={`0 0 ${N * DG} 6`} className="flex-1 max-w-[200px]" style={{ height: 6 }} preserveAspectRatio="none" aria-hidden="true">
                        {Array.from({ length: N }).map((_, k) => (
                          <circle key={k} cx={k * DG + DR} cy={3} r={DR}
                            fill={k < filled ? '#fb923c' : '#2d2926'}
                            stroke={k < filled ? undefined : '#3d3734'}
                            strokeWidth={k < filled ? 0 : 0.5}
                            fillOpacity={k < filled ? 0.7 : 1}
                          />
                        ))}
                      </svg>
                    )
                  })()}
                  <span className="text-xs tabular-nums text-text-muted font-mono">
                    {f.pct.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-text-muted">
                    ({f.count.toLocaleString()})
                  </span>
                </div>
              ))}
            </div>
          )}
        </td>
      </tr>
    )}
    </>
  )
}

export default Watchlist
