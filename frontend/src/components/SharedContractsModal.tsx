/**
 * SharedContractsModal — shows contracts from licitaciones shared by two vendors
 * Used by CollusionExplorer PairCard to drill into evidence of co-bidding.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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

const RISK_BADGE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-risk-critical/15', text: 'text-risk-critical', border: 'border-red-500/25' },
  high:     { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/25' },
  medium:   { bg: 'bg-risk-high/15', text: 'text-risk-high', border: 'border-amber-500/25' },
  low:      { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/25' },
}

const RISK_BADGE_LABELS: Record<string, { es: string; en: string }> = {
  critical: { es: 'Crítico', en: 'Critical' },
  high:     { es: 'Alto', en: 'High' },
  medium:   { es: 'Medio', en: 'Medium' },
  low:      { es: 'Bajo', en: 'Low' },
}

function RiskBadge({ level, lang }: { level: string | null; lang: 'es' | 'en' }) {
  if (!level) return <span className="text-text-muted text-[10px] font-mono">—</span>
  const key = level.toLowerCase()
  const style = RISK_BADGE_STYLE[key] ?? RISK_BADGE_STYLE.low
  const labels = RISK_BADGE_LABELS[key] ?? RISK_BADGE_LABELS.low
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
    >
      {labels[lang]}
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
  const { t, i18n } = useTranslation('common')
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'
  const [page, setPage] = useState(1)
  const modalRef = useRef<HTMLDivElement>(null)

  const FOCUSABLE_SELECTORS = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  // Move focus into the modal on mount
  useEffect(() => {
    if (modalRef.current) {
      const first = modalRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTORS)
      first?.focus()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Trap Tab/Shift-Tab within the modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Tab' || !modalRef.current) return
    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }, [onClose]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <div ref={modalRef} onKeyDown={handleKeyDown} className="bg-background-card border border-border rounded-sm max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-risk-high shrink-0" aria-hidden="true" />
              <h2
                id="shared-contracts-title"
                className="text-sm font-semibold text-text-primary uppercase tracking-wide"
              >
                {lang === 'en' ? 'Shared Contracts in Tenders' : 'Contratos Compartidos en Licitaciones'}
              </h2>
            </div>
            <p className="text-xs text-text-secondary truncate">
              <span className="text-text-secondary font-medium">{truncateName(vendorAName, 35)}</span>
              <span className="mx-2 text-text-muted">↔</span>
              <span className="text-text-secondary font-medium">{truncateName(vendorBName, 35)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors"
            aria-label={lang === 'en' ? 'Close modal' : 'Cerrar modal'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary strip */}
        {summary && (
          <div className="flex items-center gap-6 px-5 py-3 bg-amber-500/8 border-b border-amber-500/15 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-risk-high shrink-0" aria-hidden="true" />
              <span className="text-xs font-mono text-accent">
                <span className="font-bold text-amber-200">{formatNumber(summary.shared_procedure_count)}</span>
                {' '}{lang === 'en' ? 'shared procedures' : 'procedimientos compartidos'}
              </span>
            </div>
            <div className="h-3 w-px bg-amber-500/20" aria-hidden="true" />
            <span className="text-xs font-mono text-accent">
              <span className="font-bold text-amber-200">{formatCompactMXN(summary.total_shared_amount)}</span>
              {' '}{lang === 'en' ? 'in combined contracts' : 'en contratos combinados'}
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-6 w-6 border-2 border-border border-t-amber-500 rounded-full animate-spin" />
              <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                {lang === 'en' ? 'Loading contracts…' : 'Cargando contratos…'}
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertTriangle className="h-7 w-7 text-risk-critical" aria-hidden="true" />
              <p className="text-sm text-risk-critical font-medium">{t('errors.failedToLoad')}</p>
              <p className="text-xs text-text-muted">{t('errors.couldNotLoad')}</p>
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border-t border-amber-900/20">
              <FileText className="h-6 w-6 text-text-primary" aria-hidden="true" />
              <p className="text-sm font-normal text-text-secondary max-w-sm text-center">
                {lang === 'en'
                  ? 'These two vendors do not share contracts in the analyzed period.'
                  : 'Estos dos proveedores no comparten contratos en el período analizado.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" aria-label={lang === 'en' ? 'Shared contracts' : 'Contratos compartidos'}>
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-background-card">
                    <th
                      scope="col"
                      className="text-left text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted px-4 py-2.5 whitespace-nowrap"
                    >
                      {lang === 'en' ? 'Tender' : 'Licitación'}
                    </th>
                    <th
                      scope="col"
                      className="text-left text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted px-4 py-2.5"
                    >
                      {lang === 'en' ? 'Vendor' : 'Proveedor'}
                    </th>
                    <th
                      scope="col"
                      className="text-right text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted px-4 py-2.5 whitespace-nowrap"
                    >
                      {lang === 'en' ? 'Amount' : 'Monto'}
                    </th>
                    <th
                      scope="col"
                      className="text-left text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted px-4 py-2.5 whitespace-nowrap"
                    >
                      <Calendar className="h-3 w-3 inline mr-1" aria-hidden="true" />
                      {lang === 'en' ? 'Date' : 'Fecha'}
                    </th>
                    <th
                      scope="col"
                      className="text-center text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted px-4 py-2.5"
                    >
                      {lang === 'en' ? 'Risk' : 'Riesgo'}
                    </th>
                    <th
                      scope="col"
                      className="text-left text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted px-4 py-2.5"
                    >
                      <Building2 className="h-3 w-3 inline mr-1" aria-hidden="true" />
                      {lang === 'en' ? 'Institution' : 'Institución'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contracts.map((c: SharedContract) => (
                    <tr
                      key={c.id}
                      className="hover:bg-background-elevated transition-colors"
                    >
                      {/* Licitación */}
                      <td className="px-4 py-2.5 font-mono text-[11px] text-text-secondary whitespace-nowrap">
                        {c.procedure_number
                          ? <span title={c.procedure_number}>{truncateName(c.procedure_number, 22)}</span>
                          : <span className="text-text-muted">—</span>
                        }
                        {(c.is_single_bid || c.is_direct_award) && (
                          <div className="flex gap-1 mt-0.5">
                            {c.is_direct_award && (
                              <span className="text-[9px] font-mono uppercase bg-orange-500/10 border border-orange-500/20 text-orange-400 px-1 rounded">
                                AD
                              </span>
                            )}
                            {c.is_single_bid && (
                              <span className="text-[9px] font-mono uppercase bg-risk-critical/10 border border-red-500/20 text-risk-critical px-1 rounded">
                                {lang === 'en' ? '1 bid' : '1 oferta'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Proveedor */}
                      <td className="px-4 py-2.5 max-w-[180px]">
                        <span
                          className="text-text-secondary font-medium truncate block"
                          title={c.vendor_name}
                        >
                          {truncateName(c.vendor_name, 26)}
                        </span>
                        {c.sector_name && (
                          <span className="text-[10px] font-mono text-text-muted">{c.sector_name}</span>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="px-4 py-2.5 text-right font-mono text-text-secondary whitespace-nowrap tabular-nums">
                        {c.amount > 0 ? formatMXN(c.amount) : <span className="text-text-muted">—</span>}
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-2.5 font-mono text-text-secondary whitespace-nowrap">
                        {c.contract_date
                          ? c.contract_date.slice(0, 10)
                          : <span className="text-text-muted">—</span>
                        }
                      </td>

                      {/* Riesgo */}
                      <td className="px-4 py-2.5 text-center">
                        <RiskBadge level={c.risk_level} lang={lang} />
                      </td>

                      {/* Institución */}
                      <td className="px-4 py-2.5 max-w-[200px]">
                        <span
                          className="text-text-secondary truncate block"
                          title={c.institution_name ?? undefined}
                        >
                          {c.institution_name ? truncateName(c.institution_name, 28) : <span className="text-text-muted">—</span>}
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
            className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0"
            role="navigation"
            aria-label={lang === 'en' ? 'Contract pagination' : 'Paginación de contratos'}
          >
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wide border border-border bg-background-card text-text-secondary hover:text-text-secondary hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {lang === 'en' ? 'Previous' : 'Anterior'}
            </button>

            <span className="text-[10px] font-mono text-text-muted" aria-live="polite">
              {lang === 'en' ? 'Page' : 'Página'} {page} {lang === 'en' ? 'of' : 'de'} {totalPages}
              {pagination && (
                <> &middot; {formatNumber(pagination.total)} {lang === 'en' ? 'contracts' : 'contratos'}</>
              )}
            </span>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wide border border-border bg-background-card text-text-secondary hover:text-text-secondary hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {lang === 'en' ? 'Next' : 'Siguiente'}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
