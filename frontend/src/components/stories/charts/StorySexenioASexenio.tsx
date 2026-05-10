/**
 * StorySexenioASexenio — Five administrations, one trend.
 *
 * Each administration is a column. For each: a dot strip showing DA rate.
 * Each dot = 2pp. 50 dots per column = 0-100%. Fox=41, Calderón=62,
 * Peña=73, AMLO=80, Sheinbaum=79. The comparative story made vivid.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface SexenioCol {
  president: string
  short: string
  years: string
  party: string
  partyColor: string
  daRate: number
}

const DATA: SexenioCol[] = [
  { president: 'Fox',       short: 'Fox',       years: '2000-06', party: 'PAN',    partyColor: '#002395', daRate: 41 },
  { president: 'Calderón',  short: 'Calderón',  years: '2006-12', party: 'PAN',    partyColor: '#002395', daRate: 62 },
  { president: 'Peña Nieto',short: 'Peña',      years: '2012-18', party: 'PRI',    partyColor: '#008000', daRate: 73 },
  { president: 'AMLO',      short: 'AMLO',      years: '2018-24', party: 'MORENA', partyColor: '#8B0000', daRate: 80 },
  { president: 'Sheinbaum', short: 'Sheinbaum', years: '2024-',   party: 'MORENA', partyColor: '#8B0000', daRate: 79 },
]

const OECD_LIMIT = 25

const DOTS = 50 // each = 2pp
const DOT_R = 3.6
const DOT_GAP_Y = 8
const COL_W = 128
const COL_GAP = 18
const TOP_PAD = 90
const BOT_PAD = 80
const LEFT_PAD = 36
const STRIP_H = DOTS * DOT_GAP_Y

const W = LEFT_PAD + DATA.length * COL_W + (DATA.length - 1) * COL_GAP + 30
const H = TOP_PAD + STRIP_H + BOT_PAD

function colorForRate(rate: number): string {
  if (rate >= 75) return 'var(--color-sector-salud)'  // critical red
  if (rate >= 60) return 'var(--color-sector-infraestructura)'  // orange
  if (rate >= 40) return 'var(--color-risk-high)'  // amber
  return 'var(--color-sector-hacienda)'                   // green
}

export function StorySexenioASexenio() {
  const { t } = useTranslation('storyCharts')
  const oecdDotIdx = Math.round(OECD_LIMIT / 2) // 12.5 → 13 dots from bottom

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        {t('sexenioASexenio.kicker')}
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        {t('sexenioASexenio.headline')}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        {t('sexenioASexenio.lede')}
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-xl font-mono font-bold text-risk-critical tabular-nums">{t('sexenioASexenio.stat1Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('sexenioASexenio.stat1Label')}
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-xl font-mono font-bold text-risk-high tabular-nums">{t('sexenioASexenio.stat2Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('sexenioASexenio.stat2Label')}
          </div>
        </div>
        <div className="border-l-2 border-cyan-500 pl-3 py-1">
          <div className="text-xl font-mono font-bold text-[color:var(--color-oecd)] tabular-nums">{t('sexenioASexenio.stat3Value')}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            {t('sexenioASexenio.stat3Label')}
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-background p-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[640px]"
          role="img"
          aria-label={t('sexenioASexenio.ariaLabel')}
        >
          {/* Y axis gridlines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = TOP_PAD + STRIP_H - (pct / 100) * STRIP_H
            const isOECD = pct === 25
            return (
              <g key={pct}>
                <line
                  x1={LEFT_PAD - 8}
                  y1={y}
                  x2={W - 10}
                  y2={y}
                  stroke={isOECD ? 'var(--color-oecd)' : '#1f1f23'}
                  strokeWidth={isOECD ? 1 : 0.5}
                  strokeDasharray={isOECD ? '4 3' : undefined}
                  opacity={isOECD ? 0.8 : 1}
                />
                <text
                  x={LEFT_PAD - 12}
                  y={y + 3}
                  textAnchor="end"
                  fill={isOECD ? 'var(--color-oecd)' : 'var(--color-text-secondary)'}
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={isOECD ? 700 : 400}
                >
                  {pct}%
                </text>
                {isOECD && (
                  <text
                    x={W - 12}
                    y={y - 4}
                    textAnchor="end"
                    fill="var(--color-oecd)"
                    fontSize={8.5}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={700}
                  >
                    {t('sexenioASexenio.oecdLabel')}
                  </text>
                )}
              </g>
            )
          })}

          {/* Columns */}
          {DATA.map((sex, colIdx) => {
            const cx = LEFT_PAD + colIdx * (COL_W + COL_GAP) + COL_W / 2
            const filled = Math.round(sex.daRate / 2)
            const color = colorForRate(sex.daRate)

            return (
              <g key={sex.president}>
                {/* President name header */}
                <text
                  x={cx}
                  y={28}
                  textAnchor="middle"
                  fill="var(--color-background-elevated)"
                  fontSize={13}
                  fontFamily="var(--font-family-serif)"
                  fontWeight={700}
                >
                  {sex.short}
                </text>
                <text
                  x={cx}
                  y={44}
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                >
                  {sex.years}
                </text>
                {/* Party dot */}
                <circle cx={cx - 28} cy={56} r={2.5} fill={sex.partyColor} />
                <text
                  x={cx - 22}
                  y={59}
                  fill="var(--color-text-muted)"
                  fontSize={8.5}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                  letterSpacing="0.05em"
                >
                  {sex.party}
                </text>

                {/* Headline % */}
                <text
                  x={cx}
                  y={78}
                  textAnchor="middle"
                  fill={color}
                  fontSize={22}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={800}
                >
                  {sex.daRate}%
                </text>

                {/* Dot strip (bottom-up fill) */}
                {Array.from({ length: DOTS }).map((_, i) => {
                  // i=0 is bottom dot, i=DOTS-1 is top
                  const y = TOP_PAD + STRIP_H - (i + 0.5) * DOT_GAP_Y
                  const isFilled = i < filled
                  const isOecdLine = i === oecdDotIdx - 1
                  return (
                    <motion.circle
                      key={i}
                      cx={cx}
                      cy={y}
                      r={DOT_R}
                      fill={isFilled ? color : 'var(--color-background-elevated)'}
                      stroke={isFilled ? 'none' : isOecdLine ? '#22d3ee44' : 'var(--color-border-hover)'}
                      strokeWidth={isFilled ? 0 : 0.6}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: colIdx * 0.08 + i * 0.008 }}
                    />
                  )
                })}

                {/* Bottom caption */}
                <text
                  x={cx}
                  y={H - 48}
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {sex.president}
                </text>
                {/* Sub-caption: X-axis OECD multiple */}
                <text
                  x={cx}
                  y={H - 32}
                  textAnchor="middle"
                  fill="var(--color-text-secondary)"
                  fontSize={8.5}
                  fontFamily="var(--font-family-mono)"
                >
                  {`${(sex.daRate / OECD_LIMIT).toFixed(1)}${t('sexenioASexenio.oecdMultiplierSuffix')}`}
                </text>
              </g>
            )
          })}

          {/* Arrow: trend line connecting tops */}
          <g opacity={0.25}>
            {DATA.slice(0, -1).map((sex, i) => {
              const next = DATA[i + 1]
              const cx1 = LEFT_PAD + i * (COL_W + COL_GAP) + COL_W / 2
              const cx2 = LEFT_PAD + (i + 1) * (COL_W + COL_GAP) + COL_W / 2
              const y1 = TOP_PAD + STRIP_H - (sex.daRate / 100) * STRIP_H
              const y2 = TOP_PAD + STRIP_H - (next.daRate / 100) * STRIP_H
              return (
                <line
                  key={i}
                  x1={cx1}
                  y1={y1}
                  x2={cx2}
                  y2={y2}
                  stroke="var(--color-risk-high)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
              )
            })}
          </g>

          {/* Bottom legend */}
          <text
            x={W / 2}
            y={H - 10}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
          >
            {t('sexenioASexenio.bottomLegend')}
          </text>
        </svg>
      </div>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-risk-high mb-1">
          {t('sexenioASexenio.findingLabel')}
        </p>
        <p className="text-sm text-text-secondary">
          {t('sexenioASexenio.findingBody')}
        </p>
      </div>

      <p className="text-[10px] text-text-muted font-mono">
        {t('sexenioASexenio.footer')}
      </p>
    </motion.div>
  )
}
