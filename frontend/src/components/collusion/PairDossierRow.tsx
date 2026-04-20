/**
 * PairDossierRow — one line in a forensic docket.
 *
 * Replaces the old PairCard. Reads as a single editorial row (not two cards
 * glued together), with asymmetry as the central visual argument.
 *
 * Variants:
 *   full    — top-5-flagged row: kicker + duet arrow + deck quote + shares bar
 *   compact — every other row: kicker + duet arrow inline, no deck
 */

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileText, ChevronRight } from 'lucide-react'
import type { CollusionPair } from '@/api/types'
import { formatNumber } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import {
  computePairMetrics,
  patternAccent,
  patternKickerClass,
  patternLabel,
  quoteFor,
} from '@/lib/collusion/inferPattern'
import { DuetArrow } from './DuetArrow'

type Variant = 'full' | 'compact'

interface PairDossierRowProps {
  pair: CollusionPair
  rank: number
  variant?: Variant
  onViewContracts: (
    vendorAId: number,
    vendorBId: number,
    vendorAName: string,
    vendorBName: string,
  ) => void
}

export function PairDossierRow({
  pair,
  rank,
  variant = 'full',
  onViewContracts,
}: PairDossierRowProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('collusion')

  const metrics = computePairMetrics(pair)
  const accent = patternAccent(metrics.pattern)
  const kickerClass = patternKickerClass(metrics.pattern)
  const label = patternLabel(metrics.pattern)
  // Pretty-printed names for the deck quote and the vendor labels. The quote
  // uses a shorter cap so a two-name sentence still fits one line on mobile.
  const nameA = formatVendorName(pair.vendor_name_a, variant === 'full' ? 30 : 24)
  const nameB = formatVendorName(pair.vendor_name_b, variant === 'full' ? 30 : 24)
  const deck = quoteFor(
    { ...pair, vendor_name_a: nameA, vendor_name_b: nameB },
    metrics,
  )

  // Flagged rows (is_potential_collusion) get a thicker left edge; others,
  // a hairline. No pulsing, no pills — seriousness from restraint.
  const flagged = pair.is_potential_collusion
  const leftEdge = flagged ? '2px' : '1px'

  // Share bar: width ∝ shared_procedures / max(vendor_a, vendor_b). Gives
  // a sense of the pair's scale relative to the larger vendor.
  const maxProcs = Math.max(pair.vendor_a_procedures, pair.vendor_b_procedures)
  const sharesBarPct =
    maxProcs > 0
      ? Math.min(100, (pair.shared_procedures / maxProcs) * 100)
      : 0

  return (
    <article
      className="group relative bg-zinc-950 hover:bg-zinc-900/40 transition-colors"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        borderLeft: `${leftEdge} solid ${flagged ? accent : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      <div className={variant === 'compact' ? 'px-5 py-3' : 'px-5 py-4'}>
        {/* Kicker row: rank + pattern + shared count */}
        <div className="flex items-center gap-3 mb-2">
          <span
            className="font-mono text-[11px] font-bold tracking-[0.08em] tabular-nums"
            style={{
              color: flagged ? accent : '#52525b',
              fontFamily: 'var(--font-family-serif)',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '-0.01em',
            }}
          >
            {String(rank).padStart(2, '0')}
          </span>
          <span className={kickerClass} style={{ color: flagged ? accent : undefined }}>
            {label}
          </span>
          <span className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.15em] ml-auto tabular-nums">
            {formatNumber(pair.shared_procedures)} {t('dossier.sharedSuffix', { defaultValue: 'procs compartidos' })}
          </span>
        </div>

        {/* Duet line: VENDOR A   ◀── N% ──▶   VENDOR B */}
        <div className="grid grid-cols-[1fr_180px_1fr] items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/vendors/${pair.vendor_id_a}`)}
            className="min-w-0 text-right group/v"
            aria-label={`${t('pairCard.viewProfile')}: ${pair.vendor_name_a}`}
          >
            <div
              className="truncate text-zinc-100 group-hover/v:text-white transition-colors"
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontWeight: 600,
                fontSize: '0.95rem',
                letterSpacing: '-0.005em',
              }}
            >
              {nameA}
            </div>
            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.12em] mt-0.5 tabular-nums">
              {formatNumber(pair.vendor_a_procedures)} {t('dossier.procsSuffix', { defaultValue: 'procedimientos' })} · {metrics.shareA.toFixed(0)}% {t('dossier.overlapWith', { defaultValue: 'con pareja' })}
            </div>
          </button>

          <div className="flex items-center justify-center">
            <DuetArrow
              shareA={metrics.shareA}
              shareB={metrics.shareB}
              centerLabel={`${pair.co_bid_rate.toFixed(0)}%`}
              accent={accent}
              height={variant === 'compact' ? 22 : 30}
            />
          </div>

          <button
            type="button"
            onClick={() => navigate(`/vendors/${pair.vendor_id_b}`)}
            className="min-w-0 text-left group/v"
            aria-label={`${t('pairCard.viewProfile')}: ${pair.vendor_name_b}`}
          >
            <div
              className="truncate text-zinc-100 group-hover/v:text-white transition-colors"
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontWeight: 600,
                fontSize: '0.95rem',
                letterSpacing: '-0.005em',
              }}
            >
              {nameB}
            </div>
            <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.12em] mt-0.5 tabular-nums">
              {formatNumber(pair.vendor_b_procedures)} {t('dossier.procsSuffix', { defaultValue: 'procedimientos' })} · {metrics.shareB.toFixed(0)}% {t('dossier.overlapWith', { defaultValue: 'con pareja' })}
            </div>
          </button>
        </div>

        {/* Full variant only: shares bar + deck quote + action row */}
        {variant === 'full' && (
          <>
            {/* Shares bar — single hairline bar showing scale of the duet vs the larger vendor */}
            <div className="mt-3 flex items-center gap-3">
              {(() => {
                const N = 30, DR = 1.5, DG = 4
                const filled = Math.max(1, Math.round((sharesBarPct / 100) * N))
                return (
                  <svg viewBox={`0 0 ${N * DG} 4`} className="flex-1" style={{ height: 4 }} preserveAspectRatio="none" aria-hidden="true">
                    {Array.from({ length: N }).map((_, k) => (
                      <circle key={k} cx={k * DG + DR} cy={2} r={DR}
                        fill={k < filled ? accent : '#2d2926'}
                        fillOpacity={k < filled ? 0.8 : 0.3}
                      />
                    ))}
                  </svg>
                )
              })()}
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.15em] tabular-nums">
                {sharesBarPct.toFixed(0)}% {t('dossier.ofLarger', { defaultValue: 'del mayor' })}
              </span>
            </div>

            {/* Deck quote — italic serif, like a lede */}
            <p
              className="mt-3 text-zinc-300 max-w-3xl"
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontStyle: 'italic',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                color: 'rgb(212 212 216)',
              }}
            >
              “{deck}”
            </p>

            {/* Action row */}
            <div className="mt-3 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.15em]">
              <button
                type="button"
                onClick={() =>
                  onViewContracts(
                    pair.vendor_id_a,
                    pair.vendor_id_b,
                    pair.vendor_name_a,
                    pair.vendor_name_b,
                  )
                }
                className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <FileText className="h-3 w-3" aria-hidden="true" />
                {t('pairCard.sharedContracts')}
              </button>
              {pair.is_potential_collusion && (
                <button
                  type="button"
                  onClick={() => navigate(`/thread/${pair.vendor_id_a}`)}
                  className="inline-flex items-center gap-1.5 transition-colors"
                  style={{ color: accent }}
                >
                  {t('pairCard.investigationThread')}
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </div>
          </>
        )}

        {/* Compact variant: single-line action cluster on the right */}
        {variant === 'compact' && (
          <div className="mt-2 flex items-center justify-end gap-3 text-[10px] font-mono text-zinc-600 uppercase tracking-[0.12em]">
            <button
              type="button"
              onClick={() =>
                onViewContracts(
                  pair.vendor_id_a,
                  pair.vendor_id_b,
                  pair.vendor_name_a,
                  pair.vendor_name_b,
                )
              }
              className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <FileText className="h-3 w-3" aria-hidden="true" />
              {t('pairCard.sharedContracts')}
            </button>
            {pair.is_potential_collusion && (
              <button
                type="button"
                onClick={() => navigate(`/thread/${pair.vendor_id_a}`)}
                className="inline-flex items-center gap-1 transition-colors"
                style={{ color: accent }}
              >
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
