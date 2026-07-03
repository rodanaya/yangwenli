/**
 * CategoryAlzado — «El Alzado / The Elevation», the sole chart on the
 * /categories index after the Jul-3 chart-cluster consolidation.
 *
 * Named precedent: FT Visual Vocabulary Marimekko / variable-width bar;
 * Reuters *Forever Pollution* named-outlier discipline; NYT Upshot
 * "Hometown" greedy row-bump callouts. Grafts: La Suma Corrida
 * (intersection deck), El ABC (all-72 hoverable tail), El Plano
 * (½/80% structural walls).
 *
 * ONE variable-width column chart (bar-mekko):
 *   WIDTH = cumulative slice of spend (x-axis IS cumulative spend →
 *     concentration read).
 *   HEIGHT = risk indicator on a strict ZERO baseline (fat-and-short
 *     vs thin-and-tall → size ≠ risk, told once instead of 3×/4×
 *     across the retired beeswarm + share-bar + slope trio).
 *
 * Head = top ~18 categories by spend, drawn as full columns. Tail
 * (≈54 remaining) collapses into ONE grey band at the tail's
 * spend-weighted mean risk. A handful of "needles" — qualified tail
 * members that rank in the overall qualified top-8 by avg_risk — are
 * drawn AT THEIR TRUE cumulative-x, floating over the band, at their
 * TRUE (floored) spend-share width: the width channel keeps meaning
 * "spend" everywhere on the chart, never a flat decorative sliver.
 *
 * The ½/80% concentration cuts render as full-height ochre "structural
 * wall" seams (not thin reference rules) — the slab-train visibly
 * straddles them. Two dashed risk-threshold rules (medium/high) and one
 * solid qualified-pool mean rule complete the reference geometry.
 *
 * Interaction: hover/focus/keyboard-cycle any head column or needle →
 * single floating CategoryHoverDossier (zero extra fetch, reused
 * unmodified). Hovering the tail band shows a ported "long tail"
 * mini-card. Every one of the ~54 tail categories stays individually
 * hoverable/keyboard-reachable via invisible per-category hit-slot
 * rects laid across the band. `highlightSector` dims non-matching
 * columns/needles/callouts to 0.25 (tail band floor 0.28).
 *
 * Mobile (<768px): 240px plate, tighter margins, top-3 spend + top-2
 * needle callouts, no floating hover card (tap → dossier), every mark
 * keeps ≥14px hit-slop.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS, RISK_THRESHOLDS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { CategoryHoverDossier } from './CategoryHoverDossier'
import type { CategorySummaryItem } from './types'
import { CONTRACT_FLOOR } from './types'

// ── geometry constants ─────────────────────────────────────────────────────

const PLATE_H_DESKTOP = 340
const PLATE_H_MOBILE = 240
const MOBILE_BREAKPOINT = 768

const MARGIN_DESKTOP = { top: 98, right: 30, bottom: 44, left: 40 }
const MARGIN_MOBILE = { top: 66, right: 14, bottom: 36, left: 28 }

const CALLOUT_ROW_H = 15
// Approx px width of a monospace label at 13px — used for width-aware
// de-collision so long names ("Building Construction") never overprint.
const MONO_CHAR_PX = 7.2
const estLabelPx = (s: string): number => s.length * MONO_CHAR_PX + 6
const MIN_NEEDLE_PX = 2.5
const NEEDLE_TOP_N = 8

function clamp(min: number, val: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

// ── model ───────────────────────────────────────────────────────────────

interface HeadCol {
  item: CategorySummaryItem
  startPct: number
  sharePct: number
  subFloor: boolean
}

interface Needle {
  item: CategorySummaryItem
  cumStartPct: number // true cumulative-x within the tail region
  sharePct: number // true spend share (floored at render time)
}

interface AlzadoModel {
  head: HeadCol[]
  tail: { startPct: number; sharePct: number; count: number; meanRisk: number; hasSubFloor: boolean } | null
  needles: Needle[]
  total: number
  k50: number
  k80: number
  qualifiedMeanRisk: number | null
  maxQualifiedRisk: number
  spendRankById: Map<number, number>
  hotCount: number
  hotInK50: number
}

function buildAlzado(items: CategorySummaryItem[]): AlzadoModel {
  const byValue = [...items].sort((a, b) => b.total_value - a.total_value)
  const total = byValue.reduce((s, c) => s + c.total_value, 0)

  const spendRankById = new Map<number, number>()
  byValue.forEach((c, i) => spendRankById.set(c.category_id, i + 1))

  // k50 / k80 cumulative walk (port CategoryConcentrationPlate.buildModel L79-83)
  let cum = 0
  let k50 = 0
  let k80 = 0
  for (let i = 0; i < byValue.length; i++) {
    cum += byValue[i].total_value
    if (k50 === 0 && total > 0 && cum / total >= 0.5) k50 = i + 1
    if (k80 === 0 && total > 0 && cum / total >= 0.8) k80 = i + 1
  }
  const headCount = Math.min(byValue.length, Math.max((k80 || 15) + 3, 16))
  const headItems = byValue.slice(0, headCount)
  const tailItems = byValue.slice(headCount)

  let walk = 0
  const head: HeadCol[] = headItems.map((c) => {
    const sharePct = total > 0 ? (c.total_value / total) * 100 : 0
    const startPct = total > 0 ? (walk / total) * 100 : 0
    walk += c.total_value
    return { item: c, startPct, sharePct, subFloor: c.total_contracts < CONTRACT_FLOOR }
  })

  const tailStartPct = total > 0 ? (walk / total) * 100 : 0
  const tailValue = tailItems.reduce((s, c) => s + c.total_value, 0)
  const tailSharePct = total > 0 ? (tailValue / total) * 100 : 0
  const tailQualified = tailItems.filter((c) => c.total_contracts >= CONTRACT_FLOOR)
  const tailSubFloor = tailItems.filter((c) => c.total_contracts < CONTRACT_FLOOR)
  const tailQualifiedValue = tailQualified.reduce((s, c) => s + c.total_value, 0)
  const tailMeanRisk =
    tailQualifiedValue > 0
      ? tailQualified.reduce((s, c) => s + c.total_value * c.avg_risk, 0) / tailQualifiedValue
      : 0

  const tail =
    tailItems.length > 0
      ? { startPct: tailStartPct, sharePct: tailSharePct, count: tailItems.length, meanRisk: tailMeanRisk, hasSubFloor: tailSubFloor.length > 0 }
      : null

  // qualified pool (all categories, for reference geometry + hot count)
  const qualifiedAll = items.filter((c) => c.total_contracts >= CONTRACT_FLOOR)
  const qualifiedMeanRisk =
    qualifiedAll.length > 0 ? qualifiedAll.reduce((s, c) => s + c.avg_risk, 0) / qualifiedAll.length : null
  const maxQualifiedRisk = qualifiedAll.length > 0 ? Math.max(...qualifiedAll.map((c) => c.avg_risk)) : 0

  // needles: tailQualified members within the OVERALL qualified top-8 by avg_risk
  const overallTop8 = [...qualifiedAll].sort((a, b) => b.avg_risk - a.avg_risk).slice(0, NEEDLE_TOP_N)
  const overallTop8Ids = new Set(overallTop8.map((c) => c.category_id))
  let needleWalk = 0
  const needles: Needle[] = []
  for (const c of tailItems) {
    const sharePct = total > 0 ? (c.total_value / total) * 100 : 0
    const cumStartPct = tailStartPct + (total > 0 ? (needleWalk / total) * 100 : 0)
    needleWalk += c.total_value
    if (overallTop8Ids.has(c.category_id)) {
      needles.push({ item: c, cumStartPct, sharePct })
    }
  }
  needles.sort((a, b) => b.item.avg_risk - a.item.avg_risk)

  // hot ∩ head intersection
  const hotAll = qualifiedAll.filter((c) => {
    const lvl = getRiskLevelFromScore(c.avg_risk)
    return lvl === 'high' || lvl === 'critical'
  })
  const headIdsForK50 = new Set(byValue.slice(0, k50 || byValue.length).map((c) => c.category_id))
  const hotInK50 = hotAll.filter((c) => headIdsForK50.has(c.category_id)).length

  return {
    head,
    tail,
    needles,
    total,
    k50,
    k80,
    qualifiedMeanRisk,
    maxQualifiedRisk,
    spendRankById,
    hotCount: hotAll.length,
    hotInK50,
  }
}

// ── callout layout (greedy row-bump, ported from InventarioAnaquel L115-134) ─

interface CalloutSrc {
  id: number
  name: string // already resolved to the active locale
  sectorCode: string
  x: number // screen x, plate coords (label center)
  isNeedle: boolean
  sharePct: number
}

interface CalloutLabel extends CalloutSrc {
  labelY: number
}

// Greedy vertical de-collision that accounts for each label's true WIDTH:
// two center-anchored labels overlap when their gap is smaller than the sum of
// their half-widths, so a long name pushes its neighbour to the row above.
function layoutCalloutLabels(callouts: CalloutSrc[], isMobile = false): CalloutLabel[] {
  const sorted = [...callouts].sort((a, b) => a.x - b.x)
  const lastByRow: { x: number; half: number }[] = []
  // Mobile: row 0 starts higher (-34 vs -22) to clear the ½/80% wall count
  // sublabels (render at y≈-11) with real vertical headroom — at -22 the two
  // stacks visually overprinted in the tight MARGIN_MOBILE.top=66 band.
  const startY = isMobile ? -34 : -22
  return sorted.map((c) => {
    const half = estLabelPx(c.name) / 2
    let row = 0
    while (
      lastByRow[row] !== undefined &&
      c.x - lastByRow[row].x < lastByRow[row].half + half + 6
    )
      row++
    lastByRow[row] = { x: c.x, half }
    return { ...c, labelY: startY - row * CALLOUT_ROW_H }
  })
}

// ── component ───────────────────────────────────────────────────────────

export interface CategoryAlzadoProps {
  items: CategorySummaryItem[]
  lang: 'en' | 'es'
  highlightSector?: string | null
}

export function CategoryAlzado({ items, lang, highlightSector }: CategoryAlzadoProps) {
  const isEs = lang === 'es'
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(960)
  const [hoveredId, setHoveredId] = useState<number | 'tail' | null>(null)
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const isMobile = width < MOBILE_BREAKPOINT
  const plateH = isMobile ? PLATE_H_MOBILE : PLATE_H_DESKTOP
  const MARGIN = isMobile ? MARGIN_MOBILE : MARGIN_DESKTOP
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerH = Math.max(0, plateH - MARGIN.top - MARGIN.bottom)

  const model = useMemo(() => buildAlzado(items), [items])
  const { head, tail, needles, total, k50, k80, qualifiedMeanRisk, maxQualifiedRisk, spendRankById, hotCount, hotInK50 } = model

  const x = useCallback((pct: number) => (pct / 100) * innerW, [innerW])
  const yMax = useMemo(() => Math.max(RISK_THRESHOLDS.high + 0.05, maxQualifiedRisk * 1.08), [maxQualifiedRisk])
  const y = useCallback((risk: number) => innerH - (risk / yMax) * innerH, [innerH, yMax])

  // ── keyboard cycling order: all head cols + needles, left→right in axis order ──
  const cycleOrder = useMemo(() => {
    const marks: { id: number; item: CategorySummaryItem; x: number }[] = []
    head.forEach((h) => marks.push({ id: h.item.category_id, item: h.item, x: h.startPct }))
    needles.forEach((n) => marks.push({ id: n.item.category_id, item: n.item, x: n.cumStartPct }))
    return marks.sort((a, b) => a.x - b.x)
  }, [head, needles])

  const focusedMark = focusedIdx !== null ? cycleOrder[focusedIdx] ?? null : null
  const activeId = hoveredId ?? focusedMark?.item.category_id ?? null

  const activeItem: CategorySummaryItem | null =
    activeId === 'tail' || activeId === null
      ? null
      : head.find((h) => h.item.category_id === activeId)?.item ??
        needles.find((n) => n.item.category_id === activeId)?.item ??
        null

  const isTailActive = activeId === 'tail'

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIdx((prev) => (prev === null ? 0 : Math.min(prev + 1, cycleOrder.length - 1)))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIdx((prev) => (prev === null ? cycleOrder.length - 1 : Math.max(prev - 1, 0)))
      } else if (e.key === 'Enter' && focusedMark) {
        navigate(`/categories/${focusedMark.item.category_id}`)
      } else if (e.key === 'Escape') {
        setFocusedIdx(null)
      }
    },
    [cycleOrder, focusedMark, navigate],
  )

  // ── callouts: NEEDLES ONLY (the surprising hot-tail finding). Head columns
  //    are named IN-COLUMN below, so nothing floats over the fat left slabs. ──
  const calloutSources = useMemo(() => {
    const needleCap = isMobile ? 2 : 5
    const out: CalloutSrc[] = []
    for (const n of needles.slice(0, needleCap)) {
      const w = Math.max(MIN_NEEDLE_PX, x(n.sharePct) - 1)
      out.push({
        id: n.item.category_id,
        name: isEs ? n.item.name_es : n.item.name_en,
        sectorCode: n.item.sector_code,
        x: x(n.cumStartPct) + w / 2,
        isNeedle: true,
        sharePct: n.sharePct,
      })
    }
    return out
  }, [needles, isMobile, isEs, x])

  const calloutLabels = useMemo(() => layoutCalloutLabels(calloutSources, isMobile), [calloutSources, isMobile])

  // ── computed intersection deck (graft: replaces the ported anaquel deck) ──
  const deckSentence = useMemo(() => {
    if (hotCount > 0) {
      const shelvesWord = isEs ? (hotCount === 1 ? 'anaquel arde' : 'anaqueles arden') : hotCount === 1 ? 'shelf burns' : 'shelves burn'
      const restEs =
        hotInK50 === 0
          ? `ninguno está entre las ${k50} que retienen la mitad del dinero`
          : hotInK50 === 1
            ? `1 está entre las ${k50} que retienen la mitad del dinero`
            : `${hotInK50} están entre las ${k50} que retienen la mitad del dinero`
      const restEn =
        hotInK50 === 0
          ? `none sits among the ${k50} that hold half the money`
          : hotInK50 === 1
            ? `1 sits among the ${k50} that hold half the money`
            : `${hotInK50} sit among the ${k50} that hold half the money`
      return isEs
        ? `${hotCount} ${shelvesWord} alto; ${restEs}.`
        : `${hotCount} ${shelvesWord} high; ${restEn}.`
    }
    // fallback: concentration-only sentence (never render an empty finding)
    return isEs
      ? `Ninguna categoría con muestra suficiente cruza el umbral alto — la concentración sigue siendo la historia: ${k50} categorías retienen la mitad del gasto, ${k80} el 80%.`
      : `No adequately-sampled category crosses the high threshold — concentration remains the story: ${k50} categories hold half of spend, ${k80} hold 80%.`
  }, [hotCount, hotInK50, k50, k80, isEs])

  // ── floating hover card placement ──────────────────────────────────────
  const cardWidth = 288
  let cardLeft = 0
  let cardTop: number | undefined
  let cardBottom: number | undefined
  let hoverAnchorX: number | null = null
  let hoverAnchorY: number | null = null
  if (activeItem) {
    const hCol = head.find((h) => h.item.category_id === activeItem.category_id)
    const nMark = needles.find((n) => n.item.category_id === activeItem.category_id)
    if (hCol) {
      hoverAnchorX = x(hCol.startPct + hCol.sharePct / 2)
      hoverAnchorY = y(activeItem.avg_risk)
    } else if (nMark) {
      const w = Math.max(MIN_NEEDLE_PX, x(nMark.sharePct) - 1)
      hoverAnchorX = x(nMark.cumStartPct) + w / 2
      hoverAnchorY = y(activeItem.avg_risk)
    }
  }
  if (hoverAnchorX !== null && hoverAnchorY !== null) {
    const screenX = MARGIN.left + hoverAnchorX
    const screenY = MARGIN.top + hoverAnchorY
    cardLeft = clamp(8, screenX - cardWidth / 2, Math.max(8, width - cardWidth - 8))
    if (screenY < plateH / 2) {
      cardTop = screenY + 12
    } else {
      cardBottom = plateH - screenY + 12
    }
  }

  if (total <= 0) return null

  const xTicks = [0, 25, 50, 75, 100]
  const yTicks = isMobile ? [0, 0.2, 0.4] : [0, 0.1, 0.2, 0.3, 0.4]

  const tailY = tail ? y(tail.meanRisk) : innerH
  const tailXStart = tail ? x(tail.startPct) : innerW
  const tailW = tail ? Math.max(1.5, innerW - tailXStart - 1) : 0

  // per-category invisible hit-slots across the tail band (graft: all-72 hoverable)
  const tailItemsSorted = useMemo(() => {
    if (!tail) return []
    const byValueAll = [...items].sort((a, b) => b.total_value - a.total_value)
    const headIds = new Set(head.map((h) => h.item.category_id))
    return byValueAll.filter((c) => !headIds.has(c.category_id))
  }, [items, head, tail])

  const tailHitSlots = useMemo(() => {
    if (!tail || tailItemsSorted.length === 0) return []
    let walk = 0
    return tailItemsSorted.map((c) => {
      const sharePct = total > 0 ? (c.total_value / total) * 100 : 0
      const startPct = tail.startPct + (total > 0 ? (walk / total) * 100 : 0)
      walk += c.total_value
      return { item: c, startX: x(startPct), w: Math.max(MIN_NEEDLE_PX, x(sharePct)) }
    })
  }, [tail, tailItemsSorted, total, x])

  const totalValueAll = total

  return (
    <section aria-label={isEs ? 'El alzado' : 'The elevation'}>
      <p
        className="font-mono mb-3.5"
        style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}
      >
        § {isEs ? 'El alzado · ancho es gasto, alto es riesgo' : 'The elevation · width is spend, height is risk'}
      </p>

      <p
        className="mb-4"
        style={{ fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif', fontStyle: 'normal', fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}
      >
        {deckSentence}
      </p>

      <div className="relative" ref={containerRef} style={{ width: '100%' }}>
        <svg
          width={width}
          height={plateH}
          viewBox={`0 0 ${width} ${plateH}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={
            isEs
              ? 'Gráfico de columnas de ancho variable: ancho es el gasto acumulado, alto es el indicador de riesgo sobre línea base cero'
              : 'Variable-width column chart: width is cumulative spend, height is the risk indicator on a zero baseline'
          }
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onBlur={() => setFocusedIdx(null)}
          style={{ outline: 'none', display: 'block', margin: '0 auto' }}
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* ── horizontal risk-threshold rules (dashed) + mean (solid) ── */}
            {RISK_THRESHOLDS.medium <= yMax && (
              <HRule
                yPos={y(RISK_THRESHOLDS.medium)}
                innerW={innerW}
                label={isEs ? 'MEDIO 25' : 'MEDIUM 25'}
                dashed
                isMobile={isMobile}
              />
            )}
            {RISK_THRESHOLDS.high <= yMax && (
              <HRule yPos={y(RISK_THRESHOLDS.high)} innerW={innerW} label={isEs ? 'ALTO 40' : 'HIGH 40'} dashed isMobile={isMobile} />
            )}
            {qualifiedMeanRisk !== null && (
              <g aria-hidden="true">
                <line x1={0} x2={innerW} y1={y(qualifiedMeanRisk)} y2={y(qualifiedMeanRisk)} stroke="var(--color-accent)" strokeWidth={1} strokeOpacity={0.55} />
                {/* Mobile: left-anchor at x=2 (left edge is empty) so the
                    label never overruns the viewBox's right edge. */}
                <text
                  x={isMobile ? 2 : innerW - 2}
                  y={y(qualifiedMeanRisk) - 3}
                  textAnchor={isMobile ? 'start' : 'end'}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontSize={isMobile ? 8 : 9}
                  fill="var(--color-accent)"
                  fillOpacity={isMobile ? 1 : 0.85}
                  paintOrder="stroke"
                  stroke={isMobile ? 'var(--color-background)' : 'none'}
                  strokeWidth={isMobile ? 3 : 0}
                  strokeLinejoin="round"
                >
                  {isEs ? 'media del inventario' : 'inventory mean'}
                </text>
              </g>
            )}

            {/* ── ½ / 80% structural walls (full plate height, ochre seam) ── */}
            {k50 > 0 && (
              <StructuralWall xPos={x(50)} innerH={innerH} big="½" sub={isMobile ? `${k50}` : isEs ? `${k50} categorías` : `${k50} categories`} />
            )}
            {k80 > 0 && (
              <StructuralWall xPos={x(80)} innerH={innerH} big="80%" sub={isMobile ? `${k80}` : isEs ? `${k80} categorías` : `${k80} categories`} />
            )}

            {/* ── zero baseline ─────────────────────────────────────────── */}
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--color-border)" strokeWidth={1} aria-hidden="true" />

            {/* ── tail band ──────────────────────────────────────────────── */}
            {tail && (
              <g>
                <rect
                  x={tailXStart}
                  width={tailW}
                  y={tailY}
                  height={Math.max(0, innerH - tailY)}
                  fill="var(--color-text-muted)"
                  fillOpacity={isTailActive ? 0.42 : highlightSector ? 0.28 : 0.35}
                  style={{ transition: 'fill-opacity 0.15s' }}
                />
                {tailW >= 40 && (
                  <text
                    x={tailXStart + tailW / 2}
                    y={Math.max(y(0), tailY) - 6}
                    textAnchor="middle"
                    fontFamily="var(--font-family-mono, monospace)"
                    fontSize={13}
                    fontWeight={700}
                    fill="var(--color-background)"
                    style={{ paintOrder: 'stroke', stroke: 'var(--color-text-muted)', strokeWidth: 3 }}
                  >
                    +{tail.count}
                    {tail.hasSubFloor ? '†' : ''}
                  </text>
                )}
                {/* invisible per-category hit-slots — all ~54 tail categories individually hoverable */}
                {tailHitSlots.map((slot) => (
                  <rect
                    key={`tail-slot-${slot.item.category_id}`}
                    x={slot.startX}
                    width={slot.w}
                    y={0}
                    height={innerH}
                    fill="transparent"
                    role="button"
                    tabIndex={-1}
                    aria-label={`${isEs ? slot.item.name_es : slot.item.name_en} — ${(slot.item.avg_risk * 100).toFixed(1)}% ${isEs ? 'riesgo' : 'risk'}, ${formatCompactMXN(slot.item.total_value)}`}
                    onMouseEnter={() => setHoveredId(slot.item.category_id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => navigate(`/categories/${slot.item.category_id}`)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
                {/* whole-band hover fallback (long-tail mini-card) */}
                <rect
                  x={tailXStart}
                  width={tailW}
                  y={0}
                  height={innerH}
                  fill="transparent"
                  aria-hidden="true"
                  onMouseEnter={() => setHoveredId((prev) => prev ?? 'tail')}
                  onMouseLeave={() => setHoveredId((prev) => (prev === 'tail' ? null : prev))}
                  style={{ pointerEvents: hoveredId && hoveredId !== 'tail' ? 'none' : 'auto' }}
                />
              </g>
            )}

            {/* ── head columns ─────────────────────────────────────────── */}
            {head.map((h, hi) => {
              const color = SECTOR_COLORS[h.item.sector_code] ?? SECTOR_COLORS.otros
              const colX = x(h.startPct)
              const colW = Math.max(1.5, x(h.sharePct) - 1)
              const colY = h.subFloor ? innerH : y(h.item.avg_risk)
              const colH = h.subFloor ? 0 : Math.max(0, innerH - colY)
              const isActive = activeId === h.item.category_id
              const isDimmedByFocus = activeId !== null && !isActive
              const isDimmedBySector = !!highlightSector && h.item.sector_code !== highlightSector
              const opacity = isDimmedBySector ? 0.25 : isDimmedByFocus ? 0.35 : 0.9
              const label = isEs ? h.item.name_es : h.item.name_en
              const hitW = Math.max(14, colW)
              return (
                <g key={h.item.category_id}>
                  {h.subFloor ? (
                    <rect x={colX} width={colW} y={innerH - 6} height={6} fill="none" stroke={color} strokeWidth={1.25} strokeDasharray="2,2" style={{ opacity: opacity }} />
                  ) : (
                    <rect
                      x={colX}
                      width={colW}
                      y={colY}
                      height={colH}
                      fill={color}
                      fillOpacity={opacity}
                      style={{ transition: 'fill-opacity 0.15s' }}
                    />
                  )}
                  {/* In-column vertical name — only the top-3 slabs, only when the
                      column is wide + tall enough to read; keeps names off the
                      crowded top margin (no floating head callouts). */}
                  {!h.subFloor && hi < 3 && colW >= 30 && colH >= 62 && (() => {
                    const maxChars = Math.max(4, Math.floor((colH - 12) / 6.6))
                    const needsTruncation = label.length > maxChars
                    // Mobile (600-767px band, no sidebar): a truncated name
                    // reads as broken ("Building…"). Only show the FULL
                    // name on mobile; suppress cleanly rather than clip.
                    if (isMobile && needsTruncation) return null
                    const vName = needsTruncation ? label.slice(0, maxChars - 1).trimEnd() + '…' : label
                    const cx = colX + colW / 2
                    const by = innerH - 8
                    return (
                      <text
                        x={cx}
                        y={by}
                        transform={`rotate(-90 ${cx} ${by})`}
                        textAnchor="start"
                        fontFamily="var(--font-family-mono, monospace)"
                        fontSize={11}
                        fontWeight={600}
                        fill="#ffffff"
                        stroke="rgba(0,0,0,0.42)"
                        strokeWidth={2.4}
                        paintOrder="stroke"
                        style={{ userSelect: 'none', pointerEvents: 'none', opacity: isDimmedBySector ? 0.25 : 1 }}
                        aria-hidden="true"
                      >
                        {vName}
                      </text>
                    )
                  })()}
                  <rect
                    x={colX - Math.max(0, (hitW - colW) / 2)}
                    width={hitW}
                    y={0}
                    height={innerH}
                    fill="transparent"
                    role="button"
                    tabIndex={-1}
                    aria-label={`${label} — ${(h.item.avg_risk * 100).toFixed(1)}% ${isEs ? 'riesgo' : 'risk'}, ${formatCompactMXN(h.item.total_value)}, ${formatNumber(h.item.total_contracts)} ${isEs ? 'contratos' : 'contracts'}`}
                    onMouseEnter={() => setHoveredId(h.item.category_id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => navigate(`/categories/${h.item.category_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/categories/${h.item.category_id}`)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </g>
              )
            })}

            {/* ── needles: true spend-share width (floored), drawn over the tail band ── */}
            {needles.slice(0, isMobile ? 2 : 5).map((n) => {
              const color = SECTOR_COLORS[n.item.sector_code] ?? SECTOR_COLORS.otros
              const nX = x(n.cumStartPct)
              const nW = Math.max(MIN_NEEDLE_PX, x(n.sharePct) - 1)
              const nY = y(n.item.avg_risk)
              const nH = Math.max(0, innerH - nY)
              const isActive = activeId === n.item.category_id
              const isDimmedByFocus = activeId !== null && !isActive
              const isDimmedBySector = !!highlightSector && n.item.sector_code !== highlightSector
              const opacity = isDimmedBySector ? 0.25 : isDimmedByFocus ? 0.35 : 1
              const label = isEs ? n.item.name_es : n.item.name_en
              const hitW = Math.max(14, nW)
              return (
                <g key={`needle-${n.item.category_id}`}>
                  <rect x={nX} width={nW} y={nY} height={nH} fill={color} fillOpacity={opacity} stroke="var(--color-background)" strokeWidth={0.5} style={{ transition: 'fill-opacity 0.15s' }} />
                  <rect
                    x={nX - Math.max(0, (hitW - nW) / 2)}
                    width={hitW}
                    y={0}
                    height={innerH}
                    fill="transparent"
                    role="button"
                    tabIndex={-1}
                    aria-label={`${label} — ${(n.item.avg_risk * 100).toFixed(1)}% ${isEs ? 'riesgo' : 'risk'}, ${n.sharePct.toFixed(1)}% ${isEs ? 'del gasto' : 'of spend'}`}
                    onMouseEnter={() => setHoveredId(n.item.category_id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => navigate(`/categories/${n.item.category_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/categories/${n.item.category_id}`)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </g>
              )
            })}

            {/* ── callout labels + leader lines ─────────────────────────── */}
            {calloutLabels.map((c) => {
              const color = SECTOR_TEXT_COLORS[c.sectorCode] ?? SECTOR_TEXT_COLORS.otros
              const anchor = c.x < 48 ? 'start' : c.x > innerW - 48 ? 'end' : 'middle'
              const isDimmedBySector = !!highlightSector && c.sectorCode !== highlightSector
              const opacity = isDimmedBySector ? 0.25 : 1
              return (
                <g key={`callout-${c.id}`} aria-hidden="true" style={{ opacity }}>
                  <line x1={c.x} y1={c.labelY + 4} x2={c.x} y2={0} stroke={color} strokeWidth={0.75} strokeOpacity={0.45} />
                  <text x={c.x} y={c.labelY} textAnchor={anchor} fontFamily="var(--font-family-mono, monospace)" fontSize={12} fill={color} style={{ userSelect: 'none' }}>
                    {c.name}
                  </text>
                </g>
              )
            })}

            {/* ── X axis (cumulative spend) ─────────────────────────────── */}
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--color-border)" strokeWidth={0.75} aria-hidden="true" />
            {xTicks.map((t) => {
              const tx = x(t)
              return (
                <g key={`xt-${t}`} aria-hidden="true">
                  <line x1={tx} x2={tx} y1={innerH} y2={innerH + 4} stroke="var(--color-border)" strokeWidth={0.75} />
                  <text x={tx} y={innerH + 16} textAnchor="middle" fontFamily="var(--font-family-mono, monospace)" fontSize={13} fill="var(--color-text-muted)" fillOpacity={0.7}>
                    {t}%
                  </text>
                </g>
              )
            })}
            <text x={innerW / 2} y={innerH + (isMobile ? 26 : 32)} textAnchor="middle" fontFamily="var(--font-family-mono, monospace)" fontSize={13} fill="var(--color-text-muted)" fillOpacity={0.6} letterSpacing="0.1em" aria-hidden="true">
              {isEs ? 'GASTO ACUMULADO →' : 'CUMULATIVE SPEND →'}
            </text>

            {/* ── Y axis (risk indicator, zero baseline) ────────────────── */}
            {yTicks.map((t) => {
              const ty = y(t)
              return (
                <g key={`yt-${t}`} aria-hidden="true">
                  <line x1={-4} x2={0} y1={ty} y2={ty} stroke="var(--color-border)" strokeWidth={0.75} />
                  <text x={-8} y={ty + 3} textAnchor="end" fontFamily="var(--font-family-mono, monospace)" fontSize={11} fill="var(--color-text-muted)" fillOpacity={0.7}>
                    {(t * 100).toFixed(0)}
                  </text>
                </g>
              )
            })}
            <text x={-MARGIN.left + 10} y={-12} textAnchor="start" fontFamily="var(--font-family-mono, monospace)" fontSize={11} fill="var(--color-text-muted)" fillOpacity={0.6} letterSpacing="0.08em" aria-hidden="true">
              {isMobile ? (isEs ? 'RIESGO ↑' : 'RISK ↑') : isEs ? 'INDICADOR ×100 ↑' : 'RISK INDICATOR ×100 ↑'}
            </text>
          </g>
        </svg>

        {!isMobile && activeItem && hoverAnchorX !== null && (
          <div
            className="hidden md:block pointer-events-none absolute z-20 rounded-md border border-border bg-background-card p-3 shadow-xl"
            style={{ left: cardLeft, width: cardWidth, ...(cardTop !== undefined ? { top: cardTop } : { bottom: cardBottom }) }}
          >
            <CategoryHoverDossier item={activeItem} rank={spendRankById.get(activeItem.category_id) ?? 1} totalValue={totalValueAll} lang={lang} />
          </div>
        )}

        {!isMobile && isTailActive && tail && (
          <div
            className="hidden md:block pointer-events-none absolute z-20 rounded-md border border-border bg-background-card p-3 shadow-xl"
            style={{ left: clamp(8, MARGIN.left + tailXStart + tailW / 2 - 108, Math.max(8, width - 224)), width: 216, top: MARGIN.top + Math.max(0, tailY - 90) }}
          >
            <div className="font-mono mb-1.5" style={{ fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}>
              {isEs ? 'La cola larga' : 'The long tail'}
            </div>
            <div className="tabular-nums" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontWeight: 800, fontSize: 28, lineHeight: 1, color: 'var(--color-text-secondary)' }}>
              {tail.sharePct.toFixed(0)}%
            </div>
            <div className="font-mono mt-1" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {isEs ? `${tail.count} categorías más` : `${tail.count} smaller categories`}
            </div>
            <div className="font-mono mt-1" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {isEs ? 'media ponderada' : 'weighted mean'}: <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>{tail.meanRisk.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 font-mono" style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
        {isEs
          ? 'Cada columna: su ancho es su tajada del gasto acumulado; su alto, el indicador de riesgo medio sobre línea base cero. Las agujas son categorías de la cola con indicador alto, dibujadas en su posición real de gasto.'
          : "Each column: its width is its slice of cumulative spend; its height, the average risk indicator on a zero baseline. Needles are tail categories with a high indicator, drawn at their true spend position."}
      </p>

      <p className="mt-2 text-[12px] font-mono text-text-muted opacity-60" aria-live="polite">
        {focusedMark
          ? isEs
            ? `${focusedMark.item.name_es} seleccionado — Enter para investigar`
            : `${focusedMark.item.name_en} selected — Enter to investigate`
          : isEs
            ? '← → navegar columnas · Enter para abrir · clic en columna'
            : '← → navigate columns · Enter to open · click column'}
      </p>
    </section>
  )
}

// ── horizontal reference rule (risk threshold) ─────────────────────────────

function HRule({ yPos, innerW, label, dashed, isMobile }: { yPos: number; innerW: number; label: string; dashed?: boolean; isMobile?: boolean }) {
  // Mobile: left-anchor at the plot's left edge (x=2), which is otherwise
  // empty — the desktop right-anchor at innerW-2 clips at narrow widths
  // because the label text runs past the viewBox's right boundary.
  return (
    <g aria-hidden="true">
      <line x1={0} x2={innerW} y1={yPos} y2={yPos} stroke="var(--color-border)" strokeWidth={1} strokeDasharray={dashed ? '4,4' : undefined} strokeOpacity={0.7} />
      <text
        x={isMobile ? 2 : innerW - 2}
        y={yPos - 3}
        textAnchor={isMobile ? 'start' : 'end'}
        fontFamily="var(--font-family-mono, monospace)"
        fontSize={isMobile ? 9 : 11}
        fill="var(--color-text-muted)"
        fillOpacity={isMobile ? 1 : 0.75}
        letterSpacing="0.06em"
        paintOrder="stroke"
        stroke={isMobile ? 'var(--color-background)' : 'none'}
        strokeWidth={isMobile ? 3 : 0}
        strokeLinejoin="round"
      >
        {label}
      </text>
    </g>
  )
}

// ── structural wall (½ / 80% concentration cut) ────────────────────────────

function StructuralWall({ xPos, innerH, big, sub }: { xPos: number; innerH: number; big: string; sub: string }) {
  return (
    <g>
      <line x1={xPos} x2={xPos} y1={0} y2={innerH} stroke="rgba(160, 104, 32, 0.7)" strokeWidth={2} aria-hidden="true" />
      <line x1={xPos} x2={xPos} y1={-8} y2={0} stroke="rgba(160, 104, 32, 0.7)" strokeWidth={1} aria-hidden="true" />
      <text x={xPos + 4} y={-11} fontFamily='"EB Garamond", Georgia, serif' fontStyle="normal" fontWeight={700} fontSize={13} fill="var(--color-text-primary)">
        {big}
      </text>
      <text x={xPos + 4 + (big.length > 1 ? 20 : 12)} y={-11} fontFamily="var(--font-family-mono, monospace)" fontSize={10} letterSpacing="0.04em" fill="var(--color-text-muted)">
        {sub}
      </text>
    </g>
  )
}
