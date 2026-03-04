import { useMemo, useState, useCallback } from 'react'
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'

interface SankeyNodeInput {
  id: string
  name: string
  type: 'institution' | 'vendor'
  riskLevel: string
}

interface SankeyLinkInput {
  source: string
  target: string
  value: number
  contractCount: number
  avgRisk: number
}

export interface SankeyNodeSelected {
  id: string
  name: string
  type: 'institution' | 'vendor'
  riskLevel: string
  totalValue: number
  contractCount: number
}

interface SankeyDiagramProps {
  nodes: SankeyNodeInput[]
  links: SankeyLinkInput[]
  width?: number
  height?: number
  onFlowClick?: (sourceId: string, targetId: string) => void
  onNodeClick?: (node: SankeyNodeSelected) => void
  selectedNodeId?: string
}

const RISK_COLORS: Record<string, string> = {
  critical: '#f87171',
  high:     '#fb923c',
  medium:   '#fbbf24',
  low:      '#4ade80',
  unknown:  '#64748b',
}

// Dark background so labels always readable regardless of flow color beneath them
const LABEL_BG = '#0f1629'

function formatMXN(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B MXN`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M MXN`
  return `${(v / 1e3).toFixed(0)}K MXN`
}

/** Truncate with ellipsis, trying to keep the most meaningful part of the name */
function truncate(name: string, maxChars: number): string {
  if (name.length <= maxChars) return name
  return name.slice(0, maxChars - 1) + '…'
}

/** Estimate SVG text width: roughly 0.57× fontSize per character for sans-serif */
function estWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.57
}

