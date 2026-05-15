/**
 * MoneyStaircase — cumulative MXN as a stepped path.
 * Extracted from RedThread.tsx.
 *
 * The cumulative line tells the time-as-drama story. Each step's color is
 * graduated by avg risk in that year. The two largest single-year jumps get
 * pinned annotations.
 */

import { useTranslation } from 'react-i18next'
import { formatCompactMXN, getRiskLevel } from '@/lib/utils'

// ─── Local constants ────────────────────────────────────────────────────────

const RISK_DOT_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high:     'var(--color-risk-high)',
  medium:   'var(--color-risk-medium)',
  low:      'var(--color-text-muted)',
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface MoneyStaircaseProps {
  timeline: Array<{ year: number; avg_risk_score: number | null; contract_count: number; total_value: number }>
  selectedYear: number | null
  hoverYear: number | null
  onHoverYear: (y: number | null) => void
  onSelectYear: (y: number | null) => void
  byYearLabel: string
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MoneyStaircase({
  timeline,
  selectedYear,
  hoverYear,
  onHoverYear,
  onSelectYear,
  byYearLabel,
}: MoneyStaircaseProps) {
  const { t: _t } = useTranslation('redThread')

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

  const top3Jumps = [...points].sort((a, b) => b.delta - a.delta).slice(0, 2).map((p) => p.year)

  const W = 720
  const H = 300
  const PAD = { top: 36, right: 12, bottom: 36, left: 56 }
  const innerH = H - PAD.top - PAD.bottom
  const innerW = W - PAD.left - PAD.right

  const xOf = (year: number) => PAD.left + ((year - minYear) / yearSpan) * innerW
  const xOfNext = (year: number) => PAD.left + ((year + 1 - minYear) / yearSpan) * innerW
  const yOf = (c: number) => PAD.top + innerH - (c / totalCum) * innerH

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
      {yTicks.map((tick) => (
        <g key={tick.frac}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yOf(tick.value)} y2={yOf(tick.value)} stroke="var(--color-border)" strokeDasharray="2 4" strokeWidth={0.5} opacity={0.5} />
          <text x={PAD.left - 6} y={yOf(tick.value) + 3} textAnchor="end" fontSize={9} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)">
            {formatCompactMXN(tick.value)}
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
        fill="var(--color-accent)"
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

      {/* Annotation pins — top-2 jumps */}
      {activeYear == null && points.filter((p) => top3Jumps.includes(p.year)).map((p, idx) => {
        const x = xOf(p.year)
        const yTop = yOf(p.end)
        const stepColor = colorOfRisk(p.risk)
        const pinY = Math.max(PAD.top + 6, yTop - 18 - idx * 4)
        return (
          <g key={`pin-${p.year}`} style={{ pointerEvents: 'none' }}>
            <line x1={x} y1={yTop} x2={x} y2={pinY + 6} stroke={stepColor} strokeWidth={0.6} strokeDasharray="2 2" opacity={0.6} />
            <circle cx={x} cy={yTop} r={3.2} fill={stepColor} stroke="var(--color-background)" strokeWidth={1} />
            <text x={x} y={pinY} textAnchor="middle" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={700} fill="var(--color-text-secondary)">
              +{formatCompactMXN(p.delta)}
            </text>
            <text x={x} y={pinY + 9} textAnchor="middle" fontSize={8} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)">
              {p.year}
            </text>
          </g>
        )
      })}

      {/* Pinned-year marker */}
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
            <circle cx={x} cy={y} r={4} fill="var(--color-accent)" stroke="var(--color-background)" strokeWidth={1.5} />
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

      {/* Hit-areas — full-height rects per year column */}
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
