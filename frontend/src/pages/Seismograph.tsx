import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { analysisApi } from '@/api/client'
import type { SectorYearItem } from '@/api/types'
import { SECTORS } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISPLAYED_SECTORS = [1, 4, 3, 8, 2, 6, 7] as const

const SECTOR_NAMES: Record<number, string> = {
  1: 'SALUD',
  2: 'EDUCACION',
  3: 'INFRAEST.',
  4: 'ENERGIA',
  5: 'DEFENSA',
  6: 'TECNOLOGIA',
  7: 'HACIENDA',
  8: 'GOBERNACION',
  9: 'AGRICULTURA',
  10: 'AMBIENTE',
  11: 'TRABAJO',
  12: 'OTROS',
}

const SECTOR_ID_TO_CODE: Record<number, string> = {}
for (const s of SECTORS) {
  SECTOR_ID_TO_CODE[s.id] = s.code
}

const SECTOR_ID_TO_COLOR: Record<number, string> = {}
for (const s of SECTORS) {
  SECTOR_ID_TO_COLOR[s.id] = s.color
}

const SCANDAL_EVENTS = [
  { year: 2017, label: 'La Estafa\nMaestra', color: '#ef4444' },
  { year: 2019, label: 'Caso Lozoya\nOdebrecht', color: '#ef4444' },
  { year: 2020, label: 'Compras\nCOVID-19', color: '#f97316' },
  { year: 2021, label: 'Segalmex\nEscandalo', color: '#ef4444' },
] as const

const BG_COLOR = '#060a12'
const CHANNEL_HEIGHT = 90
const LABEL_WIDTH = 140
const YEAR_MIN = 2010
const YEAR_MAX = 2025
const TOP_PADDING = 24
const BOTTOM_PADDING = 40
const RIGHT_PADDING = 20

// ---------------------------------------------------------------------------
// Catmull-Rom spline interpolation
// ---------------------------------------------------------------------------

interface Point {
  x: number
  y: number
}

