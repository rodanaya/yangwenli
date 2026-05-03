/**
 * Sectors — 12 Sectors of Mexican Federal Procurement
 *
 * Full-width dark-header overview page with responsive sector card grid.
 * Each card: sector color header strip, spend, contract count, risk badge,
 * vendor count, mini sparkline risk profile, and a link to the full sector profile.
 *
 * Sort: total spend (default) | avg risk score | contract count | name
 */

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { categoriesApi } from '@/api/client'
import { useQuery, useQueries } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { formatCompactMXN, formatNumber, cn } from '@/lib/utils'
import { sectorApi } from '@/api/client'
import {
  SECTOR_COLORS,
  RISK_COLORS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import type { SectorStatistics, SectorTrend } from '@/api/types'
import { ArrowRight, ChevronDown, Building2 } from 'lucide-react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import SectorConcentrationChart from '@/components/charts/SectorConcentrationChart'
import { MiniRiskField } from '@/components/charts/MiniRiskField'
import { FeaturedFinding } from '@/components/editorial/FeaturedFinding'
import { SectorModelCoefficients } from '@/components/sectors/SectorModelCoefficients'
import {
  EditorialLineChart,
  type LineSeries,
  type ColorToken,
} from '@/components/charts/editorial'

// ── helpers ───────────────────────────────────────────────────────────────────

type SortKey = 'total_value_mxn' | 'avg_risk_score' | 'total_contracts' | 'name'

function formatSpend(value: number): string {
  if (value >= 1_000_000_000_000) return `MX$${(value / 1_000_000_000_000).toFixed(1)}T`
  if (value >= 1_000_000_000) return `MX$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `MX$${(value / 1_000_000).toFixed(0)}M`
  return formatCompactMXN(value)
}

// RiskBar removed — MiniSparkline (below) renders the same 4-bucket distribution
// using the canonical MiniRiskField primitive. One source of truth.

// ── MiniSparkline ─────────────────────────────────────────────────────────────
// Renders the 4-bucket risk distribution as a tiny proportional column chart.
// The list endpoint does not carry per-year trend data, so we show the current
// risk profile (critical / high / medium / low) as a normalized mini-bar set.

interface MiniSparklineProps {
  sector: SectorStatistics
}

function MiniSparkline({ sector }: MiniSparklineProps) {
  const total = sector.total_contracts || 1
  return (
    <MiniRiskField
      criticalPct={((sector.critical_risk_count ?? 0) / total) * 100}
      highPct={((sector.high_risk_count ?? 0) / total) * 100}
      mediumPct={((sector.medium_risk_count ?? 0) / total) * 100}
      lowPct={((sector.low_risk_count ?? 0) / total) * 100}
      seed={sector.sector_id ?? 7}
      width={88}
      height={32}
    />
  )
}

// ── SectorCard ────────────────────────────────────────────────────────────────

interface SectorCardProps {
  sector: SectorStatistics
  rank: number
}

function SectorCard({ sector, rank }: SectorCardProps) {
  const { t } = useTranslation('sectors')
  const color = SECTOR_COLORS[sector.sector_code] ?? '#64748b'
  const riskLevel = getRiskLevelFromScore(sector.avg_risk_score)
  const highPlusCritical = (sector.high_risk_count ?? 0) + (sector.critical_risk_count ?? 0)
  const daPct = sector.direct_award_pct ?? 0
  const exceedsOECD = daPct > 25
  const sbPct = sector.single_bid_pct ?? 0
  // Bible §3.10: no green for low risk. Use zinc neutral for "clean".
  const sbDotColor = sbPct > 25 ? 'bg-red-500' : sbPct >= 15 ? 'bg-amber-500' : 'bg-zinc-400'

  return (
    <Link
      to={`/sectors/${sector.sector_id}`}
      className="surface-card group flex flex-col hover:bg-background-elevated hover:border-border transition-all duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${t(sector.sector_code)} — ${formatSpend(sector.total_value_mxn)}, ${riskLevel} risk`}
    >
      {/* Full-width color header strip */}
      <div
        className="h-1.5 w-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      <div className="px-4 pt-3 pb-3 flex flex-col gap-3 flex-1">
        {/* Header row: rank + sector name + risk badge + OECD badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-widest"
              style={{ color: `${color}99` }}
            >
              #{rank}
            </span>
            <h2 className="text-base font-bold text-text-primary leading-tight mt-0.5">
              {t(sector.sector_code)}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {/* OECD compliance badge — zinc neutral when compliant, red when exceeding */}
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${exceedsOECD ? 'bg-risk-critical/10 text-risk-critical border border-red-500/20' : 'bg-background-elevated text-text-secondary border border-border'}`}>
              OCDE {exceedsOECD ? '\u2717' : '\u2713'}
            </span>
            <RiskLevelPill level={riskLevel} score={sector.avg_risk_score} />
          </div>
        </div>

        {/* Spend + sparkline row */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-black font-mono tabular-nums text-text-primary leading-none">
              {formatSpend(sector.total_value_mxn)}
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {formatNumber(sector.total_contracts)} {t('card.contracts')}
            </p>
          </div>
          <MiniSparkline sector={sector} />
        </div>

        {/* Vendor count + DA pct row */}
        <div className="flex items-center justify-between gap-1 text-[11px] text-text-muted">
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span>
              {formatNumber(sector.total_vendors ?? 0)} {t('card.vendors')}
            </span>
          </div>
          <span className={`font-mono text-[10px] tabular-nums ${exceedsOECD ? 'text-risk-critical' : 'text-text-muted'}`}>
            {daPct.toFixed(0)}% {t('card.directAward')}
          </span>
        </div>

        {/* Risk distribution — single MiniRiskField source of truth */}
        <div className="space-y-1.5">
          <MiniRiskField
            criticalPct={((sector.critical_risk_count ?? 0) / (sector.total_contracts || 1)) * 100}
            highPct={((sector.high_risk_count ?? 0) / (sector.total_contracts || 1)) * 100}
            mediumPct={((sector.medium_risk_count ?? 0) / (sector.total_contracts || 1)) * 100}
            lowPct={((sector.low_risk_count ?? 0) / (sector.total_contracts || 1)) * 100}
            seed={sector.sector_id ?? 7}
            width={320}
            height={14}
          />
          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
            <span>
              {highPlusCritical > 0
                ? `${formatNumber(highPlusCritical)} ${t('profile.highPlusCritical')}`
                : t('card.low')}
            </span>
            <span>{(sector.avg_risk_score * 100).toFixed(1)}% {t('profile.avgRisk')}</span>
          </div>
        </div>

        {/* Single-bid signal */}
        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${sbDotColor}`} aria-hidden="true" />
          <span className="font-mono tabular-nums">{sbPct.toFixed(1)}%</span>
          <span className="text-text-muted">{t('card.singleBid')}</span>
        </div>

        {/* Market depth micro-stats */}
        <p className="text-[10px] text-text-muted tabular-nums mt-auto pt-1 border-t border-border">
          {formatNumber(sector.total_institutions ?? 0)} {t('card.institutions')}
          <span className="mx-1 text-text-primary">·</span>
          {formatNumber(sector.total_vendors ?? 0)} {t('card.providers')}
        </p>
      </div>

      {/* Footer link */}
      <div
        className="flex items-center justify-end gap-1 px-4 py-2 border-t border-border text-[11px] font-semibold transition-colors"
        style={{ color: `${color}cc` }}
      >
        <span className="group-hover:underline">{t('page.exploreLink')}</span>
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  )
}

