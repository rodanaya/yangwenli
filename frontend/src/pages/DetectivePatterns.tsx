/**
 * Intelligence Brief — Macro-to-Micro Procurement Analysis
 *
 * LEVEL 1: System Vital Signs (20-year structural health)
 * LEVEL 2: Administration Scorecard (regime-era comparison)
 * LEVEL 3: Threat Pattern Matrix (categorized red flags)
 * LEVEL 4: Year-over-Year Pulse (recent micro signals)
 * LEVEL 5: Model Intelligence (what the AI learned)
 * LEVEL 6: Anomaly Investigation Queue (deepest drill-down)
 */

import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn, formatNumber, formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'
import { AlertPanel } from '@/components/charts'
import { PATTERN_DESCRIPTIONS } from '@/lib/pattern-descriptions'
import type { AnomalyItem, YearOverYearChange } from '@/api/types'
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from '@/components/charts'
import {
  Fingerprint,
  UserX,
  CalendarDays,
  Scissors,
  GitMerge,
  TrendingUp,
  TrendingDown,
  Crown,
  Sparkles,
  Stamp,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Brain,
  ArrowRight,
  Globe,
  Microscope,
  Users,
  ShieldAlert,
  BarChart3,
  Minus,
  Eye,
  Target,
  Activity,
  DollarSign,
  Building2,
} from 'lucide-react'

// =============================================================================
// Constants
// =============================================================================

const ADMINISTRATIONS = [
  { name: 'Fox', start: 2001, end: 2006, color: '#3b82f6' },
  { name: 'Calderon', start: 2006, end: 2012, color: '#fb923c' },
  { name: 'Pena Nieto', start: 2012, end: 2018, color: '#f87171' },
  { name: 'AMLO', start: 2018, end: 2024, color: '#4ade80' },
  { name: 'Sheinbaum', start: 2024, end: 2030, color: '#60a5fa' },
]

interface PatternDef {
  id: string
  descriptionKey: string
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
  href: string
  group: 'competition' | 'financial' | 'institutional'
}

const PATTERNS: PatternDef[] = [
  {
    id: 'ghost', descriptionKey: 'single_bid', group: 'competition',
    title: 'Ghost Vendors', subtitle: 'Win >50% via single-bid procedures',
    icon: UserX, color: '#dc2626', href: '/contracts?risk_factor=single_bid',
  },
  {
    id: 'cobid', descriptionKey: 'co_bid', group: 'competition',
    title: 'Co-Bidding Rings', subtitle: 'Suspiciously high co-bid rates',
    icon: GitMerge, color: '#8b5cf6', href: '/contracts?risk_factor=co_bid',
  },
  {
    id: 'monopoly', descriptionKey: 'monopoly', group: 'competition',
    title: 'Sector Monopolies', subtitle: 'Vendors with >30% sector share',
    icon: Crown, color: '#ea580c', href: '/vendors?min_contracts=100',
  },
  {
    id: 'price', descriptionKey: 'price_anomaly', group: 'financial',
    title: 'Price Outliers', subtitle: 'Extreme overpricing flagged by IQR',
    icon: DollarSign, color: '#dc2626', href: '/contracts?risk_factor=price_anomaly',
  },
  {
    id: 'split', descriptionKey: 'split', group: 'financial',
    title: 'Split Contracts', subtitle: 'Same vendor + institution + day',
    icon: Scissors, color: '#eab308', href: '/contracts?risk_factor=threshold_splitting',
  },
  {
    id: 'december', descriptionKey: 'year_end', group: 'financial',
    title: 'December Rush', subtitle: 'Year-end budget dump contracts',
    icon: CalendarDays, color: '#ea580c', href: '/contracts?risk_factor=year_end_timing&risk_level=high',
  },
  {
    id: 'rubber', descriptionKey: 'rubber', group: 'institutional',
    title: 'Rubber Stamp', subtitle: '>90% direct award rate',
    icon: Stamp, color: '#be123c', href: '/institutions',
  },
  {
    id: 'new', descriptionKey: 'new_vendor', group: 'institutional',
    title: 'New & Suspicious', subtitle: 'Recently registered, high risk',
    icon: Sparkles, color: '#eab308', href: '/vendors?risk_level=high',
  },
]

