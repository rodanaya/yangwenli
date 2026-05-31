/**
 * StoryCartelCorazon — Pure SVG overpayment comparison.
 *
 * Each row = a cardiac device. Two dot strips per row:
 *   - gray strip = estimated OECD competitive market price
 *   - red strip  = actual IMSS price paid
 * Each dot = 5K MXN. The red overhang visualizes monopoly premium.
 *
 * Bilingual via useTranslation.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface Device {
  nameKey: 'deviceStent' | 'devicePacemaker' | 'deviceDefibrillator' | 'deviceValve' | 'devicePump' | 'deviceOxygenator'
  marketK: number // thousands MXN
  imssK: number   // thousands MXN
  volume: number  // annual units
}

// Approximate cardiac device pricing based on Vitalmex-era IMSS contracts.
// Market price reflects OECD average; IMSS price reflects observed COMPRANET values.
const DEVICES: Device[] = [
  { nameKey: 'deviceStent',        marketK: 18,  imssK: 26,  volume: 8200  },
  { nameKey: 'devicePacemaker',    marketK: 95,  imssK: 138, volume: 3400  },
  { nameKey: 'deviceDefibrillator',marketK: 260, imssK: 370, volume: 1100  },
  { nameKey: 'deviceValve',        marketK: 155, imssK: 212, volume: 2100  },
  { nameKey: 'devicePump',         marketK: 340, imssK: 458, volume: 480   },
  { nameKey: 'deviceOxygenator',   marketK: 24,  imssK: 34,  volume: 14500 },
]

const DOT_K = 8 // each dot = 8K MXN
const DOT_R = 3
const DOT_GAP = 7.5
const STRIP_H = 10
const LABEL_W = 180
const MAX_DOTS = 64 // 512K MXN cap for visualization

const W = 740
const ROW_H = STRIP_H * 2 + 16
const H = 50 + DEVICES.length * ROW_H + 30

export function StoryCartelCorazon() {
  const { t, i18n } = useTranslation('storyCharts')
  const isEs = i18n.language.startsWith('es')

  return (
    <EditorialChartFrame
      kicker={t('cartelCorazon.kicker')}
      headline={t('cartelCorazon.headline')}
      lede={t('cartelCorazon.lede')}
      stats={[
        {
          value: t('cartelCorazon.stat1Value'),
          label: t('cartelCorazon.stat1Label'),
          accent: 'var(--color-risk-critical)',
        },
        {
          value: t('cartelCorazon.stat2Value'),
          label: t('cartelCorazon.stat2Label'),
          accent: 'var(--color-risk-high)',
        },
      ]}
      finding={{
        label: t('cartelCorazon.findingLabel'),
        body: t('cartelCorazon.findingBody'),
      }}
      footer={t('cartelCorazon.footer')}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('cartelCorazon.ariaLabel')}
      >
        {/* Header */}
        <text
          x={LABEL_W - 8}
          y={24}
          textAnchor="end"
          fill="var(--color-text-secondary)"
          fontSize={9}
          fontFamily="var(--font-family-mono)"
          letterSpacing="0.1em"
        >
          {t('cartelCorazon.deviceHeader')}
        </text>
        <g transform={`translate(${LABEL_W}, 20)`}>
          <circle cx={3} cy={2} r={3} fill="var(--color-text-secondary)" />
          <text x={12} y={6} fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
            {t('cartelCorazon.marketLegend')}
          </text>
          <circle cx={140} cy={2} r={3} fill="var(--color-risk-critical)" />
          <text x={149} y={6} fill="var(--color-risk-critical)" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
            {t('cartelCorazon.imssLegend')}
          </text>
        </g>

        {DEVICES.map((device, idx) => {
          const y0 = 50 + idx * ROW_H
          const marketDots = Math.min(MAX_DOTS, Math.round(device.marketK / DOT_K))
          const imssDots = Math.min(MAX_DOTS, Math.round(device.imssK / DOT_K))
          const overpay = device.imssK - device.marketK
          const premiumPct = ((overpay / device.marketK) * 100).toFixed(0)
          const deviceName = t(`cartelCorazon.${device.nameKey}`)
          const unitsLabel = t('cartelCorazon.unitsLabel')

          return (
            <g key={device.nameKey}>
              {/* Device label */}
              <text
                x={LABEL_W - 8}
                y={y0 + STRIP_H + 6}
                textAnchor="end"
                fill="var(--color-text-muted)"
                fontSize={10}
                fontFamily="var(--font-family-mono)"
              >
                {deviceName}
              </text>
              <text
                x={LABEL_W - 8}
                y={y0 + STRIP_H + 18}
                textAnchor="end"
                fill="var(--color-text-secondary)"
                fontSize={8}
                fontFamily="var(--font-family-mono)"
              >
                {device.volume.toLocaleString(isEs ? 'es-MX' : 'en-US')} {unitsLabel}
              </text>

              {/* Market price strip (gray) */}
              {Array.from({ length: MAX_DOTS }).map((_, i) => {
                const isFilled = i < marketDots
                return (
                  <motion.circle
                    key={`m-${i}`}
                    cx={LABEL_W + i * DOT_GAP + DOT_R}
                    cy={y0 + STRIP_H / 2}
                    r={DOT_R}
                    fill={isFilled ? 'var(--color-text-secondary)' : 'var(--color-background-elevated)'}
                    stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                    strokeWidth={isFilled ? 0 : 0.5}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: idx * 0.06 + i * 0.003 }}
                  />
                )
              })}
              <text
                x={LABEL_W + MAX_DOTS * DOT_GAP + 10}
                y={y0 + STRIP_H / 2 + 3}
                fill="var(--color-text-muted)"
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fontWeight={600}
              >
                ${device.marketK}K
              </text>

              {/* IMSS paid strip (red, extends further) */}
              {Array.from({ length: MAX_DOTS }).map((_, i) => {
                const isFilled = i < imssDots
                const isOverpay = i >= marketDots && i < imssDots
                return (
                  <motion.circle
                    key={`i-${i}`}
                    cx={LABEL_W + i * DOT_GAP + DOT_R}
                    cy={y0 + STRIP_H + 6 + STRIP_H / 2}
                    r={DOT_R}
                    fill={isFilled ? (isOverpay ? 'var(--color-risk-critical)' : 'var(--color-text-muted)') : 'var(--color-background-elevated)'}
                    stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                    strokeWidth={isFilled ? 0 : 0.5}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: idx * 0.06 + 0.4 + i * 0.003 }}
                  />
                )
              })}
              <text
                x={LABEL_W + MAX_DOTS * DOT_GAP + 10}
                y={y0 + STRIP_H + 6 + STRIP_H / 2 + 3}
                fill="var(--color-risk-critical)"
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fontWeight={600}
              >
                ${device.imssK}K <tspan fill="var(--color-risk-medium)">(+{premiumPct}%)</tspan>
              </text>
            </g>
          )
        })}
      </svg>
    </EditorialChartFrame>
  )
}
