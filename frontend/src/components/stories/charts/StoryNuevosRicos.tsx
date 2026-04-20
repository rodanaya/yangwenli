/**
 * StoryNuevosRicos — Pure SVG scatter grid.
 *
 * Each point is a vendor cohort (registration year). X = direct-award rate,
 * Y = total value captured (MXN B), size = contract count, color = risk
 * tier. OECD 25% ceiling shown. Three big bubbles for cohorts Calderón,
 * Peña, AMLO — plus background scatter of annual sub-cohorts.
 */

import { motion } from 'framer-motion'

interface CohortPoint {
  year: number
  era: 'calderon' | 'pena' | 'amlo'
  daPct: number
  valueB: number
  count: number // thousands
  risk: number // 0-1 avg
}

const POINTS: CohortPoint[] = [
  // Calderón yearly
  { year: 2007, era: 'calderon', daPct: 52.1, valueB: 38,  count: 9.5,  risk: 0.18 },
  { year: 2008, era: 'calderon', daPct: 56.3, valueB: 44,  count: 11.2, risk: 0.21 },
  { year: 2009, era: 'calderon', daPct: 60.7, valueB: 47,  count: 12.1, risk: 0.24 },
  { year: 2010, era: 'calderon', daPct: 62.0, valueB: 52,  count: 13.7, risk: 0.26 },
  { year: 2011, era: 'calderon', daPct: 63.2, valueB: 58,  count: 12.4, risk: 0.28 },
  { year: 2012, era: 'calderon', daPct: 64.0, valueB: 62,  count: 13.0, risk: 0.30 },
  // Peña Nieto yearly
  { year: 2013, era: 'pena', daPct: 71.8, valueB: 75,  count: 21.0, risk: 0.35 },
  { year: 2014, era: 'pena', daPct: 74.2, valueB: 88,  count: 22.5, risk: 0.38 },
  { year: 2015, era: 'pena', daPct: 77.1, valueB: 95,  count: 23.8, risk: 0.40 },
  { year: 2016, era: 'pena', daPct: 78.9, valueB: 102, count: 23.1, risk: 0.43 },
  { year: 2017, era: 'pena', daPct: 79.6, valueB: 110, count: 22.7, risk: 0.45 },
  { year: 2018, era: 'pena', daPct: 81.0, valueB: 105, count: 22.8, risk: 0.47 },
  // AMLO yearly
  { year: 2019, era: 'amlo', daPct: 82.1, valueB: 118, count: 14.2, risk: 0.48 },
  { year: 2020, era: 'amlo', daPct: 83.6, valueB: 135, count: 14.0, risk: 0.50 },
  { year: 2021, era: 'amlo', daPct: 84.8, valueB: 128, count: 13.8, risk: 0.52 },
  { year: 2022, era: 'amlo', daPct: 85.2, valueB: 132, count: 13.5, risk: 0.54 },
  { year: 2023, era: 'amlo', daPct: 86.1, valueB: 142, count: 13.2, risk: 0.55 },
  { year: 2024, era: 'amlo', daPct: 85.9, valueB: 130, count: 13.0, risk: 0.53 },
]

const ERA_LABELS: Record<string, string> = {
  calderon: 'Calderón',
  pena: 'Peña Nieto',
  amlo: 'AMLO',
}

const ERA_COLORS: Record<string, string> = {
  calderon: '#3b82f6',
  pena: '#ef4444',
  amlo: '#f59e0b',
}

function riskColor(risk: number): string {
  if (risk >= 0.5) return '#dc2626'
  if (risk >= 0.35) return '#ea580c'
  if (risk >= 0.2) return '#eab308'
  return '#16a34a'
}

