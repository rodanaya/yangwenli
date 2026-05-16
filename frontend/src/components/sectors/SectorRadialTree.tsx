/**
 * SectorRadialTree — radial node-link tree for the 12 sectors
 *
 * Central hub = Federal procurement total
 * 12 sector nodes on an inner ring, sized by sqrt(spend)
 * Edges: curved bezier from hub to each node
 * Color: SECTOR_COLORS with risk-opacity tint
 * Click → /sectors/:id
 */

import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { SECTOR_COLORS, getSectorName, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import type { SectorStatistics } from '@/api/types'

// ── Sector shape helpers (mirrors ExploreCanvas Z0 geometry, backlog #10) ────
// Each returns an SVG element centered at (cx,cy) with inscribed radius r.
// Shapes encode sector identity: salud=cross, defensa=pentagon, etc.

import React from 'react'

function polyPoints(cx: number, cy: number, r: number, sides: number, rotDeg = 0): string {
  return Array.from({ length: sides }, (_, i) => {
    const a = ((i * 360) / sides + rotDeg) * (Math.PI / 180)
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}
function starPoints(cx: number, cy: number, R: number, ri: number, pts: number): string {
  const out: string[] = []
  for (let i = 0; i < pts * 2; i++) {
    const rad = ((i * 180) / pts - 90) * (Math.PI / 180)
    const d = i % 2 === 0 ? R : ri
    out.push(`${(cx + d * Math.cos(rad)).toFixed(2)},${(cy + d * Math.sin(rad)).toFixed(2)}`)
  }
  return out.join(' ')
}
function getSectorShapeEl(
  code: string, cx: number, cy: number, r: number,
  fill: string, fillOpacity: number, stroke: string, strokeWidth: number,
): React.ReactElement {
  const p = { fill, fillOpacity, stroke, strokeWidth }
  switch (code) {
    case 'salud': {
      const arm = r * 0.42, w = r * 0.35
      const d = [`M ${cx-w} ${cy-arm}`,`L ${cx+w} ${cy-arm}`,`L ${cx+w} ${cy-w}`,`L ${cx+arm} ${cy-w}`,
        `L ${cx+arm} ${cy+w}`,`L ${cx+w} ${cy+w}`,`L ${cx+w} ${cy+arm}`,`L ${cx-w} ${cy+arm}`,
        `L ${cx-w} ${cy+w}`,`L ${cx-arm} ${cy+w}`,`L ${cx-arm} ${cy-w}`,`L ${cx-w} ${cy-w}`,'Z'].join(' ')
      return <path d={d} {...p} />
    }
    case 'defensa':    return <polygon points={polyPoints(cx,cy,r,5,-90)} {...p} />
    case 'tecnologia': return <polygon points={polyPoints(cx,cy,r,6,0)} {...p} />
    case 'hacienda':   return <polygon points={polyPoints(cx,cy,r,4,-45)} {...p} />
    case 'infraestructura': return <polygon points={polyPoints(cx,cy,r,3,-90)} {...p} />
    case 'gobernacion': return <polygon points={starPoints(cx,cy,r,r*0.42,5)} {...p} />
    case 'agricultura': return <polygon points={polyPoints(cx,cy,r,8,22.5)} {...p} />
    case 'ambiente':   return <polygon points={starPoints(cx,cy,r,r*0.5,6)} {...p} />
    case 'energia': {
      const q = r
      const d = [`M ${cx+q*0.15} ${cy-q}`,`L ${cx-q*0.1} ${cy-q*0.05}`,`L ${cx+q*0.25} ${cy-q*0.05}`,
        `L ${cx-q*0.15} ${cy+q}`,`L ${cx+q*0.1} ${cy+q*0.1}`,`L ${cx-q*0.2} ${cy+q*0.1}`,
        `L ${cx+q*0.15} ${cy-q}`,'Z'].join(' ')
      return <path d={d} {...p} />
    }
    case 'trabajo':   return <polygon points={polyPoints(cx,cy,r,12,15)} {...p} />
    case 'educacion': return <polygon points={polyPoints(cx,cy,r,4,0)} {...p} />
    default:          return <circle cx={cx} cy={cy} r={r} {...p} />
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function nodeFill(code: string, riskScore: number): string {
  const hex = SECTOR_COLORS[code] ?? '#64748b'
  const [r, g, b] = hexToRgb(hex)
  const clamped = Math.max(0, Math.min(1, (riskScore - 0.10) / 0.30))
  const a = 0.40 + 0.55 * clamped
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipState { sector: SectorStatistics; x: number; y: number }

function Tooltip({ data, lang }: { data: TooltipState; lang: string }) {
  const s = data.sector
  const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'
  const rl = getRiskLevelFromScore(s.avg_risk_score)
  const riskColor =
    rl === 'critical' ? '#ef4444' : rl === 'high' ? '#f59e0b' : rl === 'medium' ? '#a16207' : '#71717a'
  const tipW = 210
  const tipH = 200
  const left = data.x + tipW > window.innerWidth - 32 ? data.x - tipW - 8 : data.x + 14
  const top  = data.y + tipH > window.innerHeight - 32 ? data.y - tipH - 8 : data.y + 14

  const rows = [
    { label: lang === 'es' ? 'Gasto total'        : 'Total spend',      value: formatCompactMXN(s.total_value_mxn) },
    { label: lang === 'es' ? 'Contratos'           : 'Contracts',        value: formatNumber(s.total_contracts) },
    { label: lang === 'es' ? 'Adj. directa'        : 'Direct award',     value: `${(s.direct_award_pct ?? 0).toFixed(1)}%` },
    { label: lang === 'es' ? 'Indicador de riesgo' : 'Risk indicator',   value: `${(s.avg_risk_score * 100).toFixed(1)}%`, color: riskColor },
  ]

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 select-none rounded border border-[color:var(--color-border)] bg-[color:var(--color-background-card)] shadow-lg"
      style={{ left, top, width: tipW }}
    >
      <div className="h-1 w-full rounded-t" style={{ backgroundColor: color }} />
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-mono font-bold uppercase tracking-[0.15em] mb-2" style={{ color }}>
          {getSectorName(s.sector_code, lang === 'es' ? 'es' : 'en')}
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
        <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.1em] text-[color:var(--color-text-muted)]">
          {lang === 'es' ? 'Clic para ver perfil →' : 'Click to view profile →'}
        </p>
      </div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface SectorRadialTreeProps {
  sectors: SectorStatistics[]
}

// Top-down tree layout: hub at top center → two rows of 6 sectors below.
// Sorted by spend so biggest sectors are in row 1 (prominent position).
// Hub → row1 edges are straight; row1 → row2 edges use short vertical drops
// to give a genuine "branch" feel.

export function SectorRadialTree({ sectors }: SectorRadialTreeProps) {
  const { i18n } = useTranslation('sectors')
  const lang = i18n.language
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Canvas — 760 × 480, hub at top-center
  const W = 760
  const H = 480
  const HUB_X = W / 2
  const HUB_Y = 66
  const HUB_R = 42

  // Sort by spend desc — row 1 gets the biggest 6
  const sorted = useMemo(
    () => [...sectors].sort((a, b) => b.total_value_mxn - a.total_value_mxn),
    [sectors],
  )

  // Node radius proportional to sqrt(spend) — 16px…44px
  const maxSpend = sorted[0]?.total_value_mxn ?? 1
  const nodeRadius = (s: SectorStatistics) => {
    const frac = Math.sqrt(s.total_value_mxn / maxSpend)
    return 16 + frac * 28
  }

  // Layout: two rows of 6
  const N_ROW1 = 6
  const ROW1_Y = 228
  const ROW2_Y = 404
  const PAD_X = 54  // left/right padding

  const nodePositions = useMemo(() => {
    return sorted.map((s, i) => {
      const row = i < N_ROW1 ? 1 : 2
      const j   = i < N_ROW1 ? i : i - N_ROW1
      const n   = i < N_ROW1 ? N_ROW1 : sorted.length - N_ROW1
      const xStep = (W - PAD_X * 2) / Math.max(n - 1, 1)
      const x = n === 1 ? W / 2 : PAD_X + j * xStep
      const y = row === 1 ? ROW1_Y : ROW2_Y
      return { sector: s, x, y, r: nodeRadius(s), row }
    })
  }, [sorted])

  // Row-1 node that is directly "above" each row-2 node (pair by index)
  const row1Nodes = nodePositions.filter((n) => n.row === 1)
  const row2Nodes = nodePositions.filter((n) => n.row === 2)

  const totalSpend     = sectors.reduce((sum, s) => sum + s.total_value_mxn, 0)
  const totalContracts = sectors.reduce((sum, s) => sum + s.total_contracts, 0)

  // Horizontal "tier bus" lines — faint guide at row boundaries
  const ROW1_BUS_Y = ROW1_Y
  const ROW2_BUS_Y = ROW2_Y

  return (
    <div className="relative select-none flex justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W, display: 'block' }}
        role="list"
        aria-label={lang === 'es' ? 'Árbol de sectores de presupuesto federal' : 'Federal budget sector tree'}
      >
        {/* Faint tier bus lines (horizontal reference at each row) */}
        {[ROW1_BUS_Y, ROW2_BUS_Y].map((busY) => (
          <line
            key={busY}
            x1={PAD_X - 10}
            y1={busY}
            x2={W - PAD_X + 10}
            y2={busY}
            stroke="var(--color-border)"
            strokeWidth={0.5}
            strokeDasharray="4 8"
            opacity={0.35}
          />
        ))}

        {/* Hub → Row-1 edges */}
        {row1Nodes.map(({ sector: s, x, y }) => {
          const color = SECTOR_COLORS[s.sector_code] ?? '#64748b'
          const isHov = hovered === s.sector_id
          // Elbow: vertical drop from hub, then angled to node
          const elbowY = HUB_Y + HUB_R + (y - HUB_Y - HUB_R) * 0.35
          return (
            <path
              key={`edge-hub-${s.sector_id}`}
              d={`M ${HUB_X} ${HUB_Y + HUB_R} L ${HUB_X} ${elbowY} L ${x} ${elbowY} L ${x} ${y - nodeRadius(s)}`}
              fill="none"
              stroke={color}
              strokeWidth={isHov ? 2 : 1}
              opacity={hovered === null ? 0.30 : isHov ? 0.70 : 0.10}
              style={{ transition: 'opacity 0.15s, stroke-width 0.15s', pointerEvents: 'none' }}
            />
          )
        })}

        {/* Row-1 → Row-2 connector lines (pair by position order) */}
        {row2Nodes.map(({ sector: s2, x: x2, y: y2 }, j) => {
          const parent = row1Nodes[j] ?? row1Nodes[row1Nodes.length - 1]
          const isHov  = hovered === s2.sector_id || hovered === parent.sector.sector_id
          const color  = SECTOR_COLORS[s2.sector_code] ?? '#64748b'
          const dropY  = (parent.y + y2) / 2
          return (
            <path
              key={`edge-r1r2-${s2.sector_id}`}
              d={`M ${parent.x} ${parent.y + parent.r} L ${parent.x} ${dropY} L ${x2} ${dropY} L ${x2} ${y2 - nodeRadius(s2)}`}
              fill="none"
              stroke={color}
              strokeWidth={isHov ? 1.5 : 0.75}
              strokeDasharray="3 4"
              opacity={hovered === null ? 0.22 : isHov ? 0.55 : 0.08}
              style={{ transition: 'opacity 0.15s', pointerEvents: 'none' }}
            />
          )
        })}

        {/* Sector nodes — rows 1 and 2 */}
        {nodePositions.map(({ sector: s, x, y, r }) => {
          const color    = SECTOR_COLORS[s.sector_code] ?? '#64748b'
          const fill     = nodeFill(s.sector_code, s.avg_risk_score)
          const isHov    = hovered === s.sector_id
          const anyHov   = hovered !== null
          const opacity  = anyHov && !isHov ? 0.30 : 1
          const name     = getSectorName(s.sector_code, lang === 'es' ? 'es' : 'en')
          const isOECD   = (s.direct_award_pct ?? 0) > 25

          return (
            <g
              key={`node-${s.sector_id}`}
              role="listitem"
              style={{ opacity, cursor: 'pointer' }}
              tabIndex={0}
              aria-label={`${name} — ${formatCompactMXN(s.total_value_mxn)}`}
              onPointerEnter={(e) => { setHovered(s.sector_id); setTooltip({ sector: s, x: e.clientX, y: e.clientY }) }}
              onPointerMove={(e)  => { setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null) }}
              onPointerLeave={()  => { setHovered(null); setTooltip(null) }}
              onClick={() => navigate(`/sectors/${s.sector_id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/sectors/${s.sector_id}`) } }}
            >
              {getSectorShapeEl(
                s.sector_code, x, y, r,
                fill, 1,
                isOECD ? '#f59e0b' : color,
                isHov ? 2.5 : isOECD ? 1.5 : 1,
              )}
              {r > 22 && (
                <text
                  x={x} y={y + r + 10}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={r > 36 ? 8.5 : 7.5}
                  fontFamily="var(--font-family-mono)" fontWeight={700}
                  fill="var(--color-text-primary)" opacity={0.75}
                  style={{ pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  {name.length > 9 ? name.slice(0, 9) : name}
                </text>
              )}
              {isOECD && r > 20 && (
                <g style={{ pointerEvents: 'none' }}>
                  <circle cx={x + r - 5} cy={y - r + 5} r={5} fill="#f59e0b" opacity={0.9} />
                  <text x={x + r - 5} y={y - r + 5} textAnchor="middle" dominantBaseline="middle"
                    fontSize={6} fontWeight={800} fontFamily="var(--font-family-mono)" fill="#1a1714">!</text>
                </g>
              )}
            </g>
          )
        })}

        {/* Hub (rendered on top so edges don't overlap it) */}
        <g style={{ pointerEvents: 'none' }}>
          <circle cx={HUB_X} cy={HUB_Y} r={HUB_R}
            fill="var(--color-background-card)" stroke="var(--color-border)" strokeWidth={1.5} />
          <circle cx={HUB_X} cy={HUB_Y} r={HUB_R - 2}
            fill="none" stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="3 4" />
          <text x={HUB_X} y={HUB_Y - 9} textAnchor="middle" dominantBaseline="middle"
            fontSize={12} fontFamily="var(--font-family-serif)" fontStyle="italic" fontWeight={700}
            fill="var(--color-text-primary)">
            {formatCompactMXN(totalSpend).replace(' MXN', '')}
          </text>
          <text x={HUB_X} y={HUB_Y + 5} textAnchor="middle" dominantBaseline="middle"
            fontSize={7} fontFamily="var(--font-family-mono)" fontWeight={600}
            fill="var(--color-text-muted)" style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            MXN TOTAL
          </text>
          <text x={HUB_X} y={HUB_Y + 17} textAnchor="middle" dominantBaseline="middle"
            fontSize={6.5} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.7}>
            {formatNumber(totalContracts)} {lang === 'es' ? 'contratos' : 'contracts'}
          </text>
        </g>

        {/* Row labels */}
        <text x={PAD_X - 18} y={ROW1_Y} textAnchor="end" dominantBaseline="middle"
          fontSize={7} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.5}
          style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {lang === 'es' ? 'Mayor' : 'Larger'}
        </text>
        <text x={PAD_X - 18} y={ROW2_Y} textAnchor="end" dominantBaseline="middle"
          fontSize={7} fontFamily="var(--font-family-mono)" fill="var(--color-text-muted)" opacity={0.5}
          style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {lang === 'es' ? 'Menor' : 'Smaller'}
        </text>
      </svg>

      {tooltip && <Tooltip data={tooltip} lang={lang} />}
    </div>
  )
}
