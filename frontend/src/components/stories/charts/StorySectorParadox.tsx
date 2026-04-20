/**
 * StorySectorParadox — Pure SVG scatter grid.
 *
 * Each point is a sector. X = direct-award rate, Y = high-risk contract
 * share. Size = total spend (MXN T). Color = sector. The paradox:
 * Infraestructura has LOW DA but HIGH structural risk — proving that
 * "no competition" ≠ corruption. The eye must see both dimensions.
 */

import { motion } from 'framer-motion'
import { SECTOR_COLORS } from '@/lib/constants'

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
  return (SECTOR_COLORS as Record<string, string>)[code] || '#64748b'
}

export function StorySectorParadox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-950 border border-zinc-800/60 p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        RUBLI · La paradoja de la adjudicación directa
      </p>

      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Agricultura tiene 93% de adjudicación directa — pero solo 2% de riesgo alto
      </p>
      <p className="text-xs text-zinc-500 mb-4">
        Infraestructura tiene la menor tasa de DA, pero la mayor concentración de riesgo estructural
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Sector scatter: direct-award rate on X-axis, high-risk contract percentage on Y-axis"
      >
        {/* Quadrant guides */}
        <rect x={xFor(75)} y={yFor(20)} width={xFor(100) - xFor(75)} height={yFor(10) - yFor(20)} fill="#dc2626" fillOpacity={0.04} />
        <rect x={xFor(X_MIN)} y={yFor(20)} width={xFor(75) - xFor(X_MIN)} height={yFor(10) - yFor(20)} fill="#ea580c" fillOpacity={0.05} />

        {/* Grid */}
        {[5, 10, 15, 20].map((v) => (
          <g key={`yg-${v}`}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yFor(v)} y2={yFor(v)} stroke="#e2ddd6" strokeDasharray="2 4" />
            <text x={PAD.left - 8} y={yFor(v) + 3} textAnchor="end" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)">
              {v}%
            </text>
          </g>
        ))}
        {[70, 80, 90, 100].map((v) => (
          <g key={`xg-${v}`}>
            <line x1={xFor(v)} x2={xFor(v)} y1={PAD.top} y2={H - PAD.bottom} stroke="#e2ddd6" strokeDasharray="2 4" />
            <text x={xFor(v)} y={H - PAD.bottom + 16} textAnchor="middle" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)">
              {v}%
            </text>
          </g>
        ))}

        {/* Axis titles */}
        <text
          x={PAD.left + PLOT_W / 2}
          y={H - 12}
          textAnchor="middle"
          fill="#71717a"
          fontSize={10}
          fontFamily="var(--font-family-mono)"
          letterSpacing="0.1em"
        >
          TASA DE ADJUDICACIÓN DIRECTA →
        </text>
        <text
          x={15}
          y={PAD.top + PLOT_H / 2}
          textAnchor="middle"
          fill="#71717a"
          fontSize={10}
          fontFamily="var(--font-family-mono)"
          letterSpacing="0.1em"
          transform={`rotate(-90, 15, ${PAD.top + PLOT_H / 2})`}
        >
          % DE CONTRATOS EN RIESGO ALTO →
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
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
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
                fill={isParadox ? '#f4f4f5' : '#a1a1aa'}
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
          <text x={xFor(74)} y={yFor(18)} fill="#fbbf24" fontSize={10} fontFamily="var(--font-family-mono)" fontWeight={600}>
            ← BAJA DA · ALTO RIESGO
          </text>
          <text x={xFor(92)} y={yFor(3)} fill="#fbbf24" fontSize={10} fontFamily="var(--font-family-mono)" fontWeight={600} textAnchor="end">
            ALTA DA · BAJO RIESGO →
          </text>
        </g>
      </svg>

      <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          La posición de <strong className="text-orange-300">Infraestructura</strong> (baja DA, alto
          riesgo) desmiente el atajo "adjudicación directa = corrupción". El modelo detecta
          patrones estructurales que el flag binario no captura.
        </p>
      </div>

      <p className="mt-3 text-[10px] text-zinc-600 font-mono">
        Tamaño = gasto total (MXN T) · Fuente: COMPRANET · 12 sectores · RUBLI v0.6.5
      </p>
    </motion.div>
  )
}
