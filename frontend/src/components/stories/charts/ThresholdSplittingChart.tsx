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
} from 'recharts'

const data = [
  { contrato: '#1', monto: 1433, hora: '09:14' },
  { contrato: '#2', monto: 1441, hora: '09:22' },
  { contrato: '#3', monto: 1438, hora: '09:31' },
  { contrato: '#4', monto: 1445, hora: '10:03' },
  { contrato: '#5', monto: 1437, hora: '10:18' },
  { contrato: '#6', monto: 1442, hora: '10:45' },
  { contrato: '#7', monto: 1439, hora: '11:12' },
  { contrato: '#8', monto: 1444, hora: '11:38' },
  { contrato: '#9', monto: 1436, hora: '13:02' },
  { contrato: '#10', monto: 1441, hora: '13:29' },
  { contrato: '#11', monto: 1438, hora: '14:11' },
  { contrato: '#12', monto: 1432, hora: '14:47' },
]

interface PayloadEntry {
  payload: { contrato: string; monto: number; hora: string }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white shadow-lg">
      <p className="font-semibold">Contrato {d.contrato}</p>
      <p className="text-zinc-300">${d.monto}M MXN</p>
      <p className="text-zinc-500">Hora: {d.hora}</p>
    </div>
  )
}

export function ThresholdSplittingChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="mb-2 text-center text-xs text-zinc-500">
        HEMOSER — 2 Agosto 2023: 12 contratos bajo el umbral
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="contrato"
            tick={{ fill: '#a1a1aa', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            domain={[1400, 1520]}
            tick={{ fill: '#71717a', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
            label={{
              value: 'Millones MXN',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#a1a1aa', fontSize: 10 },
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a40' }} />
          <ReferenceLine
            y={1500}
            stroke="#dc2626"
            strokeWidth={2}
            label={{
              value: 'Umbral de Supervision: $1,500M',
              fill: '#dc2626',
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />
          <Bar
            dataKey="monto"
            fill="#f97316"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
