/**
 * ChartFrame — editorial wrapper around every primitive chart.
 *
 * Enforces bible §3.3 & §3.5 typography for chart framing:
 *   - Optional overline (ALL CAPS, mono, muted, tracking-widest) for section
 *     badges ("DETECCIÓN · SECTOR SALUD")
 *   - Title in Playfair Display (finding-first, not description)
 *   - Italic dek in Inter ≤60ch explaining what the reader sees
 *   - Source line in JetBrains Mono (bottom)
 *   - Optional annotations slot (right of title)
 *   - Optional methodology link
 *
 * The frame does NOT set any color or radius — it inherits from the cream
 * page ground. It provides the editorial scaffolding; the primitive renders
 * as its child.
 */

import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'

export interface ChartFrameProps {
  /** Optional overline, ALL CAPS. Bible §3.5. */
  overline?: string
  /**
   * Finding-first title (Playfair Display). Not a description of the chart;
   * the thing the reader should learn in a glance.
   *   GOOD: "Direct awards rose 22 pp under AMLO"
   *   BAD:  "Direct awards by administration"
   */
  title: string
  /** Italic explainer of what's being shown. ≤60ch. */
  dek?: string
  /** "COMPRANET · 2002–2025 · N=3,051,294". Bottom, mono. */
  source?: string
  /** Slug to /methodology anchor; renders a small "?" link next to title. */
  methodologySlug?: string
  /** Right-of-title slot for pills, download buttons, live signal dots. */
  actions?: React.ReactNode
  /** Footer slot beneath chart — for dot-matrix legend line. */
  legend?: React.ReactNode
  children: React.ReactNode
  /** Tighten vertical rhythm for compact variants. */
  compact?: boolean
  className?: string
}

export function ChartFrame({
  overline, title, dek, source, methodologySlug, actions, legend, children, compact, className,
}: ChartFrameProps) {
  return (
    <figure
      className={['w-full', compact ? 'space-y-2' : 'space-y-4', className ?? ''].join(' ')}
    >
      <figcaption className="space-y-1.5">
        {overline && (
          <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.15em] text-text-muted">
            {overline}
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <h3
            className="font-serif font-bold text-[18px] md:text-[20px] leading-[1.25] tracking-[-0.01em] text-text-primary"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {title}
            {methodologySlug && (
              <Link
                to={`/methodology#${methodologySlug}`}
                className="inline-flex items-center ml-2 text-text-muted hover:text-accent transition-colors"
                aria-label="View methodology"
              >
                <Info className="h-3 w-3 inline" />
              </Link>
            )}
          </h3>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
        {dek && (
          <p className="text-[13px] italic leading-[1.55] text-text-secondary max-w-[62ch]">
            {dek}
          </p>
        )}
      </figcaption>

      <div className="w-full">{children}</div>

      {(legend || source) && (
        <div className="flex items-end justify-between gap-4 pt-1 border-t border-border/60">
          <div className="text-[10px] font-mono text-text-muted leading-[1.4]">
            {legend}
          </div>
          {source && (
            <div className="text-[10px] font-mono text-text-muted leading-[1.4] text-right">
              {source}
            </div>
          )}
        </div>
      )}
    </figure>
  )
}
