/**
 * StoryCasaContratos — The house of contracts: institutional capture.
 *
 * Circular layout. A government institution at center. Satellite vendors
 * orbit it, each sized by total contracts, colored by risk score. Shows
 * the capture pattern visually: one institution → captive vendor ring.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface Vendor {
  name: string
  contracts: number
  valueB: number // MXN B
  riskScore: number
  daRate: number
}

// Grupo Higa-orbit vendors (editorial approximation based on Case 11)
const INSTITUTION = {
  name: 'SCT + SHCP',
  short: 'SCT / SHCP',
  subtitle: 'Contratos con red Grupo Higa',
}

const VENDORS: Vendor[] = [
  { name: 'Constructora Teya',     contracts: 184, valueB: 12.3, riskScore: 0.82, daRate: 74 },
  { name: 'Constructora Eolo',     contracts: 92,  valueB: 8.1,  riskScore: 0.76, daRate: 69 },
  { name: 'Grupo Higa (núcleo)',   contracts: 138, valueB: 18.4, riskScore: 0.88, daRate: 81 },
  { name: 'Constructora Telta',    contracts: 71,  valueB: 5.2,  riskScore: 0.68, daRate: 62 },
  { name: 'Publicistas Higa',      contracts: 48,  valueB: 3.8,  riskScore: 0.64, daRate: 58 },
  { name: 'Mensajería Hinojosa',   contracts: 34,  valueB: 2.1,  riskScore: 0.57, daRate: 51 },
  { name: 'Inmobiliaria Sierra',   contracts: 22,  valueB: 1.6,  riskScore: 0.54, daRate: 48 },
]

const W = 760
const H = 520
const CX = W / 2
const CY = H / 2
const ORBIT_R = 175

function colorForRisk(risk: number): string {
  if (risk >= 0.80) return 'var(--color-sector-salud)'
  if (risk >= 0.60) return 'var(--color-sector-infraestructura)'
  if (risk >= 0.40) return 'var(--color-risk-high)'
  return 'var(--color-sector-hacienda)'
}

export function StoryCasaContratos() {
  const { t } = useTranslation('storyCharts')
  const maxContracts = Math.max(...VENDORS.map((v) => v.contracts))
  const totalValue = VENDORS.reduce((s, v) => s + v.valueB, 0)
  const totalContracts = VENDORS.reduce((s, v) => s + v.contracts, 0)

  const angleStep = (2 * Math.PI) / VENDORS.length

  return (
    <EditorialChartFrame
      kicker={t('casaContratos.kicker')}
      headline={t('casaContratos.headline')}
      lede={t('casaContratos.lede')}
      stats={[
        { value: `${totalValue.toFixed(0)}B`, label: t('casaContratos.stat1Suffix'), accent: 'var(--color-risk-critical)' },
        { value: String(VENDORS.length), label: t('casaContratos.stat2Suffix'), accent: 'var(--color-risk-high)' },
        { value: String(totalContracts), label: t('casaContratos.stat3Suffix'), accent: 'var(--color-risk-high)' },
      ]}
      finding={{ label: t('casaContratos.findingLabel'), body: t('casaContratos.findingBody') }}
      footer={t('casaContratos.footer')}
      tone="bare"
    >
      <div className="rounded-sm border border-border bg-background p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t('casaContratos.ariaLabel')}
        >
          {/* Atmospheric rings */}
          <circle cx={CX} cy={CY} r={ORBIT_R + 40} fill="none" stroke="var(--color-border-hover)" strokeWidth={0.5} />
          <circle cx={CX} cy={CY} r={ORBIT_R} fill="none" stroke="var(--color-border-hover)" strokeWidth={0.75} strokeDasharray="2 4" />
          <circle cx={CX} cy={CY} r={ORBIT_R - 40} fill="none" stroke="var(--color-border-hover)" strokeWidth={0.5} />

          {/* Lines to each vendor */}
          {VENDORS.map((v, i) => {
            const a = angleStep * i - Math.PI / 2
            const vx = CX + Math.cos(a) * ORBIT_R
            const vy = CY + Math.sin(a) * ORBIT_R
            const color = colorForRisk(v.riskScore)
            return (
              <motion.line
                key={`line-${i}`}
                x1={CX}
                y1={CY}
                x2={vx}
                y2={vy}
                stroke={color}
                strokeOpacity={0.35}
                strokeWidth={1 + (v.contracts / maxContracts) * 3}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
              />
            )
          })}

          {/* Vendor satellites */}
          {VENDORS.map((v, i) => {
            const a = angleStep * i - Math.PI / 2
            const vx = CX + Math.cos(a) * ORBIT_R
            const vy = CY + Math.sin(a) * ORBIT_R
            const color = colorForRisk(v.riskScore)
            const r = 10 + (v.contracts / maxContracts) * 28

            // Label position (outside orbit)
            const labelR = ORBIT_R + r + 12
            const lx = CX + Math.cos(a) * labelR
            const ly = CY + Math.sin(a) * labelR
            const isRight = Math.cos(a) > 0.1
            const isLeft = Math.cos(a) < -0.1
            const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle'

            return (
              <motion.g
                key={v.name}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.1, type: 'spring', stiffness: 120 }}
              >
                {/* Pulsing ring on high-risk */}
                {v.riskScore >= 0.75 && (
                  <motion.circle
                    cx={vx}
                    cy={vy}
                    r={r + 4}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    animate={{ opacity: [0.6, 0.1, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                )}
                <circle
                  cx={vx}
                  cy={vy}
                  r={r}
                  fill={color}
                  fillOpacity={0.75}
                  stroke={color}
                  strokeWidth={1}
                />
                <text
                  x={vx}
                  y={vy + 4}
                  textAnchor="middle"
                  fill="var(--color-background)"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                >
                  {v.contracts}
                </text>

                {/* External label */}
                <text
                  x={lx}
                  y={ly - 2}
                  textAnchor={textAnchor}
                  fill="var(--color-border)"
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {v.name.length > 22 ? v.name.slice(0, 22) + '…' : v.name}
                </text>
                <text
                  x={lx}
                  y={ly + 10}
                  textAnchor={textAnchor}
                  fill={color}
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                >
                  {`${v.valueB.toFixed(1)}B · ${t('casaContratos.riskWord')} ${v.riskScore.toFixed(2)}`}
                </text>
              </motion.g>
            )
          })}

          {/* Center institution */}
          <motion.g
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <circle cx={CX} cy={CY} r={54} fill="var(--color-sector-defensa)" fillOpacity={0.5} stroke="var(--color-sector-educacion)" strokeWidth={1.5} />
            <circle cx={CX} cy={CY} r={44} fill="var(--color-sector-defensa)" stroke="var(--color-sector-educacion)" strokeWidth={1} />
            <text
              x={CX}
              y={CY - 4}
              textAnchor="middle"
              fill="var(--color-background-elevated)"
              fontSize={14}
              fontFamily="var(--font-family-serif)"
              fontWeight={700}
            >
              {INSTITUTION.short}
            </text>
            <text
              x={CX}
              y={CY + 12}
              textAnchor="middle"
              fill="var(--color-sector-educacion)"
              fontSize={8}
              fontFamily="var(--font-family-mono)"
              letterSpacing="0.05em"
            >
              {t('casaContratos.centerLabel')}
            </text>
          </motion.g>

          {/* Legend */}
          <g transform={`translate(20, ${H - 28})`}>
            <text fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.08em">
              {t('casaContratos.legendHeader')}
            </text>
            <g transform="translate(0, 14)">
              <circle cx={5} cy={0} r={4} fill="var(--color-sector-hacienda)" />
              <text x={14} y={3} fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">{t('casaContratos.legendLow')}</text>
              <circle cx={56} cy={0} r={4} fill="var(--color-risk-high)" />
              <text x={65} y={3} fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">{t('casaContratos.legendMedium')}</text>
              <circle cx={116} cy={0} r={4} fill="var(--color-sector-infraestructura)" />
              <text x={125} y={3} fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">{t('casaContratos.legendHigh')}</text>
              <circle cx={160} cy={0} r={4} fill="var(--color-sector-salud)" />
              <text x={169} y={3} fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">{t('casaContratos.legendCritical')}</text>
            </g>
          </g>
        </svg>
      </div>
    </EditorialChartFrame>
  )
}
