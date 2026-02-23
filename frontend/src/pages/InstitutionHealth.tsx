/**
 * Institutional Health — Investigation Workbench
 *
 * Section 1: 3 StatCards (institutions tracked, avg concentration, high-risk count)
 * Section 2: Sortable institution rankings table (primary)
 * Section 3: Charts (scatter, bar) — collapsed in <details>
 *
 * Journalist-friendly: HHI renamed to "Vendor Concentration" with plain-language tooltip.
 */

import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber, getRiskLevel, toTitleCase } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import { StatCard as SharedStatCard } from '@/components/DashboardWidgets'
import type { InstitutionHealthItem } from '@/api/types'
import {
  Building2,
  AlertTriangle,
  Target,
  SlidersHorizontal,
  TrendingUp,
  BarChart3,
  Flame,
  Percent,
  ChevronRight,
  Skull,
} from 'lucide-react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  BarChart,
  Bar,
} from '@/components/charts'

// =============================================================================
// Types
// =============================================================================

type SortField = 'total_contracts' | 'total_value' | 'avg_risk_score' | 'vendor_count' | 'hhi'
type SortDir = 'asc' | 'desc'

// =============================================================================
// Constants
// =============================================================================

const MIN_CONTRACT_STEPS = [50, 100, 200, 300, 500, 750, 1000] as const

// =============================================================================
// Helpers
// =============================================================================

/** Vendor Concentration label — journalist-friendly, no HHI jargon */
function getConcentrationLabel(hhi: number): string {
  if (hhi < 0.15) return 'Competitive'
  if (hhi < 0.25) return 'Moderate'
  return 'Concentrated'
}

function getConcentrationColor(hhi: number): string {
  if (hhi < 0.15) return '#4ade80'
  if (hhi < 0.25) return '#fbbf24'
  return '#f87171'
}

function getDotColor(avgRisk: number): string {
  const level = getRiskLevel(avgRisk)
  return RISK_COLORS[level]
}

