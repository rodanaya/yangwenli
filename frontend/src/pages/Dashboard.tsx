import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { analysisApi } from '@/api/client'
import type { ExecutiveCaseDetail } from '@/api/types'
import {
  ArrowRight,
  ArrowUpRight,
  Shield,
  Target,
  Search,
  Crosshair,
  Radar,
  Activity,
  Zap,
  TrendingDown,
  Scale,
  FileSearch,
} from 'lucide-react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Area,
  Bar,
  Line,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
} from '@/components/charts'
import { RISK_COLORS, SECTOR_COLORS, getSectorNameEN } from '@/lib/constants'

// ============================================================================
// Dashboard: Bold, data-dense intelligence overview
//
// Layout:
// 1. HERO — Giant MXN value headline + context
// 2. 5 KEY METRICS — Value at risk, high-risk rate, direct awards, single bid, AUC
// 3. RISK DISTRIBUTION — Full-width stacked bar
// 4. SECTORS + TRAJECTORY — 2-column grid
// 5. TOP INSTITUTIONS + VENDORS — 2-column tables
// 6. GROUND TRUTH — Validated against real corruption cases
// 7. RED FLAGS + INVESTIGATION — Pattern counts + ML leads
// 8. NAVIGATE DEEPER — 6 link cards
// ============================================================================

