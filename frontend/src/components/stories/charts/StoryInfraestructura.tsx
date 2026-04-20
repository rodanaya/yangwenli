/**
 * StoryInfraestructura — Pure SVG competition-vs-non-competition timeline.
 *
 * Horizontal stacked bars by year, 2010-2024.
 * Red bar = direct award %, orange = single bidder %, green = open tender %.
 * Annotated events (Grupo Higa 2014, Tren Maya 2020) mark flashpoints.
 * Reader sees infrastructure sector losing competitive slivers over time.
 */

import { motion } from 'framer-motion'

interface YearRow {
  year: number
  direct: number
  single: number
  open: number
  total: number // MXN billions
}

// Infrastructure-sector breakdown by year (COMPRANET)
const YEARS: YearRow[] = [
  { year: 2010, direct: 22, single: 12, open: 66, total: 95 },
  { year: 2011, direct: 24, single: 13, open: 63, total: 108 },
  { year: 2012, direct: 26, single: 14, open: 60, total: 142 },
  { year: 2013, direct: 28, single: 15, open: 57, total: 135 },
  { year: 2014, direct: 34, single: 17, open: 49, total: 168 }, // Grupo Higa
  { year: 2015, direct: 30, single: 16, open: 54, total: 122 },
  { year: 2016, direct: 29, single: 15, open: 56, total: 118 },
  { year: 2017, direct: 31, single: 16, open: 53, total: 126 },
  { year: 2018, direct: 30, single: 15, open: 55, total: 114 },
  { year: 2019, direct: 35, single: 18, open: 47, total: 148 },
  { year: 2020, direct: 42, single: 21, open: 37, total: 195 }, // Tren Maya begins
  { year: 2021, direct: 45, single: 22, open: 33, total: 218 },
  { year: 2022, direct: 47, single: 23, open: 30, total: 245 },
  { year: 2023, direct: 46, single: 22, open: 32, total: 232 },
  { year: 2024, direct: 44, single: 20, open: 36, total: 178 },
]

const ANNOTATIONS = [
  { year: 2014, label: 'Grupo Higa / Casa Blanca', x: 2014 },
  { year: 2020, label: 'Tren Maya · Dos Bocas · AIFA', x: 2020 },
]

const W = 700
const H = 460
const PADDING_L = 60
const PADDING_R = 180
const PADDING_T = 50
const PADDING_B = 40
const ROW_H = (H - PADDING_T - PADDING_B) / YEARS.length
const BAR_H = ROW_H - 3
const BAR_W = W - PADDING_L - PADDING_R

const COLORS = {
  direct: '#dc2626',
  single: '#ea580c',
  open: '#16a34a',
}

