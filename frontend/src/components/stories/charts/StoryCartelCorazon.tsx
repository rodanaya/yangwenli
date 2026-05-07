/**
 * StoryCartelCorazon — Pure SVG overpayment comparison.
 *
 * Each row = a cardiac device. Two dot strips per row:
 *   - gray strip = estimated OECD competitive market price
 *   - red strip  = actual IMSS price paid
 * Each dot = 5K MXN. The red overhang visualizes monopoly premium.
 *
 * Bilingual via useTranslation.
 */

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface Device {
  nameEs: string
  nameEn: string
  marketK: number // thousands MXN
  imssK: number   // thousands MXN
  volume: number  // annual units
}

// Approximate cardiac device pricing based on Vitalmex-era IMSS contracts.
// Market price reflects OECD average; IMSS price reflects observed COMPRANET values.
const DEVICES: Device[] = [
  { nameEs: 'Stent coronario',           nameEn: 'Coronary stent',                marketK: 18,  imssK: 26,  volume: 8200  },
  { nameEs: 'Marcapasos',                nameEn: 'Pacemaker',                     marketK: 95,  imssK: 138, volume: 3400  },
  { nameEs: 'Desfibrilador implantable', nameEn: 'Implantable defibrillator',     marketK: 260, imssK: 370, volume: 1100  },
  { nameEs: 'Válvula cardíaca',          nameEn: 'Heart valve',                   marketK: 155, imssK: 212, volume: 2100  },
  { nameEs: 'Bomba circ. extracorpórea', nameEn: 'Extracorporeal circulation pump', marketK: 340, imssK: 458, volume: 480  },
  { nameEs: 'Oxigenador',                nameEn: 'Oxygenator',                    marketK: 24,  imssK: 34,  volume: 14500 },
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
  const { i18n } = useTranslation()
  const isEs = i18n.language.startsWith('es')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-background border border-border p-5 space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        {isEs ? 'RUBLI · Cártel del Corazón' : 'RUBLI · Cardiac Cartel'}
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        {isEs
          ? 'Lo que el IMSS pagó vs. lo que vale el mercado — por dispositivo cardíaco'
          : "What IMSS paid vs. market price — by cardiac device"}
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        {isEs
          ? 'Vitalmex concentró el suministro de dispositivos cardíacos federales por más de una década. Cada punto equivale a $8,000 MXN — el sobrepago en rojo refleja una prima de monopolio del 20-40% documentada por OCDE en mercados médicos capturados.'
          : 'Vitalmex concentrated the supply of federal cardiac devices for over a decade. Each dot equals $8,000 MXN — the red overpay reflects a 20-40% monopoly premium documented by the OECD in captured medical markets.'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-xl font-mono font-bold text-risk-critical">$50B</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">
            {isEs ? 'en contratos cardíacos · un solo proveedor' : 'in cardiac contracts · single vendor'}
          </div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-xl font-mono font-bold text-risk-high">$10-20B</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">
            {isEs ? 'sobrepago estimado · prima OCDE 20-40%' : 'estimated overpayment · OECD 20-40% premium'}
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={isEs
          ? 'Comparación de precios de dispositivos cardíacos: precio de mercado vs. precio pagado por IMSS, mostrando sobrepago'
          : 'Cardiac device pricing comparison: market price versus IMSS paid price, showing overpayment'}
      >
        {/* Header */}
        <text
          x={LABEL_W - 8}
          y={24}
          textAnchor="end"
          fill="var(--color-text-secondary)"
          fontSize={9}
          fontFamily="var(--font-family-mono)"
          letterSpacing="0.1em"
        >
          {isEs ? 'DISPOSITIVO' : 'DEVICE'}
        </text>
        <g transform={`translate(${LABEL_W}, 20)`}>
          <circle cx={3} cy={2} r={3} fill="var(--color-text-secondary)" />
          <text x={12} y={6} fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
            {isEs ? 'PRECIO MERCADO' : 'MARKET PRICE'}
          </text>
          <circle cx={140} cy={2} r={3} fill="var(--color-sector-salud)" />
          <text x={149} y={6} fill="var(--color-risk-critical)" fontSize={9} fontFamily="var(--font-family-mono)" fontWeight={600}>
            {isEs ? 'PAGADO POR IMSS (SOBREPAGO)' : 'PAID BY IMSS (OVERPAYMENT)'}
          </text>
        </g>

        {DEVICES.map((device, idx) => {
          const y0 = 50 + idx * ROW_H
          const marketDots = Math.min(MAX_DOTS, Math.round(device.marketK / DOT_K))
          const imssDots = Math.min(MAX_DOTS, Math.round(device.imssK / DOT_K))
          const overpay = device.imssK - device.marketK
          const premiumPct = ((overpay / device.marketK) * 100).toFixed(0)
          const deviceName = isEs ? device.nameEs : device.nameEn
          const unitsLabel = isEs ? 'unid/año' : 'units/yr'

          return (
            <g key={device.nameEs}>
              {/* Device label */}
              <text
                x={LABEL_W - 8}
                y={y0 + STRIP_H + 6}
                textAnchor="end"
                fill="var(--color-text-muted)"
                fontSize={10}
                fontFamily="var(--font-family-mono)"
              >
                {deviceName}
              </text>
              <text
                x={LABEL_W - 8}
                y={y0 + STRIP_H + 18}
                textAnchor="end"
                fill="var(--color-text-secondary)"
                fontSize={8}
                fontFamily="var(--font-family-mono)"
              >
                {device.volume.toLocaleString(isEs ? 'es-MX' : 'en-US')} {unitsLabel}
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
                    fill={isFilled ? 'var(--color-text-secondary)' : 'var(--color-background-elevated)'}
                    stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
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
                fill="var(--color-text-muted)"
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
                    fill={isFilled ? (isOverpay ? 'var(--color-sector-salud)' : 'var(--color-text-muted)') : 'var(--color-background-elevated)'}
                    stroke={isFilled ? 'none' : 'var(--color-border-hover)'}
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
                fill="var(--color-risk-critical)"
                fontSize={9}
                fontFamily="var(--font-family-mono)"
                fontWeight={600}
              >
                ${device.imssK}K <tspan fill="var(--color-risk-medium)">(+{premiumPct}%)</tspan>
              </text>
            </g>
          )
        })}
      </svg>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-risk-high mb-1">
          {isEs ? 'HALLAZGO' : 'FINDING'}
        </p>
        <p className="text-sm text-text-secondary">
          {isEs
            ? 'COFECE abrió expediente por prácticas monopólicas en el mercado de equipamiento cardíaco — los precios de IMSS estaban entre 28% y 43% encima del precio de mercado OCDE. 10 mil millones de pesos adicionales por año equivaldrían a 50 unidades de hemodinamia regionales.'
            : 'COFECE opened a docket for monopolistic practices in the cardiac equipment market — IMSS prices were 28% to 43% above the OECD market price. 10 billion additional pesos per year would buy 50 regional hemodynamics units.'}
        </p>
      </div>

      <p className="text-[10px] text-text-muted font-mono">
        {isEs
          ? 'Fuente: COMPRANET · Vitalmex portfolio 2010-2024 · estudios OCDE/WHO · expediente COFECE en curso'
          : 'Source: COMPRANET · Vitalmex portfolio 2010-2024 · OECD/WHO studies · COFECE docket pending'}
      </p>
    </motion.div>
  )
}
