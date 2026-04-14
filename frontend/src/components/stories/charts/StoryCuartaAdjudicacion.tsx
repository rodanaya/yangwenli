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

const OECD_COLOR = '#22d3ee'

const data = [
  { era: 'Calderon', avg: 42.3, label: 'Calderon (2007-12)' },
  { era: 'Pena Nieto', avg: 73.1, label: 'Pena Nieto (2013-18)' },
  { era: 'AMLO', avg: 79.4, label: 'AMLO (2019-24)' },
]

const BAR_COLORS = ['#52525b', '#a1a1aa', '#dc2626']

interface PayloadEntry {
  payload: { era: string; avg: number; label: string }
}

function DarkTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-xl">
      <p className="font-mono text-xs font-semibold text-zinc-100">{d.label}</p>
      <p className="text-zinc-400 text-xs mt-1">
        Promedio AD: <span className="text-zinc-100 font-semibold">{d.avg}%</span>
      </p>
      <p className="text-zinc-500 text-[10px] mt-0.5">
        {d.avg > 25 ? `${(d.avg / 25).toFixed(1)}x sobre limite OCDE` : 'Dentro del limite OCDE'}
      </p>
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
      className="rounded-xl bg-zinc-900 border border-zinc-800 p-5"
    >
      {/* Overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        RUBLI · Hallazgo
      </p>

      {/* Editorial headline — the finding IS the title */}
      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Cada sexenio batió el récord del anterior
      </p>
      <p className="text-xs text-zinc-500 mb-5">
        Promedio de adjudicación directa por administración · COMPRANET 2007-2024
      </p>

      {/* Hero stat */}
      <div className="border-l-2 border-red-500 pl-4 py-1 mb-5">
        <div className="text-3xl font-mono font-bold text-red-500">79.4%</div>
        <div className="text-[11px] text-zinc-400 mt-0.5">
          Bajo AMLO — <span className="text-cyan-400">3.2x el límite OCDE de 25%</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="era"
            tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
          />
          <YAxis
            domain={[0, 90]}
            tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            content={<DarkTooltip />}
            cursor={{ fill: '#27272a', opacity: 0.6 }}
          />
          <ReferenceLine
            y={25}
            stroke={OECD_COLOR}
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: 'OCDE max 25%',
              fill: OECD_COLOR,
              fontSize: 10,
              fontFamily: 'var(--font-family-mono)',
              position: 'right',
            }}
          />
          <Bar
            dataKey="avg"
            radius={[3, 3, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
            label={{
              position: 'top' as const,
              formatter: (v: unknown) => `${v}%`,
              fill: '#f4f4f5',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-family-mono)',
            }}
          >
            {data.map((_entry, index) => (
              <Cell key={index} fill={BAR_COLORS[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Annotation pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          81.9% en 2023 — récord histórico
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400">
          OCDE: max 25% adjudicación directa
        </span>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-3">
        Fuente: COMPRANET · Análisis RUBLI v6.5
      </p>
    </motion.div>
  )
}
