/**
 * StoryProcedureBreakdown — Pure SVG three-stripe dot matrix.
 *
 * Each sector is a row containing three horizontal mini-strips:
 *   - Red strip    = direct award (%)
 *   - Orange strip = single bid (%)
 *   - Green strip  = open tender (%)
 * Each dot = 2pp. Reader scans the matrix and sees red dominate,
 * green shrink — Infraestructura stands out as the only green-heavy row.
 */

import { motion } from 'framer-motion'

interface SectorRow {
  name: string
  direct: number
  single: number
  open: number
}

const DATA: SectorRow[] = [
  { name: 'Agricultura',    direct: 93.4, single: 3.2,  open: 3.4  },
  { name: 'Hacienda',       direct: 80.0, single: 5.1,  open: 14.9 },
  { name: 'Trabajo',        direct: 75.9, single: 8.7,  open: 15.4 },
  { name: 'Educación',      direct: 72.3, single: 12.1, open: 15.6 },
  { name: 'Tecnología',     direct: 71.8, single: 14.2, open: 14.0 },
  { name: 'Salud',          direct: 63.8, single: 15.2, open: 21.0 },
  { name: 'Ambiente',       direct: 62.1, single: 11.8, open: 26.1 },
  { name: 'Gobernación',    direct: 60.3, single: 13.5, open: 26.2 },
  { name: 'Defensa',        direct: 56.3, single: 22.1, open: 21.6 },
  { name: 'Energía',        direct: 55.7, single: 9.3,  open: 35.0 },
  { name: 'Otros',          direct: 52.0, single: 9.8,  open: 38.2 },
  { name: 'Infraestructura',direct: 31.9, single: 8.2,  open: 59.9 },
]

const COLORS = {
  direct: '#dc2626',
  single: '#ea580c',
  open:   '#16a34a',
}

const DOTS = 50 // each dot = 2pp
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 9
const LABEL_W = 110
const TRIO_H = 3 * STRIP_H + 2 * 2 + 6 // strips + gaps + padding
const COL_W = DOTS * DOT_GAP

const W = LABEL_W + COL_W + 70
const H = 50 + DATA.length * TRIO_H + 10

export function StoryProcedureBreakdown() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        RUBLI · Procedimiento por sector
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        9 de 12 sectores adjudican más de la mitad de sus contratos sin competencia
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        Cada sector es un bloque con tres bandas: roja = adjudicación directa,
        naranja = licitación con un solo oferente, verde = licitación abierta.
        Cada punto vale 2 puntos porcentuales.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-risk-critical">93.4%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            Agricultura · adj. directa · <span className="text-[color:var(--color-oecd)]">OCDE máx 25%</span>
          </div>
        </div>
        <div className="border-l-2 border-text-muted pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-text-muted">59.9%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            Infraestructura · licitación abierta · único sector {'>'}50%
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-background p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Procedure breakdown dot matrix: 12 sectors, 3 strips each (direct award, single bid, open tender)"
        >
          {/* Header */}
          <text x={LABEL_W - 8} y={24} textAnchor="end" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            SECTOR
          </text>
          <g transform={`translate(${LABEL_W}, 20)`}>
            <circle cx={3} cy={2} r={3} fill={COLORS.direct} />
            <text x={11} y={6} fill="#dc2626" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
              DIRECTA
            </text>
            <circle cx={80} cy={2} r={3} fill={COLORS.single} />
            <text x={88} y={6} fill="#ea580c" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
              UN SOLO OFERENTE
            </text>
            <circle cx={205} cy={2} r={3} fill={COLORS.open} />
            <text x={213} y={6} fill="#16a34a" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
              LICITACIÓN ABIERTA
            </text>
          </g>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 50 + rowIdx * TRIO_H

            return (
              <g key={row.name}>
                {/* Sector label */}
                <text
                  x={LABEL_W - 8}
                  y={y0 + TRIO_H / 2}
                  textAnchor="end"
                  fill="#d4d4d8"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.name}
                </text>

                {/* Three dot strips */}
                {([
                  { key: 'direct', pct: row.direct, color: COLORS.direct },
                  { key: 'single', pct: row.single, color: COLORS.single },
                  { key: 'open',   pct: row.open,   color: COLORS.open   },
                ] as const).map((strip, stripIdx) => {
                  const yStrip = y0 + stripIdx * (STRIP_H + 1)
                  const filled = Math.round(strip.pct / 2)
                  return (
                    <g key={strip.key}>
                      {Array.from({ length: DOTS }).map((_, i) => {
                        const isFilled = i < filled
                        return (
                          <motion.circle
                            key={i}
                            cx={LABEL_W + i * DOT_GAP + DOT_R}
                            cy={yStrip + STRIP_H / 2}
                            r={DOT_R}
                            fill={isFilled ? strip.color : 'var(--color-background-elevated)'}
                            stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                            strokeWidth={isFilled ? 0 : 0.5}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: rowIdx * 0.03 + stripIdx * 0.08 + i * 0.002 }}
                          />
                        )
                      })}
                      {/* Percentage */}
                      <text
                        x={LABEL_W + COL_W + 8}
                        y={yStrip + STRIP_H / 2 + 3}
                        fill={strip.color}
                        fontSize={9}
                        fontFamily="var(--font-family-mono)"
                        fontWeight={600}
                      >
                        {strip.pct.toFixed(1)}%
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-risk-high mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-text-secondary">
          Defensa tiene la tasa más alta de licitación con un solo oferente (22.1%) —
          casi una cuarta parte de sus "competencias" reciben una sola propuesta.
          Combinado con 56.3% de adjudicación directa, efectivamente el 78.4% de los
          contratos de Defensa carecen de competencia real.
        </p>
      </div>

      <p className="text-[10px] text-text-muted font-mono">
        Fuente: COMPRANET 2002-2025 · 3.05M contratos · OCDE Public Procurement Report 2023
      </p>
    </motion.div>
  )
}
