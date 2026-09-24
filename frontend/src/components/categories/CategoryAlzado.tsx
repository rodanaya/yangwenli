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
 * Labels (PARALLAX D10b § Change 1): an HTML layer over the 1:1 svg, every
 * box measured — a head column carries its full name rotated (≥22px, ≤2
 * lines) or level (wide + short), else an index badge at its foot and a row
 * in the legend under the axis; needle callouts, the ½ / 80% wall row and the
 * rule labels are seated collision-free. SHOW_TIER_CAP draws a 3px risk-tier
 * cap on every column and needle.
 *
 * Mobile (<768px): 240px plate, badges + legend for every head column, top-2
 * needle callouts, no floating hover card (tap → dossier), every mark keeps
 * ≥14px hit-slop.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS, RISK_COLORS, RISK_TEXT_COLORS, RISK_THRESHOLDS, getRiskLevelFromScore } from '@/lib/constants'
import { useMeasuredWidth, useFontsReady } from '@/hooks/useMeasuredWidth'
import { fitLabel, measureLabel, placeLabels, type LabelBox } from '@/lib/plateLabels'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { CategoryHoverDossier } from './CategoryHoverDossier'
import type { CategorySummaryItem } from './types'
import { CONTRACT_FLOOR } from './types'

// ── geometry constants ─────────────────────────────────────────────────────

const PLATE_H_DESKTOP = 340
const PLATE_H_MOBILE = 240
const MOBILE_BREAKPOINT = 768

const MARGIN_DESKTOP = { top: 98, right: 30, bottom: 44, left: 40 }
const MARGIN_MOBILE = { top: 76, right: 14, bottom: 36, left: 28 }

// PARALLAX D10b § Change 1: the risk-tier cap — a 3px band in the tier's
// colour on the top edge of every head column and needle. One line to remove.
const SHOW_TIER_CAP = true
const CAP_H = 3

// Label layer faces (measured with canvas once the faces are in).
const MONO = '"JetBrains Mono", monospace'
const COL_FONT = `600 11px ${MONO}`
const COL_LINE = 13
const CALLOUT_FONT = `12px ${MONO}`
const CALLOUT_ROW_H = 15
const WALL_FONT = `11px ${MONO}`
const WALL_BIG_FONT = '700 13px "EB Garamond", Georgia, serif'
const WALL_ROW_H = 16
const RULE_FONT = `11px ${MONO}`
const RULE_H = 14
const BADGE_FONT = `600 11px ${MONO}`
const BADGE_D = 14
const BADGE_GAP = 2
const BADGE_ROW_H = BADGE_D + 3
const badgeWidth = (n: number) => Math.max(BADGE_D, Math.ceil(measureLabel(String(n), BADGE_FONT, 99, BADGE_D).width) + 4)

/** 1-D pack: keep order, each box as close to its ideal centre as the row allows. */
function packRow(items: { cx: number; w: number }[], x0: number, x1: number): number[] {
  const left = items.map((it) => it.cx - it.w / 2)
  for (let i = 0; i < left.length; i++) left[i] = Math.max(i === 0 ? x0 : left[i - 1] + items[i - 1].w + BADGE_GAP, left[i])
  for (let i = left.length - 1; i >= 0; i--) left[i] = Math.min(i === left.length - 1 ? x1 - items[i].w : left[i + 1] - items[i].w - BADGE_GAP, left[i])
  for (let i = 0; i < left.length; i++) left[i] = Math.max(i === 0 ? x0 : left[i - 1] + items[i - 1].w + BADGE_GAP, left[i])
  return left
}
const TAIL_FONT = `700 13px ${MONO}`
const AXIS_FONT = `11px ${MONO}`
const FONTS = [COL_FONT, CALLOUT_FONT, WALL_BIG_FONT] as const
// background-coloured halo so a label stays legible over a fill or a rule
const HALO = '0 0 2px var(--color-background), 0 0 3px var(--color-background), 0 0 4px var(--color-background)'
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

// ── label layer (PARALLAX D10b § Change 1) ─────────────────────────────
// "HTML owns glyphs, SVG owns geometry": the svg draws every mark at 1:1
// (viewBox = measured width) and every name / callout / wall / rule label is
// an absolutely positioned HTML box seated with measured widths
// (lib/plateLabels) — no character estimates, no ellipsis.

type Box = LabelBox

