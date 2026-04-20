import { motion } from 'framer-motion'

const data = [
  { year: '2019', contracts: 18025 },
  { year: '2020', contracts: 17413 },
  { year: '2021', contracts: 17352 },
  { year: '2022', contracts: 12013 },
  { year: '2023', contracts: 20512 },
  { year: '2024', contracts: 7914 },
]

const PEAK_YEAR = '2023'
const TOTAL = data.reduce((sum, d) => sum + d.contracts, 0)

// ─── Dot-matrix geometry ──────────────────────────────────────────────────────
const ROWS = 40              // vertical dots per column
const DOT_R = 3
const DOT_GAP = 6
const COL_W = 52
const TOP_PAD = 18
const LABEL_W = 36           // left pad for y-axis labels
const BOTTOM_PAD = 24
const CHART_H = TOP_PAD + ROWS * DOT_GAP + BOTTOM_PAD
const CHART_W = LABEL_W + data.length * COL_W + 20
const MAX_VALUE = 25000      // matches previous YAxis domain

function formatK(v: number): string {
  return `${(v / 1000).toFixed(1)}K`
}

export function StoryHemoserSplitting() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-zinc-900 border border-zinc-800 p-5"
    >
      {/* Overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        RUBLI · Fraccionamiento
      </p>

      {/* Editorial headline */}
      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        El fraccionamiento no es un accidente: 93K contratos sospechosos bajo AMLO
      </p>
      <p className="text-xs text-zinc-500 mb-4">
        Contratos con patrón de fraccionamiento en el mismo día · 2019-2024
      </p>

      {/* Hero stats row */}
      <div className="flex gap-6 mb-5">
        <div className="border-l-2 border-red-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-red-500">93K</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">contratos fraccionados</div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-amber-400">20.5K</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">pico en 2023</div>
        </div>
      </div>

      {/* Dot-matrix vertical columns */}
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Contratos fraccionados por año, 2019-2024"
      >
        {/* Y-axis guide labels (25K / 12.5K / 0) */}
        {[0, 0.5, 1].map((frac) => {
          const value = MAX_VALUE * (1 - frac)
          const y = TOP_PAD + frac * ROWS * DOT_GAP
          return (
            <g key={frac}>
              <line
                x1={LABEL_W - 2}
                x2={CHART_W - 8}
                y1={y}
                y2={y}
                stroke="#27272a"
                strokeDasharray="3 3"
                strokeWidth={0.5}
              />
              <text
                x={LABEL_W - 6}
                y={y + 3}
                textAnchor="end"
                fill="#52525b"
                fontSize={8}
                fontFamily="var(--font-family-mono)"
              >
                {formatK(value)}
              </text>
            </g>
          )
        })}

        {/* Columns of dots */}
        {data.map((item, colIdx) => {
          const filled = Math.round((item.contracts / MAX_VALUE) * ROWS)
          const xCenter = LABEL_W + colIdx * COL_W + COL_W / 2
          const isPeak = item.year === PEAK_YEAR
          const color = isPeak ? '#dc2626' : '#52525b'
          const pctOfTotal = ((item.contracts / TOTAL) * 100).toFixed(1)

          return (
            <g key={item.year}>
              {Array.from({ length: ROWS }).map((_, i) => {
                const dotY = TOP_PAD + (ROWS - 1 - i) * DOT_GAP
                const isFilled = i < filled
                return (
                  <motion.circle
                    key={i}
                    cx={xCenter}
                    cy={dotY}
                    r={DOT_R}
                    fill={isFilled ? color : '#f3f1ec'}
                    stroke={isFilled ? 'none' : '#e2ddd6'}
                    strokeWidth={0.5}
                    fillOpacity={isPeak && isFilled ? 1 : 0.85}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: colIdx * 0.04 + (filled - i) * 0.005 }}
                  />
                )
              })}

              {/* Value label above column */}
              <text
                x={xCenter}
                y={TOP_PAD + (ROWS - filled) * DOT_GAP - 5}
                textAnchor="middle"
                fill={isPeak ? '#fca5a5' : '#a1a1aa'}
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fontWeight={isPeak ? 700 : 500}
              >
                {formatK(item.contracts)}
              </text>

              {/* X-axis year label */}
              <text
                x={xCenter}
                y={TOP_PAD + ROWS * DOT_GAP + 14}
                textAnchor="middle"
                fill={isPeak ? '#dc2626' : '#71717a'}
                fontSize={10}
                fontFamily="var(--font-family-mono)"
                fontWeight={isPeak ? 700 : 400}
              >
                {item.year}
                {item.year === '2024' ? '*' : ''}
              </text>

              {/* Hidden title for hover on the whole column */}
              <title>
                {item.year}: {item.contracts.toLocaleString('es-MX')} contratos fraccionados ({pctOfTotal}% del total AMLO)
              </title>
            </g>
          )
        })}
      </svg>

      {/* Annotation pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          2023: 20,512 contratos — máximo del sexenio
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400">
          MOLINOS AZTECA 2021: 1,340 contratos, MXN 945M
        </span>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-3">
        * 2024 año parcial · Fraccionamiento = múltiples contratos al mismo proveedor el mismo día · Fuente: RUBLI v0.6.5
      </p>
    </motion.div>
  )
}
