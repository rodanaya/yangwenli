/**
 * MeshPlano — «Plano general» / "Wide plan".
 *
 * A scatter of every co-bidding community: x = actors (log scale),
 * y = average risk indicator. The central inversion of /network's redesign
 * (network-la-trama-fable-2026-07-02-spec.md §2) becomes geometry — giant
 * clusters sleep bottom-right (market plumbing), the dense risky knots burn
 * top-left. Squares only — zero <circle> in this file (dot-grid ban, and it
 * differentiates the plate from the force graph's circular nodes).
 *
 * Self-contained: own PlateFrame wrap, ResizeObserver, pointer-nearest
 * tooltip, greedy AABB named-callout de-collision (SpectralRegister
 * mechanics, institution/SpectralRegister.tsx).
 *
 * Spec: network-la-trama-fable-2026-07-02-spec.md §3.2 · §4.1.
 */
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { CommunityIndexItem } from '@/api/client'
import { RISK_COLORS, RISK_THRESHOLDS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatDualCurrency, formatNumber } from '@/lib/utils'
import { formatEntityName } from '@/lib/entity/format'
import { PlateFrame } from '@/components/atlas/PlateFrame'

interface MeshPlanoProps {
  communities: CommunityIndexItem[]
  totalCommunities: number
  selectedId: number | null
  onSelect: (communityId: number) => void
  lang: 'en' | 'es'
}

/** The ONE canonical signal-density formula — risk-weighted pesos per member.
 *  Printed everywhere it sorts (rail pill tooltip, this plate's dek, Fe de
 *  método clause vi). Never duplicated. */
export function signalDensity(c: Pick<CommunityIndexItem, 'avg_risk' | 'total_value_mxn' | 'size'>): number {
  return (c.avg_risk * c.total_value_mxn) / Math.max(c.size, 1)
}

// ── geometry ────────────────────────────────────────────────────────────────
const HEIGHT_DESKTOP = 240
const HEIGHT_MOBILE = 200
const PAD_L = 46
const PAD_R = 22
const PAD_TOP = 16
const PAD_BOTTOM = 40
const MOBILE_BREAK = 640
const X_TICKS = [5, 20, 100, 500, 2000, 10000]

interface PlacedMark extends CommunityIndexItem {
  cx: number
  cy: number
  side: number
  color: string
}

