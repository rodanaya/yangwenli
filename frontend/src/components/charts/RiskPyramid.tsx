import { useTranslation } from 'react-i18next'

interface PyramidRow {
  level: string
  label: string
  pctContracts: number
  pctValue: number
  contracts: number
  billions: number
  color: string
  description: string
}

const PYRAMID_DATA: PyramidRow[] = [
  { level: 'critical', label: 'Critical Risk', pctContracts: 6.0,  pctValue: 41.8, contracts: 184031,  billions: 4147.04, color: '#f87171', description: '≥0.60 score' },
  { level: 'high',     label: 'High Risk',     pctContracts: 7.5,  pctValue: 6.1,  contracts: 228814,  billions: 602.88,  color: '#fb923c', description: '0.40–0.60' },
  { level: 'medium',   label: 'Medium Risk',   pctContracts: 26.8, pctValue: 13.9, contracts: 821251,  billions: 1380.64, color: '#fbbf24', description: '0.25–0.40' },
  { level: 'low',      label: 'Low Risk',      pctContracts: 59.4, pctValue: 38.2, contracts: 1817198, billions: 3797.00, color: '#4ade80', description: '<0.25 score' },
]

// ── Dot matrix parameters ──────────────────────────────────────────────────────
const DOT_R        = 2.2
const DOT_SPACING  = 5.5   // center-to-center
const DOT_TOTAL    = 48    // dots per row per side (each dot ≈ 2% of the metric)
const LEFT_PAD     = 30    // room for left % label
const RIGHT_PAD    = 30
const CENTER_W     = 90    // width of center label zone
const PANEL_SPAN   = DOT_R * 2 + (DOT_TOTAL - 1) * DOT_SPACING   // ≈ 261

const SVG_W = LEFT_PAD + PANEL_SPAN + CENTER_W + PANEL_SPAN + RIGHT_PAD  // ≈ 641
const PAD_T = 26   // room for column header text
const ROW_H = 30
const SVG_H = PAD_T + 4 * ROW_H + 14   // ≈ 160

const LEFT_DOT0_CX  = LEFT_PAD + DOT_R                              // first left dot cx
const CENTER_X      = LEFT_PAD + PANEL_SPAN + CENTER_W / 2          // label zone center
const RIGHT_DOT0_CX = LEFT_PAD + PANEL_SPAN + CENTER_W + DOT_R      // first right dot cx
const RIGHT_LAST_CX = RIGHT_DOT0_CX + (DOT_TOTAL - 1) * DOT_SPACING

export function RiskPyramid() {
  const { t } = useTranslation('procurement')

  return (
    <div className="space-y-4">

      {/* dot matrix SVG */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Risk distribution dot matrix: left panel shows share of contract count, right panel shows share of contract value, per risk tier."
      >
        {/* column headers */}
        <text x={LEFT_PAD + PANEL_SPAN / 2} y={13} textAnchor="middle"
              fill="#71717a" fontSize={7.5} fontFamily="monospace" letterSpacing="0.06em">
          CONTRACT COUNT
        </text>
        <text x={LEFT_PAD + PANEL_SPAN / 2} y={21} textAnchor="middle"
              fill="#3f3f46" fontSize={6} fontFamily="monospace">
          each dot ≈ 2 pct of contracts
        </text>
        <text x={LEFT_PAD + PANEL_SPAN + CENTER_W + PANEL_SPAN / 2} y={13} textAnchor="middle"
              fill="#71717a" fontSize={7.5} fontFamily="monospace" letterSpacing="0.06em">
          CONTRACT VALUE
        </text>
        <text x={LEFT_PAD + PANEL_SPAN + CENTER_W + PANEL_SPAN / 2} y={21} textAnchor="middle"
              fill="#3f3f46" fontSize={6} fontFamily="monospace">
          each dot ≈ 2 pct of total MXN
        </text>

        {/* rows */}
        {PYRAMID_DATA.map((d, ri) => {
          const rowY      = PAD_T + ri * ROW_H
          const leftFill  = Math.round((d.pctContracts / 100) * DOT_TOTAL)
          const rightFill = Math.round((d.pctValue     / 100) * DOT_TOTAL)

          return (
            <g key={d.level}>
              {/* left dots — right-aligned fill (pyramid narrows at top) */}
              {Array.from({ length: DOT_TOTAL }, (_, i) => {
                const filled = i >= DOT_TOTAL - leftFill
                return (
                  <circle
                    key={i}
                    cx={LEFT_DOT0_CX + i * DOT_SPACING}
                    cy={rowY}
                    r={DOT_R}
                    fill={filled ? d.color : '#2d2926'}
                    stroke={filled ? undefined : '#3d3734'}
                    strokeWidth={filled ? 0 : 0.5}
                    fillOpacity={filled ? 0.88 : 0.32}
                  />
                )
              })}

              {/* left % label */}
              <text x={LEFT_PAD - 4} y={rowY + 4} textAnchor="end"
                    fill={d.color} fontSize={7} fontFamily="monospace" opacity={0.85}>
                {d.pctContracts}%
              </text>

              {/* center label pill */}
              <rect
                x={LEFT_PAD + PANEL_SPAN + 6} y={rowY - 10}
                width={CENTER_W - 12} height={20}
                fill={d.color} fillOpacity={0.12} rx={10}
              />
              <text x={CENTER_X} y={rowY - 2} textAnchor="middle"
                    fill="#52525b" fontSize={5.5} fontFamily="monospace">
                {d.description}
              </text>
              <text x={CENTER_X} y={rowY + 7} textAnchor="middle"
                    fill={d.color} fontSize={8} fontFamily="monospace" fontWeight="bold">
                {d.level.toUpperCase()}
              </text>

              {/* right dots — left-aligned fill (value concentration visible) */}
              {Array.from({ length: DOT_TOTAL }, (_, i) => {
                const filled = i < rightFill
                return (
                  <circle
                    key={i}
                    cx={RIGHT_DOT0_CX + i * DOT_SPACING}
                    cy={rowY}
                    r={DOT_R}
                    fill={filled ? d.color : '#2d2926'}
                    stroke={filled ? undefined : '#3d3734'}
                    strokeWidth={filled ? 0 : 0.5}
                    fillOpacity={filled ? 0.88 : 0.32}
                  />
                )
              })}

              {/* right % label */}
              <text x={RIGHT_LAST_CX + 6} y={rowY + 4} textAnchor="start"
                    fill={d.color} fontSize={7} fontFamily="monospace" opacity={0.85}>
                {d.pctValue}%
              </text>
            </g>
          )
        })}
      </svg>

      {/* stats cards */}
      <div className="grid grid-cols-4 gap-3">
        {PYRAMID_DATA.map(d => (
          <div key={d.level} className="rounded-lg p-3 bg-surface-elevated border border-border text-center space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: d.color }}>
              {d.label}
            </div>
            <div className="text-base font-bold text-text-primary">{d.pctValue}%</div>
            <div className="text-[10px] text-text-muted">of total value</div>
            <div className="text-[10px] text-text-muted border-t border-border/50 pt-1 mt-1">
              {d.billions.toLocaleString('en-MX', { maximumFractionDigits: 0 })}B MXN
            </div>
          </div>
        ))}
      </div>

      {/* callout */}
      <div className="rounded-lg border border-risk-critical/30 bg-risk-critical/5 p-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          {t('risk_pyramid.callout')}
        </p>
      </div>
    </div>
  )
}
