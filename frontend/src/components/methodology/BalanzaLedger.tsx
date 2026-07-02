/**
 * BalanzaLedger — «La Balanza» (the evidentiary balance), Part II centerpiece
 * of /methodology's «El Dictamen» redesign.
 *
 * Named precedent: FT Visual Vocabulary *diverging bar* — signed effects on a
 * shared zero spine — rendered in engraving vocabulary (45° hatch bands,
 * terminal ticks, ruled rows), not SaaS bars. Replaces the banned dot-matrix
 * `CoefficientChart` (18 animated circles). Zero <circle> elements here.
 *
 * v0.8.5 · Run CAL-v8-202605020212 · C=0.2243, l1_ratio=0.7545, c_pu=0.32 —
 * values load-bearing; do not round or reorder signs.
 *
 * Design spec: .claude/designs/methodology-fable-2026-07-02-spec.md §4.1
 */

import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { PlateFrame } from '@/components/atlas/PlateFrame'
import { RISK_COLORS } from '@/lib/constants'

// ── Data — the 18 v0.8.5 coefficients, exact signs and 3-decimal values ────
// Mirror of the page's (retired) V6_COEFFICIENTS. Sorted below by |β| desc
// for the ledger field; the six zeros render in the morgue sub-register.
interface Coefficient {
  key: string
  beta: number
}

const COEFFICIENTS: Coefficient[] = [
  { key: 'priceVolatility', beta: 0.558 },
  { key: 'institutionDiversity', beta: -0.388 },
  { key: 'priceRatio', beta: 0.358 },
  { key: 'vendorConcentration', beta: 0.327 },
  { key: 'cobidHerfindahl', beta: 0.272 },
  { key: 'recencyZ', beta: -0.247 },
  { key: 'amountResidualZ', beta: -0.187 },
  { key: 'networkMembers', beta: 0.166 },
  { key: 'amendmentFlag', beta: 0.102 },
  { key: 'adPeriodDays', beta: 0.090 },
  { key: 'directAward', beta: -0.081 },
  { key: 'pubDelayZ', beta: -0.055 },
  { key: 'sameDayContracts', beta: 0.0 },
  { key: 'winRate', beta: 0.0 },
  { key: 'singleBid', beta: 0.0 },
  { key: 'sectorSpread', beta: 0.0 },
  { key: 'coBidRate', beta: 0.0 },
  { key: 'priceHypConfidence', beta: 0.0 },
]

const NONZERO = COEFFICIENTS.filter((c) => c.beta !== 0).sort(
  (a, b) => Math.abs(b.beta) - Math.abs(a.beta),
)
const ZEROED = COEFFICIENTS.filter((c) => c.beta === 0)

const AXIS_MAX = 0.60
const INK_SECONDARY = 'var(--color-text-secondary)'
const CHARGE_COLOR = RISK_COLORS.high // #f59e0b — the "charge" (positive) hatch

// Format a signed beta with a TRUE minus sign and three decimals.
function formatBeta(v: number): string {
  const abs = Math.abs(v).toFixed(3)
  if (v > 0) return `+${abs}`
  if (v < 0) return `−${abs}` // U+2212 minus sign
  return '0.000'
}

// ── HatchBar — small reusable hatch-band bar, exported for Annex B ─────────
export interface HatchBarProps {
  value: number
  max: number
  color: string
  /** bar height in px, default 8 */
  height?: number
}

/** A single fixed-height SVG hatch band, width scaled to value/max. No text. */
export function HatchBar({ value, max, color, height = 8 }: HatchBarProps) {
  const patternId = `hatchbar-${color.replace('#', '')}-${useId().replace(/:/g, '')}`
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  const widthPct = pct * 100
  return (
    <svg
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={patternId}
          width={3}
          height={3}
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <rect width={3} height={3} fill={color} fillOpacity={0.16} />
          <line x1={0} y1={0} x2={0} y2={3} stroke={color} strokeWidth={1.4} />
        </pattern>
      </defs>
      <rect x={0} y={1} width={widthPct} height={8} fill={`url(#${patternId})`} />
      <rect x={0} y={1} width={widthPct} height={8} fill="none" stroke={color} strokeOpacity={0.55} strokeWidth={0.5} />
      {widthPct > 0 && (
        <rect x={Math.max(0, widthPct - 0.6)} y={0} width={0.8} height={10} fill={color} />
      )}
    </svg>
  )
}

