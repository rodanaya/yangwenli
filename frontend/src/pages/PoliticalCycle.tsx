/**
 * Political Cycle Intelligence
 *
 * Editorial analysis page showing how Mexican government procurement
 * patterns shift across the 6-year presidential term (sexenio).
 * Targets journalists and analysts studying structural corruption cycles.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, TrendingUp, Calendar, Activity } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Cell,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { cn, formatNumber } from '@/lib/utils'
import { analysisApi, storiesApi } from '@/api/client'
import type { PoliticalCycleResponse, AdminBreakdownResponse } from '@/api/types'

// =============================================================================
// Constants
// =============================================================================

const RISK_COLORS = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#fbbf24',
  low: '#4ade80',
} as const

const ADMIN_COLORS: Record<string, string> = {
  Fox: '#3b82f6',
  Calderón: '#22c55e',
  'Peña Nieto': '#ef4444',
  AMLO: '#a16207',
  Sheinbaum: '#14b8a6',
}

function getRiskColor(highRiskPct: number): string {
  if (highRiskPct >= 15) return RISK_COLORS.critical
  if (highRiskPct >= 12) return RISK_COLORS.high
  if (highRiskPct >= 10) return RISK_COLORS.medium
  return RISK_COLORS.low
}

function getAdminColor(eraName: string): string {
  const key = Object.keys(ADMIN_COLORS).find((k) => eraName.includes(k))
  return key ? ADMIN_COLORS[key] : '#64748b'
}

// =============================================================================
// Section: Loading / Error states
// =============================================================================

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-background-elevated/10 p-6 flex items-center gap-3 text-sm text-text-muted">
      <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
      {message}
    </div>
  )
}

// =============================================================================
// Section 1: Key Finding callout box
// =============================================================================

function KeyFindingBox() {
  return (
    <div className="border-l-4 border-amber-500 bg-amber-500/5 rounded-r-lg px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold mb-2">
        Key Finding
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">
        Year 1 of a new administration sees the highest direct-award rates as incoming governments
        bypass competitive bidding to install preferred vendors quickly. Years 5–6 exhibit the
        highest risk scores — the "budget dump" effect as outgoing officials rush final spending.
        December contract spikes appear every year regardless of administration.
      </p>
    </div>
  )
}

// =============================================================================
// Section 2: Sexenio Year Breakdown
// =============================================================================

interface SexenioChartProps {
  data: PoliticalCycleResponse['sexenio_year_breakdown']
}

function SexenioYearSection({ data }: SexenioChartProps) {
  const chartData = useMemo(
    () =>
      data.map((r) => ({
        label: `Yr ${r.sexenio_year}`,
        fullLabel: r.label,
        high_risk_pct: +r.high_risk_pct.toFixed(2),
        direct_award_pct: +r.direct_award_pct.toFixed(2),
        single_bid_pct: +r.single_bid_pct.toFixed(2),
        contracts: r.contracts,
        avg_risk: +(r.avg_risk * 100).toFixed(3),
        sexenio_year: r.sexenio_year,
      })),
    [data],
  )

  const maxHighRisk = Math.max(...chartData.map((d) => d.high_risk_pct))

  // Summary stats for HallazgoStat row
  const yr1 = chartData[0]
  const yr6 = chartData[chartData.length - 1]
  const peakDa = [...chartData].sort((a, b) => b.direct_award_pct - a.direct_award_pct)[0]
  const peakRisk = [...chartData].sort((a, b) => b.high_risk_pct - a.high_risk_pct)[0]

  return (
    <section aria-labelledby="sexenio-heading" className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <h2
            id="sexenio-heading"
            className="text-xs uppercase tracking-[0.15em] text-text-muted font-bold"
          >
            Sexenio Year Analysis
          </h2>
        </div>
        <p className="text-sm text-text-secondary">
          How each year of the 6-year presidential term compares on procurement risk and
          procedure type — pooled across all administrations 2000–2024.
        </p>
      </div>

      {/* HallazgoStat mini-row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {yr1 && (
          <HallazgoStat
            value={`${yr1.direct_award_pct.toFixed(1)}%`}
            label="Direct awards — Year 1"
            annotation="New admin installs preferred vendors"
            color="border-blue-500"
          />
        )}
        {peakRisk && (
          <HallazgoStat
            value={`${peakRisk.high_risk_pct.toFixed(1)}%`}
            label={`Peak risk — ${peakRisk.fullLabel}`}
            annotation="Highest high-risk contract share"
            color="border-red-500"
          />
        )}
        {peakDa && (
          <HallazgoStat
            value={`${peakDa.direct_award_pct.toFixed(1)}%`}
            label={`Peak direct awards — ${peakDa.fullLabel}`}
            annotation="Bypasses competitive bidding"
            color="border-amber-500"
          />
        )}
        {yr6 && (
          <HallazgoStat
            value={`${yr6.high_risk_pct.toFixed(1)}%`}
            label="High-risk share — Year 6"
            annotation="Budget dump before transition"
            color="border-orange-500"
          />
        )}
      </div>

      {/* Dual-axis bar + line chart */}
      <div className="rounded-lg border border-border/40 bg-background-elevated/10 p-4">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 36, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
            />
            <YAxis
              yAxisId="risk"
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
              width={38}
              label={{
                value: 'High Risk %',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { fill: '#71717a', fontSize: 9, fontFamily: 'var(--font-family-mono)' },
              }}
            />
            <YAxis
              yAxisId="da"
              orientation="right"
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
              width={38}
              label={{
                value: 'Direct Award %',
                angle: 90,
                position: 'insideRight',
                offset: 10,
                style: { fill: '#71717a', fontSize: 9, fontFamily: 'var(--font-family-mono)' },
              }}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 8,
                fontSize: 11,
                fontFamily: 'var(--font-family-mono)',
                color: '#e4e4e7',
              }}
              formatter={(value: unknown, name?: string) =>
                [
                  typeof value === 'number' ? `${value.toFixed(2)}%` : String(value ?? ''),
                  name ?? '',
                ] as [string, string]
              }
              labelFormatter={(label: string, payload) => {
                const item = payload?.[0]?.payload as (typeof chartData)[0] | undefined
                if (!item) return label
                return `${item.fullLabel} · ${formatNumber(item.contracts)} contracts`
              }}
            />
            <Bar
              yAxisId="risk"
              dataKey="high_risk_pct"
              name="High-Risk %"
              radius={[3, 3, 0, 0]}
              maxBarSize={52}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.sexenio_year}
                  fill={
                    entry.high_risk_pct === maxHighRisk
                      ? RISK_COLORS.critical
                      : RISK_COLORS.high
                  }
                  opacity={entry.high_risk_pct === maxHighRisk ? 0.95 : 0.65}
                />
              ))}
            </Bar>
            <Line
              yAxisId="da"
              type="monotone"
              dataKey="direct_award_pct"
              name="Direct Award %"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-mono text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-orange-400 inline-block" />
            High-risk % (left axis)
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-5 inline-block rounded"
              style={{ backgroundColor: '#3b82f6' }}
            />
            Direct award % (right axis)
          </span>
          <span className="ml-auto">
            Peak bar highlighted. Year 1 = first year of administration.
          </span>
        </div>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border border-border/40">
        <table className="w-full text-xs font-mono" aria-label="Sexenio year breakdown table">
          <thead>
            <tr className="border-b border-border/40 text-text-muted text-[10px] uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left font-semibold">Year</th>
              <th className="px-4 py-2.5 text-right font-semibold">Contracts</th>
              <th className="px-4 py-2.5 text-right font-semibold">Avg Risk</th>
              <th className="px-4 py-2.5 text-right font-semibold">High-Risk %</th>
              <th className="px-4 py-2.5 text-right font-semibold">Direct Award %</th>
              <th className="px-4 py-2.5 text-right font-semibold">Single Bid %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const riskColor = getRiskColor(row.high_risk_pct)
              return (
                <tr
                  key={row.sexenio_year}
                  className="border-b border-border/20 hover:bg-background-elevated/10 transition-colors"
                >
                  <td className="px-4 py-2 text-left font-medium text-text-primary">
                    {row.label}
                  </td>
                  <td className="px-4 py-2 text-right text-text-secondary">
                    {formatNumber(row.contracts)}
                  </td>
                  <td className="px-4 py-2 text-right text-text-secondary">
                    {(row.avg_risk * 100).toFixed(2)}%
                  </td>
                  <td
                    className="px-4 py-2 text-right font-semibold"
                    style={{ color: riskColor }}
                  >
                    {row.high_risk_pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-right text-blue-400">
                    {row.direct_award_pct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-right text-text-muted">
                    {row.single_bid_pct.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// =============================================================================
// Section 3: Election Year Effect
// =============================================================================

interface ElectionEffectProps {
  effect: PoliticalCycleResponse['election_year_effect']
}

function ElectionYearSection({ effect }: ElectionEffectProps) {
  const elYear = effect.election_year
  const nonElYear = effect.non_election_year
  const delta = effect.risk_delta ?? 0
  const deltaPct = effect.risk_delta_pct ?? 0

  return (
    <section aria-labelledby="election-heading" className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <h2
            id="election-heading"
            className="text-xs uppercase tracking-[0.15em] text-text-muted font-bold"
          >
            Election Year Effect
          </h2>
        </div>
        <p className="text-sm text-text-secondary">
          Average procurement risk in federal election years vs non-election years (2002–2025).
          Mexican federal elections occur every 6 years for the presidency.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Election years */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold">
            Election Years
          </div>
          <div
            className="text-4xl font-bold font-mono leading-none"
            style={{ color: RISK_COLORS.high }}
          >
            {((elYear?.avg_risk ?? 0) * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-text-muted">avg risk score</div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-text-muted">High-Risk</span>
              <span className="text-text-secondary">{(elYear?.high_risk_pct ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Direct Award</span>
              <span className="text-blue-400">{(elYear?.direct_award_pct ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Single Bid</span>
              <span className="text-text-secondary">{(elYear?.single_bid_pct ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between border-t border-border/30 pt-1 mt-1">
              <span className="text-text-muted">Contracts</span>
              <span className="text-text-muted">{formatNumber(elYear?.contracts ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Non-election years */}
        <div className="rounded-lg border border-border/40 bg-background-elevated/10 p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">
            Non-Election Years
          </div>
          <div
            className="text-4xl font-bold font-mono leading-none"
            style={{ color: RISK_COLORS.low }}
          >
            {((nonElYear?.avg_risk ?? 0) * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-text-muted">avg risk score</div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-text-muted">High-Risk</span>
              <span className="text-text-secondary">{(nonElYear?.high_risk_pct ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Direct Award</span>
              <span className="text-blue-400">{(nonElYear?.direct_award_pct ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Single Bid</span>
              <span className="text-text-secondary">{(nonElYear?.single_bid_pct ?? 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between border-t border-border/30 pt-1 mt-1">
              <span className="text-text-muted">Contracts</span>
              <span className="text-text-muted">{formatNumber(nonElYear?.contracts ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Delta */}
        <div
          className={cn(
            'rounded-lg border p-5 space-y-3',
            delta > 0
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-emerald-500/30 bg-emerald-500/5',
          )}
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold">
            Risk Delta
          </div>
          <div
            className="text-4xl font-bold font-mono leading-none"
            style={{ color: delta > 0 ? RISK_COLORS.high : RISK_COLORS.low }}
          >
            {delta > 0 ? '+' : ''}
            {(delta * 100).toFixed(3)}pp
          </div>
          <div className="text-xs text-text-muted">election minus non-election</div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-text-muted">Relative change</span>
              <span
                style={{ color: delta > 0 ? RISK_COLORS.high : RISK_COLORS.low }}
                className="font-semibold"
              >
                {deltaPct > 0 ? '+' : ''}
                {deltaPct.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-[11px] text-text-muted leading-snug">
            {delta > 0
              ? 'Election years show measurably higher procurement risk, consistent with political spending pressure.'
              : delta < 0
              ? 'Non-election years show higher procurement risk — election-year scrutiny may suppress fraud.'
              : 'No significant difference between election and non-election year risk.'}
          </p>
        </div>
      </div>
    </section>
  )
}

// =============================================================================
// Section 4: Administration Comparison
// =============================================================================

interface AdminComparisonProps {
  data: AdminBreakdownResponse
}

function AdminComparisonSection({ data }: AdminComparisonProps) {
  const chartData = useMemo(
    () =>
      data.eras.map((era) => ({
        name: era.era,
        high_risk_pct: +(((era.gt_case_count ?? 0) / Math.max(1, 300)) * 100).toFixed(1),
        gt_cases: era.gt_case_count,
        dec_spike: +era.dec_spike_pct.toFixed(1),
        hhi: +era.hhi.toFixed(4),
        est_fraud_mxn: era.est_fraud_mxn,
      })),
    [data.eras],
  )

  return (
    <section aria-labelledby="admin-heading" className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <h2
            id="admin-heading"
            className="text-xs uppercase tracking-[0.15em] text-text-muted font-bold"
          >
            Presidential Accountability
          </h2>
        </div>
        <p className="text-sm text-text-secondary">
          Key procurement metrics by administration — Fox, Calderón, Peña Nieto, AMLO, Sheinbaum.
          Documented corruption cases and vendor concentration (HHI) by era.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/40">
        <table
          className="w-full text-xs font-mono"
          aria-label="Administration comparison table"
        >
          <thead>
            <tr className="border-b border-border/40 text-text-muted text-[10px] uppercase tracking-wider bg-background-elevated/10">
              <th className="px-4 py-3 text-left font-semibold">Administration</th>
              <th className="px-4 py-3 text-right font-semibold">Period</th>
              <th className="px-4 py-3 text-right font-semibold">GT Cases</th>
              <th className="px-4 py-3 text-right font-semibold">Est. Fraud (MXN)</th>
              <th className="px-4 py-3 text-right font-semibold">Vendor HHI</th>
              <th className="px-4 py-3 text-right font-semibold">Dec Spike %</th>
            </tr>
          </thead>
          <tbody>
            {data.eras.map((era) => {
              const color = getAdminColor(era.era)
              const fraudBillions =
                era.est_fraud_mxn > 1e9
                  ? `${(era.est_fraud_mxn / 1e9).toFixed(1)}B`
                  : era.est_fraud_mxn > 1e6
                  ? `${(era.est_fraud_mxn / 1e6).toFixed(0)}M`
                  : '—'
              return (
                <tr
                  key={era.era}
                  className="border-b border-border/20 hover:bg-background-elevated/10 transition-colors"
                >
                  <td className="px-4 py-3 text-left">
                    <span
                      className="font-semibold"
                      style={{ color }}
                    >
                      {era.era}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    {era.year_start}–{era.year_end}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'font-semibold',
                        era.gt_case_count > 5
                          ? 'text-red-400'
                          : era.gt_case_count > 2
                          ? 'text-amber-400'
                          : 'text-text-secondary',
                      )}
                    >
                      {era.gt_case_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">{fraudBillions}</td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    {era.hhi.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-400">
                    {era.dec_spike_pct.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Horizontal bar chart — GT cases by admin */}
      <div className="rounded-lg border border-border/40 bg-background-elevated/10 p-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-text-muted font-bold mb-3">
          Documented Corruption Cases by Administration
        </p>
        <ResponsiveContainer width="100%" height={Math.max(120, data.eras.length * 44)}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 48, bottom: 4, left: 80 }}
          >
            <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'var(--font-family-mono)' }}
              tickFormatter={(v: number) => String(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'var(--font-family-mono)' }}
              width={76}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 8,
                fontSize: 11,
                fontFamily: 'var(--font-family-mono)',
                color: '#e4e4e7',
              }}
              formatter={(value: unknown, name?: string) =>
                [String(value ?? ''), name ?? ''] as [string, string]
              }
            />
            <Bar dataKey="gt_cases" name="GT Cases" radius={[0, 3, 3, 0]} maxBarSize={24}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={getAdminColor(entry.name)} opacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] font-mono text-text-muted mt-2">
          GT = Ground truth cases in RUBLI database. Higher counts reflect both more corruption
          and more documented evidence — not necessarily a higher absolute rate.
        </p>
      </div>
    </section>
  )
}

// =============================================================================
// Main Page
// =============================================================================

export default function PoliticalCycle() {
  const {
    data: cycleData,
    isLoading: cycleLoading,
    isError: cycleError,
  } = useQuery<PoliticalCycleResponse>({
    queryKey: ['political-cycle'],
    queryFn: () => analysisApi.getPoliticalCycle(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  const {
    data: adminData,
    isLoading: adminLoading,
    isError: adminError,
  } = useQuery<AdminBreakdownResponse>({
    queryKey: ['admin-breakdown'],
    queryFn: () => storiesApi.getAdministrationComparison(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
      {/* Page header */}
      <EditorialHeadline
        section="Political Cycle Intelligence"
        headline="When Does Corruption Peak? Inside Mexico's 6-Year Procurement Cycle"
        subtitle="23 years of federal contracts reveal a structural pattern: the final year of every administration sees dramatically different procurement behavior — and it repeats across every president, every party."
      />

      {/* Key finding callout */}
      <KeyFindingBox />

      {/* Section 1 — Sexenio year breakdown */}
      {cycleLoading && <SectionSkeleton />}
      {cycleError && (
        <SectionError message="Sexenio year breakdown could not be loaded." />
      )}
      {cycleData && cycleData.sexenio_year_breakdown.length > 0 && (
        <SexenioYearSection data={cycleData.sexenio_year_breakdown} />
      )}

      {/* Section 2 — Election year effect */}
      {cycleLoading && <SectionSkeleton />}
      {cycleError && (
        <SectionError message="Election year effect data could not be loaded." />
      )}
      {cycleData && (
        <ElectionYearSection effect={cycleData.election_year_effect} />
      )}

      {/* Section 3 — Administration comparison */}
      {adminLoading && <SectionSkeleton />}
      {adminError && (
        <SectionError message="Administration comparison data could not be loaded." />
      )}
      {adminData && adminData.eras.length > 0 && (
        <AdminComparisonSection data={adminData} />
      )}

      {/* Methodology footer */}
      <footer className="border-t border-border/40 pt-6">
        <p className="text-[11px] text-text-muted leading-relaxed font-mono">
          <span className="text-text-secondary font-semibold uppercase tracking-wider">
            Methodology:{' '}
          </span>
          This analysis groups 3,059,592 contracts (2002–2025) by the year within each 6-year
          presidential term (sexenio). Year 1 = first calendar year of a new president.
          Risk scores from RUBLI v0.6.5 model (AUC 0.828, vendor-stratified test split).
          High-risk threshold: score &ge; 0.40. Direct award = non-competitive procurement
          procedure. Single bid = competitive procedure with only one bidder.
          Election year = year of federal presidential election (2000, 2006, 2012, 2018, 2024).
          GT cases = contracts matched to documented corruption cases in the RUBLI ground truth
          database (748 cases as of 2026-03-25). Vendor concentration HHI is computed per era
          across all sectors.
        </p>
      </footer>
    </div>
  )
}
