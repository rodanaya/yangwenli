/**
 * EditorialChartFrame — shared chrome primitive for story charts.
 *
 * The Apr 2026 story-chart sweep settled on a recurring pattern across
 * 39 of 41 charts:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ KICKER · MONO MICRO                          │
 *   │ Headline · serif bold                        │
 *   │ Lede / subline · sans muted (optional)       │
 *   │                                              │
 *   │ ┌──┬──┬──┐                                   │
 *   │ │S1│S2│S3│  hero stats row (optional, 1–4)   │
 *   │ └──┴──┴──┘                                   │
 *   │                                              │
 *   │   <CHART SVG / RECHARTS>                     │
 *   │                                              │
 *   │ ┌────────────────────────────────────────┐   │
 *   │ │ FINDING · MONO                         │   │
 *   │ │ Body paragraph                         │   │
 *   │ └────────────────────────────────────────┘   │
 *   │ Footer · mono micro                          │
 *   └──────────────────────────────────────────────┘
 *
 * Rather than rebuilding this chrome 39 times, charts can now wrap their
 * SVG in this frame:
 *
 *   <EditorialChartFrame
 *     kicker="RUBLI · By sector"
 *     headline="Each row is a sector — each dot is 2 percentage points"
 *     subline="All cross the OECD line."
 *     stats={[{value: '93.4%', label: 'Agriculture · DA'}]}
 *     finding={{ label: 'FINDING', body: '…' }}
 *     footer="Source: COMPRANET 2002–2025"
 *   >
 *     <svg viewBox="0 0 ..." />
 *   </EditorialChartFrame>
 *
 * Migration is opt-in — existing charts keep working. New charts SHOULD
 * use this frame; touching an existing chart is the natural moment to
 * migrate it.
 *
 * Editorial token reuse: any caller can pass `tone="card"` (default)
 * for the rounded-bg-card body or `tone="bare"` for inline use inside
 * a parent with its own chrome.
 */
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface StatEntry {
  /** Big numeric/string value (Playfair-italic in compose). */
  value: string
  /** Small uppercase mono label. */
  label: string
  /** Optional accent border-left + value color. Pass a CSS variable or hex. */
  accent?: string
}

interface FindingBlock {
  /** Mono uppercase eyebrow ("FINDING" / "HALLAZGO" / etc). */
  label: string
  /** Single paragraph body. Plain string (callers translate via t()). */
  body: ReactNode
}

export interface EditorialChartFrameProps {
  kicker: string
  headline: string
  /** Sub-headline lede (sans, muted). */
  lede?: ReactNode
  /** Single-line subline shown above stats (used by simpler charts). */
  subline?: ReactNode
  /** 1–4 hero stats. Renders as a left-bordered card row above the chart. */
  stats?: StatEntry[]
  /** Optional finding callout below the chart. */
  finding?: FindingBlock
  footer: ReactNode
  /** "card" wraps in bg-background-card + border. "bare" leaves chrome to caller. */
  tone?: 'card' | 'bare'
  /** Disable the entrance animation (default: enabled). */
  animate?: boolean
  children: ReactNode
}

/** Default per-stat accent if none given — uses the design token risk-critical. */
const DEFAULT_ACCENT = 'var(--color-risk-critical)'

export function EditorialChartFrame({
  kicker,
  headline,
  lede,
  subline,
  stats,
  finding,
  footer,
  tone = 'card',
  animate = true,
  children,
}: EditorialChartFrameProps) {
  const Wrapper = animate ? motion.div : 'div'
  const wrapperProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 },
      }
    : {}

  const containerClass = tone === 'card'
    ? 'rounded-sm bg-background-card border border-border p-5 space-y-4'
    : 'w-full space-y-4'

  return (
    <Wrapper className={containerClass} {...wrapperProps}>
      {/* Kicker */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        {kicker}
      </p>

      {/* Headline + lede */}
      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        {headline}
      </h3>
      {lede && (
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
          {lede}
        </p>
      )}
      {subline && !lede && (
        <p className="text-xs text-text-muted">
          {subline}
        </p>
      )}

      {/* Hero stats — supports 1, 2, 3, or 4 columns */}
      {stats && stats.length > 0 && (
        <div
          className={`grid gap-3 ${
            stats.length === 1 ? 'grid-cols-1'
            : stats.length === 2 ? 'grid-cols-2'
            : stats.length === 3 ? 'grid-cols-3'
            : 'grid-cols-2 sm:grid-cols-4'
          }`}
        >
          {stats.map((s, i) => {
            const accent = s.accent || DEFAULT_ACCENT
            return (
              <div
                key={i}
                className="border-l-2 pl-3 py-1"
                style={{ borderColor: accent }}
              >
                <div
                  className="text-xl font-mono font-bold tabular-nums"
                  style={{ color: accent }}
                >
                  {s.value}
                </div>
                <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
                  {s.label}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Chart body */}
      {children}

      {/* Optional finding callout */}
      {finding && (
        <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-mono uppercase tracking-wide text-risk-high mb-1">
            {finding.label}
          </p>
          <p className="text-sm text-text-secondary">
            {finding.body}
          </p>
        </div>
      )}

      {/* Footer attribution */}
      <p className="text-[10px] text-text-muted font-mono">
        {footer}
      </p>
    </Wrapper>
  )
}

export default EditorialChartFrame
