/**
 * DaBySectorChart — Pure SVG dot-strip chart.
 *
 * Each sector is a row of dots. Each dot represents 2 percentage points
 * of direct-award rate. Sector color fills dots; 25% OECD limit shown
 * as a vertical cyan ceiling line. Reader scans rows like a barcode —
 * every sector crosses the ceiling.
 */

import { motion } from 'framer-motion'
import { SECTOR_COLORS } from '@/lib/constants'

const SECTORS = [
  { code: 'agricultura',    name: 'Agricultura',    rate: 93.4 },
  { code: 'defensa',        name: 'Defensa',        rate: 89.2 },
  { code: 'gobernacion',    name: 'Gobernación',    rate: 85.1 },
  { code: 'tecnologia',     name: 'Tecnología',     rate: 82.7 },
  { code: 'salud',          name: 'Salud',          rate: 78.9 },
  { code: 'trabajo',        name: 'Trabajo',        rate: 78.3 },
  { code: 'energia',        name: 'Energía',        rate: 77.6 },
  { code: 'hacienda',       name: 'Hacienda',       rate: 76.8 },
  { code: 'infraestructura',name: 'Infraestructura',rate: 74.2 },
  { code: 'ambiente',       name: 'Ambiente',       rate: 73.9 },
  { code: 'educacion',      name: 'Educación',      rate: 71.5 },
  { code: 'otros',          name: 'Otros',          rate: 68.3 },
]

const DOTS_TOTAL = 50 // each dot = 2 percentage points
const DOT_R = 4
const DOT_GAP = 11
const ROW_H = 22
const LABEL_W = 120
const LEFT_PAD = 16

const W = LEFT_PAD + LABEL_W + DOTS_TOTAL * DOT_GAP + 80
const H = 50 + SECTORS.length * ROW_H + 20

function colorFor(code: string): string {
  return (SECTOR_COLORS as Record<string, string>)[code] || '#64748b'
}

export function DaBySectorChart() {
  const oecdDots = Math.round(25 / 2) // = 13 dots (at 2pp each)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-background border border-border p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        RUBLI · Por sector
      </p>
      <h3 className="text-lg font-bold text-text-primary leading-tight mb-0.5">
        Cada fila es un sector — cada punto vale 2 puntos porcentuales
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Todos cruzan la línea OCDE. Agricultura llega a 93% · Otros, el menor, triplica el límite.
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Direct award rate by sector as dot strip, 12 sectors, OECD ceiling at 25%"
      >
        {/* OECD ceiling line */}
        <line
          x1={LEFT_PAD + LABEL_W + oecdDots * DOT_GAP}
          x2={LEFT_PAD + LABEL_W + oecdDots * DOT_GAP}
          y1={20}
          y2={H - 20}
          stroke="#22d3ee"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <text
          x={LEFT_PAD + LABEL_W + oecdDots * DOT_GAP}
          y={15}
          textAnchor="middle"
          fill="#22d3ee"
          fontSize={10}
          fontFamily="var(--font-family-mono)"
          fontWeight={600}
        >
          OCDE 25%
        </text>

        {/* Rows */}
        {SECTORS.map((s, rowIdx) => {
          const y = 40 + rowIdx * ROW_H
          const filledDots = Math.round(s.rate / 2)
          const color = colorFor(s.code)
          return (
            <g key={s.code}>
              {/* Sector label */}
              <text
                x={LEFT_PAD + LABEL_W - 8}
                y={y + 4}
                textAnchor="end"
                fill="#d4d4d8"
                fontSize={11}
                fontFamily="var(--font-family-mono)"
              >
                {s.name}
              </text>

              {/* Dot strip */}
              {Array.from({ length: DOTS_TOTAL }).map((_, i) => {
                const isFilled = i < filledDots
                const isAboveOecd = i >= oecdDots && isFilled
                return (
                  <motion.circle
                    key={i}
                    cx={LEFT_PAD + LABEL_W + i * DOT_GAP + DOT_R}
                    cy={y}
                    r={DOT_R}
                    fill={isFilled ? color : '#2d2926'}
                    fillOpacity={isAboveOecd ? 1 : isFilled ? 0.5 : 1}
                    stroke={isFilled ? 'none' : '#3d3734'}
                    strokeWidth={isFilled ? 0 : 1}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: rowIdx * 0.04 + i * 0.005 }}
                  />
                )
              })}

              {/* Percentage label */}
              <text
                x={LEFT_PAD + LABEL_W + DOTS_TOTAL * DOT_GAP + 10}
                y={y + 4}
                fill={color}
                fontSize={11}
                fontFamily="var(--font-family-mono)"
                fontWeight={700}
              >
                {s.rate}%
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-text-muted font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full opacity-50" style={{ background: '#64748b' }} />
          Debajo de OCDE
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#64748b' }} />
          Sobre OCDE — riesgo
        </span>
      </div>

      <p className="mt-2 text-[10px] text-text-muted font-mono">
        Fuente: COMPRANET 2002-2025 · 3.05M contratos · RUBLI v0.6.5
      </p>
    </motion.div>
  )
}
