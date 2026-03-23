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
  { sector: 'Agricultura', high_pct: 19.4, color: '#22c55e' },
  { sector: 'Energia', high_pct: 16.8, color: '#eab308' },
  { sector: 'Salud', high_pct: 14.2, color: '#dc2626' },
  { sector: 'Infraestructura', high_pct: 13.7, color: '#ea580c' },
  { sector: 'Gobernacion', high_pct: 12.1, color: '#be123c' },
  { sector: 'Tecnologia', high_pct: 11.3, color: '#8b5cf6' },
  { sector: 'Hacienda', high_pct: 9.8, color: '#16a34a' },
  { sector: 'Educacion', high_pct: 8.4, color: '#3b82f6' },
  { sector: 'Defensa', high_pct: 7.2, color: '#1e3a5f' },
  { sector: 'Ambiente', high_pct: 6.9, color: '#10b981' },
  { sector: 'Trabajo', high_pct: 6.1, color: '#f97316' },
  { sector: 'Otros', high_pct: 5.3, color: '#64748b' },
].reverse()

interface PayloadEntry {
  payload: { sector: string; high_pct: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">{d.sector}</p>
      <p className="text-text-secondary">{d.high_pct}% contratos alto riesgo</p>
    </div>
  )
}

export function RiskBySectorChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Contratos de alto riesgo por sector (% critico + alto)
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
            domain={[0, 25]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            type="category"
            dataKey="sector"
            width={110}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.25 }} />
          <ReferenceLine
            x={9.0}
            stroke="var(--color-text-muted)"
            strokeDasharray="4 2"
            label={{
              value: 'Promedio (9.0%)',
              fill: 'var(--color-text-muted)',
              fontSize: 10,
              position: 'top',
            }}
          />
          <Bar
            dataKey="high_pct"
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
