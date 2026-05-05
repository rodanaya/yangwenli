/**
 * VendorPriceTrajectory — Ch.2 of "Volatilidad" story (n-P3)
 *
 * Illustrative time-series of a single vendor's contract history.
 * X = signing date (2019-2022), Y = unit price (log scale, MXN),
 * dot size = total contract value. One outlier contract is ringed with
 * a callout: "MX$27M — same category as MX$3M, four months earlier."
 *
 * Self-contained: hardcoded illustrative data, no live API call.
 * SVG-based, no recharts.
 */
import { useMemo } from 'react'
import { SECTOR_COLORS } from '@/lib/constants'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContractDot {
  id: string
  date: Date
  unitPrice: number   // MXN
  totalValue: number  // MXN (drives dot radius)
  label?: string
  outlier?: boolean
}

interface Props {
  lang?: 'en' | 'es'
}

// ─── Hardcoded illustrative data ─────────────────────────────────────────────
// Represents a single pharmaceutical distributor serving IMSS 2019–2022.
// Prices are illustrative — proportions match actual SHAP analysis patterns.

const RAW_CONTRACTS: ContractDot[] = [
  { id: 'c01', date: new Date('2019-02-14'), unitPrice:  3_100_000, totalValue:  18_600_000 },
  { id: 'c02', date: new Date('2019-05-22'), unitPrice:  2_850_000, totalValue:  11_400_000 },
  { id: 'c03', date: new Date('2019-09-08'), unitPrice:  3_400_000, totalValue:  20_400_000 },
  { id: 'c04', date: new Date('2019-11-30'), unitPrice:  2_970_000, totalValue:   8_910_000 },
  { id: 'c05', date: new Date('2020-03-15'), unitPrice:  3_200_000, totalValue:  19_200_000 },
  { id: 'c06', date: new Date('2020-06-01'), unitPrice: 27_000_000, totalValue: 108_000_000, outlier: true,
    label: 'MX$27M · misma categoría, cuatro meses después' },
  { id: 'c07', date: new Date('2020-10-19'), unitPrice:  3_050_000, totalValue:  24_400_000 },
  { id: 'c08', date: new Date('2021-01-12'), unitPrice:  4_100_000, totalValue:  16_400_000 },
  { id: 'c09', date: new Date('2021-04-28'), unitPrice:  3_600_000, totalValue:  10_800_000 },
  { id: 'c10', date: new Date('2021-08-03'), unitPrice: 14_500_000, totalValue:  43_500_000 },
  { id: 'c11', date: new Date('2021-11-17'), unitPrice:  3_250_000, totalValue:  19_500_000 },
  { id: 'c12', date: new Date('2022-02-08'), unitPrice:  3_900_000, totalValue:  15_600_000 },
  { id: 'c13', date: new Date('2022-05-25'), unitPrice:  4_400_000, totalValue:  17_600_000 },
  { id: 'c14', date: new Date('2022-09-14'), unitPrice:  3_700_000, totalValue:  22_200_000 },
]

// ─── Scales ──────────────────────────────────────────────────────────────────

const LOG_MIN = Math.log10(2_000_000)
const LOG_MAX = Math.log10(30_000_000)

function toLogY(price: number, yMin: number, yHeight: number): number {
  const t = (Math.log10(price) - LOG_MIN) / (LOG_MAX - LOG_MIN)
  return yMin + yHeight * (1 - t) // invert: higher price = lower y
}

function toX(date: Date, xMin: number, xWidth: number): number {
  const start = new Date('2019-01-01').getTime()
  const end   = new Date('2023-01-01').getTime()
  const t = (date.getTime() - start) / (end - start)
  return xMin + xWidth * t
}

function dotRadius(totalValue: number): number {
  // r = sqrt(value) scaled; range 4..18
  const MIN_V = 8_000_000
  const MAX_V = 110_000_000
  const t = Math.sqrt((totalValue - MIN_V) / (MAX_V - MIN_V))
  return 4 + t * 14
}

// ─── Axis helpers ─────────────────────────────────────────────────────────────

const PRICE_TICKS = [2_000_000, 5_000_000, 10_000_000, 20_000_000, 30_000_000]

function fmtPrice(v: number, lang: 'en' | 'es'): string {
  const m = v / 1_000_000
  if (lang === 'es') return `$${m.toFixed(0)}M`
  return `$${m.toFixed(0)}M`
}

