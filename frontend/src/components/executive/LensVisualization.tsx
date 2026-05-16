/**
 * LensVisualization — slim ICIJ-style narrowing ribbon.
 * SVG funnel that shows how the platform narrows 3.1M contracts to 299 T1 vendors.
 * Five stages with tick marks only; numeric labels live in the right-side list.
 *
 * Extracted from Executive.tsx (§ 2 La Lente) — do not inline again.
 */

import { motion } from 'framer-motion'
import { formatNumber } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Types + constants
// ─────────────────────────────────────────────────────────────────────────────

export interface LensTier {
  count: number
  display: string
  label: { en: string; es: string }
  sublabel: { en: string; es: string }
  ringR: number
  color: string
  ringWidth: number
  ringOpacity: number
  filled?: boolean
  href: string
}

export function buildLensTiers(t1Count: number, gtCount: number, hcCount: number): LensTier[] {
  return [
    {
      count: 3_051_294,
      display: '3.1M',
      label: { en: 'contracts analyzed', es: 'contratos analizados' },
      sublabel: { en: 'every COMPRANET row · 2002–2025', es: 'cada registro COMPRANET · 2002–2025' },
      ringR: 96,
      color: 'var(--color-text-muted)',
      ringWidth: 0.7,
      ringOpacity: 0.40,
      href: '/methodology',
    },
    {
      count: hcCount,
      display: formatNumber(hcCount),
      label: { en: 'high + critical risk', es: 'riesgo alto + crítico' },
      sublabel: { en: '11.0% of all contracts · OECD compliant band', es: '11.0% del total · banda OCDE cumplida' },
      ringR: 72,
      color: '#f59e0b',
      ringWidth: 1.1,
      ringOpacity: 0.55,
      href: '/contracts?risk_level=high',
    },
    {
      count: 6_250,
      display: '6.2k',
      label: { en: 'ARIA priority watch list', es: 'lista de vigilancia ARIA' },
      sublabel: { en: 'Tier 2 + Tier 3 vendors', es: 'proveedores Tier 2 + Tier 3' },
      ringR: 50,
      color: '#f59e0b',
      ringWidth: 1.5,
      ringOpacity: 0.85,
      href: '/aria',
    },
    {
      count: gtCount,
      display: formatNumber(gtCount),
      label: { en: 'documented corruption cases', es: 'casos documentados de corrupción' },
      sublabel: { en: 'GT-anchored · anchor corpus for model training', es: 'anclados en GT · corpus ancla para entrenamiento' },
      ringR: 32,
      color: '#a06820',
      ringWidth: 1.7,
      ringOpacity: 0.90,
      href: '/cases',
    },
    {
      count: t1Count,
      display: formatNumber(t1Count),
      label: { en: 'T1 vendors · GT-anchored', es: 'proveedores T1 · anclados en GT' },
      sublabel: { en: 'highest IPS tier · model-discovery uplift in calibration', es: 'mayor IPS · uplift de descubrimiento en calibración' },
      ringR: 16,
      color: '#dc2626',
      ringWidth: 0,
      ringOpacity: 1,
      filled: true,
      href: '/aria',
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface LensVisualizationProps {
  tiers: LensTier[]
  lang: 'en' | 'es'
}

export function LensVisualization({ tiers, lang }: LensVisualizationProps) {
  const W = 220
  const H = 220 // viewBox height; container stretches to match list height
  // PAD values chosen so SVG stage ticks align with right-list dot centers.
  // The dots sit ABOVE row geometric center (row holds dot+number+label on
  // top line, sublabel on bottom line). Empirical measurement: dots are
  // 8px above row mid. To match, shift the ticks UP 6.3px in viewBox space
  // (6.3 × 280/220 = 8px rendered). PAD_T 22-6 = 16, PAD_B 22+6 = 28.
  const PAD_T = 16
  const PAD_B = 28
  const CX = W / 2
  const CH = H - PAD_T - PAD_B

  const stages = tiers.slice(0, 5)
  const counts = stages.map(t => t.count)
  const maxCount = Math.max(...counts)
  // log scale so 3M and 165 both register
  const widthOf = (count: number) => {
    const minW = 14
    const maxW = 180
    const v = Math.log10(Math.max(count, 1))
    const vmax = Math.log10(maxCount)
    const vmin = Math.log10(Math.max(stages[stages.length - 1].count, 1))
    if (vmax === vmin) return maxW
    return minW + (maxW - minW) * (v - vmin) / (vmax - vmin)
  }
  const stageY = (i: number) => PAD_T + (CH / (stages.length - 1)) * i

  // "kept" funnel polygon
  const keptPath = (() => {
    const left: string[] = []
    const right: string[] = []
    stages.forEach((s, i) => {
      const w = widthOf(s.count)
      const y = stageY(i)
      left.push(`${i === 0 ? 'M' : 'L'} ${(CX - w / 2).toFixed(1)} ${y.toFixed(1)}`)
      right.unshift(`L ${(CX + w / 2).toFixed(1)} ${y.toFixed(1)}`)
    })
    return [...left, ...right, 'Z'].join(' ')
  })()

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      role="img"
      aria-label={lang === 'es'
        ? 'Embudo de reducción: cinco etapas de filtrado de contratos'
        : 'Reduction funnel: five stages of contract filtering'}
    >
      <defs>
        <radialGradient id="lens-apex-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lens-kept" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--color-text-muted)" stopOpacity="0.32" />
          <stop offset="55%" stopColor="#a06820" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.92" />
        </linearGradient>
      </defs>

      {/* Apex glow behind the bottom row */}
      <motion.circle
        cx={CX}
        cy={stageY(stages.length - 1)}
        r={30}
        fill="url(#lens-apex-glow)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.9 }}
      />

      {/* Main "kept" funnel ribbon */}
      <motion.path
        d={keptPath}
        fill="url(#lens-kept)"
        stroke="none"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />

      {/* Stage tick marks ONLY — no count text, no pill. Right-side list
          carries every numeric the reader needs. */}
      {stages.map((s, i) => {
        const w = widthOf(s.count)
        const y = stageY(i)
        const isFinal = i === stages.length - 1
        return (
          <motion.line
            key={i}
            x1={CX - w / 2}
            x2={CX + w / 2}
            y1={y}
            y2={y}
            stroke={isFinal ? '#dc2626' : 'var(--color-text-primary)'}
            strokeWidth={isFinal ? 2.4 : 1}
            strokeOpacity={isFinal ? 1 : 0.55}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.12 }}
          />
        )
      })}

      {/* Editorial finding label at the outer ring — Playfair italic.
          fontSize=9 renders ~11px after the 280/220 vertical stretch. */}
      <motion.text
        x={CX}
        y={PAD_T + 14}
        textAnchor="middle"
        fontSize={8}
        fontFamily="'Playfair Display', Georgia, serif"
        fontStyle="italic"
        fill="var(--color-text-muted)"
        fillOpacity={0.65}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 1.1 }}
      >
        {lang === 'es' ? '12% del gasto · 6% de contratos' : '12% of pesos · 6% of contracts'}
      </motion.text>
    </svg>
  )
}
