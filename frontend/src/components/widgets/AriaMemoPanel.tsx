/**
 * AriaMemoPanel — displays LLM-generated investigation memos for a vendor
 *
 * Fetches from GET /aria/memos/{vendorId} and renders in a dark editorial card.
 * Shows loading skeleton, error, and empty states.
 */

import { useState } from 'react'
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
  className?: string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TierBadge({ tier }: { tier: number }) {
  const colors: Record<number, string> = {
    1: 'bg-red-600/20 text-red-400 border-red-600/30',
    2: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
    3: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    4: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  }
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border', colors[tier] ?? colors[4])}>
      Tier {tier}
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

export function AriaMemoPanel({ vendorId, vendorName, tier, className }: AriaMemoProps) {
  const [copied, setCopied] = useState(false)

  const { data: memo, isLoading, error } = useQuery<AriaMemoResponse | null>({
    queryKey: ['aria-memo', vendorId],
    queryFn: () => ariaApi.getMemo(vendorId),
    staleTime: 600_000, // 10 min
    enabled: vendorId > 0,
  })

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
        'bg-background-card border border-border rounded-xl overflow-hidden',
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
          <div className="flex items-center gap-2 text-sm text-red-400 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Error al cargar memo
          </div>
        ) : memo?.memo_text ? (
          <>
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
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
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
            <button
              className="text-xs text-accent hover:text-accent-hover transition-colors mt-1"
              onClick={() => {
                // Navigate to ARIA queue — non-functional placeholder
              }}
            >
              Solicitar análisis
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AriaMemoPanel
