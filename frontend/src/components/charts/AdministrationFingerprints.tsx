/**
 * AdministrationFingerprints — 5-panel radar comparison of Mexican presidents
 *
 * Each administration gets a radar chart showing normalized metrics:
 * risk score, high-risk %, direct award %, total value, and volume.
 *
 * Design: dark editorial (zinc-900 bg), monospace labels, colored radar fills.
 */

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { getLocale } from '@/lib/utils'

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
    color: '#3b82f6',
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
    color: '#22d3ee',
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
    color: '#ea580c',
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
    color: '#8b5cf6',
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
// Normalization
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
      rawLabel: admin.contracts.toLocaleString(getLocale()) + ' contracts',
    },
  ]
}

// ---------------------------------------------------------------------------
// Custom tooltip — dark editorial
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
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-2xl"
      style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46' }}
    >
      <p className="text-zinc-400 font-mono font-medium mb-0.5">{d.axis}</p>
      <p className="text-zinc-100 font-mono">{d.rawLabel}</p>
      <p className="text-zinc-600 mt-0.5 font-mono">Index: {d.value}/100</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Single admin radar panel
// ---------------------------------------------------------------------------

function AdminRadarPanel({ admin }: { admin: (typeof ADMIN_DATA)[0] }) {
  const data = buildRadarData(admin)

  return (
    <div className="flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 gap-2">
      {/* Title */}
      <div className="text-center">
        <p className="text-sm font-bold text-zinc-100 leading-tight">{admin.shortName}</p>
        <p className="text-[10px] text-zinc-500 font-mono">{admin.yearRange}</p>
      </div>

      {/* Radar */}
      <div className="w-full" style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke="#3f3f46" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: '#71717a', fontSize: 9, fontFamily: "ui-monospace, 'SF Mono', monospace" }}
            />
            <Radar
              name={admin.shortName}
              dataKey="value"
              stroke={admin.color}
              fill={admin.color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Mini stats */}
      <div className="w-full grid grid-cols-2 gap-1 mt-1">
        <div className="text-center bg-zinc-800/50 rounded-md py-1">
          <p className="text-[10px] text-zinc-500 font-mono">High-Risk</p>
          <p className="text-xs font-mono font-semibold" style={{ color: admin.color }}>
            {admin.hrPct.toFixed(1)}%
          </p>
        </div>
        <div className="text-center bg-zinc-800/50 rounded-md py-1">
          <p className="text-[10px] text-zinc-500 font-mono">Direct Award</p>
          <p className="text-xs font-mono font-semibold" style={{ color: admin.color }}>
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
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-[0.15em]">{label}</p>
      <p className="text-base font-bold font-mono" style={{ color }}>
        {value}
      </p>
      <p className="text-[11px] text-zinc-400">{note}</p>
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
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
          RUBLI v0.6.5 · Procurement Governance
        </p>
        <h2 className="text-base font-bold text-zinc-100 font-mono tracking-tight">
          {t('fingerprints.title')}
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
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
          color="#ea580c"
        />
        <InsightCard
          label={t('fingerprints.insight_highest_da')}
          value="AMLO -- 79.5%"
          note="Highest share of contracts awarded without competition"
          color="#8b5cf6"
        />
        <InsightCard
          label={t('fingerprints.insight_biggest_spender')}
          value="Pena Nieto -- 3.08T MXN"
          note="Largest total procurement value across a single administration"
          color="#ea580c"
        />
      </div>
    </div>
  )
}
