/**
 * StoryAnoSinExcusas — 2023: the year without excuses.
 *
 * Yearly dot strips 2019-2024 showing DA rate. 2023 highlighted deep red.
 * OECD threshold (25%) as a vertical line. A context strip below marks
 * which years had COVID active (gray bg for 2020-2021).
 */

import { motion } from 'framer-motion'

interface YearRow {
  year: number
  daRate: number
  covid: boolean
  label?: string
}

const DATA: YearRow[] = [
  { year: 2019, daRate: 74.1, covid: false },
  { year: 2020, daRate: 78.6, covid: true,  label: 'pandemia' },
  { year: 2021, daRate: 79.2, covid: true,  label: 'pandemia' },
  { year: 2022, daRate: 79.8, covid: false },
  { year: 2023, daRate: 82.2, covid: false, label: 'RÉCORD · sin emergencia' },
  { year: 2024, daRate: 78.9, covid: false, label: 'transición' },
]

const OECD_LIMIT = 25

const DOTS = 50 // each dot = 2pp, strip reads left → right
const DOT_R = 3.4
const DOT_GAP_X = 10
const ROW_H = 56
const LABEL_W = 90
const COVID_W = 100
const VALUE_W = 60

const STRIP_W = DOTS * DOT_GAP_X
const W = LABEL_W + STRIP_W + VALUE_W + COVID_W + 20
const H = 64 + DATA.length * ROW_H + 24

