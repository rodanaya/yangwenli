/**
 * RedThread — Scroll-driven Investigation Narrative
 *
 * Transforms a vendor's risk data into a structured journalistic briefing.
 * Six chapters, scroll-driven, with a literal crimson thread running down
 * the left margin that grows as the investigator reads deeper.
 *
 * Entry points:
 *   - ARIA queue: "Investigate" button on each Tier 1/2 lead
 *   - VendorProfile: "Build Investigation Thread" in header
 *   - Direct link: /thread/:vendorId
 *
 * Uses zero new backend endpoints — all data from existing APIs.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { motion, useScroll, useInView } from 'framer-motion'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { vendorApi, ariaApi, networkApi } from '@/api/client'
import { cn, formatCompactMXN, formatNumber, getRiskLevel } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'
import { formatVendorName } from '@/lib/vendor/formatName'
import {
  ArrowLeft,
  ExternalLink,
  Download,
  BookmarkPlus,
  AlertTriangle,
  Building2,
  GitBranch,
  DollarSign,
  Gavel,
  FileText,
  Clock,
  Zap,
  Shield,
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────

const CHAPTER_IDS = ['subject', 'timeline', 'pattern', 'network', 'money', 'verdict'] as const
type ChapterId = typeof CHAPTER_IDS[number]

const CHAPTER_ICONS: Record<ChapterId, React.ElementType> = {
  subject:  Building2,
  timeline: Clock,
  pattern:  AlertTriangle,
  network:  GitBranch,
  money:    DollarSign,
  verdict:  Gavel,
}

// Pattern palette — mapped to canonical design tokens (bible §2). No invented
// 7-color palette: we reuse risk + sector tokens so pattern chips read as part
// of the editorial system.
//   P1 Monopoly       → risk-critical (structural, severe)
//   P2 Ghost companies → risk-critical (worst signal)
//   P3 Intermediary   → risk-high
//   P4 Splitting      → risk-high
//   P5 Overpricing    → accent-data (evidence, numeric)
//   P6 Capture        → accent (gold — institutional)
//   P7 Misc           → sector-hacienda (green treasury — neutral)
function getPatternMeta(t: TFunction): Record<string, { label: string; color: string; bg: string; description: string }> {
  return {
    P1: { label: t('patterns.P1.label'), color: 'var(--color-risk-critical)',       bg: 'rgba(239,68,68,0.10)',   description: t('patterns.P1.description') },
    P2: { label: t('patterns.P2.label'), color: 'var(--color-risk-critical)',       bg: 'rgba(239,68,68,0.10)',   description: t('patterns.P2.description') },
    P3: { label: t('patterns.P3.label'), color: 'var(--color-risk-high)',           bg: 'rgba(245,158,11,0.10)',  description: t('patterns.P3.description') },
    P4: { label: t('patterns.P4.label'), color: 'var(--color-risk-high)',           bg: 'rgba(245,158,11,0.10)',  description: t('patterns.P4.description') },
    P5: { label: t('patterns.P5.label'), color: 'var(--color-accent-data)',         bg: 'rgba(37,99,235,0.10)',   description: t('patterns.P5.description') },
    P6: { label: t('patterns.P6.label'), color: 'var(--color-accent)',              bg: 'rgba(160,104,32,0.10)',  description: t('patterns.P6.description') },
    P7: { label: t('patterns.P7.label'), color: 'var(--color-sector-hacienda)',     bg: 'rgba(22,163,74,0.10)',   description: t('patterns.P7.description') },
  }
}

const RISK_DOT_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high:     'var(--color-risk-high)',
  medium:   'var(--color-risk-medium)',
  low:      'var(--color-text-muted)',
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ChapterLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="editorial-label text-[var(--color-accent)] mb-4 tracking-[0.18em]">
      {children}
    </h2>
  )
}

/**
 * RedThreadChapter — editorial chapter header primitive.
 * Replaces the copy-pasted (ChapterLabel + h2.font-serif) pairing that was
 * duplicated across 5 chapters. Use `label` for the gold kicker and `title`
 * for the serif headline. Optional `id` enables anchor scrolling.
 */
function RedThreadChapter({ label, title, id }: { label: string; title: React.ReactNode; id?: string }) {
  return (
    <header id={id}>
      <ChapterLabel>{label}</ChapterLabel>
      <h2 className="font-serif text-xl font-bold text-text-primary mb-3" style={{ fontFamily: 'var(--font-family-serif)' }}>
        {title}
      </h2>
    </header>
  )
}

function ChapterDivider() {
  return (
    <div className="flex items-center gap-4 my-8">
      <div className="h-px flex-1 bg-background-elevated" />
      <div className="w-1 h-1 rounded-full bg-[var(--color-accent)] opacity-60" />
      <div className="h-px flex-1 bg-background-elevated" />
    </div>
  )
}

/**
 * RedThreadShell — chapter rhythm primitive (Phase 1 redesign).
 * Every chapter conforms to ≤640px total height: header + 280px viz + support.
 * Eliminates the inconsistent py-10/py-12 + max-w-4xl/3xl drift across chapters.
 */
function ChapterShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-8 px-4 sm:px-8 max-w-4xl mx-auto">
      {children}
    </section>
  )
}

/**
 * StakesPullquote — a single-line italic equivalence that translates raw
 * MXN into a public-finance comparison the reader can feel. Renders inline
 * in Chapter I to anchor scale before any chart is shown.
 */
function StakesPullquote({ totalMxn }: { totalMxn: number }) {
  // Calibrated 2025 MXN equivalents (rough public-budget references)
  const equivalents: Array<{ threshold: number; phrase: (mxn: number) => string }> = [
    { threshold: 500_000_000_000, phrase: (m) => `≈ ${(m / 138_000_000_000).toFixed(1)}× Mexico's annual federal Defense budget` },
    { threshold: 100_000_000_000, phrase: (m) => `≈ ${(m / 4_200_000_000).toFixed(0)} years of IMSS pediatric oncology funding` },
    { threshold: 10_000_000_000,  phrase: (m) => `≈ ${(m / 800_000_000).toFixed(0)} new federal hospitals` },
    { threshold: 1_000_000_000,   phrase: (m) => `≈ ${(m / 30_000_000).toFixed(0)} km of federal highway` },
    { threshold: 100_000_000,     phrase: (m) => `≈ ${(m / 800_000).toFixed(0)} school classrooms` },
  ]
  const match = equivalents.find((e) => totalMxn >= e.threshold)
  if (!match) return null
  return (
    <p
      className="text-text-secondary italic mb-6 max-w-2xl"
      style={{
        fontFamily: 'var(--font-family-serif)',
        fontSize: '0.95rem',
        lineHeight: 1.55,
        borderLeft: '2px solid var(--color-accent)',
        paddingLeft: '0.85rem',
      }}
    >
      {match.phrase(totalMxn)}
    </p>
  )
}

// ─── Chapter 1: The Subject ─────────────────────────────────────────────────

