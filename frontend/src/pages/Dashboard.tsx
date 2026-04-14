import { memo, useMemo } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { analysisApi, ariaApi } from '@/api/client'
import type { AriaQueueItem, FastDashboardData } from '@/api/types'
import {
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  Search,
  Crosshair,
  FileSearch,
} from 'lucide-react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Bar,
  BarChart,
  Cell,
} from '@/components/charts'
import { RISK_COLORS, SECTOR_COLORS, getSectorNameEN, CURRENT_MODEL_VERSION } from '@/lib/constants'

// ============================================================================
// Dashboard: Intelligence Brief
//
// Editorial structure:
// 1. SITUATION REPORT HERO — headline + 3 stats
// 2. ARIA TIER SUMMARY — 4-tier horizontal row
// 3. SECTOR RISK CHART — horizontal bar (avg risk by sector)
// 4. QUICK LINKS / CTA — investigation pathways
// ============================================================================

// ============================================================================
// SECTOR RISK CHART — Average risk score by sector, horizontal bars
// ============================================================================

interface SectorRiskBarChartProps {
  sectors: Array<{ name: string; code: string; avgRisk: number; contracts: number; totalValue: number }>
  loading: boolean
}

function SectorRiskBarChart({ sectors, loading }: SectorRiskBarChartProps) {
  const { t } = useTranslation('dashboard')

  const chartData = useMemo(() => {
    return [...sectors]
      .sort((a, b) => b.avgRisk - a.avgRisk)
      .map((s) => ({
        name: s.name,
        code: s.code,
        avgRisk: +(s.avgRisk * 100).toFixed(1),
        contracts: s.contracts,
        totalValue: s.totalValue,
        fill: SECTOR_COLORS[s.code] ?? '#64748b',
      }))
  }, [sectors])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    )
  }

  if (chartData.length === 0) return null

  return (
    <div>
      {/* Editorial headline — the finding, not the topic */}
      <h2
        className="text-lg font-bold leading-snug mb-1"
        style={{ fontFamily: 'var(--font-family-serif)', color: 'var(--color-text-primary)' }}
      >
        {t('sectorChartHeadline', 'Salud and Agricultura lead in average contract risk')}
      </h2>
      <p className="text-xs text-text-muted mb-4 max-w-xl leading-relaxed">
        {t('sectorChartSubhead', 'Average risk score per sector, based on v0.6.5 model across 3.1M contracts. Higher bars indicate greater concentration of known-corruption-like patterns.')}
      </p>
      <div role="img" aria-label={t('sectorChartAriaLabel', 'Horizontal bar chart showing average risk score by federal sector')}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 40, bottom: 0, left: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              horizontal={false}
              opacity={0.3}
            />
            <XAxis
              type="number"
              dataKey="avgRisk"
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-family-sans)' }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{
                background: 'var(--color-background-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'var(--font-family-mono)',
              }}
              formatter={(v: number | undefined) => [v != null ? `${v.toFixed(1)}%` : '--', t('avgRiskScore')]}
              labelFormatter={(label: string) => label}
            />
            <Bar dataKey="avgRisk" radius={[0, 3, 3, 0]} isAnimationActive={false} barSize={22}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.code}
                  fill={entry.fill}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-text-muted/60 mt-2 font-mono">
        {t('sectorChartSource', 'Source: RUBLI v0.6.5 risk model, 3,051,294 contracts (2002-2025). Risk scores are statistical indicators, not corruption probabilities.')}
      </p>
    </div>
  )
}


// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation('common')
  const { t: ts } = useTranslation('sectors')

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: fastDashboard, isLoading: dashLoading, error: dashError, refetch: dashRefetch } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const fastFailed = !dashLoading && (!fastDashboard || !fastDashboard.overview)
  const { data: riskOverviewFallback, isLoading: fallbackLoading } = useQuery({
    queryKey: ['analysis', 'risk-overview-fallback'],
    queryFn: () => analysisApi.getRiskOverview(),
    staleTime: 5 * 60 * 1000,
    enabled: fastFailed,
    retry: 1,
  })

  const { data: modelMeta } = useQuery({
    queryKey: ['analysis', 'model-metadata'],
    queryFn: () => analysisApi.getModelMetadata(),
    staleTime: 60 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  })

  // ARIA tier counts
  const { data: ariaStats } = useQuery({
    queryKey: ['aria', 'stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 10 * 60 * 1000,
    retry: 0,
  })

  // Top T1 vendor for spotlight
  const { data: ariaT1 } = useQuery({
    queryKey: ['aria', 'queue', 'spotlight'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 1 }),
    staleTime: 10 * 60 * 1000,
  })

  // ── Derived data ──────────────────────────────────────────────────────────

  const overview = fastDashboard?.overview ?? (riskOverviewFallback?.overview as FastDashboardData['overview'] | undefined)
  const sectors = fastDashboard?.sectors
  const riskDist = fastDashboard?.risk_distribution ?? (riskOverviewFallback?.risk_distribution as FastDashboardData['risk_distribution'] | undefined)

  const bothSettled = !dashLoading && (!fastFailed || !fallbackLoading)
  const kpiLoading = !bothSettled || !overview

  const criticalHighValue = useMemo(() => {
    if (!riskDist) return 0
    return riskDist
      .filter(d => d.risk_level === 'critical' || d.risk_level === 'high')
      .reduce((s, d) => s + (d.total_value_mxn || 0), 0)
  }, [riskDist])

  const lastUpdated = fastDashboard?.cached_at
    ? new Date(fastDashboard.cached_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  const sectorData = useMemo(() => {
    if (!sectors) return []
    return sectors
      .map((s) => {
        const ct = s.total_contracts || 1
        const hrRate = ((s.high_risk_count || 0) + (s.critical_risk_count || 0)) / ct
        const daRate = (s.direct_award_count || 0) / ct
        return {
          name: ts(s.code) || getSectorNameEN(s.code),
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
  }, [sectors, ts])

  // ARIA tier data
  const latestRun = ariaStats?.latest_run
  const t1Count = latestRun?.tier1_count ?? 320
  const t2Count = latestRun?.tier2_count ?? 1234
  const t3Count = latestRun?.tier3_count ?? 5016
  const t4Count = latestRun?.tier4_count ?? 311871
  const ariaTotal = ariaStats?.queue_total ?? (t1Count + t2Count + t3Count + t4Count)
  const ariaElevatedValue = ariaStats?.elevated_value_mxn ?? 0

  // Top T1 vendor
  const topVendor = ariaT1?.data?.[0] as AriaQueueItem | undefined

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-12">

      {/* ================================================================ */}
      {/* ERROR BANNER                                                     */}
      {/* ================================================================ */}
      {dashError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-risk-critical/30 bg-risk-critical/5">
          <AlertTriangle className="h-4 w-4 text-risk-critical flex-shrink-0" />
          <p className="text-sm text-risk-critical flex-1">
            {t('dashboardLoadError')}
          </p>
          <button
            onClick={() => void dashRefetch()}
            className="text-sm text-risk-critical underline hover:no-underline font-medium flex-shrink-0"
          >
            {tc('retry')}
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* 1. SITUATION REPORT HERO                                         */}
      {/* ================================================================ */}
      <header>
        {/* Kicker */}
        <p
          className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: 'var(--color-accent)' }}
        >
          RUBLI &middot; {t('sitRepKicker', 'INTELLIGENCE BRIEF')}
        </p>

        {/* Main headline */}
        {kpiLoading ? (
          <Skeleton className="h-12 w-3/4 mb-4" />
        ) : (
          <h1
            className="leading-tight mb-4"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'clamp(1.75rem, 4vw, 3rem)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            {t('sitRepHeadline', {
              count: t1Count,
              defaultValue: '{{count}} vendors require immediate investigation',
            })}
          </h1>
        )}

        {/* Subhead — human-scale context */}
        {kpiLoading ? (
          <Skeleton className="h-5 w-2/3 mb-6" />
        ) : (
          <p
            className="text-base leading-relaxed mb-8 max-w-2xl"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('sitRepSubhead', {
              totalValue: formatCompactMXN(overview?.total_value_mxn ?? 0),
              riskValue: formatCompactMXN(criticalHighValue),
              contracts: formatNumber(overview?.total_contracts ?? 0),
              defaultValue: 'RUBLI has analyzed {{contracts}} federal contracts worth {{totalValue}} across 23 years. {{riskValue}} sits in contracts flagged high or critical risk -- patterns consistent with documented corruption cases.',
            })}
          </p>
        )}

        {/* Three hero stats */}
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          {/* T1 Vendors */}
          <div>
            <div
              className="font-mono font-bold tabular-nums leading-none"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                color: RISK_COLORS.critical,
                letterSpacing: '-0.03em',
              }}
            >
              {kpiLoading ? '--' : formatNumber(t1Count)}
            </div>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-wide font-mono">
              {t('heroStatT1', 'T1 Critical Vendors')}
            </p>
          </div>

          {/* Value at Risk */}
          <div>
            <div
              className="font-mono font-bold tabular-nums leading-none"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                color: 'var(--color-accent)',
                letterSpacing: '-0.03em',
              }}
            >
              {kpiLoading ? '--' : formatCompactMXN(criticalHighValue || ariaElevatedValue)}
            </div>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-wide font-mono">
              {t('heroStatValueAtRisk', 'Value at Risk (High + Critical)')}
            </p>
          </div>

          {/* Last Updated */}
          <div>
            <div
              className="font-mono font-bold tabular-nums leading-none"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                color: 'var(--color-text-secondary)',
                letterSpacing: '-0.03em',
              }}
            >
              {kpiLoading ? '--' : `${(((modelMeta?.auc_test ?? 0.828) * 100)).toFixed(1)}%`}
            </div>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-wide font-mono">
              {t('heroStatAuc', 'Model AUC (discrimination power)')}
            </p>
          </div>
        </div>

        {/* Model version + last sync */}
        <div className="flex items-center gap-3 mt-4 text-[10px] font-mono text-text-muted/60">
          <span>{modelMeta?.version === 'v6.5' ? 'v0.6.5' : (modelMeta?.version ?? CURRENT_MODEL_VERSION)}</span>
          <span>&middot;</span>
          <span>AUC {(modelMeta?.auc_test ?? 0.828).toFixed(3)}</span>
          {lastUpdated && (
            <>
              <span>&middot;</span>
              <span>{t('synced')} {lastUpdated.toUpperCase()}</span>
            </>
          )}
        </div>
      </header>

      {/* ================================================================ */}
      {/* 2. RISK TIER SUMMARY                                             */}
      {/* ================================================================ */}
      <section>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
          {t('tierSectionLabel', 'ARIA Investigation Queue')} &middot; {formatNumber(ariaTotal)} {t('tierVendorsLabel', 'vendors')}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            {
              tier: 'T1',
              label: t('tierT1Label', 'Tier 1 -- Critical'),
              count: t1Count,
              color: RISK_COLORS.critical,
              desc: t('tierT1Desc', 'Immediate investigation required'),
            },
            {
              tier: 'T2',
              label: t('tierT2Label', 'Tier 2 -- High'),
              count: t2Count,
              color: RISK_COLORS.high,
              desc: t('tierT2Desc', 'Priority review'),
            },
            {
              tier: 'T3',
              label: t('tierT3Label', 'Tier 3 -- Medium'),
              count: t3Count,
              color: RISK_COLORS.medium,
              desc: t('tierT3Desc', 'Watch list'),
            },
            {
              tier: 'T4',
              label: t('tierT4Label', 'Tier 4 -- Surveillance'),
              count: t4Count,
              color: RISK_COLORS.low,
              desc: t('tierT4Desc', 'Standard monitoring'),
            },
          ] as const).map(({ tier, label, count, color, desc }) => (
            <button
              key={tier}
              onClick={() => navigate(`/aria?tier=${tier.replace('T', '')}`)}
              className="text-left rounded-lg border border-border/30 p-4 transition-all hover:border-border/60 hover:bg-background-elevated/20 group"
              style={{ borderLeftWidth: '3px', borderLeftColor: color }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono font-bold tracking-wider" style={{ color }}>
                  {tier}
                </span>
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider truncate">
                  {label.replace(/^Tier \d+ -- /, '')}
                </span>
              </div>
              <div
                className="text-2xl font-mono font-bold tabular-nums leading-none mb-1"
                style={{ color }}
              >
                {formatNumber(count)}
              </div>
              <p className="text-[10px] text-text-muted leading-snug">
                {desc}
              </p>
            </button>
          ))}
        </div>

        {/* Investigation spotlight — top T1 vendor */}
        <ErrorBoundary fallback={null}>
          {topVendor && (
            <div
              className="mt-4 rounded-lg p-4"
              style={{
                borderLeft: `3px solid var(--color-accent)`,
                background: 'var(--color-accent-glow)',
              }}
            >
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--color-accent)' }}>
                {t('spotlightKicker', 'HIGHEST PRIORITY TARGET')}
              </p>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text-primary truncate" style={{ fontFamily: 'var(--font-family-serif)' }}>
                    {toTitleCase(topVendor.vendor_name)}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatNumber(topVendor.total_contracts)} {tc('contracts').toLowerCase()} &middot; {formatCompactMXN(topVendor.total_value_mxn)}
                    {topVendor.primary_sector_name && <> &middot; {toTitleCase(topVendor.primary_sector_name)}</>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-mono font-bold tabular-nums" style={{ color: 'var(--color-accent)' }}>
                    {topVendor.ips_final.toFixed(3)}
                  </div>
                  <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider">IPS</div>
                </div>
                <Link
                  to={`/vendors/${topVendor.vendor_id}`}
                  className="text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1 flex-shrink-0"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('spotlightCTA', 'Open Profile')} <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </section>

      {/* ================================================================ */}
      {/* 3. RISK DISTRIBUTION BAR                                         */}
      {/* ================================================================ */}
      {riskDist && (
        <section>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
            {t('riskDistribution')} &middot; {formatNumber(overview?.total_contracts ?? 0)} {tc('contracts').toLowerCase()}
          </p>
          <RiskDistributionStrip data={riskDist} />
          <p className="text-[10px] text-text-muted/60 mt-2 font-mono">
            {t('oecdBenchmark')} &middot; {t('sitRepHRRate', {
              rate: ((riskDist.filter(d => d.risk_level === 'critical' || d.risk_level === 'high').reduce((s, d) => s + (d.percentage || 0), 0)).toFixed(1)),
              defaultValue: 'High-risk rate: {{rate}}%',
            })}
          </p>
        </section>
      )}

      {/* ================================================================ */}
      {/* 4. SECTOR RISK CHART                                             */}
      {/* ================================================================ */}
      <section>
        <ErrorBoundary fallback={<SectionErrorFallback />}>
          <SectorRiskBarChart sectors={sectorData} loading={dashLoading} />
        </ErrorBoundary>
      </section>

      {/* ================================================================ */}
      {/* 5. COMPRANET CONTEXT — editorial callout                         */}
      {/* ================================================================ */}
      <section
        className="rounded-lg p-5"
        style={{
          border: '1px solid var(--color-border)',
          background: 'var(--color-background-elevated)',
        }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-text-muted flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted mb-1">
              {t('compranetContextLabel')}
            </p>
            <p className="text-sm font-semibold text-text-primary mb-2" style={{ fontFamily: 'var(--font-family-serif)' }}>
              {t('compranetContextTitle')}
            </p>
            <p className="text-xs text-text-muted leading-relaxed mb-3">
              {t('compranetContextBody')}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded border border-border/40 bg-border/10">
                {t('compranetContextDate1')}
              </span>
              <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded border border-border/40 bg-border/10">
                {t('compranetContextDate2')}
              </span>
              <button
                onClick={() => navigate('/limitations')}
                className="text-xs flex items-center gap-1 ml-auto"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('compranetContextLink')} <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6. QUICK LINKS / CALL TO ACTION                                  */}
      {/* ================================================================ */}
      <section>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
          {t('startInvestigating')}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => navigate('/aria')}
            className="flex flex-col gap-2 p-5 rounded-lg border border-border/40 hover:border-accent/40 transition-all text-left group"
            style={{ borderTopWidth: '3px', borderTopColor: RISK_COLORS.critical }}
          >
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4" style={{ color: RISK_COLORS.critical }} />
              <span className="text-sm font-bold text-text-primary">
                {t('ctaAria', 'Begin with Tier 1')}
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('ctaAriaDesc', {
                count: t1Count,
                defaultValue: '{{count}} vendors flagged critical by ARIA. Start here.',
              })}
            </p>
            <span className="text-xs font-mono flex items-center gap-1 mt-auto" style={{ color: 'var(--color-accent)' }}>
              {t('ctaAriaLink', 'Open ARIA queue')} <ArrowRight className="h-3 w-3" />
            </span>
          </button>

          <button
            onClick={() => navigate('/sectors')}
            className="flex flex-col gap-2 p-5 rounded-lg border border-border/40 hover:border-accent/40 transition-all text-left group"
            style={{ borderTopWidth: '3px', borderTopColor: 'var(--color-accent)' }}
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" style={{ color: 'var(--color-accent)' }} />
              <span className="text-sm font-bold text-text-primary">
                {t('ctaSectors', 'Explore by Sector')}
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('ctaSectorsDesc', '12 federal sectors with risk profiles, concentration analysis, and vendor networks.')}
            </p>
            <span className="text-xs font-mono flex items-center gap-1 mt-auto" style={{ color: 'var(--color-accent)' }}>
              {t('ctaSectorsLink', 'View sectors')} <ArrowRight className="h-3 w-3" />
            </span>
          </button>

          <button
            onClick={() => navigate('/contracts')}
            className="flex flex-col gap-2 p-5 rounded-lg border border-border/40 hover:border-accent/40 transition-all text-left group"
            style={{ borderTopWidth: '3px', borderTopColor: '#818cf8' }}
          >
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4" style={{ color: '#818cf8' }} />
              <span className="text-sm font-bold text-text-primary">
                {t('searchAnyContract')}
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('searchAnyContractDesc')}
            </p>
            <span className="text-xs font-mono flex items-center gap-1 mt-auto" style={{ color: 'var(--color-accent)' }}>
              {t('openContractSearch')} <ArrowRight className="h-3 w-3" />
            </span>
          </button>
        </div>
      </section>

      {/* Footer source line */}
      <footer className="text-[10px] text-text-muted/40 font-mono text-center pb-4">
        RUBLI &middot; {formatNumber(overview?.total_contracts ?? 3051294)} {tc('contracts').toLowerCase()} &middot; 2002-2025 &middot; {(modelMeta?.version === 'v6.5' ? 'v0.6.5' : (modelMeta?.version ?? CURRENT_MODEL_VERSION))}
      </footer>
    </div>
  )
}

