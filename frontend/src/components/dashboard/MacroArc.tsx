/**
 * MacroArc — the direct-award rate trend, 2010–2025 (Folio·III).
 *
 * Mexico's DA-rate line in crimson over an area fill, the EU scoreboard 10 %
 * reference as a dashed cyan line, admin wash bands behind the line with
 * their labels above the plot, four FT-style callouts (Casa Blanca · Estafa
 * Maestra · COVID · Peak year) on leader lines below the line.
 *
 * PARALLAX D10 § Change 2 — "HTML owns glyphs, SVG owns geometry": the
 * plate measures its own width (useMeasuredWidth) and draws at 1:1; every
 * glyph (ticks, era labels, edge labels, callouts, the hover value) is an
 * absolutely positioned HTML label, measured with measureLabel and seated
 * with placeLabels. Marks (bands, line, area, dots, leaders, box frames)
 * stay in the svg.
 */

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useYearOverYear } from '@/components/stories/live/useEmergencyData'
import { RISK_TEXT_COLORS } from '@/lib/constants'
import { ADMINISTRATIONS, ADMIN_DISPLAY_ACCENTED, type AdministrationKey } from '@/lib/administrations'
import { useFontsReady, useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import { measureLabel, placeLabels, type LabelBox } from '@/lib/plateLabels'

// Structure B (2010) is the first COMPRANET structure that codes the
// procedure type; Structure A (2002–2009) reads 0.0–0.05 %, which drawn as a
// rate would say Mexico had no direct awards for eight years.
const DA_SERIES_FLOOR = 2010

// Era wash hues (plate marks, this plate's own palette); years and labels
// come from the one calendar in lib/administrations. At full alpha each hue
// clears 4.5:1 on the plate paper, so the labels use them directly.
const ERA_HUE: Record<AdministrationKey, string> = {
  fox: '#1a5276',
  calderon: '#1a5276',
  epn: '#c41e3a',
  amlo: '#7b2d8b',
  sheinbaum: '#7b2d8b',
}
// Initials when a phone cannot seat the full term name.
const ERA_SHORT: Record<AdministrationKey, string> = {
  fox: 'F', calderon: 'C', epn: 'EPN', amlo: 'AMLO', sheinbaum: 'S',
}

// FT-style annotation callouts BELOW the data line, zigzag depths so
// adjacent callouts cannot share Y space.
const CALLOUTS: Array<{ year: number; en: string; es: string; dy: number }> = [
  { year: 2014, en: 'Casa Blanca',         es: 'Casa Blanca',         dy: 60 },
  { year: 2017, en: 'Estafa Maestra',      es: 'Estafa Maestra',      dy: 110 },
  { year: 2020, en: 'COVID emergency',     es: 'Emergencia COVID',    dy: 60 },
  { year: 2023, en: 'Peak year',           es: 'Año pico',            dy: 110 },
]

const MONO = '"JetBrains Mono", monospace'
const SERIF = "'Playfair Display', Georgia, serif"
const H_WIDE = 260
const H_NARROW = 300 // phones: a deeper plot so the callouts find a depth
const PAD_T = 36 // era labels above the plot
const PAD_B = 32 // x ticks

interface Props {
  lang: 'en' | 'es'
}

export function MacroArc({ lang }: Props) {
  const [hoverYear, setHoverYear] = useState<number | null>(null)
  const isEs = lang === 'es'
  const yoy = useYearOverYear()
  const plate = useRef<HTMLDivElement>(null)
  const W = useMeasuredWidth(plate)
  const narrow = W > 0 && W < 560
  const H = narrow ? H_NARROW : H_WIDE
  const FS = narrow ? 11 : 13
  const TICK_FONT = `${FS}px ${MONO}`
  const EDGE_FONT = `700 ${narrow ? 11 : 12}px ${MONO}`
  const CALLOUT_FONT = `600 ${narrow ? 11 : 13}px ${MONO}`
  const COVID_FONT = `700 ${narrow ? 12 : 13}px ${SERIF}`
  const fontsReady = useFontsReady([TICK_FONT, EDGE_FONT, CALLOUT_FONT, COVID_FONT])

  const series = (yoy.data ?? [])
    .filter((d) => d.year >= DA_SERIES_FLOOR && d.direct_award_pct > 0)
    .map((d) => ({ year: d.year, da: d.direct_award_pct }))
    .sort((a, b) => a.year - b.year)

  const Y_MIN_YR = series.length ? series[0].year : DA_SERIES_FLOOR
  const Y_MAX_YR = series.length ? series[series.length - 1].year : 2025
  const Y_MAX_PCT = 100
  // European Commission, Single Market Scoreboard: a direct-award share at or
  // above 10% is rated unsatisfactory. External reference, not a RUBLI measure.
  const EU_LINE = 10
  const last = series[series.length - 1]
  // Phones print the value alone (the red line is the only series).
  const mexicoLabel = last ? (narrow ? `${last.da.toFixed(1)}%` : `${isEs ? 'México' : 'Mexico'} · ${last.da.toFixed(1)}%`) : ''
  const euLabel = isEs ? `UE ${EU_LINE}%` : `EU ${EU_LINE}%`

  // Canvas-measured in the real faces; the plate draws only once they landed.
  const measure = (text: string, font: string, lh = FS + 4) => measureLabel(text, font, 999, lh)
  const yTickW = measure('100%', TICK_FONT).width
  const PAD_L = Math.ceil(yTickW) + 10
  const edgeW = Math.max(measure(mexicoLabel, EDGE_FONT).width, measure(euLabel, EDGE_FONT).width)
  // Desktop: the edge labels sit in a right margin; phones print them inside
  // the plot (right-aligned) so the line keeps the width.
  const PAD_R = narrow ? 12 : Math.ceil(edgeW) + 16
  const CW = Math.max(1, W - PAD_L - PAD_R)
  const CH = H - PAD_T - PAD_B

  const xOf = (year: number) => PAD_L + ((year - Y_MIN_YR) / Math.max(1, Y_MAX_YR - Y_MIN_YR)) * CW
  const yOf = (pct: number) => PAD_T + CH * (1 - pct / Y_MAX_PCT)
  const EU_Y = yOf(EU_LINE)
  const AXIS_Y = PAD_T + CH

  // Bands clipped to the drawn window (Calderón → 2010–12; Fox leaves).
  const eraBands = ADMINISTRATIONS
    .filter((a) => a.yearEnd >= Y_MIN_YR && a.yearStart <= Y_MAX_YR)
    .map((a) => ({
      key: a.key,
      label: ADMIN_DISPLAY_ACCENTED[a.key].toUpperCase(),
      start: Math.max(a.yearStart, Y_MIN_YR),
      end: Math.min(a.yearEnd, Y_MAX_YR),
      color: ERA_HUE[a.key],
    }))
    .map((b) => {
      const x1 = xOf(b.start)
      const x2 = b.end > b.start ? xOf(b.end) : Math.min(x1 + 16, PAD_L + CW)
      return { ...b, x1, x2 }
    })

  // The measured plate div stays mounted through loading (useMeasuredWidth
  // attaches its observer once, on mount).
  if (yoy.isLoading || yoy.isError || !series.length) {
    return (
      <div ref={plate} className="w-full">
        <p className="font-mono text-[12.5px] text-text-muted py-8">
          {yoy.isLoading
            ? (isEs ? 'Cargando la serie anual…' : 'Loading the annual series…')
            : (isEs
              ? 'La serie anual de adjudicación directa no cargó. No se dibuja nada en su lugar.'
              : 'The annual direct-award series did not load. Nothing is drawn in its place.')}
        </p>
      </div>
    )
  }

  const linePath = series
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xOf(d.year).toFixed(2)} ${yOf(d.da).toFixed(2)}`)
    .join(' ')
  const areaPath = `${linePath} L ${xOf(Y_MAX_YR).toFixed(2)} ${AXIS_Y} L ${xOf(Y_MIN_YR).toFixed(2)} ${AXIS_Y} Z`

  const yTicks = [0, 25, 50, 75, 100]

  // X ticks: desktop = first, last and every fourth year; phones = the band
  // starts + the data horizon (the Day 8 seam pattern). Kept right-to-left
  // while a label width apart, so the horizon wins over its neighbour.
  const tickCandidates = narrow
    ? [...new Set([...eraBands.map((b) => b.start), Y_MAX_YR])]
    : series.map((d) => d.year).filter((y, i, a) => i === 0 || i === a.length - 1 || y % 4 === 0)
  const tickW = measure('2025', TICK_FONT).width + 8
  const xTicks: number[] = []
  for (const yr of [...tickCandidates].sort((a, b) => b - a)) {
    if (!xTicks.length || xOf(xTicks[xTicks.length - 1]) - xOf(yr) >= tickW) xTicks.push(yr)
  }

  // Era labels — a mono row above the plot, full names first, initials when a
  // name cannot be seated.
  const ERA_FS = narrow ? 11 : 13
  const ERA_FONT = `700 ${ERA_FS}px ${MONO}`
  const eraTrack = narrow ? 0 : 0.08
  const eraBounds: LabelBox = { x0: 0, y0: 0, x1: W, y1: PAD_T }
  const eraPlaced = new Map<string, { text: string; left: number }>()
  {
    const taken: LabelBox[] = []
    for (const b of eraBands) {
      for (const text of [b.label, ERA_SHORT[b.key]]) {
        const w = measure(text, ERA_FONT).width + text.length * ERA_FS * eraTrack
        const cx = (b.x1 + b.x2) / 2
        const [p] = placeLabels([{ id: b.key, x: cx, y: PAD_T - 4, width: w, height: ERA_FS + 4, above: 6 }], taken, eraBounds)
        if (p) {
          taken.push(p.box)
          eraPlaced.set(b.key, { text, left: p.box.x0 })
          break
        }
      }
    }
  }

  // Edge labels (Mexico · %, EU 10%).
  const lastX = xOf(last.year)
  const lastY = yOf(last.da)
  const edgeH = (narrow ? 11 : 12) + 4
  const mexicoW = measure(mexicoLabel, EDGE_FONT).width
  const euW = measure(euLabel, EDGE_FONT).width
  // Phones print both edge labels inside the plot, right-aligned below their
  // line (the value under its last point, EU under the dashed line).
  const mexicoPos = narrow
    ? { left: Math.max(PAD_L, lastX - mexicoW), top: lastY + 8 }
    : { left: lastX + 6, top: lastY - edgeH / 2 }
  const euPos = narrow
    ? { left: PAD_L + CW - euW, top: EU_Y + 2 }
    : { left: PAD_L + CW + 6, top: EU_Y - edgeH / 2 }

  // Callouts — below the line at their zigzag depth; a box that would collide
  // or leave the plot is dropped rather than overprinted.
  const calloutObstacles: LabelBox[] = narrow
    ? [{ x0: mexicoPos.left, y0: mexicoPos.top, x1: mexicoPos.left + mexicoW, y1: mexicoPos.top + edgeH },
       { x0: euPos.left, y0: euPos.top, x1: euPos.left + euW, y1: euPos.top + edgeH },
       // a box never sits on the EU reference line
       { x0: PAD_L, y0: EU_Y - 1, x1: PAD_L + CW, y1: EU_Y + 1 }]
    : []
  // Priority: the COVID pull-out first; each box may fall back to the other
  // zigzag depth before it is dropped.
  const PRIORITY = [2020, 2017, 2014, 2023]
  const calloutCands = [...CALLOUTS].sort((a, b) => PRIORITY.indexOf(a.year) - PRIORITY.indexOf(b.year)).flatMap((c) => {
    const pt = series.find((d) => d.year === c.year)
    if (!pt) return []
    const isCovid = c.year === 2020
    const label = isEs ? c.es : c.en
    const font = isCovid ? COVID_FONT : CALLOUT_FONT
    const padX = isCovid ? 12 : 7
    const boxH = isCovid ? 24 : 18
    const w = measure(label, font).width + padX * 2
    const cx = xOf(c.year)
    const cy = yOf(pt.da)
    const altDy = c.dy === 60 ? 110 : 60
    return [{ id: c.year, x: cx, y: cy, width: w, height: boxH, above: -c.dy - boxH, below: altDy, label, isCovid, cy }]
  })
  const calloutBounds: LabelBox = { x0: PAD_L + 2, y0: PAD_T, x1: PAD_L + CW - 2, y1: AXIS_Y + 0.5 }
  // Seat each box at its depth, then the other depth; centred, then flush
  // left/right of its year. A box is refused when it leaves the plot, meets
  // another box or label, or when its leader crosses one (or an earlier
  // leader crosses it) — dropped rather than overprinted.
  const hit = (a: LabelBox, b: LabelBox) => !(a.x1 <= b.x0 || a.x0 >= b.x1 || a.y1 <= b.y0 || a.y0 >= b.y1)
  const leaderHits = (x1: number, y1: number, x2: number, y2: number, b: LabelBox) => {
    for (let t = 0; t <= 1; t += 0.04) {
      const x = x1 + (x2 - x1) * t
      const y = y1 + (y2 - y1) * t
      if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true
    }
    return false
  }
  const placedCallouts: Array<{ id: number; box: LabelBox }> = []
  {
    const taken: LabelBox[] = [...calloutObstacles]
    const leaders: Array<[number, number, number, number]> = []
    for (const c of calloutCands) {
      let seat: LabelBox | null = null
      for (const top of [c.cy - c.above - c.height, c.cy + c.below]) {
        for (const x0 of [c.x - c.width / 2, c.x - 8, c.x - c.width + 8]) {
          const box = { x0, y0: top, x1: x0 + c.width, y1: top + c.height }
          const inside = box.x0 >= calloutBounds.x0 && box.x1 <= calloutBounds.x1 && box.y0 >= calloutBounds.y0 && box.y1 <= calloutBounds.y1
          if (!inside || taken.some((t) => hit(box, t))) continue
          const lead: [number, number, number, number] = [c.x, c.cy + 2, (box.x0 + box.x1) / 2, box.y0]
          if (taken.some((t) => leaderHits(...lead, t)) || leaders.some((l) => leaderHits(...l, box))) continue
          seat = box
          leaders.push(lead)
          break
        }
        if (seat) break
      }
      if (seat) {
        taken.push(seat)
        placedCallouts.push({ id: c.id, box: seat })
      }
    }
  }
  const calloutMeta = new Map(calloutCands.map((c) => [c.id, c]))

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const rawYear = Y_MIN_YR + ((e.clientX - rect.left - PAD_L) / CW) * (Y_MAX_YR - Y_MIN_YR)
    const year = Math.round(Math.max(Y_MIN_YR, Math.min(Y_MAX_YR, rawYear)))
    setHoverYear((prev) => (prev === year ? prev : year))
  }
  const hoverPt = hoverYear !== null ? series.find((d) => d.year === hoverYear) : undefined

  const label = (style: React.CSSProperties, text: string, key?: string | number, extra?: Record<string, string>) => (
    <div key={key} className="absolute whitespace-nowrap pointer-events-none" style={style} {...extra}>
      {text}
    </div>
  )

  return (
    <div ref={plate} className="w-full">
      <div className="relative w-full" style={{ height: H }}>
        {W > 0 && fontsReady && (
          <>
            <svg
              data-figure="macroarc"
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={{ display: 'block', overflow: 'visible' }}
              role="img"
              aria-label={isEs
                ? `Tasa de adjudicación directa ${Y_MIN_YR}–${Y_MAX_YR} frente a la línea UE de ${EU_LINE}%`
                : `Direct-award rate ${Y_MIN_YR}–${Y_MAX_YR} against the EU ${EU_LINE}% line`}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverYear(null)}
            >
              <defs>
                <linearGradient id="macroarc-area" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Admin wash bands behind the chart */}
              {eraBands.map((b) => (
                <rect key={b.key} x={b.x1} y={PAD_T} width={Math.max(1, b.x2 - b.x1)} height={CH} fill={b.color} opacity={0.05} />
              ))}

              {/* Y grid */}
              {yTicks.map((t) => (
                <line
                  key={`y-${t}`}
                  x1={PAD_L}
                  x2={PAD_L + CW}
                  y1={yOf(t)}
                  y2={yOf(t)}
                  stroke="var(--color-border)"
                  strokeWidth={t === 0 ? 1 : 0.5}
                  strokeDasharray={t === 0 ? '' : '2 4'}
                  opacity={t === 0 ? 0.6 : 0.35}
                />
              ))}

              {/* EU scoreboard reference line — dashed cyan */}
              <line x1={PAD_L} x2={PAD_L + CW} y1={EU_Y} y2={EU_Y} stroke="#22d3ee" strokeWidth={1.2} strokeDasharray="6 4" opacity={0.85} />

              {/* Area fill under Mexico line */}
              <motion.path
                d={areaPath}
                fill="url(#macroarc-area)"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
              />

              {/* Mexico DA-rate line */}
              <motion.path
                d={linePath}
                fill="none"
                stroke="#dc2626"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: 'easeOut', delay: 0.4 }}
              />

              {/* Year dots */}
              {series.map((d) => (
                <circle
                  key={d.year}
                  cx={xOf(d.year)}
                  cy={yOf(d.da)}
                  r={hoverYear === d.year ? 4 : 2.2}
                  fill="#dc2626"
                  data-da={d.da}
                  opacity={hoverYear === d.year ? 1 : 0.7}
                  style={{ transition: 'r 120ms, opacity 120ms' }}
                />
              ))}

              {/* Callout leaders + box frames (the text is HTML) */}
              {placedCallouts.map((p) => {
                const c = calloutMeta.get(p.id)!
                const bx = (p.box.x0 + p.box.x1) / 2
                return (
                  <g key={p.id}>
                    <line
                      x1={c.x}
                      y1={c.cy + 2}
                      x2={bx}
                      y2={p.box.y0}
                      stroke={c.isCovid ? '#dc2626' : 'var(--color-text-muted)'}
                      strokeWidth={c.isCovid ? 0.9 : 0.6}
                      opacity={c.isCovid ? 0.65 : 0.55}
                    />
                    <rect
                      x={p.box.x0}
                      y={p.box.y0}
                      width={p.box.x1 - p.box.x0}
                      height={p.box.y1 - p.box.y0}
                      rx={2}
                      fill="var(--color-background-card)"
                      stroke={c.isCovid ? '#dc2626' : 'var(--color-border-hover)'}
                      strokeWidth={c.isCovid ? 1 : 0.7}
                      opacity={c.isCovid ? 0.97 : 0.96}
                    />
                  </g>
                )
              })}

              {/* Hover guide */}
              {hoverPt && (
                <line
                  x1={xOf(hoverPt.year)}
                  x2={xOf(hoverPt.year)}
                  y1={PAD_T}
                  y2={AXIS_Y}
                  stroke="var(--color-text-muted)"
                  strokeWidth={0.5}
                  strokeDasharray="2 3"
                  opacity={0.5}
                />
              )}
            </svg>

            {/* ── HTML label layer (1:1 with the svg) ── */}
            {eraBands.map((b) => {
              const p = eraPlaced.get(b.key)
              if (!p) return null
              return label({
                left: p.left, top: PAD_T - ERA_FS - 14, fontFamily: MONO, fontSize: ERA_FS, fontWeight: 700,
                lineHeight: `${ERA_FS + 4}px`, letterSpacing: `${eraTrack}em`, color: b.color,
              }, p.text, `era-${b.key}`, { 'data-era-label': '' })
            })}
            {yTicks.map((t) => label({
              left: 0, width: PAD_L - 6, top: yOf(t) - (FS + 4) / 2, textAlign: 'right', fontFamily: MONO,
              fontSize: FS, lineHeight: `${FS + 4}px`, color: 'var(--color-text-muted)',
            }, `${t}%`, `yt-${t}`))}
            {xTicks.map((y) => {
              const w = measure(String(y), TICK_FONT).width
              return label({
                left: Math.min(W - w, Math.max(0, xOf(y) - w / 2)), top: AXIS_Y + 6, fontFamily: MONO, fontSize: FS,
                lineHeight: `${FS + 4}px`, color: 'var(--color-text-muted)',
              }, String(y), `xt-${y}`, { 'data-x-tick': String(y) })
            })}
            {label({
              left: euPos.left, top: euPos.top, fontFamily: MONO, fontSize: narrow ? 11 : 12, fontWeight: 700,
              lineHeight: `${edgeH}px`, color: 'var(--color-text-secondary)',
            }, euLabel, 'eu')}
            {label({
              left: mexicoPos.left, top: mexicoPos.top, fontFamily: MONO, fontSize: narrow ? 11 : 12, fontWeight: 700,
              lineHeight: `${edgeH}px`, color: RISK_TEXT_COLORS.critical,
            }, mexicoLabel, 'mx')}
            {placedCallouts.map((p) => {
              const c = calloutMeta.get(p.id)!
              return label({
                left: p.box.x0, top: p.box.y0, width: p.box.x1 - p.box.x0, height: p.box.y1 - p.box.y0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: c.isCovid ? SERIF : MONO, fontSize: c.isCovid ? (narrow ? 12 : 13) : (narrow ? 11 : 13),
                fontWeight: c.isCovid ? 700 : 600,
                color: c.isCovid ? RISK_TEXT_COLORS.critical : 'var(--color-text-secondary)',
              }, c.label, `co-${p.id}`, { 'data-callout': String(p.id) })
            })}
            {hoverPt && label({
              left: xOf(hoverPt.year), top: yOf(hoverPt.da) - 28, transform: 'translateX(-50%)', fontFamily: MONO,
              fontSize: 13, fontWeight: 800, lineHeight: '17px', color: RISK_TEXT_COLORS.critical,
              background: 'var(--color-background-elevated)', padding: '0 3px',
            }, `${hoverPt.da.toFixed(1)}%`, 'hover')}
          </>
        )}
      </div>

      {/* Caption — minimal, methodology-only */}
      <p className="mt-2 text-[12.5px] font-mono text-text-muted leading-relaxed">
        {isEs
          ? `Tasa de adjudicación directa anual · bandas administrativas · el Tablero UE considera insatisfactorio ≥ ${EU_LINE}%. Fuente: COMPRANET ${Y_MIN_YR}–${Y_MAX_YR} · 2002–2009 no se dibujan — la Estructura A no codifica el tipo de procedimiento.`
          : `Yearly direct-award rate · admin wash bands · the EU scoreboard rates ≥ ${EU_LINE}% unsatisfactory. Source: COMPRANET ${Y_MIN_YR}–${Y_MAX_YR} · 2002–2009 not drawn — Structure A does not code the procedure type.`}
      </p>
    </div>
  )
}
