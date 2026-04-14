import { motion } from 'framer-motion'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts'

const GRID_COLOR = '#3f3f46'
const AXIS_COLOR = '#71717a'
const DA_COLOR = '#dc2626'
const SB_COLOR = '#f97316'

const data = [
  { year: '2017', da: 74.3, single_bid: 16.8 },
  { year: '2018', da: 76.2, single_bid: 17.2 },
  { year: '2019', da: 77.8, single_bid: 16.5 },
  { year: '2020', da: 78.1, single_bid: 18.3, covid: true },
  { year: '2021', da: 80.0, single_bid: 19.1, covid: true },
  { year: '2022', da: 79.1, single_bid: 17.9 },
  { year: '2023', da: 81.9, single_bid: 18.7 },
]

interface PayloadEntry {
  payload: { year: string; da: number; single_bid: number; covid?: boolean }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border px-3 py-2.5 shadow-xl" style={{ background: '#18181b', borderColor: GRID_COLOR }}>
      <div className="flex items-center gap-2">
        <p className="font-mono font-semibold text-zinc-100">{d.year}</p>
        {d.covid && (
          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide bg-red-500/10 border border-red-500/20 text-red-400">
            COVID-19
          </span>
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Adj. Directa</p>
          <p className="text-base font-mono font-bold" style={{ color: DA_COLOR }}>{d.da}%</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Licitacion unica</p>
          <p className="text-base font-mono font-bold" style={{ color: SB_COLOR }}>{d.single_bid}%</p>
        </div>
      </div>
    </div>
  )
}

export function CovidEmergencyChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-900 p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        RUBLI · Emergencia sanitaria
      </p>
      <h3 className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        COVID-19 no creo la crisis — la acelero
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        Adj. Directa subio durante la pandemia pero nunca bajo despues. Licitacion unica alcanzo 19.1% en 2021.
      </p>

      {/* Key stat callout */}
      <div className="flex gap-4 mb-4">
        <div className="border-l-2 pl-3 py-0.5" style={{ borderColor: DA_COLOR }}>
          <p className="text-2xl font-mono font-bold" style={{ color: DA_COLOR }}>+5.7 pts</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">DA 2017 a 2023</p>
        </div>
        <div className="border-l-2 pl-3 py-0.5" style={{ borderColor: SB_COLOR }}>
          <p className="text-2xl font-mono font-bold" style={{ color: SB_COLOR }}>19.1%</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Licitacion unica pico 2021</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={GRID_COLOR} />
          <ReferenceArea
            x1="2020"
            x2="2021"
            fill={DA_COLOR}
            fillOpacity={0.06}
            label={{
              value: 'COVID-19',
              fill: '#71717a',
              fontSize: 10,
              fontFamily: 'var(--font-family-mono)',
              position: 'insideTop',
            }}
          />
          <XAxis
            dataKey="year"
            tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
          />
          <YAxis
            yAxisId="left"
            domain={[70, 85]}
            ticks={[70, 75, 80, 85]}
            tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            width={32}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[14, 22]}
            ticks={[14, 16, 18, 20, 22]}
            tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            width={32}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="da"
            fill={DA_COLOR}
            fillOpacity={0.1}
            stroke={DA_COLOR}
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="single_bid"
            stroke={SB_COLOR}
            strokeWidth={2}
            dot={{ fill: SB_COLOR, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#18181b', stroke: SB_COLOR, strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend — manual, cleaner than Recharts Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: DA_COLOR }} />
          <span className="text-[10px] font-mono text-zinc-500">Adj. Directa %</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: SB_COLOR }} />
          <span className="text-[10px] font-mono text-zinc-500">Licitacion unica %</span>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-zinc-600 text-right font-mono">
        Fuente: COMPRANET 2017-2023 · RUBLI v6.5
      </p>
    </motion.div>
  )
}
