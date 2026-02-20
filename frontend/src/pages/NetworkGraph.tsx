/**
 * Network Explorer Page — Graph-First Layout
 * Force-directed graph as the primary experience, with a side panel for node details.
 * Replaces the previous 3-level accordion tree (Sectors → Institutions → Vendors).
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Network, Search, X, ExternalLink, Users } from 'lucide-react'
import { RiskBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionDescription } from '@/components/SectionDescription'
import { formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { RISK_COLORS, getRiskLevelFromScore, SECTORS } from '@/lib/constants'
import { networkApi, vendorApi, institutionApi } from '@/api/client'
import type { NetworkNode, NetworkLink, CoBidderItem } from '@/api/client'

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
  const hasActive =
    filters.sectorId !== undefined ||
    filters.year !== undefined ||
    filters.minContracts !== 10 ||
    filters.depth !== 1

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {/* Sector */}
      <div className="flex items-center gap-1.5">
        <label className="text-text-muted shrink-0">Sector:</label>
        <select
          value={filters.sectorId ?? ''}
          onChange={(e) =>
            onChange({ sectorId: e.target.value ? Number(e.target.value) : undefined })
          }
          className="h-7 pl-2 pr-6 rounded border border-border bg-background-card text-xs focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All sectors</option>
          {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameEN}
            </option>
          ))}
        </select>
      </div>

      {/* Year */}
      <div className="flex items-center gap-1.5">
        <label className="text-text-muted shrink-0">Year:</label>
        <select
          value={filters.year ?? ''}
          onChange={(e) =>
            onChange({ year: e.target.value ? Number(e.target.value) : undefined })
          }
          className="h-7 pl-2 pr-6 rounded border border-border bg-background-card text-xs focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All years</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Min contracts */}
      <div className="flex items-center gap-1.5">
        <label className="text-text-muted shrink-0">Min contracts:</label>
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
        <label className="text-text-muted shrink-0">Depth:</label>
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
          aria-label="Reset filters"
        >
          <X className="h-3 w-3" />
          Reset
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
}: {
  onSelect: (suggestion: SearchSuggestion) => void
}) {
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
        placeholder="Search vendor or institution to center graph..."
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
                {s.entityType === 'vendor' ? 'Vendor' : 'Institution'}
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
  const isVendor = node.type === 'vendor'
  // Node IDs are like "v-123" or "i-456"
  const numericId = parseInt(node.id.slice(2), 10)
  const profileLink = isVendor ? `/vendors/${numericId}` : `/institutions/${numericId}`

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
            {isVendor ? 'Vendor' : 'Institution'}
          </div>
          <h3 className="text-sm font-semibold leading-snug" title={node.name}>
            {toTitleCase(node.name)}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-text-muted hover:text-text-primary mt-0.5"
          aria-label="Close side panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        {/* Risk badge */}
        {node.risk_score != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Risk score</span>
            <RiskBadge score={node.risk_score} className="text-xs" />
          </div>
        )}

        {/* Contract count and value */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-background-elevated p-2">
            <div className="text-text-muted mb-0.5">Contracts</div>
            <div className="font-semibold tabular-nums">{formatNumber(node.contracts)}</div>
          </div>
          <div className="rounded bg-background-elevated p-2">
            <div className="text-text-muted mb-0.5">Value</div>
            <div className="font-semibold tabular-nums">{formatCompactMXN(node.value)}</div>
          </div>
        </div>

        {/* Profile link */}
        <Link
          to={profileLink}
          className="flex items-center gap-1.5 text-xs text-accent hover:underline"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          View full profile
        </Link>

        {/* Co-bidders section (vendors only) */}
        {isVendor && (
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Co-bidders</span>
              {!coBidders && !coBiddersLoading && (
                <button
                  onClick={() => onLoadCoBidders(numericId)}
                  className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1 hover:border-accent hover:text-accent transition-colors"
                >
                  <Users className="h-3 w-3" />
                  Find
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
              <p className="text-xs text-text-muted italic">No co-bidders found.</p>
            )}

            {coBidders && coBidders.length > 0 && (
              <div className="space-y-1.5">
                {coBidders.slice(0, 8).map((cb) => (
                  <div
                    key={cb.vendor_id}
                    className="flex items-center justify-between gap-2 text-xs"
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
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS)
  const [centerEntity, setCenterEntity] = useState<CenterEntity | null>(null)
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [coBidders, setCoBidders] = useState<CoBidderItem[] | null>(null)
  const [coBiddersLoading, setCoBiddersLoading] = useState(false)

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
        node.type === 'institution' ? '#3b82f6' : riskToColor(node.risk_score)
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
  }, [graphData, centerEntity])

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
      {/* Page header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Network className="h-4.5 w-4.5 text-accent" />
          Network Explorer
        </h2>
        {graphData && (
          <p className="text-xs text-text-muted mt-0.5">
            {graphData.total_nodes} nodes · {graphData.total_links} connections
            {centerEntity && ` · centered on ${toTitleCase(centerEntity.name)}`}
          </p>
        )}
      </div>

      <SectionDescription>
        Force-directed graph of vendor and institution relationships. Search for a specific entity
        to center the graph on it, or browse the default top connections. Click any node to open
        its detail panel.
      </SectionDescription>

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
        <SearchBar onSelect={handleSearchSelect} />
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

      <FiltersBar filters={filters} onChange={patchFilters} onReset={resetFilters} />

      {/* Main content: graph + side panel */}
      <div className="flex border border-border rounded-md overflow-hidden" style={{ height: '620px' }}>
        {/* Graph area */}
        <div className="flex-1 relative min-w-0">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background-card z-10">
              <Network className="h-8 w-8 text-accent animate-pulse" />
              <p className="text-sm text-text-muted">Loading network...</p>
            </div>
          )}

          {isEmpty && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background-card">
              <Network className="h-10 w-10 opacity-30" />
              <p className="text-sm text-text-muted">No connections found for these filters.</p>
              <button
                onClick={resetFilters}
                className="text-xs text-accent hover:underline"
              >
                Reset filters
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

          {/* Default hint overlay — shown when no entity is centered */}
          {!isLoading && !isEmpty && graphData && !centerEntity && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="bg-background-card/90 border border-border rounded px-3 py-1.5 text-xs text-text-muted text-center backdrop-blur-sm">
                Click any node to explore its connections. Search above to center on a specific entity.
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-[#3b82f6]" />
          Institution
        </span>
        {(['critical', 'high', 'medium', 'low'] as const).map((level) => (
          <span key={level} className="flex items-center gap-1.5 capitalize">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: RISK_COLORS[level] }}
            />
            {level} vendor
          </span>
        ))}
        <span className="text-text-muted">· Node size = contract value · Edge width = contract count</span>
      </div>
    </div>
  )
}

export default NetworkGraph
