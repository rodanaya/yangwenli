/**
 * FlowParticle — particle-stream Sankey replacement.
 *
 * Two columns of nodes (sources on the left, targets on the right) with
 * flows rendered as bundles of tiny dots along cubic Bézier paths. Dot
 * count per flow is proportional to value, capped so the whole picture
 * stays legible. No animation; dot positions are deterministic via Halton.
 *
 * Example: Institution → Vendor money flow; dot density = log(spend).
 */
import { useMemo } from 'react'
import { halton } from '@/lib/particle'
import { FONT_MONO, HAIRLINE_STROKE, RISK_PALETTE } from '@/lib/editorial'

export interface FlowNode { id: string; label: string; value?: number }
export interface FlowLink {
  sourceId: string
  targetId: string
  value: number
  /** Optional risk-level tinting on the flow. */
  critical?: boolean
}

interface FlowParticleProps {
  sources: FlowNode[]
  targets: FlowNode[]
  links: FlowLink[]
  width?: number
  height?: number
  maxDotsPerFlow?: number
  className?: string
  sourceLabel?: string
  targetLabel?: string
}

export function FlowParticle({
  sources,
  targets,
  links,
  width = 760,
  height = 380,
  maxDotsPerFlow = 60,
  className,
  sourceLabel = 'from',
  targetLabel = 'to',
}: FlowParticleProps) {
  const { srcY, tgtY, particles } = useMemo(() => {
    const pad = 20
    const innerH = height - pad * 2 - 20
    const srcY: Record<string, number> = {}
    const tgtY: Record<string, number> = {}
    sources.forEach((n, i) => {
      srcY[n.id] = pad + 12 + (innerH * (i + 0.5)) / Math.max(1, sources.length)
    })
    targets.forEach((n, i) => {
      tgtY[n.id] = pad + 12 + (innerH * (i + 0.5)) / Math.max(1, targets.length)
    })

    const srcX = pad + 90
    const tgtX = width - pad - 90
    const ctrlOffset = (tgtX - srcX) * 0.5

    const maxV = Math.max(...links.map((l) => l.value), 1)
    const particles: { x: number; y: number; critical: boolean; alpha: number }[] = []

    for (const link of links) {
      const y0 = srcY[link.sourceId]
      const y1 = tgtY[link.targetId]
      if (y0 == null || y1 == null) continue
      const dots = Math.max(2, Math.round((link.value / maxV) * maxDotsPerFlow))

      // Cubic Bezier: P0 (src), C1 (src + ctrlOffset, same y), C2 (tgt - ctrlOffset), P3 (tgt)
      for (let i = 0; i < dots; i++) {
        const t = halton(i + 1, 2)
        // Slight vertical jitter so streams don't collapse to a line
        const j = (halton(i + 1, 3) - 0.5) * 4
        const mt = 1 - t
        const x =
          mt * mt * mt * srcX +
          3 * mt * mt * t * (srcX + ctrlOffset) +
          3 * mt * t * t * (tgtX - ctrlOffset) +
          t * t * t * tgtX
        const y =
          mt * mt * mt * y0 +
          3 * mt * mt * t * y0 +
          3 * mt * t * t * y1 +
          t * t * t * y1 +
          j
        const alpha = 0.28 + 0.5 * (1 - Math.abs(t - 0.5) * 2) * 0.7
        particles.push({ x, y, critical: !!link.critical, alpha })
      }
    }

    return { srcY, tgtY, particles }
  }, [sources, targets, links, width, height, maxDotsPerFlow])

  const pad = 20
  const srcX = pad + 90
  const tgtX = width - pad - 90

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="Particle flow chart"
      style={{ fontFamily: FONT_MONO }}
    >
      {/* Column gutters */}
      <line x1={srcX} y1={pad} x2={srcX} y2={height - pad} stroke={HAIRLINE_STROKE} />
      <line x1={tgtX} y1={pad} x2={tgtX} y2={height - pad} stroke={HAIRLINE_STROKE} />

      {/* Column headers */}
      <text x={srcX} y={pad - 4} fill="#71717a" fontSize={8} textAnchor="middle" letterSpacing="0.1em">
        {sourceLabel.toUpperCase()}
      </text>
      <text x={tgtX} y={pad - 4} fill="#71717a" fontSize={8} textAnchor="middle" letterSpacing="0.1em">
        {targetLabel.toUpperCase()}
      </text>

      {/* Particles */}
      {particles.map((p, i) => (
        <circle
          key={`p-${i}`}
          cx={p.x}
          cy={p.y}
          r={p.critical ? 0.9 : 0.7}
          fill={p.critical ? RISK_PALETTE.critical : '#f59e0b'}
          fillOpacity={p.alpha}
        />
      ))}

      {/* Source labels */}
      {sources.map((n) => (
        <text
          key={`sl-${n.id}`}
          x={srcX - 6}
          y={srcY[n.id]}
          fill="#a1a1aa"
          fontSize={10}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {n.label.slice(0, 20)}
        </text>
      ))}
      {/* Target labels */}
      {targets.map((n) => (
        <text
          key={`tl-${n.id}`}
          x={tgtX + 6}
          y={tgtY[n.id]}
          fill="#a1a1aa"
          fontSize={10}
          textAnchor="start"
          dominantBaseline="middle"
        >
          {n.label.slice(0, 20)}
        </text>
      ))}
    </svg>
  )
}

export default FlowParticle
