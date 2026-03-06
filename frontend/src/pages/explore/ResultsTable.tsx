import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi, institutionApi, dossierApi } from '@/api/client'
import { formatCompactMXN, formatNumber } from '@/lib/utils'
import { RISK_COLORS, SECTORS, getRiskLevelFromScore } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  UserX,
  Building,
  FolderPlus,
  Folder,
  Plus,
  Loader2,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import type { ExplorerFilters } from '@/hooks/useExplorerFilters'
import type { DossierSummary } from '@/components/AddToDossierButton'

type SortField = 'avg_risk_score' | 'total_contracts' | 'total_value_mxn' | 'direct_award_pct'
type SortOrder = 'asc' | 'desc'

const PAGE_SIZE = 25

interface ResultsTableProps {
  filters: ExplorerFilters
  page: number
  onPageChange: (page: number) => void
}

export function ResultsTable({ filters, page, onPageChange }: ResultsTableProps) {
  const { sectorId, yearStart, yearEnd, riskLevels, searchText, entityType } = filters
  const [sortField, setSortField] = useState<SortField>('avg_risk_score')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    onPageChange(1)
  }

  // Build effective risk_level param: omit only when ALL 4 levels selected (no filter needed)
  const riskLevelParam = riskLevels.length === 4 ? undefined : (riskLevels.join(',') as any)
  // Pass year filter — API accepts a single year; use yearStart as the primary filter
  const yearParam = yearStart ?? yearEnd

  const vendorQuery = useQuery({
    queryKey: ['explore', 'vendors', sectorId, yearStart, yearEnd, riskLevels, searchText, page, sortField, sortOrder],
    queryFn: () => vendorApi.getAll({
      sector_id: sectorId,
      risk_level: riskLevelParam,
      search: searchText || undefined,
      page,
      per_page: PAGE_SIZE,
      sort_by: sortField,
      sort_order: sortOrder,
      year: yearParam,
    }),
    enabled: entityType === 'vendor',
    staleTime: 2 * 60 * 1000,
  })

  const institutionQuery = useQuery({
    queryKey: ['explore', 'institutions', sectorId, yearStart, yearEnd, riskLevels, searchText, page, sortField, sortOrder],
    queryFn: () => institutionApi.getAll({
      sector_id: sectorId,
      search: searchText || undefined,
      page,
      per_page: PAGE_SIZE,
      sort_by: sortField,
      sort_order: sortOrder,
      year: yearParam,
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

  if (query.error) {
    return (
      <div className="py-10 text-center">
        <AlertCircle className="h-8 w-8 text-risk-high mx-auto mb-2 opacity-60" />
        <p className="text-sm text-text-primary mb-1">Failed to load results</p>
        <p className="text-xs text-text-muted mb-3">
          {(query.error as Error).message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => query.refetch()}
          className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    )
  }

  if (!query.data) return null

  const pagination = query.data.pagination
  const hasFilters = sectorId != null || riskLevels.length < 4 || searchText || yearStart || yearEnd

  if (!query.data.data?.length) {
    return <EmptyState entityType={entityType} hasFilters={!!hasFilters} searchText={searchText} />
  }

  const rangeStart = (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, pagination.total)

  if (isVendor) {
    const vendors = (vendorQuery.data?.data || []) as any[]
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-muted tabular-nums">
            Showing {rangeStart}–{rangeEnd} of {formatNumber(pagination.total)} vendors · sorted by risk score
          </span>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-sm" role="grid">
          <thead>
            <tr className="border-b border-border/30 text-[11px] text-text-muted uppercase tracking-wider">
              <th className="text-left py-2 pr-3 font-medium">Vendor</th>
              <SortHeader field="total_contracts" label="Contracts" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} className="text-right py-2 px-2" />
              <SortHeader field="total_value_mxn" label="Total Value" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} className="text-right py-2 px-2 hidden md:table-cell" />
              <SortHeader field="avg_risk_score" label="Risk" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} className="text-right py-2 px-2" />
              <SortHeader field="direct_award_pct" label="DA %" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} className="text-right py-2 pl-2 hidden lg:table-cell" />
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {vendors.map((v: any) => {
              const riskLevel = getRiskLevelFromScore(v.avg_risk_score ?? 0)
              const riskColor = RISK_COLORS[riskLevel]
              return (
                <VendorRow key={v.id} vendor={v} riskColor={riskColor} />
              )
            })}
          </tbody>
        </table>
        </div>
        <Pagination pagination={pagination} page={page} onPageChange={onPageChange} />
      </div>
    )
  }

  // Institutions view
  const institutions = (institutionQuery.data?.data || []) as any[]
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-text-muted tabular-nums">
          Showing {rangeStart}–{rangeEnd} of {formatNumber(pagination.total)} institutions · sorted by risk score
        </span>
      </div>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm" role="grid">
        <thead>
          <tr className="border-b border-border/30 text-[11px] text-text-muted uppercase tracking-wider">
            <th className="text-left py-2 pr-3 font-medium">Institution</th>
            <SortHeader field="total_contracts" label="Contracts" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} className="text-right py-2 px-2" />
            <SortHeader field="total_value_mxn" label="Total Value" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} className="text-right py-2 px-2 hidden md:table-cell" />
            <SortHeader field="avg_risk_score" label="Risk" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} className="text-right py-2 px-2" />
            <th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {institutions.map((inst: any) => {
            const riskLevel = getRiskLevelFromScore(inst.avg_risk_score ?? 0)
            const riskColor = RISK_COLORS[riskLevel]
            return (
              <InstitutionRow key={inst.id} institution={inst} riskColor={riskColor} />
            )
          })}
        </tbody>
      </table>
      </div>
      <Pagination pagination={pagination} page={page} onPageChange={onPageChange} />
    </div>
  )
}

