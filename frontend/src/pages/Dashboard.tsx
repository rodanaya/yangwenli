import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { cn, formatCompactMXN, formatNumber, formatPercentSafe, formatCompactUSD, toTitleCase } from '@/lib/utils'
import { analysisApi, vendorApi } from '@/api/client'
import { SectionDescription } from '@/components/SectionDescription'
import {
  FileText,
  AlertTriangle,
  DollarSign,
  Activity,
  Crosshair,
  Radar,
  ArrowRight,
  ArrowUpRight,
  Shield,
  Target,
  TrendingUp,
  Search,
  BarChart3,
  CheckCircle,
  Eye,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ComposedChart,
  Line,
  AreaChart,
  Area,
} from 'recharts'
import { SECTOR_COLORS, RISK_COLORS, getSectorNameEN, CURRENT_MODEL_VERSION } from '@/lib/constants'
import type { VendorTopItem, RiskDistribution } from '@/api/types'

// ============================================================================
// Hardcoded research findings
// ============================================================================

const CORRUPTION_CASES = [
  { name: 'IMSS Ghost Companies', contracts: 9366, detected: 99.0, type: 'Ghost companies', sector: 'Health', desc: 'Pisa Farmaceutica and related entities dominated IMSS pharmaceutical procurement through concentrated vendor positions.' },
  { name: 'Segalmex Fraud', contracts: 6326, detected: 94.3, type: 'Procurement fraud', sector: 'Agriculture', desc: 'LICONSA and DICONSA diverted billions through food distribution contracts with inflated pricing.' },
  { name: 'COVID-19 Procurement', contracts: 5371, detected: 91.8, type: 'Embezzlement', sector: 'Health', desc: 'Emergency procurement bypassed controls, with shell companies winning medical supply contracts.' },
  { name: 'Cyber Robotic IT', contracts: 139, detected: 43.2, type: 'Overpricing', sector: 'Technology', desc: 'IT consulting contracts at 3-5x market rates across federal agencies.' },
  { name: 'Odebrecht-PEMEX', contracts: 35, detected: 68.6, type: 'Bribery', sector: 'Energy', desc: 'Brazilian conglomerate paid bribes for PEMEX infrastructure contracts.' },
  { name: 'La Estafa Maestra', contracts: 10, detected: 70.0, type: 'Ghost companies', sector: 'Multiple', desc: 'Government agencies funneled money through public universities to shell companies.' },
  { name: 'Grupo Higa', contracts: 3, detected: 33.3, type: 'Conflict of interest', sector: 'Infrastructure', desc: 'Constructora Teya won infrastructure contracts while linked to senior officials.' },
  { name: 'Oceanografia', contracts: 2, detected: 100.0, type: 'Invoice fraud', sector: 'Energy', desc: 'Falsified invoices worth billions to secure PEMEX maritime service contracts.' },
] as const

const MODEL_INSIGHTS = {
  aucRoc: 0.951,
  lift: 4.04,
  detectionRate: 95.3,
  knownBadContracts: 21252,
  topPredictor: 'Vendor Concentration',
  topPredictorLR: 18.7,
  totalCases: 9,
  totalVendors: 17,
} as const

// ============================================================================
// Main Dashboard Component
// ============================================================================

