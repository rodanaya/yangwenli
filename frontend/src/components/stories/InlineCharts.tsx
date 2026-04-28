/**
 * InlineCharts — pure SVG editorial chart components for embedding inside
 * chapter prose. Redesigned (Apr 2026) to match the dashboard's
 * Playfair-Italic-800 + sector-palette aesthetic ("the bar"). Each chart is:
 *
 *   ┌──────────────────────────────────────┐
 *   ▎ EYEBROW · MICRO MONO 0.18em          │   chrome
 *   │  Title · Playfair serif tight        │   serif title
 *   │  6,034   ← Playfair Italic 800       │   anchor stat (when applicable)
 *   │  ┄┄┄┄┄┄┄ caption · mono              │
 *   │                                       │
 *   │  [SVG plot]                           │
 *   │                                       │
 *   │  caption · mono · text-muted          │
 *   └──────────────────────────────────────┘
 *
 * No external chart libraries. Sector palette only — no random violets,
 * emeralds, cyans. Numbers are tabular-nums, mono for axes, Playfair for
 * the anchor.
 */

import type { StoryInlineChartData, StoryChartPoint } from '@/lib/story-content'

// ---------------------------------------------------------------------------
// Sector-only palette. Replaces the prior random-hex grab-bag.
// ---------------------------------------------------------------------------

const PALETTE = [
  'var(--color-sector-salud)',           // red-600 — drama / danger
  '#a06820',                              // dashboard amber
  'var(--color-sector-tecnologia)',      // blue-600
  'var(--color-sector-infraestructura)', // orange-600
  'var(--color-sector-energia)',         // yellow-700
  'var(--color-sector-defensa)',         // navy
  'var(--color-text-muted)',             // muted neutral
  'var(--color-text-secondary)',         // secondary neutral
]

const HIGHLIGHT_COLOR = 'var(--color-sector-salud)'
const REFERENCE_COLOR = 'var(--color-sector-tecnologia)'
const ANCHOR_COLOR = '#a06820'

function getColor(point: StoryChartPoint, index: number): string {
  return point.color ?? PALETTE[index % PALETTE.length]
}

function maxVal(points: StoryChartPoint[], provided?: number): number {
  if (provided != null && provided > 0) return provided
  return Math.max(...points.map((p) => p.value), 1)
}

// ---------------------------------------------------------------------------
// Card chrome — eyebrow + serif title + optional anchor stat (matches
// the dashboard tile rhythm).
// ---------------------------------------------------------------------------

function ChartCard({
  title,
  eyebrow,
  anchor,
  annotation,
  children,
}: {
  title: string
  eyebrow?: string
  anchor?: { value: string; label: string; color?: string }
  annotation?: string
  children: React.ReactNode
}) {
  return (
    <figure
      className="w-full bg-background-card overflow-hidden my-8"
      style={{
        borderLeft: `3px solid ${ANCHOR_COLOR}`,
        borderTop: '1px solid var(--color-border)',
        borderRight: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        borderRadius: 2,
      }}
      role="img"
      aria-label={title}
    >
      <div
        className="flex items-center justify-between px-5 pt-4 pb-2 font-mono uppercase"
        style={{
          fontSize: 9,
          letterSpacing: '0.18em',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>{eyebrow ?? 'CHART · COMPRANET'}</span>
        <span aria-hidden>v0.6.5</span>
      </div>
      <figcaption className="px-5 pb-2">
        <h3
          className="text-text-primary"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 700,
            fontSize: 'clamp(1.05rem, 1.8vw, 1.2rem)',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            margin: 0,
          }}
        >
          {title}
        </h3>
      </figcaption>

      {anchor && (
        <div className="px-5 pt-1 pb-3 flex items-baseline gap-3">
          <span
            className="tabular-nums"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 800,
              fontSize: 'clamp(1.8rem, 3.6vw, 2.4rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              color: anchor.color ?? ANCHOR_COLOR,
            }}
          >
            {anchor.value}
          </span>
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 9,
              letterSpacing: '0.16em',
              color: 'var(--color-text-muted)',
            }}
          >
            {anchor.label}
          </span>
        </div>
      )}

      <div className="px-3 pb-2">{children}</div>
      {annotation && (
        <p
          className="px-5 pb-4 pt-1 font-mono leading-[1.55]"
          style={{ fontSize: 10.5, color: 'var(--color-text-muted)' }}
        >
          {annotation}
        </p>
      )}
    </figure>
  )
}

