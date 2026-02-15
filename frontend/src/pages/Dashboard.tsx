import { memo, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
import { analysisApi, investigationApi } from '@/api/client'
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
  BookOpen,
} from 'lucide-react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from '@/components/charts'
import { RISK_COLORS, getSectorNameEN } from '@/lib/constants'

// ============================================================================
// The story this dashboard tells:
// 1. THE SCALE — how much public money we're watching
// 2. THE THREAT — how much is at risk
// 3. THE PROOF — we validated against real corruption cases
// 4. WHERE IT IS — sectors and trajectory over time
// 5. WHO TO WATCH — investigation targets
// ============================================================================

const CORRUPTION_CASES = [
  { name: 'IMSS Ghost Companies', contracts: 9366, detected: 99.0, type: 'Ghost companies', sector: 'Health', value: '12.8B' },
  { name: 'Oceanografia PEMEX', contracts: 2, detected: 100.0, type: 'Invoice fraud', sector: 'Energy', value: '8.5B' },
  { name: 'Segalmex Fraud', contracts: 6326, detected: 94.3, type: 'Procurement fraud', sector: 'Agriculture', value: '15.1B' },
  { name: 'COVID-19 Procurement', contracts: 5371, detected: 91.8, type: 'Embezzlement', sector: 'Health', value: '9.2B' },
  { name: 'La Estafa Maestra', contracts: 10, detected: 70.0, type: 'Ghost companies', sector: 'Multiple', value: '7.6B' },
  { name: 'Odebrecht-PEMEX', contracts: 35, detected: 68.6, type: 'Bribery', sector: 'Energy', value: '3.4B' },
  { name: 'Cyber Robotic IT', contracts: 139, detected: 43.2, type: 'Overpricing', sector: 'Technology', value: '0.4B' },
  { name: 'Grupo Higa', contracts: 3, detected: 33.3, type: 'Conflict of interest', sector: 'Infrastructure', value: '2.1B' },
] as const

// ============================================================================
// Main Dashboard
// ============================================================================