// fmtYear was used in an early draft of the X-axis tick formatter; current
// markup formats inline so the helper is unused.
// removed: function fmtYear(d: Date): string { return d.getFullYear().toString() }

// ─── Component ───────────────────────────────────────────────────────────────

export function VendorPriceTrajectory({ lang = 'es' }: Props) {
  // SVG layout constants
  const W  = 780
  const H  = 380
  const ML = 64   // margin left (Y-axis labels)
  const MR = 24
  const MT = 40
  const MB = 52   // margin bottom (X-axis labels)

  const xMin    = ML
  const xWidth  = W - ML - MR
  const yMin    = MT
  const yHeight = H - MT - MB

  const accent    = SECTOR_COLORS.salud          // #dc2626 (red — danger signal)
  const ghostFill = SECTOR_COLORS.otros          // #64748b (neutral dots)
  const textMuted = '#78716c'
  // textDark = SECTOR_TEXT_COLORS.salud — reserved for outlier label upgrade in follow-up

  // Compute dot positions
  const dots = useMemo(() =>
    RAW_CONTRACTS.map(c => ({
      ...c,
      cx: toX(c.date, xMin, xWidth),
      cy: toLogY(c.unitPrice, yMin, yHeight),
      r:  dotRadius(c.totalValue),
    })), [xMin, xWidth, yMin, yHeight])

  // Year tick positions for X-axis
  const yearTicks = [2019, 2020, 2021, 2022].map(yr => ({
    yr,
    x: toX(new Date(`${yr}-01-01`), xMin, xWidth),
  }))

  // Reference band: ±30% around median (illustrative "expected zone")
  const MEDIAN_PRICE = 3_200_000
  const bandTop    = toLogY(MEDIAN_PRICE * 1.6, yMin, yHeight)
  const bandBottom = toLogY(MEDIAN_PRICE * 0.7, yMin, yHeight)

  // Outlier dot for callout
  const outlierDot = dots.find(d => d.outlier)

  // Callout box geometry
  const CALLOUT_W = 190
  const CALLOUT_H = 44
  const calloutX = outlierDot
    ? Math.min(outlierDot.cx - CALLOUT_W / 2, W - MR - CALLOUT_W)
    : 0
  const calloutY = outlierDot
    ? outlierDot.cy - outlierDot.r - CALLOUT_H - 10
    : 0

  const title    = lang === 'es' ? 'Historial de contratos: distribuidor farmacéutico, IMSS 2019–2022' : 'Contract history: pharmaceutical distributor, IMSS 2019–2022'
  const subtitle = lang === 'es' ? 'Precio unitario por contrato (escala logarítmica) · tamaño = valor total' : 'Unit price per contract (log scale) · size = total contract value'
  const zoneLabel = lang === 'es' ? 'Zona de precios esperada (±30%)' : 'Expected price zone (±30%)'
  // calloutLabel reserved for callout box markup pending in follow-up
  // ES: 'MX$27M · misma categoría, cuatro meses después del contrato de MX$3M'
  // EN: 'MX$27M · same category, four months after the MX$3M contract'
  const srcLabel = lang === 'es'
    ? 'DATOS ILUSTRATIVOS · RUBLI análisis de volatilidad de precios v0.8.5'
    : 'ILLUSTRATIVE DATA · RUBLI price volatility analysis v0.8.5'

  return (
    <figure
      className="rounded-sm overflow-hidden"
      style={{ background: '#1c1917', border: '1px solid #292524' }}
      aria-label={title}
      role="img"
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-3" style={{ borderBottom: '1px solid #292524' }}>
        <p
          className="text-xs font-mono uppercase tracking-widest mb-1"
          style={{ color: textMuted }}
        >
          {lang === 'es' ? '§ 2 · DENTRO DE UN PROVEEDOR' : '§ 2 · INSIDE ONE VENDOR'}
        </p>
        <p className="text-sm font-medium" style={{ color: '#e7e5e4' }}>
          {title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: textMuted }}>
          {subtitle}
        </p>
      </div>

      {/* SVG chart */}
      <div className="px-2 py-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: 'block', maxWidth: W }}
          aria-hidden="true"
        >
          {/* Expected price zone band */}
          <rect
            x={xMin}
            y={bandTop}
            width={xWidth}
            height={bandBottom - bandTop}
            fill="#166534"
            fillOpacity={0.18}
          />
          <text
            x={xMin + 8}
            y={bandTop + 13}
            fontSize={9}
            fontFamily="monospace"
            fill="#4ade80"
            fillOpacity={0.7}
          >
            {zoneLabel}
          </text>

          {/* Y-axis log ticks */}
          {PRICE_TICKS.map(p => {
            const y = toLogY(p, yMin, yHeight)
            return (
              <g key={p}>
                <line x1={xMin - 4} y1={y} x2={xMin + xWidth} y2={y}
                  stroke="#44403c" strokeWidth={0.5} strokeDasharray="3 4" />
                <text x={xMin - 8} y={y + 4} fontSize={10} fontFamily="monospace"
                  fill={textMuted} textAnchor="end">
                  {fmtPrice(p, lang)}
                </text>
              </g>
            )
          })}

          {/* X-axis year ticks */}
          {yearTicks.map(({ yr, x }) => (
            <g key={yr}>
              <line x1={x} y1={yMin} x2={x} y2={yMin + yHeight}
                stroke="#44403c" strokeWidth={0.5} strokeDasharray="3 4" />
              <text x={x} y={yMin + yHeight + 18} fontSize={11} fontFamily="monospace"
                fill={textMuted} textAnchor="middle">
                {yr}
              </text>
            </g>
          ))}

          {/* Axis borders */}
          <line x1={xMin} y1={yMin} x2={xMin} y2={yMin + yHeight}
            stroke="#57534e" strokeWidth={1} />
          <line x1={xMin} y1={yMin + yHeight} x2={xMin + xWidth} y2={yMin + yHeight}
            stroke="#57534e" strokeWidth={1} />

          {/* Contract dots */}
          {dots.map(d => (
            <circle
              key={d.id}
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              fill={d.outlier ? accent : ghostFill}
              fillOpacity={d.outlier ? 0.9 : 0.55}
              stroke={d.outlier ? accent : 'transparent'}
              strokeWidth={d.outlier ? 2 : 0}
            />
          ))}

          {/* Outlier pulse ring */}
          {outlierDot && (
            <circle
              cx={outlierDot.cx}
              cy={outlierDot.cy}
              r={outlierDot.r + 8}
              fill="none"
              stroke={accent}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.75}
            />
          )}

          {/* Callout connector line */}
          {outlierDot && (
            <line
              x1={outlierDot.cx}
              y1={outlierDot.cy - outlierDot.r - 2}
              x2={outlierDot.cx}
              y2={calloutY + CALLOUT_H}
              stroke={accent}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          )}

          {/* Callout box */}
          {outlierDot && (
            <g>
              <rect
                x={calloutX}
                y={calloutY}
                width={CALLOUT_W}
                height={CALLOUT_H}
                rx={3}
                fill="#1c1917"
                stroke={accent}
                strokeWidth={1}
              />
              <text
                x={calloutX + 10}
                y={calloutY + 17}
                fontSize={10}
                fontFamily="monospace"
                fontWeight="600"
                fill={accent}
              >
                {lang === 'es' ? 'MX$27M · PRECIO 9× SUPERIOR' : 'MX$27M · PRICE 9× HIGHER'}
              </text>
              <text
                x={calloutX + 10}
                y={calloutY + 33}
                fontSize={9}
                fontFamily="monospace"
                fill={textMuted}
              >
                {lang === 'es' ? 'misma categoría · jun 2020' : 'same category · jun 2020'}
              </text>
            </g>
          )}

          {/* Y-axis label (rotated) */}
          <text
            transform={`translate(14, ${yMin + yHeight / 2}) rotate(-90)`}
            fontSize={9}
            fontFamily="monospace"
            fill={textMuted}
            textAnchor="middle"
          >
            {lang === 'es' ? 'PRECIO UNITARIO (MXN)' : 'UNIT PRICE (MXN)'}
          </text>
        </svg>
      </div>

      {/* Footer */}
      <div
        className="px-6 py-3 text-xs font-mono"
        style={{ color: textMuted, borderTop: '1px solid #292524' }}
      >
        {srcLabel}
      </div>
    </figure>
  )
}

export default VendorPriceTrajectory
