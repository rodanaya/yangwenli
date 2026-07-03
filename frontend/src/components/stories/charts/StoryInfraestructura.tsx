/**
 * StoryInfraestructura — Pure SVG competition-vs-non-competition timeline.
 *
 * Horizontal stacked bars by year, 2010-2024.
 * Red bar = direct award %, orange = single bidder %, green = open tender %.
 * Annotated events (Grupo Higa 2014, Tren Maya 2020) mark flashpoints.
 * Reader sees infrastructure sector losing competitive slivers over time.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { RISK_COLORS } from '@/lib/constants'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface YearRow {
  year: number
  direct: number
  single: number
  open: number
  total: number // MXN billions
}

// Infrastructure-sector breakdown by year (COMPRANET)
const YEARS: YearRow[] = [
  { year: 2010, direct: 22, single: 12, open: 66, total: 95 },
  { year: 2011, direct: 24, single: 13, open: 63, total: 108 },
  { year: 2012, direct: 26, single: 14, open: 60, total: 142 },
  { year: 2013, direct: 28, single: 15, open: 57, total: 135 },
  { year: 2014, direct: 34, single: 17, open: 49, total: 168 }, // Grupo Higa
  { year: 2015, direct: 30, single: 16, open: 54, total: 122 },
  { year: 2016, direct: 29, single: 15, open: 56, total: 118 },
  { year: 2017, direct: 31, single: 16, open: 53, total: 126 },
  { year: 2018, direct: 30, single: 15, open: 55, total: 114 },
  { year: 2019, direct: 35, single: 18, open: 47, total: 148 },
  { year: 2020, direct: 42, single: 21, open: 37, total: 195 }, // Tren Maya begins
  { year: 2021, direct: 45, single: 22, open: 33, total: 218 },
  { year: 2022, direct: 47, single: 23, open: 30, total: 245 },
  { year: 2023, direct: 46, single: 22, open: 32, total: 232 },
  { year: 2024, direct: 44, single: 20, open: 36, total: 178 },
]

const ANNOTATIONS = [
  { year: 2014, label: 'Grupo Higa / Casa Blanca', x: 2014 },
  { year: 2020, label: 'Tren Maya · Dos Bocas · AIFA', x: 2020 },
]

const W = 700
const H = 460
const PADDING_L = 60
const PADDING_R = 180
const PADDING_T = 50
const PADDING_B = 40
const ROW_H = (H - PADDING_T - PADDING_B) / YEARS.length
const BAR_H = ROW_H - 3
const BAR_W = W - PADDING_L - PADDING_R

const COLORS = {
  direct: RISK_COLORS.critical,
  single: RISK_COLORS.high,
  open: 'var(--color-text-muted)',
}

export function StoryInfraestructura() {
  const { t } = useTranslation('storyCharts')
  const avgBidders = 1.3
  const oecdBidders = 5.2

  return (
    <EditorialChartFrame
      kicker={t('infraestructura.kicker')}
      headline={t('infraestructura.headline')}
      lede={t('infraestructura.lede')}
      stats={[
        { value: t('infraestructura.stat1Value'), label: t('infraestructura.stat1Label'), accent: 'var(--color-risk-high)' },
        { value: String(avgBidders), label: t('infraestructura.stat2Label'), accent: 'var(--color-risk-critical)' },
        { value: `${oecdBidders}+`, label: t('infraestructura.stat3Label'), accent: 'var(--color-oecd)' },
      ]}
      finding={{ label: t('infraestructura.findingLabel'), body: t('infraestructura.findingBody') }}
      footer={t('infraestructura.footer')}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('infraestructura.ariaLabel')}
      >
        {/* Column headers */}
        <g transform={`translate(${PADDING_L}, ${PADDING_T - 20})`}>
          <circle cx={3} cy={2} r={3} fill={COLORS.direct} />
          <text x={12} y={6} fill="var(--color-risk-critical)" fontSize={13} fontFamily="var(--font-family-mono)" fontWeight={600}>
            {t('infraestructura.directLabel')}
          </text>
          <circle cx={90} cy={2} r={3} fill={COLORS.single} />
          <text x={99} y={6} fill="var(--color-risk-high)" fontSize={13} fontFamily="var(--font-family-mono)" fontWeight={600}>
            {t('infraestructura.singleLabel')}
          </text>
          <circle cx={200} cy={2} r={3} fill={COLORS.open} />
          <text x={209} y={6} fill="var(--color-text-muted)" fontSize={13} fontFamily="var(--font-family-mono)" fontWeight={600}>
            {t('infraestructura.openLabel')}
          </text>
        </g>

        {YEARS.map((row, idx) => {
          const y0 = PADDING_T + idx * ROW_H
          const directW = (row.direct / 100) * BAR_W
          const singleW = (row.single / 100) * BAR_W
          const openW = (row.open / 100) * BAR_W
          const annotation = ANNOTATIONS.find((a) => a.year === row.year)

          return (
            <g key={row.year}>
              {/* Year label */}
              <text
                x={PADDING_L - 10}
                y={y0 + BAR_H / 2 + 3}
                textAnchor="end"
                fill={annotation ? 'var(--color-risk-medium)' : 'var(--color-text-muted)'}
                fontSize={12}
                fontFamily="var(--font-family-mono)"
                fontWeight={annotation ? 700 : 500}
              >
                {row.year}
              </text>

              {/* Direct award segment */}
              <motion.rect
                x={PADDING_L}
                y={y0}
                width={directW}
                height={BAR_H}
                fill={COLORS.direct}
                initial={{ width: 0 }}
                animate={{ width: directW }}
                transition={{ duration: 0.6, delay: idx * 0.04 }}
              />
              {/* Single bidder segment */}
              <motion.rect
                x={PADDING_L + directW}
                y={y0}
                width={singleW}
                height={BAR_H}
                fill={COLORS.single}
                initial={{ width: 0 }}
                animate={{ width: singleW }}
                transition={{ duration: 0.6, delay: idx * 0.04 + 0.1 }}
              />
              {/* Open tender segment */}
              <motion.rect
                x={PADDING_L + directW + singleW}
                y={y0}
                width={openW}
                height={BAR_H}
                fill={COLORS.open}
                initial={{ width: 0 }}
                animate={{ width: openW }}
                transition={{ duration: 0.6, delay: idx * 0.04 + 0.2 }}
              />

              {/* Value label */}
              <text
                x={PADDING_L + BAR_W + 8}
                y={y0 + BAR_H / 2 + 3}
                fill="var(--color-text-muted)"
                fontSize={12}
                fontFamily="var(--font-family-mono)"
              >
                ${row.total}B
              </text>

              {/* Percentages (only if wide enough) */}
              {directW > 30 && (
                <text
                  x={PADDING_L + directW / 2}
                  y={y0 + BAR_H / 2 + 3}
                  textAnchor="middle"
                  fill="var(--color-risk-critical)"
                  fontSize={13}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.direct}%
                </text>
              )}
              {openW > 30 && (
                <text
                  x={PADDING_L + directW + singleW + openW / 2}
                  y={y0 + BAR_H / 2 + 3}
                  textAnchor="middle"
                  fill="var(--color-text-secondary)"
                  fontSize={13}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                >
                  {row.open}%
                </text>
              )}

              {/* Annotation */}
              {annotation && (
                <motion.g
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + idx * 0.04 }}
                >
                  <circle
                    cx={PADDING_L + BAR_W + 50}
                    cy={y0 + BAR_H / 2}
                    r={3}
                    fill="var(--color-risk-medium)"
                  />
                  <text
                    x={PADDING_L + BAR_W + 60}
                    y={y0 + BAR_H / 2 + 3}
                    fill="var(--color-risk-medium)"
                    fontSize={13}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={600}
                  >
                    {annotation.label}
                  </text>
                </motion.g>
              )}
            </g>
          )
        })}

        {/* 50% reference line */}
        <line
          x1={PADDING_L + BAR_W * 0.5}
          y1={PADDING_T - 4}
          x2={PADDING_L + BAR_W * 0.5}
          y2={PADDING_T + YEARS.length * ROW_H}
          stroke="var(--color-oecd)"
          strokeOpacity={0.4}
          strokeWidth={0.8}
          strokeDasharray="3 3"
        />
        <text
          x={PADDING_L + BAR_W * 0.5}
          y={PADDING_T - 26}
          textAnchor="middle"
          fill="var(--color-oecd)"
          fontSize={13}
          fontFamily="var(--font-family-mono)"
          fontWeight={600}
        >
          {t('infraestructura.referenceLine')}
        </text>
      </svg>
    </EditorialChartFrame>
  )
}
