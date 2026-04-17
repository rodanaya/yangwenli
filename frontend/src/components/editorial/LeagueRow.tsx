/**
 * LeagueRow — ranked-table row with editorial voice.
 *
 * Pattern: rank number (tabular mono) · colored indicator bar · entity name in
 * serif · metric cells (tabular) · optional narrative column (italic serif
 * one-sentence pattern).
 *
 * Designed to replace generic <tr> rows in listing pages (InstitutionLeague,
 * Sectors ranking, SpendingCategories top list) so that each row carries an
 * editorial story rather than a bland row of numbers.
 */

import { type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

export interface LeagueMetric {
  label: string
  value: ReactNode
  /** Optional accent color for this metric's value. */
  color?: string
  /** Optional subtitle under the value (e.g. "of 12"). */
  sub?: ReactNode
}

export interface LeagueRowProps {
  rank: number
  /** Accent color — drives rank number, left indicator bar, and hover chrome. */
  accent: string
  /** Entity display name — rendered in serif, optionally clickable. */
  name: ReactNode
  /** Short mono tag beneath the name (sector code, RFC, admin period). */
  tag?: ReactNode
  /** Metric cells shown right of the name. Typically 2–4 items. */
  metrics?: LeagueMetric[]
  /** One-sentence italic-serif narrative describing the entity's pattern. */
  narrative?: ReactNode
  /** Optional click handler — whole row becomes a link. */
  onClick?: () => void
  /** Optional CTA label (default "▸"). */
  cta?: string
  /** Highlight the row (e.g. featured). */
  highlight?: boolean
}

export function LeagueRow({
  rank,
  accent,
  name,
  tag,
  metrics = [],
  narrative,
  onClick,
  cta,
  highlight,
}: LeagueRowProps) {
  const Wrapper: 'button' | 'div' = onClick ? 'button' : 'div'

  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`group grid w-full items-center gap-4 py-4 px-1 md:px-3 text-left transition-colors ${
        onClick ? 'hover:bg-[rgba(255,255,255,0.02)] cursor-pointer' : ''
      }`}
      style={{
        gridTemplateColumns:
          'minmax(2.5rem,auto) 4px minmax(0,2fr) minmax(0,3fr) auto',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        backgroundColor: highlight ? `${accent}0a` : undefined,
      }}
    >
      {/* Rank */}
      <span
        className="font-mono tabular-nums text-[11px] uppercase tracking-[0.15em] text-right"
        style={{ color: accent, fontWeight: 700 }}
      >
        #{String(rank).padStart(2, '0')}
      </span>

      {/* Colored indicator bar */}
      <span
        className="h-8 w-1 self-center"
        style={{
          backgroundColor: accent,
          boxShadow: highlight ? `0 0 10px ${accent}cc` : undefined,
        }}
        aria-hidden="true"
      />

      {/* Name + tag */}
      <div className="min-w-0">
        <div
          className="text-zinc-50 truncate"
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontWeight: 600,
            fontSize: 'clamp(1rem, 1.4vw, 1.2rem)',
            letterSpacing: '-0.015em',
            lineHeight: 1.2,
          }}
        >
          {name}
        </div>
        {tag && (
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 mt-0.5 tabular-nums">
            {tag}
          </div>
        )}
        {narrative && (
          <div
            className="text-zinc-300 mt-1.5 max-w-2xl"
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontStyle: 'italic',
              fontSize: '0.875rem',
              lineHeight: 1.45,
            }}
          >
            “{narrative}”
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 justify-end md:justify-start">
        {metrics.map((m, i) => (
          <div key={i} className="flex flex-col items-start">
            <div
              className="font-mono tabular-nums text-lg leading-none"
              style={{
                color: m.color ?? '#e4e4e7',
                fontWeight: 600,
              }}
            >
              {m.value}
            </div>
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-500 mt-0.5">
              {m.label}
              {m.sub && <span className="text-zinc-600"> · {m.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {onClick && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.15em] transition-colors"
          style={{ color: accent }}
        >
          {cta ?? 'Expediente'}
          <ArrowRight
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      )}
    </Wrapper>
  )
}
