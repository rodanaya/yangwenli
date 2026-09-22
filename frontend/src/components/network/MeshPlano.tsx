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
import { memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { CommunityIndexItem } from '@/api/client'
import { RISK_COLORS, RISK_THRESHOLDS, getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatDualCurrency, formatNumber } from '@/lib/utils'
import { formatEntityName } from '@/lib/entity/format'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { placeLabels, measureLabel, type LabelBox, type LabelCandidate } from './plateLabels'

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
// D4 § 2: axis glyphs go to the 10px floor, so the gutters grow to match.
const PAD_L = 52
const PAD_R = 22
const PAD_TOP = 16
const PAD_BOTTOM = 44
const MOBILE_BREAK = 640
const X_TICKS = [5, 20, 100, 500, 2000, 10000]
const AXIS_FS = 10
const CALLOUT_FS = 11
const CALLOUT_LH = 13
// The measured font MUST be the rendered font: measuring in IBM Plex Mono and
// rendering in font-mono (JetBrains Mono) wrapped every callout past its
// reserved box, which is how one landed on the quadrant annotation.
const CALLOUT_FAMILY = '"IBM Plex Mono", "JetBrains Mono", monospace'
const CALLOUT_FONT = `${CALLOUT_FS}px ${CALLOUT_FAMILY}`
const HALO_PAD = 4

interface PlacedMark extends CommunityIndexItem {
  cx: number
  cy: number
  side: number
  color: string
}

export const MeshPlano = memo(function MeshPlano({ communities, totalCommunities, selectedId, onSelect, lang }: MeshPlanoProps) {
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

  // Label boxes are measured with canvas measureText. Measured before the web
  // fonts land, every box comes out narrow and the rendered label wraps past
  // it — which is exactly how a callout ended up sitting on the quadrant
  // annotation. Re-run the layout once the fonts are in.
  const [fontsReady, setFontsReady] = useState(
    () => typeof document !== 'undefined' && document.fonts?.status === 'loaded',
  )
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => {
      if (alive) setFontsReady(true)
    })
    return () => {
      alive = false
    }
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

    // D4 § 2 — callouts are HTML, placed by the shared greedy mechanic in
    // RENDERED px (this SVG is 1:1 with the box, so viewBox units are px).
    // The chart's own furniture is pre-placed: a callout never sits on the
    // axis columns, the quadrant annotations or the threshold labels.
    const quadFs = isMobile ? 10.5 : 12.5
    const quadFont = `${quadFs}px "EB Garamond", Georgia, serif`
    const quadTL = lang === 'en' ? 'dense knots — the signal lives here' : 'nudos densos — aquí vive la señal'
    const quadBR = lang === 'en' ? 'market plumbing — big and cold' : 'plomería de mercado — grande y fría'
    const wTL = measureLabel(quadTL, quadFont, 9999, quadFs).width
    const wBR = measureLabel(quadBR, quadFont, 9999, quadFs).width
    const thresholdFont = `${AXIS_FS}px "IBM Plex Mono", "JetBrains Mono", monospace`

    const obstacles: LabelBox[] = [
      // y-tick column and the x-axis strip (ticks + axis title)
      { x0: 0, y0: PAD_TOP - 10, x1: PAD_L, y1: baselineY + 8 },
      { x0: 0, y0: baselineY, x1: width, y1: height },
      // quadrant annotations
      { x0: PAD_L + 6, y0: PAD_TOP + 12 - quadFs, x1: PAD_L + 6 + wTL, y1: PAD_TOP + 15 },
      { x0: width - PAD_R - 6 - wBR, y0: baselineY - 6 - quadFs, x1: width - PAD_R - 6, y1: baselineY - 3 },
    ]
    for (const v of [RISK_THRESHOLDS.medium, RISK_THRESHOLDS.high]) {
      const label = v === RISK_THRESHOLDS.medium
        ? (lang === 'en' ? 'medium' : 'media')
        : (lang === 'en' ? 'high' : 'alta')
      const tw = measureLabel(label, thresholdFont, 9999, AXIS_FS).width
      const ty = yScale(v) - 3
      // The labels stay at the RIGHT end of their rules at every width. The
      // left end is the dense column (the marks at 5–20 actors), so a
      // left-anchored label sits on the data; the right end is safe because
      // the callout placer treats these boxes as obstacles and routes around
      // them.
      obstacles.push({ x0: width - PAD_R - 2 - tw, y0: ty - AXIS_FS, x1: width - PAD_R - 2, y1: ty + 3 })
    }

    const cap = isMobile ? 3 : 5
    const maxLabelW = isMobile ? 130 : 180
    const labelText = new Map<string | number, string>()
    const labelCandidates: LabelCandidate[] = candidates.slice(0, cap).map((m) => {
      // Full hub name — no 'sm'/'xs' character cut (the "C-0 · Martinez
      // Barranco" clip and the trailing "…" both came from those).
      const text = `C-${m.community_id} · ${formatEntityName('vendor', m.hub_vendor_name, 'full')}`
      labelText.set(m.community_id, text)
      const measured = measureLabel(text, CALLOUT_FONT, maxLabelW - HALO_PAD, CALLOUT_LH)
      return {
        id: m.community_id,
        x: m.cx,
        y: m.cy,
        width: measured.width + HALO_PAD,
        // 4px of slack for hinting differences — the measurement itself is
        // font-accurate (it waits for document.fonts.ready).
        height: measured.height + 4,
        above: m.side / 2 + 8,
        below: m.side / 2 + 8,
      }
    })
    const annotations = placeLabels(labelCandidates, obstacles, {
      x0: 2,
      y0: 2,
      x1: width - 2,
      y1: baselineY,
    }).map((p) => ({
      placed: p,
      label: labelText.get(p.id) ?? '',
      mark: marks.find((m) => m.community_id === p.id) as PlacedMark,
    }))

    return { marks, annotations, xScale, yScale, innerW, maxRisk, yMax, obstacles }
  }, [communities, width, isMobile, baselineY, height, lang, fontsReady])

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
        captionFull
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
      captionFull
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
            fontSize: '13px',
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
                fontSize={AXIS_FS}
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
              fontSize={AXIS_FS}
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
                y={baselineY + 15}
                textAnchor="middle"
                fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
                fontSize={AXIS_FS}
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
            fontSize={AXIS_FS}
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
            fontStyle="normal"
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
            fontStyle="normal"
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

          {/* Named callouts — SVG owns the leader line only; the glyphs are
              HTML below, so they never inherit the viewBox scale. */}
          {annotations.map(({ mark: m, placed }) => {
            const above = placed.box.y1 <= m.cy
            const endX = Math.min(Math.max(m.cx, placed.box.x0 + 4), placed.box.x1 - 4)
            return (
              <line
                key={`ann-${m.community_id}`}
                x1={m.cx}
                x2={endX}
                y1={m.cy + (above ? -m.side / 2 : m.side / 2)}
                y2={above ? placed.box.y1 : placed.box.y0}
                stroke="var(--color-accent)"
                strokeWidth={0.75}
                opacity={0.5}
              />
            )
          })}
        </svg>

        {/* HTML callouts — full hub names, 11px, seated by placeLabels. */}
        {annotations.map(({ placed, label }) => (
          <span
            key={`lbl-${placed.id}`}
            className="pointer-events-none absolute text-text-secondary"
            style={{
              fontFamily: CALLOUT_FAMILY,
              left: placed.box.x0,
              top: placed.box.y0,
              width: placed.box.x1 - placed.box.x0,
              boxSizing: 'border-box',
              padding: '1px 2px',
              fontSize: CALLOUT_FS,
              lineHeight: `${CALLOUT_LH}px`,
              // No letter-spacing: canvas measureText does not apply it, so
              // any tracking here makes the rendered label wider than the box
              // placeLabels reserved for it.
              textAlign: placed.align === 'right' ? 'right' : placed.align === 'left' ? 'left' : 'center',
              textWrap: 'balance',
              background: 'color-mix(in srgb, var(--color-background-elevated) 85%, transparent)',
            }}
          >
            {label}
          </span>
        ))}

        {/* Selection here is pointer-only by design — the rail is the keyboard
            path, so say where it is instead of faking 3,000 tab stops. */}
        <p className="sr-only">
          {lang === 'en'
            ? 'Select a cluster from the index below to open its mesh.'
            : 'Selecciona un cúmulo en el índice de abajo para abrir su trama.'}
        </p>

        {/* Pointer tooltip */}
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 rounded-sm border border-border bg-background px-2.5 py-2 text-[13px] shadow-lg"
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
              {`C-${hovered.community_id}`} · {formatEntityName('vendor', hovered.hub_vendor_name, 'full')}
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
})