export function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation('dashboard')
  // API call 1: Fast precomputed dashboard stats
  const { data: fastDashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  // API call 2: (yoy removed — using fastDashboard.yearly_trends instead)

  // API call 3: Executive summary (ground truth, top institutions/vendors, risk data)
  const { data: execData, isLoading: execLoading } = useQuery({
    queryKey: ['executive', 'summary'],
    queryFn: () => analysisApi.getExecutiveSummary(),
    staleTime: 10 * 60 * 1000,
  })

  // API call 4: Pattern counts
  const { data: patternData } = useQuery({
    queryKey: ['analysis', 'patterns', 'counts'],
    queryFn: () => analysisApi.getPatternCounts(),
    staleTime: 5 * 60 * 1000,
  })

  // API call 5: (money-flow removed — using sectorData instead, which is pre-loaded)

  // API call 6: December spike analysis
  const { data: decemberSpike } = useQuery({
    queryKey: ['analysis', 'december-spike'],
    queryFn: () => analysisApi.getDecemberSpike(),
    staleTime: 10 * 60 * 1000,
  })

  const overview = fastDashboard?.overview
  const sectors = fastDashboard?.sectors
  const riskDist = fastDashboard?.risk_distribution

  // Compute value at risk from sectors
  const valueAtRisk = useMemo(() => {
    if (!sectors) return { total: 0, pct: 0 }
    let totalAtRisk = 0
    let totalValue = 0
    for (const s of sectors) {
      const ct = s.total_contracts || 1
      const hrPct = ((s.high_risk_count || 0) + (s.critical_risk_count || 0)) / ct
      totalAtRisk += hrPct * (s.total_value_mxn || 0)
      totalValue += s.total_value_mxn || 0
    }
    return { total: totalAtRisk, pct: totalValue > 0 ? (totalAtRisk / totalValue) * 100 : 0 }
  }, [sectors])

  // Sectors sorted by value at risk
  const sectorData = useMemo(() => {
    if (!sectors) return []
    return sectors
      .map((s) => {
        const ct = s.total_contracts || 1
        const hrRate = ((s.high_risk_count || 0) + (s.critical_risk_count || 0)) / ct
        const daRate = (s.direct_award_count || 0) / ct
        return {
          name: getSectorNameEN(s.code),
          code: s.code,
          id: s.id,
          valueAtRisk: hrRate * (s.total_value_mxn || 0),
          riskPct: hrRate * 100,
          contracts: s.total_contracts,
          totalValue: s.total_value_mxn || 0,
          avgRisk: s.avg_risk_score || 0,
          directAwardPct: daRate * 100,
        }
      })
      .sort((a, b) => b.valueAtRisk - a.valueAtRisk)
  }, [sectors])

  // Risk trajectory from precomputed yearly_trends (fast, no extra API call)
  const riskTrajectory = useMemo(() => {
    if (!fastDashboard?.yearly_trends) return []
    return fastDashboard.yearly_trends
      .filter((d) => d.year >= 2010)
      .map((d) => ({
        year: d.year,
        highRiskPct: (d.avg_risk || 0) * 100,
        avgRisk: (d.avg_risk || 0) * 100,
        contracts: d.contracts,
      }))
  }, [fastDashboard])

  // Ground truth cases from executive API
  const corruptionCases = useMemo(() => {
    if (!execData?.ground_truth?.case_details) return []
    return execData.ground_truth.case_details
  }, [execData])

  const groundTruth = execData?.ground_truth
  const modelAuc = execData?.model?.auc ?? 0.960
  const highRiskContracts = overview?.high_risk_contracts || 0
  const totalContracts = overview?.total_contracts || 1
  const highRiskPct = totalContracts > 0 ? (highRiskContracts / totalContracts) * 100 : 0

  const lastUpdated = fastDashboard?.cached_at
    ? new Date(fastDashboard.cached_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* HERO — Giant value headline */}
      {/* ================================================================ */}
      <div className="pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
              {t('intelligenceBrief')}
            </span>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
              <Activity className="h-3 w-3 text-signal-live" />
              <span>{t('synced')} {lastUpdated.toUpperCase()}</span>
            </div>
          )}
        </div>
        {dashLoading ? (
          <Skeleton className="h-14 w-96" />
        ) : (
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight leading-none">
              {formatCompactMXN(overview?.total_value_mxn || 0)}
            </h1>
            <p className="text-lg text-text-muted mt-1 font-medium">
              {t('underSurveillance')}
            </p>
          </div>
        )}
        <div className="text-sm text-text-muted mt-2">
          {dashLoading ? (
            <Skeleton className="h-4 w-96" />
          ) : (
            t('contractsAnalyzed', {
              contracts: formatNumber(overview?.total_contracts || 0),
              years: overview?.years_covered || 24,
              vendors: formatNumber(overview?.total_vendors || 0),
            })
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* THREE SYSTEMIC PATTERNS — AI-found structural failures          */}
      {/* ================================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Radar className="h-4 w-4 text-risk-high" />
          <span className="text-xs font-bold tracking-wider uppercase text-risk-high font-mono">
            AI Intelligence · 23 Years of Data
          </span>
        </div>
        <h2 className="text-xl font-black text-text-primary mb-1">
          Three Structural Failures — In Every Administration
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Our model analyzed 3.1M contracts across 5 governments. These patterns never stopped.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {/* Direct Awards */}
          <button
            onClick={() => navigate('/contracts?is_direct_award=true')}
            className="flex flex-col gap-3 p-4 rounded-lg border border-risk-high/20 bg-risk-high/5 hover:border-risk-high/40 hover:bg-risk-high/10 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-risk-high/10">
                <Zap className="h-4 w-4 text-risk-high" />
              </div>
              <span className="text-xs font-bold tracking-wider uppercase text-risk-high font-mono">Direct Awards</span>
            </div>
            <div>
              <p className="text-3xl font-black text-text-primary tabular-nums font-mono">
                {overview ? `${(overview.direct_award_pct || 0).toFixed(0)}%` : '—'}
              </p>
              <p className="text-sm text-text-secondary mt-1">of contracts skip competition entirely</p>
              <p className="text-xs text-text-muted mt-1 font-mono">OECD benchmark: 20–30%</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-text-muted group-hover:text-accent transition-colors" />
          </button>

          {/* Single Bidder */}
          <button
            onClick={() => navigate('/contracts?is_single_bid=true')}
            className="flex flex-col gap-3 p-4 rounded-lg border border-risk-critical/20 bg-risk-critical/5 hover:border-risk-critical/40 hover:bg-risk-critical/10 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-risk-critical/10">
                <Crosshair className="h-4 w-4 text-risk-critical" />
              </div>
              <span className="text-xs font-bold tracking-wider uppercase text-risk-critical font-mono">Single Bidder</span>
            </div>
            <div>
              <p className="text-3xl font-black text-text-primary tabular-nums font-mono">
                {overview ? `${(overview.single_bid_pct || 0).toFixed(0)}%` : '—'}
              </p>
              <p className="text-sm text-text-secondary mt-1">of "competitive" tenders had only one bidder</p>
              <p className="text-xs text-text-muted mt-1 font-mono">Effectively no competition</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-text-muted group-hover:text-accent transition-colors" />
          </button>

          {/* December Rush */}
          <button
            onClick={() => navigate('/administrations')}
            className="flex flex-col gap-3 p-4 rounded-lg border border-risk-medium/20 bg-risk-medium/5 hover:border-risk-medium/40 hover:bg-risk-medium/10 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-risk-medium/10">
                <Activity className="h-4 w-4 text-risk-medium" />
              </div>
              <span className="text-xs font-bold tracking-wider uppercase text-risk-medium font-mono">December Rush</span>
            </div>
            <div>
              <p className="text-3xl font-black text-text-primary tabular-nums font-mono">
                {decemberSpike ? `${decemberSpike.average_spike_ratio.toFixed(1)}x` : '—'}
              </p>
              <p className="text-sm text-text-secondary mt-1">December spending vs. average month</p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {decemberSpike
                  ? `Significant in ${decemberSpike.years_with_significant_spike} of ${decemberSpike.total_years_analyzed} years`
                  : 'Year-end budget dump pattern'}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-text-muted group-hover:text-accent transition-colors" />
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* THE COST OF NO COMPETITION — Impact card                       */}
      {/* ================================================================ */}
      {dashLoading ? (
        <Skeleton className="h-28 w-full rounded-lg" />
      ) : overview ? (
        <div className="rounded-lg border border-risk-critical/20 bg-risk-critical/5 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-risk-critical" />
                <span className="text-xs font-bold tracking-wider uppercase text-risk-critical font-mono">
                  The Cost of No Competition
                </span>
              </div>
              <p className="text-4xl md:text-5xl font-black text-text-primary tabular-nums font-mono leading-none">
                {formatCompactMXN((overview.direct_award_pct / 100) * overview.total_value_mxn)}
              </p>
              <p className="text-sm text-text-secondary mt-2">
                awarded without competitive bidding · {(overview.direct_award_pct).toFixed(0)}% of all contracts
              </p>
              <p className="text-xs text-text-muted mt-1 font-mono">
                OECD benchmark: 20–30% direct award rate
              </p>
            </div>
            <button
              onClick={() => navigate('/contracts?is_direct_award=true')}
              className="text-xs text-accent flex items-center gap-1 whitespace-nowrap mt-1 flex-shrink-0"
            >
              Explore <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : null}

      {/* ================================================================ */}
      {/* 23 YEARS AT A GLANCE — Temporal contract volume + risk trend   */}
      {/* ================================================================ */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Activity className="h-4 w-4 text-accent" />
                <h2 className="text-base font-bold text-text-primary">23 Years at a Glance</h2>
              </div>
              <p className="text-xs text-text-muted">Contract volume and average risk score · 2002–2024</p>
            </div>
            <button
              onClick={() => navigate('/temporal')}
              className="text-xs text-accent flex items-center gap-1"
            >
              Full timeline <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          {dashLoading ? (
            <Skeleton className="h-[160px] w-full mt-3" />
          ) : (
            <div className="mt-2">
              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={fastDashboard?.yearly_trends || []} margin={{ top: 12, right: 36, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="contractGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <ReferenceArea x1={2002} x2={2006} fill="#22c55e" fillOpacity={0.04} label={{ value: 'Fox', position: 'insideTopLeft', fontSize: 8, fill: '#64748b' }} />
                  <ReferenceArea x1={2006} x2={2012} fill="#3b82f6" fillOpacity={0.04} label={{ value: 'Calderón', position: 'insideTopLeft', fontSize: 8, fill: '#64748b' }} />
                  <ReferenceArea x1={2012} x2={2018} fill="#ea580c" fillOpacity={0.04} label={{ value: 'Peña', position: 'insideTopLeft', fontSize: 8, fill: '#64748b' }} />
                  <ReferenceArea x1={2018} x2={2024} fill="#eab308" fillOpacity={0.04} label={{ value: 'AMLO', position: 'insideTopLeft', fontSize: 8, fill: '#64748b' }} />
                  <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" hide />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 0.20]}
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <RechartsTooltip
                    contentStyle={{ background: 'hsl(var(--background-elevated))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '11px' }}
                    formatter={(value: unknown, name: string) => {
                      if (name === 'contracts') return [formatNumber(value as number), 'Contracts']
                      if (name === 'avg_risk') return [`${((value as number) * 100).toFixed(1)}%`, 'Avg Risk']
                      return [value, name]
                    }}
                    labelFormatter={(label: unknown) => `Year: ${label}`}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="contracts" stroke="hsl(var(--accent))" strokeWidth={1.5} fill="url(#contractGrad)" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="avg_risk" stroke={RISK_COLORS.high} strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-1 px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 rounded" style={{ background: 'hsl(var(--accent))' }} />
                  <span className="text-xs text-text-muted">Contracts/year</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 border-t border-dashed" style={{ borderColor: RISK_COLORS.high }} />
                  <span className="text-xs text-text-muted">Avg risk score</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* 5 KEY METRICS — Bold stat cards */}
      {/* ================================================================ */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* Value at risk */}
        <StatCard
          loading={dashLoading}
          label={t('valueFlagged')}
          value={formatCompactMXN(valueAtRisk.total)}
          detail={t('valueFlaggedDetail', { pct: valueAtRisk.pct.toFixed(1) })}
          color="text-risk-critical"
          borderColor="border-risk-critical/30"
          onClick={() => navigate('/contracts?risk_level=critical')}
        />
        {/* High-risk rate */}
        <StatCard
          loading={dashLoading}
          label={t('contractsShowingRisk')}
          value={`${highRiskPct.toFixed(1)}%`}
          detail={t('contractsFlaggedDetail', { num: formatNumber(highRiskContracts) })}
          sublabel={t('oecdBenchmark')}
          color="text-risk-high"
          borderColor="border-risk-high/30"
          onClick={() => navigate('/contracts?risk_level=high')}
        />
        {/* Direct awards */}
        <StatCard
          loading={dashLoading}
          label={t('directAwardRate')}
          value={`${(overview?.direct_award_pct || 0).toFixed(1)}%`}
          detail={t('noCompetition')}
          sublabel={t('oecdDirectAward')}
          color="text-risk-medium"
          borderColor="border-risk-medium/30"
          onClick={() => navigate('/contracts?is_direct_award=true')}
        />
        {/* Single bidder */}
        <StatCard
          loading={dashLoading}
          label={t('singleBidRate')}
          value={`${(overview?.single_bid_pct || 0).toFixed(1)}%`}
          detail={t('ofContracts')}
          sublabel={t('oecdSingleBid')}
          color="text-risk-high"
          borderColor="border-risk-high/30"
          onClick={() => navigate('/contracts?is_single_bid=true')}
        />
        {/* Model accuracy */}
        <StatCard
          loading={execLoading}
          label={<>{t('detectionAccuracy')} <InfoTooltip termKey="aucRoc" size={11} /></>}
          value={`${modelAuc.toFixed(3)}`}
          detail={t('statisticalFramework')}
          color="text-accent"
          borderColor="border-accent/30"
          onClick={() => navigate('/model')}
        />
      </div>

      {/* ================================================================ */}
      {/* SECTORS + TRAJECTORY — 2-column grid */}
      {/* ================================================================ */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Sector Intelligence — 3 columns */}
        <Card className="lg:col-span-3 border-border/40">
          <CardContent className="pt-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Scale className="h-4 w-4 text-risk-high" />
                  <h2 className="text-base font-bold text-text-primary">{t('sectorIntelligence')}</h2>
                </div>
                <p className="text-xs text-text-muted">{t('sectorIntelligenceDesc')}</p>
              </div>
            </div>
            {dashLoading ? (
              <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <SectorGrid data={sectorData} onSectorClick={(id) => navigate(`/sectors/${id}`)} />
            )}
          </CardContent>
        </Card>

        {/* Risk Trajectory — 2 columns */}
        <Card className="lg:col-span-2 border-border/40">
          <CardContent className="pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <TrendingDown className="h-4 w-4 text-risk-high" />
                  <h2 className="text-base font-bold text-text-primary">{t('riskTrajectory')}</h2>
                </div>
                <p className="text-xs text-text-muted">{t('riskTrajectoryDesc')}</p>
              </div>
            </div>
            {dashLoading ? (
              <div className="h-[340px] flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
            ) : (
              <RiskTrajectoryChart data={riskTrajectory} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* RISK DISTRIBUTION — Full-width stacked bar */}
      {/* ================================================================ */}
      <Card className="border-border/40">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-text-primary">{t('riskDistribution')}</h2>
            <span className="text-xs text-text-muted">
              {t('riskDistLabel', { total: formatNumber(overview?.total_contracts || 0) })}
            </span>
          </div>
          {dashLoading || !riskDist ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <RiskDistributionBar data={riskDist} />
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* GROUND TRUTH — Validated against real corruption */}
      {/* ================================================================ */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Target className="h-4 w-4 text-accent" />
                <h2 className="text-base font-bold text-text-primary">{t('validatedAgainstReal')}</h2>
              </div>
              <p className="text-xs text-text-muted">
                {t('retroactiveDetection', {
                  detected: groundTruth?.cases ?? 15,
                  total: groundTruth?.cases ?? 15,
                  num: formatNumber(groundTruth?.contracts ?? 26582),
                })}
              </p>
            </div>
            <button
              onClick={() => navigate('/ground-truth')}
              className="text-xs text-accent hover:text-accent flex items-center gap-1 transition-colors"
            >
              {t('fullAnalysis')} <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          {execLoading ? (
            <div className="space-y-2 mt-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-7" />)}
            </div>
          ) : (
            <CaseDetectionChart cases={corruptionCases} />
          )}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs text-text-muted font-medium">
                {t('casesDetected', {
                  detected: groundTruth?.cases ?? 15,
                  total: groundTruth?.cases ?? 15,
                })}
              </span>
            </div>
            <span className="text-xs text-text-muted">
              AUC {modelAuc.toFixed(3)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* START INVESTIGATING — 3 action cards */}
      {/* ================================================================ */}
      <div>
        <h2 className="text-base font-bold text-text-primary mb-1">Start Your Investigation</h2>
        <p className="text-xs text-text-muted mb-3">
          These are the tools. Search any vendor, institution, contract. Build your own investigation.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <button
            onClick={() => navigate('/categories')}
            className="flex flex-col gap-3 p-5 rounded-lg border border-border/40 bg-surface-card/30 hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Search className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm font-bold text-text-primary">Follow the Money</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Where does $9.56T MXN actually go? Explore 72 spending categories and 12 sectors with AI-scored risk at every level.
            </p>
            <div className="flex items-center gap-1 text-xs text-accent font-medium">
              Explore categories <ArrowRight className="h-3 w-3" />
            </div>
          </button>

          <button
            onClick={() => navigate('/contracts')}
            className="flex flex-col gap-3 p-5 rounded-lg border border-border/40 bg-surface-card/30 hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <FileSearch className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm font-bold text-text-primary">Search Any Contract</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Search 3.1M contracts by vendor name, institution, or contract description. Each result includes its AI risk score.
            </p>
            <div className="flex items-center gap-1 text-xs text-accent font-medium">
              Open contract search <ArrowRight className="h-3 w-3" />
            </div>
          </button>

          <button
            onClick={() => navigate('/investigation')}
            className="flex flex-col gap-3 p-5 rounded-lg border border-border/40 bg-surface-card/30 hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Crosshair className="h-5 w-5 text-accent" />
              </div>
              <span className="text-sm font-bold text-text-primary">Open an Investigation</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Start from a suspicion — a vendor, institution, or pattern — and build a documented case with AI-powered analysis tools.
            </p>
            <div className="flex items-center gap-1 text-xs text-accent font-medium">
              Open case manager <ArrowRight className="h-3 w-3" />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STAT CARD — Bold metric display
// ============================================================================

interface StatCardProps {
  loading: boolean
  label: React.ReactNode
  value: string
  detail: string
  color: string
  borderColor: string
  sublabel?: string
  onClick?: () => void
}

const StatCard = memo(function StatCard({ loading, label, value, detail, color, borderColor, sublabel, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        'border-l-4', borderColor,
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200 group/sc'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      <CardContent className="p-4">
        <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-1.5">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-8 w-20 mb-1" />
        ) : (
          <p className={cn('text-2xl md:text-3xl font-black tabular-nums tracking-tight leading-none', color)}>{value}</p>
        )}
        <p className="text-xs text-text-muted mt-1.5">{detail}</p>
        {sublabel && (
          <p className="text-xs text-text-muted mt-0.5 font-mono">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  )
})

// ============================================================================
// RISK DISTRIBUTION BAR — Full-width stacked bar with labels
// ============================================================================

const RiskDistributionBar = memo(function RiskDistributionBar({
  data,
}: {
  data: Array<{ risk_level: string; count: number; percentage: number; total_value_mxn: number }>
}) {
  const { t } = useTranslation('dashboard')
  const total = data.reduce((sum, d) => sum + d.count, 0)

  const segments = [
    { key: 'critical', color: RISK_COLORS.critical, label: t('critical'), darkText: false },
    { key: 'high', color: RISK_COLORS.high, label: t('high'), darkText: false },
    { key: 'medium', color: RISK_COLORS.medium, label: t('medium'), darkText: true },
    { key: 'low', color: RISK_COLORS.low, label: t('low'), darkText: true },
  ]

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-8 rounded-md overflow-hidden gap-[1px]">
        {segments.map((seg) => {
          const item = data.find((d) => d.risk_level === seg.key)
          if (!item || item.count === 0) return null
          const widthPct = (item.count / total) * 100
          return (
            <div
              key={seg.key}
              className="relative flex items-center justify-center transition-all duration-500"
              style={{ width: `${widthPct}%`, backgroundColor: seg.color, opacity: 0.85 }}
              title={`${seg.label}: ${formatNumber(item.count)} (${item.percentage.toFixed(1)}%)`}
            >
              {widthPct > 6 && (
                <span
                  className="text-xs font-bold font-mono tabular-nums"
                  style={{
                    color: seg.darkText ? 'rgba(0,0,0,0.75)' : '#fff',
                    textShadow: seg.darkText ? 'none' : '0 1px 1px rgba(0,0,0,0.5)',
                  }}
                >
                  {item.percentage.toFixed(1)}%
                </span>
              )}
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
        {segments.map((seg) => {
          const item = data.find((d) => d.risk_level === seg.key)
          if (!item) return null
          return (
            <div key={seg.key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: seg.color, opacity: 0.85 }} />
              <span className="text-xs text-text-muted font-medium">{seg.label}</span>
              <span className="text-xs text-text-secondary font-bold tabular-nums font-mono">
                {formatNumber(item.count)}
              </span>
              <span className="text-xs text-text-secondary">({item.percentage.toFixed(1)}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

// ============================================================================
// RISK BADGE — Colored percentage badge
// ============================================================================

function RiskBadge({ value }: { value: number }) {
  const pct = (value * 100).toFixed(0)
  const color =
    value >= 0.50 ? 'bg-risk-critical/20 text-risk-critical border-risk-critical/30' :
    value >= 0.30 ? 'bg-risk-high/20 text-risk-high border-risk-high/30' :
    value >= 0.10 ? 'bg-risk-medium/20 text-risk-medium border-risk-medium/30' :
    'bg-risk-low/20 text-risk-low border-risk-low/30'
  return (
    <span className={cn('text-xs font-bold tabular-nums font-mono px-1.5 py-0.5 rounded border', color)}>
      {pct}%
    </span>
  )
}

// ============================================================================
// SECTOR GRID — Compact rows with colored indicators
// ============================================================================

const SectorGrid = memo(function SectorGrid({
  data,
  onSectorClick,
}: {
  data: Array<{ name: string; code: string; id: number; valueAtRisk: number; riskPct: number; contracts: number; totalValue: number; avgRisk: number; directAwardPct: number }>
  onSectorClick?: (id: number) => void
}) {
  const { t } = useTranslation('dashboard')
  const { t: ts } = useTranslation('sectors')
  const maxVal = Math.max(...data.map((d) => d.valueAtRisk), 1)

  return (
    <div className="space-y-0.5">
      {/* Column headers */}
      <div className="flex items-center gap-2 px-2 pb-1.5 border-b border-border/20">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted w-[80px]">{t('sector')}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex-1">{t('valueAtRisk')}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted w-[68px] text-right">MXN</span>
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted w-[52px] text-right">{t('highPlus')}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted w-[40px] text-right">DA%</span>
      </div>
      {data.map((sector) => {
        const widthPct = (sector.valueAtRisk / maxVal) * 100
        const sectorColor = SECTOR_COLORS[sector.code] || '#64748b'
        return (
          <button
            key={sector.code}
            className="flex items-center gap-2 w-full text-left group hover:bg-background-elevated/40 rounded px-2 py-1.5 transition-colors"
            onClick={() => onSectorClick?.(sector.id)}
          >
            {/* Sector name with color dot */}
            <div className="w-[80px] flex-shrink-0 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sectorColor }} />
              <span className="text-xs text-text-secondary font-medium truncate group-hover:text-text-primary transition-colors">
                {ts(sector.code)}
              </span>
            </div>
            {/* Value at risk bar — no text inside */}
            <div className="flex-1 relative h-5">
              <div className="absolute inset-0 rounded bg-background-elevated/30" />
              <div
                className="absolute left-0 top-0 h-full rounded transition-all duration-500"
                style={{
                  width: `${Math.max(widthPct, 3)}%`,
                  backgroundColor: sectorColor,
                  opacity: 0.6,
                }}
              />
            </div>
            {/* Value at risk — separate column, always visible */}
            <span className="text-xs text-text-muted tabular-nums font-mono w-[68px] text-right flex-shrink-0">
              {sector.valueAtRisk > 0 ? formatCompactMXN(sector.valueAtRisk) : '—'}
            </span>
            {/* High+ rate */}
            <span className="text-xs text-text-muted tabular-nums font-mono w-[52px] text-right flex-shrink-0">
              {sector.riskPct.toFixed(1)}%
            </span>
            {/* Direct award rate */}
            <span className="text-xs text-text-muted tabular-nums font-mono w-[40px] text-right flex-shrink-0">
              {sector.directAwardPct.toFixed(0)}%
            </span>
          </button>
        )
      })}
    </div>
  )
})

// ============================================================================
// CASE DETECTION CHART — Corruption cases with detection bars
// ============================================================================

const CaseDetectionChart = memo(function CaseDetectionChart({
  cases,
}: {
  cases: ExecutiveCaseDetail[]
}) {
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation('common')

  const filteredCases = useMemo(() => {
    return [...cases]
      .filter((c) => c.contracts >= 10)
      .sort((a, b) => b.high_plus_pct - a.high_plus_pct)
      .slice(0, 10)
  }, [cases])

  return (
    <div className="mt-3 space-y-0">
      {filteredCases.map((c, idx) => {
        const detected = c.high_plus_pct
        const sectorColor = SECTOR_COLORS[c.sector] || '#64748b'
        const trackColor =
          detected >= 90 ? 'rgba(74,222,128,0.18)' :
          detected >= 50 ? 'rgba(251,191,36,0.18)' :
          'rgba(248,113,113,0.18)'
        const fillColor =
          detected >= 90 ? '#4ade80' :
          detected >= 50 ? '#fbbf24' :
          '#f87171'
        const pctColor =
          detected >= 90 ? 'text-risk-low' :
          detected >= 50 ? 'text-risk-medium' :
          'text-risk-critical'

        return (
          <div
            key={c.name}
            className="group grid items-center gap-x-3 py-2 px-2 hover:bg-background-elevated/30 rounded transition-colors"
            style={{ gridTemplateColumns: '170px 1fr 44px 42px 38px' }}
          >
            {/* Case name + type */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sectorColor }} />
                <span className="text-xs font-semibold text-text-primary truncate leading-tight">{c.name}</span>
              </div>
              <div className="mt-0.5 ml-3">
                <span className="text-[10px] text-text-muted font-medium">{c.type}</span>
              </div>
            </div>

            {/* Slim track + fill */}
            <div className="relative h-4 flex items-center">
              {/* Track */}
              <div className="absolute inset-0 rounded-full" style={{ backgroundColor: trackColor }} />
              {/* Fill */}
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(detected, 2)}%`, backgroundColor: fillColor, opacity: 0.9 }}
              />
              {/* Tick marks at 25/50/75/100 */}
              {[25, 50, 75].map((tick) => (
                <div
                  key={tick}
                  className="absolute top-0 h-full w-px opacity-20"
                  style={{ left: `${tick}%`, backgroundColor: 'var(--color-border)' }}
                />
              ))}
            </div>

            {/* Detection % */}
            <div className="text-right">
              <span className={cn('text-xs font-black tabular-nums font-mono', pctColor)}>
                {detected.toFixed(0)}%
              </span>
            </div>

            {/* Contract count */}
            <div className="text-right">
              <span className="text-[11px] text-text-muted tabular-nums font-mono">
                {formatNumber(c.contracts)}
              </span>
            </div>

            {/* Avg score */}
            <div className="text-right">
              <span className="text-[11px] font-bold tabular-nums font-mono text-text-secondary">
                {c.avg_score.toFixed(2)}
              </span>
            </div>
          </div>
        )
      })}

      {/* Column footer labels */}
      <div
        className="grid items-center gap-x-3 pt-2 px-2 border-t border-border/20 mt-1"
        style={{ gridTemplateColumns: '170px 1fr 44px 42px 38px' }}
      >
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">{t('caseLabel')}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">{t('detectionRate')} (high+)</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold text-right">%</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold text-right">{tc('contracts')}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold text-right">avg</span>
      </div>
    </div>
  )
})

// ============================================================================
// RISK TRAJECTORY CHART — Area chart with dual lines
// ============================================================================

const ADMINISTRATIONS = [
  { name: 'Fox', start: 2000, end: 2006, color: '#3b82f6' },
  { name: 'Calderon', start: 2006, end: 2012, color: '#8b5cf6' },
  { name: 'Pena Nieto', start: 2012, end: 2018, color: '#16a34a' },
  { name: 'AMLO', start: 2018, end: 2024, color: '#f97316' },
  { name: 'Sheinbaum', start: 2024, end: 2030, color: '#dc2626' },
]

const RiskTrajectoryChart = memo(function RiskTrajectoryChart({
  data,
}: {
  data: Array<{ year: number; highRiskPct: number; avgRisk: number; contracts: number }>
}) {
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation('common')

  const minYear = data.length > 0 ? data[0].year : 2010
  const maxYear = data.length > 0 ? data[data.length - 1].year : 2025
  const maxContracts = Math.max(...data.map((d) => d.contracts), 1)

  return (
    <div className="h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={RISK_COLORS.high} stopOpacity={0.4} />
              <stop offset="100%" stopColor={RISK_COLORS.high} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          {/* Presidential administration bands */}
          {ADMINISTRATIONS.map((admin) => {
            const x1 = Math.max(admin.start, minYear)
            const x2 = Math.min(admin.end, maxYear)
            if (x1 >= maxYear || x2 <= minYear) return null
            return (
              <ReferenceArea
                key={admin.name}
                x1={x1}
                x2={x2}
                fill={admin.color}
                fillOpacity={0.04}
                ifOverflow="extendDomain"
                label={{ value: admin.name, position: 'insideTopLeft', fontSize: 10, fill: 'var(--color-text-muted)', opacity: 0.5 }}
              />
            )
          })}
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            type="number"
            domain={[minYear, maxYear]}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            domain={[0, 'auto']}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
            domain={[0, maxContracts * 1.2]}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-bold text-sm text-text-primary">{d.year}</p>
                    <div className="space-y-0.5 mt-1">
                      <p className="text-xs text-text-muted tabular-nums">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: RISK_COLORS.high }} />
                        {t('highRiskRate')}: <strong className="text-text-secondary">{d.highRiskPct.toFixed(1)}%</strong>
                      </p>
                      <p className="text-xs text-text-secondary tabular-nums">
                        {formatNumber(d.contracts)} {tc('contracts').toLowerCase()}
                      </p>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          {/* COVID-19 reference line */}
          <ReferenceLine
            x={2020}
            yAxisId="left"
            stroke={RISK_COLORS.critical}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'COVID-19', position: 'insideTopRight', fontSize: 10, fill: RISK_COLORS.critical }}
          />
          {/* Contract volume bars */}
          <Bar
            yAxisId="right"
            dataKey="contracts"
            fill="var(--color-text-muted)"
            fillOpacity={0.15}
            radius={[2, 2, 0, 0]}
            barSize={16}
          />
          {/* High-risk rate area */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="highRiskPct"
            stroke={RISK_COLORS.high}
            strokeWidth={2}
            fill="url(#riskGradient)"
            dot={false}
            activeDot={{ r: 4, stroke: RISK_COLORS.high, strokeWidth: 2, fill: 'var(--color-background-base)' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded" style={{ backgroundColor: RISK_COLORS.high }} />
          <span className="text-xs text-text-muted">{t('highRiskRate')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-text-muted opacity-15" />
          <span className="text-xs text-text-muted">{tc('contracts')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm opacity-30" style={{ backgroundColor: '#8b5cf6' }} />
          <span className="text-xs text-text-secondary">Administrations</span>
        </div>
      </div>
    </div>
  )
})

export default Dashboard
