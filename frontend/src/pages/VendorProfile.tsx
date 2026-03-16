import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge, Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCompactMXN, formatNumber, formatPercentSafe, formatDate, toTitleCase, formatCompactUSD, getRiskLevel } from '@/lib/utils'
import { vendorApi, networkApi, scorecardApi } from '@/api/client'
import { GradeBadge10, VendorScorecardCard } from '@/components/ui/ScorecardWidgets'
import type { VendorScorecardData } from '@/components/ui/ScorecardWidgets'
import { SanctionsAlertBanner } from '@/components/SanctionsAlertBanner'
import { WaterfallRiskChart } from '@/components/WaterfallRiskChart'
import { RedThreadPanel } from '@/components/RedThreadPanel'
import { PercentileBadge } from '@/components/PercentileBadge'
import { GenerateReportButton } from '@/components/GenerateReportButton'
import { RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import { parseFactorLabel, getFactorCategoryColor } from '@/lib/risk-factors'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { AddToWatchlistButton } from '@/components/AddToWatchlistButton'
import { AddToDossierButton } from '@/components/AddToDossierButton'
import { ChartDownloadButton } from '@/components/ChartDownloadButton'
import { TableExportButton } from '@/components/TableExportButton'
import { NarrativeCard } from '@/components/NarrativeCard'
import { RiskFeedbackButton } from '@/components/RiskFeedbackButton'
import { ContractDetailModal } from '@/components/ContractDetailModal'
import VendorContractTimeline from '@/components/VendorContractTimeline'
import VendorContractRiskMatrix from '@/components/VendorContractRiskMatrix'
import VendorContractBreakdown from '@/components/VendorContractBreakdown'
import { buildVendorNarrative } from '@/lib/narratives'
import type { ContractListItem, VendorExternalFlags, VendorWaterfallContribution, VendorQQWResponse, VendorSHAPResponse } from '@/api/types'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LabelList,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ReferenceArea,
  Legend as RechartsLegend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from '@/components/charts'
import {
  Users,
  Building2,
  FileText,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  DollarSign,
  BarChart3,
  TrendingUp,
  SlidersHorizontal,
  TrendingDown,
  Minus,
  Activity,
  Shield,
  Network,
  ShieldCheck,
  Brain,
  Download,
} from 'lucide-react'
import { NetworkGraphModal } from '@/components/NetworkGraphModal'
import { ScrollReveal, useCountUp, AnimatedFill } from '@/hooks/useAnimations'
import { cn } from '@/lib/utils'
import { motion, useInView } from 'framer-motion'
import { slideUp, staggerItem } from '@/lib/animations'
import { RiskWhisker } from '@/components/ui/risk-whisker'

// ============================================================================
// ScrollSection — editorial scroll-reveal wrapper
// ============================================================================
function ScrollSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isVisible = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Model coefficients for the waterfall chart (v6.0 global model, calibrated 2026-03-13)
// Source: RISK_METHODOLOGY_v6.md — Optuna TPE (C=1.28, l1_ratio=0.961)
// Negative coefficients (institution_diversity, ad_period_days)
// mean that HIGHER values of those features REDUCE risk.
// ============================================================================
const MODEL_COEFFICIENTS: Record<string, number> = {
  price_volatility:     1.156,
  institution_diversity: -0.436,
  win_rate:             -0.056,
  vendor_concentration: 0.863,
  sector_spread:        0.117,
  industry_mismatch:    0.305,
  same_day_count:       0.222,
  direct_award:         0.132,
  ad_period_days:       -0.104,
  network_member_count: 0.199,
  year_end:             0.059,
  institution_risk:     0.057,
  price_ratio:          -0.015,
  single_bid:           0.013,
  price_hyp_confidence: 0.001,
  co_bid_rate:          0.000,
}

// ============================================================================
// Simple Tabs implementation (no external dependency needed)
// ============================================================================
interface TabsProps {
  defaultTab: string
  tabs: Array<{ key: string; label: string; icon?: React.ElementType }>
  children: React.ReactNode
  onTabChange?: (tab: string) => void
}

function SimpleTabs({ defaultTab, tabs, children, onTabChange }: TabsProps) {
  const [active, setActive] = useState(defaultTab)
  const handleTabChange = (key: string) => {
    setActive(key)
    onTabChange?.(key)
  }
  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                active === tab.key
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-background-elevated/30'
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {tab.label}
            </button>
          )
        })}
      </div>
      {/* Render only the active tab panel */}
      {Array.isArray(children)
        ? (children as React.ReactElement[]).find((c) => (c?.props as any)?.tabKey === active)
        : children}
    </div>
  )
}

function TabPanel({ tabKey: _tabKey, children }: { tabKey: string; children: React.ReactNode }) {
  return <div>{children}</div>
}

// ============================================================================
// Risk Factor Waterfall Chart
// ============================================================================

interface WaterfallEntry {
  name: string
  factorKey: string
  contribution: number
  isNegative: boolean
}

