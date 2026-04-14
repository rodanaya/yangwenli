/**
 * AdminSectorSunburst — Radial spending fingerprint per administration
 *
 * Inner ring = 5 presidential administrations.
 * Outer ring = 12 sectors, sized by spending under each administration.
 * Color = sector color. Click = filter to that admin/sector combo.
 *
 * Design: dark editorial (zinc-900 bg), sector colors at full opacity outer,
 * lower opacity inward. Zinc-100 text, zinc-800 dividers.
 */

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN } from '@/lib/utils'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { analysisApi } from '@/api/client'

const ADMINS = [
  { name: 'Fox',        short: 'Fox',  start: 2002, end: 2005, color: '#3b82f6' },
  { name: 'Calderon',   short: 'Cal',  start: 2006, end: 2011, color: '#22d3ee' },
  { name: 'Pena Nieto', short: 'EPN',  start: 2012, end: 2017, color: '#ea580c' },
  { name: 'AMLO',       short: 'AMLO', start: 2018, end: 2023, color: '#8b5cf6' },
  { name: 'Sheinbaum',  short: 'Shei', start: 2024, end: 2025, color: '#ec4899' },
]

const TWO_PI = Math.PI * 2
const CX = 180, CY = 180, R_INNER = 55, R_MID = 100, R_OUTER = 160

// Arc path implementation
function annularArc(cx: number, cy: number, r1: number, r2: number, a0: number, a1: number): string {
  const gap = 0.01
  const sa = a0 + gap, ea = a1 - gap
  if (ea - sa < 0.01) return ''
  const lf = ea - sa > Math.PI ? 1 : 0
  const cos = Math.cos, sin = Math.sin
  return [
    `M ${cx + r2*cos(sa)} ${cy + r2*sin(sa)}`,
    `A ${r2} ${r2} 0 ${lf} 1 ${cx + r2*cos(ea)} ${cy + r2*sin(ea)}`,
    `L ${cx + r1*cos(ea)} ${cy + r1*sin(ea)}`,
    `A ${r1} ${r1} 0 ${lf} 0 ${cx + r1*cos(sa)} ${cy + r1*sin(sa)}`,
    'Z',
  ].join(' ')
}

interface Tooltip { label: string; value: number; x: number; y: number }

