/**
 * TimelineHourglass — dual-channel mirror through the year axis.
 * ChapterTimeline — Chapter 2 wrapper with interactive era filter.
 * Both extracted from RedThread.tsx.
 *
 * ABOVE the centerline: contract-count waveform (neutral, muted).
 * BELOW the centerline: log(value) waveform (colored by risk).
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCompactMXN, formatNumber, getRiskLevel } from '@/lib/utils'

// ─── Local types ─────────────────────────────────────────────────────────────

type TimelineItem = { year: number; avg_risk_score: number | null; contract_count: number; total_value: number }
type EraBucket = 'stable' | 'watch' | 'alert'

// ─── Local constants ─────────────────────────────────────────────────────────

const RISK_DOT_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high:     'var(--color-risk-high)',
  medium:   'var(--color-risk-medium)',
  low:      'var(--color-text-muted)',
}

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

type TimelineAnnotation = { year: number; label: string; kind: 'admin' | 'event' }
const TIMELINE_ANNOTATIONS: TimelineAnnotation[] = [
  { year: 2000, kind: 'admin', label: 'Fox inaugurated' },
  { year: 2006, kind: 'admin', label: 'Calderón inaugurated' },
  { year: 2012, kind: 'admin', label: 'Peña Nieto inaugurated' },
  { year: 2017, kind: 'event', label: 'Estafa Maestra exposed (Animal Político)' },
  { year: 2018, kind: 'admin', label: 'AMLO inaugurated · NAIM cancelled' },
  { year: 2020, kind: 'event', label: 'COVID emergency procurement begins' },
  { year: 2024, kind: 'admin', label: 'Sheinbaum inaugurated' },
]

// ─── Sub-components ─────────────────────────────────────────────────────────

function RedThreadChapter({ label, title, id }: { label: string; title: React.ReactNode; id?: string }) {
  return (
    <header id={id}>
      <h2 className="editorial-label text-[var(--color-accent)] mb-4 tracking-[0.18em]">{label}</h2>
      <h2 className="font-serif text-xl font-bold text-text-primary mb-3" style={{ fontFamily: 'var(--font-family-serif)' }}>
        {title}
      </h2>
    </header>
  )
}

function ChapterShell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-5 px-4 sm:px-8 max-w-4xl mx-auto">
      {children}
    </section>
  )
}

// ─── TimelineColumns SVG ─────────────────────────────────────────────────────
// Single-channel column chart. Bars grow up from baseline; height = log(value),
// color = avg risk bucket. Below the axis: tiny count dots (gray). Annotation
// pins (admin transitions, key events) sit in their own row at the bottom.
// No floating callout — the detail panel below the SVG covers spotlight info.

interface TimelineColumnsProps {
  timeline: TimelineItem[]
  selectedYear: number | null
  hoverYear: number | null
  eraFilter: EraBucket | null
  onHoverYear: (y: number | null) => void
  onSelectYear: (y: number | null) => void
  className?: string
}

function TimelineColumnsSvg({
  timeline,
  selectedYear,
  hoverYear,
  eraFilter,
  onHoverYear,
  onSelectYear,
  className,
}: TimelineColumnsProps) {
  if (timeline.length === 0) return null

  const sorted = [...timeline].sort((a, b) => a.year - b.year)
  const minYear = sorted[0].year
  const maxYear = sorted[sorted.length - 1].year
  const yearSpan = Math.max(1, maxYear - minYear)
  const maxValue = Math.max(...sorted.map((t) => t.total_value), 1)
  const maxCount = Math.max(...sorted.map((t) => t.contract_count), 1)
  const logMaxValue = Math.log(maxValue + 1)
  const logMaxCount = Math.log(maxCount + 1)

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

  // Layout: each visual element has its own Y zone — no overlap possible.
  const W = 720
  const H = 200
  const PAD = { left: 12, right: 12 }
  const BAR_TOP = 12
  const BAR_BASELINE = 140         // bars grow up from here to BAR_TOP
  const AXIS_Y = 145               // thin baseline rule
  const COUNT_DOT_Y = 160          // count dots in their own row
  const YEAR_LABEL_Y = 178         // year labels
  const ANNOTATION_Y = 192         // admin/event pins at the very bottom
  const BAR_MAX_H = BAR_BASELINE - BAR_TOP
  const innerW = W - PAD.left - PAD.right

  const xOf = (year: number) => PAD.left + ((year - minYear) / yearSpan) * innerW
  const valueH = (v: number) => Math.max(2, (Math.log(v + 1) / logMaxValue) * (BAR_MAX_H - 4))
  const countR = (n: number) => 1.5 + (Math.log(n + 1) / logMaxCount) * 4
  const colorOf = (risk: number) => RISK_DOT_COLORS[getRiskLevel(risk)]

  const halfStep = innerW / yearSpan / 2
  const matchesEraFilter = (item: TimelineItem) => {
    if (!eraFilter) return true
    return bucketOfRisk(item.avg_risk_score ?? 0) === eraFilter
  }

  const axisYears = Array.from(new Set([minYear, hero.year, maxYear])).sort((a, b) => a - b)
  const activeYear = hoverYear ?? selectedYear

  // Dynamic bar width: scale to year count, clamp to [4, 14].
  const slotW = innerW / Math.max(1, sorted.length)
  const barW = Math.max(4, Math.min(14, slotW * 0.62))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className ?? 'w-full h-auto cursor-crosshair'}
      role="img"
      aria-label="Annual contract value timeline"
      onMouseLeave={() => onHoverYear(null)}
    >
      {/* Era background bands — visual grouping of consecutive same-risk years */}
      {eras.map((era, i) => {
        const isFirst = i === 0
        const isLast = i === eras.length - 1
        const x1 = isFirst ? 0 : xOf(era.startYear) - halfStep
        const x2 = isLast ? W : xOf(era.endYear) + halfStep
        return (
          <rect
            key={`era-bg-${i}`}
            x={x1}
            y={BAR_TOP - 6}
            width={x2 - x1}
            height={AXIS_Y - BAR_TOP + 8}
            fill={ERA_BG[era.bucket]}
          />
        )
      })}

      {/* Active-year highlight column */}
      {activeYear != null && (
        <rect
          x={xOf(activeYear) - slotW / 2}
          y={BAR_TOP - 6}
          width={slotW}
          height={AXIS_Y - BAR_TOP + 8}
          fill="var(--color-text-primary)"
          fillOpacity={0.06}
          stroke="var(--color-text-primary)"
          strokeOpacity={0.22}
          strokeWidth={0.6}
        />
      )}

      {/* Baseline axis */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={AXIS_Y}
        y2={AXIS_Y}
        stroke="var(--color-border)"
        strokeWidth={0.8}
      />

      {/* Value bars — primary signal */}
      {sorted.map((item) => {
        const x = xOf(item.year)
        const isHero = item.year === hero.year
        const isActive = item.year === activeYear
        const isPinned = item.year === selectedYear
        const dimmed = !matchesEraFilter(item)
        const vH = valueH(item.total_value)
        const risk = item.avg_risk_score ?? 0
        const valueColor = colorOf(risk)
        const hitW = Math.max(14, slotW * 0.9)
        return (
          <g key={item.year}>
            {/* Wide invisible hit area covers bar + count dot for easy hover */}
            <rect
              x={x - hitW / 2}
              y={BAR_TOP - 6}
              width={hitW}
              height={COUNT_DOT_Y - BAR_TOP + 10}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHoverYear(item.year)}
              onClick={() => onSelectYear(item.year === selectedYear ? null : item.year)}
            />
            {/* Value bar */}
            <rect
              x={x - barW / 2}
              y={AXIS_Y - vH}
              width={barW}
              height={vH}
              rx={1}
              fill={valueColor}
              opacity={dimmed ? 0.22 : isActive ? 1 : isHero ? 1 : 0.82}
              style={{
                pointerEvents: 'none',
                filter: isActive || isHero ? `drop-shadow(0 0 4px ${valueColor}aa)` : undefined,
                transition: 'opacity 120ms ease',
              }}
            />
            {/* Count dot below the axis */}
            <circle
              cx={x}
              cy={COUNT_DOT_Y}
              r={countR(item.contract_count)}
              fill="var(--color-text-muted)"
              opacity={dimmed ? 0.25 : isActive || isHero ? 0.9 : 0.55}
              style={{ pointerEvents: 'none', transition: 'opacity 120ms ease' }}
            />
            {/* Pinned marker — small dot just above the bar */}
            {isPinned && (
              <circle
                cx={x}
                cy={BAR_TOP - 2}
                r={2.4}
                fill="var(--color-text-primary)"
                style={{ pointerEvents: 'none' }}
              />
            )}
          </g>
        )
      })}

      {/* Year labels — only min, hero, max for clarity */}
      {axisYears.map((y, i) => {
        const cx = xOf(y)
        const anchor: 'start' | 'middle' | 'end' =
          i === 0 ? 'start' : i === axisYears.length - 1 ? 'end' : 'middle'
        const isHero = y === hero.year
        return (
          <text
            key={y}
            x={cx}
            y={YEAR_LABEL_Y}
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

      {/* Annotation pins — bottom row, isolated from chart */}
      {TIMELINE_ANNOTATIONS.filter((a) => a.year >= minYear && a.year <= maxYear).map((a) => {
        const cx = xOf(a.year)
        const isEvent = a.kind === 'event'
        const pinColor = isEvent ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'
        return (
          <g key={`anno-${a.year}-${a.kind}`} className="cursor-help">
            <title>{a.year} · {a.label}</title>
            {/* Subtle vertical guide line from baseline down to annotation pin */}
            <line
              x1={cx}
              x2={cx}
              y1={AXIS_Y + 1}
              y2={ANNOTATION_Y - 3}
              stroke={pinColor}
              strokeWidth={0.5}
              strokeDasharray={isEvent ? '0' : '1 3'}
              opacity={isEvent ? 0.3 : 0.18}
            />
            {/* Pin triangle */}
            <polygon
              points={`${cx},${ANNOTATION_Y - 3} ${cx - 3},${ANNOTATION_Y + 3} ${cx + 3},${ANNOTATION_Y + 3}`}
              fill={pinColor}
              opacity={isEvent ? 1 : 0.55}
            />
            {/* Larger transparent hit target for hover */}
            <circle cx={cx} cy={ANNOTATION_Y} r={7} fill="transparent" />
          </g>
        )
      })}
    </svg>
  )
}

// ─── ChapterTimeline (exported) ──────────────────────────────────────────────

interface ChapterTimelineProps {
  totalContracts?: number
  vendorFirstYear?: number
  vendorLastYear?: number
  timeline: TimelineItem[]
  /** Unused — component calls useTranslation internally. Accepted for call-site compatibility. */
  t?: unknown
}

export function TimelineHourglass({
  totalContracts,
  vendorFirstYear,
  vendorLastYear,
  timeline,
}: ChapterTimelineProps) {
  const { t } = useTranslation('redThread')

  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [eraFilter, setEraFilter] = useState<EraBucket | null>(null)

  const sortedTimeline = [...timeline].sort((a, b) => a.year - b.year)
  const minYear = sortedTimeline[0]?.year ?? vendorFirstYear ?? 2010
  const maxYear = sortedTimeline[sortedTimeline.length - 1]?.year ?? vendorLastYear ?? 2025
  const displayTotal = totalContracts ?? sortedTimeline.reduce((s, item) => s + item.contract_count, 0)

  const totalValue = sortedTimeline.reduce((s, item) => s + item.total_value, 0)
  const alertItems = sortedTimeline.filter((item) => bucketOfRisk(item.avg_risk_score ?? 0) === 'alert')
  const alertValue = alertItems.reduce((s, item) => s + item.total_value, 0)
  const alertShare = totalValue > 0 ? (alertValue / totalValue) * 100 : 0
  const inflectionYear = alertItems.length > 0 ? alertItems[0].year : null

  const bucketCounts = sortedTimeline.reduce(
    (acc, item) => {
      const b = bucketOfRisk(item.avg_risk_score ?? 0)
      acc[b] = (acc[b] ?? 0) + 1
      return acc
    },
    {} as Record<EraBucket, number>
  )

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

      {/* Era filter pills */}
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

      <TimelineColumnsSvg
        timeline={sortedTimeline}
        selectedYear={selectedYear}
        hoverYear={hoverYear}
        eraFilter={eraFilter}
        onHoverYear={setHoverYear}
        onSelectYear={setSelectedYear}
      />

      {/* Detail panel */}
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
      <p className="mt-3 text-[10px] font-mono text-text-muted/60 tracking-[0.08em]">
        {t('timeline.sourceFooter')}
      </p>
    </ChapterShell>
  )
}
