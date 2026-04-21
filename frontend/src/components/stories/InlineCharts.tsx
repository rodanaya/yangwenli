/**
 * InlineCharts — pure SVG React components for embedding inside chapter prose.
 *
 * All charts are responsive (viewBox + preserveAspectRatio), editorial dark
 * aesthetic, no external chart libraries. Numbers in font-mono, titles in
 * font-serif.
 */

import type { StoryInlineChartData, StoryChartPoint } from '@/lib/story-content'

// ---------------------------------------------------------------------------
// Palette & helpers
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = [
  '#d97706', // amber-600
  '#dc2626', // red-600
  '#2563eb', // blue-600
  '#7c3aed', // violet-600
  '#059669', // emerald-600
  '#0891b2', // cyan-600
  '#db2777', // pink-600
  '#65a30d', // lime-600
]

function getColor(point: StoryChartPoint, index: number): string {
  return point.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

function maxVal(points: StoryChartPoint[], provided?: number): number {
  if (provided != null && provided > 0) return provided
  return Math.max(...points.map((p) => p.value), 1)
}

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------

function ChartCard({
  title,
  annotation,
  children,
}: {
  title: string
  annotation?: string
  children: React.ReactNode
}) {
  return (
    <figure
      className="w-full bg-zinc-950/80 border border-zinc-800/60 rounded-sm overflow-hidden"
      role="img"
      aria-label={title}
    >
      <figcaption className="px-4 pt-4 pb-2">
        <span
          className="text-sm font-semibold text-zinc-200 tracking-tight"
          style={{ fontFamily: 'var(--font-family-serif, Georgia, serif)' }}
        >
          {title}
        </span>
      </figcaption>
      <div className="px-2 pb-2">{children}</div>
      {annotation && (
        <p className="px-4 pb-3 text-[11px] text-zinc-500 font-mono leading-relaxed">
          {annotation}
        </p>
      )}
    </figure>
  )
}

// ---------------------------------------------------------------------------
// 1. InlineDotGrid
// ---------------------------------------------------------------------------

const DOT_COLS = 40
const DOT_SIZE = 8
const DOT_GAP = 2
const MAX_DOTS = 1200

export function InlineDotGrid({
  data,
  title,
}: {
  data: StoryInlineChartData
  title: string
}) {
  const total = data.points.reduce((s, p) => s + p.value, 0)
  const scale = total > MAX_DOTS ? MAX_DOTS / total : 1

  // Build flat array of (color, highlight) for each displayed dot
  const dots: { color: string; highlight: boolean }[] = []
  for (let i = 0; i < data.points.length; i++) {
    const pt = data.points[i]
    const count = Math.round(pt.value * scale)
    const color = getColor(pt, i)
    const highlight = !!pt.highlight
    for (let d = 0; d < count; d++) {
      dots.push({ color, highlight })
    }
  }

  // Highlighted dots first so they render in front visually (order matters for glow)
  const sorted = [
    ...dots.filter((d) => d.highlight),
    ...dots.filter((d) => !d.highlight),
  ]

  const rows = Math.ceil(sorted.length / DOT_COLS)
  const svgW = DOT_COLS * (DOT_SIZE + DOT_GAP)
  const svgH = rows * (DOT_SIZE + DOT_GAP)

  return (
    <ChartCard title={title} annotation={data.annotation}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="dot-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {sorted.map((dot, i) => {
          const col = i % DOT_COLS
          const row = Math.floor(i / DOT_COLS)
          const cx = col * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2
          const cy = row * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={dot.highlight ? DOT_SIZE / 2 + 1 : DOT_SIZE / 2}
              fill={dot.color}
              opacity={dot.highlight ? 1 : 0.35}
              filter={dot.highlight ? 'url(#dot-glow)' : undefined}
            />
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pt-2 pb-1">
        {data.points.map((pt, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getColor(pt, i), opacity: pt.highlight ? 1 : 0.5 }}
            />
            <span>{pt.label}</span>
            <span className="text-zinc-600 tabular-nums">
              {pt.value.toLocaleString()}
            </span>
          </div>
        ))}
        {scale < 1 && (
          <span className="text-[10px] font-mono text-zinc-700 self-center">
            (displaying {MAX_DOTS} of {total.toLocaleString()} proportionally)
          </span>
        )}
      </div>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 2. InlineBarChart — horizontal bars
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

  // Reference line x positions
  const refX = (v: number) => LABEL_W + (v / mx) * BAR_AREA

  return (
    <ChartCard title={title} annotation={data.annotation}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMinYMin meet"
        className="w-full"
        aria-hidden="true"
      >
        {/* Reference lines behind bars */}
        {data.referenceLine && (
          <line
            x1={refX(data.referenceLine.value)}
            y1={0}
            x2={refX(data.referenceLine.value)}
            y2={svgH - 12}
            stroke={data.referenceLine.color ?? '#6366f1'}
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
            stroke={data.referenceLine2.color ?? '#14b8a6'}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.7}
          />
        )}

        {data.points.map((pt, i) => {
          const y = i * (BAR_HEIGHT + ROW_GAP) + 4
          const barW = Math.max(2, (pt.value / mx) * BAR_AREA)
          const color = pt.highlight
            ? (pt.value > mx * 0.8 ? '#dc2626' : '#d97706')
            : (getColor(pt, i))
          const opacity = pt.highlight ? 1 : 0.7

          return (
            <g key={i}>
              {/* Label */}
              <text
                x={LABEL_W - 6}
                y={y + BAR_HEIGHT / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={12}
                fontFamily="var(--font-family-mono, monospace)"
                fill="#a1a1aa"
              >
                {pt.label.length > 18 ? pt.label.slice(0, 17) + '\u2026' : pt.label}
              </text>

              {/* Bar */}
              <rect
                x={LABEL_W}
                y={y}
                width={barW}
                height={BAR_HEIGHT}
                fill={color}
                opacity={opacity}
                rx={1}
              />

              {/* Annotation inside bar */}
              {pt.annotation && barW > 60 && (
                <text
                  x={LABEL_W + barW - 4}
                  y={y + BAR_HEIGHT / 2 + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="rgba(255,255,255,0.7)"
                >
                  {pt.annotation}
                </text>
              )}

              {/* Value label */}
              <text
                x={LABEL_W + barW + 5}
                y={y + BAR_HEIGHT / 2 + 1}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="var(--font-family-mono, monospace)"
                fill={pt.highlight ? '#fbbf24' : '#71717a'}
                fontWeight={pt.highlight ? 700 : 400}
              >
                {pt.value.toLocaleString()}{unit}
              </text>
            </g>
          )
        })}

        {/* Reference line labels */}
        {data.referenceLine && (
          <text
            x={refX(data.referenceLine.value) + 3}
            y={svgH - 4}
            fontSize={10}
            fontFamily="var(--font-family-mono, monospace)"
            fill={data.referenceLine.color ?? '#6366f1'}
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
            fill={data.referenceLine2.color ?? '#14b8a6'}
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
  const H = 160
  const PAD = { top: 20, right: 20, bottom: 28, left: 44 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const plotX = (i: number) =>
    PAD.left + (pts.length > 1 ? (i / (pts.length - 1)) * plotW : plotW / 2)
  const plotY = (v: number) =>
    PAD.top + plotH - ((v - mn) / (mx - mn)) * plotH

  const mainColor = '#d97706'
  const linePoints = buildPolyPoints(pts, plotX, plotY)
  const showEveryOther = pts.length > 15

  return (
    <ChartCard title={title} annotation={data.annotation}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mainColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={mainColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Reference line */}
        {data.referenceLine && (
          <>
            <line
              x1={PAD.left}
              y1={plotY(data.referenceLine.value)}
              x2={W - PAD.right}
              y2={plotY(data.referenceLine.value)}
              stroke={data.referenceLine.color ?? '#6366f1'}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={W - PAD.right + 2}
              y={plotY(data.referenceLine.value) + 4}
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine.color ?? '#6366f1'}
              opacity={0.9}
            >
              {data.referenceLine.label}
            </text>
          </>
        )}

        {/* Area fill */}
        {pts.length > 1 && (
          <path
            d={buildAreaPath(pts, plotX, plotY, PAD.top + plotH)}
            fill="url(#line-grad)"
          />
        )}

        {/* Line */}
        {pts.length > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke={mainColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
        {pts.map((pt, i) => (
          <circle
            key={i}
            cx={plotX(i)}
            cy={plotY(pt.value)}
            r={pt.highlight ? 5 : 3}
            fill={pt.highlight ? '#fbbf24' : mainColor}
            stroke={pt.highlight ? '#fef3c7' : 'none'}
            strokeWidth={pt.highlight ? 1.5 : 0}
          />
        ))}

        {/* Highlight annotations */}
        {pts.map((pt, i) =>
          pt.highlight && pt.annotation ? (
            <text
              key={`ann-${i}`}
              x={plotX(i)}
              y={plotY(pt.value) - 10}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill="#fbbf24"
            >
              {pt.annotation}
            </text>
          ) : null
        )}

        {/* x-axis labels */}
        {pts.map((pt, i) =>
          showEveryOther && i % 2 !== 0 ? null : (
            <text
              key={`xl-${i}`}
              x={plotX(i)}
              y={H - 4}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill="#71717a"
            >
              {pt.label}
            </text>
          )
        )}

        {/* y-axis label */}
        {data.yLabel && (
          <text
            x={6}
            y={PAD.top + plotH / 2}
            textAnchor="middle"
            fontSize={10}
            fontFamily="var(--font-family-mono, monospace)"
            fill="#a1a1aa"
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
  const H = 160
  const PAD = { top: 20, right: 20, bottom: 28, left: 44 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const plotX = (i: number) =>
    PAD.left + (pts.length > 1 ? (i / (pts.length - 1)) * plotW : plotW / 2)
  const plotY = (v: number) =>
    PAD.top + plotH - (v / mx) * plotH

  const mainColor = '#ea580c'
  const linePoints = buildPolyPoints(pts, plotX, plotY)
  const showEveryOther = pts.length > 15

  return (
    <ChartCard title={title} annotation={data.annotation}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={mainColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={mainColor} stopOpacity={0.03} />
          </linearGradient>
        </defs>

        {/* Area fill */}
        {pts.length > 1 && (
          <path
            d={buildAreaPath(pts, plotX, plotY, PAD.top + plotH)}
            fill="url(#area-grad)"
          />
        )}

        {/* Reference line */}
        {data.referenceLine && (
          <>
            <line
              x1={PAD.left}
              y1={plotY(data.referenceLine.value)}
              x2={W - PAD.right}
              y2={plotY(data.referenceLine.value)}
              stroke={data.referenceLine.color ?? '#6366f1'}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={W - PAD.right + 2}
              y={plotY(data.referenceLine.value) + 4}
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine.color ?? '#6366f1'}
              opacity={0.9}
            >
              {data.referenceLine.label}
            </text>
          </>
        )}

        {/* Line */}
        {pts.length > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke={mainColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Dots + annotations */}
        {pts.map((pt, i) => (
          <circle
            key={i}
            cx={plotX(i)}
            cy={plotY(pt.value)}
            r={pt.highlight ? 5 : 3}
            fill={pt.highlight ? '#fbbf24' : mainColor}
            stroke={pt.highlight ? '#fef3c7' : 'none'}
            strokeWidth={pt.highlight ? 1.5 : 0}
          />
        ))}
        {pts.map((pt, i) =>
          pt.highlight && pt.annotation ? (
            <text
              key={`ann-${i}`}
              x={plotX(i)}
              y={plotY(pt.value) - 10}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill="#fbbf24"
            >
              {pt.annotation}
            </text>
          ) : null
        )}

        {/* x-axis labels */}
        {pts.map((pt, i) =>
          showEveryOther && i % 2 !== 0 ? null : (
            <text
              key={`xl-${i}`}
              x={plotX(i)}
              y={H - 4}
              textAnchor="middle"
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill="#71717a"
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
            fill="#a1a1aa"
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
  const H = 160
  const PAD = { top: 28, right: 16, bottom: pts.length > 12 ? 48 : 24, left: 16 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const barW = Math.max(6, Math.floor(plotW / pts.length) - 2)
  const barGap = pts.length > 1 ? plotW / pts.length : plotW

  return (
    <ChartCard title={title} annotation={data.annotation}>
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
          const color = pt.highlight ? '#d97706' : '#3f3f46'
          const labelRotate = pts.length > 12

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={bx}
                y={by}
                width={barW}
                height={barH}
                fill={color}
                opacity={pt.highlight ? 1 : 0.6}
                rx={1}
              />

              {/* Annotation above highlighted bar */}
              {pt.highlight && pt.annotation && (
                <text
                  x={bx + barW / 2}
                  y={by - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="#fbbf24"
                >
                  {pt.annotation}
                </text>
              )}

              {/* Value above bar for highlighted */}
              {pt.highlight && !pt.annotation && (
                <text
                  x={bx + barW / 2}
                  y={by - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="#fbbf24"
                >
                  {pt.value.toLocaleString()}
                </text>
              )}

              {/* x-axis label */}
              {labelRotate ? (
                <text
                  x={bx + barW / 2}
                  y={PAD.top + plotH + 6}
                  textAnchor="end"
                  fontSize={10}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="#a1a1aa"
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
                  fill="#a1a1aa"
                >
                  {pt.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Reference line */}
        {data.referenceLine && (
          <>
            <line
              x1={PAD.left}
              y1={PAD.top + plotH - (data.referenceLine.value / mx) * plotH}
              x2={W - PAD.right}
              y2={PAD.top + plotH - (data.referenceLine.value / mx) * plotH}
              stroke={data.referenceLine.color ?? '#6366f1'}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={PAD.left + 2}
              y={PAD.top + plotH - (data.referenceLine.value / mx) * plotH - 3}
              fontSize={10}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine.color ?? '#6366f1'}
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

  return (
    <ChartCard title={title} annotation={data.annotation}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        {/* Zero center line */}
        <line
          x1={centerX}
          y1={0}
          x2={centerX}
          y2={H - 16}
          stroke="#3f3f46"
          strokeWidth={1}
        />
        <text
          x={centerX}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fontFamily="var(--font-family-mono, monospace)"
          fill="#a1a1aa"
        >
          0
        </text>

        {pts.map((pt, i) => {
          const y = i * (BAR_HEIGHT + ROW_GAP) + 4
          const barW = (Math.abs(pt.value) / absMax) * HALF_W
          const isPos = pt.value >= 0
          const color = isPos
            ? (pt.highlight ? '#dc2626' : '#d97706')
            : '#2563eb'
          const opacity = pt.highlight ? 1 : 0.75

          return (
            <g key={i}>
              {/* Label at center */}
              <text
                x={centerX - 6}
                y={y + BAR_HEIGHT / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="var(--font-family-mono, monospace)"
                fill={pt.highlight ? '#e4e4e7' : '#a1a1aa'}
                fontWeight={pt.highlight ? 700 : 400}
              >
                {pt.label.length > 18 ? pt.label.slice(0, 17) + '\u2026' : pt.label}
              </text>

              {/* Bar */}
              <rect
                x={isPos ? centerX : centerX - barW}
                y={y}
                width={barW}
                height={BAR_HEIGHT}
                fill={color}
                opacity={opacity}
                rx={1}
              />

              {/* Value tip */}
              <text
                x={isPos ? centerX + barW + 4 : centerX - barW - 4}
                y={y + BAR_HEIGHT / 2 + 1}
                textAnchor={isPos ? 'start' : 'end'}
                dominantBaseline="middle"
                fontSize={10}
                fontFamily="var(--font-family-mono, monospace)"
                fill={pt.highlight ? '#fbbf24' : '#71717a'}
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
