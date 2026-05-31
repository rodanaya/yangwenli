/**
 * StoryAvalanchaDiciembre — Pure SVG monthly dot avalanche.
 *
 * 12 vertical columns (one per month). Each dot = 1 billion MXN.
 * Jan-Sep: gray dots (baseline). Oct: amber tint. Nov: orange. Dec: red burst
 * towering above the rest. Horizontal reference line at monthly average.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface Month {
  key: 'monthJan' | 'monthFeb' | 'monthMar' | 'monthApr' | 'monthMay' | 'monthJun' | 'monthJul' | 'monthAug' | 'monthSep' | 'monthOct' | 'monthNov' | 'monthDec'
  value: number // MXN billions
  color: string
  stroke: string
}

// December 2014 peak case — 51.4B. Neighboring months from COMPRANET.
const MONTHS: Month[] = [
  { key: 'monthJan', value: 12, color: 'var(--color-text-secondary)', stroke: 'var(--color-text-secondary)' },
  { key: 'monthFeb', value: 15, color: 'var(--color-text-secondary)', stroke: 'var(--color-text-secondary)' },
  { key: 'monthMar', value: 18, color: 'var(--color-text-secondary)', stroke: 'var(--color-text-secondary)' },
  { key: 'monthApr', value: 16, color: 'var(--color-text-secondary)', stroke: 'var(--color-text-secondary)' },
  { key: 'monthMay', value: 17, color: 'var(--color-text-secondary)', stroke: 'var(--color-text-secondary)' },
  { key: 'monthJun', value: 19, color: 'var(--color-text-secondary)', stroke: 'var(--color-text-secondary)' },
  { key: 'monthJul', value: 17, color: 'var(--color-text-secondary)', stroke: 'var(--color-text-secondary)' },
  { key: 'monthAug', value: 20, color: 'var(--color-text-secondary)', stroke: 'var(--color-text-secondary)' },
  { key: 'monthSep', value: 22, color: 'var(--color-text-muted)', stroke: 'var(--color-text-muted)' },
  { key: 'monthOct', value: 28, color: 'var(--color-risk-medium)', stroke: 'var(--color-risk-medium)' },
  { key: 'monthNov', value: 36, color: 'var(--color-risk-high)', stroke: 'var(--color-risk-high)' },
  { key: 'monthDec', value: 51, color: 'var(--color-risk-critical)', stroke: 'var(--color-risk-critical)' },
]

const AVG = 22.6 // average monthly spend 2014

const W = 640
const H = 420
const PADDING_L = 48
const PADDING_R = 60
const PADDING_T = 30
const PADDING_B = 40
const COL_W = (W - PADDING_L - PADDING_R) / MONTHS.length
const CHART_H = H - PADDING_T - PADDING_B
const MAX_VAL = 55 // cap

// Each dot represents 1B MXN
const DOT_R = 3.2
const DOT_SPACING_Y = 7

export function StoryAvalanchaDiciembre() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('avalanchaDiciembre.kicker')}
      headline={t('avalanchaDiciembre.headline')}
      lede={t('avalanchaDiciembre.lede')}
      stats={[
        { value: t('avalanchaDiciembre.stat1Value'), label: t('avalanchaDiciembre.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('avalanchaDiciembre.stat2Value'), label: t('avalanchaDiciembre.stat2Label'), accent: 'var(--color-risk-high)' },
        { value: t('avalanchaDiciembre.stat3Value'), label: t('avalanchaDiciembre.stat3Label') },
      ]}
      finding={{ label: t('avalanchaDiciembre.findingLabel'), body: t('avalanchaDiciembre.findingBody') }}
      footer={t('avalanchaDiciembre.footer')}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('avalanchaDiciembre.ariaLabel')}
      >
        {/* Y axis gridlines */}
        {[0, 10, 20, 30, 40, 50].map((v) => {
          const y = PADDING_T + CHART_H - (v / MAX_VAL) * CHART_H
          return (
            <g key={v}>
              <line
                x1={PADDING_L}
                x2={W - PADDING_R}
                y1={y}
                y2={y}
                stroke="var(--color-border-hover)"
                strokeWidth={0.5}
                strokeDasharray="2 4"
              />
              <text
                x={PADDING_L - 6}
                y={y + 3}
                textAnchor="end"
                fill="var(--color-text-secondary)"
                fontSize={9}
                fontFamily="var(--font-family-mono)"
              >
                ${v}B
              </text>
            </g>
          )
        })}

        {/* Average reference line */}
        <motion.line
          x1={PADDING_L}
          x2={W - PADDING_R}
          y1={PADDING_T + CHART_H - (AVG / MAX_VAL) * CHART_H}
          y2={PADDING_T + CHART_H - (AVG / MAX_VAL) * CHART_H}
          stroke="var(--color-oecd)"
          strokeWidth={1}
          strokeDasharray="4 3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        />
        <text
          x={W - PADDING_R + 4}
          y={PADDING_T + CHART_H - (AVG / MAX_VAL) * CHART_H + 3}
          fill="var(--color-oecd)"
          fontSize={9}
          fontFamily="var(--font-family-mono)"
          fontWeight={600}
        >
          {`${t('avalanchaDiciembre.averagePrefix')} $${AVG}B`}
        </text>

        {/* Month columns */}
        {MONTHS.map((month, mi) => {
          const cx = PADDING_L + mi * COL_W + COL_W / 2
          const baseY = PADDING_T + CHART_H
          const dotCount = month.value

          return (
            <g key={month.key}>
              {/* Dots stacked bottom-up */}
              {Array.from({ length: dotCount }).map((_, di) => {
                const cy = baseY - 8 - di * DOT_SPACING_Y
                return (
                  <motion.circle
                    key={di}
                    cx={cx}
                    cy={cy}
                    r={DOT_R}
                    fill={month.color}
                    stroke={month.stroke}
                    strokeWidth={0.5}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: mi * 0.04 + di * 0.02 }}
                  />
                )
              })}

              {/* Value label on top */}
              <text
                x={cx}
                y={baseY - 8 - dotCount * DOT_SPACING_Y - 6}
                textAnchor="middle"
                fill={month.color === 'var(--color-risk-critical)' ? 'var(--color-risk-critical)' : month.color === 'var(--color-risk-high)' ? 'var(--color-risk-high)' : 'var(--color-text-muted)'}
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fontWeight={600}
              >
                {month.value}
              </text>

              {/* Month label */}
              <text
                x={cx}
                y={H - PADDING_B + 18}
                textAnchor="middle"
                fill={mi === 11 ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'}
                fontSize={10}
                fontFamily="var(--font-family-mono)"
                fontWeight={mi === 11 ? 700 : 500}
              >
                {t(`avalanchaDiciembre.${month.key}`)}
              </text>
            </g>
          )
        })}

        {/* Avalanche indicator — arrow + annotation */}
        <g>
          <motion.line
            x1={PADDING_L + 11 * COL_W + COL_W / 2 - 30}
            y1={PADDING_T + 30}
            x2={PADDING_L + 11 * COL_W + COL_W / 2 - 6}
            y2={PADDING_T + 50}
            stroke="var(--color-risk-medium)"
            strokeWidth={1}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          />
          <motion.text
            x={PADDING_L + 11 * COL_W + COL_W / 2 - 100}
            y={PADDING_T + 24}
            fill="var(--color-risk-medium)"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            fontWeight={600}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            {t('avalanchaDiciembre.annotation')}
          </motion.text>
        </g>
      </svg>
    </EditorialChartFrame>
  )
}