function ChapterSubject({ vendor, aria, t }: {
  vendor: { name: string; total_value_mxn: number; total_contracts: number; primary_sector_name?: string; avg_risk_score?: number; first_contract_year?: number; last_contract_year?: number; high_risk_pct: number; direct_award_pct: number }
  aria: { ips_final: number; ips_tier: number; primary_sector_name?: string | null } | null
  t: TFunction
}) {
  // Fallback to ARIA sector when vendor object has no primary_sector_name
  const sectorName = vendor.primary_sector_name ?? aria?.primary_sector_name ?? null
  const sectorColor = sectorName
    ? SECTOR_COLORS[sectorName.toLowerCase()] ?? '#dc2626'
    : '#dc2626'

  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_DOT_COLORS[riskLevel]

  return (
    <ChapterShell id="chapter-subject">
      <ChapterLabel>{t('chapters.headings.subject')}</ChapterLabel>

      {/* Tightened from 56px serif headline + bouncing scroll-hint chevron
          per the user's "resumen ejecutivo... laughable" feedback. The
          chapter still names the vendor + tags, but at investigative-tool
          scale, not magazine-cover scale. */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="font-serif font-bold text-text-primary leading-[1.1] mb-4"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontSize: 'clamp(1.5rem, 2.6vw, 2rem)',
          letterSpacing: '-0.02em',
        }}
        title={vendor.name}
      >
        {formatVendorName(vendor.name, 70)}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-wrap items-center gap-1.5 mb-6"
      >
        {sectorName && (
          <span
            className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.12em]"
            style={{ backgroundColor: sectorColor + '14', color: sectorColor, border: `1px solid ${sectorColor}33` }}
          >
            {sectorName}
          </span>
        )}
        <span
          className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.12em]"
          style={{ backgroundColor: riskColor + '14', color: riskColor, border: `1px solid ${riskColor}33` }}
        >
          {t('subject.riskBadge', { level: riskLevel })}
        </span>
        {aria && (
          <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.12em] bg-[color:var(--color-risk-critical)]/10 text-[color:var(--color-risk-critical)] border border-[color:var(--color-risk-critical)]/30">
            {t('subject.ariaTier', { tier: aria.ips_tier })}
          </span>
        )}
      </motion.div>

      {/* Key stats — tighter cards, smaller anchor numbers, more density. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6"
      >
        {[
          {
            label: t('kpi.totalValue'),
            value: formatCompactMXN(vendor.total_value_mxn),
            note: t('notes.allContracts'),
          },
          {
            label: t('kpi.contracts'),
            value: formatNumber(vendor.total_contracts),
            note: `${vendor.first_contract_year ?? '?'} – ${vendor.last_contract_year ?? '?'}`,
          },
          {
            label: t('kpi.directAwards'),
            value: `${Math.round(vendor.direct_award_pct)}%`,
            note: t('notes.vsNational'),
          },
          {
            label: t('kpi.highRisk'),
            value: `${Math.round(vendor.high_risk_pct)}%`,
            note: t('notes.oecdBenchmark'),
          },
        ].map((s) => (
          <div key={s.label} className="bg-background-card border border-border rounded-sm px-3 py-2.5">
            <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mb-1">{s.label}</p>
            <p className="text-lg font-bold text-text-primary font-mono tabular-nums leading-none">{s.value}</p>
            <p className="text-[10px] text-text-muted mt-1.5 leading-tight">{s.note}</p>
          </div>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-text-muted text-sm leading-relaxed max-w-2xl mb-4"
        // introText uses {{name}} placeholder — vendor.name is escaped to prevent XSS
        dangerouslySetInnerHTML={{
          __html: t('subject.introText', {
            name: `<strong class="text-text-primary">${formatVendorName(vendor.name, 60)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')}</strong>`,
          }),
        }}
      />

      {/* Stakes pullquote — translates raw MXN into a public-finance
          equivalence the reader can feel before any chart is shown. */}
      <StakesPullquote totalMxn={vendor.total_value_mxn} />
    </ChapterShell>
  )
}

// ─── Chapter 2: The Timeline ────────────────────────────────────────────────

type TimelineItem = { year: number; avg_risk_score: number | null; contract_count: number; total_value: number }
type EraBucket = 'stable' | 'watch' | 'alert'

const ERA_BG: Record<EraBucket, string> = {
  stable: 'rgba(160,104,32,0.04)',
  watch:  'rgba(245,158,11,0.08)',
  alert:  'rgba(220,38,38,0.10)',
}

const ERA_LABEL_COLOR: Record<EraBucket, string> = {
  stable: 'var(--color-text-muted)',
  watch:  'var(--color-risk-medium)',
  alert:  'var(--color-risk-critical)',
}

function bucketOfRisk(r: number): EraBucket {
  if (r >= 0.5) return 'alert'
  if (r >= 0.25) return 'watch'
  return 'stable'
}

/**
 * TimelineSkyline — single-canvas chronology. Replaces the prior
 * dot-strip + year-box duplication with one SVG that surfaces THREE
 * things at once: chronology (bar X-position), value (bar height,
 * log scale), and risk (bar color + auto-detected era backgrounds).
 *
 * Innovation:
 *   • ERA SEGMENTATION — running-bucket partitioning of the timeline
 *     into stable / watch / alert eras, rendered as faint background
 *     bands with type labels overhead. Surfaces "regime change" as
 *     visual structure, not an inferred reading.
 *   • HERO CALLOUT — argmax(value × risk) gets a flag floating above
 *     its bar with year / value / risk / contract count inline.
 *   • SINGLE CANVAS — bars replace both dots and year-cards. Numerical
 *     detail surfaces via tooltip (mouseover) or via the hero flag for
 *     the year that matters most.
 */
