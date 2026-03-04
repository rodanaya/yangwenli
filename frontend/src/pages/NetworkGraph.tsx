/**
 * Network Explorer Page — Graph-First Layout
 * Force-directed graph as the primary experience, with a side panel for node details.
 * Replaces the previous 3-level accordion tree (Sectors → Institutions → Vendors).
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReactECharts from 'echarts-for-react'
import { Network, Search, X, ExternalLink, Users, UserCircle, RotateCcw, ChevronDown, ChevronUp, ZoomIn, ZoomOut, AlertTriangle, Info, Eye, Layers } from 'lucide-react'
import { RiskBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionDescription } from '@/components/SectionDescription'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { RISK_COLORS, getRiskLevelFromScore, SECTORS } from '@/lib/constants'
import { networkApi, vendorApi, institutionApi } from '@/api/client'
import type { NetworkNode, NetworkLink, CoBidderItem, CommunitiesResponse, CommunityDetailResponse } from '@/api/client'
import { useEntityDrawer } from '@/contexts/EntityDrawerContext'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskToColor(score: number | null): string {
  if (score == null) return '#64748b'
  return RISK_COLORS[getRiskLevelFromScore(score)]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function nodeSymbolSize(value: number, _nodeType: string): number {
  // Scale by log10(total_value + 1), mapped to 8-28px range
  const log = Math.log10(value + 1)
  // log10 of typical values: ~9 (1B MXN) to ~12 (1T MXN); normalize to 0-1
  const normalized = clamp((log - 6) / 7, 0, 1)
  return clamp(8 + normalized * 20, 8, 28)
}

function linkWidth(contracts: number): number {
  return clamp(Math.log2(contracts + 1), 1, 5)
}

function truncate(name: string, max = 18): string {
  return name.length > max ? name.slice(0, max) + '…' : name
}

// Community color palette — 12 distinct, perceptually spread colors
const COMMUNITY_PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#22c55e',
  '#06b6d4', '#a855f7',
]

function communityToColor(communityId: number | null | undefined): string {
  if (communityId == null) return '#64748b'
  return COMMUNITY_PALETTE[communityId % COMMUNITY_PALETTE.length]
}

// ---------------------------------------------------------------------------
// Filter bar types
// ---------------------------------------------------------------------------

interface GraphFilters {
  sectorId: number | undefined
  year: number | undefined
  minContracts: number
  depth: 1 | 2
  riskFilter: 'all' | 'critical' | 'high' | 'high_and_above'
}

// ---------------------------------------------------------------------------
// Search suggestion item
// ---------------------------------------------------------------------------

interface SearchSuggestion {
  id: number
  name: string
  entityType: 'vendor' | 'institution'
  subtitle?: string
}

// ---------------------------------------------------------------------------
// FiltersBar
// ---------------------------------------------------------------------------

const YEARS = Array.from({ length: 24 }, (_, i) => 2025 - i)
const MIN_CONTRACTS_OPTIONS = [1, 5, 10, 20, 50]

function FiltersBar({
  filters,
  onChange,
  onReset,
}: {
  filters: GraphFilters
  onChange: (patch: Partial<GraphFilters>) => void
  onReset: () => void
}) {
  const { t } = useTranslation('network')
  const hasActive =
    filters.sectorId !== undefined ||
    filters.year !== undefined ||
    filters.minContracts !== 10 ||
    filters.depth !== 1 ||
    filters.riskFilter !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {/* Sector */}
      <div className="flex items-center gap-1.5">
        <label className="text-text-muted shrink-0">{t('filterSector')}</label>
        <select
          value={filters.sectorId ?? ''}
          onChange={(e) =>
            onChange({ sectorId: e.target.value ? Number(e.target.value) : undefined })
          }
          className="h-7 pl-2 pr-6 rounded border border-border bg-background-card text-xs focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">{t('filterAllSectors')}</option>
          {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameEN}
            </option>
          ))}
        </select>
      </div>

      {/* Year */}
      <div className="flex items-center gap-1.5">
        <label className="text-text-muted shrink-0">{t('filterYear')}</label>
        <select
          value={filters.year ?? ''}
          onChange={(e) =>
            onChange({ year: e.target.value ? Number(e.target.value) : undefined })
          }
          className="h-7 pl-2 pr-6 rounded border border-border bg-background-card text-xs focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">{t('filterAllYears')}</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Min contracts */}
      <div className="flex items-center gap-1.5">
        <label className="text-text-muted shrink-0">{t('filterMinContracts')}</label>
        <select
          value={filters.minContracts}
          onChange={(e) => onChange({ minContracts: Number(e.target.value) })}
          className="h-7 pl-2 pr-6 rounded border border-border bg-background-card text-xs focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {MIN_CONTRACTS_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </select>
      </div>

      {/* Depth */}
      <div className="flex items-center gap-1.5">
        <label className="text-text-muted shrink-0">{t('filterDepth')}</label>
        <div className="flex rounded border border-border overflow-hidden">
          {([1, 2] as const).map((d) => (
            <button
              key={d}
              onClick={() => onChange({ depth: d })}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                filters.depth === d
                  ? 'bg-accent text-white'
                  : 'bg-background-card text-text-secondary hover:bg-background-elevated'
              }`}
              aria-pressed={filters.depth === d}
            >
              {d}-hop
            </button>
          ))}
        </div>
      </div>

      {/* Risk level filter */}
      <div className="flex items-center gap-1.5">
        <label className="text-text-muted shrink-0 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Risk
        </label>
        <select
          value={filters.riskFilter}
          onChange={(e) => onChange({ riskFilter: e.target.value as GraphFilters['riskFilter'] })}
          className="h-7 pl-2 pr-6 rounded border border-border bg-background-card text-xs focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="all">All levels</option>
          <option value="high_and_above">High + Critical</option>
          <option value="critical">Critical only</option>
        </select>
      </div>

      {/* Reset */}
      {hasActive && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label={t('filterReset')}
        >
          <X className="h-3 w-3" />
          {t('filterReset')}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SearchBar with autocomplete
// ---------------------------------------------------------------------------

function SearchBar({
  onSelect,
  placeholder,
}: {
  onSelect: (suggestion: SearchSuggestion) => void
  placeholder?: string
}) {
  const { t } = useTranslation('network')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const trimmed = query.trim()

  const { data: vendorResults } = useQuery({
    queryKey: ['network-search-vendors', trimmed],
    queryFn: () => vendorApi.search(trimmed, 5),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  })

  const { data: institutionResults } = useQuery({
    queryKey: ['network-search-institutions', trimmed],
    queryFn: () => institutionApi.search(trimmed, 5),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  })

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const results: SearchSuggestion[] = []
    vendorResults?.data?.slice(0, 5).forEach((v) => {
      results.push({
        id: v.id,
        name: v.name,
        entityType: 'vendor',
        subtitle: v.rfc ?? undefined,
      })
    })
    institutionResults?.data?.slice(0, 5).forEach((inst) => {
      results.push({
        id: inst.id,
        name: inst.name,
        entityType: 'institution',
        subtitle: inst.siglas ?? undefined,
      })
    })
    return results
  }, [vendorResults, institutionResults])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(s: SearchSuggestion) {
    setQuery('')
    setOpen(false)
    onSelect(s)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder ?? t('searchPlaceholder')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full h-9 pl-8 pr-8 text-xs rounded-md border border-border bg-background-card focus:outline-none focus:ring-1 focus:ring-accent"
        aria-label="Search vendor or institution"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
      />
      {query && (
        <button
          onClick={() => { setQuery(''); setOpen(false) }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-background-card shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={`${s.entityType}-${s.id}`}
              onClick={() => handleSelect(s)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-background-elevated transition-colors text-left"
            >
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  s.entityType === 'vendor'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-blue-500/10 text-blue-400'
                }`}
              >
                {s.entityType === 'vendor' ? t('typeVendor') : t('typeInstitution')}
              </span>
              <span className="truncate font-medium">{toTitleCase(s.name)}</span>
              {s.subtitle && (
                <span className="shrink-0 text-text-muted">{s.subtitle}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Side panel
// ---------------------------------------------------------------------------

function SidePanel({
  node,
  coBidders,
  coBiddersLoading,
  onClose,
  onLoadCoBidders,
}: {
  node: NetworkNode
  coBidders: CoBidderItem[] | null
  coBiddersLoading: boolean
  onClose: () => void
  onLoadCoBidders: (id: number) => void
}) {
  const { t } = useTranslation('network')
  const isVendor = node.type === 'vendor'
  // Node IDs are like "v-123" or "i-456"
  const numericId = parseInt(node.id.slice(2), 10)
  const profileLink = isVendor ? `/vendors/${numericId}` : `/institutions/${numericId}`
  const { open: openDrawer } = useEntityDrawer()

  return (
    <div className="w-72 shrink-0 border-l border-border bg-background-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 border-b border-border">
        <div className="min-w-0">
          <div
            className={`inline-block mb-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              isVendor ? 'bg-accent/10 text-accent' : 'bg-blue-500/10 text-blue-400'
            }`}
          >
            {isVendor ? t('typeVendor') : t('typeInstitution')}
          </div>
          <h3 className="text-sm font-semibold leading-snug" title={node.name}>
            {toTitleCase(node.name)}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-text-muted hover:text-text-primary mt-0.5"
          aria-label={t('panelClose')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {/* Risk badge */}
        {node.risk_score != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">{t('panelRiskScore')}</span>
            <RiskBadge score={node.risk_score} className="text-xs" />
          </div>
        )}

        {/* Community badge — vendors only, shown when graph features are available */}
        {isVendor && node.community_id != null && node.community_size != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Co-bid community</span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: communityToColor(node.community_id) }}
              />
              <span className="font-mono text-text-secondary">
                #{node.community_id} · {formatNumber(node.community_size)} vendors
              </span>
            </span>
          </div>
        )}

        {/* Contract count and value */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-background-elevated p-2">
            <div className="text-text-muted mb-0.5">{t('panelContracts')}</div>
            <div className="font-semibold tabular-nums">{formatNumber(node.contracts)}</div>
          </div>
          <div className="rounded bg-background-elevated p-2">
            <div className="text-text-muted mb-0.5">{t('panelValue')}</div>
            <div className="font-semibold tabular-nums">{formatCompactMXN(node.value)}</div>
          </div>
        </div>

        {/* Profile actions */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => openDrawer(numericId, isVendor ? 'vendor' : 'institution')}
            className="flex items-center gap-1.5 text-xs text-accent hover:underline w-full text-left"
          >
            <UserCircle className="h-3 w-3 shrink-0" />
            {t('panelOpenProfile')}
          </button>
          <Link
            to={profileLink}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            {t('panelViewPage')}
          </Link>
        </div>

        {/* Triangle Hub Alert (Wachs, Fazekas & Kertész 2021) */}
        {isVendor && node.cobid_clustering_coeff != null && node.cobid_clustering_coeff > 0.5 && (
          <div className="text-xs p-2 rounded bg-red-950/30 border border-red-500/30">
            <strong className="text-red-400">Triangle Hub Alert:</strong> This vendor appears in{' '}
            <span className="font-mono font-bold">{node.cobid_triangle_count ?? 0}</span> co-bidding triangles.
            High triangle density is a validated collusion ring indicator
            (Wachs, Fazekas &amp; Kertész 2021).
          </div>
        )}

        {/* Co-bidders section (vendors only) */}
        {isVendor && (
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{t('panelCoBidders')}</span>
              {!coBidders && !coBiddersLoading && (
                <button
                  onClick={() => onLoadCoBidders(numericId)}
                  className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1 hover:border-accent hover:text-accent transition-colors"
                >
                  <Users className="h-3 w-3" />
                  {t('panelFindCoBidders')}
                </button>
              )}
            </div>

            {coBiddersLoading && (
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}

            {coBidders && coBidders.length === 0 && (
              <p className="text-xs text-text-muted italic">{t('panelNoCoBidders')}</p>
            )}

            {coBidders && coBidders.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-text-muted/60 pb-0.5">
                  % of shared tenders where one wins and the other doesn't compete
                </div>
                {coBidders.slice(0, 8).map((cb, ci) => (
                  <div
                    key={cb.vendor_id}
                    className="flex items-center justify-between gap-2 text-xs"
                    style={{
                      opacity: 0,
                      animation: `fadeInUp 500ms cubic-bezier(0.16, 1, 0.3, 1) ${ci * 50}ms both`,
                    }}
                  >
                    <span className="truncate text-text-secondary" title={cb.vendor_name}>
                      {toTitleCase(cb.vendor_name)}
                    </span>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <span
                        className="tabular-nums"
                        title="Proportion of shared procedures where one wins and other submits cover bid"
                        style={{
                          color: cb.same_winner_ratio >= 0.8 ? '#f87171'
                            : cb.same_winner_ratio >= 0.5 ? '#fb923c'
                            : '#94a3b8',
                        }}
                      >
                        {(cb.same_winner_ratio * 100).toFixed(0)}%
                      </span>
                      <span
                        className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                          cb.relationship_strength === 'very_strong' || cb.relationship_strength === 'strong'
                            ? 'bg-risk-high/10 text-risk-high'
                            : 'bg-background-elevated text-text-muted'
                        }`}
                      >
                        {cb.relationship_strength}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ExampleChip — clickable example entity that searches and selects
// ---------------------------------------------------------------------------

function ExampleChip({
  name,
  entityType,
  onSelect,
}: {
  name: string
  entityType: 'vendor' | 'institution'
  onSelect: (suggestion: SearchSuggestion) => void
}) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick() {
    setIsLoading(true)
    try {
      if (entityType === 'vendor') {
        const result = await vendorApi.search(name, 1)
        const hit = result?.data?.[0]
        if (hit) {
          onSelect({ id: hit.id, name: hit.name, entityType: 'vendor', subtitle: hit.rfc ?? undefined })
          return
        }
      } else {
        const result = await institutionApi.search(name, 1)
        const hit = result?.data?.[0]
        if (hit) {
          onSelect({ id: hit.id, name: hit.name, entityType: 'institution', subtitle: (hit as { siglas?: string }).siglas ?? undefined })
          return
        }
      }
    } catch {
      // If search fails, silently ignore
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background-elevated text-text-secondary hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-all disabled:opacity-50 disabled:cursor-wait"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
          entityType === 'vendor' ? 'bg-accent' : 'bg-blue-400'
        }`}
      />
      {name.length > 30 ? name.slice(0, 30) + '…' : name}
    </button>
  )
}

// ---------------------------------------------------------------------------
// CommunitySidePanel — slide-out left panel listing Louvain communities
// ---------------------------------------------------------------------------

function CommunitySidePanel({
  commData,
  commLoading,
  selectedCommunityId,
  onSelectCommunity,
  onCenterVendor,
}: {
  commData: CommunitiesResponse | undefined
  commLoading: boolean
  selectedCommunityId: number | null
  onSelectCommunity: (id: number | null) => void
  onCenterVendor: (vendorId: number, vendorName: string) => void
}) {
  const { t } = useTranslation('network')

  // Detail query — fires only when a community is selected
  const { data: detailData, isLoading: detailLoading } = useQuery<CommunityDetailResponse>({
    queryKey: ['community-detail', selectedCommunityId],
    queryFn: () => networkApi.getCommunityDetail(selectedCommunityId!),
    staleTime: 10 * 60 * 1000,
    enabled: selectedCommunityId !== null,
  })

  return (
    <div
      className="w-72 shrink-0 border-r border-border bg-background-card flex flex-col overflow-hidden"
      role="complementary"
      aria-label="Community Explorer panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border bg-background-elevated/20">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-semibold text-text-primary">Community Explorer</span>
        </div>
        {selectedCommunityId !== null && (
          <button
            onClick={() => onSelectCommunity(null)}
            className="text-text-muted hover:text-text-primary text-[10px] flex items-center gap-0.5"
            aria-label="Back to community list"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {commLoading && (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {commData && !commLoading && !commData.graph_ready && (
          <div className="p-3 text-xs text-text-muted">
            <p className="bg-background-elevated/40 rounded p-2">
              Community graph not built. Run{' '}
              <code className="font-mono text-accent">python -m scripts.build_vendor_graph</code>.
            </p>
          </div>
        )}

        {commData && commData.graph_ready && !selectedCommunityId && (
          <>
            <div className="px-3 py-2 text-[10px] text-text-muted border-b border-border/20">
              {commData.total_communities.toLocaleString()} clusters ·{' '}
              {commData.communities.length} shown · sorted by size
            </div>
            <div className="divide-y divide-border/10">
              {commData.communities.map((comm) => {
                const commColor = COMMUNITY_PALETTE[comm.community_id % COMMUNITY_PALETTE.length]
                const riskLevel = getRiskLevelFromScore(comm.avg_risk)
                return (
                  <button
                    key={comm.community_id}
                    onClick={() => onSelectCommunity(comm.community_id)}
                    className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 hover:bg-background-elevated/30 transition-colors group"
                    aria-label={`Community ${comm.community_id}, ${comm.size} vendors, avg risk ${(comm.avg_risk * 100).toFixed(1)}%`}
                  >
                    <span
                      className="mt-0.5 w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: commColor }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-mono font-medium text-text-primary">
                          #{comm.community_id}
                        </span>
                        <span
                          className="text-[10px] font-mono px-1 py-0.5 rounded shrink-0"
                          style={{
                            color: RISK_COLORS[riskLevel],
                            backgroundColor: `${RISK_COLORS[riskLevel]}18`,
                          }}
                        >
                          {(comm.avg_risk * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted mb-0.5">
                        <span>{formatNumber(comm.size)} vendors</span>
                        <span>·</span>
                        <span>{comm.sector_count} sector{comm.sector_count !== 1 ? 's' : ''}</span>
                      </div>
                      {comm.top_vendors?.slice(0, 2).map(v => (
                        <div key={v.vendor_id} className="text-[10px] text-text-muted/70 truncate">
                          {toTitleCase(v.vendor_name)}
                        </div>
                      ))}
                    </div>
                    <ExternalLink className="h-3 w-3 text-text-muted/30 group-hover:text-accent shrink-0 mt-0.5 transition-colors" />
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Community detail view */}
        {selectedCommunityId !== null && (
          <div className="flex flex-col h-full">
            {detailLoading && (
              <div className="p-3 space-y-2">
                <Skeleton className="h-5 w-32" />
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            )}

            {detailData && !detailLoading && (
              <>
                {/* Detail header */}
                <div className="px-3 py-2 border-b border-border/20 bg-background-elevated/10">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: COMMUNITY_PALETTE[detailData.community_id % COMMUNITY_PALETTE.length] }}
                    />
                    <span className="text-xs font-semibold text-text-primary">
                      Cluster #{detailData.community_id}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {formatNumber(detailData.size)} vendors ·{' '}
                    avg risk{' '}
                    <span
                      className="font-mono"
                      style={{ color: RISK_COLORS[getRiskLevelFromScore(detailData.avg_risk_score)] }}
                    >
                      {(detailData.avg_risk_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (detailData.members[0]) {
                        onCenterVendor(detailData.members[0].vendor_id, detailData.members[0].vendor_name)
                      }
                    }}
                    className="mt-1.5 w-full text-[10px] text-accent hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Center graph on this cluster
                  </button>
                </div>

                {/* Members list */}
                <div className="flex-1 overflow-y-auto divide-y divide-border/10">
                  {detailData.members
                    .slice()
                    .sort((a, b) => b.risk_score - a.risk_score)
                    .map((member, i) => {
                      const level = getRiskLevelFromScore(member.risk_score)
                      return (
                        <div
                          key={member.vendor_id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-background-elevated/20 transition-colors"
                          style={{
                            opacity: 0,
                            animation: `fadeInUp 300ms ease ${i * 30}ms both`,
                          }}
                        >
                          <span className="text-[10px] text-text-muted/60 font-mono w-4 shrink-0 tabular-nums">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/vendors/${member.vendor_id}`}
                              className="text-xs text-accent hover:underline truncate block"
                              title={member.vendor_name}
                            >
                              {toTitleCase(member.vendor_name)}
                            </Link>
                          </div>
                          <span
                            className="text-[10px] font-mono tabular-nums shrink-0"
                            style={{ color: RISK_COLORS[level] }}
                          >
                            {(member.risk_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      )
                    })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="px-3 py-2 border-t border-border/20 text-[10px] text-text-muted/60">
        {t('communityNote', { defaultValue: 'Same-color vendors bid together frequently.' })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GraphStatCount — count-up span for graph stats
// ---------------------------------------------------------------------------

function GraphStatCount({ value }: { value: number }) {
  const { ref, value: animated } = useCountUp(value, 800)
  return <span ref={ref}>{Math.round(animated)}</span>
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

const DEFAULT_FILTERS: GraphFilters = {
  sectorId: undefined,
  year: undefined,
  minContracts: 10,
  depth: 1,
  riskFilter: 'all',
}

// ---------------------------------------------------------------------------
// First-time user instruction overlay
// ---------------------------------------------------------------------------

function InstructionOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="absolute inset-0 z-20 bg-background-card/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-5">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-accent" />
          <h3 className="text-sm font-bold text-text-primary">How to use the Network Explorer</h3>
        </div>
        <div className="space-y-3 text-xs text-text-secondary">
          <div className="flex gap-3">
            <span className="text-accent font-bold shrink-0 w-5 text-center">1</span>
            <div>
              <strong className="text-text-primary">Search for a vendor or institution</strong> using the search bar above. The graph will show all entities connected to your selection through procurement relationships.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold shrink-0 w-5 text-center">2</span>
            <div>
              <strong className="text-text-primary">Node colors indicate corruption risk.</strong> Red nodes are Critical risk, orange are High risk. Larger nodes represent more contract value. High-risk nodes glow — they are your primary investigation targets.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold shrink-0 w-5 text-center">3</span>
            <div>
              <strong className="text-text-primary">Click any node</strong> to open the details panel — see risk score, contract count, and co-bidding partners. Click "Open profile" to launch a full investigation view.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold shrink-0 w-5 text-center">4</span>
            <div>
              <strong className="text-text-primary">Switch to Community mode</strong> (top-right toggle) to color nodes by co-bidding cluster. Nodes of the same color bid together frequently — potential collusion rings.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-accent font-bold shrink-0 w-5 text-center">5</span>
            <div>
              <strong className="text-text-primary">Use the Risk filter</strong> to show only High + Critical nodes, instantly isolating the most suspicious vendors in the network.
            </div>
          </div>
        </div>
        <div className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
          <strong>What makes a cluster suspicious?</strong> Vendors in the same cluster frequently appear together in competitive tenders. They may be submitting coordinated bids (one vendor wins, partners submit losing cover bids) to simulate competition while dividing contracts.
        </div>
        <button
          onClick={onDismiss}
          className="w-full py-2 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 transition-colors"
        >
          Got it — start exploring
        </button>
      </div>
    </div>
  )
}

// Center entity selected via search
interface CenterEntity {
  id: number
  entityType: 'vendor' | 'institution'
  name: string
}

export function NetworkGraph() {
  const { t } = useTranslation('network')
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS)
  const [centerEntity, setCenterEntity] = useState<CenterEntity | null>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [coBidders, setCoBidders] = useState<CoBidderItem[] | null>(null)
  const [coBiddersLoading, setCoBiddersLoading] = useState(false)
  const [colorMode, setColorMode] = useState<'risk' | 'community'>('risk')
  const [showCommunities, setShowCommunities] = useState(false)
  const [showCommSidebar, setShowCommSidebar] = useState(false)
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  // Community explorer query — fires when either panel (accordion or sidebar) is open
  const { data: commData, isLoading: commLoading } = useQuery<CommunitiesResponse>({
    queryKey: ['communities', 'explorer'],
    queryFn: () => networkApi.getCommunities({ limit: 50, min_size: 3 }),
    staleTime: 30 * 60 * 1000,
    enabled: showCommunities || showCommSidebar,
  })

  // Pre-load IMSS as default center entity on first mount
  useEffect(() => {
    institutionApi.search('IMSS', 1).then((result) => {
      const hit = result?.data?.[0]
      if (hit) setCenterEntity({ id: hit.id, entityType: 'institution', name: hit.name })
    }).catch(() => {})
  }, [])

  // Clear co-bidder state when selected node changes
  useEffect(() => {
    setCoBidders(null)
    setCoBiddersLoading(false)
  }, [selectedNode?.id])

  // Build query params
  const graphParams = useMemo(() => {
    const params: Record<string, unknown> = {
      limit: 60,
      min_contracts: filters.minContracts,
      depth: filters.depth,
    }
    if (centerEntity) {
      if (centerEntity.entityType === 'vendor') params.vendor_id = centerEntity.id
      else params.institution_id = centerEntity.id
    }
    if (filters.sectorId) params.sector_id = filters.sectorId
    if (filters.year) params.year = filters.year
    return params
  }, [centerEntity, filters])

  const { data: graphData, isLoading } = useQuery({
    queryKey: ['network-graph-page', graphParams],
    queryFn: () => networkApi.getGraph(graphParams),
    staleTime: 5 * 60 * 1000,
    enabled: centerEntity !== null,
  })

  // Build ECharts option
  const option = useMemo(() => {
    if (!graphData) return {}

    const centerNodeId = centerEntity
      ? centerEntity.entityType === 'vendor'
        ? `v-${centerEntity.id}`
        : `i-${centerEntity.id}`
      : null

    // Determine which nodes to visually dim based on risk filter
    const isNodeVisibleByRisk = (node: NetworkNode): boolean => {
      if ((filters.riskFilter as string) === 'all') return true
      if (node.type === 'institution') return true // always show institutions
      if (node.risk_score == null) return (filters.riskFilter as string) === 'all'
      const level = getRiskLevelFromScore(node.risk_score)
      if (filters.riskFilter === 'critical') return level === 'critical'
      if (filters.riskFilter === 'high_and_above') return level === 'critical' || level === 'high'
      return true
    }

    const nodes = graphData.nodes.map((node: NetworkNode) => {
      const isCenter = node.id === centerNodeId
      const symbolSize = isCenter ? 48 : nodeSymbolSize(node.value, node.type)
      const passesRiskFilter = isNodeVisibleByRisk(node)
      const baseColor =
        node.type === 'institution'
          ? '#60a5fa'
          : colorMode === 'community' && node.community_id != null
            ? communityToColor(node.community_id)
            : riskToColor(node.risk_score)
      const itemColor = passesRiskFilter ? baseColor : '#2d3748'
      const showLabel = (isCenter || symbolSize > 18) && passesRiskFilter

      // Glow aura for critical and high risk vendor nodes
      const riskLevel = node.type === 'vendor' && node.risk_score != null
        ? getRiskLevelFromScore(node.risk_score)
        : null
      const hasShadow = riskLevel === 'critical' || riskLevel === 'high'
      const shadowColor = riskLevel === 'critical' ? '#f87171' : '#fb923c'

      // TODO: Add is_sanctioned field to network graph node data from /network/graph endpoint
      // When available, sanctioned nodes will get a red border ring
      const isSanctioned = (node as NetworkNode & { is_sanctioned?: boolean }).is_sanctioned === true
      const borderColor = isCenter ? '#ffffff'
        : isSanctioned ? '#dc2626'
        : hasShadow ? shadowColor
        : undefined
      const borderWidth = isCenter ? 3
        : isSanctioned ? 2.5
        : hasShadow ? 1.5
        : 0

      return {
        id: node.id,
        name: isSanctioned ? `${node.name}` : node.name,
        value: node.value,
        contracts: node.contracts,
        risk_score: node.risk_score,
        node_type: node.type,
        is_sanctioned: isSanctioned,
        // Store the full raw node for the side panel
        extra: node,
        symbolSize,
        itemStyle: {
          color: itemColor,
          borderColor: passesRiskFilter ? borderColor : undefined,
          borderWidth: passesRiskFilter ? borderWidth : 0,
          shadowColor: passesRiskFilter ? (isSanctioned ? '#dc2626' : hasShadow ? shadowColor : undefined) : undefined,
          shadowBlur: passesRiskFilter ? (isSanctioned ? 15 : hasShadow ? 12 : undefined) : undefined,
          opacity: passesRiskFilter ? 1 : 0.15,
        },
        label: {
          show: showLabel,
          formatter: truncate(node.name),
          fontSize: 10,
          position: 'bottom' as const,
          color: 'var(--color-text-muted)',
        },
      }
    })

    const links = graphData.links.map((link: NetworkLink) => ({
      source: link.source,
      target: link.target,
      value: link.value,
      contracts: link.contracts,
      avg_risk: link.avg_risk,
      lineStyle: {
        width: linkWidth(link.contracts),
        color: (link.avg_risk ?? 0) >= 0.3 ? '#ef444480' : '#47556980',
        curveness: 0.1,
      },
    }))

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'var(--color-background)',
        borderColor: 'var(--color-border)',
        textStyle: { color: 'var(--color-text-primary)', fontSize: 12 },
        formatter: (params: {
          dataType: string
          data: {
            name: string
            contracts?: number
            value?: number
            avg_risk?: number
            risk_score?: number | null
          }
        }) => {
          if (params.dataType === 'node') {
            const { name, contracts, value, risk_score } = params.data
            const riskPct = risk_score != null ? ` • Risk: ${(risk_score * 100).toFixed(0)}%` : ''
            return `<strong>${name}</strong><br/>${formatNumber(contracts ?? 0)} contracts<br/>${formatCompactMXN(value ?? 0)}${riskPct}`
          }
          if (params.dataType === 'edge') {
            const { contracts, value, avg_risk } = params.data
            const riskPct = avg_risk != null ? ` • Avg risk: ${(avg_risk * 100).toFixed(0)}%` : ''
            return `${formatNumber(contracts ?? 0)} contracts<br/>${formatCompactMXN(value ?? 0)}${riskPct}`
          }
          return ''
        },
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          data: nodes,
          links,
          force: {
            repulsion: 300,
            gravity: 0.08,
            edgeLength: [80, 220],
            layoutAnimation: true,
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 4 },
          },
          label: { show: true },
          lineStyle: { opacity: 0.6 },
        },
      ],
    }
  }, [graphData, centerEntity, colorMode, filters.riskFilter])

  // Computed graph stats for the Key Network Stats strip
  const graphStats = useMemo(() => {
    if (!graphData) return null

    const totalNodes = graphData.nodes.length

    // High-risk connections: edges where both endpoints are critical or high risk
    const highRiskNodeIds = new Set(
      graphData.nodes
        .filter((n: NetworkNode) => {
          if (n.type !== 'vendor' || n.risk_score == null) return false
          const level = getRiskLevelFromScore(n.risk_score)
          return level === 'critical' || level === 'high'
        })
        .map((n: NetworkNode) => n.id)
    )
    const highRiskConnections = graphData.links.filter(
      (l: NetworkLink) => highRiskNodeIds.has(l.source) && highRiskNodeIds.has(l.target)
    ).length

    // Most connected node (highest degree = count of links touching the node)
    const degreeMap = new Map<string, number>()
    graphData.links.forEach((l: NetworkLink) => {
      degreeMap.set(l.source, (degreeMap.get(l.source) ?? 0) + 1)
      degreeMap.set(l.target, (degreeMap.get(l.target) ?? 0) + 1)
    })
    let mostConnectedName = '—'
    let maxDegree = 0
    degreeMap.forEach((degree, nodeId) => {
      if (degree > maxDegree) {
        maxDegree = degree
        const node = graphData.nodes.find((n: NetworkNode) => n.id === nodeId)
        mostConnectedName = node ? truncate(toTitleCase(node.name), 22) : nodeId
      }
    })

    // Densest community: community with most internal edges
    const communityEdgeCounts = new Map<number, number>()
    const nodeToComm = new Map<string, number>()
    graphData.nodes.forEach((n: NetworkNode) => {
      if (n.community_id != null) nodeToComm.set(n.id, n.community_id)
    })
    graphData.links.forEach((l: NetworkLink) => {
      const sc = nodeToComm.get(l.source)
      const tc = nodeToComm.get(l.target)
      if (sc != null && tc != null && sc === tc) {
        communityEdgeCounts.set(sc, (communityEdgeCounts.get(sc) ?? 0) + 1)
      }
    })
    let densestComm = '—'
    let maxCommEdges = 0
    communityEdgeCounts.forEach((count, commId) => {
      if (count > maxCommEdges) {
        maxCommEdges = count
        densestComm = `#${commId} (${count} links)`
      }
    })

    // Top-5 nodes by degree
    const topByDegree = [...degreeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nodeId, degree]) => {
        const node = graphData.nodes.find((n: NetworkNode) => n.id === nodeId)
        return {
          name: node ? truncate(toTitleCase(node.name), 24) : nodeId,
          degree,
          type: node?.type ?? 'unknown',
          riskScore: node?.risk_score ?? null,
        }
      })

    // Additional metrics for the analytics panel
    const edgeCount = graphData.links.length
    const degreeValues = [...degreeMap.values()]
    const avgDegree = degreeValues.length > 0
      ? degreeValues.reduce((a, b) => a + b, 0) / totalNodes
      : 0
    const highRiskNodeCount = graphData.nodes.filter((n: NetworkNode) => {
      if (n.type !== 'vendor' || n.risk_score == null) return false
      const level = getRiskLevelFromScore(n.risk_score)
      return level === 'critical' || level === 'high'
    }).length
    // Graph density: actual edges / max possible edges (undirected)
    const density = totalNodes > 1
      ? edgeCount / (totalNodes * (totalNodes - 1) / 2)
      : 0
    // Top 3 for the analytics panel (shorter list)
    const top3Connected = topByDegree.slice(0, 3)

    return {
      totalNodes,
      highRiskConnections,
      mostConnectedName,
      maxDegree,
      densestComm,
      topByDegree,
      edgeCount,
      avgDegree,
      highRiskNodeCount,
      density,
      top3Connected,
    }
  }, [graphData])

  // ECharts instance ref for reset view
  const chartRef = useRef<ReactECharts>(null)

  const handleResetView = useCallback(() => {
    // ECharts restore action resets zoom/pan
    const instance = chartRef.current?.getEchartsInstance?.()
    if (instance) {
      instance.dispatchAction({ type: 'restore' })
    }
  }, [])

  const handleZoomIn = useCallback(() => {
    const instance = chartRef.current?.getEchartsInstance?.()
    if (instance) {
      instance.dispatchAction({ type: 'graphRoam', zoom: 1.3 })
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    const instance = chartRef.current?.getEchartsInstance?.()
    if (instance) {
      instance.dispatchAction({ type: 'graphRoam', zoom: 1 / 1.3 })
    }
  }, [])

  // Click handler for ECharts nodes
  const handleGraphEvents = useMemo(
    () => ({
      click: (params: { dataType?: string; data?: { extra?: NetworkNode } }) => {
        if (params.dataType !== 'node' || !params.data?.extra) return
        setSelectedNode(params.data.extra)
      },
    }),
    []
  )

  // Load co-bidders for a vendor
  const handleLoadCoBidders = useCallback(async (vendorId: number) => {
    setCoBiddersLoading(true)
    try {
      const result = await networkApi.getCoBidders(vendorId, 3, 20)
      setCoBidders(result.co_bidders)
    } catch {
      setCoBidders([])
    } finally {
      setCoBiddersLoading(false)
    }
  }, [])

  // Handle search selection — center the graph on the entity
  const handleSearchSelect = useCallback((suggestion: SearchSuggestion) => {
    setCenterEntity({
      id: suggestion.id,
      entityType: suggestion.entityType,
      name: suggestion.name,
    })
    setSelectedNode(null)
  }, [])

  const isEmpty = !isLoading && graphData && graphData.nodes.length === 0

  const patchFilters = useCallback((patch: Partial<GraphFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setCenterEntity(null)
    setSelectedNode(null)
  }, [])

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Network className="h-4.5 w-4.5 text-accent" />
            {t('pageTitle')}
          </h2>
          {graphData && (
            <p className="text-xs text-text-muted mt-0.5">
              <GraphStatCount value={graphData.total_nodes} /> {t('statsNodes')} · <GraphStatCount value={graphData.total_links} /> {t('statsConnections')}
              {centerEntity && ` · ${t('statsCenteredOn')} ${toTitleCase(centerEntity.name)}`}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowInstructions(true)}
          className="shrink-0 flex items-center gap-1.5 text-xs text-text-muted hover:text-accent border border-border/40 hover:border-accent/40 rounded px-2.5 py-1.5 transition-colors"
          title="How to use the Network Explorer"
        >
          <Info className="h-3.5 w-3.5" />
          How to use
        </button>
      </div>

      <SectionDescription>{t('pageDesc')}</SectionDescription>
      {/* Graph stats are shown inline in the header above */}

      {/* Co-bidding note */}
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-400 flex items-start gap-2">
        <span className="shrink-0 mt-0.5">&#9888;</span>
        <span>
          <strong>Note on co-bidding:</strong> Co-bidding patterns are visible in vendor profiles
          but are <em>not included in the risk score</em> — the signal was regularized to zero in
          model training. Use <strong>Find co-bidders</strong> in the side panel for manual
          investigation.
        </span>
      </div>

      {/* Toolbar row: search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar onSelect={handleSearchSelect} placeholder={t('searchPlaceholder')} />
        {centerEntity && (
          <div className="flex items-center gap-1.5 text-xs bg-accent/10 border border-accent/30 rounded px-2 py-1">
            <span className="text-accent font-medium">
              {toTitleCase(centerEntity.name)}
            </span>
            <button
              onClick={() => { setCenterEntity(null); setSelectedNode(null) }}
              className="text-text-muted hover:text-text-primary"
              aria-label="Clear center entity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      <ScrollReveal direction="fade">
      <div className="flex items-center gap-3">
        <FiltersBar filters={filters} onChange={patchFilters} onReset={resetFilters} />
        {/* Color mode toggle */}
        <div className="flex items-center gap-1 rounded border border-border bg-background-elevated text-xs shrink-0">
          <button
            onClick={() => setColorMode('risk')}
            className={`px-2.5 py-1 rounded-sm transition-colors ${
              colorMode === 'risk'
                ? 'bg-accent/20 text-accent font-medium'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Risk
          </button>
          <button
            onClick={() => setColorMode('community')}
            className={`px-2.5 py-1 rounded-sm transition-colors ${
              colorMode === 'community'
                ? 'bg-accent/20 text-accent font-medium'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Community
          </button>
        </div>

        {/* Communities sidebar toggle */}
        <button
          onClick={() => {
            setShowCommSidebar((v) => !v)
            setSelectedCommunityId(null)
          }}
          className={`flex items-center gap-1.5 text-xs border rounded px-2.5 py-1.5 transition-colors shrink-0 ${
            showCommSidebar
              ? 'bg-accent/10 border-accent/40 text-accent'
              : 'border-border text-text-muted hover:text-text-primary hover:border-border/60'
          }`}
          aria-pressed={showCommSidebar}
          title="Toggle Community Explorer panel"
        >
          <Layers className="h-3.5 w-3.5" />
          Communities
        </button>
      </div>
      </ScrollReveal>

      {/* Key Network Stats strip — shown when graph data is loaded */}
      {graphStats && graphData && (
        <div className="flex flex-wrap gap-6 px-4 py-2 bg-background-elevated/30 rounded border border-border/20 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-text-muted uppercase tracking-wider text-[10px] font-medium">Nodes</span>
            <span className="font-mono font-semibold text-text-primary tabular-nums">{graphStats.totalNodes}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-text-muted uppercase tracking-wider text-[10px] font-medium">High-risk links</span>
            <span
              className="font-mono font-semibold tabular-nums"
              style={{ color: graphStats.highRiskConnections > 0 ? '#f87171' : '#4ade80' }}
            >
              {graphStats.highRiskConnections}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-text-muted uppercase tracking-wider text-[10px] font-medium">Most connected</span>
            <span className="font-mono font-semibold text-text-primary">
              {graphStats.mostConnectedName}
              {graphStats.maxDegree > 0 && (
                <span className="text-text-muted font-normal"> ({graphStats.maxDegree})</span>
              )}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-text-muted uppercase tracking-wider text-[10px] font-medium">Densest cluster</span>
            <span className="font-mono font-semibold text-text-primary">{graphStats.densestComm}</span>
          </div>
        </div>
      )}

      {/* Top-5 most connected nodes */}
      {graphStats && graphData && graphStats.topByDegree.length > 0 && (
        <div className="px-4 py-2 bg-background-elevated/20 rounded border border-border/15">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Top Connected Nodes</div>
          <div className="flex flex-col gap-1">
            {graphStats.topByDegree.map((node, i) => (
              <div key={node.name + i} className="flex items-center gap-2 text-xs">
                <span className="text-text-muted font-mono w-4 text-right flex-shrink-0">#{i + 1}</span>
                <span className="font-medium text-text-primary truncate flex-1">{node.name}</span>
                <span className="text-text-muted font-mono flex-shrink-0">{node.degree} links</span>
                {node.riskScore != null && (
                  <span
                    className="font-mono text-[10px] flex-shrink-0"
                    style={{
                      color: node.riskScore >= 0.5 ? '#f87171'
                        : node.riskScore >= 0.3 ? '#fb923c'
                        : node.riskScore >= 0.1 ? '#fbbf24'
                        : '#4ade80',
                    }}
                  >
                    {(node.riskScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content: communities panel (left) + graph + side panel (right) */}
      <div className="flex border border-border rounded-md overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>

        {/* Left: Communities sidebar — slides in from left */}
        <div
          style={{
            width: showCommSidebar ? '288px' : '0',
            minWidth: showCommSidebar ? '288px' : '0',
            opacity: showCommSidebar ? 1 : 0,
            overflow: 'hidden',
            transition: 'width 300ms cubic-bezier(0.16, 1, 0.3, 1), min-width 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease',
            pointerEvents: showCommSidebar ? 'auto' : 'none',
            flexShrink: 0,
          }}
        >
          {showCommSidebar && (
            <CommunitySidePanel
              commData={commData}
              commLoading={commLoading}
              selectedCommunityId={selectedCommunityId}
              onSelectCommunity={setSelectedCommunityId}
              onCenterVendor={(vendorId, vendorName) => {
                setCenterEntity({ id: vendorId, entityType: 'vendor', name: vendorName })
                setColorMode('community')
                setShowCommSidebar(false)
                setSelectedCommunityId(null)
              }}
            />
          )}
        </div>

        {/* Graph area */}
        <div className="flex-1 relative min-w-0">
          {/* Instruction overlay */}
          {showInstructions && (
            <InstructionOverlay onDismiss={() => setShowInstructions(false)} />
          )}

          {/* Search-to-start state — shown before any entity is selected */}
          {!centerEntity && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background-card z-10 px-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-accent/10 border border-accent/20">
                  <Network className="h-8 w-8 text-accent opacity-70" />
                </div>
                <div>
                  <p className="text-base font-semibold text-text-primary">{t('emptyTitle')}</p>
                  <p className="text-xs text-text-muted mt-1 max-w-xs">
                    {t('emptyDesc')}
                  </p>
                </div>
                <button
                  onClick={() => setShowInstructions(true)}
                  className="flex items-center gap-1.5 text-xs text-accent/70 hover:text-accent transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                  How does this work?
                </button>
              </div>
              <div className="w-full max-w-sm text-center">
                <p className="text-xs text-text-muted mb-2 uppercase tracking-wider font-medium">{t('examplesLabel')}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { name: 'IMSS', type: 'institution' as const },
                    { name: 'Pisa Farmacéutica', type: 'vendor' as const },
                    { name: 'Segalmex', type: 'institution' as const },
                    { name: 'PEMEX', type: 'institution' as const },
                  ].map((example, i) => (
                    <ScrollReveal key={example.name} delay={i * 60} direction="up">
                      <ExampleChip
                        name={example.name}
                        entityType={example.type}
                        onSelect={handleSearchSelect}
                      />
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background-card z-10">
              <Network className="h-8 w-8 text-accent animate-pulse" />
              <p className="text-sm text-text-muted">{t('loadingNetwork')}</p>
            </div>
          )}

          {isEmpty && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background-card">
              <Network className="h-10 w-10 opacity-30" />
              <p className="text-sm text-text-muted">{t('noConnections')}</p>
              <button
                onClick={resetFilters}
                className="text-xs text-accent hover:underline"
              >
                {t('resetFilters')}
              </button>
            </div>
          )}

          {!isLoading && !isEmpty && graphData && (
            <ReactECharts
              ref={chartRef}
              option={option}
              style={{ height: '100%', width: '100%' }}
              onEvents={handleGraphEvents}
              opts={{ renderer: 'svg' }}
            />
          )}

          {/* Zoom controls — top-left overlay, shown when graph is loaded */}
          {!isLoading && !isEmpty && graphData && (
            <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-auto z-10">
              <button
                onClick={handleZoomIn}
                className="flex items-center justify-center h-7 w-7 rounded bg-background-card/90 border border-border/40 text-text-muted hover:text-accent hover:border-accent/40 transition-colors backdrop-blur-sm"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="flex items-center justify-center h-7 w-7 rounded bg-background-card/90 border border-border/40 text-text-muted hover:text-accent hover:border-accent/40 transition-colors backdrop-blur-sm"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleResetView}
                className="flex items-center justify-center h-7 w-7 rounded bg-background-card/90 border border-border/40 text-text-muted hover:text-accent hover:border-accent/40 transition-colors backdrop-blur-sm"
                aria-label="Reset view"
                title="Reset view"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Hint overlay — shown when graph is loaded */}
          {!isLoading && !isEmpty && graphData && centerEntity && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="bg-background-card/90 border border-border rounded px-3 py-1.5 text-xs text-text-muted text-center backdrop-blur-sm">
                {t('clickNodeHint')}
              </div>
            </div>
          )}

          {/* In-graph legend — bottom-right overlay */}
          {!isLoading && !isEmpty && graphData && (
            <div className="absolute bottom-3 right-3 flex flex-col gap-2 bg-background-card/90 border border-border/40 rounded-md px-3 py-2.5 text-[10px] backdrop-blur-sm pointer-events-auto">
              {/* Color legend */}
              <div className="space-y-1">
                <div className="text-text-muted uppercase tracking-wider font-medium mb-1">
                  {colorMode === 'risk' ? 'Risk level' : 'Community'}
                </div>
                {colorMode === 'risk' ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: '#60a5fa' }}
                      />
                      <span className="text-text-secondary">Institution</span>
                    </div>
                    {(['critical', 'high', 'medium', 'low'] as const).map((level) => (
                      <div key={level} className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: RISK_COLORS[level],
                            boxShadow: level === 'critical' || level === 'high'
                              ? `0 0 5px ${RISK_COLORS[level]}`
                              : 'none',
                          }}
                        />
                        <span className="text-text-secondary capitalize">{level}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  COMMUNITY_PALETTE.slice(0, 5).map((color, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-text-secondary">
                        {i === 0 ? 'Cluster 0' : i < 4 ? `Cluster ${i}` : '+ more…'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Size scale note */}
              <div className="border-t border-border/30 pt-1.5 space-y-1">
                <div className="text-text-muted uppercase tracking-wider font-medium">Node size</div>
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded-full bg-text-muted/40" style={{ width: 8, height: 8 }} />
                  <span className="text-text-muted">Low value</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded-full bg-text-muted/40" style={{ width: 16, height: 16 }} />
                  <span className="text-text-muted">High value</span>
                </div>
              </div>

              {/* Scroll to zoom, drag to pan */}
              <div className="border-t border-border/30 pt-1.5 text-text-muted/60">
                Scroll to zoom · drag to pan
              </div>

              {/* Active risk filter indicator */}
              {filters.riskFilter !== 'all' && (
                <div className="border-t border-border/30 pt-1.5">
                  <div className="flex items-center gap-1 text-amber-400/80">
                    <Eye className="h-3 w-3" />
                    <span className="text-[10px]">
                      {filters.riskFilter === 'critical' ? 'Critical only' : 'High+ visible'}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-muted/50 mt-0.5">other nodes dimmed</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Side panel — always rendered, slide in/out via CSS */}
        <div
          style={{
            transform: selectedNode ? 'translateX(0)' : 'translateX(20px)',
            opacity: selectedNode ? 1 : 0,
            transition: 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease',
            pointerEvents: selectedNode ? 'auto' : 'none',
            flexShrink: 0,
          }}
        >
          {selectedNode && (
            <SidePanel
              node={selectedNode}
              coBidders={coBidders}
              coBiddersLoading={coBiddersLoading}
              onClose={() => setSelectedNode(null)}
              onLoadCoBidders={handleLoadCoBidders}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-[#3b82f6]" />
          {t('legendInstitution')}
        </span>
        {colorMode === 'risk' ? (
          <>
            {(['critical', 'high', 'medium', 'low'] as const).map((level) => (
              <span key={level} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: RISK_COLORS[level] }}
                />
                {t(`legend${level.charAt(0).toUpperCase()}${level.slice(1)}` as `legend${'Critical' | 'High' | 'Medium' | 'Low'}`)}
              </span>
            ))}
          </>
        ) : (
          <>
            {COMMUNITY_PALETTE.slice(0, 6).map((color, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                {i === 0 ? 'Cluster 0 (largest)' : i < 5 ? `Cluster ${i}` : '…more clusters'}
              </span>
            ))}
          </>
        )}
        <span className="text-text-muted">· {t('legendSizeNote')}</span>
      </div>

      {/* ── Network Analytics Panel ─────────────────────────────────────────── */}
      {graphStats && graphData && (
        <div className="rounded-lg border border-border/30 bg-background-elevated/20 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Network Analytics</div>
            {graphStats.highRiskNodeCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{graphStats.highRiskNodeCount} high-risk vendors in this network — use the Risk filter or click red nodes to investigate</span>
              </div>
            )}
          </div>

          {/* Metric grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-md bg-white/5 p-3">
              <div className="text-xs text-text-muted mb-0.5">Nodes</div>
              <div className="text-lg font-bold font-mono tabular-nums">{graphStats.totalNodes}</div>
              <div className="text-[10px] text-text-muted/60 mt-0.5">vendors + institutions</div>
            </div>
            <div className="rounded-md bg-white/5 p-3">
              <div className="text-xs text-text-muted mb-0.5">Connections</div>
              <div className="text-lg font-bold font-mono tabular-nums">{graphStats.edgeCount}</div>
              <div className="text-[10px] text-text-muted/60 mt-0.5">shared procurement links</div>
            </div>
            <div className="rounded-md bg-white/5 p-3">
              <div className="text-xs text-text-muted mb-0.5">Avg Degree</div>
              <div className="text-lg font-bold font-mono tabular-nums">{graphStats.avgDegree.toFixed(1)}</div>
              <div className="text-[10px] text-text-muted/60 mt-0.5">
                {graphStats.avgDegree > 5 ? 'high connectivity — inspect clusters' : 'connections per entity'}
              </div>
            </div>
            <div className={`rounded-md p-3 ${graphStats.highRiskNodeCount > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
              <div className={`text-xs mb-0.5 ${graphStats.highRiskNodeCount > 0 ? 'text-red-400/70' : 'text-text-muted'}`}>
                High-Risk Nodes
              </div>
              <div className={`text-lg font-bold font-mono tabular-nums ${graphStats.highRiskNodeCount > 0 ? 'text-red-400' : 'text-text-primary'}`}>
                {graphStats.highRiskNodeCount}
              </div>
              <div className="text-[10px] text-text-muted/60 mt-0.5">
                {graphStats.highRiskNodeCount > 0 ? 'red/orange glowing nodes' : 'no high-risk nodes'}
              </div>
            </div>
          </div>

          {/* Secondary metrics with plain-language explanations */}
          <div className="flex flex-wrap gap-6 text-xs pt-1 border-t border-border/20">
            {/* Graph density */}
            <div>
              <span className="text-text-muted">Graph density: </span>
              <span className="font-mono text-text-primary">{(graphStats.density * 100).toFixed(2)}%</span>
              <span className="text-text-muted/60 ml-1 text-[10px]">
                {graphStats.density > 0.1
                  ? '(densely connected — elevated collusion risk)'
                  : graphStats.density > 0.03
                  ? '(moderately connected)'
                  : '(sparse — typical for large networks)'}
              </span>
            </div>
            {/* High-risk connections */}
            {graphStats.highRiskConnections > 0 && (
              <div>
                <span className="text-text-muted">High-risk links: </span>
                <span className="font-mono text-red-400">{graphStats.highRiskConnections}</span>
                <span className="text-text-muted/60 ml-1 text-[10px]">(both endpoints are high/critical risk)</span>
              </div>
            )}
            {/* Suspicious clusters from community data */}
            {commData?.graph_ready && commData.total_communities > 0 && (
              <div>
                <span className="text-text-muted">Co-bid clusters: </span>
                <span className="font-mono text-amber-400">{commData.total_communities.toLocaleString()}</span>
                <span className="text-text-muted/60 ml-1 text-[10px]">(vendor groups that bid together frequently — see Community Explorer below)</span>
              </div>
            )}
          </div>

          {/* Top 3 most connected — with interpretation */}
          {graphStats.top3Connected.length > 0 && (
            <div className="pt-1 border-t border-border/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs text-text-muted">Most Connected — hub vendors concentrate procurement relationships</div>
                <span className="text-[10px] text-text-muted/60">(high degree = appeared in many shared tenders)</span>
              </div>
              <div className="space-y-1.5">
                {graphStats.top3Connected.map((n, i) => {
                  const isHighRisk = n.riskScore != null && n.riskScore >= 0.3
                  return (
                    <div key={n.name + i} className={`flex items-center gap-2 rounded px-2 py-1 ${isHighRisk ? 'bg-red-500/5 border border-red-500/10' : ''}`}>
                      <span className="text-xs text-text-muted/60 w-4 font-mono">{i + 1}.</span>
                      <span className="text-xs text-text-primary truncate flex-1">{n.name}</span>
                      <span className="text-xs font-mono text-cyan-400 shrink-0">{n.degree} links</span>
                      {n.riskScore != null && (
                        <span
                          className="text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded"
                          style={{
                            color: n.riskScore >= 0.5 ? '#f87171'
                              : n.riskScore >= 0.3 ? '#fb923c'
                              : n.riskScore >= 0.1 ? '#fbbf24'
                              : '#4ade80',
                            backgroundColor: n.riskScore >= 0.5 ? '#f8717118'
                              : n.riskScore >= 0.3 ? '#fb923c18'
                              : 'transparent',
                          }}
                        >
                          {(n.riskScore * 100).toFixed(0)}% risk
                        </span>
                      )}
                      {isHighRisk && (
                        <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── F7: Community Explorer ──────────────────────────────────────────── */}
      <div className="border border-border/30 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowCommunities(!showCommunities)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-background-elevated/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-text-primary">Community Explorer</span>
            <span className="text-xs text-text-muted">
              Louvain vendor clusters detected via co-bidding graph
            </span>
          </div>
          {showCommunities ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {showCommunities && (
          <div className="px-4 pb-4 pt-2 border-t border-border/20">
            {commLoading && (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}
            {commData && !commLoading && (
              <>
                {!commData.graph_ready && (
                  <p className="text-xs text-text-muted bg-background-elevated/40 rounded p-3 mb-3">
                    Community graph not yet built. Run <code className="font-mono text-accent">python -m scripts.build_vendor_graph</code> to generate communities.
                  </p>
                )}
                {commData.graph_ready && commData.communities.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-4">No communities found.</p>
                )}
                {commData.graph_ready && commData.communities.length > 0 && (
                  <>
                    <div className="mb-3 space-y-2">
                      <p className="text-xs text-text-muted">
                        {commData.total_communities.toLocaleString()} co-bidding clusters detected ·{' '}
                        showing top {commData.communities.length} by size.
                        Click a cluster to center the graph on it.
                      </p>
                      <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400/80">
                        <strong className="text-amber-400">What makes a cluster suspicious?</strong> Vendors in the same cluster
                        bid together in competitive tenders far more often than chance would predict. This can indicate
                        <em> cover bidding</em> (a partner bids high to let the winner win) or <em>bid rotation</em>
                        (vendors take turns winning). Look for clusters with high avg risk and multiple sectors.
                      </div>
                    </div>
                    <div className="space-y-2">
                      {commData.communities.map((comm) => {
                        const commColor = COMMUNITY_PALETTE[comm.community_id % COMMUNITY_PALETTE.length]
                        const riskLevel = getRiskLevelFromScore(comm.avg_risk)
                        return (
                          <div
                            key={comm.community_id}
                            className="flex items-start gap-3 p-3 rounded border border-border/20 hover:border-border/50 hover:bg-background-elevated/20 transition-all cursor-pointer group"
                            onClick={() => {
                              // Load first top vendor as center if available
                              const topVendor = comm.top_vendors?.[0]
                              if (topVendor) {
                                setShowCommunities(false)
                                // Navigate to vendor in graph
                                setCenterEntity({ id: topVendor.vendor_id, entityType: 'vendor', name: topVendor.vendor_name })
                                setColorMode('community')
                              }
                            }}
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                              style={{ backgroundColor: commColor }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono font-medium text-text-primary">
                                  Cluster #{comm.community_id}
                                </span>
                                <span className="text-[11px] text-text-muted">
                                  {comm.size.toLocaleString()} vendors
                                </span>
                                <span
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                  style={{
                                    color: RISK_COLORS[riskLevel],
                                    backgroundColor: `${RISK_COLORS[riskLevel]}18`,
                                  }}
                                >
                                  {(comm.avg_risk * 100).toFixed(1)}% avg risk
                                </span>
                                <span className="text-[11px] text-text-muted">
                                  {comm.sector_count} sector{comm.sector_count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {comm.top_vendors?.length > 0 && (
                                <div className="text-[11px] text-text-muted truncate">
                                  {comm.top_vendors.slice(0, 3).map(v => toTitleCase(v.vendor_name)).join(' · ')}
                                  {comm.top_vendors.length > 3 ? ' · …' : ''}
                                </div>
                              )}
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-text-muted/40 group-hover:text-accent shrink-0 transition-colors mt-0.5" />
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NetworkGraph
