/**
 * AnomalyLeadsWidget — ARIA T1/T2 Investigation Queue
 *
 * Shows top-priority vendors from the ARIA queue (ips_tier 1 & 2).
 * Replaces the old vendor_investigation_features approach (table was empty).
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ariaApi } from '@/api/client'
import type { AriaQueueItem } from '@/api/types'
import { cn, formatCompactMXN } from '@/lib/utils'
import { getRiskLevelFromScore } from '@/lib/constants'
import { SECTORS, RISK_COLORS } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { Crosshair, ExternalLink } from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PATTERN_LABELS: Record<string, string> = {
  P1: 'Monopolio',
  P2: 'Fantasma',
  P3: 'Intermediario',
  P4: 'Rotación',
  P5: 'Splitting',
  P6: 'Captura',
  P7: 'Efos',
}

function getSectorColor(sectorName: string | null): string {
  if (!sectorName) return '#64748b'
  const normalized = sectorName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return SECTORS.find(s => s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').startsWith(normalized.slice(0,5)))?.color ?? '#64748b'
}

function RiskBadge({ score }: { score: number }) {
  const level = getRiskLevelFromScore(score)
  const color = RISK_COLORS[level]
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {score.toFixed(2)}
    </span>
  )
}

function PatternBadge({ pattern }: { pattern: string | null }) {
  if (!pattern) return null
  const label = PATTERN_LABELS[pattern] ?? pattern
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-600/20 text-purple-300 border border-purple-600/30">
      {pattern} · {label}
    </span>
  )
}

function IPSBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score * 100))
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: score > 0.7 ? '#f87171' : score > 0.5 ? '#fb923c' : '#fbbf24' }}
        />
      </div>
      <span className="text-[11px] font-mono text-slate-400">{score.toFixed(2)}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-5" />
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
  const { t } = useTranslation('common')
  const [tier, setTier] = useState<1 | 2>(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['aria-leads', tier],
    queryFn: () => ariaApi.getQueue({ tier, per_page: 20 }),
    staleTime: 300_000,
  })

  const vendors: AriaQueueItem[] = data?.data ?? []

  return (
    <div className={cn('bg-background-card border border-border rounded-xl p-5', className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crosshair className="h-5 w-5 text-red-400" />
            <h3
              className="text-lg font-bold text-text-primary"
              style={{ fontFamily: 'var(--font-family-serif)' }}
            >
              Cola de Investigación ARIA
            </h3>
          </div>
          <p className="text-xs text-text-muted max-w-md">
            Proveedores de mayor prioridad según el algoritmo ARIA (IPS score)
          </p>
        </div>

        {/* Tier toggle */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {([1, 2] as const).map(t => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                tier === t ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              T{t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="text-sm text-red-400 py-4">{t('ariaWidget.loadError')}</div>
      ) : vendors.length === 0 ? (
        <div className="text-sm text-text-muted py-4 italic">
          {t('ariaWidget.noVendorsInTier', { tier })}
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
                <th className="pb-2 pr-2">IPS</th>
                <th className="pb-2 pr-2">Patrón</th>
                <th className="pb-2 pr-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v, idx) => (
                <tr
                  key={v.vendor_id}
                  className="border-b border-border/50 hover:bg-background-elevated/50 transition-colors"
                >
                  <td className="py-2 pr-2 text-text-muted font-mono text-xs">{idx + 1}</td>
                  <td className="py-2 pr-2">
                    <Link
                      to={`/vendors/${v.vendor_id}`}
                      className="text-text-primary hover:text-accent font-medium text-xs truncate flex items-center gap-1 max-w-[190px]"
                      title={v.vendor_name}
                    >
                      <span className="truncate">{v.vendor_name}</span>
                      <ExternalLink size={10} className="shrink-0 opacity-40" />
                    </Link>
                  </td>
                  <td className="py-2 pr-2">
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                      style={{ backgroundColor: getSectorColor(v.primary_sector_name) }}
                    >
                      {v.primary_sector_name ?? 'N/A'}
                    </span>
                  </td>
                  <td className="py-2 pr-2">
                    <RiskBadge score={v.avg_risk_score ?? 0} />
                  </td>
                  <td className="py-2 pr-2">
                    <IPSBar score={v.ips_final ?? 0} />
                  </td>
                  <td className="py-2 pr-2">
                    <PatternBadge pattern={v.primary_pattern ?? null} />
                  </td>
                  <td className="py-2 text-right text-xs font-mono text-text-muted">
                    {formatCompactMXN(v.total_value_mxn ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {vendors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 flex justify-between items-center">
          <span className="text-[11px] text-text-muted">
            {data?.pagination?.total ? `${data.pagination.total.toLocaleString()} en Tier ${tier}` : `${vendors.length} mostrados`}
          </span>
          <Link
            to="/aria"
            className="text-[11px] text-accent hover:underline flex items-center gap-1"
          >
            {t('ariaWidget.viewFull')} <ExternalLink size={10} />
          </Link>
        </div>
      )}
    </div>
  )
}
