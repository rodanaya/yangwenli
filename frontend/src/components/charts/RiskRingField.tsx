/**
 * RiskRingField — dot-ring replacement for the classic donut/pie chart.
 *
 * N dots distributed along a ring, colored by risk level, in proportion
 * to the risk distribution. Critical dots are slightly larger, brighter,
 * and positioned in the inner half of the ring. Low dots drift to the
 * outer edge — the same centripetal logic as ConcentrationConstellation's
 * attractor clustering, applied radially.
 *
 * Replaces PieChart / donut in SectorProfile, InstitutionProfile, and
 * any other context that currently renders risk composition as a pie.
 *
 * At 160×160px it reads as a concise risk fingerprint. At 220×220px it
 * becomes a full panel visual. Fully deterministic — no animation.
 */

import { motion } from 'framer-motion'
import { halton, mulberry32 } from '@/lib/particle'

const DOT = {
  critical: { r: 2.2, fill: '#ef4444', alpha: 0.92 },
  high:     { r: 1.6, fill: '#f59e0b', alpha: 0.78 },
  medium:   { r: 1.1, fill: '#a16207', alpha: 0.55 },
  low:      { r: 0.7, fill: '#52525b', alpha: 0.38 },
} as const

type Level = keyof typeof DOT

export interface RiskRingRow {
  level: Level
  pct: number   // 0-100
  count: number
}

interface RiskRingFieldProps {
  rows: RiskRingRow[]
  size?: number
  n?: number   // number of dots
  centerLabel?: string
  centerSublabel?: string
  seed?: number
  className?: string
  /**
   * When true, dots animate in progressively on first render (constellation
   * reveal). Critical dots appear first, followed by high/medium/low in that
   * order. Used on page-level entry points (e.g. SectorProfile).
   */
  animate?: boolean
}

const ORDER: Level[] = ['critical', 'high', 'medium', 'low']

