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
  Info,
  ChevronRight,
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
  PieChart,
  Pie,
  ReferenceLine,
} from '@/components/charts'
import { RISK_COLORS, SECTOR_COLORS, getSectorNameEN, CURRENT_MODEL_VERSION } from '@/lib/constants'

// ============================================================================
// Dashboard: Data-Rich Editorial Intelligence Brief
//
// Structure:
// 1. EDITORIAL HERO — compact kicker + serif headline + inline stat strip
// 2. RISK OVERVIEW — 2-column: sector bars (left) + risk distribution donut (right)
// 3. ARIA TIER CARDS — 3 compact cards (T1 / T2 / T3) with left color border
// 4. TOP PRIORITY LEAD — full-width vendor spotlight
// 5. SECTOR TABLE — compact 12-sector comparison table
// 6. CONTEXT + CTAs
// ============================================================================

// ============================================================================
// SECTOR RISK CHART — grouped horizontal bars: avg risk + % high/critical
// ============================================================================

interface SectorChartRow {
  name: string
  code: string
  avgRisk: number      // 0-100 (pct-scaled for readability)
  highCritPct: number  // 0-100
  contracts: number
  totalValue: number
  fill: string
}

function SectorRiskChart({ sectors, loading }: { sectors: SectorChartRow[]; loading: boolean }) {
  const { t } = useTranslation('dashboard')

  const { chartData, avgRiskMean } = useMemo(() => {
    const sorted = [...sectors].sort((a, b) => b.avgRisk - a.avgRisk)
    const mean = sorted.length > 0
      ? sorted.reduce((s, d) => s + d.avgRisk, 0) / sorted.length
      : 0
    return { chartData: sorted, avgRiskMean: mean }
  }, [sectors])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-[380px] w-full rounded" />
      </div>
    )
  }
  if (chartData.length === 0) return null

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-sm font-bold text-text-primary" style={{ fontFamily: 'var(--font-family-serif)' }}>
          {t('editorial.sectorChartTitle', 'Risk by sector')}
        </h3>
        <span className="text-[10px] font-mono text-text-muted/70 uppercase tracking-wider flex-shrink-0">
          v0.6.5
        </span>
      </div>
      <p className="text-[11px] text-text-muted mb-3 leading-relaxed">
        {t('editorial.sectorChartSubtitle', 'Average score and % high/critical · v0.6.5 model')}
      </p>

      <div role="img" aria-label="Horizontal bar chart of avg risk by sector">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 50, bottom: 0, left: 4 }}
          >
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="var(--color-border)"
              horizontal={false}
              opacity={0.3}
            />
            <XAxis
              type="number"
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={104}
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine
              x={avgRiskMean}
              stroke="var(--color-text-muted)"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: t('editorial.sectorAvgReference', 'Global average'),
                position: 'top',
                fill: 'var(--color-text-muted)',
                fontSize: 9,
                fontFamily: 'var(--font-family-mono)',
              }}
            />
            <RechartsTooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={{
                background: 'var(--color-background-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'var(--font-family-mono)',
                padding: '8px 10px',
              }}
              formatter={(value, name) => {
                const v = typeof value === 'number' ? value : Number(value) || 0
                if (name === 'avgRisk') return [`${v.toFixed(1)}%`, t('editorial.sectorAvgLabel', 'Avg risk')] as [string, string]
                if (name === 'highCritPct') return [`${v.toFixed(1)}%`, t('editorial.sectorHighCritLabel', '% High/Critical')] as [string, string]
                return [String(value), String(name)] as [string, string]
              }}
              labelFormatter={(label: string) => label}
            />
            <Bar dataKey="avgRisk" radius={[0, 2, 2, 0]} isAnimationActive={false} barSize={14}>
              {chartData.map((entry) => (
                <Cell key={`avg-${entry.code}`} fill={entry.fill} fillOpacity={0.9} />
              ))}
            </Bar>
            <Bar dataKey="highCritPct" radius={[0, 2, 2, 0]} isAnimationActive={false} barSize={6}>
              {chartData.map((entry) => (
                <Cell key={`hc-${entry.code}`} fill={entry.fill} fillOpacity={0.35} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + source */}
      <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-[10px] font-mono text-text-muted">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-text-secondary/70" />
            <span>{t('editorial.sectorAvgLabel', 'Avg risk')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm bg-text-secondary/30" />
            <span>{t('editorial.sectorHighCritLabel', '% High/Critical')}</span>
          </div>
        </div>
        <p className="text-[10px] text-text-muted/50 font-mono">
          {t('editorial.sectorChartSource', 'Source: RUBLI v0.6.5 · 3,051,294 contracts (2002-2025)')}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// RISK DISTRIBUTION DONUT — Critical/High/Medium/Low split
// ============================================================================

function RiskDistributionDonut({
  data,
  totalContracts,
}: {
  data: Array<{ risk_level: string; percentage: number; count: number }>
  totalContracts: number
}) {
  const { t } = useTranslation('dashboard')

  const rows = useMemo(() => {
    const order = ['critical', 'high', 'medium', 'low'] as const
    return order
      .map((level) => {
        const item = data.find((d) => d.risk_level === level)
        const labelKeys: Record<typeof order[number], string> = {
          critical: 'editorial.riskCritical',
          high: 'editorial.riskHigh',
          medium: 'editorial.riskMedium',
          low: 'editorial.riskLow',
        }
        return {
          level,
          label: t(labelKeys[level], level.charAt(0).toUpperCase() + level.slice(1)),
          pct: item?.percentage ?? 0,
          count: item?.count ?? 0,
          color: RISK_COLORS[level],
        }
      })
      .filter((r) => r.pct > 0)
  }, [data, t])

  const hrRate = useMemo(
    () => rows.filter((r) => r.level === 'critical' || r.level === 'high').reduce((s, r) => s + r.pct, 0),
    [rows]
  )

  const pieData = useMemo(
    () => rows.map((r) => ({ name: r.label, value: r.pct, color: r.color })),
    [rows]
  )

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="text-sm font-bold text-text-primary" style={{ fontFamily: 'var(--font-family-serif)' }}>
          {t('editorial.riskDistTitle', 'Risk distribution')}
        </h3>
        <span className="text-[10px] font-mono text-text-muted/70 uppercase tracking-wider flex-shrink-0">
          {formatNumber(totalContracts)}
        </span>
      </div>
      <p className="text-[11px] text-text-muted mb-3 leading-relaxed">
        {t('editorial.riskDistSubtitle', '{{total}} contracts analyzed', {
          total: formatNumber(totalContracts),
        })}
      </p>

      {/* Donut */}
      <div className="relative" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={1}
              dataKey="value"
              stroke="var(--color-background)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {pieData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{
                background: 'var(--color-background-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'var(--font-family-mono)',
                padding: '6px 8px',
              }}
              formatter={(value) => {
                const v = typeof value === 'number' ? value : Number(value) || 0
                return [`${v.toFixed(1)}%`, ''] as [string, string]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="stat-md font-mono" style={{ color: RISK_COLORS.critical }}>
            {hrRate.toFixed(1)}%
          </div>
          <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted/70">
            HR
          </div>
        </div>
      </div>

      {/* Count table */}
      <div className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.level}
            className="flex items-center justify-between py-1 border-b border-border/20 last:border-b-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: r.color }} />
              <span className="text-xs text-text-secondary truncate">{r.label}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 font-mono text-[11px]">
              <span className="text-text-muted tabular-nums">{formatNumber(r.count)}</span>
              <span className="text-text-primary tabular-nums w-12 text-right font-semibold">
                {r.pct.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-muted/60 mt-3 font-mono">
        {t('editorial.riskOecdNote', 'High-risk: {{rate}}% · OECD 2-15%', { rate: hrRate.toFixed(1) })}
      </p>
    </div>
  )
}

// ============================================================================
// ARIA TIER CARD — compact with left color border
// ============================================================================

function TierCard({
  tier,
  label,
  count,
  color,
  action,
  onClick,
}: {
  tier: string
  label: string
  count: number
  color: string
  action: string
  onClick: () => void
}) {
  const { t } = useTranslation('dashboard')
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-md border border-border/30 p-4 transition-all hover:border-border/60 hover:bg-background-elevated/30"
      style={{ borderLeftWidth: '3px', borderLeftColor: color }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono font-bold tracking-[0.15em]" style={{ color }}>
          {tier}
        </span>
        <span className="text-[10px] font-mono text-text-muted/60 uppercase tracking-wider truncate">
          {label}
        </span>
      </div>
      <div className="stat-lg font-mono mb-1" style={{ color }}>
        {formatNumber(count)}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-text-muted leading-snug truncate">{action}</p>
        <span className="text-[10px] font-mono text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
          {t('editorial.viewQueue', 'View queue')}
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  )
}

// ============================================================================
// SECTOR TABLE — compact 12-sector comparison
// ============================================================================

interface SectorTableRow {
  code: string
  name: string
  contracts: number
  totalValue: number
  avgRisk: number // 0-1
  highCritPct: number // 0-100
}

function SectorTable({ sectors, loading }: { sectors: SectorTableRow[]; loading: boolean }) {
  const { t } = useTranslation('dashboard')
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full rounded" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary" style={{ fontFamily: 'var(--font-family-serif)' }}>
            {t('editorial.sectorTableTitle', 'Sector breakdown')}
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            {t('editorial.sectorTableSubtitle', '12 federal sectors ordered by total value')}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border/30">
        {/* Header row */}
        <div
          className="grid items-center text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted/70 px-3 py-2 border-b border-border/30"
          style={{ gridTemplateColumns: '1.8fr 1fr 1.2fr 1fr 1fr 16px' }}
        >
          <span>{t('editorial.colSector', 'Sector')}</span>
          <span className="text-right">{t('editorial.colContracts', 'Contracts')}</span>
          <span className="text-right">{t('editorial.colValue', 'Total value')}</span>
          <span className="text-right">{t('editorial.colAvgRisk', 'Avg risk')}</span>
          <span className="text-right">{t('editorial.colHighCrit', '% High+Crit')}</span>
          <span />
        </div>
        {/* Rows */}
        {sectors.map((s, idx) => {
          const color = SECTOR_COLORS[s.code] ?? '#64748b'
          const riskLevel =
            s.avgRisk >= 0.4 ? 'high' : s.avgRisk >= 0.25 ? 'medium' : 'low'
          const riskColor =
            riskLevel === 'high' ? RISK_COLORS.high
            : riskLevel === 'medium' ? RISK_COLORS.medium
            : RISK_COLORS.low
          return (
            <button
              key={s.code}
              onClick={() => navigate(`/sectors/${s.code}`)}
              className={cn(
                'w-full grid items-center px-3 py-2 text-left transition-colors hover:bg-background-elevated/40',
                idx < sectors.length - 1 && 'border-b border-border/20'
              )}
              style={{ gridTemplateColumns: '1.8fr 1fr 1.2fr 1fr 1fr 16px' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2 w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-text-primary font-medium truncate">{s.name}</span>
              </div>
              <span className="text-[11px] font-mono text-text-secondary text-right tabular-nums">
                {formatNumber(s.contracts)}
              </span>
              <span className="text-[11px] font-mono text-text-secondary text-right tabular-nums">
                {formatCompactMXN(s.totalValue)}
              </span>
              <div className="flex items-center justify-end gap-1.5">
                <div className="h-1 w-8 rounded-sm bg-border/20 overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(100, s.avgRisk * 200)}%`,
                      backgroundColor: riskColor,
                    }}
                  />
                </div>
                <span className="text-[11px] font-mono text-text-primary tabular-nums w-10 text-right">
                  {(s.avgRisk * 100).toFixed(1)}%
                </span>
              </div>
              <span className="text-[11px] font-mono text-text-secondary text-right tabular-nums">
                {s.highCritPct.toFixed(1)}%
              </span>
              <ChevronRight className="h-3 w-3 text-text-muted/50" />
            </button>
          )
        })}
      </div>
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

  const { data: ariaStats } = useQuery({
    queryKey: ['aria', 'stats'],
    queryFn: () => ariaApi.getStats(),
    staleTime: 10 * 60 * 1000,
    retry: 0,
  })

  const { data: ariaT1 } = useQuery({
    queryKey: ['aria', 'queue', 'spotlight'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 1 }),
    staleTime: 10 * 60 * 1000,
  })

  // ── Derived data ──────────────────────────────────────────────────────────

  const overview = fastDashboard?.overview ?? (riskOverviewFallback?.overview as FastDashboardData['overview'] | undefined)
  const sectorsRaw = fastDashboard?.sectors
  const riskDist = fastDashboard?.risk_distribution ?? (riskOverviewFallback?.risk_distribution as FastDashboardData['risk_distribution'] | undefined)

  const bothSettled = !dashLoading && (!fastFailed || !fallbackLoading)
  const kpiLoading = !bothSettled || !overview

  const criticalHighValue = useMemo(() => {
    if (!riskDist) return 0
    return riskDist
      .filter((d) => d.risk_level === 'critical' || d.risk_level === 'high')
      .reduce((s, d) => s + (d.total_value_mxn || 0), 0)
  }, [riskDist])

  const lastUpdated = fastDashboard?.cached_at
    ? new Date(fastDashboard.cached_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  // Enriched sector rows (unified source for chart + table)
  const sectorRows = useMemo(() => {
    if (!sectorsRaw) return []
    return sectorsRaw
      .map((s) => {
        const ct = s.total_contracts || 1
        const highCritPct = (((s.high_risk_count || 0) + (s.critical_risk_count || 0)) / ct) * 100
        return {
          code: s.code,
          name: ts(s.code) || getSectorNameEN(s.code),
          contracts: s.total_contracts,
          totalValue: s.total_value_mxn || 0,
          avgRisk: s.avg_risk_score || 0,
          highCritPct,
        }
      })
  }, [sectorsRaw, ts])

  const sectorChartRows: SectorChartRow[] = useMemo(
    () =>
      sectorRows.map((s) => ({
        name: s.name,
        code: s.code,
        avgRisk: +(s.avgRisk * 100).toFixed(1),
        highCritPct: +s.highCritPct.toFixed(1),
        contracts: s.contracts,
        totalValue: s.totalValue,
        fill: SECTOR_COLORS[s.code] ?? '#64748b',
      })),
    [sectorRows]
  )

  const sectorTableRows: SectorTableRow[] = useMemo(
    () => [...sectorRows].sort((a, b) => b.totalValue - a.totalValue),
    [sectorRows]
  )

  // ARIA tier data
  const latestRun = ariaStats?.latest_run
  const t1Count = ariaT1?.pagination?.total ?? latestRun?.tier1_count ?? 320
  const t2Count = latestRun?.tier2_count ?? 1234
  const t3Count = latestRun?.tier3_count ?? 5016
  const t4Count = latestRun?.tier4_count ?? 311871
  const ariaTotal = ariaStats?.queue_total ?? (t1Count + t2Count + t3Count + t4Count)
  const ariaElevatedValue = ariaStats?.elevated_value_mxn ?? 0

  const topVendor = ariaT1?.data?.[0] as AriaQueueItem | undefined

  const modelAuc = modelMeta?.auc_test ?? 0.828
  const modelVersion = modelMeta?.version === 'v6.5' ? 'v0.6.5' : (modelMeta?.version ?? CURRENT_MODEL_VERSION)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

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
      {/* 1. EDITORIAL HERO — compact                                       */}
      {/* ================================================================ */}
      <header className="border-b border-border/30 pb-6">
        <p
          className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-2.5"
          style={{ color: 'var(--color-accent)' }}
        >
          {t('editorial.kicker', 'RUBLI · INTELLIGENCE BRIEF')}
        </p>

        {/* Headline — constrained serif, 2rem max */}
        {kpiLoading ? (
          <Skeleton className="h-9 w-3/4 mb-3" />
        ) : (
          <h1
            className="leading-[1.1] mb-3 max-w-3xl"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'clamp(1.5rem, 2.6vw, 2rem)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.015em',
            }}
          >
            {t('editorial.headline', '{{value}} vendors require immediate investigation', {
              value: formatNumber(t1Count),
            })}
          </h1>
        )}

        {kpiLoading ? (
          <Skeleton className="h-4 w-2/3 mb-5" />
        ) : (
          <p className="text-sm leading-relaxed mb-5 max-w-3xl text-text-secondary">
            {t('editorial.subhead', {
              totalValue: formatCompactMXN(overview?.total_value_mxn ?? 0),
              riskValue: formatCompactMXN(criticalHighValue || ariaElevatedValue),
              contracts: formatNumber(overview?.total_contracts ?? 0),
              defaultValue: 'RUBLI analyzed {{contracts}} federal contracts worth {{totalValue}} (2002-2025). {{riskValue}} sits in contracts flagged high or critical risk — patterns consistent with documented corruption cases.',
            })}
          </p>
        )}

        {/* Inline stat strip — compact, single row */}
        <div className="flex items-center gap-x-6 gap-y-3 flex-wrap text-sm">
          <div className="flex items-baseline gap-2">
            <span className="stat-md font-mono" style={{ color: RISK_COLORS.critical }}>
              {kpiLoading ? '—' : formatNumber(t1Count)}
            </span>
            <span className="stat-label text-text-muted">
              {t('editorial.stripT1', 'T1 Critical')}
            </span>
          </div>
          <span className="text-text-muted/30 font-mono text-xs">·</span>
          <div className="flex items-baseline gap-2">
            <span className="stat-md font-mono" style={{ color: 'var(--color-accent)' }}>
              {kpiLoading ? '—' : formatCompactMXN(criticalHighValue || ariaElevatedValue)}
            </span>
            <span className="stat-label text-text-muted">
              {t('editorial.stripValue', 'at risk')}
            </span>
          </div>
          <span className="text-text-muted/30 font-mono text-xs">·</span>
          <div className="flex items-baseline gap-2">
            <span className="stat-md font-mono text-text-secondary">
              {`${(modelAuc * 100).toFixed(1)}%`}
            </span>
            <span className="stat-label text-text-muted">
              {t('editorial.stripModel', 'AUC {{auc}}', { auc: modelAuc.toFixed(3) })}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-text-muted/60">
            <span>{modelVersion}</span>
            {lastUpdated && (
              <>
                <span>·</span>
                <span>{t('synced')} {lastUpdated.toUpperCase()}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* 2. RISK OVERVIEW — 2-column grid                                  */}
      {/* ================================================================ */}
      <section className="grid gap-6 lg:grid-cols-5">
        {/* Left: sector bar chart (~60%) */}
        <div className="lg:col-span-3 rounded-lg border border-border/30 p-5 bg-background-elevated/10">
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            <SectorRiskChart sectors={sectorChartRows} loading={dashLoading} />
          </ErrorBoundary>
        </div>

        {/* Right: risk distribution donut (~40%) */}
        <div className="lg:col-span-2 rounded-lg border border-border/30 p-5 bg-background-elevated/10">
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            {riskDist && overview ? (
              <RiskDistributionDonut data={riskDist} totalContracts={overview.total_contracts ?? 0} />
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-[180px] w-full rounded-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}
          </ErrorBoundary>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 3. ARIA TIER CARDS — 3 up (T1/T2/T3)                              */}
      {/* ================================================================ */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
            {t('editorial.tierKicker', 'ARIA QUEUE · {{total}} VENDORS', {
              total: formatNumber(ariaTotal),
            })}
          </p>
          <Link
            to="/aria"
            className="text-[10px] font-mono uppercase tracking-wider flex items-center gap-1 hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('editorial.viewQueue', 'View queue')}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TierCard
            tier="T1"
            label={t('editorial.riskCritical', 'Critical')}
            count={t1Count}
            color={RISK_COLORS.critical}
            action={t('editorial.t1Action', 'Immediate investigation')}
            onClick={() => navigate('/aria?tier=1')}
          />
          <TierCard
            tier="T2"
            label={t('editorial.riskHigh', 'High')}
            count={t2Count}
            color={RISK_COLORS.high}
            action={t('editorial.t2Action', 'Priority review')}
            onClick={() => navigate('/aria?tier=2')}
          />
          <TierCard
            tier="T3"
            label={t('editorial.riskMedium', 'Medium')}
            count={t3Count}
            color={RISK_COLORS.medium}
            action={t('editorial.t3Action', 'Active surveillance')}
            onClick={() => navigate('/aria?tier=3')}
          />
        </div>
      </section>

      {/* ================================================================ */}
      {/* 4. TOP PRIORITY LEAD — vendor spotlight                           */}
      {/* ================================================================ */}
      <ErrorBoundary fallback={null}>
        {topVendor && (
          <section
            className="rounded-lg p-5"
            style={{
              borderLeft: `3px solid var(--color-accent)`,
              border: '1px solid var(--color-border)',
              borderLeftWidth: '3px',
              borderLeftColor: 'var(--color-accent)',
              background: 'var(--color-accent-glow)',
            }}
          >
            <div className="flex items-start gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <p
                  className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] mb-1.5"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('editorial.spotlightKicker', 'PRIMARY INVESTIGATION TARGET')}
                </p>
                <p
                  className="text-base font-bold text-text-primary mb-1"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {toTitleCase(topVendor.vendor_name)}
                </p>
                <p className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
                  <span>{formatNumber(topVendor.total_contracts)} {tc('contracts').toLowerCase()}</span>
                  <span className="text-text-muted/40">·</span>
                  <span className="font-mono">{formatCompactMXN(topVendor.total_value_mxn)}</span>
                  {topVendor.primary_sector_name && (
                    <>
                      <span className="text-text-muted/40">·</span>
                      <span>{toTitleCase(topVendor.primary_sector_name)}</span>
                    </>
                  )}
                  {topVendor.primary_pattern && (
                    <>
                      <span className="text-text-muted/40">·</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-border/40 bg-border/10">
                        {topVendor.primary_pattern}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-5 flex-shrink-0">
                <div className="text-right">
                  <div className="stat-lg font-mono" style={{ color: RISK_COLORS.critical }}>
                    {topVendor.ips_final.toFixed(3)}
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted">
                    {t('editorial.spotlightIps', 'IPS')}
                  </div>
                </div>
                <Link
                  to={`/vendors/${topVendor.vendor_id}`}
                  className="text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1 px-3 py-2 rounded border border-accent/40 hover:bg-accent/10 transition-colors"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('editorial.spotlightOpen', 'Open profile')}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </ErrorBoundary>

      {/* ================================================================ */}
      {/* 5. SECTOR TABLE — compact                                         */}
      {/* ================================================================ */}
      <section>
        <ErrorBoundary fallback={<SectionErrorFallback />}>
          <SectorTable sectors={sectorTableRows} loading={dashLoading} />
        </ErrorBoundary>
        <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded border border-border/30 bg-background-elevated/20">
          <Info className="h-3 w-3 text-text-muted/50 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] font-mono text-text-muted/60 leading-relaxed">
            {t('sectorChartDataQualityNote', 'Data quality varies by period: 2002–2010 contracts have 0.1% vendor RFC coverage (lowest quality) — sector averages for that era are directional estimates. Coverage improves to 15.7% (2010–2017), 30.3% (2018–2022), and 47.4% (2023–2025).')}
          </p>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6. COMPRANET CONTEXT — editorial callout                          */}
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
          <div className="min-w-0 flex-1">
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
      {/* 7. QUICK LINKS / CTA                                              */}
      {/* ================================================================ */}
      <section>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
          {t('startInvestigating')}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => navigate('/aria')}
            className="flex flex-col gap-2 p-5 rounded-lg border border-border/40 hover:border-accent/40 transition-all text-left"
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
            className="flex flex-col gap-2 p-5 rounded-lg border border-border/40 hover:border-accent/40 transition-all text-left"
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
            className="flex flex-col gap-2 p-5 rounded-lg border border-border/40 hover:border-accent/40 transition-all text-left"
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
        RUBLI &middot; {formatNumber(overview?.total_contracts ?? 3051294)} {tc('contracts').toLowerCase()} &middot; 2002-2025 &middot; {modelVersion}
      </footer>
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
          <p className={cn('stat-md', color)}>{value}</p>
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
