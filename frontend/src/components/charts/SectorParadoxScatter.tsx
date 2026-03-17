/**
 * SectorParadoxScatter — Scatter plot disproving "direct awards = corruption"
 *
 * X: Direct Award %, Y: High-Risk %, bubble size: total value (billions)
 * Demonstrates that Agricultura (93% DA) has only 2% high-risk,
 * while Salud (64% DA) has 12.6% high-risk — concentration matters more.
 */

import { useTranslation } from 'react-i18next'
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

const SECTOR_SCATTER_DATA: SectorPoint[] = [
  { sector: 'otros', directAwardPct: 52.0, highRiskPct: 18.6, avgRisk: 0.1986, totalBillions: 40.9, contracts: 28757, color: '#64748b' },
  { sector: 'salud', directAwardPct: 63.8, highRiskPct: 12.6, avgRisk: 0.1564, totalBillions: 3085.7, contracts: 1103317, color: '#dc2626' },
  { sector: 'defensa', directAwardPct: 56.3, highRiskPct: 15.9, avgRisk: 0.1499, totalBillions: 281.1, contracts: 79505, color: '#1e3a5f' },
  { sector: 'gobernacion', directAwardPct: 60.3, highRiskPct: 12.2, avgRisk: 0.1430, totalBillions: 317.6, contracts: 120029, color: '#be123c' },
  { sector: 'infraestructura', directAwardPct: 31.9, highRiskPct: 8.5, avgRisk: 0.1096, totalBillions: 2446.1, contracts: 326592, color: '#ea580c' },
  { sector: 'tecnologia', directAwardPct: 71.8, highRiskPct: 12.0, avgRisk: 0.1048, totalBillions: 81.9, contracts: 52253, color: '#8b5cf6' },
  { sector: 'energia', directAwardPct: 55.7, highRiskPct: 10.5, avgRisk: 0.0995, totalBillions: 1972.3, contracts: 315967, color: '#eab308' },
  { sector: 'trabajo', directAwardPct: 75.9, highRiskPct: 6.8, avgRisk: 0.0801, totalBillions: 97.5, contracts: 48855, color: '#f97316' },
  { sector: 'hacienda', directAwardPct: 80.0, highRiskPct: 5.3, avgRisk: 0.0601, totalBillions: 619.8, contracts: 151313, color: '#16a34a' },
  { sector: 'educacion', directAwardPct: 78.0, highRiskPct: 4.9, avgRisk: 0.0530, totalBillions: 371.8, contracts: 335853, color: '#3b82f6' },
  { sector: 'ambiente', directAwardPct: 44.4, highRiskPct: 3.1, avgRisk: 0.0318, totalBillions: 291.6, contracts: 92635, color: '#10b981' },
  { sector: 'agricultura', directAwardPct: 93.4, highRiskPct: 2.0, avgRisk: 0.0214, totalBillions: 321.3, contracts: 454931, color: '#22c55e' },
]

// Scale bubble radius: sqrt of billions, clamped to [6, 32]
function bubbleRadius(billions: number): number {
  const maxB = 3085.7
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
    <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-xs space-y-1 min-w-[180px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }} />
        <span className="font-semibold text-text-primary capitalize">{d.sector}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-text-secondary">
        <span className="text-text-muted">Direct Award</span>
        <span className="font-medium">{d.directAwardPct}%</span>
        <span className="text-text-muted">High-Risk</span>
        <span className="font-medium">{d.highRiskPct}%</span>
        <span className="text-text-muted">Avg Risk</span>
        <span className="font-medium">{(d.avgRisk * 100).toFixed(1)}%</span>
        <span className="text-text-muted">Total Value</span>
        <span className="font-medium">{d.totalBillions >= 1000
          ? `${(d.totalBillions / 1000).toFixed(1)}T`
          : `${d.totalBillions.toFixed(0)}B`} MXN</span>
        <span className="text-text-muted">Contracts</span>
        <span className="font-medium">{d.contracts.toLocaleString()}</span>
      </div>
    </div>
  )
}

export function SectorParadoxScatter() {
  const { t } = useTranslation('procurement')

  return (
    <div className="space-y-4">
      {/* Size legend */}
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span className="font-medium">Bubble size = total contract value</span>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#64748b" fillOpacity={0.5} /></svg>
          <span>~40B MXN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="24" height="24"><circle cx="12" cy="12" r="10" fill="#64748b" fillOpacity={0.5} /></svg>
          <span>~3T MXN</span>
        </div>
      </div>

      <div className="relative h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 36, left: 36 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, rgba(255,255,255,0.06))" />
            <XAxis
              type="number"
              dataKey="directAwardPct"
              name="Direct Award %"
              domain={[25, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 10, fill: 'var(--color-text-muted, #71717a)' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              label={{
                value: 'Direct Award Rate (%)',
                position: 'insideBottom',
                offset: -20,
                fontSize: 10,
                fill: 'var(--color-text-muted, #71717a)',
              }}
            />
            <YAxis
              type="number"
              dataKey="highRiskPct"
              name="High-Risk %"
              domain={[0, 22]}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 10, fill: 'var(--color-text-muted, #71717a)' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              label={{
                value: 'High-Risk Rate (%)',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fontSize: 10,
                fill: 'var(--color-text-muted, #71717a)',
              }}
            />
            <RechartsTooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />

            {/* Diagonal reference line: "expected" positive correlation */}
            <ReferenceLine
              segment={[{ x: 25, y: 5 }, { x: 100, y: 20 }]}
              stroke="#f8717166"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              label={{
                value: t('sector_paradox.reference_line_label'),
                position: 'insideTopRight',
                fontSize: 9,
                fill: '#f8717199',
              }}
            />

            <Scatter
              data={SECTOR_SCATTER_DATA}
              shape={<CustomDot />}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Manual annotation overlays — positioned relative to chart container */}
        {/* Agricultura: DA=93.4%, HighRisk=2% → approximately x=89%, y=9% of chart area */}
        <div
          className="absolute pointer-events-none text-[9px] text-risk-low leading-tight max-w-[110px]"
          style={{ right: 28, bottom: 60 }}
          aria-hidden
        >
          {t('sector_paradox.annotation_ag')}
        </div>

        {/* Salud: DA=63.8%, HighRisk=12.6% → upper-left region */}
        <div
          className="absolute pointer-events-none text-[9px] text-risk-critical leading-tight max-w-[110px]"
          style={{ left: 120, top: 55 }}
          aria-hidden
        >
          {t('sector_paradox.annotation_salud')}
        </div>
      </div>

      {/* Callout */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          {t('sector_paradox.callout')}
        </p>
      </div>
    </div>
  )
}
