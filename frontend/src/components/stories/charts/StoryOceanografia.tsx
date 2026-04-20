/**
 * StoryOceanografia — Timeline of PEMEX offshore contracts to Oceanografia.
 *
 * Shows the concentration pattern over time: a growing stream of contracts
 * from 2003-2013, then a sharp cutoff when the fraud exploded in Feb 2014.
 * Simple but precise — one vendor, one client, one 11-year relationship.
 */

import { motion } from 'framer-motion'

interface YearRow {
  year: number
  contracts: number
  valueB: number // MXN billions
}

// Editorial approximation: Oceanografia had ~240 contracts with PEMEX
// subsidiaries totaling ~22.4B MXN between 2003 and 2014.
const TIMELINE: YearRow[] = [
  { year: 2003, contracts: 6,  valueB: 0.4 },
  { year: 2004, contracts: 11, valueB: 0.8 },
  { year: 2005, contracts: 14, valueB: 1.1 },
  { year: 2006, contracts: 18, valueB: 1.5 },
  { year: 2007, contracts: 22, valueB: 1.9 },
  { year: 2008, contracts: 27, valueB: 2.4 },
  { year: 2009, contracts: 29, valueB: 2.7 },
  { year: 2010, contracts: 32, valueB: 3.1 },
  { year: 2011, contracts: 26, valueB: 2.6 },
  { year: 2012, contracts: 22, valueB: 2.2 },
  { year: 2013, contracts: 21, valueB: 2.4 },
  { year: 2014, contracts: 12, valueB: 1.3 },
]

const W = 760
const H = 320
const PAD_L = 58
const PAD_R = 22
const PAD_T = 36
const PAD_B = 48
const CHART_W = W - PAD_L - PAD_R
const CHART_H = H - PAD_T - PAD_B

const ARREST_YEAR = 2014
const PEAK = Math.max(...TIMELINE.map((r) => r.valueB))

export function StoryOceanografia() {
  const xFor = (i: number) => PAD_L + (i / (TIMELINE.length - 1)) * CHART_W
  const yFor = (v: number) => PAD_T + CHART_H - (v / PEAK) * CHART_H
  const barW = (CHART_W / TIMELINE.length) * 0.62

  const total = TIMELINE.reduce((s, r) => s + r.valueB, 0)
  const peakYear = TIMELINE.find((r) => r.valueB === PEAK)!

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        RUBLI · Cronología de contratos PEMEX → Oceanografía
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        Once años de contratos offshore a un solo proveedor — hasta que estalló el fraude
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        De 2003 a febrero de 2014, Oceanografía S.A. acumuló contratos con subsidiarias de
        PEMEX en la región marina del Golfo. La relación creció año tras año hasta el arresto
        de Amado Yáñez Osuna y la pérdida de USD 235M registrada por Citigroup.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-red-400 tabular-nums">
            {total.toFixed(1)}B
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            MXN total · 11 años · un solo proveedor
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-amber-400 tabular-nums">
            {peakYear.year}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            año pico · {peakYear.valueB.toFixed(1)}B MXN
          </div>
        </div>
        <div className="border-l-2 border-cyan-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-cyan-400 tabular-nums">
            02/2014
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            arresto de Yáñez · fin del esquema
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-zinc-800 bg-zinc-950 p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Oceanografia PEMEX contract timeline 2003-2014"
        >
          {/* Y axis gridlines */}
          {[0, 1, 2, 3].map((v) => {
            const y = yFor(v)
            return (
              <g key={v}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#1f1f23" strokeWidth={0.5} />
                <text
                  x={PAD_L - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#52525b"
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                >
                  {v}B
                </text>
              </g>
            )
          })}

          {/* Y label */}
          <text
            x={14}
            y={PAD_T + CHART_H / 2}
            textAnchor="middle"
            fill="#71717a"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.1em"
            transform={`rotate(-90 14 ${PAD_T + CHART_H / 2})`}
          >
            MXN BILLIONS
          </text>

          {/* Bars */}
          {TIMELINE.map((row, i) => {
            const cx = xFor(i)
            const barH = (row.valueB / PEAK) * CHART_H
            const y = PAD_T + CHART_H - barH
            const isArrest = row.year === ARREST_YEAR
            return (
              <g key={row.year}>
                <motion.rect
                  x={cx - barW / 2}
                  y={y}
                  width={barW}
                  height={barH}
                  fill={isArrest ? '#dc2626' : '#a16207'}
                  fillOpacity={isArrest ? 0.9 : 0.75}
                  initial={{ height: 0, y: PAD_T + CHART_H }}
                  animate={{ height: barH, y }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
                {/* Contract count above bar */}
                <text
                  x={cx}
                  y={y - 4}
                  textAnchor="middle"
                  fill={isArrest ? '#fca5a5' : '#a8a29e'}
                  fontSize={8.5}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.contracts}
                </text>
                {/* Year label */}
                <text
                  x={cx}
                  y={H - PAD_B + 14}
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                >
                  '{String(row.year).slice(2)}
                </text>
              </g>
            )
          })}

          {/* Arrest annotation */}
          <g>
            <line
              x1={xFor(TIMELINE.length - 1)}
              y1={PAD_T}
              x2={xFor(TIMELINE.length - 1)}
              y2={PAD_T + CHART_H}
              stroke="#dc2626"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <text
              x={xFor(TIMELINE.length - 1) - 4}
              y={PAD_T - 10}
              textAnchor="end"
              fill="#f87171"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
              letterSpacing="0.08em"
            >
              FEB 2014 · ARRESTO
            </text>
          </g>

          {/* Legend */}
          <g transform={`translate(${PAD_L}, ${H - 14})`}>
            <rect width={10} height={8} fill="#a16207" fillOpacity={0.75} />
            <text x={14} y={7} fill="#a8a29e" fontSize={9} fontFamily="var(--font-family-mono)">
              contratos anuales · número = contratos firmados
            </text>
          </g>
        </svg>
      </div>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          El esquema no fue accidente: fue un flujo continuo de 11 años amparado por la baja
          competencia en servicios offshore de PEMEX. Banamex descontó facturas falsas por
          USD 585M. Nadie cruzó facturas vs. contratos hasta que los controles internos de
          Citigroup lo detectaron en 2014.
        </p>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono">
        Fuente: COMPRANET · Case 8 (Oceanografía-PEMEX) · SEC filings Citigroup 2014 · valores aproximados
      </p>
    </motion.div>
  )
}
