import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Cell,
  LabelList,
} from 'recharts'

const OECD_COLOR = '#22d3ee'

const data = [
  { era: 'Fox (2000-06)', avg: 63.5, peak: 65.1, color: '#64748b' },
  { era: 'Calderon (07-12)', avg: 64.2, peak: 67.1, color: '#3b82f6' },
  { era: 'Pena Nieto (13-18)', avg: 71.8, peak: 76.2, color: '#f97316' },
  { era: 'AMLO (19-23)', avg: 79.4, peak: 81.9, color: '#dc2626' },
]

interface PayloadEntry {
  payload: { era: string; avg: number; peak: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">{d.era}</p>
      <p className="text-text-secondary">Promedio: {d.avg}%</p>
      <p className="text-text-secondary">Maximo: {d.peak}%</p>
    </div>
  )
}

export function AmloEraComparisonChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Adjudicacion Directa promedio y maximo por sexenio
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="era"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            angle={-15}
            textAnchor="end"
            height={50}
          />
          <YAxis
            domain={[0, 90]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.25 }} />
          <Legend
            wrapperStyle={{ color: 'var(--color-text-muted)', fontSize: 11 }}
            formatter={(value: string) => (
              <span style={{ color: 'var(--color-text-muted)' }}>{value}</span>
            )}
          />
          <ReferenceLine
            y={25}
            stroke={OECD_COLOR}
            strokeDasharray="4 2"
            label={{ value: 'OCDE 25%', fill: OECD_COLOR, fontSize: 10, position: 'right' }}
          />
          <Bar
            dataKey="avg"
            name="Promedio"
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.6} />
            ))}
            <LabelList dataKey="avg" position="top" style={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
          </Bar>
          <Bar
            dataKey="peak"
            name="Maximo"
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <LabelList dataKey="peak" position="top" style={{ fill: 'var(--color-text-primary)', fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
