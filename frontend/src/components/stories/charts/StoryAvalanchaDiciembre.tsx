/**
 * StoryAvalanchaDiciembre — Pure SVG monthly dot avalanche.
 *
 * 12 vertical columns (one per month). Each dot = 1 billion MXN.
 * Jan-Sep: gray dots (baseline). Oct: amber tint. Nov: orange. Dec: red burst
 * towering above the rest. Horizontal reference line at monthly average.
 */

import { motion } from 'framer-motion'

interface Month {
  m: string
  value: number // MXN billions
  color: string
  stroke: string
}

// December 2014 peak case — 51.4B. Neighboring months from COMPRANET.
const MONTHS: Month[] = [
  { m: 'ENE', value: 12, color: '#3f3f46', stroke: '#52525b' },
  { m: 'FEB', value: 15, color: '#3f3f46', stroke: '#52525b' },
  { m: 'MAR', value: 18, color: '#3f3f46', stroke: '#52525b' },
  { m: 'ABR', value: 16, color: '#3f3f46', stroke: '#52525b' },
  { m: 'MAY', value: 17, color: '#3f3f46', stroke: '#52525b' },
  { m: 'JUN', value: 19, color: '#3f3f46', stroke: '#52525b' },
  { m: 'JUL', value: 17, color: '#3f3f46', stroke: '#52525b' },
  { m: 'AGO', value: 20, color: '#3f3f46', stroke: '#52525b' },
  { m: 'SEP', value: 22, color: '#71717a', stroke: '#a1a1aa' },
  { m: 'OCT', value: 28, color: '#eab308', stroke: '#facc15' },
  { m: 'NOV', value: 36, color: '#ea580c', stroke: '#fb923c' },
  { m: 'DIC', value: 51, color: '#dc2626', stroke: '#ef4444' },
]

const AVG = 22.6 // average monthly spend 2014

const W = 640
const H = 420
const PADDING_L = 48
const PADDING_R = 60
const PADDING_T = 30
const PADDING_B = 40
const COL_W = (W - PADDING_L - PADDING_R) / MONTHS.length
const CHART_H = H - PADDING_T - PADDING_B
const MAX_VAL = 55 // cap

// Each dot represents 1B MXN
const DOT_R = 3.2
const DOT_SPACING_Y = 7

export function StoryAvalanchaDiciembre() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-950 border border-zinc-800/60 p-5 space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        RUBLI · Avalancha de Diciembre
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        51.4 mil millones en 31 días — el mes donde el presupuesto huye del calendario
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        Gasto federal por mes en 2014 · cada punto representa mil millones de pesos.
        Diciembre triplicó el promedio mensual porque la Ley de Presupuesto obliga
        a devolver lo no ejercido al Tesoro antes del 31.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-red-500">$51.4B</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">DIC 2014 · pico histórico</div>
        </div>
        <div className="border-l-2 border-orange-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-orange-400">7,215</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">contratos en 31 días</div>
        </div>
        <div className="border-l-2 border-zinc-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-zinc-300">233/día</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">incluye sábados y domingos</div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Monthly federal spending 2014: January through November baseline, December explodes to 51.4B MXN"
      >
        {/* Y axis gridlines */}
        {[0, 10, 20, 30, 40, 50].map((v) => {
          const y = PADDING_T + CHART_H - (v / MAX_VAL) * CHART_H
          return (
            <g key={v}>
              <line
                x1={PADDING_L}
                x2={W - PADDING_R}
                y1={y}
                y2={y}
                stroke="#27272a"
                strokeWidth={0.5}
                strokeDasharray="2 4"
              />
              <text
                x={PADDING_L - 6}
                y={y + 3}
                textAnchor="end"
                fill="#52525b"
                fontSize={9}
                fontFamily="var(--font-family-mono)"
              >
                ${v}B
              </text>
            </g>
          )
        })}

        {/* Average reference line */}
        <motion.line
          x1={PADDING_L}
          x2={W - PADDING_R}
          y1={PADDING_T + CHART_H - (AVG / MAX_VAL) * CHART_H}
          y2={PADDING_T + CHART_H - (AVG / MAX_VAL) * CHART_H}
          stroke="#22d3ee"
          strokeWidth={1}
          strokeDasharray="4 3"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        />
        <text
          x={W - PADDING_R + 4}
          y={PADDING_T + CHART_H - (AVG / MAX_VAL) * CHART_H + 3}
          fill="#22d3ee"
          fontSize={9}
          fontFamily="var(--font-family-mono)"
          fontWeight={600}
        >
          PROM ${AVG}B
        </text>

        {/* Month columns */}
        {MONTHS.map((month, mi) => {
          const cx = PADDING_L + mi * COL_W + COL_W / 2
          const baseY = PADDING_T + CHART_H
          const dotCount = month.value

          return (
            <g key={month.m}>
              {/* Dots stacked bottom-up */}
              {Array.from({ length: dotCount }).map((_, di) => {
                const cy = baseY - 8 - di * DOT_SPACING_Y
                return (
                  <motion.circle
                    key={di}
                    cx={cx}
                    cy={cy}
                    r={DOT_R}
                    fill={month.color}
                    stroke={month.stroke}
                    strokeWidth={0.5}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: mi * 0.04 + di * 0.02 }}
                  />
                )
              })}

              {/* Value label on top */}
              <text
                x={cx}
                y={baseY - 8 - dotCount * DOT_SPACING_Y - 6}
                textAnchor="middle"
                fill={month.color === '#dc2626' ? '#ef4444' : month.color === '#ea580c' ? '#fb923c' : '#71717a'}
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fontWeight={600}
              >
                {month.value}
              </text>

              {/* Month label */}
              <text
                x={cx}
                y={H - PADDING_B + 18}
                textAnchor="middle"
                fill={mi === 11 ? '#ef4444' : '#71717a'}
                fontSize={10}
                fontFamily="var(--font-family-mono)"
                fontWeight={mi === 11 ? 700 : 500}
              >
                {month.m}
              </text>
            </g>
          )
        })}

        {/* Avalanche indicator — arrow + annotation */}
        <g>
          <motion.line
            x1={PADDING_L + 11 * COL_W + COL_W / 2 - 30}
            y1={PADDING_T + 30}
            x2={PADDING_L + 11 * COL_W + COL_W / 2 - 6}
            y2={PADDING_T + 50}
            stroke="#fbbf24"
            strokeWidth={1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          />
          <motion.text
            x={PADDING_L + 11 * COL_W + COL_W / 2 - 100}
            y={PADDING_T + 24}
            fill="#fbbf24"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            fontWeight={600}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            2.3× el promedio anual
          </motion.text>
        </g>
      </svg>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          Diciembre concentra entre 2.5 y 4× el gasto mensual promedio en los últimos
          23 años — patrón bipartidista. La urgencia es contable, no operativa:
          entregas se programan para febrero o marzo del año siguiente.
        </p>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono">
        Fuente: COMPRANET 2014 · 7,215 contratos · Ley Federal de Presupuesto y Responsabilidad Hacendaria
      </p>
    </motion.div>
  )
}
