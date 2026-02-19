/**
 * Red Flag Anatomy Page
 *
 * Interactive breakdown of risk factors across the entire database:
 * L0: Danger Zone (top 3 co-occurrence combinations by lift × volume)
 * L1: Factor Frequency (horizontal bar chart)
 * L2: Co-occurrence Heatmap (lift matrix)
 * L3: Worst Combinations (ranked list of factor pairs)
 * L4: Factor-Risk Correlation (scatter/bubble chart)
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartSkeleton } from '@/components/LoadingSkeleton'
import { cn, formatNumber } from '@/lib/utils'
import { RISK_COLORS, SECTORS } from '@/lib/constants'
import { PageHero } from '@/components/DashboardWidgets'
import { analysisApi } from '@/api/client'
import { SectionDescription } from '@/components/SectionDescription'
import type { RiskFactorFrequency, FactorCooccurrence } from '@/api/types'
import {
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from '@/components/charts'
import {
  AlertTriangle,
  Fingerprint,
  Users,
  Layers,
  Zap,
  ArrowRight,
  TrendingUp,
  ExternalLink,
} from 'lucide-react'

// =============================================================================
// Factor Display Labels
// =============================================================================

const FACTOR_LABELS: Record<string, string> = {
  single_bid: 'Single Bidder',
  non_open: 'Direct Award',
  direct_award: 'Direct Award',
  restricted_procedure: 'Restricted Procedure',
  restricted_proc: 'Restricted Procedure',
  price_anomaly: 'Price Anomaly',
  vendor_conc: 'Vendor Concentration',
  short_ad: 'Short Advertising Period',
  'short_ad_<30d': 'Short Ad Period (<30 days)',
  'short_ad_<15d': 'Short Ad Period (<15 days)',
  'short_ad_<5d': 'Short Ad Period (<5 days)',
  year_end: 'Year-End Timing',
  split: 'Threshold Splitting',
  split_2: 'Splitting (2 same-day)',
  split_3: 'Splitting (3 same-day)',
  split_4: 'Splitting (4 same-day)',
  split_5: 'Splitting (5 same-day)',
  split_6: 'Splitting (6 same-day)',
  split_7: 'Splitting (7 same-day)',
  split_8: 'Splitting (8 same-day)',
  split_9: 'Splitting (9 same-day)',
  'split_10+': 'Heavy Splitting (10+ same-day)',
  network: 'Vendor Network',
  network_2: 'Network (2 members)',
  network_3: 'Network (3 members)',
  network_4: 'Network (4 members)',
  'network_5+': 'Large Network (5+ members)',
  co_bid_high: 'Co-Bidding (High Risk)',
  co_bid_med: 'Co-Bidding (Medium Risk)',
  price_hyp: 'Statistical Price Outlier',
  inst_risk: 'High-Risk Institution',
  industry_mismatch: 'Industry Mismatch',
  interaction: 'Multiple Risk Factors Combined',
  data_flag: 'Data Quality Flag',
}

/** Consolidation groups: raw factor → group key */
function getFactorGroup(factor: string): string {
  // Group split_N where N >= 10 into one bucket
  if (factor.startsWith('split_')) {
    const n = parseInt(factor.replace('split_', ''), 10)
    if (n >= 10) return 'split_10+'
    return factor
  }
  // Group network_N where N >= 5 into one bucket
  if (factor.startsWith('network_')) {
    const n = parseInt(factor.replace('network_', ''), 10)
    if (n >= 5) return 'network_5+'
    return factor
  }
  return factor
}

