/**
 * FeaturedFinding — generic "lede card" for listing/analysis pages.
 *
 * Same grammar as the collusion FeaturedDuet (kicker, serif headline,
 * pull-quote deck with colored left-rule, meta strip, action row) but
 * decoupled from the pair-specific schema. Drop this at the top of any
 * listing page to surface the single most-striking story on the page
 * instead of a bland header.
 *
 * Apply across: Sectors, PriceIntelligence, Administrations,
 * InstitutionLeague, SpendingCategories, RedesKnownDossier,
 * Investigation.
 */

import { type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

export interface FindingStat {
  label: string
  value: ReactNode
  accent?: boolean
}

export interface FeaturedFindingProps {
  /** Uppercase kicker, e.g. "LEDE · CAPTURA INSTITUCIONAL" */
  kicker: string
  /** Hex accent — flows into left rule, kicker, pull-quote rule, action link */
  accent: string
  /** Serif headline. Pass ReactNode to compose multi-line lockups. */
  headline: ReactNode
  /** Italic pull-quote deck. One sentence, max ~180 chars. */
  deck: string
  /** 2–5 meta stats shown as a mono strip beneath the deck. */
  meta?: FindingStat[]
  /** Optional primary CTA. */
  action?: {
    label: string
    onClick: () => void
  }
  /** Subtle tint applied to the top of the card. Defaults to accent. */
  tintColor?: string
}

export function FeaturedFinding({
  kicker,
  accent,
  headline,
  deck,
  meta,
  action,
  tintColor,
}: FeaturedFindingProps) {
  // Bible §2: sector colors are for data categorization, not for bathing a
  // risk lede. Bathing the banner in sector-green (agricultura/hacienda) reads
  // as "safe" on a corruption page. Default to neutral elevated cream; only
  // tint if the caller explicitly passes tintColor.
  const tint = tintColor
  return (
    <section
      aria-label={kicker}
      className="relative mb-10 overflow-hidden"
      style={{
        background: tint
          ? `linear-gradient(180deg, ${tint}14 0%, var(--color-background-card) 70%)`
          : 'var(--color-background-card)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div className="px-6 md:px-8 py-7 md:py-9">
        {/* Kicker */}
        <div
          className="text-kicker mb-4"
          style={{ color: accent, letterSpacing: '0.15em', fontWeight: 700 }}
        >
          {kicker}
        </div>

        {/* Serif headline */}
        <div
          className="text-text-primary mb-5 max-w-4xl"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontWeight: 700,
            fontSize: 'clamp(1.6rem, 3.2vw, 2.5rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
          }}
        >
          {headline}
        </div>

        {/* Pull-quote deck with colored left rule */}
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

        {/* Meta strip */}
        {meta && meta.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-5">
            {meta.map((m, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-[0.15em]">
                  {m.label}
                </span>
                <span
                  className="font-mono tabular-nums text-sm"
                  style={{
                    color: m.accent ? accent : 'var(--color-text-primary)',
                    fontWeight: m.accent ? 600 : 500,
                  }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action row */}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] transition-colors"
            style={{ color: accent }}
          >
            {action.label}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  )
}
