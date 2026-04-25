/**
 * StoryRacingBar — Pure SVG bubble cluster.
 *
 * Top AMLO-era agricultural vendors shown as bubbles around the SEGALMEX
 * hub. Bubble size = contract value. Bubble color = direct-award rate
 * (red = 100% DA, orange = high, green = mixed). Reader sees the cluster
 * of ghost companies orbiting the parastatal that captured agriculture.
 */

import { motion } from 'framer-motion'

interface Vendor {
  name: string
  valueB: number // billions MXN
  daPct: number
  note?: string
  avgMxn?: string
}

const VENDORS: Vendor[] = [
  { name: 'SEGALMEX',          valueB: 6.43, daPct: 41.2 },
  { name: 'Molinos Azteca',    valueB: 6.25, daPct: 99.9 },
  { name: 'ILAS México',       valueB: 3.30, daPct: 100.0, avgMxn: '275M / contrato' },
  { name: 'Productos Loneg',   valueB: 2.72, daPct: 100.0, avgMxn: '302M / contrato' },
  { name: 'Industrial Patrona',valueB: 2.12, daPct: 99.4 },
  { name: 'LICONSA',           valueB: 1.91, daPct: 63.0 },
]

function colorFor(daPct: number): string {
  if (daPct >= 99) return '#dc2626'
  if (daPct >= 60) return '#ea580c'
  return '#22c55e'
}

// Manual layout — SEGALMEX center, others orbit clockwise
const W = 640
const H = 400
const CX = W / 2
const CY = H / 2

// Radius scaled so SEGALMEX is largest
function radiusFor(valueB: number): number {
  return 18 + Math.sqrt(valueB) * 14
}

const POSITIONS: Array<{ x: number; y: number }> = [
  { x: CX,           y: CY },          // SEGALMEX (hub)
  { x: CX + 180,     y: CY - 70 },     // Molinos Azteca
  { x: CX + 160,     y: CY + 100 },    // ILAS
  { x: CX - 170,     y: CY + 90 },     // Productos Loneg
  { x: CX - 190,     y: CY - 60 },     // Industrial Patrona
  { x: CX - 10,      y: CY - 150 },    // LICONSA
]

export function StoryRacingBar() {
  const totalValue = VENDORS.reduce((s, v) => s + v.valueB, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        RUBLI · Constelación de proveedores · AMLO 2019-2024
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        Seis proveedores orbitan SEGALMEX — cuatro nunca compitieron por un contrato
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        Cada burbuja es un proveedor agrícola. El tamaño es el valor total de sus contratos;
        el color es su tasa de adjudicación directa.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-red-400">MXN {totalValue.toFixed(1)}B</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            Total del clúster (6 proveedores)
          </div>
        </div>
        <div className="border-l-2 border-orange-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-orange-400">4 de 6</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            con ≥99% adjudicación directa
          </div>
        </div>
        <div className="border-l-2 border-emerald-500 pl-3 py-1">
          <div className="text-2xl font-mono font-bold text-emerald-400">93.5%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            DA promedio del sector · OCDE 25%
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-background p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="SEGALMEX at center with five vendor bubbles orbiting, sized by contract value and colored by direct-award rate"
        >
          {/* Radial grid */}
          {[80, 160, 240].map((r) => (
            <circle
              key={r}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="var(--color-border-hover)"
              strokeDasharray="2 4"
              strokeWidth={1}
            />
          ))}

          {/* Connection lines from hub to each vendor */}
          {POSITIONS.slice(1).map((pos, i) => (
            <motion.line
              key={i}
              x1={CX}
              y1={CY}
              x2={pos.x}
              y2={pos.y}
              stroke={colorFor(VENDORS[i + 1].daPct)}
              strokeOpacity={0.4}
              strokeWidth={1}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
            />
          ))}

          {/* Bubbles */}
          {VENDORS.map((v, i) => {
            const pos = POSITIONS[i]
            const r = radiusFor(v.valueB)
            const color = colorFor(v.daPct)
            const isHub = i === 0
            return (
              <motion.g
                key={v.name}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
              >
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={color}
                  fillOpacity={isHub ? 0.25 : 0.35}
                  stroke={color}
                  strokeWidth={isHub ? 2.5 : 1.5}
                />
                {/* Vendor name */}
                <text
                  x={pos.x}
                  y={pos.y - 4}
                  textAnchor="middle"
                  fill={isHub ? '#fef2f2' : '#f4f4f5'}
                  fontSize={isHub ? 13 : 11}
                  fontWeight={700}
                  fontFamily="var(--font-family-mono)"
                >
                  {v.name}
                </text>
                {/* Value + DA */}
                <text
                  x={pos.x}
                  y={pos.y + 10}
                  textAnchor="middle"
                  fill="#e4e4e7"
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                >
                  {v.valueB.toFixed(1)}B · {v.daPct.toFixed(0)}% DA
                </text>
                {v.avgMxn && (
                  <text
                    x={pos.x}
                    y={pos.y + r + 14}
                    textAnchor="middle"
                    fill="#fbbf24"
                    fontSize={9}
                    fontFamily="var(--font-family-mono)"
                  >
                    {v.avgMxn}
                  </text>
                )}
              </motion.g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-mono text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: '#dc2626', opacity: 0.5 }} />
            100% adj. directa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: '#ea580c', opacity: 0.5 }} />
            60-99% directa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: '#22c55e', opacity: 0.5 }} />
            {'< 60% directa'}
          </span>
          <span className="text-text-muted ml-auto">Tamaño = valor total · MXN B</span>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="text-[10px] font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-xs text-text-secondary leading-relaxed">
          ILAS México y Productos Loneg recibieron 100% de sus contratos sin licitación —
          promedio 275-302 millones por contrato. SEGALMEX, el proveedor central, fue intervenido
          por la ASF tras detectar faltantes por MXN 9.5B.
        </p>
      </div>

      <p className="text-[10px] text-text-muted font-mono">
        Fuente: COMPRANET · sector 9 (Agricultura) · RUBLI v0.6.5
      </p>
    </motion.div>
  )
}