function SortIndicator({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <span className="text-text-muted/40 ml-1">↕</span>
  return <span className="text-accent ml-1">{sortDir === 'desc' ? '▼' : '▲'}</span>
}

// =============================================================================
// Custom Tooltips (for charts in details section)
// =============================================================================

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: InstitutionHealthItem }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card p-3 shadow-xl text-xs space-y-1.5">
      <p className="font-semibold text-text-primary text-sm truncate max-w-[260px]">
        {toTitleCase(d.institution_name)}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-text-secondary">
        <span>Concentration</span>
        <span className="text-right" style={{ color: getConcentrationColor(d.hhi) }}>
          {d.hhi.toFixed(3)} ({getConcentrationLabel(d.hhi)})
        </span>
        <span>Avg Risk</span>
        <span className="text-right" style={{ color: getDotColor(d.avg_risk_score) }}>
          {(d.avg_risk_score * 100).toFixed(1)}%
        </span>
        <span>Contracts</span>
        <span className="text-right text-text-primary">{formatNumber(d.total_contracts)}</span>
        <span>Value</span>
        <span className="text-right text-text-primary">{formatCompactMXN(d.total_value)}</span>
        <span>Vendors</span>
        <span className="text-right text-text-primary">{formatNumber(d.vendor_count)}</span>
      </div>
    </div>
  )
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; hhi: number; total_contracts: number } }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card p-3 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-text-primary text-sm truncate max-w-[240px]">{d.name}</p>
      <div className="font-mono text-text-secondary flex justify-between gap-4">
        <span>Vendor Concentration</span>
        <span style={{ color: getConcentrationColor(d.hhi) }}>{d.hhi.toFixed(3)}</span>
      </div>
      <div className="font-mono text-text-secondary flex justify-between gap-4">
        <span>Contracts</span>
        <span>{formatNumber(d.total_contracts)}</span>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function InstitutionHealth() {
  const navigate = useNavigate()
  const [minContracts, setMinContracts] = useState(100)
  const [sortField, setSortField] = useState<SortField>('total_value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // ---------- Data fetching ----------
  // Always fetch sorted by value server-side; client sorts the result
  const { data, isLoading, isError } = useQuery({
    queryKey: ['institution-rankings', 'value', minContracts],
    queryFn: () => analysisApi.getInstitutionRankings('value', minContracts, 200),
    staleTime: 10 * 60 * 1000,
  })

  const items = data?.data ?? []

  // ---------- Client-side sort ----------
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sortField] as number
      const bVal = b[sortField] as number
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })
  }, [items, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // ---------- Derived summary metrics ----------
  const summary = useMemo(() => {
    if (!items.length) return null
    const avgConcentration = items.reduce((s, i) => s + i.hhi, 0) / items.length
    const highRiskCount = items.filter(i => i.avg_risk_score >= 0.30).length
    return { avgConcentration, highRiskCount }
  }, [items])

  // ---------- Scatter data ----------
  const scatterData = useMemo(() => {
    if (!items.length) return []
    const maxVal = Math.max(...items.map(i => i.total_value))
    return items.map(i => ({
      ...i,
      radius: 4 + (i.total_value / (maxVal || 1)) * 20,
    }))
  }, [items])

  // ---------- Danger Rankings: top by volume (high-risk contract count) ----------
  const topByVolume = useMemo(() => {
    if (!items.length) return []
    return [...items]
      .filter(i => i.total_contracts >= 1000)
      .map(i => ({ ...i, high_risk_count: Math.round(i.high_risk_pct * i.total_contracts) }))
      .sort((a, b) => b.high_risk_count - a.high_risk_count)
      .slice(0, 10)
  }, [items])

  // ---------- Danger Rankings: top by rate (avg_risk_score) ----------
  const topByRate = useMemo(() => {
    if (!items.length) return []
    return [...items]
      .filter(i => i.total_contracts >= 1000)
      .sort((a, b) => b.avg_risk_score - a.avg_risk_score)
      .slice(0, 10)
  }, [items])

  // ---------- Top 10 concentration bar data ----------
  const barData = useMemo(() => {
    if (!items.length) return []
    return [...items]
      .sort((a, b) => b.hhi - a.hhi)
      .slice(0, 10)
      .map(i => ({
        name: toTitleCase(i.institution_name).slice(0, 25) + (i.institution_name.length > 25 ? '...' : ''),
        fullName: toTitleCase(i.institution_name),
        hhi: i.hhi,
        total_contracts: i.total_contracts,
        institution_id: i.institution_id,
      }))
      .reverse()
  }, [items])

  // ---------- Loading state ----------
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-[400px]" /></CardContent></Card>
      </div>
    )
  }

  // ---------- Error state ----------
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-text-secondary space-y-3">
        <AlertTriangle className="h-8 w-8 text-risk-high" />
        <p>Failed to load institution rankings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-4 w-4 text-accent" />
          Institution Rankings
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
          Government institutions ranked by procurement risk and vendor concentration — click column headers to sort
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" />
        <label htmlFor="min-contracts" className="text-xs text-text-muted whitespace-nowrap">
          Minimum contracts:
        </label>
        <select
          id="min-contracts"
          value={minContracts}
          onChange={e => setMinContracts(Number(e.target.value))}
          className="h-8 rounded-md border border-border bg-background-card px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {MIN_CONTRACT_STEPS.map(n => (
            <option key={n} value={n}>{formatNumber(n)}+</option>
          ))}
        </select>
      </div>

      {/* Section 1: Stat Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <SharedStatCard
          loading={isLoading}
          label="INSTITUTIONS TRACKED"
          value={data ? formatNumber(data.total_institutions) : '—'}
          detail={`With ${formatNumber(minContracts)}+ contracts`}
          color="text-accent"
          borderColor="border-accent/30"
        />
        <SharedStatCard
          loading={isLoading}
          label="AVG VENDOR CONCENTRATION"
          value={summary ? summary.avgConcentration.toFixed(3) : '—'}
          detail={summary ? getConcentrationLabel(summary.avgConcentration) + ' market overall' : '—'}
          color="text-risk-medium"
          borderColor="border-risk-medium/30"
        />
        <SharedStatCard
          loading={isLoading}
          label="HIGH-RISK INSTITUTIONS"
          value={summary ? String(summary.highRiskCount) : '—'}
          detail="Avg risk score above 30%"
          color="text-risk-high"
          borderColor="border-risk-high/30"
        />
      </div>

      {/* ============================================================ */}
      {/* DANGER RANKINGS — Two ranked lists above the full table    */}
      {/* ============================================================ */}
      {(topByVolume.length > 0 || topByRate.length > 0) && (
        <div className="space-y-3">
          {/* Editorial header */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Skull className="h-4 w-4 text-risk-critical" />
              <span className="text-xs font-bold tracking-wider uppercase text-risk-critical font-mono">
                AI Intelligence · Danger Rankings
              </span>
            </div>
            <h2 className="text-base font-black text-text-primary">
              Most Dangerous Institutions — Two Ways to Measure
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Left: institutions with the most high-risk contracts in absolute terms. Right: institutions with the highest proportion of risky spending. Both lists require 1,000+ contracts.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* --- Left: By Volume (raw high-risk count) --- */}
            <Card className="border-risk-critical/20">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="h-3.5 w-3.5 text-risk-critical" />
                  <div>
                    <p className="text-xs font-bold text-text-primary">Most High-Risk Contracts</p>
                    <p className="text-xs text-text-muted">By raw count — sheer volume of risk</p>
                  </div>
                </div>
                {topByVolume.length === 0 ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {(() => {
                      const maxCount = topByVolume[0]?.high_risk_count ?? 1
                      return topByVolume.map((item, i) => {
                        const barPct = (item.high_risk_count / maxCount) * 100
                        const riskColor =
                          item.avg_risk_score >= 0.50 ? 'var(--color-risk-critical)' :
                          item.avg_risk_score >= 0.30 ? 'var(--color-risk-high)' :
                          item.avg_risk_score >= 0.10 ? 'var(--color-risk-medium)' :
                          'var(--color-risk-low)'
                        return (
                          <Link
                            key={item.institution_id}
                            to={`/institutions/${item.institution_id}`}
                            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-background-elevated/40 transition-colors group"
                          >
                            <span className="text-xs text-text-muted font-mono w-4 shrink-0 tabular-nums">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-medium text-text-primary truncate group-hover:text-accent transition-colors" title={toTitleCase(item.institution_name)}>
                                  {toTitleCase(item.institution_name)}
                                </span>
                                <span className="text-xs font-bold font-mono tabular-nums text-risk-critical ml-2 shrink-0">
                                  {formatNumber(item.high_risk_count)}
                                </span>
                              </div>
                              <div className="w-full h-1 bg-background-elevated rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${barPct}%`, backgroundColor: riskColor, opacity: 0.8 }}
                                />
                              </div>
                            </div>
                            <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 shrink-0" />
                          </Link>
                        )
                      })
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* --- Right: By Rate (avg_risk_score) --- */}
            <Card className="border-risk-high/20">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <Percent className="h-3.5 w-3.5 text-risk-high" />
                  <div>
                    <p className="text-xs font-bold text-text-primary">Highest Risk Concentration</p>
                    <p className="text-xs text-text-muted">By avg risk score — systemic pattern depth</p>
                  </div>
                </div>
                {topByRate.length === 0 ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {(() => {
                      const maxScore = topByRate[0]?.avg_risk_score ?? 1
                      return topByRate.map((item, i) => {
                        const barPct = (item.avg_risk_score / maxScore) * 100
                        const riskColor =
                          item.avg_risk_score >= 0.50 ? 'var(--color-risk-critical)' :
                          item.avg_risk_score >= 0.30 ? 'var(--color-risk-high)' :
                          item.avg_risk_score >= 0.10 ? 'var(--color-risk-medium)' :
                          'var(--color-risk-low)'
                        return (
                          <Link
                            key={item.institution_id}
                            to={`/institutions/${item.institution_id}`}
                            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-background-elevated/40 transition-colors group"
                          >
                            <span className="text-xs text-text-muted font-mono w-4 shrink-0 tabular-nums">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-medium text-text-primary truncate group-hover:text-accent transition-colors" title={toTitleCase(item.institution_name)}>
                                  {toTitleCase(item.institution_name)}
                                </span>
                                <span className="text-xs font-bold font-mono tabular-nums ml-2 shrink-0" style={{ color: riskColor }}>
                                  {(item.avg_risk_score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1 bg-background-elevated rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${barPct}%`, backgroundColor: riskColor, opacity: 0.8 }}
                                  />
                                </div>
                                <span className="text-xs font-mono text-text-muted tabular-nums shrink-0">
                                  {formatNumber(item.total_contracts)} contracts
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 shrink-0" />
                          </Link>
                        )
                      })
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Section 2: Sortable Rankings Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
            Institution Rankings
          </CardTitle>
          <CardDescription className="text-xs">
            {sortedItems.length} institutions. Click column headers to sort. Click an institution name to view its profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table" aria-label="Institution rankings table">
              <thead>
                <tr className="border-b border-border bg-background-elevated/30 text-text-muted">
                  <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                  <th className="px-3 py-2.5 text-left font-medium min-w-[200px]">Institution</th>
                  <th
                    className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                    onClick={() => handleSort('total_contracts')}
                    aria-sort={sortField === 'total_contracts' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Contracts
                    <SortIndicator field="total_contracts" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                    onClick={() => handleSort('total_value')}
                    aria-sort={sortField === 'total_value' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Total Value (MXN)
                    <SortIndicator field="total_value" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                    onClick={() => handleSort('avg_risk_score')}
                    aria-sort={sortField === 'avg_risk_score' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Avg Risk Score
                    <SortIndicator field="avg_risk_score" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap"
                    onClick={() => handleSort('vendor_count')}
                    aria-sort={sortField === 'vendor_count' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                  >
                    Vendors
                    <SortIndicator field="vendor_count" sortField={sortField} sortDir={sortDir} />
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium cursor-pointer hover:text-text-primary select-none whitespace-nowrap group"
                    onClick={() => handleSort('hhi')}
                    aria-sort={sortField === 'hhi' ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                    title="Vendor Concentration: 1.0 = single vendor, 0.0 = perfectly competitive"
                  >
                    Concentration
                    <SortIndicator field="hhi" sortField={sortField} sortDir={sortDir} />
                    <span className="ml-1 text-text-muted/50 font-normal">ⓘ</span>
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap hidden lg:table-cell">
                    Risk Level
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.slice(0, 100).map((item, idx) => (
                  <tr
                    key={item.institution_id}
                    className="border-b border-border/20 hover:bg-background-elevated/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/institutions/${item.institution_id}`)}
                  >
                    <td className="px-3 py-2 font-mono text-text-muted">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <Link
                        to={`/institutions/${item.institution_id}`}
                        className="text-accent hover:underline truncate block max-w-[280px]"
                        title={item.institution_name}
                        onClick={e => e.stopPropagation()}
                      >
                        {toTitleCase(item.institution_name)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-text-secondary tabular-nums">
                      {formatNumber(item.total_contracts)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-text-secondary tabular-nums">
                      {formatCompactMXN(item.total_value)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <RiskBadge score={item.avg_risk_score} className="text-xs px-1.5 py-0" />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-text-secondary tabular-nums">
                      {formatNumber(item.vendor_count)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className="inline-flex items-center gap-1 font-mono text-xs font-semibold"
                        style={{ color: getConcentrationColor(item.hhi) }}
                        title="1.0 = single vendor, 0.0 = perfectly competitive"
                      >
                        {item.hhi.toFixed(3)}
                        <span className="text-xs font-normal opacity-70">
                          {getConcentrationLabel(item.hhi)}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right hidden lg:table-cell">
                      <RiskBadge score={item.avg_risk_score} className="text-xs px-1.5 py-0" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sortedItems.length === 0 && (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">
              No institutions match the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Charts (collapsed) */}
      <details className="mt-4 group">
        <summary className="flex items-center gap-2 cursor-pointer select-none list-none text-xs font-medium text-text-muted hover:text-text-primary transition-colors py-1">
          <BarChart3 className="h-3.5 w-3.5" />
          Show charts (risk vs concentration scatter, top 10 concentrated)
          <span className="ml-1 group-open:hidden">▶</span>
          <span className="ml-1 hidden group-open:inline">▼</span>
        </summary>
        <div className="mt-4 space-y-5">
          {/* Scatter Plot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-accent" />
                Risk vs. Vendor Concentration
              </CardTitle>
              <CardDescription>
                Each dot is an institution. Size reflects spending volume. High concentration (right) + high risk (top) = danger zone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scatterData.length > 0 ? (
                <div className="relative">
                  <ResponsiveContainer width="100%" height={380}>
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                      <XAxis
                        type="number"
                        dataKey="hhi"
                        name="Concentration"
                        domain={[0, 'auto']}
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        label={{ value: 'Vendor Concentration (0=diverse, 1=monopoly)', position: 'insideBottom', offset: -10, fontSize: 11, fill: 'var(--color-text-secondary)' }}
                      />
                      <YAxis
                        type="number"
                        dataKey="avg_risk_score"
                        name="Avg Risk"
                        domain={[0, 'auto']}
                        tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                        tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                        label={{ value: 'Avg Risk Score', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11, fill: 'var(--color-text-secondary)' }}
                      />
                      <ZAxis type="number" dataKey="radius" range={[30, 250]} />
                      <ReferenceLine x={0.25} stroke="#fbbf24" strokeDasharray="4 4" strokeOpacity={0.6} />
                      <ReferenceLine y={0.30} stroke="#fb923c" strokeDasharray="4 4" strokeOpacity={0.6} />
                      <RechartsTooltip content={<ScatterTooltip />} cursor={false} />
                      <Scatter
                        data={scatterData}
                        isAnimationActive={false}
                        onClick={(d: { institution_id?: number }) => {
                          if (d?.institution_id) navigate(`/institutions/${d.institution_id}`)
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {scatterData.map((entry, idx) => (
                          <Cell
                            key={`scatter-${idx}`}
                            fill={getDotColor(entry.avg_risk_score)}
                            fillOpacity={0.45}
                            stroke={getDotColor(entry.avg_risk_score)}
                            strokeOpacity={0.9}
                            strokeWidth={1}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="absolute top-6 left-16 text-xs font-medium text-risk-low/60 pointer-events-none">Healthy</div>
                  <div className="absolute top-6 right-10 text-xs font-medium text-risk-medium/60 pointer-events-none">Concentrated but Clean</div>
                  <div className="absolute bottom-10 left-16 text-xs font-medium text-risk-high/60 pointer-events-none">Risky but Diverse</div>
                  <div className="absolute bottom-10 right-10 text-xs font-medium text-risk-critical/60 pointer-events-none">Danger Zone</div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[380px] text-text-muted text-sm">No data available.</div>
              )}
            </CardContent>
          </Card>

          {/* Top 10 Most Concentrated */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                Top 10 Most Concentrated Institutions
              </CardTitle>
              <CardDescription>
                Institutions with the highest vendor concentration — heavy reliance on a small number of suppliers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 'auto']}
                      tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                      tickFormatter={(v: number) => v.toFixed(2)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={160}
                      tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }}
                    />
                    <RechartsTooltip content={<BarTooltip />} cursor={{ fill: 'var(--color-background-elevated)', opacity: 0.3 }} />
                    <Bar dataKey="hhi" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {barData.map((entry, idx) => (
                        <Cell key={`bar-${idx}`} fill={getConcentrationColor(entry.hhi)} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[360px] text-text-muted text-sm">No data available.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </details>
    </div>
  )
}
