/**
 * StatRow — flat stat strip without card chrome.
 *
 * Replaces the "card-per-stat" pattern where single numeric values get full
 * Card/CardHeader/CardContent shells. Use when 2-4 related stats belong
 * together on one row (e.g. hero KPIs: contracts · value · DA% · institutions).
 *
 * For a single stat with icon + trend, use <StatCard/> instead.
 */
import { getLocale } from '@/lib/utils'

export interface Stat {
  label: string
  value: string | number
  /** Inline unit (e.g. "MXN", "%"). Rendered smaller, muted. */
  unit?: string
  /** Optional sub-line text (e.g. "last 12 months"). */
  hint?: string
  /** Override the numeric color. Defaults to --color-text-primary. */
  color?: string
}

interface StatRowProps {
  stats: Stat[]
  /** Column count at md breakpoint. Defaults to stats.length (max 4). */
  columns?: 2 | 3 | 4
  /** Size variant. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const VALUE_SIZE: Record<NonNullable<StatRowProps['size']>, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
}

const COL_CLASS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
}

export function StatRow({
  stats,
  columns,
  size = 'md',
  className,
}: StatRowProps) {
  const cols = (columns ?? Math.min(Math.max(stats.length, 2), 4)) as 2 | 3 | 4
  const gridCols = COL_CLASS[cols] ?? COL_CLASS[4]

  return (
    <div
      className={`grid ${gridCols} gap-x-6 gap-y-4 ${className ?? ''}`}
      role="list"
    >
      {stats.map((s, i) => (
        <div key={s.label + i} role="listitem" className="min-w-0">
          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-widest leading-[1.3]">
            {s.label}
          </div>
          <div
            className={`${VALUE_SIZE[size]} font-bold font-mono tabular-nums text-text-primary leading-tight mt-1 flex items-baseline gap-1.5`}
            style={s.color ? { color: s.color } : undefined}
          >
            <span className="truncate">
              {typeof s.value === 'number'
                ? s.value.toLocaleString(getLocale())
                : s.value}
            </span>
            {s.unit && (
              <span className="text-xs font-normal text-text-muted tracking-normal">
                {s.unit}
              </span>
            )}
          </div>
          {s.hint && (
            <div className="text-[11px] text-text-muted mt-0.5 leading-[1.4] truncate">
              {s.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
