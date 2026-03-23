
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'

// ---------------------------------------------------------------------------
// Static data — no API call
// ---------------------------------------------------------------------------

const ADMIN_DATA = [
  {
    name: 'Fox\n2000–06',
    shortName: 'Fox',
    yearRange: '2000–06',
    contracts: 207659,
    avgRisk: 0.1272,
    hrPct: 10.85,
    directAwardPct: 0.01,
    totalBillions: 938.9,
    color: '#6366f1',
  },
  {
    name: 'Calderón\n2007–12',
    shortName: 'Calderón',
    yearRange: '2007–12',
    contracts: 487722,
    avgRisk: 0.0986,
    hrPct: 8.37,
    directAwardPct: 42.51,
    totalBillions: 2420.8,
    color: '#3b82f6',
  },
  {
    name: 'Peña Nieto\n2013–18',
    shortName: 'EPN',
    yearRange: '2013–18',
    contracts: 1253865,
    avgRisk: 0.091,
    hrPct: 7.59,
    directAwardPct: 73.35,
    totalBillions: 3076.5,
    color: '#10b981',
  },
  {
    name: 'AMLO\n2019–24',
    shortName: 'AMLO',
    yearRange: '2019–24',
    contracts: 1067913,
    avgRisk: 0.1154,
    hrPct: 10.24,
    directAwardPct: 79.52,
    totalBillions: 2772.0,
    color: '#f59e0b',
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
    color: '#ec4899',
  },
]

// ---------------------------------------------------------------------------
// Normalization maxima
// ---------------------------------------------------------------------------

const MAX_AVG_RISK = 0.1272
const MAX_HR_PCT = 11.97
const MAX_DA_PCT = 79.52
const MAX_BILLIONS = 3076.5
const MAX_CONTRACTS = 1253865

function normalize(value: number, max: number): number {
  return Math.round((value / max) * 100)
}

// ---------------------------------------------------------------------------
// Build per-admin radar data
// ---------------------------------------------------------------------------

interface RadarDatum {
  axis: string
  value: number
  rawLabel: string
}

function buildRadarData(admin: (typeof ADMIN_DATA)[0]): RadarDatum[] {
  return [
    {
      axis: 'Risk Score',
      value: normalize(admin.avgRisk, MAX_AVG_RISK),
      rawLabel: (admin.avgRisk * 100).toFixed(2) + '%',
    },
    {
      axis: 'High-Risk %',
      value: normalize(admin.hrPct, MAX_HR_PCT),
      rawLabel: admin.hrPct.toFixed(2) + '%',
    },
    {
      axis: 'Direct Award %',
      value: normalize(admin.directAwardPct, MAX_DA_PCT),
      rawLabel: admin.directAwardPct.toFixed(1) + '%',
    },
    {
      axis: 'Total Value',
      value: normalize(admin.totalBillions, MAX_BILLIONS),
      rawLabel: admin.totalBillions.toFixed(1) + 'B MXN',
    },
    {
      axis: 'Volume',
      value: normalize(admin.contracts, MAX_CONTRACTS),
      rawLabel: admin.contracts.toLocaleString() + ' contracts',
    },
  ]
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  payload: RadarDatum
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div className="bg-background-card border border-border rounded-md px-3 py-2 text-xs shadow-xl">
      <p className="text-text-secondary font-medium mb-0.5">{d.axis}</p>
      <p className="text-text-primary font-mono">{d.rawLabel}</p>
      <p className="text-text-muted mt-0.5">Index: {d.value}/100</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single admin radar panel
// ---------------------------------------------------------------------------

function AdminRadarPanel({ admin }: { admin: (typeof ADMIN_DATA)[0] }) {
  const data = buildRadarData(admin)

  return (
    <div className="flex flex-col items-center bg-background-elevated border border-border rounded-xl p-4 gap-2">
      {/* Title */}
      <div className="text-center">
        <p className="text-sm font-bold text-text-primary leading-tight">{admin.shortName}</p>
        <p className="text-[10px] text-text-muted font-mono">{admin.yearRange}</p>
      </div>

      {/* Radar */}
      <div className="w-full" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontFamily: "var(--font-family-mono, ui-monospace, 'SF Mono', monospace)" }}
            />
            <Radar
              name={admin.shortName}
              dataKey="value"
              stroke={admin.color}
              fill={admin.color}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Mini stats */}
      <div className="w-full grid grid-cols-2 gap-1 mt-1">
        <div className="text-center bg-background-card rounded-md py-1">
          <p className="text-[10px] text-text-muted">High-Risk</p>
          <p className="text-xs font-mono font-semibold" style={{ color: admin.color }}>
            {admin.hrPct.toFixed(1)}%
          </p>
        </div>
        <div className="text-center bg-background-card rounded-md py-1">
          <p className="text-[10px] text-text-muted">Direct Award</p>
          <p className="text-xs font-mono font-semibold" style={{ color: admin.color }}>
            {admin.directAwardPct.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Insight stat card
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
    <div className="flex flex-col gap-1 bg-background-elevated border border-border rounded-xl p-4">
      <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">{label}</p>
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
      {/* Section header */}
      <div>
        <h2 className="text-base font-bold text-text-primary font-mono tracking-tight">
          {t('fingerprints.title')}
        </h2>
        <p className="text-xs text-text-muted mt-0.5">
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
          value="Peña Nieto — 7.59%"
          note="Lowest high-risk contract rate across all administrations"
          color="#10b981"
        />
        <InsightCard
          label={t('fingerprints.insight_highest_da')}
          value="AMLO — 79.5%"
          note="Highest share of contracts awarded without competition"
          color="#f59e0b"
        />
        <InsightCard
          label={t('fingerprints.insight_biggest_spender')}
          value="Peña Nieto — 3.08T MXN"
          note="Largest total procurement value across a single administration"
          color="#10b981"
        />
      </div>
    </div>
  )
}