export function Dashboard() {
  const navigate = useNavigate()

  // Fetch all dashboard data in ONE request (pre-computed, <100ms)
  const { data: fastDashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  // Transform fast dashboard data
  const overview = fastDashboard?.overview as any
  const overviewLoading = dashboardLoading

  const sectors = fastDashboard ? {
    data: fastDashboard.sectors.map((s: any) => {
      const total = s.total_contracts || 1
      return {
        sector_id: s.id,
        sector_code: s.code,
        sector_name: s.name,
        total_contracts: s.total_contracts,
        total_value_mxn: s.total_value_mxn,
        total_vendors: s.total_vendors,
        avg_risk_score: s.avg_risk_score || 0,
        low_risk_count: s.low_risk_count,
        medium_risk_count: s.medium_risk_count,
        high_risk_count: s.high_risk_count,
        critical_risk_count: s.critical_risk_count,
        direct_award_count: s.direct_award_count,
        single_bid_count: s.single_bid_count,
        direct_award_pct: (s.direct_award_count || 0) / total,
        single_bid_pct: (s.single_bid_count || 0) / total,
        high_risk_pct: ((s.high_risk_count || 0) + (s.critical_risk_count || 0)) / total,
        color: '',
        total_institutions: 0,
        avg_contract_value: s.total_value_mxn / total,
      }
    }),
  } : undefined
  const sectorsLoading = dashboardLoading

  const riskDist = fastDashboard ? {
    data: fastDashboard.risk_distribution as unknown as RiskDistribution[]
  } : undefined

  const trends = fastDashboard ? {
    data: fastDashboard.yearly_trends as Array<{ year: number; value_mxn: number; contracts: number }>
  } : undefined
  const trendsLoading = dashboardLoading

  // Fetch top vendors by risk (for investigation targets)
  const { data: topAllVendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top-all', 5],
    queryFn: () => vendorApi.getTopAll(8),
    staleTime: 5 * 60 * 1000,
  })

  // Compute derived data
  const yearlyTrendsData = useMemo(() => {
    if (!trends?.data) return []
    return trends.data
      .filter((d) => d.year >= 2010)
      .map((d) => ({
        year: d.year,
        contracts: d.contracts,
        valueBillions: d.value_mxn / 1_000_000_000,
        value_mxn: d.value_mxn,
      }))
  }, [trends])

  // Sector risk comparison data: sort by high_risk_pct descending
  const sectorRiskData = useMemo(() => {
    if (!sectors?.data) return []
    return [...sectors.data]
      .sort((a, b) => b.high_risk_pct - a.high_risk_pct)
      .map((s) => ({
        name: getSectorNameEN(s.sector_code),
        code: s.sector_code,
        high_risk_pct: s.high_risk_pct * 100,
        color: SECTOR_COLORS[s.sector_code] || '#64748b',
      }))
  }, [sectors])

  // Value at risk by sector (total MXN in high+critical contracts)
  const valueAtRiskData = useMemo(() => {
    if (!sectors?.data || !riskDist?.data) return { bySector: [], total: 0 }
    const bySector = [...sectors.data]
      .map((s) => {
        // Estimate value at risk: (high+critical fraction) * total_value
        const atRiskValue = s.high_risk_pct * s.total_value_mxn
        return {
          name: getSectorNameEN(s.sector_code),
          code: s.sector_code,
          value: atRiskValue,
          color: SECTOR_COLORS[s.sector_code] || '#64748b',
        }
      })
      .sort((a, b) => b.value - a.value)

    const total = bySector.reduce((sum, s) => sum + s.value, 0)
    return { bySector, total }
  }, [sectors, riskDist])

  // Risk stacked area data from yearly trends + risk distribution (proportional estimate)
  const riskTrendData = useMemo(() => {
    if (!trends?.data || !riskDist?.data) return []

    // Get overall risk proportions from distribution
    const totalAll = riskDist.data.reduce((sum, r) => sum + r.count, 0)
    const proportions: Record<string, number> = {}
    riskDist.data.forEach((r) => {
      proportions[r.risk_level] = totalAll > 0 ? r.count / totalAll : 0
    })

    // Apply proportions to each year's contract count
    return trends.data
      .filter((d) => d.year >= 2010)
      .map((d) => ({
        year: d.year,
        low: Math.round(d.contracts * (proportions['low'] || 0)),
        medium: Math.round(d.contracts * (proportions['medium'] || 0)),
        high: Math.round(d.contracts * (proportions['high'] || 0)),
        critical: Math.round(d.contracts * (proportions['critical'] || 0)),
        total: d.contracts,
      }))
  }, [trends, riskDist])

  const handleVendorClick = (vendorId: number) => navigate(`/vendors/${vendorId}`)
  const handleSectorClick = (sectorCode: string) => {
    const sector = sectors?.data.find((s) => s.sector_code === sectorCode)
    if (sector) navigate(`/sectors/${sector.sector_id}`)
  }

  const lastUpdated = fastDashboard?.cached_at
    ? new Date(fastDashboard.cached_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  // Compute total high+critical
  const highRiskContracts = overview?.high_risk_contracts || 0
  const highRiskPct = overview?.high_risk_pct || 0

  const [showIntro, setShowIntro] = useState(false)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            Procurement Intelligence
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            AI-powered corruption detection across Mexican federal procurement
            <button
              onClick={() => setShowIntro(!showIntro)}
              className="ml-2 text-accent hover:text-accent/80 transition-colors"
            >
              {showIntro ? 'Hide details' : 'About this platform'}
            </button>
          </p>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-[var(--font-family-mono)]">
            <Activity className="h-3 w-3 text-signal-live" aria-hidden="true" />
            <span>SYNCED {lastUpdated.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Collapsible intro */}
      {showIntro && (
        <SectionDescription variant="callout" title="About Yang Wen-li">
          This platform analyzes 3.1 million Mexican government contracts (2002-2025) using AI-powered risk detection.
          It identifies procurement patterns associated with corruption — from single-bidder contracts to vendor
          concentration monopolies. Risk scores are calibrated probabilities (v4.0 model, AUC 0.942) based on
          9 documented corruption cases and aligned with international standards (OECD, IMF CRI, EU ARACHNE).
          Scores indicate statistical anomaly, not proof of wrongdoing.
        </SectionDescription>
      )}

      {/* Section 1: Hero KPI Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 stagger-animate">
        <HeroKPI
          title="CONTRACTS ANALYZED"
          value={overview?.total_contracts}
          icon={FileText}
          loading={overviewLoading}
          subtitle={`${overview?.years_covered || 24} years of data (2002-2025)`}
          onClick={() => navigate('/contracts')}
        />
        <HeroKPI
          title="VALUE MONITORED"
          value={overview?.total_value_mxn}
          icon={DollarSign}
          loading={overviewLoading}
          format="currency"
          subtitle={overview?.total_value_mxn ? `~${formatCompactUSD(overview.total_value_mxn)}` : 'Mexican Pesos'}
          onClick={() => navigate('/contracts?sort_by=amount_mxn&sort_order=desc')}
        />
        <HeroKPI
          title="FLAGGED HIGH/CRITICAL"
          value={highRiskPct}
          icon={AlertTriangle}
          loading={overviewLoading}
          format="percent"
          subtitle={`${formatNumber(highRiskContracts)} contracts flagged`}
          variant="warning"
          onClick={() => navigate('/contracts?risk_level=critical')}
        />
        <HeroKPI
          title="MODEL ACCURACY"
          value={MODEL_INSIGHTS.aucRoc}
          icon={Target}
          loading={false}
          format="auc"
          subtitle={`${MODEL_INSIGHTS.lift}x lift vs random`}
          variant="accent"
          onClick={() => navigate('/methodology')}
        />
      </div>

      {/* Section 2: "What the Data Reveals" — Hero chart + Model insights */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* LEFT: Risk Trend Stacked Area */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-3.5 w-3.5 text-accent" />
                What the Data Reveals
              </CardTitle>
              <span className="text-[10px] text-text-muted font-[var(--font-family-mono)]">
                RISK TREND 2010-2025
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">
              Contract volume by estimated risk level over time
            </p>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <ChartSkeleton height={300} type="area" />
            ) : (
              <RiskTrendChart data={riskTrendData} />
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Model Insights Panel */}
        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-3.5 w-3.5 text-accent" />
              Model Insights
            </CardTitle>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-accent/10 text-accent border-accent/20">
                {CURRENT_MODEL_VERSION}
              </Badge>
              <span className="text-[10px] text-text-muted">Statistical Framework</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* #1 Predictor */}
              <div className="p-2.5 rounded-md bg-accent/5 border border-accent/10">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent mb-1">#1 PREDICTOR</p>
                <p className="text-sm font-bold text-text-primary">{MODEL_INSIGHTS.topPredictor}</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {MODEL_INSIGHTS.topPredictorLR}x likelihood ratio -- vendors dominating market share are the strongest corruption signal
                </p>
              </div>

              {/* Counterintuitive finding */}
              <div className="p-2.5 rounded-md bg-risk-medium/5 border border-risk-medium/10">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-risk-medium mb-1">COUNTERINTUITIVE</p>
                <p className="text-xs font-medium text-text-primary">Direct awards are LESS risky</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Known corrupt vendors use competitive procedures (-0.20 coefficient). They do not need shortcuts.
                </p>
              </div>

              {/* Detection stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-md bg-background-elevated/50">
                  <p className="text-lg font-bold tabular-nums text-text-primary">{MODEL_INSIGHTS.totalCases}</p>
                  <p className="text-[10px] text-text-muted">Cases tracked</p>
                </div>
                <div className="p-2 rounded-md bg-background-elevated/50">
                  <p className="text-lg font-bold tabular-nums text-text-primary">{MODEL_INSIGHTS.detectionRate}%</p>
                  <p className="text-[10px] text-text-muted">Detection rate</p>
                </div>
              </div>

              <p className="text-[10px] text-text-muted">
                Trained on {formatNumber(MODEL_INSIGHTS.knownBadContracts)} known-bad contracts from {MODEL_INSIGHTS.totalVendors} vendors
              </p>

              <button
                onClick={() => navigate('/methodology')}
                className="flex items-center gap-1.5 text-[11px] text-accent hover:text-accent/80 transition-colors group w-full"
              >
                <span>View full methodology</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: "Where the Risk Is" — Sector comparisons */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Sector Risk Comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-3.5 w-3.5 text-accent" />
              Sector Risk Comparison
            </CardTitle>
            <p className="text-[10px] text-text-muted mt-0.5">
              Percentage of contracts flagged high or critical risk
            </p>
          </CardHeader>
          <CardContent>
            {sectorsLoading ? (
              <ChartSkeleton height={320} type="bar" />
            ) : (
              <SectorRiskChart data={sectorRiskData} onSectorClick={handleSectorClick} />
            )}
          </CardContent>
        </Card>

        {/* Value at Risk by Sector */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-3.5 w-3.5 text-risk-high" />
                Value at Risk by Sector
              </CardTitle>
              {valueAtRiskData.total > 0 && (
                <span className="text-[10px] text-text-muted font-[var(--font-family-mono)]">
                  TOTAL: {formatCompactMXN(valueAtRiskData.total)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">
              Estimated contract value in high/critical risk categories
            </p>
          </CardHeader>
          <CardContent>
            {sectorsLoading ? (
              <ChartSkeleton height={320} type="bar" />
            ) : (
              <ValueAtRiskChart data={valueAtRiskData.bySector} onSectorClick={handleSectorClick} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 4: "Investigation Targets" — Vendors + Cases */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Highest Risk Vendors */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Search className="h-3.5 w-3.5 text-accent" />
                Investigation Targets
              </CardTitle>
              <button
                onClick={() => navigate('/explore?tab=vendors&sort_by=avg_risk_score&sort_order=desc')}
                className="text-[10px] text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">
              Top vendors by average risk score
            </p>
          </CardHeader>
          <CardContent>
            {vendorsLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            ) : (
              <HighRiskVendorsList
                data={topAllVendors?.risk || []}
                onVendorClick={handleVendorClick}
              />
            )}
          </CardContent>
        </Card>

        {/* Corruption Cases Detected */}
        <Card className="border-risk-critical/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Eye className="h-3.5 w-3.5 text-risk-critical" />
              Cases Detected
            </CardTitle>
            <p className="text-[10px] text-text-muted mt-0.5">
              {MODEL_INSIGHTS.totalCases} documented corruption cases
            </p>
          </CardHeader>
          <CardContent>
            <CorruptionCasesList cases={CORRUPTION_CASES} />
          </CardContent>
        </Card>
      </div>

      {/* Section 5: Procurement Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
            Procurement Activity
          </CardTitle>
          <p className="text-[10px] text-text-muted mt-0.5">
            Annual contract volume and total value, 2010-2025
          </p>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <ChartSkeleton height={260} type="bar" />
          ) : (
            <ProcurementActivityChart data={yearlyTrendsData} />
          )}
        </CardContent>
      </Card>

      {/* Section 6: Quick Navigation */}
      <div className="grid gap-2 md:grid-cols-4">
        {[
          { label: 'Patterns', icon: Crosshair, path: '/patterns', desc: 'Investigate fraud patterns' },
          { label: 'Network Graph', icon: Radar, path: '/network', desc: 'Vendor relationship map' },
          { label: 'Explore Data', icon: Search, path: '/explore', desc: 'Vendors, institutions, trends' },
          { label: 'Methodology', icon: Target, path: '/methodology', desc: 'Risk model documentation' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-border/50 bg-surface-card/50 hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
          >
            <item.icon className="h-3.5 w-3.5 text-text-muted group-hover:text-accent shrink-0" />
            <div>
              <p className="text-xs font-medium text-text-secondary group-hover:text-text-primary">{item.label}</p>
              <p className="text-[10px] text-text-muted">{item.desc}</p>
            </div>
            <ArrowRight className="h-3 w-3 text-text-muted/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

// -- Hero KPI Card --

interface HeroKPIProps {
  title: string
  value?: number
  icon: React.ElementType
  loading: boolean
  format?: 'number' | 'currency' | 'percent' | 'auc'
  subtitle?: string
  variant?: 'default' | 'warning' | 'accent'
  onClick?: () => void
}

const HeroKPI = memo(function HeroKPI({
  title,
  value,
  icon: Icon,
  loading,
  format = 'number',
  subtitle,
  variant = 'default',
  onClick,
}: HeroKPIProps) {
  const formattedValue = useMemo(
    () =>
      value === undefined
        ? '-'
        : format === 'currency'
          ? formatCompactMXN(value)
          : format === 'percent'
            ? formatPercentSafe(value, false)
            : format === 'auc'
              ? `AUC ${value.toFixed(3)}`
              : formatNumber(value),
    [value, format]
  )

  return (
    <Card
      className={cn(
        variant === 'warning' ? 'border-risk-high/20' : '',
        variant === 'accent' ? 'border-accent/20 bg-accent/[0.02]' : '',
        onClick && 'cursor-pointer hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200 group/kpi'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${title}: ${loading ? 'Loading' : formattedValue}` : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted font-[var(--font-family-mono)]">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl font-bold tabular-nums text-text-primary tracking-tight">{formattedValue}</p>
            )}
            {subtitle && <p className="text-[11px] text-text-muted">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              variant === 'warning' ? 'bg-risk-high/10 text-risk-high' : '',
              variant === 'accent' ? 'bg-accent/10 text-accent' : '',
              variant === 'default' ? 'bg-accent/10 text-accent' : '',
            )}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            {onClick && (
              <ArrowRight className="h-3.5 w-3.5 text-text-muted opacity-0 -translate-x-1 group-hover/kpi:opacity-100 group-hover/kpi:translate-x-0 transition-all duration-200" aria-hidden="true" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

// -- Risk Trend Stacked Area Chart --

const RiskTrendChart = memo(function RiskTrendChart({
  data,
}: {
  data: Array<{ year: number; low: number; medium: number; high: number; critical: number; total: number }>
}) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            tickFormatter={(v) => formatNumber(v)}
          />
          <RechartsTooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const total = payload.reduce((sum, entry) => sum + (entry.value as number), 0)
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs mb-1">{label}</p>
                    <p className="text-[10px] text-text-muted mb-1 tabular-nums">{formatNumber(total)} contracts</p>
                    {[...payload].reverse().map((entry) => (
                      <div key={entry.dataKey} className="flex items-center gap-2 text-[11px]">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="capitalize text-text-secondary">{String(entry.dataKey)}</span>
                        <span className="font-[var(--font-family-mono)] ml-auto text-text-muted tabular-nums">
                          {formatNumber(entry.value as number)}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            }}
          />
          <Area type="monotone" dataKey="low" stackId="risk" stroke={RISK_COLORS.low} fill={RISK_COLORS.low} fillOpacity={0.75} />
          <Area type="monotone" dataKey="medium" stackId="risk" stroke={RISK_COLORS.medium} fill={RISK_COLORS.medium} fillOpacity={0.75} />
          <Area type="monotone" dataKey="high" stackId="risk" stroke={RISK_COLORS.high} fill={RISK_COLORS.high} fillOpacity={0.75} />
          <Area type="monotone" dataKey="critical" stackId="risk" stroke={RISK_COLORS.critical} fill={RISK_COLORS.critical} fillOpacity={0.75} />
        </AreaChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1">
        {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
            <span className="text-[10px] text-text-muted capitalize">{level}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

// -- Sector Risk Comparison (Horizontal Bar) --

const SectorRiskChart = memo(function SectorRiskChart({
  data,
  onSectorClick,
}: {
  data: Array<{ name: string; code: string; high_risk_pct: number; color: string }>
  onSectorClick?: (code: string) => void
}) {
  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} opacity={0.3} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            domain={[0, 'auto']}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            width={85}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.name}</p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      {d.high_risk_pct.toFixed(1)}% high/critical risk
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar
            dataKey="high_risk_pct"
            radius={[0, 3, 3, 0]}
            onClick={(_, index) => onSectorClick?.(data[index].code)}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

// -- Value at Risk (Horizontal Bar) --

const ValueAtRiskChart = memo(function ValueAtRiskChart({
  data,
  onSectorClick,
}: {
  data: Array<{ name: string; code: string; value: number; color: string }>
  onSectorClick?: (code: string) => void
}) {
  // Only show top 10 sectors with positive value
  const displayData = data.filter((d) => d.value > 0).slice(0, 10)

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} layout="vertical" margin={{ left: 0, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} opacity={0.3} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickFormatter={(v) => {
              if (v >= 1e12) return `${(v / 1e12).toFixed(1)}T`
              if (v >= 1e9) return `${(v / 1e9).toFixed(0)}B`
              if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`
              return String(v)
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            width={85}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.name}</p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      {formatCompactMXN(d.value)} at risk
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar
            dataKey="value"
            radius={[0, 3, 3, 0]}
            onClick={(_, index) => onSectorClick?.(displayData[index].code)}
            style={{ cursor: 'pointer' }}
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

// -- High Risk Vendors List --

const HighRiskVendorsList = memo(function HighRiskVendorsList({
  data,
  onVendorClick,
}: {
  data: VendorTopItem[]
  onVendorClick?: (id: number) => void
}) {
  return (
    <div className="space-y-0.5">
      {data.slice(0, 8).map((vendor, index) => (
        <button
          key={vendor.vendor_id}
          className="flex items-center gap-2.5 w-full text-left interactive rounded-md p-2 -mx-1"
          onClick={() => onVendorClick?.(vendor.vendor_id)}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-text-muted bg-background-elevated font-[var(--font-family-mono)]">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-text-primary">{toTitleCase(vendor.vendor_name)}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-text-muted tabular-nums">{formatNumber(vendor.total_contracts)} contracts</span>
              <span className="text-[10px] text-text-muted">|</span>
              <span className="text-[10px] text-text-muted tabular-nums">{formatCompactMXN(vendor.total_value_mxn)}</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            {vendor.avg_risk_score !== undefined && vendor.avg_risk_score !== null && (
              <RiskBadge score={vendor.avg_risk_score} className="text-[9px]" />
            )}
          </div>
        </button>
      ))}
    </div>
  )
})

// -- Corruption Cases List --

const CorruptionCasesList = memo(function CorruptionCasesList({
  cases,
}: {
  cases: readonly typeof CORRUPTION_CASES[number][]
}) {
  const [expandedCase, setExpandedCase] = useState<string | null>(null)

  return (
    <div className="space-y-1">
      {cases.map((c) => (
        <div key={c.name}>
          <button
            className="flex items-center gap-2 w-full text-left rounded-md p-1.5 -mx-1 hover:bg-background-elevated/50 transition-colors"
            onClick={() => setExpandedCase(expandedCase === c.name ? null : c.name)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-text-primary truncate">{c.name}</p>
              <p className="text-[9px] text-text-muted">{c.type} / {c.sector}</p>
            </div>
            {/* Detection bar */}
            <div className="w-16 flex-shrink-0">
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 rounded-full bg-background-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${c.detected}%`,
                      backgroundColor: c.detected >= 90 ? RISK_COLORS.low : c.detected >= 60 ? RISK_COLORS.medium : RISK_COLORS.high,
                    }}
                  />
                </div>
                <span className="text-[9px] font-[var(--font-family-mono)] tabular-nums text-text-muted w-7 text-right">
                  {c.detected.toFixed(0)}%
                </span>
              </div>
            </div>
          </button>
          {expandedCase === c.name && (
            <p className="text-[10px] text-text-muted leading-relaxed pl-1.5 pb-1.5 border-l-2 border-accent/20 ml-1">
              {c.desc} <span className="tabular-nums text-text-muted/70">{formatNumber(c.contracts)} contracts analyzed.</span>
            </p>
          )}
        </div>
      ))}
      <div className="pt-1 border-t border-border/50">
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <CheckCircle className="h-3 w-3 text-risk-low" />
          <span>Detection rate on {formatNumber(MODEL_INSIGHTS.knownBadContracts)} known-bad contracts</span>
        </div>
      </div>
    </div>
  )
})

// -- Procurement Activity (ComposedChart) --

const ProcurementActivityChart = memo(function ProcurementActivityChart({
  data,
}: {
  data: Array<{ year: number; contracts: number; valueBillions: number; value_mxn: number }>
}) {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
          <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
          <YAxis
            yAxisId="contracts"
            orientation="left"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickFormatter={(v) => formatNumber(v)}
            label={{ value: 'Contracts', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 10 }}
          />
          <YAxis
            yAxisId="value"
            orientation="right"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(0)}B`}
            label={{ value: 'Value (B MXN)', angle: 90, position: 'insideRight', fill: 'var(--color-text-muted)', fontSize: 10 }}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-medium text-xs">{d.year}</p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      Contracts: {formatNumber(d.contracts)}
                    </p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      Value: {formatCompactMXN(d.value_mxn)}
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Bar yAxisId="contracts" dataKey="contracts" fill="var(--color-accent)" opacity={0.4} radius={[2, 2, 0, 0]} />
          <Line yAxisId="value" type="monotone" dataKey="valueBillions" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
})

export default Dashboard
