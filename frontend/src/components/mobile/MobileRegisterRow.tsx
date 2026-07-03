import type { ReactNode } from 'react'

/**
 * MobileRegisterRow — the canonical compact row for any data register on phones.
 *
 * Replaces the desktop multi-column table row (which on a phone forced a
 * horizontal scroll and a tall, name-wrapping cell) with a ~2-line card:
 *
 *   ┌────────────────────────────────────────┐
 *   │ 1  [logo]  Instituto Mexicano del…      │   identity (one truncated line)
 *   │            996B · 68% DA · ● 11%         │   metrics (compact mono chips)
 *   └────────────────────────────────────────┘
 *
 * No horizontal scroll, ~half the height of the desktop row. Each El Mapa zone
 * (institutions / vendors / contracts) maps its data onto `chips`. Presentational
 * only — the parent owns data + drill dispatch.
 */
export interface RegisterChip {
  value: string
  /** hex or CSS color applied via style (sector / risk palette) */
  color?: string
  /** render a small filled dot before the value (e.g. a risk pip) */
  dot?: boolean
  /** emphasize as the primary metric (heavier weight, primary ink) */
  bold?: boolean
}

interface MobileRegisterRowProps {
  /** rank index — omit for unranked registers (e.g. contracts) */
  rank?: number
  /** leading visual — a logo chip / avatar / glyph */
  leading?: ReactNode
  /** short uppercase code before the title (acronym / siglas) */
  code?: string
  title: string
  chips: RegisterChip[]
  onClick?: () => void
  ariaLabel?: string
}

export function MobileRegisterRow({
  rank,
  leading,
  code,
  title,
  chips,
  onClick,
  ariaLabel,
}: MobileRegisterRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="w-full text-left flex items-start gap-2.5 px-2 py-2.5 rounded-sm transition-colors active:bg-background-elevated/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
      >
        {rank != null ? (
          <span className="shrink-0 w-5 pt-1 text-right font-mono tabular-nums text-[12px] text-text-muted">
            {rank}
          </span>
        ) : null}
        {leading ? <span className="shrink-0">{leading}</span> : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5 min-w-0">
            {code ? (
              <span className="shrink-0 font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-text-primary">
                {code}
              </span>
            ) : null}
            <span className="truncate text-[13px] leading-snug text-text-secondary">{title}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[12px] tabular-nums text-text-muted">
            {chips.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {c.dot ? (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: c.color ?? 'currentColor' }}
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={c.bold ? 'font-semibold text-text-primary' : undefined}
                  style={c.color ? { color: c.color } : undefined}
                >
                  {c.value}
                </span>
              </span>
            ))}
          </span>
        </span>
      </button>
    </li>
  )
}
