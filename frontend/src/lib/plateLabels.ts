/**
 * plateLabels — greedy label placement for La Trama's plates.
 *
 * PARALLAX D4 § Change 1/2: "HTML owns glyphs, SVG owns geometry". The
 * plates draw their marks in SVG and their labels as absolutely positioned
 * HTML, so every measurement here is in RENDERED pixels — never viewBox
 * units. That is the whole point: a 9.5px label inside a viewBox scaled to
 * 0.33 rendered at 3.2px, which is what the Day 4 audit found.
 *
 * placeLabels() takes candidates in priority order and returns the ones it
 * could seat: a label that would cross a bound is re-anchored (left/right)
 * before it is rejected, pre-placed obstacles always win, and anything that
 * still collides is dropped rather than overprinted.
 */

export interface LabelBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export type LabelAlign = 'center' | 'left' | 'right'

export interface LabelCandidate {
  id: string | number
  /** Anchor point (the mark's centre), in rendered px. */
  x: number
  y: number
  /** Label box size, in rendered px (see measureLabel). */
  width: number
  height: number
  /** Baseline offset above the anchor — usually mark radius + leading. */
  above: number
  /** Optional fallback offset below the anchor; omitted = never go below. */
  below?: number
}

export interface PlacedLabel {
  id: string | number
  /** Anchor x for the label (interpret with `align`). */
  x: number
  /** Top edge of the label box. */
  y: number
  align: LabelAlign
  box: LabelBox
}

const intersects = (a: LabelBox, b: LabelBox): boolean =>
  !(a.x1 <= b.x0 || a.x0 >= b.x1 || a.y1 <= b.y0 || a.y0 >= b.y1)

const inside = (a: LabelBox, bounds: LabelBox): boolean =>
  a.x0 >= bounds.x0 && a.x1 <= bounds.x1 && a.y0 >= bounds.y0 && a.y1 <= bounds.y1

/** Box for one (align, top) pair. */
function boxFor(c: LabelCandidate, align: LabelAlign, top: number): LabelBox {
  const x0 = align === 'center' ? c.x - c.width / 2 : align === 'left' ? c.x : c.x - c.width
  return { x0, y0: top, x1: x0 + c.width, y1: top + c.height }
}

/**
 * Seat as many candidates as fit. Candidates are tried in the order given
 * (priority order — put the ones that matter first).
 *
 * @param obstacles Pre-placed boxes that always win (axis ticks, threshold
 *                  labels, quadrant annotations).
 * @param bounds    The plate box; a label never leaves it.
 */
export function placeLabels(
  candidates: LabelCandidate[],
  obstacles: LabelBox[],
  bounds: LabelBox,
): PlacedLabel[] {
  const placed: PlacedLabel[] = []
  const taken: LabelBox[] = [...obstacles]

  for (const c of candidates) {
    // Vertical: above first, then below when the caller allows it.
    const tops = [c.y - c.above - c.height]
    if (c.below !== undefined) tops.push(c.y + c.below)

    let seated: PlacedLabel | null = null
    for (const top of tops) {
      // Horizontal: centred, then re-anchored against whichever bound it
      // crosses, then the other side.
      const centred = boxFor(c, 'center', top)
      const aligns: LabelAlign[] =
        centred.x1 > bounds.x1 ? ['center', 'right', 'left']
          : centred.x0 < bounds.x0 ? ['center', 'left', 'right']
            : ['center', 'left', 'right']

      for (const align of aligns) {
        const box = boxFor(c, align, top)
        if (!inside(box, bounds)) continue
        if (taken.some((t) => intersects(box, t))) continue
        seated = { id: c.id, x: c.x, y: top, align, box }
        break
      }
      if (seated) break
    }

    if (seated) {
      placed.push(seated)
      taken.push(seated.box)
    }
  }

  return placed
}

// ── measurement ─────────────────────────────────────────────────────────────

let ctx: CanvasRenderingContext2D | null | undefined

/** Shared 2d context; null when there is no DOM (tests, SSR). */
function sharedCtx(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx
  try {
    ctx = document.createElement('canvas').getContext('2d')
  } catch {
    ctx = null
  }
  return ctx
}

export interface Measured {
  width: number
  height: number
  lines: number
}

/**
 * Real text width for `font` (a CSS font shorthand), wrapped at `maxWidth`.
 * Falls back to a monospace advance estimate when there is no canvas.
 */
export function measureLabel(
  text: string,
  font: string,
  maxWidth: number,
  lineHeight: number,
): Measured {
  const c = sharedCtx()
  // Assigning ctx.font re-parses the shorthand, so set it ONCE per call and
  // let every measurement below reuse it.
  if (c) c.font = font
  const fallbackSize = parseFloat(font) || 11
  const widthOf = (s: string) => (c ? c.measureText(s).width : s.length * fallbackSize * 0.6)

  const w = widthOf(text)
  if (w <= maxWidth) return { width: Math.ceil(w), height: lineHeight, lines: 1 }
  // Wrapped: the box is as tall as the lines it needs, and as wide as the
  // LONGEST line rather than the cap — a short last line must not make a
  // narrow label reserve a wide box.
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (widthOf(next) > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  let widest = 0
  for (const l of lines) widest = Math.max(widest, widthOf(l))
  return { width: Math.ceil(Math.min(widest, maxWidth)), height: lines.length * lineHeight, lines: lines.length }
}

export interface Fitted {
  lines: string[]
  /** Widest line, tracking included, pad excluded. */
  width: number
  height: number
}

/**
 * Fit `text` into a column `maxWidth` px wide on at most `maxLines` lines,
 * breaking greedily at spaces. Returns null when it cannot: a single word, or
 * any line plus `pad`, wider than the column, or more lines than allowed.
 * `tracking` is letter-spacing in em (added per character); `lineHeight`
 * defaults to 1.25 × the font size. PARALLAX D7b § Change 5 (Q2).
 */
export function fitLabel(
  text: string,
  font: string,
  maxWidth: number,
  opts: { maxLines?: number; pad?: number; tracking?: number; lineHeight?: number } = {},
): Fitted | null {
  const { maxLines = 2, pad = 0, tracking = 0 } = opts
  const size = parseFloat(font.replace(/^\s*\d{3}\s+/, '')) || 11
  const lineHeight = opts.lineHeight ?? Math.round(size * 1.25)
  const c = sharedCtx()
  if (c) c.font = font
  const widthOf = (s: string) => (c ? c.measureText(s).width : s.length * size * 0.6) + s.length * size * tracking
  const fits = (s: string) => widthOf(s) + pad <= maxWidth

  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (fits(next)) {
      line = next
      continue
    }
    if (!line || !fits(word)) return null
    lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  if (lines.length === 0 || lines.length > maxLines) return null
  const width = Math.max(...lines.map(widthOf))
  return { lines, width: Math.ceil(width), height: lines.length * lineHeight }
}
