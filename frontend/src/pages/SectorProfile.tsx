import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatCompactUSD, formatNumber, formatPercentSafe, toTitleCase } from '@/lib/utils'
import { sectorApi, vendorApi, analysisApi, priceApi, investigationApi, caseLibraryApi, institutionApi } from '@/api/client'
import { SECTOR_COLORS, RISK_COLORS, SECTORS } from '@/lib/constants'
import { getSectorDescription } from '@/lib/sector-descriptions'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { ImpactoHumano } from '@/components/ui/ImpactoHumano'
import { FuentePill } from '@/components/ui/FuentePill'
import { GenerateReportButton } from '@/components/GenerateReportButton'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { TableExportButton } from '@/components/TableExportButton'
import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem, fadeIn } from '@/lib/animations'
import {
  BarChart3,
  Building2,
  Users,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  TrendingUp,
  Zap,
  Activity,
  Shield,
  Brain,
  FlaskConical,
  Info,
  ShieldAlert,
  ChevronLeft,
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
  PieChart,
  Pie,
  ReferenceLine,
} from '@/components/charts'

// ── pagination constants ──────────────────────────────────────────────────────

const VENDOR_LIST_PER_PAGE = 20
const INSTITUTION_LIST_PER_PAGE = 15

// ── helpers ───────────────────────────────────────────────────────────────────

function hex(color: string, alpha: number) {
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
  vendor_concentration: 'Vendor Concentration',
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
  price_anomaly: 'Contract value is 3x above sector median',
  short_ad_period: 'Advertisement window too short for real competition',
  'short_ad_<5d': 'Under 5 days between publication and award',
  'short_ad_<15d': 'Under 15 days between publication and award',
  'short_ad_<30d': 'Under 30 days between publication and award',
  year_end: 'Awarded in December -- budget-dump pattern',
  vendor_concentration: 'One vendor controls >30% of sector contracts',
  threshold_splitting: 'Multiple same-day contracts to avoid oversight thresholds',
  network_risk: 'Vendor belongs to a connected group of related companies',
  industry_mismatch: "Vendor's primary industry doesn't match contract scope",
  co_bid_high: 'Vendor co-bids in >80% of procedures with a partner',
  co_bid_med: 'Vendor co-bids in 50-80% of procedures with a partner',
  price_hyp: 'Statistical outlier flagged by IQR price model',
  co_sid_high: 'Vendor co-bids in >80% of procedures with a partner',
  co_sid_med: 'Vendor co-bids in 50-80% of procedures with a partner',
}

/** Sector-specific human impact context for ImpactoHumano callout */
const SECTOR_IMPACT_CONTEXT: Record<string, string> = {
  salud: 'In the health sector, misspent funds translate directly into patients without medicines, hospitals without equipment, and communities without healthcare access.',
  educacion: 'In education, every diverted peso means fewer textbooks, classrooms without maintenance, and students without access to technology.',
  infraestructura: 'Infrastructure spending affects roads, bridges, water systems, and housing that millions of Mexicans depend on daily.',
  energia: 'Energy procurement failures impact electricity reliability for households and industrial competitiveness for the national economy.',
  defensa: 'Defense spending directly affects national security capabilities and the welfare of military personnel and their families.',
  tecnologia: 'Technology procurement inefficiencies slow down government digitalization and leave citizens with outdated public services.',
  hacienda: 'Treasury sector waste undermines the fiscal infrastructure that funds all other government services.',
  gobernacion: 'Governance procurement affects the administrative backbone of the federal government and its ability to serve citizens.',
  agricultura: 'Agricultural procurement directly impacts food security, rural livelihoods, and the 27 million Mexicans who depend on farming.',
  ambiente: 'Environmental spending protects natural resources, water quality, and the ecological systems that sustain communities.',
  trabajo: 'Labor sector procurement affects workplace safety, job training, and social security for millions of workers.',
  otros: 'Miscellaneous government procurement covers diverse agencies whose spending affects public services across the country.',
}

// ── page ──────────────────────────────────────────────────────────────────────

