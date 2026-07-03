/**
 * MonthlySpendingChart — Pure SVG dot-matrix strips.
 *
 * 12 months of federal spending (Ene→Dic), values in B MXN.
 * Each dot = 1.6B MXN; 50 dots max represent 80B.
 * Colors: muted gray for Jan-Sep, orange escalating for Oct-Nov, red for Dec.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface MonthRow {
  mes: string
  value: number
}

const DATA: MonthRow[] = [
  { mes: 'Ene', value: 42 },
  { mes: 'Feb', value: 38 },
  { mes: 'Mar', value: 45 },
  { mes: 'Abr', value: 41 },
  { mes: 'May', value: 44 },
  { mes: 'Jun', value: 46 },
  { mes: 'Jul', value: 43 },
  { mes: 'Ago', value: 51 },
  { mes: 'Sep', value: 48 },
  { mes: 'Oct', value: 52 },
  { mes: 'Nov', value: 57 },
  { mes: 'Dic', value: 71 },
]

const AVG = 48
// Monotonic severity ramp: muted → medium → high → critical.
// Sector tokens were misused here as severity steps; risk tokens carry the
// editorial meaning (escalating year-end anomaly) without polluting identity.
const ALERT_COLOR = 'var(--color-risk-critical)'
const WARNING_COLOR = 'var(--color-risk-high)'
const SOFT_WARN = 'var(--color-risk-medium)'
const MUTED_BAR = 'var(--color-text-muted)'

const DOTS = 50       // each dot = 1.6B MXN (0-80B domain)
const DOT_PER_B = DOTS / 80
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 58
const COL_W = DOTS * DOT_GAP
const VALUE_W = 50
const ROW_H = STRIP_H + 4

const W = LABEL_W + COL_W + VALUE_W
const H = 40 + DATA.length * ROW_H + 20

function getMonthColor(index: number): string {
  if (index === 11) return ALERT_COLOR
  if (index === 10) return WARNING_COLOR
  if (index === 9) return SOFT_WARN
  return MUTED_BAR
}

function getFillOpacity(index: number): number {
  if (index === 11) return 1
  if (index >= 9) return 0.85
  return 0.6
}

export function MonthlySpendingChart() {
  const { t } = useTranslation('storyCharts')
  const avgDot = Math.round(AVG * DOT_PER_B)

  return (
    <EditorialChartFrame
      kicker={t('monthly.kicker')}
      headline={t('monthly.headline')}
      subline={t('monthly.subline')}
      stats={[{ value: t('monthly.heroStat'), label: t('monthly.heroLabel'), accent: ALERT_COLOR }]}
      footer={t('monthly.footer')}
    >
      <div className="rounded-sm border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('monthly.ariaLabel')}
        >
          {/* Header */}
          <text
            x={LABEL_W - 6}
            y={22}
            textAnchor="end"
            fill="var(--color-text-secondary)"
            fontSize={13}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.1em"
          >
            {t('monthly.monthHeader')}
          </text>
          <text
            x={LABEL_W + COL_W + VALUE_W - 2}
            y={22}
            textAnchor="end"
            fill="var(--color-text-secondary)"
            fontSize={13}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.1em"
          >
            {t('monthly.valueHeader')}
          </text>

          {/* Avg reference marker */}
          <line
            x1={LABEL_W + avgDot * DOT_GAP + DOT_R}
            x2={LABEL_W + avgDot * DOT_GAP + DOT_R}
            y1={32}
            y2={40 + DATA.length * ROW_H - 4}
            stroke="var(--color-text-muted)"
            strokeDasharray="3 3"
            strokeWidth={1}
            opacity={0.5}
          />
          <text
            x={LABEL_W + avgDot * DOT_GAP + DOT_R + 4}
            y={38}
            fill="var(--color-text-muted)"
            fontSize={13}
            fontFamily="var(--font-family-mono)"
          >
            {`${t('monthly.avgPrefix')} $${AVG}B`}
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 46 + rowIdx * ROW_H
            const color = getMonthColor(rowIdx)
            const opacity = getFillOpacity(rowIdx)
            const filled = Math.round(row.value * DOT_PER_B)

            return (
              <g key={row.mes}>
                {/* Month label */}
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2 + 3}
                  textAnchor="end"
                  fill="var(--color-text-muted)"
                  fontSize={13}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.mes}
                </text>

                {/* Dots */}
                {Array.from({ length: DOTS }).map((_, i) => {
                  const isFilled = i < filled
                  return (
                    <motion.circle
                      key={i}
                      cx={LABEL_W + i * DOT_GAP + DOT_R}
                      cy={y0 + STRIP_H / 2}
                      r={DOT_R}
                      fill={isFilled ? color : 'var(--color-background-elevated)'}
                      fillOpacity={isFilled ? opacity : 1}
                      stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                      strokeWidth={isFilled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.04 + i * 0.003 }}
                    />
                  )
                })}

                {/* Value label */}
                <text
                  x={LABEL_W + COL_W + 8}
                  y={y0 + STRIP_H / 2 + 3}
                  fill={color}
                  fontSize={12}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  ${row.value}B
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </EditorialChartFrame>
  )
}

// ✓ dot-matrix rewrite
