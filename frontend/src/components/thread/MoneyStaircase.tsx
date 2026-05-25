/**
 * MoneyStaircase — Chapter IV of the vendor dossier narrative.
 *
 * Redesigned 2026-05-25 (DESIGNUS round 6, component 5/10). Argument:
 * THE CUMULATIVE JOURNEY. How did the money pile up — gradual climb,
 * single sudden jump, or punctuated by years of acceleration.
 *
 * Self-contained chapter. Composition:
 *   1. Chapter heading (IV · MONEY · The cumulative journey)
 *   2. Lede — data-driven (peak year + concentration + risk alignment)
 *   3. THE CLIMB — cumulative staircase chart with index-based slots
 *      (fixes the same sparse-vendor margin issue we fixed in Timeline)
 *   4. DETAIL — adaptive caption (PEAK / HOVERING / PINNED)
 *
 * Drops the 4-col stat grid + dual-axis bar/line in favor of an editorial
 * single-channel cumulative staircase + adaptive caption (matches the
 * Timeline chapter's interactive register).
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCompactMXN, formatNumber, getRiskLevel } from '@/lib/utils'
import { RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import { getAdministrationByYear } from '@/lib/administrations'
import {
  ChapterShell,
  ChapterHeading,
  SubheadRule,
  LedeParagraph,
  FadeIn,
} from '@/components/dossier/primitives'

// ─── Types ──────────────────────────────────────────────────────────────────

type TimelineItem = {
  year: number
  avg_risk_score: number | null
  contract_count: number
  total_value: number
}

const RISK_DOT_COLORS: Record<string, string> = {
  critical: RISK_COLORS.critical,
  high:     RISK_COLORS.high,
  medium:   RISK_COLORS.medium,
  low:      'var(--color-text-muted)',
}

// ─── Component ──────────────────────────────────────────────────────────────

interface MoneyStaircaseProps {
  timeline: TimelineItem[]
  vendorName?: string
  primarySectorName?: string
  /** Accepted for call-site compatibility. */
  selectedYear?: number | null
  hoverYear?: number | null
  onHoverYear?: (y: number | null) => void
  onSelectYear?: (y: number | null) => void
  byYearLabel?: string
}

