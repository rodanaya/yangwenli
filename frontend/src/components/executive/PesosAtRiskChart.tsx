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
 * PARALLAX D10 § Change 2 — drawn at 1:1: the plate measures its width
 * (useMeasuredWidth); connectors and dots stay in the svg, every glyph (pills,
 * names, vendor counts, ticks, the value on each dot, → Investigate links) is
 * HTML at ≥ 11px. Phones stack the label above the track.
 *
 * Extracted from Executive.tsx — do not inline again.
 */

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { RISK_INK_ON_PLATE, RISK_TEXT_COLORS } from '@/lib/constants'
import { useFontsReady, useMeasuredWidth } from '@/hooks/useMeasuredWidth'
import { measureLabel } from '@/lib/plateLabels'

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

// Type twin of each pattern's mark colour (pill text, value label, link).
const inkOf = (color: string) => (color === '#b45309' ? RISK_INK_ON_PLATE.high : RISK_TEXT_COLORS.critical)

// baselineMdp = estimated exposure if pattern operated at sector median price
// rather than observed price. Gap = pesosBn - baselineMdp = "corruption premium".
const PATTERN_RISK: PatternRiskEntry[] = [
  { code: 'P5', label: { en: 'Systematic Overpricing',   es: 'Sobreprecio Sistemático' }, pesosBn: 240, baselineMdp: 10, vendors: 3772,  color: '#dc2626' },
  { code: 'P2', label: { en: 'Ghost Companies',          es: 'Empresas Fantasma' },        pesosBn: 95,  baselineMdp: 5,  vendors: 6118,  color: '#dc2626' },
  { code: 'P6', label: { en: 'Institutional Capture',    es: 'Captura Institucional' },    pesosBn: 78,  baselineMdp: 12, vendors: 15939, color: 'var(--color-risk-critical)' },
  { code: 'P1', label: { en: 'Concentrated Monopoly',    es: 'Monopolio Concentrado' },    pesosBn: 64,  baselineMdp: 3,  vendors: 44,    color: '#dc2626' },
  { code: 'P3', label: { en: 'Single-Use Intermediary',  es: 'Intermediaria Uso Único' },  pesosBn: 41,  baselineMdp: 2,  vendors: 2972,  color: '#b45309' },
  { code: 'P7', label: { en: 'Contractor Network',       es: 'Red de Contratistas' },      pesosBn: 38,  baselineMdp: 8,  vendors: 285,   color: '#dc2626' },
  { code: 'P4', label: { en: 'Bid Collusion',            es: 'Colusión en Licitaciones' }, pesosBn: 18,  baselineMdp: 4,  vendors: 220,   color: '#b45309' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface PesosAtRiskChartProps {
  lang: 'en' | 'es'
  /** Live ARIA vendor counts per pattern (aria_stats.pattern_counts); the
   *  typed `vendors` are the fallback. The pesos estimates stay illustrative. */
  patternCounts?: Record<string, number>
}

const MONO = '"JetBrains Mono", monospace'
const TICK_FONT = `11px ${MONO}`
const VALUE_FONT = `800 13px ${MONO}`
const AXIS_TICKS = [1, 5, 10, 50, 100, 250, 500] // billions MXN, log-spaced
const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1'

export function PesosAtRiskChart({ lang, patternCounts }: PesosAtRiskChartProps) {
  const box = useRef<HTMLDivElement>(null)
  const W = useMeasuredWidth(box)
  const fontsReady = useFontsReady([TICK_FONT, VALUE_FONT])
  const narrow = W > 0 && W < 560

  // Rank by gap width (the editorial question: which pattern has the largest corruption premium?)
  const sorted = [...PATTERN_RISK].sort((a, b) => (b.pesosBn - b.baselineMdp) - (a.pesosBn - a.baselineMdp))

  // Desktop: label column left, link column right. Phones: the label line
  // sits above its track and the link under the value dot.
  const LABEL_W = narrow ? 0 : 215
  const RIGHT_PAD = narrow ? 14 : 120
  const PAD_L = narrow ? 14 : 0
  const AXIS_H = 26
  const LABEL_LINE = narrow ? 34 : 0
  const TRACK_H = narrow ? 64 : 46
  const ROW_H = LABEL_LINE + TRACK_H
  const H = AXIS_H + ROW_H * sorted.length + 8
  const PLOT_X0 = LABEL_W + PAD_L
  const PLOT_W = Math.max(1, W - PLOT_X0 - RIGHT_PAD)

  // Log scale helpers — domain 1B → 500B MXN (pesosBn in billions so 1 → 500)
  const LOG_MIN = Math.log10(1)
  const LOG_MAX = Math.log10(500)
  const xPos = (bn: number): number => {
    const clamped = Math.max(1, Math.min(500, bn))
    return PLOT_X0 + ((Math.log10(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * PLOT_W
  }
  // Row geometry: the track line's y (the dots) inside each row.
  const trackY = (idx: number) => AXIS_H + idx * ROW_H + LABEL_LINE + (narrow ? 26 : ROW_H / 2)

  // Tick labels in the reader's unit: billions MXN on EN, MDP (millions) on ES.
  const tickText = (t: number) => (lang === 'es' ? formatNumber(t * 1000) : String(t))
  const unit = lang === 'es' ? 'MDP' : 'B MXN'
  const ready = W > 0 && fontsReady
  const tickW = (t: number) => measureLabel(tickText(t), TICK_FONT, 999, 14).width
  // Ticks kept left-to-right while a label width apart (phones thin them).
  const ticks: number[] = []
  if (ready) {
    for (const t of AXIS_TICKS) {
      const prev = ticks[ticks.length - 1]
      if (prev === undefined || xPos(t) - tickW(t) / 2 - (xPos(prev) + tickW(prev) / 2) >= 8) ticks.push(t)
    }
  }

  // Locale-aware label for the value dot: "240 MDP" in ES, "240.0B MXN" in EN
  const dotLabel = (bn: number): string => formatCompactMXN(bn * 1_000_000_000)

  return (
    <div>
      {/* Axis legend header */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1 text-[13px] font-mono text-text-muted"
        style={{ paddingLeft: ready && !narrow ? LABEL_W : 0 }}
      >
        <div className="flex items-center gap-1.5">
          <svg aria-hidden="true" width="18" height="10"><circle cx="4" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.55"/><circle cx="16" cy="5" r="3" fill="currentColor"/></svg>
          <span>{lang === 'es' ? 'base → exposición estimada' : 'baseline → estimated exposure'}</span>
        </div>
        <div>
          {lang === 'es' ? 'ordenado por premio sobre línea base' : 'ranked by premium over baseline'}
        </div>
      </div>

      <div ref={box} className="relative" style={{ height: H }}>
        {ready && (
          <>
            <svg
              data-figure="pesos"
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={{ display: 'block' }}
              role="img"
              aria-label={lang === 'en' ? 'Cleveland dot-pair chart: estimated pesos at risk by ARIA pattern, ranked by premium over baseline.' : 'Gráfica de pares Cleveland: pesos estimados en riesgo por patrón ARIA, ordenado por premio sobre línea base.'}
            >
              {/* Shared log-scale axis at top */}
              <line x1={PLOT_X0} x2={PLOT_X0 + PLOT_W} y1={AXIS_H - 4} y2={AXIS_H - 4}
                stroke="var(--color-border)" strokeWidth={0.6} strokeOpacity={0.5} />
              {AXIS_TICKS.map((t) => (
                <g key={t}>
                  <line x1={xPos(t)} x2={xPos(t)} y1={AXIS_H - 8} y2={AXIS_H - 1}
                    stroke="var(--color-border)" strokeWidth={0.6} strokeOpacity={0.55} />
                  <line x1={xPos(t)} x2={xPos(t)} y1={AXIS_H - 1} y2={H - 2}
                    stroke="var(--color-border)" strokeWidth={0.4} strokeOpacity={0.25} />
                </g>
              ))}

              {/* Cleveland-pair rows */}
              {sorted.map((p, idx) => {
                const y = trackY(idx)
                const xBaseline = xPos(p.baselineMdp)
                const xActual = xPos(p.pesosBn)
                const rowTop = AXIS_H + idx * ROW_H
                return (
                  <g key={p.code}>
                    {/* Row divider (top of row) — no zebra band (amber rows lose contrast on grey) */}
                    {idx > 0 && (
                      <line x1={0} x2={W} y1={rowTop + 2} y2={rowTop + 2}
                        stroke="var(--color-border)" strokeWidth={0.5} strokeOpacity={0.4} />
                    )}
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
                    {/* Baseline dot — faded ghost of the same pattern colour */}
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
                    {/* Actual dot (filled, pattern colour, drop shadow) */}
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
                  </g>
                )
              })}
            </svg>

            {/* ── HTML label layer ── */}
            <div
              className="absolute font-mono text-[11px] text-text-muted leading-[14px]"
              style={{ left: narrow ? 0 : Math.max(0, PLOT_X0 - measureLabel(unit, TICK_FONT, 999, 14).width - 14), top: AXIS_H - 21 }}
            >
              {narrow ? `${unit}:` : unit}
            </div>
            {ticks.map((t) => {
              const w = tickW(t)
              const unitW = narrow ? measureLabel(`${unit}:`, TICK_FONT, 999, 14).width + 8 : 0
              const left = Math.min(W - w, Math.max(unitW, xPos(t) - w / 2))
              return (
                <div key={t} className="absolute font-mono text-[11px] text-text-muted tabular-nums leading-[14px]" style={{ left, top: AXIS_H - 21 }}>
                  {tickText(t)}
                </div>
              )
            })}
            {sorted.map((p, idx) => {
              const ink = inkOf(p.color)
              const rowTop = AXIS_H + idx * ROW_H
              const y = trackY(idx)
              const xActual = xPos(p.pesosBn)
              const value = dotLabel(p.pesosBn)
              const vw = measureLabel(value, VALUE_FONT, 999, 16).width
              const vendors = formatNumber(patternCounts?.[p.code] ?? p.vendors)
              const link = (
                <Link
                  to={`/aria?pattern=${p.code}`}
                  className={`inline-flex items-center min-h-6 px-1 rounded-sm font-mono text-[12px] font-semibold whitespace-nowrap hover:underline underline-offset-2 ${RING}`}
                  style={{ color: ink }}
                >
                  {lang === 'es' ? '→ Investigar' : '→ Investigate'}
                </Link>
              )
              return (
                <div key={p.code} data-pesos-row={p.code}>
                  {/* Pill + name + vendor count */}
                  <div
                    className="absolute flex items-start gap-2"
                    style={narrow
                      ? { left: 0, right: 0, top: rowTop + 6 }
                      : { left: 4, width: LABEL_W - 12, top: y - 17 }}
                  >
                    <span
                      className="font-mono text-[11px] font-extrabold leading-[18px] px-1.5 rounded-sm flex-shrink-0 mt-px"
                      style={{ color: ink, background: `color-mix(in srgb, ${p.color} 15%, transparent)` }}
                    >
                      {p.code}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-text-primary leading-[16px]">{p.label[lang]}</span>
                      <span className="block font-mono text-[11px] text-text-muted leading-[14px]">
                        {vendors} {lang === 'en' ? 'vendors' : 'proveedores'}
                      </span>
                    </span>
                  </div>
                  {/* Value on the dot */}
                  <div
                    className="absolute font-mono text-[13px] font-extrabold tabular-nums whitespace-nowrap leading-[16px]"
                    style={{ left: Math.min(W - vw, Math.max(PLOT_X0, xActual - vw / 2)), top: y - 26, color: ink }}
                  >
                    {value}
                  </div>
                  {/* → Investigate: right column on desktop, under the value dot on phones */}
                  <div
                    className="absolute"
                    style={narrow
                      ? { left: Math.min(W - 96, Math.max(PLOT_X0, xActual - 48)), top: y + 8 }
                      : { left: W - RIGHT_PAD + 4, top: y - 12 }}
                  >
                    {link}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Methodology footnote */}
      <div className="mt-3 pt-3 border-t border-border/40">
        <div className="text-[12px] font-mono text-text-muted leading-[1.5]">
          {lang === 'en'
            ? 'ESTIMATES — rows ranked by premium over sector-median baseline (gap = actual exposure − counterfactual baseline). Methodology: P5 = (price_ratio − 1) × value; P2 = full ghost volume; P6 = ~15% capture premium; P1 = ~12% monopoly discount lost; others scale with network volume.'
            : 'ESTIMACIONES — filas ordenadas por premio sobre línea base sectorial (brecha = exposición real − base contrafactual). Metodología: P5 = (razón_precio − 1) × valor; P2 = volumen fantasma completo; P6 = ~15% premio captura; P1 = ~12% descuento monopolio perdido; otros escalan con volumen de red.'}
        </div>
      </div>
    </div>
  )
}
