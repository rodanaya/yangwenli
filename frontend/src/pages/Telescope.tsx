/**
 * EL TELESCOPIO — The Procurement Contract Universe
 *
 * A space/astronomy-themed visualization where each sector-year data point
 * appears as a stellar body in deep space. 12 sectors x 24 years = ~288
 * nebulae, each representing thousands of contracts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { analysisApi } from '@/api/client'
import type { SectorYearItem } from '@/api/types'
import { SECTOR_COLORS, SECTORS } from '@/lib/constants'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Star {
  x: number
  y: number
  r: number
  opacity: number
}

interface NebulaDatum {
  id: string
  year: number
  sectorId: number
  sectorKey: string
  sectorName: string
  color: string
  contracts: number
  totalValue: number
  avgRisk: number
  highRiskPct: number
  directAwardPct: number
  vendorCount: number
  institutionCount: number
  cx: number
  cy: number
  radius: number
  glowIntensity: number
  baseOpacity: number
}

type YAxisMetric = 'avg_risk' | 'high_risk_pct' | 'direct_award_pct'
type SizeMetric = 'total_value' | 'contracts' | 'vendor_count'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTOR_ID_TO_KEY: Record<number, string> = {
  1: 'salud', 2: 'educacion', 3: 'infraestructura', 4: 'energia',
  5: 'defensa', 6: 'tecnologia', 7: 'hacienda', 8: 'gobernacion',
  9: 'agricultura', 10: 'ambiente', 11: 'trabajo', 12: 'otros',
}

const SECTOR_ID_TO_NAME: Record<number, string> = Object.fromEntries(
  SECTORS.map(s => [s.id, s.name])
)

const ADMINISTRATIONS = [
  { startYear: 2000, endYear: 2006, name: 'Fox', color: '#3b82f6' },
  { startYear: 2006, endYear: 2012, name: 'Calderon', color: '#22c55e' },
  { startYear: 2012, endYear: 2018, name: 'EPN', color: '#f97316' },
  { startYear: 2018, endYear: 2024, name: 'AMLO', color: '#8b5cf6' },
  { startYear: 2024, endYear: 2030, name: 'Sheinbaum', color: '#ec4899' },
]

const MARGIN = { top: 100, right: 60, bottom: 140, left: 70 }

const Y_LABEL_KEYS: Record<YAxisMetric, string> = {
  avg_risk: 'yLabels.avg_risk',
  high_risk_pct: 'yLabels.high_risk_pct',
  direct_award_pct: 'yLabels.direct_award_pct',
}

const SIZE_LABEL_KEYS: Record<SizeMetric, string> = {
  total_value: 'sizeLabels.total_value',
  contracts: 'sizeLabels.contracts',
  vendor_count: 'sizeLabels.vendor_count',
}

// ---------------------------------------------------------------------------
// Starfield generator (seeded pseudorandom)
// ---------------------------------------------------------------------------

function generateStarField(count: number, width: number, height: number): Star[] {
  let seed = 42
  function rand() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff
    return (seed >>> 0) / 4294967296
  }
  return Array.from({ length: count }, () => ({
    x: rand() * width,
    y: rand() * height,
    r: rand() * 1.2 + 0.4,
    opacity: rand() * 0.5 + 0.1,
  }))
}

// ---------------------------------------------------------------------------
// Data mapping helpers
// ---------------------------------------------------------------------------

function getYValue(item: SectorYearItem, metric: YAxisMetric): number {
  switch (metric) {
    case 'avg_risk': return item.avg_risk
    case 'high_risk_pct': return item.high_risk_pct
    case 'direct_award_pct': return item.direct_award_pct
  }
}

function getSizeValue(item: SectorYearItem, metric: SizeMetric): number {
  switch (metric) {
    case 'total_value': return item.total_value
    case 'contracts': return item.contracts
    case 'vendor_count': return item.vendor_count
  }
}

function computeRadius(value: number, metric: SizeMetric): number {
  if (value <= 0) return 3
  switch (metric) {
    case 'total_value':
      return Math.max(3, Math.log10(Math.max(value, 1)) * 3.2 - 20)
    case 'contracts':
      return Math.max(3, Math.log10(Math.max(value, 1)) * 5)
    case 'vendor_count':
      return Math.max(3, Math.log10(Math.max(value, 1)) * 6)
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Telescope() {
  const { t } = useTranslation('telescope')
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [visibleSectors, setVisibleSectors] = useState<Set<number>>(
    new Set(SECTORS.map(s => s.id))
  )
  const [yMetric, setYMetric] = useState<YAxisMetric>('avg_risk')
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>('total_value')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const reducedMotion = useReducedMotion()

  // Fetch data
  const { data: resp, isLoading, isError } = useQuery({
    queryKey: ['analysis', 'sector-year-breakdown'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 30 * 60 * 1000,
  })

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 500),
        })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(Math.max(z * delta, 0.5), 4))
  }, [])

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x),
      y: panStart.current.panY + (e.clientY - panStart.current.y),
    })
  }, [isPanning])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Compute nebulae
  const items = resp?.data ?? []

  const { nebulae, years, totalContracts } = useMemo(() => {
    if (!items.length) return { nebulae: [], years: [] as number[], totalContracts: 0 }

    const allYears = [...new Set(items.map(i => i.year))].sort((a, b) => a - b)
    const minYear = allYears[0]
    const maxYear = allYears[allYears.length - 1]
    const yearSpan = maxYear - minYear || 1

    // Compute y range
    const yValues = items.map(i => getYValue(i, yMetric))
    const maxY = Math.max(...yValues, 0.01)
    const minY = Math.min(...yValues, 0)
    const yRange = maxY - minY || 0.01

    const plotW = dimensions.width - MARGIN.left - MARGIN.right
    const plotH = dimensions.height - MARGIN.top - MARGIN.bottom

    let total = 0
    const mapped: NebulaDatum[] = items.map(item => {
      const sectorKey = SECTOR_ID_TO_KEY[item.sector_id] ?? 'otros'
      const sectorName = SECTOR_ID_TO_NAME[item.sector_id] ?? 'Otros'
      const color = SECTOR_COLORS[sectorKey] ?? '#64748b'

      const xNorm = (item.year - minYear) / yearSpan
      const yVal = getYValue(item, yMetric)
      const yNorm = (yVal - minY) / yRange

      const cx = MARGIN.left + xNorm * plotW
      const cy = MARGIN.top + (1 - yNorm) * plotH // invert: high risk = top

      const radius = computeRadius(getSizeValue(item, sizeMetric), sizeMetric)
      const glowIntensity = Math.min(item.high_risk_pct, 1)
      const baseOpacity = Math.min(Math.log10(Math.max(item.contracts, 1)) / 6, 1)

      total += item.contracts

      return {
        id: `${item.sector_id}-${item.year}`,
        year: item.year,
        sectorId: item.sector_id,
        sectorKey,
        sectorName,
        color,
        contracts: item.contracts,
        totalValue: item.total_value,
        avgRisk: item.avg_risk,
        highRiskPct: item.high_risk_pct,
        directAwardPct: item.direct_award_pct,
        vendorCount: item.vendor_count,
        institutionCount: item.institution_count,
        cx,
        cy,
        radius,
        glowIntensity,
        baseOpacity,
      }
    })

    return { nebulae: mapped, years: allYears, totalContracts: total }
  }, [items, yMetric, sizeMetric, dimensions])

  // Starfield
  const stars = useMemo(
    () => generateStarField(400, dimensions.width, dimensions.height),
    [dimensions.width, dimensions.height]
  )

  // Constellation lines: connect same-sector orbs by year
  const constellationLines = useMemo(() => {
    const bySector: Record<number, NebulaDatum[]> = {}
    for (const n of nebulae) {
      if (!visibleSectors.has(n.sectorId)) continue
      if (!bySector[n.sectorId]) bySector[n.sectorId] = []
      bySector[n.sectorId].push(n)
    }
    const lines: { x1: number; y1: number; x2: number; y2: number; color: string; sectorId: number }[] = []
    for (const sectorId of Object.keys(bySector)) {
      const sorted = bySector[Number(sectorId)].sort((a, b) => a.year - b.year)
      for (let i = 0; i < sorted.length - 1; i++) {
        lines.push({
          x1: sorted[i].cx, y1: sorted[i].cy,
          x2: sorted[i + 1].cx, y2: sorted[i + 1].cy,
          color: sorted[i].color,
          sectorId: Number(sectorId),
        })
      }
    }
    return lines
  }, [nebulae, visibleSectors])

  // Administration bands
  const adminBands = useMemo(() => {
    if (!years.length) return []
    const minYear = years[0]
    const maxYear = years[years.length - 1]
    const yearSpan = maxYear - minYear || 1
    const plotW = dimensions.width - MARGIN.left - MARGIN.right

    return ADMINISTRATIONS.filter(a => a.endYear > minYear && a.startYear <= maxYear).map(admin => {
      const clampedStart = Math.max(admin.startYear, minYear)
      const clampedEnd = Math.min(admin.endYear, maxYear)
      const x1 = MARGIN.left + ((clampedStart - minYear) / yearSpan) * plotW
      const x2 = MARGIN.left + ((clampedEnd - minYear) / yearSpan) * plotW
      return { ...admin, x1, x2 }
    })
  }, [years, dimensions])

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const yValues = items.map(i => getYValue(i, yMetric))
    const maxY = Math.max(...yValues, 0.01)
    const minY = Math.min(...yValues, 0)
    const yRange = maxY - minY || 0.01
    const plotH = dimensions.height - MARGIN.top - MARGIN.bottom
    const tickCount = 5
    const ticks: { value: number; y: number }[] = []
    for (let i = 0; i <= tickCount; i++) {
      const val = minY + (yRange * i) / tickCount
      const y = MARGIN.top + (1 - i / tickCount) * plotH
      ticks.push({ value: val, y })
    }
    return ticks
  }, [items, yMetric, dimensions])

  // X-axis ticks (every 2 years)
  const xTicks = useMemo(() => {
    if (!years.length) return []
    const minYear = years[0]
    const maxYear = years[years.length - 1]
    const yearSpan = maxYear - minYear || 1
    const plotW = dimensions.width - MARGIN.left - MARGIN.right
    return years.filter(y => y % 2 === 0).map(y => ({
      year: y,
      x: MARGIN.left + ((y - minYear) / yearSpan) * plotW,
    }))
  }, [years, dimensions])

  // Hovered nebula data
  const hoveredNebula = hoveredId ? nebulae.find(n => n.id === hoveredId) : null

  // Hover connection lines (adjacent same-sector years)
  const hoverLines = useMemo(() => {
    if (!hoveredNebula) return []
    return nebulae.filter(n =>
      n.sectorId === hoveredNebula.sectorId &&
      Math.abs(n.year - hoveredNebula.year) === 1 &&
      visibleSectors.has(n.sectorId)
    ).map(n => ({
      x1: hoveredNebula.cx, y1: hoveredNebula.cy,
      x2: n.cx, y2: n.cy,
      color: hoveredNebula.color,
    }))
  }, [hoveredNebula, nebulae, visibleSectors])

  // Toggle sector
  const toggleSector = useCallback((id: number) => {
    setVisibleSectors(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Toggle all
  const toggleAll = useCallback(() => {
    setVisibleSectors(prev => {
      if (prev.size === SECTORS.length) return new Set()
      return new Set(SECTORS.map(s => s.id))
    })
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isError) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: '#030509' }}>
        <div className="flex flex-col items-center gap-3 text-white/60">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm">No se pudo cargar la información. Intente de nuevo más tarde.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: '#030509' }}>
        <div className="text-center">
          <div className="mb-4 text-sm tracking-[0.3em] text-white/40 uppercase">{t('loading')}</div>
          <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-white/30"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '40%' }}
            />
          </div>
        </div>
      </div>
    )
  }

  const svgW = dimensions.width
  const svgH = dimensions.height

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-full flex-col overflow-hidden"
      style={{ background: '#030509' }}
    >
      {/* Header */}
      <header className="relative z-20 flex-shrink-0 px-8 pt-6 pb-2">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30 mb-1.5">
          {t('eyebrow')}
        </p>
        <h1
          className="text-2xl font-light tracking-[0.4em] text-white/90 uppercase"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {t('title')}
        </h1>
        <div className="mt-1 h-px bg-gradient-to-r from-white/30 via-white/10 to-transparent" />
        <p className="mt-2 text-xs tracking-[0.2em] text-white/40 uppercase">
          {t('subtitle')}
          <span className="mx-3 text-white/20">|</span>
          {nebulae.length} {t('nebulaeCount')}
          <span className="mx-2 text-white/20">.</span>
          {formatNumber(totalContracts)} {t('contractsCount')}
          <span className="mx-2 text-white/20">.</span>
          {years.length > 0 ? `${years[0]}-${years[years.length - 1]}` : ''}
        </p>
        <p className="mt-1.5 text-[11px] text-white/45 leading-relaxed max-w-2xl">
          {t('description')}
        </p>
      </header>

      {/* SVG Universe */}
      <div
        className="relative flex-1"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <svg
          width={svgW}
          height={svgH}
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <defs>
            {/* Glow filter */}
            <filter id="stellar-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Hover glow filter */}
            <filter id="stellar-glow-hover" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle radial gradient for admin bands */}
            {ADMINISTRATIONS.map(admin => (
              <linearGradient key={admin.name} id={`admin-grad-${admin.name}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={admin.color} stopOpacity="0.04" />
                <stop offset="50%" stopColor={admin.color} stopOpacity="0.02" />
                <stop offset="100%" stopColor={admin.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Background stars */}
          <g className="pointer-events-none">
            {stars.map((star, i) => (
              <circle
                key={i}
                cx={star.x}
                cy={star.y}
                r={star.r}
                fill="white"
                opacity={star.opacity}
              />
            ))}
          </g>

          {/* Administration bands */}
          {adminBands.map(band => (
            <g key={band.name}>
              <rect
                x={band.x1}
                y={MARGIN.top - 20}
                width={Math.max(band.x2 - band.x1, 0)}
                height={svgH - MARGIN.top - MARGIN.bottom + 40}
                fill={`url(#admin-grad-${band.name})`}
              />
              <line
                x1={band.x1}
                y1={MARGIN.top - 20}
                x2={band.x1}
                y2={svgH - MARGIN.bottom + 20}
                stroke={band.color}
                strokeOpacity="0.08"
                strokeWidth="1"
                strokeDasharray="4,8"
              />
              <text
                x={(band.x1 + band.x2) / 2}
                y={MARGIN.top - 28}
                textAnchor="middle"
                fill={band.color}
                fontSize="10"
                opacity="0.35"
                fontFamily="system-ui, sans-serif"
                letterSpacing="0.15em"
              >
                {band.name.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Y-axis */}
          <g className="pointer-events-none">
            <text
              x={MARGIN.left - 50}
              y={MARGIN.top + (svgH - MARGIN.top - MARGIN.bottom) / 2}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              opacity="0.3"
              fontFamily="system-ui, sans-serif"
              letterSpacing="0.1em"
              transform={`rotate(-90, ${MARGIN.left - 50}, ${MARGIN.top + (svgH - MARGIN.top - MARGIN.bottom) / 2})`}
            >
              {t(Y_LABEL_KEYS[yMetric])}
            </text>
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={MARGIN.left - 4}
                  y1={tick.y}
                  x2={dimensions.width - MARGIN.right}
                  y2={tick.y}
                  stroke="white"
                  strokeOpacity="0.04"
                  strokeWidth="1"
                />
                <text
                  x={MARGIN.left - 8}
                  y={tick.y + 3}
                  textAnchor="end"
                  fill="white"
                  fontSize="9"
                  opacity="0.3"
                  fontFamily="monospace"
                >
                  {yMetric === 'avg_risk'
                    ? tick.value.toFixed(2)
                    : `${(tick.value * 100).toFixed(0)}%`}
                </text>
              </g>
            ))}
          </g>

          {/* X-axis */}
          <g className="pointer-events-none">
            {xTicks.map(tick => (
              <g key={tick.year}>
                <line
                  x1={tick.x}
                  y1={MARGIN.top}
                  x2={tick.x}
                  y2={svgH - MARGIN.bottom}
                  stroke="white"
                  strokeOpacity="0.03"
                  strokeWidth="1"
                />
                <text
                  x={tick.x}
                  y={svgH - MARGIN.bottom + 18}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  opacity="0.35"
                  fontFamily="monospace"
                >
                  {tick.year}
                </text>
              </g>
            ))}
          </g>

          {/* Constellation lines */}
          {constellationLines.map((line, i) => (
            <line
              key={`const-${i}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.color}
              strokeOpacity={hoveredNebula?.sectorId === line.sectorId ? 0.25 : 0.07}
              strokeWidth={hoveredNebula?.sectorId === line.sectorId ? 1.5 : 0.8}
              className="transition-all duration-300"
            />
          ))}

          {/* Hover connection lines */}
          {hoverLines.map((line, i) => (
            <line
              key={`hover-${i}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.color}
              strokeOpacity="0.5"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
          ))}

          {/* Nebulae (sector-year orbs) */}
          {nebulae
            .filter(n => visibleSectors.has(n.sectorId))
            .map((n) => {
              const isHovered = hoveredId === n.id
              const scale = isHovered ? 1.4 : 1
              const sectorIndex = n.sectorId - 1

              return (
                <g
                  key={n.id}
                  onMouseEnter={() => setHoveredId(n.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer glow (large, very faint) */}
                  <circle
                    cx={n.cx}
                    cy={n.cy}
                    r={n.radius * 3 * scale}
                    fill={n.color}
                    opacity={0.03 + n.glowIntensity * 0.12}
                    filter={isHovered ? 'url(#stellar-glow-hover)' : undefined}
                  >
                    {!reducedMotion && (
                      <animate
                        attributeName="opacity"
                        values={`${0.03 + n.glowIntensity * 0.1};${0.05 + n.glowIntensity * 0.15};${0.03 + n.glowIntensity * 0.1}`}
                        dur={`${4 + sectorIndex * 0.3}s`}
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>

                  {/* Medium glow */}
                  <circle
                    cx={n.cx}
                    cy={n.cy}
                    r={n.radius * 1.8 * scale}
                    fill={n.color}
                    opacity={0.08 + n.glowIntensity * 0.22}
                  />

                  {/* Core orb */}
                  <circle
                    cx={n.cx}
                    cy={n.cy}
                    r={n.radius * scale}
                    fill={n.color}
                    opacity={0.5 + n.baseOpacity * 0.4}
                    stroke={isHovered ? 'white' : 'none'}
                    strokeWidth={isHovered ? 1 : 0}
                    strokeOpacity={0.6}
                    className="transition-all duration-200"
                  >
                    {!reducedMotion && (
                      <animate
                        attributeName="r"
                        values={`${n.radius * scale};${n.radius * scale * 1.04};${n.radius * scale}`}
                        dur={`${4 + sectorIndex * 0.3}s`}
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>

                  {/* Bright center point */}
                  <circle
                    cx={n.cx}
                    cy={n.cy}
                    r={Math.max(n.radius * 0.3 * scale, 1)}
                    fill="white"
                    opacity={0.4 + n.baseOpacity * 0.3}
                  />

                  {/* Dimmed sector label when highlighted */}
                  {isHovered && (
                    <text
                      x={n.cx}
                      y={n.cy - n.radius * scale - 10}
                      textAnchor="middle"
                      fill={n.color}
                      fontSize="9"
                      fontFamily="system-ui, sans-serif"
                      opacity="0.8"
                      letterSpacing="0.1em"
                    >
                      {n.sectorName} {n.year}
                    </text>
                  )}
                </g>
              )
            })}

          {/* Staggered entrance animation overlay — fade in via motion group */}
          {!reducedMotion && nebulae.length > 0 && (
            <rect
              width={svgW}
              height={svgH}
              fill="#030509"
              opacity="0"
              className="pointer-events-none"
            >
              <animate
                attributeName="opacity"
                values="1;0"
                dur="2s"
                fill="freeze"
                repeatCount="1"
              />
            </rect>
          )}
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredNebula && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute z-30"
              style={{
                left: Math.min(
                  hoveredNebula.cx * zoom + pan.x + 20,
                  dimensions.width - 280
                ),
                top: Math.max(
                  hoveredNebula.cy * zoom + pan.y - 100,
                  10
                ),
              }}
            >
              <div
                className="rounded-lg border px-4 py-3 shadow-2xl backdrop-blur-md"
                style={{
                  background: 'rgba(3, 5, 9, 0.92)',
                  borderColor: hoveredNebula.color + '40',
                  minWidth: 220,
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: hoveredNebula.color, boxShadow: `0 0 6px ${hoveredNebula.color}` }}
                  />
                  <span className="text-xs font-medium tracking-wider text-white/90 uppercase">
                    {hoveredNebula.sectorName}
                  </span>
                  <span className="ml-auto font-mono text-xs text-white/50">{hoveredNebula.year}</span>
                </div>
                <div className="h-px mb-2" style={{ background: hoveredNebula.color + '20' }} />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-white/40">{t('tooltip.contracts')}</span>
                  <span className="text-right font-mono text-white/80">{formatNumber(hoveredNebula.contracts)}</span>
                  <span className="text-white/40">{t('tooltip.value')}</span>
                  <span className="text-right font-mono text-white/80">{formatCompactMXN(hoveredNebula.totalValue)}</span>
                  <span className="text-white/40">{t('tooltip.avgRisk')}</span>
                  <span className="text-right font-mono text-white/80">{(hoveredNebula.avgRisk * 100).toFixed(1)}%</span>
                  <span className="text-white/40">{t('tooltip.highRisk')}</span>
                  <span className="text-right font-mono text-white/80">{(hoveredNebula.highRiskPct * 100).toFixed(1)}%</span>
                  <span className="text-white/40">{t('tooltip.directAward')}</span>
                  <span className="text-right font-mono text-white/80">{(hoveredNebula.directAwardPct * 100).toFixed(1)}%</span>
                  <span className="text-white/40">{t('tooltip.vendors')}</span>
                  <span className="text-right font-mono text-white/80">{formatNumber(hoveredNebula.vendorCount)}</span>
                  <span className="text-white/40">{t('tooltip.institutions')}</span>
                  <span className="text-right font-mono text-white/80">{formatNumber(hoveredNebula.institutionCount)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom control panel */}
      <footer className="relative z-20 flex-shrink-0 border-t border-white/5 bg-black/40 px-6 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-6">
          {/* Sector toggles */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={toggleAll}
              className="mr-1 rounded px-2 py-0.5 text-[10px] tracking-wider text-white/40 uppercase transition-colors hover:bg-white/5 hover:text-white/60"
            >
              {visibleSectors.size === SECTORS.length ? t('controls.none') : t('controls.all')}
            </button>
            {SECTORS.map(s => {
              const active = visibleSectors.has(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSector(s.id)}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] tracking-wider uppercase transition-all"
                  style={{
                    background: active ? s.color + '20' : 'transparent',
                    color: active ? s.color : 'rgba(255,255,255,0.2)',
                    border: `1px solid ${active ? s.color + '40' : 'transparent'}`,
                  }}
                  title={s.name}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full transition-all"
                    style={{
                      background: active ? s.color : 'rgba(255,255,255,0.15)',
                      boxShadow: active ? `0 0 4px ${s.color}` : 'none',
                    }}
                  />
                  {s.code.slice(0, 4)}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10" />

          {/* Y-axis metric */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] tracking-wider text-white/30 uppercase">{t('controls.yAxis')}</span>
            {(Object.keys(Y_LABEL_KEYS) as YAxisMetric[]).map((key) => (
              <button
                key={key}
                onClick={() => setYMetric(key)}
                className="rounded px-2 py-0.5 text-[10px] tracking-wider uppercase transition-colors"
                style={{
                  background: yMetric === key ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: yMetric === key ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                }}
              >
                {t(Y_LABEL_KEYS[key])}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10" />

          {/* Size metric */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] tracking-wider text-white/30 uppercase">{t('controls.size')}</span>
            {(Object.keys(SIZE_LABEL_KEYS) as SizeMetric[]).map((key) => (
              <button
                key={key}
                onClick={() => setSizeMetric(key)}
                className="rounded px-2 py-0.5 text-[10px] tracking-wider uppercase transition-colors"
                style={{
                  background: sizeMetric === key ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: sizeMetric === key ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                }}
              >
                {t(SIZE_LABEL_KEYS[key])}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-white/10" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] tracking-wider text-white/30 uppercase">{t('controls.zoom')}</span>
            <button
              onClick={() => setZoom(z => Math.max(z * 0.8, 0.5))}
              className="rounded px-2 py-0.5 text-[11px] text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
            >
              -
            </button>
            <span className="min-w-[3em] text-center font-mono text-[10px] text-white/40">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(z * 1.25, 4))}
              className="rounded px-2 py-0.5 text-[11px] text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
            >
              +
            </button>
            <button
              onClick={resetView}
              className="rounded px-2 py-0.5 text-[10px] tracking-wider text-white/30 uppercase transition-colors hover:bg-white/5 hover:text-white/50"
            >
              {t('controls.reset')}
            </button>
          </div>
        </div>
      </footer>

      {/* Legend — bottom-right floating */}
      <div className="pointer-events-none absolute right-6 bottom-20 z-20">
        <div className="rounded-lg border border-white/5 bg-black/50 px-3 py-2 text-[9px] text-white/30 backdrop-blur-sm">
          <div className="mb-1 tracking-wider uppercase">{t('legend.size')} = {t(SIZE_LABEL_KEYS[sizeMetric])}</div>
          <div className="mb-1 tracking-wider uppercase">{t('legend.brightness')} = {t('legend.highRisk')}</div>
          <div className="tracking-wider uppercase">{t('legend.positionY')} = {t(Y_LABEL_KEYS[yMetric])}</div>
        </div>
      </div>
    </div>
  )
}
