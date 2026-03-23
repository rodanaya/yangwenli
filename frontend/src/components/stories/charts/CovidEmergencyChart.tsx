import { motion } from 'framer-motion'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts'

const data = [
  { year: '2017', da: 74.3, single_bid: 16.8 },
  { year: '2018', da: 76.2, single_bid: 17.2 },
  { year: '2019', da: 77.8, single_bid: 16.5 },
  { year: '2020', da: 78.1, single_bid: 18.3, covid: true },
  { year: '2021', da: 80.0, single_bid: 19.1, covid: true },
  { year: '2022', da: 79.1, single_bid: 17.9 },
  { year: '2023', da: 81.9, single_bid: 18.7 },
]

interface PayloadEntry {
  payload: { year: string; da: number; single_bid: number; covid?: boolean }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">
        {d.year} {d.covid ? '(COVID-19)' : ''}
      </p>
      <p style={{ color: '#dc2626' }}>Adj. Directa: {d.da}%</p>
      <p style={{ color: '#f97316' }}>Licitacion unica: {d.single_bid}%</p>
    </div>
  )
}

export function CovidEmergencyChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Adjudicacion Directa y Licitacion unica durante COVID-19
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <ReferenceArea
            x1="2020"
            x2="2021"
            fill="#dc2626"
            fillOpacity={0.08}
            label={{ value: 'COVID-19', fill: '#dc262680', fontSize: 11, position: 'insideTop' }}
          />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            yAxisId="left"
            domain={[70, 85]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            label={{
              value: 'DA %',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#dc2626', fontSize: 10 },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[14, 22]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            label={{
              value: 'Licitacion unica %',
              angle: 90,
              position: 'insideRight',
              style: { fill: '#f97316', fontSize: 10 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => (
              <span style={{ color: 'var(--color-text-muted)' }}>{value}</span>
            )}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="da"
            name="Adj. Directa %"
            fill="#dc262640"
            stroke="#dc2626"
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="single_bid"
            name="Licitacion unica %"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ fill: '#f97316', r: 3 }}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
