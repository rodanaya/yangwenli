/**
 * Institution Transparency League
 *
 * League-table style ranking of 2,563 scored institutions by their
 * overall transparency score (0-100) derived from 5 pillars:
 *   Openness, Price, Vendors, Process, External Alerts
 *
 * 5-tier system (i18n-aware):
 *   Excelente/Excellent, Satisfactorio/Satisfactory, Regular/Adequate,
 *   Deficiente/Deficient, Critico/Critical
 *
 * Editorial dark-mode design: warm-stone palette, prominent numeric scores,
 * crimson accent for accountability.
 */

import React, { useMemo, useCallback, lazy, Suspense, useState } from 'react'
import { DotBar } from '@/components/ui/DotBar'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  TIER_STYLES,
  TIER_GRADE_MAP,
  TIER_NAMES,
  gradeToTierKey,
  type TierKey,
  type TierStyle,
} from '@/lib/tiers'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Act } from '@/components/layout/Act'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trophy,
  Flag,
} from 'lucide-react'
import { scorecardApi } from '@/api/client'
import { SECTORS, SECTOR_COLORS } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'

// Reverse-lookup: sector display name (Spanish or English) → canonical code,
// so we can resolve a SECTOR_COLORS swatch from the `sector_name` returned by
// the scorecards API (which sends the localized name_es, not the code).
const SECTOR_NAME_TO_CODE: Record<string, string> = SECTORS.reduce<Record<string, string>>(
  (acc, s) => {
    acc[s.name.toLowerCase()] = s.code
    acc[s.nameEN.toLowerCase()] = s.code
    acc[s.code.toLowerCase()] = s.code
    return acc
  },
  {},
)

function getSectorColorFromName(sectorName: string | null | undefined): string {
  if (!sectorName) return SECTOR_COLORS.otros
  const code = SECTOR_NAME_TO_CODE[sectorName.toLowerCase()] ?? 'otros'
  return SECTOR_COLORS[code] ?? SECTOR_COLORS.otros
}

const InstitutionScorecards = lazy(() => import('./InstitutionScorecards'))
const ReportCard = lazy(() => import('./ReportCard'))

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InstitutionScorecardItem {
  institution_id: number
  institution_name: string
  ramo_code: number | null
  sector_name: string | null
  total_score: number
  grade: string
  grade_label: string
  grade_color: string
  national_percentile: number
  pillar_openness: number
  pillar_price: number
  pillar_vendors: number
  pillar_process: number
  pillar_external: number
  top_risk_driver: string | null
  confidence_band: string | null
  p90_risk_score: number | null
  trend_direction: string | null
  peer_percentile_sector: number | null
  signal_count_red: number | null
}

interface ScorecardListResponse {
  data: InstitutionScorecardItem[]
  total: number
  page: number
  per_page: number
  total_pages: number
  grade_distribution: Record<string, number>
}

interface InstitutionStats {
  total_scored: number
  median_score: number
  top_institution_id: number | null
  top_institution_name: string | null
  top_institution_score: number | null
  worst_institution_id: number | null
  worst_institution_name: string | null
  worst_institution_score: number | null
  grade_distribution: Record<string, number>
}

type SortKey =
  | 'total_score'
  | 'national_percentile'
  | 'institution_name'
  | 'pillar_openness'
  | 'pillar_price'
  | 'pillar_vendors'
  | 'pillar_process'
  | 'pillar_external'

// 5-tier color system imported from lib/tiers (shared with InstitutionScorecards).
// Local TierInfo extends TierStyle with the i18n label resolved at consumption time.
interface TierInfo extends TierStyle {
  label: string
}

/** Hook that returns an i18n-aware tier-info resolver. */
function useTierInfo() {
  const { t } = useTranslation('institutionleague')
  return useCallback((grade: string): TierInfo => {
    const key = gradeToTierKey(grade)
    return { ...TIER_STYLES[key], label: t(`tiers.${key}`) }
  }, [t])
}