// ============================================================================
// RISK DISTRIBUTION STRIP — compact horizontal bar showing risk level split
// ============================================================================

function RiskDistributionStrip({ data }: {
  data: Array<{ risk_level: string; percentage: number; count: number }>
}) {
  const levels = useMemo(() => {
    const order = ['critical', 'high', 'medium', 'low'] as const
    return order.map((level) => {
      const item = data.find(d => d.risk_level === level)
      return {
        level,
        label: level.charAt(0).toUpperCase() + level.slice(1),
        pct: item?.percentage ?? 0,
        count: item?.count ?? 0,
        color: RISK_COLORS[level],
      }
    }).filter(d => d.pct > 0)
  }, [data])

  return (
    <div className="space-y-1.5">
      {/* Bar */}
      <div className="flex h-6 rounded overflow-hidden" style={{ gap: '2px' }}>
        {levels.map(l => (
          <div
            key={l.level}
            className="h-full relative"
            style={{
              width: `${l.pct}%`,
              backgroundColor: l.color,
              opacity: 0.85,
              minWidth: l.pct > 0 ? '2px' : '0',
            }}
            title={`${l.label}: ${l.pct.toFixed(1)}% (${formatNumber(l.count)})`}
          />
        ))}
      </div>
      {/* Labels */}
      <div className="flex gap-4">
        {levels.map(l => (
          <div key={l.level} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: l.color, opacity: 0.85 }} />
            <span className="text-[10px] font-mono text-text-muted">
              {l.label} {l.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Section error fallback
// ============================================================================

function SectionErrorFallback() {
  const { t } = useTranslation('dashboard')
  return (
    <div className="rounded-lg border border-border/30 p-4 text-center">
      <p className="text-xs text-text-muted">{t('sectionLoadError', 'This section could not be loaded.')}</p>
    </div>
  )
}

// ============================================================================
// Preserved exports for backward compatibility
// ============================================================================

export const _StatCard = memo(function _StatCard({ loading, label, value, detail, color, borderColor, sublabel, onClick }: {
  loading: boolean
  label: React.ReactNode
  value: string
  detail: string
  color: string
  borderColor: string
  sublabel?: string
  onClick?: () => void
}) {
  return (
    <Card
      className={cn(
        'border-l-4 transition-shadow hover:border-accent/30 hover:shadow-[0_0_20px_rgba(0,0,0,0.15)]',
        borderColor,
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
          <p className={cn('text-xl md:text-2xl font-bold tabular-nums tracking-tight leading-none', color)}>{value}</p>
        )}
        <p className="text-xs text-text-muted mt-1.5">{detail}</p>
        {sublabel && (
          <p className="text-xs text-text-muted mt-0.5 font-mono">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  )
})

export function _RiskBadge({ value }: { value: number }) {
  const pct = (value * 100).toFixed(0)
  const color =
    value >= 0.60 ? 'bg-risk-critical/20 text-risk-critical border-risk-critical/30' :
    value >= 0.40 ? 'bg-risk-high/20 text-risk-high border-risk-high/30' :
    value >= 0.15 ? 'bg-risk-medium/20 text-risk-medium border-risk-medium/30' :
    'bg-risk-low/20 text-risk-low border-risk-low/30'
  return (
    <span className={cn('text-xs font-bold tabular-nums font-mono px-1.5 py-0.5 rounded border', color)}>
      {pct}%
    </span>
  )
}

export default Dashboard
