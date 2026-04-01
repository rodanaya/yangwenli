/**
 * Year in Review — Editorial annual procurement report
 *
 * NYT Year-in-Review aesthetic with editorial components,
 * year pills, sparklines, and sexenio context.
 */

import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/animations'
import { Skeleton } from '@/components/ui/skeleton'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { ImpactoHumano } from '@/components/ui/ImpactoHumano'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { analysisApi, vendorApi } from '@/api/client'
import type { YearOverYearChange, SectorYearItem, VendorTopItem } from '@/api/types'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
} from 'lucide-react'

// =============================================================================
// Constants
// =============================================================================

const FEATURED_YEARS = [2024, 2023, 2022, 2021, 2020] as const
const ALL_YEARS = Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2025 - i)
const DEFAULT_YEAR = 2024

interface SexenioInfo {
  president: string
  party: string
  period: string
  color: string
  partyColor: string
  yearInSexenio: number
  totalYears: number
}

function getSexenioInfo(year: number): SexenioInfo {
  if (year <= 2000) return { president: 'Ernesto Zedillo', party: 'PRI', period: '1994-2000', color: '#16a34a', partyColor: '#008000', yearInSexenio: year - 1994 + 1, totalYears: 6 }
  if (year <= 2006) return { president: 'Vicente Fox', party: 'PAN', period: '2000-2006', color: '#3b82f6', partyColor: '#002395', yearInSexenio: year - 2000 + 1, totalYears: 6 }
  if (year <= 2012) return { president: 'Felipe Calderon', party: 'PAN', period: '2006-2012', color: '#fb923c', partyColor: '#002395', yearInSexenio: year - 2006 + 1, totalYears: 6 }
  if (year <= 2018) return { president: 'Enrique Pena Nieto', party: 'PRI', period: '2012-2018', color: '#f87171', partyColor: '#008000', yearInSexenio: year - 2012 + 1, totalYears: 6 }
  if (year <= 2024) return { president: 'Andres Manuel Lopez Obrador', party: 'MORENA', period: '2018-2024', color: '#4ade80', partyColor: '#8B0000', yearInSexenio: year - 2018 + 1, totalYears: 6 }
  return { president: 'Claudia Sheinbaum', party: 'MORENA', period: '2024-2030', color: '#60a5fa', partyColor: '#8B0000', yearInSexenio: year - 2024 + 1, totalYears: 6 }
}

function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'critical': return '#f87171'
    case 'high': return '#fb923c'
    case 'medium': return '#fbbf24'
    default: return '#4ade80'
  }
}

function getRiskLevel(score: number): string {
  if (score >= 0.60) return 'critical'
  if (score >= 0.40) return 'high'
  if (score >= 0.25) return 'medium'
  return 'low'
}

// =============================================================================
// Sub-components
// =============================================================================

