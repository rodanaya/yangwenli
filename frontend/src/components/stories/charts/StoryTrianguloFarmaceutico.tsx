/**
 * StoryTrianguloFarmaceutico — Pure SVG pharmaceutical triangle.
 *
 * Three institution nodes (IMSS, ISSSTE, SS) at triangle vertices.
 * Three vendor nodes (Fármacos Especializados, Maypo, DIMM) floating
 * inside the triangle. Edge widths proportional to contract values.
 * Dot strips below show direct award concentration per vendor.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface Institution {
  id: string
  label: string
  x: number
  y: number
  spend: number // MXN billions
}

interface Vendor {
  id: string
  label: string
  x: number
  y: number
  total: number // MXN billions
  daRate: number // 0-100
  score: number // risk score
  color: string
}

interface Edge {
  from: string
  to: string
  value: number // MXN billions
}

const INSTITUTIONS: Institution[] = [
  { id: 'imss',   label: 'IMSS',   x: 220, y: 70,  spend: 142 },
  { id: 'issste', label: 'ISSSTE', x: 90,  y: 280, spend: 78  },
  { id: 'ss',     label: 'SS / INSABI', x: 350, y: 280, spend: 65  },
]

const VENDORS: Vendor[] = [
  { id: 'farmacos', label: 'Fármacos Esp.', x: 220, y: 195, total: 128, daRate: 81, score: 0.89, color: 'var(--color-sector-salud)' },
  { id: 'maypo',    label: 'Maypo Intl.',   x: 155, y: 235, total: 92,  daRate: 78, score: 0.84, color: 'var(--color-risk-critical)' },
  { id: 'dimm',     label: 'DIMM',          x: 285, y: 235, total: 65,  daRate: 76, score: 0.81, color: 'var(--color-risk-critical)' },
]

const EDGES: Edge[] = [
  { from: 'imss',   to: 'farmacos', value: 64 },
  { from: 'imss',   to: 'maypo',    value: 48 },
  { from: 'imss',   to: 'dimm',     value: 30 },
  { from: 'issste', to: 'farmacos', value: 38 },
  { from: 'issste', to: 'maypo',    value: 24 },
  { from: 'issste', to: 'dimm',     value: 16 },
  { from: 'ss',     to: 'farmacos', value: 26 },
  { from: 'ss',     to: 'maypo',    value: 20 },
  { from: 'ss',     to: 'dimm',     value: 19 },
]

function getNode(id: string): { x: number; y: number } {
  const inst = INSTITUTIONS.find((i) => i.id === id)
  if (inst) return inst
  const vendor = VENDORS.find((v) => v.id === id)!
  return vendor
}

export function StoryTrianguloFarmaceutico() {
  const { t } = useTranslation('storyCharts')
  const maxValue = Math.max(...EDGES.map((e) => e.value))

  return (
    <EditorialChartFrame
      kicker={t('trianguloFarmaceutico.kicker')}
      headline={t('trianguloFarmaceutico.headline')}
      lede={t('trianguloFarmaceutico.lede')}
      stats={[
        { value: t('trianguloFarmaceutico.stat1Value'), label: t('trianguloFarmaceutico.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: t('trianguloFarmaceutico.stat2Value'), label: t('trianguloFarmaceutico.stat2Label'), accent: 'var(--color-risk-critical)' },
        { value: t('trianguloFarmaceutico.stat3Value'), label: t('trianguloFarmaceutico.stat3Label'), accent: 'var(--color-risk-critical)' },
      ]}
      finding={{ label: t('trianguloFarmaceutico.findingLabel'), body: t('trianguloFarmaceutico.findingBody') }}
      footer={t('trianguloFarmaceutico.footer')}
    >
      <svg
        viewBox="0 0 440 440"
        className="w-full h-auto"
        role="img"
        aria-label={t('trianguloFarmaceutico.ariaLabel')}
      >
        {/* Triangle outline connecting institutions */}
        <motion.path
          d={`M ${INSTITUTIONS[0].x} ${INSTITUTIONS[0].y} L ${INSTITUTIONS[1].x} ${INSTITUTIONS[1].y} L ${INSTITUTIONS[2].x} ${INSTITUTIONS[2].y} Z`}
          fill="none"
          stroke="var(--color-border-hover)"
          strokeWidth={1}
          strokeDasharray="4 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5 }}
        />

        {/* Edges: institution -> vendor */}
        {EDGES.map((edge, i) => {
          const a = getNode(edge.from)
          const b = getNode(edge.to)
          const strokeWidth = 1 + (edge.value / maxValue) * 6
          return (
            <motion.line
              key={`${edge.from}-${edge.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--color-sector-salud)"
              strokeOpacity={0.35}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.06 }}
            />
          )
        })}

        {/* Edge value labels */}
        {EDGES.filter((e) => e.value >= 24).map((edge) => {
          const a = getNode(edge.from)
          const b = getNode(edge.to)
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          return (
            <motion.text
              key={`label-${edge.from}-${edge.to}`}
              x={mx}
              y={my}
              textAnchor="middle"
              fill="var(--color-risk-critical)"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              ${edge.value}B
            </motion.text>
          )
        })}

        {/* Institution nodes */}
        {INSTITUTIONS.map((inst, i) => (
          <motion.g
            key={inst.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <circle cx={inst.x} cy={inst.y} r={28} fill="#18181b" stroke="var(--color-sector-educacion)" strokeWidth={2} />
            <text
              x={inst.x}
              y={inst.y + 4}
              textAnchor="middle"
              fill="var(--color-sector-educacion)"
              fontSize={10}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
            >
              {inst.label}
            </text>
            <text
              x={inst.x}
              y={inst.y + (i === 0 ? -38 : 46)}
              textAnchor="middle"
              fill="var(--color-text-secondary)"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
            >
              {`$${inst.spend}B ${t('trianguloFarmaceutico.spendSuffix')}`}
            </text>
          </motion.g>
        ))}

        {/* Vendor nodes */}
        {VENDORS.map((v, i) => (
          <motion.g
            key={v.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
          >
            <circle
              cx={v.x}
              cy={v.y}
              r={18 + (v.total / 128) * 10}
              fill={v.color}
              fillOpacity={0.9}
              stroke="var(--color-risk-critical)"
              strokeWidth={1.5}
            />
            <text
              x={v.x}
              y={v.y + 3}
              textAnchor="middle"
              fill="var(--color-risk-critical)"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
            >
              ${v.total}B
            </text>
            <text
              x={v.x}
              y={v.y + (v.id === 'farmacos' ? -36 : 44)}
              textAnchor="middle"
              fill="var(--color-text-muted)"
              fontSize={10}
              fontFamily="var(--font-family-mono)"
            >
              {v.label}
            </text>
          </motion.g>
        ))}

        {/* Legend */}
        <g transform="translate(20, 400)">
          <circle cx={6} cy={6} r={6} fill="#18181b" stroke="var(--color-sector-educacion)" strokeWidth={1.5} />
          <text x={18} y={10} fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
            {t('trianguloFarmaceutico.legendInstitutions')}
          </text>
          <circle cx={180} cy={6} r={6} fill="var(--color-sector-salud)" />
          <text x={192} y={10} fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
            {t('trianguloFarmaceutico.legendVendor')}
          </text>
        </g>
      </svg>

      {/* DA rate dot strips */}
      <div className="space-y-2 pt-2 border-t border-border">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted">
          {t('trianguloFarmaceutico.daStripsLabel')}
        </p>
        {VENDORS.map((v) => {
          const filled = Math.round(v.daRate / 2)
          return (
            <div key={v.id} className="flex items-center gap-3">
              <div className="w-32 text-[11px] font-mono text-text-secondary">{v.label}</div>
              <svg aria-hidden="true" viewBox="0 0 420 14" className="flex-1 h-3">
                {Array.from({ length: 50 }).map((_, i) => {
                  const isFilled = i < filled
                  const isOecd = i === 12
                  return (
                    <g key={i}>
                      {isOecd && (
                        <line x1={i * 8 + 4} y1={0} x2={i * 8 + 4} y2={14} stroke="var(--color-oecd)" strokeWidth={0.7} strokeDasharray="2 2" />
                      )}
                      <motion.circle
                        cx={i * 8 + 4}
                        cy={7}
                        r={3}
                        fill={isFilled ? v.color : 'var(--color-background-elevated)'}
                        stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                        strokeWidth={isFilled ? 0 : 0.5}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, delay: i * 0.01 }}
                      />
                    </g>
                  )
                })}
              </svg>
              <div className="w-12 text-[11px] font-mono text-risk-critical text-right">{v.daRate}%</div>
            </div>
          )
        })}
      </div>
    </EditorialChartFrame>
  )
}
