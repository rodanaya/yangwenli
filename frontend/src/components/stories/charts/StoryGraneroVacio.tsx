/**
 * StoryGraneroVacio — Pure SVG dot-matrix of SEGALMEX top vendors.
 *
 * 6 agriculture vendors under AMLO, sorted by contract value (0-7B MXN).
 * Each dot = $100M MXN. Value label at strip end; DA% badge at far right.
 * Color per vendor keyed off DA rate (red 99+, orange 60-98, green <60).
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { RISK_COLORS } from '@/lib/constants'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface VendorRow {
  name: string
  shortName: string
  value: number   // in B MXN
  daPct: number
}

const DATA: VendorRow[] = [
  { name: 'SEGALMEX',           shortName: 'SEGALMEX',        value: 6.43, daPct: 41.2  },
  { name: 'MOLINOS AZTECA',     shortName: 'Molinos Azteca',  value: 6.25, daPct: 99.9  },
  { name: 'ILAS MEXICO',        shortName: 'ILAS Mexico',     value: 3.30, daPct: 100.0 },
  { name: 'PRODUCTOS LONEG',    shortName: 'Productos Loneg', value: 2.72, daPct: 100.0 },
  { name: 'INDUSTRIAL PATRONA', shortName: 'Ind. Patrona',    value: 2.12, daPct: 99.4  },
  { name: 'LICONSA',            shortName: 'LICONSA',         value: 1.91, daPct: 63.0  },
].sort((a, b) => b.value - a.value)

const DOTS = 70                 // each dot = $100M (0-7B domain)
const DOT_PER_B = DOTS / 7
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 130
const COL_W = DOTS * DOT_GAP
const VALUE_W = 84
const ROW_H = STRIP_H + 6

const W = LABEL_W + COL_W + VALUE_W
const H = 40 + DATA.length * ROW_H + 16

function getVendorColor(daPct: number): string {
  if (daPct >= 90) return RISK_COLORS.critical
  if (daPct >= 75) return RISK_COLORS.high
  if (daPct >= 60) return RISK_COLORS.medium
  return 'var(--color-text-muted)'
}

export function StoryGraneroVacio() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('emptyGranary.kicker')}
      headline={t('emptyGranary.headline')}
      subline={t('emptyGranary.subline')}
      stats={[
        { value: t('emptyGranary.stat1Value'), label: t('emptyGranary.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('emptyGranary.stat2Value'), label: t('emptyGranary.stat2Label'), accent: 'var(--color-risk-high)' },
      ]}
      finding={{ label: t('emptyGranary.findingLabel'), body: t('emptyGranary.findingBody') }}
      footer={t('emptyGranary.footer')}
    >
      <div className="rounded-sm border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('emptyGranary.ariaLabel')}
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
            {t('emptyGranary.vendorHeader')}
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
            {t('emptyGranary.valueHeader')}
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 38 + rowIdx * ROW_H
            const color = getVendorColor(row.daPct)
            const filled = Math.round(row.value * DOT_PER_B)

            return (
              <g key={row.name}>
                {/* Label */}
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2 + 3}
                  textAnchor="end"
                  fill="var(--color-text-muted)"
                  fontSize={12}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.shortName}
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
                      transition={{ duration: 0.2, delay: rowIdx * 0.05 + i * 0.002 }}
                    />
                  )
                })}

                {/* Value + DA% */}
                <text
                  x={LABEL_W + COL_W + 8}
                  y={y0 + STRIP_H / 2 + 3}
                  fill={color}
                  fontSize={12}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  ${row.value.toFixed(2)}B
                  <tspan fill="var(--color-text-muted)" fontWeight={400}>  {row.daPct}% DA</tspan>
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-3 flex gap-4 text-[12px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: RISK_COLORS.critical }} />
          {t('emptyGranary.legend100')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: RISK_COLORS.high }} />
          {t('emptyGranary.legend60')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm" style={{ background: 'var(--color-text-muted)' }} />
          {t('emptyGranary.legendUnder')}
        </span>
      </div>
    </EditorialChartFrame>
  )
}

// ✓ dot-matrix rewrite
