import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { cn, formatCompactMXN } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContractPoint {
  id: number
  title: string
  amount_mxn: number
  contract_date: string
  year: number
  procedure_type: string
  institution_name: string
  risk_score: number | null
  risk_level: string | null
}

export interface VendorContractTimelineProps {
  contracts: ContractPoint[]
  vendorName: string
  className?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_COLOR_MAP: Record<string, string> = {
  critical: RISK_COLORS.critical,
  high: RISK_COLORS.high,
  medium: RISK_COLORS.medium,
  low: RISK_COLORS.low,
}
const UNKNOWN_COLOR = '#64748b'

function getRiskColor(level: string | null): string {
  if (!level) return UNKNOWN_COLOR
  return RISK_COLOR_MAP[level] ?? UNKNOWN_COLOR
}

/**
 * Deterministic per-contract Y jitter so overlapping dots spread vertically.
 * Uses the contract id to keep it stable across renders.
 */
function jitter(id: number): number {
  // Produces a value in roughly [-0.35, +0.35]
  return ((id * 2654435761) % 100) / 100 - 0.5
}

/** Scatter dot size: proportional to log10(amount), floored at 1 */
function dotSize(amount: number): number {
  return Math.log10(Math.max(amount, 1)) * 15
}

// ─── Scandal reference lines ──────────────────────────────────────────────────

const SCANDAL_LINES: Array<{ year: number; label: string; color: string }> = [
  { year: 2013, label: 'Estafa Maestra', color: '#f97316' },
  { year: 2020, label: 'COVID Procurement', color: '#dc2626' },
]

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  payload: ContractPoint & { y: number; z: number }
}

function ContractTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const title = d.title?.length > 40 ? d.title.slice(0, 40) + '…' : (d.title ?? '—')
  const riskDisplay = d.risk_score != null ? `${(d.risk_score * 100).toFixed(1)}%` : '—'
  const color = getRiskColor(d.risk_level)

  return (
    <div className="rounded-md border border-white/10 bg-background-card p-3 text-xs shadow-lg max-w-xs">
      <p className="font-semibold text-text-primary mb-1 leading-snug">{title}</p>
      <div className="space-y-0.5 text-text-muted">
        <p>
          <span className="text-text-secondary">Amount: </span>
          {formatCompactMXN(d.amount_mxn)}
        </p>
        <p>
          <span className="text-text-secondary">Procedure: </span>
          {d.procedure_type || '—'}
        </p>
        <p>
          <span className="text-text-secondary">Institution: </span>
          {d.institution_name?.length > 35
            ? d.institution_name.slice(0, 35) + '…'
            : (d.institution_name || '—')}
        </p>
        <p>
          <span className="text-text-secondary">Risk score: </span>
          <span style={{ color }}>{riskDisplay}</span>
        </p>
      </div>
    </div>
  )
}

// ─── Legend row ───────────────────────────────────────────────────────────────

const LEGEND_ITEMS: Array<{ key: string; label: string }> = [
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
]

function RiskLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
      {LEGEND_ITEMS.map(({ key, label }) => (
        <span key={key} className="flex items-center gap-1">
          <span
            className="inline-block rounded-full w-2.5 h-2.5 flex-shrink-0"
            style={{ backgroundColor: RISK_COLOR_MAP[key] }}
            aria-hidden="true"
          />
          {label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span
          className="inline-block rounded-full w-2.5 h-2.5 flex-shrink-0"
          style={{ backgroundColor: UNKNOWN_COLOR }}
          aria-hidden="true"
        />
        Unknown
      </span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VendorContractTimeline({
  contracts,
  vendorName,
  className,
}: VendorContractTimelineProps) {
  // Group contracts by year for X-axis domain + bar chart
  const yearGroups = useMemo(() => {
    const groups: Record<number, ContractPoint[]> = {}
    contracts.forEach(c => {
      const y = c.year || new Date(c.contract_date).getFullYear()
      if (!groups[y]) groups[y] = []
      groups[y].push(c)
    })
    return groups
  }, [contracts])

  const years = useMemo(
    () => Object.keys(yearGroups).map(Number).sort((a, b) => a - b),
    [yearGroups],
  )

  // Scatter data: one point per contract with jittered Y
  const scatterData = useMemo(
    () =>
      contracts.map(c => ({
        ...c,
        x: c.year || new Date(c.contract_date).getFullYear(),
        y: jitter(c.id),
        z: dotSize(c.amount_mxn),
      })),
    [contracts],
  )

  // Bar chart data: count per year
  const barData = useMemo(
    () => years.map(y => ({ year: y, count: yearGroups[y].length })),
    [years, yearGroups],
  )

  const xDomain: [number, number] = years.length
    ? [years[0], years[years.length - 1]]
    : [2002, 2025]

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (contracts.length === 0) {
    return (
      <div
        className={cn(
          'bg-surface-secondary rounded-lg p-4 flex items-center justify-center',
          'border-2 border-dashed border-white/10',
          'min-h-[220px]',
          className,
        )}
        role="status"
        aria-label="No contract data available"
      >
        <p className="text-sm text-text-muted">No contract data available</p>
      </div>
    )
  }

  return (
    <div
      className={cn('bg-surface-secondary rounded-lg p-4 space-y-3', className)}
      role="region"
      aria-label={`Contract timeline for ${vendorName}`}
    >
      {/* Title */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-text-primary leading-tight">
          Contract Timeline &mdash;{' '}
          <span className="text-text-secondary">{vendorName}</span>
        </h3>
        <RiskLegend />
      </div>

      {/* Scatter chart */}
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={160}>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            {/* Scandal reference lines */}
            {SCANDAL_LINES.map(({ year, label, color }) => (
              <ReferenceLine
                key={year}
                x={year}
                stroke={color}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: label,
                  position: 'top',
                  fill: color,
                  fontSize: 9,
                  fontWeight: 500,
                }}
              />
            ))}

            <XAxis
              dataKey="x"
              type="number"
              domain={xDomain}
              ticks={years}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={v => String(v)}
            />

            {/* Y axis hidden — only used for jitter spacing */}
            <YAxis
              dataKey="y"
              type="number"
              domain={[-0.6, 0.6]}
              hide
            />

            {/* Z axis controls rendered dot size */}
            <ZAxis dataKey="z" type="number" range={[20, 400]} />

            <Tooltip
              content={<ContractTooltip />}
              cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
            />

            <Scatter
              data={scatterData}
              isAnimationActive={false}
              shape={(props: {
                cx?: number
                cy?: number
                payload?: ContractPoint & { z: number }
              }) => {
                const { cx = 0, cy = 0, payload } = props
                if (!payload) return <circle cx={cx} cy={cy} r={0} />
                const r = Math.sqrt(payload.z / Math.PI)
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={Math.max(r, 3)}
                    fill={getRiskColor(payload.risk_level)}
                    fillOpacity={0.75}
                    stroke={getRiskColor(payload.risk_level)}
                    strokeOpacity={0.9}
                    strokeWidth={0.5}
                  />
                )
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Divider + label */}
      <p className="text-[10px] uppercase tracking-widest text-text-muted px-1">
        Contracts per year
      </p>

      {/* Dot-matrix — contract count per year */}
      <YearCountDotMatrix barData={barData} />
    </div>
  )
}

// ─── Year count dot-matrix ────────────────────────────────────────────────────

const YC_ROWS = 20
const YC_DOT_R = 2.2
const YC_DOT_GAP = 5.2
const YC_COL_W = 18
const YC_TOP_PAD = 4
const YC_BOTTOM_PAD = 16
const YC_LEFT_PAD = 4

function YearCountDotMatrix({ barData }: { barData: Array<{ year: number; count: number }> }) {
  if (!barData.length) return null

  const maxCount = Math.max(...barData.map(d => d.count), 1)
  const chartW = YC_LEFT_PAD + barData.length * YC_COL_W + YC_LEFT_PAD
  const chartH = YC_TOP_PAD + YC_ROWS * YC_DOT_GAP + YC_BOTTOM_PAD

  return (
    <div aria-hidden="true">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {barData.map((item, colIdx) => {
          const filled = Math.max(1, Math.round((item.count / maxCount) * YC_ROWS))
          const xCenter = YC_LEFT_PAD + colIdx * YC_COL_W + YC_COL_W / 2

          // Show year label every ~3 columns to reduce clutter when many years
          const showLabel =
            barData.length <= 8 ||
            colIdx === 0 ||
            colIdx === barData.length - 1 ||
            colIdx % Math.ceil(barData.length / 6) === 0

          return (
            <g key={item.year}>
              {Array.from({ length: YC_ROWS }).map((_, i) => {
                const dotY = YC_TOP_PAD + (YC_ROWS - 1 - i) * YC_DOT_GAP
                const isFilled = i < filled
                return (
                  <motion.circle
                    key={i}
                    cx={xCenter}
                    cy={dotY}
                    r={YC_DOT_R}
                    fill={isFilled ? '#3b82f6' : '#18181b'}
                    stroke={isFilled ? 'none' : '#27272a'}
                    strokeWidth={0.4}
                    fillOpacity={isFilled ? 0.7 : 1}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: colIdx * 0.02 + (filled - i) * 0.004 }}
                  />
                )
              })}
              {showLabel && (
                <text
                  x={xCenter}
                  y={YC_TOP_PAD + YC_ROWS * YC_DOT_GAP + 10}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  {String(item.year).slice(2)}
                </text>
              )}
              <title>{item.year}: {item.count} contracts</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
