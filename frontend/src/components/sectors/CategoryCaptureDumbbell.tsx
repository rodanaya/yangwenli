/**
 * CategoryCaptureDumbbell — FT/Pudding Cleveland-pair: #1 vs #2 vendor share
 *
 * Implements docs/CATEGORIES_REDESIGN_PLAN.md § 5 HERO 2.
 *
 * Design decisions:
 * - Fan-out: one getTopVendors(catId, 2) per top-12-by-spend category.
 *   12 calls × 5 min cache = cheap after first load; no new backend endpoint needed.
 * - Y-axis: categories sorted by #1-vendor share descending.
 * - X-axis: vendor share of category spend on a data-driven domain.
 * - #1 dot: filled r=7, SECTOR_COLORS[sector_code] at 0.95 opacity.
 * - #2 dot: open r=5, stroke = sector color, fill = background-elevated.
 * - Connector: sector color at 0.4 opacity; thickness clamps 1.5–4px on total_value.
 * - Hover (or keyboard focus) dims others to 0.25; tooltip shows both vendor
 *   chips, counts, value.
 *
 * PARALLAX D7 § Change 5 — 1:1 with HTML glyphs. The old 900-unit viewBox was
 * scaled by CSS, so on a phone every label rendered at ~4.5px. Now: the width
 * is measured (useMeasuredWidth), each row is an HTML grid, the middle cell
 * holds a 1:1 svg with only the connector + the two dots (aria-hidden), and
 * every glyph is HTML: the category chip, the #1 vendor chip (a real link, full
 * name, never truncated), the numerics, the axis, the ceiling label and the
 * legend. The #2 vendor stays reachable through an sr-only span and the
 * tooltip, which also opens on keyboard focus.
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/api/client'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { formatVendorName } from '@/lib/vendor/formatName'
import { formatCompactMXN } from '@/lib/utils'
import { useMeasuredWidth, useFontsReady } from '@/hooks/useMeasuredWidth'
import { measureLabel } from '@/lib/plateLabels'

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Run an array of async tasks with at most `concurrency` in flight at once.
 * Returns a `Promise.allSettled`-shaped array so individual failures (502/503/
 * timeout) don't void the whole batch.
 */
async function throttledAllSettled<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let cursor = 0
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++
      try {
        const value = await tasks[i]()
        results[i] = { status: 'fulfilled', value }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker)
  await Promise.all(workers)
  return results
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface CategoryDatum {
  category_id: number
  name_es: string
  name_en: string
  sector_id: number | null
  sector_code: string | null
  total_value: number
  total_contracts: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
  top_vendor: { id: number; name: string } | null
  top_institution: { id: number; name: string } | null
}

interface VendorRow {
  vendor_id: number
  vendor_name: string
  contract_count: number
  vendor_value: number
  market_share_pct: number
  avg_risk: number
  direct_award_pct: number
  single_bid_pct: number
}

interface CategoryTopVendorsResult {
  category_id: number
  category_name: string
  total_value: number
  total_contracts: number
  hhi: number
  concentration_label: string
  top3_share_pct: number
  data: VendorRow[]
}

interface DumbbellRow {
  category_id: number
  name_es: string
  name_en: string
  sector_code: string
  color: string
  total_value: number
  total_contracts: number
  top1: VendorRow
  top2: VendorRow | null
  gap: number // share_top1 - share_top2 in %
  top3_share_pct: number // #1+#2+#3 combined share — surfaced in the tooltip
  hhi: number
}

interface Props {
  categories: CategoryDatum[]
}

// ── Layout constants ───────────────────────────────────────────────────────────

const LABEL_W = 190     // px — category chip column (≥ STACK_BELOW)
const NUM_W = 96        // px — "14% / 4%" numerics column
const NUM_W_STACKED = 76
const COL_GAP = 12
const STACK_BELOW = 560 // container px under which the label sits above the track
const DOT_H = 20        // px — the 1:1 svg strip that holds connector + dots
const TRACK_PAD = 8     // px — keeps the r=7 dot inside the track at 0% / max

