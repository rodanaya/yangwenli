/**
 * CompetitionSlopeChart — FT-vocabulary slope chart of direct-award % per sector
 * vs OECD 25% ceiling, 2015–2025.
 *
 * Implements docs/SECTORS_REDESIGN_PLAN.md §5 HERO 2.
 *
 * Design decisions:
 * - Custom SVG (not EditorialLineChart) because per-line raw hex from SECTOR_COLORS
 *   and dynamic opacity-based gray-out cannot be expressed through EditorialLineChart's
 *   token system (ColorToken is semantic, not raw-hex).
 * - Data source: sectorApi.getTrends(id) — the /sectors/:id/trends endpoint returns
 *   SectorTrend[] which includes direct_award_pct per year. Confirmed in
 *   backend/api/routers/sectors.py lines 376, 408, 553, 596.
 * - Sectors ending 2025 above 25% DA: labeled right-edge in sector color.
 *   Sectors below: grouped into a single muted "+ N below ceiling" cluster label.
 * - COVID band: 2020–2021 shaded amber/5 opacity.
 * - Hover: hovered line → 2.5px full color; others → 0.3 opacity.
 * - Click: navigate to /sectors/:id.
 * - YEARS: 2015–2025 (11 points). If a sector has no data for a year, the line
 *   gaps naturally (null-coalesced to undefined = recharts gaps, but we use SVG
 *   path so we skip missing points).
 *
 * Build: 2026-05-04-p2
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { sectorApi } from '@/api/client'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS, SECTORS } from '@/lib/constants'
import type { SectorTrend } from '@/api/types'

// ── Constants ──────────────────────────────────────────────────────────────────

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const OECD_THRESHOLD = 25 // percent
const OECD_CYAN = '#22d3ee'
const MUTED_GRAY = '#a1a1aa'

// Chart layout
const MARGIN = { top: 24, right: 128, bottom: 32, left: 44 }
const CHART_HEIGHT = 340

// ── Types ──────────────────────────────────────────────────────────────────────

interface SectorLine {
  sectorId: number
  sectorCode: string
  sectorName: string
  color: string
  points: Array<{ year: number; da: number }>
  /** DA% at the last available year (rightmost point) */
  endDa: number
  /** DA% at 2015 (leftmost point, for delta calculation) */
  startDa: number
  /** True if endDa > OECD_THRESHOLD — sector "crosses the ceiling" */
  crossesCeiling: boolean
}

interface TooltipState {
  x: number
  y: number
  year: number
  sectorName: string
  daPct: number
  delta: number
}

// ── Utility: SVG path from (x,y) point pairs ──────────────────────────────────

function pointsToPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return ''
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')
}

// ── Sub-component: individual line + endpoint dot ─────────────────────────────

interface SlopeLineProps {
  line: SectorLine
  scaleX: (year: number) => number
  scaleY: (pct: number) => number
  isHovered: boolean
  anyHovered: boolean
  onHover: (id: number | null, tooltip: TooltipState | null) => void
  onClick: () => void
}