function getFactorLabel(factor: string): string {
  if (FACTOR_LABELS[factor]) return FACTOR_LABELS[factor]
  // Consolidated groups
  if (factor === 'split_10+') return 'Heavy Splitting (10+ same-day)'
  if (factor === 'network_5+') return 'Large Network (5+ members)'
  // Handle split_N variants: "split_2" → "Same-Day Splitting (2+ contracts)"
  if (factor.startsWith('split_')) {
    const n = factor.replace('split_', '')
    return `Same-Day Splitting (${n}+ contracts)`
  }
  // Handle network_N variants: "network_2" → "Vendor Network (2+ members)"
  if (factor.startsWith('network_')) {
    const n = factor.replace('network_', '')
    return `Vendor Network (${n}+ members)`
  }
  // Handle co_bid variants
  if (factor.startsWith('co_bid_')) {
    const tier = factor.replace('co_bid_', '')
    return `Co-Bidding (${tier.charAt(0).toUpperCase() + tier.slice(1)} Risk)`
  }
  // Handle short_ad variants
  if (factor.startsWith('short_ad_')) {
    const days = factor.replace('short_ad_', '').replace('<', '').replace('d', '')
    return `Short Ad Period (<${days} days)`
  }
  // Fallback: humanize the key
  return factor
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// =============================================================================
// Color Helpers
// =============================================================================

/** Interpolate between two hex colors. t in [0, 1]. */
function lerpColor(colorA: string, colorB: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const a = parse(colorA)
  const b = parse(colorB)
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

/** Map an avg_risk_score (0-1) to a color from low..critical */
function riskScoreToColor(score: number): string {
  if (score >= 0.5) return RISK_COLORS.critical
  if (score >= 0.3) return lerpColor(RISK_COLORS.high, RISK_COLORS.critical, (score - 0.3) / 0.2)
  if (score >= 0.1) return lerpColor(RISK_COLORS.medium, RISK_COLORS.high, (score - 0.1) / 0.2)
  return lerpColor(RISK_COLORS.low, RISK_COLORS.medium, score / 0.1)
}

/** Map a lift value to a background color class string */
function liftToColor(lift: number): string {
  if (lift >= 2) return 'bg-risk-critical/30 text-risk-critical'
  if (lift >= 1.5) return 'bg-risk-high/25 text-risk-high'
  if (lift >= 1) return 'bg-risk-medium/20 text-risk-medium'
  return 'bg-zinc-700/30 text-text-muted'
}

function liftToBadgeColor(lift: number): string {
  if (lift >= 2) return 'bg-risk-critical/20 text-risk-critical border border-risk-critical/30'
  if (lift >= 1.5) return 'bg-risk-high/20 text-risk-high border border-risk-high/30'
  if (lift >= 1) return 'bg-risk-medium/20 text-risk-medium border border-risk-medium/30'
  return 'bg-zinc-700/30 text-text-muted border border-border/30'
}

// =============================================================================
// Custom Tooltip Components
// =============================================================================

function BarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; count: number; percentage: number; avg_risk_score: number } }> }) {
  const { t } = useTranslation('redflags')
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border/50 bg-background-card px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-text-primary mb-1">{d.label}</p>
      <p className="text-text-secondary">{t('tooltip.contracts', { count: formatNumber(d.count), pct: d.percentage.toFixed(1) })}</p>
      <p className="text-text-muted">{t('tooltip.avgRisk', { value: (d.avg_risk_score * 100).toFixed(1) })}</p>
    </div>
  )
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; count: number; percentage: number; avg_risk_score: number } }> }) {
  const { t } = useTranslation('redflags')
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border/50 bg-background-card px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-text-primary mb-1">{d.label}</p>
      <p className="text-text-secondary">{t('tooltip.frequency', { value: d.percentage.toFixed(1) })}</p>
      <p className="text-text-secondary">{t('tooltip.avgRisk', { value: (d.avg_risk_score * 100).toFixed(1) })}</p>
      <p className="text-text-muted">{formatNumber(d.count)} contracts</p>
    </div>
  )
}

// =============================================================================
// Sub-Components
// =============================================================================

/** Consolidate raw factors into groups, summing counts and weight-averaging risk scores */
function consolidateFactors(data: RiskFactorFrequency[]): Array<RiskFactorFrequency & { label: string }> {
  const groups = new Map<string, { count: number; riskSum: number; percentage: number }>()
  for (const d of data) {
    const group = getFactorGroup(d.factor)
    const existing = groups.get(group)
    if (existing) {
      existing.count += d.count
      existing.riskSum += d.avg_risk_score * d.count
      existing.percentage += d.percentage
    } else {
      groups.set(group, { count: d.count, riskSum: d.avg_risk_score * d.count, percentage: d.percentage })
    }
  }
  return Array.from(groups.entries()).map(([group, { count, riskSum, percentage }]) => ({
    factor: group,
    label: getFactorLabel(group),
    count,
    avg_risk_score: count > 0 ? riskSum / count : 0,
    percentage,
  }))
}