// Chart dimensions
const W = 680
const H = 440
const PAD = { top: 30, right: 40, bottom: 50, left: 60 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const X_MIN = 50
const X_MAX = 90
const Y_MIN = 20
const Y_MAX = 160

function xFor(v: number) {
  return PAD.left + ((v - X_MIN) / (X_MAX - X_MIN)) * PLOT_W
}
function yFor(v: number) {
  return PAD.top + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H
}

export function StoryNuevosRicos() {
  // Compute era centroids for big bubbles
  const eraCentroids = (['calderon', 'pena', 'amlo'] as const).map((era) => {
    const pts = POINTS.filter((p) => p.era === era)
    const avgDa = pts.reduce((s, p) => s + p.daPct, 0) / pts.length
    const avgVal = pts.reduce((s, p) => s + p.valueB, 0) / pts.length
    const totalCount = pts.reduce((s, p) => s + p.count, 0)
    const avgRisk = pts.reduce((s, p) => s + p.risk, 0) / pts.length
    return { era, daPct: avgDa, valueB: avgVal, count: totalCount, risk: avgRisk }
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-zinc-950 border border-zinc-800/60 p-5"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1.5">
        RUBLI · Cohortes de proveedores
      </p>

      <p className="text-lg font-bold text-zinc-100 leading-tight mb-0.5">
        Los proveedores nuevos bajo AMLO nacen más opacos — y con más dinero
      </p>
      <p className="text-xs text-zinc-500 mb-4">
        Cada punto es el cohorte de un año de registro · eje X = adj. directa · eje Y = valor capturado
      </p>

      <div className="border-l-2 border-red-500 pl-4 py-1 mb-4">
        <div className="text-3xl font-mono font-bold text-red-500">+25pp</div>
        <div className="text-[11px] text-zinc-400 mt-0.5">
          DA promedio Calderón → AMLO —{' '}
          <span className="text-cyan-400">{(eraCentroids[2].daPct / 25).toFixed(1)}x el límite OCDE</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Scatter plot of vendor cohorts by registration year: direct award rate versus total value captured"
      >
        {/* Grid */}
        {[40, 80, 120, 160].map((v) => (
          <g key={`yg-${v}`}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yFor(v)} y2={yFor(v)} stroke="#e2ddd6" strokeDasharray="2 4" />
            <text x={PAD.left - 8} y={yFor(v) + 3} textAnchor="end" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)">
              {v}B
            </text>
          </g>
        ))}
        {[60, 70, 80].map((v) => (
          <g key={`xg-${v}`}>
            <line x1={xFor(v)} x2={xFor(v)} y1={PAD.top} y2={H - PAD.bottom} stroke="#e2ddd6" strokeDasharray="2 4" />
            <text x={xFor(v)} y={H - PAD.bottom + 16} textAnchor="middle" fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)">
              {v}%
            </text>
          </g>
        ))}

        {/* OECD vertical line */}
        <line
          x1={xFor(25)}
          x2={xFor(25)}
          y1={PAD.top}
          y2={H - PAD.bottom}
          stroke="#22d3ee"
          strokeWidth={1.5}
          strokeDasharray="6 3"
        />
        {/* Label only if 25 is visible; here X_MIN=50 so place label at start */}
        <text x={PAD.left + 4} y={PAD.top + 12} fill="#22d3ee" fontSize={9} fontFamily="var(--font-family-mono)">
          OCDE máx 25% →
        </text>

        {/* Axis labels */}
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
          VALOR CAPTURADO (MXN B) →
        </text>

        {/* Yearly points (small) */}
        {POINTS.map((p, i) => (
          <motion.circle
            key={p.year}
            cx={xFor(p.daPct)}
            cy={yFor(p.valueB)}
            r={3 + Math.sqrt(p.count)}
            fill={riskColor(p.risk)}
            fillOpacity={0.4}
            stroke={ERA_COLORS[p.era]}
            strokeWidth={1}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.03 }}
          />
        ))}

        {/* Era centroids (big labeled bubbles) */}
        {eraCentroids.map((c, i) => (
          <motion.g
            key={c.era}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 + i * 0.15 }}
          >
            <circle
              cx={xFor(c.daPct)}
              cy={yFor(c.valueB)}
              r={22}
              fill={ERA_COLORS[c.era]}
              fillOpacity={0.2}
              stroke={ERA_COLORS[c.era]}
              strokeWidth={2}
            />
            <text
              x={xFor(c.daPct)}
              y={yFor(c.valueB) - 28}
              textAnchor="middle"
              fill={ERA_COLORS[c.era]}
              fontSize={11}
              fontWeight={700}
              fontFamily="var(--font-family-mono)"
            >
              {ERA_LABELS[c.era]}
            </text>
            <text
              x={xFor(c.daPct)}
              y={yFor(c.valueB) + 3}
              textAnchor="middle"
              fill="#f4f4f5"
              fontSize={10}
              fontWeight={700}
              fontFamily="var(--font-family-mono)"
            >
              {c.daPct.toFixed(0)}%
            </text>
          </motion.g>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-mono text-zinc-500">
        {[
          { label: 'Riesgo crítico', color: '#dc2626' },
          { label: 'Alto',           color: '#ea580c' },
          { label: 'Medio',          color: '#eab308' },
          { label: 'Bajo',           color: '#16a34a' },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, opacity: 0.6 }} />
            {label}
          </span>
        ))}
        <span className="text-zinc-600 ml-auto">Tamaño del punto = volumen de contratos</span>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-xs text-zinc-300 leading-relaxed">
          El centroide de AMLO (nodo naranja) se ubica arriba y a la derecha: más valor capturado
          con mayor opacidad. Los cohortes cruzan hacia zonas de riesgo alto (rojo) a medida que
          el eje X avanza.
        </p>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono mt-3">
        Fuente: COMPRANET · cohortes por año de primer registro federal · RUBLI v0.6.5
      </p>
    </motion.div>
  )
}
