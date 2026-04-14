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

const GRID_COLOR = '#3f3f46'
const AXIS_COLOR = '#71717a'

const FOX_COLOR = '#52525b'
const CALDERON_COLOR = '#71717a'
const PENA_COLOR = '#a1a1aa'
const AMLO_COLOR = '#dc2626'

const SEXENIO_COLORS: Record<string, string> = {
  Fox: FOX_COLOR,
  Calderon: CALDERON_COLOR,
  'Pena Nieto': PENA_COLOR,
  AMLO: AMLO_COLOR,
}

const data = [
  { metric: 'Adj. Directa', unit: '%', fox: 63.5, calderon: 64.2, pena: 71.8, amlo: 79.4 },
  { metric: 'Licit. unica', unit: '%', fox: 12.1, calderon: 13.4, pena: 15.7, amlo: 18.2 },
  { metric: 'Riesgo alto', unit: '%', fox: 4.2, calderon: 5.1, pena: 7.3, amlo: 11.8 },
  { metric: 'Concentracion', unit: '%', fox: 18.3, calderon: 19.7, pena: 23.4, amlo: 28.9 },
]

interface PayloadEntry {
  payload: { metric: string; unit: string; fox: number; calderon: number; pena: number; amlo: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const delta = (d.amlo - d.fox).toFixed(1)
  return (
    <div className="rounded-lg border px-3 py-2.5 shadow-xl" style={{ background: '#18181b', borderColor: GRID_COLOR }}>
      <p className="font-mono font-semibold text-zinc-100 mb-1.5">{d.metric}</p>
      <div className="space-y-1">
        {[
          { label: 'Fox', value: d.fox, color: FOX_COLOR },
          { label: 'Calderon', value: d.calderon, color: CALDERON_COLOR },
          { label: 'Pena Nieto', value: d.pena, color: PENA_COLOR },
          { label: 'AMLO', value: d.amlo, color: AMLO_COLOR },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: row.color }} />
              <span className="text-zinc-400 font-mono">{row.label}</span>
            </div>
            <span className="font-mono font-semibold text-zinc-100">{row.value}{d.unit}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-1.5 border-t" style={{ borderColor: GRID_COLOR }}>
        <p className="text-[10px] text-zinc-500">AMLO vs Fox: <span className="text-red-400 font-semibold">+{delta} pts</span></p>
      </div>
    </div>
  )
}

export function SexenioComparisonChart() {
  const worstMetric = data.reduce((worst, d) => {
    const delta = d.amlo - d.fox
    return delta > worst.delta ? { name: d.metric, delta, amloVal: d.amlo } : worst
  }, { name: '', delta: 0, amloVal: 0 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-900 p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        RUBLI · Diagnostico sexenal
      </p>
      <h3 className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Todos los indicadores empeoran con cada sexenio
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        Mayor deterioro: {worstMetric.name} (+{worstMetric.delta.toFixed(1)} pts Fox a AMLO)
      </p>

      {/* Sexenio legend strip */}
      <div className="flex items-center gap-4 mb-3">
        {Object.entries(SEXENIO_COLORS).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color, opacity: name === 'AMLO' ? 1 : 0.7 }} />
            <span className="text-[10px] font-mono text-zinc-500">{name}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            dataKey="metric"
            tick={{ fill: '#d4d4d8', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            interval={0}
          />
          <YAxis
            domain={[0, 85]}
            ticks={[0, 25, 50, 75]}
            tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            width={28}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
          <Bar dataKey="fox" radius={[2, 2, 0, 0]} isAnimationActive={true} animationDuration={1000}>
            {data.map((_d, i) => (
              <Cell key={i} fill={FOX_COLOR} fillOpacity={0.5} />
            ))}
          </Bar>
          <Bar dataKey="calderon" radius={[2, 2, 0, 0]} isAnimationActive={true} animationDuration={1000}>
            {data.map((_d, i) => (
              <Cell key={i} fill={CALDERON_COLOR} fillOpacity={0.5} />
            ))}
          </Bar>
          <Bar dataKey="pena" radius={[2, 2, 0, 0]} isAnimationActive={true} animationDuration={1000}>
            {data.map((_d, i) => (
              <Cell key={i} fill={PENA_COLOR} fillOpacity={0.6} />
            ))}
          </Bar>
          <Bar dataKey="amlo" radius={[2, 2, 0, 0]} isAnimationActive={true} animationDuration={1000}>
            {data.map((_d, i) => (
              <Cell key={i} fill={AMLO_COLOR} />
            ))}
            <LabelList
              dataKey="amlo"
              position="top"
              style={{ fill: AMLO_COLOR, fontSize: 10, fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}
              formatter={(v) => `${v}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[10px] text-zinc-600 text-right font-mono">
        Fuente: COMPRANET 2002-2025 · Top 10 = concentracion de los 10 proveedores principales · RUBLI v6.5
      </p>
    </motion.div>
  )
}