// =============================================================================
// Individual rows with inline dossier action
// =============================================================================

function VendorRow({ vendor, riskColor }: { vendor: any; riskColor: string }) {
  const { t: ts } = useTranslation('sectors')
  const sector = vendor.primary_sector_id ? SECTORS.find(s => s.id === vendor.primary_sector_id) : null

  return (
    <tr
      className="border-b border-border/10 hover:bg-background-elevated/30 transition-colors group"
    >
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1.5 min-w-0">
          {sector && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: sector.color }}
              title={ts(sector.code)}
            />
          )}
          <Link
            to={`/vendors/${vendor.id}`}
            className="font-medium text-text-primary hover:text-accent transition-colors truncate block max-w-xs"
          >
            {vendor.name}
          </Link>
        </div>
        {sector && (
          <div className="ml-3 text-[10px] mt-0.5" style={{ color: sector.color }}>
            {ts(sector.code)}
          </div>
        )}
      </td>
      <td className="text-right py-2 px-2 font-mono text-text-secondary text-xs">
        {formatNumber(vendor.total_contracts)}
      </td>
      <td className="text-right py-2 px-2 font-mono text-text-secondary text-xs hidden md:table-cell">
        {formatCompactMXN(vendor.total_value_mxn || 0)}
      </td>
      <td className="text-right py-2 px-2">
        <span
          className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
          style={{ color: riskColor, backgroundColor: `${riskColor}15` }}
        >
          {((vendor.avg_risk_score || 0) * 100).toFixed(0)}%
        </span>
      </td>
      <td className="text-right py-2 pl-2 font-mono text-xs hidden lg:table-cell">
        {vendor.direct_award_pct != null ? (
          <span style={{
            color: vendor.direct_award_pct >= 90 ? '#f87171'
                 : vendor.direct_award_pct >= 70 ? '#fb923c'
                 : 'var(--color-text-muted)'
          }}>
            {vendor.direct_award_pct.toFixed(0)}%
          </span>
        ) : '–'}
      </td>
      <td className="pl-1 pr-2">
        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            to={`/vendors/${vendor.id}`}
            aria-label={`View ${vendor.name}`}
          >
            <ExternalLink className="h-3.5 w-3.5 text-text-muted hover:text-accent transition-colors" />
          </Link>
          <InlineDossierTrigger
            entityType="vendor"
            entityId={vendor.id}
            entityName={vendor.name}
          />
        </div>
      </td>
    </tr>
  )
}

function InstitutionRow({ institution, riskColor }: { institution: any; riskColor: string }) {
  const { t: ts } = useTranslation('sectors')
  const sector = institution.sector_id ? SECTORS.find(s => s.id === institution.sector_id) : null
  // InstitutionResponse uses `id` and `name` (not institution_id / institution_name)
  const instId = institution.id ?? institution.institution_id
  const instName = institution.name ?? institution.institution_name ?? '—'

  return (
    <tr
      className="border-b border-border/10 hover:bg-background-elevated/30 transition-colors group"
    >
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1.5 min-w-0">
          {sector && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: sector.color }}
              title={ts(sector.code)}
            />
          )}
          <Link
            to={`/institutions/${instId}`}
            className="font-medium text-text-primary hover:text-accent transition-colors truncate block max-w-xs"
          >
            {instName}
          </Link>
        </div>
        {sector && (
          <div className="ml-3 text-[10px] mt-0.5" style={{ color: sector.color }}>
            {ts(sector.code)}
          </div>
        )}
      </td>
      <td className="text-right py-2 px-2 font-mono text-text-secondary text-xs">
        {formatNumber(institution.total_contracts || 0)}
      </td>
      <td className="text-right py-2 px-2 font-mono text-text-secondary text-xs hidden md:table-cell">
        {formatCompactMXN(institution.total_amount_mxn || institution.total_value_mxn || 0)}
      </td>
      <td className="text-right py-2 px-2">
        <span
          className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
          style={{ color: riskColor, backgroundColor: `${riskColor}15` }}
        >
          {((institution.avg_risk_score || 0) * 100).toFixed(0)}%
        </span>
      </td>
      <td className="pl-1 pr-2">
        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            to={`/institutions/${instId}`}
            aria-label={`View ${instName}`}
          >
            <ExternalLink className="h-3.5 w-3.5 text-text-muted hover:text-accent transition-colors" />
          </Link>
          <InlineDossierTrigger
            entityType="institution"
            entityId={instId}
            entityName={instName}
          />
        </div>
      </td>
    </tr>
  )
}

