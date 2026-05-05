/**
 * SectorMoneyFlowSankey — sp-P2 hero for the Overview tab
 *
 * Three-column annotated SVG flow:
 *   Institutions (top 5) → Procedure type (DA / Competitive / Single-bid) → Vendors (top 8)
 *
 * Sankey approximation: uses cubic bezier ribbons between columns.
 * Link width encodes MXN flow magnitude.
 * Hover dims non-selected flows to 0.15 opacity.
 *
 * Data contract: moneyFlow items are institution→vendor. We derive procedure
 * type split from sectorStats (direct_award_pct / single_bid_pct); individual
 * links flow through the DA column proportionally to the institution's DA%.
 */

import { useState, useMemo, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import type { MoneyFlowItem } from '@/api/types'

// ── Constants ────────────────────────────────────────────────────────────────

const STRUCTURAL_FPS = new Set(['BAXTER', 'FRESENIUS', 'INFRA', 'PRAXAIR', 'BIRMEX'])

function isStructuralFP(name: string): boolean {
  return STRUCTURAL_FPS.has(name.toUpperCase().split(' ')[0])
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ProcedureNode {
  id: string
  label: string
  labelEs: string
  pct: number      // share of total value
  value: number
}

interface InstNode {
  id: number
  name: string
  value: number
  avgRisk: number | null
}

interface VendorNode {
  id: number
  name: string
  value: number
  avgRisk: number | null
  isFP: boolean
}

interface SankeyLink {
  fromCol: 'inst' | 'proc'
  fromIdx: number
  toIdx: number
  value: number       // MXN
  opacity?: number
}

// ── Layout helpers ────────────────────────────────────────────────────────────

const COL_W = 160          // node label column width
const FLOW_W = 90          // gap between columns for flows
const SVG_W = COL_W * 3 + FLOW_W * 2  // 660
const NODE_H = 32          // node row height
const NODE_GAP = 6         // gap between nodes in same column
const COL_PAD_TOP = 24     // top padding for column header

function colX(col: 0 | 1 | 2): number {
  return col * (COL_W + FLOW_W)
}

function nodeY(idx: number): number {
  return COL_PAD_TOP + idx * (NODE_H + NODE_GAP)
}

function svgHeight(maxNodes: number): number {
  return COL_PAD_TOP + maxNodes * (NODE_H + NODE_GAP) + 24
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FlowRibbon({
  x1, y1, x2, y2,
  thickness,
  color,
  opacity,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  x1: number; y1: number; x2: number; y2: number
  thickness: number
  color: string
  opacity: number
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick?: () => void
}) {
  const cx1 = x1 + (x2 - x1) * 0.45
  const cx2 = x2 - (x2 - x1) * 0.45
  const half = thickness / 2

  const topPath = `M ${x1} ${y1 - half} C ${cx1} ${y1 - half}, ${cx2} ${y2 - half}, ${x2} ${y2 - half}`
  const botPath = `L ${x2} ${y2 + half} C ${cx2} ${y2 + half}, ${cx1} ${y1 + half}, ${x1} ${y1 + half} Z`

  return (
    <path
      d={topPath + ' ' + botPath}
      fill={color}
      fillOpacity={opacity}
      stroke="none"
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'fill-opacity 0.2s' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
    />
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface SectorMoneyFlowSankeyProps {
  flows: MoneyFlowItem[]
  sectorCode: string
  stats: {
    direct_award_pct?: number
    single_bid_pct?: number
    total_value_mxn?: number
  } | null
  isEs?: boolean
}

export function SectorMoneyFlowSankey({
  flows,
  sectorCode,
  stats,
  isEs = true,
}: SectorMoneyFlowSankeyProps) {
  const navigate = useNavigate()
  const clipId = useId()
  const sectorColor = SECTOR_COLORS[sectorCode] ?? '#64748b'

  // ── Derive nodes ────────────────────────────────────────────────────────────

  // Group flows by source (institution) and target (vendor)
  const instMap = useMemo(() => {
    const m = new Map<number, InstNode>()
    for (const f of flows) {
      const existing = m.get(f.source_id)
      if (existing) {
        existing.value += f.value
      } else {
        m.set(f.source_id, {
          id: f.source_id,
          name: f.source_name,
          value: f.value,
          avgRisk: f.avg_risk,
        })
      }
    }
    return m
  }, [flows])

  const vendorMap = useMemo(() => {
    const m = new Map<number, VendorNode>()
    for (const f of flows) {
      const existing = m.get(f.target_id)
      if (existing) {
        existing.value += f.value
      } else {
        m.set(f.target_id, {
          id: f.target_id,
          name: f.target_name,
          value: f.value,
          avgRisk: f.avg_risk,
          isFP: isStructuralFP(f.target_name),
        })
      }
    }
    return m
  }, [flows])

  // Top 5 institutions, top 8 vendors
  const instNodes = useMemo(
    () => Array.from(instMap.values()).sort((a, b) => b.value - a.value).slice(0, 5),
    [instMap]
  )
  const vendorNodes = useMemo(
    () => Array.from(vendorMap.values()).sort((a, b) => b.value - a.value).slice(0, 8),
    [vendorMap]
  )

  // Procedure type nodes derived from stats
  const daPct = stats?.direct_award_pct ?? 60
  const sbPct = stats?.single_bid_pct ?? 10
  const compPct = Math.max(0, 100 - daPct - sbPct)
  const totalValue = flows.reduce((s, f) => s + f.value, 0)

  const procedureNodes = useMemo<ProcedureNode[]>(() => [
    { id: 'da', label: 'Direct Award', labelEs: 'Adj. Directa', pct: daPct / 100, value: totalValue * (daPct / 100) },
    { id: 'comp', label: 'Competitive', labelEs: 'Competitiva', pct: compPct / 100, value: totalValue * (compPct / 100) },
    { id: 'sb', label: 'Single Bid', labelEs: 'Solo 1 Oferta', pct: sbPct / 100, value: totalValue * (sbPct / 100) },
  ].filter(p => p.pct > 0.005), [daPct, compPct, sbPct, totalValue])

  // ── Hover state ─────────────────────────────────────────────────────────────

  const [hoveredInst, setHoveredInst] = useState<number | null>(null)
  const [hoveredVendor, setHoveredVendor] = useState<number | null>(null)
  const [hoveredProc, setHoveredProc] = useState<string | null>(null)

  // ── Layout ──────────────────────────────────────────────────────────────────

  const maxNodes = Math.max(instNodes.length, procedureNodes.length, vendorNodes.length)
  const height = svgHeight(maxNodes)

  // Link thickness: max 18px per link, scale to value
  const maxLinkVal = Math.max(...flows.map(f => f.value), 1)
  function linkThickness(val: number): number {
    return Math.max(2, Math.min(18, (val / maxLinkVal) * 18))
  }

  // Build inst→proc links: distribute each institution's value by DA% / comp% / sb%
  const instProcLinks = useMemo<SankeyLink[]>(() => {
    const links: SankeyLink[] = []
    instNodes.forEach((inst, fromIdx) => {
      procedureNodes.forEach((proc, toIdx) => {
        const val = inst.value * proc.pct
        if (val > 0) links.push({ fromCol: 'inst', fromIdx, toIdx, value: val })
      })
    })
    return links
  }, [instNodes, procedureNodes])

  // Build proc→vendor links: distribute each proc node across vendors proportionally
  const instVendorMap = useMemo(() => {
    const m = new Map<number, number>()
    for (const f of flows) {
      const instIdx = instNodes.findIndex(n => n.id === f.source_id)
      if (instIdx < 0) continue
      const key = f.target_id
      m.set(key, (m.get(key) ?? 0) + f.value)
    }
    return m
  }, [flows, instNodes])

  const procVendorLinks = useMemo<SankeyLink[]>(() => {
    const links: SankeyLink[] = []
    procedureNodes.forEach((proc, fromIdx) => {
      vendorNodes.forEach((vendor, toIdx) => {
        const vendorTotal = instVendorMap.get(vendor.id) ?? 0
        const val = vendorTotal * proc.pct
        if (val > 0) links.push({ fromCol: 'proc', fromIdx, toIdx, value: val })
      })
    })
    return links
  }, [procedureNodes, vendorNodes, instVendorMap])

  // Track cumulative Y offsets within each column for stacking
  const instTotalValues = useMemo(() => instNodes.map(n => n.value), [instNodes])
  const procTotalValues = useMemo(() => procedureNodes.map(p => p.value), [procedureNodes])

  // For each link, compute the Y center point at source and target
  // We use simple row-center Y (not true stacked Sankey bars) for readability
  function getLinkY(_col: 0 | 1 | 2, idx: number): number {
    return nodeY(idx) + NODE_H / 2
  }

  // Determine link opacity based on hover
  function getLinkOpacity(link: SankeyLink): number {
    const instIdx = link.fromCol === 'inst' ? link.fromIdx : null
    const procIdx = link.fromCol === 'proc' ? link.fromIdx : (link.fromCol === 'inst' ? link.toIdx : null)
    const vendorIdx = link.fromCol === 'proc' ? link.toIdx : null

    const anyHover = hoveredInst !== null || hoveredVendor !== null || hoveredProc !== null

    if (!anyHover) return 0.45

    if (hoveredInst !== null) {
      if (link.fromCol === 'inst' && instNodes[link.fromIdx]?.id === hoveredInst) return 0.75
      if (link.fromCol === 'proc') {
        // check if this vendor is connected to hovered inst
        const vendorId = vendorNodes[link.toIdx]?.id
        if (vendorId) {
          const flow = flows.find(f => f.source_id === hoveredInst && f.target_id === vendorId)
          if (flow) return 0.75
        }
      }
    }
    if (hoveredVendor !== null) {
      if (link.fromCol === 'proc' && vendorNodes[link.toIdx]?.id === hoveredVendor) return 0.75
      if (link.fromCol === 'inst') {
        const vendorIds = flows
          .filter(f => f.source_id === instNodes[link.fromIdx]?.id)
          .map(f => f.target_id)
        if (vendorIds.includes(hoveredVendor)) return 0.6
      }
    }
    if (hoveredProc !== null) {
      if (procIdx !== null && procedureNodes[procIdx]?.id === hoveredProc) return 0.75
    }

    // Suppress unused params warning
    void instIdx
    void vendorIdx

    return 0.08
  }

  if (!flows.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-text-muted">
        {isEs ? 'Sin datos de flujo disponibles.' : 'No flow data available.'}
      </div>
    )
  }

  // Top-5 institutions cover X% of total
  const top5Value = instNodes.reduce((s, n) => s + n.value, 0)
  const top5Pct = totalValue > 0 ? Math.round((top5Value / totalValue) * 100) : 0

  return (
    <div className="w-full space-y-3">
      {/* Section kicker */}
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted">
          {isEs ? '§ 1 LA HISTORIA DEL DINERO' : '§ 1 MONEY FLOW'}
        </p>
        <p className="text-[10px] font-mono text-text-muted">
          {isEs
            ? `Top 5 instituciones = ${top5Pct}% del gasto sectorial`
            : `Top 5 institutions = ${top5Pct}% of sector spend`}
        </p>
      </div>

      {/* SVG flow diagram */}
      <div
        className="w-full overflow-x-auto rounded-sm border border-border bg-background/40 p-3"
        role="img"
        aria-label={isEs
          ? 'Diagrama de flujo de gasto: instituciones → tipo de procedimiento → proveedores'
          : 'Spending flow diagram: institutions → procedure type → vendors'}
      >
        <svg
          width={SVG_W}
          height={height}
          viewBox={`0 0 ${SVG_W} ${height}`}
          style={{ minWidth: SVG_W, display: 'block', margin: '0 auto' }}
          aria-hidden="true"
        >
          <defs>
            <clipPath id={clipId}>
              <rect width={SVG_W} height={height} />
            </clipPath>
          </defs>

          {/* Column headers */}
          {[
            { x: colX(0), label: isEs ? 'INSTITUCIONES' : 'INSTITUTIONS' },
            { x: colX(1), label: isEs ? 'PROCEDIMIENTO' : 'PROCEDURE' },
            { x: colX(2), label: isEs ? 'PROVEEDORES' : 'VENDORS' },
          ].map((col) => (
            <text
              key={col.label}
              x={col.x}
              y={12}
              fill="var(--color-text-muted)"
              fontSize={8}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
              letterSpacing="0.12em"
            >
              {col.label}
            </text>
          ))}

          {/* Institution→Procedure links */}
          {instProcLinks.map((link, li) => {
            const x1 = colX(0) + COL_W
            const y1 = getLinkY(0, link.fromIdx)
            const x2 = colX(1)
            const y2 = getLinkY(1, link.toIdx)
            const t = linkThickness(link.value)
            const op = getLinkOpacity(link)
            return (
              <FlowRibbon
                key={`ip-${li}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                thickness={t}
                color={sectorColor}
                opacity={op}
                onMouseEnter={() => setHoveredProc(procedureNodes[link.toIdx]?.id ?? null)}
                onMouseLeave={() => setHoveredProc(null)}
              />
            )
          })}

          {/* Procedure→Vendor links */}
          {procVendorLinks.map((link, li) => {
            const x1 = colX(1) + COL_W
            const y1 = getLinkY(1, link.fromIdx)
            const x2 = colX(2)
            const y2 = getLinkY(2, link.toIdx)
            const t = linkThickness(link.value)
            const op = getLinkOpacity(link)
            return (
              <FlowRibbon
                key={`pv-${li}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                thickness={t}
                color={sectorColor}
                opacity={op}
                onMouseEnter={() => setHoveredVendor(vendorNodes[link.toIdx]?.id ?? null)}
                onMouseLeave={() => setHoveredVendor(null)}
              />
            )
          })}

          {/* Institution nodes (col 0) */}
          {instNodes.map((inst, i) => {
            const y = nodeY(i)
            const riskColor = inst.avgRisk != null
              ? RISK_COLORS[getRiskLevelFromScore(inst.avgRisk)]
              : 'var(--color-text-muted)'
            const isHovered = hoveredInst === inst.id
            const dimmed = hoveredInst !== null && !isHovered
            return (
              <g
                key={inst.id}
                style={{ cursor: 'pointer', opacity: dimmed ? 0.4 : 1, transition: 'opacity 0.2s' }}
                onMouseEnter={() => setHoveredInst(inst.id)}
                onMouseLeave={() => setHoveredInst(null)}
                onClick={() => navigate(`/institutions/${inst.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/institutions/${inst.id}`) }}
                aria-label={`${inst.name}: ${formatCompactMXN(inst.value)}`}
              >
                {/* Left accent bar */}
                <rect
                  x={colX(0)}
                  y={y + 2}
                  width={3}
                  height={NODE_H - 4}
                  fill={sectorColor}
                  fillOpacity={0.8}
                  rx={1}
                />
                {/* Background rect on hover */}
                <rect
                  x={colX(0) + 5}
                  y={y}
                  width={COL_W - 5}
                  height={NODE_H}
                  fill={isHovered ? sectorColor : 'transparent'}
                  fillOpacity={0.08}
                  rx={3}
                />
                {/* Rank */}
                <text
                  x={colX(0) + 10}
                  y={y + 13}
                  fill="var(--color-text-muted)"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  #{i + 1}
                </text>
                {/* Name (truncated) */}
                <text
                  x={colX(0) + 10}
                  y={y + 23}
                  fill="var(--color-text-primary)"
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {inst.name.length > 20 ? inst.name.slice(0, 18) + '…' : inst.name}
                </text>
                {/* Value */}
                <text
                  x={colX(0) + COL_W - 8}
                  y={y + 13}
                  fill={sectorColor}
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                  textAnchor="end"
                >
                  {formatCompactMXN(inst.value)}
                </text>
                {/* Risk indicator dot */}
                <circle
                  cx={colX(0) + COL_W - 8}
                  cy={y + 23}
                  r={3}
                  fill={riskColor}
                  fillOpacity={0.9}
                />
              </g>
            )
          })}

          {/* Procedure nodes (col 1) */}
          {procedureNodes.map((proc, i) => {
            const y = nodeY(i)
            const isHovered = hoveredProc === proc.id
            const dimmed = hoveredProc !== null && !isHovered
            const isDA = proc.id === 'da'
            const aboveOECD = isDA && proc.pct > 0.25
            const barColor = aboveOECD ? 'var(--color-risk-critical)' : 'var(--color-text-secondary)'

            return (
              <g
                key={proc.id}
                style={{ opacity: dimmed ? 0.4 : 1, transition: 'opacity 0.2s', cursor: 'default' }}
                onMouseEnter={() => setHoveredProc(proc.id)}
                onMouseLeave={() => setHoveredProc(null)}
              >
                <rect
                  x={colX(1)}
                  y={y + 2}
                  width={3}
                  height={NODE_H - 4}
                  fill={barColor}
                  fillOpacity={0.7}
                  rx={1}
                />
                <rect
                  x={colX(1) + 5}
                  y={y}
                  width={COL_W - 5}
                  height={NODE_H}
                  fill={isHovered ? 'var(--color-background-elevated)' : 'transparent'}
                  rx={3}
                />
                <text
                  x={colX(1) + 10}
                  y={y + 13}
                  fill={aboveOECD ? 'var(--color-risk-critical)' : 'var(--color-text-secondary)'}
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                >
                  {(proc.pct * 100).toFixed(0)}%
                </text>
                <text
                  x={colX(1) + 10}
                  y={y + 23}
                  fill="var(--color-text-muted)"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  {isEs ? proc.labelEs : proc.label}
                </text>
                {aboveOECD && (
                  <text
                    x={colX(1) + COL_W - 8}
                    y={y + 13}
                    fill="var(--color-risk-critical)"
                    fontSize={7}
                    fontFamily="var(--font-family-mono)"
                    textAnchor="end"
                    fontStyle="italic"
                  >
                    {`${(proc.pct / 0.25).toFixed(1)}× OCDE`}
                  </text>
                )}
              </g>
            )
          })}

          {/* Vendor nodes (col 2) */}
          {vendorNodes.map((vendor, i) => {
            const y = nodeY(i)
            const riskLevel = getRiskLevelFromScore(vendor.avgRisk ?? 0)
            const riskColor = RISK_COLORS[riskLevel]
            const isHovered = hoveredVendor === vendor.id
            const dimmed = hoveredVendor !== null && !isHovered
            const shortName = vendor.name.length > 18
              ? vendor.name.slice(0, 16) + '…'
              : vendor.name

            return (
              <g
                key={vendor.id}
                style={{
                  cursor: 'pointer',
                  opacity: vendor.isFP ? (dimmed ? 0.15 : 0.45) : (dimmed ? 0.4 : 1),
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={() => setHoveredVendor(vendor.id)}
                onMouseLeave={() => setHoveredVendor(null)}
                onClick={() => navigate(`/vendors/${vendor.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/vendors/${vendor.id}`) }}
                aria-label={`${vendor.name}: ${formatCompactMXN(vendor.value)}${vendor.isFP ? ' (FP estructural)' : ''}`}
              >
                {/* Risk border on right */}
                <rect
                  x={colX(2) + COL_W - 3}
                  y={y + 2}
                  width={3}
                  height={NODE_H - 4}
                  fill={riskColor}
                  fillOpacity={0.8}
                  rx={1}
                />
                <rect
                  x={colX(2)}
                  y={y}
                  width={COL_W - 5}
                  height={NODE_H}
                  fill={isHovered ? 'var(--color-background-elevated)' : 'transparent'}
                  rx={3}
                />
                <text
                  x={colX(2) + 4}
                  y={y + 13}
                  fill="var(--color-text-primary)"
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {shortName}
                </text>
                <text
                  x={colX(2) + 4}
                  y={y + 23}
                  fill="var(--color-text-muted)"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  {formatCompactMXN(vendor.value)}
                  {vendor.isFP ? '  FP' : ''}
                </text>
              </g>
            )
          })}

          {/* "Top inst values" are used for sizing — suppress lint warning */}
          {instTotalValues.length === 0 && procTotalValues.length === 0 ? null : null}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-mono text-text-muted">
        <span>
          <span
            className="inline-block w-2 h-2 rounded-sm mr-1"
            style={{ backgroundColor: sectorColor, opacity: 0.7 }}
          />
          {isEs ? 'grosor = gasto MXN' : 'width = MXN flow'}
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-sm mr-1 bg-risk-critical opacity-80" />
          {isEs ? 'riesgo crítico' : 'critical risk'}
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-sm mr-1 bg-risk-high opacity-80" />
          {isEs ? 'riesgo alto' : 'high risk'}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          {isEs ? 'hover → traza el flujo · click → dossier' : 'hover → trace flow · click → dossier'}
        </span>
      </div>
    </div>
  )
}
