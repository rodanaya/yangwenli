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

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  StoryInlineChartData,
  StoryChartPoint,
  StoryMultiSeriesData,
  StoryNetworkData,
  StoryStackedBarData,
} from '@/lib/story-content'
import { RISK_COLORS, SECTOR_COLORS, getRiskLevelFromScore } from '@/lib/constants'

// Eyebrow translation map. The structural labels at the top of each
// chart card ("HORIZONTAL · RANKED", "MULTI-SERIES · 4 VENDORS", etc.)
// are component-internal text rather than data, so they are translated
// here against an EN→ES table instead of through the chartConfig
// schema. Numeric tokens (counts, points, vendors) interpolate.
function useEyebrow(): (en: string) => string {
  const { i18n } = useTranslation('common')
  const lang: 'en' | 'es' = i18n.language?.startsWith('es') ? 'es' : 'en'
  if (lang !== 'es') return (en: string) => en
  return (en: string) => {
    return en
      .replace(/^DOT FIELD/, 'CAMPO DE PUNTOS')
      .replace(/^HORIZONTAL · RANKED/, 'HORIZONTAL · RANKING')
      .replace(/^TIME SERIES · (\d+) POINTS/, 'SERIE TEMPORAL · $1 PUNTOS')
      .replace(/^AREA · (\d+) POINTS/, 'ÁREA · $1 PUNTOS')
      .replace(/^HISTOGRAM · (\d+) BARS/, 'HISTOGRAMA · $1 BARRAS')
      .replace(/^DIVERGING · CENTERED AT 0/, 'DIVERGENTE · CENTRADO EN 0')
      .replace(/^MULTI-SERIES · (\d+) VENDORS/, 'MULTI-SERIES · $1 PROVEEDORES')
      .replace(/^NETWORK · (\d+) NODES · (\d+) TIES/, 'RED · $1 NODOS · $2 LAZOS')
      .replace(/^SHARE · (\d+) ROWS/, 'PROPORCIÓN · $1 FILAS')
      .replace(/^CLEVELAND · PAIR/, 'CLEVELAND · PARES')
      .replace(/^ROSTER · (\d+) NAMED/, 'NÓMINA · $1 NOMBRADOS')
      .replace(/^TIMELINE · (\d+) MARKERS/, 'CRONOLOGÍA · $1 MARCADORES')
      .replace(/^CHART · COMPRANET/, 'GRÁFICO · COMPRANET')
  }
}

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

// ---------------------------------------------------------------------------
// Color-safety guards (2026-06-14, Day-13). story-content.ts hand-authors
// per-chart colors; off-palette / low-contrast values (e.g. #22d3ee cyan ≈0.55
// luminance) leaked into line / series / label use where they read as nearly
// invisible on the cream (#faf9f6) page. These read a color's luminance and:
//  • remap unsafe INK colors (lines/series/markers/text) to a legible palette,
//  • pick legible ink for a label drawn ON a filled bar,
//  • reject near-white fills.
// Sanctioned, contrast-passing colors and component var() tokens pass through
// untouched — mirrors the diverging-bar CANONICAL_COLOR_ALLOWLIST below.
// ---------------------------------------------------------------------------

// Known design-token CSS var names → hex, so we can read their luminance.
const TOKEN_HEX: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(SECTOR_COLORS).map(([k, v]) => [`var(--color-sector-${k})`, v]),
  ),
  'var(--color-text-primary)': '#1a1714',
  'var(--color-text-secondary)': '#6b6560',
  'var(--color-text-muted)': '#7a716c',
  'var(--color-background)': '#faf9f6',
}

function relLuminance(hex: string): number | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return null
  const int = parseInt(m[1], 16)
  const lin = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

// Luminance of any color string (hex or a known var token); null if unknown.
function lumOf(color: string | undefined): number | null {
  if (!color) return null
  const v = color.trim()
  if (v.startsWith('var(')) {
    const hex = TOKEN_HEX[v]
    return hex ? relLuminance(hex) : null
  }
  return relLuminance(v)
}

// Contrast-safe line/series/marker palette — every entry is dark enough to read
// as a 2px line or small label on the page (luminance ≲ 0.25).
const LINE_PALETTE = [
  'var(--color-sector-salud)',           // red
  ANCHOR_COLOR,                          // amber #a06820
  'var(--color-sector-tecnologia)',      // violet
  'var(--color-sector-infraestructura)', // orange
  'var(--color-sector-defensa)',         // navy
  'var(--color-sector-gobernacion)',     // crimson
  '#3b82f6',                             // educacion blue
]

// Max luminance an INK color (line/series/text/marker) may carry before it reads
// too faint on cream (~3:1). Above this we fall back to a legible palette color.
const INK_LUM_CEILING = 0.3

// Guard a data-supplied INK color. var() tokens and contrast-passing hexes pass
// through; too-light or unparseable colors (e.g. #22d3ee cyan) → fallback.
function safeInk(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback
  if (raw.trim().startsWith('var(')) return raw
  const L = relLuminance(raw)
  if (L === null || L > INK_LUM_CEILING) return fallback
  return raw
}

// Guard a data-supplied FILL color. Fills tolerate lower contrast than ink, so
// this only rejects near-white fills (invisible on the cream page).
function safeFill(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback
  if (raw.trim().startsWith('var(')) return raw
  const L = relLuminance(raw)
  if (L === null || L > 0.8) return fallback
  return raw
}

// Legible ink for a label drawn ON TOP of a filled bar/area: white on dark
// fills, near-black on light fills (e.g. RISK_COLORS.high #f59e0b ≈0.45, energia
// yellow) where white would vanish.
function labelInkOn(fillColor: string): string {
  const L = lumOf(fillColor)
  if (L === null) return 'rgba(255,255,255,0.92)'
  return L < 0.38 ? 'rgba(255,255,255,0.92)' : 'var(--color-text-primary)'
}

function getColor(point: StoryChartPoint, index: number): string {
  return safeFill(point.color, PALETTE[index % PALETTE.length])
}

// 2026-05-21: risk-tier color binding for bar points that opt in via
// `riskScore`. Scoped: only points carrying a numeric riskScore get
// RISK_COLORS treatment (critical/high/medium/low). Bible §3.10 — `low`
// renders as muted, never green. Returns undefined for points without a
// riskScore so callers can fall through to the existing palette path.
function riskTierColor(point: StoryChartPoint): string | undefined {
  if (point.riskScore === undefined) return undefined
  const level = getRiskLevelFromScore(point.riskScore)
  return RISK_COLORS[level]
}

function maxVal(points: StoryChartPoint[], provided?: number): number {
  if (provided != null && provided > 0) return provided
  return Math.max(...points.map((p) => p.value), 1)
}

// ---------------------------------------------------------------------------
// useMeasuredWidth — ResizeObserver-backed wrapper width in CSS px. Charts
// that lock their SVG viewBox width to the actual render width (scale=1 at
// every breakpoint, instead of scaling a fixed viewBox down via
// preserveAspectRatio) use this so every SVG text glyph renders at its
// literal fontSize from a 320px phone to a wide desktop column.
// SSR / first-paint fallback: 360 (typical phone CSS width).
// ---------------------------------------------------------------------------

export function useMeasuredWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(360)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(el)
    if (el.clientWidth > 0) setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return { ref, width } as const
}

// ---------------------------------------------------------------------------
// Card chrome — eyebrow + serif title + optional anchor stat (matches
// the dashboard tile rhythm).
// ---------------------------------------------------------------------------

