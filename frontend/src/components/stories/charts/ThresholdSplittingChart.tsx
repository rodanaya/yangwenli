/**
 * ThresholdSplittingChart — Editorial dark-mode chart
 *
 * Visualizes a real threshold-splitting pattern: 12 contracts awarded
 * on a single day, all just below the supervision threshold.
 * The visual story: every bar clusters suspiciously below the red line.
 */

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
import { RISK_COLORS } from '@/lib/constants'

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

const THRESHOLD = 1500
const totalValue = data.reduce((sum, d) => sum + d.monto, 0)

interface PayloadEntry {
  payload: { contrato: string; monto: number; hora: string }
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const gap = THRESHOLD - d.monto
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-zinc-100">Contrato {d.contrato}</p>
      <p className="text-zinc-400 font-mono tabular-nums mt-0.5">
        ${d.monto}M MXN
      </p>
      <p className="text-zinc-500 font-mono mt-0.5">
        Hora: {d.hora}
      </p>
      <p className="font-mono mt-1" style={{ color: RISK_COLORS.critical }}>
        ${gap}M bajo el umbral
      </p>
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
      className="bg-zinc-900 rounded-xl p-4 border border-zinc-800"
    >
      {/* Editorial overline */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
        RUBLI · Threshold Splitting
      </p>
      {/* Finding headline */}
      <h3 className="text-base font-bold text-zinc-100 leading-tight mb-0.5">
        12 contracts in 6 hours, all below the $1,500M oversight limit
      </h3>
      <p className="text-xs text-zinc-500 font-mono mb-4">
        HEMOSER · 2 Aug 2023 · Total: ${totalValue.toLocaleString()}M MXN
        ({Math.round((totalValue / THRESHOLD) * 100) / 100}x threshold if combined)
      </p>

      {/* Stat callout */}
      <div className="border-l-2 pl-3 py-1 mb-4" style={{ borderColor: RISK_COLORS.high }}>
        <div className="text-2xl font-mono font-bold" style={{ color: RISK_COLORS.high }}>
          $17.3B MXN
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
          Total split across 12 contracts to avoid oversight
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="contrato"
            tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
          />
          <YAxis
            domain={[1380, 1520]}
            tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v}M`}
            width={48}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: '#3f3f46', opacity: 0.2 }}
          />
          {/* Supervision threshold */}
          <ReferenceLine
            y={THRESHOLD}
            stroke={RISK_COLORS.critical}
            strokeWidth={2}
            strokeDasharray="8 4"
            label={{
              value: `Supervision threshold: $${THRESHOLD}M`,
              fill: RISK_COLORS.critical,
              fontSize: 10,
              fontFamily: 'var(--font-family-mono)',
              position: 'insideTopRight',
            }}
          />
          <Bar
            dataKey="monto"
            radius={[3, 3, 0, 0]}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={RISK_COLORS.high} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Finding callout */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400 mb-0.5">
          HALLAZGO
        </p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Average contract: $1,439M MXN. Average gap below threshold: $61M (4.1%).
          The uniform clustering below $1,500M is statistically improbable under
          legitimate procurement — consistent with deliberate threshold splitting.
        </p>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-2 font-mono">
        Source: COMPRANET 2023 · RUBLI same-day detection algorithm
      </p>
    </motion.div>
  )
}