function TimelineSkyline({
  timeline,
  eraLabels,
  className,
}: {
  timeline: TimelineItem[]
  eraLabels: { stable: string; watch: string; alert: string }
  className?: string
}) {
  if (timeline.length === 0) return null

  const sorted = [...timeline].sort((a, b) => a.year - b.year)
  const minYear = sorted[0].year
  const maxYear = sorted[sorted.length - 1].year
  const yearSpan = Math.max(1, maxYear - minYear)
  const maxValue = Math.max(...sorted.map((t) => t.total_value), 1)
  const logMax = Math.log(maxValue + 1)

  // Hero year — argmax(value × risk). Falls back to argmax(value) if
  // every year has zero risk (defensive — shouldn't happen for ARIA leads).
  const hero = sorted.reduce((max, item) => {
    const score = item.total_value * (item.avg_risk_score ?? 0)
    const maxScore = max.total_value * (max.avg_risk_score ?? 0)
    return score > maxScore ? item : max
  }, sorted[0])

  // Era partitioning — greedy run-length over risk bucket
  type Era = { startYear: number; endYear: number; bucket: EraBucket; n: number; totalValue: number }
  const eras: Era[] = []
  for (const item of sorted) {
    const b = bucketOfRisk(item.avg_risk_score ?? 0)
    const last = eras[eras.length - 1]
    if (last && last.bucket === b) {
      last.endYear = item.year
      last.n += item.contract_count
      last.totalValue += item.total_value
    } else {
      eras.push({ startYear: item.year, endYear: item.year, bucket: b, n: item.contract_count, totalValue: item.total_value })
    }
  }

  // Layout
  const W = 720
  const H = 220
  const PAD = { top: 44, bottom: 28, left: 8, right: 8 }
  const innerH = H - PAD.top - PAD.bottom
  const innerW = W - PAD.left - PAD.right

  const xOf = (year: number) => PAD.left + ((year - minYear) / yearSpan) * innerW
  const heightOf = (value: number) => Math.max(2, (Math.log(value + 1) / logMax) * innerH * 0.88)
  const colorOf = (risk: number) => {
    const level = getRiskLevel(risk)
    return RISK_DOT_COLORS[level]
  }

  // Each year column gets a half-step buffer so era bands tile cleanly
  const halfStep = innerW / yearSpan / 2

  // Year axis: first, hero, last (deduplicated)
  const axisYears = Array.from(new Set([minYear, hero.year, maxYear])).sort((a, b) => a - b)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className ?? 'w-full h-auto'} role="img" aria-label="Timeline skyline">
      {/* Era background bands */}
      {eras.map((era, i) => {
        const isFirst = i === 0
        const isLast = i === eras.length - 1
        const x1 = isFirst ? 0 : xOf(era.startYear) - halfStep
        const x2 = isLast ? W : xOf(era.endYear) + halfStep
        return (
          <rect
            key={`era-bg-${i}`}
            x={x1}
            y={PAD.top}
            width={x2 - x1}
            height={innerH}
            fill={ERA_BG[era.bucket]}
          />
        )
      })}

      {/* Era labels at top — only label runs of 2+ years to avoid clutter */}
      {eras.filter((e) => e.endYear - e.startYear >= 1 || eras.length <= 3).map((era, i) => {
        const cx = (xOf(era.startYear) + xOf(era.endYear)) / 2
        return (
          <text
            key={`era-lbl-${i}`}
            x={cx}
            y={PAD.top - 18}
            textAnchor="middle"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            fill={ERA_LABEL_COLOR[era.bucket]}
            fontWeight={600}
            opacity={0.85}
          >
            {eraLabels[era.bucket].toUpperCase()}
          </text>
        )
      })}

      {/* Era extent ticks */}
      {eras.map((era, i) => {
        const cx = (xOf(era.startYear) + xOf(era.endYear)) / 2
        const w = Math.max(20, xOf(era.endYear) - xOf(era.startYear))
        return (
          <line
            key={`era-tick-${i}`}
            x1={cx - w / 2}
            x2={cx + w / 2}
            y1={PAD.top - 8}
            y2={PAD.top - 8}
            stroke={ERA_LABEL_COLOR[era.bucket]}
            strokeWidth={1.2}
            opacity={0.55}
          />
        )
      })}

      {/* Baseline */}
      <line
        x1={0}
        x2={W}
        y1={PAD.top + innerH}
        y2={PAD.top + innerH}
        stroke="var(--color-border)"
        strokeWidth={0.8}
      />

      {/* Skyscraper bars */}
      {sorted.map((item) => {
        const x = xOf(item.year)
        const h = heightOf(item.total_value)
        const y = PAD.top + innerH - h
        const isHero = item.year === hero.year
        const barW = isHero ? 9 : 5
        const risk = item.avg_risk_score ?? 0
        const color = colorOf(risk)
        return (
          <g key={item.year}>
            <rect
              x={x - barW / 2}
              y={y}
              width={barW}
              height={h}
              rx={1}
              fill={color}
              opacity={isHero ? 1 : 0.78}
              style={isHero ? { filter: `drop-shadow(0 0 4px ${color}aa)` } : undefined}
            />
            {/* Contract-count tick under the bar */}
            <circle
              cx={x}
              cy={PAD.top + innerH + 4}
              r={Math.min(3.2, 1.2 + Math.log(item.contract_count + 1) * 0.7)}
              fill="var(--color-text-muted)"
              opacity={0.55}
            />
            <title>
              {item.year} · {formatCompactMXN(item.total_value)} · {item.contract_count} contract{item.contract_count !== 1 ? 's' : ''} · {Math.round(risk * 100)}% risk
            </title>
          </g>
        )
      })}

      {/* Hero callout flag */}
      {(() => {
        const x = xOf(hero.year)
        const h = heightOf(hero.total_value)
        const barTop = PAD.top + innerH - h
        const flagW = 152
        const flagH = 34
        const flagX = Math.min(W - flagW - 4, Math.max(4, x - flagW / 2))
        const heroColor = colorOf(hero.avg_risk_score ?? 0)
        return (
          <g>
            <line
              x1={x}
              y1={barTop}
              x2={x}
              y2={4 + flagH}
              stroke={heroColor}
              strokeWidth={0.6}
              strokeDasharray="2 2"
              opacity={0.55}
            />
            <rect
              x={flagX}
              y={4}
              width={flagW}
              height={flagH}
              rx={2}
              fill="var(--color-background-card)"
              stroke={heroColor}
              strokeWidth={1}
            />
            <text
              x={flagX + 8}
              y={18}
              fontSize={11}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
              fill="var(--color-text-primary)"
            >
              {hero.year} · {formatCompactMXN(hero.total_value)}
            </text>
            <text
              x={flagX + 8}
              y={30}
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              fill={heroColor}
            >
              {Math.round((hero.avg_risk_score ?? 0) * 100)}% risk · {hero.contract_count} contract{hero.contract_count !== 1 ? 's' : ''}
            </text>
          </g>
        )
      })()}

      {/* Year axis */}
      {axisYears.map((y, i) => {
        const cx = xOf(y)
        const anchor: 'start' | 'middle' | 'end' = i === 0 ? 'start' : i === axisYears.length - 1 ? 'end' : 'middle'
        const isHero = y === hero.year
        return (
          <text
            key={y}
            x={cx}
            y={H - 6}
            textAnchor={anchor}
            fontSize={10}
            fontFamily="var(--font-family-mono)"
            fontWeight={isHero ? 700 : 400}
            fill={isHero ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
          >
            {y}
          </text>
        )
      })}

      {/* No SVG legend — the lede paragraph above the chart explains the
          encoding (bar height / color / count tick). Trying to render it
          inside the SVG fights the year axis or the era labels. */}
    </svg>
  )
}

