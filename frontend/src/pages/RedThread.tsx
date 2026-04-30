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
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────

// Order: subject → timeline → network → money → pattern → verdict.
// Reordered (Apr 2026) per user feedback: Pattern (the algorithmic
// diagnosis) now sits immediately before Verdict, since the Verdict's
// evidence list cites the pattern. Network moves up so the structural
// "who-with" chapter precedes the "how-much" chapter.
const CHAPTER_IDS = ['subject', 'timeline', 'network', 'money', 'pattern', 'verdict'] as const
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
    <div className="flex items-center gap-3 my-3">
      <div className="h-px flex-1 bg-background-elevated" />
      <div className="w-0.5 h-0.5 rounded-full bg-[var(--color-accent)] opacity-50" />
      <div className="h-px flex-1 bg-background-elevated" />
    </div>
  )
}

/**
 * ChapterShell — chapter rhythm primitive. Tightened to py-5 from py-8
 * after user feedback ("a lot of spaces between chapters still"). With
 * ChapterDivider at my-3 the inter-chapter gap is now ~64px content-edge
 * to content-edge (was ~128px).
 */
function ChapterShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-5 px-4 sm:px-8 max-w-4xl mx-auto">
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

/**
 * CompactDotBar — tiny inline dot strip for byline comparisons. Used
 * in the editorial stat block to encode "vendor's value vs benchmark"
 * inside the typography, not in a separate card. Optionally renders a
 * faint reference range (referenceMin..referenceMax) as a colored
 * underlay so the reader sees the OECD/sector benchmark visually.
 */
function CompactDotBar({
  value,
  dots = 18,
  color,
  referenceMin,
  referenceMax,
}: {
  value: number          // 0..1
  dots?: number
  color: string
  referenceMin?: number
  referenceMax?: number
}) {
  const filled = Math.max(0, Math.min(dots, Math.round(value * dots)))
  const refStart = referenceMin != null ? Math.round(referenceMin * dots) : null
  const refEnd = referenceMax != null ? Math.round(referenceMax * dots) : null
  return (
    <span className="inline-flex items-baseline gap-[2px] align-middle" aria-hidden>
      {Array.from({ length: dots }).map((_, i) => {
        const inRef = refStart != null && refEnd != null && i >= refStart && i < refEnd
        const isFilled = i < filled
        return (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: 3,
              height: 3,
              backgroundColor: isFilled ? color : (inRef ? 'rgba(0,0,0,0.18)' : 'transparent'),
              border: isFilled || inRef ? 'none' : '1px solid var(--color-border-hover)',
            }}
          />
        )
      })}
    </span>
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

      {/* Editorial stat block — replaces the 4-card grid with a hero
          number set in Playfair Italic 800 plus a byline strip of
          comparative secondary stats. NYT / FT broadsheet aesthetic.
          The hero number now actually LANDS instead of being one of
          four flat numbers in equal-weight boxes. */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-6"
      >
        {/* Hero — total value in editorial display type */}
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="font-serif font-extrabold tabular-nums leading-[0.95]"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
              color: sectorColor,
              letterSpacing: '-0.025em',
            }}
          >
            {formatCompactMXN(vendor.total_value_mxn)}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted self-end pb-2">
            {t('kpi.totalValue')} · {vendor.first_contract_year ?? '?'}–{vendor.last_contract_year ?? '?'}
          </span>
        </div>

        {/* Sector accent line — anchors the hero number visually */}
        <div className="h-px w-12 my-3" style={{ backgroundColor: sectorColor, opacity: 0.65 }} />

        {/* Byline strip — three secondary stats, each with an inline
            comparison sliver (vendor vs benchmark) baked into the
            typography. No bordered cards. Reads as one editorial unit. */}
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3 text-sm">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-text-primary tabular-nums text-base">
              {formatNumber(vendor.total_contracts)}
            </span>
            <span className="text-text-muted text-xs">{t('kpi.contracts').toLowerCase()}</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-bold text-text-primary tabular-nums text-base">
              {Math.round(vendor.direct_award_pct)}%
            </span>
            <span className="text-text-muted text-xs">direct</span>
            <CompactDotBar
              value={vendor.direct_award_pct / 100}
              dots={18}
              color="var(--color-text-secondary)"
            />
            <span className="text-text-muted text-[10px] font-mono">vs ~48% nat'l</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className="font-bold tabular-nums text-base"
              style={{ color: vendor.high_risk_pct > 15 ? 'var(--color-risk-high)' : 'var(--color-text-primary)' }}
            >
              {Math.round(vendor.high_risk_pct)}%
            </span>
            <span className="text-text-muted text-xs">high-risk</span>
            <CompactDotBar
              value={vendor.high_risk_pct / 100}
              dots={18}
              color={vendor.high_risk_pct > 15 ? 'var(--color-risk-high)' : 'var(--color-text-secondary)'}
              referenceMin={0.02}
              referenceMax={0.15}
            />
            <span className="text-text-muted text-[10px] font-mono">OECD 2–15%</span>
          </div>
        </div>
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
 * TimelineHourglass — dual-channel mirror through the year axis.
 *
 * ABOVE the centerline: contract-count waveform (neutral, muted).
 * BELOW the centerline: log(value) waveform (colored by risk).
 *
 * The two channels DELIBERATELY share an x-axis so a year with one
 * mega-contract creates a pinch (tiny count above, huge value bar
 * below) — exposing the volume/value mismatch that's the signature
 * of threshold-busting and ghost-vendor patterns. A boring vendor
 * shows two roughly proportional channels; a suspect vendor's
 * channels diverge dramatically at the anomaly years.
 *
 * Era backgrounds extend across the full height (count + value)
 * so risk regimes are visible in both channels. Hero year (max
 * value × risk) gets a callout flag with full inline data.
 */
/**
 * Mexican procurement-context annotations rendered as pins on the
 * Hourglass year axis. Mix of administration transitions (neutral
 * context) and well-documented procurement scandals (highlighted).
 *
 * Conservative list — only events with public reporting that a
 * journalist would expect to know. Hover the pin to read the label.
 */
type TimelineAnnotation = {
  year: number
  label: string
  kind: 'admin' | 'event'
}
const TIMELINE_ANNOTATIONS: TimelineAnnotation[] = [
  { year: 2000, kind: 'admin', label: 'Fox inaugurated' },
  { year: 2006, kind: 'admin', label: 'Calderón inaugurated' },
  { year: 2012, kind: 'admin', label: 'Peña Nieto inaugurated' },
  { year: 2017, kind: 'event', label: 'Estafa Maestra exposed (Animal Político)' },
  { year: 2018, kind: 'admin', label: 'AMLO inaugurated · NAIM cancelled' },
  { year: 2020, kind: 'event', label: 'COVID emergency procurement begins' },
  { year: 2024, kind: 'admin', label: 'Sheinbaum inaugurated' },
]

