import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  formatCompactMXN,
  formatCompactUSD,
  formatNumber,
  formatPercentSafe,
  formatDate,
  toTitleCase,
  cn,
} from '@/lib/utils'
import { institutionApi } from '@/api/client'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { NarrativeCard } from '@/components/NarrativeCard'
import { ContractDetailModal } from '@/components/ContractDetailModal'
import { AddToWatchlistButton } from '@/components/AddToWatchlistButton'
import { buildInstitutionNarrative } from '@/lib/narratives'
import type { ContractListItem, InstitutionVendorItem } from '@/api/types'
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  DollarSign,
  Network,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Brain,
  ChevronRight,
} from 'lucide-react'
import { NetworkGraphModal } from '@/components/NetworkGraphModal'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from '@/components/charts'

// ─── Risk level palette ───────────────────────────────────────────────────────
const LEVEL_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#16a34a',
  unknown: '#64748b',
}

const LEVEL_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  unknown: 'Unknown',
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InstitutionProfile() {
  const { id } = useParams<{ id: string }>()
  const institutionId = Number(id)
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [networkOpen, setNetworkOpen] = useState(false)

  const { data: institution, isLoading: institutionLoading, error: institutionError } = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: () => institutionApi.getById(institutionId),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: riskProfile, isLoading: riskProfileLoading } = useQuery({
    queryKey: ['institution', institutionId, 'risk-profile'],
    queryFn: () => institutionApi.getRiskProfile(institutionId),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: riskTimeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['institution', institutionId, 'risk-timeline'],
    queryFn: () => institutionApi.getRiskTimeline(institutionId),
    enabled: !!institutionId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['institution', institutionId, 'vendors'],
    queryFn: () => institutionApi.getVendors(institutionId, 15),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: recentContracts, isLoading: recentLoading } = useQuery({
    queryKey: ['institution', institutionId, 'contracts', 'recent'],
    queryFn: () => institutionApi.getContracts(institutionId, { per_page: 10 }),
    enabled: !!institutionId,
    staleTime: 2 * 60 * 1000,
  })

  const { data: highRiskContracts, isLoading: highRiskLoading } = useQuery({
    queryKey: ['institution', institutionId, 'contracts', 'high-risk'],
    queryFn: () => institutionApi.getContracts(institutionId, {
      per_page: 10,
      sort_by: 'risk_score',
      sort_order: 'desc',
    }),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  })

  const { data: vendorLoyalty, isLoading: loyaltyLoading } = useQuery({
    queryKey: ['institution', institutionId, 'vendor-loyalty'],
    queryFn: () => institutionApi.getVendorLoyalty(institutionId, 10),
    enabled: !!institutionId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: peerComparison, isLoading: peerLoading } = useQuery({
    queryKey: ['institution', institutionId, 'peer-comparison'],
    queryFn: () => institutionApi.getPeerComparison(institutionId),
    enabled: !!institutionId,
    staleTime: 10 * 60 * 1000,
  })

  // ── Derived values ──────────────────────────────────────────────────────────

  const riskScore = institution?.risk_baseline ?? institution?.avg_risk_score ?? 0
  const riskLevel = getRiskLevelFromScore(riskScore)
  const riskColor = RISK_COLORS[riskLevel] ?? '#64748b'

  // Timeline trend: compare last 3 years to previous 3 years
  const timelineTrend = useMemo(() => {
    const pts = riskTimeline?.timeline ?? []
    if (pts.length < 4) return null
    const last3 = pts.slice(-3).map((p) => p.avg_risk_score ?? 0)
    const prev3 = pts.slice(-6, -3).map((p) => p.avg_risk_score ?? 0)
    if (!prev3.length) return null
    const avgLast = last3.reduce((a, b) => a + b, 0) / last3.length
    const avgPrev = prev3.reduce((a, b) => a + b, 0) / prev3.length
    const delta = avgLast - avgPrev
    if (Math.abs(delta) < 0.01) return { direction: 'stable', delta }
    return { direction: delta > 0 ? 'up' : 'down', delta }
  }, [riskTimeline])

  // Risk distribution from profile
  const riskDistribution = useMemo(() => {
    const byLevel = riskProfile?.contracts_by_risk_level ?? {}
    const total = Object.values(byLevel).reduce((s, n) => s + n, 0)
    if (total === 0) return []
    return (['critical', 'high', 'medium', 'low'] as const)
      .filter((lvl) => (byLevel[lvl] ?? 0) > 0)
      .map((lvl) => ({
        level: lvl,
        count: byLevel[lvl] ?? 0,
        pct: ((byLevel[lvl] ?? 0) / total) * 100,
        color: LEVEL_COLORS[lvl],
        label: LEVEL_LABELS[lvl],
      }))
  }, [riskProfile])

  // ── Loading / error states ──────────────────────────────────────────────────

  if (institutionLoading) return <InstitutionProfileSkeleton />

  if (institutionError || !institution) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold mb-2">Institution Not Found</h2>
        <p className="text-text-muted mb-4">The requested institution could not be found.</p>
        <Link to="/institutions/health">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Institutions
          </Button>
        </Link>
      </div>
    )
  }

  const totalContracts = institution.total_contracts ?? riskProfile?.total_contracts ?? 0
  const totalValue = institution.total_amount_mxn ?? riskProfile?.total_value ?? 0
  const highRiskPct = institution.high_risk_percentage ?? institution.high_risk_pct
  const vendorCount = institution.vendor_count ?? vendors?.total ?? 0

  return (
    <div className="space-y-5">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-background-card p-4"
        style={{ borderLeftWidth: '4px', borderLeftColor: riskColor }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/institutions/health">
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0"
            style={{ backgroundColor: `${riskColor}18`, color: riskColor }}
          >
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{toTitleCase(institution.name)}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {institution.siglas && (
                <span className="text-xs font-mono font-bold text-accent">{institution.siglas}</span>
              )}
              {institution.institution_type && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                  {institution.institution_type.replace(/_/g, ' ')}
                </Badge>
              )}
              {institution.geographic_scope && (
                <span className="text-xs text-text-muted">{institution.geographic_scope}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setNetworkOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 transition-colors font-medium"
          >
            <Network className="h-3.5 w-3.5" />
            View Network
          </button>
          <Link to={`/contracts?institution_id=${institutionId}`}>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border/40 bg-background-elevated text-text-secondary hover:text-text-primary transition-colors">
              <FileText className="h-3.5 w-3.5" />
              All Contracts
            </button>
          </Link>
          <AddToWatchlistButton
            itemType="institution"
            itemId={institutionId}
            itemName={toTitleCase(institution.name)}
          />
          <RiskBadge score={riskScore} className="text-sm px-2.5 py-1" />
        </div>
      </div>

      <NetworkGraphModal
        open={networkOpen}
        onOpenChange={setNetworkOpen}
        centerType="institution"
        centerId={institutionId}
        centerName={toTitleCase(institution.name)}
      />

      {/* ── KPI STRIP ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiChip
          label="Total Contracts"
          value={formatNumber(totalContracts)}
          icon={FileText}
          iconColor="text-accent"
        />
        <KpiChip
          label="Total Spending"
          value={formatCompactMXN(totalValue)}
          sub={formatCompactUSD(totalValue)}
          icon={DollarSign}
          iconColor="text-accent"
        />
        <KpiChip
          label="High-Risk %"
          value={highRiskPct != null ? formatPercentSafe(highRiskPct, false) : '—'}
          icon={AlertTriangle}
          iconColor={(highRiskPct ?? 0) > 20 ? 'text-risk-critical' : (highRiskPct ?? 0) > 10 ? 'text-risk-high' : 'text-text-muted'}
          highlight={(highRiskPct ?? 0) > 20}
        />
        <KpiChip
          label="Risk Baseline"
          value={formatPercentSafe(riskScore, true)}
          icon={Shield}
          iconColor={riskColor}
          style={{ color: riskColor }}
        />
        <KpiChip
          label="Unique Vendors"
          value={formatNumber(vendorCount)}
          icon={Users}
          iconColor="text-text-muted"
        />
      </div>

      {/* ── AI INTELLIGENCE BRIEF ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-1">
        <Brain className="h-3.5 w-3.5 text-accent" />
        <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
          AI Intelligence Brief
        </span>
      </div>
      <NarrativeCard
        paragraphs={buildInstitutionNarrative(institution, vendors?.data ?? null)}
        compact
      />

      {/* ── MAIN GRID ──────────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* LEFT COLUMN */}
        <div className="space-y-4">

          {/* Risk Distribution */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <Shield className="h-3.5 w-3.5 text-accent" />
                Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {riskProfileLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6" />)}
                </div>
              ) : riskDistribution.length > 0 ? (
                <div className="space-y-2.5">
                  {riskDistribution.map((r) => (
                    <div key={r.level}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                          <span className="text-xs text-text-secondary">{r.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-text-muted">{formatNumber(r.count)}</span>
                          <span className="text-xs font-bold font-mono" style={{ color: r.color }}>
                            {r.pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-background-elevated overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${r.pct}%`, backgroundColor: r.color }}
                        />
                      </div>
                    </div>
                  ))}
                  {riskProfile?.effective_risk != null && (
                    <div className="mt-3 pt-3 border-t border-border/30 flex justify-between text-xs">
                      <span className="text-text-muted">Effective Risk Score</span>
                      <span className="font-bold font-mono" style={{ color: riskColor }}>
                        {formatPercentSafe(riskProfile.effective_risk, true)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-muted">No risk data available</p>
              )}
            </CardContent>
          </Card>

          {/* Institution Details */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <Building2 className="h-3.5 w-3.5 text-accent" />
                Institution Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-2">
              <DetailRow label="Type" value={institution.institution_type?.replace(/_/g, ' ')} />
              <DetailRow label="Size Tier" value={institution.size_tier} />
              <DetailRow label="Autonomy" value={institution.autonomy_level} />
              <DetailRow label="Scope" value={institution.geographic_scope} />
              <DetailRow label="Data Quality" value={institution.data_quality_grade} />
              {institution.avg_contract_value != null && (
                <DetailRow label="Avg Contract" value={formatCompactMXN(institution.avg_contract_value)} />
              )}
              {riskProfile != null && (
                <>
                  <div className="pt-1 border-t border-border/30" />
                  <DetailRow label="Risk Baseline" value={formatPercentSafe(riskProfile.risk_baseline, true)} valueColor={riskColor} />
                  <DetailRow label="Size Adjustment" value={`${riskProfile.size_risk_adjustment >= 0 ? '+' : ''}${(riskProfile.size_risk_adjustment * 100).toFixed(0)}pp`} />
                  <DetailRow label="Autonomy Risk" value={formatPercentSafe(riskProfile.autonomy_risk_baseline, true)} />
                </>
              )}
            </CardContent>
          </Card>

          {/* Peer Comparison */}
          {(peerLoading || peerComparison) && (
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <Users className="h-3.5 w-3.5 text-accent" />
                Peer Comparison
                {peerComparison && (
                  <span className="ml-auto text-[10px] font-normal text-text-muted normal-case">
                    vs {peerComparison.peer_count} peers
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {peerLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="space-y-1"><div className="h-3 w-24 bg-background-elevated rounded" /><div className="h-2 bg-background-elevated rounded" /></div>)}
                </div>
              ) : peerComparison?.metrics?.length ? (
                <div className="space-y-3.5">
                  {peerComparison.metrics.map((m) => {
                    const pct = m.percentile
                    const isWorse = pct > 75
                    const isBetter = pct < 25
                    const markerColor = isWorse ? '#dc2626' : isBetter ? '#16a34a' : '#eab308'
                    return (
                      <div key={m.metric}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-text-secondary">{m.label}</span>
                          <span className="text-xs font-mono font-bold" style={{ color: markerColor }}>
                            P{pct}
                          </span>
                        </div>
                        {/* Strip: full width = peer range, shaded band = p25-p75, marker = this institution */}
                        <div className="relative h-2 rounded-full bg-background-elevated overflow-visible">
                          {/* IQR band */}
                          <div
                            className="absolute top-0 h-full rounded-full bg-text-muted/20"
                            style={{
                              left: `${m.peer_p25}%`,
                              width: `${m.peer_p75 - m.peer_p25}%`,
                            }}
                          />
                          {/* Median line */}
                          <div
                            className="absolute top-0 h-full w-px bg-text-muted/50"
                            style={{ left: `${m.peer_median}%` }}
                          />
                          {/* This institution marker */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-3 w-1.5 rounded-sm"
                            style={{ left: `${pct}%`, backgroundColor: markerColor }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5 text-[10px] text-text-muted/60 font-mono">
                          <span>min</span>
                          <span>median</span>
                          <span>max</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted">Insufficient peers for comparison</p>
              )}
            </CardContent>
          </Card>
          )}

        </div>

        {/* RIGHT COLUMN (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Risk Trajectory */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <TrendingUp className="h-3.5 w-3.5 text-accent" />
                  Risk Trajectory — Year over Year
                </CardTitle>
                {timelineTrend && (
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-full',
                    timelineTrend.direction === 'up' ? 'bg-risk-critical/10 text-risk-critical' :
                    timelineTrend.direction === 'down' ? 'bg-green-500/10 text-green-500' :
                    'bg-text-muted/10 text-text-muted'
                  )}>
                    {timelineTrend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> :
                     timelineTrend.direction === 'down' ? <TrendingDown className="h-3 w-3" /> :
                     <Minus className="h-3 w-3" />}
                    {timelineTrend.direction === 'up' ? 'Worsening' :
                     timelineTrend.direction === 'down' ? 'Improving' : 'Stable'}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              {timelineLoading ? (
                <Skeleton className="h-40" />
              ) : (riskTimeline?.timeline?.length ?? 0) > 1 ? (
                <RiskTimelineChart
                  data={riskTimeline!.timeline}
                  riskColor={riskColor}
                />
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-text-muted">
                  Insufficient timeline data
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Vendors */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <Users className="h-3.5 w-3.5 text-accent" />
                Top Vendors by Spending
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {vendorsLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : vendors?.data?.length ? (
                <VendorRankedList
                  vendors={vendors.data.slice(0, 10)}
                  totalValue={totalValue}
                />
              ) : (
                <p className="text-sm text-text-muted">No vendor data available</p>
              )}
            </CardContent>
          </Card>

          {/* Vendor Loyalty Heatmap */}
          {(loyaltyLoading || (vendorLoyalty?.vendors?.length ?? 0) > 0) && (
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
                Vendor Loyalty — Long-term Relationships
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {loyaltyLoading ? (
                <Skeleton className="h-32" />
              ) : vendorLoyalty && vendorLoyalty.vendors.length > 0 ? (
                <div className="overflow-x-auto">
                  {/* Show last 8 years as columns */}
                  {(() => {
                    const allYears = vendorLoyalty.year_range ?? []
                    const displayYears = allYears.slice(-8)
                    const topVendors = vendorLoyalty.vendors.slice(0, 8)
                    return (
                      <table className="w-full border-separate" style={{ borderSpacing: 2 }}>
                        <thead>
                          <tr>
                            <th className="text-left text-[10px] text-text-muted font-normal pb-1 pr-2 min-w-[100px]">Vendor</th>
                            {displayYears.map((yr) => (
                              <th key={yr} className="text-center text-[10px] text-text-muted font-mono font-normal pb-1 min-w-[28px]">{yr}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {topVendors.map((v) => {
                            const yearMap = new Map(v.years.map((y) => [y.year, y]))
                            return (
                              <tr key={v.vendor_id}>
                                <td className="pr-2 py-0.5">
                                  <Link to={`/vendors/${v.vendor_id}`} className="text-[10px] text-text-secondary hover:text-accent truncate block max-w-[100px]" title={v.vendor_name}>
                                    {v.vendor_name.length > 16 ? v.vendor_name.slice(0, 16) + '…' : v.vendor_name}
                                  </Link>
                                </td>
                                {displayYears.map((yr) => {
                                  const cell = yearMap.get(yr)
                                  const risk = cell?.avg_risk ?? 0
                                  const count = cell?.contract_count ?? 0
                                  const intensity = Math.min(1, risk / 0.5)
                                  const r = Math.round(74 + (248 - 74) * intensity)
                                  const g = Math.round(222 + (113 - 222) * intensity)
                                  const b = Math.round(128 + (113 - 128) * intensity)
                                  const color = `rgb(${r},${g},${b})`
                                  return (
                                    <td key={yr} className="p-0">
                                      <div
                                        className="h-6 w-full rounded flex items-center justify-center text-[9px] font-mono"
                                        style={{
                                          backgroundColor: count > 0 ? `${color}30` : 'transparent',
                                          border: count > 0 ? `1px solid ${color}50` : '1px solid transparent',
                                          color: count > 0 ? color : 'transparent',
                                        }}
                                        title={count > 0 ? `${count} contracts · risk ${(risk * 100).toFixed(0)}%` : 'No contracts'}
                                      >
                                        {count > 0 ? count : ''}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )
                  })()}
                  <p className="mt-2 text-[10px] text-text-muted/50 italic">Cells show contract count · color = avg risk score</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
          )}

          {/* High-Risk Contracts */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
                  Highest Risk Contracts
                </CardTitle>
                <Link
                  to={`/contracts?institution_id=${institutionId}&sort_by=risk_score&sort_order=desc`}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  View all
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-1">
              {highRiskLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : highRiskContracts?.data?.length ? (
                <div className="divide-y divide-border/30">
                  {highRiskContracts.data.slice(0, 8).map((contract) => (
                    <ContractRow
                      key={contract.id}
                      contract={contract}
                      onView={(cid) => { setSelectedContractId(cid); setIsDetailOpen(true) }}
                    />
                  ))}
                </div>
              ) : (
                <p className="p-4 text-sm text-text-muted">No contracts found</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Contracts */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-text-secondary font-mono">
                  <FileText className="h-3.5 w-3.5 text-accent" />
                  Recent Contracts
                </CardTitle>
                <Link
                  to={`/contracts?institution_id=${institutionId}`}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  View all
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-1">
              {recentLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : recentContracts?.data?.length ? (
                <ScrollArea className="max-h-[280px]">
                  <div className="divide-y divide-border/30">
                    {recentContracts.data.map((contract) => (
                      <ContractRow
                        key={contract.id}
                        contract={contract}
                        onView={(cid) => { setSelectedContractId(cid); setIsDetailOpen(true) }}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="p-4 text-sm text-text-muted">No contracts found</p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      <ContractDetailModal
        contractId={selectedContractId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiChip({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  highlight,
  style,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  iconColor: string
  highlight?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div className={cn(
      'rounded-lg border bg-background-card p-3 space-y-0.5',
      highlight ? 'border-risk-critical/30' : 'border-border/40'
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <Icon className={cn('h-3.5 w-3.5', iconColor)} />
      </div>
      <p className="text-lg font-black tabular-nums font-mono text-text-primary leading-none" style={style}>
        {value}
      </p>
      {sub && <p className="text-xs text-text-muted font-mono">{sub}</p>}
    </div>
  )
}

function DetailRow({ label, value, valueColor }: { label: string; value?: string | null; valueColor?: string }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text-primary capitalize" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
    </div>
  )
}

// ─── Risk Timeline Chart ───────────────────────────────────────────────────────

function RiskTimelineChart({
  data,
  riskColor,
}: {
  data: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  riskColor: string
}) {
  const chartData = data.map((pt) => ({
    year: pt.year,
    risk: pt.avg_risk_score != null ? Math.round(pt.avg_risk_score * 1000) / 10 : null,
    contracts: pt.contract_count,
    value: pt.total_value,
  }))

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`riskGrad-${riskColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={riskColor} stopOpacity={0.25} />
              <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
            width={32}
          />
          <RechartsTooltip
            content={({ active, payload, label }) => {
              if (active && payload?.length) {
                const risk = payload[0]?.value
                const contracts = payload[0]?.payload?.contracts
                const value = payload[0]?.payload?.value
                return (
                  <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg space-y-1">
                    <p className="font-bold text-text-primary">{label}</p>
                    <p style={{ color: riskColor }}>Risk: {risk != null ? `${risk}%` : '—'}</p>
                    <p className="text-text-muted">{formatNumber(contracts)} contracts</p>
                    <p className="text-text-muted">{formatCompactMXN(value)}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="risk"
            stroke={riskColor}
            strokeWidth={2}
            fill={`url(#riskGrad-${riskColor.replace('#', '')})`}
            dot={{ fill: riskColor, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Vendor Ranked List ────────────────────────────────────────────────────────

function VendorRankedList({
  vendors,
  totalValue,
}: {
  vendors: InstitutionVendorItem[]
  totalValue: number
}) {
  const maxValue = vendors[0]?.total_value_mxn ?? 1
  return (
    <div className="space-y-1">
      {vendors.map((v, i) => {
        const pct = totalValue > 0 ? (v.total_value_mxn / totalValue) * 100 : 0
        const barW = (v.total_value_mxn / maxValue) * 100
        const riskLvl = v.avg_risk_score != null ? getRiskLevelFromScore(v.avg_risk_score) : null
        const riskClr = riskLvl ? RISK_COLORS[riskLvl] : null
        return (
          <Link
            key={v.vendor_id}
            to={`/vendors/${v.vendor_id}`}
            className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-background-elevated/50 transition-colors"
          >
            <span className="text-xs font-mono text-text-muted w-4 text-right flex-shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                  {toTitleCase(v.vendor_name)}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono text-text-muted">{formatCompactMXN(v.total_value_mxn)}</span>
                  <span className="text-xs font-mono text-text-muted w-8 text-right">{pct.toFixed(0)}%</span>
                  {riskClr && v.avg_risk_score != null && (
                    <span
                      className="text-xs font-bold font-mono w-8 text-right"
                      style={{ color: riskClr }}
                    >
                      {(v.avg_risk_score * 100).toFixed(0)}%
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="h-1 rounded-full bg-background-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent/40 group-hover:bg-accent/60 transition-colors"
                  style={{ width: `${barW}%` }}
                />
              </div>
            </div>
          </Link>
        )
      })}
      <div className="pt-2 text-xs text-text-muted text-right font-mono">
        {vendors.length > 0 && (
          <span>
            Top {vendors.length} of {formatNumber(vendors.length)} shown
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Contract Row ──────────────────────────────────────────────────────────────

function ContractRow({ contract, onView }: { contract: ContractListItem; onView?: (id: number) => void }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 hover:bg-background-elevated/40 transition-colors cursor-pointer"
      onClick={() => onView?.(contract.id)}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate max-w-[260px] text-text-primary">{contract.title || 'Untitled'}</p>
          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
            <span>{contract.contract_date ? formatDate(contract.contract_date) : contract.contract_year}</span>
            {contract.vendor_name && (
              <>
                <span>·</span>
                <span className="truncate max-w-[120px]">{toTitleCase(contract.vendor_name)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
        <div className="text-right">
          <p className="text-xs font-mono font-medium tabular-nums text-text-primary">{formatCompactMXN(contract.amount_mxn)}</p>
          <p className="text-xs font-mono text-text-muted tabular-nums">{formatCompactUSD(contract.amount_mxn)}</p>
        </div>
        {contract.risk_score != null && (
          <RiskBadge score={contract.risk_score} className="text-xs px-1.5 py-0" />
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function InstitutionProfileSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[72px]" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
      <Skeleton className="h-16" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-48" />
          <Skeleton className="h-56" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  )
}

export default InstitutionProfile
