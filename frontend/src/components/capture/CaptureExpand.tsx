/**
 * CaptureExpand — the on-click pair file beneath a trajectory card.
 *
 * Three bands (ported from the retired CaptureRegister RowDocket): the year-by-
 * year money ledger (timeline[].value_mxn), the lazy ARIA model cross-light
 * (the full risk word — the at-rest seal already shows GT/Tier), and the
 * institution's place on the record. All per-entity fetches stay LAZY — fired
 * only when a card is expanded, never on first paint.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ariaApi,
  institutionApi,
  type CaptureItem,
  type CaptureTopResponse,
  type CaptureLandscapeResponse,
} from '@/api/client'
import { formatCompactMXN } from '@/lib/utils'
import { getRiskLevelFromScore } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { Skeleton } from '@/components/ui/skeleton'

const RISK_WORD: Record<string, { es: string; en: string }> = {
  critical: { es: 'crítico', en: 'critical' },
  high: { es: 'alto', en: 'high' },
  medium: { es: 'medio', en: 'medium' },
  low: { es: 'bajo', en: 'low' },
}

const bandTitle =
  'text-[13px] font-mono font-bold uppercase tracking-[0.16em] text-text-muted mb-2'

export function CaptureExpand({
  c,
  lang,
  thresholds,
  landscape,
}: {
  c: CaptureItem
  lang: 'en' | 'es'
  thresholds: CaptureTopResponse['thresholds']
  landscape?: CaptureLandscapeResponse
}) {
  const { data: ariaEntry, isLoading: ariaLoading } = useQuery({
    queryKey: ['aria', 'entry', c.vendor_id],
    queryFn: () => ariaApi.getAriaQueueEntry(c.vendor_id),
    staleTime: 30 * 60 * 1000,
    retry: false,
  })
  const { data: instDetail } = useQuery({
    queryKey: ['institution', 'detail', c.institution_id],
    queryFn: () => institutionApi.getById(c.institution_id),
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  const fieldFacts = useMemo(() => {
    if (!landscape) return null
    const idx = landscape.ticks.findIndex((t) => t[0] === c.institution_id)
    if (idx === -1) return null
    const below = landscape.qualifying_count - idx - 1
    const pct = Math.round((100 * below) / landscape.qualifying_count)
    return { share: landscape.ticks[idx][3], pct }
  }, [landscape, c.institution_id])

  const maxVal = useMemo(
    () => Math.max(1, ...c.timeline.map((p) => p.value_mxn)),
    [c.timeline],
  )
  const ceil = thresholds.ceil_share_pct
  const riskLevel = ariaEntry != null ? getRiskLevelFromScore(ariaEntry.avg_risk_score) : null

  return (
    <div
      role="region"
      className="px-5 py-4 bg-background-elevated grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-x-6 gap-y-5"
      style={{ borderTop: '1px solid rgba(160, 104, 32, 0.25)' }}
    >
      {/* Band A — year-by-year receipts */}
      <div>
        <p className={bandTitle}>
          {lang === 'en' ? '§ The money, year by year' : '§ El dinero, año con año'}
        </p>
        <div className="flex items-end gap-1.5" style={{ height: 56 }}>
          {[...c.timeline]
            .sort((a, b) => a.year - b.year)
            .map((p) => {
              const h = 4 + 44 * (p.value_mxn / maxVal)
              return (
                <div key={p.year} className="flex flex-col items-center gap-1" title={`${p.year} · ${p.share_pct}% · ${formatCompactMXN(p.value_mxn)}`}>
                  <div
                    style={{
                      width: 12,
                      height: h,
                      background: p.share_pct >= ceil ? 'var(--color-risk-critical)' : '#71717a',
                      opacity: p.share_pct >= ceil ? 0.85 : 0.5,
                    }}
                  />
                  <span className="font-mono text-[8px] text-text-muted tabular-nums">
                    {String(p.year).slice(2)}
                  </span>
                </div>
              )
            })}
        </div>
        <p className="mt-2 font-mono text-[13px] text-text-muted tabular-nums">
          {lang === 'en' ? 'bars = MXN awarded per year · red ≥ 50%' : 'barras = MXN adjudicados por año · rojo ≥ 50%'}
        </p>
      </div>

      {/* Band B — model cross-light (lazy full risk word) */}
      <div>
        <p className={bandTitle}>
          {lang === 'en' ? '§ Model cross-light' : '§ Contraluz del modelo'}
        </p>
        <p
          className="mb-2.5"
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'normal',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'var(--color-text-secondary)',
          }}
        >
          {lang === 'en'
            ? 'The arithmetic leads; the model only comments.'
            : 'La aritmética manda; el modelo solo opina.'}
        </p>
        {ariaLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : ariaEntry ? (
          <div className="space-y-2">
            <EntityIdentityChip
              type="vendor"
              id={c.vendor_id}
              name={c.vendor_name}
              size="sm"
              ariaTier={ariaEntry.ips_tier}
              flags={
                [
                  ...(ariaEntry.in_ground_truth ? ['gt'] : []),
                  ...(ariaEntry.is_efos_definitivo ? ['efos'] : []),
                  ...(ariaEntry.is_sfp_sanctioned ? ['sfp'] : []),
                ] as Array<'gt' | 'efos' | 'sfp'>
              }
              className="max-w-full"
            />
            {riskLevel && (
              <p className="font-mono text-[12px] uppercase tracking-wider text-text-secondary">
                {lang === 'en' ? 'risk indicator' : 'indicador de riesgo'}:{' '}
                <span
                  style={{
                    color:
                      riskLevel === 'low'
                        ? 'var(--color-text-muted)'
                        : `var(--color-risk-${riskLevel})`,
                    fontWeight: 700,
                  }}
                >
                  {RISK_WORD[riskLevel][lang]} {ariaEntry.avg_risk_score.toFixed(2)}
                </span>
              </p>
            )}
          </div>
        ) : (
          <p className="font-mono text-[12px] text-text-muted">
            {lang === 'en'
              ? 'No ARIA file — the arithmetic stands alone.'
              : 'Sin expediente ARIA — la aritmética habla sola.'}
          </p>
        )}
      </div>

      {/* Band C — the institution on record */}
      <div>
        <p className={bandTitle}>
          {lang === 'en' ? '§ The institution on record' : '§ La institución en el registro'}
        </p>
        <div className="space-y-1.5 font-mono text-[12px] text-text-secondary tabular-nums">
          {fieldFacts && (
            <p>
              {lang === 'en'
                ? `№1 vendor holds ${fieldFacts.share}% of the record — more concentrated than ${fieldFacts.pct}% of the field`
                : `El №1 acumula ${fieldFacts.share}% del registro — más concentrada que el ${fieldFacts.pct}% del campo`}
            </p>
          )}
          {instDetail?.direct_award_rate != null && (
            <p>
              {lang === 'en' ? 'direct award' : 'adjudicación directa'}{' '}
              {instDetail.direct_award_rate.toFixed(1)}%
            </p>
          )}
          {instDetail?.single_bid_pct != null && (
            <p>
              {lang === 'en' ? 'single bid' : 'oferta única'}{' '}
              {instDetail.single_bid_pct.toFixed(1)}%
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <EntityIdentityChip
            type="institution"
            id={c.institution_id}
            name={c.institution_name}
            size="sm"
          />
          <EntityIdentityChip
            type="pattern"
            id="P6"
            name={lang === 'en' ? 'Capture pattern (P6)' : 'Patrón de captura (P6)'}
            size="sm"
          />
        </div>
      </div>
    </div>
  )
}
