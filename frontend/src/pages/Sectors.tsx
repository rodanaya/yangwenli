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
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery, useQueries } from '@tanstack/react-query'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { sectorApi } from '@/api/client'
import {
  SECTOR_COLORS,
  RISK_COLORS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import type { SectorStatistics, SectorTrend } from '@/api/types'
import { ArrowRight, ChevronDown, Building2 } from 'lucide-react'
import SectorConcentrationChart from '@/components/charts/SectorConcentrationChart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LineChart,
  Line,
  Legend,
} from '@/components/charts'

// ── helpers ───────────────────────────────────────────────────────────────────

type SortKey = 'total_value_mxn' | 'avg_risk_score' | 'total_contracts' | 'name'

function formatSpend(value: number): string {
  if (value >= 1_000_000_000_000) return `MX$${(value / 1_000_000_000_000).toFixed(1)}T`
  if (value >= 1_000_000_000) return `MX$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `MX$${(value / 1_000_000).toFixed(0)}M`
  return formatCompactMXN(value)
}

// ── RiskBar ───────────────────────────────────────────────────────────────────

interface RiskBarProps {
  sector: SectorStatistics
}

function RiskBar({ sector }: RiskBarProps) {
  const total = sector.total_contracts || 1
  const critPct = ((sector.critical_risk_count ?? 0) / total) * 100
  const highPct = ((sector.high_risk_count ?? 0) / total) * 100
  const medPct = ((sector.medium_risk_count ?? 0) / total) * 100
  const lowPct = ((sector.low_risk_count ?? 0) / total) * 100

  const segments = [
    { pct: critPct, color: RISK_COLORS.critical, label: 'Critical' },
    { pct: highPct, color: RISK_COLORS.high, label: 'High' },
    { pct: medPct, color: RISK_COLORS.medium, label: 'Medium' },
    { pct: lowPct, color: RISK_COLORS.low, label: 'Low' },
  ]

  const titleText = segments
    .filter((s) => s.pct > 0.5)
    .map((s) => `${s.label}: ${s.pct.toFixed(1)}%`)
    .join(' | ')

  return (
    <div
      className="flex h-1.5 w-full rounded-full overflow-hidden gap-px"
      role="meter"
      aria-label={titleText}
      title={titleText}
    >
      {segments.map((s) =>
        s.pct > 0.3 ? (
          <div
            key={s.label}
            className="h-full transition-all duration-500"
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
          />
        ) : null
      )}
    </div>
  )
}

// ── MiniSparkline ─────────────────────────────────────────────────────────────
// Renders the 4-bucket risk distribution as a tiny proportional column chart.
// The list endpoint does not carry per-year trend data, so we show the current
// risk profile (critical / high / medium / low) as a normalized mini-bar set.

interface MiniSparklineProps {
  sector: SectorStatistics
}

function MiniSparkline({ sector }: MiniSparklineProps) {
  const total = sector.total_contracts || 1
  // Risk colors only — sector color identity stays on the header strip, not on risk visuals
  const bars = [
    { pct: ((sector.critical_risk_count ?? 0) / total) * 100, barColor: RISK_COLORS.critical, label: 'Crit' },
    { pct: ((sector.high_risk_count ?? 0) / total) * 100, barColor: RISK_COLORS.high, label: 'High' },
    { pct: ((sector.medium_risk_count ?? 0) / total) * 100, barColor: RISK_COLORS.medium, label: 'Med' },
    { pct: ((sector.low_risk_count ?? 0) / total) * 100, barColor: RISK_COLORS.low, label: 'Low' },
  ]
  const maxPct = Math.max(...bars.map((b) => b.pct), 1)

  return (
    <div
      className="flex items-end gap-0.5 h-8 flex-shrink-0"
      aria-hidden="true"
      title="Risk profile: Critical / High / Medium / Low"
    >
      {bars.map((b) => (
        <div
          key={b.label}
          className="w-3 rounded-sm transition-all duration-500"
          style={{
            height: `${Math.max((b.pct / maxPct) * 100, 8)}%`,
            backgroundColor: b.barColor,
            opacity: b.label === 'Low' ? 0.5 : 0.85,
          }}
        />
      ))}
    </div>
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

  return (
    <Link
      to={`/sectors/${sector.sector_id}`}
      className="surface-card group flex flex-col hover:bg-zinc-800/70 hover:border-white/15 transition-all duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
            <h2 className="text-base font-bold text-white leading-tight mt-0.5">
              {t(sector.sector_code)}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {/* OECD compliance badge — zinc neutral when compliant, red when exceeding */}
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${exceedsOECD ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50'}`}>
              OCDE {exceedsOECD ? '\u2717' : '\u2713'}
            </span>
            <RiskBadge level={riskLevel} />
          </div>
        </div>

        {/* Spend + sparkline row */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-black tabular-nums text-white leading-none">
              {formatSpend(sector.total_value_mxn)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {formatNumber(sector.total_contracts)} {t('card.contracts')}
            </p>
          </div>
          <MiniSparkline sector={sector} />
        </div>

        {/* Vendor count + DA pct row */}
        <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span>
              {formatNumber(sector.total_vendors)} {t('card.vendors')}
            </span>
          </div>
          <span className={`font-mono text-[10px] tabular-nums ${exceedsOECD ? 'text-red-400' : 'text-zinc-500'}`}>
            {daPct.toFixed(0)}% adj. directa
          </span>
        </div>

        {/* Risk distribution bar */}
        <div className="space-y-1.5">
          <RiskBar sector={sector} />
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>
              {highPlusCritical > 0
                ? `${formatNumber(highPlusCritical)} ${t('profile.highPlusCritical')}`
                : t('card.low')}
            </span>
            <span>{(sector.avg_risk_score * 100).toFixed(1)}% {t('profile.avgRisk')}</span>
          </div>
        </div>
      </div>

      {/* Footer link */}
      <div
        className="flex items-center justify-end gap-1 px-4 py-2 border-t border-white/5 text-[11px] font-semibold transition-colors"
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
      <div className="h-1.5 w-full bg-zinc-800" />
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
    <div className="relative inline-flex items-center gap-2">
      <span className="text-xs text-zinc-400 font-medium">{t('page.sortBy')}:</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SortKey)}
          className="appearance-none rounded-lg border border-white/10 bg-zinc-800/80 pl-3 pr-8 py-1.5 text-sm text-white font-medium cursor-pointer hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-colors"
          aria-label={t('page.sortBy')}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400"
          aria-hidden="true"
        />
      </div>
    </div>
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

  return (
    <div className="surface-card p-4" role="img" aria-label="Line chart showing average risk score by sector from 2015 to 2025">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        Tendencia temporal
      </p>
      <h3 className="text-sm font-bold text-white mb-3">
        Riesgo promedio por sector 2015-2025
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#71717a' }} />
          <YAxis
            tick={{ fontSize: 9, fill: '#71717a' }}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            domain={[0, 'auto']}
          />
          <RechartsTooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs">
                  <p className="text-white font-semibold mb-1">{label}</p>
                  {payload.map((p) => (
                    <p key={String(p.dataKey)} style={{ color: String(p.color) }}>
                      {t(String(p.dataKey))}: {((p.value as number) * 100).toFixed(1)}%
                    </p>
                  ))}
                </div>
              )
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px' }}
            formatter={(value: string) => t(value)}
          />
          {top6.map((s) => (
            <Line
              key={s.sector_code}
              type="monotone"
              dataKey={s.sector_code}
              stroke={SECTOR_COLORS[s.sector_code] ?? '#64748b'}
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Sectors() {
  const { t } = useTranslation('sectors')
  const [sortKey, setSortKey] = useState<SortKey>('total_value_mxn')

  const { data, isLoading, error } = useQuery({
    queryKey: ['sectors', 'list'],
    queryFn: () => sectorApi.getAll(),
    staleTime: 5 * 60 * 1000,
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

      {/* ── DARK HEADER ──────────────────────────────────────────────────────── */}
      <header className="relative bg-zinc-950 border-b border-white/8 overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.5) 40px,
              rgba(255,255,255,0.5) 41px
            ), repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.5) 40px,
              rgba(255,255,255,0.5) 41px
            )`,
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <p className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
            COMPRANET 2002–2025 · v0.6.5 RISK MODEL
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
            {t('page.title')}
          </h1>
          <p className="mt-3 text-base text-zinc-400 max-w-2xl">
            {subtitleText}
          </p>

          {/* Summary row: "12 sectors · 9.9T MXN · 3.1M contracts" */}
          <div className="mt-5">
            {isLoading ? (
              <Skeleton className="h-6 w-64" />
            ) : (
              <p className="text-sm font-semibold text-zinc-300 tracking-wide">
                <span className="text-white font-black">12</span>{' '}
                <span className="text-zinc-500">{t('statCards.sectorsTracked').toLowerCase()}</span>
                <span className="mx-2 text-zinc-700" aria-hidden="true">·</span>
                <span className="text-white font-black tabular-nums">{formatSpend(totalValue)}</span>
                <span className="mx-2 text-zinc-700" aria-hidden="true">·</span>
                <span className="text-white font-black tabular-nums">{formatNumber(totalContracts)}</span>{' '}
                <span className="text-zinc-500">{t('statCards.totalContracts').toLowerCase()}</span>
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── HERO FINDING STRIP ─────────────────────────────────────── */}
        {!isLoading && sectors.length > 0 && (() => {
          const topRiskSector = [...sectors].sort((a, b) => b.avg_risk_score - a.avg_risk_score)[0]
          const exceedingOECD = sectors.filter((s) => (s.direct_award_pct ?? 0) > 25).length
          return (
            <div className="mb-8 surface-card p-4">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                {t('finding.kicker')}
              </p>
              <h2
                className="text-lg font-bold text-white leading-snug mb-4 max-w-2xl"
                style={{ fontFamily: 'var(--font-family-serif)' }}
              >
                {t('finding.headline', { sector: t(topRiskSector.sector_code) })}
              </h2>
              <div className="flex flex-wrap gap-4">
                <div className="border-l-2 border-red-500 pl-3 py-0.5">
                  <div className="text-xl font-mono font-bold text-red-500">
                    {(topRiskSector.avg_risk_score * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                    {t('finding.avgRiskLeader')}
                  </div>
                </div>
                <div className="border-l-2 border-orange-500 pl-3 py-0.5">
                  <div className="text-xl font-mono font-bold text-orange-400">
                    {formatSpend(totalValue)}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                    {t('finding.totalContracted')}
                  </div>
                </div>
                <div className="border-l-2 border-zinc-500 pl-3 py-0.5">
                  <div className="text-xl font-mono font-bold text-zinc-300">
                    {exceedingOECD} {t('finding.ofTwelve')}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
                    {t('finding.sectorsExceedOECD')}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── OECD COMPETITION GAP + RISK TREND ─────────────────────── */}
        {!isLoading && sectors.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* OECD Competition Gap Bar Chart */}
            <div className="surface-card p-4" role="img" aria-label="Bar chart comparing direct award rates by sector against the OECD 25% benchmark">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                {t('finding.competitionGapLabel')}
              </p>
              <h3 className="text-sm font-bold text-white mb-3">
                {t('finding.directAwardVsOECD')}
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[...sectors]
                    .map((s) => ({
                      name: t(s.sector_code),
                      code: s.sector_code,
                      da_pct: s.direct_award_pct ?? 0,
                    }))
                    .sort((a, b) => b.da_pct - a.da_pct)}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: '#71717a' }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 9, fill: '#a1a1aa' }}
                  />
                  <ReferenceLine x={25} stroke="#22d3ee" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'OCDE 25%', position: 'top', fill: '#22d3ee', fontSize: 9 }} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as { name: string; da_pct: number } | undefined
                      if (!d) return null
                      return (
                        <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs">
                          <p className="text-white font-semibold">{d.name}</p>
                          <p className="text-zinc-400">{t('finding.tooltipDirectAward')} <span className="text-orange-400 font-bold">{d.da_pct.toFixed(1)}%</span></p>
                          <p className="text-zinc-500">{d.da_pct > 25 ? t('finding.tooltipAboveOECD', { x: (d.da_pct / 25).toFixed(1) }) : t('finding.tooltipWithinOECD')}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="da_pct" radius={[0, 3, 3, 0]}>
                    {[...sectors]
                      .map((s) => ({
                        code: s.sector_code,
                        da_pct: s.direct_award_pct ?? 0,
                      }))
                      .sort((a, b) => b.da_pct - a.da_pct)
                      .map((entry) => (
                        <Cell
                          key={entry.code}
                          fill={SECTOR_COLORS[entry.code] ?? '#64748b'}
                          fillOpacity={entry.da_pct > 25 ? 0.85 : 0.35}
                        />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Trend per Sector (top 6 by value) */}
            <SectorRiskTrendPanel sectors={sectors} t={t} />
          </div>
        )}

        {/* Controls row */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-zinc-400">
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
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-400"
          >
            {t('page.failedToLoad')}
          </div>
        )}

        {/* Grid */}
        {!error && (
          <>
            {!isLoading && sorted.length === 0 && (
              <div className="rounded-xl border border-border/30 bg-background-elevated/20 p-10 text-center text-sm text-text-muted">
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

        {/* Market Concentration Chart */}
        <div className="mt-8">
          <ErrorBoundary fallback={null}>
            <SectorConcentrationChart />
          </ErrorBoundary>
        </div>

        {/* Model note footnote */}
        {!isLoading && !error && (
          <p className="mt-8 text-[11px] text-zinc-600 leading-relaxed max-w-4xl">
            <strong className="text-zinc-500">Note:</strong> {t('page.modelNote')}
          </p>
        )}
      </main>
    </div>
  )
}

export default Sectors
