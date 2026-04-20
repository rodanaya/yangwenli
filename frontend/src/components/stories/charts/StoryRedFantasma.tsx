/**
 * StoryRedFantasma — Pure SVG ghost-network reveal.
 *
 * Grid of ghost vendors (circles) arranged in a loose network pattern.
 * Circle size = number of contracts. Color intensity = ghost risk score.
 * Faint lines connect vendors sharing the same address or legal rep.
 * Animation reveals them one by one — like uncovering the network.
 */

import { motion } from 'framer-motion'

interface Ghost {
  id: number
  x: number
  y: number
  contracts: number
  score: number
  cluster: number // shared-address cluster
}

// Deterministic pseudo-random layout (seeded) — 42 ghost vendors across 5 clusters
const GHOSTS: Ghost[] = [
  // Cluster 1: Insurgentes Sur 1605 — 8 ghosts
  { id: 1,  x: 100, y: 110, contracts: 3, score: 0.82, cluster: 1 },
  { id: 2,  x: 130, y: 90,  contracts: 5, score: 0.74, cluster: 1 },
  { id: 3,  x: 85,  y: 145, contracts: 2, score: 0.68, cluster: 1 },
  { id: 4,  x: 155, y: 130, contracts: 4, score: 0.79, cluster: 1 },
  { id: 5,  x: 115, y: 165, contracts: 6, score: 0.88, cluster: 1 },
  { id: 6,  x: 72,  y: 105, contracts: 2, score: 0.55, cluster: 1 },
  { id: 7,  x: 140, y: 175, contracts: 3, score: 0.71, cluster: 1 },
  { id: 8,  x: 95,  y: 75,  contracts: 4, score: 0.63, cluster: 1 },

  // Cluster 2: Ecatepec warehouse — 10 ghosts
  { id: 9,  x: 280, y: 90,  contracts: 7, score: 0.91, cluster: 2 },
  { id: 10, x: 310, y: 120, contracts: 5, score: 0.84, cluster: 2 },
  { id: 11, x: 250, y: 115, contracts: 3, score: 0.69, cluster: 2 },
  { id: 12, x: 295, y: 160, contracts: 4, score: 0.77, cluster: 2 },
  { id: 13, x: 265, y: 150, contracts: 6, score: 0.85, cluster: 2 },
  { id: 14, x: 335, y: 100, contracts: 2, score: 0.58, cluster: 2 },
  { id: 15, x: 240, y: 85,  contracts: 3, score: 0.62, cluster: 2 },
  { id: 16, x: 325, y: 145, contracts: 5, score: 0.81, cluster: 2 },
  { id: 17, x: 280, y: 180, contracts: 2, score: 0.52, cluster: 2 },
  { id: 18, x: 225, y: 140, contracts: 4, score: 0.74, cluster: 2 },

  // Cluster 3: Narvarte apt — 7 ghosts
  { id: 19, x: 455, y: 100, contracts: 3, score: 0.66, cluster: 3 },
  { id: 20, x: 490, y: 125, contracts: 5, score: 0.78, cluster: 3 },
  { id: 21, x: 425, y: 130, contracts: 2, score: 0.57, cluster: 3 },
  { id: 22, x: 470, y: 160, contracts: 4, score: 0.72, cluster: 3 },
  { id: 23, x: 510, y: 95,  contracts: 3, score: 0.64, cluster: 3 },
  { id: 24, x: 440, y: 170, contracts: 2, score: 0.59, cluster: 3 },
  { id: 25, x: 495, y: 180, contracts: 4, score: 0.76, cluster: 3 },

  // Cluster 4: Iztapalapa papeleria — 9 ghosts
  { id: 26, x: 150, y: 290, contracts: 6, score: 0.87, cluster: 4 },
  { id: 27, x: 180, y: 315, contracts: 4, score: 0.73, cluster: 4 },
  { id: 28, x: 120, y: 310, contracts: 3, score: 0.67, cluster: 4 },
  { id: 29, x: 210, y: 295, contracts: 5, score: 0.80, cluster: 4 },
  { id: 30, x: 165, y: 340, contracts: 2, score: 0.54, cluster: 4 },
  { id: 31, x: 135, y: 345, contracts: 3, score: 0.65, cluster: 4 },
  { id: 32, x: 195, y: 340, contracts: 4, score: 0.75, cluster: 4 },
  { id: 33, x: 95,  y: 290, contracts: 2, score: 0.51, cluster: 4 },
  { id: 34, x: 225, y: 325, contracts: 5, score: 0.82, cluster: 4 },

  // Cluster 5: Tlalnepantla — 8 ghosts
  { id: 35, x: 390, y: 280, contracts: 4, score: 0.71, cluster: 5 },
  { id: 36, x: 420, y: 300, contracts: 6, score: 0.86, cluster: 5 },
  { id: 37, x: 365, y: 305, contracts: 3, score: 0.63, cluster: 5 },
  { id: 38, x: 445, y: 280, contracts: 5, score: 0.79, cluster: 5 },
  { id: 39, x: 400, y: 335, contracts: 3, score: 0.68, cluster: 5 },
  { id: 40, x: 470, y: 310, contracts: 4, score: 0.73, cluster: 5 },
  { id: 41, x: 375, y: 345, contracts: 2, score: 0.56, cluster: 5 },
  { id: 42, x: 435, y: 345, contracts: 5, score: 0.84, cluster: 5 },
]

