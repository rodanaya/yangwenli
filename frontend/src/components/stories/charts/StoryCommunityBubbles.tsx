/**
 * StoryCommunityBubbles — Pure SVG network graph.
 *
 * A central hub (institution or top vendor) connected by thin edges to
 * 22 vendor nodes in a radial layout. Node color = risk tier, radius
 * = relative value share. Reader sees a "planet + moons" pattern
 * consistent with capture / shell-network topologies.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface Node {
  id: string
  label: string
  risk: number // 0-1
  valueShare: number // 0-1
}

// 22 vendor nodes with realistic risk distribution
const NODES: Node[] = [
  { id: 'v1',  label: 'V-A01', risk: 0.78, valueShare: 0.18 },
  { id: 'v2',  label: 'V-A02', risk: 0.72, valueShare: 0.15 },
  { id: 'v3',  label: 'V-B01', risk: 0.65, valueShare: 0.12 },
  { id: 'v4',  label: 'V-B02', risk: 0.61, valueShare: 0.10 },
  { id: 'v5',  label: 'V-B03', risk: 0.58, valueShare: 0.09 },
  { id: 'v6',  label: 'V-C01', risk: 0.52, valueShare: 0.07 },
  { id: 'v7',  label: 'V-C02', risk: 0.48, valueShare: 0.06 },
  { id: 'v8',  label: 'V-C03', risk: 0.44, valueShare: 0.06 },
  { id: 'v9',  label: 'V-C04', risk: 0.42, valueShare: 0.05 },
  { id: 'v10', label: 'V-D01', risk: 0.38, valueShare: 0.04 },
  { id: 'v11', label: 'V-D02', risk: 0.35, valueShare: 0.04 },
  { id: 'v12', label: 'V-D03', risk: 0.33, valueShare: 0.03 },
  { id: 'v13', label: 'V-D04', risk: 0.31, valueShare: 0.03 },
  { id: 'v14', label: 'V-E01', risk: 0.28, valueShare: 0.03 },
  { id: 'v15', label: 'V-E02', risk: 0.26, valueShare: 0.02 },
  { id: 'v16', label: 'V-E03', risk: 0.22, valueShare: 0.02 },
  { id: 'v17', label: 'V-E04', risk: 0.19, valueShare: 0.02 },
  { id: 'v18', label: 'V-F01', risk: 0.17, valueShare: 0.02 },
  { id: 'v19', label: 'V-F02', risk: 0.14, valueShare: 0.02 },
  { id: 'v20', label: 'V-F03', risk: 0.12, valueShare: 0.01 },
  { id: 'v21', label: 'V-F04', risk: 0.09, valueShare: 0.01 },
  { id: 'v22', label: 'V-F05', risk: 0.07, valueShare: 0.01 },
]

function colorFor(risk: number): string {
  if (risk >= 0.60) return 'var(--color-sector-salud)'
  if (risk >= 0.40) return 'var(--color-sector-infraestructura)'
  if (risk >= 0.25) return 'var(--color-sector-energia)'
  return 'var(--color-sector-hacienda)'
}

const W = 680
const H = 440
const CX = W / 2
const CY = H / 2

// Compute deterministic radial positions: sort by risk desc; higher risk → closer to hub
function layout(nodes: Node[]) {
  const sorted = [...nodes].sort((a, b) => b.risk - a.risk)
  return sorted.map((n, i) => {
    // Spread nodes across 2 rings for visual rhythm
    const ring = i < 8 ? 0 : i < 16 ? 1 : 2
    const ringRadius = [110, 175, 220][ring]
    const perRing = [8, 8, 6][ring]
    const ringIdx = ring === 0 ? i : ring === 1 ? i - 8 : i - 16
    const angle = (ringIdx / perRing) * 2 * Math.PI + ring * 0.3
    return {
      ...n,
      x: CX + ringRadius * Math.cos(angle),
      y: CY + ringRadius * Math.sin(angle),
    }
  })
}

export function StoryCommunityBubbles() {
  const { t } = useTranslation('storyCharts')
  const positioned = layout(NODES)
  const criticalCount = NODES.filter((n) => n.risk >= 0.6).length
  const highCount = NODES.filter((n) => n.risk >= 0.4 && n.risk < 0.6).length

  return (
    <EditorialChartFrame
      kicker={t('communityBubbles.kicker')}
      headline={t('communityBubbles.headline')}
      lede={t('communityBubbles.lede')}
      stats={[
        { value: String(criticalCount), label: t('communityBubbles.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: String(highCount), label: t('communityBubbles.stat2Label'), accent: 'var(--color-risk-high)' },
        { value: '22', label: t('communityBubbles.stat3Label'), accent: 'var(--color-risk-high)' },
      ]}
      finding={{ label: t('communityBubbles.findingLabel'), body: t('communityBubbles.findingBody') }}
      footer={
        <div className="flex items-center justify-between">
          <span>{t('communityBubbles.footer')}</span>
          <a
            href="/network"
            className="flex items-center gap-1.5 text-xs text-risk-high hover:text-accent font-mono uppercase tracking-wide"
          >
            <ExternalLink className="h-3 w-3" />
            {t('communityBubbles.exploreLink')}
          </a>
        </div>
      }
      tone="bare"
    >
      <div className="rounded-sm border border-border bg-background p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('communityBubbles.ariaLabel')}
        >
          {/* Radial grid */}
          {[80, 140, 200, 250].map((r) => (
            <circle
              key={r}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="var(--color-border-hover)"
              strokeDasharray="2 4"
              strokeWidth={0.8}
            />
          ))}

          {/* Edges */}
          {positioned.map((n) => (
            <motion.line
              key={`e-${n.id}`}
              x1={CX}
              y1={CY}
              x2={n.x}
              y2={n.y}
              stroke={colorFor(n.risk)}
              strokeOpacity={0.35}
              strokeWidth={0.8}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          ))}

          {/* Hub node */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <circle cx={CX} cy={CY} r={38} fill="#27272a" stroke="var(--color-text-muted)" strokeWidth={2} />
            <text x={CX} y={CY - 4} textAnchor="middle" fill="var(--color-background-elevated)" fontSize={11} fontWeight={700} fontFamily="var(--font-family-mono)">
              {t('communityBubbles.centerLabel')}
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              {t('communityBubbles.centerSubLabel')}
            </text>
          </motion.g>

          {/* Vendor nodes */}
          {positioned.map((n, i) => {
            const r = 6 + n.valueShare * 60
            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.035 }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={colorFor(n.risk)}
                  fillOpacity={0.55}
                  stroke={colorFor(n.risk)}
                  strokeWidth={1.2}
                />
                <text
                  x={n.x}
                  y={n.y + 3}
                  textAnchor="middle"
                  fill="var(--color-background-elevated)"
                  fontSize={9}
                  fontWeight={600}
                  fontFamily="var(--font-family-mono)"
                >
                  {n.label}
                </text>
              </motion.g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-mono text-text-muted">
          {[
            { label: t('communityBubbles.legendCritical'), color: 'var(--color-sector-salud)' },
            { label: t('communityBubbles.legendHigh'),     color: 'var(--color-sector-infraestructura)' },
            { label: t('communityBubbles.legendMedium'),   color: 'var(--color-sector-energia)' },
            { label: t('communityBubbles.legendLow'),      color: 'var(--color-sector-hacienda)' },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
          <span className="text-text-muted ml-auto">{t('communityBubbles.legendSizeNote')}</span>
        </div>
      </div>
    </EditorialChartFrame>
  )
}
