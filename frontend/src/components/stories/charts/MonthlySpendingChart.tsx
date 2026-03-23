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
  LabelList,
} from 'recharts'

const data = [
  { mes: 'Ene', value: 42 },
  { mes: 'Feb', value: 38 },
  { mes: 'Mar', value: 45 },
  { mes: 'Abr', value: 41 },
  { mes: 'May', value: 44 },
  { mes: 'Jun', value: 46 },
  { mes: 'Jul', value: 43 },
  { mes: 'Ago', value: 51 },
  { mes: 'Sep', value: 48 },
  { mes: 'Oct', value: 52 },
  { mes: 'Nov', value: 57 },
  { mes: 'Dic', value: 71 },
]

function getBarColor(index: number): string {
  if (index === 11) return '#dc2626' // Dec
  if (index === 10) return '#f97316' // Nov
  if (index === 9) return '#ea580c' // Oct
  return 'var(--color-text-muted)'
}

interface PayloadEntry {
  payload: { mes: string; value: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">{d.mes} 2023</p>
      <p className="text-text-secondary">${d.value}B MXN</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLabel = (props: { x?: string | number; y?: string | number; width?: string | number; value?: string | number; index?: number }) => {
  const x = typeof props.x === 'number' ? props.x : 0
  const y = typeof props.y === 'number' ? props.y : 0
  const width = typeof props.width === 'number' ? props.width : 0
  const { value, index } = props
  if (index !== 11) return null
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill="#dc2626"
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
    >
      ${value}B
    </text>
  )
}

export function MonthlySpendingChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="mb-2 text-center text-xs text-text-muted">
        Gasto mensual en contratacion publica, 2023 (miles de millones MXN)
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 20, right: 15, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            domain={[0, 80]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-border)', opacity: 0.25 }} />
          <ReferenceLine
            y={45}
            stroke="var(--color-text-muted)"
            strokeDasharray="4 2"
            label={{
              value: 'Promedio mensual',
              fill: 'var(--color-text-muted)',
              fontSize: 10,
              position: 'right',
            }}
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((_entry, index) => (
              <Cell
                key={index}
                fill={getBarColor(index)}
              />
            ))}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <LabelList content={renderLabel as any} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
