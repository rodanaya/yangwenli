import { useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
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
import type { ContractListItem, VendorExternalFlags } from '@/api/types'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ReferenceArea,
  Legend as RechartsLegend,
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
  SlidersHorizontal,
  TrendingDown,
  Minus,
  Activity,
  Shield,
  Network,
  ShieldCheck,
  Brain,
} from 'lucide-react'
import { NetworkGraphModal } from '@/components/NetworkGraphModal'
import { ScrollReveal, useCountUp, AnimatedFill } from '@/hooks/useAnimations'
import { cn } from '@/lib/utils'
import { RiskWhisker } from '@/components/ui/risk-whisker'

// ============================================================================
// Model coefficients for the waterfall chart (v5.0 global model)
// ============================================================================
const MODEL_COEFFICIENTS: Record<string, number> = {
  price_volatility: 1.219,
  institution_diversity: -0.848,
  win_rate: 0.727,
  vendor_concentration: 0.428,
  sector_spread: -0.374,
  industry_mismatch: 0.305,
  same_day_count: 0.222,
  direct_award: 0.182,
  ad_period_days: -0.104,
  network_member_count: 0.064,
  year_end: 0.059,
  institution_risk: 0.057,
}

// ============================================================================
// Simple Tabs implementation (no external dependency needed)
// ============================================================================
interface TabsProps {
  defaultTab: string
  tabs: Array<{ key: string; label: string; icon?: React.ElementType }>
  children: React.ReactNode
}

function SimpleTabs({ defaultTab, tabs, children }: TabsProps) {
  const [active, setActive] = useState(defaultTab)
  return (
    <div>
      <div className="flex gap-1 border-b border-border/50 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                active === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {tab.label}
            </button>
          )
        })}
      </div>
      {/* Render only the active tab panel */}
      {Array.isArray(children)
        ? (children as React.ReactElement[]).find((c) => c?.props?.tabKey === active)
        : children}
    </div>
  )
}

function TabPanel({ tabKey: _tabKey, children }: { tabKey: string; children: React.ReactNode }) {
  return <div>{children}</div>
}

// ============================================================================
// Risk Factor Waterfall Chart
// ============================================================================

interface WaterfallEntry {
  name: string
  factorKey: string
  contribution: number
  isNegative: boolean
}

