/**
 * CaptureTrajectory — the Reuters *Forever Pollution* threshold-crossing port.
 *
 * One (institution, vendor) pair drawn as a connected line through years on a
 * SHARED 0–100% y-domain (so the 50% ceiling sits at one pixel row in every
 * card — the fixed-threshold invariant). Each segment is colored by which side
 * of the ceiling it sits on; where a segment straddles 50% it is split at the
 * exact crossing point. This renders honestly for clean climbs, spikes, AND
 * sawtooths (e.g. AFAC crosses twice) — the model-pitch "monotonic climb" the
 * data sometimes contradicts is never asserted by the geometry.
 *
 * DESIGNUS audit fixes folded in: F3 (per-segment recolor, no barber-pole),
 * multi-crossing handled, years computed from the timeline (never hardcoded).
 */

import { useRef } from 'react'
import type { CapturePoint } from '@/api/client'
import { useMeasuredWidth } from '@/components/cases/useMeasured'
import { RISK_TEXT_COLORS } from '@/lib/constants'

const RED = 'var(--color-risk-critical)'
const ZINC = '#71717a'
/** Type ink for the two callouts. The line, dots and ceiling keep RED. */
const RED_INK = RISK_TEXT_COLORS.critical
/** Below this px-per-year the card falls back to min/peak/max ticks. */
const YEAR_TICK_ROOM = 40
/**
 * The upstream federal feed froze at Sep 28 2025, so a 2025 point is a partial
 * year drawn beside twelve whole ones. Six of the thirteen series end there and
 * Exhibit A's peak AND crossing are both 2025 — the figure has to say so.
 */
const PARTIAL_YEAR = 2025

interface Props {
  timeline: CapturePoint[]
  ceil: number
  peakYear: number
  peakSharePct: number
  latestSharePct: number
  lang: 'en' | 'es'
  variant?: 'card' | 'lead'
}