function SlopeLine({ line, scaleX, scaleY, isHovered, anyHovered, onClick, onHover }: SlopeLineProps) {
  const stroke = line.crossesCeiling ? line.color : MUTED_GRAY
  const opacity = anyHovered ? (isHovered ? 1 : 0.18) : 0.85
  const strokeWidth = isHovered ? 2.5 : 1.5
  const pts = line.points.map((p) => ({ x: scaleX(p.year), y: scaleY(p.da) }))
  const pathD = pointsToPath(pts)
  const lastPt = pts[pts.length - 1]

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      // Find nearest year based on mouse x in SVG coords
      const svgEl = (e.currentTarget as SVGGElement).closest('svg')
      if (!svgEl) return
      const rect = svgEl.getBoundingClientRect()
      const mouseX = e.clientX - rect.left - MARGIN.left
      const innerW = rect.width - MARGIN.left - MARGIN.right
      const yearFrac = (mouseX / innerW) * (YEARS.length - 1)
      const yearIdx = Math.max(0, Math.min(YEARS.length - 1, Math.round(yearFrac)))
      const year = YEARS[yearIdx]
      const pt = line.points.find((p) => p.year === year) ?? line.points[line.points.length - 1]
      const delta = pt.da - line.startDa
      onHover(line.sectorId, {
        x: e.clientX,
        y: e.clientY,
        year: pt.year,
        sectorName: line.sectorName,
        daPct: pt.da,
        delta,
      })
    },
    [line, onHover],
  )

  const handleMouseLeave = useCallback(() => {
    onHover(null, null)
  }, [onHover])

  return (
    <g
      style={{ opacity, cursor: 'pointer', transition: 'opacity 0.15s' }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Invisible fat hit-area */}
      <path d={pathD} stroke="transparent" strokeWidth={12} fill="none" />
      {/* Visible line */}
      <path
        d={pathD}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ transition: 'stroke-width 0.1s' }}
      />
      {/* Endpoint dot */}
      {lastPt && (
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r={isHovered ? 4 : 3}
          fill={stroke}
          style={{ transition: 'r 0.1s' }}
        />
      )}
    </g>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CompetitionSlopeChart() {
  const { i18n } = useTranslation('sectors')
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [showAll, setShowAll] = useState(false)

  // ── Fetch trends for all 12 sectors in parallel ──────────────────────────────
  const queries = useQueries({
    queries: SECTORS.map((s) => ({
      queryKey: ['sector-trends', s.id],
      queryFn: () => sectorApi.getTrends(s.id),
      staleTime: 10 * 60 * 1000,
      retry: 1,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const hasData = queries.some((q) => q.data)

  // ── Build per-sector lines ────────────────────────────────────────────────────
  const lines: SectorLine[] = useMemo(() => {
    return SECTORS.map((s, idx) => {
      const raw = queries[idx]?.data
      // The API returns { data: SectorTrend[] } — SectorTrend has direct_award_pct
      const trends = (raw as unknown as { data: SectorTrend[] } | null)?.data ?? []
      const yearRange = trends.filter((r) => r.year >= 2015 && r.year <= 2025)
      const points = yearRange.map((r) => ({ year: r.year, da: r.direct_award_pct }))
      const endPt = points[points.length - 1]
      const startPt = points[0]
      const endDa = endPt?.da ?? 0
      const startDa = startPt?.da ?? 0
      return {
        sectorId: s.id,
        sectorCode: s.code,
        sectorName: i18n.language === 'es' ? s.name : s.nameEN,
        color: SECTOR_COLORS[s.code] ?? MUTED_GRAY,
        points,
        endDa,
        startDa,
        crossesCeiling: endDa > OECD_THRESHOLD,
      }
    })
  }, [queries, i18n.language])

  const crossers = lines.filter((l) => l.crossesCeiling)
  const belowCount = lines.filter((l) => !l.crossesCeiling).length

  // Filtered lines for "show all" toggle
  const visibleLines = showAll ? lines : lines

  // ── Scales ────────────────────────────────────────────────────────────────────
  // We use proportional positioning. SVG inner dimensions depend on container
  // width; use viewBox for responsive scaling.
  const VB_WIDTH = 760
  const VB_HEIGHT = CHART_HEIGHT
  const innerW = VB_WIDTH - MARGIN.left - MARGIN.right
  const innerH = VB_HEIGHT - MARGIN.top - MARGIN.bottom

  // Y domain: 0–80 (to give headroom above highest lines)
  const Y_MAX = 80
  const Y_MIN = 0

  const scaleX = useCallback(
    (year: number) => {
      const idx = YEARS.indexOf(year)
      if (idx < 0) return MARGIN.left
      return MARGIN.left + (idx / (YEARS.length - 1)) * innerW
    },
    [innerW],
  )

  const scaleY = useCallback(
    (pct: number) => {
      const clamped = Math.max(Y_MIN, Math.min(Y_MAX, pct))
      return MARGIN.top + ((Y_MAX - clamped) / (Y_MAX - Y_MIN)) * innerH
    },
    [innerH],
  )

  // Y-axis ticks
  const yTicks = [0, 10, 20, 25, 30, 40, 50, 60, 70, 80]
  // X-axis ticks — show every 2 years on small viewports, every year on large
  const xTicks = YEARS.filter((_, i) => i % 2 === 0 || i === YEARS.length - 1)

  // COVID band x positions
  const covidX1 = scaleX(2020)
  const covidX2 = scaleX(2021) + innerW / (YEARS.length - 1)
  const oecdY = scaleY(OECD_THRESHOLD)

  const handleHover = useCallback((id: number | null, tip: TooltipState | null) => {
    setHoveredId(id)
    setTooltip(tip)
  }, [])

  const isEs = i18n.language === 'es'

  if (isLoading && !hasData) {
    return (
      <div className="w-full" style={{ height: CHART_HEIGHT }}>
        <Skeleton className="w-full h-full rounded-sm" />
      </div>
    )
  }

  return (
    <div className="relative w-full select-none">
      {/* Toggle button */}
      <div className="flex items-center justify-end mb-3">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-[10px] font-mono uppercase tracking-[0.14em] text-text-muted hover:text-text-secondary transition-colors border border-border px-2.5 py-1 rounded-sm"
        >
          {showAll
            ? isEs ? 'Solo los que cruzan OCDE' : 'Only OECD crossers'
            : isEs ? 'Mostrar todos los 12' : 'Show all 12'}
        </button>
      </div>

      {/* SVG slope chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
        width="100%"
        height={CHART_HEIGHT}
        aria-label={isEs ? 'Adjudicación directa por sector 2015–2025' : 'Direct award % by sector 2015–2025'}
        role="img"
      >
        {/* COVID emergency band 2020–2021 */}
        <rect
          x={covidX1}
          y={MARGIN.top}
          width={covidX2 - covidX1}
          height={innerH}
          fill="#f59e0b"
          fillOpacity={0.06}
        />
        <text
          x={(covidX1 + covidX2) / 2}
          y={MARGIN.top + 12}
          fill="#f59e0b"
          fillOpacity={0.65}
          fontSize={9}
          fontFamily="var(--font-family-mono)"
          textAnchor="middle"
        >
          {isEs ? 'Emergencia COVID' : 'COVID emergency'}
        </text>

        {/* Y-axis gridlines + labels */}
        {yTicks.map((tick) => {
          const y = scaleY(tick)
          const isOECD = tick === 25
          return (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                y1={y}
                x2={MARGIN.left + innerW}
                y2={y}
                stroke={isOECD ? OECD_CYAN : 'var(--color-border)'}
                strokeWidth={isOECD ? 1.2 : 0.5}
                strokeDasharray={isOECD ? '4 3' : undefined}
                strokeOpacity={isOECD ? 0.9 : 0.5}
              />
              <text
                x={MARGIN.left - 6}
                y={y}
                dy={4}
                fill={isOECD ? OECD_CYAN : 'var(--color-text-muted)'}
                fontSize={10}
                fontFamily="var(--font-family-mono)"
                textAnchor="end"
              >
                {tick === 25 ? '25%' : `${tick}%`}
              </text>
            </g>
          )
        })}

        {/* OECD label flush right */}
        <text
          x={MARGIN.left + innerW + 6}
          y={oecdY}
          dy={4}
          fill={OECD_CYAN}
          fontSize={9}
          fontFamily="var(--font-family-mono)"
          textAnchor="start"
        >
          {isEs ? 'OCDE 25%' : 'OECD 25%'}
        </text>

        {/* X-axis ticks */}
        {xTicks.map((year) => (
          <text
            key={year}
            x={scaleX(year)}
            y={MARGIN.top + innerH + 18}
            fill="var(--color-text-muted)"
            fontSize={10}
            fontFamily="var(--font-family-mono)"
            textAnchor="middle"
          >
            {year}
          </text>
        ))}

        {/* Lines — gray/muted first (below ceiling), then crossers on top */}
        {visibleLines
          .filter((l) => !l.crossesCeiling)
          .map((line) => (
            <SlopeLine
              key={line.sectorId}
              line={line}
              scaleX={scaleX}
              scaleY={scaleY}
              isHovered={hoveredId === line.sectorId}
              anyHovered={hoveredId !== null}
              onHover={handleHover}
              onClick={() => navigate(`/sectors/${line.sectorId}`)}
            />
          ))}
        {visibleLines
          .filter((l) => l.crossesCeiling)
          .map((line) => (
            <SlopeLine
              key={line.sectorId}
              line={line}
              scaleX={scaleX}
              scaleY={scaleY}
              isHovered={hoveredId === line.sectorId}
              anyHovered={hoveredId !== null}
              onHover={handleHover}
              onClick={() => navigate(`/sectors/${line.sectorId}`)}
            />
          ))}

        {/* Right-edge labels — only for crossers */}
        {crossers.map((line) => {
          const lastPt = line.points[line.points.length - 1]
          if (!lastPt) return null
          const y = scaleY(lastPt.da)
          const x = scaleX(lastPt.year)
          return (
            <text
              key={`label-${line.sectorId}`}
              x={x + 10}
              y={y}
              dy={4}
              fill={SECTOR_TEXT_COLORS[line.sectorCode] ?? line.color}
              fontSize={10}
              fontFamily="var(--font-family-mono)"
              fontWeight={600}
              opacity={hoveredId !== null && hoveredId !== line.sectorId ? 0.3 : 1}
              style={{ transition: 'opacity 0.15s', cursor: 'pointer' }}
              onClick={() => navigate(`/sectors/${line.sectorId}`)}
            >
              {line.sectorName}
            </text>
          )
        })}

        {/* Below-ceiling cluster label */}
        {belowCount > 0 && !showAll && (
          <text
            x={MARGIN.left + innerW + 10}
            y={scaleY(OECD_THRESHOLD) + 28}
            fill={MUTED_GRAY}
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            opacity={0.7}
          >
            {isEs ? `+ ${belowCount} bajo el techo` : `+ ${belowCount} below ceiling`}
          </text>
        )}
      </svg>

      {/* Tooltip — positioned fixed relative to viewport */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 28,
          }}
        >
          <div
            style={{
              background: '#1a1714',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 2,
              padding: '8px 10px',
              color: '#faf9f6',
              fontSize: 11,
              fontFamily: 'var(--font-family-mono)',
              whiteSpace: 'nowrap',
              minWidth: 160,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4, color: '#faf9f6' }}>
              {tooltip.sectorName} · {tooltip.year}
            </div>
            <div>
              {isEs ? 'Adj. directa' : 'Direct award'}: <strong>{tooltip.daPct.toFixed(1)}%</strong>
            </div>
            {tooltip.delta !== 0 && (
              <div style={{ color: MUTED_GRAY, marginTop: 2 }}>
                {isEs ? 'vs 2015' : 'vs 2015'}:{' '}
                <span style={{ color: tooltip.delta > 0 ? '#ef4444' : '#71717a' }}>
                  {tooltip.delta > 0 ? '+' : ''}{tooltip.delta.toFixed(1)} pp
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Below-chart: sector color legend for crossers */}
      {crossers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {crossers.map((line) => (
            <button
              key={line.sectorId}
              type="button"
              onClick={() => navigate(`/sectors/${line.sectorId}`)}
              className="flex items-center gap-1.5 text-[10px] font-mono hover:opacity-80 transition-opacity"
              style={{ color: SECTOR_TEXT_COLORS[line.sectorCode] ?? line.color }}
            >
              <span
                className="inline-block w-4 h-px"
                style={{ backgroundColor: line.color, height: 2 }}
                aria-hidden
              />
              {line.sectorName}
              <span style={{ color: MUTED_GRAY }}>
                {line.endDa.toFixed(0)}%
              </span>
            </button>
          ))}
          {belowCount > 0 && (
            <span className="text-[10px] font-mono" style={{ color: MUTED_GRAY }}>
              {isEs
                ? `${belowCount} sectores bajo el techo OCDE (gris)`
                : `${belowCount} sectors below OECD ceiling (gray)`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default CompetitionSlopeChart