function ChapterTimeline({ totalContracts, vendorFirstYear, vendorLastYear, timeline, t }: {
  totalContracts?: number
  vendorFirstYear?: number
  vendorLastYear?: number
  timeline: TimelineItem[]
  t: TFunction
}) {
  const sortedTimeline = [...timeline].sort((a, b) => a.year - b.year)
  const minYear = sortedTimeline[0]?.year ?? vendorFirstYear ?? 2010
  const maxYear = sortedTimeline[sortedTimeline.length - 1]?.year ?? vendorLastYear ?? 2025
  const displayTotal = totalContracts ?? sortedTimeline.reduce((s, item) => s + item.contract_count, 0)

  // Era summary line — auto-generated narrative footer in the same spirit
  // as the chart's era bands. Computes (alert era count, alert era share
  // of total value) and pulls the boundary year for the inflection.
  const totalValue = sortedTimeline.reduce((s, item) => s + item.total_value, 0)
  const alertItems = sortedTimeline.filter((item) => bucketOfRisk(item.avg_risk_score ?? 0) === 'alert')
  const alertValue = alertItems.reduce((s, item) => s + item.total_value, 0)
  const alertShare = totalValue > 0 ? (alertValue / totalValue) * 100 : 0
  const inflectionYear = alertItems.length > 0 ? alertItems[0].year : null

  return (
    <ChapterShell id="chapter-timeline">
      <RedThreadChapter
        label={t('chapters.headings.timeline')}
        title={t('timeline.heading', { total: formatNumber(displayTotal), minYear, maxYear })}
      />
      <p className="text-text-secondary mb-1 max-w-2xl text-sm leading-relaxed">
        {t('timeline.skylineDescription', {
          defaultValue: 'Each bar is a year. Height encodes total value (log scale); color encodes average risk; the dot beneath encodes contract count. Background bands segment the timeline into stable, watch, and alert eras based on the prevailing risk regime.',
        })}
      </p>
      <p className="text-text-muted mb-6 max-w-2xl text-[11px] font-mono leading-relaxed">
        {t('timeline.skylineLegend', {
          defaultValue: 'BAR HEIGHT = LOG(VALUE) · BAR COLOR = AVG RISK · ● = CONTRACT COUNT',
        })}
      </p>

      {/* Single skyline canvas — replaces the dot-strip + year-card duplication */}
      <TimelineSkyline
        timeline={sortedTimeline}
        eraLabels={{
          stable: t('timeline.era.stable', { defaultValue: 'Stable era' }),
          watch:  t('timeline.era.watch',  { defaultValue: 'Watch era' }),
          alert:  t('timeline.era.alert',  { defaultValue: 'Alert era' }),
        }}
      />

      {/* Auto-generated era narrative — inline, no card-in-card */}
      {inflectionYear && alertShare > 0 && (
        <p className="mt-3 text-xs text-text-secondary leading-relaxed max-w-2xl">
          <span className="font-mono uppercase tracking-[0.12em] text-[10px]" style={{ color: 'var(--color-risk-critical)' }}>
            {t('timeline.era.alert', { defaultValue: 'Alert era' })}
          </span>
          {' '}— {t('timeline.eraNarrative', {
            defaultValue: 'opens in {{year}}. {{share}}% of total value (≈ {{value}}) flowed during high-risk years.',
            year: inflectionYear,
            share: alertShare.toFixed(0),
            value: formatCompactMXN(alertValue),
          })}
        </p>
      )}
    </ChapterShell>
  )
}

// ─── Chapter 3: The Pattern ─────────────────────────────────────────────────

