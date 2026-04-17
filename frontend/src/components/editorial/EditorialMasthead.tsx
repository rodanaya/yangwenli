/**
 * EditorialMasthead — standardised page header.
 *
 * Encapsulates the dateline + kicker + serif H1 + italic deck pattern that
 * every editorial page currently duplicates in ~40 lines of JSX. Use this at
 * the top of every RUBLI page to give the platform visual consistency
 * without copy-pasting.
 *
 * Slots:
 *  - dateline segments (after RUBLI)
 *  - kicker (uppercase overline; auto applied text-kicker--investigation)
 *  - title (required)
 *  - deck (optional italic serif subtitle)
 *  - rightSlot (optional — ShareButton or similar)
 *  - below (optional — runs beneath the deck, e.g. source pills)
 */

import { type ReactNode } from 'react'

export interface EditorialMastheadProps {
  /** Segments to the right of "RUBLI" in the dateline. */
  dateline?: ReactNode[]
  /** Short uppercase overline above the title. */
  kicker?: string
  /** Required title (rendered in serif). */
  title: ReactNode
  /** Italic-serif deck subtitle. */
  deck?: ReactNode
  /** Optional node on the far right of the title row (e.g. ShareButton). */
  rightSlot?: ReactNode
  /** Optional node below the deck (e.g. FuentePill row). */
  below?: ReactNode
  /** Reduce bottom padding — useful when followed immediately by a lede card. */
  tight?: boolean
}

export function EditorialMasthead({
  dateline = [],
  kicker,
  title,
  deck,
  rightSlot,
  below,
  tight,
}: EditorialMastheadProps) {
  return (
    <header className={tight ? 'pb-4' : 'pb-8'}>
      {/* Dateline */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3 pb-2 border-b border-[rgba(255,255,255,0.06)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-zinc-300">RUBLI</span>
        </span>
        {dateline.map((seg, i) => (
          <span key={i} className="inline-flex items-center gap-3">
            <span className="text-zinc-700" aria-hidden>·</span>
            <span>{seg}</span>
          </span>
        ))}
      </div>

      {/* Kicker */}
      {kicker && (
        <p className="text-kicker text-kicker--investigation mb-3">{kicker}</p>
      )}

      {/* Title + optional right-side slot */}
      <div className="flex items-start justify-between gap-4">
        <h1
          className="text-zinc-50 leading-[1.05]"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
          }}
        >
          {title}
        </h1>
        {rightSlot && <div className="flex-shrink-0 mt-1">{rightSlot}</div>}
      </div>

      {/* Deck */}
      {deck && (
        <p
          className="mt-3 max-w-3xl text-zinc-300"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontStyle: 'italic',
            fontSize: 'clamp(1rem, 1.3vw, 1.2rem)',
            lineHeight: 1.55,
          }}
        >
          {deck}
        </p>
      )}

      {/* Below slot (pills, stat chips, etc) */}
      {below && <div className="mt-5">{below}</div>}
    </header>
  )
}
