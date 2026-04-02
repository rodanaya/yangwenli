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
const GRID_COLOR = '#3f3f46'
const AXIS_COLOR = '#71717a'

const ERA_PALETTE: Record<string, string> = {
  'Fox': '#52525b',
  'Calderon': '#71717a',
  'Pena Nieto': '#a1a1aa',
  'AMLO': '#dc2626',
}

const data = [
  { era: 'Fox', years: '2000-06', avg: 63.5, peak: 65.1 },
  { era: 'Calderon', years: '2007-12', avg: 64.2, peak: 67.1 },
  { era: 'Pena Nieto', years: '2013-18', avg: 71.8, peak: 76.2 },
  { era: 'AMLO', years: '2019-24', avg: 79.4, peak: 81.9 },
]

interface PayloadEntry {
  payload: { era: string; years: string; avg: number; peak: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const delta = d.era === 'Fox' ? '' : ` (+${(d.avg - 63.5).toFixed(1)} vs Fox)`
  return (
    <div className="rounded-lg border px-3 py-2.5 shadow-xl" style={{ background: '#18181b', borderColor: GRID_COLOR }}>
      <p className="font-mono font-semibold text-zinc-100">{d.era} <span className="text-zinc-500 font-normal">{d.years}</span></p>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Promedio</p>
          <p className="text-base font-mono font-bold text-zinc-100">{d.avg}%</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Maximo</p>
          <p className="text-base font-mono font-bold" style={{ color: ERA_PALETTE[d.era] }}>{d.peak}%</p>
        </div>
      </div>
      {delta && <p className="mt-1 text-[10px] text-zinc-500">{delta}</p>}
    </div>
  )
}

export function AmloEraComparisonChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-900 p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        RUBLI · Comparacion sexenal
      </p>
      <h3 className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        AMLO promedio 79.4% — cada sexenio supera al anterior
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        +15.9 pts vs era Fox. El pico de 81.9% es 3.3x el limite OCDE.
      </p>

      {/* Stat strip: key number callout */}
      <div className="flex gap-6 mb-4">
        {data.map((d) => (
          <div key={d.era} className="flex-1">
            <p className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">{d.era}</p>
            <p className="text-xl font-mono font-bold" style={{ color: ERA_PALETTE[d.era] }}>{d.avg}%</p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            dataKey="era"
            tick={{ fill: '#d4d4d8', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 90]}
            ticks={[0, 25, 50, 75]}
            tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
            tickLine={false}
            axisLine={false}
            width={32}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.5 }} />
          <ReferenceLine
            y={25}
            stroke={OECD_COLOR}
            strokeDasharray="6 3"
            strokeWidth={1.5}
          />
          <Bar
            dataKey="peak"
            radius={[3, 3, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {data.map((entry) => (
              <Cell
                key={entry.era}
                fill={ERA_PALETTE[entry.era]}
                fillOpacity={entry.era === 'AMLO' ? 1 : 0.5}
              />
            ))}
            <LabelList
              dataKey="peak"
              position="top"
              style={{ fill: '#d4d4d8', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
              formatter={(v) => `${v}%`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[10px] text-zinc-600 text-right font-mono">
        Fuente: COMPRANET 2002-2025 · RUBLI v6.5
      </p>
    </motion.div>
  )
}