function RiskWaterfallChart({
  riskFactors,
  riskScore,
}: {
  riskFactors: Array<{ factor: string; count: number; percentage: number }>
  riskScore: number
}) {
  // Build waterfall data from top risk factors combined with model coefficients
  // We use percentage as a proxy for z-score contribution
  const data: WaterfallEntry[] = useMemo(() => {
    const entries: WaterfallEntry[] = riskFactors
      .map((f) => {
        // Normalize factor key: strip z_ prefix, lowercase
        const key = f.factor.replace(/^z_/, '').toLowerCase()
        const coeff = MODEL_COEFFICIENTS[key] ?? 0
        // Contribution = normalized percentage × coefficient sign
        // If coefficient is negative, high percentage → risk-reducing
        const normalizedPct = f.percentage / 100
        const contribution = normalizedPct * Math.abs(coeff) * (coeff >= 0 ? 1 : -1)
        return {
          name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 14),
          factorKey: key,
          contribution,
          isNegative: contribution < 0,
        }
      })
      .filter((e) => Math.abs(e.contribution) > 0.001)
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 8)

    // Add total bar
    entries.push({
      name: 'Total Score',
      factorKey: '__total__',
      contribution: riskScore,
      isNegative: false,
    })

    return entries
  }, [riskFactors, riskScore])

  const maxVal = Math.max(...data.map((d) => Math.abs(d.contribution)), 0.1)

  const barColor = (entry: WaterfallEntry) => {
    if (entry.factorKey === '__total__') return RISK_COLORS[getRiskLevel(riskScore)]
    if (entry.isNegative) return '#4ade80'
    return entry.contribution > 0.15 ? '#f87171' : '#fb923c'
  }

  return (
    <div>
      <p className="text-xs text-text-muted mb-3">
        Positive bars increase risk (red/orange). Negative bars reduce risk (green).
        Bar height reflects each factor's contribution to the overall score.
      </p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              domain={[-maxVal * 1.1, maxVal * 1.1]}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload?.[0]) {
                  const d = payload[0].payload as WaterfallEntry
                  return (
                    <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-text-primary mb-1">{d.name}</p>
                      <p className={d.isNegative ? 'text-risk-low' : 'text-risk-high'}>
                        {d.contribution >= 0 ? '+' : ''}{d.contribution.toFixed(3)} contribution
                      </p>
                      {d.factorKey !== '__total__' && (
                        <p className="text-text-muted mt-1">
                          Model coefficient: {MODEL_COEFFICIENTS[d.factorKey]?.toFixed(3) ?? 'n/a'}
                        </p>
                      )}
                    </div>
                  )
                }
                return null
              }}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <Bar dataKey="contribution" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={barColor(entry)}
                  fillOpacity={entry.factorKey === '__total__' ? 1 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-risk-critical/80" />
          <span className="text-[10px] text-text-muted">Risk-increasing factor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-risk-low/80" />
          <span className="text-[10px] text-text-muted">Risk-reducing factor</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Activity Calendar (GitHub-style heatmap)
// ============================================================================

function ActivityCalendar({
  contracts,
  sectorColor,
}: {
  contracts: ContractListItem[]
  sectorColor: string
}) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Build a map of "year-month" -> { count, value }
  const cellMap = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>()
    for (const c of contracts) {
      if (!c.contract_year) continue
      // contract_date may be "YYYY-MM-DD" or absent; fall back to year only
      let month = 0
      if (c.contract_date) {
        const parts = c.contract_date.split('-')
        month = parts.length >= 2 ? parseInt(parts[1], 10) - 1 : 0
      }
      const key = `${c.contract_year}-${month}`
      const existing = map.get(key) || { count: 0, value: 0 }
      existing.count += 1
      existing.value += c.amount_mxn || 0
      map.set(key, existing)
    }
    return map
  }, [contracts])

  // Determine the last 5 years present in the data
  const years = useMemo(() => {
    const allYears = contracts.map((c) => c.contract_year).filter(Boolean) as number[]
    if (allYears.length === 0) return []
    const maxYear = Math.max(...allYears)
    return Array.from({ length: 5 }, (_, i) => maxYear - 4 + i)
  }, [contracts])

  const maxCount = useMemo(() => {
    let max = 0
    for (const v of cellMap.values()) max = Math.max(max, v.count)
    return max || 1
  }, [cellMap])

  const [hovered, setHovered] = useState<string | null>(null)

  if (years.length === 0) {
    return <p className="text-xs text-text-muted">No contract date data available for calendar view.</p>
  }

  return (
    <div>
      <p className="text-xs text-text-muted mb-3">
        Contract activity over the last 5 years. Darker cells indicate more contracts in that month.
      </p>
      {/* Grid: rows = months, cols = years */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-[320px]">
          {/* Year headers */}
          <div className="flex mb-1 ml-8">
            {years.map((yr) => (
              <div key={yr} className="flex-1 text-center text-[10px] text-text-muted font-mono">
                {yr}
              </div>
            ))}
          </div>
          {/* Month rows */}
          {MONTHS.map((monthLabel, monthIdx) => (
            <div key={monthIdx} className="flex items-center gap-0.5 mb-0.5">
              <span className="text-[9px] text-text-muted w-8 flex-shrink-0 text-right pr-1">
                {monthLabel}
              </span>
              {years.map((yr) => {
                const key = `${yr}-${monthIdx}`
                const cell = cellMap.get(key)
                const count = cell?.count ?? 0
                const opacity = count === 0 ? 0.05 : 0.15 + (count / maxCount) * 0.85
                const tooltipKey = `${yr}-${monthIdx}`
                return (
                  <div
                    key={yr}
                    className="flex-1 h-[14px] rounded-sm cursor-default transition-transform hover:scale-110 relative"
                    style={{ backgroundColor: sectorColor, opacity }}
                    onMouseEnter={() => setHovered(tooltipKey)}
                    onMouseLeave={() => setHovered(null)}
                    title={
                      count > 0
                        ? `${MONTHS[monthIdx]} ${yr}: ${count} contract${count !== 1 ? 's' : ''} · ${formatCompactMXN(cell?.value ?? 0)}`
                        : `${MONTHS[monthIdx]} ${yr}: no contracts`
                    }
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Inline hovered tooltip info */}
      {hovered && (() => {
        const [yr, mo] = hovered.split('-').map(Number)
        const cell = cellMap.get(hovered)
        if (!cell) return null
        return (
          <p className="mt-2 text-xs text-text-secondary">
            <span className="font-semibold">{MONTHS[mo]} {yr}:</span>{' '}
            {cell.count} contract{cell.count !== 1 ? 's' : ''},{' '}
            {formatCompactMXN(cell.value)}
          </p>
        )
      })()}
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-text-muted">Less</span>
        {[0.05, 0.25, 0.5, 0.75, 1].map((op) => (
          <div
            key={op}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: sectorColor, opacity: op }}
          />
        ))}
        <span className="text-[10px] text-text-muted">More</span>
      </div>
    </div>
  )
}

// ============================================================================
// Main VendorProfile component
// ============================================================================

export function VendorProfile() {
  const { id } = useParams<{ id: string }>()
  const vendorId = Number(id)
  const navigate = useNavigate()
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

  // Fetch external registry flags (SFP, RUPC, ASF)
  const { data: externalFlags } = useQuery({
    queryKey: ['vendor-external-flags', vendorId],
    queryFn: () => vendorApi.getExternalFlags(Number(vendorId)),
    enabled: !!vendorId,
  })

  // Fetch year-by-year lifecycle (contract count + risk per year)
  const { data: lifecycleData } = useQuery({
    queryKey: ['vendor', vendorId, 'risk-timeline'],
    queryFn: () => vendorApi.getRiskTimeline(vendorId),
    enabled: !!vendorId,
    staleTime: 10 * 60 * 1000,
  })

  // Fetch sector × institution footprint
  const { data: footprintData } = useQuery({
    queryKey: ['vendor', vendorId, 'footprint'],
    queryFn: () => vendorApi.getFootprint(vendorId),
    enabled: !!vendorId,
    staleTime: 10 * 60 * 1000,
  })

  // Fetch AI pattern analysis summary
  const { data: aiSummary, isLoading: aiLoading } = useQuery({
    queryKey: ['vendor', vendorId, 'ai-summary'],
    queryFn: () => vendorApi.getAiSummary(vendorId),
    enabled: !!vendorId,
    staleTime: 30 * 60 * 1000,
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{toTitleCase(vendor.name)}</h1>
                {/* Ground truth badge: vendor documented in known corruption case */}
                {/* TODO: Add vendorApi.getGroundTruthStatus(vendorId) endpoint to fetch case association */}
                {externalFlags?.sfp_sanctions && externalFlags.sfp_sanctions.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full border border-red-200">
                    SFP Sanctioned
                  </span>
                )}
                {externalFlags?.sat_efos?.stage === 'definitivo' && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full border border-red-200">
                    SAT EFOS Definitivo
                  </span>
                )}
              </div>
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
              {vendor.name_variants && vendor.name_variants.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-text-muted">Also known as:</span>
                  {vendor.name_variants.slice(0, 5).map((v) => (
                    <span
                      key={v.variant_name}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-background-elevated border border-border/30 text-text-secondary"
                      title={`Source: ${v.source}`}
                    >
                      {v.variant_name}
                    </span>
                  ))}
                  {vendor.name_variants.length > 5 && (
                    <span className="text-xs text-text-muted">
                      +{vendor.name_variants.length - 5} more
                    </span>
                  )}
                  <span className="text-xs text-text-muted/50 ml-1">
                    · QuiénEsQuién.Wiki
                  </span>
                </div>
              )}
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
          {vendor.primary_sector_id && (
            <button
              onClick={() => navigate(
                `/contracts?sector_id=${vendor.primary_sector_id}&risk_level=high&sort_by=risk_score&sort_order=desc`
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-background-elevated border border-border/40 text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Find Similar
            </button>
          )}
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

      {/* External flags summary — promoted above tabs for visibility */}
      {externalFlags && (externalFlags.sfp_sanctions.length > 0 || externalFlags.sat_efos?.stage === 'definitivo') && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-300">
              {externalFlags.sat_efos?.stage === 'definitivo'
                ? 'CRITICAL: Confirmed SAT Art. 69-B ghost company (EFOS definitivo)'
                : `${externalFlags.sfp_sanctions.length} SFP sanction record${externalFlags.sfp_sanctions.length > 1 ? 's' : ''} found`}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              See External Records tab for details
            </p>
          </div>
        </div>
      )}

      {/* Tabbed content */}
      <SimpleTabs
        defaultTab="overview"
        tabs={[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'risk', label: 'Risk Analysis', icon: Shield },
          { key: 'history', label: 'Contract History', icon: Activity },
          { key: 'network', label: 'Network', icon: Network },
          { key: 'external', label: 'External Records', icon: ShieldCheck },
        ]}
      >
        {/* TAB 1: Overview */}
        <TabPanel tabKey="overview">
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
                      lower={riskProfile.risk_confidence_lower}
                      upper={riskProfile.risk_confidence_upper}
                    />
                  ) : null}
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
              {/* AI Pattern Analysis */}
              {(aiLoading || (aiSummary && aiSummary.insights.length > 0)) && (
                <Card className="hover-lift">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      AI Pattern Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aiLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {aiSummary!.insights.map((insight, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5 shrink-0">&#x25CF;</span>
                            <p className="text-sm text-text-secondary">{insight}</p>
                          </div>
                        ))}
                        {aiSummary!.summary && (
                          <p className="text-sm text-text-muted mt-3 pt-3 border-t border-border/30">
                            {aiSummary!.summary}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

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

              {/* Institutional Tenure (Coviello & Gagliarducci 2017) */}
              {vendor.top_institutions && vendor.top_institutions.length > 0 && (
                <Card className="hover-lift">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Institutional Relationships
                    </CardTitle>
                    <p className="text-xs text-text-muted mt-0.5 italic">
                      Long-tenured vendor relationships correlate with higher single-bid rates
                      and prices (Coviello &amp; Gagliarducci 2017)
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/30">
                      {vendor.top_institutions.map((inst) => (
                        <div key={inst.institution_id} className="flex items-center justify-between px-4 py-2 hover:bg-background-elevated/50">
                          <div className="flex-1 min-w-0">
                            <Link to={`/administrations?institution_id=${inst.institution_id}`}
                              className="text-xs font-medium text-text-primary hover:text-primary truncate block">
                              {inst.institution_name}
                            </Link>
                            <span className="text-xs text-text-muted">
                              {inst.first_contract_year}–{inst.last_contract_year} · {inst.total_contracts.toLocaleString()} contracts
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <span className="font-mono text-xs text-text-secondary">
                              {inst.tenure_years} yrs
                            </span>
                            {inst.tenure_years > 15 && (
                              <span className="text-xs bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded font-medium">
                                LONG
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sector × Institution Footprint */}
              {footprintData && footprintData.footprint.length > 0 && (
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4" />
                    Procurement Footprint
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-0.5">Sector × institution relationships, sized by total value</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                    {footprintData.footprint.slice(0, 20).map((fp, idx) => {
                      const maxVal = footprintData.footprint[0]?.total_value ?? 1
                      const barPct = (fp.total_value / maxVal) * 100
                      const risk = fp.avg_risk_score ?? 0
                      const riskIntensity = Math.min(1, risk / 0.5)
                      const r2 = Math.round(74 + (248 - 74) * riskIntensity)
                      const g2 = Math.round(222 + (113 - 222) * riskIntensity)
                      const b2 = Math.round(128 + (113 - 128) * riskIntensity)
                      const riskColor = `rgb(${r2},${g2},${b2})`
                      const sectorColor = SECTOR_COLORS[fp.sector_name?.toLowerCase() ?? ''] || SECTOR_COLORS.otros
                      return (
                        <div key={idx} className="flex items-center gap-2 group">
                          <span
                            className="w-1 h-5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: sectorColor }}
                            title={fp.sector_name}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <Link
                                to={`/institutions/${fp.institution_id}`}
                                className="text-[11px] text-text-secondary hover:text-accent truncate"
                                title={fp.institution_name}
                              >
                                {fp.institution_name.length > 28 ? fp.institution_name.slice(0, 28) + '…' : fp.institution_name}
                              </Link>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[10px] font-mono text-text-muted">{formatCompactMXN(fp.total_value)}</span>
                                <span
                                  className="text-[9px] font-mono px-1 rounded"
                                  style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
                                >
                                  {(risk * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-1 rounded-full bg-background-elevated overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${barPct}%`, backgroundColor: `${sectorColor}80` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-text-muted/50 italic">
                    Color = sector · badge = avg risk score · sorted by total value
                  </p>
                </CardContent>
              </Card>
              )}
            </div>
            </ScrollReveal>
          </div>
        </TabPanel>

        {/* TAB 2: Risk Analysis */}
        <TabPanel tabKey="risk">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Gauge + Trend */}
            <div className="space-y-6">
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Risk Score <InfoTooltip termKey="riskScore" size={13} />
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
                      lower={riskProfile.risk_confidence_lower}
                      upper={riskProfile.risk_confidence_upper}
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
                          {riskProfile?.risk_confidence_lower != null &&
                            riskProfile?.risk_confidence_upper != null && (
                              <ReferenceArea
                                y1={riskProfile.risk_confidence_lower}
                                y2={riskProfile.risk_confidence_upper}
                                fill={riskColor}
                                fillOpacity={0.08}
                              />
                            )}
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

              {/* Vendor Lifecycle Chart */}
              {lifecycleData && lifecycleData.timeline.length > 1 && (
                <Card className="hover-lift">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Contract Lifecycle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[120px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={lifecycleData.timeline} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                          <XAxis
                            dataKey="year"
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'var(--font-family-mono)' }}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
                            width={28}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={[0, 1]}
                            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
                            width={32}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 6,
                              fontSize: 10,
                            }}
                            formatter={(value: unknown, name?: string) => {
                              if (name === 'Risk') return [`${(Number(value) * 100).toFixed(1)}%`, name]
                              return [Number(value).toLocaleString(), name ?? '']
                            }}
                          />
                          <RechartsLegend wrapperStyle={{ fontSize: 9 }} />
                          <Bar
                            yAxisId="left"
                            dataKey="contract_count"
                            name="Contracts"
                            fill={riskColor}
                            fillOpacity={0.45}
                            radius={[2, 2, 0, 0]}
                            maxBarSize={20}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="avg_risk_score"
                            name="Risk"
                            stroke={riskColor}
                            strokeWidth={2}
                            dot={{ r: 2 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
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
            </div>

            {/* Right: Waterfall + Factor List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Waterfall Chart */}
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Risk Factor Contribution (v5.0 Model)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {riskLoading ? (
                    <Skeleton className="h-[220px]" />
                  ) : riskProfile?.top_risk_factors?.length ? (
                    <RiskWaterfallChart
                      riskFactors={riskProfile.top_risk_factors}
                      riskScore={riskProfile.avg_risk_score ?? vendor.avg_risk_score ?? 0}
                    />
                  ) : (
                    <p className="text-sm text-text-muted">No risk factor data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Risk Factor List */}
              <Card className="hover-lift">
                <CardHeader>
                  <CardTitle className="text-sm">Risk Factor Details</CardTitle>
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
            </div>
          </div>
        </TabPanel>

        {/* TAB 3: Contract History */}
        <TabPanel tabKey="history">
          <div className="space-y-6">
            {/* Activity Calendar */}
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Contract Activity Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <Skeleton className="h-[220px]" />
                ) : contracts?.data?.length ? (
                  <ActivityCalendar
                    contracts={contracts.data}
                    sectorColor={sectorColor}
                  />
                ) : (
                  <p className="text-sm text-text-muted">No contract data available</p>
                )}
              </CardContent>
            </Card>

            {/* Full Contracts Table */}
            <Card className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  All Contracts
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
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : contracts?.data.length ? (
                  <ScrollArea className="h-[400px]">
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
          </div>
        </TabPanel>

        {/* TAB 4: Network */}
        <TabPanel tabKey="network">
          <div className="space-y-6">
            {/* Co-bidding relationships */}
            {!coBiddersLoading && hasCoBiddingRisk ? (
              <Card className="hover-lift border-amber-500/40 bg-amber-500/[0.02]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-risk-medium">
                    <Users className="h-4 w-4" />
                    Co-Bidding Partners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {coBidders?.co_bidders && coBidders.co_bidders.length > 0 && (
                    <div className="divide-y divide-border rounded-lg border overflow-hidden">
                      {coBidders.co_bidders.map((partner) => (
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
                  )}
                </CardContent>
              </Card>
            ) : (
              !coBiddersLoading && (
                <Card className="hover-lift">
                  <CardContent className="p-8 text-center text-text-muted">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No significant co-bidding patterns detected</p>
                  </CardContent>
                </Card>
              )
            )}

            {/* Open Full Network Graph */}
            <Card className="hover-lift">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-text-muted mb-4">
                  Explore the full vendor relationship network with interactive graph visualization.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setNetworkOpen(true)}
                  className="gap-2"
                >
                  <Network className="h-4 w-4" />
                  Open Network Graph
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabPanel>

        {/* TAB 5: External Records */}
        <TabPanel tabKey="external">
          <ExternalFlagsPanel flags={externalFlags} />
        </TabPanel>
      </SimpleTabs>

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
  lower,
  upper,
}: {
  score: number
  riskVsSectorAvg?: number
  riskPercentile?: number
  riskTrend?: 'improving' | 'stable' | 'worsening'
  lower?: number | null
  upper?: number | null
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
      {/* 95% CI whisker */}
      {lower != null && upper != null && (
        <div className="mt-3">
          <RiskWhisker score={score} lower={lower} upper={upper} size="lg" showLabels />
        </div>
      )}
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

// ============================================================================
// External Flags Panel (SFP Sanctions + RUPC + ASF)
// ============================================================================

function ExternalFlagsPanel({ flags }: { flags: VendorExternalFlags | undefined }) {
  if (!flags) return <div className="text-text-muted text-sm py-8 text-center">Loading external records...</div>

  const hasSanctions = flags.sfp_sanctions.length > 0
  const hasRUPC = !!flags.rupc
  const hasASF = flags.asf_cases.length > 0
  const hasEFOS = !!flags.sat_efos
  const isEFOSDefinitivo = flags.sat_efos?.stage === 'definitivo'
  const hasAny = hasSanctions || hasRUPC || hasASF || hasEFOS

  return (
    <div className="space-y-6">
      {/* Header status */}
      <div className={cn(
        "flex items-center gap-3 p-4 rounded border",
        (hasSanctions || isEFOSDefinitivo)
          ? "bg-red-950/20 border-red-500/30"
          : "bg-surface-2 border-border/50"
      )}>
        {(hasSanctions || isEFOSDefinitivo) ? (
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
        ) : (
          <Shield className="h-5 w-5 text-text-muted shrink-0" />
        )}
        <div>
          <p className={cn("text-sm font-medium", (hasSanctions || isEFOSDefinitivo) ? "text-red-300" : "text-text-secondary")}>
            {isEFOSDefinitivo
              ? "CRITICAL: Vendor confirmed on SAT Art. 69-B ghost company list"
              : hasSanctions
              ? `${flags.sfp_sanctions.length} SFP sanction record${flags.sfp_sanctions.length > 1 ? 's' : ''} found`
              : hasAny
              ? "No SFP sanctions — external records available"
              : "No external records found for this vendor"}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Sources: SFP Proveedores Sancionados · RUPC Vendor Registry · ASF Audit Findings · SAT Art. 69-B EFOS
          </p>
        </div>
      </div>

      {/* SFP Sanctions */}
      {hasSanctions && (
        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
            SFP Sanctions
          </h3>
          <div className="space-y-2">
            {flags.sfp_sanctions.map((s) => (
              <div key={s.id} className="p-3 rounded border border-red-500/20 bg-red-950/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{s.sanction_type || 'Sanction'}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {s.authority && <span>{s.authority} · </span>}
                      {s.sanction_start && <span>{s.sanction_start}</span>}
                      {s.sanction_end && <span> – {s.sanction_end}</span>}
                    </p>
                  </div>
                  {s.amount_mxn && (
                    <span className="text-xs font-mono text-red-400 shrink-0">
                      {formatCompactMXN(s.amount_mxn)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RUPC Registry */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
          RUPC Vendor Registry
        </h3>
        {hasRUPC ? (
          <div className="p-3 rounded border border-border/50 bg-surface-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-text-muted">Compliance Grade</p>
                <p className="font-medium text-text-primary">{flags.rupc!.compliance_grade || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Status</p>
                <p className="font-medium text-text-primary">{flags.rupc!.status || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Registered</p>
                <p className="font-medium text-text-primary">{flags.rupc!.registered_date || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Expires</p>
                <p className="font-medium text-text-primary">{flags.rupc!.expiry_date || '—'}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">
            Not found in RUPC registry.
            {!flags.vendor_id && " RFC required for RUPC lookup."}
          </p>
        )}
      </div>

      {/* ASF Cases */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
          ASF Audit Findings
        </h3>
        {hasASF ? (
          <div className="space-y-2">
            {flags.asf_cases.map((c) => (
              <div key={c.id} className="p-3 rounded border border-amber-500/20 bg-amber-950/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.finding_type}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {c.entity_name}
                      {c.report_year && <span> · {c.report_year}</span>}
                    </p>
                    {c.summary && <p className="text-xs text-text-muted mt-1 line-clamp-2">{c.summary}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {c.amount_mxn && (
                      <span className="text-xs font-mono text-amber-400">{formatCompactMXN(c.amount_mxn)}</span>
                    )}
                    {c.report_url && (
                      <a href={c.report_url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-accent hover:underline flex items-center gap-1">
                        Report <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">
            No ASF audit findings on record. ASF data coverage is limited to scraped records.
          </p>
        )}
      </div>

      {/* SAT Art. 69-B EFOS */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
          SAT Art. 69-B Ghost Company List
        </h3>
        {hasEFOS ? (
          <div className={cn(
            "p-3 rounded border",
            isEFOSDefinitivo
              ? "border-red-500/40 bg-red-950/15"
              : "border-amber-500/30 bg-amber-950/10"
          )}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide",
                    isEFOSDefinitivo
                      ? "bg-red-500/20 text-red-300"
                      : "bg-amber-500/20 text-amber-300"
                  )}>
                    {flags.sat_efos!.stage}
                  </span>
                </div>
                <p className="text-sm font-medium text-text-primary">{flags.sat_efos!.company_name}</p>
                {flags.sat_efos!.dof_date && (
                  <p className="text-xs text-text-muted mt-0.5">Published DOF: {flags.sat_efos!.dof_date}</p>
                )}
                <p className="text-xs text-text-muted mt-1">
                  {isEFOSDefinitivo
                    ? "Confirmed ghost company — invoices from this vendor are presumed fraudulent under Art. 69-B CFF."
                    : flags.sat_efos!.stage === 'presunto'
                    ? "Under review as presumed ghost company (Art. 69-B CFF)."
                    : flags.sat_efos!.stage === 'favorecido'
                    ? "Received invoices from a confirmed ghost company."
                    : "Successfully challenged Art. 69-B classification."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">
            Not found on SAT Art. 69-B EFOS/EDOS ghost company list.
          </p>
        )}
      </div>

      {/* Data source notice */}
      <p className="text-xs text-text-muted border-t border-border/30 pt-4">
        External data is loaded from public registries and may be incomplete. SFP sanctions and RUPC data
        must be refreshed manually via backend scripts. ASF coverage depends on web scraping availability.
        SAT Art. 69-B list updated monthly via <code className="font-mono">scripts/load_sat_efos.py</code>.
      </p>
    </div>
  )
}

export default VendorProfile
