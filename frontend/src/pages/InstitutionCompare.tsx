/**
 * InstitutionCompare — side-by-side institution comparison with radar overlay
 * Route: /institutions/compare?a=INSTITUTION_ID&b=INSTITUTION_ID
 */
import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from '@/components/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RiskLevelPill } from '@/components/ui/RiskLevelPill'
import { institutionApi } from '@/api/client'
import type { InstitutionDetailResponse } from '@/api/types'
import { getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatPercentSafe, formatNumber, toTitleCase, cn } from '@/lib/utils'
import { ArrowLeft, AlertCircle, Scale, Search, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InstitutionLogoBanner } from '@/components/InstitutionBadge'

// ============================================================================
// Radar axis definitions — 6 key procurement dimensions
// ============================================================================
interface RadarMetric {
  key: keyof InstitutionDetailResponse
  label: string
  higherIsBad: boolean
}

const RADAR_METRICS: RadarMetric[] = [
  { key: 'total_contracts', label: 'Contracts', higherIsBad: false },
  { key: 'total_amount_mxn', label: 'Total Value', higherIsBad: false },
  { key: 'avg_risk_score', label: 'Avg Risk Score', higherIsBad: true },
  { key: 'direct_award_pct', label: 'Direct Award %', higherIsBad: true },
  { key: 'single_bid_pct', label: 'Single Bid %', higherIsBad: true },
  { key: 'high_risk_pct', label: 'High Risk %', higherIsBad: true },
]

function normalizeRelative(a: number, b: number): [number, number] {
  const max = Math.max(a, b)
  if (max === 0) return [0, 0]
  return [a / max, b / max]
}

function buildRadarData(instA: InstitutionDetailResponse, instB: InstitutionDetailResponse) {
  return RADAR_METRICS.map((m) => {
    const rawA = (instA[m.key] as number | undefined) ?? 0
    const rawB = (instB[m.key] as number | undefined) ?? 0
    const [normA, normB] = normalizeRelative(rawA, rawB)
    return {
      factor: m.label,
      instA: Math.round(normA * 100) / 100,
      instB: Math.round(normB * 100) / 100,
    }
  })
}

// ============================================================================
// Metric comparison table
// ============================================================================
interface MetricDef {
  label: string
  getValue: (i: InstitutionDetailResponse) => number | null
  format: (n: number) => string
  higherIsBad: boolean
}

const METRICS: MetricDef[] = [
  {
    label: 'Total Contracts',
    getValue: (i) => i.total_contracts ?? null,
    format: (n) => formatNumber(n),
    higherIsBad: false,
  },
  {
    label: 'Total Value',
    getValue: (i) => i.total_amount_mxn ?? null,
    format: (n) => formatCompactMXN(n),
    higherIsBad: false,
  },
  {
    label: 'Avg Risk Score',
    getValue: (i) => i.avg_risk_score ?? null,
    format: (n) => `${(n * 100).toFixed(1)}%`,
    higherIsBad: true,
  },
  {
    label: 'Direct Award %',
    getValue: (i) => i.direct_award_pct ?? null,
    format: (n) => formatPercentSafe(n),
    higherIsBad: true,
  },
  {
    label: 'Single Bid %',
    getValue: (i) => i.single_bid_pct ?? null,
    format: (n) => formatPercentSafe(n),
    higherIsBad: true,
  },
  {
    label: 'High Risk %',
    getValue: (i) => i.high_risk_pct ?? null,
    format: (n) => formatPercentSafe(n),
    higherIsBad: true,
  },
  {
    label: 'Vendor Count',
    getValue: (i) => i.vendor_count ?? null,
    format: (n) => formatNumber(n),
    higherIsBad: false,
  },
]

// ============================================================================
// Subcomponents
// ============================================================================

