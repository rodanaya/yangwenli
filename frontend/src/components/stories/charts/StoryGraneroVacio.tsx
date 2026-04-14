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
} from 'recharts'
import { SECTOR_COLORS } from '@/lib/constants'

// Agriculture vendors under AMLO 2019-2024, sorted by value desc
const data = [
  { name: 'SEGALMEX', shortName: 'SEGALMEX', value: 6.43, daPct: 41.2 },
  { name: 'MOLINOS AZTECA', shortName: 'Molinos Azteca', value: 6.25, daPct: 99.9 },
  { name: 'ILAS MEXICO', shortName: 'ILAS Mexico', value: 3.30, daPct: 100.0 },
  { name: 'PRODUCTOS LONEG', shortName: 'Productos Loneg', value: 2.72, daPct: 100.0 },
  { name: 'INDUSTRIAL PATRONA', shortName: 'Ind. Patrona', value: 2.12, daPct: 99.4 },
  { name: 'LICONSA', shortName: 'LICONSA', value: 1.91, daPct: 63.0 },
]

// Sort descending by value for the bar chart
const sortedData = [...data].sort((a, b) => b.value - a.value)

function getBarFill(daPct: number): string {
  if (daPct >= 99) return '#dc2626'  // critical red
  if (daPct >= 60) return '#ea580c'  // high orange
  return SECTOR_COLORS.agricultura   // sector green for lower DA
}

interface PayloadEntry {
  payload: { name: string; shortName: string; value: number; daPct: number }
}

function DarkTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const avgPerContract = d.name === 'ILAS MEXICO' ? 'MXN 275M/contrato' :
    d.name === 'PRODUCTOS LONEG' ? 'MXN 302M/contrato' : null
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-xl">
      <p className="font-mono text-xs font-semibold text-zinc-100">{d.name}</p>
      <div className="mt-1 space-y-0.5">
        <p className="text-zinc-400 text-xs">
          Valor: <span className="text-zinc-100 font-semibold">MXN {d.value.toFixed(2)}B</span>
        </p>
        <p className="text-xs" style={{ color: d.daPct >= 99 ? '#dc2626' : '#a1a1aa' }}>
          Adj. Directa: <span className="font-bold">{d.daPct}%</span>
        </p>
        {avgPerContract && (
          <p className="text-amber-400 text-[10px] font-mono">{avgPerContract}</p>
        )}
      </div>
    </div>
  )
}

export function StoryGraneroVacio() {
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
        RUBLI · Sector Agricultura
      </p>

      {/* Editorial headline */}
      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Cuatro empresas, MXN $14.8B, cero competencia
      </p>
      <p className="text-xs text-zinc-500 mb-4">
        Principales proveedores por valor total · AMLO 2019-24
      </p>

      {/* Hero stat row */}
      <div className="flex gap-6 mb-5">
        <div className="border-l-2 border-red-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-red-500">93.5%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">adj. directa en el sector</div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-0.5">
          <div className="text-2xl font-mono font-bold text-amber-400">6</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">proveedores dominan</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 8, right: 80, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
            tickFormatter={(v: number) => `${v.toFixed(1)}B`}
            domain={[0, 7]}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            width={105}
          />
          <Tooltip
            content={<DarkTooltip />}
            cursor={{ fill: '#27272a', opacity: 0.6 }}
          />
          <Bar
            dataKey="value"
            radius={[0, 3, 3, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
            label={{
              position: 'right' as const,
              formatter: (v: unknown) => {
                const item = sortedData.find(d => d.value === Number(v))
                return `${item?.daPct ?? 0}% DA`
              },
              fill: '#71717a',
              fontSize: 9,
              fontFamily: 'var(--font-family-mono)',
            }}
          >
            {sortedData.map((entry, index) => (
              <Cell key={index} fill={getBarFill(entry.daPct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Finding callout */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-4">
        <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          ILAS Mexico y Productos Loneg recibieron 100% de sus contratos sin licitación.
          Promedio por contrato: MXN 275M y MXN 302M respectivamente.
        </p>
      </div>

      {/* Legend */}
      <div className="mt-3 flex gap-4 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#dc2626' }} />
          100% DA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#ea580c' }} />
          60-99% DA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: SECTOR_COLORS.agricultura }} />
          {'< 60% DA'}
        </span>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-3">
        Fuente: COMPRANET · Análisis RUBLI v6.5
      </p>
    </motion.div>
  )
}
