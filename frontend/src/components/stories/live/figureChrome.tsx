/**
 * figureChrome — the presentational pieces every live story figure wears.
 *
 * SD-01..08 each carried their own copy of these five; SD-09 and SD-10 draw
 * the same term bars from two different metrics, which is where the duplication
 * stopped being tolerable. What lives here is the part with no story in it: a
 * loading box, an honest failure line, a wrapping fact row, a closing note, and
 * a track. The rows, anchors, annotations and footline prose stay in each
 * story's own file, because that is the part that is the story.
 *
 * The two rules the Day-3 legibility audit fixed the hard way and these obey:
 * HTML owns every glyph — there is no <text> in this file — and no label or
 * value is ever truncated (STORY_DAYS § 7).
 */
import { Link } from 'react-router-dom'
import { ChartCard } from '@/components/stories/InlineCharts'

/** The argument — whatever the figure is accusing. */
export const EMPHASIS = 'var(--color-risk-critical)'
/** A reference line. External to RUBLI, and always captioned as such. */
export const REFERENCE = 'var(--color-sector-tecnologia)'
/** Zinc — everything ordinary. Low is never green (Bible § 3.10). */
export const FIELD = '#71717a'

export const STAMP = { en: 'LIVE · COMPRANET', es: 'EN VIVO · COMPRANET' } as const

export const pct2 = (v: number) => `${v.toFixed(2)}%`
export const pct1 = (v: number) => `${v.toFixed(1)}%`
export const pp = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} pp`

export function Loading({ eyebrow, title, lang }: { eyebrow: string; title: string; lang: 'en' | 'es' }) {
  return (
    <ChartCard eyebrow={eyebrow} title={title} lang={lang} stamp={STAMP}>
      <div
        role="status"
        aria-label={lang === 'es' ? 'Cargando la figura en vivo' : 'Loading the live figure'}
        className="h-40 rounded-sm bg-surface-2 motion-safe:animate-pulse"
      />
    </ChartCard>
  )
}

/**
 * A figure whose query failed says so in one mono line rather than falling back
 * to a typed number (STORY_DAYS principle 6).
 */
export function Unavailable({ eyebrow, title, lang }: { eyebrow: string; title: string; lang: 'en' | 'es' }) {
  return (
    <ChartCard eyebrow={eyebrow} title={title} lang={lang} stamp={STAMP}>
      <p className="px-2 py-8 font-mono text-[12px] leading-relaxed text-text-muted">
        {lang === 'es' ? 'Figura en vivo no disponible — ver ' : 'Live figure unavailable — see '}
        <Link to="/methodology" className="underline underline-offset-2 hover:text-text-secondary">
          /methodology
        </Link>
      </p>
    </ChartCard>
  )
}

/**
 * A row of facts under a figure.
 *
 * Each cell is its own unbreakable unit with a break opportunity between cells,
 * so the line wraps between facts and never inside one (STORY_DAYS § 7).
 */
export function FactLine({ items, className = '' }: { items: React.ReactNode[]; className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono tabular-nums text-text-muted ${className}`}
      style={{ fontSize: 11.5 }}
    >
      {items.filter(Boolean).map((node, i) => (
        <span key={i} className="whitespace-nowrap">
          {node}
        </span>
      ))}
    </div>
  )
}

/** A closing line under a figure — the sum, the caveat, the rollup. */
export function Footline({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="w-full pt-4 font-mono"
      style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-muted)', textWrap: 'pretty' }}
    >
      {children}
    </p>
  )
}

/**
 * A horizontal track with an optional reference rule on it. Geometry is HTML
 * boxes, not SVG, so there is no viewBox to clip and no glyph inside it to
 * shrink.
 */
export function Track({
  fill,
  color,
  rule,
  band,
  height = 10,
  opacity = 0.9,
}: {
  /** 0–1. */
  fill: number
  color: string
  /** 0–1 — a reference mark drawn across the track. */
  rule?: number
  /** 0–1 pair — a reference range shaded behind the fill. */
  band?: [number, number]
  height?: number
  opacity?: number
}) {
  return (
    <span className="relative block w-full" style={{ height, background: 'var(--color-border)', borderRadius: 1 }}>
      {band ? (
        <span
          className="absolute inset-y-0 block"
          style={{
            left: `${band[0] * 100}%`,
            width: `${Math.max((band[1] - band[0]) * 100, 0.5)}%`,
            background: REFERENCE,
            opacity: 0.18,
          }}
        />
      ) : null}
      <span
        className="absolute inset-y-0 left-0 block"
        style={{ width: `${Math.max(fill * 100, 0.6)}%`, background: color, opacity, borderRadius: 1 }}
      />
      {rule !== undefined ? (
        <span
          className="absolute inset-y-0 block"
          style={{ left: `${rule * 100}%`, width: 1.5, background: REFERENCE }}
        />
      ) : null}
    </span>
  )
}
