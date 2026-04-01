/**
 * VendorCompare — editorial side-by-side vendor comparison
 * Route: /vendors/compare?a=VENDOR_ID&b=VENDOR_ID
 *
 * NYT/WaPo/Fern investigative journalism aesthetic.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, Link } from 'react-router-dom'
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
import { EditorialHeadline } from '@/components/ui/EditorialHeadline'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { vendorApi } from '@/api/client'
import type { VendorDetailResponse, VendorWaterfallContribution, VendorListItem } from '@/api/types'
import { getRiskLevelFromScore, RISK_COLORS } from '@/lib/constants'
import { formatCompactMXN, formatPercentSafe, formatNumber, toTitleCase, cn } from '@/lib/utils'
import { ArrowLeft, AlertCircle, Search, X } from 'lucide-react'

// ============================================================================
// Radar axis definitions — 6 key risk dimensions
// ============================================================================
const RADAR_KEYS: { key: string; tKey: string }[] = [
  { key: 'price_volatility', tKey: 'radar.priceVolatility' },
  { key: 'vendor_concentration', tKey: 'radar.concentration' },
  { key: 'win_rate', tKey: 'radar.winRate' },
  { key: 'direct_award', tKey: 'radar.directAward' },
  { key: 'industry_mismatch', tKey: 'radar.sectorMismatch' },
  { key: 'single_bid', tKey: 'radar.singleBid' },
]

function buildRadarData(waterfall: VendorWaterfallContribution[], labels: string[]) {
  const lookup = new Map<string, VendorWaterfallContribution>()
  for (const item of waterfall) {
    lookup.set(item.feature, item)
  }
  return RADAR_KEYS.map(({ key }, i) => {
    const item = lookup.get(key)
    const rawZ = item?.z_score ?? 0
    const clampedZ = Math.max(-3, Math.min(3, rawZ))
    const value = Math.round(((clampedZ + 3) / 6) * 100) / 100
    return { factor: labels[i] ?? key, value, rawZ }
  })
}

// ============================================================================
// Metric comparison definitions
// ============================================================================
interface MetricDef {
  tKey: string
  getValue: (v: VendorDetailResponse) => number | null
  format: (n: number) => string
  higherIsBad: boolean
}

const METRICS: MetricDef[] = [
  {
    tKey: 'metrics.totalContracts',
    getValue: (v) => v.total_contracts,
    format: (n) => formatNumber(n),
    higherIsBad: false,
  },
  {
    tKey: 'metrics.totalValue',
    getValue: (v) => v.total_value_mxn,
    format: (n) => formatCompactMXN(n),
    higherIsBad: false,
  },
  {
    tKey: 'metrics.avgRiskScore',
    getValue: (v) => v.avg_risk_score ?? null,
    format: (n) => `${(n * 100).toFixed(1)}%`,
    higherIsBad: true,
  },
  {
    tKey: 'metrics.directAwardPct',
    getValue: (v) => v.direct_award_pct,
    format: (n) => formatPercentSafe(n, false),
    higherIsBad: true,
  },
  {
    tKey: 'metrics.singleBidPct',
    getValue: (v) => v.single_bid_pct,
    format: (n) => formatPercentSafe(n, false),
    higherIsBad: true,
  },
  {
    tKey: 'metrics.highRiskContracts',
    getValue: (v) => v.high_risk_count,
    format: (n) => formatNumber(n),
    higherIsBad: true,
  },
  {
    tKey: 'metrics.yearsActive',
    getValue: (v) => v.years_active,
    format: (n) => `${n}`,
    higherIsBad: false,
  },
  {
    tKey: 'metrics.institutionsServed',
    getValue: (v) => v.total_institutions,
    format: (n) => formatNumber(n),
    higherIsBad: false,
  },
]

// ============================================================================
// Vendor search input with autocomplete
// ============================================================================
function VendorSearchInput({
  label,
  selectedVendor,
  onSelect,
  onClear,
  color,
}: {
  label: string
  selectedVendor: VendorListItem | null
  onSelect: (vendor: VendorListItem) => void
  onClear: () => void
  color: string
}) {
  const { t } = useTranslation('vendorcompare')
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: results, isLoading } = useQuery({
    queryKey: ['vendor-search', query],
    queryFn: () => vendorApi.search(query, 8),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = useCallback((vendor: VendorListItem) => {
    onSelect(vendor)
    setQuery('')
    setIsOpen(false)
  }, [onSelect])

  if (selectedVendor) {
    const riskScore = selectedVendor.avg_risk_score ?? 0
    const riskLevel = getRiskLevelFromScore(riskScore)
    return (
      <div className="flex-1">
        <span
          className="text-[10px] font-bold tracking-[0.15em] uppercase font-mono mb-2 block"
          style={{ color }}
        >
          {label}
        </span>
        <div
          className="border rounded-lg p-4 bg-zinc-900/60 relative"
          style={{ borderColor: `${color}40` }}
        >
          <button
            onClick={onClear}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-zinc-700/50 transition-colors"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5 text-text-muted" />
          </button>
          <h3
            className="text-lg font-bold text-text-primary leading-snug pr-6"
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {toTitleCase(selectedVendor.name)}
          </h3>
          {selectedVendor.rfc && (
            <p className="text-xs text-text-muted font-mono mt-0.5">{selectedVendor.rfc}</p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <RiskLevelPill level={riskLevel} score={riskScore} />
            <span className="text-xs text-text-muted">
              {formatNumber(selectedVendor.total_contracts)} contratos
            </span>
          </div>
          <Link
            to={`/vendors/${selectedVendor.id}`}
            className="text-xs text-accent hover:underline mt-2 inline-block"
            aria-label={`View full profile for ${selectedVendor.name}`}
          >
            {t('viewProfile')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1" ref={containerRef}>
      <span
        className="text-[10px] font-bold tracking-[0.15em] uppercase font-mono mb-2 block"
        style={{ color }}
      >
        {label}
      </span>
      <div
        className="flex items-center gap-2 border border-border rounded-lg bg-zinc-900/60 px-4 py-3"
        style={{ borderColor: isOpen ? `${color}60` : undefined }}
      >
        <Search className="h-4 w-4 text-text-muted flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder={t('picker.placeholderA')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => { if (query.length >= 2) setIsOpen(true) }}
          className="bg-transparent text-sm text-text-primary placeholder:text-text-muted/50 outline-none w-full"
          aria-label={label}
        />
      </div>
      {isOpen && query.length >= 2 && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 border border-border rounded-lg bg-background-card shadow-xl max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-xs text-text-muted">{t('searching')}</div>
            ) : results && results.data.length > 0 ? (
              results.data.map((v) => {
                const rl = getRiskLevelFromScore(v.avg_risk_score ?? 0)
                return (
                  <button
                    key={v.id}
                    onClick={() => handleSelect(v)}
                    className="w-full text-left px-4 py-2.5 hover:bg-sidebar-hover/40 transition-colors border-b border-border/30 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate font-medium">
                          {toTitleCase(v.name)}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          ID: {v.id} {v.rfc ? `| ${v.rfc}` : ''} | {formatNumber(v.total_contracts)} contratos
                        </p>
                      </div>
                      <RiskLevelPill level={rl} score={v.avg_risk_score ?? 0} size="sm" />
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="px-4 py-3 text-xs text-text-muted">{t('noResults')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Comparison Radar Chart (preserved from original)
// ============================================================================
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
  const merged = aData.map((a, i) => ({
    factor: a.factor,
    vendorA: a.value,
    vendorB: bData[i]?.value ?? 0,
    rawZA: a.rawZ,
    rawZB: bData[i]?.rawZ ?? 0,
  }))

  return (
    <div className="h-[320px]">
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

// ============================================================================
// Verdict / Comparison Header
// ============================================================================
function VerdictHeader({
  vendorA,
  vendorB,
}: {
  vendorA: VendorDetailResponse
  vendorB: VendorDetailResponse
}) {
  const { t } = useTranslation('vendorcompare')
  const scoreA = vendorA.avg_risk_score ?? 0
  const scoreB = vendorB.avg_risk_score ?? 0
  const levelA = getRiskLevelFromScore(scoreA)
  const levelB = getRiskLevelFromScore(scoreB)

  const riskier = scoreA >= scoreB ? 'A' : 'B'
  const higherScore = Math.max(scoreA, scoreB)
  const lowerScore = Math.min(scoreA, scoreB)
  const pctDiff = lowerScore > 0.001
    ? Math.round(((higherScore - lowerScore) / lowerScore) * 100)
    : 0
  const isTied = Math.abs(scoreA - scoreB) < 0.01

  const winnerName = riskier === 'A' ? toTitleCase(vendorA.name) : toTitleCase(vendorB.name)
  const loserName = riskier === 'A' ? toTitleCase(vendorB.name) : toTitleCase(vendorA.name)

  const riskierColor = riskier === 'A'
    ? (RISK_COLORS[levelA] ?? RISK_COLORS.low)
    : (RISK_COLORS[levelB] ?? RISK_COLORS.low)

  return (
    <div className="mb-10">
      {/* Section label */}
      <div className="h-px bg-border mb-4" />
      <span className="text-xs uppercase tracking-[0.2em] text-text-muted font-semibold">
        {t('verdict.section')}
      </span>

      {/* Vendor names face-off */}
      <div className="mt-4 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
        <div className="flex-1 min-w-0">
          <h2
            className={cn(
              'text-2xl md:text-3xl font-bold leading-tight truncate',
              riskier === 'A' ? 'text-text-primary' : 'text-text-secondary'
            )}
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {toTitleCase(vendorA.name)}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <RiskLevelPill level={levelA} score={scoreA} />
            <span className="text-xs font-mono text-text-muted">
              {(scoreA * 100).toFixed(1)}%
            </span>
            {riskier === 'A' && !isTied && (
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: riskierColor }}>
                {t('verdict.higherRisk')}
              </span>
            )}
          </div>
        </div>

        <span
          className="text-xl font-bold text-text-muted/40 self-center hidden md:block"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          {t('verdict.vs')}
        </span>

        <div className="flex-1 min-w-0 md:text-right">
          <h2
            className={cn(
              'text-2xl md:text-3xl font-bold leading-tight truncate',
              riskier === 'B' ? 'text-text-primary' : 'text-text-secondary'
            )}
            style={{ fontFamily: 'var(--font-family-serif)' }}
          >
            {toTitleCase(vendorB.name)}
          </h2>
          <div className="flex items-center gap-2 mt-1 md:justify-end">
            <RiskLevelPill level={levelB} score={scoreB} />
            <span className="text-xs font-mono text-text-muted">
              {(scoreB * 100).toFixed(1)}%
            </span>
            {riskier === 'B' && !isTied && (
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: riskierColor }}>
                {t('verdict.higherRisk')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Narrative line */}
      <div className="mt-4 border-l-[3px] pl-4 py-1" style={{ borderColor: isTied ? '#64748b' : riskierColor }}>
        <p className="text-sm text-text-secondary leading-relaxed italic">
          {isTied
            ? t('verdict.tiedMessage')
            : t('verdict.narrative', {
                winner: winnerName.slice(0, 40),
                loser: loserName.slice(0, 40),
                pct: pctDiff,
              })
          }
        </p>
      </div>
      <div className="h-px bg-border mt-4" />
    </div>
  )
}

