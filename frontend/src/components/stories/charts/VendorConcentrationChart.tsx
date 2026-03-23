import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'

const RISK_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
}

const data = [
  { vendor: 'Farmaceutica (top 3)', share: 8.4, risk: 'critical' },
  { vendor: 'Energia (CFE/PEMEX red)', share: 6.7, risk: 'high' },
  { vendor: 'Construccion (top 5)', share: 5.9, risk: 'high' },
  { vendor: 'Alimentacion (SEGALMEX red)', share: 4.8, risk: 'critical' },
  { vendor: 'Tecnologia (top 4)', share: 3.9, risk: 'high' },
  { vendor: 'Logistica (top 3)', share: 3.1, risk: 'medium' },
  { vendor: 'Salud (IMSS red)', share: 2.8, risk: 'critical' },
  { vendor: 'Otros top 20', share: 11.2, risk: 'medium' },
]

interface PayloadEntry {
  payload: { vendor: string; share: number; risk: string }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const riskLabel = d.risk === 'critical' ? 'Critico' : d.risk === 'high' ? 'Alto' : 'Medio'
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">{d.vendor}</p>
      <p className="text-text-secondary">{d.share}% del gasto total</p>
      <p style={{ color: RISK_COLORS[d.risk] }}>Riesgo: {riskLabel}</p>
    </div>
  )
}

export function VendorConcentrationChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Concentracion por categoria de proveedor (% del gasto total)
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="vendor"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            angle={-25}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis
            domain={[0, 14]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            label={{
              value: '% gasto total',
              angle: -90,
              position: 'insideLeft',
              style: { fill: 'var(--color-text-muted)', fontSize: 10 },
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.25 }} />
          <Bar
            dataKey="share"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={RISK_COLORS[entry.risk]} />
            ))}
            <LabelList
              dataKey="share"
              position="top"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={((v: number | string) => `${v}%`) as any}
              style={{ fill: 'var(--color-text-primary)', fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
