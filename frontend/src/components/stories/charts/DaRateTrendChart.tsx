/**
 * DaRateTrendChart — Pure SVG dot-strip chart.
 *
 * Each year is a dot at its DA% value, connected by a thin line.
 * Presidential terms are colored band backgrounds (Calderón=blue,
 * Peña=red, AMLO=amber). OECD 25% ceiling shown as a dashed cyan line.
 * No Recharts — tailored editorial visualization.
 */

import { motion } from 'framer-motion'

const DATA = [
  { year: 2010, rate: 62.7, era: 'calderon' },
  { year: 2011, rate: 65.3, era: 'calderon' },
  { year: 2012, rate: 67.1, era: 'calderon' },
  { year: 2013, rate: 68.4, era: 'pena' },
  { year: 2014, rate: 69.2, era: 'pena' },
  { year: 2015, rate: 70.8, era: 'pena' },
  { year: 2016, rate: 72.1, era: 'pena' },
  { year: 2017, rate: 74.3, era: 'pena' },
  { year: 2018, rate: 76.2, era: 'pena' },
  { year: 2019, rate: 77.8, era: 'amlo' },
  { year: 2020, rate: 78.1, era: 'amlo' },
  { year: 2021, rate: 80.0, era: 'amlo' },
  { year: 2022, rate: 79.1, era: 'amlo' },
  { year: 2023, rate: 81.9, era: 'amlo' },
  { year: 2024, rate: 79.3, era: 'amlo' },
]

const ERA_FILL: Record<string, string> = {
  calderon: '#1e3a8a', // navy blue
  pena:     '#7f1d1d', // dark red
  amlo:     '#78350f', // dark amber
}

const ERA_DOT: Record<string, string> = {
  calderon: '#3b82f6',
  pena:     '#ef4444',
  amlo:     '#f59e0b',
}

const ERA_LABEL: Record<string, string> = {
  calderon: 'Calderón',
  pena:     'Peña Nieto',
  amlo:     'AMLO',
}

// Chart dimensions
const W = 720
const H = 320
const PAD = { top: 30, right: 32, bottom: 40, left: 48 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom
const Y_MIN = 20
const Y_MAX = 90

function xFor(i: number) {
  return PAD.left + (i / (DATA.length - 1)) * PLOT_W
}
function yFor(v: number) {
  return PAD.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H
}

// Era bands: group contiguous same-era years
function eraBands() {
  const bands: Array<{ era: string; from: number; to: number }> = []
  let current = { era: DATA[0].era, from: 0, to: 0 }
  for (let i = 1; i < DATA.length; i++) {
    if (DATA[i].era === current.era) {
      current.to = i
    } else {
      bands.push({ ...current, to: i - 1 })
      current = { era: DATA[i].era, from: i, to: i }
    }
  }
  bands.push(current)
  return bands
}

export function DaRateTrendChart() {
  const bands = eraBands()
  const linePath = DATA.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.rate)}`).join(' ')
  const oecdY = yFor(25)
  const peakYear = DATA.reduce((acc, d) => (d.rate > acc.rate ? d : acc))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-background border border-border p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
        RUBLI · Tendencia historica
      </p>
      <h3 className="text-lg font-bold text-text-primary leading-tight mb-0.5">
        La adjudicación directa subió de 63% a 82% en tres sexenios
      </h3>
      <p className="text-xs text-text-muted mb-4">
        3.3x el límite OCDE del 25% — cada administración peor que la anterior
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Direct award rate by year 2010 to 2024, colored by presidential term"
      >
        {/* Presidential era bands */}
        {bands.map((b) => {
          const x0 = b.from === 0 ? PAD.left : (xFor(b.from) + xFor(b.from - 1)) / 2
          const x1 = b.to === DATA.length - 1 ? W - PAD.right : (xFor(b.to) + xFor(b.to + 1)) / 2
          const midX = (x0 + x1) / 2
          return (
            <g key={`band-${b.era}-${b.from}`}>
              <rect
                x={x0}
                y={PAD.top}
                width={x1 - x0}
                height={PLOT_H}
                fill={ERA_FILL[b.era]}
                fillOpacity={0.18}
              />
              <text
                x={midX}
                y={PAD.top - 10}
                textAnchor="middle"
                fill={ERA_DOT[b.era]}
                fontSize={10}
                fontFamily="var(--font-family-mono)"
                fontWeight={700}
                letterSpacing="0.08em"
              >
                {ERA_LABEL[b.era].toUpperCase()}
              </text>
            </g>
          )
        })}

        {/* Y-axis grid + labels */}
        {[25, 40, 60, 80].map((v) => (
          <g key={`grid-${v}`}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="var(--color-border-hover)"
              strokeDasharray="2 4"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={yFor(v) + 3}
              textAnchor="end"
              fill="#52525b"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
            >
              {v}%
            </text>
          </g>
        ))}

        {/* OECD ceiling */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={oecdY}
          y2={oecdY}
          stroke="#22d3ee"
          strokeWidth={1.5}
          strokeDasharray="6 3"
        />
        <text
          x={W - PAD.right}
          y={oecdY - 4}
          textAnchor="end"
          fill="#22d3ee"
          fontSize={9}
          fontFamily="var(--font-family-mono)"
        >
          OCDE máx. 25%
        </text>

        {/* Connecting line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#52525b"
          strokeWidth={1.2}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />

        {/* Year dots */}
        {DATA.map((d, i) => {
          const isPeak = d.year === peakYear.year
          return (
            <motion.g
              key={d.year}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
            >
              <circle
                cx={xFor(i)}
                cy={yFor(d.rate)}
                r={isPeak ? 6 : 4}
                fill={ERA_DOT[d.era]}
                stroke={isPeak ? '#fef3c7' : '#09090b'}
                strokeWidth={isPeak ? 2 : 1}
              />
              {isPeak && (
                <text
                  x={xFor(i)}
                  y={yFor(d.rate) - 12}
                  textAnchor="middle"
                  fill="#fbbf24"
                  fontSize={11}
                  fontWeight={700}
                  fontFamily="var(--font-family-mono)"
                >
                  {d.rate}%
                </text>
              )}
            </motion.g>
          )
        })}

        {/* X-axis year labels */}
        {DATA.filter((_, i) => i % 2 === 0).map((d) => {
          const i = DATA.findIndex((x) => x.year === d.year)
          return (
            <text
              key={`x-${d.year}`}
              x={xFor(i)}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fill="#71717a"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
            >
              {d.year}
            </text>
          )
        })}
      </svg>

      {/* Era legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-mono text-text-muted">
        {['calderon', 'pena', 'amlo'].map((era) => {
          const yearsInEra = DATA.filter((d) => d.era === era)
          const avg = yearsInEra.reduce((s, d) => s + d.rate, 0) / yearsInEra.length
          return (
            <span key={era} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: ERA_DOT[era] }} />
              <span className="text-text-secondary font-semibold">{ERA_LABEL[era]}</span>
              <span className="text-text-muted">promedio {avg.toFixed(1)}%</span>
            </span>
          )
        })}
      </div>

      <p className="mt-3 text-[10px] text-text-muted font-mono">
        Fuente: COMPRANET 2010-2024 · RUBLI v0.6.5
      </p>
    </motion.div>
  )
}
