/**
 * VendorActivityTab — what the vendor actually did.
 *
 * Risk timeline, contracts table with filters, top institutions, sector
 * breakdown. Excludes model explanations (Evidence) and network/external
 * (Network).
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type {
  ContractListItem,
  VendorDetailResponse,
  VendorInstitutionListResponse,
} from '@/api/types'
import {
  EditorialAreaChart,
  type ChartAnnotation,
} from '@/components/charts/editorial'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import {
  formatCompactMXN,
  formatDate,
  getRiskLevel,
  toTitleCase,
} from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface LifecycleTimelineEntry {
  year: number
  contract_count?: number
  total_value_mxn?: number
  avg_risk_score?: number | null
  avg_risk?: number | null
  high_risk_count?: number
}

interface VendorActivityTabProps {
  vendor: VendorDetailResponse
  contracts?:
    | { data?: ContractListItem[]; pagination?: { total: number; page: number; per_page: number } }
    | null
  contractsLoading?: boolean
  contractsPage: number
  onContractsPageChange: (page: number) => void
  onContractClick?: (contract: ContractListItem) => void
  lifecycle?: { timeline?: LifecycleTimelineEntry[] } | null
  institutions?: VendorInstitutionListResponse | null
}

const CONTRACTS_PER_PAGE = 50

export function VendorActivityTab({
  vendor,
  contracts,
  contractsLoading,
  contractsPage,
  onContractsPageChange,
  onContractClick,
  lifecycle,
  institutions,
}: VendorActivityTabProps) {
  const { i18n } = useTranslation(['vendors'])
  const isEs = i18n.language.startsWith('es')

  const riskTrend = useMemo(() => {
    if (!lifecycle?.timeline?.length) return []
    return lifecycle.timeline
      .filter((y) => y.avg_risk_score != null || y.avg_risk != null)
      .map((y) => ({
        year: y.year,
        avg: (y.avg_risk_score ?? y.avg_risk ?? 0) as number,
      }))
      .sort((a, b) => a.year - b.year)
  }, [lifecycle])

  const minYear = riskTrend[0]?.year ?? vendor.first_contract_year
  const maxYear = riskTrend[riskTrend.length - 1]?.year ?? vendor.last_contract_year

  // Only inject historical annotations that fall within the vendor's active years.
  const annotations: ChartAnnotation[] = []
  if (minYear != null && maxYear != null) {
    const yAt = (year: number) => {
      const point = riskTrend.find((p) => p.year === year)
      return point?.avg ?? 0
    }
    if (2018 >= minYear && 2018 <= maxYear) {
      annotations.push({
        kind: 'point',
        x: 2018,
        y: yAt(2018),
        label: isEs ? 'Cambio admin.' : 'Admin. change',
      })
    }
    if (2020 >= minYear && 2020 <= maxYear) {
      annotations.push({
        kind: 'point',
        x: 2020,
        y: yAt(2020),
        label: 'COVID-19',
      })
    }
  }

  const totalContracts = contracts?.pagination?.total ?? vendor.total_contracts
  const totalPages = Math.max(1, Math.ceil(totalContracts / CONTRACTS_PER_PAGE))

  const institutionRows = institutions?.data ?? []

  return (
    <div className="space-y-8">
      {/* Risk year-over-year */}
      <section aria-labelledby="trend-title">
        <SectionTitle id="trend-title">
          {isEs ? 'Riesgo año tras año' : 'Risk year-over-year'}
        </SectionTitle>
        {riskTrend.length > 1 ? (
          <EditorialAreaChart
            data={riskTrend}
            xKey="year"
            yKey="avg"
            colorToken="risk-critical"
            yFormat="pct"
            yDomain={[0, 1]}
            height={140}
            annotations={annotations}
          />
        ) : (
          <p className="text-sm text-text-muted italic">
            {isEs
              ? 'Insuficiente actividad para un histórico.'
              : 'Insufficient activity for a history view.'}
          </p>
        )}
      </section>

      {/* Top institutions list (no dot strip — list IS the chart) */}
      {institutionRows.length > 0 && (
        <section
          aria-labelledby="inst-title"
          className="pt-6 border-t border-border/40"
        >
          <SectionTitle id="inst-title">
            {isEs ? 'Top instituciones' : 'Top institutions'}
          </SectionTitle>
          <ul className="space-y-2">
            {institutionRows.slice(0, 10).map((inst) => (
              <li
                key={inst.institution_id}
                className="flex items-center justify-between gap-4 px-2 py-1.5 rounded-sm hover:bg-background-elevated/60 transition-colors"
              >
                <Link
                  to={`/institutions/${inst.institution_id}`}
                  className="text-sm text-text-primary hover:text-accent min-w-0 truncate"
                >
                  {toTitleCase(inst.institution_name)}
                </Link>
                <div className="flex items-center gap-4 flex-shrink-0 text-[11px] font-mono tabular-nums text-text-muted">
                  <span>{inst.contract_count}</span>
                  <span className="text-text-primary font-medium">
                    {formatCompactMXN(inst.total_value_mxn)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Contracts table */}
      <section
        aria-labelledby="contracts-title"
        className="pt-6 border-t border-border/40"
      >
        <div className="flex items-center justify-between mb-3">
          <SectionTitle id="contracts-title" className="mb-0">
            {isEs ? 'Contratos' : 'Contracts'}
          </SectionTitle>
          <span className="text-[11px] text-text-muted font-mono tabular-nums">
            {totalContracts.toLocaleString(isEs ? 'es-MX' : 'en-US')}{' '}
            {isEs ? 'total' : 'total'}
          </span>
        </div>
        {contractsLoading ? (
          <div
            className="space-y-2"
            role="status"
            aria-live="polite"
            aria-label={isEs ? 'Cargando contratos' : 'Loading contracts'}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-sm" />
            ))}
          </div>
        ) : contracts?.data && contracts.data.length > 0 ? (
          <>
            <div className="border border-border rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background-elevated text-[10px] uppercase tracking-widest text-text-muted">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">
                      {isEs ? 'Descripción' : 'Description'}
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      {isEs ? 'Institución' : 'Institution'}
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      {isEs ? 'Monto' : 'Amount'}
                    </th>
                    <th className="text-center px-3 py-2 font-semibold">
                      {isEs ? 'Fecha' : 'Date'}
                    </th>
                    <th className="text-center px-3 py-2 font-semibold">
                      {isEs ? 'Riesgo' : 'Risk'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.data.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => onContractClick?.(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onContractClick?.(c)
                        }
                      }}
                      tabIndex={onContractClick ? 0 : -1}
                      role={onContractClick ? 'button' : undefined}
                      aria-label={
                        onContractClick
                          ? `${isEs ? 'Ver detalle del contrato' : 'View contract'}: ${c.title ?? c.id}`
                          : undefined
                      }
                      className="border-t border-border/30 hover:bg-background-elevated/50 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                    >
                      <td className="px-3 py-2 max-w-[280px] truncate text-text-primary">
                        {c.title ?? '—'}
                      </td>
                      <td className="px-3 py-2 max-w-[220px] truncate text-text-secondary">
                        {c.institution_name ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {formatCompactMXN(c.amount_mxn ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-center font-mono tabular-nums text-text-muted">
                        {c.contract_date ? formatDate(c.contract_date) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {c.risk_score != null && (
                          <RiskLevelPill level={getRiskLevel(c.risk_score)} score={c.risk_score} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3 text-xs text-text-muted">
                <span className="font-mono tabular-nums">
                  {isEs ? 'Página' : 'Page'} {contractsPage} / {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={contractsPage <= 1}
                    onClick={() => onContractsPageChange(contractsPage - 1)}
                    aria-label={isEs ? 'Página anterior' : 'Previous page'}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={contractsPage >= totalPages}
                    onClick={() => onContractsPageChange(contractsPage + 1)}
                    aria-label={isEs ? 'Página siguiente' : 'Next page'}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-text-muted italic">
            {isEs ? 'Sin contratos.' : 'No contracts.'}
          </p>
        )}
      </section>
    </div>
  )
}

function SectionTitle({
  id,
  children,
  className,
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      id={id}
      className={`text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3 ${className ?? ''}`}
    >
      {children}
    </h2>
  )
}
