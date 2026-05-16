/**
 * AdministrationFingerprints — 5-panel radar comparison of Mexican presidents
 *
 * Accepts live adminAggs from Administrations.tsx — no hardcoded stats.
 * Year ranges sourced from ADMINISTRATIONS in data.ts (dataStart, end).
 */

import { useTranslation } from 'react-i18next'
import {
  EditorialRadarChart,
  type RadarSeries,
  type ColorToken,
} from '@/components/charts/editorial'
import type { AdminAgg } from '@/components/administrations/types'
import { formatCompactMXN } from '@/lib/utils'

// Display names with correct diacritics (agg.name is the ASCII key used for lookups)
const DISPLAY_NAMES: Record<string, string> = {
  Fox: 'Fox',
  Calderon: 'Calderón',
  'Pena Nieto': 'Peña Nieto',
  AMLO: 'AMLO',
  Sheinbaum: 'Sheinbaum',
}

// ---------------------------------------------------------------------------
// Static metadata per admin (color tokens, accent CSS var)
// ---------------------------------------------------------------------------

const ADMIN_META: Record<string, {
  colorToken: ColorToken
  accentColorVar: string
  yearLabel: string
}> = {
  Fox:        { colorToken: 'sector-educacion'    as ColorToken, accentColorVar: 'var(--color-sector-educacion)',    yearLabel: '2002–06' },
  Calderon:   { colorToken: 'oecd'                as ColorToken, accentColorVar: 'var(--color-oecd)',                yearLabel: '2006–12' },
  'Pena Nieto': { colorToken: 'sector-infraestructura' as ColorToken, accentColorVar: 'var(--color-sector-infraestructura)', yearLabel: '2012–18' },
  AMLO:       { colorToken: 'sector-tecnologia'   as ColorToken, accentColorVar: 'var(--color-sector-tecnologia)',   yearLabel: '2018–24' },
  Sheinbaum:  { colorToken: 'sector-gobernacion'  as ColorToken, accentColorVar: 'var(--color-sector-gobernacion)',  yearLabel: '2024–' },
}

// ---------------------------------------------------------------------------
// Normalization helpers (computed from live data, not hardcoded maxes)
// ---------------------------------------------------------------------------

function buildMaxes(aggs: AdminAgg[]) {
  return {
    avgRisk:      Math.max(...aggs.map((a) => a.avgRisk), 0.001),
    hrPct:        Math.max(...aggs.map((a) => a.highRiskPct), 0.001),
    daPct:        Math.max(...aggs.map((a) => a.directAwardPct), 0.001),
    totalBillions:Math.max(...aggs.map((a) => a.totalValue / 1e9), 0.001),
    contracts:    Math.max(...aggs.map((a) => a.contracts), 1),
  }
}

function buildConsensus(aggs: AdminAgg[], maxes: ReturnType<typeof buildMaxes>): number[] {
  const n = aggs.length || 1
  return [
    aggs.reduce((s, a) => s + a.avgRisk, 0) / n / maxes.avgRisk,
    aggs.reduce((s, a) => s + a.highRiskPct, 0) / n / maxes.hrPct,
    aggs.reduce((s, a) => s + a.directAwardPct, 0) / n / maxes.daPct,
    aggs.reduce((s, a) => s + a.totalValue / 1e9, 0) / n / maxes.totalBillions,
    aggs.reduce((s, a) => s + a.contracts, 0) / n / maxes.contracts,
  ]
}

function buildSeries(agg: AdminAgg, axes: string[], maxes: ReturnType<typeof buildMaxes>): RadarSeries[] {
  const meta = ADMIN_META[agg.name] ?? ADMIN_META['Sheinbaum']
  return [{
    name: agg.name,
    colorToken: meta.colorToken,
    values: {
      [axes[0]]: agg.avgRisk / maxes.avgRisk,
      [axes[1]]: agg.highRiskPct / maxes.hrPct,
      [axes[2]]: agg.directAwardPct / maxes.daPct,
      [axes[3]]: (agg.totalValue / 1e9) / maxes.totalBillions,
      [axes[4]]: agg.contracts / maxes.contracts,
    },
  }]
}

// ---------------------------------------------------------------------------
// Single admin radar panel
// ---------------------------------------------------------------------------