const boxIntersects = (a: Box, b: Box): boolean => !(a.x1 <= b.x0 || a.x0 >= b.x1 || a.y1 <= b.y0 || a.y0 >= b.y1)
const boxInside = (a: Box, o: Box): boolean => a.x0 >= o.x0 && a.x1 <= o.x1 && a.y0 >= o.y0 && a.y1 <= o.y1
/** First candidate box that is inside `bounds` and clear of `taken`. */
function firstFree(cands: Box[], taken: Box[], bounds: Box): Box | null {
  for (const c of cands) if (boxInside(c, bounds) && !taken.some((t) => boxIntersects(c, t))) return c
  return null
}

interface ColLabel { id: number; name: string; lines: string[]; box: Box; dim: boolean; rotated: boolean }
interface Badge { id: number; n: number; box: Box; sectorCode: string; dim: boolean; leader?: { x1: number; y1: number; x2: number; y2: number } }
interface LegendItem { id: number; n: number; name: string; sharePct: number; risk: number; sectorCode: string }
interface Callout { id: number; name: string; sectorCode: string; box: Box; leaderX: number; leaderY1: number; leaderY2: number; dim: boolean }
interface WallLabel { key: string; big: string; sub: string; box: Box; seamX: number }
interface RuleLabel { key: string; text: string; box: Box; accent: boolean }

