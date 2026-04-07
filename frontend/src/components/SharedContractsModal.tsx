/**
 * SharedContractsModal — shows contracts from licitaciones shared by two vendors
 * Used by CollusionExplorer PairCard to drill into evidence of co-bidding.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, FileText, AlertTriangle, Building2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { collusionApi, type SharedContract } from '@/api/client'
import { formatMXN, formatNumber, formatCompactMXN } from '@/lib/utils'

interface SharedContractsModalProps {
  vendorAId: number
  vendorBId: number
  vendorAName: string
  vendorBName: string
  onClose: () => void
}

const RISK_BADGE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/25', label: 'Crítico' },
  high:     { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/25', label: 'Alto' },
  medium:   { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', label: 'Medio' },
  low:      { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/25', label: 'Bajo' },
}

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-zinc-600 text-[10px] font-mono">—</span>
  const key = level.toLowerCase()
  const style = RISK_BADGE[key] ?? RISK_BADGE.low
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
    >
      {style.label}
    </span>
  )
}

function truncateName(name: string, max = 28): string {
  return name.length > max ? name.slice(0, max) + '…' : name
}

export function SharedContractsModal({
  vendorAId,
  vendorBId,
  vendorAName,
  vendorBName,
  onClose,
}: SharedContractsModalProps) {
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-contracts', vendorAId, vendorBId, page],
    queryFn: () => collusionApi.getSharedContracts(vendorAId, vendorBId, page, 20),
    staleTime: 5 * 60 * 1000,
  })

  const pagination = data?.pagination
  const totalPages = pagination?.total_pages ?? 1
  const summary = data?.summary
  const contracts = data?.data ?? []

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-contracts-title"
      onClick={handleOverlayClick}
    >
      <div className="bg-[#0f1117] border border-white/10 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
              <h2
                id="shared-contracts-title"
                className="text-sm font-semibold text-zinc-100 uppercase tracking-wide"
              >
                Contratos Compartidos en Licitaciones
              </h2>
            </div>
            <p className="text-xs text-zinc-400 truncate">
              <span className="text-zinc-200 font-medium">{truncateName(vendorAName, 35)}</span>
              <span className="mx-2 text-zinc-600">↔</span>
              <span className="text-zinc-200 font-medium">{truncateName(vendorBName, 35)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/8 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary strip */}
        {summary && (
          <div className="flex items-center gap-6 px-5 py-3 bg-amber-500/8 border-b border-amber-500/15 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
              <span className="text-xs font-mono text-amber-300">
                <span className="font-bold text-amber-200">{formatNumber(summary.shared_procedure_count)}</span>
                {' '}procedimientos compartidos
              </span>
            </div>
            <div className="h-3 w-px bg-amber-500/20" aria-hidden="true" />
            <span className="text-xs font-mono text-amber-300">
              <span className="font-bold text-amber-200">{formatCompactMXN(summary.total_shared_amount)}</span>
              {' '}en contratos combinados
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-6 w-6 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                Cargando contratos…
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="h-7 w-7 text-red-400" aria-hidden="true" />
              <p className="text-sm text-red-300 font-medium">Error al cargar contratos</p>
              <p className="text-xs text-zinc-500">Intenta de nuevo más tarde</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="h-7 w-7 text-zinc-700" aria-hidden="true" />
              <p className="text-sm text-zinc-400 font-medium">No se encontraron contratos compartidos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label="Contratos compartidos">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-white/8 bg-[#0f1117]">
                    <th
                      scope="col"
                      className="text-left text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500 px-4 py-2.5 whitespace-nowrap"
                    >
                      Licitación
                    </th>
                    <th
                      scope="col"
                      className="text-left text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500 px-4 py-2.5"
                    >
                      Proveedor
                    </th>
                    <th
                      scope="col"
                      className="text-right text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500 px-4 py-2.5 whitespace-nowrap"
                    >
                      Monto
                    </th>
                    <th
                      scope="col"
                      className="text-left text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500 px-4 py-2.5 whitespace-nowrap"
                    >
                      <Calendar className="h-3 w-3 inline mr-1" aria-hidden="true" />
                      Fecha
                    </th>
                    <th
                      scope="col"
                      className="text-center text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500 px-4 py-2.5"
                    >
                      Riesgo
                    </th>
                    <th
                      scope="col"
                      className="text-left text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500 px-4 py-2.5"
                    >
                      <Building2 className="h-3 w-3 inline mr-1" aria-hidden="true" />
                      Institución
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {contracts.map((c: SharedContract) => (
                    <tr
                      key={c.id}
                      className="hover:bg-white/3 transition-colors"
                    >
                      {/* Licitación */}
                      <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                        {c.procedure_number
                          ? <span title={c.procedure_number}>{truncateName(c.procedure_number, 22)}</span>
                          : <span className="text-zinc-600">—</span>
                        }
                        {(c.is_single_bid || c.is_direct_award) && (
                          <div className="flex gap-1 mt-0.5">
                            {c.is_direct_award && (
                              <span className="text-[9px] font-mono uppercase bg-orange-500/10 border border-orange-500/20 text-orange-400 px-1 rounded">
                                AD
                              </span>
                            )}
                            {c.is_single_bid && (
                              <span className="text-[9px] font-mono uppercase bg-red-500/10 border border-red-500/20 text-red-400 px-1 rounded">
                                1 oferta
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Proveedor */}
                      <td className="px-4 py-2.5 max-w-[180px]">
                        <span
                          className="text-zinc-200 font-medium truncate block"
                          title={c.vendor_name}
                        >
                          {truncateName(c.vendor_name, 26)}
                        </span>
                        {c.sector_name && (
                          <span className="text-[10px] font-mono text-zinc-600">{c.sector_name}</span>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="px-4 py-2.5 text-right font-mono text-zinc-200 whitespace-nowrap tabular-nums">
                        {c.amount > 0 ? formatMXN(c.amount) : <span className="text-zinc-600">—</span>}
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-2.5 font-mono text-zinc-400 whitespace-nowrap">
                        {c.contract_date
                          ? c.contract_date.slice(0, 10)
                          : <span className="text-zinc-600">—</span>
                        }
                      </td>

                      {/* Riesgo */}
                      <td className="px-4 py-2.5 text-center">
                        <RiskBadge level={c.risk_level} />
                      </td>

                      {/* Institución */}
                      <td className="px-4 py-2.5 max-w-[200px]">
                        <span
                          className="text-zinc-400 truncate block"
                          title={c.institution_name ?? undefined}
                        >
                          {c.institution_name ? truncateName(c.institution_name, 28) : <span className="text-zinc-600">—</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-5 py-3 border-t border-white/8 shrink-0"
            role="navigation"
            aria-label="Paginación de contratos"
          >
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wide border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Anterior
            </button>

            <span className="text-[10px] font-mono text-zinc-500" aria-live="polite">
              Página {page} de {totalPages}
              {pagination && (
                <> &middot; {formatNumber(pagination.total)} contratos</>
              )}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wide border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