export function AdminSectorSunburst() {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [hoveredAdmin, setHoveredAdmin] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 30 * 60 * 1000,
  })

  // Build admin x sector spending matrix
  const matrix = useMemo(() => {
    if (!data?.data) return null
    const m: Record<number, Record<number, number>> = {}
    ADMINS.forEach((_, i) => { m[i] = {} })

    data.data.forEach(item => {
      const adminIdx = ADMINS.findIndex(a => item.year >= a.start && item.year <= a.end)
      if (adminIdx < 0) return
      m[adminIdx][item.sector_id] = (m[adminIdx][item.sector_id] ?? 0) + item.total_value
    })
    return m
  }, [data])

  const grandTotal = useMemo(() => {
    if (!matrix) return 1
    return Object.values(matrix).reduce((sum, sectors) =>
      sum + Object.values(sectors).reduce((s, v) => s + v, 0), 0)
  }, [matrix])

  const sunburstArcs = useMemo(() => {
    if (!matrix) return { inner: [], outer: [] }
    const inner: Array<{ adminIdx: number; a0: number; a1: number; total: number }> = []
    const outer: Array<{ adminIdx: number; sectorId: number; a0: number; a1: number; value: number }> = []

    let angle = -Math.PI / 2  // start at top

    ADMINS.forEach((_, adminIdx) => {
      const adminTotal = Object.values(matrix[adminIdx]).reduce((s, v) => s + v, 0)
      const adminAngle = (adminTotal / grandTotal) * TWO_PI
      const adminStart = angle

      const sectors = Object.entries(matrix[adminIdx])
        .sort((a, b) => b[1] - a[1])
      const sectorTotal = sectors.reduce((s, [, v]) => s + v, 0)
      let sAngle = angle

      sectors.forEach(([sid, val]) => {
        const sectorAngle = sectorTotal > 0 ? (val / sectorTotal) * adminAngle : 0
        outer.push({ adminIdx, sectorId: Number(sid), a0: sAngle, a1: sAngle + sectorAngle, value: val })
        sAngle += sectorAngle
      })

      inner.push({ adminIdx, a0: adminStart, a1: adminStart + adminAngle, total: adminTotal })
      angle += adminAngle
    })

    return { inner, outer }
  }, [matrix, grandTotal])

  if (isLoading) return <Skeleton className="h-80 w-full bg-zinc-800" />
  if (!matrix) return null

  const totalW = CX * 2 + 20, totalH = CY * 2 + 20

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="w-full"
        style={{ maxWidth: 380 }}
        onMouseLeave={() => { setTooltip(null); setHoveredAdmin(null) }}
      >
        {/* Dark background */}
        <rect width={totalW} height={totalH} fill="#18181b" rx="8" />

        {/* Outer ring: sectors — full opacity */}
        {sunburstArcs.outer.map(({ adminIdx, sectorId, a0, a1, value }, i) => {
          const sector = SECTORS.find(s => s.id === sectorId)
          const fill = sector ? SECTOR_COLORS[sector.code] : '#64748b'
          const isHovered = hoveredAdmin === ADMINS[adminIdx].name
          return (
            <path
              key={i}
              d={annularArc(CX, CY, R_MID + 2, isHovered ? R_OUTER + 6 : R_OUTER, a0, a1)}
              fill={fill}
              opacity={hoveredAdmin ? (isHovered ? 0.95 : 0.25) : 0.85}
              stroke="#27272a"
              strokeWidth={0.8}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={(e) => {
                setTooltip({ label: `${ADMINS[adminIdx].short} / ${sector?.nameEN ?? 'Sector '+sectorId}`, value, x: e.clientX, y: e.clientY })
                setHoveredAdmin(ADMINS[adminIdx].name)
              }}
            />
          )
        })}

        {/* Inner ring: administrations — lower opacity */}
        {sunburstArcs.inner.map(({ adminIdx, a0, a1, total }) => {
          const admin = ADMINS[adminIdx]
          const midAngle = (a0 + a1) / 2
          return (
            <g key={adminIdx}>
              <path
                d={annularArc(CX, CY, R_INNER, R_MID, a0, a1)}
                fill={admin.color}
                opacity={hoveredAdmin === admin.name ? 0.9 : 0.6}
                stroke="#27272a"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setTooltip({ label: admin.name, value: total, x: e.clientX, y: e.clientY })
                  setHoveredAdmin(admin.name)
                }}
              />
              {/* Label on inner arc */}
              {(a1 - a0) > 0.4 && (
                <text
                  x={CX + (R_INNER + 24) * Math.cos(midAngle)}
                  y={CY + (R_INNER + 24) * Math.sin(midAngle)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={8}
                  fontWeight="700"
                  fontFamily="var(--font-family-mono)"
                  fill="#f4f4f5"
                  pointerEvents="none"
                >
                  {admin.short}
                </text>
              )}
            </g>
          )
        })}

        {/* Center label */}
        <text x={CX} y={CY - 6} textAnchor="middle" dominantBaseline="middle" fontSize={10} fontFamily="var(--font-family-mono)" fill="#71717a">Total</text>
        <text x={CX} y={CY + 8} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight="700" fontFamily="var(--font-family-mono)" fill="#f4f4f5">
          {formatCompactMXN(grandTotal)}
        </text>
      </svg>

      {/* Tooltip — dark editorial */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-2xl"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            backgroundColor: '#18181b',
            border: '1px solid #3f3f46',
          }}
        >
          <p className="font-semibold text-zinc-100 font-mono">{tooltip.label}</p>
          <p className="text-zinc-400 font-mono">{formatCompactMXN(tooltip.value)}</p>
        </div>
      )}

      {/* Legend — dark editorial */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {ADMINS.map(a => (
          <div key={a.name} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
            <span className="text-[10px] font-mono text-zinc-500">{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
