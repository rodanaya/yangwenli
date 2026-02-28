import { useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { cn, formatCompactMXN, formatCompactUSD, formatNumber, formatPercentSafe, toTitleCase } from '@/lib/utils'
import { sectorApi, vendorApi, analysisApi, priceApi, investigationApi, caseLibraryApi, institutionApi } from '@/api/client'
import { SECTOR_COLORS, RISK_COLORS } from '@/lib/constants'
import { GenerateReportButton } from '@/components/GenerateReportButton'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { TableExportButton } from '@/components/TableExportButton'
import {
  BarChart3,
  Building2,
  Users,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Calendar,
  Crosshair,
  Zap,
  Activity,
  Shield,
  Brain,
  FlaskConical,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Legend,
  ReferenceLine,
} from '@/components/charts'

// ─── pagination constants ─────────────────────────────────────────────────────

const VENDOR_LIST_PER_PAGE = 20
const INSTITUTION_LIST_PER_PAGE = 15

// ─── helpers ─────────────────────────────────────────────────────────────────

function hex(color: string, alpha: number) {
  // converts e.g. '#dc2626' → 'rgba(220,38,38,α)'
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const FACTOR_LABELS: Record<string, string> = {
  direct_award: 'Direct Award',
  single_bid: 'Single Bid',
  price_anomaly: 'Price Anomaly',
  short_ad_period: 'Short Ad Period',
  'short_ad_<5d': 'Rushed Ad (<5 days)',
  'short_ad_<15d': 'Short Ad (<15 days)',
  'short_ad_<30d': 'Brief Ad (<30 days)',
  year_end: 'Year-End Rush',
  vendor_concentration: 'Vendor Monopoly',
  threshold_splitting: 'Contract Splitting',
  network_risk: 'Network Connection',
  industry_mismatch: 'Industry Mismatch',
  co_bid_high: 'High Co-Bid Rate',
  co_bid_med: 'Medium Co-Bid Rate',
  price_hyp: 'Price Outlier',
  co_sid_high: 'High Co-Bid Rate',
  co_sid_med: 'Medium Co-Bid Rate',
}

const FACTOR_DESC: Record<string, string> = {
  direct_award: 'Contract awarded without competitive bidding',
  single_bid: 'Competitive procedure received only one offer',
  price_anomaly: 'Contract value is 3× above sector median',
  short_ad_period: 'Advertisement window too short for real competition',
  'short_ad_<5d': 'Under 5 days between publication and award',
  'short_ad_<15d': 'Under 15 days between publication and award',
  'short_ad_<30d': 'Under 30 days between publication and award',
  year_end: 'Awarded in December — budget-dump pattern',
  vendor_concentration: 'One vendor controls >30% of sector contracts',
  threshold_splitting: 'Multiple same-day contracts to avoid oversight thresholds',
  network_risk: 'Vendor belongs to a connected group of related companies',
  industry_mismatch: "Vendor's primary industry doesn't match contract scope",
  co_bid_high: 'Vendor co-bids in >80% of procedures with a partner',
  co_bid_med: 'Vendor co-bids in 50–80% of procedures with a partner',
  price_hyp: 'Statistical outlier flagged by IQR price model',
  co_sid_high: 'Vendor co-bids in >80% of procedures with a partner',
  co_sid_med: 'Vendor co-bids in 50–80% of procedures with a partner',
}

// ─── page ────────────────────────────────────────────────────────────────────

export function SectorProfile() {
  const { id } = useParams<{ id: string }>()
  const sectorId = Number(id)
  const currentYear = useMemo(() => new Date().getFullYear() - 1, [])
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // refs for chart download
  const trendChartRef = useRef<HTMLDivElement>(null)
  const monthlyChartRef = useRef<HTMLDivElement>(null)
  const vendorChartRef = useRef<HTMLDivElement>(null)
  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = currentYear; y >= 2010; y--) years.push(y)
    return years
  }, [currentYear])

  const { data: sector, isLoading: sectorLoading, error: sectorError } = useQuery({
    queryKey: ['sector', sectorId],
    queryFn: () => sectorApi.getById(sectorId),
    enabled: !!sectorId,
  })

  const { data: riskDist, isLoading: riskLoading } = useQuery({
    queryKey: ['sector', sectorId, 'risk-distribution'],
    queryFn: () => sectorApi.getRiskDistribution(sectorId),
    enabled: !!sectorId,
  })

  const { data: topVendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 'value', { sector_id: sectorId, per_page: VENDOR_LIST_PER_PAGE }],
    queryFn: () => vendorApi.getTop('value', VENDOR_LIST_PER_PAGE, { sector_id: sectorId }),
    enabled: !!sectorId,
  })

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['analysis', 'monthly', selectedYear, sectorId],
    queryFn: () => analysisApi.getMonthlyBreakdown(selectedYear, sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: riskFactors, isLoading: riskFactorsLoading } = useQuery({
    queryKey: ['analysis', 'risk-factors', sectorId],
    queryFn: () => analysisApi.getRiskFactorAnalysis(sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: priceBaselines, isLoading: priceLoading } = useQuery({
    queryKey: ['price', 'baselines', sectorId],
    queryFn: () => priceApi.getBaselines(sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: topCases } = useQuery({
    queryKey: ['investigation', 'top', 5, sectorId],
    queryFn: () => investigationApi.getTopCases(5, sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: moneyFlow, isLoading: moneyFlowLoading } = useQuery({
    queryKey: ['analysis', 'money-flow', sectorId],
    queryFn: () => analysisApi.getMoneyFlow(undefined, sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: sectorCases } = useQuery({
    queryKey: ['cases', 'by-sector', sectorId],
    queryFn: () => caseLibraryApi.getBySector(sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: priceAnomalies, isLoading: priceAnomaliesLoading } = useQuery({
    queryKey: ['price', 'hypotheses', sectorId],
    queryFn: () => priceApi.getHypotheses({ sector_id: sectorId, per_page: 6, sort_by: 'confidence', sort_order: 'desc' }),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: sectorInstitutions } = useQuery({
    queryKey: ['institutions', 'by-sector', sectorId],
    queryFn: () => institutionApi.getAll({ sector_id: sectorId, per_page: INSTITUTION_LIST_PER_PAGE, sort_by: 'total_amount_mxn', sort_order: 'desc' }),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  if (sectorLoading) return <SectorProfileSkeleton />

  if (sectorError || !sector) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold mb-2">Sector Not Found</h2>
        <p className="text-text-muted mb-4">The requested sector could not be found.</p>
        <Link to="/sectors"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Sectors</Button></Link>
      </div>
    )
  }

  const sectorColor = SECTOR_COLORS[sector.code] || sector.color || '#64748b'
  const stats = sector.statistics
  const priceBaseline = priceBaselines?.[0]
  const caseData = topCases?.data ?? []

  return (
    <div className="space-y-6">

      {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
      <div
        className="relative rounded-xl border border-border/30 overflow-hidden p-6"
        style={{ background: `linear-gradient(135deg, ${hex(sectorColor, 0.12)} 0%, transparent 60%)` }}
      >
        {/* decorative glow */}
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-20"
          style={{ background: sectorColor }}
        />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Link to="/sectors">
              <Button variant="ghost" size="sm" className="text-text-muted hover:text-text-primary">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl shadow-lg"
              style={{ backgroundColor: hex(sectorColor, 0.2), border: `1px solid ${hex(sectorColor, 0.4)}` }}
            >
              <BarChart3 className="h-7 w-7" style={{ color: sectorColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight capitalize text-text-primary">{sector.name}</h1>
                {stats && <RiskBadge score={stats.avg_risk_score} className="text-sm px-2.5 py-0.5" />}
              </div>
              <p className="text-xs text-text-muted mt-0.5 font-mono uppercase tracking-widest">Sector · {sector.code}</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            {stats && (
              <div className="text-right">
                <p className="text-3xl font-black tabular-nums text-text-primary">{formatCompactMXN(stats.total_value_mxn)}</p>
                <p className="text-xs text-text-muted">total procurement value</p>
              </div>
            )}
            <GenerateReportButton reportType="sector" entityId={sectorId} entityName={sector.name} variant="outline" />
          </div>
        </div>
      </div>

      {/* ── KPI STRIP ───────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Contracts" value={stats?.total_contracts} icon={FileText} color={sectorColor} />
        <KPICard title="Total Value" value={stats?.total_value_mxn} icon={DollarSign} format="currency" color={sectorColor} />
        <KPICard title="Vendors" value={stats?.total_vendors} icon={Users} color={sectorColor} />
        <KPICard title="High + Critical" value={(stats?.high_risk_count ?? 0) + (stats?.critical_risk_count ?? 0)} icon={AlertTriangle} color="#ef4444" />
      </div>

      {/* ── MAIN GRID ───────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* RISK DONUT */}
          <Card className="border-border/40 overflow-hidden">
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${RISK_COLORS.critical}, ${RISK_COLORS.high}, ${RISK_COLORS.medium}, ${RISK_COLORS.low})` }} />
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" style={{ color: sectorColor }} />
                Risk Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {riskLoading ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : riskDist?.data ? (
                <RiskDonut data={riskDist.data} color={sectorColor} />
              ) : null}
            </CardContent>
          </Card>

          {/* RISK SIGNATURE — ranked bars */}
          <Card className="border-border/40">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" style={{ color: sectorColor }} />
                Risk Signature
              </CardTitle>
              <p className="text-xs text-text-muted">Most prevalent red flags in this sector</p>
            </CardHeader>
            <CardContent className="pt-3">
              {riskFactorsLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : riskFactors?.factor_frequencies?.length ? (
                <FactorRankList data={riskFactors.factor_frequencies} color={sectorColor} />
              ) : (
                <p className="text-xs text-text-muted py-4 text-center">No factor data</p>
              )}
            </CardContent>
          </Card>

          {/* PROCUREMENT STATS */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Procurement Patterns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatRow label="Direct Awards" value={formatPercentSafe(stats?.direct_award_pct, false) || '-'} accent />
              <StatRow label="Single Bids" value={formatPercentSafe(stats?.single_bid_pct, false) || '-'} accent />
              <StatRow label="Avg Risk Score" value={formatPercentSafe(stats?.avg_risk_score, true) || '-'} />
              <StatRow label="High Risk Count" value={formatNumber((stats?.high_risk_count || 0) + (stats?.critical_risk_count || 0))} />
            </CardContent>
          </Card>

          {/* PRICE INTELLIGENCE */}
          {(priceLoading || priceBaseline) && (
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Price Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {priceLoading ? (
                  <div className="space-y-2">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-6" />)}</div>
                ) : priceBaseline ? (
                  <PriceDistribution baseline={priceBaseline} color={sectorColor} />
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* DOCUMENTED CASES */}
          {sectorCases && sectorCases.length > 0 && (
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-risk-critical" />
                  Documented Cases
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-3">
                {sectorCases.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/cases/${c.slug}`}
                    className="flex items-center justify-between py-1.5 border-b border-border/20 hover:text-accent transition-colors text-sm group"
                  >
                    <span className="truncate text-xs text-text-secondary group-hover:text-accent transition-colors">
                      {c.name_en}
                    </span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-mono ml-2 flex-shrink-0',
                      c.legal_status === 'convicted' ? 'bg-risk-low/15 text-risk-low' :
                      c.legal_status === 'impunity' || c.legal_status === 'acquitted' ? 'bg-risk-high/15 text-risk-high' :
                      c.legal_status === 'investigation' ? 'bg-risk-medium/15 text-risk-medium' :
                      'bg-surface text-text-muted'
                    )}>
                      {c.legal_status}
                    </span>
                  </Link>
                ))}
                <Link
                  to={`/cases?sector_id=${sectorId}`}
                  className="text-xs text-text-muted hover:text-accent mt-2 block pt-1 transition-colors"
                >
                  View all →
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* TREND AREA */}
          <Card className="border-border/40 overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" style={{ color: sectorColor }} />
                  Contract Value — 2010 to {currentYear}
                </CardTitle>
                <ChartDownloadButton targetRef={trendChartRef} filename={`rubli-sector-${sector.code}-spend`} />
              </div>
            </CardHeader>
            <CardContent className="-mx-2">
              <div ref={trendChartRef}>
                {sector.trends?.length ? (
                  <TrendArea data={sector.trends} color={sectorColor} />
                ) : (
                  <p className="text-sm text-text-muted px-4 py-8 text-center">No trend data available for this sector</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* MONTHLY DEVIATION */}
          <Card className="border-border/40">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" style={{ color: sectorColor }} />
                    Month vs. Average — {selectedYear}
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-0.5">How each month deviates from the sector's own monthly average</p>
                </div>
                {/* year selector + chart download */}
                <div className="flex flex-col items-end gap-1">
                  <ChartDownloadButton targetRef={monthlyChartRef} filename={`rubli-sector-${sector.code}-monthly-${selectedYear}`} />
                  <div className="flex flex-wrap gap-1 justify-end">
                    {yearOptions.slice(0, 8).map((y) => (
                      <button
                        key={y}
                        onClick={() => setSelectedYear(y)}
                        className={cn(
                          'rounded px-2 py-0.5 text-xs font-mono tabular-nums transition-all',
                          y === selectedYear
                            ? 'font-bold text-background'
                            : 'text-text-muted hover:text-text-primary hover:bg-background-elevated'
                        )}
                        style={y === selectedYear ? { background: sectorColor } : undefined}
                      >
                        {y}
                      </button>
                    ))}
                    {yearOptions.length > 8 && (
                      <select
                        value={yearOptions.indexOf(selectedYear) >= 8 ? selectedYear : ''}
                        onChange={(e) => e.target.value && setSelectedYear(Number(e.target.value))}
                        className="rounded px-1.5 py-0.5 text-xs text-text-muted bg-background-elevated border border-border/40 hover:border-border cursor-pointer"
                      >
                        <option value="">older…</option>
                        {yearOptions.slice(8).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={monthlyChartRef}>
                {monthlyLoading ? (
                  <Skeleton className="h-72 w-full" />
                ) : monthlyData?.months?.length ? (
                  <MonthlyDeviation
                    data={monthlyData.months}
                    decemberSpike={monthlyData.december_spike}
                    color={sectorColor}
                  />
                ) : (
                  <p className="text-sm text-text-muted py-8 text-center">No monthly data available for this sector</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* TOP VENDORS */}
          <Card className="border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: sectorColor }} />
                Top Vendors
              </CardTitle>
              <div className="flex items-center gap-1">
                <TableExportButton
                  data={(topVendors?.data ?? []).map((v: { vendor_id?: number; vendor_name?: string; name?: string; total_value_mxn?: number; contract_count?: number; avg_risk_score?: number }) => ({
                    vendor_id: v.vendor_id ?? '',
                    vendor_name: v.vendor_name ?? v.name ?? '',
                    total_value_mxn: v.total_value_mxn ?? '',
                    contract_count: v.contract_count ?? '',
                    avg_risk_score: v.avg_risk_score ?? '',
                  }))}
                  filename={`rubli-sector-${sector.code}-vendors`}
                />
                <ChartDownloadButton targetRef={vendorChartRef} filename={`rubli-sector-${sector.code}-vendors`} />
                <Link to={`/vendors?sector_id=${sectorId}`}>
                  <Button variant="ghost" size="sm" className="text-xs">All <ExternalLink className="ml-1 h-3 w-3" /></Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div ref={vendorChartRef}>
                {vendorsLoading ? (
                  <div className="space-y-2">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : topVendors?.data ? (
                  <VendorBars data={topVendors.data} color={sectorColor} />
                ) : (
                  <p className="text-sm text-text-muted py-8 text-center">No vendor data available for this sector</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KNOWN CASES */}
          {caseData.length > 0 && (
            <Card className="border-risk-high/30 bg-risk-critical/3 overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-risk-critical to-risk-high" />
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Crosshair className="h-4 w-4 text-risk-high" />
                  Known Investigation Cases
                </CardTitle>
                <Link to={`/investigation?sector_id=${sectorId}`}>
                  <Button variant="ghost" size="sm" className="text-xs text-risk-high">
                    Investigate <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <InvestigationCases data={caseData} />
              </CardContent>
            </Card>
          )}

          {/* MONEY FLOW */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-4 w-4" style={{ color: sectorColor }} />
                Spending by Institution
              </CardTitle>
              <p className="text-xs text-text-muted">Which institutions drive this sector's procurement</p>
            </CardHeader>
            <CardContent>
              {moneyFlowLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : moneyFlow?.flows?.length ? (
                <MoneyFlowList flows={moneyFlow.flows.slice(0, 7)} color={sectorColor} />
              ) : (
                <p className="text-xs text-text-muted py-4 text-center">No flow data</p>
              )}
            </CardContent>
          </Card>

          {/* AI PRICE ANOMALIES */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FlaskConical className="h-4 w-4 text-amber-400" />
                    AI Price Anomalies
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-0.5">Contracts statistically flagged as overpriced</p>
                </div>
                <Link to={`/price-analysis?sector_id=${sectorId}`}>
                  <Button variant="ghost" size="sm" className="text-xs">All <ExternalLink className="ml-1 h-3 w-3" /></Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {priceAnomaliesLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : priceAnomalies?.data?.length ? (
                <PriceAnomalyList data={priceAnomalies.data} color={sectorColor} />
              ) : (
                <div className="flex flex-col items-center py-6 gap-2">
                  <Brain className="h-8 w-8 text-text-muted opacity-40" />
                  <p className="text-xs text-text-muted">No price anomalies detected</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* INSTITUTIONS IN SECTOR */}
          {sectorInstitutions && sectorInstitutions.data && sectorInstitutions.data.length > 0 && (
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-text-muted" />
                    <h2 className="text-sm font-bold text-text-primary">Top Institutions</h2>
                    <span className="text-xs text-text-muted">({sectorInstitutions.data.length})</span>
                  </div>
                  <TableExportButton
                    data={sectorInstitutions.data.map((inst: { id: number; name: string; total_amount_mxn?: number; contract_count?: number }) => ({
                      institution_id: inst.id,
                      institution_name: inst.name,
                      total_amount_mxn: inst.total_amount_mxn ?? '',
                      contract_count: inst.contract_count ?? '',
                    }))}
                    filename={`rubli-sector-${sector.code}-institutions`}
                  />
                </div>
                <div className="space-y-1">
                  {sectorInstitutions.data.slice(0, 10).map((inst: { id: number; name: string; total_amount_mxn?: number; contract_count?: number }) => (
                    <Link
                      key={inst.id}
                      to={`/institutions/${inst.id}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-background-elevated/30 transition-colors group"
                    >
                      <span className="text-xs font-medium text-text-secondary group-hover:text-accent transition-colors truncate flex-1 mr-3">
                        {toTitleCase(inst.name)}
                      </span>
                      <span className="text-xs text-text-muted tabular-nums whitespace-nowrap">
                        {inst.total_amount_mxn ? formatCompactMXN(inst.total_amount_mxn) : `${formatNumber(inst.contract_count ?? 0)} contracts`}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* QUICK ACTIONS */}
          <div className="grid gap-3 md:grid-cols-3">
            <Link to={`/contracts?sector_id=${sectorId}`} className="group">
              <div className="rounded-lg border border-border/40 p-4 hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer">
                <FileText className="h-5 w-5 mb-2 text-text-muted group-hover:text-accent transition-colors" />
                <p className="text-sm font-medium">All Contracts</p>
                <p className="text-xs text-text-muted">Browse full list</p>
              </div>
            </Link>
            <Link to={`/vendors?sector_id=${sectorId}`} className="group">
              <div className="rounded-lg border border-border/40 p-4 hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer">
                <Users className="h-5 w-5 mb-2 text-text-muted group-hover:text-accent transition-colors" />
                <p className="text-sm font-medium">Vendors</p>
                <p className="text-xs text-text-muted">All sector vendors</p>
              </div>
            </Link>
            <Link to={`/contracts?sector_id=${sectorId}&risk_level=high`} className="group">
              <div className="rounded-lg border border-risk-high/30 p-4 hover:border-risk-high/60 hover:bg-risk-high/5 transition-all cursor-pointer">
                <AlertTriangle className="h-5 w-5 mb-2 text-risk-high" />
                <p className="text-sm font-medium text-risk-high">High Risk Only</p>
                <p className="text-xs text-text-muted">Flagged contracts</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── RISK DONUT ───────────────────────────────────────────────────────────────

function RiskDonut({
  data,
  color,
}: {
  data: Array<{ risk_level: string; count: number; percentage: number }>
  color: string
}) {
  const order = ['critical', 'high', 'medium', 'low'] as const
  const sorted = order.map((level) => {
    const found = data.find((d) => d.risk_level === level)
    return { level, count: found?.count ?? 0, pct: found?.percentage ?? 0 }
  })
  const total = sorted.reduce((a, b) => a + b.count, 0)
  const highPlus = (sorted[0].count + sorted[1].count)
  const highPlusPct = total > 0 ? ((highPlus / total) * 100).toFixed(1) : '0'

  const pieData = sorted.map((d) => ({
    name: d.level.charAt(0).toUpperCase() + d.level.slice(1),
    value: d.count,
    color: RISK_COLORS[d.level as keyof typeof RISK_COLORS],
  }))

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-52 w-52 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  const d = payload[0].payload
                  return (
                    <div className="rounded-lg border border-border bg-background-card p-2 shadow-lg text-xs">
                      <p className="font-bold" style={{ color: d.color }}>{d.name}</p>
                      <p className="text-text-muted">{formatNumber(d.value)} contracts</p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums text-text-primary">{highPlusPct}%</span>
          <span className="text-xs text-text-muted font-mono uppercase">high+</span>
        </div>
      </div>
      {/* legend */}
      <div className="flex-1 space-y-3">
        {sorted.map((d) => (
          <div key={d.level} className="space-y-0.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: RISK_COLORS[d.level as keyof typeof RISK_COLORS] }} />
                <span className="capitalize text-text-secondary">{d.level}</span>
              </div>
              <span className="tabular-nums text-text-muted font-mono">{d.pct.toFixed(1)}%</span>
            </div>
            <div className="h-1 bg-background-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${d.pct}%`, backgroundColor: RISK_COLORS[d.level as keyof typeof RISK_COLORS] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── FACTOR RANK LIST ────────────────────────────────────────────────────────

function FactorRankList({
  data,
  color,
}: {
  data: Array<{ factor: string; count: number; percentage: number; avg_risk_score: number }>
  color: string
}) {
  const top7 = data.slice(0, 7)
  const maxPct = Math.max(...top7.map((d) => d.percentage), 1)

  return (
    <div className="space-y-2.5">
      {top7.map((d, i) => {
        const label = FACTOR_LABELS[d.factor] ?? d.factor
        const desc = FACTOR_DESC[d.factor]
        const barWidth = (d.percentage / maxPct) * 100
        const riskPct = Math.round(d.avg_risk_score * 100)
        const riskColor =
          d.avg_risk_score >= 0.5 ? RISK_COLORS.critical :
          d.avg_risk_score >= 0.3 ? RISK_COLORS.high :
          d.avg_risk_score >= 0.1 ? RISK_COLORS.medium :
          RISK_COLORS.low

        return (
          <div key={d.factor} className="group">
            <div className="flex items-center justify-between mb-0.5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-text-muted w-4 flex-shrink-0">#{i + 1}</span>
                <span className="text-xs font-semibold text-text-primary truncate">{label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-mono text-text-muted tabular-nums">{d.percentage.toFixed(1)}%</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold font-mono tabular-nums"
                  style={{ color: riskColor, backgroundColor: `${riskColor}18` }}
                >
                  {riskPct}% risk
                </span>
              </div>
            </div>
            {desc && (
              <p className="text-[10px] text-text-muted ml-6 mb-1 leading-tight">{desc}</p>
            )}
            <div className="ml-6 h-1.5 bg-background-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── INSTITUTION SPENDING LIST ───────────────────────────────────────────────
// The money-flow endpoint with sector_id filter returns institution → sector rows.
// We display it as a ranked breakdown of which institutions drive this sector's spend.

function MoneyFlowList({
  flows,
  color,
}: {
  flows: Array<{ source_id: number; source_name: string; value: number; contracts: number; avg_risk: number | null; high_risk_pct: number | null }>
  color: string
}) {
  const total = flows.reduce((s, f) => s + f.value, 0)
  const maxVal = Math.max(...flows.map((f) => f.value), 1)

  return (
    <div className="space-y-1">
      {flows.map((f, i) => {
        const sharePct = total > 0 ? (f.value / total) * 100 : 0
        const barWidth = (f.value / maxVal) * 100
        const riskColor =
          (f.avg_risk ?? 0) >= 0.5 ? RISK_COLORS.critical :
          (f.avg_risk ?? 0) >= 0.3 ? RISK_COLORS.high :
          (f.avg_risk ?? 0) >= 0.1 ? RISK_COLORS.medium :
          RISK_COLORS.low

        return (
          <Link key={i} to={`/institutions/${f.source_id}`} className="group block rounded-lg px-2.5 py-2 hover:bg-background-elevated/50 transition-all">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-text-muted w-4 flex-shrink-0">#{i + 1}</span>
                <span className="text-xs font-medium text-text-primary group-hover:text-accent transition-colors truncate" title={toTitleCase(f.source_name)}>
                  {toTitleCase(f.source_name)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-mono font-bold tabular-nums text-text-primary">{formatCompactMXN(f.value)}</span>
                <span className="text-[10px] font-mono text-text-muted tabular-nums">{sharePct.toFixed(1)}%</span>
                {f.avg_risk != null && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold font-mono tabular-nums"
                    style={{ color: riskColor, backgroundColor: `${riskColor}18` }}
                  >
                    {Math.round(f.avg_risk * 100)}% risk
                  </span>
                )}
                <ExternalLink className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="ml-6 h-1.5 bg-background-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%`, backgroundColor: color }}
              />
            </div>
            <p className="ml-6 mt-0.5 text-[10px] text-text-muted font-mono">
              {formatNumber(f.contracts)} contracts
              {f.high_risk_pct != null && f.high_risk_pct > 5 && (
                <span style={{ color: riskColor }}> · {f.high_risk_pct.toFixed(1)}% high risk</span>
              )}
            </p>
          </Link>
        )
      })}
    </div>
  )
}

// ─── PRICE ANOMALY LIST ───────────────────────────────────────────────────────

const HYPOTHESIS_LABELS: Record<string, { label: string; color: string }> = {
  extreme_overpricing: { label: 'Extreme Overpricing', color: RISK_COLORS.critical },
  statistical_outlier: { label: 'Statistical Outlier', color: RISK_COLORS.high },
  vendor_price_spike: { label: 'Vendor Price Spike', color: RISK_COLORS.high },
  sector_anomaly: { label: 'Sector Anomaly', color: RISK_COLORS.medium },
}

function PriceAnomalyList({
  data,
  color: _color,
}: {
  data: Array<{
    hypothesis_id: string; hypothesis_type: string; contract_id: number;
    confidence: number; confidence_level?: string; amount_mxn: number;
    explanation?: string; recommended_action?: string
  }>
  color: string
}) {
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const typeInfo = HYPOTHESIS_LABELS[d.hypothesis_type] ?? { label: d.hypothesis_type, color: RISK_COLORS.medium }
        const confidencePct = Math.round((d.confidence ?? 0) * 100)
        const shortExplanation = d.explanation
          ? d.explanation.split('.')[0] + '.'
          : null

        return (
          <Link
            key={d.hypothesis_id}
            to={`/contracts?contract_id=${d.contract_id}`}
            className="group block rounded-lg border border-border/30 bg-background-elevated/30 p-2.5 hover:border-accent/40 hover:bg-accent/5 transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ color: typeInfo.color, backgroundColor: `${typeInfo.color}18` }}
              >
                {typeInfo.label}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <div className="w-14 h-1.5 bg-background-elevated rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${confidencePct}%`, backgroundColor: typeInfo.color }} />
                  </div>
                  <span className="text-[10px] font-bold font-mono tabular-nums" style={{ color: typeInfo.color }}>
                    {confidencePct}%
                  </span>
                </div>
                <span className="text-xs font-mono font-bold tabular-nums text-text-primary">
                  {formatCompactMXN(d.amount_mxn)}
                </span>
                <ExternalLink className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            {shortExplanation && (
              <p className="text-[10px] text-text-muted leading-relaxed">{shortExplanation}</p>
            )}
            {d.recommended_action && (
              <p className="text-[10px] text-accent mt-0.5 leading-relaxed">→ {d.recommended_action}</p>
            )}
          </Link>
        )
      })}
    </div>
  )
}

// ─── TREND AREA ──────────────────────────────────────────────────────────────

function TrendArea({
  data,
  color,
}: {
  data: Array<{ year: number; total_value_mxn: number; total_contracts: number }>
  color: string
}) {
  const chartData = data
    .filter((d) => d.year >= 2010)
    .map((d) => ({ year: d.year, value: d.total_value_mxn / 1e9, contracts: d.total_contracts }))

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.5} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.25} />
          <XAxis dataKey="year" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}B`} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload?.length) {
                const d = payload[0].payload
                return (
                  <div className="rounded-lg border border-border bg-background-card p-2 shadow-lg text-xs">
                    <p className="font-bold text-text-primary">{d.year}</p>
                    <p className="text-text-muted">Value: {formatCompactMXN(d.value * 1e9)}</p>
                    <p className="text-text-muted">{formatCompactUSD(d.value * 1e9, d.year)}</p>
                    <p className="text-text-muted">Contracts: {formatNumber(d.contracts)}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill="url(#trendGrad)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: color, stroke: 'var(--color-background)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── MONTHLY DEVIATION ───────────────────────────────────────────────────────

function MonthlyDeviation({
  data,
  decemberSpike,
  color,
}: {
  data: Array<{ month: number; month_name: string; contracts: number; value: number; avg_risk: number; is_year_end: boolean }>
  decemberSpike: number | null
  color: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const avg = total / (data.length || 12)

  const chartData = MONTH_ABBR.map((abbr, i) => {
    const found = data.find((d) => d.month === i + 1)
    const val = found?.value ?? 0
    const devPct = avg > 0 ? ((val - avg) / avg) * 100 : 0
    return {
      month: abbr,
      dev: parseFloat(devPct.toFixed(1)),
      value: val,
      contracts: found?.contracts ?? 0,
      avgRisk: found?.avg_risk ?? 0,
      isDecember: i === 11,
      above: devPct >= 0,
    }
  })

  // find the peak non-december month
  const nonDecPeak = [...chartData]
    .filter((d) => !d.isDecember)
    .sort((a, b) => b.dev - a.dev)[0]

  return (
    <div className="space-y-3">
      {/* summary chips */}
      <div className="flex flex-wrap gap-2 text-xs">
        {decemberSpike !== null && decemberSpike > 1.3 && (
          <div className="flex items-center gap-1.5 rounded-md border border-risk-critical/40 bg-risk-critical/8 px-2.5 py-1">
            <span className="font-black text-risk-critical">{decemberSpike.toFixed(1)}×</span>
            <span className="text-text-muted">December vs avg — year-end dump</span>
          </div>
        )}
        {nonDecPeak && nonDecPeak.dev > 20 && (
          <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-background-elevated px-2.5 py-1">
            <span className="font-bold" style={{ color }}>+{nonDecPeak.dev.toFixed(0)}%</span>
            <span className="text-text-muted">{nonDecPeak.month} also above avg</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-md border border-border/40 bg-background-elevated px-2.5 py-1 ml-auto">
          <span className="text-text-muted">avg/month:</span>
          <span className="font-bold tabular-nums text-text-primary">{formatCompactMXN(avg)}</span>
        </div>
      </div>

      {/* diverging chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 56, bottom: 4, left: 30 }}
            barSize={14}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.2} horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <YAxis
              type="category"
              dataKey="month"
              tick={({ x, y, payload }) => {
                const isDecember = payload.value === 'Dec'
                return (
                  <text
                    x={x - 4}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill={isDecember ? '#ef4444' : 'var(--color-text-muted)'}
                    fontSize={isDecember ? 11 : 10}
                    fontWeight={isDecember ? 700 : 400}
                  >
                    {payload.value}
                  </text>
                )
              }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <ReferenceLine x={0} stroke="var(--color-border)" strokeWidth={1.5} strokeDasharray="0" />
            <RechartsTooltip
              cursor={{ fill: 'var(--color-background-elevated)', opacity: 0.4 }}
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  const d = payload[0].payload
                  const riskColor =
                    d.avgRisk >= 0.5 ? RISK_COLORS.critical :
                    d.avgRisk >= 0.3 ? RISK_COLORS.high :
                    d.avgRisk >= 0.1 ? RISK_COLORS.medium : RISK_COLORS.low
                  return (
                    <div className="rounded-lg border border-border bg-background-card p-2.5 shadow-lg text-xs space-y-1 min-w-[160px]">
                      <p className="font-bold text-text-primary text-sm">{d.month}</p>
                      <p className="text-text-muted">Value: <span className="text-text-primary font-medium">{formatCompactMXN(d.value)}</span></p>
                      <p className="text-text-muted">Contracts: <span className="text-text-primary font-medium">{formatNumber(d.contracts)}</span></p>
                      <p className="text-text-muted">vs avg: <span className={cn('font-bold', d.above ? 'text-text-primary' : '')} style={d.above ? { color } : undefined}>{d.dev > 0 ? '+' : ''}{d.dev}%</span></p>
                      <p className="text-text-muted">Avg risk: <span className="font-bold" style={{ color: riskColor }}>{(d.avgRisk * 100).toFixed(0)}%</span></p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="dev" radius={[0, 3, 3, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isDecember ? '#ef4444' : entry.above ? color : 'var(--color-text-muted)'}
                  opacity={entry.isDecember ? 1 : entry.above ? 0.85 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* risk row */}
      <div className="grid grid-cols-12 gap-px pt-1">
        {chartData.map((d) => {
          const riskColor =
            d.avgRisk >= 0.5 ? RISK_COLORS.critical :
            d.avgRisk >= 0.3 ? RISK_COLORS.high :
            d.avgRisk >= 0.1 ? RISK_COLORS.medium : RISK_COLORS.low
          return (
            <div key={d.month} className="flex flex-col items-center gap-1">
              <div
                className="h-1.5 w-full rounded-full"
                style={{ backgroundColor: riskColor, opacity: 0.7 }}
                title={`${d.month} avg risk: ${(d.avgRisk * 100).toFixed(0)}%`}
              />
            </div>
          )
        })}
      </div>
      <p className="text-xs text-text-muted text-center">↑ avg risk score per month (green=low · red=critical)</p>
    </div>
  )
}

// ─── VENDOR BARS ─────────────────────────────────────────────────────────────

function VendorBars({ data, color }: { data: any[]; color: string }) {
  const top = data.slice(0, 8)
  const maxVal = Math.max(...top.map((v) => v.total_value_mxn), 1)

  return (
    <div className="space-y-2.5">
      {top.map((vendor, index) => {
        const barPct = (vendor.total_value_mxn / maxVal) * 100
        const riskScore = vendor.avg_risk_score ?? 0
        const riskColor =
          riskScore >= 0.5 ? RISK_COLORS.critical :
          riskScore >= 0.3 ? RISK_COLORS.high :
          riskScore >= 0.1 ? RISK_COLORS.medium : RISK_COLORS.low

        return (
          <div key={vendor.vendor_id} className="group relative">
            {/* background bar */}
            <div
              className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: hex(color, 0.06) }}
            />
            <div className="relative flex items-center gap-3 px-2 py-1.5 rounded-md">
              <span className="w-5 text-xs tabular-nums text-text-muted font-mono text-right">{index + 1}</span>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/vendors/${vendor.vendor_id}`}
                    className="text-sm font-medium hover:text-accent transition-colors truncate"
                  >
                    {toTitleCase(vendor.vendor_name)}
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold tabular-nums">{formatCompactMXN(vendor.total_value_mxn)}</span>
                    {riskScore > 0 && (
                      <span
                        className="text-xs font-bold tabular-nums font-mono rounded px-1"
                        style={{ color: riskColor, background: `${riskColor}20` }}
                      >
                        {(riskScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                {/* value bar */}
                <div className="h-1 bg-background-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${color}, ${hex(color, 0.5)})` }}
                  />
                </div>
                <p className="text-xs text-text-muted">{formatNumber(vendor.total_contracts)} contracts · {formatCompactUSD(vendor.total_value_mxn)}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── PRICE DISTRIBUTION ──────────────────────────────────────────────────────

function PriceDistribution({
  baseline,
  color,
}: {
  baseline: { percentile_10: number; percentile_25: number; percentile_50: number; percentile_75: number; percentile_90: number; percentile_95: number; upper_fence: number; extreme_fence: number; sample_count: number }
  color: string
}) {
  // Visual quartile range bar
  const min = baseline.percentile_10
  const max = baseline.extreme_fence
  const range = max - min || 1

  const segments = [
    { from: baseline.percentile_10, to: baseline.percentile_25, color: RISK_COLORS.low, label: 'P10–P25' },
    { from: baseline.percentile_25, to: baseline.percentile_50, color: RISK_COLORS.medium, label: 'P25–P50' },
    { from: baseline.percentile_50, to: baseline.percentile_75, color: RISK_COLORS.high, label: 'P50–P75' },
    { from: baseline.percentile_75, to: baseline.extreme_fence, color: RISK_COLORS.critical, label: 'P75–Extreme' },
  ]

  return (
    <div className="space-y-4">
      {/* visual bar */}
      <div>
        <div className="flex h-3 rounded-full overflow-hidden gap-px">
          {segments.map((s) => (
            <div
              key={s.label}
              className="h-full"
              style={{ width: `${((s.to - s.from) / range) * 100}%`, backgroundColor: s.color, opacity: 0.85 }}
              title={`${s.label}: ${formatCompactMXN(s.from)} – ${formatCompactMXN(s.to)}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>{formatCompactMXN(min)}</span>
          <span className="font-bold" style={{ color }}>{formatCompactMXN(baseline.percentile_50)} median</span>
          <span className="text-risk-critical">{formatCompactMXN(max)}</span>
        </div>
      </div>
      <div className="space-y-2">
        <StatRow label="Median" value={formatCompactMXN(baseline.percentile_50)} />
        <StatRow label="75th Pct" value={formatCompactMXN(baseline.percentile_75)} />
        <StatRow label="Outlier Fence" value={formatCompactMXN(baseline.upper_fence)} />
        <StatRow label="Extreme Fence" value={formatCompactMXN(baseline.extreme_fence)} />
        <StatRow label="Sample Size" value={formatNumber(baseline.sample_count)} />
      </div>
    </div>
  )
}

// ─── INVESTIGATION CASES ─────────────────────────────────────────────────────

const CASE_TYPE_LABELS: Record<string, string> = {
  single_vendor: 'Single Vendor',
  bid_rigging: 'Bid Rigging',
  price_manipulation: 'Price Manipulation',
  ghost_company: 'Ghost Company',
  conflict_of_interest: 'Conflict of Interest',
  threshold_splitting: 'Threshold Splitting',
}

function InvestigationCases({ data }: { data: Array<Record<string, unknown>> }) {
  return (
    <div className="space-y-2">
      {data.map((c, i) => {
        const score = typeof c.suspicion_score === 'number' ? c.suspicion_score : null
        const riskColor =
          score !== null && score >= 0.5 ? RISK_COLORS.critical :
          score !== null && score >= 0.3 ? RISK_COLORS.high :
          score !== null && score >= 0.1 ? RISK_COLORS.medium : RISK_COLORS.low
        const title = typeof c.title === 'string' ? c.title : `Case ${i + 1}`
        const caseId = typeof c.case_id === 'string' ? c.case_id : null
        const caseType = typeof c.case_type === 'string' ? (CASE_TYPE_LABELS[c.case_type] ?? c.case_type) : null
        const contracts = typeof c.total_contracts === 'number' ? c.total_contracts : null
        const value = typeof c.total_value_mxn === 'number' ? c.total_value_mxn : null
        const loss = typeof c.estimated_loss_mxn === 'number' ? c.estimated_loss_mxn : null

        const content = (
          <>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-start gap-2 min-w-0">
                <div
                  className="mt-1 h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: score !== null ? riskColor : '#64748b', boxShadow: `0 0 6px ${score !== null ? riskColor : '#64748b'}80` }}
                />
                <p className="text-xs font-semibold text-text-primary leading-snug group-hover:text-accent transition-colors">{title}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {score !== null && (
                  <span
                    className="text-xs font-black tabular-nums font-mono rounded px-1.5 py-0.5"
                    style={{ color: riskColor, background: `${riskColor}20` }}
                  >
                    {(score * 100).toFixed(0)}%
                  </span>
                )}
                <ExternalLink className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="ml-4 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {caseType && (
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wide">{caseType}</span>
              )}
              {contracts !== null && (
                <span className="text-[10px] text-text-muted font-mono">{formatNumber(contracts)} contracts</span>
              )}
              {value !== null && (
                <span className="text-[10px] text-text-muted font-mono">{formatCompactMXN(value)}</span>
              )}
              {loss !== null && loss > 0 && (
                <span className="text-[10px] font-mono" style={{ color: RISK_COLORS.high }}>
                  ~{formatCompactMXN(loss)} est. loss
                </span>
              )}
            </div>
          </>
        )

        return caseId ? (
          <Link
            key={i}
            to={`/investigation/${caseId}`}
            className="group block rounded-lg border border-border/40 px-3 py-2.5 hover:border-risk-high/50 hover:bg-risk-high/5 transition-all cursor-pointer"
          >
            {content}
          </Link>
        ) : (
          <div key={i} className="group rounded-lg border border-border/40 px-3 py-2.5">
            {content}
          </div>
        )
      })}
    </div>
  )
}

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────

function KPICard({
  title, value, icon: Icon, format = 'number', color = '#3b82f6',
}: {
  title: string; value?: number; icon: React.ElementType; format?: 'number' | 'currency' | 'percent'; color?: string
}) {
  const formatted =
    value === undefined ? '-' :
    format === 'currency' ? formatCompactMXN(value) :
    format === 'percent' ? formatPercentSafe(value, true) :
    formatNumber(value)
  const sub = format === 'currency' && value !== undefined ? formatCompactUSD(value) : undefined

  return (
    <Card className="border-border/40 overflow-hidden">
      <div className="h-0.5 w-full" style={{ background: color }} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-text-muted">{title}</p>
            <p className="text-2xl font-black tabular-nums text-text-primary mt-0.5">{formatted}</p>
            {sub && <p className="text-xs text-text-muted tabular-nums">{sub}</p>}
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: hex(color, 0.15), color }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={cn('font-bold tabular-nums', accent && 'text-text-primary')}>{value}</span>
    </div>
  )
}

function SectorProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  )
}

export default SectorProfile
