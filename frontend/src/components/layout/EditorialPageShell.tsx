import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface StatItem {
  value: ReactNode
  label: string
  color?: string
  sub?: string
}

interface EditorialPageShellProps {
  kicker: string                    // "ARIA QUEUE · 17 APR 2026"
  headline: ReactNode               // serif, can contain accented spans
  paragraph: ReactNode              // 2–3 sentence editorial paragraph
  stats?: StatItem[]                // 3–4 inline stats
  meta?: ReactNode                  // top-right "v0.6.5 · synced 2m ago"
  actions?: ReactNode               // optional CTA row below stat strip
  loading?: boolean
  severity?: 'critical' | 'high' | 'medium' | 'low'
  className?: string
  children: ReactNode
}

export function EditorialPageShell({
  kicker, headline, paragraph, stats, meta, actions, loading, severity, className, children
}: EditorialPageShellProps) {
  const severityAccent = {
    critical: 'border-risk-critical',
    high:     'border-risk-high',
    medium:   'border-risk-medium',
    low:      'border-border',
  }[severity ?? 'low']

  return (
    <div className={cn('space-y-0', className)}>
      {/* Lede block */}
      <header className={cn(
        'border-b border-border/30 pb-7 mb-8',
        severity && severity !== 'low' && `border-l-4 pl-5 ${severityAccent}`
      )}>
        {/* Top row: kicker + meta */}
        <div className="flex items-start justify-between gap-4 mb-3">
          {loading ? (
            <Skeleton className="h-3 w-40" />
          ) : (
            <span className="lede-dateline">{kicker}</span>
          )}
          {meta && (
            <span className="font-mono text-[10px] tracking-widest uppercase text-text-muted hidden sm:block flex-shrink-0">
              {meta}
            </span>
          )}
        </div>

        {/* Headline */}
        {loading ? (
          <div className="space-y-2 mb-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-9 w-1/2" />
          </div>
        ) : (
          <h1 className="lede-headline measure-headline mb-4">{headline}</h1>
        )}

        {/* Paragraph */}
        {loading ? (
          <div className="space-y-2 mb-6">
            <Skeleton className="h-4 w-full max-w-prose" />
            <Skeleton className="h-4 w-5/6 max-w-prose" />
            <Skeleton className="h-4 w-4/6 max-w-prose" />
          </div>
        ) : (
          <p className="lede-paragraph mb-6">{paragraph}</p>
        )}

        {/* Stat strip */}
        {stats && stats.length > 0 && (
          <div className="stat-strip border-t border-border/40 pt-5">
            {loading ? (
              <>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="stat-strip-item">
                    <Skeleton className="h-7 w-20 mb-1" />
                    <Skeleton className="h-2.5 w-14" />
                  </div>
                ))}
              </>
            ) : (
              stats.map((stat, i) => (
                <div key={i} className="stat-strip-item">
                  <span
                    className="stat-strip-value"
                    style={stat.color ? { color: stat.color } : undefined}
                  >
                    {stat.value}
                  </span>
                  <span className="stat-strip-label">{stat.label}</span>
                  {stat.sub && (
                    <span className="font-mono text-[9px] text-text-muted tracking-wide mt-0.5">{stat.sub}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Actions row */}
        {actions && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">{actions}</div>
        )}
      </header>

      {/* Page acts / content */}
      {children}
    </div>
  )
}
