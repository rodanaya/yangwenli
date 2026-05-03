/**
 * AriaMemoPanel — displays LLM-generated investigation memos for a vendor
 *
 * Fetches from GET /aria/memos/{vendorId} and renders in a dark editorial card.
 * Shows loading skeleton, error, and empty states.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ariaApi, vendorApi } from '@/api/client'
import type { AriaMemoResponse, VendorSHAPResponse } from '@/api/client'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Copy, Check, AlertCircle, Sparkles } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AriaMemoProps {
  vendorId: number
  vendorName: string
  tier?: number
  /** Vendor flagged as structural false positive (e.g. multinational pharma OEM).
   *  Per docs/DATA_INTEGRITY_PLAN.md task N.2 — defamation guard. */
  isFalsePositive?: boolean
  fpReason?: string
  className?: string
}

// Heuristic: detect templated/auto-generated memos so the UI can demote them
// honestly. Per docs/DATA_INTEGRITY_PLAN.md task N.3 — 38% of memos are
// template strings whose "FUENTES" block is a search prompt, not citations.
function isTemplatedMemo(text: string): boolean {
  if (!text) return false
  return (
    text.includes('Buscar manualmente') ||
    text.includes('PREGUNTAS DE INVESTIGACIÓN') ||
    /Hipótesis Alternativas?:/.test(text) ||
    text.includes('Animal Político / Proceso / Latinus')
  )
}

// Heuristic: detect memos written before the Mar 25 v0.6.5 rescore.
// Per docs/DATA_INTEGRITY_PLAN.md task N.4.
function hasStaleModelReference(text: string): boolean {
  if (!text) return false
  return /\bv5\.[01]\b/.test(text) || /modelo v5\b/i.test(text)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Tier badge — uses canonical risk tokens (v3.0 trust manifest invariant 3).
// T1=critical, T2=high, T3=medium, T4=low/neutral.
function TierBadge({ tier }: { tier: number }) {
  const colors: Record<number, string> = {
    1: 'bg-risk-critical/15 text-risk-critical border-risk-critical/30',
    2: 'bg-risk-high/15 text-risk-high border-risk-high/30',
    3: 'bg-risk-medium/15 text-risk-medium border-risk-medium/30',
    4: 'bg-text-muted/15 text-text-muted border-border',
  }
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider border', colors[tier] ?? colors[4])}>
      T{tier}
    </span>
  )
}