const PATTERN_GROUPS = [
  { key: 'competition', title: 'Competition Threats', icon: Users, description: 'Patterns that undermine competitive bidding' },
  { key: 'financial', title: 'Financial Red Flags', icon: DollarSign, description: 'Pricing and spending anomalies' },
  { key: 'institutional', title: 'Institutional Concerns', icon: Building2, description: 'Systemic institutional weaknesses' },
] as const

// =============================================================================
// Utility: color intensity based on metric value
// =============================================================================

function metricIntensity(value: number, low: number, high: number): string {
  if (value <= low) return RISK_COLORS.low
  if (value >= high) return RISK_COLORS.critical
  const mid = (low + high) / 2
  return value <= mid ? RISK_COLORS.medium : RISK_COLORS.high
}

// =============================================================================
// Main Component
// =============================================================================

export function DetectivePatterns() {
  const navigate = useNavigate()
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined)
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)

  // --- Data fetching ---
  const { data: patternData } = useQuery({
    queryKey: ['patterns', 'counts'],
    queryFn: () => analysisApi.getPatternCounts(),
    staleTime: 10 * 60 * 1000,
  })

  const { data: anomalies, isLoading: anomaliesLoading } = useQuery({
    queryKey: ['analysis', 'anomalies', severityFilter],
    queryFn: () => analysisApi.getAnomalies(severityFilter),
    staleTime: 5 * 60 * 1000,
  })

  const { data: yoyData, isLoading: yoyLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 10 * 60 * 1000,
  })

  // --- LEVEL 1: System vital signs (sparkline data + deltas) ---
  const vitals = useMemo(() => {
    if (!yoyData?.data || yoyData.data.length < 5) return null
    const data = yoyData.data.filter((d: YearOverYearChange) => d.year >= 2002)
    if (data.length < 5) return null

    const latest = data[data.length - 1]
    const prev = data[data.length - 2]
    const recent5 = data.slice(-5)
    const early5 = data.slice(0, 5)

    const avg = (arr: YearOverYearChange[], key: keyof YearOverYearChange) =>
      arr.reduce((s, d) => s + (Number(d[key]) || 0), 0) / arr.length

    // Sparkline data: last 15 years for visual clarity
    const sparkYears = data.filter((d: YearOverYearChange) => d.year >= 2010)

    return {
      latestYear: latest.year,
      prevYear: prev.year,
      totalContracts: data.reduce((s: number, d: YearOverYearChange) => s + d.contracts, 0),
      totalValue: data.reduce((s: number, d: YearOverYearChange) => s + (d.total_value ?? d.value_mxn ?? 0), 0),
      metrics: {
        da: {
          label: 'Direct Awards', icon: Eye,
          current: latest.direct_award_pct,
          spark: sparkYears.map((d: YearOverYearChange) => d.direct_award_pct),
          delta5yr: avg(recent5, 'direct_award_pct') - avg(early5, 'direct_award_pct'),
          yoy: latest.direct_award_pct - prev.direct_award_pct,
          unit: '%', invertColor: true,
          color: '#58a6ff',
        },
        sb: {
          label: 'Single Bid', icon: Target,
          current: latest.single_bid_pct,
          spark: sparkYears.map((d: YearOverYearChange) => d.single_bid_pct),
          delta5yr: avg(recent5, 'single_bid_pct') - avg(early5, 'single_bid_pct'),
          yoy: latest.single_bid_pct - prev.single_bid_pct,
          unit: '%', invertColor: true,
          color: RISK_COLORS.medium,
        },
        hr: {
          label: 'High Risk', icon: ShieldAlert,
          current: latest.high_risk_pct,
          spark: sparkYears.map((d: YearOverYearChange) => d.high_risk_pct),
          delta5yr: avg(recent5, 'high_risk_pct') - avg(early5, 'high_risk_pct'),
          yoy: latest.high_risk_pct - prev.high_risk_pct,
          unit: '%', invertColor: true,
          color: RISK_COLORS.high,
        },
        vendors: {
          label: 'Active Vendors', icon: Users,
          current: latest.vendor_count,
          spark: sparkYears.map((d: YearOverYearChange) => d.vendor_count),
          delta5yr: ((avg(recent5, 'vendor_count') - avg(early5, 'vendor_count')) / avg(early5, 'vendor_count')) * 100,
          yoy: prev.vendor_count > 0 ? ((latest.vendor_count - prev.vendor_count) / prev.vendor_count) * 100 : 0,
          unit: '', invertColor: false,
          color: RISK_COLORS.low,
        },
      },
      // Micro YoY details
      yoyContracts: prev.contracts > 0 ? ((latest.contracts - prev.contracts) / prev.contracts) * 100 : 0,
      yoyValue: (() => {
        const pv = prev.total_value ?? prev.value_mxn ?? 0
        const lv = latest.total_value ?? latest.value_mxn ?? 0
        return pv > 0 ? ((lv - pv) / pv) * 100 : 0
      })(),
      latestContracts: latest.contracts,
      latestVendors: latest.vendor_count,
    }
  }, [yoyData])

  // --- LEVEL 2: Administration scorecard ---
  interface AdminScore {
    name: string; color: string; period: string; years: number
    contracts: number; value: number; avgDA: number; avgSB: number; avgHR: number; avgVendors: number
  }
  const adminScorecard = useMemo((): AdminScore[] => {
    if (!yoyData?.data) return []
    const data = yoyData.data.filter((d: YearOverYearChange) => d.year >= 2002)

    const results: AdminScore[] = []
    for (const admin of ADMINISTRATIONS) {
      const years = data.filter((d: YearOverYearChange) => d.year >= admin.start && d.year < admin.end)
      if (!years.length) continue
      const avg = (key: keyof YearOverYearChange) =>
        years.reduce((s, d) => s + (Number(d[key]) || 0), 0) / years.length
      results.push({
        name: admin.name,
        color: admin.color,
        period: `${Math.max(admin.start, 2002)}-${Math.min(admin.end, 2026)}`,
        years: years.length,
        contracts: years.reduce((s, d) => s + d.contracts, 0),
        value: years.reduce((s, d) => s + (d.total_value ?? d.value_mxn ?? 0), 0),
        avgDA: avg('direct_award_pct'),
        avgSB: avg('single_bid_pct'),
        avgHR: avg('high_risk_pct'),
        avgVendors: avg('vendor_count'),
      })
    }
    return results
  }, [yoyData])

  // --- Pattern counts ---
  const counts: Record<string, number | undefined> = useMemo(() => {
    const c = patternData?.counts
    if (!c) return {}
    return {
      ghost: c.critical,
      december: c.december_rush,
      split: c.split_contracts,
      cobid: c.co_bidding,
      price: c.price_outliers,
      monopoly: undefined,
      new: undefined,
      rubber: undefined,
    }
  }, [patternData])

  const handleInvestigateAnomaly = (anomaly: AnomalyItem) => {
    const params = new URLSearchParams()
    if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
      params.set('risk_level', anomaly.severity)
    }
    switch (anomaly.anomaly_type) {
      case 'single_bid_cluster':
      case 'high_single_bid':
        params.set('is_single_bid', 'true')
        break
      case 'vendor_concentration':
        break
      case 'direct_award_cluster':
        params.set('is_direct_award', 'true')
        break
      case 'year_end_spike':
        params.set('month', '12')
        break
    }
    navigate(`/contracts?${params.toString()}`)
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-accent" />
            Intelligence Brief
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Macro-to-micro procurement analysis — system health, structural patterns, active signals
          </p>
        </div>
        {vitals && (
          <div className="text-right hidden sm:block">
            <p className="text-xs text-text-muted font-mono">
              {formatNumber(vitals.totalContracts)} contracts analyzed
            </p>
            <p className="text-xs text-text-secondary font-mono">
              {formatCompactMXN(vitals.totalValue)} total value
            </p>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* LEVEL 1: SYSTEM VITAL SIGNS                                        */}
      {/* ================================================================== */}
      <div>
        <SectionLabel icon={Activity} label="Level 1" title="System Vital Signs" description="20-year structural health indicators with trend direction" />
        {yoyLoading || !vitals ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[120px]" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-3">
            {Object.entries(vitals.metrics).map(([key, m]) => (
              <VitalCard key={key} {...m} />
            ))}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* LEVEL 2: ADMINISTRATION SCORECARD                                  */}
      {/* ================================================================== */}
      <div>
        <SectionLabel icon={Globe} label="Level 2" title="Administration Scorecard" description="Average procurement health metrics by presidential administration" />
        {yoyLoading || !adminScorecard.length ? (
          <Skeleton className="h-[200px] mt-3" />
        ) : (
          <Card className="mt-3">
            <CardContent className="pt-4 pb-3 px-3">
              {/* Header row */}
              <div className="grid grid-cols-[120px_1fr_1fr_1fr_80px] gap-2 mb-2 px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Administration</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Direct Awards</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Single Bid</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">High Risk</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted text-right">Contracts</span>
              </div>
              {/* Data rows */}
              <div className="space-y-1">
                {adminScorecard.map((admin, i) => (
                  <div
                    key={admin.name}
                    className={cn(
                      'grid grid-cols-[120px_1fr_1fr_1fr_80px] gap-2 items-center px-1 py-1.5 rounded-md',
                      i % 2 === 0 ? 'bg-background-elevated/20' : ''
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: admin.color }}
                      />
                      <div>
                        <span className="text-xs font-medium text-text-primary">{admin.name}</span>
                        <span className="text-xs text-text-secondary ml-1">{admin.period}</span>
                      </div>
                    </div>
                    <MetricBar value={admin.avgDA} max={100} color={metricIntensity(admin.avgDA, 60, 85)} />
                    <MetricBar value={admin.avgSB} max={100} color={metricIntensity(admin.avgSB, 35, 60)} />
                    <MetricBar value={admin.avgHR} max={20} color={metricIntensity(admin.avgHR, 8, 13)} />
                    <span className="text-xs font-mono tabular-nums text-text-muted text-right">
                      {formatNumber(admin.contracts)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-2 px-1">
                Bar color: green = healthier, red = worse. Bar width proportional to percentage.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ================================================================== */}
      {/* LEVEL 3: THREAT PATTERN MATRIX                                     */}
      {/* ================================================================== */}
      <div>
        <SectionLabel icon={Target} label="Level 3" title="Active Threat Patterns" description="Categorized red flags detected across 3.1M contracts — click to expand" />
        <div className="grid gap-4 lg:grid-cols-3 mt-3">
          {PATTERN_GROUPS.map((group) => {
            const GroupIcon = group.icon
            const groupPatterns = PATTERNS.filter((p) => p.group === group.key)
            return (
              <Card key={group.key}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center gap-2">
                    <GroupIcon className="h-3.5 w-3.5 text-accent" />
                    <CardTitle className="text-xs">{group.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{group.description}</CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-0.5">
                  {groupPatterns.map((pattern) => {
                    const Icon = pattern.icon
                    const count = counts[pattern.id]
                    const isExpanded = expandedPattern === pattern.id
                    const desc = PATTERN_DESCRIPTIONS[pattern.descriptionKey]

                    return (
                      <div key={pattern.id}>
                        <button
                          className={cn(
                            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors',
                            isExpanded ? 'bg-accent/[0.08]' : 'hover:bg-background-elevated/50'
                          )}
                          onClick={() => setExpandedPattern(isExpanded ? null : pattern.id)}
                          aria-expanded={isExpanded}
                        >
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded shrink-0"
                            style={{ backgroundColor: `${pattern.color}15`, color: pattern.color }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-text-primary block">{pattern.title}</span>
                            <span className="text-xs text-text-muted">{pattern.subtitle}</span>
                          </div>
                          <div className="shrink-0 text-right flex items-center gap-1.5">
                            {count !== undefined ? (
                              <span className="text-xs font-mono tabular-nums text-text-primary">
                                {formatNumber(count)}
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted">--</span>
                            )}
                            <ChevronDown
                              className={cn('h-3 w-3 text-text-muted transition-transform', isExpanded && 'rotate-180')}
                            />
                          </div>
                        </button>

                        {isExpanded && desc && (
                          <div className="mx-2.5 mb-2 mt-1 px-3 py-2.5 bg-accent/[0.03] rounded border border-accent/10">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <DetailBlock title="What it is" text={desc.what} />
                                <DetailBlock title="Detection" text={desc.howDetected} />
                              </div>
                              <div className="space-y-2">
                                <DetailBlock title="Real case" text={desc.realExample} italic />
                                <DetailBlock title="Why it matters" text={desc.whyItMatters} />
                              </div>
                            </div>
                            <Link
                              to={pattern.href}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline mt-2"
                            >
                              Investigate
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ================================================================== */}
      {/* LEVEL 4: YEAR-OVER-YEAR PULSE                                      */}
      {/* ================================================================== */}
      {vitals && (
        <div>
          <SectionLabel icon={Microscope} label="Level 4" title={`Year-over-Year Pulse (${vitals.prevYear} to ${vitals.latestYear})`} description="Recent micro-shifts — early warning indicators for emerging patterns" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-3">
            <PulseCard
              icon={BarChart3}
              label="Contract Volume"
              value={vitals.yoyContracts}
              suffix="%"
              detail={`${formatNumber(vitals.latestContracts)} contracts in ${vitals.latestYear}`}
              thresholds={[-15, 15]}
              invertSeverity={false}
            />
            <PulseCard
              icon={Users}
              label="Vendor Pool"
              value={vitals.metrics.vendors.yoy}
              suffix="%"
              detail={`${formatNumber(vitals.latestVendors)} active vendors`}
              thresholds={[-10, 999]}
              invertSeverity={true}
            />
            <PulseCard
              icon={ShieldAlert}
              label="Direct Award Shift"
              value={vitals.metrics.da.yoy}
              suffix=" pp"
              detail={vitals.metrics.da.yoy > 0 ? 'Less transparent' : 'More competitive'}
              thresholds={[-3, 3]}
              invertSeverity={false}
            />
            <PulseCard
              icon={AlertTriangle}
              label="Risk Level Shift"
              value={vitals.metrics.hr.yoy}
              suffix=" pp"
              detail="High+critical risk rate change"
              thresholds={[-1, 1]}
              invertSeverity={false}
            />
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* LEVEL 5: MODEL INTELLIGENCE                                        */}
      {/* ================================================================== */}
      <div>
        <SectionLabel icon={Brain} label="Level 5" title="Model Intelligence" description="Key findings from v5.0 per-sector risk model (AUC 0.960)" />
        <div className="rounded-lg border border-accent/20 bg-accent/[0.03] p-4 mt-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              What the data reveals vs. what experts assumed
            </span>
            <Link
              to="/methodology"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Full methodology
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            <Insight color={RISK_COLORS.critical} tag="18.7x">
              <strong>Vendor concentration</strong> is the single most predictive indicator of corruption.
            </Insight>
            <Insight color="#58a6ff" tag="reversed">
              <strong>Direct awards</strong> are actually <em>less</em> common in known corruption cases.
            </Insight>
            <Insight color="#58a6ff" tag="reversed">
              <strong>Short ad periods</strong> show a reversed signal — corrupt vendors use normal timelines.
            </Insight>
            <Insight color={RISK_COLORS.high} tag="+0.21">
              <strong>Industry mismatch</strong> — out-of-sector work is a strong red flag.
            </Insight>
            <Insight color="var(--color-text-muted)" tag="0.000">
              <strong>Co-bidding</strong> provides zero signal in current ground truth data.
            </Insight>
            <Insight color="#58a6ff" tag="reversed">
              <strong>Network membership</strong> — known-bad vendors operate as standalone players.
            </Insight>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* LEVEL 6: ANOMALY INVESTIGATION QUEUE                               */}
      {/* ================================================================== */}
      <div>
        <SectionLabel icon={AlertTriangle} label="Level 6" title="Investigation Queue" description={`${anomalies?.total || 0} detected anomalies requiring investigation — deepest drill-down`} />
        <Card className="mt-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Filter by severity to prioritize</CardDescription>
              <div className="flex gap-1.5">
                {['all', 'critical', 'high', 'medium'].map((severity) => (
                  <Button
                    key={severity}
                    variant={severityFilter === (severity === 'all' ? undefined : severity) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSeverityFilter(severity === 'all' ? undefined : severity)}
                    className="capitalize h-7 text-xs px-2.5"
                  >
                    {severity}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {anomaliesLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <AlertPanel
                anomalies={anomalies?.data || []}
                maxItems={8}
                onInvestigate={handleInvestigateAnomaly}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-xs text-text-muted font-mono text-center pb-4">
        OECD / IMF CRI / EU ARACHNE / WORLD BANK INT METHODOLOGIES
      </div>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

/** Section label with level indicator */
function SectionLabel({ icon: Icon, label, title, description }: {
  icon: React.ElementType; label: string; title: string; description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-accent font-mono">{label}</span>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        </div>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
    </div>
  )
}

/** Vital sign card with sparkline */
function VitalCard({ label, icon: Icon, current, spark, delta5yr, unit, invertColor, color }: {
  label: string; icon: React.ElementType; current: number; spark: number[]
  delta5yr: number; unit: string; invertColor: boolean; color: string
}) {
  const isUp = delta5yr > 0
  const isBad = invertColor ? isUp : !isUp
  const trendColor = Math.abs(delta5yr) < 1
    ? 'var(--color-text-muted)'
    : isBad ? RISK_COLORS.high : RISK_COLORS.low
  const TrendIcon = Math.abs(delta5yr) < 1 ? Minus : isUp ? TrendingUp : TrendingDown

  const sparkData = spark.map((v) => ({ v }))

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" style={{ color }} />
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</span>
          </div>
          <TrendIcon className="h-3.5 w-3.5" style={{ color: trendColor }} />
        </div>
        <p className="text-lg font-bold text-text-primary font-mono tabular-nums">
          {unit === '%' ? `${current.toFixed(1)}%` : formatNumber(current)}
        </p>
        <div className="h-[28px] mt-1 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs font-mono" style={{ color: trendColor }}>
            {delta5yr > 0 ? '+' : ''}{delta5yr.toFixed(1)}{invertColor ? ' pp' : '%'}
          </span>
          <span className="text-xs text-text-muted">20yr shift</span>
        </div>
      </CardContent>
    </Card>
  )
}

/** Horizontal metric bar for administration scorecard */
function MetricBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-3 bg-background-elevated rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-all"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums text-text-muted w-10 text-right">
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

/** Year-over-year pulse card */
function PulseCard({ icon: Icon, label, value, suffix, detail, thresholds, invertSeverity }: {
  icon: React.ElementType; label: string; value: number; suffix: string
  detail: string; thresholds: [number, number]; invertSeverity: boolean
}) {
  // Determine severity: is the change concerning?
  const isNeutral = value >= thresholds[0] && value <= thresholds[1]
  const isNegativeChange = value < thresholds[0]
  const isPositiveChange = value > thresholds[1]

  let severity: 'warning' | 'positive' | 'neutral'
  if (isNeutral) {
    severity = 'neutral'
  } else if (invertSeverity) {
    // For vendor pool: negative is warning, positive is good
    severity = isNegativeChange ? 'warning' : 'positive'
  } else {
    // For most metrics: positive change is warning (getting worse)
    severity = isPositiveChange ? 'warning' : 'positive'
  }

  const color =
    severity === 'warning' ? RISK_COLORS.high :
    severity === 'positive' ? RISK_COLORS.low :
    'var(--color-text-muted)'

  const bgClass =
    severity === 'warning' ? 'bg-risk-high/5 border-risk-high/20' :
    severity === 'positive' ? 'bg-risk-low/5 border-risk-low/20' :
    'bg-background-elevated/30 border-border/50'

  return (
    <div className={`rounded-lg border p-3 ${bgClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{label}</span>
      </div>
      <p className="text-lg font-bold font-mono tabular-nums" style={{ color }}>
        {value > 0 ? '+' : ''}{value.toFixed(1)}{suffix}
      </p>
      <p className="text-xs text-text-secondary mt-0.5">{detail}</p>
    </div>
  )
}

/** Detail text block for pattern expanded view */
function DetailBlock({ title, text, italic }: { title: string; text: string; italic?: boolean }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-0.5">{title}</h4>
      <p className={cn('text-xs text-text-secondary leading-relaxed', italic && 'italic')}>{text}</p>
    </div>
  )
}

/** Model insight bullet */
function Insight({ color, tag, children }: { color: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="mt-1 shrink-0 px-1 py-0.5 text-xs font-bold font-mono rounded"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {tag}
      </span>
      <p className="text-xs text-text-muted leading-relaxed">{children}</p>
    </div>
  )
}

export default DetectivePatterns
