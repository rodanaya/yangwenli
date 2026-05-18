import { useRef, useEffect, useState } from 'react'
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
import { useNavigate } from 'react-router-dom'
import { RISK_COLORS, SECTOR_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'

interface CategorySummaryItem {
  category_id: number
  name_es: string
  name_en: string
  sector_code: string
  total_value: number
  avg_risk: number
  total_contracts: number
}

interface CategoryTreemapProps {
  categories: CategorySummaryItem[]
  lang: 'en' | 'es'
  activeSector: string | null
}

export function CategoryTreemap({ categories, lang, activeSector }: CategoryTreemapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 800, height: 304 })
  const navigate = useNavigate()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      setDims({ width: w, height: Math.min(380, w * 0.38) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // mobile: top 20 only
  const isMobile = dims.width < 640
  const items = isMobile
    ? [...categories].sort((a, b) => b.total_value - a.total_value).slice(0, 20)
    : categories

  // build hierarchy grouped by sector
  const sectorMap = new Map<string, CategorySummaryItem[]>()
  for (const c of items) {
    const arr = sectorMap.get(c.sector_code) ?? []
    arr.push(c)
    sectorMap.set(c.sector_code, arr)
  }
  const rootData = {
    name: 'root',
    children: Array.from(sectorMap.entries()).map(([sector, cats]) => ({
      name: sector,
      children: cats.map(c => ({ ...c, value: c.total_value })),
    })),
  }

  const root = hierarchy(rootData)
    .sum((d: any) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  treemap<any>()
    .tile(treemapSquarify)
    .size([dims.width, dims.height])
    .padding(1)
    .paddingOuter(3)
    .paddingTop(18)(root)

  // risk fill — thresholds calibrated for category-level avg_risk (aggregate scores,
  // not individual contracts; data tops out ~0.45 in v0.8.5 so contract-level
  // thresholds of 0.60/0.40/0.25 produce a monochrome neutral treemap)
  function riskFill(avgRisk: number): string {
    if (avgRisk >= 0.35) return RISK_COLORS.critical
    if (avgRisk >= 0.25) return RISK_COLORS.high
    if (avgRisk >= 0.18) return RISK_COLORS.medium
    return 'var(--color-background-elevated)'
  }
  function riskOpacity(avgRisk: number): number {
    if (avgRisk >= 0.35) return 0.70
    if (avgRisk >= 0.25) return 0.65
    if (avgRisk >= 0.18) return 0.60
    return 1
  }

  const leaves = root.leaves() as any[]

  return (
    <div ref={containerRef} className="w-full">
      <svg width={dims.width} height={dims.height} className="overflow-visible">
        {/* sector group headers */}
        {root.children?.map((sector: any) => (
          <text
            key={sector.data.name + '-label'}
            x={sector.x0 + 4}
            y={sector.y0 + 12}
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fill: SECTOR_COLORS[sector.data.name] ?? '#64748b',
              opacity: activeSector && activeSector !== sector.data.name ? 0.25 : 1,
            }}
          >
            {sector.data.name}
          </text>
        ))}

        {leaves.map((leaf: any) => {
          const d = leaf.data as CategorySummaryItem & { value: number }
          // Guard: skip sector-group nodes that lack category fields
          if (!d.category_id) return null
          const w = leaf.x1 - leaf.x0
          const h = leaf.y1 - leaf.y0
          const isActive = !activeSector || activeSector === d.sector_code
          const name = (lang === 'es' ? d.name_es : d.name_en) ?? ''

          return (
            <g
              key={d.category_id}
              transform={`translate(${leaf.x0},${leaf.y0})`}
              style={{ cursor: 'pointer', opacity: isActive ? 1 : 0.25 }}
              onClick={() => navigate(`/categories/${d.category_id}`)}
            >
              <rect
                width={w}
                height={h}
                fill={riskFill(d.avg_risk)}
                fillOpacity={riskOpacity(d.avg_risk)}
                stroke={SECTOR_COLORS[d.sector_code] ?? '#64748b'}
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              {w >= 55 && h >= 20 && (
                <text
                  x={4}
                  y={14}
                  style={{
                    fontFamily: 'var(--font-family-mono)',
                    fontSize: '10px',
                    fill: 'var(--color-text-primary)',
                    pointerEvents: 'none',
                  }}
                >
                  <title>{name}</title>
                  {name.length > Math.floor(w / 6.5) ? name.slice(0, Math.floor(w / 6.5)) + '…' : name}
                </text>
              )}
              {w >= 90 && h >= 32 && (
                <text
                  x={4}
                  y={h - 5}
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: '12px',
                    fill: 'var(--color-text-primary)',
                    pointerEvents: 'none',
                  }}
                >
                  {formatCompactMXN(d.total_value)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
