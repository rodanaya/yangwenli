/**
 * StoryAnoSinExcusas — 2023: the year without excuses.
 *
 * Yearly dot strips 2019-2024 showing DA rate. 2023 highlighted deep red.
 * OECD threshold (25%) as a vertical line. A context strip below marks
 * which years had COVID active (gray bg for 2020-2021).
 *
 * Bilingual via useTranslation — every visible string flips on i18n.language.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface YearRow {
  year: number
  daRate: number
  covid: boolean
  labelKey?: 'labelPandemic' | 'labelRecord' | 'labelTransition'
}

const DATA: YearRow[] = [
  { year: 2019, daRate: 74.1, covid: false },
  { year: 2020, daRate: 78.6, covid: true,  labelKey: 'labelPandemic' },
  { year: 2021, daRate: 79.2, covid: true,  labelKey: 'labelPandemic' },
  { year: 2022, daRate: 79.8, covid: false },
  { year: 2023, daRate: 82.2, covid: false, labelKey: 'labelRecord' },
  { year: 2024, daRate: 78.9, covid: false, labelKey: 'labelTransition' },
]

const OECD_LIMIT = 25

const DOTS = 50 // each dot = 2pp, strip reads left → right
const DOT_R = 3.4
const DOT_GAP_X = 10
const ROW_H = 56
const LABEL_W = 90
const COVID_W = 100
const VALUE_W = 60

const STRIP_W = DOTS * DOT_GAP_X
const W = LABEL_W + STRIP_W + VALUE_W + COVID_W + 20
const H = 64 + DATA.length * ROW_H + 24

export function StoryAnoSinExcusas() {
  const { t } = useTranslation('storyCharts')

  const oecdDotIdx = Math.round(OECD_LIMIT / 2)
  const LEFT_FOR_DOT = (i: number) => LABEL_W + i * DOT_GAP_X + DOT_GAP_X / 2

  return (
    <EditorialChartFrame
      kicker={t('anoSinExcusas.kicker')}
      headline={t('anoSinExcusas.headline')}
      lede={t('anoSinExcusas.lede')}
      stats={[
        { value: t('anoSinExcusas.stat1Value'), label: t('anoSinExcusas.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('anoSinExcusas.stat2Value'), label: t('anoSinExcusas.stat2Label'), accent: 'var(--color-oecd)' },
        { value: t('anoSinExcusas.stat3Value'), label: t('anoSinExcusas.stat3Label'), accent: 'var(--color-risk-high)' },
      ]}
      finding={{
        label: t('anoSinExcusas.findingLabel'),
        body: t('anoSinExcusas.findingBody'),
      }}
      footer={t('anoSinExcusas.footer')}
      tone="bare"
    >
      <div className="rounded-sm border border-border bg-background p-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[680px]"
          role="img"
          aria-label={t('anoSinExcusas.ariaLabel')}
        >
          {/* Header */}
          <text x={LABEL_W - 8} y={36} textAnchor="end" fill="var(--color-text-secondary)" fontSize={13} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {t('anoSinExcusas.yearHeader')}
          </text>
          <text x={LABEL_W + STRIP_W / 2} y={20} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={13} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {t('anoSinExcusas.rateHeader')}
          </text>

          {/* OECD line label */}
          <g>
            <line
              x1={LABEL_W + oecdDotIdx * DOT_GAP_X - DOT_GAP_X / 2}
              y1={32}
              x2={LABEL_W + oecdDotIdx * DOT_GAP_X - DOT_GAP_X / 2}
              y2={H - 24}
              stroke="var(--color-oecd)"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={LABEL_W + oecdDotIdx * DOT_GAP_X - DOT_GAP_X / 2}
              y={28}
              textAnchor="middle"
              fill="var(--color-oecd)"
              fontSize={13}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
            >
              {t('anoSinExcusas.oecdLabel')}
            </text>
          </g>
          <text x={LABEL_W + STRIP_W + VALUE_W / 2} y={36} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={13} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            %
          </text>
          <text x={LABEL_W + STRIP_W + VALUE_W + COVID_W / 2} y={36} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={13} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {t('anoSinExcusas.contextHeader')}
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 50 + rowIdx * ROW_H
            const cy = y0 + ROW_H / 2
            const isRecord = row.year === 2023
            const filled = Math.round(row.daRate / 2)
            const fillColor = isRecord ? 'var(--color-risk-critical)' : 'var(--color-risk-medium)'
            const rowLabel = row.labelKey ? t(`anoSinExcusas.${row.labelKey}`) : undefined

            return (
              <g key={row.year}>
                {/* Row highlight */}
                {isRecord && (
                  <rect
                    x={LABEL_W - 4}
                    y={y0 + 4}
                    width={STRIP_W + VALUE_W + 8}
                    height={ROW_H - 8}
                    rx={4}
                    fill="var(--color-risk-critical)"
                    fillOpacity={0.06}
                    stroke="var(--color-risk-critical)"
                    strokeOpacity={0.3}
                    strokeWidth={0.75}
                  />
                )}

                {/* Year label */}
                <text
                  x={LABEL_W - 10}
                  y={cy - 4}
                  textAnchor="end"
                  fill={isRecord ? 'var(--color-risk-critical)' : 'var(--color-text-primary)'}
                  fontSize={isRecord ? 20 : 16}
                  fontFamily="var(--font-family-serif)"
                  fontWeight={isRecord ? 800 : 600}
                  dominantBaseline="middle"
                >
                  {row.year}
                </text>
                {rowLabel && (
                  <text
                    x={LABEL_W - 10}
                    y={cy + 14}
                    textAnchor="end"
                    fill={isRecord ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'}
                    fontSize={8.5}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={isRecord ? 700 : 400}
                  >
                    {rowLabel}
                  </text>
                )}

                {/* Dot strip */}
                {Array.from({ length: DOTS }).map((_, i) => {
                  const cx = LEFT_FOR_DOT(i)
                  const isFilled = i < filled
                  return (
                    <motion.circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={DOT_R}
                      fill={isFilled ? fillColor : 'var(--color-background-elevated)'}
                      stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                      strokeWidth={isFilled ? 0 : 0.6}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.08 + i * 0.005 }}
                    />
                  )
                })}

                {/* Value label */}
                <text
                  x={LABEL_W + STRIP_W + VALUE_W - 6}
                  y={cy}
                  textAnchor="end"
                  fill={isRecord ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'}
                  fontSize={isRecord ? 14 : 12}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={isRecord ? 800 : 600}
                  dominantBaseline="middle"
                >
                  {row.daRate.toFixed(1)}%
                </text>

                {/* COVID context strip */}
                <g transform={`translate(${LABEL_W + STRIP_W + VALUE_W + 8}, ${y0 + 6})`}>
                  <rect
                    width={COVID_W - 16}
                    height={ROW_H - 12}
                    rx={3}
                    fill={row.covid ? 'var(--color-text-secondary)' : 'var(--color-background)'}
                    fillOpacity={row.covid ? 0.6 : 0.8}
                    stroke={row.covid ? 'var(--color-text-muted)' : 'var(--color-background-elevated)'}
                    strokeWidth={0.75}
                  />
                  <text
                    x={(COVID_W - 16) / 2}
                    y={(ROW_H - 12) / 2 + 3}
                    textAnchor="middle"
                    fill={row.covid ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
                    fontSize={13}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={600}
                    letterSpacing="0.05em"
                  >
                    {row.covid ? t('anoSinExcusas.covidActive') : t('anoSinExcusas.noEmergency')}
                  </text>
                </g>
              </g>
            )
          })}

          {/* Bottom legend */}
          <text
            x={LABEL_W + STRIP_W / 2}
            y={H - 6}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize={13}
            fontFamily="var(--font-family-mono)"
          >
            {t('anoSinExcusas.bottomLegend')}
          </text>
        </svg>
      </div>
    </EditorialChartFrame>
  )
}
