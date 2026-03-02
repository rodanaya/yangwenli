import React, { useMemo, useState } from 'react'
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
  high: '#fb923c',
  medium: '#fbbf24',
  low: '#4ade80',
  unknown: '#64748b',
}

function formatMXN(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B MXN`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M MXN`
  return `${(v / 1e3).toFixed(0)}K MXN`
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
    content: string
  } | null>(null)

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
      const layout = d3Sankey()
        .nodeId((_d: unknown, i: number) => i)
        .nodeWidth(14)
        .nodePadding(10)
        .extent([[1, 1], [width - 1, height - 5]])

      return layout({ nodes: graphNodes as any, links: graphLinks as any })
    } catch {
      return null
    }
  }, [nodes, links, width, height])

  if (!result) return null

  const { nodes: sNodes, links: sLinks } = result

  return (
    <div className="relative select-none">
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          {sLinks.map((link, i) => {
            const src = link.source as any
            const tgt = link.target as any
            const ld = link as any
            // Color by avgRisk: high avg risk -> red, low -> green, otherwise use node colors
            const avgRisk: number = ld.avgRisk ?? 0
            let flowColor: string
            if (avgRisk >= 0.5) flowColor = RISK_COLORS.critical
            else if (avgRisk >= 0.3) flowColor = RISK_COLORS.high
            else if (avgRisk >= 0.1) flowColor = RISK_COLORS.medium
            else flowColor = RISK_COLORS.low
            // If avgRisk is 0 (no data), fall back to node risk colors
            const sc = avgRisk > 0 ? flowColor : (RISK_COLORS[src.riskLevel] ?? RISK_COLORS.unknown)
            const tc = avgRisk > 0 ? flowColor : (RISK_COLORS[tgt.riskLevel] ?? RISK_COLORS.unknown)
            return (
              <linearGradient key={i} id={`lg-${i}`} x1="0%" x2="100%">
                <stop offset="0%" stopColor={sc} stopOpacity={0.45} />
                <stop offset="100%" stopColor={tc} stopOpacity={0.35} />
              </linearGradient>
            )
          })}
          <style>{`
            @keyframes sankeyDash {
              to { stroke-dashoffset: -20; }
            }
          `}</style>
        </defs>

        {/* Links */}
        {sLinks.map((link, i) => {
          const pathD = sankeyLinkHorizontal()(link as any)
          const src = link.source as any
          const tgt = link.target as any
          const ld = link as any
          const strokeW = Math.max(1, (link as any).width ?? 1)
          const isSourceSelected = selectedNodeId && (src.id === selectedNodeId || tgt.id === selectedNodeId)
          return (
            <path
              key={i}
              d={pathD || ''}
              fill="none"
              stroke={`url(#lg-${i})`}
              strokeWidth={strokeW}
              strokeDasharray={`${strokeW * 2} ${strokeW}`}
              className="cursor-pointer transition-opacity"
              opacity={selectedNodeId && !isSourceSelected ? 0.2 : 1}
              style={{
                animation: 'sankeyDash 1.2s linear infinite',
              }}
              onClick={() => onFlowClick?.(src.id, tgt.id)}
              onMouseEnter={e => {
                const avgRisk = (ld.avgRisk ?? 0) * 100
                const riskLabel = avgRisk >= 50 ? 'Critical (≥50%)' : avgRisk >= 30 ? 'High (≥30%)' : avgRisk >= 10 ? 'Medium (≥10%)' : 'Low (<10%)'
                setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  content: `${src.name} → ${tgt.name}\n${formatMXN(link.value)} · ${ld.contractCount ?? ''} contracts\nRisk: ${avgRisk.toFixed(0)}% — ${riskLabel}\nFlow color = avg corruption risk score`,
                })
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          )
        })}

        {/* Nodes */}
        {sNodes.map((node, i) => {
          const n = node as any
          const color = RISK_COLORS[n.riskLevel] ?? RISK_COLORS.unknown
          const x0 = n.x0 ?? 0
          const x1 = n.x1 ?? 0
          const y0 = n.y0 ?? 0
          const y1 = n.y1 ?? 0
          const isLeft = x0 < width / 2
          const isSelected = selectedNodeId === n.id
          // Compute contract count from connected links
          const nodeLinks = (sLinks as any[]).filter(
            l => (l.source as any).id === n.id || (l.target as any).id === n.id
          )
          const contractCount = nodeLinks.reduce((s: number, l: any) => s + (l.contractCount ?? 0), 0)
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
              {isSelected && (
                <rect
                  x={x0 - 3}
                  y={y0 - 3}
                  width={Math.max(1, x1 - x0) + 6}
                  height={Math.max(1, y1 - y0) + 6}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  rx={4}
                  opacity={0.9}
                />
              )}
              <rect
                x={x0}
                y={y0}
                width={Math.max(1, x1 - x0)}
                height={Math.max(1, y1 - y0)}
                fill={color}
                opacity={selectedNodeId && !isSelected ? 0.4 : 0.9}
                rx={2}
                onMouseEnter={e =>
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    content: `${n.name}\n${formatMXN(n.value ?? 0)}\n${contractCount} contracts`,
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              />
              <text
                x={isLeft ? x1 + 6 : x0 - 6}
                y={(y0 + y1) / 2}
                dy="0.35em"
                textAnchor={isLeft ? 'start' : 'end'}
                fontSize={11}
                fill={isSelected ? '#06b6d4' : 'currentColor'}
                fontWeight={isSelected ? 600 : 400}
                className="text-text-secondary pointer-events-none"
              >
                {n.name.length > 34 ? n.name.slice(0, 34) + '…' : n.name}
              </text>
            </g>
          )
        })}
      </svg>

      {tooltip && (
        <div
          className="fixed z-50 bg-background-elevated border border-border/40 rounded px-2.5 py-2 text-xs text-text-secondary shadow-xl pointer-events-none whitespace-pre"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  )
}
