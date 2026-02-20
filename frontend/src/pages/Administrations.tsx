/**
 * Administration Deep Dive — Macro-to-Micro Presidential Analysis
 *
 * L0: Admin Selector (5 clickable cards)
 * L1: Selected Admin Overview (6 stat cards)
 * L2: Admin Comparison Radar (all admins overlaid)
 * L3: Yearly Deep Dive (within selected admin)
 * L4: Sector Heatmap (12 sectors × 4 metrics)
 * L5: Transition Impact (4 delta cards)
 * L6: Corruption Cases & Events Timeline
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { SECTORS, RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import type { YearOverYearChange } from '@/api/types'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from '@/components/charts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Landmark,
  AlertTriangle,
  Shield,
  Users,
  Banknote,
  FileText,
  Activity,
} from 'lucide-react'

// =============================================================================
// Constants
// =============================================================================

const ADMINISTRATIONS = [
  { name: 'Fox', fullName: 'Vicente Fox', start: 2001, end: 2006, dataStart: 2002, color: '#3b82f6', party: 'PAN' },
  { name: 'Calderon', fullName: 'Felipe Calderon', start: 2006, end: 2012, dataStart: 2006, color: '#fb923c', party: 'PAN' },
  { name: 'Pena Nieto', fullName: 'Enrique Pena Nieto', start: 2012, end: 2018, dataStart: 2012, color: '#f87171', party: 'PRI' },
  { name: 'AMLO', fullName: 'Andres Manuel Lopez Obrador', start: 2018, end: 2024, dataStart: 2018, color: '#4ade80', party: 'MORENA' },
  { name: 'Sheinbaum', fullName: 'Claudia Sheinbaum', start: 2024, end: 2030, dataStart: 2024, color: '#60a5fa', party: 'MORENA' },
] as const

const GROUND_TRUTH_CASES = [
  { name: 'Odebrecht-PEMEX Bribery', admin: 'Pena Nieto', year: 2014, sector: 'energia', contracts: 35, type: 'Bribery' },
  { name: 'La Estafa Maestra', admin: 'Pena Nieto', year: 2013, sector: 'multiple', contracts: 10, type: 'Ghost companies' },
  { name: 'IMSS Ghost Companies', admin: 'Pena Nieto', year: 2014, sector: 'salud', contracts: 9366, type: 'Ghost companies' },
  { name: 'Grupo Higa / Casa Blanca', admin: 'Pena Nieto', year: 2014, sector: 'infraestructura', contracts: 3, type: 'Conflict of interest' },
  { name: 'Oceanografia PEMEX', admin: 'Pena Nieto', year: 2014, sector: 'energia', contracts: 2, type: 'Invoice fraud' },
  { name: 'Segalmex Food Distribution', admin: 'AMLO', year: 2019, sector: 'agricultura', contracts: 6326, type: 'Procurement fraud' },
  { name: 'COVID-19 Emergency', admin: 'AMLO', year: 2020, sector: 'salud', contracts: 5371, type: 'Embezzlement' },
  { name: 'Cyber Robotic IT', admin: 'AMLO', year: 2019, sector: 'tecnologia', contracts: 139, type: 'Overpricing' },
  { name: 'PEMEX Emilio Lozoya', admin: 'Pena Nieto', year: 2012, sector: 'energia', contracts: 0, type: 'Bribery' },
] as const

type AdminName = typeof ADMINISTRATIONS[number]['name']

// =============================================================================
// Helpers
// =============================================================================

interface AdminAgg {
  name: AdminName
  contracts: number
  totalValue: number
  avgRisk: number
  directAwardPct: number
  singleBidPct: number
  highRiskPct: number
  vendorCount: number
  institutionCount: number
  years: YearOverYearChange[]
}

function aggregateByAdmin(yoyData: YearOverYearChange[]): AdminAgg[] {
  return ADMINISTRATIONS.map((admin) => {
    const years = yoyData.filter(
      (y) => y.year >= admin.dataStart && y.year < admin.end
    )
    const totalContracts = years.reduce((s, y) => s + y.contracts, 0)
    const totalValue = years.reduce((s, y) => s + y.total_value, 0)
    const weightedRisk = totalContracts > 0
      ? years.reduce((s, y) => s + y.avg_risk * y.contracts, 0) / totalContracts
      : 0
    const weightedDA = totalContracts > 0
      ? years.reduce((s, y) => s + y.direct_award_pct * y.contracts, 0) / totalContracts
      : 0
    const weightedSB = totalContracts > 0
      ? years.reduce((s, y) => s + y.single_bid_pct * y.contracts, 0) / totalContracts
      : 0
    const weightedHR = totalContracts > 0
      ? years.reduce((s, y) => s + y.high_risk_pct * y.contracts, 0) / totalContracts
      : 0
    // Unique vendors: use max yearly count as proxy (sum would overcount)
    const maxVendors = years.length > 0 ? Math.max(...years.map((y) => y.vendor_count)) : 0
    const maxInst = years.length > 0 ? Math.max(...years.map((y) => y.institution_count)) : 0

    return {
      name: admin.name,
      contracts: totalContracts,
      totalValue,
      avgRisk: weightedRisk,
      directAwardPct: weightedDA,
      singleBidPct: weightedSB,
      highRiskPct: weightedHR,
      vendorCount: maxVendors,
      institutionCount: maxInst,
      years,
    }
  })
}

function delta(a: number, b: number): { value: number; direction: 'up' | 'down' | 'flat' } {
  const d = a - b
  return { value: d, direction: Math.abs(d) < 0.01 ? 'flat' : d > 0 ? 'up' : 'down' }
}

function DeltaBadge({ val, unit, invertColor }: { val: number; unit: string; invertColor?: boolean }) {
  const abs = Math.abs(val)
  const isUp = val > 0.01
  const isDown = val < -0.01
  // For most metrics, up = bad (red). invertColor flips this.
  const color = invertColor
    ? (isUp ? 'text-risk-low' : isDown ? 'text-risk-critical' : 'text-text-muted')
    : (isUp ? 'text-risk-critical' : isDown ? 'text-risk-low' : 'text-text-muted')
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-mono', color)}>
      <Icon className="h-3 w-3" />
      {abs < 0.01 ? '--' : `${val > 0 ? '+' : ''}${abs.toFixed(1)}${unit}`}
    </span>
  )
}

// =============================================================================
// Component
// =============================================================================

export default function Administrations() {
  const [selectedAdmin, setSelectedAdmin] = useState<AdminName>('AMLO')

  // Data queries
  const { data: yoyResp, isLoading: yoyLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: sectorYearResp, isLoading: syLoading } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: eventsResp } = useQuery({
    queryKey: ['analysis', 'temporal-events'],
    queryFn: () => analysisApi.getTemporalEvents(),
    staleTime: 5 * 60 * 1000,
  })

  const yoyData = yoyResp?.data ?? []
  const sectorYearData = sectorYearResp?.data ?? []
  const events = eventsResp?.events ?? []

  // Aggregations
  const adminAggs = useMemo(() => aggregateByAdmin(yoyData), [yoyData])
  const allTimeAvg = useMemo(() => {
    const total = yoyData.reduce((s, y) => s + y.contracts, 0)
    if (total === 0) return { da: 0, sb: 0, hr: 0, risk: 0 }
    return {
      da: yoyData.reduce((s, y) => s + y.direct_award_pct * y.contracts, 0) / total,
      sb: yoyData.reduce((s, y) => s + y.single_bid_pct * y.contracts, 0) / total,
      hr: yoyData.reduce((s, y) => s + y.high_risk_pct * y.contracts, 0) / total,
      risk: yoyData.reduce((s, y) => s + y.avg_risk * y.contracts, 0) / total,
    }
  }, [yoyData])

  const selectedAgg = adminAggs.find((a) => a.name === selectedAdmin)
  const selectedMeta = ADMINISTRATIONS.find((a) => a.name === selectedAdmin)!

  // Radar data
  const radarData = useMemo(() => {
    const axes = ['Direct Award %', 'Single Bid %', 'High Risk %', 'Avg Risk', 'Vendor Diversity']
    return axes.map((axis) => {
      const point: Record<string, unknown> = { axis }
      for (const agg of adminAggs) {
        if (agg.contracts === 0) { point[agg.name] = 0; continue }
        switch (axis) {
          case 'Direct Award %': point[agg.name] = +agg.directAwardPct.toFixed(1); break
          case 'Single Bid %': point[agg.name] = +agg.singleBidPct.toFixed(1); break
          case 'High Risk %': point[agg.name] = +agg.highRiskPct.toFixed(1); break
          case 'Avg Risk': point[agg.name] = +(agg.avgRisk * 100).toFixed(1); break
          case 'Vendor Diversity': point[agg.name] = +(agg.vendorCount / 1000).toFixed(1); break
        }
      }
      return point
    })
  }, [adminAggs])

  // Sector heatmap data for selected admin
  const sectorHeatmap = useMemo(() => {
    if (!selectedMeta || sectorYearData.length === 0) return []
    const filtered = sectorYearData.filter(
      (sy) => sy.year >= selectedMeta.dataStart && sy.year < selectedMeta.end
    )
    // Group by sector
    return SECTORS.map((sector) => {
      const sectorRows = filtered.filter((r) => r.sector_id === sector.id)
      const totalContracts = sectorRows.reduce((s, r) => s + r.contracts, 0)
      if (totalContracts === 0) {
        return { sectorId: sector.id, code: sector.code, nameEN: sector.nameEN, color: sector.color, da: 0, sb: 0, hr: 0, risk: 0, contracts: 0 }
      }
      return {
        sectorId: sector.id,
        code: sector.code,
        nameEN: sector.nameEN,
        color: sector.color,
        contracts: totalContracts,
        da: sectorRows.reduce((s, r) => s + r.direct_award_pct * r.contracts, 0) / totalContracts,
        sb: sectorRows.reduce((s, r) => s + (r.single_bid_pct ?? 0) * r.contracts, 0) / totalContracts,
        hr: sectorRows.reduce((s, r) => s + r.high_risk_pct * r.contracts, 0) / totalContracts,
        risk: sectorRows.reduce((s, r) => s + r.avg_risk * r.contracts, 0) / totalContracts,
      }
    })
  }, [sectorYearData, selectedMeta])

  // Transition data
  const transitions = useMemo(() => {
    const result = []
    for (let i = 1; i < ADMINISTRATIONS.length; i++) {
      const prev = adminAggs.find((a) => a.name === ADMINISTRATIONS[i - 1].name)
      const curr = adminAggs.find((a) => a.name === ADMINISTRATIONS[i].name)
      if (prev && curr && prev.contracts > 0 && curr.contracts > 0) {
        result.push({
          from: ADMINISTRATIONS[i - 1].name,
          to: ADMINISTRATIONS[i].name,
          fromColor: ADMINISTRATIONS[i - 1].color,
          toColor: ADMINISTRATIONS[i].color,
          dDA: delta(curr.directAwardPct, prev.directAwardPct),
          dSB: delta(curr.singleBidPct, prev.singleBidPct),
          dHR: delta(curr.highRiskPct, prev.highRiskPct),
          dContracts: delta(curr.contracts, prev.contracts),
          dVendors: delta(curr.vendorCount, prev.vendorCount),
        })
      }
    }
    return result
  }, [adminAggs])

  // Events filtered to selected admin
  const adminEvents = useMemo(
    () => events.filter((e) => e.year >= selectedMeta.dataStart && e.year < selectedMeta.end),
    [events, selectedMeta]
  )
  const adminCases = GROUND_TRUTH_CASES.filter((c) => c.admin === selectedAdmin)

  const isLoading = yoyLoading || syLoading

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary font-mono tracking-tight">
          Administration Analysis
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Deep dive into procurement patterns across Mexican presidential administrations (2002-2025)
        </p>
      </div>

      {/* L0: Admin Selector */}
      <div className="grid grid-cols-5 gap-4">
        {ADMINISTRATIONS.map((admin) => {
          const agg = adminAggs.find((a) => a.name === admin.name)
          const isSelected = selectedAdmin === admin.name
          return (
            <button
              key={admin.name}
              onClick={() => setSelectedAdmin(admin.name)}
              className={cn(
                'relative text-left rounded-lg border p-3 transition-all duration-200',
                isSelected
                  ? 'border-accent bg-accent/5 shadow-[0_0_12px_rgba(88,166,255,0.1)]'
                  : 'border-border/40 bg-card hover:border-border/80 hover:bg-card-hover'
              )}
            >
              {isSelected && (
                <span className="absolute top-0 left-3 right-3 h-[2px] rounded-b" style={{ backgroundColor: admin.color }} />
              )}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: admin.color }} />
                <span className={cn(
                  'text-sm font-semibold truncate',
                  isSelected ? 'text-text-primary' : 'text-text-secondary'
                )}>
                  {admin.name}
                </span>
                <span className="text-xs text-text-muted font-mono ml-auto">{admin.party}</span>
              </div>
              <div className="text-xs text-text-muted font-mono">
                {admin.dataStart}-{Math.min(admin.end, 2025)}
              </div>
              <div className="mt-2 text-xs font-mono text-text-secondary">
                {agg ? formatNumber(agg.contracts) : '0'} contracts
              </div>
              {/* Mini sparkline */}
              {agg && agg.years.length > 1 && (
                <div className="mt-1.5 h-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={agg.years} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Line
                        type="monotone"
                        dataKey="contracts"
                        stroke={admin.color}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* L1: Selected Admin Overview */}
      {selectedAgg && (
        <div className="grid grid-cols-6 gap-4">
          <StatCard
            label="Contracts"
            value={formatNumber(selectedAgg.contracts)}
            delta={null}
            icon={FileText}
            color={selectedMeta.color}
          />
          <StatCard
            label="Total Value"
            value={formatCompactMXN(selectedAgg.totalValue)}
            delta={null}
            icon={Banknote}
            color={selectedMeta.color}
          />
          <StatCard
            label="Direct Award %"
            value={`${selectedAgg.directAwardPct.toFixed(1)}%`}
            delta={selectedAgg.directAwardPct - allTimeAvg.da}
            unit=" pts"
            icon={Shield}
            color={selectedMeta.color}
          />
          <StatCard
            label="Single Bid %"
            value={`${selectedAgg.singleBidPct.toFixed(1)}%`}
            delta={selectedAgg.singleBidPct - allTimeAvg.sb}
            unit=" pts"
            icon={Users}
            color={selectedMeta.color}
          />
          <StatCard
            label="High Risk %"
            value={`${selectedAgg.highRiskPct.toFixed(1)}%`}
            delta={selectedAgg.highRiskPct - allTimeAvg.hr}
            unit=" pts"
            icon={AlertTriangle}
            color={selectedMeta.color}
          />
          <StatCard
            label="Active Vendors"
            value={formatNumber(selectedAgg.vendorCount)}
            delta={null}
            icon={Activity}
            color={selectedMeta.color}
            invertDelta
          />
        </div>
      )}

      {/* L2 + L3 side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* L2: Admin Comparison Radar */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              Administration Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-border)" strokeOpacity={0.3} />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                />
                <PolarRadiusAxis tick={{ fontSize: 10 }} stroke="var(--color-border)" strokeOpacity={0.2} />
                {ADMINISTRATIONS.map((admin) => (
                  <Radar
                    key={admin.name}
                    name={admin.name}
                    dataKey={admin.name}
                    stroke={admin.color}
                    fill={admin.color}
                    fillOpacity={admin.name === selectedAdmin ? 0.15 : 0}
                    strokeWidth={admin.name === selectedAdmin ? 2.5 : 1}
                    strokeOpacity={admin.name === selectedAdmin ? 1 : 0.35}
                    dot={admin.name === selectedAdmin}
                  />
                ))}
                <Legend
                  wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                  onClick={(e) => {
                    if (e.value && typeof e.value === 'string') {
                      const match = ADMINISTRATIONS.find((a) => a.name === e.value)
                      if (match) setSelectedAdmin(match.name)
                    }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 11,
                    fontFamily: 'var(--font-family-mono)',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* L3: Yearly Deep Dive */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              Yearly Trends — {selectedAdmin} ({selectedMeta.dataStart}-{Math.min(selectedMeta.end - 1, 2025)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAgg && selectedAgg.years.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={selectedAgg.years} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    tickFormatter={(v: number) => formatNumber(v)}
                    width={60}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
                    tickFormatter={(v: number) => `${v}%`}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: 'var(--font-family-mono)',
                    }}
                    formatter={(value: unknown, name?: string) => {
                      const v = Number(value)
                      const n = name ?? ''
                      if (n === 'Contracts') return [formatNumber(v), n]
                      return [`${v.toFixed(1)}%`, n]
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-family-mono)' }} />
                  <Bar
                    yAxisId="left"
                    dataKey="contracts"
                    name="Contracts"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={40}
                  >
                    {selectedAgg.years.map((_, i) => (
                      <Cell key={i} fill={selectedMeta.color} fillOpacity={0.6} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="direct_award_pct"
                    name="Direct Award %"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="single_bid_pct"
                    name="Single Bid %"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="high_risk_pct"
                    name="High Risk %"
                    stroke={RISK_COLORS.high}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-text-muted text-sm">
                No yearly data available for this administration
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* L4 + L5 side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* L4: Sector Heatmap */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              Sector Risk Profile — {selectedAdmin}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-3 py-2.5 text-xs text-text-muted font-medium">Sector</th>
                  <th className="text-right px-3 py-2.5 text-xs text-text-muted font-medium" title="Percentage of contracts awarded directly without competitive bidding">Direct Award</th>
                  <th className="text-right px-3 py-2.5 text-xs text-text-muted font-medium" title="Percentage of competitive procedures with only one bidder">Single Bid</th>
                  <th className="text-right px-3 py-2.5 text-xs text-text-muted font-medium" title="Percentage of contracts scored as high or critical risk">High Risk</th>
                  <th className="text-right px-3 py-2.5 text-xs text-text-muted font-medium" title="Average risk score (0-100%)">Avg Risk</th>
                </tr>
              </thead>
              <tbody>
                {sectorHeatmap
                  .filter((s) => s.contracts > 0)
                  .sort((a, b) => b.hr - a.hr)
                  .map((sector) => (
                  <tr key={sector.sectorId} className="border-b border-border/10 hover:bg-card-hover/50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: sector.color }} />
                        <span className="text-text-secondary">{sector.nameEN}</span>
                      </div>
                    </td>
                    <td className="text-right px-3 py-2">
                      <HeatCell value={sector.da} max={100} />
                    </td>
                    <td className="text-right px-3 py-2">
                      <HeatCell value={sector.sb} max={50} />
                    </td>
                    <td className="text-right px-3 py-2">
                      <HeatCell value={sector.hr} max={30} />
                    </td>
                    <td className="text-right px-3 py-2">
                      <HeatCell value={sector.risk * 100} max={50} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* L5: Transition Impact */}
        <Card className="bg-card border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-text-primary">
              Transition Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transitions.map((t) => {
              const isRelevant = t.to === selectedAdmin || t.from === selectedAdmin
              return (
                <div
                  key={`${t.from}-${t.to}`}
                  className={cn(
                    'rounded-lg border p-3 transition-all',
                    isRelevant
                      ? 'border-accent/30 bg-accent/5'
                      : 'border-border/20 bg-card opacity-60'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.fromColor }} />
                    <span className="text-xs font-semibold text-text-secondary">{t.from}</span>
                    <ArrowRight className="h-3 w-3 text-text-muted" />
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.toColor }} />
                    <span className="text-xs font-semibold text-text-secondary">{t.to}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <TransitionMetric label="Direct Award" delta={t.dDA.value} unit=" pts" />
                    <TransitionMetric label="Single Bid" delta={t.dSB.value} unit=" pts" />
                    <TransitionMetric label="High Risk" delta={t.dHR.value} unit=" pts" />
                    <TransitionMetric label="Contracts" delta={t.dContracts.value} unit="" isCount />
                    <TransitionMetric label="Vendors" delta={t.dVendors.value} unit="" isCount invertColor />
                  </div>
                </div>
              )
            })}
            {transitions.length === 0 && (
              <div className="py-8 text-center text-text-muted text-sm">
                Insufficient data for transition analysis
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* L6: Cases & Events Timeline */}
      <Card className="bg-card border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-text-primary">
            Corruption Cases & Events — {selectedAdmin} ({selectedMeta.dataStart}-{Math.min(selectedMeta.end - 1, 2025)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* Cases */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted tracking-wider uppercase mb-0.5">
                Documented Cases
              </h4>
              <p className="text-xs text-text-muted/70 italic mb-2">
                Manually verified from public records and ASF investigations — not ML-detected
              </p>
              {adminCases.length > 0 ? (
                <div className="space-y-2">
                  {adminCases.map((c) => (
                    <div
                      key={c.name}
                      className="flex items-start gap-3 rounded-md border border-border/20 bg-card-hover/30 p-2.5"
                    >
                      <div className="mt-0.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-risk-critical" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-text-primary">{c.name}</div>
                        <div className="text-xs text-text-muted font-mono mt-0.5">
                          {c.year} &middot; {c.type} &middot; {c.sector} &middot; {c.contracts > 0 ? `${formatNumber(c.contracts)} contracts` : 'No direct contracts'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-text-muted text-xs">
                  No documented corruption cases during this administration
                </div>
              )}
            </div>

            {/* Events */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted tracking-wider uppercase mb-2">
                Key Events
              </h4>
              {adminEvents.length > 0 ? (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {adminEvents.map((e) => {
                    const Icon = e.type === 'election' ? Landmark
                      : e.type === 'crisis' ? AlertTriangle
                      : e.type === 'audit' ? Shield
                      : Activity
                    return (
                      <div
                        key={e.id}
                        className="flex items-start gap-2 rounded-md border-l-2 border-border/30 pl-2 py-1"
                        style={{
                          borderLeftColor: e.impact === 'high' ? RISK_COLORS.critical : e.impact === 'medium' ? RISK_COLORS.medium : 'var(--color-border)',
                        }}
                      >
                        <Icon className="h-3 w-3 mt-0.5 text-text-muted flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs text-text-secondary leading-snug">{e.title}</div>
                          <div className="text-xs text-text-muted font-mono">{e.date}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-text-muted text-xs">
                  No events recorded for this period
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function StatCard({
  label, value, delta: deltaVal, unit, icon: Icon, color, invertDelta,
}: {
  label: string
  value: string
  delta: number | null
  unit?: string
  icon: React.ElementType
  color: string
  invertDelta?: boolean
}) {
  return (
    <Card className="bg-card border-border/40">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-xs font-mono text-text-muted uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-lg font-bold font-mono" style={{ color }}>
          {value}
        </div>
        {deltaVal !== null && (
          <div className="mt-0.5">
            <DeltaBadge val={deltaVal} unit={unit || ''} invertColor={invertDelta} />
            <span className="text-xs text-text-muted ml-1">vs avg</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function HeatCell({ value, max }: { value: number; max: number }) {
  // Intensity: 0 = green, max = red
  const ratio = Math.min(value / max, 1)
  const r = Math.round(200 * ratio + 40)
  const g = Math.round(200 * (1 - ratio) + 40)
  const bg = `rgba(${r}, ${g}, 60, 0.15)`
  const text = `rgb(${r}, ${g}, 60)`

  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-xs font-mono font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {value.toFixed(1)}%
    </span>
  )
}

function TransitionMetric({
  label, delta: d, unit, isCount, invertColor,
}: {
  label: string
  delta: number
  unit: string
  isCount?: boolean
  invertColor?: boolean
}) {
  return (
    <div className="text-center">
      <div className="text-xs text-text-muted font-mono uppercase">{label}</div>
      <div className="mt-0.5">
        {isCount ? (
          <DeltaBadge
            val={d}
            unit=""
            invertColor={invertColor}
          />
        ) : (
          <DeltaBadge val={d} unit={unit} invertColor={invertColor} />
        )}
      </div>
    </div>
  )
}
