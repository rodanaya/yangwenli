/**
 * StoryGraneroVacio — Pure SVG dot-matrix of SEGALMEX top vendors.
 *
 * 6 agriculture vendors under AMLO, sorted by contract value (0-7B MXN).
 * Each dot = $100M MXN. Value label at strip end; DA% badge at far right.
 * Color per vendor keyed off DA rate (red 99+, orange 60-98, green <60).
 */

import { motion } from 'framer-motion'
import { SECTOR_COLORS } from '@/lib/constants'

interface VendorRow {
  name: string
  shortName: string
  value: number   // in B MXN
  daPct: number
}

const DATA: VendorRow[] = [
  { name: 'SEGALMEX',           shortName: 'SEGALMEX',        value: 6.43, daPct: 41.2  },
  { name: 'MOLINOS AZTECA',     shortName: 'Molinos Azteca',  value: 6.25, daPct: 99.9  },
  { name: 'ILAS MEXICO',        shortName: 'ILAS Mexico',     value: 3.30, daPct: 100.0 },
  { name: 'PRODUCTOS LONEG',    shortName: 'Productos Loneg', value: 2.72, daPct: 100.0 },
  { name: 'INDUSTRIAL PATRONA', shortName: 'Ind. Patrona',    value: 2.12, daPct: 99.4  },
  { name: 'LICONSA',            shortName: 'LICONSA',         value: 1.91, daPct: 63.0  },
].sort((a, b) => b.value - a.value)

const DOTS = 70                 // each dot = $100M (0-7B domain)
const DOT_PER_B = DOTS / 7
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 130
const COL_W = DOTS * DOT_GAP
const VALUE_W = 84
const ROW_H = STRIP_H + 6

const W = LABEL_W + COL_W + VALUE_W
const H = 40 + DATA.length * ROW_H + 16

function getVendorColor(daPct: number): string {
  if (daPct >= 99) return '#dc2626'
  if (daPct >= 60) return '#ea580c'
  return SECTOR_COLORS.agricultura
}

export function StoryGraneroVacio() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-900 border border-zinc-800 p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        RUBLI · Sector Agricultura
      </p>

      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Cuatro empresas, MXN $14.8B, cero competencia
      </p>
      <p className="text-xs text-zinc-500 mb-4">
        Principales proveedores por valor total · AMLO 2019-24
      </p>

      <div className="flex gap-6 mb-5">
        <div className="border-l-2 border-red-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-red-500">93.5%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">adj. directa en el sector</div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-amber-400">6</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">proveedores dominan</div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Top agriculture vendors dot matrix, each dot 100M MXN"
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
            PROVEEDOR
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
            VALOR / DA
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 38 + rowIdx * ROW_H
            const color = getVendorColor(row.daPct)
            const filled = Math.round(row.value * DOT_PER_B)

            return (
              <g key={row.name}>
                {/* Label */}
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2 + 3}
                  textAnchor="end"
                  fill="#d4d4d8"
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.shortName}
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
                      fill={isFilled ? color : '#18181b'}
                      fillOpacity={isFilled ? 0.9 : 1}
                      stroke={isFilled ? 'none' : '#27272a'}
                      strokeWidth={isFilled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.05 + i * 0.002 }}
                    />
                  )
                })}

                {/* Value + DA% */}
                <text
                  x={LABEL_W + COL_W + 8}
                  y={y0 + STRIP_H / 2 + 3}
                  fill={color}
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  ${row.value.toFixed(2)}B
                  <tspan fill="#71717a" fontWeight={400}>  {row.daPct}% DA</tspan>
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-4">
        <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          ILAS Mexico y Productos Loneg recibieron 100% de sus contratos sin licitación.
          Promedio por contrato: MXN 275M y MXN 302M respectivamente.
        </p>
      </div>

      <div className="mt-3 flex gap-4 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#dc2626' }} />
          100% DA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#ea580c' }} />
          60-99% DA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: SECTOR_COLORS.agricultura }} />
          {'< 60% DA'}
        </span>
      </div>

      <p className="text-[10px] text-zinc-600 mt-3">
        Fuente: COMPRANET · Cada punto = $100M MXN · Análisis RUBLI v0.6.5
      </p>
    </motion.div>
  )
}

// ✓ dot-matrix rewrite