export function MoneyStaircase({
  timeline,
  vendorName,
  primarySectorName,
}: MoneyStaircaseProps) {
  const { i18n } = useTranslation()
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'

  const sectorCode = primarySectorName?.toLowerCase() ?? 'otros'
  const sectorAccent = SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros ?? '#dc2626'

  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const sorted = [...timeline].sort((a, b) => a.year - b.year)
  const totalValue = sorted.reduce((s, item) => s + item.total_value, 0)
  if (sorted.length === 0 || totalValue === 0) {
    return (
      <ChapterShell id="chapter-money">
        <ChapterHeading
          numeral="IV"
          title={lang === 'es' ? 'El Dinero' : 'Money'}
          subtitle={lang === 'es' ? 'El viaje acumulado' : 'The cumulative journey'}
          sectorAccent={sectorAccent}
        />
        <FadeIn className="mt-12">
          <LedeParagraph sectorAccent={sectorAccent}>
            {lang === 'es' ? 'Sin datos suficientes para construir la curva de acumulación.' : 'Not enough data to draw the cumulative curve.'}
          </LedeParagraph>
        </FadeIn>
      </ChapterShell>
    )
  }

  // Peak year — by value (the biggest single-year jump)
  const peakItem = sorted.reduce(
    (max, item) => (item.total_value > (max.total_value ?? 0) ? item : max),
    sorted[0],
  )
  const peakShare = (peakItem.total_value / totalValue) * 100

  // Adaptive caption state — defaults to peak year
  const captionYear = hoverYear ?? selectedYear ?? peakItem.year
  const captionItem = sorted.find((i) => i.year === captionYear) ?? peakItem
  const captionMode: 'peak' | 'hover' | 'pin' =
    hoverYear != null ? 'hover'
    : selectedYear != null ? 'pin'
    : 'peak'

  // Running cumulative for caption
  const cumByYear = new Map<number, number>()
  let running = 0
  for (const item of sorted) {
    running += item.total_value
    cumByYear.set(item.year, running)
  }
  const captionCum = cumByYear.get(captionItem.year) ?? 0
  const captionShareCum = (captionCum / totalValue) * 100

  const lede = buildMoneyLede({
    vendorName,
    sorted,
    totalValue,
    peakItem,
    peakShare,
    lang,
  })

  return (
    <ChapterShell id="chapter-money">
      <ChapterHeading
        numeral="IV"
        title={lang === 'es' ? 'El Dinero' : 'Money'}
        subtitle={lang === 'es' ? 'El viaje acumulado' : 'The cumulative journey'}
        sectorAccent={sectorAccent}
      />

      <FadeIn className="mt-12">
        <LedeParagraph sectorAccent={sectorAccent}>{lede}</LedeParagraph>
      </FadeIn>

      {/* THE CLIMB — cumulative staircase */}
      <FadeIn className="mt-16">
        <SubheadRule label={lang === 'es' ? 'La escalera' : 'The climb'} />
        <div className="mt-7">
          <StaircaseChart
            sorted={sorted}
            totalValue={totalValue}
            peakYear={peakItem.year}
            hoverYear={hoverYear}
            selectedYear={selectedYear}
            onHoverYear={setHoverYear}
            onSelectYear={setSelectedYear}
            sectorAccent={sectorAccent}
            lang={lang}
          />
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
              ? 'ALTURA DE PASO = GASTO ACUMULADO · COLOR = RIESGO PROMEDIO DEL AÑO'
              : 'STEP HEIGHT = CUMULATIVE SPEND · COLOR = AVG YEAR RISK'}
          </p>
        </div>
      </FadeIn>

      {/* DETAIL — adaptive caption */}
      <FadeIn className="mt-12">
        <SubheadRule label={lang === 'es' ? 'En detalle' : 'Detail'} />
        <div className="mt-7 max-w-2xl mx-auto">
          <MoneyCaption
            mode={captionMode}
            item={captionItem}
            cumulative={captionCum}
            cumulativeShare={captionShareCum}
            yearShare={(captionItem.total_value / totalValue) * 100}
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
    </ChapterShell>
  )
}

// ─── StaircaseChart SVG ─────────────────────────────────────────────────────