export function ChartCard({
  title,
  eyebrow,
  anchor,
  annotation,
  stamp,
  lang,
  children,
}: {
  title: string
  eyebrow?: string
  anchor?: { value: string; label: string; color?: string }
  annotation?: string
  /** §D — opt-in provenance watermark. When present, renders a mono tag
   *  in the eyebrow row (right of eyebrow label, left of v0.8.5).
   *  Inspired by Ordnance Survey / ProPublica document-reader provenance.
   *  0px cost when absent — 8 other call sites untouched. */
  stamp?: { en: string; es: string }
  /** Required only when stamp is present; otherwise eyebrow is EN only. */
  lang?: 'en' | 'es'
  children: React.ReactNode
}) {
  // Translate structural eyebrow text per language. Numeric tokens
  // (point/bar/vendor counts) interpolate via regex capture.
  const translateEyebrow = useEyebrow()
  const localizedEyebrow = translateEyebrow(eyebrow ?? 'CHART · COMPRANET')
  const stampText = stamp ? (lang === 'es' ? stamp.es : stamp.en) : undefined
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
          fontSize: 13,
          letterSpacing: '0.18em',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>{localizedEyebrow}</span>
        <span className="flex items-center gap-2">
          {stampText && (
            <span
              aria-label={stampText}
              style={{
                fontSize: 8.5,
                letterSpacing: '0.18em',
                color: 'var(--color-text-muted)',
                borderLeft: `1px solid ${ANCHOR_COLOR}`,
                paddingLeft: 5,
              }}
            >
              {stampText}
            </span>
          )}
          <span aria-hidden>v0.8.5</span>
        </span>
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
              fontStyle: 'normal',
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
              fontSize: 13,
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
          style={{ fontSize: 12, color: 'var(--color-text-muted)' }}
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
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  lang?: 'en' | 'es'
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
  const dotGridAnnotation = lang === 'es'
    ? (data.annotation_es ?? data.annotation)
    : data.annotation
  const pointLabelFor = (pt: { label: string; label_es?: string }) =>
    lang === 'es' ? (pt.label_es ?? pt.label) : pt.label

  return (
    <ChartCard
      title={title}
      eyebrow="DOT FIELD · 1:1"
      annotation={dotGridAnnotation}
    >
      {/* Twin Playfair callouts — leads with the ratio */}
      {highlighted.length > 0 && others.length > 0 && (
        <div className="grid grid-cols-2 gap-6 mb-5 px-2">
          {[
            { label: pointLabelFor(highlighted[0]), total: highlightedTotal, color: highlightedColor },
            { label: pointLabelFor(others[0]),      total: othersTotal,      color: othersColor },
          ].map((side, idx) => (
            <div key={idx}>
              <div
                className="tabular-nums"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'normal',
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
                  fontSize: 13,
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
            style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getColor(pt, i), opacity: pt.highlight ? 1 : 0.55 }}
            />
            <span>{pointLabelFor(pt)}</span>
            <span className="tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
              {pt.value.toLocaleString()}
            </span>
          </div>
        ))}
        {scale < 1 && (
          <span
            className="self-center font-mono"
            style={{ fontSize: 13, color: 'var(--color-text-muted)' }}
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
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  /** 2026-05-08: locale-aware bar labels. When `lang='en'` and a point
   *  has `label_en`, the English label renders; otherwise falls back
   *  to `label_es` (when es) or `label` (default). Without this prop
   *  Spanish display names like "Infraestructura" leaked into EN locale. */
  lang?: 'en' | 'es'
}) {
  const mx = maxVal(data.points, data.maxValue)
  // LABEL_W / VALUE_W are used only by the dominance band path below; the
  // standard register uses its own W=620 lane geometry (defined lower down).
  const LABEL_W = 200
  const VALUE_W = 90
  const unit = data.unit ?? ''

  // Pick lang-aware label per point.
  const labelFor = (pt: { label: string; label_en?: string; label_es?: string }) => {
    if (lang === 'en') return pt.label_en ?? pt.label
    return pt.label_es ?? pt.label
  }
  // Pick lang-aware annotation per point.
  const annoFor = (pt: { annotation?: string; annotation_es?: string }) => {
    if (lang === 'es') return pt.annotation_es ?? pt.annotation
    return pt.annotation
  }
  const refLabelFor = (ref: { label: string; label_es?: string }) => {
    if (lang === 'es') return ref.label_es ?? ref.label
    return ref.label
  }

  // Anchor stat = the highlighted row, or the largest value.
  // When the point opts into risk-tier coloring (riskScore present), the
  // anchor color follows the same tier so the headline number matches
  // the bar reader's eye lands on.
  const highlightedPt = data.points.find((p) => p.highlight) ?? data.points[0]
  const anchor = highlightedPt
    ? {
        value: `${highlightedPt.value.toLocaleString()}${unit ? ` ${unit}` : ''}`,
        label: labelFor(highlightedPt),
        color:
          riskTierColor(highlightedPt) ??
          (highlightedPt.highlight ? HIGHLIGHT_COLOR : ANCHOR_COLOR),
      }
    : undefined

  const cardAnnotation = lang === 'es'
    ? (data.annotation_es ?? data.annotation)
    : data.annotation

  // ── §A dominance band path (FT Visual Vocabulary bullet chart) ──────────
  // Opt-in via `data.mode === 'dominance'` ONLY. All other 6 bar call sites
  // keep the existing row loop verbatim. Set this on el-vacio ch3 only.
  if (data.mode === 'dominance') {
    const BAND_W = 340
    const H_TRACK = 26
    const TOP = 16                 // headroom so the OECD cap label sits above the band
    const MINOR_ROW_H = 15         // stacked mini-register row height
    const PCT_Y = TOP + H_TRACK / 2
    const domSvgW = LABEL_W + BAND_W + VALUE_W + 8

    // Total = Σ all point values (share-of-whole denominator).
    const total = data.points.reduce((s, p) => s + p.value, 0) || 1
    // Anchor = the highlighted / dominant point.
    const anchorPt = data.points.find((p) => p.highlight) ?? data.points[0]
    const anchorShare = anchorPt.value / total
    const bandW = anchorShare * BAND_W

    // Band fill: risk-tier color wins, then RISK_COLORS.critical as canonical
    // token (el-vacio dominant bar is critical-tier). Hex resolved through
    // token — never a raw literal.
    const bandFill = riskTierColor(anchorPt) ?? RISK_COLORS.critical

    // Dashed OECD rule: referenceLine.value ≤ 1 → fraction of Σ.
    // ruleX = x0 + fraction * BAND_W so denominator matches the band.
    const ruleX = data.referenceLine
      ? LABEL_W + (data.referenceLine.value <= 1
          ? data.referenceLine.value * BAND_W
          : (data.referenceLine.value / total) * BAND_W)
      : null

    // Non-anchor points → a STACKED mini-register below the band (one row each:
    // label · proportional bar · %) so the demoted labels never collide.
    const minorPts = data.points.filter((p) => !p.highlight)
    const minorStartY = TOP + H_TRACK + 10
    const DOM_SVG_H = minorStartY + minorPts.length * MINOR_ROW_H + 4

    const domAnchorStat = {
      value: `${(anchorShare * 100).toFixed(1)}%`,
      label: labelFor(anchorPt),
      color: bandFill,
    }
    const domRefLabel = data.referenceLine
      ? (lang === 'es'
          ? (data.referenceLine.label_es ?? data.referenceLine.label)
          : data.referenceLine.label)
      : undefined

    return (
      <ChartCard
        title={title}
        eyebrow="HORIZONTAL · RANKED"
        anchor={domAnchorStat}
        annotation={cardAnnotation}
        stamp={data.stamp}
        lang={lang}
      >
        <svg
          viewBox={`0 0 ${domSvgW} ${DOM_SVG_H}`}
          preserveAspectRatio="xMinYMin meet"
          className="w-full"
          aria-hidden="true"
        >
          {/* Label */}
          <text
            x={LABEL_W - 6}
            y={PCT_Y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={13}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-secondary)"
          >
            {labelFor(anchorPt)}
          </text>

          {/* Empty remainder track */}
          <rect x={LABEL_W} y={TOP} width={BAND_W} height={H_TRACK} fill="none"
            stroke="var(--color-border)" strokeWidth={1} rx={1} />

          {/* Dominant band fill */}
          <g aria-label={`${labelFor(anchorPt)}: ${anchorPt.value.toLocaleString()}${unit ? ` ${unit}` : ''}, ${(anchorShare * 100).toFixed(1)}%${ruleX !== null && data.referenceLine ? `, vs OECD benchmark ${(data.referenceLine.value * 100).toFixed(0)}%` : ''}`}>
            <rect x={LABEL_W} y={TOP} width={bandW} height={H_TRACK} fill={bandFill} opacity={0.92} rx={1} />
          </g>

          {/* OECD dashed rule — band visibly overshoots this */}
          {ruleX !== null && (
            <line x1={ruleX} y1={TOP - 4} x2={ruleX} y2={TOP + H_TRACK + 3}
              stroke={ANCHOR_COLOR} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.9} />
          )}

          {/* OECD cap label — ABOVE the rule, clear of the stacked rows below */}
          {ruleX !== null && domRefLabel && (
            <text x={ruleX + 3} y={TOP - 6} fontSize={8.5}
              fontFamily="var(--font-family-mono, monospace)" fill={ANCHOR_COLOR} opacity={0.9}>
              {domRefLabel}
            </text>
          )}

          {/* Per-point percent right of band — Playfair Italic 800 */}
          <text x={LABEL_W + bandW + 6} y={PCT_Y} textAnchor="start" dominantBaseline="middle"
            fontSize={13} fontFamily="'Playfair Display', Georgia, serif" fontStyle="normal"
            fontWeight={800} style={{ color: bandFill }} fill={bandFill}>
            {(anchorShare * 100).toFixed(1)}%
          </text>

          {/* Stacked minor register — one row each (label · proportional bar · %), never overlapping */}
          {minorPts.map((pt, i) => {
            const rowY = minorStartY + i * MINOR_ROW_H
            const cy = rowY + MINOR_ROW_H / 2
            const ptShare = pt.value / total
            const barW = Math.max(2, ptShare * BAND_W)
            const tierC = riskTierColor(pt) ?? getColor(pt, data.points.indexOf(pt))
            return (
              <g key={i} aria-label={`${labelFor(pt)}: ${(ptShare * 100).toFixed(1)}%`}>
                <text x={LABEL_W - 8} y={cy} textAnchor="end" dominantBaseline="middle"
                  fontSize={13} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)">
                  {labelFor(pt)}
                </text>
                <rect x={LABEL_W} y={rowY + 2} width={barW} height={MINOR_ROW_H - 6}
                  fill={tierC} opacity={0.5} rx={1} />
                <text x={LABEL_W + barW + 5} y={cy} dominantBaseline="middle"
                  fontSize={13} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)">
                  {(ptShare * 100).toFixed(1)}%
                </text>
              </g>
            )
          })}
        </svg>
      </ChartCard>
    )
  }
  // ── end dominance band path ──────────────────────────────────────────────

  // Standard 3-deck register: label+value / bar / annotation — three lanes that
  // never share a horizontal band, so text can't collide at any bar length.
  const W = 620
  const hasAnno = data.points.some((p) => p.annotation)
  const rowH = hasAnno ? 54 : 36
  const refs = [data.referenceLine, data.referenceLine2].filter(
    (r): r is NonNullable<typeof r> => !!r,
  )
  const HDR = refs.length === 0 ? 4 : refs.length === 1 ? 22 : 30
  const regSvgH = HDR + data.points.length * rowH + 4
  const regRefX = (v: number) => (v / mx) * W
  // ES unit micro-map for the deck-1 readout (kills the worst "B MXN" leak).
  const unitLoc = lang === 'es'
    ? (unit === 'B MXN' ? 'mil M MXN' : unit === 'contracts' ? 'contratos' : unit === 'wins' ? 'victorias' : unit)
    : unit

  return (
    <ChartCard
      title={title}
      eyebrow="HORIZONTAL · RANKED"
      anchor={anchor}
      annotation={cardAnnotation}
      stamp={data.stamp}
      lang={lang}
    >
      <svg
        viewBox={`0 0 ${W} ${regSvgH}`}
        preserveAspectRatio="xMinYMin meet"
        className="w-full"
        aria-hidden="true"
      >
        {/* Reference lines drawn first (row text sits on top); labels in the header strip */}
        {refs.map((ref, ri) => {
          const rx = regRefX(ref.value)
          const anchorEnd = rx > 0.7 * W
          const labelY = refs.length > 1 ? (ri === 0 ? 10 : 22) : 13
          const strokeC = safeInk(ref.color, 'var(--color-text-muted)')
          return (
            <g key={`ref-${ri}`}>
              <line
                x1={rx}
                y1={HDR}
                x2={rx}
                y2={regSvgH - 4}
                stroke={strokeC}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.7}
              />
              <text
                x={anchorEnd ? rx - 5 : rx + 5}
                y={labelY}
                textAnchor={anchorEnd ? 'end' : 'start'}
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="var(--font-family-mono, monospace)"
                fill={strokeC}
                opacity={0.9}
              >
                {refLabelFor(ref)}
              </text>
            </g>
          )
        })}

        {data.points.map((pt, i) => {
          const rowY = HDR + i * rowH
          const barW = Math.max(2, (pt.value / mx) * W)
          const tierColor = riskTierColor(pt)
          const barColor = tierColor ?? (pt.highlight ? HIGHLIGHT_COLOR : getColor(pt, i))
          const barOpacity = tierColor || pt.highlight ? 0.92 : 0.55
          const valueColor = tierColor ?? (pt.highlight ? HIGHLIGHT_COLOR : 'var(--color-text-primary)')
          const rawLbl = labelFor(pt)
          const lbl = rawLbl.length > 40 ? rawLbl.slice(0, 39) + '…' : rawLbl
          const anno = annoFor(pt)
          return (
            <g key={i}>
              {/* Deck 1 — label (left) · value (right ledger column). Text-only. */}
              <text
                x={0}
                y={rowY + 12}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={13}
                fontFamily="var(--font-family-mono, monospace)"
                fill={pt.highlight ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'}
                fontWeight={pt.highlight ? 700 : 400}
              >
                {lbl}
              </text>
              <text
                x={W}
                y={rowY + 12}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={13}
                fontFamily="var(--font-family-mono, monospace)"
                className="tabular-nums"
              >
                <tspan fill={valueColor} fontWeight={700}>{pt.value.toLocaleString()}</tspan>
                {unitLoc && <tspan fill="var(--color-text-muted)" fontWeight={400}> {unitLoc}</tspan>}
              </text>

              {/* Deck 2 — the ink bar. No text ever renders on it. */}
              <rect x={0} y={rowY + 20} width={barW} height={10} fill={barColor} opacity={barOpacity} rx={1} />

              {/* Deck 3 — annotation, always full-width at x=0, never on the bar. */}
              {anno && (
                <text
                  x={0}
                  y={rowY + 43}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-muted)"
                >
                  {anno}
                </text>
              )}
            </g>
          )
        })}
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
  lang: 'en' | 'es' = 'en',
): { value: string; label: string; color?: string } | undefined {
  const target = pts.find((p) => p.highlight) ?? pts[pts.length - 1]
  if (!target) return undefined
  const label = lang === 'es' ? (target.label_es ?? target.label) : target.label
  return {
    value: `${target.value.toLocaleString()}${unit ? ` ${unit}` : ''}`,
    label,
    color,
  }
}

// ---------------------------------------------------------------------------
// 3. InlineLineChart
// ---------------------------------------------------------------------------

