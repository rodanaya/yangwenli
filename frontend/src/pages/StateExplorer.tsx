/**
 * States Explorer
 *
 * Ranking and analysis of procurement risk across all 31 Mexican states
 * and federal entities. Uses the /subnational/states API endpoint.
 *
 * Editorial dark-mode design matching the rest of the RUBLI platform.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowUp, ArrowDown, ArrowUpDown, MapPin } from 'lucide-react'
import { subnationalApi } from '@/api/client'
import type { SubnationalStateSummary } from '@/api/types'
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactMXN, formatNumber, formatPercent } from '@/lib/utils'
import { getRiskLevelFromScore } from '@/lib/constants'
import { EditorialPageShell } from '@/components/layout/EditorialPageShell'
import { Act } from '@/components/layout/Act'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = 'avg_risk_score' | 'total_value_mxn' | 'contract_count' | 'direct_award_rate'
type SortDir = 'asc' | 'desc'

const RISK_STYLES: Record<string, string> = {
  critical: 'bg-red-900/30 text-red-400 border border-red-800/40',
  high:     'bg-orange-900/30 text-orange-400 border border-orange-800/40',
  medium:   'bg-yellow-900/30 text-yellow-400 border border-yellow-800/40',
  low:      'bg-green-900/30 text-green-400 border border-green-800/40',
}

const RISK_LABEL: Record<string, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
}

function getGrade(score: number): string {
  if (score < 0.20) return 'A'
  if (score < 0.25) return 'B'
  if (score < 0.30) return 'C'
  if (score < 0.35) return 'D'
  return 'F'
}

const GRADE_STYLES: Record<string, string> = {
  A: 'text-green-400',
  B: 'text-yellow-400',
  C: 'text-amber-400',
  D: 'text-orange-400',
  F: 'text-red-400',
}

// ---------------------------------------------------------------------------
// Sort icon helper
// ---------------------------------------------------------------------------

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="h-3 w-3 text-stone-600" />
  if (sortDir === 'desc') return <ArrowDown className="h-3 w-3 text-amber-400" />
  return <ArrowUp className="h-3 w-3 text-amber-400" />
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function StateExplorerSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StateExplorer() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('avg_risk_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const { data, isLoading, error } = useQuery({
    queryKey: ['subnational-states'],
    queryFn: () => subnationalApi.getStates(),
    staleTime: 10 * 60 * 1000,
  })

  const states: SubnationalStateSummary[] = data?.data ?? []

  // Derived headline stats
  const highestRisk = useMemo(() => {
    if (!states.length) return null
    return [...states].sort((a, b) => b.avg_risk_score - a.avg_risk_score)[0]
  }, [states])

  const lowestRisk = useMemo(() => {
    if (!states.length) return null
    return [...states].sort((a, b) => a.avg_risk_score - b.avg_risk_score)[0]
  }, [states])

  const totalValue = data?.total_value_mxn ?? 0

  // Search + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let result = q
      ? states.filter(s => s.state_name.toLowerCase().includes(q) || s.state_code.toLowerCase().includes(q))
      : [...states]

    result.sort((a, b) => {
      const valA = a[sortKey] as number
      const valB = b[sortKey] as number
      return sortDir === 'desc' ? valB - valA : valA - valB
    })
    return result
  }, [states, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (isLoading) return <StateExplorerSkeleton />

  if (error) {
    return (
      <div className="flex items-center gap-3 m-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
        <span className="text-destructive text-lg" aria-hidden="true">⚠</span>
        <p className="text-sm text-text-secondary">
          Failed to load state expenditure data. Please try again.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1714] text-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <EditorialPageShell
        kicker="STATE EXPLORER · GEOGRAPHIC DISTRIBUTION"
        headline={<>Mexico's 32 states, <em>one federal market.</em></>}
        paragraph="Geographic distribution of federal contracts reveals regional concentration patterns and variation in competition levels across Mexico's territory."
        severity="medium"
        loading={isLoading}
        stats={[
          {
            value: states.length > 0 ? formatNumber(states.length) : '—',
            label: 'states analyzed',
            color: '#94a3b8',
          },
          {
            value: highestRisk ? `${(highestRisk.avg_risk_score * 100).toFixed(1)}%` : '—',
            label: highestRisk ? `highest risk: ${highestRisk.state_name}` : 'highest risk',
            color: '#f87171',
          },
          {
            value: lowestRisk ? `${(lowestRisk.avg_risk_score * 100).toFixed(1)}%` : '—',
            label: lowestRisk ? `lowest risk: ${lowestRisk.state_name}` : 'lowest risk',
            color: '#4ade80',
          },
          {
            value: totalValue > 0 ? formatCompactMXN(totalValue) : '—',
            label: 'total value analyzed',
            color: '#fbbf24',
          },
        ]}
      >
        <Act number="I" label="THE MAP">
      <div className="space-y-8">

        {/* Header */}
        <EditorialHeadline
          section="Subnational Analysis"
          headline="Risk Rankings by State"
          subtitle="Procurement risk indicators across 31 Mexican states and federal entities, ranked by average risk score."
        />

        {/* Hallazgo stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-2">
          <HallazgoStat
            value={formatNumber(states.length)}
            label="States analyzed"
            color="border-stone-500"
          />
          <HallazgoStat
            value={highestRisk ? highestRisk.state_name : '—'}
            label={highestRisk ? `Highest risk — ${(highestRisk.avg_risk_score * 100).toFixed(1)}% avg` : 'Highest risk'}
            color="border-red-500"
          />
          <HallazgoStat
            value={lowestRisk ? lowestRisk.state_name : '—'}
            label={lowestRisk ? `Lowest risk — ${(lowestRisk.avg_risk_score * 100).toFixed(1)}% avg` : 'Lowest risk'}
            color="border-green-500"
          />
          <HallazgoStat
            value={formatCompactMXN(totalValue)}
            label="Total value analyzed"
            color="border-amber-500"
          />
        </div>

        {/* Search + sort controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
            <input
              type="text"
              placeholder="Search by state name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-stone-900 border border-stone-700 rounded-md pl-9 pr-3 py-2 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-600/60 focus:ring-1 focus:ring-amber-600/30"
              aria-label="Search states"
            />
          </div>

          <div className="flex gap-2 flex-wrap text-xs font-mono">
            <span className="text-stone-500 self-center">Sort:</span>
            {(
              [
                { key: 'avg_risk_score', label: 'Risk Score' },
                { key: 'total_value_mxn', label: 'Total Value' },
                { key: 'contract_count', label: 'Contracts' },
                { key: 'direct_award_rate', label: 'DA Rate' },
              ] as { key: SortKey; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className={`px-3 py-1.5 rounded border transition-colors ${
                  sortKey === key
                    ? 'border-amber-600/60 bg-amber-600/10 text-amber-400'
                    : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-600 hover:text-stone-300'
                }`}
                aria-pressed={sortKey === key}
              >
                {label}
                {sortKey === key && (
                  <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-stone-500 font-mono -mt-4">
          {filtered.length} of {states.length} states
        </p>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-stone-800">
          <table className="w-full text-sm" role="table" aria-label="State risk rankings">
            <thead>
              <tr className="border-b border-stone-800 bg-stone-900/60">
                <th className="text-left px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-stone-500 w-12">
                  #
                </th>
                <th className="text-left px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-stone-500">
                  State
                </th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-stone-500 text-right">
                  <button
                    onClick={() => toggleSort('avg_risk_score')}
                    className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors"
                    aria-label="Sort by risk score"
                  >
                    Avg Risk
                    <SortIcon col="avg_risk_score" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-stone-500 text-right hidden md:table-cell">
                  <button
                    onClick={() => toggleSort('total_value_mxn')}
                    className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors"
                    aria-label="Sort by total value"
                  >
                    Total Value
                    <SortIcon col="total_value_mxn" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-stone-500 text-right hidden lg:table-cell">
                  <button
                    onClick={() => toggleSort('contract_count')}
                    className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors"
                    aria-label="Sort by contracts"
                  >
                    Contracts
                    <SortIcon col="contract_count" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-stone-500 text-right hidden lg:table-cell">
                  Institutions
                </th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-stone-500 text-right hidden xl:table-cell">
                  <button
                    onClick={() => toggleSort('direct_award_rate')}
                    className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors"
                    aria-label="Sort by direct award rate"
                  >
                    DA Rate
                    <SortIcon col="direct_award_rate" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-stone-500 text-center">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((state, idx) => {
                const risk = getRiskLevelFromScore(state.avg_risk_score)
                const grade = getGrade(state.avg_risk_score)
                return (
                  <tr
                    key={state.state_code}
                    onClick={() => navigate(`/states/${state.state_code}`)}
                    className="border-b border-stone-800/60 hover:bg-stone-800/40 cursor-pointer transition-colors group"
                    role="row"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/states/${state.state_code}`)
                      }
                    }}
                    aria-label={`${state.state_name}, risk grade ${grade}`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 text-xs font-mono text-stone-600 tabular-nums">
                      {idx + 1}
                    </td>

                    {/* State name + code */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-3.5 w-3.5 text-stone-600 flex-shrink-0 group-hover:text-amber-500 transition-colors" />
                        <div>
                          <span className="font-medium text-stone-200 group-hover:text-amber-400 transition-colors">
                            {state.state_name}
                          </span>
                          <span className="ml-2 text-[10px] font-mono text-stone-600">
                            {state.state_code}
                          </span>
                          {state.top_institution && (
                            <p className="text-[10px] text-stone-600 mt-0.5 truncate max-w-[220px]">
                              {state.top_institution}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Avg risk */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-mono text-stone-400 tabular-nums">
                          {(state.avg_risk_score * 100).toFixed(1)}%
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide ${RISK_STYLES[risk]}`}
                        >
                          {RISK_LABEL[risk]}
                        </span>
                      </div>
                    </td>

                    {/* Total value */}
                    <td className="px-4 py-3 text-right font-mono text-xs text-stone-400 tabular-nums hidden md:table-cell">
                      {formatCompactMXN(state.total_value_mxn)}
                    </td>

                    {/* Contracts */}
                    <td className="px-4 py-3 text-right font-mono text-xs text-stone-400 tabular-nums hidden lg:table-cell">
                      {formatNumber(state.contract_count)}
                    </td>

                    {/* Institutions */}
                    <td className="px-4 py-3 text-right font-mono text-xs text-stone-400 tabular-nums hidden lg:table-cell">
                      {formatNumber(state.institution_count)}
                    </td>

                    {/* DA Rate */}
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums hidden xl:table-cell">
                      <span
                        className={
                          state.direct_award_rate > 0.70
                            ? 'text-red-400'
                            : state.direct_award_rate > 0.50
                            ? 'text-orange-400'
                            : 'text-stone-400'
                        }
                      >
                        {formatPercent(state.direct_award_rate)}
                      </span>
                    </td>

                    {/* Grade */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-lg font-bold font-mono tabular-nums ${GRADE_STYLES[grade] ?? 'text-stone-400'}`}
                        aria-label={`Grade ${grade}`}
                      >
                        {grade}
                      </span>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-600 text-sm">
                    No states match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-[10px] font-mono text-stone-600 pb-4">
          <span className="font-bold uppercase tracking-wide">Grade:</span>
          {(['A', 'B', 'C', 'D', 'F'] as const).map(g => (
            <span key={g} className={`${GRADE_STYLES[g]}`}>
              {g} — avg risk{' '}
              {g === 'A' ? '< 20%' : g === 'B' ? '20–25%' : g === 'C' ? '25–30%' : g === 'D' ? '30–35%' : '≥ 35%'}
            </span>
          ))}
          <span className="ml-4">DA = Direct Award Rate</span>
        </div>
      </div>
        </Act>
      </EditorialPageShell>
      </div>
    </div>
  )
}