// ── SectorCardSkeleton ────────────────────────────────────────────────────────

function SectorCardSkeleton() {
  return (
    <div className="surface-card overflow-hidden">
      <div className="h-1.5 w-full bg-background-elevated" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="space-y-1">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-end gap-0.5 h-8">
            {[0,1,2,3].map((i) => (
              <Skeleton key={i} className="w-3" style={{ height: `${40 + i * 15}%` }} />
            ))}
          </div>
        </div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  )
}

// ── SortDropdown ──────────────────────────────────────────────────────────────

interface SortDropdownProps {
  value: SortKey
  onChange: (v: SortKey) => void
}

function SortDropdown({ value, onChange }: SortDropdownProps) {
  const { t } = useTranslation('sectors')

  const options: { value: SortKey; label: string }[] = [
    { value: 'total_value_mxn', label: t('page.sortValue') },
    { value: 'avg_risk_score', label: t('page.sortRisk') },
    { value: 'total_contracts', label: t('page.sortContracts') },
    { value: 'name', label: t('page.sortName') },
  ]

  return (
    <div className="inline-flex items-center gap-3">
      <span className="text-[11px] text-text-muted font-mono uppercase tracking-widest">
        {t('page.sortBy')}
      </span>
      <div role="radiogroup" aria-label={t('page.sortBy')} className="flex items-center rounded-sm border border-border bg-background-elevated p-0.5">
        {options.map((o) => {
          const active = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`px-2.5 py-1 text-[12px] font-medium rounded-sm transition-colors ${
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── OECD Competition Dot Matrix ──────────────────────────────────────────────
// Horizontal dot strips: 50 dots = 0-100%, 1 dot = 2pp. OECD 25% marker at dot 12.

const OE_DOTS = 50            // 1 dot = 2pp
const OE_DOT_R = 3
const OE_DOT_GAP = 8
const OE_LABEL_W = 100
const OE_ROW_H = 16
const OE_VAL_W = 42
const OE_TOP_PAD = 16
const OE_BOTTOM_PAD = 6
const OECD_DOT_IDX = 12       // 12 * 2pp = 24-26pp, marks 25% line

function OECDCompetitionDotMatrix({
  data,
}: {
  data: Array<{ name: string; code: string; da_pct: number }>
}) {
  if (!data.length) return null

  const chartW = OE_LABEL_W + OE_DOTS * OE_DOT_GAP + OE_VAL_W
  const chartH = OE_TOP_PAD + data.length * OE_ROW_H + OE_BOTTOM_PAD

  // OECD line sits between dot index 11 and 12 (25% = 12.5 dots)
  const oecdX = OE_LABEL_W + OECD_DOT_IDX * OE_DOT_GAP - OE_DOT_GAP / 2 + OE_DOT_R

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH}`}
      className="w-full h-auto"
    >
      {/* OECD 25% reference line */}
      <line
        x1={oecdX}
        x2={oecdX}
        y1={OE_TOP_PAD - 10}
        y2={OE_TOP_PAD + data.length * OE_ROW_H}
        stroke="#22d3ee"
        strokeDasharray="4 4"
        strokeWidth={1}
      />
      <text
        x={oecdX}
        y={OE_TOP_PAD - 4}
        textAnchor="middle"
        fill="#22d3ee"
        fontSize={10}
        fontFamily="var(--font-family-mono)"
        fontWeight={600}
      >
        OCDE 25%
      </text>

      {data.map((item, rowIdx) => {
        const filled = Math.min(OE_DOTS, Math.round((item.da_pct / 100) * OE_DOTS))
        const yCenter = OE_TOP_PAD + rowIdx * OE_ROW_H + OE_ROW_H / 2
        const color = SECTOR_COLORS[item.code] ?? '#64748b'
        const aboveOECD = item.da_pct > 25

        return (
          <g key={item.code}>
            <text
              x={OE_LABEL_W - 6}
              y={yCenter + 3}
              textAnchor="end"
              fill="var(--color-text-muted)"
              fontSize={10}
              fontFamily="var(--font-family-mono)"
            >
              {item.name.length > 12 ? item.name.slice(0, 12) + '…' : item.name}
            </text>
            {Array.from({ length: OE_DOTS }).map((_, i) => {
              const isFilled = i < filled
              return (
                <motion.circle
                  key={i}
                  cx={OE_LABEL_W + i * OE_DOT_GAP + OE_DOT_R}
                  cy={yCenter}
                  r={OE_DOT_R}
                  fill={isFilled ? color : 'var(--color-background-elevated)'}
                  stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                  strokeWidth={0.5}
                  fillOpacity={isFilled ? (aboveOECD ? 0.9 : 0.4) : 1}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: rowIdx * 0.03 + i * 0.002 }}
                />
              )
            })}
            <text
              x={OE_LABEL_W + OE_DOTS * OE_DOT_GAP + 6}
              y={yCenter + 3}
              fill={aboveOECD ? color : 'var(--color-text-muted)'}
              fontSize={10}
              fontFamily="var(--font-family-mono)"
              fontWeight={aboveOECD ? 700 : 400}
            >
              {item.da_pct.toFixed(1)}%
            </text>
            <title>{item.name}: {item.da_pct.toFixed(1)}% direct awards</title>
          </g>
        )
      })}
    </svg>
  )
}

