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
import { SECTOR_COLORS } from '@/lib/constants'

const OECD_COLOR = '#22d3ee'
const GRID_COLOR = '#3f3f46'
const AXIS_COLOR = '#71717a'

const sectorColorMap: Record<string, string> = {
  Agricultura: SECTOR_COLORS.agricultura,
  Defensa: SECTOR_COLORS.defensa,
  Gobernacion: SECTOR_COLORS.gobernacion,
  Tecnologia: SECTOR_COLORS.tecnologia,
  Salud: SECTOR_COLORS.salud,
  Trabajo: SECTOR_COLORS.trabajo,
  Energia: SECTOR_COLORS.energia,
  Hacienda: SECTOR_COLORS.hacienda,
  Infraestructura: SECTOR_COLORS.infraestructura,
  Ambiente: SECTOR_COLORS.ambiente,
  Educacion: SECTOR_COLORS.educacion,
  Otros: SECTOR_COLORS.otros,
}

const rawData = [
  { sector: 'Agricultura', rate: 93.4 },
  { sector: 'Defensa', rate: 89.2 },
  { sector: 'Gobernacion', rate: 85.1 },
  { sector: 'Tecnologia', rate: 82.7 },
  { sector: 'Salud', rate: 78.9 },
  { sector: 'Trabajo', rate: 78.3 },
  { sector: 'Energia', rate: 77.6 },
  { sector: 'Hacienda', rate: 76.8 },
  { sector: 'Infraestructura', rate: 74.2 },
  { sector: 'Ambiente', rate: 73.9 },
  { sector: 'Educacion', rate: 71.5 },
  { sector: 'Otros', rate: 68.3 },
].reverse()

interface PayloadEntry {
  payload: { sector: string; rate: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const multiplier = (d.rate / 25).toFixed(1)
  return (
    <div className="rounded-lg border px-3 py-2 text-sm shadow-xl" style={{ background: '#18181b', borderColor: GRID_COLOR }}>
      <p className="font-mono font-semibold text-zinc-100">{d.sector}</p>
      <p className="mt-1 text-lg font-mono font-bold" style={{ color: sectorColorMap[d.sector] || '#a1a1aa' }}>
        {d.rate}%
      </p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
        {multiplier}x limite OCDE
      </p>
    </div>
  )
}

export function DaBySectorChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-900 p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        RUBLI · Por sector
      </p>
      <h3 className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Todos los sectores superan el limite OCDE — Agricultura llega a 93%
      </h3>
      <p className="text-xs text-zinc-500 mb-4">
        El sector mas bajo (Otros, 68%) todavia triplica el umbral del 25%
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart
          data={rawData}
          layout="vertical"
          margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={true} horizontal={false} strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: AXIS_COLOR, fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="sector"
            width={95}
            tick={{ fill: '#d4d4d8', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.6 }} />
          <ReferenceLine
            x={25}
            stroke={OECD_COLOR}
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: 'OCDE 25%',
              fill: OECD_COLOR,
              fontSize: 10,
              fontFamily: 'var(--font-family-mono)',
              position: 'insideTopRight',
            }}
          />
          <Bar
            dataKey="rate"
            radius={[0, 3, 3, 0]}
            barSize={18}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {rawData.map((entry) => (
              <Cell
                key={entry.sector}
                fill={sectorColorMap[entry.sector] || '#64748b'}
                fillOpacity={entry.rate >= 85 ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[10px] text-zinc-600 text-right font-mono">
        Fuente: COMPRANET 2002-2025 · RUBLI v6.5
      </p>
    </motion.div>
  )
}