// ============================================================================
// Side-by-side stat cards using HallazgoStat
// ============================================================================
function ComparisonStatCards({
  vendorA,
  vendorB,
}: {
  vendorA: VendorDetailResponse
  vendorB: VendorDetailResponse
}) {
  const { t } = useTranslation('vendorcompare')

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {METRICS.map((m) => {
        const vA = m.getValue(vendorA)
        const vB = m.getValue(vendorB)
        const aStr = vA !== null ? m.format(vA) : '--'
        const bStr = vB !== null ? m.format(vB) : '--'

        // Determine which is "worse"
        let aColor = 'border-zinc-600'
        let bColor = 'border-zinc-600'
        if (vA !== null && vB !== null && Math.abs(vA - vB) > 0.001) {
          const aIsWorse = m.higherIsBad ? vA > vB : vA < vB
          aColor = aIsWorse ? 'border-red-500' : 'border-emerald-500'
          bColor = aIsWorse ? 'border-emerald-500' : 'border-red-500'
        }

        return (
          <div
            key={m.tKey}
            className="bg-zinc-900/40 border border-zinc-800/60 rounded-lg p-4"
          >
            <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-3">
              {t(m.tKey)}
            </p>
            <div className="flex items-end justify-between gap-4">
              <HallazgoStat
                value={aStr}
                label={t('vendorA')}
                color={aColor}
                className="text-left"
              />
              <HallazgoStat
                value={bStr}
                label={t('vendorB')}
                color={bColor}
                className="text-left"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Delta Cell (preserved from original)
// ============================================================================
function DeltaCell({ valueA, valueB, higherIsBad }: { valueA: number | null; valueB: number | null; higherIsBad: boolean }) {
  const { t } = useTranslation('vendorcompare')
  if (valueA === null || valueB === null) {
    return <td className="px-3 py-2 text-center text-text-muted text-xs">&mdash;</td>
  }
  const delta = valueB - valueA
  if (Math.abs(delta) < 0.001 && Math.abs(valueB - valueA) < 1) {
    return <td className="px-3 py-2 text-center text-text-muted text-xs">{t('deltaEqual')}</td>
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

// ============================================================================
// Metric Comparison Table (preserved from original)
// ============================================================================
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
  const { t } = useTranslation('vendorcompare')
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm" aria-label="Vendor metric comparison">
        <thead>
          <tr className="border-b border-border bg-zinc-900/60">
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-muted">{t('metricColLabel')}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">
              {aName.slice(0, 22)}
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-violet-400">
              {bName.slice(0, 22)}
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-text-muted">
              {t('metricColDelta')}
            </th>
          </tr>
        </thead>
        <tbody>
          {METRICS.map((m) => {
            const vA = m.getValue(vendorA)
            const vB = m.getValue(vendorB)
            return (
              <tr key={m.tKey} className="border-b border-border/40 hover:bg-sidebar-hover/30 transition-colors">
                <td className="px-3 py-2 text-xs text-text-secondary font-medium">{t(m.tKey)}</td>
                <td className="px-3 py-2 text-center text-xs font-mono text-text-primary">
                  {vA !== null ? m.format(vA) : '\u2014'}
                </td>
                <td className="px-3 py-2 text-center text-xs font-mono text-text-primary">
                  {vB !== null ? m.format(vB) : '\u2014'}
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
// Verdict Bottom Section
// ============================================================================
function VerdictCallout({
  vendorA,
  vendorB,
}: {
  vendorA: VendorDetailResponse
  vendorB: VendorDetailResponse
}) {
  const { t } = useTranslation('vendorcompare')
  const scoreA = vendorA.avg_risk_score ?? 0
  const scoreB = vendorB.avg_risk_score ?? 0
  const isTied = Math.abs(scoreA - scoreB) < 0.01

  const riskier = scoreA >= scoreB ? vendorA : vendorB
  const safer = scoreA >= scoreB ? vendorB : vendorA
  const riskierScore = Math.max(scoreA, scoreB)
  const riskierLevel = getRiskLevelFromScore(riskierScore)
  const borderColor = RISK_COLORS[riskierLevel] ?? RISK_COLORS.low

  if (isTied) return null

  return (
    <div
      className="mt-10 border rounded-lg p-6 bg-zinc-900/60"
      style={{ borderColor: `${borderColor}40`, borderTopWidth: '3px', borderTopColor: borderColor }}
    >
      <p className="text-xs tracking-[0.2em] uppercase text-text-muted font-semibold mb-2">
        {t('verdict.title')}
      </p>
      <h3
        className="text-2xl font-bold text-text-primary"
        style={{ fontFamily: 'var(--font-family-serif)', color: borderColor }}
      >
        {toTitleCase(riskier.name)}
      </h3>
      <p className="text-sm text-text-secondary mt-2 leading-relaxed">
        {t('verdict.narrative', {
          winner: toTitleCase(riskier.name).slice(0, 40),
          loser: toTitleCase(safer.name).slice(0, 40),
          pct: riskierScore > 0.001 && (Math.min(scoreA, scoreB) > 0.001)
            ? Math.round(((riskierScore - Math.min(scoreA, scoreB)) / Math.min(scoreA, scoreB)) * 100)
            : 0,
        })}
      </p>
      <div className="flex items-center gap-3 mt-3">
        <RiskLevelPill level={riskierLevel} score={riskierScore} size="md" />
        <span className="text-xs text-text-muted font-mono">
          {(riskierScore * 100).toFixed(1)}% {t('verdict.vs')} {(Math.min(scoreA, scoreB) * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// Vendor Picker — editorial empty state with search
// ============================================================================
function VendorPicker() {
  const { t } = useTranslation('vendorcompare')
  const [, setSearchParams] = useSearchParams()
  const [selectedA, setSelectedA] = useState<VendorListItem | null>(null)
  const [selectedB, setSelectedB] = useState<VendorListItem | null>(null)

  const handleCompare = useCallback(() => {
    if (selectedA && selectedB && selectedA.id !== selectedB.id) {
      setSearchParams({ a: String(selectedA.id), b: String(selectedB.id) })
    }
  }, [selectedA, selectedB, setSearchParams])

  const canCompare = selectedA !== null && selectedB !== null && selectedA.id !== selectedB.id

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <VendorSearchInput
          label={t('picker.labelA')}
          selectedVendor={selectedA}
          onSelect={setSelectedA}
          onClear={() => setSelectedA(null)}
          color="#06b6d4"
        />
        <VendorSearchInput
          label={t('picker.labelB')}
          selectedVendor={selectedB}
          onSelect={setSelectedB}
          onClear={() => setSelectedB(null)}
          color="#a78bfa"
        />
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={handleCompare}
          disabled={!canCompare}
          className={cn(
            'px-8 py-2.5 rounded-lg text-sm font-semibold transition-all',
            canCompare
              ? 'bg-accent text-white hover:bg-accent/90'
              : 'bg-zinc-800 text-text-muted cursor-not-allowed'
          )}
          aria-label={t('picker.compare')}
        >
          {t('picker.compare')}
        </button>
        <p className="text-xs text-text-muted/60 mt-3">
          {t('picker.hint')}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Main page component
// ============================================================================
export default function VendorCompare() {
  const { t } = useTranslation('vendorcompare')
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

  const radarLabels = useMemo(
    () => RADAR_KEYS.map(({ tKey }) => t(tKey)),
    [t]
  )
  const radarA = useMemo(
    () => (waterfallA ? buildRadarData(waterfallA, radarLabels) : []),
    [waterfallA, radarLabels]
  )
  const radarB = useMemo(
    () => (waterfallB ? buildRadarData(waterfallB, radarLabels) : []),
    [waterfallB, radarLabels]
  )

  const isLoading = loadingA || loadingB
  const hasError = errorA || errorB

  // ---- Empty state: no vendor IDs in URL ----
  if (!hasIds) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-4">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
            aria-label="Back to Explore"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('back')}
          </Link>
        </div>
        <EditorialHeadline
          section={t('headline.section')}
          headline={t('headline.title')}
          subtitle={t('headline.subtitle')}
        />
        <VendorPicker />
      </div>
    )
  }

  // ---- Comparison view ----
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-4">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
          aria-label={t('back')}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('back')}
        </Link>
      </div>

      <EditorialHeadline
        section={t('headline.section')}
        headline={t('headline.title')}
        subtitle={t('subtitle')}
        className="mb-8"
      />

      {/* Error state */}
      {hasError && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-2 mb-6">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">{t('errorTitle')}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {t('errorBody')}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </div>
      ) : vendorA && vendorB ? (
        <>
          {/* Verdict Header */}
          <VerdictHeader vendorA={vendorA} vendorB={vendorB} />

          {/* Side-by-side Stat Cards */}
          <ComparisonStatCards vendorA={vendorA} vendorB={vendorB} />

          {/* Radar Comparison */}
          <Card className="mb-8 bg-zinc-900/40 border-zinc-800/60">
            <CardHeader>
              <CardTitle className="text-sm" style={{ fontFamily: 'var(--font-family-serif)' }}>
                {t('radarTitle')}
              </CardTitle>
              <p className="text-xs text-text-muted">
                {t('radarSubtitle')}
              </p>
            </CardHeader>
            <CardContent>
              {loadingWfA || loadingWfB ? (
                <Skeleton className="h-[320px] w-full" />
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
                  {t('noRadarData')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Detailed Metric Table */}
          <Card className="bg-zinc-900/40 border-zinc-800/60">
            <CardHeader>
              <CardTitle className="text-sm" style={{ fontFamily: 'var(--font-family-serif)' }}>
                {t('metricTitle')}
              </CardTitle>
              <p className="text-xs text-text-muted">
                {t('metricSubtitle')}
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

          {/* Bottom Verdict Callout */}
          <VerdictCallout vendorA={vendorA} vendorB={vendorB} />
        </>
      ) : null}
    </div>
  )
}
