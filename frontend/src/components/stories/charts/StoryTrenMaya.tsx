/**
 * StoryTrenMaya — The 5 sections of the Tren Maya route, no competitive bidding.
 *
 * Each section of the rail route (1-5) displayed as a horizontal track.
 * For each: a dot strip showing DA rate, risk score, major contractor labeled.
 * Size = contract value. The overall message: 1,525 km of rail, ~0 open tenders.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface Section {
  id: string
  name: string
  route: string
  km: number
  contractor: string
  valueB: number
  daRate: number
  riskScore: number
  executor: 'FONATUR' | 'SEDENA'
}

const SECTIONS: Section[] = [
  { id: 'T1', name: 'Tramo 1', route: 'Palenque – Escárcega',  km: 227, contractor: 'Mota-Engil · China CR',    valueB: 16.4, daRate: 98, riskScore: 0.74, executor: 'FONATUR' },
  { id: 'T2', name: 'Tramo 2', route: 'Escárcega – Calkiní',   km: 235, contractor: 'ICA · FCC · Azvi',          valueB: 18.6, daRate: 97, riskScore: 0.71, executor: 'FONATUR' },
  { id: 'T3', name: 'Tramo 3', route: 'Calkiní – Izamal',      km: 172, contractor: 'GAMI · BORIS',              valueB: 14.8, daRate: 96, riskScore: 0.69, executor: 'FONATUR' },
  { id: 'T4', name: 'Tramo 4', route: 'Izamal – Cancún',       km: 257, contractor: 'ICA · La Peninsular',       valueB: 25.3, daRate: 98, riskScore: 0.76, executor: 'FONATUR' },
  { id: 'T5', name: 'Tramo 5', route: 'Cancún – Tulum',        km: 121, contractor: 'Grupo México · Carso',      valueB: 31.2, daRate: 99, riskScore: 0.81, executor: 'FONATUR' },
  { id: 'T67', name: 'Tramos 6-7', route: 'Tulum – Escárcega', km: 513, contractor: 'SEDENA (clasificado)',      valueB: 74.5, daRate: 100, riskScore: 0.92, executor: 'SEDENA' },
]

const OECD_LIMIT = 25

const DOTS = 50
const DOT_R = 3
const DOT_GAP_X = 8
const STRIP_W = DOTS * DOT_GAP_X
const ROW_H = 72
const LABEL_W = 160
const META_W = 120

const W = LABEL_W + STRIP_W + META_W + 40
const H = 90 + SECTIONS.length * ROW_H + 40

function colorForRate(r: number): string {
  if (r >= 95) return 'var(--color-sector-salud)'
  if (r >= 80) return 'var(--color-sector-infraestructura)'
  return 'var(--color-risk-high)'
}

export function StoryTrenMaya() {
  const { t } = useTranslation('storyCharts')
  const totalKm = SECTIONS.reduce((s, r) => s + r.km, 0)
  const totalValue = SECTIONS.reduce((s, r) => s + r.valueB, 0)
  const avgDA = SECTIONS.reduce((s, r) => s + r.daRate * r.km, 0) / totalKm

  return (
    <EditorialChartFrame
      kicker={t('trenMaya.kicker')}
      headline={t('trenMaya.headline')}
      lede={t('trenMaya.lede')}
      stats={[
        { value: `${avgDA.toFixed(1)}%`, label: t('trenMaya.stat1Label'), accent: 'var(--color-risk-critical)' },
        { value: `${totalValue.toFixed(0)}B`, label: t('trenMaya.stat2Label'), accent: 'var(--color-risk-high)' },
        { value: String(totalKm), label: t('trenMaya.stat3Label'), accent: 'var(--color-oecd)' },
      ]}
      finding={{ label: t('trenMaya.findingLabel'), body: t('trenMaya.findingBody') }}
      footer={t('trenMaya.footer')}
      tone="bare"
    >
      <div className="rounded-sm border border-border bg-background p-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[720px]"
          role="img"
          aria-label={t('trenMaya.ariaLabel')}
        >
          {/* Header */}
          <text x={LABEL_W - 8} y={32} textAnchor="end" fill="var(--color-text-secondary)" fontSize={13} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {t('trenMaya.sectionHeader')}
          </text>
          <text x={LABEL_W + STRIP_W / 2} y={20} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={13} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {t('trenMaya.axisHeader')}
          </text>
          {/* OECD line */}
          <g>
            <line
              x1={LABEL_W + Math.round(OECD_LIMIT / 2) * DOT_GAP_X - DOT_GAP_X / 2}
              y1={32}
              x2={LABEL_W + Math.round(OECD_LIMIT / 2) * DOT_GAP_X - DOT_GAP_X / 2}
              y2={H - 36}
              stroke="var(--color-oecd)"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={LABEL_W + Math.round(OECD_LIMIT / 2) * DOT_GAP_X - DOT_GAP_X / 2}
              y={28}
              textAnchor="middle"
              fill="var(--color-oecd)"
              fontSize={13}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
            >
              {t('trenMaya.oecdLabel')}
            </text>
          </g>
          <text x={LABEL_W + STRIP_W + META_W / 2 + 20} y={32} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={13} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {t('trenMaya.valueExecutorHeader')}
          </text>

          {/* Route line (vertical spine) */}
          <line
            x1={LABEL_W - 24}
            y1={64}
            x2={LABEL_W - 24}
            y2={H - 30}
            stroke="var(--color-text-secondary)"
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Rows */}
          {SECTIONS.map((sec, rowIdx) => {
            const y0 = 50 + rowIdx * ROW_H
            const cy = y0 + ROW_H / 2 - 8
            const isSEDENA = sec.executor === 'SEDENA'
            const filled = Math.round(sec.daRate / 2)
            const color = colorForRate(sec.daRate)

            return (
              <g key={sec.id}>
                {/* Station dot on spine */}
                <circle
                  cx={LABEL_W - 24}
                  cy={cy}
                  r={6}
                  fill={isSEDENA ? 'var(--color-sector-defensa)' : 'var(--color-risk-medium)'}
                  stroke={isSEDENA ? 'var(--color-sector-educacion)' : 'var(--color-risk-medium)'}
                  strokeWidth={1.5}
                />
                <text
                  x={LABEL_W - 24}
                  y={cy + 3}
                  textAnchor="middle"
                  fill="var(--color-background)"
                  fontSize={7}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                >
                  {sec.id.replace('T', '')}
                </text>

                {/* Label */}
                <text
                  x={LABEL_W - 12}
                  y={cy - 2}
                  textAnchor="end"
                  fill="var(--color-border)"
                  fontSize={13}
                  fontFamily="var(--font-family-serif)"
                  fontWeight={700}
                >
                  {sec.name}
                </text>
                <text
                  x={LABEL_W - 12}
                  y={cy + 11}
                  textAnchor="end"
                  fill="var(--color-text-muted)"
                  fontSize={8.5}
                  fontFamily="var(--font-family-mono)"
                >
                  {sec.route}
                </text>
                <text
                  x={LABEL_W - 12}
                  y={cy + 22}
                  textAnchor="end"
                  fill="var(--color-text-muted)"
                  fontSize={8}
                  fontFamily="var(--font-family-mono)"
                >
                  {sec.km} km · {sec.contractor}
                </text>

                {/* Dot strip — or "classified" box for SEDENA */}
                {isSEDENA ? (
                  <g>
                    <rect
                      x={LABEL_W}
                      y={cy - 8}
                      width={STRIP_W}
                      height={18}
                      rx={3}
                      fill="var(--color-background-elevated)"
                      stroke="var(--color-sector-educacion)"
                      strokeWidth={0.75}
                      strokeDasharray="3 3"
                      opacity={0.7}
                    />
                    <text
                      x={LABEL_W + STRIP_W / 2}
                      y={cy + 3}
                      textAnchor="middle"
                      fill="var(--color-sector-educacion)"
                      fontSize={12}
                      fontFamily="var(--font-family-mono)"
                      fontWeight={700}
                      letterSpacing="0.1em"
                    >
                      {t('trenMaya.sedenaBox')}
                    </text>
                  </g>
                ) : (
                  Array.from({ length: DOTS }).map((_, i) => (
                    <motion.circle
                      key={i}
                      cx={LABEL_W + i * DOT_GAP_X + DOT_GAP_X / 2}
                      cy={cy}
                      r={DOT_R}
                      fill={i < filled ? color : 'var(--color-background-elevated)'}
                      stroke={i < filled ? 'none' : 'var(--color-border-hover)'}
                      strokeWidth={i < filled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.08 + i * 0.004 }}
                    />
                  ))
                )}

                {/* Value + DA% on right */}
                <g transform={`translate(${LABEL_W + STRIP_W + 16}, ${cy})`}>
                  <text
                    textAnchor="start"
                    fill={color}
                    fontSize={18}
                    fontFamily="var(--font-family-serif)"
                    fontStyle="normal"
                    fontWeight={800}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                    y={-2}
                  >
                    {sec.valueB.toFixed(1)}B
                  </text>
                  <text
                    textAnchor="start"
                    fill="var(--color-text-muted)"
                    fontSize={13}
                    fontFamily="var(--font-family-mono)"
                    y={12}
                  >
                    {isSEDENA
                      ? t('trenMaya.estimatedLabel')
                      : `${sec.daRate}% · ${t('trenMaya.riskWord')} ${sec.riskScore.toFixed(2)}`}
                  </text>
                </g>
              </g>
            )
          })}

          {/* Bottom legend */}
          <text
            x={W / 2}
            y={H - 10}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize={13}
            fontFamily="var(--font-family-mono)"
          >
            {t('trenMaya.bottomLegend')}
          </text>
        </svg>
      </div>
    </EditorialChartFrame>
  )
}
