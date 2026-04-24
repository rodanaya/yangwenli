/**
 * FeaturedDuet — the lede card.
 *
 * Front-page editorial callout for the single most egregious pair on the
 * current result set. Same vocabulary as PairDossierRow (kicker, asymmetric
 * duet arrow, deck quote) but scaled up, with a blockquote-style left rule
 * and a more generous drop-cap style lede.
 *
 * Chosen pair = flagged AND highest asymmetry (|shareA − shareB|), with
 * shared_procedures ≥ 10 as a floor to avoid tiny-sample artefacts.
 */

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, FileText } from 'lucide-react'
import type { CollusionPair } from '@/api/types'
import { formatNumber } from '@/lib/utils'
import { formatVendorName } from '@/lib/vendor/formatName'
import {
  computePairMetrics,
  patternAccent,
  patternLabel,
  quoteFor,
} from '@/lib/collusion/inferPattern'
import { DuetArrow } from './DuetArrow'

interface FeaturedDuetProps {
  pair: CollusionPair
  onViewContracts: (
    vendorAId: number,
    vendorBId: number,
    vendorAName: string,
    vendorBName: string,
  ) => void
}

/**
 * Pick the most striking pair from a list. Prefers flagged + high asymmetry.
 * Returns null if there's nothing worth featuring.
 */
export function pickFeaturedPair(pairs: CollusionPair[]): CollusionPair | null {
  if (!pairs.length) return null

  const eligible = pairs.filter(
    (p) => p.is_potential_collusion && p.shared_procedures >= 10,
  )
  const pool = eligible.length > 0 ? eligible : pairs

  let best: { pair: CollusionPair; score: number } | null = null
  for (const p of pool) {
    const m = computePairMetrics(p)
    // Composite: asymmetry (0..100) + 0.5× max share — rewards both
    // "one vendor shadows the other" AND "overlap is high at all".
    const score = m.asymmetry + Math.max(m.shareA, m.shareB) * 0.5
    if (!best || score > best.score) {
      best = { pair: p, score }
    }
  }
  return best?.pair ?? null
}

export function FeaturedDuet({ pair, onViewContracts }: FeaturedDuetProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('collusion')

  const metrics = computePairMetrics(pair)
  const accent = patternAccent(metrics.pattern)
  const label = patternLabel(metrics.pattern)

  const nameA = formatVendorName(pair.vendor_name_a, 36)
  const nameB = formatVendorName(pair.vendor_name_b, 36)
  const deck = quoteFor(
    { ...pair, vendor_name_a: nameA, vendor_name_b: nameB },
    metrics,
  )

  // Which vendor is the "shadow" (higher share) — used for the threading link.
  const leadVendor =
    metrics.shareA >= metrics.shareB
      ? { id: pair.vendor_id_a, name: nameA }
      : { id: pair.vendor_id_b, name: nameB }

  return (
    <section
      aria-label={t('featured.aria', { defaultValue: 'Pareja destacada' })}
      className="relative mb-10 overflow-hidden"
      style={{
        background:
          'linear-gradient(180deg, rgba(239,68,68,0.04) 0%, rgba(9,9,11,0) 70%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div className="px-6 md:px-8 py-7 md:py-9">
        {/* Kicker */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-kicker"
            style={{ color: accent, letterSpacing: '0.15em', fontWeight: 700 }}
          >
            Caso destacado · {label}
          </span>
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-[0.12em] tabular-nums">
            Asimetría {metrics.asymmetry.toFixed(0)}% ·{' '}
            {formatNumber(pair.shared_procedures)}{' '}
            {t('dossier.sharedSuffix', { defaultValue: 'procs compartidos' })}
          </span>
        </div>

        {/* Duet headline: NAMES in serif, arrow in middle */}
        <div className="grid md:grid-cols-[1fr_240px_1fr] gap-4 md:gap-6 items-center mb-5">
          <button
            type="button"
            onClick={() => navigate(`/vendors/${pair.vendor_id_a}`)}
            className="text-left md:text-right group"
            aria-label={`${t('pairCard.viewProfile')}: ${nameA}`}
          >
            <div
              className="text-text-primary group-hover:text-text-primary transition-colors"
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontWeight: 600,
                fontSize: 'clamp(1.15rem, 2.2vw, 1.6rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
              }}
            >
              {nameA}
            </div>
            <div className="text-[10px] font-mono text-text-muted uppercase tracking-[0.12em] mt-1 tabular-nums">
              {formatNumber(pair.vendor_a_procedures)}{' '}
              {t('dossier.procsSuffix', { defaultValue: 'procedimientos' })} ·{' '}
              {metrics.shareA.toFixed(0)}%{' '}
              {t('dossier.overlapWith', { defaultValue: 'con pareja' })}
            </div>
          </button>

          <div className="flex items-center justify-center">
            <DuetArrow
              shareA={metrics.shareA}
              shareB={metrics.shareB}
              centerLabel={`${pair.co_bid_rate.toFixed(0)}%`}
              accent={accent}
              height={44}
            />
          </div>

          <button
            type="button"
            onClick={() => navigate(`/vendors/${pair.vendor_id_b}`)}
            className="text-left group"
            aria-label={`${t('pairCard.viewProfile')}: ${nameB}`}
          >
            <div
              className="text-text-primary group-hover:text-text-primary transition-colors"
              style={{
                fontFamily: 'var(--font-family-serif)',
                fontWeight: 600,
                fontSize: 'clamp(1.15rem, 2.2vw, 1.6rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
              }}
            >
              {nameB}
            </div>
            <div className="text-[10px] font-mono text-text-muted uppercase tracking-[0.12em] mt-1 tabular-nums">
              {formatNumber(pair.vendor_b_procedures)}{' '}
              {t('dossier.procsSuffix', { defaultValue: 'procedimientos' })} ·{' '}
              {metrics.shareB.toFixed(0)}%{' '}
              {t('dossier.overlapWith', { defaultValue: 'con pareja' })}
            </div>
          </button>
        </div>

        {/* Deck quote — generous, pull-quote scale */}
        <blockquote
          className="max-w-3xl text-text-secondary mb-5"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(1rem, 1.4vw, 1.125rem)',
            lineHeight: 1.55,
            borderLeft: `2px solid ${accent}`,
            paddingLeft: '1rem',
          }}
        >
          “{deck}”
        </blockquote>

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-5 text-[10px] font-mono uppercase tracking-[0.15em]">
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
            className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {t('pairCard.sharedContracts')}
          </button>
          {pair.is_potential_collusion && (
            <button
              type="button"
              onClick={() => navigate(`/thread/${leadVendor.id}`)}
              className="inline-flex items-center gap-1.5 transition-colors"
              style={{ color: accent }}
            >
              {t('pairCard.investigationThread')}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
