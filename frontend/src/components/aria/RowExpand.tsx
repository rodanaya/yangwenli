import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ariaApi } from '@/api/client'
import { DotBar } from '@/components/ui/DotBar'
import { BenchmarkRow } from '@/components/editorial/BenchmarkRow'
import { AriaMemoPanel } from '@/components/widgets/AriaMemoPanel'
import { useReviewMutations } from '@/hooks/useReviewMutations'
import { DRIVER_META, driverTag } from '@/components/aria/disposition'
import type { AriaQueueItem } from '@/api/types'
import { cn } from '@/lib/utils'

/**
 * EL DESGLOSE — lazy in-row case file (El Expediente file-panel precedent,
 * /atlas L2). Four bands: why-this-rank decomposition · memo (AriaMemoPanel
 * reused — its own LLM/PLANTILLA/STUB demotion) · corroboración · veredicto.
 * The verdict bar is the page's single triage surface (graft from La Mesa de
 * Revisión): one-click status, promote with explicit confidence, and the
 * needs_review advance (audit F1: T1 has zero 'pending' rows — the open work
 * is CENTINELA's needs_review set).
 */

const OCHRE = '#a06820'

interface RowExpandProps {
  item: AriaQueueItem
  isEs: boolean
  onClose: () => void
  onNext: (() => void) | null
}

const CANONICAL_STATUSES = ['pending', 'reviewing', 'confirmed', 'dismissed'] as const

