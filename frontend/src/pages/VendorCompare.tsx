/**
 * VendorCompare — side-by-side vendor comparison with radar overlay
 * Route: /vendors/compare?a=VENDOR_ID&b=VENDOR_ID
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
import { vendorApi } from '@/api/client'
import type { VendorDetailResponse, VendorWaterfallContribution } from '@/api/types'
import { getRiskLevelFromScore } from '@/lib/constants'
import { formatCompactMXN, formatPercentSafe, formatNumber, toTitleCase, cn } from '@/lib/utils'
import { ArrowLeft, AlertCircle, Scale, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// Radar axis definitions — 6 key risk dimensions (same as VendorProfile)
// ============================================================================
const RADAR_KEYS = [
  { key: 'price_volatility', label: 'Price Volatility' },
  { key: 'vendor_concentration', label: 'Concentration' },
  { key: 'win_rate', label: 'Win Rate' },
  { key: 'direct_award', label: 'Direct Award' },
  { key: 'industry_mismatch', label: 'Sector Mismatch' },
  { key: 'single_bid', label: 'Single Bid' },
]

function buildRadarData(waterfall: VendorWaterfallContribution[]) {
  const lookup = new Map<string, VendorWaterfallContribution>()
  for (const item of waterfall) {
    lookup.set(item.feature, item)
  }
  return RADAR_KEYS.map(({ key, label }) => {
    const item = lookup.get(key)
    const rawZ = item?.z_score ?? 0
    const clampedZ = Math.max(-3, Math.min(3, rawZ))
    const value = Math.round(((clampedZ + 3) / 6) * 100) / 100
    return { factor: label, value, rawZ }
  })
}

// ============================================================================
// Metric comparison row data
// ============================================================================
interface MetricDef {
  label: string
  getValue: (v: VendorDetailResponse) => number | null
  format: (n: number) => string
  higherIsBad: boolean  // true = higher value = worse risk
}

const METRICS: MetricDef[] = [
  {
    label: 'Total Contracts',
    getValue: (v) => v.total_contracts,
    format: (n) => formatNumber(n),
    higherIsBad: false,
  },
  {
    label: 'Total Value',
    getValue: (v) => v.total_value_mxn,
    format: (n) => formatCompactMXN(n),
    higherIsBad: false,
  },
  {
    label: 'Avg Risk Score',
    getValue: (v) => v.avg_risk_score ?? null,
    format: (n) => `${(n * 100).toFixed(1)}%`,
    higherIsBad: true,
  },
  {
    label: 'Direct Award %',
    getValue: (v) => v.direct_award_pct,
    format: (n) => formatPercentSafe(n),
    higherIsBad: true,
  },
  {
    label: 'Single Bid %',
    getValue: (v) => v.single_bid_pct,
    format: (n) => formatPercentSafe(n),
    higherIsBad: true,
  },
  {
    label: 'High Risk Contracts',
    getValue: (v) => v.high_risk_count,
    format: (n) => formatNumber(n),
    higherIsBad: true,
  },
  {
    label: 'Years Active',
    getValue: (v) => v.years_active,
    format: (n) => `${n} yrs`,
    higherIsBad: false,
  },
  {
    label: 'Institutions Served',
    getValue: (v) => v.total_institutions,
    format: (n) => formatNumber(n),
    higherIsBad: false,
  },
]

// ============================================================================
// Subcomponents
// ============================================================================

function VendorCard({
  vendor,
  color,
  label,
}: {
  vendor: VendorDetailResponse
  color: string
  label: string
}) {
  const riskScore = vendor.avg_risk_score ?? 0
  const riskLevel = getRiskLevelFromScore(riskScore)

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className="text-[10px] font-bold tracking-widest uppercase font-mono mb-1 block"
              style={{ color }}
            >
              {label}
            </span>
            <CardTitle className="text-base leading-snug">
              {toTitleCase(vendor.name)}
            </CardTitle>
            {vendor.rfc && (
              <p className="text-xs text-text-muted font-mono mt-0.5">{vendor.rfc}</p>
            )}
          </div>
          <RiskLevelPill level={riskLevel} score={riskScore} />
        </div>
      </CardHeader>
      <CardContent>
        <Link
          to={`/vendors/${vendor.id}`}
          className="text-xs text-accent hover:underline flex items-center gap-1"
          aria-label={`View full profile for ${vendor.name}`}
        >
          View full profile
        </Link>
      </CardContent>
    </Card>
  )
}

function ComparisonRadar({
  aData,
  bData,
  aName,
  bName,
  aColor,
  bColor,
}: {
  aData: ReturnType<typeof buildRadarData>
  bData: ReturnType<typeof buildRadarData>
  aName: string
  bName: string
  aColor: string
  bColor: string
}) {
  // Merge into recharts format: each point has factor, vendorA, vendorB
  const merged = aData.map((a, i) => ({
    factor: a.factor,
    vendorA: a.value,
    vendorB: bData[i]?.value ?? 0,
    rawZA: a.rawZ,
    rawZB: bData[i]?.rawZ ?? 0,
  }))

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={merged} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#1e293b" />
          <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const d = payload[0].payload as (typeof merged)[0]
              return (
                <div className="rounded border border-border bg-background-card px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold text-text-primary mb-1">{d.factor}</p>
                  <p style={{ color: aColor }}>
                    {aName.slice(0, 20)}: z = {d.rawZA.toFixed(2)}
                  </p>
                  <p style={{ color: bColor }}>
                    {bName.slice(0, 20)}: z = {d.rawZB.toFixed(2)}
                  </p>
                </div>
              )
            }}
          />
          <Radar
            dataKey="vendorA"
            name={aName}
            stroke={aColor}
            fill={aColor}
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Radar
            dataKey="vendorB"
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

function DeltaCell({ valueA, valueB, higherIsBad }: { valueA: number | null; valueB: number | null; higherIsBad: boolean }) {
  if (valueA === null || valueB === null) {
    return <td className="px-3 py-2 text-center text-text-muted text-xs">—</td>
  }
  const delta = valueB - valueA
  if (Math.abs(delta) < 0.001 && Math.abs(valueB - valueA) < 1) {
    return <td className="px-3 py-2 text-center text-text-muted text-xs">equal</td>
  }
  const bIsWorse = higherIsBad ? delta > 0 : delta < 0
  const sign = delta > 0 ? '+' : ''
  const pct = valueA !== 0 ? `(${sign}${((delta / Math.abs(valueA)) * 100).toFixed(0)}%)` : ''

  return (
    <td
      className={cn(
        'px-3 py-2 text-center text-xs font-mono',
        bIsWorse ? 'text-red-400' : 'text-emerald-400'
      )}
      aria-label={`Delta: ${sign}${delta.toFixed(1)} ${pct}`}
    >
      {sign}{Math.abs(delta) >= 1000 ? formatCompactMXN(delta) : delta.toFixed(1)}
      {pct && <span className="ml-1 opacity-60">{pct}</span>}
    </td>
  )
}

function MetricTable({
  vendorA,
  vendorB,
  aName,
  bName,
}: {
  vendorA: VendorDetailResponse
  vendorB: VendorDetailResponse
  aName: string
  bName: string
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm" aria-label="Vendor metric comparison">
        <thead>
          <tr className="border-b border-border bg-background-card">
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted">Metric</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">
              {aName.slice(0, 22)}
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-violet-400">
              {bName.slice(0, 22)}
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-text-muted">
              B vs A
            </th>
          </tr>
        </thead>
        <tbody>
          {METRICS.map((m) => {
            const vA = m.getValue(vendorA)
            const vB = m.getValue(vendorB)
            return (
              <tr key={m.label} className="border-b border-border/40 hover:bg-sidebar-hover/30 transition-colors">
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
// Vendor picker — shown when no vendors are selected
// ============================================================================
function VendorPicker() {
  const [idA, setIdA] = useState('')
  const [idB, setIdB] = useState('')
  const navigate = useNavigate()

  const handleCompare = () => {
    const a = parseInt(idA, 10)
    const b = parseInt(idB, 10)
    if (!isNaN(a) && !isNaN(b) && a !== b) {
      navigate(`/vendors/compare?a=${a}&b=${b}`)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <Scale className="h-12 w-12 mx-auto text-accent/40 mb-4" />
        <h2 className="text-xl font-semibold text-text-primary mb-2">Compare Two Vendors</h2>
        <p className="text-sm text-text-muted max-w-sm">
          Enter two vendor IDs to compare their risk profiles, procurement metrics, and z-score
          radar charts side-by-side.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full max-w-md">
        <div className="flex-1">
          <label htmlFor="vendor-a-id" className="block text-xs font-medium text-text-muted mb-1">
            Vendor A — ID
          </label>
          <div className="flex items-center gap-2 border border-border rounded-md bg-background-card px-3 py-2">
            <Search className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
            <input
              id="vendor-a-id"
              type="number"
              placeholder="e.g. 12345"
              value={idA}
              onChange={(e) => setIdA(e.target.value)}
              className="bg-transparent text-sm text-text-primary placeholder:text-text-muted/50 outline-none w-full"
              aria-label="Vendor A ID"
            />
          </div>
        </div>
        <div className="flex-1">
          <label htmlFor="vendor-b-id" className="block text-xs font-medium text-text-muted mb-1">
            Vendor B — ID
          </label>
          <div className="flex items-center gap-2 border border-border rounded-md bg-background-card px-3 py-2">
            <Search className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
            <input
              id="vendor-b-id"
              type="number"
              placeholder="e.g. 67890"
              value={idB}
              onChange={(e) => setIdB(e.target.value)}
              className="bg-transparent text-sm text-text-primary placeholder:text-text-muted/50 outline-none w-full"
              aria-label="Vendor B ID"
            />
          </div>
        </div>
        <Button
          onClick={handleCompare}
          disabled={!idA || !idB || idA === idB}
          className="w-full sm:w-auto"
          aria-label="Compare vendors"
        >
          Compare
        </Button>
      </div>
      <p className="text-xs text-text-muted/60">
        You can also navigate here from any vendor&apos;s profile page using the "Compare" button.
      </p>
    </div>
  )
}

// ============================================================================
// Main page component
// ============================================================================
export default function VendorCompare() {
  const [searchParams] = useSearchParams()
  const idA = searchParams.get('a')
  const idB = searchParams.get('b')

  const numA = idA ? parseInt(idA, 10) : null
  const numB = idB ? parseInt(idB, 10) : null
  const hasIds = numA !== null && !isNaN(numA) && numB !== null && !isNaN(numB)

  const {
    data: vendorA,
    isLoading: loadingA,
    error: errorA,
  } = useQuery({
    queryKey: ['vendor-detail', numA],
    queryFn: () => vendorApi.getById(numA!),
    enabled: hasIds,
  })

  const {
    data: vendorB,
    isLoading: loadingB,
    error: errorB,
  } = useQuery({
    queryKey: ['vendor-detail', numB],
    queryFn: () => vendorApi.getById(numB!),
    enabled: hasIds,
  })

  const {
    data: waterfallA,
    isLoading: loadingWfA,
  } = useQuery({
    queryKey: ['vendor-waterfall', numA],
    queryFn: () => vendorApi.getRiskWaterfall(numA!),
    enabled: hasIds,
  })

  const {
    data: waterfallB,
    isLoading: loadingWfB,
  } = useQuery({
    queryKey: ['vendor-waterfall', numB],
    queryFn: () => vendorApi.getRiskWaterfall(numB!),
    enabled: hasIds,
  })

  const radarA = useMemo(
    () => (waterfallA ? buildRadarData(waterfallA) : []),
    [waterfallA]
  )
  const radarB = useMemo(
    () => (waterfallB ? buildRadarData(waterfallB) : []),
    [waterfallB]
  )

  const isLoading = loadingA || loadingB
  const hasError = errorA || errorB

  if (!hasIds) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
            aria-label="Back to Explore"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-text-primary mt-2">Vendor Comparison</h1>
          <p className="text-sm text-text-muted mt-1">
            Compare two vendors side-by-side across risk scores, procurement metrics, and z-score
            radar charts.
          </p>
        </div>
        <VendorPicker />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
          aria-label="Back to Explore"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-text-primary mt-2">Vendor Comparison</h1>
        <p className="text-sm text-text-muted mt-1">
          Side-by-side risk profile analysis for two selected vendors.
        </p>
      </div>

      {/* Error state */}
      {hasError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2 mb-6">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Could not load vendor data</p>
            <p className="text-xs text-text-muted mt-0.5">
              One or both vendor IDs may be invalid. Please check the IDs and try again.
            </p>
          </div>
        </div>
      )}

      {/* Loading: vendor cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : vendorA && vendorB ? (
        <>
          {/* Vendor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8" role="region" aria-label="Vendor summary cards">
            <VendorCard vendor={vendorA} color="#06b6d4" label="Vendor A" />
            <VendorCard vendor={vendorB} color="#a78bfa" label="Vendor B" />
          </div>

          {/* Radar Comparison */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-sm">Z-Score Radar Comparison</CardTitle>
              <p className="text-xs text-text-muted">
                Solid line = Vendor A. Dashed line = Vendor B. Values toward edge = higher deviation
                from sector norms.
              </p>
            </CardHeader>
            <CardContent>
              {loadingWfA || loadingWfB ? (
                <Skeleton className="h-[300px] w-full" />
              ) : radarA.length > 0 && radarB.length > 0 ? (
                <>
                  <ComparisonRadar
                    aData={radarA}
                    bData={radarB}
                    aName={toTitleCase(vendorA.name)}
                    bName={toTitleCase(vendorB.name)}
                    aColor="#06b6d4"
                    bColor="#a78bfa"
                  />
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-px w-6 bg-cyan-400 inline-block" />
                      <span className="text-xs text-text-muted">{toTitleCase(vendorA.name).slice(0, 25)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-px w-6 border-t-2 border-dashed border-violet-400 inline-block" />
                      <span className="text-xs text-text-muted">{toTitleCase(vendorB.name).slice(0, 25)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-text-muted text-center py-8">
                  No z-score data available for radar comparison.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Metric Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metric Comparison</CardTitle>
              <p className="text-xs text-text-muted">
                The &quot;B vs A&quot; column shows how Vendor B differs. Red = worse risk; green = better.
              </p>
            </CardHeader>
            <CardContent>
              <MetricTable
                vendorA={vendorA}
                vendorB={vendorB}
                aName={toTitleCase(vendorA.name)}
                bName={toTitleCase(vendorB.name)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