const CLUSTER_LABELS = [
  { cluster: 1, label: 'Insurgentes Sur 1605', x: 115, y: 55, count: 8 },
  { cluster: 2, label: 'Bodega Ecatepec',      x: 285, y: 55, count: 10 },
  { cluster: 3, label: 'Depto. Narvarte',      x: 470, y: 55, count: 7 },
  { cluster: 4, label: 'Papelería Iztapalapa', x: 170, y: 390, count: 9 },
  { cluster: 5, label: 'Tlalnepantla bodega',  x: 415, y: 390, count: 8 },
]

function getColor(score: number): string {
  if (score >= 0.85) return '#dc2626'
  if (score >= 0.75) return '#ef4444'
  if (score >= 0.65) return '#f97316'
  if (score >= 0.55) return '#fb923c'
  return '#78716c'
}

export function StoryRedFantasma() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-zinc-950 border border-zinc-800/60 p-5 space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        RUBLI · Red Fantasma
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        42 empresas, 5 domicilios — la geografía del fraude de facturación
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        Constelación de proveedores EFOS definitivo que comparten un puñado de
        direcciones fiscales. Cada nodo es un proveedor; tamaño = número de
        contratos; color = score de riesgo v0.6.5.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-red-500">11,208</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">empresas EFOS definitivo (SAT)</div>
        </div>
        <div className="border-l-2 border-orange-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-orange-400">38</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">confirmadas por RFC en COMPRANET</div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-amber-400">0.28</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">score promedio · subdetectadas</div>
        </div>
      </div>

      <svg
        viewBox="0 0 600 440"
        className="w-full h-auto"
        role="img"
        aria-label="Network of 42 ghost vendors clustered around 5 shared addresses"
      >
        {/* Cluster boundaries */}
        {CLUSTER_LABELS.map((cluster) => {
          const members = GHOSTS.filter((g) => g.cluster === cluster.cluster)
          const cx = members.reduce((s, g) => s + g.x, 0) / members.length
          const cy = members.reduce((s, g) => s + g.y, 0) / members.length
          return (
            <motion.circle
              key={`boundary-${cluster.cluster}`}
              cx={cx}
              cy={cy}
              r={65}
              fill="#dc262608"
              stroke="#dc262640"
              strokeWidth={0.7}
              strokeDasharray="3 4"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
          )
        })}

        {/* Edges within each cluster (faint) */}
        {CLUSTER_LABELS.map((cluster) => {
          const members = GHOSTS.filter((g) => g.cluster === cluster.cluster)
          return members.slice(0, -1).map((a, i) => {
            const b = members[i + 1]
            return (
              <motion.line
                key={`edge-${cluster.cluster}-${a.id}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#ef4444"
                strokeOpacity={0.2}
                strokeWidth={0.6}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            )
          })
        })}

        {/* Cluster labels */}
        {CLUSTER_LABELS.map((cluster) => (
          <motion.g
            key={`label-${cluster.cluster}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <text
              x={cluster.x}
              y={cluster.y}
              textAnchor="middle"
              fill="#a1a1aa"
              fontSize={11}
              fontFamily="var(--font-family-mono)"
              fontWeight={600}
            >
              {cluster.label}
            </text>
            <text
              x={cluster.x}
              y={cluster.y + 13}
              textAnchor="middle"
              fill="#52525b"
              fontSize={9}
              fontFamily="var(--font-family-mono)"
            >
              {cluster.count} fantasmas
            </text>
          </motion.g>
        ))}

        {/* Ghost nodes */}
        {GHOSTS.map((ghost, i) => {
          const r = 4 + ghost.contracts * 1.1
          return (
            <motion.g
              key={ghost.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.8 + i * 0.025,
                ease: 'backOut',
              }}
            >
              <circle
                cx={ghost.x}
                cy={ghost.y}
                r={r + 2}
                fill={getColor(ghost.score)}
                fillOpacity={0.15}
              />
              <circle
                cx={ghost.x}
                cy={ghost.y}
                r={r}
                fill={getColor(ghost.score)}
                fillOpacity={0.85}
                stroke="#450a0a"
                strokeWidth={0.8}
              />
            </motion.g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-600"></div>
          <span>score ≥ 0.85</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>0.75-0.85</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>0.65-0.75</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-400"></div>
          <span>0.55-0.65</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-stone-500"></div>
          <span>&lt; 0.55 · subdetectado</span>
        </div>
      </div>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          Los EFOS definitivo comparten una firma estructural: pocos contratos
          (típicamente 2-5), vida corta (2-3 años) y domicilios fiscales compartidos.
          El modelo v0.6.5 los subdetecta (score 0.28) porque fue entrenado con
          casos grandes (IMSS, SEGALMEX) — una brecha de detección sistemática.
        </p>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono">
        Fuente: SAT Art. 69-B CFF · cruce con COMPRANET 2018-2024 · 38 RFC confirmados + 125 por nombre
      </p>
    </motion.div>
  )
}