// ── Ledger geometry (SVG coordinates) ───────────────────────────────────────
const FIELD_W = 720
const GUTTER_W = 152
const HALF_W = (FIELD_W - GUTTER_W) / 2
const SPINE_X = GUTTER_W + HALF_W
const ROW_H = 26
const FIELD_TOP = 40
const FIELD_BOTTOM = FIELD_TOP + NONZERO.length * ROW_H
const AXIS_Y = FIELD_BOTTOM + 26
const MORGUE_TOP = AXIS_Y + 34
const MORGUE_ROW_H = 18
const MORGUE_BOTTOM = MORGUE_TOP + ZEROED.length * MORGUE_ROW_H + 10
const SVG_H = MORGUE_BOTTOM + 16

function xFor(beta: number): number {
  const clamped = Math.max(-AXIS_MAX, Math.min(AXIS_MAX, beta))
  return SPINE_X + (clamped / AXIS_MAX) * HALF_W
}

// Ticks for the symmetric axis −0.60…+0.60, labeled at the spec'd intervals.
const AXIS_TICKS = [-0.4, -0.2, 0, 0.2, 0.4]

// Margin annotation anchors — desktop only.
const ANNOTATIONS: Array<{ key: string; en: string; es: string; morgue?: boolean }> = [
  {
    key: 'priceVolatility',
    en: 'Strongest signal: vendors whose contract sizes swing wildly.',
    es: 'La señal más fuerte: proveedores cuyos montos oscilan violentamente.',
  },
  {
    key: 'institutionDiversity',
    en: 'Strongest defense: selling to many different buyers.',
    es: 'La defensa más fuerte: venderle a muchos compradores distintos.',
  },
  {
    key: 'singleBid',
    en: 'Single bidding — the classic OECD red flag — carries zero weight in this ground truth.',
    es: 'La licitación única — la bandera roja clásica de la OCDE — pesa cero en esta verdad fundamental.',
    morgue: true,
  },
]

