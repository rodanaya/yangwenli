/**
 * PillarBoleta — the FT-bullet pillar readout.
 *
 * Replaces PillarRadar (SVG spider chart — DESIGN_SYSTEM anti-pattern #2:
 * radar/spider charts fail at comparison) with five horizontal bullet rows,
 * one per pillar, each showing the pillar's raw value against its TRUE max
 * (band ticks at 35% and 65% of that max) plus one agate mono line surfacing
 * the prosecutorial fields the API returns but no surface previously
 * rendered: peer_percentile_sector, confidence_band, p90_risk_score,
 * signal_count_red, money_at_risk_mxn.
 *
 * Shared by InstitutionLeague.tsx (row-expand) and InstitutionDossier.tsx
 * (§0 La Boleta) — the league verdict and the dossier readout are literally
 * the same drawing, closing the P4 continuity break.
 *
 * espectro-del-padron P2 § 3.3
 */
import { useTranslation } from 'react-i18next'
import { INSTITUTION_PILLARS, pillarLabel, type InstitutionPillar } from '@/lib/institution-pillars'
import { TIER_STYLES } from '@/lib/tiers'
import { formatCompactMXN } from '@/lib/utils'

/** Minimal shape PillarBoleta needs — any scorecard-row-shaped object works. */
export interface PillarBoletaItem {
  institution_name?: string
  pillar_openness: number
  pillar_price: number
  pillar_vendors: number
  pillar_process: number
  pillar_external: number
  peer_percentile_sector?: number | null
  confidence_band?: string | null
  p90_risk_score?: number | null
  signal_count_red?: number | null
  money_at_risk_mxn?: number | null
}

/**
 * Deficit color band — steel (strong, Excelente tone) / amber (mid) /
 * crimson (weak). No green for a healthy pillar (Bible §3.10).
 */
export function pillarDeficitColor(frac: number): string {
  if (frac > 0.65) return TIER_STYLES.Excelente.color
  if (frac > 0.35) return 'var(--color-risk-high)'
  return 'var(--color-risk-critical)'
}

export interface WeakestPillar {
  pillar: InstitutionPillar
  value: number
  frac: number
  label: string
}

/** Weakest pillar = argmin(value / max) over the canonical 5-pillar map. */
export function getWeakestPillar(item: PillarBoletaItem, lang: string): WeakestPillar {
  let worst: WeakestPillar | null = null
  for (const p of INSTITUTION_PILLARS) {
    const value = (item[p.dbField] as number) ?? 0
    const max = p.max > 0 ? p.max : 1
    const frac = value / max
    if (!worst || frac < worst.frac) {
      worst = { pillar: p, value, frac, label: pillarLabel(p, lang) }
    }
  }
  return worst as WeakestPillar
}

export function PillarBoleta({ item }: { item: PillarBoletaItem }) {
  const { t, i18n } = useTranslation('institutionleague')
  const lang = i18n.language

  const rows = INSTITUTION_PILLARS.map((p) => ({
    pillar: p,
    label: pillarLabel(p, lang),
    value: (item[p.dbField] as number) ?? 0,
    max: p.max,
  }))

  const agateParts: string[] = []
  if (item.peer_percentile_sector != null) {
    agateParts.push(t('peerPercentileLine', { pct: Math.round((1 - item.peer_percentile_sector) * 100) }))
  }
  if (item.confidence_band) {
    agateParts.push(t('confidenceLine', { band: item.confidence_band }))
  }
  if (item.p90_risk_score != null) {
    agateParts.push(t('p90Line', { score: item.p90_risk_score.toFixed(0) }))
  }
  if (item.signal_count_red != null) {
    agateParts.push(t('redSignalsLine', { n: item.signal_count_red }))
  }
  if (item.money_at_risk_mxn != null) {
    agateParts.push(t('moneyAtRiskLine', { money: formatCompactMXN(item.money_at_risk_mxn) }))
  }

  return (
    <div className="flex flex-col gap-3 min-w-[240px]">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted">
        {t('boleta.title')}
      </p>
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => {
          const frac = row.max > 0 ? row.value / row.max : 0
          const pct = Math.min(1, Math.max(0, frac)) * 100
          const color = pillarDeficitColor(frac)
          return (
            <div key={row.pillar.dbField} className="flex items-center gap-3">
              <span
                className="text-[10px] font-mono uppercase tracking-wide text-text-muted w-32 shrink-0 truncate"
                title={row.label}
              >
                {row.pillar.letter} · {row.label}
              </span>
              {/* FT bullet track — band ticks at 35%/65% of the true max */}
              <div className="flex-1 relative min-w-0" style={{ height: 14 }} aria-hidden="true">
                <div
                  className="absolute left-0 right-0 top-1/2 rounded-[2px]"
                  style={{
                    height: 10,
                    transform: 'translateY(-50%)',
                    background: 'var(--color-background-elevated)',
                    border: '1px solid var(--color-border-hover)',
                  }}
                />
                <div className="absolute" style={{ left: '35%', top: 1, bottom: 1, width: 1, background: 'var(--color-border-hover)' }} />
                <div className="absolute" style={{ left: '65%', top: 1, bottom: 1, width: 1, background: 'var(--color-border-hover)' }} />
                <div
                  className="absolute left-0 top-1/2 rounded-[2px] transition-all"
                  style={{ width: `${pct}%`, height: 10, transform: 'translateY(-50%)', background: color, opacity: 0.85 }}
                />
              </div>
              <span
                className="text-[10px] font-mono tabular-nums w-14 text-right shrink-0"
                style={{ color }}
              >
                {row.value.toFixed(0)}/{row.max}
              </span>
            </div>
          )
        })}
      </div>
      {agateParts.length > 0 && (
        <p className="text-[9px] font-mono text-text-muted leading-relaxed border-t border-border/40 pt-2">
          {agateParts.join(' · ')}
        </p>
      )}
    </div>
  )
}
