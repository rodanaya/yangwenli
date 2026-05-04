/**
 * SectorTreemap — HERO 1 of the Sectors redesign (Phase P3)
 *
 * Squarified treemap where:
 *   area    = total_value_mxn
 *   fill    = SECTOR_COLORS[code] at opacity 0.35 + 0.55 × clamp((risk − 0.10) / 0.30, 0, 1)
 *   border  = 1px border-border default; amber-500 1.5px when direct_award_pct > 25
 *
 * Annotations:
 *   • OCDE ✗ chip in corner of cells crossing the 25% OECD threshold
 *   • Editorial pull-arrow on Agricultura cell with Segalmex caveat
 *
 * Interactivity:
 *   • Hover dims others to 30% opacity; hovered cell stroke → 2px
 *   • Tooltip shows 6 KPIs + "Ver hilo →" link
 *   • Click → /sectors/:id
 *   • Keyboard: Tab through cells in spend order, Enter to navigate
 *
 * Plan: docs/SECTORS_REDESIGN_PLAN.md §5 HERO 1
 * Build: 2026-05-04-p3
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from 'd3-hierarchy'
import { SECTOR_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import type { SectorStatistics } from '@/api/types'

// ── hex helpers ───────────────────────────────────────────────────────────────

/** Parse a 6-digit hex (#rrggbb) into [r, g, b] 0-255 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** Compute fill rgba for a treemap cell */
function cellFill(sectorCode: string, avgRiskScore: number): string {
  const baseHex = SECTOR_COLORS[sectorCode] ?? '#64748b'
  const [r, g, b] = hexToRgb(baseHex)
  const clamped = Math.max(0, Math.min(1, (avgRiskScore - 0.10) / 0.30))
  const opacity = 0.35 + 0.55 * clamped
  return `rgba(${r},${g},${b},${opacity.toFixed(3)})`
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipData {
  sector: SectorStatistics
  x: number
  y: number
}

function Tooltip({
  data,
  lang,
  onLink,
}: {
  data: TooltipData
  lang: string
  onLink: () => void
}) {
  const s = data.sector
  const daPct = s.direct_award_pct ?? 0
  const riskLevel = getRiskLevelFromScore(s.avg_risk_score)
  const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'

  // Risk color (no green — text-text-muted for low, same as bible §3.10)
  const riskTextColor =
    riskLevel === 'critical' ? '#ef4444'
    : riskLevel === 'high'   ? '#f59e0b'
    : riskLevel === 'medium' ? '#a16207'
    : '#71717a'  // low → muted, not green

  const rows = [
    { label: lang === 'es' ? 'Gasto total'       : 'Total spend',       value: formatCompactMXN(s.total_value_mxn) },
    { label: lang === 'es' ? 'Contratos'          : 'Contracts',         value: formatNumber(s.total_contracts) },
    { label: lang === 'es' ? 'Proveedores'        : 'Vendors',           value: formatNumber(s.total_vendors ?? 0) },
    { label: lang === 'es' ? 'Adj. directa'       : 'Direct award',      value: `${daPct.toFixed(1)}%` },
    { label: lang === 'es' ? 'Lic. única'         : 'Single bid',        value: `${(s.single_bid_pct ?? 0).toFixed(1)}%` },
    { label: lang === 'es' ? 'Indicador de riesgo': 'Risk indicator',    value: `${(s.avg_risk_score * 100).toFixed(1)}%`, color: riskTextColor },
  ]

  // Position: try to keep inside SVG container by nudging left/up when near right/bottom.
  const tipW = 220
  const tipH = 210
  const left = data.x + tipW > window.innerWidth - 32 ? data.x - tipW - 8 : data.x + 12
  const top  = data.y + tipH > window.innerHeight - 32 ? data.y - tipH - 8 : data.y + 12

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 select-none rounded border border-[color:var(--color-border)] bg-[color:var(--color-background-card)] shadow-lg"
      style={{ left, top, width: tipW }}
    >
      {/* Sector color strip */}
      <div className="h-1 w-full rounded-t" style={{ backgroundColor: color }} />
      <div className="px-3 py-2.5">
        <p
          className="text-[11px] font-mono font-bold uppercase tracking-[0.15em] mb-2"
          style={{ color }}
        >
          {s.sector_name || s.sector_code}
        </p>
        <div className="space-y-1">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[color:var(--color-text-muted)]">{row.label}</span>
              <span
                className="text-[11px] font-mono tabular-nums font-bold"
                style={{ color: row.color ?? 'var(--color-text-primary)' }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <button
          onPointerDown={onLink}
          className="pointer-events-auto mt-2.5 w-full text-left text-[11px] font-mono font-bold uppercase tracking-[0.12em] underline"
          style={{ color }}
        >
          {lang === 'es' ? 'Ver perfil →' : 'View profile →'}
        </button>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface SectorTreemapProps {
  sectors: SectorStatistics[]
}

export function SectorTreemap({ sectors }: SectorTreemapProps) {
  const { i18n } = useTranslation('sectors')
  const lang = i18n.language
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [focusedIdx, setFocusedIdx] = useState<number>(-1)

  // Responsive width measurement
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const w = el.getBoundingClientRect().width
      if (w < 10) return
      const h = w < 640 ? 360 : 480
      setDims({ w: Math.floor(w), h })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Sort by spend descending — the dominant visual order
  const sorted = useMemo(
    () => [...sectors].sort((a, b) => b.total_value_mxn - a.total_value_mxn),
    [sectors],
  )

  // d3-hierarchy treemap layout.
  // We use a discriminated union so TypeScript knows leaf data is SectorStatistics.
  type TreeDatum = { children?: SectorStatistics[] } | SectorStatistics

  const nodes = useMemo((): HierarchyRectangularNode<TreeDatum>[] => {
    if (!dims || sorted.length === 0) return []
    const rootDatum: TreeDatum = { children: sorted }
    const root = hierarchy<TreeDatum>(rootDatum, (d) =>
      'children' in d && Array.isArray((d as { children?: SectorStatistics[] }).children)
        ? (d as { children?: SectorStatistics[] }).children
        : undefined,
    )
      .sum((d) => ('total_value_mxn' in d ? (d as SectorStatistics).total_value_mxn : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const layout = treemap<TreeDatum>()
      .tile(treemapSquarify)
      .size([dims.w, dims.h])
      .padding(2)
      .round(true)

    layout(root)

    return root.leaves() as HierarchyRectangularNode<TreeDatum>[]
  }, [dims, sorted])

  const handleNavigate = useCallback(
    (sectorId: number) => {
      navigate(`/sectors/${sectorId}`)
    },
    [navigate],
  )

  // Keyboard: Tab cycles through nodes in spend order (already sorted above)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, sectorId: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleNavigate(sectorId)
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIdx((prev) => Math.min(prev + 1, nodes.length - 1))
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIdx((prev) => Math.max(prev - 1, 0))
      }
    },
    [handleNavigate, nodes.length],
  )

  // Scroll focused element into view
  const cellRefs = useRef<Map<number, SVGGElement>>(new Map())
  useEffect(() => {
    if (focusedIdx >= 0) {
      const el = cellRefs.current.get(focusedIdx)
      el?.focus()
    }
  }, [focusedIdx])

  if (!dims || nodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full bg-[color:var(--color-background-elevated)] rounded"
        style={{ height: 480 }}
        aria-label="Loading treemap"
      />
    )
  }

  // Find agriculture cell for caveat arrow.
  // Leaves always carry SectorStatistics data (root node with `children` is excluded).
  const agriNode = nodes.find((n) => (n.data as unknown as SectorStatistics).sector_code === 'agricultura')

  return (
    <div ref={containerRef} className="w-full relative select-none" style={{ height: dims.h }}>
      <svg
        width={dims.w}
        height={dims.h}
        role="list"
        aria-label={lang === 'es' ? 'Mapa de sectores por gasto' : 'Sector spend treemap'}
        className="block overflow-visible"
      >
        {nodes.map((node, idx) => {
          const s = node.data as unknown as SectorStatistics
          const x0 = node.x0!
          const y0 = node.y0!
          const x1 = node.x1!
          const y1 = node.y1!
          const w = x1 - x0
          const h = y1 - y0
          const fill = cellFill(s.sector_code, s.avg_risk_score)
          const daPct = s.direct_award_pct ?? 0
          const isOECDViolator = daPct > 25
          const isHovered = hoveredId === s.sector_id
          const isAnyHovered = hoveredId !== null
          const opacity = isAnyHovered && !isHovered ? 0.3 : 1
          const strokeColor = isOECDViolator ? '#f59e0b' : 'var(--color-border)'
          const strokeWidth = isHovered ? 2 : isOECDViolator ? 1.5 : 1

          const showLabel = w > 80 && h > 40
          const showChip = w > 55 && h > 30 && isOECDViolator

          // Sector display name: use sector_name from API, fallback to code
          const displayName = s.sector_name || s.sector_code
          const spendLabel = formatCompactMXN(s.total_value_mxn)
          const isAgri = s.sector_code === 'agricultura'
          const sectorColor = SECTOR_COLORS[s.sector_code] ?? '#64748b'

          return (
            <g
              key={s.sector_id}
              ref={(el) => {
                if (el) cellRefs.current.set(idx, el)
                else cellRefs.current.delete(idx)
              }}
              role="listitem"
              tabIndex={0}
              aria-label={`${displayName} — ${spendLabel}, ${lang === 'es' ? 'adj. directa' : 'direct award'} ${daPct.toFixed(0)}%`}
              style={{ opacity, cursor: 'pointer', outline: 'none' }}
              onPointerEnter={(e) => {
                setHoveredId(s.sector_id)
                setTooltip({ sector: s, x: e.clientX, y: e.clientY })
              }}
              onPointerMove={(e) => {
                setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)
              }}
              onPointerLeave={() => {
                setHoveredId(null)
                setTooltip(null)
              }}
              onClick={() => handleNavigate(s.sector_id)}
              onKeyDown={(e) => handleKeyDown(e, s.sector_id)}
              onFocus={() => setFocusedIdx(idx)}
            >
              {/* Cell background */}
              <rect
                x={x0}
                y={y0}
                width={w}
                height={h}
                fill={fill}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
              />

              {/* Cell label */}
              {showLabel && (
                <>
                  <text
                    x={x0 + 8}
                    y={y0 + 18}
                    fontSize={Math.min(13, Math.max(9, w / 9))}
                    fontWeight={700}
                    fontFamily="var(--font-family-sans)"
                    fill="var(--color-text-primary)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {displayName}
                  </text>
                  <text
                    x={x0 + 8}
                    y={y0 + 33}
                    fontSize={Math.min(11, Math.max(8, w / 12))}
                    fontFamily="var(--font-family-mono)"
                    fill="var(--color-text-secondary)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {spendLabel}
                  </text>
                </>
              )}

              {/* OCDE ✗ chip — top-right corner */}
              {showChip && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={x1 - 42}
                    y={y0 + 4}
                    width={38}
                    height={14}
                    rx={2}
                    fill="rgba(245,158,11,0.15)"
                    stroke="#f59e0b"
                    strokeWidth={0.75}
                  />
                  <text
                    x={x1 - 23}
                    y={y0 + 14}
                    fontSize={8}
                    fontWeight={700}
                    fontFamily="var(--font-family-mono)"
                    textAnchor="middle"
                    fill="#f59e0b"
                  >
                    OCDE ✗
                  </text>
                </g>
              )}

              {/* Focus ring */}
              {focusedIdx === idx && (
                <rect
                  x={x0 + 1}
                  y={y0 + 1}
                  width={w - 2}
                  height={h - 2}
                  fill="none"
                  stroke={sectorColor}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Agricultura: caveat connector dot */}
              {isAgri && w > 40 && h > 20 && (
                <circle
                  cx={x0 + 10}
                  cy={y1 - 10}
                  r={3}
                  fill="#f59e0b"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </g>
          )
        })}

        {/* Editorial pull-arrow on Agricultura cell */}
        {agriNode && (() => {
          const _s = agriNode.data as unknown as SectorStatistics
          void _s // data only used for type-check; coords come from agriNode directly
          const x0 = agriNode.x0!
          const y0 = agriNode.y0!
          const x1 = agriNode.x1!
          const y1 = agriNode.y1!
          const cellW = x1 - x0
          const cellH = y1 - y0
          if (cellW < 40 || cellH < 20) return null

          // Anchor dot position (bottom-left of cell)
          const dotX = x0 + 10
          const dotY = y1 - 10

          // Callout box: try to place it below the cell, or above if near bottom
          const calloutX = Math.max(4, Math.min(dims.w - 232, x0))
          const calloutY = y1 + 8 > dims.h - 60 ? y0 - 70 : y1 + 8
          const calloutW = Math.min(228, dims.w - calloutX - 4)
          const calloutH = 58

          // Leader line end (top-center of callout)
          const leaderEndX = calloutX + calloutW / 2
          const leaderEndY = calloutY

          const es = lang === 'es'
          const caveatText = es
            ? 'Score inflado por Segalmex/GT → ver /thread/segalmex'
            : 'Score inflated by Segalmex GT case → see /thread/segalmex'
          const caveatLabel = es ? 'Artefacto · Segalmex' : 'Artifact · Segalmex'

          // Determine if line goes up or down from dot
          const lineGoesUp = calloutY < dotY

          return (
            <g key="agri-caveat" style={{ pointerEvents: 'none' }}>
              {/* Leader line */}
              <line
                x1={dotX}
                y1={dotY}
                x2={leaderEndX}
                y2={lineGoesUp ? leaderEndY + calloutH : leaderEndY}
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="3 2"
                opacity={0.7}
              />
              {/* Arrow head */}
              <polygon
                points={`${dotX - 3},${lineGoesUp ? dotY - 4 : dotY + 4} ${dotX + 3},${lineGoesUp ? dotY - 4 : dotY + 4} ${dotX},${lineGoesUp ? dotY - 9 : dotY + 9}`}
                fill="#f59e0b"
                opacity={0.8}
              />
              {/* Callout box */}
              <rect
                x={calloutX}
                y={calloutY}
                width={calloutW}
                height={calloutH}
                rx={3}
                fill="var(--color-background-card)"
                stroke="#f59e0b"
                strokeWidth={1}
                opacity={0.95}
              />
              <text
                x={calloutX + 8}
                y={calloutY + 14}
                fontSize={8}
                fontWeight={700}
                fontFamily="var(--font-family-mono)"
                textAnchor="start"
                fill="#f59e0b"
              >
                {caveatLabel.toUpperCase()}
              </text>
              {/* Word-wrap the caveat text into two lines max */}
              <text
                x={calloutX + 8}
                y={calloutY + 28}
                fontSize={9}
                fontFamily="var(--font-family-sans)"
                fill="var(--color-text-secondary)"
              >
                {caveatText.length > 45 ? (
                  <>
                    <tspan x={calloutX + 8} dy={0}>{caveatText.slice(0, 44)}</tspan>
                    <tspan x={calloutX + 8} dy={12}>{caveatText.slice(44)}</tspan>
                  </>
                ) : (
                  caveatText
                )}
              </text>
              {/* Segalmex link hint */}
              <text
                x={calloutX + 8}
                y={calloutY + 52}
                fontSize={8}
                fontFamily="var(--font-family-mono)"
                fill="#f59e0b"
                textDecoration="underline"
              >
                {es ? 'Ver hilo Segalmex →' : 'See Segalmex thread →'}
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Tooltip — rendered outside SVG as a fixed HTML overlay */}
      {tooltip && (
        <Tooltip
          data={tooltip}
          lang={lang}
          onLink={() => handleNavigate(tooltip.sector.sector_id)}
        />
      )}
    </div>
  )
}
