/**
 * ArqueoMesa — «La Mesa del Arqueo» / "The Counting Table" — the WHO
 * Marimekko hero for the /sectors redesign (Act I).
 *
 * Named precedent: FT Visual Vocabulary Marimekko/mosaic (two variables —
 * size AND proportion — in one part-to-whole geometry), NYT Upshot federal
 * spending "area = money" discipline, Reuters *Forever Pollution* annotation
 * discipline (exactly two named callouts, computed).
 *
 * One full-width rectangle = the entire till. Twelve vertical slices, width
 * proportional to each sector's total spend. Inside each slice a fine 45°
 * ink hatch rises from the baseline to the sector's own-spend saturation
 * (ownSpendShare); a denser hatch (critical-only) rises to the critical
 * share. Because width × hatch-height = flagged pesos, the hatched AREA of
 * each column IS the flagged value — no separate bar, no dot, no circle.
 *
 * Pure SVG, ResizeObserver-driven width (1 svg unit = 1 px), no
 * recharts. Self-contained: no shared chart primitives, no dots.
 *
 * Spec: docs/../.claude/designs/sectors-fable-2026-07-02-spec.md
 *   §2.1 Act I «La Mesa del Arqueo» + §3 NEW 1 — ArqueoMesa.tsx
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EntityIdentityChip } from '@/components/ui/EntityIdentityChip'
import type { LedgerRow } from './ExposureLedger'
import { ownSpendShare } from './confoundScales'
import { SECTOR_COLORS, SECTOR_TEXT_COLORS, RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { measureLabel, placeLabels, type LabelBox, type LabelCandidate } from '@/lib/plateLabels'
import { useFontsReady, useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import { PlateIndexMark, PlateIndexBadge, PLATE_INDEX_MIN_COL } from './PlateIndex'

interface ArqueoMesaProps {
  rows: LedgerRow[]
  lang: 'en' | 'es'
}

// ── Geometry constants ──────────────────────────────────────────────────────
// Desktop readout: a fixed two-line slot, so the longest hovered reading (ES,
// Change 6) wraps instead of clipping and hover never moves the plate (judge J6).
const DESK_READOUT_H = 36
// Headroom inside the svg for the top tick and the annotation leaders, so the
// plate no longer needs `overflow: visible` (PARALLAX D7 § Change 2).
const TOP_PAD = 28
const BAND_H = 300
const STRIP_H = 4
const LABEL_H = 18
const GUTTER_W = 34
const RIGHT_PAD = 8
const MIN_COL_W = 6
const MOBILE_BREAKPOINT = 768
// 24px floor: each mobile row is a link, so it is also a 24px target.
const MOBILE_ROW_MIN_H = 24
const MOBILE_HEADER_H = 16
// Phone readout: a two-line slot in both languages (ES wraps, hover text wraps),
// so neither the first paint nor a hover moves the rows.
const MOBILE_READOUT_H = 36
// Desktop legend under the plate: two 13px rows at 1024–1440 (measured, D7b).
const LEGEND_RESERVE_H = 51
// …and the key sentence under it: two 13.5px lines + margin, EN = ES (measured).
const KEY_RESERVE_H = 47

// Glyph faces — the canvas measures exactly what the svg/HTML renders.
const MONO = "'IBM Plex Mono', monospace"
const LABEL_FONT = `13px ${MONO}`
const LABEL_TRACKING = 0.04 // em — letterSpacing on the column names
const ANNO_FONT = `11px ${MONO}`
const ANNO_LINE_H = 13
// Every face the canvas measures with — the plate waits for exactly these.
const MEASURED_FACES = [LABEL_FONT, ANNO_FONT]

// The ½ and 80% flag rules: accent-hover at full alpha (the ochre at α .7 /
// .35 measured 2.56 / 1.55:1 — a11y X4; accent-hover is 6.3:1).
const FLAG_RULE = 'var(--color-accent-hover)'

/** Mobile row height: spend share of a 440px run, floored at the 24px target. */
function mobileRowH(totalMxn: number, totalSpend: number): number {
  return Math.max(MOBILE_ROW_MIN_H, (totalSpend > 0 ? totalMxn / totalSpend : 0) * 440)
}

