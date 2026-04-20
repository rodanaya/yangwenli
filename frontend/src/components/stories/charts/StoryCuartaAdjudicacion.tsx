/**
 * StoryCuartaAdjudicacion — Pure SVG 4-ring donut.
 *
 * Four concentric rings, each representing a presidential era's average
 * direct-award rate. The innermost ring is Calderón; then Peña Nieto;
 * then AMLO sexenio average; the outer ring is AMLO's 2023 peak.
 * Each ring's arc sweep equals its DA percentage — reader sees the
 * staircase literally spiraling outward.
 */

import { motion } from 'framer-motion'

const RINGS = [
  { era: 'Calderón',         years: '2007-2012', rate: 42.3, color: '#3b82f6', track: '#1e3a8a' },
  { era: 'Peña Nieto',       years: '2013-2018', rate: 73.1, color: '#ef4444', track: '#7f1d1d' },
  { era: 'AMLO (promedio)',  years: '2019-2024', rate: 79.4, color: '#f59e0b', track: '#78350f' },
  { era: 'AMLO · pico 2023', years: '2023',      rate: 82.2, color: '#dc2626', track: '#450a0a' },
]

const CX = 220
const CY = 220
const STROKE = 16
const GAP = 6
const INNER_R = 50

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function StoryCuartaAdjudicacion() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-950 border border-zinc-800/60 p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        RUBLI · Hallazgo
      </p>

      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Cada sexenio batió el récord del anterior
      </p>
      <p className="text-xs text-zinc-500 mb-5">
        Cuatro anillos, cuatro administraciones — el arco crece con cada era
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        {/* The donut */}
        <div className="flex items-center justify-center">
          <svg
            viewBox="0 0 440 440"
            className="w-full max-w-md h-auto"
            role="img"
            aria-label="Four concentric rings showing direct award rate rising across Calderón, Peña Nieto, AMLO average, and AMLO 2023 peak"
          >
            {/* OECD 25% reference ring (faint dashed) */}
            <circle
              cx={CX}
              cy={CY}
              r={INNER_R + RINGS.length * (STROKE + GAP) + 10}
              fill="none"
              stroke="#22d3ee"
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="3 4"
            />

            {RINGS.map((ring, i) => {
              const r = INNER_R + i * (STROKE + GAP) + STROKE / 2
              const sweep = (ring.rate / 100) * 360
              // OECD marker at 25%
              const oecdSweep = (25 / 100) * 360

              return (
                <g key={ring.era}>
                  {/* Track (full circle, faint) */}
                  <circle
                    cx={CX}
                    cy={CY}
                    r={r}
                    fill="none"
                    stroke={ring.track}
                    strokeOpacity={0.4}
                    strokeWidth={STROKE}
                  />
                  {/* Filled arc = DA rate */}
                  <motion.path
                    d={arcPath(CX, CY, r, 0, sweep)}
                    fill="none"
                    stroke={ring.color}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: i * 0.25, ease: 'easeOut' }}
                  />
                  {/* OECD tick on this ring */}
                  <line
                    x1={CX + (r - STROKE / 2 - 2) * Math.sin((oecdSweep * Math.PI) / 180)}
                    y1={CY - (r - STROKE / 2 - 2) * Math.cos((oecdSweep * Math.PI) / 180)}
                    x2={CX + (r + STROKE / 2 + 2) * Math.sin((oecdSweep * Math.PI) / 180)}
                    y2={CY - (r + STROKE / 2 + 2) * Math.cos((oecdSweep * Math.PI) / 180)}
                    stroke="#22d3ee"
                    strokeWidth={1.5}
                  />
                </g>
              )
            })}

            {/* Center text */}
            <text
              x={CX}
              y={CY - 8}
              textAnchor="middle"
              fill="#71717a"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              letterSpacing="0.1em"
            >
              OCDE MÁX
            </text>
            <text
              x={CX}
              y={CY + 14}
              textAnchor="middle"
              fill="#22d3ee"
              fontSize={22}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
            >
              25%
            </text>
          </svg>
        </div>

        {/* Ring legend */}
        <div className="flex flex-col justify-center gap-3 min-w-[200px]">
          {RINGS.map((ring, i) => (
            <motion.div
              key={ring.era}
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              className="border-l-2 pl-3"
              style={{ borderColor: ring.color }}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-bold" style={{ color: ring.color }}>
                  {ring.rate}%
                </span>
                <span className="text-[10px] font-mono text-zinc-600">
                  {(ring.rate / 25).toFixed(1)}x OCDE
                </span>
              </div>
              <div className="text-xs text-zinc-300 font-semibold">{ring.era}</div>
              <div className="text-[10px] text-zinc-500 font-mono">{ring.years}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Finding */}
      <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-red-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          La adjudicación directa promedio pasó de 42% bajo Calderón a 82% en 2023 bajo AMLO
          — una duplicación en dieciséis años. Cada anillo rompe el récord del anterior.
        </p>
      </div>

      <p className="mt-3 text-[10px] text-zinc-600 font-mono">
        Fuente: COMPRANET · Análisis RUBLI v0.6.5
      </p>
    </motion.div>
  )
}
