/**
 * CategorySectorSwimlane — Pudding/NYT-vocabulary swimlane beeswarm
 *
 * Implements docs/CATEGORIES_REDESIGN_PLAN.md § 5 HERO 1.
 *
 * Design decisions:
 * - 12 horizontal lanes, one per sector, ordered by total category spend desc.
 * - X-axis: avg_risk × 100, domain [0, 40], shared across all lanes.
 * - Dot radius: clamp(3, sqrt(total_value / 1e8) × 0.6, 14).
 * - Force-collide (d3-force) for per-lane y-jitter so dots don't overlap.
 * - Cyan reference line at 25 (RISK_THRESHOLDS.medium × 100 = high-risk boundary).
 * - Top-3 risk labels via simple text anchors; Segalmex outlier connector annotation.
 * - Hover: scale 1.4×, dim others 0.35. Click: navigate to /categories/:id.
 * - Pure SVG; no recharts.
 * - d3-force installed 2026-05-04 via npm install d3-force @types/d3-force.
 *
 * Build: 2026-05-04-cat-p1
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as d3force from 'd3-force'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS, SECTORS, RISK_THRESHOLDS } from '@/lib/constants'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import { formatVendorName } from '@/lib/vendor/formatName'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface CategoryDatum {
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
  top_vendor: { id: number; name: string } | null
  top_institution: { id: number; name: string } | null
}

interface SimNode extends CategoryDatum {
  x: number
  y: number
  r: number
  laneIdx: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const LANE_H_DESKTOP = 36
const LANE_H_MOBILE = 28
const LABEL_W = 100  // left margin for lane labels
const RIGHT_PAD = 24
const TOP_PAD = 48   // space for x-axis tick labels
const BOTTOM_PAD = 20
const DOMAIN_MIN = 0
const DOMAIN_MAX = 40  // avg_risk × 100
const OECD_CYAN = '#22d3ee'
const HIGH_THRESHOLD = RISK_THRESHOLDS.medium * 100  // 25

// Segalmex is the rightmost Agricultura outlier — identified by sector_code
const SEGALMEX_SECTOR = 'agricultura'

// ── Helpers ────────────────────────────────────────────────────────────────────

function dotRadius(totalValue: number): number {
  const r = Math.sqrt(totalValue / 1e8) * 0.6
  return Math.max(3, Math.min(14, r))
}

function xScale(risk: number, width: number): number {
  const chartW = width - LABEL_W - RIGHT_PAD
  return LABEL_W + ((risk * 100 - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN)) * chartW
}

// ── Swimlane ───────────────────────────────────────────────────────────────────

interface CategorySectorSwimlaneProps {
  categories: CategoryDatum[]
}

export function CategorySectorSwimlane({ categories }: CategorySectorSwimlaneProps) {
  const { i18n } = useTranslation('sectors')
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{
    cat: CategoryDatum
    x: number
    y: number
  } | null>(null)
  const [simulatedNodes, setSimulatedNodes] = useState<SimNode[]>([])
  const [hoveredLane, setHoveredLane] = useState<string | null>(null)

  const isMobile = width < 640
  const laneH = isMobile ? LANE_H_MOBILE : LANE_H_DESKTOP
  const totalHeight = SECTORS.length * laneH + TOP_PAD + BOTTOM_PAD

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Build lane order: sectors sorted by total category spend desc
  const laneOrder = useMemo(() => {
    const spendBySector: Record<string, number> = {}
    for (const cat of categories) {
      const code = cat.sector_code ?? 'otros'
      spendBySector[code] = (spendBySector[code] ?? 0) + cat.total_value
    }
    return [...SECTORS].sort(
      (a, b) => (spendBySector[b.code] ?? 0) - (spendBySector[a.code] ?? 0)
    )
  }, [categories])

  // Run force simulation once categories or width changes
  useEffect(() => {
    if (!categories.length || width < 100) return

    const nodes: SimNode[] = categories.map(cat => {
      const code = cat.sector_code ?? 'otros'
      const laneIdx = laneOrder.findIndex(s => s.code === code)
      const safeIdx = laneIdx === -1 ? laneOrder.length - 1 : laneIdx
      const laneCenter = TOP_PAD + safeIdx * laneH + laneH / 2
      return {
        ...cat,
        x: xScale(cat.avg_risk, width),
        y: laneCenter,
        r: dotRadius(cat.total_value),
        laneIdx: safeIdx,
      }
    })

    const sim = d3force.forceSimulation(nodes)
      .force('x', d3force.forceX<SimNode>(d => xScale(d.avg_risk, width)).strength(0.9))
      .force('y', d3force.forceY<SimNode>(d => TOP_PAD + d.laneIdx * laneH + laneH / 2).strength(0.35))
      .force('collide', d3force.forceCollide<SimNode>(d => d.r + 1).iterations(3))
      .stop()

    // Run synchronously — 72 dots converges fast (~80 ticks)
    for (let i = 0; i < 120; i++) sim.tick()

    setSimulatedNodes([...nodes])
  }, [categories, width, laneOrder, laneH])

  // Top-3 highest-risk categories (for label annotations)
  const top3 = useMemo(
    () => [...categories].sort((a, b) => b.avg_risk - a.avg_risk).slice(0, 3),
    [categories]
  )
  const top3Ids = useMemo(() => new Set(top3.map(c => c.category_id)), [top3])

  // Segalmex outlier: rightmost dot in agricultura lane
  const segalmexDot = useMemo(
    () =>
      simulatedNodes
        .filter(n => n.sector_code === SEGALMEX_SECTOR)
        .sort((a, b) => b.avg_risk - a.avg_risk)[0] ?? null,
    [simulatedNodes]
  )

  // Median risk for faint guideline
  const medianX = useMemo(() => {
    if (!categories.length) return 0
    const sorted = [...categories].map(c => c.avg_risk).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    return xScale(median, width)
  }, [categories, width])

  const oecdX = xScale(HIGH_THRESHOLD / 100, width)

  const handleDotClick = useCallback(
    (catId: number) => navigate(`/categories/${catId}`),
    [navigate]
  )

  const handleMouseEnter = useCallback(
    (node: SimNode, svgX: number, svgY: number) => {
      setHoveredId(node.category_id)
      setTooltip({ cat: node, x: svgX, y: svgY })
    },
    []
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null)
    setTooltip(null)
  }, [])

  const lang = i18n.language

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={width}
        height={totalHeight}
        aria-label={lang === 'es' ? 'Diagrama de carriles: categorías por sector y riesgo' : 'Swimlane diagram: categories by sector and risk'}
        role="img"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Lane backgrounds */}
        {laneOrder.map((sector, idx) => {
          const color = SECTOR_COLORS[sector.code] ?? '#64748b'
          const y = TOP_PAD + idx * laneH
          const isHighlighted = hoveredLane === sector.code
          return (
            <g key={sector.code}>
              <rect
                x={0}
                y={y}
                width={width}
                height={laneH}
                fill={color}
                fillOpacity={isHighlighted ? 0.18 : 0.07}
                style={{ transition: 'fill-opacity 0.15s' }}
              />
              {/* Lane label — text color uses AA-safe darker variant of sector color */}
              <text
                x={LABEL_W - 8}
                y={y + laneH / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fontFamily="var(--font-family-mono, monospace)"
                fontWeight={600}
                letterSpacing="0.1em"
                fill={SECTOR_TEXT_COLORS[sector.code] ?? color}
                style={{ textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                onMouseEnter={() => setHoveredLane(sector.code)}
                onMouseLeave={() => setHoveredLane(null)}
              >
                {lang === 'es' ? sector.name : sector.nameEN}
              </text>
            </g>
          )
        })}

        {/* X-axis ticks */}
        {[0, 10, 20, 30, 40].map(tick => {
          const tx = xScale(tick / 100, width)
          return (
            <g key={tick}>
              <line
                x1={tx}
                y1={TOP_PAD - 8}
                x2={tx}
                y2={TOP_PAD + laneOrder.length * laneH}
                stroke="currentColor"
                strokeOpacity={0.07}
                strokeWidth={1}
              />
              <text
                x={tx}
                y={TOP_PAD - 14}
                textAnchor="middle"
                fontSize={9}
                fontFamily="var(--font-family-mono, monospace)"
                fill="currentColor"
                fillOpacity={0.4}
              >
                {tick}%
              </text>
            </g>
          )
        })}

        {/* Median guideline (faint) */}
        {medianX > 0 && (
          <line
            x1={medianX}
            y1={TOP_PAD}
            x2={medianX}
            y2={TOP_PAD + laneOrder.length * laneH}
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={1}
            strokeDasharray="2 4"
          />
        )}

        {/* OECD / high-risk threshold line (cyan dashed) */}
        <line
          x1={oecdX}
          y1={TOP_PAD - 4}
          x2={oecdX}
          y2={TOP_PAD + laneOrder.length * laneH + BOTTOM_PAD - 4}
          stroke={OECD_CYAN}
          strokeWidth={1.5}
          strokeDasharray="5 3"
          strokeOpacity={0.85}
        />
        <text
          x={oecdX + 4}
          y={TOP_PAD - 8}
          fontSize={8}
          fontFamily="var(--font-family-mono, monospace)"
          fontWeight={700}
          fill={OECD_CYAN}
          letterSpacing="0.06em"
        >
          {lang === 'es' ? 'RIESGO ALTO ≥ 25%' : 'HIGH RISK ≥ 25%'}
        </text>

        {/* Dots */}
        {simulatedNodes.map(node => {
          const isHovered = hoveredId === node.category_id
          const isDimmed = hoveredId !== null && hoveredId !== node.category_id
          const isLaneDimmed = hoveredLane !== null && hoveredLane !== node.sector_code
          const color = SECTOR_COLORS[node.sector_code ?? 'otros'] ?? '#64748b'
          const scale = isHovered ? 1.4 : 1
          const opacity = isDimmed || isLaneDimmed ? 0.35 : 0.85

          return (
            <circle
              key={node.category_id}
              cx={node.x}
              cy={node.y}
              r={node.r * scale}
              fill={color}
              fillOpacity={opacity}
              stroke="#ffffff"
              strokeOpacity={0.15}
              strokeWidth={0.5}
              style={{ cursor: 'pointer', transition: 'r 0.12s, fill-opacity 0.12s' }}
              onMouseEnter={() => handleMouseEnter(node, node.x, node.y)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleDotClick(node.category_id)}
              aria-label={`${lang === 'es' ? node.name_es : node.name_en}: ${(node.avg_risk * 100).toFixed(1)}% riesgo`}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleDotClick(node.category_id) }}
            />
          )
        })}

        {/* Top-3 risk labels with connector lines */}
        {simulatedNodes
          .filter(n => top3Ids.has(n.category_id))
          .map(node => {
            const name = lang === 'es' ? node.name_es : node.name_en
            const truncated = name.length > 22 ? name.slice(0, 20) + '…' : name
            const color = SECTOR_COLORS[node.sector_code ?? 'otros'] ?? '#64748b'
            // Place label above the dot if space; always above lane center
            const labelY = node.y - node.r - 6
            const labelX = Math.min(node.x + 6, width - RIGHT_PAD - 60)
            return (
              <g key={`label-${node.category_id}`} pointerEvents="none">
                <line
                  x1={node.x}
                  y1={node.y - node.r}
                  x2={node.x + 4}
                  y2={labelY + 2}
                  stroke={color}
                  strokeWidth={0.8}
                  strokeOpacity={0.7}
                />
                {/* Top-3 labels: use AA-safe darker text color */}
                <text
                  x={labelX}
                  y={labelY}
                  fontSize={9}
                  fontFamily="var(--font-family-mono, monospace)"
                  fill={SECTOR_TEXT_COLORS[node.sector_code ?? 'otros'] ?? color}
                  fontWeight={700}
                  letterSpacing="0.04em"
                >
                  {truncated}
                </text>
              </g>
            )
          })}

        {/* Segalmex/Agricultura outlier annotation */}
        {segalmexDot && (
          <g pointerEvents="none">
            {/* Triangle marker */}
            <polygon
              points={`${segalmexDot.x},${segalmexDot.y - segalmexDot.r - 2} ${segalmexDot.x - 4},${segalmexDot.y - segalmexDot.r - 9} ${segalmexDot.x + 4},${segalmexDot.y - segalmexDot.r - 9}`}
              fill="#f59e0b"
              fillOpacity={0.85}
            />
            {/* Connector line to note */}
            <line
              x1={segalmexDot.x + 5}
              y1={segalmexDot.y - segalmexDot.r - 5}
              x2={Math.min(segalmexDot.x + 60, width - RIGHT_PAD - 10)}
              y2={segalmexDot.y - segalmexDot.r - 18}
              stroke="#f59e0b"
              strokeWidth={0.8}
              strokeOpacity={0.7}
            />
            <text
              x={Math.min(segalmexDot.x + 62, width - RIGHT_PAD - 8)}
              y={segalmexDot.y - segalmexDot.r - 18}
              fontSize={8}
              fontFamily="var(--font-family-mono, monospace)"
              fill="#f59e0b"
              fontWeight={600}
            >
              {lang === 'es'
                ? 'Score inflado por Segalmex — ver /thread/segalmex'
                : 'Score inflated by Segalmex — see /thread/segalmex'}
            </text>
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <TooltipPanel
          cat={tooltip.cat}
          svgX={tooltip.x}
          svgY={tooltip.y}
          svgWidth={width}
          lang={lang}
          onNavigate={() => handleDotClick(tooltip.cat.category_id)}
        />
      )}
    </div>
  )
}

