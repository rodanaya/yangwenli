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

// ─── TimelineHourglass SVG ───────────────────────────────────────────────────

interface TimelineHourglassProps {
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
}

function TimelineHourglassSvg({
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
}: TimelineHourglassProps) {
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
  const matchesEraFilter = (item: TimelineItem) => {
    if (!eraFilter) return true
    return bucketOfRisk(item.avg_risk_score ?? 0) === eraFilter
  }

  const axisYears = Array.from(new Set([minYear, hero.year, maxYear])).sort((a, b) => a - b)
  const activeYear = hoverYear ?? selectedYear

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
          <rect key={`era-bg-${i}`} x={x1} y={Y_TOP - 4} width={x2 - x1} height={H - Y_TOP} fill={ERA_BG[era.bucket]} />
        )
      })}

      {/* Active-year highlight column */}
      {activeYear != null && (
        <rect
          x={xOf(activeYear) - 12} y={Y_TOP - 4} width={24} height={H - Y_TOP}
          fill="var(--color-text-primary)" fillOpacity={0.05}
          stroke="var(--color-text-primary)" strokeOpacity={0.2} strokeWidth={0.6}
        />
      )}

      {/* Channel labels */}
      <text x={PAD.left + 4} y={Y_TOP + 10} fontSize={8.5} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.7} letterSpacing={0.5}>
        ▲ {countLabel.toUpperCase()}
      </text>
      <text x={PAD.left + 4} y={Y_BASE_VALUE + 10} fontSize={8.5} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.7} letterSpacing={0.5}>
        ▼ {valueLabel.toUpperCase()}
      </text>

      {/* Era ticks at top edge */}
      {eras.filter((e) => e.endYear - e.startYear >= 1 || eras.length <= 3).map((era, i) => {
        const cx = (xOf(era.startYear) + xOf(era.endYear)) / 2
        return (
          <text key={`era-lbl-${i}`} x={cx} y={Y_TOP - 1} textAnchor="middle" fontSize={8} fontFamily="var(--font-family-mono)" fill={ERA_LABEL_COLOR[era.bucket]} fontWeight={600} opacity={0.85}>
            {eraLabels[era.bucket].toUpperCase()}
          </text>
        )
      })}

      <line x1={0} x2={W} y1={Y_CENTER} y2={Y_CENTER} stroke="var(--color-border)" strokeWidth={0.7} />

      {/* Bars */}
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
        const hitW = Math.max(14, (innerW / Math.max(1, sorted.length)) * 0.85)
        return (
          <g key={item.year}>
            <rect
              x={x - hitW / 2} y={Y_TOP} width={hitW} height={H - Y_TOP - 4}
              fill="transparent" style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHoverYear(item.year)}
              onClick={() => onSelectYear(item.year === selectedYear ? null : item.year)}
            />
            <rect
              x={x - barW / 2} y={Y_CENTER - CENTER_BAND / 2 - cH} width={barW} height={cH} rx={1}
              fill="var(--color-text-muted)"
              opacity={dimmed ? 0.18 : (isActive ? 1 : isHero ? 0.85 : 0.55)}
              style={{ pointerEvents: 'none', transition: 'opacity 120ms ease' }}
            />
            <rect
              x={x - barW / 2} y={Y_BASE_VALUE} width={barW} height={vH} rx={1}
              fill={valueColor}
              opacity={dimmed ? 0.20 : (isActive ? 1 : isHero ? 1 : 0.82)}
              style={{
                pointerEvents: 'none',
                filter: isActive || isHero ? `drop-shadow(0 0 5px ${valueColor}aa)` : undefined,
                transition: 'opacity 120ms ease',
              }}
            />
            {isPinned && (
              <circle cx={x} cy={Y_TOP + 2} r={2.6} fill="var(--color-text-primary)" style={{ pointerEvents: 'none' }} />
            )}
          </g>
        )
      })}

      {/* Hero callout flag */}
      {(() => {
        const x = xOf(hero.year)
        const vH = valueH(hero.total_value)
        const flagW = 156
        const flagH = 34
        const flagX = Math.min(W - flagW - 4, Math.max(4, x - flagW / 2))
        const flagY = Y_BASE_VALUE + vH + 6
        const heroColor = colorOf(hero.avg_risk_score ?? 0)
        if (flagY + flagH > H - 4) {
          const cH = countH(hero.contract_count)
          const altY = Y_CENTER - CENTER_BAND / 2 - cH - flagH - 6
          return (
            <g>
              <line x1={x} y1={Y_CENTER - CENTER_BAND / 2 - cH} x2={x} y2={altY + flagH} stroke={heroColor} strokeWidth={0.6} strokeDasharray="2 2" opacity={0.55} />
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
            <line x1={x} y1={Y_BASE_VALUE + vH} x2={x} y2={flagY} stroke={heroColor} strokeWidth={0.6} strokeDasharray="2 2" opacity={0.55} />
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

      {/* Year axis labels */}
      {axisYears.map((y, i) => {
        const cx = xOf(y)
        const anchor: 'start' | 'middle' | 'end' = i === 0 ? 'start' : i === axisYears.length - 1 ? 'end' : 'middle'
        const isHero = y === hero.year
        return (
          <text key={y} x={cx} y={Y_CENTER + 4} textAnchor={anchor} fontSize={10} fontFamily="var(--font-family-mono)" fontWeight={isHero ? 700 : 400} fill={isHero ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}>
            {y}
          </text>
        )
      })}

      {/* Procurement-context annotation pins */}
      {TIMELINE_ANNOTATIONS.filter((a) => a.year >= minYear && a.year <= maxYear).map((a) => {
        const cx = xOf(a.year)
        const isEvent = a.kind === 'event'
        const pinColor = isEvent ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'
        return (
          <g key={`anno-${a.year}-${a.kind}`} className="cursor-help">
            <title>{a.year} · {a.label}</title>
            <line x1={cx} x2={cx} y1={Y_TOP - 4} y2={H - 4} stroke={pinColor} strokeWidth={0.5} strokeDasharray={isEvent ? '0' : '1 3'} opacity={isEvent ? 0.35 : 0.2} />
            <polygon points={`${cx},${Y_TOP - 4} ${cx - 3},${Y_TOP - 9} ${cx + 3},${Y_TOP - 9}`} fill={pinColor} opacity={isEvent ? 1 : 0.6} />
            <circle cx={cx} cy={Y_TOP - 6} r={6} fill="transparent" />
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

      <TimelineHourglassSvg
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