function StaircaseChart({
  sorted,
  totalValue,
  peakYear,
  hoverYear,
  selectedYear,
  onHoverYear,
  onSelectYear,
  sectorAccent,
  lang,
}: {
  sorted: TimelineItem[]
  totalValue: number
  peakYear: number
  hoverYear: number | null
  selectedYear: number | null
  onHoverYear: (y: number | null) => void
  onSelectYear: (y: number | null) => void
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const W = 720
  const H = 280
  const PAD = { top: 24, right: 24, bottom: 36, left: 56 }
  const innerH = H - PAD.top - PAD.bottom
  const innerW = W - PAD.left - PAD.right

  const N = sorted.length
  const MIN_SLOT_W = 28
  const MAX_SLOT_W = 64
  const slotW = Math.max(MIN_SLOT_W, Math.min(MAX_SLOT_W, innerW / Math.max(1, N)))
  const chartContentW = slotW * N
  const chartStartX = PAD.left + Math.max(0, (innerW - chartContentW) / 2)

  // Build cumulative points using index-based positioning
  let cum = 0
  const points = sorted.map((item, i) => {
    const start = cum
    cum += item.total_value
    return {
      year: item.year,
      idx: i,
      xStart: chartStartX + slotW * i,
      xEnd: chartStartX + slotW * (i + 1),
      start,
      end: cum,
      delta: item.total_value,
      risk: item.avg_risk_score ?? 0,
      count: item.contract_count,
    }
  })

  const yOf = (c: number) => PAD.top + innerH - (c / totalValue) * innerH
  const colorOfRisk = (r: number) => RISK_DOT_COLORS[getRiskLevel(r)]
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ frac: f, value: totalValue * f }))

  const activeYear = hoverYear ?? selectedYear

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto cursor-crosshair"
      role="img"
      aria-label={lang === 'es' ? 'Gasto acumulado a través del tiempo' : 'Cumulative spend over time'}
      onMouseLeave={() => onHoverYear(null)}
    >
      {/* Y grid lines + labels */}
      {yTicks.map((tick) => (
        <g key={tick.frac}>
          <line
            x1={chartStartX}
            x2={chartStartX + chartContentW}
            y1={yOf(tick.value)}
            y2={yOf(tick.value)}
            stroke="var(--color-border)"
            strokeDasharray="2 4"
            strokeWidth={0.5}
            opacity={0.5}
          />
          <text
            x={chartStartX - 6}
            y={yOf(tick.value) + 3}
            textAnchor="end"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            fill="var(--color-text-muted)"
          >
            {formatCompactMXN(tick.value)}
          </text>
        </g>
      ))}

      {/* Active-year highlight column */}
      {activeYear != null && (() => {
        const p = points.find((p) => p.year === activeYear)
        if (!p) return null
        return (
          <rect
            x={p.xStart}
            y={PAD.top}
            width={slotW}
            height={innerH}
            fill="var(--color-text-primary)"
            fillOpacity={0.05}
            stroke="var(--color-text-primary)"
            strokeOpacity={0.18}
            strokeWidth={0.6}
          />
        )
      })()}

      {/* Area fill under the staircase */}
      <path
        d={(() => {
          let d = `M ${points[0].xStart} ${yOf(points[0].start)}`
          for (const p of points) {
            d += ` L ${p.xStart} ${yOf(p.start)} L ${p.xStart} ${yOf(p.end)} L ${p.xEnd} ${yOf(p.end)}`
          }
          d += ` L ${points[points.length - 1].xEnd} ${yOf(0)} L ${points[0].xStart} ${yOf(0)} Z`
          return d
        })()}
        fill={sectorAccent}
        fillOpacity={0.07}
      />

      {/* Stepped path */}
      {points.map((p) => {
        const stepColor = colorOfRisk(p.risk)
        const isActive = p.year === activeYear
        const isPeak = p.year === peakYear
        const baseW = isActive ? 3.6 : isPeak ? 3 : 2.4
        return (
          <g key={`step-${p.year}`} style={{ pointerEvents: 'none' }}>
            <line
              x1={p.xStart}
              y1={yOf(p.start)}
              x2={p.xStart}
              y2={yOf(p.end)}
              stroke={isPeak ? sectorAccent : stepColor}
              strokeWidth={baseW}
              strokeLinecap="square"
              style={isActive || isPeak ? { filter: `drop-shadow(0 0 4px ${stepColor}88)` } : undefined}
            />
            <line
              x1={p.xStart}
              y1={yOf(p.end)}
              x2={p.xEnd}
              y2={yOf(p.end)}
              stroke={isPeak ? sectorAccent : stepColor}
              strokeWidth={baseW}
              strokeLinecap="square"
            />
            {isActive && (
              <circle
                cx={p.xStart}
                cy={yOf(p.end)}
                r={4.5}
                fill={stepColor}
                stroke="var(--color-background)"
                strokeWidth={1.6}
              />
            )}
          </g>
        )
      })}

      {/* Peak-year annotation pin — only when not hovering */}
      {activeYear == null && (() => {
        const p = points.find((p) => p.year === peakYear)
        if (!p) return null
        const yTop = yOf(p.end)
        const pinY = Math.max(PAD.top + 6, yTop - 22)
        return (
          <g style={{ pointerEvents: 'none' }}>
            <line
              x1={p.xStart}
              y1={yTop}
              x2={p.xStart}
              y2={pinY + 6}
              stroke={sectorAccent}
              strokeWidth={0.6}
              strokeDasharray="2 2"
              opacity={0.6}
            />
            <circle cx={p.xStart} cy={yTop} r={3.4} fill={sectorAccent} stroke="var(--color-background)" strokeWidth={1.2} />
            <text
              x={p.xStart}
              y={pinY}
              textAnchor="middle"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
              fill="var(--color-text-secondary)"
            >
              +{formatCompactMXN(p.delta)}
            </text>
            <text
              x={p.xStart}
              y={pinY + 9}
              textAnchor="middle"
              fontSize={8}
              fontFamily="var(--font-family-mono)"
              fill={sectorAccent}
            >
              {p.year}
            </text>
          </g>
        )
      })()}

      {/* Final cumulative callout */}
      {(() => {
        const last = points[points.length - 1]
        const x = last.xEnd
        const y = yOf(last.end)
        return (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={x} cy={y} r={4} fill={sectorAccent} stroke="var(--color-background)" strokeWidth={1.5} />
            <text
              x={Math.min(x - 6, W - 28)}
              y={y - 8}
              textAnchor="end"
              fontSize={11}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
              fill="var(--color-text-primary)"
            >
              {formatCompactMXN(last.end)}
            </text>
            <text
              x={Math.min(x - 6, W - 28)}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              fill="var(--color-text-muted)"
            >
              {lang === 'es' ? `por ${last.year}` : `by ${last.year}`}
            </text>
          </g>
        )
      })()}

      {/* X axis */}
      <line
        x1={chartStartX}
        x2={chartStartX + chartContentW}
        y1={H - PAD.bottom}
        y2={H - PAD.bottom}
        stroke="var(--color-border)"
        strokeWidth={0.7}
      />

      {/* X labels — every year for short, every-other for medium, every-fourth for long */}
      {(() => {
        const stride = N <= 12 ? 1 : N <= 20 ? 2 : 4
        return points.map((p, i) => {
          if (i !== 0 && i !== N - 1 && p.year !== peakYear && i % stride !== 0) return null
          const isPeak = p.year === peakYear
          const isActive = p.year === activeYear
          return (
            <text
              key={`xlabel-${p.year}`}
              x={p.xStart + slotW / 2}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono)"
              fontWeight={isPeak || isActive ? 700 : 400}
              fill={isPeak ? sectorAccent : isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
              opacity={isPeak || isActive ? 1 : 0.7}
            >
              {p.year}
            </text>
          )
        })
      })()}

      {/* Hit areas — full-height rects per year column */}
      {points.map((p) => (
        <rect
          key={`hit-${p.year}`}
          x={p.xStart}
          y={PAD.top}
          width={slotW}
          height={innerH}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => onHoverYear(p.year)}
          onClick={() => onSelectYear(p.year === selectedYear ? null : p.year)}
        />
      ))}

      {/* Pinned-year marker */}
      {selectedYear != null && (() => {
        const p = points.find((p) => p.year === selectedYear)
        if (!p) return null
        return (
          <circle cx={p.xStart} cy={PAD.top - 4} r={2.6} fill="var(--color-text-primary)" style={{ pointerEvents: 'none' }} />
        )
      })()}
    </svg>
  )
}

