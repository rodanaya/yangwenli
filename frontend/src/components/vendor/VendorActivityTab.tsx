/**
 * VendorActivityTab — what the vendor actually did.
 *
 * Risk timeline, contracts table with filters, top institutions, sector
 * breakdown. Excludes model explanations (Evidence) and network/external
 * (Network).
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
} from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { ADMINISTRATIONS } from '@/lib/administrations'
import { getRiskLevelFromScore } from '@/lib/constants'

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

  // §6 Cronología: peak year derived from lifecycle value data
  const peakYear = useMemo(() => {
    if (!lifecycle?.timeline?.length) return null
    return lifecycle.timeline.reduce(
      (best, y) => (!best || (y.total_value_mxn ?? 0) > (best.total_value_mxn ?? 0) ? y : best),
      null as LifecycleTimelineEntry | null
    )?.year ?? null
  }, [lifecycle])

  // Which administrations overlap with the vendor's active years
  const overlappingAdmins = useMemo(() => {
    const first = vendor.first_contract_year
    const last = vendor.last_contract_year
    if (!first) return []
    return ADMINISTRATIONS.filter(
      (a) => a.yearEnd >= first && a.yearStart <= (last ?? new Date().getFullYear())
    )
  }, [vendor.first_contract_year, vendor.last_contract_year])

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

      {/* § 6 La Cronología — birth → peak → death timeline */}
      {vendor.first_contract_year != null && (
        <section
          aria-labelledby="cronologia-title"
          className="pt-6 border-t border-border/40"
        >
          <SectionTitle id="cronologia-title">
            {isEs ? '§ 6 · La Cronología' : '§ 6 · Timeline'}
          </SectionTitle>
          <div className="relative pl-6">
            {/* Vertical thread */}
            <div className="absolute left-2 top-0 bottom-0 w-[1.5px] bg-border" />

            {/* First contract */}
            <TimelineNode
              year={vendor.first_contract_year}
              label={isEs ? 'Primer contrato' : 'First contract'}
              color="var(--color-border-hover)"
              isEs={isEs}
            />

            {/* Administration crossings */}
            {overlappingAdmins.map((admin) => (
              <TimelineNode
                key={admin.key}
                year={admin.yearStart > (vendor.first_contract_year ?? 0) ? admin.yearStart : null}
                label={isEs ? `Inicio: ${admin.long}` : `${admin.short} administration`}
                color="var(--color-text-muted)"
                isEs={isEs}
                isAdmin
              />
            ))}

            {/* Peak year */}
            {peakYear != null && peakYear !== vendor.first_contract_year && peakYear !== vendor.last_contract_year && (
              <TimelineNode
                year={peakYear}
                label={isEs ? 'Año de máxima actividad' : 'Peak activity year'}
                color={
                  vendor.avg_risk_score != null
                    ? getRiskLevelFromScore(vendor.avg_risk_score) === 'critical' ? 'var(--color-risk-critical)'
                    : getRiskLevelFromScore(vendor.avg_risk_score) === 'high' ? 'var(--color-risk-high)'
                    : 'var(--color-risk-medium)'
                    : 'var(--color-risk-high)'
                }
                isEs={isEs}
                isPeak
              />
            )}

            {/* Last contract */}
            {vendor.last_contract_year != null && vendor.last_contract_year !== vendor.first_contract_year && (
              <TimelineNode
                year={vendor.last_contract_year}
                label={
                  vendor.last_contract_year >= new Date().getFullYear() - 1
                    ? (isEs ? 'Contrato más reciente' : 'Most recent contract')
                    : (isEs ? 'Último contrato registrado' : 'Last contract on record')
                }
                color={
                  vendor.last_contract_year >= new Date().getFullYear() - 1
                    ? 'var(--color-signal-live)' : 'var(--color-text-muted)'
                }
                isEs={isEs}
              />
            )}
          </div>
        </section>
      )}

      {/* § 2 La Captura — top institutions list with capture pill */}
      {institutionRows.length > 0 && (
        <section
          aria-labelledby="inst-title"
          className="pt-6 border-t border-border/40"
        >
          <SectionTitle id="inst-title">
            {isEs ? '§ 2 · La Captura institucional' : '§ 2 · Institutional capture'}
          </SectionTitle>
          {/* Capture pill — shown if top institution > 40% of total vendor value */}
          {(() => {
            const topInst = institutionRows[0]
            if (!topInst || !vendor.total_value_mxn) return null
            const share = topInst.total_value_mxn / vendor.total_value_mxn
            if (share < 0.40) return null
            return (
              <div className="mb-3">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.12em]"
                  style={{ color: '#fb923c', backgroundColor: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)' }}
                >
                  {isEs
                    ? `Capturado por ${topInst.institution_name.split(' ').slice(0, 3).join(' ')} · ${(share * 100).toFixed(0)}%`
                    : `Captured by ${topInst.institution_name.split(' ').slice(0, 3).join(' ')} · ${(share * 100).toFixed(0)}%`}
                </span>
              </div>
            )
          })()}
          <ul className="space-y-2">
            {institutionRows.slice(0, 10).map((inst) => {
              const share = vendor.total_value_mxn > 0
                ? inst.total_value_mxn / vendor.total_value_mxn
                : 0
              return (
                <li
                  key={inst.institution_id}
                  className="flex items-center justify-between gap-4 px-2 py-1.5 rounded-sm hover:bg-background-elevated/60 transition-colors"
                >
                  <EntityIdentityChip type="institution" id={inst.institution_id} name={inst.institution_name} size="sm" />
                  <div className="flex items-center gap-4 flex-shrink-0 text-[11px] font-mono tabular-nums text-text-muted">
                    <span className="text-text-secondary">{(share * 100).toFixed(0)}%</span>
                    <span className="text-text-primary font-medium">
                      {formatCompactMXN(inst.total_value_mxn)}
                    </span>
                  </div>
                </li>
              )
            })}
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

function TimelineNode({
  year,
  label,
  color,
  isEs,
  isAdmin,
  isPeak,
}: {
  year: number | null
  label: string
  color: string
  isEs: boolean
  isAdmin?: boolean
  isPeak?: boolean
}) {
  if (!year) return null
  return (
    <div className="relative flex items-start gap-3 mb-4 last:mb-0">
      {/* Dot on the thread */}
      <div
        className="absolute left-[-1.25rem] top-[4px] w-3 h-3 rounded-full border-2 flex-shrink-0 z-10"
        style={{
          borderColor: color,
          backgroundColor: isPeak ? color : 'var(--color-background)',
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className="text-sm font-mono font-bold tabular-nums"
            style={{ color }}
          >
            {year}
          </span>
          {isAdmin && (
            <span
              className="text-[9px] font-mono uppercase tracking-[0.15em] px-1 py-[1px] rounded-sm border"
              style={{
                color: 'var(--color-text-muted)',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-background-elevated)',
              }}
            >
              {isEs ? 'cambio admin.' : 'admin. change'}
            </span>
          )}
          {isPeak && (
            <span
              className="text-[9px] font-mono uppercase tracking-[0.15em] px-1 py-[1px] rounded-sm border"
              style={{
                color,
                borderColor: `${color}40`,
                backgroundColor: `${color}10`,
              }}
            >
              {isEs ? 'pico' : 'peak'}
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-secondary leading-snug mt-0.5">{label}</p>
      </div>
    </div>
  )
}
