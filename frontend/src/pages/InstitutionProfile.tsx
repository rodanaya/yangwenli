import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCompactMXN, formatCompactUSD, formatNumber, formatPercentSafe, formatDate, toTitleCase } from '@/lib/utils'
import { institutionApi } from '@/api/client'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { NarrativeCard } from '@/components/NarrativeCard'
import { ContractDetailModal } from '@/components/ContractDetailModal'
import { AddToWatchlistButton } from '@/components/AddToWatchlistButton'
import { buildInstitutionNarrative } from '@/lib/narratives'
import type { ContractListItem } from '@/api/types'
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  DollarSign,
  BarChart3,
  Network,
} from 'lucide-react'
import { NetworkGraphModal } from '@/components/NetworkGraphModal'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from '@/components/charts'

export function InstitutionProfile() {
  const { id } = useParams<{ id: string }>()
  const institutionId = Number(id)
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [networkOpen, setNetworkOpen] = useState(false)

  // Fetch institution details
  const { data: institution, isLoading: institutionLoading, error: institutionError } = useQuery({
    queryKey: ['institution', institutionId],
    queryFn: () => institutionApi.getById(institutionId),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch institution's contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['institution', institutionId, 'contracts'],
    queryFn: () => institutionApi.getContracts(institutionId, { per_page: 20 }),
    enabled: !!institutionId,
    staleTime: 2 * 60 * 1000,
  })

  // Fetch institution's top vendors
  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['institution', institutionId, 'vendors'],
    queryFn: () => institutionApi.getVendors(institutionId),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  })

  if (institutionLoading) {
    return <InstitutionProfileSkeleton />
  }

  if (institutionError || !institution) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold mb-2">Institution Not Found</h2>
        <p className="text-text-muted mb-4">The requested institution could not be found.</p>
        <Link to="/explore?tab=institutions">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Institutions
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
          <Link to="/explore?tab=institutions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sector-gobernacion/10 text-sector-gobernacion">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{toTitleCase(institution.name)}</h1>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                {institution.siglas && <span className="font-medium">{institution.siglas}</span>}
                {institution.institution_type && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      {institution.institution_type.replace(/_/g, ' ')}
                    </Badge>
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
            itemType="institution"
            itemId={institutionId}
            itemName={toTitleCase(institution.name)}
          />
          {institution.risk_baseline !== undefined && (
            <RiskBadge score={institution.risk_baseline} className="text-base px-3 py-1" />
          )}
        </div>
      </div>
      <NetworkGraphModal
        open={networkOpen}
        onOpenChange={setNetworkOpen}
        centerType="institution"
        centerId={institutionId}
        centerName={toTitleCase(institution.name)}
      />

      {/* Narrative Summary */}
      <NarrativeCard
        paragraphs={buildInstitutionNarrative(institution, vendors?.data ?? null)}
        compact
      />

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Contracts"
          value={institution.total_contracts}
          icon={FileText}
          subtitle="All time"
        />
        <KPICard
          title="Total Spending"
          value={institution.total_amount_mxn}
          icon={DollarSign}
          format="currency"
          subtitle="Contract value"
        />
        <KPICard
          title="High Risk Contracts"
          value={institution.high_risk_contract_count}
          icon={AlertTriangle}
          subtitle={institution.high_risk_percentage !== undefined ? `${formatPercentSafe(institution.high_risk_percentage, true)} of total` : undefined}
        />
        <KPICard
          title="Risk Baseline"
          value={institution.risk_baseline}
          icon={Users}
          format="percent"
          variant={(institution.risk_baseline || 0) > 0.25 ? 'warning' : 'default'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Institution Info */}
        <div className="space-y-6">
          {/* Institution Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Institution Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatRow label="Type" value={institution.institution_type?.replace(/_/g, ' ') || '-'} />
              <StatRow label="Size Tier" value={institution.size_tier || '-'} />
              <StatRow label="Autonomy Level" value={institution.autonomy_level || '-'} />
              <StatRow label="Geographic Scope" value={institution.geographic_scope || '-'} />
            </CardContent>
          </Card>

          {/* Risk Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Risk Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatRow label="Risk Baseline" value={formatPercentSafe(institution.risk_baseline, true) || '-'} />
              <StatRow label="Size Risk Adj." value={formatPercentSafe(institution.size_risk_adjustment, true) || '-'} />
              <StatRow label="High Risk %" value={formatPercentSafe(institution.high_risk_percentage, true) || '-'} />
              <StatRow label="Data Quality" value={institution.data_quality_grade || '-'} />
            </CardContent>
          </Card>

          {/* Risk Score Gauge */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RiskGauge score={institution.risk_baseline || 0} />
            </CardContent>
          </Card>
        </div>

        {/* Center Column - Charts and Contracts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Vendors */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Top Vendors by Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendorsLoading ? (
                <Skeleton className="h-48" />
              ) : vendors?.data?.length ? (
                <TopVendorsChart data={vendors.data.slice(0, 8)} />
              ) : (
                <p className="text-sm text-text-muted">No vendor data available</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Contracts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Contracts
              </CardTitle>
              <Link to={`/contracts?institution_id=${institutionId}`}>
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

          {/* Vendor Concentration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Vendor Concentration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vendorsLoading ? (
                <Skeleton className="h-32" />
              ) : vendors?.data?.length ? (
                <VendorConcentration data={vendors.data} total={institution.total_amount_mxn || 0} />
              ) : (
                <p className="text-sm text-text-muted">No vendor data available</p>
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

// ============================================================================
// Sub-components
// ============================================================================

interface KPICardProps {
  title: string
  value?: number
  icon: React.ElementType
  format?: 'number' | 'currency' | 'percent'
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
          : formatNumber(value)

  const usdSubtitle = format === 'currency' && value !== undefined ? formatCompactUSD(value) : undefined

  return (
    <Card className={variant === 'warning' ? 'border-risk-high/30' : undefined}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-text-muted">{title}</p>
            <p className="text-2xl font-bold tabular-nums text-text-primary">{formattedValue}</p>
            {usdSubtitle && <p className="text-xs text-text-muted tabular-nums">{usdSubtitle}</p>}
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function RiskGauge({ score }: { score: number }) {
  const percentage = Math.round(score * 100)
  const level = getRiskLevelFromScore(score)
  const label = level.charAt(0).toUpperCase() + level.slice(1)
  const color = RISK_COLORS[level]

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-background-elevated"
          />
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

function TopVendorsChart({ data }: { data: Array<{ vendor_id: number; vendor_name: string; total_value_mxn: number }> }) {
  const chartData = data.map((v) => ({
    name: toTitleCase(v.vendor_name).length > 20 ? toTitleCase(v.vendor_name).substring(0, 20) + '...' : toTitleCase(v.vendor_name),
    fullName: toTitleCase(v.vendor_name),
    value: v.total_value_mxn,
  }))

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickFormatter={(v) => formatCompactMXN(v)}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            width={120}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="rounded-lg border border-border bg-background-card p-2 shadow-lg">
                    <p className="font-medium text-sm">{data.fullName}</p>
                    <p className="text-sm text-text-muted">{formatCompactMXN(data.value)}</p>
                    <p className="text-xs text-text-muted">{formatCompactUSD(data.value)}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar dataKey="value" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function VendorConcentration({ data, total }: { data: any[]; total: number }) {
  // Calculate concentration metrics
  const top5Value = data.slice(0, 5).reduce((sum, v) => sum + v.total_value_mxn, 0)
  const top10Value = data.slice(0, 10).reduce((sum, v) => sum + v.total_value_mxn, 0)
  const top5Pct = total > 0 ? top5Value / total : 0
  const top10Pct = total > 0 ? top10Value / total : 0

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Top 5 Vendors</span>
          <span className="font-medium">{formatPercentSafe(top5Pct, true)} of total</span>
        </div>
        <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full"
            style={{ width: `${top5Pct * 100}%` }}
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Top 10 Vendors</span>
          <span className="font-medium">{formatPercentSafe(top10Pct, true)} of total</span>
        </div>
        <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent/70 rounded-full"
            style={{ width: `${top10Pct * 100}%` }}
          />
        </div>
      </div>
      {top5Pct > 0.5 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-risk-high/10 text-risk-high text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>High vendor concentration detected</span>
        </div>
      )}
    </div>
  )
}

function ContractRow({ contract, onView }: { contract: ContractListItem; onView?: (id: number) => void }) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-background-elevated/50 transition-colors cursor-pointer" onClick={() => onView?.(contract.id)}>
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-text-muted flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-[300px]">{contract.title || 'Untitled'}</p>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>{contract.contract_date ? formatDate(contract.contract_date) : contract.contract_year}</span>
            {contract.vendor_name && (
              <>
                <span>•</span>
                <span className="truncate max-w-[150px]">{toTitleCase(contract.vendor_name)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="text-sm font-medium tabular-nums">{formatCompactMXN(contract.amount_mxn)}</p>
          <p className="text-xs text-text-muted tabular-nums">{formatCompactUSD(contract.amount_mxn)}</p>
        </div>
        {contract.risk_score !== undefined && contract.risk_score !== null && (
          <RiskBadge score={contract.risk_score} />
        )}
      </div>
    </div>
  )
}

function InstitutionProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
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
          <Skeleton className="h-48" />
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

export default InstitutionProfile
