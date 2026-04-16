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

// ── Halton + seeded RNG (same as ConcentrationConstellation) ─────────────────
function halton(index: number, base: number): number {
  let result = 0; let f = 1 / base; let i = index
  while (i > 0) { result += f * (i % base); i = Math.floor(i / base); f /= base }
  return result
}
function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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
}: RiskRingFieldProps) {
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
          })
      )}

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
