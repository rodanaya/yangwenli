/**
 * AdministrationFingerprints — 5-panel radar comparison of Mexican presidents
 *
 * Each administration gets a radar chart showing normalized metrics:
 * risk score, high-risk %, direct award %, total value, and volume.
 *
 * Migrated to EditorialRadarChart (Apr 2026). Hex admin colors → token palette.
 */

import { useTranslation } from 'react-i18next'
import {
  EditorialRadarChart,
  type RadarSeries,
  type ColorToken,
} from '@/components/charts/editorial'

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const ADMIN_DATA = [
  {
    name: 'Fox\n2000-06',
    shortName: 'Fox',
    yearRange: '2000-06',
    contracts: 207659,
    avgRisk: 0.1272,
    hrPct: 10.85,
    directAwardPct: 40.19,
    totalBillions: 938.9,
    colorToken: 'sector-educacion' as ColorToken,
    accentColorVar: 'var(--color-sector-educacion)',
  },
  {
    name: 'Calderon\n2007-12',
    shortName: 'Calderon',
    yearRange: '2007-12',
    contracts: 487722,
    avgRisk: 0.0986,
    hrPct: 8.37,
    directAwardPct: 42.51,
    totalBillions: 2420.8,
    colorToken: 'oecd' as ColorToken,
    accentColorVar: 'var(--color-oecd)',
  },
  {
    name: 'Pena Nieto\n2013-18',
    shortName: 'EPN',
    yearRange: '2013-18',
    contracts: 1253865,
    avgRisk: 0.091,
    hrPct: 7.59,
    directAwardPct: 73.35,
    totalBillions: 3076.5,
    colorToken: 'sector-infraestructura' as ColorToken,
    accentColorVar: 'var(--color-sector-infraestructura)',
  },
  {
    name: 'AMLO\n2019-24',
    shortName: 'AMLO',
    yearRange: '2019-24',
    contracts: 1067913,
    avgRisk: 0.1154,
    hrPct: 10.24,
    directAwardPct: 79.52,
    totalBillions: 2772.0,
    colorToken: 'sector-tecnologia' as ColorToken,
    accentColorVar: 'var(--color-sector-tecnologia)',
  },
  {
    name: 'Sheinbaum\n2025+',
    shortName: 'Sheinbaum',
    yearRange: '2025+',
    contracts: 92848,
    avgRisk: 0.1266,
    hrPct: 11.97,
    directAwardPct: 68.04,
    totalBillions: 719.3,
    colorToken: 'sector-gobernacion' as ColorToken,
    accentColorVar: 'var(--color-sector-gobernacion)',
  },
]

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const MAX_AVG_RISK = 0.1272
const MAX_HR_PCT = 11.97
const MAX_DA_PCT = 79.52
const MAX_BILLIONS = 3076.5
const MAX_CONTRACTS = 1253865

const RADAR_AXES = ['Risk Score', 'High-Risk %', 'Direct Award %', 'Total Value', 'Volume']

function normalize(value: number, max: number): number {
  return value / max  // 0..1 for editorial radar valueDomain default
}

function buildSeries(admin: (typeof ADMIN_DATA)[0]): RadarSeries[] {
  return [
    {
      name: admin.shortName,
      colorToken: admin.colorToken,
      values: {
        'Risk Score': normalize(admin.avgRisk, MAX_AVG_RISK),
        'High-Risk %': normalize(admin.hrPct, MAX_HR_PCT),
        'Direct Award %': normalize(admin.directAwardPct, MAX_DA_PCT),
        'Total Value': normalize(admin.totalBillions, MAX_BILLIONS),
        'Volume': normalize(admin.contracts, MAX_CONTRACTS),
      },
    },
  ]
}

// ---------------------------------------------------------------------------
// Single admin radar panel
// ---------------------------------------------------------------------------

function AdminRadarPanel({ admin }: { admin: (typeof ADMIN_DATA)[0] }) {
  return (
    <div className="flex flex-col items-center rounded-sm border border-border bg-background-card/60 p-4 gap-2">
      {/* Title */}
      <div className="text-center">
        <p className="text-sm font-bold text-text-primary leading-tight">{admin.shortName}</p>
        <p className="text-[10px] text-text-muted font-mono">{admin.yearRange}</p>
      </div>

      {/* Radar */}
      <div className="w-full">
        <EditorialRadarChart
          axes={RADAR_AXES}
          series={buildSeries(admin)}
          height={180}
          valueDomain={[0, 1]}
        />
      </div>

      {/* Mini stats */}
      <div className="w-full grid grid-cols-2 gap-1 mt-1">
        <div className="text-center bg-background-elevated/50 rounded-md py-1">
          <p className="text-[10px] text-text-muted font-mono">High-Risk</p>
          <p className="text-xs font-mono font-semibold" style={{ color: admin.accentColorVar }}>
            {admin.hrPct.toFixed(1)}%
          </p>
        </div>
        <div className="text-center bg-background-elevated/50 rounded-md py-1">
          <p className="text-[10px] text-text-muted font-mono">Direct Award</p>
          <p className="text-xs font-mono font-semibold" style={{ color: admin.accentColorVar }}>
            {admin.directAwardPct.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Insight stat card — dark editorial
// ---------------------------------------------------------------------------

function InsightCard({
  label,
  value,
  note,
  color,
}: {
  label: string
  value: string
  note: string
  color: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-border bg-background-card/60 p-4">
      <p className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-[0.15em]">{label}</p>
      <p className="text-base font-bold font-mono" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px] text-text-secondary">{note}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdministrationFingerprints() {
  const { t } = useTranslation('administrations')

  return (
    <div className="space-y-4">
      {/* Section header — editorial overline */}
      <div>
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-text-muted mb-1">
          RUBLI v0.6.5 · Procurement Governance
        </p>
        <h2 className="text-base font-bold text-text-primary font-mono tracking-tight">
          {t('fingerprints.title')}
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          {t('fingerprints.subtitle')}
        </p>
      </div>

      {/* 5-panel radar grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {ADMIN_DATA.map((admin) => (
          <AdminRadarPanel key={admin.shortName} admin={admin} />
        ))}
      </div>

      {/* Insight strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
        <InsightCard
          label={t('fingerprints.insight_lowest_risk')}
          value="Pena Nieto -- 7.59%"
          note="Lowest high-risk contract rate across all administrations"
          color="var(--color-sector-infraestructura)"
        />
        <InsightCard
          label={t('fingerprints.insight_highest_da')}
          value="AMLO -- 79.5%"
          note="Highest share of contracts awarded without competition"
          color="var(--color-sector-tecnologia)"
        />
        <InsightCard
          label={t('fingerprints.insight_biggest_spender')}
          value="Pena Nieto -- 3.08T MXN"
          note="Largest total procurement value across a single administration"
          color="var(--color-sector-infraestructura)"
        />
      </div>
    </div>
  )
}
