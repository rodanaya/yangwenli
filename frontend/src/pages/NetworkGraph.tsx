/**
 * Network Explorer Page
 * Hierarchical tree: Sectors -> Institutions -> Vendors
 * Lazy-loaded at each level with search and risk filtering
 */

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { SectionDescription } from '@/components/SectionDescription'
import { formatCompactMXN, formatNumber, toTitleCase, cn } from '@/lib/utils'
import { SECTORS, SECTOR_COLORS, SECTOR_NAMES_EN, getRiskLevelFromScore } from '@/lib/constants'
import { sectorApi, institutionApi } from '@/api/client'
import type { SectorStatistics, InstitutionResponse, InstitutionVendorItem } from '@/api/types'
import {
  ChevronRight,
  Search,
  ShieldAlert,
  Network,
  Building2,
  Users,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SelectedNode {
  type: 'sector' | 'institution' | 'vendor'
  id: number
  name: string
  data?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Chevron component (animated rotation)
// ---------------------------------------------------------------------------

function ExpandChevron({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <ChevronRight
      className={cn(
        'h-4 w-4 shrink-0 text-text-muted transition-transform duration-150',
        expanded && 'rotate-90',
        className,
      )}
    />
  )
}

// ---------------------------------------------------------------------------
// Inline loading spinner for lazy rows
// ---------------------------------------------------------------------------

function RowSpinner() {
  return (
    <div className="flex items-center gap-2 py-2 pl-12 text-xs text-text-muted">
      <Loader2 className="h-3 w-3 animate-spin" />
      Loading...
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vendor row (Level 2)
// ---------------------------------------------------------------------------

function VendorRow({
  vendor,
  onSelect,
  isSelected,
  matchesSearch,
}: {
  vendor: InstitutionVendorItem
  onSelect: (node: SelectedNode) => void
  isSelected: boolean
  matchesSearch: boolean
}) {
  const riskLevel = vendor.avg_risk_score != null ? getRiskLevelFromScore(vendor.avg_risk_score) : null
  const isHighRisk = riskLevel === 'high' || riskLevel === 'critical'

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-1.5 pl-16 pr-4 text-xs border-l-2 border-transparent transition-colors',
        isSelected && 'bg-accent/10 border-l-accent',
        !isSelected && 'hover:bg-background-elevated/50',
        !matchesSearch && 'opacity-40',
      )}
    >
      <Users className="h-3 w-3 shrink-0 text-text-muted" />
      <button
        onClick={() =>
          onSelect({
            type: 'vendor',
            id: vendor.vendor_id,
            name: vendor.vendor_name,
            data: vendor as unknown as Record<string, unknown>,
          })
        }
        className="truncate text-left hover:text-accent transition-colors"
        title={toTitleCase(vendor.vendor_name)}
      >
        {toTitleCase(vendor.vendor_name)}
      </button>
      <span className="ml-auto shrink-0 tabular-nums text-text-muted">
        {formatNumber(vendor.contract_count)}
      </span>
      <span className="shrink-0 tabular-nums text-text-muted w-20 text-right">
        {formatCompactMXN(vendor.total_value_mxn)}
      </span>
      {vendor.avg_risk_score != null && (
        <RiskBadge
          score={vendor.avg_risk_score}
          className={cn('text-xs px-1.5 py-0', !isHighRisk && 'opacity-60')}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Institution row (Level 1) + lazy vendor children
// ---------------------------------------------------------------------------

function InstitutionRow({
  inst,
  expandedInstitutions,
  toggleInstitution,
  onSelect,
  selectedNode,
  searchQuery,
}: {
  inst: InstitutionResponse
  expandedInstitutions: Set<number>
  toggleInstitution: (id: number) => void
  onSelect: (node: SelectedNode) => void
  selectedNode: SelectedNode | null
  searchQuery: string
}) {
  const isExpanded = expandedInstitutions.has(inst.id)
  const isSelected = selectedNode?.type === 'institution' && selectedNode?.id === inst.id
  const query = searchQuery.toLowerCase()
  const matchesSearch = !query || inst.name.toLowerCase().includes(query)

  // Lazy load vendors when institution is expanded
  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['institution-vendors-tree', inst.id],
    queryFn: () => institutionApi.getVendors(inst.id, 30),
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  })

  const vendors = vendorsData?.data ?? []

  // If search active, check if any vendors match
  const matchingVendors = query
    ? vendors.filter((v) => v.vendor_name.toLowerCase().includes(query))
    : vendors

  // high_risk_percentage may be returned even for list items depending on backend
  const highRiskPct = (inst as unknown as Record<string, unknown>).high_risk_percentage as number | undefined
  const hasHighRisk = highRiskPct != null && highRiskPct > 15

  return (
    <div>
      {/* Institution header row */}
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 pl-10 pr-4 text-xs border-l-2 border-transparent transition-colors cursor-pointer',
          isSelected && 'bg-accent/10 border-l-accent',
          !isSelected && 'hover:bg-background-elevated/50',
          !matchesSearch && !query && '',
          !matchesSearch && query && matchingVendors.length === 0 && 'opacity-40',
        )}
      >
        <button
          onClick={() => toggleInstitution(inst.id)}
          className="shrink-0 p-0.5 -m-0.5 rounded hover:bg-background-elevated"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <ExpandChevron expanded={isExpanded} />
        </button>
        <Building2 className="h-3 w-3 shrink-0 text-text-muted" />
        <button
          onClick={() =>
            onSelect({
              type: 'institution',
              id: inst.id,
              name: inst.name,
              data: inst as unknown as Record<string, unknown>,
            })
          }
          className="truncate text-left hover:text-accent transition-colors font-medium"
          title={toTitleCase(inst.name)}
        >
          {toTitleCase(inst.name)}
        </button>
        {inst.siglas && (
          <span className="shrink-0 text-text-muted">({inst.siglas})</span>
        )}
        <span className="ml-auto shrink-0 tabular-nums text-text-muted">
          {inst.total_contracts != null ? formatNumber(inst.total_contracts) : '-'}
        </span>
        <span className="shrink-0 tabular-nums text-text-muted w-20 text-right">
          {inst.total_amount_mxn != null ? formatCompactMXN(inst.total_amount_mxn) : '-'}
        </span>
        {hasHighRisk && (
          <ShieldAlert className="h-3 w-3 shrink-0 text-risk-high" aria-label="High risk concentration" />
        )}
      </div>

      {/* Vendor children */}
      {isExpanded && (
        <div>
          {vendorsLoading ? (
            <RowSpinner />
          ) : vendors.length === 0 ? (
            <div className="py-1.5 pl-16 text-xs text-text-muted italic">
              No vendor data available
            </div>
          ) : (
            (query ? matchingVendors : vendors).map((vendor) => (
              <VendorRow
                key={vendor.vendor_id}
                vendor={vendor}
                onSelect={onSelect}
                isSelected={selectedNode?.type === 'vendor' && selectedNode?.id === vendor.vendor_id}
                matchesSearch={!query || vendor.vendor_name.toLowerCase().includes(query)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sector row (Level 0) + lazy institution children
// ---------------------------------------------------------------------------

function SectorRow({
  sector,
  expandedSectors,
  toggleSector,
  expandedInstitutions,
  toggleInstitution,
  onSelect,
  selectedNode,
  searchQuery,
  showHighRiskOnly,
}: {
  sector: SectorStatistics
  expandedSectors: Set<number>
  toggleSector: (id: number) => void
  expandedInstitutions: Set<number>
  toggleInstitution: (id: number) => void
  onSelect: (node: SelectedNode) => void
  selectedNode: SelectedNode | null
  searchQuery: string
  showHighRiskOnly: boolean
}) {
  const isExpanded = expandedSectors.has(sector.sector_id)
  const isSelected = selectedNode?.type === 'sector' && selectedNode?.id === sector.sector_id
  const sectorCode = sector.sector_code
  const color = SECTOR_COLORS[sectorCode] ?? '#64748b'
  const nameEN = SECTOR_NAMES_EN[sectorCode] ?? sectorCode
  const highRiskPct = sector.high_risk_pct ?? 0

  // Skip sector if risk filter is on and it has low risk
  if (showHighRiskOnly && highRiskPct < 5) return null

  // Lazy load institutions when sector is expanded
  const { data: institutionsData, isLoading: institutionsLoading } = useQuery({
    queryKey: ['sector-institutions-tree', sector.sector_id],
    queryFn: () =>
      institutionApi.getAll({
        sector_id: sector.sector_id,
        per_page: 50,
        sort_by: 'total_amount_mxn',
        sort_order: 'desc',
      }),
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  })

  const institutions = institutionsData?.data ?? []
  const query = searchQuery.toLowerCase()

  // Filter institutions by search query
  const filteredInstitutions = query
    ? institutions.filter((inst) => inst.name.toLowerCase().includes(query))
    : institutions

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Sector header row */}
      <div
        className={cn(
          'flex items-center gap-3 py-2.5 pl-4 pr-4 text-sm transition-colors cursor-pointer',
          isSelected && 'bg-accent/10',
          !isSelected && 'hover:bg-background-elevated/30',
        )}
        style={{ borderLeft: `3px solid ${color}` }}
      >
        <button
          onClick={() => toggleSector(sector.sector_id)}
          className="shrink-0 p-0.5 -m-0.5 rounded hover:bg-background-elevated"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <ExpandChevron expanded={isExpanded} />
        </button>
        <button
          onClick={() =>
            onSelect({
              type: 'sector',
              id: sector.sector_id,
              name: nameEN,
              data: sector as unknown as Record<string, unknown>,
            })
          }
          className="font-semibold text-text-primary hover:text-accent transition-colors text-left"
        >
          {nameEN}
        </button>
        <span className="text-xs text-text-muted">
          {formatNumber(sector.total_contracts)} contracts
        </span>
        <span className="text-xs text-text-muted">
          {formatCompactMXN(sector.total_value_mxn)}
        </span>
        <span className="ml-auto text-xs tabular-nums">
          {highRiskPct > 10 ? (
            <span className="text-risk-high font-medium">
              <ShieldAlert className="h-3 w-3 inline mr-0.5 -mt-0.5" />
              {highRiskPct.toFixed(1)}% high risk
            </span>
          ) : (
            <span className="text-text-muted">{highRiskPct.toFixed(1)}% high risk</span>
          )}
        </span>
      </div>

      {/* Institution children */}
      {isExpanded && (
        <div className="bg-background-elevated/20">
          {institutionsLoading ? (
            <RowSpinner />
          ) : institutions.length === 0 ? (
            <div className="py-2 pl-12 text-xs text-text-muted italic">
              No institutions found
            </div>
          ) : filteredInstitutions.length === 0 ? (
            <div className="py-2 pl-12 text-xs text-text-muted italic">
              No institutions match "{searchQuery}"
            </div>
          ) : (
            filteredInstitutions.map((inst) => (
              <InstitutionRow
                key={inst.id}
                inst={inst}
                expandedInstitutions={expandedInstitutions}
                toggleInstitution={toggleInstitution}
                onSelect={onSelect}
                selectedNode={selectedNode}
                searchQuery={searchQuery}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Detail panel (sidebar)
// ---------------------------------------------------------------------------

function DetailPanel({
  node,
  onClose,
}: {
  node: SelectedNode
  onClose: () => void
}) {
  const data = node.data ?? {}

  const profileLink =
    node.type === 'vendor'
      ? `/vendors/${node.id}`
      : node.type === 'institution'
        ? `/institutions/${node.id}`
        : `/sectors`

  return (
    <Card className="border-accent/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm truncate">{toTitleCase(node.name)}</CardTitle>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary shrink-0"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs uppercase tracking-wider text-text-muted">{node.type}</span>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {/* Sector detail */}
        {node.type === 'sector' && (
          <>
            <StatRow label="Total contracts" value={formatNumber((data.total_contracts as number) ?? 0)} />
            <StatRow label="Total value" value={formatCompactMXN((data.total_value_mxn as number) ?? 0)} />
            <StatRow label="Vendors" value={formatNumber((data.total_vendors as number) ?? 0)} />
            <StatRow label="Institutions" value={formatNumber((data.total_institutions as number) ?? 0)} />
            <StatRow label="Avg risk" value={`${(((data.avg_risk_score as number) ?? 0) * 100).toFixed(1)}%`} />
            <StatRow label="Direct awards" value={`${((data.direct_award_pct as number) ?? 0).toFixed(1)}%`} />
            <StatRow label="Single bids" value={`${((data.single_bid_pct as number) ?? 0).toFixed(1)}%`} />
          </>
        )}

        {/* Institution detail */}
        {node.type === 'institution' && (
          <>
            {(data.siglas as string) && (
              <StatRow label="Acronym" value={data.siglas as string} />
            )}
            <StatRow label="Type" value={toTitleCase((data.institution_type as string) ?? '-')} />
            <StatRow label="Contracts" value={formatNumber((data.total_contracts as number) ?? 0)} />
            <StatRow label="Value" value={formatCompactMXN((data.total_amount_mxn as number) ?? 0)} />
            {(data.high_risk_percentage as number) != null && (
              <StatRow label="High risk" value={`${((data.high_risk_percentage as number) ?? 0).toFixed(1)}%`} />
            )}
          </>
        )}

        {/* Vendor detail */}
        {node.type === 'vendor' && (
          <>
            <StatRow label="Contracts" value={formatNumber((data.contract_count as number) ?? 0)} />
            <StatRow label="Value" value={formatCompactMXN((data.total_value_mxn as number) ?? 0)} />
            {(data.avg_risk_score as number) != null && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Risk</span>
                <RiskBadge score={(data.avg_risk_score as number) ?? 0} className="text-xs" />
              </div>
            )}
            {(data.rfc as string) && <StatRow label="RFC" value={data.rfc as string} />}
          </>
        )}

        <Link
          to={profileLink}
          className="flex items-center gap-1.5 mt-3 text-accent hover:underline text-xs"
        >
          <ExternalLink className="h-3 w-3" />
          View full profile
        </Link>
      </CardContent>
    </Card>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function NetworkGraph() {
  // State
  const [expandedSectors, setExpandedSectors] = useState<Set<number>>(new Set())
  const [expandedInstitutions, setExpandedInstitutions] = useState<Set<number>>(new Set())
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showHighRiskOnly, setShowHighRiskOnly] = useState(false)

  // Fetch all sectors (always loaded)
  const { data: sectorsData, isLoading: sectorsLoading } = useQuery({
    queryKey: ['sectors-tree'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })

  const sectors = useMemo(() => {
    if (!sectorsData?.data) return []
    // Sort by total_value_mxn descending
    return [...sectorsData.data].sort((a, b) => b.total_value_mxn - a.total_value_mxn)
  }, [sectorsData])

  // Toggle helpers
  const toggleSector = useCallback((id: number) => {
    setExpandedSectors((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleInstitution = useCallback((id: number) => {
    setExpandedInstitutions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // When search changes, auto-expand sectors that match
  const filteredSectors = useMemo(() => {
    if (!searchQuery) return sectors
    const q = searchQuery.toLowerCase()
    return sectors.filter((s) => {
      const nameEN = SECTOR_NAMES_EN[s.sector_code] ?? ''
      return (
        nameEN.toLowerCase().includes(q) ||
        s.sector_code.toLowerCase().includes(q) ||
        s.sector_name.toLowerCase().includes(q)
      )
    })
  }, [sectors, searchQuery])

  // Stats summary
  const totalContracts = sectorsData?.total_contracts ?? 0
  const totalValue = sectorsData?.total_value_mxn ?? 0
  const expandedCount = expandedSectors.size + expandedInstitutions.size

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Network className="h-4.5 w-4.5 text-accent" />
            Network Explorer
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {formatNumber(totalContracts)} contracts across {sectors.length} sectors ({formatCompactMXN(totalValue)})
          </p>
        </div>
      </div>

      <SectionDescription>
        Explore the procurement network as a hierarchy: sectors, institutions, and vendors.
        Expand any level to see relationships. Click an entity name to view details in the
        side panel.
      </SectionDescription>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search sectors, institutions, vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-8 text-xs rounded-md border border-border bg-background-card focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Button
          variant={showHighRiskOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowHighRiskOnly(!showHighRiskOnly)}
          className="text-xs"
        >
          <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
          High risk only
        </Button>

        {expandedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setExpandedSectors(new Set())
              setExpandedInstitutions(new Set())
            }}
            className="text-xs"
          >
            Collapse all
          </Button>
        )}
      </div>

      {/* Main content */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Tree */}
        <Card>
          <CardContent className="p-0">
            {sectorsLoading ? (
              <div className="space-y-1 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : filteredSectors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                <Network className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No sectors match your filters</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs text-accent hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {(searchQuery ? filteredSectors : sectors).map((sector) => (
                  <SectorRow
                    key={sector.sector_id}
                    sector={sector}
                    expandedSectors={expandedSectors}
                    toggleSector={toggleSector}
                    expandedInstitutions={expandedInstitutions}
                    toggleInstitution={toggleInstitution}
                    onSelect={setSelectedNode}
                    selectedNode={selectedNode}
                    searchQuery={searchQuery}
                    showHighRiskOnly={showHighRiskOnly}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {selectedNode ? (
            <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="text-center text-text-muted py-6">
                  <Network className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Click a sector, institution, or vendor to see details</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">How to use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-text-muted">
              <div className="flex items-start gap-2">
                <ExpandChevron expanded={false} className="h-3 w-3 mt-0.5" />
                <span>Click the arrow to expand/collapse levels</span>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Click a name to see details and link to its profile</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0 text-risk-high" />
                <span>Shield icon marks entities with elevated risk concentration</span>
              </div>
            </CardContent>
          </Card>

          {/* Sector color reference */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Sectors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {SECTORS.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-text-secondary">{s.nameEN}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default NetworkGraph