interface AlzadoLayout {
  colLabels: ColLabel[]
  badges: Badge[]
  legend: LegendItem[]
  callouts: Callout[]
  walls: WallLabel[]
  rules: RuleLabel[]
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
  const width = useMeasuredWidth(containerRef)
  const fontsReady = useFontsReady(FONTS)
  const [hoveredId, setHoveredId] = useState<number | 'tail' | null>(null)
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null)

  const isMobile = width > 0 && width < MOBILE_BREAKPOINT
  const plateH = isMobile ? PLATE_H_MOBILE : PLATE_H_DESKTOP
  const model = useMemo(() => buildAlzado(items), [items])
  // PARALLAX D10b § judge 1: below 768 every head column's badge sits in a
  // packed row under the x-axis (one row when it fits, else two).
  const mobileBadgeRows = useMemo(() => {
    if (!isMobile) return 0
    void fontsReady
    const need = model.head.reduce((s, _h, i) => s + badgeWidth(i + 1) + BADGE_GAP, 0)
    return need <= width - 4 ? 1 : 2
  }, [isMobile, model.head, width, fontsReady])
  const badgeBand = isMobile ? mobileBadgeRows * BADGE_ROW_H + 3 : 0
  const MARGIN = useMemo(() => (isMobile ? { ...MARGIN_MOBILE, bottom: MARGIN_MOBILE.bottom + badgeBand } : MARGIN_DESKTOP), [isMobile, badgeBand])
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerH = Math.max(0, plateH - MARGIN.top - MARGIN.bottom)

  const { head, tail, needles, total, k50, k80, qualifiedMeanRisk, maxQualifiedRisk, spendRankById, hotCount, hotInK50 } = model

  const x = useCallback((pct: number) => (pct / 100) * innerW, [innerW])
  const yMax = useMemo(() => Math.max(RISK_THRESHOLDS.high + 0.05, maxQualifiedRisk * 1.08), [maxQualifiedRisk])
  const y = useCallback((risk: number) => innerH - (risk / yMax) * innerH, [innerH, yMax])

  const needlesShown = useMemo(() => needles.slice(0, isMobile ? 2 : 5), [needles, isMobile])

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

  const tailY = tail ? y(tail.meanRisk) : innerH
  const tailXStart = tail ? x(tail.startPct) : innerW
  const tailW = tail ? Math.max(1.5, innerW - tailXStart - 1) : 0

  // ── the label layer, measured (plate px = svg px) ──────────────────────
  const layout = useMemo<AlzadoLayout | null>(() => {
    if (width <= 0 || innerW <= 0 || total <= 0) return null
    void fontsReady // re-measure once the real faces are in
    const L = MARGIN.left
    const T = MARGIN.top
    const plot: Box = { x0: L, y0: T, x1: L + innerW, y1: T + innerH }
    const taken: Box[] = []
    const dimOf = (code: string) => !!highlightSector && code !== highlightSector

    // tail count glyph (svg) + y-axis title (svg) are obstacles, measured
    if (tail && tailW >= 40) {
      const w = measureLabel(`+${tail.count}${tail.hasSubFloor ? '†' : ''}`, TAIL_FONT, 999, 16).width
      const cx = L + tailXStart + tailW / 2
      taken.push({ x0: cx - w / 2 - 2, y0: T + innerH - 20, x1: cx + w / 2 + 2, y1: T + innerH - 2 })
    }
    const axisTitle = isMobile ? (isEs ? 'RIESGO ↑' : 'RISK ↑') : isEs ? 'INDICADOR ×100 ↑' : 'RISK INDICATOR ×100 ↑'
    const axisW = measureLabel(axisTitle, AXIS_FONT, 999, 14).width + axisTitle.length * 11 * 0.08
    taken.push({ x0: 10, y0: T - 24, x1: 10 + axisW, y1: T - 8 })

    // needles are obstacles for rule labels + callouts (with their cap)
    const needleBoxes: Box[] = needlesShown.map((n) => {
      const nX = L + x(n.cumStartPct)
      const nW = Math.max(MIN_NEEDLE_PX, x(n.sharePct) - 1)
      return { x0: nX - 1, y0: T + y(n.item.avg_risk) - 2, x1: nX + nW + 1, y1: T + innerH }
    })

    // 1 · head-column names: in-column (rotated, ≤2 lines, measured) or a badge
    const colLabels: ColLabel[] = []
    const badgeCols: HeadCol[] = []
    for (const h of head) {
      const name = isEs ? h.item.name_es : h.item.name_en
      const colW = Math.max(1.5, x(h.sharePct) - 1)
      const colY = h.subFloor ? innerH : y(h.item.avg_risk)
      const colH = Math.max(0, innerH - colY)
      const fit = !isMobile && !h.subFloor && colW >= 22 && colH > 30
        ? fitLabel(name, COL_FONT, colH - 12, { maxLines: 2, lineHeight: COL_LINE })
        : null
      const cx = L + x(h.startPct) + colW / 2
      if (fit && fit.lines.length * COL_LINE <= colW - 4) {
        // rung 1 — rotated, reading bottom-to-top
        const bw = fit.lines.length * COL_LINE
        const box = { x0: cx - bw / 2, y0: T + innerH - 6 - fit.width, x1: cx + bw / 2, y1: T + innerH - 6 }
        colLabels.push({ id: h.item.category_id, name, lines: fit.lines, box, dim: dimOf(h.item.sector_code), rotated: true })
        taken.push(box)
        continue
      }
      // rung 2 — a wide, short column carries the name level, ≤2 lines
      const flat = !isMobile && !h.subFloor && colW >= 60 ? fitLabel(name, COL_FONT, colW - 10, { maxLines: 2, lineHeight: COL_LINE }) : null
      if (flat && flat.height <= colH - 12) {
        const box = { x0: cx - flat.width / 2 - 1, y0: T + innerH - 6 - flat.height, x1: cx + flat.width / 2 + 1, y1: T + innerH - 6 }
        colLabels.push({ id: h.item.category_id, name, lines: flat.lines, box, dim: dimOf(h.item.sector_code), rotated: false })
        taken.push(box)
        continue
      }
      // rung 3 — an index badge at the foot + a legend row under the axis
      badgeCols.push(h)
    }
    const badges: Badge[] = []
    const legend: LegendItem[] = []
    if (isMobile) {
      const rowsN = Math.max(1, mobileBadgeRows)
      const rowItems: { h: HeadCol; n: number; cx: number; w: number }[][] = Array.from({ length: rowsN }, () => [])
      badgeCols.forEach((h, i) => {
        const cx = L + x(h.startPct) + Math.max(1.5, x(h.sharePct) - 1) / 2
        rowItems[i % rowsN].push({ h, n: i + 1, cx, w: badgeWidth(i + 1) })
      })
      rowItems.forEach((row, r) => {
        const lefts = packRow(row, 2, width - 2)
        const top = T + innerH + 4 + r * BADGE_ROW_H
        row.forEach((it, j) => {
          const box = { x0: lefts[j], y0: top, x1: lefts[j] + it.w, y1: top + BADGE_D }
          taken.push(box)
          badges.push({ id: it.h.item.category_id, n: it.n, box, sectorCode: it.h.item.sector_code, dim: dimOf(it.h.item.sector_code), leader: { x1: (box.x0 + box.x1) / 2, y1: top, x2: it.cx, y2: T + innerH } })
        })
      })
      badgeCols.forEach((h, i) => legend.push({ id: h.item.category_id, n: i + 1, name: isEs ? h.item.name_es : h.item.name_en, sharePct: h.sharePct, risk: h.item.avg_risk, sectorCode: h.item.sector_code }))
    } else {
      badgeCols.forEach((h, i) => {
        const n = i + 1
        const w = badgeWidth(n)
        const cx = L + x(h.startPct) + Math.max(1.5, x(h.sharePct) - 1) / 2
        let seated: Box | null = null
        // seat with a BADGE_GAP margin so two badges never touch
        for (let row = 0; row < 12 && !seated; row++) {
          const got = placeLabels([{ id: n, x: cx, y: T + innerH, width: w + BADGE_GAP * 2, height: BADGE_D + BADGE_GAP * 2, above: 1 + row * (BADGE_D + BADGE_GAP * 2) }], taken, plot)
          if (got[0]) seated = got[0].box
        }
        if (seated) {
          taken.push(seated)
          const box = { x0: seated.x0 + BADGE_GAP, y0: seated.y0 + BADGE_GAP, x1: seated.x1 - BADGE_GAP, y1: seated.y1 - BADGE_GAP }
          badges.push({ id: h.item.category_id, n, box, sectorCode: h.item.sector_code, dim: dimOf(h.item.sector_code) })
        }
        legend.push({ id: h.item.category_id, n, name: isEs ? h.item.name_es : h.item.name_en, sharePct: h.sharePct, risk: h.item.avg_risk, sectorCode: h.item.sector_code })
      })
    }

    // 2 · ½ / 80 % wall labels — their own reserved row(s) at the top of the band
    const walls: WallLabel[] = []
    const wallBand: Box = { x0: 0, y0: 2, x1: width, y1: T - 4 }
    const wallDefs = [
      k50 > 0 ? { key: 'k50', big: '½', sub: isEs ? `${k50} categorías` : `${k50} categories`, pct: 50 } : null,
      k80 > 0 ? { key: 'k80', big: '80%', sub: isEs ? `${k80} categorías` : `${k80} categories`, pct: 80 } : null,
    ].filter((d): d is { key: string; big: string; sub: string; pct: number } => d !== null)
    // each wall: 2 rows × (right of its seam | left of it); its seam tick runs
    // from the label down to the plot, so a tick may cross no other label.
    const wallCands = wallDefs.map((d) => {
      const w = Math.ceil(measureLabel(d.big, WALL_BIG_FONT, 999, 16).width + measureLabel(` · ${d.sub}`, WALL_FONT, 999, 16).width) + 2
      const seamX = L + x(d.pct)
      const out: { box: Box; tick: Box }[] = []
      for (let row = 0; row < 2; row++) {
        const top = 2 + row * (WALL_ROW_H + 2)
        for (const box of [
          { x0: seamX + 4, y0: top, x1: seamX + 4 + w, y1: top + WALL_ROW_H },
          { x0: seamX - 4 - w, y0: top, x1: seamX - 4, y1: top + WALL_ROW_H },
        ]) {
          if (boxInside(box, wallBand) && !taken.some((t) => boxIntersects(box, t))) {
            out.push({ box, tick: { x0: seamX - 1, y0: top + WALL_ROW_H / 2, x1: seamX + 1, y1: T } })
          }
        }
      }
      return { d, seamX, out }
    })
    const ok = (a: { box: Box; tick: Box }, b: { box: Box; tick: Box }) =>
      !boxIntersects(a.box, b.box) && !boxIntersects(a.tick, b.box) && !boxIntersects(b.tick, a.box)
    let pick: ({ box: Box; tick: Box } | null)[] = wallCands.map((c) => c.out[0] ?? null)
    if (wallCands.length === 2) {
      pick = [null, null]
      search: for (const a of wallCands[0].out) for (const b of wallCands[1].out) if (ok(a, b)) { pick = [a, b]; break search }
    }
    wallCands.forEach((c, i) => {
      const p = pick[i]
      if (!p) return
      walls.push({ key: c.d.key, big: c.d.big, sub: c.d.sub, box: p.box, seamX: c.seamX })
      // the tick only constrains the other wall; callouts may cross it (their halo masks the 1px line)
      taken.push(p.box)
    })
    const wallBottom = walls.length ? Math.max(...walls.map((w) => w.box.y1)) : 2

    // 3 · needle callouts — measured, seated row by row with placeLabels, a
    //     leader to the mark; a leader never crosses a seated label.
    const callouts: Callout[] = []
    const calloutBand: Box = { x0: 0, y0: wallBottom + 2, x1: width, y1: T - 3 }
    const calloutSrc = needles.slice(0, isMobile ? 2 : 3)
      .map((n) => {
        const nW = Math.max(MIN_NEEDLE_PX, x(n.sharePct) - 1)
        return { n, cx: L + x(n.cumStartPct) + nW / 2 }
      })
      .sort((a, b) => a.cx - b.cx)
    for (const { n, cx } of calloutSrc) {
      const name = isEs ? n.item.name_es : n.item.name_en
      const m = measureLabel(name, CALLOUT_FONT, width, CALLOUT_ROW_H)
      const needleTop = T + y(n.item.avg_risk)
      const w = m.width + 2
      let placed: Callout | null = null
      // row by row from the plot upward; right-aligned first (the needles sit
      // at the right end of the axis), then left, then centred. A leader may
      // cross no seated label.
      for (let row = 0; row < 6 && !placed; row++) {
        const top = calloutBand.y1 - CALLOUT_ROW_H - row * (CALLOUT_ROW_H + 1)
        for (const x0 of [cx - w, cx, cx - w / 2]) {
          const box: Box = { x0, y0: top, x1: x0 + w, y1: top + CALLOUT_ROW_H }
          if (!boxInside(box, calloutBand) || taken.some((t) => boxIntersects(box, t))) continue
          const leader: Box = { x0: cx - 1, y0: box.y1, x1: cx + 1, y1: needleTop }
          if (taken.some((t) => boxIntersects(leader, t))) continue
          placed = { id: n.item.category_id, name, sectorCode: n.item.sector_code, box, leaderX: cx, leaderY1: box.y1, leaderY2: needleTop, dim: dimOf(n.item.sector_code) }
          taken.push(box, leader)
          break
        }
      }
      if (placed) callouts.push(placed)
    }

    // 4 · rule labels — right end by default, left end when the right is
    //     occupied (needles, callouts, names), below the line as a last resort.
    const rules: RuleLabel[] = []
    const ruleObstacles = [...taken, ...needleBoxes]
    const ruleDefs = [
      RISK_THRESHOLDS.high <= yMax ? { key: 'high', text: isEs ? 'ALTO 40' : 'HIGH 40', v: RISK_THRESHOLDS.high, accent: false } : null,
      RISK_THRESHOLDS.medium <= yMax ? { key: 'medium', text: isEs ? 'MEDIO 25' : 'MEDIUM 25', v: RISK_THRESHOLDS.medium, accent: false } : null,
      qualifiedMeanRisk !== null ? { key: 'mean', text: isEs ? 'media del inventario' : 'inventory mean', v: qualifiedMeanRisk, accent: true } : null,
    ]
    for (const d of ruleDefs) {
      if (!d) continue
      const w = Math.ceil(measureLabel(d.text, RULE_FONT, 999, RULE_H).width + d.text.length * 11 * 0.06) + 4
      const ly = T + y(d.v)
      const above = ly - 1 - RULE_H
      const below = ly + 1
      const cands: Box[] = [
        { x0: L + innerW - 2 - w, y0: above, x1: L + innerW - 2, y1: above + RULE_H },
        { x0: L + 2, y0: above, x1: L + 2 + w, y1: above + RULE_H },
        { x0: L + innerW - 2 - w, y0: below, x1: L + innerW - 2, y1: below + RULE_H },
        { x0: L + 2, y0: below, x1: L + 2 + w, y1: below + RULE_H },
      ]
      const box = firstFree(cands, ruleObstacles, plot) ?? cands[1]
      rules.push({ key: d.key, text: d.text, box, accent: d.accent })
      ruleObstacles.push(box)
    }

    return { colLabels, badges, legend, callouts, walls, rules }
  }, [width, innerW, innerH, total, fontsReady, MARGIN, mobileBadgeRows, tail, tailW, tailXStart, isMobile, isEs, needlesShown, needles, head, x, y, highlightSector, k50, k80, yMax, qualifiedMeanRisk])

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
  const totalValueAll = total
  const capFill = (risk: number): { fill: string; opacity: number } => {
    const lvl = getRiskLevelFromScore(risk)
    return lvl === 'low' ? { fill: 'var(--color-text-muted)', opacity: 0.5 } : { fill: RISK_COLORS[lvl], opacity: 1 }
  }
  const boxStyle = (b: Box) => ({ position: 'absolute' as const, left: b.x0, top: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 })

  return (
    <section aria-label={isEs ? 'El alzado' : 'The elevation'} data-alz-figure>
      <h2
        className="font-mono mb-3.5"
        style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, lineHeight: 1.5, maxWidth: 'none' }}
      >
        § {isEs ? 'El alzado · ancho es gasto, alto es riesgo' : 'The elevation · width is spend, height is risk'}
      </h2>

      <p
        className="mb-4"
        style={{ fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif', fontStyle: 'normal', fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}
      >
        {deckSentence}
      </p>

      <div className="relative" ref={containerRef} style={{ width: '100%', height: plateH }} data-alz-plate>
        {width > 0 && (
        <svg
          width={width}
          height={plateH}
          viewBox={`0 0 ${width} ${plateH}`}
          role="img"
          aria-label={
            isEs
              ? 'Gráfico de columnas de ancho variable: ancho es el gasto acumulado, alto es el indicador de riesgo sobre línea base cero'
              : 'Variable-width column chart: width is cumulative spend, height is the risk indicator on a zero baseline'
          }
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onBlur={() => setFocusedIdx(null)}
          style={{ outline: 'none', display: 'block' }}
        >
          {/* callout leaders + wall seam ticks (plate coords) */}
          {layout?.callouts.map((c) => (
            <line
              key={`leader-${c.id}`}
              x1={c.leaderX}
              x2={c.leaderX}
              y1={c.leaderY1}
              y2={c.leaderY2}
              stroke={SECTOR_TEXT_COLORS[c.sectorCode] ?? SECTOR_TEXT_COLORS.otros}
              strokeWidth={0.75}
              strokeOpacity={c.dim ? 0.12 : 0.45}
              aria-hidden="true"
            />
          ))}
          {layout?.badges.map((b) => b.leader && (
            <line key={`bl-${b.id}`} x1={b.leader.x1} y1={b.leader.y1} x2={b.leader.x2} y2={b.leader.y2} stroke={SECTOR_COLORS[b.sectorCode] ?? SECTOR_COLORS.otros} strokeWidth={0.75} strokeOpacity={b.dim ? 0.2 : 0.7} aria-hidden="true" />
          ))}
          {layout?.walls.map((w) => (
            <line key={`seam-${w.key}`} x1={w.seamX} x2={w.seamX} y1={(w.box.y0 + w.box.y1) / 2} y2={MARGIN.top} stroke="rgba(160, 104, 32, 0.7)" strokeWidth={1} aria-hidden="true" />
          ))}
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* ── horizontal risk-threshold rules (dashed) + mean (solid) — labels in the HTML layer ── */}
            {RISK_THRESHOLDS.medium <= yMax && <HRule yPos={y(RISK_THRESHOLDS.medium)} innerW={innerW} dashed />}
            {RISK_THRESHOLDS.high <= yMax && <HRule yPos={y(RISK_THRESHOLDS.high)} innerW={innerW} dashed />}
            {qualifiedMeanRisk !== null && (
              <line x1={0} x2={innerW} y1={y(qualifiedMeanRisk)} y2={y(qualifiedMeanRisk)} stroke="var(--color-accent)" strokeWidth={1} strokeOpacity={0.55} aria-hidden="true" />
            )}

            {/* ── ½ / 80% structural walls (full plate height, ochre seam) ── */}
            {k50 > 0 && <StructuralWall xPos={x(50)} innerH={innerH} />}
            {k80 > 0 && <StructuralWall xPos={x(80)} innerH={innerH} />}

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
                    aria-label={`${isEs ? slot.item.name_es : slot.item.name_en} — ${isEs ? 'indicador de riesgo' : 'risk indicator'} ${Math.round(slot.item.avg_risk * 100)} ${isEs ? 'de' : 'of'} 100, ${formatCompactMXN(slot.item.total_value)}`}
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
            {head.map((h) => {
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
              const cap = capFill(h.item.avg_risk)
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
                  {SHOW_TIER_CAP && !h.subFloor && colH > 0 && (
                    <rect data-alz-cap x={colX} width={colW} y={colY} height={CAP_H} fill={cap.fill} fillOpacity={cap.opacity * (isDimmedBySector ? 0.25 : 1)} aria-hidden="true" />
                  )}
                  <rect
                    x={colX - Math.max(0, (hitW - colW) / 2)}
                    width={hitW}
                    y={0}
                    height={innerH}
                    fill="transparent"
                    role="button"
                    tabIndex={-1}
                    aria-label={`${label} — ${isEs ? 'indicador de riesgo' : 'risk indicator'} ${Math.round(h.item.avg_risk * 100)} ${isEs ? 'de' : 'of'} 100, ${formatCompactMXN(h.item.total_value)}, ${formatNumber(h.item.total_contracts)} ${isEs ? 'contratos' : 'contracts'}`}
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
            {needlesShown.map((n) => {
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
              const cap = capFill(n.item.avg_risk)
              return (
                <g key={`needle-${n.item.category_id}`}>
                  <rect data-alz-needle x={nX} width={nW} y={nY} height={nH} fill={color} fillOpacity={opacity} stroke="var(--color-background)" strokeWidth={0.5} style={{ transition: 'fill-opacity 0.15s' }} />
                  {SHOW_TIER_CAP && nH > 0 && (
                    <rect data-alz-cap x={nX} width={nW} y={nY} height={CAP_H} fill={cap.fill} fillOpacity={cap.opacity * (isDimmedBySector ? 0.25 : 1)} aria-hidden="true" />
                  )}
                  <rect
                    x={nX - Math.max(0, (hitW - nW) / 2)}
                    width={hitW}
                    y={0}
                    height={innerH}
                    fill="transparent"
                    role="button"
                    tabIndex={-1}
                    aria-label={`${label} — ${isEs ? 'indicador de riesgo' : 'risk indicator'} ${Math.round(n.item.avg_risk * 100)} ${isEs ? 'de' : 'of'} 100, ${n.sharePct.toFixed(1)}% ${isEs ? 'del gasto' : 'of spend'}`}
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

            {/* ── X axis (cumulative spend) ─────────────────────────────── */}
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--color-border)" strokeWidth={0.75} aria-hidden="true" />
            {xTicks.map((t) => {
              const tx = x(t)
              return (
                <g key={`xt-${t}`} aria-hidden="true">
                  <line x1={tx} x2={tx} y1={innerH} y2={innerH + 4} stroke="var(--color-border)" strokeWidth={0.75} />
                  <text x={tx} y={innerH + badgeBand + 16} textAnchor={t === 0 ? 'start' : t === 100 ? 'end' : 'middle'} fontFamily="var(--font-family-mono, monospace)" fontSize={isMobile ? 11 : 13} fill="var(--color-text-muted)">
                    {t}%
                  </text>
                </g>
              )
            })}
            <text x={innerW / 2} y={innerH + badgeBand + (isMobile ? 30 : 32)} textAnchor="middle" fontFamily="var(--font-family-mono, monospace)" fontSize={isMobile ? 11 : 13} fill="var(--color-text-muted)" letterSpacing="0.1em" aria-hidden="true">
              {isEs ? 'GASTO ACUMULADO →' : 'CUMULATIVE SPEND →'}
            </text>

            {/* ── Y axis (risk indicator, zero baseline) ────────────────── */}
            {yTicks.map((t) => {
              const ty = y(t)
              return (
                <g key={`yt-${t}`} aria-hidden="true">
                  <line x1={-4} x2={0} y1={ty} y2={ty} stroke="var(--color-border)" strokeWidth={0.75} />
                  <text x={-8} y={ty + 3} textAnchor="end" fontFamily="var(--font-family-mono, monospace)" fontSize={11} fill="var(--color-text-muted)">
                    {(t * 100).toFixed(0)}
                  </text>
                </g>
              )
            })}
            <text x={-MARGIN.left + 10} y={-12} textAnchor="start" fontFamily="var(--font-family-mono, monospace)" fontSize={11} fill="var(--color-text-muted)" letterSpacing="0.08em" aria-hidden="true">
              {isMobile ? (isEs ? 'RIESGO ↑' : 'RISK ↑') : isEs ? 'INDICADOR ×100 ↑' : 'RISK INDICATOR ×100 ↑'}
            </text>
          </g>
        </svg>
        )}

        {/* ── the HTML label layer (only once the plate is measured) ── */}
        {layout && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 font-mono" style={{ userSelect: 'none' }}>
            {layout.colLabels.map((c) => (
              <div
                key={`col-${c.id}`}
                data-alz-col-label
                data-name={c.name}
                style={{
                  ...boxStyle(c.box),
                  ...(c.rotated ? { writingMode: 'vertical-rl' as const, transform: 'rotate(180deg)' } : { textAlign: 'center' as const }),
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: `${COL_LINE}px`,
                  color: '#ffffff',
                  textShadow: '0 0 2px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.6)',
                  whiteSpace: 'nowrap',
                  opacity: c.dim ? 0.25 : 1,
                }}
              >
                {c.lines.map((ln, i) => (
                  <span key={i} style={{ display: 'block' }}>{ln}</span>
                ))}
              </div>
            ))}
            {layout.badges.map((b) => (
              <span
                key={`badge-${b.id}`}
                data-alz-badge
                className="inline-flex items-center justify-center tabular-nums"
                style={{
                  ...boxStyle(b.box),
                  borderRadius: BADGE_D / 2,
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: 1,
                  background: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  border: `1px solid ${SECTOR_COLORS[b.sectorCode] ?? SECTOR_COLORS.otros}`,
                  opacity: b.dim ? 0.3 : 1,
                }}
              >
                {b.n}
              </span>
            ))}
            {layout.walls.map((w) => (
              <span key={`wall-${w.key}`} data-alz-wall-label style={{ ...boxStyle(w.box), whiteSpace: 'nowrap', lineHeight: `${WALL_ROW_H}px` }}>
                <span style={{ fontFamily: '"EB Garamond", Georgia, serif', fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}>{w.big}</span>
                <span style={{ fontSize: 11, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}> · {w.sub}</span>
              </span>
            ))}
            {layout.callouts.map((c) => (
              <span
                key={`callout-${c.id}`}
                data-alz-callout
                style={{ ...boxStyle(c.box), whiteSpace: 'nowrap', fontSize: 12, lineHeight: `${CALLOUT_ROW_H}px`, color: SECTOR_TEXT_COLORS[c.sectorCode] ?? SECTOR_TEXT_COLORS.otros, opacity: c.dim ? 0.25 : 1, textShadow: HALO }}
              >
                {c.name}
              </span>
            ))}
            {layout.rules.map((r) => (
              <span
                key={`rule-${r.key}`}
                data-alz-rule-label
                style={{ ...boxStyle(r.box), whiteSpace: 'nowrap', fontSize: 11, letterSpacing: '0.06em', lineHeight: `${RULE_H}px`, color: r.accent ? 'var(--color-accent)' : 'var(--color-text-muted)', textShadow: HALO }}
              >
                {r.text}
              </span>
            ))}
          </div>
        )}

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

      {/* ── index legend: the columns too narrow (or too short) to carry their name ── */}
      {layout && layout.legend.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono" style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-secondary)' }} aria-label={isEs ? 'Índice de columnas' : 'Column index'}>
          {layout.legend.map((l) => (
            <li key={`leg-${l.id}`} data-alz-legend-item data-name={l.name} className="inline-flex items-center gap-1.5" style={{ opacity: highlightSector && l.sectorCode !== highlightSector ? 0.4 : 1 }}>
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center tabular-nums"
                style={{ minWidth: BADGE_D, height: BADGE_D, padding: '0 3px', borderRadius: BADGE_D / 2, fontSize: 11, fontWeight: 600, lineHeight: 1, border: `1px solid ${SECTOR_COLORS[l.sectorCode] ?? SECTOR_COLORS.otros}`, color: 'var(--color-text-primary)' }}
              >
                {l.n}
              </span>
              <span>
                {l.name} · <span className="tabular-nums">{l.sharePct.toFixed(1)} %</span> ·{' '}
                <span className="tabular-nums" style={{ color: RISK_TEXT_COLORS[getRiskLevelFromScore(l.risk)], fontWeight: 600 }}>{Math.round(l.risk * 100)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── the cap's key ── */}
      {SHOW_TIER_CAP && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span>{isEs ? 'remate = nivel de riesgo' : 'cap = risk tier'}</span>
          {(['low', 'medium', 'high', 'critical'] as const).map((lvl) => (
            <span key={lvl} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" style={{ display: 'inline-block', width: 14, height: CAP_H, background: lvl === 'low' ? 'var(--color-text-muted)' : RISK_COLORS[lvl], opacity: lvl === 'low' ? 0.5 : 1 }} />
              {isEs ? RISK_LEVEL_ES[lvl] : lvl}
            </span>
          ))}
        </p>
      )}

      <p className="mt-3 font-mono" style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
        {isEs
          ? 'Cada columna: su ancho es su tajada del gasto acumulado; su alto, el indicador de riesgo medio sobre línea base cero. Las agujas son categorías de la cola con indicador alto, dibujadas en su posición real de gasto.'
          : "Each column: its width is its slice of cumulative spend; its height, the average risk indicator on a zero baseline. Needles are tail categories with a high indicator, drawn at their true spend position."}
      </p>

      <p className="mt-2 text-[12px] font-mono text-text-muted" aria-live="polite">
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

const RISK_LEVEL_ES = { low: 'bajo', medium: 'medio', high: 'alto', critical: 'crítico' } as const

// ── horizontal reference rule (risk threshold) — the label lives in the HTML layer ──

function HRule({ yPos, innerW, dashed }: { yPos: number; innerW: number; dashed?: boolean }) {
  return (
    <line aria-hidden="true" x1={0} x2={innerW} y1={yPos} y2={yPos} stroke="var(--color-border)" strokeWidth={1} strokeDasharray={dashed ? '4,4' : undefined} strokeOpacity={0.7} />
  )
}

// ── structural wall (½ / 80% concentration cut) — the label lives in the HTML layer ──

function StructuralWall({ xPos, innerH }: { xPos: number; innerH: number }) {
  return <line x1={xPos} x2={xPos} y1={0} y2={innerH} stroke="rgba(160, 104, 32, 0.7)" strokeWidth={2} aria-hidden="true" />
}