// ── SectorRiskTrendPanel ─────────────────────────────────────────────────────
// Fetches per-sector trends for the top 6 sectors and renders a LineChart.

function SectorRiskTrendPanel({ sectors, t }: { sectors: SectorStatistics[]; t: (k: string) => string }) {
  const top6 = useMemo(
    () => [...sectors].sort((a, b) => b.total_value_mxn - a.total_value_mxn).slice(0, 6),
    [sectors]
  )

  // Fetch trends for each of the top 6 sectors using useQueries (rules-of-hooks safe)
  const trendQueries = useQueries({
    queries: top6.map((s) => ({
      queryKey: ['sector', 'trends', s.sector_id],
      queryFn: () => sectorApi.getTrends(s.sector_id),
      staleTime: 10 * 60 * 1000,
    })),
  })

  const isLoadingTrends = trendQueries.some((q) => q.isLoading)

  // Build merged year-keyed dataset
  const chartData = useMemo(() => {
    if (isLoadingTrends) return []
    const yearMap = new Map<number, Record<string, number>>()
    for (let i = 0; i < top6.length; i++) {
      const sectorCode = top6[i].sector_code
      const rawTrends = trendQueries[i].data?.data ?? []
      for (const tr of rawTrends) {
        if (tr.year < 2015 || tr.year > 2025) continue
        const existing = yearMap.get(tr.year) || { year: tr.year }
        // YearOverYearChange uses avg_risk; SectorTrend uses avg_risk_score
        const avgRiskVal = ('avg_risk_score' in tr ? (tr as unknown as SectorTrend).avg_risk_score : (tr as { avg_risk?: number }).avg_risk) ?? 0
        existing[sectorCode] = avgRiskVal
        yearMap.set(tr.year, existing)
      }
    }
    return [...yearMap.values()].sort((a, b) => (a.year as number) - (b.year as number))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingTrends, top6.length])

  if (isLoadingTrends) {
    return (
      <div className="surface-card p-4">
        <Skeleton className="h-5 w-48 mb-3" />
        <Skeleton className="h-[220px] w-full" />
      </div>
    )
  }

  // Pre-multiply by 100 so the y-axis renders 0–100% via 'pct' formatter.
  const seriesData = chartData.map((row) => {
    const out: Record<string, number> = { year: row.year as number }
    for (const s of top6) {
      const raw = row[s.sector_code]
      if (typeof raw === 'number') out[s.sector_code] = raw * 100
    }
    return out
  })
  const series: LineSeries<typeof seriesData[number]>[] = top6.map((s) => ({
    key: s.sector_code,
    label: t(s.sector_code),
    colorToken: `sector-${s.sector_code}` as ColorToken,
    emphasis: 'secondary',
  }))

  return (
    <div className="surface-card p-4" role="img" aria-label="Line chart showing average risk score by sector from 2015 to 2025">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        {t('trendChart.eyebrow')}
      </p>
      <h3 className="text-sm font-bold text-text-primary mb-3">
        {t('trendChart.title')}
      </h3>
      <EditorialLineChart
        data={seriesData}
        xKey="year"
        series={series}
        yFormat="pct"
        height={220}
      />
    </div>
  )
}

