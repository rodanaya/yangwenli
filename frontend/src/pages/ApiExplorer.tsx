/**
 * ApiExplorer — static reference page listing all RUBLI API endpoints
 * Route: /api-explorer
 */
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ChevronDown, Copy, Check, Code2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ============================================================================
// Types
// ============================================================================

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

interface Endpoint {
  method: HttpMethod
  path: string
  description: string
  params?: string[]
}

interface EndpointGroup {
  id: string
  label: string
  endpoints: Endpoint[]
}

// ============================================================================
// Endpoint data — hardcoded static reference
// ============================================================================

const API_GROUPS: EndpointGroup[] = [
  {
    id: 'contracts',
    label: 'Contracts',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/contracts',
        description: 'Paginated list of contracts with filters.',
        params: ['page', 'per_page', 'sector_id', 'year', 'risk_level', 'search', 'vendor_id', 'institution_id'],
      },
      {
        method: 'GET',
        path: '/api/v1/contracts/{id}',
        description: 'Full contract details by ID including risk score and z-features.',
      },
      {
        method: 'GET',
        path: '/api/v1/contracts/statistics',
        description: 'Aggregate contract statistics with optional filters (count, value, risk).',
        params: ['sector_id', 'year', 'vendor_id', 'institution_id'],
      },
      {
        method: 'GET',
        path: '/api/v1/contracts/compare',
        description: 'Compare a batch of contracts by ID.',
        params: ['ids (comma-separated)'],
      },
      {
        method: 'GET',
        path: '/api/v1/contracts/{id}/risk-explain',
        description: 'Per-feature risk score contribution breakdown for a single contract (v6.0).',
      },
    ],
  },
  {
    id: 'vendors',
    label: 'Vendors',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/vendors',
        description: 'Paginated vendor list with optional search and filters.',
        params: ['page', 'per_page', 'search', 'sector_id', 'year'],
      },
      {
        method: 'GET',
        path: '/api/v1/vendors',
        description: 'Vendor list with search — pass ?search=q for quick name lookup (up to 10 results with per_page=10).',
        params: ['search', 'per_page', 'page', 'sector_id', 'year'],
      },
      {
        method: 'GET',
        path: '/api/v1/vendors/top',
        description: 'Top vendors ranked by value, contract count, or risk score.',
        params: ['by (value|count|risk)', 'limit', 'sector_id', 'year'],
      },
      {
        method: 'GET',
        path: '/api/v1/vendors/{id}',
        description: 'Full vendor profile including metrics, top institutions, and name variants.',
      },
      {
        method: 'GET',
        path: '/api/v1/vendors/{id}/contracts',
        description: 'Paginated contracts for a specific vendor.',
        params: ['page', 'per_page', 'year', 'risk_level'],
      },
      {
        method: 'GET',
        path: '/api/v1/vendors/{id}/risk-profile',
        description: 'Risk profile with contract counts by level and top risk factors.',
      },
      {
        method: 'GET',
        path: '/api/v1/vendors/{id}/institutions',
        description: 'Institutions this vendor has contracted with.',
        params: ['per_page'],
      },
      {
        method: 'GET',
        path: '/api/v1/vendors/{id}/network',
        description: 'Co-bidding network graph for the vendor.',
        params: ['depth', 'min_shared_procedures'],
      },
      {
        method: 'GET',
        path: '/api/v1/vendors/{id}/risk-waterfall',
        description: 'Per-feature z-score contribution breakdown for risk score (v6.0 model).',
      },
      {
        method: 'GET',
        path: '/api/v1/vendors/{id}/risk-timeline',
        description: 'Year-by-year risk score and contract count timeline.',
      },
      {
        method: 'GET',
        path: '/api/v1/vendors/{id}/footprint',
        description: 'Cross-sector, cross-institution procurement footprint.',
      },
      {
        method: 'GET',
        path: '/api/v1/vendors/{id}/external-flags',
        description: 'SFP sanctions, SAT EFOS, and RUPC flags for this vendor.',
      },
    ],
  },
  {
    id: 'institutions',
    label: 'Institutions',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/institutions',
        description: 'Paginated institution list with optional search and filters.',
        params: ['page', 'per_page', 'search', 'sector_id', 'year'],
      },
      {
        method: 'GET',
        path: '/api/v1/institutions/{id}',
        description: 'Full institution profile including spending, risk, and sector breakdown.',
      },
      {
        method: 'GET',
        path: '/api/v1/institutions/{id}/vendors',
        description: 'Top vendors that contracted with this institution.',
        params: ['per_page'],
      },
      {
        method: 'GET',
        path: '/api/v1/institutions/top',
        description: 'Top institutions ranked by spending, contracts, or risk.',
        params: ['by (spending|contracts|risk)', 'limit', 'year'],
      },
      {
        method: 'GET',
        path: '/api/v1/analysis/institution-rankings',
        description: 'Institution health overview with risk grades and procurement quality scores.',
        params: ['sector_id', 'limit'],
      },
      {
        method: 'GET',
        path: '/api/v1/institutions/{id}/risk-profile',
        description: 'Risk profile with distribution by level and top risk factors.',
      },
      {
        method: 'GET',
        path: '/api/v1/institutions/{id}/risk-timeline',
        description: 'Year-by-year risk score evolution for this institution.',
      },
    ],
  },
  {
    id: 'risk',
    label: 'Risk & Analysis',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/analysis/overview',
        description: 'High-level risk overview: total contracts, high-risk count, sector breakdown.',
      },
      {
        method: 'GET',
        path: '/api/v1/analysis/money-flow',
        description: 'Sector-to-vendor money flow data for Sankey/flow visualizations.',
        params: ['year', 'sector_id', 'limit'],
      },
      {
        method: 'GET',
        path: '/api/v1/analysis/patterns/counts',
        description: 'Pre-computed counts of critical fraud patterns: single bid, year-end, co-bidding, etc.',
      },
      {
        method: 'GET',
        path: '/api/v1/analysis/year-over-year',
        description: 'Annual procurement trends: total value, contract count, average risk score.',
        params: ['sector_id', 'year_start', 'year_end'],
      },
      {
        method: 'GET',
        path: '/api/v1/analysis/direct-award-rate',
        description: 'Direct award rates by sector and year. Cached 2h.',
        params: ['sector_id', 'year'],
      },
      {
        method: 'GET',
        path: '/api/v1/analysis/single-bid-rate',
        description: 'Single-bid rates (competitive procedures with only 1 bidder). Cached 2h.',
        params: ['sector_id', 'year'],
      },
    ],
  },
  {
    id: 'sectors',
    label: 'Sectors',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/sectors',
        description: 'All 12 sectors with aggregate statistics.',
      },
      {
        method: 'GET',
        path: '/api/v1/sectors/{id}',
        description: 'Sector detail with spending, risk distribution, and top vendors.',
      },
      {
        method: 'GET',
        path: '/api/v1/sectors/{id}/top-vendors',
        description: 'Top vendors by spending or risk within a sector.',
        params: ['by (value|risk)', 'limit'],
      },
    ],
  },
  {
    id: 'search',
    label: 'Search',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/search',
        description: 'Federated full-text search across vendors, institutions, and contracts.',
        params: ['q', 'type (vendor|institution|contract|all)', 'limit'],
      },
    ],
  },
  {
    id: 'stats',
    label: 'Stats',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/stats/dashboard/fast',
        description: 'Pre-computed dashboard stats in a single fast response (<100ms).',
      },
      {
        method: 'GET',
        path: '/api/v1/stats/data-quality',
        description: 'Data quality report: field completeness by structure/period, grade distribution.',
      },
      {
        method: 'GET',
        path: '/api/v1/analysis/year-summary/{year}',
        description: 'Pre-computed statistics for a specific year (2002–2025).',
      },
    ],
  },
  {
    id: 'subnational',
    label: 'Subnational',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/subnational/states',
        description: 'All Mexican states with federally-funded procurement totals.',
      },
      {
        method: 'GET',
        path: '/api/v1/subnational/states/{code}',
        description: 'State detail: spending, risk, dominant institutions (LAASSP Art. 1 §6 scope).',
      },
      {
        method: 'GET',
        path: '/api/v1/subnational/states/{code}/vendors',
        description: 'Top vendors in a state by federally-funded contract value.',
        params: ['limit'],
      },
    ],
  },
  {
    id: 'feedback',
    label: 'Feedback',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/feedback',
        description: 'List submitted risk score feedback items.',
        params: ['page', 'per_page', 'entity_type'],
      },
      {
        method: 'POST',
        path: '/api/v1/feedback',
        description: 'Submit risk score feedback (agree/disagree + reason) for a contract or vendor.',
      },
      {
        method: 'DELETE',
        path: '/api/v1/feedback/{id}',
        description: 'Delete a specific feedback submission.',
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace / Dossiers',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/workspace/dossiers',
        description: 'List all investigation dossiers in the current workspace.',
      },
      {
        method: 'POST',
        path: '/api/v1/workspace/dossiers',
        description: 'Create a new dossier with name and optional description.',
      },
      {
        method: 'GET',
        path: '/api/v1/workspace/dossiers/{id}',
        description: 'Get a specific dossier with all its items.',
      },
      {
        method: 'PUT',
        path: '/api/v1/workspace/dossiers/{id}',
        description: 'Update dossier name or description.',
      },
      {
        method: 'DELETE',
        path: '/api/v1/workspace/dossiers/{id}',
        description: 'Delete a dossier and all its items.',
      },
      {
        method: 'POST',
        path: '/api/v1/workspace/dossiers/{id}/items',
        description: 'Add a vendor, institution, or contract to a dossier.',
      },
      {
        method: 'DELETE',
        path: '/api/v1/workspace/dossiers/{id}/items/{itemId}',
        description: 'Remove an item from a dossier.',
      },
    ],
  },
]