export function StoryAnoSinExcusas() {
  const oecdDotIdx = Math.round(OECD_LIMIT / 2)
  const LEFT_FOR_DOT = (i: number) => LABEL_W + i * DOT_GAP_X + DOT_GAP_X / 2

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        RUBLI · Tasa de adjudicación directa · 2019-2024
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        2023: el año récord sin pandemia, sin emergencia declarada, sin excusa operativa
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        Cada fila es un año. Cada punto vale 2pp de adjudicación directa. La línea cian
        marca el máximo OCDE (25%). El fondo gris indica años con pandemia activa. 2023
        batió el récord histórico verificable con ninguna de las dos excusas disponibles.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-risk-critical tabular-nums">82.2%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            adj. directa 2023 · récord verificable
          </div>
        </div>
        <div className="border-l-2 border-cyan-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-cyan-400 tabular-nums">3.3x</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            sobre el máximo OCDE de 25%
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-risk-high tabular-nums">+3.0pp</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            vs. 2022 · sin emergencia que justifique
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-background p-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[680px]"
          role="img"
          aria-label="Direct award rate by year 2019-2024 with COVID context"
        >
          {/* Header */}
          <text x={LABEL_W - 8} y={36} textAnchor="end" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            AÑO
          </text>
          <text x={LABEL_W + STRIP_W / 2} y={20} textAnchor="middle" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            TASA DE ADJUDICACIÓN DIRECTA (0% → 100%)
          </text>

          {/* OECD line label */}
          <g>
            <line
              x1={LABEL_W + oecdDotIdx * DOT_GAP_X - DOT_GAP_X / 2}
              y1={32}
              x2={LABEL_W + oecdDotIdx * DOT_GAP_X - DOT_GAP_X / 2}
              y2={H - 24}
              stroke="#22d3ee"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={LABEL_W + oecdDotIdx * DOT_GAP_X - DOT_GAP_X / 2}
              y={28}
              textAnchor="middle"
              fill="#22d3ee"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
            >
              OCDE 25%
            </text>
          </g>
          <text x={LABEL_W + STRIP_W + VALUE_W / 2} y={36} textAnchor="middle" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            %
          </text>
          <text x={LABEL_W + STRIP_W + VALUE_W + COVID_W / 2} y={36} textAnchor="middle" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            CONTEXTO
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 50 + rowIdx * ROW_H
            const cy = y0 + ROW_H / 2
            const isRecord = row.year === 2023
            const filled = Math.round(row.daRate / 2)
            const fillColor = isRecord ? '#dc2626' : '#a16207'

            return (
              <g key={row.year}>
                {/* Row highlight */}
                {isRecord && (
                  <rect
                    x={LABEL_W - 4}
                    y={y0 + 4}
                    width={STRIP_W + VALUE_W + 8}
                    height={ROW_H - 8}
                    rx={4}
                    fill="#dc2626"
                    fillOpacity={0.06}
                    stroke="#dc2626"
                    strokeOpacity={0.3}
                    strokeWidth={0.75}
                  />
                )}

                {/* Year label */}
                <text
                  x={LABEL_W - 10}
                  y={cy - 4}
                  textAnchor="end"
                  fill={isRecord ? '#f87171' : '#e4e4e7'}
                  fontSize={isRecord ? 20 : 16}
                  fontFamily="var(--font-family-serif)"
                  fontWeight={isRecord ? 800 : 600}
                  dominantBaseline="middle"
                >
                  {row.year}
                </text>
                {row.label && (
                  <text
                    x={LABEL_W - 10}
                    y={cy + 14}
                    textAnchor="end"
                    fill={isRecord ? '#fca5a5' : '#71717a'}
                    fontSize={8.5}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={isRecord ? 700 : 400}
                  >
                    {row.label}
                  </text>
                )}

                {/* Dot strip */}
                {Array.from({ length: DOTS }).map((_, i) => {
                  const cx = LEFT_FOR_DOT(i)
                  const isFilled = i < filled
                  return (
                    <motion.circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={DOT_R}
                      fill={isFilled ? fillColor : 'var(--color-background-elevated)'}
                      stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                      strokeWidth={isFilled ? 0 : 0.6}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.08 + i * 0.005 }}
                    />
                  )
                })}

                {/* Value label */}
                <text
                  x={LABEL_W + STRIP_W + VALUE_W - 6}
                  y={cy}
                  textAnchor="end"
                  fill={isRecord ? '#f87171' : '#d4d4d8'}
                  fontSize={isRecord ? 14 : 12}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={isRecord ? 800 : 600}
                  dominantBaseline="middle"
                >
                  {row.daRate.toFixed(1)}%
                </text>

                {/* COVID context strip */}
                <g transform={`translate(${LABEL_W + STRIP_W + VALUE_W + 8}, ${y0 + 6})`}>
                  <rect
                    width={COVID_W - 16}
                    height={ROW_H - 12}
                    rx={3}
                    fill={row.covid ? '#52525b' : '#18181b'}
                    fillOpacity={row.covid ? 0.6 : 0.8}
                    stroke={row.covid ? '#71717a' : 'var(--color-background-elevated)'}
                    strokeWidth={0.75}
                  />
                  <text
                    x={(COVID_W - 16) / 2}
                    y={(ROW_H - 12) / 2 + 3}
                    textAnchor="middle"
                    fill={row.covid ? '#e4e4e7' : '#71717a'}
                    fontSize={9}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={600}
                    letterSpacing="0.05em"
                  >
                    {row.covid ? 'COVID activo' : 'sin emergencia'}
                  </text>
                </g>
              </g>
            )
          })}

          {/* Bottom legend */}
          <text
            x={LABEL_W + STRIP_W / 2}
            y={H - 6}
            textAnchor="middle"
            fill="#52525b"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
          >
            cada punto = 2pp · fila roja = año récord sin emergencia activa
          </text>
        </svg>
      </div>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-risk-high mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-text-secondary">
          Durante los años de pandemia (2020-2021), la tasa subió 5pp. Sin pandemia, en 2023,
          subió otros 3pp más hasta el récord. La emergencia sanitaria no se convirtió en
          excepción temporal: se volvió hábito administrativo permanente.
        </p>
      </div>

      <p className="text-[10px] text-text-muted font-mono">
        Fuente: COMPRANET 2019-2024 · Structure B-D · OCDE Public Procurement Report 2023
      </p>
    </motion.div>
  )
}
