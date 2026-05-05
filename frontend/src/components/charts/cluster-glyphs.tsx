/**
 * cluster-glyphs.tsx — omega-C-P4
 *
 * Seven distinct SVG glyph identifiers for ARIA patterns P1–P7.
 * Each glyph encodes its pattern's semantic vocabulary through geometry,
 * replacing 7 identical concentric circle rings with visual symbols
 * that are self-explanatory without a legend.
 *
 * Design grammar:
 *   P1 Monopoly       — solid filled disk (single dominant entity)
 *   P2 Ghost          — dashed hollow ring (insubstantial / ephemeral)
 *   P3 Intermediary   — arrow-to-dot (pass-through relay)
 *   P4 Collusion      — two overlapping rings (coordinated bidders)
 *   P5 Overpricing    — filled upward triangle (premium over baseline)
 *   P6 Capture        — nested ring inside ring (institution containing vendor)
 *   P7 Network        — three connected dots in a triangle (multi-vendor mesh)
 *
 * Each glyph is rendered in a local coordinate system [0,0]→[1,1].
 * The <g transform> in the caller scales and positions to the attractor.
 *
 * Bilingual ARIA labels are passed through the ariaLabel prop.
 * Hover scale (1.0 → 1.15) and pinned pulse are handled by the caller via
 * the isHovered / isPinned props driving a CSS transform on the outer <g>.
 */

export interface GlyphProps {
  /** Pattern code, selects which glyph to render */
  code: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7'
  /** Pixel size of the glyph bounding box (square). Drives scale transform. */
  size: number
  /** Hex color for the glyph */
  color: string
  /** True while cursor hovers the cluster — scales glyph 1.15× */
  isHovered?: boolean
  /** True when this cluster is the pinned attractor — brightens opacity */
  isPinned?: boolean
  /** Accessible label for the glyph element */
  ariaLabel: string
}

// ── Glyph geometries ──────────────────────────────────────────────────────────
// All shapes are drawn in a 28×28 viewBox.
// Stroke width is normalized to the 28px grid and should NOT be scaled by size.
// The caller applies `transform="translate(cx, cy) scale(s)"` where
// s = size / 28, so visual stroke weight stays constant across sizes.

const VBOX = 28  // internal coordinate space
const C = VBOX / 2  // center = 14

function GlyphP1({ color }: { color: string }) {
  // Solid filled disk — one vendor dominates
  return (
    <circle
      cx={C}
      cy={C}
      r={9}
      fill={color}
      fillOpacity={0.90}
    />
  )
}

function GlyphP2({ color }: { color: string }) {
  // Dashed hollow ring — insubstantial / ephemeral presence
  // dasharray "3 2.8" produces ~6 dashes around the circumference (2π×8.5 ≈ 53px)
  return (
    <circle
      cx={C}
      cy={C}
      r={8.5}
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeOpacity={0.92}
      strokeDasharray="3 2.8"
      strokeLinecap="round"
    />
  )
}