function sectorFill(code: string): string {
  return SECTOR_COLORS[code] ?? SECTOR_COLORS.otros
}
function sectorText(code: string): string {
  return SECTOR_TEXT_COLORS[code] ?? SECTOR_TEXT_COLORS.otros ?? '#475569'
}


// ── Component ────────────────────────────────────────────────────────────────
export function ArqueoMesa({ rows, lang }: ArqueoMesaProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  // 0 until the first ResizeObserver tick: nothing is drawn at a guessed width
  // (the old 720px first paint shifted the figure — PARALLAX D7b § Change 8).
  const width = useMeasuredWidth(containerRef)
  const isMobile = width > 0 && width < MOBILE_BREAKPOINT
  const [hoverId, setHoverId] = useState<number | null>(null)

  // Spend-descending order (columns/rows).
  const ordered = useMemo(() => [...rows].sort((a, b) => b.totalMxn - a.totalMxn), [rows])
  const totalSpend = useMemo(() => ordered.reduce((acc, r) => acc + r.totalMxn, 0), [ordered])
  const totalVar = useMemo(() => ordered.reduce((acc, r) => acc + r.varMxn, 0), [ordered])
  const overallSharePct = totalSpend > 0 ? (totalVar / totalSpend) * 100 : 0
  // Share of contracts that ARE the flagged (high+critical) ones — the count
  // denominator behind the flagged VALUE. Pairs honestly with overallSharePct
  // (55.9% of value) and matches the page's Fe de arqueo countPct (~10.9%).
  const overallFlaggedRate = useMemo(() => {
    const contracts = ordered.reduce((acc, r) => acc + r.contracts, 0)
    const flagged = ordered.reduce((acc, r) => acc + (r.highCount ?? 0) + r.criticalCount, 0)
    return contracts > 0 ? (flagged / contracts) * 100 : 0
  }, [ordered])

  // Widest column (largest spend) and tallest-hatch column (largest own-spend share) — argmax, computed.
  const widest = useMemo(() => ordered.reduce((a, b) => (b.totalMxn > (a?.totalMxn ?? -Infinity) ? b : a), ordered[0]), [ordered])
  const tallest = useMemo(
    () => ordered.reduce((a, b) => (ownSpendShare(b) > ownSpendShare(a ?? b) ? b : a), ordered[0]),
    [ordered],
  )

  // Narrow columns (below label threshold at current width) → circled-number legend.
  const bandW = Math.max(0, width - GUTTER_W - RIGHT_PAD)
  const colWidths = useMemo(() => {
    if (totalSpend <= 0 || bandW <= 0) return ordered.map(() => 0)
    // Marimekko min-width allocation: give every column a legible floor, then
    // split the REMAINING band strictly by spend share. This guarantees
    // Σ widths === bandW exactly — so the run can never spill past the plate's
    // right edge (the old `max(MIN_COL_W, prop*bandW)` over-allocated whenever a
    // tail sector's true width fell below the floor) — while keeping the tiny
    // tail sectors a visible, hoverable sliver instead of a sub-pixel hairline.
    const n = ordered.length
    const floor = Math.min(MIN_COL_W, bandW / n)
    const free = Math.max(0, bandW - floor * n)
    return ordered.map((r) => floor + (r.totalMxn / totalSpend) * free)
  }, [ordered, totalSpend, bandW])

  // A column shows its full name only when the measured name (+6px) fits the
  // column; otherwise a circled index + legend entry. The desktop plate is not
  // drawn until the plate's own faces are in (a fallback-face measure runs
  // narrow and was never redone), so every measure below runs on the real face.
  const fontsReady = useFontsReady(MEASURED_FACES)
  const labelFits = useMemo(() => {
    return ordered.map((r, i) => {
      const name = r.name.toUpperCase()
      const w = measureLabel(name, LABEL_FONT, Number.POSITIVE_INFINITY, 16).width + name.length * 13 * LABEL_TRACKING
      return w + 6 <= colWidths[i]
    })
  }, [ordered, colWidths])

  const narrowSet = useMemo(
    () => ordered.map((r, i) => ({ row: r, w: colWidths[i] })).filter((_, i) => !labelFits[i]),
    [ordered, colWidths, labelFits],
  )

  const readoutText = useMemo(() => {
    if (!hoverId) {
      return lang === 'es'
        ? 'pase el cursor por una columna · clic → dossier del sector'
        : 'hover a column · click → sector dossier'
    }
    const r = ordered.find((x) => x.sectorId === hoverId)
    if (!r) return ''
    const share = ownSpendShare(r) * 100
    const criticalPct = r.totalMxn > 0 ? (r.criticalMxn / r.totalMxn) * 100 : 0
    return lang === 'es'
      ? `${r.name} · total ${formatCompactMXN(r.totalMxn)} · observado ${formatCompactMXN(r.varMxn)} (${share.toFixed(0)}%) · crítico ${criticalPct.toFixed(0)}% del valor · AD ${r.daPct.toFixed(0)}%`
      : `${r.name} · total ${formatCompactMXN(r.totalMxn)} · flagged ${formatCompactMXN(r.varMxn)} (${share.toFixed(0)}%) · critical ${criticalPct.toFixed(0)}% of value · DA ${r.daPct.toFixed(0)}%`
  }, [hoverId, ordered, lang])

  // Height held before the first measure, so the figure never pushes the page:
  // the desktop plate, or the stacked mobile rows (same arithmetic as MobileMesa).
  const pending = width === 0 || (!isMobile && !fontsReady)
  const reserveH =
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
      ? MOBILE_READOUT_H + 8 + MOBILE_HEADER_H + ordered.reduce((acc, r) => acc + mobileRowH(r.totalMxn, totalSpend), 0)
      : DESK_READOUT_H + TOP_PAD + BAND_H + STRIP_H + LABEL_H + LEGEND_RESERVE_H + KEY_RESERVE_H

  const goToSector = useCallback((sectorId: number) => navigate(`/sectors/${sectorId}`), [navigate])

  const caption =
    lang === 'es'
      ? `Lámina — La mesa completa: el ancho de cada columna es el gasto del sector; el achurado sube hasta la parte observada de su propio gasto. El área achurada son los pesos observados — ${overallSharePct.toFixed(1)}% de la mesa. Achurado denso = solo crítico. La bandera de ½ marca la mitad del gasto propio.`
      : `Plate — The whole table: each column's width is the sector's spend; the hatch rises to the flagged share of its own spend. Hatched area is flagged pesos — ${overallSharePct.toFixed(1)}% of the table. Dense hatch = critical only. The ½ flag marks half of own spend.`

  const headline =
    lang === 'es' ? (
      <>
        El modelo observa <strong style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{formatCompactMXN(totalVar)} de {formatCompactMXN(totalSpend)}</strong> sobre la mesa — el {overallSharePct.toFixed(1)}% del valor, cargado por apenas el {overallFlaggedRate.toFixed(1)}% de los contratos.
      </>
    ) : (
      <>
        The model flags <strong style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{formatCompactMXN(totalVar)} of {formatCompactMXN(totalSpend)}</strong> on the table — {overallSharePct.toFixed(1)}% of value, carried by just {overallFlaggedRate.toFixed(1)}% of contracts.
      </>
    )

  return (
    <div className="w-full">
      <p
        className="font-mono mb-1"
        style={{ fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}
      >
        {lang === 'es' ? '§ LA MESA DEL ARQUEO · DOCE SECTORES, UN SOLO CORTE' : '§ THE COUNTING TABLE · TWELVE SECTORS, ONE COUNT'}
      </p>
      <h2
        className="mb-4"
        style={{
          fontFamily: '"EB Garamond", "Playfair Display", Georgia, serif',
          fontWeight: 700,
          fontSize: 'clamp(1.25rem, 2.4vw, 1.75rem)',
          lineHeight: 1.3,
          color: 'var(--color-text-primary)',
        }}
      >
        {headline}
      </h2>

      <PlateFrame
        lang={lang}
        folio="II·a"
        contextLabel={{ en: 'The counting table', es: 'La mesa del arqueo' }}
        caption={caption}
      >
        {/* Ref lives INSIDE the frame so the ResizeObserver measures the
            plate's padded content width — not the full column width. The SVG
            is sized to this, so it can never overhang the frame's border. */}
        <div ref={containerRef} className="w-full" style={pending ? { minHeight: reserveH } : undefined}>
          {pending ? null : isMobile ? (
            <MobileMesa rows={ordered} lang={lang} readoutText={readoutText} setHoverId={setHoverId} />
          ) : (
            <DesktopMesa
              rows={ordered}
              colWidths={colWidths}
              width={width}
              lang={lang}
              hoverId={hoverId}
              setHoverId={setHoverId}
              onSelect={goToSector}
              readoutText={readoutText}
              widest={widest}
              tallest={tallest}
              narrowSet={narrowSet}
            />
          )}
        </div>
      </PlateFrame>
    </div>
  )
}

// ── Desktop Marimekko ────────────────────────────────────────────────────────
function DesktopMesa({
  rows,
  colWidths,
  width,
  lang,
  hoverId,
  setHoverId,
  onSelect,
  readoutText,
  widest,
  tallest,
  narrowSet,
}: {
  rows: LedgerRow[]
  colWidths: number[]
  width: number
  lang: 'en' | 'es'
  hoverId: number | null
  setHoverId: (id: number | null) => void
  onSelect: (sectorId: number) => void
  readoutText: string
  widest: LedgerRow
  tallest: LedgerRow
  narrowSet: { row: LedgerRow; w: number }[]
}) {
  const bandW = Math.max(0, width - GUTTER_W - RIGHT_PAD)
  const yTicks = [0, 25, 50, 75, 100]
  const patternId = 'arqueo-fine'
  const denseId = 'arqueo-dense'
  const svgH = TOP_PAD + BAND_H + STRIP_H + LABEL_H
  const bandY = (share: number) => TOP_PAD + BAND_H * (1 - share)
  const hoverIdx = hoverId === null ? -1 : rows.findIndex((r) => r.sectorId === hoverId)
  const hoverNarrowIdx = hoverId === null ? -1 : narrowSet.findIndex((d) => d.row.sectorId === hoverId)

  // x-offsets per column
  const xOffsets: number[] = []
  {
    let acc = GUTTER_W
    for (const w of colWidths) {
      xOffsets.push(acc)
      acc += w
    }
  }

  // Waterline points (stepped): top of fine hatch per column.
  const waterlinePoints = rows
    .map((r, i) => {
      const share = ownSpendShare(r)
      const x0 = xOffsets[i]
      const x1 = xOffsets[i] + colWidths[i]
      // The readout strip is a sibling <div>, NOT part of this SVG, so the
      // waterline sits at the hatch top (TOP_PAD headroom, no readout height).
      const y = bandY(share)
      return `${x0.toFixed(1)},${y.toFixed(1)} ${x1.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')


  // ── The two computed annotations — HTML glyphs over the svg geometry ──
  // Seated with placeLabels (bounded to the plate, re-anchored at the edges,
  // the second dropped rather than overprinted); obstacles = the tick column
  // and the two flag labels.
  const annoWidth = (lines: string[]) =>
    Math.max(...lines.map((l) => measureLabel(l, ANNO_FONT, Number.POSITIVE_INFINITY, ANNO_LINE_H).width))
  const annoText: Record<string, [string, string]> = {}
  const candidates: LabelCandidate[] = []
  const wIdx = rows.findIndex((r) => r.sectorId === widest.sectorId)
  const widestTop = bandY(ownSpendShare(widest))
  if (wIdx >= 0) {
    annoText.widest = lang === 'es'
      ? [`mayor volumen — ${widest.name}`, `${formatCompactMXN(widest.varMxn)} de ${formatCompactMXN(widest.totalMxn)}`]
      : [`largest volume — ${widest.name}`, `${formatCompactMXN(widest.varMxn)} of ${formatCompactMXN(widest.totalMxn)}`]
    // Anchored at the column's hatch top with a ≥ 24px leader (it used to hang
    // from TOP_PAD + 30 — a 10px stub 92px above the hatch; D7b § Change 6).
    candidates.push({ id: 'widest', x: xOffsets[wIdx] + colWidths[wIdx] / 2, y: widestTop, width: annoWidth(annoText.widest), height: 2 * ANNO_LINE_H, above: 28, below: 4 })
  }
  const tIdx = rows.findIndex((r) => r.sectorId === tallest.sectorId)
  const tallestTop = bandY(ownSpendShare(tallest))
  if (tIdx >= 0) {
    const pct = (ownSpendShare(tallest) * 100).toFixed(0)
    annoText.tallest = lang === 'es'
      ? [`mayor saturación — ${tallest.name}`, `${pct}% de su propio gasto`]
      : [`highest saturation — ${tallest.name}`, `${pct}% of its own spend`]
    candidates.push({ id: 'tallest', x: xOffsets[tIdx] + colWidths[tIdx] / 2, y: tallestTop, width: annoWidth(annoText.tallest), height: 2 * ANNO_LINE_H, above: 14, below: 4 })
  }
  const flagLabelBox = (y: number, text: string, lead: number): LabelBox => ({
    x0: GUTTER_W, y0: y - 16, x1: GUTTER_W + lead + measureLabel(text, ANNO_FONT, Number.POSITIVE_INFINITY, ANNO_LINE_H).width + 4, y1: y + 2,
  })
  const ownSpendLabel = lang === 'es' ? 'gasto propio' : 'own spend'
  const placed = placeLabels(
    candidates,
    [
      { x0: 0, y0: 0, x1: GUTTER_W, y1: svgH },
      flagLabelBox(bandY(0.5), ownSpendLabel, 16),
      flagLabelBox(bandY(0.8), '80%', 4),
    ],
    { x0: 0, y0: 0, x1: width, y1: TOP_PAD + BAND_H },
  )

  return (
    <div>
      {/* Fixed readout strip — hover data on the left, persistent axis label on the right */}
      <div
        className="font-mono tabular-nums"
        style={{ height: DESK_READOUT_H, fontSize: 12, lineHeight: '18px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          {hoverNarrowIdx >= 0 && <PlateIndexBadge n={hoverNarrowIdx + 1} />}
          <span role="status" aria-live="polite">{readoutText}</span>
        </span>
        <span style={{ flexShrink: 0, fontSize: 11, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          {lang === 'es' ? '% del gasto propio observado' : '% of own spend flagged'}
        </span>
      </div>

      <div className="relative">
      <svg width={width} height={svgH} style={{ display: 'block' }} role="img"
        aria-label={lang === 'es' ? 'Mosaico Marimekko: ancho por gasto sectorial, achurado por saturación observada' : 'Marimekko mosaic: width by sector spend, hatch by flagged saturation'}
      >
        <defs>
          <pattern id={patternId} width={4} height={4} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1={0} y1={0} x2={0} y2={4} stroke="var(--color-text-primary)" strokeOpacity={0.38} strokeWidth={1} />
          </pattern>
          <pattern id={denseId} width={2} height={2} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1={0} y1={0} x2={0} y2={2} stroke="var(--color-text-primary)" strokeOpacity={0.5} strokeWidth={1} />
          </pattern>
        </defs>

        {/* y-axis ticks + label */}
        {yTicks.map((t) => (
          <g key={t}>
            <text
              x={GUTTER_W - 6}
              y={bandY(t / 100) + 4}
              textAnchor="end"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize={11}
              fill="var(--color-text-muted)"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Columns */}
        {rows.map((r, i) => {
          const x = xOffsets[i]
          const w = colWidths[i]
          const share = ownSpendShare(r)
          const critShare = r.totalMxn > 0 ? Math.max(0, Math.min(1, r.criticalMxn / r.totalMxn)) : 0
          const hatchY = bandY(share)
          const denseY = bandY(critShare)
          const isHover = hoverId === r.sectorId
          const isDimmed = hoverId !== null && !isHover
          const fill = sectorFill(r.sectorCode)
          const text = sectorText(r.sectorCode)
          const narrowIdx = narrowSet.findIndex((d) => d.row.sectorId === r.sectorId)
          const showLabel = narrowIdx < 0

          const ariaLabel =
            lang === 'es'
              ? `${r.name} — ${formatCompactMXN(r.totalMxn)} de gasto, ${formatCompactMXN(r.varMxn)} observado (${(share * 100).toFixed(0)}% del gasto propio) · crítico ${(critShare * 100).toFixed(0)}% del valor · adjudicación directa ${r.daPct.toFixed(0)}%`
              : `${r.name} — ${formatCompactMXN(r.totalMxn)} spend, ${formatCompactMXN(r.varMxn)} flagged (${(share * 100).toFixed(0)}% of own spend) · critical ${(critShare * 100).toFixed(0)}% of value · direct award ${r.daPct.toFixed(0)}%`

          return (
            <g key={r.sectorId}>
              {/* separator */}
              {i > 0 && <line x1={x} y1={TOP_PAD} x2={x} y2={TOP_PAD + BAND_H} stroke="var(--color-border)" strokeWidth={1} />}

              {/* fine hatch (own-spend share) */}
              <rect
                x={x}
                y={hatchY}
                width={w}
                height={TOP_PAD + BAND_H - hatchY}
                fill={`url(#${patternId})`}
                opacity={isHover ? 1.3 : isDimmed ? 0.55 : 1}
              />
              {/* dense hatch (critical-only), layered on top */}
              {critShare > 0 && (
                <rect
                  x={x}
                  y={denseY}
                  width={w}
                  height={TOP_PAD + BAND_H - denseY}
                  fill={`url(#${denseId})`}
                  opacity={isHover ? 1.3 : isDimmed ? 0.55 : 1}
                />
              )}

              {/* sector baseline strip */}
              <rect x={x} y={TOP_PAD + BAND_H} width={w} height={STRIP_H} fill={fill} opacity={isDimmed ? 0.55 : 1} />

              {/* label or circled tick */}
              {showLabel ? (
                <text
                  x={x + w / 2}
                  y={TOP_PAD + BAND_H + STRIP_H + 12}
                  textAnchor="middle"
                  fontFamily="'IBM Plex Mono', monospace"
                  fontSize={13}
                  letterSpacing="0.04em"
                  fill={text}
                  style={{ textTransform: 'uppercase' }}
                >
                  {r.name}
                </text>
              ) : (
                w >= PLATE_INDEX_MIN_COL ? (
                  <PlateIndexMark n={narrowIdx + 1} cx={x + w / 2} cy={TOP_PAD + BAND_H + STRIP_H + 9} />
                ) : null
              )}

              {/* hit target — focus is drawn by the accent outline below */}
              <rect
                x={x}
                y={TOP_PAD}
                width={Math.max(w, 8)}
                height={BAND_H}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={ariaLabel}
                // The native ring would draw a second box; the accent outline
                // rect below is the focus indicator (hover and focus alike).
                className="focus-visible:outline-none"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverId(r.sectorId)}
                onFocus={() => setHoverId(r.sectorId)}
                onMouseLeave={() => setHoverId(null)}
                onBlur={() => setHoverId(null)}
                onClick={() => onSelect(r.sectorId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(r.sectorId)
                  }
                }}
              />
            </g>
          )
        })}

        {/* Ruled flags — marks keep the ochre hairlines; their text reads in
            accent-hover. Nothing here takes the pointer (the ½ line used to
            steal hover from the column underneath). */}
        <line x1={GUTTER_W} y1={bandY(0.5)} x2={GUTTER_W + bandW} y2={bandY(0.5)} stroke={FLAG_RULE} strokeWidth={1} pointerEvents="none" />
        <text x={GUTTER_W + 4} y={bandY(0.5) - 4} fontFamily="'EB Garamond', Georgia, serif" fontStyle="normal" fontWeight={700} fontSize={13} fill="var(--color-accent-hover)" pointerEvents="none">
          ½
        </text>
        <text x={GUTTER_W + 16} y={bandY(0.5) - 4} fontFamily="'IBM Plex Mono', monospace" fontSize={11} fill="var(--color-accent-hover)" pointerEvents="none">
          {ownSpendLabel}
        </text>

        <line x1={GUTTER_W} y1={bandY(0.8)} x2={GUTTER_W + bandW} y2={bandY(0.8)} stroke={FLAG_RULE} strokeWidth={1} pointerEvents="none" />
        <text x={GUTTER_W + 4} y={bandY(0.8) - 4} fontFamily="'IBM Plex Mono', monospace" fontSize={11} fill="var(--color-accent-hover)" pointerEvents="none">
          80%
        </text>

        {/* Waterline */}
        <polyline points={waterlinePoints} fill="none" stroke={RISK_COLORS.critical} strokeWidth={1.5} pointerEvents="none" />

        {/* Hover / keyboard-focus outline around the active column */}
        {hoverIdx >= 0 && (
          <rect
            x={xOffsets[hoverIdx] + 1}
            y={TOP_PAD + 1}
            width={Math.max(2, colWidths[hoverIdx] - 2)}
            height={BAND_H - 2}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            pointerEvents="none"
          />
        )}

        {/* Annotation leaders (the glyphs are HTML, below) */}
        {placed.map((p) => {
          const c = candidates.find((k) => k.id === p.id)
          if (!c) return null
          const top = p.id === 'widest' ? widestTop : tallestTop
          const [y1, y2] = p.box.y0 >= top ? [top, p.box.y0 - 2] : [p.box.y1 + 2, top]
          return <line key={p.id} x1={c.x} y1={y1} x2={c.x} y2={y2} stroke="var(--color-text-muted)" strokeWidth={0.8} pointerEvents="none" />
        })}
      </svg>
      {placed.map((p) => (
        <div
          key={p.id}
          aria-hidden="true"
          className="absolute pointer-events-none whitespace-nowrap"
          style={{
            // Paper behind the glyphs so the hover/focus outline and the
            // leaders pass under them (Day 4 precedent).
            left: p.box.x0 - 2,
            top: p.box.y0 - 2,
            width: p.box.x1 - p.box.x0 + 4,
            padding: 2,
            // The plate's own paper (PlateFrame), not the page's.
            background: 'var(--color-background-elevated, var(--color-background))',
            textAlign: p.align,
            fontFamily: MONO,
            fontSize: 11,
            lineHeight: `${ANNO_LINE_H}px`,
            color: 'var(--color-text-secondary)',
          }}
        >
          {annoText[p.id as string]?.[0]}
          <br />
          {annoText[p.id as string]?.[1]}
        </div>
      ))}
      </div>

      {narrowSet.length > 0 && (
        <ul className="mt-2 font-mono flex flex-wrap gap-x-4 gap-y-1" style={{ listStyle: 'none', padding: 0, fontSize: 13, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
          {narrowSet.map((d, i) => (
            <li key={d.row.sectorId} className="inline-flex items-center gap-1.5">
              <PlateIndexBadge n={i + 1} />
              {d.row.name} {(ownSpendShare(d.row) * 100).toFixed(0)}%
            </li>
          ))}
        </ul>
      )}
      {/* The plate's key: the floor and the three marks, declared once (D7b § Change 6). */}
      <p className="mt-2" style={{ fontFamily: '"EB Garamond", Georgia, serif', fontSize: 13.5, lineHeight: 1.45, color: 'var(--color-text-secondary)' }}>
        {lang === 'es'
          ? 'Las columnas de menos de 6px se ensanchan a un mínimo de 6px · ½ = la mitad del gasto propio del sector, observada · 80% = la línea de saturación del modelo · línea roja = la parte observada del gasto de cada sector.'
          : "Columns under 6px are widened to a 6px floor · ½ = half of the sector's own spend flagged · 80% = the model's saturation line · red waterline = each sector's flagged share of its own spend."}
      </p>
    </div>
  )
}

