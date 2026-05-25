/**
 * TimelineHourglass — Chapter II of the vendor dossier narrative.
 *
 * Redesigned 2026-05-22 (DESIGNUS round 6, component 3/10). Argument:
 * THE SHAPE — when did the money flow, in what pattern, aligned with
 * which administrations.
 *
 * Five editorial moves:
 *   1. Chapter heading (II. · TIMELINE · The shape of the relationship)
 *   2. Lede — data-driven temporal narrative
 *   3. THE SHAPE — annotated chart with admin labels at TOP, every-year
 *      labels at axis, value bars colored by avg risk, count dots below,
 *      numbered event chips, vertical dashed transition lines
 *   4. DETAIL — single adaptive Source Serif italic paragraph
 *      (PEAK · / HOVERING · / PINNED ·) replaces 4-col stat grid
 *   5. BY ADMINISTRATION — sexenio share bars using SignatureBar variant
 *      with admin colors (all 5 admins shown, even 0% rows)
 *
 * DROPPED from the original: era filter pills (chart color encoding
 * does the same job), era background bands (too much chrome), the
 * 4-col stat grid (replaced by adaptive caption), hourglass dual-channel
 * framing (single channel reads cleaner).
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCompactMXN, formatNumber, getRiskLevel } from '@/lib/utils'
import { RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import { ADMINISTRATIONS, getAdministrationByYear } from '@/lib/administrations'
import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  SignatureBar,
  FadeIn,
} from '@/components/dossier/primitives'

// ─── Local types + constants ────────────────────────────────────────────────

type TimelineItem = { year: number; avg_risk_score: number | null; contract_count: number; total_value: number }

const RISK_DOT_COLORS: Record<string, string> = {
  critical: RISK_COLORS.critical,
  high:     RISK_COLORS.high,
  medium:   RISK_COLORS.medium,
  low:      'var(--color-text-muted)',
}

const ADMIN_COLORS: Record<string, string> = {
  fox:       '#64748b',
  calderon:  '#1d4ed8',
  epn:       '#7c3aed',
  amlo:      '#b45309',
  sheinbaum: '#0d9488',
}

type TimelineAnnotation = { year: number; label_en: string; label_es: string; kind: 'event' }

/**
 * Numbered event chips — pinned moments in Mexican procurement history
 * that contextualize the chart. Admin transitions are rendered via the
 * dashed vertical lines from ADMINISTRATIONS data directly, not here.
 */
const TIMELINE_EVENTS: TimelineAnnotation[] = [
  { year: 2017, kind: 'event', label_en: 'Estafa Maestra exposed (Animal Político)', label_es: 'Se expone La Estafa Maestra (Animal Político)' },
  { year: 2018, kind: 'event', label_en: 'NAIM cancelled by referendum', label_es: 'NAIM cancelado por consulta popular' },
  { year: 2020, kind: 'event', label_en: 'COVID emergency procurement begins', label_es: 'Inicia contratación de emergencia por COVID' },
]

// ─── Component ──────────────────────────────────────────────────────────────

interface ChapterTimelineProps {
  totalContracts?: number
  vendorFirstYear?: number
  vendorLastYear?: number
  timeline: TimelineItem[]
  vendorName?: string
  primarySectorName?: string
  /** Accepted for call-site compatibility. */
  t?: unknown
}