function RiskWaterfallChart({
  riskFactors,
  riskScore,
}: {
  riskFactors: Array<{ factor: string; count: number; percentage: number }>
  riskScore: number
}) {
  const { t } = useTranslation('vendors')
  // Build waterfall data from top risk factors combined with model coefficients
  // We use percentage as a proxy for z-score contribution
  const data: WaterfallEntry[] = useMemo(() => {
    const entries: WaterfallEntry[] = riskFactors
      .map((f) => {
        // Normalize factor key: strip z_ prefix, lowercase
        const key = f.factor.replace(/^z_/, '').toLowerCase()
        const coeff = MODEL_COEFFICIENTS[key] ?? 0
        // Contribution = normalized percentage × coefficient sign
        // If coefficient is negative, high percentage → risk-reducing
        const normalizedPct = f.percentage / 100
        const contribution = normalizedPct * Math.abs(coeff) * (coeff >= 0 ? 1 : -1)
        return {
          name: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 14),
          factorKey: key,
          contribution,
          isNegative: contribution < 0,
        }
      })
      .filter((e) => Math.abs(e.contribution) > 0.001)
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 8)

    // Add total bar
    entries.push({
      name: t('waterfall.totalScore'),
      factorKey: '__total__',
      contribution: riskScore,
      isNegative: false,
    })

    return entries
  }, [riskFactors, riskScore])

  const maxVal = Math.max(...data.map((d) => Math.abs(d.contribution)), 0.1)

  const barColor = (entry: WaterfallEntry) => {
    if (entry.factorKey === '__total__') return RISK_COLORS[getRiskLevel(riskScore)]
    if (entry.isNegative) return '#4ade80'
    return entry.contribution > 0.15 ? '#f87171' : '#fb923c'
  }

  return (
    <div>
      <p className="text-xs text-text-muted mb-3">
        {t('waterfall.description')}
      </p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              domain={[-maxVal * 1.1, maxVal * 1.1]}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (active && payload?.[0]) {
                  const d = payload[0].payload as WaterfallEntry
                  return (
                    <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-text-primary mb-1">{d.name}</p>
                      <p className={d.isNegative ? 'text-risk-low' : 'text-risk-high'}>
                        {d.contribution >= 0 ? '+' : ''}{d.contribution.toFixed(3)} {t('waterfall.contribution')}
                      </p>
                      {d.factorKey !== '__total__' && (
                        <p className="text-text-muted mt-1">
                          {t('waterfall.modelCoefficient')}: {MODEL_COEFFICIENTS[d.factorKey]?.toFixed(3) ?? 'n/a'}
                        </p>
                      )}
                    </div>
                  )
                }
                return null
              }}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            <Bar dataKey="contribution" radius={[0, 4, 4, 0]} barSize={10}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={barColor(entry)}
                  fillOpacity={entry.factorKey === '__total__' ? 1 : 0.85}
                />
              ))}
              <LabelList
                dataKey="contribution"
                position="right"
                style={{ fontSize: 9, fill: 'rgba(148,163,184,0.8)' }}
                formatter={(v: unknown) => {
                  const n = Number(v)
                  return n !== 0 ? (n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2)) : ''
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-risk-critical/80" />
          <span className="text-[10px] text-text-muted">{t('waterfall.riskIncreasing')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-risk-low/80" />
          <span className="text-[10px] text-text-muted">{t('waterfall.riskReducing')}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Activity Calendar (GitHub-style heatmap)
// ============================================================================

function ActivityCalendar({
  contracts,
  sectorColor,
}: {
  contracts: ContractListItem[]
  sectorColor: string
}) {
  const { t } = useTranslation('vendors')
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Build a map of "year-month" -> { count, value }
  const cellMap = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>()
    for (const c of contracts) {
      if (!c.contract_year) continue
      // contract_date may be "YYYY-MM-DD" or absent; fall back to year only
      let month = 0
      if (c.contract_date) {
        const parts = c.contract_date.split('-')
        month = parts.length >= 2 ? parseInt(parts[1], 10) - 1 : 0
      }
      const key = `${c.contract_year}-${month}`
      const existing = map.get(key) || { count: 0, value: 0 }
      existing.count += 1
      existing.value += c.amount_mxn || 0
      map.set(key, existing)
    }
    return map
  }, [contracts])

  // Determine the last 5 years present in the data
  const years = useMemo(() => {
    const allYears = contracts.map((c) => c.contract_year).filter(Boolean) as number[]
    if (allYears.length === 0) return []
    const maxYear = Math.max(...allYears)
    return Array.from({ length: 5 }, (_, i) => maxYear - 4 + i)
  }, [contracts])

  const maxCount = useMemo(() => {
    let max = 0
    for (const v of cellMap.values()) max = Math.max(max, v.count)
    return max || 1
  }, [cellMap])

  const [hovered, setHovered] = useState<string | null>(null)

  if (years.length === 0) {
    return <p className="text-xs text-text-muted">{t('history.noCalendarData')}</p>
  }

  return (
    <div>
      <p className="text-xs text-text-muted mb-3">
        {t('history.calendarDescription')}
      </p>
      {/* Grid: rows = months, cols = years */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-[320px]">
          {/* Year headers */}
          <div className="flex mb-1 ml-8">
            {years.map((yr) => (
              <div key={yr} className="flex-1 text-center text-[10px] text-text-muted font-mono">
                {yr}
              </div>
            ))}
          </div>
          {/* Month rows */}
          {MONTHS.map((monthLabel, monthIdx) => (
            <div key={monthIdx} className="flex items-center gap-0.5 mb-0.5">
              <span className="text-[9px] text-text-muted w-8 flex-shrink-0 text-right pr-1">
                {monthLabel}
              </span>
              {years.map((yr) => {
                const key = `${yr}-${monthIdx}`
                const cell = cellMap.get(key)
                const count = cell?.count ?? 0
                const opacity = count === 0 ? 0.05 : 0.15 + (count / maxCount) * 0.85
                const tooltipKey = `${yr}-${monthIdx}`
                return (
                  <div
                    key={yr}
                    className="flex-1 h-[14px] rounded-sm cursor-default transition-transform hover:scale-110 relative"
                    style={{ backgroundColor: sectorColor, opacity }}
                    onMouseEnter={() => setHovered(tooltipKey)}
                    onMouseLeave={() => setHovered(null)}
                    title={
                      count > 0
                        ? `${MONTHS[monthIdx]} ${yr}: ${count} contract${count !== 1 ? 's' : ''} · ${formatCompactMXN(cell?.value ?? 0)}`
                        : `${MONTHS[monthIdx]} ${yr}: no contracts`
                    }
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Inline hovered tooltip info */}
      {hovered && (() => {
        const [yr, mo] = hovered.split('-').map(Number)
        const cell = cellMap.get(hovered)
        if (!cell) return null
        return (
          <p className="mt-2 text-xs text-text-secondary">
            <span className="font-semibold">{MONTHS[mo]} {yr}:</span>{' '}
            {cell.count} contract{cell.count !== 1 ? 's' : ''},{' '}
            {formatCompactMXN(cell.value)}
          </p>
        )
      })()}
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-text-muted">{t('history.calendarLess')}</span>
        {[0.05, 0.25, 0.5, 0.75, 1].map((op) => (
          <div
            key={op}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: sectorColor, opacity: op }}
          />
        ))}
        <span className="text-[10px] text-text-muted">{t('history.calendarMore')}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Risk Factor Radar Chart
// ============================================================================

// The 6 factors we want to surface on the radar, mapped from waterfall feature keys
const RADAR_FACTOR_KEYS = [
  {
    key: 'price_volatility',
    label: 'Price Volatility',
    plainEnglish: 'How wildly the vendor\'s contract amounts jump around. High volatility is the strongest predictor of corruption in the model.',
  },
  {
    key: 'vendor_concentration',
    label: 'Concentration',
    plainEnglish: 'What share of the sector\'s total spending goes to this vendor. Dominant market share is a major red flag.',
  },
  {
    key: 'win_rate',
    label: 'Win Rate',
    plainEnglish: 'How often this vendor wins when it bids, compared to the sector norm. Abnormally high win rates suggest unfair advantage.',
  },
  {
    key: 'direct_award',
    label: 'Direct Award',
    plainEnglish: 'Fraction of contracts awarded without a competitive tender. Direct awards bypass normal competitive safeguards.',
  },
  {
    key: 'industry_mismatch',
    label: 'Sector Mismatch',
    plainEnglish: 'Whether the vendor\'s business type matches the sector it contracts in. Out-of-sector vendors suggest industry mismatch fraud.',
  },
  {
    key: 'single_bid',
    label: 'Single Bid',
    plainEnglish: 'Fraction of competitive procedures where this vendor was the only bidder. Single-bid wins can indicate deterred competition.',
  },
]

function RiskRadarChart({ waterfallData }: { waterfallData: VendorWaterfallContribution[] }) {
  const radarData = useMemo(() => {
    // Build a lookup by feature key from the waterfall data
    const lookup = new Map<string, VendorWaterfallContribution>()
    for (const item of waterfallData) {
      lookup.set(item.feature, item)
    }

    return RADAR_FACTOR_KEYS.map(({ key, label, plainEnglish }) => {
      const item = lookup.get(key)
      if (!item) return { factor: label, plainEnglish, value: 0, rawZ: 0 }

      // Contribution is already coefficient × z_score. Normalise to [0,1] for the chart
      // by clamping to [-3, 3] z-score range and mapping to 0–1.
      const clampedZ = Math.max(-3, Math.min(3, item.z_score))
      // For negative-coefficient factors (like direct_award when negative), use absolute
      // z-score magnitude as the "presence" signal, but direction is shown via contribution
      const presence = (clampedZ + 3) / 6   // 0 = z=-3, 0.5 = z=0, 1 = z=+3
      return { factor: label, plainEnglish, value: Math.round(presence * 100) / 100, rawZ: item.z_score }
    })
  }, [waterfallData])

  const hasData = radarData.some((d) => d.value > 0)
  if (!hasData) {
    return (
      <p className="text-xs text-text-muted text-center py-4">
        No z-score data available for radar chart
      </p>
    )
  }

  return (
    <div>
      <p className="text-xs text-text-muted mb-2">
        Each axis shows how this vendor&apos;s z-score compares across 6 key risk dimensions.
        Values toward the edge = higher deviation from sector norms. Hover an axis label to learn what it measures.
      </p>
      {/*
       * Responsive height wrapper for the radar chart.
       * On small screens (< 640px) 250px gives enough room for the 6 axis
       * labels without cramping. On larger viewports the full 300px is used.
       * ResponsiveContainer fills its parent when height="100%".
       */}
      <div className="h-[250px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="factor"
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.65)' }}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload?.[0]) {
                const d = payload[0].payload as { factor: string; plainEnglish: string; value: number; rawZ: number }
                const zLabel = d.rawZ > 0
                  ? `${d.rawZ.toFixed(2)} SDs above sector average`
                  : d.rawZ < 0
                  ? `${Math.abs(d.rawZ).toFixed(2)} SDs below sector average`
                  : 'At sector average (z = 0)'
                return (
                  <div className="rounded border border-border bg-background-card px-3 py-2.5 text-xs shadow-lg max-w-[230px]">
                    <p className="font-semibold text-text-primary mb-1">{d.factor}</p>
                    <p className="text-text-muted mb-2 leading-relaxed">{d.plainEnglish}</p>
                    <p className="font-mono">
                      <span className="text-text-muted">z-score: </span>
                      <span className={d.rawZ > 1 ? 'text-risk-high font-semibold' : d.rawZ < -1 ? 'text-risk-low' : 'text-text-secondary'}>
                        {d.rawZ.toFixed(2)}
                      </span>
                    </p>
                    <p className="text-text-muted/70 mt-0.5 italic">{zLabel}</p>
                  </div>
                )
              }
              return null
            }}
          />
          <Radar
            dataKey="value"
            stroke="#06b6d4"
            fill="#06b6d4"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
      </div>
      {/* Axis legend */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {RADAR_FACTOR_KEYS.map(({ label, plainEnglish }) => (
          <div key={label} className="flex items-start gap-1.5 group">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-cyan-500/60 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-medium text-text-secondary">{label}: </span>
              <span className="text-[10px] text-text-muted/70">{plainEnglish.split('.')[0]}.</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Top Risk Factor Bars (top 3 contributing factors)
// ============================================================================

// Plain-English explanations for each risk factor, shown in factor bars
const FACTOR_EXPLANATIONS: Record<string, string> = {
  price_volatility: 'This vendor\'s contract amounts vary wildly — a hallmark of fraudulent invoicing.',
  vendor_concentration: 'This vendor holds an unusually large share of its sector\'s total contract value.',
  win_rate: 'This vendor wins contracts at a rate far above what would be expected by chance.',
  institution_diversity: 'This vendor serves fewer institutions than average (negative z-score). The model treats narrow buyer dependence as a risk signal — vendors with broad institutional reach are associated with lower risk.',
  sector_spread: 'This vendor operates across fewer sectors than its peers (negative z-score). Vendors with more diversified sector activity are associated with lower risk in the v6.0 model.',
  industry_mismatch: 'This vendor won contracts outside its core industry — a potential shell company indicator.',
  same_day_count: 'Multiple contracts were awarded to this vendor on the same day, consistent with threshold-splitting fraud.',
  direct_award: 'A high share of this vendor\'s contracts were awarded directly, bypassing competitive tendering.',
  single_bid: 'This vendor frequently wins procedures where it was the only bidder, suggesting deterred competition.',
  network_member_count: 'This vendor belongs to a network of related entities that bid together.',
  year_end: 'A disproportionate share of contracts were signed in December, consistent with year-end budget dumps.',
  price_ratio: 'Contract amounts are significantly above the sector median price for comparable goods/services.',
  ad_period_days: 'Procurement advertisements were unusually brief, limiting time for competitors to prepare bids.',
  price_hyp_confidence: 'Statistical analysis flags this vendor\'s prices as statistical outliers using IQR method.',
  co_bid_rate: 'This vendor frequently bids in the same procedures as other vendors in a coordinated pattern.',
  institution_risk: 'This vendor primarily contracts with institution types that have historically higher irregularity rates.',
}

function TopRiskFactorBars({ waterfallData }: { waterfallData: VendorWaterfallContribution[] }) {
  const topFactors = useMemo(() => {
    return [...waterfallData]
      .filter((f) => f.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3)
      .map((f) => ({
        name: f.feature,
        label: f.label_en || f.feature.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        score: f.contribution,
        explanation: FACTOR_EXPLANATIONS[f.feature] ?? `This factor contributed ${(f.contribution * 100).toFixed(1)} points to the risk score.`,
        zScore: f.z_score,
      }))
  }, [waterfallData])

  if (topFactors.length === 0) {
    return <p className="text-xs text-text-muted">No contributing risk factors found.</p>
  }

  const maxScore = Math.max(...topFactors.map((f) => f.score), 0.01)

  return (
    <div className="space-y-4">
      {topFactors.map((f, i) => (
        <div key={f.name} className="group">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-secondary font-medium">{f.label}</span>
            <span className="text-text-muted font-mono tabular-nums" title="Risk contribution score">
              z = {f.zScore?.toFixed(2) ?? '—'}
              <span className="text-text-muted/50 ml-1 text-[9px]">SDs above avg</span>
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min((f.score / maxScore) * 100, 100)}%`,
                background: i === 0
                  ? 'linear-gradient(90deg, #f87171, #dc2626)'
                  : i === 1
                  ? 'linear-gradient(90deg, #fb923c, #ea580c)'
                  : 'linear-gradient(90deg, #fbbf24, #d97706)',
              }}
            />
          </div>
          <p className="text-[11px] text-text-muted/80 mt-1 leading-relaxed">{f.explanation}</p>
        </div>
      ))}
      <p className="text-[10px] text-text-muted/50 border-t border-border/30 pt-2 mt-2">
        z-score = standard deviations above the sector-year average. Values above +2 are statistically unusual.
      </p>
    </div>
  )
}

// ============================================================================
// SHAP Explanation Panel (v5.2 per-vendor exact Shapley values)
// ============================================================================

function SHAPPanel({ shapData }: { shapData: VendorSHAPResponse }) {
  const allFactors = [
    ...shapData.top_risk_factors.map(f => ({ ...f, isRisk: true })),
    ...shapData.top_protect_factors.map(f => ({ ...f, isRisk: false })),
  ]
  const maxAbs = Math.max(...allFactors.map(f => Math.abs(f.shap)), 0.01)

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">
        SHAP values show the exact contribution of each factor to this vendor&apos;s risk score.
        Values computed from {shapData.n_contracts} contracts in this sector.
      </p>
      <div className="space-y-2">
        {shapData.top_risk_factors.map((f) => (
          <div key={f.factor}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-text-secondary font-medium">
                {f.factor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              <span className="text-risk-critical font-mono text-[10px]">+{f.shap.toFixed(3)}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-risk-high to-risk-critical"
                style={{ width: `${Math.min((f.shap / maxAbs) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
        {shapData.top_protect_factors.length > 0 && (
          <>
            <p className="text-[10px] text-text-muted pt-1">Protective factors (reducing risk):</p>
            {shapData.top_protect_factors.map((f) => (
              <div key={f.factor}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-text-secondary font-medium">
                    {f.factor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  <span className="text-risk-low font-mono text-[10px]">{f.shap.toFixed(3)}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                    style={{ width: `${Math.min((Math.abs(f.shap) / maxAbs) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <p className="text-[9px] text-text-muted/50 border-t border-border/20 pt-1">
        v5.2 SHAP — φᵢ = βᵢ × (zᵢ − E[zᵢ]) — exact Shapley values from logistic regression
      </p>
    </div>
  )
}

// ============================================================================
// Main VendorProfile component
// ============================================================================

export function VendorProfile() {
  const { t } = useTranslation('vendors')
  const { t: tc } = useTranslation('common')
  const { id } = useParams<{ id: string }>()
  const vendorId = Number(id)
  const navigate = useNavigate()
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [networkOpen, setNetworkOpen] = useState(false)
  const riskTimelineChartRef = useRef<HTMLDivElement>(null)
  const footprintChartRef = useRef<HTMLDivElement>(null)

  // Lazy-load state: defer expensive queries until the user interacts
  // with the relevant section, reducing initial page load from 13→9 requests.
  const [activeTab, setActiveTab] = useState('overview')
  const [showAiSummary, setShowAiSummary] = useState(false)

  // Contracts tab filter/sort state
  const [contractYearFilter, setContractYearFilter] = useState<string>('all')
  const [contractRiskFilter, setContractRiskFilter] = useState<string>('all')
  const [contractSort, setContractSort] = useState<'date_desc' | 'amount_desc' | 'risk_desc'>('date_desc')

  // Fetch vendor details
  const { data: vendor, isLoading: vendorLoading, error: vendorError } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => vendorApi.getById(vendorId),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch vendor risk profile
  const { data: riskProfile, isLoading: riskLoading } = useQuery({
    queryKey: ['vendor', vendorId, 'risk-profile'],
    queryFn: () => vendorApi.getRiskProfile(vendorId),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch vendor's contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['vendor', vendorId, 'contracts'],
    queryFn: () => vendorApi.getContracts(vendorId, { per_page: 100 }),
    enabled: !!vendorId,
    staleTime: 2 * 60 * 1000,
  })

  // Fetch vendor's institutions
  const { data: institutions, isLoading: institutionsLoading } = useQuery({
    queryKey: ['vendor', vendorId, 'institutions'],
    queryFn: () => vendorApi.getInstitutions(vendorId),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch co-bidding analysis (v3.2)
  const { data: coBidders, isLoading: coBiddersLoading } = useQuery({
    queryKey: ['vendor', vendorId, 'co-bidders'],
    queryFn: () => networkApi.getCoBidders(vendorId, 5, 10),
    enabled: !!vendorId,
    staleTime: 10 * 60 * 1000,
  })

  // Fetch external registry flags (SFP, RUPC, ASF)
  const { data: externalFlags } = useQuery({
    queryKey: ['vendor-external-flags', vendorId],
    queryFn: () => vendorApi.getExternalFlags(Number(vendorId)),
    enabled: !!vendorId,
  })

  // Fetch QQW cross-reference data
  const { data: qqwData } = useQuery<VendorQQWResponse>({
    queryKey: ['vendor-qqw', vendorId],
    queryFn: () => vendorApi.getQQW(Number(vendorId)),
    enabled: !!vendorId,
    staleTime: 60 * 60 * 1000, // 1 hour — QQW data changes infrequently
  })

  // Fetch year-by-year lifecycle (contract count + risk per year)
  const { data: lifecycleData, error: lifecycleError } = useQuery({
    queryKey: ['vendor', vendorId, 'risk-timeline'],
    queryFn: () => vendorApi.getRiskTimeline(vendorId),
    enabled: !!vendorId,
    staleTime: 10 * 60 * 1000,
  })

  // Fetch sector × institution footprint
  const { data: footprintData, error: footprintError } = useQuery({
    queryKey: ['vendor', vendorId, 'footprint'],
    queryFn: () => vendorApi.getFootprint(vendorId),
    enabled: !!vendorId,
    staleTime: 10 * 60 * 1000,
  })

  // Fetch AI pattern analysis summary — deferred until user expands the AI section
  const { data: aiSummary, isLoading: aiLoading, error: aiError } = useQuery({
    queryKey: ['vendor', vendorId, 'ai-summary'],
    queryFn: () => vendorApi.getAiSummary(vendorId),
    enabled: !!vendorId && showAiSummary,
    staleTime: 30 * 60 * 1000,
  })

  // F2: Ground truth status
  const { data: groundTruthStatus, error: groundTruthError } = useQuery({
    queryKey: ['vendor', vendorId, 'ground-truth-status'],
    queryFn: () => vendorApi.getGroundTruthStatus(vendorId),
    enabled: !!vendorId,
    staleTime: 30 * 60 * 1000,
  })

  // F1: Risk waterfall (z-score contributions) — deferred until user opens the Risk tab
  const { data: waterfallData, isLoading: waterfallLoading, error: waterfallError } = useQuery({
    queryKey: ['vendor', vendorId, 'risk-waterfall'],
    queryFn: () => vendorApi.getRiskWaterfall(vendorId),
    enabled: !!vendorId && activeTab === 'risk',
    staleTime: 10 * 60 * 1000,
  })

  // F7: Peer comparison — deferred until user opens the Risk tab (percentile badges are decorative)
  const { data: peerComparison, error: peerComparisonError } = useQuery({
    queryKey: ['vendor', vendorId, 'peer-comparison'],
    queryFn: () => vendorApi.getPeerComparison(vendorId),
    enabled: !!vendorId && activeTab === 'risk',
    staleTime: 10 * 60 * 1000,
  })

  // F4: Linked scandals
  const { data: linkedScandals } = useQuery({
    queryKey: ['vendor', vendorId, 'linked-scandals'],
    queryFn: () => vendorApi.getLinkedScandals(vendorId),
    enabled: !!vendorId,
    staleTime: 30 * 60 * 1000,
  })

  // Fetch v5.2 SHAP explanation — deferred until user opens Risk tab
  const { data: shapData, isError: shapError } = useQuery({
    queryKey: ['vendor', vendorId, 'shap-v52'],
    queryFn: () => vendorApi.getShap(vendorId),
    enabled: !!vendorId && activeTab === 'risk',
    staleTime: 60 * 60 * 1000, // 1 hour — SHAP values don't change often
    retry: false, // 404 = no SHAP data for this vendor, don't retry
  })

  // Procurement Integrity Score
  const { data: scorecard } = useQuery<VendorScorecardData>({
    queryKey: ['vendor', vendorId, 'scorecard'],
    queryFn: () => scorecardApi.getVendor(vendorId),
    enabled: !!vendorId,
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  // Determine if vendor has co-bidding risk
  const hasCoBiddingRisk = coBidders?.co_bidders?.some(
    (cb) => cb.relationship_strength === 'very_strong' || cb.relationship_strength === 'strong'
  ) || (coBidders?.suspicious_patterns?.length ?? 0) > 0

  // Compute yearly risk trend from contracts
  const riskTrendData = useMemo(() => {
    if (!contracts?.data?.length) return []
    const yearMap = new Map<number, { sum: number; count: number }>()
    for (const c of contracts.data) {
      const yr = c.contract_year
      if (!yr || c.risk_score == null) continue
      const entry = yearMap.get(yr) || { sum: 0, count: 0 }
      entry.sum += c.risk_score
      entry.count += 1
      yearMap.set(yr, entry)
    }
    return Array.from(yearMap.entries())
      .map(([year, { sum, count }]) => ({ year, avg: sum / count }))
      .sort((a, b) => a.year - b.year)
  }, [contracts])

  // Unique years from contracts data for the year filter dropdown
  const contractYears = useMemo<number[]>(() => {
    if (!contracts?.data?.length) return []
    const years = Array.from(
      new Set(contracts.data.map((c) => c.contract_year).filter((y): y is number => y != null))
    )
    return years.sort((a, b) => b - a)
  }, [contracts])

  // Risk level counts for the risk filter tabs
  const riskLevelCounts = useMemo(() => {
    const all = contracts?.data ?? []
    return {
      all: all.length,
      critical: all.filter((c) => c.risk_level === 'critical').length,
      high: all.filter((c) => c.risk_level === 'high').length,
      medium: all.filter((c) => c.risk_level === 'medium').length,
      low: all.filter((c) => c.risk_level === 'low').length,
    }
  }, [contracts])

  // Filtered and sorted contracts list
  const filteredContracts = useMemo<ContractListItem[]>(() => {
    let list: ContractListItem[] = contracts?.data ?? []

    if (contractYearFilter !== 'all') {
      const yr = Number(contractYearFilter)
      list = list.filter((c) => c.contract_year === yr)
    }

    if (contractRiskFilter !== 'all') {
      list = list.filter((c) => c.risk_level === contractRiskFilter)
    }

    const sorted: ContractListItem[] = [...list]
    if (contractSort === 'amount_desc') {
      sorted.sort((a, b) => (b.amount_mxn ?? 0) - (a.amount_mxn ?? 0))
    } else if (contractSort === 'risk_desc') {
      sorted.sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
    } else {
      // date_desc: newest first
      sorted.sort((a, b) => {
        const da = a.contract_date ?? String(a.contract_year ?? 0)
        const db = b.contract_date ?? String(b.contract_year ?? 0)
        return db.localeCompare(da)
      })
    }
    return sorted
  }, [contracts, contractYearFilter, contractRiskFilter, contractSort])

  // Total value of the currently-filtered contracts
  const filteredTotalValue = useMemo(
    () => filteredContracts.reduce((sum, c) => sum + (c.amount_mxn ?? 0), 0),
    [filteredContracts]
  )

  // CSV export helper for filtered contracts
  const exportContractsCSV = () => {
    const headers = ['contract_id', 'title', 'amount_mxn', 'procedure_type', 'institution_name', 'contract_date', 'risk_score', 'risk_level']
    const rows = filteredContracts.map((c) => [
      c.id,
      `"${(c.title ?? '').replace(/"/g, '""')}"`,
      c.amount_mxn ?? '',
      `"${(c.procedure_type ?? '').replace(/"/g, '""')}"`,
      `"${(c.institution_name ?? '').replace(/"/g, '""')}"`,
      c.contract_date ?? c.contract_year ?? '',
      c.risk_score ?? '',
      c.risk_level ?? '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendor-${vendorId}-contracts.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  if (vendorLoading) {
    return <VendorProfileSkeleton />
  }

  if (vendorError || !vendor) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-background-card border border-border mb-5">
          <AlertTriangle className="h-8 w-8 text-risk-high" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{t('notFound')}</h2>
        <p className="text-sm text-text-muted mb-6 text-center max-w-sm">
          {t('notFoundDescription')}
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToVendors')}
        </Button>
      </div>
    )
  }

  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_COLORS[riskLevel]
  const sectorColor = vendor.primary_sector_name
    ? SECTOR_COLORS[vendor.primary_sector_name.toLowerCase()] || SECTOR_COLORS.otros
    : SECTOR_COLORS.otros

  return (
    <div className="space-y-6 stagger-animate">
      <style>{`
        @keyframes vpSlideIn {
          from { opacity: 0; transform: translateY(-12px); filter: blur(3px); }
          to   { opacity: 1; transform: translateY(0);     filter: blur(0px); }
        }
        @keyframes vpFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Hero Header — Obsidian Intelligence */}
      <motion.div
        className="fern-card p-5 relative overflow-hidden"
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: riskColor,
          animation: 'vpSlideIn 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
        variants={slideUp}
        initial="initial"
        animate="animate"
      >
        {/* Risk glow effect */}
        <div
          className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: riskColor }}
        />
        <div className="flex items-center gap-4 relative">
          <Link to="/explore?tab=vendors">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl border"
              style={{
                backgroundColor: `${riskColor}10`,
                borderColor: `${riskColor}30`,
                color: riskColor,
                boxShadow: `0 0 20px ${riskColor}15`,
              }}
            >
              <Users className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-gradient text-xl font-bold font-mono tracking-tight">{toTitleCase(vendor.name)}</h1>
                {/* F2: Ground truth badge */}
                {groundTruthStatus?.is_known_bad && groundTruthStatus.cases?.map((c) => (
                  <Link
                    key={c.case_id}
                    to={`/cases/${c.scandal_slug}`}
                    className="ml-1 px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-300 rounded-full border border-red-500/40 hover:bg-red-500/30 transition-colors"
                  >
                    Documented: {c.case_name}
                  </Link>
                ))}
                {groundTruthError && (
                  <span className="ml-1 px-2 py-0.5 text-xs text-text-muted flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Could not check case status
                  </span>
                )}
                {/* SFP/EFOS badges (fallback when no ground truth) */}
                {!groundTruthStatus?.is_known_bad && externalFlags?.sfp_sanctions && externalFlags.sfp_sanctions.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-300 rounded-full border border-red-500/40">
                    SFP Sanctioned
                  </span>
                )}
                {!groundTruthStatus?.is_known_bad && externalFlags?.sat_efos?.stage === 'definitivo' && (
                  <span
                    className="ml-1 px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-300 rounded-full border border-red-500/40 cursor-help"
                    title="Definitivo: Tax authority has formally confirmed this is a ghost company. Presunto: Under investigation."
                  >
                    SAT EFOS Definitivo (Confirmed)
                  </span>
                )}
                {!groundTruthStatus?.is_known_bad && externalFlags?.sat_efos?.stage === 'presunto' && (
                  <span
                    className="ml-1 px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40 cursor-help"
                    title="Definitivo: Tax authority has formally confirmed this is a ghost company. Presunto: Under investigation."
                  >
                    SAT EFOS Presunto (Alleged)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-text-muted">
                {vendor.rfc && <span className="font-mono">{vendor.rfc}</span>}
                {vendor.primary_sector_name && (
                  <>
                    <span>·</span>
                    <Badge
                      className="text-xs border"
                      style={{
                        backgroundColor: `${sectorColor}20`,
                        color: sectorColor,
                        borderColor: `${sectorColor}40`,
                      }}
                    >
                      {vendor.primary_sector_name}
                    </Badge>
                  </>
                )}
                {vendor.industry_name && (
                  <>
                    <span>·</span>
                    <span>{vendor.industry_name}</span>
                  </>
                )}
                {vendor.group_name && (
                  <>
                    <span>·</span>
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      title="This vendor belongs to a related network group"
                    >
                      <Users className="h-2.5 w-2.5" />
                      {vendor.group_name}
                    </span>
                  </>
                )}
              </div>
              {vendor.name_variants && vendor.name_variants.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-text-muted">{t('alsoKnownAs')}</span>
                  {vendor.name_variants.slice(0, 5).map((v) => (
                    <span
                      key={v.variant_name}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-background-elevated border border-border/30 text-text-secondary"
                      title={`Source: ${v.source}`}
                    >
                      {v.variant_name}
                    </span>
                  ))}
                  {vendor.name_variants.length > 5 && (
                    <span className="text-xs text-text-muted">
                      +{vendor.name_variants.length - 5} more
                    </span>
                  )}
                  <span className="text-xs text-text-muted/50 ml-1">
                    · QuiénEsQuién.Wiki
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setNetworkOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-background-elevated border border-border/40 text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
          >
            <Network className="h-3.5 w-3.5" />
            {t('viewNetwork')}
          </button>
          {vendor.primary_sector_id && (
            <button
              onClick={() => navigate(
                `/contracts?sector_id=${vendor.primary_sector_id}&risk_level=high&sort_by=risk_score&sort_order=desc`
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-background-elevated border border-border/40 text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t('findSimilar')}
            </button>
          )}
          <button
            onClick={() => navigate(`/vendors/compare?a=${vendorId}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-background-elevated border border-border/40 text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
            aria-label="Compare this vendor with another"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Compare
          </button>
          <GenerateReportButton
            reportType="vendor"
            entityId={vendorId}
            entityName={toTitleCase(vendor.name)}
          />
          <AddToWatchlistButton
            itemType="vendor"
            itemId={vendorId}
            itemName={toTitleCase(vendor.name)}
            defaultReason={`Risk score: ${((vendor.avg_risk_score ?? 0) * 100).toFixed(0)}%`}
          />
          <AddToDossierButton
            entityType="vendor"
            entityId={vendorId}
            entityName={toTitleCase(vendor.name)}
          />
          {vendor.avg_risk_score !== undefined && (
            <div className="flex items-center gap-1">
              <RiskBadge score={vendor.avg_risk_score} className="text-base px-3 py-1" />
              <RiskFeedbackButton entityType="vendor" entityId={vendorId} />
            </div>
          )}
          {scorecard && (
            <div className="flex items-center gap-1" title={`Integridad: ${scorecard.grade_label} (${scorecard.total_score.toFixed(0)}/100)`}>
              <GradeBadge10 grade={scorecard.grade} size="md" />
            </div>
          )}
        </div>
      </motion.div>
      <NetworkGraphModal
        open={networkOpen}
        onOpenChange={setNetworkOpen}
        centerType="vendor"
        centerId={vendorId}
        centerName={toTitleCase(vendor.name)}
      />

      {/* Narrative summary */}
      <NarrativeCard
        paragraphs={buildVendorNarrative(vendor, riskProfile ?? null)}
        compact
      />

      {/* "Why is this vendor risky?" — red flags summary card */}
      {(() => {
        const flags: Array<{ icon: string; text: string; severity: 'critical' | 'high' | 'medium' }> = []
        // Ground truth
        if (groundTruthStatus?.is_known_bad) {
          flags.push({ icon: '⚠️', text: 'Documented in known corruption cases (model training ground truth)', severity: 'critical' })
        }
        // External sanctions
        if (externalFlags?.sat_efos?.stage === 'definitivo') {
          flags.push({ icon: '🔴', text: 'SAT confirmed ghost company (Art. 69-B EFOS Definitivo)', severity: 'critical' })
        } else if (externalFlags?.sat_efos?.stage === 'presunto') {
          flags.push({ icon: '🟡', text: 'SAT-listed as alleged ghost company (EFOS Presunto — under investigation)', severity: 'high' })
        }
        if (externalFlags?.sfp_sanctions && externalFlags.sfp_sanctions.length > 0) {
          flags.push({ icon: '🔴', text: `${externalFlags.sfp_sanctions.length} SFP sanction record${externalFlags.sfp_sanctions.length > 1 ? 's' : ''} on file`, severity: 'critical' })
        }
        // Risk score
        const score = vendor.avg_risk_score ?? 0
        if (score >= 0.50) {
          flags.push({ icon: '🔴', text: `Critical risk score (${(score * 100).toFixed(0)}/100) — strongest similarity to documented corruption patterns`, severity: 'critical' })
        } else if (score >= 0.30) {
          flags.push({ icon: '🟠', text: `High risk score (${(score * 100).toFixed(0)}/100) — strong similarity to documented corruption patterns`, severity: 'high' })
        }
        // Procurement patterns
        if ((vendor.direct_award_pct ?? 0) > 70) {
          flags.push({ icon: '🟠', text: t('flags.highDirectAward', { pct: vendor.direct_award_pct?.toFixed(0) }), severity: 'high' })
        }
        if ((vendor.single_bid_pct ?? 0) > 40) {
          flags.push({ icon: '🟡', text: t('flags.highSingleBid', { pct: vendor.single_bid_pct?.toFixed(0) }), severity: 'medium' })
        }
        // Co-bidding
        if (hasCoBiddingRisk) {
          flags.push({ icon: '🟡', text: t('flags.suspiciousCoBidding'), severity: 'medium' })
        }
        // Network clustering
        if ((vendor.cobid_clustering_coeff ?? 0) > 0.6) {
          flags.push({ icon: '🟠', text: t('flags.highClustering', { pct: ((vendor.cobid_clustering_coeff ?? 0) * 100).toFixed(0) }), severity: 'high' })
        }
        // Waterfall top factor
        if (waterfallData && waterfallData.length > 0) {
          const topFactor = [...waterfallData].filter(f => f.contribution > 0).sort((a, b) => b.contribution - a.contribution)[0]
          if (topFactor && topFactor.z_score > 2) {
            const explanation = FACTOR_EXPLANATIONS[topFactor.feature]
            if (explanation) {
              flags.push({ icon: '🟡', text: t('flags.primaryDriver', { factor: topFactor.label_en || topFactor.feature, z: topFactor.z_score.toFixed(1) }), severity: 'medium' })
            }
          }
        }

        if (flags.length === 0) return null

        return (
          <div
            className="fern-card p-4"
            style={{ animation: 'vpFadeUp 500ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both' }}
          >
            <div className="editorial-rule mb-3">
              <span className="editorial-label">POR QUE ESTA MARCADO</span>
            </div>
            <div className="space-y-2">
              {flags.map((flag, i) => (
                <div key={i} className={`flex items-start gap-2 text-sm ${
                  flag.severity === 'critical' ? 'text-red-300' :
                  flag.severity === 'high' ? 'text-amber-300' :
                  'text-text-secondary'
                }`}>
                  <span className="flex-shrink-0 text-base leading-none mt-0.5">{flag.icon}</span>
                  <span>{flag.text}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-text-muted/60 mt-3 border-t border-border/30 pt-2">
              Flags are statistical risk indicators, not proof of wrongdoing. Use for investigation triage only.
            </p>
          </div>
        )
      })()}

      {/* KPI Row — scroll-triggered stagger + F7 Percentile Badges */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.div variants={staggerItem}>
          <ScrollReveal delay={0} direction="up">
            <KPICard
              title={t('kpi.totalContracts')}
              value={vendor.total_contracts}
              icon={FileText}
              subtitle={`${vendor.first_contract_year || '-'} – ${vendor.last_contract_year || '-'}`}
              percentileBadge={(() => {
                const pc = peerComparison as { metrics?: Array<{ metric: string; percentile: number }> } | undefined
                const item = pc?.metrics?.find((p) => p.metric === 'contract_count')
                return item ? <PercentileBadge percentile={item.percentile} metric="contracts" sector={vendor.primary_sector_name || undefined} /> : undefined
              })()}
            />
          </ScrollReveal>
        </motion.div>
        <motion.div variants={staggerItem}>
          <ScrollReveal delay={80} direction="up">
            <KPICard
              title={t('kpi.totalValue')}
              value={vendor.total_value_mxn}
              icon={DollarSign}
              format="currency"
              subtitle={formatCompactUSD(vendor.total_value_mxn)}
              percentileBadge={(() => {
                const pc = peerComparison as { metrics?: Array<{ metric: string; percentile: number }> } | undefined
                const item = pc?.metrics?.find((p) => p.metric === 'total_value')
                return item ? <PercentileBadge percentile={item.percentile} metric="total value" sector={vendor.primary_sector_name || undefined} /> : undefined
              })()}
            />
          </ScrollReveal>
        </motion.div>
        <motion.div variants={staggerItem}>
          <ScrollReveal delay={160} direction="up">
            <KPICard
              title={t('kpi.institutions')}
              value={vendor.total_institutions}
              icon={Building2}
              subtitle={t('kpi.uniqueAgencies')}
            />
          </ScrollReveal>
        </motion.div>
        <motion.div variants={staggerItem}>
          <ScrollReveal delay={240} direction="up">
            <KPICard
              title={t('kpi.highRisk')}
              value={vendor.high_risk_pct}
              icon={AlertTriangle}
              format="percent_100"
              variant={vendor.high_risk_pct > 20 ? 'critical' : vendor.high_risk_pct > 10 ? 'warning' : 'default'}
              percentileBadge={(() => {
                const pc = peerComparison as { metrics?: Array<{ metric: string; percentile: number }> } | undefined
                const item = pc?.metrics?.find((p) => p.metric === 'risk_score')
                return item ? <PercentileBadge percentile={item.percentile} metric="risk score" sector={vendor.primary_sector_name || undefined} /> : undefined
              })()}
            />
          </ScrollReveal>
        </motion.div>
      </motion.div>

      {peerComparisonError && (
        <div className="flex items-center gap-2 text-sm text-text-muted px-1">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span>Could not load peer comparison data. Try refreshing.</span>
        </div>
      )}

      {/* Co-Bidding Alert (v3.2) */}
      {!coBiddersLoading && hasCoBiddingRisk && (
        <Card className="border-amber-500/50 bg-amber-500/5 animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-risk-medium">
              <Users className="h-5 w-5" />
              {t('coBidding.title')} <InfoTooltip termKey="cobidding" size={13} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 p-2 rounded border border-amber-500/30 bg-amber-500/5 text-[11px] text-amber-300/80">
              ⚠ This is a <strong>separate heuristic analysis</strong>. The v6.0 ML risk score assigns <code>co_bid_rate</code> a coefficient of <strong>0.000</strong> — co-bidding patterns did not discriminate corrupt from clean vendors in the training data and do not contribute to the displayed risk score.
            </div>
            <p className="text-sm text-text-muted mb-4">
              {t('coBidding.description')}
              {coBidders?.suspicious_patterns?.length ? (
                <span className="text-risk-medium font-medium ml-1">
                  {coBidders.suspicious_patterns.length} {t('coBidding.suspiciousPatterns')}
                </span>
              ) : null}
            </p>

            {/* Co-bidding partners list */}
            {coBidders?.co_bidders && coBidders.co_bidders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  {t('coBidding.topPartners')}
                </p>
                <div className="divide-y divide-border rounded-lg border overflow-hidden">
                  {coBidders.co_bidders.slice(0, 5).map((partner) => (
                    <div key={partner.vendor_id} className="flex items-center justify-between p-3 bg-background-card interactive">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-text-muted" />
                        <Link
                          to={`/vendors/${partner.vendor_id}`}
                          className="text-sm hover:text-accent transition-colors"
                        >
                          {toTitleCase(partner.vendor_name)}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted tabular-nums">
                          {partner.co_bid_count} {t('coBidding.sharedProcedures')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          partner.relationship_strength === 'very_strong' ? 'bg-risk-critical/20 text-risk-critical' :
                          partner.relationship_strength === 'strong' ? 'bg-risk-medium/20 text-risk-medium' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {partner.relationship_strength.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suspicious patterns */}
            {coBidders?.suspicious_patterns && coBidders.suspicious_patterns.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  {t('coBidding.detectedPatterns')}
                </p>
                {coBidders.suspicious_patterns.map((pattern, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm font-medium text-risk-medium">
                      {pattern.pattern === 'potential_cover_bidding' ? t('coBidding.coverBidding') :
                       pattern.pattern === 'potential_bid_rotation' ? t('coBidding.bidRotation') :
                       pattern.pattern}
                    </p>
                    <p className="text-xs text-text-muted mt-1">{pattern.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* F2: Ground truth known-bad banner — prominent alert above KPIs */}
      {groundTruthStatus?.is_known_bad && (groundTruthStatus.cases?.length ?? 0) > 0 && (
        <div
          className="rounded-lg border-2 border-red-500/60 bg-red-950/40 p-4"
          style={{ animation: 'vpSlideIn 400ms cubic-bezier(0.16, 1, 0.3, 1) both' }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20 border border-red-500/40">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-300 mb-1">
                This vendor appears in {groundTruthStatus.cases?.length ?? 0} documented corruption case{(groundTruthStatus.cases?.length ?? 0) > 1 ? 's' : ''}
              </p>
              <div className="space-y-1.5">
                {groundTruthStatus.cases?.map((c) => (
                  <div key={c.case_id} className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/cases/${c.scandal_slug}`}
                      className="text-sm font-semibold text-red-200 underline hover:text-white transition-colors"
                    >
                      {c.case_name}
                    </Link>
                    {c.fraud_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/25 text-red-300 border border-red-500/30 font-medium">
                        {c.fraud_type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-red-400/70 mt-2">
                This vendor is part of RUBLI&apos;s ground truth training set — contracts matching documented corruption patterns.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* F3: SanctionsAlertBanner (proper component) */}
      {externalFlags && (() => {
        const sanctions = [
          ...externalFlags.sfp_sanctions.map((s: any) => ({
            list_type: 'sfp' as const,
            match_method: (s.match_method || 'rfc') as 'rfc' | 'name_fuzzy',
            match_confidence: s.match_confidence ?? 1,
            sanction_type: s.sanction_type,
          })),
          ...(externalFlags.sat_efos ? [{
            list_type: (externalFlags.sat_efos.stage === 'definitivo' ? 'efos_definitivo' : 'efos_presunto') as 'efos_definitivo' | 'efos_presunto',
            match_method: 'rfc' as const,
            match_confidence: 1,
          }] : []),
        ]
        return sanctions.length > 0 ? (
          <SanctionsAlertBanner
            sanctions={sanctions}
            vendorName={toTitleCase(vendor.name)}
          />
        ) : null
      })()}

      {/* Tabbed content */}
      <SimpleTabs
        defaultTab="overview"
        onTabChange={setActiveTab}
        tabs={[
          { key: 'overview', label: t('tabs.overview'), icon: BarChart3 },
          { key: 'risk', label: t('tabs.risk'), icon: Shield },
          { key: 'history', label: t('tabs.history'), icon: Activity },
          { key: 'network', label: t('tabs.network'), icon: Network },
          { key: 'external', label: t('tabs.external'), icon: ShieldCheck },
        ]}
      >
        {/* TAB 1: Overview */}
        <TabPanel tabKey="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Risk Profile */}
            <ScrollReveal direction="up" delay={0}>
            <div className="space-y-6">
              {/* Risk Score Gauge */}
              <Card className="fern-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('cards.riskProfile')} <InfoTooltip termKey="riskScore" size={13} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {riskLoading ? (
                    <Skeleton className="h-48" />
                  ) : riskProfile?.avg_risk_score !== undefined ? (
                    <RiskGauge
                      score={riskProfile.avg_risk_score}
                      riskVsSectorAvg={riskProfile.risk_vs_sector_avg}
                      riskPercentile={riskProfile.risk_percentile}
                      riskTrend={riskProfile.risk_trend}
                      lower={riskProfile.risk_confidence_lower}
                      upper={riskProfile.risk_confidence_upper}
                    />
                  ) : null}
                </CardContent>
              </Card>

              {/* Procurement Integrity Score */}
              {scorecard && (
                <Card className="fern-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>Calificación de Integridad</span>
                      <GradeBadge10 grade={scorecard.grade} size="sm" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VendorScorecardCard sc={scorecard} />
                  </CardContent>
                </Card>
              )}

              {/* Procurement Patterns */}
              <Card className="fern-card">
                <CardHeader>
                  <CardTitle className="text-sm">{t('cards.procurementPatterns')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PatternBar
                    label={t('cards.directAwards')}
                    value={vendor.direct_award_pct}
                    isPercent100
                  />
                  <PatternBar
                    label={t('cards.singleBids')}
                    value={vendor.single_bid_pct}
                    isPercent100
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">{t('cards.avgContract')}</span>
                    <span className="font-medium tabular-nums">{formatCompactMXN(vendor.avg_contract_value || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">{t('cards.sectors')}</span>
                    <span className="font-medium tabular-nums">{String(vendor.sectors_count || 0)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            </ScrollReveal>

            {/* Right Column - Summary, Contracts, Institutions */}
            <ScrollReveal direction="up" delay={120} className="lg:col-span-2">
            <div className="space-y-6">
              {/* AI Pattern Analysis — lazy loaded on demand */}
              <Card className="fern-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      {t('cards.aiPatternAnalysis')}
                    </CardTitle>
                    {!showAiSummary && (
                      <button
                        onClick={() => setShowAiSummary(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-background-elevated border border-border/40 text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
                      >
                        <Brain className="h-3 w-3" />
                        Load analysis
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!showAiSummary ? (
                    <p className="text-xs text-text-muted">
                      Click &ldquo;Load analysis&rdquo; to fetch AI-generated pattern insights for this vendor.
                    </p>
                  ) : aiError ? (
                      <div className="flex items-center gap-2 text-sm text-text-muted p-4">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <span>Could not load this section. Try refreshing.</span>
                      </div>
                    ) : aiLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    ) : aiSummary && aiSummary.insights.length > 0 ? (
                      <div className="space-y-2">
                        {aiSummary.insights.map((insight, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5 shrink-0">&#x25CF;</span>
                            <p className="text-sm text-text-secondary">{insight}</p>
                          </div>
                        ))}
                        {aiSummary.summary && (
                          <p className="text-sm text-text-muted mt-3 pt-3 border-t border-border/30">
                            {aiSummary.summary}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">No pattern insights available for this vendor.</p>
                    )}
                </CardContent>
              </Card>

              {/* F4: Linked Scandals */}
              {(() => {
                const scandals = linkedScandals as any
                if (!scandals?.scandals?.length) return null
                return (
                  <Card className="fern-card border-red-500/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        {t('cards.knownScandals')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {scandals.scandals.map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-red-500/5 border border-red-500/10">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link
                              to={`/cases/${s.scandal_slug || s.case_id}`}
                              className="text-sm font-medium text-red-300 hover:text-red-200 truncate"
                            >
                              {s.case_name || s.name}
                            </Link>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0">
                              {s.fraud_type}
                            </span>
                          </div>
                          {s.contract_count != null && (
                            <span className="text-xs text-text-muted tabular-nums shrink-0 ml-2">
                              {s.contract_count} contracts
                            </span>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )
              })()}

              {/* F6: Red Thread Panel — investigative leads */}
              {(() => {
                const items: Array<{
                  type: 'co_bidder' | 'investigation_case' | 'sanctions' | 'scandal' | 'high_risk_vendor' | 'asf_finding'
                  label: string
                  count?: number
                  href: string
                }> = []

                // Ground truth
                if (groundTruthStatus?.is_known_bad) {
                  for (const c of groundTruthStatus.cases ?? []) {
                    items.push({
                      type: 'scandal',
                      label: `Known corruption case: ${c.case_name}`,
                      href: `/cases/${c.scandal_slug}`,
                    })
                  }
                }

                // SFP sanctions
                if (externalFlags?.sfp_sanctions?.length) {
                  items.push({
                    type: 'sanctions',
                    label: `${externalFlags.sfp_sanctions.length} SFP sanction${externalFlags.sfp_sanctions.length > 1 ? 's' : ''}`,
                    count: externalFlags.sfp_sanctions.length,
                    href: '#external',
                  })
                }

                // EFOS
                if (externalFlags?.sat_efos) {
                  items.push({
                    type: 'sanctions',
                    label: `SAT EFOS ${externalFlags.sat_efos.stage}`,
                    href: '#external',
                  })
                }

                // Co-bidding
                const coBidCount = coBidders?.co_bidders?.length ?? 0
                if (coBidCount > 0) {
                  items.push({
                    type: 'co_bidder',
                    label: `${coBidCount} co-bidding partner${coBidCount > 1 ? 's' : ''}`,
                    count: coBidCount,
                    href: '#network',
                  })
                }

                // ASF cases
                if (externalFlags?.asf_cases?.length) {
                  items.push({
                    type: 'asf_finding',
                    label: `${externalFlags.asf_cases.length} ASF audit finding${externalFlags.asf_cases.length > 1 ? 's' : ''}`,
                    count: externalFlags.asf_cases.length,
                    href: '#external',
                  })
                }

                if (items.length === 0) return null
                return (
                  <RedThreadPanel
                    items={items}
                    entityName={toTitleCase(vendor.name)}
                  />
                )
              })()}

              {/* Vendor Summary */}
              <Card className="fern-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {t('cards.vendorSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <SummaryRow label={t('cards.primarySector')} value={vendor.primary_sector_name || t('cards.notClassified')} />
                    <SummaryRow label={t('cards.yearsActive')} value={String(vendor.years_active)} />
                    <SummaryRow label={t('cards.sectorsServed')} value={String(vendor.sectors_count)} />
                    {vendor.vendor_group_id && (
                      <SummaryRow label={t('cards.vendorGroup')} value={vendor.group_name || `Group ${vendor.vendor_group_id}`} />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Contracts */}
              <Card className="fern-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('cards.recentContracts')}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <TableExportButton
                      data={(contracts?.data ?? []).map((c) => ({
                        contract_number: c.contract_number ?? '',
                        institution: c.institution_name ?? '',
                        amount_mxn: c.amount_mxn ?? 0,
                        contract_date: c.contract_date ?? '',
                        contract_year: c.contract_year ?? '',
                        risk_score: c.risk_score ?? '',
                        risk_level: c.risk_level ?? '',
                        procedure_type: c.procedure_type ?? '',
                        is_direct_award: c.is_direct_award ? 'yes' : 'no',
                        is_single_bid: c.is_single_bid ? 'yes' : 'no',
                      }))}
                      filename={`vendor-contracts-${vendorId}`}
                    />
                    <Link to={`/contracts?vendor_id=${vendorId}`}>
                      <Button variant="ghost" size="sm">
                        {t('cards.viewAll')}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {contractsLoading ? (
                    <div className="p-4 space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12" />
                      ))}
                    </div>
                  ) : contracts?.data.length ? (
                    <ScrollArea className="h-[300px]">
                      <div className="divide-y divide-border">
                        {contracts.data.map((contract) => (
                          <ContractRow key={contract.id} contract={contract} onView={(cid) => { setSelectedContractId(cid); setIsDetailOpen(true) }} />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="p-8 text-center text-text-muted">{t('cards.noContractsFound')}</div>
                  )}
                </CardContent>
              </Card>

              {/* Top Institutions */}
              <Card className="fern-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t('cards.topInstitutions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {institutionsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-10" />
                      ))}
                    </div>
                  ) : institutions?.data?.length ? (
                    <InstitutionList
                      data={institutions.data.slice(0, 5)}
                      maxValue={Math.max(...institutions.data.slice(0, 5).map((i: any) => i.total_value_mxn))}
                    />
                  ) : (
                    <p className="text-sm text-text-muted">{t('cards.noInstitutionsFound')}</p>
                  )}
                </CardContent>
              </Card>

              {/* Institutional Tenure (Coviello & Gagliarducci 2017) */}
              {vendor.top_institutions && vendor.top_institutions.length > 0 && (
                <Card className="fern-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t('cards.institutionalRelationships')}
                    </CardTitle>
                    <p className="text-xs text-text-muted mt-0.5 italic">
                      {t('cards.institutionalRelationshipsNote')}
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/30">
                      {vendor.top_institutions.map((inst) => (
                        <div key={inst.institution_id} className="flex items-center justify-between px-4 py-2 hover:bg-background-elevated/50">
                          <div className="flex-1 min-w-0">
                            <Link to={`/administrations?institution_id=${inst.institution_id}`}
                              className="text-xs font-medium text-text-primary hover:text-primary truncate block">
                              {inst.institution_name}
                            </Link>
                            <span className="text-xs text-text-muted">
                              {inst.first_contract_year}–{inst.last_contract_year} · {inst.total_contracts.toLocaleString()} contracts
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <span className="font-mono text-xs text-text-secondary">
                              {inst.tenure_years} {t('cards.yrs')}
                            </span>
                            {inst.tenure_years > 15 && (
                              <span className="text-xs bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded font-medium">
                                {t('cards.long')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sector × Institution Footprint */}
              {footprintError && (
                <Card className="fern-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4" />
                      {t('cards.procurementFootprint')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-text-muted p-4">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span>Could not load this section. Try refreshing.</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {footprintData && footprintData.footprint.length > 0 && (
              <Card className="fern-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4" />
                    {t('cards.procurementFootprint')}
                  </CardTitle>
                  <p className="text-xs text-text-muted mt-0.5">{t('cards.procurementFootprintNote')}</p>
                </CardHeader>
                <CardContent>
                  <div className="relative" ref={footprintChartRef}>
                    <ChartDownloadButton
                      targetRef={footprintChartRef}
                      filename={`vendor-${vendorId}-footprint`}
                      className="absolute top-0 right-0 z-10"
                    />
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
                    {footprintData.footprint.slice(0, 20).map((fp, idx) => {
                      const maxVal = footprintData.footprint[0]?.total_value ?? 1
                      const barPct = (fp.total_value / maxVal) * 100
                      const risk = fp.avg_risk_score ?? 0
                      const riskIntensity = Math.min(1, risk / 0.5)
                      const r2 = Math.round(74 + (248 - 74) * riskIntensity)
                      const g2 = Math.round(222 + (113 - 222) * riskIntensity)
                      const b2 = Math.round(128 + (113 - 128) * riskIntensity)
                      const riskColor = `rgb(${r2},${g2},${b2})`
                      const sectorColor = SECTOR_COLORS[fp.sector_name?.toLowerCase() ?? ''] || SECTOR_COLORS.otros
                      return (
                        <div key={idx} className="flex items-center gap-2 group">
                          <span
                            className="w-1 h-5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: sectorColor }}
                            title={fp.sector_name}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <Link
                                to={`/institutions/${fp.institution_id}`}
                                className="text-[11px] text-text-secondary hover:text-accent truncate"
                                title={fp.institution_name}
                              >
                                {fp.institution_name.length > 28 ? fp.institution_name.slice(0, 28) + '…' : fp.institution_name}
                              </Link>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[10px] font-mono text-text-muted">{formatCompactMXN(fp.total_value)}</span>
                                <span
                                  className="text-[9px] font-mono px-1 rounded"
                                  style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
                                >
                                  {(risk * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                            <div className="h-1 rounded-full bg-background-elevated overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${barPct}%`, backgroundColor: `${sectorColor}80` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-text-muted/50 italic">
                    {t('cards.footprintLegend')}
                  </p>
                  </div>
                </CardContent>
              </Card>
              )}
            </div>
            </ScrollReveal>
          </div>
        </TabPanel>

        {/* TAB 2: Risk Analysis */}
        <TabPanel tabKey="risk">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: Gauge + Trend */}
            <div className="space-y-6">
              <Card className="fern-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('risk.riskScore')} <InfoTooltip termKey="riskScore" size={13} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {riskLoading ? (
                    <Skeleton className="h-48" />
                  ) : riskProfile?.avg_risk_score !== undefined ? (
                    <RiskGauge
                      score={riskProfile.avg_risk_score}
                      riskVsSectorAvg={riskProfile.risk_vs_sector_avg}
                      riskPercentile={riskProfile.risk_percentile}
                      riskTrend={riskProfile.risk_trend}
                      lower={riskProfile.risk_confidence_lower}
                      upper={riskProfile.risk_confidence_upper}
                    />
                  ) : null}
                </CardContent>
              </Card>

              {/* Risk Trend Mini-Chart */}
              {riskTrendData.length > 1 && (
                <Card className="fern-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      {t('risk.riskTrend')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative h-[100px]" ref={riskTimelineChartRef}>
                      <ChartDownloadButton
                        targetRef={riskTimelineChartRef}
                        filename={`vendor-${vendorId}-risk-trend`}
                        className="absolute top-0 right-0 z-10"
                      />
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={riskTrendData}>
                          <defs>
                            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={riskColor} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload?.[0]) {
                                const d = payload[0].payload
                                return (
                                  <div className="rounded border border-border bg-background-card px-2 py-1 text-xs shadow-lg">
                                    <span className="font-medium">{d.year}</span>
                                    <span className="ml-2 tabular-nums">{(d.avg * 100).toFixed(1)}%</span>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          {riskProfile?.risk_confidence_lower != null &&
                            riskProfile?.risk_confidence_upper != null && (
                              <ReferenceArea
                                y1={riskProfile.risk_confidence_lower}
                                y2={riskProfile.risk_confidence_upper}
                                fill={riskColor}
                                fillOpacity={0.08}
                              />
                            )}
                          <ReferenceLine
                            x={2020}
                            stroke="#ef4444"
                            strokeDasharray="3 2"
                            label={{ value: 'COVID', position: 'top', fill: '#ef4444aa', fontSize: 10 }}
                          />
                          <ReferenceLine
                            x={2018}
                            stroke="#f59e0b"
                            strokeDasharray="3 2"
                            label={{ value: 'Admin Change', position: 'top', fill: '#f59e0baa', fontSize: 10 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="avg"
                            stroke={riskColor}
                            fill="url(#riskGrad)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {riskProfile?.risk_trend && (
                      <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-text-muted">
                        {riskProfile.risk_trend === 'worsening' && <TrendingUp className="h-3 w-3 text-risk-high" />}
                        {riskProfile.risk_trend === 'improving' && <TrendingDown className="h-3 w-3 text-risk-low" />}
                        {riskProfile.risk_trend === 'stable' && <Minus className="h-3 w-3" />}
                        <span className="capitalize">{riskProfile.risk_trend}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Vendor Lifecycle Chart */}
              {lifecycleError && (
                <Card className="fern-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {t('risk.contractLifecycle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-text-muted p-4">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span>Could not load this section. Try refreshing.</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {lifecycleData && lifecycleData.timeline.length > 1 && (
                <Card className="fern-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {t('risk.contractLifecycle')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[120px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={lifecycleData.timeline} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                          <XAxis
                            dataKey="year"
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'var(--font-family-mono)' }}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
                            width={28}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={[0, 1]}
                            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
                            width={32}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'var(--color-card)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 6,
                              fontSize: 10,
                            }}
                            formatter={(value: unknown, name?: string) => {
                              if (name === 'Risk') return [`${(Number(value) * 100).toFixed(1)}%`, name]
                              return [Number(value).toLocaleString(), name ?? '']
                            }}
                          />
                          <RechartsLegend wrapperStyle={{ fontSize: 9 }} />
                          <Bar
                            yAxisId="left"
                            dataKey="contract_count"
                            name={tc('contracts')}
                            fill={riskColor}
                            fillOpacity={0.45}
                            radius={[2, 2, 0, 0]}
                            maxBarSize={20}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="avg_risk_score"
                            name={tc('riskScore')}
                            stroke={riskColor}
                            strokeWidth={2}
                            dot={{ r: 2 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Statistical Anomaly */}
              {vendor.avg_mahalanobis != null && (
                <Card
                  className="hover-lift"
                  style={{
                    borderColor: (vendor.pct_anomalous ?? 0) > 20
                      ? `${RISK_COLORS.critical}60`
                      : (vendor.pct_anomalous ?? 0) > 10
                        ? `${RISK_COLORS.high}60`
                        : undefined,
                  }}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {t('risk.statisticalAnomaly')} <InfoTooltip termKey="mahalanobisDistance" size={13} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">{t('risk.avgMahalanobis')}</span>
                      <span className="font-mono tabular-nums">{vendor.avg_mahalanobis.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">{t('risk.maxD2')}</span>
                      <span className="font-mono tabular-nums">{vendor.max_mahalanobis?.toFixed(1) ?? '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">{t('risk.anomalousContracts')}</span>
                      <span className={`font-mono tabular-nums ${
                        (vendor.pct_anomalous ?? 0) > 20 ? 'text-risk-critical' :
                        (vendor.pct_anomalous ?? 0) > 10 ? 'text-risk-high' :
                        'text-text-secondary'
                      }`}>
                        {vendor.pct_anomalous?.toFixed(1) ?? '0'}%
                      </span>
                    </div>
                    <p className="text-xs text-text-muted pt-1">
                      {t('risk.chiSquaredNote')}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Waterfall + Factor List */}
            <ScrollSection delay={0.15}>
            <div className="lg:col-span-2 space-y-6">
              {/* F1: WaterfallRiskChart (proper component with z-score data) */}
              {waterfallData && waterfallData.length >= 3 && (
                <Card className="fern-card">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {t('risk.riskFactorContribution')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WaterfallRiskChart features={waterfallData} />
                  </CardContent>
                </Card>
              )}
              {waterfallError && !waterfallData && (
                <Card className="fern-card">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {t('risk.riskFactorContribution')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-text-muted p-4">
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <span>Could not load this section. Try refreshing.</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {waterfallLoading && (
                <Card className="fern-card">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      {t('risk.riskFactorContribution')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[220px]" />
                  </CardContent>
                </Card>
              )}

              {/* SHAP-based factor chart (per-vendor exact values) — preferred over global-coefficient fallback */}
              {!waterfallData?.length && !waterfallLoading && (
              <Card className="fern-card">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-accent" />
                    Per-Vendor Risk Factor Analysis
                    {shapData && (
                      <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded ml-1">SHAP</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {shapData ? (
                    <>
                      <SHAPPanel shapData={shapData} />
                      <p className="text-[9px] text-text-muted/50 mt-3 border-t border-border/20 pt-2">
                        Based on {shapData.n_contracts.toLocaleString()} contracts
                        {shapData.updated_at ? ` · Updated ${formatDate(shapData.updated_at)}` : ''}
                      </p>
                    </>
                  ) : shapError ? (
                    // 404 = no SHAP data pre-computed for this vendor; fall back to global-coefficient approximation
                    riskLoading ? (
                      <Skeleton className="h-[220px]" />
                    ) : riskProfile?.top_risk_factors?.length ? (
                      <>
                        <RiskWaterfallChart
                          riskFactors={riskProfile.top_risk_factors}
                          riskScore={riskProfile.avg_risk_score ?? vendor.avg_risk_score ?? 0}
                        />
                        <p className="text-[9px] text-text-muted/50 mt-2">
                          Approximate contributions using global model coefficients — per-vendor SHAP not available for this vendor.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-text-muted">{t('risk.noRiskFactorData')}</p>
                    )
                  ) : (
                    // SHAP still loading
                    riskLoading ? (
                      <Skeleton className="h-[220px]" />
                    ) : riskProfile?.top_risk_factors?.length ? (
                      <RiskWaterfallChart
                        riskFactors={riskProfile.top_risk_factors}
                        riskScore={riskProfile.avg_risk_score ?? vendor.avg_risk_score ?? 0}
                      />
                    ) : (
                      <p className="text-sm text-text-muted">{t('risk.noRiskFactorData')}</p>
                    )
                  )}
                </CardContent>
              </Card>
              )}

              {/* Risk Radar Chart — 6-axis z-score spider */}
              {waterfallData && waterfallData.length >= 3 && (
                <div className="fern-card p-4">
                  <div className="editorial-rule mb-1">
                    <span className="editorial-label">RADAR DE RIESGO</span>
                  </div>
                  <p className="text-xs text-text-muted mb-3">6-axis z-score profile vs. sector-year average</p>
                  <RiskRadarChart waterfallData={waterfallData} />
                  <p className="text-xs text-text-muted/50 italic mt-3">
                    Axes toward the outer edge = higher deviation from sector norms. Wider shape = more risk dimensions active simultaneously.
                  </p>
                </div>
              )}

              {/* Top 3 Contributing Factors — bar summary */}
              {waterfallData && waterfallData.length >= 1 && (
                <div className="fern-card p-4">
                  <div className="editorial-rule mb-1">
                    <span className="editorial-label">FACTORES PRINCIPALES</span>
                  </div>
                  <p className="text-xs text-text-muted mb-3">The 3 features driving the highest model contribution to this vendor&apos;s risk score</p>
                  <TopRiskFactorBars waterfallData={waterfallData} />
                  <p className="text-xs text-text-muted/50 italic mt-3">
                    z-score = standard deviations above sector-year average. Values above +2 are statistically unusual for this sector.
                  </p>
                  {shapData && (
                    <div className="mt-4 border-t border-border/30 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-3.5 w-3.5 text-accent" />
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">SHAP Analysis</p>
                        <span className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">Per-Vendor</span>
                      </div>
                      <SHAPPanel shapData={shapData} />
                      <p className="text-[9px] text-text-muted/50 mt-2">
                        Based on {shapData.n_contracts.toLocaleString()} contracts
                        {shapData.updated_at ? ` · Updated ${formatDate(shapData.updated_at)}` : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Risk Factor List */}
              <Card className="fern-card">
                <CardHeader>
                  <CardTitle className="text-sm">{t('risk.riskFactorDetails')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {riskLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-6" />
                      ))}
                    </div>
                  ) : riskProfile?.top_risk_factors?.length ? (
                    <RiskFactorList factors={riskProfile.top_risk_factors} />
                  ) : (
                    <p className="text-sm text-text-muted">{t('risk.noRiskFactors')}</p>
                  )}
                </CardContent>
              </Card>
            </div>
            </ScrollSection>
          </div>
        </TabPanel>

        {/* TAB 3: Contract History */}
        <TabPanel tabKey="history">
          <ScrollSection>
          <div className="space-y-6">
            {/* Activity Calendar */}
            <Card className="fern-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {t('history.activityCalendar')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <Skeleton className="h-[220px]" />
                ) : contracts?.data?.length ? (
                  <ActivityCalendar
                    contracts={contracts.data}
                    sectorColor={sectorColor}
                  />
                ) : (
                  <p className="text-sm text-text-muted">{t('history.noContractData')}</p>
                )}
              </CardContent>
            </Card>

            {/* Contract Analysis — new visualization section */}
            <div className="space-y-4 mb-6">
              <div className="editorial-rule">
                <span className="editorial-label">ANALISIS DE CONTRATOS</span>
              </div>

              {/* Donut charts row */}
              <VendorContractBreakdown
                contracts={filteredContracts.map((c) => ({
                  procedure_type: c.procedure_type ?? null,
                  risk_level: c.risk_level ?? null,
                  amount_mxn: c.amount_mxn ?? 0,
                }))}
                loading={contractsLoading}
              />

              {/* Timeline + Risk Matrix side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <VendorContractTimeline
                  contracts={(filteredContracts).map((c) => ({
                    id: c.id,
                    title: c.title ?? '',
                    amount_mxn: c.amount_mxn ?? 0,
                    contract_date: c.contract_date ?? '',
                    year: c.contract_year ?? (c.contract_date ? new Date(c.contract_date).getFullYear() : 0),
                    procedure_type: c.procedure_type ?? '',
                    institution_name: c.institution_name ?? '',
                    risk_score: c.risk_score ?? null,
                    risk_level: c.risk_level ?? null,
                  }))}
                  vendorName={vendor?.name ?? ''}
                />
                <VendorContractRiskMatrix
                  contracts={(filteredContracts).map((c) => ({
                    id: c.id,
                    title: c.title ?? '',
                    amount_mxn: c.amount_mxn ?? 0,
                    risk_score: c.risk_score ?? null,
                    risk_level: c.risk_level ?? null,
                    procedure_type: c.procedure_type ?? '',
                    institution_name: c.institution_name ?? '',
                    contract_date: c.contract_date ?? '',
                  }))}
                  vendorName={vendor?.name ?? ''}
                />
              </div>
            </div>

            {/* Full Contracts Table with filter bar */}
            <Card className="fern-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('history.allContracts')}
                </CardTitle>
                <Link to={`/contracts?vendor_id=${vendorId}`}>
                  <Button variant="ghost" size="sm">
                    {t('cards.viewAll')}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>

              {/* Filter bar */}
              {!contractsLoading && (contracts?.data?.length ?? 0) > 0 && (
                <div className="px-4 pb-3 space-y-3 border-b border-border/50">
                  {/* Row 1: Year filter + Sort */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label htmlFor="contract-year-filter" className="text-xs text-text-muted whitespace-nowrap">
                        Year
                      </label>
                      <select
                        id="contract-year-filter"
                        value={contractYearFilter}
                        onChange={(e) => setContractYearFilter(e.target.value)}
                        className="text-xs rounded border border-border/60 bg-background-elevated text-text-secondary px-2 py-1 focus:outline-none focus:border-accent/60"
                      >
                        <option value="all">All Years</option>
                        {contractYears.map((yr) => (
                          <option key={yr} value={String(yr)}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor="contract-sort" className="text-xs text-text-muted whitespace-nowrap">
                        Sort
                      </label>
                      <select
                        id="contract-sort"
                        value={contractSort}
                        onChange={(e) => setContractSort(e.target.value as typeof contractSort)}
                        className="text-xs rounded border border-border/60 bg-background-elevated text-text-secondary px-2 py-1 focus:outline-none focus:border-accent/60"
                      >
                        <option value="date_desc">Date (newest)</option>
                        <option value="amount_desc">Amount (highest)</option>
                        <option value="risk_desc">Risk Score (highest)</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Risk level tabs */}
                  <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by risk level">
                    {([
                      { key: 'all', label: 'All' },
                      { key: 'critical', label: 'Critical' },
                      { key: 'high', label: 'High' },
                      { key: 'medium', label: 'Medium' },
                      { key: 'low', label: 'Low' },
                    ] as const).map(({ key, label }) => {
                      const count = riskLevelCounts[key]
                      const isActive = contractRiskFilter === key
                      const riskColor = key !== 'all' ? RISK_COLORS[key] : undefined
                      return (
                        <button
                          key={key}
                          onClick={() => setContractRiskFilter(key)}
                          aria-pressed={isActive}
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
                            isActive
                              ? 'border-accent/60 bg-accent/10 text-accent'
                              : 'border-border/40 bg-transparent text-text-muted hover:text-text-secondary hover:border-border'
                          )}
                          style={isActive && riskColor ? { borderColor: `${riskColor}60`, backgroundColor: `${riskColor}15`, color: riskColor } : undefined}
                        >
                          {label}
                          <span className="opacity-60">{count}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Results summary + export */}
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>
                      Showing{' '}
                      <span className="font-medium text-text-secondary">{filteredContracts.length}</span>
                      {' '}of{' '}
                      <span className="font-medium text-text-secondary">{contracts?.data?.length ?? 0}</span>
                      {' '}contracts — Total:{' '}
                      <span className="font-medium text-text-secondary tabular-nums">{formatCompactMXN(filteredTotalValue)}</span>
                    </span>
                    <button
                      onClick={exportContractsCSV}
                      aria-label="Export filtered contracts as CSV"
                      className="flex items-center gap-1 px-2 py-1 rounded border border-border/40 bg-transparent hover:bg-background-elevated hover:border-accent/40 hover:text-accent transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      Export CSV
                    </button>
                  </div>
                </div>
              )}

              <CardContent className="p-0">
                {contractsLoading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : filteredContracts.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y divide-border">
                      {filteredContracts.map((contract) => (
                        <ContractRow key={contract.id} contract={contract} onView={(cid) => { setSelectedContractId(cid); setIsDetailOpen(true) }} />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (contracts?.data?.length ?? 0) > 0 ? (
                  <div className="p-8 text-center text-text-muted text-sm">
                    No contracts match the current filters.
                  </div>
                ) : (
                  <div className="p-8 text-center text-text-muted">{t('cards.noContractsFound')}</div>
                )}
              </CardContent>
            </Card>
          </div>
          </ScrollSection>
        </TabPanel>

        {/* TAB 4: Network */}
        <TabPanel tabKey="network">
          <ScrollSection>
          <div className="space-y-6">
            {/* High Clustering Alert Banner */}
            {vendor?.cobid_clustering_coeff != null && vendor.cobid_clustering_coeff > 0.6 && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-red-500/40 bg-red-500/[0.06]">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">
                  <span className="font-semibold">High network clustering detected.</span>{' '}
                  This vendor&apos;s bidding partners form a tightly connected group, consistent with coordinated bid-rigging. See co-bidding patterns below.
                </p>
              </div>
            )}

            {/* F8: Co-Bidding Collusion Panel */}
            {coBiddersLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : hasCoBiddingRisk ? (
              <Card className="fern-card border-amber-500/40 bg-amber-500/[0.02]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-risk-medium">
                      <Users className="h-4 w-4" />
                      {t('coBidding.analysisTitle')}
                    </CardTitle>
                    {coBidders?.total_procedures != null && (
                      <span className="text-xs text-text-muted font-mono">
                        {coBidders.total_procedures} {t('coBidding.proceduresAnalyzed')}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Suspicious Patterns Alert */}
                  {coBidders?.suspicious_patterns && coBidders.suspicious_patterns.length > 0 && (
                    <div className="space-y-2">
                      {coBidders.suspicious_patterns.map((sp, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-3 rounded-lg border border-risk-high/30 bg-risk-high/[0.05]"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-risk-high shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-risk-high capitalize">
                              {sp.pattern.replace(/_/g, ' ')}
                            </div>
                            <div className="text-xs text-text-muted mt-0.5">{sp.description}</div>
                            {sp.vendors?.length > 0 && (
                              <div className="text-[11px] text-text-muted mt-1 font-mono">
                                {t('coBidding.involves')} {sp.vendors.slice(0, 3).map(v => toTitleCase(v.name)).join(', ')}
                                {sp.vendors.length > 3 ? ` +${sp.vendors.length - 3} more` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Partner list with detailed stats */}
                  {coBidders?.co_bidders && coBidders.co_bidders.length > 0 && (
                    <div className="divide-y divide-border rounded-lg border overflow-hidden">
                      {coBidders.co_bidders.map((partner) => {
                        const totalBids = partner.win_count + partner.loss_count
                        const winPct = totalBids > 0 ? (partner.win_count / totalBids) * 100 : null
                        const isCoverBidder = winPct !== null && winPct < 10 && partner.co_bid_count >= 3
                        const isAlwaysWinner = winPct !== null && winPct > 90 && partner.co_bid_count >= 3
                        return (
                          <div
                            key={partner.vendor_id}
                            className="p-3 bg-background-card hover:bg-background-elevated/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Users className="h-3.5 w-3.5 text-text-muted shrink-0" />
                                <Link
                                  to={`/vendors/${partner.vendor_id}`}
                                  className="text-sm font-medium hover:text-accent transition-colors truncate"
                                >
                                  {toTitleCase(partner.vendor_name)}
                                </Link>
                                {(isCoverBidder || isAlwaysWinner) && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-risk-critical/15 text-risk-critical font-mono shrink-0">
                                    {isCoverBidder ? t('coBidding.coverBidder') : t('coBidding.alwaysWins')}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
                                partner.relationship_strength === 'very_strong' ? 'bg-risk-critical/20 text-risk-critical' :
                                partner.relationship_strength === 'strong' ? 'bg-risk-high/20 text-risk-high' :
                                partner.relationship_strength === 'moderate' ? 'bg-risk-medium/20 text-risk-medium' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {partner.relationship_strength.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-text-muted">
                              <span>{partner.co_bid_count} {t('coBidding.sharedProcedures')}</span>
                              {winPct !== null && (
                                <span>
                                  {t('coBidding.wins')}: <span className={winPct > 60 ? 'text-risk-high' : winPct < 15 ? 'text-risk-medium' : 'text-text-secondary'}>{winPct.toFixed(0)}%</span>
                                </span>
                              )}
                              {partner.same_winner_ratio > 0.5 && (
                                <span className="text-risk-medium">
                                  {t('coBidding.sameWinner')} {(partner.same_winner_ratio * 100).toFixed(0)}% {t('coBidding.ofTime')}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Network Topology — clustering metrics (Wachs-Fazekas 2021) */}
                  {vendor?.cobid_clustering_coeff != null && vendor.cobid_clustering_coeff > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        {t('network.topology')}
                        <InfoTooltip termKey="clusteringCoefficient" size={12} />
                      </p>
                      <div className="flex gap-3">
                        {/* Clustering Coefficient pill */}
                        <div className={cn(
                          'flex-1 rounded-lg border px-4 py-3',
                          vendor.cobid_clustering_coeff > 0.6
                            ? 'border-red-500/40 bg-red-500/[0.06]'
                            : vendor.cobid_clustering_coeff >= 0.3
                            ? 'border-amber-500/40 bg-amber-500/[0.06]'
                            : 'border-green-500/40 bg-green-500/[0.06]'
                        )}>
                          <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1 flex items-center gap-1">
                            {t('network.clusteringCoefficient')}
                            <InfoTooltip termKey="clusteringCoefficient" size={11} />
                          </p>
                          <p className={cn(
                            'text-xl font-bold tabular-nums',
                            vendor.cobid_clustering_coeff > 0.6
                              ? 'text-red-400'
                              : vendor.cobid_clustering_coeff >= 0.3
                              ? 'text-amber-400'
                              : 'text-green-400'
                          )}>
                            {(vendor.cobid_clustering_coeff * 100).toFixed(0)}%
                          </p>
                          <p className={cn(
                            'text-[10px] mt-0.5',
                            vendor.cobid_clustering_coeff > 0.6
                              ? 'text-red-400/80'
                              : vendor.cobid_clustering_coeff >= 0.3
                              ? 'text-amber-400/80'
                              : 'text-green-400/80'
                          )}>
                            {vendor.cobid_clustering_coeff > 0.6
                              ? t('network.highClustering')
                              : vendor.cobid_clustering_coeff >= 0.3
                              ? t('network.moderateClustering')
                              : t('network.lowClustering')}
                          </p>
                        </div>

                        {/* Closed Triangles pill */}
                        {vendor.cobid_triangle_count != null && (
                          <div className="flex-1 rounded-lg border border-border/60 bg-background-card px-4 py-3">
                            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">
                              {t('network.closedTriangles')}
                            </p>
                            <p className="text-xl font-bold tabular-nums text-text-primary">
                              {vendor.cobid_triangle_count.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-text-muted mt-0.5">
                              {t('network.biddingTrianglesDetected')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              !coBiddersLoading && (
                <Card className="fern-card">
                  <CardContent className="p-8 text-center text-text-muted">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t('coBidding.noPatternsTitle')}</p>
                    <p className="text-xs mt-1">{t('coBidding.noPatternsDescription')}</p>
                  </CardContent>
                </Card>
              )
            )}

            {/* Open Full Network Graph */}
            <Card className="fern-card">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-text-muted mb-4">
                  {t('network.networkGraphDescription')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setNetworkOpen(true)}
                  className="gap-2"
                >
                  <Network className="h-4 w-4" />
                  {t('network.openNetworkGraph')}
                </Button>
              </CardContent>
            </Card>
          </div>
          </ScrollSection>
        </TabPanel>

        {/* TAB 5: External Records */}
        <TabPanel tabKey="external">
          <ExternalFlagsPanel flags={externalFlags} qqw={qqwData} />
        </TabPanel>
      </SimpleTabs>

      <ContractDetailModal
        contractId={selectedContractId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface KPICardProps {
  title: string
  value?: number
  icon: React.ElementType
  format?: 'number' | 'currency' | 'percent' | 'percent_100'
  subtitle?: string
  variant?: 'default' | 'warning' | 'critical'
  percentileBadge?: React.ReactNode
}

function KPICard({ title, value, icon: Icon, format = 'number', subtitle, variant = 'default', percentileBadge }: KPICardProps) {
  // Count-up for plain number format; other formats are formatted strings
  const target = (format === 'number' && value !== undefined) ? value : 0
  const decimals = format === 'percent_100' ? 1 : 0
  const { ref: countRef, value: animValue } = useCountUp(target, 1200, decimals)

  const formattedValue =
    value === undefined
      ? '-'
      : format === 'currency'
        ? formatCompactMXN(value)
        : format === 'percent'
          ? formatPercentSafe(value, true)
          : format === 'percent_100'
            ? formatPercentSafe(value, false)
            : formatNumber(Math.round(animValue))

  const borderClass =
    variant === 'critical' ? 'border-risk-critical/40' :
    variant === 'warning' ? 'border-risk-high/30' :
    undefined

  const iconBg =
    variant === 'critical' ? 'bg-risk-critical/10 text-risk-critical' :
    variant === 'warning' ? 'bg-risk-high/10 text-risk-high' :
    'bg-accent/10 text-accent'

  return (
    <div className={`fern-card p-4 ${borderClass || ''}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="editorial-label">{title}</p>
          <div className="flex items-center gap-1.5">
            <p className="pull-stat tabular-nums">
              {format === 'number'
                ? <span ref={countRef}>{formattedValue}</span>
                : formattedValue
              }
            </p>
            {percentileBadge}
          </div>
          {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function RiskGauge({
  score,
  riskVsSectorAvg,
  riskPercentile,
  riskTrend,
  lower,
  upper,
}: {
  score: number
  riskVsSectorAvg?: number
  riskPercentile?: number
  riskTrend?: 'improving' | 'stable' | 'worsening'
  lower?: number | null
  upper?: number | null
}) {
  const percentage = Math.round(score * 100)
  const level = getRiskLevel(score)
  const label = level.charAt(0).toUpperCase() + level.slice(1)
  const color = RISK_COLORS[level]

  // Gauge zone boundaries (as % of circumference)
  const circumference = 2 * Math.PI * 40
  const zones = [
    { end: 10, color: RISK_COLORS.low },      // 0–10%
    { end: 30, color: RISK_COLORS.medium },    // 10–30%
    { end: 50, color: RISK_COLORS.high },      // 30–50%
    { end: 100, color: RISK_COLORS.critical }, // 50–100%
  ]

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Zone segments */}
          {zones.map((zone, i) => {
            const prevEnd = i === 0 ? 0 : zones[i - 1].end
            const start = (prevEnd / 100) * circumference
            const length = ((zone.end - prevEnd) / 100) * circumference
            return (
              <circle
                key={i}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={zone.color}
                strokeWidth="8"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-start}
                opacity={0.15}
              />
            )
          })}
          {/* Active arc */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${percentage * 2.51} 251`}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color}80)`,
              transition: 'stroke-dasharray 0.8s ease-out',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-hero tabular-nums" style={score >= 0.40 ? { color: color, textShadow: `0 0 20px ${color}60` } : undefined}>{percentage}</span>
          <span className="text-xs text-text-muted">/ 100</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }} />
        <span className="text-sm font-medium">{label} Risk</span>
        {riskTrend && (
          <>
            {riskTrend === 'worsening' && <TrendingUp className="h-3.5 w-3.5 text-risk-high ml-1" />}
            {riskTrend === 'improving' && <TrendingDown className="h-3.5 w-3.5 text-risk-low ml-1" />}
            {riskTrend === 'stable' && <Minus className="h-3.5 w-3.5 text-text-muted ml-1" />}
          </>
        )}
      </div>
      {/* Comparison metrics */}
      <div className="mt-3 space-y-1 text-center">
        {riskPercentile != null && (
          <p className="text-xs text-text-muted">
            Higher than <span className="font-medium text-text-secondary tabular-nums">{riskPercentile.toFixed(0)}%</span> of vendors
          </p>
        )}
        {riskVsSectorAvg != null && (
          <p className="text-xs text-text-muted">
            <span className={`font-medium tabular-nums ${riskVsSectorAvg > 0 ? 'text-risk-high' : 'text-risk-low'}`}>
              {riskVsSectorAvg > 0 ? '+' : ''}{(riskVsSectorAvg * 100).toFixed(1)}
            </span>
            {' '}vs sector avg
          </p>
        )}
      </div>
      {/* 95% CI whisker */}
      {lower != null && upper != null && (
        <div className="mt-3">
          <RiskWhisker score={score} lower={lower} upper={upper} size="lg" showLabels />
        </div>
      )}
    </div>
  )
}

function RiskFactorList({ factors }: { factors: Array<{ factor: string; count: number; percentage: number }> }) {
  if (factors.length === 0) {
    return <p className="text-sm text-text-muted">No risk factors triggered</p>
  }

  return (
    <div className="space-y-3">
      {factors.map((f, i) => {
        const parsed = parseFactorLabel(f.factor)
        const barColor = getFactorCategoryColor(parsed.category)
        return (
          <div key={f.factor} title={f.factor}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-secondary">{parsed.label}</span>
              <span className="text-text-muted tabular-nums">{f.count} ({f.percentage.toFixed(1)}%)</span>
            </div>
            <AnimatedFill
              pct={Math.min(f.percentage, 100)}
              color={barColor}
              delay={i * 80}
              height="h-2"
            />
          </div>
        )
      })}
    </div>
  )
}

function PatternBar({ label, value, isPercent100 = false }: { label: string; value?: number; isPercent100?: boolean }) {
  const pct = value ?? 0
  const displayPct = isPercent100 ? pct : pct * 100
  const barPct = Math.min(displayPct, 100)
  const isHigh = displayPct > 50

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-muted">{label}</span>
        <span className={`font-medium tabular-nums ${isHigh ? 'text-risk-high' : 'text-text-secondary'}`}>
          {displayPct.toFixed(1)}%
        </span>
      </div>
      <AnimatedFill
        pct={barPct}
        color={isHigh ? RISK_COLORS.high : 'var(--color-accent)'}
        height="h-1.5"
      />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-background-elevated">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

function InstitutionList({ data, maxValue }: { data: any[]; maxValue: number }) {
  return (
    <div className="space-y-2">
      {data.map((inst: any, i: number) => {
        const pct = maxValue > 0 ? (inst.total_value_mxn / maxValue) * 100 : 0
        return (
          <div
            key={inst.institution_id}
            className="relative flex items-center justify-between p-3 rounded-lg overflow-hidden interactive"
            style={{
              opacity: 0,
              animation: `vpFadeUp 500ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 70}ms both`,
            }}
          >
            {/* Background proportion bar */}
            <div
              className="absolute inset-y-0 left-0 bg-accent/5 rounded-lg"
              style={{ width: `${pct}%` }}
            />
            <div className="flex items-center gap-2 relative z-10 min-w-0">
              <Building2 className="h-4 w-4 text-text-muted flex-shrink-0" />
              <Link
                to={`/institutions/${inst.institution_id}`}
                className="text-sm hover:text-accent transition-colors truncate max-w-[250px]"
              >
                {toTitleCase(inst.institution_name)}
              </Link>
            </div>
            <div className="text-right relative z-10 flex-shrink-0">
              <p className="text-sm font-medium tabular-nums">{formatCompactMXN(inst.total_value_mxn)}</p>
              <p className="text-xs text-text-muted tabular-nums">{inst.contract_count} contracts</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ContractRow({ contract, onView }: { contract: ContractListItem; onView?: (id: number) => void }) {
  const riskLevel = contract.risk_score != null ? getRiskLevel(contract.risk_score) : null
  const borderColor = riskLevel ? RISK_COLORS[riskLevel] : 'transparent'

  return (
    <div
      className="flex items-center justify-between p-3 interactive cursor-pointer"
      style={{ borderLeft: `3px solid ${borderColor}` }}
      onClick={() => onView?.(contract.id)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-4 w-4 text-text-muted flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-[300px]">{contract.title || 'Untitled'}</p>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>{contract.contract_date ? formatDate(contract.contract_date) : contract.contract_year}</span>
            {contract.institution_name && (
              <>
                <span>·</span>
                <span className="truncate max-w-[150px]">{contract.institution_name}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <p className="text-sm font-medium tabular-nums">{formatCompactMXN(contract.amount_mxn)}</p>
        {contract.risk_score !== undefined && contract.risk_score !== null && (
          <RiskBadge score={contract.risk_score} />
        )}
      </div>
    </div>
  )
}

function VendorProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-80" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// External Flags Panel (SFP Sanctions + RUPC + ASF)
// ============================================================================

function ExternalFlagsPanel({ flags, qqw }: { flags: VendorExternalFlags | undefined; qqw?: VendorQQWResponse }) {
  if (!flags) return <div className="text-text-muted text-sm py-8 text-center">Loading external records...</div>

  const hasSanctions = flags.sfp_sanctions.length > 0
  const hasRUPC = !!flags.rupc
  const hasASF = flags.asf_cases.length > 0
  const hasEFOS = !!flags.sat_efos
  const isEFOSDefinitivo = flags.sat_efos?.stage === 'definitivo'
  const hasAny = hasSanctions || hasRUPC || hasASF || hasEFOS

  return (
    <div className="space-y-6">
      {/* Header status */}
      <div className={cn(
        "flex items-center gap-3 p-4 rounded border",
        (hasSanctions || isEFOSDefinitivo)
          ? "bg-red-950/20 border-red-500/30"
          : "bg-surface-2 border-border/50"
      )}>
        {(hasSanctions || isEFOSDefinitivo) ? (
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
        ) : (
          <Shield className="h-5 w-5 text-text-muted shrink-0" />
        )}
        <div>
          <p className={cn("text-sm font-medium", (hasSanctions || isEFOSDefinitivo) ? "text-red-300" : "text-text-secondary")}>
            {isEFOSDefinitivo
              ? "CRITICAL: Vendor confirmed on SAT Art. 69-B ghost company list"
              : hasSanctions
              ? `${flags.sfp_sanctions.length} SFP sanction record${flags.sfp_sanctions.length > 1 ? 's' : ''} found`
              : hasAny
              ? "No SFP sanctions — external records available"
              : "No external records found for this vendor"}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Sources: SFP Proveedores Sancionados · RUPC Vendor Registry · ASF Audit Findings · SAT Art. 69-B EFOS
          </p>
        </div>
      </div>

      {/* SFP Sanctions */}
      {hasSanctions && (
        <div>
          <div className="editorial-rule mb-3">
            <span className="editorial-label">SANCIONES SFP</span>
          </div>
          <div className="space-y-2">
            {flags.sfp_sanctions.map((s) => (
              <div key={s.id} className="p-3 rounded border border-red-500/20 bg-red-950/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{s.sanction_type || 'Sanction'}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {s.authority && <span>{s.authority} · </span>}
                      {s.sanction_start && <span>{s.sanction_start}</span>}
                      {s.sanction_end && <span> – {s.sanction_end}</span>}
                    </p>
                  </div>
                  {s.amount_mxn && (
                    <span className="text-xs font-mono text-red-400 shrink-0">
                      {formatCompactMXN(s.amount_mxn)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RUPC Registry */}
      <div>
        <div className="editorial-rule mb-3">
          <span className="editorial-label">REGISTRO RUPC</span>
        </div>
        {hasRUPC ? (
          <div className="p-3 rounded border border-border/50 bg-surface-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-text-muted">Compliance Grade</p>
                <p className="font-medium text-text-primary">{flags.rupc!.compliance_grade || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Status</p>
                <p className="font-medium text-text-primary">{flags.rupc!.status || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Registered</p>
                <p className="font-medium text-text-primary">{flags.rupc!.registered_date || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Expires</p>
                <p className="font-medium text-text-primary">{flags.rupc!.expiry_date || '—'}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">
            Not found in RUPC registry.
            {!flags.vendor_id && " RFC required for RUPC lookup."}
          </p>
        )}
      </div>

      {/* ASF Cases */}
      <div>
        <div className="editorial-rule mb-3">
          <span className="editorial-label">HALLAZGOS ASF</span>
        </div>
        {hasASF ? (
          <div className="space-y-2">
            {flags.asf_cases.map((c) => (
              <div key={c.id} className="p-3 rounded border border-amber-500/20 bg-amber-950/10">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.finding_type}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {c.entity_name}
                      {c.report_year && <span> · {c.report_year}</span>}
                    </p>
                    {c.summary && <p className="text-xs text-text-muted mt-1 line-clamp-2">{c.summary}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {c.amount_mxn && (
                      <span className="text-xs font-mono text-amber-400">{formatCompactMXN(c.amount_mxn)}</span>
                    )}
                    {c.report_url && (
                      <a href={c.report_url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-accent hover:underline flex items-center gap-1">
                        Report <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">
            No ASF audit findings on record. ASF data coverage is limited to scraped records.
          </p>
        )}
      </div>

      {/* SAT Art. 69-B EFOS */}
      <div>
        <div className="editorial-rule mb-3">
          <span className="editorial-label">SAT ART. 69-B EFOS</span>
        </div>
        {hasEFOS ? (
          <div className={cn(
            "p-3 rounded border",
            isEFOSDefinitivo
              ? "border-red-500/40 bg-red-950/15"
              : "border-amber-500/30 bg-amber-950/10"
          )}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide",
                    isEFOSDefinitivo
                      ? "bg-red-500/20 text-red-300"
                      : "bg-amber-500/20 text-amber-300"
                  )}>
                    {flags.sat_efos!.stage}
                  </span>
                </div>
                <p className="text-sm font-medium text-text-primary">{flags.sat_efos!.company_name}</p>
                {flags.sat_efos!.dof_date && (
                  <p className="text-xs text-text-muted mt-0.5">Published DOF: {flags.sat_efos!.dof_date}</p>
                )}
                <p className="text-xs text-text-muted mt-1">
                  {isEFOSDefinitivo
                    ? "Confirmed ghost company — invoices from this vendor are presumed fraudulent under Art. 69-B CFF."
                    : flags.sat_efos!.stage === 'presunto'
                    ? "Under review as presumed ghost company (Art. 69-B CFF)."
                    : flags.sat_efos!.stage === 'favorecido'
                    ? "Received invoices from a confirmed ghost company."
                    : "Successfully challenged Art. 69-B classification."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted italic">
            Not found on SAT Art. 69-B EFOS/EDOS ghost company list.
          </p>
        )}
      </div>

      {/* QQW Cross-Reference */}
      <div>
        <div className="editorial-rule mb-3">
          <span className="editorial-label">QUIENESQUIEN.WIKI</span>
        </div>
        {!qqw ? (
          <p className="text-sm text-text-muted italic">Loading QQW data...</p>
        ) : !qqw.has_data ? (
          <div className="p-3 rounded border border-border/40 bg-surface-2">
            <p className="text-sm text-text-muted italic">{qqw.note}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Procurement officials */}
            {qqw.procurement_officials.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-2">
                  Procurement officials who signed contracts with this vendor (from QQW dataset):
                </p>
                <div className="space-y-1.5">
                  {qqw.procurement_officials.slice(0, 8).map((official) => (
                    <div
                      key={official.contact_person_id}
                      className="flex items-start justify-between gap-3 p-2.5 rounded border border-border/40 bg-surface-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate capitalize">
                          {official.contact_person_name.replace(/-/g, ' ')}
                        </p>
                        {official.buyer_institutions.length > 0 && (
                          <p className="text-xs text-text-muted truncate mt-0.5">
                            {official.buyer_institutions.slice(0, 2).join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
                        {official.contract_count} contract{official.contract_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent contracts from QQW */}
            <div>
              <p className="text-xs text-text-muted mb-2">
                Recent contracts in QQW dataset ({qqw.qqw_contract_count} total):
              </p>
              <div className="space-y-1.5">
                {qqw.contracts.slice(0, 6).map((c, i) => (
                  <div
                    key={c.qqw_ocid ?? i}
                    className="flex items-start justify-between gap-3 p-2.5 rounded border border-border/40 bg-surface-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-text-muted truncate">
                        {c.buyer_name || c.buyer_institution || '—'}
                      </p>
                      {c.contact_person_name && (
                        <p className="text-xs text-accent truncate capitalize">
                          {c.contact_person_name.replace(/-/g, ' ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {c.contract_value != null && (
                        <p className="text-xs font-mono text-text-primary">
                          {c.contract_currency === 'MXN'
                            ? formatCompactMXN(c.contract_value)
                            : `${c.contract_currency} ${c.contract_value.toLocaleString()}`}
                        </p>
                      )}
                      {c.contract_date && (
                        <p className="text-xs text-text-muted">{c.contract_date.slice(0, 10)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-text-muted">{qqw.note}</p>
          </div>
        )}
      </div>

      {/* Data source notice */}
      <p className="text-xs text-text-muted border-t border-border/30 pt-4">
        External data is loaded from public registries and may be incomplete. SFP sanctions and RUPC data
        must be refreshed manually via backend scripts. ASF coverage depends on web scraping availability.
        SAT Art. 69-B list updated monthly via <code className="font-mono">scripts/load_sat_efos.py</code>.
        QQW data fetched via <code className="font-mono">scripts/fetch_qqw_data.py</code> (top 200 high-risk vendors).
      </p>
    </div>
  )
}

export default VendorProfile