function GlyphP3({ color }: { color: string }) {
  // Arrow-to-dot — pass-through relay / single-use intermediary
  // Arrow shaft from left, arrowhead pointing right, solid dot at destination
  return (
    <g>
      {/* Shaft */}
      <line
        x1={5}
        y1={C}
        x2={18}
        y2={C}
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.88}
        strokeLinecap="round"
      />
      {/* Arrowhead — two angled lines */}
      <polyline
        points={`13.5,${C - 4} 19,${C} 13.5,${C + 4}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.88}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Destination dot */}
      <circle
        cx={23}
        cy={C}
        r={3.5}
        fill={color}
        fillOpacity={0.90}
      />
    </g>
  )
}

function GlyphP4({ color }: { color: string }) {
  // Two overlapping rings — coordinated bidders, collusion
  // Centers offset by ±4.5px from mid, radii 7
  return (
    <g>
      <circle
        cx={C - 4.5}
        cy={C}
        r={7}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.85}
      />
      <circle
        cx={C + 4.5}
        cy={C}
        r={7}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.85}
      />
    </g>
  )
}

function GlyphP5({ color }: { color: string }) {
  // Filled upward triangle — price premium above baseline
  // Apex at top, base at bottom; slightly bold stroked edge for crispness
  const apex = `${C},${C - 9}`
  const bl   = `${C - 9},${C + 7}`
  const br   = `${C + 9},${C + 7}`
  return (
    <polygon
      points={`${apex} ${bl} ${br}`}
      fill={color}
      fillOpacity={0.88}
      stroke={color}
      strokeWidth={0.8}
      strokeOpacity={0.60}
      strokeLinejoin="round"
    />
  )
}

function GlyphP6({ color }: { color: string }) {
  // Nested ring inside ring — institution containing vendor (capture)
  return (
    <g>
      {/* Outer ring */}
      <circle
        cx={C}
        cy={C}
        r={9.5}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeOpacity={0.70}
      />
      {/* Inner ring */}
      <circle
        cx={C}
        cy={C}
        r={4.5}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={0.92}
      />
      {/* Inner fill dot — the captured vendor */}
      <circle
        cx={C}
        cy={C}
        r={1.8}
        fill={color}
        fillOpacity={0.80}
      />
    </g>
  )
}

function GlyphP7({ color }: { color: string }) {
  // Three connected dots in a triangle — multi-vendor network mesh
  // Positions: top center, bottom-left, bottom-right
  const ty  = C - 8.5   // top y
  const by  = C + 5.5   // bottom y
  const blx = C - 7.5   // bottom-left x
  const brx = C + 7.5   // bottom-right x
  const DOT_R = 3
  return (
    <g>
      {/* Edges first so dots sit on top */}
      <line x1={C}   y1={ty} x2={blx} y2={by} stroke={color} strokeWidth={1.6} strokeOpacity={0.60} strokeLinecap="round" />
      <line x1={C}   y1={ty} x2={brx} y2={by} stroke={color} strokeWidth={1.6} strokeOpacity={0.60} strokeLinecap="round" />
      <line x1={blx} y1={by} x2={brx} y2={by} stroke={color} strokeWidth={1.6} strokeOpacity={0.60} strokeLinecap="round" />
      {/* Dots */}
      <circle cx={C}   cy={ty} r={DOT_R} fill={color} fillOpacity={0.90} />
      <circle cx={blx} cy={by} r={DOT_R} fill={color} fillOpacity={0.90} />
      <circle cx={brx} cy={by} r={DOT_R} fill={color} fillOpacity={0.90} />
    </g>
  )
}

// ── Map from pattern code → glyph renderer ───────────────────────────────────
const GLYPH_MAP: Record<GlyphProps['code'], (props: { color: string }) => React.ReactElement> = {
  P1: GlyphP1,
  P2: GlyphP2,
  P3: GlyphP3,
  P4: GlyphP4,
  P5: GlyphP5,
  P6: GlyphP6,
  P7: GlyphP7,
}

// ── PatternGlyph — main export ───────────────────────────────────────────────
/**
 * PatternGlyph renders a semantically distinct SVG glyph at a given size,
 * positioned so its center is at (0,0) in the caller's coordinate system.
 * The caller should wrap in a <g transform="translate(cx, cy)">.
 *
 * On hover the glyph scales 1.0 → 1.15 via CSS transform (GPU-composited).
 * On pin the glyph brightens (opacity 1.0 vs 0.82 default).
 */
export function PatternGlyph({ code, size, color, isHovered = false, isPinned = false, ariaLabel }: GlyphProps) {
  const GlyphFn = GLYPH_MAP[code]
  if (!GlyphFn) return null

  // Scale from VBOX space to requested pixel size
  const s = size / VBOX
  const baseOpacity = isPinned ? 1.0 : isHovered ? 0.95 : 0.82
  const scaleVal    = isHovered ? 1.15 : isPinned ? 1.05 : 1.0

  return (
    <g
      transform={`scale(${s})`}
      style={{
        transformBox: 'fill-box',
        transformOrigin: `${C}px ${C}px`,
        transform: `scale(${scaleVal})`,
        opacity: baseOpacity,
        transition: 'transform 160ms cubic-bezier(0.34,1.56,0.64,1), opacity 160ms ease',
      }}
      aria-label={ariaLabel}
      role="img"
    >
      <GlyphFn color={color} />
    </g>
  )
}
