/**
 * StoryTrenMaya — The 5 sections of the Tren Maya route, no competitive bidding.
 *
 * Each section of the rail route (1-5) displayed as a horizontal track.
 * For each: a dot strip showing DA rate, risk score, major contractor labeled.
 * Size = contract value. The overall message: 1,525 km of rail, ~0 open tenders.
 */

import { motion } from 'framer-motion'

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
  if (r >= 95) return '#dc2626'
  if (r >= 80) return '#ea580c'
  return '#f59e0b'
}

export function StoryTrenMaya() {
  const totalKm = SECTIONS.reduce((s, r) => s + r.km, 0)
  const totalValue = SECTIONS.reduce((s, r) => s + r.valueB, 0)
  const avgDA = SECTIONS.reduce((s, r) => s + r.daRate * r.km, 0) / totalKm

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        RUBLI · Tren Maya · adjudicación por tramo
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        1,525 kilómetros de vía, cero licitaciones públicas abiertas
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        Cada fila es un tramo del trazado. La tira de puntos muestra la tasa de
        adjudicación directa de ese tramo. El último tramo — bajo contratación SEDENA
        por declaratoria de seguridad nacional — queda fuera de COMPRANET.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-red-400 tabular-nums">
            {avgDA.toFixed(1)}%
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            adj. directa promedio · ponderada por km
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-amber-400 tabular-nums">
            {totalValue.toFixed(0)}B
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            MXN visibles · resto en SEDENA clasificado
          </div>
        </div>
        <div className="border-l-2 border-cyan-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-cyan-400 tabular-nums">
            {totalKm}
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            km total · 6 tramos · 0 licitaciones abiertas
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-background p-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[720px]"
          role="img"
          aria-label="Tren Maya direct award rate by section"
        >
          {/* Header */}
          <text x={LABEL_W - 8} y={32} textAnchor="end" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            TRAMO
          </text>
          <text x={LABEL_W + STRIP_W / 2} y={20} textAnchor="middle" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            TASA DE ADJUDICACIÓN DIRECTA (0% → 100%)
          </text>
          {/* OECD line */}
          <g>
            <line
              x1={LABEL_W + Math.round(OECD_LIMIT / 2) * DOT_GAP_X - DOT_GAP_X / 2}
              y1={32}
              x2={LABEL_W + Math.round(OECD_LIMIT / 2) * DOT_GAP_X - DOT_GAP_X / 2}
              y2={H - 36}
              stroke="#22d3ee"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            <text
              x={LABEL_W + Math.round(OECD_LIMIT / 2) * DOT_GAP_X - DOT_GAP_X / 2}
              y={28}
              textAnchor="middle"
              fill="#22d3ee"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
              fontWeight={700}
            >
              OCDE 25%
            </text>
          </g>
          <text x={LABEL_W + STRIP_W + META_W / 2 + 20} y={32} textAnchor="middle" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.1em">
            VALOR · EJECUTOR
          </text>

          {/* Route line (vertical spine) */}
          <line
            x1={LABEL_W - 24}
            y1={64}
            x2={LABEL_W - 24}
            y2={H - 30}
            stroke="#52525b"
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
                  fill={isSEDENA ? '#1e3a5f' : '#a16207'}
                  stroke={isSEDENA ? '#60a5fa' : '#fbbf24'}
                  strokeWidth={1.5}
                />
                <text
                  x={LABEL_W - 24}
                  y={cy + 3}
                  textAnchor="middle"
                  fill="#fff"
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
                  fill="#e4e4e7"
                  fontSize={11}
                  fontFamily="var(--font-family-serif)"
                  fontWeight={700}
                >
                  {sec.name}
                </text>
                <text
                  x={LABEL_W - 12}
                  y={cy + 11}
                  textAnchor="end"
                  fill="#a1a1aa"
                  fontSize={8.5}
                  fontFamily="var(--font-family-mono)"
                >
                  {sec.route}
                </text>
                <text
                  x={LABEL_W - 12}
                  y={cy + 22}
                  textAnchor="end"
                  fill="#71717a"
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
                      fill="#1e293b"
                      stroke="#3b82f6"
                      strokeWidth={0.75}
                      strokeDasharray="3 3"
                      opacity={0.7}
                    />
                    <text
                      x={LABEL_W + STRIP_W / 2}
                      y={cy + 3}
                      textAnchor="middle"
                      fill="#93c5fd"
                      fontSize={10}
                      fontFamily="var(--font-family-mono)"
                      fontWeight={700}
                      letterSpacing="0.1em"
                    >
                      SEDENA · FUERA DE COMPRANET · SEGURIDAD NACIONAL
                    </text>
                  </g>
                ) : (
                  Array.from({ length: DOTS }).map((_, i) => (
                    <motion.circle
                      key={i}
                      cx={LABEL_W + i * DOT_GAP_X + DOT_GAP_X / 2}
                      cy={cy}
                      r={DOT_R}
                      fill={i < filled ? color : '#2d2926'}
                      stroke={i < filled ? 'none' : '#3d3734'}
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
                    fontSize={14}
                    fontFamily="var(--font-family-mono)"
                    fontWeight={700}
                    y={-2}
                  >
                    {sec.valueB.toFixed(1)}B
                  </text>
                  <text
                    textAnchor="start"
                    fill="#a1a1aa"
                    fontSize={9}
                    fontFamily="var(--font-family-mono)"
                    y={12}
                  >
                    {isSEDENA ? 'estimado' : `${sec.daRate}% · risk ${sec.riskScore.toFixed(2)}`}
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
            fill="#52525b"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
          >
            cada punto = 2pp · color = intensidad de adjudicación directa
          </text>
        </svg>
      </div>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-text-secondary">
          Los cinco tramos bajo FONATUR promediaron 97.6% de adjudicación directa. Los
          tramos 6 y 7 se movieron a SEDENA bajo declaratoria de seguridad nacional,
          exentándolos de la Ley de Obras Públicas. El resultado: el megaproyecto más
          caro del sexenio ejecutado sin una sola licitación pública abierta.
        </p>
      </div>

      <p className="text-[10px] text-text-muted font-mono">
        Fuente: COMPRANET FONATUR 2019-2024 · DOF 22/11/2021 · ASF Auditoría de Desempeño 2023 · cifras aprox.
      </p>
    </motion.div>
  )
}