/** L1: Factor Frequency Horizontal Bar Chart */
function FactorFrequencyChart({
  data,
  onFactorClick,
}: {
  data: RiskFactorFrequency[]
  onFactorClick?: (factor: string) => void
}) {
  const { t } = useTranslation('redflags')
  const [showAll, setShowAll] = useState(false)

  const allData = useMemo(() => {
    return consolidateFactors(data).sort((a, b) => b.count - a.count)
  }, [data])

  const chartData = showAll ? allData : allData.slice(0, 15)
  const chartHeight = Math.min(600, Math.max(300, chartData.length * 36))

  return (
    <div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
              return String(v)
            }}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={170}
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            maxBarSize={24}
            style={{ cursor: onFactorClick ? 'pointer' : 'default' }}
            onClick={(_data: unknown, index: number) => {
              if (onFactorClick) onFactorClick(chartData[index].factor)
            }}
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={riskScoreToColor(entry.avg_risk_score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {allData.length > 15 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs text-accent hover:text-accent underline underline-offset-2 transition-colors"
        >
          {showAll
            ? t('factorFrequency.showTop')
            : t('factorFrequency.showAll', { count: allData.length })}
        </button>
      )}
    </div>
  )
}

/** L2: Co-occurrence Heatmap */
function CooccurrenceHeatmap({ cooccurrences, factors }: { cooccurrences: FactorCooccurrence[]; factors: string[] }) {
  const { t } = useTranslation('redflags')
  // Filter to only interesting co-occurrences (lift > 1.0)
  const filteredCooccurrences = useMemo(() => cooccurrences.filter(c => c.lift > 1.0), [cooccurrences])

  // Build a lookup map: factorA+factorB -> lift
  const liftMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of filteredCooccurrences) {
      m.set(`${c.factor_a}|${c.factor_b}`, c.lift)
      m.set(`${c.factor_b}|${c.factor_a}`, c.lift)
    }
    return m
  }, [filteredCooccurrences])

  // Use only factors that appear in at least one co-occurrence pair with lift > 1.0
  const relevantFactors = useMemo(() => {
    const seen = new Set<string>()
    for (const c of filteredCooccurrences) {
      seen.add(c.factor_a)
      seen.add(c.factor_b)
    }
    return factors.filter((f) => seen.has(f))
  }, [factors, filteredCooccurrences])

  if (relevantFactors.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        {t('worstCombinations.heatmapEmpty')}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs" role="grid" aria-label="Risk factor co-occurrence heatmap">
        <thead>
          <tr>
            <th className="sticky left-0 bg-background-card z-10 p-1.5 text-left text-text-muted font-normal min-w-[100px]" />
            {relevantFactors.map((f) => (
              <th
                key={f}
                className="p-1.5 text-text-muted font-normal whitespace-nowrap"
                style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', maxHeight: 120 }}
              >
                {getFactorLabel(f)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {relevantFactors.map((rowFactor) => (
            <tr key={rowFactor}>
              <td className="sticky left-0 bg-background-card z-10 p-1.5 text-text-secondary font-medium whitespace-nowrap">
                {getFactorLabel(rowFactor)}
              </td>
              {relevantFactors.map((colFactor) => {
                if (rowFactor === colFactor) {
                  return (
                    <td key={colFactor} className="p-1 text-center">
                      <div className="w-10 h-8 rounded bg-zinc-800/50 flex items-center justify-center text-text-muted">
                        --
                      </div>
                    </td>
                  )
                }
                const lift = liftMap.get(`${rowFactor}|${colFactor}`)
                if (lift === undefined) {
                  return (
                    <td key={colFactor} className="p-1 text-center">
                      <div className="w-10 h-8 rounded bg-zinc-900/30 flex items-center justify-center text-text-muted">
                        -
                      </div>
                    </td>
                  )
                }
                return (
                  <td key={colFactor} className="p-1 text-center">
                    <div
                      className={cn('w-10 h-8 rounded flex items-center justify-center text-xs font-mono font-medium', liftToColor(lift))}
                      title={`${getFactorLabel(rowFactor)} + ${getFactorLabel(colFactor)}: lift = ${lift.toFixed(2)}`}
                    >
                      {lift.toFixed(1)}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** L3: Worst Combinations Ranked List */
function WorstCombinations({
  cooccurrences,
  onPairClick,
}: {
  cooccurrences: FactorCooccurrence[]
  onPairClick?: (factorA: string, factorB: string) => void
}) {
  const { t } = useTranslation('redflags')
  const top10 = useMemo(() => {
    return [...cooccurrences]
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 10)
  }, [cooccurrences])

  if (top10.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-text-muted text-sm">
        {t('worstCombinations.empty')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {top10.map((pair, i) => (
        <button
          key={`${pair.factor_a}-${pair.factor_b}`}
          onClick={() => onPairClick?.(pair.factor_a, pair.factor_b)}
          className="w-full text-left flex items-center gap-3 rounded-lg border border-border/20 bg-background-card/50 px-4 py-3 transition-colors hover:border-accent/30 hover:bg-background-elevated/50 group"
        >
          <span className="text-text-muted text-xs font-mono w-5 shrink-0">
            {i + 1}.
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-primary font-medium truncate">
                {getFactorLabel(pair.factor_a)}
              </span>
              <ArrowRight className="h-3 w-3 text-text-muted shrink-0" aria-hidden="true" />
              <span className="text-text-primary font-medium truncate">
                {getFactorLabel(pair.factor_b)}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {t('worstCombinations.contractsLift', { count: formatNumber(pair.count), lift: pair.lift.toFixed(1) })}
            </p>
          </div>

          <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold', liftToBadgeColor(pair.lift))}>
            {pair.lift.toFixed(2)}x
          </span>

          {onPairClick && (
            <ArrowRight className="h-3.5 w-3.5 text-text-muted/50 group-hover:text-accent transition-colors shrink-0" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  )
}

/** L4: Factor-Risk Correlation Scatter Chart */
function FactorRiskScatter({
  data,
  onFactorClick,
}: {
  data: RiskFactorFrequency[]
  onFactorClick?: (factor: string) => void
}) {
  const { t } = useTranslation('redflags')
  const chartData = useMemo(() => {
    return consolidateFactors(data).map((d) => ({
      ...d,
      // Scale count for ZAxis bubble sizing
      bubbleSize: Math.max(d.count, 1),
    }))
  }, [data])

  // Compute domain bounds for padding
  const maxPct = useMemo(() => Math.max(...chartData.map((d) => d.percentage), 1), [chartData])
  const maxRisk = useMemo(() => Math.max(...chartData.map((d) => d.avg_risk_score), 0.1), [chartData])
  const maxCount = useMemo(() => Math.max(...chartData.map((d) => d.count), 1), [chartData])

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
        <XAxis
          type="number"
          dataKey="percentage"
          name="Frequency"
          domain={[0, Math.ceil(maxPct * 1.1)]}
          tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--color-border)' }}
          label={{ value: t('factorRiskScatter.xAxisLabel'), position: 'insideBottom', offset: -10, fill: 'var(--color-text-muted)', fontSize: 11 }}
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
        />
        <YAxis
          type="number"
          dataKey="avg_risk_score"
          name="Avg Risk"
          domain={[0, Math.min(Math.ceil(maxRisk * 120) / 100, 1)]}
          tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--color-border)' }}
          label={{ value: t('factorRiskScatter.yAxisLabel'), angle: -90, position: 'insideLeft', offset: 0, fill: 'var(--color-text-muted)', fontSize: 11 }}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
        />
        <ZAxis type="number" dataKey="bubbleSize" range={[60, 300]} domain={[0, maxCount]} />
        <RechartsTooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-border)' }} />
        {/* Quadrant guide lines */}
        <ReferenceLine
          x={maxPct / 2}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="4 4"
        />
        <ReferenceLine
          y={0.25}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="4 4"
          label={{ value: t('factorRiskScatter.riskThreshold'), fill: 'var(--color-text-muted)', fontSize: 9, position: 'right' }}
        />
        <Scatter
          data={chartData}
          shape="circle"
          style={{ cursor: onFactorClick ? 'pointer' : 'default' }}
          onClick={(data: { factor?: string }) => {
            if (onFactorClick && data?.factor) onFactorClick(data.factor)
          }}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={riskScoreToColor(entry.avg_risk_score)} fillOpacity={0.45} stroke={riskScoreToColor(entry.avg_risk_score)} strokeWidth={1} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function RedFlagsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      {/* Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      {/* Danger zone */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        </CardContent>
      </Card>
      {/* Bar chart */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={400} type="bar" />
        </CardContent>
      </Card>
      {/* Two columns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><Skeleton className="h-5 w-44" /></CardHeader>
          <CardContent><Skeleton className="h-[300px]" /></CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-44" /></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Scatter */}
      <Card>
        <CardHeader><Skeleton className="h-5 w-52" /></CardHeader>
        <CardContent><ChartSkeleton height={360} type="line" /></CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function RedFlags() {
  const navigate = useNavigate()
  const { t } = useTranslation('redflags')
  const [sectorId, setSectorId] = useState<number | undefined>(undefined)
  const [year, setYear] = useState<number | undefined>(undefined)
  const [showHeatmap, setShowHeatmap] = useState(false)

  // Fetch risk factor analysis
  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['risk-factor-analysis', sectorId, year],
    queryFn: () => analysisApi.getRiskFactorAnalysis(sectorId, year),
    staleTime: 5 * 60 * 1000,
  })

  // Derive unique factor keys from the frequency data (for heatmap axes)
  const factorKeys = useMemo(() => {
    if (!analysis?.factor_frequencies) return []
    return analysis.factor_frequencies.map((f) => f.factor)
  }, [analysis])

  // Year options (2015-2025)
  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = 2025; y >= 2015; y--) years.push(y)
    return years
  }, [])

  const frequencies = analysis?.factor_frequencies ?? []
  const cooccurrences = analysis?.top_cooccurrences ?? []
  const totalWithFactors = analysis?.total_contracts_with_factors ?? 0

  // Danger zone: top 3 co-occurrences by lift × log10(count) — balances signal strength with volume
  const dangerZone = useMemo(() => {
    if (!cooccurrences.length) return []
    return [...cooccurrences]
      .sort((a, b) => (b.lift * Math.log10(b.count + 1)) - (a.lift * Math.log10(a.count + 1)))
      .slice(0, 3)
  }, [cooccurrences])

  if (isLoading) return <RedFlagsSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-10 w-10 text-risk-critical" />
        <p className="text-text-secondary text-sm">{t('errorMessage')}</p>
        <p className="text-text-muted text-xs">{t('errorHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Hero Header */}
      {/* ---------------------------------------------------------------- */}
      <PageHero
        trackingLabel={t('trackingLabel')}
        icon={<Fingerprint className="h-4 w-4 text-accent" />}
        headline={formatNumber(totalWithFactors)}
        subtitle={t('heroSubtitle')}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Filters */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sector filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="sector-filter" className="text-xs text-text-muted">{t('filters.sector')}</label>
          <select
            id="sector-filter"
            value={sectorId ?? ''}
            onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-md border border-border/40 bg-background-card px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">{t('filters.allSectors')}</option>
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>{s.nameEN}</option>
            ))}
          </select>
        </div>

        {/* Year filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="year-filter" className="text-xs text-text-muted">{t('filters.year')}</label>
          <select
            id="year-filter"
            value={year ?? ''}
            onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-md border border-border/40 bg-background-card px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">{t('filters.allYears')}</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Active filter pills */}
        {(sectorId || year) && (
          <button
            onClick={() => { setSectorId(undefined); setYear(undefined) }}
            className="text-xs text-accent hover:text-accent underline underline-offset-2 transition-colors"
          >
            {t('filters.clearFilters')}
          </button>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* L0: Danger Zone */}
      {/* ---------------------------------------------------------------- */}
      {dangerZone.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-risk-critical" aria-hidden="true" />
              <CardTitle>{t('dangerZone.title')}</CardTitle>
            </div>
            <CardDescription>{t('dangerZone.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-3">
              {dangerZone.map((pair, i) => (
                <button
                  key={`${pair.factor_a}-${pair.factor_b}`}
                  onClick={() => navigate(`/contracts?risk_factor=${pair.factor_a}`)}
                  className="text-left rounded-lg border border-risk-critical/30 bg-risk-critical/5 p-4 hover:bg-risk-critical/10 hover:border-risk-critical/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-mono text-risk-critical">{t('dangerZone.label', { rank: i + 1 })}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-risk-critical/50 group-hover:text-risk-critical shrink-0 mt-0.5 transition-colors" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-text-primary leading-snug">
                    {getFactorLabel(pair.factor_a)} <span className="text-text-muted mx-1">+</span> {getFactorLabel(pair.factor_b)}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                    <span className="text-risk-high font-mono">{t('dangerZone.liftLabel', { value: pair.lift.toFixed(1) })}</span>
                    <span>·</span>
                    <span>{t('dangerZone.contractsLabel', { count: formatNumber(pair.count) })}</span>
                  </div>
                  <p className="mt-2 text-xs text-accent group-hover:text-accent">{t('dangerZone.investigate')}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* L1: Factor Frequency */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <CardTitle>{t('factorFrequency.title')}</CardTitle>
          </div>
          <CardDescription>{t('factorFrequency.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {frequencies.length > 0 ? (
            <FactorFrequencyChart
              data={frequencies}
              onFactorClick={(factor) => navigate(`/contracts?risk_factor=${factor}`)}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-text-muted text-sm">
              {t('factorFrequency.empty')}
            </div>
          )}
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/20">
            <span className="text-xs text-text-muted">{t('factorFrequency.legendLabel')}</span>
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: RISK_COLORS.low }} />
              <span className="text-xs text-text-muted">{t('factorFrequency.low')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: RISK_COLORS.medium }} />
              <span className="text-xs text-text-muted">{t('factorFrequency.medium')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: RISK_COLORS.high }} />
              <span className="text-xs text-text-muted">{t('factorFrequency.high')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: RISK_COLORS.critical }} />
              <span className="text-xs text-text-muted">{t('factorFrequency.critical')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* L2 + L3: Worst Combinations + Heatmap (collapsed) */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <CardTitle>{t('worstCombinations.title')}</CardTitle>
          </div>
          <CardDescription>{t('worstCombinations.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorstCombinations
            cooccurrences={cooccurrences}
            onPairClick={(factorA, _factorB) => navigate(`/contracts?risk_factor=${factorA}`)}
          />

          {/* Collapsible heatmap section */}
          <div className="border-t border-border/20 pt-4">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="flex items-center gap-2 text-xs text-accent hover:text-accent transition-colors"
            >
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {showHeatmap ? t('worstCombinations.hideHeatmap') : t('worstCombinations.showHeatmap')}
            </button>

            {showHeatmap && (
              <div className="mt-4">
                <CooccurrenceHeatmap cooccurrences={cooccurrences} factors={factorKeys} />
                {/* Legend */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/20">
                  <span className="text-xs text-text-muted">{t('worstCombinations.liftLegend')}</span>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-5 rounded-sm bg-yellow-500/20" />
                    <span className="text-xs text-text-muted">1-1.5</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-5 rounded-sm bg-orange-500/25" />
                    <span className="text-xs text-text-muted">1.5-2</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-5 rounded-sm bg-red-500/30" />
                    <span className="text-xs text-text-muted">&gt;2</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* L4: Factor-Risk Correlation Scatter */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <CardTitle>{t('factorRiskScatter.title')}</CardTitle>
          </div>
          <CardDescription>{t('factorRiskScatter.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {frequencies.length > 0 ? (
            <FactorRiskScatter
              data={frequencies}
              onFactorClick={(factor) => navigate(`/contracts?risk_factor=${factor}`)}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-text-muted text-sm">
              {t('factorRiskScatter.empty')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Methodology Note */}
      {/* ---------------------------------------------------------------- */}
      <SectionDescription title={t('methodology.title')}>
        {t('methodology.content')}
      </SectionDescription>
    </div>
  )
}
