/**
 * Year in Review — Deep annual intelligence report
 *
 * A proper procurement annual report: all 12 sectors, full vendor rankings,
 * risk evolution vs historical, monthly spend with December callout,
 * procedure type context, and notable risk contracts. Editorial first,
 * data dense, fully explorable across 2002-2025.
 */

import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  EditorialAreaChart,
  type ChartAnnotation,
} from '@/components/charts/editorial'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/animations'
import { Skeleton } from '@/components/ui/skeleton'
import { DotBar } from '@/components/ui/DotBar'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { ImpactoHumano } from '@/components/ui/ImpactoHumano'
import { cn, formatCompactMXN, formatNumber } from '@/lib/utils'
import { SECTORS, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { analysisApi, vendorApi, contractApi } from '@/api/client'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import type {
  YearOverYearChange,
  SectorYearItem,
  VendorTopItem,
  MonthlyBreakdownResponse,
  ContractListItem,
} from '@/api/types'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'

// =============================================================================
// Constants
// =============================================================================

const FEATURED_YEARS = [2024, 2023, 2022, 2021, 2020] as const
const ALL_YEARS = Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2025 - i)
const DEFAULT_YEAR = new Date().getFullYear() - 1

const OECD_HIGH_RISK_THRESHOLD = 15 // % — upper bound
const OECD_DIRECT_AWARD_LIMIT = 25 // % — recommended max

interface SexenioInfo {
  president: string
  party: string
  period: string
  color: string
  partyColor: string
  yearInSexenio: number
  totalYears: number
}

// Political palette — intentionally distinct from SECTOR_COLORS (12-sector canonical palette).
// Uses design tokens so the 6 sexenios read as editorial accents, not sector codes.
// Order: muted → data → accent → risk-high → risk-critical → secondary (for visual cadence).
const SEXENIO_PALETTE = [
  'var(--color-text-muted)',        // Zedillo   — noise floor
  'var(--color-accent-data)',       // Fox       — blue
  'var(--color-text-secondary)',    // Calderon  — neutral secondary
  'var(--color-risk-high)',         // Peña Nieto — amber signal
  'var(--color-risk-critical)',     // AMLO      — red signal
  'var(--color-accent)',            // Sheinbaum — amber gold (current)
] as const

function getSexenioInfo(year: number): SexenioInfo {
  if (year <= 2000) return { president: 'Ernesto Zedillo', party: 'PRI', period: '1994-2000', color: SEXENIO_PALETTE[0], partyColor: '#008000', yearInSexenio: year - 1994 + 1, totalYears: 6 }
  if (year <= 2006) return { president: 'Vicente Fox', party: 'PAN', period: '2000-2006', color: SEXENIO_PALETTE[1], partyColor: '#002395', yearInSexenio: year - 2000 + 1, totalYears: 6 }
  if (year <= 2012) return { president: 'Felipe Calderon', party: 'PAN', period: '2006-2012', color: SEXENIO_PALETTE[2], partyColor: '#002395', yearInSexenio: year - 2006 + 1, totalYears: 6 }
  if (year <= 2018) return { president: 'Enrique Pena Nieto', party: 'PRI', period: '2012-2018', color: SEXENIO_PALETTE[3], partyColor: '#008000', yearInSexenio: year - 2012 + 1, totalYears: 6 }
  if (year <= 2024) return { president: 'Andres Manuel Lopez Obrador', party: 'MORENA', period: '2018-2024', color: SEXENIO_PALETTE[4], partyColor: '#8B0000', yearInSexenio: year - 2018 + 1, totalYears: 6 }
  return { president: 'Claudia Sheinbaum', party: 'MORENA', period: '2024-2030', color: SEXENIO_PALETTE[5], partyColor: '#8B0000', yearInSexenio: year - 2024 + 1, totalYears: 6 }
}

function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'critical': return RISK_COLORS.critical
    case 'high': return RISK_COLORS.high
    case 'medium': return RISK_COLORS.medium
    default: return RISK_COLORS.low
  }
}

// Use canonical getRiskLevelFromScore from @/lib/constants (imported above).
// Local alias kept for readability in this file.
const getRiskLevel = getRiskLevelFromScore

// =============================================================================
// Hero banner
// =============================================================================


// =============================================================================
// Section: Full Sector Distribution (ALL 12 sectors)
// =============================================================================

interface SectorRow {
  id: number
  code: string
  name: string
  color: string
  value: number
  contracts: number
  pct: number
  avgRisk: number
}

