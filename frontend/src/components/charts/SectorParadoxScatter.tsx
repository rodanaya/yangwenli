/**
 * SectorParadoxScatter — Scatter plot: Direct Award % vs High-Risk %
 *
 * X: Direct Award %, Y: High-Risk %, bubble size: total value (billions)
 * v6.5 live data (Apr 2026): Agricultura (93% DA) is now 29.73% high-risk
 * (Segalmex dominates GT training data). Salud (64% DA) = 12.01% but largest
 * absolute value at risk (MX$369B). DA rate alone does NOT predict risk level.
 */

import { useTranslation } from 'react-i18next'
import { getLocale } from '@/lib/utils'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface SectorPoint {
  sector: string
  directAwardPct: number
  highRiskPct: number
  avgRisk: number
  totalBillions: number
  contracts: number
  color: string
}

// Live data from DuckDB queries — Apr 2026 (v6.5 risk model)
const SECTOR_SCATTER_DATA: SectorPoint[] = [
  { sector: 'agricultura', directAwardPct: 93.4, highRiskPct: 29.73, avgRisk: 0.3693, totalBillions: 317.6, contracts: 447708, color: '#22c55e' },
  { sector: 'trabajo', directAwardPct: 75.8, highRiskPct: 24.74, avgRisk: 0.3122, totalBillions: 97.1, contracts: 48134, color: '#f97316' },
  { sector: 'defensa', directAwardPct: 56.1, highRiskPct: 14.46, avgRisk: 0.2336, totalBillions: 280.5, contracts: 78974, color: '#1e3a5f' },
  { sector: 'energia', directAwardPct: 55.6, highRiskPct: 13.49, avgRisk: 0.2598, totalBillions: 1957.9, contracts: 312931, color: '#eab308' },
  { sector: 'otros', directAwardPct: 51.8, highRiskPct: 16.50, avgRisk: 0.2839, totalBillions: 41.0, contracts: 28502, color: '#64748b' },
  { sector: 'salud', directAwardPct: 63.7, highRiskPct: 12.01, avgRisk: 0.2794, totalBillions: 3070.3, contracts: 1085497, color: '#dc2626' },
  { sector: 'tecnologia', directAwardPct: 71.7, highRiskPct: 11.41, avgRisk: 0.2765, totalBillions: 81.7, contracts: 51977, color: '#8b5cf6' },
  { sector: 'hacienda', directAwardPct: 78.5, highRiskPct: 8.98, avgRisk: 0.2195, totalBillions: 618.9, contracts: 138156, color: '#16a34a' },
  { sector: 'infraestructura', directAwardPct: 31.3, highRiskPct: 8.72, avgRisk: 0.2459, totalBillions: 2438.9, contracts: 321626, color: '#ea580c' },
  { sector: 'ambiente', directAwardPct: 44.3, highRiskPct: 8.29, avgRisk: 0.2513, totalBillions: 290.6, contracts: 91954, color: '#10b981' },
  { sector: 'gobernacion', directAwardPct: 60.1, highRiskPct: 7.98, avgRisk: 0.2431, totalBillions: 316.6, contracts: 118907, color: '#be123c' },
  { sector: 'educacion', directAwardPct: 78.0, highRiskPct: 4.64, avgRisk: 0.2052, totalBillions: 371.0, contracts: 333920, color: '#3b82f6' },
]

// Scale bubble radius: sqrt of billions, clamped to [6, 32]
function bubbleRadius(billions: number): number {
  const maxB = 3070.3
  const r = 6 + 26 * Math.sqrt(billions / maxB)
  return Math.max(6, Math.min(32, r))
}

interface CustomDotProps {
  cx?: number
  cy?: number
  payload?: SectorPoint
}

