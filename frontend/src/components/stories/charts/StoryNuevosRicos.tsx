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
  { era: 'Calderon', avg: 59.6, vendors: '72K proveedores', cohort: '2007-2012' },
  { era: 'Pena Nieto', avg: 77.7, vendors: '136K proveedores', cohort: '2013-2018' },
  { era: 'AMLO', avg: 84.6, vendors: '82K proveedores', cohort: '2019-2024' },
]

const BAR_COLORS = ['#52525b', '#a1a1aa', '#dc2626']

interface PayloadEntry {
  payload: { era: string; avg: number; vendors: string; cohort: string }
}

function DarkTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-xl">
      <p className="font-mono text-xs font-semibold text-zinc-100">
        Cohorte {d.cohort}
      </p>
      <div className="mt-1 space-y-0.5">
        <p className="text-zinc-400 text-xs">
          DA promedio: <span className="text-zinc-100 font-bold">{d.avg}%</span>
        </p>
        <p className="text-zinc-500 text-[10px]">{d.vendors}</p>
        <p className="text-cyan-400 text-[10px] font-mono">
          {(d.avg / 25).toFixed(1)}x limite OCDE
        </p>
      </div>
    </div>
  )
}

export function StoryNuevosRicos() {
  const delta = data[2].avg - data[0].avg
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
        RUBLI · Proveedores Nuevos
      </p>

      {/* Editorial headline */}
      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Los proveedores nuevos bajo AMLO: más opacos desde el primer contrato
      </p>
      <p className="text-xs text-zinc-500 mb-4">
        Tasa promedio de adjudicación directa por cohorte de ingreso al padrón federal
      </p>

      {/* Hero stat */}
      <div className="border-l-2 border-red-500 pl-4 py-1 mb-5">
        <div className="text-3xl font-mono font-bold text-red-500">+{delta.toFixed(0)}pp</div>
        <div className="text-[11px] text-zinc-400 mt-0.5">
          Incremento Calderón a AMLO — <span className="text-cyan-400">{(data[2].avg / 25).toFixed(1)}x el límite OCDE</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 32 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="era"
            tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
          />
          <YAxis
            domain={[0, 95]}
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

      {/* Vendor count sublabels */}
      <div className="flex justify-around text-[10px] text-zinc-600 font-mono -mt-4 mb-2 px-8">
        {data.map((d) => (
          <span key={d.era}>{d.vendors}</span>
        ))}
      </div>

      {/* Finding callout */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Los proveedores que entraron al padrón bajo AMLO nacen con 84.6% de adjudicación directa
          — casi el doble que los de la era Calderón. Menos proveedores, más opacos.
        </p>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-3">
        Fuente: COMPRANET · Análisis RUBLI v6.5
      </p>
    </motion.div>
  )
}