function ChapterPattern({ waterfall, ariaPattern, t }: {
  waterfall: Array<{ feature: string; contribution: number; z_score: number; label_en: string }>
  ariaPattern: string | null
  t: TFunction
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })

  const PATTERN_META = getPatternMeta(t)
  const meta = ariaPattern ? PATTERN_META[ariaPattern] : null

  // Sort: positive contributions first (drivers), then protective factors
  const safeWaterfall = Array.isArray(waterfall) ? waterfall : []
  const sorted = [...safeWaterfall]
    .filter((f) => Math.abs(f.contribution) > 0.001)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 10)

  const maxAbs = Math.max(...sorted.map((f) => Math.abs(f.contribution)), 0.01)

  // Cap waterfall at 6 rows (was 10). Below 6 the contributions are <0.05
  // and add noise without explaining the pattern.
  const sortedSix = sorted.slice(0, 6)

  return (
    <ChapterShell id="chapter-pattern">
      <RedThreadChapter label={t('chapters.headings.pattern')} title={t('pattern.heading')} />
      <p className="text-text-muted mb-6 max-w-xl text-sm">
        {t('pattern.description')}
      </p>

      {/* ARIA pattern badge — compact one-liner instead of a 6-padding card */}
      {meta && ariaPattern && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-sm border px-4 py-2.5 mb-5 flex items-center gap-3 flex-wrap"
          style={{ backgroundColor: meta.bg, borderColor: meta.color + '44' }}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: meta.color }} />
          <span className="editorial-label" style={{ color: meta.color }}>{ariaPattern}</span>
          <span className="text-sm font-bold text-text-primary">{meta.label}</span>
          <span className="text-text-muted">·</span>
          <span className="text-text-secondary text-xs leading-relaxed flex-1 min-w-[280px]">{meta.description}</span>
        </motion.div>
      )}

      {/* Waterfall bars — compacted: 28px row height (was 60px), 6 rows max
          (was 10). Bar fill renders as a horizontal sliver inside the row,
          not a separate decorative DotBar layer below text. */}
      <div ref={ref} className="space-y-1">
        {sortedSix.map((f, idx) => {
          const isPositive = f.contribution > 0
          const width = (Math.abs(f.contribution) / maxAbs) * 100
          const color = isPositive ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'
          return (
            <motion.div
              key={f.feature}
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: idx * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-sm border border-border overflow-hidden"
            >
              {/* Inline horizontal fill — the bar IS the row. */}
              <div
                className="absolute inset-y-0 left-0 pointer-events-none"
                style={{
                  width: `${width}%`,
                  backgroundColor: color,
                  opacity: 0.10,
                }}
              />
              <div className="relative flex items-center justify-between px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-text-secondary">{f.label_en}</span>
                  {f.z_score !== 0 && (
                    <span className="text-[10px] text-text-muted font-mono tabular-nums">
                      z={f.z_score.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-text-muted">
                    {isPositive ? t('pattern.raisesRisk') : t('pattern.lowersRisk')}
                  </span>
                  <span
                    className="text-xs font-mono font-bold tabular-nums"
                    style={{ color }}
                  >
                    {isPositive ? '+' : ''}{f.contribution.toFixed(3)}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {safeWaterfall.length === 0 && (
        <div className="text-text-secondary text-sm italic">{t('pattern.noData')}</div>
      )}

      <p className="text-[10px] text-text-muted italic mt-3 leading-relaxed">
        {t('pattern.shapNote')}
      </p>
    </ChapterShell>
  )
}

// ─── Chapter 4: The Network ─────────────────────────────────────────────────

function classifyRole(coBidder: { win_count: number; co_bid_count: number }, t: TFunction): {
  label: string
  color: string
  bg: string
} {
  const winRate = coBidder.co_bid_count > 0 ? coBidder.win_count / coBidder.co_bid_count : 0
  if (winRate < 0.15) return { label: t('roles.possibleDecoy'),     color: 'var(--color-risk-critical)', bg: 'rgba(239,68,68,0.12)' }
  if (winRate >= 0.3 && winRate <= 0.7) return { label: t('roles.rotationPattern'),  color: 'var(--color-risk-high)', bg: 'rgba(245,158,11,0.12)' }
  if (winRate > 0.6)  return { label: t('roles.possibleAccomplice'), color: 'var(--color-risk-medium)', bg: 'rgba(161,98,7,0.12)' }
  return { label: t('roles.coBidder'), color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' }
}

/**
 * NetworkMiniGraph — embedded radial layout of the subject vendor + top
 * co-bidders. Replaces the "tease the network behind a CTA" anti-pattern
 * with the actual graph rendered inline at 280px height. Click any node
 * navigates to that vendor's thread.
 */
function NetworkMiniGraph({
  subjectName,
  coBidders,
  t,
}: {
  subjectName: string
  coBidders: Array<{ vendor_id: number; vendor_name: string; co_bid_count: number; win_count: number }>
  t: TFunction
}) {
  const W = 720
  const H = 280
  const cx = W / 2
  const cy = H / 2
  const top = coBidders.slice(0, 8)
  const maxCoBids = Math.max(...top.map((c) => c.co_bid_count), 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Co-bidder network mini-graph">
      {/* Edges — colored by role, thickness by co_bid_count */}
      {top.map((cb, i) => {
        const angle = (i / top.length) * Math.PI * 2 - Math.PI / 2
        const r = 100
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        const role = classifyRole(cb, t)
        const strokeW = 0.8 + (cb.co_bid_count / maxCoBids) * 2.4
        return (
          <line
            key={`edge-${cb.vendor_id}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={role.color}
            strokeWidth={strokeW}
            opacity={0.45}
          />
        )
      })}

      {/* Subject vendor — pulsing center node */}
      <circle cx={cx} cy={cy} r={18} fill="var(--color-risk-critical)" opacity={0.18}>
        <animate attributeName="r" values="18;22;18" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.18;0.30;0.18" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={9} fill="var(--color-risk-critical)" />
      <text x={cx} y={cy + 32} textAnchor="middle" fontSize={11} fontFamily="var(--font-family-mono)" fill="var(--color-text-primary)" fontWeight="700">
        {formatVendorName(subjectName, 22)}
      </text>

      {/* Co-bidder nodes */}
      {top.map((cb, i) => {
        const angle = (i / top.length) * Math.PI * 2 - Math.PI / 2
        const r = 100
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        const role = classifyRole(cb, t)
        const nodeR = 5 + (cb.co_bid_count / maxCoBids) * 4
        const labelOffset = 14
        // Position label outward from center
        const lx = cx + Math.cos(angle) * (r + labelOffset)
        const ly = cy + Math.sin(angle) * (r + labelOffset)
        const anchor = Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle'
        return (
          <g key={cb.vendor_id} className="cursor-pointer">
            <Link to={`/thread/${cb.vendor_id}`}>
              <title>{cb.vendor_name} · {cb.co_bid_count} co-bids · {role.label}</title>
              <circle cx={x} cy={y} r={nodeR + 6} fill="transparent" />
              <circle cx={x} cy={y} r={nodeR} fill={role.color} stroke="var(--color-background)" strokeWidth={1.2} />
              <text
                x={lx}
                y={ly + 3}
                textAnchor={anchor}
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fill="var(--color-text-secondary)"
              >
                {formatVendorName(cb.vendor_name, 18)}
              </text>
            </Link>
          </g>
        )
      })}
    </svg>
  )
}

function ChapterNetwork({ vendorId, vendor, coBidders, t }: {
  vendorId: number
  vendor: { name: string; total_institutions: number; sectors_count: number }
  coBidders: Array<{ vendor_id: number; vendor_name: string; co_bid_count: number; win_count: number; loss_count: number; same_winner_ratio: number; relationship_strength: string }> | null
  t: TFunction
}) {
  const totalCoBidders = coBidders?.length ?? 0
  const topCoBidder = coBidders?.[0] ?? null

  return (
    <ChapterShell id="chapter-network">
      <RedThreadChapter label={t('chapters.headings.network')} title={t('network.heading')} />
      <p className="text-text-muted mb-5 max-w-xl text-sm">
        {t('network.description')}
      </p>

      {/* Compact stat row — 3 inline anchors instead of two 6-padding cards */}
      <div className="flex items-baseline gap-6 mb-5 flex-wrap">
        <div>
          <span className="text-lg font-bold text-text-primary font-mono tabular-nums">{formatNumber(vendor.total_institutions)}</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted ml-2">{t('network.institutionsServed')}</span>
        </div>
        <div>
          <span className="text-lg font-bold text-text-primary font-mono tabular-nums">{vendor.sectors_count}</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted ml-2">{t('network.sectorsActive')}</span>
        </div>
        <div>
          <span className="text-lg font-bold text-text-primary font-mono tabular-nums">{formatNumber(totalCoBidders)}</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted ml-2">co-bidders</span>
        </div>
      </div>

      {/* Embedded mini-graph — 280px tall, click any node → that thread */}
      <div className="bg-background-card border border-border rounded-sm p-4 mb-4">
        {coBidders === null ? (
          <div className="h-[280px] rounded bg-background-elevated animate-pulse" />
        ) : coBidders.length === 0 ? (
          <p className="text-text-muted text-sm italic py-12 text-center">{t('network.noCoBidders')}</p>
        ) : (
          <NetworkMiniGraph subjectName={vendor.name} coBidders={coBidders} t={t} />
        )}
      </div>

      {/* Top co-bidder callout — narrative pull instead of a list of 5 boxes */}
      {topCoBidder && (
        <p className="text-xs text-text-secondary mb-4 max-w-2xl leading-relaxed">
          <span className="text-text-muted">Most-frequent co-bidder:</span>{' '}
          <Link
            to={`/thread/${topCoBidder.vendor_id}`}
            className="font-bold text-text-primary hover:text-[var(--color-risk-critical)] transition-colors"
          >
            {formatVendorName(topCoBidder.vendor_name, 50)}
          </Link>
          {' '}— {topCoBidder.co_bid_count} shared procedures, {classifyRole(topCoBidder, t).label.toLowerCase()}.
        </p>
      )}

      {/* Single CTA — open full force-directed graph */}
      <Link
        to={`/network?vendor=${vendorId}`}
        className="group inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.12em] text-text-secondary hover:text-text-primary transition-colors"
      >
        <GitBranch className="w-3.5 h-3.5" />
        {t('network.openNetworkGraph')}
        <ExternalLink className="w-3 h-3" />
      </Link>
    </ChapterShell>
  )
}

// ─── Chapter 5: The Money ───────────────────────────────────────────────────

function ChapterMoney({ timeline, t }: {
  timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  t: TFunction
}) {
  const chartData = timeline.map((item) => ({
    year: item.year,
    value: item.total_value,
    valueM: item.total_value / 1_000_000, // bars in millions for axis legibility
    risk: (item.avg_risk_score ?? 0) * 100,
    contracts: item.contract_count,
  }))

  const totalValue = timeline.reduce((s, item) => s + item.total_value, 0)
  const peakYear = timeline.reduce((max, item) => item.total_value > (max.total_value ?? 0) ? item : max, timeline[0] ?? { year: 0, total_value: 0, avg_risk_score: null, contract_count: 0 })
  const peakRiskYear = timeline.reduce((max, item) => (item.avg_risk_score ?? 0) > (max.avg_risk_score ?? 0) ? item : max, timeline[0] ?? { year: 0, total_value: 0, avg_risk_score: null, contract_count: 0 })

  return (
    <ChapterShell id="chapter-money">
      <RedThreadChapter
        label={t('chapters.headings.money')}
        title={t('money.heading', { value: formatCompactMXN(totalValue) })}
      />
      <p className="text-text-muted mb-4 max-w-xl text-sm">
        {t('money.description')}
      </p>

      {/* Inline anchor stats — replaces two boxed cards (~140px) with a row */}
      {peakYear && (
        <div className="flex items-baseline gap-6 mb-4 flex-wrap">
          <div>
            <span className="text-base font-bold text-text-primary font-mono tabular-nums">{peakYear.year}</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted ml-2">{t('money.peakByValue')}</span>
            <span className="text-xs text-text-secondary ml-2 font-mono tabular-nums">{formatCompactMXN(peakYear.total_value)}</span>
          </div>
          {peakRiskYear && (
            <div>
              <span className="text-base font-bold font-mono tabular-nums" style={{ color: 'var(--color-risk-critical)' }}>{peakRiskYear.year}</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted ml-2">{t('money.peakByRisk')}</span>
              <span className="text-xs ml-2 font-mono tabular-nums" style={{ color: 'var(--color-risk-critical)' }}>{((peakRiskYear.avg_risk_score ?? 0) * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Single dual-axis chart: bars = MXN value, line = avg risk %.
          Replaces the two stacked charts (area + dot-matrix, ~600px total)
          with one 280px ComposedChart. Same x-axis. Reads in one image. */}
      <div className="bg-background-card border border-border rounded-sm p-4">
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <p className="editorial-label text-text-muted">{t('money.chartValueLabel')} <span className="text-text-muted/60">·</span> {t('money.chartRiskLabel')}</p>
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted">
            <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--color-risk-critical)', opacity: 0.7 }} />Value (MDP)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ backgroundColor: 'var(--color-accent)' }} />Avg risk %</span>
          </div>
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.35} vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="value"
                orientation="left"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}B` : `${v.toFixed(0)}M`}
                width={48}
              />
              <YAxis
                yAxisId="risk"
                orientation="right"
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
                domain={[0, 100]}
                width={36}
              />
              {/* OECD high-risk benchmark band */}
              <ReferenceLine yAxisId="risk" y={15} stroke="var(--color-risk-medium)" strokeDasharray="2 2" strokeWidth={0.8} opacity={0.4} />
              <ReferenceLine yAxisId="risk" y={40} stroke="var(--color-risk-high)" strokeDasharray="2 2" strokeWidth={0.8} opacity={0.4} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-background-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 2,
                  fontSize: 11,
                  fontFamily: 'var(--font-family-mono)',
                  color: 'var(--color-text-primary)',
                }}
                formatter={(value, name) => {
                  const v = typeof value === 'number' ? value : Number(value)
                  if (name === 'valueM') return [formatCompactMXN(v * 1_000_000), 'Value']
                  if (name === 'risk') return [`${v.toFixed(1)}%`, 'Risk']
                  return [String(v), String(name)]
                }}
                cursor={{ fill: 'var(--color-background-elevated)', opacity: 0.4 }}
              />
              <Bar yAxisId="value" dataKey="valueM" fill="var(--color-risk-critical)" fillOpacity={0.55} radius={[2, 2, 0, 0]} />
              <Line yAxisId="risk" type="monotone" dataKey="risk" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--color-accent)' }} activeDot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-text-muted italic mt-2 leading-relaxed">
          {t('money.riskNote')}
        </p>
      </div>
    </ChapterShell>
  )
}

// ─── Chapter 6: The Verdict ─────────────────────────────────────────────────

function ChapterVerdict({
  vendorId,
  vendor,
  aria,
  t,
}: {
  vendorId: number
  vendor: { name: string; avg_risk_score?: number; in_ground_truth?: boolean }
  aria: {
    ips_final: number
    ips_tier: number
    primary_pattern: string | null
    review_status: string
    is_efos_definitivo: boolean
    is_sfp_sanctioned: boolean
    in_ground_truth: boolean
    memo_text?: string | null
  } | null
  t: TFunction
}) {
  const navigate = useNavigate()
  const PATTERN_META = getPatternMeta(t)
  const riskLevel = getRiskLevel(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_DOT_COLORS[riskLevel]
  const patternMeta = aria?.primary_pattern ? PATTERN_META[aria.primary_pattern] : null

  // Memo: clamp to first 220 words via CSS line-clamp + expandable disclosure.
  // Was rendering full memo (700–1500 words) inline → 2,400+px chapter height.
  const [memoExpanded, setMemoExpanded] = useState(false)

  return (
    <ChapterShell id="chapter-verdict">
      <RedThreadChapter label={t('chapters.headings.verdict')} title={t('verdict.heading')} />
      <p className="text-text-muted mb-4 max-w-xl text-sm">
        {t('verdict.description')}
      </p>

      {/* Inline verdict header — score + level + ARIA, no oversized score card */}
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4 pb-3 border-b border-border">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-mono text-2xl font-bold tabular-nums" style={{ color: riskColor }}>
            {((vendor.avg_risk_score ?? 0) * 100).toFixed(1)}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">{t('verdict.riskIndicatorScore')}</span>
          <span
            className="inline-block px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest"
            style={{ backgroundColor: riskColor + '22', color: riskColor, border: `1px solid ${riskColor}44` }}
          >
            {riskLevel}
          </span>
        </div>
        {aria && (
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {t('verdict.ariaIps', { ips: (aria.ips_final * 100).toFixed(0), tier: aria.ips_tier })}
          </span>
        )}
      </div>

      {/* External flags — single inline row */}
      {aria && (aria.is_efos_definitivo || aria.is_sfp_sanctioned || aria.in_ground_truth) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {aria.is_efos_definitivo && (
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider bg-[color:var(--color-risk-critical)]/10 text-[color:var(--color-risk-critical)] border border-[color:var(--color-risk-critical)]/30 flex items-center gap-1">
              <Shield className="w-2.5 h-2.5" /> {t('verdict.efosLabel')}
            </span>
          )}
          {aria.is_sfp_sanctioned && (
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider bg-[color:var(--color-risk-high)]/10 text-[color:var(--color-risk-high)] border border-[color:var(--color-risk-high)]/30 flex items-center gap-1">
              <Gavel className="w-2.5 h-2.5" /> {t('verdict.sfpLabel')}
            </span>
          )}
          {aria.in_ground_truth && (
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)] border border-[color:var(--color-accent)]/30 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> {t('verdict.groundTruthLabel')}
            </span>
          )}
        </div>
      )}

      {/* Pattern card — compact one-liner */}
      {patternMeta && aria?.primary_pattern && (
        <div className="rounded-sm border px-3 py-2 mb-4 flex items-center gap-3 flex-wrap" style={{ backgroundColor: patternMeta.bg, borderColor: patternMeta.color + '44' }}>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: patternMeta.color }}>
            {aria.primary_pattern}
          </span>
          <span className="text-sm font-bold text-text-primary">{patternMeta.label}</span>
          <span className="text-text-muted">·</span>
          <span className="text-text-secondary text-xs leading-relaxed flex-1 min-w-[280px]">{patternMeta.description}</span>
        </div>
      )}

      {/* ARIA memo — clamped with disclosure (was unbounded full render) */}
      {aria?.memo_text && (
        <div className="border-l-2 border-[var(--color-accent)] pl-3 mb-4">
          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
            <p className="editorial-label text-text-muted">{t('verdict.ariaMemoTitle')}</p>
            <button
              onClick={() => setMemoExpanded((v) => !v)}
              className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary hover:text-text-primary transition-colors"
            >
              {memoExpanded ? '— Collapse' : '+ Read full memo'}
            </button>
          </div>
          <div
            className={cn(
              'text-text-secondary text-xs leading-relaxed',
              !memoExpanded && 'line-clamp-4'
            )}
            style={!memoExpanded ? { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
          >
            {memoExpanded ? (
              aria.memo_text.split('\n').map((line, i) => {
                if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-text-primary text-xs mt-2">{line.slice(4)}</h4>
                if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-text-primary text-sm mt-3">{line.slice(3)}</h3>
                if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-text-primary text-base mt-3">{line.slice(2)}</h2>
                if (line.trim() === '') return <div key={i} className="h-1" />
                if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                  const cells = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1)
                  const isSeparator = cells.every((c) => /^[-: ]+$/.test(c))
                  if (isSeparator) return null
                  return (
                    <div key={i} className="flex gap-2 text-[11px] my-1">
                      {cells.map((cell, ci) => (
                        <span key={ci} className={cn('flex-1 px-2 py-0.5 bg-background-elevated rounded', ci === 0 ? 'text-text-muted' : 'text-text-primary font-medium')}>{cell.trim()}</span>
                      ))}
                    </div>
                  )
                }
                const parts = line.split(/\*\*(.+?)\*\*/g)
                return (
                  <p key={i} className="my-0.5">
                    {parts.map((part, j) => (j % 2 === 1 ? <strong key={j} className="font-semibold text-text-primary">{part}</strong> : part))}
                  </p>
                )
              })
            ) : (
              aria.memo_text.replace(/[#*]/g, '').slice(0, 380)
            )}
          </div>
        </div>
      )}

      {/* Compact action row — was 3 large stacked buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => navigate(`/vendors/${vendorId}`)}
          className="inline-flex items-center gap-1.5 bg-[var(--color-risk-critical)] hover:opacity-90 text-text-primary text-xs font-mono uppercase tracking-wider rounded-sm px-3 py-2 transition-opacity"
        >
          <Building2 className="w-3.5 h-3.5" />
          {t('verdict.fullVendorProfile')}
        </button>
        <Link
          to="/workspace"
          className="inline-flex items-center gap-1.5 bg-background-elevated hover:bg-background-card text-text-primary text-xs font-mono uppercase tracking-wider rounded-sm px-3 py-2 transition-colors border border-border"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          {t('verdict.addToWorkspace')}
        </Link>
        <button
          onClick={() => {
            const prev = document.title
            document.title = `RUBLI — ${vendor.name} — Investigation Thread`
            window.print()
            window.addEventListener('afterprint', () => { document.title = prev }, { once: true })
          }}
          className="inline-flex items-center gap-1.5 bg-background-elevated hover:bg-background-card text-text-primary text-xs font-mono uppercase tracking-wider rounded-sm px-3 py-2 transition-colors border border-border"
        >
          <Download className="w-3.5 h-3.5" />
          {t('verdict.exportPdf')}
        </button>
        <Link
          to="/methodology"
          className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted hover:text-text-primary transition-colors"
        >
          <FileText className="w-3 h-3" />
          {t('verdict.methodologyLink')}
        </Link>
      </div>
    </ChapterShell>
  )
}

// ─── Chapter Progress Line ───────────────────────────────────────────────────

function RedThreadLine({ progress }: { progress: number }) {
  return (
    <div
      className="fixed left-0 top-0 bottom-0 w-[3px] pointer-events-none z-50"
      style={{ background: 'rgba(220,38,38,0.08)' }}
    >
      <motion.div
        className="absolute top-0 left-0 w-full origin-top"
        style={{ height: `${Math.min(100, progress * 100)}%`, background: 'linear-gradient(to bottom, #dc2626, #991b1b88)' }}
        transition={{ ease: 'linear', duration: 0 }}
      />
      {/* Glowing pulse dot at tip */}
      <motion.div
        className="absolute left-0 w-3 h-3 rounded-full -translate-x-[5px]"
        style={{
          top: `${Math.min(99, progress * 100)}%`,
          background: '#dc2626',
          boxShadow: '0 0 8px 2px #dc262688',
        }}
      />
    </div>
  )
}

// ─── Chapter Navigation Dots ────────────────────────────────────────────────

function ChapterNav({ active, chapters }: { active: number; chapters: Array<{ id: string; label: string; icon: React.ElementType }> }) {
  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
      {chapters.map((ch, idx) => (
        <a
          key={ch.id}
          href={`#chapter-${ch.id}`}
          className="group flex items-center gap-2 justify-end"
          title={ch.label}
        >
          <span className={cn(
            'text-xs opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hidden md:block',
            active === idx && 'opacity-100 text-text-primary'
          )}>
            {ch.label}
          </span>
          <div className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            active === idx
              ? 'bg-[#dc2626] scale-125 shadow-[0_0_6px_2px_#dc262666]'
              : 'bg-background-elevated hover:bg-background'
          )} />
        </a>
      ))}
    </div>
  )
}

// ─── Loading State ──────────────────────────────────────────────────────────

function ThreadSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-1 h-16 bg-risk-critical mx-auto mb-6 animate-pulse rounded-full" />
        <p className="text-text-muted text-sm animate-pulse">{label}</p>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RedThread() {
  const { vendorId } = useParams<{ vendorId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('redThread')
  const id = Number(vendorId)

  const containerRef = useRef<HTMLDivElement>(null)
  const [activeChapter, setActiveChapter] = useState(0)

  const { scrollYProgress } = useScroll()

  // Build chapter list from translation keys
  const chapters = CHAPTER_IDS.map((chId) => ({
    id: chId,
    label: t(`chapters.${chId}`),
    icon: CHAPTER_ICONS[chId],
  }))

  // Track active chapter by scroll position (simple approach)
  const handleScroll = useCallback(() => {
    const chapterEls = CHAPTER_IDS.map((chId) => document.getElementById(`chapter-${chId}`))
    const scrollY = window.scrollY + window.innerHeight / 2
    let active = 0
    chapterEls.forEach((el, idx) => {
      if (el && el.offsetTop <= scrollY) active = idx
    })
    setActiveChapter(active)
  }, [])

  // Bind scroll handler to window — the outer div has no overflow so onScroll never fires
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // set initial active chapter
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Queries — all share three resilience flags:
  //   • staleTime keeps data fresh through transient deploy windows
  //   • refetchOnWindowFocus auto-recovers when the user comes back to a
  //     stale tab after a backend hiccup
  //   • retry on the root vendor query stays at default (3 attempts) so a
  //     single-packet network blip doesn't fail the whole page
  // Sub-resource queries that may legitimately 404 (ARIA queue, co-bidders)
  // keep retry: false — those are "expected absence" cases, not failures.
  const COMMON_QUERY_OPTS = {
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  } as const

  const {
    data: vendor,
    isLoading: vendorLoading,
    isError: vendorError,
    error: vendorErrorObj,
    refetch: refetchVendor,
  } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorApi.getById(id),
    enabled: !!id && !isNaN(id),
    ...COMMON_QUERY_OPTS,
  })

  const { data: waterfall } = useQuery({
    queryKey: ['vendor-waterfall', id],
    queryFn: () => vendorApi.getRiskWaterfall(id),
    enabled: !!id && !isNaN(id),
    ...COMMON_QUERY_OPTS,
  })

  const { data: timeline } = useQuery({
    queryKey: ['vendor-timeline', id],
    queryFn: () => vendorApi.getRiskTimeline(id),
    enabled: !!id && !isNaN(id),
    ...COMMON_QUERY_OPTS,
  })

  const { data: aria } = useQuery({
    queryKey: ['aria-vendor', id],
    queryFn: () => ariaApi.getVendorDetail(id),
    enabled: !!id && !isNaN(id),
    retry: false, // vendor may not be in ARIA queue — that's OK
    ...COMMON_QUERY_OPTS,
  })

  const { data: coBidders } = useQuery({
    queryKey: ['co-bidders', id],
    queryFn: () => networkApi.getCoBidders(id, 10, 5),
    enabled: !!id && !isNaN(id) && activeChapter >= 3,
    retry: false,
    ...COMMON_QUERY_OPTS,
  })

  // Distinguish "vendor doesn't exist" (404) from "backend unreachable" so
  // the UI can give the reader an actionable message instead of the same
  // generic "Could not load" for every failure mode. Was a single early-
  // return that produced indistinguishable error states for 404, 5xx, and
  // network-down.
  const vendorErrorStatus = (vendorErrorObj as AxiosError | undefined)?.response?.status

  // scroll progress for the thread line (page-level)
  const [scrollPct, setScrollPct] = useState(0)
  scrollYProgress.on('change', setScrollPct)

  if (isNaN(id)) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-muted">
        {t('errors.invalidId')}
      </div>
    )
  }

  if (vendorLoading) return <ThreadSkeleton label={t('loading')} />

  // 404 — vendor genuinely does not exist. Distinct UI from network failure
  // so the reader knows retrying won't help and they should pick a different
  // vendor. (Was: same generic "Could not load" UI as 5xx/network errors.)
  if (vendorError && vendorErrorStatus === 404) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-text-muted" />
        <div>
          <p className="text-text-primary font-medium mb-1">
            {t('errors.vendorNotFound')}
          </p>
          <p className="text-text-muted text-sm">
            {t('errors.vendorNotFoundHint', { defaultValue: 'Vendor #' + id + ' is not in the procurement database. It may have been deduplicated, or the ID is wrong.' })}
          </p>
        </div>
        <button onClick={() => navigate('/aria')} className="text-[#dc2626] text-sm underline">
          {t('errors.goBack')}
        </button>
      </div>
    )
  }

  // 5xx, network, or other transient — give the reader a Retry button
  // instead of forcing them to navigate away and back. The page often comes
  // back on its own once the deploy window or network blip clears.
  if (vendorError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div>
          <p className="text-text-primary font-medium mb-1">{t('errors.loadFailed')}</p>
          <p className="text-text-muted text-sm">
            {t('errors.loadFailedHint', { defaultValue: 'Backend returned ' + (vendorErrorStatus ?? 'no response') + '. This usually clears within a minute.' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchVendor()}
            className="text-sm font-medium px-3 py-1.5 rounded-sm border border-border hover:bg-background-elevated/40 transition-colors inline-flex items-center gap-1.5"
          >
            {t('errors.retry', { defaultValue: 'Retry' })}
          </button>
          <button onClick={() => navigate('/aria')} className="text-[#dc2626] text-sm underline">
            {t('errors.goBack')}
          </button>
        </div>
      </div>
    )
  }
  if (!vendor) {
    // Defensive — useQuery returned success but no payload. Treated as
    // "vendor not found" since that's the only realistic shape that gets
    // here (ID mismatch, race, etc.).
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <p className="text-text-muted">{t('errors.vendorNotFound')}</p>
        <button onClick={() => navigate('/aria')} className="text-[#dc2626] text-sm underline">
          {t('errors.goBack')}
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[var(--color-background)]">
      {/* Fixed elements */}
      <RedThreadLine progress={scrollPct} />
      <ChapterNav active={activeChapter} chapters={chapters} />

      {/* Back nav */}
      <div className="sticky top-0 z-40 px-3 sm:px-8 py-3 bg-[var(--color-background)]/80 backdrop-blur-sm border-b border-border flex items-center justify-between gap-2">
        <button
          onClick={() => navigate('/aria')}
          className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors text-sm flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('nav.back')}
        </button>
        <div className="hidden sm:flex items-center gap-3 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-risk-critical)] animate-pulse flex-shrink-0" />
          <span className="text-xs text-text-secondary uppercase tracking-widest">{t('nav.redThread')}</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted max-w-[160px] md:max-w-[240px] truncate" title={vendor.name}>{formatVendorName(vendor.name, 40)}</span>
        </div>
        <Link
          to={`/vendors/${id}`}
          className="text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
        >
          {t('nav.fullProfile')} <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Chapters */}
      <div className="pl-6">
        <ChapterSubject
          vendor={vendor}
          aria={aria ? { ips_final: aria.ips_final, ips_tier: aria.ips_tier, primary_sector_name: aria.primary_sector_name } : null}
          t={t}
        />

        <ChapterDivider />

        <ChapterTimeline
          totalContracts={vendor.total_contracts}
          vendorFirstYear={vendor.first_contract_year}
          vendorLastYear={vendor.last_contract_year}
          timeline={timeline?.timeline ?? []}
          t={t}
        />

        <ChapterDivider />

        <ChapterPattern
          waterfall={waterfall ?? []}
          ariaPattern={aria?.primary_pattern ?? null}
          t={t}
        />

        <ChapterDivider />

        <ChapterNetwork
          vendorId={id}
          vendor={{
            name: vendor.name,
            total_institutions: vendor.total_institutions,
            sectors_count: vendor.sectors_count,
          }}
          coBidders={coBidders?.co_bidders ?? null}
          t={t}
        />

        <ChapterDivider />

        <ChapterMoney
          timeline={(timeline?.timeline ?? []).map((item) => ({
            year: item.year,
            avg_risk_score: item.avg_risk_score,
            contract_count: item.contract_count,
            total_value: item.total_value,
          }))}
          t={t}
        />

        <ChapterDivider />

        <ChapterVerdict
          vendorId={id}
          vendor={{
            name: vendor.name,
            avg_risk_score: vendor.avg_risk_score,
            in_ground_truth: aria?.in_ground_truth,
          }}
          aria={aria ? {
            ips_final: aria.ips_final,
            ips_tier: aria.ips_tier,
            primary_pattern: aria.primary_pattern,
            review_status: aria.review_status,
            is_efos_definitivo: aria.is_efos_definitivo,
            is_sfp_sanctioned: aria.is_sfp_sanctioned,
            in_ground_truth: aria.in_ground_truth,
            memo_text: aria.memo_text,
          } : null}
          t={t}
        />
      </div>

      {/* Bottom padding */}
      <div className="h-32" />
    </div>
  )
}
