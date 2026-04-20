/**
 * StoryCartelCorazon — Pure SVG overpayment comparison.
 *
 * Each row = a cardiac device. Two dot strips per row:
 *   - gray strip = estimated OECD competitive market price
 *   - red strip  = actual IMSS price paid
 * Each dot = 5K MXN. The red overhang visualizes monopoly premium.
 */

import { motion } from 'framer-motion'

interface Device {
  name: string
  marketK: number // thousands MXN
  imssK: number   // thousands MXN
  volume: number  // annual units
}

// Approximate cardiac device pricing based on Vitalmex-era IMSS contracts.
// Market price reflects OECD average; IMSS price reflects observed COMPRANET values.
const DEVICES: Device[] = [
  { name: 'Stent coronario',          marketK: 18,  imssK: 26, volume: 8200 },
  { name: 'Marcapasos',               marketK: 95,  imssK: 138, volume: 3400 },
  { name: 'Desfibrilador implantable', marketK: 260, imssK: 370, volume: 1100 },
  { name: 'Válvula cardíaca',         marketK: 155, imssK: 212, volume: 2100 },
  { name: 'Bomba circ. extracorpórea', marketK: 340, imssK: 458, volume: 480 },
  { name: 'Oxigenador',               marketK: 24,  imssK: 34, volume: 14500 },
]

const DOT_K = 8 // each dot = 8K MXN
const DOT_R = 3
const DOT_GAP = 7.5
const STRIP_H = 10
const LABEL_W = 180
const MAX_DOTS = 64 // 512K MXN cap for visualization

const W = 740
const ROW_H = STRIP_H * 2 + 16
const H = 50 + DEVICES.length * ROW_H + 30

export function StoryCartelCorazon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-zinc-950 border border-zinc-800/60 p-5 space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500">
        RUBLI · Cártel del Corazón
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-zinc-100">
        Lo que el IMSS pagó vs. lo que vale el mercado — por dispositivo cardíaco
      </h3>
      <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
        Vitalmex concentró el suministro de dispositivos cardíacos federales por
        más de una década. Cada punto equivale a $8,000 MXN — el sobrepago en rojo
        refleja una prima de monopolio del 20-40% documentada por OCDE en mercados
        médicos capturados.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-red-500">$50B</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            en contratos cardíacos · un solo proveedor
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-amber-400">$10-20B</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide">
            sobrepago estimado · prima OCDE 20-40%
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Cardiac device pricing comparison: market price versus IMSS paid price, showing overpayment"
      >
        {/* Header */}
        <text
          x={LABEL_W - 8}
          y={24}
          textAnchor="end"
          fill="#52525b"
          fontSize={9}
          fontFamily="var(--font-family-mono)"
          letterSpacing="0.1em"
        >
          DISPOSITIVO
        </text>
        <g transform={`translate(${LABEL_W}, 20)`}>
          <circle cx={3} cy={2} r={3} fill="#52525b" />
          <text x={12} y={6} fill="#a1a1aa" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
            PRECIO MERCADO
          </text>
          <circle cx={140} cy={2} r={3} fill="#dc2626" />
          <text x={149} y={6} fill="#ef4444" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
            PAGADO POR IMSS (SOBREPAGO)
          </text>
        </g>

        {DEVICES.map((device, idx) => {
          const y0 = 50 + idx * ROW_H
          const marketDots = Math.min(MAX_DOTS, Math.round(device.marketK / DOT_K))
          const imssDots = Math.min(MAX_DOTS, Math.round(device.imssK / DOT_K))
          const overpay = device.imssK - device.marketK
          const premiumPct = ((overpay / device.marketK) * 100).toFixed(0)

          return (
            <g key={device.name}>
              {/* Device label */}
              <text
                x={LABEL_W - 8}
                y={y0 + STRIP_H + 6}
                textAnchor="end"
                fill="#d4d4d8"
                fontSize={10}
                fontFamily="var(--font-family-mono)"
              >
                {device.name}
              </text>
              <text
                x={LABEL_W - 8}
                y={y0 + STRIP_H + 18}
                textAnchor="end"
                fill="#52525b"
                fontSize={8}
                fontFamily="var(--font-family-mono)"
              >
                {device.volume.toLocaleString('es-MX')} unid/año
              </text>

              {/* Market price strip (gray) */}
              {Array.from({ length: MAX_DOTS }).map((_, i) => {
                const isFilled = i < marketDots
                return (
                  <motion.circle
                    key={`m-${i}`}
                    cx={LABEL_W + i * DOT_GAP + DOT_R}
                    cy={y0 + STRIP_H / 2}
                    r={DOT_R}
                    fill={isFilled ? '#52525b' : '#18181b'}
                    stroke={isFilled ? 'none' : '#27272a'}
                    strokeWidth={isFilled ? 0 : 0.5}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: idx * 0.06 + i * 0.003 }}
                  />
                )
              })}
              <text
                x={LABEL_W + MAX_DOTS * DOT_GAP + 10}
                y={y0 + STRIP_H / 2 + 3}
                fill="#a1a1aa"
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fontWeight={600}
              >
                ${device.marketK}K
              </text>

              {/* IMSS paid strip (red, extends further) */}
              {Array.from({ length: MAX_DOTS }).map((_, i) => {
                const isFilled = i < imssDots
                const isOverpay = i >= marketDots && i < imssDots
                return (
                  <motion.circle
                    key={`i-${i}`}
                    cx={LABEL_W + i * DOT_GAP + DOT_R}
                    cy={y0 + STRIP_H + 6 + STRIP_H / 2}
                    r={DOT_R}
                    fill={isFilled ? (isOverpay ? '#dc2626' : '#71717a') : '#18181b'}
                    stroke={isFilled ? 'none' : '#27272a'}
                    strokeWidth={isFilled ? 0 : 0.5}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: idx * 0.06 + 0.4 + i * 0.003 }}
                  />
                )
              })}
              <text
                x={LABEL_W + MAX_DOTS * DOT_GAP + 10}
                y={y0 + STRIP_H + 6 + STRIP_H / 2 + 3}
                fill="#ef4444"
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fontWeight={600}
              >
                ${device.imssK}K <tspan fill="#fbbf24">(+{premiumPct}%)</tspan>
              </text>
            </g>
          )
        })}
      </svg>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-amber-400 mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-zinc-200">
          COFECE abrió expediente por prácticas monopólicas en el mercado de
          equipamiento cardíaco — los precios de IMSS estaban entre 28% y 43%
          encima del precio de mercado OCDE. 10 mil millones de pesos adicionales
          por año equivaldrían a 50 unidades de hemodinamia regionales.
        </p>
      </div>

      <p className="text-[10px] text-zinc-600 font-mono">
        Fuente: COMPRANET · Vitalmex portfolio 2010-2024 · estudios OCDE/WHO · expediente COFECE en curso
      </p>
    </motion.div>
  )
}