// ── Mobile rotated mesa ──────────────────────────────────────────────────────
function MobileMesa({
  rows,
  lang,
  readoutText,
  setHoverId,
}: {
  rows: LedgerRow[]
  lang: 'en' | 'es'
  readoutText: string
  setHoverId: (id: number | null) => void
}) {
  const totalSpend = rows.reduce((acc, r) => acc + r.totalMxn, 0)
  const rowW = 280
  const rows2 = rows.map((r) => {
    const spendShare = totalSpend > 0 ? r.totalMxn / totalSpend : 0
    const h = mobileRowH(r.totalMxn, totalSpend)
    return { row: r, h, spendShare }
  })
  return (
    <div>
      <div
        className="font-mono tabular-nums mb-2"
        style={{ minHeight: MOBILE_READOUT_H, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}
      >
        <span role="status" aria-live="polite">{readoutText}</span>
      </div>
      {/* Names the small right-hand figure on every row (the old circled-digit legend
          mapped to nothing here — rows carry their names). */}
      <div className="flex justify-end font-mono" style={{ height: MOBILE_HEADER_H, fontSize: 11, letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
        {lang === 'es' ? 'parte del gasto' : 'share of spend'}
      </div>
      <div>
        {rows2.map(({ row, h, spendShare }) => {
          const share = ownSpendShare(row)
          const critShare = row.totalMxn > 0 ? Math.max(0, Math.min(1, row.criticalMxn / row.totalMxn)) : 0
          const fill = sectorFill(row.sectorCode)
          const ariaLabel =
            lang === 'es'
              ? `${row.name} — ${formatCompactMXN(row.totalMxn)} de gasto, ${formatCompactMXN(row.varMxn)} observado (${(share * 100).toFixed(0)}% del gasto propio) · crítico ${(critShare * 100).toFixed(0)}% del valor · adjudicación directa ${row.daPct.toFixed(0)}%`
              : `${row.name} — ${formatCompactMXN(row.totalMxn)} spend, ${formatCompactMXN(row.varMxn)} flagged (${(share * 100).toFixed(0)}% of own spend) · critical ${(critShare * 100).toFixed(0)}% of value · direct award ${row.daPct.toFixed(0)}%`
          return (
            <EntityIdentityChip
              key={row.sectorId}
              type="sector"
              id={row.sectorId}
              name={row.name}
              variant="name"
              ariaLabel={ariaLabel}
              className="block focus-visible:ring-inset focus-visible:ring-accent"
              style={{ height: h, position: 'relative', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
              onMouseEnter={() => setHoverId(row.sectorId)}
              onMouseLeave={() => setHoverId(null)}
              onFocus={() => setHoverId(row.sectorId)}
              onBlur={() => setHoverId(null)}
            >
              <svg width="100%" height={h} style={{ display: 'block' }} preserveAspectRatio="none" viewBox={`0 0 ${rowW} ${h}`}>
                <defs>
                  <pattern id={`arqueo-m-fine-${row.sectorId}`} width={4} height={4} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                    <line x1={0} y1={0} x2={0} y2={4} stroke="var(--color-text-primary)" strokeOpacity={0.38} strokeWidth={1} />
                  </pattern>
                  <pattern id={`arqueo-m-dense-${row.sectorId}`} width={2} height={2} patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                    <line x1={0} y1={0} x2={0} y2={2} stroke="var(--color-text-primary)" strokeOpacity={0.5} strokeWidth={1} />
                  </pattern>
                </defs>
                <rect x={0} y={0} width={rowW * share} height={h} fill={`url(#arqueo-m-fine-${row.sectorId})`} />
                {/* dense hatch = critical only, as on the desktop plate and in the caption */}
                {critShare > 0 && <rect data-dense x={0} y={0} width={rowW * critShare} height={h} fill={`url(#arqueo-m-dense-${row.sectorId})`} />}
                {/* ½ vertical rule */}
                <line x1={rowW * 0.5} y1={0} x2={rowW * 0.5} y2={h} stroke={FLAG_RULE} strokeWidth={1} />
                <rect x={0} y={0} width={3} height={h} fill={fill} />
              </svg>
              <span
                className="absolute"
                style={{
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: '"EB Garamond", Georgia, serif',
                  fontStyle: 'normal',
                  fontWeight: 800,
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                }}
              >
                {row.name} · {(share * 100).toFixed(0)}%
              </span>
              <span
                className="absolute font-mono"
                style={{ right: 6, top: 2, fontSize: 11, color: 'var(--color-text-muted)' }}
              >
                {(spendShare * 100).toFixed(1)}%
              </span>
            </EntityIdentityChip>
          )
        })}
      </div>
    </div>
  )
}
