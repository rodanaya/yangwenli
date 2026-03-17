/**
 * CommunityBubbles — Vendor network communities as packed bubble clusters
 *
 * Each bubble = one detected vendor community (cluster of co-bidders).
 * Size = total contract value. Color = avg risk score.
 * Uses a simple force-like layout computed from community sizes.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { RISK_COLORS, getRiskLevelFromScore } from '@/lib/constants'
import { networkApi } from '@/api/client'

const W = 600, H = 400, CX = W / 2, CY = H / 2

// Pack N circles around a center using a deterministic spiral layout
function packCircles(items: Array<{ r: number }>, cx: number, cy: number) {
  if (items.length === 0) return []
  if (items.length === 1) return [{ x: cx, y: cy }]

  const positions: Array<{ x: number; y: number }> = []
  const golden = Math.PI * (3 - Math.sqrt(5)) // golden angle

  // Largest bubble at center, rest spiral outward
  positions.push({ x: cx, y: cy })

  let radiusAccum = items[0].r + 8
  for (let i = 1; i < items.length; i++) {
    const angle = i * golden
    const r = radiusAccum + items[i].r
    positions.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) })
    if (i % 3 === 0) radiusAccum += items[i].r * 0.5
  }
  return positions
}

function riskColor(score: number | null): string {
  if (score == null) return RISK_COLORS.low
  return RISK_COLORS[getRiskLevelFromScore(score)]
}

interface Tooltip {
  label: string
  vendors: number
  risk: number | null
  x: number
  y: number
}

export function CommunityBubbles() {
  const navigate = useNavigate()
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['network', 'communities'],
    queryFn: () => networkApi.getCommunities({ limit: 40 }),
    staleTime: 15 * 60 * 1000,
  })

  const communities = data?.communities ?? []

  const bubbles = useMemo(() => {
    if (communities.length === 0) return []
    const sorted = [...communities].sort((a, b) => (b.size ?? 0) - (a.size ?? 0)).slice(0, 35)
    const maxVal = sorted[0]?.size ?? 1

    const items = sorted.map(c => {
      const pct = Math.pow((c.size ?? 0) / maxVal, 0.4)
      const r = Math.max(14, pct * 55)
      return { r, community: c }
    })

    const positions = packCircles(items.map(it => ({ r: it.r })), CX, CY)

    return items.map((it, i) => ({
      ...it,
      x: positions[i]?.x ?? CX,
      y: positions[i]?.y ?? CY,
    }))
  }, [communities])

  if (isLoading) return <Skeleton className="h-80 w-full" />
  if (communities.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No community data available
      </div>
    )
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 360 }}
        onMouseLeave={() => setTooltip(null)}
      >
        {bubbles.map(({ r, x, y, community }, i) => {
          const fill = riskColor(community.avg_risk ?? null)
          const opacity = 0.75
          return (
            <g
              key={community.community_id ?? i}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/network?community=${community.community_id}`)}
              onMouseEnter={(e) => setTooltip({
                label: `Community #${community.community_id}`,
                vendors: community.size ?? 0,
                risk: community.avg_risk ?? null,
                x: e.clientX,
                y: e.clientY,
              })}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle cx={x} cy={y} r={r} fill={fill} opacity={opacity} stroke="white" strokeWidth={1} />
              {r > 22 && (
                <text
                  x={x} y={y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={r > 35 ? 9 : 7}
                  fill="white"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {community.size ?? '?'}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-background-card border border-border rounded px-2.5 py-1.5 text-xs pointer-events-none shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <p className="font-semibold text-text-primary truncate max-w-[180px]">{tooltip.label}</p>
          <p className="text-text-muted">Vendors: <span className="text-text-primary">{tooltip.vendors}</span></p>
          {tooltip.risk != null && (
            <p className="text-text-muted">Avg Risk: <span style={{ color: riskColor(tooltip.risk) }}>{tooltip.risk.toFixed(3)}</span></p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 flex-wrap text-[10px]">
        <span className="text-muted-foreground">Size = contract value</span>
        <span className="text-muted-foreground">Color = risk level</span>
        {(['low','medium','high','critical'] as const).map(l => (
          <span key={l} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: RISK_COLORS[l] }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}