// ============================================================================
// Method badge
// ============================================================================
const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  POST: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/25',
  PATCH: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
}

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold tracking-wide font-mono flex-shrink-0',
        METHOD_STYLES[method]
      )}
      aria-label={`HTTP ${method}`}
    >
      {method}
    </span>
  )
}

// ============================================================================
// Endpoint row
// ============================================================================
function EndpointRow({ ep }: { ep: Endpoint }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 py-3 border-b border-border/30 last:border-0">
      <div className="flex items-start gap-2 min-w-0">
        <MethodBadge method={ep.method} />
        <code className="text-xs font-mono text-text-primary break-all leading-relaxed">
          {ep.path}
        </code>
      </div>
      <div className="flex-1 sm:pl-2">
        <p className="text-xs text-text-secondary leading-relaxed">{ep.description}</p>
        {ep.params && ep.params.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {ep.params.map((p) => (
              <span
                key={p}
                className="text-[10px] font-mono bg-background-card border border-border/50 text-text-muted px-1.5 py-0.5 rounded"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Accordion group
// ============================================================================
function EndpointGroup({
  group,
  defaultOpen,
}: {
  group: EndpointGroup
  defaultOpen?: boolean
}) {
  const { t } = useTranslation('apiexplorer')
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-sidebar-hover/30 transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`group-${group.id}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text-primary">{group.label}</span>
          <span className="text-[10px] text-text-muted font-mono bg-background-card border border-border/50 px-1.5 py-0.5 rounded">
            {t('endpointLabel_other', { count: group.endpoints.length })}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-text-muted transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <CardContent id={`group-${group.id}`} className="pt-0 pb-2">
          <div>
            {group.endpoints.map((ep) => (
              <EndpointRow key={`${ep.method}-${ep.path}`} ep={ep} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// ============================================================================
// Base URL copy button
// ============================================================================
const BASE_URL_LOCAL = 'http://localhost:8001/api/v1'
const BASE_URL_PROD = 'https://api.rubli.mx/api/v1'

function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useTranslation('apiexplorer')
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-7 text-xs gap-1.5"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? t('copied') : label}
    </Button>
  )
}

// ============================================================================
// Main page
// ============================================================================
export default function ApiExplorer() {
  const { t } = useTranslation('apiexplorer')
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? API_GROUPS.map((g) => ({
        ...g,
        endpoints: g.endpoints.filter(
          (ep) =>
            ep.path.toLowerCase().includes(query.toLowerCase()) ||
            ep.description.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter((g) => g.endpoints.length > 0)
    : API_GROUPS

  const totalEndpoints = API_GROUPS.reduce((s, g) => s + g.endpoints.length, 0)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Code2 className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
        </div>
        <p className="text-sm text-text-muted mb-4">
          {t('subtitle')} {t('endpointCount', { n: totalEndpoints, groups: API_GROUPS.length })}
        </p>

        {/* Base URL notice */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <p className="text-xs font-medium text-text-secondary mb-2">{t('baseUrl')}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center justify-between gap-2 bg-background-card rounded border border-border px-3 py-1.5">
                <code className="text-xs font-mono text-text-muted">{BASE_URL_PROD}</code>
                <CopyButton text={BASE_URL_PROD} label={t('production')} />
              </div>
              <div className="flex-1 flex items-center justify-between gap-2 bg-background-card rounded border border-border px-3 py-1.5">
                <code className="text-xs font-mono text-text-muted">{BASE_URL_LOCAL}</code>
                <CopyButton text={BASE_URL_LOCAL} label={t('local')} />
              </div>
            </div>
            <p className="text-[10px] text-text-muted/60 mt-2">
              {t('responseNote', { data: 'data[]', total: 'total', pagination: 'pagination' })}
            </p>
          </CardContent>
        </Card>

        {/* Search filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            placeholder={t('filterPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background-card border border-border rounded-md text-sm text-text-primary placeholder:text-text-muted/50 outline-none focus:ring-1 focus:ring-accent/50"
            aria-label={t('filterLabel')}
          />
        </div>
      </div>

      {/* Endpoint groups */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted text-sm">
          {t('noMatch', { query })}
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="API endpoint groups">
          {filtered.map((group, i) => (
            <div key={group.id} role="listitem">
              <EndpointGroup group={group} defaultOpen={i === 0 && !query} />
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-8 text-xs text-text-muted/60 text-center space-y-1">
        <p>{t('corsNote')}</p>
        <p>{t('dataNote')}</p>
      </div>
    </div>
  )
}
