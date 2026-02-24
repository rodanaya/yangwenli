import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCompactMXN, formatNumber, formatPercentSafe, formatDate, toTitleCase, formatCompactUSD, getRiskLevel } from '@/lib/utils'
import { vendorApi, networkApi } from '@/api/client'
import { RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import { parseFactorLabel, getFactorCategoryColor } from '@/lib/risk-factors'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { AddToWatchlistButton } from '@/components/AddToWatchlistButton'
import { NarrativeCard } from '@/components/NarrativeCard'
import { ContractDetailModal } from '@/components/ContractDetailModal'
import { buildVendorNarrative } from '@/lib/narratives'
import type { ContractListItem } from '@/api/types'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from '@/components/charts'
import {
  Users,
  Building2,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  DollarSign,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Shield,
  Network,
} from 'lucide-react'
import { NetworkGraphModal } from '@/components/NetworkGraphModal'
import { ScrollReveal, useCountUp, AnimatedFill } from '@/hooks/useAnimations'

export function VendorProfile() {
  const { id } = useParams<{ id: string }>()
  const vendorId = Number(id)
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [networkOpen, setNetworkOpen] = useState(false)

  // Fetch vendor details
  const { data: vendor, isLoading: vendorLoading, error: vendorError } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => vendorApi.getById(vendorId),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch vendor risk profile
  const { data: riskProfile, isLoading: riskLoading } = useQuery({
    queryKey: ['vendor', vendorId, 'risk-profile'],
    queryFn: () => vendorApi.getRiskProfile(vendorId),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch vendor's contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['vendor', vendorId, 'contracts'],
    queryFn: () => vendorApi.getContracts(vendorId, { per_page: 20 }),
    enabled: !!vendorId,
    staleTime: 2 * 60 * 1000,
  })

  // Fetch vendor's institutions
  const { data: institutions, isLoading: institutionsLoading } = useQuery({
    queryKey: ['vendor', vendorId, 'institutions'],
    queryFn: () => vendorApi.getInstitutions(vendorId),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch co-bidding analysis (v3.2)
  const { data: coBidders, isLoading: coBiddersLoading } = useQuery({
    queryKey: ['vendor', vendorId, 'co-bidders'],
    queryFn: () => networkApi.getCoBidders(vendorId, 5, 10),
    enabled: !!vendorId,
    staleTime: 10 * 60 * 1000,
  })

  // Determine if vendor has co-bidding risk
  const hasCoBiddingRisk = coBidders?.co_bidders?.some(
    (cb) => cb.relationship_strength === 'very_strong' || cb.relationship_strength === 'strong'
  ) || (coBidders?.suspicious_patterns?.length ?? 0) > 0

  // Compute yearly risk trend from contracts
  const riskTrendData = useMemo(() => {
    if (!contracts?.data?.length) return []
    const yearMap = new Map<number, { sum: number; count: number }>()
    for (const c of contracts.data) {
      const yr = c.contract_year
      if (!yr || c.risk_score == null) continue
      const entry = yearMap.get(yr) || { sum: 0, count: 0 }
      entry.sum += c.risk_score
      entry.count += 1
      yearMap.set(yr, entry)
    }
    return Array.from(yearMap.entries())
      .map(([year, { sum, count }]) => ({ year, avg: sum / count }))
      .sort((a, b) => a.year - b.year)
  }, [contracts])

  if (vendorLoading) {
    return <VendorProfileSkeleton />
  }

  if (vendorError || !vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold mb-2">Vendor Not Found</h2>
        <p className="text-text-muted mb-4">The requested vendor could not be found.</p>
        <Link to="/explore?tab=vendors">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Vendors
          </Button>
        </Link>
      </div>
    )
  }

  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_COLORS[riskLevel]
  const sectorColor = vendor.primary_sector_name
    ? SECTOR_COLORS[vendor.primary_sector_name.toLowerCase()] || SECTOR_COLORS.otros
    : SECTOR_COLORS.otros

  return (
    <div className="space-y-6 stagger-animate">
      <style>{`
        @keyframes vpSlideIn {
          from { opacity: 0; transform: translateY(-12px); filter: blur(3px); }
          to   { opacity: 1; transform: translateY(0);     filter: blur(0px); }
        }
        @keyframes vpFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Header — risk-colored left border */}
      <div
        className="flex items-start justify-between rounded-lg border bg-background-card p-4"
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: riskColor,
          animation: 'vpSlideIn 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        <div className="flex items-center gap-4">
          <Link to="/explore?tab=vendors">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${riskColor}15`, color: riskColor }}
            >
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{toTitleCase(vendor.name)}</h1>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                {vendor.rfc && <span className="font-mono">{vendor.rfc}</span>}
                {vendor.primary_sector_name && (
                  <>
                    <span>·</span>
                    <Badge
                      className="text-xs border"
                      style={{
                        backgroundColor: `${sectorColor}20`,
                        color: sectorColor,
                        borderColor: `${sectorColor}40`,
                      }}
                    >
                      {vendor.primary_sector_name}
                    </Badge>
                  </>
                )}
                {vendor.industry_name && (
                  <>
                    <span>·</span>
                    <span>{vendor.industry_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNetworkOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-background-elevated border border-border/40 text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
          >
            <Network className="h-3.5 w-3.5" />
            View Network
          </button>
          <AddToWatchlistButton
            itemType="vendor"
            itemId={vendorId}
            itemName={toTitleCase(vendor.name)}
            defaultReason={`Risk score: ${((vendor.avg_risk_score ?? 0) * 100).toFixed(0)}%`}
          />
          {vendor.avg_risk_score !== undefined && (
            <RiskBadge score={vendor.avg_risk_score} className="text-base px-3 py-1" />
          )}
        </div>
      </div>
      <NetworkGraphModal
        open={networkOpen}
        onOpenChange={setNetworkOpen}
        centerType="vendor"
        centerId={vendorId}
        centerName={toTitleCase(vendor.name)}
      />

      {/* Narrative summary */}
      <NarrativeCard
        paragraphs={buildVendorNarrative(vendor, riskProfile ?? null)}
        compact
      />

      {/* KPI Row — scroll-triggered stagger */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ScrollReveal delay={0} direction="up">
          <KPICard
            title="Total Contracts"
            value={vendor.total_contracts}
            icon={FileText}
            subtitle={`${vendor.first_contract_year || '-'} – ${vendor.last_contract_year || '-'}`}
          />
        </ScrollReveal>
        <ScrollReveal delay={80} direction="up">
          <KPICard
            title="Total Value"
            value={vendor.total_value_mxn}
            icon={DollarSign}
            format="currency"
            subtitle={formatCompactUSD(vendor.total_value_mxn)}
          />
        </ScrollReveal>
        <ScrollReveal delay={160} direction="up">
          <KPICard
            title="Institutions"
            value={vendor.total_institutions}
            icon={Building2}
            subtitle="Unique agencies"
          />
        </ScrollReveal>
        <ScrollReveal delay={240} direction="up">
          <KPICard
            title="High Risk"
            value={vendor.high_risk_pct}
            icon={AlertTriangle}
            format="percent_100"
            variant={vendor.high_risk_pct > 20 ? 'critical' : vendor.high_risk_pct > 10 ? 'warning' : 'default'}
          />
        </ScrollReveal>
      </div>

      {/* Co-Bidding Alert (v3.2) */}
      {!coBiddersLoading && hasCoBiddingRisk && (
        <Card className="border-amber-500/50 bg-amber-500/5 animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-risk-medium">
              <Users className="h-5 w-5" />
              Co-Bidding Pattern Detected <InfoTooltip termKey="cobidding" size={13} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4">
              This vendor frequently appears in the same procedures with specific partners.
              {coBidders?.suspicious_patterns?.length ? (
                <span className="text-risk-medium font-medium ml-1">
                  {coBidders.suspicious_patterns.length} suspicious pattern(s) detected.
                </span>
              ) : null}
            </p>

            {/* Co-bidding partners list */}
            {coBidders?.co_bidders && coBidders.co_bidders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Top Co-Bidding Partners
                </p>
                <div className="divide-y divide-border rounded-lg border overflow-hidden">
                  {coBidders.co_bidders.slice(0, 5).map((partner) => (
                    <div key={partner.vendor_id} className="flex items-center justify-between p-3 bg-background-card interactive">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-text-muted" />
                        <Link
                          to={`/vendors/${partner.vendor_id}`}
                          className="text-sm hover:text-accent transition-colors"
                        >
                          {toTitleCase(partner.vendor_name)}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted tabular-nums">
                          {partner.co_bid_count} shared procedures
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          partner.relationship_strength === 'very_strong' ? 'bg-risk-critical/20 text-risk-critical' :
                          partner.relationship_strength === 'strong' ? 'bg-risk-medium/20 text-risk-medium' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {partner.relationship_strength.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suspicious patterns */}
            {coBidders?.suspicious_patterns && coBidders.suspicious_patterns.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Detected Patterns
                </p>
                {coBidders.suspicious_patterns.map((pattern, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm font-medium text-risk-medium">
                      {pattern.pattern === 'potential_cover_bidding' ? 'Potential Cover Bidding' :
                       pattern.pattern === 'potential_bid_rotation' ? 'Potential Bid Rotation' :
                       pattern.pattern}
                    </p>
                    <p className="text-xs text-text-muted mt-1">{pattern.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Risk Profile */}
        <ScrollReveal direction="up" delay={0}>
        <div className="space-y-6">
          {/* Risk Score Gauge */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Risk Profile <InfoTooltip termKey="riskScore" size={13} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskLoading ? (
                <Skeleton className="h-48" />
              ) : riskProfile?.avg_risk_score !== undefined ? (
                <RiskGauge
                  score={riskProfile.avg_risk_score}
                  riskVsSectorAvg={riskProfile.risk_vs_sector_avg}
                  riskPercentile={riskProfile.risk_percentile}
                  riskTrend={riskProfile.risk_trend}
                />
              ) : null}
            </CardContent>
          </Card>

          {/* Risk Trend Mini-Chart */}
          {riskTrendData.length > 1 && (
            <Card className="hover-lift">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Risk Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[100px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={riskTrendData}>
                      <defs>
                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={riskColor} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload?.[0]) {
                            const d = payload[0].payload
                            return (
                              <div className="rounded border border-border bg-background-card px-2 py-1 text-xs shadow-lg">
                                <span className="font-medium">{d.year}</span>
                                <span className="ml-2 tabular-nums">{(d.avg * 100).toFixed(1)}%</span>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="avg"
                        stroke={riskColor}
                        fill="url(#riskGrad)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {riskProfile?.risk_trend && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-text-muted">
                    {riskProfile.risk_trend === 'worsening' && <TrendingUp className="h-3 w-3 text-risk-high" />}
                    {riskProfile.risk_trend === 'improving' && <TrendingDown className="h-3 w-3 text-risk-low" />}
                    {riskProfile.risk_trend === 'stable' && <Minus className="h-3 w-3" />}
                    <span className="capitalize">{riskProfile.risk_trend}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Statistical Anomaly */}
          {vendor.avg_mahalanobis != null && (
            <Card
              className="hover-lift"
              style={{
                borderColor: (vendor.pct_anomalous ?? 0) > 20
                  ? `${RISK_COLORS.critical}60`
                  : (vendor.pct_anomalous ?? 0) > 10
                    ? `${RISK_COLORS.high}60`
                    : undefined,
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Statistical Anomaly <InfoTooltip termKey="mahalanobisDistance" size={13} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Avg Mahalanobis D²</span>
                  <span className="font-mono tabular-nums">{vendor.avg_mahalanobis.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Max D²</span>
                  <span className="font-mono tabular-nums">{vendor.max_mahalanobis?.toFixed(1) ?? '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Anomalous Contracts</span>
                  <span className={`font-mono tabular-nums ${
                    (vendor.pct_anomalous ?? 0) > 20 ? 'text-risk-critical' :
                    (vendor.pct_anomalous ?? 0) > 10 ? 'text-risk-high' :
                    'text-text-secondary'
                  }`}>
                    {vendor.pct_anomalous?.toFixed(1) ?? '0'}%
                  </span>
                </div>
                <p className="text-xs text-text-muted pt-1">
                  Based on chi-squared test (k=12, p&lt;0.05)
                </p>
              </CardContent>
            </Card>
          )}

          {/* Risk Factor Breakdown */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="text-sm">Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              {riskLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-6" />
                  ))}
                </div>
              ) : riskProfile?.top_risk_factors?.length ? (
                <RiskFactorList factors={riskProfile.top_risk_factors} />
              ) : (
                <p className="text-sm text-text-muted">No risk factors available</p>
              )}
            </CardContent>
          </Card>

          {/* Procurement Patterns */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="text-sm">Procurement Patterns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PatternBar
                label="Direct Awards"
                value={vendor.direct_award_pct}
                isPercent100
              />
              <PatternBar
                label="Single Bids"
                value={vendor.single_bid_pct}
                isPercent100
              />
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Avg Contract</span>
                <span className="font-medium tabular-nums">{formatCompactMXN(vendor.avg_contract_value || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Sectors</span>
                <span className="font-medium tabular-nums">{String(vendor.sectors_count || 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        </ScrollReveal>

        {/* Right Column - Summary, Contracts, Institutions */}
        <ScrollReveal direction="up" delay={120} className="lg:col-span-2">
        <div className="space-y-6">
          {/* Vendor Summary */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Vendor Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <SummaryRow label="Primary Sector" value={vendor.primary_sector_name || 'Not classified'} />
                <SummaryRow label="Years Active" value={String(vendor.years_active)} />
                <SummaryRow label="Sectors Served" value={String(vendor.sectors_count)} />
                {vendor.vendor_group_id && (
                  <SummaryRow label="Vendor Group" value={vendor.group_name || `Group ${vendor.vendor_group_id}`} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Contracts */}
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Contracts
              </CardTitle>
              <Link to={`/contracts?vendor_id=${vendorId}`}>
                <Button variant="ghost" size="sm">
                  View all
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {contractsLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : contracts?.data.length ? (
                <ScrollArea className="h-[300px]">
                  <div className="divide-y divide-border">
                    {contracts.data.map((contract) => (
                      <ContractRow key={contract.id} contract={contract} onView={(cid) => { setSelectedContractId(cid); setIsDetailOpen(true) }} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-8 text-center text-text-muted">No contracts found</div>
              )}
            </CardContent>
          </Card>

          {/* Top Institutions */}
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Top Institutions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {institutionsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : institutions?.data?.length ? (
                <InstitutionList
                  data={institutions.data.slice(0, 5)}
                  maxValue={Math.max(...institutions.data.slice(0, 5).map((i: any) => i.total_value_mxn))}
                />
              ) : (
                <p className="text-sm text-text-muted">No institutions found</p>
              )}
            </CardContent>
          </Card>
        </div>
        </ScrollReveal>
      </div>
      <ContractDetailModal
        contractId={selectedContractId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface KPICardProps {
  title: string
  value?: number
  icon: React.ElementType
  format?: 'number' | 'currency' | 'percent' | 'percent_100'
  subtitle?: string
  variant?: 'default' | 'warning' | 'critical'
}

function KPICard({ title, value, icon: Icon, format = 'number', subtitle, variant = 'default' }: KPICardProps) {
  // Count-up for plain number format; other formats are formatted strings
  const target = (format === 'number' && value !== undefined) ? value : 0
  const decimals = format === 'percent_100' ? 1 : 0
  const { ref: countRef, value: animValue } = useCountUp(target, 1200, decimals)

  const formattedValue =
    value === undefined
      ? '-'
      : format === 'currency'
        ? formatCompactMXN(value)
        : format === 'percent'
          ? formatPercentSafe(value, true)
          : format === 'percent_100'
            ? formatPercentSafe(value, false)
            : formatNumber(Math.round(animValue))

  const borderClass =
    variant === 'critical' ? 'border-risk-critical/40' :
    variant === 'warning' ? 'border-risk-high/30' :
    undefined

  const iconBg =
    variant === 'critical' ? 'bg-risk-critical/10 text-risk-critical' :
    variant === 'warning' ? 'bg-risk-high/10 text-risk-high' :
    'bg-accent/10 text-accent'

  return (
    <Card className={`hover-lift ${borderClass || ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-muted">{title}</p>
            <p className="text-2xl font-bold tabular-nums text-text-primary">
              {format === 'number'
                ? <span ref={countRef}>{formattedValue}</span>
                : formattedValue
              }
            </p>
            {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RiskGauge({
  score,
  riskVsSectorAvg,
  riskPercentile,
  riskTrend,
}: {
  score: number
  riskVsSectorAvg?: number
  riskPercentile?: number
  riskTrend?: 'improving' | 'stable' | 'worsening'
}) {
  const percentage = Math.round(score * 100)
  const level = getRiskLevel(score)
  const label = level.charAt(0).toUpperCase() + level.slice(1)
  const color = RISK_COLORS[level]

  // Gauge zone boundaries (as % of circumference)
  const circumference = 2 * Math.PI * 40
  const zones = [
    { end: 10, color: RISK_COLORS.low },      // 0–10%
    { end: 30, color: RISK_COLORS.medium },    // 10–30%
    { end: 50, color: RISK_COLORS.high },      // 30–50%
    { end: 100, color: RISK_COLORS.critical }, // 50–100%
  ]

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Zone segments */}
          {zones.map((zone, i) => {
            const prevEnd = i === 0 ? 0 : zones[i - 1].end
            const start = (prevEnd / 100) * circumference
            const length = ((zone.end - prevEnd) / 100) * circumference
            return (
              <circle
                key={i}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={zone.color}
                strokeWidth="8"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-start}
                opacity={0.15}
              />
            )
          })}
          {/* Active arc */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${percentage * 2.51} 251`}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color}80)`,
              transition: 'stroke-dasharray 0.8s ease-out',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{percentage}</span>
          <span className="text-xs text-text-muted">/ 100</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }} />
        <span className="text-sm font-medium">{label} Risk</span>
        {riskTrend && (
          <>
            {riskTrend === 'worsening' && <TrendingUp className="h-3.5 w-3.5 text-risk-high ml-1" />}
            {riskTrend === 'improving' && <TrendingDown className="h-3.5 w-3.5 text-risk-low ml-1" />}
            {riskTrend === 'stable' && <Minus className="h-3.5 w-3.5 text-text-muted ml-1" />}
          </>
        )}
      </div>
      {/* Comparison metrics */}
      <div className="mt-3 space-y-1 text-center">
        {riskPercentile != null && (
          <p className="text-xs text-text-muted">
            Higher than <span className="font-medium text-text-secondary tabular-nums">{riskPercentile.toFixed(0)}%</span> of vendors
          </p>
        )}
        {riskVsSectorAvg != null && (
          <p className="text-xs text-text-muted">
            <span className={`font-medium tabular-nums ${riskVsSectorAvg > 0 ? 'text-risk-high' : 'text-risk-low'}`}>
              {riskVsSectorAvg > 0 ? '+' : ''}{(riskVsSectorAvg * 100).toFixed(1)}
            </span>
            {' '}vs sector avg
          </p>
        )}
      </div>
    </div>
  )
}

function RiskFactorList({ factors }: { factors: Array<{ factor: string; count: number; percentage: number }> }) {
  if (factors.length === 0) {
    return <p className="text-sm text-text-muted">No risk factors triggered</p>
  }

  return (
    <div className="space-y-3">
      {factors.map((f, i) => {
        const parsed = parseFactorLabel(f.factor)
        const barColor = getFactorCategoryColor(parsed.category)
        return (
          <div key={f.factor} title={f.factor}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-secondary">{parsed.label}</span>
              <span className="text-text-muted tabular-nums">{f.count} ({f.percentage.toFixed(1)}%)</span>
            </div>
            <AnimatedFill
              pct={Math.min(f.percentage, 100)}
              color={barColor}
              delay={i * 80}
              height="h-2"
            />
          </div>
        )
      })}
    </div>
  )
}

function PatternBar({ label, value, isPercent100 = false }: { label: string; value?: number; isPercent100?: boolean }) {
  const pct = value ?? 0
  const displayPct = isPercent100 ? pct : pct * 100
  const barPct = Math.min(displayPct, 100)
  const isHigh = displayPct > 50

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-muted">{label}</span>
        <span className={`font-medium tabular-nums ${isHigh ? 'text-risk-high' : 'text-text-secondary'}`}>
          {displayPct.toFixed(1)}%
        </span>
      </div>
      <AnimatedFill
        pct={barPct}
        color={isHigh ? RISK_COLORS.high : 'var(--color-accent)'}
        height="h-1.5"
      />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-background-elevated">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function InstitutionList({ data, maxValue }: { data: any[]; maxValue: number }) {
  return (
    <div className="space-y-2">
      {data.map((inst: any, i: number) => {
        const pct = maxValue > 0 ? (inst.total_value_mxn / maxValue) * 100 : 0
        return (
          <div
            key={inst.institution_id}
            className="relative flex items-center justify-between p-3 rounded-lg overflow-hidden interactive"
            style={{
              opacity: 0,
              animation: `vpFadeUp 500ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 70}ms both`,
            }}
          >
            {/* Background proportion bar */}
            <div
              className="absolute inset-y-0 left-0 bg-accent/5 rounded-lg"
              style={{ width: `${pct}%` }}
            />
            <div className="flex items-center gap-2 relative z-10 min-w-0">
              <Building2 className="h-4 w-4 text-text-muted flex-shrink-0" />
              <Link
                to={`/institutions/${inst.institution_id}`}
                className="text-sm hover:text-accent transition-colors truncate max-w-[250px]"
              >
                {toTitleCase(inst.institution_name)}
              </Link>
            </div>
            <div className="text-right relative z-10 flex-shrink-0">
              <p className="text-sm font-medium tabular-nums">{formatCompactMXN(inst.total_value_mxn)}</p>
              <p className="text-xs text-text-muted tabular-nums">{inst.contract_count} contracts</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ContractRow({ contract, onView }: { contract: ContractListItem; onView?: (id: number) => void }) {
  const riskLevel = contract.risk_score != null ? getRiskLevel(contract.risk_score) : null
  const borderColor = riskLevel ? RISK_COLORS[riskLevel] : 'transparent'

  return (
    <div
      className="flex items-center justify-between p-3 interactive cursor-pointer"
      style={{ borderLeft: `3px solid ${borderColor}` }}
      onClick={() => onView?.(contract.id)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-text-muted flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-[300px]">{contract.title || 'Untitled'}</p>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>{contract.contract_date ? formatDate(contract.contract_date) : contract.contract_year}</span>
            {contract.institution_name && (
              <>
                <span>·</span>
                <span className="truncate max-w-[150px]">{contract.institution_name}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <p className="text-sm font-medium tabular-nums">{formatCompactMXN(contract.amount_mxn)}</p>
        {contract.risk_score !== undefined && contract.risk_score !== null && (
          <RiskBadge score={contract.risk_score} />
        )}
      </div>
    </div>
  )
}

function VendorProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-80" />
        </div>
      </div>
    </div>
  )
}

export default VendorProfile
