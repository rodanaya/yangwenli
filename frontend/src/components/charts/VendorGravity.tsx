/**
 * VendorGravity — mass-on-manifold vendor visualization.
 *
 * Each vendor is a dot; size = log(spend), color = risk level, position =
 * deterministic Halton(2,3) layout biased by sector "gravity wells" along
 * the x axis. Concentration becomes visible as mass pulling toward a
 * sector well; high-risk vendors that exceed a score threshold are
 * tethered to an invisible "capture" centroid with thin red leaders.
 *
 * Pure SVG, no animation, no Recharts.
 */
import { useMemo } from 'react'
import { mulberry32, halton } from '@/lib/particle'
import { HAIRLINE_STROKE, FONT_MONO, RISK_PALETTE, type RiskLevel } from '@/lib/editorial'

export interface VendorGravityNode {
  id: string | number
  name: string
  spend: number
  riskScore: number          // 0..1
  riskLevel: RiskLevel
  sectorIndex: number        // 0..sectorCount-1 — determines gravity well
}

interface VendorGravityProps {
  nodes: VendorGravityNode[]
  sectorLabels?: string[]
  width?: number
  height?: number
  /** Risk score threshold above which a node is tethered to capture centroid. */
  captureThreshold?: number
  captureLabel?: string
  className?: string
  seed?: number
}

export function VendorGravity({
  nodes,
  sectorLabels,
  width = 760,
  height = 340,
  captureThreshold = 0.65,
  captureLabel = 'capture',
  className,
  seed = 2718,
}: VendorGravityProps) {
  const { layout, captureCentroid } = useMemo(() => {
    if (nodes.length === 0) return { layout: [], captureCentroid: null }

    const sectorCount = Math.max(1, sectorLabels?.length ?? (Math.max(...nodes.map((n) => n.sectorIndex)) + 1))
    const pad = 28
    const innerW = width - pad * 2
    const innerH = height - pad * 2 - 28 // reserve bottom for sector axis
    const wells = Array.from({ length: sectorCount }, (_, i) => ({
      x: pad + (innerW * (i + 0.5)) / sectorCount,
      y: pad + innerH / 2,
    }))

    const maxSpend = Math.max(...nodes.map((n) => n.spend), 1)
    const rng = mulberry32(seed)

    const laid = nodes.map((n, i) => {
      const well = wells[Math.max(0, Math.min(sectorCount - 1, n.sectorIndex))]
      // Halton scatter within a well radius that grows with spend mass
      const u = halton(i + 1, 2)
      const v = halton(i + 1, 3)
      const ang = u * Math.PI * 2
      const wellR = innerH * 0.38
      const r = wellR * Math.pow(v, 0.65)
      const jx = (rng() - 0.5) * 8
      const jy = (rng() - 0.5) * 8
      const x = Math.max(pad, Math.min(pad + innerW, well.x + Math.cos(ang) * r + jx))
      const y = Math.max(pad, Math.min(pad + innerH, well.y + Math.sin(ang) * r * 0.8 + jy))
      const size = 2 + Math.sqrt(n.spend / maxSpend) * 10
      return { ...n, x, y, size }
    })

    // Capture centroid — mean of high-risk nodes, drifted right
    const caps = laid.filter((d) => d.riskScore >= captureThreshold)
    const captureCentroid = caps.length > 0
      ? {
          x: caps.reduce((s, d) => s + d.x, 0) / caps.length,
          y: caps.reduce((s, d) => s + d.y, 0) / caps.length,
          count: caps.length,
        }
      : null

    return { layout: laid, captureCentroid }
  }, [nodes, sectorLabels, width, height, captureThreshold, seed])

  if (layout.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-zinc-500">
        No vendor data
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="Vendor gravity chart"
      style={{ fontFamily: FONT_MONO }}
    >
      {/* Sector well hairlines */}
      {sectorLabels && sectorLabels.map((label, i) => {
        const x = 28 + ((width - 56) * (i + 0.5)) / sectorLabels.length
        return (
          <g key={`well-${i}`}>
            <line x1={x} x2={x} y1={12} y2={height - 28} stroke={HAIRLINE_STROKE} strokeDasharray="2 4" />
            <text x={x} y={height - 12} fill="#71717a" fontSize={9} textAnchor="middle">
              {label.slice(0, 10)}
            </text>
          </g>
        )
      })}

      {/* Capture tethers */}
      {captureCentroid && layout.filter((d) => d.riskScore >= captureThreshold).map((d) => (
        <line
          key={`tether-${d.id}`}
          x1={d.x}
          y1={d.y}
          x2={captureCentroid.x}
          y2={captureCentroid.y}
          stroke={RISK_PALETTE.critical}
          strokeOpacity={0.22}
          strokeWidth={0.6}
        />
      ))}

      {/* Nodes (low → critical paint order) */}
      {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).flatMap((lvl) =>
        layout
          .filter((d) => d.riskLevel === lvl)
          .map((d) => (
            <circle
              key={`n-${d.id}`}
              cx={d.x}
              cy={d.y}
              r={d.size}
              fill={RISK_PALETTE[lvl]}
              fillOpacity={lvl === 'critical' ? 0.9 : lvl === 'high' ? 0.78 : lvl === 'medium' ? 0.48 : 0.28}
              stroke={lvl === 'critical' ? RISK_PALETTE.critical : 'none'}
              strokeOpacity={0.5}
              strokeWidth={0.5}
            />
          )),
      )}

      {/* Capture centroid label */}
      {captureCentroid && (
        <g>
          <circle cx={captureCentroid.x} cy={captureCentroid.y} r={4} fill={RISK_PALETTE.critical} fillOpacity={0.92} />
          <text
            x={captureCentroid.x + 8}
            y={captureCentroid.y - 6}
            fill={RISK_PALETTE.critical}
            fontSize={9}
            fontWeight="bold"
          >
            {captureLabel} · {captureCentroid.count}
          </text>
        </g>
      )}
    </svg>
  )
}

export default VendorGravity
