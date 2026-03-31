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
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskBadge } from '@/components/ui/badge'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { sectorApi } from '@/api/client'
import {
  SECTOR_COLORS,
  RISK_COLORS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import type { SectorStatistics } from '@/api/types'
import { ArrowRight, ChevronDown, Building2 } from 'lucide-react'

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
  color: string
}

function MiniSparkline({ sector, color }: MiniSparklineProps) {
  const total = sector.total_contracts || 1
  const bars = [
    { pct: ((sector.critical_risk_count ?? 0) / total) * 100, barColor: RISK_COLORS.critical, label: 'Crit' },
    { pct: ((sector.high_risk_count ?? 0) / total) * 100, barColor: RISK_COLORS.high, label: 'High' },
    { pct: ((sector.medium_risk_count ?? 0) / total) * 100, barColor: RISK_COLORS.medium, label: 'Med' },
    { pct: ((sector.low_risk_count ?? 0) / total) * 100, barColor: color, label: 'Low' },
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
            opacity: b.label === 'Low' ? 0.35 : 0.85,
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

  return (
    <Link
      to={`/sectors/${sector.sector_id}`}
      className="group flex flex-col rounded-xl border border-white/8 bg-zinc-900/60 hover:bg-zinc-800/70 hover:border-white/15 transition-all duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`${t(sector.sector_code)} — ${formatSpend(sector.total_value_mxn)}, ${riskLevel} risk`}
    >
      {/* Full-width color header strip */}
      <div
        className="h-1.5 w-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      <div className="px-4 pt-3 pb-3 flex flex-col gap-3 flex-1">
        {/* Header row: rank + sector name + risk badge */}
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
          <RiskBadge level={riskLevel} />
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
          <MiniSparkline sector={sector} color={color} />
        </div>

        {/* Vendor count row */}
        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
          <Building2 className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          <span>
            {formatNumber(sector.total_vendors)} {t('card.vendors')}
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
    <div className="rounded-xl border border-white/8 bg-zinc-900/60 overflow-hidden">
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
            COMPRANET 2002–2025 · v6.5 RISK MODEL
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
        )}

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
