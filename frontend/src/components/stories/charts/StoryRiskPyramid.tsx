/**
 * StoryRiskPyramid — Pure SVG dot pyramid.
 *
 * Four risk tiers as horizontal rows of dots. Each dot = 1% of total
 * contracts. Critical (red, 6%) sits at the narrow apex; Low (green, 59.4%)
 * spans the full base. The reader sees at a glance how rare the critical
 * tier is — and that's precisely where the money concentrates.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const TIERS = [
  { level: 'Critical', pct: 6.0,  valuePct: 41.8, color: 'var(--color-sector-salud)', threshold: '≥ 0.60', count: '184K' },
  { level: 'High',     pct: 7.5,  valuePct: 18.2, color: 'var(--color-sector-infraestructura)', threshold: '≥ 0.40', count: '229K' },
  { level: 'Medium',   pct: 26.8, valuePct: 23.4, color: 'var(--color-sector-energia)', threshold: '≥ 0.25', count: '821K' },
  { level: 'Low',      pct: 59.4, valuePct: 16.6, color: 'var(--color-sector-hacienda)', threshold: '< 0.25', count: '1.82M' },
]

const DOTS_PER_ROW = 50 // each dot = 2% of total contracts
const DOT_R = 4
const DOT_GAP = 10
const ROW_H = 34

// SVG dims
const LEFT_LABEL_W = 100
const RIGHT_LABEL_W = 140
const W = LEFT_LABEL_W + DOTS_PER_ROW * DOT_GAP + RIGHT_LABEL_W
const H = 40 + TIERS.length * ROW_H + 30

export function StoryRiskPyramid() {
  const { t } = useTranslation('storyCharts')
  const maxValuePct = Math.max(...TIERS.map((t) => t.valuePct))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        {t('riskPyramid.kicker')}
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        {t('riskPyramid.headline')}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        {t('riskPyramid.lede')}
      </p>

      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-xl font-mono font-bold text-risk-critical">{t('riskPyramid.stat1Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('riskPyramid.stat1Label')}
          </div>
        </div>
        <div className="border-l-2 border-orange-500 pl-3 py-1">
          <div className="text-xl font-mono font-bold text-orange-400">{t('riskPyramid.stat2Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('riskPyramid.stat2Label')}
          </div>
        </div>
        <div className="border-l-2 border-text-muted pl-3 py-1">
          <div className="text-xl font-mono font-bold text-text-muted">{t('riskPyramid.stat3Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('riskPyramid.stat3Label')}
          </div>
        </div>
      </div>

      {/* The pyramid */}
      <div className="rounded-sm border border-border bg-background p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('riskPyramid.ariaLabel')}
        >
          {/* Column headers */}
          <text x={LEFT_LABEL_W - 8} y={20} textAnchor="end" fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {t('riskPyramid.levelHeader')}
          </text>
          <text x={LEFT_LABEL_W + (DOTS_PER_ROW * DOT_GAP) / 2} y={20} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {t('riskPyramid.contractsHeader')}
          </text>
          <text x={W - 8} y={20} textAnchor="end" fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {t('riskPyramid.valueHeader')}
          </text>

          {TIERS.map((tier, rowIdx) => {
            const y = 40 + rowIdx * ROW_H + ROW_H / 2
            const filled = Math.round(tier.pct / 2)
            // Center the dots within the row
            const totalWidth = DOTS_PER_ROW * DOT_GAP
            const filledWidth = filled * DOT_GAP
            const offsetX = LEFT_LABEL_W + (totalWidth - filledWidth) / 2

            return (
              <g key={tier.level}>
                {/* Tier label (left) */}
                <text x={LEFT_LABEL_W - 8} y={y + 3} textAnchor="end" fill={tier.color} fontSize={12} fontFamily="var(--font-family-mono)" fontWeight={700}>
                  {tier.level}
                </text>
                <text x={LEFT_LABEL_W - 8} y={y + 16} textAnchor="end" fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)">
                  {tier.threshold}
                </text>

                {/* Dots (centered, filled count only — reader focuses on width) */}
                {Array.from({ length: filled }).map((_, i) => (
                  <motion.circle
                    key={i}
                    cx={offsetX + i * DOT_GAP + DOT_R}
                    cy={y}
                    r={DOT_R}
                    fill={tier.color}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: rowIdx * 0.15 + i * 0.012 }}
                  />
                ))}

                {/* Count */}
                <text x={LEFT_LABEL_W + totalWidth + 8} y={y + 3} fill="var(--color-text-muted)" fontSize={10} fontFamily="var(--font-family-mono)">
                  {tier.pct}% · {tier.count}
                </text>

                {/* Value-share mini dot-matrix */}
                {(() => {
                  const N = 10, DR = 2, DG = 7
                  const filled = Math.max(1, Math.round((tier.valuePct / maxValuePct) * N))
                  const baseX = LEFT_LABEL_W + totalWidth + 8
                  return Array.from({ length: N }).map((_, k) => (
                    <circle key={`v-${k}`} cx={baseX + k * DG + DR} cy={y + 10.5} r={DR}
                      fill={k < filled ? tier.color : 'var(--color-background-elevated)'}
                      stroke={k < filled ? undefined : 'var(--color-border-hover)'}
                      strokeWidth={k < filled ? 0 : 0.5}
                      fillOpacity={k < filled ? 0.55 : 1}
                    />
                  ))
                })()}
                <text x={LEFT_LABEL_W + totalWidth + 12 + 74} y={y + 13} fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
                  {tier.valuePct}%
                </text>
              </g>
            )
          })}

          {/* Summary line at bottom */}
          <text
            x={W / 2}
            y={H - 10}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
          >
            {t('riskPyramid.summaryLine')}
          </text>
        </svg>
      </div>

      {/* Finding */}
      <div className="rounded-sm border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-risk-critical mb-1">
          {t('riskPyramid.findingLabel')}
        </p>
        <p className="text-sm text-text-secondary">
          {t('riskPyramid.findingPrefix')}
          <strong className="text-risk-critical"> {t('riskPyramid.findingStrong')}</strong>
          {t('riskPyramid.findingSuffix')}
        </p>
      </div>

      <p className="text-[10px] text-text-muted font-mono">
        {t('riskPyramid.footer')}
      </p>
    </motion.div>
  )
}
