/**
 * SpectralRegister — «LA PLACA» / "The Spectral Register".
 *
 * The single master plate: every federal buyer becomes one vertical stroke
 * on a 0–100 integrity axis (FT strip/barcode-plot family — NOT the banned
 * unit-count dot-grid; there is exactly zero <circle> in this file). Score
 * sets x-position; money-at-risk sets stroke height (sqrt ramp); tier sets
 * color. Top exposures get NYT-Upshot-style leader-lined callouts.
 *
 * Replaces (see institutions_fable_spec.md §3.3): HeroStatRail (caption
 * agate absorbs its three numbers), the standalone Exposure list section
 * (its top rows are now the plate's named annotations), and ScoreHistogram
 * (the stroke-field's ink density IS the distribution).
 *
 * Spec: institutions_fable_spec.md §3.1(I) · §4-P1.
 */
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { TIER_STYLES, gradeToTierKey, type TierKey } from '@/lib/tiers'
import { formatEntityName } from '@/lib/entity/format'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { placeLabels, fitLabel, type LabelBox } from '@/lib/plateLabels'
import { useMeasuredWidth, useFontsReady } from '@/hooks/useMeasuredWidth'
import type { LeagueFieldItem } from '@/hooks/useLeagueField'

interface SpectralRegisterProps {
  items: LeagueFieldItem[]
  median: number | null
  totalScored: number
  failingCount: number
}

// ── geometry ────────────────────────────────────────────────────────────────
const HEIGHT = 300
const PAD_L = 44
const PAD_R = 28
const BASELINE_Y = HEIGHT - 58 // room for the axis + band-name row below
const MAX_STROKE_H = 64
const MOBILE_BREAK = 640

// Callout labels are HTML over the svg (PARALLAX D9 § Change 4 — "HTML owns
// glyphs, SVG owns geometry"): measured with canvas in the face they render
// in, seated by placeLabels on real boxes, never a per-character estimate.
const LABEL_FONT = '11px "IBM Plex Mono", "JetBrains Mono", monospace'
const LABEL_FACES = ['11px "IBM Plex Mono"', '11px "EB Garamond"'] as const
const LABEL_LINE = 14
const LABEL_PAD = 2 // px of paper around the text
const LEADER_GAP = 8 // px between a stroke's top and its label
const NOTE_FONT = '11px "EB Garamond", Georgia, serif'

// The plate's 4 bands — boundaries at 40/60/80 only. There is no drawn
// Critico band: under the reformed absolute grading no federal buyer
// currently reaches the F/F- floor (institutions_fable_spec.md §3.1(I));
// the leftmost band (domainMin..40) is Deficiente territory in practice.
const BAND_STOPS: { from: number; to: number; tier: TierKey }[] = [
  { from: 0, to: 40, tier: 'Deficiente' },
  { from: 40, to: 60, tier: 'Regular' },
  { from: 60, to: 80, tier: 'Satisfactorio' },
  { from: 80, to: 100, tier: 'Excelente' },
]

interface PlacedStroke extends LeagueFieldItem {
  x: number
  h: number
  tierKey: TierKey
  color: string
}

interface Callout {
  stroke: PlacedStroke
  nameLines: string[]
  amount: string
  box: LabelBox
}

