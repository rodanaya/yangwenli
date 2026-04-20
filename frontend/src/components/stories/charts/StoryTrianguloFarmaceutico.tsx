/**
 * StoryTrianguloFarmaceutico — Pure SVG pharmaceutical triangle.
 *
 * Three institution nodes (IMSS, ISSSTE, SS) at triangle vertices.
 * Three vendor nodes (Fármacos Especializados, Maypo, DIMM) floating
 * inside the triangle. Edge widths proportional to contract values.
 * Dot strips below show direct award concentration per vendor.
 */

import { motion } from 'framer-motion'

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
  { id: 'farmacos', label: 'Fármacos Esp.', x: 220, y: 195, total: 128, daRate: 81, score: 0.89, color: '#dc2626' },
  { id: 'maypo',    label: 'Maypo Intl.',   x: 155, y: 235, total: 92,  daRate: 78, score: 0.84, color: '#ef4444' },
  { id: 'dimm',     label: 'DIMM',          x: 285, y: 235, total: 65,  daRate: 76, score: 0.81, color: '#f87171' },
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
  const maxValue = Math.max(...EDGES.map((e) => e.value))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-950 border border-zinc-800/60 p-5 space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        RUBLI · Triángulo Farmacéutico
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        Tres instituciones, tres proveedores, 285 mil millones de pesos
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        El grueso del gasto farmacéutico federal 2019-2023 fluyó desde IMSS, ISSSTE
        y la Secretaría de Salud hacia tres proveedores dominantes. El ancho de cada
        arista es proporcional al valor contratado.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-red-500">$128B</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            Fármacos Especializados · score 0.89
          </div>
        </div>
        <div className="border-l-2 border-red-400 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-red-400">$92B</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            Maypo Internacional · score 0.84
          </div>
        </div>
        <div className="border-l-2 border-red-300 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-red-300">$65B</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            DIMM · score 0.81
          </div>
        </div>
      </div>

      <svg
        viewBox="0 0 440 440"
        className="w-full h-auto"
        role="img"
        aria-label="Pharmaceutical triangle showing flow from IMSS, ISSSTE, and SS to three dominant vendors"
      >
        {/* Triangle outline connecting institutions */}
        <motion.path
          d={`M ${INSTITUTIONS[0].x} ${INSTITUTIONS[0].y} L ${INSTITUTIONS[1].x} ${INSTITUTIONS[1].y} L ${INSTITUTIONS[2].x} ${INSTITUTIONS[2].y} Z`}
          fill="none"
          stroke="#e2ddd6"
          strokeWidth={1}
          strokeDasharray="4 6"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
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
              stroke="#dc2626"
              strokeOpacity={0.35}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
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
              fill="#fca5a5"
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
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <circle cx={inst.x} cy={inst.y} r={28} fill="#18181b" stroke="#3b82f6" strokeWidth={2} />
            <text
              x={inst.x}
              y={inst.y + 4}
              textAnchor="middle"
              fill="#93c5fd"
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
              fill="#52525b"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
            >
              ${inst.spend}B gasto
            </text>
          </motion.g>
        ))}

        {/* Vendor nodes */}
        {VENDORS.map((v, i) => (
          <motion.g
            key={v.id}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
          >
            <circle
              cx={v.x}
              cy={v.y}
              r={18 + (v.total / 128) * 10}
              fill={v.color}
              fillOpacity={0.9}
              stroke="#450a0a"
              strokeWidth={1.5}
            />
            <text
              x={v.x}
              y={v.y + 3}
              textAnchor="middle"
              fill="#fef2f2"
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
              fill="#d4d4d8"
              fontSize={10}
              fontFamily="var(--font-family-mono)"
            >
              {v.label}
            </text>
          </motion.g>
        ))}

        {/* Legend */}
        <g transform="translate(20, 400)">
          <circle cx={6} cy={6} r={6} fill="#18181b" stroke="#3b82f6" strokeWidth={1.5} />
          <text x={18} y={10} fill="#71717a" fontSize={9} fontFamily="var(--font-family-mono)">
            Instituciones federales
          </text>
          <circle cx={180} cy={6} r={6} fill="#dc2626" />
          <text x={192} y={10} fill="#71717a" fontSize={9} fontFamily="var(--font-family-mono)">
            Proveedor dominante
          </text>
        </g>
      </svg>

      {/* DA rate dot strips */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500">
          Adjudicación directa por proveedor · cada punto = 2pp · OCDE máx 25%
        </p>
        {VENDORS.map((v) => {
          const filled = Math.round(v.daRate / 2)
          return (
            <div key={v.id} className="flex items-center gap-3">
              <div className="w-32 text-[11px] font-mono text-zinc-300">{v.label}</div>
              <svg viewBox="0 0 420 14" className="flex-1 h-3">
                {Array.from({ length: 50 }).map((_, i) => {
                  const isFilled = i < filled
                  const isOecd = i === 12
                  return (
                    <g key={i}>
                      {isOecd && (
                        <line x1={i * 8 + 4} y1={0} x2={i * 8 + 4} y2={14} stroke="#22d3ee" strokeWidth={0.7} strokeDasharray="2 2" />
                      )}
                      <motion.circle
                        cx={i * 8 + 4}
                        cy={7}
                        r={3}
                        fill={isFilled ? v.color : '#f3f1ec'}
                        stroke={isFilled ? 'none' : '#e2ddd6'}
                        strokeWidth={isFilled ? 0 : 0.5}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, delay: i * 0.01 }}
                      />
                    </g>
                  )
                })}
              </svg>
              <div className="w-12 text-[11px] font-mono text-red-400 text-right">{v.daRate}%</div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          Los tres proveedores comparten el mismo patrón: adjudicación directa por
          encima del 75% — más de 3x el límite OCDE — y scores de riesgo v0.6.5
          superiores a 0.81. Fármacos Especializados concentró el 45% del gasto
          farmacéutico federal rastreable entre 2019-2023.
        </p>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono">
        Fuente: COMPRANET 2019-2023 · análisis RUBLI · modelo v0.6.5 · COFECE DE-011-2016
      </p>
    </motion.div>
  )
}