export function SankeyDiagram({
  nodes,
  links,
  width = 900,
  height = 500,
  onFlowClick,
  onNodeClick,
  selectedNodeId,
}: SankeyDiagramProps) {
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    lines: string[]
    riskColor?: string
  } | null>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent, lines: string[], riskColor?: string) => {
    setTooltip({ x: e.clientX, y: e.clientY, lines, riskColor })
  }, [])

  const result = useMemo(() => {
    if (!nodes.length || !links.length) return null

    const nodeById = new Map(nodes.map((n, i) => [n.id, i]))

    const graphNodes = nodes.map(n => ({ ...n }))
    const graphLinks = links
      .filter(l => nodeById.has(l.source) && nodeById.has(l.target))
      .map(l => ({
        ...l,
        source: nodeById.get(l.source) as number,
        target: nodeById.get(l.target) as number,
      }))

    if (!graphLinks.length) return null

    try {
      // Reserve margin on both sides for labels: 220px left, 220px right
      const LABEL_MARGIN = 220
      const layout = d3Sankey()
        .nodeId(((_d: any, i: number) => i) as any)
        .nodeWidth(16)
        .nodePadding(12)
        .extent([[LABEL_MARGIN, 4], [width - LABEL_MARGIN, height - 4]])

      return layout({ nodes: graphNodes as any, links: graphLinks as any })
    } catch {
      return null
    }
  }, [nodes, links, width, height])

  if (!result) return null

  const { nodes: sNodes, links: sLinks } = result

  return (
    <div className="relative select-none overflow-x-auto">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          {sLinks.map((link, i) => {
            const src = link.source as any
            const tgt = link.target as any
            const ld  = link as any
            const avgRisk: number = ld.avgRisk ?? 0
            let flowColor: string
            if      (avgRisk >= 0.5) flowColor = RISK_COLORS.critical
            else if (avgRisk >= 0.3) flowColor = RISK_COLORS.high
            else if (avgRisk >= 0.1) flowColor = RISK_COLORS.medium
            else                     flowColor = RISK_COLORS.low
            const sc = avgRisk > 0 ? flowColor : (RISK_COLORS[src.riskLevel] ?? RISK_COLORS.unknown)
            const tc = avgRisk > 0 ? flowColor : (RISK_COLORS[tgt.riskLevel] ?? RISK_COLORS.unknown)
            return (
              <linearGradient key={i} id={`lg-${i}`} x1="0%" x2="100%">
                <stop offset="0%"   stopColor={sc} stopOpacity={0.50} />
                <stop offset="100%" stopColor={tc} stopOpacity={0.40} />
              </linearGradient>
            )
          })}
          <style>{`
            @keyframes sankeyDash { to { stroke-dashoffset: -20; } }
          `}</style>
        </defs>

        {/* ── Links ─────────────────────────────────────────────── */}
        {sLinks.map((link, i) => {
          const pathD = sankeyLinkHorizontal()(link as any)
          const src   = link.source as any
          const tgt   = link.target as any
          const ld    = link as any
          const strokeW = Math.max(1.5, (link as any).width ?? 1.5)
          const isRelated = selectedNodeId && (src.id === selectedNodeId || tgt.id === selectedNodeId)
          const avgRisk   = (ld.avgRisk ?? 0) * 100
          const riskLabel = avgRisk >= 50 ? 'Critical' : avgRisk >= 30 ? 'High' : avgRisk >= 10 ? 'Medium' : 'Low'
          const riskColor = avgRisk >= 50 ? RISK_COLORS.critical : avgRisk >= 30 ? RISK_COLORS.high : avgRisk >= 10 ? RISK_COLORS.medium : RISK_COLORS.low

          return (
            <path
              key={i}
              d={pathD || ''}
              fill="none"
              stroke={`url(#lg-${i})`}
              strokeWidth={strokeW}
              strokeDasharray={`${strokeW * 2} ${strokeW}`}
              className="cursor-pointer transition-opacity"
              opacity={selectedNodeId && !isRelated ? 0.15 : 0.9}
              style={{ animation: 'sankeyDash 1.4s linear infinite' }}
              onClick={() => onFlowClick?.(src.id, tgt.id)}
              onMouseMove={e => handleMouseMove(e, [
                `${src.name}`,
                `→ ${tgt.name}`,
                `${formatMXN(link.value)}  ·  ${(ld.contractCount ?? 0).toLocaleString()} contracts`,
                `Avg risk: ${avgRisk.toFixed(0)}% — ${riskLabel}`,
              ], riskColor)}
              onMouseLeave={() => setTooltip(null)}
            />
          )
        })}

        {/* ── Nodes + Labels ────────────────────────────────────── */}
        {sNodes.map((node, i) => {
          const n         = node as any
          const color     = RISK_COLORS[n.riskLevel] ?? RISK_COLORS.unknown
          const x0        = n.x0 ?? 0
          const x1        = n.x1 ?? 0
          const y0        = n.y0 ?? 0
          const y1        = n.y1 ?? 0
          const nodeH     = Math.max(1, y1 - y0)
          const isLeft    = x0 < width / 2
          const isSelected = selectedNodeId === n.id

          // Contract count summed across connected links
          const nodeLinks = (sLinks as any[]).filter(
            l => (l.source as any).id === n.id || (l.target as any).id === n.id
          )
          const contractCount = nodeLinks.reduce((s: number, l: any) => s + (l.contractCount ?? 0), 0)

          // ── Label sizing
          // Font scales between 10px (small nodes) and 13px (large nodes)
          const fontSize = Math.min(13, Math.max(10, Math.round(nodeH * 0.4 + 9)))
          // Only render label if node is tall enough to be useful
          const showLabel = nodeH >= 8

          // How many chars can we fit in the available margin (220px reserved)?
          const LABEL_MARGIN = 215
          const maxChars = Math.max(10, Math.floor(LABEL_MARGIN / (fontSize * 0.57)))
          const labelText = truncate(n.name, maxChars)
          const labelW    = estWidth(labelText, fontSize)
          const labelH    = fontSize + 5
          const labelY    = (y0 + y1) / 2

          // For left nodes: label appears to the right of the node
          // For right nodes: label appears to the left of the node
          const GAP = 8
          const textX = isLeft ? x1 + GAP : x0 - GAP
          const bgX   = isLeft ? x1 + GAP - 3 : x0 - GAP - labelW - 3

          return (
            <g
              key={i}
              className="cursor-pointer"
              onClick={() => onNodeClick?.({
                id: n.id,
                name: n.name,
                type: n.type,
                riskLevel: n.riskLevel,
                totalValue: n.value ?? 0,
                contractCount,
              })}
            >
              {/* Selection ring */}
              {isSelected && (
                <rect
                  x={x0 - 3} y={y0 - 3}
                  width={Math.max(1, x1 - x0) + 6}
                  height={nodeH + 6}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  rx={4}
                />
              )}

              {/* Node bar */}
              <rect
                x={x0} y={y0}
                width={Math.max(1, x1 - x0)}
                height={nodeH}
                fill={color}
                opacity={selectedNodeId && !isSelected ? 0.35 : 0.92}
                rx={2}
                onMouseMove={e => handleMouseMove(e, [
                  n.name,
                  formatMXN(n.value ?? 0),
                  `${contractCount.toLocaleString()} contracts`,
                  `Risk: ${n.riskLevel}`,
                ])}
                onMouseLeave={() => setTooltip(null)}
              />

              {/* Label with opaque background for legibility */}
              {showLabel && (
                <>
                  {/* Background pill */}
                  <rect
                    x={bgX}
                    y={labelY - labelH / 2}
                    width={labelW + 6}
                    height={labelH}
                    fill={LABEL_BG}
                    fillOpacity={0.82}
                    rx={3}
                    className="pointer-events-none"
                  />
                  {/* Label text */}
                  <text
                    x={textX}
                    y={labelY}
                    dy="0.35em"
                    textAnchor={isLeft ? 'start' : 'end'}
                    fontSize={fontSize}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fill={isSelected ? '#06b6d4' : '#cbd5e1'}
                    fontWeight={isSelected ? 600 : 400}
                    className="pointer-events-none"
                  >
                    {labelText}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 16, top: tooltip.y - 12 }}
        >
          <div className="bg-[#0f1629] border border-white/10 rounded-md px-3 py-2 shadow-xl text-xs space-y-0.5 min-w-[180px]">
            {tooltip.lines.map((line, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? 'font-semibold text-slate-200'
                    : i === tooltip.lines.length - 1 && tooltip.riskColor
                    ? 'font-medium'
                    : 'text-slate-400'
                }
                style={i === tooltip.lines.length - 1 && tooltip.riskColor ? { color: tooltip.riskColor } : undefined}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
