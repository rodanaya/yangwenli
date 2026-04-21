/**
 * StoryInsabi — Before / after: Seguro Popular vs INSABI.
 *
 * Two side-by-side columns. For each era, three dot-strip indicators:
 * competition rate, average risk score, contract volume. Shows the
 * deterioration when INSABI replaced Seguro Popular in 2020.
 */

import { motion } from 'framer-motion'

interface EraMetric {
  key: string
  label: string
  seguroPopular: number // 0-100 for strip
  insabi: number        // 0-100 for strip
  spValue: string
  insabiValue: string
  worseIsHigher: boolean
}

// Editorial metrics — health sector under Seguro Popular (2015-2019) vs INSABI (2020-2023)
const METRICS: EraMetric[] = [
  {
    key: 'competition',
    label: 'Competencia real',
    seguroPopular: 22,
    insabi: 5,
    spValue: '22%',
    insabiValue: '~5%',
    worseIsHigher: false, // lower = worse
  },
  {
    key: 'risk',
    label: 'Riesgo promedio',
    seguroPopular: 28,
    insabi: 48,
    spValue: '0.28',
    insabiValue: '0.48',
    worseIsHigher: true, // higher = worse
  },
  {
    key: 'shortage',
    label: 'Desabasto pediátrico',
    seguroPopular: 8,
    insabi: 74,
    spValue: '~8%',
    insabiValue: '~74%',
    worseIsHigher: true,
  },
  {
    key: 'decemberSpike',
    label: 'Gasto concentrado diciembre',
    seguroPopular: 18,
    insabi: 61,
    spValue: '18%',
    insabiValue: '61%',
    worseIsHigher: true,
  },
]

const DOTS = 50
const DOT_R = 3.2
const DOT_GAP_X = 7
const STRIP_H = 22
const LABEL_W = 172
const VALUE_W = 60
const STRIP_W = DOTS * DOT_GAP_X
const COL_GAP = 42

const W = LABEL_W + STRIP_W * 2 + VALUE_W * 2 + COL_GAP + 16
const H = 96 + METRICS.length * (STRIP_H + 22) + 24