export function RowExpand({ item, isEs, onClose, onNext }: RowExpandProps) {
  const vendorId = item.vendor_id
  const { setStatus, isSaving, promote, isPromoting, promoted, isError } = useReviewMutations(vendorId)

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['aria-lead-detail', vendorId],
    queryFn: () => ariaApi.getVendorDetail(vendorId),
    staleTime: 5 * 60_000,
  })

  const hasWebSignal = (item.web_evidence_score ?? 0) > 0
  const { data: webEv } = useQuery({
    queryKey: ['aria-web-evidence', vendorId],
    queryFn: () => ariaApi.getWebEvidence(vendorId),
    staleTime: 5 * 60_000,
    enabled: hasWebSignal,
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const driver = driverTag(item)
  const components: Array<{ key: string; label: string; value: number | null | undefined; isDriver: boolean }> = [
    { key: 'riesgo', label: isEs ? 'riesgo · modelo' : 'model risk', value: item.risk_score_norm, isDriver: driver === 'riesgo' },
    { key: 'consenso', label: isEs ? 'ensamble · anomalía' : 'anomaly ensemble', value: item.ensemble_norm, isDriver: driver === 'consenso' },
    { key: 'escala', label: isEs ? 'escala financiera' : 'financial scale', value: item.financial_scale_norm, isDriver: driver === 'escala' },
    { key: 'registros', label: isEs ? 'registros externos' : 'external registries', value: item.external_flags_score, isDriver: driver === 'registros' },
    { key: 'mahalanobis', label: isEs ? 'anomalía (mahalanobis)' : 'anomaly (mahalanobis)', value: detail?.mahalanobis_norm, isDriver: false },
  ]

  const gtCaseName = (detail as (AriaQueueItem & { gt_case_name?: string | null }) | undefined)?.gt_case_name
  const gtCaseType = (detail as (AriaQueueItem & { gt_case_type?: string | null }) | undefined)?.gt_case_type

  // DB carries 15 raw statuses (CENTINELA script states beyond the canonical
  // 4 the type declares) — widen for honest comparisons.
  const rawStatus: string = item.review_status ?? 'pending'
  const isCanonical = (CANONICAL_STATUSES as readonly string[]).includes(rawStatus)
  const showPromote =
    (rawStatus === 'confirmed' || rawStatus === 'confirmed_corrupt') && !item.in_ground_truth

  const articles = (webEv?.articles ?? []).slice(0, 2)

  const statusLabel = (s: string) =>
    isEs
      ? ({ pending: 'Pendiente', reviewing: 'En revisión', confirmed: 'Confirmar', dismissed: 'Descartar' } as Record<string, string>)[s]
      : ({ pending: 'Pending', reviewing: 'Reviewing', confirmed: 'Confirm', dismissed: 'Dismiss' } as Record<string, string>)[s]

  const statusGlyph: Record<string, string> = { pending: '○', reviewing: '◐', confirmed: '✓', dismissed: '⊘' }

  return (
    <div
      role="region"
      aria-label={isEs ? `Desglose: ${item.vendor_name ?? ''}` : `Breakdown: ${item.vendor_name ?? ''}`}
      className="border-b border-border/50 bg-background-elevated/30 px-4 py-3"
      style={{ borderLeft: `3px solid ${OCHRE}`, boxShadow: `inset 0 0 0 1px ${OCHRE}10` }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1.3fr_1fr] gap-x-5 gap-y-3">
        {/* Band A — ¿POR QUÉ ESTE RANGO? */}
        <div className="min-w-0">
          <p className="font-mono text-[13px] uppercase tracking-[0.15em] text-text-muted font-bold mb-1.5">
            {isEs ? '¿POR QUÉ ESTE RANGO?' : 'WHY THIS RANK?'}
            {driver && (
              <span className="ml-1.5" style={{ color: OCHRE }}>
                · {isEs ? DRIVER_META[driver].es : DRIVER_META[driver].en}
              </span>
            )}
          </p>
          <div className="space-y-1">
            {components.map((c) => (
              <div key={c.key} className="flex items-center gap-2">
                <span className="w-[124px] shrink-0 font-mono text-[13px] text-text-muted truncate">{c.label}</span>
                {c.value == null && c.key === 'mahalanobis' && detailLoading ? (
                  <span className="h-2 w-24 rounded bg-background-elevated animate-pulse" aria-hidden="true" />
                ) : (
                  <DotBar
                    value={Math.max(0, Math.min(1, c.value ?? 0))}
                    max={1}
                    color={c.isDriver ? OCHRE : 'var(--color-text-muted)'}
                    ariaLabel={`${c.label}: ${(c.value ?? 0).toFixed(2)}`}
                  />
                )}
                <span className="font-mono text-[13px] tabular-nums text-text-secondary w-8 text-right">
                  {c.value != null ? c.value.toFixed(2) : '—'}
                </span>
              </div>
            ))}
          </div>
          {item.direct_award_rate != null && (
            <div className="mt-2">
              <BenchmarkRow
                label={isEs ? 'Adjudicación directa' : 'Direct award rate'}
                value={item.direct_award_rate}
                benchmark={0.3}
                benchmarkLabel={isEs ? 'límite OCDE' : 'OECD limit'}
                maxDelta={0.5}
              />
            </div>
          )}
          <p className="mt-1.5 font-mono text-[8px] text-text-muted/80 leading-relaxed">
            {isEs
              ? 'Componentes del IPS — indicador de prioridad, no probabilidad de corrupción.'
              : 'IPS components — a priority indicator, not a probability of corruption.'}
          </p>
        </div>

        {/* Band B — MEMO (AriaMemoPanel reused: own fetch + provenance demotion).
            Height-capped: an LLM narrative can run 1,500px+; the expand stays a
            file panel, not a page — the full memo lives one click away. */}
        <div className="min-w-0 max-h-[420px] overflow-y-auto pr-1">
          <AriaMemoPanel
            vendorId={vendorId}
            vendorName={item.vendor_name ?? ''}
            tier={item.ips_tier ?? undefined}
            className="!p-0 !border-0 !bg-transparent"
          />
        </div>

        {/* Band C — CORROBORACIÓN */}
        <div className="min-w-0">
          <p className="font-mono text-[13px] uppercase tracking-[0.15em] text-text-muted font-bold mb-1.5">
            {isEs ? 'CORROBORACIÓN' : 'CORROBORATION'}
          </p>
          <div className="space-y-1.5 text-[13px] leading-snug">
            {/* GT anchor — the named case (tier-2 backend join on the lazy detail) */}
            {item.in_ground_truth ? (
              <p className="text-text-secondary">
                <span className="font-mono text-[13px] uppercase tracking-[0.1em]" style={{ color: 'var(--color-accent)' }}>
                  {isEs ? 'ANCLADO · ' : 'ANCHORED · '}
                </span>
                {gtCaseName ? (
                  <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal' }}>
                    {gtCaseName}
                    {gtCaseType ? <span className="text-text-muted"> · {gtCaseType}</span> : null}
                  </span>
                ) : (
                  <span>{isEs ? 'caso documentado de corrupción' : 'documented corruption case'}</span>
                )}
              </p>
            ) : (
              <p className="text-text-muted">
                {isEs ? 'Señalado por el modelo · sin caso documentado' : 'Model-flagged · no documented case'}
              </p>
            )}
            {item.is_efos_definitivo ? (
              <p className="text-risk-critical font-mono text-[12px]">SAT EFOS {isEs ? 'definitivo' : 'definitive'}</p>
            ) : null}
            {item.is_sfp_sanctioned ? (
              <p className="text-risk-high font-mono text-[12px]">{isEs ? 'Sancionado por la SFP' : 'SFP sanctioned'}</p>
            ) : null}
            {item.top_institution && (
              <p className="text-text-secondary">
                <span className="font-mono text-[13px] uppercase tracking-[0.1em] text-text-muted">
                  {isEs ? 'COMPRADOR · ' : 'BUYER · '}
                </span>
                {item.top_institution}
                {item.top_institution_ratio != null && (
                  <span className="text-text-muted font-mono tabular-nums"> · {Math.round(item.top_institution_ratio * 100)}%</span>
                )}
              </p>
            )}
            {hasWebSignal && articles.length > 0 ? (
              articles.map((a, i) => (
                <div key={i} className="border-l-2 border-border pl-2">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-text-muted">
                    <span className={a.verdict === 'SANCTION' ? 'text-risk-critical' : 'text-risk-high'}>{a.verdict}</span>
                    {a.source_name ? ` · ${a.source_name}` : ''}
                    {a.published_date ? ` · ${String(a.published_date).slice(0, 10)}` : ''}
                  </p>
                  <p className="text-text-secondary text-[12px] line-clamp-2">{a.snippet}</p>
                  {a.source_url && (
                    <a
                      href={a.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-text-muted underline decoration-dotted hover:text-text-primary"
                    >
                      {isEs ? 'fuente ↗' : 'source ↗'}
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-text-muted text-[12px]">
                {isEs ? 'Sin corroboración externa registrada' : 'No external corroboration on record'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Band D — EL VEREDICTO */}
      <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[13px] uppercase tracking-[0.15em] text-text-muted font-bold">
          {isEs ? 'VEREDICTO' : 'VERDICT'}
        </span>
        {CANONICAL_STATUSES.map((s) => {
          const active = rawStatus === s
          return (
            <button
              key={s}
              disabled={isSaving}
              onClick={() => setStatus(s)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-sm border font-mono text-[13px] uppercase tracking-[0.06em] transition-colors disabled:opacity-50',
                active
                  ? s === 'confirmed'
                    ? 'border-risk-critical/40 bg-risk-critical/10 text-risk-critical'
                    : s === 'reviewing'
                      ? 'border-risk-high/40 bg-risk-high/10 text-risk-high'
                      : 'border-border bg-background-elevated text-text-primary'
                  : 'border-border text-text-secondary hover:border-border-hover'
              )}
            >
              <span aria-hidden="true">{statusGlyph[s]}</span> {statusLabel(s)}
            </button>
          )
        })}
        {!isCanonical && (
          <span className="font-mono text-[8.5px] text-text-muted" title={`review_status: ${rawStatus}`}>
            {isEs ? `estado del pipeline: ${rawStatus}` : `pipeline state: ${rawStatus}`}
          </span>
        )}
        {showPromote && (
          <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <select
              id={`gt-conf-${vendorId}`}
              defaultValue="medium"
              aria-label={isEs ? 'Confianza para promover a GT' : 'Confidence for GT promotion'}
              className="bg-background-card border border-border rounded-sm font-mono text-[13px] px-1 py-1 text-text-secondary"
            >
              <option value="low">{isEs ? 'baja' : 'low'}</option>
              <option value="medium">{isEs ? 'media' : 'medium'}</option>
              <option value="high">{isEs ? 'alta' : 'high'}</option>
            </select>
            <button
              disabled={isPromoting || promoted}
              onClick={() => {
                const sel = document.getElementById(`gt-conf-${vendorId}`) as HTMLSelectElement | null
                promote((sel?.value as 'low' | 'medium' | 'high') ?? 'medium')
              }}
              className="px-2 py-1 rounded-sm border border-risk-high/40 text-risk-high font-mono text-[13px] uppercase tracking-[0.06em] hover:bg-risk-high/10 transition-colors disabled:opacity-50"
            >
              {promoted ? (isEs ? 'Promovido ✓' : 'Promoted ✓') : isEs ? 'Promover a GT' : 'Promote to GT'}
            </button>
          </span>
        )}
        {isError && (
          <span className="font-mono text-[13px] text-risk-critical">{isEs ? 'error al guardar' : 'save failed'}</span>
        )}
        {detail?.reviewer_name && (
          <span className="font-mono text-[8.5px] text-text-muted">
            {isEs ? 'revisado por' : 'reviewed by'} {detail.reviewer_name}
            {detail.reviewed_at ? ` · ${String(detail.reviewed_at).slice(0, 10)}` : ''}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-2.5">
          {onNext && (
            <button
              onClick={onNext}
              className="font-mono text-[13px] uppercase tracking-[0.08em] font-bold transition-colors hover:opacity-80"
              style={{ color: OCHRE }}
            >
              {isEs ? 'Siguiente por revisar ↓' : 'Next to review ↓'}
            </button>
          )}
          <Link
            to={`/vendors/${vendorId}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[13px] uppercase tracking-[0.08em] text-text-secondary hover:text-text-primary transition-colors"
          >
            {isEs ? 'Abrir expediente →' : 'Open dossier →'}
          </Link>
          <button
            onClick={onClose}
            className="font-mono text-[13px] uppercase tracking-[0.08em] text-text-muted hover:text-text-primary transition-colors"
            aria-label={isEs ? 'Cerrar desglose' : 'Close breakdown'}
          >
            {isEs ? 'Cerrar' : 'Close'}
          </button>
        </span>
      </div>
    </div>
  )
}
