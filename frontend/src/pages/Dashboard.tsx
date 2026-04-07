import React, { memo, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { motion, type Variants, useInView, useReducedMotion } from 'framer-motion'
// animations.ts: staggerContainer replaced by inline fernStaggerContainer
import { ScrollReveal, useCountUp } from '@/hooks/useAnimations'
import { PulseRing } from '@/components/ui/CinematicComponents'
import { Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useTranslation } from 'react-i18next'
import { useEntityDrawer } from '@/contexts/EntityDrawerContext'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCompactMXN, formatNumber, toTitleCase } from '@/lib/utils'
// RiskScoreDisclaimer import removed — distribution section removed
import RedaccionWidget from '@/components/ui/RedaccionWidget'
import StoryInfographic from '@/components/ui/StoryInfographic'
import { analysisApi, investigationApi, phiApi, ariaApi } from '@/api/client'
import type { AriaQueueItem, FastDashboardData } from '@/api/types'
import type { ExecutiveCaseDetail } from '@/api/types'
import {
  ArrowRight,
  ArrowUpRight,
  Shield,
  Target,
  Search,
  Crosshair,
  Activity,
  TrendingDown,
  TrendingUp,
  FileSearch,
  AlertTriangle,
  Layers,
  BarChart3,
  Users,
  Gauge,
  Calendar,
  Scissors,
} from 'lucide-react'
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  ComposedChart,
  ReferenceLine,
  ReferenceArea,
} from '@/components/charts'
import { RISK_COLORS, SECTOR_COLORS, getSectorNameEN, CURRENT_MODEL_VERSION } from '@/lib/constants'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { AnomalyLeadsWidget } from '@/components/widgets/AnomalyLeadsWidget'
import { PoliticalIntelligenceStrip } from '@/components/widgets/PoliticalIntelligenceStrip'
import SectorConcentrationChart from '@/components/charts/SectorConcentrationChart'

// ============================================================================
// Dashboard 2.0: Situation Room
//
// Layout:
// 1. LIVE ALERT BANNER (critical vendors detected)
// 2. HEADLINE ROW: 4 KPI cards
// 3. RISK DISTRIBUTION (Donut) + TOP RISK SECTORS (Horizontal bar)
// 4. TEMPORAL TREND (full-width area chart)
// 5. TOP VENDORS AT RISK + RECENT HIGH-RISK CONTRACTS
// 6. SECTOR GRID: 12 sector cards with mini sparklines
// ============================================================================

// Fern-style bold stagger for cards — y:60, scale:0.94, blur:4px, spring easing
const fernStaggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.10, delayChildren: 0.08 } },
}
const fernStaggerItem: Variants = {
  initial: { opacity: 0, y: 60, scale: 0.94, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
}

// ============================================================================
// CINEMATIC ENHANCEMENTS — Fern-style editorial components
// ============================================================================

// 1. HeroStatBar — KPI with gradient sweep animation
function HeroStatBar({ value, loading }: { value: string; loading: boolean }) {
  const { t } = useTranslation('dashboard')
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const [lineWidth, setLineWidth] = useState(0)

  useEffect(() => {
    if (isInView && !reduced) {
      const timer = setTimeout(() => setLineWidth(100), 300)
      return () => clearTimeout(timer)
    } else if (isInView && reduced) {
      setLineWidth(100)
    }
  }, [isInView, reduced])

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-xl px-5 py-4"
      style={{
        background: 'linear-gradient(135deg, rgba(10,10,10,0.97) 0%, rgba(20,10,15,0.97) 100%)',
        border: '1px solid rgba(196,30,58,0.15)',
      }}
    >
      <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-text-muted/80 uppercase mb-2">
        {t('heroHighRiskLabel')}
      </p>
      <p
        className="font-black tabular-nums leading-none tracking-tighter"
        style={{
          fontSize: 'clamp(1.4rem, 3vw, 2rem)',
          fontFamily: 'var(--font-family-mono)',
          background: reduced
            ? '#c41e3a'
            : 'linear-gradient(90deg, #c41e3a 0%, #f97316 30%, #c41e3a 60%, #f97316 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: reduced ? 'none' : 'heroGradientSweep 6s ease-in-out infinite',
        }}
      >
        {loading ? '\u2014' : value}
      </p>
      {/* Crimson line drawing from 0 to 100% */}
      <div className="mt-4 h-[2px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(196,30,58,0.1)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${lineWidth}%`,
            background: 'linear-gradient(90deg, #c41e3a, #f97316)',
            transition: reduced ? 'none' : 'width 1.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
      <style>{`
        @keyframes heroGradientSweep {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 200% center; }
        }
      `}</style>
    </motion.div>
  )
}

// 2. LiveDataPulse — Small pulsing green dot with "LIVE DATA" label
function LiveDataPulse() {
  const { t } = useTranslation('dashboard')
  return (
    <PulseRing
      color="#22c55e"
      size={8}
      label={t('liveData')}
      className="ml-2"
    />
  )
}

