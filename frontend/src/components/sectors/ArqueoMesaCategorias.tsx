/**
 * ArqueoMesaCategorias — WHAT-view Marimekko hero, "La Mesa · por categoría"
 *
 * Same band geometry as its WHO sibling ArqueoMesa.tsx, but a different
 * y-semantic: hatch height is a MEAN-RISK INDICATOR (avg_risk × 100), not a
 * spend share. Width is still money (total_value).
 *
 * Slices: top 14 categories by total_value + one aggregated remainder column
 * (the other 58). Rule at RISK_THRESHOLDS.medium (25%), amber, dashed —
 * the model's medium floor, never an OECD line. Waterline colored per column
 * by getRiskLevelFromScore (low -> muted, never green).
 *
 * Pure SVG. No <circle>, no dots, no d3-force. Bilingual inline ternaries.
 *
 * Named precedent: FT Visual Vocabulary Marimekko (see
 * docs/designs/sectors-fable-2026-07-02-spec.md §2.2 Act I / §3 NEW 2).
 */

import { useCallback, useMemo, useRef, useState, useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  SECTOR_COLORS,
  SECTOR_TEXT_COLORS,
  RISK_COLORS,
  RISK_THRESHOLDS,
  getRiskLevelFromScore,
} from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { measureLabel, placeLabels, type LabelBox, type LabelCandidate } from '@/lib/plateLabels'
import { useFontsReady, useMeasuredWidth } from '@/hooks/useMeasuredWidth'

// ── Types ────────────────────────────────────────────────────────────────

interface MesaCategory {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number | null
  sector_code: string | null
  total_contracts: number
  total_value: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
  /** high + critical share of contracts (0–100), from /categories/summary */
  high_risk_pct?: number
}

interface ArqueoMesaCategoriasProps {
  categories: MesaCategory[]
  lang: 'en' | 'es'
}

interface Column {
  key: string
  category_id: number | null // null = remainder (not clickable)
  name_es: string
  name_en: string
  sector_code: string | null
  total_value: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
  high_risk_pct: number
  isRemainder: boolean
}

// ── Constants ────────────────────────────────────────────────────────────

// Headroom inside the svg for the top tick and the annotation leader, so the
// plate no longer needs `overflow: visible` (PARALLAX D7 § Change 2).
const TOP_PAD = 28
const BAND_H = 300
const LEFT_GUTTER = 34
const RIGHT_PAD = 8
const READOUT_H = 20
const STRIP_H = 4
const LABEL_H = 22
const LEGEND_H = 16
const TOP_N = 14
const MOBILE_ROW_MIN_H = 24
const MOBILE_BREAKPOINT = 768
const MOBILE_RUN_H = 420
// The phone readout wraps: two 12px lines + the axis label (measured at 390).
const MOBILE_READOUT_H = 55

/** Mobile row height: spend share of a 420px run, floored at the 24px target. */
function mobileRowH(shareFrac: number): number {
  return Math.max(MOBILE_ROW_MIN_H, shareFrac * MOBILE_RUN_H)
}

// Glyph faces — the canvas measures exactly what the svg/HTML renders.
const MONO = 'var(--font-family-mono, monospace)'
const ANNO_LINE_H = 13

const RISK_LEVEL_COLOR: Record<'low' | 'medium' | 'high' | 'critical', string> = {
  low: 'var(--color-text-muted)',
  medium: RISK_COLORS.medium,
  high: RISK_COLORS.high,
  critical: RISK_COLORS.critical,
}

function snap5Up(v: number): number {
  return Math.ceil(v / 5) * 5
}

/** The resolved mono stack behind --font-family-mono, for canvas measureText. */
function monoStack(): string {
  if (typeof document === 'undefined') return 'monospace'
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-family-mono').trim()
  return v || 'monospace'
}

// ── Component ────────────────────────────────────────────────────────────