function InstitutionCard({
  institution,
  color,
  label,
}: {
  institution: InstitutionDetailResponse
  color: string
  label: string
}) {
  const riskScore = institution.avg_risk_score ?? institution.risk_baseline ?? 0
  const riskLevel = getRiskLevelFromScore(riskScore)

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className="text-[10px] font-bold tracking-widest uppercase font-mono mb-1 block"
              style={{ color }}
            >
              {label}
            </span>
            <InstitutionLogoBanner name={institution.name} height={28} className="mb-1" />
            <CardTitle className="text-base leading-snug">
              {toTitleCase(institution.name)}
            </CardTitle>
            {institution.siglas && (
              <p className="text-xs text-text-muted font-mono mt-0.5">{institution.siglas}</p>
            )}
            {institution.institution_type && (
              <p className="text-xs text-text-muted mt-0.5 capitalize">
                {institution.institution_type.replace(/_/g, ' ')}
              </p>
            )}
          </div>
          <RiskLevelPill level={riskLevel} score={riskScore} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div>
            <p className="text-text-muted font-mono">Contracts</p>
            <p className="font-bold text-text-primary">
              {formatNumber(institution.total_contracts ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-text-muted font-mono">Total Value</p>
            <p className="font-bold text-text-primary">
              {formatCompactMXN(institution.total_amount_mxn ?? 0)}
            </p>
          </div>
          {institution.direct_award_pct != null && (
            <div>
              <p className="text-text-muted font-mono">Direct Award</p>
              <p className="font-bold text-text-primary">{formatPercentSafe(institution.direct_award_pct)}</p>
            </div>
          )}
          {institution.single_bid_pct != null && (
            <div>
              <p className="text-text-muted font-mono">Single Bid</p>
              <p className="font-bold text-text-primary">{formatPercentSafe(institution.single_bid_pct)}</p>
            </div>
          )}
        </div>
        <Link
          to={`/institutions/${institution.id}`}
          className="text-xs text-accent hover:underline flex items-center gap-1"
          aria-label={`View full profile for ${institution.name}`}
        >
          View full profile
        </Link>
      </CardContent>
    </Card>
  )
}

function ComparisonRadar({
  radarData,
  aName,
  bName,
  aColor,
  bColor,
}: {
  radarData: ReturnType<typeof buildRadarData>
  aName: string
  bName: string
  aColor: string
  bColor: string
}) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const d = payload[0].payload as (typeof radarData)[0]
              return (
                <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold text-text-primary mb-1">{d.factor}</p>
                  <p style={{ color: aColor }}>
                    {aName.slice(0, 22)}: {(d.instA * 100).toFixed(0)}%
                  </p>
                  <p style={{ color: bColor }}>
                    {bName.slice(0, 22)}: {(d.instB * 100).toFixed(0)}%
                  </p>
                  <p className="text-text-muted mt-1 text-[10px]">Normalized relative to each other</p>
                </div>
              )
            }}
          />
          <Radar
            dataKey="instA"
            name={aName}
            stroke={aColor}
            fill={aColor}
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Radar
            dataKey="instB"
            name={bName}
            stroke={bColor}
            fill={bColor}
            fillOpacity={0.10}
            strokeWidth={2}
            strokeDasharray="5 3"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function DeltaCell({
  valueA,
  valueB,
  higherIsBad,
}: {
  valueA: number | null
  valueB: number | null
  higherIsBad: boolean
}) {
  if (valueA === null || valueB === null) {
    return <td className="px-3 py-2 text-center text-text-muted text-xs">—</td>
  }
  const delta = valueB - valueA
  if (Math.abs(delta) < 0.001 && Math.abs(delta) < 1) {
    return <td className="px-3 py-2 text-center text-text-muted text-xs">Equal</td>
  }
  const bIsWorse = higherIsBad ? delta > 0 : delta < 0
  const sign = delta > 0 ? '+' : ''
  const pct = valueA !== 0 ? `(${sign}${((delta / Math.abs(valueA)) * 100).toFixed(0)}%)` : ''

  return (
    <td
      className={cn(
        'px-3 py-2 text-center text-xs font-mono',
        bIsWorse ? 'text-red-400' : 'text-emerald-400',
      )}
      aria-label={`Delta: ${sign}${delta.toFixed(1)} ${pct}`}
    >
      {sign}
      {Math.abs(delta) >= 1000 ? formatCompactMXN(delta) : delta.toFixed(1)}
      {pct && <span className="ml-1 opacity-60">{pct}</span>}
    </td>
  )
}