// ── Tooltip Panel ──────────────────────────────────────────────────────────────

interface TooltipPanelProps {
  cat: CategoryDatum
  svgX: number
  svgY: number
  svgWidth: number
  lang: string
  onNavigate: () => void
}

function TooltipPanel({ cat, svgX, svgY, svgWidth, lang, onNavigate }: TooltipPanelProps) {
  // Position tooltip: prefer right of dot; flip left if too close to right edge
  const TOOLTIP_W = 224
  const OFFSET = 14
  const left = svgX + OFFSET + TOOLTIP_W > svgWidth ? svgX - TOOLTIP_W - OFFSET : svgX + OFFSET

  const topVendorName = cat.top_vendor
    ? formatVendorName(cat.top_vendor.name)
    : null

  return (
    <div
      className="pointer-events-none absolute z-50 rounded-sm border border-border bg-background-card shadow-lg"
      style={{
        left,
        top: svgY - 8,
        width: TOOLTIP_W,
        transform: 'translateY(-50%)',
      }}
    >
      <div className="px-3 py-2.5 space-y-2">
        {/* Category name */}
        <div className="text-[11px] font-semibold text-text-primary leading-tight">
          {lang === 'es' ? cat.name_es : cat.name_en}
        </div>

        {/* Sector chip */}
        {cat.sector_code && (
          <div>
            <EntityIdentityChip
              type="sector"
              id={cat.sector_id ?? 0}
              name={cat.sector_code}
              size="xs"
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <StatLine
            label={lang === 'es' ? 'Valor' : 'Value'}
            value={formatCompactMXN(cat.total_value)}
          />
          <StatLine
            label={lang === 'es' ? 'Contratos' : 'Contracts'}
            value={formatNumber(cat.total_contracts)}
          />
          <StatLine
            label={lang === 'es' ? 'Riesgo' : 'Risk'}
            value={`${(cat.avg_risk * 100).toFixed(1)}%`}
          />
          <StatLine
            label={lang === 'es' ? 'Adj.Dir.' : 'Direct'}
            value={`${cat.direct_award_pct.toFixed(0)}%`}
          />
          <StatLine
            label={lang === 'es' ? 'Lic.Única' : 'Single bid'}
            value={`${cat.single_bid_pct.toFixed(0)}%`}
          />
        </div>

        {/* Top vendor */}
        {topVendorName && cat.top_vendor && (
          <div className="pt-0.5 border-t border-border">
            <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted mb-0.5">
              {lang === 'es' ? 'Top proveedor' : 'Top vendor'}
            </div>
            <EntityIdentityChip
              type="vendor"
              id={cat.top_vendor.id}
              name={topVendorName}
              size="xs"
            />
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          className="pointer-events-auto text-[10px] font-mono font-bold uppercase tracking-wider text-accent hover:underline"
          onClick={onNavigate}
        >
          {lang === 'es' ? 'Investigar →' : 'Investigate →'}
        </button>
      </div>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted">{label}</div>
      <div className="text-[11px] font-mono tabular-nums text-text-primary">{value}</div>
    </div>
  )
}
