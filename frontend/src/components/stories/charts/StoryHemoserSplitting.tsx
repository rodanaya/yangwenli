import { motion } from 'framer-motion'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'

const data = [
  { year: '2019', contracts: 18025 },
  { year: '2020', contracts: 17413 },
  { year: '2021', contracts: 17352 },
  { year: '2022', contracts: 12013 },
  { year: '2023', contracts: 20512 },
  { year: '2024', contracts: 7914 },
]

const HIGHLIGHT_YEAR = '2023'

interface PayloadEntry {
  payload: { year: string; contracts: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">{d.year}</p>
      <p className="text-text-secondary">
        {d.contracts.toLocaleString('es-MX')} contratos con fraccionamiento
      </p>
      {d.year === '2024' && (
        <p className="text-text-muted text-xs">* año parcial</p>
      )}
    </div>
  )
}

export function StoryHemoserSplitting() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-background-card border border-border p-4"
    >
      <p className="text-sm font-semibold text-text-primary mb-0.5">
        El fraccionamiento no es un accidente: 93K contratos sospechosos bajo AMLO
      </p>
      <p className="text-xs text-text-muted mb-4">
        Contratos con patrón de fraccionamiento en el mismo día · RUBLI v6.5 · 2019-2024
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 30, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
            domain={[0, 25000]}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'var(--color-border)', opacity: 0.25 }}
          />
          <Bar
            dataKey="contracts"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.year === HIGHLIGHT_YEAR ? '#dc2626' : '#ea580c'}
                fillOpacity={entry.year === HIGHLIGHT_YEAR ? 1 : 0.7}
              />
            ))}
            <LabelList
              dataKey="contracts"
              position="top"
              formatter={(v: unknown) => `${(Number(v) / 1000).toFixed(1)}K`}
              style={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
            />
          </Bar>
          <Line
            type="monotone"
            dataKey="contracts"
            stroke="var(--color-text-muted)"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="3 3"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Annotation for 2023 */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-[10px] bg-red-950/60 border border-red-800/50 text-red-400 px-2 py-1 rounded-full">
          2023: 20,512 contratos — máximo del sexenio
        </span>
        <span className="text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-400 px-2 py-1 rounded-full">
          MOLINOS AZTECA 2021: 1,340 contratos, MX$945M
        </span>
      </div>

      <p className="text-[10px] text-text-muted mt-2">
        * 2024 año parcial · Fraccionamiento = múltiples contratos al mismo proveedor el mismo día
      </p>
    </motion.div>
  )
}
