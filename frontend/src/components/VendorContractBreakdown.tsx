import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { cn, formatCompactMXN } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface ContractData {
  procedure_type: string | null
  risk_level: string | null
  amount_mxn: number
  is_single_bid?: boolean
}

interface VendorContractBreakdownProps {
  contracts: ContractData[]
  loading?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const PROCEDURE_COLORS: Record<string, string> = {
  'Direct Award': '#f97316',
  'Open Tender': '#22c55e',
  'Restricted': '#eab308',
}

const RISK_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#22c55e',
}

const RISK_ORDER = ['critical', 'high', 'medium', 'low']

// ============================================================================
// Helpers
// ============================================================================

function classifyProcedureType(raw: string | null): string {
  if (!raw) return 'Restricted'
  const upper = raw.toUpperCase()
  if (upper.includes('ADJUDICACION') || upper.includes('DIRECTA')) return 'Direct Award'
  if (
    upper.includes('LICITACION') ||
    upper.includes('ABIERTA') ||
    upper.includes('PUBLICA')
  ) return 'Open Tender'
  return 'Restricted'
}

// ============================================================================
// Skeleton
// ============================================================================

function BreakdownSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="h-3 w-28 rounded bg-surface-muted/50 animate-pulse" />
        <div className="h-40 w-40 rounded-full bg-surface-muted/50 animate-pulse" />
      </div>
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="h-3 w-28 rounded bg-surface-muted/50 animate-pulse" />
        <div className="h-40 w-40 rounded-full bg-surface-muted/50 animate-pulse" />
      </div>
    </div>
  )
}

// ============================================================================
// Custom legend renderer — compact, dark-theme aware
// ============================================================================

interface LegendEntry {
  value: string
  color: string
  payload?: { value: number; percent?: number }
}

function CustomLegend({ payload }: { payload?: LegendEntry[] }) {
  if (!payload) return null
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
      {payload.map((entry) => {
        const pct =
          entry.payload?.percent != null
            ? `${(entry.payload.percent * 100).toFixed(0)}%`
            : ''
        return (
          <li key={entry.value} className="flex items-center gap-1 text-xs text-text-muted">
            <span
              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span>{entry.value}</span>
            {pct && <span className="text-text-muted/60">{pct}</span>}
          </li>
        )
      })}
    </ul>
  )
}

// ============================================================================
// Stat box
// ============================================================================

interface StatBoxProps {
  label: string
  value: string
}

function StatBox({ label, value }: StatBoxProps) {
  return (
    <div className="bg-surface-tertiary rounded p-2 flex flex-col items-center min-w-0">
      <span className="text-[10px] uppercase tracking-wider text-text-muted truncate w-full text-center">
        {label}
      </span>
      <span className="text-sm font-mono font-semibold text-text-primary mt-0.5 truncate w-full text-center">
        {value}
      </span>
    </div>
  )
}

// ============================================================================
// Main component
// ============================================================================

