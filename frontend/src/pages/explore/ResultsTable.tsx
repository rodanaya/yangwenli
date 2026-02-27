import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { vendorApi, institutionApi } from '@/api/client'
import { formatCompactMXN, formatNumber, cn } from '@/lib/utils'
import { RISK_COLORS } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ExplorerFilters } from '@/hooks/useExplorerFilters'

const PAGE_SIZE = 25

interface ResultsTableProps {
  filters: ExplorerFilters
  page: number
  onPageChange: (page: number) => void
}

export function ResultsTable({ filters, page, onPageChange }: ResultsTableProps) {
  const { sectorId, yearStart, yearEnd, riskLevels, searchText, entityType } = filters

  const vendorQuery = useQuery({
    queryKey: ['explore', 'vendors', sectorId, yearStart, yearEnd, riskLevels, searchText, page],
    queryFn: () => vendorApi.getAll({
      sector_id: sectorId,
      risk_level: riskLevels.length === 1 ? (riskLevels[0] as any) : undefined,
      search: searchText || undefined,
      page,
      per_page: PAGE_SIZE,
      sort_by: 'total_value_mxn',
      sort_order: 'desc',
    }),
    enabled: entityType === 'vendor',
    staleTime: 2 * 60 * 1000,
  })

  const institutionQuery = useQuery({
    queryKey: ['explore', 'institutions', sectorId, yearStart, yearEnd, riskLevels, searchText, page],
    queryFn: () => institutionApi.getAll({
      sector_id: sectorId,
      search: searchText || undefined,
      page,
      per_page: PAGE_SIZE,
    }),
    enabled: entityType === 'institution',
    staleTime: 2 * 60 * 1000,
  })

  const isVendor = entityType === 'vendor'
  const query = isVendor ? vendorQuery : institutionQuery
  const isLoading = query.isLoading

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  if (query.error || !query.data) {
    return (
      <div className="text-center py-8 text-text-muted text-sm">
        Failed to load results
      </div>
    )
  }

  const pagination = query.data.pagination

  if (isVendor) {
    const vendors = (vendorQuery.data?.data || []) as any[]
    return (
      <div>
        <table className="w-full text-sm" role="grid">
          <thead>
            <tr className="border-b border-border/30 text-[11px] text-text-muted uppercase tracking-wider">
              <th className="text-left py-2 pr-3 font-medium">Vendor</th>
              <th className="text-right py-2 px-2 font-medium">Contracts</th>
              <th className="text-right py-2 px-2 font-medium hidden md:table-cell">Total Value</th>
              <th className="text-right py-2 px-2 font-medium">Risk</th>
              <th className="text-right py-2 pl-2 font-medium hidden lg:table-cell">DA %</th>
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {vendors.map((v: any) => {
              const riskColor = RISK_COLORS[v.risk_level as string] || RISK_COLORS.low
              return (
                <tr
                  key={v.vendor_id}
                  className="border-b border-border/10 hover:bg-background-elevated/30 transition-colors group"
                >
                  <td className="py-2 pr-3">
                    <Link
                      to={`/vendors/${v.vendor_id}`}
                      className="font-medium text-text-primary hover:text-accent transition-colors truncate block max-w-xs"
                    >
                      {v.vendor_name}
                    </Link>
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-text-secondary">
                    {formatNumber(v.total_contracts)}
                  </td>
                  <td className="text-right py-2 px-2 font-mono text-text-secondary hidden md:table-cell">
                    {formatCompactMXN(v.total_value_mxn || 0)}
                  </td>
                  <td className="text-right py-2 px-2">
                    <span
                      className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
                      style={{ color: riskColor, backgroundColor: `${riskColor}15` }}
                    >
                      {((v.avg_risk_score || 0) * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="text-right py-2 pl-2 font-mono text-text-muted text-xs hidden lg:table-cell">
                    {v.direct_award_pct != null ? `${v.direct_award_pct.toFixed(0)}%` : '–'}
                  </td>
                  <td className="pl-1">
                    <Link
                      to={`/vendors/${v.vendor_id}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`View ${v.vendor_name}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-text-muted" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <Pagination pagination={pagination} page={page} onPageChange={onPageChange} />
      </div>
    )
  }

  // Institutions view
  const institutions = (institutionQuery.data?.data || []) as any[]
  return (
    <div>
      <table className="w-full text-sm" role="grid">
        <thead>
          <tr className="border-b border-border/30 text-[11px] text-text-muted uppercase tracking-wider">
            <th className="text-left py-2 pr-3 font-medium">Institution</th>
            <th className="text-right py-2 px-2 font-medium">Contracts</th>
            <th className="text-right py-2 px-2 font-medium hidden md:table-cell">Total Value</th>
            <th className="text-right py-2 px-2 font-medium">Risk</th>
            <th className="w-6" />
          </tr>
        </thead>
        <tbody>
          {institutions.map((inst: any) => {
            const riskColor = RISK_COLORS[inst.risk_level as string] || RISK_COLORS.low
            return (
              <tr
                key={inst.institution_id}
                className="border-b border-border/10 hover:bg-background-elevated/30 transition-colors group"
              >
                <td className="py-2 pr-3">
                  <Link
                    to={`/institutions/${inst.institution_id}`}
                    className="font-medium text-text-primary hover:text-accent transition-colors truncate block max-w-xs"
                  >
                    {inst.institution_name}
                  </Link>
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-secondary">
                  {formatNumber(inst.total_contracts || 0)}
                </td>
                <td className="text-right py-2 px-2 font-mono text-text-secondary hidden md:table-cell">
                  {formatCompactMXN(inst.total_value_mxn || 0)}
                </td>
                <td className="text-right py-2 px-2">
                  <span
                    className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
                    style={{ color: riskColor, backgroundColor: `${riskColor}15` }}
                  >
                    {((inst.avg_risk_score || 0) * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="pl-1">
                  <Link
                    to={`/institutions/${inst.institution_id}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`View ${inst.institution_name}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-text-muted" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <Pagination pagination={pagination} page={page} onPageChange={onPageChange} />
    </div>
  )
}

function Pagination({
  pagination,
  page,
  onPageChange,
}: {
  pagination: { total: number; total_pages: number }
  page: number
  onPageChange: (p: number) => void
}) {
  if (!pagination || pagination.total_pages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-text-muted text-xs">
        {pagination.total.toLocaleString()} total
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-background-elevated/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 text-text-muted font-mono text-xs">
          {page} / {pagination.total_pages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pagination.total_pages}
          className="p-1.5 rounded hover:bg-background-elevated/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
