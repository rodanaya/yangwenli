/**
 * VendorConcentrationChart — Editorial dark-mode bar chart
 *
 * Shows vendor market concentration by category (% of total spend),
 * color-coded by risk level. Dark zinc-900 aesthetic with monospace
 * axis labels, editorial headline, and OECD context.
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
  Cell,
  ReferenceLine,
} from 'recharts'
import { RISK_COLORS } from '@/lib/constants'

const data = [
  { vendor: 'Farmaceutica (top 3)', share: 8.4, risk: 'critical' as const },
  { vendor: 'Energia (CFE/PEMEX)', share: 6.7, risk: 'high' as const },
  { vendor: 'Construccion (top 5)', share: 5.9, risk: 'high' as const },
  { vendor: 'Alimentacion (SEGALMEX)', share: 4.8, risk: 'critical' as const },
  { vendor: 'Tecnologia (top 4)', share: 3.9, risk: 'high' as const },
  { vendor: 'Logistica (top 3)', share: 3.1, risk: 'medium' as const },
  { vendor: 'Salud (IMSS red)', share: 2.8, risk: 'critical' as const },
  { vendor: 'Otros top 20', share: 11.2, risk: 'medium' as const },
]

const CHART_RISK_COLORS: Record<string, string> = {
  critical: RISK_COLORS.critical,
  high: RISK_COLORS.high,
  medium: RISK_COLORS.medium,
  low: RISK_COLORS.low,
}

interface PayloadEntry {
  payload: { vendor: string; share: number; risk: string }
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const riskLabel = d.risk === 'critical' ? 'Critico' : d.risk === 'high' ? 'Alto' : 'Medio'
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-zinc-100">{d.vendor}</p>
      <p className="text-zinc-400 mt-0.5 font-mono tabular-nums">{d.share}% del gasto total</p>
      <p className="mt-0.5 font-mono" style={{ color: CHART_RISK_COLORS[d.risk] }}>
        Riesgo: {riskLabel}
      </p>
    </div>
  )
}

export function VendorConcentrationChart() {
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
        RUBLI · Market Concentration
      </p>
      {/* Editorial headline — the finding, not the topic */}
      <h3 className="text-base font-bold text-zinc-100 leading-tight mb-0.5">
        Top 20 vendors control 46.8% of federal spending
      </h3>
      <p className="text-xs text-zinc-500 font-mono mb-4">
        Concentration by vendor category · % of total spend · OECD red line: 5%
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 48 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="vendor"
            tick={{ fill: '#71717a', fontSize: 9, fontFamily: 'ui-monospace, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
            angle={-25}
            textAnchor="end"
            height={56}
            interval={0}
          />
          <YAxis
            domain={[0, 14]}
            tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
            width={36}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: '#3f3f46', opacity: 0.2 }}
          />
          {/* OECD 5% concentration threshold */}
          <ReferenceLine
            y={5}
            stroke="#22d3ee"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            label={{
              value: 'OECD: 5% concentration limit',
              fill: '#22d3ee',
              fontSize: 9,
              fontFamily: 'ui-monospace, monospace',
              position: 'insideTopRight',
            }}
          />
          <Bar
            dataKey="share"
            radius={[3, 3, 0, 0]}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={CHART_RISK_COLORS[entry.risk]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Risk legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-800">
        {(['critical', 'high', 'medium'] as const).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: CHART_RISK_COLORS[level] }}
            />
            <span className="text-[10px] font-mono text-zinc-500 capitalize">{level}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-4 h-0 border-t border-dashed" style={{ borderColor: '#22d3ee' }} />
          <span className="text-[10px] font-mono text-zinc-500">OECD benchmark</span>
        </div>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-2 font-mono">
        Source: COMPRANET 2002-2025 · RUBLI v0.6.5 risk model
      </p>
    </motion.div>
  )
}