// ── RiskRankingStrip ─────────────────────────────────────────────────────────
// Compact ranking of all 12 sectors by avg_risk_score descending, with
// horizontal bars proportional to the maximum score.

function RiskRankingStrip({
  sectors,
  t,
}: {
  sectors: SectorStatistics[]
  t: (k: string) => string
}) {
  const ranked = useMemo(
    () => [...sectors].sort((a, b) => b.avg_risk_score - a.avg_risk_score),
    [sectors]
  )
  const maxScore = ranked[0]?.avg_risk_score ?? 0

  if (!ranked.length) return null

  return (
    <div className="surface-card p-4 mb-8">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
        {t('riskRanking.eyebrow')}
      </p>
      <div className="flex flex-col">
        {ranked.map((s) => {
          const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'
          const pct = maxScore > 0 ? (s.avg_risk_score / maxScore) * 100 : 0
          return (
            <div
              key={s.sector_id}
              className="flex items-center gap-3"
              style={{ height: 24 }}
            >
              <span className="text-[11px] text-text-secondary w-28 flex-shrink-0 truncate">
                {t(s.sector_code)}
              </span>
              <div className="flex-1 h-1.5 bg-background-elevated rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.9 }}
                />
              </div>
              <span className="text-[11px] font-mono tabular-nums text-text-secondary w-12 text-right flex-shrink-0">
                {(s.avg_risk_score * 100).toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Sectors() {
  const { t, i18n } = useTranslation('sectors')
  const [sortKey, setSortKey] = useState<SortKey>('total_value_mxn')
  const [selectedCoefSectorId, setSelectedCoefSectorId] = useState<number | null>(null)

  // WHO / WHAT tab state. Previously /categories was its own page (3,700 LOC,
  // orphaned from the sidebar, and analytically complementary to /sectors
  // rather than distinct). Merged here per 5-agent review: one page, two
  // axes. URL-synced so deep links like /sectors?view=categories work.
  const [searchParams, setSearchParams] = useSearchParams()
  const view: 'sectors' | 'categories' =
    searchParams.get('view') === 'categories' ? 'categories' : 'sectors'
  const setView = (v: 'sectors' | 'categories') => {
    const next = new URLSearchParams(searchParams)
    if (v === 'sectors') next.delete('view')
    else next.set('view', v)
    setSearchParams(next, { replace: true })
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['sectors', 'list'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })

  // Category summary — only fetched when the user is on the WHAT tab.
  const { data: categoryData, isLoading: categoryLoading } = useQuery<{
    data: Array<{
      category_id: number
      name_es: string
      name_en: string
      sector_id: number | null
      sector_code: string | null
      total_contracts: number
      total_value: number
      avg_risk: number
      direct_award_pct: number
      single_bid_pct: number
      top_vendor: { id: number; name: string } | null
      top_institution: { id: number; name: string } | null
    }>
    total: number
  }>({
    queryKey: ['categories', 'summary'],
    queryFn: () => categoriesApi.getSummary(),
    staleTime: 5 * 60 * 1000,
    enabled: view === 'categories',
  })

  const sectors = data?.data ?? []

  const sorted = useMemo(() => {
    if (sortKey === 'name') {
      return [...sectors].sort((a, b) =>
        (t(a.sector_code) as string).localeCompare(t(b.sector_code) as string)
      )
    }
    return [...sectors].sort((a, b) => {
      const aVal = a[sortKey] as number
      const bVal = b[sortKey] as number
      return bVal - aVal
    })
  }, [sectors, sortKey, t])

  const totalValue = data?.total_value_mxn ?? 0
  const totalContracts = data?.total_contracts ?? 0

  const subtitleText = totalValue > 0
    ? t('page.subtitle', {
        totalValue: formatSpend(totalValue),
        years: '23',
      })
    : t('page.subtitleFallback')

  return (
    <div className="min-h-screen">

      {/* Utility header — same pattern as /aria, /workspace, /cases.
          Sectores is an exploration surface (12-sector breakdown,
          comparison, drill-down) used by both readers and analysts.
          The magazine spread (grid background + 60px serif headline
          + italic subtitle) was eating the entire fold; condensed to
          one title row + dateline + 3 anchor stats. */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {t('page.title')}
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted mt-1.5">
                {t('page.kicker', { defaultValue: 'Panorama sectorial' })}
                <span className="mx-1.5" aria-hidden>·</span>
                COMPRANET 2002–2025
                <span className="mx-1.5" aria-hidden>·</span>
                v0.6.5
              </p>
            </div>
            {!isLoading && (
              <div className="flex items-baseline gap-5">
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">12</div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                    {t('statCards.sectorsTracked')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">
                    {formatSpend(totalValue)}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                    {t('statCards.totalSpend', { defaultValue: 'Total spend' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-text-primary tabular-nums leading-none">
                    {formatNumber(totalContracts)}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.12em] text-text-muted mt-1">
                    {t('statCards.totalContracts')}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Subtitle — kept as a single muted line below for context. */}
          <p className="text-xs text-text-muted mt-2 max-w-2xl">
            {subtitleText}
          </p>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── WHO / WHAT axis toggle ─────────────────────────────────
            Sectors = WHO bought (12 agency taxonomy).
            Categories = WHAT was bought (72 Partida/CUCoP classifications).
            One page, two investigative lenses. */}
        <div className="mb-8 flex items-center gap-0 border-b border-border">
          <button
            type="button"
            onClick={() => setView('sectors')}
            className={cn(
              'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              view === 'sectors'
                ? 'border-[color:var(--color-text-primary)] text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary',
            )}
            aria-pressed={view === 'sectors'}
          >
            <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mr-2">WHO</span>
            <span>{i18n.language === 'es' ? 'Sectores' : 'Sectors'}</span>
            <span className="ml-2 font-mono text-[11px] text-text-muted">12</span>
          </button>
          <button
            type="button"
            onClick={() => setView('categories')}
            className={cn(
              'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              view === 'categories'
                ? 'border-[color:var(--color-text-primary)] text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary',
            )}
            aria-pressed={view === 'categories'}
          >
            <span className="font-mono text-[10px] font-bold tracking-[0.18em] uppercase mr-2">WHAT</span>
            <span>{i18n.language === 'es' ? 'Categorías' : 'Categories'}</span>
            <span className="ml-2 font-mono text-[11px] text-text-muted">
              {categoryData?.total ?? '—'}
            </span>
          </button>
        </div>

        {/* ── CATEGORIES VIEW — the WHAT axis ─────────────────────── */}
        {view === 'categories' && (
          <>
            {categoryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-96" />
                <Skeleton className="h-4 w-full max-w-2xl" />
                <div className="mt-6 space-y-1">
                  {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              </div>
            ) : categoryData && categoryData.data.length > 0 ? (() => {
              const topByRisk = [...categoryData.data].sort((a, b) => b.avg_risk - a.avg_risk)[0]
              const topByValue = [...categoryData.data].sort((a, b) => b.total_value - a.total_value)[0]
              const sortedByRisk = [...categoryData.data].sort((a, b) => b.avg_risk - a.avg_risk)
              return (
                <>
                  {/* Editorial lede */}
                  <div className="mb-8 pb-6 border-b border-border">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                      {i18n.language === 'es' ? 'Hallazgo · Categorías' : 'Finding · Categories'}
                    </p>
                    <h2
                      className="text-text-primary leading-[1.1] mb-3"
                      style={{
                        fontFamily: 'var(--font-family-serif)',
                        fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {i18n.language === 'es' ? (
                        <>
                          <span style={{ color: SECTOR_COLORS[topByRisk.sector_code ?? 'otros'] ?? '#dc2626' }}>
                            {topByRisk.name_es}
                          </span>
                          {' '}es la categoría de mayor riesgo:{' '}
                          <span className="font-mono tabular-nums">{(topByRisk.avg_risk * 100).toFixed(1)}%</span>
                          {' '}promedio.
                        </>
                      ) : (
                        <>
                          <span style={{ color: SECTOR_COLORS[topByRisk.sector_code ?? 'otros'] ?? '#dc2626' }}>
                            {topByRisk.name_en}
                          </span>
                          {' '}is the highest-risk category:{' '}
                          <span className="font-mono tabular-nums">{(topByRisk.avg_risk * 100).toFixed(1)}%</span>
                          {' '}average.
                        </>
                      )}
                    </h2>
                    <p className="text-base text-text-secondary leading-[1.6] max-w-prose">
                      {i18n.language === 'es' ? (
                        <>
                          Las categorías agrupan <strong className="text-text-primary">qué</strong> compró el gobierno — medicamentos, obra pública, software — independientemente de quién. Por volumen, <strong className="text-text-primary">{topByValue.name_es}</strong> lidera con <strong className="text-text-primary">{formatSpend(topByValue.total_value)}</strong> en contratos. Por riesgo, {topByRisk.name_es} encabeza la lista.
                        </>
                      ) : (
                        <>
                          Categories group <strong className="text-text-primary">what</strong> the government bought — medicines, civil works, software — regardless of who bought it. By volume, <strong className="text-text-primary">{topByValue.name_en}</strong> leads with <strong className="text-text-primary">{formatSpend(topByValue.total_value)}</strong> in contracts. By risk, {topByRisk.name_en} tops the list.
                        </>
                      )}
                    </p>
                  </div>

                  {/* Ranked table */}
                  <div className="mb-6 text-[10px] font-mono tracking-[0.15em] uppercase text-text-muted">
                    {i18n.language === 'es' ? 'Ordenadas por riesgo · descendente' : 'Sorted by risk · descending'}
                  </div>
                  <div className="rounded-sm border border-border overflow-hidden">
                    {sortedByRisk.map((cat, idx) => {
                      const riskLevel = getRiskLevelFromScore(cat.avg_risk)
                      const sectorColor = cat.sector_code ? SECTOR_COLORS[cat.sector_code] ?? '#64748b' : '#64748b'
                      return (
                        <div
                          key={cat.category_id}
                          className="flex items-center gap-4 px-5 py-3.5 border-b border-border last:border-b-0 hover:bg-[color:var(--color-background-elevated)] transition-colors"
                          style={{ borderLeft: `3px solid ${sectorColor}` }}
                        >
                          <span className="flex-shrink-0 w-8 font-mono text-[11px] font-bold text-text-muted tabular-nums">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <EntityIdentityChip
                                type="category"
                                id={cat.category_id}
                                name={i18n.language === 'es' ? cat.name_es : cat.name_en}
                                size="sm"
                              />
                              {cat.sector_code && (
                                <span className="text-[9px] font-mono tracking-widest uppercase text-text-muted">
                                  {t(cat.sector_code) as string}
                                </span>
                              )}
                            </div>
                            {cat.top_vendor && (
                              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
                                <span>{i18n.language === 'es' ? 'Top:' : 'Top:'}</span>
                                <EntityIdentityChip type="vendor" id={cat.top_vendor.id} name={cat.top_vendor.name} size="xs" hideIcon />
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right min-w-[90px]">
                            <div className="font-mono text-sm tabular-nums text-text-primary">
                              {formatSpend(cat.total_value)}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted mt-0.5">
                              {formatNumber(cat.total_contracts)} {i18n.language === 'es' ? 'cont.' : 'contracts'}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right min-w-[80px]">
                            <div
                              className="font-mono text-sm font-bold tabular-nums"
                              style={{ color: RISK_COLORS[riskLevel] }}
                            >
                              {(cat.avg_risk * 100).toFixed(1)}%
                            </div>
                            <div className="text-[10px] font-mono text-text-muted mt-0.5 uppercase tracking-wider">
                              {i18n.language === 'es' ? 'Riesgo' : 'Risk'}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right min-w-[70px]">
                            <div className="font-mono text-sm tabular-nums text-text-secondary">
                              {cat.direct_award_pct.toFixed(0)}%
                            </div>
                            <div className="text-[10px] font-mono text-text-muted mt-0.5 uppercase tracking-wider">
                              {i18n.language === 'es' ? 'Adj.Dir.' : 'Direct'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-4 text-[11px] text-text-muted leading-relaxed max-w-prose">
                    {i18n.language === 'es'
                      ? <>Las categorías usan códigos Partida/CUCoP. La cobertura confiable es 2023–2025 (100% Partida en Estructura D); años anteriores pueden tener clasificación parcial. Haz clic en una categoría para ver contratos, proveedores e instituciones.</>
                      : <>Categories use Partida/CUCoP codes. Reliable coverage is 2023–2025 (100% Partida in Structure D); earlier years may have partial classification. Click any category to drill into contracts, vendors, and institutions.</>
                    }
                  </p>
                </>
              )
            })() : (
              <div className="py-16 text-center text-sm text-text-muted">
                {i18n.language === 'es' ? 'No hay categorías disponibles.' : 'No categories available.'}
              </div>
            )}
          </>
        )}

        {/* ── SECTORS VIEW — the WHO axis (original content) ─────── */}
        {view === 'sectors' && (<>

        {/* ── HERO FINDING — editorial lede ─────────────────────────── */}
        {!isLoading && sectors.length > 0 && (() => {
          const topRiskSector = [...sectors].sort((a, b) => b.avg_risk_score - a.avg_risk_score)[0]
          const exceedingOECD = sectors.filter((s) => (s.direct_award_pct ?? 0) > 25).length
          const topSectorColor = SECTOR_COLORS[topRiskSector.sector_code] ?? '#dc2626'
          const topSectorName = t(topRiskSector.sector_code) as string
          const topRiskPct = (topRiskSector.avg_risk_score * 100).toFixed(1)
          const topDaPct = (topRiskSector.direct_award_pct ?? 0).toFixed(0)
          // Agriculture's high average-risk score is driven heavily by the
          // Segalmex ground-truth case (LICONSA, DICONSA, 6,326 contracts
          // labeled positive). Reporters landing here would otherwise read
          // "Agriculture is the most corrupt sector" as a standalone finding
          // — which the investigative-editor review flagged as a claim the
          // platform cannot defend. See memory/agriculture-health-risk-analysis.md.
          const isAgricultureArtifact = topRiskSector.sector_code === 'agricultura'
          return (
            <>
              <FeaturedFinding
                kicker={t('featured.kicker', { sector: topSectorName.toUpperCase() })}
                accent={topSectorColor}
                headline={
                  <>
                    <span style={{ color: topSectorColor }}>{topSectorName}</span>
                    {' '}{t('featured.leadsRisk')}{' '}
                    <span className="font-mono tabular-nums">{topRiskPct}%</span>
                    {' '}{t('featured.avgRiskSuffix')}
                  </>
                }
                deck={t('featured.deck', { exceedingOECD, topRiskPct, topDaPct })}
                meta={[
                  { label: t('featured.meta.leaderRisk'), value: `${topRiskPct}%`, accent: true },
                  { label: t('featured.meta.totalValue'), value: formatSpend(totalValue) },
                  { label: t('featured.meta.contracts'), value: formatNumber(totalContracts) },
                  { label: t('featured.meta.sectorsBeyond'), value: `${exceedingOECD} / 12` },
                ]}
              />
              {isAgricultureArtifact && (
                <div className="mb-8 -mt-4 pl-5 pr-4 py-3 rounded-r-sm border-l-4 border-[color:var(--color-border-hover)] bg-[color:var(--color-background-card)]">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
                    {i18n.language === 'es' ? 'Advertencia de artefacto' : 'Artifact caveat'}
                  </p>
                  <p className="text-[13px] leading-relaxed text-text-secondary max-w-prose">
                    {i18n.language === 'es'
                      ? <>El puntaje promedio de Agricultura está inflado por un solo caso de verdad fundamental: <strong className="text-text-primary">Segalmex (2019–2022)</strong>, donde LICONSA y DICONSA etiquetaron 6,326 contratos como positivos. Esto distorsiona el puntaje sectorial. <strong className="text-text-primary">Agricultura no es necesariamente "el sector más corrupto"</strong> — es el sector cuyos casos documentados dominan el conjunto de entrenamiento.</>
                      : <>Agriculture's average score is inflated by a single ground-truth case: <strong className="text-text-primary">Segalmex (2019–2022)</strong>, where LICONSA and DICONSA labeled 6,326 contracts as positives. This distorts the sector-level score. <strong className="text-text-primary">Agriculture is not necessarily "the most corrupt sector"</strong> — it is the sector whose documented cases dominate the training set.</>
                    }
                  </p>
                </div>
              )}
            </>
          )
        })()}

        {/* ── OECD COMPETITION GAP + RISK TREND ─────────────────────── */}
        {!isLoading && sectors.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* OECD Competition Gap Dot Matrix */}
            <div className="surface-card p-4" role="img" aria-label="Dot matrix comparing direct award rates by sector against the OECD 25% benchmark">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
                {t('finding.competitionGapLabel')}
              </p>
              <h3 className="text-sm font-bold text-text-primary mb-3">
                {t('finding.directAwardVsOECD')}
              </h3>
              <OECDCompetitionDotMatrix
                data={[...sectors]
                  .map((s) => ({
                    name: t(s.sector_code),
                    code: s.sector_code,
                    da_pct: s.direct_award_pct ?? 0,
                  }))
                  .sort((a, b) => b.da_pct - a.da_pct)}
              />
            </div>

            {/* Risk Trend per Sector (top 6 by value) */}
            <SectorRiskTrendPanel sectors={sectors} t={t} />
          </div>
        )}

        {/* ── RISK RANKING STRIP — all 12 sectors by avg risk score ── */}
        {!isLoading && sectors.length > 0 && (
          <RiskRankingStrip sectors={sectors} t={t} />
        )}

        {/* Controls row */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-text-secondary">
            {isLoading ? (
              <Skeleton className="h-4 w-32 inline-block" />
            ) : (
              <span>
                {sorted.length} {t('statCards.sectorsTracked').toLowerCase()}
              </span>
            )}
          </p>
          <SortDropdown value={sortKey} onChange={setSortKey} />
        </div>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="rounded-sm border border-red-500/30 bg-risk-critical/10 p-6 text-center text-sm text-risk-critical"
          >
            {t('page.failedToLoad')}
          </div>
        )}

        {/* Grid */}
        {!error && (
          <>
            {!isLoading && sorted.length === 0 && (
              <div className="rounded-sm border border-border/30 bg-background-elevated/20 p-10 text-center text-sm text-text-muted">
                {t('emptyState.noFoundDesc', { name: t('page.title', 'sectors') })}
              </div>
            )}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              role="list"
              aria-label={t('page.title')}
            >
              {isLoading
                ? Array.from({ length: 12 }).map((_, i) => (
                    <div role="listitem" key={i}>
                      <SectorCardSkeleton />
                    </div>
                  ))
                : sorted.map((sector, i) => (
                    <div role="listitem" key={sector.sector_id}>
                      <SectorCard sector={sector} rank={i + 1} />
                    </div>
                  ))}
            </div>
          </>
        )}

        {/* Risk Factor Analysis — per-sector model coefficients */}
        {!isLoading && !error && sectors.length > 0 && (() => {
          const sectorsByRisk = [...sectors].sort(
            (a, b) => b.avg_risk_score - a.avg_risk_score,
          )
          const defaultSector = sectorsByRisk[0]
          const activeSectorId = selectedCoefSectorId ?? defaultSector.sector_id
          const activeSector =
            sectors.find((s) => s.sector_id === activeSectorId) ?? defaultSector
          const activeSectorName = t(activeSector.sector_code) as string
          return (
            <section className="mt-10" aria-label={t('riskFactors.sectionAriaLabel')}>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
                    {t('riskFactors.eyebrow')}
                  </p>
                  <h2 className="text-xl font-bold text-text-primary leading-tight">
                    {t('riskFactors.title')}
                  </h2>
                  <p className="text-xs text-text-muted mt-1 max-w-2xl">
                    {t('riskFactors.description')}
                  </p>
                </div>
                <div className="relative inline-flex items-center gap-2">
                  <span className="text-xs text-text-secondary font-medium">{t('riskFactors.sectorLabel')}</span>
                  <div className="relative">
                    <select
                      value={activeSectorId}
                      onChange={(e) =>
                        setSelectedCoefSectorId(Number(e.target.value))
                      }
                      className="appearance-none rounded-lg border border-border bg-background-elevated pl-3 pr-8 py-1.5 text-sm text-text-primary font-medium cursor-pointer hover:border-border focus:outline-none focus:ring-2 focus:ring-border transition-colors"
                      aria-label={t('riskFactors.sectorAriaLabel')}
                    >
                      {sectorsByRisk.map((s) => (
                        <option key={s.sector_id} value={s.sector_id}>
                          {t(s.sector_code)} — {(s.avg_risk_score * 100).toFixed(1)}%
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
              <ErrorBoundary fallback={null}>
                <SectorModelCoefficients
                  sectorId={activeSector.sector_id}
                  sectorName={activeSectorName}
                />
              </ErrorBoundary>
            </section>
          )
        })()}

        {/* Market Concentration Chart */}
        <div className="mt-8">
          <ErrorBoundary fallback={null}>
            <SectorConcentrationChart />
          </ErrorBoundary>
        </div>

        {/* Model note footnote */}
        {!isLoading && !error && (
          <p className="mt-8 text-[11px] text-text-muted leading-relaxed max-w-4xl">
            <strong className="text-text-muted">Note:</strong> {t('page.modelNote')}
          </p>
        )}
        </>)}
      </main>
    </div>
  )
}

export default Sectors