export function SpectralRegister({ items, median, totalScored, failingCount }: SpectralRegisterProps) {
  const { t, i18n } = useTranslation('institutionleague')
  const lang: 'en' | 'es' = i18n.language.startsWith('es') ? 'es' : 'en'
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const width = useMeasuredWidth(containerRef)
  const fontsReady = useFontsReady(LABEL_FACES)
  const [hoverId, setHoverId] = useState<number | null>(null)
  const emptyNote = t('plate.emptyExcelente')

  const isMobile = width < MOBILE_BREAK

  const layout = useMemo(() => {
    if (!items.length || width <= 0) return null

    const scores = items.map((i) => i.total_score)
    const domainMin = Math.floor(Math.min(...scores)) - 2
    const domainMax = 86
    const span = Math.max(1, domainMax - domainMin)
    const maxExposure = Math.max(...items.map((i) => i.money_at_risk_mxn ?? 0), 1)
    const innerW = Math.max(100, width - PAD_L - PAD_R)

    const xScale = (score: number) => PAD_L + ((score - domainMin) / span) * innerW

    const strokes: PlacedStroke[] = items.map((it) => {
      const money = it.money_at_risk_mxn ?? 0
      const h = Math.max(3, MAX_STROKE_H * Math.sqrt(money / maxExposure))
      const tierKey = gradeToTierKey(it.grade)
      return { ...it, x: xScale(it.total_score), h, tierKey, color: TIER_STYLES[tierKey].color }
    })

    // Named-outlier callouts (NYT Upshot mechanic): top by exposure, capped
    // at 8 (3 on phones). Full names on up to two lines (a wider column is
    // tried before a name is skipped), the amount on its own line; each label
    // tries three heights above its stroke before it gives way.
    const cap = isMobile ? 3 : 8
    const candidates = [...strokes]
      .filter((s) => (s.money_at_risk_mxn ?? 0) > 0)
      .sort((a, b) => (b.money_at_risk_mxn ?? 0) - (a.money_at_risk_mxn ?? 0))
      .slice(0, 12)
    const columns = isMobile ? [150, 200] : [200, 260]
    const bounds: LabelBox = { x0: 0, y0: isMobile ? 2 : 20, x1: width, y1: BASELINE_Y - 2 }
    const taken: LabelBox[] = []
    // The empty-Excellent note is svg text the callouts must not cover.
    if (!strokes.some((s) => s.tierKey === 'Excelente')) {
      const noteRight = xScale(Math.min(100, domainMax)) - 8
      const noteY = BASELINE_Y / 2 + 6
      const noteW = fitLabel(emptyNote, NOTE_FONT, 2000, { maxLines: 1 })?.width ?? emptyNote.length * 6
      taken.push({ x0: noteRight - noteW - 4, y0: noteY - 12, x1: noteRight + 2, y1: noteY + 4 })
    }
    const callouts: Callout[] = []
    for (const s of candidates) {
      if (callouts.length >= cap) break
      const name = formatEntityName('institution', s.institution_name, 'full')
      const amount = formatCompactMXN(s.money_at_risk_mxn ?? 0)
      let fitted = null
      for (const col of columns) {
        fitted = fitLabel(name, LABEL_FONT, col, { maxLines: 2, lineHeight: LABEL_LINE })
        if (fitted) break
      }
      if (!fitted) continue
      const amountW = fitLabel(amount, LABEL_FONT, 400, { maxLines: 1, lineHeight: LABEL_LINE })?.width ?? amount.length * 7
      const w = Math.max(fitted.width, amountW) + LABEL_PAD * 2
      const h = fitted.height + LABEL_LINE + LABEL_PAD * 2
      const top = BASELINE_Y - s.h
      for (const lift of [0, h + 6, 2 * (h + 6)]) {
        const [seat] = placeLabels(
          [{ id: s.institution_id, x: s.x, y: top, width: w, height: h, above: LEADER_GAP + lift }],
          taken,
          bounds,
        )
        if (seat) {
          taken.push(seat.box)
          callouts.push({ stroke: s, nameLines: fitted.lines, amount, box: seat.box })
          break
        }
      }
    }

    // Excelente (S+A) headcount — used to decide whether the >=80 band gets
    // the empty-band annotation.
    const excelenteCount = strokes.filter((s) => s.tierKey === 'Excelente').length

    return { strokes, callouts, domainMin, domainMax, xScale, maxExposure, excelenteCount, innerW }
    // fontsReady: re-measure once the label face has landed (Day 4 lesson).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, width, isMobile, fontsReady, emptyNote])

  const nearestStroke = useMemo(() => {
    if (!layout || hoverId == null) return null
    return layout.strokes.find((s) => s.institution_id === hoverId) ?? null
  }, [layout, hoverId])

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!layout) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    let closest: PlacedStroke | null = null
    let closestDist = Infinity
    for (const s of layout.strokes) {
      const d = Math.abs(s.x - px)
      if (d < closestDist) {
        closestDist = d
        closest = s
      }
    }
    if (closest && closestDist < 14) setHoverId(closest.institution_id)
    else setHoverId(null)
  }

  if (!items.length) return null

  const captionText = lang === 'en'
    ? `${formatNumber(totalScored)} federal institutions evaluated · median ${median != null ? median.toFixed(1) : '—'} · ${formatNumber(failingCount)} at Deficient or worse · stroke height = money at risk`
    : `${formatNumber(totalScored)} instituciones federales evaluadas · mediana ${median != null ? median.toFixed(1) : '—'} · ${formatNumber(failingCount)} en deficiencia o peor · altura del trazo = dinero en riesgo`

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

      {/* Plate header — mono eyebrow */}
      <div
        className="mb-3 flex items-center gap-2 flex-wrap"
        style={{
          fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontWeight: 400,
        }}
      >
        <span style={{ color: 'var(--color-accent-hover)', fontStyle: 'normal', fontWeight: 500 }}>
          {t('plate.eyebrow')}
        </span>
      </div>

      <div ref={containerRef} className="relative w-full" style={{ minHeight: HEIGHT }}>
        {layout && (() => {
          const { strokes, callouts, domainMin, domainMax, xScale, excelenteCount } = layout
          const ariaLabel = lang === 'en'
            ? `Spectral register: ${totalScored} federal institutions plotted by integrity score, ${domainMin} to ${domainMax} (further right is better). Stroke height is money at risk. Median score ${median != null ? median.toFixed(1) : 'unknown'}. ${failingCount} institutions operate at Deficient or worse. ${excelenteCount === 0 ? 'No institution reaches the Excellent band.' : `${excelenteCount} institutions reach the Excellent band.`}`
            : `Espectro del padrón: ${totalScored} instituciones federales trazadas por puntaje de integridad, de ${domainMin} a ${domainMax} (más a la derecha, mejor). La altura del trazo es el dinero en riesgo. Mediana ${median != null ? median.toFixed(1) : 'desconocida'}. ${failingCount} instituciones operan en deficiencia o peor. ${excelenteCount === 0 ? 'Ninguna institución alcanza la banda Excelente.' : `${excelenteCount} instituciones alcanzan la banda Excelente.`}`
          return (
          <>
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverId(null)}
          onClick={() => {
            if (nearestStroke) {
              navigate(`/institutions/${nearestStroke.institution_id}`, {
                state: { institutionName: nearestStroke.institution_name },
              })
            }
          }}
          style={{ cursor: nearestStroke ? 'pointer' : 'default', display: 'block' }}
        >
          {/* Band washes + boundary rules + labels */}
          {BAND_STOPS.map((band) => {
            const bandFrom = Math.max(band.from, domainMin)
            const bandTo = Math.min(band.to, domainMax)
            if (bandTo <= bandFrom) return null
            const x0 = xScale(bandFrom)
            const x1 = xScale(bandTo)
            const style = TIER_STYLES[band.tier]
            const isEmptyExcelente = band.tier === 'Excelente' && excelenteCount === 0
            return (
              <g key={band.tier}>
                <rect x={x0} y={16} width={Math.max(0, x1 - x0)} height={BASELINE_Y - 16} fill={style.bg} />
                {band.from > domainMin && (
                  <line
                    x1={x0}
                    x2={x0}
                    y1={16}
                    y2={BASELINE_Y}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                  />
                )}
                {!isMobile && (
                  <text
                    x={(x0 + x1) / 2}
                    y={12}
                    textAnchor="middle"
                    fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
                    fontSize={13}
                    fontWeight={700}
                    letterSpacing="0.1em"
                    fill={style.ink}
                    style={{ textTransform: 'uppercase' }}
                  >
                    {t(`tiers.${band.tier}`)}
                  </text>
                )}
                {isEmptyExcelente && (
                  <text
                    x={x1 - 8}
                    y={BASELINE_Y / 2 + 6}
                    textAnchor="end"
                    fontFamily='"EB Garamond", Georgia, serif'
                    fontStyle="normal"
                    fontSize={11}
                    fill="var(--color-text-muted)"
                  >
                    {emptyNote}
                  </text>
                )}
              </g>
            )
          })}

          {/* Baseline */}
          <line x1={PAD_L} x2={width - PAD_R} y1={BASELINE_Y} y2={BASELINE_Y} stroke="var(--color-border)" strokeWidth={1} />

          {/* Strokes — the register itself. Zero <circle> marks by design. */}
          {strokes.map((s) => {
            const isHover = s.institution_id === hoverId
            return (
              <line
                key={s.institution_id}
                x1={s.x}
                x2={s.x}
                y1={BASELINE_Y}
                y2={BASELINE_Y - s.h}
                stroke={s.color}
                strokeWidth={isMobile ? 1.75 : 1.25}
                opacity={isHover ? 0.95 : 0.55}
              />
            )
          })}

          {/* Median rule */}
          {median != null && (
            <g>
              <line
                x1={xScale(median)}
                x2={xScale(median)}
                y1={16}
                y2={BASELINE_Y}
                stroke="var(--color-accent)"
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.7}
              />
              <text
                x={xScale(median)}
                y={BASELINE_Y + 14}
                textAnchor="middle"
                fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
                fontSize={11}
                fontWeight={700}
                letterSpacing="0.08em"
                fill="var(--color-accent-hover)"
                paintOrder="stroke"
                stroke="var(--color-background-elevated)"
                strokeWidth={4}
                style={{ textTransform: 'uppercase' }}
              >
                {t('plate.medianTag', { score: median.toFixed(1) })}
              </text>
            </g>
          )}

          {/* Leader lines — the labels themselves are HTML (below the svg). */}
          {callouts.map(({ stroke: s, box }) => (
            <line
              key={`lead-${s.institution_id}`}
              x1={s.x}
              x2={s.x}
              y1={BASELINE_Y - s.h}
              y2={box.y1}
              stroke="var(--color-accent)"
              strokeWidth={0.75}
              opacity={0.5}
            />
          ))}

          {/* Axis ticks */}
          {[domainMin, 40, 60, 80, domainMax]
            .filter((v, idx, arr) => arr.indexOf(v) === idx)
            // a tick within 28px of the previous one is dropped (80/86 on phones)
            .filter((v, idx, arr) => idx === 0 || xScale(v) - xScale(arr[idx - 1]) >= 28)
            .map((tick) => (
            <text
              key={tick}
              x={xScale(tick)}
              y={BASELINE_Y + 28}
              textAnchor="middle"
              fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
              fontSize={13}
              fill="var(--color-text-muted)"
            >
              {tick}
            </text>
          ))}
        </svg>

        {/* Callout layer — full names, 11px, on plate paper. Each label is the
            plate's keyboard path: a link to that institution's dossier. */}
        <div className="absolute inset-0 pointer-events-none" style={{ width, height: HEIGHT }}>
          {callouts.map(({ stroke: s, nameLines, amount, box }) => (
            <Link
              key={`ann-${s.institution_id}`}
              to={`/institutions/${s.institution_id}`}
              aria-label={`${nameLines.join(' ')} · ${amount}`}
              data-callout
              className="absolute pointer-events-auto rounded-sm hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              style={{
                left: box.x0,
                top: box.y0,
                width: box.x1 - box.x0,
                padding: LABEL_PAD,
                font: LABEL_FONT,
                lineHeight: `${LABEL_LINE}px`,
                whiteSpace: 'nowrap',
                textAlign: s.x - box.x0 < 4 ? 'left' : box.x1 - s.x < 4 ? 'right' : 'center',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-background-elevated)',
              }}
            >
              {nameLines.map((line) => <span key={line} className="block">{line}</span>)}
              <span className="block tabular-nums text-text-muted">{amount}</span>
            </Link>
          ))}
        </div>
          </>
          )
        })()}

        {/* Pointer tooltip */}
        {nearestStroke && layout && (
          <div
            className="pointer-events-none absolute z-10 rounded-sm border border-border bg-background px-2.5 py-2 text-[13px] shadow-lg"
            style={{
              left: Math.min(Math.max(nearestStroke.x, 90), width - 90),
              top: 4,
              transform: 'translateX(-50%)',
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              minWidth: 170,
            }}
            role="status"
          >
            <p className="font-bold text-text-primary mb-0.5">
              {formatEntityName('institution', nearestStroke.institution_name, 'md')}
            </p>
            <p className="text-text-secondary">
              {t('plate.tooltipScore', { score: nearestStroke.total_score.toFixed(1) })} · {t(`tiers.${nearestStroke.tierKey}`)}
            </p>
            <p className="text-text-muted">
              {formatCompactMXN(nearestStroke.money_at_risk_mxn ?? 0)} · {t('plate.tooltipContracts', { n: formatNumber(nearestStroke.total_contracts ?? 0) })}
            </p>
          </div>
        )}
      </div>

      {/* Plate caption — serif agate line, absorbs the old HeroStatRail
          numbers + the ScoreHistogram median/total facts. */}
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
        {captionText}
      </figcaption>
    </figure>
  )
}

// ── Corner crop marks — folio plate chrome, built locally (no PlateFrame
// import — its lens/year props don't fit this surface). ──────────────────
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

// Honest scope-disclaimer note for subnational/all — the plate never
// renders tiny-sample or incomparable boards.
export function SpectralRegisterUnavailableNote({ scope }: { scope: 'subnational' | 'all' }) {
  const { t } = useTranslation('institutionleague')
  return (
    <div
      className="rounded-sm border border-border/60 bg-background-elevated/20 px-4 py-3 text-[13px] font-mono leading-relaxed text-text-muted"
    >
      {t(scope === 'subnational' ? 'plate.unavailableSubnational' : 'plate.unavailableAll')}
    </div>
  )
}
