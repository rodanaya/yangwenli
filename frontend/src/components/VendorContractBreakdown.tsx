import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DotStrip } from '@/components/charts/DotStrip'
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

// Procedure colors — bible-aligned: direct award maps to risk-high (amber);
// open tender to neutral text-muted (procedurally healthy = no signal);
// restricted to risk-medium (mid concern).
const PROCEDURE_COLORS: Record<string, string> = {
  'Direct Award': 'var(--color-risk-high)',
  'Open Tender': 'var(--color-text-muted)',
  'Restricted': 'var(--color-risk-medium)',
}

// Risk colors — bible §2 canonical (no green for low; zinc instead).
const RISK_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high: 'var(--color-risk-high)',
  medium: 'var(--color-risk-medium)',
  low: 'var(--color-risk-low)',
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
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'

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
              <div className="h-44 flex flex-col items-center justify-center px-4 text-center">
                <p className="text-xs text-text-muted">
                  {lang === 'en' ? 'No procedure type records.' : 'Sin registros de tipo de procedimiento.'}
                </p>
                <p className="text-[10px] text-text-muted mt-1">
                  {lang === 'en'
                    ? 'Field missing in COMPRANET for this vendor.'
                    : 'Dato faltante en COMPRANET para este proveedor.'}
                </p>
              </div>
            ) : (
              <DotStrip
                data={procedureData.map((d) => ({
                  label: d.name,
                  value: d.value,
                  color: PROCEDURE_COLORS[d.name] ?? 'var(--color-text-muted)',
                  valueLabel: `${d.value.toLocaleString()} (${(
                    (d.value / procedureData.reduce((s, x) => s + x.value, 0)) *
                    100
                  ).toFixed(0)}%)`,
                }))}
                dots={40}
                labelW={100}
              />
            )}
          </div>

          {/* Right: Risk Distribution */}
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[11px] uppercase tracking-wider text-text-muted mb-1">
              Risk Distribution
            </span>
            {riskData.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center px-4 text-center">
                <p className="text-xs text-text-muted">
                  {lang === 'en' ? 'No v0.6.5 risk scores.' : 'Sin puntuaciones de riesgo v0.6.5.'}
                </p>
                <p className="text-[10px] text-text-muted mt-1">
                  {lang === 'en'
                    ? 'Contracts missing z-score features in the current model.'
                    : 'Contratos sin features z-score en el modelo actual.'}
                </p>
              </div>
            ) : (
              <DotStrip
                data={riskData.map((d) => ({
                  label: d.name,
                  value: d.value,
                  color: RISK_COLORS[d.name.toLowerCase()] ?? 'var(--color-text-muted)',
                  valueLabel: `${d.value.toLocaleString()} (${(
                    (d.value / riskData.reduce((s, x) => s + x.value, 0)) *
                    100
                  ).toFixed(0)}%)`,
                }))}
                dots={40}
                labelW={100}
              />
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
