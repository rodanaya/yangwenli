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

const GRID_COLOR = '#3f3f46'
const AXIS_COLOR = '#71717a'
const ALERT_COLOR = '#dc2626'
const WARNING_COLOR = '#ea580c'
const MUTED_BAR = '#52525b'

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

const AVG = 48

function getBarColor(index: number): string {
  if (index === 11) return ALERT_COLOR
  if (index === 10) return WARNING_COLOR
  if (index >= 9) return '#f97316'
  return MUTED_BAR
}

interface PayloadEntry {
  payload: { mes: string; value: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const pctAboveAvg = ((d.value - AVG) / AVG * 100).toFixed(0)
  const isAbove = d.value > AVG
  return (
    <div className="rounded-lg border px-3 py-2 shadow-xl" style={{ background: '#18181b', borderColor: GRID_COLOR }}>
      <p className="font-mono font-semibold text-zinc-100">{d.mes} 2023</p>
      <p className="mt-1 text-lg font-mono font-bold text-zinc-100">${d.value}B MXN</p>
      <p className="text-[10px] text-zinc-500">
        {isAbove ? `+${pctAboveAvg}% sobre promedio` : `${pctAboveAvg}% bajo promedio`}
      </p>
    </div>
  )
}

export function MonthlySpendingChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-900 p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        RUBLI · Estacionalidad
      </p>
      <h3 className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Diciembre concentra $71B — 48% mas que el promedio mensual
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        El "rush" de fin de ano: Oct-Dic acumulan el 30% del gasto anual en solo 3 meses
      </p>

      {/* Hero stat */}
      <div className="border-l-2 pl-3 py-0.5 mb-4" style={{ borderColor: ALERT_COLOR }}>
        <p className="text-3xl font-mono font-bold" style={{ color: ALERT_COLOR }}>$71B</p>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Gasto Diciembre 2023 — 1.5x el mes promedio</p>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            dataKey="mes"
            tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
          />
          <YAxis
            domain={[0, 80]}
            ticks={[0, 20, 40, 60, 80]}
            tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.5 }} />
          <ReferenceLine
            y={AVG}
            stroke="#a1a1aa"
            strokeDasharray="6 3"
            strokeWidth={1}
            label={{
              value: `Prom. $${AVG}B`,
              fill: '#a1a1aa',
              fontSize: 10,
              fontFamily: 'ui-monospace, monospace',
              position: 'insideTopRight',
            }}
          />
          <Bar
            dataKey="value"
            radius={[3, 3, 0, 0]}
            barSize={28}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((_entry, index) => (
              <Cell
                key={index}
                fill={getBarColor(index)}
                fillOpacity={index === 11 ? 1 : index >= 9 ? 0.8 : 0.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[10px] text-zinc-600 text-right font-mono">
        Fuente: COMPRANET 2023 · Miles de millones MXN · RUBLI v6.5
      </p>
    </motion.div>
  )
}
