/**
 * Follow the Money — Procurement Fund Flow Analysis
 *
 * Traces the flow of public procurement funds from institutions through
 * sectors to vendors. Visualizes where the money goes and highlights
 * high-risk flows that warrant investigation.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { SectionDescription } from '@/components/SectionDescription'
import { cn, formatCompactMXN, formatNumber, getRiskLevel, toTitleCase } from '@/lib/utils'
import { SECTORS, SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import { PageHero, StatCard as SharedStatCard } from '@/components/DashboardWidgets'
import type { MoneyFlowItem } from '@/api/types'
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Treemap,
} from '@/components/charts'
import {
  Banknote,
  AlertTriangle,
  Building2,
  Users,
  ArrowRight,
  TrendingUp,
  Filter,
  ExternalLink,
} from 'lucide-react'

// =============================================================================
// Helpers
// =============================================================================

/** Map a risk score (0-1) to a color on a gradient from green through amber to red */
function riskToColor(risk: number | null): string {
  if (risk == null) return '#64748b'
  const level = getRiskLevel(risk)
  return RISK_COLORS[level]
}

/** Truncate a name for chart axis labels */
function truncateName(name: string, maxLen = 22): string {
  const titled = toTitleCase(name)
  if (titled.length <= maxLen) return titled
  return titled.slice(0, maxLen - 1).trimEnd() + '\u2026'
}

/** Custom tooltip for horizontal bar charts */
function FlowBarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; contracts: number; avg_risk: number | null } }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card p-3 shadow-xl text-xs space-y-1">
      <p className="font-medium text-text-primary text-sm">{toTitleCase(d.name)}</p>
      <p className="text-text-secondary">Value: <span className="text-text-primary font-medium">{formatCompactMXN(d.value)}</span></p>
      <p className="text-text-secondary">Contracts: <span className="text-text-primary font-medium">{formatNumber(d.contracts)}</span></p>
      {d.avg_risk != null && (
        <p className="text-text-secondary">
          Avg Risk: <span className="font-medium" style={{ color: riskToColor(d.avg_risk) }}>{(d.avg_risk * 100).toFixed(1)}%</span>
        </p>
      )}
    </div>
  )
}

/** Custom tooltip for treemap */
function TreemapTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; contracts: number; sectorCode: string } }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card p-3 shadow-xl text-xs space-y-1">
      <p className="font-medium text-text-primary text-sm">{d.name}</p>
      <p className="text-text-secondary">Value: <span className="text-text-primary font-medium">{formatCompactMXN(d.value)}</span></p>
      <p className="text-text-secondary">Contracts: <span className="text-text-primary font-medium">{formatNumber(d.contracts)}</span></p>
    </div>
  )
}

/** Calculate text color based on background luminance */
function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1a1f2e' : '#e2e8f0'
}

