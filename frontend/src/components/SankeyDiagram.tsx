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

interface SankeyDiagramProps {
  nodes: SankeyNodeInput[]
  links: SankeyLinkInput[]
  width?: number
  height?: number
  onFlowClick?: (sourceId: string, targetId: string) => void
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
            const sc = RISK_COLORS[src.riskLevel] ?? RISK_COLORS.unknown
            const tc = RISK_COLORS[tgt.riskLevel] ?? RISK_COLORS.unknown
            return (
              <linearGradient key={i} id={`lg-${i}`} x1="0%" x2="100%">
                <stop offset="0%" stopColor={sc} stopOpacity={0.4} />
                <stop offset="100%" stopColor={tc} stopOpacity={0.4} />
              </linearGradient>
            )
          })}
        </defs>

        {/* Links */}
        {sLinks.map((link, i) => {
          const pathD = sankeyLinkHorizontal()(link as any)
          const src = link.source as any
          const tgt = link.target as any
          const ld = link as any
          return (
            <path
              key={i}
              d={pathD || ''}
              fill="none"
              stroke={`url(#lg-${i})`}
              strokeWidth={Math.max(1, (link as any).width ?? 1)}
              className="cursor-pointer transition-opacity hover:opacity-75"
              onClick={() => onFlowClick?.(src.id, tgt.id)}
              onMouseEnter={e =>
                setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  content: `${src.name} → ${tgt.name}\n${formatMXN(link.value)}\n${ld.contractCount ?? ''} contracts · avg risk ${((ld.avgRisk ?? 0) * 100).toFixed(0)}%`,
                })
              }
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
          return (
            <g key={i}>
              <rect
                x={x0}
                y={y0}
                width={Math.max(1, x1 - x0)}
                height={Math.max(1, y1 - y0)}
                fill={color}
                opacity={0.85}
                rx={2}
                onMouseEnter={e =>
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    content: `${n.name}\n${formatMXN(n.value ?? 0)}`,
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
                fill="currentColor"
                className="text-text-secondary pointer-events-none"
              >
                {n.name.length > 24 ? n.name.slice(0, 24) + '…' : n.name}
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
