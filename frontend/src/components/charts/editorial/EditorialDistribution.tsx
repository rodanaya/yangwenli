/**
 * EditorialDistribution — density-ridge chart for risk score distributions.
 *
 * Part C / prim-P1 of FULL_SITE_GRAPHICS_AUDIT.md.
 * Replaces 6 generic histogram implementations across ARIA, Explore,
 * InstitutionLeague, PriceIntelligence, Methodology.
 *
 * Encoding:
 *   - Frequency-bin polygon smoothed with running average (Gaussian-like,
 *     no d3 dep). 60 bins default.
 *   - Vertical dashed reference lines at each threshold, labeled at top.
 *   - Area to the right of the highest threshold filled with highlightColor.
 *   - Caption below in text-text-muted text-[11px].
 *
 * KDE / smoothing: 3-pass running average over frequency bins (σ ≈ 2 bins),
 * adequate for our row counts (3.1M → down-sampled by caller as needed).
 * Bandwidth is intentionally simple — no d3-scale dep required.
 */

import { useMemo } from 'react'
import { RISK_COLORS, RISK_THRESHOLDS, getRiskLevelFromScore } from '@/lib/constants'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DistributionThreshold {
  value: number
  label: string
  color?: string
}

export interface EditorialDistributionProps {
  /** Raw values to distribute. Caller may down-sample for performance. */
  data: number[]
  /** X axis range. Defaults to [0, 1] (risk score space). */
  domain?: [number, number]
  /** Number of frequency bins before smoothing. Default 60. */
  bins?: number
  /**
   * Vertical reference lines. Defaults to the three canonical risk thresholds
   * (0.25 medium / 0.40 high / 0.60 critical) drawn from RISK_THRESHOLDS.
   */
  thresholds?: DistributionThreshold[]
  /** SVG height (px). Default 200. */
  height?: number
  /** Body fill color (CSS color). Default: slate-300 at 0.35 opacity via fill-opacity. */
  fillColor?: string
  /**
   * Fill color for the area above the highest threshold.
   * Default: RISK_COLORS.critical (#ef4444) at 0.20 opacity.
   */
  highlightColor?: string
  /** Optional caption below the chart. */
  caption?: string
  i18n?: {
    highRiskLabel?: string
  }
}

// ─── Default thresholds ─────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS: DistributionThreshold[] = [
  { value: RISK_THRESHOLDS.medium,   label: 'Medio',    color: RISK_COLORS.medium },
  { value: RISK_THRESHOLDS.high,     label: 'Alto',     color: RISK_COLORS.high },
  { value: RISK_THRESHOLDS.critical, label: 'Crítico',  color: RISK_COLORS.critical },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** 3-pass running average to smooth raw bin counts. */
function smooth(arr: number[], passes = 3): number[] {
  let cur = [...arr]
  for (let p = 0; p < passes; p++) {
    const next = [...cur]
    for (let i = 1; i < cur.length - 1; i++) {
      next[i] = (cur[i - 1] + cur[i] * 2 + cur[i + 1]) / 4
    }
    cur = next
  }
  return cur
}

/** Build a frequency histogram from raw values. */
function buildBins(
  data: number[],
  domain: [number, number],
  binCount: number
): number[] {
  const [lo, hi] = domain
  const span = hi - lo
  const counts = new Array<number>(binCount).fill(0)
  for (const v of data) {
    if (v < lo || v > hi) continue
    const idx = Math.min(Math.floor(((v - lo) / span) * binCount), binCount - 1)
    counts[idx]++
  }
  return counts
}

// ─── Component ───────────────────────────────────────────────────────────────

const MARGIN = { top: 24, right: 16, bottom: 8, left: 4 }

