import React, { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEntityDrawer } from '@/contexts/EntityDrawerContext'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatCompactUSD, formatNumber, toTitleCase } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { analysisApi, investigationApi } from '@/api/client'
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
  AlertTriangle,
  Layers,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Area,
  AreaChart,
  Bar,
  Cell,
  Line,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
  Treemap,
} from '@/components/charts'
import { RISK_COLORS, SECTOR_COLORS, getSectorNameEN, CURRENT_MODEL_VERSION } from '@/lib/constants'
import { GlobalSearch } from '@/components/GlobalSearch'

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

// v5.0 model top-4 predictors (from RISK_METHODOLOGY_v5.md global model coefficients)
const AI_SIGNALS = [
  {
    icon: TrendingDown,
    coefficient: '+1.22',
    label: 'Erratic Pricing',
    description: 'Price volatility vs. sector norm',
    color: 'text-risk-critical' as const,
    border: 'border-risk-critical/20' as const,
    bg: 'bg-risk-critical/5' as const,
  },
  {
    icon: Scale,
    coefficient: '−0.85',
    label: 'Focused Buyer',
    description: 'Serves very few institutions',
    color: 'text-risk-high' as const,
    border: 'border-risk-high/20' as const,
    bg: 'bg-risk-high/5' as const,
  },
  {
    icon: Target,
    coefficient: '+0.73',
    label: 'Win Rate Spike',
    description: 'Abnormal win rate for sector',
    color: 'text-risk-medium' as const,
    border: 'border-risk-medium/20' as const,
    bg: 'bg-risk-medium/5' as const,
  },
  {
    icon: Crosshair,
    coefficient: '+0.43',
    label: 'Market Capture',
    description: 'Dominates sector spending',
    color: 'text-text-secondary' as const,
    border: 'border-border/30' as const,
    bg: 'bg-background-elevated/20' as const,
  },
]

// ============================================================================
// ERA TIMELINE — 5 administrations as proportional horizontal strip
// ============================================================================

const ERA_DATA = [
  { name: 'Fox', years: '2001–06', color: '#3b82f6', party: 'PAN', startYear: 2001, endYear: 2006 },
  { name: 'Calderón', years: '2007–12', color: '#60a5fa', party: 'PAN', startYear: 2007, endYear: 2012 },
  { name: 'Peña Nieto', years: '2013–18', color: '#22c55e', party: 'PRI', startYear: 2013, endYear: 2018 },
  { name: 'AMLO', years: '2019–24', color: '#ef4444', party: 'MORENA', startYear: 2019, endYear: 2024 },
  { name: 'Sheinbaum', years: '2025–', color: '#f97316', party: 'MORENA', startYear: 2025, endYear: 2030 },
]

const TOTAL_YEARS = 2030 - 2001

