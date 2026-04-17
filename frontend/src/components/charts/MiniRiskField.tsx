/**
 * MiniRiskField — a tiny particle-field replacement for bar sparklines.
 *
 * 60 dots in a Halton(2,3) low-discrepancy layout, colored by risk level
 * in proportion to the supplied risk distribution. Deterministic across
 * renders — identical input = identical layout every time.
 *
 * Drop-in substitute for mini bar charts in card/list contexts.
 * At 88×32px it reads as "structure, not data" — a texture that communicates
 * risk concentration without demanding attention the way bars do.
 *
 * Usage:
 *   <MiniRiskField
 *     criticalPct={6.01}
 *     highPct={7.48}
 *     mediumPct={26.84}
 *     lowPct={59.67}
 *     seed={42}        // optional: different cards get different layouts
 *   />
 */

import { halton, mulberry32 } from '@/lib/particle'

const W = 88
const H = 32
const N = 60

const DOT = {
  critical: { r: 1.6, fill: '#ef4444', alpha: 0.95 },
  high:     { r: 1.2, fill: '#f59e0b', alpha: 0.82 },
  medium:   { r: 0.9, fill: '#a16207', alpha: 0.60 },
  low:      { r: 0.6, fill: '#71717a', alpha: 0.38 },
} as const

type Level = keyof typeof DOT

interface MiniRiskFieldProps {
  criticalPct: number
  highPct: number
  mediumPct: number
  lowPct: number
  seed?: number
  className?: string
  width?: number
  height?: number
}

export function MiniRiskField({
  criticalPct,
  highPct,
  mediumPct,
  lowPct,
  seed = 7,
  className,
  width = W,
  height = H,
}: MiniRiskFieldProps) {
  // Allocate dots proportionally, critical dots painted last (on top)
  const total = criticalPct + highPct + mediumPct + lowPct || 100
  const nCrit = Math.max(1, Math.round((criticalPct / total) * N))
  const nHigh = Math.max(0, Math.round((highPct / total) * N))
  const nMed  = Math.max(0, Math.round((mediumPct / total) * N))
  const nLow  = Math.max(0, N - nCrit - nHigh - nMed)

  // Build label array: low first so critical paints on top
  const labels: Level[] = []
  for (let i = 0; i < nLow;  i++) labels.push('low')
  for (let i = 0; i < nMed;  i++) labels.push('medium')
  for (let i = 0; i < nHigh; i++) labels.push('high')
  for (let i = 0; i < nCrit; i++) labels.push('critical')

  const rng = mulberry32(seed * 13337)

  // Paint in low→medium→high→critical order for proper layering
  const paintOrder: Level[] = ['low', 'medium', 'high', 'critical']

  const dots = Array.from({ length: N }, (_, i) => {
    const u = halton(i + 1, 2)
    const v = halton(i + 1, 3)
    const jx = (rng() - 0.5) * 2.5
    const jy = (rng() - 0.5) * 2.5
    const x = Math.max(2, Math.min(width - 2,  u * width  + jx))
    const y = Math.max(2, Math.min(height - 2, v * height + jy))
    return { x, y, level: labels[i] }
  })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
    >
      {paintOrder.flatMap((lvl) =>
        dots
          .filter((d) => d.level === lvl)
          .map((d, i) => {
            const s = DOT[lvl]
            return (
              <circle
                key={`${lvl}-${i}`}
                cx={d.x}
                cy={d.y}
                r={s.r}
                fill={s.fill}
                fillOpacity={s.alpha}
              />
            )
          })
      )}
    </svg>
  )
}