export function EditorialDistribution({
  data,
  domain = [0, 1],
  bins = 60,
  thresholds = DEFAULT_THRESHOLDS,
  height = 200,
  fillColor = '#94a3b8',
  highlightColor = RISK_COLORS.critical,
  caption,
  i18n,
}: EditorialDistributionProps) {
  // Chart dimensions — width is fluid; we'll use viewBox approach
  const W = 480
  const plotW = W - MARGIN.left - MARGIN.right
  const plotH = height - MARGIN.top - MARGIN.bottom

  const { polyPoints, highlightPoints } = useMemo(() => {
    if (data.length === 0) {
      return { polyPoints: '', highlightPoints: '', maxCount: 1 }
    }

    const raw = buildBins(data, domain, bins)
    const smoothed = smooth(raw)
    const maxCount = Math.max(...smoothed, 1)

    const [lo, hi] = domain
    const span = hi - lo

    // The highest threshold value — used to draw the highlight region
    const sortedThresholds = [...thresholds].sort((a, b) => a.value - b.value)
    const highestThreshold = sortedThresholds[sortedThresholds.length - 1]?.value ?? hi

    const toX = (binIdx: number) => MARGIN.left + (binIdx / bins) * plotW
    const toY = (count: number) => MARGIN.top + plotH - (count / maxCount) * plotH

    // Build the density polygon points (closed path for fill)
    const pts: string[] = []
    // baseline left
    pts.push(`${toX(0)},${MARGIN.top + plotH}`)
    // density curve
    for (let i = 0; i <= bins; i++) {
      const count = i < bins ? smoothed[i] : 0
      pts.push(`${toX(i)},${toY(count)}`)
    }
    // baseline right
    pts.push(`${toX(bins)},${MARGIN.top + plotH}`)

    // Build highlight polygon — same curve, but only for values ≥ highestThreshold
    const thresholdBinFrac = (highestThreshold - lo) / span
    const thresholdBinIdx = thresholdBinFrac * bins

    const hPts: string[] = []
    const startX = MARGIN.left + thresholdBinFrac * plotW
    hPts.push(`${startX},${MARGIN.top + plotH}`)

    for (let i = Math.floor(thresholdBinIdx); i <= bins; i++) {
      const count = i < bins ? smoothed[i] : 0
      hPts.push(`${toX(i)},${toY(count)}`)
    }
    hPts.push(`${toX(bins)},${MARGIN.top + plotH}`)

    return {
      polyPoints: pts.join(' '),
      highlightPoints: hPts.join(' '),
    }
  }, [data, domain, bins, thresholds])

  // Map threshold value → x pixel
  const [lo, hi] = domain
  const span = hi - lo
  const thresholdX = (v: number) =>
    MARGIN.left + ((v - lo) / span) * plotW

  // Risk level for each threshold label (for color defaulting)
  const resolvedThresholds = thresholds.map((t) => ({
    ...t,
    color: t.color ?? RISK_COLORS[getRiskLevelFromScore(t.value)],
  }))

  const highRiskLabel = i18n?.highRiskLabel ?? 'alto riesgo'

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full"
        style={{ height }}
        aria-label={`Distribución de valores con ${data.length.toLocaleString()} observaciones`}
        role="img"
      >
        {/* Density body fill */}
        {data.length > 0 && (
          <polygon
            points={polyPoints}
            fill={fillColor}
            fillOpacity={0.35}
            stroke={fillColor}
            strokeOpacity={0.6}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        )}

        {/* High-risk highlight region */}
        {data.length > 0 && highlightPoints && (
          <polygon
            points={highlightPoints}
            fill={highlightColor}
            fillOpacity={0.20}
            stroke="none"
          />
        )}

        {/* Empty state */}
        {data.length === 0 && (
          <text
            x={W / 2}
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill="#94a3b8"
          >
            Sin datos
          </text>
        )}

        {/* Threshold reference lines */}
        {resolvedThresholds.map((t) => {
          const x = thresholdX(t.value)
          return (
            <g key={t.value}>
              <line
                x1={x}
                y1={MARGIN.top}
                x2={x}
                y2={MARGIN.top + plotH}
                stroke={t.color}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.8}
              />
              {/* Label at top */}
              <text
                x={x + 3}
                y={MARGIN.top - 4}
                fontSize={9}
                fontFamily="ui-monospace, monospace"
                fill={t.color}
                opacity={0.9}
              >
                {t.label}
              </text>
              {/* Value tick */}
              <text
                x={x + 3}
                y={MARGIN.top + 10}
                fontSize={8}
                fontFamily="ui-monospace, monospace"
                fill={t.color}
                opacity={0.7}
              >
                {t.value.toFixed(2)}
              </text>
            </g>
          )
        })}

        {/* X-axis baseline */}
        <line
          x1={MARGIN.left}
          y1={MARGIN.top + plotH}
          x2={MARGIN.left + plotW}
          y2={MARGIN.top + plotH}
          stroke="#cbd5e1"
          strokeWidth={0.5}
        />

        {/* Domain labels */}
        <text
          x={MARGIN.left}
          y={MARGIN.top + plotH + 12}
          fontSize={9}
          fontFamily="ui-monospace, monospace"
          fill="#94a3b8"
        >
          {lo.toFixed(2)}
        </text>
        <text
          x={MARGIN.left + plotW}
          y={MARGIN.top + plotH + 12}
          fontSize={9}
          fontFamily="ui-monospace, monospace"
          fill="#94a3b8"
          textAnchor="end"
        >
          {hi.toFixed(2)}
        </text>

        {/* High-risk annotation */}
        {resolvedThresholds.length > 0 && data.length > 0 && (() => {
          const sorted = [...resolvedThresholds].sort((a, b) => a.value - b.value)
          const top = sorted[sorted.length - 1]
          const x = thresholdX(top.value)
          const labelX = x + (MARGIN.left + plotW - x) / 2
          return (
            <text
              x={labelX}
              y={MARGIN.top + plotH - 6}
              textAnchor="middle"
              fontSize={8}
              fontFamily="ui-monospace, monospace"
              fill={highlightColor}
              opacity={0.75}
            >
              ↑ {highRiskLabel}
            </text>
          )
        })()}
      </svg>

      {caption && (
        <figcaption
          className="mt-1 text-[11px] leading-snug"
          style={{ color: '#94a3b8' }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
