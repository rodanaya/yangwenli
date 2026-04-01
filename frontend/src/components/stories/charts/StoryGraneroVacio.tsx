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

// Agriculture vendors under AMLO 2019-2024, sorted by value desc
const data = [
  { name: 'SEGALMEX', shortName: 'SEGALMEX', value: 6.43, daPct: 41.2, color: '#64748b' },
  { name: 'MOLINOS AZTECA', shortName: 'Molinos Azteca', value: 6.25, daPct: 99.9, color: '#ea580c' },
  { name: 'LICONSA', shortName: 'LICONSA', value: 1.91, daPct: 63.0, color: '#64748b' },
  { name: 'INDUSTRIAL PATRONA', shortName: 'Ind. Patrona', value: 2.12, daPct: 99.4, color: '#ea580c' },
  { name: 'PRODUCTOS LONEG', shortName: 'Productos Loneg', value: 2.72, daPct: 100.0, color: '#dc2626' },
  { name: 'ILAS MEXICO', shortName: 'ILAS México', value: 3.30, daPct: 100.0, color: '#dc2626' },
]

// Sort descending by value for the bar chart
const sortedData = [...data].sort((a, b) => b.value - a.value)

function getBarColor(daPct: number): string {
  if (daPct >= 99) return '#dc2626'
  if (daPct >= 95) return '#ea580c'
  return '#64748b'
}

interface PayloadEntry {
  payload: { name: string; value: number; daPct: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">{d.name}</p>
      <p className="text-text-secondary">Valor: MXN {d.value.toFixed(2)}Bn</p>
      <p style={{ color: d.daPct >= 99 ? '#dc2626' : d.daPct >= 95 ? '#ea580c' : 'var(--color-text-muted)' }}>
        Adj. Directa: {d.daPct}%
      </p>
    </div>
  )
}

export function StoryGraneroVacio() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-background-card border border-border p-4"
    >
      <p className="text-sm font-semibold text-text-primary mb-0.5">
        Cuatro empresas, MXN $14.8B, cero competencia
      </p>
      <p className="text-xs text-text-muted mb-3">
        Sector Agricultura · AMLO 2019-24 · principales proveedores por valor total
      </p>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 90, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickFormatter={(v: number) => `${v.toFixed(1)}Bn`}
            domain={[0, 7]}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'var(--color-border)', opacity: 0.25 }}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {sortedData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.daPct)} />
            ))}
            <LabelList
              dataKey="daPct"
              position="right"
              formatter={(v: unknown) => `${v}% DA`}
              style={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Annotation pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-[10px] bg-red-950/60 border border-red-800/50 text-red-400 px-2 py-1 rounded-full">
          ILAS México: 12 contratos · MX$275M c/u
        </span>
        <span className="text-[10px] bg-red-950/60 border border-red-800/50 text-red-400 px-2 py-1 rounded-full">
          Productos Loneg: 9 contratos · MX$302M c/u
        </span>
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-4 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#dc2626' }} />
          100% DA
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#ea580c' }} />
          99%+ DA
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#64748b' }} />
          {'< 70% DA'}
        </span>
      </div>

      <p className="text-[10px] text-text-muted mt-2">
        Sector Agricultura · AMLO 2019-24 · 93.5% adjudicación directa
      </p>
    </motion.div>
  )
}