function EraTimelineStrip() {
  const [hoveredEra, setHoveredEra] = React.useState<string | null>(null)
  const currentYear = 2026

  return (
    <div className="rounded border border-border/20 overflow-hidden bg-background-elevated/10">
      {/* Color bar row */}
      <div className="flex h-2">
        {ERA_DATA.map((era) => {
          const widthPct = ((era.endYear - era.startYear) / TOTAL_YEARS) * 100
          return (
            <div
              key={era.name}
              className="relative transition-opacity duration-150"
              style={{
                width: `${widthPct}%`,
                backgroundColor: era.color,
                opacity: hoveredEra === null || hoveredEra === era.name ? 1 : 0.35,
              }}
              onMouseEnter={() => setHoveredEra(era.name)}
              onMouseLeave={() => setHoveredEra(null)}
            />
          )
        })}
      </div>
      {/* Label row */}
      <div className="flex">
        {ERA_DATA.map((era) => {
          const widthPct = ((era.endYear - era.startYear) / TOTAL_YEARS) * 100
          const isHovered = hoveredEra === era.name
          const isCurrent = era.startYear <= currentYear && currentYear < era.endYear
          const partyBg =
            era.party === 'PAN' ? 'bg-blue-500/15 text-blue-400' :
            era.party === 'PRI' ? 'bg-green-600/15 text-green-500' :
            'bg-rose-700/15 text-rose-400'
          return (
            <button
              key={era.name}
              className={cn(
                'relative flex flex-col items-start gap-0.5 px-2 py-1.5 transition-colors text-left',
                isHovered ? 'bg-background-elevated/40' : ''
              )}
              style={{ width: `${widthPct}%` }}
              onMouseEnter={() => setHoveredEra(era.name)}
              onMouseLeave={() => setHoveredEra(null)}
              aria-label={`${era.name} administration, ${era.years}, ${era.party}`}
            >
              <div className="flex items-center gap-1 min-w-0 w-full">
                <span
                  className="text-[10px] font-bold font-mono truncate"
                  style={{ color: era.color }}
                >
                  {era.name}
                </span>
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: era.color }} />
                )}
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <span className={cn('text-[9px] font-bold px-1 rounded font-mono hidden sm:block', partyBg)}>
                  {era.party}
                </span>
                <span className="text-[9px] text-text-muted font-mono hidden md:block truncate">{era.years}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// RISK GAUGE — SVG half-ring showing critical+high percentage
// ============================================================================

function RiskGauge({ criticalPct, highPct }: { criticalPct: number; highPct: number }) {
  const total = criticalPct + highPct
  const r = 76
  const cx = 100
  const cy = 90
  const strokeWidth = 14
  // semicircle: from 180° to 0° (left to right along top)
  // path for a semicircle going left to right
  const arcLength = Math.PI * r  // circumference of a half-circle

  // Convert percentage to arc offset
  const criticalLen = (criticalPct / 100) * arcLength
  const highLen = (highPct / 100) * arcLength
  const totalLen = criticalLen + highLen

  // SVG arc path for a semicircle (left to right, top half)
  // Center at (cx, cy), radius r
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  // Needle angle: 0% = leftmost (180°), 100% = rightmost (0°)
  // angle in degrees from left (180°) rotating clockwise to right (0°)
  const needleAngleDeg = 180 - (total / 100) * 180
  const needleRad = (needleAngleDeg * Math.PI) / 180
  const needleLen = r - strokeWidth / 2 - 4
  const needleX = cx + needleLen * Math.cos(needleRad)
  const needleY = cy - needleLen * Math.sin(needleRad)

  const riskLabel =
    total >= 15 ? 'ELEVATED' :
    total >= 8 ? 'MODERATE' : 'LOW'
  const riskLabelColor =
    total >= 15 ? '#f87171' :
    total >= 8 ? '#fbbf24' : '#4ade80'

  const gaugeId = 'dashboardRiskGauge'
  const gradId = `${gaugeId}-grad`

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="110" viewBox="0 0 200 110" className="overflow-visible" aria-label={`Risk gauge: ${total.toFixed(1)}% at risk`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="40%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          <style>{`
            @keyframes gaugeReveal {
              from { stroke-dashoffset: ${arcLength}px; }
            }
            .gauge-track-${gaugeId} { stroke-dasharray: ${arcLength}px; animation: gaugeReveal 1.2s ease-out forwards; }
            .gauge-high-${gaugeId} { stroke-dasharray: ${arcLength}px; animation: gaugeReveal 1.0s 0.1s ease-out forwards; }
            .gauge-crit-${gaugeId} { stroke-dasharray: ${arcLength}px; animation: gaugeReveal 0.9s 0.2s ease-out forwards; }
          `}</style>
        </defs>

        {/* Background track */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Gradient track (full) */}
        <path
          d={arcPath}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={`${arcLength}`}
          strokeDashoffset={0}
          opacity={0.18}
        />

        {/* High risk arc (orange) — starts at left, covers criticalPct+highPct */}
        <path
          d={arcPath}
          fill="none"
          stroke="#fb923c"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          className={`gauge-high-${gaugeId}`}
          style={{
            strokeDashoffset: `${arcLength - totalLen}px`,
          }}
          opacity={0.85}
        />

        {/* Critical arc (red) — starts at left, covers only criticalPct */}
        <path
          d={arcPath}
          fill="none"
          stroke="#f87171"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          className={`gauge-crit-${gaugeId}`}
          style={{
            strokeDashoffset: `${arcLength - criticalLen}px`,
          }}
          opacity={0.9}
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#e6edf3"
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.9}
        />
        <circle cx={cx} cy={cy} r={4} fill="#e6edf3" opacity={0.9} />

        {/* Center text */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fill="#e6edf3"
          fontSize={18}
          fontWeight="900"
          fontFamily="var(--font-mono, monospace)"
        >
          {total.toFixed(1)}%
        </text>
        <text
          x={cx}
          y={cy + 6}
          textAnchor="middle"
          fill={riskLabelColor}
          fontSize={8}
          fontWeight="700"
          fontFamily="var(--font-mono, monospace)"
          letterSpacing="0.1em"
        >
          {riskLabel}
        </text>

        {/* Left label: 0% */}
        <text x={cx - r - 2} y={cy + 14} textAnchor="end" fill="rgba(139,148,158,0.6)" fontSize={8} fontFamily="var(--font-mono, monospace)">0%</text>
        {/* Right label: 100% */}
        <text x={cx + r + 2} y={cy + 14} textAnchor="start" fill="rgba(139,148,158,0.6)" fontSize={8} fontFamily="var(--font-mono, monospace)">100%</text>
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#f87171' }} />
          <span className="text-[10px] text-text-muted font-mono">Critical {criticalPct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#fb923c' }} />
          <span className="text-[10px] text-text-muted font-mono">High {highPct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MINI SPARKLINE — 120×24px area chart for KPI trend embedding
// ============================================================================

function MiniSparkline({
  data,
  dataKey,
  color,
}: {
  data: Array<Record<string, number>>
  dataKey: string
  color: string
}) {
  const gradId = `spark-${dataKey}-${color.replace('#', '')}`
  return (
    <ResponsiveContainer width={120} height={24}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { open: openEntityDrawer } = useEntityDrawer()
  const { t } = useTranslation('dashboard')
  // API call 1: Fast precomputed dashboard stats
  const { data: fastDashboard, isLoading: dashLoading, error: dashError } = useQuery({
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

  // API call 5: Money flow — top institution→vendor flows (30ms, uses precomputed table)
  const { data: moneyFlowData } = useQuery({
    queryKey: ['analysis', 'money-flow', 'dashboard'],
    queryFn: () => analysisApi.getMoneyFlow(),
    staleTime: 10 * 60 * 1000,
  })

  // Model metadata — version + AUC pulled live from model_calibration table
  const { data: modelMeta } = useQuery({
    queryKey: ['analysis', 'model-metadata'],
    queryFn: () => analysisApi.getModelMetadata(),
    staleTime: 60 * 60 * 1000, // 1h — changes only after retraining
    retry: 0,
    refetchOnWindowFocus: false,
  })

  // API call 6+7 replaced: december_spike and monthly_2023 are now precomputed
  // and returned directly in the fast-dashboard response (zero extra API calls)
  const decemberSpike = fastDashboard?.december_spike as {
    average_spike_ratio: number
    years_with_significant_spike: number
    total_years_analyzed: number
    pattern_detected: boolean
    years: Array<{ year: number; spike_ratio: number; is_significant: boolean }>
  } | null | undefined
  const monthlyData = fastDashboard?.monthly_2023 as {
    months: Array<{ month: number; contracts: number; value: number }>
  } | null | undefined

  // API call 8: Top investigation case for Ground Truth "smoking gun"
  const { data: topCaseData } = useQuery({
    queryKey: ['investigation', 'top-1-dashboard'],
    queryFn: () => investigationApi.getTopCases(1),
    staleTime: 30 * 60 * 1000,
  })

  const { data: pubDelayData } = useQuery({
    queryKey: ['analysis', 'publication-delays'],
    queryFn: () => analysisApi.getPublicationDelays(),
    staleTime: 6 * 60 * 60 * 1000,
  })

  const overview = fastDashboard?.overview
  const sectors = fastDashboard?.sectors
  const riskDist = fastDashboard?.risk_distribution

  // Value concentration: % of contracts that are high/critical vs % of total value they hold
  const criticalHighContractPct = useMemo(() => {
    if (!riskDist) return 0
    return riskDist
      .filter(d => d.risk_level === 'critical' || d.risk_level === 'high')
      .reduce((s, d) => s + (d.percentage || 0), 0)
  }, [riskDist])

  const criticalHighValuePct = useMemo(() => {
    if (!riskDist) return 0
    const totalVal = riskDist.reduce((s, d) => s + (d.total_value_mxn || 0), 0)
    const flaggedVal = riskDist
      .filter(d => d.risk_level === 'critical' || d.risk_level === 'high')
      .reduce((s, d) => s + (d.total_value_mxn || 0), 0)
    return totalVal > 0 ? (flaggedVal / totalVal) * 100 : 0
  }, [riskDist])

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

  // Top 3 money flows for dashboard teaser
  const topFlows = useMemo(() => {
    if (!moneyFlowData?.flows) return []
    return [...moneyFlowData.flows]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
  }, [moneyFlowData])

  // Ground truth cases from executive API
  const corruptionCases = useMemo(() => {
    if (!execData?.ground_truth?.case_details) return []
    return execData.ground_truth.case_details
  }, [execData])

  const groundTruth = execData?.ground_truth
  const modelAuc = execData?.model?.auc ?? 0.960

  const lastUpdated = fastDashboard?.cached_at
    ? new Date(fastDashboard.cached_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-6">
      {dashError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-risk-critical/30 bg-risk-critical/5 mb-2">
          <AlertTriangle className="h-4 w-4 text-risk-critical flex-shrink-0" />
          <p className="text-sm text-risk-critical">
            Dashboard data failed to load. Some sections may be unavailable.{' '}
            <button onClick={() => window.location.reload()} className="underline hover:no-underline">
              Reload page
            </button>
          </p>
        </div>
      )}
      {/* ================================================================ */}
      {/* HERO — Two-column: value headline left + global search right    */}
      {/* ================================================================ */}
      <div className="pb-2 grid grid-cols-1 md:grid-cols-[5fr_3fr] gap-6 items-start">
      <div>
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
          <Skeleton className="h-14 w-full max-w-sm" />
        ) : (
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight leading-none">
              {formatCompactMXN(overview?.total_value_mxn || 0)}
            </h1>
            <p className="text-sm text-text-muted font-mono mt-0.5">
              ≈ {formatCompactUSD(overview?.total_value_mxn || 0)} USD
            </p>
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
        <div className="text-[11px] text-text-muted/50 font-mono mt-1">
          Risk model {modelMeta?.version ?? CURRENT_MODEL_VERSION} · AUC {modelMeta?.auc_test != null ? modelMeta.auc_test.toFixed(3) : '0.960'} · {(overview?.total_contracts || 0) > 0 ? formatNumber(overview?.total_contracts || 0) : '3,110,007'} contracts · 2002–2025
        </div>

        {/* WHAT WE FOUND — three anchor claims before the user scrolls */}
        {overview && (
          <div className="mt-3 pt-2.5 border-t border-border/20 space-y-1.5">
            <button onClick={() => navigate('/contracts?is_direct_award=true')} className="flex items-baseline gap-2.5 hover:opacity-80 transition-opacity">
              <span className="text-sm font-black font-mono text-risk-high tabular-nums min-w-[3rem]">
                {`${(overview.direct_award_pct || 0).toFixed(0)}%`}
              </span>
              <span className="text-[11px] text-text-muted">of contracts bypass competitive bidding</span>
            </button>
            <button onClick={() => navigate('/administrations')} className="flex items-baseline gap-2.5 hover:opacity-80 transition-opacity">
              <span className="text-sm font-black font-mono text-risk-medium tabular-nums min-w-[3rem]">
                {decemberSpike ? `${decemberSpike.average_spike_ratio.toFixed(2)}×` : '1.33×'}
              </span>
              <span className="text-[11px] text-text-muted">more contracts awarded in December vs. monthly average</span>
            </button>
            <button onClick={() => navigate('/contracts?risk_level=critical&risk_level=high')} className="flex items-baseline gap-2.5 hover:opacity-80 transition-opacity">
              <span className="text-sm font-black font-mono text-risk-critical tabular-nums min-w-[3rem]">
                {criticalHighValuePct > 0 ? `${criticalHighValuePct.toFixed(1)}%` : '~8%'}
              </span>
              <span className="text-[11px] text-text-muted">of total contract value linked to high/critical risk</span>
            </button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN — Search */}
      <div className="md:pt-8">
        <p className="text-xs text-text-muted mb-2 font-mono uppercase tracking-wider">Investigate an entity</p>
        <GlobalSearch />
      </div>
      </div>

      {/* ================================================================ */}
      {/* DATA QUALITY — Compact transparency strip                       */}
      {/* ================================================================ */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded border border-border/20 bg-background-elevated/10">
        <Shield className="h-3 w-3 text-text-muted flex-shrink-0" />
        <span className="text-[11px] font-bold tracking-wider uppercase text-text-muted font-mono">{t('dataQualityLabel')}</span>
        <span className="text-border text-[11px]">·</span>
        <span className="text-[11px] text-text-muted font-mono">2002–10 <span className="text-risk-medium">0.1% RFC</span></span>
        <span className="text-border text-[11px]">·</span>
        <span className="text-[11px] text-text-muted font-mono">2010–22 <span className="text-text-secondary">15–30% RFC</span></span>
        <span className="text-border text-[11px]">·</span>
        <span className="text-[11px] text-text-muted font-mono">2023–25 <span className="text-risk-low">47% RFC</span></span>
        <button
          onClick={() => navigate('/limitations')}
          className="ml-auto text-[11px] text-accent flex items-center gap-0.5 hover:underline font-mono"
        >
          See limitations <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>

      {/* ================================================================ */}
      {/* PUBLICATION TRANSPARENCY — compact inline card                  */}
      {/* ================================================================ */}
      {pubDelayData && (
        <div className="flex items-center gap-3 flex-wrap px-3 py-2 rounded border border-border/20 bg-background-elevated/10">
          <Activity className="h-3 w-3 text-text-muted flex-shrink-0" />
          <span className="text-[11px] font-bold tracking-wider uppercase text-text-muted font-mono">Publication Delay</span>
          <span className="text-border text-[11px]">·</span>
          <span className="text-[11px] text-text-muted font-mono">
            avg <span className={pubDelayData.avg_delay_days > 30 ? 'text-risk-medium' : 'text-text-secondary'}>{pubDelayData.avg_delay_days.toFixed(0)} days</span>
          </span>
          <span className="text-border text-[11px]">·</span>
          <span className="text-[11px] text-text-muted font-mono">
            <span className={pubDelayData.timely_pct < 20 ? 'text-risk-high' : pubDelayData.timely_pct < 50 ? 'text-risk-medium' : 'text-risk-low'}>{pubDelayData.timely_pct.toFixed(0)}%</span> published within 7 days
          </span>
          <span className="text-border text-[11px]">·</span>
          <span className="text-[11px] text-text-muted font-mono">
            {pubDelayData.distribution.find(d => d.label === '>90 days')?.pct.toFixed(0)}% delayed {'>'}90 days
          </span>
          <button
            onClick={() => navigate('/administrations')}
            className="ml-auto text-[11px] text-accent flex items-center gap-0.5 hover:underline font-mono"
          >
            Explore cycles <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* ERA TIMELINE — 5 administration segments */}
      {/* ================================================================ */}
      <EraTimelineStrip />

      {/* ================================================================ */}
      {/* THREE SYSTEMIC PATTERNS — AI-found structural failures          */}
      {/* ================================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Radar className="h-4 w-4 text-risk-high" />
          <span className="text-xs font-bold tracking-wider uppercase text-risk-high font-mono">
            {t('systemicPatternsLabel')}
          </span>
        </div>
        <h2 className="text-xl font-black text-text-primary mb-1">
          {t('systemicPatternsTitle')}
        </h2>
        <p className="text-sm text-text-muted mb-4">
          {t('systemicPatternsDesc')}
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
              <span className="text-xs font-bold tracking-wider uppercase text-risk-high font-mono">{t('directAwardCardLabel')}</span>
            </div>
            <div>
              <p className="text-3xl font-black text-text-primary tabular-nums font-mono">
                {overview ? `${(overview.direct_award_pct || 0).toFixed(0)}%` : '—'}
              </p>
              <p className="text-sm text-text-secondary mt-1">{t('directAwardCardDesc')}</p>
              <p className="text-xs text-text-muted mt-1 font-mono">{t('oecdDirectAward')}</p>
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
              <span className="text-xs font-bold tracking-wider uppercase text-risk-critical font-mono">{t('singleBidCardLabel')}</span>
            </div>
            <div>
              <p className="text-3xl font-black text-text-primary tabular-nums font-mono">
                {overview ? `${(overview.single_bid_pct || 0).toFixed(0)}%` : '—'}
              </p>
              <p className="text-sm text-text-secondary mt-1">{t('singleBidCardDesc')}</p>
              <p className="text-xs text-text-muted mt-1 font-mono">{t('singleBidEffective')}</p>
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
              <span className="text-xs font-bold tracking-wider uppercase text-risk-medium font-mono">{t('decemberRushCardLabel')}</span>
            </div>
            <div>
              <p className="text-3xl font-black text-text-primary tabular-nums font-mono">
                {decemberSpike ? `${decemberSpike.average_spike_ratio.toFixed(1)}x` : '—'}
              </p>
              <p className="text-sm text-text-secondary mt-1">{t('decemberSpikeRatio')}</p>
              {monthlyData ? (
                <div className="mt-2">
                  <div className="h-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData.months} barCategoryGap="8%" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Bar dataKey="contracts" radius={[2, 2, 0, 0]}>
                          {monthlyData.months.map((entry: { month: number }) => (
                            <Cell
                              key={entry.month}
                              fill={entry.month === 12 ? RISK_COLORS.medium : 'rgba(255,255,255,0.12)'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-text-muted font-mono text-center">
                    {t('contractsPerMonth2023')}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-text-muted mt-1 font-mono">
                  {decemberSpike
                    ? t('decemberSpikeYears', { significant: decemberSpike.years_with_significant_spike, total: decemberSpike.total_years_analyzed })
                    : t('yearEndBudgetDump')}
                </p>
              )}
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-text-muted group-hover:text-accent transition-colors" />
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* TRANSPARENCY CONTEXT — CompraNet abolished, INAI eliminated    */}
      {/* ================================================================ */}
      <div className="rounded-lg border border-border/40 bg-background-card/50 p-5">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded bg-border/20 shrink-0 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-text-muted" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wider uppercase text-text-muted font-mono mb-1">
              {t('compranetContextLabel')}
            </p>
            <p className="text-sm font-semibold text-text-primary mb-2">
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
                className="text-xs text-accent flex items-center gap-1 ml-auto"
              >
                {t('compranetContextLink')} <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* HOW THE AI WORKS — Top 4 v5.0 model predictors                */}
      {/* ================================================================ */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Radar className="h-4 w-4 text-accent" />
                <h2 className="text-base font-bold text-text-primary">{t('howAiWorks')}</h2>
              </div>
              <p className="text-xs text-text-muted">
                {t('howAiWorksDesc')}
              </p>
            </div>
            <button
              onClick={() => navigate('/methodology')}
              className="text-xs text-accent flex items-center gap-1"
            >
              {t('fullMethodologyLink')} <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            {AI_SIGNALS.map((signal) => (
              <div key={signal.label} className={cn('rounded-lg border p-3', signal.border, signal.bg)}>
                <div className="flex items-center gap-2 mb-2">
                  <signal.icon className={cn('h-3.5 w-3.5', signal.color)} />
                  <span className={cn('text-lg font-black tabular-nums font-mono leading-none', signal.color)}>
                    {signal.coefficient}
                  </span>
                </div>
                <p className="text-sm font-bold text-text-primary leading-tight">{signal.label}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{signal.description}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-text-muted mt-3 font-mono">
            Coefficient = log-odds contribution to corruption probability. v5.0 · Train AUC 0.967 · Test AUC 0.960
          </p>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* VALUE CONCENTRATION — The 7.9% that holds the money           */}
      {/* ================================================================ */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Concentration paradox */}
        <div className="rounded-lg border border-risk-critical/20 bg-risk-critical/5 px-5 py-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-risk-critical" />
            <span className="text-xs font-bold tracking-wider uppercase text-risk-critical font-mono">
              {t('valueConcentrationLabel')}
            </span>
          </div>
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <div>
              <p className="text-[10px] text-text-muted font-mono uppercase tracking-wide mb-0.5">{t('valueConcentrationShareContracts')}</p>
              <p className="text-4xl font-black text-text-primary tabular-nums font-mono">
                {dashLoading ? '—' : `${criticalHighContractPct.toFixed(1)}%`}
              </p>
            </div>
            <ArrowRight className="h-6 w-6 text-risk-critical flex-shrink-0" />
            <div>
              <p className="text-[10px] text-text-muted font-mono uppercase tracking-wide mb-0.5">{t('valueConcentrationShareValue')}</p>
              <p className="text-4xl font-black text-risk-critical tabular-nums font-mono">
                {dashLoading ? '—' : `${criticalHighValuePct.toFixed(1)}%`}
              </p>
            </div>
            {/* Sparkline: high-risk rate trend */}
            {riskTrajectory.length > 0 && (
              <div className="flex flex-col items-end ml-auto">
                <p className="text-[9px] text-text-muted font-mono uppercase tracking-wide mb-0.5">Risk trend</p>
                <MiniSparkline
                  data={riskTrajectory}
                  dataKey="highRiskPct"
                  color={RISK_COLORS.critical}
                />
              </div>
            )}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            {t('valueConcentrationDesc')}
          </p>
          <button
            onClick={() => navigate('/contracts?risk_level=critical')}
            className="mt-2 text-xs text-accent flex items-center gap-1"
          >
            {t('viewCriticalContracts')} <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        {/* Where the Money Goes */}
        <div className="rounded-lg border border-border/40 bg-surface-card/30 px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-accent" />
              <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
                {t('whereTheMoneyGoes')}
              </span>
            </div>
            <button
              onClick={() => navigate('/categories')}
              className="text-xs text-accent flex items-center gap-1"
            >
              {t('fullBreakdown')} <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <p className="text-xs text-text-muted mb-3">{t('whereMoneyGoesSubDesc')}</p>
          {!moneyFlowData ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : (
            <div className="space-y-1">
              {topFlows.map((flow, i) => {
                const riskColor =
                  (flow.avg_risk ?? 0) >= 0.50 ? 'text-risk-critical' :
                  (flow.avg_risk ?? 0) >= 0.30 ? 'text-risk-high' :
                  (flow.avg_risk ?? 0) >= 0.10 ? 'text-risk-medium' :
                  'text-risk-low'
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-background-elevated/30 transition-colors">
                    <span className="text-xs text-text-muted font-mono w-4 flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => openEntityDrawer(flow.source_id, 'institution')} className="text-xs font-semibold text-text-secondary truncate block hover:text-accent transition-colors">
                        {toTitleCase(flow.source_name)}
                      </button>
                      <button onClick={() => openEntityDrawer(flow.target_id, 'vendor')} className="text-xs text-text-muted truncate block hover:text-accent transition-colors">
                        → {toTitleCase(flow.target_name)}
                      </button>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs tabular-nums font-mono text-text-secondary font-semibold">
                        {formatCompactMXN(flow.value)}
                      </p>
                      <p className="text-[10px] tabular-nums font-mono text-text-muted">
                        ≈ {formatCompactUSD(flow.value)}
                      </p>
                      {flow.avg_risk != null && (
                        <p className={cn('text-[10px] font-bold tabular-nums font-mono', riskColor)}>
                          {(flow.avg_risk * 100).toFixed(0)}% risk
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* SECTOR SPEND TREEMAP — where the money concentrates            */}
      {/* ================================================================ */}
      {sectorData.length > 0 && (
        <Card className="border-border/40">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent" />
                <span className="text-xs font-bold tracking-wider uppercase text-accent font-mono">
                  Spend by Sector
                </span>
              </div>
              <p className="text-[10px] text-text-muted font-mono">
                Size = total spend · Color = sector · Click to explore
              </p>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={sectorData.map((s) => ({
                    name: s.name,
                    size: s.totalValue,
                    riskPct: s.riskPct,
                    code: s.code,
                    id: s.id,
                  }))}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  content={({ x, y, width, height, name, code, riskPct }: {
                    x?: number; y?: number; width?: number; height?: number;
                    name?: string; code?: string; riskPct?: number
                  }) => {
                    const w = width ?? 0
                    const h = height ?? 0
                    if (w < 30 || h < 20) return <g />
                    const fill = SECTOR_COLORS[code ?? ''] ?? '#64748b'
                    return (
                      <g>
                        <rect
                          x={x} y={y} width={w} height={h}
                          style={{ fill, fillOpacity: 0.85, stroke: 'var(--color-background)', strokeWidth: 2 }}
                        />
                        {w > 60 && h > 30 && (
                          <text
                            x={(x ?? 0) + w / 2}
                            y={(y ?? 0) + h / 2 - (h > 44 ? 8 : 0)}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ fill: '#fff', fontSize: Math.min(11, w / 6), fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                          >
                            {name}
                          </text>
                        )}
                        {w > 60 && h > 44 && (
                          <text
                            x={(x ?? 0) + w / 2}
                            y={(y ?? 0) + h / 2 + 10}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ fill: 'rgba(255,255,255,0.75)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                          >
                            {(riskPct ?? 0).toFixed(1)}% high-risk
                          </text>
                        )}
                      </g>
                    )
                  }}
                  onClick={(node: { id?: number }) => {
                    if (node?.id) navigate(`/sectors/${node.id}`)
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* ADMINISTRATION REPORT CARD — 5 governments compared           */}
      {/* ================================================================ */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Scale className="h-4 w-4 text-accent" />
                <h2 className="text-base font-bold text-text-primary">{t('adminReportCardTitle')}</h2>
              </div>
              <p className="text-xs text-text-muted">{t('adminReportCardDesc')}</p>
            </div>
            <button
              onClick={() => navigate('/administrations')}
              className="text-xs text-accent flex items-center gap-1"
            >
              {t('fullBreakdown')} <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          {execLoading ? (
            <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
              {(execData?.administrations || []).map((admin) => {
                const hrColor = admin.high_risk_pct >= 10 ? 'text-risk-critical' :
                  admin.high_risk_pct >= 8 ? 'text-risk-high' :
                  admin.high_risk_pct >= 6 ? 'text-risk-medium' : 'text-risk-low'
                const partyClass = admin.party === 'PAN' ? 'bg-blue-500/15 text-blue-400' :
                  admin.party === 'PRI' ? 'bg-green-600/15 text-green-500' :
                  'bg-rose-700/15 text-rose-400'
                return (
                  <button
                    key={admin.name}
                    onClick={() => navigate('/administrations')}
                    className="flex flex-col gap-1 p-3 rounded-lg border border-border/30 hover:border-border/60 hover:bg-background-elevated/30 transition-all text-left"
                  >
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded font-mono self-start', partyClass)}>
                      {admin.party}
                    </span>
                    <p className="text-sm font-bold text-text-primary leading-tight mt-0.5">{admin.name}</p>
                    <p className="text-[9px] text-text-muted font-mono">{admin.years}</p>
                    <div className="mt-1.5 space-y-1">
                      <div>
                        <p className="text-[9px] text-text-muted font-mono">{t('adminDirectAwardShort')}</p>
                        <p className="text-base font-black tabular-nums font-mono text-risk-medium">
                          {admin.direct_award_pct.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-text-muted font-mono">{t('adminHighRiskShort')}</p>
                        <p className={cn('text-base font-black tabular-nums font-mono', hrColor)}>
                          {admin.high_risk_pct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* TOP FLAGGED VENDORS — Largest recipients with AI risk scores   */}
      {/* ================================================================ */}
      <Card className="border-border/40">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Target className="h-4 w-4 text-risk-critical" />
                <h2 className="text-base font-bold text-text-primary">{t('topVendorsByValue')}</h2>
              </div>
              <p className="text-xs text-text-muted">{t('topVendorsByValueDesc')}</p>
            </div>
            <button
              onClick={() => navigate('/network')}
              className="text-xs text-accent flex items-center gap-1"
            >
              {t('network')} <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          {execLoading ? (
            <div className="space-y-2 mt-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : (
            <div className="mt-3 space-y-0.5">
              {(execData?.top_vendors || []).map((vendor, i) => {
                const riskPct = vendor.avg_risk * 100
                const riskColor = vendor.avg_risk >= 0.50 ? 'text-risk-critical' :
                  vendor.avg_risk >= 0.30 ? 'text-risk-high' :
                  vendor.avg_risk >= 0.10 ? 'text-risk-medium' : 'text-risk-low'
                const riskBg = vendor.avg_risk >= 0.50 ? 'bg-risk-critical' :
                  vendor.avg_risk >= 0.30 ? 'bg-risk-high' :
                  vendor.avg_risk >= 0.10 ? 'bg-risk-medium' : 'bg-risk-low'
                return (
                  <button
                    key={vendor.id}
                    onClick={() => openEntityDrawer(vendor.id, 'vendor')}
                    className="flex items-center gap-2 w-full py-2 px-2 rounded hover:bg-background-elevated/30 transition-colors text-left group"
                  >
                    <span className="text-xs text-text-muted font-mono w-4 flex-shrink-0">{i + 1}</span>
                    <span className="text-sm text-text-secondary font-medium flex-1 truncate group-hover:text-text-primary transition-colors">
                      {toTitleCase(vendor.name)}
                    </span>
                    <span className="text-xs tabular-nums font-mono text-text-muted w-[72px] text-right flex-shrink-0">
                      {vendor.value_billions.toFixed(1)}B MXN
                    </span>
                    <span className="text-xs tabular-nums font-mono text-text-muted w-[52px] text-right flex-shrink-0">
                      {formatNumber(vendor.contracts)}
                    </span>
                    <div className="w-[68px] flex items-center gap-1 flex-shrink-0">
                      <div className="flex-1 h-1.5 rounded-full bg-background-elevated/50 overflow-hidden">
                        <div className={cn('h-full rounded-full', riskBg)} style={{ width: `${riskPct}%`, opacity: 0.7 }} />
                      </div>
                      <span className={cn('text-xs font-bold tabular-nums font-mono w-[30px] text-right', riskColor)}>
                        {riskPct.toFixed(0)}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
      {/* RISK DISTRIBUTION — Gauge + Full-width stacked bar             */}
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
            <div className="space-y-3">
              <div className="flex justify-center"><Skeleton className="h-28 w-48" /></div>
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Half-ring gauge */}
              <div className="flex justify-center">
                <RiskGauge
                  criticalPct={riskDist.find(d => d.risk_level === 'critical')?.percentage ?? 0}
                  highPct={riskDist.find(d => d.risk_level === 'high')?.percentage ?? 0}
                />
              </div>
              {/* Stacked bar */}
              <RiskDistributionBar data={riskDist} />
            </div>
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
          {/* SMOKING GUN — one concrete high-risk investigation lead */}
          {topCaseData?.data?.[0] && (() => {
            const lead = topCaseData.data[0] as Record<string, unknown>
            const riskPct = ((Number(lead.avg_risk_score) || Number(lead.suspicion_score) || 0) * 100).toFixed(0)
            return (
              <div className="mt-3 mb-1 pt-3 border-t border-border/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono mb-2">
                  {t('smokingGunLabel')}
                </p>
                <button
                  onClick={() => navigate('/investigation')}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-risk-critical/20 bg-risk-critical/5 hover:bg-risk-critical/10 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {toTitleCase(String(lead.title || lead.vendor_name || 'Unknown Vendor'))}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatCompactMXN(Number(lead.total_value || 0))}
                      {lead.sector_id ? ` · Sector ${lead.sector_id}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-black tabular-nums font-mono text-risk-critical">{riskPct}%</p>
                    <p className="text-[10px] text-text-muted font-mono">
                      {Number(lead.total_contracts || 0).toLocaleString()} contracts
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors flex-shrink-0" />
                </button>
              </div>
            )
          })()}

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
        <h2 className="text-base font-bold text-text-primary mb-1">{t('startInvestigating')}</h2>
        <p className="text-xs text-text-muted mb-3">
          {t('startInvestigatingDesc')}
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
              <span className="text-sm font-bold text-text-primary">{t('followTheMoney')}</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('followTheMoneyDesc')}
            </p>
            <div className="flex items-center gap-1 text-xs text-accent font-medium">
              {t('exploreCategories')} <ArrowRight className="h-3 w-3" />
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
              <span className="text-sm font-bold text-text-primary">{t('searchAnyContract')}</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('searchAnyContractDesc')}
            </p>
            <div className="flex items-center gap-1 text-xs text-accent font-medium">
              {t('openContractSearch')} <ArrowRight className="h-3 w-3" />
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
              <span className="text-sm font-bold text-text-primary">{t('openInvestigation')}</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('openInvestigationDesc')}
            </p>
            <div className="flex items-center gap-1 text-xs text-accent font-medium">
              {t('openCaseManager')} <ArrowRight className="h-3 w-3" />
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
            <div className="w-[68px] text-right flex-shrink-0">
              <span className="text-xs text-text-muted tabular-nums font-mono block">
                {sector.valueAtRisk > 0 ? formatCompactMXN(sector.valueAtRisk) : '—'}
              </span>
              {sector.valueAtRisk > 0 && (
                <span className="text-[9px] text-text-muted/60 tabular-nums font-mono block">
                  ≈{formatCompactUSD(sector.valueAtRisk)}
                </span>
              )}
            </div>
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