// ─── MoneyCaption — adaptive editorial sentence ─────────────────────────────

function MoneyCaption({
  mode,
  item,
  cumulative,
  cumulativeShare,
  yearShare,
  sectorAccent,
  lang,
}: {
  mode: 'peak' | 'hover' | 'pin'
  item: TimelineItem
  cumulative: number
  cumulativeShare: number
  yearShare: number
  sectorAccent: string
  lang: 'en' | 'es'
}) {
  const riskPct = Math.round((item.avg_risk_score ?? 0) * 100)
  const riskColor = RISK_DOT_COLORS[getRiskLevel(item.avg_risk_score ?? 0)]
  const admin = getAdministrationByYear(item.year)

  const modeLabel = mode === 'peak'
    ? (lang === 'es' ? 'PICO' : 'PEAK')
    : mode === 'hover'
      ? (lang === 'es' ? 'PASANDO' : 'HOVERING')
      : (lang === 'es' ? 'FIJADO' : 'PINNED')

  return (
    <div style={{ borderLeft: `2px solid ${sectorAccent}`, paddingLeft: 16 }}>
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
            +<CaptionNumber color={sectorAccent}>{formatCompactMXN(item.total_value)}</CaptionNumber>
            {' '}en {formatNumber(item.contract_count)} contratos —{' '}
            <CaptionNumber color={sectorAccent}>{yearShare.toFixed(1)}%</CaptionNumber> del total del año.
            Acumulado a la fecha: <CaptionNumber color={sectorAccent}>{formatCompactMXN(cumulative)}</CaptionNumber>{' '}
            (<CaptionNumber color={sectorAccent}>{cumulativeShare.toFixed(0)}%</CaptionNumber>)
            {admin && <>, bajo {admin.long}</>}
            . Riesgo promedio: <CaptionNumber color={riskColor}>{riskPct}</CaptionNumber>.
          </>
        ) : (
          <>
            +<CaptionNumber color={sectorAccent}>{formatCompactMXN(item.total_value)}</CaptionNumber>
            {' '}across {formatNumber(item.contract_count)} contracts —{' '}
            <CaptionNumber color={sectorAccent}>{yearShare.toFixed(1)}%</CaptionNumber> of the year's total.
            Cumulative to date: <CaptionNumber color={sectorAccent}>{formatCompactMXN(cumulative)}</CaptionNumber>{' '}
            (<CaptionNumber color={sectorAccent}>{cumulativeShare.toFixed(0)}%</CaptionNumber>)
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

function buildMoneyLede({
  vendorName,
  sorted,
  totalValue,
  peakItem,
  peakShare,
  lang,
}: {
  vendorName?: string
  sorted: TimelineItem[]
  totalValue: number
  peakItem: TimelineItem
  peakShare: number
  lang: 'en' | 'es'
}): string {
  const name = vendorName ? cleanVendorName(vendorName) : (lang === 'es' ? 'el proveedor' : 'the vendor')
  const peakAdmin = getAdministrationByYear(peakItem.year)
  const minYear = sorted[0]?.year
  const maxYear = sorted[sorted.length - 1]?.year
  const totalFmt = formatCompactMXN(totalValue)
  const peakFmt = formatCompactMXN(peakItem.total_value)

  // Frame 1: Single-year jump dominates the entire history
  if (peakShare >= 50 && peakAdmin) {
    return lang === 'es'
      ? `Más de la mitad del gasto total de ${name} llegó en un solo año: ${peakItem.year}, bajo ${peakAdmin.long}, ${peakFmt} (${peakShare.toFixed(0)}% de los ${totalFmt} acumulados). El resto se distribuyó entre ${minYear} y ${maxYear}.`
      : `More than half of ${name}'s total spend arrived in a single year: ${peakItem.year}, under ${peakAdmin.long}, ${peakFmt} (${peakShare.toFixed(0)}% of the ${totalFmt} accumulated). The rest spread between ${minYear} and ${maxYear}.`
  }
  // Frame 2: Significant single-year concentration
  if (peakShare >= 25 && peakAdmin) {
    return lang === 'es'
      ? `El gasto acumulado de ${name} subió a ${totalFmt} entre ${minYear} y ${maxYear}, con un salto único de ${peakFmt} en ${peakItem.year} — el ${peakShare.toFixed(0)}% del total, bajo ${peakAdmin.long}.`
      : `${name}'s cumulative spend climbed to ${totalFmt} between ${minYear} and ${maxYear}, with a single ${peakFmt} jump in ${peakItem.year} — ${peakShare.toFixed(0)}% of the total, under ${peakAdmin.long}.`
  }
  // Frame 3: Gradual climb, peak named
  return lang === 'es'
    ? `${name} acumuló ${totalFmt} entre ${minYear} y ${maxYear}. El año más activo fue ${peakItem.year} con ${peakFmt} (${peakShare.toFixed(0)}% del total).`
    : `${name} accumulated ${totalFmt} between ${minYear} and ${maxYear}. The most active year was ${peakItem.year} at ${peakFmt} (${peakShare.toFixed(0)}% of the total).`
}

function cleanVendorName(raw: string): string {
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
  return out.replace(/[A-ZÁÉÍÓÚÑ]{2,}/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}
