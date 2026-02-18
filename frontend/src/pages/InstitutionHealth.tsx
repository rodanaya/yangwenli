/**
 * Institutional Health Check
 * Ranks government institutions by procurement integrity, vendor diversity,
 * and risk concentration using HHI and composite risk metrics.
 *
 * L0: Header + Controls (sort, min contracts)
 * L1: Summary Cards (total institutions, avg HHI, worst risk, most concentrated)
 * L2: Scatter Plot — Risk vs Concentration (HHI x avg_risk_score)
 * L3: Rankings Table (sortable, linked)
 * L4: Top 10 HHI Bar Chart
 */

import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { RiskBadge } from '@/components/ui/badge'
import { SectionDescription } from '@/components/SectionDescription'
import { formatCompactMXN, formatNumber, getRiskLevel, toTitleCase } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import { PageHero, StatCard as SharedStatCard } from '@/components/DashboardWidgets'
import type { InstitutionHealthItem } from '@/api/types'
import {
  Building2,
  AlertTriangle,
  Target,
  SlidersHorizontal,
  TrendingUp,
  BarChart3,
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
// Constants
// =============================================================================

const SORT_OPTIONS = [
  { value: 'risk', label: 'Risk Score' },
  { value: 'hhi', label: 'HHI Concentration' },
  { value: 'value', label: 'Spending Volume' },
  { value: 'contracts', label: 'Contract Count' },
] as const

const MIN_CONTRACT_STEPS = [50, 100, 200, 300, 500, 750, 1000] as const

/** Return HHI interpretation label */
function getHHILabel(hhi: number): string {
  if (hhi < 0.15) return 'Competitive'
  if (hhi < 0.25) return 'Moderate'
  return 'Concentrated'
}

/** Return HHI color */
function getHHIColor(hhi: number): string {
  if (hhi < 0.15) return '#4ade80' // green
  if (hhi < 0.25) return '#fbbf24' // amber
  return '#f87171' // red
}

/** Dot color for scatter based on risk level */
function getDotColor(avgRisk: number): string {
  const level = getRiskLevel(avgRisk)
  return RISK_COLORS[level]
}

// =============================================================================
// Custom Tooltips
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
        <span>HHI</span>
        <span className="text-right" style={{ color: getHHIColor(d.hhi) }}>{d.hhi.toFixed(3)}</span>
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
        <span>HHI</span>
        <span style={{ color: getHHIColor(d.hhi) }}>{d.hhi.toFixed(3)}</span>
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
  const [sortBy, setSortBy] = useState<string>('risk')
  const [minContracts, setMinContracts] = useState(100)

  // ---------- Data fetching ----------
  const { data, isLoading, isError } = useQuery({
    queryKey: ['institution-rankings', sortBy, minContracts],
    queryFn: () => analysisApi.getInstitutionRankings(sortBy, minContracts, 200),
    staleTime: 10 * 60 * 1000,
  })

  const items = data?.data ?? []

  // ---------- Derived summary metrics ----------
  const summary = useMemo(() => {
    if (!items.length) return null
    const avgHHI = items.reduce((s, i) => s + i.hhi, 0) / items.length
    const worstRisk = items.reduce((prev, cur) => (cur.avg_risk_score > prev.avg_risk_score ? cur : prev), items[0])
    const mostConcentrated = items.reduce((prev, cur) => (cur.hhi > prev.hhi ? cur : prev), items[0])
    return { avgHHI, worstRisk, mostConcentrated }
  }, [items])

  // ---------- Scatter data: all items ----------
  const scatterData = useMemo(() => {
    if (!items.length) return []
    const maxVal = Math.max(...items.map(i => i.total_value))
    return items.map(i => ({
      ...i,
      // Scale radius between 4 and 24 based on value
      radius: 4 + (i.total_value / (maxVal || 1)) * 20,
    }))
  }, [items])

  // ---------- Top 10 HHI bar data ----------
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
      .reverse() // reverse for horizontal bar (bottom-to-top)
  }, [items])

  // ---------- Loading state ----------
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><ChartSkeleton height={350} /></CardContent></Card>
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
      {/* ================================================================ */}
      {/* L0: Header + Controls                                            */}
      {/* ================================================================ */}
      {/* Hero */}
      <PageHero
        trackingLabel="INSTITUTIONAL HEALTH"
        icon={<Building2 className="h-4 w-4 text-accent" />}
        headline={summary ? formatNumber(items.length) : '—'}
        subtitle="Government institutions ranked by procurement integrity"
        detail="Vendor diversity, risk concentration (HHI), and composite risk metrics across all institutions."
        loading={isLoading}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div />
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" />
            <label htmlFor="sort-select" className="text-xs text-text-muted whitespace-nowrap">Sort by</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-8 rounded-md border border-border bg-background-card px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Min contracts */}
          <div className="flex items-center gap-2">
            <label htmlFor="min-contracts" className="text-xs text-text-muted whitespace-nowrap">Min contracts</label>
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
        </div>
      </div>

      <SectionDescription>
        The Herfindahl-Hirschman Index (HHI) measures vendor concentration: values below 0.15 indicate healthy
        competition, 0.15-0.25 is moderate concentration, and above 0.25 signals high dependence on a few vendors.
        Institutions with both high HHI and high risk scores deserve priority attention.
      </SectionDescription>

      {/* ================================================================ */}
      {/* L1: Summary Cards                                                */}
      {/* ================================================================ */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SharedStatCard
          loading={isLoading}
          label="INSTITUTIONS"
          value={data ? formatNumber(data.total_institutions) : '—'}
          detail={`With ${formatNumber(minContracts)}+ contracts`}
          color="text-accent"
          borderColor="border-accent/30"
        />
        <SharedStatCard
          loading={isLoading}
          label="AVG HHI"
          value={summary ? summary.avgHHI.toFixed(3) : '—'}
          detail={summary ? `${getHHILabel(summary.avgHHI)} market` : '—'}
          color="text-risk-medium"
          borderColor="border-risk-medium/30"
        />
        <SharedStatCard
          loading={isLoading}
          label="HIGHEST RISK"
          value={summary ? `${(summary.worstRisk.avg_risk_score * 100).toFixed(1)}%` : '—'}
          detail={summary ? toTitleCase(summary.worstRisk.institution_name).slice(0, 30) : '—'}
          color="text-risk-high"
          borderColor="border-risk-high/30"
        />
        <SharedStatCard
          loading={isLoading}
          label="MOST CONCENTRATED"
          value={summary ? summary.mostConcentrated.hhi.toFixed(3) : '—'}
          detail={summary ? toTitleCase(summary.mostConcentrated.institution_name).slice(0, 30) : '—'}
          color="text-risk-critical"
          borderColor="border-risk-critical/30"
        />
      </div>

      {/* ================================================================ */}
      {/* L2: Scatter Plot - Risk vs Concentration                         */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            Risk vs. Vendor Concentration
          </CardTitle>
          <CardDescription>
            Each dot is an institution. Size reflects spending volume. Quadrant lines at HHI=0.25 and Risk=30%.
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
                    name="HHI"
                    domain={[0, 'auto']}
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                    label={{ value: 'HHI (Vendor Concentration)', position: 'insideBottom', offset: -10, fontSize: 11, fill: 'var(--color-text-secondary)' }}
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
                  {/* Quadrant reference lines */}
                  <ReferenceLine x={0.25} stroke="#fbbf24" strokeDasharray="4 4" strokeOpacity={0.6} />
                  <ReferenceLine y={0.30} stroke="#fb923c" strokeDasharray="4 4" strokeOpacity={0.6} />
                  <RechartsTooltip content={<ScatterTooltip />} cursor={false} />
                  <Scatter
                    data={scatterData}
                    isAnimationActive={false}
                    onClick={(data: { institution_id?: number }) => {
                      if (data?.institution_id) navigate(`/institutions/${data.institution_id}`)
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
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              {/* Quadrant labels */}
              <div className="absolute top-6 left-16 text-xs font-medium text-risk-low/60 pointer-events-none">
                Healthy
              </div>
              <div className="absolute top-6 right-10 text-xs font-medium text-risk-medium/60 pointer-events-none">
                Concentrated but Clean
              </div>
              <div className="absolute bottom-10 left-16 text-xs font-medium text-risk-high/60 pointer-events-none">
                Risky but Diverse
              </div>
              <div className="absolute bottom-10 right-10 text-xs font-medium text-risk-critical/60 pointer-events-none">
                Danger Zone
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[380px] text-text-muted text-sm">
              No data available for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* L3: Rankings Table                                               */}
      {/* ================================================================ */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            Institution Rankings
          </CardTitle>
          <CardDescription>
            Showing top {Math.min(items.length, 50)} institutions sorted by {SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? sortBy}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="px-3 py-2.5 text-left font-medium w-10">#</th>
                  <th className="px-3 py-2.5 text-left font-medium min-w-[200px]">Institution</th>
                  <th className="px-3 py-2.5 text-right font-medium">Contracts</th>
                  <th className="px-3 py-2.5 text-right font-medium">Value</th>
                  <th className="px-3 py-2.5 text-right font-medium">Avg Risk</th>
                  <th className="px-3 py-2.5 text-right font-medium hidden lg:table-cell" title="Direct Award %">DA%</th>
                  <th className="px-3 py-2.5 text-right font-medium hidden lg:table-cell" title="Single Bid %">SB%</th>
                  <th className="px-3 py-2.5 text-right font-medium hidden lg:table-cell" title="High Risk %">HR%</th>
                  <th className="px-3 py-2.5 text-right font-medium">HHI</th>
                  <th className="px-3 py-2.5 text-right font-medium hidden lg:table-cell" title="Top Vendor Share %">Top Vendor</th>
                  <th className="px-3 py-2.5 text-right font-medium">Vendors</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 50).map((item, idx) => {
                  return (
                    <tr
                      key={item.institution_id}
                      className="border-b border-border/30 hover:bg-background-elevated/30 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-text-muted">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <Link
                          to={`/institutions/${item.institution_id}`}
                          className="text-accent hover:underline truncate block max-w-[260px]"
                          title={item.institution_name}
                        >
                          {toTitleCase(item.institution_name)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-secondary">
                        {formatNumber(item.total_contracts)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-secondary">
                        {formatCompactMXN(item.total_value)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <RiskBadge score={item.avg_risk_score} className="text-xs px-1.5 py-0" />
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-secondary hidden lg:table-cell">
                        {item.direct_award_pct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-secondary hidden lg:table-cell">
                        {item.single_bid_pct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-secondary hidden lg:table-cell">
                        {item.high_risk_pct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: getHHIColor(item.hhi) }}>
                        {item.hhi.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-secondary hidden lg:table-cell">
                        {item.top_vendor_share.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-text-secondary">
                        {formatNumber(item.vendor_count)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">
              No institutions match the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* L4: Top 10 HHI Bar Chart                                         */}
      {/* ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            Top 10 Most Concentrated Institutions
          </CardTitle>
          <CardDescription>
            Institutions with the highest HHI values, indicating heavy reliance on a small number of vendors.
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
                    <Cell key={`bar-${idx}`} fill={getHHIColor(entry.hhi)} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[360px] text-text-muted text-sm">
              No data available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