function SectorDistributionFull({
  data,
  year,
  onSectorClick,
}: {
  data: SectorYearItem[]
  year: number
  onSectorClick: (sectorCode: string) => void
}) {
  const { t } = useTranslation('yearinreview')

  const rows: SectorRow[] = useMemo(() => {
    const yearRows = data.filter((r) => r.year === year)
    if (!yearRows.length) return []
    const total = yearRows.reduce((s, r) => s + r.total_value, 0)
    return SECTORS
      .map((sector) => {
        const row = yearRows.find((r) => r.sector_id === sector.id)
        const val = row?.total_value ?? 0
        return {
          id: sector.id,
          code: sector.code,
          name: sector.nameEN,
          color: sector.color,
          value: val,
          contracts: row?.contracts ?? 0,
          pct: total > 0 ? (val / total) * 100 : 0,
          avgRisk: row?.avg_risk ?? 0,
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [data, year])

  if (!rows.length) {
    return <p className="py-8 text-sm text-text-muted italic text-center">{t('noData')}</p>
  }

  const maxVal = rows[0].value

  return (
    <div>
      <div className="space-y-1.5">
        {rows.map((s) => {
          const barPct = maxVal > 0 ? (s.value / maxVal) * 100 : 0
          const hasData = s.value > 0
          return (
            <button
              key={s.id}
              onClick={() => hasData && onSectorClick(s.code)}
              disabled={!hasData}
              className={cn(
                'w-full group flex items-center gap-3 py-1.5 px-1 rounded transition-colors text-left',
                hasData ? 'hover:bg-card-hover/40 cursor-pointer' : 'opacity-40 cursor-not-allowed',
              )}
              aria-label={`${s.name}: ${formatCompactMXN(s.value)}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-text-secondary w-32 truncate flex-shrink-0 group-hover:text-text-primary transition-colors">
                {s.name}
              </span>
              <div className="flex-1 flex items-center gap-2">
                {/* Was: 40 motion.circle nodes per row × 12 rows = 480 animated SVG
                    elements with hardcoded near-black dark-mode dots. Replaced
                    by canonical <DotBar/>: same 4-bar visual story, 22 dots, no
                    per-dot animation, cream-mode tokens. */}
                <DotBar
                  value={barPct}
                  max={100}
                  color={s.color}
                  className="flex-1 h-5"
                />
                <span className="text-[10px] font-mono text-text-primary/90 font-semibold w-16 text-right tabular-nums flex-shrink-0">
                  {formatCompactMXN(s.value)}
                </span>
              </div>
              <span className="text-[10px] font-mono text-text-muted w-16 text-right flex-shrink-0 tabular-nums">
                {formatNumber(s.contracts)}
              </span>
              <span className="text-xs font-mono text-text-muted w-12 text-right flex-shrink-0 tabular-nums">
                {s.pct.toFixed(1)}%
              </span>
              {hasData && (
                <ChevronRight className="h-3 w-3 text-text-muted/40 flex-shrink-0 group-hover:text-text-primary transition-colors" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[10px] text-text-muted italic">
        {t('sectorAll.footerHint')}
      </p>
    </div>
  )
}

// =============================================================================
// Section: Diverging Sector Growth Chart
// =============================================================================

interface SectorGrowthRow {
  id: number
  name: string
  code: string
  color: string
  curVal: number
  prevVal: number
  growthPct: number | null
}

function SectorGrowthDiverging({ rows }: { rows: SectorGrowthRow[] }) {
  const withData = rows.filter((r) => r.growthPct != null) as (SectorGrowthRow & { growthPct: number })[]
  if (!withData.length) return null

  const sorted = [...withData].sort((a, b) => b.growthPct - a.growthPct)
  const maxAbs = Math.max(...sorted.map((r) => Math.abs(r.growthPct)), 50)

  const ROW_H = 22
  const LABEL_W = 88
  const DOTS_PER_SIDE = 22
  const DOT_R = 2.5
  const DOT_GAP = 6.5
  const BAR_AREA = DOTS_PER_SIDE * DOT_GAP + 4
  const PCT_W = 44
  const svgW = LABEL_W + BAR_AREA * 2 + PCT_W
  const svgH = sorted.length * ROW_H + 20
  const centerX = LABEL_W + BAR_AREA

  return (
    <div className="pt-1">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        role="img"
        aria-label="Sector year-over-year growth diverging dot chart"
      >
        {/* Header */}
        <text x={LABEL_W + BAR_AREA * 0.5} y={9} fill="#f87171" fontSize={10} textAnchor="middle" fontFamily="monospace">← decline</text>
        <text x={LABEL_W + BAR_AREA * 1.5} y={9} fill="#4ade80" fontSize={10} textAnchor="middle" fontFamily="monospace">growth →</text>

        {/* Zero axis */}
        <line x1={centerX} y1={12} x2={centerX} y2={svgH - 4} stroke="var(--color-border)" strokeWidth={0.75} />

        {sorted.map((row, ri) => {
          const cy = 14 + ri * ROW_H
          const clamped = Math.max(-300, Math.min(300, row.growthPct))
          const filledDots = Math.min(
            DOTS_PER_SIDE,
            Math.max(1, Math.round((Math.abs(clamped) / Math.max(maxAbs, 1)) * DOTS_PER_SIDE)),
          )
          const isPos = row.growthPct >= 0
          const color = isPos ? '#4ade80' : '#f87171'
          const emptyDot = 'var(--color-background-elevated)'
          const rowCenterY = cy + ROW_H / 2

          return (
            <g key={row.id}>
              {/* Sector label */}
              <text
                x={LABEL_W - 6}
                y={rowCenterY + 1}
                fill="var(--color-text-muted)"
                fontSize={10}
                textAnchor="end"
                dominantBaseline="middle"
                fontFamily="monospace"
              >
                {row.name.slice(0, 11)}
              </text>

              {/* LEFT side dots (decline) */}
              {Array.from({ length: DOTS_PER_SIDE }).map((_, i) => {
                // i=0 is closest to center, moving outward
                const cx = centerX - 2 - (i * DOT_GAP + DOT_R)
                const isFilled = !isPos && i < filledDots
                return (
                  <circle
                    key={`l-${i}`}
                    cx={cx}
                    cy={rowCenterY}
                    r={DOT_R}
                    fill={isFilled ? color : emptyDot}
                    stroke={isFilled ? undefined : 'var(--color-border-hover)'}
                    strokeWidth={isFilled ? 0 : 0.5}
                    fillOpacity={isFilled ? 0.85 : 1}
                  />
                )
              })}

              {/* RIGHT side dots (growth) */}
              {Array.from({ length: DOTS_PER_SIDE }).map((_, i) => {
                const cx = centerX + 2 + (i * DOT_GAP + DOT_R)
                const isFilled = isPos && i < filledDots
                return (
                  <circle
                    key={`r-${i}`}
                    cx={cx}
                    cy={rowCenterY}
                    r={DOT_R}
                    fill={isFilled ? color : emptyDot}
                    stroke={isFilled ? undefined : 'var(--color-border-hover)'}
                    strokeWidth={isFilled ? 0 : 0.5}
                    fillOpacity={isFilled ? 0.85 : 1}
                  />
                )
              })}

              {/* Sector color tick (tiny accent) */}
              <circle
                cx={isPos
                  ? centerX + 2 + filledDots * DOT_GAP + DOT_R + 4
                  : centerX - 2 - filledDots * DOT_GAP - DOT_R - 4}
                cy={rowCenterY}
                r={2}
                fill={row.color}
                fillOpacity={0.6}
              />

              {/* Pct label */}
              <text
                x={svgW - 2}
                y={rowCenterY + 1}
                fill={color}
                fontSize={10}
                textAnchor="end"
                dominantBaseline="middle"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {row.growthPct > 0 ? '+' : ''}{row.growthPct.toFixed(0)}%
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-2 text-[9px] font-mono text-text-muted/70">
        1 ● = {(maxAbs / DOTS_PER_SIDE).toFixed(0)}% growth
      </p>
    </div>
  )
}

// =============================================================================
// Section: Risk Evolution vs Historical
// =============================================================================

function RiskEvolution({
  yearRow,
  allYears,
  validYear,
}: {
  yearRow: YearOverYearChange
  allYears: YearOverYearChange[]
  validYear: number
}) {
  const { t } = useTranslation('yearinreview')

  const historicalAvg = useMemo(() => {
    if (!allYears.length) return 0
    const sum = allYears.reduce((acc, r) => acc + (r.high_risk_pct ?? 0), 0)
    return sum / allYears.length
  }, [allYears])

  const delta = (yearRow.high_risk_pct ?? 0) - historicalAvg
  const verdictKey = Math.abs(delta) < 0.5
    ? 'riskEvolution.verdictEqual'
    : delta > 0
      ? 'riskEvolution.verdictWorse'
      : 'riskEvolution.verdictBetter'
  const verdictText = t(verdictKey, { pct: Math.abs(delta).toFixed(1) })
  const isAboveOECD = (yearRow.high_risk_pct ?? 0) > OECD_HIGH_RISK_THRESHOLD

  // Horizontal "tape" chart showing this year vs avg vs OECD
  const maxDisplay = Math.max(yearRow.high_risk_pct ?? 0, historicalAvg, OECD_HIGH_RISK_THRESHOLD, 10) * 1.2
  const yearPct = ((yearRow.high_risk_pct ?? 0) / maxDisplay) * 100
  const avgPct = (historicalAvg / maxDisplay) * 100
  const oecdPct = (OECD_HIGH_RISK_THRESHOLD / maxDisplay) * 100

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <HallazgoStat
          value={`${yearRow.high_risk_pct.toFixed(1)}%`}
          label={`${t('riskEvolution.thisYear')} · ${validYear}`}
          color={isAboveOECD ? 'border-red-500' : 'border-amber-500'}
        />
        <HallazgoStat
          value={`${historicalAvg.toFixed(1)}%`}
          label={t('riskEvolution.historicalAvg')}
          color="border-border"
        />
        <HallazgoStat
          value={`${OECD_HIGH_RISK_THRESHOLD}%`}
          label={t('riskEvolution.oecdTarget')}
          color="border-cyan-500"
        />
      </div>

      {/* Visual tape: three stacked dot-matrix strips */}
      <div className="rounded-sm border border-border/30 bg-background-elevated/30 p-5 space-y-4">
        {(() => {
          const N = 50, DR = 3, DG = 8
          const oecdIdx = Math.round((oecdPct / 100) * N)
          const renderStrip = (pct: number, color: string) => {
            const filled = Math.max(0, Math.min(N, Math.round((pct / 100) * N)))
            return (
              <svg
                viewBox={`0 0 ${N * DG} 10`}
                width={N * DG}
                height={10}
                aria-hidden="true"
              >
                {Array.from({ length: N }).map((_, i) => (
                  <circle
                    key={i}
                    cx={i * DG + DR}
                    cy={5}
                    r={DR}
                    fill={i < filled ? color : 'var(--color-background-elevated)'}
                    stroke={i < filled ? undefined : 'var(--color-border-hover)'}
                    strokeWidth={i < filled ? 0 : 0.5}
                    fillOpacity={i < filled ? 0.85 : 1}
                  />
                ))}
                {/* OECD marker line */}
                <line
                  x1={oecdIdx * DG + DR}
                  y1={0}
                  x2={oecdIdx * DG + DR}
                  y2={10}
                  stroke="#22d3ee"
                  strokeWidth={1}
                  strokeOpacity={0.8}
                />
              </svg>
            )
          }
          return (
            <>
              {/* This year */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted w-28 flex-shrink-0">
                  {t('riskEvolution.thisYear')}
                </span>
                <div className="flex-1">{renderStrip(yearPct, isAboveOECD ? '#dc2626' : '#f59e0b')}</div>
                <span className="font-mono text-xs font-bold text-text-primary w-14 text-right flex-shrink-0 tabular-nums">
                  {yearRow.high_risk_pct.toFixed(1)}%
                </span>
              </div>

              {/* Historical avg */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted w-28 flex-shrink-0">
                  {t('riskEvolution.historicalAvg')}
                </span>
                <div className="flex-1">{renderStrip(avgPct, 'var(--color-text-muted)')}</div>
                <span className="font-mono text-xs text-text-muted w-14 text-right flex-shrink-0 tabular-nums">
                  {historicalAvg.toFixed(1)}%
                </span>
              </div>

              {/* OECD threshold */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--color-oecd)] w-28 flex-shrink-0">
                  {t('riskEvolution.oecdTarget')}
                </span>
                <div className="flex-1">{renderStrip(oecdPct, '#22d3ee')}</div>
                <span className="font-mono text-xs text-[color:var(--color-oecd)] w-14 text-right flex-shrink-0 tabular-nums">
                  {OECD_HIGH_RISK_THRESHOLD}%
                </span>
              </div>
              <p className="text-[9px] font-mono text-text-muted/70 pt-1 border-t border-border/20">
                1 ● = 2% · cyan line = OECD target ({OECD_HIGH_RISK_THRESHOLD}%)
              </p>
            </>
          )
        })()}
      </div>

      {/* Verdict */}
      <div
        className={cn(
          'mt-4 rounded-sm border px-4 py-3 flex items-start gap-3',
          isAboveOECD ? 'border-red-500/30 bg-red-500/5' : 'border-border-hover bg-background-elevated',
        )}
      >
        <div
          className={cn(
            'h-2 w-2 rounded-full flex-shrink-0 mt-1.5',
            isAboveOECD ? 'bg-red-500 animate-pulse' : 'bg-text-muted',
          )}
        />
        <div>
          <p
            className={cn(
              'text-[10px] font-mono font-bold uppercase tracking-[0.15em] mb-0.5',
              isAboveOECD ? 'text-risk-critical' : 'text-text-muted',
            )}
          >
            {isAboveOECD ? t('riskEvolution.aboveOECD') : t('riskEvolution.belowOECD')}
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">{verdictText}</p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Section: Procedure Type Breakdown
// =============================================================================

function ProcedureTypeSection({
  yearRow,
  allYears,
  validYear,
}: {
  yearRow: YearOverYearChange
  allYears: YearOverYearChange[]
  validYear: number
}) {
  const { t } = useTranslation('yearinreview')

  const historicalAvg = useMemo(() => {
    if (!allYears.length) return 0
    const sum = allYears.reduce((acc, r) => acc + (r.direct_award_pct ?? 0), 0)
    return sum / allYears.length
  }, [allYears])

  const directPct = yearRow.direct_award_pct ?? 0
  const competitivePct = 100 - directPct
  const isAboveOECD = directPct > OECD_DIRECT_AWARD_LIMIT
  const isAboveAvg = directPct > historicalAvg

  return (
    <div>
      <p className="text-sm text-text-secondary mb-4 leading-relaxed">
        {t('procedureType.subtitle', {
          year: validYear,
          directPct: directPct.toFixed(1),
        })}
      </p>

      {/* Dot-matrix: direct vs competitive */}
      <div className="rounded-sm border border-border/30 bg-background-elevated/30 p-5">
        {(() => {
          const N_DOTS = 50
          const DOT_R = 3
          const DOT_GAP = 8
          const directDots = Math.round((directPct / 100) * N_DOTS)
          const svgW = N_DOTS * DOT_GAP + DOT_R * 2
          const directColor = isAboveOECD ? '#dc2626' : '#ea580c'
          const competitiveColor = '#059669'
          return (
            <>
              <div className="flex items-center justify-between mb-2 text-[10px] font-mono uppercase tracking-[0.15em]">
                <span className="font-bold" style={{ color: directColor }}>
                  {directPct.toFixed(1)}% {t('procedureType.direct')}
                </span>
                <span className="font-bold" style={{ color: competitiveColor }}>
                  {competitivePct.toFixed(1)}% {t('procedureType.competitive')}
                </span>
              </div>
              <svg
                viewBox={`0 0 ${svgW} 12`}
                className="w-full h-5 mb-2"
                role="img"
                aria-label={`Direct award ${directPct.toFixed(1)}% vs competitive ${competitivePct.toFixed(1)}%`}
              >
                {Array.from({ length: N_DOTS }).map((_, i) => (
                  <motion.circle
                    key={i}
                    cx={i * DOT_GAP + DOT_R}
                    cy={6}
                    r={DOT_R}
                    fill={i < directDots ? directColor : competitiveColor}
                    fillOpacity={0.85}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, delay: i * 0.008 }}
                  />
                ))}
              </svg>
              <p className="text-[10px] font-mono text-text-muted mb-2">
                {t('procedureType.direct')} / {t('procedureType.competitive')} · 1 punto = 2%
              </p>
            </>
          )
        })()}

        {/* OECD & historical reference markers */}
        <div className="relative h-4 mb-1">
          {/* Historical avg marker */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: `${historicalAvg}%`, transform: 'translateX(-50%)' }}
          >
            <div className="h-2 w-px bg-background-elevated" />
            <span className="text-[9px] font-mono text-text-muted whitespace-nowrap">
              {historicalAvg.toFixed(0)}% avg
            </span>
          </div>
          {/* OECD limit marker */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center"
            style={{ left: `${OECD_DIRECT_AWARD_LIMIT}%`, transform: 'translateX(-50%)' }}
          >
            <div className="h-2 w-px bg-cyan-400" />
            <span className="text-[9px] font-mono text-[color:var(--color-oecd)] whitespace-nowrap">
              {t('procedureType.oecdLimit')}
            </span>
          </div>
        </div>

        <p className="text-xs text-text-muted mt-8">
          {t('procedureType.historicalContext', { avg: historicalAvg.toFixed(1) })}
        </p>

        {isAboveOECD && (
          <div className="mt-3 flex items-start gap-2 rounded border border-red-500/30 bg-red-500/5 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-risk-critical flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[11px] text-risk-critical/90 leading-relaxed">
              {t('findings.highDirectAward', { pct: directPct.toFixed(1) })}
              {isAboveAvg && ` · ${(directPct - historicalAvg).toFixed(1)} pp vs avg`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Section: Full Vendor Ranking (top 20, expandable)
// =============================================================================

function TopVendorsTable({
  vendors,
  onVendorClick,
}: {
  vendors: VendorTopItem[]
  onVendorClick: (id: number) => void
}) {
  const { t } = useTranslation('yearinreview')
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? vendors : vendors.slice(0, 5)

  if (!vendors.length) {
    return <p className="py-8 text-sm text-text-muted italic text-center">{t('noData')}</p>
  }

  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-[40px_1fr_120px_90px_70px] gap-3 px-3 py-2 border-b border-border/30 mb-1">
        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted font-bold">
          {t('topVendorsFull.rankColumn')}
        </span>
        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted font-bold">
          {t('topVendorsFull.vendorColumn')}
        </span>
        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted font-bold text-right">
          {t('topVendorsFull.valueColumn')}
        </span>
        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted font-bold text-right">
          {t('topVendorsFull.contractsColumn')}
        </span>
        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-text-muted font-bold text-right">
          {t('topVendorsFull.riskColumn')}
        </span>
      </div>

      <motion.div className="divide-y divide-border/20" variants={staggerContainer} initial="initial" animate="animate">
        {shown.map((v, i) => {
          const rank = i + 1
          const score = v.avg_risk_score ?? 0
          const level = getRiskLevel(score)
          const riskColor = getRiskLevelColor(level)
          return (
            <motion.div
              key={v.vendor_id}
              variants={staggerItem}
              onClick={() => onVendorClick(v.vendor_id)}
              className={cn(
                'w-full grid grid-cols-[40px_1fr_120px_90px_70px] gap-3 items-center px-3 py-3 text-left transition-colors rounded cursor-pointer',
                'hover:bg-card-hover/40',
                rank === 1 && 'bg-red-500/5',
              )}
            >
              <span
                className={cn(
                  'font-mono text-sm font-bold tabular-nums',
                  rank === 1 ? 'text-risk-critical' :
                  rank <= 3 ? 'text-risk-high' :
                  rank <= 10 ? 'text-text-primary' : 'text-text-muted',
                )}
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {rank}
              </span>
              <EntityIdentityChip
                type="vendor"
                id={v.vendor_id}
                name={v.vendor_name}
                riskScore={v.avg_risk_score}
                size="xs"
                hideIcon
              />
              <span className="text-sm font-mono text-text-secondary text-right tabular-nums">
                {formatCompactMXN(v.metric_value)}
              </span>
              <span className="text-xs font-mono text-text-muted text-right tabular-nums">
                {formatNumber(v.total_contracts)}
              </span>
              <span className="text-right">
                {score > 0 ? (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border tabular-nums"
                    style={{
                      color: riskColor,
                      backgroundColor: `${riskColor}15`,
                      borderColor: `${riskColor}30`,
                    }}
                  >
                    {score.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-text-muted/50">—</span>
                )}
              </span>
            </motion.div>
          )
        })}
      </motion.div>

      {vendors.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.15em] text-risk-high hover:text-accent transition-colors"
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
            aria-hidden="true"
          />
          {expanded
            ? t('topVendorsFull.showLess')
            : t('topVendorsFull.showAll', { count: vendors.length })}
        </button>
      )}
    </div>
  )
}

// =============================================================================
// Section: Notable Risk Contracts
// =============================================================================

function NotableRiskContracts({
  contracts,
  onContractClick,
}: {
  contracts: ContractListItem[]
  onContractClick: (id: number) => void
}) {
  const { t } = useTranslation('yearinreview')

  if (!contracts.length) {
    return (
      <p className="py-8 text-sm text-text-muted italic text-center">
        {t('notableRisks.noRiskContracts')}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {contracts.map((c, i) => {
        const score = c.risk_score ?? 0
        const level = getRiskLevel(score)
        const color = getRiskLevelColor(level)
        return (
          <motion.button
            key={c.id ?? i}
            onClick={() => c.id && onContractClick(c.id)}
            className="w-full text-left rounded-r-lg bg-card/40 hover:bg-card-hover/40 transition-all p-4"
            style={{ borderLeft: `3px solid ${color}` }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center justify-center w-10 flex-shrink-0 gap-0.5">
                <span
                  className="text-[10px] font-mono font-black tabular-nums"
                  style={{ color: color }}
                >
                  #{i + 1}
                </span>
                <span
                  className="text-[9px] font-mono tabular-nums px-1 py-px rounded"
                  style={{
                    backgroundColor: `${color}18`,
                    color: color,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {score.toFixed(2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary font-medium line-clamp-2 leading-snug mb-1">
                  {c.title ?? `Contrato ${c.id}`}
                </p>
                <div className="flex items-center gap-3 flex-wrap text-[11px] font-mono text-text-muted">
                  {c.vendor_name && (
                    <span className="truncate max-w-[240px] inline-flex items-center gap-1">
                      <span className="text-text-muted/60">{t('notableRisks.vendor')}:</span>{' '}
                      {c.vendor_id ? (
                        <EntityIdentityChip
                          type="vendor"
                          id={c.vendor_id}
                          name={c.vendor_name}
                          riskScore={c.risk_score}
                          size="xs"
                          hideIcon
                        />
                      ) : (
                        <span className="text-text-secondary">{c.vendor_name}</span>
                      )}
                    </span>
                  )}
                  {c.institution_name && (
                    <span className="truncate max-w-[240px]">
                      <span className="text-text-muted/60">{t('notableRisks.institution')}:</span>{' '}
                      <span className="text-text-secondary">{c.institution_name}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-mono font-bold text-text-primary tabular-nums">
                  {formatCompactMXN(c.amount_mxn ?? 0)}
                </p>
                <ExternalLink className="h-3 w-3 text-text-muted/50 ml-auto mt-1" aria-hidden="true" />
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

// =============================================================================
// Section: Monthly Spending
// =============================================================================

function MonthlySpending({
  data,
  year,
}: {
  data: MonthlyBreakdownResponse | undefined
  year: number
}) {
  const { t } = useTranslation('yearinreview')

  if (!data || !data.months?.length) {
    return <p className="py-8 text-sm text-text-muted italic text-center">{t('noData')}</p>
  }

  // Compute monthly average for % vs avg context
  const monthlyAvg = data.months.length > 0
    ? data.months.reduce((sum, m) => sum + m.value, 0) / data.months.length
    : 0

  // Spanish month labels (use en for consistency; data already has month_name)
  const chartData = data.months.map((m) => ({
    month: m.month,
    monthName: m.month_name.slice(0, 3),
    monthFull: m.month_name,
    value: m.value,
    contracts: m.contracts,
    isDecember: m.month === 12,
    pctVsAvg: monthlyAvg > 0 ? ((m.value - monthlyAvg) / monthlyAvg) * 100 : null,
  }))

  // December concentration
  const decMonth = data.months.find((m) => m.month === 12)
  const decPct = data.total_value > 0 && decMonth
    ? (decMonth.value / data.total_value) * 100
    : 0
  const decLabel = decPct >= 30 ? t('monthly.abnormal')
    : decPct >= 15 ? t('monthly.elevated')
    : t('monthly.normal')
  const decColor = decPct >= 30 ? '#f87171'
    : decPct >= 15 ? '#fb923c' : 'var(--color-text-muted)'

  const decemberRow = chartData.find((m) => m.isDecember)
  const monthlyAnnotations: ChartAnnotation[] = decemberRow
    ? [{ kind: 'vrule', x: decemberRow.monthName, label: '↑ Dec', tone: 'warn' }]
    : []

  return (
    <div>
      <div className="rounded-sm border border-border/30 bg-background-elevated/20 p-4">
        <EditorialAreaChart
          data={chartData}
          xKey="monthName"
          yKey="value"
          colorToken="risk-critical"
          yFormat="mxn-compact"
          annotations={monthlyAnnotations}
          height={208}
        />
      </div>

      {/* December callout */}
      {decMonth && (
        <div
          className="mt-3 flex items-center gap-3 rounded-sm border px-4 py-3"
          style={{
            borderColor: `${decColor}40`,
            backgroundColor: `${decColor}0D`,
          }}
        >
          <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: decColor }} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.15em] font-bold" style={{ color: decColor }}>
              {t('monthly.decemberSpike')} · {year}
            </p>
            <p className="text-sm text-text-secondary mt-0.5">
              {t('monthly.decemberSpikeNote', {
                pct: decPct.toFixed(1),
                label: decLabel,
              })}
            </p>
          </div>
          <span className="font-mono text-base font-bold tabular-nums flex-shrink-0" style={{ color: decColor }}>
            {decPct.toFixed(1)}%
          </span>
        </div>
      )}
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
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
  })

  const { data: sectorYearResp, isLoading: syLoading } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
  })

  const { data: vendorsResp, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'top', 'value', 20, validYear],
    queryFn: () => vendorApi.getTop('value', 20, { year: validYear }),
    staleTime: 30 * 60 * 1000,
  })

  const { data: monthlyResp, isLoading: monthlyLoading } = useQuery({
    queryKey: ['analysis', 'monthly-breakdown', validYear],
    queryFn: () => analysisApi.getMonthlyBreakdown(validYear),
    staleTime: 30 * 60 * 1000,
  })

  // Notable risk contracts — top 10 by risk score in the year
  const { data: riskContractsResp, isLoading: riskContractsLoading } = useQuery({
    queryKey: ['contracts', 'notable-risk', validYear],
    queryFn: () =>
      contractApi.getAll({
        year: validYear,
        risk_level: 'critical',
        sort_by: 'risk_score',
        sort_order: 'desc',
        per_page: 10,
      }),
    staleTime: 30 * 60 * 1000,
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

  const topSector = useMemo(() => {
    const yearSectors = sectorYearData.filter((r) => r.year === validYear)
    if (!yearSectors.length) return null
    const top = yearSectors.reduce((best, r) => (r.total_value > best.total_value ? r : best), yearSectors[0])
    const sectorInfo = SECTORS.find((s) => s.id === top.sector_id)
    return sectorInfo ? { ...sectorInfo, value: top.total_value, contracts: top.contracts } : null
  }, [sectorYearData, validYear])

  // Sector growth rows (with all 12 sectors, null if no prior data)
  const sectorGrowthRows: SectorGrowthRow[] = useMemo(() => {
    const currentRows = sectorYearData.filter((r) => r.year === validYear)
    const priorRows = sectorYearData.filter((r) => r.year === validYear - 1)
    return SECTORS.map((sector) => {
      const cur = currentRows.find((r) => r.sector_id === sector.id)
      const prev = priorRows.find((r) => r.sector_id === sector.id)
      const curVal = cur?.total_value ?? 0
      const prevVal = prev?.total_value ?? 0
      const growthPct = prevVal > 0 ? ((curVal - prevVal) / prevVal) * 100 : null
      return {
        id: sector.id,
        name: sector.nameEN,
        code: sector.code,
        color: sector.color,
        curVal,
        prevVal,
        growthPct,
      }
    }).filter((r) => r.curVal > 0 || r.prevVal > 0)
  }, [sectorYearData, validYear])

  const sexenio = getSexenioInfo(validYear)
  const isLoading = yoyLoading || syLoading

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

  const topVendor = (vendorsResp?.data ?? [])[0] ?? null

  const handleSectorClick = (code: string) => {
    navigate(`/sectors/${code}`)
  }

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="max-w-[1040px] mx-auto px-4 md:px-6 py-6">
      <header className="mb-5 pb-4 border-b border-border">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              {t('title') || 'Year in Review'} · {validYear}
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1.5">
              MEXICO FEDERAL PROCUREMENT · COMPRANET
            </p>
          </div>
          <div className="flex items-baseline gap-5">
            <div className="text-right">
              <div className="font-mono tabular-nums text-base font-semibold text-text-primary">{yearRow ? formatNumber(yearRow.contracts) : '—'}</div>
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mt-0.5">Contracts</div>
            </div>
            <div className="text-right">
              <div className="font-mono tabular-nums text-base font-semibold text-text-primary">{yearRow ? formatCompactMXN(yearRow.total_value) : '—'}</div>
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mt-0.5">Total spend</div>
            </div>
            <div className="text-right">
              <div className="font-mono tabular-nums text-base font-semibold" style={{ color: 'var(--color-accent)' }}>{yearRow ? `${yearRow.direct_award_pct.toFixed(0)}%` : '—'}</div>
              <div className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mt-0.5">Direct award</div>
            </div>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="h-32 rounded border border-border bg-surface animate-pulse" />
      )}

      <div className="space-y-8">
        {/* ── SECTION I: HERO + YEAR SELECTOR ── */}
        <div className="space-y-8">

          {/* Year selector — comes FIRST so user picks the year before seeing stats */}
          <div className="relative overflow-hidden rounded-sm border border-border/40 bg-gradient-to-br from-background-elevated/80 to-background px-6 py-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="h-3.5 w-3.5 text-text-muted flex-shrink-0" aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted mr-1">
                {t('yearSelector')}:
              </span>
              {FEATURED_YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => handleYearChange(y)}
                  className={cn(
                    'px-3.5 py-1.5 text-sm font-bold transition-all rounded-sm border',
                    y === validYear
                      ? 'bg-risk-high/10 text-risk-high border-amber-500/60 shadow-sm'
                      : 'text-text-muted hover:text-text-primary border-border/40 hover:border-border',
                  )}
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                  aria-current={y === validYear ? 'page' : undefined}
                  aria-label={t('goToYear', { year: y })}
                >
                  {y}
                </button>
              ))}
              <div className="relative flex items-center gap-1">
                <select
                  value={validYear}
                  onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                  className="appearance-none text-xs text-text-muted bg-transparent border border-border/30 rounded-sm py-1.5 pl-3 pr-6 cursor-pointer focus:outline-none focus:border-border hover:border-border transition-colors"
                  aria-label={t('yearSelector')}
                >
                  {ALL_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 h-3 w-3 text-text-muted pointer-events-none" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Lede */}
          {yearRow && (
            <motion.div variants={fadeIn} initial="initial" animate="animate">
              <div className="border-l-[3px] border-text-muted/30 pl-5 py-2">
                <p
                  className="text-base text-text-secondary leading-relaxed"
                  style={{ fontFamily: 'var(--font-family-serif)' }}
                >
                  {ledeText}
                </p>
              </div>
            </motion.div>
          )}

          {/* Big 5 HallazgoStats */}
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
                  color="border-amber-500"
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
                    spendingChangePct == null ? 'border-border'
                      : spendingChangePct > 0 ? 'border-text-muted'
                        : 'border-red-500'
                  }
                />
              </motion.div>
            </motion.div>
          ) : (
            <div className="py-8 text-center text-text-muted text-sm italic">{t('noData')}</div>
          )}

          {/* YoY Deltas strip */}
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
                  ? 'var(--color-text-muted)'
                  : item.invertColor
                    ? (isUp ? '#f87171' : '#4ade80')
                    : (isUp ? '#4ade80' : '#f87171')
                const Icon = isUp ? TrendingUp : TrendingDown
                return (
                  <div
                    key={item.label}
                    className="rounded-sm border border-border/30 bg-background-elevated/40 px-3 py-2 flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-text-muted uppercase tracking-wide truncate">{item.label}</p>
                      <p className="text-sm font-mono font-bold text-text-primary tabular-nums">{item.val}</p>
                    </div>
                    {item.delta != null && (
                      <span
                        className="flex items-center gap-0.5 text-xs font-mono font-bold flex-shrink-0"
                        style={{ color }}
                      >
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {item.delta > 0 ? '+' : ''}
                        {item.delta.toFixed(1)}
                        {item.suffix}
                      </span>
                    )}
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* Sexenio context */}
          <motion.div
            className="rounded-sm border px-5 py-4"
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
            <div className="mt-3 flex items-center gap-2">
              <div className="flex gap-1.5 flex-1 items-center">
                {Array.from({ length: sexenio.totalYears }).map((_, i) => (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: i < sexenio.yearInSexenio ? sexenio.color : 'rgba(255,255,255,0.08)',
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-text-muted flex-shrink-0">
                {t('sexenioYear', { current: sexenio.yearInSexenio, total: sexenio.totalYears })}
              </span>
            </div>
          </motion.div>

        </div>

        <div className="pt-2 border-t border-border" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

            {/* Full sector distribution (ALL 12) */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
                {t('sectorAll.sectionLabel')}
              </p>
              <p
                className="text-base font-bold text-text-primary mb-1"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {t('sectorAll.headline', { year: validYear })}
              </p>
              <p className="text-xs text-text-muted mb-4 max-w-2xl leading-relaxed">
                {t('sectorAll.subtitle')}
              </p>

              {syLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-7" />
                  ))}
                </div>
              ) : (
                <SectorDistributionFull
                  data={sectorYearData}
                  year={validYear}
                  onSectorClick={handleSectorClick}
                />
              )}
            </div>

            {/* Sector growth — diverging chart */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
                {t('sectorGrowthFull.sectionLabel')}
              </p>
              <p
                className="text-base font-bold text-text-primary mb-1"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {t('sectorGrowthFull.headline', { prior: validYear - 1 })}
              </p>
              <p className="text-xs text-text-muted mb-4 max-w-2xl leading-relaxed">
                {t('sectorGrowthFull.subtitle')}
              </p>

              {syLoading ? (
                <Skeleton className="h-[380px]" />
              ) : sectorGrowthRows.some((r) => r.growthPct != null) ? (
                <SectorGrowthDiverging rows={sectorGrowthRows} />
              ) : (
                <p className="py-8 text-sm text-text-muted italic text-center">
                  {t('sectorGrowthFull.noComparison', { prior: validYear - 1 })}
                </p>
              )}
            </div>

          </div>

        <div className="pt-2 border-t border-border" />

        <div className="space-y-8">

          {/* Risk Evolution */}
          {yearRow && yoyData.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
                {t('riskEvolution.sectionLabel')}
              </p>
              <p
                className="text-base font-bold text-text-primary mb-1"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {t('riskEvolution.headline', { year: validYear })}
              </p>
              <p className="text-xs text-text-muted mb-4 max-w-2xl leading-relaxed">
                {t('riskEvolution.subtitle')}
              </p>

              <RiskEvolution yearRow={yearRow} allYears={yoyData} validYear={validYear} />
            </div>
          )}

          {/* Procedure Type */}
          {yearRow && yoyData.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
                {t('procedureType.sectionLabel')}
              </p>
              <p
                className="text-base font-bold text-text-primary mb-4"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {t('procedureType.headline')}
              </p>

              <ProcedureTypeSection yearRow={yearRow} allYears={yoyData} validYear={validYear} />
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border" />

        <div className="space-y-8">

          {/* Monthly spending */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
              {t('monthly.sectionLabel')}
            </p>
            <p
              className="text-base font-bold text-text-primary mb-1"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {t('monthly.headline', { year: validYear })}
            </p>
            <p className="text-xs text-text-muted mb-4 max-w-2xl leading-relaxed">
              {t('monthly.subtitle')}
            </p>

            {monthlyLoading ? (
              <Skeleton className="h-[240px]" />
            ) : (
              <MonthlySpending data={monthlyResp} year={validYear} />
            )}
          </div>

        </div>

        <div className="pt-2 border-t border-border" />

        <div className="space-y-8">

          {/* Spotlight — top vendor */}
          {topVendor && !vendorsLoading && (
            <motion.div variants={fadeIn} initial="initial" animate="animate">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
                {t('spotlight.label')}
              </p>
              <div
                className="rounded-sm border border-border/40 bg-card/60 p-5 cursor-pointer hover:border-accent/30 transition-colors"
                onClick={() => navigate(`/vendors/${topVendor.vendor_id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/vendors/${topVendor.vendor_id}`)
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted mb-1">
                  {t('spotlight.topVendorLabel', { year: validYear })}
                </p>
                <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                  <EntityIdentityChip
                    type="vendor"
                    id={topVendor.vendor_id}
                    name={topVendor.vendor_name}
                    riskScore={topVendor.avg_risk_score ?? undefined}
                    size="md"
                  />
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
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

          {/* Top 20 Vendors */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
              {t('topVendorsFull.sectionLabel')}
            </p>
            <p
              className="text-base font-bold text-text-primary mb-1"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {t('topVendorsFull.headline', { year: validYear })}
            </p>
            <p className="text-xs text-text-muted mb-4 max-w-2xl leading-relaxed">
              {t('topVendorsFull.subtitle')}
            </p>

            {vendorsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <TopVendorsTable
                vendors={vendorsResp?.data ?? []}
                onVendorClick={(id) => navigate(`/vendors/${id}`)}
              />
            )}
          </div>

          {/* Notable risk contracts */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-risk-critical" aria-hidden="true" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                {t('notableRisks.sectionLabel')}
              </p>
            </div>
            <p
              className="text-base font-bold text-text-primary mb-1"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {t('notableRisks.headline', { year: validYear })}
            </p>
            <p className="text-xs text-text-muted mb-4 max-w-2xl leading-relaxed">
              {t('notableRisks.subtitle')}
            </p>

            {riskContractsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <NotableRiskContracts
                contracts={(riskContractsResp?.data ?? []).slice(0, 10)}
                onContractClick={(id) => navigate(`/contracts/${id}`)}
              />
            )}
          </div>

          {/* Full year navigation at bottom */}
          <div className="mt-4">
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
                      : 'text-text-muted hover:text-text-primary hover:bg-card-hover border border-transparent',
                  )}
                  aria-current={y === validYear ? 'page' : undefined}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="h-8" />

        </div>

      </div>
    </div>
  )
}
