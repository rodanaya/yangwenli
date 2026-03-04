import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { analysisApi } from '@/api/client'
import { SankeyDiagram } from '@/components/SankeyDiagram'
import type { SankeyNodeSelected } from '@/components/SankeyDiagram'
import { formatCompactMXN } from '@/lib/utils'
import { SECTORS } from '@/lib/constants'
import { GitBranch, ArrowRight, Building2, Users, TrendingUp, DollarSign, X, AlertTriangle, Info, List, BarChart2, ChevronUp, ChevronDown } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const YEARS = Array.from({ length: 24 }, (_, i) => 2025 - i)

type ViewMode = 'diagram' | 'table'
type SortKey = 'value' | 'contracts' | 'avgRisk'
type SortDir = 'desc' | 'asc'

const RISK_LEVELS = [
  { key: 'critical', color: '#f87171' },
  { key: 'high', color: '#fb923c' },
  { key: 'medium', color: '#fbbf24' },
  { key: 'low', color: '#4ade80' },
]

const RISK_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function getRiskLabel(avgRisk: number): string {
  if (avgRisk >= 0.5) return 'critical'
  if (avgRisk >= 0.3) return 'high'
  if (avgRisk >= 0.1) return 'medium'
  return 'low'
}

// Skeleton placeholder that mimics Sankey shape
function SankeySkeleton() {
  return (
    <svg width="100%" height="320" className="opacity-10" aria-hidden="true">
      {/* Left column nodes */}
      {[40, 100, 170, 230, 280].map((y, i) => (
        <rect key={`l${i}`} x={20} y={y} width={14} height={40 + i * 6} rx={2} fill="#64748b" />
      ))}
      {/* Right column nodes */}
      {[20, 80, 140, 200, 260, 300].map((y, i) => (
        <rect key={`r${i}`} x={560} y={y} width={14} height={30 + i * 4} rx={2} fill="#64748b" />
      ))}
      {/* Curved paths */}
      <path d="M34,60 C290,60 290,40 560,40" stroke="#64748b" strokeWidth={8} fill="none" />
      <path d="M34,120 C290,120 290,100 560,100" stroke="#64748b" strokeWidth={12} fill="none" />
      <path d="M34,190 C290,190 290,160 560,160" stroke="#64748b" strokeWidth={6} fill="none" />
      <path d="M34,120 C290,120 290,220 560,220" stroke="#64748b" strokeWidth={5} fill="none" />
      <path d="M34,250 C290,250 290,280 560,280" stroke="#64748b" strokeWidth={10} fill="none" />
      <path d="M34,300 C290,300 290,320 560,320" stroke="#64748b" strokeWidth={4} fill="none" />
    </svg>
  )
}