function AdminRadarPanel({
  agg,
  axes,
  maxes,
  consensus,
}: {
  agg: AdminAgg
  axes: string[]
  maxes: ReturnType<typeof buildMaxes>
  consensus: number[]
}) {
  const { t } = useTranslation('administrations')
  const meta = ADMIN_META[agg.name] ?? ADMIN_META['Sheinbaum']

  return (
    <div className="flex flex-col items-center rounded-sm border border-border bg-background-card/60 p-4 gap-2">
      <div className="text-center">
        <p className="text-sm font-bold text-text-primary leading-tight">{DISPLAY_NAMES[agg.name] ?? agg.name}</p>
        <p className="text-[10px] text-text-muted font-mono">{meta.yearLabel}</p>
      </div>
      <div className="w-full" style={{ minWidth: 120 }}>
        <EditorialRadarChart
          axes={axes}
          series={buildSeries(agg, axes, maxes)}
          height={180}
          valueDomain={[0, 1]}
          consensusData={consensus}
          consensusLabel={t('radar.subtitle', { defaultValue: 'Promedio · 5 sexenios' })}
        />
      </div>
      <div className="w-full grid grid-cols-2 gap-1 mt-1">
        <div className="text-center bg-background-elevated/50 rounded-md py-1">
          <p className="text-[10px] text-text-muted font-mono">{t('radar.miniHighRisk')}</p>
          <p className="text-xs font-mono font-semibold" style={{ color: meta.accentColorVar }}>
            {agg.highRiskPct.toFixed(1)}%
          </p>
        </div>
        <div className="text-center bg-background-elevated/50 rounded-md py-1">
          <p className="text-[10px] text-text-muted font-mono">{t('radar.miniDirectAward')}</p>
          <p className="text-xs font-mono font-semibold" style={{ color: meta.accentColorVar }}>
            {agg.directAwardPct.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Insight stat card — dark editorial
// ---------------------------------------------------------------------------

function InsightCard({ label, value, note, color }: {
  label: string; value: string; note: string; color: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-border bg-background-card/60 p-4">
      <p className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-[0.15em]">{label}</p>
      <p className="text-base font-bold font-mono" style={{ color }}>{value}</p>
      <p className="text-[11px] text-text-secondary">{note}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AdministrationFingerprintsProps {
  adminAggs: AdminAgg[]
}

export default function AdministrationFingerprints({ adminAggs }: AdministrationFingerprintsProps) {
  const { t } = useTranslation('administrations')

  // Sort by chronological order
  const order = ['Fox', 'Calderon', 'Pena Nieto', 'AMLO', 'Sheinbaum']
  const sorted = [...adminAggs].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))

  const maxes = buildMaxes(sorted)

  const axes = [
    t('radar.axisRiskScore'),
    t('radar.axisHighRisk'),
    t('radar.axisDirectAward'),
    t('radar.axisTotalValue'),
    t('radar.axisVolume'),
  ]

  const consensus = buildConsensus(sorted, maxes)

  // Compute live insight cards from actual data
  const lowestHR = sorted.reduce((min, a) => a.highRiskPct < min.highRiskPct ? a : min, sorted[0] ?? { name: '—', highRiskPct: 0, directAwardPct: 0, totalValue: 0 })
  const highestDA = sorted.reduce((max, a) => a.directAwardPct > max.directAwardPct ? a : max, sorted[0] ?? { name: '—', directAwardPct: 0, highRiskPct: 0, totalValue: 0 })
  const biggestSpender = sorted.reduce((max, a) => a.totalValue > max.totalValue ? a : max, sorted[0] ?? { name: '—', totalValue: 0, highRiskPct: 0, directAwardPct: 0 })

  if (sorted.length === 0) {
    return <div className="h-[420px] bg-background-card animate-pulse rounded-sm" />
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
          RUBLI v0.8.5 · Procurement Governance
        </p>
        <h2 className="text-base font-bold text-text-primary font-mono tracking-tight">
          {t('fingerprints.title')}
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          {t('fingerprints.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {sorted.map((agg) => (
          <AdminRadarPanel
            key={agg.name}
            agg={agg}
            axes={axes}
            maxes={maxes}
            consensus={consensus}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
        <InsightCard
          label={t('fingerprints.insight_lowest_risk')}
          value={`${DISPLAY_NAMES[lowestHR.name] ?? lowestHR.name} — ${lowestHR.highRiskPct.toFixed(1)}%`}
          note={t('radar.insightLowestNote')}
          color={ADMIN_META[lowestHR.name]?.accentColorVar ?? '#ef4444'}
        />
        <InsightCard
          label={t('fingerprints.insight_highest_da')}
          value={`${DISPLAY_NAMES[highestDA.name] ?? highestDA.name} — ${highestDA.directAwardPct.toFixed(0)}%`}
          note={t('radar.insightHighestDaNote')}
          color={ADMIN_META[highestDA.name]?.accentColorVar ?? '#f59e0b'}
        />
        <InsightCard
          label={t('fingerprints.insight_biggest_spender')}
          value={`${DISPLAY_NAMES[biggestSpender.name] ?? biggestSpender.name} — ${formatCompactMXN(biggestSpender.totalValue)}`}
          note={t('radar.insightBiggestNote')}
          color={ADMIN_META[biggestSpender.name]?.accentColorVar ?? '#64748b'}
        />
      </div>
    </div>
  )
}
