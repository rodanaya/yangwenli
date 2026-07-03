/**
 * RelationRibbon — «LÁMINA · LA RELACIÓN» / "PLATE · THE RELATIONSHIP".
 *
 * Sibling of SpectralRegister (Reuters *Time of Evidence* × FT strip plot):
 * every contract the vendor↔institution pair has ever signed becomes one
 * vertical stroke on a time axis. Position = date; height = money (sqrt
 * ramp); the subject contract is inked in sector accent and named (NYT
 * Upshot named-outlier mechanic). Zero <circle> by design.
 *
 * Spec: contract-el-cotejo-fable-2026-07-02-spec.md §2.3 · §5-P4.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ContractDetail, ContractListItem } from '@/api/types'
import { getRiskLevelFromScore, RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'

interface RelationRibbonProps {
  rows: ContractListItem[]
  subject: ContractDetail
  pairTotal: number
  pairRank: number | null
  p99: number | null
  sizeVsP99: number | null
  sectorAccent: string
  sectorName: string
  captionProse: string
  lang: 'en' | 'es'
}

// ── geometry (exact — spec §2.3) ────────────────────────────────────────────
const MOBILE_BREAK = 640
const ZINC = '#71717a'
const MONO = '"IBM Plex Mono", "JetBrains Mono", monospace'

function geometry(isMobile: boolean) {
  const HEIGHT = isMobile ? 200 : 240
  const PAD_L = isMobile ? 30 : 40
  const PAD_R = isMobile ? 18 : 24
  const BASELINE_Y = HEIGHT - 46
  const MAX_STROKE_H = BASELINE_Y - 58
  const strokeWidthPeer = isMobile ? 1.75 : 1.25
  const strokeWidthSubject = isMobile ? 3 : 2.5
  return { HEIGHT, PAD_L, PAD_R, BASELINE_Y, MAX_STROKE_H, strokeWidthPeer, strokeWidthSubject }
}

interface PlacedStroke {
  id: number
  x: number
  h: number
  amount: number
  year: number
  color: string
  opacity: number
  isSubject: boolean
  isDirectAward: boolean
  isSingleBid: boolean
}

function dateOf(c: { contract_date?: string; contract_year?: number }): Date | null {
  if (c.contract_date) {
    const d = new Date(c.contract_date)
    if (!Number.isNaN(d.getTime())) return d
  }
  if (c.contract_year) {
    return new Date(Date.UTC(c.contract_year, 6, 1)) // Jul 1 mid-year fallback
  }
  return null
}

function multLabel(mult: number): string {
  return mult >= 10 ? `×${Math.round(mult)}` : `×${mult.toFixed(1)}`
}

export function RelationRibbon({
  rows,
  subject,
  pairTotal,
  pairRank,
  p99,
  sizeVsP99,
  sectorAccent,
  sectorName,
  captionProse,
  lang,
}: RelationRibbonProps) {
  const isEs = lang === 'es'
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(960)
  const [hoverId, setHoverId] = useState<number | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const isMobile = width < MOBILE_BREAK
  const { HEIGHT, PAD_L, PAD_R, BASELINE_Y, MAX_STROKE_H, strokeWidthPeer, strokeWidthSubject } = geometry(isMobile)

  const layout = useMemo(() => {
    const subjectDate = dateOf(subject)
    const subjectYear = subject.contract_year ?? subjectDate?.getUTCFullYear() ?? new Date().getUTCFullYear()

    const plottable = rows
      .map((r) => ({ row: r, date: dateOf(r) }))
      .filter((r) => r.date != null) as { row: ContractListItem; date: Date }[]

    const years = plottable.map((r) => r.date.getUTCFullYear())
    const minYear = Math.min(subjectYear, ...(years.length ? years : [subjectYear]))
    const maxYear = Math.max(subjectYear, ...(years.length ? years : [subjectYear]))

    const domainStart = Date.UTC(minYear, 0, 1)
    const domainEnd = Date.UTC(maxYear, 11, 31)
    const span = Math.max(1, domainEnd - domainStart)
    const innerW = Math.max(80, width - PAD_L - PAD_R)
    const xScale = (t: number) => PAD_L + ((t - domainStart) / span) * innerW

    const maxAmount = Math.max(subject.amount_mxn ?? 0, ...plottable.map((r) => r.row.amount_mxn ?? 0), 1)

    const strokes: PlacedStroke[] = plottable
      .filter((r) => r.row.id !== subject.id)
      .map((r) => {
        const amount = r.row.amount_mxn ?? 0
        const h = Math.max(3, MAX_STROKE_H * Math.sqrt(amount / maxAmount))
        const level = r.row.risk_score != null ? getRiskLevelFromScore(r.row.risk_score) : 'low'
        const color = level === 'critical' || level === 'high' ? RISK_COLORS[level] : ZINC
        const opacity = level === 'critical' || level === 'high' ? 0.45 : 0.35
        return {
          id: r.row.id,
          x: xScale(r.date.getTime()),
          h,
          amount,
          year: r.date.getUTCFullYear(),
          color,
          opacity,
          isSubject: false,
          isDirectAward: !!r.row.is_direct_award,
          isSingleBid: !!r.row.is_single_bid,
        }
      })

    // Subject stroke — always plotted even if it's absent from `rows` (top-100 cut).
    const subjectAmount = subject.amount_mxn ?? 0
    const subjectT = subjectDate ? subjectDate.getTime() : Date.UTC(subjectYear, 6, 1)
    const subjectStroke: PlacedStroke = {
      id: subject.id,
      x: xScale(subjectT),
      h: Math.max(3, MAX_STROKE_H * Math.sqrt(subjectAmount / maxAmount)),
      amount: subjectAmount,
      year: subjectYear,
      color: sectorAccent,
      opacity: 0.95,
      isSubject: true,
      isDirectAward: !!subject.is_direct_award,
      isSingleBid: !!subject.is_single_bid,
    }

    // p99 gridline
    let p99Y: number | null = null
    if (p99 != null && p99 <= maxAmount) {
      p99Y = BASELINE_Y - MAX_STROKE_H * Math.sqrt(p99 / maxAmount)
    }

    // Axis ticks — first, last, interior nice steps
    const spanYears = Math.max(1, maxYear - minYear)
    const step = Math.max(1, Math.ceil(spanYears / 5))
    const ticks: number[] = []
    if (isMobile) {
      ticks.push(minYear)
      if (maxYear !== minYear) {
        const mid = Math.round((minYear + maxYear) / 2)
        if (mid !== minYear && mid !== maxYear) ticks.push(mid)
        ticks.push(maxYear)
      }
    } else {
      for (let y = minYear; y < maxYear; y += step) ticks.push(y)
      ticks.push(maxYear)
    }
    const dedupedTicks = ticks.filter((v, idx, arr) => arr.indexOf(v) === idx)

    // Subject callout overflow guard
    const overflowRight = subjectStroke.x > width - PAD_R - 60

    return { strokes, subjectStroke, xScale, minYear, maxYear, maxAmount, p99Y, ticks: dedupedTicks, overflowRight, innerW }
  }, [rows, subject, width, isMobile, PAD_L, PAD_R, BASELINE_Y, MAX_STROKE_H, p99, sectorAccent])

  const allStrokes = useMemo(() => [...layout.strokes, layout.subjectStroke], [layout])

  const nearest = useMemo(() => {
    if (hoverId == null) return null
    return allStrokes.find((s) => s.id === hoverId) ?? null
  }, [allStrokes, hoverId])

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    let closest: PlacedStroke | null = null
    let closestDist = Infinity
    for (const s of allStrokes) {
      const d = Math.abs(s.x - px)
      if (d < closestDist) {
        closestDist = d
        closest = s
      }
    }
    if (closest && closestDist < 14) setHoverId(closest.id)
    else setHoverId(null)
  }

  const vendorName = subject.vendor_name || (isEs ? 'el proveedor' : 'the vendor')
  const instName = subject.institution_name || (isEs ? 'la institución' : 'the institution')

  const ariaLabel = isEs
    ? `La relación ${vendorName} ↔ ${instName}: ${pairTotal.toLocaleString('es-MX')} contratos desde ${layout.minYear}, trazados por fecha; la altura del trazo es el monto. Este contrato, ${formatCompactMXN(subject.amount_mxn ?? 0)}, es el #${pairRank ?? '—'} por monto.`
    : `The ${vendorName} ↔ ${instName} relationship: ${pairTotal.toLocaleString('en-US')} contracts since ${layout.minYear}, plotted by date; stroke height is amount. This contract, ${formatCompactMXN(subject.amount_mxn ?? 0)}, ranks #${pairRank ?? '—'} by value.`

  const subjectLabel1 = `${isEs ? 'ESTE' : 'THIS'} · ${formatCompactMXN(subject.amount_mxn ?? 0)}`
  const showMultLine = sizeVsP99 != null && sizeVsP99 >= 2
  const subjectLabel2 = showMultLine ? `${multLabel(sizeVsP99!)} p99` : null

  return (
    <figure
      className="relative"
      style={{
        padding: '30px 20px 18px',
        background: 'var(--color-background-elevated, var(--color-background))',
        border: '1px solid var(--color-border)',
        boxShadow: 'inset 0 0 0 1px rgba(160, 104, 32, 0.06)',
      }}
    >
      <CropMark position="tl" />
      <CropMark position="tr" />
      <CropMark position="bl" />
      <CropMark position="br" />

      <div
        className="mb-3 flex items-center gap-2 flex-wrap"
        style={{
          fontFamily: MONO,
          fontSize: '9.5px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 400,
        }}
      >
        <span style={{ color: 'var(--color-accent)', fontStyle: 'normal', fontWeight: 500 }}>
          {isEs ? 'LÁMINA · LA RELACIÓN' : 'PLATE · THE RELATIONSHIP'}
        </span>
      </div>

      <div ref={containerRef} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverId(null)}
          onClick={() => {
            if (nearest && !nearest.isSubject) {
              navigate(`/contracts/${nearest.id}`)
            }
          }}
          style={{ cursor: nearest && !nearest.isSubject ? 'pointer' : 'default', display: 'block' }}
        >
          {/* p99 gridline */}
          {layout.p99Y != null && (
            <g>
              <line
                x1={PAD_L}
                x2={width - PAD_R}
                y1={layout.p99Y}
                y2={layout.p99Y}
                stroke="var(--color-text-muted)"
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.6}
              />
              <text
                x={width - PAD_R}
                y={layout.p99Y - 4}
                textAnchor="end"
                fontFamily={MONO}
                fontSize={8.5}
                fill="var(--color-text-muted)"
              >
                {isEs ? `p99 ${sectorName}` : `p99 ${sectorName}`}
              </text>
            </g>
          )}

          {/* Baseline */}
          <line x1={PAD_L} x2={width - PAD_R} y1={BASELINE_Y} y2={BASELINE_Y} stroke="var(--color-border)" strokeWidth={1} />

          {/* Peer strokes */}
          {layout.strokes.map((s) => {
            const isHover = s.id === hoverId
            return (
              <line
                key={s.id}
                x1={s.x}
                x2={s.x}
                y1={BASELINE_Y}
                y2={BASELINE_Y - s.h}
                stroke={s.color}
                strokeWidth={strokeWidthPeer}
                opacity={isHover ? Math.min(1, s.opacity + 0.35) : s.opacity}
              />
            )
          })}

          {/* Subject stroke */}
          <line
            x1={layout.subjectStroke.x}
            x2={layout.subjectStroke.x}
            y1={BASELINE_Y}
            y2={BASELINE_Y - layout.subjectStroke.h}
            stroke={layout.subjectStroke.color}
            strokeWidth={strokeWidthSubject}
            opacity={layout.subjectStroke.opacity}
          />

          {/* Subject callout — NYT Upshot leader + halo label */}
          <g>
            <line
              x1={layout.subjectStroke.x}
              x2={layout.subjectStroke.x}
              y1={BASELINE_Y - layout.subjectStroke.h}
              y2={BASELINE_Y - layout.subjectStroke.h - 22}
              stroke="var(--color-accent)"
              strokeWidth={0.75}
              opacity={0.5}
            />
            <text
              x={layout.overflowRight ? layout.subjectStroke.x - 4 : layout.subjectStroke.x}
              y={BASELINE_Y - layout.subjectStroke.h - 26}
              textAnchor={layout.overflowRight ? 'end' : 'middle'}
              fontFamily={MONO}
              fontSize={12}
              fill="var(--color-text-secondary)"
              paintOrder="stroke"
              stroke="var(--color-background-elevated)"
              strokeWidth={3}
            >
              {subjectLabel1}
            </text>
            {subjectLabel2 && (
              <text
                x={layout.overflowRight ? layout.subjectStroke.x - 4 : layout.subjectStroke.x}
                y={BASELINE_Y - layout.subjectStroke.h - 14}
                textAnchor={layout.overflowRight ? 'end' : 'middle'}
                fontFamily={MONO}
                fontSize={12}
                fontWeight={700}
                fill={RISK_COLORS.critical}
                paintOrder="stroke"
                stroke="var(--color-background-elevated)"
                strokeWidth={3}
              >
                {subjectLabel2}
              </text>
            )}
          </g>

          {/* Axis year ticks */}
          {layout.ticks.map((y) => (
            <text
              key={y}
              x={layout.xScale(Date.UTC(y, 5, 30))}
              y={BASELINE_Y + 18}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={13}
              fill="var(--color-text-muted)"
            >
              {y}
            </text>
          ))}
        </svg>

        {/* Pointer tooltip */}
        {nearest && (
          <div
            className="pointer-events-none absolute z-10 rounded-sm border border-border bg-background px-2.5 py-2 text-[13px] shadow-lg"
            style={{
              left: Math.min(Math.max(nearest.x, 90), width - 90),
              top: 4,
              transform: 'translateX(-50%)',
              fontFamily: MONO,
              minWidth: 150,
            }}
            role="status"
          >
            <p className="text-text-primary">
              {nearest.year} · {formatCompactMXN(nearest.amount)}
              {(nearest.isDirectAward || nearest.isSingleBid) && (
                <>
                  {' · '}
                  {[nearest.isDirectAward ? (isEs ? 'AD' : 'DA') : null, nearest.isSingleBid ? (isEs ? 'UP' : 'SB') : null]
                    .filter(Boolean)
                    .join(' ')}
                </>
              )}
            </p>
          </div>
        )}
      </div>

      <figcaption
        className="mt-3 pt-2.5"
        style={{
          borderTop: '1px solid rgba(160, 104, 32, 0.18)',
          fontFamily: '"EB Garamond", Georgia, serif',
          fontStyle: 'normal',
          fontSize: '12.5px',
          lineHeight: 1.5,
          color: 'var(--color-text-secondary, var(--color-text-muted))',
        }}
      >
        {captionProse}
      </figcaption>
    </figure>
  )
}

// ── Corner crop marks — copied locally from SpectralRegister (folio chrome). ─
type CropPos = 'tl' | 'tr' | 'bl' | 'br'

function CropMark({ position }: { position: CropPos }) {
  const inset = 8
  const size = 14
  const stroke = 'rgba(160, 104, 32, 0.55)'
  const baseStyle: CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    pointerEvents: 'none',
  }
  const positions: Record<CropPos, CSSProperties> = {
    tl: { top: inset, left: inset, borderTop: `1px solid ${stroke}`, borderLeft: `1px solid ${stroke}` },
    tr: { top: inset, right: inset, borderTop: `1px solid ${stroke}`, borderRight: `1px solid ${stroke}` },
    bl: { bottom: inset, left: inset, borderBottom: `1px solid ${stroke}`, borderLeft: `1px solid ${stroke}` },
    br: { bottom: inset, right: inset, borderBottom: `1px solid ${stroke}`, borderRight: `1px solid ${stroke}` },
  }
  return <span aria-hidden="true" style={{ ...baseStyle, ...positions[position] }} />
}
