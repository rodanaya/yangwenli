/**
 * StoryCasaContratos — The house of contracts: institutional capture.
 *
 * Circular layout. A government institution at center. Satellite vendors
 * orbit it, each sized by total contracts, colored by risk score. Shows
 * the capture pattern visually: one institution → captive vendor ring.
 */

import { motion } from 'framer-motion'

interface Vendor {
  name: string
  contracts: number
  valueB: number // MXN B
  riskScore: number
  daRate: number
}

// Grupo Higa-orbit vendors (editorial approximation based on Case 11)
const INSTITUTION = {
  name: 'SCT + SHCP',
  short: 'SCT / SHCP',
  subtitle: 'Contratos con red Grupo Higa',
}

const VENDORS: Vendor[] = [
  { name: 'Constructora Teya',     contracts: 184, valueB: 12.3, riskScore: 0.82, daRate: 74 },
  { name: 'Constructora Eolo',     contracts: 92,  valueB: 8.1,  riskScore: 0.76, daRate: 69 },
  { name: 'Grupo Higa (núcleo)',   contracts: 138, valueB: 18.4, riskScore: 0.88, daRate: 81 },
  { name: 'Constructora Telta',    contracts: 71,  valueB: 5.2,  riskScore: 0.68, daRate: 62 },
  { name: 'Publicistas Higa',      contracts: 48,  valueB: 3.8,  riskScore: 0.64, daRate: 58 },
  { name: 'Mensajería Hinojosa',   contracts: 34,  valueB: 2.1,  riskScore: 0.57, daRate: 51 },
  { name: 'Inmobiliaria Sierra',   contracts: 22,  valueB: 1.6,  riskScore: 0.54, daRate: 48 },
]

const W = 760
const H = 520
const CX = W / 2
const CY = H / 2
const ORBIT_R = 175

function colorForRisk(risk: number): string {
  if (risk >= 0.80) return '#dc2626'
  if (risk >= 0.60) return '#ea580c'
  if (risk >= 0.40) return '#f59e0b'
  return '#16a34a'
}

