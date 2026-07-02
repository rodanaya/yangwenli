/**
 * InventarioAnaquel — § II "EL ANAQUEL" centerpiece of the /categories index
 * («El Inventario» redesign, Fable-remake track).
 *
 * Named precedent: NYT Upshot "How Much Hotter Is Your Hometown" — a one-axis
 * annotated dot strip with named callouts sitting directly on the chart;
 * named-outlier discipline borrowed from Reuters *Forever Pollution*. The
 * d3-force jitter recipe is cribbed from `components/sectors/RiskSpendBeeswarm.tsx`
 * (that component plots risk × log-spend on TWO axes and is retired from the
 * live /sectors surface — no collision importing its pattern here).
 *
 * One horizontal beeswarm, all 72 categories in a single view:
 *   X = avg_risk, data-driven domain (padded 6% — no dead gutters, Day-9 lesson).
 *   R = clamp(4, k·√total_value, 28) — dot AREA is money.
 *   Y = pure force-collide jitter around the midline (position carries no
 *       meaning beyond "not overlapping"); forceX pulls each node back to its
 *       risk position, forceY pulls toward the centerline, forceCollide keeps
 *       dots apart. ~60 ticks precomputed synchronously in a useMemo/useEffect
 *       pair — no animation, a static settled layout.
 *   Fill = SECTOR_COLORS[sector_code] @0.9, sub-floor rows (< CONTRACT_FLOOR
 *       contracts) render hollow + dashed and are excluded from callouts and
 *       from the inventory-mean tick.
 *
 * Reference geometry: RISK_THRESHOLDS.medium / .high render as vertical rules
 * ONLY if they fall inside the data-driven domain (edge case — a domain that
 * never reaches "high" happens for a well-behaved category set); a solid
 * ochre rule marks the qualified-pool mean.
 *
 * Named callouts are computed (never authored): top-5 by spend + top-3 by
 * risk (qualified pool, deduped, capped at 8), placed directly above their
 * dot with a straight 1px leader line. When two callouts would collide on
 * the same text row (their dots sit close in X), the later one is bumped up
 * a row — a small greedy VERTICAL de-collision, not a d3-force pass (8 labels
 * don't need one).
 *
 * Interaction: hover/focus a dot → floating CategoryHoverDossier (zero extra
 * fetch — it already renders from a summary row); click / Enter → navigate to
 * the dossier; ArrowLeft/ArrowRight cycle qualified dots in risk order (the
 * RiskSpendBeeswarm keyboard pattern). `highlightSector` dims non-matching
 * dots to 0.25 (wired to El Filtro's active sector chip by the page).
 *
 * Mobile (<768px): same beeswarm at 300px, callouts cut to top-3 spend +
 * top-2 risk, no floating hover card (tap navigates straight to the dossier).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  forceSimulation,
  forceX,
  forceY,
  forceCollide,
  type SimulationNodeDatum,
} from 'd3-force'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS, RISK_THRESHOLDS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { CategoryHoverDossier } from './CategoryHoverDossier'
import type { CategorySummaryItem } from './types'
import { CONTRACT_FLOOR } from './types'

// ── geometry ──────────────────────────────────────────────────────────────

const HEIGHT_DESKTOP = 440
const HEIGHT_MOBILE = 300
const MOBILE_BREAKPOINT = 768

const MARGIN_DESKTOP = { top: 100, right: 22, bottom: 42, left: 22 }
const MARGIN_MOBILE = { top: 56, right: 12, bottom: 32, left: 12 }

const AXIS_TICK_COUNT = 5
const CALLOUT_ROW_H = 15 // px between stacked label rows
const CALLOUT_MIN_GAP = 68 // px — min X spacing before a label bumps to the next row above

function clamp(min: number, val: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/** r = clamp(4, k·√value, 28) — k tuned so the single largest category hits r=28. */
function radiusForValue(value: number, maxValue: number): number {
  const k = maxValue > 0 ? 28 / Math.sqrt(maxValue) : 0
  return clamp(4, Math.sqrt(Math.max(0, value)) * k, 28)
}

