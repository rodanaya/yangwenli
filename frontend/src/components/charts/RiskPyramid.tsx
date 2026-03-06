/**
 * RiskPyramid — Side-by-side mirrored bar chart
 *
 * Left pyramid: contract count (narrow at top = critical, wide at bottom = low)
 * Right pyramid: contract value (wide at top = critical holds 41.8% of money)
 */

import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'

interface PyramidRow {
  level: string
  label: string
  pctContracts: number
  pctValue: number
  contracts: number
  billions: number
  color: string
  description: string
}

const PYRAMID_DATA: PyramidRow[] = [
  { level: 'critical', label: 'Critical Risk', pctContracts: 6.1, pctValue: 41.8, contracts: 190083, billions: 4147.04, color: '#ef4444', description: '≥0.50 score' },
  { level: 'high', label: 'High Risk', pctContracts: 2.9, pctValue: 6.1, contracts: 88707, billions: 602.88, color: '#f97316', description: '0.30–0.50 score' },
  { level: 'medium', label: 'Medium Risk', pctContracts: 13.2, pctValue: 13.9, contracts: 408861, billions: 1380.64, color: '#f59e0b', description: '0.10–0.30 score' },
  { level: 'low', label: 'Low Risk', pctContracts: 77.8, pctValue: 38.2, contracts: 2420971, billions: 3797.00, color: '#22c55e', description: '<0.10 score' },
]

// For left chart: negative values so bars grow left
const leftData = PYRAMID_DATA.map(d => ({ ...d, value: -d.pctContracts }))
// For right chart: positive values
const rightData = PYRAMID_DATA.map(d => ({ ...d, value: d.pctValue }))

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: PyramidRow }>
  side: 'left' | 'right'
}

function PyramidTooltip({ active, payload, side }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-surface border border-border rounded-lg p-3 shadow-xl text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
        <span className="font-semibold text-text-primary">{d.label}</span>
        <span className="text-text-muted">{d.description}</span>
      </div>
      {side === 'left' ? (
        <>
          <div className="text-text-secondary">{d.pctContracts}% of all contracts</div>
          <div className="text-text-muted">{formatCount(d.contracts)} contracts</div>
        </>
      ) : (
        <>
          <div className="text-text-secondary">{d.pctValue}% of total value</div>
          <div className="text-text-muted">{d.billions.toLocaleString('en-MX', { maximumFractionDigits: 0 })}B MXN</div>
        </>
      )}
    </div>
  )
}

export function RiskPyramid() {
  const { t } = useTranslation('procurement')

  return (
    <div className="space-y-4">
      {/* Legend row */}
      <div className="flex items-center justify-center gap-6 text-xs text-text-muted">
        {PYRAMID_DATA.map(d => (
          <div key={d.level} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.color }} />
            <span>{d.label}</span>
          </div>
        ))}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_120px_1fr] gap-2 text-center text-xs font-semibold text-text-muted uppercase tracking-wide">
        <div>Contract Count (%)</div>
        <div />
        <div>Contract Value (%)</div>
      </div>

      {/* Side-by-side pyramid charts */}
      <div className="grid grid-cols-[1fr_120px_1fr] gap-2 items-center">
        {/* Left: contract count (bars go left, so domain is [-80, 0]) */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={leftData}
              layout="vertical"
              margin={{ top: 4, right: 0, bottom: 4, left: 0 }}
              barCategoryGap="20%"
            >
              <XAxis
                type="number"
                domain={[-80, 0]}
                tickFormatter={v => `${Math.abs(v)}%`}
                tick={{ fontSize: 10, fill: 'var(--color-text-muted, #71717a)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis type="category" dataKey="label" hide />
              <RechartsTooltip content={<PyramidTooltip side="left" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="value" radius={[2, 0, 0, 2]}>
                {leftData.map(d => (
                  <Cell key={d.level} fill={d.color} fillOpacity={0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Center axis labels */}
        <div className="flex flex-col justify-around h-56 py-2">
          {PYRAMID_DATA.map(d => (
            <div key={d.level} className="flex justify-center">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: d.color }}
              >
                {d.level.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        {/* Right: contract value */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rightData}
              layout="vertical"
              margin={{ top: 4, right: 0, bottom: 4, left: 0 }}
              barCategoryGap="20%"
            >
              <XAxis
                type="number"
                domain={[0, 80]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 10, fill: 'var(--color-text-muted, #71717a)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis type="category" dataKey="label" hide />
              <RechartsTooltip content={<PyramidTooltip side="right" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                {rightData.map(d => (
                  <Cell key={d.level} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats row below chart */}
      <div className="grid grid-cols-4 gap-3">
        {PYRAMID_DATA.map(d => (
          <div key={d.level} className="rounded-lg p-3 bg-surface-elevated border border-border text-center space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: d.color }}>
              {d.label}
            </div>
            <div className="text-base font-bold text-text-primary">{d.pctValue}%</div>
            <div className="text-[10px] text-text-muted">of total value</div>
            <div className="text-[10px] text-text-muted border-t border-border/50 pt-1 mt-1">
              {d.billions.toLocaleString('en-MX', { maximumFractionDigits: 0 })}B MXN
            </div>
          </div>
        ))}
      </div>

      {/* Callout */}
      <div className="rounded-lg border border-risk-critical/30 bg-risk-critical/5 p-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          {t('risk_pyramid.callout')}
        </p>
      </div>
    </div>
  )
}
