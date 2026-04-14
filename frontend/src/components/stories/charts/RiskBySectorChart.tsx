/**
 * RiskBySectorChart — Editorial horizontal bar chart
 *
 * Shows high-risk contract percentage by sector, sorted descending.
 * Each bar uses the canonical SECTOR_COLORS. An OECD average reference
 * line provides international context. Dark zinc-900 aesthetic.
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
import { SECTOR_COLORS } from '@/lib/constants'

const rawData = [
  { sector: 'Agricultura', code: 'agricultura', high_pct: 19.4 },
  { sector: 'Energia', code: 'energia', high_pct: 16.8 },
  { sector: 'Salud', code: 'salud', high_pct: 14.2 },
  { sector: 'Infraestructura', code: 'infraestructura', high_pct: 13.7 },
  { sector: 'Gobernacion', code: 'gobernacion', high_pct: 12.1 },
  { sector: 'Tecnologia', code: 'tecnologia', high_pct: 11.3 },
  { sector: 'Hacienda', code: 'hacienda', high_pct: 9.8 },
  { sector: 'Educacion', code: 'educacion', high_pct: 8.4 },
  { sector: 'Defensa', code: 'defensa', high_pct: 7.2 },
  { sector: 'Ambiente', code: 'ambiente', high_pct: 6.9 },
  { sector: 'Trabajo', code: 'trabajo', high_pct: 6.1 },
  { sector: 'Otros', code: 'otros', high_pct: 5.3 },
].reverse() // ascending so highest is at top in horizontal layout

const OECD_AVG = 9.0

interface PayloadEntry {
  payload: { sector: string; code: string; high_pct: number }
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: PayloadEntry[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const delta = d.high_pct - OECD_AVG
  const aboveBelow = delta > 0 ? 'above' : 'below'
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-1.5 mb-1">
        <div
          className="w-2 h-2 rounded-sm"
          style={{ backgroundColor: SECTOR_COLORS[d.code] || '#64748b' }}
        />
        <span className="font-semibold text-zinc-100">{d.sector}</span>
      </div>
      <p className="text-zinc-400 font-mono tabular-nums">
        {d.high_pct}% high-risk contracts
      </p>
      <p className="text-zinc-500 font-mono mt-0.5">
        {Math.abs(delta).toFixed(1)}pp {aboveBelow} national avg
      </p>
    </div>
  )
}

export function RiskBySectorChart() {
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
        RUBLI · Sector Risk Distribution
      </p>
      {/* Finding headline */}
      <h3 className="text-base font-bold text-zinc-100 leading-tight mb-0.5">
        Agriculture and Energy lead with 2x the national risk average
      </h3>
      <p className="text-xs text-zinc-500 font-mono mb-4">
        % of contracts rated critical + high · National avg: {OECD_AVG}%
      </p>

      <ResponsiveContainer width="100%" height={360}>
        <BarChart
          data={rawData}
          layout="vertical"
          margin={{ top: 4, right: 32, left: 4, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            type="number"
            domain={[0, 25]}
            tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#3f3f46' }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="sector"
            width={100}
            tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: '#3f3f46', opacity: 0.15 }}
          />
          {/* National average reference line */}
          <ReferenceLine
            x={OECD_AVG}
            stroke="#22d3ee"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            label={{
              value: `Avg: ${OECD_AVG}%`,
              fill: '#22d3ee',
              fontSize: 10,
              fontFamily: 'ui-monospace, monospace',
              position: 'top',
            }}
          />
          <Bar
            dataKey="high_pct"
            radius={[0, 3, 3, 0]}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {rawData.map((entry, index) => (
              <Cell
                key={index}
                fill={SECTOR_COLORS[entry.code] || '#64748b'}
                fillOpacity={entry.high_pct > OECD_AVG ? 0.9 : 0.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Context note */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
        <div className="w-4 h-0 border-t border-dashed" style={{ borderColor: '#22d3ee' }} />
        <span className="text-[10px] font-mono text-zinc-500">
          National average (OECD HR benchmark: 2-15%)
        </span>
      </div>

      {/* Source */}
      <p className="text-[10px] text-zinc-600 mt-2 font-mono">
        Source: COMPRANET 2002-2025 · RUBLI v0.6.5 · Sectors above avg shown at full opacity
      </p>
    </motion.div>
  )
}