function TimelineHourglass({
  timeline,
  eraLabels,
  countLabel,
  valueLabel,
  selectedYear,
  hoverYear,
  eraFilter,
  onHoverYear,
  onSelectYear,
  className,
}: {
  timeline: TimelineItem[]
  eraLabels: { stable: string; watch: string; alert: string }
  countLabel: string
  valueLabel: string
  selectedYear: number | null
  hoverYear: number | null
  eraFilter: EraBucket | null
  onHoverYear: (y: number | null) => void
  onSelectYear: (y: number | null) => void
  className?: string
}) {
  if (timeline.length === 0) return null

  const sorted = [...timeline].sort((a, b) => a.year - b.year)
  const minYear = sorted[0].year
  const maxYear = sorted[sorted.length - 1].year
  const yearSpan = Math.max(1, maxYear - minYear)
  const maxValue = Math.max(...sorted.map((t) => t.total_value), 1)
  const maxCount = Math.max(...sorted.map((t) => t.contract_count), 1)
  const logMaxValue = Math.log(maxValue + 1)
  const logMaxCount = Math.log(maxCount + 1)

  // Hero year — argmax(value × risk)
  const hero = sorted.reduce((max, item) => {
    const score = item.total_value * (item.avg_risk_score ?? 0)
    const maxScore = max.total_value * (max.avg_risk_score ?? 0)
    return score > maxScore ? item : max
  }, sorted[0])

  type Era = { startYear: number; endYear: number; bucket: EraBucket }
  const eras: Era[] = []
  for (const item of sorted) {
    const b = bucketOfRisk(item.avg_risk_score ?? 0)
    const last = eras[eras.length - 1]
    if (last && last.bucket === b) {
      last.endYear = item.year
    } else {
      eras.push({ startYear: item.year, endYear: item.year, bucket: b })
    }
  }

  // Layout
  const W = 720
  const H = 240
  const PAD = { left: 8, right: 8 }
  const COUNT_AREA = 76
  const VALUE_AREA = 124
  const CENTER_BAND = 18
  const Y_TOP = 8
  const Y_CENTER = Y_TOP + COUNT_AREA + CENTER_BAND / 2
  const Y_BASE_VALUE = Y_CENTER + CENTER_BAND / 2
  const innerW = W - PAD.left - PAD.right

  const xOf = (year: number) => PAD.left + ((year - minYear) / yearSpan) * innerW
  const countH = (n: number) => Math.max(2, (Math.log(n + 1) / logMaxCount) * (COUNT_AREA - 12))
  const valueH = (v: number) => Math.max(2, (Math.log(v + 1) / logMaxValue) * (VALUE_AREA - 12))
  const colorOf = (risk: number) => RISK_DOT_COLORS[getRiskLevel(risk)]

  const halfStep = innerW / yearSpan / 2

  // Helper — does a year match the active era filter?
  const matchesEraFilter = (item: TimelineItem) => {
    if (!eraFilter) return true
    return bucketOfRisk(item.avg_risk_score ?? 0) === eraFilter
  }

  const axisYears = Array.from(new Set([minYear, hero.year, maxYear])).sort((a, b) => a - b)
  const activeYear = hoverYear ?? selectedYear // hover takes precedence over pinned

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? 'w-full h-auto cursor-crosshair'}
      role="img"
      aria-label="Timeline hourglass — count and value channels"
      onMouseLeave={() => onHoverYear(null)}
    >
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
            y={Y_TOP - 4}
            width={x2 - x1}
            height={H - Y_TOP}
            fill={ERA_BG[era.bucket]}
          />
        )
      })}

      {/* Active-year highlight column — vertical band */}
      {activeYear != null && (
        <rect
          x={xOf(activeYear) - 12}
          y={Y_TOP - 4}
          width={24}
          height={H - Y_TOP}
          fill="var(--color-text-primary)"
          fillOpacity={0.05}
          stroke="var(--color-text-primary)"
          strokeOpacity={0.2}
          strokeWidth={0.6}
        />
      )}

      {/* Channel labels — left margin */}
      <text x={PAD.left + 4} y={Y_TOP + 10} fontSize={8.5} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.7} letterSpacing={0.5}>
        ▲ {countLabel.toUpperCase()}
      </text>
      <text x={PAD.left + 4} y={Y_BASE_VALUE + 10} fontSize={8.5} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.7} letterSpacing={0.5}>
        ▼ {valueLabel.toUpperCase()}
      </text>

      {/* Era ticks at the top edge */}
      {eras.filter((e) => e.endYear - e.startYear >= 1 || eras.length <= 3).map((era, i) => {
        const cx = (xOf(era.startYear) + xOf(era.endYear)) / 2
        return (
          <text
            key={`era-lbl-${i}`}
            x={cx}
            y={Y_TOP - 1}
            textAnchor="middle"
            fontSize={8}
            fontFamily="var(--font-family-mono)"
            fill={ERA_LABEL_COLOR[era.bucket]}
            fontWeight={600}
            opacity={0.85}
          >
            {eraLabels[era.bucket].toUpperCase()}
          </text>
        )
      })}

      <line x1={0} x2={W} y1={Y_CENTER} y2={Y_CENTER} stroke="var(--color-border)" strokeWidth={0.7} />

      {/* Bars — count above, value below. Each year has an invisible
          hit-area for hover/click that's wider than the visible bar. */}
      {sorted.map((item) => {
        const x = xOf(item.year)
        const isHero = item.year === hero.year
        const isActive = item.year === activeYear
        const isPinned = item.year === selectedYear
        const dimmed = !matchesEraFilter(item)
        const barW = isHero || isActive ? 8 : 5
        const cH = countH(item.contract_count)
        const vH = valueH(item.total_value)
        const risk = item.avg_risk_score ?? 0
        const valueColor = colorOf(risk)
        // Hit-area width — at least 14px or half the column gap, whichever larger
        const hitW = Math.max(14, (innerW / Math.max(1, sorted.length)) * 0.85)
        return (
          <g key={item.year}>
            {/* Invisible hit-area covering the full vertical span at this year */}
            <rect
              x={x - hitW / 2}
              y={Y_TOP}
              width={hitW}
              height={H - Y_TOP - 4}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHoverYear(item.year)}
              onClick={() => onSelectYear(item.year === selectedYear ? null : item.year)}
            />
            {/* Count bar */}
            <rect
              x={x - barW / 2}
              y={Y_CENTER - CENTER_BAND / 2 - cH}
              width={barW}
              height={cH}
              rx={1}
              fill="var(--color-text-muted)"
              opacity={dimmed ? 0.18 : (isActive ? 1 : isHero ? 0.85 : 0.55)}
              style={{ pointerEvents: 'none', transition: 'opacity 120ms ease' }}
            />
            {/* Value bar */}
            <rect
              x={x - barW / 2}
              y={Y_BASE_VALUE}
              width={barW}
              height={vH}
              rx={1}
              fill={valueColor}
              opacity={dimmed ? 0.20 : (isActive ? 1 : isHero ? 1 : 0.82)}
              style={{
                pointerEvents: 'none',
                filter: isActive || isHero ? `drop-shadow(0 0 5px ${valueColor}aa)` : undefined,
                transition: 'opacity 120ms ease',
              }}
            />
            {/* Pin marker — small dot above the year if pinned */}
            {isPinned && (
              <circle
                cx={x}
                cy={Y_TOP + 2}
                r={2.6}
                fill="var(--color-text-primary)"
                style={{ pointerEvents: 'none' }}
              />
            )}
          </g>
        )
      })}

      {/* Hero callout flag — anchored to the bottom of the value bar */}
      {(() => {
        const x = xOf(hero.year)
        const vH = valueH(hero.total_value)
        const flagW = 156
        const flagH = 34
        const flagX = Math.min(W - flagW - 4, Math.max(4, x - flagW / 2))
        const flagY = Y_BASE_VALUE + vH + 6
        const heroColor = colorOf(hero.avg_risk_score ?? 0)
        // If the flag overflows the SVG, anchor it above the count bar instead
        if (flagY + flagH > H - 4) {
          const cH = countH(hero.contract_count)
          const altY = Y_CENTER - CENTER_BAND / 2 - cH - flagH - 6
          return (
            <g>
              <line
                x1={x} y1={Y_CENTER - CENTER_BAND / 2 - cH}
                x2={x} y2={altY + flagH}
                stroke={heroColor} strokeWidth={0.6} strokeDasharray="2 2" opacity={0.55}
              />
              <rect x={flagX} y={altY} width={flagW} height={flagH} rx={2} fill="var(--color-background-card)" stroke={heroColor} strokeWidth={1} />
              <text x={flagX + 8} y={altY + 14} fontSize={11} fontFamily="var(--font-family-mono)" fontWeight={700} fill="var(--color-text-primary)">
                {hero.year} · {formatCompactMXN(hero.total_value)}
              </text>
              <text x={flagX + 8} y={altY + 26} fontSize={9} fontFamily="var(--font-family-mono)" fill={heroColor}>
                {Math.round((hero.avg_risk_score ?? 0) * 100)}% risk · {hero.contract_count} contract{hero.contract_count !== 1 ? 's' : ''}
              </text>
            </g>
          )
        }
        return (
          <g>
            <line
              x1={x} y1={Y_BASE_VALUE + vH}
              x2={x} y2={flagY}
              stroke={heroColor} strokeWidth={0.6} strokeDasharray="2 2" opacity={0.55}
            />
            <rect x={flagX} y={flagY} width={flagW} height={flagH} rx={2} fill="var(--color-background-card)" stroke={heroColor} strokeWidth={1} />
            <text x={flagX + 8} y={flagY + 14} fontSize={11} fontFamily="var(--font-family-mono)" fontWeight={700} fill="var(--color-text-primary)">
              {hero.year} · {formatCompactMXN(hero.total_value)}
            </text>
            <text x={flagX + 8} y={flagY + 26} fontSize={9} fontFamily="var(--font-family-mono)" fill={heroColor}>
              {Math.round((hero.avg_risk_score ?? 0) * 100)}% risk · {hero.contract_count} contract{hero.contract_count !== 1 ? 's' : ''}
            </text>
          </g>
        )
      })()}

      {/* Year axis labels — sit on the centerline */}
      {axisYears.map((y, i) => {
        const cx = xOf(y)
        const anchor: 'start' | 'middle' | 'end' = i === 0 ? 'start' : i === axisYears.length - 1 ? 'end' : 'middle'
        const isHero = y === hero.year
        return (
          <text
            key={y}
            x={cx}
            y={Y_CENTER + 4}
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

      {/* Mexican procurement-context annotation pins — admin transitions
          and major scandals. Only render pins for events that fall
          within the vendor's [first, last] year range to avoid clutter.
          Render LAST so they sit on top of bars + grid. */}
      {TIMELINE_ANNOTATIONS.filter((a) => a.year >= minYear && a.year <= maxYear).map((a) => {
        const cx = xOf(a.year)
        const isEvent = a.kind === 'event'
        const pinColor = isEvent ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'
        return (
          <g key={`anno-${a.year}-${a.kind}`} className="cursor-help">
            <title>{a.year} · {a.label}</title>
            {/* Vertical guide line — faint */}
            <line
              x1={cx}
              x2={cx}
              y1={Y_TOP - 4}
              y2={H - 4}
              stroke={pinColor}
              strokeWidth={0.5}
              strokeDasharray={isEvent ? '0' : '1 3'}
              opacity={isEvent ? 0.35 : 0.2}
            />
            {/* Pin head — small triangle at the top of the chart */}
            <polygon
              points={`${cx},${Y_TOP - 4} ${cx - 3},${Y_TOP - 9} ${cx + 3},${Y_TOP - 9}`}
              fill={pinColor}
              opacity={isEvent ? 1 : 0.6}
            />
            {/* Hover-target — invisible larger triangle for easier hovering */}
            <circle
              cx={cx}
              cy={Y_TOP - 6}
              r={6}
              fill="transparent"
            />
          </g>
        )
      })}
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
  // Interactive state — hover (transient), pinned (sticky), era filter
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [eraFilter, setEraFilter] = useState<EraBucket | null>(null)

  const sortedTimeline = [...timeline].sort((a, b) => a.year - b.year)
  const minYear = sortedTimeline[0]?.year ?? vendorFirstYear ?? 2010
  const maxYear = sortedTimeline[sortedTimeline.length - 1]?.year ?? vendorLastYear ?? 2025
  const displayTotal = totalContracts ?? sortedTimeline.reduce((s, item) => s + item.contract_count, 0)

  // Era summary line — auto-generated narrative footer
  const totalValue = sortedTimeline.reduce((s, item) => s + item.total_value, 0)
  const alertItems = sortedTimeline.filter((item) => bucketOfRisk(item.avg_risk_score ?? 0) === 'alert')
  const alertValue = alertItems.reduce((s, item) => s + item.total_value, 0)
  const alertShare = totalValue > 0 ? (alertValue / totalValue) * 100 : 0
  const inflectionYear = alertItems.length > 0 ? alertItems[0].year : null

  // Per-bucket counts for filter pill labels
  const bucketCounts = sortedTimeline.reduce(
    (acc, item) => {
      const b = bucketOfRisk(item.avg_risk_score ?? 0)
      acc[b] = (acc[b] ?? 0) + 1
      return acc
    },
    {} as Record<EraBucket, number>
  )

  // Active year for the detail panel (hover wins, then selected, else hero)
  const heroForFallback = sortedTimeline.reduce(
    (max, item) => {
      const score = item.total_value * (item.avg_risk_score ?? 0)
      const maxScore = max.total_value * (max.avg_risk_score ?? 0)
      return score > maxScore ? item : max
    },
    sortedTimeline[0] ?? { year: 0, total_value: 0, avg_risk_score: 0, contract_count: 0 }
  )
  const detailYear = hoverYear ?? selectedYear
  const detailItem =
    detailYear != null
      ? sortedTimeline.find((item) => item.year === detailYear) ?? heroForFallback
      : heroForFallback
  const detailRisk = detailItem.avg_risk_score ?? 0
  const detailColor = RISK_DOT_COLORS[getRiskLevel(detailRisk)]
  const detailBucket = bucketOfRisk(detailRisk)
  const detailValueShare = totalValue > 0 ? (detailItem.total_value / totalValue) * 100 : 0

  return (
    <ChapterShell id="chapter-timeline">
      <RedThreadChapter
        label={t('chapters.headings.timeline')}
        title={t('timeline.heading', { total: formatNumber(displayTotal), minYear, maxYear })}
      />
      <p className="text-text-secondary mb-1 max-w-2xl text-sm leading-relaxed">
        {t('timeline.hourglassDescription')}
      </p>
      <p className="text-text-muted mb-3 max-w-2xl text-[11px] font-mono leading-relaxed">
        {t('timeline.hourglassLegend')}
      </p>

      {/* Era filter pills — click to dim non-matching years */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted mr-1">
          {t('timeline.filter')}
        </span>
        {(['all', 'stable', 'watch', 'alert'] as const).map((key) => {
          const isAll = key === 'all'
          const active = isAll ? eraFilter === null : eraFilter === key
          const count = isAll ? sortedTimeline.length : (bucketCounts[key as EraBucket] ?? 0)
          const accent = isAll
            ? 'var(--color-text-secondary)'
            : ERA_LABEL_COLOR[key as EraBucket]
          return (
            <button
              key={key}
              type="button"
              onClick={() => setEraFilter(isAll ? null : (key as EraBucket))}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-[10px] font-mono uppercase tracking-[0.1em] transition-colors"
              style={{
                borderColor: active ? accent : 'var(--color-border)',
                color: active ? accent : 'var(--color-text-secondary)',
                backgroundColor: active ? `${accent}10` : 'transparent',
              }}
            >
              <span>{isAll ? t('timeline.eraAll') : t(`timeline.era.${key}`)}</span>
              <span className="font-bold tabular-nums">{count}</span>
            </button>
          )
        })}
        {selectedYear != null && (
          <button
            type="button"
            onClick={() => setSelectedYear(null)}
            className="ml-auto text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted hover:text-text-primary transition-colors"
          >
            {t('timeline.unpin')}
          </button>
        )}
      </div>

      <TimelineHourglass
        timeline={sortedTimeline}
        eraLabels={{
          stable: t('timeline.era.stable'),
          watch:  t('timeline.era.watch'),
          alert:  t('timeline.era.alert'),
        }}
        countLabel={t('timeline.countAxis')}
        valueLabel={t('timeline.valueAxis')}
        selectedYear={selectedYear}
        hoverYear={hoverYear}
        eraFilter={eraFilter}
        onHoverYear={setHoverYear}
        onSelectYear={setSelectedYear}
      />

      {/* Detail panel — shows the active year's full breakdown.
          Falls back to the hero year when nothing is hovered/pinned. */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 px-3 py-2.5 rounded-sm border border-border bg-background-card/40">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {hoverYear != null
              ? t('timeline.detail.hovering')
              : selectedYear != null
              ? t('timeline.detail.pinned')
              : t('timeline.detail.spotlight')}
          </p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">{detailItem.year}</p>
          <p className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: ERA_LABEL_COLOR[detailBucket] }}>
            {t(`timeline.era.${detailBucket}`)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">{t('timeline.detail.contracts')}</p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">{formatNumber(detailItem.contract_count)}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">{t('timeline.detail.value')}</p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">{formatCompactMXN(detailItem.total_value)}</p>
          <p className="text-[10px] font-mono tabular-nums text-text-muted">{detailValueShare.toFixed(1)}% {t('timeline.detail.ofTotal')}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">{t('timeline.detail.avgRisk')}</p>
          <p className="text-base font-bold font-mono tabular-nums leading-tight" style={{ color: detailColor }}>
            {Math.round(detailRisk * 100)}%
          </p>
        </div>
      </div>

      {/* Auto-generated era narrative */}
      {inflectionYear && alertShare > 0 && (
        <p className="mt-3 text-xs text-text-secondary leading-relaxed max-w-2xl">
          <span className="font-mono uppercase tracking-[0.12em] text-[10px]" style={{ color: 'var(--color-risk-critical)' }}>
            {t('timeline.era.alert')}
          </span>
          {' '}— {t('timeline.eraNarrative', {
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

  // Cap diagnostic panel at 6 rows. Below 6 the contributions are <0.05
  // and add visual noise without explaining the pattern.
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

      {/* Diagnostic panel — replaces the SHAP waterfall with a medical
          lab-report layout. Each row shows the feature on a -3σ to +3σ
          axis with sector p25-p75 reference band, vendor's marker dot,
          and contribution value. Reader sees instantly which "lab values"
          are out of normal range vs within the population. */}
      <div ref={ref}>
        <PatternDiagnostic
          features={sortedSix}
          inView={inView}
          raisesLabel={t('pattern.raisesRisk', { defaultValue: 'raises' })}
          lowersLabel={t('pattern.lowersRisk', { defaultValue: 'lowers' })}
          referenceLabel={t('pattern.sectorReference', { defaultValue: 'sector p25–p75' })}
          diagnosisLabel={t('pattern.diagnosis', {
            defaultValue: '{{anomalous}} of {{total}} lab values outside sector reference range',
            anomalous: sortedSix.filter((f) => Math.abs(f.z_score) >= 1).length,
            total: sortedSix.length,
          })}
        />
      </div>

      {safeWaterfall.length === 0 && (
        <div className="text-text-secondary text-sm italic">{t('pattern.noData')}</div>
      )}

      <p className="text-[10px] text-text-muted italic mt-2 leading-relaxed">
        {t('pattern.shapNote')}
      </p>
    </ChapterShell>
  )
}

/**
 * PatternDiagnostic — medical lab-report layout for SHAP-style risk
 * decomposition. Each row is one feature ("test"), rendered as:
 *
 *   FEATURE LABEL ┃ -3σ ─── [p25══p75] ───●─── +3σ ┃ +0.248
 *
 * Where:
 *   • The horizontal scale spans -3σ to +3σ (sector standardized)
 *   • The lighter band marks the sector p25-p75 reference range
 *     (assumed roughly ±0.674σ for a normal distribution)
 *   • The marker is the vendor's z-score, colored red if it pushes
 *     risk up and the sample is in the tail (|z| ≥ 1)
 *   • The contribution badge shows the SHAP-style risk contribution
 *
 * The layout reads like a CBC or metabolic panel — designers in the
 * journalism world (FT, NYT) lean on the lab-report metaphor because
 * it inherits credibility from medicine. The same metaphor works
 * here: this is a *diagnosis*, not an opinion.
 */
function PatternDiagnostic({
  features,
  inView,
  raisesLabel,
  lowersLabel,
  referenceLabel,
  diagnosisLabel,
}: {
  features: Array<{ feature: string; contribution: number; z_score: number; label_en: string }>
  inView: boolean
  raisesLabel: string
  lowersLabel: string
  referenceLabel: string
  diagnosisLabel: string
}) {
  // Chart dimensions per row (SVG, scales to container width)
  const SCALE_W = 380
  const ROW_H = 30
  const Z_RANGE = 3 // axis spans -3σ to +3σ

  // For each row, compute marker position and color
  const xOf = (z: number) => {
    const clamped = Math.max(-Z_RANGE, Math.min(Z_RANGE, z))
    return ((clamped + Z_RANGE) / (2 * Z_RANGE)) * SCALE_W
  }

  return (
    <div>
      {/* Diagnosis line — auto-summarizes the panel */}
      <div className="flex items-baseline gap-2 mb-3 pb-2 border-b border-border">
        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted">Diagnosis</span>
        <span className="text-xs text-text-secondary">{diagnosisLabel}</span>
      </div>

      {/* Header row — column titles */}
      <div className="grid grid-cols-[140px_1fr_64px] gap-3 items-center mb-1.5 pb-1 text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted opacity-70">
        <div>Feature</div>
        <div className="flex items-center justify-between">
          <span>−3σ</span>
          <span className="opacity-50">sector mean</span>
          <span>+3σ</span>
        </div>
        <div className="text-right">SHAP</div>
      </div>

      {/* Lab rows */}
      <div className="space-y-0.5">
        {features.map((f, idx) => {
          const isPositive = f.contribution > 0
          const isAnomalous = Math.abs(f.z_score) >= 1
          const markerColor = isPositive
            ? (isAnomalous ? 'var(--color-risk-critical)' : 'var(--color-risk-medium)')
            : 'var(--color-text-muted)'
          const contribColor = isPositive
            ? (isAnomalous ? 'var(--color-risk-critical)' : 'var(--color-risk-high)')
            : 'var(--color-text-muted)'
          const markerX = xOf(f.z_score)
          // Slide-in delay creates a "rolling" reveal
          const delay = inView ? `${idx * 60}ms` : '0ms'
          return (
            <div
              key={f.feature}
              className={cn(
                'grid grid-cols-[140px_1fr_64px] gap-3 items-center px-1 py-1 rounded-sm border-l-2 transition-opacity',
                isAnomalous && isPositive ? 'bg-[color:var(--color-risk-critical)]/[0.04]' : ''
              )}
              style={{
                borderLeftColor: isAnomalous && isPositive ? markerColor : 'transparent',
                opacity: inView ? 1 : 0,
                transition: `opacity 0.4s ease ${delay}`,
              }}
            >
              {/* Feature name */}
              <div className="min-w-0">
                <div className="text-[12px] text-text-primary leading-tight truncate" title={f.label_en}>
                  {f.label_en}
                </div>
                <div className="text-[9px] font-mono tabular-nums text-text-muted">
                  z={f.z_score.toFixed(2)}σ · {isPositive ? raisesLabel : lowersLabel}
                </div>
              </div>

              {/* Lab scale */}
              <svg
                viewBox={`0 0 ${SCALE_W} ${ROW_H}`}
                className="w-full"
                preserveAspectRatio="none"
                style={{ height: ROW_H }}
                role="img"
                aria-label={`${f.label_en} z-score lab scale`}
              >
                {/* Background scale rail */}
                <line
                  x1={0} x2={SCALE_W}
                  y1={ROW_H / 2} y2={ROW_H / 2}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                />
                {/* Sector reference band p25-p75 ≈ ±0.674σ */}
                <rect
                  x={xOf(-0.674)}
                  y={ROW_H / 2 - 5}
                  width={xOf(0.674) - xOf(-0.674)}
                  height={10}
                  fill="var(--color-text-muted)"
                  fillOpacity={0.08}
                  stroke="var(--color-border)"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                />
                {/* Center tick — sector mean */}
                <line
                  x1={xOf(0)} x2={xOf(0)}
                  y1={ROW_H / 2 - 6} y2={ROW_H / 2 + 6}
                  stroke="var(--color-text-muted)"
                  strokeWidth={0.6}
                  opacity={0.5}
                />
                {/* ±2σ tail markers */}
                {[-2, 2].map((z) => (
                  <line
                    key={z}
                    x1={xOf(z)} x2={xOf(z)}
                    y1={ROW_H / 2 - 3} y2={ROW_H / 2 + 3}
                    stroke="var(--color-text-muted)"
                    strokeWidth={0.5}
                    opacity={0.35}
                  />
                ))}
                {/* Out-of-range tail tinting (only when in tail) */}
                {Math.abs(f.z_score) >= 2 && (
                  <rect
                    x={f.z_score > 0 ? xOf(2) : 0}
                    y={ROW_H / 2 - 5}
                    width={f.z_score > 0 ? SCALE_W - xOf(2) : xOf(-2)}
                    height={10}
                    fill={markerColor}
                    fillOpacity={0.10}
                  />
                )}
                {/* Vendor marker dot */}
                <circle
                  cx={markerX}
                  cy={ROW_H / 2}
                  r={5}
                  fill={markerColor}
                  stroke="var(--color-background)"
                  strokeWidth={1.5}
                  style={isAnomalous ? { filter: `drop-shadow(0 0 3px ${markerColor}aa)` } : undefined}
                />
              </svg>

              {/* SHAP contribution */}
              <div className="text-right">
                <span
                  className="text-[12px] font-mono font-bold tabular-nums"
                  style={{ color: contribColor }}
                >
                  {isPositive ? '+' : ''}{f.contribution.toFixed(3)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reference legend — explains the band */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted opacity-70">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-2 rounded-sm border border-dashed" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(115,115,115,0.08)' }} />
          {referenceLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-risk-critical)' }} />
          tail (|z| ≥ 1) raises risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-text-muted)' }} />
          within range or protective
        </span>
      </div>
    </div>
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
 * ConcentricConstellation — vendor reach topology, three rings.
 *
 *   • OUTER RING (always present): N institutional dots evenly placed.
 *     Anonymous because we don't have per-institution detail at this
 *     resolution, but the *count* and the *radial spread* communicate
 *     reach. Sector palette tints the dots.
 *   • INNER RING (when present): up to 8 co-bidder nodes sized by
 *     co_bid_count, colored by inferred role, edges to the vendor.
 *     Click any node → that vendor's thread.
 *   • CENTER: pulsing vendor node.
 *   • BACKGROUND: faint radial gradient in the primary sector color
 *     creates atmosphere without dominating.
 *
 * Critical innovation: this composition WORKS even when co-bidders=0,
 * because the institutional ring is always there. A single-source
 * vendor with no co-bidders still has a meaningful "constellation" —
 * just one with empty negative space at the inner ring, which BECOMES
 * the story ("no coordinated bidding detected").
 */
function ConcentricConstellation({
  subjectName,
  sectorName,
  totalInstitutions,
  sectorsCount,
  coBidders,
  t,
  i18n,
}: {
  subjectName: string
  sectorName: string | null
  totalInstitutions: number
  sectorsCount: number
  coBidders: Array<{ vendor_id: number; vendor_name: string; co_bid_count: number; win_count: number; loss_count: number; same_winner_ratio: number; relationship_strength: string }>
  t: TFunction
  i18n: { language: string }
}) {
  const W = 720
  const H = 340
  const cx = W / 2
  const cy = H / 2 + 6
  const innerR = 78
  const outerR = 144

  const sectorColor = sectorName ? (SECTOR_COLORS[sectorName.toLowerCase()] ?? '#a06820') : '#a06820'

  // Outer ring: place totalInstitutions institution dots, capped at 24
  const visibleInst = Math.min(totalInstitutions, 24)

  // Inner ring: top 8 co-bidders by co_bid_count.
  const top = [...coBidders].sort((a, b) => b.co_bid_count - a.co_bid_count).slice(0, 8)
  const maxCoBids = Math.max(...top.map((c) => c.co_bid_count), 1)
  const hasCoBidders = top.length > 0

  // Stable IDs scoped to this instance — defs collide if multiple
  // constellations render on one page; namespace by vendor name length + first char.
  const idSuffix = `${subjectName.length}-${subjectName.charCodeAt(0) || 0}`
  const bgGradId = `constellation-bg-${idSuffix}`
  const dotGlowId = `constellation-glow-${idSuffix}`
  const centerGlowId = `constellation-core-${idSuffix}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Vendor reach constellation">
      <defs>
        {/* Background atmospheric tint */}
        <radialGradient id={bgGradId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={sectorColor} stopOpacity={0.14} />
          <stop offset="50%" stopColor={sectorColor} stopOpacity={0.06} />
          <stop offset="100%" stopColor={sectorColor} stopOpacity={0} />
        </radialGradient>
        {/* Star-like radial gradient for institutional dots — gives a "glowing" look */}
        <radialGradient id={dotGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={sectorColor} stopOpacity={1} />
          <stop offset="55%" stopColor={sectorColor} stopOpacity={0.8} />
          <stop offset="100%" stopColor={sectorColor} stopOpacity={0} />
        </radialGradient>
        {/* Vendor center halo */}
        <radialGradient id={centerGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-risk-critical)" stopOpacity={0.45} />
          <stop offset="60%" stopColor="var(--color-risk-critical)" stopOpacity={0.10} />
          <stop offset="100%" stopColor="var(--color-risk-critical)" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Atmospheric background */}
      <rect x={0} y={0} width={W} height={H} fill={`url(#${bgGradId})`} />

      {/* Sector petal arcs — divide the canvas into N sector wedges if
          sectorsCount ≥ 2. Subtle dashed radial guides + a small label arc.
          Adds the "this vendor crosses N sectors" dimension visually. */}
      {sectorsCount >= 2 && Array.from({ length: sectorsCount }).map((_, i) => {
        const angle = (i / sectorsCount) * Math.PI * 2 - Math.PI / 2
        const xEnd = cx + Math.cos(angle) * (outerR + 8)
        const yEnd = cy + Math.sin(angle) * (outerR + 8)
        return (
          <line
            key={`sector-divider-${i}`}
            x1={cx}
            y1={cy}
            x2={xEnd}
            y2={yEnd}
            stroke={sectorColor}
            strokeWidth={0.4}
            strokeDasharray="2 6"
            opacity={0.25}
          />
        )
      })}

      {/* Radial spokes — vendor → each institution. Faint sector-color
          lines that give the constellation depth and signal "every
          institution is connected to the vendor." Renders before nodes
          so dots overlay them cleanly. */}
      {Array.from({ length: visibleInst }).map((_, i) => {
        const angle = (i / visibleInst) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(angle) * outerR
        const y = cy + Math.sin(angle) * outerR
        return (
          <line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={sectorColor}
            strokeWidth={0.5}
            opacity={0.18}
          />
        )
      })}

      {/* Outer ring guide — faint dashed circle */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke={sectorColor} strokeWidth={0.7} strokeDasharray="1 5" opacity={0.5} />

      {/* Outer ring nodes — institutions, now as glowing star-like dots */}
      {Array.from({ length: visibleInst }).map((_, i) => {
        const angle = (i / visibleInst) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(angle) * outerR
        const y = cy + Math.sin(angle) * outerR
        return (
          <g key={`inst-${i}`}>
            {/* Halo */}
            <circle cx={x} cy={y} r={9} fill={`url(#${dotGlowId})`} opacity={0.6} />
            {/* Core */}
            <circle cx={x} cy={y} r={3.6} fill={sectorColor} stroke="var(--color-background)" strokeWidth={0.8} />
          </g>
        )
      })}

      {/* Inner ring guide — solid when co-bidders present, dashed-ghost when empty */}
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="none"
        stroke={hasCoBidders ? 'var(--color-border)' : 'var(--color-text-muted)'}
        strokeWidth={hasCoBidders ? 0.8 : 1}
        strokeDasharray={hasCoBidders ? '0' : '3 5'}
        opacity={hasCoBidders ? 0.55 : 0.5}
      />

      {/* Inner ring: co-bidder nodes + edges */}
      {hasCoBidders && top.map((cb, i) => {
        const angle = (i / top.length) * Math.PI * 2 - Math.PI / 2 + Math.PI / 8
        const x = cx + Math.cos(angle) * innerR
        const y = cy + Math.sin(angle) * innerR
        const role = classifyRole(cb, t)
        const strokeW = 0.6 + (cb.co_bid_count / maxCoBids) * 2.2
        const nodeR = 4 + (cb.co_bid_count / maxCoBids) * 4
        const labelR = innerR + 18
        const lx = cx + Math.cos(angle) * labelR
        const ly = cy + Math.sin(angle) * labelR + 3
        const anchor: 'start' | 'middle' | 'end' = Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle'
        return (
          <g key={`cb-${cb.vendor_id}`}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={role.color} strokeWidth={strokeW} opacity={0.55} />
            <Link to={`/thread/${cb.vendor_id}`}>
              <title>{cb.vendor_name} · {cb.co_bid_count} co-bids · {role.label}</title>
              <circle cx={x} cy={y} r={nodeR + 8} fill="transparent" />
              {/* Halo glow */}
              <circle cx={x} cy={y} r={nodeR + 4} fill={role.color} opacity={0.18} />
              <circle cx={x} cy={y} r={nodeR} fill={role.color} stroke="var(--color-background)" strokeWidth={1.4} />
              <text x={lx} y={ly} textAnchor={anchor} fontSize={9} fontFamily="var(--font-family-mono)" fill="var(--color-text-secondary)">
                {formatVendorName(cb.vendor_name, 16)}
              </text>
            </Link>
          </g>
        )
      })}

      {/* Empty inner-ring annotation — for vendors with 0 co-bidders */}
      {!hasCoBidders && (
        <g>
          <text x={cx} y={cy - innerR + 14} textAnchor="middle" fontSize={9} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" letterSpacing={1.2}>
            {t('network.noCoordinatedBidding')}
          </text>
          <text x={cx} y={cy - innerR + 26} textAnchor="middle" fontSize={8} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.6}>
            {t('network.noCoordinatedBiddingNote')}
          </text>
        </g>
      )}

      {/* Subject — multi-layered halo at center */}
      <circle cx={cx} cy={cy} r={32} fill={`url(#${centerGlowId})`} />
      <circle cx={cx} cy={cy} r={22} fill="var(--color-risk-critical)" opacity={0.18}>
        <animate attributeName="r" values="22;28;22" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.18;0.32;0.18" dur="2.6s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={11} fill="var(--color-risk-critical)" stroke="var(--color-background)" strokeWidth={1.8} />
      <circle cx={cx} cy={cy} r={4} fill="var(--color-background)" opacity={0.85} />

      {/* Subject label — Playfair italic editorial type instead of plain mono */}
      <text
        x={cx}
        y={cy + 36}
        textAnchor="middle"
        fontSize={12}
        fontFamily="var(--font-family-serif)"
        fontStyle="italic"
        fontWeight={700}
        fill="var(--color-text-primary)"
      >
        {formatVendorName(subjectName, 28)}
      </text>

      {/* Ring labels — annotate counts. Use Spanish/English from i18n. */}
      <text x={W - 14} y={28} textAnchor="end" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing={1.2} fill="var(--color-text-muted)">
        {totalInstitutions} {t('network.ringLabels.institutions')}
        {totalInstitutions > visibleInst && ` (${visibleInst} ${t('network.ringLabels.shown')})`}
      </text>
      <text x={W - 14} y={42} textAnchor="end" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing={1.2} fill="var(--color-text-muted)">
        {sectorsCount} {sectorsCount === 1 ? t('network.ringLabels.sector') : t('network.ringLabels.sectors')}
        {sectorName ? ` · ${sectorName.toUpperCase()}` : ''}
      </text>
      <text x={14} y={28} textAnchor="start" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing={1.2} fill={hasCoBidders ? 'var(--color-text-secondary)' : 'var(--color-text-muted)'}>
        {coBidders.length} {coBidders.length === 1 ? t('network.ringLabels.coBidder') : t('network.ringLabels.coBidders')}
      </text>

      {/* Bottom-edge legend — i18n-aware encoding hint */}
      <text x={W - 14} y={H - 8} textAnchor="end" fontSize={8.5} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.55}>
        {i18n.language.startsWith('es')
          ? 'ANILLO EXTERIOR = INSTITUCIONES · ANILLO INTERIOR = CO-LICITANTES'
          : 'OUTER RING = INSTITUTIONS · INNER RING = CO-BIDDERS'}
      </text>
    </svg>
  )
}

/**
 * InstitutionalRibbon — second graph in the Network chapter. Each
 * institution gets one horizontal lane spanning [first_year, last_year],
 * rendered as a colored ribbon. Ribbon thickness encodes log(value);
 * ribbon color encodes avg_risk; the institution's name + value badge
 * sit on the left, contract count + risk pct on the right.
 *
 * The lane composition surfaces THREE dimensions at once:
 *   • TENURE — when the relationship was active (ribbon span)
 *   • SCALE — how much money flowed there (ribbon height)
 *   • RISK  — how anomalous the relationship was (ribbon color)
 *
 * Hover any ribbon to highlight; click navigates to the institution
 * profile. Top concentration is auto-annotated below the chart.
 */
function InstitutionalRibbon({
  institutions,
  vendorFirstYear,
  vendorLastYear,
  i18n,
}: {
  institutions: Array<{
    institution_id: number
    institution_name: string
    institution_type?: string
    contract_count: number
    total_value_mxn: number
    avg_risk_score?: number
    first_year?: number
    last_year?: number
  }>
  vendorFirstYear: number
  vendorLastYear: number
  i18n: { language: string }
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  // Sort institutions by total_value desc — biggest relationships at the top
  const sorted = [...institutions]
    .filter((inst) => inst.total_value_mxn > 0)
    .sort((a, b) => b.total_value_mxn - a.total_value_mxn)
    .slice(0, 12) // Cap at 12 lanes for legibility

  if (sorted.length === 0) return null

  // Year axis — use vendor's full active range so all ribbons align
  const minYear = Math.min(...sorted.map((i) => i.first_year ?? vendorFirstYear), vendorFirstYear)
  const maxYear = Math.max(...sorted.map((i) => i.last_year ?? vendorLastYear), vendorLastYear)
  const yearSpan = Math.max(1, maxYear - minYear + 1)

  const maxValue = Math.max(...sorted.map((i) => i.total_value_mxn), 1)
  const logMaxValue = Math.log(maxValue + 1)

  // Concentration metric — % of total value flowing to the top institution
  const totalValue = sorted.reduce((s, i) => s + i.total_value_mxn, 0)
  const topShare = (sorted[0].total_value_mxn / totalValue) * 100

  const colorOf = (risk: number) => RISK_DOT_COLORS[getRiskLevel(risk)]
  const ribbonHeight = (value: number) => 6 + (Math.log(value + 1) / logMaxValue) * 18 // 6-24px

  // Y-axis ticks for the year axis
  const axisYears: number[] = []
  const yearTickCount = 5
  for (let i = 0; i < yearTickCount; i++) {
    axisYears.push(Math.round(minYear + ((yearSpan - 1) * i) / (yearTickCount - 1)))
  }
  const uniqueAxisYears = Array.from(new Set(axisYears))

  return (
    <div>
      {/* Year axis at top */}
      <div className="relative pb-2 border-b border-border mb-2">
        <div className="grid items-end" style={{ gridTemplateColumns: '160px 1fr 80px', gap: '12px' }}>
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {i18n.language.startsWith('es') ? 'Institución' : 'Institution'}
          </span>
          <div className="relative h-3">
            {uniqueAxisYears.map((y, i) => {
              const xPct = ((y - minYear) / (yearSpan - 1)) * 100
              return (
                <span
                  key={y}
                  className="absolute -translate-x-1/2 text-[9px] font-mono tabular-nums text-text-muted"
                  style={{ left: `${xPct}%`, top: 0 }}
                >
                  {i === 0 ? y : i === uniqueAxisYears.length - 1 ? y : y}
                </span>
              )
            })}
          </div>
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted text-right">
            {i18n.language.startsWith('es') ? 'Valor · contratos' : 'Value · contracts'}
          </span>
        </div>
      </div>

      {/* Lanes */}
      <div className="space-y-1">
        {sorted.map((inst, idx) => {
          const start = inst.first_year ?? minYear
          const end = inst.last_year ?? maxYear
          const startPct = ((start - minYear) / (yearSpan - 1)) * 100
          const widthPct = Math.max(2.5, ((end - start + 1) / yearSpan) * 100)
          const risk = inst.avg_risk_score ?? 0
          const color = colorOf(risk)
          const height = ribbonHeight(inst.total_value_mxn)
          const isHover = hoverIdx === idx

          return (
            <Link
              key={inst.institution_id}
              to={`/institutions/${inst.institution_id}`}
              className="block group"
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <div
                className={cn(
                  'grid items-center py-1 px-1 rounded-sm transition-colors',
                  isHover ? 'bg-background-elevated' : ''
                )}
                style={{ gridTemplateColumns: '160px 1fr 80px', gap: '12px' }}
              >
                {/* Institution name */}
                <div className="min-w-0">
                  <div
                    className="text-[11px] text-text-primary truncate group-hover:text-[var(--color-risk-critical)] transition-colors"
                    title={inst.institution_name}
                  >
                    {inst.institution_name}
                  </div>
                  {inst.institution_type && (
                    <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-text-muted truncate">
                      {inst.institution_type}
                    </div>
                  )}
                </div>

                {/* Lane — ribbon spans first→last year */}
                <div className="relative h-7 rounded-sm bg-background-elevated/40 border border-border/40">
                  {/* Faint full-span baseline */}
                  <div className="absolute inset-y-0 left-0 right-0 my-auto h-px bg-border/30" />
                  {/* Ribbon */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 rounded-sm transition-all"
                    style={{
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                      height: `${height}px`,
                      backgroundColor: color,
                      opacity: isHover ? 1 : 0.78,
                      boxShadow: isHover ? `0 0 6px 1px ${color}aa` : 'none',
                    }}
                  >
                    {/* Inline year tag at the start of the ribbon if width allows */}
                    {widthPct > 12 && (
                      <span
                        className="absolute inset-y-0 left-1.5 flex items-center text-[9px] font-mono tabular-nums text-text-primary/90 whitespace-nowrap"
                        style={{ mixBlendMode: 'plus-lighter' }}
                      >
                        {start === end ? `${start}` : `${start}–${end}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Value + count badge */}
                <div className="text-right">
                  <div className="text-[11px] font-mono tabular-nums font-bold text-text-primary leading-tight">
                    {formatCompactMXN(inst.total_value_mxn)}
                  </div>
                  <div className="text-[9px] font-mono tabular-nums text-text-muted leading-tight">
                    {inst.contract_count}c · {Math.round(risk * 100)}%
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Concentration callout */}
      <p className="mt-3 text-xs text-text-secondary leading-relaxed">
        <span className="font-mono uppercase tracking-[0.12em] text-[10px] text-text-muted">
          {i18n.language.startsWith('es') ? 'Concentración' : 'Concentration'}
        </span>
        {' '}— {i18n.language.startsWith('es') ? (
          <>
            {topShare.toFixed(0)}% del valor fluyó a {' '}
            <span className="text-text-primary font-medium">{sorted[0].institution_name}</span>
            {topShare > 50 && <span className="text-[var(--color-risk-critical)] font-medium"> (captura institucional probable)</span>}
            .
          </>
        ) : (
          <>
            {topShare.toFixed(0)}% of value flowed to {' '}
            <span className="text-text-primary font-medium">{sorted[0].institution_name}</span>
            {topShare > 50 && <span className="text-[var(--color-risk-critical)] font-medium"> (likely institutional capture)</span>}
            .
          </>
        )}
      </p>
    </div>
  )
}

function ChapterNetwork({ vendorId, vendor, coBidders, institutions, t, i18n }: {
  vendorId: number
  vendor: { name: string; total_institutions: number; sectors_count: number; primary_sector_name?: string | null; first_contract_year?: number; last_contract_year?: number }
  coBidders: Array<{ vendor_id: number; vendor_name: string; co_bid_count: number; win_count: number; loss_count: number; same_winner_ratio: number; relationship_strength: string }> | null
  institutions: Array<{
    institution_id: number
    institution_name: string
    institution_type?: string
    contract_count: number
    total_value_mxn: number
    avg_risk_score?: number
    first_year?: number
    last_year?: number
  }> | null
  t: TFunction
  i18n: { language: string }
}) {
  const totalCoBidders = coBidders?.length ?? 0
  const topCoBidder = coBidders?.[0] ?? null
  const sectorName = vendor.primary_sector_name ?? null

  // Topology read — interprets the constellation in plain language
  const topologyRead =
    totalCoBidders === 0 && vendor.total_institutions <= 5
      ? t('network.topology.tightSingleSource')
      : totalCoBidders === 0
      ? t('network.topology.broadSingleSource')
      : totalCoBidders <= 3
      ? t('network.topology.thinNetwork')
      : t('network.topology.denseNetwork')

  return (
    <ChapterShell id="chapter-network">
      <RedThreadChapter label={t('chapters.headings.network')} title={t('network.heading')} />
      <p className="text-text-secondary mb-3 max-w-2xl text-sm leading-relaxed">
        {t('network.constellationDescription')}
      </p>

      {/* The constellation — always renders, even with 0 co-bidders */}
      <div className="bg-background-card border border-border rounded-sm p-4 mb-3">
        {coBidders === null ? (
          <div className="h-[340px] rounded bg-background-elevated animate-pulse" />
        ) : (
          <ConcentricConstellation
            subjectName={vendor.name}
            sectorName={sectorName}
            totalInstitutions={vendor.total_institutions}
            sectorsCount={vendor.sectors_count}
            coBidders={coBidders}
            t={t}
            i18n={i18n}
          />
        )}
      </div>

      {/* Topology read — plain-language interpretation */}
      <p className="text-xs text-text-secondary mb-3 max-w-2xl leading-relaxed">
        <span className="font-mono uppercase tracking-[0.12em] text-[10px] text-text-muted">{t('network.topologyRead')}</span>
        {' '}— {topologyRead}
      </p>

      {/* Top co-bidder callout — only when present */}
      {topCoBidder && (
        <p className="text-xs text-text-secondary mb-3 max-w-2xl leading-relaxed">
          <span className="text-text-muted">{t('network.mostFrequent')}</span>{' '}
          <Link
            to={`/thread/${topCoBidder.vendor_id}`}
            className="font-bold text-text-primary hover:text-[var(--color-risk-critical)] transition-colors"
          >
            {formatVendorName(topCoBidder.vendor_name, 50)}
          </Link>
          {' '}— {t('network.sharedProcedures', { count: topCoBidder.co_bid_count })}, {classifyRole(topCoBidder, t).label.toLowerCase()}.
        </p>
      )}

      {/* Second graph — InstitutionalRibbon. Each institution is one
          horizontal lane spanning their first→last contract year, with
          ribbon thickness encoding value and color encoding avg risk.
          Top concentration is auto-annotated. */}
      {institutions && institutions.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-1.5">
            {t('network.institutionalRibbonLabel')}
          </p>
          <h3 className="font-serif text-base font-bold text-text-primary mb-2" style={{ fontFamily: 'var(--font-family-serif)' }}>
            {t('network.institutionalRibbonHeading')}
          </h3>
          <p className="text-text-secondary mb-4 max-w-2xl text-xs leading-relaxed">
            {t('network.institutionalRibbonDescription')}
          </p>
          <div className="bg-background-card border border-border rounded-sm p-3">
            <InstitutionalRibbon
              institutions={institutions}
              vendorFirstYear={vendor.first_contract_year ?? 2008}
              vendorLastYear={vendor.last_contract_year ?? 2025}
              i18n={i18n}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <Link
        to={`/network?vendor=${vendorId}`}
        className="group inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.12em] text-text-secondary hover:text-text-primary transition-colors mt-4"
      >
        <GitBranch className="w-3.5 h-3.5" />
        {t('network.openNetworkGraph')}
        <ExternalLink className="w-3 h-3" />
      </Link>
    </ChapterShell>
  )
}

// ─── Chapter 5: The Money ───────────────────────────────────────────────────

/**
 * MoneyStaircase — cumulative MXN as a stepped path. Replaces the
 * generic dual-axis bar+line with a "journey" visualization.
 *
 * The cumulative line tells the time-as-drama story that a year-by-year
 * bar chart can't. Each step's color is graduated by the avg risk in
 * that year, so the reader sees not just "money grew" but "money grew
 * during high-risk years." The three largest single-year jumps get
 * pinned annotations with year + delta. A final "$N by YEAR" callout
 * anchors the right edge.
 *
 * What Chapter II covered (year-by-year activity) is intentionally NOT
 * repeated here. This chapter is about the journey, not the snapshots.
 */
function MoneyStaircase({
  timeline,
  selectedYear,
  hoverYear,
  onHoverYear,
  onSelectYear,
  byYearLabel,
}: {
  timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  selectedYear: number | null
  hoverYear: number | null
  onHoverYear: (y: number | null) => void
  onSelectYear: (y: number | null) => void
  byYearLabel: string
}) {
  if (timeline.length === 0) return null

  const sorted = [...timeline].sort((a, b) => a.year - b.year)
  let cum = 0
  const points = sorted.map((item) => {
    const start = cum
    cum += item.total_value
    return {
      year: item.year,
      start,
      end: cum,
      delta: item.total_value,
      risk: item.avg_risk_score ?? 0,
      count: item.contract_count,
    }
  })

  const minYear = points[0].year
  const maxYear = points[points.length - 1].year
  const yearSpan = Math.max(1, maxYear - minYear + 1)
  const totalCum = cum
  if (totalCum === 0) return null

  const top3Jumps = [...points].sort((a, b) => b.delta - a.delta).slice(0, 3).map((p) => p.year)

  const W = 720
  const H = 300
  const PAD = { top: 36, right: 12, bottom: 36, left: 56 }
  const innerH = H - PAD.top - PAD.bottom
  const innerW = W - PAD.left - PAD.right

  const xOf = (year: number) => PAD.left + ((year - minYear) / yearSpan) * innerW
  const xOfNext = (year: number) => PAD.left + ((year + 1 - minYear) / yearSpan) * innerW
  const yOf = (cum: number) => PAD.top + innerH - (cum / totalCum) * innerH

  const colorOfRisk = (r: number) => RISK_DOT_COLORS[getRiskLevel(r)]
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ frac: f, value: totalCum * f }))

  const activeYear = hoverYear ?? selectedYear
  const hitW = innerW / yearSpan

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto cursor-crosshair"
      role="img"
      aria-label="Cumulative procurement money over time"
      onMouseLeave={() => onHoverYear(null)}
    >
      {/* Y grid lines + labels */}
      {yTicks.map((t) => (
        <g key={t.frac}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yOf(t.value)} y2={yOf(t.value)} stroke="var(--color-border)" strokeDasharray="2 4" strokeWidth={0.5} opacity={0.5} />
          <text x={PAD.left - 6} y={yOf(t.value) + 3} textAnchor="end" fontSize={9} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)">
            {formatCompactMXN(t.value)}
          </text>
        </g>
      ))}

      {/* Active-year highlight column */}
      {activeYear != null && (
        <rect
          x={xOf(activeYear)}
          y={PAD.top}
          width={hitW}
          height={innerH}
          fill="var(--color-text-primary)"
          fillOpacity={0.05}
          stroke="var(--color-text-primary)"
          strokeOpacity={0.18}
          strokeWidth={0.6}
        />
      )}

      {/* Area fill under the staircase */}
      <path
        d={(() => {
          let d = `M ${xOf(points[0].year)} ${yOf(points[0].start)}`
          for (const p of points) {
            d += ` L ${xOf(p.year)} ${yOf(p.start)} L ${xOf(p.year)} ${yOf(p.end)} L ${xOfNext(p.year)} ${yOf(p.end)}`
          }
          d += ` L ${xOfNext(points[points.length - 1].year)} ${yOf(0)} L ${xOf(points[0].year)} ${yOf(0)} Z`
          return d
        })()}
        fill="var(--color-risk-critical)"
        fillOpacity={0.05}
      />

      {/* Stepped path */}
      {points.map((p) => {
        const xMid = xOf(p.year)
        const xEnd = xOfNext(p.year)
        const yStart = yOf(p.start)
        const yEnd = yOf(p.end)
        const stepColor = colorOfRisk(p.risk)
        const isActive = p.year === activeYear
        const baseW = isActive ? 3.6 : 2.4
        return (
          <g key={`step-${p.year}`} style={{ pointerEvents: 'none' }}>
            <line x1={xMid} y1={yStart} x2={xMid} y2={yEnd} stroke={stepColor} strokeWidth={baseW} strokeLinecap="square" style={isActive ? { filter: `drop-shadow(0 0 4px ${stepColor}aa)` } : undefined} />
            <line x1={xMid} y1={yEnd} x2={xEnd} y2={yEnd} stroke={stepColor} strokeWidth={baseW} strokeLinecap="square" />
            {isActive && (
              <circle cx={xMid} cy={yEnd} r={4.5} fill={stepColor} stroke="var(--color-background)" strokeWidth={1.6} />
            )}
          </g>
        )
      })}

      {/* Annotation pins — top 3 jumps. Hidden when the user is actively
          inspecting a year (their hover/pin cursor takes precedence). */}
      {activeYear == null && points.filter((p) => top3Jumps.includes(p.year)).map((p, idx) => {
        const x = xOf(p.year)
        const yTop = yOf(p.end)
        const stepColor = colorOfRisk(p.risk)
        const pinY = Math.max(PAD.top + 6, yTop - 18 - idx * 4)
        return (
          <g key={`pin-${p.year}`} style={{ pointerEvents: 'none' }}>
            <line x1={x} y1={yTop} x2={x} y2={pinY + 6} stroke={stepColor} strokeWidth={0.6} strokeDasharray="2 2" opacity={0.6} />
            <circle cx={x} cy={yTop} r={3.2} fill={stepColor} stroke="var(--color-background)" strokeWidth={1} />
            <text x={x} y={pinY} textAnchor="middle" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={700} fill={stepColor}>
              +{formatCompactMXN(p.delta)}
            </text>
            <text x={x} y={pinY + 9} textAnchor="middle" fontSize={8} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)">
              {p.year}
            </text>
          </g>
        )
      })}

      {/* Pinned-year marker (small dot above) */}
      {selectedYear != null && (
        <circle cx={xOf(selectedYear)} cy={PAD.top - 4} r={2.6} fill="var(--color-text-primary)" style={{ pointerEvents: 'none' }} />
      )}

      {/* Final cumulative callout */}
      {(() => {
        const last = points[points.length - 1]
        const x = xOfNext(last.year)
        const y = yOf(last.end)
        return (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={x} cy={y} r={4} fill="var(--color-risk-critical)" stroke="var(--color-background)" strokeWidth={1.5} />
            <text x={x - 6} y={y - 8} textAnchor="end" fontSize={11} fontFamily="var(--font-family-mono)" fontWeight={700} fill="var(--color-text-primary)">
              {formatCompactMXN(last.end)}
            </text>
            <text x={x - 6} y={y + 4} textAnchor="end" fontSize={9} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)">
              {byYearLabel.replace('{{year}}', String(last.year))}
            </text>
          </g>
        )
      })()}

      {/* X axis */}
      <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="var(--color-border)" strokeWidth={0.7} />
      {[minYear, Math.round((minYear + maxYear) / 2), maxYear].map((y, i) => {
        const x = xOf(y)
        return (
          <text
            key={y}
            x={x}
            y={H - PAD.bottom + 14}
            textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
            fontSize={10}
            fontFamily="var(--font-family-mono)"
            fill="var(--color-text-muted)"
            fontWeight={y === activeYear ? 700 : 400}
          >
            {y}
          </text>
        )
      })}

      {/* Hit-areas — full-height rects per year column for hover/click.
          Rendered LAST so they overlay everything else. */}
      {points.map((p) => {
        const x = xOf(p.year)
        return (
          <rect
            key={`hit-${p.year}`}
            x={x}
            y={PAD.top}
            width={hitW}
            height={innerH}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => onHoverYear(p.year)}
            onClick={() => onSelectYear(p.year === selectedYear ? null : p.year)}
          />
        )
      })}
    </svg>
  )
}

function ChapterMoney({ timeline, t }: {
  timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  t: TFunction
}) {
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const totalValue = timeline.reduce((s, item) => s + item.total_value, 0)
  const peakYear = timeline.reduce((max, item) => item.total_value > (max.total_value ?? 0) ? item : max, timeline[0] ?? { year: 0, total_value: 0, avg_risk_score: null, contract_count: 0 })
  const peakRiskYear = timeline.reduce((max, item) => (item.avg_risk_score ?? 0) > (max.avg_risk_score ?? 0) ? item : max, timeline[0] ?? { year: 0, total_value: 0, avg_risk_score: null, contract_count: 0 })
  const peakShare = totalValue > 0 ? (peakYear.total_value / totalValue) * 100 : 0

  // Active year for the detail panel — hover wins, then pinned, else peak by value
  const sorted = [...timeline].sort((a, b) => a.year - b.year)
  let runningCum = 0
  const cumByYear = new Map<number, { cum: number; share: number; deltaShare: number }>()
  for (const item of sorted) {
    runningCum += item.total_value
    cumByYear.set(item.year, {
      cum: runningCum,
      share: totalValue > 0 ? (runningCum / totalValue) * 100 : 0,
      deltaShare: totalValue > 0 ? (item.total_value / totalValue) * 100 : 0,
    })
  }
  const detailYear = hoverYear ?? selectedYear
  const detailItem =
    detailYear != null
      ? sorted.find((item) => item.year === detailYear) ?? peakYear
      : peakYear
  const detailRisk = detailItem.avg_risk_score ?? 0
  const detailColor = RISK_DOT_COLORS[getRiskLevel(detailRisk)]
  const detailCum = cumByYear.get(detailItem.year) ?? { cum: 0, share: 0, deltaShare: 0 }

  return (
    <ChapterShell id="chapter-money">
      <RedThreadChapter
        label={t('chapters.headings.money')}
        title={t('money.heading', { value: formatCompactMXN(totalValue) })}
      />
      <p className="text-text-secondary mb-4 max-w-2xl text-sm leading-relaxed">
        {t('money.staircaseDescription')}
      </p>

      {/* Inline anchor stats — concentration + peak risk year */}
      {peakYear && (
        <div className="flex items-baseline gap-6 mb-3 flex-wrap">
          <div>
            <span className="text-base font-bold text-text-primary font-mono tabular-nums">{peakShare.toFixed(0)}%</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted ml-2">{t('money.flowedIn', { year: peakYear.year })}</span>
          </div>
          {peakRiskYear && (
            <div>
              <span className="text-base font-bold font-mono tabular-nums" style={{ color: 'var(--color-risk-critical)' }}>{((peakRiskYear.avg_risk_score ?? 0) * 100).toFixed(0)}%</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted ml-2">{t('money.peakRiskYearShort')}</span>
              <span className="text-xs ml-2 font-mono tabular-nums text-text-muted">{peakRiskYear.year}</span>
            </div>
          )}
          {selectedYear != null && (
            <button
              type="button"
              onClick={() => setSelectedYear(null)}
              className="ml-auto text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted hover:text-text-primary transition-colors"
            >
              {t('timeline.unpin')}
            </button>
          )}
        </div>
      )}

      <div className="bg-background-card border border-border rounded-sm p-4">
        <MoneyStaircase
          timeline={timeline}
          selectedYear={selectedYear}
          hoverYear={hoverYear}
          onHoverYear={setHoverYear}
          onSelectYear={setSelectedYear}
          byYearLabel={t('money.byYear')}
        />
      </div>

      {/* Detail panel — mirrors Chapter II's interactivity. Hover any
          year column or click to pin; the panel updates to show the
          jump for that year + the cumulative share to date. */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 px-3 py-2.5 rounded-sm border border-border bg-background-card/40">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {hoverYear != null
              ? t('timeline.detail.hovering')
              : selectedYear != null
              ? t('timeline.detail.pinned')
              : t('money.peakByValue')}
          </p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">{detailItem.year}</p>
          <p className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: detailColor }}>
            {Math.round(detailRisk * 100)}% {t('timeline.detail.avgRisk').toLowerCase()}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">{t('money.detail.delta')}</p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">+{formatCompactMXN(detailItem.total_value)}</p>
          <p className="text-[10px] font-mono tabular-nums text-text-muted">{detailCum.deltaShare.toFixed(1)}% {t('timeline.detail.ofTotal')}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">{t('money.detail.cumulative')}</p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">{formatCompactMXN(detailCum.cum)}</p>
          <p className="text-[10px] font-mono tabular-nums text-text-muted">{detailCum.share.toFixed(0)}% {t('money.detail.toDate')}</p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">{t('timeline.detail.contracts')}</p>
          <p className="text-base font-bold font-mono tabular-nums text-text-primary leading-tight">{formatNumber(detailItem.contract_count)}</p>
        </div>
      </div>

      <p className="text-[10px] text-text-muted italic mt-3 leading-relaxed">
        {t('money.riskNote')}
      </p>
    </ChapterShell>
  )
}

// ─── Chapter 6: The Verdict ─────────────────────────────────────────────────

/**
 * VerdictGauge — semicircular dial showing the risk score on a 0-100
 * arc segmented by the four risk levels. The needle pulses subtly to
 * draw the eye. Compact (160×96) so it floats next to the chapter
 * heading instead of dominating the layout.
 */
function VerdictGauge({ score, color }: { score: number; color: string }) {
  // score is 0..100
  const W = 160
  const H = 92
  const cx = W / 2
  const cy = H - 6
  const R = 64
  // Convert score to angle (-180° → 0°)
  const angleRad = ((score / 100) * 180 - 180) * (Math.PI / 180)
  const needleLen = R - 6
  const nx = cx + Math.cos(angleRad) * needleLen
  const ny = cy + Math.sin(angleRad) * needleLen

  // Risk-level arc segments: 0-25 (low), 25-40 (medium), 40-60 (high), 60-100 (critical)
  const segments = [
    { from: 0,  to: 25, color: 'var(--color-text-muted)' },
    { from: 25, to: 40, color: 'var(--color-risk-medium)' },
    { from: 40, to: 60, color: 'var(--color-risk-high)' },
    { from: 60, to: 100, color: 'var(--color-risk-critical)' },
  ]

  // Convert pct to (x,y) on the arc
  const arcPoint = (pct: number) => {
    const a = (pct / 100) * 180 - 180
    const r = a * (Math.PI / 180)
    return { x: cx + Math.cos(r) * R, y: cy + Math.sin(r) * R }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-[160px] h-auto" role="img" aria-label={`Risk score gauge: ${score.toFixed(0)} out of 100`}>
      {/* Arc segments */}
      {segments.map((s) => {
        const p1 = arcPoint(s.from)
        const p2 = arcPoint(s.to)
        const largeArc = s.to - s.from > 50 ? 1 : 0
        return (
          <path
            key={`seg-${s.from}`}
            d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 ${largeArc} 1 ${p2.x} ${p2.y}`}
            stroke={s.color}
            strokeWidth={6}
            fill="none"
            opacity={0.85}
            strokeLinecap="butt"
          />
        )
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="var(--color-background-card)" stroke={color} strokeWidth={2} />
      {/* Score value */}
      <text x={cx} y={cy - R - 8} textAnchor="middle" fontSize={20} fontFamily="var(--font-family-serif)" fontStyle="italic" fontWeight={800} fill={color}>
        {score.toFixed(0)}
      </text>
    </svg>
  )
}

function ChapterVerdict({
  vendorId,
  vendor,
  coBidderCount,
  aria,
  t,
}: {
  vendorId: number
  vendor: {
    name: string
    avg_risk_score?: number
    in_ground_truth?: boolean
    total_institutions: number
    sectors_count: number
    total_contracts: number
  }
  coBidderCount: number
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
  const score100 = (vendor.avg_risk_score ?? 0) * 100

  const [memoExpanded, setMemoExpanded] = useState(false)

  // The Finding — declarative italic Playfair pullquote, level-dependent
  const finding =
    riskLevel === 'critical' ? t('verdict.finding.critical', { defaultValue: 'The data warrants urgent investigation.' })
    : riskLevel === 'high'   ? t('verdict.finding.high',     { defaultValue: 'Statistical signals warrant scrutiny.' })
    : riskLevel === 'medium' ? t('verdict.finding.medium',   { defaultValue: 'Anomalies present. Verification recommended.' })
    : t('verdict.finding.low', { defaultValue: 'No standout signals against sector baseline.' })

  // Evidence rows — assemble the case
  type EvidenceRow = { label: string; value: React.ReactNode; weight: 'high' | 'medium' | 'low' }
  const evidence: EvidenceRow[] = [
    {
      label: t('verdict.evidence.signal', { defaultValue: 'Statistical signal' }),
      value: <span><span className="font-mono tabular-nums" style={{ color: riskColor }}>{score100.toFixed(1)} / 100</span> <span className="text-text-muted">({riskLevel})</span></span>,
      weight: riskLevel === 'critical' || riskLevel === 'high' ? 'high' : 'medium',
    },
  ]
  if (patternMeta && aria?.primary_pattern) {
    evidence.push({
      label: t('verdict.evidence.pattern', { defaultValue: 'Pattern detected' }),
      value: <span style={{ color: patternMeta.color }}>{aria.primary_pattern} · <span className="text-text-primary">{patternMeta.label}</span></span>,
      weight: 'high',
    })
  }
  if (aria) {
    evidence.push({
      label: t('verdict.evidence.aria', { defaultValue: 'ARIA classification' }),
      value: <span className="text-text-primary">Tier {aria.ips_tier} · IPS {(aria.ips_final * 100).toFixed(0)}</span>,
      weight: aria.ips_tier <= 2 ? 'high' : 'medium',
    })
  }
  if (aria?.is_efos_definitivo || aria?.is_sfp_sanctioned || aria?.in_ground_truth) {
    const flags: string[] = []
    if (aria.is_efos_definitivo) flags.push('EFOS')
    if (aria.is_sfp_sanctioned) flags.push('SFP')
    if (aria.in_ground_truth) flags.push(t('verdict.groundTruthLabel', { defaultValue: 'GT' }))
    evidence.push({
      label: t('verdict.evidence.external', { defaultValue: 'External validation' }),
      value: <span className="text-[color:var(--color-accent)]">{flags.join(' · ')}</span>,
      weight: 'high',
    })
  }
  evidence.push({
    label: t('verdict.evidence.network', { defaultValue: 'Network' }),
    value: <span className="text-text-primary">{coBidderCount} co-bidder{coBidderCount === 1 ? '' : 's'} · {vendor.total_institutions} inst. · {vendor.sectors_count} sector{vendor.sectors_count === 1 ? '' : 's'}</span>,
    weight: 'low',
  })

  return (
    <ChapterShell id="chapter-verdict">
      <RedThreadChapter label={t('chapters.headings.verdict')} title={t('verdict.heading')} />

      {/* Verdict header — gauge anchored top-right, question on the left.
          Closing-argument format: opens with the question being asked. */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-1">
            {t('verdict.theQuestion', { defaultValue: 'The Question' })}
          </p>
          <p className="text-text-primary text-base leading-snug max-w-md">
            {t('verdict.questionText', {
              defaultValue: "Does this vendor's procurement record warrant investigation?",
            })}
          </p>
        </div>
        <div className="flex-shrink-0">
          <VerdictGauge score={score100} color={riskColor} />
        </div>
      </div>

      {/* The Evidence — prosecutorial bullet list */}
      <div className="mb-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
          {t('verdict.theEvidence', { defaultValue: 'The Evidence' })}
        </p>
        <ul className="space-y-1.5">
          {evidence.map((row, i) => (
            <li
              key={i}
              className="grid grid-cols-[150px_1fr] gap-3 items-baseline border-l-2 pl-3 py-1"
              style={{
                borderLeftColor: row.weight === 'high' ? riskColor + '99' : row.weight === 'medium' ? 'var(--color-border)' : 'transparent',
              }}
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">{row.label}</span>
              <span className="text-xs">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* The Finding — declarative italic pullquote, the chapter's emotional anchor */}
      <div className="mb-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
          {t('verdict.theFinding', { defaultValue: 'The Finding' })}
        </p>
        <p
          className="text-text-primary leading-snug max-w-2xl"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(1.1rem, 1.8vw, 1.35rem)',
            borderLeft: `2px solid ${riskColor}`,
            paddingLeft: '0.85rem',
          }}
        >
          {finding}
        </p>
      </div>

      {/* ARIA memo — clamped with disclosure */}
      {aria?.memo_text && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted">
              {t('verdict.ariaMemoTitle', { defaultValue: 'ARIA Intelligence Memo' })}
            </p>
            <button
              onClick={() => setMemoExpanded((v) => !v)}
              className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-secondary hover:text-text-primary transition-colors"
            >
              {memoExpanded ? '— Collapse' : '+ Read full memo'}
            </button>
          </div>
          <div className="border-l-2 border-[var(--color-accent)] pl-3">
            <div
              className={cn('text-text-secondary text-xs leading-relaxed', !memoExpanded && 'line-clamp-4')}
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
        </div>
      )}

      {/* The Next Step — action row, framed prosecutorially */}
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
          {t('verdict.theNextStep', { defaultValue: 'The Next Step' })}
        </p>
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
  const { t, i18n } = useTranslation('redThread')
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
    // Network chapter is now at index 2 (subject=0, timeline=1, network=2);
    // fetch as soon as the user scrolls past timeline. The previous gate
    // (>= 3) targeted the old order where network was 4th.
    enabled: !!id && !isNaN(id) && activeChapter >= 1,
    retry: false,
    ...COMMON_QUERY_OPTS,
  })

  // Per-institution breakdown — used by the InstitutionalRibbon graph
  // in the Network chapter. Returns each institution with first_year,
  // last_year, contract_count, total_value_mxn, avg_risk_score so we
  // can plot horizontal lanes spanning each institution's tenure.
  const { data: institutions } = useQuery({
    queryKey: ['vendor-institutions', id],
    queryFn: () => vendorApi.getInstitutions(id, 50),
    enabled: !!id && !isNaN(id) && activeChapter >= 1,
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

      {/* Chapters — order: Subject → Timeline → Network → Money → Pattern → Verdict.
          Pattern (algorithmic diagnosis) sits immediately before Verdict
          since the verdict cites it as evidence. Network moves up so
          relationships precede the financial chapter. */}
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

        <ChapterNetwork
          vendorId={id}
          vendor={{
            name: vendor.name,
            total_institutions: vendor.total_institutions,
            sectors_count: vendor.sectors_count,
            primary_sector_name: vendor.primary_sector_name ?? aria?.primary_sector_name ?? null,
            first_contract_year: vendor.first_contract_year,
            last_contract_year: vendor.last_contract_year,
          }}
          coBidders={coBidders?.co_bidders ?? null}
          institutions={institutions?.data ?? null}
          t={t}
          i18n={i18n}
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

        <ChapterPattern
          waterfall={waterfall ?? []}
          ariaPattern={aria?.primary_pattern ?? null}
          t={t}
        />

        <ChapterDivider />

        <ChapterVerdict
          vendorId={id}
          vendor={{
            name: vendor.name,
            avg_risk_score: vendor.avg_risk_score,
            in_ground_truth: aria?.in_ground_truth,
            total_institutions: vendor.total_institutions,
            sectors_count: vendor.sectors_count,
            total_contracts: vendor.total_contracts,
          }}
          coBidderCount={coBidders?.co_bidders?.length ?? 0}
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

      {/* Honest "what's missing" footnote — Phase 3 trust-building.
          Acknowledging what the data CAN'T tell is journalistic
          accountability. Never let the reader walk away thinking
          this was a complete picture. */}
      <section
        id="chapter-disclosure"
        className="py-6 px-4 sm:px-8 max-w-4xl mx-auto border-t border-border mt-8"
      >
        <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted mb-2">
          {t('disclosure.label', { defaultValue: "What this thread can't tell you" })}
        </p>
        <p className="text-xs text-text-muted leading-relaxed max-w-2xl">
          {t('disclosure.body', {
            defaultValue:
              "The COMPRANET dataset has known structural gaps. RFC (vendor tax ID) coverage is uneven across periods (0.1% in 2002–2010, 47% in 2023+). Beneficial-ownership data is not tracked. Contract documents (the actual scope of work, deliverables, modifications) are not in this dataset. Subcontracting relationships are not exposed. The risk score measures statistical similarity to documented corruption patterns — not proof of wrongdoing. Treat every flag as a hypothesis to verify, not a verdict.",
          })}
        </p>
      </section>

      {/* Bottom padding */}
      <div className="h-24" />
    </div>
  )
}
