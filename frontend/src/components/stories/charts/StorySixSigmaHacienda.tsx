/**
 * StorySixSigmaHacienda — Pure SVG win-rate anomaly.
 *
 * Two vertical dot columns for SixSigma vs Hacienda sector baseline:
 *   - Left column: SixSigma wins out of total attempts (near-100% win rate)
 *   - Right column: sector baseline — sparse wins
 * Plus a dot strip showing 147 contracts colored by risk level,
 * visualizing the 87.8% high-risk cluster.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

const TOTAL_ATTEMPTS = 50 // visualization scale (not actual count)
const SIXSIGMA_WINS = 46 // ~92% win rate visualization
const BASELINE_WINS = 8 // ~16% baseline

// 147 contract dots — colored by risk distribution
// 87.8% high/critical = 129; 12.2% medium/low = 18
const CONTRACT_DOTS = Array.from({ length: 147 }).map((_, i) => {
  if (i < 84) return 'critical' // 57%
  if (i < 129) return 'high' // 30.6%
  if (i < 142) return 'medium'
  return 'low'
})

const COLORS = {
  critical: 'var(--color-sector-salud)',
  high: 'var(--color-sector-infraestructura)',
  medium: 'var(--color-sector-energia)',
  low: 'var(--color-sector-hacienda)',
  win: 'var(--color-sector-salud)',
  lose: 'var(--color-text-muted)',
  baselineWin: 'var(--color-oecd)',
}

export function StorySixSigmaHacienda() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('sixSigma.kicker')}
      headline={t('sixSigma.headline')}
      lede={t('sixSigma.lede')}
      stats={[
        { value: t('sixSigma.stat1Value'), label: t('sixSigma.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('sixSigma.stat2Value'), label: t('sixSigma.stat2Label'), accent: 'var(--color-oecd)' },
        { value: t('sixSigma.stat3Value'), label: t('sixSigma.stat3Label'), accent: 'var(--color-risk-high)' },
      ]}
      finding={{ label: t('sixSigma.findingLabel'), body: t('sixSigma.findingBody') }}
      footer={t('sixSigma.footer')}
    >
      {/* Win-rate comparison + contract strip */}
      <div className="grid md:grid-cols-[280px_1fr] gap-5">
        {/* Two columns comparison */}
        <div className="rounded-lg bg-background-card border border-border p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
            {t('sixSigma.winRateHeader')}
          </p>
          <svg viewBox="0 0 280 310" className="w-full h-auto" role="img" aria-label={t('sixSigma.winRateHeader')}>
            {/* Titles */}
            <text x={65} y={20} textAnchor="middle" fill="var(--color-risk-critical)" fontSize={11} fontFamily="var(--font-family-mono)" fontWeight={700}>
              {t('sixSigma.ssLabel')}
            </text>
            <text x={215} y={20} textAnchor="middle" fill="var(--color-oecd)" fontSize={11} fontFamily="var(--font-family-mono)" fontWeight={700}>
              {t('sixSigma.baselineLabel')}
            </text>

            {/* SixSigma column — 50 dots, 46 red (won) */}
            {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => {
              const col = i % 5
              const row = Math.floor(i / 5)
              const cx = 35 + col * 14
              const cy = 40 + row * 14
              const won = i < SIXSIGMA_WINS
              return (
                <motion.circle
                  key={`ss-${i}`}
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill={won ? COLORS.win : COLORS.lose}
                  stroke={won ? 'none' : 'var(--color-text-secondary)'}
                  strokeWidth={0.5}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.012 }}
                />
              )
            })}

            {/* Baseline column — 50 dots, 8 cyan (won) */}
            {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => {
              const col = i % 5
              const row = Math.floor(i / 5)
              const cx = 185 + col * 14
              const cy = 40 + row * 14
              const won = i < BASELINE_WINS
              return (
                <motion.circle
                  key={`bl-${i}`}
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill={won ? COLORS.baselineWin : COLORS.lose}
                  stroke={won ? 'none' : 'var(--color-text-secondary)'}
                  strokeWidth={0.5}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.6 + i * 0.012 }}
                />
              )
            })}

            {/* Result labels */}
            <text x={65} y={185} textAnchor="middle" fill="var(--color-risk-critical)" fontSize={22} fontFamily="var(--font-family-mono)" fontWeight={700}>
              92%
            </text>
            <text x={65} y={201} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              {t('sixSigma.wonSuffix')}
            </text>

            <text x={215} y={185} textAnchor="middle" fill="var(--color-oecd)" fontSize={22} fontFamily="var(--font-family-mono)" fontWeight={700}>
              16%
            </text>
            <text x={215} y={201} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              {t('sixSigma.wonSuffix')}
            </text>

            {/* Divider */}
            <line x1={140} y1={35} x2={140} y2={175} stroke="var(--color-border-hover)" strokeWidth={1} strokeDasharray="3 3" />

            {/* Callout */}
            <text x={140} y={230} textAnchor="middle" fill="var(--color-risk-medium)" fontSize={10} fontFamily="var(--font-family-mono)" fontWeight={600}>
              {t('sixSigma.calloutMain')}
            </text>
            <text x={140} y={248} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              {t('sixSigma.calloutLine1')}
            </text>
            <text x={140} y={262} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              {t('sixSigma.calloutLine2')}
            </text>
            <text x={140} y={276} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              {t('sixSigma.calloutLine3')}
            </text>
          </svg>
        </div>

        {/* 147 contracts strip */}
        <div className="rounded-lg bg-background-card border border-border p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
            {t('sixSigma.contractsHeader')}
          </p>
          <svg viewBox="0 0 420 260" className="w-full h-auto" role="img" aria-label={t('sixSigma.contractsAria')}>
            {CONTRACT_DOTS.map((level, i) => {
              const col = i % 15
              const row = Math.floor(i / 15)
              const cx = 12 + col * 26
              const cy = 18 + row * 24
              return (
                <motion.circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={8}
                  fill={COLORS[level as keyof typeof COLORS]}
                  fillOpacity={0.9}
                  stroke="var(--color-text-primary)"
                  strokeWidth={1}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.005 }}
                />
              )
            })}
          </svg>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-text-muted mt-3 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-risk-critical"></div>
              <span>{t('sixSigma.legendCritical')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-risk-high"></div>
              <span>{t('sixSigma.legendHigh')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-risk-medium"></div>
              <span>{t('sixSigma.legendMedium')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-text-muted"></div>
              <span>{t('sixSigma.legendLow')}</span>
            </div>
          </div>
        </div>
      </div>
    </EditorialChartFrame>
  )
}
