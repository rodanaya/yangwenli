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
  { year: '2019', contracts: 18025 },
  { year: '2020', contracts: 17413 },
  { year: '2021', contracts: 17352 },
  { year: '2022', contracts: 12013 },
  { year: '2023', contracts: 20512 },
  { year: '2024', contracts: 7914 },
]

const PEAK_YEAR = '2023'
const TOTAL = data.reduce((sum, d) => sum + d.contracts, 0)

interface PayloadEntry {
  payload: { year: string; contracts: number }
}

function DarkTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const pctOfTotal = ((d.contracts / TOTAL) * 100).toFixed(1)
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-xl">
      <p className="font-mono text-xs font-semibold text-zinc-100">{d.year}</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-zinc-400 text-xs">
          <span className="text-zinc-100 font-bold">{d.contracts.toLocaleString('es-MX')}</span> contratos fraccionados
        </p>
        <p className="text-zinc-500 text-[10px]">{pctOfTotal}% del total AMLO</p>
        {d.year === '2024' && (
          <p className="text-amber-400 text-[10px] font-mono">* ano parcial</p>
        )}
      </div>
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
      className="rounded-xl bg-zinc-900 border border-zinc-800 p-5"
    >
      {/* Overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        RUBLI · Fraccionamiento
      </p>

      {/* Editorial headline */}
      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        El fraccionamiento no es un accidente: 93K contratos sospechosos bajo AMLO
      </p>
      <p className="text-xs text-zinc-500 mb-4">
        Contratos con patrón de fraccionamiento en el mismo día · 2019-2024
      </p>

      {/* Hero stats row */}
      <div className="flex gap-6 mb-5">
        <div className="border-l-2 border-red-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-red-500">93K</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">contratos fraccionados</div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-amber-400">20.5K</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">pico en 2023</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
          />
          <YAxis
            tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
            domain={[0, 25000]}
          />
          <Tooltip
            content={<DarkTooltip />}
            cursor={{ fill: '#27272a', opacity: 0.6 }}
          />
          <Bar
            dataKey="contracts"
            radius={[3, 3, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
            label={{
              position: 'top' as const,
              formatter: (v: unknown) => `${(Number(v) / 1000).toFixed(1)}K`,
              fill: '#71717a',
              fontSize: 9,
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.year === PEAK_YEAR ? '#dc2626' : '#52525b'}
                fillOpacity={entry.year === PEAK_YEAR ? 1 : 0.8}
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="contracts"
            stroke="#a1a1aa"
            strokeWidth={1}
            dot={false}
            strokeDasharray="4 3"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Annotation pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          2023: 20,512 contratos — máximo del sexenio
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400">
          MOLINOS AZTECA 2021: 1,340 contratos, MXN 945M
        </span>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-3">
        * 2024 año parcial · Fraccionamiento = múltiples contratos al mismo proveedor el mismo día · Fuente: RUBLI v6.5
      </p>
    </motion.div>
  )
}