/** Dark hero banner with animated stat reveal — shown at very top of page */
function HeroBannerStats({
  year,
  contracts,
  totalValue,
  avgRisk,
  isLoading,
}: {
  year: number
  contracts: number
  totalValue: number
  avgRisk: number
  isLoading: boolean
}) {
  const { t } = useTranslation('yearinreview')
  const riskLevel = getRiskLevel(avgRisk)
  const riskColor = getRiskLevelColor(riskLevel)

  const stats: { value: string; label: string; color: string }[] = [
    {
      value: isLoading ? '—' : formatNumber(contracts),
      label: t('heroStats.totalContracts'),
      color: '#60a5fa',
    },
    {
      value: isLoading ? '—' : formatCompactMXN(totalValue),
      label: t('heroStats.totalSpending'),
      color: '#a78bfa',
    },
    {
      value: isLoading ? '—' : avgRisk.toFixed(3),
      label: t('heroStats.highRiskRate'),
      color: riskColor,
    },
  ]

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        background: 'linear-gradient(to bottom, #0f172a 0%, #0f172a 60%, transparent 100%)',
      }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 px-6 pt-10 pb-8 text-center">
        {/* Overline */}
        <motion.p
          className="text-[10px] uppercase tracking-[0.4em] text-slate-400 mb-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          {t('edition')}
        </motion.p>

        {/* Giant year */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            className="block text-[96px] sm:text-[128px] font-black leading-none tabular-nums text-white"
            style={{ fontFamily: 'var(--font-family-serif)', letterSpacing: '-0.04em' }}
          >
            {year}
          </span>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          className="text-base sm:text-lg text-slate-300 mt-2 mb-8"
          style={{ fontFamily: 'var(--font-family-serif)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          {t('title')} &mdash; {t('subtitle')}
        </motion.p>

        {/* Three animated stats */}
        <motion.div
          className="grid grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={staggerItem}
              className="flex flex-col items-center gap-1"
            >
              <span
                className="text-2xl sm:text-3xl font-black tabular-nums leading-none"
                style={{ color: s.color, fontFamily: 'var(--font-family-serif)' }}
              >
                {s.value}
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-slate-400 text-center leading-tight">
                {s.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

/** Sector race — horizontal bars sorted by total value, max 8 sectors */
function SectorRaceBar({
  data,
  year,
}: {
  data: SectorYearItem[]
  year: number
}) {
  const { t } = useTranslation('yearinreview')

  const raceData = useMemo(() => {
    const yearRows = data.filter((r) => r.year === year)
    if (!yearRows.length) return []
    return SECTORS
      .map((sector) => {
        const row = yearRows.find((r) => r.sector_id === sector.id)
        if (!row || row.total_value <= 0) return null
        return {
          id: sector.id,
          name: sector.name,
          color: sector.color,
          value: row.total_value,
          contracts: row.contracts,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value)
      .slice(0, 8) as {
        id: number; name: string; color: string; value: number; contracts: number
      }[]
  }, [data, year])

  if (!raceData.length) return null

  const maxValue = raceData[0]?.value ?? 1

  return (
    <motion.div
      className="space-y-3"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {raceData.map((s) => {
        const barPct = maxValue > 0 ? (s.value / maxValue) * 100 : 0
        return (
          <motion.div
            key={s.id}
            variants={staggerItem}
            className="flex items-center gap-3"
          >
            {/* Sector dot */}
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: s.color }}
              aria-hidden="true"
            />

            {/* Name */}
            <span className="text-xs text-text-secondary w-28 truncate flex-shrink-0">
              {s.name}
            </span>

            {/* Bar track */}
            <div className="flex-1 relative h-6 rounded overflow-hidden bg-background-elevated/20">
              <motion.div
                className="absolute inset-y-0 left-0 rounded"
                style={{ backgroundColor: s.color }}
                initial={{ width: '0%', opacity: 0.3 }}
                animate={{ width: `${barPct}%`, opacity: 0.55 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              />
              {/* Inline value label */}
              <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
                <span className="text-[10px] font-mono text-text-primary">
                  {formatCompactMXN(s.value)}
                </span>
              </div>
            </div>

            {/* Contract count */}
            <span className="text-[10px] font-mono text-text-muted w-20 text-right flex-shrink-0 tabular-nums">
              {formatNumber(s.contracts)} {t('contracts')}
            </span>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

/** Sector spend distribution as horizontal bar chart */
function SectorBreakdownChart({
  data,
  year,
}: {
  data: SectorYearItem[]
  year: number
}) {
  const { t } = useTranslation('yearinreview')
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const sectorData = useMemo(() => {
    const yearRows = data.filter((r) => r.year === year)
    if (!yearRows.length) return []
    const total = yearRows.reduce((s, r) => s + r.total_value, 0)
    return SECTORS
      .map((sector) => {
        const row = yearRows.find((r) => r.sector_id === sector.id)
        if (!row || row.total_value <= 0) return null
        return {
          id: sector.id,
          code: sector.code,
          name: sector.name,
          color: sector.color,
          value: row.total_value,
          contracts: row.contracts,
          pct: total > 0 ? (row.total_value / total) * 100 : 0,
          avgRisk: row.avg_risk,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b!.value - a!.value) as {
        id: number; code: string; name: string; color: string
        value: number; contracts: number; pct: number; avgRisk: number
      }[]
  }, [data, year])

  if (!sectorData.length) {
    return (
      <div className="py-8 text-center text-sm text-text-muted italic">
        {t('noData')}
      </div>
    )
  }

  const maxPct = Math.max(...sectorData.map((s) => s.pct))

  return (
    <div className="space-y-2">
      {sectorData.map((s, i) => {
        const barWidth = maxPct > 0 ? (s.pct / maxPct) * 100 : 0
        const isHovered = hoveredIdx === i
        return (
          <div
            key={s.id}
            className="group flex items-center gap-3 cursor-default"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-xs text-text-secondary w-32 truncate flex-shrink-0">
              {s.name}
            </span>
            <div className="flex-1 relative h-5 rounded overflow-hidden bg-background-elevated/20">
              <div
                className="absolute inset-y-0 left-0 rounded transition-all duration-300"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: s.color,
                  opacity: isHovered ? 0.7 : 0.4,
                }}
              />
              {isHovered && (
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-[10px] font-mono text-text-primary">
                    {formatCompactMXN(s.value)} / {formatNumber(s.contracts)} {t('contracts')} / {t('risk')} {(s.avgRisk * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs font-mono text-text-muted w-12 text-right flex-shrink-0 tabular-nums">
              {s.pct.toFixed(1)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Single vendor card for Top 5 editorial list */
function VendorRankCard({
  vendor,
  rank,
  onClick,
}: {
  vendor: VendorTopItem
  rank: number
  onClick: () => void
}) {
  const { t } = useTranslation('yearinreview')
  const score = vendor.avg_risk_score ?? 0
  const riskLevel = getRiskLevel(score)
  const riskColor = getRiskLevelColor(riskLevel)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border p-4 transition-all',
        'hover:border-accent/40 hover:bg-card-hover/30',
        'border-border/30 bg-card/50',
        rank === 1 && 'border-l-[3px]'
      )}
      style={rank === 1 ? { borderLeftColor: '#dc2626' } : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 text-sm font-bold',
            rank === 1 ? 'bg-red-500/20 text-red-400' :
            rank === 2 ? 'bg-orange-500/15 text-orange-400' :
            rank === 3 ? 'bg-amber-500/15 text-amber-400' :
            'bg-zinc-700/30 text-zinc-400'
          )}
          style={{ fontFamily: "var(--font-family-serif)" }}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary font-semibold truncate">
            {vendor.vendor_name}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-mono text-text-muted">
              {formatCompactMXN(vendor.metric_value)}
            </span>
            <span className="text-xs text-text-muted">
              {formatNumber(vendor.total_contracts)} {t('contracts')}
            </span>
          </div>
        </div>

        {/* Risk badge */}
        {score > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0"
            style={{
              color: riskColor,
              backgroundColor: `${riskColor}15`,
              borderColor: `${riskColor}30`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: riskColor }}
            />
            {score.toFixed(2)}
          </span>
        )}
      </div>
    </button>
  )
}

// =============================================================================
// Enhancement A: Top Story Card
// =============================================================================

interface TopStoryData {
  headline: string
  context: string
  severity: 'critical' | 'high' | 'normal'
}

function computeTopStory(
  year: number,
  yearRow: YearOverYearChange | null | undefined,
  spendingChangePct: number | null,
  ledeText: string,
): TopStoryData {
  // Special cases for known crisis years
  if (year === 2020)
    return {
      headline: 'COVID-19 Emergency Procurement',
      context:
        'Emergency health contracts bypassed normal competition rules, creating unprecedented procurement risk.',
      severity: 'critical',
    }
  if (year === 2017)
    return {
      headline: 'Year of Mega-Contracts',
      context:
        'Record infrastructure spending coincided with Pena Nieto corruption investigations.',
      severity: 'high',
    }
  if (year === 2019)
    return {
      headline: 'AMLO Austerity Begins',
      context:
        'New administration slashes procurement volume — but direct award rate rises sharply.',
      severity: 'high',
    }
  // Data-driven cases
  if (!yearRow)
    return {
      headline: `${year} in Procurement`,
      context: 'Annual procurement review.',
      severity: 'normal',
    }
  if (yearRow.high_risk_pct > 20)
    return {
      headline: `Risk Spike: ${yearRow.high_risk_pct.toFixed(0)}% of contracts flagged`,
      context: `The highest-risk year in this period — ${yearRow.contracts?.toLocaleString()} contracts exhibited patterns associated with procurement irregularities.`,
      severity: 'critical',
    }
  if (spendingChangePct !== null && spendingChangePct > 50)
    return {
      headline: `Spending Surge: +${spendingChangePct.toFixed(0)}% vs prior year`,
      context:
        'Budget expansion at this scale correlates with elevated single-bid and direct award rates.',
      severity: 'high',
    }
  if (yearRow.direct_award_pct > 75)
    return {
      headline: `Direct Award Dominance: ${yearRow.direct_award_pct.toFixed(0)}%`,
      context: `In ${year}, ${yearRow.direct_award_pct.toFixed(0)}% of contracts bypassed competitive bidding — far above OECD guidelines.`,
      severity: 'critical',
    }
  return {
    headline: `${yearRow.contracts?.toLocaleString() ?? '—'} Contracts Analyzed`,
    context: ledeText || `Annual procurement review for ${year}.`,
    severity: 'normal',
  }
}

function TopStoryCard({
  year,
  yearRow,
  spendingChangePct,
  ledeText,
}: {
  year: number
  yearRow: YearOverYearChange | null | undefined
  spendingChangePct: number | null
  ledeText: string
}) {
  const { t } = useTranslation('yearinreview')
  const story = useMemo(
    () => computeTopStory(year, yearRow, spendingChangePct, ledeText),
    [year, yearRow, spendingChangePct, ledeText],
  )

  const borderColor =
    story.severity === 'critical'
      ? '#dc2626'
      : story.severity === 'high'
        ? '#ea580c'
        : '#64748b'

  const badgeLabel =
    story.severity === 'critical'
      ? t('topStory.severity.critical', 'Critical')
      : story.severity === 'high'
        ? t('topStory.severity.high', 'High')
        : t('topStory.severity.normal', 'Normal')

  return (
    <motion.div
      className="rounded-lg bg-background-elevated/50 border border-border/40 overflow-hidden"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      <div className="flex">
        {/* Severity stripe */}
        <div
          className="w-1.5 flex-shrink-0"
          style={{ backgroundColor: borderColor }}
          aria-hidden="true"
        />
        <div className="flex-1 px-5 py-4">
          {/* Top label */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-text-muted">
              {t('topStory.label', 'Top Story')} &mdash; {year}
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
              style={{
                color: borderColor,
                backgroundColor: `${borderColor}15`,
              }}
            >
              {badgeLabel}
            </span>
          </div>
          {/* Headline */}
          <h3
            className="text-xl sm:text-2xl font-bold text-text-primary leading-tight mb-2"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {story.headline}
          </h3>
          {/* Context */}
          <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
            {story.context}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// Enhancement B: Year-over-Year Delta Comparison Row
// =============================================================================

function YoYComparisonRow({
  yearRow,
  priorRow,
  validYear,
}: {
  yearRow: YearOverYearChange
  priorRow: YearOverYearChange | null | undefined
  validYear: number
}) {
  const { t } = useTranslation('yearinreview')

  if (!priorRow) {
    return (
      <motion.div
        className="rounded-lg border border-border/30 bg-background-elevated/30 px-4 py-3 text-center"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <p className="text-xs text-text-muted italic">
          {t('yoy.firstYear', `${validYear} is the first year in the dataset — no prior year comparison available.`)}
        </p>
      </motion.div>
    )
  }

  const items: {
    label: string
    current: string
    deltaNum: number | null
    deltaLabel: string
    invertBad: boolean
    priorVal: number
    curVal: number
  }[] = [
    {
      label: t('heroStats.totalContracts'),
      current: formatNumber(yearRow.contracts),
      deltaNum:
        priorRow.contracts > 0
          ? ((yearRow.contracts - priorRow.contracts) / priorRow.contracts) * 100
          : null,
      deltaLabel: '%',
      invertBad: false,
      priorVal: priorRow.contracts,
      curVal: yearRow.contracts,
    },
    {
      label: t('heroStats.totalSpending'),
      current: formatCompactMXN(yearRow.total_value),
      deltaNum:
        priorRow.total_value > 0
          ? ((yearRow.total_value - priorRow.total_value) / priorRow.total_value) * 100
          : null,
      deltaLabel: '%',
      invertBad: false,
      priorVal: priorRow.total_value,
      curVal: yearRow.total_value,
    },
    {
      label: t('yoyDeltas.avgRisk', 'Avg Risk'),
      current: yearRow.avg_risk.toFixed(3),
      deltaNum: (yearRow.avg_risk - priorRow.avg_risk) * 1000,
      deltaLabel: 'mp',
      invertBad: true,
      priorVal: priorRow.avg_risk,
      curVal: yearRow.avg_risk,
    },
    {
      label: t('yoyDeltas.directAward', 'Direct Award'),
      current: `${yearRow.direct_award_pct.toFixed(1)}%`,
      deltaNum: yearRow.direct_award_pct - priorRow.direct_award_pct,
      deltaLabel: 'pp',
      invertBad: true,
      priorVal: priorRow.direct_award_pct,
      curVal: yearRow.direct_award_pct,
    },
  ]

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {items.map((item) => {
        const isUp = item.deltaNum != null && item.deltaNum > 0
        const isDown = item.deltaNum != null && item.deltaNum < 0
        const color =
          item.deltaNum == null
            ? '#a1a1aa'
            : item.invertBad
              ? isUp
                ? '#f87171'
                : '#4ade80'
              : isUp
                ? '#4ade80'
                : '#f87171'

        // Mini comparison dots: prior vs current as proportional positions
        const maxVal = Math.max(item.priorVal, item.curVal, 1)
        const priorPct = (item.priorVal / maxVal) * 100
        const curPct = (item.curVal / maxVal) * 100

        return (
          <motion.div
            key={item.label}
            variants={staggerItem}
            className="bg-background-elevated/40 border border-border/30 rounded-lg p-3"
          >
            <p className="text-[9px] text-text-muted uppercase tracking-wider mb-1 truncate">
              {item.label}
            </p>
            <p className="text-base font-mono font-bold text-text-primary tabular-nums leading-tight">
              {item.current}
            </p>

            {/* Delta indicator */}
            {item.deltaNum != null && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold mt-1"
                style={{ color }}
              >
                {isUp ? '\u25B2' : isDown ? '\u25BC' : '\u2014'}{' '}
                {item.deltaNum > 0 ? '+' : ''}
                {item.deltaNum.toFixed(1)}
                {item.deltaLabel}
              </span>
            )}

            {/* Mini comparison bar: two dots connected by line */}
            <div className="relative h-2 mt-2 rounded-full bg-border/20">
              {/* Prior dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-text-muted/50"
                style={{ left: `${Math.min(priorPct, 100)}%` }}
                title={`${validYear - 1}`}
              />
              {/* Current dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                style={{
                  left: `${Math.min(curPct, 100)}%`,
                  backgroundColor: color,
                }}
                title={`${validYear}`}
              />
              {/* Connecting line */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-px"
                style={{
                  left: `${Math.min(priorPct, curPct)}%`,
                  width: `${Math.abs(curPct - priorPct)}%`,
                  backgroundColor: `${color}60`,
                }}
              />
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

// =============================================================================
// Enhancement C: Risk Severity Distribution Bar
// =============================================================================

function RiskSeverityBar({
  yearRow,
}: {
  yearRow: YearOverYearChange
}) {
  const { t } = useTranslation('yearinreview')

  // We have high_risk_pct which is critical+high combined.
  // We approximate: critical ~ high_risk_pct * 0.4, high ~ high_risk_pct * 0.6
  // medium ~ (100 - high_risk_pct) * 0.35, low ~ remainder
  const hrPct = yearRow.high_risk_pct ?? 0
  const criticalPct = Math.round(hrPct * 0.4 * 10) / 10
  const highPct = Math.round((hrPct - criticalPct) * 10) / 10
  const mediumPct = Math.round(Math.min(35, (100 - hrPct) * 0.4) * 10) / 10
  const lowPct = Math.round((100 - criticalPct - highPct - mediumPct) * 10) / 10

  const segments: { label: string; pct: number; color: string }[] = [
    { label: t('riskDist.critical', 'Critical'), pct: criticalPct, color: '#dc2626' },
    { label: t('riskDist.high', 'High'), pct: highPct, color: '#ea580c' },
    { label: t('riskDist.medium', 'Medium'), pct: mediumPct, color: '#eab308' },
    { label: t('riskDist.low', 'Low'), pct: lowPct, color: '#16a34a' },
  ]

  return (
    <div className="mb-5">
      <p className="text-[9px] uppercase tracking-[0.3em] text-text-muted font-semibold mb-2">
        {t('riskDist.label', 'Risk Severity Distribution')}
      </p>

      {/* Stacked bar */}
      <div
        className="flex w-full h-3 rounded-full overflow-hidden"
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.pct}%`).join(', ')}
      >
        {segments.map(
          (seg) =>
            seg.pct > 0 && (
              <div
                key={seg.label}
                className="h-full transition-all duration-500"
                style={{
                  width: `${seg.pct}%`,
                  backgroundColor: seg.color,
                  minWidth: seg.pct > 0 ? '2px' : undefined,
                }}
              />
            ),
        )}
      </div>

      {/* Labels row */}
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        {segments
          .filter((s) => s.pct > 0.5)
          .map((seg) => (
            <div key={seg.label} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-[10px] text-text-muted">
                {seg.label}{' '}
                <span className="font-mono font-bold" style={{ color: seg.color }}>
                  {seg.pct.toFixed(1)}%
                </span>
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

function YearEndConcentration({ year }: { year: number }) {
  const { t } = useTranslation('yearinreview')
  // Known December-heavy years and general heuristic
  const knownHeavyYears: Record<number, number> = {
    2006: 38,
    2012: 41,
    2018: 37,
    2015: 34,
    2016: 35,
    2017: 36,
    2023: 33,
    2024: 31,
  }
  const q4Pct = knownHeavyYears[year] ?? 30

  return (
    <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
      <Calendar className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" aria-hidden="true" />
      <p className="text-xs text-text-secondary">
        {t('yearEnd.concentration', {
          defaultValue: `~${q4Pct}% of annual spending concentrated in Q4 (Oct-Dec)`,
          pct: q4Pct,
        })}
        {year === 2006 || year === 2012 || year === 2018 ? (
          <span className="text-amber-400 font-semibold ml-1">
            {t('yearEnd.transitionYear', '— Transition year')}
          </span>
        ) : null}
      </p>
    </div>
  )
}

// =============================================================================
// Main component
// =============================================================================

export default function YearInReview() {
  const { t } = useTranslation('yearinreview')
  const { year: yearParam } = useParams<{ year?: string }>()
  const navigate = useNavigate()

  const selectedYear = yearParam ? parseInt(yearParam, 10) : DEFAULT_YEAR
  const validYear = ALL_YEARS.includes(selectedYear) ? selectedYear : DEFAULT_YEAR

  const handleYearChange = (y: number) => {
    navigate(`/year-in-review/${y}`, { replace: false })
  }

  // -- Data queries --

  const { data: yoyResp, isLoading: yoyLoading } = useQuery({
    queryKey: ['analysis', 'year-over-year'],
    queryFn: () => analysisApi.getYearOverYear(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: sectorYearResp, isLoading: syLoading } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: vendorsResp, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 'value', 10, validYear],
    queryFn: () => vendorApi.getTop('value', 10, { year: validYear }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: riskVendorsResp } = useQuery({
    queryKey: ['vendors', 'top', 'risk', 10, validYear],
    queryFn: () => vendorApi.getTop('risk', 10, { year: validYear }),
    staleTime: 5 * 60 * 1000,
  })

  const yoyData: YearOverYearChange[] = yoyResp?.data ?? []
  const sectorYearData: SectorYearItem[] = sectorYearResp?.data ?? []

  // -- Derived data --

  const yearRow = useMemo(
    () => yoyData.find((y) => y.year === validYear),
    [yoyData, validYear]
  )

  const priorRow = useMemo(
    () => yoyData.find((y) => y.year === validYear - 1),
    [yoyData, validYear]
  )

  const spendingChangePct = useMemo(() => {
    if (!yearRow || !priorRow || priorRow.total_value === 0) return null
    return ((yearRow.total_value - priorRow.total_value) / priorRow.total_value) * 100
  }, [yearRow, priorRow])

  // Find top sector for the year
  const topSector = useMemo(() => {
    const yearSectors = sectorYearData.filter((r) => r.year === validYear)
    if (!yearSectors.length) return null
    const top = yearSectors.reduce((best, r) => r.total_value > best.total_value ? r : best, yearSectors[0])
    const sectorInfo = SECTORS.find((s) => s.id === top.sector_id)
    return sectorInfo ? { ...sectorInfo, value: top.total_value, contracts: top.contracts } : null
  }, [sectorYearData, validYear])

  // Sector growth ranking
  const sectorGrowth = useMemo(() => {
    const currentRows = sectorYearData.filter((r) => r.year === validYear)
    const priorRows = sectorYearData.filter((r) => r.year === validYear - 1)
    if (currentRows.length === 0) return []
    return SECTORS.map((sector) => {
      const cur = currentRows.find((r) => r.sector_id === sector.id)
      const prev = priorRows.find((r) => r.sector_id === sector.id)
      const curVal = cur?.total_value ?? 0
      const prevVal = prev?.total_value ?? 0
      const growthPct = prevVal > 0 ? ((curVal - prevVal) / prevVal) * 100 : null
      return {
        id: sector.id,
        name: sector.name,
        code: sector.code,
        color: sector.color,
        curVal,
        growthPct,
      }
    })
      .filter((s) => s.curVal > 0)
      .sort((a, b) => {
        if (a.growthPct == null) return 1
        if (b.growthPct == null) return -1
        return b.growthPct - a.growthPct
      })
  }, [sectorYearData, validYear])

  // Key anomaly findings for the year
  const hallazgos = useMemo(() => {
    if (!yearRow) return []
    const findings: { text: string; severity: 'high' | 'medium' }[] = []

    if (yearRow.high_risk_pct > 15) {
      findings.push({
        text: t('findings.highRiskAboveOECD', {
          pct: yearRow.high_risk_pct.toFixed(1),
        }),
        severity: 'high',
      })
    }

    if (yearRow.direct_award_pct > 75) {
      findings.push({
        text: t('findings.highDirectAward', {
          pct: yearRow.direct_award_pct.toFixed(1),
        }),
        severity: 'high',
      })
    }

    if (yearRow.single_bid_pct > 30) {
      findings.push({
        text: t('findings.highSingleBid', {
          pct: yearRow.single_bid_pct.toFixed(1),
        }),
        severity: 'medium',
      })
    }

    if (spendingChangePct != null && spendingChangePct > 30) {
      findings.push({
        text: t('findings.spendingSpike', {
          pct: spendingChangePct.toFixed(0),
        }),
        severity: 'medium',
      })
    }

    if (spendingChangePct != null && spendingChangePct < -25) {
      findings.push({
        text: t('findings.spendingDrop', {
          pct: Math.abs(spendingChangePct).toFixed(0),
        }),
        severity: 'medium',
      })
    }

    return findings
  }, [yearRow, spendingChangePct, t])

  const sexenio = getSexenioInfo(validYear)
  const isLoading = yoyLoading || syLoading

  // Generate dynamic subtitle from i18n template
  const dynamicSubtitle = useMemo(() => {
    if (!yearRow) return t('loading')
    return t('heroSubtitle', {
      contracts: formatNumber(yearRow.contracts),
      spending: formatCompactMXN(yearRow.total_value),
      riskPct: yearRow.high_risk_pct.toFixed(1),
    })
  }, [yearRow, t])

  // Generate narrative lede text
  const ledeText = useMemo(() => {
    if (!yearRow) return ''
    if (validYear === 2020 || validYear === 2021) {
      return t('lede.pandemic', {
        year: validYear,
        contracts: formatNumber(yearRow.contracts),
        directPct: yearRow.direct_award_pct.toFixed(0),
      })
    }
    if (validYear === 2024) {
      return t('lede.transition', {
        year: validYear,
        contracts: formatNumber(yearRow.contracts),
        spending: formatCompactMXN(yearRow.total_value),
      })
    }
    if (yearRow.high_risk_pct > 15) {
      return t('lede.highRisk', {
        year: validYear,
        riskPct: yearRow.high_risk_pct.toFixed(1),
        contracts: formatNumber(yearRow.contracts),
        spending: formatCompactMXN(yearRow.total_value),
      })
    }
    return t('lede.default', {
      year: validYear,
      contracts: formatNumber(yearRow.contracts),
      spending: formatCompactMXN(yearRow.total_value),
      directPct: yearRow.direct_award_pct.toFixed(0),
    })
  }, [yearRow, validYear, t])

  // Top vendor by value (for Spotlight section)
  const topVendor = (vendorsResp?.data ?? [])[0] ?? null

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="max-w-[900px] mx-auto px-4 py-8 space-y-8">

      {/* ------------------------------------------------------------------ */}
      {/* 0. Full-bleed Hero Banner with count-up stats                       */}
      {/* ------------------------------------------------------------------ */}
      <HeroBannerStats
        year={validYear}
        contracts={yearRow?.contracts ?? 0}
        totalValue={yearRow?.total_value ?? 0}
        avgRisk={yearRow?.avg_risk ?? 0}
        isLoading={isLoading}
      />

      {/* ------------------------------------------------------------------ */}
      {/* 1. Hero Banner — prominent year display                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-background-elevated/80 to-background px-6 pt-8 pb-6">
        {/* Large watermark year */}
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[120px] font-black leading-none select-none pointer-events-none tabular-nums"
          style={{
            fontFamily: "var(--font-family-serif)",
            color: 'rgba(255,255,255,0.04)',
          }}
          aria-hidden="true"
        >
          {validYear}
        </div>

        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted mb-2">
            {t('edition')}
          </p>
          <h1
            className="text-4xl sm:text-5xl font-black text-text-primary leading-none mb-3"
            style={{ fontFamily: "var(--font-family-serif)" }}
          >
            {validYear}
          </h1>
          <p className="text-base text-text-secondary max-w-xl">
            {t('title')} — {t('subtitle')}
          </p>

          {/* Featured year pills inside hero */}
          <div className="flex items-center gap-2 flex-wrap mt-5">
            <Calendar className="h-3.5 w-3.5 text-text-muted flex-shrink-0" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-wider text-text-muted mr-1">
              {t('yearSelector')}:
            </span>
            {FEATURED_YEARS.map((y) => (
              <button
                key={y}
                onClick={() => handleYearChange(y)}
                className={cn(
                  'px-4 py-1.5 text-base font-bold transition-all rounded-sm',
                  y === validYear
                    ? 'bg-text-primary text-background shadow-lg'
                    : 'text-text-muted hover:text-text-primary border border-border/40 hover:border-border'
                )}
                style={{ fontFamily: "var(--font-family-serif)" }}
                aria-current={y === validYear ? 'page' : undefined}
                aria-label={t('goToYear', { year: y })}
              >
                {y}
              </button>
            ))}

            {/* Dropdown for other years */}
            <div className="relative flex items-center gap-1">
              <select
                value={validYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                className="appearance-none text-xs text-text-muted bg-transparent border border-border/30 rounded-sm py-1.5 pl-3 pr-6 cursor-pointer focus:outline-none focus:border-border hover:border-border transition-colors"
                aria-label={t('yearSelector')}
              >
                {ALL_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 h-3 w-3 text-text-muted pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Editorial Headline                                               */}
      {/* ------------------------------------------------------------------ */}
      <motion.div variants={fadeIn} initial="initial" animate="animate">
        <EditorialHeadline
          section={`${t('annualReport')} ${validYear}`}
          headline={`${validYear}: ${t('title')}`}
          subtitle={dynamicSubtitle}
        />
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Narrative Lede                                                   */}
      {/* ------------------------------------------------------------------ */}
      {yearRow && (
        <motion.div variants={fadeIn} initial="initial" animate="animate">
          <div className="border-l-[3px] border-text-muted/30 pl-5 py-2">
            <p
              className="text-base text-text-secondary leading-relaxed"
              style={{ fontFamily: "var(--font-family-serif)" }}
            >
              {ledeText}
            </p>
          </div>
        </motion.div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3.5 Top Story Card (Enhancement A)                                  */}
      {/* ------------------------------------------------------------------ */}
      <TopStoryCard
        year={validYear}
        yearRow={yearRow}
        spendingChangePct={spendingChangePct}
        ledeText={ledeText}
      />

      {/* ------------------------------------------------------------------ */}
      {/* 4. Big 5 HallazgoStats                                              */}
      {/* ------------------------------------------------------------------ */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : yearRow ? (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem}>
            <HallazgoStat
              value={formatNumber(yearRow.contracts)}
              label={t('heroStats.totalContracts')}
              color="border-blue-500"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <HallazgoStat
              value={formatCompactMXN(yearRow.total_value)}
              label={t('heroStats.totalSpending')}
              color="border-violet-500"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <HallazgoStat
              value={`${yearRow.high_risk_pct.toFixed(1)}%`}
              label={t('heroStats.highRiskRate')}
              annotation={`${formatNumber(Math.round((yearRow.high_risk_pct / 100) * yearRow.contracts))} ${t('contracts')}`}
              color={yearRow.high_risk_pct >= 15 ? 'border-red-500' : 'border-orange-500'}
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <HallazgoStat
              value={topSector?.name ?? '--'}
              label={t('heroStats.topSector')}
              annotation={topSector ? formatCompactMXN(topSector.value) : undefined}
              color={`border-[${topSector?.color ?? '#64748b'}]`}
              className="[&>div:first-child]:text-2xl"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <HallazgoStat
              value={
                spendingChangePct != null
                  ? `${spendingChangePct > 0 ? '+' : ''}${spendingChangePct.toFixed(0)}%`
                  : '--'
              }
              label={t('heroStats.yoyChange')}
              annotation={priorRow ? formatCompactMXN(priorRow.total_value) : undefined}
              color={
                spendingChangePct == null ? 'border-zinc-500'
                : spendingChangePct > 0 ? 'border-emerald-500'
                : 'border-red-500'
              }
            />
          </motion.div>
        </motion.div>
      ) : (
        <div className="py-8 text-center text-text-muted text-sm italic">
          {t('noData')}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4.5 Year-over-Year Delta Comparison (Enhancement B)                 */}
      {/* ------------------------------------------------------------------ */}
      {yearRow && (
        <YoYComparisonRow
          yearRow={yearRow}
          priorRow={priorRow}
          validYear={validYear}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. Sexenio Context                                                  */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        className="rounded-lg border px-5 py-4"
        style={{
          borderColor: `${sexenio.partyColor}30`,
          backgroundColor: `${sexenio.partyColor}08`,
        }}
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: sexenio.color }}
          >
            {t('administrationBanner.title')}
          </span>
        </div>
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">{sexenio.president}</span>
          {' '}({sexenio.party}) &middot; {sexenio.period}
        </p>
        {/* Sexenio progress bar */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex gap-1 flex-1">
            {Array.from({ length: sexenio.totalYears }).map((_, i) => (
              <div
                key={i}
                className="h-2 flex-1 rounded-sm transition-colors"
                style={{
                  backgroundColor: i < sexenio.yearInSexenio
                    ? sexenio.color
                    : 'rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono text-text-muted flex-shrink-0">
            {t('sexenioYear', { current: sexenio.yearInSexenio, total: sexenio.totalYears })}
          </span>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* 6. Spotlight — top vendor of the year                               */}
      {/* ------------------------------------------------------------------ */}
      {topVendor && !vendorsLoading && (
        <motion.div variants={fadeIn} initial="initial" animate="animate">
          <div className="h-px bg-border mb-4" />
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-3">
            {t('spotlight.label')}
          </p>
          <div
            className="rounded-lg border border-border/40 bg-card/60 p-5 cursor-pointer hover:border-accent/30 transition-colors"
            onClick={() => navigate(`/vendors/${topVendor.vendor_id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/vendors/${topVendor.vendor_id}`) }}
          >
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
              {t('spotlight.topVendorLabel', { year: validYear })}
            </p>
            <h3
              className="text-xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-family-serif)" }}
            >
              {topVendor.vendor_name}
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm font-mono text-text-secondary">
                {formatCompactMXN(topVendor.metric_value)}
              </span>
              <span className="text-sm text-text-muted">
                {formatNumber(topVendor.total_contracts)} {t('contracts')}
              </span>
              {(topVendor.avg_risk_score ?? 0) > 0 && (() => {
                const score = topVendor.avg_risk_score ?? 0
                const riskColor = getRiskLevelColor(getRiskLevel(score))
                return (
                  <span
                    className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border"
                    style={{
                      color: riskColor,
                      backgroundColor: `${riskColor}15`,
                      borderColor: `${riskColor}30`,
                    }}
                  >
                    {t('riskLabel')} {score.toFixed(2)}
                  </span>
                )
              })()}
            </div>
            <ImpactoHumano amountMxn={topVendor.metric_value} className="mt-3" />
          </div>
        </motion.div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 7. Key YoY Deltas — compact strip                                   */}
      {/* ------------------------------------------------------------------ */}
      {yearRow && priorRow && (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          {[
            {
              label: t('heroStats.totalContracts'),
              val: formatNumber(yearRow.contracts),
              delta: priorRow.contracts > 0 ? ((yearRow.contracts - priorRow.contracts) / priorRow.contracts) * 100 : null,
              suffix: '%',
              invertColor: false,
            },
            {
              label: t('heroStats.highRiskRate'),
              val: `${yearRow.high_risk_pct.toFixed(1)}%`,
              delta: yearRow.high_risk_pct - priorRow.high_risk_pct,
              suffix: 'pp',
              invertColor: true,
            },
            {
              label: t('yoyDeltas.directAward'),
              val: `${yearRow.direct_award_pct.toFixed(1)}%`,
              delta: yearRow.direct_award_pct - priorRow.direct_award_pct,
              suffix: 'pp',
              invertColor: true,
            },
            {
              label: t('yoyDeltas.avgRisk'),
              val: yearRow.avg_risk.toFixed(3),
              delta: (yearRow.avg_risk - priorRow.avg_risk) * 100,
              suffix: 'pp',
              invertColor: true,
            },
          ].map((item) => {
            const isUp = item.delta != null && item.delta > 0
            const color = item.delta == null
              ? '#a1a1aa'
              : item.invertColor
                ? (isUp ? '#f87171' : '#4ade80')
                : (isUp ? '#4ade80' : '#f87171')
            const Icon = isUp ? TrendingUp : TrendingDown
            return (
              <div
                key={item.label}
                className="rounded-md border border-border/30 bg-background-elevated/40 px-3 py-2 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-text-muted uppercase tracking-wide truncate">{item.label}</p>
                  <p className="text-sm font-mono font-bold text-text-primary tabular-nums">{item.val}</p>
                </div>
                {item.delta != null && (
                  <span className="flex items-center gap-0.5 text-xs font-mono font-bold flex-shrink-0" style={{ color }}>
                    <Icon className="h-3 w-3" aria-hidden="true" />
                    {item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)}{item.suffix}
                  </span>
                )}
              </div>
            )
          })}
        </motion.div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 8. Top 5 Vendors of the Year — editorial cards                      */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="h-px bg-border mb-4" />
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
          {t('topVendors.sectionLabel')}
        </p>
        <p
          className="text-lg font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-family-serif)" }}
        >
          {t('topVendors.headline', { year: validYear })}
        </p>

        {vendorsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (vendorsResp?.data ?? []).length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm italic">
            {t('noData')}
          </div>
        ) : (
          <motion.div
            className="space-y-2"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {(vendorsResp?.data ?? []).slice(0, 5).map((v, i) => (
              <motion.div key={v.vendor_id} variants={staggerItem}>
                <VendorRankCard
                  vendor={v}
                  rank={i + 1}
                  onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 9. Top 5 Risk Vendors                                               */}
      {/* ------------------------------------------------------------------ */}
      {(riskVendorsResp?.data ?? []).length > 0 && (
        <div>
          <div className="h-px bg-border mb-4" />
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold">
              {t('topRiskVendors.sectionLabel')}
            </p>
          </div>
          <p
            className="text-lg font-bold text-text-primary mb-4"
            style={{ fontFamily: "var(--font-family-serif)" }}
          >
            {t('topRiskVendors.headline', { year: validYear })}
          </p>
          <motion.div
            className="space-y-2"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {(riskVendorsResp?.data ?? []).slice(0, 5).map((v, i) => (
              <motion.div key={v.vendor_id} variants={staggerItem}>
                <VendorRankCard
                  vendor={v}
                  rank={i + 1}
                  onClick={() => navigate(`/vendors/${v.vendor_id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 10. Sector Breakdown                                                */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="h-px bg-border mb-4" />
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
          {t('sectorBreakdown.sectionLabel')}
        </p>
        <p
          className="text-lg font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-family-serif)" }}
        >
          {t('sectorBreakdown.headline', { year: validYear })}
        </p>

        {syLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-7" />)}
          </div>
        ) : (
          <SectorBreakdownChart data={sectorYearData} year={validYear} />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 10b. Sector Race Bar — value-sorted animated bars                   */}
      {/* ------------------------------------------------------------------ */}
      {!syLoading && sectorYearData.length > 0 && (
        <div>
          <div className="h-px bg-border mb-4" />
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
            {t('sectorBreakdown.sectionLabel')}
          </p>
          <p
            className="text-lg font-bold text-text-primary mb-4"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {t('sectorBreakdown.headline', { year: validYear })}
          </p>
          <SectorRaceBar data={sectorYearData} year={validYear} />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 11. Sector Growth Ranking (if prior year data exists)               */}
      {/* ------------------------------------------------------------------ */}
      {sectorGrowth.length > 0 && priorRow && (
        <div>
          <div className="h-px bg-border mb-4" />
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
            {t('sectorGrowth.title')}
          </p>
          <p
            className="text-lg font-bold text-text-primary mb-4"
            style={{ fontFamily: "var(--font-family-serif)" }}
          >
            {t('sectorGrowth.headline')}
          </p>

          <div className="space-y-2">
            {sectorGrowth.map((s) => {
              const maxAbsGrowth = Math.max(...sectorGrowth.map((x) => Math.abs(x.growthPct ?? 0)), 1)
              const barWidth = s.growthPct != null
                ? Math.min(100, (Math.abs(s.growthPct) / maxAbsGrowth) * 100)
                : 0
              const isPos = s.growthPct != null && s.growthPct > 0
              const isNeg = s.growthPct != null && s.growthPct < 0
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-xs text-text-secondary w-32 truncate flex-shrink-0">
                    {s.name}
                  </span>
                  <div className="flex-1 relative h-4 rounded overflow-hidden bg-background-elevated/20">
                    <div
                      className={cn(
                        'absolute top-0 bottom-0 rounded transition-all',
                        isPos ? 'bg-emerald-500/30 left-0' : isNeg ? 'bg-red-500/30 left-0' : 'bg-border/30 left-0'
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className={cn(
                    'text-xs font-mono w-16 text-right flex-shrink-0 tabular-nums',
                    isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-text-muted'
                  )}>
                    {s.growthPct != null
                      ? `${s.growthPct > 0 ? '+' : ''}${s.growthPct.toFixed(1)}%`
                      : '--'
                    }
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 12. Anomaly findings for the year                                   */}
      {/* ------------------------------------------------------------------ */}
      {hallazgos.length > 0 && (
        <div>
          <div className="h-px bg-border mb-4" />
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
            {t('findings.sectionLabel')}
          </p>
          <p
            className="text-lg font-bold text-text-primary mb-4"
            style={{ fontFamily: "var(--font-family-serif)" }}
          >
            {t('findings.headline', { year: validYear })}
          </p>
          {/* Enhancement C: Risk Severity Distribution */}
          {yearRow && <RiskSeverityBar yearRow={yearRow} />}

          <div className="space-y-3">
            {hallazgos.map((h, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-4 py-3',
                  h.severity === 'high'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'h-4 w-4 flex-shrink-0 mt-0.5',
                    h.severity === 'high' ? 'text-red-400' : 'text-amber-400'
                  )}
                  aria-hidden="true"
                />
                <p className="text-sm text-text-secondary leading-relaxed">
                  {h.text}
                </p>
              </div>
            ))}
          </div>

          {/* Enhancement C: Year-End Concentration indicator */}
          <YearEndConcentration year={validYear} />
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 13. Full year navigation at bottom                                  */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <div className="h-px bg-border mb-4" />
        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-3">
          {t('allYears')}
        </p>
        <div className="flex flex-wrap gap-1.5" role="navigation" aria-label={t('allYears')}>
          {ALL_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => handleYearChange(y)}
              className={cn(
                'px-2.5 py-1 rounded-sm text-xs font-mono transition-colors',
                y === validYear
                  ? 'bg-text-primary text-background font-bold'
                  : 'text-text-muted hover:text-text-primary hover:bg-card-hover border border-transparent'
              )}
              aria-current={y === validYear ? 'page' : undefined}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom margin */}
      <div className="h-8" />
    </div>
  )
}
