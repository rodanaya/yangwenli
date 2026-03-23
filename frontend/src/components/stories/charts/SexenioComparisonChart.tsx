import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const data = [
  { metric: 'DA %', fox: 63.5, calderon: 64.2, pena: 71.8, amlo: 79.4 },
  { metric: 'Licitacion unica %', fox: 12.1, calderon: 13.4, pena: 15.7, amlo: 18.2 },
  { metric: 'Riesgo alto %', fox: 4.2, calderon: 5.1, pena: 7.3, amlo: 11.8 },
  { metric: 'Concentracion top 10 %', fox: 18.3, calderon: 19.7, pena: 23.4, amlo: 28.9 },
]

const FOX_COLOR = '#64748b'
const CALDERON_COLOR = '#3b82f6'
const PENA_COLOR = '#f97316'
const AMLO_COLOR = '#dc2626'

interface PayloadEntry {
  payload: { metric: string; fox: number; calderon: number; pena: number; amlo: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="mb-1 font-semibold">{d.metric}</p>
      <p style={{ color: FOX_COLOR }}>Fox: {d.fox}%</p>
      <p style={{ color: CALDERON_COLOR }}>Calderon: {d.calderon}%</p>
      <p style={{ color: PENA_COLOR }}>Pena Nieto: {d.pena}%</p>
      <p style={{ color: AMLO_COLOR }}>AMLO: {d.amlo}%</p>
    </div>
  )
}

export function SexenioComparisonChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Indicadores de riesgo por sexenio
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="metric"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            interval={0}
          />
          <YAxis
            domain={[0, 85]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.25 }} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value: string) => (
              <span style={{ color: 'var(--color-text-muted)' }}>{value}</span>
            )}
          />
          <Bar
            dataKey="fox"
            name="Fox"
            fill={FOX_COLOR}
            radius={[2, 2, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="calderon"
            name="Calderon"
            fill={CALDERON_COLOR}
            radius={[2, 2, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="pena"
            name="Pena Nieto"
            fill={PENA_COLOR}
            radius={[2, 2, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="amlo"
            name="AMLO"
            fill={AMLO_COLOR}
            radius={[2, 2, 0, 0]}
            stroke="#dc262680"
            strokeWidth={1}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
