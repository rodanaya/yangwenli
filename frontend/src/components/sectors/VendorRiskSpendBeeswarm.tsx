/**
 * VendorRiskSpendBeeswarm — individual-vendor beeswarm for the Top Vendors tab.
 *
 * Mirrors the RiskSpendBeeswarm vocabulary (risk × log-spend plane with a
 * PRIORIDAD quadrant) but operates on individual vendors within a sector
 * rather than the 12-sector summary.
 *
 * Props:
 *   vendors — already-loaded VendorRow[] from the existing topVendors query.
 *             No new fetches added.
 *
 * Encoding:
 *   X  = avg_risk_score × 100   (0–60 range, clamped)
 *   Y  = log10(total_value_mxn)  labeled in compact MXN
 *   R  = clamp(5, sqrt(contracts) × k, 22)
 *   Fill = sectorFill at 0.80 opacity
 *   Stroke = 1.5px white at 0.5 opacity
 *
 * Quadrant: risk ≥ 0.25 AND log-spend ≥ 8 (100M+) → amber PRIORIDAD zone.
 *
 * sp-P4 · docs/SECTOR_PROFILE_REDESIGN_PLAN.md (Option A)
 * Build: 2026-05-04-sp-1-3-4
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  forceSimulation,
  forceX,
  forceY,
  forceCollide,
  type SimulationNodeDatum,
} from 'd3-force'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'

// ── geometry ──────────────────────────────────────────────────────────────────

const MARGIN = { top: 24, right: 64, bottom: 48, left: 76 }
const HEIGHT = 360

const X_MIN = 0
const X_MAX = 60   // risk pct, wide enough for outliers

// Y domain: log10(spend), 7 (10M) to 12 (1T)
const Y_MIN = 7
const Y_MAX = 12

// Quadrant thresholds
const QUADRANT_RISK_THRESHOLD = 0.25
const QUADRANT_SPEND_THRESHOLD = 8   // log10(100M)

// Amber — single permitted raw hex for the priority quadrant
const QUADRANT_AMBER = '#f59e0b'

const Y_TICKS: Array<[number, string]> = [
  [7,  '10M'],
  [8,  '100M'],
  [9,  '1B'],
  [10, '10B'],
  [11, '100B'],
]

// ── types ─────────────────────────────────────────────────────────────────────

export interface VendorBeeItem {
  vendor_id: number
  vendor_name: string
  name?: string
  total_value_mxn: number
  total_contracts: number
  contract_count?: number
  avg_risk_score?: number
}

interface BeeNode extends SimulationNodeDatum {
  item: VendorBeeItem
  cx: number
  cy: number
  r: number
  labelX: number
  labelY: number
}

// ── helpers ───────────────────────────────────────────────────────────────────

function clamp(min: number, val: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

function vendorRadius(contracts: number): number {
  const k = 0.025
  return clamp(5, Math.sqrt(contracts) * k, 22)
}

function vendorName(v: VendorBeeItem): string {
  return v.vendor_name ?? v.name ?? `#${v.vendor_id}`
}

// ── component ─────────────────────────────────────────────────────────────────

interface VendorRiskSpendBeeswarmProps {
  vendors: VendorBeeItem[]
  /** Vivid sector fill color (SECTOR_COLORS[code]) — used for fills/strokes */
  sectorFill: string
  /** AA-safe text color (SECTOR_TEXT_COLORS[code]) — used for text labels */
  sectorTextColor: string
}