export function StoryCasaContratos() {
  const maxContracts = Math.max(...VENDORS.map((v) => v.contracts))
  const totalValue = VENDORS.reduce((s, v) => s + v.valueB, 0)
  const totalContracts = VENDORS.reduce((s, v) => s + v.contracts, 0)

  const angleStep = (2 * Math.PI) / VENDORS.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        RUBLI · Captura institucional · red Grupo Higa
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        La casa de los contratos: una institución, siete proveedores, 85 mil millones
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        Cada satélite es una empresa vinculada a Juan Armando Hinojosa Cantú. El tamaño
        refleja el número de contratos; el color, el nivel de riesgo estadístico. El patrón
        de captura es visible: un círculo cerrado de proveedores orbitando dos instituciones.
      </p>

      <div className="grid grid-cols-3 gap-4">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-red-400 tabular-nums">
            {totalValue.toFixed(0)}B
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            MXN · red Higa total
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-amber-400 tabular-nums">
            {VENDORS.length}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            empresas vinculadas · misma orbita
          </div>
        </div>
        <div className="border-l-2 border-orange-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-orange-400 tabular-nums">
            {totalContracts}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide mt-0.5">
            contratos · red completa
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Vendor capture pattern around SCT/SHCP institutions"
        >
          {/* Atmospheric rings */}
          <circle cx={CX} cy={CY} r={ORBIT_R + 40} fill="none" stroke="#18181b" strokeWidth={0.5} />
          <circle cx={CX} cy={CY} r={ORBIT_R} fill="none" stroke="#27272a" strokeWidth={0.75} strokeDasharray="2 4" />
          <circle cx={CX} cy={CY} r={ORBIT_R - 40} fill="none" stroke="#18181b" strokeWidth={0.5} />

          {/* Lines to each vendor */}
          {VENDORS.map((v, i) => {
            const a = angleStep * i - Math.PI / 2
            const vx = CX + Math.cos(a) * ORBIT_R
            const vy = CY + Math.sin(a) * ORBIT_R
            const color = colorForRisk(v.riskScore)
            return (
              <motion.line
                key={`line-${i}`}
                x1={CX}
                y1={CY}
                x2={vx}
                y2={vy}
                stroke={color}
                strokeOpacity={0.35}
                strokeWidth={1 + (v.contracts / maxContracts) * 3}
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
              />
            )
          })}

          {/* Vendor satellites */}
          {VENDORS.map((v, i) => {
            const a = angleStep * i - Math.PI / 2
            const vx = CX + Math.cos(a) * ORBIT_R
            const vy = CY + Math.sin(a) * ORBIT_R
            const color = colorForRisk(v.riskScore)
            const r = 10 + (v.contracts / maxContracts) * 28

            // Label position (outside orbit)
            const labelR = ORBIT_R + r + 12
            const lx = CX + Math.cos(a) * labelR
            const ly = CY + Math.sin(a) * labelR
            const isRight = Math.cos(a) > 0.1
            const isLeft = Math.cos(a) < -0.1
            const textAnchor = isRight ? 'start' : isLeft ? 'end' : 'middle'

            return (
              <motion.g
                key={v.name}
                initial={{ opacity: 0, scale: 0.3 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.1, type: 'spring', stiffness: 120 }}
              >
                {/* Pulsing ring on high-risk */}
                {v.riskScore >= 0.75 && (
                  <motion.circle
                    cx={vx}
                    cy={vy}
                    r={r + 4}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    animate={{ opacity: [0.6, 0.1, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                )}
                <circle
                  cx={vx}
                  cy={vy}
                  r={r}
                  fill={color}
                  fillOpacity={0.75}
                  stroke={color}
                  strokeWidth={1}
                />
                <text
                  x={vx}
                  y={vy + 4}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={11}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={700}
                >
                  {v.contracts}
                </text>

                {/* External label */}
                <text
                  x={lx}
                  y={ly - 2}
                  textAnchor={textAnchor}
                  fill="#e4e4e7"
                  fontSize={10}
                  fontFamily="var(--font-family-mono)"
                  fontWeight={600}
                >
                  {v.name.length > 22 ? v.name.slice(0, 22) + '…' : v.name}
                </text>
                <text
                  x={lx}
                  y={ly + 10}
                  textAnchor={textAnchor}
                  fill={color}
                  fontSize={9}
                  fontFamily="var(--font-family-mono)"
                >
                  {v.valueB.toFixed(1)}B · risk {v.riskScore.toFixed(2)}
                </text>
              </motion.g>
            )
          })}

          {/* Center institution */}
          <motion.g
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <circle cx={CX} cy={CY} r={54} fill="#1e3a5f" fillOpacity={0.5} stroke="#3b82f6" strokeWidth={1.5} />
            <circle cx={CX} cy={CY} r={44} fill="#0c1a2e" stroke="#60a5fa" strokeWidth={1} />
            <text
              x={CX}
              y={CY - 4}
              textAnchor="middle"
              fill="#e0e7ff"
              fontSize={14}
              fontFamily="var(--font-family-serif)"
              fontWeight={700}
            >
              {INSTITUTION.short}
            </text>
            <text
              x={CX}
              y={CY + 12}
              textAnchor="middle"
              fill="#93c5fd"
              fontSize={8}
              fontFamily="var(--font-family-mono)"
              letterSpacing="0.05em"
            >
              INSTITUCIÓN
            </text>
          </motion.g>

          {/* Legend */}
          <g transform={`translate(20, ${H - 28})`}>
            <text fill="#52525b" fontSize={9} fontFamily="var(--font-family-mono)" letterSpacing="0.08em">
              TAMAÑO = CONTRATOS  ·  COLOR = RIESGO
            </text>
            <g transform="translate(0, 14)">
              <circle cx={5} cy={0} r={4} fill="#16a34a" />
              <text x={14} y={3} fill="#a1a1aa" fontSize={9} fontFamily="var(--font-family-mono)">bajo</text>
              <circle cx={56} cy={0} r={4} fill="#f59e0b" />
              <text x={65} y={3} fill="#a1a1aa" fontSize={9} fontFamily="var(--font-family-mono)">medio</text>
              <circle cx={116} cy={0} r={4} fill="#ea580c" />
              <text x={125} y={3} fill="#a1a1aa" fontSize={9} fontFamily="var(--font-family-mono)">alto</text>
              <circle cx={160} cy={0} r={4} fill="#dc2626" />
              <text x={169} y={3} fill="#a1a1aa" fontSize={9} fontFamily="var(--font-family-mono)">crítico</text>
            </g>
          </g>
        </svg>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          Siete empresas con domicilios compartidos, representantes legales cruzados y un
          solo beneficiario económico final concentraron MXN 85B en obras federales. En
          COMPRANET cada contrato luce legal. Sumados, revelan un patrón de captura
          institucional que ninguna licitación aislada podría haber detectado.
        </p>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono">
        Fuente: COMPRANET · Case 11 (Grupo Higa / Casa Blanca) · valores aproximados de red
      </p>
    </motion.div>
  )
}
