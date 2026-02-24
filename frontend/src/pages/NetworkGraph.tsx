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
import { Network, Search, X, ExternalLink, Users, UserCircle } from 'lucide-react'
import { RiskBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionDescription } from '@/components/SectionDescription'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { RISK_COLORS, getRiskLevelFromScore, SECTORS } from '@/lib/constants'
import { networkApi, vendorApi, institutionApi } from '@/api/client'
import type { NetworkNode, NetworkLink, CoBidderItem } from '@/api/client'
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

function nodeSymbolSize(value: number, nodeType: string): number {
  if (nodeType === 'institution') {
    return clamp(Math.sqrt(value / 1e9) * 20 + 15, 12, 45)
  }
  return clamp(Math.sqrt(value / 1e9) * 25 + 15, 15, 55)
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
    filters.depth !== 1

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
                      <span className="tabular-nums text-text-muted">
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

    const nodes = graphData.nodes.map((node: NetworkNode) => {
      const isCenter = node.id === centerNodeId
      const symbolSize = isCenter ? 65 : nodeSymbolSize(node.value, node.type)
      const itemColor =
        node.type === 'institution'
          ? '#3b82f6'
          : colorMode === 'community' && node.community_id != null
            ? communityToColor(node.community_id)
            : riskToColor(node.risk_score)
      const showLabel = isCenter || symbolSize > 25

      return {
        id: node.id,
        name: node.name,
        value: node.value,
        contracts: node.contracts,
        risk_score: node.risk_score,
        node_type: node.type,
        // Store the full raw node for the side panel
        extra: node,
        symbolSize,
        itemStyle: {
          color: itemColor,
          borderColor: isCenter ? '#ffffff' : undefined,
          borderWidth: isCenter ? 3 : 0,
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
  }, [graphData, centerEntity, colorMode])

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
      </div>
      </ScrollReveal>

      {/* Main content: graph + side panel */}
      <div className="flex border border-border rounded-md overflow-hidden" style={{ height: '620px' }}>
        {/* Graph area */}
        <div className="flex-1 relative min-w-0">
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
              </div>
              <div className="w-full max-w-sm text-center">
                <p className="text-xs text-text-muted mb-2 uppercase tracking-wider font-medium">{t('examplesLabel')}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { name: 'IMSS', type: 'institution' as const },
                    { name: 'Pisa Farmacéutica', type: 'vendor' as const },
                    { name: 'Secretaría de Comunicaciones y Transportes', type: 'institution' as const },
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
              option={option}
              style={{ height: '100%', width: '100%' }}
              onEvents={handleGraphEvents}
              opts={{ renderer: 'svg' }}
            />
          )}

          {/* Hint overlay — shown when graph is loaded */}
          {!isLoading && !isEmpty && graphData && centerEntity && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="bg-background-card/90 border border-border rounded px-3 py-1.5 text-xs text-text-muted text-center backdrop-blur-sm">
                {t('clickNodeHint')}
              </div>
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
    </div>
  )
}

export default NetworkGraph
