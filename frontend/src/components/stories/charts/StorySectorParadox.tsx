/**
 * StorySectorParadox — Pure SVG scatter grid.
 *
 * Each point is a sector. X = direct-award rate, Y = high-risk contract
 * share. Size = total spend (MXN T). Color = sector. The paradox:
 * Infraestructura has LOW DA but HIGH structural risk — proving that
 * "no competition" ≠ corruption. The eye must see both dimensions.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SECTOR_COLORS } from '@/lib/constants'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface Pt {
  code: string
  label: string
  daPct: number
  highRiskPct: number
  valueT: number // trillions
}

const PTS: Pt[] = [
  { code: 'agricultura',     label: 'Agricultura',     daPct: 93.4, highRiskPct: 2.1,  valueT: 0.3 },
  { code: 'defensa',         label: 'Defensa',         daPct: 89.2, highRiskPct: 3.8,  valueT: 0.6 },
  { code: 'gobernacion',     label: 'Gobernación',     daPct: 85.1, highRiskPct: 7.2,  valueT: 0.5 },
  { code: 'tecnologia',      label: 'Tecnología',      daPct: 82.7, highRiskPct: 9.1,  valueT: 0.4 },
  { code: 'salud',           label: 'Salud',           daPct: 78.9, highRiskPct: 12.6, valueT: 1.8 },
  { code: 'trabajo',         label: 'Trabajo',         daPct: 78.3, highRiskPct: 6.4,  valueT: 0.2 },
  { code: 'energia',         label: 'Energía',         daPct: 77.6, highRiskPct: 14.8, valueT: 2.6 },
  { code: 'hacienda',        label: 'Hacienda',        daPct: 76.8, highRiskPct: 8.2,  valueT: 0.7 },
  { code: 'infraestructura', label: 'Infraestructura', daPct: 74.2, highRiskPct: 18.3, valueT: 2.1 },
  { code: 'ambiente',        label: 'Ambiente',        daPct: 73.9, highRiskPct: 5.1,  valueT: 0.1 },
  { code: 'educacion',       label: 'Educación',       daPct: 71.5, highRiskPct: 7.8,  valueT: 0.4 },
  { code: 'otros',           label: 'Otros',           daPct: 68.3, highRiskPct: 8.9,  valueT: 0.4 },
]

const W = 680
const H = 440
const PAD = { top: 30, right: 30, bottom: 50, left: 60 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const X_MIN = 65
const X_MAX = 100
const Y_MIN = 0
const Y_MAX = 20

function xFor(v: number) {
  return PAD.left + ((v - X_MIN) / (X_MAX - X_MIN)) * PLOT_W
}
function yFor(v: number) {
  return PAD.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H
}

function colorFor(code: string): string {
  return (SECTOR_COLORS as Record<string, string>)[code] || 'var(--color-sector-otros)'
}

export function StorySectorParadox() {
  const { t } = useTranslation('storyCharts')
  return (
    <EditorialChartFrame
      kicker={t('sectorParadox.kicker')}
      headline={t('sectorParadox.headline')}
      subline={t('sectorParadox.subline')}
      finding={{ label: t('sectorParadox.findingLabel'), body: t('sectorParadox.findingBody') }}
      footer={t('sectorParadox.footer')}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('sectorParadox.ariaLabel')}
      >
        {/* Median cross — neutral dashed guides (no colored quadrant tints) */}
        <line
          x1={xFor(80)}
          x2={xFor(80)}
          y1={PAD.top}
          y2={H - PAD.bottom}
          stroke="var(--color-border-hover)"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={yFor(10)}
          y2={yFor(10)}
          stroke="var(--color-border-hover)"
          strokeDasharray="4 4"
          strokeWidth={1}
        />

        {/* Grid */}
        {[5, 10, 15, 20].map((v) => (
          <g key={`yg-${v}`}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yFor(v)} y2={yFor(v)} stroke="var(--color-border-hover)" strokeDasharray="2 4" />
            <text x={PAD.left - 8} y={yFor(v) + 3} textAnchor="end" fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)">
              {v}%
            </text>
          </g>
        ))}
        {[70, 80, 90, 100].map((v) => (
          <g key={`xg-${v}`}>
            <line x1={xFor(v)} x2={xFor(v)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-border-hover)" strokeDasharray="2 4" />
            <text x={xFor(v)} y={H - PAD.bottom + 16} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)">
              {v}%
            </text>
          </g>
        ))}

        {/* Axis titles */}
        <text
          x={PAD.left + PLOT_W / 2}
          y={H - 12}
          textAnchor="middle"
          fill="var(--color-text-muted)"
          fontSize={10}
          fontFamily="var(--font-family-mono)"
          letterSpacing="0.1em"
        >
          {t('sectorParadox.xAxisLabel')}
        </text>
        <text
          x={15}
          y={PAD.top + PLOT_H / 2}
          textAnchor="middle"
          fill="var(--color-text-muted)"
          fontSize={10}
          fontFamily="var(--font-family-mono)"
          letterSpacing="0.1em"
          transform={`rotate(-90, 15, ${PAD.top + PLOT_H / 2})`}
        >
          {t('sectorParadox.yAxisLabel')}
        </text>

        {/* Points */}
        {PTS.map((p, i) => {
          const r = 6 + Math.sqrt(p.valueT) * 14
          const color = colorFor(p.code)
          const isParadox = p.code === 'infraestructura' || p.code === 'agricultura'
          return (
            <motion.g
              key={p.code}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
            >
              <circle
                cx={xFor(p.daPct)}
                cy={yFor(p.highRiskPct)}
                r={r}
                fill={color}
                fillOpacity={isParadox ? 0.6 : 0.35}
                stroke={color}
                strokeWidth={isParadox ? 2.5 : 1}
              />
              <text
                x={xFor(p.daPct)}
                y={yFor(p.highRiskPct) + r + 12}
                textAnchor="middle"
                fill={isParadox ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
                fontSize={isParadox ? 11 : 9}
                fontWeight={isParadox ? 700 : 500}
                fontFamily="var(--font-family-mono)"
              >
                {p.label}
              </text>
            </motion.g>
          )
        })}

        {/* Paradox annotations */}
        <g>
          <text x={xFor(74)} y={yFor(18)} fill="var(--color-risk-medium)" fontSize={10} fontFamily="var(--font-family-mono)" fontWeight={600}>
            {t('sectorParadox.annotationLeft')}
          </text>
          <text x={xFor(92)} y={yFor(3)} fill="var(--color-risk-medium)" fontSize={10} fontFamily="var(--font-family-mono)" fontWeight={600} textAnchor="end">
            {t('sectorParadox.annotationRight')}
          </text>
        </g>
      </svg>
    </EditorialChartFrame>
  )
}