export function RiskRingField({
  rows,
  size = 160,
  n = 120,
  centerLabel,
  centerSublabel,
  seed = 42,
  className,
  animate = false,
}: RiskRingFieldProps) {
  // Animation tuning: dots stagger in order (critical → low), largest/most-critical
  // first. Delay and duration keep the full reveal under ~1.6s.
  const ANIM_BASE_DELAY = 0.08
  const ANIM_STEP_DELAY = 0.008  // 120 dots × 0.008 = 0.96s span
  const ANIM_LEVEL_OFFSET: Record<Level, number> = {
    critical: 0.00,
    high:     0.20,
    medium:   0.45,
    low:      0.70,
  }
  const cx = size / 2
  const cy = size / 2

  // Ring parameters: critical near inner, low near outer
  const RING_INNER = size * 0.23
  const RING_OUTER = size * 0.46
  const RING_SPAN  = RING_OUTER - RING_INNER

  // Allocate dots per level
  const byLevel = Object.fromEntries(ORDER.map((l) => [l, rows.find((r) => r.level === l)?.pct ?? 0])) as Record<Level, number>
  const totalPct = ORDER.reduce((s, l) => s + byLevel[l], 0) || 100

  const counts: Record<Level, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  let allocated = 0
  for (const lvl of ORDER) {
    const c = Math.round((byLevel[lvl] / totalPct) * n)
    counts[lvl] = c
    allocated += c
  }
  counts.low += n - allocated  // absorb rounding remainder

  // Build label array: low first, critical last (painted on top)
  const labels: Level[] = []
  for (const lvl of ['low', 'medium', 'high', 'critical'] as Level[]) {
    for (let i = 0; i < counts[lvl]; i++) labels.push(lvl)
  }

  const rng = mulberry32(seed * 1337)

  // Place dots on ring — angle from Halton(2), radius biased by level
  const LEVEL_RADIUS_BIAS: Record<Level, number> = {
    critical: 0.10,  // inner 10-40% of ring span
    high:     0.30,  // 30-60%
    medium:   0.55,  // 55-80%
    low:      0.75,  // 75-100%
  }
  const LEVEL_RADIUS_WIDTH: Record<Level, number> = {
    critical: 0.30,
    high:     0.30,
    medium:   0.25,
    low:      0.25,
  }

  const dots = labels.map((level, i) => {
    const angle = halton(i + 1, 2) * Math.PI * 2 + (rng() - 0.5) * 0.18
    const bias  = LEVEL_RADIUS_BIAS[level]
    const width = LEVEL_RADIUS_WIDTH[level]
    const rFrac = bias + rng() * width
    const radius = RING_INNER + rFrac * RING_SPAN
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    return { x, y, level }
  })

  // Annotations: one per visible level
  const annoRadius = RING_OUTER + 14
  const annoPositions: Record<Level, number> = {
    critical: -Math.PI / 2,         // top
    high:      Math.PI * 0.1,       // upper-right
    medium:    Math.PI * 0.6,       // lower-right
    low:       Math.PI * 1.2,       // lower-left
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Risk distribution ring field"
    >
      {/* ── Faint guide ring ─────────────────────────────────────────────── */}
      <circle cx={cx} cy={cy} r={RING_OUTER} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={RING_SPAN} />

      {/* ── Dots (low → critical, so critical paints on top) ─────────────── */}
      {(['low', 'medium', 'high', 'critical'] as Level[]).flatMap((paintLevel) =>
        dots
          .filter((d) => d.level === paintLevel)
          .map((d, i) => {
            const s = DOT[paintLevel]
            if (!animate) {
              return (
                <circle
                  key={`${paintLevel}-${i}`}
                  cx={d.x}
                  cy={d.y}
                  r={s.r}
                  fill={s.fill}
                  fillOpacity={s.alpha}
                />
              )
            }
            const delay =
              ANIM_BASE_DELAY + ANIM_LEVEL_OFFSET[paintLevel] + i * ANIM_STEP_DELAY
            return (
              <motion.circle
                key={`${paintLevel}-${i}`}
                cx={d.x}
                cy={d.y}
                r={s.r}
                fill={s.fill}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: s.alpha }}
                transition={{
                  delay,
                  type: 'spring',
                  damping: 20,
                  stiffness: 110,
                  opacity: { duration: 0.35, delay },
                }}
                style={{ originX: `${d.x}px`, originY: `${d.y}px`, transformBox: 'fill-box' }}
              />
            )
          })
      )}

      {/* ── Critical sparkle pulse (only when animate=true) ──────────────── */}
      {animate &&
        dots
          .filter((d) => d.level === 'critical')
          .slice(0, 3)
          .map((d, i) => (
            <motion.circle
              key={`sparkle-${i}`}
              cx={d.x}
              cy={d.y}
              r={DOT.critical.r}
              fill={DOT.critical.fill}
              fillOpacity={0.6}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2.4, 0], opacity: [0, 0.45, 0] }}
              transition={{
                delay: 0.6 + i * 0.18,
                duration: 0.9,
                ease: 'easeOut',
                times: [0, 0.4, 1],
              }}
              style={{ originX: `${d.x}px`, originY: `${d.y}px`, transformBox: 'fill-box' }}
            />
          ))}

      {/* ── Connecting "shooting star" lines between critical dots ──────── */}
      {animate &&
        (() => {
          const criticalDots = dots.filter((d) => d.level === 'critical')
          // Pick up to 5 nearest-neighbor pairs for a subtle web of light.
          const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
          for (let i = 0; i < Math.min(criticalDots.length, 6); i++) {
            const a = criticalDots[i]
            let best = -1
            let bd = Infinity
            for (let j = i + 1; j < criticalDots.length; j++) {
              const b = criticalDots[j]
              const dx = a.x - b.x
              const dy = a.y - b.y
              const d = dx * dx + dy * dy
              if (d < bd) { bd = d; best = j }
            }
            if (best >= 0) {
              const b = criticalDots[best]
              edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
            }
          }
          return edges.map((e, idx) => {
            const length = Math.hypot(e.x2 - e.x1, e.y2 - e.y1)
            return (
              <motion.line
                key={`critline-${idx}`}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={DOT.critical.fill}
                strokeOpacity={0.35}
                strokeWidth={0.7}
                strokeLinecap="round"
                strokeDasharray={length}
                initial={{ strokeDashoffset: length, opacity: 0 }}
                animate={{ strokeDashoffset: 0, opacity: 0.35 }}
                transition={{
                  delay: 0.9 + idx * 0.1,
                  duration: 0.7,
                  ease: 'easeOut',
                }}
              />
            )
          })
        })()}

      {/* ── Level annotations ─────────────────────────────────────────────── */}
      {ORDER.filter((l) => (byLevel[l] || 0) > 0.5).map((level) => {
        const angle  = annoPositions[level]
        const ax = cx + Math.cos(angle) * annoRadius
        const ay = cy + Math.sin(angle) * annoRadius
        const row = rows.find((r) => r.level === level)
        if (!row) return null
        const anchor = ax < cx - 4 ? 'end' : ax > cx + 4 ? 'start' : 'middle'
        return (
          <text
            key={`anno-${level}`}
            x={ax}
            y={ay}
            fill={DOT[level].fill}
            fontSize={8}
            fontFamily="var(--font-family-mono, monospace)"
            fontWeight="bold"
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {row.pct.toFixed(1)}%
          </text>
        )
      })}

      {/* ── Center label ─────────────────────────────────────────────────── */}
      {centerLabel && (
        <text
          x={cx}
          y={cy - 5}
          fill="rgba(255,255,255,0.85)"
          fontSize={11}
          fontFamily="var(--font-family-mono, monospace)"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {centerLabel}
        </text>
      )}
      {centerSublabel && (
        <text
          x={cx}
          y={cy + 9}
          fill="#71717a"
          fontSize={7.5}
          fontFamily="var(--font-family-mono, monospace)"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {centerSublabel}
        </text>
      )}
    </svg>
  )
}
