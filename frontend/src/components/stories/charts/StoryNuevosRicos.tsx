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
  {
    era: 'Calderón',
    avg: 59.6,
    color: '#64748b',
    vendors: '72K proveedores',
  },
  {
    era: 'Peña Nieto',
    avg: 77.7,
    color: '#f97316',
    vendors: '136K proveedores',
  },
  {
    era: 'AMLO',
    avg: 84.6,
    color: '#dc2626',
    vendors: '82K proveedores',
  },
]

interface PayloadEntry {
  payload: { era: string; avg: number; vendors: string }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm shadow-lg text-text-primary">
      <p className="font-semibold">Era {d.era}</p>
      <p className="text-text-secondary">DA promedio: {d.avg}%</p>
      <p className="text-text-muted">{d.vendors}</p>
    </div>
  )
}

export function StoryNuevosRicos() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-background-card border border-border p-4"
    >
      <p className="text-sm font-semibold text-text-primary mb-0.5">
        Los proveedores nuevos bajo AMLO: más opacos desde el primer contrato
      </p>
      <p className="text-xs text-text-muted mb-4">
        Tasa promedio de adjudicación directa por cohorte de ingreso al padrón federal
      </p>

      <div className="relative">
        {/* +25pp annotation badge */}
        <div
          className="absolute z-10 text-[10px] font-bold text-white bg-red-700 px-2 py-0.5 rounded-full"
          style={{ right: '8%', top: '10px' }}
        >
          +25pp vs. era Calderón
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 50, right: 20, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="era"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              domain={[0, 95]}
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

      {/* Vendor count labels under each bar */}
      <div className="flex justify-around text-[10px] text-text-muted -mt-6 mb-2 px-10">
        {data.map((d) => (
          <span key={d.era}>{d.vendors}</span>
        ))}
      </div>
    </motion.div>
  )
}