export function StoryInsabi() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        RUBLI · Seguro Popular vs INSABI · sector salud
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        El experimento INSABI: cuatro indicadores, todos peor después de 2020
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        Comparación directa entre la era Seguro Popular (2015-2019) y la era INSABI
        (2020-2023) en el mismo sector salud. Cada indicador es una tira de puntos:
        verde cuando Seguro Popular era mejor, rojo cuando INSABI empeoró la métrica.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-red-400 tabular-nums">~95%</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            adj. directa INSABI · vs. ~78% promedio salud
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-amber-400 tabular-nums">18.2B</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            MXN sin trazabilidad · ASF 2023
          </div>
        </div>
        <div className="border-l-2 border-orange-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-orange-400 tabular-nums">12B</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            MXN sobreprecio estimado vs. licitación
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-zinc-800 bg-zinc-950 p-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[720px]"
          role="img"
          aria-label="Seguro Popular vs INSABI comparison chart"
        >
          {/* Headers */}
          <text x={LABEL_W + STRIP_W / 2 + VALUE_W / 2} y={26} textAnchor="middle" fill="#16a34a" fontSize={11} fontFamily="var(--font-family-serif)" fontWeight={700}>
            Seguro Popular
          </text>
          <text x={LABEL_W + STRIP_W / 2 + VALUE_W / 2} y={42} textAnchor="middle" fill="#4ade80" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.08em">
            2015-2019
          </text>

          <text
            x={LABEL_W + STRIP_W + VALUE_W + COL_GAP + STRIP_W / 2 + VALUE_W / 2}
            y={26}
            textAnchor="middle"
            fill="#dc2626"
            fontSize={11}
            fontFamily="var(--font-family-serif)"
            fontWeight={700}
          >
            INSABI
          </text>
          <text
            x={LABEL_W + STRIP_W + VALUE_W + COL_GAP + STRIP_W / 2 + VALUE_W / 2}
            y={42}
            textAnchor="middle"
            fill="#f87171"
            fontSize={9}
            fontFamily="var(--font-family-mono)"
            letterSpacing="0.08em"
          >
            2020-2023
          </text>

          {/* VS divider */}
          <line
            x1={LABEL_W + STRIP_W + VALUE_W + COL_GAP / 2}
            y1={54}
            x2={LABEL_W + STRIP_W + VALUE_W + COL_GAP / 2}
            y2={H - 36}
            stroke="#3d3734"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <text
            x={LABEL_W + STRIP_W + VALUE_W + COL_GAP / 2}
            y={(H - 36 + 54) / 2}
            textAnchor="middle"
            fill="#52525b"
            fontSize={10}
            fontFamily="var(--font-family-mono)"
            fontWeight={700}
          >
            VS
          </text>

          {/* Rows */}
          {METRICS.map((m, rowIdx) => {
            const y0 = 70 + rowIdx * (STRIP_H + 22)
            const cy = y0 + STRIP_H / 2
            const spFilled = Math.round(m.seguroPopular / 2)
            const insabiFilled = Math.round(m.insabi / 2)

            // Color logic: green if SP is better, red if INSABI worse
            const spColor = m.worseIsHigher
              ? (m.seguroPopular < m.insabi ? '#16a34a' : '#dc2626')
              : (m.seguroPopular > m.insabi ? '#16a34a' : '#dc2626')
            const insabiColor = m.worseIsHigher
              ? (m.insabi > m.seguroPopular ? '#dc2626' : '#16a34a')
              : (m.insabi < m.seguroPopular ? '#dc2626' : '#16a34a')

            return (
              <g key={m.key}>
                {/* Label */}
                <text
                  x={LABEL_W - 12}
                  y={cy + 3}
                  textAnchor="end"
                  fill="#e4e4e7"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {m.label}
                </text>

                {/* SP strip */}
                {Array.from({ length: DOTS }).map((_, i) => (
                  <motion.circle
                    key={`sp-${i}`}
                    cx={LABEL_W + i * DOT_GAP_X + DOT_GAP_X / 2}
                    cy={cy}
                    r={DOT_R}
                    fill={i < spFilled ? spColor : '#2d2926'}
                    stroke={i < spFilled ? 'none' : '#3d3734'}
                    strokeWidth={i < spFilled ? 0 : 0.5}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: rowIdx * 0.1 + i * 0.004 }}
                  />
                ))}
                <text
                  x={LABEL_W + STRIP_W + VALUE_W - 8}
                  y={cy + 3}
                  textAnchor="end"
                  fill={spColor}
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                >
                  {m.spValue}
                </text>

                {/* INSABI strip */}
                {Array.from({ length: DOTS }).map((_, i) => {
                  const cx = LABEL_W + STRIP_W + VALUE_W + COL_GAP + i * DOT_GAP_X + DOT_GAP_X / 2
                  return (
                    <motion.circle
                      key={`insabi-${i}`}
                      cx={cx}
                      cy={cy}
                      r={DOT_R}
                      fill={i < insabiFilled ? insabiColor : '#2d2926'}
                      stroke={i < insabiFilled ? 'none' : '#3d3734'}
                      strokeWidth={i < insabiFilled ? 0 : 0.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.4 + rowIdx * 0.1 + i * 0.004 }}
                    />
                  )
                })}
                <text
                  x={LABEL_W + STRIP_W * 2 + VALUE_W * 2 + COL_GAP - 8}
                  y={cy + 3}
                  textAnchor="end"
                  fill={insabiColor}
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                >
                  {m.insabiValue}
                </text>
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
            verde = métrica sana · rojo = métrica deteriorada · cada punto = 2pp
          </text>
        </svg>
      </div>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          INSABI operó cuatro años. En los cuatro, todos los indicadores de salud del
          sistema de compras empeoraron: menos competencia, más riesgo, más desabasto,
          mayor concentración de gasto a fin de año. El instituto desapareció en 2023;
          las consecuencias para los pacientes — niños sin quimioterapia, adultos sin
          insulina — no.
        </p>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono">
        Fuente: COMPRANET 2015-2023 · ASF Cuenta Pública 2020-2023 · PAHO reportes UNOPS
      </p>
    </motion.div>
  )
}
