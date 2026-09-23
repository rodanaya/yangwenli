/**
 * PlateIndex — the drawn column index for the two Marimekko plates (WHO and
 * WHAT), their legends and the desktop hover readout.
 *
 * Replaces the U+2460 circled digits, which rendered in the Windows symbol
 * fallback at ~9px optical and touched on 9–14px columns (PARALLAX D7b
 * § Change 5). A hairline circle + a mono digit, so the digit stays real text
 * (the a11y judge's Q2: the glyph keeps a text equivalent).
 */

const MONO = 'var(--font-family-mono, monospace)'

/** Columns narrower than this draw no glyph; the legend keeps the index. */
export const PLATE_INDEX_MIN_COL = 16

/** SVG glyph centred on (cx, cy). */
export function PlateIndexMark({ n, cx, cy }: { n: number; cx: number; cy: number }) {
  return (
    <g aria-hidden="true" pointerEvents="none" style={{ color: 'var(--color-text-muted)' }}>
      <circle cx={cx} cy={cy} r={7} fill="none" stroke="currentColor" strokeWidth={1} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={MONO}
        fontSize={n >= 10 ? 10 : 11}
        fill="currentColor"
      >
        {n}
      </text>
    </g>
  )
}

/** HTML twin for legend rows and the hover readout. */
export function PlateIndexBadge({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-full tabular-nums"
      style={{
        width: 16,
        height: 16,
        border: '1px solid currentColor',
        fontFamily: MONO,
        fontSize: n >= 10 ? 10 : 11,
        lineHeight: 1,
        color: 'var(--color-text-muted)',
      }}
    >
      {n}
    </span>
  )
}
