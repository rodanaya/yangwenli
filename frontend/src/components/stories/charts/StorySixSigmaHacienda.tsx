/**
 * StorySixSigmaHacienda — Pure SVG win-rate anomaly.
 *
 * Two vertical dot columns for SixSigma vs Hacienda sector baseline:
 *   - Left column: SixSigma wins out of total attempts (near-100% win rate)
 *   - Right column: sector baseline — sparse wins
 * Plus a dot strip showing 147 contracts colored by risk level,
 * visualizing the 87.8% high-risk cluster.
 */

import { motion } from 'framer-motion'

const TOTAL_ATTEMPTS = 50 // visualization scale (not actual count)
const SIXSIGMA_WINS = 46 // ~92% win rate visualization
const BASELINE_WINS = 8 // ~16% baseline

// 147 contract dots — colored by risk distribution
// 87.8% high/critical = 129; 12.2% medium/low = 18
const CONTRACT_DOTS = Array.from({ length: 147 }).map((_, i) => {
  if (i < 84) return 'critical' // 57%
  if (i < 129) return 'high' // 30.6%
  if (i < 142) return 'medium'
  return 'low'
})

const COLORS = {
  critical: 'var(--color-sector-salud)',
  high: 'var(--color-sector-infraestructura)',
  medium: 'var(--color-sector-energia)',
  low: 'var(--color-sector-hacienda)',
  win: 'var(--color-sector-salud)',
  lose: 'var(--color-text-muted)',
  baselineWin: 'var(--color-oecd)',
}

export function StorySixSigmaHacienda() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-sm bg-background border border-border p-5 space-y-4"
    >
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        RUBLI · SixSigma en Hacienda
      </p>

      <h3 className="text-xl font-bold font-serif leading-tight text-text-primary">
        El SAT persigue el fraude — y fue víctima de uno: 147 licitaciones diseñadas para perder
      </h3>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
        SixSigma ganaba tras licitar en procesos nominalmente competitivos. El
        modelo v0.6.5 detecta la anomalía sin conocer el expediente: tasa de éxito
        atípica y concentración institucional que sobresale contra la línea base
        del sector Hacienda.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="border-l-2 border-red-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-risk-critical">92%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">win rate SixSigma</div>
        </div>
        <div className="border-l-2 border-cyan-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-[color:var(--color-oecd)]">~16%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">línea base sector Hacienda</div>
        </div>
        <div className="border-l-2 border-amber-500 pl-3 py-1">
          <div className="text-3xl font-mono font-bold text-risk-high">87.8%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">contratos en riesgo alto/crítico</div>
        </div>
      </div>

      {/* Win-rate comparison + contract strip */}
      <div className="grid md:grid-cols-[280px_1fr] gap-5">
        {/* Two columns comparison */}
        <div className="rounded-lg bg-background-card border border-border p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
            Tasa de éxito — 50 procesos simulados
          </p>
          <svg viewBox="0 0 280 310" className="w-full h-auto" role="img" aria-label="Win rate comparison: SixSigma versus sector baseline">
            {/* Titles */}
            <text x={65} y={20} textAnchor="middle" fill="var(--color-risk-critical)" fontSize={11} fontFamily="var(--font-family-mono)" fontWeight={700}>
              SIXSIGMA
            </text>
            <text x={215} y={20} textAnchor="middle" fill="var(--color-oecd)" fontSize={11} fontFamily="var(--font-family-mono)" fontWeight={700}>
              LÍNEA BASE
            </text>

            {/* SixSigma column — 50 dots, 46 red (won) */}
            {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => {
              const col = i % 5
              const row = Math.floor(i / 5)
              const cx = 35 + col * 14
              const cy = 40 + row * 14
              const won = i < SIXSIGMA_WINS
              return (
                <motion.circle
                  key={`ss-${i}`}
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill={won ? COLORS.win : COLORS.lose}
                  stroke={won ? 'none' : 'var(--color-text-secondary)'}
                  strokeWidth={0.5}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.012 }}
                />
              )
            })}

            {/* Baseline column — 50 dots, 8 cyan (won) */}
            {Array.from({ length: TOTAL_ATTEMPTS }).map((_, i) => {
              const col = i % 5
              const row = Math.floor(i / 5)
              const cx = 185 + col * 14
              const cy = 40 + row * 14
              const won = i < BASELINE_WINS
              return (
                <motion.circle
                  key={`bl-${i}`}
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill={won ? COLORS.baselineWin : COLORS.lose}
                  stroke={won ? 'none' : 'var(--color-text-secondary)'}
                  strokeWidth={0.5}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.6 + i * 0.012 }}
                />
              )
            })}

            {/* Result labels */}
            <text x={65} y={185} textAnchor="middle" fill="var(--color-risk-critical)" fontSize={22} fontFamily="var(--font-family-mono)" fontWeight={700}>
              92%
            </text>
            <text x={65} y={201} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              ganadas
            </text>

            <text x={215} y={185} textAnchor="middle" fill="var(--color-oecd)" fontSize={22} fontFamily="var(--font-family-mono)" fontWeight={700}>
              16%
            </text>
            <text x={215} y={201} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              ganadas
            </text>

            {/* Divider */}
            <line x1={140} y1={35} x2={140} y2={175} stroke="var(--color-border-hover)" strokeWidth={1} strokeDasharray="3 3" />

            {/* Callout */}
            <text x={140} y={230} textAnchor="middle" fill="var(--color-risk-medium)" fontSize={10} fontFamily="var(--font-family-mono)" fontWeight={600}>
              5.7× sobre lo esperado
            </text>
            <text x={140} y={248} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              patrón consistente con
            </text>
            <text x={140} y={262} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              requisitos técnicos escritos
            </text>
            <text x={140} y={276} textAnchor="middle" fill="var(--color-text-muted)" fontSize={9} fontFamily="var(--font-family-mono)">
              para un solo proveedor
            </text>
          </svg>
        </div>

        {/* 147 contracts strip */}
        <div className="rounded-lg bg-background-card border border-border p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-text-muted mb-3">
            Los 147 contratos · distribución de riesgo v0.6.5
          </p>
          <svg viewBox="0 0 420 260" className="w-full h-auto" role="img" aria-label="147 SixSigma contracts colored by risk level">
            {CONTRACT_DOTS.map((level, i) => {
              const col = i % 15
              const row = Math.floor(i / 15)
              const cx = 12 + col * 26
              const cy = 18 + row * 24
              return (
                <motion.circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={8}
                  fill={COLORS[level as keyof typeof COLORS]}
                  fillOpacity={0.9}
                  stroke="var(--color-text-primary)"
                  strokeWidth={1}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.005 }}
                />
              )
            })}
          </svg>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-text-muted mt-3 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span>Crítico · 84 (57%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-600"></div>
              <span>Alto · 45 (31%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Medio · 13</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span>Bajo · 5</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-mono uppercase tracking-wide text-risk-high mb-1">
          HALLAZGO
        </p>
        <p className="text-sm text-text-secondary">
          Ningún contrato individual despierta sospecha — montos razonables,
          plazos en regla, formato de licitación pública. La anomalía emerge del
          conjunto: el mismo proveedor gana licitación tras licitación, con un
          win_rate de 92% contra una línea base sectorial de 16%.
        </p>
      </div>

      <p className="text-[10px] text-text-muted font-mono">
        Fuente: COMPRANET · 147 contratos SAT-SixSigma · modelo v0.6.5 score promedio 0.756
      </p>
    </motion.div>
  )
}
