/**
 * DescuadreSlope — § IV "EL DESCUADRE" of the /categories index. Replaces
 * RiskRankBand (not imported/extended — this is a from-scratch component
 * that happens to reuse the same drop-in signature `{items, lang}` and the
 * same self-contained section+kicker shape).
 *
 * Named precedent: FT Visual Vocabulary slope chart (ranking family) — two
 * vertical rank scales, one line per entity, the crossings are the finding.
 * Left scale = rank by total_value desc ("EN LIBROS" — the money book).
 * Right scale = rank by avg_risk desc ("EN EL ANAQUEL" — the indicator).
 *
 * Pool: qualified categories only (total_contracts >= CONTRACT_FLOOR). All
 * pool lines render as quiet 1px context (FT discipline: grey context +
 * selective ink) — never spaghetti. Ink is computed, never hardcoded: the 5
 * largest positive deltas (spendRank − riskRank — buried in the book, hot on
 * the shelf) get a 2px sector-colored line + a right-side EntityIdentityChip
 * label; the #1 spender's line gets ONE muted-ochre counter-annotation, the
 * same divergence read from the other end.
 *
 * EntityIdentityChip renders an <a> (react-router Link), so it can't live
 * inside <svg><text>. The chart is two layers over one relative container:
 * an absolutely-positioned <svg> draws the geometry (lines + rank numerals,
 * all decorative → aria-hidden), and a sibling layer of absolutely-positioned
 * HTML divs (chip + delta mono) sits at the same pixel coordinates for the
 * handful of labeled endpoints. Hex colours ONLY as direct SVG attributes
 * (stroke=/fill=) or via style={{color:hex}} on HTML text — never via
 * className (stripped). No green for low risk (Bible §3.10).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SECTOR_COLORS } from '@/lib/constants'
import type { CategorySummaryItem } from './types'
import { CONTRACT_FLOOR, intensityColor } from './types'

export interface DescuadreSlopeProps {
  items: CategorySummaryItem[]
  lang: 'en' | 'es'
}

const PLATE_H = 380
const HEADER_H = 20
const TOP_PAD = 22
const BOTTOM_PAD = 16
const LEFT_X = 14
const LABEL_COL_W = 216
const MIN_LABEL_GAP = 32
const INK_COUNT = 5

interface RankRow {
  item: CategorySummaryItem
  spendRank: number
  riskRank: number
  delta: number
}

function sectorFill(code: string): string {
  return SECTOR_COLORS[code] ?? SECTOR_COLORS.otros
}

/** Proportional rank → y within the plate's plotted band. n<=1 centers. */
function rankY(rank: number, n: number): number {
  if (n <= 1) return TOP_PAD + (PLATE_H - TOP_PAD - BOTTOM_PAD) / 2
  return TOP_PAD + ((rank - 1) / (n - 1)) * (PLATE_H - TOP_PAD - BOTTOM_PAD)
}

/**
 * Greedy vertical de-collision for the small cluster of right-side labels
 * (5 picks + 1 counter, max). Sorts by natural y, pushes down to keep a
 * minimum gap, then a reverse pass pulls back up if the push ran past the
 * bottom edge — keeps every label readable even when several picks share
 * a nearly-identical risk rank near the top of the shelf.
 */
function deconflict(anchors: { key: string; y: number }[], minGap: number): Map<string, number> {
  const sorted = [...anchors].sort((a, b) => a.y - b.y)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < minGap) sorted[i].y = sorted[i - 1].y + minGap
  }
  const maxY = PLATE_H - BOTTOM_PAD
  if (sorted.length > 0 && sorted[sorted.length - 1].y > maxY) {
    sorted[sorted.length - 1].y = maxY
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (sorted[i + 1].y - sorted[i].y < minGap) sorted[i].y = sorted[i + 1].y - minGap
    }
  }
  const out = new Map<string, number>()
  sorted.forEach((s) => out.set(s.key, s.y))
  return out
}

function counterText(counter: RankRow, isEs: boolean): string {
  return isEs
    ? `la más cara cae al №${counter.riskRank} por riesgo`
    : `the priciest falls to risk rank №${counter.riskRank}`
}

function Kicker({ isEs }: { isEs: boolean }) {
  return (
    <p
      className="font-mono mb-3.5"
      style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700 }}
    >
      § {isEs ? 'El descuadre · lo que el libro esconde' : 'The discrepancy · what the books hide'}
    </p>
  )
}