function MetricTable({
  instA,
  instB,
  aName,
  bName,
}: {
  instA: InstitutionDetailResponse
  instB: InstitutionDetailResponse
  aName: string
  bName: string
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm" aria-label="Institution metric comparison">
        <thead>
          <tr className="border-b border-border bg-background-card">
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted">Metric</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">
              {aName.slice(0, 22)}
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-violet-400">
              {bName.slice(0, 22)}
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-text-muted">Delta</th>
          </tr>
        </thead>
        <tbody>
          {METRICS.map((m) => {
            const vA = m.getValue(instA)
            const vB = m.getValue(instB)
            return (
              <tr
                key={m.label}
                className="border-b border-border/40 hover:bg-sidebar-hover/30 transition-colors"
              >
                <td className="px-3 py-2 text-xs text-text-secondary font-medium">{m.label}</td>
                <td className="px-3 py-2 text-center text-xs font-mono text-text-primary">
                  {vA !== null ? m.format(vA) : '—'}
                </td>
                <td className="px-3 py-2 text-center text-xs font-mono text-text-primary">
                  {vB !== null ? m.format(vB) : '—'}
                </td>
                <DeltaCell valueA={vA} valueB={vB} higherIsBad={m.higherIsBad} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// Institution picker — shown when no institutions are selected
// ============================================================================
function InstitutionPicker() {
  const [queryA, setQueryA] = useState('')
  const [queryB, setQueryB] = useState('')
  const navigate = useNavigate()

  const { data: resultsA } = useQuery({
    queryKey: ['institution-search', queryA],
    queryFn: () => institutionApi.search(queryA, 5),
    enabled: queryA.length >= 2,
    staleTime: 30 * 1000,
  })

  const { data: resultsB } = useQuery({
    queryKey: ['institution-search', queryB],
    queryFn: () => institutionApi.search(queryB, 5),
    enabled: queryB.length >= 2,
    staleTime: 30 * 1000,
  })

  const [selectedA, setSelectedA] = useState<number | null>(null)
  const [selectedB, setSelectedB] = useState<number | null>(null)

  const handleCompare = () => {
    if (selectedA && selectedB && selectedA !== selectedB) {
      navigate(`/institutions/compare?a=${selectedA}&b=${selectedB}`)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <Scale className="h-12 w-12 mx-auto text-accent/40 mb-4" />
        <h2 className="text-xl font-semibold text-text-primary mb-2">Compare Institutions</h2>
        <p className="text-sm text-text-muted max-w-sm">
          Select two institutions to compare their procurement profiles, risk scores, and spending
          patterns side by side.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-start gap-4 w-full max-w-2xl">
        {/* Institution A picker */}
        <div className="flex-1 relative">
          <label htmlFor="inst-a-search" className="block text-xs font-medium text-text-muted mb-1">
            Institution A
          </label>
          <div className="flex items-center gap-2 border border-border rounded-md bg-background-card px-3 py-2">
            <Search className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
            <input
              id="inst-a-search"
              type="text"
              placeholder="Search by name..."
              value={queryA}
              onChange={(e) => {
                setQueryA(e.target.value)
                setSelectedA(null)
              }}
              className="bg-transparent text-sm text-text-primary placeholder:text-text-muted/50 outline-none w-full"
              aria-label="Search institution A"
              autoComplete="off"
            />
          </div>
          {resultsA && resultsA.data.length > 0 && !selectedA && queryA.length >= 2 && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background-card shadow-lg max-h-48 overflow-y-auto">
              {resultsA.data.map((inst) => (
                <li key={inst.id}>
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover:bg-sidebar-hover/50 transition-colors"
                    onClick={() => {
                      setQueryA(toTitleCase(inst.name))
                      setSelectedA(inst.id)
                    }}
                  >
                    <span className="font-medium text-text-primary">{toTitleCase(inst.name)}</span>
                    {inst.siglas && (
                      <span className="ml-2 text-text-muted font-mono">{inst.siglas}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedA && (
            <p className="text-xs text-accent mt-1 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              ID {selectedA} selected
            </p>
          )}
        </div>

        {/* Institution B picker */}
        <div className="flex-1 relative">
          <label htmlFor="inst-b-search" className="block text-xs font-medium text-text-muted mb-1">
            Institution B
          </label>
          <div className="flex items-center gap-2 border border-border rounded-md bg-background-card px-3 py-2">
            <Search className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
            <input
              id="inst-b-search"
              type="text"
              placeholder="Search by name..."
              value={queryB}
              onChange={(e) => {
                setQueryB(e.target.value)
                setSelectedB(null)
              }}
              className="bg-transparent text-sm text-text-primary placeholder:text-text-muted/50 outline-none w-full"
              aria-label="Search institution B"
              autoComplete="off"
            />
          </div>
          {resultsB && resultsB.data.length > 0 && !selectedB && queryB.length >= 2 && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-background-card shadow-lg max-h-48 overflow-y-auto">
              {resultsB.data.map((inst) => (
                <li key={inst.id}>
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover:bg-sidebar-hover/50 transition-colors"
                    onClick={() => {
                      setQueryB(toTitleCase(inst.name))
                      setSelectedB(inst.id)
                    }}
                  >
                    <span className="font-medium text-text-primary">{toTitleCase(inst.name)}</span>
                    {inst.siglas && (
                      <span className="ml-2 text-text-muted font-mono">{inst.siglas}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedB && (
            <p className="text-xs text-accent mt-1 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              ID {selectedB} selected
            </p>
          )}
        </div>

        <div className="sm:mt-5">
          <Button
            onClick={handleCompare}
            disabled={!selectedA || !selectedB || selectedA === selectedB}
            className="w-full sm:w-auto"
            aria-label="Compare institutions"
          >
            Compare
          </Button>
        </div>
      </div>
      <p className="text-xs text-text-muted/60">
        Or navigate to an institution profile and click "Compare"
      </p>
    </div>
  )
}

// ============================================================================
// Main page component
// ============================================================================
export default function InstitutionCompare() {
  const [searchParams] = useSearchParams()
  const idA = searchParams.get('a')
  const idB = searchParams.get('b')

  const numA = idA ? parseInt(idA, 10) : null
  const numB = idB ? parseInt(idB, 10) : null
  const hasIds = numA !== null && !isNaN(numA) && numB !== null && !isNaN(numB)

  const {
    data: instA,
    isLoading: loadingA,
    error: errorA,
  } = useQuery({
    queryKey: ['institution', numA],
    queryFn: () => institutionApi.getById(numA!),
    enabled: hasIds,
  })

  const {
    data: instB,
    isLoading: loadingB,
    error: errorB,
  } = useQuery({
    queryKey: ['institution', numB],
    queryFn: () => institutionApi.getById(numB!),
    enabled: hasIds,
  })

  const radarData = useMemo(
    () => (instA && instB ? buildRadarData(instA, instB) : []),
    [instA, instB],
  )

  const isLoading = loadingA || loadingB
  const hasError = errorA || errorB

  if (!hasIds) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Link
            to="/institutions/health"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
            aria-label="Back to Institutions"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Institutions
          </Link>
          <h1 className="text-2xl font-bold text-text-primary mt-2">Compare Institutions</h1>
          <p className="text-sm text-text-muted mt-1">
            Select two institutions to compare their procurement risk profiles
          </p>
        </div>
        <InstitutionPicker />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/institutions/health"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
          aria-label="Back to Institutions"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Institutions
        </Link>
        <h1 className="text-2xl font-bold text-text-primary mt-2">Compare Institutions</h1>
        <p className="text-sm text-text-muted mt-1">
          Side-by-side procurement risk comparison
        </p>
      </div>

      {/* Error state */}
      {hasError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2 mb-6">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Failed to load institutions</p>
            <p className="text-xs text-text-muted mt-0.5">
              Check the institution IDs and try again.
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : instA && instB ? (
        <>
          {/* Institution Cards */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
            role="region"
            aria-label="Institution summary cards"
          >
            <InstitutionCard institution={instA} color="#06b6d4" label="Institution A" />
            <InstitutionCard institution={instB} color="#a78bfa" label="Institution B" />
          </div>

          {/* Radar Comparison */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-sm">Risk Profile Comparison</CardTitle>
              <p className="text-xs text-text-muted">
                6-axis normalized comparison. Values are relative — 100% means the higher of the two.
                For risk metrics (direct award, single bid), higher is worse.
              </p>
            </CardHeader>
            <CardContent>
              <ComparisonRadar
                radarData={radarData}
                aName={toTitleCase(instA.name)}
                bName={toTitleCase(instB.name)}
                aColor="#06b6d4"
                bColor="#a78bfa"
              />
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-px w-6 bg-cyan-400 inline-block" />
                  <span className="text-xs text-text-muted">{toTitleCase(instA.name).slice(0, 25)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-px w-6 border-t-2 border-dashed border-violet-400 inline-block" />
                  <span className="text-xs text-text-muted">{toTitleCase(instB.name).slice(0, 25)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metric Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metric Breakdown</CardTitle>
              <p className="text-xs text-text-muted">
                Delta column shows difference from A to B. Red = B is riskier; green = B is safer.
              </p>
            </CardHeader>
            <CardContent>
              <MetricTable
                instA={instA}
                instB={instB}
                aName={toTitleCase(instA.name)}
                bName={toTitleCase(instB.name)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