// Custom treemap content renderer
function TreemapContent(props: {
  x: number; y: number; width: number; height: number;
  name: string; fill: string; value: number;
}) {
  const { x, y, width, height, name, fill, value } = props
  const showLabel = width > 60 && height > 30
  const showValue = width > 60 && height > 45
  const textColor = getTextColor(fill)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#1a1f2e" strokeWidth={2} rx={4} />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 + (showValue ? -7 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-xs font-medium"
          fill={textColor}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {name}
        </text>
      )}
      {showValue && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 9}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-xs"
          fill={textColor}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)', opacity: 0.8 }}
        >
          {formatCompactMXN(value)}
        </text>
      )}
    </g>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function MoneyFlow() {
  const navigate = useNavigate()
  const [selectedSector, setSelectedSector] = useState<number | ''>('')
  const [selectedYear, setSelectedYear] = useState<number | ''>(2024)

  // ---- Data fetch ----
  const { data: flowData, isLoading, isError } = useQuery({
    queryKey: ['money-flow', selectedSector, selectedYear],
    queryFn: () =>
      analysisApi.getMoneyFlow(
        selectedYear || undefined,
        selectedSector || undefined,
      ),
    staleTime: 5 * 60 * 1000,
  })

  // ---- Derived data ----
  const { institutionFlows, vendorFlows, sectorAgg, riskWeightedValue, highRiskFlows } = useMemo(() => {
    if (!flowData?.flows) {
      return { institutionFlows: [], vendorFlows: [], sectorAgg: [], riskWeightedValue: 0, highRiskFlows: [] }
    }

    const instFlows = flowData.flows
      .filter((f: MoneyFlowItem) => f.source_type === 'institution')
      .sort((a: MoneyFlowItem, b: MoneyFlowItem) => b.value - a.value)
      .slice(0, 15)
      .map((f: MoneyFlowItem) => ({
        name: truncateName(f.source_name),
        fullName: toTitleCase(f.source_name),
        value: f.value,
        contracts: f.contracts,
        avg_risk: f.avg_risk,
        id: f.source_id,
      }))

    const vFlows = flowData.flows
      .filter((f: MoneyFlowItem) => f.target_type === 'vendor')
      .sort((a: MoneyFlowItem, b: MoneyFlowItem) => b.value - a.value)
      .slice(0, 15)
      .map((f: MoneyFlowItem) => ({
        name: truncateName(f.target_name),
        fullName: toTitleCase(f.target_name),
        value: f.value,
        contracts: f.contracts,
        avg_risk: f.avg_risk,
        id: f.target_id,
      }))

    // Aggregate by sector for treemap
    const sectorMap = new Map<number, { value: number; contracts: number }>()
    for (const f of flowData.flows) {
      // Use source_id for sector flows, or target_id if target is a sector
      const sectorId = f.source_type === 'sector' ? f.source_id : (f.target_type === 'sector' ? f.target_id : null)
      if (sectorId != null) {
        const existing = sectorMap.get(sectorId) || { value: 0, contracts: 0 }
        existing.value += f.value
        existing.contracts += f.contracts
        sectorMap.set(sectorId, existing)
      }
    }
    const sectorAggData = SECTORS
      .filter(s => sectorMap.has(s.id))
      .map(s => {
        const agg = sectorMap.get(s.id)!
        return {
          name: s.nameEN,
          sectorCode: s.code,
          sectorId: s.id,
          value: agg.value,
          contracts: agg.contracts,
          fill: SECTOR_COLORS[s.code] || '#64748b',
        }
      })
      .sort((a, b) => b.value - a.value)

    // Risk-weighted value: sum of flows where avg_risk >= 0.3
    const rwv = flowData.flows.reduce((sum: number, f: MoneyFlowItem) => {
      if (f.avg_risk != null && f.avg_risk >= 0.3) return sum + f.value
      return sum
    }, 0)

    // High-risk flows sorted by avg_risk desc
    const hrFlows = [...flowData.flows]
      .filter((f: MoneyFlowItem) => f.avg_risk != null && f.avg_risk > 0)
      .sort((a: MoneyFlowItem, b: MoneyFlowItem) => (b.avg_risk ?? 0) - (a.avg_risk ?? 0))
      .slice(0, 20)

    return {
      institutionFlows: instFlows,
      vendorFlows: vFlows,
      sectorAgg: sectorAggData,
      riskWeightedValue: rwv,
      highRiskFlows: hrFlows,
    }
  }, [flowData])

  // ---- Empty state check ----
  const hasNoData = !isLoading && !isError && flowData &&
    (!flowData.flows?.length || flowData.total_value === 0)

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><Skeleton className="h-5 w-48" /></CardHeader><CardContent><ChartSkeleton height={350} /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-5 w-48" /></CardHeader><CardContent><ChartSkeleton height={350} /></CardContent></Card>
        </div>
        <Card><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent><ChartSkeleton height={300} type="pie" /></CardContent></Card>
      </div>
    )
  }

  // ---- Error state ----
  if (isError || !flowData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Follow the Money</h1>
          <p className="text-sm text-text-secondary mt-1">Tracing the flow of public procurement funds from institutions to vendors</p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-risk-high mx-auto mb-3" />
            <p className="text-text-primary font-medium">Failed to load money flow data</p>
            <p className="text-text-muted text-sm mt-1">Please check that the backend is running and try again.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- Filter controls (shared between hero and empty state) ----
  const filterControls = (
    <div className="flex items-center gap-3 flex-wrap">
      <Filter className="h-3.5 w-3.5 text-text-muted shrink-0" aria-hidden="true" />
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
        className="h-8 rounded-md border border-border bg-background-elevated px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        aria-label="Filter by year"
      >
        <option value="">All Years</option>
        {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <select
        value={selectedSector}
        onChange={(e) => setSelectedSector(e.target.value ? Number(e.target.value) : '')}
        className="h-8 rounded-md border border-border bg-background-elevated px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        aria-label="Filter by sector"
      >
        <option value="">All Sectors</option>
        {SECTORS.map(s => (
          <option key={s.id} value={s.id}>{s.nameEN}</option>
        ))}
      </select>
    </div>
  )

  // ---- Empty data state (filters returned no results) ----
  if (hasNoData) {
    return (
      <div className="space-y-6">
        <PageHero
          trackingLabel="FUND FLOW ANALYSIS"
          icon={<Banknote className="h-4 w-4 text-accent" />}
          headline="No Data"
          subtitle="Adjust filters to load fund flow data"
          detail="Select a year and sector to trace how government spending flows from institutions through sectors to vendors."
          trailing={filterControls}
        />
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Filter className="h-8 w-8 text-text-muted mx-auto" />
            <p className="font-medium text-text-primary">No fund flow data for this combination</p>
            <p className="text-sm text-text-muted">
              Try selecting a specific year or sector. The money flow analysis aggregates
              institution-to-vendor relationships and requires contract data with both
              institution and vendor records.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* Header                                                              */}
      {/* ================================================================== */}
      <PageHero
        trackingLabel="FUND FLOW ANALYSIS"
        icon={<Banknote className="h-4 w-4 text-accent" />}
        headline={formatCompactMXN(flowData.total_value)}
        subtitle={`${formatNumber(flowData.total_contracts)} contracts tracked${selectedYear ? ` in ${selectedYear}` : ''}`}
        detail="Select a year and sector to trace how government spending flows from institutions through sectors to vendors, highlighting high-risk channels."
        trailing={filterControls}
      />

      {/* L1: Overview Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <SharedStatCard
          label="TOTAL CONTRACTS"
          value={formatNumber(flowData.total_contracts)}
          detail="Across all institutions"
          color="text-accent"
          borderColor="border-accent/30"
        />
        <SharedStatCard
          label="HIGH-RISK FLOWS"
          value={formatCompactMXN(riskWeightedValue)}
          detail="Flows with avg risk ≥ 30%"
          color="text-risk-critical"
          borderColor="border-risk-critical/30"
        />
        <SharedStatCard
          label="INSTITUTIONS"
          value={formatNumber(institutionFlows.length)}
          detail="Top spending entities"
          color="text-text-primary"
          borderColor="border-text-muted/20"
        />
      </div>

      {/* ================================================================== */}
      {/* L2 + L3: Institution and Vendor Charts                              */}
      {/* ================================================================== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Institution Flows */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-text-muted" aria-hidden="true" />
              Top Spending Institutions
            </CardTitle>
            <CardDescription>Top 15 institutions by total procurement value</CardDescription>
          </CardHeader>
          <CardContent>
            {institutionFlows.length === 0 ? (
              <div className="flex items-center justify-center h-[350px] text-text-muted text-sm">
                No institution flow data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  layout="vertical"
                  data={institutionFlows}
                  margin={{ top: 4, right: 16, bottom: 4, left: 160 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatCompactMXN(v)}
                    tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<FlowBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                    onClick={(_data: unknown, index: number) => {
                      const item = institutionFlows[index]
                      if (item?.id) navigate(`/institutions/${item.id}`)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {institutionFlows.map((entry, i) => (
                      <Cell key={i} fill={riskToColor(entry.avg_risk)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Vendor Recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-text-muted" aria-hidden="true" />
              Top Vendor Recipients
            </CardTitle>
            <CardDescription>Top 15 vendors receiving the most procurement funds</CardDescription>
          </CardHeader>
          <CardContent>
            {vendorFlows.length === 0 ? (
              <div className="flex items-center justify-center h-[350px] text-text-muted text-sm">
                No vendor flow data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  layout="vertical"
                  data={vendorFlows}
                  margin={{ top: 4, right: 16, bottom: 4, left: 160 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatCompactMXN(v)}
                    tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<FlowBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                    onClick={(_data: unknown, index: number) => {
                      const item = vendorFlows[index]
                      if (item?.id) navigate(`/vendors/${item.id}`)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {vendorFlows.map((entry, i) => (
                      <Cell key={i} fill={riskToColor(entry.avg_risk)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* L4: Sector Distribution Treemap                                     */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-text-muted" aria-hidden="true" />
            Sector Distribution
          </CardTitle>
          <CardDescription>How procurement funds distribute across the 12 sectors. Size represents total value.</CardDescription>
        </CardHeader>
        <CardContent>
          {sectorAgg.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-text-muted text-sm">
              No sector distribution data available
            </div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <Treemap
                  data={sectorAgg}
                  dataKey="value"
                  nameKey="name"
                  stroke="#1a1f2e"
                  content={<TreemapContent x={0} y={0} width={0} height={0} name="" fill="" value={0} />}
                  onClick={(node: unknown) => {
                    const n = node as { sectorId?: number }
                    if (n?.sectorId) setSelectedSector(n.sectorId)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <RechartsTooltip content={<TreemapTooltip />} />
                </Treemap>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
                {sectorAgg.map(s => (
                  <div key={s.sectorCode} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.fill }} />
                    {s.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* L5: High-Risk Flows Table                                           */}
      {/* ================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-risk-high" aria-hidden="true" />
            Highest-Risk Fund Flows
          </CardTitle>
          <CardDescription>
            Top 20 flows ranked by average risk score. These institution-vendor relationships warrant closer scrutiny.
            Click any row to investigate the contracts in that flow relationship.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {highRiskFlows.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-text-muted text-sm">
              No high-risk flows found for the current filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" role="table">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2.5 px-3 text-text-muted font-medium" scope="col">Source</th>
                    <th className="text-left py-2.5 px-3 text-text-muted font-medium hidden md:table-cell" scope="col">
                      <ArrowRight className="h-3 w-3 inline-block" aria-hidden="true" />
                    </th>
                    <th className="text-left py-2.5 px-3 text-text-muted font-medium" scope="col">Target</th>
                    <th className="text-right py-2.5 px-3 text-text-muted font-medium" scope="col">Value</th>
                    <th className="text-right py-2.5 px-3 text-text-muted font-medium hidden sm:table-cell" scope="col">Contracts</th>
                    <th className="text-right py-2.5 px-3 text-text-muted font-medium" scope="col">Avg Risk</th>
                    <th className="text-right py-2.5 px-3 text-text-muted font-medium hidden md:table-cell" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {highRiskFlows.map((flow, i) => {
                    const risk = flow.avg_risk ?? 0
                    const level = getRiskLevel(risk)

                    const handleRowClick = () => {
                      if (flow.source_type === 'institution' && flow.target_type === 'vendor') {
                        navigate(`/contracts?institution_id=${flow.source_id}&vendor_id=${flow.target_id}`)
                      } else if (flow.source_type === 'institution') {
                        navigate(`/contracts?institution_id=${flow.source_id}`)
                      } else if (flow.target_type === 'vendor') {
                        navigate(`/contracts?vendor_id=${flow.target_id}`)
                      }
                    }

                    return (
                      <tr
                        key={`${flow.source_id}-${flow.target_id}-${i}`}
                        className="border-b border-border/10 hover:bg-background-elevated transition-colors cursor-pointer"
                        onClick={handleRowClick}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick() } }}
                        aria-label={`Investigate flow from ${toTitleCase(flow.source_name)} to ${toTitleCase(flow.target_name)}`}
                      >
                        <td className="py-2.5 px-3">
                          <span className="text-text-primary font-medium">{truncateName(flow.source_name, 32)}</span>
                          <span className="text-text-muted ml-1.5 text-xs capitalize">{flow.source_type}</span>
                        </td>
                        <td className="py-2.5 px-3 text-text-muted hidden md:table-cell">
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-text-primary font-medium">{truncateName(flow.target_name, 32)}</span>
                          <span className="text-text-muted ml-1.5 text-xs capitalize">{flow.target_type}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-text-primary font-mono">
                          {formatCompactMXN(flow.value)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-text-secondary font-mono hidden sm:table-cell">
                          {formatNumber(flow.contracts)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                              level === 'critical' && 'bg-risk-critical/15 text-risk-critical',
                              level === 'high' && 'bg-risk-high/15 text-risk-high',
                              level === 'medium' && 'bg-risk-medium/15 text-risk-medium',
                              level === 'low' && 'bg-risk-low/15 text-risk-low',
                            )}
                          >
                            {(risk * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right hidden md:table-cell">
                          <ExternalLink className="h-3.5 w-3.5 text-text-muted inline" aria-hidden="true" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Methodology Note                                                    */}
      {/* ================================================================== */}
      <SectionDescription title="Methodology">
        Fund flows are aggregated from 3.1M procurement contracts (2002-2025).
        Bar colors reflect the average v5.0 risk score for each flow:
        green (&lt;10%), amber (10-30%), orange (30-50%), and red (&ge;50%).
        High-risk flow value sums all flows where average risk exceeds 30%.
        Use year and sector filters to narrow the analysis. Clicking a row in the
        high-risk table navigates to the contracts page filtered by that institution-vendor relationship.
      </SectionDescription>
    </div>
  )
}
