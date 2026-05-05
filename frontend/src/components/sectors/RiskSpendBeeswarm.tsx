/**
 * RiskSpendBeeswarm — HERO 3 of the Sectors redesign (Phase P4)
 *
 * Pudding "Spotify Audio Aesthetic" vocabulary: each sector is one labeled
 * circle on a risk × log(spend) plane, sized by contract count.
 *
 * Encoding:
 *   X  = avg_risk_score × 100   (0–40 range)
 *   Y  = log10(total_value_mxn)  with axis labels in compact MXN
 *   R  = clamp(6, sqrt(total_contracts) × k, 28)
 *   Fill = SECTOR_COLORS[code] at 0.85 opacity
 *   Stroke = 1.5px white at 0.6 opacity
 *
 * Annotations:
 *   • Amber quadrant (risk ≥ 0.20 AND log-spend ≥ 9 i.e. ≥ 1B)
 *     labeled "PRIORIDAD" / "PRIORITY" — the editorial assertion
 *   • OECD 25% vertical dashed reference line
 *   • Agricultura connector callout → Segalmex caveat
 *
 * Interactivity:
 *   • Hover: hovered circle scales 1.15×, others dim to 0.4 opacity
 *   • Tooltip/side-panel with 6 KPIs + "Investigar →" CTA
 *   • Click: /sectors/:id
 *   • Keyboard: ArrowDown/ArrowUp cycle sectors in spend order; Enter navigates
 *
 * Plan: docs/SECTORS_REDESIGN_PLAN.md §5 HERO 3
 * Build: 2026-05-04-p4
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
import { SECTOR_COLORS, SECTOR_TEXT_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import type { SectorStatistics } from '@/api/types'

// ── geometry ──────────────────────────────────────────────────────────────────

const MARGIN = { top: 28, right: 72, bottom: 52, left: 80 }
const HEIGHT_DESKTOP = 480
const HEIGHT_MOBILE = 380

// X domain: risk × 100, 0–40
const X_MIN = 0
const X_MAX = 40

// Y domain: log10(spend), 8 (100M) to 13 (10T)
const Y_MIN = 8   // 10^8 = 100M
const Y_MAX = 13  // 10^13 = 10T

// Quadrant thresholds (raw model units)
const QUADRANT_RISK_THRESHOLD = 0.20   // risk ≥ 20% → right of line
const QUADRANT_SPEND_THRESHOLD = 9      // log10(1B) = 9

// OECD reference
const OECD_RISK_PCT = 25

// Amber for priority quadrant — the one raw hex permitted by spec
const QUADRANT_AMBER = '#f59e0b'

// Y-axis tick values as [log10 value, label]
const Y_TICKS: Array<[number, string]> = [
  [8, '100M'],
  [9, '1B'],
  [10, '10B'],
  [11, '100B'],
  [12, '1T'],
  [13, '10T'],
]

// X-axis ticks (risk %)
const X_TICKS = [10, 20, 25, 30, 40]

// ── helpers ───────────────────────────────────────────────────────────────────

function clamp(min: number, val: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/** Radius from total_contracts, k tuned so ~3.06M contracts (salud ~1M+) → 28px */
function circleRadius(totalContracts: number): number {
  // sqrt(3_100_000) ≈ 1760; k = 28/1760 ≈ 0.016
  const k = 0.016
  return clamp(6, Math.sqrt(totalContracts) * k, 28)
}

// ── types ─────────────────────────────────────────────────────────────────────

interface BeeNode extends SimulationNodeDatum {
  sector: SectorStatistics
  cx: number  // px on SVG (locked — only label positions are forced)
  cy: number  // px on SVG (locked)
  r: number
  labelX: number
  labelY: number
}

// ── component ─────────────────────────────────────────────────────────────────

interface RiskSpendBeeswarmProps {
  sectors: SectorStatistics[]
}