export function InlineLineChart({
  data,
  title,
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  lang?: 'en' | 'es'
}) {
  const pts = data.points
  const mx = maxVal(pts, data.maxValue)
  // Optional zoomed axis floor: a series in a narrow band (e.g. 71–87% on a
  // 0–90 scale) reads flat without this. When set, drop the area fill (a
  // filled area off a non-zero baseline would overstate the magnitude).
  const mn = data.yMin ?? 0
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
  const lineAnnotation = lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation
  const lineYLabel = lang === 'es' ? (data.yLabel_es ?? data.yLabel) : data.yLabel
  const lineRefLabel = (ref: { label: string; label_es?: string }) =>
    lang === 'es' ? (ref.label_es ?? ref.label) : ref.label
  const ptAnnoFor = (pt: { annotation?: string; annotation_es?: string }) =>
    lang === 'es' ? (pt.annotation_es ?? pt.annotation) : pt.annotation

  return (
    <ChartCard
      title={title}
      eyebrow={`TIME SERIES · ${pts.length} POINTS`}
      anchor={pickAnchor(pts, data.unit, mainColor, lang)}
      annotation={lineAnnotation}
    >
      {lineYLabel && (
        <div className="text-[13px] font-mono uppercase tracking-[0.06em] text-text-muted mb-1">
          {lineYLabel}
        </div>
      )}
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
              x={PAD.left - 3}
              y={plotY(data.referenceLine.value) + 3}
              textAnchor="end"
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine.color ?? REFERENCE_COLOR}
              opacity={0.9}
            >
              {lineRefLabel(data.referenceLine)}
            </text>
          </>
        )}
        {data.referenceLine2 && (
          <>
            <line
              x1={PAD.left}
              y1={plotY(data.referenceLine2.value)}
              x2={W - PAD.right}
              y2={plotY(data.referenceLine2.value)}
              stroke={data.referenceLine2.color ?? 'var(--color-text-muted)'}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.6}
            />
            <text
              x={PAD.left - 3}
              y={plotY(data.referenceLine2.value) + 3}
              textAnchor="end"
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine2.color ?? 'var(--color-text-muted)'}
              opacity={0.9}
            >
              {lineRefLabel(data.referenceLine2)}
            </text>
          </>
        )}

        {pts.length > 1 && !data.yMin && (
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
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill={HIGHLIGHT_COLOR}
              fontWeight={700}
            >
              {ptAnnoFor(pt)}
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
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill="var(--color-text-muted)"
            >
              {pt.label}
            </text>
          )
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
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  lang?: 'en' | 'es'
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
  const areaAnnotation = lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation
  const areaYLabel = lang === 'es' ? (data.yLabel_es ?? data.yLabel) : data.yLabel
  const areaRefLabel = (ref: { label: string; label_es?: string }) =>
    lang === 'es' ? (ref.label_es ?? ref.label) : ref.label
  const areaPtAnno = (pt: { annotation?: string; annotation_es?: string }) =>
    lang === 'es' ? (pt.annotation_es ?? pt.annotation) : pt.annotation

  return (
    <ChartCard
      title={title}
      eyebrow={`AREA · ${pts.length} POINTS`}
      anchor={pickAnchor(pts, data.unit, mainColor, lang)}
      annotation={areaAnnotation}
    >
      {areaYLabel && (
        <div className="text-[13px] font-mono uppercase tracking-[0.06em] text-text-muted mb-1">
          {areaYLabel}
        </div>
      )}
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
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine.color ?? REFERENCE_COLOR}
              opacity={0.9}
            >
              {areaRefLabel(data.referenceLine)}
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
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill={HIGHLIGHT_COLOR}
              fontWeight={700}
            >
              {areaPtAnno(pt)}
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
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill="var(--color-text-muted)"
            >
              {pt.label}
            </text>
          )
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
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  lang?: 'en' | 'es'
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
  const annoFor = (pt: { annotation?: string; annotation_es?: string }) =>
    lang === 'es' ? (pt.annotation_es ?? pt.annotation) : pt.annotation
  const cardAnnotation = lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation

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
      annotation={cardAnnotation}
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

              {pt.highlight && pt.annotation && (() => {
                const txt = annoFor(pt) ?? ''
                return (
                  <text
                    x={bx + barW / 2}
                    y={Math.max(12, by - 4)}
                    textAnchor="middle"
                    fontSize={13}
                    fontFamily="var(--font-family-mono, monospace)"
                    fill={HIGHLIGHT_COLOR}
                    fontWeight={700}
                  >
                    {txt}
                  </text>
                )
              })()}

              {pt.highlight && !pt.annotation && (
                <text
                  x={bx + barW / 2}
                  y={Math.max(12, by - 4)}
                  textAnchor="middle"
                  fontSize={13}
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
                  fontSize={12}
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
                  fontSize={12}
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
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine.color ?? REFERENCE_COLOR}
              opacity={0.9}
            >
              {lang === 'es'
                ? (data.referenceLine.label_es ?? data.referenceLine.label)
                : data.referenceLine.label}
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

// Canonical hex allowlist for per-row `color` overrides. Story-content.ts
// passes raw hexes from SECTOR_COLORS / RISK_COLORS; we accept those values
// (case-insensitive) and silently drop anything else so a stray ad-hoc hex
// can't slip into the renderer.
const CANONICAL_COLOR_ALLOWLIST: ReadonlySet<string> = new Set([
  ...Object.values(SECTOR_COLORS),
  ...Object.values(RISK_COLORS),
].map((c) => c.toLowerCase()))

function resolveRowColor(raw: string | undefined): string | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (CANONICAL_COLOR_ALLOWLIST.has(v)) return raw
  return null
}

