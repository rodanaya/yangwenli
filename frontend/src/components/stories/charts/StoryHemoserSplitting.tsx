import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

const data = [
  { year: '2019', contracts: 18025 },
  { year: '2020', contracts: 17413 },
  { year: '2021', contracts: 17352 },
  { year: '2022', contracts: 12013 },
  { year: '2023', contracts: 20512 },
  { year: '2024', contracts: 7914 },
]

const PEAK_YEAR = '2023'
const TOTAL = data.reduce((sum, d) => sum + d.contracts, 0)

// ─── Dot-matrix geometry ──────────────────────────────────────────────────────
const ROWS = 40              // vertical dots per column
const DOT_R = 3
const DOT_GAP = 6
const COL_W = 52
const TOP_PAD = 18
const LABEL_W = 36           // left pad for y-axis labels
const BOTTOM_PAD = 24
const CHART_H = TOP_PAD + ROWS * DOT_GAP + BOTTOM_PAD
const CHART_W = LABEL_W + data.length * COL_W + 20
const MAX_VALUE = 25000      // matches previous YAxis domain

function formatK(v: number): string {
  return `${(v / 1000).toFixed(1)}K`
}

export function StoryHemoserSplitting() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('hemoserSplitting.kicker')}
      headline={t('hemoserSplitting.headline')}
      subline={t('hemoserSplitting.subline')}
      stats={[
        { value: t('hemoserSplitting.stat1Value'), label: t('hemoserSplitting.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('hemoserSplitting.stat2Value'), label: t('hemoserSplitting.stat2Label'), accent: 'var(--color-risk-high)' },
      ]}
      footer={t('hemoserSplitting.footer')}
    >
      {/* Dot-matrix vertical columns */}
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('hemoserSplitting.ariaLabel')}
      >
        {/* Y-axis guide labels (25K / 12.5K / 0) */}
        {[0, 0.5, 1].map((frac) => {
          const value = MAX_VALUE * (1 - frac)
          const y = TOP_PAD + frac * ROWS * DOT_GAP
          return (
            <g key={frac}>
              <line
                x1={LABEL_W - 2}
                x2={CHART_W - 8}
                y1={y}
                y2={y}
                stroke="var(--color-text-secondary)"
                strokeDasharray="3 3"
                strokeWidth={0.5}
              />
              <text
                x={LABEL_W - 6}
                y={y + 3}
                textAnchor="end"
                fill="var(--color-text-secondary)"
                fontSize={8}
                fontFamily="var(--font-family-mono)"
              >
                {formatK(value)}
              </text>
            </g>
          )
        })}

        {/* Columns of dots */}
        {data.map((item, colIdx) => {
          const filled = Math.round((item.contracts / MAX_VALUE) * ROWS)
          const xCenter = LABEL_W + colIdx * COL_W + COL_W / 2
          const isPeak = item.year === PEAK_YEAR
          // Peak column carries risk-critical semantics — the 2023 spike IS the anomaly.
          const color = isPeak ? 'var(--color-risk-critical)' : 'var(--color-text-secondary)'
          const pctOfTotal = ((item.contracts / TOTAL) * 100).toFixed(1)

          return (
            <g key={item.year}>
              {Array.from({ length: ROWS }).map((_, i) => {
                const dotY = TOP_PAD + (ROWS - 1 - i) * DOT_GAP
                const isFilled = i < filled
                return (
                  <motion.circle
                    key={i}
                    cx={xCenter}
                    cy={dotY}
                    r={DOT_R}
                    fill={isFilled ? color : 'var(--color-background-elevated)'}
                    stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                    strokeWidth={0.5}
                    fillOpacity={isPeak && isFilled ? 1 : 0.85}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: colIdx * 0.04 + (filled - i) * 0.005 }}
                  />
                )
              })}

              {/* Value label above column */}
              <text
                x={xCenter}
                y={TOP_PAD + (ROWS - filled) * DOT_GAP - 5}
                textAnchor="middle"
                fill={isPeak ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'}
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fontWeight={isPeak ? 700 : 500}
              >
                {formatK(item.contracts)}
              </text>

              {/* X-axis year label */}
              <text
                x={xCenter}
                y={TOP_PAD + ROWS * DOT_GAP + 14}
                textAnchor="middle"
                fill={isPeak ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'}
                fontSize={10}
                fontFamily="var(--font-family-mono)"
                fontWeight={isPeak ? 700 : 400}
              >
                {item.year}
                {item.year === '2024' ? '*' : ''}
              </text>

              {/* Hidden title for hover on the whole column */}
              <title>
                {`${item.year}: ${item.contracts.toLocaleString('es-MX')} ${t('hemoserSplitting.tooltipSuffix')} (${pctOfTotal}${t('hemoserSplitting.tooltipPercentSuffix')})`}
              </title>
            </g>
          )
        })}
      </svg>

      {/* Annotation pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-risk-critical/10 border border-risk-critical/20 text-[10px] text-risk-critical">
          <span className="h-1.5 w-1.5 rounded-full bg-risk-critical animate-pulse" aria-hidden="true" />
          {t('hemoserSplitting.annotationPeak')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-background-elevated border border-border text-[10px] text-text-secondary">
          {t('hemoserSplitting.annotationVendor')}
        </span>
      </div>
    </EditorialChartFrame>
  )
}
