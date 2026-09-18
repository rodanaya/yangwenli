/**
 * SeriesLine — the one line renderer behind SD-02's F1, F2 and F4.
 *
 * Three figures in «El año de la emergencia» are the same object: a value per
 * period, a rule or two to read it against, an optional shaded band, an event
 * marker, and a handful of labelled points. Writing three of them would be
 * three sets of the same off-by-one.
 *
 * Two rules the Day-3 legibility audit fixed the hard way and this obeys:
 *
 *  1. **HTML owns every glyph.** The SVG draws geometry only — polyline, dots,
 *     rules, band. Axis ticks, point values, rule labels and the marker caption
 *     are absolutely-positioned HTML at their literal font size, so a 390px
 *     phone renders 11px text at 11px instead of scaling a viewBox down into
 *     4px glyphs.
 *  2. **The viewBox is the measured width.** One viewBox unit is one CSS pixel
 *     at every breakpoint (`useMeasuredWidth`), so nothing is stretched and
 *     `preserveAspectRatio` never enters the picture.
 */
import { useMeasuredWidth } from '@/components/stories/InlineCharts'

export interface SeriesPoint {
  /** Stable key — the year or `YYYY-MM`. */
  key: string
  /** Axis caption. Only points that carry one are labelled on the x axis. */
  axis?: string
  value: number
  /** Printed above the dot (already formatted, e.g. "77.8%"). */
  callout?: string
  /** Second line of the callout — the month name, the year, whatever names it. */
  calloutSub?: string
  /** Draw this point (and the segment reaching it) in the emphasis colour. */
  emphasis?: boolean
}

export interface SeriesRule {
  value: number
  label: string
  color: string
  dashed?: boolean
}

export interface SeriesBand {
  from: number
  to: number
  label?: string
  color: string
}

export interface SeriesMarker {
  /** The marker sits in the gap AFTER this point index. */
  afterIndex: number
  label: string
}

const PAD = { l: 48, r: 16, t: 34, b: 30 }
const PLOT_H = 232
const AXIS_FS = 11
const CALLOUT_FS = 12
/** Advance width of one mono glyph as a fraction of its font size. */
const MONO_ADVANCE = 0.6

const EMPHASIS = 'var(--color-risk-critical)'
const BASE_INK = 'var(--color-text-secondary)'

