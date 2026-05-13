/**
 * StoryAnoSinExcusas — 2023: the year without excuses.
 *
 * Yearly dot strips 2019-2024 showing DA rate. 2023 highlighted deep red.
 * OECD threshold (25%) as a vertical line. A context strip below marks
 * which years had COVID active (gray bg for 2020-2021).
 *
 * Bilingual via useTranslation — every visible string flips on i18n.language.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EditorialChartFrame } from '../EditorialChartFrame'

interface YearRow {
  year: number
  daRate: number
  covid: boolean
  labelEs?: string
  labelEn?: string
}

const DATA: YearRow[] = [
  { year: 2019, daRate: 74.1, covid: false },
  { year: 2020, daRate: 78.6, covid: true,  labelEs: 'pandemia',                 labelEn: 'pandemic' },
  { year: 2021, daRate: 79.2, covid: true,  labelEs: 'pandemia',                 labelEn: 'pandemic' },
  { year: 2022, daRate: 79.8, covid: false },
  { year: 2023, daRate: 82.2, covid: false, labelEs: 'RÉCORD · sin emergencia',  labelEn: 'RECORD · no emergency' },
  { year: 2024, daRate: 78.9, covid: false, labelEs: 'transición',               labelEn: 'transition' },
]

const OECD_LIMIT = 25

const DOTS = 50 // each dot = 2pp, strip reads left → right
const DOT_R = 3.4
const DOT_GAP_X = 10
const ROW_H = 56
const LABEL_W = 90
const COVID_W = 100
const VALUE_W = 60

const STRIP_W = DOTS * DOT_GAP_X
const W = LABEL_W + STRIP_W + VALUE_W + COVID_W + 20
const H = 64 + DATA.length * ROW_H + 24

export function StoryAnoSinExcusas() {
  const { i18n } = useTranslation()
  const isEs = i18n.language.startsWith('es')

  const oecdDotIdx = Math.round(OECD_LIMIT / 2)
  const LEFT_FOR_DOT = (i: number) => LABEL_W + i * DOT_GAP_X + DOT_GAP_X / 2

  return (
    <EditorialChartFrame
      kicker={isEs ? 'RUBLI · Tasa de adjudicación directa · 2019-2024' : 'RUBLI · Direct award rate · 2019-2024'}
      headline={isEs
        ? '2023: el año récord sin pandemia, sin emergencia declarada, sin excusa operativa'
        : '2023: the record year without a pandemic, without a declared emergency, without operational excuse'}
      lede={isEs
        ? 'Cada fila es un año. Cada punto vale 2pp de adjudicación directa. La línea cian marca el máximo OCDE (25%). El fondo gris indica años con pandemia activa. 2023 batió el récord histórico verificable con ninguna de las dos excusas disponibles.'
        : 'Each row is a year. Each dot is 2pp of direct-award rate. The cyan line marks the OECD ceiling (25%). The gray background indicates years with COVID active. 2023 broke the verifiable historical record with neither of the two available excuses.'}
      stats={[
        { value: '82.2%', label: isEs ? 'adj. directa 2023 · récord verificable' : 'direct award 2023 · verifiable record', accent: 'var(--color-risk-critical)' },
        { value: '3.3x', label: isEs ? 'sobre el máximo OCDE de 25%' : 'above the 25% OECD ceiling', accent: 'var(--color-oecd)' },
        { value: '+3.0pp', label: isEs ? 'vs. 2022 · sin emergencia que justifique' : 'vs. 2022 · no emergency to justify', accent: 'var(--color-risk-high)' },
      ]}
      finding={{
        label: isEs ? 'HALLAZGO' : 'FINDING',
        body: isEs
          ? 'Durante los años de pandemia (2020-2021), la tasa subió 5pp. Sin pandemia, en 2023, subió otros 3pp más hasta el récord. La emergencia sanitaria no se convirtió en excepción temporal: se volvió hábito administrativo permanente.'
          : 'During the pandemic years (2020-2021), the rate rose 5pp. Without a pandemic, in 2023, it climbed another 3pp to the record. The health emergency did not become a temporary exception — it became a permanent administrative habit.',
      }}
      footer={isEs
        ? 'Fuente: COMPRANET 2019-2024 · Structure B-D · OCDE Public Procurement Report 2023'
        : 'Source: COMPRANET 2019-2024 · Structure B-D · OECD Public Procurement Report 2023'}
      tone="bare"
    >
      <div className="rounded-sm border border-border bg-background p-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[680px]"
          role="img"
          aria-label={isEs
            ? 'Tasa de adjudicación directa por año 2019-2024 con contexto COVID'
            : 'Direct award rate by year 2019-2024 with COVID context'}
        >
          {/* Header */}
          <text x={LABEL_W - 8} y={36} textAnchor="end" fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {isEs ? 'AÑO' : 'YEAR'}
          </text>
          <text x={LABEL_W + STRIP_W / 2} y={20} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {isEs ? 'TASA DE ADJUDICACIÓN DIRECTA (0% → 100%)' : 'DIRECT AWARD RATE (0% → 100%)'}
          </text>

          {/* OECD line label */}
          <g>
            <line
              x1={LABEL_W + oecdDotIdx * DOT_GAP_X - DOT_GAP_X / 2}
              y1={32}
              x2={LABEL_W + oecdDotIdx * DOT_GAP_X - DOT_GAP_X / 2}
              y2={H - 24}
              stroke="var(--color-oecd)"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={LABEL_W + oecdDotIdx * DOT_GAP_X - DOT_GAP_X / 2}
              y={28}
              textAnchor="middle"
              fill="var(--color-oecd)"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
            >
              {isEs ? 'OCDE 25%' : 'OECD 25%'}
            </text>
          </g>
          <text x={LABEL_W + STRIP_W + VALUE_W / 2} y={36} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            %
          </text>
          <text x={LABEL_W + STRIP_W + VALUE_W + COVID_W / 2} y={36} textAnchor="middle" fill="var(--color-text-secondary)" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            {isEs ? 'CONTEXTO' : 'CONTEXT'}
          </text>

          {/* Rows */}
          {DATA.map((row, rowIdx) => {
            const y0 = 50 + rowIdx * ROW_H
            const cy = y0 + ROW_H / 2
            const isRecord = row.year === 2023
            const filled = Math.round(row.daRate / 2)
            const fillColor = isRecord ? 'var(--color-sector-salud)' : 'var(--color-risk-medium)'
            const rowLabel = isEs ? row.labelEs : row.labelEn

            return (
              <g key={row.year}>
                {/* Row highlight */}
                {isRecord && (
                  <rect
                    x={LABEL_W - 4}
                    y={y0 + 4}
                    width={STRIP_W + VALUE_W + 8}
                    height={ROW_H - 8}
                    rx={4}
                    fill="var(--color-sector-salud)"
                    fillOpacity={0.06}
                    stroke="var(--color-sector-salud)"
                    strokeOpacity={0.3}
                    strokeWidth={0.75}
                  />
                )}

                {/* Year label */}
                <text
                  x={LABEL_W - 10}
                  y={cy - 4}
                  textAnchor="end"
                  fill={isRecord ? 'var(--color-risk-critical)' : '#e4e4e7'}
                  fontSize={isRecord ? 20 : 16}
                  fontFamily="var(--font-family-serif)"
                  fontWeight={isRecord ? 800 : 600}
                  dominantBaseline="middle"
                >
                  {row.year}
                </text>
                {rowLabel && (
                  <text
                    x={LABEL_W - 10}
                    y={cy + 14}
                    textAnchor="end"
                    fill={isRecord ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'}
                    fontSize={8.5}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={isRecord ? 700 : 400}
                  >
                    {rowLabel}
                  </text>
                )}

                {/* Dot strip */}
                {Array.from({ length: DOTS }).map((_, i) => {
                  const cx = LEFT_FOR_DOT(i)
                  const isFilled = i < filled
                  return (
                    <motion.circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={DOT_R}
                      fill={isFilled ? fillColor : 'var(--color-background-elevated)'}
                      stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
                      strokeWidth={isFilled ? 0 : 0.6}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.08 + i * 0.005 }}
                    />
                  )
                })}

                {/* Value label */}
                <text
                  x={LABEL_W + STRIP_W + VALUE_W - 6}
                  y={cy}
                  textAnchor="end"
                  fill={isRecord ? 'var(--color-risk-critical)' : 'var(--color-text-muted)'}
                  fontSize={isRecord ? 14 : 12}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={isRecord ? 800 : 600}
                  dominantBaseline="middle"
                >
                  {row.daRate.toFixed(1)}%
                </text>

                {/* COVID context strip */}
                <g transform={`translate(${LABEL_W + STRIP_W + VALUE_W + 8}, ${y0 + 6})`}>
                  <rect
                    width={COVID_W - 16}
                    height={ROW_H - 12}
                    rx={3}
                    fill={row.covid ? 'var(--color-text-secondary)' : '#18181b'}
                    fillOpacity={row.covid ? 0.6 : 0.8}
                    stroke={row.covid ? 'var(--color-text-muted)' : 'var(--color-background-elevated)'}
                    strokeWidth={0.75}
                  />
                  <text
                    x={(COVID_W - 16) / 2}
                    y={(ROW_H - 12) / 2 + 3}
                    textAnchor="middle"
                    fill={row.covid ? '#e4e4e7' : 'var(--color-text-muted)'}
                    fontSize={9}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={600}
                    letterSpacing="0.05em"
                  >
                    {isEs
                      ? (row.covid ? 'COVID activo' : 'sin emergencia')
                      : (row.covid ? 'COVID active' : 'no emergency')}
                  </text>
                </g>
              </g>
            )
          })}

          {/* Bottom legend */}
          <text
            x={LABEL_W + STRIP_W / 2}
            y={H - 6}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
          >
            {isEs
              ? 'cada punto = 2pp · fila roja = año récord sin emergencia activa'
              : 'each dot = 2pp · red row = record year with no active emergency'}
          </text>
        </svg>
      </div>
    </EditorialChartFrame>
  )
}
