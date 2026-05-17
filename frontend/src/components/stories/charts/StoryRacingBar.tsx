/**
 * StoryRacingBar — Pure SVG bubble cluster.
 *
 * Top AMLO-era agricultural vendors shown as bubbles around the SEGALMEX
 * hub. Bubble size = contract value. Bubble color = direct-award rate
 * (red = 100% DA, orange = high, green = mixed). Reader sees the cluster
 * of ghost companies orbiting the parastatal that captured agriculture.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface Vendor {
  name: string
  valueB: number // billions MXN
  daPct: number
  note?: string
  avgMxn?: string
}

const VENDORS: Vendor[] = [
  { name: 'SEGALMEX',          valueB: 6.43, daPct: 41.2 },
  { name: 'Molinos Azteca',    valueB: 6.25, daPct: 99.9 },
  { name: 'ILAS México',       valueB: 3.30, daPct: 100.0, avgMxn: '275M / contrato' },
  { name: 'Productos Loneg',   valueB: 2.72, daPct: 100.0, avgMxn: '302M / contrato' },
  { name: 'Industrial Patrona',valueB: 2.12, daPct: 99.4 },
  { name: 'LICONSA',           valueB: 1.91, daPct: 63.0 },
]

function colorFor(daPct: number): string {
  if (daPct >= 99) return 'var(--color-sector-salud)'
  if (daPct >= 60) return 'var(--color-sector-infraestructura)'
  return 'var(--color-sector-agricultura)'
}

// Manual layout — SEGALMEX center, others orbit clockwise
const W = 640
const H = 400
const CX = W / 2
const CY = H / 2

// Radius scaled so SEGALMEX is largest
function radiusFor(valueB: number): number {
  return 18 + Math.sqrt(valueB) * 14
}

const POSITIONS: Array<{ x: number; y: number }> = [
  { x: CX,           y: CY },          // SEGALMEX (hub)
  { x: CX + 180,     y: CY - 70 },     // Molinos Azteca
  { x: CX + 160,     y: CY + 100 },    // ILAS
  { x: CX - 170,     y: CY + 90 },     // Productos Loneg
  { x: CX - 190,     y: CY - 60 },     // Industrial Patrona
  { x: CX - 10,      y: CY - 150 },    // LICONSA
]

export function StoryRacingBar() {
  const { t } = useTranslation('storyCharts')
  const totalValue = VENDORS.reduce((s, v) => s + v.valueB, 0)

  return (
    <EditorialChartFrame
      kicker={t('racingBar.kicker')}
      headline={t('racingBar.headline')}
      lede={t('racingBar.lede')}
      stats={[
        { value: `MXN ${totalValue.toFixed(1)}B`, label: t('racingBar.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('racingBar.stat2Value'), label: t('racingBar.stat2Label'), accent: 'var(--color-risk-high)' },
        { value: t('racingBar.stat3Value'), label: t('racingBar.stat3Label') },
      ]}
      finding={{ label: t('racingBar.findingLabel'), body: t('racingBar.findingBody') }}
      footer={t('racingBar.footer')}
      tone="bare"
    >
      <div className="rounded-sm border border-border bg-background p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('racingBar.ariaLabel')}
        >
          {/* Radial grid */}
          {[80, 160, 240].map((r) => (
            <circle
              key={r}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="var(--color-border-hover)"
              strokeDasharray="2 4"
              strokeWidth={1}
            />
          ))}

          {/* Connection lines from hub to each vendor */}
          {POSITIONS.slice(1).map((pos, i) => (
            <motion.line
              key={i}
              x1={CX}
              y1={CY}
              x2={pos.x}
              y2={pos.y}
              stroke={colorFor(VENDORS[i + 1].daPct)}
              strokeOpacity={0.4}
              strokeWidth={1}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
            />
          ))}

          {/* Bubbles */}
          {VENDORS.map((v, i) => {
            const pos = POSITIONS[i]
            const r = radiusFor(v.valueB)
            const color = colorFor(v.daPct)
            const isHub = i === 0
            return (
              <motion.g
                key={v.name}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={color}
                  fillOpacity={isHub ? 0.25 : 0.35}
                  stroke={color}
                  strokeWidth={isHub ? 2.5 : 1.5}
                />
                {/* Vendor name */}
                <text
                  x={pos.x}
                  y={pos.y - 4}
                  textAnchor="middle"
                  fill={isHub ? '#fef2f2' : '#f4f4f5'}
                  fontSize={isHub ? 13 : 11}
                  fontWeight={700}
                  fontFamily="var(--font-family-mono)"
                >
                  {v.name}
                </text>
                {/* Value + DA */}
                <text
                  x={pos.x}
                  y={pos.y + 10}
                  textAnchor="middle"
                  fill="var(--color-border)"
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                >
                  {`${v.valueB.toFixed(1)}B · ${v.daPct.toFixed(0)}% ${t('racingBar.valueDaSep')}`}
                </text>
                {v.avgMxn && (
                  <text
                    x={pos.x}
                    y={pos.y + r + 14}
                    textAnchor="middle"
                    fill="var(--color-risk-medium)"
                    fontSize={9}
                    fontFamily="var(--font-family-mono)"
                  >
                    {v.avgMxn}
                  </text>
                )}
              </motion.g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-mono text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: 'var(--color-sector-salud)', opacity: 0.5 }} aria-hidden="true" />
            {t('racingBar.legend100')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: 'var(--color-sector-infraestructura)', opacity: 0.5 }} aria-hidden="true" />
            {t('racingBar.legend60')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: 'var(--color-sector-agricultura)', opacity: 0.5 }} aria-hidden="true" />
            {t('racingBar.legendUnder')}
          </span>
          <span className="text-text-muted ml-auto">{t('racingBar.legendSizeNote')}</span>
        </div>
      </div>
    </EditorialChartFrame>
  )
}
