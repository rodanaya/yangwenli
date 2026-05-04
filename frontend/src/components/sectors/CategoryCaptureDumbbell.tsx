/**
 * CategoryCaptureDumbbell — FT/Pudding Cleveland-pair: #1 vs #2 vendor share
 *
 * Implements docs/CATEGORIES_REDESIGN_PLAN.md § 5 HERO 2.
 *
 * Design decisions:
 * - Fan-out: one getTopVendors(catId, 2) per top-12-by-spend category.
 *   12 calls × 5 min cache = cheap after first load; no new backend endpoint needed.
 * - Y-axis: categories sorted by (share_top1 − share_top2) descending — gap is capture proxy.
 * - X-axis: vendor share of category spend [0%, 100%].
 * - #1 dot: filled r=7, SECTOR_COLORS[sector_code] at 0.95 opacity.
 * - #2 dot: open r=5, stroke = sector color, fill = background-elevated.
 * - Connector: 2px line, sector color at 0.4 opacity; thickness clamps 1.5–4px on total_value.
 * - Reference dashed line at 50%; "MERCADO CAPTURADO" pill when #1 share > 75%.
 * - Pull-quote on widest dumbbell (max gap row).
 * - Hover dims others to 0.4; tooltip shows both vendor chips, counts, value.
 * - Click dot → /vendors/:id via EntityIdentityChip semantics; click label → /categories/:id.
 * - Pure SVG; no recharts.
 *
 * Build: 2026-05-04-cat-p2
 */

import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { categoriesApi } from '@/api/client'
import { SECTOR_COLORS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { formatVendorName } from '@/lib/vendor/formatName'
import { formatCompactMXN } from '@/lib/utils'

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
}

interface Props {
  categories: CategoryDatum[]
}

// ── Layout constants ───────────────────────────────────────────────────────────

const LEFT_W = 180   // px reserved for category label column
const RIGHT_W = 88   // px reserved for "XX% vs YY%" numerics
const PILL_W = 130   // px for "MERCADO CAPTURADO" pill column (only when any row qualifies)
const ROW_H_DESKTOP = 36
const ROW_H_MOBILE = 30
const HEADER_H = 36
const FOOTER_H = 44

const MIN_SPEND_FILTER = 1_000_000_000 // 1B MXN — skip tiny categories
const MAX_ROWS = 12

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Connector thickness encodes category total_value; clamp 1.5–4px */
function connectorThickness(totalValue: number): number {
  // ~1B → 1.5px, ~100B → 4px; log scale
  const t = Math.log10(Math.max(totalValue, 1e9)) - 9 // 0 at 1B, ~2 at 100B
  return Math.max(1.5, Math.min(4, 1.5 + t * 1.25))
}