function niceTicks(dMin: number, dMax: number, n: number): number[] {
  if (n <= 1) return [dMin]
  const ticks: number[] = []
  for (let i = 0; i < n; i++) ticks.push(dMin + ((dMax - dMin) * i) / (n - 1))
  return ticks
}

// ── simulation node ──────────────────────────────────────────────────────

interface BeeNode extends SimulationNodeDatum {
  item: CategorySummaryItem
  x0: number // fixed target x — the risk position
  r: number
  qualified: boolean
}

interface Pos {
  x: number
  y: number
}

interface CalloutLabel {
  item: CategorySummaryItem
  dotX: number
  dotY: number
  r: number
  labelY: number
}

/** Greedy vertical de-collision: labels default to row 0 (closest to the plot);
 *  when a label's X is too close to the last label already placed in a row,
 *  it bumps to the next row up. Sorted by X so neighbors are compared first. */
function layoutCalloutLabels(
  callouts: CategorySummaryItem[],
  posByCatId: Map<number, Pos>,
  radiusByCatId: Map<number, number>,
): CalloutLabel[] {
  const raw = callouts
    .map((item) => {
      const pos = posByCatId.get(item.category_id) ?? { x: 0, y: 0 }
      return { item, dotX: pos.x, dotY: pos.y, r: radiusByCatId.get(item.category_id) ?? 6 }
    })
    .sort((a, b) => a.dotX - b.dotX)

  const lastXByRow: number[] = []
  return raw.map((c) => {
    let row = 0
    while (lastXByRow[row] !== undefined && c.dotX - lastXByRow[row] < CALLOUT_MIN_GAP) row++
    lastXByRow[row] = c.dotX
    return { ...c, labelY: -8 - row * CALLOUT_ROW_H }
  })
}

// ── component ─────────────────────────────────────────────────────────────

export interface InventarioAnaquelProps {
  items: CategorySummaryItem[]
  lang: 'en' | 'es'
  highlightSector?: string | null
}

