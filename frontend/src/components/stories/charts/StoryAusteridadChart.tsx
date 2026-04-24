/**
 * StoryAusteridadChart — Pure SVG dot-matrix showing the paradox.
 *
 * For each of 3 administrations (Calderón, Peña, AMLO), render two
 * strips: gray (spend in Tn MXN, each dot 0.1T) and red (DA%, each
 * dot 2pp). Visual tension: spend strip stays flat/shrinks while DA
 * strip grows red.
 */

import { motion } from 'framer-motion'

interface EraRow {
  era: string
  spendTn: number
  daPct: number
  contracts: string
  cohort: string
}

const DATA: EraRow[] = [
  { era: 'Calderon',   spendTn: 2.41, daPct: 42.3, contracts: '481K',  cohort: '2007-2012' },
  { era: 'Pena Nieto', spendTn: 3.06, daPct: 73.1, contracts: '1.23M', cohort: '2013-2018' },
  { era: 'AMLO',       spendTn: 2.76, daPct: 79.4, contracts: '1.05M', cohort: '2019-2024' },
]

const SPEND_DOTS = 40          // each dot = 0.1T (0-4T domain)
const SPEND_DOT_PER_T = SPEND_DOTS / 4
const DA_DOTS = 50             // each dot = 2pp (0-100% domain)
const DA_DOT_PER_PCT = DA_DOTS / 100

const SPEND_COLOR = '#a1a1aa'
const DA_COLOR = '#dc2626'

const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 108
const MAX_COL_W = Math.max(SPEND_DOTS, DA_DOTS) * DOT_GAP
const VALUE_W = 72
const STRIP_GAP = 3
const ERA_GAP = 14
const ERA_BLOCK_H = 2 * STRIP_H + STRIP_GAP + 10

const W = LABEL_W + MAX_COL_W + VALUE_W
const H = 40 + DATA.length * (ERA_BLOCK_H + ERA_GAP) + 10

export function StoryAusteridadChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-background-card border border-border p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1.5">
        RUBLI · Austeridad
      </p>

      <p className="text-lg font-bold text-text-primary leading-tight mb-0.5">
        El gasto bajó 10%. La opacidad subió 8 puntos.
      </p>
      <p className="text-xs text-text-muted mb-4">
        Gasto total y tasa de adjudicación directa por administración · COMPRANET 2007-2024
      </p>

      <div className="flex gap-6 mb-5">
        <div className="border-l-2 border-border pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-text-secondary">-10%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">gasto Pena a AMLO</div>
        </div>
        <div className="border-l-2 border-red-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-red-500">+8.6pp</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">opacidad Pena a AMLO</div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Spend vs DA rate by administration, dot matrix"
        >
          {/* Legend row */}
          <g>
            <circle cx={LABEL_W + 4} cy={20} r={3} fill={SPEND_COLOR} />
            <text x={LABEL_W + 14} y={24} fill={SPEND_COLOR} fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
              GASTO TOTAL (cada punto = 0.1T MXN)
            </text>
            <circle cx={LABEL_W + 288} cy={20} r={3} fill={DA_COLOR} />
            <text x={LABEL_W + 298} y={24} fill={DA_COLOR} fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
              ADJ. DIRECTA (cada punto = 2pp)
            </text>
          </g>

          {/* Era blocks */}
          {DATA.map((row, rowIdx) => {
            const blockY = 40 + rowIdx * (ERA_BLOCK_H + ERA_GAP)
            const spendFilled = Math.round(row.spendTn * SPEND_DOT_PER_T)
            const daFilled = Math.round(row.daPct * DA_DOT_PER_PCT)

            return (
              <g key={row.era}>
                {/* Era + cohort label */}
                <text
                  x={LABEL_W - 6}
                  y={blockY + 4}
                  textAnchor="end"
                  fill="#d4d4d8"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.era}
                </text>
                <text
                  x={LABEL_W - 6}
                  y={blockY + 15}
                  textAnchor="end"
                  fill="#52525b"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.cohort}
                </text>
                <text
                  x={LABEL_W - 6}
                  y={blockY + 25}
                  textAnchor="end"
                  fill="#52525b"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.contracts}
                </text>

                {/* Spend strip */}
                {(() => {
                  const yStrip = blockY + 4
                  return (
                    <g>
                      {Array.from({ length: SPEND_DOTS }).map((_, i) => {
                        const isFilled = i < spendFilled
                        return (
                          <motion.circle
                            key={`spend-${i}`}
                            cx={LABEL_W + i * DOT_GAP + DOT_R}
                            cy={yStrip + STRIP_H / 2}
                            r={DOT_R}
                            fill={isFilled ? SPEND_COLOR : '#2d2926'}
                            fillOpacity={isFilled ? 0.75 : 1}
                            stroke={isFilled ? 'none' : '#3d3734'}
                            strokeWidth={isFilled ? 0 : 0.5}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: rowIdx * 0.05 + i * 0.003 }}
                          />
                        )
                      })}
                      <text
                        x={LABEL_W + MAX_COL_W + 8}
                        y={yStrip + STRIP_H / 2 + 3}
                        fill={SPEND_COLOR}
                        fontSize={10}
                        fontFamily="var(--font-family-mono)"
                        fontWeight={600}
                      >
                        ${row.spendTn.toFixed(2)}T
                      </text>
                    </g>
                  )
                })()}

                {/* DA strip */}
                {(() => {
                  const yStrip = blockY + 4 + STRIP_H + STRIP_GAP
                  return (
                    <g>
                      {Array.from({ length: DA_DOTS }).map((_, i) => {
                        const isFilled = i < daFilled
                        return (
                          <motion.circle
                            key={`da-${i}`}
                            cx={LABEL_W + i * DOT_GAP + DOT_R}
                            cy={yStrip + STRIP_H / 2}
                            r={DOT_R}
                            fill={isFilled ? DA_COLOR : '#2d2926'}
                            fillOpacity={isFilled ? 0.95 : 1}
                            stroke={isFilled ? 'none' : '#3d3734'}
                            strokeWidth={isFilled ? 0 : 0.5}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: rowIdx * 0.05 + 0.08 + i * 0.003 }}
                          />
                        )
                      })}
                      <text
                        x={LABEL_W + MAX_COL_W + 8}
                        y={yStrip + STRIP_H / 2 + 3}
                        fill={DA_COLOR}
                        fontSize={10}
                        fontFamily="var(--font-family-mono)"
                        fontWeight={600}
                      >
                        {row.daPct}% DA
                      </text>
                    </g>
                  )
                })()}
              </g>
            )
          })}
        </svg>
      </div>

      <p className="text-[10px] text-text-muted mt-3">
        Fuente: COMPRANET · Análisis RUBLI v0.6.5
      </p>
    </motion.div>
  )
}

// ✓ dot-matrix rewrite