/** Truncate vendor name label for SVG text */
function truncateLabel(name: string, maxChars = 28): string {
  const formatted = formatVendorName(name)
  return formatted.length > maxChars ? formatted.slice(0, maxChars - 1) + '…' : formatted
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

  return (
    <div
      className="pointer-events-none fixed z-50 bg-background-elevated border border-border rounded-sm shadow-lg p-3 text-xs"
      style={{
        left: anchorX + 12,
        top: anchorY - 20,
        minWidth: 220,
        maxWidth: 300,
      }}
    >
      {/* Category */}
      <div className="font-mono text-[10px] uppercase tracking-wide text-text-muted mb-2">
        {isEs ? row.name_es : row.name_en}
      </div>

      {/* #1 vendor */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="font-bold text-[10px] font-mono uppercase tracking-wide"
          style={{ color: row.color }}
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
        <span className="ml-auto font-mono tabular-nums font-bold" style={{ color: row.color }}>
          {row.top1.market_share_pct.toFixed(1)}%
        </span>
      </div>
      <div className="text-text-muted font-mono tabular-nums text-[10px] mb-2 pl-6">
        {row.top1.contract_count} {isEs ? 'contratos' : 'contracts'} · {formatCompactMXN(row.top1.vendor_value)}
      </div>

      {/* #2 vendor */}
      {row.top2 && (
        <>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-bold text-[10px] font-mono uppercase tracking-wide text-text-muted">
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
          <div className="text-text-muted font-mono tabular-nums text-[10px] pl-6">
            {row.top2.contract_count} {isEs ? 'contratos' : 'contracts'} · {formatCompactMXN(row.top2.vendor_value)}
          </div>
        </>
      )}

      {/* Total */}
      <div className="mt-2 pt-2 border-t border-border font-mono tabular-nums text-[10px] text-text-muted">
        {isEs ? 'Mercado total:' : 'Total market:'} {formatCompactMXN(row.total_value)}
        {' · '}{row.total_contracts} {isEs ? 'contratos' : 'contracts'}
      </div>

      {/* Top-1 full name caption */}
      {top1Name.length > 28 && (
        <div className="mt-1 text-[10px] text-text-muted italic">{top1Name}</div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CategoryCaptureDumbbell({ categories }: Props) {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const isEs = i18n.language === 'es'
  const containerRef = useRef<HTMLDivElement>(null)

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
  const { data: captureRows, isLoading } = useQuery({
    queryKey: ['categories', 'capture-dumbbell', top12cats.map(c => c.category_id).join(',')],
    queryFn: async (): Promise<DumbbellRow[]> => {
      const results = await Promise.all(
        top12cats.map(cat => categoriesApi.getTopVendors(cat.category_id, 2))
      ) as CategoryTopVendorsResult[]

      return results
        .map((res, i): DumbbellRow | null => {
          const cat = top12cats[i]
          const top1 = res.data[0]
          const top2 = res.data[1] ?? null
          if (!top1) return null
          const gap = top1.market_share_pct - (top2?.market_share_pct ?? 0)
          const sectorCode = cat.sector_code ?? 'otros'
          return {
            category_id: cat.category_id,
            name_es: cat.name_es,
            name_en: cat.name_en,
            sector_code: sectorCode,
            color: SECTOR_COLORS[sectorCode] ?? '#64748b',
            total_value: res.total_value,
            total_contracts: res.total_contracts,
            top1,
            top2,
            gap,
          }
        })
        .filter((r): r is DumbbellRow => r !== null)
        // Sort by gap descending — widest dumbbell on top
        .sort((a, b) => b.gap - a.gap)
        .slice(0, MAX_ROWS)
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    enabled: top12cats.length > 0,
  })

  // ── Derived: widest gap index for the pull-quote ──────────────────────────
  const widestIdx = 0 // after sort-by-gap, index 0 is always the widest

  const hasCaptured = (captureRows ?? []).some(r => r.top1.market_share_pct > 75)

  // ── Layout: responsive row height ─────────────────────────────────────────
  // We can't directly measure window width in pure hooks without useLayoutEffect,
  // so we use a CSS variable trick. Instead, derive both heights and let SVG
  // respond via viewBox.
  const rows = captureRows ?? []
  const rowCount = rows.length
  const chartH_desktop = rowCount * ROW_H_DESKTOP + HEADER_H + FOOTER_H
  const chartH_mobile = rowCount * ROW_H_MOBILE + HEADER_H + FOOTER_H
  // The SVG viewBox uses desktop coords; CSS scales it responsively.
  const CHART_H = chartH_desktop

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const handleRowEnter = useCallback((idx: number, row: DumbbellRow, e: React.MouseEvent) => {
    setHoveredIdx(idx)
    setTooltip({ row, anchorX: e.clientX, anchorY: e.clientY })
  }, [])

  const handleRowLeave = useCallback(() => {
    setHoveredIdx(null)
    setTooltip(null)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tooltip) {
      setTooltip(prev => prev ? { ...prev, anchorX: e.clientX, anchorY: e.clientY } : null)
    }
  }, [tooltip])

  // ── Navigate helpers ──────────────────────────────────────────────────────
  const handleVendorClick = useCallback((vendorId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/vendors/${vendorId}`)
  }, [navigate])

  const handleCategoryClick = useCallback((categoryId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/categories/${categoryId}`)
  }, [navigate])

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading || !captureRows) {
    return (
      <div className="w-full animate-pulse">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
            <div className="h-3 bg-background-elevated rounded w-32" />
            <div className="flex-1 h-2 bg-background-elevated rounded" />
            <div className="h-3 bg-background-elevated rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="py-8 text-sm text-text-muted text-center">
        {isEs ? 'No hay datos de concentración disponibles.' : 'No concentration data available.'}
      </div>
    )
  }

  // ── SVG geometry ──────────────────────────────────────────────────────────
  // Total width is 100% of container. We draw in a fixed-width coordinate
  // system and let SVG scale. The right pill column is only appended when
  // any row has #1 share > 75%.
  const TOTAL_W = 900 // SVG coordinate width
  const pillColW = hasCaptured ? PILL_W : 0
  const barAreaW = TOTAL_W - LEFT_W - RIGHT_W - pillColW
  // X position for a share percentage (0–100)
  const xPos = (pct: number) => LEFT_W + (pct / 100) * barAreaW
  const xPct50 = xPos(50)

  return (
    <div
      ref={containerRef}
      className="w-full relative"
      onMouseMove={handleMouseMove}
    >
      {/* ── Responsive SVG wrapper ── */}
      {/* Desktop height via style; mobile via CSS override */}
      <div
        className="w-full overflow-visible"
        style={{ height: `clamp(${chartH_mobile}px, ${chartH_desktop}px, ${chartH_desktop}px)` }}
      >
        <svg
          viewBox={`0 0 ${TOTAL_W} ${CHART_H}`}
          width="100%"
          height="100%"
          aria-label={isEs ? 'Gráfica de captura de mercado: #1 vs #2 proveedor' : 'Market capture chart: #1 vs #2 vendor'}
          role="img"
        >
          {/* ── X-axis header labels ── */}
          {[0, 25, 50, 75, 100].map(pct => (
            <g key={pct}>
              <line
                x1={xPos(pct)}
                y1={HEADER_H - 8}
                x2={xPos(pct)}
                y2={CHART_H - FOOTER_H}
                stroke="currentColor"
                strokeWidth={0.5}
                strokeOpacity={0.12}
                className="text-text-muted"
              />
              <text
                x={xPos(pct)}
                y={HEADER_H - 14}
                textAnchor="middle"
                className="fill-current text-text-muted"
                style={{ fontSize: 10, fontFamily: 'var(--font-family-mono)', letterSpacing: '0.05em' }}
              >
                {pct}%
              </text>
            </g>
          ))}

          {/* ── 50% reference vertical dashed line ── */}
          <line
            x1={xPct50}
            y1={HEADER_H - 8}
            x2={xPct50}
            y2={CHART_H - FOOTER_H}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeOpacity={0.35}
            className="text-text-muted"
          />
          <text
            x={xPct50}
            y={CHART_H - FOOTER_H + 16}
            textAnchor="middle"
            className="fill-current text-text-muted"
            style={{ fontSize: 9.5, fontFamily: 'var(--font-family-mono)' }}
          >
            {isEs ? '50% del mercado' : '50% of market'}
          </text>

          {/* ── Row legend: #1 filled / #2 open ── */}
          <g transform={`translate(${LEFT_W}, ${CHART_H - FOOTER_H + 16})`}>
            <circle cx={0} cy={0} r={5} fill="#6b7280" fillOpacity={0.7} />
            <text
              x={8}
              y={4}
              className="fill-current text-text-muted"
              style={{ fontSize: 9, fontFamily: 'var(--font-family-mono)' }}
            >
              {isEs ? '#1 proveedor' : '#1 vendor'}
            </text>
            <circle cx={90} cy={0} r={4} fill="none" stroke="#6b7280" strokeWidth={1.5} />
            <text
              x={98}
              y={4}
              className="fill-current text-text-muted"
              style={{ fontSize: 9, fontFamily: 'var(--font-family-mono)' }}
            >
              {isEs ? '#2 proveedor' : '#2 vendor'}
            </text>
          </g>

          {/* ── Dumbbell rows ── */}
          {rows.map((row, idx) => {
            const rowY = HEADER_H + idx * ROW_H_DESKTOP
            const cy = rowY + ROW_H_DESKTOP / 2
            const x1 = xPos(row.top1.market_share_pct)
            const x2 = row.top2 ? xPos(row.top2.market_share_pct) : null
            const dimmed = hoveredIdx !== null && hoveredIdx !== idx
            const opacity = dimmed ? 0.25 : 1
            const isCaptured = row.top1.market_share_pct > 75
            const isWidest = idx === widestIdx
            const barThickness = connectorThickness(row.total_value)

            return (
              <g
                key={row.category_id}
                opacity={opacity}
                style={{ transition: 'opacity 0.15s ease', cursor: 'pointer' }}
                onMouseEnter={e => handleRowEnter(idx, row, e)}
                onMouseLeave={handleRowLeave}
                role="row"
                aria-label={`${isEs ? row.name_es : row.name_en}: ${row.top1.market_share_pct.toFixed(1)}% vs ${row.top2?.market_share_pct.toFixed(1) ?? 'N/A'}%`}
              >
                {/* Zebra background */}
                {idx % 2 === 1 && (
                  <rect
                    x={0}
                    y={rowY}
                    width={TOTAL_W}
                    height={ROW_H_DESKTOP}
                    fill="currentColor"
                    fillOpacity={0.025}
                    className="text-text-muted"
                  />
                )}

                {/* ── Category label (left column) ── */}
                <foreignObject
                  x={2}
                  y={rowY + 2}
                  width={LEFT_W - 6}
                  height={ROW_H_DESKTOP - 4}
                  onClick={e => handleCategoryClick(row.category_id, e as unknown as React.MouseEvent)}
                  style={{ cursor: 'pointer', overflow: 'visible' }}
                >
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <EntityIdentityChip
                      type="category"
                      id={row.category_id}
                      name={isEs ? row.name_es : row.name_en}
                      size="xs"
                      hideIcon
                    />
                  </div>
                </foreignObject>

                {/* ── Connector bar between #2 and #1 ── */}
                {x2 !== null && (
                  <line
                    x1={Math.min(x1, x2)}
                    y1={cy}
                    x2={Math.max(x1, x2)}
                    y2={cy}
                    stroke={row.color}
                    strokeWidth={barThickness}
                    strokeOpacity={0.4}
                    strokeLinecap="round"
                  />
                )}

                {/* ── #2 vendor dot (open circle) ── */}
                {row.top2 && x2 !== null && (
                  <circle
                    cx={x2}
                    cy={cy}
                    r={5}
                    fill="var(--color-background-elevated, #1c1c1e)"
                    stroke={row.color}
                    strokeWidth={1.5}
                    style={{ cursor: 'pointer' }}
                    onClick={e => handleVendorClick(row.top2!.vendor_id, e as unknown as React.MouseEvent)}
                    role="button"
                    aria-label={`${formatVendorName(row.top2.vendor_name)} — ${row.top2.market_share_pct.toFixed(1)}%`}
                  />
                )}

                {/* ── #1 vendor dot (filled circle) ── */}
                <circle
                  cx={x1}
                  cy={cy}
                  r={7}
                  fill={row.color}
                  fillOpacity={0.95}
                  style={{ cursor: 'pointer' }}
                  onClick={e => handleVendorClick(row.top1.vendor_id, e as unknown as React.MouseEvent)}
                  role="button"
                  aria-label={`${formatVendorName(row.top1.vendor_name)} — ${row.top1.market_share_pct.toFixed(1)}%`}
                />

                {/* ── #1 vendor name label (above-right of dot) ── */}
                <text
                  x={x1 + 10}
                  y={cy - 6}
                  className="fill-current text-text-primary"
                  style={{
                    fontSize: 9.5,
                    fontFamily: 'var(--font-family-mono)',
                    pointerEvents: 'none',
                  }}
                >
                  {truncateLabel(row.top1.vendor_name)}
                </text>

                {/* ── Right numerics: XX% vs YY% ── */}
                <text
                  x={LEFT_W + barAreaW + 8}
                  y={cy + 4}
                  className="fill-current text-text-secondary"
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-family-mono)',
                    letterSpacing: '0.03em',
                    pointerEvents: 'none',
                  }}
                >
                  <tspan fill={row.color} fontWeight="700">
                    {row.top1.market_share_pct.toFixed(0)}%
                  </tspan>
                  <tspan> vs </tspan>
                  <tspan>
                    {row.top2 ? row.top2.market_share_pct.toFixed(0) + '%' : 'N/A'}
                  </tspan>
                </text>

                {/* ── "MERCADO CAPTURADO" pill ── */}
                {isCaptured && hasCaptured && (
                  <g transform={`translate(${LEFT_W + barAreaW + RIGHT_W + 4}, ${cy - 9})`}>
                    <rect
                      x={0} y={0} width={PILL_W - 8} height={18}
                      rx={3}
                      fill="#dc2626"
                      fillOpacity={0.15}
                      stroke="#dc2626"
                      strokeWidth={0.75}
                    />
                    <text
                      x={(PILL_W - 8) / 2}
                      y={12}
                      textAnchor="middle"
                      fill="#dc2626"
                      style={{ fontSize: 8, fontFamily: 'var(--font-family-mono)', fontWeight: 700, letterSpacing: '0.08em' }}
                    >
                      {isEs ? 'MERCADO CAPTURADO' : 'MARKET CAPTURED'}
                    </text>
                  </g>
                )}

                {/* ── Pull-quote on widest dumbbell (index 0) ── */}
                {isWidest && (
                  <text
                    x={LEFT_W + 4}
                    y={rowY + ROW_H_DESKTOP - 4}
                    style={{
                      fontSize: 9,
                      fontFamily: 'var(--font-family-serif)',
                      fontStyle: 'italic',
                      pointerEvents: 'none',
                    }}
                    className="fill-current text-text-muted"
                  >
                    {isEs
                      ? `"Un solo proveedor controla el ${row.top1.market_share_pct.toFixed(0)}% de ${isEs ? row.name_es : row.name_en}"`
                      : `"One vendor controls ${row.top1.market_share_pct.toFixed(0)}% of ${row.name_en}"`
                    }
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── Tooltip (DOM, not SVG, for rich content) ── */}
      {tooltip && (
        <DumbbellTooltip data={tooltip} isEs={isEs} />
      )}
    </div>
  )
}
