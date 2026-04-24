/**
 * AmloEraComparisonChart — Pure SVG dot-matrix.
 *
 * Shows DA-rate peak per sexenio (Fox, Calderon, Peña, AMLO).
 * Each row is a strip; each dot = 1pp; 0-90% domain.
 * OECD 25% limit marked with a cyan vertical line.
 */

import { motion } from 'framer-motion'

interface EraRow {
  era: string
  years: string
  avg: number
  peak: number
}

const DATA: EraRow[] = [
  { era: 'Fox',        years: '2000-06', avg: 63.5, peak: 65.1 },
  { era: 'Calderon',   years: '2007-12', avg: 64.2, peak: 67.1 },
  { era: 'Pena Nieto', years: '2013-18', avg: 71.8, peak: 76.2 },
  { era: 'AMLO',       years: '2019-24', avg: 79.4, peak: 81.9 },
]

const ERA_PALETTE: Record<string, string> = {
  'Fox': '#52525b',
  'Calderon': '#71717a',
  'Pena Nieto': '#a1a1aa',
  'AMLO': '#dc2626',
}

const OECD_LIMIT = 25
const OECD_COLOR = '#22d3ee'

const DOTS = 90        // each dot = 1pp (0-90% domain)
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 106
const COL_W = DOTS * DOT_GAP
const VALUE_W = 66
const ROW_H = STRIP_H + 6

const W = LABEL_W + COL_W + VALUE_W
const H = 50 + DATA.length * ROW_H + 16

export function AmloEraComparisonChart() {
  const oecdDot = OECD_LIMIT // 1 dot per pct

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-background-card p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        RUBLI · Comparacion sexenal
      </p>
      <h3 className="text-lg font-bold text-text-primary leading-tight mb-0.5">
        AMLO promedio 79.4% — cada sexenio supera al anterior
      </h3>
      <p className="text-xs text-text-muted mb-4">
        +15.9 pts vs era Fox. El pico de 81.9% es 3.3x el limite OCDE.
      </p>

      {/* Stat strip */}
      <div className="flex gap-6 mb-4">
        {DATA.map((d) => (
          <div key={d.era} className="flex-1">
            <p className="text-[10px] font-mono uppercase tracking-wide text-text-muted">{d.era}</p>
            <p className="text-xl font-mono font-bold" style={{ color: ERA_PALETTE[d.era] }}>{d.avg}%</p>
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="DA peak rate by sexenio, dot matrix, each dot 1pp"
        >
          {/* Header */}
          <text
            x={LABEL_W - 6}
            y={22}
            textAnchor="end"
            fill="#52525b"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.1em"
          >
            SEXENIO
          </text>
          <text
            x={LABEL_W + COL_W + VALUE_W - 2}
            y={22}
            textAnchor="end"
            fill="#52525b"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.1em"
          >
            PICO % DA
          </text>

          {/* OECD line */}
          <line
            x1={LABEL_W + oecdDot * DOT_GAP + DOT_R}
            x2={LABEL_W + oecdDot * DOT_GAP + DOT_R}
            y1={32}
            y2={50 + DATA.length * ROW_H - 4}
            stroke={OECD_COLOR}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            opacity={0.85}
          />
          <text
            x={LABEL_W + oecdDot * DOT_GAP + DOT_R + 4}
            y={38}
            fill={OECD_COLOR}
            fontSize={9}
            fontFamily="var(--font-family-mono)"
          >
            OCDE 25%
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 56 + rowIdx * ROW_H
            const color = ERA_PALETTE[row.era]
            const filled = Math.round(row.peak)
            const opacity = row.era === 'AMLO' ? 1 : 0.6

            return (
              <g key={row.era}>
                {/* Era + years */}
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2}
                  textAnchor="end"
                  fill="#d4d4d8"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.era}
                </text>
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2 + 10}
                  textAnchor="end"
                  fill="#52525b"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.years}
                </text>

                {/* Dots */}
                {Array.from({ length: DOTS }).map((_, i) => {
                  const isFilled = i < filled
                  return (
                    <motion.circle
                      key={i}
                      cx={LABEL_W + i * DOT_GAP + DOT_R}
                      cy={y0 + STRIP_H / 2}
                      r={DOT_R}
                      fill={isFilled ? color : '#2d2926'}
                      fillOpacity={isFilled ? opacity : 1}
                      stroke={isFilled ? 'none' : '#3d3734'}
                      strokeWidth={isFilled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.06 + i * 0.002 }}
                    />
                  )
                })}

                {/* Value */}
                <text
                  x={LABEL_W + COL_W + 8}
                  y={y0 + STRIP_H / 2 + 3}
                  fill={color}
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.peak}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <p className="mt-2 text-[10px] text-text-muted text-right font-mono">
        Fuente: COMPRANET 2002-2025 · Cada punto = 1pp · RUBLI v0.6.5
      </p>
    </motion.div>
  )
}

// ✓ dot-matrix rewrite