export function TimelineHourglass({
  totalContracts,
  vendorFirstYear,
  vendorLastYear,
  timeline,
  vendorName,
  primarySectorName,
}: ChapterTimelineProps) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const sectorCode = primarySectorName?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#dc2626'

  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const sortedTimeline = [...timeline].sort((a, b) => a.year - b.year)
  const minYear = sortedTimeline[0]?.year ?? vendorFirstYear ?? 2010
  const maxYear = sortedTimeline[sortedTimeline.length - 1]?.year ?? vendorLastYear ?? 2025
  const displayTotal = totalContracts ?? sortedTimeline.reduce((s, item) => s + item.contract_count, 0)
  const totalValue = sortedTimeline.reduce((s, item) => s + item.total_value, 0)

  // Pick the "peak year" — value × risk product. This is the chapter's
  // narrative anchor: the year most worth talking about.
  const peakItem = sortedTimeline.reduce(
    (max, item) => {
      const score = item.total_value * (item.avg_risk_score ?? 0.01)
      const maxScore = max.total_value * (max.avg_risk_score ?? 0.01)
      return score > maxScore ? item : max
    },
    sortedTimeline[0] ?? { year: maxYear, total_value: 0, avg_risk_score: 0, contract_count: 0 } as TimelineItem,
  )

  // Caption state — defaults to peak, switches to hover/pin when interactive
  const captionYear = hoverYear ?? selectedYear ?? peakItem.year
  const captionItem = sortedTimeline.find((i) => i.year === captionYear) ?? peakItem
  const captionMode: 'peak' | 'hover' | 'pin' =
    hoverYear != null ? 'hover'
    : selectedYear != null ? 'pin'
    : 'peak'

  const lede = buildTimelineLede({
    vendorName,
    peakItem,
    totalValue,
    displayTotal,
    minYear,
    maxYear,
    lang,
  })

  // Compute per-administration share for the BY ADMINISTRATION block
  const adminShare = computeAdminShare(sortedTimeline, totalValue)

  return (
    <ChapterShell id="chapter-timeline">
      <ChapterHeading
        numeral="II"
        title={lang === 'es' ? 'La Cronología' : 'Timeline'}
        subtitle={lang === 'es' ? 'La forma de la relación' : 'The shape of the relationship'}
        sectorAccent={sectorAccent}
      />

      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={sectorAccent}>{lede}</LedeParagraph>
      </FadeIn>

      {/* THE SHAPE — the chart */}
      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'La forma' : 'The shape'} />
        <div className="mt-7">
          <TimelineChart
            timeline={sortedTimeline}
            minYear={minYear}
            maxYear={maxYear}
            peakYear={peakItem.year}
            hoverYear={hoverYear}
            selectedYear={selectedYear}
            onHoverYear={setHoverYear}
            onSelectYear={setSelectedYear}
            sectorAccent={sectorAccent}
            lang={lang}
          />
          {/* Tiny ledger line below the chart */}
          <p
            className="mt-3 font-mono text-center"
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              opacity: 0.7,
            }}
          >
            {lang === 'es'
              ? 'BARRA = VALOR TOTAL · COLOR = RIESGO PROMEDIO · PUNTO = NÚMERO DE CONTRATOS'
              : 'BAR = TOTAL VALUE · COLOR = AVG RISK · DOT = CONTRACT COUNT'}
          </p>
        </div>
      </FadeIn>

      {/* DETAIL — adaptive caption */}
      <FadeIn className="mt-12">
        <SubheadRule label={lang === 'es' ? 'En detalle' : 'Detail'} />
        <div className="mt-7 max-w-2xl mx-auto">
          <TimelineCaption
            mode={captionMode}
            item={captionItem}
            totalValue={totalValue}
            sectorAccent={sectorAccent}
            lang={lang}
          />
          {selectedYear != null && (
            <button
              type="button"
              onClick={() => setSelectedYear(null)}
              className="mt-3 font-mono cursor-pointer hover:opacity-70 transition-opacity"
              style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                padding: 0,
              }}
            >
              {lang === 'es' ? '× Soltar' : '× Unpin'}
            </button>
          )}
        </div>
      </FadeIn>

      {/* BY ADMINISTRATION */}
      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'Por administración' : 'By administration'} />
        <div className="mt-7 space-y-5 max-w-3xl mx-auto">
          {adminShare.map(({ admin, sharePct }) => (
            <SignatureBar
              key={admin.key}
              label={`${admin.short} · ${admin.yearStart}–${admin.yearEnd === 2030 ? '…' : admin.yearEnd}`}
              value={sharePct}
              sectorAccent={sectorAccent}
              colorOverride={ADMIN_COLORS[admin.key]}
            />
          ))}
        </div>
      </FadeIn>

      {/* Event captions — small block under chart */}
      {TIMELINE_EVENTS.some((e) => e.year >= minYear && e.year <= maxYear) && (
        <FadeIn className="mt-12">
          <SubheadRule label={lang === 'es' ? 'Eventos contextuales' : 'Contextual events'} />
          <ul className="mt-6 max-w-2xl mx-auto space-y-2 list-none p-0">
            {TIMELINE_EVENTS
              .filter((e) => e.year >= minYear && e.year <= maxYear)
              .map((e, i) => (
                <li
                  key={e.year}
                  className="flex items-baseline gap-3"
                  style={{
                    fontFamily: '"Source Serif Pro", "EB Garamond", Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span
                    className="font-mono tabular-nums flex-shrink-0"
                    style={{
                      fontSize: 11,
                      fontStyle: 'normal',
                      color: sectorAccent,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      minWidth: 24,
                    }}
                  >
                    {romanNumeral(i + 1)}
                  </span>
                  <span className="flex-shrink-0 font-mono tabular-nums" style={{ fontStyle: 'normal', fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {e.year}
                  </span>
                  <span>{lang === 'es' ? e.label_es : e.label_en}</span>
                </li>
              ))}
          </ul>
        </FadeIn>
      )}
    </ChapterShell>
  )
}

// ─── TimelineChart SVG ──────────────────────────────────────────────────────

function TimelineChart({
  timeline,
  minYear,
  maxYear,
  peakYear,
  hoverYear,
  selectedYear,
  onHoverYear,
  onSelectYear,
  sectorAccent,
  lang,
}: {
  timeline: TimelineItem[]
  minYear: number
  maxYear: number
  peakYear: number
  hoverYear: number | null
  selectedYear: number | null
  onHoverYear: (y: number | null) => void
  onSelectYear: (y: number | null) => void
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  if (timeline.length === 0) return null

  const yearSpan = Math.max(1, maxYear - minYear)
  const maxValue = Math.max(...timeline.map((t) => t.total_value), 1)
  const maxCount = Math.max(...timeline.map((t) => t.contract_count), 1)
  const logMaxValue = Math.log(maxValue + 1)
  const logMaxCount = Math.log(maxCount + 1)

  // Chart geometry — vertical zones never overlap
  const W = 760
  const H = 230
  const PAD = { left: 24, right: 24 }
  const ADMIN_LABEL_Y = 14         // admin labels at the top
  const BAR_TOP = 38               // bars start below admin labels
  const BAR_BASELINE = 158         // bars grow up from here
  const AXIS_Y = 162               // baseline rule
  const COUNT_DOT_Y = 174          // count dots in their own row
  const YEAR_LABEL_Y = 192         // every-year labels along axis
  const EVENT_CHIP_Y = 212         // numbered ① ② ③ event chips at very bottom
  const BAR_MAX_H = BAR_BASELINE - BAR_TOP
  const innerW = W - PAD.left - PAD.right

  const xOf = (year: number) => PAD.left + ((year - minYear) / yearSpan) * innerW
  const valueH = (v: number) => Math.max(2, (Math.log(v + 1) / logMaxValue) * (BAR_MAX_H - 4))
  const countR = (n: number) => 1.5 + (Math.log(n + 1) / logMaxCount) * 3.5

  const slotW = innerW / Math.max(1, timeline.length)
  const barW = Math.max(4, Math.min(18, slotW * 0.62))
  const activeYear = hoverYear ?? selectedYear

  // Build admin segments inside the visible year range
  const adminSegments = ADMINISTRATIONS
    .map((admin) => {
      const segStart = Math.max(admin.yearStart, minYear)
      const segEnd = Math.min(admin.yearEnd, maxYear)
      if (segEnd < segStart) return null
      return { admin, segStart, segEnd }
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)

  // Determine which years get a label (every year for ≤16, every other for ≤24, every 4 otherwise)
  const labelStride = timeline.length <= 16 ? 1 : timeline.length <= 24 ? 2 : 4
  const yearsToLabel = new Set<number>()
  timeline.forEach((item, i) => {
    if (i === 0 || i === timeline.length - 1 || item.year === peakYear || i % labelStride === 0) {
      yearsToLabel.add(item.year)
    }
  })

  // Event chips — numbered to match captions below
  const visibleEvents = TIMELINE_EVENTS.filter((e) => e.year >= minYear && e.year <= maxYear)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto cursor-crosshair"
      role="img"
      aria-label={lang === 'es' ? 'Cronología de valor anual de contratos' : 'Annual contract value timeline'}
      onMouseLeave={() => onHoverYear(null)}
    >
      {/* Admin segment labels at the TOP — centered in each segment */}
      {adminSegments.map(({ admin, segStart, segEnd }) => {
        const x1 = xOf(segStart) - slotW / 2
        const x2 = xOf(segEnd) + slotW / 2
        const cx = (x1 + x2) / 2
        const adminColor = ADMIN_COLORS[admin.key] ?? 'var(--color-text-muted)'
        const segWidth = x2 - x1
        // Only render label if the segment is wide enough to read
        if (segWidth < 36) return null
        return (
          <g key={`admin-label-${admin.key}`}>
            <text
              x={cx}
              y={ADMIN_LABEL_Y}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight={700}
              fill={adminColor}
              letterSpacing="0.14em"
              style={{ textTransform: 'uppercase' }}
            >
              {admin.short.toUpperCase()}
            </text>
          </g>
        )
      })}

      {/* Dashed vertical transition lines between administrations */}
      {adminSegments.slice(1).map(({ segStart, admin }) => {
        const x = xOf(segStart) - slotW / 2
        const adminColor = ADMIN_COLORS[admin.key] ?? 'var(--color-text-muted)'
        return (
          <line
            key={`transition-${admin.key}`}
            x1={x}
            x2={x}
            y1={ADMIN_LABEL_Y + 6}
            y2={AXIS_Y}
            stroke={adminColor}
            strokeWidth={1}
            strokeDasharray="2 4"
            opacity={0.35}
          />
        )
      })}

      {/* Active-year highlight column */}
      {activeYear != null && (
        <rect
          x={xOf(activeYear) - slotW / 2}
          y={BAR_TOP - 4}
          width={slotW}
          height={AXIS_Y - BAR_TOP + 6}
          fill="var(--color-text-primary)"
          fillOpacity={0.05}
          stroke="var(--color-text-primary)"
          strokeOpacity={0.18}
          strokeWidth={0.5}
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

      {/* Value bars + count dots + hit areas */}
      {timeline.map((item) => {
        const x = xOf(item.year)
        const isPeak = item.year === peakYear
        const isActive = item.year === activeYear
        const isPinned = item.year === selectedYear
        const vH = valueH(item.total_value)
        const risk = item.avg_risk_score ?? 0
        // Peak year gets sector accent; other years get risk-tier color
        const valueColor = isPeak ? sectorAccent : RISK_DOT_COLORS[getRiskLevel(risk)]
        const hitW = Math.max(18, slotW * 0.95)
        return (
          <g key={item.year}>
            <rect
              x={x - hitW / 2}
              y={BAR_TOP - 4}
              width={hitW}
              height={COUNT_DOT_Y - BAR_TOP + 10}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHoverYear(item.year)}
              onClick={() => onSelectYear(item.year === selectedYear ? null : item.year)}
            />
            <rect
              x={x - barW / 2}
              y={AXIS_Y - vH}
              width={barW}
              height={vH}
              rx={1}
              fill={valueColor}
              opacity={isActive ? 1 : isPeak ? 0.95 : 0.78}
              style={{
                pointerEvents: 'none',
                filter: isActive || isPeak ? `drop-shadow(0 0 4px ${valueColor}88)` : undefined,
                transition: 'opacity 120ms ease',
              }}
            />
            <circle
              cx={x}
              cy={COUNT_DOT_Y}
              r={countR(item.contract_count)}
              fill="var(--color-text-muted)"
              opacity={isActive || isPeak ? 0.9 : 0.5}
              style={{ pointerEvents: 'none', transition: 'opacity 120ms ease' }}
            />
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

      {/* Year labels along the axis — every year (or every-other / every-fourth) */}
      {timeline.map((item) => {
        if (!yearsToLabel.has(item.year)) return null
        const cx = xOf(item.year)
        const isPeak = item.year === peakYear
        const isActive = item.year === activeYear
        const yearShort = "'" + String(item.year).slice(-2)
        return (
          <text
            key={`label-${item.year}`}
            x={cx}
            y={YEAR_LABEL_Y}
            textAnchor="middle"
            fontSize={9}
            fontFamily="var(--font-family-mono, monospace)"
            fontWeight={isPeak || isActive ? 700 : 400}
            fill={isPeak ? sectorAccent : isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
            opacity={isPeak || isActive ? 1 : 0.7}
            style={{ pointerEvents: 'none' }}
          >
            {yearShort}
          </text>
        )
      })}

      {/* Event chips at the bottom */}
      {visibleEvents.map((e, i) => {
        const cx = xOf(e.year)
        return (
          <g key={`event-${e.year}`} className="cursor-help">
            <title>{e.year} · {lang === 'es' ? e.label_es : e.label_en}</title>
            <line
              x1={cx}
              x2={cx}
              y1={AXIS_Y + 1}
              y2={EVENT_CHIP_Y - 6}
              stroke={sectorAccent}
              strokeWidth={0.6}
              strokeDasharray="1 3"
              opacity={0.35}
            />
            <circle
              cx={cx}
              cy={EVENT_CHIP_Y}
              r={8}
              fill="var(--color-background)"
              stroke={sectorAccent}
              strokeWidth={1}
            />
            <text
              x={cx}
              y={EVENT_CHIP_Y + 3.5}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-family-mono, monospace)"
              fontWeight={700}
              fill={sectorAccent}
            >
              {romanNumeral(i + 1)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── TimelineCaption — adaptive editorial sentence ──────────────────────────

function TimelineCaption({
  mode,
  item,
  totalValue,
  sectorAccent,
  lang,
}: {
  mode: 'peak' | 'hover' | 'pin'
  item: TimelineItem
  totalValue: number
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const sharePct = totalValue > 0 ? (item.total_value / totalValue) * 100 : 0
  const riskPct = Math.round((item.avg_risk_score ?? 0) * 100)
  const riskColor = RISK_DOT_COLORS[getRiskLevel(item.avg_risk_score ?? 0)]
  const admin = getAdministrationByYear(item.year)

  const modeLabel = mode === 'peak'
    ? (lang === 'es' ? 'PICO' : 'PEAK')
    : mode === 'hover'
      ? (lang === 'es' ? 'PASANDO' : 'HOVERING')
      : (lang === 'es' ? 'FIJADO' : 'PINNED')

  return (
    <div
      style={{
        borderLeft: `2px solid ${sectorAccent}`,
        paddingLeft: 16,
      }}
    >
      <div
        className="font-mono mb-2"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: sectorAccent,
          fontWeight: 700,
        }}
      >
        {modeLabel} · {item.year}
      </div>
      <p
        style={{
          fontFamily: '"Source Serif Pro", Georgia, serif',
          fontStyle: 'italic',
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--color-text-secondary)',
        }}
      >
        {lang === 'es' ? (
          <>
            {formatNumber(item.contract_count)} contratos por{' '}
            <CaptionNumber color={sectorAccent}>{formatCompactMXN(item.total_value)}</CaptionNumber>
            {' '}— el <CaptionNumber color={sectorAccent}>{sharePct.toFixed(1)}%</CaptionNumber> del gasto vitalicio
            {admin && <>, bajo {admin.long}</>}
            . Riesgo promedio: <CaptionNumber color={riskColor}>{riskPct}</CaptionNumber>.
          </>
        ) : (
          <>
            {formatNumber(item.contract_count)} contracts worth{' '}
            <CaptionNumber color={sectorAccent}>{formatCompactMXN(item.total_value)}</CaptionNumber>
            {' '}— <CaptionNumber color={sectorAccent}>{sharePct.toFixed(1)}%</CaptionNumber> of lifetime spend
            {admin && <>, under {admin.long}</>}
            . Average risk: <CaptionNumber color={riskColor}>{riskPct}</CaptionNumber>.
          </>
        )}
      </p>
    </div>
  )
}

function CaptionNumber({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <strong
      className="tabular-nums"
      style={{
        fontFamily: '"Playfair Display", Georgia, serif',
        fontStyle: 'italic',
        fontWeight: 800,
        fontSize: '1.15em',
        color,
        letterSpacing: '-0.015em',
      }}
    >
      {children}
    </strong>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildTimelineLede({
  vendorName,
  peakItem,
  totalValue,
  displayTotal,
  minYear,
  maxYear,
  lang,
}: {
  vendorName?: string
  peakItem: TimelineItem
  totalValue: number
  displayTotal: number
  minYear: number
  maxYear: number
  lang: 'en' | 'es'
}): string {
  const name = vendorName ? cleanVendorName(vendorName) : (lang === 'es' ? 'el proveedor' : 'the vendor')
  const peakShare = totalValue > 0 ? (peakItem.total_value / totalValue) * 100 : 0
  const peakAdmin = getAdministrationByYear(peakItem.year)
  const peakRisk = Math.round((peakItem.avg_risk_score ?? 0) * 100)

  if (peakShare >= 25 && peakAdmin) {
    return lang === 'es'
      ? `La mayor parte de los ${formatNumber(displayTotal)} contratos de ${name} entre ${minYear} y ${maxYear} se concentró en ${peakItem.year} — un solo año durante la administración de ${peakAdmin.long} que captó el ${peakShare.toFixed(0)}% del gasto vitalicio. Riesgo promedio: ${peakRisk}.`
      : `Most of ${name}'s ${formatNumber(displayTotal)} contracts between ${minYear} and ${maxYear} concentrated in ${peakItem.year} — a single year under ${peakAdmin.long} that captured ${peakShare.toFixed(0)}% of lifetime spend. Average risk: ${peakRisk}.`
  }
  if (peakAdmin) {
    return lang === 'es'
      ? `${name} mantuvo ${formatNumber(displayTotal)} contratos entre ${minYear} y ${maxYear}, con el año más significativo en ${peakItem.year} bajo la administración de ${peakAdmin.long} (${peakShare.toFixed(0)}% del gasto vitalicio, riesgo promedio ${peakRisk}).`
      : `${name} held ${formatNumber(displayTotal)} contracts between ${minYear} and ${maxYear}, with its peak year in ${peakItem.year} under ${peakAdmin.long} (${peakShare.toFixed(0)}% of lifetime spend, avg risk ${peakRisk}).`
  }
  return lang === 'es'
    ? `${name} mantuvo ${formatNumber(displayTotal)} contratos entre ${minYear} y ${maxYear}, con su año más activo en ${peakItem.year}.`
    : `${name} held ${formatNumber(displayTotal)} contracts between ${minYear} and ${maxYear}, with its most active year in ${peakItem.year}.`
}

function computeAdminShare(
  timeline: TimelineItem[],
  totalValue: number,
): Array<{ admin: typeof ADMINISTRATIONS[number]; sharePct: number; spend: number }> {
  const buckets = new Map<string, number>()
  for (const item of timeline) {
    const admin = getAdministrationByYear(item.year)
    if (!admin) continue
    buckets.set(admin.key, (buckets.get(admin.key) ?? 0) + item.total_value)
  }
  return ADMINISTRATIONS.map((admin) => {
    const spend = buckets.get(admin.key) ?? 0
    const sharePct = totalValue > 0 ? (spend / totalValue) * 100 : 0
    return { admin, sharePct, spend }
  })
}

function cleanVendorName(raw: string): string {
  // Drop common legal-form suffixes for narrative prose
  const patterns = [
    /,?\s*S\.?A\.?\s*DE\s*C\.?V\.?$/i,
    /,?\s*S\.?\s*DE\s*R\.?L\.?\s*DE\s*C\.?V\.?$/i,
    /,?\s*S\.?A\.?P\.?I\.?\s*DE\s*C\.?V\.?$/i,
    /,?\s*S\.?C\.?$/i,
  ]
  let out = raw
  for (const re of patterns) {
    out = out.replace(re, '').trim()
  }
  // Title case Mexican corporate names
  return out.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}

function romanNumeral(n: number): string {
  const map: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X' }
  return map[n] ?? String(n)
}