export function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation('common')

  const { data: fastDashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: yoyData } = useQuery({
    queryKey: ['analysis', 'yoy'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 5 * 60 * 1000,
  })

  const overview = fastDashboard?.overview
  const sectors = fastDashboard?.sectors
  const riskDist = fastDashboard?.risk_distribution

  // Compute value at risk
  const valueAtRisk = useMemo(() => {
    if (!sectors) return { total: 0, pct: 0 }
    let totalAtRisk = 0
    let totalValue = 0
    for (const s of sectors) {
      const t = s.total_contracts || 1
      const hrPct = ((s.high_risk_count || 0) + (s.critical_risk_count || 0)) / t
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
        const t = s.total_contracts || 1
        const hrPct = ((s.high_risk_count || 0) + (s.critical_risk_count || 0)) / t
        return {
          name: getSectorNameEN(s.code),
          code: s.code,
          valueAtRisk: hrPct * (s.total_value_mxn || 0),
          riskPct: hrPct * 100,
          contracts: s.total_contracts,
        }
      })
      .sort((a, b) => b.valueAtRisk - a.valueAtRisk)
  }, [sectors])

  // Risk trajectory from REAL year-over-year data
  const riskTrajectory = useMemo(() => {
    if (!yoyData?.data) return []
    return yoyData.data
      .filter((d) => d.year >= 2010 && d.year <= 2025)
      .map((d) => ({
        year: d.year,
        highRiskPct: (d.high_risk_pct || 0) * 100,
        avgRisk: (d.avg_risk || 0) * 100,
        contracts: d.contracts,
      }))
  }, [yoyData])

  const highRiskContracts = overview?.high_risk_contracts || 0
  const highRiskPct = overview?.high_risk_pct || 0

  const lastUpdated = fastDashboard?.cached_at
    ? new Date(fastDashboard.cached_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* HEADER — Intelligence Brief */}
      {/* ================================================================ */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-accent font-[var(--font-family-mono)]">
              {t('intelligenceBrief')}
            </span>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-[var(--font-family-mono)]">
              <Activity className="h-3 w-3 text-signal-live" />
              <span>{t('synced')} {lastUpdated.toUpperCase()}</span>
            </div>
          )}
        </div>
        {dashLoading ? (
          <Skeleton className="h-8 w-80" />
        ) : (
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {formatCompactMXN(overview?.total_value_mxn || 0)} {t('inPublicProcurement')}
          </h1>
        )}
        <div className="text-sm text-text-muted mt-1">
          {dashLoading ? (
            <Skeleton className="h-4 w-96" />
          ) : (
            <>
              {t('contractsAnalyzed', {
                contracts: formatNumber(overview?.total_contracts || 0),
                years: overview?.years_covered || 24,
                vendors: formatNumber(overview?.total_vendors || 0),
              })}
            </>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* SECTION 1: THREAT ASSESSMENT — 3 stat cards */}
      {/* ================================================================ */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Value flagged */}
        <ThreatCard
          loading={dashLoading}
          label={t('valueFlagged')}
          value={valueAtRisk.total}
          format="currency"
          detail={t('valueFlaggedDetail', { pct: valueAtRisk.pct.toFixed(1) })}
          variant="danger"
          onClick={() => navigate('/contracts?risk_level=critical')}
        />
        {/* Contracts at risk */}
        <ThreatCard
          loading={dashLoading}
          label={t('contractsShowingRisk')}
          value={highRiskPct}
          format="percent"
          detail={t('contractsFlaggedDetail', { count: formatNumber(highRiskContracts) })}
          variant="warning"
          sublabel={t('oecdBenchmark')}
          onClick={() => navigate('/contracts?risk_level=high')}
        />
        {/* Model power */}
        <ThreatCard
          loading={false}
          label={t('detectionAccuracy')}
          value={0.942}
          format="auc"
          detail={t('detectionDetail')}
          variant="accent"
          sublabel={t('statisticalFramework')}
          onClick={() => navigate('/model')}
        />
      </div>

      {/* ================================================================ */}
      {/* SECTION 2: THE PROOF — Corruption case detection */}
      {/* ================================================================ */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Target className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-bold text-text-primary">{t('validatedAgainstReal')}</h2>
              </div>
              <p className="text-[11px] text-text-muted">
                {t('retroactiveDetection', { count: formatNumber(21252) })}
              </p>
            </div>
            <button
              onClick={() => navigate('/ground-truth')}
              className="text-[10px] text-accent hover:text-accent/80 flex items-center gap-1 transition-colors"
            >
              {t('fullAnalysis')} <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <CaseDetectionChart cases={CORRUPTION_CASES} />
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-accent" />
              <span className="text-[10px] text-text-muted">
                <Trans i18nKey="casesDetected" ns="dashboard" values={{ detected: 8, total: 8 }}>
                  <strong className="text-text-secondary">{'{{detected}} of {{total}}'}</strong> cases detected
                </Trans>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* SECTION 3: WHERE RISK CONCENTRATES — Sectors + Trajectory */}
      {/* ================================================================ */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Sector risk — unified color */}
        <Card>
          <CardContent className="pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Scale className="h-3.5 w-3.5 text-risk-high" />
                  <h2 className="text-sm font-bold text-text-primary">{t('valueAtRiskBySector')}</h2>
                </div>
                <p className="text-[10px] text-text-muted">{t('valueAtRiskBySectorDesc')}</p>
              </div>
            </div>
            {dashLoading ? (
              <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
            ) : (
              <SectorRiskBars data={sectorData} onSectorClick={(code) => {
                const s = sectors?.find((x) => x.code === code)
                if (s) navigate(`/sectors/${s.id}`)
              }} />
            )}
          </CardContent>
        </Card>

        {/* Risk trajectory — real YoY data */}
        <Card>
          <CardContent className="pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <TrendingDown className="h-3.5 w-3.5 text-risk-high" />
                  <h2 className="text-sm font-bold text-text-primary">{t('riskTrajectory')}</h2>
                </div>
                <p className="text-[10px] text-text-muted">{t('riskTrajectoryDesc')}</p>
              </div>
              <span className="text-[9px] text-text-muted font-[var(--font-family-mono)]">2010-2025</span>
            </div>
            {!yoyData ? (
              <div className="h-[320px] flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
            ) : (
              <RiskTrajectoryChart data={riskTrajectory} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* SECTION 4: INVESTIGATION INTELLIGENCE */}
      {/* ================================================================ */}
      <InvestigationIntelligenceSection navigate={navigate} />

      {/* ================================================================ */}
      {/* SECTION 5: KEY INSIGHT */}
      {/* ================================================================ */}
      <Card className="border-accent/15 bg-accent/[0.02]">
        <CardContent className="py-4">
          <div className="flex gap-4 items-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 flex-shrink-0">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-accent mb-1 font-[var(--font-family-mono)]">
                {t('counterintuitiveFinding')}
              </p>
              <p className="text-sm font-semibold text-text-primary">
                {t('directAwardsLessRisky')}
              </p>
              <p
                className="text-xs text-text-muted mt-1 leading-relaxed [&_strong]:text-text-secondary"
                dangerouslySetInnerHTML={{ __html: t('counterintuitiveDetail') }}
              />
            </div>
            <button
              onClick={() => navigate('/model')}
              className="text-[10px] text-accent hover:text-accent/80 flex items-center gap-1 flex-shrink-0 mt-1 transition-colors"
            >
              {t('learnMore')} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* SECTION 6: NAVIGATE DEEPER */}
      {/* ================================================================ */}
      <div className="grid gap-2 md:grid-cols-4">
        {[
          { labelKey: 'patterns' as const, icon: Crosshair, path: '/patterns', descKey: 'patternsDesc' as const },
          { labelKey: 'network' as const, icon: Radar, path: '/network', descKey: 'networkDesc' as const },
          { labelKey: 'explore' as const, icon: Search, path: '/explore', descKey: 'exploreDesc' as const },
          { labelKey: 'methodology' as const, icon: BookOpen, path: '/methodology', descKey: 'methodologyDesc' as const },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-border/40 bg-surface-card/30 hover:border-accent/30 hover:bg-accent/5 transition-all text-left group"
          >
            <item.icon className="h-4 w-4 text-text-muted group-hover:text-accent shrink-0 transition-colors" />
            <div>
              <p className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">{t(item.labelKey)}</p>
              <p className="text-[10px] text-text-muted">{t(item.descKey)}</p>
            </div>
            <ArrowRight className="h-3 w-3 text-text-muted/30 ml-auto group-hover:text-accent/50 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// THREAT CARD
// ============================================================================

interface ThreatCardProps {
  loading: boolean
  label: string
  value: number
  format: 'currency' | 'percent' | 'auc'
  detail: string
  variant: 'danger' | 'warning' | 'accent'
  sublabel?: string
  onClick?: () => void
}

const ThreatCard = memo(function ThreatCard({ loading, label, value, format, detail, variant, sublabel, onClick }: ThreatCardProps) {
  const formatted = useMemo(() => {
    if (format === 'currency') return formatCompactMXN(value)
    if (format === 'percent') return `${(value * 100).toFixed(1)}%`
    if (format === 'auc') return `AUC ${value.toFixed(3)}`
    return String(value)
  }, [value, format])

  const colors = {
    danger: { border: 'border-risk-critical/20', bg: 'bg-risk-critical/[0.03]', text: 'text-risk-critical', icon: 'bg-risk-critical/10' },
    warning: { border: 'border-risk-high/20', bg: 'bg-risk-high/[0.03]', text: 'text-risk-high', icon: 'bg-risk-high/10' },
    accent: { border: 'border-accent/20', bg: 'bg-accent/[0.03]', text: 'text-accent', icon: 'bg-accent/10' },
  }[variant]

  return (
    <Card
      className={cn(
        colors.border, colors.bg,
        onClick && 'cursor-pointer hover:shadow-lg transition-all duration-200 group/tc'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      <CardContent className="p-4">
        <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-text-muted font-[var(--font-family-mono)] mb-2">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-8 w-28 mb-1" />
        ) : (
          <p className={cn('text-2xl font-bold tabular-nums tracking-tight', colors.text)}>{formatted}</p>
        )}
        <p className="text-[11px] text-text-muted mt-1">{detail}</p>
        {sublabel && (
          <p className="text-[9px] text-text-muted/60 mt-1 font-[var(--font-family-mono)]">{sublabel}</p>
        )}
      </CardContent>
    </Card>
  )
})

// ============================================================================
// CASE DETECTION CHART — The proof section
// ============================================================================

const CaseDetectionChart = memo(function CaseDetectionChart({
  cases,
}: {
  cases: readonly typeof CORRUPTION_CASES[number][]
}) {
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation('common')

  return (
    <div className="space-y-2 mt-3">
      {cases.map((c) => {
        const barColor = c.detected >= 90
          ? '#4ade80'
          : c.detected >= 60
            ? '#58a6ff'
            : '#fbbf24'
        return (
          <div key={c.name} className="group">
            <div className="flex items-center gap-3">
              {/* Case name */}
              <div className="w-[180px] flex-shrink-0">
                <p className="text-[11px] font-medium text-text-primary truncate">{c.name}</p>
                <p className="text-[9px] text-text-muted">{c.type} · {c.sector}</p>
              </div>
              {/* Detection bar */}
              <div className="flex-1 relative">
                <div className="h-6 rounded bg-background-elevated/60 overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-700 ease-out flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.max(c.detected, 8)}%`,
                      backgroundColor: barColor,
                      opacity: 0.85,
                    }}
                  >
                    <span className="text-[10px] font-bold text-background-base font-[var(--font-family-mono)] tabular-nums">
                      {c.detected.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
              {/* Contracts */}
              <div className="w-[70px] flex-shrink-0 text-right">
                <span className="text-[10px] text-text-muted tabular-nums font-[var(--font-family-mono)]">
                  {formatNumber(c.contracts)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
      {/* Column labels */}
      <div className="flex items-center gap-3 pt-1">
        <div className="w-[180px] flex-shrink-0">
          <span className="text-[9px] text-text-muted/50 uppercase tracking-wider">{t('caseLabel')}</span>
        </div>
        <div className="flex-1">
          <span className="text-[9px] text-text-muted/50 uppercase tracking-wider">{t('detectionRate')}</span>
        </div>
        <div className="w-[70px] flex-shrink-0 text-right">
          <span className="text-[9px] text-text-muted/50 uppercase tracking-wider">{tc('contracts')}</span>
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// SECTOR RISK BARS — Unified warm color scheme
// ============================================================================

const SectorRiskBars = memo(function SectorRiskBars({
  data,
  onSectorClick,
}: {
  data: Array<{ name: string; code: string; valueAtRisk: number; riskPct: number; contracts: number }>
  onSectorClick?: (code: string) => void
}) {
  const maxValue = Math.max(...data.map((d) => d.valueAtRisk), 1)

  return (
    <div className="space-y-1.5">
      {data.map((sector) => {
        const widthPct = (sector.valueAtRisk / maxValue) * 100
        // Opacity scales with risk percentage — higher risk = more opaque
        const opacity = 0.4 + Math.min(sector.riskPct / 30, 1) * 0.5
        return (
          <button
            key={sector.code}
            className="flex items-center gap-2 w-full text-left group hover:bg-background-elevated/30 rounded px-1 py-0.5 -mx-1 transition-colors"
            onClick={() => onSectorClick?.(sector.code)}
          >
            <span className="text-[11px] text-text-secondary w-[90px] flex-shrink-0 truncate group-hover:text-text-primary transition-colors">
              {sector.name}
            </span>
            <div className="flex-1 relative h-5">
              <div className="absolute inset-0 rounded bg-background-elevated/40" />
              <div
                className="absolute left-0 top-0 h-full rounded transition-all duration-500"
                style={{
                  width: `${Math.max(widthPct, 2)}%`,
                  backgroundColor: RISK_COLORS.high,
                  opacity,
                }}
              />
              {sector.valueAtRisk > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-[var(--font-family-mono)] tabular-nums text-text-muted">
                  {formatCompactMXN(sector.valueAtRisk)}
                </span>
              )}
            </div>
            <span className="text-[9px] text-text-muted/60 w-[40px] flex-shrink-0 text-right tabular-nums font-[var(--font-family-mono)]">
              {sector.riskPct.toFixed(0)}%
            </span>
          </button>
        )
      })}
    </div>
  )
})

// ============================================================================
// RISK TRAJECTORY — Real per-year data
// ============================================================================

const RiskTrajectoryChart = memo(function RiskTrajectoryChart({
  data,
}: {
  data: Array<{ year: number; highRiskPct: number; avgRisk: number; contracts: number }>
}) {
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation('common')

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={RISK_COLORS.high} stopOpacity={0.4} />
              <stop offset="100%" stopColor={RISK_COLORS.high} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            domain={[0, 'auto']}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload
                return (
                  <div className="chart-tooltip">
                    <p className="font-semibold text-xs text-text-primary">{d.year}</p>
                    <div className="space-y-0.5 mt-1">
                      <p className="text-[11px] text-text-muted tabular-nums">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: RISK_COLORS.high }} />
                        {t('highRiskRate')}: <strong className="text-text-secondary">{d.highRiskPct.toFixed(1)}%</strong>
                      </p>
                      <p className="text-[11px] text-text-muted tabular-nums">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5 bg-accent" />
                        {t('avgRiskScore')}: <strong className="text-text-secondary">{d.avgRisk.toFixed(1)}%</strong>
                      </p>
                      <p className="text-[10px] text-text-muted/70 tabular-nums">
                        {formatNumber(d.contracts)} {tc('contracts').toLowerCase()}
                      </p>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Area
            type="monotone"
            dataKey="highRiskPct"
            stroke={RISK_COLORS.high}
            strokeWidth={2}
            fill="url(#riskGradient)"
            dot={false}
            activeDot={{ r: 4, stroke: RISK_COLORS.high, strokeWidth: 2, fill: 'var(--color-background-base)' }}
          />
          <Area
            type="monotone"
            dataKey="avgRisk"
            stroke="var(--color-accent)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="transparent"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-5 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded" style={{ backgroundColor: RISK_COLORS.high }} />
          <span className="text-[10px] text-text-muted">{t('highRiskRate')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded border-b border-dashed border-accent" style={{ borderStyle: 'dashed' }} />
          <span className="text-[10px] text-text-muted">{t('avgRiskScore')}</span>
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// INVESTIGATION INTELLIGENCE — Real ML case data
// ============================================================================

const InvestigationIntelligenceSection = memo(function InvestigationIntelligenceSection({
  navigate,
}: {
  navigate: (path: string) => void
}) {
  const { t } = useTranslation('dashboard')
  const { data: summary, isLoading } = useQuery({
    queryKey: ['investigation', 'dashboard-summary'],
    queryFn: () => investigationApi.getDashboardSummary(),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Crosshair className="h-3.5 w-3.5 text-accent" />
              <h2 className="text-sm font-bold text-text-primary">{t('investigationIntelligence')}</h2>
            </div>
            <p className="text-[10px] text-text-muted">{t('mlGeneratedLeads')}</p>
          </div>
          <button
            onClick={() => navigate('/investigation')}
            className="text-[10px] text-accent hover:text-accent/80 flex items-center gap-1 transition-colors"
          >
            {t('viewAllCases')} <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
        ) : summary ? (
          <div className="space-y-4">
            {/* Stats row */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-background-elevated/50">
                <span className="text-lg font-bold text-text-primary tabular-nums">{summary.total_cases}</span>
                <span className="text-[10px] text-text-muted">{t('mlCases')}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-signal-live/10 border border-signal-live/20">
                <span className="text-lg font-bold text-signal-live tabular-nums">{summary.corroborated_cases}</span>
                <span className="text-[10px] text-text-muted">{t('confirmed')}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-accent/10 border border-accent/20">
                <span className="text-lg font-bold text-accent tabular-nums">
                  {summary.hit_rate ? `${(summary.hit_rate.rate * 100).toFixed(0)}%` : '—'}
                </span>
                <span className="text-[10px] text-text-muted">{t('hitRate')}</span>
              </div>
            </div>

            {/* Narrative */}
            <p className="text-[11px] text-text-secondary leading-relaxed">
              {summary.hit_rate ? (
                <>
                  <strong className="text-text-primary">
                    {summary.hit_rate.rate >= 0.5 ? t('strongValidation') : t('moderateValidation')}
                  </strong>{' '}
                  {t('validationDetail', {
                    confirmed: summary.hit_rate.confirmed,
                    checked: summary.hit_rate.checked,
                  })}
                </>
              ) : (
                t('pipelineGenerated')
              )}
            </p>

            {/* Top confirmed cases */}
            {summary.top_corroborated && summary.top_corroborated.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-text-muted/60 font-[var(--font-family-mono)]">
                  {t('topConfirmed')}
                </p>
                {summary.top_corroborated.slice(0, 3).map((c, i) => (
                  <div
                    key={c.id || i}
                    className="flex items-center gap-2.5 rounded-md p-2 hover:bg-background-elevated/40 transition-colors group cursor-pointer"
                    onClick={() => navigate('/investigation')}
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-signal-live bg-signal-live/10 font-[var(--font-family-mono)]">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate text-text-primary group-hover:text-accent transition-colors">
                        {toTitleCase(c.title?.replace(/ - Externally Corroborated Investigation$/i, '') || `Case ${c.case_id}`)}
                      </p>
                      <p className="text-[9px] text-text-muted truncate mt-0.5">
                        {c.news_summary || c.summary || ''}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-text-secondary tabular-nums font-[var(--font-family-mono)] flex-shrink-0">
                      {c.total_value_mxn ? formatCompactMXN(c.total_value_mxn) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Value at risk footer */}
            {summary.total_value_at_risk > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                <Zap className="h-3 w-3 text-accent" />
                <span className="text-[10px] text-text-muted">
                  {t('totalValueAtRisk')}{' '}
                  <strong className="text-text-secondary">{formatCompactMXN(summary.total_value_at_risk)}</strong>
                </span>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
})

export default Dashboard