function catmullRomToBezierPath(points: Point[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`
  }

  let d = `M ${points[0].x},${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }

  return d
}

// ---------------------------------------------------------------------------
// Data processing
// ---------------------------------------------------------------------------

interface ChannelData {
  sectorId: number
  sectorName: string
  color: string
  points: Point[]
  pathD: string
  baselineY: number
  yearValues: Map<number, { highRiskPct: number; contracts: number; totalValue: number; avgRisk: number }>
}

function processData(
  items: SectorYearItem[],
  chartWidth: number,
): { channels: ChannelData[]; years: number[] } {
  const years: number[] = []
  for (let y = YEAR_MIN; y <= YEAR_MAX; y++) years.push(y)

  const xScale = (year: number) => {
    const t = (year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)
    return t * chartWidth
  }

  // Build per-sector data
  const bySector = new Map<number, Map<number, SectorYearItem>>()
  for (const item of items) {
    if (item.year < YEAR_MIN || item.year > YEAR_MAX) continue
    if (!bySector.has(item.sector_id)) bySector.set(item.sector_id, new Map())
    bySector.get(item.sector_id)!.set(item.year, item)
  }

  // Compute deviations and find global max
  const sectorDevs = new Map<number, Map<number, number>>()
  let globalMaxDev = 0

  for (const sectorId of DISPLAYED_SECTORS) {
    const sectorData = bySector.get(sectorId)
    if (!sectorData) continue

    const pcts: number[] = []
    for (const year of years) {
      const item = sectorData.get(year)
      if (item) pcts.push(item.high_risk_pct)
    }
    if (pcts.length === 0) continue

    const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length
    const devMap = new Map<number, number>()
    for (const year of years) {
      const item = sectorData.get(year)
      const dev = item ? item.high_risk_pct - mean : 0
      devMap.set(year, dev)
      globalMaxDev = Math.max(globalMaxDev, Math.abs(dev))
    }
    sectorDevs.set(sectorId, devMap)
  }

  if (globalMaxDev === 0) globalMaxDev = 1

  // Build channels
  const channels: ChannelData[] = []
  let channelIndex = 0

  for (const sectorId of DISPLAYED_SECTORS) {
    const devMap = sectorDevs.get(sectorId)
    const sectorData = bySector.get(sectorId)
    if (!devMap) continue

    const baselineY = TOP_PADDING + channelIndex * CHANNEL_HEIGHT + CHANNEL_HEIGHT / 2

    const yearValues = new Map<number, { highRiskPct: number; contracts: number; totalValue: number; avgRisk: number }>()
    const points: Point[] = []

    for (const year of years) {
      const dev = devMap.get(year) ?? 0
      const yOffset = -(dev / globalMaxDev) * (CHANNEL_HEIGHT * 0.38)
      points.push({ x: xScale(year), y: baselineY + yOffset })

      const item = sectorData?.get(year)
      if (item) {
        yearValues.set(year, {
          highRiskPct: item.high_risk_pct,
          contracts: item.contracts,
          totalValue: item.total_value,
          avgRisk: item.avg_risk,
        })
      }
    }

    const pathD = catmullRomToBezierPath(points)

    channels.push({
      sectorId,
      sectorName: SECTOR_NAMES[sectorId] ?? `SECTOR ${sectorId}`,
      color: SECTOR_ID_TO_COLOR[sectorId] ?? '#64748b',
      points,
      pathD,
      baselineY,
      yearValues,
    })

    channelIndex++
  }

  return { channels, years }
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipData {
  x: number
  year: number
  entries: {
    sectorName: string
    color: string
    highRiskPct: number
    contracts: number
  }[]
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Seismograph() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgWidth, setSvgWidth] = useState(900)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ['sector-year-breakdown-seismo'],
    queryFn: () => analysisApi.getSectorYearBreakdown(),
    staleTime: 10 * 60 * 1000,
  })

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        if (w > 0) setSvgWidth(w)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const chartWidth = Math.max(100, svgWidth - LABEL_WIDTH - RIGHT_PADDING)
  const svgHeight = TOP_PADDING + DISPLAYED_SECTORS.length * CHANNEL_HEIGHT + BOTTOM_PADDING

  const { channels, years } = useMemo(() => {
    if (!rawData?.data) return { channels: [], years: [] }
    return processData(rawData.data, chartWidth)
  }, [rawData, chartWidth])

  // Year x positions for axis & events
  const yearX = useCallback(
    (year: number) => {
      const t = (year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)
      return LABEL_WIDTH + t * chartWidth
    },
    [chartWidth],
  )

  // Mouse interaction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const chartX = mouseX - LABEL_WIDTH

      if (chartX < 0 || chartX > chartWidth) {
        setTooltip(null)
        return
      }

      const yearFrac = (chartX / chartWidth) * (YEAR_MAX - YEAR_MIN) + YEAR_MIN
      const year = Math.round(yearFrac)
      const clampedYear = Math.max(YEAR_MIN, Math.min(YEAR_MAX, year))

      const entries: TooltipData['entries'] = []
      for (const ch of channels) {
        const val = ch.yearValues.get(clampedYear)
        if (val) {
          entries.push({
            sectorName: ch.sectorName,
            color: ch.color,
            highRiskPct: val.highRiskPct,
            contracts: val.contracts,
          })
        }
      }

      setTooltip({
        x: yearX(clampedYear),
        year: clampedYear,
        entries,
      })
    },
    [channels, chartWidth, yearX],
  )

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG_COLOR }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="font-mono text-xs text-white/40 tracking-widest uppercase">
            Cargando datos sismicos...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG_COLOR }}>
        <p className="font-mono text-sm text-red-400">Error al cargar datos</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: BG_COLOR }}>
      {/* Header */}
      <div className="px-6 pt-10 pb-4 max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1
            className="font-mono text-2xl md:text-3xl font-bold tracking-[0.3em] text-white/90"
            style={{ letterSpacing: '0.3em' }}
          >
            EL SISMOGRAFO
          </h1>
          <div className="mt-2 h-px bg-gradient-to-r from-white/30 via-white/10 to-transparent" />
          <p className="mt-3 font-mono text-[11px] text-white/35 tracking-[0.15em] uppercase leading-relaxed">
            Monitoreo de anomalias en contratacion publica
            <span className="text-white/15 mx-2">&middot;</span>
            2010-2025
            <span className="text-white/15 mx-2">&middot;</span>
            Sistema de deteccion temporal de riesgo RUBLI
          </p>
        </motion.div>

        {/* Legend */}
        <motion.div
          className="mt-5 flex flex-wrap gap-x-5 gap-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {channels.map((ch) => (
            <div key={ch.sectorId} className="flex items-center gap-1.5">
              <div
                className="w-3 h-[2px] rounded-full"
                style={{ backgroundColor: ch.color, boxShadow: `0 0 6px ${ch.color}60` }}
              />
              <span className="font-mono text-[10px] tracking-wider" style={{ color: `${ch.color}99` }}>
                {ch.sectorName}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-3">
            <div className="w-3 h-3 rounded-sm bg-red-500/15 border border-red-500/30" />
            <span className="font-mono text-[10px] tracking-wider text-red-400/50">ESCANDALO</span>
          </div>
        </motion.div>
      </div>

      {/* Seismograph */}
      <div className="px-4 pb-10 max-w-[1400px] mx-auto" ref={containerRef}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <svg
            width="100%"
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="overflow-visible select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            role="img"
            aria-label="Seismograph visualization of procurement risk anomalies across sectors from 2010 to 2025"
          >
            {/* Glow filter definitions */}
            <defs>
              {channels.map((ch) => {
                const code = SECTOR_ID_TO_CODE[ch.sectorId] ?? 'default'
                return (
                  <filter key={code} id={`glow-${code}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )
              })}
            </defs>

            {/* Scandal bands */}
            {SCANDAL_EVENTS.map((evt) => {
              const cx = yearX(evt.year)
              const bandWidth = chartWidth / (YEAR_MAX - YEAR_MIN) * 0.7
              return (
                <g key={evt.year}>
                  <rect
                    x={cx - bandWidth / 2}
                    y={0}
                    width={bandWidth}
                    height={svgHeight - BOTTOM_PADDING + 8}
                    fill={evt.color}
                    opacity={0.06}
                    rx={2}
                  />
                  <line
                    x1={cx}
                    y1={0}
                    x2={cx}
                    y2={svgHeight - BOTTOM_PADDING + 8}
                    stroke={evt.color}
                    strokeWidth={0.5}
                    opacity={0.2}
                    strokeDasharray="4 4"
                  />
                  {/* Event label */}
                  {evt.label.split('\n').map((line, li) => (
                    <text
                      key={li}
                      x={cx + 5}
                      y={14 + li * 12}
                      fill={evt.color}
                      opacity={0.55}
                      fontSize={9}
                      fontFamily="monospace"
                      letterSpacing="0.05em"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )
            })}

            {/* Channel baselines & labels */}
            {channels.map((ch) => (
              <g key={`baseline-${ch.sectorId}`}>
                {/* Baseline */}
                <line
                  x1={LABEL_WIDTH}
                  y1={ch.baselineY}
                  x2={LABEL_WIDTH + chartWidth}
                  y2={ch.baselineY}
                  stroke="white"
                  strokeWidth={0.3}
                  opacity={0.08}
                />
                {/* Channel top/bottom guides */}
                <line
                  x1={LABEL_WIDTH}
                  y1={ch.baselineY - CHANNEL_HEIGHT * 0.38}
                  x2={LABEL_WIDTH + chartWidth}
                  y2={ch.baselineY - CHANNEL_HEIGHT * 0.38}
                  stroke="white"
                  strokeWidth={0.2}
                  opacity={0.03}
                  strokeDasharray="2 6"
                />
                <line
                  x1={LABEL_WIDTH}
                  y1={ch.baselineY + CHANNEL_HEIGHT * 0.38}
                  x2={LABEL_WIDTH + chartWidth}
                  y2={ch.baselineY + CHANNEL_HEIGHT * 0.38}
                  stroke="white"
                  strokeWidth={0.2}
                  opacity={0.03}
                  strokeDasharray="2 6"
                />
                {/* Sector label */}
                <text
                  x={LABEL_WIDTH - 12}
                  y={ch.baselineY + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={ch.color}
                  opacity={0.5}
                  fontSize={11}
                  fontFamily="monospace"
                  fontWeight={600}
                  letterSpacing="0.08em"
                >
                  {ch.sectorName}
                </text>
                {/* Small tick mark */}
                <line
                  x1={LABEL_WIDTH - 6}
                  y1={ch.baselineY}
                  x2={LABEL_WIDTH}
                  y2={ch.baselineY}
                  stroke={ch.color}
                  strokeWidth={1}
                  opacity={0.25}
                />
              </g>
            ))}

            {/* Waveform traces */}
            {channels.map((ch, i) => {
              const code = SECTOR_ID_TO_CODE[ch.sectorId] ?? 'default'
              // Offset path x by LABEL_WIDTH (points were computed relative to chartWidth)
              const offsetPath = ch.pathD.replace(
                /(-?\d+\.?\d*),(-?\d+\.?\d*)/g,
                (_, xStr, yStr) => {
                  const xVal = parseFloat(xStr) + LABEL_WIDTH
                  return `${xVal},${yStr}`
                },
              )

              return (
                <g key={`trace-${ch.sectorId}`}>
                  {/* Glow layer */}
                  <motion.path
                    d={offsetPath}
                    fill="none"
                    stroke={ch.color}
                    strokeWidth={6}
                    opacity={0.2}
                    filter={`url(#glow-${code})`}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 2.5,
                      delay: i * 0.2,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  >
                    {!prefersReducedMotion && (
                      <animate
                        attributeName="opacity"
                        values="0.15;0.35;0.15"
                        dur="4s"
                        repeatCount="indefinite"
                        begin={`${i * 0.3}s`}
                      />
                    )}
                  </motion.path>

                  {/* Sharp trace */}
                  <motion.path
                    d={offsetPath}
                    fill="none"
                    stroke={ch.color}
                    strokeWidth={1.5}
                    opacity={0.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 2.5,
                      delay: i * 0.2,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  />

                  {/* Data points */}
                  {ch.points.map((pt, pi) => (
                    <motion.circle
                      key={pi}
                      cx={pt.x + LABEL_WIDTH}
                      cy={pt.y}
                      r={2}
                      fill={ch.color}
                      opacity={0}
                      initial={prefersReducedMotion ? { opacity: 0.5 } : { opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      transition={{ delay: i * 0.2 + 2.5 + pi * 0.03, duration: 0.3 }}
                    />
                  ))}
                </g>
              )
            })}

            {/* X-axis year labels */}
            {years.map((year) => {
              const cx = yearX(year)
              return (
                <g key={`year-${year}`}>
                  <line
                    x1={cx}
                    y1={svgHeight - BOTTOM_PADDING + 4}
                    x2={cx}
                    y2={svgHeight - BOTTOM_PADDING + 10}
                    stroke="white"
                    strokeWidth={0.6}
                    opacity={0.2}
                  />
                  <text
                    x={cx}
                    y={svgHeight - BOTTOM_PADDING + 22}
                    textAnchor="middle"
                    fill="white"
                    opacity={year % 5 === 0 ? 0.4 : 0.2}
                    fontSize={10}
                    fontFamily="monospace"
                    letterSpacing="0.05em"
                  >
                    {year}
                  </text>
                </g>
              )
            })}

            {/* Vertical axis line */}
            <line
              x1={LABEL_WIDTH}
              y1={0}
              x2={LABEL_WIDTH}
              y2={svgHeight - BOTTOM_PADDING + 10}
              stroke="white"
              strokeWidth={0.5}
              opacity={0.1}
            />

            {/* Bottom axis line */}
            <line
              x1={LABEL_WIDTH}
              y1={svgHeight - BOTTOM_PADDING + 4}
              x2={LABEL_WIDTH + chartWidth}
              y2={svgHeight - BOTTOM_PADDING + 4}
              stroke="white"
              strokeWidth={0.5}
              opacity={0.1}
            />

            {/* Hover crosshair */}
            {tooltip && (
              <g>
                <line
                  x1={tooltip.x}
                  y1={0}
                  x2={tooltip.x}
                  y2={svgHeight - BOTTOM_PADDING + 4}
                  stroke="white"
                  strokeWidth={0.5}
                  opacity={0.35}
                  strokeDasharray="3 3"
                />
                {/* Dots on each channel at crosshair */}
                {channels.map((ch) => {
                  const yearIdx = tooltip.year - YEAR_MIN
                  const pt = ch.points[yearIdx]
                  if (!pt) return null
                  return (
                    <circle
                      key={`dot-${ch.sectorId}`}
                      cx={pt.x + LABEL_WIDTH}
                      cy={pt.y}
                      r={4}
                      fill={ch.color}
                      stroke={BG_COLOR}
                      strokeWidth={1.5}
                      opacity={0.9}
                    />
                  )
                })}
              </g>
            )}
          </svg>

          {/* HTML tooltip overlay */}
          {tooltip && tooltip.entries.length > 0 && (
            <div
              className="absolute pointer-events-none z-50"
              style={{
                left: tooltip.x + (tooltip.x > svgWidth * 0.7 ? -200 : 16),
                top: TOP_PADDING + 20,
              }}
            >
              <div
                className="rounded-lg border px-3 py-2.5 shadow-2xl"
                style={{
                  background: 'rgba(6,10,18,0.92)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)',
                  minWidth: 170,
                }}
              >
                <div className="font-mono text-[10px] text-white/40 tracking-widest mb-2 uppercase">
                  {tooltip.year}
                </div>
                {tooltip.entries.map((e) => (
                  <div key={e.sectorName} className="flex items-center justify-between gap-4 py-0.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: e.color, boxShadow: `0 0 4px ${e.color}50` }}
                      />
                      <span className="font-mono text-[10px] text-white/60">{e.sectorName}</span>
                    </div>
                    <span className="font-mono text-[11px] text-white/80 tabular-nums">
                      {(e.highRiskPct * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
                <div className="mt-1.5 pt-1.5 border-t border-white/5">
                  <div className="flex justify-between">
                    <span className="font-mono text-[9px] text-white/25 uppercase">Total contratos</span>
                    <span className="font-mono text-[10px] text-white/40 tabular-nums">
                      {tooltip.entries.reduce((s, e) => s + e.contracts, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Footer annotation */}
        <motion.div
          className="mt-6 flex items-center gap-3 px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.0, duration: 1.0 }}
        >
          <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
          <p className="font-mono text-[10px] text-white/20 tracking-wider leading-relaxed">
            Cada canal muestra la desviacion del porcentaje de contratos de alto riesgo respecto a la
            media historica del sector. Oscilaciones ascendentes indican periodos con anomalias por
            encima del promedio.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
