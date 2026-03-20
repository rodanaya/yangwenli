/**
 * MoneySankeyChart — Sankey/alluvial visualization of institution-to-vendor money flows
 *
 * Left nodes = top institutions (colored by sector)
 * Right nodes = top vendors (colored by risk level)
 * Link width proportional to contract value
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { sankey, sankeyLinkHorizontal, type SankeyNode, type SankeyLink } from 'd3-sankey'
import { formatCompactMXN, toTitleCase } from '@/lib/utils'
import { SECTOR_COLORS } from '@/lib/constants'

interface MoneyFlowItem {
  source_type: string
  source_id: number
  source_name: string
  target_type: string
  target_id: number
  target_name: string
  value: number
  contracts: number
  avg_risk: number | null
  high_risk_pct: number | null
}

interface Props {
  flows: MoneyFlowItem[]
  height?: number
}

type SNode = SankeyNode<{ name: string; color: string; type: 'institution' | 'vendor' }, Record<string, never>>
type SLink = SankeyLink<{ name: string; color: string; type: 'institution' | 'vendor' }, Record<string, never>>

function riskColor(avgRisk: number | null): string {
  if (avgRisk == null) return '#64748b'
  if (avgRisk >= 0.60) return '#f87171'
  if (avgRisk >= 0.40) return '#fb923c'
  if (avgRisk >= 0.25) return '#fbbf24'
  return '#4ade80'
}

function guessSectorFromName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('imss') || lower.includes('issste') || lower.includes('salud')) return 'salud'
  if (lower.includes('pemex') || lower.includes('cfe') || lower.includes('energia')) return 'energia'
  if (lower.includes('defensa') || lower.includes('sedena') || lower.includes('marina')) return 'defensa'
  if (lower.includes('educacion') || lower.includes('sep ') || lower.includes('conacyt')) return 'educacion'
  if (lower.includes('hacienda') || lower.includes('sat ') || lower.includes('shcp')) return 'hacienda'
  if (lower.includes('gobernacion') || lower.includes('segob')) return 'gobernacion'
  if (lower.includes('agricultura') || lower.includes('sader') || lower.includes('segalmex')) return 'agricultura'
  if (lower.includes('infraestructura') || lower.includes('sct ') || lower.includes('comunicaciones')) return 'infraestructura'
  return 'otros'
}

interface TooltipState {
  x: number
  y: number
  sourceName: string
  targetName: string
  value: number
  avgRisk: number | null
}

export function MoneySankeyChart({ flows, height = 350 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [containerWidth, setContainerWidth] = useState(600)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const topFlows = useMemo(() => {
    return [...flows]
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
  }, [flows])

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, { name: string; color: string; type: 'institution' | 'vendor' }>()
    const linkArr: Array<{ source: number; target: number; value: number; flow: MoneyFlowItem }> = []

    for (const f of topFlows) {
      const srcKey = `inst-${f.source_id}`
      const tgtKey = `vend-${f.target_id}`
      if (!nodeMap.has(srcKey)) {
        const sector = guessSectorFromName(f.source_name)
        nodeMap.set(srcKey, {
          name: toTitleCase(f.source_name),
          color: SECTOR_COLORS[sector] ?? '#64748b',
          type: 'institution',
        })
      }
      if (!nodeMap.has(tgtKey)) {
        nodeMap.set(tgtKey, {
          name: toTitleCase(f.target_name),
          color: riskColor(f.avg_risk),
          type: 'vendor',
        })
      }
    }

    const keys = Array.from(nodeMap.keys())
    const nodeArr = keys.map(k => nodeMap.get(k)!)

    for (const f of topFlows) {
      const srcIdx = keys.indexOf(`inst-${f.source_id}`)
      const tgtIdx = keys.indexOf(`vend-${f.target_id}`)
      if (srcIdx >= 0 && tgtIdx >= 0) {
        linkArr.push({ source: srcIdx, target: tgtIdx, value: f.value, flow: f })
      }
    }

    return { nodes: nodeArr, links: linkArr }
  }, [topFlows])

  const sankeyData = useMemo(() => {
    if (nodes.length === 0 || links.length === 0) return null

    const gen = sankey<{ name: string; color: string; type: 'institution' | 'vendor' }, Record<string, never>>()
      .nodeWidth(14)
      .nodePadding(10)
      .extent([[0, 8], [containerWidth, height - 8]])
      .nodeSort(null)

    const clonedNodes = nodes.map(n => ({ ...n }))
    const clonedLinks = links.map(l => ({ source: l.source, target: l.target, value: l.value }))

    try {
      return gen({
        nodes: clonedNodes,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        links: clonedLinks as any,
      })
    } catch {
      return null
    }
  }, [nodes, links, containerWidth, height])

  const handleLinkHover = useCallback((e: React.MouseEvent, _link: SLink, flow: MoneyFlowItem) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      sourceName: toTitleCase(flow.source_name),
      targetName: toTitleCase(flow.target_name),
      value: flow.value,
      avgRisk: flow.avg_risk,
    })
  }, [])

  if (!sankeyData || sankeyData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-muted text-sm">
        No money flow data available
      </div>
    )
  }

  const pathGen = sankeyLinkHorizontal()

  return (
    <div ref={containerRef} className="relative" style={{ height }}>
      <svg ref={svgRef} width={containerWidth} height={height}>
        {/* Links */}
        <g>
          {sankeyData.links.map((link, i) => {
            const matchingFlow = topFlows[i] as MoneyFlowItem | undefined
            const sourceNode = link.source as SNode
            return (
              <path
                key={i}
                d={pathGen(link as never) ?? ''}
                fill="none"
                stroke={sourceNode.color ?? '#64748b'}
                strokeOpacity={0.25}
                strokeWidth={Math.max((link as { width?: number }).width ?? 1, 1)}
                className="hover:stroke-opacity-50 transition-all cursor-pointer"
                onMouseMove={(e) => matchingFlow && handleLinkHover(e, link, matchingFlow)}
                onMouseLeave={() => setTooltip(null)}
              />
            )
          })}
        </g>
        {/* Nodes */}
        <g>
          {sankeyData.nodes.map((node, i) => {
            const n = node as SNode & { x0?: number; x1?: number; y0?: number; y1?: number }
            const x0 = n.x0 ?? 0
            const x1 = n.x1 ?? 0
            const y0 = n.y0 ?? 0
            const y1 = n.y1 ?? 0
            const nodeHeight = y1 - y0
            const isLeft = n.type === 'institution'
            const truncName = n.name.length > 22 ? n.name.slice(0, 20) + '...' : n.name
            return (
              <g key={i}>
                <rect
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={Math.max(nodeHeight, 2)}
                  fill={n.color}
                  rx={2}
                  opacity={0.85}
                />
                {nodeHeight > 14 && (
                  <text
                    x={isLeft ? x0 - 4 : x1 + 4}
                    y={y0 + nodeHeight / 2}
                    dy="0.35em"
                    textAnchor={isLeft ? 'end' : 'start'}
                    fill="var(--color-text-secondary)"
                    fontSize={9}
                    fontFamily="var(--font-family-mono)"
                  >
                    {truncName}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 bg-background-card border border-border rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl"
          style={{ left: Math.min(tooltip.x + 12, containerWidth - 200), top: tooltip.y - 8 }}
        >
          <p className="font-semibold text-text-primary">{tooltip.sourceName}</p>
          <p className="text-text-muted">to {tooltip.targetName}</p>
          <p className="text-text-secondary mt-1 font-mono tabular-nums">
            {formatCompactMXN(tooltip.value)}
          </p>
          {tooltip.avgRisk != null && (
            <p className="font-mono tabular-nums" style={{ color: riskColor(tooltip.avgRisk) }}>
              Avg risk: {(tooltip.avgRisk * 100).toFixed(0)}%
            </p>
          )}
        </div>
      )}
    </div>
  )
}
