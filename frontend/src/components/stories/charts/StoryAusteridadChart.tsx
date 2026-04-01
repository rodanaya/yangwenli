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
  {
    era: 'Calderón',
    spendTn: 2.41,
    daPct: 42.3,
    contracts: '481K',
    color: '#64748b',
    spendLabel: 'MXN 2.41T',
  },
  {
    era: 'Peña Nieto',
    spendTn: 3.06,
    daPct: 73.1,
    contracts: '1.23M',
    color: '#f97316',
    spendLabel: 'MXN 3.06T',
  },
  {
    era: 'AMLO',
    spendTn: 2.76,
    daPct: 79.4,
    contracts: '1.05M',
    color: '#dc2626',
    spendLabel: 'MXN 2.76T',
  },
]

interface PayloadEntry {
  payload: {
    era: string
    spendTn: number
    daPct: number
    contracts: string
    spendLabel: string
  }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">{d.era}</p>
      <p className="text-text-secondary">Gasto total: {d.spendLabel}</p>
      <p className="text-text-secondary">DA: {d.daPct}%</p>
      <p className="text-text-muted">{d.contracts} contratos</p>
    </div>
  )
}

export function StoryAusteridadChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-background-card border border-border p-4"
    >
      <p className="text-sm font-semibold text-text-primary mb-0.5">
        El gasto bajó 10%. La opacidad subió 8 puntos.
      </p>
      <p className="text-xs text-text-muted mb-1">
        Gasto total (Tn MXN) y tasa de adjudicación directa · COMPRANET 2007-2024
      </p>

      {/* Annotations */}
      <div className="flex gap-3 mb-3 flex-wrap">
        <span className="text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
          Peña → AMLO: −10% gasto
        </span>
        <span className="text-[10px] bg-red-950/60 border border-red-800/50 text-red-400 px-2 py-0.5 rounded-full">
          Peña → AMLO: +8.6pp opacidad
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 20, right: 50, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="era"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          {/* Left axis: spend in Tn */}
          <YAxis
            yAxisId="spend"
            orientation="left"
            domain={[0, 4]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickFormatter={(v: number) => `${v.toFixed(1)}Tn`}
          />
          {/* Right axis: DA % */}
          <YAxis
            yAxisId="da"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: '#dc2626', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'var(--color-border)', opacity: 0.25 }}
          />
          <Bar
            yAxisId="spend"
            dataKey="spendTn"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.6} />
            ))}
            <LabelList
              dataKey="spendLabel"
              position="top"
              style={{ fill: 'var(--color-text-primary)', fontSize: 10, fontWeight: 500 }}
            />
          </Bar>
          <Line
            yAxisId="da"
            type="monotone"
            dataKey="daPct"
            stroke="#dc2626"
            strokeWidth={2.5}
            dot={{ fill: '#dc2626', r: 5, strokeWidth: 2, stroke: '#000' }}
            isAnimationActive={true}
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-2 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#64748b', opacity: 0.6 }} />
          Gasto total (barras, eje izq.)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 inline-block" style={{ borderColor: '#dc2626' }} />
          % Adj. Directa (línea, eje der.)
        </span>
      </div>
    </motion.div>
  )
}
