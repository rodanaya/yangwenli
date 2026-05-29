/**
 * StoryInsabi — Before / after: Seguro Popular vs INSABI.
 *
 * Two side-by-side columns. For each era, three dot-strip indicators:
 * competition rate, average risk score, contract volume. Shows the
 * deterioration when INSABI replaced Seguro Popular in 2020.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { RISK_COLORS } from '@/lib/constants'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface EraMetric {
  key: string
  // i18n key under storyCharts.insabi.metricXxx — replaces the hardcoded label.
  labelKey: 'Competition' | 'Risk' | 'Shortage' | 'December'
  seguroPopular: number // 0-100 for strip
  insabi: number        // 0-100 for strip
  spValue: string
  insabiValue: string
  worseIsHigher: boolean
}

// Editorial metrics — health sector under Seguro Popular (2015-2019) vs INSABI (2020-2023)
const METRICS: EraMetric[] = [
  {
    key: 'competition',
    labelKey: 'Competition',
    seguroPopular: 22,
    insabi: 5,
    spValue: '22%',
    insabiValue: '~5%',
    worseIsHigher: false, // lower = worse
  },
  {
    key: 'risk',
    labelKey: 'Risk',
    seguroPopular: 28,
    insabi: 48,
    spValue: '0.28',
    insabiValue: '0.48',
    worseIsHigher: true, // higher = worse
  },
  {
    key: 'shortage',
    labelKey: 'Shortage',
    seguroPopular: 8,
    insabi: 74,
    spValue: '~8%',
    insabiValue: '~74%',
    worseIsHigher: true,
  },
  {
    key: 'decemberSpike',
    labelKey: 'December',
    seguroPopular: 18,
    insabi: 61,
    spValue: '18%',
    insabiValue: '61%',
    worseIsHigher: true,
  },
]

const DOTS = 50
const DOT_R = 3.2
const DOT_GAP_X = 7
const STRIP_H = 22
const LABEL_W = 172
const VALUE_W = 60
const STRIP_W = DOTS * DOT_GAP_X
const COL_GAP = 42

const W = LABEL_W + STRIP_W * 2 + VALUE_W * 2 + COL_GAP + 16
const H = 96 + METRICS.length * (STRIP_H + 22) + 24

export function StoryInsabi() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('insabi.kicker')}
      headline={t('insabi.headline')}
      lede={t('insabi.lede')}
      stats={[
        { value: t('insabi.stat1Value'), label: t('insabi.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('insabi.stat2Value'), label: t('insabi.stat2Label'), accent: 'var(--color-risk-high)' },
        { value: t('insabi.stat3Value'), label: t('insabi.stat3Label'), accent: 'var(--color-risk-high)' },
      ]}
      finding={{ label: t('insabi.findingLabel'), body: t('insabi.findingBody') }}
      footer={t('insabi.footer')}
      tone="bare"
    >
      <div className="rounded-sm border border-border bg-background p-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[720px]"
          role="img"
          aria-label={t('insabi.ariaLabel')}
        >
          {/* Headers */}
          <text x={LABEL_W + STRIP_W / 2 + VALUE_W / 2} y={26} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={11} fontFamily="var(--font-family-serif)" fontWeight={700}>
            {t('insabi.spName')}
          </text>
          <text x={LABEL_W + STRIP_W / 2 + VALUE_W / 2} y={42} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.08em">
            {t('insabi.spYears')}
          </text>

          <text
            x={LABEL_W + STRIP_W + VALUE_W + COL_GAP + STRIP_W / 2 + VALUE_W / 2}
            y={26}
            textAnchor="middle"
            fill={RISK_COLORS.critical}
            fontSize={11}
            fontFamily="var(--font-family-serif)"
            fontWeight={700}
          >
            {t('insabi.insabiName')}
          </text>
          <text
            x={LABEL_W + STRIP_W + VALUE_W + COL_GAP + STRIP_W / 2 + VALUE_W / 2}
            y={42}
            textAnchor="middle"
            fill="var(--color-risk-critical)"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.08em"
          >
            {t('insabi.insabiYears')}
          </text>

          {/* VS divider */}
          <line
            x1={LABEL_W + STRIP_W + VALUE_W + COL_GAP / 2}
            y1={54}
            x2={LABEL_W + STRIP_W + VALUE_W + COL_GAP / 2}
            y2={H - 36}
            stroke="var(--color-border-hover)"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <text
            x={LABEL_W + STRIP_W + VALUE_W + COL_GAP / 2}
            y={(H - 36 + 54) / 2}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize={10}
            fontFamily="var(--font-family-mono)"
            fontWeight={700}
          >
            {t('insabi.vsLabel')}
          </text>

          {/* Rows */}
          {METRICS.map((m, rowIdx) => {
            const y0 = 70 + rowIdx * (STRIP_H + 22)
            const cy = y0 + STRIP_H / 2
            const spFilled = Math.round(m.seguroPopular / 2)
            const insabiFilled = Math.round(m.insabi / 2)

            // Color logic: neutral if the era is the relative "winner", critical red if the "loser"
            const spColor = m.worseIsHigher
              ? (m.seguroPopular < m.insabi ? 'var(--color-text-secondary)' : RISK_COLORS.critical)
              : (m.seguroPopular > m.insabi ? 'var(--color-text-secondary)' : RISK_COLORS.critical)
            const insabiColor = m.worseIsHigher
              ? (m.insabi > m.seguroPopular ? RISK_COLORS.critical : 'var(--color-text-secondary)')
              : (m.insabi < m.seguroPopular ? RISK_COLORS.critical : 'var(--color-text-secondary)')

            return (
              <g key={m.key}>
                {/* Label */}
                <text
                  x={LABEL_W - 12}
                  y={cy + 3}
                  textAnchor="end"
                  fill="var(--color-border)"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {t(`insabi.metric${m.labelKey}`)}
                </text>

                {/* SP strip */}
                {Array.from({ length: DOTS }).map((_, i) => (
                  <motion.circle
                    key={`sp-${i}`}
                    cx={LABEL_W + i * DOT_GAP_X + DOT_GAP_X / 2}
                    cy={cy}
                    r={DOT_R}
                    fill={i < spFilled ? spColor : 'var(--color-background-elevated)'}
                    stroke={i < spFilled ? 'none' : 'var(--color-border-hover)'}
                    strokeWidth={i < spFilled ? 0 : 0.5}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: rowIdx * 0.1 + i * 0.004 }}
                  />
                ))}
                <text
                  x={LABEL_W + STRIP_W + VALUE_W - 8}
                  y={cy + 3}
                  textAnchor="end"
                  fill={spColor}
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                >
                  {m.spValue}
                </text>

                {/* INSABI strip */}
                {Array.from({ length: DOTS }).map((_, i) => {
                  const cx = LABEL_W + STRIP_W + VALUE_W + COL_GAP + i * DOT_GAP_X + DOT_GAP_X / 2
                  return (
                    <motion.circle
                      key={`insabi-${i}`}
                      cx={cx}
                      cy={cy}
                      r={DOT_R}
                      fill={i < insabiFilled ? insabiColor : 'var(--color-background-elevated)'}
                      stroke={i < insabiFilled ? 'none' : 'var(--color-border-hover)'}
                      strokeWidth={i < insabiFilled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.4 + rowIdx * 0.1 + i * 0.004 }}
                    />
                  )
                })}
                <text
                  x={LABEL_W + STRIP_W * 2 + VALUE_W * 2 + COL_GAP - 8}
                  y={cy + 3}
                  textAnchor="end"
                  fill={insabiColor}
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                >
                  {m.insabiValue}
                </text>
              </g>
            )
          })}

          {/* Bottom legend */}
          <text
            x={W / 2}
            y={H - 10}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
          >
            {t('insabi.legendBottom')}
          </text>
        </svg>
      </div>
    </EditorialChartFrame>
  )
}