function MemoSkeleton() {
  return (
    <div className="space-y-3 py-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

// Risk factor display names (Spanish) — maps SHAP factor keys to editorial labels.
// Mirrors the v0.8.5 18-feature set from CLAUDE.md Risk Model section.
const FACTOR_LABELS: Record<string, string> = {
  price_volatility: 'Volatilidad de precios',
  vendor_concentration: 'Concentración en dependencias',
  price_ratio: 'Ratio precio/referencia',
  institution_diversity: 'Diversidad institucional',
  cobid_herfindahl: 'Concentración COBID',
  recency_z: 'Peso relativo reciente',
  amount_residual_z: 'Monto fuera de rango esperado',
  network_member_count: 'Membresía en red de proveedores',
  amendment_flag: 'Contratos con enmiendas',
  ad_period_days: 'Plazo de adjudicación breve',
  direct_award: 'Adjudicaciones directas',
  pub_delay_z: 'Retraso de publicación',
  win_rate: 'Tasa de éxito en licitaciones',
  same_day_count: 'Contratos adjudicados el mismo día',
}

// SHAP-driven analytical stub — shown when no LLM memo exists for a vendor.
// Fetches top risk factors and renders an editorial reading of the model's
// signal, making clear this is algorithmic (not investigative) analysis.
function MemoEmptyState({ vendorId, vendorName }: { vendorId: number; vendorName: string }) {
  const { data: shap, isLoading } = useQuery<VendorSHAPResponse>({
    queryKey: ['vendor-shap', vendorId],
    queryFn: () => vendorApi.getShap(vendorId),
    staleTime: 600_000,
    enabled: vendorId > 0,
    retry: false,
  })

  const topFactors = shap?.top_risk_factors?.slice(0, 3) ?? []
  const riskScore = shap?.risk_score

  if (isLoading) return <MemoSkeleton />

  // No SHAP data at all — plain placeholder
  if (!shap) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <FileText className="h-8 w-8 text-text-muted/40" />
        <p className="text-sm text-text-muted">
          Análisis narrativo no disponible para{' '}
          <span className="font-semibold text-text-secondary">{vendorName}</span>
        </p>
        <p className="text-[11px] text-text-muted/70 max-w-xs leading-relaxed">
          Este proveedor no ha sido analizado aún por el pipeline de investigación.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stub disclaimer */}
      <div className="px-4 py-3 border-l-4 border-border bg-background-elevated/40 rounded-sm">
        <p className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-1 font-mono">
          Perfil algorítmico · sin memo investigativo
        </p>
        <p className="text-xs text-text-secondary leading-relaxed">
          No existe memo narrativo para este proveedor. Se muestran las señales
          del modelo de riesgo v0.8.5 como punto de partida para investigación.{' '}
          <strong className="text-text-primary">Requiere verificación periodística independiente.</strong>
        </p>
      </div>

      {/* Model signal summary */}
      {riskScore != null && (
        <div className="flex items-baseline gap-3">
          <span
            className="text-3xl font-bold tabular-nums leading-none"
            style={{ fontFamily: 'var(--font-family-serif)', color: riskScore >= 0.60 ? 'var(--color-risk-critical)' : riskScore >= 0.40 ? 'var(--color-risk-high)' : riskScore >= 0.25 ? 'var(--color-risk-medium)' : 'var(--color-text-muted)' }}
          >
            {(riskScore * 100).toFixed(0)}
          </span>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Indicador de riesgo · escala 0–100
            </p>
            <p className="text-[10px] text-text-muted/60">
              {shap.n_contracts?.toLocaleString('es-MX') ?? '—'} contratos analizados
            </p>
          </div>
        </div>
      )}

      {/* Top risk factors */}
      {topFactors.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            Factores de riesgo principales
          </p>
          {topFactors.map((factor, i) => {
            const label = FACTOR_LABELS[factor.factor] ?? factor.label_es ?? factor.factor
            const pct = Math.min(100, Math.abs(factor.shap) * 200)
            return (
              <div key={factor.factor} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">
                    <span className="font-mono text-[10px] text-text-muted mr-2">{i + 1}.</span>
                    {label}
                  </span>
                  <span className="text-[10px] font-mono text-risk-high">
                    +{factor.shap.toFixed(3)}
                  </span>
                </div>
                <div className="h-1 bg-border/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-risk-high/60 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[10px] text-text-muted/60 italic border-t border-border/30 pt-3">
        Análisis generado por modelo — no sustituye investigación periodística
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AriaMemoPanel({ vendorId, vendorName, tier, isFalsePositive, fpReason, className }: AriaMemoProps) {
  const { t } = useTranslation('aria')
  const [copied, setCopied] = useState(false)

  const { data: memo, isLoading, error } = useQuery<AriaMemoResponse | null>({
    queryKey: ['aria-memo', vendorId],
    queryFn: () => ariaApi.getMemo(vendorId),
    staleTime: 600_000, // 10 min
    enabled: vendorId > 0,
  })

  // Provenance — prefer the canonical memo_type column from S.3 classification,
  // fall back to text heuristic if API doesn't return it (e.g. older deploys).
  const memoText = memo?.memo_text ?? ''
  const memoType = memo?.memo_type
  const isTemplated = memoType === 'template' || memoType === 'duplicate' || isTemplatedMemo(memoText)
  const hasStaleScore = hasStaleModelReference(memoText)

  async function handleCopy() {
    if (!memo?.memo_text) return
    try {
      await navigator.clipboard.writeText(memo.memo_text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API may fail in some contexts
    }
  }

  const effectiveTier = memo?.tier ?? tier

  return (
    <div
      className={cn(
        'bg-background-card border border-border rounded-sm overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background-elevated/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-semibold text-text-primary">
            Análisis de Investigación
          </span>
          <span className="text-[10px] text-text-muted">Generado por IA</span>
          {effectiveTier != null && <TierBadge tier={effectiveTier} />}
          {/* S.3 provenance badge */}
          {memoType === 'llm_narrative' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
              LLM
            </span>
          )}
          {(memoType === 'template' || memoType === 'duplicate') && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-risk-medium/10 text-risk-medium border border-risk-medium/20">
              PLANTILLA
            </span>
          )}
          {memoType === 'stub' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-border/40 text-text-muted border border-border">
              STUB
            </span>
          )}
        </div>
        {(memo?.generated_at ?? memo?.created_at) && (
          <span className="text-[10px] text-text-muted font-mono">
            {new Date((memo.generated_at ?? memo.created_at)!).toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {isLoading ? (
          <MemoSkeleton />
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-risk-critical py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t('memo.loadError')}
          </div>
        ) : memo?.memo_text ? (
          <>
            {/* === Provenance disclaimer banners (docs/DATA_INTEGRITY_PLAN.md N.2-N.4) === */}
            {isFalsePositive && (
              <div className="mb-4 px-4 py-3 border-l-4 border-text-muted bg-text-muted/10 rounded-sm">
                <p className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-1">
                  ⚠ Marcado como falso positivo estructural
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Este vendor es un proveedor multinacional o estructural. La concentración refleja su posición de mercado,
                  <strong className="text-text-primary"> no evidencia de fraude.</strong> El perfil se mantiene únicamente para transparencia metodológica.
                  {fpReason && <span className="block mt-1 text-text-muted font-mono text-[10px]">Motivo: {fpReason}</span>}
                </p>
              </div>
            )}
            {isTemplated && !isFalsePositive && (
              <div className="mb-4 px-4 py-3 border-l-4 border-risk-medium bg-risk-medium/10 rounded-sm">
                <p className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-1">
                  Memo automático · sin verificación humana
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Este memo fue generado por plantilla, no por análisis investigativo. La sección "FUENTES" sugiere búsquedas manuales
                  (no son citaciones verificadas). <strong className="text-text-primary">Use solo como punto de partida</strong> para investigación periodística.
                </p>
              </div>
            )}
            {hasStaleScore && (
              <div className="mb-4 px-4 py-2 border-l-2 border-risk-medium/50 bg-risk-medium/5 rounded-sm">
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  ⓘ Memo escrito antes del modelo activo v0.8.5 (mayo 2026). Las puntuaciones citadas pueden no coincidir con los valores actuales.
                </p>
              </div>
            )}
            <div
              className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              {memo.memo_text}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-text-muted" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </>
                )}
              </button>
              <span className="text-[10px] text-text-muted italic">
                Generado automáticamente — requiere verificación periodística
              </span>
            </div>
          </>
        ) : (
          <MemoEmptyState vendorId={vendorId} vendorName={vendorName} />
        )}
      </div>
    </div>
  )
}

export default AriaMemoPanel