export function VendorContractBreakdown({
  contracts,
  loading = false,
  className,
}: VendorContractBreakdownProps) {
  // --- Procedure type aggregation ---
  const procedureData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of contracts) {
      const label = classifyProcedureType(c.procedure_type)
      counts[label] = (counts[label] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [contracts])

  // --- Risk level aggregation (ordered) ---
  const riskData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of contracts) {
      const lvl = c.risk_level?.toLowerCase() ?? 'low'
      counts[lvl] = (counts[lvl] ?? 0) + 1
    }
    return RISK_ORDER.filter((lvl) => counts[lvl] > 0).map((lvl) => ({
      name: lvl.charAt(0).toUpperCase() + lvl.slice(1),
      value: counts[lvl],
    }))
  }, [contracts])

  // --- Key stats ---
  const stats = useMemo(() => {
    const total = contracts.length
    if (total === 0) {
      return {
        totalValue: '—',
        totalContracts: '0',
        avgRisk: '—',
        directAwardPct: '—',
        singleBidPct: '—',
        hasSingleBid: false,
      }
    }

    const totalValue = contracts.reduce((sum, c) => sum + (c.amount_mxn ?? 0), 0)

    // Average risk: convert risk_level to a representative score midpoint
    const riskMidpoints: Record<string, number> = {
      critical: 0.75,
      high: 0.40,
      medium: 0.20,
      low: 0.05,
    }
    const riskScores = contracts
      .map((c) => riskMidpoints[c.risk_level?.toLowerCase() ?? 'low'] ?? 0.05)
    const avgRisk = riskScores.reduce((s, v) => s + v, 0) / riskScores.length

    const directAwardCount = contracts.filter(
      (c) => classifyProcedureType(c.procedure_type) === 'Direct Award'
    ).length

    const hasSingleBid = contracts.some((c) => c.is_single_bid !== undefined)
    const singleBidCount = contracts.filter((c) => c.is_single_bid === true).length

    return {
      totalValue: formatCompactMXN(totalValue),
      totalContracts: total.toLocaleString(),
      avgRisk: `${(avgRisk * 100).toFixed(1)}%`,
      directAwardPct: `${((directAwardCount / total) * 100).toFixed(0)}%`,
      singleBidPct: hasSingleBid
        ? `${((singleBidCount / total) * 100).toFixed(0)}%`
        : '—',
      hasSingleBid,
    }
  }, [contracts])

  const tooltipStyle = {
    backgroundColor: 'var(--color-background-card, #1e293b)',
    border: '1px solid var(--color-border, rgba(255,255,255,0.1))',
    borderRadius: '6px',
    fontSize: '12px',
    color: 'var(--color-text-primary, #e2e8f0)',
  }

  return (
    <div
      className={cn(
        'bg-surface-secondary rounded-lg p-4 flex flex-col gap-4',
        className
      )}
      aria-label="Vendor contract breakdown"
    >
      {/* Charts row */}
      {loading ? (
        <BreakdownSkeleton />
      ) : (
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Left: Procedure Type donut */}
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-wider text-text-muted mb-1">
              Procedure Type
            </span>
            {procedureData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-text-muted">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie
                    data={procedureData}
                    cx="50%"
                    cy="45%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    aria-label="Procedure type distribution"
                  >
                    {procedureData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PROCEDURE_COLORS[entry.name] ?? '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: any) => [
                      `${Number(value).toLocaleString()} contracts`,
                      name,
                    ]}
                  />
                  <Legend
                    content={({ payload }) =>
                      CustomLegend({
                        payload: payload?.map((p) => ({
                          value: p.value as string,
                          color: p.color as string,
                          payload: p.payload as { value: number; percent?: number },
                        })),
                      })
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Right: Risk Distribution donut */}
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-wider text-text-muted mb-1">
              Risk Distribution
            </span>
            {riskData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-text-muted">
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie
                    data={riskData}
                    cx="50%"
                    cy="45%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    aria-label="Risk level distribution"
                  >
                    {riskData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={RISK_COLORS[entry.name.toLowerCase()] ?? '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: any) => [
                      `${Number(value).toLocaleString()} contracts`,
                      name,
                    ]}
                  />
                  <Legend
                    content={({ payload }) =>
                      CustomLegend({
                        payload: payload?.map((p) => ({
                          value: p.value as string,
                          color: p.color as string,
                          payload: p.payload as { value: number; percent?: number },
                        })),
                      })
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div
        className={cn(
          'grid gap-2',
          stats.hasSingleBid ? 'grid-cols-5' : 'grid-cols-4'
        )}
        role="list"
        aria-label="Contract summary statistics"
      >
        <StatBox label="Total Value" value={stats.totalValue} />
        <StatBox label="Contracts" value={stats.totalContracts} />
        <StatBox label="Avg Risk" value={stats.avgRisk} />
        <StatBox label="Direct Award" value={stats.directAwardPct} />
        {stats.hasSingleBid && (
          <StatBox label="Single Bid" value={stats.singleBidPct} />
        )}
      </div>
    </div>
  )
}

export default VendorContractBreakdown