// ---------------------------------------------------------------------------
// 1. InlineDotGrid — large dot field with two stat callouts. Highlighted
// dots cluster top-left so the visual ratio reads instantly.
// ---------------------------------------------------------------------------

const MAX_TRUE_DOTS = 9000

export function InlineDotGrid({
  data,
  title,
}: {
  data: StoryInlineChartData
  title: string
}) {
  const total = data.points.reduce((s, p) => s + p.value, 0)

  // Choose dot geometry based on total. Smaller dots when there are more.
  const { dotSize, dotGap, cols } =
    total > 8000
      ? { dotSize: 4, dotGap: 1.5, cols: 110 }
      : total > 4000
        ? { dotSize: 3.5, dotGap: 1, cols: 130 }
        : total > 2000
          ? { dotSize: 5, dotGap: 1.5, cols: 80 }
          : { dotSize: 7, dotGap: 2, cols: 40 }

  const scale = total > MAX_TRUE_DOTS ? MAX_TRUE_DOTS / total : 1
  const displayed = Math.round(total * scale)

  // Build [highlights..., rest...] so the highlighted block clusters top-left
  const dots: { color: string; highlight: boolean }[] = []
  for (let i = 0; i < data.points.length; i++) {
    const pt = data.points[i]
    if (!pt.highlight) continue
    const count = Math.round(pt.value * scale)
    const color = getColor(pt, i)
    for (let d = 0; d < count; d++) dots.push({ color, highlight: true })
  }
  for (let i = 0; i < data.points.length; i++) {
    const pt = data.points[i]
    if (pt.highlight) continue
    const count = Math.round(pt.value * scale)
    const color = getColor(pt, i)
    for (let d = 0; d < count; d++) dots.push({ color, highlight: false })
  }

  const rows = Math.ceil(displayed / cols)
  const svgW = cols * (dotSize + dotGap)
  const svgH = rows * (dotSize + dotGap)

  // Stat callouts — split into highlighted vs others
  const highlighted = data.points.filter((p) => p.highlight)
  const others = data.points.filter((p) => !p.highlight)
  const highlightedTotal = highlighted.reduce((s, p) => s + p.value, 0)
  const othersTotal = others.reduce((s, p) => s + p.value, 0)
  const highlightedColor = highlighted[0] ? getColor(highlighted[0], 0) : HIGHLIGHT_COLOR
  const othersColor = others[0] ? getColor(others[0], 1) : 'var(--color-text-muted)'

  return (
    <ChartCard
      title={title}
      eyebrow="DOT FIELD · 1:1"
      annotation={data.annotation}
    >
      {/* Twin Playfair callouts — leads with the ratio */}
      {highlighted.length > 0 && others.length > 0 && (
        <div className="grid grid-cols-2 gap-6 mb-5 px-2">
          {[
            { label: highlighted[0].label, total: highlightedTotal, color: highlightedColor },
            { label: others[0].label,      total: othersTotal,      color: othersColor },
          ].map((side, idx) => (
            <div key={idx}>
              <div
                className="tabular-nums"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic',
                  fontWeight: 800,
                  fontSize: 'clamp(1.8rem, 3.4vw, 2.4rem)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.02em',
                  color: side.color,
                }}
              >
                {side.total.toLocaleString()}
              </div>
              <div
                className="font-mono uppercase mt-1.5"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.16em',
                  color: 'var(--color-text-muted)',
                }}
              >
                {side.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="dot-glow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {dots.map((dot, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          const cx = col * (dotSize + dotGap) + dotSize / 2
          const cy = row * (dotSize + dotGap) + dotSize / 2
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={dot.highlight ? dotSize / 2 + 0.5 : dotSize / 2}
              fill={dot.color}
              opacity={dot.highlight ? 1 : 0.5}
              filter={dot.highlight ? 'url(#dot-glow)' : undefined}
            />
          )
        })}
      </svg>

      {/* Compact legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pt-3 pb-1">
        {data.points.map((pt, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 font-mono"
            style={{ fontSize: 10.5, color: 'var(--color-text-secondary)' }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getColor(pt, i), opacity: pt.highlight ? 1 : 0.55 }}
            />
            <span>{pt.label}</span>
            <span className="tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
              {pt.value.toLocaleString()}
            </span>
          </div>
        ))}
        {scale < 1 && (
          <span
            className="self-center font-mono"
            style={{ fontSize: 9.5, color: 'var(--color-text-muted)' }}
          >
            ({displayed.toLocaleString()} of {total.toLocaleString()})
          </span>
        )}
      </div>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 2. InlineBarChart — horizontal bars. Anchored by the highlighted row's
// value (top-stat). Sector palette only.
// ---------------------------------------------------------------------------

export function InlineBarChart({
  data,
  title,
}: {
  data: StoryInlineChartData
  title: string
}) {
  const mx = maxVal(data.points, data.maxValue)
  const BAR_HEIGHT = 22
  const LABEL_W = 140
  const VALUE_W = 60
  const BAR_AREA = 340
  const ROW_GAP = 8
  const svgH = data.points.length * (BAR_HEIGHT + ROW_GAP) + 20
  const svgW = LABEL_W + BAR_AREA + VALUE_W + 8
  const unit = data.unit ?? ''

  const refX = (v: number) => LABEL_W + (v / mx) * BAR_AREA

  // Anchor stat = the highlighted row, or the largest value
  const highlightedPt = data.points.find((p) => p.highlight) ?? data.points[0]
  const anchor = highlightedPt
    ? {
        value: `${highlightedPt.value.toLocaleString()}${unit ? ` ${unit}` : ''}`,
        label: highlightedPt.label,
        color: highlightedPt.highlight ? HIGHLIGHT_COLOR : ANCHOR_COLOR,
      }
    : undefined

  return (
    <ChartCard
      title={title}
      eyebrow="HORIZONTAL · RANKED"
      anchor={anchor}
      annotation={data.annotation}
    >
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMinYMin meet"
        className="w-full"
        aria-hidden="true"
      >
        {data.referenceLine && (
          <line
            x1={refX(data.referenceLine.value)}
            y1={0}
            x2={refX(data.referenceLine.value)}
            y2={svgH - 12}
            stroke={data.referenceLine.color ?? REFERENCE_COLOR}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.7}
          />
        )}
        {data.referenceLine2 && (
          <line
            x1={refX(data.referenceLine2.value)}
            y1={0}
            x2={refX(data.referenceLine2.value)}
            y2={svgH - 12}
            stroke={data.referenceLine2.color ?? 'var(--color-sector-energia)'}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.7}
          />
        )}

        {data.points.map((pt, i) => {
          const y = i * (BAR_HEIGHT + ROW_GAP) + 4
          const barW = Math.max(2, (pt.value / mx) * BAR_AREA)
          const color = pt.highlight ? HIGHLIGHT_COLOR : getColor(pt, i)
          const opacity = pt.highlight ? 0.95 : 0.65

          return (
            <g key={i}>
              <text
                x={LABEL_W - 6}
                y={y + BAR_HEIGHT / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="var(--font-family-mono, monospace)"
                fill="var(--color-text-secondary)"
              >
                {pt.label.length > 18 ? pt.label.slice(0, 17) + '…' : pt.label}
              </text>

              <rect
                x={LABEL_W}
                y={y}
                width={barW}
                height={BAR_HEIGHT}
                fill={color}
                opacity={opacity}
                rx={1}
              />

              {pt.annotation && barW > 60 && (
                <text
                  x={LABEL_W + barW - 4}
                  y={y + BAR_HEIGHT / 2 + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="rgba(255,255,255,0.85)"
                >
                  {pt.annotation}
                </text>
              )}

              <text
                x={LABEL_W + barW + 5}
                y={y + BAR_HEIGHT / 2 + 1}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={10.5}
                fontFamily="var(--font-family-mono, monospace)"
                fill={pt.highlight ? HIGHLIGHT_COLOR : 'var(--color-text-muted)'}
                fontWeight={pt.highlight ? 700 : 400}
              >
                {pt.value.toLocaleString()}{unit ? ` ${unit}` : ''}
              </text>
            </g>
          )
        })}

        {data.referenceLine && (
          <text
            x={refX(data.referenceLine.value) + 3}
            y={svgH - 4}
            fontSize={10}
            fontFamily="var(--font-family-mono, monospace)"
            fill={data.referenceLine.color ?? REFERENCE_COLOR}
            opacity={0.9}
          >
            {data.referenceLine.label}
          </text>
        )}
        {data.referenceLine2 && (
          <text
            x={refX(data.referenceLine2.value) + 3}
            y={svgH - 4}
            fontSize={10}
            fontFamily="var(--font-family-mono, monospace)"
            fill={data.referenceLine2.color ?? 'var(--color-sector-energia)'}
            opacity={0.9}
          >
            {data.referenceLine2.label}
          </text>
        )}
      </svg>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// Shared line/area helpers
// ---------------------------------------------------------------------------

function buildPolyPoints(
  points: StoryChartPoint[],
  plotX: (i: number) => number,
  plotY: (v: number) => number
): string {
  return points.map((p, i) => `${plotX(i)},${plotY(p.value)}`).join(' ')
}

function buildAreaPath(
  points: StoryChartPoint[],
  plotX: (i: number) => number,
  plotY: (v: number) => number,
  baseY: number
): string {
  if (points.length === 0) return ''
  const top = points.map((p, i) => `${plotX(i)},${plotY(p.value)}`).join(' L ')
  return `M ${plotX(0)},${baseY} L ${top} L ${plotX(points.length - 1)},${baseY} Z`
}

// Compute anchor stat from the highlighted point (or last)
function pickAnchor(
  pts: StoryChartPoint[],
  unit: string | undefined,
  color: string,
): { value: string; label: string; color?: string } | undefined {
  const target = pts.find((p) => p.highlight) ?? pts[pts.length - 1]
  if (!target) return undefined
  return {
    value: `${target.value.toLocaleString()}${unit ? ` ${unit}` : ''}`,
    label: target.label,
    color,
  }
}

// ---------------------------------------------------------------------------
// 3. InlineLineChart
// ---------------------------------------------------------------------------

export function InlineLineChart({
  data,
  title,
}: {
  data: StoryInlineChartData
  title: string
}) {
  const pts = data.points
  const mx = maxVal(pts, data.maxValue)
  const mn = 0
  const W = 560
  const H = 170
  const PAD = { top: 18, right: 24, bottom: 28, left: 44 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const plotX = (i: number) =>
    PAD.left + (pts.length > 1 ? (i / (pts.length - 1)) * plotW : plotW / 2)
  const plotY = (v: number) =>
    PAD.top + plotH - ((v - mn) / (mx - mn)) * plotH

  const mainColor = ANCHOR_COLOR
  const linePoints = buildPolyPoints(pts, plotX, plotY)
  const showEveryOther = pts.length > 15

  return (
    <ChartCard
      title={title}
      eyebrow={`TIME SERIES · ${pts.length} POINTS`}
      anchor={pickAnchor(pts, data.unit, mainColor)}
      annotation={data.annotation}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mainColor} stopOpacity={0.22} />
            <stop offset="100%" stopColor={mainColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {data.referenceLine && (
          <>
            <line
              x1={PAD.left}
              y1={plotY(data.referenceLine.value)}
              x2={W - PAD.right}
              y2={plotY(data.referenceLine.value)}
              stroke={data.referenceLine.color ?? REFERENCE_COLOR}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.65}
            />
            <text
              x={W - PAD.right + 2}
              y={plotY(data.referenceLine.value) + 4}
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine.color ?? REFERENCE_COLOR}
              opacity={0.9}
            >
              {data.referenceLine.label}
            </text>
          </>
        )}

        {pts.length > 1 && (
          <path
            d={buildAreaPath(pts, plotX, plotY, PAD.top + plotH)}
            fill="url(#line-grad)"
          />
        )}

        {pts.length > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke={mainColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {pts.map((pt, i) => (
          <circle
            key={i}
            cx={plotX(i)}
            cy={plotY(pt.value)}
            r={pt.highlight ? 5 : 2.5}
            fill={pt.highlight ? HIGHLIGHT_COLOR : mainColor}
            stroke={pt.highlight ? 'var(--color-background)' : 'none'}
            strokeWidth={pt.highlight ? 2 : 0}
          />
        ))}

        {pts.map((pt, i) =>
          pt.highlight && pt.annotation ? (
            <text
              key={`ann-${i}`}
              x={plotX(i)}
              y={plotY(pt.value) - 12}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill={HIGHLIGHT_COLOR}
              fontWeight={700}
            >
              {pt.annotation}
            </text>
          ) : null
        )}

        {pts.map((pt, i) =>
          showEveryOther && i % 2 !== 0 ? null : (
            <text
              key={`xl-${i}`}
              x={plotX(i)}
              y={H - 4}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill="var(--color-text-muted)"
            >
              {pt.label}
            </text>
          )
        )}

        {data.yLabel && (
          <text
            x={6}
            y={PAD.top + plotH / 2}
            textAnchor="middle"
            fontSize={10}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-muted)"
            transform={`rotate(-90, 6, ${PAD.top + plotH / 2})`}
          >
            {data.yLabel}
          </text>
        )}
      </svg>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 4. InlineAreaChart
// ---------------------------------------------------------------------------

export function InlineAreaChart({
  data,
  title,
}: {
  data: StoryInlineChartData
  title: string
}) {
  const pts = data.points
  const mx = maxVal(pts, data.maxValue)
  const W = 560
  const H = 170
  const PAD = { top: 18, right: 24, bottom: 28, left: 44 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const plotX = (i: number) =>
    PAD.left + (pts.length > 1 ? (i / (pts.length - 1)) * plotW : plotW / 2)
  const plotY = (v: number) =>
    PAD.top + plotH - (v / mx) * plotH

  const mainColor = 'var(--color-sector-infraestructura)'
  const linePoints = buildPolyPoints(pts, plotX, plotY)
  const showEveryOther = pts.length > 15

  return (
    <ChartCard
      title={title}
      eyebrow={`AREA · ${pts.length} POINTS`}
      anchor={pickAnchor(pts, data.unit, mainColor)}
      annotation={data.annotation}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mainColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={mainColor} stopOpacity={0.04} />
          </linearGradient>
        </defs>

        {pts.length > 1 && (
          <path
            d={buildAreaPath(pts, plotX, plotY, PAD.top + plotH)}
            fill="url(#area-grad)"
          />
        )}

        {data.referenceLine && (
          <>
            <line
              x1={PAD.left}
              y1={plotY(data.referenceLine.value)}
              x2={W - PAD.right}
              y2={plotY(data.referenceLine.value)}
              stroke={data.referenceLine.color ?? REFERENCE_COLOR}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.65}
            />
            <text
              x={W - PAD.right + 2}
              y={plotY(data.referenceLine.value) + 4}
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine.color ?? REFERENCE_COLOR}
              opacity={0.9}
            >
              {data.referenceLine.label}
            </text>
          </>
        )}

        {pts.length > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke={mainColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {pts.map((pt, i) => (
          <circle
            key={i}
            cx={plotX(i)}
            cy={plotY(pt.value)}
            r={pt.highlight ? 5 : 2.5}
            fill={pt.highlight ? HIGHLIGHT_COLOR : mainColor}
            stroke={pt.highlight ? 'var(--color-background)' : 'none'}
            strokeWidth={pt.highlight ? 2 : 0}
          />
        ))}
        {pts.map((pt, i) =>
          pt.highlight && pt.annotation ? (
            <text
              key={`ann-${i}`}
              x={plotX(i)}
              y={plotY(pt.value) - 12}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill={HIGHLIGHT_COLOR}
              fontWeight={700}
            >
              {pt.annotation}
            </text>
          ) : null
        )}

        {pts.map((pt, i) =>
          showEveryOther && i % 2 !== 0 ? null : (
            <text
              key={`xl-${i}`}
              x={plotX(i)}
              y={H - 4}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill="var(--color-text-muted)"
            >
              {pt.label}
            </text>
          )
        )}

        {data.yLabel && (
          <text
            x={6}
            y={PAD.top + plotH / 2}
            textAnchor="middle"
            fontSize={10}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-muted)"
            transform={`rotate(-90, 6, ${PAD.top + plotH / 2})`}
          >
            {data.yLabel}
          </text>
        )}
      </svg>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 5. InlineSpikeChart — vertical bars (histogram-style)
// ---------------------------------------------------------------------------

export function InlineSpikeChart({
  data,
  title,
}: {
  data: StoryInlineChartData
  title: string
}) {
  const pts = data.points
  const mx = maxVal(pts, data.maxValue)
  const W = 560
  const H = 170
  const PAD = { top: 24, right: 16, bottom: pts.length > 12 ? 48 : 24, left: 16 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const barW = Math.max(6, Math.floor(plotW / pts.length) - 2)
  const barGap = pts.length > 1 ? plotW / pts.length : plotW

  const anchorPt = pts.find((p) => p.highlight) ?? pts.reduce((a, b) => (a.value > b.value ? a : b), pts[0])

  return (
    <ChartCard
      title={title}
      eyebrow={`HISTOGRAM · ${pts.length} BARS`}
      anchor={
        anchorPt
          ? {
              value: `${anchorPt.value.toLocaleString()}${data.unit ? ` ${data.unit}` : ''}`,
              label: anchorPt.label,
              color: anchorPt.highlight ? HIGHLIGHT_COLOR : ANCHOR_COLOR,
            }
          : undefined
      }
      annotation={data.annotation}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        {pts.map((pt, i) => {
          const bx = PAD.left + i * barGap + (barGap - barW) / 2
          const barH = Math.max(2, (pt.value / mx) * plotH)
          const by = PAD.top + plotH - barH
          const color = pt.highlight ? HIGHLIGHT_COLOR : 'var(--color-text-secondary)'
          const labelRotate = pts.length > 12

          return (
            <g key={i}>
              <rect
                x={bx}
                y={by}
                width={barW}
                height={barH}
                fill={color}
                opacity={pt.highlight ? 0.95 : 0.55}
                rx={1}
              />

              {pt.highlight && pt.annotation && (
                <text
                  x={bx + barW / 2}
                  y={by - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill={HIGHLIGHT_COLOR}
                  fontWeight={700}
                >
                  {pt.annotation}
                </text>
              )}

              {pt.highlight && !pt.annotation && (
                <text
                  x={bx + barW / 2}
                  y={by - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill={HIGHLIGHT_COLOR}
                  fontWeight={700}
                >
                  {pt.value.toLocaleString()}
                </text>
              )}

              {labelRotate ? (
                <text
                  x={bx + barW / 2}
                  y={PAD.top + plotH + 6}
                  textAnchor="end"
                  fontSize={10}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-muted)"
                  transform={`rotate(-45, ${bx + barW / 2}, ${PAD.top + plotH + 6})`}
                >
                  {pt.label}
                </text>
              ) : (
                <text
                  x={bx + barW / 2}
                  y={PAD.top + plotH + 14}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-muted)"
                >
                  {pt.label}
                </text>
              )}
            </g>
          )
        })}

        {data.referenceLine && (
          <>
            <line
              x1={PAD.left}
              y1={PAD.top + plotH - (data.referenceLine.value / mx) * plotH}
              x2={W - PAD.right}
              y2={PAD.top + plotH - (data.referenceLine.value / mx) * plotH}
              stroke={data.referenceLine.color ?? REFERENCE_COLOR}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.65}
            />
            <text
              x={PAD.left + 2}
              y={PAD.top + plotH - (data.referenceLine.value / mx) * plotH - 3}
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine.color ?? REFERENCE_COLOR}
              opacity={0.9}
            >
              {data.referenceLine.label}
            </text>
          </>
        )}
      </svg>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 6. InlineDivergingBar — centered at 0
// ---------------------------------------------------------------------------

export function InlineDivergingBar({
  data,
  title,
}: {
  data: StoryInlineChartData
  title: string
}) {
  const pts = data.points
  const BAR_HEIGHT = 20
  const LABEL_W = 148
  const ROW_GAP = 6
  const HALF_W = 180
  const VALUE_PAD = 36
  const W = LABEL_W + HALF_W * 2 + VALUE_PAD * 2
  const H = pts.length * (BAR_HEIGHT + ROW_GAP) + 28
  const centerX = LABEL_W + HALF_W

  const absMax = Math.max(...pts.map((p) => Math.abs(p.value)), 0.01)
  const maxAbsPt = pts.reduce((a, b) => (Math.abs(a.value) > Math.abs(b.value) ? a : b), pts[0])

  return (
    <ChartCard
      title={title}
      eyebrow="DIVERGING · CENTERED AT 0"
      anchor={
        maxAbsPt
          ? {
              value: `${maxAbsPt.value > 0 ? '+' : ''}${maxAbsPt.value.toFixed(maxAbsPt.value < 1 ? 4 : 0)}`,
              label: maxAbsPt.label,
              color: maxAbsPt.value >= 0 ? HIGHLIGHT_COLOR : 'var(--color-sector-tecnologia)',
            }
          : undefined
      }
      annotation={data.annotation}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        <line
          x1={centerX}
          y1={0}
          x2={centerX}
          y2={H - 16}
          stroke="var(--color-text-secondary)"
          strokeWidth={1}
        />
        <text
          x={centerX}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fontFamily="var(--font-family-mono, monospace)"
          fill="var(--color-text-muted)"
        >
          0
        </text>

        {pts.map((pt, i) => {
          const y = i * (BAR_HEIGHT + ROW_GAP) + 4
          const barW = (Math.abs(pt.value) / absMax) * HALF_W
          const isPos = pt.value >= 0
          const color = isPos
            ? (pt.highlight ? HIGHLIGHT_COLOR : ANCHOR_COLOR)
            : 'var(--color-sector-tecnologia)'
          const opacity = pt.highlight ? 0.95 : 0.7

          return (
            <g key={i}>
              <text
                x={centerX - 6}
                y={y + BAR_HEIGHT / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="var(--font-family-mono, monospace)"
                fill={pt.highlight ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}
                fontWeight={pt.highlight ? 700 : 400}
              >
                {pt.label.length > 18 ? pt.label.slice(0, 17) + '…' : pt.label}
              </text>

              <rect
                x={isPos ? centerX : centerX - barW}
                y={y}
                width={barW}
                height={BAR_HEIGHT}
                fill={color}
                opacity={opacity}
                rx={1}
              />

              <text
                x={isPos ? centerX + barW + 4 : centerX - barW - 4}
                y={y + BAR_HEIGHT / 2 + 1}
                textAnchor={isPos ? 'start' : 'end'}
                dominantBaseline="middle"
                fontSize={10}
                fontFamily="var(--font-family-mono, monospace)"
                fill={pt.highlight ? color : 'var(--color-text-muted)'}
                fontWeight={pt.highlight ? 700 : 400}
              >
                {pt.value > 0 ? '+' : ''}{pt.value.toFixed ? pt.value.toFixed(4) : pt.value}
              </text>
            </g>
          )
        })}
      </svg>
    </ChartCard>
  )
}
