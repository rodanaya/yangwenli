/**
 * PoliticalIntelligenceStrip — "Who got the money under each president?"
 *
 * Compact comparison strip showing top vendors by presidential administration.
 * Uses analysisApi.getTopByPeriod() to fetch top vendors for each sexenio.
 */

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { analysisApi } from '@/api/client'
import type { TopByPeriodResponse, TopPeriodEntityItem } from '@/api/client'
import { cn, formatCompactMXN } from '@/lib/utils'
import { getRiskLevelFromScore, RISK_COLORS } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { Landmark } from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMINISTRATIONS = [
  { key: 'calderon',    label: 'Calderon',    start: 2006, end: 2012, color: '#fb923c', party: 'PAN' },
  { key: 'pena_nieto',  label: 'Pena Nieto',  start: 2012, end: 2018, color: '#f87171', party: 'PRI' },
  { key: 'amlo',        label: 'AMLO',        start: 2018, end: 2024, color: '#4ade80', party: 'MORENA' },
  { key: 'sheinbaum',   label: 'Sheinbaum',   start: 2024, end: 2025, color: '#60a5fa', party: 'MORENA' },
] as const

type AdminKey = typeof ADMINISTRATIONS[number]['key']

const PARTY_COLORS: Record<string, string> = {
  PAN: '#002395',
  PRI: '#008000',
  MORENA: '#8B0000',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function VendorBar({ vendor, maxValue }: { vendor: TopPeriodEntityItem; maxValue: number }) {
  const riskLevel = vendor.avg_risk_score != null ? getRiskLevelFromScore(vendor.avg_risk_score) : 'low'
  const barColor = RISK_COLORS[riskLevel]
  const pct = maxValue > 0 ? Math.max(4, (vendor.total_value_mxn / maxValue) * 100) : 4

  return (
    <div className="flex items-center gap-2 py-1.5">
      <Link
        to={`/vendors/${vendor.id}`}
        className="text-xs text-text-primary hover:text-accent truncate w-40 shrink-0"
        title={vendor.name}
      >
        {vendor.name}
      </Link>
      <div className="flex-1 flex items-center gap-1.5">
        {(() => {
          const N = 24, DR = 2.5, DG = 6.5
          const filled = Math.max(1, Math.round((pct / 100) * N))
          return (
            <svg viewBox={`0 0 ${N * DG} 8`} className="flex-1" style={{ height: 8 }} preserveAspectRatio="none" aria-hidden="true">
              {Array.from({ length: N }).map((_, i) => (
                <circle key={i} cx={i * DG + DR} cy={4} r={DR}
                  fill={i < filled ? barColor : '#2d2926'}
                  fillOpacity={i < filled ? 0.85 : 1}
                />
              ))}
            </svg>
          )
        })()}
        <span className="text-[10px] font-mono text-text-muted w-16 text-right shrink-0">
          {formatCompactMXN(vendor.total_value_mxn)}
        </span>
      </div>
      {vendor.avg_risk_score != null && (
        <span
          className="text-[10px] font-mono font-semibold px-1 py-0.5 rounded"
          style={{ color: barColor, backgroundColor: `${barColor}22` }}
        >
          {vendor.avg_risk_score.toFixed(2)}
        </span>
      )}
    </div>
  )
}

function AdminSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PoliticalIntelligenceStrip({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  const [selectedAdmin, setSelectedAdmin] = useState<AdminKey>('amlo')

  const admin = ADMINISTRATIONS.find((a) => a.key === selectedAdmin)!

  const { data, isLoading, error } = useQuery<TopByPeriodResponse>({
    queryKey: ['top-by-period', admin.start, admin.end, 'vendor', 'value'],
    queryFn: () => analysisApi.getTopByPeriod(admin.start, admin.end, 'vendor', 'value', 5),
    staleTime: 600_000,
  })

  const vendors = data?.data ?? []
  const maxValue = useMemo(
    () => Math.max(...vendors.map((v) => v.total_value_mxn), 1),
    [vendors],
  )

  return (
    <div className={cn('bg-background-card border border-border rounded-sm p-5', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Landmark className="h-5 w-5 text-text-muted" />
        <h3
          className="text-lg font-bold text-text-primary"
          style={{ fontFamily: 'var(--font-family-serif)' }}
        >
          Inteligencia Politica
        </h3>
      </div>
      <p className="text-xs text-text-muted mb-4">
        Top proveedores por administracion presidencial — ordenados por valor total
      </p>

      {/* Admin pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ADMINISTRATIONS.map((a) => {
          const isActive = a.key === selectedAdmin
          const partyColor = PARTY_COLORS[a.party] ?? '#666'
          return (
            <button
              key={a.key}
              onClick={() => setSelectedAdmin(a.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                isActive
                  ? 'text-white border-transparent'
                  : 'text-text-secondary border-border hover:border-border-hover bg-background-elevated/50',
              )}
              style={isActive ? { backgroundColor: partyColor, borderColor: partyColor } : undefined}
            >
              {a.label}
              <span className="ml-1 opacity-70 text-[10px]">
                {a.start}-{a.end > 2025 ? '' : a.end}
              </span>
            </button>
          )
        })}
      </div>

      {/* Vendor list */}
      {isLoading ? (
        <AdminSkeleton />
      ) : error ? (
        <div className="text-sm text-red-400 py-4">
          {t('politicalStrip.errorLoading')}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-sm text-text-muted py-4 italic">
          {t('politicalStrip.noData')}
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {vendors.map((v) => (
            <VendorBar key={v.id} vendor={v} maxValue={maxValue} />
          ))}
        </div>
      )}
    </div>
  )
}

export default PoliticalIntelligenceStrip
