/**
 * StoryCuartaAdjudicacion — Stepped horizontal bar comparison.
 *
 * Four horizontal bars stacked top-to-bottom (Calderón → Peña Nieto →
 * AMLO average → AMLO 2023 peak). Each bar's length equals the era's
 * direct-award rate; an OECD 25% tick marks the ceiling. Replaces a
 * concentric ring layout that conflated radius with severity and used
 * raw-hex track colors.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

const RINGS = [
  { era: 'Calderón',         years: '2007-2012', rate: 42.3, color: 'var(--color-era-calderon, #60a5fa)' },
  { era: 'Peña Nieto',       years: '2013-2018', rate: 73.1, color: 'var(--color-era-pena, #f87171)' },
  { era: 'AMLO (promedio)',  years: '2019-2024', rate: 79.4, color: 'var(--color-era-amlo, #fbbf24)' },
  { era: 'AMLO · pico 2023', years: '2023',      rate: 82.2, color: 'var(--color-risk-critical)' },
]

// Stepped horizontal bar geometry
const CHART_W = 560
const ROW_H = 56
const ROW_GAP = 14
const LABEL_W = 160
const VALUE_W = 86
const BAR_W = CHART_W - LABEL_W - VALUE_W
const BAR_H = 18
const CHART_H = RINGS.length * (ROW_H + ROW_GAP) + 28

const OECD_X = LABEL_W + (25 / 100) * BAR_W

export function StoryCuartaAdjudicacion() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('cuartaAdjudicacion.kicker')}
      headline={t('cuartaAdjudicacion.headline')}
      subline={t('cuartaAdjudicacion.subline')}
      finding={{ label: t('cuartaAdjudicacion.findingLabel'), body: t('cuartaAdjudicacion.findingBody') }}
      footer={t('cuartaAdjudicacion.footer')}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        {/* Stepped horizontal bars */}
        <div className="flex items-center justify-center">
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="w-full max-w-2xl h-auto"
            role="img"
            aria-label={t('cuartaAdjudicacion.ariaLabel')}
          >
            {/* OECD 25% reference line, drawn first so bars sit on top */}
            <line
              x1={OECD_X}
              x2={OECD_X}
              y1={4}
              y2={CHART_H - 12}
              stroke="var(--color-oecd)"
              strokeWidth={1}
              strokeDasharray="3 4"
              opacity={0.6}
            />
            <text
              x={OECD_X}
              y={CHART_H - 2}
              textAnchor="middle"
              fill="var(--color-oecd)"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              letterSpacing="0.08em"
            >
              {`OECD 25%`}
            </text>

            {RINGS.map((ring, i) => {
              const y = 8 + i * (ROW_H + ROW_GAP)
              const barLen = (ring.rate / 100) * BAR_W

              return (
                <g key={ring.era}>
                  {/* Era label */}
                  <text
                    x={LABEL_W - 10}
                    y={y + BAR_H / 2 + 4}
                    textAnchor="end"
                    fill="var(--color-text-secondary)"
                    fontSize={11}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={600}
                  >
                    {ring.era}
                  </text>
                  <text
                    x={LABEL_W - 10}
                    y={y + BAR_H / 2 + 18}
                    textAnchor="end"
                    fill="var(--color-text-muted)"
                    fontSize={9}
                    fontFamily="var(--font-family-mono)"
                  >
                    {ring.years}
                  </text>

                  {/* Track (full bar, neutral) */}
                  <rect
                    x={LABEL_W}
                    y={y}
                    width={BAR_W}
                    height={BAR_H}
                    fill="var(--color-background-elevated)"
                    stroke="var(--color-border-hover)"
                    strokeWidth={0.5}
                    rx={2}
                  />
                  {/* Filled bar = DA rate */}
                  <motion.rect
                    x={LABEL_W}
                    y={y}
                    height={BAR_H}
                    fill={ring.color}
                    rx={2}
                    initial={{ width: 0 }}
                    animate={{ width: barLen }}
                    transition={{ duration: 1.0, delay: i * 0.18, ease: 'easeOut' }}
                  />

                  {/* Value */}
                  <text
                    x={LABEL_W + BAR_W + 10}
                    y={y + BAR_H / 2 + 6}
                    fill={ring.color}
                    fontSize={20}
                    fontFamily="'Playfair Display', serif"
                    fontStyle="italic"
                    fontWeight={800}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {ring.rate}%
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-col justify-center gap-3 min-w-[200px]">
          {RINGS.map((ring, i) => (
            <motion.div
              key={ring.era}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              className="border-l-2 pl-3"
              style={{ borderColor: ring.color }}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className="font-playfair-display italic font-extrabold tabular-nums text-2xl"
                  style={{ color: ring.color }}
                >
                  {ring.rate}%
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  {`${(ring.rate / 25).toFixed(1)}${t('cuartaAdjudicacion.ringMultiplierSuffix')}`}
                </span>
              </div>
              <div className="text-xs text-text-secondary font-semibold">{ring.era}</div>
              <div className="text-[10px] text-text-muted font-mono">{ring.years}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </EditorialChartFrame>
  )
}
