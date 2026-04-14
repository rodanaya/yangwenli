import { motion } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

const OECD_COLOR = '#22d3ee'
const GRID_COLOR = '#3f3f46'
const AXIS_COLOR = '#71717a'
const AMLO_COLOR = '#dc2626'

const data = [
  { year: '2002', rate: 65.1, era: 'fox' },
  { year: '2003', rate: 64.8, era: 'fox' },
  { year: '2004', rate: 63.2, era: 'fox' },
  { year: '2005', rate: 62.5, era: 'fox' },
  { year: '2006', rate: 61.8, era: 'fox' },
  { year: '2007', rate: 62.3, era: 'calderon' },
  { year: '2008', rate: 63.1, era: 'calderon' },
  { year: '2009', rate: 64.7, era: 'calderon' },
  { year: '2010', rate: 62.7, era: 'calderon' },
  { year: '2011', rate: 65.3, era: 'calderon' },
  { year: '2012', rate: 67.1, era: 'calderon' },
  { year: '2013', rate: 68.4, era: 'pena' },
  { year: '2014', rate: 69.2, era: 'pena' },
  { year: '2015', rate: 70.8, era: 'pena' },
  { year: '2016', rate: 72.1, era: 'pena' },
  { year: '2017', rate: 74.3, era: 'pena' },
  { year: '2018', rate: 76.2, era: 'pena' },
  { year: '2019', rate: 77.8, era: 'amlo' },
  { year: '2020', rate: 78.1, era: 'amlo' },
  { year: '2021', rate: 80.0, era: 'amlo' },
  { year: '2022', rate: 79.1, era: 'amlo' },
  { year: '2023', rate: 81.9, era: 'amlo' },
]

const ERA_COLORS: Record<string, string> = {
  fox: '#a1a1aa',
  calderon: '#a1a1aa',
  pena: '#a1a1aa',
  amlo: AMLO_COLOR,
}

interface PayloadEntry {
  payload: { year: string; rate: number; era: string }
}

const ERA_LABELS: Record<string, string> = {
  fox: 'Fox',
  calderon: 'Calderon',
  pena: 'Pena Nieto',
  amlo: 'AMLO',
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const overOecd = (d.rate - 25).toFixed(0)
  return (
    <div className="rounded-lg border px-3 py-2 text-sm shadow-xl" style={{ background: '#18181b', borderColor: GRID_COLOR }}>
      <p className="font-mono font-semibold text-zinc-100">{d.year} <span className="font-normal text-zinc-500">{ERA_LABELS[d.era]}</span></p>
      <p className="mt-1 text-lg font-mono font-bold" style={{ color: ERA_COLORS[d.era] }}>{d.rate}%</p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">+{overOecd} pts sobre OCDE</p>
    </div>
  )
}

interface DotProps {
  cx?: number
  cy?: number
  payload?: { era: string; rate: number }
}

function CustomDot({ cx, cy, payload }: DotProps) {
  if (cx == null || cy == null || !payload) return null
  const isAmlo = payload.era === 'amlo'
  const isLast = payload.rate === 81.9
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isLast ? 5 : isAmlo ? 3.5 : 2}
      fill={isAmlo ? AMLO_COLOR : '#52525b'}
      stroke={isLast ? '#18181b' : 'none'}
      strokeWidth={isLast ? 2 : 0}
    />
  )
}

export function DaRateTrendChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-900 p-5"
    >
      {/* Editorial headline: the finding, not the topic */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        RUBLI · Tendencia historica
      </p>
      <h3 className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        La adjudicacion directa subio de 62% a 82% en dos decadas
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        3.3x el limite OCDE del 25% — cada sexenio peor que el anterior
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 5 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={GRID_COLOR} />
          <ReferenceArea x1="2002" x2="2006" fill="#52525b" fillOpacity={0.04} />
          <ReferenceArea x1="2007" x2="2012" fill="#52525b" fillOpacity={0.06} />
          <ReferenceArea x1="2013" x2="2018" fill="#52525b" fillOpacity={0.08} />
          <ReferenceArea x1="2019" x2="2023" fill={AMLO_COLOR} fillOpacity={0.06} />
          <XAxis
            dataKey="year"
            tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            interval={2}
          />
          <YAxis
            domain={[20, 90]}
            ticks={[25, 40, 60, 80]}
            tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            width={32}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={25}
            stroke={OECD_COLOR}
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: 'OCDE max 25%',
              fill: OECD_COLOR,
              fontSize: 10,
              fontFamily: 'var(--font-family-mono)',
              position: 'insideBottomRight',
            }}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#a1a1aa"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 5, fill: '#f4f4f5', stroke: AMLO_COLOR, strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[10px] text-zinc-600 text-right font-mono">
        Fuente: COMPRANET 2002-2025 · RUBLI v6.5
      </p>
    </motion.div>
  )
}
