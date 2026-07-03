/**
 * VendorPriceTrajectory — Ch.1 of "Volatilidad" story.
 *
 * Illustrative time-series of a single vendor's contract history.
 * X = signing date (2019-2022), Y = unit price (log scale, MXN),
 * dot size = total contract value. One outlier contract is ringed with
 * a callout: "MX$27M — 9× the category median, four months later."
 *
 * 2026-06-15: brought into the cream editorial system — wraps the SVG in
 * the shared `ChartCard` shell (same as every InlineChart) and recolors the
 * grid/axes/callout for the light background. Was a dark charcoal figure
 * inconsistent with the rest of the story's charts.
 *
 * Self-contained: hardcoded illustrative data, no live API call. The
 * "illustrative" caveat is carried honestly in the card annotation.
 */
import { useMemo } from 'react'
import { SECTOR_COLORS } from '@/lib/constants'
import { ChartCard } from './InlineCharts'

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

function fmtPrice(v: number): string {
  return `$${(v / 1_000_000).toFixed(0)}M`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VendorPriceTrajectory({ lang = 'es' }: Props) {
  // SVG layout constants
  const W  = 780
  const H  = 360
  const ML = 64   // margin left (Y-axis labels)
  const MR = 24
  const MT = 30
  const MB = 44   // margin bottom (X-axis labels)

  const xMin    = ML
  const xWidth  = W - ML - MR
  const yMin    = MT
  const yHeight = H - MT - MB

  const accent    = SECTOR_COLORS.salud          // #dc2626 (red — danger signal)
  const ghostFill = SECTOR_COLORS.otros          // #64748b (neutral dots)
  const gridStroke = 'var(--color-border)'
  const textMuted  = 'var(--color-text-muted)'

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
  const CALLOUT_W = 196
  const CALLOUT_H = 44
  const calloutX = outlierDot
    ? Math.min(outlierDot.cx - CALLOUT_W / 2, W - MR - CALLOUT_W)
    : 0
  const calloutY = outlierDot
    ? outlierDot.cy - outlierDot.r - CALLOUT_H - 10
    : 0

  const title = lang === 'es'
    ? 'Historial de contratos: distribuidor farmacéutico, IMSS 2019–2022'
    : 'Contract history: pharmaceutical distributor, IMSS 2019–2022'
  const zoneLabel = lang === 'es' ? 'Zona de precios esperada (±30%)' : 'Expected price zone (±30%)'
  const yKicker = lang === 'es' ? 'PRECIO UNITARIO (MXN) · ESCALA LOG' : 'UNIT PRICE (MXN) · LOG SCALE'
  const annotation = lang === 'es'
    ? 'Patrón ilustrativo de un solo proveedor — las proporciones reproducen las firmas observadas de price_volatility (SHAP). El tamaño del punto = valor total del contrato; la banda sombreada es la zona de precio esperada (±30% de la mediana de categoría). Un contrato salta a 9× la mediana en la misma categoría cuatro meses después.'
    : 'Illustrative single-vendor pattern — proportions reproduce the observed price_volatility (SHAP) signatures. Dot size = total contract value; the shaded band is the expected-price zone (±30% of the category median). One contract jumps to 9× the median in the same category four months later.'

  return (
    <ChartCard
      title={title}
      eyebrow="PRICE SCATTER · LOG MXN · 14 CONTRACTS"
      anchor={{
        value: '9×',
        label: lang === 'es' ? 'el atípico vs la mediana de categoría' : 'the outlier vs the category median',
        color: accent,
      }}
      annotation={annotation}
    >
      <div
        className="text-[13px] font-mono uppercase tracking-[0.06em] mb-1 pl-2"
        style={{ color: textMuted }}
      >
        {yKicker}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        aria-hidden="true"
      >
        {/* Expected price zone band */}
        <rect
          x={xMin}
          y={bandTop}
          width={xWidth}
          height={bandBottom - bandTop}
          fill="var(--color-text-muted)"
          fillOpacity={0.12}
        />
        <text
          x={xMin + 8}
          y={bandTop + 13}
          fontSize={13}
          fontFamily="monospace"
          fill="var(--color-text-muted)"
        >
          {zoneLabel}
        </text>

        {/* Y-axis log ticks */}
        {PRICE_TICKS.map(p => {
          const y = toLogY(p, yMin, yHeight)
          return (
            <g key={p}>
              <line x1={xMin - 4} y1={y} x2={xMin + xWidth} y2={y}
                stroke={gridStroke} strokeWidth={0.5} strokeDasharray="3 4" />
              <text x={xMin - 8} y={y + 4} fontSize={12} fontFamily="monospace"
                fill={textMuted} textAnchor="end">
                {fmtPrice(p)}
              </text>
            </g>
          )
        })}

        {/* X-axis year ticks */}
        {yearTicks.map(({ yr, x }) => (
          <g key={yr}>
            <line x1={x} y1={yMin} x2={x} y2={yMin + yHeight}
              stroke={gridStroke} strokeWidth={0.5} strokeDasharray="3 4" />
            <text x={x} y={yMin + yHeight + 18} fontSize={13} fontFamily="monospace"
              fill={textMuted} textAnchor="middle">
              {yr}
            </text>
          </g>
        ))}

        {/* Axis borders */}
        <line x1={xMin} y1={yMin} x2={xMin} y2={yMin + yHeight}
          stroke="var(--color-border)" strokeWidth={1} />
        <line x1={xMin} y1={yMin + yHeight} x2={xMin + xWidth} y2={yMin + yHeight}
          stroke="var(--color-border)" strokeWidth={1} />

        {/* Contract dots */}
        {dots.map(d => (
          <circle
            key={d.id}
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill={d.outlier ? accent : ghostFill}
            fillOpacity={d.outlier ? 0.92 : 0.5}
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
              fill="var(--color-background-card)"
              stroke={accent}
              strokeWidth={1}
            />
            <text
              x={calloutX + 10}
              y={calloutY + 17}
              fontSize={12}
              fontFamily="monospace"
              fontWeight="700"
              fill={accent}
            >
              {lang === 'es' ? 'MX$27M · PRECIO 9× SUPERIOR' : 'MX$27M · PRICE 9× HIGHER'}
            </text>
            <text
              x={calloutX + 10}
              y={calloutY + 33}
              fontSize={13}
              fontFamily="monospace"
              fill={textMuted}
            >
              {lang === 'es' ? 'misma categoría · jun 2020' : 'same category · jun 2020'}
            </text>
          </g>
        )}
      </svg>
    </ChartCard>
  )
}

export default VendorPriceTrajectory
