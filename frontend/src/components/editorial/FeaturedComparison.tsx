/**
 * FeaturedComparison — asymmetric A-vs-B lede card.
 *
 * Generic version of the collusion FeaturedDuet, decoupled from any specific
 * domain schema. Use whenever the page's story is "two things compared, one
 * dominates the other" — sexenio vs sexenio, sector vs sector, vendor vs
 * vendor, administration vs administration.
 *
 * Pattern: kicker · serif names left/right of an asymmetric DuetArrow · italic
 * deck quote · meta strip · optional CTA. Reuses the existing DuetArrow SVG
 * from @/components/collusion/DuetArrow (it has no collusion coupling).
 */

import { type ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { DuetArrow } from '@/components/collusion/DuetArrow'

export interface ComparisonEntity {
  /** Entity display name (rendered in serif). */
  name: string
  /** Sub-line beneath the name, usually mono tabular-nums. */
  subtitle?: ReactNode
  /** 0..100 — drives the relative size of this entity's arrow stub. */
  share: number
  /** Optional click handler — name becomes a button. */
  onClick?: () => void
  /** Optional hover title (e.g. full-length name when display is truncated). */
  title?: string
}

export interface FeaturedComparisonProps {
  kicker: string
  accent: string
  entityA: ComparisonEntity
  entityB: ComparisonEntity
  /** Center label on the duet arrow — e.g. "+4.2 pp", "72% vs 68%", "3.2×". */
  centerLabel: string
  /** Italic pull-quote deck. */
  deck: string
  /** Optional primary CTA shown at the bottom. */
  action?: {
    label: string
    onClick: () => void
  }
  /** Subtle tint on the card background. Defaults to accent. */
  tintColor?: string
}

function EntitySide({
  entity,
  align,
}: {
  entity: ComparisonEntity
  align: 'left' | 'right'
}) {
  const content = (
    <>
      <div
        className="text-text-primary group-hover:text-accent transition-colors"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontWeight: 600,
          fontSize: 'clamp(1.15rem, 2.2vw, 1.6rem)',
          lineHeight: 1.15,
          letterSpacing: '-0.015em',
        }}
      >
        {entity.name}
      </div>
      {entity.subtitle && (
        <div className="text-[10px] font-mono text-text-muted uppercase tracking-[0.12em] mt-1 tabular-nums">
          {entity.subtitle}
        </div>
      )}
    </>
  )

  const className = `${align === 'right' ? 'text-left' : 'md:text-right'} group`

  if (entity.onClick) {
    return (
      <button
        type="button"
        onClick={entity.onClick}
        className={className}
        title={entity.title}
        aria-label={entity.name}
      >
        {content}
      </button>
    )
  }
  return (
    <div className={className} title={entity.title}>
      {content}
    </div>
  )
}

export function FeaturedComparison({
  kicker,
  accent,
  entityA,
  entityB,
  centerLabel,
  deck,
  action,
  tintColor,
}: FeaturedComparisonProps) {
  const tint = tintColor ?? accent
  return (
    <section
      aria-label={kicker}
      className="relative mb-10 overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${tint}14 0%, var(--color-background-card) 70%)`,
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

        {/* Asymmetric duet: names left + right, arrow in the middle */}
        <div className="grid md:grid-cols-[1fr_240px_1fr] gap-4 md:gap-6 items-center mb-5">
          <EntitySide entity={entityA} align="left" />
          <div className="flex items-center justify-center">
            <DuetArrow
              shareA={entityA.share}
              shareB={entityB.share}
              centerLabel={centerLabel}
              accent={accent}
              height={44}
            />
          </div>
          <EntitySide entity={entityB} align="right" />
        </div>

        {/* Deck quote */}
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