// Skeleton geometry = the loaded figure's (measured at 1440/390, D7b § Change 8):
// anchor stat + axis header, 12 rows, ceiling/legend/honesty footer.
const SKEL_HEADER_H = 77
const SKEL_ROW_H = 44
const SKEL_FOOTER_H = 109
// Stacked (< STACK_BELOW): the anchor sentence wraps and each row carries its
// label on its own line — 1,217px measured at 390.
const SKEL_HEADER_H_STACKED = 95
const SKEL_ROW_H_STACKED = 81
const SKEL_FOOTER_H_STACKED = 150

const MIN_SPEND_FILTER = 1_000_000_000 // 1B MXN — skip tiny categories
const MAX_ROWS = 12

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Connector thickness encodes category total_value; clamp 1.5–4px */
function connectorThickness(totalValue: number): number {
  // ~1B → 1.5px, ~100B → 4px; log scale
  const t = Math.log10(Math.max(totalValue, 1e9)) - 9 // 0 at 1B, ~2 at 100B
  return Math.max(1.5, Math.min(4, 1.5 + t * 1.25))
}

/** The body sans stack, for measuring the vendor chip (text-xs font-medium). */
function chipFont(): string {
  if (typeof document === 'undefined') return '500 12px sans-serif'
  return `500 12px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

interface TooltipData {
  row: DumbbellRow
  anchorX: number
  anchorY: number
}

function DumbbellTooltip({ data, isEs }: { data: TooltipData; isEs: boolean }) {
  const { row, anchorX, anchorY } = data
  const top1Name = formatVendorName(row.top1.vendor_name)
  const textColor = SECTOR_TEXT_COLORS[row.sector_code] ?? 'var(--color-text-primary)'

  return (
    <div
      // A pointer-less preview: inert, so Tab never lands in its chips.
      inert
      className="pointer-events-none fixed z-50 bg-background-elevated border border-border rounded-sm shadow-lg p-3 text-xs"
      style={{
        left: anchorX + 12,
        top: anchorY - 20,
        minWidth: 220,
        maxWidth: 300,
      }}
    >
      {/* Category */}
      <div className="font-mono text-[12px] uppercase tracking-wide text-text-muted mb-2">
        {isEs ? row.name_es : row.name_en}
      </div>

      {/* #1 vendor */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="font-bold text-[12px] font-mono uppercase tracking-wide"
          style={{ color: textColor }}
        >
          #1
        </span>
        <EntityIdentityChip
          type="vendor"
          id={row.top1.vendor_id}
          name={row.top1.vendor_name}
          size="xs"
          hideIcon
        />
        <span className="ml-auto font-mono tabular-nums font-bold" style={{ color: textColor }}>
          {row.top1.market_share_pct.toFixed(1)}%
        </span>
      </div>
      <div className="text-text-muted font-mono tabular-nums text-[12px] mb-2 pl-6">
        {row.top1.contract_count} {isEs ? 'contratos' : 'contracts'} · {formatCompactMXN(row.top1.vendor_value)}
      </div>

      {/* #2 vendor */}
      {row.top2 && (
        <>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-bold text-[12px] font-mono uppercase tracking-wide text-text-muted">
              #2
            </span>
            <EntityIdentityChip
              type="vendor"
              id={row.top2.vendor_id}
              name={row.top2.vendor_name}
              size="xs"
              hideIcon
            />
            <span className="ml-auto font-mono tabular-nums text-text-secondary">
              {row.top2.market_share_pct.toFixed(1)}%
            </span>
          </div>
          <div className="text-text-muted font-mono tabular-nums text-[12px] pl-6">
            {row.top2.contract_count} {isEs ? 'contratos' : 'contracts'} · {formatCompactMXN(row.top2.vendor_value)}
          </div>
        </>
      )}

      {/* Total */}
      <div className="mt-2 pt-2 border-t border-border font-mono tabular-nums text-[12px] text-text-muted">
        {isEs ? 'Mercado total:' : 'Total market:'} {formatCompactMXN(row.total_value)}
        {' · '}{row.total_contracts} {isEs ? 'contratos' : 'contracts'}
      </div>

      {/* Top-3 combined + HHI — the fragmentation reading on inspection */}
      {row.top3_share_pct > 0 && (
        <div className="mt-1 font-mono tabular-nums text-[12px] text-text-muted">
          {isEs ? 'Top-3 combinado:' : 'Top-3 combined:'} {row.top3_share_pct.toFixed(0)}%
          {row.hhi > 0 && <>{' · HHI '}{Math.round(row.hhi)}</>}
        </div>
      )}

      {/* Top-1 full name caption */}
      {top1Name.length > 28 && (
        <div className="mt-1 text-[12px] text-text-secondary">{top1Name}</div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CategoryCaptureDumbbell({ categories }: Props) {
  const { i18n } = useTranslation()
  const isEs = i18n.language === 'es'
  const containerRef = useRef<HTMLDivElement>(null)
  const W = useMeasuredWidth(containerRef)
  // The two faces this figure measures with: the vendor chip's sans and the
  // 13px mono of the ceiling label (D7b § Change 8).
  const measuredFaces = useMemo(() => {
    const mono = typeof document === 'undefined'
      ? 'monospace'
      : getComputedStyle(document.documentElement).getPropertyValue('--font-family-mono').trim() || 'monospace'
    return [chipFont(), `13px ${mono}`]
  }, [])
  const fontsReady = useFontsReady(measuredFaces)

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  // ── Step 1: select top-12-by-spend categories that pass the 1B MXN filter ──
  const top12cats = useMemo(() => {
    return [...categories]
      .filter(c => c.total_value >= MIN_SPEND_FILTER)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, MAX_ROWS)
  }, [categories])

  // ── Step 2: fan-out getTopVendors(catId, 2) for each of the 12 categories ──
  // Uses allSettled + a 3-at-a-time concurrency throttle so a single 502
  // from one category doesn't void the whole chart, AND so we don't open
  // 12 simultaneous connections that contributed to the harness 502 cluster.
  const { data: captureRows, isLoading } = useQuery({
    queryKey: ['categories', 'capture-dumbbell', top12cats.map(c => c.category_id).join(',')],
    queryFn: async (): Promise<DumbbellRow[]> => {
      const results = await throttledAllSettled(
        top12cats.map(cat => () => categoriesApi.getTopVendors(cat.category_id, 2)),
        3, // max 3 concurrent requests
      )

      return results
        .map((res, i): DumbbellRow | null => {
          const cat = top12cats[i]
          // Skip categories whose request failed (502/503/timeout).
          if (res.status !== 'fulfilled') return null
          const cats = res.value as CategoryTopVendorsResult
          const top1 = cats.data[0]
          const top2 = cats.data[1] ?? null
          if (!top1) return null
          const gap = top1.market_share_pct - (top2?.market_share_pct ?? 0)
          const sectorCode = cat.sector_code ?? 'otros'
          return {
            category_id: cat.category_id,
            name_es: cat.name_es,
            name_en: cat.name_en,
            sector_code: sectorCode,
            color: SECTOR_COLORS[sectorCode] ?? SECTOR_COLORS.otros,
            total_value: cats.total_value,
            total_contracts: cats.total_contracts,
            top1,
            top2,
            gap,
            top3_share_pct: cats.top3_share_pct ?? 0,
            hhi: cats.hhi ?? 0,
          }
        })
        .filter((r): r is DumbbellRow => r !== null)
        // Sort by #1-vendor share descending — most-concentrated leader on top,
        // matching the "how concentrated is the leader" reading of the reframe.
        .sort((a, b) => b.top1.market_share_pct - a.top1.market_share_pct)
        .slice(0, MAX_ROWS)
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    enabled: top12cats.length > 0,
  })

  // ── Derived ───────────────────────────────────────────────────────────────
  const rows = useMemo(() => captureRows ?? [], [captureRows])
  // Data-driven x-domain. Real category #1-vendor shares top out at ~14%
  // (federal categories span thousands of vendors); the old 0–100% axis wasted
  // ~75% of the width and propped up a "market captured" story the data refutes.
  // Bind the domain to the observed max (≥20% floor, snapped to a clean /5 tick)
  // so the dots fill the track and the 4–14% differences read.
  const maxTop1 = rows.length ? Math.max(...rows.map(r => r.top1.market_share_pct)) : 14
  const domainMax = Math.max(20, Math.ceil((maxTop1 * 1.15) / 5) * 5)
  // "the leader holds barely 1 peso in N" — computed, never hardcoded.
  const fragDenom = Math.max(2, Math.round(100 / Math.max(maxTop1, 1)))

  // ── Measured geometry: 1 svg unit = 1 px ──────────────────────────────────
  const stacked = W > 0 && W < STACK_BELOW
  const numW = stacked ? NUM_W_STACKED : NUM_W
  const trackW = Math.max(0, stacked ? W - numW - COL_GAP : W - LABEL_W - numW - 2 * COL_GAP)
  const gridTemplateColumns = stacked
    ? `minmax(0,1fr) ${numW}px`
    : `${LABEL_W}px minmax(0,1fr) ${numW}px`
  const xPos = useCallback(
    (pct: number) => TRACK_PAD + (pct / domainMax) * Math.max(0, trackW - 2 * TRACK_PAD),
    [domainMax, trackW],
  )
  const xCeiling = xPos(maxTop1) // the observed concentration ceiling
  const ticks = Array.from({ length: Math.floor(domainMax / 5) + 1 }, (_, i) => i * 5)

  // #1 vendor label side: right of the dot when it fits the track, else left
  // of it (so it never runs into the numerics column); when neither side fits
  // it takes the roomier side and wraps.
  const labelSides = useMemo(() => {
    const font = chipFont()
    return rows.map((row) => {
      const x1 = xPos(row.top1.market_share_pct)
      const nameW = (fontsReady ? measureLabel(formatVendorName(row.top1.vendor_name), font, Number.POSITIVE_INFINITY, 16).width : 0) + 12
      const right = trackW - (x1 + 11)
      const left = x1 - 11
      return nameW <= right || (nameW > left && right >= left) ? 'right' as const : 'left' as const
    })
  }, [rows, xPos, trackW, fontsReady])

  // ── Mouse + keyboard handlers ─────────────────────────────────────────────
  const openTooltip = useCallback((idx: number, row: DumbbellRow, x: number, y: number) => {
    setHoveredIdx(idx)
    setTooltip({ row, anchorX: x, anchorY: y })
  }, [])

  const closeTooltip = useCallback(() => {
    setHoveredIdx(null)
    setTooltip(null)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tooltip) {
      setTooltip(prev => prev ? { ...prev, anchorX: e.clientX, anchorY: e.clientY } : null)
    }
  }, [tooltip])

  // The ceiling label ends 4px left of the dashed ceiling (measured in the
  // resolved mono face once the fonts are in).
  const ceilingText = isEs ? `techo de concentración · ${maxTop1.toFixed(0)}%` : `concentration ceiling · ${maxTop1.toFixed(0)}%`
  const monoStack = useMemo(
    () => (fontsReady && typeof document !== 'undefined'
      ? getComputedStyle(document.documentElement).getPropertyValue('--font-family-mono').trim() || 'monospace'
      : 'monospace'),
    [fontsReady],
  )
  const ceilingW = measureLabel(ceilingText, `13px ${monoStack}`, Number.POSITIVE_INFINITY, 16).width

  // Loading skeleton / empty state render INSIDE the measured wrapper, so the
  // ResizeObserver is attached from the first paint (useMeasuredWidth observes
  // once, on mount).
  const skeleton = (
    <div className="w-full animate-pulse" aria-hidden="true">
      <div style={{ height: stacked ? SKEL_HEADER_H_STACKED : SKEL_HEADER_H }} />
      {Array.from({ length: MAX_ROWS }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border last:border-b-0" style={{ height: stacked ? SKEL_ROW_H_STACKED : SKEL_ROW_H }}>
          <div className="h-3 bg-background-elevated rounded w-32" />
          <div className="flex-1 h-2 bg-background-elevated rounded" />
          <div className="h-3 bg-background-elevated rounded w-16" />
        </div>
      ))}
      <div style={{ height: stacked ? SKEL_FOOTER_H_STACKED : SKEL_FOOTER_H }} />
    </div>
  )
  const empty = (
    <div className="py-8 text-sm text-text-muted text-center">
      {isEs ? 'No hay datos de concentración disponibles.' : 'No concentration data available.'}
    </div>
  )

  // Gridlines + the dashed ceiling, drawn behind a track cell (a mark layer).
  const gridLayer = (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {ticks.map(pct => (
        <span
          key={pct}
          className="absolute inset-y-0"
          style={{ left: xPos(pct), width: 1, background: 'var(--color-text-muted)', opacity: 0.12 }}
        />
      ))}
      <span
        className="absolute inset-y-0"
        style={{ left: xCeiling, width: 0, borderLeft: '1px dashed var(--color-text-muted)', opacity: 0.4 }}
      />
    </div>
  )

  const monoStyle: React.CSSProperties = { fontFamily: 'var(--font-family-mono)' }

  return (
    <div
      ref={containerRef}
      className="w-full relative"
      onMouseMove={handleMouseMove}
    >
      {isLoading || !captureRows ? skeleton : rows.length === 0 ? empty : (<>
      {/* Anchor stat — the sharpest thesis on the page: the most dominant vendor
          in ANY federal category holds barely 1 peso in N. Computed from the live
          max, never hardcoded, so it stays honest across rescores. */}
      <div className="flex items-baseline gap-3 mb-3">
        <span
          className="tabular-nums shrink-0"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'normal',
            fontWeight: 800,
            fontSize: 38,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            color: 'var(--color-accent)',
          }}
        >
          {maxTop1.toFixed(0)}%
        </span>
        <span className="text-[13px] leading-snug text-text-secondary" style={{ maxWidth: '46ch' }}>
          {isEs
            ? `el proveedor más dominante de cualquier categoría federal controla apenas 1 peso de cada ${fragDenom} — el resto se reparte entre miles`
            : `the most dominant vendor in any federal category controls barely 1 peso in ${fragDenom} — the rest splits across thousands`}
        </span>
      </div>

      <div
        className="w-full"
        role="list"
        aria-label={isEs ? `Concentración de proveedores por categoría: participación #1 vs #2, máx. ${maxTop1.toFixed(0)}%` : `Vendor concentration by category: #1 vs #2 share, max ${maxTop1.toFixed(0)}%`}
      >
        {W > 0 && (
          <>
            {/* ── Axis header (data-driven ticks every 5%) ── */}
            <div className="grid" style={{ gridTemplateColumns, columnGap: COL_GAP }} aria-hidden="true">
              {!stacked && <span />}
              <div className="relative h-5">
                {ticks.map((pct, i) => (
                  <span
                    key={pct}
                    className="absolute top-0 tabular-nums text-text-muted"
                    style={{
                      ...monoStyle,
                      left: xPos(pct),
                      transform: i === 0 ? 'translateX(-25%)' : i === ticks.length - 1 ? 'translateX(-85%)' : 'translateX(-50%)',
                      fontSize: 12,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {pct}%
                  </span>
                ))}
              </div>
              <span />
            </div>

            {/* ── Dumbbell rows ── */}
            {rows.map((row, idx) => {
              const x1 = xPos(row.top1.market_share_pct)
              const x2 = row.top2 ? xPos(row.top2.market_share_pct) : null
              const cy = DOT_H / 2
              const dimmed = hoveredIdx !== null && hoveredIdx !== idx
              const side = labelSides[idx]
              const catName = isEs ? row.name_es : row.name_en
              return (
                <div
                  key={row.category_id}
                  role="listitem"
                  className="grid items-center even:bg-background-elevated/60"
                  style={{
                    gridTemplateColumns,
                    columnGap: COL_GAP,
                    opacity: dimmed ? 0.25 : 1,
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={e => openTooltip(idx, row, e.clientX, e.clientY)}
                  onMouseLeave={closeTooltip}
                  onFocusCapture={e => {
                    const r = (e.target as HTMLElement).getBoundingClientRect()
                    openTooltip(idx, row, r.right, r.top + r.height / 2)
                  }}
                  onBlurCapture={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) closeTooltip()
                  }}
                >
                  {/* Category label — full name (wraps; never truncated) */}
                  <div className="min-w-0 py-0.5" style={stacked ? { gridColumn: '1 / -1' } : undefined}>
                    <EntityIdentityChip
                      type="category"
                      id={row.category_id}
                      name={catName}
                      size="sm"
                      hideIcon
                      fullName
                      className="inline-flex w-auto"
                    />
                  </div>

                  {/* Track: #1 vendor chip (a real link) above the 1:1 dumbbell */}
                  <div className="relative self-stretch flex flex-col justify-center min-w-0">
                    {gridLayer}
                    <div
                      className="relative flex"
                      style={side === 'right'
                        ? { justifyContent: 'flex-start', paddingLeft: Math.min(x1 + 11, Math.max(0, trackW - 40)) }
                        : { justifyContent: 'flex-end', paddingRight: Math.max(0, trackW - (x1 - 11)) }}
                    >
                      <EntityIdentityChip
                        type="vendor"
                        id={row.top1.vendor_id}
                        name={row.top1.vendor_name}
                        size="sm"
                        hideIcon
                        fullName
                        className="inline-flex w-auto"
                      />
                    </div>
                    <svg width={trackW} height={DOT_H} viewBox={`0 0 ${trackW} ${DOT_H}`} className="relative block" aria-hidden="true">
                      {x2 !== null && (
                        <line
                          x1={Math.min(x1, x2)}
                          y1={cy}
                          x2={Math.max(x1, x2)}
                          y2={cy}
                          stroke={row.color}
                          strokeWidth={connectorThickness(row.total_value)}
                          strokeOpacity={0.4}
                          strokeLinecap="round"
                        />
                      )}
                      {x2 !== null && (
                        <circle cx={x2} cy={cy} r={5} fill="var(--color-background-elevated)" stroke={row.color} strokeWidth={1.5} />
                      )}
                      <circle cx={x1} cy={cy} r={7} fill={row.color} fillOpacity={0.95} />
                    </svg>
                    {row.top2 && (
                      <span className="sr-only">
                        {`#2 ${formatVendorName(row.top2.vendor_name)} · ${row.top2.market_share_pct.toFixed(1)}%`}
                      </span>
                    )}
                  </div>

                  {/* Numerics: #1 share (sector text twin) / #2 share */}
                  <div className="tabular-nums whitespace-nowrap text-text-secondary" style={{ ...monoStyle, fontSize: 13, letterSpacing: '0.03em' }}>
                    <span className="sr-only">{isEs ? '#1 y #2: ' : '#1 and #2: '}</span>
                    <span style={{ color: SECTOR_TEXT_COLORS[row.sector_code] ?? 'var(--color-text-primary)', fontWeight: 700 }}>
                      {row.top1.market_share_pct.toFixed(0)}%
                    </span>
                    {' / '}
                    {row.top2 ? row.top2.market_share_pct.toFixed(0) + '%' : 'N/A'}
                  </div>
                </div>
              )
            })}

            {/* ── Ceiling label + legend (HTML, under the stack) ── */}
            <div className="grid mt-1" style={{ gridTemplateColumns, columnGap: COL_GAP }} aria-hidden="true">
              {!stacked && <span />}
              <div className="min-w-0 space-y-1" style={{ ...monoStyle, fontSize: 13 }}>
                <div className="text-text-muted whitespace-nowrap" style={{ paddingLeft: Math.max(0, xCeiling - 4 - ceilingW) }}>
                  {ceilingText}
                </div>
                <div className="flex items-center gap-4 text-text-muted" style={{ paddingLeft: TRACK_PAD }}>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: 'var(--color-text-muted)', opacity: 0.7 }} />
                    {isEs ? '#1 proveedor' : '#1 vendor'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block rounded-full" style={{ width: 8, height: 8, border: '1.5px solid var(--color-text-muted)' }} />
                    {isEs ? '#2 proveedor' : '#2 vendor'}
                  </span>
                </div>
              </div>
              <span />
            </div>
          </>
        )}
      </div>

      {/* Honesty guard — fragmentation is not a clean bill of health. */}
      <p className="mt-2 font-mono leading-relaxed text-text-muted" style={{ fontSize: 13 }}>
        {isEs
          ? 'Concentración baja no certifica integridad — un cártel puede operar repartiendo lotes entre varias firmas; esto mide dispersión, no riesgo.'
          : 'Low concentration does not certify integrity — a cartel can operate by splitting lots across firms; this measures dispersion, not risk.'}
      </p>

      {/* ── Tooltip (DOM, not SVG, for rich content) ── */}
      {tooltip && (
        <DumbbellTooltip data={tooltip} isEs={isEs} />
      )}
      </>)}
    </div>
  )
}
