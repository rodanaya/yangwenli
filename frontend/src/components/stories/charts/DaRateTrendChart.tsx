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

const ERA_LABELS: Record<string, string> = {
  fox: 'Fox',
  calderon: 'Calderon',
  pena: 'Pena Nieto',
  amlo: 'AMLO',
}

interface PayloadEntry {
  payload: { year: string; rate: number; era: string }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white shadow-lg">
      <p className="font-semibold">{d.year}</p>
      <p className="text-zinc-300">{d.rate}% Adj. Directa</p>
      <p className="text-zinc-500">{ERA_LABELS[d.era]}</p>
    </div>
  )
}

interface DotProps {
  cx?: number
  cy?: number
  payload?: { era: string }
}

function CustomDot({ cx, cy, payload }: DotProps) {
  if (cx == null || cy == null || !payload) return null
  const isAmlo = payload.era === 'amlo'
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isAmlo ? 4 : 2.5}
      fill={isAmlo ? '#dc2626' : '#52525b'}
      stroke={isAmlo ? '#dc2626' : '#52525b'}
      strokeWidth={1}
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
    >
      <p className="mb-2 text-center text-xs text-zinc-500">
        Adjudicacion Directa como % del total de contratos (2002-2023)
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <ReferenceArea x1="2002" x2="2006" fill="#18181b" fillOpacity={0.5} />
          <ReferenceArea x1="2007" x2="2012" fill="#172554" fillOpacity={0.15} />
          <ReferenceArea x1="2013" x2="2018" fill="#431407" fillOpacity={0.15} />
          <ReferenceArea x1="2019" x2="2023" fill="#450a0a" fillOpacity={0.3} />
          <XAxis
            dataKey="year"
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            domain={[20, 90]}
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
            label={{
              value: '% Adj. Directa',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#a1a1aa', fontSize: 11 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={25}
            stroke={OECD_COLOR}
            strokeDasharray="4 2"
            label={{ value: 'OCDE 25%', fill: OECD_COLOR, fontSize: 10, position: 'right' }}
          />
          <ReferenceLine
            x="2019"
            stroke="#dc262660"
            label={{ value: '4T \u2192', fill: '#dc2626', fontSize: 11, position: 'top' }}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#52525b"
            strokeWidth={2}
            dot={<CustomDot />}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
