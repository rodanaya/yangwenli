/**
 * VendorActivityTab — what the vendor actually did.
 *
 * Risk timeline, contracts table with filters, top institutions, sector
 * breakdown. Excludes model explanations (Evidence) and network/external
 * (Network).
 *
 * vendor-P1 (2026-05-04): § 6 Cronología replaced with EditorialTimeline
 * primitive from @/components/charts/editorial. Hand-rolled TimelineNode
 * component removed. ADMINISTRATIONS import removed.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  ContractListItem,
  VendorContractAggregate,
  VendorDetailResponse,
  VendorInstitutionListResponse,
  VendorPeerComparisonResponse,
} from '@/api/types'
import {
  EditorialAreaChart,
  EditorialTimeline,
  type ChartAnnotation,
  type EditorialTimelineEvent,
} from '@/components/charts/editorial'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import {
  formatCompactMXN,
  formatCompactUSDByYear,
  formatDate,
  getRiskLevel,
  shortenContractName,
} from '@/lib/utils'
import { cleanContractDescription, computeContractFlags, type ContractFlags } from '@/lib/contract-audit'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { SubSectionTitle } from '@/components/dossier/SubSectionTitle'

// Forensic-ink ochre for the flag gutter glyphs (matches the dashboard amber /
// EL DESVÍO ledger). Applied via inline style — a hex in className is stripped
// by the token linter and would silently fall back to the inherited color.
const OCHRE = '#a06820'

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
  peerComparison?: VendorPeerComparisonResponse | null
  /**
   * Population-scoped contract census (all contracts, server-computed). When
   * present, the register prints an honest "X de Y sin competencia · activo
   * AAAA–AAAA" census instead of a page-sample claim. Optional so the legacy
   * VendorProfile call site keeps compiling.
   */
  contractAggregate?: VendorContractAggregate | null
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
  peerComparison,
  contractAggregate,
}: VendorActivityTabProps) {
  const { i18n } = useTranslation(['vendors'])
  const isEs = i18n.language.startsWith('es')

  // Per-row forensic flags (≡ repeat · ① single-bid · ▲ top-decile · ↻
  // amendment) computed over the CURRENT PAGE. Page-scoped by construction —
  // the census line below labels population vs page honestly.
  const audit = useMemo(
    () => computeContractFlags(contracts?.data ?? []),
    [contracts?.data]
  )
  const pageFlagged = useMemo(
    () => (contracts?.data ?? []).filter((c) => (audit.info.get(c.id)?.count ?? 0) > 0).length,
    [contracts?.data, audit]
  )

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

  // §6 Cronología: map lifecycle year entries → EditorialTimelineEvent[]
  // Each year entry becomes one timeline event; dot radius encodes total_value_mxn,
  // dot color encodes risk level. EditorialTimeline handles sexenio bands natively.
  const timelineEvents = useMemo((): EditorialTimelineEvent[] => {
    if (!lifecycle?.timeline?.length) return []
    const sectorCode = vendor.primary_sector_name?.toLowerCase() ?? 'otros'
    return lifecycle.timeline
      .filter((y) => y.total_value_mxn != null && y.total_value_mxn > 0)
      .map((y): EditorialTimelineEvent => {
        const riskScore = y.avg_risk_score ?? y.avg_risk
        const riskLevel = riskScore != null ? getRiskLevelFromScore(riskScore) : undefined
        return {
          id: y.year,
          date: `${y.year}-01-01`,
          amount: y.total_value_mxn,
          title: `${y.year}${y.contract_count
            ? ` · ${y.contract_count.toLocaleString()} ${
                isEs
                  ? (y.contract_count === 1 ? 'contrato' : 'contratos')
                  : (y.contract_count === 1 ? 'contract' : 'contracts')
              }`
            : ''}`,
          subtitle:
            y.high_risk_count && y.high_risk_count > 0
              ? (isEs
                  ? `${y.high_risk_count} ${y.high_risk_count === 1 ? 'contrato' : 'contratos'} de riesgo alto+`
                  : `${y.high_risk_count} high-risk ${y.high_risk_count === 1 ? 'contract' : 'contracts'}`)
              : undefined,
          riskLevel,
          sectorCode,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [lifecycle, vendor.primary_sector_name])

  return (
    <div className="space-y-8">
      {/* § Indicador de riesgo — Risk year-over-year area chart */}
      <section aria-labelledby="trend-title">
        <SubSectionTitle id="trend-title">
          {isEs ? '§ Indicador de riesgo anual' : '§ Annual risk indicator'}
        </SubSectionTitle>
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
          <p className="text-sm text-text-secondary">
            {isEs
              ? 'Insuficiente actividad para un histórico.'
              : 'Insufficient activity for a history view.'}
          </p>
        )}
      </section>

      {/* § 6 La Cronología — EditorialTimeline with sexenio bands */}
      {timelineEvents.length > 0 && (
        <section
          aria-labelledby="cronologia-title"
          className="pt-2"
        >
          <SubSectionTitle id="cronologia-title">
            {isEs ? '§ La Cronología' : '§ Timeline'}
          </SubSectionTitle>
          <EditorialTimeline
            events={timelineEvents}
            showSexenios={true}
            emptyState={isEs ? 'Sin actividad registrada.' : 'No recorded activity.'}
          />
        </section>
      )}

      {/* § 5 El Dinero — where this vendor ranks within its sector (value + risk
          percentile). The direct-award / single-bid bars that used to live here
          were a fourth copy of those two rates — already carried by the OECD
          deviation panel, the §0 benchmark bars, and the §9 deviation ledger.
          Collapsed to the two genuinely-unique rank callouts (2026-06-08). */}
      {peerComparison && peerComparison.metrics.length > 0 && (() => {
        const valueMetric = peerComparison.metrics.find(m => m.metric === 'total_value_mxn')
        const riskMetric = peerComparison.metrics.find(m => m.metric === 'avg_risk_score')
        const valPct = valueMetric?.percentile ?? null
        const riskPct = riskMetric?.percentile ?? null
        if (valPct == null && riskPct == null) return null

        return (
          <section
            aria-labelledby="dinero-title"
            className="pt-2"
          >
            <SubSectionTitle id="dinero-title">
              {isEs ? '§ El Dinero' : '§ The Money'}
            </SubSectionTitle>
            <p className="text-sm text-text-secondary leading-relaxed max-w-prose mb-4">
              {isEs
                ? `Posición de este proveedor dentro del sector ${vendor.primary_sector_name ?? ''} por valor total y riesgo.`
                : `Where this vendor ranks within the ${vendor.primary_sector_name ?? 'sector'} by total value and risk.`}
            </p>
            {/* Percentile rank callouts */}
            <div className="flex flex-wrap gap-3">
              {valPct != null && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-text-muted bg-background-elevated px-2.5 py-1.5 rounded-sm border border-border/40">
                  {isEs
                    ? `Top ${100 - valPct}% · valor total en ${vendor.primary_sector_name ?? 'sector'}`
                    : `Top ${100 - valPct}% · total value in ${vendor.primary_sector_name ?? 'sector'}`}
                </span>
              )}
              {riskPct != null && (
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-sm border"
                  style={{
                    color: riskPct >= 75 ? RISK_COLORS.critical : riskPct >= 50 ? RISK_COLORS.high : 'var(--color-text-muted)',
                    backgroundColor: riskPct >= 75 ? `${RISK_COLORS.critical}10` : riskPct >= 50 ? `${RISK_COLORS.high}10` : 'var(--color-background-elevated)',
                    borderColor: riskPct >= 75 ? `${RISK_COLORS.critical}30` : riskPct >= 50 ? `${RISK_COLORS.high}30` : 'var(--color-border)',
                  }}
                >
                  {isEs
                    ? `Percentil ${riskPct.toFixed(0)} · riesgo en ${vendor.primary_sector_name ?? 'sector'}`
                    : `${riskPct.toFixed(0)}th percentile · risk in ${vendor.primary_sector_name ?? 'sector'}`}
                </span>
              )}
            </div>
          </section>
        )
      })()}

      {/* § 2 La Captura — top institutions list with capture pill */}
      {institutionRows.length > 0 && (
        <section
          aria-labelledby="inst-title"
          className="pt-2"
        >
          <SubSectionTitle id="inst-title">
            {isEs ? '§ La Captura institucional' : '§ Institutional capture'}
          </SubSectionTitle>
          {/* Capture pill — shown if top institution > 40% of total vendor value */}
          {(() => {
            const topInst = institutionRows[0]
            if (!topInst || !vendor.total_value_mxn) return null
            const share = topInst.total_value_mxn / vendor.total_value_mxn
            if (share < 0.40) return null
            return (
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.12em] flex-shrink-0"
                  style={{ color: '#fb923c', backgroundColor: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)' }}
                >
                  {isEs ? 'Capturado ·' : 'Captured ·'} {(share * 100).toFixed(0)}%
                </span>
                <div className="min-w-0">
                  <EntityIdentityChip
                    type="institution"
                    id={topInst.institution_id}
                    name={topInst.institution_name}
                    size="sm"
                    fullName
                  />
                </div>
              </div>
            )
          })()}
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-0.5">
            {institutionRows.slice(0, 10).map((inst) => {
              const share = vendor.total_value_mxn > 0
                ? inst.total_value_mxn / vendor.total_value_mxn
                : 0
              return (
                <li
                  key={inst.institution_id}
                  className="flex items-center justify-between gap-4 px-2 py-1.5 rounded-sm hover:bg-background-elevated/60 transition-colors min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <EntityIdentityChip type="institution" id={inst.institution_id} name={inst.institution_name} size="sm" fullName />
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-[11px] font-mono tabular-nums text-text-muted">
                    <span className="text-text-secondary">
                      {share > 0 && share < 0.01 ? '<1%' : `${(share * 100).toFixed(0)}%`}
                    </span>
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

      {/* § · El Expediente — forensic contract register (flag gutter) */}
      <section
        aria-labelledby="contracts-title"
        className="pt-2"
      >
        {(() => {
          const loc = isEs ? 'es-MX' : 'en-US'
          const popTotal = contractAggregate?.total_contracts ?? totalContracts
          const noComp = contractAggregate?.no_competition
          const yrMin = contractAggregate?.year_min ?? vendor.first_contract_year ?? null
          const yrMax = contractAggregate?.year_max ?? vendor.last_contract_year ?? null
          const shown = contracts?.data?.length ?? 0
          return (
            <>
              <div className="mb-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                <SubSectionTitle id="contracts-title" className="mb-0">
                  {isEs ? '§ El Expediente' : '§ The Register'}
                </SubSectionTitle>
                <div className="flex flex-wrap items-baseline gap-x-2 text-[11px] font-mono tabular-nums text-text-muted">
                  <span className="text-text-secondary">
                    {popTotal.toLocaleString(loc)} {isEs ? 'contratos' : 'contracts'}
                  </span>
                  {noComp != null && popTotal > 0 && (
                    <span>
                      · {noComp.toLocaleString(loc)} {isEs ? 'sin competencia' : 'no competition'} (
                      {Math.round((noComp / popTotal) * 100)}%)
                    </span>
                  )}
                  {yrMin != null && yrMax != null && (
                    <span>
                      · {isEs ? 'activo' : 'active'} {yrMin}
                      {yrMax !== yrMin ? `–${yrMax}` : ''}
                    </span>
                  )}
                </div>
              </div>
              {shown > 0 && (
                <p className="mb-3 text-[10px] font-mono text-text-muted/80 leading-relaxed">
                  {isEs
                    ? `Señales en esta página (${shown} de ${popTotal.toLocaleString(loc)} · ${pageFlagged} marcados): `
                    : `Flags on this page (${shown} of ${popTotal.toLocaleString(loc)} · ${pageFlagged} flagged): `}
                  <span style={{ color: OCHRE }}>≡</span> {isEs ? 'repetido' : 'repeated'}
                  {' · '}
                  <span style={{ color: OCHRE }}>①</span> {isEs ? 'postor único' : 'single bid'}
                  {' · '}
                  <span style={{ color: OCHRE }}>▲</span> {isEs ? 'decil superior' : 'top decile'}
                  {' · '}
                  <span style={{ color: OCHRE }}>↻</span> {isEs ? 'convenio' : 'amendment'}
                </p>
              )}
            </>
          )
        })()}
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
              <table className="w-full text-sm" aria-label={isEs ? 'Contratos del proveedor' : 'Vendor contracts'}>
                <thead className="bg-background-elevated text-[10px] uppercase tracking-widest text-text-muted">
                  <tr>
                    <th scope="col" className="w-[72px] text-center px-2 py-2 font-semibold">
                      {isEs ? 'Señal' : 'Flag'}
                    </th>
                    <th scope="col" className="text-left px-3 py-2 font-semibold">
                      {isEs ? 'Objeto' : 'Object'}
                    </th>
                    <th scope="col" className="hidden lg:table-cell text-left px-3 py-2 font-semibold">
                      {isEs ? 'Institución' : 'Institution'}
                    </th>
                    <th scope="col" className="text-right px-3 py-2 font-semibold">
                      {isEs ? 'Monto' : 'Amount'}
                    </th>
                    <th scope="col" className="hidden sm:table-cell text-right px-3 py-2 font-semibold">
                      ≈ USD
                    </th>
                    <th scope="col" className="text-center px-3 py-2 font-semibold">
                      {isEs ? 'Fecha' : 'Date'}
                    </th>
                    <th scope="col" className="text-center px-3 py-2 font-semibold">
                      {isEs ? 'Riesgo' : 'Risk'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.data.map((c) => {
                    const flags = audit.info.get(c.id)
                    const heavy = (flags?.count ?? 0) >= 2
                    const clean = cleanContractDescription(c.title ?? '')
                    return (
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
                      <td className="px-2 py-2 text-center align-top">
                        <FlagGutter flags={flags} isEs={isEs} />
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="max-w-[300px]">
                          <div className="truncate text-text-primary" title={c.title ?? undefined}>
                            {clean.objeto ?? (c.title ? shortenContractName(c.title) : '—')}
                          </div>
                          {/* Only show the expediente code as a sub-line when a real
                              objeto was extracted. If objeto cleaning failed (a bare-code
                              title), the line above already shows the code — a second
                              code line would just duplicate it (e.g. "D9p0143 D9P0143"). */}
                          {clean.objeto && clean.expediente && (
                            <div className="mt-0.5 text-[10px] font-mono uppercase tracking-wide text-text-muted/70 truncate">
                              {clean.expediente}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-3 py-2 text-text-secondary align-top" style={{ maxWidth: 220 }}>
                        <span style={{ display: 'block', wordBreak: 'break-word', lineHeight: 1.35 }}>
                          {c.institution_name ?? '—'}
                        </span>
                      </td>
                      <td
                        className="px-3 py-2 text-right font-mono tabular-nums whitespace-nowrap align-top"
                        style={heavy ? { color: RISK_COLORS.critical } : undefined}
                      >
                        {formatCompactMXN(c.amount_mxn ?? 0)}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2 text-right font-mono tabular-nums text-[11px] text-text-muted whitespace-nowrap align-top">
                        {formatCompactUSDByYear(c.amount_mxn ?? 0, c.contract_year)}
                      </td>
                      <td className="px-3 py-2 text-center font-mono tabular-nums text-text-muted align-top">
                        {c.contract_date ? formatDate(c.contract_date) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center align-top">
                        {c.risk_score != null && (
                          <RiskLevelPill level={getRiskLevel(c.risk_score)} score={c.risk_score} />
                        )}
                      </td>
                    </tr>
                    )
                  })}
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
          <p className="text-sm text-text-secondary">
            {isEs ? 'Sin contratos.' : 'No contracts.'}
          </p>
        )}
      </section>
    </div>
  )
}

/**
 * FlagGutter — renders the per-contract forensic signals as a compact glyph row.
 * ≡ repeated amount/object · ① single-bid · ▲ within-page top-decile · ↻ amendment.
 * Glyphs are uniform ochre (the column reads as a texture); severity is carried
 * by the money column turning red at ≥2 flags. A no-flag row shows a faint middot.
 */
function FlagGutter({ flags, isEs }: { flags?: ContractFlags; isEs: boolean }) {
  if (!flags || flags.count === 0) {
    return (
      <span className="text-text-muted/40" aria-hidden="true">
        ·
      </span>
    )
  }
  const items: Array<{ glyph: string; label: string }> = []
  if (flags.repeated)
    items.push({ glyph: '≡', label: isEs ? 'monto u objeto repetido' : 'repeated amount or object' })
  if (flags.singleBid)
    items.push({ glyph: '①', label: isEs ? 'licitación de un solo postor' : 'single-bid tender' })
  if (flags.decile)
    items.push({ glyph: '▲', label: isEs ? 'decil superior en esta página' : 'top decile on this page' })
  if (flags.amendment)
    items.push({ glyph: '↻', label: isEs ? 'convenio modificatorio' : 'amendment' })
  const srLabel = items.map((i) => i.label).join(', ')
  return (
    <span
      className="inline-flex items-center justify-center gap-1 font-mono text-[13px] leading-none"
      style={{ color: OCHRE }}
      title={srLabel}
    >
      <span className="sr-only">{srLabel}</span>
      {items.map((it, idx) => (
        <span key={idx} aria-hidden="true">
          {it.glyph}
        </span>
      ))}
    </span>
  )
}

