/**
 * SectorSledgehammer — Pudding "30 Years of American Anxieties" pattern
 * applied to the per-sector dossier header.
 *
 * Picks the sector's WORST metric at runtime and renders it as a giant
 * Playfair-Italic-800 number — the reader cannot ignore the finding.
 *
 * Selection rule (per docs/SECTOR_PROFILE_REDESIGN_PLAN.md sp-P1):
 *   1. DA% > 50  → headline = DA%, subline = "without competition"
 *   2. SB% > 25  → headline = SB%, subline = "competitive with 1 bidder"
 *   3. avg_risk ≥ 0.25 → headline = risk%, subline = "avg risk indicator"
 *   4. else      → headline = total spend (compact MXN)
 *
 * Renders only when data is loaded (no flicker on initial mount).
 *
 * sp-P1 · docs/SECTOR_PROFILE_REDESIGN_PLAN.md
 * Build: 2026-05-04-sp-1-3-4
 */

import { useTranslation } from 'react-i18next'
import { SECTOR_TEXT_COLORS } from '@/lib/constants'
import { formatCompactMXN } from '@/lib/utils'

interface SectorStats {
  direct_award_pct: number
  single_bid_pct: number
  avg_risk_score: number
  total_value_mxn: number
  total_contracts: number
  high_risk_count: number
  critical_risk_count: number
  total_vendors?: number
}

interface SectorSledgehammerProps {
  /** Canonical sector code, e.g. "salud" */
  sectorCode: string
  /** The vivid fill color for the accent bar (SECTOR_COLORS[code]) */
  sectorFill: string
  /** Sector display name (localized) */
  sectorName: string
  /** Pre-loaded statistics — component renders nothing until truthy */
  stats: SectorStats | null | undefined
}

interface DominantMetric {
  display: string      // e.g. "64%"
  sublineEs: string    // e.g. "de contratos sin competencia"
  sublineEn: string    // e.g. "of contracts awarded without competition"
  oecdRefEs: string    // cyan reference line
  oecdRefEn: string
}

function pickDominantMetric(stats: SectorStats): DominantMetric {
  const da = stats.direct_award_pct ?? 0
  const sb = stats.single_bid_pct ?? 0
  const risk = stats.avg_risk_score ?? 0

  if (da > 50) {
    const mult = (da / 25).toFixed(1)
    return {
      display: `${da.toFixed(1)}%`,
      sublineEs: 'de contratos sin competencia',
      sublineEn: 'of contracts awarded without competition',
      oecdRefEs: `OCDE recomienda ≤ 25%. Este sector está a ${mult}× ese techo.`,
      oecdRefEn: `OECD recommends ≤ 25%. This sector is at ${mult}× that ceiling.`,
    }
  }

  if (sb > 25) {
    const mult = (sb / 10).toFixed(1)
    return {
      display: `${sb.toFixed(1)}%`,
      sublineEs: 'de procedimientos competitivos con un solo oferente',
      sublineEn: 'of competitive procedures with one bidder',
      oecdRefEs: `OCDE referencia ≤ 10%. Este sector está a ${mult}× ese umbral.`,
      oecdRefEn: `OECD reference ≤ 10%. This sector is at ${mult}× that threshold.`,
    }
  }

  if (risk >= 0.25) {
    const riskPct = (risk * 100).toFixed(1)
    return {
      display: `${riskPct}%`,
      sublineEs: 'indicador de riesgo promedio · modelo v0.8.5',
      sublineEn: 'average risk indicator · model v0.8.5',
      oecdRefEs: `Plataforma promedio: 11.0%. Este sector está ${(risk / 0.11).toFixed(1)}× la media.`,
      oecdRefEn: `Platform average: 11.0%. This sector is ${(risk / 0.11).toFixed(1)}× the mean.`,
    }
  }

  // Fallback: total spend
  const spend = formatCompactMXN(stats.total_value_mxn ?? 0)
  return {
    display: spend,
    sublineEs: 'en contratos federales · 2002–2025',
    sublineEn: 'in federal contracts · 2002–2025',
    oecdRefEs: 'El modelo v0.8.5 no detecta señales sistémicas elevadas.',
    oecdRefEn: 'Model v0.8.5 detects no elevated systemic signals.',
  }
}

export function SectorSledgehammer({
  sectorCode,
  sectorFill,
  sectorName,
  stats,
}: SectorSledgehammerProps) {
  const { i18n } = useTranslation('sectors')
  const isEs = i18n.language.startsWith('es')

  // Render nothing until data arrives — no flicker
  if (!stats) return null

  const metric = pickDominantMetric(stats)
  // AA-safe text color for the sector (SECTOR_TEXT_COLORS, not SECTOR_COLORS)
  const textColor = SECTOR_TEXT_COLORS[sectorCode] ?? sectorFill

  const eyebrowEs = `EN 2023, EL SECTOR ${sectorName.toUpperCase()} REGISTRÓ`
  const eyebrowEn = `IN 2023, THE ${sectorName.toUpperCase()} SECTOR RECORDED`

  return (
    <div
      className="surface-card rounded-sm p-8 md:p-10 relative overflow-hidden mb-5"
      aria-label={
        isEs
          ? `${sectorName}: ${metric.display} ${metric.sublineEs}`
          : `${sectorName}: ${metric.display} ${metric.sublineEn}`
      }
    >
      {/* Left accent bar — vivid SECTOR_COLORS fill (stroke ≥ 1.5px rule) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: sectorFill }}
        aria-hidden
      />

      {/* Eyebrow — sector code in AA-safe text color */}
      <div
        className="font-mono text-[11px] uppercase tracking-[0.18em] mb-3"
        style={{ color: textColor }}
      >
        {isEs ? eyebrowEs : eyebrowEn}
      </div>

      {/* Sledgehammer number */}
      <div
        className="leading-[0.9] font-extrabold italic tabular-nums mb-5"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(72px, 11vw, 148px)',
          color: textColor,
          letterSpacing: '-0.03em',
        }}
        aria-hidden
      >
        {metric.display}
      </div>

      {/* Context / sub-line */}
      <div
        className="text-[17px] md:text-[20px] font-serif leading-[1.3] mb-4 max-w-[38ch]"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: 'var(--color-text-secondary)',
        }}
      >
        {isEs ? metric.sublineEs : metric.sublineEn}
      </div>

      {/* Divider */}
      <div
        className="w-14 mb-4"
        style={{ height: 2, background: 'var(--color-border-hover)', opacity: 0.6 }}
        aria-hidden
      />

      {/* OECD / platform reference line */}
      <div
        className="font-mono text-[11px] leading-[1.8] uppercase tracking-[0.1em]"
        style={{ color: '#22d3ee' }}
      >
        {isEs ? metric.oecdRefEs : metric.oecdRefEn}
      </div>
    </div>
  )
}
