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
  Cell,
} from 'recharts'

const rawData = [
  { sector: 'Agricultura', rate: 93.4, color: '#22c55e' },
  { sector: 'Defensa', rate: 89.2, color: '#1e3a5f' },
  { sector: 'Gobernacion', rate: 85.1, color: '#be123c' },
  { sector: 'Tecnologia', rate: 82.7, color: '#8b5cf6' },
  { sector: 'Salud', rate: 78.9, color: '#dc2626' },
  { sector: 'Trabajo', rate: 78.3, color: '#f97316' },
  { sector: 'Energia', rate: 77.6, color: '#eab308' },
  { sector: 'Hacienda', rate: 76.8, color: '#16a34a' },
  { sector: 'Infraestructura', rate: 74.2, color: '#ea580c' },
  { sector: 'Ambiente', rate: 73.9, color: '#10b981' },
  { sector: 'Educacion', rate: 71.5, color: '#3b82f6' },
  { sector: 'Otros', rate: 68.3, color: '#64748b' },
].reverse()

const OECD_COLOR = '#22d3ee'

interface PayloadEntry {
  payload: { sector: string; rate: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const diff = (d.rate - 25).toFixed(1)
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">{d.sector}</p>
      <p className="text-text-secondary">{d.rate}% Adj. Directa</p>
      <p className="text-text-muted">vs OCDE: +{diff} pts</p>
    </div>
  )
}

export function DaBySectorChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Adjudicacion Directa por sector (%)
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={rawData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            type="category"
            dataKey="sector"
            width={100}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.25 }} />
          <ReferenceLine
            x={25}
            stroke={OECD_COLOR}
            strokeDasharray="4 2"
            label={{ value: 'OCDE 25%', fill: OECD_COLOR, fontSize: 10, position: 'top' }}
          />
          <ReferenceLine
            x={79.1}
            stroke="#dc2626"
            strokeDasharray="3 3"
            label={{ value: 'Promedio 4T', fill: '#dc2626', fontSize: 10, position: 'top' }}
          />
          <Bar
            dataKey="rate"
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {rawData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
