import { useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { AlertTriangle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn, formatCompactMXN } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContractPoint {
  id: number
  title: string
  amount_mxn: number
  risk_score: number | null
  risk_level: string | null
  procedure_type: string
  institution_name: string
  contract_date: string
}

export interface VendorContractRiskMatrixProps {
  contracts: ContractPoint[]
  vendorName?: string
  className?: string
  onContractClick?: (contractId: number) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RISK_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#eab308',
  low:      '#22c55e',
  unknown:  '#64748b',
}

const HIGH_RISK_THRESHOLD = 0.40 // v0.6.5: high >= 0.40

// Human-readable labels for the legend
const RISK_LEGEND_ENTRIES = [
  { value: 'critical', color: RISK_COLORS.critical },
  { value: 'high',     color: RISK_COLORS.high },
  { value: 'medium',   color: RISK_COLORS.medium },
  { value: 'low',      color: RISK_COLORS.low },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRiskColor(level: string | null): string {
  if (!level) return RISK_COLORS.unknown
  return RISK_COLORS[level] ?? RISK_COLORS.unknown
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

/** Convert a positive amount to log10 scale for the scatter data */
function toLog(amount: number): number {
  return amount > 0 ? Math.log10(amount) : 0
}

/** Format a log10-scale tick back to a human-readable MXN string */
function formatLogTick(logValue: number): string {
  return formatCompactMXN(Math.pow(10, logValue))
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean
  // Recharts passes payload as any — we narrow the type ourselves
  payload?: Array<{ payload: ContractPoint & { logAmount: number } }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const d = payload[0].payload
  const level = d.risk_level ?? 'unknown'
  const color = getRiskColor(d.risk_level)

  return (
    <div className="bg-surface-primary border border-border-subtle rounded-lg p-3 shadow-xl max-w-xs text-xs">
      <p className="font-semibold text-text-primary mb-1 leading-snug">
        {truncate(d.title || 'Untitled Contract', 40)}
      </p>
      <p className="text-text-secondary mb-0.5">{d.institution_name}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-text-muted">Amount:</span>
        <span className="font-medium text-text-primary">{formatCompactMXN(d.amount_mxn)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-text-muted">Risk score:</span>
        <span className="font-medium" style={{ color }}>
          {d.risk_score != null ? `${(d.risk_score * 100).toFixed(1)}%` : '—'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-text-muted">Risk level:</span>
        <span
          className="inline-flex items-center gap-1 font-medium capitalize"
          style={{ color }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          {level}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-text-muted">Procedure:</span>
        <span className="text-text-secondary">{d.procedure_type}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom legend
// ---------------------------------------------------------------------------

function RiskLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
      {RISK_LEGEND_ENTRIES.map(({ value, color }) => (
        <span key={value} className="flex items-center gap-1.5 text-xs text-text-secondary capitalize">
          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {value}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-xs text-text-secondary">
        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-text-muted, #64748b)' }} />
        unknown
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VendorContractRiskMatrix({
  contracts,
  vendorName,
  className,
  onContractClick,
}: VendorContractRiskMatrixProps) {
  // Filter to contracts that have a risk score
  const scoredContracts = useMemo(
    () => contracts.filter((c) => c.risk_score != null && c.amount_mxn > 0),
    [contracts]
  )

  // Pre-compute log-amount and median for reference line
  const { chartData, medianLogAmount } = useMemo(() => {
    if (scoredContracts.length === 0) return { chartData: [], medianLogAmount: 0 }

    const data = scoredContracts.map((c) => ({
      ...c,
      logAmount: toLog(c.amount_mxn),
    }))

    const sorted = [...data].sort((a, b) => a.logAmount - b.logAmount)
    const mid = Math.floor(sorted.length / 2)
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1].logAmount + sorted[mid].logAmount) / 2
        : sorted[mid].logAmount

    return { chartData: data, medianLogAmount: median }
  }, [scoredContracts])

  // X-axis domain in log space
  const xDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) return [3, 12]
    const logAmounts = chartData.map((d) => d.logAmount)
    const min = Math.min(...logAmounts)
    const max = Math.max(...logAmounts)
    // Add 5% padding on each side
    const pad = (max - min) * 0.05 || 0.5
    return [min - pad, max + pad]
  }, [chartData])

  // Generate 5 evenly-spaced tick positions in log space
  const xTicks = useMemo((): number[] => {
    const [lo, hi] = xDomain
    const step = (hi - lo) / 4
    return [0, 1, 2, 3, 4].map((i) => parseFloat((lo + step * i).toFixed(2)))
  }, [xDomain])

  // Y-axis ticks
  const yTicks = [0, 0.1, 0.3, 0.5, 1.0]

  // Empty state — no scored contracts at all
  if (scoredContracts.length === 0) {
    return (
      <div
        className={cn(
          'bg-surface-secondary rounded-lg p-4 flex flex-col items-center justify-center',
          'min-h-[200px]',
          className
        )}
      >
        <AlertTriangle className="text-text-muted mb-2" size={24} />
        <p className="text-sm font-normal text-text-muted text-center max-w-sm">
          No hay puntuaciones de riesgo disponibles para los contratos de este proveedor en el período analizado.
        </p>
      </div>
    )
  }

  const displayName = vendorName || 'Vendor'

  return (
    <div className={cn('bg-surface-secondary rounded-lg p-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            Risk Matrix — {displayName}
          </h3>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-text-muted hover:text-text-secondary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                  aria-label="About this chart"
                >
                  <AlertTriangle size={13} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs p-3 text-xs" side="right">
                <p className="font-semibold mb-1">Risk Matrix</p>
                <p className="text-text-secondary leading-relaxed">
                  Contracts in the red zone are both high-value and high-risk.
                  These represent the highest investigative priority. X axis uses
                  a logarithmic scale.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-xs text-text-muted">
          {scoredContracts.length} contract{scoredContracts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Chart */}
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 24, bottom: 40, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, rgba(255,255,255,0.06))" />

            {/* --- Quadrant background: top-right = "investigate now" --- */}
            <ReferenceArea
              x1={medianLogAmount}
              x2={xDomain[1]}
              y1={HIGH_RISK_THRESHOLD}
              y2={1}
              fill="var(--color-risk-critical, #dc2626)"
              fillOpacity={0.08}
              ifOverflow="extendDomain"
            />

            {/* --- Horizontal reference line: high-risk threshold --- */}
            <ReferenceLine
              y={HIGH_RISK_THRESHOLD}
              stroke="var(--color-risk-high, #ea580c)"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{
                value: 'High Risk',
                position: 'insideBottomLeft',
                fill: 'var(--color-risk-high, #ea580c)',
                fontSize: 10,
                dy: -4,
              }}
            />

            {/* --- Vertical reference line: median amount --- */}
            <ReferenceLine
              x={medianLogAmount}
              stroke="var(--color-text-muted, #64748b)"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{
                value: 'Median',
                position: 'insideBottomRight',
                fill: 'var(--color-text-muted, #64748b)',
                fontSize: 10,
                dy: -4,
              }}
            />

            {/* --- Quadrant label: top-right warning --- */}
            <ReferenceLine
              x={medianLogAmount + (xDomain[1] - medianLogAmount) * 0.5}
              y={0.88}
              stroke="transparent"
              label={{
                value: '⚠ High Value + High Risk',
                position: 'center',
                fill: 'var(--color-risk-critical, #dc2626)',
                fontSize: 9,
                fontWeight: 600,
              }}
            />

            <XAxis
              type="number"
              dataKey="logAmount"
              domain={xDomain}
              ticks={xTicks}
              tickFormatter={formatLogTick}
              tick={{ fill: 'var(--color-text-muted, #94a3b8)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--color-border, #334155)' }}
              tickLine={{ stroke: 'var(--color-border, #334155)' }}
              label={{
                value: 'Contract Amount (MXN)',
                position: 'insideBottom',
                offset: -28,
                fill: 'var(--color-text-muted, #94a3b8)',
                fontSize: 11,
              }}
            />

            <YAxis
              type="number"
              dataKey="risk_score"
              domain={[0, 1]}
              ticks={yTicks}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: 'var(--color-text-muted, #94a3b8)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--color-border, #334155)' }}
              tickLine={{ stroke: 'var(--color-border, #334155)' }}
              width={44}
              label={{
                value: 'Risk Score',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                fill: 'var(--color-text-muted, #94a3b8)',
                fontSize: 11,
              }}
            />

            <RechartsTooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'rgba(148,163,184,0.2)', strokeWidth: 1 }}
            />

            {/* One Scatter series per risk level for legend support */}
            {RISK_LEGEND_ENTRIES.map(({ value, color }) => {
              const points = chartData.filter(
                (d) => (d.risk_level ?? 'unknown') === value
              )
              return (
                <Scatter
                  key={value}
                  name={value.charAt(0).toUpperCase() + value.slice(1)}
                  data={points}
                  fill={color}
                  r={8}
                  cursor={onContractClick ? 'pointer' : 'default'}
                  onClick={
                    onContractClick
                      ? (point: ContractPoint) => onContractClick(point.id)
                      : undefined
                  }
                />
              )
            })}

            {/* Unknown / null risk level */}
            {(() => {
              const unknownPoints = chartData.filter(
                (d) => !d.risk_level || !RISK_COLORS[d.risk_level]
              )
              if (unknownPoints.length === 0) return null
              return (
                <Scatter
                  key="unknown"
                  name="Unknown"
                  data={unknownPoints}
                  fill={RISK_COLORS.unknown}
                  r={8}
                  cursor={onContractClick ? 'pointer' : 'default'}
                  onClick={
                    onContractClick
                      ? (point: ContractPoint) => onContractClick(point.id)
                      : undefined
                  }
                />
              )
            })()}

            <Legend
              content={() => <RiskLegend />}
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: 8 }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default VendorContractRiskMatrix
