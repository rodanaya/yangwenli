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

const OECD_COLOR = '#22d3ee'

const data = [
  { era: 'Calderón\n(2007-12)', avg: 42.3, color: '#64748b', label: 'Calderón' },
  { era: 'Peña Nieto\n(2013-18)', avg: 73.1, color: '#f97316', label: 'Peña Nieto' },
  { era: 'AMLO\n(2019-24)', avg: 79.4, color: '#dc2626', label: 'AMLO' },
]

interface PayloadEntry {
  payload: { era: string; avg: number; label: string }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">{d.label}</p>
      <p className="text-text-secondary">Promedio: {d.avg}%</p>
    </div>
  )
}

export function StoryCuartaAdjudicacion() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-background-card border border-border p-4"
    >
      <p className="text-sm font-semibold text-text-primary mb-0.5">
        Cada sexenio batió el récord del anterior
      </p>
      <p className="text-xs text-text-muted mb-4">
        Promedio de adjudicación directa por administración · COMPRANET 2007-2024
      </p>

      <div className="relative">
        {/* "Récord histórico" badge positioned over AMLO bar */}
        <div
          className="absolute z-10 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full"
          style={{ right: '11%', top: '12px' }}
        >
          Récord histórico ↑
        </div>

        {/* Annotation for peak year */}
        <div
          className="absolute z-10 text-[9px] text-red-400 font-medium"
          style={{ right: '7%', top: '42px' }}
        >
          81.9% en 2023
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 60, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              domain={[0, 90]}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'var(--color-border)', opacity: 0.25 }}
            />
            <ReferenceLine
              y={25}
              stroke={OECD_COLOR}
              strokeDasharray="4 2"
              label={{
                value: 'OCDE 25%',
                fill: OECD_COLOR,
                fontSize: 10,
                position: 'right',
              }}
            />
            <Bar
              dataKey="avg"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
              <LabelList
                dataKey="avg"
                position="top"
                formatter={(v: unknown) => `${v}%`}
                style={{ fill: 'var(--color-text-primary)', fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-text-muted text-center mt-1">
        Límite OCDE: 25% · México bajo AMLO: 3.3× el límite recomendado
      </p>
    </motion.div>
  )
}