// 3. RiskDistributionBar — Horizontal bar with staggered fill animation
function RiskDistributionBar({ data }: {
  data: Array<{ risk_level: string; percentage: number; count: number }>
}) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  const levels = useMemo(() => {
    const order = ['critical', 'high', 'medium', 'low'] as const
    const colors: Record<string, string> = {
      critical: '#f87171',
      high: '#fb923c',
      medium: '#fbbf24',
      low: '#4ade80',
    }
    return order.map((level, i) => {
      const item = data.find(d => d.risk_level === level)
      return {
        level,
        label: level.charAt(0).toUpperCase() + level.slice(1),
        pct: item?.percentage ?? 0,
        count: item?.count ?? 0,
        color: colors[level],
        delay: i * 200,
      }
    }).filter(d => d.pct > 0)
  }, [data])

  return (
    <div ref={ref} className="space-y-2">
      {/* Labels row */}
      <div className="flex" style={{ gap: '2px' }}>
        {levels.map(l => (
          <div key={l.level} className="text-center" style={{ width: `${l.pct}%`, minWidth: l.pct > 3 ? '40px' : '0' }}>
            {l.pct > 3 && (
              <>
                <p className="text-[10px] font-mono font-bold tabular-nums" style={{ color: l.color }}>
                  {l.pct.toFixed(1)}%
                </p>
                <p className="text-[8px] font-mono text-text-muted uppercase tracking-wider">
                  {l.label}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
      {/* Bar */}
      <div className="flex h-5 rounded-lg overflow-hidden" style={{ gap: '2px', background: 'rgba(255,255,255,0.03)' }}>
        {levels.map(l => (
          <div
            key={l.level}
            className="h-full rounded-sm relative overflow-hidden"
            style={{
              width: isInView ? `${l.pct}%` : '0%',
              backgroundColor: l.color,
              opacity: 0.85,
              transition: reduced ? 'none' : `width 700ms cubic-bezier(0.34, 1.56, 0.64, 1) ${l.delay}ms`,
              minWidth: isInView && l.pct > 0 ? '2px' : '0',
            }}
          >
            {/* Shimmer overlay */}
            {isInView && !reduced && (
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                  animation: `shimmerSweep 0.8s ease-out ${l.delay + 700}ms forwards`,
                  opacity: 0,
                  animationFillMode: 'forwards',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// 4. SectionDivider — Thin animated line that draws left-to-right on scroll
function SectionDivider() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })

  return (
    <div ref={ref} className="py-1">
      <div className="h-[1px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(196,30,58,0.08)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: isInView ? '100%' : '0%',
            background: 'linear-gradient(90deg, #c41e3a 0%, #f97316 50%, transparent 100%)',
            transition: reduced ? 'none' : 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  )
}


// DONUT_COLORS removed — distribution section removed

// ============================================================================
// SECTORS BY VALUE CHART — Horizontal bar chart, top 8 sectors by total value
// ============================================================================

interface SectorsByValueChartProps {
  sectors: Array<{ name: string; code: string; totalValue: number }>
  loading: boolean
}

function SectorsByValueChart({ sectors, loading }: SectorsByValueChartProps) {
  const { t } = useTranslation('dashboard')

  const chartData = useMemo(() => {
    return [...sectors]
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 8)
      .map((s) => ({
        name: s.name,
        code: s.code,
        value: s.totalValue,
        fill: SECTOR_COLORS[s.code] ?? '#64748b',
      }))
  }, [sectors])

  if (loading) {
    return (
      <div className="rounded-xl border border-border/30 bg-background-card/60 p-4">
        <Skeleton className="h-4 w-44 mb-4" />
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
    )
  }

  if (chartData.length === 0) return null

  return (
    <div className="rounded-xl border border-border/30 bg-background-card/60 p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
          {t('sectorsByValueTitle', 'Sectors by Contract Value')}
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            horizontal={false}
          />
          <XAxis
            type="number"
            dataKey="value"
            tickFormatter={(v: number) => formatCompactMXN(v)}
            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{
              background: 'rgba(15,15,20,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '11px',
              fontFamily: 'var(--font-family-mono)',
              color: '#e2e8f0',
            }}
            formatter={(v: number | undefined) => [v != null ? formatCompactMXN(v) : '—', t('barChartTotalValue')]}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false}>
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
  )
}

// ============================================================================
// RISK FILTER CHIPS — removed from render; kept as dead code reference
// Uncomment and wire into dashboard state when filter functionality is needed
// ============================================================================

/*
 * RiskFilterChips — removed from render, not wired to any state.
 * Restore when dashboard gets global risk-level filtering.
 */

// ============================================================================
// MINI SPARKLINE — 120x24px area chart for KPI trend embedding
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
    <div role="img" aria-label={`Mini sparkline trend chart for ${dataKey}`}>
    <ResponsiveContainer width="100%" height={24}>
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
    </div>
  )
}

// ============================================================================
// KPI CARD — Large number, label, trend indicator, colored glow
// ============================================================================

interface KPICardProps {
  label: string
  value: string
  sublabel: string
  color: string
  loading: boolean
  icon: React.ElementType
  trend?: { direction: 'up' | 'down' | 'neutral'; label: string }
  onClick?: () => void
  sparkData?: Array<Record<string, number>>
  sparkKey?: string
}

// Animated KPI number — count-up + number-pop on scroll
function KPINumber({ value, color }: { value: string; color: string }) {
  // Extract numeric portion for count-up
  const match = value.match(/^([\d,.]+)(.*)$/)
  const numStr = match ? match[1].replace(/,/g, '') : null
  const suffix = match ? match[2] : ''
  const numVal = numStr ? parseFloat(numStr) : null
  const decimals = numStr && numStr.includes('.') ? (numStr.split('.')[1]?.length ?? 0) : 0

  const { ref, value: animVal } = useCountUp(numVal ?? 0, 1400, decimals)

  if (numVal == null) {
    // Non-numeric value, just render directly
    return (
      <p
        className="text-xl font-black tabular-nums leading-none tracking-tight transition-colors font-mono"
        style={{ color, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
    )
  }

  // Format with commas
  const formatted = decimals > 0
    ? animVal.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : animVal.toLocaleString('en-US')

  return (
    <p
      className="text-[2.5rem] font-black tabular-nums leading-none tracking-tight transition-colors"
      style={{ color, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }}
    >
      <span ref={ref}>{formatted}</span>{suffix}
    </p>
  )
}

const KPICard = memo(function KPICard({
  label, value, sublabel, color, loading, icon: Icon, trend, onClick, sparkData, sparkKey,
}: KPICardProps) {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fern-card relative flex flex-col justify-between p-4 text-left overflow-hidden group',
        onClick && 'cursor-pointer',
        !onClick && 'cursor-default',
      )}
      style={{
        borderTopColor: color,
        borderTopWidth: '3px',
        transform: isHovered && onClick ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isHovered && onClick ? `0 0 24px 2px ${color}25, 0 0 48px 4px ${color}10` : 'none',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
      }}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-text-muted font-mono leading-none">
          {label}
        </p>
        <Icon className="h-4 w-4 text-text-muted/50" />
      </div>
      {loading ? (
        <Skeleton className="h-10 w-28 mb-2" />
      ) : (
        <KPINumber value={value} color={color} />
      )}
      <div className="flex items-center justify-between mt-3 gap-2">
        <p className="text-[10px] text-text-muted leading-tight flex-1">{sublabel}</p>
        {trend && (
          <span className={cn(
            'text-[10px] font-bold font-mono tabular-nums flex items-center gap-0.5 flex-shrink-0',
            trend.direction === 'up' ? 'text-risk-critical' : trend.direction === 'down' ? 'text-risk-low' : 'text-text-muted'
          )}>
            {trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : trend.direction === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
            {trend.label}
          </span>
        )}
        {sparkData && sparkKey && (
          <div className="flex-shrink-0">
            <MiniSparkline data={sparkData} dataKey={sparkKey} color={color} />
          </div>
        )}
      </div>
      {/* Hover brightening */}
      {onClick && (
        <div className="absolute inset-0 bg-background-card/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
    </button>
  )
})

// ============================================================================
// ALERT BANNER — Shows when critical vendors are present
// ============================================================================

function AlertBanner({ criticalCount, onClick }: { criticalCount: number; onClick: () => void }) {
  const { t } = useTranslation('dashboard')
  if (criticalCount === 0) return null
  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-3.5 rounded-lg border-l-4 border-l-accent border border-accent/15 bg-accent/5 hover:bg-accent/10 transition-all text-left group"
    >
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-risk-critical animate-pulse" />
        <AlertTriangle className="h-4 w-4 text-risk-critical" />
      </div>
      <p className="text-sm text-risk-critical font-medium flex-1">
        {t('criticalContractsDetected', { num: formatNumber(criticalCount) })}
      </p>
      <ArrowUpRight className="h-4 w-4 text-risk-critical opacity-60 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  )
}


// TopRiskSectorsBar removed — sector intelligence section removed from dashboard

// ============================================================================
// RISK TRAJECTORY CHART — Full-width area chart with administration bands
// ============================================================================

const ADMINISTRATIONS = [
  { name: 'Fox', start: 2000, end: 2006, color: '#3b82f6' },
  { name: 'Calderon', start: 2006, end: 2012, color: '#8b5cf6' },
  { name: 'Pena Nieto', start: 2012, end: 2018, color: '#16a34a' },
  { name: 'AMLO', start: 2018, end: 2024, color: '#f97316' },
  { name: 'Sheinbaum', start: 2024, end: 2030, color: '#dc2626' },
]

interface RiskTrajectoryChartProps {
  data: Array<{ year: number; highRiskPct: number; avgRisk: number; contracts: number; directAwardPct?: number }>
  sectorTrajectory?: Array<{ year: number; highRiskPct: number; avgRisk: number; contracts: number }>
  sectorColor?: string
  yearlyTrends?: Array<{ year: number; avg_risk: number; risk_stddev?: number; direct_award_pct?: number }>
  onYearClick?: (year: number) => void
}

const RiskTrajectoryChart = memo(function RiskTrajectoryChart({
  data,
  sectorTrajectory,
  sectorColor,
  yearlyTrends,
  onYearClick,
}: RiskTrajectoryChartProps) {
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation('common')

  const hasSectorOverlay = sectorTrajectory !== undefined && sectorTrajectory.length > 0

  const mergedData = useMemo(() => {
    if (!hasSectorOverlay) return data
    const sectorMap = new Map(sectorTrajectory.map((d) => [d.year, d.highRiskPct]))
    return data.map((row) => ({
      ...row,
      sectorHighRiskPct: sectorMap.get(row.year) ?? null,
    }))
  }, [data, sectorTrajectory, hasSectorOverlay])

  const hasStddev = yearlyTrends ? yearlyTrends.some((d) => d.risk_stddev != null) : false
  const stddevMap = useMemo(() => {
    if (!yearlyTrends || !hasStddev) return new Map<number, number>()
    return new Map(
      yearlyTrends
        .filter((d) => d.risk_stddev != null)
        .map((d) => [d.year, (d.risk_stddev as number) * 100]),
    )
  }, [yearlyTrends, hasStddev])

  const daPctMap = useMemo(() => {
    if (!yearlyTrends) return new Map<number, number>()
    return new Map(
      yearlyTrends
        .filter(d => d.direct_award_pct != null)
        .map(d => [d.year, d.direct_award_pct as number])
    )
  }, [yearlyTrends])

  const chartData = useMemo(() => {
    const base = hasStddev
      ? mergedData.map((row) => {
          const sd = stddevMap.get(row.year)
          if (sd == null) return row
          return { ...row, ciLower: Math.max(0, row.highRiskPct - sd), ciUpper: row.highRiskPct + sd }
        })
      : mergedData
    return base.map(row => ({
      ...row,
      directAwardPct: daPctMap.get(row.year) ?? undefined,
    }))
  }, [mergedData, stddevMap, hasStddev, daPctMap])

  const minYear = data.length > 0 ? data[0].year : 2010
  const maxYear = data.length > 0 ? data[data.length - 1].year : 2025
  const maxContracts = Math.max(...data.map((d) => d.contracts), 1)
  const aggregateColor = hasSectorOverlay ? 'rgba(139,148,158,0.45)' : RISK_COLORS.high

  return (
    <div
      className="h-[300px]"
      role="img"
      aria-label="Composed chart showing contract count and total value by year, with administration period bands"
    >
      <span className="sr-only">
        Composed chart showing annual contract count and total value from 2002 to 2025, with shaded regions for each presidential administration period.
      </span>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} onClick={(e: Record<string, unknown>) => {
          const label = e?.activeLabel as number | undefined
          if (label && onYearClick) onYearClick(label)
        }}>
          <defs>
            <linearGradient id="riskGradient2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={hasSectorOverlay ? 'rgba(139,148,158,0.3)' : RISK_COLORS.high} stopOpacity={hasSectorOverlay ? 0.15 : 0.4} />
              <stop offset="100%" stopColor={hasSectorOverlay ? 'rgba(139,148,158,0.1)' : RISK_COLORS.high} stopOpacity={0.02} />
            </linearGradient>
            {hasStddev && (
              <linearGradient id="ciGradient2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={RISK_COLORS.high} stopOpacity={0.12} />
                <stop offset="100%" stopColor={RISK_COLORS.high} stopOpacity={0.05} />
              </linearGradient>
            )}
          </defs>
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
                const d = payload[0].payload as {
                  year: number
                  highRiskPct: number
                  contracts: number
                  sectorHighRiskPct?: number | null
                  ciLower?: number
                  ciUpper?: number
                  directAwardPct?: number
                }
                return (
                  <div className="chart-tooltip">
                    <p className="font-bold text-sm text-text-primary">{d.year}</p>
                    <div className="space-y-0.5 mt-1">
                      <p className="text-xs text-text-muted tabular-nums">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: aggregateColor }} />
                        {t('highRiskRate')} {t('tooltipAllSuffix')}: <strong className="text-text-secondary">{(d.highRiskPct ?? 0).toFixed(1)}%</strong>
                      </p>
                      {hasSectorOverlay && d.sectorHighRiskPct != null && (
                        <p className="text-xs text-text-muted tabular-nums">
                          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: sectorColor }} />
                          {t('highRiskRate')} {t('tooltipSectorSuffix')}: <strong className="text-text-secondary">{d.sectorHighRiskPct.toFixed(1)}%</strong>
                        </p>
                      )}
                      {hasStddev && d.ciLower != null && d.ciUpper != null && (
                        <p className="text-xs text-text-muted/70 tabular-nums">
                          CI: [{d.ciLower.toFixed(1)}%--{d.ciUpper.toFixed(1)}%]
                        </p>
                      )}
                      {d.directAwardPct != null && (
                        <p className="text-xs text-text-muted tabular-nums">
                          <span className="inline-block w-2.5 h-0.5 rounded mr-1.5" style={{ backgroundColor: '#f97316', borderTop: '1.5px dashed #f97316' }} />
                          {t('tooltipDirectAward')}: <strong className="text-text-secondary">{d.directAwardPct.toFixed(1)}%</strong>
                        </p>
                      )}
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
          <ReferenceLine
            x={2020}
            yAxisId="left"
            stroke={RISK_COLORS.critical}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'COVID-19', position: 'insideTopRight', fontSize: 10, fill: RISK_COLORS.critical }}
          />
          <Bar
            yAxisId="right"
            dataKey="contracts"
            fill="var(--color-text-muted)"
            fillOpacity={0.15}
            radius={[2, 2, 0, 0]}
            barSize={16}
          />
          {hasStddev && (
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="ciUpper"
              stroke="none"
              fill={RISK_COLORS.high}
              fillOpacity={0.10}
              dot={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
              connectNulls
            />
          )}
          {hasStddev && (
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="ciLower"
              stroke="none"
              fill="var(--color-background-base)"
              fillOpacity={1}
              dot={false}
              activeDot={false}
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
              connectNulls
            />
          )}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="highRiskPct"
            stroke={aggregateColor}
            strokeWidth={hasSectorOverlay ? 1.5 : 2}
            fill="url(#riskGradient2)"
            dot={false}
            activeDot={hasSectorOverlay ? false : { r: 4, stroke: RISK_COLORS.high, strokeWidth: 2, fill: 'var(--color-background-base)' }}
            strokeDasharray={hasSectorOverlay ? '4 3' : undefined}
          />
          {hasSectorOverlay && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sectorHighRiskPct"
              stroke={sectorColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, stroke: sectorColor, strokeWidth: 2, fill: 'var(--color-background-base)' }}
              connectNulls
            />
          )}
          {/* Direct award rate overlay */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="directAwardPct"
            stroke="#f97316"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 3, stroke: '#f97316', strokeWidth: 2, fill: 'var(--color-background-base)' }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-1 flex-wrap">
        {hasSectorOverlay ? (
          <>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded" style={{ backgroundColor: sectorColor }} />
              <span className="text-xs text-text-muted">{t('chartLegendSector')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded opacity-50" style={{ borderTop: '1.5px dashed rgba(139,148,158,0.6)' }} />
              <span className="text-xs text-text-muted">{t('chartLegendAllSectors')}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 rounded" style={{ backgroundColor: RISK_COLORS.high }} />
            <span className="text-xs text-text-muted">{t('highRiskRate')}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-text-muted opacity-15" />
          <span className="text-xs text-text-muted">{tc('contracts')}</span>
        </div>
        {hasStddev && (
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-4 rounded-sm" style={{ backgroundColor: RISK_COLORS.high, opacity: 0.12 }} />
            <span className="text-xs text-text-muted">{t('chartLegendStdDev')}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 rounded" style={{ borderTop: '1.5px dashed #f97316' }} />
          <span className="text-xs text-text-muted">{t('chartLegendDirectAward')}</span>
        </div>
      </div>
    </div>
  )
})

// ============================================================================
// SECTOR MINI CARD — Compact card for the 12-sector grid
// ============================================================================

const GRADE_DOT_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  'S':  { text: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(52,211,153,0.25)' },
  'A':  { text: '#4ade80', bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.22)' },
  'B+': { text: '#a3e635', bg: 'rgba(132,204,22,0.10)',  border: 'rgba(163,230,53,0.22)' },
  'B':  { text: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.22)' },
  'C+': { text: '#fcd34d', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(252,211,77,0.22)' },
  'C':  { text: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)' },
  'D':  { text: '#fb923c', bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.22)' },
  'D-': { text: '#f87171', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(248,113,113,0.22)' },
  'F':  { text: '#fca5a5', bg: 'rgba(153,27,27,0.14)',   border: 'rgba(239,68,68,0.22)' },
  'F-': { text: '#fca5a5', bg: 'rgba(28,5,5,0.40)',      border: 'rgba(153,27,27,0.40)' },
}

interface SectorMiniCardProps {
  name: string
  code: string
  id: number
  contracts: number
  riskPct: number
  totalValue: number
  avgRisk: number
  directAwardPct: number
  grade?: string
  onClick: () => void
}

const SectorMiniCard = memo(function SectorMiniCard({
  name, code, contracts, riskPct, totalValue, avgRisk, grade, onClick,
}: SectorMiniCardProps) {
  const { t } = useTranslation('dashboard')
  const sectorColor = SECTOR_COLORS[code] ?? '#64748b'
  const riskColor = riskPct >= 15 ? 'text-risk-critical' : riskPct >= 10 ? 'text-risk-high' : 'text-risk-medium'
  const gc = grade ? (GRADE_DOT_COLORS[grade] ?? GRADE_DOT_COLORS['D']) : null

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-3 rounded-lg border border-border/30 bg-background-card/40 hover:border-border/60 hover:bg-background-elevated/30 transition-all text-left group"
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sectorColor }} />
          <span className="text-xs font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
            {name}
          </span>
        </div>
        {gc && grade && (
          <span
            className="text-[10px] font-black rounded px-1.5 py-0.5 flex-shrink-0 font-mono border"
            style={{ color: gc.text, backgroundColor: gc.bg, borderColor: gc.border }}
          >
            {grade}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div>
          <p className="text-[9px] text-text-muted font-mono uppercase">{t('sectorCardContracts')}</p>
          <p className="text-xs font-bold tabular-nums font-mono text-text-secondary">{formatNumber(contracts)}</p>
        </div>
        <div>
          <p className="text-[9px] text-text-muted font-mono uppercase">{t('sectorCardHighRisk')}</p>
          <p className={cn('text-xs font-bold tabular-nums font-mono', riskColor)}>{riskPct.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[9px] text-text-muted font-mono uppercase">{t('sectorCardValue')}</p>
          <p className="text-xs font-bold tabular-nums font-mono text-text-secondary">{formatCompactMXN(totalValue)}</p>
        </div>
      </div>
      {/* Mini risk bar */}
      <div className="w-full h-1 rounded-full bg-background-elevated/40 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(avgRisk * 100 * 3, 100)}%`,
            backgroundColor: sectorColor,
            opacity: 0.7,
          }}
        />
      </div>
    </button>
  )
})

// ============================================================================
// TOP VENDORS TABLE — Ranked list with risk scores
// ============================================================================

interface VendorRowData {
  id: number
  name: string
  avg_risk: number
  contracts: number
  value_billions: number
}

const TopVendorsTable = memo(function TopVendorsTable({
  vendors,
  loading,
  onVendorClick,
}: {
  vendors: VendorRowData[]
  loading: boolean
  onVendorClick: (id: number) => void
}) {
  const { t } = useTranslation('dashboard')

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9" />)}
      </div>
    )
  }

  return (
    <div>
      {/* Column headers */}
      <div className="flex items-center gap-2 px-2 mb-1">
        <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider w-5 flex-shrink-0" />
        <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider flex-1">{t('vendorHeaderName')}</span>
        <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider w-[68px] text-right flex-shrink-0">{t('vendorHeaderValue')}</span>
        <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider w-[48px] text-right flex-shrink-0">{t('vendorHeaderContracts')}</span>
        <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider w-[72px] text-right flex-shrink-0">{t('vendorHeaderRisk')}</span>
      </div>
      <div className="space-y-0.5">
      {vendors.map((vendor, i) => {
        const riskPct = vendor.avg_risk * 100
        const riskColor = vendor.avg_risk >= 0.60 ? 'text-risk-critical' :
          vendor.avg_risk >= 0.40 ? 'text-risk-high' :
          vendor.avg_risk >= 0.15 ? 'text-risk-medium' : 'text-risk-low'
        const riskBg = vendor.avg_risk >= 0.60 ? 'bg-risk-critical' :
          vendor.avg_risk >= 0.40 ? 'bg-risk-high' :
          vendor.avg_risk >= 0.15 ? 'bg-risk-medium' : 'bg-risk-low'
        return (
          <button
            key={vendor.id}
            onClick={() => onVendorClick(vendor.id)}
            className="flex items-center gap-2 w-full py-2 px-2 rounded hover:bg-background-elevated/30 transition-colors text-left group"
          >
            <span className="text-xs text-text-muted font-mono w-5 flex-shrink-0 tabular-nums">{i + 1}</span>
            <span className="text-sm text-text-secondary font-medium flex-1 truncate group-hover:text-text-primary transition-colors">
              {toTitleCase(vendor.name)}
            </span>
            <span className="text-xs tabular-nums font-mono text-text-muted w-[68px] text-right flex-shrink-0">
              {vendor.value_billions.toFixed(1)}B
            </span>
            <span className="text-xs tabular-nums font-mono text-text-muted w-[48px] text-right flex-shrink-0">
              {formatNumber(vendor.contracts)}
            </span>
            <div className="w-[72px] flex items-center gap-1 flex-shrink-0">
              <div className="flex-1 h-1.5 rounded-full bg-background-elevated/50 overflow-hidden">
                <div className={cn('h-full rounded-full', riskBg)} style={{ width: `${riskPct}%`, opacity: 0.7 }} />
              </div>
              <span className={cn('text-xs font-bold tabular-nums font-mono w-[32px] text-right', riskColor)}>
                {riskPct.toFixed(0)}%
              </span>
            </div>
          </button>
        )
      })}
      </div>
    </div>
  )
})

// ============================================================================
// GROUND TRUTH CASES — compact grid
// ============================================================================

const GroundTruthSection = memo(function GroundTruthSection({
  cases,
  loading,
  modelAuc,
  totalCases,
  onFullAnalysis,
}: {
  cases: ExecutiveCaseDetail[]
  loading: boolean
  modelAuc: number
  totalCases: number
  onFullAnalysis: () => void
}) {
  const { t } = useTranslation('dashboard')

  if (loading) {
    return (
      <div className="space-y-1.5">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-6" />)}
      </div>
    )
  }

  const filtered = [...cases]
    .filter(c => c.contracts >= 10)
    .sort((a, b) => b.high_plus_pct - a.high_plus_pct)
    .slice(0, 8)

  if (filtered.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 py-4">
          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <Shield className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary font-mono">AUC {modelAuc.toFixed(3)} · {totalCases} {t('documentedCorruptionCases')}</p>
            <p className="text-xs text-text-muted">Model validated against documented Mexican procurement corruption scandals.</p>
          </div>
        </div>
        <button onClick={onFullAnalysis} className="text-xs text-accent hover:underline font-mono flex items-center gap-1">
          {t('fullAnalysis')} <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="text-[10px] font-mono text-text-muted flex-1">{t('caseColumnLabel')}</span>
        <span className="text-[10px] font-mono text-text-muted w-[100px]">{t('detectionRate')}</span>
        <span className="text-[10px] font-mono text-text-muted w-10 text-right">%</span>
      </div>
      <div className="space-y-1">
        {filtered.map(c => {
          const pct = c.high_plus_pct
          const barColor =
            pct >= 90 ? '#4ade80' :
            pct >= 50 ? '#fbbf24' :
            '#f87171'
          const textColor =
            pct >= 90 ? 'text-green-400' :
            pct >= 50 ? 'text-amber-400' :
            'text-red-400'
          const truncatedName = c.name.length > 28 ? c.name.slice(0, 28) + '...' : c.name
          return (
            <div
              key={c.name}
              className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-background-elevated/20 transition-colors"
              title={`${c.name}: ${pct.toFixed(0)}% detected (${formatNumber(c.contracts)} contracts, avg score ${c.avg_score.toFixed(2)})`}
            >
              <span className="text-[11px] text-text-secondary flex-1 truncate font-mono">{truncatedName}</span>
              <div className="w-[100px] h-1.5 rounded-full bg-background-elevated/50 overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor, opacity: 0.8 }}
                />
              </div>
              <span className={cn('text-[11px] font-black font-mono tabular-nums w-10 text-right shrink-0', textColor)}>
                {pct.toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-[10px] text-text-muted font-mono">
          AUC {modelAuc.toFixed(3)} | {totalCases} {t('documentedCorruptionCases')}
        </p>
        <button onClick={onFullAnalysis} className="text-[10px] text-accent hover:underline font-mono flex items-center gap-0.5">
          {t('fullAnalysis')} <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
})

// ============================================================================
// RISK TICKER STRIP — Bloomberg-style scrolling vendor alerts
// ============================================================================

const PATTERN_COLORS: Record<string, string> = {
  P1: '#dc2626', P2: '#8b5cf6', P3: '#f97316', P6: '#eab308', P7: '#3b82f6',
}

function RiskTicker() {
  const { t } = useTranslation('dashboard')
  const { data: ariaData } = useQuery({
    queryKey: ['aria', 'queue', 'ticker'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 15 }),
    staleTime: 5 * 60 * 1000,
  })

  const items = useMemo(() => {
    if (!ariaData?.data || ariaData.data.length === 0) return null
    return ariaData.data.map((v: AriaQueueItem) => ({
      name: v.vendor_name,
      score: v.ips_final.toFixed(3),
      amount: formatCompactMXN(v.total_value_mxn),
      sector: (v.primary_sector_name ?? 'N/A').toUpperCase(),
      pattern: v.primary_pattern ?? '',
      level: v.avg_risk_score >= 0.60 ? 'critical' as const : 'high' as const,
    }))
  }, [ariaData])

  if (!items) {
    return (
      <div
        style={{
          overflow: 'hidden',
          borderTop: '1px solid rgba(196,30,58,0.3)',
          borderBottom: '1px solid rgba(196,30,58,0.3)',
          background: 'rgba(10,10,10,0.95)',
          padding: '6px 0',
          textAlign: 'center',
        }}
        role="marquee"
        aria-label="High-risk vendor alerts"
      >
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          {t('ariaTickerLoading')}
        </span>
      </div>
    )
  }

  const doubled = [...items, ...items]
  return (
    <div
      style={{
        overflow: 'hidden',
        borderTop: '1px solid rgba(196,30,58,0.3)',
        borderBottom: '1px solid rgba(196,30,58,0.3)',
        background: 'rgba(10,10,10,0.95)',
        padding: '6px 0',
      }}
      role="marquee"
      aria-label="High-risk vendor alerts"
    >
      <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'tickerScroll 80s linear infinite' }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '48px' }}>
            <span style={{ color: '#c41e3a', fontSize: '9px', fontWeight: 700 }}>&#9650; {t('ariaRisk')}</span>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', fontFamily: 'monospace' }}>{item.name}</span>
            <span style={{ color: item.level === 'critical' ? '#ef4444' : '#f97316', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>{item.score}</span>
            {item.pattern && (
              <span style={{
                fontSize: '8px', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'monospace',
                padding: '1px 4px', borderRadius: '3px',
                backgroundColor: `${PATTERN_COLORS[item.pattern] ?? '#64748b'}30`,
                color: PATTERN_COLORS[item.pattern] ?? '#64748b',
              }}>{item.pattern}</span>
            )}
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>&#183;</span>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px' }}>{item.amount}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>&#183;</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', letterSpacing: '0.08em' }}>{item.sector}</span>
            <span style={{ color: 'rgba(196,30,58,0.3)', marginLeft: '24px' }}>|</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// CINEMATIC DASHBOARD HERO — dark editorial hero with GSAP timeline
// ============================================================================

function DashboardCinematicHero({ overview, criticalHighContractPct, criticalCount, loading }: {
  overview: { total_contracts?: number; total_value_mxn?: number } | undefined
  criticalHighContractPct: number
  criticalCount: number
  loading: boolean
}) {
  const { t } = useTranslation('dashboard')
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!heroRef.current || loading) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from('.dash-hero-label', { opacity: 0, y: -10, duration: 0.4 })
        .from('.dash-hero-headline', { opacity: 0, y: 50, duration: 0.9, ease: 'power4.out' }, '-=0.2')
        .from('.dash-hero-stat', { opacity: 0, y: 20, duration: 0.5, stagger: 0.12 }, '-=0.5')
        .from('.dash-hero-cta', { opacity: 0, y: 10, duration: 0.4, stagger: 0.08 }, '-=0.3')
    }, heroRef)
    return () => ctx.revert()
  }, [loading])

  return (
    <div ref={heroRef} style={{
      background: 'radial-gradient(ellipse at 15% 60%, rgba(196,30,58,0.08) 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(37,99,235,0.05) 0%, transparent 55%), var(--color-background-base)',
      padding: '24px 24px 20px',
      margin: '-24px -24px 0',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: '0 0 12px 12px',
    }}>
      {/* Grid texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div className="dash-hero-label" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: '#c41e3a', marginBottom: '16px', fontFamily: 'var(--font-family-mono)' }}>
        {t('heroSurveillanceLabel')} &middot; {t('modelVersionBadge')} &middot; {t('heroSurveillanceActive')}
      </div>

      <h1 className="dash-hero-headline" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-serif)', lineHeight: 1.15, marginBottom: '16px', maxWidth: '700px' }}>
        {loading || !overview?.total_contracts ? '\u2014' : `${overview.total_contracts.toLocaleString('en-US')} ${t('heroContracts')}`}
        <br/>
        <span style={{ color: 'var(--color-accent)' }}>{t('heroUnderSurveillance')}</span>
      </h1>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {[
          { label: t('heroAlertContracts'), value: loading ? '\u2014' : `${criticalHighContractPct.toFixed(1)}%`, color: '#ef4444' },
          { label: t('heroCriticalLevel'), value: loading ? '\u2014' : criticalCount.toLocaleString('en-US'), color: '#f97316' },
          { label: t('heroTotalValueAnalyzed'), value: loading ? '\u2014' : formatCompactMXN(overview?.total_value_mxn ?? 0), color: '#fbbf24' },
        ].map((stat, i) => (
          <div key={i} className="dash-hero-stat">
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-family-mono)', marginBottom: '2px' }}>{stat.label.toUpperCase()}</div>
            <div style={{ fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', fontWeight: 700, color: stat.color, fontFamily: 'var(--font-family-mono)', letterSpacing: '-0.02em' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { label: `\u2192 ${t('heroInvestigateVendors')}`, to: '/aria' },
          { label: `\u2192 ${t('heroDocumentedCases')}`, to: '/cases' },
          { label: `\u2192 ${t('heroReportCard')}`, to: '/report-card' },
        ].map((cta, i) => (
          <Link key={i} to={cta.to} className="dash-hero-cta" style={{
            fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.15)', padding: '6px 14px',
            borderRadius: '4px', textDecoration: 'none', fontFamily: 'var(--font-family-mono)',
            letterSpacing: '0.05em', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#c41e3a' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
          >
            {cta.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// INVESTIGATION SPOTLIGHT — editorial "breaking news" card
// ============================================================================

function InvestigationSpotlight() {
  const { t } = useTranslation('dashboard')
  const { data: ariaT1, isLoading: ariaLoading } = useQuery({
    queryKey: ['aria', 'queue', 'spotlight'],
    queryFn: () => ariaApi.getQueue({ tier: 1, per_page: 1 }),
    staleTime: 10 * 60 * 1000,
  })

  if (ariaLoading) {
    return (
      <div className="rounded-lg border border-border/40 bg-background-card/30 p-5 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-3 pt-1">
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      </div>
    )
  }

  const top = ariaT1?.data?.[0] as AriaQueueItem | undefined

  const vendorName = top?.vendor_name ?? '—'
  const vendorId = top?.vendor_id ?? 0
  const ipsScore = top?.ips_final ?? 0
  const totalValue = top?.total_value_mxn ?? 0
  const totalContracts = top?.total_contracts ?? 0
  const pattern = top?.primary_pattern ?? ''
  const sector = top?.primary_sector_name ?? ''

  return (
    <div style={{
      border: '1px solid rgba(196,30,58,0.4)',
      borderLeft: '4px solid #c41e3a',
      background: 'linear-gradient(135deg, rgba(196,30,58,0.05) 0%, transparent 60%)',
      borderRadius: '8px',
      padding: '20px 24px',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '20px',
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: '#c41e3a', marginBottom: '8px', fontFamily: 'var(--font-family-mono)' }}>
          &#9650; {t('heroAriaT1Label')}
          {pattern && (
            <span style={{
              marginLeft: '8px', fontSize: '8px', padding: '1px 5px', borderRadius: '3px',
              backgroundColor: `${PATTERN_COLORS[pattern] ?? '#64748b'}25`,
              color: PATTERN_COLORS[pattern] ?? '#64748b',
            }}>{pattern}</span>
          )}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-family-serif)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
          {toTitleCase(vendorName)}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: '560px', marginBottom: '12px' }}>
          {formatNumber(totalContracts)} {t('heroContractsLabel')} &middot; {formatCompactMXN(totalValue)}
          {sector && <> &middot; {toTitleCase(sector)}</>}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {vendorId > 0 && (
            <Link to={`/vendors/${vendorId}`} style={{
              fontSize: '12px', fontWeight: 600, color: '#c41e3a', textDecoration: 'none',
              fontFamily: 'var(--font-family-mono)', letterSpacing: '0.08em',
            }}>
              {t('heroOpenProfile')} &rarr;
            </Link>
          )}
          <Link to="/aria" style={{
            fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textDecoration: 'none',
            fontFamily: 'var(--font-family-mono)', letterSpacing: '0.08em',
          }}>
            {t('heroViewInvestigation')} &rarr;
          </Link>
        </div>
      </div>
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: '#c41e3a', lineHeight: 1, letterSpacing: '-0.04em' }}>
          {ipsScore.toFixed(3)}
        </div>
        <div style={{ fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(196,30,58,0.7)', fontFamily: 'var(--font-family-mono)', marginTop: '4px' }}>
          {t('ipsScore')}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SECTION WRAPPER — with GSAP ScrollTrigger reveal
// ============================================================================

function DashboardSection({
  children,
  title,
  subtitle,
  icon: Icon,
  action,
  className,
  noPadding,
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  icon?: React.ElementType
  action?: React.ReactNode
  className?: string
  noPadding?: boolean
}) {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.from(sectionRef.current!, {
        opacity: 0, y: 20, duration: 0.6, ease: 'power2.out',
        scrollTrigger: { trigger: sectionRef.current!, start: 'top 90%', once: true },
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <div ref={sectionRef} className={cn('fern-card overflow-hidden', className)}>
      {title && (
        <div className={cn('flex items-center justify-between', noPadding ? 'px-5 pt-5 pb-3' : 'px-5 pt-5 pb-3')}>
          <div>
            <div className="editorial-rule" style={{ marginBottom: subtitle ? '0.25rem' : 0 }}>
              {Icon && <Icon className="h-3.5 w-3.5 text-accent flex-shrink-0" aria-hidden="true" />}
              <span className="editorial-label">{title}</span>
            </div>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'px-5 pb-5'}>
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// SECTION ERROR FALLBACK — lightweight card shown when a section crashes
// ============================================================================

function SectionErrorFallback({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation('dashboard')
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background-card/30 px-4 py-3">
      <div className="flex items-center gap-2 text-text-muted">
        <AlertTriangle className="h-4 w-4 text-risk-high flex-shrink-0" />
        <span className="text-xs">{t('sectionLoadError')}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-accent hover:underline ml-4 flex-shrink-0"
        >
          {t('retry')}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export function Dashboard() {
  const navigate = useNavigate()
  const { open: openEntityDrawer } = useEntityDrawer()
  const { t } = useTranslation('dashboard')
  const { t: tc } = useTranslation('common')

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data: fastDashboard, isLoading: dashLoading, error: dashError, refetch: dashRefetch } = useQuery({
    queryKey: ['dashboard', 'fast'],
    queryFn: () => analysisApi.getFastDashboard(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Fallback when fastDashboard fails or returns without overview data.
  // Uses the risk-overview endpoint which reads the same precomputed_stats table.
  const fastFailed = !dashLoading && (!fastDashboard || !fastDashboard.overview)
  const { data: riskOverviewFallback, isLoading: fallbackLoading } = useQuery({
    queryKey: ['analysis', 'risk-overview-fallback'],
    queryFn: () => analysisApi.getRiskOverview(),
    staleTime: 5 * 60 * 1000,
    enabled: fastFailed,
    retry: 1,
  })

  const { data: phiSectorsData } = useQuery({
    queryKey: ['phi', 'sectors'],
    queryFn: () => phiApi.getSectors(),
    staleTime: 10 * 60 * 1000,
    retry: 0,
  })

  const { data: execData, isLoading: execLoading } = useQuery({
    queryKey: ['executive', 'summary'],
    queryFn: () => analysisApi.getExecutiveSummary(),
    staleTime: Infinity, // historical model data — never re-fetch automatically
    gcTime: 60 * 60 * 1000,
  })

  const { data: patternCountsData } = useQuery({
    queryKey: ['analysis', 'patterns', 'counts'],
    queryFn: () => analysisApi.getPatternCounts(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: yearOverYearData } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 30 * 60 * 1000,
  })

  const { data: moneyFlowData } = useQuery({
    queryKey: ['analysis', 'money-flow', 'dashboard'],
    queryFn: () => analysisApi.getMoneyFlow(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: modelMeta } = useQuery({
    queryKey: ['analysis', 'model-metadata'],
    queryFn: () => analysisApi.getModelMetadata(),
    staleTime: 60 * 60 * 1000,
    retry: 0,
    refetchOnWindowFocus: false,
  })

  const { data: _topInvestigationCase } = useQuery({
    queryKey: ['investigation', 'top-1-dashboard'],
    queryFn: () => investigationApi.getTopCases(1),
    staleTime: 30 * 60 * 1000,
  })

  const { data: sectorYearData } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: monthlyRiskSummaryData } = useQuery({
    queryKey: ['analysis', 'monthly-risk-summary'],
    queryFn: () => analysisApi.getMonthlyRiskSummary(),
    staleTime: 10 * 60 * 1000,
  })

  // Year drill-down state
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const { data: yearSummaryData, isLoading: yearSummaryLoading } = useQuery({
    queryKey: ['analysis', 'year-summary', selectedYear],
    queryFn: () => analysisApi.getYearSummary(selectedYear!),
    staleTime: 10 * 60 * 1000,
    enabled: selectedYear !== null,
  })

  // ── Derived data ──────────────────────────────────────────────────────────

  const overview = fastDashboard?.overview ?? (riskOverviewFallback?.overview as FastDashboardData['overview'] | undefined)
  const sectors = fastDashboard?.sectors
  const riskDist = fastDashboard?.risk_distribution ?? (riskOverviewFallback?.risk_distribution as FastDashboardData['risk_distribution'] | undefined)

  const criticalHighContractPct = useMemo(() => {
    if (!riskDist) return 0
    return riskDist
      .filter(d => d.risk_level === 'critical' || d.risk_level === 'high')
      .reduce((s, d) => s + (d.percentage || 0), 0)
  }, [riskDist])

  const criticalCount = useMemo(() => {
    if (!riskDist) return 0
    return riskDist.find(d => d.risk_level === 'critical')?.count ?? 0
  }, [riskDist])

  const criticalHighValue = useMemo(() => {
    if (!riskDist) return 0
    return riskDist
      .filter(d => d.risk_level === 'critical' || d.risk_level === 'high')
      .reduce((s, d) => s + (d.total_value_mxn || 0), 0)
  }, [riskDist])

  const phiGradeMap = useMemo(() => {
    const m: Record<string, string> = {}
    if (phiSectorsData?.sectors) {
      for (const s of phiSectorsData.sectors) {
        m[s.sector_name.toLowerCase()] = s.grade
      }
    }
    return m
  }, [phiSectorsData])

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
          grade: phiGradeMap[s.code] as string | undefined,
        }
      })
      .sort((a, b) => b.valueAtRisk - a.valueAtRisk)
  }, [sectors, phiGradeMap])

  const riskTrajectory = useMemo(() => {
    const yearlyTrends = fastDashboard?.yearly_trends ?? (riskOverviewFallback?.yearly_trends as FastDashboardData['yearly_trends'] | undefined)
    if (!yearlyTrends) return []
    return yearlyTrends
      .filter((d) => d.year >= 2010)
      .map((d) => ({
        year: d.year,
        highRiskPct: (d.avg_risk || 0) * 100,
        avgRisk: (d.avg_risk || 0) * 100,
        contracts: d.contracts,
        directAwardPct: d.direct_award_pct ?? undefined,
      }))
  }, [fastDashboard, riskOverviewFallback])

  const corruptionCases = useMemo(() => {
    if (!execData?.ground_truth?.case_details) return []
    return execData.ground_truth.case_details
  }, [execData])

  const groundTruth = execData?.ground_truth
  const modelAuc = execData?.model?.auc ?? 0.828

  const topFlows = useMemo(() => {
    if (!moneyFlowData?.flows) return []
    return [...moneyFlowData.flows]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [moneyFlowData])

  const lastUpdated = fastDashboard?.cached_at
    ? new Date(fastDashboard.cached_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  // True only while queries are still in-flight with no data yet.
  // Once both queries have settled (success or error), stop showing loading state
  // so the error banner is visible rather than an infinite "--" spinner.
  const bothSettled = !dashLoading && (!fastFailed || !fallbackLoading)
  const kpiLoading = !bothSettled || !overview

  // Sector trajectory selector
  const [selectedTrajectorySectorId, setSelectedTrajectorySectorId] = useState<number | null>(null)

  const sectorTrajectory = useMemo(() => {
    if (selectedTrajectorySectorId === null || !sectorYearData?.data) return []
    return sectorYearData.data
      .filter((d) => d.sector_id === selectedTrajectorySectorId && d.year >= 2010)
      .map((d) => ({
        year: d.year,
        highRiskPct: (d.avg_risk || 0) * 100,
        avgRisk: (d.avg_risk || 0) * 100,
        contracts: d.contracts,
      }))
      .sort((a, b) => a.year - b.year)
  }, [sectorYearData, selectedTrajectorySectorId])

  // Refs for chart export
  const riskTrajectoryRef = useRef<HTMLDivElement>(null)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* RISK TICKER STRIP — Bloomberg-style scrolling alerts             */}
      {/* ================================================================ */}
      <RiskTicker />

      {/* ================================================================ */}
      {/* EDITORIAL LEDE — Journalistic framing line                       */}
      {/* ================================================================ */}
      <div className="px-6 pt-4 pb-2 border-b border-border/40">
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
          {t('lede')}
        </p>
      </div>

      {/* ================================================================ */}
      {/* HERO STAT BAR — KPI: critical+high risk value                    */}
      {/* ================================================================ */}
      <HeroStatBar
        value={formatCompactMXN(criticalHighValue || overview?.total_value_mxn || 0)}
        loading={kpiLoading}
      />
      {!kpiLoading && criticalHighValue > 0 && (
        <p className="px-6 text-[10px] font-mono text-text-muted/70 -mt-2">
          {t('budgetContext', { pct: ((criticalHighValue / 9_900_000_000_000) * 100).toFixed(0) })}
        </p>
      )}

      {/* ================================================================ */}
      {/* CINEMATIC HERO — dark editorial hero with GSAP animations        */}
      {/* ================================================================ */}
      <DashboardCinematicHero
        overview={overview}
        criticalHighContractPct={criticalHighContractPct}
        criticalCount={criticalCount}
        loading={dashLoading || !overview}
      />

      {/* ================================================================ */}
      {/* KEY FINDINGS SIGNAL STRIP — 3 live stats                       */}
      {/* ================================================================ */}
      {!kpiLoading && overview && (
        <div className="bg-background-elevated border-y border-border grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-border py-6 px-4 sm:px-8">
          <div className="flex flex-col items-center justify-center text-center px-4 py-3 sm:py-0">
            <span className="text-4xl font-bold font-mono" style={{ color: '#f59e0b' }}>
              {overview.direct_award_pct != null ? `${overview.direct_award_pct.toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs text-text-muted uppercase tracking-wide mt-1">{t('signalStripDirectAward')}</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4 py-3 sm:py-0">
            <span className="text-4xl font-bold font-mono" style={{ color: '#dc2626' }}>
              {criticalHighValue > 0 ? formatCompactMXN(criticalHighValue) : '—'}
            </span>
            <span className="text-xs text-text-muted uppercase tracking-wide mt-1">{t('signalStripHighRiskValue')}</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4 py-3 sm:py-0">
            <span className="text-4xl font-bold font-mono" style={{ color: '#dc2626' }}>
              {criticalHighContractPct > 0 ? `${criticalHighContractPct.toFixed(1)}%` : '—'}
            </span>
            <span className="text-xs text-text-muted uppercase tracking-wide mt-1">{t('signalStripHighRiskRate')}</span>
            {criticalHighContractPct > 0 && (
              <span className={`mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                criticalHighContractPct >= 2 && criticalHighContractPct <= 15
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : criticalHighContractPct > 15
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {criticalHighContractPct >= 2 && criticalHighContractPct <= 15
                  ? t('oecdWithinRange')
                  : criticalHighContractPct > 15
                  ? t('oecdAboveLimit')
                  : t('oecdBelowMin')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* PERIOD TREND CHART — avg risk score 2002–2025                   */}
      {/* ================================================================ */}
      {yearOverYearData?.data && yearOverYearData.data.length > 0 && (
        <div className="fern-card px-5 pt-5 pb-5">
          <div className="mb-3">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-text-muted font-mono leading-none mb-0.5">
              {t('periodTrendTitle')}
            </p>
            <p className="text-[10px] text-text-muted">
              {t('periodTrendSubtitle')}
            </p>
          </div>
          <div role="img" aria-label={t('periodTrendAriaLabel')}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={yearOverYearData.data.map((d) => ({
                year: d.year,
                avgRiskPct: d.avg_risk * 100,
                highRiskPct: d.high_risk_pct,
              }))}
              margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="periodTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <RechartsTooltip
                contentStyle={{
                  background: 'var(--color-background-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-family-mono)',
                }}
                formatter={(value: number | undefined, name: string | undefined) => [
                  value != null ? `${value.toFixed(2)}%` : '—',
                  name === 'avgRiskPct' ? t('tooltipAvgRisk') : t('tooltipHighRiskRate'),
                ]}
                labelFormatter={(label: number) => t('tooltipYear', { year: label })}
              />
              {/* Early period annotation */}
              <ReferenceArea x1={2002} x2={2010} fill="rgba(255,255,255,0.02)" label={{ value: t('periodAnnotationEarly'), fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: 'monospace', position: 'insideTopLeft' }} />
              {/* Recent period annotation */}
              <ReferenceArea x1={2021} x2={2025} fill="rgba(220,38,38,0.04)" label={{ value: t('periodAnnotationRecent'), fill: 'rgba(220,38,38,0.45)', fontSize: 9, fontFamily: 'monospace', position: 'insideTopRight' }} />
              <Area
                type="monotone"
                dataKey="avgRiskPct"
                stroke="#dc2626"
                strokeWidth={2}
                fill="url(#periodTrendGradient)"
                dot={false}
                activeDot={{ r: 3, stroke: '#dc2626', strokeWidth: 2, fill: 'var(--color-background-base)' }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="highRiskPct"
                stroke="#f97316"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 3"
                connectNulls
              />
              <ReferenceLine
                y={15}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: t('oecdUpperThresholdLabel'), position: 'insideTopRight', fontSize: 10, fill: '#f59e0b', fontFamily: 'monospace' }}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded" style={{ backgroundColor: '#dc2626' }} />
              <span className="text-xs text-text-muted">{t('legendAvgRiskScore')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 rounded" style={{ borderTop: '1.5px dashed #f97316' }} />
              <span className="text-xs text-text-muted">{t('legendHighRiskRate')}</span>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTOR MARKET CONCENTRATION                                      */}
      {/* ================================================================ */}
      <SectorConcentrationChart className="rounded-none border-x-0 border-b-0" showTitle={true} />

      {/* Section divider — "NATIONAL OVERVIEW" label + live-data badges */}
      <div className="flex items-center justify-between px-1 py-2 border-b border-border/30">
        <span className="text-[10px] font-mono font-semibold tracking-widest text-text-muted uppercase">
          {t('panoramaLabel')}
        </span>
        <div className="flex items-center gap-2">
          <LiveDataPulse />
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
              <Activity className="h-3 w-3 text-signal-live" />
              <span>{t('synced')} {lastUpdated.toUpperCase()}</span>
            </div>
          )}
          <span
            className="text-[10px] font-mono text-text-muted/70 cursor-help"
            title={t('aucExplanation')}
          >
            {modelMeta?.version ?? CURRENT_MODEL_VERSION} | AUC {modelMeta?.auc_test?.toFixed(3) ?? '0.828'}
          </span>
        </div>
      </div>

      {/* Error Banner */}
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
      {/* LIVE ALERT BANNER                                                */}
      {/* ================================================================ */}
      <AlertBanner
        criticalCount={criticalCount}
        onClick={() => navigate('/contracts?risk_level=critical')}
      />

      {/* ================================================================ */}
      {/* RISK DISTRIBUTION BAR — Staggered horizontal fill               */}
      {/* ================================================================ */}
      {dashLoading ? (
        <div className="space-y-2">
          <div className="flex gap-1">
            <div className="animate-pulse bg-muted rounded h-4 w-16" />
            <div className="animate-pulse bg-muted rounded h-4 w-12" />
            <div className="animate-pulse bg-muted rounded h-4 w-20" />
            <div className="animate-pulse bg-muted rounded h-4 w-24" />
          </div>
          <div className="animate-pulse bg-muted rounded h-5 w-full" />
        </div>
      ) : riskDist ? (
        <ScrollReveal delay={0}>
          <RiskDistributionBar data={riskDist} />
        </ScrollReveal>
      ) : null}

      <SectionDivider />

      {/* ================================================================ */}
      {/* INVESTIGATION SPOTLIGHT — editorial breaking news card           */}
      {/* ================================================================ */}
      <ErrorBoundary fallback={<SectionErrorFallback />}>
        <InvestigationSpotlight />
      </ErrorBoundary>

      {/* ================================================================ */}
      {/* STORY INFOGRAPHIC — "La Historia en Datos"                       */}
      {/* ================================================================ */}
      <ScrollReveal delay={0}>
        <StoryInfographic />
      </ScrollReveal>

      <SectionDivider />

      {/* ================================================================ */}
      {/* HEADLINE ROW: 4 KPI Cards — staggered reveal                    */}
      {/* These show COMPLEMENTARY data to the hero above (no repeats).   */}
      {/* Hero covers: total contracts, alert %, critical count, total     */}
      {/* value. These cards show: direct award %, single bid %, vendor    */}
      {/* count, model AUC.                                                */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScrollReveal delay={0}>
          <KPICard
            label={t('directAwardRate')}
            value={kpiLoading ? '--' : (overview?.direct_award_pct != null ? `${overview.direct_award_pct.toFixed(1)}%` : '—')}
            sublabel={t('oecdDirectAward')}
            color="#fb923c"
            loading={kpiLoading}
            icon={Gauge}
            onClick={() => navigate('/administrations')}
          />
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <KPICard
            label={t('singleBidRate')}
            value={kpiLoading ? '--' : (overview?.single_bid_pct != null ? `${overview.single_bid_pct.toFixed(1)}%` : '—')}
            sublabel={t('oecdSingleBid')}
            color="#f87171"
            loading={kpiLoading}
            icon={AlertTriangle}
            onClick={() => navigate('/administrations')}
          />
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <KPICard
            label={t('topVendors')}
            value={kpiLoading ? '--' : (overview?.total_vendors != null ? formatNumber(overview.total_vendors) : '—')}
            sublabel={kpiLoading ? '' : `${formatNumber(overview?.total_contracts ?? 0)} ${tc('contracts').toLowerCase()} | 2002-2025`}
            color="#818cf8"
            loading={kpiLoading}
            icon={Users}
            onClick={() => navigate('/network')}
          />
        </ScrollReveal>
        <ScrollReveal delay={300}>
          <KPICard
            label={t('detectionAccuracy')}
            value={kpiLoading ? '--' : `${((modelMeta?.auc_test ?? 0.828) * 100).toFixed(1)}%`}
            sublabel={t('detectionDetail')}
            color="#4ade80"
            loading={kpiLoading}
            icon={Shield}
            onClick={() => navigate('/methodology')}
            sparkData={riskTrajectory.length > 3 ? riskTrajectory : undefined}
            sparkKey="highRiskPct"
          />
        </ScrollReveal>
      </div>

      {/* RiskFilterChips removed — state was local-only and had no downstream effect */}

      {/* ================================================================ */}
      {/* P1 INSIGHT CARDS — Multivariate anomalies, election effect,      */}
      {/* new vendor risk, sexenio comparison                              */}
      {/* ================================================================ */}
      <ErrorBoundary fallback={<SectionErrorFallback />}>
      {dashLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <Card key={i} className="fern-card">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (fastDashboard?.multivariate_anomaly_count != null ||
        (fastDashboard?.election_year_avg_risk != null && fastDashboard?.non_election_year_avg_risk != null) ||
        fastDashboard?.new_vendor_risk_count != null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fastDashboard?.multivariate_anomaly_count != null && (
            <ScrollReveal delay={0}>
              <Card className="fern-card border-t-[3px]" style={{ borderTopColor: '#ef4444' }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-text-muted font-mono leading-none">
                      {t('statisticalAnomalies')}
                    </p>
                    <Target className="h-4 w-4 text-risk-critical opacity-50" />
                  </div>
                  <p
                    className="text-[2.5rem] font-black tabular-nums leading-none tracking-tight"
                    style={{ color: '#ef4444', letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatNumber(fastDashboard.multivariate_anomaly_count)}
                  </p>
                  <p className="text-[10px] text-text-muted leading-tight mt-3">
                    {t('multivariateDetail')}
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}
          {fastDashboard?.election_year_avg_risk != null && fastDashboard?.non_election_year_avg_risk != null && (() => {
            const diff = fastDashboard.election_year_avg_risk - fastDashboard.non_election_year_avg_risk
            const diffPct = fastDashboard.non_election_year_avg_risk > 0
              ? ((diff / fastDashboard.non_election_year_avg_risk) * 100).toFixed(1)
              : '0.0'
            const isHigher = diff > 0
            return (
              <ScrollReveal delay={100}>
                <Card className="fern-card border-t-[3px]" style={{ borderTopColor: '#eab308' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-text-muted font-mono leading-none">
                        {t('electionYearEffect')}
                      </p>
                      <Calendar className="h-4 w-4 opacity-50" style={{ color: '#eab308' }} />
                    </div>
                    <p
                      className="text-[2.5rem] font-black tabular-nums leading-none tracking-tight"
                      style={{ color: '#eab308', letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {isHigher ? '+' : ''}{diffPct}%
                    </p>
                    <p className={cn('text-[10px] leading-tight mt-3', isHigher ? 'text-risk-high' : 'text-text-muted')}>
                      {isHigher ? t('electionYearHigher') : t('electionYearSimilar')}
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            )
          })()}
          {fastDashboard?.new_vendor_risk_count != null && (
            <ScrollReveal delay={200}>
              <Card className="fern-card border-t-[3px]" style={{ borderTopColor: '#fb923c' }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-text-muted font-mono leading-none">
                      {t('newRiskyVendors')}
                    </p>
                    <AlertTriangle className="h-4 w-4 text-risk-high opacity-50" />
                  </div>
                  <p
                    className="text-[2.5rem] font-black tabular-nums leading-none tracking-tight"
                    style={{ color: '#fb923c', letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatNumber(fastDashboard.new_vendor_risk_count)}
                  </p>
                  <p className="text-[10px] text-text-muted leading-tight mt-3">
                    {t('newVendorDetail')}
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}
        </div>
      )}
      </ErrorBoundary>

      {/* Sexenio Comparison — side-by-side AMLO vs Sheinbaum */}
      <ErrorBoundary fallback={<SectionErrorFallback />}>
      {dashLoading ? (
        <Card className="fern-card">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-3 w-36" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-48" />
          </CardContent>
        </Card>
      ) : fastDashboard?.sexenio_comparison?.amlo != null && fastDashboard?.sexenio_comparison?.sheinbaum != null && (() => {
        const amlo = fastDashboard.sexenio_comparison!.amlo!
        const sheinbaum = fastDashboard.sexenio_comparison!.sheinbaum!
        const delta = sheinbaum.avg_risk - amlo.avg_risk
        const isHigher = delta > 0
        return (
          <ScrollReveal delay={0}>
            <Card className="fern-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-3.5 w-3.5 text-accent" />
                  <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-text-muted font-mono">
                    {t('sexenioComparison')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* AMLO */}
                  <div className="rounded-lg border border-border/30 bg-background-elevated/20 p-3">
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">{t('amloLabel')}</p>
                    <p className="text-xl font-black font-mono tabular-nums" style={{ color: '#f97316' }}>
                      {(amlo.avg_risk * 100).toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-text-muted mt-1">
                      {formatNumber(amlo.contract_count ?? amlo.contracts ?? 0)} {t('contractsShort')} &middot; {(amlo.high_risk_pct ?? 0).toFixed(1)}% {t('highRiskShort')}
                    </p>
                  </div>
                  {/* Sheinbaum */}
                  <div className="rounded-lg border border-border/30 bg-background-elevated/20 p-3">
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">{t('sheinbaumLabel')}</p>
                    <p className="text-xl font-black font-mono tabular-nums" style={{ color: '#dc2626' }}>
                      {(sheinbaum.avg_risk * 100).toFixed(2)}%
                    </p>
                    <p className="text-[10px] text-text-muted mt-1">
                      {formatNumber(sheinbaum.contract_count ?? sheinbaum.contracts ?? 0)} {t('contractsShort')} &middot; {(sheinbaum.high_risk_pct ?? 0).toFixed(1)}% {t('highRiskShort')}
                    </p>
                  </div>
                </div>
                <p className={cn('text-[10px] mt-3 font-mono', isHigher ? 'text-risk-high' : 'text-risk-low')}>
                  {isHigher ? <TrendingUp className="h-3 w-3 inline mr-1" /> : <TrendingDown className="h-3 w-3 inline mr-1" />}
                  {t('sheinbaumVsAmlo', { delta: `${isHigher ? '+' : ''}${(delta * 100).toFixed(2)}pp` })}
                </p>
              </CardContent>
            </Card>
          </ScrollReveal>
        )
      })()}
      </ErrorBoundary>

      {/* ================================================================ */}
      {/* RED FLAG PATTERNS — 5 compact KPI cards from patternCounts       */}
      {/* ================================================================ */}
      <ErrorBoundary fallback={<SectionErrorFallback />}>
      {!patternCountsData?.counts && !dashLoading ? null : !patternCountsData?.counts ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : patternCountsData?.counts && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {([
            { key: 'critical' as const, label: t('criticalRisk'), icon: AlertTriangle, color: '#f87171', route: '/contracts?risk_level=critical' },
            { key: 'december_rush' as const, label: t('decemberRush'), icon: Calendar, color: '#fbbf24', route: '/detective?pattern=december_rush' },
            { key: 'split_contracts' as const, label: t('splitContracts'), icon: Scissors, color: '#fb923c', route: '/detective?pattern=split_contracts' },
            { key: 'co_bidding' as const, label: t('coBidding'), icon: Users, color: '#8b5cf6', route: '/detective?pattern=co_bidding' },
            { key: 'price_outliers' as const, label: t('priceOutliers'), icon: TrendingUp, color: '#3b82f6', route: '/detective?pattern=price_outliers' },
          ] as const).map(({ key, label, icon: PatIcon, color, route }) => (
            <button
              key={key}
              onClick={() => navigate(route)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/30 bg-background-card/40 hover:border-border/60 hover:bg-background-elevated/30 transition-all text-left group"
            >
              <div className="p-1.5 rounded" style={{ backgroundColor: `${color}15` }}>
                <PatIcon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider leading-none mb-0.5">{label}</p>
                <p className="text-sm font-black tabular-nums font-mono" style={{ color }}>
                  {formatNumber(patternCountsData.counts[key])}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      </ErrorBoundary>

      {/* ================================================================ */}
      {/* HISTORIAS DESTACADAS — 3 investigation-ready story cards        */}
      {/* Numbers from DuckDB analysis of 3.05M contracts 2002-2025      */}
      {/* ================================================================ */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-4">
          <FileSearch className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold tracking-[0.10em] uppercase font-mono text-text-muted">
            {t('featuredStories')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Story A: December Phenomenon */}
          <Card className="fern-card border-l-4 border-l-amber-500 hover:border-l-amber-400 transition-colors cursor-pointer group" onClick={() => navigate('/administrations')}>
            <CardContent className="pt-4 pb-4">
              <p className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-text-muted mb-1.5">
                {t('storyTemporality')}
              </p>
              <h3 className="font-bold text-sm leading-tight mb-2 text-text-primary group-hover:text-amber-400 transition-colors">
                {t('storyDecemberTitle')}
              </h3>
              <p className="text-xl font-bold tabular-nums mb-1" style={{ color: '#d97706', fontFamily: 'var(--font-family-mono)' }}>
                {t('storyDecemberStat')}
              </p>
              <p className="text-[10px] text-text-muted mb-3 leading-snug">
                {t('storyDecemberDesc')}
              </p>
              <Link to="/administrations" className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <ArrowRight className="h-3 w-3" />
                {t('storyDecemberLink')}
              </Link>
            </CardContent>
          </Card>

          {/* Story B: CFE / Hacienda concentration */}
          <Card className="fern-card border-l-4 border-l-red-500 hover:border-l-red-400 transition-colors cursor-pointer group" onClick={() => navigate('/contracts?sector_id=7')}>
            <CardContent className="pt-4 pb-4">
              <p className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-text-muted mb-1.5">
                {t('storyConcentration')}
              </p>
              <h3 className="font-bold text-sm leading-tight mb-2 text-text-primary group-hover:text-red-400 transition-colors">
                {t('storyHaciendaTitle')}
              </h3>
              <p className="text-xl font-bold tabular-nums mb-1" style={{ color: '#ef4444', fontFamily: 'var(--font-family-mono)' }}>
                {t('storyHaciendaStat')}
              </p>
              <p className="text-[10px] text-text-muted mb-3 leading-snug">
                {t('storyHaciendaDesc')}
              </p>
              <Link to="/contracts?sector_id=7" className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <ArrowRight className="h-3 w-3" />
                {t('storyHaciendaLink')}
              </Link>
            </CardContent>
          </Card>

          {/* Story C: Direct award surge */}
          <Card className="fern-card border-l-4 border-l-blue-500 hover:border-l-blue-400 transition-colors cursor-pointer group" onClick={() => navigate('/administrations')}>
            <CardContent className="pt-4 pb-4">
              <p className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-text-muted mb-1.5">
                {t('storyTrend')}
              </p>
              <h3 className="font-bold text-sm leading-tight mb-2 text-text-primary group-hover:text-blue-400 transition-colors">
                {t('storyDirectTitle')}
              </h3>
              <p className="text-xl font-bold tabular-nums mb-1" style={{ color: '#3b82f6', fontFamily: 'var(--font-family-mono)' }}>
                {t('storyDirectStat')}
              </p>
              <p className="text-[10px] text-text-muted mb-3 leading-snug">
                {t('storyDirectDesc')}
              </p>
              <Link to="/administrations" className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <ArrowRight className="h-3 w-3" />
                {t('storyDirectLink')}
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>

      <SectionDivider />

      {/* ROW 2: Risk Distribution + Sector Intelligence — REMOVED for cleaner layout */}

      <SectionDivider />

      {/* ================================================================ */}
      {/* TEMPORAL TREND — Full-width area chart                           */}
      {/* ================================================================ */}
      <ScrollReveal delay={0}>
      <DashboardSection
        title={t('riskTrajectory')}
        subtitle={t('riskTrajectoryDesc')}
        icon={Activity}
        action={
          <div className="flex items-center gap-2">
            <select
              className="text-xs font-mono bg-background-elevated/60 border border-border/30 rounded px-2 py-1 text-text-muted focus:outline-none focus:border-accent/60 cursor-pointer"
              value={selectedTrajectorySectorId ?? ''}
              onChange={(e) => setSelectedTrajectorySectorId(e.target.value === '' ? null : Number(e.target.value))}
              aria-label="Filter risk trajectory by sector"
            >
              <option value="">{t('allSectorsOption')}</option>
              {sectorData.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChartDownloadButton targetRef={riskTrajectoryRef} filename="rubli-risk-trajectory" />
          </div>
        }
      >
        {dashLoading ? (
          <div className="h-[300px] flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
        ) : (
          <div ref={riskTrajectoryRef}>
            <RiskTrajectoryChart
              data={riskTrajectory}
              sectorTrajectory={selectedTrajectorySectorId !== null ? sectorTrajectory : undefined}
              sectorColor={selectedTrajectorySectorId !== null
                ? (SECTOR_COLORS[sectorData.find((s) => s.id === selectedTrajectorySectorId)?.code ?? ''] ?? '#64748b')
                : undefined}
              yearlyTrends={fastDashboard?.yearly_trends}
              onYearClick={(year) => setSelectedYear(year)}
            />
          </div>
        )}
      </DashboardSection>
      </ScrollReveal>

      {/* ================================================================ */}
      {/* YEAR SUMMARY PANEL — slide-out on trajectory chart click (P12)  */}
      {/* ================================================================ */}
      {selectedYear !== null && (
        <div className="fern-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="editorial-rule" style={{ marginBottom: '0.25rem' }}>
                <BarChart3 className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                <span className="editorial-label">{t('yearSummaryTitle', { year: selectedYear })}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedYear(null)}
              className="text-xs text-text-muted hover:text-text-primary font-mono"
            >
              {t('yearSummaryClose')}
            </button>
          </div>
          {yearSummaryLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : yearSummaryData ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-2 rounded-lg bg-background-elevated/30">
                  <p className="text-[9px] font-mono text-text-muted uppercase">{t('yearSummaryContracts')}</p>
                  <p className="text-lg font-black tabular-nums font-mono text-text-primary">{formatNumber(yearSummaryData.overview.total_contracts)}</p>
                </div>
                <div className="p-2 rounded-lg bg-background-elevated/30">
                  <p className="text-[9px] font-mono text-text-muted uppercase">{t('yearSummaryTotalValue')}</p>
                  <p className="text-lg font-black tabular-nums font-mono text-text-primary">{formatCompactMXN(yearSummaryData.overview.total_value_mxn)}</p>
                </div>
                <div className="p-2 rounded-lg bg-background-elevated/30">
                  <p className="text-[9px] font-mono text-text-muted uppercase">{t('yearSummaryHighRiskRate')}</p>
                  <p className="text-lg font-black tabular-nums font-mono text-risk-high">{(yearSummaryData.overview.high_risk_pct ?? 0).toFixed(1)}%</p>
                </div>
                <div className="p-2 rounded-lg bg-background-elevated/30">
                  <p className="text-[9px] font-mono text-text-muted uppercase">{t('yearSummaryDirectAward')}</p>
                  <p className="text-lg font-black tabular-nums font-mono text-text-primary">{(yearSummaryData.direct_award_pct ?? 0).toFixed(1)}%</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {yearSummaryData.top_vendors_by_value.length > 0 && (
                  <div>
                    <p className="text-[9px] font-mono text-text-muted uppercase mb-1">{t('yearSummaryTopVendors')}</p>
                    {yearSummaryData.top_vendors_by_value.slice(0, 5).map((v, i) => (
                      <button key={v.id} onClick={() => openEntityDrawer(v.id, 'vendor')} className="flex items-center gap-1.5 w-full py-0.5 hover:bg-background-elevated/20 rounded transition-colors text-left">
                        <span className="text-[10px] text-text-muted font-mono w-4">{i + 1}</span>
                        <span className="text-xs text-text-secondary truncate flex-1">{toTitleCase(v.name)}</span>
                        <span className="text-[10px] font-mono text-text-muted tabular-nums">{formatCompactMXN(v.total_value_mxn)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {yearSummaryData.top_institutions_by_spend.length > 0 && (
                  <div>
                    <p className="text-[9px] font-mono text-text-muted uppercase mb-1">{t('yearSummaryTopInstitutions')}</p>
                    {yearSummaryData.top_institutions_by_spend.slice(0, 5).map((inst, i) => (
                      <button key={inst.id} onClick={() => openEntityDrawer(inst.id, 'institution')} className="flex items-center gap-1.5 w-full py-0.5 hover:bg-background-elevated/20 rounded transition-colors text-left">
                        <span className="text-[10px] text-text-muted font-mono w-4">{i + 1}</span>
                        <span className="text-xs text-text-secondary truncate flex-1">{toTitleCase(inst.name)}</span>
                        <span className="text-[10px] font-mono text-text-muted tabular-nums">{formatCompactMXN(inst.total_value_mxn)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted">{t('yearSummaryNoData')}</p>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* SEASONAL RISK WIDGET (P13)                                       */}
      {/* ================================================================ */}
      <ErrorBoundary fallback={<SectionErrorFallback />}>
      {!monthlyRiskSummaryData && !dashLoading ? null : !monthlyRiskSummaryData?.data ? (
        <DashboardSection
          title={t('seasonalPatternsTitle')}
          subtitle={t('seasonalPatternsDesc')}
          icon={Calendar}
        >
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-16 rounded" />
            ))}
          </div>
        </DashboardSection>
      ) : monthlyRiskSummaryData?.data && monthlyRiskSummaryData.data.length > 0 && (
        <DashboardSection
          title={t('seasonalPatternsTitle')}
          subtitle={t('seasonalPatternsDesc')}
          icon={Calendar}
        >
          <div className="space-y-2">
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
              {monthlyRiskSummaryData.data.map(item => {
                const avgPremium = item.risk_premium_pct
                const intensity = Math.min(Math.abs(avgPremium) / 30, 1)
                const bgColor = avgPremium > 0
                  ? `rgba(248,113,113,${0.1 + intensity * 0.5})`
                  : `rgba(74,222,128,${0.1 + intensity * 0.3})`
                const textColor = avgPremium > 5 ? '#f87171' : avgPremium > 0 ? '#fbbf24' : '#4ade80'
                const isDecember = item.month === 12
                return (
                  <div
                    key={item.month}
                    className={cn(
                      'flex flex-col items-center p-1.5 rounded',
                      isDecember && 'ring-1 ring-risk-critical/50',
                    )}
                    style={{ backgroundColor: bgColor }}
                    title={`${item.month_name}: ${avgPremium > 0 ? '+' : ''}${avgPremium.toFixed(1)}% risk premium`}
                  >
                    <span className="text-[8px] font-mono text-text-muted">{item.month_name}</span>
                    <span className="text-[10px] font-bold font-mono tabular-nums" style={{ color: textColor }}>
                      {avgPremium > 0 ? '+' : ''}{avgPremium.toFixed(0)}%
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-text-muted font-mono">
              {t('seasonalPatternsNote')}
            </p>
          </div>
        </DashboardSection>
      )}
      </ErrorBoundary>

      <SectionDivider />

      {/* ================================================================ */}
      {/* ROW 4: TOP VENDORS + WHERE THE MONEY GOES                       */}
      {/* ================================================================ */}
      <ScrollReveal delay={0}>
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        {/* Top Vendors */}
        <DashboardSection
          title={t('topVendorsByValue')}
          subtitle={t('topVendorsByValueDesc')}
          icon={Target}
          action={
            <button
              onClick={() => navigate('/network')}
              className="text-xs text-accent flex items-center gap-1 hover:underline"
            >
              {t('viewNetwork')} <ArrowUpRight className="h-3 w-3" />
            </button>
          }
        >
          <TopVendorsTable
            vendors={(execData?.top_vendors ?? []).slice(0, 5)}
            loading={execLoading}
            onVendorClick={(id) => openEntityDrawer(id, 'vendor')}
          />
        </DashboardSection>

        {/* Where the Money Goes */}
        <DashboardSection
          title={t('whereTheMoneyGoes')}
          subtitle={t('whereMoneyGoesSubDesc')}
          icon={ArrowRight}
          action={
            <button
              onClick={() => navigate('/categories')}
              className="text-xs text-accent flex items-center gap-1 hover:underline"
            >
              {t('fullBreakdown')} <ArrowUpRight className="h-3 w-3" />
            </button>
          }
        >
          {!moneyFlowData ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <div className="space-y-1">
              {topFlows.map((flow, i) => {
                const riskColor =
                  (flow.avg_risk ?? 0) >= 0.60 ? 'text-risk-critical' :
                  (flow.avg_risk ?? 0) >= 0.40 ? 'text-risk-high' :
                  (flow.avg_risk ?? 0) >= 0.15 ? 'text-risk-medium' :
                  'text-risk-low'
                return (
                  <div key={i} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-background-elevated/30 transition-colors">
                    <span className="text-xs text-text-muted font-mono w-5 flex-shrink-0 tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => openEntityDrawer(flow.source_id, 'institution')} className="text-xs font-semibold text-text-secondary truncate block hover:text-accent transition-colors">
                        {toTitleCase(flow.source_name)}
                      </button>
                      <button onClick={() => openEntityDrawer(flow.target_id, 'vendor')} className="text-xs text-text-muted truncate block hover:text-accent transition-colors">
                        {toTitleCase(flow.target_name)}
                      </button>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs tabular-nums font-mono text-text-secondary font-semibold">
                        {formatCompactMXN(flow.value)}
                      </p>
                      {flow.avg_risk != null && (
                        <p className={cn('text-[10px] font-bold tabular-nums font-mono', riskColor)}>
                          {(flow.avg_risk * 100).toFixed(0)}% {t('riskSuffix')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DashboardSection>
      </div>
      </ScrollReveal>

      {/* POLITICAL INTELLIGENCE — removed (API errors) */}

      {/* ================================================================ */}
      {/* GROUND TRUTH VALIDATION                                          */}
      {/* ================================================================ */}
      <DashboardSection
        title={t('validatedAgainstReal')}
        subtitle={`AUC ${modelAuc.toFixed(3)} | ${groundTruth?.cases ?? 748} ${t('documentedCorruptionCases')}`}
        icon={Shield}
        action={
          <button
            onClick={() => navigate('/executive-summary')}
            className="text-xs text-accent flex items-center gap-1 hover:underline"
          >
            {t('fullAnalysis')} <ArrowUpRight className="h-3 w-3" />
          </button>
        }
      >
        <GroundTruthSection
          cases={corruptionCases}
          loading={execLoading}
          modelAuc={modelAuc}
          totalCases={groundTruth?.cases ?? 748}
          onFullAnalysis={() => navigate('/executive-summary')}
        />
      </DashboardSection>

      {/* P21: ANOMALY LEADS — removed (API 500 errors) */}

      {/* ================================================================ */}
      {/* SECTORS BY VALUE CHART — Horizontal bar, top 8 by total value    */}
      {/* ================================================================ */}
      <ErrorBoundary fallback={<SectionErrorFallback />}>
        <SectorsByValueChart sectors={sectorData} loading={dashLoading} />
      </ErrorBoundary>

      {/* ================================================================ */}
      {/* SECTOR GRID: 12 cards                                            */}
      {/* ================================================================ */}
      <ErrorBoundary fallback={<SectionErrorFallback />}>
      {dashLoading ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      ) : sectorData.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              {t('sectorGridTitle')}
            </h2>
          </div>
          <motion.div
            className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
            variants={fernStaggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-40px' }}
          >
            {sectorData.map((sector) => (
              <motion.div key={sector.code} variants={fernStaggerItem}>
                <SectorMiniCard
                  {...sector}
                  onClick={() => navigate(`/sectors/${sector.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
      </ErrorBoundary>

      {/* ================================================================ */}
      {/* RESEARCH CONTEXT — CompraNet abolished                          */}
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
      {/* ARIA INVESTIGATION QUEUE + POLITICAL INTELLIGENCE              */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ErrorBoundary fallback={<SectionErrorFallback />}>
          <AnomalyLeadsWidget />
        </ErrorBoundary>
        <ErrorBoundary fallback={<SectionErrorFallback />}>
          <PoliticalIntelligenceStrip />
        </ErrorBoundary>
      </div>

      {/* ================================================================ */}
      {/* REDACCION RUBLI — ARIA editorial picks sidebar                 */}
      {/* ================================================================ */}
      <RedaccionWidget />

      {/* ================================================================ */}
      {/* START INVESTIGATING — 3 action cards                            */}
      {/* ================================================================ */}
      <div>
        <h2 className="text-base font-bold text-text-primary mb-1">{t('startInvestigating')}</h2>
        <p className="text-xs text-text-muted mb-3">
          {t('startInvestigatingDesc')}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
