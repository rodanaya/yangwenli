/**
 * PesosAtRiskChart — estimated overpayment by ARIA pattern.
 *
 * Cleveland-pair chart: each row = hollow baseline dot ○ + filled actual dot ● + connector.
 * Rows ranked by GAP (actual − baseline), not by absolute exposure.
 * Shared log-scale X axis spanning 1B → 500B MXN across all rows.
 *
 * Estimation model (illustrative, methodology footnote in caption):
 *   P5 Overpricing: total contract value × (price_ratio - 1) ≈ excess
 *   P1 Monopoly: estimated competition discount lost (~12% of monopoly value)
 *   P2 Ghost: full ghost-network volume (high-confidence loss)
 *   P6 Capture: ~15% premium on captured-institution spend
 *   P3 Intermediary: full single-use intermediary value
 *   P4 Bid Collusion: ~8% premium on collusive contracts
 *   P7 Network: aggregated network volume × 0.20
 *
 * Extracted from Executive.tsx — do not inline again.
 */

import { motion } from 'framer-motion'
import { formatCompactMXN, formatNumber } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Data + types
// ─────────────────────────────────────────────────────────────────────────────

interface PatternRiskEntry {
  code: string
  label: { en: string; es: string }
  pesosBn: number   // billions MXN at risk (estimated)
  baselineMdp: number // counterfactual: if pattern were merely at sector median
  vendors: number
  color: string
}