export function BalanzaLedger({ className }: { className?: string }) {
  const { t, i18n } = useTranslation('methodology')
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'

  const headline =
    lang === 'en'
      ? 'Price volatility accuses. Institutional diversity defends.'
      : 'La volatilidad de precios acusa. La diversidad institucional defiende.'
  const dek =
    lang === 'en'
      ? '18 features · 12 carry weight · 6 regularized to exactly zero'
      : '18 características · 12 cargan peso · 6 reguladas a exactamente cero'
  const colLeft = lang === 'en' ? 'DEFENSE — LOWERS THE INDICATOR' : 'DESCARGO — REDUCE EL INDICADOR'
  const colRight = lang === 'en' ? 'CHARGE — RAISES THE INDICATOR' : 'CARGO — ELEVA EL INDICADOR'
  const axisCaption = lang === 'en' ? 'ElasticNet coefficient β' : 'Coeficiente ElasticNet β'
  const morgueLabel =
    lang === 'en'
      ? 'REGULARIZED TO EXACTLY ZERO — NO SIGNAL'
      : 'REGULADAS A EXACTAMENTE CERO — SIN SEÑAL'
  const plateCaption =
    lang === 'en'
      ? 'Plate II — the eighteen coefficients of model v0.8.5, drawn as a ledger of charge and defense. Hatching right of the spine raises the risk indicator; left of the spine lowers it.'
      : 'Lámina II — los dieciocho coeficientes del modelo v0.8.5, dibujados como libro de cargo y descargo. El rayado a la derecha del eje eleva el indicador de riesgo; a la izquierda lo reduce.'
  const ariaLabel =
    lang === 'en'
      ? 'Diverging ledger of the 18 model coefficients: positive values raise the risk indicator, negative values lower it'
      : 'Libro de cargos y descargos: los 18 coeficientes del modelo; valores positivos elevan el indicador de riesgo, negativos lo reducen'

  const annotationByKey = (key: string) => ANNOTATIONS.find((a) => a.key === key)

  return (
    <div className={className}>
      <PlateFrame
        lang={lang}
        folio="II"
        contextLabel={{ en: 'The evidentiary balance', es: 'La balanza probatoria' }}
        caption={plateCaption}
      >
        {/* Plate headline + dek */}
        <div className="mb-4">
          <h3
            className="text-text-primary"
            style={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(19px, 2.6vw, 24px)',
              lineHeight: 1.25,
            }}
          >
            {headline}
          </h3>
          <p
            className="mt-1.5 text-text-muted"
            style={{
              fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
              fontSize: '11px',
              letterSpacing: '0.02em',
            }}
          >
            {dek}
          </p>
        </div>

        <figure aria-label={ariaLabel}>
          <svg
            viewBox={`0 0 ${FIELD_W} ${SVG_H}`}
            className="w-full h-auto"
            role="img"
            aria-label={ariaLabel}
          >
            <defs>
              <pattern
                id="balanza-charge-hatch"
                width={3}
                height={3}
                patternTransform="rotate(45)"
                patternUnits="userSpaceOnUse"
              >
                <rect width={3} height={3} fill={CHARGE_COLOR} fillOpacity={0.16} />
                <line x1={0} y1={0} x2={0} y2={3} stroke={CHARGE_COLOR} strokeWidth={1.4} />
              </pattern>
              <pattern
                id="balanza-defense-hatch"
                width={3}
                height={3}
                patternTransform="rotate(45)"
                patternUnits="userSpaceOnUse"
              >
                <rect width={3} height={3} fill={INK_SECONDARY} fillOpacity={0.14} />
                <line x1={0} y1={0} x2={0} y2={3} stroke={INK_SECONDARY} strokeWidth={1.4} />
              </pattern>
            </defs>

            {/* Column heads */}
            <text
              x={GUTTER_W}
              y={20}
              fill={INK_SECONDARY}
              fontSize={9.5}
              fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
              fontWeight={600}
              letterSpacing="0.14em"
            >
              {colLeft}
            </text>
            <text
              x={FIELD_W}
              y={20}
              fill={CHARGE_COLOR}
              fontSize={9.5}
              fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
              fontWeight={600}
              letterSpacing="0.14em"
              textAnchor="end"
            >
              {colRight}
            </text>

            {/* Zero spine */}
            <line
              x1={SPINE_X}
              y1={FIELD_TOP - 6}
              x2={SPINE_X}
              y2={FIELD_BOTTOM + 6}
              stroke="var(--color-text-primary)"
              strokeWidth={1.5}
            />

            {/* Ledger field — 12 non-zero rows */}
            {NONZERO.map((c, i) => {
              const rowY = FIELD_TOP + i * ROW_H
              const rowMidY = rowY + ROW_H / 2
              const barY = rowMidY - 4
              const x = xFor(c.beta)
              const isPositive = c.beta > 0
              const barX = isPositive ? SPINE_X : x
              const barW = Math.abs(x - SPINE_X)
              const fill = isPositive ? 'url(#balanza-charge-hatch)' : 'url(#balanza-defense-hatch)'
              const strokeColor = isPositive ? CHARGE_COLOR : INK_SECONDARY
              const label = t(`featureNames.${c.key}`)
              const annotation = annotationByKey(c.key)
              return (
                <g key={c.key}>
                  {/* row rule */}
                  <line
                    x1={0}
                    y1={rowY + ROW_H}
                    x2={FIELD_W}
                    y2={rowY + ROW_H}
                    stroke="var(--color-border)"
                    strokeWidth={0.75}
                  />
                  {/* feature name in the left gutter */}
                  <text
                    x={0}
                    y={rowMidY + 3.5}
                    fill="var(--color-text-primary)"
                    fontSize={10.5}
                    fontFamily='"JetBrains Mono", "IBM Plex Mono", monospace'
                  >
                    {label}
                  </text>
                  {/* hatch band */}
                  <rect x={barX} y={barY} width={Math.max(barW, 0.5)} height={8} fill={fill} />
                  <rect
                    x={barX}
                    y={barY}
                    width={Math.max(barW, 0.5)}
                    height={8}
                    fill="none"
                    stroke={strokeColor}
                    strokeOpacity={0.55}
                    strokeWidth={0.5}
                  />
                  {/* terminal tick */}
                  <rect
                    x={x - 0.75}
                    y={barY - 1}
                    width={1.5}
                    height={10}
                    fill={strokeColor}
                  />
                  {/* exact signed value at terminal */}
                  <text
                    x={isPositive ? x + 6 : x - 6}
                    y={rowMidY + 3.5}
                    fill={strokeColor}
                    fontSize={10}
                    fontWeight={600}
                    fontFamily='"JetBrains Mono", "IBM Plex Mono", monospace'
                    textAnchor={isPositive ? 'start' : 'end'}
                    className="tabular-nums"
                  >
                    {formatBeta(c.beta)}
                  </text>
                  {/* margin annotation — desktop only */}
                  {annotation && (
                    <g className="hidden sm:block">
                      <line
                        x1={isPositive ? x + 46 : x - 46}
                        y1={rowMidY}
                        x2={isPositive ? FIELD_W - 4 : 4}
                        y2={rowY - 8}
                        stroke="var(--color-border)"
                        strokeWidth={0.75}
                      />
                      <text
                        x={isPositive ? FIELD_W - 4 : 4}
                        y={rowY - 12}
                        fill="var(--color-text-secondary)"
                        fontSize={12.5}
                        fontStyle="italic"
                        fontFamily='"EB Garamond", Georgia, serif'
                        textAnchor={isPositive ? 'end' : 'start'}
                      >
                        <tspan x={isPositive ? FIELD_W - 4 : 4} dy={0}>
                          {(lang === 'en' ? annotation.en : annotation.es).length > 58
                            ? `${(lang === 'en' ? annotation.en : annotation.es).slice(0, 58)}…`
                            : lang === 'en'
                              ? annotation.en
                              : annotation.es}
                        </tspan>
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {/* Axis */}
            <line x1={0} y1={AXIS_Y - 10} x2={FIELD_W} y2={AXIS_Y - 10} stroke="var(--color-border)" strokeWidth={0.75} />
            {AXIS_TICKS.map((tick) => {
              const x = xFor(tick)
              return (
                <g key={tick}>
                  <line x1={x} y1={AXIS_Y - 14} x2={x} y2={FIELD_TOP - 6} stroke="var(--color-border)" strokeWidth={0.5} strokeDasharray="1.5 3" />
                  <text
                    x={x}
                    y={AXIS_Y}
                    fill="var(--color-text-muted)"
                    fontSize={9}
                    fontFamily='"JetBrains Mono", "IBM Plex Mono", monospace'
                    textAnchor="middle"
                    className="tabular-nums"
                  >
                    {tick > 0 ? `+${tick.toFixed(1)}` : tick < 0 ? `−${Math.abs(tick).toFixed(1)}` : '0'}
                  </text>
                </g>
              )
            })}
            <text
              x={FIELD_W / 2}
              y={AXIS_Y + 14}
              fill="var(--color-text-muted)"
              fontSize={9}
              fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
              textAnchor="middle"
            >
              {axisCaption}
            </text>

            {/* Zero morgue */}
            <line x1={0} y1={MORGUE_TOP - 14} x2={FIELD_W} y2={MORGUE_TOP - 14} stroke="var(--color-text-primary)" strokeWidth={1} />
            <text
              x={0}
              y={MORGUE_TOP - 2}
              fill="var(--color-text-muted)"
              fontSize={9.5}
              fontWeight={600}
              letterSpacing="0.1em"
              fontFamily='"IBM Plex Mono", "JetBrains Mono", monospace'
            >
              {morgueLabel}
            </text>
            {ZEROED.map((c, i) => {
              const rowY = MORGUE_TOP + 10 + i * MORGUE_ROW_H
              const label = t(`featureNames.${c.key}`)
              const annotation = annotationByKey(c.key)
              return (
                <g key={c.key}>
                  <text
                    x={0}
                    y={rowY + 4}
                    fill="var(--color-text-muted)"
                    fontSize={10}
                    fontFamily='"JetBrains Mono", "IBM Plex Mono", monospace'
                  >
                    {label}
                  </text>
                  <rect x={SPINE_X - 3} y={rowY} width={6} height={1.5} fill="var(--color-text-muted)" />
                  <text
                    x={FIELD_W}
                    y={rowY + 4}
                    fill="var(--color-text-muted)"
                    fontSize={10}
                    fontFamily='"JetBrains Mono", "IBM Plex Mono", monospace'
                    textAnchor="end"
                    className="tabular-nums"
                  >
                    β = 0.000
                  </text>
                  {annotation?.morgue && (
                    <g className="hidden sm:block">
                      <line
                        x1={SPINE_X + 46}
                        y1={rowY}
                        x2={FIELD_W - 4}
                        y2={rowY - 10}
                        stroke="var(--color-border)"
                        strokeWidth={0.75}
                      />
                      <text
                        x={FIELD_W - 4}
                        y={rowY - 14}
                        fill="var(--color-text-secondary)"
                        fontSize={12.5}
                        fontStyle="italic"
                        fontFamily='"EB Garamond", Georgia, serif'
                        textAnchor="end"
                      >
                        {lang === 'en' ? annotation.en : annotation.es}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </figure>

        {/* Footer note — existing key, verbatim, both locales */}
        <p
          className="mt-3 text-text-muted"
          style={{
            fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
            fontSize: '10px',
            lineHeight: 1.6,
          }}
        >
          {t('body.features.footerNote')}
        </p>
      </PlateFrame>
    </div>
  )
}

export default BalanzaLedger
