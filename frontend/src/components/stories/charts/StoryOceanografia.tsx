/**
 * StoryOceanografia — Timeline of PEMEX offshore contracts to Oceanografia.
 *
 * Shows the concentration pattern over time: a growing stream of contracts
 * from 2003-2013, then a sharp cutoff when the fraud exploded in Feb 2014.
 * Simple but precise — one vendor, one client, one 11-year relationship.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface YearRow {
  year: number
  contracts: number
  valueB: number // MXN billions
}

// Editorial approximation: Oceanografia had ~240 contracts with PEMEX
// subsidiaries totaling ~22.4B MXN between 2003 and 2014.
const TIMELINE: YearRow[] = [
  { year: 2003, contracts: 6,  valueB: 0.4 },
  { year: 2004, contracts: 11, valueB: 0.8 },
  { year: 2005, contracts: 14, valueB: 1.1 },
  { year: 2006, contracts: 18, valueB: 1.5 },
  { year: 2007, contracts: 22, valueB: 1.9 },
  { year: 2008, contracts: 27, valueB: 2.4 },
  { year: 2009, contracts: 29, valueB: 2.7 },
  { year: 2010, contracts: 32, valueB: 3.1 },
  { year: 2011, contracts: 26, valueB: 2.6 },
  { year: 2012, contracts: 22, valueB: 2.2 },
  { year: 2013, contracts: 21, valueB: 2.4 },
  { year: 2014, contracts: 12, valueB: 1.3 },
]

const W = 760
const H = 320
const PAD_L = 58
const PAD_R = 22
const PAD_T = 36
const PAD_B = 48
const CHART_W = W - PAD_L - PAD_R
const CHART_H = H - PAD_T - PAD_B

const ARREST_YEAR = 2014
const PEAK = Math.max(...TIMELINE.map((r) => r.valueB))

export function StoryOceanografia() {
  const { t } = useTranslation('storyCharts')
  const xFor = (i: number) => PAD_L + (i / (TIMELINE.length - 1)) * CHART_W
  const yFor = (v: number) => PAD_T + CHART_H - (v / PEAK) * CHART_H
  const barW = (CHART_W / TIMELINE.length) * 0.62

  const total = TIMELINE.reduce((s, r) => s + r.valueB, 0)
  const peakYear = TIMELINE.find((r) => r.valueB === PEAK)!

  return (
    <EditorialChartFrame
      kicker={t('oceanografia.kicker')}
      headline={t('oceanografia.headline')}
      lede={t('oceanografia.lede')}
      stats={[
        { value: `${total.toFixed(1)}B`, label: t('oceanografia.stat1Label'), accent: 'var(--color-risk-critical)' },
        {
          value: String(peakYear.year),
          label: `${t('oceanografia.stat2LabelPrefix')} ${peakYear.valueB.toFixed(1)}${t('oceanografia.stat2LabelSuffix')}`,
          accent: 'var(--color-risk-high)',
        },
        { value: t('oceanografia.stat3Value'), label: t('oceanografia.stat3Label'), accent: 'var(--color-oecd)' },
      ]}
      finding={{ label: t('oceanografia.findingLabel'), body: t('oceanografia.findingBody') }}
      footer={t('oceanografia.footer')}
      tone="bare"
    >
      <div className="rounded-sm border border-border bg-background p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('oceanografia.ariaLabel')}
        >
          {/* Y axis gridlines */}
          {[0, 1, 2, 3].map((v) => {
            const y = yFor(v)
            return (
              <g key={v}>
                <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="var(--color-border-hover)" strokeWidth={0.5} />
                <text
                  x={PAD_L - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--color-text-secondary)"
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                >
                  {v}B
                </text>
              </g>
            )
          })}

          {/* Y label */}
          <text
            x={14}
            y={PAD_T + CHART_H / 2}
            textAnchor="middle"
            fill="var(--color-text-muted)"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.1em"
            transform={`rotate(-90 14 ${PAD_T + CHART_H / 2})`}
          >
            {t('oceanografia.yAxisLabel')}
          </text>

          {/* Bars */}
          {TIMELINE.map((row, i) => {
            const cx = xFor(i)
            const barH = (row.valueB / PEAK) * CHART_H
            const y = PAD_T + CHART_H - barH
            const isArrest = row.year === ARREST_YEAR
            return (
              <g key={row.year}>
                <motion.rect
                  x={cx - barW / 2}
                  y={y}
                  width={barW}
                  height={barH}
                  fill={isArrest ? 'var(--color-sector-salud)' : 'var(--color-risk-medium)'}
                  fillOpacity={isArrest ? 0.9 : 0.75}
                  initial={{ height: 0, y: PAD_T + CHART_H }}
                  animate={{ height: barH, y }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
                {/* Contract count above bar */}
                <text
                  x={cx}
                  y={y - 4}
                  textAnchor="middle"
                  fill={isArrest ? 'var(--color-risk-critical)' : '#a8a29e'}
                  fontSize={8.5}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.contracts}
                </text>
                {/* Year label */}
                <text
                  x={cx}
                  y={H - PAD_B + 14}
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                >
                  '{String(row.year).slice(2)}
                </text>
              </g>
            )
          })}

          {/* Arrest annotation */}
          <g>
            <line
              x1={xFor(TIMELINE.length - 1)}
              y1={PAD_T}
              x2={xFor(TIMELINE.length - 1)}
              y2={PAD_T + CHART_H}
              stroke="var(--color-sector-salud)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.6}
            />
            <text
              x={xFor(TIMELINE.length - 1) - 4}
              y={PAD_T - 10}
              textAnchor="end"
              fill="var(--color-risk-critical)"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
              letterSpacing="0.08em"
            >
              {t('oceanografia.arrestAnnotation')}
            </text>
          </g>

          {/* Legend */}
          <g transform={`translate(${PAD_L}, ${H - 14})`}>
            <rect width={10} height={8} fill="var(--color-risk-medium)" fillOpacity={0.75} />
            <text x={14} y={7} fill="#a8a29e" fontSize={9} fontFamily="var(--font-family-mono)">
              {t('oceanografia.legendNote')}
            </text>
          </g>
        </svg>
      </div>
    </EditorialChartFrame>
  )
}
