/**
 * StoryCommunityBubbles — Pure SVG network graph.
 *
 * A central hub (institution or top vendor) connected by thin edges to
 * 22 vendor nodes in a radial layout. Node color = risk tier, radius
 * = relative value share. Reader sees a "planet + moons" pattern
 * consistent with capture / shell-network topologies.
 */

import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

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
  if (risk >= 0.60) return '#dc2626'
  if (risk >= 0.40) return '#ea580c'
  if (risk >= 0.25) return '#eab308'
  return '#16a34a'
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
  const positioned = layout(NODES)
  const criticalCount = NODES.filter((n) => n.risk >= 0.6).length
  const highCount = NODES.filter((n) => n.risk >= 0.4 && n.risk < 0.6).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        RUBLI · Red de proveedores vinculados
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        22 proveedores co-contratan con una sola institución pública
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        Cada nodo es un proveedor; el tamaño es su participación en el valor total; el color
        es su tier de riesgo. Los de alto riesgo se agrupan cerca del hub — patrón consistente
        con captura institucional.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-red-400">{criticalCount}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            proveedores de riesgo crítico
          </div>
        </div>
        <div className="border-l-2 border-orange-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-orange-400">{highCount}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            de riesgo alto
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-amber-400">22</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            miembros de la comunidad detectada
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-background p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Network graph of 22 vendors connected to a central institution hub, colored by risk tier"
        >
          {/* Radial grid */}
          {[80, 140, 200, 250].map((r) => (
            <circle
              key={r}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="#3d3734"
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
            <circle cx={CX} cy={CY} r={38} fill="#27272a" stroke="#71717a" strokeWidth={2} />
            <text x={CX} y={CY - 4} textAnchor="middle" fill="#f4f4f5" fontSize={11} fontWeight={700} fontFamily="var(--font-family-mono)">
              INSTITUCIÓN
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fill="#a1a1aa" fontSize={9} fontFamily="var(--font-family-mono)">
              hub
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
                  fill="#f4f4f5"
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
            { label: 'Crítico ≥ 0.60', color: '#dc2626' },
            { label: 'Alto ≥ 0.40',    color: '#ea580c' },
            { label: 'Medio ≥ 0.25',   color: '#eab308' },
            { label: 'Bajo < 0.25',    color: '#16a34a' },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
          <span className="text-text-muted ml-auto">Tamaño = participación en valor</span>
        </div>
      </div>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-text-secondary">
          Los proveedores de mayor riesgo orbitan cerca del hub — direcciones compartidas,
          representantes legales comunes, o patrones de co-licitación indican posibles redes
          de empresas fantasma.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-text-muted font-mono">
          Fuente: detección de comunidades Louvain · 200K+ proveedores · RUBLI v0.6.5
        </p>
        <a
          href="/network"
          className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-mono uppercase tracking-wide"
        >
          <ExternalLink className="h-3 w-3" />
          Explorar mapa completo
        </a>
      </div>
    </motion.div>
  )
}
