/**
 * SexenioComparisonChart — Pure SVG dot-matrix grouped by sexenio.
 *
 * For each of 4 metrics, render 4 stacked dot strips (Fox, Calderon,
 * Peña Nieto, AMLO). Each dot = 1pp. The visual story: every metric
 * shows a progressively longer red AMLO strip.
 */

import { motion } from 'framer-motion'

interface MetricRow {
  metric: string
  unit: string
  fox: number
  calderon: number
  pena: number
  amlo: number
}

const DATA: MetricRow[] = [
  { metric: 'Adj. Directa',   unit: '%', fox: 63.5, calderon: 64.2, pena: 71.8, amlo: 79.4 },
  { metric: 'Licit. unica',   unit: '%', fox: 12.1, calderon: 13.4, pena: 15.7, amlo: 18.2 },
  { metric: 'Riesgo alto',    unit: '%', fox: 4.2,  calderon: 5.1,  pena: 7.3,  amlo: 11.8 },
  { metric: 'Concentracion',  unit: '%', fox: 18.3, calderon: 19.7, pena: 23.4, amlo: 28.9 },
]

const FOX_COLOR = '#52525b'
const CALDERON_COLOR = '#71717a'
const PENA_COLOR = '#a1a1aa'
const AMLO_COLOR = '#dc2626'

const SEXENIO_ROWS = [
  { key: 'fox',      label: 'Fox',        color: FOX_COLOR,      opacity: 0.55 },
  { key: 'calderon', label: 'Calderón',   color: CALDERON_COLOR, opacity: 0.6  },
  { key: 'pena',     label: 'Peña',       color: PENA_COLOR,     opacity: 0.7  },
  { key: 'amlo',     label: 'AMLO',       color: AMLO_COLOR,     opacity: 1    },
] as const

type SexenioKey = 'fox' | 'calderon' | 'pena' | 'amlo'

const DOTS = 80        // each dot = 1pp (0-80%)
const DOT_R = 2.5
const DOT_GAP = 7
const STRIP_H = 8
const SEXENIO_GAP = 2
const SEXENIO_BLOCK_H = SEXENIO_ROWS.length * (STRIP_H + SEXENIO_GAP) + 4
const METRIC_GAP = 10
const LABEL_W = 118
const COL_W = DOTS * DOT_GAP
const VALUE_W = 80

const W = LABEL_W + COL_W + VALUE_W
const H = 50 + DATA.length * (SEXENIO_BLOCK_H + METRIC_GAP) + 20

export function SexenioComparisonChart() {
  const worstMetric = DATA.reduce((worst, d) => {
    const delta = d.amlo - d.fox
    return delta > worst.delta ? { name: d.metric, delta, amloVal: d.amlo } : worst
  }, { name: '', delta: 0, amloVal: 0 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-background-card p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        RUBLI · Diagnostico sexenal
      </p>
      <h3 className="text-lg font-bold text-text-primary leading-tight mb-0.5">
        Todos los indicadores empeoran con cada sexenio
      </h3>
      <p className="text-xs text-text-muted mb-4">
        Mayor deterioro: {worstMetric.name} (+{worstMetric.delta.toFixed(1)} pts Fox a AMLO)
      </p>

      {/* Sexenio legend */}
      <div className="flex items-center gap-4 mb-3">
        {SEXENIO_ROWS.map((r) => (
          <div key={r.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color, opacity: r.opacity }} />
            <span className="text-[10px] font-mono text-text-muted">{r.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-sm border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Four metrics by sexenio, dot matrix, each dot 1pp"
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
            INDICADOR / SEXENIO
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
            VALOR
          </text>

          {/* Metric blocks */}
          {DATA.map((row, metricIdx) => {
            const blockY = 38 + metricIdx * (SEXENIO_BLOCK_H + METRIC_GAP)

            return (
              <g key={row.metric}>
                {/* Metric label at block top */}
                <text
                  x={LABEL_W - 6}
                  y={blockY}
                  textAnchor="end"
                  fill="#d4d4d8"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.metric}
                </text>

                {/* Divider under metric label */}
                <line
                  x1={LABEL_W - 2}
                  x2={LABEL_W + COL_W + VALUE_W - 2}
                  y1={blockY + 4}
                  y2={blockY + 4}
                  stroke="var(--color-border-hover)"
                  strokeWidth={0.5}
                />

                {/* 4 sexenio strips */}
                {SEXENIO_ROWS.map((sx, sxIdx) => {
                  const value = row[sx.key as SexenioKey]
                  const filled = Math.round(value)
                  const yStrip = blockY + 10 + sxIdx * (STRIP_H + SEXENIO_GAP)

                  return (
                    <g key={sx.key}>
                      {/* Sexenio label */}
                      <text
                        x={LABEL_W - 6}
                        y={yStrip + STRIP_H / 2 + 3}
                        textAnchor="end"
                        fill="#71717a"
                        fontSize={9}
                        fontFamily="var(--font-family-mono)"
                      >
                        {sx.label}
                      </text>

                      {/* Dots */}
                      {Array.from({ length: DOTS }).map((_, i) => {
                        const isFilled = i < filled
                        return (
                          <motion.circle
                            key={i}
                            cx={LABEL_W + i * DOT_GAP + DOT_R}
                            cy={yStrip + STRIP_H / 2}
                            r={DOT_R}
                            fill={isFilled ? sx.color : 'var(--color-background-elevated)'}
                            fillOpacity={isFilled ? sx.opacity : 1}
                            stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                            strokeWidth={isFilled ? 0 : 0.5}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: metricIdx * 0.05 + sxIdx * 0.04 + i * 0.002 }}
                          />
                        )
                      })}

                      {/* Value */}
                      <text
                        x={LABEL_W + COL_W + 8}
                        y={yStrip + STRIP_H / 2 + 3}
                        fill={sx.color}
                        fontSize={9}
                        fontFamily="var(--font-family-mono)"
                        fontWeight={sx.key === 'amlo' ? 700 : 500}
                        opacity={sx.key === 'amlo' ? 1 : 0.85}
                      >
                        {value}{row.unit}
                      </text>
                    </g>
                  )
                })}
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