export function StoryInfraestructura() {
  const avgBidders = 1.3
  const oecdBidders = 5.2

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-zinc-950 border border-zinc-800/60 p-5 space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        RUBLI · Infraestructura sin competencia
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        La obra pública perdió competencia real durante 14 años
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        Cada barra muestra cómo se adjudicaron los contratos de infraestructura
        ese año: rojo = adjudicación directa, naranja = licitación con un solo
        oferente, verde = licitación abierta competida. Los bloques verdes se
        redujeron del 66% al 32% entre 2010 y 2024.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-orange-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-orange-400">$2.1T</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            con un solo oferente · 196,540 contratos
          </div>
        </div>
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-red-500">{avgBidders}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            oferentes promedio / licitación
          </div>
        </div>
        <div className="border-l-2 border-cyan-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-cyan-400">{oecdBidders}+</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            oferentes OCDE (Corea, Chile, UE)
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Infrastructure contracting by year 2010-2024: direct award, single bidder, open tender percentages"
      >
        {/* Column headers */}
        <g transform={`translate(${PADDING_L}, ${PADDING_T - 20})`}>
          <circle cx={3} cy={2} r={3} fill={COLORS.direct} />
          <text x={12} y={6} fill="#ef4444" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
            DIRECTA
          </text>
          <circle cx={90} cy={2} r={3} fill={COLORS.single} />
          <text x={99} y={6} fill="#fb923c" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
            UN OFERENTE
          </text>
          <circle cx={200} cy={2} r={3} fill={COLORS.open} />
          <text x={209} y={6} fill="#4ade80" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
            LICITACIÓN ABIERTA
          </text>
        </g>

        {YEARS.map((row, idx) => {
          const y0 = PADDING_T + idx * ROW_H
          const directW = (row.direct / 100) * BAR_W
          const singleW = (row.single / 100) * BAR_W
          const openW = (row.open / 100) * BAR_W
          const annotation = ANNOTATIONS.find((a) => a.year === row.year)

          return (
            <g key={row.year}>
              {/* Year label */}
              <text
                x={PADDING_L - 10}
                y={y0 + BAR_H / 2 + 3}
                textAnchor="end"
                fill={annotation ? '#fbbf24' : '#71717a'}
                fontSize={10}
                fontFamily="var(--font-family-mono)"
                fontWeight={annotation ? 700 : 500}
              >
                {row.year}
              </text>

              {/* Direct award segment */}
              <motion.rect
                x={PADDING_L}
                y={y0}
                width={directW}
                height={BAR_H}
                fill={COLORS.direct}
                initial={{ width: 0 }}
                animate={{ width: directW }}
                transition={{ duration: 0.6, delay: idx * 0.04 }}
              />
              {/* Single bidder segment */}
              <motion.rect
                x={PADDING_L + directW}
                y={y0}
                width={singleW}
                height={BAR_H}
                fill={COLORS.single}
                initial={{ width: 0 }}
                animate={{ width: singleW }}
                transition={{ duration: 0.6, delay: idx * 0.04 + 0.1 }}
              />
              {/* Open tender segment */}
              <motion.rect
                x={PADDING_L + directW + singleW}
                y={y0}
                width={openW}
                height={BAR_H}
                fill={COLORS.open}
                initial={{ width: 0 }}
                animate={{ width: openW }}
                transition={{ duration: 0.6, delay: idx * 0.04 + 0.2 }}
              />

              {/* Value label */}
              <text
                x={PADDING_L + BAR_W + 8}
                y={y0 + BAR_H / 2 + 3}
                fill="#d4d4d8"
                fontSize={10}
                fontFamily="var(--font-family-mono)"
              >
                ${row.total}B
              </text>

              {/* Percentages (only if wide enough) */}
              {directW > 30 && (
                <text
                  x={PADDING_L + directW / 2}
                  y={y0 + BAR_H / 2 + 3}
                  textAnchor="middle"
                  fill="#fef2f2"
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.direct}%
                </text>
              )}
              {openW > 30 && (
                <text
                  x={PADDING_L + directW + singleW + openW / 2}
                  y={y0 + BAR_H / 2 + 3}
                  textAnchor="middle"
                  fill="#052e16"
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                >
                  {row.open}%
                </text>
              )}

              {/* Annotation */}
              {annotation && (
                <motion.g
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + idx * 0.04 }}
                >
                  <circle
                    cx={PADDING_L + BAR_W + 50}
                    cy={y0 + BAR_H / 2}
                    r={3}
                    fill="#fbbf24"
                  />
                  <text
                    x={PADDING_L + BAR_W + 60}
                    y={y0 + BAR_H / 2 + 3}
                    fill="#fbbf24"
                    fontSize={9}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={600}
                  >
                    {annotation.label}
                  </text>
                </motion.g>
              )}
            </g>
          )
        })}

        {/* 50% reference line */}
        <line
          x1={PADDING_L + BAR_W * 0.5}
          y1={PADDING_T - 4}
          x2={PADDING_L + BAR_W * 0.5}
          y2={PADDING_T + YEARS.length * ROW_H}
          stroke="#22d3ee"
          strokeOpacity={0.4}
          strokeWidth={0.8}
          strokeDasharray="3 3"
        />
        <text
          x={PADDING_L + BAR_W * 0.5}
          y={PADDING_T - 26}
          textAnchor="middle"
          fill="#22d3ee"
          fontSize={9}
          fontFamily="var(--font-family-mono)"
          fontWeight={600}
        >
          50% · linea de referencia
        </text>
      </svg>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          En 14 años la licitación abierta en obra pública cayó del 66% al 32%.
          Tren Maya, Dos Bocas y AIFA se ejecutaron a través de entidades militares
          exentas de las reglas normales de contratación — moviendo cientos de miles
          de millones de pesos fuera del marco competitivo.
        </p>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono">
        Fuente: COMPRANET 2010-2024 · sector infraestructura · 196,540 contratos con oferente único
      </p>
    </motion.div>
  )
}