function CustomDot({ cx = 0, cy = 0, payload }: CustomDotProps) {
  if (!payload) return null
  const r = bubbleRadius(payload.totalBillions)
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={payload.color}
        fillOpacity={0.65}
        stroke={payload.color}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy + r + 11}
        textAnchor="middle"
        fontSize={9}
        fill={payload.color}
        fontWeight="600"
      >
        {payload.sector.slice(0, 6)}
      </text>
    </g>
  )
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: SectorPoint }>
}

function ScatterTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      className="rounded-lg p-3 shadow-2xl text-xs space-y-1 min-w-[180px]"
      style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }} />
        <span className="font-semibold text-zinc-100 capitalize">{d.sector}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-zinc-400">
        <span className="text-zinc-500">Direct Award</span>
        <span className="font-medium font-mono text-zinc-300">{d.directAwardPct}%</span>
        <span className="text-zinc-500">High-Risk</span>
        <span className="font-medium font-mono text-zinc-300">{d.highRiskPct}%</span>
        <span className="text-zinc-500">Avg Risk</span>
        <span className="font-medium font-mono text-zinc-300">{(d.avgRisk * 100).toFixed(1)}%</span>
        <span className="text-zinc-500">Total Value</span>
        <span className="font-medium font-mono text-zinc-300">{d.totalBillions >= 1000
          ? `${(d.totalBillions / 1000).toFixed(1)}T`
          : `${d.totalBillions.toFixed(0)}B`} MXN</span>
        <span className="text-zinc-500">Contracts</span>
        <span className="font-medium font-mono text-zinc-300">{d.contracts.toLocaleString(getLocale())}</span>
      </div>
    </div>
  )
}

export function SectorParadoxScatter() {
  const { t } = useTranslation('procurement')

  return (
    <div className="space-y-4">
      {/* Size legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
        <span className="font-medium">Bubble size = total contract value</span>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#71717a" fillOpacity={0.4} /></svg>
          <span>~40B MXN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="24" height="24"><circle cx="12" cy="12" r="10" fill="#71717a" fillOpacity={0.4} /></svg>
          <span>~3T MXN</span>
        </div>
      </div>

      <div className="relative h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 36, left: 36 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis
              type="number"
              dataKey="directAwardPct"
              name="Direct Award %"
              domain={[25, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 10, fill: '#71717a', fontFamily: "ui-monospace, 'SF Mono', monospace" }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
              label={{
                value: 'Direct Award Rate (%)',
                position: 'insideBottom',
                offset: -20,
                fontSize: 10,
                fill: '#71717a',
              }}
            />
            <YAxis
              type="number"
              dataKey="highRiskPct"
              name="High-Risk %"
              domain={[0, 35]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 10, fill: '#71717a', fontFamily: "ui-monospace, 'SF Mono', monospace" }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
              label={{
                value: 'High-Risk Rate (%)',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fontSize: 10,
                fill: '#71717a',
              }}
            />
            <RechartsTooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#52525b' }} />

            {/* Diagonal reference line: "expected" positive correlation */}
            <ReferenceLine
              segment={[{ x: 25, y: 5 }, { x: 100, y: 20 }]}
              stroke="#f8717144"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              label={{
                value: t('sector_paradox.reference_line_label'),
                position: 'insideTopRight',
                fontSize: 9,
                fill: '#f8717177',
              }}
            />

            <Scatter
              data={SECTOR_SCATTER_DATA}
              shape={<CustomDot />}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Manual annotation overlays — positioned relative to chart container */}
        <div
          className="absolute pointer-events-none text-[9px] leading-tight max-w-[110px]"
          style={{ right: 28, bottom: 60, color: '#4ade80' }}
          aria-hidden
        >
          {t('sector_paradox.annotation_ag')}
        </div>

        <div
          className="absolute pointer-events-none text-[9px] leading-tight max-w-[110px]"
          style={{ left: 120, top: 55, color: '#f87171' }}
          aria-hidden
        >
          {t('sector_paradox.annotation_salud')}
        </div>
      </div>

      {/* Callout — editorial finding box */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200 leading-relaxed">
          {t('sector_paradox.callout')}
        </p>
      </div>
    </div>
  )
}