export function SeriesLine({
  points,
  visibleCount,
  yMin,
  yMax,
  yTicks,
  rules = [],
  bands = [],
  markers = [],
  formatTick,
  ariaSummary,
}: {
  points: SeriesPoint[]
  /** Stage-driven reveal: only the first N points are drawn. */
  visibleCount?: number
  yMin: number
  yMax: number
  yTicks: number[]
  rules?: SeriesRule[]
  bands?: SeriesBand[]
  markers?: SeriesMarker[]
  formatTick: (v: number) => string
  ariaSummary: string
}) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>()
  const w = Math.max(width, 260)
  const innerW = Math.max(w - PAD.l - PAD.r, 40)
  const innerH = PLOT_H - PAD.t - PAD.b
  const n = points.length
  const shown = Math.max(Math.min(visibleCount ?? n, n), 0)

  const x = (i: number) => PAD.l + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
  const y = (v: number) =>
    PAD.t + (1 - (Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * innerH

  const visible = points.slice(0, shown)

  // Axis captions thin out rather than collide: keep every k-th labelled point,
  // where k is the smallest step at which the widest caption still fits its
  // slot. Not memoised — `points` is rebuilt every render by design (the stage
  // and the lens both change it), so a cache keyed on it could never hit, and
  // the work is one max over at most 36 strings.
  const axisIdx = (() => {
    const candidates = points.map((p, i) => ({ p, i })).filter((c) => c.p.axis)
    if (candidates.length < 2) return candidates.map((c) => c.i)
    const widest = Math.max(...candidates.map((c) => (c.p.axis!.length + 1) * AXIS_FS * MONO_ADVANCE))
    const slot = Math.abs(x(candidates[1].i) - x(candidates[0].i))
    const step = slot > 0 ? Math.max(1, Math.ceil(widest / slot)) : 1
    // Always name the series' end — but by REPLACING the previous caption when
    // the two would sit closer than one slot apart, never by adding beside it.
    // Appending blindly is what printed "20182019" at 390 on the first pass.
    const keep = candidates.filter((_, k) => k % step === 0).map((c) => c.i)
    const last = candidates[candidates.length - 1].i
    if (!keep.includes(last)) {
      const prev = keep[keep.length - 1]
      if (prev != null && Math.abs(x(last) - x(prev)) < widest) keep.pop()
      keep.push(last)
    }
    return keep
  })()

  const path = visible.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  // The emphasis run is the tail of the series, so one extra path over the same
  // points is enough — no per-segment stroke switching.
  const firstEmph = points.findIndex((p) => p.emphasis)
  const emphPath =
    firstEmph >= 0 && shown > firstEmph
      ? visible
          .slice(firstEmph)
          .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(firstEmph + i).toFixed(1)},${y(p.value).toFixed(1)}`)
          .join(' ')
      : ''

  return (
    <div ref={ref} className="relative w-full" style={{ height: PLOT_H }}>
      <svg
        width={w}
        height={PLOT_H}
        viewBox={`0 0 ${w} ${PLOT_H}`}
        className="absolute inset-0"
        aria-hidden="true"
      >
        {bands.map((b, i) => {
          const top = y(Math.max(b.from, b.to))
          const bottom = y(Math.min(b.from, b.to))
          return (
            <rect
              key={`band-${i}`}
              x={PAD.l}
              y={top}
              width={innerW}
              height={Math.max(bottom - top, 1)}
              fill={b.color}
              opacity={0.1}
            />
          )
        })}

        {yTicks.map((tv) => (
          <line
            key={`grid-${tv}`}
            x1={PAD.l}
            x2={PAD.l + innerW}
            y1={y(tv)}
            y2={y(tv)}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        ))}

        {rules.map((r, i) => (
          <line
            key={`rule-${i}`}
            x1={PAD.l}
            x2={PAD.l + innerW}
            y1={y(r.value)}
            y2={y(r.value)}
            stroke={r.color}
            strokeWidth={1.5}
            strokeDasharray={r.dashed === false ? undefined : '5 4'}
          />
        ))}

        {markers.map((m, i) => {
          if (shown <= m.afterIndex + 1) return null
          const mx = (x(m.afterIndex) + x(m.afterIndex + 1)) / 2
          return (
            <line
              key={`marker-${i}`}
              x1={mx}
              x2={mx}
              y1={PAD.t - 6}
              y2={PAD.t + innerH}
              stroke="var(--color-accent)"
              strokeWidth={1.5}
            />
          )
        })}

        <path d={path} fill="none" stroke={BASE_INK} strokeWidth={2} strokeLinejoin="round" />
        {emphPath && <path d={emphPath} fill="none" stroke={EMPHASIS} strokeWidth={2.5} strokeLinejoin="round" />}

        {visible.map((p, i) => (
          <circle
            key={p.key}
            cx={x(i)}
            cy={y(p.value)}
            r={p.callout ? 4 : 2.5}
            fill={p.emphasis ? EMPHASIS : BASE_INK}
          />
        ))}
      </svg>

      {/* ── HTML glyph layer ── */}
      <div className="absolute inset-0 pointer-events-none">
        {yTicks.map((tv) => (
          <span
            key={`ytick-${tv}`}
            className="absolute font-mono tabular-nums text-text-muted"
            style={{
              fontSize: AXIS_FS,
              left: 0,
              top: y(tv),
              width: PAD.l - 8,
              textAlign: 'right',
              transform: 'translateY(-50%)',
            }}
          >
            {formatTick(tv)}
          </span>
        ))}

        {axisIdx.map((i) => (
          <span
            key={`xtick-${points[i].key}`}
            className="absolute font-mono tabular-nums text-text-muted whitespace-nowrap"
            style={{
              fontSize: AXIS_FS,
              left: Math.min(Math.max(x(i), 14), w - 14),
              top: PAD.t + innerH + 8,
              transform: 'translateX(-50%)',
            }}
          >
            {points[i].axis}
          </span>
        ))}

        {/* Rule captions hug the right edge BELOW their rule, band captions the
            left edge ABOVE theirs. Both carry a card-coloured chip: a reference
            line by definition sits where the series does, so a caption on it
            will cross the polyline at some width no placement can avoid — the
            chip is what keeps it readable when it does. Putting the two on
            opposite sides is what keeps them off each other. */}
        {rules.map((r, i) => (
          <span
            key={`rule-label-${i}`}
            className="absolute font-mono tabular-nums whitespace-nowrap"
            style={{
              fontSize: AXIS_FS,
              lineHeight: 1.3,
              color: r.color,
              right: PAD.r + 4,
              top: y(r.value) + 3,
              background: 'var(--color-background-card)',
              padding: '0 4px',
            }}
          >
            {r.label}
          </span>
        ))}

        {bands.map((b, i) =>
          b.label ? (
            <span
              key={`band-label-${i}`}
              className="absolute font-mono tabular-nums whitespace-nowrap text-text-muted"
              style={{
                fontSize: AXIS_FS,
                lineHeight: 1.3,
                left: PAD.l + 4,
                top: Math.max(y(Math.max(b.from, b.to)) - AXIS_FS - 5, 2),
                background: 'var(--color-background-card)',
                padding: '0 4px',
              }}
            >
              {b.label}
            </span>
          ) : null,
        )}

        {markers.map((m, i) => {
          if (shown <= m.afterIndex + 1) return null
          const mx = (x(m.afterIndex) + x(m.afterIndex + 1)) / 2
          // Flip the caption to the left of its rule once the rule is past the
          // middle, so a marker near the end never runs off the plot.
          const flip = mx > PAD.l + innerW * 0.55
          return (
            <span
              key={`marker-label-${i}`}
              className="absolute font-mono uppercase whitespace-nowrap"
              style={{
                fontSize: AXIS_FS,
                letterSpacing: '0.08em',
                color: 'var(--color-accent)',
                left: flip ? undefined : mx + 5,
                right: flip ? w - mx + 5 : undefined,
                top: 4,
              }}
            >
              {m.label}
            </span>
          )
        })}

        {visible.map((p, i) =>
          p.callout ? (
            <span
              key={`callout-${p.key}`}
              className="absolute flex flex-col items-center whitespace-nowrap"
              style={{
                left: Math.min(Math.max(x(i), 28), w - 28),
                top: Math.max(y(p.value) - CALLOUT_FS - 16, 2),
                transform: 'translateX(-50%)',
              }}
            >
              <span
                className="font-mono tabular-nums font-bold"
                style={{ fontSize: CALLOUT_FS, color: p.emphasis ? EMPHASIS : 'var(--color-text-primary)' }}
              >
                {p.callout}
              </span>
              {p.calloutSub && (
                <span className="font-mono uppercase text-text-muted" style={{ fontSize: 10.5, letterSpacing: '0.08em' }}>
                  {p.calloutSub}
                </span>
              )}
            </span>
          ) : null,
        )}
      </div>

      <span className="sr-only">{ariaSummary}</span>
    </div>
  )
}
