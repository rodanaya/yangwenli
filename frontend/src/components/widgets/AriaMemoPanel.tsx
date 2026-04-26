/**
 * AriaMemoPanel — displays LLM-generated investigation memos for a vendor
 *
 * Fetches from GET /aria/memos/{vendorId} and renders in a dark editorial card.
 * Shows loading skeleton, error, and empty states.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ariaApi } from '@/api/client'
import type { AriaMemoResponse } from '@/api/client'
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
  const memoType = (memo as { memo_type?: string } | null | undefined)?.memo_type
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
        </div>
        {memo?.generated_at && (
          <span className="text-[10px] text-text-muted font-mono">
            {new Date(memo.generated_at).toLocaleDateString('es-MX', {
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
                  ⓘ Memo escrito antes del rescore de marzo 2026 (modelo v0.6.5). Las puntuaciones citadas pueden no coincidir con los valores actuales.
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
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="h-8 w-8 text-text-muted/40" />
            <p className="text-sm text-text-muted">
              Memo no disponible para{' '}
              <span className="font-semibold text-text-secondary">{vendorName}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AriaMemoPanel
