/**
 * MonthlySpendingChart — Pure SVG dot-matrix strips.
 *
 * 12 months of federal spending (Ene→Dic), values in B MXN.
 * Each dot = 1.6B MXN; 50 dots max represent 80B.
 * Colors: muted gray for Jan-Sep, orange escalating for Oct-Nov, red for Dec.
 */

import { motion } from 'framer-motion'

interface MonthRow {
  mes: string
  value: number
}

const DATA: MonthRow[] = [
  { mes: 'Ene', value: 42 },
  { mes: 'Feb', value: 38 },
  { mes: 'Mar', value: 45 },
  { mes: 'Abr', value: 41 },
  { mes: 'May', value: 44 },
  { mes: 'Jun', value: 46 },
  { mes: 'Jul', value: 43 },
  { mes: 'Ago', value: 51 },
  { mes: 'Sep', value: 48 },
  { mes: 'Oct', value: 52 },
  { mes: 'Nov', value: 57 },
  { mes: 'Dic', value: 71 },
]

const AVG = 48
const ALERT_COLOR = '#dc2626'
const WARNING_COLOR = '#ea580c'
const SOFT_WARN = '#f97316'
const MUTED_BAR = '#52525b'

const DOTS = 50       // each dot = 1.6B MXN (0-80B domain)
const DOT_PER_B = DOTS / 80
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 58
const COL_W = DOTS * DOT_GAP
const VALUE_W = 50
const ROW_H = STRIP_H + 4

const W = LABEL_W + COL_W + VALUE_W
const H = 40 + DATA.length * ROW_H + 20

function getMonthColor(index: number): string {
  if (index === 11) return ALERT_COLOR
  if (index === 10) return WARNING_COLOR
  if (index === 9) return SOFT_WARN
  return MUTED_BAR
}

function getFillOpacity(index: number): number {
  if (index === 11) return 1
  if (index >= 9) return 0.85
  return 0.6
}

export function MonthlySpendingChart() {
  const avgDot = Math.round(AVG * DOT_PER_B)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-900 p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        RUBLI · Estacionalidad
      </p>
      <h3 className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Diciembre concentra $71B — 48% mas que el promedio mensual
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        El "rush" de fin de ano: Oct-Dic acumulan el 30% del gasto anual en solo 3 meses
      </p>

      {/* Hero stat */}
      <div className="border-l-2 pl-3 py-0.5 mb-4" style={{ borderColor: ALERT_COLOR }}>
        <p className="text-3xl font-mono font-bold" style={{ color: ALERT_COLOR }}>$71B</p>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Gasto Diciembre 2023 — 1.5x el mes promedio</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Monthly federal spending dot matrix, Jan to Dec 2023, each dot 1.6B MXN"
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
            MES
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
            MXN (B)
          </text>

          {/* Avg reference marker */}
          <line
            x1={LABEL_W + avgDot * DOT_GAP + DOT_R}
            x2={LABEL_W + avgDot * DOT_GAP + DOT_R}
            y1={32}
            y2={40 + DATA.length * ROW_H - 4}
            stroke="#a1a1aa"
            strokeDasharray="3 3"
            strokeWidth={1}
            opacity={0.5}
          />
          <text
            x={LABEL_W + avgDot * DOT_GAP + DOT_R + 4}
            y={38}
            fill="#a1a1aa"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
          >
            Prom. ${AVG}B
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 46 + rowIdx * ROW_H
            const color = getMonthColor(rowIdx)
            const opacity = getFillOpacity(rowIdx)
            const filled = Math.round(row.value * DOT_PER_B)

            return (
              <g key={row.mes}>
                {/* Month label */}
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2 + 3}
                  textAnchor="end"
                  fill="#d4d4d8"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.mes}
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
                      fill={isFilled ? color : '#f3f1ec'}
                      fillOpacity={isFilled ? opacity : 1}
                      stroke={isFilled ? 'none' : '#e2ddd6'}
                      strokeWidth={isFilled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.04 + i * 0.003 }}
                    />
                  )
                })}

                {/* Value label */}
                <text
                  x={LABEL_W + COL_W + 8}
                  y={y0 + STRIP_H / 2 + 3}
                  fill={color}
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  ${row.value}B
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <p className="mt-2 text-[10px] text-zinc-600 text-right font-mono">
        Fuente: COMPRANET 2023 · Cada punto = 1.6B MXN · RUBLI v0.6.5
      </p>
    </motion.div>
  )
}

// ✓ dot-matrix rewrite