export function SectorProfile() {
  const { id } = useParams<{ id: string }>()
  const sectorId = Number(id)
  const navigate = useNavigate()
  const { t: ts } = useTranslation('sectors')
  const currentYear = useMemo(() => new Date().getFullYear() - 1, [])

  // Prev/next sector navigation using the static SECTORS list
  const sectorIndex = SECTORS.findIndex((s) => s.id === sectorId)
  const prevSector = sectorIndex > 0 ? SECTORS[sectorIndex - 1] : null
  const nextSector = sectorIndex < SECTORS.length - 1 ? SECTORS[sectorIndex + 1] : null
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

  const { data: riskDist, isLoading: riskLoading, error: riskDistError } = useQuery({
    queryKey: ['sector', sectorId, 'risk-distribution'],
    queryFn: () => sectorApi.getRiskDistribution(sectorId),
    enabled: !!sectorId,
  })

  const { data: topVendors, isLoading: vendorsLoading, error: topVendorsError } = useQuery({
    queryKey: ['vendors', 'top', 'value', { sector_id: sectorId, per_page: VENDOR_LIST_PER_PAGE }],
    queryFn: () => vendorApi.getTop('value', VENDOR_LIST_PER_PAGE, { sector_id: sectorId }),
    enabled: !!sectorId,
  })

  const { data: monthlyData, isLoading: monthlyLoading, error: monthlyError } = useQuery({
    queryKey: ['analysis', 'monthly', selectedYear, sectorId],
    queryFn: () => analysisApi.getMonthlyBreakdown(selectedYear, sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: riskFactors, isLoading: riskFactorsLoading, error: riskFactorsError } = useQuery({
    queryKey: ['analysis', 'risk-factors', sectorId],
    queryFn: () => analysisApi.getRiskFactorAnalysis(sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: priceBaselines, isLoading: priceLoading, error: priceBaselinesError } = useQuery({
    queryKey: ['price', 'baselines', sectorId],
    queryFn: () => priceApi.getBaselines(sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: topCases, error: topCasesError } = useQuery({
    queryKey: ['investigation', 'top', 5, sectorId],
    queryFn: () => investigationApi.getTopCases(5, sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: moneyFlow, isLoading: moneyFlowLoading, error: moneyFlowError } = useQuery({
    queryKey: ['analysis', 'money-flow', sectorId],
    queryFn: () => analysisApi.getMoneyFlow(undefined, sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: sectorCases, error: sectorCasesError } = useQuery({
    queryKey: ['cases', 'by-sector', sectorId],
    queryFn: () => caseLibraryApi.getBySector(sectorId),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: priceAnomalies, isLoading: priceAnomaliesLoading, error: priceAnomaliesError } = useQuery({
    queryKey: ['price', 'hypotheses', sectorId],
    queryFn: () => priceApi.getHypotheses({ sector_id: sectorId, per_page: 6, sort_by: 'confidence', sort_order: 'desc' }),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  const { data: sectorInstitutions, error: sectorInstitutionsError } = useQuery({
    queryKey: ['institutions', 'by-sector', sectorId],
    queryFn: () => institutionApi.getAll({ sector_id: sectorId, per_page: INSTITUTION_LIST_PER_PAGE, sort_by: 'total_amount_mxn', sort_order: 'desc' }),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  // Top vendor by risk score
  const { data: topRiskVendors } = useQuery({
    queryKey: ['vendors', 'top', 'risk', { sector_id: sectorId, per_page: 1 }],
    queryFn: () => vendorApi.getTop('risk', 1, { sector_id: sectorId }),
    enabled: !!sectorId,
    staleTime: 10 * 60 * 1000,
  })

  // Per-sector model coefficients — endpoint not yet implemented; disabled to avoid blocking render
  const { data: modelCoefficients } = useQuery({
    queryKey: ['sector', sectorId, 'model-coefficients'],
    queryFn: () => sectorApi.getModelCoefficients(sectorId),
    enabled: false,
    staleTime: 60 * 60 * 1000,
  })

  // Temporal anomaly — endpoint not yet implemented; disabled to avoid blocking render
  const { data: temporalAnomaly } = useQuery({
    queryKey: ['sector', sectorId, 'temporal-anomaly'],
    queryFn: () => sectorApi.getTemporalAnomaly(sectorId),
    enabled: false,
    staleTime: 30 * 60 * 1000,
  })

  // ── SECTOR INTELLIGENCE insights ──────────────────────────────────────────
  const insights = useMemo(() => {
    const result: Array<{
      type: 'warning' | 'info' | 'critical' | 'positive'
      title: string
      body: string
      icon: 'AlertTriangle' | 'Info' | 'ShieldAlert' | 'TrendingUp' | 'Users'
    }> = []

    const stats = sector?.statistics
    if (!stats) return result

    const highRiskRate = stats.total_contracts > 0
      ? (stats.high_risk_count + stats.critical_risk_count) / stats.total_contracts
      : 0
    const platformBaseline = 0.090
    if (highRiskRate > platformBaseline * 1.5) {
      result.push({
        type: 'critical',
        title: 'Elevated High-Risk Rate',
        body: `${(highRiskRate * 100).toFixed(1)}% high-risk rate is significantly above the platform average of 9.0%.`,
        icon: 'AlertTriangle',
      })
    } else if (highRiskRate < 0.02 && stats.total_contracts > 1000) {
      result.push({
        type: 'positive',
        title: 'Low Model Risk Signal',
        body: `${(highRiskRate * 100).toFixed(1)}% high-risk rate is unusually low -- may reflect data quality gaps or structural sector characteristics.`,
        icon: 'Info',
      })
    }

    if (stats.direct_award_pct > 70) {
      result.push({
        type: 'warning',
        title: 'High Direct Award Rate',
        body: `${stats.direct_award_pct.toFixed(0)}% of contracts are direct awards, limiting competitive transparency.`,
        icon: 'ShieldAlert',
      })
    }

    const topVendorValue = topVendors?.data?.[0]?.total_value_mxn
    if (topVendorValue && stats.total_value_mxn > 0) {
      const topShare = topVendorValue / stats.total_value_mxn
      const sectorCode = sector?.code ?? ''
      const hasStructuralConcentration = ['energia', 'defensa'].includes(sectorCode)
      if (topShare > 0.3) {
        const vendorName = topVendors?.data?.[0]?.vendor_name ?? 'Top vendor'
        result.push({
          type: hasStructuralConcentration ? 'info' : 'warning',
          title: 'Vendor Concentration',
          body: hasStructuralConcentration
            ? `${vendorName} holds ${(topShare * 100).toFixed(1)}% of sector value. Note: this sector may have structural concentration due to regulatory requirements or certified supplier limits.`
            : `${vendorName} holds ${(topShare * 100).toFixed(1)}% of sector contract value -- a key risk indicator in the v6.0 model.`,
          icon: 'TrendingUp',
        })
      }
    }

    if (stats.single_bid_pct > 25) {
      result.push({
        type: 'warning',
        title: 'Single-Bid Procedures',
        body: `${stats.single_bid_pct.toFixed(0)}% of competitive procedures had only one bidder.`,
        icon: 'Users',
      })
    }

    return result
  }, [sector?.statistics, sector?.code, topVendors])

  // Top risk signal from factor_frequencies
  const topRiskSignal = useMemo(() => {
    const freqs = riskFactors?.factor_frequencies
    if (!freqs?.length) return null
    const top = freqs[0]
    const label = top.factor in {
      direct_award: 1, single_bid: 1, price_anomaly: 1, short_ad_period: 1,
      year_end: 1, vendor_concentration: 1, threshold_splitting: 1, network_risk: 1,
      industry_mismatch: 1
    } ? ({
      direct_award: 'Direct Award',
      single_bid: 'Single Bid',
      price_anomaly: 'Price Anomaly',
      short_ad_period: 'Short Ad Period',
      year_end: 'Year-End Rush',
      vendor_concentration: 'Vendor Concentration',
      threshold_splitting: 'Contract Splitting',
      network_risk: 'Network Risk',
      industry_mismatch: 'Industry Mismatch',
    } as Record<string, string>)[top.factor] ?? top.factor : top.factor
    return { factor: top.factor, label, percentage: top.percentage, avgRisk: top.avg_risk_score }
  }, [riskFactors])

  // Generate editorial lede text
  const ledeText = useMemo(() => {
    const stats = sector?.statistics
    if (!stats) return null
    const sectorCode = sector?.code ?? ''
    const desc = getSectorDescription(sectorCode)
    const highRiskRate = stats.total_contracts > 0
      ? ((stats.high_risk_count + stats.critical_risk_count) / stats.total_contracts * 100).toFixed(1)
      : '0'
    const riskContext = parseFloat(highRiskRate) > 13.5
      ? `With ${highRiskRate}% of contracts flagged as high-risk, this sector demands heightened scrutiny.`
      : parseFloat(highRiskRate) > 5
      ? `${highRiskRate}% of contracts carry elevated risk indicators, within the OECD benchmark range.`
      : `Only ${highRiskRate}% of contracts show elevated risk signals, though data quality limitations may suppress detection.`

    return `${desc.short} ${riskContext}`
  }, [sector?.statistics, sector?.code])

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
  const caseData = (topCases?.data ?? []) as Record<string, unknown>[]
  const highRiskPct = stats && stats.total_contracts > 0
    ? ((stats.high_risk_count + stats.critical_risk_count) / stats.total_contracts * 100).toFixed(1)
    : '0'

  return (
    <article className="max-w-6xl mx-auto space-y-8 pb-12">

      {/* ── EDITORIAL BREADCRUMB ──────────────────────────────────────────── */}
      <motion.nav
        className="flex items-center justify-between pt-2"
        variants={fadeIn}
        initial="initial"
        animate="animate"
        aria-label="Sector navigation"
      >
        <Link
          to="/sectors"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-text-muted hover:text-text-primary transition-colors font-semibold"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All Sectors
        </Link>
        <div className="flex items-center gap-2">
          {prevSector && (
            <button
              onClick={() => navigate(`/sectors/${prevSector.id}`)}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
              aria-label={`Previous: ${ts(prevSector.code)}`}
            >
              <ArrowLeft className="h-3 w-3" />
              {ts(prevSector.code)}
            </button>
          )}
          {prevSector && nextSector && <span className="text-border">|</span>}
          {nextSector && (
            <button
              onClick={() => navigate(`/sectors/${nextSector.id}`)}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
              aria-label={`Next: ${ts(nextSector.code)}`}
            >
              {ts(nextSector.code)}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </motion.nav>

      {/* ── HERO WITH SECTOR COLOR BAR ────────────────────────────────────── */}
      <motion.header
        className="relative flex gap-0"
        variants={slideUp}
        initial="initial"
        animate="animate"
      >
        {/* Left color bar */}
        <div
          className="w-1.5 flex-shrink-0 rounded-l-lg"
          style={{ backgroundColor: sectorColor }}
        />

        <div className="flex-1 rounded-r-lg border border-l-0 border-border/40 bg-zinc-900/50 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Sector icon */}
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl shadow-lg flex-shrink-0"
                style={{ backgroundColor: hex(sectorColor, 0.15), border: `1px solid ${hex(sectorColor, 0.3)}` }}
              >
                <BarChart3 className="h-7 w-7" style={{ color: sectorColor }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
                  Perfil Sectorial
                </p>
                <h1
                  className="text-3xl md:text-4xl font-bold text-text-primary leading-tight capitalize"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {sector.name}
                </h1>
                <p className="text-sm text-text-secondary mt-1.5 max-w-xl leading-relaxed">
                  {getSectorDescription(sector.code).short}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {stats && (
                <div className="text-right">
                  <p className="text-3xl font-black tabular-nums text-text-primary" style={{ fontFamily: 'var(--font-family-serif)' }}>
                    {formatCompactMXN(stats.total_value_mxn)}
                  </p>
                  <p className="text-xs text-text-muted">total procurement value</p>
                </div>
              )}
              <GenerateReportButton reportType="sector" entityId={sectorId} entityName={sector.name} variant="outline" />
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── HALLAZGO STAT ROW ─────────────────────────────────────────────── */}
      <motion.div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
      >
        <motion.div variants={staggerItem}>
          <HallazgoStat
            value={stats ? formatNumber(stats.total_contracts) : '-'}
            label="contracts in COMPRANET"
            annotation="2002-2025"
            style={{ borderLeftColor: sectorColor }}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <HallazgoStat
            value={stats ? formatCompactMXN(stats.total_value_mxn) : '-'}
            label="total procurement spend"
            annotation={stats ? formatCompactUSD(stats.total_value_mxn) : undefined}
            style={{ borderLeftColor: sectorColor }}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <HallazgoStat
            value={stats ? `${(stats.avg_risk_score * 100).toFixed(1)}%` : '-'}
            label="average risk score"
            annotation="v6.5 model"
            style={{ borderLeftColor: sectorColor }}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <HallazgoStat
            value={`${highRiskPct}%`}
            label="high + critical risk"
            annotation={stats ? `${formatNumber(stats.high_risk_count + stats.critical_risk_count)} contracts` : undefined}
            color="border-red-500"
          />
        </motion.div>
      </motion.div>

      {/* ── INVESTIGATION LEDE ────────────────────────────────────────────── */}
      {ledeText && (
        <motion.div
          className="border-t border-b border-border py-5"
          variants={fadeIn}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          <p
            className="text-lg text-text-secondary leading-relaxed max-w-3xl"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {ledeText}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <FuentePill source="COMPRANET" count={stats?.total_contracts} />
            <FuentePill source="v6.5 Model" verified />
          </div>
        </motion.div>
      )}

      {/* ── SECTOR INTELLIGENCE ───────────────────────────────────────────── */}
      {(insights.length > 0 || topRiskSignal) && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-text-muted" />
            <h2
              className="text-sm font-semibold text-text-secondary uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              Sector Intelligence
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topRiskSignal && (
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
                <div className="flex items-center gap-1.5 text-sm font-semibold mb-1 text-violet-400">
                  <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                  Top Risk Signal
                </div>
                <div className="text-xs text-text-muted leading-relaxed">
                  <span className="font-bold text-text-primary">{topRiskSignal.label}</span> is the #1 red flag --
                  appears in {topRiskSignal.percentage.toFixed(1)}% of contracts with avg risk{' '}
                  <span className="font-bold" style={{ color: topRiskSignal.avgRisk >= 0.5 ? '#f87171' : topRiskSignal.avgRisk >= 0.3 ? '#fb923c' : '#fbbf24' }}>
                    {(topRiskSignal.avgRisk * 100).toFixed(0)}%
                  </span>.
                </div>
              </div>
            )}
            {insights.map((insight, i) => {
              const borderColor =
                insight.type === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                insight.type === 'warning'  ? 'border-amber-500/30 bg-amber-500/5' :
                insight.type === 'positive' ? 'border-emerald-500/30 bg-emerald-500/5' :
                'border-cyan-500/30 bg-cyan-500/5'
              const textColor =
                insight.type === 'critical' ? 'text-red-400' :
                insight.type === 'warning'  ? 'text-amber-400' :
                insight.type === 'positive' ? 'text-emerald-400' :
                'text-cyan-400'
              const IconComponent =
                insight.icon === 'AlertTriangle' ? AlertTriangle :
                insight.icon === 'ShieldAlert'   ? ShieldAlert :
                insight.icon === 'TrendingUp'    ? TrendingUp :
                insight.icon === 'Users'         ? Users :
                Info
              return (
                <div key={i} className={`rounded-lg border p-4 ${borderColor}`}>
                  <div className={`flex items-center gap-1.5 text-sm font-semibold mb-1 ${textColor}`}>
                    <IconComponent className="h-3.5 w-3.5 flex-shrink-0" />
                    {insight.title}
                  </div>
                  <div className="text-xs text-text-muted leading-relaxed">{insight.body}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── MAIN CONTENT GRID ─────────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-3">

        {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* RISK DISTRIBUTION DONUT */}
          <section>
            <EditorialHeadline
              section="Risk Intelligence"
              headline="Risk Distribution"
              subtitle="How contracts in this sector score across risk levels"
            />
            <div className="mt-4">
              {riskLoading ? (
                <Skeleton className="h-56 w-full rounded-xl" />
              ) : riskDistError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load risk data.</p>
              ) : riskDist?.data ? (
                <RiskDonut data={riskDist.data} color={sectorColor} />
              ) : null}
            </div>
          </section>

          {/* RISK SIGNATURE */}
          <section className="card-elevated">
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
              ) : riskFactorsError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load risk factors.</p>
              ) : riskFactors?.factor_frequencies?.length ? (
                <FactorRankList data={riskFactors.factor_frequencies} color={sectorColor} />
              ) : (
                <p className="text-xs text-text-muted py-4 text-center">No factor data</p>
              )}
            </CardContent>
          </section>

          {/* HIGHEST-RISK VENDOR CALLOUT */}
          {topRiskVendors?.data?.[0] && (() => {
            const worstVendor = topRiskVendors.data[0]!
            const riskScore = worstVendor.avg_risk_score ?? 0
            const riskColor =
              riskScore >= 0.5 ? RISK_COLORS.critical :
              riskScore >= 0.3 ? RISK_COLORS.high :
              riskScore >= 0.1 ? RISK_COLORS.medium : RISK_COLORS.low
            return (
              <section
                className="rounded-lg border bg-zinc-900/40 p-4"
                style={{ borderColor: `${riskColor}40`, borderTopWidth: '3px', borderTopColor: riskColor }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4" style={{ color: riskColor }} />
                  <h3
                    className="text-sm font-bold text-text-primary"
                    style={{ fontFamily: 'var(--font-family-serif)' }}
                  >
                    Highest-Risk Vendor
                  </h3>
                </div>
                <Link
                  to={`/vendors/${worstVendor.vendor_id}`}
                  className="group block rounded-lg border border-border/30 p-3 hover:border-accent/40 hover:bg-accent/3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                      {toTitleCase(worstVendor.vendor_name ?? 'Unknown')}
                    </p>
                    <span
                      className="text-sm font-black tabular-nums font-mono rounded px-2 py-0.5 flex-shrink-0"
                      style={{ color: riskColor, background: `${riskColor}20` }}
                    >
                      {(riskScore * 100).toFixed(0)}% risk
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-background-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(100, riskScore * 200)}%`, background: riskColor }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-text-muted">
                    {worstVendor.total_contracts ? `${worstVendor.total_contracts.toLocaleString()} contracts` : ''}
                    {worstVendor.total_value_mxn ? ` -- ${formatCompactMXN(worstVendor.total_value_mxn)}` : ''}
                  </p>
                  <p className="text-[10px] text-accent mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Investigate vendor &rarr;
                  </p>
                </Link>
              </section>
            )
          })()}

          {/* PROCUREMENT STATS */}
          <section className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Procurement Patterns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatRow label="Direct Awards" value={formatPercentSafe(stats?.direct_award_pct, false) || '-'} accent />
              <StatRow label="Single Bids" value={formatPercentSafe(stats?.single_bid_pct, false) || '-'} accent />
              <StatRow label="Avg Risk Score" value={formatPercentSafe(stats?.avg_risk_score, true) || '-'} />
              <StatRow label="High Risk Count" value={formatNumber((stats?.high_risk_count || 0) + (stats?.critical_risk_count || 0))} />
            </CardContent>
          </section>

          {/* MODEL COEFFICIENTS */}
          {modelCoefficients && (
            <section className="card-elevated">
              <details>
                <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors select-none">
                  <Brain className="h-4 w-4 text-purple-400 flex-shrink-0" />
                  <span>
                    Modelo v6.5
                    <span className="ml-2 text-[10px] font-mono text-text-muted">
                      ({modelCoefficients.model_used === 'sector' ? 'sector-specific' : 'global fallback'})
                    </span>
                  </span>
                </summary>
                <div className="px-4 pb-3 space-y-1.5">
                  {modelCoefficients.coefficients.slice(0, 6).map((c: { feature: string; coefficient: number }) => {
                    const isPositive = c.coefficient > 0
                    const barWidth = Math.min(100, Math.abs(c.coefficient) / 2 * 100)
                    return (
                      <div key={c.feature} className="flex items-center gap-2 text-xs">
                        <span className="w-36 truncate text-text-muted font-mono" title={c.feature}>
                          {c.feature.replace(/_/g, ' ')}
                        </span>
                        <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: isPositive ? 'var(--color-risk-high)' : 'var(--color-risk-low)',
                            }}
                          />
                        </div>
                        <span
                          className="w-12 text-right font-mono tabular-nums"
                          style={{ color: isPositive ? 'var(--color-risk-high)' : 'var(--color-risk-low)' }}
                        >
                          {c.coefficient > 0 ? '+' : ''}{c.coefficient.toFixed(3)}
                        </span>
                      </div>
                    )
                  })}
                  {modelCoefficients.intercept != null && (
                    <p className="text-[10px] text-text-muted font-mono pt-1">
                      intercept: {modelCoefficients.intercept.toFixed(4)}
                    </p>
                  )}
                </div>
              </details>
            </section>
          )}

          {/* TEMPORAL ANOMALY */}
          {temporalAnomaly && (temporalAnomaly.anomalies?.length ?? 0) > 0 && (
            <section className="card-elevated border border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-amber-400" />
                  Anomalias {temporalAnomaly.current_year}
                  <span className="ml-1 text-[10px] font-mono text-text-muted">
                    ({temporalAnomaly.contract_count?.toLocaleString()} contratos)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {temporalAnomaly.anomalies.map((a: { feature: string; label: string; z_score: number; direction: 'above' | 'below'; severity: 'high' | 'moderate' }) => (
                  <div key={a.feature} className="flex items-start gap-2 text-xs">
                    <span
                      className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: a.severity === 'high' ? 'var(--color-risk-critical)' : 'var(--color-risk-medium)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-text-secondary">{a.label}</span>
                      <span className="ml-1.5 font-mono text-text-muted">
                        {a.direction === 'above' ? '\u2191' : '\u2193'} {Math.abs(a.z_score).toFixed(1)}\u03C3
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </section>
          )}

          {/* PRICE INTELLIGENCE */}
          {(priceLoading || priceBaseline || priceBaselinesError) && (
            <section className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Price Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {priceBaselinesError ? (
                  <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load price data.</p>
                ) : priceLoading ? (
                  <div className="space-y-2">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-6" />)}</div>
                ) : priceBaseline ? (
                  <PriceDistribution baseline={priceBaseline} color={sectorColor} />
                ) : null}
              </CardContent>
            </section>
          )}

          {/* DOCUMENTED CASES */}
          {(sectorCasesError || (sectorCases && sectorCases.length > 0)) && (
            <section className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-risk-critical" />
                  Documented Cases
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pb-3">
                {sectorCasesError ? (
                  <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load documented cases.</p>
                ) : sectorCases?.map((c) => (
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
                  View all &rarr;
                </Link>
              </CardContent>
            </section>
          )}
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* SPENDING TREND */}
          <section>
            <EditorialHeadline
              section="Spending Trend"
              headline={`Contract Value -- 2010 to ${currentYear}`}
              subtitle="Year-over-year procurement spending in this sector"
            />
            <div className="mt-4 card-elevated overflow-hidden p-4">
              <div className="flex justify-end mb-2">
                <ChartDownloadButton targetRef={trendChartRef} filename={`rubli-sector-${sector.code}-spend`} />
              </div>
              <div ref={trendChartRef}>
                {sector.trends?.length ? (
                  <TrendArea data={sector.trends} color={sectorColor} />
                ) : (
                  <p className="text-sm text-text-muted px-4 py-8 text-center">No trend data available for this sector</p>
                )}
              </div>
            </div>
          </section>

          {/* MONTHLY DEVIATION */}
          <section>
            <EditorialHeadline
              section="Monthly Analysis"
              headline={`Month vs. Average -- ${selectedYear}`}
              subtitle="How each month deviates from the sector's own monthly average"
            />
            <div className="mt-4 card-elevated p-4">
              <div className="flex justify-end gap-2 mb-3">
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
                      <option value="">older...</option>
                      {yearOptions.slice(8).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div ref={monthlyChartRef}>
                {monthlyLoading ? (
                  <Skeleton className="h-72 w-full" />
                ) : monthlyError ? (
                  <p className="text-xs text-rose-400/80 py-8 text-center">Failed to load monthly data.</p>
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
            </div>
          </section>

          {/* TOP VENDORS -- EDITORIAL CARDS */}
          <section>
            <EditorialHeadline
              section="Top Vendors"
              headline="Dominant Suppliers"
              subtitle="Ranked by total procurement value in this sector"
            />
            <div className="mt-4">
              <div className="flex items-center justify-end gap-1 mb-3">
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
              <div ref={vendorChartRef}>
                {vendorsLoading ? (
                  <div className="space-y-2">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-12" />)}</div>
                ) : topVendorsError ? (
                  <p className="text-xs text-rose-400/80 py-8 text-center">Failed to load vendor data.</p>
                ) : topVendors?.data ? (
                  <VendorBars data={topVendors.data} color={sectorColor} />
                ) : (
                  <p className="text-sm text-text-muted py-8 text-center">No vendor data available for this sector</p>
                )}
              </div>
            </div>
          </section>

          {/* HUMAN IMPACT CALLOUT */}
          {stats && stats.total_value_mxn > 0 && (
            <motion.section
              className="space-y-3"
              variants={fadeIn}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              <div className="h-px bg-border" />
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p
                    className="text-sm text-text-secondary leading-relaxed italic"
                    style={{ fontFamily: 'var(--font-family-serif)' }}
                  >
                    {SECTOR_IMPACT_CONTEXT[sector.code] || SECTOR_IMPACT_CONTEXT.otros}
                  </p>
                </div>
                <div className="flex-shrink-0 w-64">
                  <ImpactoHumano amountMxn={stats.total_value_mxn * (parseFloat(highRiskPct) / 100)} />
                </div>
              </div>
              <div className="h-px bg-border" />
            </motion.section>
          )}

          {/* KNOWN INVESTIGATION CASES */}
          {(topCasesError || caseData.length > 0) && (
            <section>
              <EditorialHeadline
                section="Documented Corruption"
                headline="Known Investigation Cases"
                subtitle="Cases with documented evidence in this sector"
              />
              <div className="mt-4 rounded-lg border border-risk-high/30 bg-risk-critical/3 overflow-hidden p-4">
                <div className="flex items-center justify-end mb-3">
                  <Link to={`/investigation?sector_id=${sectorId}`}>
                    <Button variant="ghost" size="sm" className="text-xs text-risk-high">
                      Investigate <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                {topCasesError ? (
                  <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load investigation cases.</p>
                ) : (
                  <InvestigationCases data={caseData} />
                )}
              </div>
            </section>
          )}

          {/* SPENDING BY INSTITUTION */}
          <section>
            <EditorialHeadline
              section="Institutional Breakdown"
              headline="Spending by Institution"
              subtitle="Which institutions drive this sector's procurement"
            />
            <div className="mt-4 card-elevated p-4">
              {moneyFlowError ? (
                <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load money flow data.</p>
              ) : moneyFlowLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : moneyFlow?.flows?.length ? (
                <MoneyFlowList flows={moneyFlow.flows.slice(0, 7)} color={sectorColor} />
              ) : (
                <p className="text-xs text-text-muted py-4 text-center">No flow data</p>
              )}
            </div>
          </section>

          {/* AI PRICE ANOMALIES */}
          <section className="card-elevated p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-text-primary">AI Price Anomalies</h3>
                </div>
                <p className="text-xs text-text-muted mt-0.5">Contracts statistically flagged as overpriced</p>
              </div>
              <Link to={`/price-analysis?sector_id=${sectorId}`}>
                <Button variant="ghost" size="sm" className="text-xs">All <ExternalLink className="ml-1 h-3 w-3" /></Button>
              </Link>
            </div>
            {priceAnomaliesError ? (
              <p className="text-xs text-rose-400/80 py-4 text-center">Failed to load price anomalies.</p>
            ) : priceAnomaliesLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : priceAnomalies?.data?.length ? (
              <PriceAnomalyList data={priceAnomalies.data as PriceAnomalyItem[]} color={sectorColor} />
            ) : (
              <div className="flex flex-col items-center py-6 gap-2">
                <Brain className="h-8 w-8 text-text-muted opacity-40" />
                <p className="text-xs text-text-muted">No price anomalies detected</p>
              </div>
            )}
          </section>

          {/* INSTITUTIONS TABLE */}
          <section className="card-elevated">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-text-muted" />
                  <h2 className="text-sm font-bold text-text-primary">Institutions in This Sector</h2>
                  {sectorInstitutions && (
                    <span className="text-xs text-text-muted">({sectorInstitutions.data.length})</span>
                  )}
                </div>
                {sectorInstitutions && sectorInstitutions.data.length > 0 && (
                  <TableExportButton
                    data={sectorInstitutions.data.map((inst) => ({
                      institution_id: inst.id,
                      institution_name: inst.name,
                      institution_type: inst.institution_type ?? '',
                      contract_count: inst.total_contracts ?? '',
                      total_value_mxn: inst.total_amount_mxn ?? '',
                      avg_risk_score: inst.avg_risk_score != null ? (inst.avg_risk_score * 100).toFixed(2) + '%' : '',
                      direct_award_pct: inst.direct_award_pct != null ? inst.direct_award_pct.toFixed(1) + '%' : '',
                    }))}
                    filename={`rubli-sector-${sector.code}-institutions`}
                  />
                )}
              </div>

              {sectorInstitutionsError ? (
                <p className="text-xs text-rose-400/80 py-6 text-center">Failed to load institutions data.</p>
              ) : !sectorInstitutions ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : sectorInstitutions.data.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <Building2 className="h-8 w-8 text-text-muted opacity-30" />
                  <p className="text-xs text-text-muted">No institutions data available for this sector.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" role="table" aria-label="Institutions in sector">
                    <thead>
                      <tr>
                        <th className="data-cell-header text-left">Institution</th>
                        <th className="data-cell-header text-left hidden sm:table-cell">Type</th>
                        <th className="data-cell-header text-right">Contracts</th>
                        <th className="data-cell-header text-right hidden md:table-cell">Total Value</th>
                        <th className="data-cell-header text-center">Avg Risk</th>
                        <th className="data-cell-header text-right hidden lg:table-cell">Direct Award %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectorInstitutions.data.map((inst) => {
                        const riskScore = inst.avg_risk_score ?? 0
                        const riskColor =
                          riskScore >= 0.50 ? 'text-risk-critical' :
                          riskScore >= 0.30 ? 'text-risk-high' :
                          riskScore >= 0.10 ? 'text-risk-medium' :
                          'text-risk-low'
                        const daRate = inst.direct_award_pct ?? 0
                        const daHigh = daRate > 0.7

                        return (
                          <tr
                            key={inst.id}
                            className="hover:bg-background-elevated/30 transition-colors"
                          >
                            <td className="data-cell">
                              <Link
                                to={`/institutions/${inst.id}`}
                                className="font-medium text-text-secondary hover:text-accent transition-colors truncate block max-w-[200px]"
                                title={inst.name}
                              >
                                {toTitleCase(inst.name)}
                              </Link>
                            </td>
                            <td className="data-cell text-text-muted hidden sm:table-cell">
                              {inst.institution_type
                                ? <span className="px-1.5 py-0.5 rounded bg-background-elevated/50 border border-border/30 font-mono text-[10px]">{inst.institution_type}</span>
                                : <span className="text-text-muted/40">&mdash;</span>
                              }
                            </td>
                            <td className="data-cell text-right font-mono tabular-nums text-text-primary">
                              {formatNumber(inst.total_contracts ?? 0)}
                            </td>
                            <td className="data-cell text-right font-mono tabular-nums text-text-primary hidden md:table-cell">
                              {inst.total_amount_mxn != null ? formatCompactMXN(inst.total_amount_mxn) : '&mdash;'}
                            </td>
                            <td className="data-cell text-center">
                              {inst.avg_risk_score != null ? (
                                <span className={cn('font-mono tabular-nums font-semibold', riskColor)}>
                                  {(inst.avg_risk_score * 100).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-text-muted/40">&mdash;</span>
                              )}
                            </td>
                            <td className="data-cell text-right font-mono tabular-nums hidden lg:table-cell">
                              {inst.direct_award_pct != null ? (
                                <span className={cn(daHigh ? 'text-amber-400/90' : 'text-text-muted')}>
                                  {formatPercentSafe(inst.direct_award_pct)}
                                </span>
                              ) : (
                                <span className="text-text-muted/40">&mdash;</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {sectorInstitutions.pagination && sectorInstitutions.pagination.total > sectorInstitutions.data.length && (
                    <p className="text-[11px] text-text-muted mt-3 text-center">
                      Showing {sectorInstitutions.data.length} of {formatNumber(sectorInstitutions.pagination.total)} institutions.{' '}
                      <Link to={`/institutions?sector_id=${sectorId}`} className="text-accent hover:underline">View all</Link>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </section>

          {/* QUICK ACTIONS */}
          <div className="grid gap-3 md:grid-cols-3">
            <Link to={`/contracts?sector_id=${sectorId}`} className="group">
              <div className="interactive-card hover-lift card p-4">
                <FileText className="h-5 w-5 mb-2 text-text-muted group-hover:text-amber-400 transition-colors" />
                <p className="text-sm font-medium">All Contracts</p>
                <p className="text-xs text-text-muted font-mono tabular-nums">
                  {stats?.total_contracts ? formatNumber(stats.total_contracts) : 'Browse full list'}
                </p>
              </div>
            </Link>
            <Link to={`/vendors?sector_id=${sectorId}`} className="group">
              <div className="interactive-card hover-lift card p-4">
                <Users className="h-5 w-5 mb-2 text-text-muted group-hover:text-amber-400 transition-colors" />
                <p className="text-sm font-medium">Vendors</p>
                <p className="text-xs text-text-muted font-mono tabular-nums">
                  {stats?.total_vendors ? formatNumber(stats.total_vendors) : 'All sector vendors'}
                </p>
              </div>
            </Link>
            <Link to={`/contracts?sector_id=${sectorId}&risk_level=high`} className="group">
              <div className="interactive-card hover-lift card p-4" style={{ borderColor: 'var(--color-risk-high)' }}>
                <AlertTriangle className="h-5 w-5 mb-2 text-risk-high" />
                <p className="text-sm font-medium text-risk-high">High Risk Only</p>
                <p className="text-xs text-text-muted font-mono tabular-nums">
                  {stats ? formatNumber((stats.high_risk_count ?? 0) + (stats.critical_risk_count ?? 0)) + ' flagged' : 'Flagged contracts'}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

// ── RISK DONUT ────────────────────────────────────────────────────────────────

function RiskDonut({
  data,
  color: _color,
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
      <div
        className="relative h-52 w-52 flex-shrink-0"
        role="img"
        aria-label="Donut chart showing contract distribution by risk level for this sector"
      >
        <span className="sr-only">Donut chart showing the proportion of contracts at Critical, High, Medium, and Low risk levels for this sector.</span>
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums text-text-primary">{highPlusPct}%</span>
          <span className="text-xs text-text-muted font-mono uppercase">high+</span>
        </div>
      </div>
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

// ── FACTOR RANK LIST ──────────────────────────────────────────────────────────

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

// ── INSTITUTION SPENDING LIST ─────────────────────────────────────────────────

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
                <span style={{ color: riskColor }}> -- {f.high_risk_pct.toFixed(1)}% high risk</span>
              )}
            </p>
          </Link>
        )
      })}
    </div>
  )
}

// ── PRICE ANOMALY LIST ────────────────────────────────────────────────────────

const HYPOTHESIS_LABELS: Record<string, { label: string; color: string }> = {
  extreme_overpricing: { label: 'Extreme Overpricing', color: RISK_COLORS.critical },
  statistical_outlier: { label: 'Statistical Outlier', color: RISK_COLORS.high },
  vendor_price_spike: { label: 'Vendor Price Spike', color: RISK_COLORS.high },
  sector_anomaly: { label: 'Sector Anomaly', color: RISK_COLORS.medium },
}

interface PriceAnomalyItem {
  hypothesis_id: string
  hypothesis_type: string
  contract_id: number
  confidence: number
  confidence_level?: string
  amount_mxn: number
  explanation?: string
  recommended_action?: string
}

function PriceAnomalyList({
  data,
  color: _color,
}: {
  data: PriceAnomalyItem[]
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
              <p className="text-[10px] text-accent mt-0.5 leading-relaxed">&rarr; {d.recommended_action}</p>
            )}
          </Link>
        )
      })}
    </div>
  )
}

// ── TREND AREA ────────────────────────────────────────────────────────────────

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
    <div
      className="h-72"
      role="img"
      aria-label="Area chart showing contract value trend by year for this sector"
    >
      <span className="sr-only">Area chart showing annual contract value in billions of MXN for this sector from 2002 to 2025.</span>
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

// ── MONTHLY DEVIATION ─────────────────────────────────────────────────────────

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

  const nonDecPeak = [...chartData]
    .filter((d) => !d.isDecember)
    .sort((a, b) => b.dev - a.dev)[0]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        {decemberSpike !== null && decemberSpike > 1.3 && (
          <div className="flex items-center gap-1.5 rounded-md border border-risk-critical/40 bg-risk-critical/8 px-2.5 py-1">
            <span className="font-black text-risk-critical">{decemberSpike.toFixed(1)}x</span>
            <span className="text-text-muted">December vs avg -- year-end dump</span>
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

      <div
        className="h-72"
        role="img"
        aria-label="Horizontal bar chart comparing this sector's metrics against the national average"
      >
        <span className="sr-only">Horizontal diverging bar chart comparing this sector's contract value by month relative to the monthly average.</span>
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
                    fill={isDecember ? '#f87171' : 'var(--color-text-muted)'}
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
                  fill={entry.isDecember ? '#f87171' : entry.above ? color : 'var(--color-text-muted)'}
                  opacity={entry.isDecember ? 1 : entry.above ? 0.85 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

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
      <p className="text-xs text-text-muted text-center">{'\u2191'} avg risk score per month (green=low, red=critical)</p>
    </div>
  )
}

// ── VENDOR BARS ───────────────────────────────────────────────────────────────

function VendorBars({ data, color }: { data: Array<{ vendor_id: number; vendor_name: string; total_value_mxn: number; total_contracts: number; avg_risk_score?: number }>; color: string }) {
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
                <div className="h-1 bg-background-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${color}, ${hex(color, 0.5)})` }}
                  />
                </div>
                <p className="text-xs text-text-muted">{formatNumber(vendor.total_contracts)} contracts -- {formatCompactUSD(vendor.total_value_mxn)}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── PRICE DISTRIBUTION ────────────────────────────────────────────────────────

function PriceDistribution({
  baseline,
  color,
}: {
  baseline: { percentile_10: number; percentile_25: number; percentile_50: number; percentile_75: number; percentile_90: number; percentile_95: number; upper_fence: number; extreme_fence: number; sample_count: number }
  color: string
}) {
  const min = baseline.percentile_10
  const max = baseline.extreme_fence
  const range = max - min || 1

  const segments = [
    { from: baseline.percentile_10, to: baseline.percentile_25, color: RISK_COLORS.low, label: 'P10-P25' },
    { from: baseline.percentile_25, to: baseline.percentile_50, color: RISK_COLORS.medium, label: 'P25-P50' },
    { from: baseline.percentile_50, to: baseline.percentile_75, color: RISK_COLORS.high, label: 'P50-P75' },
    { from: baseline.percentile_75, to: baseline.extreme_fence, color: RISK_COLORS.critical, label: 'P75-Extreme' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <div className="flex h-3 rounded-full overflow-hidden gap-px">
          {segments.map((s) => (
            <div
              key={s.label}
              className="h-full"
              style={{ width: `${((s.to - s.from) / range) * 100}%`, backgroundColor: s.color, opacity: 0.85 }}
              title={`${s.label}: ${formatCompactMXN(s.from)} - ${formatCompactMXN(s.to)}`}
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

// ── INVESTIGATION CASES ───────────────────────────────────────────────────────

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

// ── PRIMITIVES ────────────────────────────────────────────────────────────────

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
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  )
}

export default SectorProfile