export function InlineDivergingBar({
  data,
  title,
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  lang?: 'en' | 'es'
}) {
  const pts = data.points
  const labelFor = (p: StoryChartPoint) =>
    lang === 'es' ? (p.label_es ?? p.label) : p.label
  const annoFor = (p: StoryChartPoint) =>
    lang === 'es' ? (p.annotation_es ?? p.annotation) : p.annotation

  const absMax = Math.max(...pts.map((p) => Math.abs(p.value)), 0.01)
  const maxAbsPt = pts.reduce((a, b) => (Math.abs(a.value) > Math.abs(b.value) ? a : b), pts[0])

  // Pure-HTML "Ledger of Signals" (2026-07-03 mobile remake). No SVG, no
  // viewBox — every glyph is flow HTML so nothing scale-collapses on a
  // narrow phone. Consecutive rows that share an identical label prefix
  // before ' — ' (ch5's P2 Ghost / P6 Capture / Legit SHAP triplets) fold
  // under one group kicker; any run <2 members or any label missing the
  // separator falls back to the flat list untouched (ch2/ch3's path).
  type Row = { pt: StoryChartPoint; displayLabel: string; groupKicker?: string }
  const rows: Row[] = (() => {
    const withPrefix = pts.map((p) => {
      const full = labelFor(p)
      const sepIdx = full.indexOf(' — ')
      return sepIdx === -1
        ? { p, prefix: null as string | null, rest: full }
        : { p, prefix: full.slice(0, sepIdx), rest: full.slice(sepIdx + 3) }
    })
    if (withPrefix.some((w) => w.prefix === null)) {
      return pts.map((p) => ({ pt: p, displayLabel: labelFor(p) }))
    }
    const runs: { prefix: string; start: number; end: number }[] = []
    let i = 0
    while (i < withPrefix.length) {
      let j = i
      while (j + 1 < withPrefix.length && withPrefix[j + 1].prefix === withPrefix[i].prefix) j++
      runs.push({ prefix: withPrefix[i].prefix as string, start: i, end: j })
      i = j + 1
    }
    if (runs.some((r) => r.end - r.start + 1 < 2)) {
      return pts.map((p) => ({ pt: p, displayLabel: labelFor(p) }))
    }
    const out: Row[] = []
    for (const r of runs) {
      for (let k = r.start; k <= r.end; k++) {
        out.push({
          pt: withPrefix[k].p,
          displayLabel: withPrefix[k].rest,
          groupKicker: k === r.start ? r.prefix : undefined,
        })
      }
    }
    return out
  })()

  return (
    <ChartCard
      title={title}
      eyebrow="DIVERGING · CENTERED AT 0"
      anchor={
        maxAbsPt
          ? {
              value: `${maxAbsPt.value > 0 ? '+' : ''}${maxAbsPt.value.toFixed(maxAbsPt.value < 1 ? 4 : 0)}`,
              label: labelFor(maxAbsPt),
              color: maxAbsPt.value >= 0 ? HIGHLIGHT_COLOR : 'var(--color-sector-tecnologia)',
            }
          : undefined
      }
      annotation={lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation}
    >
      <div className="px-2 pb-2">
        {/* Axis header rail — states the diverging semantics once instead of
            an in-SVG center tick, which scale-collapsed below 11px on phone. */}
        <div
          className="flex justify-between font-mono uppercase text-text-muted border-b border-border pb-1 mb-2"
          style={{ fontSize: 11, letterSpacing: '0.08em' }}
        >
          <span>{lang === 'es' ? '− PROTEGE' : '− PROTECTS'}</span>
          <span>0</span>
          <span>{lang === 'es' ? 'RIESGO +' : 'RISK +'}</span>
        </div>

        <ol className="space-y-3">
          {rows.map((row, i) => {
            const p = row.pt
            const v = p.value
            const isPos = v >= 0
            // Per-row color override honored only when it resolves against
            // the canonical SECTOR_COLORS / RISK_COLORS allowlist; otherwise
            // fall back to the default risk/protective palette.
            const overrideColor = resolveRowColor(p.color)
            const color = overrideColor
              ?? (isPos
                ? (p.highlight ? HIGHLIGHT_COLOR : ANCHOR_COLOR)
                : 'var(--color-sector-tecnologia)')
            const anno = annoFor(p)

            return (
              <li key={i}>
                {row.groupKicker && (
                  <div
                    className="font-mono uppercase text-text-muted border-t border-border/60 pt-2 mt-3"
                    style={{ fontSize: 11, letterSpacing: '0.14em' }}
                  >
                    {row.groupKicker}
                  </div>
                )}

                <div className="flex justify-between items-baseline gap-3">
                  <span
                    className={`font-mono min-w-0 ${p.highlight ? 'text-text-primary font-bold' : 'text-text-secondary'}`}
                    style={{ fontSize: 12, letterSpacing: '0.02em' }}
                  >
                    {row.displayLabel}
                  </span>
                  <span
                    className="font-mono tabular-nums whitespace-nowrap shrink-0"
                    style={{ fontSize: 12, color }}
                  >
                    {v > 0 ? '+' : ''}{v}
                  </span>
                </div>

                <div className="relative h-[14px] mt-1">
                  <div
                    className="absolute inset-y-0 left-1/2 w-px"
                    style={{ background: 'var(--color-text-secondary)', opacity: 0.4 }}
                  />
                  <div
                    className="absolute h-full"
                    style={
                      isPos
                        ? {
                            left: '50%',
                            width: `${(Math.abs(v) / absMax) * 50}%`,
                            background: color,
                            opacity: p.highlight ? 0.95 : 0.7,
                            borderRadius: 1,
                          }
                        : {
                            right: '50%',
                            width: `${(Math.abs(v) / absMax) * 50}%`,
                            background: color,
                            opacity: p.highlight ? 0.95 : 0.7,
                            borderRadius: 1,
                          }
                    }
                  />
                </div>

                {anno && (
                  <div
                    className="font-mono normal-case mt-1"
                    style={{ fontSize: 11, color, opacity: 0.92 }}
                  >
                    ▸ {anno}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 7. InlineMultiLine — multiple time series on one axis. The "relay race"
// chart for the Invisible Monopoly (Apr 2026): four pharma vendors each
// peak at a different moment, hand off the spend over 23 years.
// ---------------------------------------------------------------------------

export function InlineMultiLine({
  data,
  title,
  lang = 'en',
}: {
  data: StoryMultiSeriesData
  title: string
  lang?: 'en' | 'es'
}) {
  const { xLabels, series, unit } = data
  const annotation = lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation
  const yLabel = lang === 'es' ? (data.yLabel_es ?? data.yLabel) : data.yLabel
  // Compute global y-max
  const allValues = series.flatMap((s) => s.values)
  const yMax = Math.max(...allValues, 1)
  // Guard each series color: off-palette / low-contrast (e.g. #22d3ee cyan) →
  // a legible LINE_PALETTE slot so no series reads as invisible on the page.
  const seriesColors = series.map((s, i) => safeInk(s.color, LINE_PALETTE[i % LINE_PALETTE.length]))

  const W = 720
  const H = 280
  // Right padding leaves room for end-of-line vendor labels (rendered at
  // plotX(lastIdx)+4) — without this they get truncated at the SVG edge.
  const PAD = { top: 24, right: 88, bottom: 60, left: 50 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const plotX = (i: number) =>
    PAD.left + (xLabels.length > 1 ? (i / (xLabels.length - 1)) * plotW : plotW / 2)
  const plotY = (v: number) =>
    PAD.top + plotH - (v / yMax) * plotH

  const showLabels = xLabels.length > 12 ? 3 : 1 // skip-every for tick labels

  return (
    <ChartCard
      title={title}
      eyebrow={`MULTI-SERIES · ${series.length} VENDORS`}
      annotation={annotation}
    >
      {yLabel && (
        <div className="text-[13px] font-mono uppercase tracking-[0.06em] text-text-muted mb-1">
          {yLabel}{unit ? ` (${unit})` : ''}
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        {/* Y-axis ticks (3 lines) */}
        {[0, 0.5, 1].map((t, i) => {
          const v = yMax * t
          const y = plotY(v)
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={0.5}
                strokeDasharray={t === 0 ? 'none' : '2 4'}
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                fontSize={12}
                fontFamily="var(--font-family-mono, monospace)"
                fill="var(--color-text-muted)"
              >
                {v.toFixed(v >= 10 ? 0 : 1)}
              </text>
            </g>
          )
        })}

        {/* Event markers — vertical rules for structural breaks (e.g. the
            2020 INSABI/BIRMEX consolidation that cut Grupo Fármacos to zero).
            Drawn before the series so the data lines read on top. */}
        {data.eventLines?.map((ev, i) => {
          const ex = plotX(ev.xIndex)
          const evLabel = lang === 'es' ? (ev.label_es ?? ev.label) : ev.label
          const evColor = ev.color ?? 'var(--color-text-muted)'
          return (
            <g key={`ev-${i}`}>
              <line
                x1={ex}
                y1={PAD.top}
                x2={ex}
                y2={PAD.top + plotH}
                stroke={evColor}
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.75}
              />
              <text
                x={ex}
                y={PAD.top + 2}
                textAnchor="middle"
                fontSize={13}
                fontFamily="var(--font-family-mono, monospace)"
                fill={evColor}
                fontWeight={700}
              >
                {evLabel}
              </text>
            </g>
          )
        })}

        {/* Each series — line + dots */}
        {series.map((s, sIdx) => {
          const linePts = s.values
            .map((v, i) => `${plotX(i)},${plotY(v)}`)
            .join(' ')
          return (
            <g key={sIdx}>
              <polyline
                points={linePts}
                fill="none"
                stroke={seriesColors[sIdx]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.92}
              />
              {/* End-of-line label so the eye can attach color → name without
                  scanning the legend */}
              {(() => {
                const lastIdx = s.values.length - 1
                const lastV = s.values[lastIdx]
                if (lastV <= 0) return null
                const seriesName = lang === 'es' ? (s.name_es ?? s.name) : s.name
                return (
                  <text
                    x={plotX(lastIdx) + 4}
                    y={plotY(lastV) + 3}
                    fontSize={12}
                    fontFamily="var(--font-family-mono, monospace)"
                    fill={seriesColors[sIdx]}
                    fontWeight={700}
                  >
                    {seriesName}
                  </text>
                )
              })()}
              {/* Dots — small for context, larger at annotation point */}
              {s.values.map((v, i) => {
                const isAnno = s.annotation?.xIndex === i
                return (
                  <circle
                    key={i}
                    cx={plotX(i)}
                    cy={plotY(v)}
                    r={isAnno ? 4.5 : 2}
                    fill={seriesColors[sIdx]}
                    stroke={isAnno ? 'var(--color-background)' : 'none'}
                    strokeWidth={isAnno ? 2 : 0}
                  />
                )
              })}
              {/* Per-series annotation callout */}
              {s.annotation && (
                <text
                  x={plotX(s.annotation.xIndex)}
                  y={plotY(s.values[s.annotation.xIndex]) - 10}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill={seriesColors[sIdx]}
                  fontWeight={700}
                >
                  {lang === 'es' ? (s.annotation.text_es ?? s.annotation.text) : s.annotation.text}
                </text>
              )}
            </g>
          )
        })}

        {/* X-axis labels (rotated when crowded) */}
        {xLabels.map((lbl, i) => {
          if (i % showLabels !== 0 && i !== xLabels.length - 1) return null
          return (
            <text
              key={i}
              x={plotX(i)}
              y={H - 28}
              textAnchor="middle"
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill="var(--color-text-muted)"
            >
              {lbl}
            </text>
          )
        })}

      </svg>

      {/* Legend with totals — color swatch + name + total caption */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-2 pt-2 pb-1">
        {series.map((s, i) => {
          const legendName = lang === 'es' ? (s.name_es ?? s.name) : s.name
          const legendCaption = lang === 'es'
            ? (s.totalCaption_es ?? s.totalCaption)
            : s.totalCaption
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block rounded-sm"
                style={{ width: 14, height: 3, backgroundColor: seriesColors[i] }}
              />
              <span
                className="font-mono"
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  fontWeight: 600,
                }}
              >
                {legendName}
              </span>
              {legendCaption && (
                <span
                  className="font-mono tabular-nums"
                  style={{ fontSize: 12, color: 'var(--color-text-muted)' }}
                >
                  {legendCaption}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 8. InlineNetwork — node-link diagram with edge thickness scaled by weight.
// Built for the cobidding-cartel lattice in Invisible Monopoly: 4 vendors
// arranged on a diamond, edges sized by shared-procedure count.
// ---------------------------------------------------------------------------

export function InlineNetwork({
  data,
  title,
  lang = 'en',
}: {
  data: StoryNetworkData
  title: string
  lang?: 'en' | 'es'
}) {
  const { nodes, edges } = data
  const annotation = lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation
  const anchor = data.anchor
    ? {
        ...data.anchor,
        label: lang === 'es' ? (data.anchor.label_es ?? data.anchor.label) : data.anchor.label,
      }
    : undefined
  const W = 560
  const H = 340
  const cx = W / 2
  const cy = H / 2

  // Position nodes around a circle. With 4 nodes you get a diamond,
  // with 6 a hexagon — a clean default that works without force layout.
  const radius = Math.min(W, H) * 0.34
  const positions = nodes.map((n, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2
    return {
      id: n.id,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      node: n,
    }
  })
  const posById = new Map(positions.map((p) => [p.id, p]))

  // Edge weight scaling
  const maxW = Math.max(...edges.map((e) => e.weight), 1)
  const edgeStroke = (w: number) => 1 + (w / maxW) * 7 // 1px..8px

  return (
    <ChartCard
      title={title}
      eyebrow={`NETWORK · ${nodes.length} NODES · ${edges.length} TIES`}
      anchor={anchor}
      annotation={annotation}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        {/* Edges first so nodes stack on top.
            Place each label at 35% of the way from one endpoint to the
            other (alternating per edge index) instead of the dead center.
            This prevents label collision on diametrically-opposite edges
            (e.g. on a 4-node diamond, Grupo F.↔PISA and Maypo↔DIMM both
            cross at the center; if we used midpoints the second label
            would render under the first). */}
        {edges.map((e, i) => {
          const a = posById.get(e.from)
          const b = posById.get(e.to)
          if (!a || !b) return null
          const t = i % 2 === 0 ? 0.35 : 0.62
          const mx = a.x + (b.x - a.x) * t
          const my = a.y + (b.y - a.y) * t
          return (
            <g key={i}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={ANCHOR_COLOR}
                strokeWidth={edgeStroke(e.weight)}
                strokeLinecap="round"
                opacity={0.45}
              />
              {e.label && (
                <g>
                  <rect
                    x={mx - 24}
                    y={my - 9}
                    width={48}
                    height={16}
                    rx={2}
                    fill="var(--color-background-card)"
                    stroke="var(--color-border)"
                    strokeWidth={0.5}
                  />
                  <text
                    x={mx}
                    y={my + 3}
                    textAnchor="middle"
                    fontSize={12}
                    fontFamily="var(--font-family-mono, monospace)"
                    fill="var(--color-text-secondary)"
                    fontWeight={700}
                  >
                    {e.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {positions.map((p, i) => {
          const r = p.node.highlight ? 36 : 30
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={r + 3}
                fill="var(--color-background)"
                stroke="none"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={p.node.color}
                opacity={0.92}
              />
              {/* Node label — outside the circle to fit long vendor names
                  (was inside, clipped at ~72px diameter for 136px labels) */}
              <text
                x={p.x}
                y={p.y + r + 14}
                textAnchor="middle"
                fontSize={13}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight={700}
                fill="var(--color-text-primary)"
              >
                {p.node.label}
              </text>
              {p.node.sublabel && (
                <text
                  x={p.x}
                  y={p.y + r + 27}
                  textAnchor="middle"
                  fontSize={13}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontWeight={400}
                  fill="var(--color-text-muted)"
                >
                  {p.node.sublabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 9. ThresholdDistribution — dot scatter with horizontal threshold rules.
// Dots above top threshold are highlighted; between thresholds use ANCHOR_COLOR;
// below are muted. Editorial point: the threshold line IS the finding.
// ---------------------------------------------------------------------------

export function ThresholdDistribution({
  data,
  title,
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  lang?: 'en' | 'es'
}) {
  const pts = data.points
  const n = pts.length
  const mx = maxVal(pts, data.maxValue)
  const unit = data.unit ?? ''

  // 2026-05-25: bumped bottom 56 → 96 so rotated x-axis labels like
  // "2019 pre-COVID" (134px content, rotated -40° ≈ 102px horizontal +
  // 86px vertical) don't get clipped by the SVG bottom edge.
  const margin = { top: 48, right: 40, bottom: 96, left: 20 }
  const plotW = 450
  const plotH = 156
  const totalH = margin.top + plotH + margin.bottom
  const totalW = margin.left + plotW + margin.right

  const cardAnnotation = lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation

  const labelFor = (pt: StoryChartPoint) => {
    if (lang === 'en') return pt.label_en ?? pt.label
    return pt.label_es ?? pt.label
  }
  const refLabelFor = (ref: { label: string; label_es?: string }) =>
    lang === 'es' ? (ref.label_es ?? ref.label) : ref.label

  const dotX = (i: number) => margin.left + (i + 0.5) * (plotW / n)
  const dotY = (v: number) => margin.top + (1 - v / mx) * plotH

  const topThreshold = data.referenceLine?.value
  const midThreshold = data.referenceLine2?.value

  // Anchor stat: highest value point
  const topPt = pts.reduce((a, b) => (a.value > b.value ? a : b), pts[0])
  const anchor = topPt
    ? {
        value: `${topPt.value.toFixed(1)}${unit ? ` ${unit}` : ''}`,
        label: labelFor(topPt),
        color: topPt.color ?? HIGHLIGHT_COLOR,
      }
    : undefined

  return (
    <ChartCard
      title={title}
      eyebrow="THRESHOLD · DISTRIBUTION"
      anchor={anchor}
      annotation={cardAnnotation}
    >
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        {/* Threshold lines */}
        {topThreshold != null && (
          <>
            <line
              x1={margin.left}
              y1={dotY(topThreshold)}
              x2={margin.left + plotW}
              y2={dotY(topThreshold)}
              stroke={data.referenceLine!.color ?? HIGHLIGHT_COLOR}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={margin.left + 3}
              y={dotY(topThreshold) - 5}
              textAnchor="start"
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine!.color ?? HIGHLIGHT_COLOR}
              opacity={0.9}
            >
              {refLabelFor(data.referenceLine!)}
            </text>
          </>
        )}
        {midThreshold != null && (
          <>
            <line
              x1={margin.left}
              y1={dotY(midThreshold)}
              x2={margin.left + plotW}
              y2={dotY(midThreshold)}
              stroke={data.referenceLine2!.color ?? ANCHOR_COLOR}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={margin.left + 3}
              y={dotY(midThreshold) - 5}
              textAnchor="start"
              fontSize={12}
              fontFamily="var(--font-family-mono, monospace)"
              fill={data.referenceLine2!.color ?? ANCHOR_COLOR}
              opacity={0.9}
            >
              {refLabelFor(data.referenceLine2!)}
            </text>
          </>
        )}

        {/* Optional ordered connector — the rising "water line" across
            administrations. Drawn behind the dots; opt-in via data.connectDots
            (a ranked distribution must NOT set it). */}
        {data.connectDots && pts.length > 1 && (
          <polyline
            points={pts.map((p, i) => `${dotX(i)},${dotY(p.value)}`).join(' ')}
            fill="none"
            stroke="var(--color-text-muted)"
            strokeWidth={1.25}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.4}
          />
        )}

        {/* Optional riser — a vertical measure from the threshold up to one dot,
            captioned with the multiple ("≈6×"), so "N times the red flag" is a
            visible bracket rather than a footer sentence. */}
        {data.riser && data.referenceLine && (() => {
          const rp = pts[data.riser.index]
          if (!rp) return null
          const rx = dotX(data.riser.index)
          const yTop = dotY(rp.value)
          const yBot = dotY(data.referenceLine.value)
          const rColor = data.riser.color ?? HIGHLIGHT_COLOR
          const midY = (yTop + yBot) / 2
          const mLabel = lang === 'es'
            ? (data.riser.multipleLabel_es ?? data.riser.multipleLabel)
            : data.riser.multipleLabel
          return (
            <g>
              <line x1={rx} y1={yTop} x2={rx} y2={yBot} stroke={rColor} strokeWidth={1} strokeDasharray="2 2" opacity={0.75} />
              <line x1={rx - 3} y1={yBot} x2={rx + 3} y2={yBot} stroke={rColor} strokeWidth={1} opacity={0.75} />
              <text
                x={rx + 7}
                y={midY + 3}
                textAnchor="start"
                fontSize={13}
                fontFamily="'Playfair Display', Georgia, serif"
                fontStyle="normal"
                fontWeight={800}
                fill={rColor}
              >
                {mLabel}
              </text>
            </g>
          )
        })()}

        {/* Dots and labels */}
        {pts.map((pt, i) => {
          const cx = dotX(i)
          const cy = dotY(pt.value)
          const aboveTop = topThreshold != null && pt.value >= topThreshold
          const aboveMid = midThreshold != null && pt.value >= midThreshold

          let r: number
          let fill: string
          let opacity: number

          if (aboveTop) {
            r = 6
            fill = pt.color ?? HIGHLIGHT_COLOR
            opacity = 0.95
          } else if (aboveMid) {
            r = 5
            fill = ANCHOR_COLOR
            opacity = 0.85
          } else {
            r = 4
            fill = 'var(--color-text-muted)'
            opacity = 0.45
          }

          // Per-dot labels carry only the number (+ a SHORT unit like "%").
          // A long unit ("risk score") makes adjacent labels ~95px wide and
          // they overprint at ~56px dot spacing — the unit lives in the axis /
          // ChartCard anchor instead.
          const valueLabel = `${pt.value.toFixed(unit === '%' ? 1 : 2)}${unit && unit.length <= 2 ? ` ${unit}` : ''}`

          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill={fill} opacity={opacity} />
              {/* Value label above dot — only for above-top and above-mid tiers */}
              {(aboveTop || aboveMid) && (
                <text
                  x={cx}
                  y={cy - r - 3}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fontSize={aboveTop ? 11.5 : 10}
                  fontFamily={aboveTop ? "'Playfair Display', Georgia, serif" : 'var(--font-family-mono, monospace)'}
                  fontStyle="normal"
                  fill={aboveTop ? (pt.color ?? HIGHLIGHT_COLOR) : ANCHOR_COLOR}
                >
                  {valueLabel}
                </text>
              )}
              {/* Optional delta callout below the dot — bakes the climb/gap
                  into the chart (e.g. "+37.1pp vs Calderón" on the peak admin). */}
              {pt.delta && (
                <text
                  x={cx}
                  y={cy + r + 13}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontWeight={700}
                  fill={pt.color ?? HIGHLIGHT_COLOR}
                >
                  {lang === 'es' ? (pt.delta_es ?? pt.delta) : pt.delta}
                </text>
              )}
              {/* X-axis label — rotated -40° */}
              <text
                x={cx}
                y={margin.top + plotH + 8}
                textAnchor="end"
                dominantBaseline="hanging"
                fontSize={12}
                fontFamily="var(--font-family-mono, monospace)"
                fill={aboveTop ? (pt.color ?? HIGHLIGHT_COLOR) : 'var(--color-text-muted)'}
                transform={`rotate(-40, ${cx}, ${margin.top + plotH + 8})`}
              >
                {labelFor(pt)}
              </text>
            </g>
          )
        })}
      </svg>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 10. AnnotatedThermometer — ranked horizontal bars with a reference tick.
// Bars above the reference are highlighted; below are muted. The reference
// tick is the editorial chrome showing "expected" level.
// ---------------------------------------------------------------------------

export function AnnotatedThermometer({
  data,
  title,
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  lang?: 'en' | 'es'
}) {
  // 2026-05-25: bumped LABEL_W 138 → 200 to match the InlineBarChart fix.
  // Thermometer is used on captura ch3 and similar — sector/institution
  // names like "Infraestructura" / "Pharmaceuticals" need ~165px.
  // 2026-07-04: BAR_W 288→250 + VALUE_W 94→150 so a full-width bar's in-bar
  // peso readout never lands in the far-right annotation column — the
  // "917.3 B MXN50 contracts" collision. The annotation column now fits
  // "34.5% · 250 contracts" without overflowing left into the bar.
  const LABEL_W = 200
  const BAR_W = 230
  const VALUE_W = 170
  const TOTAL_W = LABEL_W + BAR_W + VALUE_W
  const ROW_H = 22
  const ROW_GAP = 10

  const cardAnnotation = lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation

  const labelFor = (pt: StoryChartPoint) => {
    if (lang === 'en') return pt.label_en ?? pt.label
    return pt.label_es ?? pt.label
  }
  const annoFor = (pt: StoryChartPoint) =>
    lang === 'es' ? (pt.annotation_es ?? pt.annotation) : pt.annotation

  // Sort descending by value
  const sorted = [...data.points].sort((a, b) => b.value - a.value)

  const total = sorted.reduce((s, p) => s + p.value, 0)
  const mx = maxVal(data.points, data.maxValue)
  const refVal = data.referenceLine?.value ?? 0
  const refPx = (refVal / mx) * BAR_W

  const refLabelFor = (ref: { label: string; label_es?: string }) =>
    lang === 'es' ? (ref.label_es ?? ref.label) : ref.label

  const totalSvgH = sorted.length * (ROW_H + ROW_GAP) + 34

  // Anchor stat: highest value point's share pct
  const topPt = sorted[0]
  const topShare = total > 0 ? (topPt.value / total * 100) : 0
  const anchor = topPt
    ? {
        value: `${topShare.toFixed(1)}%`,
        label: labelFor(topPt),
        color: topPt.color ?? HIGHLIGHT_COLOR,
      }
    : undefined

  return (
    <ChartCard
      title={title}
      eyebrow="THERMOMETER · SECTOR SHARE"
      anchor={anchor}
      annotation={cardAnnotation}
    >
      <svg
        viewBox={`0 0 ${TOTAL_W} ${totalSvgH}`}
        preserveAspectRatio="xMinYMin meet"
        className="w-full"
        aria-hidden="true"
      >
        {/* Header: reference label */}
        {data.referenceLine && (
          <text
            x={LABEL_W + refPx}
            y={12}
            textAnchor={refPx > BAR_W * 0.5 ? 'end' : 'start'}
            fontSize={13}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-muted)"
          >
            {refLabelFor(data.referenceLine)}
          </text>
        )}

        {sorted.map((pt, i) => {
          const rowY = i * (ROW_H + ROW_GAP) + 26
          const sharePct = total > 0 ? (pt.value / total * 100) : 0
          const barPx = (pt.value / mx) * BAR_W
          const aboveRef = pt.value > refVal
          const barFill = aboveRef ? (pt.color ?? HIGHLIGHT_COLOR) : 'var(--color-text-muted)'
          const barOpacity = aboveRef ? 0.85 : 0.35
          const valueColor = aboveRef ? (pt.color ?? HIGHLIGHT_COLOR) : 'var(--color-text-muted)'
          const anno = annoFor(pt)

          return (
            <g key={i}>
              {/* Background track */}
              <rect
                x={LABEL_W}
                y={rowY}
                width={BAR_W}
                height={ROW_H}
                fill="var(--color-background-elevated)"
                opacity={0.08}
                rx={1}
              />
              {/* Fill bar */}
              <rect
                x={LABEL_W}
                y={rowY}
                width={Math.max(2, barPx)}
                height={ROW_H}
                fill={barFill}
                opacity={barOpacity}
                rx={1}
              />
              {/* Reference tick */}
              {data.referenceLine && (
                <line
                  x1={LABEL_W + refPx}
                  y1={rowY - 2}
                  x2={LABEL_W + refPx}
                  y2={rowY + ROW_H + 2}
                  stroke={data.referenceLine.color ?? REFERENCE_COLOR}
                  strokeWidth={1.5}
                />
              )}
              {/* Label */}
              <text
                x={LABEL_W - 6}
                y={rowY + ROW_H / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={13}
                fontFamily="var(--font-family-mono, monospace)"
                fill="var(--color-text-secondary)"
              >
                {labelFor(pt)}
              </text>
              {/* Value: share% · absolute. On a long bar, render the readout
                  INSIDE the bar (right-aligned, contrast-safe ink) so it does
                  not collide with the contracts annotation at the far right —
                  the collision that made the top sectors unreadable. */}
              {(() => {
                const inBar = barPx > 150
                const peso = `${pt.value.toLocaleString()}${data.unit ? ` ${data.unit}` : ''}`
                // Above-ref rows get a far-right annotation ("share% · N contracts"),
                // so their bar readout is the peso value ALONE — no repeated share%.
                // Below-ref rows have no annotation, so they carry share% inline.
                const valTxt = aboveRef ? peso : `${sharePct.toFixed(1)}% · ${peso}`
                return (
                  <text
                    x={inBar ? LABEL_W + barPx - 6 : LABEL_W + Math.max(2, barPx) + 6}
                    y={rowY + ROW_H / 2 + 1}
                    textAnchor={inBar ? 'end' : 'start'}
                    dominantBaseline="middle"
                    fontSize={13}
                    fontFamily="var(--font-family-mono, monospace)"
                    fontWeight={700}
                    fill={inBar ? labelInkOn(barFill) : valueColor}
                  >
                    {valTxt}
                  </text>
                )
              })()}
              {/* Annotation for highlighted rows */}
              {aboveRef && anno && (
                <text
                  x={LABEL_W + BAR_W + VALUE_W - 4}
                  y={rowY + ROW_H / 2 + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-muted)"
                >
                  {anno}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 11. ClevelandPairChart — ranked dot pairs. Filled dot = primary metric.
// Open dot = comparator (value2). Gap between them = editorial finding.
// ---------------------------------------------------------------------------

export function ClevelandPairChart({
  data,
  title,
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  lang?: 'en' | 'es'
}) {
  // 2026-05-25: bumped LABEL_W 148 → 260 so 24-char vendor names like
  // "Seg. Alim. Mex (Segalmex)" (248px) / "Productos Hospitalarios" /
  // "Efectivale (S.A.)" render fully without right-edge clipping.
  // Affects ilusion-competitiva ch3, captura-institucional ch2.
  const LABEL_W = 260
  const DOT_AREA = 268
  const GAP_W = 84
  const TOTAL_W = LABEL_W + DOT_AREA + GAP_W
  const ROW_H = 24
  const ROW_GAP = 12

  const cardAnnotation = lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation

  const labelFor = (pt: StoryChartPoint) => {
    if (lang === 'en') return pt.label_en ?? pt.label
    return pt.label_es ?? pt.label
  }

  // ── EXCESS mode: single bar per row, anchored at value2 baseline ────────
  // Length = (value − value2). Positive = right of axis (breach); negative
  // = left of axis (below baseline). Risk-tier color from RISK_COLORS,
  // derived by normalizing the excess against the OECD 25% ceiling.
  if (data.mode === 'excess') {
    const E_LABEL_W = 210   // accommodates "Building Construction" (197px) / "Construcción de Edificios"
    const E_LEFT_W = 56     // narrow left-of-axis pane for deficits
    const E_RIGHT_W = 280   // wide right-of-axis pane for breaches
    const E_VALUE_W = 112   // fits "+21.4 · 32.4%" at 11px mono without clipping the trailing %
    const E_TOTAL_W = E_LABEL_W + E_LEFT_W + E_RIGHT_W + E_VALUE_W
    const E_ROW_H = 22
    const E_ROW_GAP = 11

    // Sort by gap descending so largest breach reads at top
    const eSorted = [...data.points].sort((a, b) => {
      const gA = a.value - (a.value2 ?? 0)
      const gB = b.value - (b.value2 ?? 0)
      return gB - gA
    })

    // Scale: largest absolute gap defines E_RIGHT_W; deficits scale against E_LEFT_W
    const gaps = eSorted.map((p) => p.value - (p.value2 ?? 0))
    const maxBreach = Math.max(...gaps, 0.001)
    const maxDeficit = Math.max(-Math.min(...gaps, 0), 0.001)
    const axisX = E_LABEL_W + E_LEFT_W

    // Convert excess (in pp) to a 0-1 score against the OECD 25-pp ceiling,
    // then route through getRiskLevelFromScore. > 15pp = critical (red),
    // > 10pp = high (amber), > 6pp = medium (dark amber), else muted.
    const colorForGap = (gap: number): string => {
      if (gap <= 0) return RISK_COLORS.low
      const normalized = Math.min(1, gap / 25)
      const level = getRiskLevelFromScore(normalized)
      return RISK_COLORS[level]
    }

    const eTotalH = eSorted.length * (E_ROW_H + E_ROW_GAP) + 32

    // Anchor stat: largest breach value, colored by its tier
    const ePt = eSorted[0]
    const eGap = ePt ? ePt.value - (ePt.value2 ?? 0) : 0
    const eAnchorColor = colorForGap(eGap)
    const eAnchor = ePt
      ? {
          value: `+${eGap.toFixed(1)}`,
          label: labelFor(ePt),
          color: eAnchorColor,
        }
      : undefined

    return (
      <ChartCard
        title={title}
        eyebrow={`EXCESS · ${eSorted.length} ROWS · BASELINE ${ePt?.value2 ?? 11}%`}
        anchor={eAnchor}
        annotation={cardAnnotation}
      >
        <svg
          viewBox={`0 0 ${E_TOTAL_W} ${eTotalH}`}
          preserveAspectRatio="xMinYMin meet"
          className="w-full"
          aria-hidden="true"
        >
          {/* Axis header */}
          <text
            x={axisX}
            y={12}
            textAnchor="middle"
            fontSize={13}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-muted)"
            letterSpacing="0.14em"
          >
            {(ePt?.value2 ?? 11).toFixed(0)}% {lang === 'es' ? 'LÍNEA BASE' : 'BASELINE'}
          </text>

          {/* Vertical baseline axis */}
          <line
            x1={axisX}
            y1={18}
            x2={axisX}
            y2={eTotalH - 6}
            stroke="var(--color-text-muted)"
            strokeWidth={1}
            strokeDasharray="2 3"
            opacity={0.7}
          />

          {eSorted.map((pt, i) => {
            const yC = i * (E_ROW_H + E_ROW_GAP) + E_ROW_H / 2 + 22
            const y = yC - E_ROW_H / 2
            const gap = pt.value - (pt.value2 ?? 0)
            const isPos = gap >= 0
            const barC = colorForGap(gap)
            const barW = isPos
              ? (gap / maxBreach) * E_RIGHT_W
              : (-gap / maxDeficit) * E_LEFT_W
            const barX = isPos ? axisX : axisX - barW

            return (
              <g key={i}>
                {/* Row label */}
                <text
                  x={E_LABEL_W - 8}
                  y={yC + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-secondary)"
                >
                  {labelFor(pt)}
                </text>

                {/* Excess bar */}
                <rect
                  x={barX}
                  y={y}
                  width={barW}
                  height={E_ROW_H}
                  fill={barC}
                  opacity={isPos ? 0.9 : 0.45}
                  rx={1}
                />

                {/* Numeric readout right of the right-pane */}
                <text
                  x={E_LABEL_W + E_LEFT_W + E_RIGHT_W + 8}
                  y={yC + 1}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill={barC}
                  fontWeight={700}
                >
                  {isPos ? '+' : ''}{gap.toFixed(1)}
                  <tspan
                    fill="var(--color-text-muted)"
                    fontWeight={400}
                  >
                    {` · ${pt.value.toFixed(1)}%`}
                  </tspan>
                </text>
              </g>
            )
          })}
        </svg>

        {/* Risk-tier legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-2 pt-3 pb-1 font-mono"
          style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: RISK_COLORS.critical, opacity: 0.9 }} />
            <span>{lang === 'es' ? 'brecha crítica' : 'critical breach'} (≥15 pp)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: RISK_COLORS.high, opacity: 0.9 }} />
            <span>{lang === 'es' ? 'brecha alta' : 'high breach'} (≥10 pp)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: RISK_COLORS.medium, opacity: 0.9 }} />
            <span>{lang === 'es' ? 'brecha media' : 'medium breach'} (≥6 pp)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: RISK_COLORS.low, opacity: 0.45 }} />
            <span>{lang === 'es' ? 'bajo línea base' : 'below baseline'}</span>
          </div>
        </div>
      </ChartCard>
    )
  }

  // Sort rows. Default: by absolute gap (value − value2) descending. When
  // sortBy='ratio' (editorial metric is the share, e.g. gapFormat 'ratio'),
  // rank by value/value2 descending so the most-distorted row reads at the top
  // and the anchor stat names it — otherwise a ratio story gets sorted by
  // sector size and buries its own lede.
  const ratioOf = (p: StoryChartPoint) => {
    const denom = p.value2 ?? 0
    return denom > 0 ? p.value / denom : 0
  }
  const sorted = [...data.points].sort((a, b) =>
    data.sortBy === 'ratio' || data.gapFormat === 'ratio'
      ? ratioOf(b) - ratioOf(a)
      : (b.value - (b.value2 ?? 0)) - (a.value - (a.value2 ?? 0))
  )

  // Scale: max of all values and value2
  const allVals = data.points.flatMap((p) => [p.value, p.value2 ?? 0])
  const mx = Math.max(...allVals, 1)
  const xPos = (v: number) => LABEL_W + (v / mx) * DOT_AREA

  const totalSvgH = sorted.length * (ROW_H + ROW_GAP) + 36

  // Anchor stat: the top row. In ratio-sort mode the headline is the share
  // itself (e.g. "19.6%"); otherwise the absolute gap of the largest-gap row.
  const firstPt = sorted[0]
  const firstGap = firstPt ? firstPt.value - (firstPt.value2 ?? 0) : 0
  const anchorValue =
    (data.sortBy === 'ratio' || data.gapFormat === 'ratio') && firstPt?.value2
      ? `${((firstPt.value / firstPt.value2) * 100).toFixed(1)}%`
      : firstGap.toLocaleString()
  const anchor = firstPt
    ? {
        value: anchorValue,
        label: labelFor(firstPt),
        color: firstPt.color ?? HIGHLIGHT_COLOR,
      }
    : undefined

  // Column header labels (bilingual) — fixed short strings; yLabel belongs in annotation
  const actualLabel = lang === 'es' ? 'REAL' : 'ACTUAL'
  const referenceLabel = lang === 'es' ? 'REFERENCIA' : 'REFERENCE'

  // ── RATIO mode: FT-bullet share register. Each row gets its OWN 100% track
  //    (its total) with the intermediated share filled in — the fill FRACTION
  //    is the finding, no filled/open-dot decoder caption needed. (2026-07-03)
  if (data.gapFormat === 'ratio') {
    const RW = 620
    const R_HDR = 28
    const R_ROWH = 54
    const rSvgH = R_HDR + sorted.length * R_ROWH + 4
    const rUnit = data.unit ?? ''
    const rUnitLoc = lang === 'es' && rUnit === 'B MXN' ? 'mil M MXN' : rUnit
    const sumV = sorted.reduce((s, p) => s + p.value, 0)
    const sumV2 = sorted.reduce((s, p) => s + (p.value2 ?? 0), 0) || 1
    const aggRatio = sumV / sumV2
    const aggX = Math.max(0, Math.min(1, aggRatio)) * RW
    const aggAnchorEnd = aggX > 0.7 * RW
    const withR = sorted.map((p) => ({ p, r: ratioOf(p) }))
    const minRow = withR.reduce((m, x) => (x.r < m.r ? x : m), withR[0])
    const trackLabel = lang === 'es'
      ? (data.trackLabel_es ?? data.trackLabel ?? 'del total de la fila')
      : (data.trackLabel ?? 'of the row total')

    return (
      <ChartCard
        title={title}
        eyebrow={lang === 'es' ? `PORCIÓN DEL TOTAL · ${sorted.length} FILAS` : `SHARE OF TOTAL · ${sorted.length} ROWS`}
        anchor={anchor}
        annotation={cardAnnotation}
      >
        <svg viewBox={`0 0 ${RW} ${rSvgH}`} preserveAspectRatio="xMinYMin meet" className="w-full" aria-hidden="true">
          {/* Header strip: 0 · aggregate tick · 100% = track denominator */}
          <text x={0} y={15} fontSize={11} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)" textAnchor="start">0</text>
          <text x={RW} y={15} fontSize={11} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)" textAnchor="end">100% = {trackLabel.toUpperCase()}</text>
          <line x1={aggX} y1={R_HDR} x2={aggX} y2={rSvgH - 4} stroke="var(--color-text-primary)" strokeWidth={1} strokeDasharray="3 3" opacity={0.45} />
          <text x={aggAnchorEnd ? aggX - 5 : aggX + 5} y={15} textAnchor={aggAnchorEnd ? 'end' : 'start'} fontSize={11} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-secondary)">
            {lang === 'es' ? 'PROM.' : 'AVG'} · {(aggRatio * 100).toFixed(1)}%
          </text>

          {sorted.map((pt, i) => {
            const rowY = R_HDR + i * R_ROWH
            const ratio = ratioOf(pt)
            const fillW = Math.max(2, Math.min(1, ratio) * RW)
            const fillColor = safeFill(pt.color, HIGHLIGHT_COLOR)
            const isHi = !!pt.highlight
            const absA = lang === 'es'
              ? `${pt.value.toLocaleString()} de ${(pt.value2 ?? 0).toLocaleString()} ${rUnitLoc} en riesgo`
              : `${pt.value.toLocaleString()} of ${(pt.value2 ?? 0).toLocaleString()} ${rUnit} at risk`
            const annoTxt = (lang === 'es' ? (pt.annotation_es ?? pt.annotation) : pt.annotation) ?? absA
            const mult = minRow.r > 0 ? ratio / minRow.r : 0
            const deck3 = i === 0 && mult >= 1.5
              ? `${annoTxt} · ≈${mult.toFixed(1)}× ${labelFor(minRow.p)} (${(minRow.r * 100).toFixed(0)}%)`
              : annoTxt
            return (
              <g key={i}>
                {/* Deck 1 — label · share% */}
                <text x={0} y={rowY + 12} textAnchor="start" dominantBaseline="middle" fontSize={13} fontFamily="var(--font-family-mono, monospace)" fill={isHi ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'} fontWeight={isHi ? 700 : 400}>{labelFor(pt)}</text>
                <text x={RW} y={rowY + 12} textAnchor="end" dominantBaseline="middle" fontSize={15} fontWeight={700} fontFamily="var(--font-family-mono, monospace)" fill={isHi ? fillColor : 'var(--color-text-primary)'} className="tabular-nums">{(ratio * 100).toFixed(1)}%</text>
                {/* Deck 2 — the row's own 100% track with the share filled */}
                <rect x={0} y={rowY + 20} width={RW} height={10} fill="none" stroke="var(--color-border)" strokeWidth={1} rx={1} />
                <rect x={0} y={rowY + 20} width={fillW} height={10} fill={fillColor} opacity={0.9} rx={1} />
                {/* Deck 3 — the absolutes (+ a computed ×-multiple on the top row) */}
                <text x={0} y={rowY + 44} textAnchor="start" dominantBaseline="middle" fontSize={13} fontFamily="var(--font-family-mono, monospace)" fill="var(--color-text-muted)">{deck3}</text>
              </g>
            )
          })}
        </svg>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title={title}
      eyebrow="CLEVELAND · PAIR"
      anchor={anchor}
      annotation={cardAnnotation}
    >
      <svg
        viewBox={`0 0 ${TOTAL_W} ${totalSvgH}`}
        preserveAspectRatio="xMinYMin meet"
        className="w-full"
        aria-hidden="true"
      >
        {/* Column headers */}
        <text
          x={LABEL_W + 8}
          y={14}
          fontSize={13}
          fontFamily="var(--font-family-mono, monospace)"
          fill="var(--color-text-muted)"
          textAnchor="start"
        >
          {actualLabel.toUpperCase()}
        </text>
        <text
          x={LABEL_W + DOT_AREA - 8}
          y={14}
          fontSize={13}
          fontFamily="var(--font-family-mono, monospace)"
          fill="var(--color-text-muted)"
          textAnchor="end"
        >
          {referenceLabel}
        </text>

        {sorted.map((pt, i) => {
          const yCenter = i * (ROW_H + ROW_GAP) + ROW_H / 2 + 18
          const x1 = xPos(pt.value)
          const x2 = pt.value2 != null ? xPos(pt.value2) : x1
          const gap = pt.value - (pt.value2 ?? 0)
          const dotColor = pt.color ?? HIGHLIGHT_COLOR

          return (
            <g key={i}>
              {/* Connector line */}
              {pt.value2 != null && (
                <line
                  x1={Math.min(x1, x2)}
                  y1={yCenter}
                  x2={Math.max(x1, x2)}
                  y2={yCenter}
                  stroke={dotColor}
                  strokeWidth={1}
                  opacity={0.4}
                />
              )}
              {/* Filled dot (primary value) */}
              <circle cx={x1} cy={yCenter} r={5.5} fill={dotColor} opacity={0.9} />
              {/* Open dot (value2 comparator) */}
              {pt.value2 != null && (
                <circle
                  cx={x2}
                  cy={yCenter}
                  r={5}
                  fill="none"
                  stroke={pt.color ?? 'var(--color-text-muted)'}
                  strokeWidth={1.5}
                  opacity={0.7}
                />
              )}
              {/* Row label */}
              <text
                x={LABEL_W - 8}
                y={yCenter + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={13}
                fontFamily="var(--font-family-mono, monospace)"
                fill="var(--color-text-secondary)"
              >
                {labelFor(pt)}
              </text>
              {/* Gap annotation — 'signed' (default) shows +gap; 'ratio' shows
                  value as % of value2, used when value is a subset of value2 */}
              <text
                x={LABEL_W + DOT_AREA + 8}
                y={yCenter + 1}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={12}
                fontFamily="var(--font-family-mono, monospace)"
                fill="var(--color-text-muted)"
              >
                {data.gapFormat === 'ratio' && pt.value2
                  ? `${Math.round((pt.value / pt.value2) * 100)}%`
                  : `${gap >= 0 ? '+' : ''}${gap.toLocaleString()}`}
              </text>
            </g>
          )
        })}
      </svg>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// 12. InlineStackedBar — horizontal rows split into "highlight" + remainder.
// Built for the IMSS-dependency chapter: each vendor's bar is dominated
// by its IMSS portion in a single accent color, the rest muted.
// ---------------------------------------------------------------------------

export function InlineStackedBar({
  data,
  title,
  lang = 'en',
}: {
  data: StoryStackedBarData
  title: string
  lang?: 'en' | 'es'
}) {
  const {
    rows, unit, anchor, annotation, annotation_es,
    highlightColor, baseColor, comparison,
    highlightLabel, highlightLabel_es,
    baseLabel, baseLabel_es,
  } = data
  const hi = highlightColor ?? HIGHLIGHT_COLOR
  const base = baseColor ?? 'var(--color-text-muted)'

  // Lang-aware row label
  const rowLabel = (r: { label: string; label_en?: string; label_es?: string }) => {
    if (lang === 'en') return r.label_en ?? r.label
    return r.label_es ?? r.label
  }

  // Lang-aware row annotation
  const rowAnnotation = (r: { annotation?: string; annotation_es?: string }) =>
    lang === 'es' ? (r.annotation_es ?? r.annotation) : r.annotation

  // Lang-aware card-level annotation
  const cardAnnotation = lang === 'es' ? (annotation_es ?? annotation) : annotation

  // Lang-aware anchor label
  const cardAnchor = anchor
    ? {
        ...anchor,
        label: lang === 'es' ? (anchor.label_es ?? anchor.label) : anchor.label,
      }
    : undefined

  // Legend strings with bilingual fallbacks
  const legendHi = lang === 'es'
    ? (highlightLabel_es ?? highlightLabel ?? 'porción concentrada')
    : (highlightLabel ?? 'concentrated portion')
  const legendBase = lang === 'es'
    ? (baseLabel_es ?? baseLabel ?? 'resto')
    : (baseLabel ?? 'remainder')

  // ── Mirror / back-to-back comparison layout ────────────────────────────
  if (comparison) {
    const ROW_H_M = 22
    const ROW_GAP_M = 14
    // 2026-05-25: bumped 130 → 170 to fit "Infraestructura" (143px) and
    // "Medio Ambiente" (134px) — sexenio mirror chart sector center column.
    const LABEL_W_M = 170
    const HALF_W_M = 200
    const VALUE_W_M = 84
    const W_M = VALUE_W_M + HALF_W_M + LABEL_W_M + HALF_W_M + VALUE_W_M
    const H_M = rows.length * (ROW_H_M + ROW_GAP_M) + 28

    const maxBoth = Math.max(
      ...rows.map((r) => Math.max(r.total, r.compareTotal ?? 0)),
      1,
    )
    const centerX = VALUE_W_M + HALF_W_M + LABEL_W_M / 2
    const leftBarRight = VALUE_W_M + HALF_W_M
    const rightBarLeft = leftBarRight + LABEL_W_M
    const leftHdr = lang === 'es' ? (comparison.leftLabel_es ?? comparison.leftLabel) : comparison.leftLabel
    const rightHdr = lang === 'es' ? (comparison.rightLabel_es ?? comparison.rightLabel) : comparison.rightLabel

    return (
      <ChartCard
        title={title}
        eyebrow={`MIRROR · ${rows.length} ROWS`}
        anchor={cardAnchor}
        annotation={cardAnnotation}
      >
        <svg
          viewBox={`0 0 ${W_M} ${H_M}`}
          preserveAspectRatio="xMinYMin meet"
          className="w-full"
          aria-hidden="true"
        >
          {/* Column headers */}
          <text
            x={leftBarRight - 4}
            y={14}
            textAnchor="end"
            fontSize={13}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-muted)"
            letterSpacing="0.16em"
          >
            {leftHdr.toUpperCase()}
          </text>
          <text
            x={rightBarLeft + 4}
            y={14}
            textAnchor="start"
            fontSize={13}
            fontFamily="var(--font-family-mono, monospace)"
            fill="var(--color-text-muted)"
            letterSpacing="0.16em"
          >
            {rightHdr.toUpperCase()}
          </text>

          {rows.map((r, i) => {
            const y = i * (ROW_H_M + ROW_GAP_M) + 26
            const leftVal = r.compareTotal ?? 0
            const rightVal = r.total
            const leftW = (leftVal / maxBoth) * HALF_W_M
            const rightW = (rightVal / maxBoth) * HALF_W_M
            // Sector palette on the right (AMLO) bar; muted base on the left (Peña)
            const rightFill = r.sectorCode
              ? `var(--color-sector-${r.sectorCode}, ${r.color ?? hi})`
              : (r.color ?? hi)
            return (
              <g key={i}>
                {/* Center axis hairline */}
                <line
                  x1={centerX}
                  y1={y - 2}
                  x2={centerX}
                  y2={y + ROW_H_M + 2}
                  stroke="var(--color-border)"
                  strokeWidth={0.5}
                />

                {/* Row label centered between bars */}
                <text
                  x={centerX}
                  y={y + ROW_H_M / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11.5}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-secondary)"
                  fontWeight={700}
                >
                  {rowLabel(r)}
                </text>

                {/* Left (Peña) bar — grows leftward from leftBarRight */}
                <rect
                  x={leftBarRight - leftW}
                  y={y}
                  width={leftW}
                  height={ROW_H_M}
                  fill={base}
                  opacity={0.28}
                  rx={1}
                />
                {/* Left value readout */}
                <text
                  x={leftBarRight - leftW - 6}
                  y={y + ROW_H_M / 2 + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-muted)"
                  fontWeight={700}
                >
                  {leftVal.toLocaleString(undefined, {
                    minimumFractionDigits: leftVal < 10 ? 1 : 0,
                    maximumFractionDigits: leftVal < 10 ? 1 : 0,
                  })}
                </text>

                {/* Right (AMLO) bar — grows rightward from rightBarLeft */}
                <rect
                  x={rightBarLeft}
                  y={y}
                  width={rightW}
                  height={ROW_H_M}
                  fill={rightFill}
                  opacity={0.92}
                  rx={1}
                />
                {/* Right value readout */}
                <text
                  x={rightBarLeft + rightW + 6}
                  y={y + ROW_H_M / 2 + 1}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-primary)"
                  fontWeight={700}
                >
                  {rightVal.toLocaleString(undefined, {
                    minimumFractionDigits: rightVal < 10 ? 1 : 0,
                    maximumFractionDigits: rightVal < 10 ? 1 : 0,
                  })}
                </text>
                {/* Delta annotation below the right value */}
                {rowAnnotation(r) && (
                  <text
                    x={rightBarLeft + rightW + 6}
                    y={y + ROW_H_M / 2 + 14}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fontSize={13}
                    fontFamily="var(--font-family-mono, monospace)"
                    fill={rightFill}
                  >
                    {rowAnnotation(r)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-5 px-2 pt-3 pb-1 font-mono"
          style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: base, opacity: 0.28 }} />
            <span>{legendBase}{unit ? ` · ${unit}` : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm" style={{ background: hi, opacity: 0.92 }} />
            <span>{legendHi}{unit ? ` · ${unit}` : ''}</span>
          </div>
        </div>
      </ChartCard>
    )
  }

  const ROW_H = 26
  const ROW_GAP = 14
  // 2026-05-25: bumped 132 → 170 to fit sector labels like
  // "Infraestructura" (143px) / "Medio Ambiente" (134px) without
  // overflowing into the bar area.
  const LABEL_W = 170
  const VALUE_W = 110
  const BAR_AREA = 380
  const W = LABEL_W + BAR_AREA + VALUE_W + 12
  const H = rows.length * (ROW_H + ROW_GAP) + 4

  const maxTotal = Math.max(...rows.map((r) => r.total), 1)

  return (
    <ChartCard
      title={title}
      eyebrow={`SHARE · ${rows.length} ROWS`}
      anchor={cardAnchor}
      annotation={cardAnnotation}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMinYMin meet"
        className="w-full"
        aria-hidden="true"
      >
        {rows.map((r, i) => {
          const y = i * (ROW_H + ROW_GAP) + 2
          const totalW = (r.total / maxTotal) * BAR_AREA
          const hiW = (r.highlight / Math.max(r.total, 0.001)) * totalW

          return (
            <g key={i}>
              {/* Row label */}
              <text
                x={LABEL_W - 8}
                y={y + ROW_H / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11.5}
                fontFamily="var(--font-family-mono, monospace)"
                fill="var(--color-text-secondary)"
                fontWeight={700}
              >
                {rowLabel(r)}
              </text>

              {/* Base bar (full total) */}
              <rect
                x={LABEL_W}
                y={y}
                width={totalW}
                height={ROW_H}
                fill={base}
                opacity={0.22}
                rx={1}
              />
              {/* Highlight portion */}
              <rect
                x={LABEL_W}
                y={y}
                width={hiW}
                height={ROW_H}
                fill={r.color ?? hi}
                opacity={0.92}
                rx={1}
              />
              {/* Bar-end value (always shown, after the bar) */}
              <text
                x={LABEL_W + totalW + 8}
                y={y + ROW_H / 2 + 1}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={13}
                fontFamily="var(--font-family-mono, monospace)"
                fill="var(--color-text-primary)"
                fontWeight={700}
              >
                {r.total.toLocaleString(undefined, {
                  minimumFractionDigits: r.total < 10 ? 1 : 0,
                  maximumFractionDigits: r.total < 10 ? 1 : 0,
                })}
                {unit ? ` ${unit}` : ''}
              </text>
              {/* Annotation (e.g. "60.1% IMSS") below the value */}
              {rowAnnotation(r) && (
                <text
                  x={LABEL_W + totalW + 8}
                  y={y + ROW_H / 2 + 14}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill={r.color ?? hi}
                >
                  {rowAnnotation(r)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Compact legend explaining the two segments */}
      <div className="flex items-center gap-5 px-2 pt-3 pb-1 font-mono"
        style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: hi, opacity: 0.92 }} />
          <span>{legendHi}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: base, opacity: 0.22 }} />
          <span>{legendBase}</span>
        </div>
      </div>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// InlineRoster — numbered editorial roster for a small named cast.
// Each row spans the full width: rank · name (Playfair) · type badge ·
// value (Playfair Italic 800, right-aligned, tabular-nums). Replaces
// horizontal bar charts when the editorial point IS the names and labels
// would truncate in a bar layout. Mirrors the sexenio roster in
// StoryNarrative.tsx (~line 1700). Highlighted rows get a 2px left rail
// in ANCHOR_COLOR.
//
// Glyph convention: highlighted rows render a filled dot (persona física
// / individual contractor); non-highlight rows render an open diamond
// (foreign-INC / shell entity). Single characters keep the markup simple.
// ---------------------------------------------------------------------------

export function InlineRoster({
  data,
  title,
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  lang?: 'en' | 'es'
}) {
  const pts = data.points
  const unit = data.unit ?? ''
  const annotation = lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation
  const labelFor = (p: StoryChartPoint) => (lang === 'es' ? (p.label_es ?? p.label) : p.label)
  const annotationFor = (p: StoryChartPoint) =>
    lang === 'es' ? (p.annotation_es ?? p.annotation ?? '') : (p.annotation ?? '')
  // Optional benchmark: when a referenceLine is supplied, each value gets a
  // "N× {label}" caption (e.g. "3.2× OECD ceiling") — bakes the comparison
  // into the roster instead of leaving the ceiling only in the footer.
  const ref = data.referenceLine
  const refLabel = ref ? (lang === 'es' ? (ref.label_es ?? ref.label) : ref.label) : ''

  // §B — abs-normalization (NYT Upshot annotated dot strip).
  // Math.max(|value|) handles negatives (volatilidad model-coefficient roster
  // ~L5050 carries 0.558, −0.388, −0.247). Never assume positives/integers.
  const maxAbs = Math.max(...pts.map((p) => Math.abs(p.value)), 1e-9)

  // Dot-strip geometry (inline, pure SVG — no shared DotStrip import needed).
  // N=28, R=2.5, GAP=6 → viewBox width 168px. Mobile: viewBox scales via
  // preserveAspectRatio; no JS breakpoint hook (the hook does not exist as a
  // shared module — pure-SVG responsiveness per spec §B fix 5).
  const DOT_N = 28
  const DOT_R = 2.5
  const DOT_GAP = 6
  const STRIP_W = DOT_N * (DOT_R * 2 + DOT_GAP) // 308px (28 × 11)
  const STRIP_H = DOT_R * 2 + 4               // ~9px

  return (
    <ChartCard
      title={title}
      eyebrow={`ROSTER · ${pts.length} NAMED`}
      annotation={annotation}
      stamp={data.stamp}
      lang={lang}
    >
      <ol className="divide-y divide-border/60 px-2">
        {pts.map((p, idx) => {
          const rank = String(idx + 1).padStart(2, '0')
          const highlight = !!p.highlight
          // Per-point semantic color (sanctioned palette only) drives the rail,
          // glyph, magnitude dots and value; falls back to amber highlight / muted.
          const accent = resolveRowColor(p.color) ?? (highlight ? ANCHOR_COLOR : undefined)
          const rail = accent ?? 'transparent'
          const glyph = accent ? '●' : '◇'
          const glyphColor = accent ?? 'var(--color-text-muted)'

          // Magnitude dot-strip (abs-normalized; negatives handled). dotFill follows
          // the semantic accent so the strip matches rail/glyph; never green (§3.10).
          const frac = Math.abs(p.value) / maxAbs
          const isNeg = p.value < 0
          const filled = Math.round(frac * DOT_N)
          const dotFill = accent ?? 'var(--color-text-muted)'
          const pctOfLargest = Math.round(frac * 100)
          const ariaLabelStr = `${idx + 1}. ${labelFor(p)}: ${isNeg ? '−' : ''}${Math.abs(p.value)}${unit ? ` ${unit}` : ''}, ${pctOfLargest}% of largest`
          return (
            <li
              key={`${p.label}-${idx}`}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 py-3 pl-3 pr-2"
              style={{ borderLeft: `2px solid ${rail}` }}
              aria-label={ariaLabelStr}
            >
              {/* Rank — Playfair Italic, dimmed */}
              <span
                className="tabular-nums select-none"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'normal',
                  fontWeight: 800,
                  fontSize: 24,
                  lineHeight: 0.95,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-text-muted)',
                  opacity: 0.5,
                }}
                aria-hidden="true"
              >
                {rank}
              </span>

              {/* Name + magnitude strip + type badge */}
              <div className="min-w-0">
                <div
                  className="text-text-primary"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: 600,
                    fontSize: 'clamp(1rem, 1.6vw, 1.18rem)',
                    lineHeight: 1.25,
                    letterSpacing: '-0.005em',
                    wordBreak: 'break-word',
                  }}
                >
                  {labelFor(p)}
                </div>

                {/* Magnitude dot strip — inline SVG, pure-SVG responsive.
                    Negatives grow right-to-left from center zero (isNeg path).
                    GRAFT: when value2 present, renders solid recovered head
                    + hatched estimated tail (Reuters Forever Pollution two-state
                    lane). No-op on el-vacio and all current rosters (value2=undefined).
                    width:100% + maxWidth caps at natural size on desktop and scales
                    the whole strip down on narrow (mobile) columns so the magnitude
                    tail is never clipped by <main overflow-x-hidden>. */}
                <svg
                  viewBox={`0 0 ${STRIP_W} ${STRIP_H}`}
                  preserveAspectRatio="xMinYMin meet"
                  className="mt-1.5 block"
                  aria-hidden="true"
                  style={{ width: '100%', maxWidth: STRIP_W }}
                >
                  {Array.from({ length: DOT_N }, (_, di) => {
                    const cx = di * (DOT_R * 2 + DOT_GAP) + DOT_R + 1
                    const cy = DOT_R + 2
                    const isFilled = isNeg
                      ? di >= DOT_N - filled  // negatives fill from right
                      : di < filled

                    // GRAFT — two-state recovered/estimated lane when value2 present.
                    // Solid head up to `value` fraction; hatched tail from `value`
                    // to `value2`. Default-off (value2 === undefined on el-vacio).
                    let fillColor = isFilled ? dotFill : 'var(--color-border)'
                    let fillOpacity = isFilled ? 0.9 : 1
                    let isHatched = false
                    if (p.value2 !== undefined && p.value2 > 0) {
                      const fracRecovered = Math.abs(p.value) / maxAbs
                      const fracEstimated = Math.abs(p.value2) / maxAbs
                      const filledRecovered = Math.round(fracRecovered * DOT_N)
                      const filledEstimated = Math.round(fracEstimated * DOT_N)
                      const inRecovered = isNeg ? di >= DOT_N - filledRecovered : di < filledRecovered
                      const inEstimated = isNeg ? di >= DOT_N - filledEstimated : di < filledEstimated
                      if (inRecovered) {
                        fillColor = dotFill
                        fillOpacity = 0.9
                        isHatched = false
                      } else if (inEstimated) {
                        fillColor = dotFill
                        fillOpacity = 0.35
                        isHatched = true
                      } else {
                        fillColor = 'var(--color-border)'
                        fillOpacity = 1
                        isHatched = false
                      }
                    }

                    return (
                      <circle
                        key={di}
                        cx={cx}
                        cy={cy}
                        r={DOT_R}
                        fill={isHatched ? 'none' : fillColor}
                        stroke={isHatched ? fillColor : 'none'}
                        strokeWidth={isHatched ? 1 : 0}
                        opacity={fillOpacity}
                      />
                    )
                  })}
                </svg>
              </div>

              {/* Value — Playfair Italic 800, right-aligned, per-point semantic
                  accent. Negative values get a leading − on the readout. */}
              <div className="text-right whitespace-nowrap">
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'normal',
                    fontWeight: 800,
                    fontSize: 'clamp(1.35rem, 2.6vw, 1.9rem)',
                    lineHeight: 0.95,
                    letterSpacing: '-0.02em',
                    color: accent ?? 'var(--color-text-primary)',
                  }}
                >
                  {isNeg ? '−' : ''}{Math.abs(p.value).toLocaleString()}
                </span>
                {unit && (
                  <span
                    className="font-mono ml-1.5"
                    style={{
                      fontSize: 13,
                      letterSpacing: '0.16em',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {unit}
                  </span>
                )}
                {ref && (
                  <div
                    className="font-mono uppercase mt-1 tabular-nums"
                    style={{
                      fontSize: 13,
                      letterSpacing: '0.1em',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {(p.value / ref.value).toFixed(1)}× {refLabel}
                  </div>
                )}
              </div>

              {/* Annotation — full-width grid sub-row (2 / -1), spanning the
                  name + value columns so it never blows the middle column's
                  ~185px to 3–4 lines on a phone. Demoted tracking (0.06em vs
                  the 0.16em label rhythm) since it now owns a whole row. */}
              {annotationFor(p) && (
                <div
                  className="font-mono uppercase mt-1 flex items-center gap-1.5"
                  style={{
                    gridColumn: '2 / -1',
                    fontSize: 12,
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span aria-hidden style={{ color: glyphColor, fontSize: 12 }}>{glyph}</span>
                  <span>{annotationFor(p)}</span>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </ChartCard>
  )
}

// ---------------------------------------------------------------------------
// InlineTimeline — typographic horizontal timeline. Single hairline scale
// 0→maxValue with N proportional markers. Above each marker: Playfair
// Italic 800 value. Below each marker: mono caption + role tag (label).
// Two optional bracket arcs underneath label process windows. Replaces
// bar charts when the editorial point is TIME / latency, not amount.
//
// Data shape:
//   points: [{ label, value (months), highlight?, annotation? }, ...]
//   maxValue: scale upper bound (default 40)
//   referenceLine + referenceLine2: optional, repurposed as bracket arcs
//     ({ value: startMonth, label: 'ARIA window' }) — value is the START
//     position; the arc extends to the LAST highlighted/non-highlighted
//     marker respectively. Simpler: we derive arc spans from highlight
//     vs non-highlight automatically.
// ---------------------------------------------------------------------------

export function InlineTimeline({
  data,
  title,
  lang = 'en',
}: {
  data: StoryInlineChartData
  title: string
  lang?: 'en' | 'es'
}) {
  const pts = data.points
  const maxV = data.maxValue ?? 40
  const unit = data.unit ?? 'months'
  const unitLabel = lang === 'es' ? (unit === 'months' ? 'meses' : unit) : unit
  const annotation = lang === 'es' ? (data.annotation_es ?? data.annotation) : data.annotation
  const labelFor = (p: StoryChartPoint) => (lang === 'es' ? (p.label_es ?? p.label) : p.label)
  const annotationFor = (p: StoryChartPoint) =>
    lang === 'es' ? (p.annotation_es ?? p.annotation ?? '') : (p.annotation ?? '')

  // ── geometry ──────────────────────────────────────────────────────────
  const W = 760
  const PAD_L = 44
  const PAD_R = 44
  const trackY = 92
  const innerW = W - PAD_L - PAD_R
  const clampV = (v: number) => Math.min(Math.max(v, 0), maxV)
  const xFor = (v: number) => PAD_L + (clampV(v) / maxV) * innerW
  const unitAbbrev = unitLabel.toLowerCase().startsWith('mes') ? 'mo' : unitLabel.slice(0, 2)

  // ── staggered below-track label layout (greedy de-collision) ──────────
  // Each marker's role + annotation gets a vertical row; markers whose labels
  // would overlap horizontally are pushed to the next row down, connected by a
  // leader line from the dot. Text is edge-anchored so it never clips the right
  // margin. Replaces the old constant-Y layout whose labels overprinted
  // whenever markers clustered (0.5 / 6 / 15 on a 0–40 axis) — badly on mobile.
  const CHAR_W = 6.4
  const ROW_TOP = trackY + 30
  const ROW_STEP = 40
  const GAP = 18
  const estWidth = (p: StoryChartPoint) =>
    Math.max(labelFor(p).length, annotationFor(p).length) * CHAR_W
  const ordered = pts
    .map((p, i) => ({ p, i, x: xFor(p.value) }))
    .sort((a, b) => a.x - b.x)
  const rowEnds: number[] = []
  const placed = ordered.map(({ p, i, x }) => {
    const w = estWidth(p)
    const anchor: 'start' | 'end' = x + w > W - PAD_R ? 'end' : 'start'
    const left = anchor === 'end' ? x - w : x
    const right = anchor === 'end' ? x : x + w
    let row = 0
    while (rowEnds[row] !== undefined && left < rowEnds[row] + GAP) row++
    rowEnds[row] = right
    return { p, i, x, row, anchor }
  })
  const nRows = Math.max(1, rowEnds.length)
  const H = ROW_TOP + nRows * ROW_STEP + 6

  // Axis ticks at 0 / ¼ / ½ / ¾ / max
  const tickValues = [0, Math.round(maxV / 4), Math.round(maxV / 2), Math.round((3 * maxV) / 4), maxV]

  return (
    <ChartCard title={title} eyebrow={`TIMELINE · ${pts.length} MARKERS`} annotation={annotation}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        role="img"
        aria-label={title}
      >
        {/* Hairline scale */}
        <line x1={PAD_L} x2={W - PAD_R} y1={trackY} y2={trackY} stroke="var(--color-border)" strokeWidth={1} />

        {/* Axis ticks */}
        {tickValues.map((tv, i) => (
          <g key={`tick-${i}`}>
            <line x1={xFor(tv)} x2={xFor(tv)} y1={trackY - 3} y2={trackY + 3} stroke="var(--color-border)" strokeWidth={1} />
            <text
              x={xFor(tv)}
              y={trackY + 18}
              textAnchor="middle"
              fontSize={13}
              fontFamily="var(--font-family-mono, monospace)"
              fill="var(--color-text-muted)"
              opacity={0.55}
            >
              {tv}
            </text>
          </g>
        ))}
        <text
          x={W - PAD_R + 4}
          y={trackY + 18}
          textAnchor="start"
          fontSize={12}
          fontFamily="var(--font-family-mono, monospace)"
          fill="var(--color-text-muted)"
          opacity={0.5}
          style={{ letterSpacing: '0.14em' }}
        >
          {unitLabel.toUpperCase()}
        </text>

        {/* Markers: dot + Playfair value above (upright, per legibility sweep) */}
        {placed.map(({ p, i, x }) => {
          const highlight = !!p.highlight
          const color = highlight ? ANCHOR_COLOR : 'var(--color-text-muted)'
          return (
            <g key={`mk-${i}`}>
              <circle cx={x} cy={trackY} r={5} fill={color} opacity={highlight ? 1 : 0.7} />
              {highlight && (
                <circle cx={x} cy={trackY} r={9} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
              )}
              <text
                x={x}
                y={trackY - 14}
                textAnchor="middle"
                fontFamily="'Playfair Display', Georgia, serif"
                fontStyle="normal"
                fontWeight={800}
                fontSize={highlight ? 27 : 21}
                fill={highlight ? ANCHOR_COLOR : 'var(--color-text-primary)'}
                style={{ letterSpacing: '-0.02em' }}
              >
                <tspan className="tabular-nums">{p.value}</tspan>
                <tspan
                  dx={3}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontStyle="normal"
                  fontWeight={500}
                  fontSize={12}
                  fill="var(--color-text-muted)"
                  style={{ letterSpacing: '0.14em' }}
                >
                  {unitAbbrev}
                </tspan>
              </text>
            </g>
          )
        })}

        {/* Staggered role + annotation labels below, each with a leader line */}
        {placed.map(({ p, i, x, row, anchor }) => {
          const highlight = !!p.highlight
          const color = highlight ? ANCHOR_COLOR : 'var(--color-text-muted)'
          const rowY = ROW_TOP + row * ROW_STEP
          const ann = annotationFor(p)
          return (
            <g key={`lb-${i}`}>
              <line
                x1={x}
                x2={x}
                y1={trackY + 7}
                y2={rowY - 13}
                stroke={color}
                strokeWidth={1}
                opacity={highlight ? 0.6 : 0.3}
              />
              <text
                x={x}
                y={rowY}
                textAnchor={anchor}
                fontSize={12}
                fontFamily="var(--font-family-mono, monospace)"
                fill={highlight ? ANCHOR_COLOR : 'var(--color-text-secondary)'}
                style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                {labelFor(p)}
              </text>
              {ann && (
                <text
                  x={x}
                  y={rowY + 15}
                  textAnchor={anchor}
                  fontSize={13}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill="var(--color-text-muted)"
                  opacity={0.9}
                >
                  {ann}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </ChartCard>
  )
}