export function CaptureTrajectory({
  timeline,
  ceil,
  peakYear,
  peakSharePct,
  latestSharePct,
  lang,
  variant = 'card',
}: Props) {
  const isLead = variant === 'lead'
  // PARALLAX D6 C2 — 1 SVG unit = 1 px. The figure drew into a fixed 150-wide
  // viewBox inside a ~300px card, so half the card was empty and every glyph
  // rendered at its authored size in a box half the width it had. W is now the
  // measured width of the wrapper and the svg is drawn at 1:1.
  const box = useRef<HTMLSpanElement>(null)
  const measured = useMeasuredWidth(box)
  const W = Math.max(measured, isLead ? 280 : 150)
  const H = isLead ? 176 : 112
  const PLOT_H = isLead ? 136 : 80
  const PAD = 10

  const tl = [...timeline].sort((a, b) => a.year - b.year)
  if (tl.length === 0) return null
  // First paint has no measurement yet; the wrapper alone gives the observer
  // something to measure, and the segments are not built at the wrong scale.
  if (measured === 0) return <span ref={box} className="block w-full" style={{ height: H }} />
  const years = tl.map((p) => p.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const span = Math.max(1, maxYear - minYear)
  const x = (year: number) => PAD + ((year - minYear) / span) * (W - 2 * PAD)
  const y = (share: number) => 6 + (1 - share / 100) * (PLOT_H - 12)

  // The first year the series sits at or above the ceiling. The callout names
  // this year, so it must also anchor on the pierce that leads INTO it.
  const crossYear = tl.find((p) => p.share_pct >= ceil)?.year ?? null

  // Build colored segments; split any segment that straddles the ceiling so the
  // color switches exactly at 50% (true Reuters recolor — no overlap).
  const segs: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
    color: string
    /** True when the two ends are more than one year apart (see `bridged`). */
    gap: boolean
  }> = []
  // x where the path pierces the ceiling on its way into `crossYear` — the
  // callout anchors here, not on the crossing year's dot, which sits further
  // right than the piercing. Keying the pierce to `crossYear` matters on a
  // dip-and-recross series (AFAC crosses twice): the first upward pierce
  // anywhere can belong to a later re-entry, and the label would then print one
  // year over a different year's crossing.
  let pierceX: number | null = null
  for (let i = 0; i < tl.length - 1; i++) {
    const a = tl[i]
    const b = tl[i + 1]
    const ax = x(a.year)
    const ay = y(a.share_pct)
    const bx = x(b.year)
    const by = y(b.share_pct)
    const aAbove = a.share_pct >= ceil
    const bAbove = b.share_pct >= ceil
    // The backend drops vendor-years under 1M MXN, so six of the thirteen
    // series have holes. A solid segment across one reads as a measured climb
    // through years nobody measured; a bridged segment is drawn dashed.
    const gap = b.year - a.year > 1
    if (aAbove === bAbove) {
      segs.push({ x1: ax, y1: ay, x2: bx, y2: by, color: aAbove ? RED : ZINC, gap })
    } else {
      const t = (ceil - a.share_pct) / (b.share_pct - a.share_pct)
      const cx = ax + t * (bx - ax)
      const cy = y(ceil)
      if (bAbove && b.year === crossYear) pierceX = cx
      segs.push({ x1: ax, y1: ay, x2: cx, y2: cy, color: aAbove ? RED : ZINC, gap })
      segs.push({ x1: cx, y1: cy, x2: bx, y2: by, color: bAbove ? RED : ZINC, gap })
    }
  }

  const tickYears =
    isLead || W / years.length >= YEAR_TICK_ROOM
      ? years
      : Array.from(new Set([minYear, peakYear, maxYear])).sort((a, b) => a - b)

  /**
   * Keep a mono callout inside the plot box (STORY_DAYS.md § 7).
   *
   * Both callouts anchor on a data year, and the year they anchor on is
   * usually the newest one — a share that peaks at the end of the window is
   * exactly what capture looks like. Centred on the last tick, the label ran
   * ~45px past the viewBox and the browser clipped it at the svg edge.
   * JetBrains Mono advances 0.6em per glyph, so the label's box is known
   * before layout and the anchor can be clamped instead of the text cut.
   *
   * `anchor` moves the reference point: `start` measures the whole label to
   * the right of x, `end` the whole label to its left, `middle` half each way.
   */
  const clampX = (
    cx: number,
    text: string,
    fontSize: number,
    anchor: 'start' | 'middle' | 'end' = 'middle',
  ) => {
    const w = text.length * fontSize * 0.6
    const lead = anchor === 'start' ? 0 : anchor === 'end' ? w : w / 2
    const lo = PAD + lead
    const hi = W - PAD - (w - lead)
    // A label wider than the whole plot cannot be clamped into it; centre it
    // and let the box grow around it rather than pinning it to one edge.
    return lo > hi ? W / 2 - w / 2 + lead : Math.min(Math.max(cx, lo), hi)
  }

  const crossLabel =
    crossYear === null
      ? ''
      : isLead
        ? lang === 'en'
          ? `crossed 50% in ${crossYear}`
          : `cruzó el 50% en ${crossYear}`
        : `'${String(crossYear).slice(2)}`

  /**
   * The callout steps off the line — on BOTH variants (D6b C2).
   *
   * The lead's sentence-length label already did this; the cards kept a centred
   * two-character label on the crossing dot, and the panel measured a segment
   * inside the label box on 11 of the 12 cards (every fell-card peak is 52–57%,
   * one to five pixels above that row).
   *
   * The rule: anchor on the geometric pierce, not the dot. Past the midpoint
   * the label ENDS 6px left of the pierce; before it, it STARTS 6px right. The
   * y follows the side, because a rising path is below the ceiling to the left
   * of its pierce and above it to the right — so the label sits above the rule
   * on the left and below it on the right, always across the 50% line from the
   * stroke.
   *
   * That rule is the FIRST candidate, not the only one. A series that rises and
   * falls inside the window re-crosses the ceiling further along, and on two of
   * the twelve cards the descending zinc leg still clipped the top of the
   * dropped label. So the placement is checked against the geometry it has to
   * avoid and the first clear candidate wins — the invariant "no mark inside
   * the glyph box" is enforced rather than approximated.
   */
  // A series that already starts above the ceiling never pierces it; fall back
  // to the crossing year's own x so the callout still has an anchor.
  const crossX = pierceX ?? (crossYear !== null ? x(crossYear) : 0)
  const labelW = crossLabel.length * 11 * 0.6
  /** Marks inside the box a label would occupy at this anchor and baseline. */
  const marksInBox = (anchor: 'start' | 'end', baseline: number) => {
    const xf = clampX(crossX + (anchor === 'end' ? -6 : 6), crossLabel, 11, anchor)
    const x1 = anchor === 'end' ? xf - labelW : xf
    const x2 = x1 + labelW
    // 11px JetBrains Mono: ~11px of ascent above the baseline, ~3px below.
    const y1 = baseline - 11
    const y2 = baseline + 3
    const inBox = (px: number, py: number) => px >= x1 && px <= x2 && py >= y1 && py <= y2
    let n = 0
    for (const s of segs) {
      const steps = Math.max(24, Math.ceil(Math.hypot(s.x2 - s.x1, s.y2 - s.y1)))
      for (let i = 0; i <= steps; i++) {
        if (inBox(s.x1 + ((s.x2 - s.x1) * i) / steps, s.y1 + ((s.y2 - s.y1) * i) / steps)) {
          n++
          break
        }
      }
    }
    for (const p of tl) if (inBox(x(p.year), y(p.share_pct))) n++
    return n
  }
  const above = y(ceil) - 4
  const below = y(ceil) + 12
  const preferEnd = crossX > W / 2
  const candidates: Array<[('start' | 'end'), number]> = preferEnd
    ? [['end', above], ['start', below], ['end', below], ['start', above]]
    : [['start', below], ['end', above], ['start', above], ['end', below]]
  const [crossAnchor, crossY] = crossLabel
    ? (candidates.find(([a, b]) => marksInBox(a, b) === 0) ??
       candidates.reduce((best, c) => (marksInBox(...c) < marksInBox(...best) ? c : best)))
    : candidates[0]
  /**
   * Axis-end ticks anchor to the edge they sit on. At 11px a centred `2021`
   * over x = PAD hangs 3px past the svg's left edge and the browser clips it;
   * `start` / `end` keep the label attached to its own year AND inside the box.
   */
  const tickAnchor = (xp: number): 'start' | 'middle' | 'end' =>
    xp - PAD < 14 ? 'start' : W - PAD - xp < 14 ? 'end' : 'middle'

  // One decimal, like the sentence beside it — the figure printed "70.01%".
  const peakLabel = `▲ ${peakSharePct.toFixed(1)}% (${peakYear})`

  return (
    <span ref={box} className="block w-full">
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block' }}
        role="img"
        aria-label={
          lang === 'en'
            ? `Vendor share of institution spend ${minYear}–${maxYear}; ${crossYear ? `crossed the 50% ceiling in ${crossYear}, ` : ''}peaked ${peakSharePct}% in ${peakYear}, ${latestSharePct >= ceil ? `holds ${latestSharePct}%` : `fell to ${latestSharePct}%`}.`
            : `Participación del proveedor en el gasto institucional ${minYear}–${maxYear}; ${crossYear ? `cruzó el techo del 50% en ${crossYear}, ` : ''}llegó a ${peakSharePct}% en ${peakYear}, ${latestSharePct >= ceil ? `sostiene ${latestSharePct}%` : `cayó a ${latestSharePct}%`}.`
        }
      >
        {/* 50% ceiling — drawn first, behind the path */}
        <line
          x1={PAD}
          x2={W - PAD}
          y1={y(ceil)}
          y2={y(ceil)}
          stroke={RED}
          strokeWidth={0.75}
          strokeDasharray="3 3"
        />
        {/* trajectory segments (recolored at the crossing) */}
        {segs.map((s, i) => (
          <line
            key={i}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke={s.color}
            strokeWidth={s.color === RED ? (isLead ? 2.4 : 1.8) : isLead ? 1.8 : 1.4}
            strokeDasharray={s.gap ? '2 4' : undefined}
            opacity={s.gap ? 0.55 : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {/* year dots, colored by their own side of the ceiling */}
        {tl.map((p) => (
          <circle
            key={p.year}
            cx={x(p.year)}
            cy={y(p.share_pct)}
            r={p.share_pct >= ceil ? (isLead ? 3 : 2.2) : isLead ? 2.4 : 1.6}
            fill={
              p.year >= PARTIAL_YEAR
                ? 'var(--color-background-card)'
                : p.share_pct >= ceil
                  ? RED
                  : ZINC
            }
            stroke={p.year >= PARTIAL_YEAR ? (p.share_pct >= ceil ? RED : ZINC) : undefined}
            strokeWidth={p.year >= PARTIAL_YEAR ? 1.2 : undefined}
          />
        ))}
        {/* year ticks */}
        {tickYears.map((yr) => (
          <text
            key={`y-${yr}`}
            x={x(yr)}
            y={PLOT_H + (isLead ? 14 : 11)}
            textAnchor={tickAnchor(x(yr))}
            fontSize={11}
            fontFamily="JetBrains Mono, monospace"
            fill="var(--color-text-muted)"
          >
            {(isLead ? String(yr) : `'${String(yr).slice(2)}`) + (yr >= PARTIAL_YEAR ? '*' : '')}
          </text>
        ))}
        {/* crossing-year callout */}
        {crossYear !== null && (
          <text
            x={clampX(crossX + (crossAnchor === 'end' ? -6 : 6), crossLabel, 11, crossAnchor)}
            y={crossY}
            textAnchor={crossAnchor}
            fontSize={11}
            fontFamily="JetBrains Mono, monospace"
            fontWeight={700}
            fill={RED_INK}
          >
            {crossLabel}
          </text>
        )}
        {/* lead-only: peak marker on the line */}
        {isLead && (
          <text
            x={clampX(x(peakYear), peakLabel, 12)}
            y={y(peakSharePct) - 7}
            textAnchor="middle"
            fontSize={12}
            fontFamily="JetBrains Mono, monospace"
            fill="var(--color-text-secondary)"
          >
            {peakLabel}
          </text>
        )}
      </svg>
    </span>
  )
}