// Compact inline dossier trigger — icon-only popover for table rows
function InlineDossierTrigger({
  entityType,
  entityId,
  entityName,
}: {
  entityType: 'vendor' | 'institution'
  entityId: number
  entityName: string
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [success, setSuccess] = useState<number | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const { data: dossiers, isLoading } = useQuery({
    queryKey: ['dossiers', 'list'],
    queryFn: () => dossierApi.list(),
    enabled: open,
    staleTime: 30 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: ({ dossierId }: { dossierId: number }) =>
      dossierApi.addItem(dossierId, {
        item_type: entityType,
        item_id: entityId,
        item_name: entityName,
      }),
    onSuccess: (_data, { dossierId }) => {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] })
      setSuccess(dossierId)
      setTimeout(() => { setSuccess(null); setOpen(false) }, 1200)
    },
  })

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const activeDossiers = (dossiers ?? []).filter((d: DossierSummary) => d.status === 'active')

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(prev => !prev)}
        title={`Add ${entityName} to dossier`}
        aria-label={`Add ${entityName} to dossier`}
        className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
      >
        <FolderPlus className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-border/60 bg-background-card shadow-xl"
          role="menu"
        >
          <div className="px-3 py-1.5 border-b border-border/40">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Add to dossier</p>
          </div>
          <div className="max-h-[160px] overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
              </div>
            ) : activeDossiers.length === 0 ? (
              <p className="text-xs text-text-muted px-3 py-2 text-center">No dossiers yet</p>
            ) : (
              activeDossiers.map((d: DossierSummary) => {
                const isOk = success === d.id
                const isPending = addMutation.isPending && addMutation.variables?.dossierId === d.id
                return (
                  <button
                    key={d.id}
                    role="menuitem"
                    disabled={isPending || isOk}
                    onClick={() => addMutation.mutate({ dossierId: d.id })}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-background-elevated/60 transition-colors disabled:opacity-60"
                  >
                    {isOk ? (
                      <CheckCircle className="h-3 w-3 text-risk-low shrink-0" />
                    ) : isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin text-accent shrink-0" />
                    ) : (
                      <Folder className="h-3 w-3 shrink-0" style={{ color: d.color }} />
                    )}
                    <span className="truncate text-text-secondary">{d.name}</span>
                  </button>
                )
              })
            )}
          </div>
          <div className="border-t border-border/40 py-1">
            <button
              role="menuitem"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-accent hover:bg-accent/5 transition-colors"
            >
              <Plus className="h-3 w-3" />
              New dossier
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Sortable column header
// =============================================================================

function SortHeader({
  field,
  label,
  sortField,
  sortOrder,
  onSort,
  className = '',
}: {
  field: SortField
  label: string
  sortField: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = sortField === field
  return (
    <th className={`font-medium cursor-pointer select-none ${className}`}>
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-0.5 hover:text-text-primary transition-colors uppercase tracking-wider text-[11px]"
      >
        {label}
        {isActive ? (
          sortOrder === 'desc'
            ? <ArrowDown className="h-2.5 w-2.5 ml-0.5" />
            : <ArrowUp className="h-2.5 w-2.5 ml-0.5" />
        ) : (
          <ArrowUpDown className="h-2.5 w-2.5 ml-0.5 opacity-30" />
        )}
      </button>
    </th>
  )
}

// =============================================================================
// Empty state with actionable guidance
// =============================================================================

function EmptyState({
  entityType,
  hasFilters,
  searchText,
}: {
  entityType: 'vendor' | 'institution'
  hasFilters: boolean
  searchText: string
}) {
  const Icon = entityType === 'vendor' ? UserX : Building

  if (hasFilters) {
    return (
      <div className="py-12 text-center space-y-3">
        <Icon className="h-8 w-8 text-text-muted mx-auto opacity-40" />
        <div>
          <p className="text-sm text-text-primary font-medium">No {entityType}s match your current filters</p>
          <p className="text-xs text-text-muted mt-1">Try broadening your search:</p>
        </div>
        <ul className="text-xs text-text-muted space-y-1 max-w-xs mx-auto text-left list-disc list-inside">
          {searchText && (
            <li>Remove the search term — try a shorter or different name</li>
          )}
          <li>Include more risk levels (click Critical / High in the strip above)</li>
          <li>Click a different sector in the treemap, or clear the sector filter</li>
          <li>Drag a wider year range in the time series chart</li>
        </ul>
      </div>
    )
  }

  return (
    <div className="py-12 text-center">
      <Icon className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-40" />
      <p className="text-sm text-text-muted">No {entityType}s found</p>
    </div>
  )
}

// =============================================================================
// Pagination
// =============================================================================

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