// baselineMdp = estimated exposure if pattern operated at sector median price
// rather than observed price. Gap = pesosBn - baselineMdp = "corruption premium".
export const PATTERN_RISK: PatternRiskEntry[] = [
  { code: 'P5', label: { en: 'Systematic Overpricing',   es: 'Sobreprecio Sistemático' }, pesosBn: 240, baselineMdp: 10, vendors: 3985,  color: '#dc2626' },
  { code: 'P2', label: { en: 'Ghost Companies',          es: 'Empresas Fantasma' },        pesosBn: 95,  baselineMdp: 5,  vendors: 6118,  color: '#dc2626' },
  { code: 'P6', label: { en: 'Institutional Capture',    es: 'Captura Institucional' },    pesosBn: 78,  baselineMdp: 12, vendors: 15923, color: 'var(--color-risk-critical)' },
  { code: 'P1', label: { en: 'Concentrated Monopoly',    es: 'Monopolio Concentrado' },    pesosBn: 64,  baselineMdp: 3,  vendors: 44,    color: '#dc2626' },
  { code: 'P3', label: { en: 'Single-Use Intermediary',  es: 'Intermediaria Uso Único' },  pesosBn: 41,  baselineMdp: 2,  vendors: 2974,  color: '#b45309' },
  { code: 'P7', label: { en: 'Contractor Network',       es: 'Red de Contratistas' },      pesosBn: 38,  baselineMdp: 8,  vendors: 257,   color: '#dc2626' },
  { code: 'P4', label: { en: 'Bid Collusion',            es: 'Colusión en Licitaciones' }, pesosBn: 18,  baselineMdp: 4,  vendors: 220,   color: '#b45309' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface PesosAtRiskChartProps {
  lang: 'en' | 'es'
}

export function PesosAtRiskChart({ lang }: PesosAtRiskChartProps) {
  // Rank by gap width (the editorial question: which pattern has the largest corruption premium?)
  const sorted = [...PATTERN_RISK].sort((a, b) => (b.pesosBn - b.baselineMdp) - (a.pesosBn - a.baselineMdp))

  const SVG_W = 820
  const ROW_H = 46
  const AXIS_H = 28
  const LABEL_W = 215
  const RIGHT_PAD = 120
  const PLOT_W = SVG_W - LABEL_W - RIGHT_PAD
  const SVG_H = AXIS_H + ROW_H * sorted.length + 8

  // Log scale helpers — domain 1B → 500B MXN (pesosBn in billions so 1 → 500)
  const LOG_MIN = Math.log10(1)
  const LOG_MAX = Math.log10(500)
  const xPos = (bn: number): number => {
    const clamped = Math.max(1, Math.min(500, bn))
    return LABEL_W + ((Math.log10(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * PLOT_W
  }

  // Axis tick values (log-spaced)
  const axisTicks = [1, 5, 10, 50, 100, 250, 500]

  // Locale-aware label for right dot: "240 MDP" in ES, "240.0B MXN" in EN
  const dotLabel = (bn: number): string => {
    const formatted = formatCompactMXN(bn * 1_000_000_000)
    return formatted
  }

  return (
    <div>
      {/* Axis legend header */}
      <div className="flex items-center gap-4 mb-1 pl-0" style={{ paddingLeft: LABEL_W }}>
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-text-muted">
          <svg aria-hidden="true" width="18" height="10"><circle cx="4" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.55"/><circle cx="16" cy="5" r="3" fill="currentColor"/></svg>
          <span>{lang === 'es' ? 'base → exposición estimada' : 'baseline → estimated exposure'}</span>
        </div>
        <div className="text-[9px] font-mono text-text-muted opacity-70">
          {lang === 'es' ? 'ordenado por premio sobre línea base' : 'ranked by premium over baseline'}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ height: SVG_H }}
        role="img"
        aria-label={lang === 'en' ? 'Cleveland dot-pair chart: estimated pesos at risk by ARIA pattern, ranked by premium over baseline.' : 'Gráfica de pares Cleveland: pesos estimados en riesgo por patrón ARIA, ordenado por premio sobre línea base.'}
      >
        {/* Shared log-scale axis at top */}
        <line x1={LABEL_W} x2={LABEL_W + PLOT_W} y1={AXIS_H - 4} y2={AXIS_H - 4}
          stroke="var(--color-border)" strokeWidth={0.6} strokeOpacity={0.5} />
        {axisTicks.map((t) => {
          const x = xPos(t)
          const label = t >= 1000 ? `${t / 1000}T` : t >= 100 ? `${t}` : `${t}`
          const unit = lang === 'es' ? 'MDP' : 'B MXN'
          return (
            <g key={t}>
              <line x1={x} x2={x} y1={AXIS_H - 8} y2={AXIS_H - 1}
                stroke="var(--color-border)" strokeWidth={0.6} strokeOpacity={0.55} />
              <text x={x} y={AXIS_H - 11} textAnchor="middle"
                fontSize={7.5} fill="var(--color-text-muted)"
                fontFamily="var(--font-family-mono, monospace)">
                {label}
              </text>
              <text x={x} y={AXIS_H - 2} textAnchor="middle"
                fontSize={6} fill="var(--color-text-muted)" fillOpacity={0.6}
                fontFamily="var(--font-family-mono, monospace)">
                {unit}
              </text>
            </g>
          )
        })}

        {/* Vertical grid lines at tick positions */}
        {axisTicks.map((t) => (
          <line key={`grid-${t}`}
            x1={xPos(t)} x2={xPos(t)} y1={AXIS_H - 1} y2={SVG_H - 2}
            stroke="var(--color-border)" strokeWidth={0.4} strokeOpacity={0.25} />
        ))}

        {/* Cleveland-pair rows */}
        {sorted.map((p, idx) => {
          const y = AXIS_H + idx * ROW_H + ROW_H / 2
          const xBaseline = xPos(p.baselineMdp)
          const xActual = xPos(p.pesosBn)

          // Yellow/amber rows (P3, P4) become unreadable on the grey
          // zebra band — fix 2026-05-05: drop zebra striping entirely,
          // use a thin border-top divider instead so rows still group
          // visually without competing with the row's accent color.
          return (
            <g key={p.code}>
              {/* Subtle row divider (top of row) — replaces grey zebra band */}
              {idx > 0 && (
                <line
                  x1={0}
                  x2={SVG_W}
                  y1={y - ROW_H / 2 + 2}
                  y2={y - ROW_H / 2 + 2}
                  stroke="var(--color-border)"
                  strokeWidth={0.5}
                  strokeOpacity={0.4}
                />
              )}

              {/* Pattern code pill */}
              <rect x={4} y={y - 9} width={28} height={17} rx={2}
                fill={p.color} fillOpacity={0.15} />
              <text x={18} y={y + 3} textAnchor="middle"
                fontSize={8.5} fontWeight="800" fill={p.color}
                fontFamily="var(--font-family-mono, monospace)">
                {p.code}
              </text>

              {/* Pattern label (two lines) */}
              <text x={38} y={y - 2}
                fontSize={10.5} fontWeight="600" fill="var(--color-text-primary)"
                fontFamily="var(--font-family-sans, sans-serif)">
                {p.label[lang]}
              </text>
              <text x={38} y={y + 10}
                fontSize={7.5} fill="var(--color-text-muted)"
                fontFamily="var(--font-family-mono, monospace)">
                {formatNumber(p.vendors)} {lang === 'en' ? 'vendors' : 'proveedores'}
              </text>

              {/* Connector line — animates left → right */}
              <motion.line
                x1={xBaseline} x2={xBaseline}
                y1={y} y2={y}
                stroke={p.color}
                strokeWidth={2}
                strokeOpacity={0.55}
                initial={{ x2: xBaseline }}
                whileInView={{ x2: xActual }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + idx * 0.08, ease: 'easeOut' }}
              />

              {/* Baseline dot — faded ghost of SAME pattern color (was neutral
                  grey, which clashed with the vivid actual dot). User feedback
                  2026-05-05: "those two different contrasts don't go with the
                  colors". Both endpoints now belong to one color family. */}
              <motion.circle
                cx={xBaseline} cy={y}
                r={4}
                fill="none"
                stroke={p.color}
                strokeWidth={1.5}
                strokeOpacity={0.45}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.15 + idx * 0.08 }}
              />

              {/* Actual dot (filled, pattern color, drop shadow) */}
              <motion.circle
                cx={xActual} cy={y}
                r={6}
                fill={p.color}
                filter="drop-shadow(0 1px 3px rgba(0,0,0,0.35))"
                initial={{ opacity: 0, r: 2 }}
                whileInView={{ opacity: 1, r: 6 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.55 + idx * 0.08, ease: [0.34, 1.56, 0.64, 1] }}
              />

              {/* Pesos label above actual dot */}
              <motion.text
                x={xActual} y={y - 10}
                textAnchor="middle"
                fontSize={11} fontWeight="800" fill={p.color}
                fontFamily="var(--font-family-mono, monospace)"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.65 + idx * 0.08 }}
              >
                {dotLabel(p.pesosBn)}
              </motion.text>

              {/* → Investigate chip */}
              <motion.a
                href={`/aria?pattern=${p.code}`}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.65 }}
                whileHover={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25, delay: 0.7 + idx * 0.08 }}
              >
                <text
                  x={SVG_W - RIGHT_PAD + 6}
                  y={y + 3}
                  fontSize={8.5}
                  fontWeight="600"
                  fill={p.color}
                  fontFamily="var(--font-family-mono, monospace)"
                >
                  {lang === 'es' ? '→ Investigar' : '→ Investigate'}
                </text>
              </motion.a>
            </g>
          )
        })}
      </svg>

      {/* Methodology footnote */}
      <div className="mt-3 pt-3 border-t border-border/40">
        <div className="text-[8px] font-mono text-text-muted leading-[1.4]">
          {lang === 'en'
            ? 'ESTIMATES — rows ranked by premium over sector-median baseline (gap = actual exposure − counterfactual baseline). Methodology: P5 = (price_ratio − 1) × value; P2 = full ghost volume; P6 = ~15% capture premium; P1 = ~12% monopoly discount lost; others scale with network volume.'
            : 'ESTIMACIONES — filas ordenadas por premio sobre línea base sectorial (brecha = exposición real − base contrafactual). Metodología: P5 = (razón_precio − 1) × valor; P2 = volumen fantasma completo; P6 = ~15% premio captura; P1 = ~12% descuento monopolio perdido; otros escalan con volumen de red.'}
        </div>
      </div>
    </div>
  )
}
