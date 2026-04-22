/**
 * RiskHorizon — small-multiples horizon chart.
 *
 * One row per sector, time on x. Each row shows the high-risk rate as
 * stacked positive bands (above baseline) in editorial red/amber. The
 * "horizon" trick: tall values are folded into multiple bands of the
 * same color, growing darker — so a single ~16px row can resolve a
 * 0–60% range without any axis tick growing taller than the row itself.
 *
 * Reads as a textile: faint amber threads where the system is calm,
 * crimson where it strains. Pure SVG, deterministic, no Recharts.
 */
import { useTranslation } from 'react-i18next'
import { HAIRLINE_STROKE, FONT_MONO, RISK_PALETTE } from '@/lib/editorial'

export interface RiskHorizonRow {
  /** Row label (e.g. "Salud", "Educación"). */
  label: string
  /** One value per time-step, 0..1 (high-risk rate). */
  values: number[]
}

interface RiskHorizonProps {
  rows: RiskHorizonRow[]
  /** Time-axis labels, one per value column (e.g. years). Optional. */
  xLabels?: string[]
  /** Max value for full saturation; values above fold into deeper bands. */
  bandMax?: number
  /** Number of horizon bands. */
  bands?: number
  rowHeight?: number
  labelWidth?: number
  width?: number
  className?: string
}

const DEFAULT_W = 720

export function RiskHorizon({
  rows,
  xLabels,
  bandMax = 0.15,
  bands = 3,
  rowHeight = 22,
  labelWidth = 110,
  width = DEFAULT_W,
  className,
}: RiskHorizonProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('es') ? 'es' : 'en'

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 px-6 text-center border border-border rounded-sm bg-background-card">
        <p className="text-sm text-text-muted">
          {lang === 'en' ? 'No risk data for this cohort.' : 'Sin datos de riesgo para esta cohorte.'}
        </p>
        <p className="text-[11px] text-text-muted mt-1">
          {lang === 'en'
            ? 'The horizon chart requires at least one row of annual values.'
            : 'El horizonte requiere al menos una fila de valores anuales.'}
        </p>
      </div>
    )
  }
  const cols = rows[0].values.length
  const plotW = width - labelWidth - 12
  const colW = plotW / cols
  const totalH = rows.length * rowHeight + 22

  // Each band represents bandMax / bands of value. A value v at position k
  // contributes to bands[0..ceil(v / bandStep) - 1].
  const bandStep = bandMax / bands
  const bandShades = [
    'rgba(245, 158, 11, 0.42)', // amber-500 @ 42%
    'rgba(239, 68, 68, 0.55)',  // red-500 @ 55%
    'rgba(190, 18, 60, 0.78)',  // rose-700 @ 78%
  ]

  return (
    <svg
      viewBox={`0 0 ${width} ${totalH}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="Risk horizon small-multiples"
      style={{ fontFamily: FONT_MONO }}
    >
      {rows.map((row, ri) => {
        const y0 = ri * rowHeight + 14
        const y1 = y0 + rowHeight - 4
        return (
          <g key={`row-${row.label}`}>
            {/* Label */}
            <text
              x={labelWidth - 6}
              y={y0 + (rowHeight - 4) / 2}
              fill="#a1a1aa"
              fontSize={10}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {row.label.slice(0, 16)}
            </text>
            {/* Hairline baseline */}
            <line
              x1={labelWidth}
              x2={labelWidth + plotW}
              y1={y1}
              y2={y1}
              stroke={HAIRLINE_STROKE}
              strokeWidth={1}
            />
            {/* Bands */}
            {row.values.map((v, xi) => {
              const x = labelWidth + xi * colW
              const w = colW - 0.5
              return Array.from({ length: bands }, (_, b) => {
                const lo = b * bandStep
                const hi = (b + 1) * bandStep
                const fill = Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
                if (fill <= 0) return null
                const h = (rowHeight - 6) * fill
                return (
                  <rect
                    key={`b-${ri}-${xi}-${b}`}
                    x={x}
                    y={y1 - h}
                    width={Math.max(1, w)}
                    height={h}
                    fill={bandShades[Math.min(b, bandShades.length - 1)]}
                  />
                )
              })
            })}
            {/* End-of-row value */}
            <text
              x={labelWidth + plotW + 6}
              y={y0 + (rowHeight - 4) / 2}
              fill={row.values[row.values.length - 1] > bandStep * 2 ? RISK_PALETTE.critical : '#a1a1aa'}
              fontSize={10}
              dominantBaseline="middle"
            >
              {(row.values[row.values.length - 1] * 100).toFixed(1)}%
            </text>
          </g>
        )
      })}
      {/* X labels (sparse) */}
      {xLabels && (
        <g>
          {[0, Math.floor(cols / 2), cols - 1].map((xi) => {
            if (!xLabels[xi]) return null
            const x = labelWidth + xi * colW + colW / 2
            return (
              <text
                key={`xl-${xi}`}
                x={x}
                y={totalH - 4}
                fill="#71717a"
                fontSize={10}
                textAnchor="middle"
              >
                {xLabels[xi]}
              </text>
            )
          })}
        </g>
      )}
    </svg>
  )
}

export default RiskHorizon