export function InventarioAnaquel({ items, lang, highlightSector }: InventarioAnaquelProps) {
  const isEs = lang === 'es'
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(960)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null)

  const isMobile = width < MOBILE_BREAKPOINT
  const height = isMobile ? HEIGHT_MOBILE : HEIGHT_DESKTOP
  const MARGIN = isMobile ? MARGIN_MOBILE : MARGIN_DESKTOP
  const innerW = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerH = Math.max(0, height - MARGIN.top - MARGIN.bottom)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // ── pools ─────────────────────────────────────────────────────────────
  const qualified = useMemo(() => items.filter((c) => c.total_contracts >= CONTRACT_FLOOR), [items])
  const subFloor = useMemo(() => items.filter((c) => c.total_contracts < CONTRACT_FLOOR), [items])

  // ── data-driven X domain over qualified rows, padded ~6% ──────────────
  const domain = useMemo<[number, number]>(() => {
    const pool = qualified.length > 0 ? qualified : items
    if (pool.length === 0) return [0, 1]
    const rawMin = Math.min(...pool.map((c) => c.avg_risk))
    const rawMax = Math.max(...pool.map((c) => c.avg_risk))
    const span = rawMax - rawMin || 0.01
    const pad = span * 0.06
    return [Math.max(0, rawMin - pad), rawMax + pad]
  }, [qualified, items])

  const xScale = useCallback(
    (risk: number) => {
      const [dMin, dMax] = domain
      const t = clamp(0, (risk - dMin) / (dMax - dMin || 1), 1)
      return t * innerW
    },
    [domain, innerW],
  )

  const maxValue = useMemo(() => Math.max(1, ...items.map((c) => c.total_value)), [items])

  // ── base nodes (fixed X target, radius, qualified flag) ────────────────
  const nodes = useMemo<BeeNode[]>(() => {
    return items.map((item) => {
      const x0 = xScale(item.avg_risk)
      return {
        item,
        x0,
        x: x0,
        y: innerH / 2,
        r: radiusForValue(item.total_value, maxValue),
        qualified: item.total_contracts >= CONTRACT_FLOOR,
      }
    })
  }, [items, xScale, maxValue, innerH])

  // ── d3-force jitter: forceX→risk position, forceY→centerline, forceCollide ─
  const [positions, setPositions] = useState<Pos[]>(() => nodes.map((n) => ({ x: n.x0, y: innerH / 2 })))

  useEffect(() => {
    if (nodes.length === 0) {
      setPositions([])
      return
    }
    const centerY = innerH / 2
    const simNodes: BeeNode[] = nodes.map((n) => ({ ...n, x: n.x0, y: centerY }))
    const sim = forceSimulation<BeeNode>(simNodes)
      .force('x', forceX<BeeNode>((d) => d.x0).strength(0.9))
      .force('y', forceY<BeeNode>(centerY).strength(0.05))
      .force('collide', forceCollide<BeeNode>((d) => d.r + 1.5).strength(0.9).iterations(3))
      .stop()
    for (let i = 0; i < 60; i++) sim.tick()
    setPositions(
      simNodes.map((n) => ({
        x: clamp(n.r, n.x ?? n.x0, innerW - n.r),
        y: clamp(n.r, n.y ?? centerY, innerH - n.r),
      })),
    )
  }, [nodes, innerH, innerW])

  const posByCatId = useMemo(() => {
    const map = new Map<number, Pos>()
    nodes.forEach((n, idx) => {
      const p = positions[idx]
      if (p) map.set(n.item.category_id, p)
    })
    return map
  }, [nodes, positions])

  const radiusByCatId = useMemo(() => {
    const map = new Map<number, number>()
    nodes.forEach((n) => map.set(n.item.category_id, n.r))
    return map
  }, [nodes])

  // ── reference geometry ──────────────────────────────────────────────────
  const [dMin, dMax] = domain
  const showMedium = RISK_THRESHOLDS.medium >= dMin && RISK_THRESHOLDS.medium <= dMax
  const showHigh = RISK_THRESHOLDS.high >= dMin && RISK_THRESHOLDS.high <= dMax

  const qualifiedMeanRisk = useMemo(() => {
    if (qualified.length === 0) return null
    return qualified.reduce((s, c) => s + c.avg_risk, 0) / qualified.length
  }, [qualified])

  const ticks = useMemo(() => niceTicks(dMin, dMax, AXIS_TICK_COUNT), [dMin, dMax])

  // ── keyboard cycling order (qualified dots, ascending risk) ─────────────
  const riskOrder = useMemo(() => [...qualified].sort((a, b) => a.avg_risk - b.avg_risk), [qualified])

  // ── named callouts, computed ────────────────────────────────────────────
  const calloutPool = useMemo(() => {
    const spendCount = isMobile ? 3 : 5
    const riskCount = isMobile ? 2 : 3
    const bySpend = [...qualified].sort((a, b) => b.total_value - a.total_value).slice(0, spendCount)
    const byRisk = [...qualified].sort((a, b) => b.avg_risk - a.avg_risk).slice(0, riskCount)
    const seen = new Set<number>()
    const combined: CategorySummaryItem[] = []
    for (const c of [...bySpend, ...byRisk]) {
      if (!seen.has(c.category_id)) {
        seen.add(c.category_id)
        combined.push(c)
      }
    }
    return combined.slice(0, 8)
  }, [qualified, isMobile])

  const calloutLabels = useMemo(
    () => layoutCalloutLabels(calloutPool, posByCatId, radiusByCatId),
    [calloutPool, posByCatId, radiusByCatId],
  )

  // ── computed editorial deck sentence ────────────────────────────────────
  const deck = useMemo(() => {
    const top5 = [...qualified].sort((a, b) => b.total_value - a.total_value).slice(0, 5)
    const top3 = [...qualified].sort((a, b) => b.avg_risk - a.avg_risk).slice(0, 3)
    const totalValueAll = items.reduce((s, c) => s + c.total_value, 0)
    const avgIndicatorTop5 = top5.length > 0 ? top5.reduce((s, c) => s + c.avg_risk, 0) / top5.length : 0
    const top3Value = top3.reduce((s, c) => s + c.total_value, 0)
    const pctTop3 = totalValueAll > 0 ? (top3Value / totalValueAll) * 100 : 0
    return { n5: top5.length, n3: top3.length, avgIndicatorTop5, pctTop3 }
  }, [qualified, items])

  // ── hover / focus / active dot ──────────────────────────────────────────
  const focusedItem = focusedIdx !== null ? riskOrder[focusedIdx] ?? null : null
  const activeId = hoveredId ?? focusedItem?.category_id ?? null
  const activeItem = activeId !== null ? items.find((c) => c.category_id === activeId) ?? null : null

  const spendRankById = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.total_value - a.total_value)
    const map = new Map<number, number>()
    sorted.forEach((c, idx) => map.set(c.category_id, idx + 1))
    return map
  }, [items])

  const totalValueAll = useMemo(() => items.reduce((s, c) => s + c.total_value, 0), [items])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIdx((prev) => (prev === null ? 0 : Math.min(prev + 1, riskOrder.length - 1)))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIdx((prev) => (prev === null ? riskOrder.length - 1 : Math.max(prev - 1, 0)))
      } else if (e.key === 'Enter' && focusedItem) {
        navigate(`/categories/${focusedItem.category_id}`)
      } else if (e.key === 'Escape') {
        setFocusedIdx(null)
      }
    },
    [riskOrder, focusedItem, navigate],
  )

  // ── floating hover card placement (edge-flip, pointer-events-none) ─────
  const activePos = activeItem ? posByCatId.get(activeItem.category_id) : null
  const activeR = activeItem ? radiusByCatId.get(activeItem.category_id) ?? 6 : 6
  const cardWidth = 288
  let cardLeft = 0
  let cardTop: number | undefined
  let cardBottom: number | undefined
  if (activePos) {
    const screenX = MARGIN.left + activePos.x
    const screenY = MARGIN.top + activePos.y
    cardLeft = clamp(8, screenX - cardWidth / 2, Math.max(8, width - cardWidth - 8))
    if (screenY < height / 2) {
      cardTop = screenY + activeR + 10
    } else {
      cardBottom = height - screenY + activeR + 10
    }
  }

  return (
    <section aria-label={isEs ? 'El anaquel' : 'The shelf'}>
      <p
        className="font-mono mb-3.5"
        style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}
      >
        § {isEs ? 'El anaquel · el tamaño no es el riesgo' : 'The shelf · size is not risk'}
      </p>

      <p
        className="mb-4"
        style={{ fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif', fontStyle: 'italic', fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}
      >
        {isEs
          ? `Las ${deck.n5} categorías más caras promedian ${deck.avgIndicatorTop5.toFixed(2)} de indicador; las ${deck.n3} más calientes, juntas, no llegan al ${deck.pctTop3.toFixed(1)}% del gasto.`
          : `The ${deck.n5} priciest categories average ${deck.avgIndicatorTop5.toFixed(2)} on the indicator; the ${deck.n3} hottest, combined, don't reach ${deck.pctTop3.toFixed(1)}% of spend.`}
      </p>

      <div className="relative" ref={containerRef} style={{ width: '100%' }}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={
            isEs
              ? 'Diagrama de enjambre: las 72 categorías por indicador de riesgo, área proporcional al gasto'
              : 'Beeswarm chart: all 72 categories by risk indicator, area proportional to spend'
          }
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onBlur={() => setFocusedIdx(null)}
          style={{ outline: 'none', display: 'block', margin: '0 auto' }}
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {/* ── reference rules ─────────────────────────────────────── */}
            {showMedium && (
              <ReferenceRule
                x={xScale(RISK_THRESHOLDS.medium)}
                innerH={innerH}
                label={isEs ? `MEDIO ${(RISK_THRESHOLDS.medium * 100).toFixed(0)}` : `MEDIUM ${(RISK_THRESHOLDS.medium * 100).toFixed(0)}`}
              />
            )}
            {showHigh && (
              <ReferenceRule
                x={xScale(RISK_THRESHOLDS.high)}
                innerH={innerH}
                label={isEs ? `ALTO ${(RISK_THRESHOLDS.high * 100).toFixed(0)}` : `HIGH ${(RISK_THRESHOLDS.high * 100).toFixed(0)}`}
              />
            )}
            {qualifiedMeanRisk !== null && (
              <g aria-hidden="true">
                <line
                  x1={xScale(qualifiedMeanRisk)}
                  x2={xScale(qualifiedMeanRisk)}
                  y1={0}
                  y2={innerH}
                  stroke="var(--color-accent)"
                  strokeWidth={1}
                  strokeOpacity={0.55}
                />
                <text
                  x={xScale(qualifiedMeanRisk) + 4}
                  y={innerH + (isMobile ? 12 : 14)}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontSize={isMobile ? 8 : 9}
                  fill="var(--color-accent)"
                  fillOpacity={0.85}
                >
                  {isEs ? 'media del inventario' : 'inventory mean'}
                </text>
              </g>
            )}

            {/* ── dots ─────────────────────────────────────────────────── */}
            {nodes.map((node, idx) => {
              const pos = positions[idx] ?? { x: node.x0, y: innerH / 2 }
              const color = SECTOR_COLORS[node.item.sector_code] ?? SECTOR_COLORS.otros
              const isActive = activeId === node.item.category_id
              const isDimmedByFocus = activeId !== null && !isActive
              const isDimmedBySector = !!highlightSector && node.item.sector_code !== highlightSector
              const opacity = isDimmedBySector ? 0.25 : isDimmedByFocus ? 0.35 : 1
              const label = isEs ? node.item.name_es : node.item.name_en

              return (
                <circle
                  key={node.item.category_id}
                  cx={pos.x}
                  cy={pos.y}
                  r={node.r}
                  fill={node.qualified ? color : 'none'}
                  fillOpacity={node.qualified ? 0.9 : 0}
                  stroke={node.qualified ? 'var(--color-background)' : color}
                  strokeWidth={node.qualified ? 1 : 1.25}
                  strokeDasharray={node.qualified ? undefined : '2,2'}
                  style={{ opacity, transition: 'opacity 0.15s', cursor: 'pointer' }}
                  role="button"
                  tabIndex={-1}
                  aria-label={`${label} — ${(node.item.avg_risk * 100).toFixed(1)}% ${isEs ? 'riesgo' : 'risk'}, ${formatCompactMXN(node.item.total_value)}, ${formatNumber(node.item.total_contracts)} ${isEs ? 'contratos' : 'contracts'}`}
                  onMouseEnter={() => setHoveredId(node.item.category_id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => navigate(`/categories/${node.item.category_id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/categories/${node.item.category_id}`)
                    }
                  }}
                />
              )
            })}

            {/* ── callout labels + leader lines ───────────────────────── */}
            {calloutLabels.map((c) => {
              const color = SECTOR_TEXT_COLORS[c.item.sector_code] ?? SECTOR_TEXT_COLORS.otros
              const label = isEs ? c.item.name_es : c.item.name_en
              const anchor = c.dotX < 48 ? 'start' : c.dotX > innerW - 48 ? 'end' : 'middle'
              return (
                <g key={`callout-${c.item.category_id}`} aria-hidden="true">
                  <line
                    x1={c.dotX}
                    y1={c.labelY + 3}
                    x2={c.dotX}
                    y2={c.dotY - c.r - 2}
                    stroke={color}
                    strokeWidth={0.75}
                    strokeOpacity={0.45}
                  />
                  <text
                    x={c.dotX}
                    y={c.labelY}
                    textAnchor={anchor}
                    fontFamily="var(--font-family-mono, monospace)"
                    fontSize={9.5}
                    fill={color}
                    style={{ userSelect: 'none' }}
                  >
                    {label}
                  </text>
                </g>
              )
            })}

            {/* ── X axis ───────────────────────────────────────────────── */}
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--color-border)" strokeWidth={0.75} aria-hidden="true" />
            {ticks.map((t, i) => {
              const x = xScale(t)
              return (
                <g key={i} aria-hidden="true">
                  <line x1={x} x2={x} y1={innerH} y2={innerH + 4} stroke="var(--color-border)" strokeWidth={0.75} />
                  <text
                    x={x}
                    y={innerH + 16}
                    textAnchor="middle"
                    fontFamily="var(--font-family-mono, monospace)"
                    fontSize={9}
                    fill="var(--color-text-muted)"
                    fillOpacity={0.7}
                  >
                    {(t * 100).toFixed(0)}
                  </text>
                </g>
              )
            })}
            <text
              x={innerW / 2}
              y={innerH + (isMobile ? 26 : 32)}
              textAnchor="middle"
              fontFamily="var(--font-family-mono, monospace)"
              fontSize={9}
              fill="var(--color-text-muted)"
              fillOpacity={0.6}
              letterSpacing="0.1em"
              aria-hidden="true"
            >
              {isEs ? 'INDICADOR ×100 →' : 'RISK INDICATOR ×100 →'}
            </text>
          </g>
        </svg>

        {!isMobile && activeItem && activePos && (
          <div
            className="hidden md:block pointer-events-none absolute z-20 rounded-md border border-border bg-background-card p-3 shadow-xl"
            style={{ left: cardLeft, width: cardWidth, ...(cardTop !== undefined ? { top: cardTop } : { bottom: cardBottom }) }}
          >
            <CategoryHoverDossier
              item={activeItem}
              rank={spendRankById.get(activeItem.category_id) ?? 1}
              totalValue={totalValueAll}
              lang={lang}
            />
          </div>
        )}
      </div>

      <p className="mt-3 font-mono" style={{ fontSize: 10.5, lineHeight: 1.5, color: 'var(--color-text-muted)' }}>
        {isEs
          ? 'Cada círculo, un anaquel; su área, el valor en libros; su posición, el indicador de riesgo medio. Los anaqueles huecos no alcanzan muestra clasificable.†'
          : "Each circle, a shelf; its area, the value on the books; its position, the average risk indicator. Hollow shelves don't reach a classifiable sample.†"}
      </p>
      {subFloor.length > 0 && (
        <p
          className="mt-1"
          style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic', fontSize: 11, lineHeight: 1.45, color: 'var(--color-text-secondary)' }}
        >
          {isEs
            ? '† muestra < 200 contratos — indicador no clasificable'
            : '† sample < 200 contracts — indicator not classifiable'}
        </p>
      )}

      <p className="mt-2 text-[10px] font-mono text-text-muted opacity-60" aria-live="polite">
        {focusedItem
          ? (isEs
              ? `${focusedItem.name_es} seleccionado — Enter para investigar`
              : `${focusedItem.name_en} selected — Enter to investigate`)
          : (isEs
              ? '← → navegar anaqueles · Enter para abrir · clic en círculo'
              : '← → navigate shelves · Enter to open · click circle')}
      </p>
    </section>
  )
}

// ── reference rule (vertical dashed threshold line) ────────────────────────

function ReferenceRule({ x, innerH, label }: { x: number; innerH: number; label: string }) {
  return (
    <g aria-hidden="true">
      <line
        x1={x}
        x2={x}
        y1={0}
        y2={innerH}
        stroke="var(--color-border)"
        strokeWidth={1}
        strokeDasharray="4,4"
        strokeOpacity={0.7}
      />
      <text
        x={x + 4}
        y={12}
        fontFamily="var(--font-family-mono, monospace)"
        fontSize={9}
        fill="var(--color-text-muted)"
        fillOpacity={0.75}
        letterSpacing="0.08em"
      >
        {label}
      </text>
    </g>
  )
}