export function MeshPlano({ communities, totalCommunities, selectedId, onSelect, lang }: MeshPlanoProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(920)
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
  const height = isMobile ? HEIGHT_MOBILE : HEIGHT_DESKTOP
  const baselineY = height - PAD_BOTTOM

  const layout = useMemo(() => {
    if (!communities.length) return null

    const innerW = Math.max(80, width - PAD_L - PAD_R)
    const sizes = communities.map((c) => Math.max(1, c.size))
    const minSize = Math.min(...sizes)
    const maxSize = Math.max(...sizes)
    const logMin = Math.log10(Math.min(5, minSize))
    const logMax = Math.log10(Math.max(10000, maxSize) * 1.15)
    const logSpan = Math.max(0.01, logMax - logMin)
    const xScale = (size: number) => PAD_L + ((Math.log10(Math.max(1, size)) - logMin) / logSpan) * innerW

    const maxRisk = Math.max(...communities.map((c) => c.avg_risk))
    const yMax = Math.max(0.60, maxRisk + 0.05)
    const yScale = (risk: number) => baselineY - (Math.min(risk, yMax) / yMax) * (baselineY - PAD_TOP)

    const maxValue = Math.max(...communities.map((c) => c.total_value_mxn), 1)
    const sideScale = (value: number) => 2.5 + (7 - 2.5) * Math.sqrt(Math.max(0, value) / maxValue)

    const marks: PlacedMark[] = communities.map((c) => ({
      ...c,
      cx: xScale(c.size),
      cy: yScale(c.avg_risk),
      side: sideScale(c.total_value_mxn),
      color: RISK_COLORS[getRiskLevelFromScore(c.avg_risk)],
    }))

    // Named callouts: top-2 by signal density, top-1 by total value, top-1 by
    // size — deduped, then greedy top-down AABB de-collision (SpectralRegister
    // mechanic). Cap 5 desktop / 3 mobile.
    const byDensity = [...marks].sort((a, b) => signalDensity(b) - signalDensity(a)).slice(0, 2)
    const byValue = [...marks].sort((a, b) => b.total_value_mxn - a.total_value_mxn).slice(0, 1)
    const bySize = [...marks].sort((a, b) => b.size - a.size).slice(0, 1)
    const seen = new Set<number>()
    const candidates: PlacedMark[] = []
    for (const m of [...byDensity, ...byValue, ...bySize]) {
      if (seen.has(m.community_id)) continue
      seen.add(m.community_id)
      candidates.push(m)
    }

    const cap = isMobile ? 3 : 5
    const CH_W = isMobile ? 5.1 : 5.4
    const LABEL_H = 12
    const PAD_BOX = 3
    const placedBoxes: { x0: number; x1: number; y0: number; y1: number }[] = []
    const annotations: { mark: PlacedMark; label: string }[] = []
    for (const m of candidates) {
      if (annotations.length >= cap) break
      const label = `C-${m.community_id} · ${formatEntityName('vendor', m.hub_vendor_name, 'xs')}`
      const w = label.length * CH_W
      const cx = m.cx
      const cy = m.cy - m.side / 2 - 10
      const box = { x0: cx - w / 2 - PAD_BOX, x1: cx + w / 2 + PAD_BOX, y0: cy - LABEL_H, y1: cy + PAD_BOX }
      const clear = placedBoxes.every((b) => box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1)
      if (clear) {
        placedBoxes.push(box)
        annotations.push({ mark: m, label })
      }
    }

    return { marks, annotations, xScale, yScale, innerW, maxRisk, yMax }
  }, [communities, width, isMobile, baselineY])

  const hovered = useMemo(() => {
    if (!layout || hoverId == null) return null
    return layout.marks.find((m) => m.community_id === hoverId) ?? null
  }, [layout, hoverId])

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!layout) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const py = ((e.clientY - rect.top) / rect.height) * height
    let closest: PlacedMark | null = null
    let closestDist = Infinity
    for (const m of layout.marks) {
      const d = Math.hypot(m.cx - px, m.cy - py)
      if (d < closestDist) {
        closestDist = d
        closest = m
      }
    }
    if (closest && closestDist < 14) setHoverId(closest.community_id)
    else setHoverId(null)
  }

  // ── caption / aggregates (absorbs the retired 4-tile stat band) ──────────
  const sumSize = communities.reduce((s, c) => s + c.size, 0)
  const sumValue = communities.reduce((s, c) => s + c.total_value_mxn, 0)
  const sumGt = communities.reduce((s, c) => s + c.gt_vendor_count, 0)
  const sumSanctioned = communities.reduce((s, c) => s + c.sanctioned_count, 0)

  const captionText = lang === 'en'
    ? `${formatNumber(communities.length)} co-bidding clusters · ${formatNumber(sumSize)} vendors · ${formatDualCurrency(sumValue)} indexed · ${formatNumber(sumGt)} vendors with a GT case · ${formatNumber(sumSanctioned)} SFP-sanctioned · size on a log axis`
    : `${formatNumber(communities.length)} cúmulos de co-licitación · ${formatNumber(sumSize)} proveedores · ${formatDualCurrency(sumValue)} indexados · ${formatNumber(sumGt)} proveedores con caso GT · ${formatNumber(sumSanctioned)} sancionados SFP · tamaño en eje logarítmico`

  const ariaLabel = lang === 'en'
    ? `Wide plan: ${communities.length} co-bidding clusters plotted by size (log scale, x-axis) and average risk indicator (y-axis). The largest clusters concentrate less signal; the small, dense knots carry the risk. Squares are sized by total value.`
    : `Plano general: ${communities.length} cúmulos de co-licitación trazados por tamaño (escala logarítmica, eje x) e indicador de riesgo promedio (eje y). Los cúmulos más grandes concentran menos señal; los nudos pequeños y densos cargan el riesgo. Los cuadros se dimensionan por valor total.`

  if (!layout) {
    return (
      <PlateFrame
        folio="XIV·A"
        lang={lang}
        contextLabel={{
          en: `Wide plan · the ${totalCommunities} clusters`,
          es: `Plano general · los ${totalCommunities} cúmulos`,
        }}
        caption={lang === 'en' ? 'No clusters to plot.' : 'Sin cúmulos para trazar.'}
      >
        <div />
      </PlateFrame>
    )
  }

  const { marks, annotations, xScale, yScale, yMax } = layout
  const visibleXTicks = X_TICKS.filter((t) => t <= Math.max(...marks.map((m) => m.size), 10000) * 1.2)
  const yTicks = [0, 0.25, 0.40, yMax].filter((v, i, arr) => arr.indexOf(v) === i)

  return (
    <PlateFrame
      folio="XIV·A"
      lang={lang}
      contextLabel={{
        en: `Wide plan · the ${totalCommunities} clusters`,
        es: `Plano general · los ${totalCommunities} cúmulos`,
      }}
      caption={captionText}
    >
      {/* Plate headline — BalanzaLedger pattern: bold claim + printed formula dek. */}
      <div className="mb-3">
        <p
          style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: '15px',
            lineHeight: 1.4,
            color: 'var(--color-text-primary)',
          }}
        >
          {lang === 'en'
            ? 'The giants sleep along the bottom right; the knots burn in the upper left.'
            : 'Los gigantes duermen abajo a la derecha; los nudos arden arriba a la izquierda.'}
        </p>
        <p
          className="mt-1"
          style={{
            fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
            fontSize: '11px',
            letterSpacing: '0.03em',
            color: 'var(--color-text-muted)',
          }}
        >
          {lang === 'en'
            ? 'signal = value × risk indicator ÷ actors'
            : 'señal = valor × indicador de riesgo ÷ actores'}
        </p>
      </div>

      <div ref={containerRef} className="relative w-full">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverId(null)}
          onClick={() => {
            if (hovered) onSelect(hovered.community_id)
          }}
          style={{ cursor: hovered ? 'pointer' : 'default', display: 'block' }}
        >
          {/* Dashed threshold rules — RISK_THRESHOLDS, never inlined. */}
          {([
            { v: RISK_THRESHOLDS.medium, label: lang === 'en' ? 'medium' : 'media' },
            { v: RISK_THRESHOLDS.high, label: lang === 'en' ? 'high' : 'alta' },
          ] as const).map(({ v, label }) => (
            <g key={v}>
              <line
                x1={PAD_L}
                x2={width - PAD_R}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.6}
              />
              <text
                x={width - PAD_R - 2}
                y={yScale(v) - 3}
                textAnchor="end"
                fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
                fontSize={8}
                letterSpacing="0.08em"
                fill="var(--color-text-muted)"
                style={{ textTransform: 'uppercase' }}
              >
                {label}
              </text>
            </g>
          ))}

          {/* Baseline + left axis */}
          <line x1={PAD_L} x2={width - PAD_R} y1={baselineY} y2={baselineY} stroke="var(--color-border)" strokeWidth={1} />

          {/* Y ticks (risk %) */}
          {yTicks.map((tick) => (
            <text
              key={tick}
              x={PAD_L - 6}
              y={yScale(tick) + 3}
              textAnchor="end"
              fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
              fontSize={8.5}
              fill="var(--color-text-muted)"
            >
              {Math.round(tick * 100)}%
            </text>
          ))}

          {/* X ticks (actors, log scale) */}
          {visibleXTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={xScale(tick)}
                x2={xScale(tick)}
                y1={PAD_TOP}
                y2={baselineY}
                stroke="var(--color-border)"
                strokeWidth={0.5}
                opacity={0.35}
              />
              <text
                x={xScale(tick)}
                y={baselineY + 13}
                textAnchor="middle"
                fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
                fontSize={8.5}
                fill="var(--color-text-muted)"
              >
                {formatNumber(tick)}
              </text>
            </g>
          ))}
          <text
            x={(PAD_L + width - PAD_R) / 2}
            y={height - 6}
            textAnchor="middle"
            fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
            fontSize={8}
            letterSpacing="0.06em"
            fill="var(--color-text-muted)"
            style={{ textTransform: 'uppercase' }}
          >
            {lang === 'en' ? 'actors per cluster (log scale)' : 'actores por cúmulo (escala logarítmica)'}
          </text>

          {/* Quadrant annotations — EB Garamond italic, in-plot */}
          <text
            x={PAD_L + 6}
            y={PAD_TOP + 12}
            textAnchor="start"
            fontFamily='"EB Garamond", Georgia, serif'
            fontStyle="italic"
            fontSize={isMobile ? 10.5 : 12.5}
            fill="var(--color-text-muted)"
          >
            {lang === 'en' ? 'dense knots — the signal lives here' : 'nudos densos — aquí vive la señal'}
          </text>
          <text
            x={width - PAD_R - 6}
            y={baselineY - 6}
            textAnchor="end"
            fontFamily='"EB Garamond", Georgia, serif'
            fontStyle="italic"
            fontSize={isMobile ? 10.5 : 12.5}
            fill="var(--color-text-muted)"
          >
            {lang === 'en' ? 'market plumbing — big and cold' : 'plomería de mercado — grande y fría'}
          </text>

          {/* Marks — squares only, never circles. */}
          {marks.map((m) => {
            const isSelected = m.community_id === selectedId
            const isHover = m.community_id === hoverId
            return (
              <g key={m.community_id}>
                <rect
                  x={m.cx - m.side / 2}
                  y={m.cy - m.side / 2}
                  width={m.side}
                  height={m.side}
                  fill={m.color}
                  opacity={isHover || isSelected ? 0.95 : 0.72}
                />
                {isSelected && (
                  <rect
                    x={m.cx - m.side / 2 - 2}
                    y={m.cy - m.side / 2 - 2}
                    width={m.side + 4}
                    height={m.side + 4}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={1.5}
                  />
                )}
              </g>
            )
          })}

          {/* Named callouts — leader line + mono label, greedy de-collided */}
          {annotations.map(({ mark: m, label }) => {
            const labelY = m.cy - m.side / 2 - 10
            return (
              <g key={`ann-${m.community_id}`}>
                <line
                  x1={m.cx}
                  x2={m.cx}
                  y1={m.cy - m.side / 2}
                  y2={labelY + 3}
                  stroke="var(--color-accent)"
                  strokeWidth={0.75}
                  opacity={0.5}
                />
                <text
                  x={m.cx}
                  y={labelY}
                  textAnchor="middle"
                  fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
                  fontSize={isMobile ? 8.5 : 9.5}
                  fill="var(--color-text-secondary)"
                  paintOrder="stroke"
                  stroke="var(--color-background-elevated)"
                  strokeWidth={3}
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Pointer tooltip */}
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 rounded-sm border border-border bg-background px-2.5 py-2 text-[11px] shadow-lg"
            style={{
              left: Math.min(Math.max(hovered.cx, 90), width - 90),
              top: 4,
              transform: 'translateX(-50%)',
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              minWidth: 180,
            }}
            role="status"
          >
            <p className="font-bold text-text-primary mb-0.5">
              {`C-${hovered.community_id}`} · {formatEntityName('vendor', hovered.hub_vendor_name, 'sm')}
            </p>
            <p className="text-text-secondary">
              {lang === 'en' ? `${formatNumber(hovered.size)} actors` : `${formatNumber(hovered.size)} actores`}
              {' · '}
              {formatCompactMXN(hovered.total_value_mxn)}
            </p>
            <p className="text-text-muted">
              {lang === 'en' ? `risk ${Math.round(hovered.avg_risk * 100)}%` : `riesgo ${Math.round(hovered.avg_risk * 100)}%`}
              {' · '}
              {lang === 'en'
                ? `signal ${formatCompactMXN(signalDensity(hovered))}/actor`
                : `señal ${formatCompactMXN(signalDensity(hovered))}/actor`}
            </p>
          </div>
        )}
      </div>
    </PlateFrame>
  )
}
