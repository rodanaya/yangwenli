/**
 * StoryCeroCompetenciaChart — Pure SVG dot-matrix of competitive %
 * by sector, sorted ASC. Each dot = 1pp (0-80% domain). OECD 75%
 * target marked with a cyan vertical line that no strip reaches.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SECTOR_COLORS } from '@/lib/constants'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface SectorRow {
  sector: string
  code: string
  competitive: number
}

const SECTOR_KEY_MAP: Record<string, string> = {
  'Agricultura': 'agricultura',
  'Educacion': 'educacion',
  'Trabajo': 'trabajo',
  'Hacienda': 'hacienda',
  'Otros': 'otros',
  'Salud': 'salud',
  'Tecnologia': 'tecnologia',
  'Energia': 'energia',
  'Gobernacion': 'gobernacion',
  'Ambiente': 'ambiente',
  'Defensa': 'defensa',
  'Infraestructura': 'infraestructura',
}

const DATA: SectorRow[] = [
  { sector: 'Agricultura',     code: 'agricultura',     competitive: 6.5  },
  { sector: 'Educacion',       code: 'educacion',       competitive: 7.7  },
  { sector: 'Trabajo',         code: 'trabajo',         competitive: 11.7 },
  { sector: 'Hacienda',        code: 'hacienda',        competitive: 11.7 },
  { sector: 'Otros',           code: 'otros',           competitive: 16.1 },
  { sector: 'Salud',           code: 'salud',           competitive: 20.1 },
  { sector: 'Tecnologia',      code: 'tecnologia',      competitive: 21.7 },
  { sector: 'Energia',         code: 'energia',         competitive: 31.4 },
  { sector: 'Gobernacion',     code: 'gobernacion',     competitive: 35.1 },
  { sector: 'Ambiente',        code: 'ambiente',        competitive: 36.3 },
  { sector: 'Defensa',         code: 'defensa',         competitive: 48.1 },
  { sector: 'Infraestructura', code: 'infraestructura', competitive: 54.2 },
]

const OECD_TARGET = 75
const OECD_COLOR = 'var(--color-oecd)'

const DOTS = 80        // each dot = 1pp (0-80% domain)
const DOT_R = 3
const DOT_GAP = 8
const STRIP_H = 11
const LABEL_W = 128
const COL_W = DOTS * DOT_GAP
const VALUE_W = 60
const ROW_H = STRIP_H + 4

const W = LABEL_W + COL_W + VALUE_W
const H = 46 + DATA.length * ROW_H + 14

function getSectorColor(code: string): string {
  const key = SECTOR_KEY_MAP[code] || code
  return SECTOR_COLORS[key] || 'var(--color-sector-otros)'
}

export function StoryCeroCompetenciaChart() {
  const { t } = useTranslation('storyCharts')
  const criticalSectors = DATA.filter(d => d.competitive < 25).length

  return (
    <EditorialChartFrame
      kicker={t('ceroCompetencia.kicker')}
      headline={t('ceroCompetencia.headline')}
      subline={t('ceroCompetencia.subline')}
      stats={[
        { value: String(criticalSectors), label: t('ceroCompetencia.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('ceroCompetencia.stat2Value'), label: t('ceroCompetencia.stat2Label'), accent: 'var(--color-oecd)' },
      ]}
      finding={{ label: t('ceroCompetencia.findingLabel'), body: t('ceroCompetencia.findingBody') }}
      footer={t('ceroCompetencia.footer')}
    >
      <div className="rounded-sm border border-border bg-background p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('ceroCompetencia.ariaLabel')}
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
            {t('ceroCompetencia.sectorHeader')}
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
            {t('ceroCompetencia.competitiveHeader')}
          </text>

          {/* OECD target line */}
          <line
            x1={LABEL_W + OECD_TARGET * DOT_GAP + DOT_R}
            x2={LABEL_W + OECD_TARGET * DOT_GAP + DOT_R}
            y1={32}
            y2={46 + DATA.length * ROW_H - 4}
            stroke={OECD_COLOR}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            opacity={0.85}
          />
          <text
            x={LABEL_W + OECD_TARGET * DOT_GAP + DOT_R - 4}
            y={38}
            textAnchor="end"
            fill={OECD_COLOR}
            fontSize={13}
            fontFamily="var(--font-family-mono)"
          >
            {t('ceroCompetencia.oecdLabel')}
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 52 + rowIdx * ROW_H
            const color = getSectorColor(row.sector)
            const opacity = row.competitive < 15 ? 1 : 0.7
            const filled = Math.round(row.competitive)

            return (
              <g key={row.sector}>
                <text
                  x={LABEL_W - 6}
                  y={y0 + STRIP_H / 2 + 3}
                  textAnchor="end"
                  fill="var(--color-text-muted)"
                  fontSize={12}
                  fontFamily="var(--font-family-mono)"
                >
                  {row.sector}
                </text>

                {Array.from({ length: DOTS }).map((_, i) => {
                  const isFilled = i < filled
                  return (
                    <motion.circle
                      key={i}
                      cx={LABEL_W + i * DOT_GAP + DOT_R}
                      cy={y0 + STRIP_H / 2}
                      r={DOT_R}
                      fill={isFilled ? color : 'var(--color-background-elevated)'}
                      fillOpacity={isFilled ? opacity : 1}
                      stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                      strokeWidth={isFilled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.03 + i * 0.002 }}
                    />
                  )
                })}

                <text
                  x={LABEL_W + COL_W + 8}
                  y={y0 + STRIP_H / 2 + 3}
                  fill={color}
                  fontSize={12}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {row.competitive.toFixed(1)}%
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </EditorialChartFrame>
  )
}

// ✓ dot-matrix rewrite
