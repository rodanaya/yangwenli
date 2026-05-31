/**
 * StoryAusteridadChart — Pure SVG dot-matrix showing the paradox.
 *
 * For each of 3 administrations (Calderón, Peña, AMLO), render two
 * strips: gray (spend in Tn MXN, each dot 0.1T) and red (DA%, each
 * dot 2pp). Visual tension: spend strip stays flat/shrinks while DA
 * strip grows red.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface EraRow {
  era: string
  spendTn: number
  daPct: number
  contracts: string
  cohort: string
}

const DATA: EraRow[] = [
  { era: 'Calderón',   spendTn: 2.41, daPct: 42.3, contracts: '481K',  cohort: '2007-2012' },
  { era: 'Peña Nieto', spendTn: 3.06, daPct: 73.1, contracts: '1.23M', cohort: '2013-2018' },
  { era: 'AMLO',       spendTn: 2.76, daPct: 79.4, contracts: '1.05M', cohort: '2019-2024' },
]

const SPEND_DOTS = 40          // each dot = 0.1T (0-4T domain)
const SPEND_DOT_PER_T = SPEND_DOTS / 4
const DA_DOTS = 50             // each dot = 2pp (0-100% domain)
const DA_DOT_PER_PCT = DA_DOTS / 100

const SPEND_COLOR = 'var(--color-text-muted)'
const DA_COLOR = 'var(--color-risk-critical)'

const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 108
const MAX_COL_W = Math.max(SPEND_DOTS, DA_DOTS) * DOT_GAP
const VALUE_W = 72
const STRIP_GAP = 3
const ERA_GAP = 14
const ERA_BLOCK_H = 2 * STRIP_H + STRIP_GAP + 10

const W = LABEL_W + MAX_COL_W + VALUE_W
const H = 40 + DATA.length * (ERA_BLOCK_H + ERA_GAP) + 10

export function StoryAusteridadChart() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('austeridad.kicker')}
      headline={t('austeridad.headline')}
      subline={t('austeridad.subline')}
      stats={[
        { value: t('austeridad.stat1Value'), label: t('austeridad.stat1Label') },
        { value: t('austeridad.stat2Value'), label: t('austeridad.stat2Label'), accent: 'var(--color-risk-critical)' },
      ]}
      footer={t('austeridad.footer')}
    >
      <div className="rounded-sm border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('austeridad.ariaLabel')}
        >
          {/* Legend row */}
          <g>
            <circle cx={LABEL_W + 4} cy={20} r={3} fill={SPEND_COLOR} />
            <text x={LABEL_W + 14} y={24} fill={SPEND_COLOR} fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
              {t('austeridad.spendLegend')}
            </text>
            <circle cx={LABEL_W + 288} cy={20} r={3} fill={DA_COLOR} />
            <text x={LABEL_W + 298} y={24} fill={DA_COLOR} fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
              {t('austeridad.daLegend')}
            </text>
          </g>

          {/* Era blocks */}
          {DATA.map((row, rowIdx) => {
            const blockY = 40 + rowIdx * (ERA_BLOCK_H + ERA_GAP)
            const spendFilled = Math.round(row.spendTn * SPEND_DOT_PER_T)
            const daFilled = Math.round(row.daPct * DA_DOT_PER_PCT)

            return (
              <g key={row.era}>
                {/* Era + cohort label */}
                <text
                  x={LABEL_W - 6}
                  y={blockY + 4}
                  textAnchor="end"
                  fill="var(--color-text-muted)"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.era}
                </text>
                <text
                  x={LABEL_W - 6}
                  y={blockY + 15}
                  textAnchor="end"
                  fill="var(--color-text-secondary)"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.cohort}
                </text>
                <text
                  x={LABEL_W - 6}
                  y={blockY + 25}
                  textAnchor="end"
                  fill="var(--color-text-secondary)"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.contracts}
                </text>

                {/* Spend strip */}
                {(() => {
                  const yStrip = blockY + 4
                  return (
                    <g>
                      {Array.from({ length: SPEND_DOTS }).map((_, i) => {
                        const isFilled = i < spendFilled
                        return (
                          <motion.circle
                            key={`spend-${i}`}
                            cx={LABEL_W + i * DOT_GAP + DOT_R}
                            cy={yStrip + STRIP_H / 2}
                            r={DOT_R}
                            fill={isFilled ? SPEND_COLOR : 'var(--color-background-elevated)'}
                            fillOpacity={isFilled ? 0.75 : 1}
                            stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                            strokeWidth={isFilled ? 0 : 0.5}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: rowIdx * 0.05 + i * 0.003 }}
                          />
                        )
                      })}
                      <text
                        x={LABEL_W + MAX_COL_W + 8}
                        y={yStrip + STRIP_H / 2 + 3}
                        fill={SPEND_COLOR}
                        fontSize={10}
                        fontFamily="var(--font-family-mono)"
                        fontWeight={600}
                      >
                        ${row.spendTn.toFixed(2)}T
                      </text>
                    </g>
                  )
                })()}

                {/* DA strip */}
                {(() => {
                  const yStrip = blockY + 4 + STRIP_H + STRIP_GAP
                  return (
                    <g>
                      {Array.from({ length: DA_DOTS }).map((_, i) => {
                        const isFilled = i < daFilled
                        return (
                          <motion.circle
                            key={`da-${i}`}
                            cx={LABEL_W + i * DOT_GAP + DOT_R}
                            cy={yStrip + STRIP_H / 2}
                            r={DOT_R}
                            fill={isFilled ? DA_COLOR : 'var(--color-background-elevated)'}
                            fillOpacity={isFilled ? 0.95 : 1}
                            stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                            strokeWidth={isFilled ? 0 : 0.5}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2, delay: rowIdx * 0.05 + 0.08 + i * 0.003 }}
                          />
                        )
                      })}
                      <text
                        x={LABEL_W + MAX_COL_W + 8}
                        y={yStrip + STRIP_H / 2 + 3}
                        fill={DA_COLOR}
                        fontSize={10}
                        fontFamily="var(--font-family-mono)"
                        fontWeight={600}
                      >
                        {`${row.daPct}% ${t('austeridad.daSuffix')}`}
                      </text>
                    </g>
                  )
                })()}
              </g>
            )
          })}
        </svg>
      </div>
    </EditorialChartFrame>
  )
}

// ✓ dot-matrix rewrite
