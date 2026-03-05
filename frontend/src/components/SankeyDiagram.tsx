import { useMemo, useState, useCallback } from 'react'
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { getInstitutionGroup, getInstitutionColor } from '@/lib/institution-groups'

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

const LABEL_BG = '#0f1629'

function formatMXN(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B MXN`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M MXN`
  return `${(v / 1e3).toFixed(0)}K MXN`
}

function truncate(name: string, maxChars: number): string {
  if (name.length <= maxChars) return name
  return name.slice(0, maxChars - 1) + '…'
}

function estWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.57
}

/** Pick risk color from avgRisk score (0-1) */
function riskColorFromScore(avgRisk: number): string {
  if (avgRisk >= 0.5) return RISK_COLORS.critical
  if (avgRisk >= 0.3) return RISK_COLORS.high
  if (avgRisk >= 0.1) return RISK_COLORS.medium
  return RISK_COLORS.low
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
  // Respect user's OS-level "reduce motion" preference (accessibility + battery)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

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
      const LABEL_MARGIN = 220
      const layout = d3Sankey()
        .nodeId(((_d: unknown, i: number) => i) as never)
        .nodeWidth(16)
        .nodePadding(12)
        .extent([[LABEL_MARGIN, 4], [width - LABEL_MARGIN, height - 4]])

      return layout({ nodes: graphNodes as never, links: graphLinks as never })
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
          {/* Gradient fills for each flow (risk-colored) */}
          {sLinks.map((link, i) => {
            const src = link.source as never as { riskLevel: string }
            const tgt = link.target as never as { riskLevel: string }
            const ld  = link as never as { avgRisk?: number }
            const avgRisk: number = ld.avgRisk ?? 0
            const flowColor = riskColorFromScore(avgRisk)
            const sc = avgRisk > 0 ? flowColor : (RISK_COLORS[src.riskLevel] ?? RISK_COLORS.unknown)
            const tc = avgRisk > 0 ? flowColor : (RISK_COLORS[tgt.riskLevel] ?? RISK_COLORS.unknown)
            return (
              <linearGradient key={i} id={`lg-${i}`} x1="0%" x2="100%">
                <stop offset="0%"   stopColor={sc} stopOpacity={0.45} />
                <stop offset="100%" stopColor={tc} stopOpacity={0.35} />
              </linearGradient>
            )
          })}

          {/* Glow filter for electricity particles */}
          <filter id="particle-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle node glow */}
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Flows (circuit traces) ─────────────────────────────────── */}
        {sLinks.map((link, i) => {
          const pathD   = sankeyLinkHorizontal()(link as never)
          const src     = link.source as never as { id: string; riskLevel: string }
          const tgt     = link.target as never as { id: string; riskLevel: string }
          const ld      = link as never as { avgRisk?: number; contractCount?: number }
          const strokeW = Math.max(1.5, (link as never as { width?: number }).width ?? 1.5)
          const isRelated = selectedNodeId && (src.id === selectedNodeId || tgt.id === selectedNodeId)
          const avgRisk   = (ld.avgRisk ?? 0)
          const avgRiskPct = avgRisk * 100
          const riskLabel = avgRiskPct >= 50 ? 'Critical' : avgRiskPct >= 30 ? 'High' : avgRiskPct >= 10 ? 'Medium' : 'Low'
          const riskColor = riskColorFromScore(avgRisk)

          // Number of electricity particles scales with flow thickness
          const numParticles = strokeW >= 10 ? 3 : strokeW >= 4 ? 2 : 1
          // Animation duration: slow and calm — heavier flows travel at the same pace
          const dur = Math.max(6.0, Math.min(12.0, 9.0 + (strokeW - 1.5) * 0.15))

          return (
            <g key={i}>
              {/* Circuit trace path — solid, no animation */}
              <path
                d={pathD || ''}
                fill="none"
                stroke={`url(#lg-${i})`}
                strokeWidth={strokeW}
                className="cursor-pointer transition-opacity"
                opacity={selectedNodeId && !isRelated ? 0.12 : 0.85}
                onClick={() => onFlowClick?.(src.id, tgt.id)}
                onMouseMove={e => handleMouseMove(e, [
                  `${src.id.replace('inst-', '')} → flow`,
                  `${formatMXN(link.value)}  ·  ${(ld.contractCount ?? 0).toLocaleString()} contracts`,
                  `Avg risk: ${avgRiskPct.toFixed(0)}% — ${riskLabel}`,
                ], riskColor)}
                onMouseLeave={() => setTooltip(null)}
              />

              {/* Electricity particles traveling along the trace */}
              {pathD && !selectedNodeId && !prefersReducedMotion && Array.from({ length: numParticles }, (_, j) => (
                <circle
                  key={j}
                  r={Math.min(3.5, Math.max(2, strokeW * 0.35))}
                  fill={riskColor}
                  opacity={0.92}
                  filter="url(#particle-glow)"
                  style={{ pointerEvents: 'none' }}
                >
                  <animateMotion
                    dur={`${dur}s`}
                    begin={`${-(j / numParticles) * dur}s`}
                    repeatCount="indefinite"
                    path={pathD}
                    calcMode="linear"
                  />
                </circle>
              ))}

              {/* Selected-node mode: show single slower pulse on related flows */}
              {pathD && selectedNodeId && isRelated && !prefersReducedMotion && (
                <circle
                  r={Math.min(4, Math.max(2.5, strokeW * 0.4))}
                  fill={riskColor}
                  opacity={0.95}
                  filter="url(#particle-glow)"
                  style={{ pointerEvents: 'none' }}
                >
                  <animateMotion
                    dur={`${dur * 1.5}s`}
                    repeatCount="indefinite"
                    path={pathD}
                    calcMode="linear"
                  />
                </circle>
              )}
            </g>
          )
        })}

        {/* ── Nodes + Labels ────────────────────────────────────── */}
        {sNodes.map((node, i) => {
          const n         = node as never as {
            id: string; name: string; type: string; riskLevel: string;
            x0?: number; x1?: number; y0?: number; y1?: number; value?: number
          }
          const color     = n.type === 'institution'
            ? getInstitutionColor(n.name, RISK_COLORS[n.riskLevel] ?? RISK_COLORS.unknown)
            : (RISK_COLORS[n.riskLevel] ?? RISK_COLORS.unknown)
          const x0        = n.x0 ?? 0
          const x1        = n.x1 ?? 0
          const y0        = n.y0 ?? 0
          const y1        = n.y1 ?? 0
          const nodeH     = Math.max(1, y1 - y0)
          const isLeft    = x0 < width / 2
          const isSelected = selectedNodeId === n.id

          const nodeLinks = (sLinks as never[]).filter(
            (l: never) => (l as never as { source: { id: string } }).source.id === n.id ||
                          (l as never as { target: { id: string } }).target.id === n.id
          )
          const contractCount = (nodeLinks as never[]).reduce(
            (s: number, l: never) => s + ((l as never as { contractCount?: number }).contractCount ?? 0),
            0
          )

          const fontSize = Math.min(13, Math.max(10, Math.round(nodeH * 0.4 + 9)))
          const showLabel = nodeH >= 8

          const LABEL_MARGIN = 215
          const maxChars = Math.max(10, Math.floor(LABEL_MARGIN / (fontSize * 0.57)))
          const labelText = truncate(n.name, maxChars)
          const labelW    = estWidth(labelText, fontSize)
          const labelH    = fontSize + 5
          const labelY    = (y0 + y1) / 2

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
                type: n.type as 'institution' | 'vendor',
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
                  filter="url(#node-glow)"
                />
              )}

              {/* Node bar (circuit component) */}
              <rect
                x={x0} y={y0}
                width={Math.max(1, x1 - x0)}
                height={nodeH}
                fill={color}
                opacity={selectedNodeId && !isSelected ? 0.3 : 0.9}
                rx={2}
                filter={isSelected ? 'url(#node-glow)' : undefined}
                onMouseMove={e => handleMouseMove(e, [
                  n.name,
                  formatMXN(n.value ?? 0),
                  `${contractCount.toLocaleString()} contracts`,
                  `Risk: ${n.riskLevel}`,
                ])}
                onMouseLeave={() => setTooltip(null)}
              />

              {/* Institution logo — rendered inside the node bar when available */}
              {n.type === 'institution' && nodeH >= 16 && (() => {
                const grp = getInstitutionGroup(n.name)
                if (!grp?.logo) return null
                const logoSize = Math.min(nodeH - 4, Math.max(1, x1 - x0) - 2, 24)
                const logoX = x0 + (Math.max(1, x1 - x0) - logoSize) / 2
                const logoY = y0 + (nodeH - logoSize) / 2
                return (
                  <image
                    href={grp.logo}
                    x={logoX}
                    y={logoY}
                    width={logoSize}
                    height={logoSize}
                    opacity={selectedNodeId && !isSelected ? 0.3 : 1}
                    style={{ pointerEvents: 'none' }}
                  />
                )
              })()}

              {/* Label with opaque background */}
              {showLabel && (
                <>
                  <rect
                    x={bgX}
                    y={labelY - labelH / 2}
                    width={labelW + 6}
                    height={labelH}
                    fill={LABEL_BG}
                    fillOpacity={0.88}
                    rx={3}
                    className="pointer-events-none"
                  />
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