export function VendorRiskSpendBeeswarm({
  vendors,
  sectorFill,
  sectorTextColor,
}: VendorRiskSpendBeeswarmProps) {
  const { i18n } = useTranslation('sectors')
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const isEs = i18n.language.startsWith('es')

  const innerW = width - MARGIN.left - MARGIN.right
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom

  // ── resize observer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const xScale = useCallback(
    (riskPct: number) => ((riskPct - X_MIN) / (X_MAX - X_MIN)) * innerW,
    [innerW],
  )
  const yScale = useCallback(
    (log10Val: number) => innerH - ((log10Val - Y_MIN) / (Y_MAX - Y_MIN)) * innerH,
    [innerH],
  )

  // Top 3 by spend (labeled by name)
  const topSpendIds = useMemo(() => {
    return [...vendors]
      .sort((a, b) => b.total_value_mxn - a.total_value_mxn)
      .slice(0, 3)
      .map((v) => v.vendor_id)
  }, [vendors])

  // ── compute positions ────────────────────────────────────────────────────
  const nodes = useMemo<BeeNode[]>(() => {
    return vendors.map((item) => {
      const riskPct = (item.avg_risk_score ?? 0) * 100
      const contracts = item.total_contracts ?? item.contract_count ?? 1
      const log10Spend = Math.log10(Math.max(1, item.total_value_mxn))
      const cx = xScale(clamp(X_MIN, riskPct, X_MAX))
      const cy = yScale(clamp(Y_MIN, log10Spend, Y_MAX))
      const r = vendorRadius(contracts)
      return {
        item,
        cx,
        cy,
        x: cx,
        y: cy,
        r,
        labelX: cx + r + 4,
        labelY: cy + 4,
      }
    })
  }, [vendors, xScale, yScale])

  // ── d3-force label de-overlap ────────────────────────────────────────────
  type LNode = SimulationNodeDatum & { idx: number; anchorX: number; anchorY: number }
  const [labelPositions, setLabelPositions] = useState<Array<{ x: number; y: number }>>(
    () => nodes.map((n) => ({ x: n.labelX, y: n.labelY })),
  )

  useEffect(() => {
    if (!nodes.length) return
    const labelNodes: LNode[] = nodes.map((n, idx) => ({
      idx,
      anchorX: n.cx + n.r + 4,
      anchorY: n.cy + 4,
      x: n.cx + n.r + 4,
      y: n.cy + 4,
    }))
    const sim = forceSimulation<LNode>(labelNodes)
      .force('collide', forceCollide<LNode>(14).strength(0.5).iterations(3))
      .force('anchorX', forceX<LNode>((d) => d.anchorX).strength(0.4))
      .force('anchorY', forceY<LNode>((d) => d.anchorY).strength(0.55))
      .alphaDecay(0.05)
      .stop()
    for (let i = 0; i < 100; i++) sim.tick()
    setLabelPositions(labelNodes.map((n) => ({ x: n.x ?? n.anchorX, y: n.y ?? n.anchorY })))
  }, [nodes])

  // ── quadrant geometry ────────────────────────────────────────────────────
  const quadrantX = xScale(QUADRANT_RISK_THRESHOLD * 100)
  const quadrantY = yScale(QUADRANT_SPEND_THRESHOLD)
  const quadrantW = innerW - quadrantX
  const quadrantH = quadrantY

  const activeItem = hoveredId !== null
    ? vendors.find((v) => v.vendor_id === hoveredId) ?? null
    : null

  if (!vendors.length) return null

  return (
    <div ref={containerRef} className="relative">
      {/* § kicker */}
      <p
        className="font-mono text-[10px] uppercase tracking-[0.18em] mb-3"
        style={{ color: sectorTextColor }}
      >
        {isEs ? '§ 2 LOS BENEFICIARIOS · RIESGO × GASTO' : '§ 2 THE BENEFICIARIES · RISK × SPEND'}
      </p>

      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={
          isEs
            ? 'Diagrama de burbujas: riesgo vs gasto por proveedor'
            : 'Bubble chart: risk vs spend by vendor'
        }
        style={{ display: 'block', outline: 'none' }}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

          {/* Priority quadrant fill */}
          {quadrantW > 0 && quadrantH > 0 && (
            <>
              <rect
                x={quadrantX}
                y={0}
                width={quadrantW}
                height={quadrantY}
                fill={QUADRANT_AMBER}
                fillOpacity={0.07}
                aria-hidden="true"
              />
              <text
                x={innerW - 4}
                y={14}
                textAnchor="end"
                fontFamily="var(--font-family-mono, monospace)"
                fontSize={10}
                fill={QUADRANT_AMBER}
                fillOpacity={0.85}
                fontWeight={700}
                letterSpacing="0.12em"
                aria-hidden="true"
              >
                {isEs ? 'PRIORIDAD' : 'PRIORITY'}
              </text>
            </>
          )}

          {/* Y grid lines */}
          {Y_TICKS.map(([log10Val]) => {
            const y = yScale(log10Val)
            if (y < 0 || y > innerH) return null
            return (
              <line
                key={log10Val}
                x1={0} x2={innerW}
                y1={y} y2={y}
                stroke="var(--color-border)"
                strokeWidth={0.5}
                strokeDasharray="2,4"
                aria-hidden="true"
              />
            )
          })}

          {/* OECD risk reference line at 25% */}
          {(() => {
            const oecdX = xScale(25)
            return (
              <>
                <line
                  x1={oecdX} x2={oecdX}
                  y1={0} y2={innerH}
                  stroke="#22d3ee"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  aria-hidden="true"
                />
                <text
                  x={oecdX + 3}
                  y={innerH + 14}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontSize={9}
                  fill="#22d3ee"
                  fillOpacity={0.85}
                  aria-hidden="true"
                >
                  {isEs ? 'OCDE 25%' : 'OECD 25%'}
                </text>
              </>
            )
          })()}

          {/* Circles */}
          {nodes.map((node) => {
            const isHovered = hoveredId === node.item.vendor_id
            const isDimmed = hoveredId !== null && !isHovered
            const riskLevel = getRiskLevelFromScore(node.item.avg_risk_score ?? 0)
            const riskColor = RISK_COLORS[riskLevel]
            return (
              <circle
                key={node.item.vendor_id}
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                fill={sectorFill}
                fillOpacity={isDimmed ? 0.15 : 0.80}
                stroke={riskColor}
                strokeWidth={1.5}
                strokeOpacity={isDimmed ? 0.1 : 0.7}
                style={{
                  transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                  transformOrigin: `${node.cx}px ${node.cy}px`,
                  transformBox: 'fill-box',
                  transition: 'transform 0.15s ease, fill-opacity 0.15s',
                  cursor: 'pointer',
                }}
                role="button"
                tabIndex={-1}
                aria-label={`${vendorName(node.item)} — riesgo ${((node.item.avg_risk_score ?? 0) * 100).toFixed(1)}%`}
                onMouseEnter={() => setHoveredId(node.item.vendor_id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => navigate(`/vendors/${node.item.vendor_id}`)}
              />
            )
          })}

          {/* Labels for top-3 by spend */}
          {nodes.map((node, idx) => {
            if (!topSpendIds.includes(node.item.vendor_id)) return null
            const isHovered = hoveredId === node.item.vendor_id
            const isDimmed = hoveredId !== null && !isHovered
            const pos = labelPositions[idx] ?? { x: node.labelX, y: node.labelY }
            const angle = Math.atan2(pos.y - node.cy, pos.x - node.cx)
            const lineX1 = node.cx + Math.cos(angle) * node.r
            const lineY1 = node.cy + Math.sin(angle) * node.r

            return (
              <g
                key={`lbl-${node.item.vendor_id}`}
                style={{ opacity: isDimmed ? 0.15 : 1, transition: 'opacity 0.15s' }}
                aria-hidden="true"
              >
                <line
                  x1={lineX1} y1={lineY1}
                  x2={pos.x - 4} y2={pos.y - 2}
                  stroke={sectorFill}
                  strokeWidth={0.75}
                  strokeOpacity={0.5}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontSize={9}
                  fill={sectorTextColor}
                  fontWeight={isHovered ? 700 : 500}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {vendorName(node.item).substring(0, 22)}
                </text>
              </g>
            )
          })}

          {/* X axis */}
          <line
            x1={0} x2={innerW}
            y1={innerH} y2={innerH}
            stroke="var(--color-border)"
            strokeWidth={0.75}
            aria-hidden="true"
          />
          {[10, 20, 25, 40, 60].map((tick) => {
            const x = xScale(tick)
            const isOecd = tick === 25
            return (
              <g key={tick} aria-hidden="true">
                <line
                  x1={x} x2={x}
                  y1={innerH} y2={innerH + 4}
                  stroke={isOecd ? '#22d3ee' : 'var(--color-border)'}
                  strokeWidth={isOecd ? 1.5 : 0.75}
                />
                <text
                  x={x}
                  y={innerH + 16}
                  textAnchor="middle"
                  fontFamily="var(--font-family-mono, monospace)"
                  fontSize={9}
                  fill={isOecd ? '#22d3ee' : 'var(--color-text-muted)'}
                  fillOpacity={isOecd ? 0.9 : 0.7}
                >
                  {tick}%
                </text>
              </g>
            )
          })}
          <text
            x={innerW / 2}
            y={innerH + 36}
            textAnchor="middle"
            fontFamily="var(--font-family-mono, monospace)"
            fontSize={9}
            fill="var(--color-text-muted)"
            fillOpacity={0.6}
            letterSpacing="0.1em"
            aria-hidden="true"
          >
            {isEs ? 'INDICADOR DE RIESGO →' : 'RISK INDICATOR →'}
          </text>

          {/* Y axis */}
          <line
            x1={0} x2={0}
            y1={0} y2={innerH}
            stroke="var(--color-border)"
            strokeWidth={0.75}
            aria-hidden="true"
          />
          {Y_TICKS.map(([log10Val, label]) => {
            const y = yScale(log10Val)
            if (y < 0 || y > innerH + 2) return null
            return (
              <g key={log10Val} aria-hidden="true">
                <line
                  x1={-4} x2={0}
                  y1={y} y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={0.75}
                />
                <text
                  x={-8}
                  y={y + 4}
                  textAnchor="end"
                  fontFamily="var(--font-family-mono, monospace)"
                  fontSize={9}
                  fill="var(--color-text-muted)"
                  fillOpacity={0.7}
                >
                  {label}
                </text>
              </g>
            )
          })}
          <text
            x={-(innerH / 2)}
            y={-56}
            textAnchor="middle"
            fontFamily="var(--font-family-mono, monospace)"
            fontSize={9}
            fill="var(--color-text-muted)"
            fillOpacity={0.6}
            letterSpacing="0.1em"
            transform="rotate(-90)"
            aria-hidden="true"
          >
            {isEs ? '↑ GASTO TOTAL (MXN)' : '↑ TOTAL SPEND (MXN)'}
          </text>
        </g>
      </svg>

      {/* Hover tooltip */}
      {activeItem && (
        <VendorBeeTooltip vendor={activeItem} isEs={isEs} sectorFill={sectorFill} onNavigate={() => navigate(`/vendors/${activeItem.vendor_id}`)} />
      )}

      <p className="mt-2 text-[10px] font-mono text-text-muted opacity-60">
        {isEs
          ? 'Clic en círculo para abrir dossier del proveedor · top-3 por gasto etiquetados'
          : 'Click circle to open vendor dossier · top-3 by spend labeled'}
      </p>
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function VendorBeeTooltip({
  vendor,
  isEs,
  sectorFill,
  onNavigate,
}: {
  vendor: VendorBeeItem
  isEs: boolean
  sectorFill: string
  onNavigate: () => void
}) {
  const riskLevel = getRiskLevelFromScore(vendor.avg_risk_score ?? 0)
  const riskColor = RISK_COLORS[riskLevel]
  const contracts = vendor.total_contracts ?? vendor.contract_count ?? 0

  return (
    <div
      className="absolute top-2 right-0 w-52 bg-background-card border border-border rounded-sm p-3 shadow-lg pointer-events-auto z-10"
      style={{ borderLeft: `3px solid ${sectorFill}` }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div onClick={(e) => e.stopPropagation()}>
        <EntityIdentityChip
          type="vendor"
          id={vendor.vendor_id}
          name={vendor.vendor_name ?? vendor.name ?? ''}
          size="sm"
        />
      </div>
      <div className="mt-2 space-y-1 text-[11px] font-mono">
        <div className="flex justify-between gap-2">
          <span className="text-text-muted shrink-0">{isEs ? 'Riesgo' : 'Risk'}</span>
          <span style={{ color: riskColor }} className="tabular-nums font-bold">
            {((vendor.avg_risk_score ?? 0) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-text-muted shrink-0">{isEs ? 'Gasto' : 'Spend'}</span>
          <span className="tabular-nums text-text-secondary">
            {formatCompactMXN(vendor.total_value_mxn)}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-text-muted shrink-0">{isEs ? 'Contratos' : 'Contracts'}</span>
          <span className="tabular-nums text-text-secondary">
            {formatNumber(contracts)}
          </span>
        </div>
      </div>
      <button
        onClick={onNavigate}
        className="mt-3 w-full text-[10px] font-mono font-bold uppercase tracking-[0.12em] py-1.5 rounded-sm transition-opacity hover:opacity-80"
        style={{ backgroundColor: `${sectorFill}18`, color: sectorFill, border: `1px solid ${sectorFill}40` }}
      >
        {isEs ? 'Ver dossier →' : 'View dossier →'}
      </button>
    </div>
  )
}