export function RiskSpendBeeswarm({ sectors }: RiskSpendBeeswarmProps) {
  const { i18n } = useTranslation('sectors')
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(800)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null)

  const isMobile = width < 640
  const height = isMobile ? HEIGHT_MOBILE : HEIGHT_DESKTOP
  const innerW = width - MARGIN.left - MARGIN.right
  const innerH = height - MARGIN.top - MARGIN.bottom

  // ── resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // ── scale helpers ──────────────────────────────────────────────────────────
  const xScale = useCallback(
    (riskPct: number) => ((riskPct - X_MIN) / (X_MAX - X_MIN)) * innerW,
    [innerW],
  )
  const yScale = useCallback(
    (log10Val: number) => innerH - ((log10Val - Y_MIN) / (Y_MAX - Y_MIN)) * innerH,
    [innerH],
  )

  // ── sorted spend order (for keyboard nav) ─────────────────────────────────
  const spendOrder = useMemo(
    () => [...sectors].sort((a, b) => b.total_value_mxn - a.total_value_mxn),
    [sectors],
  )

  // ── compute circle positions ───────────────────────────────────────────────
  const nodes = useMemo<BeeNode[]>(() => {
    return sectors.map((s) => {
      const riskPct = s.avg_risk_score * 100
      const log10Spend = Math.log10(Math.max(1, s.total_value_mxn))
      const cx = xScale(riskPct)
      const cy = yScale(log10Spend)
      const r = circleRadius(s.total_contracts)
      return {
        sector: s,
        cx,
        cy,
        x: cx,
        y: cy,
        r,
        // initial label offset: right of circle
        labelX: cx + r + 5,
        labelY: cy + 4,
      }
    })
  }, [sectors, xScale, yScale])

  // ── d3-force label de-overlap ──────────────────────────────────────────────
  // We only force-simulate the label positions, not the circles themselves.
  // Circles are pinned to their data positions (fx/fy in the simulation).
  const [labelPositions, setLabelPositions] = useState<Array<{ x: number; y: number }>>(
    () => nodes.map((n) => ({ x: n.labelX, y: n.labelY })),
  )

  useEffect(() => {
    if (nodes.length === 0) return

    // Create virtual "label nodes" that repel each other and are attracted
    // back toward their anchor (right of parent circle).
    type LNode = SimulationNodeDatum & { idx: number; anchorX: number; anchorY: number }
    const labelNodes: LNode[] = nodes.map((n, idx) => ({
      idx,
      anchorX: n.cx + n.r + 5,
      anchorY: n.cy + 4,
      x: n.cx + n.r + 5,
      y: n.cy + 4,
    }))

    // Stronger collide + weaker anchors so labels can travel further from
    // their anchor when the alternative is overlapping a neighbor. Previous
    // tuning (r=18, strength=0.6) left Hacienda overlapping Educación and
    // Defensa overlapping Gobernación in the prod beeswarm.
    const sim = forceSimulation<LNode>(labelNodes)
      .force('collideLabel', forceCollide<LNode>(28).strength(1).iterations(6))
      .force('anchorX', forceX<LNode>((d) => d.anchorX).strength(0.18))
      .force('anchorY', forceY<LNode>((d) => d.anchorY).strength(0.22))
      .alphaDecay(0.04)
      .stop()

    // Run synchronously (no animation needed for static positions)
    for (let i = 0; i < 200; i++) sim.tick()

    setLabelPositions(labelNodes.map((n) => ({ x: n.x ?? n.anchorX, y: n.y ?? n.anchorY })))
  }, [nodes])

  // ── quadrant geometry ──────────────────────────────────────────────────────
  const quadrantX = xScale(QUADRANT_RISK_THRESHOLD * 100)  // risk ≥ 20% → px
  const quadrantY = yScale(QUADRANT_SPEND_THRESHOLD)        // spend ≥ 1B → px (y decreases upward)
  const quadrantW = innerW - quadrantX
  const quadrantH = quadrantY  // from top to 1B line

  // ── OECD reference x ──────────────────────────────────────────────────────
  const oecdX = xScale(OECD_RISK_PCT)

  // ── Agricultura circle ────────────────────────────────────────────────────
  const agricNode = nodes.find((n) => n.sector.sector_code === 'agricultura')

  // ── focused sector (keyboard) ─────────────────────────────────────────────
  const focusedSector = focusedIdx !== null ? spendOrder[focusedIdx] : null
  const activeId = hoveredId ?? focusedSector?.sector_id ?? null
  const activeSector = nodes.find((n) => n.sector.sector_id === activeId)?.sector ?? null

  // ── keyboard handler ──────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIdx((prev) => {
          const next = prev === null ? 0 : Math.min(prev + 1, spendOrder.length - 1)
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIdx((prev) => {
          const next = prev === null ? spendOrder.length - 1 : Math.max(prev - 1, 0)
          return next
        })
      } else if (e.key === 'Enter' && focusedSector) {
        navigate(`/sectors/${focusedSector.sector_id}`)
      } else if (e.key === 'Escape') {
        setFocusedIdx(null)
      }
    },
    [spendOrder, focusedSector, navigate],
  )

  const isEs = i18n.language === 'es'

  return (
    <div className="relative" ref={containerRef}>
      {/* ── SVG chart ──────────────────────────────────────────────────────── */}
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={
          isEs
            ? 'Diagrama de burbujas: riesgo × gasto por sector'
            : 'Bubble chart: risk × spend by sector'
        }
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ outline: 'none', display: 'block' }}
        onBlur={() => setFocusedIdx(null)}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

          {/* ── priority quadrant fill ──────────────────────────────────── */}
          {quadrantW > 0 && quadrantH > 0 && (
            <>
              <rect
                x={quadrantX}
                y={0}
                width={quadrantW}
                height={quadrantY}
                fill={QUADRANT_AMBER}
                fillOpacity={0.06}
                aria-hidden="true"
              />
              {/* Top-right label */}
              <text
                x={innerW - 4}
                y={14}
                textAnchor="end"
                fontFamily="var(--font-family-mono, monospace)"
                fontSize={isMobile ? 9 : 11}
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

          {/* ── Y grid lines (subtle) ──────────────────────────────────── */}
          {Y_TICKS.map(([log10Val]) => {
            const y = yScale(log10Val)
            if (y < 0 || y > innerH) return null
            return (
              <line
                key={log10Val}
                x1={0}
                x2={innerW}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth={0.5}
                strokeDasharray="2,4"
                aria-hidden="true"
              />
            )
          })}

          {/* ── OECD reference vertical line ───────────────────────────── */}
          <line
            x1={oecdX}
            x2={oecdX}
            y1={0}
            y2={innerH}
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

          {/* ── Circles ────────────────────────────────────────────────── */}
          {nodes.map((node) => {
            const isHovered = activeId === node.sector.sector_id
            const isDimmed = activeId !== null && !isHovered
            const isFocused = focusedSector?.sector_id === node.sector.sector_id
            const color = SECTOR_COLORS[node.sector.sector_code] ?? '#64748b'

            return (
              <circle
                key={node.sector.sector_id}
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                fill={color}
                fillOpacity={isDimmed ? 0.18 : 0.85}
                stroke="white"
                strokeWidth={1.5}
                strokeOpacity={isDimmed ? 0.1 : 0.6}
                style={{
                  transform: isHovered ? `scale(1.15)` : 'scale(1)',
                  transformOrigin: `${node.cx}px ${node.cy}px`,
                  transformBox: 'fill-box',
                  transition: 'transform 0.15s ease, fill-opacity 0.15s, stroke-opacity 0.15s',
                  cursor: 'pointer',
                  outline: isFocused ? `2px solid ${color}` : undefined,
                }}
                role="button"
                aria-label={`${node.sector.sector_name} — ${(node.sector.avg_risk_score * 100).toFixed(1)}% riesgo, ${formatCompactMXN(node.sector.total_value_mxn)}`}
                tabIndex={-1}
                onMouseEnter={() => setHoveredId(node.sector.sector_id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => navigate(`/sectors/${node.sector.sector_id}`)}
              />
            )
          })}

          {/* ── Labels ─────────────────────────────────────────────────── */}
          {nodes.map((node, idx) => {
            const isHovered = activeId === node.sector.sector_id
            const isDimmed = activeId !== null && !isHovered
            const color = SECTOR_COLORS[node.sector.sector_code] ?? '#64748b'
            // Text label uses AA-safe darker variant; connector stroke keeps vivid color
            const textColor = SECTOR_TEXT_COLORS[node.sector.sector_code] ?? color
            const pos = labelPositions[idx] ?? { x: node.labelX, y: node.labelY }

            // Connector line from circle edge to label
            const angle = Math.atan2(pos.y - node.cy, pos.x - node.cx)
            const lineX1 = node.cx + Math.cos(angle) * node.r
            const lineY1 = node.cy + Math.sin(angle) * node.r

            return (
              <g
                key={`label-${node.sector.sector_id}`}
                style={{ opacity: isDimmed ? 0.2 : 1, transition: 'opacity 0.15s' }}
                aria-hidden="true"
              >
                {/* Connector — vivid color OK for strokes ≥ 1px (not text) */}
                <line
                  x1={lineX1}
                  y1={lineY1}
                  x2={pos.x - 4}
                  y2={pos.y - 2}
                  stroke={color}
                  strokeWidth={0.75}
                  strokeOpacity={0.5}
                />
                {/* Label — AA-safe darker text color */}
                <text
                  x={pos.x}
                  y={pos.y}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontSize={isMobile ? 9 : 11}
                  fill={textColor}
                  fontWeight={isHovered ? 700 : 500}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {isEs
                    ? (node.sector.sector_name || node.sector.sector_code)
                    : (node.sector.sector_code.charAt(0).toUpperCase() + node.sector.sector_code.slice(1))}
                </text>
              </g>
            )
          })}

          {/* ── Agricultura caveat callout ──────────────────────────────── */}
          {agricNode && (() => {
            const isDimmed = activeId !== null && activeId !== agricNode.sector.sector_id
            // Place callout to the right/below the agriculture circle
            const calloutX = Math.min(agricNode.cx + agricNode.r + 10, innerW - 10)
            const calloutY = agricNode.cy + agricNode.r + 20
            return (
              <g
                aria-hidden="true"
                style={{ opacity: isDimmed ? 0.15 : 0.75, transition: 'opacity 0.15s' }}
              >
                {/* Thin connector from circle bottom to callout */}
                <line
                  x1={agricNode.cx}
                  y1={agricNode.cy + agricNode.r}
                  x2={calloutX}
                  y2={calloutY - 4}
                  stroke={SECTOR_COLORS.agricultura}
                  strokeWidth={0.75}
                  strokeDasharray="2,2"
                  strokeOpacity={0.6}
                />
                {/* Callout text — AA-safe darker green (green-800) instead of green-500 */}
                <text
                  x={calloutX}
                  y={calloutY}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontSize={isMobile ? 8 : 9}
                  fill={SECTOR_TEXT_COLORS.agricultura}
                  fillOpacity={0.8}
                >
                  {isEs
                    ? 'Puntaje inflado por Segalmex (caso GT)'
                    : 'Score inflated by Segalmex (GT case)'}
                </text>
                <text
                  x={calloutX}
                  y={calloutY + 11}
                  fontFamily="var(--font-family-mono, monospace)"
                  fontSize={isMobile ? 8 : 9}
                  fill={SECTOR_TEXT_COLORS.agricultura}
                  fillOpacity={0.65}
                >
                  {isEs ? '→ ver /thread/segalmex' : '→ see /thread/segalmex'}
                </text>
              </g>
            )
          })()}

          {/* ── X axis ─────────────────────────────────────────────────── */}
          <line
            x1={0} x2={innerW}
            y1={innerH} y2={innerH}
            stroke="var(--color-border)"
            strokeWidth={0.75}
            aria-hidden="true"
          />
          {X_TICKS.map((tick) => {
            const x = xScale(tick)
            const isOECD = tick === 25
            return (
              <g key={tick} aria-hidden="true">
                <line
                  x1={x} x2={x}
                  y1={innerH} y2={innerH + 4}
                  stroke={isOECD ? '#22d3ee' : 'var(--color-border)'}
                  strokeWidth={isOECD ? 1.5 : 0.75}
                />
                <text
                  x={x}
                  y={innerH + 16}
                  textAnchor="middle"
                  fontFamily="var(--font-family-mono, monospace)"
                  fontSize={9}
                  fill={isOECD ? '#22d3ee' : 'var(--color-text-muted)'}
                  fillOpacity={isOECD ? 0.9 : 0.7}
                >
                  {tick}%
                </text>
              </g>
            )
          })}
          {/* X axis label */}
          <text
            x={innerW / 2}
            y={innerH + 38}
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

          {/* ── Y axis ─────────────────────────────────────────────────── */}
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
          {/* Y axis label (rotated) */}
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

      {/* ── Hover tooltip / info panel ──────────────────────────────────────── */}
      {activeSector && (
        <BeeswarmTooltip
          sector={activeSector}
          isEs={isEs}
          onNavigate={() => navigate(`/sectors/${activeSector.sector_id}`)}
        />
      )}

      {/* ── Keyboard hint ──────────────────────────────────────────────────── */}
      <p className="mt-2 text-[10px] font-mono text-text-muted opacity-60" aria-live="polite">
        {focusedSector
          ? (isEs
              ? `${focusedSector.sector_name} seleccionado — Enter para investigar`
              : `${focusedSector.sector_name} selected — Enter to investigate`)
          : (isEs
              ? '↑ ↓ navegar sectores · Enter para abrir · clic en círculo'
              : '↑ ↓ navigate sectors · Enter to open · click circle')}
      </p>
    </div>
  )
}

// ── Tooltip panel ─────────────────────────────────────────────────────────────

interface BeeswarmTooltipProps {
  sector: SectorStatistics
  isEs: boolean
  onNavigate: () => void
}

function BeeswarmTooltip({ sector, isEs, onNavigate }: BeeswarmTooltipProps) {
  const color = SECTOR_COLORS[sector.sector_code] ?? '#64748b'
  const riskLevel = getRiskLevelFromScore(sector.avg_risk_score)
  const riskLabels: Record<string, string> = {
    critical: isEs ? 'Crítico' : 'Critical',
    high: isEs ? 'Alto' : 'High',
    medium: isEs ? 'Medio' : 'Medium',
    low: isEs ? 'Bajo' : 'Low',
  }

  return (
    <div
      className="absolute top-4 right-0 w-52 bg-background-card border border-border rounded-sm p-3 shadow-lg pointer-events-auto"
      style={{ borderLeft: `3px solid ${color}` }}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Header */}
      <p
        className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] mb-0.5"
        style={{ color }}
      >
        {sector.sector_code}
      </p>
      <p className="text-sm font-bold text-text-primary mb-2 leading-tight">
        {sector.sector_name}
      </p>

      {/* 6 KPIs */}
      <div className="space-y-1 text-[11px] font-mono">
        <KpiRow
          label={isEs ? 'Riesgo prom.' : 'Avg risk'}
          value={`${(sector.avg_risk_score * 100).toFixed(1)}% (${riskLabels[riskLevel]})`}
          color={color}
        />
        <KpiRow
          label={isEs ? 'Gasto total' : 'Total spend'}
          value={formatCompactMXN(sector.total_value_mxn)}
        />
        <KpiRow
          label={isEs ? 'Contratos' : 'Contracts'}
          value={formatNumber(sector.total_contracts)}
        />
        <KpiRow
          label={isEs ? 'Adj. directa' : 'Direct award'}
          value={`${(sector.direct_award_pct ?? 0).toFixed(0)}%`}
          highlight={(sector.direct_award_pct ?? 0) > 25}
        />
        <KpiRow
          label={isEs ? 'Lic. única' : 'Single bid'}
          value={`${(sector.single_bid_pct ?? 0).toFixed(1)}%`}
        />
        <KpiRow
          label={isEs ? 'Proveedores' : 'Vendors'}
          value={formatNumber(sector.total_vendors ?? 0)}
        />
      </div>

      {/* CTA */}
      <button
        onClick={onNavigate}
        className="mt-3 w-full text-[10px] font-mono font-bold uppercase tracking-[0.12em] py-1.5 rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
        style={{
          backgroundColor: `${color}18`,
          color,
          border: `1px solid ${color}40`,
        }}
      >
        {isEs ? 'Investigar →' : 'Investigate →'}
      </button>
    </div>
  )
}

interface KpiRowProps {
  label: string
  value: string
  color?: string
  highlight?: boolean
}

function KpiRow({ label, value, color, highlight }: KpiRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-text-muted shrink-0">{label}</span>
      <span
        className="tabular-nums text-right"
        style={{
          color: highlight ? '#ef4444' : (color ?? 'var(--color-text-secondary)'),
          fontWeight: highlight ? 700 : 500,
        }}
      >
        {value}
      </span>
    </div>
  )
}