export default function MoneyFlow() {
  const { t } = useTranslation('moneyflow')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const [sectorId, setSectorId] = useState<number | undefined>(undefined)
  const [year, setYear] = useState<number | undefined>(2024)
  const [riskFilter, setRiskFilter] = useState<string[]>(['critical', 'high', 'medium', 'low'])
  const [selectedNode, setSelectedNode] = useState<SankeyNodeSelected | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('diagram')
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const containerRef = useRef<HTMLDivElement>(null)
  const [diagramWidth, setDiagramWidth] = useState(860)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setDiagramWidth(Math.max(600, w - 48))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const { data, isLoading, error } = useQuery({
    queryKey: ['money-flow', sectorId, year],
    queryFn: () => analysisApi.getMoneyFlow(year, sectorId),
    staleTime: 10 * 60 * 1000,
  })

  const handleRiskToggle = (level: string) => {
    setRiskFilter(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    )
  }

  // Navigate to contracts filtered by the clicked flow (institution -> vendor)
  const handleFlowClick = useCallback((sourceId: string, targetId: string) => {
    // sourceId is like "inst-123", targetId is like "vend-456"
    const instId = sourceId.replace('inst-', '')
    const vendId = targetId.replace('vend-', '')
    const params = new URLSearchParams()
    if (instId) params.set('institution_id', instId)
    if (vendId) params.set('vendor_id', vendId)
    if (year) params.set('year', String(year))
    navigate(`/contracts?${params.toString()}`)
  }, [navigate, year])

  // Navigate to contracts filtered by selected node
  const handleNodeDrillDown = useCallback(() => {
    if (!selectedNode) return
    const params = new URLSearchParams()
    if (selectedNode.type === 'institution') {
      params.set('institution_id', selectedNode.id.replace('inst-', ''))
    } else {
      params.set('vendor_id', selectedNode.id.replace('vend-', ''))
    }
    if (year) params.set('year', String(year))
    navigate(`/contracts?${params.toString()}`)
  }, [selectedNode, navigate, year])

  const handleNodeSelect = useCallback((node: SankeyNodeSelected) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
  }, [])

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
      else setSortDir('desc')
      return key
    })
  }, [])

  const { nodes, links } = useMemo(() => {
    if (!data?.flows?.length) return { nodes: [], links: [] }

    const instMap = new Map<string, { name: string; riskLevel: string; total: number; contracts: number }>()
    const vendMap = new Map<string, { name: string; riskLevel: string; total: number; contracts: number }>()

    for (const f of data.flows) {
      const iKey = `inst-${f.source_id}`
      const vKey = `vend-${f.target_id}`

      // Determine risk level from avg_risk
      const riskLevel = f.avg_risk != null ? getRiskLabel(f.avg_risk) : 'medium'

      const prev = instMap.get(iKey)
      instMap.set(iKey, {
        name: f.source_name,
        riskLevel: prev ? (prev.riskLevel === 'critical' ? 'critical' : riskLevel) : riskLevel,
        total: (prev?.total ?? 0) + f.value,
        contracts: (prev?.contracts ?? 0) + f.contracts,
      })

      const vprev = vendMap.get(vKey)
      vendMap.set(vKey, {
        name: f.target_name,
        riskLevel: vprev ? (vprev.riskLevel === 'critical' ? 'critical' : riskLevel) : riskLevel,
        total: (vprev?.total ?? 0) + f.value,
        contracts: (vprev?.contracts ?? 0) + f.contracts,
      })
    }

    const allNodes = [
      ...[...instMap.entries()].map(([id, d]) => ({
        id, type: 'institution' as const, name: d.name, riskLevel: d.riskLevel, value: d.total,
      })),
      ...[...vendMap.entries()].map(([id, d]) => ({
        id, type: 'vendor' as const, name: d.name, riskLevel: d.riskLevel, value: d.total,
      })),
    ].filter(n => riskFilter.includes(n.riskLevel))

    const nodeIds = new Set(allNodes.map(n => n.id))

    const sankeyLinks = data.flows
      .filter(f => nodeIds.has(`inst-${f.source_id}`) && nodeIds.has(`vend-${f.target_id}`))
      .map(f => ({
        source: `inst-${f.source_id}`,
        target: `vend-${f.target_id}`,
        value: f.value,
        contractCount: f.contracts,
        avgRisk: f.avg_risk ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 80)

    return { nodes: allNodes, links: sankeyLinks }
  }, [data, riskFilter])

  const totalValue = useMemo(() => links.reduce((s, l) => s + l.value, 0), [links])
  const totalContracts = useMemo(() => links.reduce((s, l) => s + l.contractCount, 0), [links])
  const uniqueInstitutions = useMemo(
    () => new Set(links.map(l => l.source)).size,
    [links]
  )
  const uniqueVendors = useMemo(
    () => new Set(links.map(l => l.target)).size,
    [links]
  )

  // Table view rows: enrich links with node names, then sort
  const tableRows = useMemo(() => {
    const rows = links.map(l => {
      const srcNode = nodes.find(n => n.id === l.source)
      const tgtNode = nodes.find(n => n.id === l.target)
      return {
        ...l,
        sourceName: srcNode?.name ?? l.source,
        targetName: tgtNode?.name ?? l.target,
        sourceRisk: srcNode?.riskLevel ?? 'unknown',
        targetRisk: tgtNode?.riskLevel ?? 'unknown',
      }
    })
    rows.sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1
      if (sortKey === 'value')    return dir * (a.value - b.value)
      if (sortKey === 'contracts') return dir * (a.contractCount - b.contractCount)
      return dir * (a.avgRisk - b.avgRisk)
    })
    return rows
  }, [links, nodes, sortKey, sortDir])

  // Compute high-risk flow percentage
  const highRiskValue = useMemo(
    () => links.filter(l => l.avgRisk >= 0.3).reduce((s, l) => s + l.value, 0),
    [links]
  )
  const highRiskPct = totalValue > 0 ? (highRiskValue / totalValue) * 100 : 0

  // Top 5 suspicious flows by avg risk score, then by value
  const topSuspiciousFlows = useMemo(
    () =>
      [...links]
        .filter(l => l.avgRisk >= 0.3)
        .sort((a, b) => b.avgRisk - a.avgRisk || b.value - a.value)
        .slice(0, 5)
        .map(l => {
          const srcNode = nodes.find(n => n.id === l.source)
          const tgtNode = nodes.find(n => n.id === l.target)
          return { ...l, sourceName: srcNode?.name ?? l.source, targetName: tgtNode?.name ?? l.target }
        }),
    [links, nodes]
  )

  const showDiagram = !isLoading && nodes.length > 0 && links.length > 0
  const showEmpty = !isLoading && (!!error || !data?.flows?.length)
  const showNoRiskMatch = !isLoading && nodes.length === 0 && !!data?.flows?.length

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary font-mono tracking-tight">{t('pageTitle')}</h1>
        <p className="text-sm text-text-muted mt-1">
          {t('pageSubtitle')}
        </p>
      </div>

      {/* Summary Stats Bar */}
      {showDiagram && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-lg bg-white/5 border border-border/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <span className="text-xs text-text-muted uppercase tracking-wider">Total Flow</span>
            </div>
            <div className="text-xl font-bold font-mono text-text-primary">
              {formatCompactMXN(totalValue)}
            </div>
          </div>
          {/* High-risk flow stat — always visible, not conditional on threshold */}
          <div className="rounded-lg bg-red-500/8 border border-red-500/25 p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
              <span className="text-xs text-red-400 uppercase tracking-wider">High-Risk Flow</span>
            </div>
            <div className="text-xl font-bold font-mono text-red-300">
              {formatCompactMXN(highRiskValue)}
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {highRiskPct.toFixed(0)}% of total · avg risk ≥ 30%
            </div>
          </div>
          <div className="rounded-lg bg-white/5 border border-border/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <span className="text-xs text-text-muted uppercase tracking-wider">Contracts</span>
            </div>
            <div className="text-xl font-bold font-mono text-text-primary">
              {totalContracts.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-white/5 border border-border/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <span className="text-xs text-text-muted uppercase tracking-wider">Institutions</span>
            </div>
            <div className="text-xl font-bold font-mono text-text-primary">
              {uniqueInstitutions.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-white/5 border border-border/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
              <span className="text-xs text-text-muted uppercase tracking-wider">Vendors</span>
            </div>
            <div className="text-xl font-bold font-mono text-text-primary">
              {uniqueVendors.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-background-elevated border border-border/30 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={sectorId ? String(sectorId) : 'all'}
            onValueChange={v => { setSectorId(v === 'all' ? undefined : Number(v)); setSelectedNode(null) }}
          >
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder={t('filters.allSectors')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allSectors')}</SelectItem>
              {SECTORS.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={year ? String(year) : 'all'}
            onValueChange={v => { setYear(v === 'all' ? undefined : Number(v)); setSelectedNode(null) }}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder={t('filters.allYears')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allYears')}</SelectItem>
              {YEARS.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1.5 items-center flex-wrap">
            <span className="text-xs text-text-muted">{t('riskLabel')}</span>
            {RISK_LEVELS.map(r => (
              <button
                key={r.key}
                onClick={() => handleRiskToggle(r.key)}
                className="px-2 py-0.5 rounded text-xs font-medium border transition-all"
                aria-pressed={riskFilter.includes(r.key)}
                style={
                  riskFilter.includes(r.key)
                    ? { backgroundColor: r.color, borderColor: r.color, color: '#0f172a' }
                    : { borderColor: 'rgb(71 85 105 / 0.4)', color: 'rgb(148 163 184)', opacity: 0.5 }
                }
              >
                {tc(r.key)}
              </button>
            ))}
          </div>

          {/* View mode toggle */}
          <div className="ml-auto flex items-center gap-1 rounded-md border border-border/30 p-0.5 bg-background/40">
            <button
              onClick={() => setViewMode('diagram')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'diagram'
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              aria-pressed={viewMode === 'diagram'}
            >
              <BarChart2 className="h-3.5 w-3.5" aria-hidden="true" />
              Diagram
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-accent/20 text-accent'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              aria-pressed={viewMode === 'table'}
            >
              <List className="h-3.5 w-3.5" aria-hidden="true" />
              Table
            </button>
          </div>
        </div>

        {totalValue > 0 && (
          <p className="text-xs text-text-muted">
            {t('showingFlows', { count: links.length, total: formatCompactMXN(totalValue), nodes: nodes.length })}
            {selectedNode && (
              <span className="ml-2 text-cyan-400">
                — click a node to deselect, or a flow to open contracts
              </span>
            )}
          </p>
        )}
      </div>

      {/* Selected node detail panel */}
      {selectedNode && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 relative">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-3 right-3 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Dismiss node detail"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3">
            {selectedNode.type === 'institution'
              ? <Building2 className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              : <Users className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-text-primary">{selectedNode.name}</h3>
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: RISK_LEVELS.find(r => r.key === selectedNode.riskLevel)?.color + '33',
                    color: RISK_LEVELS.find(r => r.key === selectedNode.riskLevel)?.color,
                  }}
                >
                  {RISK_LABELS[selectedNode.riskLevel] ?? selectedNode.riskLevel} risk
                </span>
                <span className="text-xs text-text-muted capitalize">{selectedNode.type}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-text-muted">
                <span>
                  <span className="font-mono font-medium text-text-secondary">
                    {formatCompactMXN(selectedNode.totalValue)}
                  </span>
                  {' '}total flow
                </span>
                <span>
                  <span className="font-mono font-medium text-text-secondary">
                    {selectedNode.contractCount.toLocaleString()}
                  </span>
                  {' '}contracts (in visible flows)
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={handleNodeDrillDown}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
                  aria-label={`View all contracts for ${selectedNode.name}`}
                >
                  View all contracts
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
                {selectedNode.type === 'vendor' && (
                  <button
                    onClick={() => navigate(`/vendors/${selectedNode.id.replace('vend-', '')}`)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2"
                    aria-label={`Open vendor profile for ${selectedNode.name}`}
                  >
                    <Users className="h-3 w-3" aria-hidden="true" />
                    Vendor profile
                  </button>
                )}
                {selectedNode.type === 'institution' && (
                  <button
                    onClick={() => navigate(`/institutions/${selectedNode.id.replace('inst-', '')}`)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2"
                    aria-label={`Open institution profile for ${selectedNode.name}`}
                  >
                    <Building2 className="h-3 w-3" aria-hidden="true" />
                    Institution profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diagram */}
      {viewMode === 'diagram' && (
        <div ref={containerRef} className="bg-background-elevated border border-border/30 rounded-lg p-6">
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-text-muted text-sm pb-2">
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" aria-hidden="true" />
                {t('loading')}
              </div>
              <SankeySkeleton />
            </div>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center justify-center gap-3 text-center px-6 py-8">
              <div className="relative">
                <SankeySkeleton />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <GitBranch className="h-10 w-10 text-text-muted/60" aria-hidden="true" />
                  <p className="text-sm font-medium text-text-secondary">{t('emptyMessage')}</p>
                  <p className="text-xs text-text-muted max-w-xs">
                    {t('emptyHint')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {showNoRiskMatch && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
              <GitBranch className="h-10 w-10 text-text-muted/40" aria-hidden="true" />
              <p className="text-sm font-medium text-text-secondary">{t('noRiskMatch')}</p>
              <p className="text-xs text-text-muted max-w-xs">
                {t('noRiskMatchHint')}
              </p>
            </div>
          )}

          {showDiagram && (
            <SankeyDiagram
              nodes={nodes}
              links={links}
              width={diagramWidth}
              height={Math.min(900, Math.max(500, nodes.length * 16))}
              onFlowClick={handleFlowClick}
              onNodeClick={handleNodeSelect}
              selectedNodeId={selectedNode?.id}
            />
          )}
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <div className="bg-background-elevated border border-border/30 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-text-muted text-sm p-12">
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" aria-hidden="true" />
              {t('loading')}
            </div>
          ) : tableRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
              <GitBranch className="h-8 w-8 text-text-muted/40" aria-hidden="true" />
              <p className="text-sm text-text-muted">{t('emptyMessage')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-background/60">
                    <th className="text-left px-4 py-2.5 font-medium text-text-muted w-6">#</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-muted">Institution</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-muted">Vendor</th>
                    {(['value', 'contracts', 'avgRisk'] as SortKey[]).map(key => (
                      <th key={key} className="text-right px-3 py-2.5 font-medium text-text-muted">
                        <button
                          onClick={() => handleSort(key)}
                          className="flex items-center gap-1 ml-auto hover:text-text-primary transition-colors"
                        >
                          {key === 'value' ? 'Amount' : key === 'contracts' ? 'Contracts' : 'Avg Risk'}
                          {sortKey === key
                            ? sortDir === 'desc'
                              ? <ChevronDown className="h-3 w-3" />
                              : <ChevronUp className="h-3 w-3" />
                            : <span className="h-3 w-3" />}
                        </button>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => {
                    const riskColor =
                      row.avgRisk >= 0.5 ? '#f87171' :
                      row.avgRisk >= 0.3 ? '#fb923c' :
                      row.avgRisk >= 0.1 ? '#fbbf24' :
                      '#4ade80'
                    const isHighRisk = row.avgRisk >= 0.3
                    return (
                      <tr
                        key={i}
                        className={`border-b border-border/10 hover:bg-white/4 transition-colors cursor-pointer group ${
                          isHighRisk ? 'bg-red-500/3' : ''
                        }`}
                        onClick={() => handleFlowClick(row.source, row.target)}
                        title={`Click to view contracts: ${row.sourceName} → ${row.targetName}`}
                      >
                        <td className="px-4 py-2.5 text-text-muted font-mono">{i + 1}</td>
                        <td className="px-3 py-2.5 max-w-[240px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: RISK_LEVELS.find(r => r.key === row.sourceRisk)?.color ?? '#64748b' }}
                              aria-hidden="true"
                            />
                            <span className="text-text-secondary truncate" title={row.sourceName}>
                              {row.sourceName}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 max-w-[240px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: RISK_LEVELS.find(r => r.key === row.targetRisk)?.color ?? '#64748b' }}
                              aria-hidden="true"
                            />
                            <span className="text-text-secondary truncate" title={row.targetName}>
                              {row.targetName}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-secondary whitespace-nowrap">
                          {formatCompactMXN(row.value)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-secondary">
                          {row.contractCount.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold whitespace-nowrap" style={{ color: riskColor }}>
                          {(row.avgRisk * 100).toFixed(0)}%
                        </td>
                        <td className="px-3 py-2.5">
                          <ArrowRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-text-muted px-4 py-2 border-t border-border/20">
                {tableRows.length} flows shown · click any row to open contracts
              </p>
            </div>
          )}
        </div>
      )}

      {/* Interaction hints */}
      {showDiagram && viewMode === 'diagram' && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted/70 px-1">
          <span>Click a node to see details</span>
          <span>Click a flow to open filtered contracts</span>
          <span>Hover for value tooltips</span>
        </div>
      )}

      {/* Risk coloring explanation */}
      {showDiagram && viewMode === 'diagram' && (
        <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-4 py-3 flex gap-3">
          <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-text-muted space-y-1">
            <p className="font-medium text-amber-300">How to read flow colors</p>
            <p>
              Flow and node colors represent the <strong className="text-text-secondary">average v5.1 corruption risk score</strong> for all contracts in that channel:
              {' '}<span style={{ color: '#f87171' }}>red = critical (≥50%)</span>,
              {' '}<span style={{ color: '#fb923c' }}>orange = high (≥30%)</span>,
              {' '}<span style={{ color: '#fbbf24' }}>amber = medium (≥10%)</span>,
              {' '}<span style={{ color: '#4ade80' }}>green = low (&lt;10%)</span>.
              Thicker flows carry more contract value. Hover any flow for details. Click a flow to view its contracts.
            </p>
          </div>
        </div>
      )}

      {/* Top 5 suspicious flows summary panel */}
      {showDiagram && viewMode === 'diagram' && topSuspiciousFlows.length > 0 && (
        <div className="rounded-lg border border-border/30 bg-background-elevated p-4">
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
            Top Suspicious Money Flows
            <span className="text-xs font-normal text-text-muted ml-1">— highest avg risk score, click to investigate</span>
          </h2>
          <div className="space-y-2">
            {topSuspiciousFlows.map((flow, i) => {
              const riskColor = flow.avgRisk >= 0.5 ? '#f87171' : flow.avgRisk >= 0.3 ? '#fb923c' : '#fbbf24'
              return (
                <button
                  key={i}
                  onClick={() => handleFlowClick(flow.source, flow.target)}
                  className="w-full flex items-center gap-3 rounded px-3 py-2 text-left hover:bg-white/5 transition-colors group"
                  aria-label={`Investigate flow from ${flow.sourceName} to ${flow.targetName}`}
                >
                  <span className="text-xs font-mono font-bold text-text-muted w-4 flex-shrink-0">
                    {i + 1}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: riskColor }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="text-xs text-text-secondary truncate block">
                      {flow.sourceName.length > 30 ? flow.sourceName.slice(0, 30) + '…' : flow.sourceName}
                      {' → '}
                      {flow.targetName.length > 30 ? flow.targetName.slice(0, 30) + '…' : flow.targetName}
                    </span>
                  </span>
                  <span className="text-xs font-mono font-semibold flex-shrink-0" style={{ color: riskColor }}>
                    {(flow.avgRisk * 100).toFixed(0)}% risk
                  </span>
                  <span className="text-xs text-text-muted flex-shrink-0">
                    {formatCompactMXN(flow.value)}
                  </span>
                  <ArrowRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        <span className="font-medium">{t('legend.nodeColor')}</span>
        {RISK_LEVELS.map(r => (
          <span key={r.key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: r.color }} />
            {tc(r.key)}
          </span>
        ))}
        <span className="ml-auto opacity-60">{t('legend.leftRight')}</span>
      </div>
    </div>
  )
}