export function ArqueoMesaCategorias({ categories, lang }: ArqueoMesaCategoriasProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  // 0 until the first ResizeObserver tick: nothing is drawn at a guessed width
  // (the old 720px first paint shifted the figure — PARALLAX D7b § Change 8).
  const width = useMeasuredWidth(containerRef)
  const isMobile = width > 0 && width < MOBILE_BREAKPOINT
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const uid = useId()

  // Top 14 + remainder column
  const columns: Column[] = useMemo(() => {
    if (!categories.length) return []
    const sorted = [...categories].sort((a, b) => b.total_value - a.total_value)
    const top = sorted.slice(0, TOP_N)
    const tail = sorted.slice(TOP_N)

    const topCols: Column[] = top.map(c => ({
      key: `cat-${c.category_id}`,
      category_id: c.category_id,
      name_es: c.name_es,
      name_en: c.name_en,
      sector_code: c.sector_code,
      total_value: c.total_value,
      avg_risk: c.avg_risk,
      direct_award_pct: c.direct_award_pct,
      single_bid_pct: c.single_bid_pct,
      high_risk_pct: c.high_risk_pct ?? 0,
      isRemainder: false,
    }))

    if (tail.length) {
      // Contract-weighted, like the 14 per-category means it stands beside
      // (each is a mean over its own contracts) — PARALLAX D7b § Change 4.
      const tailValueSum = tail.reduce((s, c) => s + c.total_value, 0)
      const tailContracts = tail.reduce((s, c) => s + c.total_contracts, 0)
      const perContract = (pick: (c: MesaCategory) => number) =>
        tailContracts > 0 ? tail.reduce((s, c) => s + pick(c) * c.total_contracts, 0) / tailContracts : 0
      topCols.push({
        key: 'remainder',
        category_id: null,
        name_es: `las otras ${tail.length}`,
        name_en: `the other ${tail.length}`,
        sector_code: 'otros',
        total_value: tailValueSum,
        avg_risk: perContract((c) => c.avg_risk),
        direct_award_pct: perContract((c) => c.direct_award_pct),
        single_bid_pct: perContract((c) => c.single_bid_pct),
        high_risk_pct: perContract((c) => c.high_risk_pct ?? 0),
        isRemainder: true,
      })
    }

    return topCols
  }, [categories])

  const totalValue = useMemo(() => columns.reduce((s, c) => s + c.total_value, 0), [columns])
  const remainderCol = columns.find((c) => c.isRemainder)

  // y-domain: 0..max(50, snap5(maxRisk*100*1.08))
  const domainMax = useMemo(() => {
    if (!columns.length) return 50
    const maxRisk = Math.max(...columns.map(c => c.avg_risk))
    return Math.max(50, snap5Up(maxRisk * 100 * 1.08))
  }, [columns])

  const axisTicks = useMemo(() => {
    const out: number[] = []
    for (let t = 0; t <= domainMax; t += 10) out.push(t)
    return out
  }, [domainMax])

  const bandW = Math.max(0, width - LEFT_GUTTER - RIGHT_PAD)

  const yFor = useCallback((riskPct: number) => TOP_PAD + BAND_H - (riskPct / domainMax) * BAND_H, [domainMax])

  const mediumRuleY = yFor(RISK_THRESHOLDS.medium * 100)

  // Column x-positions (desktop) / heights (mobile). The run starts at the
  // tick gutter, like the WHO plate (it used to start at 0, under the tick
  // labels, leaving a dead 42px band at the right — PARALLAX D7 § Change 2).
  const laidOut = useMemo(() => {
    const out: { col: Column; x: number; w: number }[] = []
    let cursor = LEFT_GUTTER
    for (const col of columns) {
      const w = totalValue > 0 ? (col.total_value / totalValue) * bandW : 0
      out.push({ col, x: cursor, w })
      cursor += w
    }
    return out
  }, [columns, totalValue, bandW])

  // A column shows its full name (11px) only when the measured name + 6px fits
  // the column; otherwise a circled index + legend entry (columns under 3px
  // get neither, as before). The desktop plate is not drawn until these faces
  // are in, so the measure never runs on the fallback face.
  // The plate measures in the resolved mono at 11px (regular + the 700 threshold
  // label) — wait for exactly those faces, not just "no load in flight".
  const mono = useMemo(() => monoStack(), [])
  const measuredFaces = useMemo(() => [`11px ${mono}`, `700 11px ${mono}`], [mono])
  const fontsReady = useFontsReady(measuredFaces)
  const labelFits = useMemo(
    () =>
      laidOut.map(({ col, w }) => {
        const name = lang === 'es' ? col.name_es : col.name_en
        return measureLabel(name, `11px ${mono}`, Number.POSITIVE_INFINITY, 14).width + 6 <= w
      }),
    [mono, laidOut, lang],
  )
  const narrowSet = useMemo(
    () => laidOut.filter(({ w }, i) => !labelFits[i] && w >= 3),
    [laidOut, labelFits]
  )

  // Two computed annotations: tallest hatch + big-and-hot
  const tallest = useMemo(
    () => {
      // Exclude the aggregate remainder — annotations must name a real, clickable category.
      const real = columns.filter(c => !c.isRemainder)
      return real.length ? [...real].sort((a, b) => b.avg_risk - a.avg_risk)[0] : null
    },
    [columns]
  )
  const bigAndHot = useMemo(() => {
    // Real categories only (never "the other N" aggregate) at/above the medium rule.
    const eligible = columns.filter(c => !c.isRemainder && c.avg_risk >= RISK_THRESHOLDS.medium)
    if (!eligible.length) return null
    return [...eligible].sort((a, b) => b.total_value - a.total_value)[0]
  }, [columns])

  // Dagger: max direct_award_pct among top-14 (exclude remainder)
  const daggerCol = useMemo(() => {
    const top14 = columns.filter(c => !c.isRemainder)
    if (!top14.length) return null
    return [...top14].sort((a, b) => b.direct_award_pct - a.direct_award_pct)[0]
  }, [columns])

  const handleClick = useCallback(
    (col: Column) => {
      if (col.isRemainder || col.category_id === null) return
      navigate(`/categories/${col.category_id}`)
    },
    [navigate]
  )

  const hoveredCol = laidOut.find(({ col }) => col.key === hoveredKey)?.col ?? null

  const readoutText = hoveredCol
    ? lang === 'es'
      ? `${hoveredCol.name_es} · ${formatCompactMXN(hoveredCol.total_value)} · riesgo ${(hoveredCol.avg_risk * 100).toFixed(1)}% · AD ${hoveredCol.direct_award_pct.toFixed(0)}% · un postor ${hoveredCol.single_bid_pct.toFixed(0)}%`
      : `${hoveredCol.name_en} · ${formatCompactMXN(hoveredCol.total_value)} · risk ${(hoveredCol.avg_risk * 100).toFixed(1)}% · DA ${hoveredCol.direct_award_pct.toFixed(0)}% · single bid ${hoveredCol.single_bid_pct.toFixed(0)}%`
    : lang === 'es'
      ? 'pase el cursor por una columna · clic → dossier de la categoría'
      : 'hover a column · click → category dossier'

  const svgH = TOP_PAD + BAND_H + LABEL_H
  // Height held before the first measure, so the figure never pushes the page:
  // readout + plate + legend on desktop, or the stacked mobile rows.
  const pending = width === 0 || (!isMobile && !fontsReady)
  const reserveH =
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
      ? MOBILE_READOUT_H + columns.reduce((acc, c) => acc + mobileRowH(totalValue > 0 ? c.total_value / totalValue : 0) + 1, 0)
      : READOUT_H + svgH + LEGEND_H
  const hoveredIdx = hoveredKey === null ? -1 : laidOut.findIndex(({ col }) => col.key === hoveredKey)

  // ── The two computed annotations — HTML glyphs over the svg geometry ──
  // Seated with placeLabels (bounded to the plate, re-anchored at the edges,
  // the second dropped rather than overprinted when both land on one column);
  // obstacles = the tick column, the threshold label and the dagger.
  const annoFont = `11px ${mono}`
  const annoWidth = (lines: string[]) =>
    Math.max(...lines.map((l) => measureLabel(l, annoFont, Number.POSITIVE_INFINITY, ANNO_LINE_H).width))
  const annoText: Record<string, [string, string]> = {}
  const candidates: LabelCandidate[] = []
  const tallestFound = tallest ? laidOut.find(({ col }) => col.key === tallest.key) : undefined
  const tallestTop = tallest ? yFor(tallest.avg_risk * 100) : 0
  if (tallest && tallestFound) {
    const name = lang === 'es' ? tallest.name_es : tallest.name_en
    const pct = (tallest.avg_risk * 100).toFixed(1)
    // "on the table": the plate is the top 14 + the rest; the h2 above keeps
    // the catalog-wide superlative (PARALLAX D7b § Change 4, B5).
    annoText.tallest = lang === 'es' ? ['mayor riesgo en la mesa —', `${name} · ${pct}%`] : ['highest risk on the table —', `${name} · ${pct}%`]
    candidates.push({ id: 'tallest', x: tallestFound.x + tallestFound.w / 2, y: tallestTop, width: annoWidth(annoText.tallest), height: 2 * ANNO_LINE_H, above: 14, below: 4 })
  }
  const bigFound = bigAndHot ? laidOut.find(({ col }) => col.key === bigAndHot.key) : undefined
  if (bigAndHot && bigFound) {
    const name = lang === 'es' ? bigAndHot.name_es : bigAndHot.name_en
    annoText.bigAndHot = lang === 'es' ? ['grande y caliente —', name] : ['big and hot —', name]
    // Seated above the column top with a leader down, never inside the hatch.
    candidates.push({ id: 'bigAndHot', x: bigFound.x + bigFound.w / 2, y: yFor(bigAndHot.avg_risk * 100), width: annoWidth(annoText.bigAndHot), height: 2 * ANNO_LINE_H, above: 14 })
  }
  const thresholdLabel = lang === 'es' ? 'UMBRAL MEDIO · 25% (modelo)' : 'MEDIUM THRESHOLD · 25% (model)'
  const thresholdW = measureLabel(thresholdLabel, `700 ${annoFont}`, Number.POSITIVE_INFINITY, ANNO_LINE_H).width + thresholdLabel.length * 11 * 0.05
  const daggerFound = daggerCol ? laidOut.find(({ col }) => col.key === daggerCol.key) : undefined
  // The threshold label sits on the rule at the right end — unless a column's
  // hatch (its waterline included) reaches into that box, as the remainder's
  // 25.3% did. Then it slides to the first column start where the box is clear
  // (PARALLAX D7b § Change 4, S5); if none is, it keeps the right end.
  const thresholdBoxAt = (x0: number): LabelBox => ({ x0, y0: mediumRuleY - 16, x1: x0 + thresholdW + 2, y1: mediumRuleY + 2 })
  const hatchHits = (b: LabelBox) =>
    laidOut.some(({ col, x, w }) => x < b.x1 && x + w > b.x0 && yFor(col.avg_risk * 100) - 1 < b.y1)
  const endX0 = width - RIGHT_PAD - thresholdW - 2
  const thresholdX0 = [endX0, ...laidOut.map(({ x }) => x + 4)]
    .find((x0) => x0 + thresholdW + 2 <= width - RIGHT_PAD && !hatchHits(thresholdBoxAt(x0))) ?? endX0
  const thresholdEnd = thresholdX0 === endX0
  const thresholdBox = thresholdBoxAt(thresholdX0)
  const obstacles: LabelBox[] = [
    { x0: 0, y0: 0, x1: LEFT_GUTTER, y1: svgH },
    thresholdBox,
  ]
  if (daggerFound) obstacles.push({ x0: daggerFound.x, y0: TOP_PAD, x1: daggerFound.x + 12, y1: TOP_PAD + 16 })
  // Every column's hatch is an obstacle: an annotation never prints on a hatch
  // (a wide label over a narrow column used to land on its neighbour's).
  for (const { col, x, w } of laidOut) obstacles.push({ x0: x, y0: yFor(col.avg_risk * 100), x1: x + w, y1: TOP_PAD + BAND_H })
  const placed = isMobile ? [] : placeLabels(candidates, obstacles, { x0: 0, y0: 0, x1: width, y1: TOP_PAD + BAND_H })

  const caption =
    lang === 'en'
      ? 'Plate — The 14 largest categories plus the rest of the catalog: width is money; the hatch rises with mean risk (a model indicator, not a spend share). The 25% rule is the model’s medium threshold.'
      : 'Lámina — Las 14 categorías de mayor gasto más el resto del catálogo: el ancho es el dinero; el achurado sube con el riesgo promedio (indicador del modelo, no proporción del gasto). La regla de 25% es el umbral medio del modelo.'

  return (
    <PlateFrame
      folio="II·c"
      contextLabel={{ en: 'The table, by category', es: 'La mesa, por categoría' }}
      caption={caption}
      lang={lang}
    >
      <div className="w-full">
        <div className="mb-1">
          <h2
            className="inline"
            style={{
              fontFamily: 'var(--font-family-mono, monospace)',
              fontSize: 13,
              fontWeight: 400,
              lineHeight: 'inherit',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            {lang === 'es'
              ? '§ LA MESA · POR CATEGORÍA · ANCHO = GASTO, ALTURA = RIESGO'
              : '§ THE TABLE · BY CATEGORY · WIDTH = SPEND, HEIGHT = RISK'}
          </h2>
        </div>

        <div ref={containerRef} className="relative w-full" style={pending ? { minHeight: reserveH } : undefined}>
          {!pending && (<>
          {/* Hover readout strip — hover data on the left, persistent axis label on the right */}
          <div
            style={{
              // Fixed on desktop (no layout jump on hover); on a phone the
              // sentence wraps instead of clipping (PARALLAX D7 § Change 2).
              ...(isMobile ? { minHeight: READOUT_H } : { height: READOUT_H }),
              fontFamily: 'var(--font-family-mono, monospace)',
              fontSize: 12,
              color: 'var(--color-text-secondary, var(--color-text-muted))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              // Phone: the axis label drops to its own right-aligned line so the
              // readout keeps the full width (it was squeezed to ~100px).
              flexWrap: isMobile ? 'wrap' : undefined,
              rowGap: isMobile ? 2 : undefined,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {/* Polite live region: hover/focus fills it, AT hears it (a11y X3). */}
            <span role="status" aria-live="polite" style={isMobile ? undefined : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{readoutText}</span>
            <span style={{ flexShrink: 0, fontSize: 11, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase', ...(isMobile ? { flexBasis: '100%', textAlign: 'right' as const } : {}) }}>
              {lang === 'es' ? `riesgo promedio · indicador 0–${domainMax}%` : `mean risk · indicator 0–${domainMax}%`}
            </span>
          </div>

          {!isMobile ? (
            <div className="relative">
            <svg
              width={width}
              height={svgH}
              style={{ display: 'block' }}
              role="img"
              aria-label={
                lang === 'es'
                  ? 'Mesa Marimekko: categorías por gasto y riesgo promedio'
                  : 'Marimekko table: categories by spend and mean risk'
              }
            >
              <defs>
                {laidOut.map(({ col }) => (
                  <pattern
                    key={`hatch-${col.key}`}
                    id={`hatch-${uid}-${col.key}`}
                    patternUnits="userSpaceOnUse"
                    width={4}
                    height={4}
                    patternTransform="rotate(45)"
                  >
                    <line
                      x1={0}
                      y1={0}
                      x2={0}
                      y2={4}
                      stroke="var(--color-text-primary)"
                      strokeOpacity={0.38}
                      strokeWidth={1}
                    />
                  </pattern>
                ))}
              </defs>

              {/* y-axis ticks */}
              {axisTicks.map(tick => {
                const ty = yFor(tick)
                return (
                  <g key={`tick-${tick}`}>
                    <line
                      x1={LEFT_GUTTER}
                      y1={ty}
                      x2={width - RIGHT_PAD}
                      y2={ty}
                      stroke="currentColor"
                      strokeOpacity={0.06}
                      strokeWidth={1}
                    />
                    <text
                      x={LEFT_GUTTER - 4}
                      y={ty}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={11}
                      fontFamily={mono}
                      fill="var(--color-text-muted)"
                    >
                      {tick}
                    </text>
                  </g>
                )
              })}


              {/* columns */}
              {laidOut.map(({ col, x, w }) => {
                const hatchTop = yFor(col.avg_risk * 100)
                const level = getRiskLevelFromScore(col.avg_risk)
                const waterColor = RISK_LEVEL_COLOR[level]
                const color = SECTOR_COLORS[col.sector_code ?? 'otros'] ?? SECTOR_COLORS.otros
                const textColor = SECTOR_TEXT_COLORS[col.sector_code ?? 'otros'] ?? color
                const isHovered = hoveredKey === col.key
                const isDimmed = hoveredKey !== null && !isHovered
                const name = lang === 'es' ? col.name_es : col.name_en
                const showLabel = labelFits[laidOut.findIndex((d) => d.col.key === col.key)]

                return (
                  <g key={col.key}>
                    {/* fine hatch fill */}
                    <rect
                      x={x}
                      y={hatchTop}
                      width={Math.max(0, w - 1)}
                      height={Math.max(0, TOP_PAD + BAND_H - hatchTop)}
                      fill={`url(#hatch-${uid}-${col.key})`}
                      opacity={isHovered ? 1.3 : isDimmed ? 0.55 : 1}
                    />
                    {/* transparent hit area + interactivity */}
                    <rect
                      x={x}
                      y={TOP_PAD}
                      width={Math.max(0, w - 1)}
                      height={BAND_H}
                      fill="transparent"
                      // The accent outline rect is the focus indicator; no native double box.
                      className="focus-visible:outline-none"
                      style={{ cursor: col.isRemainder ? 'default' : 'pointer' }}
                      tabIndex={0}
                      role="button"
                      aria-label={
                        (lang === 'es'
                          ? `${col.name_es} — ${formatCompactMXN(col.total_value)}, riesgo ${(col.avg_risk * 100).toFixed(1)}% · alto riesgo ${col.high_risk_pct.toFixed(0)}% · adjudicación directa ${col.direct_award_pct.toFixed(0)}%`
                          : `${col.name_en} — ${formatCompactMXN(col.total_value)}, risk ${(col.avg_risk * 100).toFixed(1)}% · high-risk ${col.high_risk_pct.toFixed(0)}% · direct award ${col.direct_award_pct.toFixed(0)}%`) +
                        (col.isRemainder ? (lang === 'es' ? ' · agregado, sin dossier' : ' · aggregate, no dossier') : '')
                      }
                      onMouseEnter={() => setHoveredKey(col.key)}
                      onMouseLeave={() => setHoveredKey(null)}
                      onFocus={() => setHoveredKey(col.key)}
                      onBlur={() => setHoveredKey(null)}
                      onClick={() => handleClick(col)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') handleClick(col)
                      }}
                    />
                    {/* waterline */}
                    <line
                      x1={x}
                      y1={hatchTop}
                      x2={x + Math.max(0, w - 1)}
                      y2={hatchTop}
                      stroke={waterColor}
                      strokeWidth={1.5}
                      pointerEvents="none"
                    />
                    {/* separator */}
                    <line
                      x1={x + w}
                      y1={TOP_PAD}
                      x2={x + w}
                      y2={TOP_PAD + BAND_H}
                      stroke="var(--color-border)"
                      strokeWidth={1}
                      pointerEvents="none"
                    />
                    {/* baseline sector strip */}
                    <rect
                      x={x}
                      y={TOP_PAD + BAND_H}
                      width={Math.max(0, w - 1)}
                      height={STRIP_H}
                      fill={color}
                    />
                    {/* label — the full name, shown only when it fits */}
                    {showLabel && (
                      <text
                        x={x + w / 2}
                        y={TOP_PAD + BAND_H + STRIP_H + 13}
                        textAnchor="middle"
                        fontSize={11}
                        fontFamily={mono}
                        fill={textColor}
                      >
                        {name}
                      </text>
                    )}
                    {/* dagger */}
                    {daggerCol && col.key === daggerCol.key && (
                      <text
                        x={x + 3}
                        y={TOP_PAD + 12}
                        fontSize={12}
                        fontFamily={mono}
                        fill="var(--color-text-muted)"
                        pointerEvents="none"
                      >
                        †
                      </text>
                    )}
                  </g>
                )
              })}

              {/* circled-number ticks for narrow columns */}
              {narrowSet.map(({ col, x, w }, idx) => (
                <text
                  key={`narrow-${col.key}`}
                  x={x + w / 2}
                  y={TOP_PAD + BAND_H + STRIP_H + 14}
                  textAnchor="middle"
                  fontSize={13}
                  fontFamily={mono}
                  fill="var(--color-text-muted)"
                >
                  {String.fromCharCode(9312 + Math.min(idx, 19))}
                </text>
              ))}

              {/* medium threshold rule */}
              <line
                x1={LEFT_GUTTER}
                y1={mediumRuleY}
                x2={width - RIGHT_PAD}
                y2={mediumRuleY}
                stroke={RISK_COLORS.medium}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                pointerEvents="none"
              />
              <text
                x={thresholdEnd ? width - RIGHT_PAD : thresholdX0}
                y={mediumRuleY - 4}
                textAnchor={thresholdEnd ? 'end' : 'start'}
                fontSize={11}
                fontFamily={mono}
                fontWeight={700}
                // Small type in accent-hover (Day 6b decision): RISK_TEXT_COLORS.high
                // measured 4.45:1 on the plate paper. The dashed rule keeps RISK_COLORS.high.
                fill="var(--color-accent-hover)"
                letterSpacing="0.05em"
                pointerEvents="none"
              >
                {thresholdLabel}
              </text>

              {/* Hover / keyboard-focus outline around the active column */}
              {hoveredIdx >= 0 && (
                <rect
                  x={laidOut[hoveredIdx].x + 1}
                  y={TOP_PAD + 1}
                  width={Math.max(2, laidOut[hoveredIdx].w - 3)}
                  height={BAND_H - 2}
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              )}

              {/* Annotation leader for "highest risk" (glyphs are HTML, below) */}
              {placed.some((p) => p.id === 'tallest') && tallestFound && (() => {
                const p = placed.find((q) => q.id === 'tallest')!
                const cx = tallestFound.x + tallestFound.w / 2
                const [y1, y2] = p.box.y0 >= tallestTop ? [tallestTop, p.box.y0 - 2] : [p.box.y1 + 2, tallestTop]
                return (
                  <line x1={cx} y1={y1} x2={cx} y2={y2} stroke="var(--color-text-muted)" strokeWidth={0.8} strokeOpacity={0.7} pointerEvents="none" />
                )
              })()}
              {placed.some((p) => p.id === 'bigAndHot') && bigFound && (() => {
                const p = placed.find((q) => q.id === 'bigAndHot')!
                const cx = bigFound.x + bigFound.w / 2
                const top = yFor(bigFound.col.avg_risk * 100)
                return <line x1={cx} y1={p.box.y1 + 2} x2={cx} y2={top} stroke="var(--color-text-muted)" strokeWidth={0.8} strokeOpacity={0.7} pointerEvents="none" />
              })()}
            </svg>
            {placed.map((p) => (
              <div
                key={p.id}
                aria-hidden="true"
                className="absolute pointer-events-none whitespace-nowrap"
                style={{
                  left: p.box.x0,
                  top: p.box.y0,
                  width: p.box.x1 - p.box.x0,
                  textAlign: p.align,
                  fontFamily: MONO,
                  fontSize: 11,
                  lineHeight: `${ANNO_LINE_H}px`,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {annoText[p.id as string]?.[0]}
                <br />
                {annoText[p.id as string]?.[1]}
              </div>
            ))}
            </div>
          ) : (
            <MobileMesa
              laidOut={laidOut}
              lang={lang}
              hoveredKey={hoveredKey}
              setHoveredKey={setHoveredKey}
              domainMax={domainMax}
            />
          )}

          {/* legend line for narrow columns */}
          {!isMobile && narrowSet.length > 0 && (
            <div
              style={{
                minHeight: LEGEND_H,
                fontFamily: 'var(--font-family-mono, monospace)',
                fontSize: 13,
                color: 'var(--color-text-muted)',
              }}
            >
              {narrowSet
                .map(
                  ({ col }, idx) =>
                    `${String.fromCharCode(9312 + Math.min(idx, 19))} ${lang === 'es' ? col.name_es : col.name_en}`
                )
                .join('  ·  ')}
            </div>
          )}
          </>)}
        </div>

        {/* dagger footnote */}
        {daggerCol && (
          <div
            className="mt-1"
            style={{
              fontFamily: 'var(--font-family-mono, monospace)',
              fontSize: 13,
              color: 'var(--color-text-muted)',
            }}
          >
            {lang === 'es'
              ? `† ${daggerCol.name_es}: ${daggerCol.direct_award_pct.toFixed(0)}% adjudicación directa — la más alta de la mesa`
              : `† ${daggerCol.name_en}: ${daggerCol.direct_award_pct.toFixed(0)}% direct award — the highest on the table`}
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-family-mono, monospace)', fontSize: 13, color: 'var(--color-text-muted)' }}>
          {lang === 'es'
            ? `riesgo medio por contrato${remainderCol ? ` · «${remainderCol.name_es}» = ponderado por contrato` : ''}`
            : `mean risk per contract${remainderCol ? ` · "${remainderCol.name_en}" = contract-weighted` : ''}`}
        </div>

      </div>
    </PlateFrame>
  )
}

// ── Mobile (90deg rotation) ─────────────────────────────────────────────

interface LaidOutRow {
  col: Column
  x: number
  w: number
}

function MobileMesa({
  laidOut,
  lang,
  hoveredKey,
  setHoveredKey,
  domainMax,
}: {
  laidOut: LaidOutRow[]
  lang: 'en' | 'es'
  hoveredKey: string | null
  setHoveredKey: (k: string | null) => void
  domainMax: number
}) {
  const totalW = laidOut.reduce((s, { w }) => s + w, 0) || 1
  return (
    <div className="flex flex-col gap-[1px]">
      {laidOut.map(({ col, w }) => {
        const rowH = mobileRowH(w / totalW)
        const color = SECTOR_COLORS[col.sector_code ?? 'otros'] ?? SECTOR_COLORS.otros
        const level = getRiskLevelFromScore(col.avg_risk)
        const waterColor = RISK_LEVEL_COLOR[level]
        const name = lang === 'es' ? col.name_es : col.name_en
        const isHovered = hoveredKey === col.key
        const saturationPct = ((col.avg_risk * 100) / domainMax) * 100
        const halfwayPct = (RISK_THRESHOLDS.medium * 100 / domainMax) * 100

        // The whole row is the link (the remainder has no dossier: plain div).
        const rowStyle = {
          position: 'relative' as const,
          display: 'flex',
          alignItems: 'center',
          minHeight: rowH,
          cursor: col.isRemainder ? 'default' : 'pointer',
          background: isHovered ? 'rgba(0,0,0,0.03)' : 'transparent',
          borderLeft: `4px solid ${color}`,
          overflow: 'hidden' as const,
        }
        const body = (
          <>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.min(100, saturationPct)}%`,
                background: waterColor,
                opacity: 0.28,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(100, halfwayPct)}%`,
                top: 0,
                bottom: 0,
                width: 1,
                background: RISK_COLORS.high,
                opacity: 0.7,
              }}
            />
            <div
              className="flex items-center justify-between w-full px-2"
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontStyle: 'normal',
                fontWeight: 800,
                fontSize: 13,
                color: 'var(--color-text-primary)',
              }}
            >
              <span className="min-w-0 break-words" style={{ fontFamily: 'var(--font-family-mono, monospace)', fontStyle: 'normal', fontWeight: 600, fontSize: 13 }}>
                {name}
              </span>
              <span className="shrink-0 pl-2">{(col.avg_risk * 100).toFixed(1)}%</span>
            </div>
          </>
        )
        return col.isRemainder || col.category_id === null ? (
          <div key={col.key} style={rowStyle}>
            {body}
          </div>
        ) : (
          <Link
            key={col.key}
            to={`/categories/${col.category_id}`}
            aria-label={`${name} — ${(col.avg_risk * 100).toFixed(1)}%`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            style={rowStyle}
            onTouchStart={() => setHoveredKey(col.key)}
          >
            {body}
          </Link>
        )
      })}
    </div>
  )
}
