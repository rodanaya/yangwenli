/**
 * GhostSuspectsPanel — extracted from pages/AriaQueue.tsx (was ~167 LOC inline).
 *
 * Renders the P2 ghost-company confidence analysis panel: tier tabs
 * (confirmed / multi_signal / behavioral), paginated suspects list with
 * 11 independent signal pills, navigation to vendor profile on click.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'

import { ariaApi } from '@/api/client'
import type { GhostSuspect } from '@/api/types'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export const TIER_GHOST_META = {
  confirmed:    { label: 'Confirmed',    labelEs: 'Confirmado',    color: 'var(--color-risk-critical)', bg: 'bg-risk-critical/10',   border: 'border-risk-critical/30', dot: 'bg-risk-critical' },
  multi_signal: { label: 'Multi-Signal', labelEs: 'Multi-Señal',   color: 'var(--color-risk-high)',     bg: 'bg-risk-high/10',       border: 'border-risk-high/30',     dot: 'bg-risk-high' },
  behavioral:   { label: 'Behavioral',   labelEs: 'Conductual',    color: 'var(--color-text-muted)',    bg: 'bg-background-elevated', border: 'border-border',           dot: 'bg-background-elevated' },
} as const

export const SIG_LABELS: Record<string, { en: string; es: string }> = {
  sig_efos_definitivo:  { en: 'SAT confirmed shell', es: 'SAT: empresa fantasma confirmada' },
  sig_sfp_sanctioned:   { en: 'SFP sanctioned', es: 'SFP: sancionado' },
  sig_efos_soft:        { en: 'SAT under review', es: 'SAT: bajo revisión' },
  sig_p7_intersection:  { en: 'P7 intermediary overlap', es: 'Solapamiento P7 intermediario' },
  sig_disappeared:      { en: 'Disappeared from market', es: 'Desaparecido del mercado' },
  sig_invalid_rfc:      { en: 'Invalid RFC', es: 'RFC inválido' },
  sig_young_company:    { en: '<2yr at first contract', es: '<2 años al primer contrato' },
  sig_high_risk:        { en: 'Risk score ≥0.50', es: 'Puntaje de riesgo ≥0.50' },
  sig_temporal_burst:   { en: 'Temporal burst', es: 'Ráfaga temporal' },
  sig_ultra_micro:      { en: '≤3 lifetime contracts', es: '≤3 contratos de por vida' },
  sig_short_lived:      { en: '≤1yr active', es: '≤1 año activo' },
}

const SIG_KEYS = Object.keys(SIG_LABELS) as (keyof GhostSuspect)[]

interface GhostSuspectsPanelProps {
  isEs: boolean
}

export function GhostSuspectsPanel({ isEs }: GhostSuspectsPanelProps) {
  const navigate = useNavigate()
  const [tierTab, setTierTab] = useState<'confirmed' | 'multi_signal' | 'behavioral'>('confirmed')
  const [ghostPage, setGhostPage] = useState(1)
  const GHOST_PER_PAGE = 20

  const { data: ghostData, isLoading: ghostLoading } = useQuery({
    queryKey: ['ghost-suspects', { tier: tierTab, page: ghostPage }],
    queryFn: () => ariaApi.getGhostSuspects({ tier: tierTab, page: ghostPage, per_page: GHOST_PER_PAGE }),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const tierSummary = ghostData?.tier_summary ?? { confirmed: 0, multi_signal: 0, behavioral: 0 }
  const suspects = ghostData?.data ?? []
  const totalPages = ghostData ? Math.ceil(ghostData.pagination.total / GHOST_PER_PAGE) : 0

  if (ghostData === undefined && !ghostLoading) return null

  return (
    <div className="mt-4 rounded-sm border border-risk-high/30 bg-risk-high/[0.03]">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-risk-high/15 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-risk-high">
            {isEs ? 'ANÁLISIS DE CONFIANZA · EMPRESAS FANTASMA' : 'GHOST CONFIDENCE ANALYSIS'}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {isEs
              ? '11 señales independientes — convergen para producir una cola de investigación defendible'
              : '11 independent signals — convergence builds a defensible investigation referral'}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-text-muted">
          <span>{isEs ? 'puntuado' : 'scored'}</span>
          <span className="text-risk-high">{(tierSummary.confirmed + tierSummary.multi_signal + tierSummary.behavioral).toLocaleString()}</span>
          <span>{isEs ? 'proveedores P2' : 'P2 vendors'}</span>
        </div>
      </div>

      {/* Tier tabs */}
      <div className="px-4 pt-3 pb-2 flex gap-2 flex-wrap">
        {(['confirmed', 'multi_signal', 'behavioral'] as const).map((tier) => {
          const meta = TIER_GHOST_META[tier]
          const count = tierSummary[tier]
          return (
            <button
              key={tier}
              onClick={() => { setTierTab(tier); setGhostPage(1) }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors',
                tierTab === tier
                  ? cn(meta.bg, meta.border)
                  : 'bg-background-card text-text-secondary border-border hover:border-border-hover'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)} />
              <span style={tierTab === tier ? { color: meta.color } : undefined}>
                {isEs ? meta.labelEs : meta.label}
              </span>
              <span className="font-mono tabular-nums text-text-muted">{count.toLocaleString()}</span>
            </button>
          )
        })}
        <div className="ml-auto self-center text-[10px] text-text-muted font-mono hidden sm:block">
          {tierTab === 'confirmed' && (isEs ? 'Verificación externa (EFOS SAT / SFP)' : 'External verification (EFOS SAT / SFP)')}
          {tierTab === 'multi_signal' && (isEs ? '3+ señales independientes convergentes' : '3+ independent signals converging')}
          {tierTab === 'behavioral' && (isEs ? 'Solo patrón P2 — evidencia adicional necesaria' : 'P2 pattern only — additional evidence needed')}
        </div>
      </div>

      {/* Suspects list */}
      <div className="px-4 pb-4">
        {ghostLoading ? (
          <div className="space-y-1.5 pt-1">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-sm" />)}
          </div>
        ) : suspects.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-muted">
            {isEs ? 'No hay sospechosos en este nivel' : 'No suspects in this tier'}
          </div>
        ) : (
          <div className="space-y-1 pt-1">
            {suspects.map((s) => {
              const meta = TIER_GHOST_META[s.ghost_confidence_tier]
              const activeSigs = SIG_KEYS.filter((k) => s[k] === 1)
              return (
                <button
                  key={s.vendor_id}
                  onClick={() => navigate(`/vendors/${s.vendor_id}`)}
                  className="w-full text-left group flex items-start gap-3 px-3 py-2.5 rounded-sm border border-transparent hover:border-border hover:bg-background-card transition-all"
                >
                  {/* Score badge */}
                  <div className="shrink-0 w-10 text-right pt-0.5">
                    <span className="font-mono font-bold text-sm tabular-nums" style={{ color: meta.color }}>
                      {s.ghost_confidence_score.toFixed(1)}
                    </span>
                  </div>

                  {/* Name + signals */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-text-primary truncate group-hover:text-text-primary">
                        {s.vendor_name || `#${s.vendor_id}`}
                      </span>
                      {s.total_contracts != null && (
                        <span className="text-[10px] font-mono text-text-muted shrink-0">
                          {s.total_contracts} {isEs ? 'contratos' : 'contracts'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {activeSigs.map((k) => {
                        const keyStr = k as string
                        const sigLabel = SIG_LABELS[keyStr]
                        const isExternal = keyStr === 'sig_efos_definitivo' || keyStr === 'sig_sfp_sanctioned'
                        return (
                          <span
                            key={keyStr}
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0.5 rounded-sm border',
                              isExternal
                                ? 'bg-risk-critical/10 border-risk-critical/30 text-risk-critical'
                                : 'bg-background-elevated border-border text-text-secondary'
                            )}
                          >
                            {isEs ? sigLabel.es : sigLabel.en}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Signals count */}
                  <div className="shrink-0 self-center">
                    <span className="text-[10px] font-mono tabular-nums text-text-muted">
                      {s.ghost_signal_count} {isEs ? 'señ' : 'sig'}
                    </span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-text-primary group-hover:text-accent group-hover:translate-x-0.5 transition-all self-center shrink-0" />
                </button>
              )
            })}
          </div>
        )}

        {/* Ghost pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <button
              onClick={() => setGhostPage(Math.max(1, ghostPage - 1))}
              disabled={ghostPage === 1}
              className="px-3 py-1 text-xs border border-border rounded-sm text-text-secondary hover:border-border-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
            >← {isEs ? 'Anterior' : 'Previous'}</button>
            <span className="text-xs text-text-muted font-mono tabular-nums">
              {ghostPage} / {totalPages}
            </span>
            <button
              onClick={() => setGhostPage(Math.min(totalPages, ghostPage + 1))}
              disabled={ghostPage === totalPages}
              className="px-3 py-1 text-xs border border-border rounded-sm text-text-secondary hover:border-border-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-mono"
            >{isEs ? 'Siguiente' : 'Next'} →</button>
          </div>
        )}
      </div>
    </div>
  )
}
