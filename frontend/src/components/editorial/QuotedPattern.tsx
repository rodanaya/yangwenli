/**
 * QuotedPattern — italic pull-quote with colored left rule.
 *
 * Generic standalone version of the deck-quote grammar from FeaturedDuet.
 * Use inline within page sections to punctuate findings with an editorial
 * voice instead of flat body copy.
 */

import { type ReactNode } from 'react'

interface QuotedPatternProps {
  accent: string
  children: ReactNode
  kicker?: string
}

export function QuotedPattern({ accent, children, kicker }: QuotedPatternProps) {
  return (
    <div>
      {kicker && (
        <div
          className="text-kicker mb-2"
          style={{ color: accent, letterSpacing: '0.15em', fontWeight: 700 }}
        >
          {kicker}
        </div>
      )}
      <blockquote
        className="max-w-3xl text-zinc-200"
        style={{
          fontFamily: 'var(--font-family-serif)',
          fontStyle: 'italic',
          fontSize: 'clamp(1rem, 1.3vw, 1.1rem)',
          lineHeight: 1.6,
          borderLeft: `2px solid ${accent}`,
          paddingLeft: '1rem',
        }}
      >
        “{children}”
      </blockquote>
    </div>
  )
}
