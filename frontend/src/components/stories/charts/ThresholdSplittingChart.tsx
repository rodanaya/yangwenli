/**
 * ThresholdSplittingChart — Pure SVG dot-matrix strips.
 *
 * Visualizes a real threshold-splitting pattern: 12 contracts awarded
 * on a single day, all just below the supervision threshold.
 * Each dot = $10M MXN; domain 0-1520M. Red vertical line at $1,500M.
 * The visual story: every strip reaches almost to — but never crosses — the red line.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { RISK_COLORS } from '@/lib/constants'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface ContractRow {
  contrato: string
  monto: number
  hora: string
}

const DATA: ContractRow[] = [
  { contrato: '#1',  monto: 1433, hora: '09:14' },
  { contrato: '#2',  monto: 1441, hora: '09:22' },
  { contrato: '#3',  monto: 1438, hora: '09:31' },
  { contrato: '#4',  monto: 1445, hora: '10:03' },
  { contrato: '#5',  monto: 1437, hora: '10:18' },
  { contrato: '#6',  monto: 1442, hora: '10:45' },
  { contrato: '#7',  monto: 1439, hora: '11:12' },
  { contrato: '#8',  monto: 1444, hora: '11:38' },
  { contrato: '#9',  monto: 1436, hora: '13:02' },
  { contrato: '#10', monto: 1441, hora: '13:29' },
  { contrato: '#11', monto: 1438, hora: '14:11' },
  { contrato: '#12', monto: 1432, hora: '14:47' },
]

const THRESHOLD = 1500
const DOMAIN_MAX = 1520
const totalValue = DATA.reduce((sum, d) => sum + d.monto, 0)

const DOTS = 76        // 20M per dot → 1520M ceiling
const DOT_PER_M = DOTS / DOMAIN_MAX
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 84
const COL_W = DOTS * DOT_GAP
const VALUE_W = 62
const ROW_H = STRIP_H + 4

const W = LABEL_W + COL_W + VALUE_W
const H = 46 + DATA.length * ROW_H + 16

export function ThresholdSplittingChart() {
  const { t } = useTranslation('storyCharts')
  const thresholdDot = Math.round(THRESHOLD * DOT_PER_M) // = 75

  return (
    <EditorialChartFrame
      kicker={t('thresholdSplitting.kicker')}
      headline={t('thresholdSplitting.headline')}
      subline={`${t('thresholdSplitting.sublinePrefix')}${totalValue.toLocaleString()}${t('thresholdSplitting.sublineMid')}${Math.round((totalValue / THRESHOLD) * 100) / 100}${t('thresholdSplitting.sublineSuffix')}`}
      stats={[
        { value: t('thresholdSplitting.heroValue'), label: t('thresholdSplitting.heroLabel'), accent: 'var(--color-risk-high)' },
      ]}
      finding={{ label: t('thresholdSplitting.findingLabel'), body: t('thresholdSplitting.findingBody') }}
      footer={t('thresholdSplitting.footer')}
    >
      <div className="rounded-sm border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('thresholdSplitting.ariaLabel')}
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
            {t('thresholdSplitting.contractHeader')}
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
            {t('thresholdSplitting.amountHeader')}
          </text>

          {/* Supervision threshold line */}
          <line
            x1={LABEL_W + thresholdDot * DOT_GAP + DOT_R}
            x2={LABEL_W + thresholdDot * DOT_GAP + DOT_R}
            y1={32}
            y2={46 + DATA.length * ROW_H - 4}
            stroke={RISK_COLORS.critical}
            strokeDasharray="6 3"
            strokeWidth={2}
          />
          <text
            x={LABEL_W + thresholdDot * DOT_GAP + DOT_R - 4}
            y={38}
            textAnchor="end"
            fill={RISK_COLORS.critical}
            fontSize={13}
            fontFamily="var(--font-family-mono)"
            fontWeight={600}
          >
            {t('thresholdSplitting.thresholdLabel')}
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 52 + rowIdx * ROW_H
            const filled = Math.round(row.monto * DOT_PER_M)
            const color = RISK_COLORS.high

            return (
              <g key={row.contrato}>
                {/* Contract + hora */}
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2 + 3}
                  textAnchor="end"
                  fill="var(--color-text-muted)"
                  fontSize={12}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.contrato}
                  <tspan fill="var(--color-text-secondary)">  {row.hora}</tspan>
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
                      fillOpacity={isFilled ? 0.9 : 1}
                      stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                      strokeWidth={isFilled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.03 + i * 0.002 }}
                    />
                  )
                })}

                {/* Value */}
                <text
                  x={LABEL_W + COL_W + 8}
                  y={y0 + STRIP_H / 2 + 3}
                  fill={color}
                  fontSize={12}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  ${row.monto}M
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
