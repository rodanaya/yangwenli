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
} from 'recharts'

const data = [
  {
    era: 'Calderon',
    spendTn: 2.41,
    daPct: 42.3,
    contracts: '481K',
    cohort: '2007-2012',
  },
  {
    era: 'Pena Nieto',
    spendTn: 3.06,
    daPct: 73.1,
    contracts: '1.23M',
    cohort: '2013-2018',
  },
  {
    era: 'AMLO',
    spendTn: 2.76,
    daPct: 79.4,
    contracts: '1.05M',
    cohort: '2019-2024',
  },
]

const BAR_COLORS = ['#52525b', '#71717a', '#a1a1aa']

interface PayloadEntry {
  payload: {
    era: string
    spendTn: number
    daPct: number
    contracts: string
    cohort: string
  }
}

function DarkTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-xl">
      <p className="font-mono text-xs font-semibold text-zinc-100">
        {d.era} ({d.cohort})
      </p>
      <div className="mt-1 space-y-0.5">
        <p className="text-zinc-400 text-xs">
          Gasto: <span className="text-zinc-100 font-bold">MXN {d.spendTn.toFixed(2)}T</span>
        </p>
        <p className="text-xs" style={{ color: '#dc2626' }}>
          Adj. Directa: <span className="font-bold">{d.daPct}%</span>
        </p>
        <p className="text-zinc-500 text-[10px]">{d.contracts} contratos</p>
      </div>
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
      className="rounded-xl bg-zinc-900 border border-zinc-800 p-5"
    >
      {/* Overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        RUBLI · Austeridad
      </p>

      {/* Editorial headline — the paradox IS the story */}
      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        El gasto bajó 10%. La opacidad subió 8 puntos.
      </p>
      <p className="text-xs text-zinc-500 mb-4">
        Gasto total y tasa de adjudicación directa por administración · COMPRANET 2007-2024
      </p>

      {/* Two opposing stats — the visual tension */}
      <div className="flex gap-6 mb-5">
        <div className="border-l-2 border-zinc-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-zinc-300">-10%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">gasto Pena a AMLO</div>
        </div>
        <div className="border-l-2 border-red-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-red-500">+8.6pp</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">opacidad Pena a AMLO</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 48, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="era"
            tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
          />
          {/* Left axis: spend in Tn */}
          <YAxis
            yAxisId="spend"
            orientation="left"
            domain={[0, 4]}
            tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v.toFixed(1)}T`}
          />
          {/* Right axis: DA % */}
          <YAxis
            yAxisId="da"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: '#dc2626', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            content={<DarkTooltip />}
            cursor={{ fill: '#27272a', opacity: 0.6 }}
          />
          <Bar
            yAxisId="spend"
            dataKey="spendTn"
            radius={[3, 3, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
            label={{
              position: 'top' as const,
              formatter: (v: unknown) => `MXN ${Number(v).toFixed(2)}T`,
              fill: '#a1a1aa',
              fontSize: 10,
              fontWeight: 500,
              fontFamily: 'var(--font-family-mono)',
            }}
          >
            {data.map((_entry, index) => (
              <Cell key={index} fill={BAR_COLORS[index]} fillOpacity={0.7} />
            ))}
          </Bar>
          <Line
            yAxisId="da"
            type="monotone"
            dataKey="daPct"
            stroke="#dc2626"
            strokeWidth={2.5}
            dot={{ fill: '#dc2626', r: 5, strokeWidth: 2, stroke: '#18181b' }}
            isAnimationActive={true}
            animationDuration={1400}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#52525b', opacity: 0.7 }} />
          Gasto total (eje izq.)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2" style={{ borderColor: '#dc2626' }} />
          % Adj. Directa (eje der.)
        </span>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-3">
        Fuente: COMPRANET · Análisis RUBLI v6.5
      </p>
    </motion.div>
  )
}