/** Hook that returns the full TierInfo for a given tier key. */
function useTierByKey() {
  const { t } = useTranslation('institutionleague')
  return useCallback((key: TierKey): TierInfo => {
    return { ...TIER_STYLES[key], label: t(`tiers.${key}`) }
  }, [t])
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TrendIcon({ direction }: { direction: string | null }) {
  const { t } = useTranslation('institutionleague')
  if (direction === 'improving') return <TrendingUp className="h-3.5 w-3.5 text-text-secondary" aria-label={t('trend.improving')} />
  if (direction === 'declining') return <TrendingDown className="h-3.5 w-3.5 text-risk-critical" aria-label={t('trend.declining')} />
  return <Minus className="h-3.5 w-3.5 text-text-muted" aria-label={t('trend.stable')} />
}

/** 5 mini vertical bars showing all pillars at a glance */
function PillarSparkBars({ item }: { item: InstitutionScorecardItem }) {
  const pillars = [
    { key: 'O', label: 'Openness', value: item.pillar_openness, max: 20 },
    { key: 'P', label: 'Price', value: item.pillar_price, max: 25 },
    { key: 'V', label: 'Vendors', value: item.pillar_vendors, max: 20 },
    { key: 'R', label: 'Process', value: item.pillar_process, max: 15 },
    { key: 'E', label: 'External', value: item.pillar_external, max: 20 },
  ]
  const tooltip = pillars.map(p => `${p.label}: ${p.value.toFixed(0)}/${p.max}`).join(' · ')
  return (
    <div
      className="flex items-end gap-[3px]"
      title={tooltip}
      aria-hidden="true"
    >
      {pillars.map(({ key, value, max }) => {
        const pct = Math.min(100, Math.max(2, (value / max) * 100))
        const bg = pct > 65 ? 'var(--color-text-muted)' : pct > 35 ? 'var(--color-risk-high)' : 'var(--color-risk-critical)'
        return (
          <div key={key} className="flex flex-col items-center gap-[2px]">
            <div className="w-[18px] h-7 bg-background-elevated rounded-[2px] flex flex-col justify-end overflow-hidden">
              <div style={{ height: `${pct}%`, background: bg }} className="w-full rounded-[1px] transition-all" />
            </div>
            <span className="text-[7px] text-text-muted font-mono leading-none select-none">{key}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Risk driver pill
// ---------------------------------------------------------------------------

function RiskDriverPill({ driver }: { driver: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[9px] font-mono uppercase tracking-wide mt-0.5"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-risk-critical) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-risk-critical) 30%, transparent)',
        color: 'var(--color-risk-critical)',
      }}
    >
      <span
        className="h-1 w-1 rounded-full flex-shrink-0"
        style={{ backgroundColor: 'var(--color-risk-critical)' }}
      />
      {driver}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Tier distribution bar (5-tier stacked bar)
// ---------------------------------------------------------------------------

function TierDistributionBar({ distribution }: { distribution: Record<string, number> }) {
  const { t } = useTranslation('institutionleague')
  const getTier = useTierByKey()

  const tiers = useMemo(() => {
    return TIER_NAMES.map((key) => {
      const grades = TIER_GRADE_MAP[key]
      const count = grades.reduce((sum, g) => sum + (distribution[g] ?? 0), 0)
      return { tier: getTier(key), count }
    })
  }, [distribution, getTier])

  const total = tiers.reduce((s, t) => s + t.count, 0)
  if (total === 0) return null

  const ariaLabel = t('distribution.ariaLabel')

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        {t('distribution.title')}
      </p>
      {/* Stacked dot-matrix */}
      {(() => {
        const N = 60, DR = 3, DG = 8
        const segments: Array<{ count: number; color: string; label: string }> = tiers
          .filter((tier) => (tier.count / total) * 100 >= 0.3)
          .map(({ tier, count }) => ({ count, color: tier.color, label: tier.label }))
        const cells: { color: string; label: string }[] = []
        // Distribute dots proportionally across segments
        segments.forEach((seg) => {
          const segDots = Math.max(1, Math.round((seg.count / total) * N))
          for (let k = 0; k < segDots && cells.length < N; k++) {
            cells.push({ color: seg.color, label: seg.label })
          }
        })
        // Fill remaining with last segment color
        while (cells.length < N && cells.length > 0) {
          cells.push(cells[cells.length - 1])
        }
        return (
          <svg viewBox={`0 0 ${N * DG} 10`} width={N * DG} height={10}
            role="img" aria-label={ariaLabel}>
            {cells.map((c, k) => (
              <circle key={k} cx={k * DG + DR} cy={5} r={DR}
                fill={c.color}
                fillOpacity={0.9}
              >
                <title>{c.label}</title>
              </circle>
            ))}
          </svg>
        )
      })()}
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {tiers.filter(t => t.count > 0).map(({ tier, count }) => {
          const pct = ((count / total) * 100).toFixed(1)
          return (
            <span key={tier.key} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: tier.color }} />
              <span className="font-mono font-bold" style={{ color: tier.color }}>{tier.label}</span>
              <span className="font-mono tabular-nums text-text-muted">{count}</span>
              <span className="font-mono tabular-nums text-text-muted">({pct}%)</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ChampionCard — editorial "honor roll" card for top performers
// Gold accent, score as the visual anchor, verdict-style tier badge
// ---------------------------------------------------------------------------

function ChampionCard({
  rank,
  item,
  onNavigate,
}: {
  rank: number
  item: InstitutionScorecardItem
  onNavigate: (id: number) => void
}) {
  const { t } = useTranslation('institutionleague')
  const getTier = useTierInfo()
  const tier = getTier(item.grade)
  const sectorColor = getSectorColorFromName(item.sector_name)

  return (
    <button
      onClick={() => onNavigate(item.institution_id)}
      className="relative w-full text-left group transition-colors flex items-center gap-4 px-3 py-2.5 border-b border-border/40 last:border-b-0 hover:bg-background-elevated/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
      aria-label={t('podiumAriaLabel', { rank, name: item.institution_name, score: item.total_score })}
    >
      {/* Rank — quiet mono caption */}
      <span
        className="text-[11px] font-mono font-bold tabular-nums w-6 flex-shrink-0 text-text-muted"
      >
        {rank}
      </span>

      {/* Institution name — single line, demoted weight */}
      <span className="flex-1 min-w-0 truncate text-text-secondary text-[13px] group-hover:text-text-primary transition-colors">
        {item.institution_name}
      </span>

      {/* Sector dot */}
      {item.sector_name && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: sectorColor }}
          title={item.sector_name}
        />
      )}

      {/* Score — tabular mono */}
      <span className="font-mono tabular-nums text-[11px] text-text-muted flex-shrink-0 w-12 text-right">
        {item.total_score.toFixed(1)}
      </span>

      {/* Tier — caption mono in tier color (no big italic) */}
      <span
        className="text-[9px] font-mono font-bold uppercase tracking-[0.12em] flex-shrink-0 w-24 text-right"
        style={{ color: tier.color }}
      >
        {tier.label}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// RedFlagCard — red warning card for bottom performers
// ---------------------------------------------------------------------------

function RedFlagCard({
  rank,
  item,
  onNavigate,
}: {
  rank: number
  item: InstitutionScorecardItem
  onNavigate: (id: number) => void
}) {
  const { t } = useTranslation('institutionleague')
  const getTier = useTierInfo()
  const tier = getTier(item.grade)
  const sectorColor = getSectorColorFromName(item.sector_name)

  return (
    <button
      onClick={() => onNavigate(item.institution_id)}
      className="relative w-full text-left group transition-all
        border border-border bg-background-elevated/40
        hover:bg-risk-critical/8
        hover:border-risk-critical/40
        focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-risk-critical)]/50"
      style={{
        borderLeft: '4px solid var(--color-risk-critical)',
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      }}
      aria-label={t('rowAriaLabel', { rank, name: item.institution_name, score: item.total_score, tier: tier.label })}
    >
      <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-4 sm:gap-6 px-4 sm:px-6 py-4">

        {/* Rank — cinematic Playfair numeral, left-anchored */}
        <div className="flex items-baseline gap-2 min-w-[58px]">
          <span
            className="leading-none tabular-nums"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: '60px',
              color: 'var(--color-risk-critical)',
              letterSpacing: '-0.04em',
            }}
          >
            {rank}
          </span>
        </div>

        {/* Identity column — institution name in Garamond italic, sector chip below */}
        <div className="min-w-0 flex flex-col gap-1.5">
          <p
            className="text-text-primary leading-snug line-clamp-2"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: '18px',
              letterSpacing: '-0.005em',
            }}
          >
            {item.institution_name}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tier verdict pill — inline */}
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.12em]"
              style={{
                backgroundColor: `color-mix(in srgb, ${tier.color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${tier.color} 35%, transparent)`,
                color: tier.color,
              }}
            >
              <span
                aria-hidden="true"
                className="h-1 w-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: tier.color }}
              />
              {tier.label}
            </span>
            <span className="text-text-muted text-[10px] font-mono tabular-nums tracking-wide">
              {item.total_score.toFixed(1)}<span className="opacity-50"> / 100</span>
            </span>
            {item.sector_name && (
              <span
                className="text-[9px] font-mono uppercase tracking-[0.12em] truncate flex items-center gap-1.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sectorColor }}
                />
                {item.sector_name}
              </span>
            )}
            {item.top_risk_driver && (
              <RiskDriverPill driver={item.top_risk_driver} />
            )}
          </div>
        </div>

        {/* Pillar sparks — inline right, only at >=sm */}
        <div className="hidden sm:flex flex-shrink-0">
          <PillarSparkBars item={item} />
        </div>

        {/* Trailing affordance — trend + chevron, sits at far right */}
        <div className="flex items-center gap-2 flex-shrink-0 text-text-muted">
          <TrendIcon direction={item.trend_direction} />
          <ChevronRight className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// ScoreHistogram — visual distribution of scores across 5 bands
// Editorial histogram with tier colors; taller bar = more institutions
// ---------------------------------------------------------------------------

interface HistogramBand {
  min: number
  max: number
  count: number
  tierKey: TierKey
}

function ScoreHistogram({
  distribution,
  total,
  median,
}: {
  distribution: Record<string, number>
  total: number
  median: number
}) {
  const { t } = useTranslation('institutionleague')
  const getTier = useTierByKey()

  // Map 10-letter grades → 5 tier bands (each band = 20 points of score)
  // Excelente=80–100, Satisfactorio=60–80, Regular=40–60, Deficiente=20–40, Critico=0–20
  const bands: HistogramBand[] = useMemo(() => {
    const mk = (min: number, max: number, tierKey: TierKey): HistogramBand => {
      const grades = TIER_GRADE_MAP[tierKey]
      const count = grades.reduce((s, g) => s + (distribution[g] ?? 0), 0)
      return { min, max, count, tierKey }
    }
    return [
      mk(0, 20, 'Critico'),
      mk(20, 40, 'Deficiente'),
      mk(40, 60, 'Regular'),
      mk(60, 80, 'Satisfactorio'),
      mk(80, 100, 'Excelente'),
    ]
  }, [distribution])

  const maxCount = Math.max(...bands.map(b => b.count), 1)

  // Position of median marker on 0–100 axis, in percent
  const medianPct = Math.max(0, Math.min(100, median))

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
          {t('histogram.kicker')}
        </p>
        <h3 className="text-lg font-serif font-bold text-text-primary leading-tight">
          {t('histogram.headline', { total: formatNumber(total) })}
        </h3>
        <p className="text-text-muted text-xs mt-1 italic">
          {t('histogram.sub', { median: median.toFixed(1) })}
        </p>
      </div>

      {/* Histogram: 5 bars, shared baseline, fixed height 160px */}
      <div
        className="relative rounded-sm border border-border bg-background/50 p-5"
        role="img"
        aria-label={t('histogram.ariaLabel')}
      >
        <div className="grid grid-cols-5 gap-3 h-[180px] items-end">
          {bands.map((band) => {
            const tier = getTier(band.tierKey)
            const heightPct = Math.max(band.count > 0 ? 6 : 0, (band.count / maxCount) * 100)
            const bandPct = total > 0 ? ((band.count / total) * 100) : 0
            return (
              <div key={band.tierKey} className="flex flex-col items-center justify-end h-full gap-1.5">
                {/* count label above bar */}
                <div className="flex flex-col items-center">
                  <span className="text-lg font-mono font-bold tabular-nums leading-none" style={{ color: tier.color }}>
                    {formatNumber(band.count)}
                  </span>
                  <span className="text-[9px] text-text-muted font-mono tabular-nums leading-tight mt-0.5">
                    {bandPct.toFixed(1)}%
                  </span>
                </div>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${heightPct}%`,
                    background: `linear-gradient(to top, ${tier.color}, ${tier.color}cc)`,
                    minHeight: band.count > 0 ? '8px' : '0',
                    boxShadow: `0 0 20px ${tier.color}22`,
                  }}
                  title={`${tier.label}: ${band.count}`}
                />
              </div>
            )
          })}
        </div>

        {/* X-axis labels: score ranges + tier names */}
        <div className="grid grid-cols-5 gap-3 mt-3 pt-3 border-t border-border">
          {bands.map((band) => {
            const tier = getTier(band.tierKey)
            return (
              <div key={band.tierKey} className="flex flex-col items-center gap-0.5 text-center">
                <span className="text-[10px] font-mono font-bold tabular-nums text-text-secondary">
                  {t('histogram.bandLabel', { min: band.min, max: band.max })}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wide truncate w-full" style={{ color: tier.color }}>
                  {tier.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Median marker line across the chart */}
        <div
          className="absolute top-5 bottom-14 border-l border-dashed border-risk-high/60 pointer-events-none"
          style={{ left: `calc(${medianPct}% * 0.9 + 5%)` }}
          aria-hidden="true"
        >
          <span className="absolute -top-1 -translate-x-1/2 text-[9px] font-mono font-bold uppercase tracking-wide bg-amber-500/20 text-risk-high px-1.5 py-0.5 rounded whitespace-nowrap">
            Median {median.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PillarRadar — SVG spider/radar for the 5 pillars. Shown on row expand.
// ---------------------------------------------------------------------------

function PillarRadar({ item }: { item: InstitutionScorecardItem }) {
  const { t } = useTranslation('institutionleague')
  // Normalize each pillar to 0-1 based on its max
  const pillars = useMemo(() => [
    { label: t('pillarRadar.openness'), value: item.pillar_openness / 20 },
    { label: t('pillarRadar.price'), value: item.pillar_price / 25 },
    { label: t('pillarRadar.vendors'), value: item.pillar_vendors / 20 },
    { label: t('pillarRadar.process'), value: item.pillar_process / 15 },
    { label: t('pillarRadar.external'), value: item.pillar_external / 20 },
  ], [item, t])

  const size = 200
  const center = size / 2
  const radius = 72
  const labelRadius = 90

  // Compute polygon points
  const pts = pillars.map((p, i) => {
    const angle = (i * 2 * Math.PI) / pillars.length - Math.PI / 2
    const r = Math.max(0, Math.min(1, p.value)) * radius
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle), angle, value: p.value, label: p.label }
  })
  const labelPts = pillars.map((p, i) => {
    const angle = (i * 2 * Math.PI) / pillars.length - Math.PI / 2
    return { x: center + labelRadius * Math.cos(angle), y: center + labelRadius * Math.sin(angle), label: p.label, value: p.value }
  })

  const polyStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Rings at 25/50/75/100%
  const rings = [0.25, 0.5, 0.75, 1]

  const getTier = useTierInfo()
  const tier = getTier(item.grade)

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start justify-center py-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={t('pillarRadar.ariaLabel', { name: item.institution_name })}
      >
        {/* Rings */}
        {rings.map(r => (
          <circle
            key={r}
            cx={center}
            cy={center}
            r={radius * r}
            fill="none"
            stroke="var(--color-border-hover)"
            strokeWidth="0.5"
          />
        ))}
        {/* Axes */}
        {pillars.map((_, i) => {
          const angle = (i * 2 * Math.PI) / pillars.length - Math.PI / 2
          const x = center + radius * Math.cos(angle)
          const y = center + radius * Math.sin(angle)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="var(--color-border-hover)"
              strokeWidth="0.5"
            />
          )
        })}
        {/* Polygon */}
        <polygon
          points={polyStr}
          fill={tier.color}
          fillOpacity="0.25"
          stroke={tier.color}
          strokeWidth="1.5"
        />
        {/* Dots at each vertex */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={tier.color}
          />
        ))}
        {/* Labels */}
        {labelPts.map((p, i) => {
          const anchor = p.x < center - 5 ? 'end' : p.x > center + 5 ? 'start' : 'middle'
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="10"
              fontFamily="monospace"
              fill="var(--color-text-muted)"
              className="uppercase tracking-wide"
            >
              {p.label}
            </text>
          )
        })}
      </svg>

      {/* Numeric breakdown column */}
      <div className="flex flex-col gap-2 min-w-[160px]">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
          {t('pillarRadar.title')}
        </p>
        {[
          { label: t('pillarRadar.openness'), value: item.pillar_openness, max: 20 },
          { label: t('pillarRadar.price'), value: item.pillar_price, max: 25 },
          { label: t('pillarRadar.vendors'), value: item.pillar_vendors, max: 20 },
          { label: t('pillarRadar.process'), value: item.pillar_process, max: 15 },
          { label: t('pillarRadar.external'), value: item.pillar_external, max: 20 },
        ].map((p) => {
          const pct = (p.value / p.max) * 100
          const barColor = pct > 65 ? 'var(--color-text-muted)' : pct > 35 ? 'var(--color-risk-high)' : 'var(--color-risk-critical)'
          return (
            <div key={p.label} className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wide text-text-muted w-20">{p.label}</span>
              <DotBar
                value={pct}
                max={100}
                color={barColor}
                emptyColor="var(--color-background-elevated)"
                emptyStroke="var(--color-border-hover)"
                dots={20}
              />
              <span className="text-[10px] font-mono tabular-nums text-text-secondary w-10 text-right">
                {p.value.toFixed(0)}/{p.max}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sort header button
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  className = '',
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  className?: string
}) {
  const { t } = useTranslation('institutionleague')
  const active = sortKey === currentKey
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 hover:text-text-primary transition-colors ${active ? 'text-text-primary' : 'text-text-muted'} ${className}`}
      aria-label={t('sortAriaLabel', { label })}
    >
      <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase">{label}</span>
      {active ? (
        currentDir === 'desc' ? (
          <ArrowDown className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        ) : (
          <ArrowUp className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 flex-shrink-0 opacity-40" aria-hidden="true" />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InstitutionLeague() {
  const { t } = useTranslation('institutionleague')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const getTier = useTierInfo()
  const getTierByKey = useTierByKey()

  // Filter / sort state from URL
  const page = Number(searchParams.get('page') || 1)
  const sectorFilter = searchParams.get('sector') || ''
  const gradeFilter = searchParams.get('grade') || ''
  const search = searchParams.get('q') || ''
  const sortBy = (searchParams.get('sort') || 'total_score') as SortKey
  const sortOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
  // Federal-only toggle — defaults to true.
  // COMPRANET is a federal procurement registry, but a handful of state
  // institutions slip in. Including them skews the league because their
  // sample sizes are tiny and their procedures aren't directly comparable.
  // URL param `all=1` flips to "include state-level" for power users.
  const federalOnly = searchParams.get('all') !== '1'
  const PER_PAGE = 50

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams)
      Object.entries(updates).forEach(([k, v]) => {
        if (v === undefined || v === '') next.delete(k)
        else next.set(k, v)
      })
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const handleSort = (key: SortKey) => {
    if (key === sortBy) {
      updateParams({ order: sortOrder === 'desc' ? 'asc' : 'desc', page: '1' })
    } else {
      updateParams({ sort: key, order: 'desc', page: '1' })
    }
  }

  // Data fetching — every query is federal-aware so the headline numbers
  // (median, total_scored, top/worst) match the table population below.
  const { data: statsData } = useQuery<InstitutionStats>({
    queryKey: ['institution-scorecard-stats', federalOnly],
    queryFn: () => scorecardApi.getInstitutionStats({ federal_only: federalOnly }),
    staleTime: 10 * 60 * 1000,
  })

  const { data: listData, isLoading, isError } = useQuery<ScorecardListResponse>({
    queryKey: ['institution-scorecards', federalOnly, page, sectorFilter, gradeFilter, search, sortBy, sortOrder],
    queryFn: () =>
      scorecardApi.getInstitutions({
        page,
        per_page: PER_PAGE,
        sort_by: sortBy,
        order: sortOrder,
        grade: gradeFilter || undefined,
        sector: sectorFilter || undefined,
        search: search || undefined,
        federal_only: federalOnly,
      }),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  // Top 5 champions (first page, sorted by score desc, no filters)
  const { data: championsData } = useQuery<ScorecardListResponse>({
    queryKey: ['institution-scorecards-top5', federalOnly],
    queryFn: () =>
      scorecardApi.getInstitutions({ page: 1, per_page: 5, sort_by: 'total_score', order: 'desc', federal_only: federalOnly }),
    staleTime: 30 * 60 * 1000,
  })

  // Bottom 5 red flags (first page, sorted by score asc, no filters)
  const { data: redFlagsData } = useQuery<ScorecardListResponse>({
    queryKey: ['institution-scorecards-bottom5', federalOnly],
    queryFn: () =>
      scorecardApi.getInstitutions({ page: 1, per_page: 5, sort_by: 'total_score', order: 'asc', federal_only: federalOnly }),
    staleTime: 30 * 60 * 1000,
  })

  const championItems = championsData?.data ?? []
  const redFlagItems = redFlagsData?.data ?? []

  // Row expansion for pillar radar
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null)
  // Act III "Methodology" collapsible — closed by default to keep the page lean
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const items = listData?.data ?? []
  const total = listData?.total ?? 0
  const totalPages = listData?.total_pages ?? 1

  // Row rank calculation: rank of first item on current page
  const firstItemRank = (page - 1) * PER_PAGE + 1

  // Whether filters are active (don't show podium when filtered)
  const hasFilters = !!(sectorFilter || gradeFilter || search)

  // Editorial headline from stats
  const editorialHeadline = useMemo(() => {
    if (!statsData?.grade_distribution) return null
    const dist = statsData.grade_distribution
    const totalScored = statsData.total_scored
    const aboveB = (dist['S'] ?? 0) + (dist['A'] ?? 0) + (dist['B+'] ?? 0) + (dist['B'] ?? 0)
    const aboveBPct = totalScored > 0 ? ((aboveB / totalScored) * 100).toFixed(0) : '0'
    const failingCount = (dist['F'] ?? 0) + (dist['F-'] ?? 0)
    if (failingCount > 0) {
      return t('finding.critical', { pct: aboveBPct, failing: failingCount })
    }
    return t('finding.normal', { pct: aboveBPct, total: formatNumber(totalScored) })
  }, [statsData, t])

  const failingCount = useMemo(() => {
    if (!statsData?.grade_distribution) return 0
    return (statsData.grade_distribution['F'] ?? 0) + (statsData.grade_distribution['F-'] ?? 0)
  }, [statsData])

  const sectorOptions = useMemo(
    () => SECTORS.map((s) => ({ value: s.code, label: s.name })),
    [],
  )

  // Map current gradeFilter (backend grade value like "S") back to its tier name for display
  const activeTierName = useMemo(() => {
    if (!gradeFilter) return ''
    for (const [tierName, grades] of Object.entries(TIER_GRADE_MAP)) {
      if (grades.includes(gradeFilter)) return tierName
    }
    return ''
  }, [gradeFilter])

  const activeTab = searchParams.get('tab') || 'ranking'
  const setTab = (tab: string) => updateParams({ tab, page: undefined })

  if (activeTab === 'fichas') {
    return (
      <div className="min-h-screen bg-background text-text-primary">
        <TabBar activeTab={activeTab} setTab={setTab} />
        <ErrorBoundary fallback={null}>
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-text-muted text-sm">{t('loadingShort')}</div>}>
            <InstitutionScorecards />
          </Suspense>
        </ErrorBoundary>
      </div>
    )
  }

  if (activeTab === 'reporte') {
    return (
      <div className="min-h-screen bg-background text-text-primary">
        <TabBar activeTab={activeTab} setTab={setTab} />
        <ErrorBoundary fallback={null}>
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-text-muted text-sm">{t('loadingShort')}</div>}>
            <ReportCard />
          </Suspense>
        </ErrorBoundary>
      </div>
    )
  }

  const totalInstitutions = statsData?.total_scored ?? 0
  const highRiskInstitutions = failingCount

  return (
    <div id="main-content" className="min-h-screen bg-background text-text-primary">
      <TabBar activeTab={activeTab} setTab={setTab} />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pt-6">
        {/* Utility header — same pattern as /aria, /workspace, /cases,
            /sectors. Institution Ranking is a working surface
            (compare 100+ institutions, drill into one). */}
        <header className="mb-5 pb-4 border-b border-border">
          {/* Folio strip — archival eyebrow matching /aria, /atlas pattern.
              "Folio·VII" anchors this page in the broader RUBLI catalog;
              the ranking is a section of an ongoing accountability series,
              not a standalone tool. */}
          <div
            className="mb-3 flex items-center gap-3"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 400,
            }}
          >
            <span style={{ color: 'var(--color-accent)', fontStyle: 'italic', fontWeight: 500 }}>
              Folio·VII
            </span>
            <span style={{ width: 22, height: 1, background: 'rgba(160, 104, 32, 0.45)' }} />
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>
              {t('kicker')}
            </span>
            <span aria-hidden style={{ opacity: 0.5 }}>·</span>
            <span style={{ fontStyle: 'italic', fontWeight: 300 }}>{t('meta')}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div className="max-w-3xl">
              <h1
                className="text-text-primary"
                style={{
                  fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.012em',
                }}
              >
                {t('headline.before')}{' '}
                <span style={{ color: 'var(--color-accent)' }}>{t('headline.accent')}</span>
              </h1>
            </div>
          </div>
          {totalInstitutions > 0 && (
            <p className="text-xs text-text-muted mt-2 max-w-2xl">
              {t('lede', { total: formatNumber(totalInstitutions) })}
            </p>
          )}

          {/* Triptych — three large editorial stats with Playfair Italic
              numerals. Mirrors the ARIA queue / Dashboard rhythm: anchor
              stat (total evaluated), accountability stat (high-risk, in
              risk-critical color), reference stat (median). */}
          {!isLoading && (
            <div
              className="mt-5 grid grid-cols-3 gap-6 sm:gap-10 border-t border-border/60 pt-5"
              role="group"
              aria-label={t('statsAriaLabel')}
            >
              <div className="flex flex-col">
                <span
                  className="leading-none tabular-nums"
                  style={{
                    fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: 'clamp(36px, 5vw, 48px)',
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {formatNumber(totalInstitutions)}
                </span>
                <span className="mt-2 text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted">
                  {t('stats.evaluated')}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className="leading-none tabular-nums"
                  style={{
                    fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: 'clamp(36px, 5vw, 48px)',
                    color: 'var(--color-risk-critical)',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {formatNumber(highRiskInstitutions)}
                </span>
                <span
                  className="mt-2 text-[9px] font-mono uppercase tracking-[0.18em]"
                  style={{ color: 'var(--color-risk-critical)', opacity: 0.85 }}
                >
                  {t('stats.critical')}
                </span>
              </div>
              <div className="flex flex-col">
                <span
                  className="leading-none tabular-nums"
                  style={{
                    fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: 'clamp(36px, 5vw, 48px)',
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {statsData?.median_score?.toFixed(1) ?? '—'}
                </span>
                <span className="mt-2 text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted">
                  {t('stats.median')}
                </span>
              </div>
            </div>
          )}

          {/* Federal scope segmented control + disclaimer.
              Lifted out of the Act II filter row so it sits next to the
              Honor Roll / Red Flags it actually governs. State-level
              institutions have tiny sample sizes and incomparable
              procedures; including them puts state secretarías at the top
              of the league and buries the federal agencies that matter
              for reform (IMSS, ISSSTE, PEMEX, etc.). */}
          <div className="mt-4 pt-3 border-t border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
                  {t('scope.label')}
                </span>
                <div
                  role="radiogroup"
                  aria-label={t('scope.label')}
                  className="inline-flex rounded-sm border border-border bg-background overflow-hidden"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={federalOnly}
                    onClick={() => updateParams({ all: undefined, page: '1' })}
                    className={`px-3 py-1 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors ${
                      federalOnly
                        ? 'bg-accent/15 text-accent border-r border-border'
                        : 'text-text-muted hover:text-text-secondary border-r border-border'
                    }`}
                  >
                    {t('scope.federalOnly')}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!federalOnly}
                    onClick={() => updateParams({ all: '1', page: '1' })}
                    className={`px-3 py-1 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors ${
                      !federalOnly
                        ? 'bg-accent/15 text-accent'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {t('scope.all')}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[10px] font-mono leading-relaxed text-text-muted mt-2 max-w-3xl">
              {federalOnly ? t('scope.disclaimerFederal') : t('scope.disclaimerAll')}
            </p>
          </div>
        </header>
      {/* Editorial finding — clean left-bordered callout, no decorative icon.
          The verdict is editorial, not ornamental. Border + kicker carry the
          accountability tone; the sentence is the story. */}
      {editorialHeadline && (
        <div
          className="mb-6 pl-5 py-1"
          style={{
            borderLeft: `3px solid ${
              failingCount > 0
                ? 'var(--color-risk-critical)'
                : 'var(--color-accent)'
            }`,
          }}
        >
          <p
            className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] mb-1.5"
            style={{
              color: failingCount > 0
                ? 'var(--color-risk-critical)'
                : 'var(--color-accent)',
            }}
          >
            {t('hallazgo')}
          </p>
          <p
            className="text-text-primary leading-snug max-w-3xl"
            style={{
              fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(17px, 1.6vw, 21px)',
              letterSpacing: '-0.005em',
            }}
          >
            {editorialHeadline}
          </p>
        </div>
      )}

      <div className="space-y-10"><Act number="I" label={t('acts.one')}>

      <div className="space-y-8">

        {/* ─── ACT I — THE VERDICT ──────────────────────────────────────────
            Red Flags lead (dominant grid). Bright Spots is a quieter
            counterweight that follows. Editorial logic: this is an
            anti-corruption platform, the worst offenders are the lead.
            Stats triptych moved to the page header (already there). The
            distribution-bar / histogram are demoted to Act III. */}

        {/* Red Flags — DOMINANT verdict cards */}
        {!hasFilters && redFlagItems.length >= 3 && (
          <section aria-labelledby="redflags-heading" className="space-y-4">
            <div className="border-l-2 border-risk-critical pl-4">
              <p className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-risk-critical mb-1 flex items-center gap-2">
                <Flag className="h-3 w-3" aria-hidden="true" />
                {t('redFlags.kicker')}
              </p>
              <h2
                id="redflags-heading"
                className="text-2xl sm:text-3xl font-serif font-bold text-text-primary leading-tight"
                style={{ fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif', fontStyle: 'italic', fontWeight: 500 }}
              >
                {t('redFlags.headline')}
              </h2>
              <p className="text-text-secondary text-sm mt-2 italic max-w-2xl">
                {t('redFlags.sub')}
              </p>
            </div>
            <div className="space-y-1">
              {redFlagItems.slice(0, 5).map((item, idx) => (
                <RedFlagCard
                  key={item.institution_id}
                  rank={idx + 1}
                  item={item}
                  onNavigate={(id) => navigate(`/institutions/${id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Bright Spots — quieter counterweight, demoted below Red Flags.
            Rendered as a flat list (one institution per row) rather than a
            card grid: the Red Flags are the story, the champions are the
            footnote. */}
        {!hasFilters && championItems.length >= 3 && (
          <section aria-labelledby="champions-heading" className="space-y-3 pt-2">
            <div className="border-l border-border pl-4">
              <p className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-text-muted mb-1 flex items-center gap-2">
                <Trophy className="h-3 w-3" aria-hidden="true" />
                {t('champions.kicker')}
              </p>
              <h2
                id="champions-heading"
                className="text-lg font-serif font-bold text-text-secondary leading-tight"
              >
                {t('champions.headline')}
              </h2>
            </div>
            <div
              className="rounded-sm border border-border/60 bg-background-elevated/20 divide-y divide-border/40"
              role="list"
            >
              {championItems.slice(0, 5).map((item, idx) => (
                <ChampionCard
                  key={item.institution_id}
                  rank={idx + 1}
                  item={item}
                  onNavigate={(id) => navigate(`/institutions/${id}`)}
                />
              ))}
            </div>
          </section>
        )}

        </div>
      </Act>

      <Act number="II" label={t('acts.two')}>
      <div className="space-y-5">

        {/* ─── ACT II — THE LEAGUE ──────────────────────────────────────────
            Editorial filter pills replace generic dropdowns. Tier pills
            communicate the 5-tier system visually; sector pills surface
            all 12 sector colors at a glance. Search input full-width
            below. Result count anchors the table headline. */}

        {/* Search input — full-width above the pill rows */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <label htmlFor="league-search" className="sr-only">{t('filters.search')}</label>
            <input
              id="league-search"
              type="search"
              value={search}
              onChange={(e) => updateParams({ q: e.target.value || undefined, page: '1' })}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 font-mono"
            />
          </div>
          <span className="text-text-muted text-[10px] font-mono tabular-nums tracking-wide flex-shrink-0">
            {t('filters.results', { num: formatNumber(total) })}
          </span>
        </div>

        {/* Tier filter pills — horizontal scroll on narrow widths */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
            {t('filters.tier')}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => updateParams({ grade: undefined, page: '1' })}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-mono uppercase tracking-[0.08em] transition-colors whitespace-nowrap ${
                !activeTierName
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'border-border bg-background text-text-muted hover:text-text-secondary hover:border-border-hover'
              }`}
            >
              {t('filters.allTiers')}
            </button>
            {TIER_NAMES.map((tierName) => {
              const tier = getTierByKey(tierName)
              const isActive = activeTierName === tierName
              return (
                <button
                  key={tierName}
                  type="button"
                  onClick={() => {
                    const grades = TIER_GRADE_MAP[tierName]
                    const gradeVal = grades ? grades[0] : undefined
                    updateParams({ grade: gradeVal || undefined, page: '1' })
                  }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-mono uppercase tracking-[0.08em] transition-all whitespace-nowrap flex items-center gap-1.5"
                  style={{
                    borderColor: isActive ? tier.color : 'var(--color-border)',
                    backgroundColor: isActive ? `${tier.color}1f` : 'transparent',
                    color: isActive ? tier.color : 'var(--color-text-muted)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tier.color }}
                  />
                  {tier.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sector filter pills — all 12 sectors with their canonical colors */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
            {t('filters.sectorLabel')}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => updateParams({ sector: undefined, page: '1' })}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-mono uppercase tracking-[0.08em] transition-colors whitespace-nowrap ${
                !sectorFilter
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'border-border bg-background text-text-muted hover:text-text-secondary hover:border-border-hover'
              }`}
            >
              {t('filters.allSectors')}
            </button>
            {sectorOptions.map((s) => {
              const isActive = sectorFilter === s.value
              const color = SECTOR_COLORS[s.value] ?? SECTOR_COLORS.otros
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => updateParams({ sector: isActive ? undefined : s.value, page: '1' })}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-mono uppercase tracking-[0.08em] transition-all whitespace-nowrap flex items-center gap-1.5"
                  style={{
                    borderColor: isActive ? color : 'var(--color-border)',
                    backgroundColor: isActive ? `${color}1f` : 'transparent',
                    color: isActive ? color : 'var(--color-text-muted)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table */}
        <section aria-labelledby="league-table-heading" className="space-y-3 pt-2">
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-text-muted mb-1">
              {t('tableKicker')}
            </p>
            <h2 id="league-table-heading" className="text-lg font-serif font-bold text-text-primary leading-tight">
              {t('tableHeadline', { total: formatNumber(total) })}
            </h2>
          </div>

          {isError && (
            <div className="flex items-center gap-3 p-4 rounded-sm bg-risk-critical/10/40 border border-red-800/40 text-risk-critical text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {t('error')}
            </div>
          )}

          {isLoading && !items.length && (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-background-elevated rounded animate-pulse"
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <div className="rounded-sm border border-border bg-background/50 p-8 text-center" role="status" aria-live="polite">
              <p className="text-text-secondary text-sm">{t('empty')}</p>
              <p className="text-text-muted text-xs mt-1">
                {t('filters.adjustFilters')}
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-x-auto rounded-sm border border-border">
              <table className="w-full text-sm min-w-[900px]" role="grid" aria-label={t('tableAriaLabel')}>
                <thead>
                  <tr className="border-b border-border bg-background/80">
                    <th className="px-2 py-2 text-left w-12">
                      <span className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-[0.12em]">
                        #
                      </span>
                    </th>
                    <th className="px-2 py-2 text-left">
                      <SortHeader
                        label={t('columns.institution')}
                        sortKey="institution_name"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-2 py-2 text-left w-24">
                      <SortHeader
                        label={t('columns.score')}
                        sortKey="total_score"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                    <th className="px-2 py-2 text-center w-24">
                      <span className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-[0.12em]">
                        {t('columns.grade')}
                      </span>
                    </th>
                    <th className="px-2 py-2 text-left hidden sm:table-cell w-28" title="O=Openness · P=Price · V=Vendors · R=Process · E=External">
                      <span className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-[0.12em]">
                        {t('columns.pillars')} <span className="opacity-50 normal-case">O P V R E</span>
                      </span>
                    </th>
                    <th className="px-2 py-2 text-center w-12 hidden sm:table-cell">
                      <span className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-[0.12em]">
                        {t('columns.trend')}
                      </span>
                    </th>
                    <th className="px-2 py-2 text-left hidden md:table-cell w-24">
                      <SortHeader
                        label={t('columns.percentile')}
                        sortKey="national_percentile"
                        currentKey={sortBy}
                        currentDir={sortOrder}
                        onSort={handleSort}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rank = firstItemRank + idx
                    const tier = getTier(item.grade)
                    // Worst performers: bottom 5 when sorted by score ascending
                    const isWorstPerformer = sortBy === 'total_score' && sortOrder === 'asc' && idx < 5
                    // Top 3 medals (only visible when sorted by score descending on first page)
                    const isTopMedalist = sortBy === 'total_score' && sortOrder === 'desc' && rank <= 3
                    // Critico tier always reads as dominant — red wash on the
                    // row, thicker left border, stronger left-border weight.
                    // This is the editorial promise: a reader scrolling past
                    // a Critico row cannot miss it.
                    const isCritico = item.grade === 'F' || item.grade === 'F-'
                    const rankColor = isTopMedalist
                      ? (rank === 1 ? '#facc15' : rank === 2 ? '#d4d4d8' : '#d97706')
                      : isWorstPerformer || isCritico
                        ? '#dc2626'
                        : tier.color
                    const isExpanded = expandedRowId === item.institution_id
                    const toggleExpand = (e: React.MouseEvent) => {
                      e.stopPropagation()
                      setExpandedRowId(isExpanded ? null : item.institution_id)
                    }
                    return (
                      <React.Fragment key={item.institution_id}>
                      <tr
                        className={`border-b border-border hover:bg-background-elevated transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px] ${
                          isWorstPerformer || isCritico ? 'bg-risk-critical/10' : ''
                        } ${isExpanded ? 'bg-background-elevated' : ''}`}
                        onClick={() => navigate(`/institutions/${item.institution_id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/institutions/${item.institution_id}`)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={t('rowAriaLabel', { rank, name: item.institution_name, score: item.total_score, tier: tier.label })}
                        style={{
                          borderLeft: `${isCritico ? '4px' : '3px'} solid ${tier.color}`,
                          height: '44px',
                        }}
                      >
                        {/* Rank — compact mono, ARIA-style */}
                        <td className="px-2 py-0 font-mono tabular-nums text-right w-12 align-middle">
                          <div className="flex items-center justify-end gap-1">
                            {isTopMedalist && (
                              <Crown
                                className="h-3 w-3 flex-shrink-0"
                                style={{ color: rankColor }}
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className="text-[13px] font-mono font-bold leading-none tabular-nums"
                              style={{ color: rankColor, opacity: isWorstPerformer || isTopMedalist ? 1 : 0.65 }}
                            >
                              {rank}
                            </span>
                          </div>
                          {isWorstPerformer && (
                            <div className="mt-0.5 text-[7px] font-mono font-bold uppercase tracking-[0.12em] text-risk-critical whitespace-nowrap leading-none">
                              {t('worstPerformerBadge')}
                            </div>
                          )}
                        </td>

                        {/* Sector color dot + institution name + sector label
                            + risk-driver pill — all on one line. The dot is
                            the sector-palette accent (SECTOR_COLORS), the
                            tier color stays on the left border. */}
                        <td className="px-2 py-0 align-middle">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={toggleExpand}
                              className="flex-shrink-0 p-0.5 rounded hover:bg-background-elevated text-text-muted hover:text-text-secondary transition-colors"
                              aria-label={isExpanded ? t('collapseRow') : t('expandRow')}
                              aria-expanded={isExpanded}
                            >
                              <ChevronDown
                                className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                aria-hidden="true"
                              />
                            </button>
                            <span
                              aria-hidden="true"
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: getSectorColorFromName(item.sector_name) }}
                              title={item.sector_name ?? ''}
                            />
                            <span
                              className="text-[13px] text-text-secondary group-hover:text-text-primary transition-colors font-medium truncate"
                              title={item.institution_name}
                            >
                              {item.institution_name}
                            </span>
                            {item.sector_name && (
                              <span className="text-text-muted text-[9px] font-mono uppercase tracking-[0.1em] flex-shrink-0 hidden lg:inline">
                                · {item.sector_name}
                              </span>
                            )}
                            {item.top_risk_driver && (
                              <span className="flex-shrink-0 hidden xl:inline">
                                <RiskDriverPill driver={item.top_risk_driver} />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Score — secondary numeric, demoted from primary
                            anchor. The tier label below is now the
                            editorial verdict; the score is the supporting
                            measurement. */}
                        <td className="px-2 py-0 align-middle">
                          <div className="flex items-baseline gap-1">
                            <span
                              className="text-[14px] font-mono tabular-nums leading-none"
                              style={{ color: tier.color, fontWeight: isCritico ? 700 : 600, opacity: isCritico ? 1 : 0.85 }}
                            >
                              {item.total_score.toFixed(1)}
                            </span>
                            <span className="text-text-muted text-[9px] font-mono">/100</span>
                          </div>
                        </td>

                        {/* Tier — now the primary editorial verdict. Rendered
                            as a bold mono label, not a small pill. Critico
                            gets the dominant red-bar treatment to match the
                            row tint. */}
                        <td className="px-2 py-0 text-center align-middle">
                          <div
                            className="inline-flex flex-col items-center justify-center px-2 py-1 rounded-sm"
                            style={{
                              backgroundColor: tier.bg,
                              border: `1px solid ${tier.border}`,
                              minWidth: '92px',
                            }}
                          >
                            <span
                              className="font-mono uppercase tabular-nums leading-none"
                              style={{
                                color: tier.color,
                                fontSize: isCritico ? '11px' : '10px',
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                              }}
                            >
                              {tier.label}
                            </span>
                          </div>
                        </td>

                        {/* Pillar sparkbars — denser */}
                        <td className="px-2 py-0 hidden sm:table-cell align-middle">
                          <PillarSparkBars item={item} />
                        </td>

                        {/* Trend icon */}
                        <td className="px-2 py-0 text-center hidden sm:table-cell align-middle">
                          <TrendIcon direction={item.trend_direction} />
                        </td>

                        {/* National percentile */}
                        <td className="px-2 py-0 hidden md:table-cell align-middle">
                          <span className="text-text-secondary text-[11px] font-mono tabular-nums">
                            {item.national_percentile !== null
                              ? t('percentileLabel', { n: Math.round(item.national_percentile * 100) })
                              : '--'}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr
                          className="border-b border-border bg-background/60"
                          style={{ borderLeft: `3px solid ${tier.color}` }}
                        >
                          <td colSpan={7} className="px-5 py-4">
                            <PillarRadar item={item} />
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="flex items-center justify-between mt-4"
              aria-label={t('pagination.ariaLabel')}
            >
              <button
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-background border border-border text-text-secondary text-sm hover:bg-background-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('pagination.previousAriaLabel')}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {t('pagination.previous')}
              </button>
              <span className="text-text-muted text-sm font-mono tabular-nums">
                {t('pagination.pageOf', { page, total: totalPages })}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-background border border-border text-text-secondary text-sm hover:bg-background-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('pagination.nextAriaLabel')}
              >
                {t('pagination.next')}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>

      </div>
      </Act>

      {/* ─── ACT III — METHODOLOGY ────────────────────────────────────────
          Collapsible (closed by default) — holds the distribution and
          histogram, which used to break Act I's editorial rhythm. */}
      <section
        aria-labelledby="methodology-heading"
        className="border-t border-border pt-6 mt-2"
      >
        <button
          type="button"
          onClick={() => setMethodologyOpen((v) => !v)}
          aria-expanded={methodologyOpen}
          className="w-full flex items-center justify-between gap-3 text-left group"
        >
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-text-muted mb-1">
              ACT III
            </p>
            <h2
              id="methodology-heading"
              className="text-lg font-serif font-bold text-text-primary leading-tight group-hover:text-accent transition-colors"
            >
              {t('histogram.kicker')}
            </h2>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-text-muted flex-shrink-0 transition-transform ${methodologyOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {methodologyOpen && (
          <div className="space-y-6 mt-5">
            {/* Tier distribution dot strip */}
            {statsData?.grade_distribution && (
              <div className="bg-background border border-border rounded-sm px-5 py-4">
                <TierDistributionBar distribution={statsData.grade_distribution} />
              </div>
            )}

            {/* Score Distribution Histogram */}
            {statsData?.grade_distribution && (
              <ScoreHistogram
                distribution={statsData.grade_distribution}
                total={statsData.total_scored}
                median={statsData.median_score}
              />
            )}

            {/* Source footnote */}
            <p className="text-[10px] text-text-muted font-mono pt-4 border-t border-border">
              {t('methodologyFootnote')}
            </p>
          </div>
        )}
      </section>
      </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab bar — shared between ranking/fichas/reporte views
// ---------------------------------------------------------------------------

function TabBar({ activeTab, setTab }: { activeTab: string; setTab: (tab: string) => void }) {
  const { t } = useTranslation('institutionleague')
  const tabs = [
    { id: 'ranking', label: t('tabs.ranking') },
    { id: 'fichas',  label: t('tabs.fichas') },
    { id: 'reporte', label: t('tabs.reporte') },
  ]
  return (
    <div className="border-b border-border bg-background/50 px-4 sm:px-6">
      <div className="max-w-screen-xl mx-auto flex items-center gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

