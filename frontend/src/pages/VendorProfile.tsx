import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCompactMXN, formatNumber, formatPercentSafe, formatDate, toTitleCase, formatCompactUSD, getRiskLevel } from '@/lib/utils'
import { vendorApi, networkApi } from '@/api/client'
import { RISK_COLORS } from '@/lib/constants'
import type { ContractListItem } from '@/api/types'
import {
  Users,
  Building2,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  DollarSign,
  BarChart3,
} from 'lucide-react'

export function VendorProfile() {
  const { id } = useParams<{ id: string }>()
  const vendorId = Number(id)

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

  if (vendorLoading) {
    return <VendorProfileSkeleton />
  }

  if (vendorError || !vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold mb-2">Vendor Not Found</h2>
        <p className="text-text-muted mb-4">The requested vendor could not be found.</p>
        <Link to="/vendors">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Vendors
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to="/vendors">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{toTitleCase(vendor.name)}</h1>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                {vendor.rfc && <span className="font-mono">{vendor.rfc}</span>}
                {vendor.industry_name && (
                  <>
                    <span>•</span>
                    <span>{vendor.industry_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {vendor.avg_risk_score !== undefined && (
          <RiskBadge score={vendor.avg_risk_score} className="text-base px-3 py-1" />
        )}
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Contracts"
          value={vendor.total_contracts}
          icon={FileText}
          subtitle={`${vendor.first_contract_year || '-'} - ${vendor.last_contract_year || '-'}`}
        />
        <KPICard
          title="Total Value"
          value={vendor.total_value_mxn}
          icon={DollarSign}
          format="currency"
          subtitle={formatCompactUSD(vendor.total_value_mxn)}
        />
        <KPICard
          title="Institutions"
          value={vendor.total_institutions}
          icon={Building2}
          subtitle="Unique agencies"
        />
        <KPICard
          title="High Risk"
          value={vendor.high_risk_pct}
          icon={AlertTriangle}
          format="percent_100"
          variant={vendor.high_risk_pct > 20 ? 'warning' : 'default'}
        />
      </div>

      {/* Co-Bidding Alert (v3.2) */}
      {!coBiddersLoading && hasCoBiddingRisk && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Users className="h-5 w-5" />
              Co-Bidding Pattern Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4">
              This vendor frequently appears in the same procedures with specific partners.
              {coBidders?.suspicious_patterns?.length ? (
                <span className="text-amber-600 font-medium ml-1">
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
                    <div key={partner.vendor_id} className="flex items-center justify-between p-3 bg-background-card">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-text-muted" />
                        <Link
                          to={`/vendors/${partner.vendor_id}`}
                          className="text-sm hover:text-accent transition-colors"
                        >
                          {partner.vendor_name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted">
                          {partner.co_bid_count} shared procedures
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          partner.relationship_strength === 'very_strong' ? 'bg-red-500/20 text-red-600' :
                          partner.relationship_strength === 'strong' ? 'bg-amber-500/20 text-amber-600' :
                          'bg-gray-500/20 text-gray-600'
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
                    <p className="text-sm font-medium text-amber-600">
                      {pattern.pattern === 'potential_cover_bidding' ? '⚠️ Potential Cover Bidding' :
                       pattern.pattern === 'potential_bid_rotation' ? '⚠️ Potential Bid Rotation' :
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
        <div className="space-y-6">
          {/* Risk Score Gauge */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskLoading ? (
                <Skeleton className="h-48" />
              ) : riskProfile?.avg_risk_score !== undefined ? (
                <RiskGauge score={riskProfile.avg_risk_score} />
              ) : null}
            </CardContent>
          </Card>

          {/* Statistical Anomaly */}
          {vendor.avg_mahalanobis != null && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Statistical Anomaly
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Avg Mahalanobis D²</span>
                  <span className="font-mono">{vendor.avg_mahalanobis.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Max D²</span>
                  <span className="font-mono">{vendor.max_mahalanobis?.toFixed(1) ?? '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Anomalous Contracts</span>
                  <span className={`font-mono ${(vendor.pct_anomalous ?? 0) > 20 ? 'text-red-400' : (vendor.pct_anomalous ?? 0) > 10 ? 'text-amber-400' : 'text-text-secondary'}`}>
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
          <Card>
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

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Procurement Patterns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatRow label="Direct Awards" value={formatPercentSafe(vendor.direct_award_pct, false)} />
              <StatRow label="Single Bids" value={formatPercentSafe(vendor.single_bid_pct, false)} />
              <StatRow label="Avg Contract" value={formatCompactMXN(vendor.avg_contract_value || 0)} />
              <StatRow label="Sectors" value={String(vendor.sectors_count || 0)} />
            </CardContent>
          </Card>
        </div>

        {/* Center Column - Contracts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vendor Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Vendor Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-background-elevated">
                  <span className="text-sm text-text-muted">Primary Sector</span>
                  <span className="font-medium">{vendor.primary_sector_name || 'Not classified'}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-background-elevated">
                  <span className="text-sm text-text-muted">Years Active</span>
                  <span className="font-medium">{vendor.years_active}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-background-elevated">
                  <span className="text-sm text-text-muted">Sectors Served</span>
                  <span className="font-medium">{vendor.sectors_count}</span>
                </div>
                {vendor.vendor_group_id && (
                  <div className="flex justify-between items-center p-3 rounded-lg bg-background-elevated">
                    <span className="text-sm text-text-muted">Vendor Group</span>
                    <span className="font-medium">{vendor.group_name || `Group ${vendor.vendor_group_id}`}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Contracts */}
          <Card>
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
                      <ContractRow key={contract.id} contract={contract} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-8 text-center text-text-muted">No contracts found</div>
              )}
            </CardContent>
          </Card>

          {/* Top Institutions */}
          <Card>
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
                <div className="space-y-3">
                  {institutions.data.slice(0, 5).map((inst: any) => (
                    <div key={inst.institution_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-text-muted" />
                        <Link
                          to={`/institutions/${inst.institution_id}`}
                          className="text-sm hover:text-accent transition-colors truncate max-w-[250px]"
                        >
                          {inst.institution_name}
                        </Link>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">{formatCompactMXN(inst.total_value_mxn)}</p>
                        <p className="text-xs text-text-muted">{inst.contract_count} contracts</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No institutions found</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
  variant?: 'default' | 'warning'
}

function KPICard({ title, value, icon: Icon, format = 'number', subtitle, variant = 'default' }: KPICardProps) {
  const formattedValue =
    value === undefined
      ? '-'
      : format === 'currency'
        ? formatCompactMXN(value)
        : format === 'percent'
          ? formatPercentSafe(value, true)
          : format === 'percent_100'
            ? formatPercentSafe(value, false)
            : formatNumber(value)

  return (
    <Card className={variant === 'warning' ? 'border-risk-high/30' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-muted">{title}</p>
            <p className="text-2xl font-bold tabular-nums text-text-primary">{formattedValue}</p>
            {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              variant === 'warning' ? 'bg-risk-high/10 text-risk-high' : 'bg-accent/10 text-accent'
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RiskGauge({ score }: { score: number }) {
  const percentage = Math.round(score * 100)
  const level = getRiskLevel(score)
  const label = level.charAt(0).toUpperCase() + level.slice(1)
  const color = RISK_COLORS[level]

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-background-elevated"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${percentage * 2.51} 251`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{percentage}</span>
          <span className="text-xs text-text-muted">/ 100</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium">{label} Risk</span>
      </div>
    </div>
  )
}

function RiskFactorList({ factors }: { factors: Array<{ factor: string; count: number; percentage: number }> }) {
  // v3.2 updated factor labels
  const factorLabels: Record<string, string> = {
    single_bid: 'Single Bid',
    direct_award: 'Direct Award',
    restricted_procedure: 'Restricted Procedure',
    price_anomaly: 'Price Anomaly',
    price_hyp: 'Price Hypothesis',
    vendor_concentration: 'Vendor Concentration',
    concentration: 'Concentration',
    year_end: 'Year-End Timing',
    short_ad: 'Short Ad Period',
    short_ad_period: 'Short Ad Period',
    threshold_split: 'Threshold Splitting',
    split: 'Threshold Splitting',
    network_risk: 'Network Risk',
    network: 'Network Risk',
    co_bid: 'Co-Bidding Pattern',
    co_bid_high: 'High Co-Bidding Risk',
    co_bid_med: 'Medium Co-Bidding Risk',
    industry_mismatch: 'Industry Mismatch',
    inst_risk: 'Institution Risk',
  }

  if (factors.length === 0) {
    return <p className="text-sm text-text-muted">No risk factors triggered</p>
  }

  return (
    <div className="space-y-2">
      {factors.map((f) => (
        <div key={f.factor} className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span>{factorLabels[f.factor] || f.factor}</span>
              <span className="text-text-muted">{f.count} ({f.percentage.toFixed(1)}%)</span>
            </div>
            <div className="h-1.5 bg-background-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-risk-high rounded-full"
                style={{ width: `${f.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function ContractRow({ contract }: { contract: ContractListItem }) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-background-elevated/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-text-muted flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-[300px]">{contract.title || 'Untitled'}</p>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>{contract.contract_date ? formatDate(contract.contract_date) : contract.contract_year}</span>
            {contract.institution_name && (
              <>
                <span>•</span>
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
