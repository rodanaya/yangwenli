/**
 * AnomalyLeadsWidget — P21: Double-Flagged Anomaly Queue
 *
 * Shows vendors flagged by BOTH the supervised risk model AND the
 * unsupervised ML anomaly detector (PyOD). "Convergent signals"
 * are the strongest investigation leads.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { investigationApi } from '@/api/client'
import type { AnomalousVendorItem } from '@/api/client'
import { cn, formatCompactMXN } from '@/lib/utils'
import { getRiskLevelFromScore } from '@/lib/constants'
import { SECTORS, RISK_COLORS } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { HallazgoStat } from '@/components/ui/HallazgoStat'
import { Sparkles, Filter } from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSectorColor(sectorId: number | null): string {
  if (!sectorId) return '#64748b'
  const sector = SECTORS.find((s) => s.id === sectorId)
  return sector?.color ?? '#64748b'
}

function getSectorName(sectorId: number | null): string {
  if (!sectorId) return 'N/A'
  const sector = SECTORS.find((s) => s.id === sectorId)
  return sector?.name ?? 'N/A'
}

function RiskBadge({ score }: { score: number }) {
  const level = getRiskLevelFromScore(score)
  const color = RISK_COLORS[level]
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {score.toFixed(2)}
    </span>
  )
}

function SectorPill({ sectorId }: { sectorId: number | null }) {
  const color = getSectorColor(sectorId)
  const name = getSectorName(sectorId)
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  )
}

function DobleSignalBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-600/30">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      Doble
    </span>
  )
}

function AnomalyBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score * 100))
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-2 bg-background-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-purple-500/80"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono text-text-muted">{score.toFixed(2)}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AnomalyLeadsWidget({ className }: { className?: string }) {
  const [onlyDoubleFlagged, setOnlyDoubleFlagged] = useState(true)

  const { data, isLoading, error } = useQuery({
    queryKey: ['anomaly-leads', 'top'],
    queryFn: () => investigationApi.getTopAnomalousVendors(30),
    staleTime: 300_000, // 5 min
  })

  const vendors: AnomalousVendorItem[] = data?.data ?? []
  const filtered = onlyDoubleFlagged
    ? vendors.filter((v) => v.both_flagged)
    : vendors
  const displayed = filtered.slice(0, 15)
  const agreementRate = data?.agreement_rate ?? 72

  return (
    <div className={cn('bg-background-card border border-border rounded-xl p-5', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h3
              className="text-lg font-bold text-text-primary"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              Senales Convergentes
            </h3>
          </div>
          <p className="text-xs text-text-muted max-w-md">
            Proveedores marcados por modelo supervisado Y detector de anomalias
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
          <Filter className="h-3.5 w-3.5" />
          Solo doble marcado
          <input
            type="checkbox"
            checked={onlyDoubleFlagged}
            onChange={(e) => setOnlyDoubleFlagged(e.target.checked)}
            className="accent-purple-500"
          />
        </label>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="text-sm text-red-400 py-4">Error al cargar datos de anomalias</div>
      ) : displayed.length === 0 ? (
        <div className="text-sm text-text-muted py-4 italic">
          No se encontraron proveedores con doble marcaje
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-text-muted uppercase tracking-wider border-b border-border">
                <th className="pb-2 pr-2">#</th>
                <th className="pb-2 pr-2">Proveedor</th>
                <th className="pb-2 pr-2">Sector</th>
                <th className="pb-2 pr-2">Riesgo</th>
                <th className="pb-2 pr-2">Anomalia</th>
                <th className="pb-2 pr-2">Senal</th>
                <th className="pb-2 pr-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((v, idx) => (
                <tr
                  key={v.vendor_id}
                  className="border-b border-border/50 hover:bg-background-elevated/50 transition-colors"
                >
                  <td className="py-2 pr-2 text-text-muted font-mono text-xs">{idx + 1}</td>
                  <td className="py-2 pr-2">
                    <Link
                      to={`/vendors/${v.vendor_id}`}
                      className="text-text-primary hover:text-accent font-medium text-xs truncate block max-w-[200px]"
                      title={v.vendor_name}
                    >
                      {v.vendor_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-2">
                    <SectorPill sectorId={v.sector_id} />
                  </td>
                  <td className="py-2 pr-2">
                    <RiskBadge score={v.risk_score} />
                  </td>
                  <td className="py-2 pr-2">
                    <AnomalyBar score={v.anomaly_score} />
                  </td>
                  <td className="py-2 pr-2">
                    {v.both_flagged && <DobleSignalBadge />}
                  </td>
                  <td className="py-2 text-right text-xs font-mono text-text-secondary">
                    {formatCompactMXN(v.total_value_mxn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer stat */}
      <div className="mt-4 pt-3 border-t border-border">
        <HallazgoStat
          value={`${agreementRate}%`}
          label="convergencia entre modelo supervisado y PyOD"
          color="border-purple-500"
        />
      </div>
    </div>
  )
}

export default AnomalyLeadsWidget