function Callout({ isEs }: { isEs: boolean }) {
  return (
    <p
      className="mt-3"
      style={{ fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'normal', fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}
    >
      {isEs
        ? 'Estas categorías pesan poco en el libro pero queman caliente en el indicador. El orden por valor las entierra; el descuadre las expone.'
        : 'These categories weigh little in the book but burn hot on the indicator. The value ranking buries them; the discrepancy exposes them.'}
    </p>
  )
}

function MobileRow({ row, isEs }: { row: RankRow; isEs: boolean }) {
  const { item, spendRank, riskRank, delta } = row
  const riskCol = intensityColor(item.avg_risk)
  return (
    <div
      role="listitem"
      className="grid items-center gap-x-3 py-2.5 border-b border-border last:border-b-0"
      style={{ gridTemplateColumns: '64px minmax(0,1fr) auto' }}
    >
      <div className="flex flex-col items-start">
        <span className="font-mono tabular-nums whitespace-nowrap" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
          {String(spendRank).padStart(2, '0')}→{String(riskRank).padStart(2, '0')}
        </span>
        <span className="font-mono whitespace-nowrap" style={{ fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
          {isEs ? `▲ ${delta} puestos` : `▲ ${delta} places`}
        </span>
      </div>
      <div className="min-w-0">
        <EntityIdentityChip
          type="category"
          id={item.category_id}
          name={isEs ? item.name_es : item.name_en}
          size="sm"
          sectorCode={item.sector_code}
        />
      </div>
      <div className="text-right">
        <div
          className="tabular-nums"
          style={{ fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif', fontStyle: 'normal', fontWeight: 800, fontSize: 18, lineHeight: 1, color: riskCol }}
        >
          {item.avg_risk.toFixed(2)}
        </div>
      </div>
    </div>
  )
}

export function DescuadreSlope({ items, lang }: DescuadreSlopeProps) {
  const isEs = lang === 'es'
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const isMobile = useIsMobile()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rightX = Math.max(LEFT_X + 120, width - LABEL_COL_W)

  const { rows, picks, counter } = useMemo(() => {
    const qualified = items.filter((c) => c.total_contracts >= CONTRACT_FLOOR)
    if (qualified.length === 0) {
      return { rows: [] as RankRow[], picks: [] as RankRow[], counter: null as RankRow | null }
    }
    const bySpend = [...qualified].sort((a, b) => b.total_value - a.total_value)
    const byRisk = [...qualified].sort((a, b) => b.avg_risk - a.avg_risk)
    const spendRankById = new Map(bySpend.map((c, i) => [c.category_id, i + 1]))
    const riskRankById = new Map(byRisk.map((c, i) => [c.category_id, i + 1]))
    const built: RankRow[] = qualified.map((item) => {
      const spendRank = spendRankById.get(item.category_id)!
      const riskRank = riskRankById.get(item.category_id)!
      return { item, spendRank, riskRank, delta: spendRank - riskRank }
    })
    const topPicks = built
      .filter((r) => r.delta > 0)
      .sort((a, b) => b.delta - a.delta || b.item.avg_risk - a.item.avg_risk)
      .slice(0, INK_COUNT)
    // The #1 spender always has delta <= 0 (spendRank=1 can never exceed
    // riskRank), so it never collides with the ink picks above.
    const topSpender = built.find((r) => r.spendRank === 1) ?? null
    return { rows: built, picks: topPicks, counter: topSpender }
  }, [items])

  const n = rows.length

  const labelYById = useMemo(() => {
    const anchors = [
      ...picks.map((p) => ({ key: `pick-${p.item.category_id}`, y: rankY(p.riskRank, n) })),
      ...(counter ? [{ key: `counter-${counter.item.category_id}`, y: rankY(counter.riskRank, n) }] : []),
    ]
    return deconflict(anchors, MIN_LABEL_GAP)
  }, [picks, counter, n])

  if (n === 0) return null

  const pickIds = new Set(picks.map((p) => p.item.category_id))

  if (isMobile) {
    return (
      <section aria-label={isEs ? 'El descuadre' : 'The discrepancy'} className="mb-6 pb-6 border-b border-border">
        <Kicker isEs={isEs} />
        <div role="list">
          {picks.map((p) => (
            <MobileRow key={p.item.category_id} row={p} isEs={isEs} />
          ))}
        </div>
        {counter && (
          <p className="mt-3 font-mono" style={{ fontSize: 12, color: 'var(--color-accent)' }}>
            {counterText(counter, isEs)}
          </p>
        )}
        <Callout isEs={isEs} />
      </section>
    )
  }

  return (
    <section aria-label={isEs ? 'El descuadre' : 'The discrepancy'} className="mb-6 pb-6 border-b border-border">
      <Kicker isEs={isEs} />

      <div ref={containerRef} className="relative w-full" style={{ height: HEADER_H + PLATE_H }}>
        {/* axis headers, positioned above each rank scale */}
        <span
          className="absolute font-mono uppercase"
          style={{ top: 0, left: LEFT_X, fontSize: 13, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}
        >
          {isEs ? 'en libros · por gasto' : 'in the books · by spend'}
        </span>
        <span
          className="absolute font-mono uppercase"
          style={{ top: 0, left: rightX, fontSize: 13, letterSpacing: '0.1em', color: 'var(--color-text-muted)' }}
        >
          {isEs ? 'en el anaquel · por riesgo' : 'on the shelf · by risk'}
        </span>

        <svg width={width} height={PLATE_H} className="absolute" style={{ top: HEADER_H, left: 0 }} aria-hidden="true">
          {/* rank scale endpoints */}
          <text x={LEFT_X} y={TOP_PAD - 8} fontFamily="var(--font-family-mono, monospace)" fontSize={13} fill="var(--color-text-muted)">№1</text>
          <text x={LEFT_X} y={PLATE_H - BOTTOM_PAD + 12} fontFamily="var(--font-family-mono, monospace)" fontSize={13} fill="var(--color-text-muted)">№{n}</text>
          <text x={rightX} y={TOP_PAD - 8} fontFamily="var(--font-family-mono, monospace)" fontSize={13} fill="var(--color-text-muted)">№1</text>
          <text x={rightX} y={PLATE_H - BOTTOM_PAD + 12} fontFamily="var(--font-family-mono, monospace)" fontSize={13} fill="var(--color-text-muted)">№{n}</text>

          {/* quiet context — every qualified category except the ink + counter */}
          {rows.map((r) => {
            if (pickIds.has(r.item.category_id) || r === counter) return null
            return (
              <line
                key={r.item.category_id}
                x1={LEFT_X} y1={rankY(r.spendRank, n)}
                x2={rightX} y2={rankY(r.riskRank, n)}
                stroke="var(--color-border)" strokeOpacity={0.35} strokeWidth={1}
              />
            )
          })}

          {/* counter-annotation — the #1 spender's line, read the other way */}
          {counter && (
            <line
              x1={LEFT_X} y1={rankY(counter.spendRank, n)}
              x2={rightX} y2={rankY(counter.riskRank, n)}
              stroke="var(--color-accent)" strokeOpacity={0.85} strokeWidth={1.5}
            />
          )}

          {/* the 5 inked crossings */}
          {picks.map((p) => (
            <line
              key={p.item.category_id}
              x1={LEFT_X} y1={rankY(p.spendRank, n)}
              x2={rightX} y2={rankY(p.riskRank, n)}
              stroke={sectorFill(p.item.sector_code)} strokeWidth={2}
            />
          ))}

          {/* endpoint dots */}
          {picks.map((p) => (
            <circle key={`d-${p.item.category_id}`} cx={rightX} cy={rankY(p.riskRank, n)} r={3} fill={sectorFill(p.item.sector_code)} />
          ))}
          {counter && <circle cx={rightX} cy={rankY(counter.riskRank, n)} r={3} fill="var(--color-accent)" />}
        </svg>

        {/* right-side HTML labels — chips can't live inside <svg> */}
        {picks.map((p) => {
          const y = HEADER_H + (labelYById.get(`pick-${p.item.category_id}`) ?? rankY(p.riskRank, n))
          return (
            <div key={p.item.category_id} className="absolute flex items-center gap-1.5" style={{ left: rightX + 10, top: y - 9 }}>
              <EntityIdentityChip
                type="category"
                id={p.item.category_id}
                name={isEs ? p.item.name_es : p.item.name_en}
                size="xs"
                sectorCode={p.item.sector_code}
              />
              <span className="font-mono tabular-nums whitespace-nowrap" style={{ fontSize: 13, color: sectorFill(p.item.sector_code) }}>
                {isEs ? `▲${p.delta} puestos` : `▲${p.delta} places`}
              </span>
            </div>
          )
        })}
        {counter && (
          <div
            className="absolute font-mono"
            style={{
              left: rightX + 10,
              top: HEADER_H + (labelYById.get(`counter-${counter.item.category_id}`) ?? rankY(counter.riskRank, n)) - 6,
              fontSize: 13,
              color: 'var(--color-accent)',
              maxWidth: LABEL_COL_W - 18,
              lineHeight: 1.3,
            }}
          >
            {counterText(counter, isEs)}
          </div>
        )}
      </div>

      <Callout isEs={isEs} />
    </section>
  )
}
